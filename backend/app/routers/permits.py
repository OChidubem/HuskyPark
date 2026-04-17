"""User permit management (CRUD)."""

import secrets
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status

import asyncpg

from app.auth.deps import require_auth
from app.database.postgres import get_db
from app.models.schemas import PermitCreate, PermitOut, PermitUpdate

router = APIRouter(prefix="/permits", tags=["permits"])


@router.get("", response_model=list[PermitOut])
async def get_my_permits(
    user: dict = Depends(require_auth),
    conn: asyncpg.Connection = Depends(get_db),
):
    rows = await conn.fetch(
        """
        SELECT up.user_permit_id, pc.code AS permit_code, pc.name AS permit_name,
               up.permit_number, up.valid_from, up.valid_to, up.status
        FROM user_permit up
        JOIN permit_category pc ON pc.permit_category_id = up.permit_category_id
        WHERE up.user_id = $1
        ORDER BY up.valid_to DESC
        """,
        int(user["user_id"]),
    )
    return [dict(r) for r in rows]


@router.post("", response_model=PermitOut, status_code=status.HTTP_201_CREATED)
async def create_permit(
    body: PermitCreate,
    user: dict = Depends(require_auth),
    conn: asyncpg.Connection = Depends(get_db),
):
    if body.valid_to < body.valid_from:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "valid_to must be on or after valid_from",
        )

    category = await conn.fetchrow(
        "SELECT permit_category_id, code, name FROM permit_category WHERE permit_category_id = $1",
        body.permit_category_id,
    )
    if not category:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Permit category not found")

    permit_number = f"HP-{secrets.token_hex(6).upper()}"

    row = await conn.fetchrow(
        """
        INSERT INTO user_permit
            (user_id, permit_category_id, permit_number, valid_from, valid_to, status)
        VALUES ($1, $2, $3, $4, $5, 'active')
        RETURNING user_permit_id, permit_number, valid_from, valid_to, status
        """,
        int(user["user_id"]),
        body.permit_category_id,
        permit_number,
        body.valid_from,
        body.valid_to,
    )

    return PermitOut(
        user_permit_id=row["user_permit_id"],
        permit_code=category["code"],
        permit_name=category["name"],
        permit_number=row["permit_number"],
        valid_from=row["valid_from"],
        valid_to=row["valid_to"],
        status=row["status"],
    )


@router.patch("/{permit_id}", response_model=PermitOut)
async def update_permit(
    permit_id: int,
    body: PermitUpdate,
    user: dict = Depends(require_auth),
    conn: asyncpg.Connection = Depends(get_db),
):
    existing = await conn.fetchrow(
        """
        SELECT up.user_permit_id, up.valid_from, up.valid_to, up.status,
               up.permit_number, pc.code, pc.name
        FROM user_permit up
        JOIN permit_category pc ON pc.permit_category_id = up.permit_category_id
        WHERE up.user_permit_id = $1 AND up.user_id = $2
        """,
        permit_id,
        int(user["user_id"]),
    )
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Permit not found")

    new_to = body.valid_to or existing["valid_to"]
    if new_to < date.today():
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Cannot set valid_to in the past",
        )

    await conn.execute(
        """
        UPDATE user_permit
        SET valid_to = $1
        WHERE user_permit_id = $2
        """,
        new_to,
        permit_id,
    )

    return PermitOut(
        user_permit_id=existing["user_permit_id"],
        permit_code=existing["code"],
        permit_name=existing["name"],
        permit_number=existing["permit_number"],
        valid_from=existing["valid_from"],
        valid_to=new_to,
        status=existing["status"],
    )
