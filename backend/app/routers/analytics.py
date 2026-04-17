"""Analytics endpoints — sourced from MongoDB lot_hourly_analytics."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query

from app.auth.deps import require_auth
from app.database.mongo import get_mongo_db

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
async def get_analytics(
    lot_id: int | None = Query(default=None),
    days: int = Query(default=7, le=30),
    _user: dict = Depends(require_auth),
):
    mongo_db = get_mongo_db()
    query: dict = {}

    if lot_id is not None:
        query["lot_id"] = lot_id

    cursor = mongo_db.lot_hourly_analytics.find(
        query,
        {"_id": 0},
        sort=[("date", -1), ("hour", -1)],
        limit=days * 24,
    )

    results = []
    async for doc in cursor:
        results.append(doc)

    return results


@router.get("/summary")
async def get_analytics_summary(
    lot_id: int,
    _user: dict = Depends(require_auth),
):
    """Return 7-day and 30-day rolling averages for a single lot."""
    mongo_db = get_mongo_db()

    pipeline = [
        {"$match": {"lot_id": lot_id}},
        {
            "$group": {
                "_id": "$lot_id",
                "avg_7d": {"$avg": "$trend_summary.last_7_days_avg_pct"},
                "avg_30d": {"$avg": "$trend_summary.last_30_days_avg_pct"},
                "latest_prob": {"$last": "$model_output.prob_score"},
            }
        },
    ]

    result = None
    async for doc in mongo_db.lot_hourly_analytics.aggregate(pipeline):
        result = doc

    return result or {}
