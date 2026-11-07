import { AnimatePresence, motion } from 'motion/react'
import { useState, type CSSProperties } from 'react'
import type { Phase } from '../lib/board'
import { SEAT_BY_ID, STANCE_LABEL, type SeatMeta } from '../seats'
import type { Round1Opinion, Round2Opinion, SeatId } from '../types'
import { FactText } from './facts'
import { EASE_OUT, EASE_SNAP } from './motion'

interface SeatCardProps {
  seat: SeatMeta
  r1: Round1Opinion | undefined
  r2: Round2Opinion | undefined
  phase: Phase
  stopped: boolean
  /** Another seat is lit and this one is not connected to it. */
  dimmed: boolean
  /** This seat's filaments are lit (hovered, focused, or its rebuttal just landed). */
  lit: boolean
  onFocusSeat: (seat: SeatId | null) => void
}

function Dots() {
  return (
    <span className="dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
}

function Confidence({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <p className="confidence">
      <span className="confidence__bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${pct / 100})` }} />
      </span>
      <span className="confidence__label">{pct}% sure</span>
    </p>
  )
}

function Opinion({ seat, opinion }: { seat: SeatId; opinion: Round1Opinion }) {
  return (
    <>
      <h3 className="seat__headline">{opinion.headline}</h3>
      <p className="seat__summary">
        <FactText text={opinion.summary} />
      </p>
      <Confidence value={opinion.confidence} />
      {seat === 'realist' && opinion.checks && opinion.checks.length > 0 && (
        <ul className="checks" aria-label="Realist checks">
          {opinion.checks.map((c, i) => (
            <li key={i} className="check" data-status={c.status}>
              <span className="check__chip">
                <span className="check__icon" aria-hidden="true">
                  {c.status === 'pass' ? '✓' : c.status === 'flag' ? '!' : '✕'}
                </span>
                <span className="check__area">{c.area}</span>
                <span className="check__status">{c.status}</span>
              </span>
              <span className="check__note">
                <FactText text={c.note} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {seat === 'ai_tools_expert' && opinion.tools && (
        <div className="tools">
          <h4 className="seat__sub">Tools worth a look</h4>
          {opinion.tools.length === 0 ? (
            <p className="seat__muted">No AI tool genuinely helps here.</p>
          ) : (
            <ul>
              {opinion.tools.map((t) => (
                <li key={t.name} className="tool">
                  <span className="tool__name">{t.name}</span>
                  <span className="tool__cost">{t.monthly_cost}</span>
                  <span className="tool__use">{t.use}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <details className="seat__more">
        <summary>Full reasoning</summary>
        {opinion.key_points.length > 0 && (
          <>
            <h4 className="seat__sub">Key points</h4>
            <ul className="seat__list">
              {opinion.key_points.map((k) => (
                <li key={k}>
                  <FactText text={k} />
                </li>
              ))}
            </ul>
          </>
        )}
        {opinion.risks.length > 0 && (
          <>
            <h4 className="seat__sub">Risks</h4>
            <ul className="seat__list">
              {opinion.risks.map((r) => (
                <li key={r}>
                  <FactText text={r} />
                </li>
              ))}
            </ul>
          </>
        )}
        {opinion.pushback && (
          <p className="seat__pushback">
            <span>Question this</span> <FactText text={opinion.pushback} />
          </p>
        )}
        {seat === 'ai_tools_expert' && opinion.tools && opinion.tools.length > 0 && (
          <>
            <h4 className="seat__sub">Tool details</h4>
            <ul className="seat__list">
              {opinion.tools.map((t) => (
                <li key={t.name}>
                  <strong>{t.name}</strong> works with {t.works_with}. Watch out: {t.caveat}
                </li>
              ))}
            </ul>
          </>
        )}
      </details>
    </>
  )
}

function Rebuttals({ r2 }: { r2: Round2Opinion }) {
  return (
    <motion.div
      className="debate"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
    >
      <h4 className="debate__title">
        Rebuttals <span>Round 2</span>
      </h4>
      {r2.changed_position && (
        <div className="debate__changed">
          <p className="mark-changed">Changed position</p>
          {r2.changed_because && (
            <p>
              <FactText text={r2.changed_because} />
            </p>
          )}
        </div>
      )}
      <ul className="debate__rebuttals">
        {r2.rebuttals.map((r, i) => (
          <li key={i} className="rebuttal" style={{ '--c': `var(--seat-${r.target})` } as CSSProperties}>
            <p className="rebuttal__target">
              <span aria-hidden="true">↳</span> rebuts {SEAT_BY_ID[r.target]?.title ?? r.target}
            </p>
            <p className="rebuttal__claim">&ldquo;{r.their_claim}&rdquo;</p>
            <p className="rebuttal__response">
              <FactText text={r.response} />
            </p>
          </li>
        ))}
      </ul>
      {r2.concessions.length > 0 && (
        <div className="debate__concessions">
          <h5>
            Concedes <span>Slag: points dropped</span>
          </h5>
          <ul>
            {r2.concessions.map((c) => (
              <li key={c}>
                <FactText text={c} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}

export function SeatCard({ seat, r1, r2, phase, stopped, dimmed, lit, onFocusSeat }: SeatCardProps) {
  const [view, setView] = useState<'r1' | 'r2'>('r2')
  const style = { '--c': `var(--seat-${seat.id})` } as CSSProperties
  const initial = seat.title[0]

  if (!r1) {
    const thinking = phase === 'round1' && !stopped
    const status = stopped ? "Didn't finish" : thinking ? 'Thinking' : 'Waiting for the research'
    return (
      <article
        id={`seat-card-${seat.id}`}
        className="seat seat--pending"
        style={style}
        aria-label={`${seat.title}: ${status}`}
        data-thinking={thinking || undefined}
      >
        <header className="seat__head">
          <span className="seat__avatar" aria-hidden="true">
            {initial}
          </span>
          <p className="seat__name">{seat.title}</p>
        </header>
        <p className="seat__role">{seat.role}</p>
        <p className="seat__status">
          {status}
          {thinking && <Dots />}
        </p>
      </article>
    )
  }

  const showing = r2 && view === 'r2' ? r2 : r1
  const stanceMoved = r2 && r2.stance !== r1.stance
  const awaitingRebuttal = !r2 && phase === 'rebuttals' && !stopped
  return (
    <motion.article
      id={`seat-card-${seat.id}`}
      className="seat"
      style={style}
      aria-labelledby={`seat-${seat.id}`}
      data-lit={lit || undefined}
      initial={{ opacity: 0, y: 18 }}
      // Motion owns the inline opacity, so the dimming for an unrelated seat runs through it too.
      animate={{ opacity: dimmed ? 0.4 : 1, y: 0 }}
      transition={{ y: { duration: 0.55, ease: EASE_SNAP }, opacity: { duration: dimmed ? 0.24 : 0.4, ease: EASE_OUT } }}
      onMouseEnter={() => onFocusSeat(seat.id)}
      onMouseLeave={() => onFocusSeat(null)}
      onFocus={() => onFocusSeat(seat.id)}
      onBlur={() => onFocusSeat(null)}
    >
      <header className="seat__head">
        <span className="seat__avatar" aria-hidden="true">
          {initial}
        </span>
        <h2 className="seat__name" id={`seat-${seat.id}`}>
          {seat.title}
        </h2>
        <p className="stance" data-stance={showing.stance}>
          {STANCE_LABEL[showing.stance]}
        </p>
      </header>
      {r2 && (
        <div className="seat__rounds" role="group" aria-label="Show position from">
          <button type="button" aria-pressed={view === 'r1'} onClick={() => setView('r1')}>
            Opening
          </button>
          <button type="button" aria-pressed={view === 'r2'} onClick={() => setView('r2')}>
            After debate{stanceMoved ? ' •' : ''}
          </button>
        </div>
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={showing === r2 ? 'r2' : 'r1'}
          className="seat__body"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
        >
          <Opinion seat={seat.id} opinion={showing} />
        </motion.div>
      </AnimatePresence>
      {r2 ? (
        <Rebuttals r2={r2} />
      ) : awaitingRebuttal ? (
        <p className="debate debate--pending">
          Drafting a rebuttal
          <Dots />
        </p>
      ) : null}
    </motion.article>
  )
}
