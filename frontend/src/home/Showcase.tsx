import { memo, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { CHAIRMAN, HVAC_FACTS, MEMBERS, MOCK_STANCES, MOCK_THREAD, REBUTTALS, VERDICT } from '../content'
import { SEAT_BY_ID, STANCE_LABEL } from '../seats'
import type { SeatId, Stance } from '../types'
import { HVAC_FACT_EXCERPTS, HVAC_INTAKE, HVAC_OPEN_QUESTION, STEPS } from './homeContent'
import { Arrow } from './icons'
import { prefersReducedMotion, useReducedMotion } from './useReducedMotion'

/** How long each step stays on screen while the tour plays. Mirrored by `--hm-tour` in home.css. */
const STEP_MS = 7000

const k = (color: string) => ({ '--k': color }) as CSSProperties
const seatColor = (id: SeatId) => `var(--seat-${id})`

function Who({ seat }: { seat: SeatId }) {
  return (
    <span className="hm-who" style={k(seatColor(seat))}>
      {SEAT_BY_ID[seat].title}
    </span>
  )
}

function StanceTag({ stance }: { stance: Stance }) {
  return (
    <span className="hm-stance" data-stance={stance}>
      {STANCE_LABEL[stance]}
    </span>
  )
}

function PanelHead({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <div className="hm-ph">
      <p className="hm-ph__title">{title}</p>
      {meta && <p className="hm-ph__meta">{meta}</p>}
    </div>
  )
}

function AskPanel() {
  const p = HVAC_INTAKE.profile
  const profile = [p.industry, p.location, p.size, p.current_tools.join(' + '), p.budget, ...p.goals].filter(Boolean)
  return (
    <>
      <PanelHead title="New decision" meta="HVAC · Frederick, MD" />
      <div className="hm-ask-mock">
        <p className="hm-mlabel">What are you deciding?</p>
        <p className="hm-mbox hm-mbox--q">
          {HVAC_INTAKE.question}
          <span className="hm-caret" />
        </p>
        <p className="hm-mlabel">Which way are you leaning?</p>
        <p className="hm-mbox">{HVAC_INTAKE.leaning}</p>
        <p className="hm-mlabel">About your business</p>
        <ul className="hm-mchips">
          {profile.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
        <span className="hm-mbtn">
          Convene the board
          <Arrow />
        </span>
      </div>
    </>
  )
}

function ResearchPanel() {
  return (
    <>
      <PanelHead title="Evidence" meta={`${HVAC_FACTS} facts · general knowledge`} />
      <ol className="hm-facts">
        {HVAC_FACT_EXCERPTS.map((claim, i) => (
          <li key={claim}>
            <span className="hm-fid">F{i + 1}</span>
            <p>{claim}</p>
          </li>
        ))}
      </ol>
      <p className="hm-more">+ {HVAC_FACTS - HVAC_FACT_EXCERPTS.length} more facts. This recording ran without web access, so none carry a source link.</p>
      <div className="hm-openq">
        <p className="hm-mlabel">Open question</p>
        <p>{HVAC_OPEN_QUESTION}</p>
      </div>
    </>
  )
}

function PositionsPanel() {
  return (
    <>
      <PanelHead title="Round 1 · Opening positions" meta="Written blind, in parallel" />
      <div className="hm-pos">
        <ul className="hm-tally">
          {MOCK_STANCES.map((s) => (
            <li key={s.seat}>
              <Who seat={s.seat} />
              <StanceTag stance={s.stance} />
            </li>
          ))}
        </ul>
        <ul className="hm-thread">
          {MOCK_THREAD.map((m) => (
            <li key={m.seat} className="hm-msg" style={k(seatColor(m.seat))}>
              <p className="hm-msg__who">
                <Who seat={m.seat} />
              </p>
              <p className="hm-msg__text">{m.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

function RebuttalsPanel() {
  return (
    <>
      <PanelHead title="Round 2 · Rebuttals" meta="Seats answer each other by name" />
      <ul className="hm-thread hm-thread--wide">
        {REBUTTALS.map((r) => (
          <li key={r.seat} className="hm-msg" style={k(seatColor(r.seat))}>
            <p className="hm-msg__who">
              <Who seat={r.seat} />
              <span className="hm-msg__to" aria-label="replying to">
                →
              </span>
              <Who seat={r.target} />
            </p>
            <p className="hm-msg__text">{r.text}</p>
          </li>
        ))}
      </ul>
    </>
  )
}

function VerdictPanel() {
  return (
    <>
      <PanelHead
        title="The Chairman’s recommendation"
        meta={
          <span className="hm-who" style={k(CHAIRMAN.color)}>
            {CHAIRMAN.title}
          </span>
        }
      />
      <div className="hm-vmock">
        <div className="hm-vmock__top">
          <span className="hallmark-mark hm-vmock__mark">{VERDICT.decision}</span>
          <div className="hm-conf">
            <span>{VERDICT.confidence}% confident</span>
            <span className="hm-conf__bar" style={{ '--v': VERDICT.confidence / 100 } as CSSProperties} />
          </div>
        </div>
        <p className="hm-vmock__headline">{VERDICT.headline}</p>
        <div className="hm-vmock__cols">
          <div>
            <p className="hm-mlabel">Why</p>
            <p>{VERDICT.why}</p>
          </div>
          <div>
            <p className="hm-mlabel">Dissent</p>
            <p>
              <Who seat="devils_advocate" /> “{VERDICT.dissent}”
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

function CallPanel() {
  return (
    <>
      <PanelHead title="Your call" meta="The board advises. You decide." />
      <div className="hm-call">
        <div>
          <p className="hm-mlabel">Only if</p>
          <ul className="hm-checks">
            {VERDICT.conditions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="hm-mlabel">Next steps</p>
          <ul className="hm-steps-mock">
            {VERDICT.steps.map((s) => (
              <li key={s.when}>
                <span>{s.when}</span>
                {s.action}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="hm-mlabel">Ask</p>
          <p>{VERDICT.escalate}</p>
        </div>
        <div className="hm-call__btns">
          <span className="hm-mbtn">Accept</span>
          <span className="hm-mbtn hm-mbtn--ghost">Override</span>
        </div>
      </div>
    </>
  )
}

const PANELS: Record<string, () => ReactNode> = {
  ask: AskPanel,
  research: ResearchPanel,
  positions: PositionsPanel,
  rebuttals: RebuttalsPanel,
  verdict: VerdictPanel,
  call: CallPanel,
}

/**
 * The product showcase: one recorded session, step by step, in a mock of the meeting room. An auto-advancing tab
 * bar walks through it; any interaction with the tabs stops the tour, and it never starts under reduced motion.
 */
export const Showcase = memo(function Showcase() {
  const reduced = useReducedMotion()
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(() => !prefersReducedMotion())
  const [inView, setInView] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === 'visible')
  const elapsed = useRef(0)
  const frameRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (reduced) setPlaying(false)
  }, [reduced])

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    const onVis = () => setPageVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const running = playing && inView && !hovered && pageVisible

  // Advance after the step's remaining time; pausing banks the time already spent on it.
  useEffect(() => {
    if (!running) return
    const start = performance.now()
    let fired = false
    const id = window.setTimeout(
      () => {
        fired = true
        elapsed.current = 0
        setActive((a) => (a + 1) % STEPS.length)
      },
      Math.max(0, STEP_MS - elapsed.current),
    )
    return () => {
      window.clearTimeout(id)
      if (!fired) elapsed.current += performance.now() - start
    }
  }, [running, active])

  // Keep the active tab visible when the tab bar scrolls sideways on small screens (never scrolls the page).
  useEffect(() => {
    const list = listRef.current
    const tab = tabRefs.current[active]
    if (!list || !tab || list.scrollWidth <= list.clientWidth) return
    const left = tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2
    list.scrollTo({ left, behavior: reduced ? 'instant' : 'smooth' })
  }, [active, reduced])

  const choose = (i: number, focus = false) => {
    elapsed.current = 0
    setPlaying(false)
    setActive(i)
    if (focus) tabRefs.current[i]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const n = STEPS.length
    const next: Record<string, number> = { ArrowRight: (active + 1) % n, ArrowLeft: (active - 1 + n) % n, Home: 0, End: n - 1 }
    if (!(event.key in next)) return
    event.preventDefault()
    choose(next[event.key], true)
  }

  const step = STEPS[active]

  return (
    <div className="hm-show" style={{ '--accent': step.accent } as CSSProperties}>
      <div
        ref={frameRef}
        className="hm-win"
        onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <div className="hm-win__bar" aria-hidden="true">
          <span className="hm-win__lights">
            <i />
            <i />
            <i />
          </span>
          <span className="hm-win__title">HVAC company · AI promo texts</span>
          <span className="hm-win__badge">Recorded session</span>
        </div>
        <div className="hm-win__body">
          <aside className="hm-win__side" aria-hidden="true">
            <p className="hm-win__sidehead">Session</p>
            <ol className="hm-win__phases">
              {STEPS.map((s, i) => (
                <li key={s.id} data-state={i < active ? 'done' : i === active ? 'now' : 'next'}>
                  {s.label}
                </li>
              ))}
            </ol>
            <p className="hm-win__sidehead">Board</p>
            <ul className="hm-win__members">
              {MEMBERS.map((m) => (
                <li key={m.id} style={k(m.color)}>
                  {m.title}
                </li>
              ))}
            </ul>
          </aside>
          <div className="hm-win__main">
            {STEPS.map((s, i) => {
              const Panel = PANELS[s.id]
              const on = i === active
              return (
                <div
                  key={s.id}
                  id={`hm-panel-${s.id}`}
                  role="tabpanel"
                  aria-labelledby={`hm-tab-${s.id}`}
                  className="hm-panel"
                  data-active={on}
                  tabIndex={on ? 0 : -1}
                >
                  <Panel />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="hm-tabs">
        <div ref={listRef} className="hm-tabs__list" role="tablist" aria-label="How a session runs">
          {STEPS.map((s, i) => {
            const on = i === active
            return (
              <button
                key={s.id}
                ref={(el) => {
                  tabRefs.current[i] = el
                }}
                id={`hm-tab-${s.id}`}
                type="button"
                role="tab"
                className="hm-tab"
                aria-selected={on}
                aria-controls={`hm-panel-${s.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => choose(i)}
                onKeyDown={onKeyDown}
              >
                <span className="hm-tab__n">{String(i + 1).padStart(2, '0')}</span>
                {s.label}
                {on && playing && <span key={active} className="hm-tab__progress" data-paused={!running || undefined} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          className="hm-tabs__play"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause the tour' : 'Play the tour'}
          title={playing ? 'Pause the tour' : 'Play the tour'}
        >
          {playing ? (
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M5 3.5v9M11 3.5v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M5 3.2v9.6L12.6 8z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
      <p className="hm-tabs__caption">
        <span className="hm-tabs__step">
          Step {active + 1} of {STEPS.length}
        </span>
        {step.caption}
      </p>
    </div>
  )
})
