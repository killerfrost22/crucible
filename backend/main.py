"""HTTP entrypoint: ADK's FastAPI app serving the `crucible` agent from ./agents, behind guard.py.

Public routes (everything else answers 404 CRUCIBLE_NOT_FOUND):
  GET   /list-apps                                            deploy check
  POST  /apps/crucible/users/{user}/sessions                  create a decision session
  POST  /run_sse                                              run the board, stream events
  PATCH /apps/crucible/users/{user}/sessions/{session}        owner ratification (stateDelta)
"""

from __future__ import annotations

import os
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from google.adk.cli.fast_api import get_fast_api_app
from starlette.middleware import Middleware

from guard import Guard, Limits

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

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
# Innermost user middleware, i.e. inside ADK's CORS middleware, so browsers can read the guard's
# errors. (`add_middleware` would put it outermost, outside CORS.)
app.user_middleware.append(Middleware(Guard, limits=Limits.from_env()))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
