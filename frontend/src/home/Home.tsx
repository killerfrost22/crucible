import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { CHAIRMAN, FEATURED, MEMBERS, type FeaturedSession } from '../content'
import { SeatArt } from '../components/SeatArt'
import { ThemeToggle } from '../components/ThemeToggle'
import { Wordmark } from '../components/Wordmark'
import type { IntakeDraft } from '../lib/intakeDraft'
import { navigateOnClick, UNDER_THE_HOOD } from '../lib/nav'
import { REPLAYS } from '../lib/replay'
import { FIND_YOUR_SBDC, MARYLAND_SBDC } from '../lib/sbdc'
import { SEAT_BY_ID, STANCE_LABEL } from '../seats'
import type { Intake } from '../types'
import { BrandMark, SeatRule } from './BrandMark'
import { Decisions } from './Decisions'
import { STATS } from './homeContent'
import { IntakeForm } from './IntakeForm'
import { Showcase } from './Showcase'
import { Arrow, Chevron, Play } from './icons'
import { prefersReducedMotion, scrollBehavior } from './useReducedMotion'

/** `fresh`: a normal visit. `form`: back from a meeting, so land on the form with the question focused. */
export type Arrival = 'fresh' | 'form'

interface HomeProps {
  arrival: Arrival
  draft: IntakeDraft
  onChange: (draft: IntakeDraft) => void
  onSubmit: (intake: Intake) => void
  onReplay: (name: string) => void
}

const external = <span className="visually-hidden"> (opens in a new tab)</span>
const k = (color: string) => ({ '--k': color }) as CSSProperties

/**
 * Scroll to the form and put the caret at the end of the question. Wide screens show the section (heading beside the
 * form); phones stack the intro above the form, so there the question's own label goes to the top instead.
 */
function goToForm(behavior: ScrollBehavior) {
  const section = document.getElementById('convene')
  const question = document.getElementById('question') as HTMLTextAreaElement | null
  if (!section || !question) return
  const below = question.getBoundingClientRect().bottom - section.getBoundingClientRect().top
  const room = window.innerHeight - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop || '0')
  const target = below <= room ? section : (question.closest('.hm-field') ?? question)
  target.scrollIntoView({ block: 'start', behavior })
  question.focus({ preventScroll: true })
  question.setSelectionRange(question.value.length, question.value.length)
}

