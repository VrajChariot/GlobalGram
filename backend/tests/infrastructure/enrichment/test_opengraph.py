import httpx
import pytest
import respx
from conftest import make_event

from globalgram_api.infrastructure.enrichment.opengraph import OpenGraphEnricher


@pytest.mark.asyncio
async def test_og_tags_extracted():
    """Test that og tags are extracted and used."""
    html = """<html>
    <head>
        <meta property="og:title" content="Article Title" />
        <meta property="og:description" content="Article description" />
        <meta property="og:image" content="https://example.com/image.jpg" />
    </head>
    <body></body>
    </html>"""

    async with respx.mock:
        respx.get("https://example.com/article").mock(
            return_value=httpx.Response(200, content=html, headers={"content-type": "text/html; charset=utf-8"})
        )

        async with httpx.AsyncClient() as client:
            enricher = OpenGraphEnricher(client, concurrency=1)
            event = make_event(source_url="https://example.com/article")
            results = await enricher.enrich([event])

            assert len(results) == 1
            assert results[0].title == "Article Title"
            assert results[0].summary == "Article description"
            assert results[0].image_url == "https://example.com/image.jpg"
            assert results[0].enriched is True


@pytest.mark.asyncio
async def test_title_fallback_to_html_title():
    """Test that <title> is used as fallback for og:title."""
    html = """<html>
    <head>
        <title>HTML Title</title>
        <meta name="description" content="Meta description" />
    </head>
    <body></body>
    </html>"""

    async with respx.mock:
        respx.get("https://example.com/page").mock(
            return_value=httpx.Response(200, content=html, headers={"content-type": "text/html"})
        )

        async with httpx.AsyncClient() as client:
            enricher = OpenGraphEnricher(client, concurrency=1)
            event = make_event(source_url="https://example.com/page")
            results = await enricher.enrich([event])

            assert len(results) == 1
            assert results[0].title == "HTML Title"
            assert results[0].summary == "Meta description"
            assert results[0].enriched is True


@pytest.mark.asyncio
async def test_relative_image_resolved_absolute_http_rejected():
    """Test that relative og:image is resolved with urljoin, http: image is rejected."""
    html = """<html>
    <head>
        <meta property="og:image" content="/images/photo.jpg" />
    </head>
    <body></body>
    </html>"""

    async with respx.mock:
        respx.get("https://example.com/article").mock(
            return_value=httpx.Response(200, content=html, headers={"content-type": "text/html"})
        )

        async with httpx.AsyncClient() as client:
            enricher = OpenGraphEnricher(client, concurrency=1)
            event = make_event(source_url="https://example.com/article")
            results = await enricher.enrich([event])

            assert len(results) == 1
            assert results[0].image_url == "https://example.com/images/photo.jpg"
            assert results[0].enriched is True


@pytest.mark.asyncio
async def test_http_image_rejected():
    """Test that http: image is rejected (mixed content)."""
    html = """<html>
    <head>
        <meta property="og:image" content="http://example.com/image.jpg" />
    </head>
    <body></body>
    </html>"""

    async with respx.mock:
        respx.get("https://example.com/article").mock(
            return_value=httpx.Response(200, content=html, headers={"content-type": "text/html"})
        )

        async with httpx.AsyncClient() as client:
            enricher = OpenGraphEnricher(client, concurrency=1)
            event = make_event(source_url="https://example.com/article")
            results = await enricher.enrich([event])

            assert len(results) == 1
            assert results[0].image_url is None
            assert results[0].enriched is True


@pytest.mark.asyncio
async def test_text_plain_response_unchanged_but_enriched():
    """Test that non-HTML response leaves event unchanged but marks enriched=True."""
    async with respx.mock:
        respx.get("https://example.com/data").mock(
            return_value=httpx.Response(200, content="plain text", headers={"content-type": "text/plain"})
        )

        async with httpx.AsyncClient() as client:
            enricher = OpenGraphEnricher(client, concurrency=1)
            event = make_event(source_url="https://example.com/data", title="Original Title")
            results = await enricher.enrich([event])

            assert len(results) == 1
            assert results[0].title == "Original Title"
            assert results[0].enriched is True


@pytest.mark.asyncio
async def test_connection_timeout_unchanged_but_enriched():
    """Test that connection timeout leaves event unchanged but marks enriched=True."""

    async with respx.mock:
        respx.get("https://example.com/article").mock(side_effect=httpx.ConnectTimeout("Connection timeout"))

        async with httpx.AsyncClient() as client:
            enricher = OpenGraphEnricher(client, concurrency=1)
            event = make_event(source_url="https://example.com/article")
            results = await enricher.enrich([event])

            assert len(results) == 1
            assert results[0].title == event.title
            assert results[0].enriched is True


@pytest.mark.asyncio
async def test_long_title_truncated():
    """Test that long titles are truncated at 160 chars with ellipsis."""
    long_title = "A" * 200
    html = f"""<html>
    <head>
        <meta property="og:title" content="{long_title}" />
    </head>
    <body></body>
    </html>"""

    async with respx.mock:
        respx.get("https://example.com/article").mock(
            return_value=httpx.Response(200, content=html, headers={"content-type": "text/html"})
        )

        async with httpx.AsyncClient() as client:
            enricher = OpenGraphEnricher(client, concurrency=1)
            event = make_event(source_url="https://example.com/article")
            results = await enricher.enrich([event])

            assert len(results) == 1
            assert len(results[0].title) == 160
            assert results[0].title.endswith("…")


