import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Fact } from '../types'

interface FactState {
  facts: Fact[]
  active: number | null
  /** `pinned` is set by click/tap so touch users can read the fact; hover/focus set it transiently. */
  pinned: boolean
  setActive: (n: number | null, pinned?: boolean) => void
}

const FactContext = createContext<FactState>({ facts: [], active: null, pinned: false, setActive: () => {} })

export function FactProvider({ facts, children }: { facts: Fact[]; children: ReactNode }) {
  const [active, setActiveState] = useState<number | null>(null)
  const [pinned, setPinned] = useState(false)
  const value = useMemo<FactState>(
    () => ({
      facts,
      active,
      pinned,
      setActive: (n, pin = false) => {
        setActiveState(n)
        setPinned(n !== null && pin)
      },
    }),
    [facts, active, pinned],
  )
  return <FactContext.Provider value={value}>{children}</FactContext.Provider>
}

export const useFacts = () => useContext(FactContext)

export const factId = (n: number) => `fact-${n}`

function FactRef({ n, label }: { n: number; label: string }) {
  const { active, pinned, setActive } = useFacts()
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
      onClick={() => setActive(on && pinned ? null : n, true)}
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
