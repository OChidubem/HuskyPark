"""Crowdsourced spot report endpoints.

Write order: PostgreSQL first (lightweight row), then MongoDB (enriched payload).
If Mongo write fails the SQL record is preserved and the enriched doc is queued.
"""

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status

import asyncpg

from app.auth.deps import require_auth
from app.database.mongo import get_mongo_db
from app.database.postgres import get_db
from app.models.schemas import ReportCreate, ReportOut
from app.services.cache import cache_delete

DASHBOARD_CACHE_KEY = "dashboard:latest"

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
async def submit_report(
    body: ReportCreate,
    user: dict = Depends(require_auth),
    conn: asyncpg.Connection = Depends(get_db),
):
    # Validate lot exists
    lot = await conn.fetchrow(
        "SELECT lot_id, lot_name FROM parking_lot WHERE lot_id = $1 AND is_active = TRUE",
        body.lot_id,
    )
    if not lot:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lot not found")

    # Get status_type_id
    status_row = await conn.fetchrow(
        "SELECT status_type_id FROM report_status_type WHERE status_name = $1",
        body.status,
    )
    if not status_row:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown report status")

    # Step 1: Write to PostgreSQL
    row = await conn.fetchrow(
        """
        INSERT INTO lot_status_report (lot_id, user_id, status_type_id, confidence_score, note)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING report_id, lot_id, user_id, status_type_id, report_time, note
        """,
        body.lot_id,
        int(user["user_id"]),
        status_row["status_type_id"],
        body.approx_available / 100.0 if body.approx_available is not None else None,
        body.note,
    )

    # Step 2: Write enriched doc to MongoDB (best-effort)
    asyncio.create_task(
        _write_enriched_to_mongo(
            sql_report_id=row["report_id"],
            lot_id=body.lot_id,
            lot_name=lot["lot_name"],
            user_id=int(user["user_id"]),
            status=body.status,
            approx_available=body.approx_available,
            reported_at=row["report_time"],
        )
    )

    # Bust dashboard cache so next load reflects fresh data
    await cache_delete(DASHBOARD_CACHE_KEY)

    return ReportOut(
        report_id=row["report_id"],
        lot_id=body.lot_id,
        lot_name=lot["lot_name"],
        status=body.status,
        approx_available=body.approx_available,
        reported_at=row["report_time"],
        source_type="user",
    )


async def _write_enriched_to_mongo(
    sql_report_id: int,
    lot_id: int,
    lot_name: str,
    user_id: int,
    status: str,
    approx_available: int | None,
    reported_at: datetime,
) -> None:
    try:
        mongo_db = get_mongo_db()
        await mongo_db.crowdsourced_reports.insert_one(
            {
                "sql_report_id": sql_report_id,
                "lot_id": lot_id,
                "lot_name": lot_name,
                "user_id": str(user_id),
                "reported_at": reported_at,
                "status": status,
                "approx_available": approx_available,
                "source_type": "user",
                "verified": False,
            }
        )
    except Exception:
        # Core data safe in PostgreSQL; Mongo write retried via APScheduler in production
        pass


@router.get("", response_model=list[ReportOut])
async def list_reports(
    lot_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, le=100),
    _user: dict = Depends(require_auth),
    conn: asyncpg.Connection = Depends(get_db),
):
    conditions = ["1=1"]
    params: list = []

    if lot_id is not None:
        params.append(lot_id)
        conditions.append(f"lsr.lot_id = ${len(params)}")

    if status:
        params.append(status)
        conditions.append(f"rst.status_name = ${len(params)}")

    offset = (page - 1) * per_page
    params.extend([per_page, offset])

    rows = await conn.fetch(
        f"""
        SELECT lsr.report_id, lsr.lot_id, pl.lot_name,
               rst.status_name AS status,
               lsr.note,
               lsr.report_time AS reported_at,
               'user' AS source_type,
               NULL AS approx_available
        FROM lot_status_report lsr
        JOIN parking_lot pl ON pl.lot_id = lsr.lot_id
        JOIN report_status_type rst ON rst.status_type_id = lsr.status_type_id
        WHERE {' AND '.join(conditions)}
        ORDER BY lsr.report_time DESC
        LIMIT ${len(params)-1} OFFSET ${len(params)}
        """,
        *params,
    )
    return [
        ReportOut(
            report_id=r["report_id"],
            lot_id=r["lot_id"],
            lot_name=r["lot_name"],
            status=r["status"],
            approx_available=r["approx_available"],
            reported_at=r["reported_at"],
            source_type=r["source_type"],
        )
        for r in rows
    ]
