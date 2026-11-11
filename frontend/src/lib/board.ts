import {
  SEAT_IDS,
  type AdkEvent,
  type Evidence,
  type EvidenceMode,
  type Intake,
  type Round1Opinion,
  type Round2Opinion,
  type SeatId,
  type Verdict,
} from '../types'
import { CLIENT_INVALID } from './errors'
import { checkEvidence, checkIntake, checkRound1, checkRound2, checkVerdict, isObject } from './validate'

/** What the owner is waiting on. Inferred from node names; the backend sends no "started" events. */
export type Phase = 'waiting' | 'researching' | 'round1' | 'rebuttals' | 'chairman' | 'ratify'

export const PHASE_ORDER: Phase[] = ['waiting', 'researching', 'round1', 'rebuttals', 'chairman', 'ratify']

export interface BoardError {
  node: string | null
  code: string | null
  message: string
}

export interface BoardState {
  phase: Phase
  intake: Intake | null
  evidenceMode: EvidenceMode | null
  evidence: Evidence | null
  round1: Partial<Record<SeatId, Round1Opinion>>
  round2: Partial<Record<SeatId, Round2Opinion>>
  verdict: Verdict | null
  errors: BoardError[]
}

export const initialBoard: BoardState = {
  phase: 'waiting',
  intake: null,
  evidenceMode: null,
  evidence: null,
  round1: {},
  round2: {},
  verdict: null,
  errors: [],
}

/** `crucible@1/realist_r1@1` → `realist_r1`. */
export function nodeName(event: AdkEvent): string | null {
  const path = event.nodeInfo?.path
  if (path) return path.split('/').pop()!.replace(/@\d+$/, '')
  return event.author ?? null
}

const isSeat = (value: string): value is SeatId => (SEAT_IDS as readonly string[]).includes(value)

function seatRound(node: string): { seat: SeatId; round: 1 | 2 } | null {
  const match = /^(.+)_r([12])$/.exec(node)
  if (!match || !isSeat(match[1])) return null
  return { seat: match[1], round: match[2] === '1' ? 1 : 2 }
}

function impliedPhase(node: string): Phase | null {
  if (node === 'intake' || node === 'researcher' || node === 'check_sources') return 'researching'
  if (node === 'convene') return 'round1'
  if (node === 'round1' || node === 'open_rebuttal') return 'rebuttals'
  if (node === 'round2' || node === 'close_debate') return 'chairman'
  if (node === 'chairman') return 'ratify'
  const seat = seatRound(node)
  if (seat) return seat.round === 1 ? 'round1' : 'rebuttals'
  return null
}

const invalid = (node: string | null, at: string): BoardError => ({
  node,
  code: CLIENT_INVALID,
  message: `Unreadable answer: ${at} doesn't match what Crucible expects.`,
})

function addError(errors: BoardError[], error: BoardError): BoardError[] {
  return errors.some((e) => e.message === error.message && e.node === error.node) ? errors : [...errors, error]
}

/** One seat's answer for a round, checked; a misfit is reported and left out. */
function takeSeat(next: BoardState, seat: SeatId, round: 1 | 2, value: unknown, node: string | null) {
  const checked = round === 1 ? checkRound1(value) : checkRound2(value)
  if (!checked.ok) next.errors = addError(next.errors, invalid(node, `${seat} ${checked.at}`))
  else if (round === 1) next.round1 = { ...next.round1, [seat]: checked.value }
  else next.round2 = { ...next.round2, [seat]: checked.value }
}

/**
 * Session state keys (agent.py) onto the board, each checked. A key that doesn't fit is reported, and the board
 * keeps what it had for it: no defaults are invented to keep the page rendering.
 */
function applyState(next: BoardState, state: Record<string, unknown>, node: string | null) {
  if (state.intake !== undefined) {
    const checked = checkIntake(state.intake)
    if (checked.ok) next.intake = checked.value
    else next.errors = addError(next.errors, invalid(node, checked.at))
  }
  if (state.evidence_mode === 'web' || state.evidence_mode === 'model_knowledge') next.evidenceMode = state.evidence_mode
  if (state.evidence !== undefined) {
    const checked = checkEvidence(state.evidence)
    if (checked.ok) next.evidence = checked.value
    else next.errors = addError(next.errors, invalid(node, checked.at))
  }
  for (const [key, round] of [
    ['round1', 1],
    ['round2', 2],
  ] as const) {
    const seats = state[key]
    if (seats === undefined) continue
    if (!isObject(seats)) next.errors = addError(next.errors, invalid(node, key))
    else for (const [id, value] of Object.entries(seats)) if (isSeat(id)) takeSeat(next, id, round, value, node)
  }
  if (state.verdict !== undefined) {
    const checked = checkVerdict(state.verdict)
    if (checked.ok) next.verdict = checked.value
    else next.errors = addError(next.errors, invalid(node, checked.at))
  }
}

/** The single pure reducer shared by live and replay mode. */
export function reduceBoard(state: BoardState, event: AdkEvent): BoardState {
  const node = nodeName(event)
  const next: BoardState = { ...state }

  const delta = event.actions?.stateDelta
  if (isObject(delta)) applyState(next, delta, node)

  // Workflow nodes (convene, round1…) output prompt strings; only model nodes output answers.
  if (node && event.output != null && typeof event.output !== 'string') {
    const seat = seatRound(node)
    // check_sources re-emits the evidence with each source link's check result.
    if (node === 'researcher' || node === 'check_sources') applyState(next, { evidence: event.output }, node)
    else if (node === 'chairman') applyState(next, { verdict: event.output }, node)
    else if (seat) takeSeat(next, seat.seat, seat.round, event.output, node)
  }

  if (event.errorCode || event.errorMessage) {
    next.errors = addError(next.errors, {
      node,
      code: event.errorCode ?? null,
      message: event.errorMessage ?? event.errorCode ?? 'Unknown error',
    })
  } else if (node) {
    const implied = impliedPhase(node)
    if (implied && PHASE_ORDER.indexOf(implied) > PHASE_ORDER.indexOf(next.phase)) next.phase = implied
  }
  if (typeof event.error === 'string') {
    next.errors = addError(next.errors, { node: null, code: null, message: event.error })
  }
  if (next.verdict) next.phase = 'ratify'
  return next
}

/**
 * A saved decision, rebuilt from its session state alone: no events, no model calls. The phase is the furthest
 * one the state proves; a meeting that stopped early shows what it finished.
 */
export function boardFromState(state: Record<string, unknown>): BoardState {
  const board: BoardState = { ...initialBoard }
  applyState(board, state, null)
  board.phase = board.verdict
    ? 'ratify'
    : Object.keys(board.round2).length
      ? 'chairman'
      : Object.keys(board.round1).length
        ? 'rebuttals'
        : board.evidence
          ? 'round1'
          : 'researching'
  return board
}