@pytest.mark.asyncio
async def test_long_summary_truncated():
    """Test that long summaries are truncated at 400 chars with ellipsis."""
    long_summary = "B" * 500
    html = f"""<html>
    <head>
        <meta property="og:description" content="{long_summary}" />
    </head>
    <body></body>
    </html>"""

    async with respx.mock:
        respx.get("https://example.com/article").mock(
            return_value=httpx.Response(200, content=html, headers={"content-type": "text/html"})
        )

        async with httpx.AsyncClient() as client:
            enricher = OpenGraphEnricher(client, concurrency=1)
            event = make_event(source_url="https://example.com/article")
            results = await enricher.enrich([event])

            assert len(results) == 1
            assert len(results[0].summary) == 400
            assert results[0].summary.endswith("…")


@pytest.mark.asyncio
async def test_output_order_preserved():
    """Test that output order matches input order."""
    events = [
        make_event(id="evt-1", source_url="https://example.com/1"),
        make_event(id="evt-2", source_url="https://example.com/2"),
        make_event(id="evt-3", source_url="https://example.com/3"),
    ]

    html = """<html>
    <head>
        <meta property="og:title" content="Title" />
    </head>
    <body></body>
    </html>"""

    async with respx.mock:
        respx.get("https://example.com/1").mock(
            return_value=httpx.Response(200, content=html, headers={"content-type": "text/html"})
        )
        respx.get("https://example.com/2").mock(
            return_value=httpx.Response(200, content=html, headers={"content-type": "text/html"})
        )
        respx.get("https://example.com/3").mock(
            return_value=httpx.Response(200, content=html, headers={"content-type": "text/html"})
        )

        async with httpx.AsyncClient() as client:
            enricher = OpenGraphEnricher(client, concurrency=2)
            results = await enricher.enrich(events)

            assert len(results) == 3
            assert results[0].id == "evt-1"
            assert results[1].id == "evt-2"
            assert results[2].id == "evt-3"


@pytest.mark.asyncio
async def test_missing_source_url():
    """Test that event with missing source_url is marked enriched without fetching."""
    async with httpx.AsyncClient() as client:
        enricher = OpenGraphEnricher(client, concurrency=1)
        event = make_event(source_url=None, title="Original")
        results = await enricher.enrich([event])

        assert len(results) == 1
        assert results[0].title == "Original"
        assert results[0].enriched is True


@pytest.mark.asyncio
async def test_non_200_response():
    """Test that non-200 responses are handled gracefully."""
    async with respx.mock:
        respx.get("https://example.com/notfound").mock(return_value=httpx.Response(404))

        async with httpx.AsyncClient() as client:
            enricher = OpenGraphEnricher(client, concurrency=1)
            event = make_event(source_url="https://example.com/notfound", title="Original")
            results = await enricher.enrich([event])

            assert len(results) == 1
            assert results[0].title == "Original"
            assert results[0].enriched is True


@pytest.mark.asyncio
async def test_whitespace_collapse():
    """Test that whitespace is collapsed in extracted text."""
    html = """<html>
    <head>
        <meta property="og:title" content="Title    with    extra     spaces" />
        <meta property="og:description" content="Description
            with
            newlines" />
    </head>
    <body></body>
    </html>"""

    async with respx.mock:
        respx.get("https://example.com/article").mock(
            return_value=httpx.Response(200, content=html, headers={"content-type": "text/html"})
        )

        async with httpx.AsyncClient() as client:
            enricher = OpenGraphEnricher(client, concurrency=1)
            event = make_event(source_url="https://example.com/article")
            results = await enricher.enrich([event])

            assert len(results) == 1
            assert results[0].title == "Title with extra spaces"
            assert "newlines" in results[0].summary
            assert "\n" not in results[0].summary


@pytest.mark.asyncio
async def test_empty_extracted_fields_keep_existing():
    """Test that empty extracted fields keep the existing event values."""
    html = """<html>
    <head>
        <meta property="og:title" content="" />
        <meta property="og:description" content="   " />
    </head>
    <body></body>
    </html>"""

    async with respx.mock:
        respx.get("https://example.com/article").mock(
            return_value=httpx.Response(200, content=html, headers={"content-type": "text/html"})
        )

        async with httpx.AsyncClient() as client:
            enricher = OpenGraphEnricher(client, concurrency=1)
            event = make_event(
                source_url="https://example.com/article",
                title="Original Title",
                summary="Original Summary",
            )
            results = await enricher.enrich([event])

            assert len(results) == 1
            assert results[0].title == "Original Title"
            assert results[0].summary == "Original Summary"
            assert results[0].enriched is True


@pytest.mark.asyncio
async def test_twitter_image_fallback():
    """Test that twitter:image is used when og:image is missing."""
    html = """<html>
    <head>
        <meta property="twitter:image" content="https://example.com/twitter.jpg" />
    </head>
    <body></body>
    </html>"""

    async with respx.mock:
        respx.get("https://example.com/article").mock(
            return_value=httpx.Response(200, content=html, headers={"content-type": "text/html"})
        )

        async with httpx.AsyncClient() as client:
            enricher = OpenGraphEnricher(client, concurrency=1)
            event = make_event(source_url="https://example.com/article")
            results = await enricher.enrich([event])

            assert len(results) == 1
            assert results[0].image_url == "https://example.com/twitter.jpg"
            assert results[0].enriched is True
