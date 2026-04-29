"""
Parking probability scoring engine.

Algorithm (v1.3):
  - blends same-hour history with recent report-derived availability
  - uses lot capacity and permit type as baseline context
  - applies hour-of-day pressure by lot type
  - applies weather and active-event pressure
"""

from datetime import datetime
from typing import Any

import asyncpg

WEATHER_FACTORS: dict[str, float] = {
    "clear": 1.05,
    "cloudy": 1.00,
    "rain": 0.92,
    "snow": 0.82,
    "blizzard": 0.65,
    "fog": 0.90,
}

EVENT_FACTORS: dict[str, float] = {
    "low": 0.95,
    "medium": 0.85,
    "high": 0.70,
}

_HAS_APPROX_AVAILABLE: bool | None = None

STATUS_SCORE: dict[str, float] = {
    "found_spot": 0.82,
    "hard_to_find": 0.42,
    "lot_full": 0.08,
}

LOT_TYPE_BASELINE: dict[str, float] = {
    "commuter": 0.56,
    "resident": 0.62,
    "employee": 0.64,
    "visitor": 0.68,
    "ramp": 0.74,
}


def _capacity_factor(capacity: int | None) -> float:
    if not capacity or capacity <= 0:
        return 1.0
    normalized = min(capacity, 420) / 420
    return 0.92 + (normalized * 0.16)


def _hour_pressure_factor(lot_type: str, hour: int) -> float:
    lot_type = lot_type.lower()

    if lot_type == "commuter":
        if 8 <= hour <= 11:
            return 0.78
        if 12 <= hour <= 15:
            return 0.9
        return 1.04

    if lot_type == "resident":
        if 0 <= hour <= 7:
            return 0.82
        if 8 <= hour <= 15:
            return 1.06
        return 0.9

    if lot_type == "employee":
        if 8 <= hour <= 16:
            return 0.86
        return 1.02

    if lot_type in {"visitor", "ramp"}:
        if 9 <= hour <= 14:
            return 0.91
        return 1.05

    return 1.0


def _score_report(status_name: str, approx_available: int | None, capacity: int | None) -> float:
    if approx_available is not None and capacity and capacity > 0:
        observed_ratio = max(0.0, min(1.0, approx_available / capacity))
        status_floor = STATUS_SCORE.get(status_name, 0.5)
        return max(status_floor * 0.75, observed_ratio)
    return STATUS_SCORE.get(status_name, 0.5)


async def compute_probability(
    conn: asyncpg.Connection,
    lot_id: int,
    target_time: datetime,
    weather_condition: str = "clear",
    active_events: list[dict] | None = None,
) -> dict[str, Any]:
    """Return a prediction dict ready to INSERT into parking_prediction."""
    global _HAS_APPROX_AVAILABLE

    lot_row = await conn.fetchrow(
        """
        SELECT lot_type, capacity
        FROM parking_lot
        WHERE lot_id = $1
        """,
        lot_id,
    )
    lot_type = str(lot_row["lot_type"]) if lot_row else "commuter"
    capacity = int(lot_row["capacity"]) if lot_row and lot_row["capacity"] is not None else None

    if _HAS_APPROX_AVAILABLE is None:
        _HAS_APPROX_AVAILABLE = bool(
            await conn.fetchval(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'lot_status_report'
                      AND column_name = 'approx_available'
                )
                """
            )
        )

    approx_select = "lsr.approx_available" if _HAS_APPROX_AVAILABLE else "NULL::INTEGER AS approx_available"

    # --- same-hour recent history ---
    same_hour_rows = await conn.fetch(
        """
        SELECT rst.status_name, """ + approx_select + """
        FROM lot_status_report lsr
        JOIN report_status_type rst ON rst.status_type_id = lsr.status_type_id
        WHERE lsr.lot_id = $1
          AND lsr.report_time >= NOW() - INTERVAL '7 days'
          AND EXTRACT(HOUR FROM lsr.report_time) = $2
        """,
        lot_id,
        target_time.hour,
    )

    # --- all recent reports for freshness ---
    recent_rows = await conn.fetch(
        """
        SELECT rst.status_name, """ + approx_select + """
        FROM lot_status_report lsr
        JOIN report_status_type rst ON rst.status_type_id = lsr.status_type_id
        WHERE lsr.lot_id = $1
          AND lsr.report_time >= NOW() - INTERVAL '24 hours'
        ORDER BY lsr.report_time DESC
        LIMIT 18
        """,
        lot_id,
    )

    baseline_score = LOT_TYPE_BASELINE.get(lot_type.lower(), 0.58)
    capacity_adjusted_baseline = baseline_score * _capacity_factor(capacity)

    if same_hour_rows:
        historical_score = sum(
            _score_report(r["status_name"], r["approx_available"], capacity)
            for r in same_hour_rows
        ) / len(same_hour_rows)
    else:
        historical_score = capacity_adjusted_baseline

    if recent_rows:
        fresh_score = sum(
            _score_report(r["status_name"], r["approx_available"], capacity)
            for r in recent_rows
        ) / len(recent_rows)
        score = (historical_score * 0.55) + (fresh_score * 0.35) + (capacity_adjusted_baseline * 0.10)
    else:
        score = (historical_score * 0.7) + (capacity_adjusted_baseline * 0.3)

    score *= _hour_pressure_factor(lot_type, target_time.hour)

    # --- apply weather factor ---
    w_factor = WEATHER_FACTORS.get(weather_condition.lower(), 1.0)
    score *= w_factor

    # --- apply highest event impact factor ---
    if active_events:
        worst = min(
            EVENT_FACTORS.get(e.get("impact_level", "medium"), 0.85)
            for e in active_events
        )
        score *= worst

    score = round(max(0.0, min(1.0, score)), 4)

    confidence = (
        "high"
        if len(same_hour_rows) >= 12 or len(recent_rows) >= 16
        else "medium"
        if len(same_hour_rows) >= 4 or len(recent_rows) >= 6
        else "low"
    )

    factors = {
        "weather": weather_condition,
        "hour_of_day": target_time.hour,
        "day_of_week": target_time.strftime("%A"),
        "recent_report_count": len(recent_rows),
        "same_hour_report_count": len(same_hour_rows),
        "lot_type": lot_type,
        "capacity": capacity,
        "active_events": [e.get("title", "") for e in (active_events or [])],
    }

    return {
        "lot_id": lot_id,
        "predicted_at": datetime.utcnow(),
        "target_time": target_time,
        "prob_score": score,
        "confidence_level": confidence,
        "factors_summary": factors,
        "model_version": "v1.3",
    }


def score_to_color(prob_score: float) -> str:
    if prob_score >= 0.65:
        return "green"
    if prob_score >= 0.35:
        return "yellow"
    return "red"
