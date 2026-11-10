// Mirrors backend/agents/crucible/schemas.py. Field names stay snake_case, exactly as in Python;
// change both files together.

export const SEAT_IDS = [
  'industry_expert',
  'ai_tools_expert',
  'realist',
  'strategist',
  'devils_advocate',
] as const

export type SeatId = (typeof SEAT_IDS)[number]
export type Stance = 'support' | 'oppose' | 'conditional'

// ── Intake ──────────────────────────────────────────────────────────────────

export interface BusinessProfile {
  name: string
  industry: string
  location: string
  size: string
  current_tools: string[]
  budget: string
  goals: string[]
  constraints: string
}

export interface Intake {
  question: string
  leaning: string
  profile: BusinessProfile
}

// ── Researcher ──────────────────────────────────────────────────────────────

/** Written by the backend's `check_sources` node: did the source page open when Crucible tried it? */
export interface SourceCheck {
  status: 'ok' | 'broken' | 'unreachable'
  /** UTC ISO-8601. */
  checked_at: string
  http_status: number | null
}

export interface Fact {
  claim: string
  source: string
  verified: boolean
  /** Only on facts with an http(s) source, in meetings recorded since the link check existed. */
  check?: SourceCheck
}

export interface Evidence {
  decision: string
  options: string[]
  facts: Fact[]
  open_questions: string[]
}

export type EvidenceMode = 'web' | 'model_knowledge'

// ── Seats ───────────────────────────────────────────────────────────────────

export interface SeatOpinion {
  stance: Stance
  headline: string
  summary: string
  key_points: string[]
  risks: string[]
  confidence: number
  pushback: string
}

export type CheckArea = 'legal' | 'compliance' | 'financial' | 'goals' | 'operational'
export type CheckStatus = 'pass' | 'flag' | 'block'

export interface Check {
  area: CheckArea
  status: CheckStatus
  note: string
}

export interface RealistOpinion extends SeatOpinion {
  checks: Check[]
}

export interface ToolPick {
  name: string
  use: string
  monthly_cost: string
  works_with: string
  caveat: string
  // Absent in meetings recorded before Nov 10.
  /** Official site or pricing page; empty when the model wasn't sure. */
  url?: string
  /** Fact ID ("F4") whose source states the price; empty when the price is the model's own estimate. */
  price_fact?: string
  /** The measurable result that decides keep-or-stop, and when. */
  pilot_test?: string
}

export interface ToolsOpinion extends SeatOpinion {
  tools: ToolPick[]
}

export interface Rebuttal {
  target: SeatId
  their_claim: string
  response: string
}

export interface DebateMoves {
  changed_position: boolean
  changed_because: string
  rebuttals: Rebuttal[]
  concessions: string[]
}

export interface SeatRebuttal extends SeatOpinion, DebateMoves {}
export interface RealistRebuttal extends RealistOpinion, DebateMoves {}
export interface ToolsRebuttal extends ToolsOpinion, DebateMoves {}

/** Any Round 1 output; realist adds `checks`, ai_tools_expert adds `tools`. */
export type Round1Opinion = SeatOpinion & Partial<Pick<RealistOpinion, 'checks'>> & Partial<Pick<ToolsOpinion, 'tools'>>
/** Any Round 2 output: the seat's updated opinion plus its debate moves. */
export type Round2Opinion = Round1Opinion & DebateMoves

// ── Chairman ────────────────────────────────────────────────────────────────

export interface SeatPoint {
  seat: SeatId
  point: string
}

export type StepWhen = 'this week' | 'next 30 days' | 'next 90 days'

export interface Step {
  when: StepWhen
  action: string
}

export type Decision = 'proceed' | 'pilot' | 'defer' | 'reject'
export type EscalateTo = 'none' | 'attorney' | 'accountant' | 'sbdc_advisor' | 'regulator'

export interface Verdict {
  decision: Decision
  headline: string
  /** The Chairman's own estimate, 0-100; not a measured probability. */
  confidence: number
  rationale: string
  decisive_arguments: SeatPoint[]
  dissent: SeatPoint[]
  conditions: string[]
  next_steps: Step[]
  ai_tools: ToolPick[]
  escalate_to: EscalateTo
  escalation_reason: string
  // Absent in meetings recorded before Nov 10.
  /** Findings that would change the recommendation. */
  would_change?: string[]
  /** What the owner could do with the tools they already have, instead of a new AI tool. */
  no_new_tool?: string
}

// ── Owner ratification (session stateDelta written by PATCH) ───────────────

export interface Ratification {
  action: 'accept' | 'override'
  note: string
  at: string
}

// ── Saved decisions (GET /apps/crucible/users/{user}/decisions, served by backend/guard.py) ─

export interface DecisionSummary {
  id: string
  /** UTC ISO-8601. */
  updated_at: string
  question: string
  decision: Decision | null
  headline: string | null
  signed: Ratification['action'] | null
  /** The Chairman delivered a verdict. */
  finished: boolean
}

// ── ADK event envelope (camelCase) ──────────────────────────────────────────

export interface AdkEvent {
  author?: string
  nodeInfo?: { path?: string }
  output?: unknown
  actions?: { stateDelta?: Record<string, unknown> }
  errorCode?: string
  errorMessage?: string
  /** Final event emitted by /run_sse when the run raises. */
  error?: string
  timestamp?: number
}
