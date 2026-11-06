import { useId, useRef, useState, type FormEvent } from 'react'
import { draftFromIntake, intakeFromDraft, type IntakeDraft } from '../lib/intakeDraft'
import { SCENARIOS } from '../scenarios'
import type { Intake } from '../types'

interface IntakeFormProps {
  draft: IntakeDraft
  onChange: (draft: IntakeDraft) => void
  onSubmit: (intake: Intake) => void
}

type ProfileKey = Exclude<keyof IntakeDraft, 'question' | 'leaning'>

const PROFILE_FIELDS: { key: ProfileKey; label: string; placeholder: string; hint?: string; wide?: boolean; multiline?: boolean }[] = [
  { key: 'name', label: 'Business name', placeholder: 'e.g. Third Shift Coffee' },
  { key: 'industry', label: 'What you do', placeholder: 'e.g. coffee shop' },
  { key: 'location', label: 'Where', placeholder: 'e.g. Hyattsville, Maryland' },
  { key: 'size', label: 'How big', placeholder: 'e.g. 1 location, 8 staff' },
  { key: 'tools', label: 'Tools you already use', placeholder: 'e.g. Square, Instagram, Google Sheets', hint: 'Separate with commas', wide: true },
  { key: 'budget', label: 'Budget for this', placeholder: 'e.g. $200/month' },
  { key: 'goals', label: 'What you want out of it', placeholder: 'e.g. more weekday regulars', hint: 'Separate with commas' },
  { key: 'constraints', label: 'Anything the board should know', placeholder: 'e.g. I work the morning shift six days a week', wide: true, multiline: true },
]

/** The real intake: an example to start from, the question, the leaning, and the optional business profile. */
export function IntakeForm({ draft, onChange, onSubmit }: IntakeFormProps) {
  const ids = useId()
  const questionRef = useRef<HTMLTextAreaElement>(null)
  const [questionError, setQuestionError] = useState(false)
  const set = (key: keyof IntakeDraft, value: string) => {
    onChange({ ...draft, [key]: value })
    if (key === 'question' && value.trim().length >= 3) setQuestionError(false)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (draft.question.trim().length < 3) {
      setQuestionError(true)
      questionRef.current?.focus()
      return
    }
    onSubmit(intakeFromDraft(draft))
  }

  return (
    <form className="lp-form" onSubmit={submit} noValidate aria-labelledby="convene-title">
      <div className="lp-examples" data-part role="group" aria-labelledby={`${ids}-examples`}>
        <p className="lp-examples__label" id={`${ids}-examples`}>
          Start from an example
        </p>
        <ul className="lp-examples__list">
          {SCENARIOS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="lp-chip"
                aria-pressed={draft.question === s.intake.question}
                onClick={() => {
                  onChange(draftFromIntake(s.intake))
                  setQuestionError(false)
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="lp-field lp-field--question" data-part>
        <label htmlFor="question">What are you deciding?</label>
        <textarea
          id="question"
          ref={questionRef}
          rows={3}
          value={draft.question}
          placeholder="Should we…"
          required
          aria-invalid={questionError || undefined}
          aria-describedby={questionError ? `${ids}-question-error` : undefined}
          onChange={(e) => set('question', e.target.value)}
        />
        {questionError && (
          <p className="lp-field__error" id={`${ids}-question-error`}>
            Write the decision as a question, like &ldquo;Should we hire a second technician?&rdquo;
          </p>
        )}
      </div>
      <div className="lp-field" data-part>
        <label htmlFor={`${ids}-leaning`}>Which way are you leaning?</label>
        <input
          id={`${ids}-leaning`}
          value={draft.leaning}
          placeholder="e.g. Yes, but I'm nervous about the cost"
          onChange={(e) => set('leaning', e.target.value)}
        />
      </div>

      <fieldset className="lp-profile" data-part>
        <legend>About your business</legend>
        <p className="lp-profile__hint">Optional, but the board gives sharper advice when it knows who you are.</p>
        <div className="lp-profile__grid">
          {PROFILE_FIELDS.map((f) => {
            const id = `${ids}-${f.key}`
            const hintId = f.hint ? `${id}-hint` : undefined
            return (
              <div key={f.key} className={f.wide ? 'lp-field lp-field--wide' : 'lp-field'}>
                <label htmlFor={id}>{f.label}</label>
                {f.multiline ? (
                  <textarea id={id} rows={2} value={draft[f.key]} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
                ) : (
                  <input id={id} value={draft[f.key]} placeholder={f.placeholder} aria-describedby={hintId} onChange={(e) => set(f.key, e.target.value)} />
                )}
                {f.hint && (
                  <p className="lp-field__hint" id={hintId}>
                    {f.hint}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </fieldset>

      <div className="lp-form__submit" data-part>
        <button type="submit" className="lp-btn lp-btn--primary lp-btn--big">
          Convene the board
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.5 8h10M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <p className="lp-form__note">A live meeting takes about a minute: research, two rounds of debate, then a recommendation.</p>
      </div>
    </form>
  )
}
