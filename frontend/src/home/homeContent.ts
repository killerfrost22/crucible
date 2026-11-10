// Copy for the home page. Recorded session content lives in ../content.ts.

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
