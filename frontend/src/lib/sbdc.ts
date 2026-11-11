/**
 * Free small-business help, routed by where the business is. Crucible was built and tested on Maryland businesses, so
 * Maryland gets its own SBDC; anywhere else (or no location) gets America's SBDC locator, which covers every state.
 */
export interface Sbdc {
  name: string
  url: string
}

/** `name` reads after "help at": "help at the Maryland SBDC", "help at your local SBDC". */
export const MARYLAND_SBDC: Sbdc = { name: 'the Maryland SBDC', url: 'https://www.marylandsbdc.org/' }
export const FIND_YOUR_SBDC: Sbdc = { name: 'your local SBDC', url: 'https://americassbdc.org/find-your-sbdc/' }

/** "Silver Spring, Maryland", "College Park, MD", "Baltimore MD 21201" → Maryland; anything else → the locator. */
export function sbdcFor(location: string | undefined): Sbdc {
  return location && (/\bmaryland\b/i.test(location) || /\bMD\b/.test(location)) ? MARYLAND_SBDC : FIND_YOUR_SBDC
}
