"""
SCSU events scraper.

Fetches upcoming events from St. Cloud State University's public calendar
and upserts them into the campus_event table.

Strategy (in order):
  1. Try the SCSU Localist JSON API
  2. Fall back to parsing the main calendar HTML page
"""

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)

SCSU_LOCALIST_URL = "https://www.stcloudstate.edu/api/2/events"
SCSU_CALENDAR_URL = "https://www.stcloudstate.edu/calendar/"

# Events at these locations get elevated impact levels
_HIGH_IMPACT = {"hockey center", "herb brooks", "halenbeck", "stadium", "athletic complex"}
_MEDIUM_IMPACT = {"atwood", "iself", "eastman", "riverview", "fieldhouse", "coborn"}

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; HuskyPark/1.0; +https://github.com/OChidubem/HuskyPark)"
    )
}


def _location_to_attendance(location: str) -> int:
    loc = location.lower()
    for kw in _HIGH_IMPACT:
        if kw in loc:
            return 2500
    for kw in _MEDIUM_IMPACT:
        if kw in loc:
            return 800
    return 300


def _parse_localist_response(data: dict) -> list[dict]:
    events = []
    for item in data.get("events", []):
        ev = item.get("event", {})
        title = ev.get("title", "").strip()
        if not title:
            continue
        location = (ev.get("venue") or {}).get("name", "") or ev.get("location_name", "") or "Campus"
        instances = ev.get("event_instances", [])
        for inst in instances:
            ei = inst.get("event_instance", {})
            start_str = ei.get("start")
            end_str = ei.get("end")
            if not start_str:
                continue
            try:
                start = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                end = datetime.fromisoformat(end_str.replace("Z", "+00:00")) if end_str else start
                events.append({
                    "title": title[:160],
                    "location": location[:120],
                    "event_start": start.replace(tzinfo=None),
                    "event_end": end.replace(tzinfo=None),
                    "expected_attendance": _location_to_attendance(location),
                })
            except (ValueError, TypeError):
                pass
    return events


def _parse_html_fallback(html: str) -> list[dict]:
    """
    Minimal HTML parser for SCSU's Drupal calendar.
    Looks for JSON-LD structured data first, then common HTML patterns.
    """
    events: list[dict] = []

    # Try JSON-LD
    for match in re.finditer(
        r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>',
        html,
        re.DOTALL | re.IGNORECASE,
    ):
        try:
            payload = json.loads(match.group(1))
            items = payload if isinstance(payload, list) else [payload]
            for item in items:
                if item.get("@type") != "Event":
                    continue
                title = item.get("name", "").strip()
                location = (
                    (item.get("location") or {}).get("name", "")
                    or item.get("location", "")
                    or "Campus"
                )
                start_str = item.get("startDate")
                end_str = item.get("endDate") or start_str
                if not (title and start_str):
                    continue
                try:
                    start = datetime.fromisoformat(str(start_str).replace("Z", "+00:00"))
                    end = datetime.fromisoformat(str(end_str).replace("Z", "+00:00"))
                    events.append({
                        "title": title[:160],
                        "location": str(location)[:120],
                        "event_start": start.replace(tzinfo=None),
                        "event_end": end.replace(tzinfo=None),
                        "expected_attendance": _location_to_attendance(str(location)),
                    })
                except (ValueError, TypeError):
                    pass
        except (json.JSONDecodeError, AttributeError):
            pass

    if events:
        return events

    # Fallback: look for common Drupal event markup
    title_pattern = re.compile(
        r'class="[^"]*(?:event-title|node__title)[^"]*"[^>]*>.*?<a[^>]*>([^<]+)</a>',
        re.DOTALL | re.IGNORECASE,
    )
    date_pattern = re.compile(
        r'<time[^>]+datetime="([^"]+)"', re.IGNORECASE
    )

    titles = [m.group(1).strip() for m in title_pattern.finditer(html)]
    dates = [m.group(1) for m in date_pattern.finditer(html)]

    for i, title in enumerate(titles[:20]):
        start_str = dates[i * 2] if i * 2 < len(dates) else None
        end_str = dates[i * 2 + 1] if i * 2 + 1 < len(dates) else start_str
        if not start_str:
            continue
        try:
            start = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
            end = datetime.fromisoformat(end_str.replace("Z", "+00:00")) if end_str else start
            events.append({
                "title": title[:160],
                "location": "Campus",
                "event_start": start.replace(tzinfo=None),
                "event_end": end.replace(tzinfo=None),
                "expected_attendance": 400,
            })
        except (ValueError, TypeError):
            pass

    return events


async def fetch_scsu_events() -> list[dict]:
    """Fetch upcoming SCSU events. Returns a list of event dicts."""
    async with httpx.AsyncClient(timeout=15.0, headers=_HEADERS, follow_redirects=True) as client:
        # Try Localist API first
        try:
            resp = await client.get(
                SCSU_LOCALIST_URL,
                params={"days": 60, "pp": 50, "type": "event"},
            )
            if resp.status_code == 200 and "application/json" in resp.headers.get("content-type", ""):
                data = resp.json()
                events = _parse_localist_response(data)
                if events:
                    logger.info("Fetched %d events from Localist API", len(events))
                    return events
        except Exception:
            logger.debug("Localist API unavailable, falling back to HTML")

        # Fall back to calendar HTML page
        try:
            resp = await client.get(SCSU_CALENDAR_URL)
            resp.raise_for_status()
            events = _parse_html_fallback(resp.text)
            logger.info("Fetched %d events from SCSU calendar HTML", len(events))
            return events
        except Exception:
            logger.exception("SCSU calendar HTML scrape failed")

    return []


async def upsert_events(conn, events: list[dict]) -> int:
    """Insert events that don't already exist (matched by title + start time)."""
    inserted = 0
    for ev in events:
        # Skip events in the past
        if ev["event_end"] < datetime.utcnow():
            continue
        result = await conn.execute(
            """
            INSERT INTO campus_event (title, location, event_start, event_end, expected_attendance)
            SELECT $1, $2, $3, $4, $5
            WHERE NOT EXISTS (
                SELECT 1 FROM campus_event
                WHERE title = $1
                  AND ABS(EXTRACT(EPOCH FROM (event_start - $3))) < 3600
            )
            """,
            ev["title"],
            ev["location"],
            ev["event_start"],
            ev["event_end"],
            ev["expected_attendance"],
        )
        if result != "INSERT 0 0":
            inserted += 1
    return inserted


async def run_events_sync(conn) -> int:
    """Full cycle: fetch from SCSU + upsert. Returns number of new events added."""
    events = await fetch_scsu_events()
    if not events:
        return 0
    return await upsert_events(conn, events)
