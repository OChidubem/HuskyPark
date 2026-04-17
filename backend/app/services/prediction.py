"""
Parking probability scoring engine.

Algorithm (v1.2):
  base_score = historical found_spot ratio for this lot+hour
  score *= weather_factor   (snow/blizzard lower it; clear raises it)
  score *= event_factor     (active high-impact events lower it)
  score  = clamp(score, 0.0, 1.0)
"""

from datetime import datetime, timezone
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


async def compute_probability(
    conn: asyncpg.Connection,
    lot_id: int,
    target_time: datetime,
    weather_condition: str = "clear",
    active_events: list[dict] | None = None,
) -> dict[str, Any]:
    """Return a prediction dict ready to INSERT into parking_prediction."""

    # --- historical base score from recent reports ---
    rows = await conn.fetch(
        """
        SELECT lsr.status_type_id, rst.status_name
        FROM lot_status_report lsr
        JOIN report_status_type rst ON rst.status_type_id = lsr.status_type_id
        WHERE lsr.lot_id = $1
          AND lsr.report_time >= NOW() - INTERVAL '7 days'
          AND EXTRACT(HOUR FROM lsr.report_time) = $2
        """,
        lot_id,
        target_time.hour,
    )

    if not rows:
        base_score = 0.55  # unknown → neutral
    else:
        found = sum(1 for r in rows if r["status_name"] == "found_spot")
        base_score = found / len(rows)

    # --- apply weather factor ---
    w_factor = WEATHER_FACTORS.get(weather_condition.lower(), 1.0)
    score = base_score * w_factor

    # --- apply highest event impact factor ---
    if active_events:
        worst = min(
            EVENT_FACTORS.get(e.get("impact_level", "medium"), 0.85)
            for e in active_events
        )
        score *= worst

    score = round(max(0.0, min(1.0, score)), 4)

    confidence = (
        "high" if len(rows) >= 20 else "medium" if len(rows) >= 5 else "low"
    )

    factors = {
        "weather": weather_condition,
        "hour_of_day": target_time.hour,
        "day_of_week": target_time.strftime("%A"),
        "recent_report_count": len(rows),
        "active_events": [e.get("title", "") for e in (active_events or [])],
    }

    return {
        "lot_id": lot_id,
        "predicted_at": datetime.now(timezone.utc),
        "target_time": target_time,
        "prob_score": score,
        "confidence_level": confidence,
        "factors_summary": factors,
        "model_version": "v1.2",
    }


def score_to_color(prob_score: float) -> str:
    if prob_score >= 0.65:
        return "green"
    if prob_score >= 0.35:
        return "yellow"
    return "red"
