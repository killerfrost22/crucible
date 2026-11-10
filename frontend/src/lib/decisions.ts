import { SEAT_IDS, type Decision, type Intake, type Ratification, type Verdict } from '../types'
import { initialBoard, reduceBoard, type BoardState, type Phase } from './board'
import type { StoredSession } from './api'

const DECISIONS = ['proceed', 'pilot', 'defer', 'reject'] as const
const REPLAY_CALL_PREFIX = 'crucible.replayCall.'

export interface DecisionSummary {
  id: string
  /** Unix milliseconds; 0 when the server omitted a time. */
  updatedAt: number
  question: string
  business: string
  decision: Decision | null
  headline: string
  call: Ratification['action'] | null
  finished: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDecision(value: unknown): value is Decision {
  return typeof value === 'string' && (DECISIONS as readonly string[]).includes(value)
}

/** Intake as the workflow stores it. Partial or foreign objects are not listed. */
function isIntake(value: unknown): value is Intake {
  if (!isRecord(value) || typeof value.question !== 'string') return false
  const profile = value.profile
  if (!isRecord(profile)) return false
  return (
    typeof profile.name === 'string' &&
    typeof profile.industry === 'string' &&
    typeof profile.location === 'string' &&
    typeof profile.size === 'string' &&
    Array.isArray(profile.current_tools) &&
    typeof profile.budget === 'string' &&
    Array.isArray(profile.goals) &&
    typeof profile.constraints === 'string' &&
    (value.leaning === undefined || typeof value.leaning === 'string')
  )
}

function isVerdict(value: unknown): value is Verdict {
  return isRecord(value) && isDecision(value.decision) && typeof value.headline === 'string'
}

export function parseRatification(value: unknown): Ratification | null {
  if (!isRecord(value)) return null
  if (value.action !== 'accept' && value.action !== 'override') return null
  if (typeof value.note !== 'string' || typeof value.at !== 'string') return null
  return { action: value.action, note: value.note, at: value.at }
}

/** A session becomes a decision once the intake node has written a question. */
export function summarizeSession(session: StoredSession): DecisionSummary | null {
  const intake = session.state.intake
  if (!isIntake(intake)) return null
  const question = intake.question.trim()
  if (!question) return null
  const verdict = isVerdict(session.state.verdict) ? session.state.verdict : null
  const call = parseRatification(session.state.ratification)
  return {
    id: session.id,
    updatedAt: session.lastUpdateTime > 0 ? session.lastUpdateTime * 1000 : 0,
    question,
    business: intake.profile.name.trim(),
    decision: verdict?.decision ?? null,
    headline: verdict?.headline.trim() ?? '',
    call: call?.action ?? null,
    finished: Boolean(verdict),
  }
}

export function sortDecisions(items: DecisionSummary[]): DecisionSummary[] {
  return [...items].sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id))
}

/**
 * Where a restored meeting sits. Saved state has no node names, so the phase is inferred from
 * which keys the workflow managed to write before the run stopped.
 */
export function phaseFromBoard(board: BoardState): Phase {
  if (board.verdict) return 'ratify'
  const round2 = Object.keys(board.round2).length
  const round1 = Object.keys(board.round1).length
  if (round2 > 0) return round2 >= SEAT_IDS.length ? 'chairman' : 'rebuttals'
  if (round1 > 0) return round1 >= SEAT_IDS.length ? 'rebuttals' : 'round1'
  if (board.evidence) return 'round1'
  if (board.intake) return 'researching'
  return 'waiting'
}

function usableIntake(value: Intake | null): Intake | null {
  if (!value || typeof value.question !== 'string' || !value.question.trim()) return null
  const profile = value.profile
  if (!profile || !Array.isArray(profile.current_tools) || !Array.isArray(profile.goals)) return null
  return value
}

function usableVerdict(value: Verdict | null): Verdict | null {
  if (!value || typeof value.confidence !== 'number' || typeof value.rationale !== 'string') return null
  if (typeof value.escalation_reason !== 'string' || typeof value.escalate_to !== 'string') return null
  if (
    !Array.isArray(value.decisive_arguments) ||
    !Array.isArray(value.dissent) ||
    !Array.isArray(value.conditions) ||
    !Array.isArray(value.next_steps) ||
    !Array.isArray(value.ai_tools)
  ) {
    return null
  }
  return value
}

function usableRound<T>(round: Partial<Record<string, T>>): Partial<Record<string, T>> {
  const out: Partial<Record<string, T>> = {}
  for (const [id, opinion] of Object.entries(round)) {
    if (!isRecord(opinion)) continue
    if (typeof opinion.headline !== 'string' || typeof opinion.summary !== 'string') continue
    if (!Array.isArray(opinion.key_points) || !Array.isArray(opinion.risks) || typeof opinion.confidence !== 'number') continue
    const debated = 'rebuttals' in opinion || 'concessions' in opinion || 'changed_position' in opinion
    if (debated && (!Array.isArray(opinion.rebuttals) || !Array.isArray(opinion.concessions))) continue
    if ('tools' in opinion && !Array.isArray(opinion.tools)) continue
    if ('checks' in opinion && !Array.isArray(opinion.checks)) continue
    out[id] = opinion
  }
  return out
}

/** Rebuild the meeting from session state. Does not replay events and does not call a model. */
export function boardFromSessionState(state: Record<string, unknown>): BoardState {
  const reduced = reduceBoard(initialBoard, { actions: { stateDelta: state } })
  const board: BoardState = {
    ...reduced,
    intake: usableIntake(reduced.intake),
    verdict: usableVerdict(reduced.verdict),
    round1: usableRound(reduced.round1),
    round2: usableRound(reduced.round2),
    errors: [],
  }
  if (board.evidence && !Array.isArray(board.evidence.facts)) board.evidence = null
  return { ...board, phase: phaseFromBoard(board) }
}

/** Practice signature for a recorded meeting. Live decisions are stored on the session, not here. */
export function readReplayCall(name: string): Ratification | null {
  try {
    const raw = localStorage.getItem(REPLAY_CALL_PREFIX + name)
    if (!raw) return null
    return parseRatification(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export function writeReplayCall(name: string, ratification: Ratification): void {
  try {
    localStorage.setItem(REPLAY_CALL_PREFIX + name, JSON.stringify(ratification))
  } catch {
    // Private mode or a full disk: the signature still shows until this page closes.
  }
}
