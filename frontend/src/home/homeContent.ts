// Copy and data for the home page. Session data comes from the recorded HVAC meeting
// (public/replays/hvac-ai-promo-texts.sse) via content.ts and scenarios.ts; nothing here is invented.
import { MOCK_THREAD, REBUTTALS, VERDICT, type MemberId } from '../content'
import { SCENARIOS } from '../scenarios'
import type { Intake } from '../types'

export const HVAC_INTAKE: Intake = SCENARIOS.find((s) => s.id === 'hvac-ai-promo-texts')!.intake

/**
 * The first four of the seven facts the Researcher gathered in the HVAC recording, shortened but not reworded.
 * That recording ran without web access, so every fact is marked unverified and has no source link.
 */
export const HVAC_FACT_EXCERPTS: string[] = [
  'Under the TCPA, sending marketing text messages requires prior express written consent; violations carry penalties up to $500 to $1,500 per message.',
  'Housecall Pro, the company’s current software, includes built-in customer marketing and automated text messaging.',
  'A sudden mass text blast to an entire customer list could generate a surge in demand that exceeds a 4-technician schedule, leading to missed calls.',
  'Dedicated AI marketing and SMS automation tools typically range from $50 to over $200 per month, within or slightly over the $150/month budget.',
]

export const HVAC_OPEN_QUESTION =
  'What percentage of the past customer database has provided explicit written consent to receive marketing text messages?'

/** One real line per member from the HVAC session, for the board cards. */
export const MEMBER_LINE: Record<MemberId, string> = {
  industry_expert: MOCK_THREAD.find((m) => m.seat === 'industry_expert')!.text,
  ai_tools_expert: REBUTTALS.find((r) => r.seat === 'ai_tools_expert')!.text,
  realist: MOCK_THREAD.find((m) => m.seat === 'realist')!.text,
  strategist: REBUTTALS.find((r) => r.seat === 'strategist')!.text,
  devils_advocate: MOCK_THREAD.find((m) => m.seat === 'devils_advocate')!.text,
  chairman: VERDICT.headline,
}

export interface Step {
  id: string
  label: string
  caption: string
  /** Accent colour token for the showcase frame while this step is on screen. */
  accent: string
}

/** How a session runs; also the showcase tabs. */
export const STEPS: Step[] = [
  {
    id: 'ask',
    label: 'Ask',
    caption: 'Describe the decision in your own words, which way you’re leaning, and a little about your business.',
    accent: 'var(--seat-industry_expert)',
  },
  {
    id: 'research',
    label: 'Research',
    caption: 'The Researcher gathers the facts every seat argues from, numbered F1, F2… In live meetings it searches the web and cites its sources.',
    accent: 'var(--seat-ai_tools_expert)',
  },
  {
    id: 'positions',
    label: 'Opening positions',
    caption: 'Each seat takes a stance on its own, without seeing the others: for it, against it, or with conditions.',
    accent: 'var(--seat-realist)',
  },
  {
    id: 'rebuttals',
    label: 'Rebuttals',
    caption: 'Seats answer each other by name. Weak arguments get called out; some seats change their minds.',
    accent: 'var(--seat-strategist)',
  },
  {
    id: 'verdict',
    label: 'Verdict',
    caption: 'The Chairman recommends proceed, pilot, defer or reject, and keeps the dissent on the record.',
    accent: 'var(--seat-chairman)',
  },
  {
    id: 'call',
    label: 'Your call',
    caption: 'You accept the recommendation or override it. The final call stays yours.',
    accent: 'var(--seat-devils_advocate)',
  },
]

/** Only true numbers: the workflow is one Researcher, five seats over two rounds, and one Chairman. */
export const STATS: { value: string; label: string; color: string }[] = [
  { value: '5 + 1', label: 'advisors and a Chairman', color: 'var(--seat-industry_expert)' },
  { value: '2', label: 'rounds of debate', color: 'var(--seat-ai_tools_expert)' },
  { value: '12', label: 'AI calls per decision', color: 'var(--seat-realist)' },
  { value: '~1 min', label: 'per meeting', color: 'var(--seat-strategist)' },
  { value: 'F1, F2…', label: 'numbered facts, checked against the web with sources', color: 'var(--seat-chairman)' },
]
