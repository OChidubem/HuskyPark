"""FastAPI security dependencies."""

from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError

from app.auth.jwt import decode_token


def _get_current_user(access_token: str | None = Cookie(default=None)) -> dict:
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        payload = decode_token(access_token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return {"user_id": payload["sub"], "role": payload["role"]}


def require_auth(user: dict = Depends(_get_current_user)) -> dict:
    return user


def require_admin(user: dict = Depends(_get_current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
