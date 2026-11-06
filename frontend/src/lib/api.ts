import type { AdkEvent, Intake, Ratification } from '../types'
import { SseParser, toAdkEvent } from './sse'

export const API_BASE = (import.meta.env.VITE_API_BASE ?? 'http://localhost:8000').replace(/\/+$/, '')
const APP = 'crucible'
const USER_KEY = 'crucible.userId'

/** Anonymous owner id, stable per browser. */
export function userId(): string {
  let id = localStorage.getItem(USER_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(USER_KEY, id)
  }
  return id
}

/** HTTP failure with the server's body kept for error classification. */
export class ApiError extends Error {
  readonly status: number
  constructor(status: number, body: string) {
    super(`HTTP ${status}${body ? `: ${body.slice(0, 500)}` : ''}`)
    this.status = status
  }
}

async function expectOk(response: Response): Promise<Response> {
  if (!response.ok) throw new ApiError(response.status, await response.text().catch(() => ''))
  return response
}

export async function createSession(user: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(`${API_BASE}/apps/${APP}/users/${encodeURIComponent(user)}/sessions`, {
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
  await fetch(`${API_BASE}/apps/${APP}/users/${encodeURIComponent(user)}/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stateDelta: { ratification } }),
  }).then(expectOk)
}
