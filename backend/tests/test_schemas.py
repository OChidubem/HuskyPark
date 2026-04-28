"""Unit tests for Pydantic schema validation."""

import pytest
from pydantic import ValidationError
from app.models.schemas import ReportCreate, PermitCreate
from datetime import date


def test_report_create_valid():
    r = ReportCreate(lot_id=1, status="found_spot", approx_available=5)
    assert r.lot_id == 1
    assert r.status == "found_spot"


def test_report_create_invalid_status():
    with pytest.raises(ValidationError):
        ReportCreate(lot_id=1, status="not_a_real_status")


def test_report_create_negative_available():
    with pytest.raises(ValidationError):
        ReportCreate(lot_id=1, status="found_spot", approx_available=-1)


def test_permit_create_valid():
    p = PermitCreate(
        permit_category_id=1,
        valid_from=date(2026, 1, 1),
        valid_to=date(2026, 12, 31),
    )
    assert p.permit_category_id == 1


def test_permit_create_invalid_date_order_is_allowed_in_schema():
    """Date ordering is enforced in the router, not by the Pydantic schema."""
    p = PermitCreate(
        permit_category_id=1,
        valid_from=date(2026, 12, 31),
        valid_to=date(2026, 1, 1),
    )
    assert p.valid_from > p.valid_to


def test_report_create_lot_full_valid():
    r = ReportCreate(lot_id=1, status="lot_full", approx_available=0)
    assert r.status == "lot_full"


def test_permit_create_missing_category_invalid():
    with pytest.raises(ValidationError):
        PermitCreate(
            permit_category_id=None,  # type: ignore[arg-type]
            valid_from=date(2026, 1, 1),
            valid_to=date(2026, 12, 31),
        )
