"""Runtime settings, read once from the environment (repo-root `.env` in local dev).

Model names choose the provider:
- `openrouter/<provider>/<model>` (e.g. `openrouter/anthropic/claude-sonnet-5.5`) goes through
  OpenRouter via LiteLLM and needs OPENROUTER_API_KEY.
- A bare Gemini name (e.g. `gemini-3.6-flash`) goes to Google directly and needs GEMINI_API_KEY.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from google.adk.models.base_llm import BaseLlm
from google.adk.models.google_llm import Gemini
from google.adk.models.lite_llm import LiteLlm
from google.genai import types

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

SEAT_MODEL = os.getenv("CRUCIBLE_SEAT_MODEL", "openrouter/anthropic/claude-haiku-5.5")
RESEARCHER_MODEL = os.getenv("CRUCIBLE_RESEARCHER_MODEL", "openrouter/anthropic/claude-sonnet-5.5")
CHAIR_MODEL = os.getenv("CRUCIBLE_CHAIR_MODEL", "openrouter/anthropic/claude-sonnet-5.5")
# Researcher web search: OpenRouter's `:online` variant, or Gemini's Google Search tool (billed key).
WEB_SEARCH = os.getenv("CRUCIBLE_WEB_SEARCH", "true").strip().lower() == "true"

# One run is 12 model calls; ride out per-minute limits and overloads instead of failing the run.
RETRY = types.HttpRetryOptions(
    attempts=4,
    initial_delay=2.0,
    max_delay=20.0,
    exp_base=2.0,
    http_status_codes=[429, 500, 502, 503, 504],
)


def via_openrouter(name: str) -> bool:
    return name.startswith("openrouter/")


def seat_model_name(seat_id: str) -> str:
    """Per-seat override, e.g. CRUCIBLE_REALIST_MODEL; otherwise CRUCIBLE_SEAT_MODEL."""
    return os.getenv(f"CRUCIBLE_{seat_id.upper()}_MODEL", SEAT_MODEL)


def researcher_model_name() -> str:
    if WEB_SEARCH and via_openrouter(RESEARCHER_MODEL) and not RESEARCHER_MODEL.endswith(":online"):
        return f"{RESEARCHER_MODEL}:online"
    return RESEARCHER_MODEL


# Gemini searches through ADK's google_search tool; OpenRouter models search through `:online`.
GEMINI_SEARCH_TOOL = WEB_SEARCH and not via_openrouter(RESEARCHER_MODEL)


def litellm_name(name: str) -> str:
    """The same model addressed through LiteLLM (used by the eval's single-prompt baseline)."""
    return name if via_openrouter(name) else f"gemini/{name}"


def model(name: str) -> BaseLlm:
    if via_openrouter(name):
        return LiteLlm(model=name, num_retries=RETRY.attempts)
    return Gemini(model=name, retry_options=RETRY)
