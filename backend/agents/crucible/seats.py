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
    any_broken = False
    for i, f in enumerate(evidence["facts"], 1):
        tag = "verified" if f["verified"] else "unverified"
        src = f" — {f['source']}" if f.get("source") else ""
        broken = (f.get("check") or {}).get("status") == "broken"
        any_broken |= broken
        lines.append(f"  F{i} [{tag}] {f['claim']}{src}{' (link broken)' if broken else ''}")
    if any_broken:
        lines.append("A fact marked (link broken) cites a page that no longer exists; treat it as unverified.")
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
            price = f"{t['monthly_cost']}, per {t['price_fact']}" if t.get("price_fact") else t["monthly_cost"]
            line = f"Tool: {t['name']} ({price}) — {t['use']} Caveat: {t['caveat']}"
            if t.get("pilot_test"):
                line += f" Pilot test: {t['pilot_test']}"
            if t.get("url"):
                line += f" Site: {t['url']}"
            lines.append(line)
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
- Ground claims in the evidence. Cite a fact ID (F1, F2…) only for what that fact itself \
says; your own reasoning gets no fact ID. Anything you assert that is not in the evidence \
must be marked "(unverified)".
- When a fact has a limit (another industry, state or business size, or a vendor's own \
claim), keep that limit in the sentence that cites it.
- Say the law requires something only when a fact states it as law where the owner \
operates. A penalty against another company is an example, a firm's checklist is \
recommended practice, and "may need to" is not "must".
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
and say so — never force one. Software without AI, or a tool the owner already has, is not \
an AI tool: say so in your summary instead of listing it. Your stance is on the decision \
itself, not on AI.
For each tool:
- url: the product's official site or pricing page, only if you are sure of it; otherwise \
leave it empty. Never invent a URL.
- price_fact: the fact ID (e.g. F4) only when that fact states this tool's price, with \
monthly_cost as the fact states it. Otherwise leave price_fact empty and give monthly_cost \
as a range.
- pilot_test: always give one measurable result that decides keep-or-stop, and when to \
decide, e.g. "Keep it if after-hours bookings rise by 5 in 4 weeks; cancel before the \
second invoice otherwise"."""


def _realist_charge(_: dict[str, Any]) -> str:
    return """\
You are the REALIST: you check facts and constraints. Is it legal? Is it compliant \
(licensing, labor law, privacy and data, payments, health and safety, call-recording \
consent, industry rules)? Can the owner afford it against the stated budget and cash flow? \
Does it serve the stated goals? Give each check pass, flag, or block. Pass when the evidence \
shows no problem or nothing suggests one; flag an open question that could change the \
decision; block only a confirmed legal or financial problem that must be fixed before acting. \
Never mark a check pass while saying it still needs someone to confirm it."""


def _strategist_charge(_: dict[str, Any]) -> str:
    return """\
You are the STRATEGIST: you think three moves ahead. Trace what this decision commits the \
owner to next week, next quarter, and next year; what it unlocks and what it closes off; \
lock-in and the cost of reversing it; how customers, staff, and competitors react. Lead with \
the 6-12 month consequence; the immediate risks belong to other seats. Name the move that \
should follow this one."""


def _devils_advocate_charge(_: dict[str, Any]) -> str:
    return """\
You are the DEVIL'S ADVOCATE: you argue against whatever the rest of the board is most \
likely to agree on, as hard as honesty allows, so the owner hears the best case for the road \
not taken.
- Round 1 (you can't see the other seats yet): if the owner's leaning carries risks any \
careful advisor would raise, expect the board to oppose or hedge it, and argue FOR it \
instead: the safest workable version of the leaning, what waiting or saying no costs, and \
the facts that favor it. Otherwise argue against the leaning: the best alternative, and the \
most likely story of how the leaning fails.
- Round 2: argue against the consensus you see in Round 1.
State what must be true for your side to win. Attack assumptions, never invent facts, and \
never argue for breaking a law; if the leaning can't be done legally, argue for the closest \
version that can. Your stance is your position on the owner's leaning: "support" or \
"conditional" when you argue for it, "oppose" when you argue against it."""


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
Change your stance only if a specific argument persuades you; in changed_because, name the \
seat and restate what that seat actually wrote. Do not drift toward agreement for its own \
sake. Return your full updated opinion.

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
        "Web search results are available to you. Set verified=true and give the result's URL "
        "only for facts a search result supports; facts from general knowledge get verified=false "
        "and an empty source. Put URLs only in `source`: the claim is plain text with no links or "
        "citation markup. Take software prices from the vendor's own pricing page and cite that "
        "page's URL."
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
AI tools on the market; and industry benchmarks. When the decision may involve buying software \
or an AI tool, include current pricing for the leading options as facts, one per product: \
the product, its plan and its monthly price. Do not restate the owner briefing as facts; \
the board already has it. Be neutral — do not recommend, and report what a source shows, not \
what it advises. For a law, state what the enacted text says: a bill that was amended or \
didn't pass is not law. {sourcing}

OWNER BRIEFING
{render_intake(ctx.state["intake"])}"""

    return provider


def chairman_instruction(ctx: ReadonlyContext) -> str:
    intake = ctx.state["intake"]
    return f"""\
{BOARD_RULES}

You are the CHAIRMAN. You do not argue; you weigh the board's arguments and recommend.
- Weigh arguments, not headcount. Prefer points that survived Round 2 and cite fact IDs. Don't \
promote a seat's unsourced market or seasonal claim into decisive_arguments, and don't assume \
details the briefing doesn't give, such as a plan tier or a volume.
- Credit each decisive argument and dissent to the seat that made it, in that seat's own \
claims; never add words to a seat. Say "the board agrees" only if no seat dissents.
- A Realist "block" that no seat credibly answered rules out "proceed" unless your \
conditions remove it.
- A legal or compliance requirement that a fact says applies here must be a condition or a \
next step, with its reason, not only part of escalation_reason. An unverified or unlikely \
legal question is not a condition: list it as a check in next_steps, or leave it out.
- decision: proceed (do it), pilot (small, reversible test first), defer (get named \
information first), or reject.
- Record the strongest surviving dissent honestly.
- When comparing costs, give each option in the same unit, e.g. APR and total dollars.
- Next steps must be things this owner can actually do, starting this week.
- Carry forward only the AI tools you endorse from the AI-Tools Expert, keeping their url \
and price_fact exactly as the expert gave them (never add a URL or fact ID of your own). Give \
each endorsed tool a pilot_test fitted to your recommendation.
- Escalate to a human professional when legal, tax, or financing stakes exist. For general \
business help, point to the local Small Business Development Center (free, confidential, \
SBA-funded; in Maryland, the Maryland SBDC).

OWNER BRIEFING
{render_intake(intake)}

EVIDENCE
{render_evidence(ctx.state["evidence"])}"""
