import { useRef, useState } from 'react'
import { ApiError } from '../lib/api'

/**
 * The end of a saved decision: what is kept, and a two-step delete (ask, then confirm), so nothing goes on one click.
 * On success the owner is sent home, where the decision is gone from **Your decisions**.
 */
export function DeleteDecision({ onDelete, onDeleted }: { onDelete: () => Promise<void>; onDeleted: () => void }) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'deleting'>('idle')
  const [error, setError] = useState<string | null>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  const remove = async () => {
    setStep('deleting')
    setError(null)
    try {
      await onDelete()
      onDeleted()
    } catch (e) {
      setStep('confirm')
      setError(
        e instanceof ApiError
          ? (e.detail ?? `The server didn’t delete it (error ${e.status}). Try again.`)
          : 'We couldn’t reach the server to delete it. Check the connection and try again.',
      )
    }
  }

  return (
    <section className="forget" aria-labelledby="forget-title">
      <h2 className="forget__title" id="forget-title">
        This decision is saved
      </h2>
      <p className="forget__body">
        Crucible keeps the question, the whole meeting and your call, so you can reopen it from this browser. Delete it when you no
        longer need it.
      </p>
      {step === 'idle' ? (
        <button
          type="button"
          className="btn btn--secondary forget__btn"
          onClick={() => {
            setStep('confirm')
            requestAnimationFrame(() => confirmRef.current?.focus())
          }}
        >
          Delete this decision
        </button>
      ) : (
        <div className="forget__confirm" role="group" aria-label="Confirm delete">
          <p className="forget__ask">Delete it for good? This can’t be undone.</p>
          <div className="forget__actions">
            <button
              ref={confirmRef}
              type="button"
              className="btn forget__danger"
              disabled={step === 'deleting'}
              aria-busy={step === 'deleting'}
              onClick={remove}
            >
              {step === 'deleting' ? 'Deleting…' : 'Yes, delete it'}
            </button>
            <button type="button" className="btn btn--quiet" disabled={step === 'deleting'} onClick={() => setStep('idle')}>
              Keep it
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
