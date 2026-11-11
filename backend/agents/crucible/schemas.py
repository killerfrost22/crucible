"""Data contracts for the board: intake in, seat opinions between rounds, verdict out.

The frontend mirrors these shapes in `frontend/src/types.ts`; change both together.
"""

from __future__ import annotations

from typing import Literal, get_args

from pydantic import BaseModel, Field, create_model

SeatId = Literal[
    "industry_expert",
    "ai_tools_expert",
    "realist",
    "strategist",
    "devils_advocate",
]
Stance = Literal["support", "oppose", "conditional"]


# ── Intake ────────────────────────────────────────────────────────────────────


class BusinessProfile(BaseModel):
    name: str = ""
    industry: str = ""
    location: str = ""
    size: str = ""
    current_tools: list[str] = Field(default_factory=list)
    budget: str = ""
    goals: list[str] = Field(default_factory=list)
    constraints: str = ""


class Intake(BaseModel):
    question: str = Field(min_length=3)
    leaning: str = ""
    profile: BusinessProfile = Field(default_factory=BusinessProfile)


# ── Researcher ────────────────────────────────────────────────────────────────


class Fact(BaseModel):
    claim: str = Field(description="One checkable statement relevant to the decision.")
    source: str = Field(
        default="",
        description="URL or named publication backing the claim; empty if from general knowledge.",
    )
    verified: bool = Field(
        description="True only when the claim is backed by a web search result in this session."
    )


class Evidence(BaseModel):
    decision: str = Field(description="The decision restated in one neutral sentence.")
    options: list[str] = Field(
        description="2-4 realistic courses of action, always including doing nothing."
    )
    facts: list[Fact] = Field(description="6-12 facts the board needs, most decision-relevant first.")
    open_questions: list[str] = Field(
        description="Facts the board cannot know that would change the answer."
    )


# ── Seats ─────────────────────────────────────────────────────────────────────


class SeatOpinion(BaseModel):
    # Field order is the order the model writes. Keep a non-string last: when `pushback` closed the object,
    # Haiku often left the object's closing brace (or a made-up key) inside the string, e.g. "...enough.}".
    stance: Stance = Field(description="Your position on the owner's leaning, or on the decision if none.")
    headline: str = Field(description="Your position in at most 12 words; it is pinned to the board.")
    summary: str = Field(description="At most 60 words, plain language, for a non-technical owner.")
    key_points: list[str] = Field(description="At most 3 points, each citing fact IDs like F2 when used.")
    risks: list[str] = Field(description="At most 3 concrete risks.")
    pushback: str = Field(description="The single assumption you most want the owner to question.")
    confidence: int = Field(description="0-100: how sure you are of your stance.")


class Check(BaseModel):
    area: Literal["legal", "compliance", "financial", "goals", "operational"]
    status: Literal["pass", "flag", "block"]
    note: str = Field(description="One sentence; cite fact IDs, or say 'unverified' and who can confirm.")


class RealistOpinion(SeatOpinion):
    checks: list[Check] = Field(description="3-6 checks covering legal, compliance, money and goals.")


class ToolPick(BaseModel):
    name: str = Field(description="Real, currently sold product name.")
    use: str = Field(description="What it would do for this decision, in one sentence.")
    monthly_cost: str = Field(
        description="The price as the cited fact states it when price_fact is set; otherwise your own "
        "realistic range, e.g. '$0-49/mo', or 'unknown'."
    )
    works_with: str = Field(description="How it connects to the owner's current tools, or 'standalone'.")
    caveat: str = Field(description="The main limitation or risk of this tool.")
    url: str = Field(
        default="",
        description="The product's official site or pricing page; empty if unsure. Never invent a URL.",
    )
    price_fact: str = Field(
        default="",
        description="ID of the fact whose source states this price, e.g. 'F4'; empty when the price is "
        "your own estimate.",
    )
    pilot_test: str = Field(
        default="",
        description="One measurable result that decides keep-or-stop, and when to decide, e.g. 'Keep it "
        "if after-hours bookings rise by 5 in 4 weeks; cancel before the second invoice otherwise'.",
    )


class ToolsOpinion(SeatOpinion):
    tools: list[ToolPick] = Field(description="0-3 tools; empty if no AI tool genuinely helps.")


class Rebuttal(BaseModel):
    target: SeatId
    their_claim: str = Field(description="Their claim, paraphrased in one sentence.")
    response: str = Field(description="Your response in at most 40 words.")


class DebateMoves(BaseModel):
    changed_position: bool
    changed_because: str = Field(
        description="The specific argument (seat + point) that moved you; empty if unchanged."
    )
    rebuttals: list[Rebuttal] = Field(description="1-3 responses to other seats by name.")
    concessions: list[str] = Field(description="Points from other seats you now accept; may be empty.")


def rebuttal_schema(opinion: type[BaseModel], seat_id: str) -> type[BaseModel]:
    """Round-2 schema for one seat: its updated opinion plus rebuttals aimed only at other seats."""
    others = tuple(s for s in get_args(SeatId) if s != seat_id)
    rebuttal = create_model(f"Rebuttal_{seat_id}", __base__=Rebuttal, target=(Literal[others], ...))
    return create_model(
        f"{opinion.__name__}_{seat_id}_r2",
        __base__=(opinion, DebateMoves),
        rebuttals=(list[rebuttal], Field(description="1-3 responses to other seats by name.")),
    )


# ── Chairman ──────────────────────────────────────────────────────────────────


class SeatPoint(BaseModel):
    seat: SeatId
    point: str


class Step(BaseModel):
    when: Literal["this week", "next 30 days", "next 90 days"]
    action: str


class Verdict(BaseModel):
    decision: Literal["proceed", "pilot", "defer", "reject"]
    headline: str = Field(description="The recommendation in at most 15 words.")
    confidence: int = Field(description="0-100: your own estimate of how likely this recommendation is right.")
    rationale: str = Field(description="At most 100 words, plain language.")
    decisive_arguments: list[SeatPoint] = Field(description="2-4 arguments that carried the decision.")
    dissent: list[SeatPoint] = Field(description="Strongest surviving objections; empty only if none.")
    conditions: list[str] = Field(description="Conditions that must hold for this recommendation to stand.")
    next_steps: list[Step] = Field(description="3-6 concrete actions the owner can take.")
    ai_tools: list[ToolPick] = Field(description="AI tools the board endorses; empty if none.")
    escalate_to: Literal["none", "attorney", "accountant", "sbdc_advisor", "regulator"]
    escalation_reason: str = Field(description="Why a human professional is needed; empty if none.")
    would_change: list[str] = Field(
        default_factory=list,
        description="1-3 specific findings that would change this recommendation.",
    )
    no_new_tool: str = Field(
        default="",
        description="What the owner could do instead of a new AI tool, with the tools they already have "
        "or by hand, and what that costs; empty if no AI tool is in play.",
    )
