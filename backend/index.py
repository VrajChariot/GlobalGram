"""Vercel entrypoint: exposes the ASGI `app` without relying on the project being installed into the environment."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from globalgram_api.api.app import app as app  # noqa: E402
