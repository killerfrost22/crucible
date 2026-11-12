// The recorded meetings in public/replays/, read the way the server stores a finished session.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** The recordings the site links to (src/lib/replay.ts REPLAYS). */
export const REPLAYS = ['bakery-second-location', 'dental-ai-receptionist', 'hvac-ai-promo-texts'] as const

/** A recording's final session state: every event's `actions.stateDelta`, merged in order. */
export function finalState(name: (typeof REPLAYS)[number]): Record<string, unknown> {
  const text = readFileSync(join(import.meta.dirname, '..', 'public', 'replays', `${name}.sse`), 'utf8')
  const state: Record<string, unknown> = {}
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue
    const event = JSON.parse(line.slice(5)) as { actions?: { stateDelta?: Record<string, unknown> } }
    Object.assign(state, event.actions?.stateDelta)
  }
  return state
}
