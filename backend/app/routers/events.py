"""Campus event management (Admin CRUD)."""

from fastapi import APIRouter, Depends, HTTPException, status

import asyncpg

from app.auth.deps import require_admin, require_auth
from app.database.postgres import get_db
from app.models.schemas import EventCreate, EventOut, EventUpdate

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventOut])
async def list_events(
    _user: dict = Depends(require_auth),
    conn: asyncpg.Connection = Depends(get_db),
):
    rows = await conn.fetch(
        "SELECT event_id, title, location, event_start, event_end, expected_attendance "
        "FROM campus_event ORDER BY event_start"
    )
    return [dict(r) for r in rows]


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
async def create_event(
    body: EventCreate,
    admin: dict = Depends(require_admin),
    conn: asyncpg.Connection = Depends(get_db),
):
    if body.event_end <= body.event_start:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "event_end must be after event_start",
        )

    async with conn.transaction():
        row = await conn.fetchrow(
            """
            INSERT INTO campus_event (title, location, event_start, event_end, expected_attendance)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING event_id, title, location, event_start, event_end, expected_attendance
            """,
            body.title,
            body.location,
            body.event_start,
            body.event_end,
            body.expected_attendance,
        )

        for lot in body.affected_lots:
            await conn.execute(
                """
                INSERT INTO event_lot_impact (event_id, lot_id, impact_level)
                VALUES ($1, $2, $3)
                ON CONFLICT (event_id, lot_id) DO UPDATE SET impact_level = EXCLUDED.impact_level
                """,
                row["event_id"],
                lot["lot_id"],
                lot.get("impact_level", "medium"),
            )

    return dict(row)


@router.put("/{event_id}", response_model=EventOut)
async def update_event(
    event_id: int,
    body: EventUpdate,
    admin: dict = Depends(require_admin),
    conn: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nothing to update")

    set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates))
    row = await conn.fetchrow(
        f"UPDATE campus_event SET {set_clause} WHERE event_id = $1 "
        "RETURNING event_id, title, location, event_start, event_end, expected_attendance",
        event_id,
        *updates.values(),
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    return dict(row)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    admin: dict = Depends(require_admin),
    conn: asyncpg.Connection = Depends(get_db),
):
    result = await conn.execute(
        "DELETE FROM campus_event WHERE event_id = $1", event_id
    )
    if result == "DELETE 0":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
