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

/** Replace the whole board. Used when a saved session is opened without replaying its events. */
export type BoardAction = AdkEvent | { restore: BoardState }

/** `crucible@1/realist_r1@1` → `realist_r1`. */
export function nodeName(event: AdkEvent): string | null {
  const path = event.nodeInfo?.path
  if (path) return path.split('/').pop()!.replace(/@\d+$/, '')
  return event.author ?? null
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isSeat = (value: string): value is SeatId => (SEAT_IDS as readonly string[]).includes(value)

function seatRound(node: string): { seat: SeatId; round: 1 | 2 } | null {
  const match = /^(.+)_r([12])$/.exec(node)
  if (!match || !isSeat(match[1])) return null
  return { seat: match[1], round: match[2] === '1' ? 1 : 2 }
}

function impliedPhase(node: string): Phase | null {
  if (node === 'intake' || node === 'researcher') return 'researching'
  if (node === 'convene') return 'round1'
  if (node === 'round1' || node === 'open_rebuttal') return 'rebuttals'
  if (node === 'round2' || node === 'close_debate') return 'chairman'
  if (node === 'chairman') return 'ratify'
  const seat = seatRound(node)
  if (seat) return seat.round === 1 ? 'round1' : 'rebuttals'
  return null
}

function seatMap<T>(value: unknown): Partial<Record<SeatId, T>> {
  const out: Partial<Record<SeatId, T>> = {}
  if (!isObject(value)) return out
  for (const [key, opinion] of Object.entries(value)) {
    if (isSeat(key) && isObject(opinion)) out[key] = opinion as T
  }
  return out
}

function addError(errors: BoardError[], error: BoardError): BoardError[] {
  return errors.some((e) => e.message === error.message && e.node === error.node) ? errors : [...errors, error]
}

/** The single pure reducer shared by live, replay, and restored sessions. */
export function reduceBoard(state: BoardState, action: BoardAction): BoardState {
  if ('restore' in action) return action.restore
  const event = action
  const node = nodeName(event)
  const next: BoardState = { ...state }

  const delta = event.actions?.stateDelta
  if (isObject(delta)) {
    if (isObject(delta.intake)) next.intake = delta.intake as unknown as Intake
    if (delta.evidence_mode === 'web' || delta.evidence_mode === 'model_knowledge') next.evidenceMode = delta.evidence_mode
    if (isObject(delta.evidence)) next.evidence = delta.evidence as unknown as Evidence
    if (delta.round1) next.round1 = { ...next.round1, ...seatMap<Round1Opinion>(delta.round1) }
    if (delta.round2) next.round2 = { ...next.round2, ...seatMap<Round2Opinion>(delta.round2) }
    if (isObject(delta.verdict)) next.verdict = delta.verdict as unknown as Verdict
  }

  if (node && isObject(event.output)) {
    const output = event.output
    const seat = seatRound(node)
    if (node === 'researcher') next.evidence = output as unknown as Evidence
    else if (node === 'chairman') next.verdict = output as unknown as Verdict
    else if (seat?.round === 1) next.round1 = { ...next.round1, [seat.seat]: output as unknown as Round1Opinion }
    else if (seat?.round === 2) next.round2 = { ...next.round2, [seat.seat]: output as unknown as Round2Opinion }
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
