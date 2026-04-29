"""Dashboard endpoint — merges PostgreSQL predictions with MongoDB analytics."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query

import asyncpg

from app.auth.deps import require_auth
from app.database.mongo import get_mongo_db
from app.database.postgres import get_db
from app.models.schemas import DashboardLotItem
from app.services.cache import DASHBOARD_TTL, cache_delete, cache_get, cache_set
from app.services.prediction import score_to_color
from app.services.recompute import run_recompute

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

CACHE_KEY = "dashboard:latest"


@router.get("", response_model=list[DashboardLotItem])
async def get_dashboard(
    permit_type: str | None = Query(default=None),
    _user: dict = Depends(require_auth),
    conn: asyncpg.Connection = Depends(get_db),
):
    cached = await cache_get(CACHE_KEY)
    if cached:
        items = cached
        if permit_type:
            items = [i for i in items if i["lot_type"] == permit_type.lower()]
        return items

    # ── PostgreSQL: latest prediction per lot ──────────────────
    pg_rows = await conn.fetch(
        """
        SELECT DISTINCT ON (pp.lot_id)
            pp.pred_id,
            pp.lot_id,
            pl.lot_code,
            pl.lot_name,
            pl.lot_type,
            pl.latitude,
            pl.longitude,
            pp.prob_score,
            pp.confidence_level,
            pp.target_time,
            pp.predicted_at,
            pp.factors_summary,
            pp.model_version
        FROM parking_prediction pp
        JOIN parking_lot pl ON pl.lot_id = pp.lot_id
        WHERE pl.is_active = TRUE
        ORDER BY pp.lot_id, pp.target_time DESC
        """
    )

    # ── MongoDB: hourly analytics for this hour ────────────────
    now = datetime.now(timezone.utc)
    mongo_db = get_mongo_db()
    hour_key = now.strftime("%Y-%m-%d")
    cursor = mongo_db.lot_hourly_analytics.find(
        {"date": hour_key, "hour": now.hour},
        {"_id": 0},
    )
    analytics_by_lot: dict[int, dict] = {}
    async for doc in cursor:
        analytics_by_lot[doc["lot_id"]] = doc

    # ── Merge ──────────────────────────────────────────────────
    result = []
    for row in pg_rows:
        r = dict(row)
        if r.get("factors_summary") and isinstance(r["factors_summary"], str):
            r["factors_summary"] = json.loads(r["factors_summary"])
        item = DashboardLotItem(
            lot_id=r["lot_id"],
            lot_code=r["lot_code"],
            lot_name=r["lot_name"],
            lot_type=r["lot_type"],
            latitude=float(r["latitude"]) if r["latitude"] is not None else None,
            longitude=float(r["longitude"]) if r["longitude"] is not None else None,
            prob_score=float(r["prob_score"]),
            confidence_level=r["confidence_level"],
            color=score_to_color(float(r["prob_score"])),
            target_time=r["target_time"],
            trend=analytics_by_lot.get(r["lot_id"]),
        )
        result.append(item.model_dump())

    await cache_set(CACHE_KEY, result, ttl=DASHBOARD_TTL)

    if permit_type:
        result = [i for i in result if i["lot_type"] == permit_type.lower()]

    return result


@router.post("/recompute")
async def trigger_recompute(
    _user: dict = Depends(require_auth),
    conn: asyncpg.Connection = Depends(get_db),
):
    """Force a fresh prediction cycle for all lots, then bust the dashboard cache."""
    summary = await run_recompute(conn)
    await cache_delete(CACHE_KEY)
    return {"status": "ok", **summary}
