import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DECISION_COPY } from '../lib/decisionCopy'
import type { Check, CheckArea, EvidenceMode, Verdict } from '../types'
import { briefFactId, FactText, hostOf, SourceTag, useFacts } from './facts'
import { Escalation, IngotBar, Points, StepGroups, ToolComparison } from './Verdict'

const AREA: Record<CheckArea, string> = {
  legal: 'Legal',
  compliance: 'Compliance',
  financial: 'Financial',
  goals: 'Goals',
  operational: 'Operational',
}

/** The reading order: what to do, why, what must be true first, the plan, what would change it, the sources, the call. */
const SECTIONS = [
  { id: 'brief-recommendation', label: 'Recommendation' },
  { id: 'brief-why', label: 'Why' },
  { id: 'brief-before', label: 'Before you proceed' },
  { id: 'brief-plan', label: 'Action plan' },
  { id: 'brief-change', label: 'What would change it' },
  { id: 'brief-sources', label: 'Sources' },
  { id: 'your-call', label: 'Your call' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

/** Every `F3`-style citation in the brief's text that names a real fact, in fact order. */
function citedFacts(texts: string[], count: number): number[] {
  const cited = new Set<number>()
  for (const text of texts) {
    for (const match of text.matchAll(/\bF(\d{1,2})\b/g)) {
      const n = Number(match[1])
      if (n >= 1 && n <= count) cited.add(n)
    }
  }
  return [...cited].sort((a, b) => a - b)
}

/** The section being read: the last one whose top has passed a line a third of the way down the screen. */
function useReadingSection(ids: SectionId[]): SectionId {
  const [current, setCurrent] = useState<SectionId>(ids[0])
  const key = ids.join(' ')
  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const line = window.innerHeight / 3
      let found: SectionId = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        // The brief is display:none while the transcript is showing: keep the last answer.
        if (!el || !el.getClientRects().length) return
        if (el.getBoundingClientRect().top <= line) found = id
      }
      // The last section may be too short to reach the line: at the bottom of the page, it is the one being read.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) found = ids[ids.length - 1]
      setCurrent(found)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
    // `key` stands for `ids`, which is a fresh array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return current
}

interface DecisionBriefProps {
  verdict: Verdict
  /** The Realist's latest checks; any still at "block" is an unresolved prerequisite. */
  checks: Check[]
  evidenceMode: EvidenceMode | null
  /** The owner's location, from the intake: it picks which SBDC a referral links to. */
  location?: string
  /** "Your call": the owner signs at the end of the brief, after every prerequisite. */
  call: (prerequisites: number) => ReactNode
}

/**
 * The finished meeting as one readable document, built only from the structured verdict and the Researcher's facts:
 * no second AI summary. The meeting transcript (research, debate, full verdict) is the other view.
 */
export function DecisionBrief({ verdict, checks, evidenceMode, location, call }: DecisionBriefProps) {
  const { facts, active, setActive } = useFacts()
  const copy = DECISION_COPY[verdict.decision]
  const blocks = checks.filter((c) => c.status === 'block')
  const prerequisites = verdict.conditions.length + blocks.length
  const change = verdict.would_change ?? []
  const noNewTool = verdict.no_new_tool?.trim() ?? ''
  const hasPlan = verdict.next_steps.length > 0 || verdict.ai_tools.length > 0 || Boolean(noNewTool)
  const sections = SECTIONS.filter((s) => (s.id === 'brief-change' ? change.length > 0 : s.id === 'brief-plan' ? hasPlan : true))
  const reading = useReadingSection(sections.map((s) => s.id))
  const cited = citedFacts(
    [
      verdict.headline,
      verdict.rationale,
      ...verdict.decisive_arguments.map((p) => p.point),
      ...verdict.dissent.map((p) => p.point),
      ...blocks.map((c) => c.note),
      ...verdict.conditions,
      verdict.escalate_to === 'none' ? '' : verdict.escalation_reason,
      ...verdict.next_steps.map((s) => s.action),
      ...verdict.ai_tools.flatMap((t) => [t.price_fact ?? '', t.pilot_test ?? '']),
      noNewTool,
      ...change,
    ],
    facts.length,
  )

  // On narrow screens the section links scroll sideways: keep the one being read in view, also after a resize.
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const center = (smooth: boolean) => {
      const link = nav.querySelector<HTMLElement>('[aria-current]')
      if (!link || nav.scrollWidth <= nav.clientWidth) return
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      nav.scrollTo({ left: link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2, behavior: smooth && !reduce ? 'smooth' : 'auto' })
    }
    center(true)
    // The observer reports the current size once on start; only later changes need a jump.
    let started = false
    const observer = new ResizeObserver(() => {
      if (started) center(false)
      started = true
    })
    observer.observe(nav)
    return () => observer.disconnect()
  }, [reading])

  return (
    <div className="brief-view" data-decision={verdict.decision}>
      <div className="brief-view__in">
        <nav className="brief-nav" ref={navRef} aria-label="Decision brief">
          <p className="brief-nav__title" aria-hidden="true">
            In this brief
          </p>
          <ol>
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} aria-current={reading === s.id ? 'location' : undefined}>
                  <span className="brief-nav__n" aria-hidden="true">
                    {i + 1}
                  </span>
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="brief" aria-labelledby="brief-headline">
          <section id="brief-recommendation" className="brief__sec brief__rec" aria-labelledby="brief-headline">
            <p className="kicker">The Chairman recommends</p>
            <IngotBar verdict={verdict} />
            <h2 id="brief-headline" className="brief__headline">
              {verdict.headline}
            </h2>
            <p className="brief__meta">
              <span className="brief__gloss">{copy.gloss}</span> Chairman’s own estimate: <b>{Math.round(verdict.confidence)}%</b>. That’s
              the AI’s estimate, not a measured probability.
            </p>
            <p className="brief__lead">
              <FactText text={verdict.rationale} />
            </p>
          </section>

          <section id="brief-why" className="brief__sec" aria-labelledby="brief-why-title">
            <h2 id="brief-why-title">Why</h2>
            {verdict.decisive_arguments.length > 0 && (
              <div className="brief__part">
                <h3>What carried it</h3>
                <Points points={verdict.decisive_arguments} />
              </div>
            )}
            <div className="brief__part">
              <h3>Still objecting</h3>
              {verdict.dissent.length ? <Points points={verdict.dissent} /> : <p className="seat__muted">No seat is still objecting.</p>}
            </div>
          </section>

          <section id="brief-before" className="brief__sec brief__gates" aria-labelledby="brief-before-title">
            <h2 id="brief-before-title">Before you proceed</h2>
            {prerequisites > 0 ? (
              <p className="brief__gate-lede">
                <b>
                  {prerequisites} {prerequisites === 1 ? 'prerequisite' : 'prerequisites'}.
                </b>{' '}
                The plan holds only if each one is met. Accepting it approves the plan; it doesn’t mark any of these done.
              </p>
            ) : (
              <p className="brief__gate-lede">The Chairman set no conditions on this recommendation.</p>
            )}
            {blocks.length > 0 && (
              <div className="brief__part">
                <h3>The Realist still blocks</h3>
                <ul className="checks">
                  {blocks.map((c) => (
                    <li key={c.area} className="check" data-status="block">
                      <span className="check__chip">
                        <span className="check__icon" aria-hidden="true">
                          ✕
                        </span>
                        <span className="check__area">{AREA[c.area]}</span>
                        <span className="check__status">block</span>
                      </span>
                      <span className="check__note">
                        <FactText text={c.note} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {verdict.conditions.length > 0 && (
              <div className="brief__part">
                <h3>This only holds if</h3>
                <ul className="conditions">
                  {verdict.conditions.map((c) => (
                    <li key={c}>
                      <FactText text={c} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Escalation verdict={verdict} location={location} />
          </section>

          {hasPlan && (
            <section id="brief-plan" className="brief__sec" aria-labelledby="brief-plan-title">
              <h2 id="brief-plan-title">Action plan</h2>
              <StepGroups steps={verdict.next_steps} heading="h3" />
              <ToolComparison tools={verdict.ai_tools} noNewTool={noNewTool} />
            </section>
          )}

          {change.length > 0 && (
            <section id="brief-change" className="brief__sec" aria-labelledby="brief-change-title">
              <h2 id="brief-change-title">What would change the recommendation</h2>
              <p className="brief__note">Assumptions to revisit. If one of these turns out true, ask again.</p>
              <ul className="conditions conditions--change">
                {change.map((c) => (
                  <li key={c}>
                    <FactText text={c} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section id="brief-sources" className="brief__sec" aria-labelledby="brief-sources-title">
            <h2 id="brief-sources-title">Sources</h2>
            {evidenceMode === 'model_knowledge' && (
              <p className="assay__notice">
                <strong>Evidence not web-verified.</strong> These facts come from the AI&rsquo;s general knowledge, not a live web search.
                Confirm anything important before you act on it.
              </p>
            )}
            {cited.length > 0 ? (
              <>
                <p className="brief__note">
                  {cited.length === facts.length
                    ? `This decision cites all ${facts.length} of the Researcher’s facts.`
                    : `This decision cites ${cited.length === 1 ? 'one' : cited.length} of the Researcher’s ${facts.length} facts.`}{' '}
                  {cited.some((n) => facts[n - 1].check) && (
                    <>
                      <b>Link checked</b> means the page opened when Crucible tried it, not that anyone checked it backs the claim.
                    </>
                  )}
                </p>
                <ol className="brief__sources">
                  {cited.map((n) => {
                    const fact = facts[n - 1]
                    return (
                      <li
                        key={n}
                        id={briefFactId(n)}
                        className="fact"
                        data-active={active === n || undefined}
                        onMouseEnter={() => setActive(n)}
                        onMouseLeave={() => setActive(null)}
                      >
                        <span className="fact__n">F{n}</span>
                        <span className="fact__body">
                          <span className="fact__claim">{fact.claim}</span>
                          <span className="fact__foot">
                            <SourceTag fact={fact} />
                            {fact.source && (
                              <span className="fact__source">
                                {hostOf(fact.source) ? (
                                  <a href={fact.source} target="_blank" rel="noreferrer">
                                    {fact.source.replace(/^https?:\/\/(www\.)?/, '')}
                                    <span className="visually-hidden"> (opens in a new tab)</span>
                                  </a>
                                ) : (
                                  fact.source
                                )}
                              </span>
                            )}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                </ol>
              </>
            ) : (
              <p className="brief__note">This decision cites none of the Researcher’s facts. The research is in the meeting transcript.</p>
            )}
          </section>

          {call(prerequisites)}
        </article>
      </div>
    </div>
  )
}
