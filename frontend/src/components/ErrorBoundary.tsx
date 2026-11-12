import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportRenderError } from '../lib/errorReport'
import { ThemeToggle } from './ThemeToggle'
import { Wordmark } from './Wordmark'

interface State {
  error: Error | null
}

/**
 * Catches a render error anywhere in one view, so the page shows a way out instead of going blank. A failed
 * code-split chunk (a new deploy while the tab was open) lands here too, and a reload fixes it. App keys this by
 * view, so moving to another page starts clean.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Crucible view crashed', error, info.componentStack)
    reportRenderError(error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="page lost">
        <header className="lost__head">
          <a className="lost__home" href="/" aria-label="Crucible home">
            <Wordmark />
          </a>
          <ThemeToggle />
        </header>
        <main className="lost__main" role="alert" aria-labelledby="crash-title">
          <svg className="lost__mold" viewBox="0 0 160 56" aria-hidden="true" focusable="false">
            <path d="M4 6H156L144 50H16Z" />
            <path className="lost__seam" d="M22 40H138" />
          </svg>
          <p className="lost__kicker">Something broke</p>
          <h1 className="lost__title" id="crash-title">
            This page cracked in the mould.
          </h1>
          <p className="lost__body">
            Crucible hit an error it didn’t expect, so it stopped here instead of showing something wrong. Nothing you saved is lost:
            reload to try again, or start from the home page.
          </p>
          <div className="lost__actions">
            <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
              Reload this page
            </button>
            <a className="btn btn--secondary" href="/">
              Go to the home page
            </a>
          </div>
          <details className="lost__detail">
            <summary>Technical details</summary>
            <pre>{error.message}</pre>
          </details>
        </main>
      </div>
    )
  }
}
