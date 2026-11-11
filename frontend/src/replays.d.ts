// The virtual modules served by frontend/replaysPlugin.ts from public/replays/*.sse.
// An ambient module can't hold a relative `import` declaration; import types are allowed.

declare module 'virtual:crucible-replays' {
  /** Every file in public/replays/, by name. */
  export const RECORDINGS: Record<string, import('./lib/recording').RecordingMeta>
}

/** One recording's content, `virtual:crucible-replays/<name>`. */
declare module 'virtual:crucible-replays/*' {
  type Data = import('./lib/recording').RecordingData
  export const intake: Data['intake']
  export const evidenceMode: Data['evidenceMode']
  export const facts: Data['facts']
  export const claims: Data['claims']
  export const openQuestions: Data['openQuestions']
  export const round1: Data['round1']
  export const round2: Data['round2']
  export const rebuttals: Data['rebuttals']
  export const checks: Data['checks']
  export const verdict: Data['verdict']
  export const rationale: Data['rationale']
  export const dissent: Data['dissent']
  export const conditions: Data['conditions']
  export const nextSteps: Data['nextSteps']
  export const escalationReason: Data['escalationReason']
  export const stream: Data['stream']
}

/** The home page's quotes from one recording, `virtual:crucible-featured/<name>`. */
declare module 'virtual:crucible-featured/*' {
  const quotes: import('./lib/featured').FeaturedQuotes
  export default quotes
}
