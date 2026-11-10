import { SEAT_BY_ID } from '../seats'
import type { SeatId } from '../types'
import type { BoardError } from './board'

/** Error codes the frontend itself raises; everything else comes from the backend. */
export const CLIENT_NETWORK = 'CLIENT_NETWORK'
export const CLIENT_INCOMPLETE = 'CLIENT_INCOMPLETE'
export const CLIENT_REPLAY = 'CLIENT_REPLAY'
export const CLIENT_DECISION = 'CLIENT_DECISION'

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

export function humanizeErrors(errors: BoardError[]): HumanError | null {
  if (!errors.length) return null
  const detail = errors.map((e) => [e.node, e.code, e.message].filter(Boolean).join(' · ')).join('\n')
  const failed = errors.find((e) => e.node)
  const seat = who(failed?.node ?? null)

  const credit = errors.find((e) => /\b402\b|insufficient.?credits?/i.test(`${e.code} ${e.message}`))
  if (credit) {
    return {
      kind: 'quota',
      title: 'The board is out of AI credit.',
      body: `${seat ? `${seat} couldn't finish because the` : 'The'} AI account behind Crucible has run out of credit. Everything the board finished is still here. Watch a recorded session to see a full debate.`,
      detail,
    }
  }

  const quota = errors.find((e) => /\b429\b|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(`${e.code} ${e.message}`))
  if (quota) {
    const perMinute = /per minute/i.test(quota.message) && !/per day/i.test(quota.message)
    return {
      kind: 'quota',
      title: perMinute ? 'The board hit its AI speed limit.' : 'The board is out of AI time for today.',
      body: `${seat ? `${seat} couldn't finish because the` : 'The'} AI plan behind Crucible ran out of requests${perMinute ? ' for the moment' : ' for today'}. Everything the board finished is still here. ${perMinute ? 'Wait a minute, then ask again' : 'Try again tomorrow'}, or watch a recorded session to see a full debate.`,
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
  if (errors.some((e) => e.code === CLIENT_DECISION)) {
    return {
      kind: 'failed',
      title: "That decision isn't here anymore.",
      body: 'This browser still has a link to it, but the server no longer has the meeting. That happens when the server restarts without a saved session store. Convene the board again and the new meeting is kept.',
      detail,
    }
  }
  if (errors.some((e) => e.code === CLIENT_NETWORK)) {
    return {
      kind: 'network',
      title: "We can't reach the board right now.",
      body: 'The Crucible server is not answering. Check your connection, or make sure the server is running, then try again.',
      detail,
    }
  }
  if (errors.some((e) => e.code === CLIENT_INCOMPLETE)) {
    return {
      kind: 'incomplete',
      title: 'The meeting ended early.',
      body: 'The connection closed before the Chairman gave a recommendation. Whatever the board finished is still pinned below.',
      detail,
    }
  }
  return {
    kind: 'failed',
    title: seat ? `${seat} couldn't finish.` : 'Something went wrong during the meeting.',
    body: 'The board stopped before it could recommend anything. Everything it finished is still here, and you can try the question again.',
    detail,
  }
}
