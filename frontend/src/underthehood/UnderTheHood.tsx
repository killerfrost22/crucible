import { memo, useLayoutEffect, useRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { SeatArt } from '../components/SeatArt'
import { ThemeToggle } from '../components/ThemeToggle'
import { Wordmark } from '../components/Wordmark'
import { MEMBERS } from '../content'
import { whenFontsReady } from '../lib/fonts'
import { navigateOnClick } from '../lib/nav'
import { REPLAYS } from '../lib/replay'
import { SEAT_BY_ID, SEATS } from '../seats'
import { startBuildFx, type FxAdvisor } from './buildFx'
import { Pipeline } from './Pipeline'
import {
  DENTAL_CHECKS,
  DENTAL_FACTS,
  DENTAL_REPLAY,
  DENTAL_STREAM,
  DENTAL_VERIFIED,
  EVAL_SCENARIOS,
  REALIST_R2_TARGETS,
} from './recorded'

interface UnderTheHoodProps {
  onReplay: (name: string) => void
}

const FX_ADVISORS: FxAdvisor[] = MEMBERS.map((m) => ({ id: m.id, name: m.title, color: m.color, molten: m.id === 'chairman' }))

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
function goTo(id: string) {
  const top = sectionTop(id)
  const focus = () => document.getElementById(id)?.focus({ preventScroll: true })
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

const jump = (id: string) => (event: MouseEvent) => {
  event.preventDefault()
  goTo(id)
}

const toHome = navigateOnClick('/')
/** The home page's question form. */
const toConvene = navigateOnClick('/#convene')

const SECTIONS = [
  { id: 'pipeline', n: '02', label: 'The pipeline', nav: 'Pipeline', blurb: 'An ADK graph: research, two parallel rounds, a verdict.' },
  { id: 'models', n: '03', label: 'Models', nav: 'Models', blurb: 'Claude through OpenRouter, twelve calls a decision.' },
  { id: 'outputs', n: '04', label: 'Structured outputs', nav: 'Outputs', blurb: 'Every answer is a schema, every fact has an ID.' },
  { id: 'streaming', n: '05', label: 'Streaming', nav: 'Streaming', blurb: 'One event per node, one reducer for live and replay.' },
  { id: 'eval', n: '06', label: 'Evaluation', nav: 'Evaluation', blurb: 'Ten planted traps: the board against one prompt.' },
  { id: 'frontend', n: '07', label: 'The frontend', nav: 'Frontend', blurb: 'React 19, two themes, and the effect on this page.' },
  { id: 'deploy', n: '08', label: 'Deploy', nav: 'Deploy', blurb: 'Vercel in front, Cloud Run behind.' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']
const SECTION = Object.fromEntries(SECTIONS.map((s) => [s.id, s])) as Record<SectionId, (typeof SECTIONS)[number]>

export function UnderTheHood({ onReplay }: UnderTheHoodProps) {
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
    // The effect runs once per mount.
  }, [])

  const replayFx = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    runFx()
  }

  return (
    <div className="uth" ref={rootRef}>
      <a className="uth-skip" href="#top" onClick={jump('top')}>
        Skip to content
      </a>
      <Header />
      <main id="top" tabIndex={-1}>
        <Story onReplay={onReplay} />
      </main>
      <Footer />
      <div className="uth-fxctl">
        <button type="button" className="uth-fxctl__btn" onClick={replayFx}>
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
    <header className="uth-top">
      <div className="uth-wrap uth-top__row">
        <a className="uth-brand" href="/" onClick={toHome} data-part>
          <Wordmark />
          <span className="uth-visually-hidden">Home</span>
        </a>
        <nav className="uth-nav" aria-label="Sections" data-part="text">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={jump(s.id)}>
              {s.nav}
            </a>
          ))}
        </nav>
        <div className="uth-top__actions" data-part>
          <a className="uth-btn uth-btn--primary uth-btn--sm" href="/#convene" onClick={toConvene}>
            Try it
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
})

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2.5 8h10M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M4 2.6v8.8L11.2 7z" fill="currentColor" />
  </svg>
)

