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

export interface Fact {
  claim: string
  source: string
  verified: boolean
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
  confidence: number
  rationale: string
  decisive_arguments: SeatPoint[]
  dissent: SeatPoint[]
  conditions: string[]
  next_steps: Step[]
  ai_tools: ToolPick[]
  escalate_to: EscalateTo
  escalation_reason: string
}

// ── Owner ratification (session stateDelta written by PATCH) ───────────────

export interface Ratification {
  action: 'accept' | 'override'
  note: string
  at: string
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
