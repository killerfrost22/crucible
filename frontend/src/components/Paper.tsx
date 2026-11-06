import { motion } from 'motion/react'
import type { Evidence, EvidenceMode, Intake } from '../types'
import { factId, useFacts } from './facts'
import { EASE_PIN } from './motion'

export function QuestionCard({ intake }: { intake: Intake | null }) {
  if (!intake) {
    return (
      <div className="index-card index-card--pending" aria-busy="true">
        <p className="index-card__kicker">The question</p>
        <p className="pending-line">Pinning your question…</p>
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
      className="index-card"
      aria-labelledby="question-title"
      initial={{ opacity: 0, y: -16, rotate: -3 }}
      animate={{ opacity: 1, y: 0, rotate: -1.2 }}
      transition={{ duration: 0.5, ease: EASE_PIN }}
    >
      <span className="pin pin--owner" aria-hidden="true" />
      <p className="index-card__kicker">The question</p>
      <h1 id="question-title" className="index-card__question">
        {intake.question}
      </h1>
      {intake.leaning && (
        <p className="index-card__leaning">
          <span>Leaning</span> {intake.leaning}
        </p>
      )}
      {(about.length > 0 || details.length > 0) && (
        <div className="index-card__about">
          {about.length > 0 && <p className="index-card__biz">{about.join(' · ')}</p>}
          {details.length > 0 && (
            <dl className="index-card__details">
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

interface ReceiptProps {
  evidence: Evidence | null
  mode: EvidenceMode | null
  /** The meeting ended without research; stops the "printing" animation. */
  stopped: boolean
}

export function EvidenceReceipt({ evidence, mode, stopped }: ReceiptProps) {
  const { active, setActive } = useFacts()
  if (!evidence) {
    return (
      <section className="receipt receipt--pending" aria-labelledby="receipt-title" aria-busy={!stopped}>
        <h2 id="receipt-title" className="receipt__title">
          Research notes
        </h2>
        <p className="receipt__printing">{stopped ? 'No research came back.' : 'Researcher is gathering facts'}</p>
        {!stopped && (
          <div className="receipt__feed" aria-hidden="true">
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
      className="receipt"
      aria-labelledby="receipt-title"
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_PIN }}
    >
      <span className="pin pin--researcher" aria-hidden="true" />
      <header className="receipt__head">
        <h2 id="receipt-title" className="receipt__title">
          Research notes
        </h2>
        <p className="receipt__meta">
          {evidence.facts.length} facts · cited as F1–F{evidence.facts.length}
        </p>
        {mode === 'model_knowledge' && (
          <p className="receipt__notice">
            <strong>Evidence not web-verified.</strong> These facts come from the AI&rsquo;s general knowledge, not a live web search. Confirm anything
            important before you act on it.
          </p>
        )}
      </header>
      <p className="receipt__decision">{evidence.decision}</p>
      <ol className="receipt__facts">
        {evidence.facts.map((fact, i) => {
          const n = i + 1
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
                {fact.claim}{' '}
                <span className={fact.verified ? 'fact__tag fact__tag--ok' : 'fact__tag'}>{fact.verified ? 'Verified' : 'Unverified'}</span>
                {fact.source && (
                  <span className="fact__source">
                    {/^https?:\/\//.test(fact.source) && URL.canParse(fact.source) ? (
                      <a href={fact.source} target="_blank" rel="noreferrer">
                        {new URL(fact.source).hostname.replace(/^www\./, '')}
                        <span className="visually-hidden"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      fact.source
                    )}
                  </span>
                )}
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
            <details key={title} className="receipt__block">
              <summary>
                {title} <span>({items.length})</span>
              </summary>
              <ul>
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          ),
      )}
      <p className="receipt__end" aria-hidden="true">
        * * * end of notes * * *
      </p>
    </motion.section>
  )
}
