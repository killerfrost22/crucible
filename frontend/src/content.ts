// Real session content for the home page, shortened from the recorded meetings in public/replays/ but not reworded.
// MEMBERS is also used by the under-the-hood page.
import { SCENARIOS } from './scenarios'
import { SEATS } from './seats'
import type { Intake, SeatId, Stance } from './types'

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

type Said = { seat: SeatId; text: string }

/** A recorded meeting the home page walks through: the showcase, the board cards and the example verdict. */
export interface FeaturedSession {
  /** Replay name in public/replays/. */
  replay: string
  /** Session switch label: full, and short for narrow screens. */
  label: string
  short: string
  /** The business in running text, e.g. "the recorded bakery meeting". */
  noun: string
  place: string
  pill: { long: string; short: string }
  intake: Intake
  facts: {
    total: number
    /** How many facts came back verified with a source. */
    verified: number
    /** A few of the Researcher's facts; `source` is the host of a verified fact's source. */
    excerpts: { id: string; claim: string; source: string | null }[]
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
  lines: Record<MemberId, string>
}

const said = (list: Said[], seat: SeatId) => list.find((m) => m.seat === seat)!.text

/** public/replays/bakery-second-location.sse: the demo-video meeting. */
const BAKERY_OPENINGS: Said[] = [
  {
    seat: 'industry_expert',
    text: 'A second store needs far more than $90,000 (F1), and your first store has no manager while you bake every morning.',
  },
  {
    seat: 'realist',
    text: 'A second store would likely cost far more than your $90,000 (F1), and you would need a certified food manager on site at both places (F5).',
  },
  {
    seat: 'devils_advocate',
    text: 'Opening a second store with $90,000 risks your first store, which pays for everything.',
  },
]

const BAKERY_HEADLINE = 'Don’t sign Route 1 now; hire a manager and test Square delivery.'

const BAKERY: FeaturedSession = {
  replay: 'bakery-second-location',
  label: 'Bakery · second location',
  short: 'Bakery',
  noun: 'bakery',
  place: 'Bakery · College Park, MD',
  pill: { long: 'A bakery owner takes a second store to the board', short: 'Bakery · second location' },
  intake: SCENARIOS.find((s) => s.id === 'bakery-second-location')!.intake,
  facts: {
    total: 13,
    verified: 12,
    excerpts: [
      {
        id: 'F1',
        claim:
          'Startup-cost estimates for a new bakery or cafe site are large compared with $90,000. One 2026 guide puts a roughly 1,400 sq ft second-generation bakery at about $498,000 total.',
        source: 'wilsonklee.com',
      },
      {
        id: 'F5',
        claim:
          'Prince George’s County requires a County-certified Food Service Manager on duty at all times for restaurant-type operators. A second site would therefore need its own certified manager coverage.',
        source: 'princegeorgescountymd.gov',
      },
      {
        id: 'F7',
        claim: 'Marketplace delivery commissions are about 15%-30% per delivery order. Pickup orders cost about 6%-7%.',
        source: 'blenderdigital.co',
      },
    ],
  },
  openQuestion:
    'What are the Route 1 space’s size, asking rent, lease type (NNN or gross), term, personal-guarantee requirement and tenant-improvement allowance?',
  stances: [
    { seat: 'industry_expert', stance: 'oppose' },
    { seat: 'ai_tools_expert', stance: 'oppose' },
    { seat: 'realist', stance: 'conditional' },
    { seat: 'strategist', stance: 'oppose' },
    { seat: 'devils_advocate', stance: 'oppose' },
  ],
  openings: BAKERY_OPENINGS,
  rebuttals: [
    {
      seat: 'devils_advocate',
      target: 'strategist',
      text: 'The Route 1 space may be leased quickly (unverified), and nothing shows a comparable space will appear in 6-12 months. Waiting trades a known option for a guess.',
    },
    {
      seat: 'strategist',
      target: 'devils_advocate',
      text: 'Right, and the lock-in is the real cost. But a Route 1 lease might be negotiable on term or guarantee, which an attorney should test (F12).',
    },
    {
      seat: 'ai_tools_expert',
      target: 'industry_expert',
      text: 'Own-channel delivery still costs the $6.99 courier fee and 2.9% plus $0.30 card fees (F8, F9). Charge the customer the delivery fee, or small orders lose money.',
    },
    {
      seat: 'realist',
      target: 'strategist',
      text: 'A lost lease is recoverable. A personal guarantee on a 5-10 year NNN lease (F12) is not. Protecting the first store comes first.',
    },
  ],
  verdict: {
    decision: 'Pilot',
    confidence: 78,
    headline: BAKERY_HEADLINE,
    why: 'A second site likely costs $150,000-$500,000 against your $90,000, and it would need its own certified food manager. A 5-10 year lease may carry personal guarantees. Own-channel Square delivery is cheap and reversible.',
    dissent: {
      seat: 'devils_advocate',
      text: 'Waiting may lose Route 1 for good, and nothing shows a comparable space will appear in 6-12 months.',
    },
    conditions: [
      'Route 1 terms are learned before any commitment: size, rent, NNN or gross, term, personal guarantee, allowance and build-out status.',
      'The six-month runway is not spent on a build-out or lease deposit before a manager is in place.',
    ],
    steps: [
      { when: 'This week', action: 'Turn on Square Online on the Free tier ($0/mo) for pickup. Set delivery with the courier fee passed to the customer.' },
      { when: 'Next 30 days', action: 'Book a free, confidential session with the Maryland SBDC to review your cash, the Route 1 numbers and financing options.' },
    ],
    escalate: 'An attorney, to review any Route 1 lease before you sign.',
  },
  lines: {
    industry_expert: 'A second store needs far more than $90,000, and your first store has no manager while you bake every morning.',
    ai_tools_expert: 'Add commission-free Square Online delivery now, then reconsider a smaller or second-generation space in 6-12 months.',
    realist: 'Your six months of savings is your safety net, and a new lease could use it up fast.',
    strategist: 'Delivery volume may pull the same owner-baker away from the ovens. Hire before any channel scales.',
    devils_advocate: said(BAKERY_OPENINGS, 'devils_advocate'),
    chairman: BAKERY_HEADLINE,
  },
}

/** public/replays/hvac-ai-promo-texts.sse. Recorded without web access, so no fact has a source. */
const HVAC_OPENINGS: Said[] = [
  {
    seat: 'industry_expert',
    text: 'A four-tech shop cannot handle a massive influx of calls from a total list blast. Segment your list and roll out texts in phases.',
  },
  {
    seat: 'realist',
    text: 'You must verify written consent before sending texts. An unverified TCPA violation carries steep fines.',
  },
  {
    seat: 'devils_advocate',
    text: 'Blasting your entire customer list next week will overwhelm your four technicians. You risk compliance fines, missed calls, and angry customers.',
  },
]

const HVAC_REBUTTALS: FeaturedSession['rebuttals'] = [
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

const HVAC_HEADLINE = 'Pilot a small, segmented text campaign using Housecall Pro after verifying customer consent.'

const HVAC: FeaturedSession = {
  replay: 'hvac-ai-promo-texts',
  label: 'HVAC · AI promo texts',
  short: 'HVAC',
  noun: 'HVAC',
  place: 'HVAC · Frederick, MD',
  pill: { long: 'An HVAC shop takes AI promo texts to the board', short: 'HVAC shop · AI promo texts' },
  intake: SCENARIOS.find((s) => s.id === 'hvac-ai-promo-texts')!.intake,
  facts: {
    total: 7,
    verified: 0,
    excerpts: [
      {
        id: 'F1',
        claim:
          'Under the TCPA, sending marketing text messages requires prior express written consent; violations carry penalties up to $500 to $1,500 per message.',
        source: null,
      },
      {
        id: 'F2',
        claim: 'Housecall Pro, the company’s current software, includes built-in customer marketing and automated text messaging.',
        source: null,
      },
      {
        id: 'F3',
        claim:
          'A sudden mass text blast to an entire customer list could generate a surge in demand that exceeds a 4-technician schedule, leading to missed calls.',
        source: null,
      },
      {
        id: 'F4',
        claim: 'Dedicated AI marketing and SMS automation tools typically range from $50 to over $200 per month, within or slightly over the $150/month budget.',
        source: null,
      },
    ],
  },
  openQuestion: 'What percentage of the past customer database has provided explicit written consent to receive marketing text messages?',
  stances: [
    { seat: 'industry_expert', stance: 'conditional' },
    { seat: 'ai_tools_expert', stance: 'conditional' },
    { seat: 'realist', stance: 'conditional' },
    { seat: 'strategist', stance: 'conditional' },
    { seat: 'devils_advocate', stance: 'oppose' },
  ],
  openings: HVAC_OPENINGS,
  rebuttals: HVAC_REBUTTALS,
  verdict: {
    decision: 'Pilot',
    confidence: 90,
    headline: HVAC_HEADLINE,
    why: 'Blasting the whole list next week would overwhelm four technicians and risk TCPA penalties. Housecall Pro can send a small, phased test batch to customers who have opted in.',
    dissent: {
      seat: 'devils_advocate',
      text: 'Even a phased campaign violates federal law and risks bankruptcy if you text customers who have not provided explicit written consent.',
    },
    conditions: [
      'Your Housecall Pro tier includes automated SMS without fees beyond the $150 monthly budget.',
      'Everyone in the test batch has given express consent to marketing texts.',
    ],
    steps: [
      { when: 'This week', action: 'Check your Housecall Pro tier for automated SMS. Have an attorney review consent for TCPA compliance.' },
      { when: 'Next 30 days', action: 'Pilot the text to a phased batch of 50 past customers.' },
    ],
    escalate: 'An attorney, to confirm prior express written consent under the TCPA.',
  },
  lines: {
    industry_expert: said(HVAC_OPENINGS, 'industry_expert'),
    ai_tools_expert: said(HVAC_REBUTTALS, 'ai_tools_expert'),
    realist: said(HVAC_OPENINGS, 'realist'),
    strategist: said(HVAC_REBUTTALS, 'strategist'),
    devils_advocate: said(HVAC_OPENINGS, 'devils_advocate'),
    chairman: HVAC_HEADLINE,
  },
}

/** The demo-video meeting first: it is the home page's default. */
export const FEATURED: FeaturedSession[] = [BAKERY, HVAC]
