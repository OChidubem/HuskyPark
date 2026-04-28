"""Parking lot endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status

import asyncpg

from app.auth.deps import require_admin, require_auth
from app.database.postgres import get_db
from app.models.schemas import LotCreate, LotOut, LotUpdate

router = APIRouter(prefix="/lots", tags=["lots"])


@router.get("", response_model=list[LotOut])
async def list_lots(
    _user: dict = Depends(require_auth),
    conn: asyncpg.Connection = Depends(get_db),
):
    rows = await conn.fetch(
        "SELECT lot_id, lot_code, lot_name, lot_type, zone, capacity, is_active "
        "FROM parking_lot WHERE is_active = TRUE ORDER BY lot_name"
    )
    return [dict(r) for r in rows]


@router.get("/{lot_id}", response_model=LotOut)
async def get_lot(
    lot_id: int,
    _user: dict = Depends(require_auth),
    conn: asyncpg.Connection = Depends(get_db),
):
    row = await conn.fetchrow(
        "SELECT lot_id, lot_code, lot_name, lot_type, zone, capacity, is_active "
        "FROM parking_lot WHERE lot_id = $1",
        lot_id,
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lot not found")
    return dict(row)


@router.get("/{lot_id}/predictions")
async def get_lot_predictions(
    lot_id: int,
    hours: int = 24,
    _user: dict = Depends(require_auth),
    conn: asyncpg.Connection = Depends(get_db),
):
    rows = await conn.fetch(
        """
        SELECT pred_id, lot_id, prob_score, confidence_level,
               target_time, predicted_at, factors_summary, model_version
        FROM parking_prediction
        WHERE lot_id = $1
          AND target_time >= NOW() - ($2 || ' hours')::INTERVAL
        ORDER BY target_time DESC
        """,
        lot_id,
        str(hours),
    )
    return [dict(r) for r in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_lot(
    body: LotCreate,
    _admin: dict = Depends(require_admin),
    conn: asyncpg.Connection = Depends(get_db),
):
    row = await conn.fetchrow(
        """
        INSERT INTO parking_lot (lot_code, lot_name, lot_type, zone, capacity)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING lot_id, lot_code, lot_name, lot_type, zone, capacity, is_active
        """,
        body.lot_code,
        body.lot_name,
        body.lot_type,
        body.zone,
        body.capacity,
    )
    return dict(row)


@router.patch("/{lot_id}")
async def update_lot(
    lot_id: int,
    body: LotUpdate,
    _admin: dict = Depends(require_admin),
    conn: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No valid fields to update")

    set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates))
    values = list(updates.values())
    row = await conn.fetchrow(
        f"UPDATE parking_lot SET {set_clause} WHERE lot_id = $1 "
        "RETURNING lot_id, lot_code, lot_name, lot_type, zone, capacity, is_active",
        lot_id,
        *values,
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lot not found")
    return dict(row)
