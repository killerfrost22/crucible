// Copy for the home page. Recorded session content lives in ../content.ts.
import type { MemberId } from '../content'

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
    caption: 'The Researcher gathers the facts every seat argues from, numbered F1, F2… In live meetings it searches the web, cites its sources, and Crucible opens each link to see that it loads.',
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
  { value: '~90 s', label: 'per meeting', color: 'var(--seat-strategist)' },
  { value: 'F1, F2…', label: 'numbered facts, each source link opened and dated', color: 'var(--seat-chairman)' },
]

/**
 * What each member hands the owner, from its charge in backend/agents/crucible/seats.py (the Chairman's from the verdict
 * schema). Written for any business, so the board cards add something the walkthrough's example doesn't already show.
 */
export const CONTRIBUTIONS: Record<MemberId, string> = {
  industry_expert: 'What a 20-year operator in your trade would do in your shoes, and why.',
  ai_tools_expert: 'Up to three AI tools you can buy today, priced, each with a keep-or-cancel test. Or a plain “none of them helps.”',
  realist: 'Pass, flag or block on the law, your budget and your goals. A block has to be fixed before you act.',
  strategist: 'What this commits you to over the next year, what it closes off, and the move that should follow it.',
  devils_advocate: 'The best case for the road not taken, and what would have to be true for it to win.',
  chairman: 'Weighs both rounds and makes one call, keeping the strongest dissent on the record.',
}

/** What every verdict holds, in reading order. */
export const VERDICT_PARTS: { term: string; detail: string }[] = [
  { term: 'Why', detail: 'The arguments that decided it, and who still disagrees.' },
  { term: 'Only if', detail: 'The conditions that have to hold before you act.' },
  { term: 'Next steps', detail: 'This week, the next 30 days and the next 90, and who to ask, such as an attorney, an accountant or an SBDC advisor.' },
  { term: 'Your call', detail: 'Accept it, or override it with a note. Nothing is decided until you sign.' },
]
