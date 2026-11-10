import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react'
import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import type { RatifyStatus } from '../lib/useBoardRun'
import { SEAT_BY_ID } from '../seats'
import type { Decision, EscalateTo, Ratification, SeatPoint, StepWhen, Verdict } from '../types'
import { FactText } from './facts'
import { EASE_IN_OUT, EASE_OUT, EASE_STRIKE } from './motion'

export const DECISION_COPY: Record<Decision, { stamp: string; gloss: string }> = {
  proceed: { stamp: 'Proceed', gloss: 'Go ahead.' },
  pilot: { stamp: 'Pilot', gloss: 'Try it small first.' },
  defer: { stamp: 'Defer', gloss: 'Not yet.' },
  reject: { stamp: 'Reject', gloss: "Don't do it." },
}

const ESCALATION: Record<Exclude<EscalateTo, 'none'>, string> = {
  attorney: 'Talk to an attorney',
  accountant: 'Talk to an accountant',
  sbdc_advisor: 'Talk to a Maryland SBDC advisor',
  regulator: 'Check with the regulator',
}

const WHEN_ORDER: StepWhen[] = ['this week', 'next 30 days', 'next 90 days']

/** Reduced motion lands every animation on its final frame at once: static, but complete. */
function useTiming() {
  const reduce = useReducedMotion()
  return (t: Transition): Transition => (reduce ? { duration: 0 } : t)
}

function Points({ points }: { points: SeatPoint[] }) {
  return (
    <ul className="points">
      {points.map((p, i) => (
        <li key={i} style={{ '--c': `var(--seat-${p.seat})` } as CSSProperties}>
          <span className="points__seat">{SEAT_BY_ID[p.seat]?.title ?? p.seat}</span>
          <span>
            <FactText text={p.point} />
          </span>
        </li>
      ))}
    </ul>
  )
}