/** A cursor and its name tag, drawn the way the build effect draws them. */
function CursorTag({ name, molten }: { name: string; molten?: boolean }) {
  return (
    <span className={molten ? 'uth-tag uth-tag--molten' : 'uth-tag'}>
      <svg width="12" height="15" viewBox="0 0 16 20" aria-hidden="true">
        <path d="M1.2 1.2v15l4-3.5 2.8 6.1 2.7-1.2-2.7-6 5.4-.2z" fill="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      <span>{name}</span>
    </span>
  )
}

/** Numbered section heading: index, name and source path on a hairline, then the headline and its lead. */
function SectionHead({ id, file, title, children }: { id: SectionId; file: string; title: ReactNode; children: ReactNode }) {
  const s = SECTION[id]
  return (
    <div className="uth-sec__head">
      <p className="uth-sec__label" data-part="text" data-rail="h">
        <span className="uth-sec__n">{s.n}</span>
        <span>{s.label}</span>
        <code className="uth-sec__file">{file}</code>
      </p>
      <h2 id={`${id}-title`} data-part="text" data-rail="v">
        {title}
      </h2>
      <p className="uth-sec__lead" data-part="text">
        {children}
      </p>
    </div>
  )
}

/** Everything between the header and the footer. Static, so nothing here re-renders while the effect runs. */
const Story = memo(function Story({ onReplay }: { onReplay: (name: string) => void }) {
  return (
    <>
      <Hero onReplay={onReplay} />
      <section className="uth-sec" id="pipeline" tabIndex={-1} aria-labelledby="pipeline-title">
        <div className="uth-wrap">
          <SectionHead id="pipeline" file="backend/agents/crucible/agent.py" title="A graph, not a chat.">
            The board is an ADK 2.x graph <code>Workflow</code>. Each node is a plain function or an LLM agent, the edges fix the order, a
            tuple of agents runs in parallel, and a <code>JoinNode</code> waits for all of them. On this page every node is a build part,
            and each seat’s node is put in place by that seat’s own cursor.
          </SectionHead>
          <Pipeline />
        </div>
      </section>
      <Models />
      <Outputs />
      <Streaming />
      <Evaluation onReplay={onReplay} />
      <Frontend onReplay={onReplay} />
      <Deploy onReplay={onReplay} />
    </>
  )
})

