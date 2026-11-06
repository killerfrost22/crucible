// Landing copy taken from the recorded HVAC session (public/replays/hvac-ai-promo-texts.sse), shortened but not reworded.
import { SEATS } from '../seats'
import type { SeatId, Stance } from '../types'

export type MemberId = SeatId | 'chairman'

export interface Member {
  id: MemberId
  title: string
  role: string
  /** CSS color token for the member's dot and cursor. */
  color: string
}

export const CHAIRMAN: Member = {
  id: 'chairman',
  title: 'Chairman',
  role: 'Weighs both rounds and recommends: proceed, pilot, defer, or reject.',
  color: 'var(--seat-chairman)',
}

/** The five seats in table order, then the Chairman. */
export const MEMBERS: Member[] = [...SEATS.map((s) => ({ ...s, color: `var(--seat-${s.id})` })), CHAIRMAN]

export const HVAC_REPLAY = 'hvac-ai-promo-texts'

export const HVAC_FACTS = 7

/** Round 1 openings shown in the hero mock. */
export const MOCK_THREAD: { seat: SeatId; stance: Stance; text: string }[] = [
  {
    seat: 'industry_expert',
    stance: 'conditional',
    text: 'A four-tech shop cannot handle a massive influx of calls from a total list blast. Segment your list and roll out texts in phases.',
  },
  {
    seat: 'realist',
    stance: 'conditional',
    text: 'You must verify written consent before sending texts. An unverified TCPA violation carries steep fines.',
  },
  {
    seat: 'devils_advocate',
    stance: 'oppose',
    text: 'Blasting your entire customer list next week will overwhelm your four technicians. You risk compliance fines, missed calls, and angry customers.',
  },
]

export const MOCK_STANCES: { seat: SeatId; stance: Stance }[] = [
  { seat: 'industry_expert', stance: 'conditional' },
  { seat: 'ai_tools_expert', stance: 'conditional' },
  { seat: 'realist', stance: 'conditional' },
  { seat: 'strategist', stance: 'conditional' },
  { seat: 'devils_advocate', stance: 'oppose' },
]

/** Round 2 rebuttals, verbatim. */
export const REBUTTALS: { seat: SeatId; target: SeatId; text: string }[] = [
  {
    seat: 'devils_advocate',
    target: 'strategist',
    text: 'Phasing still fails if your consent rate is zero. If you text unconsented numbers, phasing just spreads out your legal liability instead of curing it.',
  },
  {
    seat: 'strategist',
    target: 'realist',
    text: 'Correct. Verifying consent today prevents a legal bottleneck tomorrow. Next week’s move must be a test batch of 50 compliant contacts, not a raw list blast.',
  },
  {
    seat: 'ai_tools_expert',
    target: 'realist',
    text: 'Spot on. That is why we must use built-in tools like Housecall Pro rather than buying expensive new platforms that break our $150 budget (F4).',
  },
  {
    seat: 'industry_expert',
    target: 'ai_tools_expert',
    text: 'Housecall Pro is already in our stack, so let us use it to pace the drop.',
  },
]

export const VERDICT = {
  decision: 'Pilot',
  confidence: 90,
  headline: 'Pilot a small, segmented text campaign using Housecall Pro after verifying customer consent.',
  why: 'Blasting the whole list next week would overwhelm four technicians and risk TCPA penalties. Housecall Pro can send a small, phased test batch to customers who have opted in.',
  dissent: 'Even a phased campaign violates federal law and risks bankruptcy if you text customers who have not provided explicit written consent.',
  conditions: [
    'Your Housecall Pro tier includes automated SMS without fees beyond the $150 monthly budget.',
    'Everyone in the test batch has given express consent to marketing texts.',
  ],
  steps: [
    { when: 'This week', action: 'Check your Housecall Pro tier for automated SMS. Have an attorney review consent for TCPA compliance.' },
    { when: 'Next 30 days', action: 'Pilot the text to a phased batch of 50 past customers.' },
  ],
  escalate: 'An attorney, to confirm prior express written consent under the TCPA.',
}
