"""Who sits on the board, what each seat is charged with, and how briefings are rendered."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from google.adk.agents.readonly_context import ReadonlyContext
from pydantic import BaseModel

from .schemas import RealistOpinion, SeatOpinion, ToolsOpinion, rebuttal_schema

# ── Briefing renderers ────────────────────────────────────────────────────────


def render_intake(intake: dict[str, Any]) -> str:
    p = intake.get("profile", {})
    lines = [f"Question: {intake['question']}"]
    if intake.get("leaning"):
        lines.append(f"Owner is leaning toward: {intake['leaning']}")
    fields = [
        ("Business", p.get("name")),
        ("Industry", p.get("industry")),
        ("Location", p.get("location")),
        ("Size", p.get("size")),
        ("Current tools", ", ".join(p.get("current_tools", []))),
        ("Budget", p.get("budget")),
        ("Goals", "; ".join(p.get("goals", []))),
        ("Constraints", p.get("constraints")),
    ]
    lines += [f"{label}: {value}" for label, value in fields if value]
    return "\n".join(lines)


def render_evidence(evidence: dict[str, Any]) -> str:
    lines = [f"Decision: {evidence['decision']}", "Options:"]
    lines += [f"  - {o}" for o in evidence["options"]]
    lines.append("Facts (cite by ID):")
    for i, f in enumerate(evidence["facts"], 1):
        tag = "verified" if f["verified"] else "unverified"
        src = f" — {f['source']}" if f.get("source") else ""
        lines.append(f"  F{i} [{tag}] {f['claim']}{src}")
    if evidence["open_questions"]:
        lines.append("Open questions:")
        lines += [f"  - {q}" for q in evidence["open_questions"]]
    return "\n".join(lines)


def render_round(round_no: int, opinions: dict[str, dict[str, Any]]) -> str:
    blocks = []
    for seat in SEATS:
        o = opinions[seat.id]
        lines = [
            f"### {seat.title} ({seat.id}) — {o['stance']}, confidence {o['confidence']}",
            f"Headline: {o['headline']}",
            f"Summary: {o['summary']}",
            "Points: " + " | ".join(o["key_points"]),
            "Risks: " + " | ".join(o["risks"]),
            f"Pushback: {o['pushback']}",
        ]
        for c in o.get("checks", []):
            lines.append(f"Check [{c['area']}: {c['status']}] {c['note']}")
        for t in o.get("tools", []):
            lines.append(f"Tool: {t['name']} ({t['monthly_cost']}) — {t['use']} Caveat: {t['caveat']}")
        if round_no == 2:
            if o["changed_position"]:
                lines.append(f"CHANGED POSITION because: {o['changed_because']}")
            for r in o["rebuttals"]:
                lines.append(f"Rebuts {r['target']}: \"{r['their_claim']}\" → {r['response']}")
            if o["concessions"]:
                lines.append("Concedes: " + " | ".join(o["concessions"]))
        blocks.append("\n".join(lines))
    return f"## Round {round_no}\n\n" + "\n\n".join(blocks)


# ── Seats ─────────────────────────────────────────────────────────────────────

BOARD_RULES = """\
You sit on Crucible, an advisory board for a small-business owner. The board debates; the \
Chairman recommends; the owner makes the final call.
- Write for a busy, non-technical owner: plain words, short sentences, no filler.
- Ground claims in the evidence and cite fact IDs (F1, F2…). Anything you assert that is not \
in the evidence must be marked "(unverified)".
- Unverified legal, tax, or licensing claims must name who can confirm them (attorney, \
accountant, licensing agency, or the local Small Business Development Center).
- Stay in your seat. Other seats cover the other angles."""


@dataclass(frozen=True)
class Seat:
    id: str
    title: str
    charge: Callable[[dict[str, Any]], str]
    round1_schema: type[BaseModel]
    round2_schema: type[BaseModel]


def _industry_charge(intake: dict[str, Any]) -> str:
    industry = intake.get("profile", {}).get("industry") or "small-business operations"
    return f"""\
You are the INDUSTRY EXPERT: a 20-year operator in {industry}. Judge the decision by how \
businesses like this actually run — margins, staffing, seasonality, customers, suppliers, \
local competition. Say what an experienced peer would do in the owner's shoes and why."""


def _tools_charge(_: dict[str, Any]) -> str:
    return """\
You are the AI-TOOLS EXPERT: you know the market of AI products small businesses can buy \
today. Name 0-3 real, currently sold AI tools that would help carry out or de-risk this \
decision, with realistic monthly cost and how each connects to the owner's current tools. \
Prefer month-to-month plans and free tiers. If no AI tool genuinely helps, return no tools \
and say so — never force one. Your stance is on the decision itself, not on AI."""


