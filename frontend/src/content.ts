// Real session content for the home page, shortened from the recorded meetings in public/replays/ but not reworded:
// whole sentences are kept or dropped, and (Fn) citations are dropped from the verdict excerpts. Re-recorded Nov 10.
// MEMBERS is also used by the under-the-hood page.
import type { SourceCheck } from './types'
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
  lines: Record<MemberId, string>
}

const said = (list: Said[], seat: SeatId) => list.find((m) => m.seat === seat)!.text

/** public/replays/bakery-second-location.sse, recorded Nov 10. */
const BAKERY_OPENINGS: Said[] = [
  {
    seat: 'industry_expert',
    text: 'Opening now would put most of your $90,000 savings into build-out and rent before you know the first store’s real profit. Your first store also has no manager while you bake every morning.',
  },
  {
    seat: 'realist',
    text: 'Opening a second store now would use most of your $90,000 savings, which is the cushion protecting your first store. You also have no manager, and a second store needs its own permit and certified manager coverage (F7).',
  },
  {
    seat: 'devils_advocate',
    text: 'Opening a second store now would put most of your $90,000 cushion at risk. Your first store’s real profit after your own pay is unknown.',
  },
]

const BAKERY_HEADLINE = 'Don’t sign Route 1 now; run a 90-day manager and delivery test first.'

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
    sourced: 13,
    checked: 12,
    excerpts: [
      {
        id: 'F1',
        claim:
          'A second retail bakery location is commonly estimated at $75K to $200K, and bakery startup costs overall at $50K to $250K. The lower end of that range is close to the owner’s $90,000 in savings.',
        source: 'primerates.com',
        status: 'ok',
      },
      {
        id: 'F4',
        claim:
          'A LoopNet listing for a 1,425 SF retail suite on Route 1 (Baltimore Ave) in College Park asks $25/SF/yr plus all utilities. That is roughly $35,600 a year, or about $2,970 a month, in base rent.',
        source: 'loopnet.com',
        status: 'unreachable',
      },
      {
        id: 'F7',
        claim:
          'A certified food service manager must be on duty during all hours of operation. A second storefront would need its own permit and certified manager coverage, which matters because the owner has no manager.',
        source: 'dcfoodhandlers.com',
        status: 'ok',
      },
    ],
  },
  openQuestion:
    'What are the Route 1 space’s square footage, rent type (NNN or gross), lease term, personal guarantee, rent-free build-out period and landlord tenant-improvement allowance?',
  stances: [
    { seat: 'industry_expert', stance: 'oppose' },
    { seat: 'ai_tools_expert', stance: 'oppose' },
    { seat: 'realist', stance: 'conditional' },
    { seat: 'strategist', stance: 'conditional' },
    { seat: 'devils_advocate', stance: 'oppose' },
  ],
  openings: BAKERY_OPENINGS,
  rebuttals: [
    {
      seat: 'devils_advocate',
      target: 'strategist',
      text: 'Those three conditions may never line up, and the space may leave while you wait. A bar that may never be met is a quiet no, not a plan.',
    },
    {
      seat: 'strategist',
      target: 'devils_advocate',
      text: 'At $150K the savings math fails, so the cost cap matters most. Get the landlord’s allowance and the total five-year cost in writing before deciding (open question; attorney to confirm).',
    },
    {
      seat: 'ai_tools_expert',
      target: 'industry_expert',
      text: 'Right that Square online avoids commissions, but a third-party courier still charges per delivery (F13). Run both channels side by side to learn real demand and margin, not just cost.',
    },
    {
      seat: 'realist',
      target: 'industry_expert',
      text: 'Agreed, but make it a hard gate. Do not sign until profit after owner pay and a cash cushion are documented, using real numbers from the first store.',
    },
  ],
  verdict: {
    decision: 'Pilot',
    confidence: 72,
    headline: BAKERY_HEADLINE,
    why: 'A second store could take most of your $90,000 savings and add about $2,970 a month in rent. You have no manager, and a second store needs its own permit and a certified manager on duty. Test delivery cheaply, put a manager in place, and learn the first store’s true profit.',
    dissent: {
      seat: 'devils_advocate',
      text: 'Waiting 90 days may lose the Route 1 space, and a Square-only test mostly reaches existing customers. It shows little about whether a second store would work.',
    },
    conditions: [
      'First store nets positive after your own pay for about three months running, with a documented cash cushion.',
      'An attorney reviews the lease, including any personal guarantee, deposit and five-year term, before you sign.',
    ],
    steps: [
      { when: 'This week', action: 'Pull the last 12 months of sales from Square and your costs. Book a free session with the Maryland SBDC to review the numbers.' },
      { when: 'Next 30 days', action: 'Start finding a manager or head baker. Enroll a current employee in the 16-hour certified food service manager course.' },
    ],
    escalate: 'An attorney, to review the lease terms before you sign.',
  },
  lines: {
    industry_expert: 'Opening now would put most of your $90,000 savings into build-out and rent before you know the first store’s real profit.',
    ai_tools_expert: 'Run both channels side by side to learn real demand and margin, not just cost.',
    realist: 'Opening a second store now would use most of your $90,000 savings, which is the cushion protecting your first store.',
    strategist: 'Signing now would commit most of your $90K savings and a multi-year lease before you know if the first store can run without you.',
    devils_advocate: 'Waiting risks the Route 1 space and buys little real information.',
    chairman: BAKERY_HEADLINE,
  },
}

