import type { Decision } from '../types'

/** The Chairman's four answers, as stamped on the verdict and listed under Your decisions. */
export const DECISION_COPY: Record<Decision, { stamp: string; gloss: string }> = {
  proceed: { stamp: 'Proceed', gloss: 'Go ahead.' },
  pilot: { stamp: 'Pilot', gloss: 'Try it small first.' },
  defer: { stamp: 'Defer', gloss: 'Not yet.' },
  reject: { stamp: 'Reject', gloss: "Don't do it." },
}
