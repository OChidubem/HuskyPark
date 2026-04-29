"""Pydantic request/response schemas for HuskyPark."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AppBaseModel(BaseModel):
    model_config = ConfigDict(protected_namespaces=())


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(AppBaseModel):
    email: EmailStr
    password: str


class TokenResponse(AppBaseModel):
    message: str = "Login successful"
    user_id: int
    role: str


# ── Users ─────────────────────────────────────────────────────────────────────

class UserCreate(AppBaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8)
    role: Literal["student", "resident", "employee", "visitor", "admin"] = "student"


class UserOut(AppBaseModel):
    user_id: int
    full_name: str
    email: str
    role: str
    created_at: datetime


class UserUpdate(AppBaseModel):
    full_name: str | None = None
    role: Literal["student", "resident", "employee", "visitor", "admin"] | None = None
    is_active: bool | None = None


# ── Parking Lots ──────────────────────────────────────────────────────────────

class LotOut(AppBaseModel):
    lot_id: int
    lot_code: str
    lot_name: str
    lot_type: str
    zone: str | None
    capacity: int
    is_active: bool


class PredictionOut(AppBaseModel):
    pred_id: int
    lot_id: int
    lot_name: str
    prob_score: float
    confidence_level: str
    target_time: datetime
    predicted_at: datetime
    factors_summary: dict | None = None
    model_version: str | None = None


class DashboardLotItem(AppBaseModel):
    lot_id: int
    lot_code: str
    lot_name: str
    lot_type: str
    latitude: float | None = None
    longitude: float | None = None
    prob_score: float
    confidence_level: str
    color: Literal["green", "yellow", "red"]
    target_time: datetime
    trend: dict | None = None  # from MongoDB lot_hourly_analytics


# ── Reports ───────────────────────────────────────────────────────────────────

class ReportCreate(AppBaseModel):
    lot_id: int
    status: Literal["found_spot", "lot_full", "hard_to_find"]
    approx_available: int | None = Field(default=None, ge=0)
    note: str | None = Field(default=None, max_length=300)


class ReportOut(AppBaseModel):
    report_id: int
    lot_id: int
    lot_name: str
    status: str
    approx_available: int | None
    reported_at: datetime
    source_type: str


# ── Permits ───────────────────────────────────────────────────────────────────

class PermitCreate(AppBaseModel):
    permit_category_id: int
    valid_from: date
    valid_to: date


class PermitUpdate(AppBaseModel):
    valid_to: date | None = None


class PermitOut(AppBaseModel):
    user_permit_id: int
    permit_code: str
    permit_name: str
    permit_number: str
    valid_from: date
    valid_to: date
    status: str


class PermitCategoryOut(AppBaseModel):
    permit_category_id: int
    code: str
    name: str
    description: str | None = None


class LotCreate(AppBaseModel):
    lot_code: str = Field(min_length=1, max_length=20)
    lot_name: str = Field(min_length=2, max_length=100)
    lot_type: Literal["resident", "commuter", "employee", "visitor", "mixed", "ramp"]
    zone: str | None = Field(default=None, max_length=50)
    capacity: int = Field(gt=0)


class LotUpdate(AppBaseModel):
    lot_name: str | None = Field(default=None, min_length=2, max_length=100)
    zone: str | None = Field(default=None, max_length=50)
    capacity: int | None = Field(default=None, gt=0)
    is_active: bool | None = None


# ── Campus Events ─────────────────────────────────────────────────────────────

class EventCreate(AppBaseModel):
    title: str = Field(min_length=3, max_length=160)
    location: str = Field(min_length=2, max_length=120)
    event_start: datetime
    event_end: datetime
    expected_attendance: int | None = Field(default=None, ge=0)
    affected_lots: list[dict] = Field(
        default=[],
        description='[{"lot_id": 1, "impact_level": "high"}]',
    )


class EventUpdate(AppBaseModel):
    title: str | None = None
    location: str | None = None
    event_start: datetime | None = None
    event_end: datetime | None = None
    expected_attendance: int | None = None


class EventOut(AppBaseModel):
    event_id: int
    title: str
    location: str
    event_start: datetime
    event_end: datetime
    expected_attendance: int | None


# ── AI Recommendation ─────────────────────────────────────────────────────────

class RecommendRequest(AppBaseModel):
    query: str = Field(min_length=5, max_length=500)
    target_time: datetime | None = None
    permit_type: str | None = None


class LotRecommendation(AppBaseModel):
    rank: int
    lot_id: int
    lot_name: str
    prob_score: float
    rationale: str


class RecommendResponse(AppBaseModel):
    recommendations: list[LotRecommendation]
    ai_response_text: str
    context: dict


# ── Pagination ────────────────────────────────────────────────────────────────

class PaginatedResponse(AppBaseModel):
    items: list
    total_count: int
    page: int
    per_page: int
