"""AI parking recommendation endpoint using OpenAI."""

from datetime import datetime, timezone
import logging
import math
import re

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

DESTINATION_HINTS: dict[str, tuple[float, float]] = {
    "atwood": (45.5589, -94.1539),
    "atwood memorial center": (45.5589, -94.1539),
    "isel": (45.5635, -94.1455),
    "iself": (45.5635, -94.1455),
    "eastman": (45.5625, -94.1470),
    "miller": (45.5640, -94.1450),
    "hockey center": (45.5617, -94.1452),
    "herb brooks": (45.5617, -94.1452),
    "brown hall": (45.5597, -94.1517),
    "library": (45.5578, -94.1514),
    "stateview": (45.5578, -94.1558),
    "riverview": (45.5607, -94.1483),
}


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _haversine_miles(
    lat1: float | None,
    lon1: float | None,
    lat2: float | None,
    lon2: float | None,
) -> float:
    if None in (lat1, lon1, lat2, lon2):
        return 0.75

    to_radians = math.radians
    earth_radius_miles = 3958.8
    d_lat = to_radians((lat2 or 0) - (lat1 or 0))
    d_lon = to_radians((lon2 or 0) - (lon1 or 0))
    lat1_r = to_radians(lat1 or 0)
    lat2_r = to_radians(lat2 or 0)
    arc = (
        math.sin(d_lat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(d_lon / 2) ** 2
    )
    return 2 * earth_radius_miles * math.asin(math.sqrt(arc))


def _infer_destination(query: str) -> tuple[str | None, tuple[float, float] | None]:
    normalized = _normalize(query)
    for name, coords in DESTINATION_HINTS.items():
        if name in normalized:
            return name, coords
    return None, None


def _infer_permit_type(query: str, fallback_role: str, requested: str | None) -> str | None:
    if requested:
        return requested.lower()

    normalized = _normalize(query)
    for permit in ("commuter", "resident", "employee", "visitor", "ramp"):
        if permit in normalized:
            return permit

    if fallback_role in {"resident", "employee", "visitor"}:
        return fallback_role
    return "commuter"


def _permit_fit_score(lot_type: str, permit_type: str | None) -> float:
    if not permit_type:
        return 0.7
    if lot_type == permit_type:
        return 1.0
    if permit_type == "visitor" and lot_type == "ramp":
        return 0.95
    if permit_type == "commuter" and lot_type == "ramp":
        return 0.84
    if lot_type == "mixed":
        return 0.82
    return 0.35


def _distance_score(distance_miles: float | None) -> float:
    if distance_miles is None:
        return 0.55
    if distance_miles <= 0.15:
        return 1.0
    if distance_miles <= 0.3:
        return 0.88
    if distance_miles <= 0.5:
        return 0.74
    if distance_miles <= 0.8:
        return 0.58
    return 0.42


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
            pp.lot_id,
            pl.lot_code,
            pl.lot_name,
            pl.lot_type,
            pl.zone,
            pl.latitude,
            pl.longitude,
            pp.prob_score
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
    destination_name, destination_coords = _infer_destination(body.query)
    permit_type = _infer_permit_type(body.query, str(user.get("role", "student")), body.permit_type)

    ranked_candidates = []
    for row in rows:
        distance_miles = (
            _haversine_miles(
                float(row["latitude"]) if row["latitude"] is not None else None,
                float(row["longitude"]) if row["longitude"] is not None else None,
                destination_coords[0] if destination_coords else None,
                destination_coords[1] if destination_coords else None,
            )
            if destination_coords
            else None
        )
        availability_score = float(row["prob_score"])
        permit_score = _permit_fit_score(str(row["lot_type"]), permit_type)
        proximity_score = _distance_score(distance_miles)
        total_score = (availability_score * 0.58) + (permit_score * 0.22) + (proximity_score * 0.20)
        ranked_candidates.append(
            {
                **dict(row),
                "distance_miles": distance_miles,
                "permit_score": permit_score,
                "total_score": round(total_score, 4),
            }
        )

    ranked_candidates.sort(key=lambda candidate: candidate["total_score"], reverse=True)

    # ── Build LLM prompt ──────────────────────────────────────
    lot_lines = "\n".join(
        (
            f"- {r['lot_name']} ({r['lot_type']}, zone {r['zone'] or 'unknown'}): "
            f"{float(r['prob_score']):.0%} availability"
            + (
                f", {r['distance_miles']:.2f} miles from {destination_name}"
                if r["distance_miles"] is not None and destination_name
                else ""
            )
        )
        for r in ranked_candidates[:8]
    )
    prompt = (
        f"You are a helpful campus parking assistant for St. Cloud State University.\n"
        f"Current weather: {weather_str}\n"
        f"User query: {body.query}\n"
        f"Target time: {target.strftime('%A %I:%M %p')}\n\n"
        f"Inferred permit type: {permit_type or 'unknown'}\n"
        f"Inferred destination: {destination_name or 'not confidently identified'}\n\n"
        f"Candidate lots:\n{lot_lines}\n\n"
        f"Explain the top 3 ranked lots using availability, proximity, and permit fit. "
        f"Do not invent data that is not present."
    )

    top = ranked_candidates[:3]
    fallback_recommendations = [
        LotRecommendation(
            rank=i + 1,
            lot_id=r["lot_id"],
            lot_name=r["lot_name"],
            prob_score=float(r["prob_score"]),
            rationale=(
                f"{float(r['prob_score']):.0%} availability"
                + (
                    f", about {r['distance_miles']:.2f} miles from {destination_name}"
                    if r["distance_miles"] is not None and destination_name
                    else ""
                )
                + (
                    f", and a strong fit for {permit_type} parking."
                    if permit_type
                    else "."
                )
            ),
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
                    rationale=f"Ranked using live availability, permit fit, and destination proximity.",
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
        "destination_name": destination_name,
        "permit_type": permit_type,
    }

    return RecommendResponse(
        recommendations=recommendations,
        ai_response_text=ai_text,
        context=context,
    )