export function VerdictCard({ verdict }: { verdict: Verdict }) {
  const copy = DECISION_COPY[verdict.decision]
  const timing = useTiming()
  const steps = WHEN_ORDER.map((when) => ({ when, items: verdict.next_steps.filter((s) => s.when === when) })).filter((g) => g.items.length)
  const confidence = Math.round(verdict.confidence)
  return (
    <motion.article
      className="verdict"
      data-decision={verdict.decision}
      aria-labelledby="verdict-title"
      initial={{ opacity: 0, y: 24 }}
      // Arrives once it is on screen, so the scroll to it never swallows the moment.
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -15% 0px' }}
      transition={timing({ duration: 0.6, ease: EASE_OUT })}
    >
      <header className="verdict__head">
        <p className="kicker">The Chairman recommends</p>
        {/* The cast ingot: poured glowing, it cools to metal and the decision is struck into it. */}
        <div className="ingot-bar">
          <motion.span
            className="ingot-bar__hot"
            aria-hidden="true"
            initial={{ opacity: 1 }}
            whileInView={{ opacity: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={timing({ duration: 2.4, delay: 0.5, ease: EASE_IN_OUT })}
          />
          <motion.p
            className="hallmark-mark hallmark-mark--verdict"
            initial={{ opacity: 0, scale: 1.35 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={timing({ duration: 0.26, delay: 1.5, ease: EASE_STRIKE })}
          >
            {copy.stamp}
            <span className="visually-hidden">: {copy.gloss}</span>
          </motion.p>
          <motion.p
            className="ingot-bar__reading"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={timing({ duration: 0.5, delay: 1.9, ease: EASE_OUT })}
          >
            {confidence}%
          </motion.p>
        </div>
        <h2 id="verdict-title" className="verdict__headline">
          {verdict.headline}
        </h2>
        <p className="verdict__meta">
          <span>{copy.gloss}</span>
          <span aria-hidden="true"> · </span>
          <span>{confidence}% confident</span>
        </p>
      </header>

      <p className="verdict__rationale">
        <FactText text={verdict.rationale} />
      </p>

      <div className="verdict__grid">
        {verdict.decisive_arguments.length > 0 && (
          <section className="verdict__section">
            <h3>What carried it</h3>
            <Points points={verdict.decisive_arguments} />
          </section>
        )}
        <section className="verdict__section">
          <h3>Still objecting</h3>
          {verdict.dissent.length ? <Points points={verdict.dissent} /> : <p className="seat__muted">No seat is still objecting.</p>}
        </section>
      </div>

      {verdict.conditions.length > 0 && (
        <section className="verdict__section">
          <h3>This only holds if</h3>
          <ul className="conditions">
            {verdict.conditions.map((c) => (
              <li key={c}>
                <FactText text={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {steps.length > 0 && (
        <section className="verdict__section">
          <h3>Next steps</h3>
          <ol className="steps">
            {steps.map((g) => (
              <li key={g.when} className="steps__group">
                <h4 className="steps__when">{g.when}</h4>
                <ul>
                  {g.items.map((s) => (
                    <li key={s.action}>
                      <FactText text={s.action} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      )}

      {verdict.ai_tools.length > 0 && (
        <section className="verdict__section">
          <h3>AI tools the board endorses</h3>
          <ul className="endorsed">
            {verdict.ai_tools.map((t) => (
              <li key={t.name} className="endorsed__tool">
                <p className="endorsed__name">
                  {t.name} <span>{t.monthly_cost}</span>
                </p>
                <p>{t.use}</p>
                <p className="endorsed__fine">
                  Works with {t.works_with}. <strong>Watch out:</strong> {t.caveat}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {verdict.escalate_to !== 'none' && (
        <section className="escalate" aria-labelledby="escalate-title">
          <h3 id="escalate-title">{ESCALATION[verdict.escalate_to]}</h3>
          {verdict.escalation_reason && <p>{verdict.escalation_reason}</p>}
          {verdict.escalate_to === 'sbdc_advisor' && (
            <a className="escalate__link" href="https://www.marylandsbdc.org/" target="_blank" rel="noreferrer">
              Find free help at the Maryland SBDC<span aria-hidden="true"> ↗</span>
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          )}
        </section>
      )}
    </motion.article>
  )
}

interface YourCallProps {
  decision: Decision
  ratification: Ratification | null
  status: RatifyStatus
  error: string | null
  local: boolean
  onSubmit: (action: Ratification['action'], note: string) => Promise<void>
}

const formatAt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export function YourCall({ decision, ratification, status, error, local, onSubmit }: YourCallProps) {
  const [mode, setMode] = useState<'choose' | 'override'>('choose')
  /** `at` of the ratification being revised; a newer signature ends the edit. */
  const [editingAt, setEditingAt] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState(false)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const timing = useTiming()
  useEffect(() => {
    if (mode === 'override') noteRef.current?.focus()
  }, [mode, editingAt])
  const ids = useId()
  const saving = status === 'saving'
  const stamp = DECISION_COPY[decision].stamp.toLowerCase()

  const submitOverride = async (event: FormEvent) => {
    event.preventDefault()
    if (!note.trim()) {
      setNoteError(true)
      noteRef.current?.focus()
      return
    }
    await onSubmit('override', note)
  }

  if (ratification && editingAt !== ratification.at) {
    const accepted = ratification.action === 'accept'
    return (
      <section className="yourcall yourcall--done" aria-labelledby={`${ids}-title`}>
        <h2 className="yourcall__title" id={`${ids}-title`}>
          Your call
        </h2>
        {/* The owner's own hallmark, struck beside the Chairman's. */}
        <motion.p
          className="hallmark-mark hallmark-mark--owner"
          data-action={ratification.action}
          initial={{ opacity: 0, scale: 1.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={timing({ duration: 0.26, ease: EASE_STRIKE })}
        >
          {accepted ? 'Accepted' : 'Overridden'}
        </motion.p>
        <p className="yourcall__summary">
          {accepted ? `You accepted the recommendation to ${stamp}.` : `You overrode the recommendation to ${stamp}.`}
        </p>
        {ratification.note && <blockquote className="yourcall__note">{ratification.note}</blockquote>}
        <p className="yourcall__meta">
          Signed {formatAt(ratification.at)}
          {local ? ' · practice signature on a recording, not saved' : ' · saved to this decision'}
        </p>
        <button
          type="button"
          className="btn btn--quiet"
          onClick={() => {
            setEditingAt(ratification.at)
            setMode(ratification.action === 'override' ? 'override' : 'choose')
            setNote(ratification.note)
          }}
        >
          Change my call
        </button>
      </section>
    )
  }

  return (
    <motion.section
      className="yourcall"
      aria-labelledby={`${ids}-title`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={timing({ duration: 0.5, delay: 0.6, ease: EASE_OUT })}
    >
      <h2 className="yourcall__title" id={`${ids}-title`}>
        Your call
      </h2>
      <p className="yourcall__lede">The board advises. You decide. Sign off on the recommendation, or overrule it and say why.</p>
      <div className="yourcall__actions">
        <button type="button" className="btn btn--primary" disabled={saving} aria-busy={saving && mode !== 'override'} onClick={() => onSubmit('accept', '')}>
          {saving && mode !== 'override' ? 'Saving…' : 'Accept recommendation'}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          aria-expanded={mode === 'override'}
          aria-controls={`${ids}-override`}
          disabled={saving}
          onClick={() => {
            setMode(mode === 'override' ? 'choose' : 'override')
          }}
        >
          Override
        </button>
      </div>
      <AnimatePresence initial={false}>
        {mode === 'override' && (
          <motion.form
            id={`${ids}-override`}
            className="yourcall__override"
            onSubmit={submitOverride}
            noValidate
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={timing({ duration: 0.22, ease: EASE_OUT })}
          >
            <label htmlFor={`${ids}-note`}>What will you do instead, and why?</label>
            <textarea
              id={`${ids}-note`}
              ref={noteRef}
              rows={3}
              value={note}
              required
              aria-invalid={noteError || undefined}
              aria-describedby={noteError ? `${ids}-note-error` : undefined}
              onChange={(e) => {
                setNote(e.target.value)
                if (e.target.value.trim()) setNoteError(false)
              }}
            />
            {noteError && (
              <p className="field-error" id={`${ids}-note-error`}>
                Add a short note so future-you knows why you overruled the board.
              </p>
            )}
            <button type="submit" className="btn btn--primary" disabled={saving} aria-busy={saving}>
              {saving ? 'Saving…' : 'Sign my override'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </motion.section>
  )
}