def _realist_charge(_: dict[str, Any]) -> str:
    return """\
You are the REALIST: you check facts and constraints. Is it legal? Is it compliant \
(licensing, labor law, privacy and data, payments, health and safety, call-recording \
consent, industry rules)? Can the owner afford it against the stated budget and cash flow? \
Does it serve the stated goals? Give each check pass, flag, or block. Use block only for a \
legal or financial problem that must be fixed before acting."""


def _strategist_charge(_: dict[str, Any]) -> str:
    return """\
You are the STRATEGIST: you think three moves ahead. Trace what this decision commits the \
owner to next week, next quarter, and next year; what it unlocks and what it closes off; \
lock-in and the cost of reversing it; how customers, staff, and competitors react. Name the \
move that should follow this one."""


def _devils_advocate_charge(_: dict[str, Any]) -> str:
    return """\
You are the DEVIL'S ADVOCATE: you argue against the leading course of action — the owner's \
leaning in Round 1, the board's emerging consensus in Round 2 — as hard as honesty allows. \
Make the best case for the alternative, tell the most likely story of how this fails, and \
state what must be true for it to work. Attack assumptions, never invent facts. Your stance \
is normally "oppose"; use "conditional" only if the opposing case is truly weak."""


def _seat(id: str, title: str, charge: Callable[[dict[str, Any]], str], opinion: type[BaseModel]) -> Seat:
    return Seat(id, title, charge, opinion, rebuttal_schema(opinion, id))


SEATS: tuple[Seat, ...] = (
    _seat("industry_expert", "Industry Expert", _industry_charge, SeatOpinion),
    _seat("ai_tools_expert", "AI-Tools Expert", _tools_charge, ToolsOpinion),
    _seat("realist", "Realist", _realist_charge, RealistOpinion),
    _seat("strategist", "Strategist", _strategist_charge, SeatOpinion),
    _seat("devils_advocate", "Devil's Advocate", _devils_advocate_charge, SeatOpinion),
)

ROUND1_PROMPT = """\
ROUND 1 — give your independent opinion. You have not seen the other seats yet."""

ROUND2_PROMPT = """\
ROUND 2 — rebuttal. Below is every seat's Round 1 position. Respond to other seats by name. \
Change your stance only if a specific argument persuades you, and name it in changed_because. \
Do not drift toward agreement for its own sake. Return your full updated opinion.

{transcript}"""


def seat_instruction(seat: Seat) -> Callable[[ReadonlyContext], str]:
    def provider(ctx: ReadonlyContext) -> str:
        intake = ctx.state["intake"]
        return (
            f"{BOARD_RULES}\n\n{seat.charge(intake)}\n\n"
            f"OWNER BRIEFING\n{render_intake(intake)}\n\n"
            f"EVIDENCE\n{render_evidence(ctx.state['evidence'])}"
        )

    return provider


# ── Researcher and Chairman ───────────────────────────────────────────────────


def researcher_instruction(web_search: bool) -> Callable[[ReadonlyContext], str]:
    sourcing = (
        "Use Google Search to verify each fact; set verified=true and give the URL only for "
        "facts a search result supports."
        if web_search
        else "You have no web access in this session: draw on general knowledge, set "
        "verified=false and leave source empty on every fact, and prefer well-established facts."
    )

    def provider(ctx: ReadonlyContext) -> str:
        return f"""\
You are the board's RESEARCHER. Before the board debates, assemble the shared evidence \
every seat will argue from. Cover: the realistic options; costs and price ranges; laws, \
licensing and compliance rules that apply in the owner's location and industry — check \
state and local rules separately, since they are often stricter than federal ones; relevant \
AI tools on the market; and industry benchmarks. Do not restate the owner briefing as facts; \
the board already has it. Be neutral — do not recommend. {sourcing}

OWNER BRIEFING
{render_intake(ctx.state["intake"])}"""

    return provider


def chairman_instruction(ctx: ReadonlyContext) -> str:
    intake = ctx.state["intake"]
    return f"""\
{BOARD_RULES}

You are the CHAIRMAN. You do not argue; you weigh the board's arguments and recommend.
- Weigh arguments, not headcount. Prefer points that survived Round 2 and cite fact IDs.
- A Realist "block" that no seat credibly answered rules out "proceed" unless your \
conditions remove it.
- decision: proceed (do it), pilot (small, reversible test first), defer (get named \
information first), or reject.
- Record the strongest surviving dissent honestly.
- Next steps must be things this owner can actually do, starting this week.
- Carry forward only the AI tools you endorse from the AI-Tools Expert.
- Escalate to a human professional when legal, tax, or financing stakes exist. For general \
business help, point to the local Small Business Development Center (free, confidential, \
SBA-funded; in Maryland, the Maryland SBDC).

OWNER BRIEFING
{render_intake(intake)}

EVIDENCE
{render_evidence(ctx.state["evidence"])}"""
