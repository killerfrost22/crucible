import { RECORDINGS } from 'virtual:crucible-replays'
import type { AdkEvent } from '../types'
import { nodeName } from './board'
import { parseSseText } from './sse'

/** How a recording was made, read from its file (replaysPlugin.ts). */
export interface RecordingFacts {
  /** "Nov 10, 2026": the UTC day of the first event; empty if no event has a timestamp. */
  date: string
  /** The Researcher's, the seats' and the Chairman's models, a family named once: "Claude Sonnet 5.5 + Haiku 5.5". */
  models: string
  /** "web search on" or "web search off". */
  search: string
  /** All of it in one line: "Recorded Nov 10, 2026 · Claude Sonnet 5.5 + Haiku 5.5 · web search on". */
  label: string
}

const DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

/** "anthropic/claude-sonnet-5.5" → "Claude Sonnet 5.5". Other models (Gemini) keep the name they report. */
function modelName(version: string): string {
  const id = version.split('/').pop() ?? version
  if (!id.startsWith('claude-')) return id
  return id
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * A label piece with no-break spaces, so a narrow line breaks only between pieces: after "·", before "+"
 * ("Recorded Nov 10, 2026 ·" / "Claude Sonnet 5.5" / "+ Haiku 5.5 ·" / "web search on").
 */
const piece = (text: string) => text.replaceAll(' ', '\u00a0')

/** Undefined for a name with no file in public/replays/. */
export function recordingFacts(name: string): RecordingFacts | undefined {
  const recording = RECORDINGS[name]
  if (!recording) return undefined
  const names = recording.models.map(modelName)
  // A family is named once: "Claude Sonnet 5.5 + Haiku 5.5".
  const models = names
    .map((n, i) => piece(i > 0 && n.includes(' ') && n.split(' ')[0] === names[i - 1].split(' ')[0] ? n.slice(n.indexOf(' ') + 1) : n))
    .join(' +\u00a0')
  const date = recording.recorded === null ? '' : piece(DAY.format(recording.recorded * 1000))
  const search = piece(`web search ${recording.web ? 'on' : 'off'}`)
  return { date, models, search, label: [date && `Recorded\u00a0${date}`, models, search].filter(Boolean).join('\u00a0· ') }
}

export interface ReplayInfo {
  name: string
  label: string
  blurb: string
  recording: RecordingFacts | undefined
}

/** Recorded real runs shipped in public/replays/. */
export const REPLAYS: ReplayInfo[] = [
  {
    name: 'bakery-second-location',
    label: 'Bakery · second location',
    blurb: 'A College Park bakery owner asks whether to open a second store on Route 1 or invest in delivery first.',
  },
  {
    name: 'dental-ai-receptionist',
    label: 'Dental office · AI receptionist',
    blurb: 'A two-dentist practice in Silver Spring asks whether an AI should answer and record its calls.',
  },
  {
    name: 'hvac-ai-promo-texts',
    label: 'HVAC company · AI promo texts',
    blurb: 'A Frederick HVAC shop wants an AI tool to text every past customer a fall tune-up deal.',
  },
].map((r) => ({ ...r, recording: recordingFacts(r.name) }))

/** No such recording. Static hosts answer a missing file with the app shell (200, text/html), so `ok` alone proves nothing. */
export class ReplayMissingError extends Error {}

export async function loadReplay(name: string, signal?: AbortSignal): Promise<AdkEvent[]> {
  const response = await fetch(`/replays/${encodeURIComponent(name)}.sse`, { signal })
  if (response.status === 404 || response.headers.get('content-type')?.includes('text/html')) {
    throw new ReplayMissingError(`Recorded session "${name}" was not found.`)
  }
  if (!response.ok) throw new Error(`Recorded session "${name}" could not be loaded (HTTP ${response.status}).`)
  const events = parseSseText(await response.text())
  if (!events.length) throw new Error(`Recorded session "${name}" has no events.`)
  return events
}

/** Successful model output: stamped when the call started, delivered when it finished. */
function isModelOutput(event: AdkEvent): boolean {
  if (event.errorCode || event.errorMessage || event.error) return false
  const node = nodeName(event)
  return node === 'researcher' || node === 'chairman' || /_r[12]$/.test(node ?? '')
}
/** The chairman is the last model call, so nothing later in the recording bounds how long it took. */
const CHAIRMAN_MS = 6000
const MIN_GAP_MS = 220

/**
 * Milliseconds from start at which each event should be re-emitted.
 *
 * ADK stamps a model event when the call *starts*, while the stream delivers it when the call
 * *finishes*. Workflow nodes (convene, round1, ...) and failures are stamped when emitted, so they
 * anchor the timeline; model events between two anchors are spread across that window in arrival order.
 */
export function replaySchedule(events: AdkEvent[]): number[] {
  const start = events.find((e) => typeof e.timestamp === 'number')?.timestamp ?? 0
  const at: number[] = []
  events.forEach((e, i) => at.push(typeof e.timestamp === 'number' ? (e.timestamp - start) * 1000 : (at[i - 1] ?? 0)))
  const out = new Array<number>(events.length)
  let anchor = 0
  let i = 0
  while (i < events.length) {
    if (!isModelOutput(events[i])) {
      anchor = Math.max(anchor, at[i])
      out[i++] = anchor
      continue
    }
    let end = i
    while (end < events.length && isModelOutput(events[end])) end++
    const count = end - i
    const next = end < events.length ? Math.max(anchor, at[end]) : anchor + CHAIRMAN_MS * count
    for (let k = 1; k <= count; k++) out[i + k - 1] = anchor + (next - anchor) * (k / count) * 0.96
    i = end
  }
  for (let k = 1; k < out.length; k++) out[k] = Math.max(out[k], out[k - 1] + MIN_GAP_MS)
  return out
}

/** Re-emits recorded events on their original relative timing, scaled by `speed`. */
export class ReplayPlayer {
  private index = 0
  private virtual = 0
  private lastTick = 0
  private timer: number | undefined
  private speed: number
  private paused = false
  private readonly events: AdkEvent[]
  private readonly schedule: number[]
  private readonly onEvent: (event: AdkEvent) => void
  private readonly onDone: () => void

  constructor(events: AdkEvent[], speed: number, onEvent: (event: AdkEvent) => void, onDone: () => void) {
    this.events = events
    this.schedule = replaySchedule(events)
    this.speed = speed
    this.onEvent = onEvent
    this.onDone = onDone
  }

  start() {
    this.lastTick = performance.now()
    this.tick()
  }

  setSpeed(speed: number) {
    this.advanceClock()
    this.speed = speed
    this.arm()
  }

  /** Freezes the recording's clock; nothing new arrives until `resume`. */
  pause() {
    this.advanceClock()
    this.paused = true
    clearTimeout(this.timer)
  }

  resume() {
    this.lastTick = performance.now()
    this.paused = false
    this.arm()
  }

  skipToEnd() {
    clearTimeout(this.timer)
    this.virtual = Infinity
    this.tick()
  }

  stop() {
    clearTimeout(this.timer)
    this.index = this.events.length
  }

  private advanceClock() {
    const now = performance.now()
    if (!this.paused) this.virtual += (now - this.lastTick) * this.speed
    this.lastTick = now
  }

  private tick() {
    this.advanceClock()
    while (this.index < this.events.length && this.schedule[this.index] <= this.virtual) {
      this.onEvent(this.events[this.index++])
    }
    if (this.index >= this.events.length) this.onDone()
    else this.arm()
  }

  private arm() {
    clearTimeout(this.timer)
    if (this.paused || this.index >= this.events.length) return
    const wait = (this.schedule[this.index] - this.virtual) / this.speed
    this.timer = window.setTimeout(() => this.tick(), Math.max(0, wait))
  }
}
