import { memo, useLayoutEffect, useRef, type CSSProperties, type MouseEvent } from 'react'
import { Wordmark } from '../components/Wordmark'
import { whenFontsReady } from '../lib/fonts'
import type { IntakeDraft } from '../lib/intakeDraft'
import { REPLAYS } from '../lib/replay'
import { SEAT_BY_ID } from '../seats'
import type { Intake } from '../types'
import { startBuildFx, type FxAdvisor } from './buildFx'
import { CHAIRMAN, HVAC_REPLAY, MEMBERS, REBUTTALS, VERDICT } from './content'
import { IntakeForm } from './IntakeForm'
import { ProductMock } from './ProductMock'
import { SeatArt } from './SeatArt'

/** `fresh`: first visit, the page builds itself. `form`: back from a meeting, static, on the form. */
export type Arrival = 'fresh' | 'form'

interface LandingProps {
  arrival: Arrival
  draft: IntakeDraft
  onChange: (draft: IntakeDraft) => void
  onSubmit: (intake: Intake) => void
  onReplay: (name: string) => void
}

const FX_ADVISORS: FxAdvisor[] = MEMBERS.map((m) => ({
  name: m.title,
  color: m.color,
  tag: m.id === 'chairman' ? 'var(--molten-across)' : undefined,
}))

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const dot = (color: string) => ({ '--k': color }) as CSSProperties

/** Where the window has to scroll for a section's top to sit under the sticky header (the root's `scroll-padding-top`). */
function sectionTop(id: string) {
  const target = document.getElementById(id)
  if (!target) return window.scrollY
  const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
  return Math.max(0, target.getBoundingClientRect().top + window.scrollY - pad)
}

/**
 * Scrolls to an in-page target, then moves focus there. Focus waits for the scroll to end because moving it
 * mid-scroll cancels a smooth scroll in Chromium. No hash: App owns history.
 */
function goTo(id: string, focusId = id) {
  const top = sectionTop(id)
  const focus = () => document.getElementById(focusId)?.focus({ preventScroll: true })
  if (reducedMotion() || Math.abs(top - window.scrollY) < 2) {
    window.scrollTo({ top, behavior: 'instant' })
    focus()
    return
  }
  const finish = () => {
    clearTimeout(timer)
    window.removeEventListener('scrollend', finish)
    focus()
  }
  const timer = window.setTimeout(finish, 1500)
  window.addEventListener('scrollend', finish)
  window.scrollTo({ top, behavior: 'smooth' })
}

const jump = (id: string, focusId?: string) => (event: MouseEvent) => {
  event.preventDefault()
  goTo(id, focusId)
}

const convene = jump('convene', 'question')

export function Landing({ arrival, draft, onChange, onSubmit, onReplay }: LandingProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const stopFx = useRef<(() => void) | null>(null)

  const runFx = () => {
    const root = rootRef.current
    if (!root) return
    stopFx.current?.()
    stopFx.current = null
    try {
      stopFx.current = startBuildFx(root, FX_ADVISORS)
    } catch (error) {
      root.classList.remove('fx', 'fx-reset')
      console.error('Build effect failed to start', error)
    }
  }

  useLayoutEffect(() => {
    const root = rootRef.current!
    if (arrival === 'form') {
      window.scrollTo({ top: sectionTop('convene'), behavior: 'instant' })
      document.getElementById('question')?.focus({ preventScroll: true })
      return
    }
    window.scrollTo(0, 0)
    if (reducedMotion()) return

    // Hide the parts before the first paint; if the effect never starts, show them anyway.
    root.classList.add('fx')
    let cancelled = false
    let startTimer = 0
    const fallback = window.setTimeout(() => {
      if (!stopFx.current) root.classList.remove('fx')
    }, 3000)
    void whenFontsReady().then(() => {
      if (!cancelled) startTimer = window.setTimeout(runFx, 120)
    })
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotion = () => {
      if (!motion.matches) return
      stopFx.current?.()
      stopFx.current = null
    }
    motion.addEventListener('change', onMotion)
    return () => {
      cancelled = true
      clearTimeout(fallback)
      clearTimeout(startTimer)
      motion.removeEventListener('change', onMotion)
      stopFx.current?.()
      stopFx.current = null
      root.classList.remove('fx')
    }
    // Arrival is fixed for the life of this view; the effect runs once per mount.
  }, [])

  const replayFx = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    runFx()
  }

  return (
    <div className="lp" ref={rootRef}>
      <a className="lp-skip" href="#question" onClick={convene}>
        Skip to the question
      </a>
      <Header />
      <main id="top" tabIndex={-1}>
        <Story onReplay={onReplay} />
        <section className="lp-sec lp-convene" id="convene" tabIndex={-1} aria-labelledby="convene-title">
          <div className="lp-wrap lp-convene__grid">
            <div className="lp-convene__intro">
              <h2 id="convene-title" data-part="text" data-rail="v">
                Bring the decision you keep putting&nbsp;off.
              </h2>
              <p data-part="text">
                Ask it the way you would ask a mentor. The board researches it, argues it over two rounds, and the Chairman recommends what to
                do. The final call stays yours.
              </p>
            </div>
            <IntakeForm draft={draft} onChange={onChange} onSubmit={onSubmit} />
          </div>
        </section>
      </main>
      <Footer />
      <div className="lp-fxctl">
        <button type="button" className="lp-fxctl__btn" onClick={replayFx}>
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13.5 8a5.5 5.5 0 1 1-1.7-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12.4 1.2v3.4H9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Replay effect</span>
        </button>
      </div>
    </div>
  )
}

