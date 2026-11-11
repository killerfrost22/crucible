import type { AdkEvent, DecisionSummary, Intake, Ratification } from '../types'
import { isObject } from './validate'
import { SseParser, toAdkEvent } from './sse'

export const API_BASE = (import.meta.env.VITE_API_BASE ?? 'http://localhost:8000').replace(/\/+$/, '')
const APP = 'crucible'
const USER_KEY = 'crucible.userId'

/**
 * Anonymous owner id, stable per browser. It is the only key to this browser's decisions: never put it in a URL the
 * owner might share (decision links carry the session id alone).
 */
export function userId(): string {
  let id = localStorage.getItem(USER_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(USER_KEY, id)
  }
  return id
}

/** This browser's owner id, without minting one: a browser that never convened the board owns no decisions. */
export function existingUserId(): string | null {
  try {
    return localStorage.getItem(USER_KEY)
  } catch {
    return null
  }
}

const sessionsUrl = (user: string) => `${API_BASE}/apps/${APP}/users/${encodeURIComponent(user)}/sessions`

/** HTTP failure with the server's body kept for error classification. */
export class ApiError extends Error {
  readonly status: number
  /** Crucible's own refusal code (`CRUCIBLE_*`, backend/guard.py), sent before any model runs. */
  readonly code: string | null = null
  /** The server's one-sentence explanation for the owner, sent with `code`. */
  readonly detail: string | null = null
  constructor(status: number, body: string) {
    super(`HTTP ${status}${body ? `: ${body.slice(0, 500)}` : ''}`)
    this.status = status
    try {
      const payload = JSON.parse(body) as { code?: unknown; detail?: unknown } | null
      if (typeof payload?.code === 'string' && payload.code.startsWith('CRUCIBLE_')) {
        this.code = payload.code
        this.detail = typeof payload.detail === 'string' ? payload.detail : null
      }
    } catch {
      // Not JSON (a proxy or provider error page): classified from the message instead.
    }
  }
}

/** A saved decision's session state (intake, evidence, round1, round2, verdict, ratification). No model runs. */
export async function getSessionState(user: string, sessionId: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const response = await fetch(`${sessionsUrl(user)}/${encodeURIComponent(sessionId)}`, { signal }).then(expectOk)
  const session: unknown = await response.json()
  return isObject(session) && isObject(session.state) ? session.state : {}
}

/** This owner's decisions, newest first. Summaries are written by backend/guard.py, so their shape is ours. */
export async function listDecisions(user: string, signal?: AbortSignal): Promise<DecisionSummary[]> {
  const response = await fetch(`${API_BASE}/apps/${APP}/users/${encodeURIComponent(user)}/decisions`, { signal }).then(expectOk)
  const body: unknown = await response.json()
  const decisions: DecisionSummary[] = isObject(body) && Array.isArray(body.decisions) ? body.decisions : []
  return decisions
}

/** Deletes a saved decision for good: its state and every event. Only the owner id that made it can. */
export async function deleteDecision(user: string, sessionId: string): Promise<void> {
  await fetch(`${sessionsUrl(user)}/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }).then(expectOk)
}

async function expectOk(response: Response): Promise<Response> {
  if (!response.ok) throw new ApiError(response.status, await response.text().catch(() => ''))
  return response
}

export async function createSession(user: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(sessionsUrl(user), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    signal,
  }).then(expectOk)
  const session = (await response.json()) as { id: string }
  return session.id
}

/** POSTs the intake to /run_sse and yields ADK events as they stream in. */
export async function* runBoard(
  user: string,
  sessionId: string,
  intake: Intake,
  signal?: AbortSignal,
): AsyncGenerator<AdkEvent> {
  const response = await fetch(`${API_BASE}/run_sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      appName: APP,
      userId: user,
      sessionId,
      streaming: false,
      newMessage: { role: 'user', parts: [{ text: JSON.stringify(intake) }] },
    }),
    signal,
  }).then(expectOk)
  if (!response.body) throw new Error('The server sent an empty response.')

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  const parser = new SseParser()
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      for (const payload of parser.push(value)) yield toAdkEvent(payload)
    }
    for (const payload of parser.flush()) yield toAdkEvent(payload)
  } finally {
    reader.releaseLock()
  }
}

export async function ratify(user: string, sessionId: string, ratification: Ratification): Promise<void> {
  await fetch(`${sessionsUrl(user)}/${encodeURIComponent(sessionId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stateDelta: { ratification } }),
  }).then(expectOk)
}
