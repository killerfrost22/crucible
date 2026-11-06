"""Record a live board run from the running API into a replay file the frontend can play.

    .venv/Scripts/python.exe eval/record_replay.py dental-ai-receptionist
    .venv/Scripts/python.exe eval/record_replay.py bakery-price-increase --api http://127.0.0.1:8000

Runs the scenario's intake (from scenarios.json) through POST /run_sse and writes the raw SSE
stream to frontend/public/replays/<scenario>.sse. Costs one board run (12 model calls).
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path

EVAL_DIR = Path(__file__).resolve().parent
REPLAYS_DIR = EVAL_DIR.parents[1] / "frontend" / "public" / "replays"


def post(url: str, body: dict) -> urllib.request.Request:
    return urllib.request.Request(
        url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}
    )


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("scenario", help="scenario id from scenarios.json")
    parser.add_argument("--api", default="http://127.0.0.1:8000")
    args = parser.parse_args()

    scenarios = {s["id"]: s for s in json.loads((EVAL_DIR / "scenarios.json").read_text("utf-8"))}
    if args.scenario not in scenarios:
        raise SystemExit(f"Unknown scenario. Choose from: {', '.join(scenarios)}")
    intake = scenarios[args.scenario]["intake"]

    with urllib.request.urlopen(post(f"{args.api}/apps/crucible/users/replay/sessions", {})) as r:
        session_id = json.load(r)["id"]
    run = post(f"{args.api}/run_sse", {
        "appName": "crucible", "userId": "replay", "sessionId": session_id, "streaming": False,
        "newMessage": {"role": "user", "parts": [{"text": json.dumps(intake)}]},
    })

    started, lines, failed = time.monotonic(), [], False
    with urllib.request.urlopen(run, timeout=600) as stream:
        for raw in stream:
            line = raw.decode("utf-8").rstrip("\n")
            lines.append(line)
            if line.startswith("data:"):
                event = json.loads(line[5:])
                node = (event.get("nodeInfo") or {}).get("path", "").split("/")[-1].split("@")[0]
                error = event.get("errorMessage") or event.get("error")
                failed = failed or bool(error)
                print(f"{time.monotonic() - started:6.1f}s {node or 'error'}"
                      + (f"  ERROR {str(error).strip()[:160]}" if error else ""), flush=True)

    REPLAYS_DIR.mkdir(parents=True, exist_ok=True)
    out = REPLAYS_DIR / f"{args.scenario}{'-error' if failed else ''}.sse"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Saved {out}")


if __name__ == "__main__":
    main()
