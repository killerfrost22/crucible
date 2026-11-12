"""Board vs. single-prompt baselines on trap scenarios.

For each scenario in scenarios.json, run the full board in-process and two single prompts to the
Chairman's model: a plain one (no research) and one given the board's own research, so the board
gets no edge from sources alone. A judge model then grades the three final answers blind.

    .venv/Scripts/python.exe eval/run_eval.py                       # all scenarios
    .venv/Scripts/python.exe eval/run_eval.py --only dental-ai-receptionist,bakery-price-increase
    .venv/Scripts/python.exe eval/run_eval.py --repeat 3            # three board runs per scenario
    .venv/Scripts/python.exe eval/run_eval.py --rejudge eval/results/20261110-210818

Primary score (judged): per planted risk, 0 = absent, 1 = mentioned, 2 = the recommendation is
gated on it or changed by it; plus actionability and confident factual errors. Secondary score
(keyword): regex hits anywhere in the text, kept as a cheap diagnostic.

Cost: 14 model calls per scenario run (12 board + 2 baselines) plus 1 judge call. The report gives
what OpenRouter charged per call (`usage.cost`), summed for the board and for everything else. Calls
whose response carries no `usage.cost` are left out, and on Nov 12 a live meeting cost $0.55 by the
key's spend counter against about $0.12 here, so budget from the key's spend (openrouter.ai), not this.
Writes eval/results/<timestamp>/{report.md,<scenario>.json}.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import random
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
from litellm.integrations.custom_logger import CustomLogger  # noqa: E402

from crucible import config  # noqa: E402
from crucible.agent import root_agent  # noqa: E402
from crucible.seats import render_evidence, render_intake  # noqa: E402

BASELINE_PROMPT = """\
You are an experienced small-business advisor. A small-business owner asks for your advice.
Give a clear recommendation, the main risks, and next steps.

{briefing}"""

RESEARCH_BASELINE_PROMPT = """\
You are an experienced small-business advisor. A small-business owner asks for your advice.
Give a clear recommendation, the main risks, and next steps. Research gathered for this decision
is below; use it.

{briefing}

RESEARCH
{evidence}"""

JUDGE_PROMPT = """\
You grade advice given to a small-business owner. Below are the owner's briefing, the risks an
expert planted in this scenario, and {n} anonymous answers. Grade each answer on its own merits.

Do not reward length or formatting. A short answer that makes a risk a condition of the decision
beats a long one that only lists it.

