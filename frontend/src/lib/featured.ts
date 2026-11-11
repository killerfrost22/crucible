// The home page's quotes from a recorded meeting, selected at build time by replaysPlugin.ts (virtual:crucible-featured/
// <name>), so the home bundle carries only the sentences it shows. Quotes are shortened but not reworded: whole leading
// sentences are kept and the rest dropped, (Fn) citations are dropped from the verdict excerpts and the board-card
// lines, and straight quotes are set as curly ones (lib/quote.ts). Runs in Node as well as the browser.
import { SEAT_IDS, type EscalateTo, type Intake, type SeatId, type SourceCheck, type Stance } from '../types'
import { lead, typeset, uncite } from './quote'
import type { RecordingData } from './recording'

export type Said = { seat: SeatId; text: string }

/** What a featured session quotes from its recording. */
export interface FeaturedQuotes {
  intake: Intake
  facts: {
    total: number
    /** How many facts carry a source link. */
    sourced: number
    /** How many of those links opened when Crucible checked them (backend `check_sources`). */
    checked: number
    /** A few of the Researcher's facts; `source` is the host of the fact's source link. */
    excerpts: { id: string; claim: string; source: string | null; status: SourceCheck['status'] | null }[]
  }
  openQuestion: string
  /** Round 1 stance of every seat. */
  stances: { seat: SeatId; stance: Stance }[]
  /** Round 1 openings. */
  openings: Said[]
  /** Round 2 rebuttals. */
  rebuttals: (Said & { target: SeatId })[]
  verdict: {
    decision: string
    confidence: number
    headline: string
    why: string
    dissent: Said
    conditions: string[]
    steps: { when: string; action: string }[]
    escalate: string
  }
  /** One real line per member, for the board cards. */
  lines: Record<SeatId | 'chairman', string>
}

/** The Round 1 openings shown: the practitioner, the gatekeeper and the contrarian. */
const OPENING_SEATS: SeatId[] = ['industry_expert', 'realist', 'devils_advocate']
const FACTS_SHOWN = 3
const REBUTTALS_SHOWN = 4

const ESCALATE_TO: Record<EscalateTo, string> = {
  none: 'No one',
  attorney: 'An attorney',
  accountant: 'An accountant',
  sbdc_advisor: 'A Maryland SBDC advisor',
  regulator: 'The regulator',
}

const sentenceCase = (text: string) => text[0].toUpperCase() + text.slice(1)

/**
 * Selection rules, so the panels follow the recording rather than a hand pick:
 * - Evidence: the first fact of each link outcome (checked, failed, no source), topped up in fact order to three.
 * - Open question: the Researcher's first.
 * - Openings: OPENING_SEATS' Round 1 summaries. Board cards: each seat's first Round 1 sentence; the Chairman's headline.
 * - Rebuttals: the Devil's Advocate's first rebuttal, then the other seats' answers to the Devil's Advocate in table
 *   order, then other seats' first rebuttals, one per seat, four in all.
 * - Verdict: the rationale's lead, the first dissent, the first two conditions, the first step of each of the first two
 *   timeframes, and whom to ask with the first sentence of why.
 */
export function selectFeatured(name: string, rec: RecordingData): FeaturedQuotes {
  const { intake, facts, claims, round1, rebuttals, verdict } = rec
  if (!intake || !verdict || SEAT_IDS.some((s) => !round1[s])) throw new Error(`Recording ${name} has no complete meeting to quote.`)
  const opened = (seat: SeatId) => round1[seat]!

  const outcome = (f: (typeof facts)[number]) => (f.status === 'ok' ? 'ok' : f.status ? 'failed' : 'none')
  const shown = new Set(facts.filter((f, i) => facts.findIndex((g) => outcome(g) === outcome(f)) === i))
  for (const f of facts) if (shown.size < FACTS_SHOWN) shown.add(f)

  const answers: FeaturedQuotes['rebuttals'] = []
  const add = (seat: SeatId, r: { target: SeatId; response: string } | undefined) => {
    if (r && answers.length < REBUTTALS_SHOWN && !answers.some((a) => a.seat === seat)) answers.push({ seat, target: r.target, text: lead(r.response, 3, 200) })
  }
  add('devils_advocate', rebuttals.devils_advocate[0])
  for (const seat of SEAT_IDS) add(seat, rebuttals[seat].find((r) => r.target === 'devils_advocate'))
  for (const seat of SEAT_IDS) add(seat, rebuttals[seat][0])

  const whens = [...new Set(rec.nextSteps.map((s) => s.when))].slice(0, 2)
  const dissent = rec.dissent[0]
  const headline = typeset(verdict.headline)

  return {
    intake,
    facts: {
      total: facts.length,
      sourced: facts.filter((f) => f.host).length,
      checked: facts.filter((f) => f.status === 'ok').length,
      excerpts: facts.flatMap((f, i) => (shown.has(f) ? [{ id: `F${i + 1}`, claim: lead(claims[i], 2, 240), source: f.host, status: f.status }] : [])),
    },
    openQuestion: lead(rec.openQuestions[0] ?? '', 2, 240),
    stances: SEAT_IDS.map((seat) => ({ seat, stance: opened(seat).stance })),
    openings: OPENING_SEATS.map((seat) => ({ seat, text: lead(opened(seat).summary, 2, 240) })),
    rebuttals: answers,
    verdict: {
      decision: sentenceCase(verdict.decision),
      confidence: verdict.confidence,
      headline,
      why: lead(uncite(rec.rationale), 3, 320),
      dissent: { seat: dissent.seat, text: lead(uncite(dissent.point), 2, 200) },
      conditions: rec.conditions.slice(0, 2).map((c) => lead(uncite(c), 2, 180)),
      steps: whens.map((when) => ({
        when: sentenceCase(when),
        action: lead(uncite(rec.nextSteps.find((s) => s.when === when)!.action), 2, 170),
      })),
      escalate:
        verdict.escalate_to === 'none' ? ESCALATE_TO.none : `${ESCALATE_TO[verdict.escalate_to]}. ${lead(uncite(rec.escalationReason), 1)}`,
    },
    lines: {
      ...(Object.fromEntries(SEAT_IDS.map((seat) => [seat, lead(uncite(opened(seat).summary), 1)])) as Record<SeatId, string>),
      chairman: headline,
    },
  }
}
