import csv
import io
from datetime import UTC, datetime
from hashlib import sha1
from math import log1p

from globalgram_api.domain.events.model import Event, GeoPoint
from globalgram_api.domain.events.policies import MAX_AGE
from globalgram_api.infrastructure.gdelt.cameo import ROOT_NOUNS, categorize

# Column indices (0-based)
SQLDATE = 1
ACTOR1_NAME = 6
ACTOR2_NAME = 16
IS_ROOT = 25
EVENT_CODE = 26
BASE_CODE = 27
ROOT_CODE = 28
GOLDSTEIN = 30
NUM_MENTIONS = 31
NUM_SOURCES = 32
NUM_ARTICLES = 33
GEO_TYPE = 51
GEO_NAME = 52
GEO_LAT = 56
GEO_LNG = 57
DATE_ADDED = 59
SOURCE_URL = 60


def normalize_place(name: str) -> str | None:
    """Normalize a place name by removing (general), deduplicating, and joining."""
    if not name or not name.strip():
        return None
    # Remove " (general)"
    name = name.replace(" (general)", "")
    # Split on ", " and clean
    parts = [p for p in name.split(", ") if p]
    # Deduplicate while preserving order
    seen = set()
    deduped = []
    for part in parts:
        if part not in seen:
            deduped.append(part)
            seen.add(part)
    # Join back
    result = ", ".join(deduped)
    return result if result else None


def parse_export(text: str, now: datetime) -> list[Event]:
    """Parse GDELT export CSV text and return a list of events."""
    seen_ids: dict[str, tuple[Event, int]] = {}

    reader = csv.reader(io.StringIO(text), delimiter="\t", quoting=csv.QUOTE_NONE)

    for row in reader:
        try:
            # Skip if not exactly 61 columns
            if len(row) != 61:
                continue

            # Skip if not root event
            if row[IS_ROOT] != "1":
                continue

            # Skip if geo type not in valid range
            if row[GEO_TYPE] not in {"2", "3", "4", "5"}:
                continue

            # Parse lat/lng
            try:
                lat = float(row[GEO_LAT])
                lng = float(row[GEO_LNG])
            except (ValueError, IndexError):
                continue

            # Validate lat/lng ranges (done in GeoPoint.__post_init__)
            try:
                location = GeoPoint(lat=lat, lng=lng)
            except ValueError:
                continue

            # Skip if URL doesn't start with http
            url = row[SOURCE_URL]
            if not url.startswith("http"):
                continue

            # Parse dates
            try:
                sqldate_str = row[SQLDATE]
                sqldate = datetime.strptime(sqldate_str, "%Y%m%d").date()
                cutoff_date = (now - MAX_AGE).date()
                if sqldate < cutoff_date:
                    continue
            except (ValueError, IndexError):
                continue

            try:
                occurred_at = datetime.strptime(row[DATE_ADDED], "%Y%m%d%H%M%S").replace(tzinfo=UTC)
            except (ValueError, IndexError):
                continue

            # Parse numeric fields
            try:
                mentions = int(row[NUM_MENTIONS])
                sources = int(row[NUM_SOURCES])
                articles = int(row[NUM_ARTICLES])
                goldstein = float(row[GOLDSTEIN])
            except (ValueError, IndexError):
                continue

            # Build event ID
            event_id = "gdelt-" + sha1(url.encode()).hexdigest()[:16]

            # Calculate importance
            m = mentions
            importance = round(
                min(
                    1,
                    0.8 * max(0, (log1p(m) - log1p(1)) / (log1p(200) - log1p(1))) + 0.2 * min(abs(goldstein), 10) / 10,
                ),
                3,
            )

            # Normalize place
            place = normalize_place(row[GEO_NAME])

            # Build title
            root_code = row[ROOT_CODE]
            noun = ROOT_NOUNS.get(root_code, "Event")
            actor1 = row[ACTOR1_NAME].title()
            actor2 = row[ACTOR2_NAME].title()

            if actor1 and actor2 and actor1 != actor2:
                title = f"{noun}: {actor1} – {actor2}"
            elif actor1 or actor2:
                title = f"{noun}: {actor1 or actor2}"
            elif place:
                first_place = place.split(", ")[0]
                title = f"{noun} in {first_place}"
            else:
                title = noun

            # Build summary
            summary = (
                f"Reported in {articles} article{'s' if articles != 1 else ''} "
                f"from {sources} source{'s' if sources != 1 else ''}."
            )

            # Create event
            event = Event(
                id=event_id,
                location=location,
                place=place,
                category=categorize(root_code, row[BASE_CODE], row[EVENT_CODE]),
                importance=importance,
                title=title,
                summary=summary,
                image_url=None,
                source_url=url,
                occurred_at=occurred_at,
                source="gdelt",
                mentions=mentions,
                enriched=False,
            )

            # Dedupe: keep one per id, the one with highest mentions
            if event_id in seen_ids:
                existing_event, existing_mentions = seen_ids[event_id]
                if mentions > existing_mentions:
                    seen_ids[event_id] = (event, mentions)
            else:
                seen_ids[event_id] = (event, mentions)

        except ValueError:
            # Silently skip any parse errors
            continue

    # Extract deduplicated events
    events = [event for event, _ in seen_ids.values()]
    return events
