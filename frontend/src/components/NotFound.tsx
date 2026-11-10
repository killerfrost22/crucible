import { navigateOnClick } from '../lib/nav'
import { REPLAYS } from '../lib/replay'
import { ThemeToggle } from './ThemeToggle'
import { Wordmark } from './Wordmark'

/** An unknown path, or `?replay=<name>` for a recording we don't ship: an empty, cold mould and the way back. */
export function NotFound({ recording }: { recording?: string }) {
  return (
    <div className="page lost">
      <a className="skip" href="#lost-main">
        Skip to content
      </a>
      <header className="lost__head">
        <a className="lost__home" href="/" onClick={navigateOnClick('/')} aria-label="Crucible home">
          <Wordmark />
        </a>
        <ThemeToggle />
      </header>

      <main id="lost-main" className="lost__main" tabIndex={-1}>
        <svg className="lost__mold" viewBox="0 0 160 56" aria-hidden="true" focusable="false">
          <path d="M4 6H156L144 50H16Z" />
          <path className="lost__seam" d="M22 40H138" />
        </svg>
        <p className="lost__kicker">{recording === undefined ? '404 · Not found' : 'Recording not found'}</p>
        <h1 className="lost__title">{recording === undefined ? 'Nothing was cast here.' : 'That meeting was never recorded.'}</h1>
        <p className="lost__body">
          {recording === undefined ? (
            <>
              There is no page at <code>{window.location.pathname}</code>. Start from the home page, or watch the board work
              through a real decision.
            </>
          ) : (
            <>
              There is no recorded session called <code>{recording}</code>. Check the link, or pick one of the real meetings
              below.
            </>
          )}
        </p>
        <a className="btn btn--primary lost__cta" href="/" onClick={navigateOnClick('/')}>
          Go to the home page
        </a>

        <section className="lost__replays" aria-labelledby="lost-replays-title">
          <h2 className="section-label" id="lost-replays-title">
            Recorded sessions
          </h2>
          <ul>
            {REPLAYS.map((r) => {
              const href = `/?replay=${encodeURIComponent(r.name)}`
              return (
                <li key={r.name}>
                  <a className="lost__replay" href={href} onClick={navigateOnClick(href)}>
                    <span className="lost__replay-label">
                      {r.label}
                      <span aria-hidden="true">→</span>
                    </span>
                    <span className="lost__replay-blurb">{r.blurb}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      </main>
    </div>
  )
}
