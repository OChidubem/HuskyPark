"""AI parking recommendation endpoint using OpenAI."""

from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from openai import AsyncOpenAI

import asyncpg

from app.auth.deps import require_auth
from app.config import settings
from app.database.mongo import get_mongo_db
from app.database.postgres import get_db
from app.models.schemas import RecommendRequest, RecommendResponse, LotRecommendation

router = APIRouter(prefix="/recommend", tags=["recommend"])
logger = logging.getLogger(__name__)


@router.post("", response_model=RecommendResponse)
async def get_recommendation(
    body: RecommendRequest,
    user: dict = Depends(require_auth),
    conn: asyncpg.Connection = Depends(get_db),
):
    target = body.target_time or datetime.now(timezone.utc)

    # ── Fetch current predictions ──────────────────────────────
    rows = await conn.fetch(
        """
        SELECT DISTINCT ON (pp.lot_id)
            pp.lot_id, pl.lot_name, pl.lot_type, pp.prob_score
        FROM parking_prediction pp
        JOIN parking_lot pl ON pl.lot_id = pp.lot_id
        WHERE pl.is_active = TRUE
        ORDER BY pp.lot_id, pp.target_time DESC
        """
    )

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Parking availability is still warming up. Try again in a moment.",
        )

    # ── Fetch latest weather ───────────────────────────────────
    weather_row = await conn.fetchrow(
        "SELECT condition, temperature_f FROM weather_snapshot ORDER BY recorded_at DESC LIMIT 1"
    )
    weather_str = (
        f"{weather_row['condition']}, {weather_row['temperature_f']}°F"
        if weather_row
        else "unknown"
    )

    # ── Build LLM prompt ──────────────────────────────────────
    lot_lines = "\n".join(
        f"- {r['lot_name']} ({r['lot_type']}): {float(r['prob_score']):.0%} availability"
        for r in rows
    )
    prompt = (
        f"You are a helpful campus parking assistant for St. Cloud State University.\n"
        f"Current weather: {weather_str}\n"
        f"User query: {body.query}\n"
        f"Target time: {target.strftime('%A %I:%M %p')}\n\n"
        f"Current lot availability:\n{lot_lines}\n\n"
        f"Rank the top 3 most suitable lots with a one-sentence rationale for each. "
        f"Format your response as a numbered list."
    )

    top = sorted(rows, key=lambda r: float(r["prob_score"]), reverse=True)[:3]
    fallback_recommendations = [
        LotRecommendation(
            rank=i + 1,
            lot_id=r["lot_id"],
            lot_name=r["lot_name"],
            prob_score=float(r["prob_score"]),
            rationale=f"{float(r['prob_score']):.0%} availability — strongest current option near your target time.",
        )
        for i, r in enumerate(top)
    ]

    recommendations = fallback_recommendations
    ai_text = (
        "Showing the strongest lots by current availability. "
        "AI-specific reasoning is unavailable right now."
    )

    if settings.openai_api_key:
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        try:
            start = datetime.now(timezone.utc)
            completion = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=400,
            )
            latency_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
            ai_text = completion.choices[0].message.content or ai_text
            recommendations = [
                LotRecommendation(
                    rank=i + 1,
                    lot_id=r["lot_id"],
                    lot_name=r["lot_name"],
                    prob_score=float(r["prob_score"]),
                    rationale="See AI response for full rationale.",
                )
                for i, r in enumerate(top)
            ]

            try:
                mongo_db = get_mongo_db()
                await mongo_db.ai_recommendation_sessions.insert_one(
                    {
                        "user_id": str(user["user_id"]),
                        "created_at": datetime.now(timezone.utc),
                        "query": body.query,
                        "target_time": target,
                        "weather_condition": weather_str,
                        "recommendations": [r.model_dump() for r in recommendations],
                        "ai_response_text": ai_text,
                        "model_used": "gpt-4o-mini",
                        "latency_ms": latency_ms,
                    }
                )
            except Exception:
                logger.exception("Failed to persist AI recommendation session")
        except Exception:
            logger.exception("AI recommendation failed; returning availability fallback")
    else:
        ai_text = (
            "AI recommendations unavailable because no OpenAI API key is configured. "
            "Showing the strongest lots by live availability instead."
        )

    context = {
        "weather": weather_str,
        "target_time": target.isoformat(),
        "total_lots_evaluated": len(rows),
    }

    return RecommendResponse(
        recommendations=recommendations,
        ai_response_text=ai_text,
        context=context,
    )
