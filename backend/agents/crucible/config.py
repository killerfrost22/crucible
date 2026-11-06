"""Runtime settings, read once from the environment (repo-root `.env` in local dev)."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from google.adk.models.google_llm import Gemini
from google.genai import types

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

# Free-tier keys get 0 quota on Pro-class models and on Google Search grounding.
# After enabling billing: CRUCIBLE_CHAIR_MODEL=gemini-4-argon, CRUCIBLE_WEB_SEARCH=true.
SEAT_MODEL = os.getenv("CRUCIBLE_SEAT_MODEL", "gemini-3.6-flash")
CHAIR_MODEL = os.getenv("CRUCIBLE_CHAIR_MODEL", "gemini-3.6-flash")
WEB_SEARCH = os.getenv("CRUCIBLE_WEB_SEARCH", "false").strip().lower() == "true"

# One run is 12 model calls; ride out per-minute limits and overloads. Daily-quota 429s
# (free tier: 20 requests/day/model) will still fail the run after these retries.
RETRY = types.HttpRetryOptions(
    attempts=4,
    initial_delay=2.0,
    max_delay=20.0,
    exp_base=2.0,
    http_status_codes=[429, 500, 502, 503, 504],
)


def model(name: str) -> Gemini:
    return Gemini(model=name, retry_options=RETRY)
