import { createContext, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { Fact } from '../types'

interface FactState {
  facts: Fact[]
  active: number | null
  /** `pinned` is set by click/tap so touch users can read the fact; hover/focus set it transiently. */
  pinned: boolean
  setActive: (n: number | null, pinned?: boolean) => void
  /** The chip that pinned the fact from the keyboard: the peek takes focus from it and hands it back on close. */
  opener: RefObject<HTMLElement | null>
}

const FactContext = createContext<FactState>({
  facts: [],
  active: null,
  pinned: false,
  setActive: () => {},
  opener: { current: null },
})

export function FactProvider({ facts, children }: { facts: Fact[]; children: ReactNode }) {
  const [active, setActiveState] = useState<number | null>(null)
  const [pinned, setPinned] = useState(false)
  const opener = useRef<HTMLElement | null>(null)
  const value = useMemo<FactState>(
    () => ({
      facts,
      active,
      pinned,
      setActive: (n, pin = false) => {
        setActiveState(n)
        setPinned(n !== null && pin)
      },
      opener,
    }),
    [facts, active, pinned],
  )
  return <FactContext.Provider value={value}>{children}</FactContext.Provider>
}

export const useFacts = () => useContext(FactContext)

export const factId = (n: number) => `fact-${n}`
/** The same fact in the decision brief's source list. */
export const briefFactId = (n: number) => `brief-fact-${n}`

/** `https://www.example.gov/x` → `example.gov`; anything that isn't an http(s) URL → null, shown as plain text. */
export function hostOf(source: string): string | null {
  if (!/^https?:\/\//.test(source)) return null
  try {
    return new URL(source).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

const DAY = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

type Tone = 'ok' | 'warn' | 'bad' | 'none'

/**
 * What Crucible can honestly say about where a fact came from. "Link checked" means the page opened when the server
 * tried it (backend `check_sources`); nobody has checked that the page says what the claim says.
 */
function sourceStatus(fact: Fact): { tag: string; tone: Tone } {
  if (!fact.source) return { tag: 'No source', tone: 'none' }
  if (!hostOf(fact.source)) return { tag: 'Named source', tone: 'none' }
  const check = fact.check
  if (!check) return { tag: 'Source found', tone: 'none' }
  if (check.status === 'ok') return { tag: `Link checked ${DAY.format(new Date(check.checked_at))}`, tone: 'ok' }
  if (check.status === 'broken') return { tag: 'Link broken', tone: 'bad' }
  return { tag: 'Couldn’t open link', tone: 'warn' }
}

export function SourceTag({ fact }: { fact: Fact }) {
  const { tag, tone } = sourceStatus(fact)
  return (
    <span className="fact__tag" data-tone={tone}>
      {tag}
    </span>
  )
}

/** The fact's source as a link (host only) when it is a URL, else as the publication's name. */
export function SourceLink({ source, label }: { source: string; label?: string }) {
  const host = hostOf(source)
  if (!host) return <>{source}</>
  return (
    <a href={source} target="_blank" rel="noreferrer">
      {label ?? host}
      {label && <span className="fact__host"> {host}</span>}
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  )
}

function FactRef({ n, label }: { n: number; label: string }) {
  const { active, pinned, setActive, opener } = useFacts()
  const on = active === n
  return (
    <button
      type="button"
      className="fref"
      data-active={on || undefined}
      aria-describedby={factId(n)}
      aria-pressed={on && pinned}
      onMouseEnter={() => !pinned && setActive(n)}
      onMouseLeave={() => !pinned && setActive(null)}
      onFocus={() => !pinned && setActive(n)}
      onBlur={() => !pinned && setActive(null)}
      onClick={(e) => {
        const pin = !(on && pinned)
        // `detail` is 0 when Enter or Space pressed the button rather than a pointer.
        opener.current = pin && e.detail === 0 ? e.currentTarget : null
        setActive(pin ? n : null, true)
      }}
    >
      {label}
    </button>
  )
}

/** Renders text with every in-range `F3`-style citation turned into a cross-highlighting chip. */
export function FactText({ text }: { text: string }) {
  const { facts } = useFacts()
  const parts: ReactNode[] = []
  const pattern = /\bF(\d{1,2})\b/g
  let last = 0
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const n = Number(match[1])
    if (n < 1 || n > facts.length) continue
    // Glue opening/closing punctuation to the chip so "(F4)." never breaks across lines.
    const before = /[(\[“"'‘]*$/.exec(text.slice(last, match.index))![0]
    const end = match.index + match[0].length
    const after = /^[)\],.;:!?”"'’]*/.exec(text.slice(end))![0]
    parts.push(
      text.slice(last, match.index - before.length),
      <span key={match.index} className="fref-wrap">
        {before}
        <FactRef n={n} label={match[0]} />
        {after}
      </span>,
    )
    last = end + after.length
    pattern.lastIndex = last
  }
  parts.push(text.slice(last))
  return <>{parts}</>
}
