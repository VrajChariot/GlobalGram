from datetime import UTC, datetime

from globalgram_api.domain.events.model import Category
from globalgram_api.infrastructure.gdelt.parser import (
    ACTOR1_NAME,
    ACTOR2_NAME,
    BASE_CODE,
    DATE_ADDED,
    EVENT_CODE,
    GEO_LAT,
    GEO_LNG,
    GEO_NAME,
    GEO_TYPE,
    GOLDSTEIN,
    IS_ROOT,
    NUM_ARTICLES,
    NUM_MENTIONS,
    NUM_SOURCES,
    ROOT_CODE,
    SOURCE_URL,
    SQLDATE,
    normalize_place,
    parse_export,
)


def make_row(**overrides):
    """Build a 61-element GDELT row with sensible defaults."""
    row = [""] * 61
    # Set defaults
    row[SQLDATE] = "20261029"
    row[ACTOR1_NAME] = "United States"
    row[ACTOR2_NAME] = "China"
    row[IS_ROOT] = "1"
    row[EVENT_CODE] = "010"
    row[BASE_CODE] = "01"
    row[ROOT_CODE] = "01"
    row[GOLDSTEIN] = "0.0"
    row[NUM_MENTIONS] = "1"
    row[NUM_SOURCES] = "1"
    row[NUM_ARTICLES] = "1"
    row[GEO_TYPE] = "2"
    row[GEO_NAME] = "Beijing"
    row[GEO_LAT] = "39.9"
    row[GEO_LNG] = "116.4"
    row[DATE_ADDED] = "20261029120000"
    row[SOURCE_URL] = "https://example.com/1"

    # Apply overrides - match column names like SQLDATE, ACTOR1_NAME, etc.
    col_map = {
        "SQLDATE": SQLDATE,
        "ACTOR1_NAME": ACTOR1_NAME,
        "ACTOR2_NAME": ACTOR2_NAME,
        "IS_ROOT": IS_ROOT,
        "EVENT_CODE": EVENT_CODE,
        "BASE_CODE": BASE_CODE,
        "ROOT_CODE": ROOT_CODE,
        "GOLDSTEIN": GOLDSTEIN,
        "NUM_MENTIONS": NUM_MENTIONS,
        "NUM_SOURCES": NUM_SOURCES,
        "NUM_ARTICLES": NUM_ARTICLES,
        "GEO_TYPE": GEO_TYPE,
        "GEO_NAME": GEO_NAME,
        "GEO_LAT": GEO_LAT,
        "GEO_LNG": GEO_LNG,
        "DATE_ADDED": DATE_ADDED,
        "SOURCE_URL": SOURCE_URL,
    }
    for key, value in overrides.items():
        if key in col_map:
            row[col_map[key]] = str(value)

    return row


class TestNormalizePlace:
    def test_remove_general(self):
        result = normalize_place("Jerusalem, Israel (general), Israel")
        assert result == "Jerusalem, Israel"

    def test_empty_returns_none(self):
        assert normalize_place("") is None
        assert normalize_place("   ") is None

    def test_deduplicate_parts(self):
        result = normalize_place("A, B, A, C")
        assert result == "A, B, C"


class TestParseExport:
    def test_non_root_row_dropped(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(IS_ROOT="0")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 0

    def test_geo_type_1_dropped(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(GEO_TYPE="1")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 0

    def test_geo_type_0_dropped(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(GEO_TYPE="0")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 0

    def test_duplicate_url_keeps_max_mentions(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row1 = make_row(SOURCE_URL="https://example.com/event", NUM_MENTIONS="10")
        row2 = make_row(SOURCE_URL="https://example.com/event", NUM_MENTIONS="20")
        text = "\t".join(row1) + "\n" + "\t".join(row2)
        events = parse_export(text, now)
        assert len(events) == 1
        assert events[0].mentions == 20

    def test_old_sqldate_dropped(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        # MAX_AGE is 24 hours, so cutoff is 2026-10-29
        row = make_row(SQLDATE="20261028")  # Before cutoff
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 0

    def test_category_conflict_root_18(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(ROOT_CODE="18")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 1
        assert events[0].category == Category.CONFLICT

    def test_category_economy_base_061(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(BASE_CODE="061")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 1
        assert events[0].category == Category.ECONOMY

    def test_category_disaster_base_073(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(BASE_CODE="073")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 1
        assert events[0].category == Category.DISASTER

    def test_category_politics_root_14(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(ROOT_CODE="14", BASE_CODE="02")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 1
        assert events[0].category == Category.POLITICS

    def test_place_normalization(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(GEO_NAME="Jerusalem, Israel (general), Israel")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 1
        assert events[0].place == "Jerusalem, Israel"

    def test_title_both_actors(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(ACTOR1_NAME="united states", ACTOR2_NAME="china", ROOT_CODE="01")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 1
        assert events[0].title == "Public statement: United States – China"

    def test_title_one_actor(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(ACTOR1_NAME="japan", ACTOR2_NAME="", ROOT_CODE="05")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 1
        assert events[0].title == "Diplomatic cooperation: Japan"

    def test_title_no_actors(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(ACTOR1_NAME="", ACTOR2_NAME="", GEO_NAME="Tokyo, Japan", ROOT_CODE="10")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 1
        assert events[0].title == "Demand in Tokyo"

    def test_title_same_actors(self):
        """When actor1 == actor2, treat as one actor."""
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(ACTOR1_NAME="Israel", ACTOR2_NAME="israel", ROOT_CODE="14")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 1
        assert events[0].title == "Protest: Israel"

    def test_importance_m1_goldstein0(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(NUM_MENTIONS="1", GOLDSTEIN="0.0")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 1
        assert events[0].importance == 0.0

    def test_importance_m200_goldstein10(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(NUM_MENTIONS="200", GOLDSTEIN="10.0")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 1
        assert events[0].importance == 1.0

    def test_summary_single_article_source(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(NUM_ARTICLES="1", NUM_SOURCES="1")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 1
        assert events[0].summary == "Reported in 1 article from 1 source."

    def test_summary_multiple_articles_sources(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(NUM_ARTICLES="5", NUM_SOURCES="3")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 1
        assert events[0].summary == "Reported in 5 articles from 3 sources."

    def test_source_url_must_start_with_http(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(SOURCE_URL="ftp://example.com/file")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 0

    def test_wrong_column_count_dropped(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row()
        text = "\t".join(row[:-1])  # Remove one column
        events = parse_export(text, now)
        assert len(events) == 0

    def test_id_generation(self):
        now = datetime(2026, 10, 30, 18, tzinfo=UTC)
        row = make_row(SOURCE_URL="https://example.com/specific-url")
        text = "\t".join(row)
        events = parse_export(text, now)
        assert len(events) == 1
        assert events[0].id.startswith("gdelt-")
        assert len(events[0].id) == 22  # "gdelt-" (6 chars) + 16 hex chars from SHA1[:16]
