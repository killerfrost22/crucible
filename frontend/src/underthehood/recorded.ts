// Real data behind the under-the-hood page, copied from the recorded dental meeting
// (public/replays/dental-ai-receptionist.sse, re-recorded Nov 10 on the current Claude setup) and from backend/eval/scenarios.json.
import type { SeatId, SourceCheck } from '../types'

export const DENTAL_REPLAY = 'dental-ai-receptionist'

/** The Researcher's facts in the dental meeting: the host of each source link and what the link check found. */
export const DENTAL_FACTS: { id: string; source: string | null; status: SourceCheck['status'] | null }[] = [
  { id: 'F1', source: 'dentalbase.ai', status: 'ok' },
  { id: 'F2', source: 'dentalbase.ai', status: 'ok' },
  { id: 'F3', source: 'dentalbase.ai', status: 'ok' },
  { id: 'F4', source: 'legendnt.com', status: 'ok' },
  { id: 'F5', source: 'legendnt.com', status: 'ok' },
  { id: 'F6', source: 'legendnt.com', status: 'ok' },
  { id: 'F7', source: 'legendnt.com', status: 'ok' },
  { id: 'F8', source: 'hillflare.com', status: 'ok' },
  { id: 'F9', source: 'agentzap.ai', status: 'ok' },
  { id: 'F10', source: null, status: null },
  { id: 'F11', source: null, status: null },
  { id: 'F12', source: null, status: null },
]

export const DENTAL_CHECKED = DENTAL_FACTS.filter((f) => f.status === 'ok').length

/** The Realist's Round 1 checks in the dental meeting; the blocking note verbatim. */
export const DENTAL_CHECKS: { area: string; status: 'pass' | 'flag' | 'block'; note?: string }[] = [
  {
    area: 'legal',
    status: 'block',
    note: 'Maryland all-party consent (F1) and a signed BAA on the exact purchased plan (F2, F4) must be in place before recording or patient data flows; have a healthcare attorney confirm, and check any Montgomery County or Maryland Board of Dental Examiners rules (unverified).',
  },
  { area: 'compliance', status: 'flag' },
  { area: 'financial', status: 'flag' },
  { area: 'goals', status: 'pass' },
  { area: 'operational', status: 'flag' },
]

/** Whom the Realist rebutted in Round 2. */
export const REALIST_R2_TARGETS: SeatId[] = ['ai_tools_expert', 'strategist', 'devils_advocate']

/** The dental meeting's stream: node name and the session state it wrote, in arrival order. */
export const DENTAL_STREAM: { node: string; state?: string }[] = [
  { node: 'intake', state: 'intake, evidence_mode' },
  { node: 'researcher', state: 'evidence' },
  { node: 'check_sources', state: 'evidence' },
  { node: 'convene' },
  { node: 'devils_advocate_r1' },
  { node: 'realist_r1' },
  { node: 'strategist_r1' },
  { node: 'industry_expert_r1' },
  { node: 'ai_tools_expert_r1' },
  { node: 'round1' },
  { node: 'open_rebuttal', state: 'round1' },
  { node: 'realist_r2' },
  { node: 'industry_expert_r2' },
  { node: 'strategist_r2' },
  { node: 'ai_tools_expert_r2' },
  { node: 'devils_advocate_r2' },
  { node: 'round2' },
  { node: 'close_debate', state: 'round2' },
  { node: 'chairman', state: 'verdict' },
]

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
