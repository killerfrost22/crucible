import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { HumanError } from '../lib/errors'
import { factId, hostOf, SourceLink, SourceTag, useFacts } from './facts'
import { EASE_OUT } from './motion'

interface ErrorNoticeProps {
  error: HumanError
  /** Some of the meeting came back and stays on the page. */
  kept: boolean
  onRetry?: () => void
  onEdit?: () => void
  onReplay: () => void
}

export function ErrorNotice({ error, kept, onRetry, onEdit, onReplay }: ErrorNoticeProps) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ref.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
  }, [])
  return (
    <motion.section
      ref={ref}
      className="notice"
      data-kind={error.kind}
      role="alert"
      aria-labelledby="notice-title"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
    >
      <p className="kicker notice__kicker">{!kept ? 'Meeting didn’t start' : error.kind === 'quota' ? 'Meeting paused' : 'Meeting interrupted'}</p>
      <h2 id="notice-title" className="notice__title">
        {error.title}
      </h2>
      <p className="notice__body">
        {error.body}
        {kept && ' Everything the board finished is still on this page.'}
      </p>
      <div className="notice__actions">
        {error.kind !== 'quota' && onRetry && (
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            Try again
          </button>
        )}
        <button type="button" className={error.kind === 'quota' || !onRetry ? 'btn btn--primary' : 'btn btn--secondary'} onClick={onReplay}>
          Watch a recorded session
        </button>
        {error.kind === 'quota' && onRetry && (
          <button type="button" className="btn btn--secondary" onClick={onRetry}>
            Try again
          </button>
        )}
        {onEdit && (
          <button type="button" className="btn btn--quiet" onClick={onEdit}>
            Edit my question
          </button>
        )}
      </div>
      <details className="notice__detail">
        <summary>Technical details</summary>
        <pre>{error.detail}</pre>
      </details>
    </motion.section>
  )
}

/**
 * When the cited fact is off-screen (always on small screens), show it in a strip at the bottom. Pinned from the
 * keyboard, the strip takes focus so "Open source" is one Tab away; Escape, ✕ or tabbing out returns to the chip.
 */
export function FactPeek() {
  const { facts, active, setActive, pinned, opener } = useFacts()
  const [offscreen, setOffscreen] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (active === null) return
    const el = document.getElementById(factId(active))
    if (!el) return
    const r = el.getBoundingClientRect()
    setOffscreen(r.bottom < 72 || r.top > window.innerHeight - 24)
  }, [active])

  const close = useCallback(() => {
    setActive(null)
    opener.current?.focus()
    opener.current = null
  }, [setActive, opener])

  useEffect(() => {
    if (!pinned) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pinned, close])

  const fact = active !== null ? facts[active - 1] : undefined
  const shown = Boolean(fact && offscreen)

  useEffect(() => {
    if (shown && pinned && opener.current) ref.current?.querySelector<HTMLElement>('a[href], button')?.focus()
  }, [shown, pinned, active, opener])

  // The strip sits at the end of the page, so tabbing past either end goes back to the chip instead of the page footer.
  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Tab' || !opener.current) return
    const stops = [...e.currentTarget.querySelectorAll<HTMLElement>('a[href], button')]
    const leaving = e.shiftKey ? document.activeElement === stops[0] : document.activeElement === stops.at(-1)
    if (!leaving) return
    e.preventDefault()
    close()
  }

  return (
    <AnimatePresence>
      {shown && fact && (
        <motion.aside
          ref={ref}
          className="peek"
          aria-label={`Fact F${active}`}
          onKeyDown={onKeyDown}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
        >
          <p className="peek__n">F{active}</p>
          <div className="peek__body">
            <p className="peek__claim">{fact.claim}</p>
            <p className="peek__src">
              <SourceTag fact={fact} />
              {hostOf(fact.source) && <SourceLink source={fact.source} label="Open source" />}
            </p>
          </div>
          {pinned && (
            <button type="button" className="peek__close" onClick={close} aria-label="Close fact">
              ✕
            </button>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
