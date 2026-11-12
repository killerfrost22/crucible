import { MotionConfig } from 'motion/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { DECISION_COPY } from '../lib/decisionCopy'
import { CLIENT_DECISION_MISSING, CLIENT_INVALID, CLIENT_REPLAY_MISSING, humanizeErrors } from '../lib/errors'
import { recordingFacts, REPLAYS } from '../lib/replay'
import { REPLAY_SPEEDS, useBoardRun, type RunSource } from '../lib/useBoardRun'
import { SEATS } from '../seats'
import type { Intake, SeatId } from '../types'
import { EvidenceSheet, QuestionCard } from './Brief'
import { Crucible, Standings, type Filament } from './Crucible'
import { DecisionBrief } from './DecisionBrief'
import { DeleteDecision } from './DeleteDecision'
import { Feedback } from './Feedback'
import { FactProvider } from './facts'
import { FoldToggle } from './Fold'
import { NotFound, type Missing } from './NotFound'
import { ErrorNotice, FactPeek } from './Notices'
import { PHASE_STEPS, PhaseRail } from './PhaseRail'
import { SeatCard } from './SeatCard'
import { VerdictCard, YourCall } from './Verdict'
import { ThemeToggle } from './ThemeToggle'
import { Wordmark } from './Wordmark'
// The meeting room's styles ship with its chunk (App lazy-loads this component).
import '../styles/board.css'
import '../styles/cards.css'
import '../styles/verdict.css'
import '../styles/print.css'

/** A finished meeting reads as the decision brief; the transcript (research, debate, full verdict) is one click away. */
type View = 'brief' | 'transcript'

/** What lives only in the transcript view, so a link into it (a standing, a skip link) shows that view first. */
const TRANSCRIPT_PARTS = '.assay, .board__seats, .board__outcome'

interface BoardProps {
  source: RunSource
  onNew: () => void
  /** Back to the form with this meeting's question filled in. */
  onEdit?: (intake: Intake) => void
  onRetry?: () => void
  /** A saved meeting that stopped early: convene a new (paid) meeting on the same question. */
  onAskAgain?: (intake: Intake) => void
  onReplay: (name: string) => void
  /** A live meeting's session id, as soon as it exists. */
  onSession?: (id: string) => void
}

