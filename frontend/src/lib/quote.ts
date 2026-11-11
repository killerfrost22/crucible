// Shortening rules for text quoted from the recorded meetings (public/replays/). A quote is shortened but never
// reworded: whole leading sentences are kept and the rest dropped, `(F3)`-style citations may be dropped, and straight
// quotes are set as curly ones.

/** A period that ends one of these doesn't end the sentence. */
const ABBREVIATION = /(?:^|[\s(])(?:e\.g|i\.e|vs|approx|Mr|Mrs|Ms|Dr|St|No|Inc|Co|U\.S)\.$/

/** Splits prose at `.`, `!` or `?` (and any closing quote or bracket) followed by space and a capital, digit or opening quote. */
export function sentences(text: string): string[] {
  const out: string[] = []
  let start = 0
  for (const m of text.matchAll(/[.!?]['"’”)\]]*\s+(?=[A-Z0-9$“‘"'(])/g)) {
    const end = m.index + m[0].trimEnd().length
    if (ABBREVIATION.test(text.slice(start, end))) continue
    out.push(text.slice(start, end))
    start = m.index + m[0].length
  }
  const rest = text.slice(start).trim()
  if (rest) out.push(rest)
  return out
}

/** Drops parentheses that hold only fact IDs, e.g. "(F3)" or "(F1, F11)". */
export const uncite = (text: string) => text.replace(/\s*\(F\d+(?:,\s*F\d+)*\)/g, '')

/** Straight quotes and apostrophes as typographic ones: don't → don’t, 'x' → ‘x’, "x" → “x”. */
export const typeset = (text: string) =>
  text
    .replace(/([\w.,!?])'/g, '$1’')
    .replace(/'/g, '‘')
    .replace(/(^|[\s(])"/g, '$1“')
    .replace(/"/g, '”')

/**
 * The first `max` whole sentences of `text`, stopping early once the next one would pass `chars` (the first sentence is
 * always kept), typeset.
 */
export function lead(text: string, max: number, chars = Infinity): string {
  const kept: string[] = []
  let length = 0
  for (const s of sentences(text)) {
    if (kept.length === max || (kept.length && length + 1 + s.length > chars)) break
    kept.push(s)
    length += (kept.length > 1 ? 1 : 0) + s.length
  }
  return typeset(kept.join(' '))
}
