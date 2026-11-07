"""Board vs. single-prompt baseline on trap scenarios.

For each scenario in scenarios.json, ask one plain prompt (same model as the Chairman) and run
the full board in-process, then check which `must_catch` risks each one surfaced.

    .venv/Scripts/python.exe eval/run_eval.py                       # all scenarios
    .venv/Scripts/python.exe eval/run_eval.py --only dental-ai-receptionist,bakery-price-increase
    .venv/Scripts/python.exe eval/run_eval.py --skip-baseline

Cost: 13 model calls per scenario (1 baseline + 12 board), about $0.10–0.15 with the default OpenRouter models.
Writes eval/results/<timestamp>/{report.md,<scenario>.json}.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

EVAL_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(EVAL_DIR.parent / "agents"))

import litellm  # noqa: E402
from google.adk.runners import InMemoryRunner  # noqa: E402
from google.genai import types  # noqa: E402

from crucible import config  # noqa: E402
from crucible.agent import root_agent  # noqa: E402
from crucible.seats import render_intake  # noqa: E402

BASELINE_PROMPT = """\
You are an experienced small-business advisor. A small-business owner asks for your advice.
Give a clear recommendation, the main risks, and next steps.

{briefing}"""


def caught(text: str, item: dict[str, Any]) -> bool:
    return any(re.search(pattern, text, re.IGNORECASE) for pattern in item["any"])


async def run_baseline(intake: dict[str, Any]) -> str:
    response = await litellm.acompletion(
        model=config.litellm_name(config.CHAIR_MODEL),
        messages=[{"role": "user", "content": BASELINE_PROMPT.format(briefing=render_intake(intake))}],
        num_retries=config.RETRY.attempts,
    )
    return response.choices[0].message.content or ""


async def run_board(intake: dict[str, Any]) -> tuple[dict[str, Any], str | None]:
    runner = InMemoryRunner(agent=root_agent, app_name="crucible")
    session = await runner.session_service.create_session(app_name="crucible", user_id="eval")
    message = types.Content(role="user", parts=[types.Part(text=json.dumps(intake))])
    error = None
    try:
        async for event in runner.run_async(
            user_id="eval", session_id=session.id, new_message=message
        ):
            if event.error_message:
                error = f"{event.error_code}: {event.error_message}"
    except Exception as e:  # a failed node aborts the run; keep the partial state
        error = f"{type(e).__name__}: {e}"
    final = await runner.session_service.get_session(
        app_name="crucible", user_id="eval", session_id=session.id
    )
    return dict(final.state), error


def board_text(state: dict[str, Any]) -> str:
    return json.dumps({k: state.get(k) for k in ("evidence", "round1", "round2", "verdict")})


def score(items: list[dict[str, Any]], text: str) -> str:
    hits = [item["label"] for item in items if caught(text, item)]
    return f"{len(hits)}/{len(items)}"


async def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="comma-separated scenario ids")
    parser.add_argument("--skip-baseline", action="store_true")
    parser.add_argument("--skip-board", action="store_true")
    args = parser.parse_args()

    scenarios = json.loads((EVAL_DIR / "scenarios.json").read_text(encoding="utf-8"))
    if args.only:
        wanted = set(args.only.split(","))
        unknown = wanted - {s["id"] for s in scenarios}
        if unknown:
            raise SystemExit(f"Unknown scenario ids: {', '.join(sorted(unknown))}")
        scenarios = [s for s in scenarios if s["id"] in wanted]

    out_dir = EVAL_DIR / "results" / datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir.mkdir(parents=True)
    rows = []

    for s in scenarios:
        print(f"▶ {s['id']}", flush=True)
        record: dict[str, Any] = {"scenario": s, "seat_model": config.SEAT_MODEL,
                                  "researcher_model": config.researcher_model_name(),
                                  "chair_model": config.CHAIR_MODEL, "web_search": config.WEB_SEARCH}
        row = {"id": s["id"], "baseline": "—", "board": "—", "verdict": "—",
               "decision": "—", "blocks": "—", "seconds": "—", "error": ""}

        if not args.skip_baseline:
            try:
                record["baseline"] = await run_baseline(s["intake"])
                row["baseline"] = score(s["must_catch"], record["baseline"])
            except Exception as e:
                row["error"] = f"baseline {type(e).__name__}"
                record["baseline_error"] = str(e)

        if not args.skip_board:
            started = time.monotonic()
            state, error = await run_board(s["intake"])
            row["seconds"] = f"{time.monotonic() - started:.0f}"
            record["board_state"], record["board_error"] = state, error
            row["board"] = score(s["must_catch"], board_text(state))
            verdict = state.get("verdict")
            if verdict:
                row["verdict"] = score(s["must_catch"], json.dumps(verdict))
                row["decision"] = verdict["decision"]
            realist = (state.get("round2") or {}).get("realist") or {}
            row["blocks"] = str(sum(c["status"] == "block" for c in realist.get("checks", [])))
            if error:
                row["error"] = (row["error"] + " board " + error.split(":")[0]).strip()

        (out_dir / f"{s['id']}.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
        rows.append(row)
        print(f"  baseline {row['baseline']} · board {row['board']} · verdict {row['verdict']}"
              f" · {row['decision']} · {row['seconds']}s {row['error']}", flush=True)

    header = (
        f"# Eval {out_dir.name}\n\nSeat model `{config.SEAT_MODEL}`, researcher "
        f"`{config.researcher_model_name()}`, chair `{config.CHAIR_MODEL}`, web search "
        f"{'on' if config.WEB_SEARCH else 'off'}.\n"
        "Columns count `must_catch` risks surfaced: baseline = one plain prompt; board = anywhere "
        "in evidence or debate; verdict = in the Chairman's final recommendation.\n\n"
        "| Scenario | Baseline | Board | Verdict | Decision | Realist blocks (R2) | Seconds | Error |\n"
        "|---|---|---|---|---|---|---|---|\n"
    )
    table = "".join(
        f"| {r['id']} | {r['baseline']} | {r['board']} | {r['verdict']} | {r['decision']} "
        f"| {r['blocks']} | {r['seconds']} | {r['error']} |\n"
        for r in rows
    )
    (out_dir / "report.md").write_text(header + table, encoding="utf-8")
    print(f"\nReport: {out_dir / 'report.md'}")


if __name__ == "__main__":
    asyncio.run(main())
