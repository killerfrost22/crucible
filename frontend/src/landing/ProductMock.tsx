import type { CSSProperties } from 'react'
import { SCENARIOS } from '../scenarios'
import { SEAT_BY_ID, STANCE_LABEL } from '../seats'
import { CHAIRMAN, HVAC_FACTS, HVAC_REPLAY, MEMBERS, MOCK_STANCES, MOCK_THREAD } from './content'

const dot = (color: string) => ({ '--k': color }) as CSSProperties
const HVAC = SCENARIOS.find((s) => s.id === HVAC_REPLAY)!

/** The hero's picture of a session in progress: the recorded HVAC meeting, mid-way to a verdict. */
export function ProductMock() {
  return (
    <div
      className="lp-mock"
      data-part
      data-rail="h"
      role="img"
      aria-label="A Crucible session in progress: a Frederick HVAC shop asks whether to text every past customer a fall tune-up promo. Four seats say yes only with conditions, the Devil's Advocate is against it, and the Chairman is deciding."
    >
      <aside className="lp-mock__side" data-part>
        <div className="lp-mock__ws">
          <span className="lp-mock__sq">H</span>HVAC · Frederick, MD
        </div>
        <div className="lp-mock__new">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          New decision
        </div>
        <div className="lp-mock__label">Sessions</div>
        <ul className="lp-mock__list">
          {SCENARIOS.map((s) => (
            <li key={s.id} className={s === HVAC ? 'is-on' : undefined}>
              {s.intake.question}
            </li>
          ))}
        </ul>
        <div className="lp-mock__label">Board</div>
        <ul className="lp-mock__list">
          {MEMBERS.map((m) => (
            <li key={m.id}>
              <span className={m.id === 'chairman' ? 'lp-dot lp-dot--molten' : 'lp-dot'} style={dot(m.color)} />
              {m.title}
            </li>
          ))}
        </ul>
      </aside>

      <div className="lp-mock__main">
        <div className="lp-mock__head" data-part>
          <div>
            <div className="lp-mock__title">{HVAC.intake.question}</div>
            <div className="lp-mock__sub">Round 1 of 2 · opening positions are in</div>
          </div>
          <span className="lp-mock__chip">In session</span>
        </div>
        <div className="lp-mock__thread">
          {MOCK_THREAD.map((m) => (
            <div key={m.seat} className="lp-msg" data-part style={dot(`var(--seat-${m.seat})`)}>
              <span className="lp-msg__av">{SEAT_BY_ID[m.seat].title[0]}</span>
              <div>
                <div className="lp-msg__who">
                  {SEAT_BY_ID[m.seat].title} <span className="lp-msg__re">{STANCE_LABEL[m.stance]}</span>
                </div>
                <p className="lp-msg__text">{m.text}</p>
              </div>
            </div>
          ))}
          <div className="lp-msg lp-msg--chair" data-part style={dot(CHAIRMAN.color)}>
            <span className="lp-msg__av">C</span>
            <div>
              <div className="lp-msg__who">Chairman</div>
              <p className="lp-msg__text">
                All five seats say don’t blast the whole list. Weighing consent against capacity
                <span className="lp-dots">
                  <i />
                  <i />
                  <i />
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="lp-mock__foot" data-part>
          <span>
            <span className="lp-dot" style={dot('var(--lp-text-2)')} />
            Researcher · {HVAC_FACTS} facts on file, cited F1–F{HVAC_FACTS}
          </span>
        </div>
      </div>

      <aside className="lp-mock__stand" data-part>
        <div className="lp-mock__label">Where the board stands</div>
        <ul className="lp-stance">
          {MOCK_STANCES.map((s) => (
            <li key={s.seat}>
              <span>
                <span className="lp-dot" style={dot(`var(--seat-${s.seat})`)} />
                {SEAT_BY_ID[s.seat].title}
              </span>
              <b data-stance={s.stance}>{STANCE_LABEL[s.stance]}</b>
            </li>
          ))}
          <li>
            <span>
              <span className="lp-dot lp-dot--molten" />
              Chairman
            </span>
            <b className="is-pending">Deciding</b>
          </li>
        </ul>
        <div className="lp-mock__label">Draft verdict</div>
        <div className="lp-mock__draft">
          <span style={{ width: '94%' }} />
          <span style={{ width: '76%' }} />
          <span style={{ width: '86%' }} />
          <span style={{ width: '52%' }} />
        </div>
      </aside>
    </div>
  )
}
