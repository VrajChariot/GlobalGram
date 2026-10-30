import asyncio
import html
import re
from collections.abc import Sequence
from html.parser import HTMLParser
from urllib.parse import urljoin

import httpx

from globalgram_api.domain.events.model import Event


class _MetaParser(HTMLParser):
    """Extracts Open Graph and other meta tags from HTML head."""

    def __init__(self) -> None:
        super().__init__()
        self.og_title: str | None = None
        self.og_description: str | None = None
        self.og_image: str | None = None
        self.twitter_image: str | None = None
        self.description: str | None = None
        self.title: str | None = None
        self._in_head = True
        self._collecting_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if not self._in_head:
            return

        if tag == "meta":
            attr_dict = {k: v for k, v in attrs}
            prop_or_name = attr_dict.get("property") or attr_dict.get("name")
            content = attr_dict.get("content")

            if prop_or_name and content:
                if prop_or_name == "og:title":
                    self.og_title = content
                elif prop_or_name == "og:description":
                    self.og_description = content
                elif prop_or_name == "og:image":
                    self.og_image = content
                elif prop_or_name == "twitter:image":
                    self.twitter_image = content
                elif prop_or_name == "description":
                    self.description = content

        elif tag == "title":
            self._collecting_title = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._collecting_title = False
        elif tag == "head":
            self._in_head = False

    def handle_data(self, data: str) -> None:
        if self._collecting_title and self._in_head:
            self.title = (self.title or "") + data


def _clean_text(text: str, max_length: int) -> str | None:
    """Clean HTML text: unescape, collapse whitespace, strip, truncate."""
    cleaned = html.unescape(text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    if not cleaned:
        return None

    if len(cleaned) > max_length:
        cleaned = cleaned[: max_length - 1] + "…"

    return cleaned


class OpenGraphEnricher:
    """Enriches events with Open Graph metadata from their source URLs."""

    def __init__(self, client: httpx.AsyncClient, concurrency: int, max_bytes: int = 262_144) -> None:
        self.client = client
        self.concurrency = concurrency
        self.max_bytes = max_bytes

    async def enrich(self, events: Sequence[Event]) -> list[Event]:
        """Enrich events with Open Graph metadata, preserving input order."""
        semaphore = asyncio.Semaphore(self.concurrency)
        results: list[Event | None] = [None] * len(events)

        async def enrich_one(index: int, event: Event) -> None:
            async with semaphore:
                results[index] = await self._enrich_single(event)

        await asyncio.gather(*(enrich_one(i, e) for i, e in enumerate(events)))
        return [r for r in results if r is not None]  # every slot is filled; narrows the type

    async def _enrich_single(self, event: Event) -> Event:
        """Enrich a single event."""
        if event.source_url is None:
            return event.with_enrichment(None, None, None)

        try:
            async with self.client.stream(
                "GET",
                event.source_url,
                headers={"User-Agent": "GlobalGramBot/0.1 (+https://github.com/VrajChariot/GlobalGram)"},
                follow_redirects=True,
            ) as response:
                if response.status_code != 200:
                    return event.with_enrichment(None, None, None)

                content_type = response.headers.get("content-type", "")
                if "html" not in content_type.lower():
                    return event.with_enrichment(None, None, None)

                # Read chunks until max_bytes
                body = bytearray()
                async for chunk in response.aiter_bytes(chunk_size=8192):
                    body += chunk
                    if len(body) >= self.max_bytes:
                        del body[self.max_bytes :]
                        break
                html_content = body.decode("utf-8", errors="replace")

                # Parse HTML
                parser = _MetaParser()
                parser.feed(html_content)

                # Extract fields
                title = _clean_text(parser.og_title or parser.title or "", 160)
                summary = _clean_text(parser.og_description or parser.description or "", 400)

                # Image: og:image else twitter:image, resolved and https only
                image_url: str | None = None
                img_value = parser.og_image or parser.twitter_image
                if img_value:
                    resolved_img = urljoin(str(response.url), img_value)
                    if resolved_img.startswith("https://"):
                        image_url = resolved_img

                return event.with_enrichment(title, summary, image_url)

        except Exception:
            return event.with_enrichment(None, None, None)
