"""HTTP entrypoint: ADK's FastAPI app serving the `crucible` agent from ./agents.

Routes used by the frontend (all provided by ADK):
  POST  /apps/crucible/users/{user}/sessions                  create a decision session
  POST  /run_sse                                              run the board, stream events
  PATCH /apps/crucible/users/{user}/sessions/{session}        owner ratification (stateDelta)
  GET   /apps/crucible/users/{user}/sessions                  past decisions
"""

from __future__ import annotations

import os
from pathlib import Path

import uvicorn
from google.adk.cli.fast_api import get_fast_api_app

AGENTS_DIR = Path(__file__).resolve().parent / "agents"
ALLOW_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CRUCIBLE_ALLOW_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app = get_fast_api_app(
    agents_dir=str(AGENTS_DIR),
    allow_origins=ALLOW_ORIGINS,
    session_service_uri=os.getenv("CRUCIBLE_SESSION_DB") or None,
    web=False,
)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
