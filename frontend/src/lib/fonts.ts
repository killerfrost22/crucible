// Every face either page sets in its first view. Loading them up front keeps text from reflowing after paint.
const FACES = [
  '400 1em "Schibsted Grotesk Variable"',
  '600 1em "Schibsted Grotesk Variable"',
  '500 1em "Geist Mono Variable"',
]
const CAP_MS = 900

let ready: Promise<void> | undefined

/** Resolves once the faces have loaded, or after 900 ms, whichever comes first. Never rejects. */
export function whenFontsReady(): Promise<void> {
  // Executor form on purpose: this runs before React mounts, and `Promise.withResolvers` (Safari 17.4+) would blank the
  // page on older iPhones.
  ready ??= new Promise<void>((resolve) => {
    setTimeout(resolve, CAP_MS)
    Promise.all(FACES.map((font) => document.fonts.load(font))).then(() => resolve(), () => resolve())
  })
  return ready
}
