import { useId, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { draftFromIntake, intakeFromDraft, type IntakeDraft } from '../lib/intakeDraft'
import { SCENARIOS } from '../scenarios'
import type { Intake } from '../types'

interface IntakeFormProps {
  draft: IntakeDraft
  onChange: (draft: IntakeDraft) => void
  onSubmit: (intake: Intake) => void
}

type ProfileKey = Exclude<keyof IntakeDraft, 'question' | 'leaning'>

/** `max` matches the caps in backend/guard.py; the server rejects a longer intake before any model runs. */
const PROFILE_FIELDS: { key: ProfileKey; label: string; placeholder: string; max: number; hint?: string; wide?: boolean; multiline?: boolean }[] = [
  { key: 'name', label: 'Business name', placeholder: 'e.g. Third Shift Coffee', max: 200 },
  { key: 'industry', label: 'What you do', placeholder: 'e.g. coffee shop', max: 200 },
  { key: 'location', label: 'Where', placeholder: 'e.g. Hyattsville, Maryland', max: 200 },
  { key: 'size', label: 'How big', placeholder: 'e.g. 1 location, 8 staff', max: 200 },
  { key: 'tools', label: 'Tools you already use', placeholder: 'e.g. Square, Instagram, Google Sheets', max: 1000, hint: 'Separate with commas', wide: true },
  { key: 'budget', label: 'Budget for this', placeholder: 'e.g. $200/month', max: 200 },
  { key: 'goals', label: 'What you want out of it', placeholder: 'e.g. more weekday regulars', max: 1000, hint: 'Separate with commas' },
  { key: 'constraints', label: 'Anything the board should know', placeholder: 'e.g. I work the morning shift six days a week', max: 2000, wide: true, multiline: true },
]

/** One seat colour per example chip, so the three read as distinct at a glance. */
const CHIP_COLORS = ['var(--seat-industry_expert)', 'var(--seat-realist)', 'var(--seat-ai_tools_expert)']

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
    <form className="hm-form" onSubmit={submit} noValidate aria-labelledby="convene-title">
      <div className="hm-examples" role="group" aria-labelledby={`${ids}-examples`}>
        <p className="hm-examples__label" id={`${ids}-examples`}>
          Start from an example
        </p>
        <ul className="hm-examples__list">
          {SCENARIOS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className="hm-chip"
                style={{ '--k': CHIP_COLORS[i % CHIP_COLORS.length] } as CSSProperties}
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

      <div className="hm-field hm-field--question">
        <label htmlFor="question">What are you deciding?</label>
        <textarea
          id="question"
          ref={questionRef}
          rows={3}
          maxLength={1000}
          value={draft.question}
          placeholder="Should we…"
          required
          aria-invalid={questionError || undefined}
          aria-describedby={questionError ? `${ids}-question-error` : undefined}
          onChange={(e) => set('question', e.target.value)}
        />
        {questionError && (
          <p className="hm-field__error" id={`${ids}-question-error`}>
            Write the decision as a question, like &ldquo;Should we hire a second technician?&rdquo;
          </p>
        )}
      </div>
      <div className="hm-field">
        <label htmlFor={`${ids}-leaning`}>Which way are you leaning?</label>
        <input
          id={`${ids}-leaning`}
          value={draft.leaning}
          maxLength={500}
          placeholder="e.g. Yes, but I'm nervous about the cost"
          onChange={(e) => set('leaning', e.target.value)}
        />
      </div>

      <fieldset className="hm-profile">
        <legend>About your business</legend>
        <p className="hm-profile__hint">Optional, but the board gives sharper advice when it knows who you are.</p>
        <div className="hm-profile__grid">
          {PROFILE_FIELDS.map((f) => {
            const id = `${ids}-${f.key}`
            const hintId = f.hint ? `${id}-hint` : undefined
            return (
              <div key={f.key} className={f.wide ? 'hm-field hm-field--wide' : 'hm-field'}>
                <label htmlFor={id}>{f.label}</label>
                {f.multiline ? (
                  <textarea id={id} rows={2} maxLength={f.max} value={draft[f.key]} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
                ) : (
                  <input id={id} maxLength={f.max} value={draft[f.key]} placeholder={f.placeholder} aria-describedby={hintId} onChange={(e) => set(f.key, e.target.value)} />
                )}
                {f.hint && (
                  <p className="hm-field__hint" id={hintId}>
                    {f.hint}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </fieldset>

      <aside className="hm-privacy" aria-labelledby={`${ids}-privacy`}>
        <p className="hm-privacy__title" id={`${ids}-privacy`}>
          Before you convene
        </p>
        <p className="hm-privacy__warn">
          <b>Don’t enter patient, customer or payment details.</b> Describe the decision, not the people in it.
        </p>
        <details className="hm-privacy__more">
          <summary>What happens to what you type</summary>
          <dl>
            <div>
              <dt>Sent to the AI</dt>
              <dd>
                Your question and business details go through OpenRouter to Anthropic’s Claude models, which run all twelve calls, and the
                web search runs on your question, industry and location. OpenRouter says it doesn’t keep prompts unless an account opts in (
                <a href="https://openrouter.ai/docs/guides/privacy/data-collection" target="_blank" rel="noreferrer">
                  its policy
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
                ). Anthropic and the search provider handle requests under their own policies.
              </dd>
            </div>
            <div>
              <dt>Kept by Crucible</dt>
              <dd>
                The decision (your question and details, the whole meeting, and your signed call) is saved on Crucible’s server so you can
                reopen it. The only key to it is a random id in this browser’s storage: no account, name or email. This is a prototype, so a
                redeploy can also wipe saved decisions.
              </dd>
            </div>
            <div>
              <dt>Deleting it</dt>
              <dd>
                Open the decision (it’s under <b>Your decisions</b> on this page) and choose <b>Delete this decision</b>. Clearing this
                browser’s data only loses the key; the decision stays on the server until it’s deleted.
              </dd>
            </div>
          </dl>
        </details>
      </aside>

      <div className="hm-form__submit">
        <button type="submit" className="hm-btn hm-btn--primary hm-btn--lg">
          Convene the board
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M2.5 8h10M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <p className="hm-form__note">A live meeting takes about 90 seconds: research, two rounds of debate, then a recommendation.</p>
      </div>
    </form>
  )
}
