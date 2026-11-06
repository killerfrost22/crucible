"""The board as an ADK graph workflow.

START → intake → researcher → convene → 5 seats (Round 1) → round1 join → open_rebuttal
      → 5 seats (Round 2) → round2 join → close_debate → chairman

Session state written along the way (read by the frontend from each event's stateDelta):
  intake, evidence_mode, evidence, round1, round2, verdict; the owner later adds ratification.
"""

from __future__ import annotations

import json
from typing import Any

from google.adk import Event
from google.adk.agents import LlmAgent
from google.adk.tools import google_search
from google.adk.workflow import JoinNode, Workflow
from google.genai import types
from pydantic import ValidationError

from . import config
from .schemas import Evidence, Intake, Verdict
from .seats import (
    ROUND1_PROMPT,
    ROUND2_PROMPT,
    SEATS,
    Seat,
    chairman_instruction,
    render_round,
    researcher_instruction,
    seat_instruction,
)


def _message_text(node_input: Any) -> str:
    if isinstance(node_input, types.Content):
        return "".join(p.text or "" for p in node_input.parts or [])
    return str(node_input)


def intake(ctx, node_input: Any) -> Event:
    """Accepts an Intake JSON object (the app) or a bare question (ADK dev UI)."""
    text = _message_text(node_input).strip()
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        payload = {"question": text}
    try:
        parsed = Intake.model_validate(payload)
    except ValidationError as e:
        raise ValueError(f"Invalid intake: {e}") from e
    ctx.state["intake"] = parsed.model_dump()
    ctx.state["evidence_mode"] = "web" if config.WEB_SEARCH else "model_knowledge"
    return Event(output="Assemble the shared evidence for this decision.")


def convene(node_input: Any) -> Event:
    return Event(output=ROUND1_PROMPT)


def open_rebuttal(ctx, node_input: dict[str, Any]) -> Event:
    round1 = {seat.id: node_input[f"{seat.id}_r1"] for seat in SEATS}
    ctx.state["round1"] = round1
    return Event(output=ROUND2_PROMPT.format(transcript=render_round(1, round1)))


def close_debate(ctx, node_input: dict[str, Any]) -> Event:
    round2 = {seat.id: node_input[f"{seat.id}_r2"] for seat in SEATS}
    ctx.state["round2"] = round2
    transcript = render_round(1, ctx.state["round1"]) + "\n\n" + render_round(2, round2)
    return Event(output=f"The full debate follows. Deliver your verdict.\n\n{transcript}")


def _seat_agent(seat: Seat, round_no: int) -> LlmAgent:
    return LlmAgent(
        name=f"{seat.id}_r{round_no}",
        description=f"{seat.title}, round {round_no}",
        model=config.model(config.SEAT_MODEL),
        instruction=seat_instruction(seat),
        include_contents="none",
        output_schema=seat.round1_schema if round_no == 1 else seat.round2_schema,
    )


researcher = LlmAgent(
    name="researcher",
    description="Assembles the evidence every seat argues from.",
    model=config.model(config.SEAT_MODEL),
    instruction=researcher_instruction(config.WEB_SEARCH),
    tools=[google_search] if config.WEB_SEARCH else [],
    include_contents="none",
    output_schema=Evidence,
    output_key="evidence",
)

chairman = LlmAgent(
    name="chairman",
    description="Weighs the debate and recommends a decision.",
    model=config.model(config.CHAIR_MODEL),
    instruction=chairman_instruction,
    include_contents="none",
    output_schema=Verdict,
    output_key="verdict",
)

root_agent = Workflow(
    name="crucible",
    edges=[
        (
            "START",
            intake,
            researcher,
            convene,
            tuple(_seat_agent(s, 1) for s in SEATS),
            JoinNode(name="round1"),
            open_rebuttal,
            tuple(_seat_agent(s, 2) for s in SEATS),
            JoinNode(name="round2"),
            close_debate,
            chairman,
        )
    ],
)
