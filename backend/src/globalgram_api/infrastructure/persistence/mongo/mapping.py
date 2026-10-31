from typing import Any

from globalgram_api.domain.events.model import Category, Event, GeoPoint


def event_to_doc(event: Event) -> dict[str, Any]:
    return {
        "_id": event.id,
        "lat": event.location.lat,
        "lng": event.location.lng,
        "place": event.place,
        "category": event.category.value,
        "importance": event.importance,
        "title": event.title,
        "summary": event.summary,
        "image_url": event.image_url,
        "source_url": event.source_url,
        "occurred_at": event.occurred_at,
        "source": event.source,
        "mentions": event.mentions,
        "enriched": event.enriched,
    }


def doc_to_event(doc: dict[str, Any]) -> Event:
    return Event(
        id=doc["_id"],
        location=GeoPoint(doc["lat"], doc["lng"]),
        place=doc.get("place"),
        category=Category(doc["category"]),
        importance=doc["importance"],
        title=doc["title"],
        summary=doc.get("summary"),
        image_url=doc.get("image_url"),
        source_url=doc.get("source_url"),
        occurred_at=doc["occurred_at"],
        source=doc["source"],
        mentions=doc["mentions"],
        enriched=doc.get("enriched", False),
    )