For each answer and each planted risk, give:
- 2 if the recommendation is gated on the risk or changed because of it (e.g. "don't start until
  X", "only if Y", "do Z instead because of X");
- 1 if the risk is named but the recommendation doesn't depend on it;
- 0 if the risk is absent.
Back every 1 or 2 with a verbatim quote of at most 25 words from that answer.

Also give each answer:
- actionable: 1-5, how clearly the owner knows what to do this week;
- errors: factual or legal claims you are confident are wrong, each with a one-line correction.
  Leave it empty when unsure; a claim being unsourced is not an error.
{control}
Reply with JSON only, no prose:
{{"answers": {{"A": {{"risks": [{{"risk": "<label>", "score": 0, "quote": ""}}], "actionable": 3,
"errors": [{{"claim": "", "correction": ""}}]{control_field}}}, ...}}}}

OWNER BRIEFING
{briefing}

PLANTED RISKS
{risks}

{answers}"""

CONTROL_RULE = """- invented_blocker: true if the answer rejects or blocks the plan on legal or compliance grounds
  that don't apply here. This scenario is a control with no legal trap: {control}
"""

ARMS = ("baseline", "baseline_research", "board")
ARM_TITLES = {"baseline": "Baseline", "baseline_research": "Baseline + research", "board": "Board"}


# ── Model calls ───────────────────────────────────────────────────────────────


class Spend(CustomLogger):
    """Adds up what OpenRouter charged for each call (`usage.cost`), by phase of the scenario."""

    def __init__(self) -> None:
        self.phase = "other"
        self.usd: dict[str, float] = {}

    async def async_log_success_event(self, kwargs, response_obj, start_time, end_time) -> None:
        cost = getattr(getattr(response_obj, "usage", None), "cost", None)
        if cost:
            self.usd[self.phase] = self.usd.get(self.phase, 0.0) + float(cost)

    async def enter(self, phase: str) -> None:
        await asyncio.sleep(1)  # success callbacks land just after the call returns
        self.phase = phase


SPEND = Spend()
litellm.callbacks.append(SPEND)


async def ask(prompt: str, model: str = config.CHAIR_MODEL, **kwargs: Any) -> str:
    response = await litellm.acompletion(
        model=config.litellm_name(model),
        messages=[{"role": "user", "content": prompt}],
        num_retries=config.RETRY.attempts,
        **kwargs,
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


# ── Answers as text ───────────────────────────────────────────────────────────


def strip_refs(text: str) -> str:
    """Drop fact IDs so the judge can't tell the board from a baseline by its citations."""
    text = re.sub(r"\s*\(\s*(?:F\d{1,2}\s*[,;]?\s*)+\)", "", text)
    return re.sub(r"\bF\d{1,2}\b[,;]?\s*", "", text)


def verdict_text(verdict: dict[str, Any]) -> str:
    """The Chairman's verdict as plain text, the shape of an advisor's written answer."""
    lines = [f"Recommendation: {verdict['decision']}. {verdict['headline']}", "", verdict["rationale"]]
    sections = [
        ("Why", [p["point"] for p in verdict.get("decisive_arguments") or []]),
        ("Conditions", verdict.get("conditions")),
        ("Next steps", [f"{s['when']}: {s['action']}" for s in verdict.get("next_steps") or []]),
        ("Strongest objections", [p["point"] for p in verdict.get("dissent") or []]),
        ("What would change this", verdict.get("would_change")),
        ("Tools", [f"{t['name']} ({t['monthly_cost']}): {t['use']} {t.get('pilot_test', '')}".strip()
                   for t in verdict.get("ai_tools") or []]),
    ]
    for title, items in sections:
        if items:
            lines += ["", f"{title}:"] + [f"- {item}" for item in items]
    if verdict.get("no_new_tool"):
        lines += ["", f"Without a new tool: {verdict['no_new_tool']}"]
    if verdict.get("escalate_to") not in (None, "", "none"):
        lines += ["", f"Talk to: {verdict['escalate_to']}. {verdict.get('escalation_reason', '')}".strip()]
    return strip_refs("\n".join(lines))


def answers_of(record: dict[str, Any]) -> dict[str, str]:
    out = {arm: record[arm] for arm in ("baseline", "baseline_research") if record.get(arm)}
    verdict = (record.get("board_state") or {}).get("verdict")
    if verdict:
        out["board"] = verdict_text(verdict)
    return out


# ── Scoring ───────────────────────────────────────────────────────────────────


def caught(text: str, item: dict[str, Any]) -> bool:
    return any(re.search(pattern, text, re.IGNORECASE) for pattern in item["any"])


def keyword(items: list[dict[str, Any]], text: str) -> str:
    return f"{sum(caught(text, item) for item in items)}/{len(items)}"


def parse_json(text: str) -> dict[str, Any]:
    """The first JSON object in the reply; models sometimes add a second one or a note after it."""
    start = text.find("{")
    if start < 0:
        raise ValueError("judge reply has no JSON object")
    return json.JSONDecoder().raw_decode(text, start)[0]


async def judge(scenario: dict[str, Any], answers: dict[str, str], model: str) -> dict[str, Any]:
    arms = list(answers)
    random.Random(scenario["id"]).shuffle(arms)  # fixed per scenario, so reruns are comparable
    letters = {arm: chr(ord("A") + i) for i, arm in enumerate(arms)}
    control = scenario.get("control")
    prompt = JUDGE_PROMPT.format(
        n=len(arms),
        control=CONTROL_RULE.format(control=control) if control else "",
        control_field=', "invented_blocker": false' if control else "",
        briefing=render_intake(scenario["intake"]),
        risks="\n".join(f"- {item['label']}" for item in scenario["must_catch"]),
        answers="\n\n".join(f"ANSWER {letters[arm]}\n{answers[arm]}" for arm in arms),
    )
    graded = parse_json(await ask(prompt, model=model, temperature=0))["answers"]
    return {"model": model, "letters": letters, **{arm: graded[letters[arm]] for arm in arms}}


def risk_points(grade: dict[str, Any] | None) -> int | None:
    return None if not grade else sum(int(r.get("score", 0)) for r in grade.get("risks", []))


# ── Runs ──────────────────────────────────────────────────────────────────────


async def run_scenario(s: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    SPEND.usd = {}
    record: dict[str, Any] = {
        "scenario": s,
        "seat_model": config.SEAT_MODEL,
        "researcher_model": config.researcher_model_name(),
        "chair_model": config.CHAIR_MODEL,
        "web_search": config.WEB_SEARCH,
    }
    await SPEND.enter("baselines")
    if not args.skip_baseline:
        try:
            record["baseline"] = await ask(BASELINE_PROMPT.format(briefing=render_intake(s["intake"])))
        except Exception as e:
            record["baseline_error"] = f"{type(e).__name__}: {e}"

    await SPEND.enter("board")
    started = time.monotonic()
    state, error = await run_board(s["intake"])
    record["seconds"] = round(time.monotonic() - started)
    record["board_state"], record["board_error"] = state, error

    await SPEND.enter("baselines")
    await add_research_baseline(record, args)
    await SPEND.enter("judge")
    await add_judgement(record, args)
    await SPEND.enter("other")
    record["cost_usd"] = {phase: round(usd, 4) for phase, usd in SPEND.usd.items()}
    return record


async def add_research_baseline(record: dict[str, Any], args: argparse.Namespace) -> None:
    evidence = (record.get("board_state") or {}).get("evidence")
    if args.skip_baseline or record.get("baseline_research") or not evidence:
        return
    prompt = RESEARCH_BASELINE_PROMPT.format(
        briefing=render_intake(record["scenario"]["intake"]), evidence=render_evidence(evidence)
    )
    try:
        record["baseline_research"] = await ask(prompt)
    except Exception as e:
        record["baseline_research_error"] = f"{type(e).__name__}: {e}"


async def add_judgement(record: dict[str, Any], args: argparse.Namespace) -> None:
    if args.skip_judge or record.get("judge"):
        return
    record.pop("judge_error", None)
    answers = answers_of(record)
    if not answers:
        return
    try:
        record["judge"] = await judge(record["scenario"], answers, args.judge_model)
    except Exception as e:
        record["judge_error"] = f"{type(e).__name__}: {e}"


# ── Report ────────────────────────────────────────────────────────────────────


def cost_cell(cost: dict[str, float] | None) -> str:
    return f"${cost.get('board', 0):.2f} · ${sum(cost.values()):.2f}" if cost else "—"


def row(record: dict[str, Any], name: str) -> dict[str, str]:
    s, state = record["scenario"], record.get("board_state") or {}
    items = s["must_catch"]
    verdict = state.get("verdict")
    realist = (state.get("round2") or {}).get("realist") or {}
    grades = record.get("judge") or {}
    most = 2 * len(items)

    def judged(arm: str) -> str:
        points = risk_points(grades.get(arm))
        return "—" if points is None else f"{points}/{most}"

    def field(arm: str, key: str) -> str:
        grade = grades.get(arm)
        if not grade:
            return "—"
        value = grade.get(key)
        return str(len(value)) if isinstance(value, list) else str(value)

    errors = [e for e in (record.get("baseline_error"), record.get("board_error"),
                          record.get("baseline_research_error"), record.get("judge_error")) if e]
    control = ""
    if s.get("control") and grades:
        flagged = [ARM_TITLES[a] for a in ARMS if (grades.get(a) or {}).get("invented_blocker")]
        control = "invented blocker: " + (", ".join(flagged) if flagged else "none")
    return {
        "id": name,
        **{f"j_{arm}": judged(arm) for arm in ARMS},
        **{f"a_{arm}": field(arm, "actionable") for arm in ARMS},
        **{f"e_{arm}": field(arm, "errors") for arm in ARMS},
        "k_baseline": keyword(items, record["baseline"]) if record.get("baseline") else "—",
        "k_research": keyword(items, record["baseline_research"]) if record.get("baseline_research") else "—",
        "k_board": keyword(items, json.dumps({k: state.get(k) for k in ("evidence", "round1", "round2", "verdict")})),
        "k_verdict": keyword(items, json.dumps(verdict)) if verdict else "—",
        "decision": verdict["decision"] if verdict else "—",
        "blocks": str(sum(c["status"] == "block" for c in realist.get("checks", []))),
        "seconds": str(record.get("seconds", "—")),
        "cost": cost_cell(record.get("cost_usd")),
        "notes": "; ".join(filter(None, [control, *(e.split(":")[0] for e in errors)])),
    }


def totals(records: list[dict[str, Any]]) -> str:
    parts = []
    for arm in ARMS:
        points = [risk_points((r.get("judge") or {}).get(arm)) for r in records]
        most = [2 * len(r["scenario"]["must_catch"]) for r, p in zip(records, points) if p is not None]
        got = [p for p in points if p is not None]
        if got:
            parts.append(f"{ARM_TITLES[arm]} {sum(got)}/{sum(most)} ({100 * sum(got) / sum(most):.0f}%)")
    return " · ".join(parts)


def write_report(out_dir: Path, records: list[tuple[str, dict[str, Any]]]) -> None:
    first = records[0][1]
    judge_model = next((r["judge"]["model"] for _, r in records if r.get("judge")), "none")
    rows = [row(r, name) for name, r in records]
    header = (
        f"# Eval {out_dir.name}\n\n"
        f"Seat model `{first['seat_model']}`, researcher `{first['researcher_model']}`, chair "
        f"`{first['chair_model']}`, web search {'on' if first['web_search'] else 'off'}. "
        f"Judge `{judge_model}`.\n\n"
        "## Final answers, graded blind\n\n"
        "Three answers per scenario, shuffled and unlabeled, with fact IDs removed: **Baseline** is one plain prompt "
        "to the Chairman's model; **Baseline + research** is the same prompt given the board's own research; "
        "**Board** is the Chairman's verdict. Per planted risk: 2 = the recommendation is gated on it or changed by "
        "it, 1 = mentioned only, 0 = absent. Actionable is 1–5. Errors counts claims the judge is confident are "
        "wrong.\n\n"
        f"**Risk points:** {totals([r for _, r in records])}\n\n"
        "| Scenario | Risks: Baseline | + research | Board | Actionable B / B+R / Board | Errors B / B+R / Board "
        "| Decision | Notes |\n|---|---|---|---|---|---|---|---|\n"
    )
    judged = "".join(
        f"| {r['id']} | {r['j_baseline']} | {r['j_baseline_research']} | {r['j_board']} "
        f"| {r['a_baseline']} / {r['a_baseline_research']} / {r['a_board']} "
        f"| {r['e_baseline']} / {r['e_baseline_research']} / {r['e_board']} | {r['decision']} | {r['notes']} |\n"
        for r in rows
    )
    keyword_table = (
        "\n## Keyword check (secondary)\n\n"
        "Regex hits for each planted risk anywhere in the text. A hit can be a passing mention and a miss can be a "
        "synonym, so read the judged table first.\n\n"
        "| Scenario | Baseline | + research | Board (evidence + debate) | Verdict | Realist blocks (R2) | Seconds "
        "| Cost: board · all |\n|---|---|---|---|---|---|---|---|\n"
    ) + "".join(
        f"| {r['id']} | {r['k_baseline']} | {r['k_research']} | {r['k_board']} | {r['k_verdict']} | {r['blocks']} "
        f"| {r['seconds']} | {r['cost']} |\n"
        for r in rows
    )
    footer = (
        "\nSeconds is the board alone, in-process. Cost is what OpenRouter reported per call (`usage.cost`): the board's 12 "
        "calls, then everything in the scenario (both baselines and the judge too). Calls that report no cost are left out, "
        "so this can undercount; the key's spend counter on openrouter.ai is the real total.\n"
    )
    (out_dir / "report.md").write_text(header + judged + keyword_table + footer, encoding="utf-8")


# ── Main ──────────────────────────────────────────────────────────────────────


async def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="comma-separated scenario ids")
    parser.add_argument("--repeat", type=int, default=1, help="board runs per scenario")
    parser.add_argument("--skip-baseline", action="store_true", help="board only, no single prompts")
    parser.add_argument("--skip-judge", action="store_true")
    parser.add_argument("--judge-model", default=config.CHAIR_MODEL)
    parser.add_argument("--rejudge", type=Path,
                        help="fill in what an earlier run lacks: the research baseline and the judge's grades")
    args = parser.parse_args()

    if args.rejudge:
        records = []
        for path in sorted(args.rejudge.glob("*.json")):
            record = json.loads(path.read_text(encoding="utf-8"))
            await add_research_baseline(record, args)
            await add_judgement(record, args)
            path.write_text(json.dumps(record, indent=2), encoding="utf-8")
            records.append((path.stem, record))
            print(f"▶ {path.stem}: {row(record, path.stem)['j_board']} board", flush=True)
        write_report(args.rejudge, records)
        print(f"\nReport: {args.rejudge / 'report.md'}")
        return

    scenarios = json.loads((EVAL_DIR / "scenarios.json").read_text(encoding="utf-8"))
    if args.only:
        wanted = set(args.only.split(","))
        unknown = wanted - {s["id"] for s in scenarios}
        if unknown:
            raise SystemExit(f"Unknown scenario ids: {', '.join(sorted(unknown))}")
        scenarios = [s for s in scenarios if s["id"] in wanted]

    out_dir = EVAL_DIR / "results" / datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir.mkdir(parents=True)
    records = []
    for s in scenarios:
        for n in range(1, args.repeat + 1):
            name = s["id"] if args.repeat == 1 else f"{s['id']}-r{n}"
            print(f"▶ {name}", flush=True)
            record = await run_scenario(s, args)
            (out_dir / f"{name}.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
            records.append((name, record))
            r = row(record, name)
            print(f"  judged risks: baseline {r['j_baseline']} · + research {r['j_baseline_research']} · board "
                  f"{r['j_board']} · {r['decision']} · {r['seconds']}s · {r['cost']} {r['notes']}", flush=True)

    write_report(out_dir, records)
    print(f"\nReport: {out_dir / 'report.md'}")


if __name__ == "__main__":
    asyncio.run(main())
