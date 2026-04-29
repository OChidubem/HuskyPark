"""HuskyPark Predictor — FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.mongo import close_client
from app.database.postgres import close_pool, get_pool
from app.routers import analytics, auth, dashboard, events, lots, permits, recommend, reports, users, weather
from app.services.cache import cache_delete, close_redis
from app.services.recompute import run_recompute

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


def _owm_to_condition(weather_id: int, wind_mph: float) -> str:
    if 200 <= weather_id < 600:
        return "rain"
    if 600 <= weather_id < 700:
        return "blizzard" if (wind_mph >= 35 or weather_id >= 620) else "snow"
    if 700 <= weather_id < 800:
        return "fog"
    if weather_id == 800:
        return "clear"
    return "cloudy"


async def _refresh_weather() -> None:
    """Fetch current conditions from OpenWeatherMap and insert into weather_snapshot."""
    if not settings.openweather_api_key:
        return
    url = (
        "https://api.openweathermap.org/data/2.5/weather"
        f"?lat={settings.openweather_lat}&lon={settings.openweather_lon}"
        f"&appid={settings.openweather_api_key}&units=imperial"
    )
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
        data = resp.json()
        weather_id = int(data["weather"][0]["id"])
        wind_mph = float(data["wind"].get("speed", 0.0))
        condition = _owm_to_condition(weather_id, wind_mph)
        temp_f = float(data["main"]["temp"])
        precip = float(
            data.get("rain", {}).get("1h", 0.0) or data.get("snow", {}).get("1h", 0.0)
        )
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO weather_snapshot
                    (recorded_at, temperature_f, condition, precipitation_in, wind_speed_mph, source)
                VALUES (NOW(), $1, $2, $3, $4, 'OpenWeatherMap')
                """,
                temp_f,
                condition,
                precip,
                wind_mph,
            )
        logger.info("Weather refreshed: %s %.1f°F", condition, temp_f)
    except Exception:
        logger.exception("Weather refresh failed")


async def _refresh_events() -> None:
    """Scrape SCSU calendar and upsert new events."""
    try:
        from app.services.events_scraper import run_events_sync
        pool = await get_pool()
        async with pool.acquire() as conn:
            added = await run_events_sync(conn)
        if added:
            logger.info("Events sync: %d new events added", added)
    except Exception:
        logger.exception("Events sync failed")


async def _recompute_predictions() -> None:
    """Background recompute job — delegates to shared service, then busts cache."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        summary = await run_recompute(conn)
    await cache_delete("dashboard:latest")
    logger.info("Scheduled recompute: %s", summary)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    await _refresh_weather()
    await _refresh_events()
    await _recompute_predictions()
    scheduler.add_job(_refresh_weather, "interval", minutes=10, id="weather")
    scheduler.add_job(_refresh_events, "interval", hours=1, id="events")
    scheduler.add_job(_recompute_predictions, "interval", minutes=15, id="recompute")
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)
    await close_pool()
    await close_redis()
    close_client()


app = FastAPI(
    title="HuskyPark Predictor API",
    description="AI-driven parking availability dashboard for SCSU",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"

app.include_router(auth.router, prefix=PREFIX)
app.include_router(dashboard.router, prefix=PREFIX)
app.include_router(lots.router, prefix=PREFIX)
app.include_router(reports.router, prefix=PREFIX)
app.include_router(permits.router, prefix=PREFIX)
app.include_router(events.router, prefix=PREFIX)
app.include_router(recommend.router, prefix=PREFIX)
app.include_router(analytics.router, prefix=PREFIX)
app.include_router(users.router, prefix=PREFIX)
app.include_router(weather.router, prefix=PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "huskypark-api"}
