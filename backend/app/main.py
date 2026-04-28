"""HuskyPark Predictor — FastAPI application entry point."""

from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.mongo import close_client
from app.database.postgres import close_pool, get_pool
from app.routers import analytics, auth, dashboard, events, lots, permits, recommend, reports, users
from app.services.cache import close_redis

scheduler = AsyncIOScheduler()


async def _recompute_predictions() -> None:
    """Background job: recompute all lot predictions every 15 minutes."""
    from datetime import datetime, timedelta

    from app.database.postgres import get_pool
    from app.services.prediction import compute_probability

    pool = await get_pool()
    async with pool.acquire() as conn:
        lot_rows = await conn.fetch(
            "SELECT lot_id FROM parking_lot WHERE is_active = TRUE"
        )
        target = datetime.utcnow() + timedelta(hours=1)
        weather_row = await conn.fetchrow(
            """
            SELECT condition
            FROM weather_snapshot
            ORDER BY recorded_at DESC
            LIMIT 1
            """
        )
        active_event_rows = await conn.fetch(
            """
            SELECT title, expected_attendance
            FROM campus_event
            WHERE event_start <= $1
              AND event_end >= $1
            """,
            target,
        )
        weather_condition = str(weather_row["condition"]) if weather_row else "clear"
        active_events = []
        for row in active_event_rows:
            attendance = int(row["expected_attendance"] or 0)
            if attendance >= 2000:
                impact = "high"
            elif attendance >= 700:
                impact = "medium"
            else:
                impact = "low"
            active_events.append({"title": row["title"], "impact_level": impact})

        for lot in lot_rows:
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
                str(prediction["factors_summary"]).replace("'", '"'),
                prediction["model_version"],
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await get_pool()
    await _recompute_predictions()
    scheduler.add_job(_recompute_predictions, "interval", minutes=15, id="recompute")
    scheduler.start()
    yield
    # Shutdown
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
