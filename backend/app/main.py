"""HuskyPark Predictor — FastAPI application entry point."""

import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.mongo import close_client
from app.database.postgres import close_pool, get_pool
from app.routers import analytics, auth, dashboard, events, lots, permits, recommend, reports, users
from app.services.cache import cache_delete, close_redis

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


def _owm_to_condition(weather_id: int, wind_mph: float) -> str:
    """Map OpenWeatherMap weather ID to our internal condition string."""
    if 200 <= weather_id < 600:
        return "rain"
    if 600 <= weather_id < 700:
        # Blizzard: heavy shower snow (622) or blowing snow conditions + high wind
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


async def _recompute_predictions() -> None:
    """Recompute predictions for current + next 3 hours for all active lots, then bust cache."""
    from app.services.prediction import compute_probability

    pool = await get_pool()
    async with pool.acquire() as conn:
        lot_rows = await conn.fetch(
            "SELECT lot_id FROM parking_lot WHERE is_active = TRUE"
        )
        weather_row = await conn.fetchrow(
            "SELECT condition FROM weather_snapshot ORDER BY recorded_at DESC LIMIT 1"
        )
        now = datetime.utcnow()
        active_event_rows = await conn.fetch(
            """
            SELECT title, expected_attendance
            FROM campus_event
            WHERE event_start <= $1 AND event_end >= $1
            """,
            now,
        )
        weather_condition = str(weather_row["condition"]) if weather_row else "clear"
        active_events = []
        for row in active_event_rows:
            attendance = int(row["expected_attendance"] or 0)
            impact = "high" if attendance >= 2000 else "medium" if attendance >= 700 else "low"
            active_events.append({"title": row["title"], "impact_level": impact})

        # Generate predictions for right now and the next 3 hours
        targets = [now + timedelta(hours=h) for h in (0, 1, 2, 3)]
        for lot in lot_rows:
            for target in targets:
                prediction = await compute_probability(
                    conn,
                    lot["lot_id"],
                    target,
                    weather_condition=weather_condition,
                    active_events=active_events,
                )
                await conn.execute(
                    """
                    INSERT INTO parking_prediction
                        (lot_id, predicted_at, target_time, prob_score,
                         confidence_level, factors_summary, model_version)
                    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
                    """,
                    prediction["lot_id"],
                    prediction["predicted_at"],
                    prediction["target_time"],
                    prediction["prob_score"],
                    prediction["confidence_level"],
                    json.dumps(prediction["factors_summary"]),
                    prediction["model_version"],
                )

    await cache_delete("dashboard:latest")
    logger.info(
        "Predictions recomputed: %d lots × %d time slots (weather: %s)",
        len(lot_rows),
        len(targets),
        weather_condition,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    await _refresh_weather()
    await _recompute_predictions()
    scheduler.add_job(_refresh_weather, "interval", minutes=10, id="weather")
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


@app.get("/health")
async def health():
    return {"status": "ok", "service": "huskypark-api"}
