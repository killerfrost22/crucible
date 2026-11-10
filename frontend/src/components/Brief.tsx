import { motion } from 'motion/react'
import type { Evidence, EvidenceMode, Intake } from '../types'
import { factId, useFacts } from './facts'
import { EASE_OUT } from './motion'

/** `https://www.example.gov/x` → `example.gov`; anything that isn't an http(s) URL → null, shown as plain text. */
function hostOf(source: string): string | null {
  if (!/^https?:\/\//.test(source)) return null
  try {
    return new URL(source).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function QuestionCard({ intake }: { intake: Intake | null }) {
  if (!intake) {
    return (
      <div className="question question--pending" aria-busy="true">
        <p className="kicker">Your question</p>
        <p className="question__pending">Loading your question…</p>
      </div>
    )
  }
  const p = intake.profile
  const about = [p.name, p.industry, p.location, p.size].filter(Boolean)
  const details: [string, string][] = (
    [
      ['Tools', p.current_tools.join(', ')],
      ['Budget', p.budget],
      ['Goals', p.goals.join('; ')],
      ['Constraints', p.constraints],
    ] as [string, string][]
  ).filter(([, v]) => v)
  return (
    <motion.article
      className="question"
      aria-labelledby="question-title"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
    >
      <p className="kicker">Your question</p>
      <h1 id="question-title" className="question__title">
        {intake.question}
      </h1>
      {intake.leaning && (
        <p className="question__leaning">
          <span>Leaning</span> {intake.leaning}
        </p>
      )}
      {(about.length > 0 || details.length > 0) && (
        <div className="question__about">
          {about.length > 0 && <p className="question__biz">{about.join(' · ')}</p>}
          {details.length > 0 && (
            <dl className="question__details">
              {details.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </motion.article>
  )
}

interface EvidenceProps {
  evidence: Evidence | null
  mode: EvidenceMode | null
  /** The meeting ended without research; stops the "working" animation. */
  stopped: boolean
}

/** The Researcher's assay: every fact numbered F1… so the seats and the verdict can cite it. */
export function EvidenceSheet({ evidence, mode, stopped }: EvidenceProps) {
  const { active, setActive } = useFacts()
  if (!evidence) {
    return (
      <section className="assay assay--pending" aria-labelledby="assay-title" aria-busy={!stopped}>
        <header className="assay__head">
          <h2 id="assay-title" className="assay__title">
            Research
          </h2>
          <p className="assay__meta">Assay</p>
        </header>
        <p className="assay__working">{stopped ? 'No research came back.' : 'The Researcher is gathering facts'}</p>
        {!stopped && (
          <div className="assay__scan" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
      </section>
    )
  }
  return (
    <motion.section
      className="assay"
      aria-labelledby="assay-title"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
    >
      <header className="assay__head">
        <h2 id="assay-title" className="assay__title">
          Research
        </h2>
        <p className="assay__meta">
          Assay · {evidence.facts.length} facts · F1–F{evidence.facts.length}
        </p>
      </header>
      {mode === 'model_knowledge' && (
        <p className="assay__notice">
          <strong>Evidence not web-verified.</strong> These facts come from the AI&rsquo;s general knowledge, not a live web search. Confirm anything
          important before you act on it.
        </p>
      )}
      <p className="assay__decision">{evidence.decision}</p>
      <ol className="assay__facts">
        {evidence.facts.map((fact, i) => {
          const n = i + 1
          const host = fact.source ? hostOf(fact.source) : null
          return (
            <li
              key={n}
              id={factId(n)}
              className="fact"
              data-active={active === n || undefined}
              onMouseEnter={() => setActive(n)}
              onMouseLeave={() => setActive(null)}
            >
              <span className="fact__n">F{n}</span>
              <span className="fact__body">
                <span className="fact__claim">{fact.claim}</span>
                <span className="fact__foot">
                  <span className={fact.verified ? 'fact__tag fact__tag--ok' : 'fact__tag'}>{fact.verified ? 'Verified' : 'Unverified'}</span>
                  {fact.source && (
                    <span className="fact__source">
                      {host ? (
                        <a href={fact.source} target="_blank" rel="noreferrer">
                          {host}
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
      {(
        [
          ['Options on the table', evidence.options],
          ['What nobody knows yet', evidence.open_questions],
        ] as const
      ).map(
        ([title, items]) =>
          items.length > 0 && (
            <details key={title} className="assay__block">
              <summary>
                {title} <span>{items.length}</span>
              </summary>
              <ul>
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          ),
      )}
    </motion.section>
  )
}
