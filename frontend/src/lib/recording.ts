// What the pages quote from a recorded meeting (public/replays/<name>.sse), read at build time by replaysPlugin.ts.
// Runs in Node as well as the browser, so it imports nothing that touches the DOM.
import { SEAT_IDS, type AdkEvent, type Check, type EvidenceMode, type Fact, type Intake, type SeatId, type SeatPoint, type SourceCheck, type Stance, type Step, type Verdict } from '../types.ts'

/** How a recording was made. */
export interface RecordingMeta {
  /** Unix seconds of the first event. */
  recorded: number | null
  /** The board searched the web (`evidence_mode: 'web'`) rather than answering from model knowledge. */
  web: boolean
  /** Distinct `modelVersion`s of the Researcher, the seats and the Chairman, in that order. */
  models: string[]
}

export interface Turn {
  stance: Stance
  headline: string
  summary: string
}

/**
 * One recording's content, split into separate fields so a page bundles only the ones it reads. Empty or null where
 * the meeting never got that far.
 */
export interface RecordingData {
  intake: Intake | null
  evidenceMode: EvidenceMode | null
  /** The Researcher's facts after the link check, in order (F1 first): the source link's host (minus `www.`) and what the check found. */
  facts: { host: string | null; status: SourceCheck['status'] | null }[]
  /** Each fact's claim, in the same order. */
  claims: string[]
  openQuestions: string[]
  round1: Record<SeatId, Turn | null>
  round2: Record<SeatId, Turn | null>
  rebuttals: Record<SeatId, { target: SeatId; response: string }[]>
  /** The Realist's Round 1 checks. */
  checks: Check[]
  verdict: Pick<Verdict, 'decision' | 'confidence' | 'headline' | 'escalate_to'> | null
  rationale: string
  dissent: SeatPoint[]
  conditions: string[]
  nextSteps: Step[]
  escalationReason: string
  /** Every event in arrival order: its node and the session-state keys it wrote. */
  stream: { node: string; state: string[] }[]
}

/** Same rule as lib/board.ts `nodeName`: the last path segment, minus ADK's `@N` run counter. */
const nodeName = (e: AdkEvent) => (e.nodeInfo?.path ?? '').split('/').pop()!.replace(/@\d+$/, '')

function host(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function readRecording(events: AdkEvent[]): { meta: RecordingMeta; data: RecordingData } {
  // Last value of each state key, and each node's output and model.
  const state: Record<string, unknown> = {}
  const output: Record<string, Record<string, unknown>> = {}
  const model: Record<string, string> = {}
  for (const e of events) {
    Object.assign(state, e.actions?.stateDelta)
    const node = nodeName(e)
    if (e.output && typeof e.output === 'object') output[node] = e.output as Record<string, unknown>
    if ('modelVersion' in e && typeof e.modelVersion === 'string') model[node] = e.modelVersion
  }

  const modelNodes = ['researcher', ...SEAT_IDS.flatMap((s) => [`${s}_r1`, `${s}_r2`]), 'chairman']
  const meta: RecordingMeta = {
    recorded: events.find((e) => typeof e.timestamp === 'number')?.timestamp ?? null,
    web: state.evidence_mode === 'web',
    models: [...new Set(modelNodes.map((n) => model[n]).filter(Boolean))],
  }

  // The recorded outputs follow backend/agents/crucible/schemas.py (see types.ts).
  const evidence = state.evidence as { facts?: Fact[]; open_questions?: string[] } | undefined
  const facts = evidence?.facts ?? []
  const turn = (node: string): Turn | null => {
    const o = output[node] as Partial<Turn> | undefined
    return o?.stance ? { stance: o.stance, headline: o.headline ?? '', summary: o.summary ?? '' } : null
  }
  const bySeat = <T>(f: (seat: SeatId) => T) => Object.fromEntries(SEAT_IDS.map((s) => [s, f(s)])) as Record<SeatId, T>
  const verdict = state.verdict as Verdict | undefined

  const data: RecordingData = {
    intake: (state.intake as Intake | undefined) ?? null,
    evidenceMode: (state.evidence_mode as EvidenceMode | undefined) ?? null,
    facts: facts.map((f) => ({ host: host(f.source), status: f.check?.status ?? null })),
    claims: facts.map((f) => f.claim),
    openQuestions: evidence?.open_questions ?? [],
    round1: bySeat((s) => turn(`${s}_r1`)),
    round2: bySeat((s) => turn(`${s}_r2`)),
    rebuttals: bySeat((s) =>
      ((output[`${s}_r2`]?.rebuttals as { target: SeatId; response: string }[] | undefined) ?? []).map((r) => ({ target: r.target, response: r.response })),
    ),
    checks: (output.realist_r1?.checks as Check[] | undefined) ?? [],
    verdict: verdict
      ? { decision: verdict.decision, confidence: verdict.confidence, headline: verdict.headline, escalate_to: verdict.escalate_to }
      : null,
    rationale: verdict?.rationale ?? '',
    dissent: verdict?.dissent ?? [],
    conditions: verdict?.conditions ?? [],
    nextSteps: verdict?.next_steps ?? [],
    escalationReason: verdict?.escalation_reason ?? '',
    stream: events.map((e) => ({ node: nodeName(e), state: Object.keys(e.actions?.stateDelta ?? {}) })),
  }
  return { meta, data }
}
