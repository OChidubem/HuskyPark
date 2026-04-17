"""Pydantic request/response schemas for HuskyPark."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    message: str = "Login successful"
    user_id: int
    role: str


# ── Users ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8)
    role: Literal["student", "resident", "employee", "visitor", "admin"] = "student"


class UserOut(BaseModel):
    user_id: int
    full_name: str
    email: str
    role: str
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: Literal["student", "resident", "employee", "visitor", "admin"] | None = None
    is_active: bool | None = None


# ── Parking Lots ──────────────────────────────────────────────────────────────

class LotOut(BaseModel):
    lot_id: int
    lot_code: str
    lot_name: str
    lot_type: str
    zone: str | None
    capacity: int
    is_active: bool


class PredictionOut(BaseModel):
    pred_id: int
    lot_id: int
    lot_name: str
    prob_score: float
    confidence_level: str
    target_time: datetime
    predicted_at: datetime
    factors_summary: dict | None = None
    model_version: str | None = None


class DashboardLotItem(BaseModel):
    lot_id: int
    lot_code: str
    lot_name: str
    lot_type: str
    prob_score: float
    confidence_level: str
    color: Literal["green", "yellow", "red"]
    target_time: datetime
    trend: dict | None = None  # from MongoDB lot_hourly_analytics


# ── Reports ───────────────────────────────────────────────────────────────────

class ReportCreate(BaseModel):
    lot_id: int
    status: Literal["found_spot", "lot_full", "hard_to_find"]
    approx_available: int | None = Field(default=None, ge=0)
    note: str | None = Field(default=None, max_length=300)


class ReportOut(BaseModel):
    report_id: int
    lot_id: int
    lot_name: str
    status: str
    approx_available: int | None
    reported_at: datetime
    source_type: str


# ── Permits ───────────────────────────────────────────────────────────────────

class PermitCreate(BaseModel):
    permit_category_id: int
    vehicle_plate: str = Field(min_length=2, max_length=15)
    valid_from: date
    valid_to: date


class PermitUpdate(BaseModel):
    vehicle_plate: str | None = Field(default=None, min_length=2, max_length=15)
    valid_to: date | None = None


class PermitOut(BaseModel):
    user_permit_id: int
    permit_code: str
    permit_name: str
    permit_number: str
    valid_from: date
    valid_to: date
    status: str


# ── Campus Events ─────────────────────────────────────────────────────────────

class EventCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    location: str = Field(min_length=2, max_length=120)
    event_start: datetime
    event_end: datetime
    expected_attendance: int | None = Field(default=None, ge=0)
    affected_lots: list[dict] = Field(
        default=[],
        description='[{"lot_id": 1, "impact_level": "high"}]',
    )


class EventUpdate(BaseModel):
    title: str | None = None
    location: str | None = None
    event_start: datetime | None = None
    event_end: datetime | None = None
    expected_attendance: int | None = None


class EventOut(BaseModel):
    event_id: int
    title: str
    location: str
    event_start: datetime
    event_end: datetime
    expected_attendance: int | None


# ── AI Recommendation ─────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    query: str = Field(min_length=5, max_length=500)
    target_time: datetime | None = None
    permit_type: str | None = None


class LotRecommendation(BaseModel):
    rank: int
    lot_id: int
    lot_name: str
    prob_score: float
    rationale: str


class RecommendResponse(BaseModel):
    recommendations: list[LotRecommendation]
    ai_response_text: str
    context: dict


# ── Pagination ────────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: list
    total_count: int
    page: int
    per_page: int