/** public/replays/hvac-ai-promo-texts.sse, recorded Nov 10 with web search on. */
const HVAC_OPENINGS: Said[] = [
  {
    seat: 'industry_expert',
    text: 'A one-week text blast to every past customer is risky. It can overbook your 4 technicians, creates legal exposure if consent is unclear, and can trigger carrier filtering.',
  },
  {
    seat: 'realist',
    text: 'A whole-list text blast carries real legal and capacity risk. Texting needs documented consent (F1), and a full-list send can overbook four technicians (F4).',
  },
  {
    seat: 'devils_advocate',
    text: 'A one-week text blast to every past customer risks legal trouble, carrier blocking, and overbooking your four technicians. Consent records are unknown.',
  },
]

const HVAC_REBUTTALS: FeaturedSession['rebuttals'] = [
  {
    seat: 'devils_advocate',
    target: 'industry_expert',
    text: 'The trickle is the problem. Up to 10 texts a day is about 50 a week, and it is SMS-only (F3). That cannot fill a schedule before the season turns.',
  },
  {
    seat: 'strategist',
    target: 'devils_advocate',
    text: 'Unverified and uncited. The sharper margin risk is the offer itself: generic discounts train customers to wait for sales (F8).',
  },
  {
    seat: 'ai_tools_expert',
    target: 'devils_advocate',
    text: 'Those controls do not check marketing consent. The tool helps with pacing, not with the legal gate.',
  },
  {
    seat: 'realist',
    target: 'industry_expert',
    text: 'Agreed on the substance. I still hold block on whole-list texting until consent is shown, because the legal exposure (F1, F11) comes before capacity.',
  },
]

const HVAC_HEADLINE = 'Don’t blast the list; pilot consented, capacity-sized waves using Housecall Pro first.'

const HVAC: FeaturedSession = {
  replay: 'hvac-ai-promo-texts',
  label: 'HVAC · AI promo texts',
  short: 'HVAC',
  noun: 'HVAC',
  place: 'HVAC · Frederick, MD',
  pill: { long: 'An HVAC shop takes AI promo texts to the board', short: 'HVAC shop · AI promo texts' },
  intake: SCENARIOS.find((s) => s.id === 'hvac-ai-promo-texts')!.intake,
  facts: {
    total: 12,
    sourced: 9,
    checked: 5,
    excerpts: [
      {
        id: 'F1',
        claim:
          'Marketing texts generally require prior express written consent under TCPA rules. A TCPA violation is a legal risk for a whole-list blast to an older list.',
        source: 'usemetron.com',
        status: 'unreachable',
      },
      {
        id: 'F3',
        claim:
          'Housecall Pro, which the owner already uses, has an Automated Texts feature in its Marketing Center. It is built for a steady trickle rather than a one-week blast of the whole list.',
        source: 'help.housecallpro.com',
        status: 'ok',
      },
      {
        id: 'F4',
        claim: 'Reactivation guidance is to send 2-3 weeks before the slow period, in small waves sized to open capacity. A full-list blast risks overbooking a 4-technician team.',
        source: 'usemetron.com',
        status: 'unreachable',
      },
      {
        id: 'F10',
        claim:
          'No vendor pricing page was retrieved in this session for Housecall Pro, ServiceTitan, Ignitvio or others, so no current plan or monthly price is verified.',
        source: null,
        status: null,
      },
    ],
  },
  openQuestion:
    'How many customers are on the list, and how was each phone number collected? Is there documented consent to receive marketing texts, or only service-related contact?',
  stances: [
    { seat: 'industry_expert', stance: 'oppose' },
    { seat: 'ai_tools_expert', stance: 'oppose' },
    { seat: 'realist', stance: 'conditional' },
    { seat: 'strategist', stance: 'oppose' },
    { seat: 'devils_advocate', stance: 'oppose' },
  ],
  openings: HVAC_OPENINGS,
  rebuttals: HVAC_REBUTTALS,
  verdict: {
    decision: 'Pilot',
    confidence: 76,
    headline: HVAC_HEADLINE,
    why: 'Every seat opposed the whole-list blast, and the reasons held up. Marketing texts need documented consent, and a blast can overbook four technicians. Housecall Pro already has a paced, reviewed text tool you may not need to pay extra for.',
    dissent: {
      seat: 'devils_advocate',
      text: 'The safe plan may be too slow. Waiting on audits could leave slots empty.',
    },
    conditions: [
      'Each number texted has documented consent to receive marketing texts. Anyone without it gets email only.',
      'Dispatch confirms the open tune-up slots before each wave, and each wave is sized to them.',
    ],
    steps: [
      { when: 'This week', action: 'Export the customer list from Housecall Pro. Mark anyone without proof as email-only.' },
      { when: 'Next 30 days', action: 'Send wave one to consented agreement members with unused visits, with a specific reason to book. Email the non-consented customers in a separate wave.' },
    ],
    escalate: 'An attorney, to confirm text-marketing consent and whether Maryland rules are stricter.',
  },
  lines: {
    industry_expert: 'Use small segmented waves to customers with documented consent, email the rest, and size each wave to open tune-up slots.',
    ai_tools_expert: 'The tool helps with pacing, not with the legal gate.',
    realist: said(HVAC_OPENINGS, 'realist'),
    strategist: 'Start with a small segment that has documented consent, sized to open slots, and use Housecall Pro’s built-in tools.',
    devils_advocate: 'Staged waves may arrive too late to fill fall slots.',
    chairman: HVAC_HEADLINE,
  },
}

/** The demo-video meeting first: it is the home page's default. */
export const FEATURED: FeaturedSession[] = [BAKERY, HVAC]
