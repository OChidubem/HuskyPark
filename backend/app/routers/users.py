"""User management endpoints (Admin)."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

import asyncpg

from app.auth.deps import require_admin
from app.database.postgres import get_db
from app.models.schemas import UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
async def list_users(
    q: str | None = Query(default=None, description="Search by name or email"),
    role: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, le=100),
    _admin: dict = Depends(require_admin),
    conn: asyncpg.Connection = Depends(get_db),
):
    conditions = ["1=1"]
    params: list = []

    if q:
        params.append(f"%{q}%")
        conditions.append(
            f"(full_name ILIKE ${len(params)} OR email ILIKE ${len(params)})"
        )

    if role:
        params.append(role)
        conditions.append(f"role = ${len(params)}")

    offset = (page - 1) * per_page
    params.extend([per_page, offset])

    rows = await conn.fetch(
        f"""
        SELECT user_id, full_name, email, role, created_at
        FROM app_user
        WHERE {' AND '.join(conditions)}
        ORDER BY created_at DESC
        LIMIT ${len(params)-1} OFFSET ${len(params)}
        """,
        *params,
    )
    return [dict(r) for r in rows]


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    body: UserUpdate,
    _admin: dict = Depends(require_admin),
    conn: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nothing to update")

    set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates))
    row = await conn.fetchrow(
        f"UPDATE app_user SET {set_clause} WHERE user_id = $1 "
        "RETURNING user_id, full_name, email, role, created_at",
        user_id,
        *updates.values(),
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return dict(row)
