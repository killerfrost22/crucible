import { SEAT_BY_ID } from '../seats'
import type { SeatId } from '../types'
import type { BoardError } from './board'

/** Error codes the frontend itself raises; everything else comes from the backend. */
export const CLIENT_NETWORK = 'CLIENT_NETWORK'
export const CLIENT_INCOMPLETE = 'CLIENT_INCOMPLETE'
export const CLIENT_REPLAY = 'CLIENT_REPLAY'
/** `?replay=<name>` names a recording we don't ship: Board shows the not-found page, not a meeting. */
export const CLIENT_REPLAY_MISSING = 'CLIENT_REPLAY_MISSING'

export type ErrorKind = 'quota' | 'network' | 'incomplete' | 'failed'

export interface HumanError {
  kind: ErrorKind
  title: string
  body: string
  /** Raw text for the curious; hidden behind a disclosure. */
  detail: string
}

function who(node: string | null): string | null {
  if (!node) return null
  if (node === 'researcher') return 'The Researcher'
  if (node === 'chairman') return 'The Chairman'
  const match = /^(.+)_r([12])$/.exec(node)
  const seat = match && SEAT_BY_ID[match[1] as SeatId]
  return seat ? `The ${seat.title}` : null
}

/** Titles for Crucible's own refusals (backend/guard.py). The body is the server's sentence, which knows the numbers. */
const GUARD: Record<string, { kind: ErrorKind; title: string }> = {
  CRUCIBLE_RATE_LIMIT: { kind: 'quota', title: 'That’s a lot of meetings from one network.' },
  CRUCIBLE_DAILY_LIMIT: { kind: 'quota', title: 'The board has met as often as it can today.' },
  CRUCIBLE_BUSY: { kind: 'quota', title: 'The board is in other meetings right now.' },
  CRUCIBLE_INTAKE_TOO_LARGE: { kind: 'failed', title: 'The board couldn’t read that question.' },
  CRUCIBLE_INTAKE_INVALID: { kind: 'failed', title: 'The board couldn’t read that question.' },
}

export function humanizeErrors(errors: BoardError[]): HumanError | null {
  if (!errors.length) return null
  const detail = errors.map((e) => [e.node, e.code, e.message].filter(Boolean).join(' · ')).join('\n')
  const failed = errors.find((e) => e.node)
  const seat = who(failed?.node ?? null)

  // Checked first: the guard answers before any model is called, and its limits are 429s too.
  const refusal = errors.find((e) => e.code && Object.hasOwn(GUARD, e.code))
  if (refusal?.code) return { ...GUARD[refusal.code], body: refusal.message, detail }

  const credit = errors.find((e) => /\b402\b|insufficient.?credits?/i.test(`${e.code} ${e.message}`))
  if (credit) {
    return {
      kind: 'quota',
      title: 'The board is out of AI credit.',
      body: `${seat ? `${seat} couldn't finish because the` : 'The'} AI account behind Crucible has run out of credit. Watch a recorded session to see a full debate.`,
      detail,
    }
  }

  const quota = errors.find((e) => /\b429\b|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(`${e.code} ${e.message}`))
  if (quota) {
    const perMinute = /per minute/i.test(quota.message) && !/per day/i.test(quota.message)
    return {
      kind: 'quota',
      title: perMinute ? 'The board hit its AI speed limit.' : 'The board is out of AI time for today.',
      body: `${seat ? `${seat} couldn't finish because the` : 'The'} AI plan behind Crucible ran out of requests${perMinute ? ' for the moment' : ' for today'}. ${perMinute ? 'Wait a minute, then ask again' : 'Try again tomorrow'}, or watch a recorded session to see a full debate.`,
      detail,
    }
  }
  if (errors.some((e) => e.code === CLIENT_REPLAY)) {
    return {
      kind: 'failed',
      title: "That recorded session couldn't be opened.",
      body: 'The recording is missing or damaged. Head back and pick another one.',
      detail,
    }
  }
  if (errors.some((e) => e.code === CLIENT_NETWORK)) {
    return {
      kind: 'network',
      title: "We can't reach the board right now.",
      body: 'Crucible’s server isn’t answering. Check your connection and try again in a moment, or watch a recorded session.',
      detail,
    }
  }
  if (errors.some((e) => e.code === CLIENT_INCOMPLETE)) {
    return {
      kind: 'incomplete',
      title: 'The meeting ended early.',
      body: 'The connection closed before the Chairman gave a recommendation.',
      detail,
    }
  }
  return {
    kind: 'failed',
    title: seat ? `${seat} couldn't finish.` : 'Something went wrong during the meeting.',
    body: 'The board stopped before it could recommend anything. You can try the question again.',
    detail,
  }
}