const Header = memo(function Header() {
  return (
    <header className="lp-top">
      <div className="lp-wrap lp-top__row">
        <a className="lp-brand" href="#top" onClick={jump('top')} data-part>
          <Wordmark />
        </a>
        <nav className="lp-nav" aria-label="Sections" data-part="text">
          <a href="#board" onClick={jump('board')}>
            The board
          </a>
          <a href="#how" onClick={jump('how')}>
            How it works
          </a>
          <a href="#verdict" onClick={jump('verdict')}>
            Verdicts
          </a>
        </nav>
        <div className="lp-top__actions" data-part>
          <a className="lp-top__quiet" href="#sessions" onClick={jump('sessions')}>
            Watch a session
          </a>
          <a className="lp-btn lp-btn--primary lp-btn--sm" href="#convene" onClick={convene}>
            Convene your board
          </a>
        </div>
      </div>
    </header>
  )
})

/** Everything between the header and the form. Static, so typing in the form never re-renders it. */
const Story = memo(function Story({ onReplay }: { onReplay: (name: string) => void }) {
  return (
    <>
      <section className="lp-hero" aria-labelledby="hero-title">
        <div className="lp-wrap">
          <h1 id="hero-title" data-part="text" data-rail="v">
            Your decision,
            <br className="lp-hero__br" /> argued from five sides.
          </h1>
          <p className="lp-lede" data-part="text">
            Crucible seats an Industry Expert, an AI-Tools Expert, a Realist, a Strategist and a Devil’s Advocate around your question. They
            argue it over two rounds, then the Chairman recommends what to do. The final call stays yours.
          </p>
          <div className="lp-ctas" data-part>
            <a className="lp-btn lp-btn--primary" href="#convene" onClick={convene}>
              Convene your board
            </a>
            <button type="button" className="lp-btn lp-btn--quiet" onClick={() => onReplay(HVAC_REPLAY)}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M4 2.6v8.8L11.2 7z" fill="currentColor" />
              </svg>
              Watch this session
            </button>
          </div>
          <ProductMock />
        </div>
      </section>

      <section className="lp-sec" id="board" tabIndex={-1} aria-labelledby="board-title">
        <div className="lp-wrap">
          <div className="lp-sec__head">
            <h2 id="board-title" data-part="text">
              Five seats. One chair.
            </h2>
            <p data-part="text">Each advisor argues from one job, so every side of your decision has someone committed to it.</p>
          </div>
          <ul className="lp-seats" data-rail="h">
            {MEMBERS.map((m) => (
              <li key={m.id} className={m.id === 'chairman' ? 'lp-seat lp-seat--chair' : 'lp-seat'} style={dot(m.color)} data-rail="v">
                <SeatArt id={m.id} />
                <div data-part="text">
                  <h3>
                    <span className={m.id === 'chairman' ? 'lp-dot lp-dot--molten' : 'lp-dot'} />
                    {m.title}
                  </h3>
                  <p>{m.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="lp-sec" id="how" tabIndex={-1} aria-labelledby="how-title">
        <div className="lp-wrap">
          <div className="lp-sec__head">
            <h2 id="how-title" data-part="text" data-rail="v">
              How a session runs
            </h2>
            <p data-part="text" data-rail="v">
              You bring the question. The board works through it in rounds, and every round stays on the table, so you can see how the
              recommendation was made.
            </p>
          </div>
          <ol className="lp-steps" data-rail="h">
            <li data-part="text">
              <span className="lp-steps__n">1</span>
              <h3>Ask</h3>
              <p>Describe the decision in your own words, which way you’re leaning, and a little about your business.</p>
            </li>
            <li data-part="text">
              <span className="lp-steps__n">2</span>
              <h3>Research</h3>
              <p>The Researcher gathers the facts every seat argues from, numbered F1, F2…</p>
            </li>
            <li data-part="text">
              <span className="lp-steps__n">3</span>
              <h3>Opening positions</h3>
              <p>Each seat takes a stance on its own, without seeing the others: for it, against it, or with conditions.</p>
            </li>
            <li data-part="text">
              <span className="lp-steps__n">4</span>
              <h3>Rebuttals</h3>
              <p>Seats answer each other by name. Weak arguments get called out; some seats change their minds.</p>
            </li>
            <li data-part="text">
              <span className="lp-steps__n lp-steps__n--molten">5</span>
              <h3>Verdict</h3>
              <p>The Chairman recommends proceed, pilot, defer or reject. Then you accept it or override it.</p>
            </li>
          </ol>
          <div className="lp-xexam" data-part>
            <div className="lp-xexam__head">
              Round 2: rebuttals <span>HVAC session · {REBUTTALS.length} replies</span>
            </div>
            <div className="lp-xexam__body">
              {REBUTTALS.map((r) => (
                <div key={r.seat} className="lp-msg" data-part style={dot(`var(--seat-${r.seat})`)}>
                  <span className="lp-msg__av" aria-hidden="true">
                    {SEAT_BY_ID[r.seat].title[0]}
                  </span>
                  <div>
                    <p className="lp-msg__who">
                      {SEAT_BY_ID[r.seat].title} <span className="lp-msg__re">replying to {SEAT_BY_ID[r.target].title}</span>
                    </p>
                    <p className="lp-msg__text">{r.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="lp-sec" id="verdict" tabIndex={-1} aria-labelledby="verdict-title">
        <div className="lp-wrap lp-vsplit">
          <div>
            <h2 id="verdict-title" data-part="text">
              A decision you can act on
            </h2>
            <p className="lp-vsplit__lead" data-part="text">
              Every session ends with the Chairman’s recommendation: what to do, why the board landed there, who still disagrees, what has to
              hold true, and what to do this week.
            </p>
          </div>
          <figure className="lp-vcard" data-part data-rail="h" aria-label="Example verdict from the recorded HVAC session">
            <div className="lp-vcard__top">
              <span className="lp-vcard__badge">
                <span className="lp-dot lp-dot--molten" />
                {VERDICT.decision}
              </span>
              <span>{VERDICT.confidence}% confident · HVAC, Frederick MD</span>
            </div>
            <p className="lp-vcard__call" data-part="text">
              {VERDICT.headline}
            </p>
            <dl>
              <div data-part="text">
                <dt>Why</dt>
                <dd>{VERDICT.why}</dd>
              </div>
              <div data-part="text">
                <dt>Dissent</dt>
                <dd>
                  <span className="lp-vcard__seat" style={dot('var(--seat-devils_advocate)')}>
                    {SEAT_BY_ID.devils_advocate.title}
                  </span>{' '}
                  “{VERDICT.dissent}”
                </dd>
              </div>
              <div data-part="text">
                <dt>Only if</dt>
                <dd>
                  <ul>
                    {VERDICT.conditions.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div data-part="text">
                <dt>Next steps</dt>
                <dd>
                  <ul>
                    {VERDICT.steps.map((s) => (
                      <li key={s.when}>
                        <b>{s.when}.</b> {s.action}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div data-part="text">
                <dt>Ask</dt>
                <dd>{VERDICT.escalate}</dd>
              </div>
            </dl>
            <div className="lp-vcard__foot">
              <span className="lp-vcard__sign">
                <span className="lp-dot" style={dot(CHAIRMAN.color)} />
                Your call
              </span>
              <span className="lp-vcard__btns" aria-hidden="true">
                <span className="lp-fake lp-fake--on">Accept</span>
                <span className="lp-fake">Override</span>
              </span>
            </div>
          </figure>
        </div>
      </section>

      <section className="lp-sec lp-sessions" id="sessions" tabIndex={-1} aria-labelledby="sessions-title">
        <div className="lp-wrap">
          <div className="lp-sec__head">
            <h2 id="sessions-title" data-part="text">
              Watch a recorded session
            </h2>
            <p data-part="text">Real meetings, recorded as they ran. Watch the research, both rounds and the verdict land.</p>
          </div>
          <ul className="lp-replays" data-rail="h">
            {REPLAYS.map((r) => (
              <li key={r.name} data-part>
                <button type="button" className="lp-replay" onClick={() => onReplay(r.name)}>
                  <span className="lp-replay__label">{r.label}</span>
                  <span className="lp-replay__blurb">{r.blurb}</span>
                  <span className="lp-replay__cta">
                    Watch the meeting
                    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M2.5 8h10M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
})

const Footer = memo(function Footer() {
  return (
    <footer className="lp-foot">
      <div className="lp-wrap lp-foot__row">
        <Wordmark />
        <p>
          Crucible is a hackathon prototype. The advisors are AI and can be wrong. The final call is always yours. For free one-on-one help, the{' '}
          <a href="https://www.marylandsbdc.org/" target="_blank" rel="noreferrer">
            Maryland SBDC
          </a>{' '}
          is a good next stop.
        </p>
      </div>
    </footer>
  )
})
