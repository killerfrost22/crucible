// Real session content for the home page. The quotes are selected from the recorded meetings in public/replays/ when the
// site is built (lib/featured.ts, served by replaysPlugin.ts), so a re-recorded file updates every quote. They are
// shortened but not reworded: whole leading sentences are kept and the rest dropped, (Fn) citations are dropped from the
// verdict excerpts and the board-card lines, and straight quotes are set as curly ones. Only the labels below are
// written by hand. MEMBERS is also used by the under-the-hood page.
import bakery from 'virtual:crucible-featured/bakery-second-location'
import hvac from 'virtual:crucible-featured/hvac-ai-promo-texts'
import type { FeaturedQuotes } from './lib/featured'
import { SEATS } from './seats'
import type { SeatId } from './types'

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

/** A recorded meeting the home page walks through: the showcase, the board cards and the example verdict. */
export interface FeaturedSession extends FeaturedQuotes {
  /** Replay name in public/replays/. */
  replay: string
  /** Session switch label: full, and short for narrow screens. */
  label: string
  short: string
  /** The business in running text, e.g. "the recorded bakery meeting". */
  noun: string
  place: string
  pill: { long: string; short: string }
}

/** The demo-video meeting first: it is the home page's default. */
export const FEATURED: FeaturedSession[] = [
  {
    replay: 'bakery-second-location',
    label: 'Bakery · second location',
    short: 'Bakery',
    noun: 'bakery',
    place: 'Bakery · College Park, MD',
    pill: { long: 'A bakery owner takes a second store to the board', short: 'Bakery · second location' },
    ...bakery,
  },
  {
    replay: 'hvac-ai-promo-texts',
    label: 'HVAC · AI promo texts',
    short: 'HVAC',
    noun: 'HVAC',
    place: 'HVAC · Frederick, MD',
    pill: { long: 'An HVAC shop takes AI promo texts to the board', short: 'HVAC shop · AI promo texts' },
    ...hvac,
  },
]