function Hero({ onReplay }: { onReplay: (name: string) => void }) {
  return (
    <section className="uth-hero" aria-labelledby="hero-title">
      <div className="uth-wrap">
        <div className="uth-hero__grid">
          <div className="uth-hero__head">
            <p className="uth-kicker" data-part="text">
              <span className="uth-sec__n">01</span> Under the hood
            </p>
            <h1 id="hero-title" data-part="text" data-rail="v">
              One decision,
              <br className="uth-hero__br" /> built by many hands.
            </h1>
          </div>
          <div className="uth-hero__text">
            <p className="uth-lede" data-part="text">
              Crucible doesn’t ask one model for an answer. Seven AI agents each do one job in a fixed order: research, two rounds of
              debate, a verdict. The decision is assembled from their parts. So is this page: the six named cursors putting it together
              are the five seats and the Chairman.
            </p>
            <div className="uth-ctas" data-part>
              <a className="uth-btn uth-btn--primary" href="/#convene" onClick={toConvene}>
                Try it
                <ArrowIcon />
              </a>
              <button type="button" className="uth-btn uth-btn--quiet" onClick={() => onReplay(DENTAL_REPLAY)}>
                <PlayIcon />
                Watch a recorded meeting
              </button>
            </div>
          </div>
          <nav className="uth-index" aria-label="On this page" data-part>
            <p className="uth-index__head">On this page</p>
            <ol>
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} onClick={jump(s.id)}>
                    <span className="uth-sec__n">{s.n}</span>
                    <span className="uth-index__label">{s.label}</span>
                    <span className="uth-index__blurb">{s.blurb}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className="uth-cast">
          <p className="uth-cast__head" data-part="text">
            <span>The six cursors</span> Each builds this page the way it argues a decision: one part at a time.
          </p>
          <ul className="uth-cast__list" data-rail="h">
            {MEMBERS.map((m) => (
              <li key={m.id} className="uth-cast__item" style={dot(m.color)} data-cursor={m.id}>
                <SeatArt id={m.id} />
                <div data-part="text">
                  <CursorTag name={m.title} molten={m.id === 'chairman'} />
                  <p className="uth-cast__job">{m.id === 'chairman' ? 'Verdict · Sonnet\u00a05.5' : 'Rounds\u00a01–2 · Haiku\u00a05.5'}</p>
                  <p className="uth-cast__role">{m.role}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="uth-cast__foot" data-part="text">
            The seventh agent, the Researcher, has no cursor: it works alone before the board meets, on Claude Sonnet&nbsp;5.5 with web search.
          </p>
        </div>
      </div>
    </section>
  )
}

const MODEL_ROWS = [
  { who: 'Researcher', color: 'var(--text-2)', model: 'Claude Sonnet 5.5', id: 'openrouter/anthropic/claude-sonnet-5.5:online', calls: '1' },
  { who: 'Five seats', color: 'var(--seat-realist)', model: 'Claude Haiku 5.5', id: 'openrouter/anthropic/claude-haiku-5.5', calls: '10', note: '5 per round' },
  { who: 'Chairman', color: 'var(--seat-chairman)', model: 'Claude Sonnet 5.5', id: 'openrouter/anthropic/claude-sonnet-5.5', calls: '1', molten: true },
]

function Models() {
  return (
    <section className="uth-sec" id="models" tabIndex={-1} aria-labelledby="models-title">
      <div className="uth-wrap">
        <SectionHead id="models" file="backend/agents/crucible/config.py" title="Two Claude models, one router.">
          Every call goes through LiteLLM to OpenRouter. The five seats argue on Claude Haiku&nbsp;5.5, quick and cheap enough to run ten
          times a meeting. The Researcher and the Chairman, whose work the rest depends on, run on Claude Sonnet&nbsp;5.5.
        </SectionHead>

        <div className="uth-models">
          <table className="uth-roster" data-part data-rail="v">
            <caption className="uth-visually-hidden">Models and calls per decision</caption>
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Model</th>
                <th scope="col" className="uth-num">
                  Calls
                </th>
              </tr>
            </thead>
            <tbody>
              {MODEL_ROWS.map((r) => (
                <tr key={r.who}>
                  <th scope="row">
                    <span className={r.molten ? 'uth-dot uth-dot--molten' : 'uth-dot'} style={dot(r.color)} />
                    {r.who}
                  </th>
                  <td>
                    {r.model}
                    <code>{r.id}</code>
                  </td>
                  <td className="uth-num">
                    {r.calls}
                    {r.note && <small>{r.note}</small>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Per decision</th>
                <td />
                <td className="uth-num">12</td>
              </tr>
            </tfoot>
          </table>

          <figure className="uth-meter" data-part>
            <figcaption>
              One meeting: 12 calls, in order
              <span className="uth-visually-hidden">: the Researcher, five seats in Round 1, five in Round 2, then the Chairman.</span>
            </figcaption>
            <ol className="uth-calls" aria-hidden="true">
              <li className="uth-calls__grp">
                <span className="uth-calls__cell" style={dot('var(--text-2)')} />
                <small>R</small>
              </li>
              {[1, 2].map((round) => (
                <li key={round} className="uth-calls__grp">
                  <span className="uth-calls__cells">
                    {SEATS.map((s) => (
                      <span key={s.id} className="uth-calls__cell" style={dot(`var(--seat-${s.id})`)} />
                    ))}
                  </span>
                  <small>Round {round}</small>
                </li>
              ))}
              <li className="uth-calls__grp">
                <span className="uth-calls__cell uth-calls__cell--molten" />
                <small>C</small>
              </li>
            </ol>
            <dl className="uth-meter__stats">
              <div>
                <dt>Cost per meeting, measured</dt>
                <dd>$0.06–0.12</dd>
              </div>
              <div>
                <dt>Time per meeting, measured</dt>
                <dd>50–85 s</dd>
              </div>
            </dl>
            <p className="uth-meter__cap">
              Prepaid OpenRouter credit is a hard spend cap: the key can’t spend more than has been loaded onto it.
            </p>
          </figure>
        </div>

        <div className="uth-notes">
          <div className="uth-note" data-part>
            <h3>Web search with sources</h3>
            <p>
              With search on, the Researcher’s model name gets OpenRouter’s <code>:online</code> suffix, which runs an Exa web search and
              adds the results to its prompt. A fact is marked <code>verified</code> only when a search result from this session backs it,
              and it keeps the source URL.
            </p>
          </div>
          <div className="uth-note" data-part>
            <h3>Any seat, any provider</h3>
            <p>Each seat reads its model from one environment variable, so a single seat can argue on another provider’s model.</p>
            <pre className="uth-code uth-code--sm">
              <code>
                <span className="k">CRUCIBLE_SEAT_MODEL</span>=openrouter/anthropic/claude-haiku-5.5{'\n'}
                <span className="k">CRUCIBLE_DEVILS_ADVOCATE_MODEL</span>=openrouter/<span className="c">&lt;provider&gt;</span>/
                <span className="c">&lt;model&gt;</span>
              </code>
            </pre>
          </div>
          <div className="uth-note" data-part>
            <h3>Gemini, direct</h3>
            <p>
              A bare Gemini model name skips OpenRouter and goes straight to Google through ADK’s own Gemini client. The Researcher then
              searches with ADK’s <code>google_search</code> tool instead of <code>:online</code>.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Outputs() {
  return (
    <section className="uth-sec" id="outputs" tabIndex={-1} aria-labelledby="outputs-title">
      <div className="uth-wrap">
        <SectionHead id="outputs" file="backend/agents/crucible/schemas.py" title="Every answer has a shape.">
          Each agent’s <code>output_schema</code> is a Pydantic model, which ADK turns into a JSON schema the model’s reply must follow.
          Nothing downstream parses prose: the next node, the session state and the React app all read the same fields, and{' '}
          <code>frontend/src/types.ts</code> mirrors them.
        </SectionHead>

        <div className="uth-spec">
          <div className="uth-spec__text" data-part="text">
            <h3>Facts with IDs</h3>
            <p>
              The Researcher is asked for 6–12 facts, each a claim, a source and a <code>verified</code> flag. The seats see them numbered
              F1…{'\u2060'}Fn and cite those IDs, and anything they assert beyond the evidence has to say “unverified”, so every argument can be
              traced to a fact and you can see whether that fact was checked.
            </p>
          </div>
          <figure className="uth-panel" data-part data-rail="h">
            <figcaption className="uth-panel__head">
              <span>Researcher output</span> Dental office meeting · {DENTAL_VERIFIED} of {DENTAL_FACTS.length} verified
            </figcaption>
            <ul className="uth-facts">
              {DENTAL_FACTS.map((f) => (
                <li key={f.id} className={f.source ? 'is-verified' : undefined}>
                  <code>{f.id}</code>
                  <span>{f.source ? 'verified' : 'unverified'}</span>
                  <small>{f.source ?? 'model knowledge'}</small>
                </li>
              ))}
            </ul>
          </figure>
        </div>

        <div className="uth-spec">
          <div className="uth-spec__text" data-part="text">
            <h3>Rebuttals only at other seats</h3>
            <p>
              Round 2 gives each seat a schema built for that seat alone. Its rebuttal <code>target</code> is an enum of the other four
              seats, so a seat cannot rebut itself: its own name is not a value the model can return. Here is the Realist’s.
            </p>
          </div>
          <figure className="uth-panel" data-part data-rail="h">
            <figcaption className="uth-panel__head">
              <span>schemas.py</span> → the Realist’s Round 2 JSON schema
            </figcaption>
            <div className="uth-panel__split">
              <pre className="uth-code">
                <code>
                  <span className="k">def</span> <span className="f">rebuttal_schema</span>(opinion, seat_id):{'\n'}
                  {'    '}others = <span className="f">tuple</span>(s <span className="k">for</span> s <span className="k">in</span>{' '}
                  get_args(SeatId){'\n'}
                  {'                   '}
                  <span className="k">if</span> s != seat_id){'\n'}
                  {'    '}rebuttal = create_model(...,{'\n'}
                  {'        '}target=(Literal[others], ...)){'\n'}
                  {'    '}
                  <span className="c">…</span>
                </code>
              </pre>
              <pre className="uth-code">
                <code>
                  <span className="s">"target"</span>: {'{'}
                  {'\n'}
                  {'  '}
                  <span className="s">"enum"</span>: [{'\n'}
                  {['industry_expert', 'ai_tools_expert', 'strategist', 'devils_advocate'].map((id, i, all) => (
                    <span key={id}>
                      {'    '}
                      <span className="s">"{id}"</span>
                      {i < all.length - 1 ? ',' : ''}
                      {'\n'}
                    </span>
                  ))}
                  {'  '}],{'\n'}
                  {'  '}
                  <span className="s">"type"</span>: <span className="s">"string"</span>
                  {'\n'}
                  {'}'}
                </code>
              </pre>
            </div>
            <p className="uth-panel__foot">
              In the dental meeting the Realist rebutted
              {REALIST_R2_TARGETS.map((id, i) => (
                <span key={id}>
                  {i === 0 ? ' ' : i === REALIST_R2_TARGETS.length - 1 ? ' and ' : ', '}
                  <span className="uth-seatname" style={dot(`var(--seat-${id})`)}>
                    {SEAT_BY_ID[id].title}
                    {i === REALIST_R2_TARGETS.length - 1 && '.'}
                  </span>
                </span>
              ))}
            </p>
          </figure>
        </div>

        <div className="uth-spec">
          <div className="uth-spec__text" data-part="text">
            <h3>Pass, flag, block</h3>
            <p>
              The Realist’s answer carries 3–6 checks. Each names an area (legal, compliance, financial, goals or operational), a status
              of pass, flag or block, and one sentence that cites facts or says who can confirm them.
            </p>
          </div>
          <figure className="uth-panel" data-part data-rail="h">
            <figcaption className="uth-panel__head">
              <span>Realist checks</span> Dental office meeting · Round 1
            </figcaption>
            <ul className="uth-checks">
              {DENTAL_CHECKS.map((c, i) => (
                <li key={i} data-status={c.status}>
                  <span className="uth-checks__area">{c.area}</span>
                  <span className="uth-checks__status">{c.status}</span>
                  {c.note && <p className="uth-checks__note">{c.note}</p>}
                </li>
              ))}
            </ul>
          </figure>
        </div>
      </div>
    </section>
  )
}

function Streaming() {
  return (
    <section className="uth-sec" id="streaming" tabIndex={-1} aria-labelledby="streaming-title">
      <div className="uth-wrap">
        <SectionHead id="streaming" file="frontend/src/lib/{sse,board,replay,decisions}.ts" title="One event per finished node.">
          The backend is ADK’s own FastAPI app, and every route comes from ADK. <code>POST /run_sse</code> holds the connection open and
          sends one server-sent event each time a node finishes, so the meeting room fills in while the board is still working. A finished
          meeting stays in the session store. My decisions reads <code>GET /apps/crucible/users/…/sessions</code> and opens that board,
          including the owner’s signature, without starting another run.
        </SectionHead>

        <div className="uth-stream">
          <div className="uth-merge" data-rail="v">
            <div className="uth-merge__lanes">
              <div className="uth-box" data-part>
                <span className="uth-box__kicker">Live meeting</span>
                <code>POST /run_sse</code>
                <p>Chunks arrive as nodes finish.</p>
              </div>
              <div className="uth-box" data-part>
                <span className="uth-box__kicker">Recorded replay</span>
                <code>/replays/&lt;name&gt;.sse</code>
                <p>
                  <code>ReplayPlayer</code> re-emits the real recorded events on their original timing.
                </p>
              </div>
            </div>
            <div className="uth-box uth-box--key" data-part>
              <span className="uth-box__kicker">One parser</span>
              <code>SseParser</code>
            </div>
            <div className="uth-box uth-box--key" data-part>
              <span className="uth-box__kicker">One pure reducer</span>
              <code>reduceBoard(state, event)</code>
            </div>
            <div className="uth-box uth-box--end" data-part>
              <span className="uth-box__kicker">The meeting room</span>
              <p>Live, replay, and a reopened decision render through the same meeting room.</p>
            </div>
            <div className="uth-box uth-box--patch" data-part>
              <span className="uth-box__kicker">Your call, saved</span>
              <code>PATCH /apps/crucible/users/…/sessions/…</code>
              <code className="uth-box__body">{'{ "stateDelta": { "ratification": … } }'}</code>
            </div>
          </div>

          <figure className="uth-panel uth-log" data-part data-rail="h">
            <figcaption className="uth-panel__head">
              <span>Event stream</span> Dental office meeting · {DENTAL_STREAM.length} events
            </figcaption>
            <ol>
              {DENTAL_STREAM.map((e, i) => {
                const seat = SEATS.find((s) => e.node.startsWith(s.id + '_r'))
                return (
                  <li key={e.node} className={e.state ? 'has-state' : undefined}>
                    <span className="uth-log__n">{String(i + 1).padStart(2, '0')}</span>
                    <span className="uth-log__node">
                      {seat && <span className="uth-dot" style={dot(`var(--seat-${seat.id})`)} />}
                      {e.node}
                    </span>
                    {e.state && <span className="uth-log__state">state: {e.state}</span>}
                  </li>
                )
              })}
            </ol>
            <p className="uth-panel__foot">Seats in a round arrive in the order they finish, not in table order.</p>
          </figure>
        </div>
      </div>
    </section>
  )
}

function Evaluation({ onReplay }: { onReplay: (name: string) => void }) {
  return (
    <section className="uth-sec" id="eval" tabIndex={-1} aria-labelledby="eval-title">
      <div className="uth-wrap">
        <SectionHead id="eval" file="backend/eval/run_eval.py" title="Ten traps. The board against one prompt.">
          Each eval scenario hides a risk a careful advisor has to raise. The harness asks the full board and a single plain prompt the same
          question, on the same model as the Chairman, and checks each answer for the planted risks.
        </SectionHead>

        <div className="uth-results">
          <figure className="uth-result" data-part data-rail="v">
            <figcaption>Early test · lightweight model · dental scenario</figcaption>
            <div className="uth-score">
              <div>
                <span className="uth-score__who">Single prompt</span>
                <span className="uth-score__pips" aria-hidden="true">
                  <i />
                  <i />
                </span>
                <span className="uth-score__n">0 of 2</span>
              </div>
              <div className="is-board">
                <span className="uth-score__who">The board</span>
                <span className="uth-score__pips" aria-hidden="true">
                  <i className="on" />
                  <i className="on" />
                </span>
                <span className="uth-score__n">2 of 2</span>
              </div>
            </div>
            <p>Planted risks: Maryland’s all-party call-recording consent and the HIPAA business associate agreement.</p>
          </figure>

          <figure className="uth-result" data-part>
            <figcaption>Current Claude setup · recorded dental meeting</figcaption>
            <p className="uth-result__big">
              <b>
                {DENTAL_VERIFIED} of {DENTAL_FACTS.length}
              </b>{' '}
              facts verified, each with its source.
            </p>
            <p>
              The verdict was to pilot, and only once a signed HIPAA BAA and an attorney-approved recording notice are in hand, before any
              live call.
            </p>
            <button type="button" className="uth-link" onClick={() => onReplay(DENTAL_REPLAY)}>
              Watch that meeting
              <ArrowIcon />
            </button>
          </figure>
        </div>

        <p className="uth-status" data-part="text">
          <span className="uth-status__pill">Running</span>
          The full ten-scenario eval is being run now. Until it finishes, these are the only results we quote.
        </p>

        <div className="uth-table-wrap" data-part>
          <table className="uth-scen">
            <caption className="uth-visually-hidden">The ten eval scenarios and their planted risks</caption>
            <thead>
              <tr>
                <th scope="col">Business</th>
                <th scope="col">Decision</th>
                <th scope="col">Planted risk</th>
              </tr>
            </thead>
            <tbody>
              {EVAL_SCENARIOS.map((s) => (
                <tr key={s.business} className={s.control ? 'is-control' : undefined}>
                  <th scope="row">{s.business}</th>
                  <td>{s.question}</td>
                  <td>
                    <ul>
                      {s.control && <li className="uth-scen__control">Control: no legal trap</li>}
                      {s.traps.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

const SWATCHES = [
  { token: '--bg', label: 'bg' },
  { token: '--surface', label: 'surface' },
  { token: '--line-strong', label: 'line' },
  { token: '--text', label: 'text' },
  { token: '--text-2', label: 'text-2' },
  { token: '--guide', label: 'guide' },
  { token: '--measure', label: 'measure' },
  ...MEMBERS.map((m) => ({ token: `--seat-${m.id}`, label: m.title.split(' ')[0] })),
]

function Frontend({ onReplay }: { onReplay: (name: string) => void }) {
  return (
    <section className="uth-sec" id="frontend" tabIndex={-1} aria-labelledby="frontend-title">
      <div className="uth-wrap">
        <SectionHead id="frontend" file="frontend/src" title="Built to be watched.">
          React 19, Vite and TypeScript, with no UI kit and no router. Beyond React, the runtime dependencies are the <code>motion</code>{' '}
          animation library and two self-hosted fonts.
        </SectionHead>

        <div className="uth-fe">
          <div className="uth-tile uth-tile--type" data-part data-rail="v">
            <h3>Two typefaces</h3>
            <div className="uth-specimen">
              <span className="uth-specimen__sans">Aa</span>
              <span className="uth-specimen__mono">F1 · 0.06</span>
            </div>
            <p>
              Schibsted Grotesk for everything you read, Geist Mono for fact IDs, code and readings. One modular scale, ratio about 1.25,
              fluid from 320 to 1920 pixels wide.
            </p>
          </div>

          <div className="uth-tile uth-tile--theme" data-part>
            <div className="uth-tile__row">
              <h3>One token set, two themes</h3>
              <ThemeToggle />
            </div>
            <ul className="uth-swatches">
              {SWATCHES.map((s) => (
                <li key={s.token}>
                  <span className="uth-swatches__chip" style={{ background: `var(${s.token})` }} />
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
            <p>
              Every colour is a variable with a dark and a light value, each checked for AA contrast. Flip the theme: the swatches above
              are the live tokens.
            </p>
          </div>

          <div className="uth-tile uth-tile--fx" data-part>
            <h3>This page’s effect</h3>
            <ul className="uth-ticks">
              <li>Six cursors build each part as it scrolls into view, then step back.</li>
              <li>
                Moves only <code>transform</code> and <code>opacity</code>. Each frame reads every rect first, then writes.
              </li>
              <li>Scrolling back up stays quiet: no rails, no bursts, parts simply appear.</li>
              <li>Skipped under reduced motion; if it ever fails to start, the page shows in full.</li>
            </ul>
          </div>

          <div className="uth-tile uth-tile--room" data-part>
            <h3>The meeting room</h3>
            <p>
              Seat cards arrive as each event lands. In the crucible, each opening position adds to the melt, rebuttals draw glowing lines
              between seats, and the verdict pours out as a cast bar stamped with the decision.
            </p>
            <ul className="uth-replays">
              {REPLAYS.map((r) => (
                <li key={r.name}>
                  <button type="button" className="uth-link" onClick={() => onReplay(r.name)}>
                    <PlayIcon />
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

function Deploy({ onReplay }: { onReplay: (name: string) => void }) {
  return (
    <section className="uth-sec uth-sec--last" id="deploy" tabIndex={-1} aria-labelledby="deploy-title">
      <div className="uth-wrap">
        <SectionHead id="deploy" file="backend/Dockerfile · frontend/vercel.json" title="Two hosts, one spend cap.">
          The frontend is a static build on Vercel. The backend is one Docker container on Cloud Run. The only per-meeting cost is
          OpenRouter, and its prepaid credit is the ceiling.
        </SectionHead>

        <ol className="uth-deploy" data-rail="h">
          <li className="uth-host" data-part>
            <span className="uth-box__kicker">Frontend</span>
            <h3>Vercel</h3>
            <p>The Vite build, served static. Every path rewrites to index.html, so /under-the-hood and replay links load directly.</p>
          </li>
          <li className="uth-host" data-part>
            <span className="uth-box__kicker">Backend</span>
            <h3>Cloud Run</h3>
            <p>
              <code>backend/Dockerfile</code>: ADK’s FastAPI app on one instance, so every session lives in one place. The OpenRouter key
              comes from Secret Manager.
            </p>
          </li>
          <li className="uth-host" data-part>
            <span className="uth-box__kicker">Models</span>
            <h3>OpenRouter</h3>
            <p>Claude Haiku&nbsp;5.5, Claude Sonnet&nbsp;5.5 and Exa web search, paid from prepaid credit.</p>
          </li>
        </ol>

        <div className="uth-end" data-part>
          <p>
            Seen how it’s built? <span>Now give it a decision.</span>
          </p>
          <div className="uth-ctas">
            <a className="uth-btn uth-btn--primary" href="/#convene" onClick={toConvene}>
              Try it
              <ArrowIcon />
            </a>
            <button type="button" className="uth-btn uth-btn--quiet" onClick={() => onReplay(DENTAL_REPLAY)}>
              <PlayIcon />
              Watch a recorded meeting
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

const Footer = memo(function Footer() {
  return (
    <footer className="uth-foot">
      <div className="uth-wrap uth-foot__row">
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
