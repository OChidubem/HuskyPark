"""
Current weather endpoint.

Fetches live data directly from OpenWeatherMap on every request, Redis-cached
for 10 minutes so the API is not hammered. Falls back to the latest DB snapshot
if the OWM key is missing or the request fails.
"""

import json
import logging

import httpx
from fastapi import APIRouter, Depends

import asyncpg

from app.auth.deps import require_auth
from app.config import settings
from app.database.postgres import get_db
from app.services.cache import get_redis

router = APIRouter(prefix="/weather", tags=["weather"])
logger = logging.getLogger(__name__)

_CACHE_KEY = "weather:live"
_CACHE_TTL = 600  # 10 minutes


def _owm_to_condition(weather_id: int) -> str:
    if 200 <= weather_id < 300:
        return "thunderstorm"
    if 300 <= weather_id < 600:
        return "rain"
    if 600 <= weather_id < 700:
        return "snow"
    if 700 <= weather_id < 800:
        return "fog"
    if weather_id == 800:
        return "clear"
    if weather_id == 801:
        return "mostly clear"
    if weather_id in (802, 803):
        return "partly cloudy"
    return "cloudy"


@router.get("/current")
async def get_current_weather(
    _user: dict = Depends(require_auth),
    conn: asyncpg.Connection = Depends(get_db),
):
    # ── 1. Try Redis cache ──────────────────────────────────────
    try:
        r = await get_redis()
        cached = await r.get(_CACHE_KEY)
        if cached:
            return json.loads(cached)
    except Exception:
        pass  # Redis unavailable — fall through

    # ── 2. Fetch live from OpenWeatherMap ───────────────────────
    if settings.openweather_api_key:
        try:
            url = (
                "https://api.openweathermap.org/data/2.5/weather"
                f"?lat={settings.openweather_lat}"
                f"&lon={settings.openweather_lon}"
                f"&appid={settings.openweather_api_key}"
                f"&units=imperial"
            )
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()

            owm = resp.json()
            weather_id = int(owm["weather"][0]["id"])

            result = {
                "condition": _owm_to_condition(weather_id),
                "description": owm["weather"][0]["description"].title(),
                "temperature_f": round(float(owm["main"]["temp"]), 1),
                "feels_like_f": round(float(owm["main"]["feels_like"]), 1),
                "humidity_pct": int(owm["main"]["humidity"]),
                "wind_speed_mph": round(float(owm["wind"].get("speed", 0)), 1),
                "wind_gust_mph": round(float(owm["wind"].get("gust", 0)), 1) or None,
                "visibility_miles": round(float(owm.get("visibility", 10000)) / 1609.34, 1),
                "icon": owm["weather"][0]["icon"],
                "city": owm.get("name", "St. Cloud"),
                "source": "OpenWeatherMap",
                "live": True,
            }

            try:
                r = await get_redis()
                await r.setex(_CACHE_KEY, _CACHE_TTL, json.dumps(result))
            except Exception:
                pass

            # Also write to DB snapshot so the prediction model stays current
            try:
                precip = float(
                    owm.get("rain", {}).get("1h", 0.0)
                    or owm.get("snow", {}).get("1h", 0.0)
                )
                await conn.execute(
                    """
                    INSERT INTO weather_snapshot
                        (recorded_at, temperature_f, condition, precipitation_in,
                         wind_speed_mph, source)
                    VALUES (NOW(), $1, $2, $3, $4, 'OpenWeatherMap')
                    """,
                    result["temperature_f"],
                    result["condition"],
                    precip,
                    result["wind_speed_mph"],
                )
            except Exception:
                pass

            return result
        except Exception:
            logger.warning("Live OWM fetch failed, falling back to DB snapshot")

    # ── 3. Fall back to latest DB snapshot ──────────────────────
    row = await conn.fetchrow(
        """
        SELECT condition, temperature_f, precipitation_in, wind_speed_mph, recorded_at
        FROM weather_snapshot
        ORDER BY recorded_at DESC
        LIMIT 1
        """
    )
    if not row:
        return {
            "condition": "unknown",
            "description": "Weather unavailable",
            "temperature_f": None,
            "live": False,
            "source": "none",
        }
    r_dict = dict(row)
    r_dict["recorded_at"] = r_dict["recorded_at"].isoformat() if r_dict["recorded_at"] else None
    r_dict["description"] = r_dict["condition"].replace("_", " ").title()
    r_dict["live"] = False
    return r_dict
