import type { SeatId, Stance } from './types'

export interface SeatMeta {
  id: SeatId
  title: string
  /** What the seat argues from, in an owner's words. */
  role: string
}

export const SEATS: SeatMeta[] = [
  { id: 'industry_expert', title: 'Industry Expert', role: 'Has run a business like yours for twenty years.' },
  { id: 'ai_tools_expert', title: 'AI-Tools Expert', role: 'Knows which AI products are real, what they cost, and what they plug into.' },
  { id: 'realist', title: 'Realist', role: 'Checks the legal, compliance, money and goal fit before anything else.' },
  { id: 'strategist', title: 'Strategist', role: 'Looks at what this commits you to next week, next quarter, next year.' },
  { id: 'devils_advocate', title: "Devil's Advocate", role: 'Argues the other side, on purpose, so nothing goes unchallenged.' },
]

export const SEAT_BY_ID = Object.fromEntries(SEATS.map((s) => [s.id, s])) as Record<SeatId, SeatMeta>

export const STANCE_LABEL: Record<Stance, string> = {
  support: 'For it',
  oppose: 'Against it',
  conditional: 'With conditions',
}
