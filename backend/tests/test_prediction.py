"""Unit tests for the prediction scoring engine."""

import pytest
from app.services.prediction import compute_probability, score_to_color


def test_score_to_color_green():
    assert score_to_color(0.80) == "green"
    assert score_to_color(0.65) == "green"


def test_score_to_color_yellow():
    assert score_to_color(0.64) == "yellow"
    assert score_to_color(0.35) == "yellow"


def test_score_to_color_red():
    assert score_to_color(0.34) == "red"
    assert score_to_color(0.00) == "red"


def test_weather_factors_snow_lowers_score():
    """Snow factor (0.82) should produce a lower score than clear (1.05) for the same base."""
    from app.services.prediction import WEATHER_FACTORS
    assert WEATHER_FACTORS["snow"] < WEATHER_FACTORS["clear"]


def test_weather_factors_blizzard_lowest():
    from app.services.prediction import WEATHER_FACTORS
    assert WEATHER_FACTORS["blizzard"] == min(WEATHER_FACTORS.values())


def test_event_factors_high_worst():
    from app.services.prediction import EVENT_FACTORS
    assert EVENT_FACTORS["high"] < EVENT_FACTORS["medium"] < EVENT_FACTORS["low"]
