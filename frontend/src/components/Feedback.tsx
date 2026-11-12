import { useId, useRef, useState, type FormEvent } from 'react'
import type { Feedback as FeedbackAnswer } from '../types'

interface FeedbackProps {
  feedback: FeedbackAnswer | null
  onSubmit: (useful: boolean, note: string) => Promise<void>
}

/**
 * "Was this useful?" on a saved decision: one tap saves the answer with the decision, then an optional note. The answer
 * stays on the decision and can be changed; nothing is sent anywhere else.
 */
export function Feedback({ feedback, onSubmit }: FeedbackProps) {
  const ids = useId()
  const [saving, setSaving] = useState<'yes' | 'no' | 'note' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState(feedback?.note ?? '')
  const [noteSaved, setNoteSaved] = useState(Boolean(feedback?.note))
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const save = async (useful: boolean, text: string, which: 'yes' | 'no' | 'note') => {
    setSaving(which)
    setError(null)
    try {
      await onSubmit(useful, text)
      if (which === 'note') setNoteSaved(true)
      else requestAnimationFrame(() => noteRef.current?.focus())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(null)
    }
  }

  const submitNote = (event: FormEvent) => {
    event.preventDefault()
    if (feedback) void save(feedback.useful, note, 'note')
  }

  return (
    <section className="feedback" aria-labelledby={`${ids}-title`}>
      <h2 className="feedback__title" id={`${ids}-title`}>
        Was this useful?
      </h2>
      <div className="feedback__choices" role="group" aria-labelledby={`${ids}-title`}>
        <button
          type="button"
          className="btn btn--secondary feedback__choice"
          aria-pressed={feedback?.useful === true}
          aria-busy={saving === 'yes'}
          disabled={saving !== null}
          onClick={() => void save(true, note, 'yes')}
        >
          Yes, it helped
        </button>
        <button
          type="button"
          className="btn btn--secondary feedback__choice"
          aria-pressed={feedback?.useful === false}
          aria-busy={saving === 'no'}
          disabled={saving !== null}
          onClick={() => void save(false, note, 'no')}
        >
          Not really
        </button>
      </div>
      <p className="feedback__status" aria-live="polite">
        {feedback ? 'Thanks. Your answer is saved with this decision; you can change it.' : 'One tap. Your answer is saved with this decision.'}
      </p>
      {feedback && (
        <form className="feedback__note" onSubmit={submitNote}>
          <label htmlFor={`${ids}-note`}>{feedback.useful ? 'What helped most? (optional)' : 'What would have made it useful? (optional)'}</label>
          <textarea
            ref={noteRef}
            id={`${ids}-note`}
            rows={2}
            maxLength={1000}
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              setNoteSaved(false)
            }}
          />
          <div className="feedback__actions">
            <button type="submit" className="btn btn--secondary" disabled={saving !== null || !note.trim() || noteSaved} aria-busy={saving === 'note'}>
              {saving === 'note' ? 'Saving…' : noteSaved ? 'Note saved' : 'Save note'}
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
