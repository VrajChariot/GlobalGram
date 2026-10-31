from conftest import make_event

from globalgram_api.infrastructure.persistence.mongo.mapping import doc_to_event, event_to_doc


def test_event_survives_document_round_trip() -> None:
    event = make_event(summary="s", image_url="https://example.com/i.jpg", enriched=True)
    assert doc_to_event(event_to_doc(event)) == event


def test_document_without_optional_fields_loads() -> None:
    doc = event_to_doc(make_event())
    for key in ("place", "summary", "image_url", "source_url", "enriched"):
        del doc[key]
    event = doc_to_event(doc)
    assert event.place is None and event.summary is None and not event.enriched
