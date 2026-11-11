// Real data behind the under-the-hood page. The dental exports are read from the recorded dental meeting
// (public/replays/dental-ai-receptionist.sse) when the site is built (replaysPlugin.ts), so a re-recorded file updates the
// page. Quotes are not reworded: the blocking note and the headline are whole, with straight quotes set as curly ones
// (lib/quote.ts). EVAL_SCENARIOS is a hand-written summary of backend/eval/scenarios.json.
import { checks, facts, rebuttals, stream, verdict } from 'virtual:crucible-replays/dental-ai-receptionist'
import { typeset } from '../lib/quote'
import { recordingFacts } from '../lib/replay'
import type { CheckStatus, SeatId, SourceCheck } from '../types'

export const DENTAL_REPLAY = 'dental-ai-receptionist'

/** When and with which models the dental meeting was recorded. */
export const DENTAL_RECORDING = recordingFacts(DENTAL_REPLAY)

/** The Researcher's facts in the dental meeting: the host of each source link and what the link check found. */
export const DENTAL_FACTS: { id: string; source: string | null; status: SourceCheck['status'] | null }[] = facts.map((f, i) => ({
  id: `F${i + 1}`,
  source: f.host,
  status: f.status,
}))

export const DENTAL_CHECKED = DENTAL_FACTS.filter((f) => f.status === 'ok').length

/** The Realist's Round 1 checks in the dental meeting; the blocking notes verbatim. */
export const DENTAL_CHECKS: { area: string; status: CheckStatus; note?: string }[] = checks.map((c) => ({
  area: c.area,
  status: c.status,
  note: c.status === 'block' ? typeset(c.note) : undefined,
}))

/** Whom the Realist rebutted in Round 2. */
export const REALIST_R2_TARGETS: SeatId[] = rebuttals.realist.map((r) => r.target)

/** The dental meeting's stream: node name and the session state it wrote, in arrival order. */
export const DENTAL_STREAM: { node: string; state?: string }[] = stream.map((e) => ({
  node: e.node,
  state: e.state.length ? e.state.join(', ') : undefined,
}))

/** The Chairman's call in the dental meeting. */
export const DENTAL_VERDICT = verdict && {
  decision: verdict.decision[0].toUpperCase() + verdict.decision.slice(1),
  headline: typeset(verdict.headline),
}

/** The ten eval scenarios and the risks planted in each (`must_catch`). */
export const EVAL_SCENARIOS: { business: string; question: string; traps: string[]; control?: boolean }[] = [
  {
    business: 'Dental office',
    question: 'Replace the front desk with an AI receptionist that records calls?',
    traps: ['Maryland all-party call-recording consent', 'HIPAA business associate agreement'],
  },
  {
    business: 'Coffee shop',
    question: 'Let shift managers share in the baristas’ tip pool?',
    traps: ['Managers may not keep tips from a pool (FLSA)'],
  },
  {
    business: 'HVAC company',
    question: 'Text a promo to every past customer?',
    traps: ['TCPA prior express written consent', 'Opt-out handling'],
  },
  {
    business: 'Landscaper',
    question: 'Switch the seasonal crew from W-2 to 1099?',
    traps: ['Worker misclassification'],
  },
  {
    business: 'Restaurant',
    question: 'Let an AI score recorded video interviews?',
    traps: ['Maryland facial-recognition consent', 'Hiring bias'],
  },
  {
    business: 'Bakery',
    question: 'Raise prices 8% across the menu?',
    traps: ['Customer price sensitivity'],
    control: true,
  },
  {
    business: 'Cleaning service',
    question: 'Let a chatbot give final quotes and book jobs?',
    traps: ['The business is bound by what its chatbot promises'],
  },
  {
    business: 'Salon',
    question: 'Paste the client list into a free AI app?',
    traps: ['Customer data privacy and vendor data use'],
  },
  {
    business: 'Food truck',
    question: 'Take a $60,000 merchant cash advance?',
    traps: ['True cost of capital', 'SBA-backed alternatives'],
  },
  {
    business: 'Retail shop',
    question: 'Install facial-recognition cameras for shoplifters?',
    traps: ['Biometric privacy and notice', 'Misidentification and bias'],
  },
]
