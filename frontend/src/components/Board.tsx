import { MotionConfig } from 'motion/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { humanizeErrors } from '../lib/errors'
import { REPLAYS } from '../lib/replay'
import { REPLAY_SPEEDS, useBoardRun, type RunSource } from '../lib/useBoardRun'
import { SEATS } from '../seats'
import type { SeatId } from '../types'
import { FactProvider } from './facts'
import { ErrorNotice, FactPeek } from './Notices'
import { EvidenceReceipt, QuestionCard } from './Paper'
import { PHASE_STEPS, PhaseRail } from './PhaseRail'
import { SeatCard } from './SeatCard'
import { DECISION_COPY, VerdictCard, YourCall } from './Verdict'
import { Wordmark } from './Wordmark'
import { Yarn, type YarnLink } from './Yarn'

interface BoardProps {
  source: RunSource
  onNew: () => void
  onEdit?: () => void
  onRetry?: () => void
  onReplay: (name: string) => void
}

export function Board({ source, onNew, onEdit, onRetry, onReplay }: BoardProps) {
  const run = useBoardRun(source)
  const { board, transport } = run
  const replay = source.mode === 'replay'
  const error = humanizeErrors(board.errors)
  const stopped = !board.verdict && (board.errors.length > 0 || transport === 'done')
  const [activeSeat, setActiveSeat] = useState<SeatId | null>(null)
  const seatsRef = useRef<HTMLDivElement>(null)
  const pins = useRef<Partial<Record<SeatId, HTMLElement | null>>>({})
  const outcomeRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLElement>(null)

  // Sticky elements below the header offset themselves by its live height.
  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const root = document.documentElement
    const observer = new ResizeObserver(() => root.style.setProperty('--frame-h', `${frame.offsetHeight}px`))
    observer.observe(frame)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--frame-h')
    }
  }, [])

  // When a seat's rebuttal lands, bring its strings forward for a moment to show who it answered.
  const [flashSeat, setFlashSeat] = useState<SeatId | null>(null)
  const seenRebuttals = useRef<Set<SeatId>>(new Set())
  useEffect(() => {
    const fresh = SEATS.map((s) => s.id).find((id) => board.round2[id] && !seenRebuttals.current.has(id))
    if (!fresh) return
    for (const id of Object.keys(board.round2) as SeatId[]) seenRebuttals.current.add(id)
    setFlashSeat(fresh)
    const timer = window.setTimeout(() => setFlashSeat(null), 1800)
    return () => {
      window.clearTimeout(timer)
      setFlashSeat(null)
    }
  }, [board.round2])

  const links = useMemo<YarnLink[]>(
    () =>
      SEATS.flatMap((s) =>
        (board.round2[s.id]?.rebuttals ?? []).filter((r) => r.target !== s.id && board.round1[r.target]).map((r) => ({ from: s.id, to: r.target })),
      ),
    [board.round1, board.round2],
  )

  const seatsIn = Object.keys(board.phase === 'rebuttals' ? board.round2 : board.round1).length
  const announcement = board.verdict
    ? `The Chairman recommends: ${DECISION_COPY[board.verdict.decision].stamp}. ${board.verdict.headline}`
    : (PHASE_STEPS.find((s) => s.phase === board.phase)?.status ?? 'Connecting to the board.')

  const hasVerdict = Boolean(board.verdict)
  useEffect(() => {
    if (!hasVerdict) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    outcomeRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [hasVerdict])

  const replayInfo = replay ? REPLAYS.find((r) => r.name === source.name) : undefined
  const otherReplay = REPLAYS.find((r) => r.name !== (replay ? source.name : ''))

  return (
    <MotionConfig reducedMotion="user">
      <FactProvider facts={board.evidence?.facts ?? []}>
        <div className="page page--board">
          <a className="skip" href="#board-main">
            Skip to the board
          </a>
          <header className="frame" ref={frameRef}>
            <div className="frame__row">
              <button type="button" className="frame__back" onClick={onNew}>
                <span aria-hidden="true">←</span>
                <span>
                  New<span className="frame__long"> decision</span>
                </span>
              </button>
              <Wordmark />
              {replay ? (
                <div className="replay" role="group" aria-label="Recorded session controls">
                  <span className="replay__badge" title={replayInfo?.label}>
                    Recorded
                  </span>
                  <div className="replay__speeds" role="group" aria-label="Playback speed">
                    {REPLAY_SPEEDS.map((s) => (
                      <button key={s} type="button" aria-pressed={run.speed === s} onClick={() => run.setSpeed(s)} disabled={transport === 'done'}>
                        {s}×<span className="visually-hidden"> speed</span>
                      </button>
                    ))}
                  </div>
                  <button type="button" className="replay__skip" onClick={run.skipToEnd} disabled={transport === 'done'}>
                    Skip<span className="frame__long"> to end</span>
                  </button>
                </div>
              ) : (
                <span className="replay__badge replay__badge--live" data-live={transport !== 'done' || undefined}>
                  {transport === 'done' ? 'Session ended' : 'Live'}
                </span>
              )}
            </div>
            <PhaseRail phase={board.phase} seatsIn={seatsIn} ratified={Boolean(run.ratification)} stalled={stopped} />
          </header>

          <p className="visually-hidden" aria-live="polite" aria-atomic="true">
            {announcement}
          </p>

          <main id="board-main" className="board" tabIndex={-1}>
            <div className="board__top">
              <aside className="board__brief" aria-label="The question and the research">
                <QuestionCard intake={board.intake} />
                <EvidenceReceipt evidence={board.evidence} mode={board.evidenceMode} stopped={stopped} />
              </aside>

              <section className="board__seats" aria-labelledby="seats-label">
                <h2 className="label-tape" id="seats-label">
                  The board <span>{board.phase === 'rebuttals' || Object.keys(board.round2).length ? 'Two rounds' : 'Round 1'}</span>
                </h2>
                <div className="seats" ref={seatsRef}>
                  {SEATS.map((seat) => (
                    <SeatCard
                      key={seat.id}
                      seat={seat}
                      r1={board.round1[seat.id]}
                      r2={board.round2[seat.id]}
                      phase={board.phase}
                      stopped={stopped}
                      dimmed={activeSeat !== null && activeSeat !== seat.id && !links.some((l) => (l.from === activeSeat && l.to === seat.id) || (l.to === activeSeat && l.from === seat.id))}
                      onFocusSeat={setActiveSeat}
                      pinRef={(el) => {
                        pins.current[seat.id] = el
                      }}
                    />
                  ))}
                  <Yarn container={seatsRef} pins={pins} links={links} activeSeat={activeSeat ?? flashSeat} />
                </div>
              </section>
            </div>

            <section className="board__outcome" ref={outcomeRef} aria-labelledby="outcome-label">
              <h2 className="label-tape" id="outcome-label">
                The verdict
              </h2>
              {board.verdict ? (
                <div className="outcome">
                  <VerdictCard verdict={board.verdict} />
                  <YourCall
                    decision={board.verdict.decision}
                    ratification={run.ratification}
                    status={run.ratifyStatus}
                    error={run.ratifyError}
                    local={replay}
                    onSubmit={run.submitRatification}
                  />
                </div>
              ) : error ? (
                <ErrorNotice error={error} onRetry={onRetry} onEdit={onEdit} onReplay={() => onReplay(otherReplay?.name ?? REPLAYS[0].name)} />
              ) : (
                <div className="chair-wait" data-active={board.phase === 'chairman' || undefined} aria-busy={board.phase === 'chairman'}>
                  <span className="pin pin--ghost" aria-hidden="true" />
                  <p className="chair-wait__title">
                    {stopped ? 'No recommendation in this session.' : board.phase === 'chairman' ? 'The Chairman is weighing the debate' : 'The Chairman speaks last.'}
                    {board.phase === 'chairman' && !stopped && (
                      <span className="dots" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                    )}
                  </p>
                  <p className="chair-wait__body">
                    After both rounds, the Chairman weighs every argument and recommends: proceed, pilot, defer, or reject.
                  </p>
                </div>
              )}
            </section>
          </main>
          <FactPeek />
        </div>
      </FactProvider>
    </MotionConfig>
  )
}