export function Home({ arrival, draft, onChange, onSubmit, onReplay }: HomeProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  // The recorded meeting the page shows: the showcase switches it, and the board cards, verdict and watch buttons follow.
  const [featured, setFeatured] = useState(0)
  const session = FEATURED[featured]

  // `/#convene` (from other pages) and a return from a meeting both land on the form.
  useLayoutEffect(() => {
    if (arrival === 'form' || window.location.hash === '#convene') goToForm('instant')
    else window.scrollTo({ top: 0, behavior: 'instant' })
  }, [arrival])

  // Sections settle in as they enter the viewport; nothing is hidden when motion is reduced.
  useEffect(() => {
    const root = rootRef.current
    if (!root || prefersReducedMotion()) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-in')
          io.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    root.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el))
    root.classList.add('hm--motion')
    return () => io.disconnect()
  }, [])

  const convene = useCallback((event?: MouseEvent) => {
    event?.preventDefault()
    goToForm(scrollBehavior())
  }, [])
  const watch = useCallback(() => onReplay(session.replay), [onReplay, session.replay])

  return (
    <div ref={rootRef} className="hm">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Header onConvene={convene} onWatch={watch} />
      <main id="main" tabIndex={-1}>
        <section className="hm-hero" aria-labelledby="hero-title">
          <div className="hm-col hm-hero__col">
            <button type="button" className="hm-pill" onClick={watch}>
              <span className="hm-pill__dot" aria-hidden="true" />
              <span className="hm-pill__text">
                <span className="hm-pill__tag">Recorded</span>
                <span className="hm-pill__long">{session.pill.long}</span>
                <span className="hm-pill__short">{session.pill.short}</span>
              </span>
              <span className="hm-pill__go" aria-hidden="true">
                <Chevron />
              </span>
            </button>
            <h1 id="hero-title" className="hm-hero__title">
              Your decision,
              <br className="hm-br" /> argued from five&nbsp;sides.
            </h1>
            <p className="hm-hero__lede">
              For small-business owners with a call to make. Five AI advisors research it and argue it out, and you leave with a
              recommendation, what it depends on, and what to do this week. The final call stays yours.
            </p>
            <div className="hm-hero__actions">
              <form
                className="hm-ask"
                onSubmit={(e) => {
                  e.preventDefault()
                  convene()
                }}
              >
                <label htmlFor="hero-question" className="visually-hidden">
                  What are you deciding?
                </label>
                <input
                  id="hero-question"
                  className="hm-ask__input"
                  value={draft.question}
                  placeholder="What are you deciding?"
                  autoComplete="off"
                  enterKeyHint="go"
                  onChange={(e) => onChange({ ...draft, question: e.target.value })}
                />
                <button type="submit" className="hm-btn hm-btn--primary hm-ask__go">
                  Convene your board
                </button>
              </form>
              <button type="button" className="hm-btn hm-btn--secondary hm-hero__watch" onClick={watch}>
                <Play />
                Watch a session
              </button>
            </div>
            <p className="hm-hero__fine">About 90 seconds per meeting. No account needed.</p>
          </div>
          <BrandMark hot={draft.question.trim().length > 0} />
        </section>

        <Decisions />

        <section className="hm-sec hm-sec--show" id="how" aria-labelledby="how-title">
          <div className="hm-col hm-band hm-band--head hm-band--paper">
            <div className="hm-head-block" data-reveal>
              <p className="hm-eyebrow">How it works</p>
              <h2 id="how-title">How a session runs</h2>
              <p>Real recorded meetings, step by step: you bring the question, the board works through it in rounds, and every round stays on the table.</p>
            </div>
            <Showcase featured={featured} onFeature={setFeatured} />
          </div>
        </section>

        <Stats />
        <Board session={session} />
        <VerdictSection session={session} onWatch={watch} onConvene={convene} />
        <Sessions onReplay={onReplay} onConvene={convene} />

        <section className="hm-sec hm-convene" id="convene" aria-labelledby="convene-title">
          <div className="hm-col hm-convene__grid">
            <div className="hm-convene__intro">
              <p className="hm-eyebrow">Convene</p>
              <h2 id="convene-title">Bring the decision you keep putting&nbsp;off.</h2>
              <p>
                Ask it the way you would ask a mentor. The board researches it, argues it over two rounds, and the Chairman recommends what to do.
                The final call stays yours.
              </p>
              <ol className="hm-convene__flow" aria-label="What happens after you submit">
                {['Research', 'Opening positions', 'Rebuttals', 'Verdict'].map((s, i) => (
                  <li key={s}>
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
            <div className="hm-convene__card">
              <IntakeForm draft={draft} onChange={onChange} onSubmit={onSubmit} />
            </div>
          </div>
        </section>
      </main>
      <Footer onWatch={watch} />
    </div>
  )
}

const Header = memo(function Header({ onConvene, onWatch }: { onConvene: (e?: MouseEvent) => void; onWatch: () => void }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const toTop = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    window.history.replaceState(null, '', '/')
    window.scrollTo({ top: 0, behavior: scrollBehavior() })
  }
  const close = () => setOpen(false)
  const sections = (
    <>
      <a href="#board" onClick={close}>
        The board
      </a>
      <a href="#how" onClick={close}>
        How it works
      </a>
      <a href="#verdict" onClick={close}>
        Verdicts
      </a>
    </>
  )

  return (
    <header className="hm-head">
      <div className="hm-head__row">
        <a className="hm-head__home" href="/" onClick={toTop} aria-label="Crucible, back to top">
          <Wordmark />
        </a>
        <nav className="hm-nav" aria-label="Sections">
          {sections}
        </nav>
        <div className="hm-head__end">
          <a className="hm-head__built" href={UNDER_THE_HOOD} onClick={navigateOnClick(UNDER_THE_HOOD)}>
            How it’s built
          </a>
          <button type="button" className="hm-btn hm-btn--secondary hm-btn--sm hm-head__watch" onClick={onWatch}>
            <Play />
            Watch a session
          </button>
          <a className="hm-btn hm-btn--primary hm-btn--sm hm-head__cta" href="#convene" onClick={onConvene}>
            Convene your board
          </a>
          <ThemeToggle />
          <button
            ref={buttonRef}
            type="button"
            className="hm-menu-btn"
            aria-expanded={open}
            aria-controls="hm-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <span aria-hidden="true" />
          </button>
        </div>
      </div>
      <div ref={menuRef} id="hm-menu" className="hm-menu" hidden={!open}>
        <nav className="hm-menu__nav" aria-label="Sections">
          {sections}
          <a href={UNDER_THE_HOOD} onClick={navigateOnClick(UNDER_THE_HOOD)}>
            How it’s built
          </a>
        </nav>
        <div className="hm-menu__actions">
          <button
            type="button"
            className="hm-btn hm-btn--secondary"
            onClick={() => {
              close()
              onWatch()
            }}
          >
            <Play />
            Watch a session
          </button>
          <a
            className="hm-btn hm-btn--primary"
            href="#convene"
            onClick={(e) => {
              close()
              onConvene(e)
            }}
          >
            Convene your board
          </a>
        </div>
      </div>
    </header>
  )
})

const Stats = memo(function Stats() {
  return (
    <section className="hm-sec hm-stats" aria-label="Crucible in numbers">
      <dl className="hm-col hm-stats__grid">
        {STATS.map((s) => (
          <div key={s.label} className="hm-stat" style={k(s.color)} data-reveal>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
})

const Board = memo(function Board({ session }: { session: FeaturedSession }) {
  const stanceBySeat = Object.fromEntries(session.stances.map((s) => [s.seat, STANCE_LABEL[s.stance]]))
  const v = session.verdict
  return (
    <section className="hm-sec" id="board" aria-labelledby="board-title">
      <div className="hm-col hm-band hm-band--head">
        <div className="hm-head-block" data-reveal>
          <p className="hm-eyebrow">The board</p>
          <h2 id="board-title">Five seats. One chair.</h2>
          <p>
            Each advisor argues from one job, so every side of your decision has someone committed to it. The lines on each card are theirs,
            from the recorded {session.noun} meeting.
          </p>
        </div>
      </div>
      <ul className="hm-col hm-bento" aria-label="The members">
        {MEMBERS.map((m) => {
          const isChair = m.id === CHAIRMAN.id
          return (
            <li key={m.id} className="hm-cell" style={k(m.color)} data-reveal>
              <div className="hm-thumb" aria-hidden="true">
                <SeatArt id={m.id} className="hm-thumb__art" />
                <div className="hm-thumb__card">
                  <p className="hm-thumb__who">
                    <span className="hm-who">{m.title}</span>
                    <span className="hm-thumb__stance">{isChair ? `${v.decision} · ${v.confidence}%` : stanceBySeat[m.id]}</span>
                  </p>
                  <p className="hm-thumb__line">{session.lines[m.id]}</p>
                </div>
              </div>
              <h3>{m.title}</h3>
              <p>{m.role}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
})

const VerdictSection = memo(function VerdictSection({
  session,
  onWatch,
  onConvene,
}: {
  session: FeaturedSession
  onWatch: () => void
  onConvene: (e?: MouseEvent) => void
}) {
  const v = session.verdict
  return (
    <section className="hm-sec" id="verdict" aria-labelledby="verdict-title">
      <div className="hm-col hm-split">
        <div className="hm-split__text" data-reveal>
          <p className="hm-eyebrow">Verdicts</p>
          <h2 id="verdict-title">A decision you can act&nbsp;on</h2>
          <p>
            Every session ends with the Chairman’s recommendation: what to do, why the board landed there, who still disagrees, what has to
            hold true, and what to do this week.
          </p>
          <div className="hm-split__btns">
            <a className="hm-btn hm-btn--primary" href="#convene" onClick={onConvene}>
              Convene your board
            </a>
            <button type="button" className="hm-btn hm-btn--secondary" onClick={onWatch}>
              <Play />
              Watch how it got there
            </button>
          </div>
        </div>
        <div className="hm-split__art hm-paper">
          <figure className="hm-vcard" aria-label={`Example verdict from the recorded ${session.noun} session`} data-reveal>
            <div className="hm-vcard__top">
              <span className="hallmark-mark hm-vcard__mark">{v.decision}</span>
              <span className="hm-vcard__meta">
                Chairman’s estimate: {v.confidence}%
                <br />
                {session.place}
              </span>
            </div>
            <p className="hm-vcard__call">{v.headline}</p>
            <dl className="hm-vcard__dl">
              <div>
                <dt>Why</dt>
                <dd>{v.why}</dd>
              </div>
              <div>
                <dt>Dissent</dt>
                <dd>
                  <span className="hm-who" style={k(`var(--seat-${v.dissent.seat})`)}>
                    {SEAT_BY_ID[v.dissent.seat].title}
                  </span>{' '}
                  “{v.dissent.text}”
                </dd>
              </div>
              <div>
                <dt>Only if</dt>
                <dd>
                  <ul>
                    {v.conditions.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt>Next steps</dt>
                <dd>
                  <ul>
                    {v.steps.map((s) => (
                      <li key={s.when}>
                        <b>{s.when}.</b> {s.action}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt>Ask</dt>
                <dd>{v.escalate}</dd>
              </div>
            </dl>
            <div className="hm-vcard__foot">
              <span className="hm-who" style={k(CHAIRMAN.color)}>
                Your call
              </span>
              <span className="hm-vcard__how">
                <b>Accept</b> it, or <b>override</b> it with a note.
              </span>
            </div>
          </figure>
        </div>
      </div>
    </section>
  )
})

const Sessions = memo(function Sessions({ onReplay, onConvene }: { onReplay: (name: string) => void; onConvene: (e?: MouseEvent) => void }) {
  return (
    <section className="hm-sec" id="sessions" aria-labelledby="sessions-title">
      <SeatRule className="hm-sec__rule" />
      <div className="hm-col hm-band hm-band--head">
        <div className="hm-head-block" data-reveal>
          <p className="hm-eyebrow">Recorded sessions</p>
          <h2 id="sessions-title">Watch a recorded session</h2>
          <p>Real meetings, recorded as they ran. Watch the research, both rounds and the verdict land.</p>
        </div>
      </div>
      <ul className="hm-col hm-replays">
        {REPLAYS.map((r) => (
          <li key={r.name} data-reveal>
            <button type="button" className="hm-replay" onClick={() => onReplay(r.name)}>
              <span className="hm-replay__thumb" aria-hidden="true">
                <span className="hm-replay__table">
                  {MEMBERS.map((m) => (
                    <i key={m.id} style={k(m.color)} />
                  ))}
                </span>
                <span className="hm-replay__play">
                  <Play />
                </span>
              </span>
              <span className="hm-replay__label">{r.label}</span>
              <span className="hm-replay__blurb">{r.blurb}</span>
              {r.recording && (
                <span className="hm-replay__meta">
                  <span>{[r.recording.date && `Recorded\u00a0${r.recording.date}`, r.recording.search].filter(Boolean).join('\u00a0· ')}</span>
                  <span className="visually-hidden"> · </span>
                  <span>{r.recording.models}</span>
                </span>
              )}
              <span className="hm-replay__cta">
                Watch the meeting
                <Arrow />
              </span>
            </button>
          </li>
        ))}
        <li data-reveal>
          <a className="hm-replay hm-replay--own" href="#convene" onClick={onConvene}>
            <span className="hm-replay__thumb hm-replay__thumb--own" aria-hidden="true">
              <span className="hm-replay__table hm-replay__table--empty">
                {MEMBERS.map((m) => (
                  <i key={m.id} style={k(m.color)} />
                ))}
              </span>
              <span className="hm-replay__q">?</span>
            </span>
            <span className="hm-replay__text">
              <span className="hm-replay__label">Your business · your question</span>
              <span className="hm-replay__blurb">Bring a decision of your own. The board meets live and reaches a recommendation in about 90 seconds.</span>
            </span>
            <span className="hm-replay__cta">
              Convene your board
              <Arrow />
            </span>
          </a>
        </li>
      </ul>
    </section>
  )
})

const Footer = memo(function Footer({ onWatch }: { onWatch: () => void }) {
  return (
    <footer className="hm-foot">
      <SeatRule />
      <div className="hm-foot__in">
        <div className="hm-foot__brand">
          <Wordmark />
          <p>
            Crucible is a hackathon prototype, built and tested on Maryland businesses. The advisors are AI and can be wrong, and nothing
            here is legal or financial advice; the final call is yours. For free one-on-one help, your local{' '}
            <a href={FIND_YOUR_SBDC.url} target="_blank" rel="noreferrer">
              Small Business Development Center
              {external}
            </a>{' '}
            is a good next stop (in Maryland, the{' '}
            <a href={MARYLAND_SBDC.url} target="_blank" rel="noreferrer">
              Maryland SBDC
              {external}
            </a>
            ).
          </p>
        </div>
        <nav className="hm-foot__nav" aria-label="More">
          <a href={UNDER_THE_HOOD} onClick={navigateOnClick(UNDER_THE_HOOD)}>
            How it’s built
          </a>
          <button type="button" onClick={onWatch}>
            Watch a session
          </button>
          <a href={FIND_YOUR_SBDC.url} target="_blank" rel="noreferrer">
            Find your SBDC <span aria-hidden="true">↗</span>
            {external}
          </a>
        </nav>
      </div>
      <p className="hm-foot__base">
        <span>Crucible</span>
        <span>A hackathon prototype</span>
      </p>
    </footer>
  )
})
