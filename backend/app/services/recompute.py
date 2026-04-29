"""Shared prediction recompute logic — used by startup scheduler and the /recompute endpoint."""

import json
import logging
from datetime import datetime, timedelta

import asyncpg

from app.services.prediction import compute_probability

logger = logging.getLogger(__name__)


async def run_recompute(conn: asyncpg.Connection) -> dict:
    """
    Compute fresh predictions for all active lots × 4 time slots (now, +1h, +2h, +3h).
    Returns a summary dict with lot_count and prediction_count.
    """
    lot_rows = await conn.fetch(
        "SELECT lot_id FROM parking_lot WHERE is_active = TRUE"
    )
    weather_row = await conn.fetchrow(
        "SELECT condition FROM weather_snapshot ORDER BY recorded_at DESC LIMIT 1"
    )
    now = datetime.utcnow()
    active_event_rows = await conn.fetch(
        """
        SELECT title, expected_attendance
        FROM campus_event
        WHERE event_start <= $1 AND event_end >= $1
        """,
        now,
    )

    weather_condition = str(weather_row["condition"]) if weather_row else "clear"
    active_events = []
    for row in active_event_rows:
        attendance = int(row["expected_attendance"] or 0)
        impact = "high" if attendance >= 2000 else "medium" if attendance >= 700 else "low"
        active_events.append({"title": row["title"], "impact_level": impact})

    targets = [now + timedelta(hours=h) for h in (0, 1, 2, 3)]
    written = 0

    for lot in lot_rows:
        for target in targets:
            prediction = await compute_probability(
                conn,
                lot["lot_id"],
                target,
                weather_condition=weather_condition,
                active_events=active_events,
            )
            await conn.execute(
                """
                INSERT INTO parking_prediction
                    (lot_id, predicted_at, target_time, prob_score,
                     confidence_level, factors_summary, model_version)
                VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
                """,
                prediction["lot_id"],
                prediction["predicted_at"],
                prediction["target_time"],
                prediction["prob_score"],
                prediction["confidence_level"],
                json.dumps(prediction["factors_summary"]),
                prediction["model_version"],
            )
            written += 1

    logger.info(
        "Recompute complete — %d lots × %d slots = %d predictions (weather: %s)",
        len(lot_rows),
        len(targets),
        written,
        weather_condition,
    )
    return {"lot_count": len(lot_rows), "prediction_count": written, "weather": weather_condition}
