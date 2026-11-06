import { AnimatePresence, motion } from 'motion/react'
import { useState, type CSSProperties } from 'react'
import type { Phase } from '../lib/board'
import { SEAT_BY_ID, STANCE_LABEL, type SeatMeta } from '../seats'
import type { Round1Opinion, Round2Opinion, SeatId } from '../types'
import { FactText } from './facts'
import { EASE_OUT, EASE_PIN } from './motion'

/** Fixed per-seat tilt so the board looks hand-pinned but never reshuffles between renders. */
const TILT: Record<SeatId, number> = {
  industry_expert: -1.4,
  ai_tools_expert: 1.1,
  realist: -0.6,
  strategist: 1.5,
  devils_advocate: -1.1,
}

interface SeatCardProps {
  seat: SeatMeta
  r1: Round1Opinion | undefined
  r2: Round2Opinion | undefined
  phase: Phase
  stopped: boolean
  dimmed: boolean
  onFocusSeat: (seat: SeatId | null) => void
  pinRef: (el: HTMLSpanElement | null) => void
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
        <summary>
          <span>Full reasoning</span>
        </summary>
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

function RebuttalSlip({ r2, seat }: { r2: Round2Opinion; seat: SeatId }) {
  return (
    <motion.div
      className="slip"
      initial={{ opacity: 0, y: -14, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate: TILT[seat] > 0 ? -1.2 : 1.2 }}
      transition={{ duration: 0.45, ease: EASE_PIN }}
    >
      <span className="tape" aria-hidden="true" />
      <h4 className="slip__title">Round 2</h4>
      {r2.changed_position && (
        <div className="slip__changed">
          <span className="stamp stamp--changed">Changed position</span>
          {r2.changed_because && (
            <p>
              <FactText text={r2.changed_because} />
            </p>
          )}
        </div>
      )}
      <ul className="slip__rebuttals">
        {r2.rebuttals.map((r, i) => (
          <li key={i} className="rebuttal" style={{ '--pin': `var(--pin-${r.target})` } as CSSProperties}>
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
        <div className="slip__concessions">
          <h5>Concedes</h5>
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

export function SeatCard({ seat, r1, r2, phase, stopped, dimmed, onFocusSeat, pinRef }: SeatCardProps) {
  const [view, setView] = useState<'r1' | 'r2'>('r2')
  const style = { '--pin': `var(--pin-${seat.id})`, '--tilt': `${TILT[seat.id]}deg` } as CSSProperties

  if (!r1) {
    const status = stopped ? "Didn't finish" : phase === 'round1' ? 'Thinking' : 'Waiting for the research'
    return (
      <article className="seat seat--pending" style={style} aria-label={`${seat.title}: ${status}`} data-thinking={phase === 'round1' && !stopped}>
        <span className="pin pin--ghost" ref={pinRef} aria-hidden="true" />
        <p className="seat__name">{seat.title}</p>
        <p className="seat__role">{seat.role}</p>
        <p className="seat__status">
          {status}
          {phase === 'round1' && !stopped && (
            <span className="dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          )}
        </p>
      </article>
    )
  }

  const showing = r2 && view === 'r2' ? r2 : r1
  const stanceMoved = r2 && r2.stance !== r1.stance
  const awaitingRebuttal = !r2 && phase === 'rebuttals' && !stopped
  return (
    <motion.article
      className="seat"
      style={style}
      aria-labelledby={`seat-${seat.id}`}
      data-dimmed={dimmed || undefined}
      initial={{ opacity: 0, y: -30, scale: 1.04, rotate: TILT[seat.id] + 4 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: TILT[seat.id] }}
      transition={{ duration: 0.55, ease: EASE_PIN }}
      onMouseEnter={() => onFocusSeat(seat.id)}
      onMouseLeave={() => onFocusSeat(null)}
      onFocus={() => onFocusSeat(seat.id)}
      onBlur={() => onFocusSeat(null)}
    >
      <motion.span
        className="pin"
        ref={pinRef}
        aria-hidden="true"
        initial={{ opacity: 0, scale: 1.8, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.32, ease: EASE_OUT }}
      />
      <header className="seat__head">
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
        <RebuttalSlip r2={r2} seat={seat.id} />
      ) : awaitingRebuttal ? (
        <p className="slip slip--pending">
          Drafting a rebuttal
          <span className="dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </p>
      ) : null}
    </motion.article>
  )
}
