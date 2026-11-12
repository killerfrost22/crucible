import { useId, useState, type CSSProperties, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { draftFromIntake, intakeFromDraft, type IntakeDraft } from '../lib/intakeDraft'
import { SCENARIOS } from '../scenarios'
import type { Intake } from '../types'
import { Chevron } from './icons'
import { scrollBehavior } from './useReducedMotion'

interface IntakeFormProps {
  draft: IntakeDraft
  onChange: (draft: IntakeDraft) => void
  onSubmit: (intake: Intake) => void
}

type FieldKey = keyof IntakeDraft
type ProfileKey = Exclude<FieldKey, 'question' | 'leaning'>
type Errors = Partial<Record<FieldKey, string>>

interface ProfileField {
  key: ProfileKey
  label: string
  placeholder: string
  max: number
  hint?: string
  wide?: boolean
  multiline?: boolean
  /** A comma-separated field: the profile list it becomes, which the server caps per item and in length. */
  list?: 'current_tools' | 'goals'
}

/** `max` matches the caps in backend/guard.py; the server rejects a longer intake before any model runs. */
const PROFILE_FIELDS: ProfileField[] = [
  { key: 'name', label: 'Business name', placeholder: 'e.g. Third Shift Coffee', max: 200 },
  { key: 'industry', label: 'What you do', placeholder: 'e.g. coffee shop', max: 200 },
  { key: 'location', label: 'Where', placeholder: 'e.g. Hyattsville, Maryland', max: 200 },
  { key: 'size', label: 'How big', placeholder: 'e.g. 1 location, 8 staff', max: 200 },
  { key: 'tools', label: 'Tools you already use', placeholder: 'e.g. Square, Instagram, Google Sheets', max: 1000, hint: 'Separate with commas', wide: true, list: 'current_tools' },
  { key: 'budget', label: 'Budget for this', placeholder: 'e.g. $200/month', max: 200 },
  { key: 'goals', label: 'What you want out of it', placeholder: 'e.g. more weekday regulars', max: 1000, hint: 'Separate with commas', list: 'goals' },
  { key: 'constraints', label: 'Anything the board should know', placeholder: 'e.g. I work the morning shift six days a week', max: 2000, wide: true, multiline: true },
]

/** The list caps in backend/guard.py: at most 20 items, each 100 characters or fewer. */
const LIST_ITEMS = 20
const LIST_ITEM_CHARS = 100

/** Form order, so a failed submit focuses the first field that needs a fix. */
const FIELD_ORDER: FieldKey[] = ['question', 'leaning', ...PROFILE_FIELDS.map((f) => f.key)]

/** What the server would reject, checked here so the owner fixes it in place instead of on an error screen. */
function check(draft: IntakeDraft): Errors {
  const intake = intakeFromDraft(draft)
  const errors: Errors = {}
  if (intake.question.length < 3) errors.question = 'Write the decision as a question, like “Should we hire a second technician?”'
  for (const f of PROFILE_FIELDS) {
    if (!f.list) continue
    const items = intake.profile[f.list]
    if (items.length > LIST_ITEMS) errors[f.key] = `List ${LIST_ITEMS} or fewer, separated by commas.`
    else if (items.some((item) => item.length > LIST_ITEM_CHARS)) errors[f.key] = `Keep each item to ${LIST_ITEM_CHARS} characters or fewer, separated by commas.`
  }
  return errors
}

/** One seat colour per example chip, so they read as distinct at a glance. */
const CHIP_COLORS = ['var(--seat-industry_expert)', 'var(--seat-realist)', 'var(--seat-ai_tools_expert)']

/**
 * The real intake: the privacy warning first, an example to start from, the question and the leaning. The optional
 * business profile sits behind **Add business details**; its fields stay mounted (and the draft lives in Home), so
 * closing it never loses what was typed, and a submit that fails inside it opens it on the field to fix.
 */
export function IntakeForm({ draft, onChange, onSubmit }: IntakeFormProps) {
  const ids = useId()
  const [errors, setErrors] = useState<Errors>({})
  const [detailsOpen, setDetailsOpen] = useState(false)
  const fieldId = (key: FieldKey) => (key === 'question' ? 'question' : `${ids}-${key}`)
  const errorId = (key: FieldKey) => `${fieldId(key)}-error`

  const set = (key: FieldKey, value: string) => {
    const next = { ...draft, [key]: value }
    onChange(next)
    // A shown error clears as soon as the field is fixed; new errors wait for the next submit.
    if (errors[key]) setErrors({ ...errors, [key]: check(next)[key] })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = check(draft)
    const first = FIELD_ORDER.find((key) => found[key])
    if (!first) {
      setErrors({})
      onSubmit(intakeFromDraft(draft))
      return
    }
    // Show the errors and open the details synchronously, so the field and its message are on the page to scroll to.
    flushSync(() => {
      setErrors(found)
      if (PROFILE_FIELDS.some((f) => f.key === first)) setDetailsOpen(true)
    })
    const field = document.getElementById(fieldId(first))
    field?.focus({ preventScroll: true })
    field?.closest('.hm-field')?.scrollIntoView({ block: 'center', behavior: scrollBehavior() })
  }

  const filled = PROFILE_FIELDS.filter((f) => draft[f.key].trim()).length
  const detailErrors = PROFILE_FIELDS.filter((f) => errors[f.key]).length
  const detailsId = `${ids}-details`
  const status = detailErrors ? 'Needs a fix' : filled ? `${filled} of ${PROFILE_FIELDS.length} added` : 'Optional'

  return (
    <form className="hm-form" onSubmit={submit} noValidate aria-labelledby="convene-title">
      <aside className="hm-privacy" aria-labelledby={`${ids}-privacy`}>
        <p className="hm-privacy__title" id={`${ids}-privacy`}>
          A prototype · before you type
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
                The decision (your question and details, the whole meeting, your signed call, and your answer to “Was this useful?” if you
                give one) is saved on Crucible’s server so you can reopen it. The only key to it is a random id in this browser’s storage: no
                account, name or email. This is a prototype, so a redeploy can also wipe saved decisions.
              </dd>
            </div>
            <div>
              <dt>If the page breaks</dt>
              <dd>
                The error message and the page’s address (without its query) go to Crucible’s server log, so we can fix it. Nothing you
                typed is in it. There are no analytics, cookies or third-party trackers.
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
                  setErrors({})
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
          rows={3}
          maxLength={1000}
          value={draft.question}
          placeholder="Should we…"
          required
          aria-invalid={errors.question ? true : undefined}
          aria-describedby={errors.question ? errorId('question') : undefined}
          onChange={(e) => set('question', e.target.value)}
        />
        {errors.question && (
          <p className="hm-field__error" id={errorId('question')}>
            {errors.question}
          </p>
        )}
      </div>
      <div className="hm-field">
        <label htmlFor={fieldId('leaning')}>Which way are you leaning?</label>
        <input
          id={fieldId('leaning')}
          value={draft.leaning}
          maxLength={500}
          placeholder="e.g. Yes, but I'm nervous about the cost"
          onChange={(e) => set('leaning', e.target.value)}
        />
      </div>

      <div className="hm-details">
        <button
          type="button"
          className="hm-details__toggle"
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          onClick={() => setDetailsOpen((o) => !o)}
        >
          <span className="hm-details__icon" aria-hidden="true">
            <Chevron />
          </span>
          <span className="hm-details__head">
            <span className="hm-details__label">Add business details</span>
            <span className="hm-details__status" data-error={detailErrors ? true : undefined}>
              {status}
            </span>
          </span>
          <span className="hm-details__why">The board gives sharper advice when it knows who you are.</span>
        </button>
        <fieldset className="hm-profile" id={detailsId} hidden={!detailsOpen}>
          <legend className="visually-hidden">About your business</legend>
          <div className="hm-profile__grid">
            {PROFILE_FIELDS.map((f) => {
              const id = fieldId(f.key)
              const hintId = f.hint ? `${id}-hint` : undefined
              const error = errors[f.key]
              const describedBy = [error && errorId(f.key), hintId].filter(Boolean).join(' ') || undefined
              const common = {
                id,
                maxLength: f.max,
                value: draft[f.key],
                placeholder: f.placeholder,
                'aria-invalid': error ? true : undefined,
                'aria-describedby': describedBy,
              }
              return (
                <div key={f.key} className={f.wide ? 'hm-field hm-field--wide' : 'hm-field'}>
                  <label htmlFor={id}>{f.label}</label>
                  {f.multiline ? (
                    <textarea {...common} rows={2} onChange={(e) => set(f.key, e.target.value)} />
                  ) : (
                    <input {...common} onChange={(e) => set(f.key, e.target.value)} />
                  )}
                  {error && (
                    <p className="hm-field__error" id={errorId(f.key)}>
                      {error}
                    </p>
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
      </div>

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