export function Board({ source, onNew, onEdit, onRetry, onAskAgain, onReplay, onSession }: BoardProps) {
  const run = useBoardRun(source, onSession)
  const { board, transport } = run
  const replay = source.mode === 'replay'
  const saved = source.mode === 'saved'
  const error = humanizeErrors(board.errors)
  // An unreadable answer is left out but doesn't end the meeting; any other error does.
  const stopped = !board.verdict && (board.errors.some((e) => e.code !== CLIENT_INVALID) || transport === 'done')
  const missing: Missing | null =
    source.mode === 'replay' && board.errors.some((e) => e.code === CLIENT_REPLAY_MISSING)
      ? { kind: 'recording', name: source.name }
      : board.errors.some((e) => e.code === CLIENT_DECISION_MISSING)
        ? { kind: 'decision' }
        : null
  // Nothing came back at all (server unreachable, bad recording): show the question and the notice, not five empty seats.
  const empty = stopped && !board.evidence && Object.keys(board.round1).length === 0
  const [activeSeat, setActiveSeat] = useState<SeatId | null>(null)
  const [researchOpen, setResearchOpen] = useState(true)
  const [debateOpen, setDebateOpen] = useState(true)
  const barRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>('brief')
  const intake = board.intake
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

  // When a seat's rebuttal lands, light its filaments for a moment to show who it answered.
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

  const filaments = useMemo<Filament[]>(
    () =>
      SEATS.flatMap((s) =>
        (board.round2[s.id]?.rebuttals ?? []).filter((r) => r.target !== s.id && board.round1[r.target]).map((r) => ({ from: s.id, to: r.target })),
      ),
    [board.round1, board.round2],
  )
  const litSeat = activeSeat ?? flashSeat
  const dimmed = (seat: SeatId) =>
    activeSeat !== null &&
    activeSeat !== seat &&
    !filaments.some((l) => (l.from === activeSeat && l.to === seat) || (l.to === activeSeat && l.from === seat))

  const seatsIn = Object.keys(board.phase === 'rebuttals' ? board.round2 : board.round1).length
  const announcement = board.verdict
    ? `The Chairman recommends: ${DECISION_COPY[board.verdict.decision].stamp}. ${board.verdict.headline}`
    : stopped
      ? 'The meeting stopped.'
      : (PHASE_STEPS.find((s) => s.phase === board.phase)?.status ?? 'Connecting to the board.')

  // The tab says how the meeting ended, so a finished decision is findable among open tabs and in history.
  const question = board.intake?.question
  useEffect(() => {
    if (missing) document.title = `${missing.kind === 'decision' ? 'Decision' : 'Recording'} not found — Crucible`
    else if (board.verdict) {
      const asked = question && question.length > 60 ? `${question.slice(0, 59).trimEnd()}…` : question
      document.title = `${DECISION_COPY[board.verdict.decision].stamp}${asked ? `: ${asked}` : ''} — Crucible`
    } else if (stopped) document.title = 'Meeting stopped — Crucible'
  }, [missing?.kind, board.verdict, question, stopped])

  // When the verdict lands mid-meeting, the brief opens in place of the transcript: bring the owner to it.
  // A reopened decision already starts there.
  const hasVerdict = Boolean(board.verdict)
  useEffect(() => {
    if (!hasVerdict || saved) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    barRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [hasVerdict, saved])

  // Paper is light: whatever the screen theme, print with the light tokens, then put the owner's theme back.
  // `beforeprint` fires for Print, Ctrl+P and Save as PDF in every current browser.
  useEffect(() => {
    const root = document.documentElement
    let screenTheme: string | undefined | null = null
    const toPaper = () => {
      if (screenTheme !== null) return
      screenTheme = root.dataset.theme
      root.dataset.theme = 'light'
    }
    const toScreen = () => {
      if (screenTheme === null) return
      if (screenTheme === undefined) delete root.dataset.theme
      else root.dataset.theme = screenTheme
      screenTheme = null
    }
    window.addEventListener('beforeprint', toPaper)
    window.addEventListener('afterprint', toScreen)
    return () => {
      window.removeEventListener('beforeprint', toPaper)
      window.removeEventListener('afterprint', toScreen)
      toScreen()
    }
  }, [])

  const showView = (next: View) => {
    if (next === view) return
    setView(next)
    // Start the other view at its top, not wherever the last one was scrolled to.
    const bar = barRef.current
    if (bar && bar.getBoundingClientRect().top < 0) bar.scrollIntoView({ block: 'start' })
  }

  // A link into the view that isn't showing (Skip to your call, a seat in the standings) switches views first, so the
  // browser's own jump to the fragment lands on something visible. The URL keeps its route: nothing remounts.
  const onLinkClick = (event: MouseEvent) => {
    if (!board.verdict) return
    const href = (event.target as Element).closest('a')?.getAttribute('href')
    if (!href?.startsWith('#') || href.length < 2) return
    const target = document.getElementById(decodeURIComponent(href.slice(1)))
    if (!target) return
    if (view === 'brief' && target.closest(TRANSCRIPT_PARTS)) flushSync(() => setView('transcript'))
    else if (view === 'transcript' && target.closest('.brief-view')) flushSync(() => setView('brief'))
  }

  const replayInfo = replay ? REPLAYS.find((r) => r.name === source.name) : undefined
  // Read from the file itself, so a recording outside REPLAYS (the error-screen test) is labelled too.
  const recording = replay ? recordingFacts(source.name) : undefined
  const otherReplay = REPLAYS.find((r) => r.name !== (replay ? source.name : ''))
  const twoRounds = board.phase === 'rebuttals' || Object.keys(board.round2).length > 0
  const nextSpeed = REPLAY_SPEEDS[(REPLAY_SPEEDS.indexOf(run.speed) + 1) % REPLAY_SPEEDS.length]
  const realist = board.round2.realist ?? board.round1.realist
  // The printed brief says what it is: a recording is an example, not the owner's decision.
  const provenance = replay ? `Recorded example, not your decision${recording ? ` · ${recording.label}` : ''}` : saved ? 'Saved decision' : 'Live meeting'
  const verdict = board.verdict

  if (missing) return <NotFound missing={missing} />

  return (
    <MotionConfig reducedMotion="user">
      <FactProvider facts={board.evidence?.facts ?? []}>
        <div className="page page--board" onClickCapture={onLinkClick}>
          <a className="skip" href="#board-main">
            Skip to the board
          </a>
          {board.verdict && (
            <a className="skip" href="#your-call">
              Skip to your call
            </a>
          )}
          <header className="frame" ref={frameRef}>
            <div className="frame__row">
              <button type="button" className="frame__back" onClick={onNew}>
                <span aria-hidden="true">←</span>
                <span>
                  New<span className="frame__long"> decision</span>
                </span>
              </button>
              <Wordmark />
              <div className="frame__end">
                {replay ? (
                  <div className="replay" role="group" aria-label="Recorded session controls">
                    <span className="replay__badge" title={[replayInfo?.label, recording?.label].filter(Boolean).join('. ') || undefined}>
                      Recorded
                      {recording && <span className="visually-hidden">: {recording.label.replace(/^Recorded\s/, '')}</span>}
                    </span>
                    <button
                      type="button"
                      className="replay__skip replay__pause"
                      onClick={run.togglePause}
                      disabled={transport === 'done'}
                      aria-pressed={run.paused}
                      aria-label={run.paused ? 'Resume the recording' : 'Pause the recording'}
                      title={run.paused ? 'Resume' : 'Pause'}
                    >
                      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
                        {run.paused ? (
                          <path d="M4.5 2.8v10.4L13 8z" fill="currentColor" />
                        ) : (
                          <path d="M4.5 3h2.4v10H4.5zM9.1 3h2.4v10H9.1z" fill="currentColor" />
                        )}
                      </svg>
                    </button>
                    <div className="replay__speeds" role="group" aria-label="Playback speed">
                      {REPLAY_SPEEDS.map((s) => (
                        <button key={s} type="button" aria-pressed={run.speed === s} onClick={() => run.setSpeed(s)} disabled={transport === 'done'}>
                          {s}×<span className="visually-hidden"> speed</span>
                        </button>
                      ))}
                    </div>
                    {/* Phones: one button steps through the speeds, so the whole header fits one row. */}
                    <button
                      type="button"
                      className="replay__skip replay__cycle"
                      onClick={() => run.setSpeed(nextSpeed)}
                      disabled={transport === 'done'}
                      aria-label={`Playback speed ${run.speed}×. Switch to ${nextSpeed}×`}
                    >
                      {run.speed}×
                    </button>
                    <button type="button" className="replay__skip" onClick={run.skipToEnd} disabled={transport === 'done'}>
                      Skip<span className="frame__long"> to end</span>
                    </button>
                    {recording && (
                      <p className="replay__meta" aria-hidden="true">
                        {recording.date || 'Recorded'}
                        <span className="replay__meta-models">
                          {'\u00a0· '}
                          {recording.models}
                        </span>
                        <span className="replay__meta-search">
                          {'\u00a0· '}
                          {recording.search}
                        </span>
                      </p>
                    )}
                  </div>
                ) : saved ? (
                  <span className="replay__badge replay__badge--saved" title="Reopened from what was saved. Nothing reruns.">
                    Saved
                  </span>
                ) : (
                  <span className="replay__badge replay__badge--live" data-live={transport !== 'done' || undefined}>
                    {transport === 'done' ? 'Session ended' : 'Live'}
                  </span>
                )}
                <ThemeToggle />
              </div>
            </div>
            <PhaseRail phase={board.phase} seatsIn={seatsIn} ratified={Boolean(run.ratification)} stalled={stopped} />
          </header>

          <p className="visually-hidden" aria-live="polite" aria-atomic="true">
            {announcement}
          </p>

          <main
            id="board-main"
            className="board"
            tabIndex={-1}
            data-empty={empty || undefined}
            data-finished={hasVerdict || undefined}
            data-view={hasVerdict ? view : undefined}
          >
            {verdict && (
              <p className="board__provenance print-only">
                Crucible decision brief · {provenance} · Printed{' '}
                {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            )}
            <QuestionCard intake={board.intake} />

            {verdict && (
              <>
                <div className="viewbar" ref={barRef}>
                  <div className="viewbar__views" role="group" aria-label="Read this meeting as">
                    <button type="button" aria-pressed={view === 'brief'} onClick={() => showView('brief')}>
                      Decision brief
                    </button>
                    <button type="button" aria-pressed={view === 'transcript'} onClick={() => showView('transcript')}>
                      Meeting transcript
                    </button>
                  </div>
                  <button type="button" className="btn btn--secondary viewbar__print" onClick={() => window.print()}>
                    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                      <path
                        d="M4.5 6V2.5h7V6M4.5 11.5h-2v-5h11v5h-2M4.5 9.5h7v4h-7z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Print / Save as PDF
                  </button>
                </div>

                <DecisionBrief
                  verdict={verdict}
                  checks={realist?.checks ?? []}
                  evidenceMode={board.evidenceMode}
                  location={intake?.profile.location}
                  call={(prerequisites) => (
                    <YourCall
                      decision={verdict.decision}
                      prerequisites={prerequisites}
                      ratification={run.ratification}
                      status={run.ratifyStatus}
                      error={run.ratifyError}
                      local={replay}
                      onSubmit={run.submitRatification}
                    />
                  )}
                />
              </>
            )}

            {!empty && (
              <>
                <aside className="board__forge" aria-label="Meeting progress at a glance">
                  <Crucible
                    phase={board.phase}
                    hasIntake={Boolean(board.intake)}
                    round1={board.round1}
                    round2={board.round2}
                    decision={board.verdict?.decision ?? null}
                    hallmark={board.verdict ? DECISION_COPY[board.verdict.decision].stamp : null}
                    ratification={run.ratification}
                    error={error}
                    stopped={stopped}
                    filaments={filaments}
                    activeSeat={litSeat}
                    onHoverSeat={setActiveSeat}
                  />
                  <Standings
                    round1={board.round1}
                    round2={board.round2}
                    thinking={board.phase === 'round1' && !stopped}
                    dimmed={dimmed}
                    onHoverSeat={setActiveSeat}
                  />
                </aside>

                <EvidenceSheet
                  evidence={board.evidence}
                  mode={board.evidenceMode}
                  stopped={stopped}
                  open={researchOpen}
                  onToggle={() => setResearchOpen((o) => !o)}
                />

                <section className="board__seats" aria-labelledby="seats-label">
                  <div className="board__seats-head">
                    <h2 className="section-label" id="seats-label">
                      The board <span>{twoRounds ? 'Two rounds' : 'Round 1'}</span>
                    </h2>
                    <FoldToggle open={debateOpen} onToggle={() => setDebateOpen((o) => !o)} controls="board-seats" label="the debate" />
                  </div>
                  <div className="seats" id="board-seats" hidden={!debateOpen}>
                    {SEATS.map((seat) => (
                      <SeatCard
                        key={seat.id}
                        seat={seat}
                        r1={board.round1[seat.id]}
                        r2={board.round2[seat.id]}
                        phase={board.phase}
                        stopped={stopped}
                        dimmed={dimmed(seat.id)}
                        lit={litSeat === seat.id}
                        onFocusSeat={setActiveSeat}
                      />
                    ))}
                  </div>
                </section>
              </>
            )}

            <section className="board__outcome" aria-labelledby="outcome-label">
              <h2 className="section-label" id="outcome-label">
                {empty ? 'The meeting' : 'The verdict'}
              </h2>
              {board.verdict ? (
                <>
                  <VerdictCard verdict={board.verdict} location={intake?.profile.location} />
                  {/* The call lives in the brief, after every prerequisite; this link switches views on the way. */}
                  <a className="board__to-call" href="#your-call">
                    {run.ratification ? 'See your call in the decision brief' : 'Make your call in the decision brief'}
                    <span aria-hidden="true">→</span>
                  </a>
                </>
              ) : error ? (
                <ErrorNotice
                  error={error}
                  kept={!empty}
                  onRetry={onRetry}
                  onEdit={onEdit && intake ? () => onEdit(intake) : undefined}
                  onReplay={() => onReplay(otherReplay?.name ?? REPLAYS[0].name)}
                />
              ) : (
                <div className="chair-wait" data-active={(board.phase === 'chairman' && !stopped) || undefined} aria-busy={board.phase === 'chairman'}>
                  <svg className="chair-wait__mold" viewBox="0 0 120 40" aria-hidden="true" focusable="false">
                    <path d="M2 4H118L110 36H10Z" />
                  </svg>
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
                    {saved && stopped
                      ? 'This meeting stopped before the Chairman spoke. Everything the board finished is above.'
                      : 'After both rounds, the Chairman weighs every argument and recommends: proceed, pilot, defer, or reject.'}
                  </p>
                  {saved && stopped && intake && onAskAgain && (
                    <div className="chair-wait__actions">
                      <button type="button" className="btn btn--primary" onClick={() => onAskAgain(intake)}>
                        Convene a new meeting on this question
                      </button>
                      {onEdit && (
                        <button type="button" className="btn btn--quiet" onClick={() => onEdit(intake)}>
                          Edit the question first
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {run.stored && transport === 'done' && verdict && <Feedback feedback={run.feedback} onSubmit={run.submitFeedback} />}
            {run.stored && transport === 'done' && <DeleteDecision onDelete={run.remove} onDeleted={onNew} />}
          </main>
          <FactPeek />
        </div>
      </FactProvider>
    </MotionConfig>
  )
}
