import { memo, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { CHAIRMAN, FEATURED, MEMBERS, type FeaturedSession } from '../content'
import { SEAT_BY_ID, STANCE_LABEL } from '../seats'
import type { SeatId, Stance } from '../types'
import { STEPS } from './homeContent'
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

type PanelProps = { s: FeaturedSession; onNext: () => void }

function AskPanel({ s, onNext }: PanelProps) {
  const p = s.intake.profile
  const profile = [p.industry, p.location, p.size, p.current_tools.join(' + '), p.budget, ...p.goals].filter(Boolean)
  return (
    <>
      <PanelHead title="New decision" meta={s.place} />
      <div className="hm-ask-mock">
        <p className="hm-mlabel">What are you deciding?</p>
        <p className="hm-mbox hm-mbox--q">
          {s.intake.question}
          <span className="hm-caret" />
        </p>
        <p className="hm-mlabel">Which way are you leaning?</p>
        <p className="hm-mbox">{s.intake.leaning}</p>
        <p className="hm-mlabel">About your business</p>
        <ul className="hm-mchips">
          {profile.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
        <button type="button" className="hm-mbtn" onClick={onNext}>
          Convene the board
          <Arrow />
        </button>
      </div>
    </>
  )
}

function ResearchPanel({ s }: PanelProps) {
  const { total, verified, excerpts } = s.facts
  return (
    <>
      <PanelHead title="Evidence" meta={verified ? `${total} facts · ${verified} with a source` : `${total} facts · general knowledge`} />
      <ol className="hm-facts">
        {excerpts.map((f) => (
          <li key={f.id}>
            <span className="hm-fid">{f.id}</span>
            <p>
              {f.claim}
              {f.source && (
                <>
                  {' '}
                  <span className="hm-src">
                    <b>Verified</b> {f.source}
                  </span>
                </>
              )}
            </p>
          </li>
        ))}
      </ol>
      <p className="hm-more">
        + {total - excerpts.length} more facts.{!verified && ' This recording ran without web access, so none carry a source link.'}
      </p>
      <div className="hm-openq">
        <p className="hm-mlabel">Open question</p>
        <p>{s.openQuestion}</p>
      </div>
    </>
  )
}

function PositionsPanel({ s }: PanelProps) {
  return (
    <>
      <PanelHead title="Round 1 · Opening positions" meta="Written blind, in parallel" />
      <div className="hm-pos">
        <ul className="hm-tally">
          {s.stances.map((st) => (
            <li key={st.seat}>
              <Who seat={st.seat} />
              <StanceTag stance={st.stance} />
            </li>
          ))}
        </ul>
        <ul className="hm-thread">
          {s.openings.map((m) => (
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

function RebuttalsPanel({ s }: PanelProps) {
  return (
    <>
      <PanelHead title="Round 2 · Rebuttals" meta="Seats answer each other by name" />
      <ul className="hm-thread hm-thread--wide">
        {s.rebuttals.map((r) => (
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

function VerdictPanel({ s }: PanelProps) {
  const v = s.verdict
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
          <span className="hallmark-mark hm-vmock__mark">{v.decision}</span>
          <div className="hm-conf">
            <span>{v.confidence}% confident</span>
            <span className="hm-conf__bar" style={{ '--v': v.confidence / 100 } as CSSProperties} />
          </div>
        </div>
        <p className="hm-vmock__headline">{v.headline}</p>
        <div className="hm-vmock__cols">
          <div>
            <p className="hm-mlabel">Why</p>
            <p>{v.why}</p>
          </div>
          <div>
            <p className="hm-mlabel">Dissent</p>
            <p>
              <Who seat={v.dissent.seat} /> “{v.dissent.text}”
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

function CallPanel({ s }: PanelProps) {
  const v = s.verdict
  return (
    <>
      <PanelHead title="Your call" meta="The board advises. You decide." />
      <div className="hm-call">
        <div>
          <p className="hm-mlabel">Only if</p>
          <ul className="hm-checks">
            {v.conditions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="hm-mlabel">Next steps</p>
          <ul className="hm-steps-mock">
            {v.steps.map((st) => (
              <li key={st.when}>
                <span>{st.when}</span>
                {st.action}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="hm-mlabel">Ask</p>
          <p>{v.escalate}</p>
        </div>
        <p className="hm-call__how">
          <b>Accept</b> it, or <b>override</b> it with a note. Nothing is decided until you sign.
        </p>
      </div>
    </>
  )
}

const PANELS: Record<string, (props: PanelProps) => ReactNode> = {
  ask: AskPanel,
  research: ResearchPanel,
  positions: PositionsPanel,
  rebuttals: RebuttalsPanel,
  verdict: VerdictPanel,
  call: CallPanel,
}

/**
 * The product showcase: a recorded session, step by step, in a mock of the meeting room. The window's title bar switches
 * between the featured recordings. An auto-advancing tab bar walks through the steps; any interaction with the tabs or
 * the session switch stops the tour, and it never starts under reduced motion.
 */
export const Showcase = memo(function Showcase({ featured, onFeature }: { featured: number; onFeature: (index: number) => void }) {
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

  const pick = (i: number) => {
    elapsed.current = 0
    setPlaying(false)
    onFeature(i)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const n = STEPS.length
    const next: Record<string, number> = { ArrowRight: (active + 1) % n, ArrowLeft: (active - 1 + n) % n, Home: 0, End: n - 1 }
    if (!(event.key in next)) return
    event.preventDefault()
    choose(next[event.key], true)
  }

  const step = STEPS[active]
  const session = FEATURED[featured]

  return (
    <div className="hm-show" style={{ '--accent': step.accent } as CSSProperties}>
      <div
        ref={frameRef}
        className="hm-win"
        onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <div className="hm-win__bar">
          <span className="hm-win__lights" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div className="hm-win__sessions" role="group" aria-label="Recorded meeting">
            {FEATURED.map((f, i) => (
              <button key={f.replay} type="button" className="hm-win__session" aria-pressed={i === featured} onClick={() => pick(i)}>
                <span className="hm-win__long">{f.label}</span>
                <span className="hm-win__short">{f.short}</span>
              </button>
            ))}
          </div>
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
          <div key={session.replay} className="hm-win__main">
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
                  <Panel s={session} onNext={() => choose((i + 1) % STEPS.length, true)} />
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
