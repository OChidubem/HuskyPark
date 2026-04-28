"""Authentication endpoints — login and logout."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from passlib.context import CryptContext

import asyncpg

from app.auth.jwt import create_access_token
from app.config import settings
from app.database.postgres import get_db
from app.models.schemas import LoginRequest, TokenResponse, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate, conn: asyncpg.Connection = Depends(get_db)):
    existing = await conn.fetchrow(
        "SELECT user_id FROM app_user WHERE email = $1", body.email
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    hashed = _pwd.hash(body.password)
    row = await conn.fetchrow(
        """
        INSERT INTO app_user (full_name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING user_id, full_name, email, role, created_at
        """,
        body.full_name,
        body.email,
        hashed,
        body.role,
    )
    return dict(row)


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    conn: asyncpg.Connection = Depends(get_db),
):
    row = await conn.fetchrow(
        "SELECT user_id, password_hash, role FROM app_user WHERE email = $1",
        body.email,
    )
    if not row or not _pwd.verify(body.password, row["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    token = create_access_token(subject=str(row["user_id"]), role=row["role"])
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite=settings.auth_cookie_samesite,
        secure=settings.auth_cookie_secure,
        max_age=settings.access_token_expire_minutes * 60,
    )
    return TokenResponse(user_id=row["user_id"], role=row["role"])


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out"}
