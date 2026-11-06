// Every face either page sets in its first view. Loading them up front keeps text from reflowing after paint.
const FACES = [
  '600 1em "Fraunces Variable"',
  '400 1em "Instrument Sans Variable"',
  '400 1em "Courier Prime"',
  '400 1em "Schibsted Grotesk Variable"',
  '600 1em "Schibsted Grotesk Variable"',
]
const CAP_MS = 900

let ready: Promise<void> | undefined

/** Resolves once the faces have loaded, or after 900 ms, whichever comes first. Never rejects. */
export function whenFontsReady(): Promise<void> {
  if (!ready) {
    const { promise, resolve } = Promise.withResolvers<void>()
    setTimeout(resolve, CAP_MS)
    Promise.all(FACES.map((font) => document.fonts.load(font))).then(() => resolve(), () => resolve())
    ready = promise
  }
  return ready
}
