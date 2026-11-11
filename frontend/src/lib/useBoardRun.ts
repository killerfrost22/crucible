import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { AdkEvent, Intake, Ratification } from '../types'
import { ApiError, createSession, deleteDecision, existingUserId, getSessionState, ratify, runBoard, userId } from './api'
import { boardFromState, initialBoard, reduceBoard, type BoardState } from './board'
import { isObject } from './validate'
import { CLIENT_DECISION_MISSING, CLIENT_INCOMPLETE, CLIENT_NETWORK, CLIENT_REPLAY, CLIENT_REPLAY_MISSING } from './errors'
import { loadReplay, ReplayMissingError, ReplayPlayer } from './replay'

/** `saved` reopens a decision this browser already made, from its stored state: it never runs the board again. */
export type RunSource = { mode: 'live'; intake: Intake } | { mode: 'replay'; name: string } | { mode: 'saved'; id: string }
export type Transport = 'connecting' | 'streaming' | 'done'
export type RatifyStatus = 'idle' | 'saving' | 'error'

export const REPLAY_SPEEDS = [1, 2, 4] as const
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number]

export interface BoardRun {
  board: BoardState
  transport: Transport
  speed: ReplaySpeed
  setSpeed: (speed: ReplaySpeed) => void
  skipToEnd: () => void
  paused: boolean
  togglePause: () => void
  ratification: Ratification | null
  ratifyStatus: RatifyStatus
  ratifyError: string | null
  submitRatification: (action: Ratification['action'], note: string) => Promise<void>
  /** This meeting is saved on the server (a live or reopened decision, once its session exists). */
  stored: boolean
  /** Deletes the saved decision for good. Rejects with the server's error. */
  remove: () => Promise<void>
}

function transportError(error: unknown): AdkEvent {
  if (error instanceof ApiError) return { errorCode: error.code ?? `HTTP_${error.status}`, errorMessage: error.detail ?? error.message }
  return { errorCode: CLIENT_NETWORK, errorMessage: error instanceof Error ? error.message : String(error) }
}

/** A saved decision arrives whole; everything else arrives event by event. */
type BoardAction = AdkEvent | { restore: BoardState }
const boardReducer = (state: BoardState, action: BoardAction) => ('restore' in action ? action.restore : reduceBoard(state, action))

function savedRatification(value: unknown): Ratification | null {
  if (!isObject(value) || (value.action !== 'accept' && value.action !== 'override')) return null
  return { action: value.action, note: typeof value.note === 'string' ? value.note : '', at: typeof value.at === 'string' ? value.at : '' }
}

/**
 * Drives one board meeting from any source into the shared reducer.
 * Mount a fresh instance (React `key`) per meeting. `onSession` hears a live meeting's session id as soon as it
 * exists, so the page URL can point at the decision before the board finishes.
 */
export function useBoardRun(source: RunSource, onSession?: (id: string) => void): BoardRun {
  const [board, dispatch] = useReducer(boardReducer, source, (s) =>
    s.mode === 'live' ? { ...initialBoard, intake: s.intake } : initialBoard,
  )
  const onSessionRef = useRef(onSession)
  onSessionRef.current = onSession
  const [transport, setTransport] = useState<Transport>('connecting')
  const [speed, setSpeedState] = useState<ReplaySpeed>(2)
  const [ratification, setRatification] = useState<Ratification | null>(null)
  const [ratifyStatus, setRatifyStatus] = useState<RatifyStatus>('idle')
  const [ratifyError, setRatifyError] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const player = useRef<ReplayPlayer | null>(null)
  const session = useRef<{ user: string; id: string } | null>(null)
  const [stored, setStored] = useState(false)
  const speedRef = useRef(speed)

  useEffect(() => {
    const abort = new AbortController()
    const { signal } = abort

    if (source.mode === 'replay') {
      loadReplay(source.name, signal)
        .then((events) => {
          if (signal.aborted) return
          setTransport('streaming')
          player.current = new ReplayPlayer(events, speedRef.current, dispatch, () => setTransport('done'))
          player.current.start()
        })
        .catch((error: unknown) => {
          if (signal.aborted) return
          dispatch({
            errorCode: error instanceof ReplayMissingError ? CLIENT_REPLAY_MISSING : CLIENT_REPLAY,
            errorMessage: error instanceof Error ? error.message : String(error),
          })
          setTransport('done')
        })
      return () => {
        abort.abort()
        player.current?.stop()
        player.current = null
      }
    }

    if (source.mode === 'saved') {
      const missing: AdkEvent = { errorCode: CLIENT_DECISION_MISSING, errorMessage: `Decision "${source.id}" is not saved in this browser.` }
      // Only the browser that made the decision holds its owner id; anywhere else it is simply not found.
      const user = existingUserId()
      if (!user) {
        dispatch(missing)
        setTransport('done')
        return () => abort.abort()
      }
      getSessionState(user, source.id, signal)
        .then((state) => {
          if (signal.aborted) return
          session.current = { user, id: source.id }
          setStored(true)
          dispatch({ restore: boardFromState(state) })
          setRatification(savedRatification(state.ratification))
          setTransport('done')
        })
        .catch((error: unknown) => {
          if (signal.aborted) return
          dispatch(error instanceof ApiError && error.status === 404 ? missing : transportError(error))
          setTransport('done')
        })
      return () => abort.abort()
    }

    const intake = source.intake
    void (async () => {
      let sawVerdict = false
      let sawError = false
      try {
        const user = userId()
        const id = await createSession(user, signal)
        // Never start a (quota-spending) run for a meeting that was already torn down.
        if (signal.aborted) return
        session.current = { user, id }
        setStored(true)
        onSessionRef.current?.(id)
        setTransport('streaming')
        for await (const event of runBoard(user, id, intake, signal)) {
          if (signal.aborted) return
          if (event.error || event.errorCode || event.errorMessage) sawError = true
          const output = event.output as { decision?: unknown } | undefined
          if (event.nodeInfo?.path?.includes('chairman') && output?.decision) sawVerdict = true
          dispatch(event)
        }
        if (!sawVerdict && !sawError) {
          dispatch({ errorCode: CLIENT_INCOMPLETE, errorMessage: 'Stream closed before the chairman event.' })
        }
      } catch (error) {
        if (signal.aborted) return
        dispatch(transportError(error))
      } finally {
        if (!signal.aborted) setTransport('done')
      }
    })()
    return () => abort.abort()
    // One meeting per mount: the source is fixed for this instance's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setSpeed = useCallback((next: ReplaySpeed) => {
    speedRef.current = next
    setSpeedState(next)
    player.current?.setSpeed(next)
  }, [])

  const skipToEnd = useCallback(() => {
    player.current?.skipToEnd()
    pausedRef.current = false
    setPaused(false)
  }, [])

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current
    if (pausedRef.current) player.current?.pause()
    else player.current?.resume()
    setPaused(pausedRef.current)
  }, [])

  const submitRatification = useCallback(
    async (action: Ratification['action'], note: string) => {
      const next: Ratification = { action, note: note.trim(), at: new Date().toISOString() }
      if (source.mode === 'replay') {
        setRatification(next)
        return
      }
      if (!session.current) return
      setRatifyStatus('saving')
      setRatifyError(null)
      try {
        await ratify(session.current.user, session.current.id, next)
        setRatification(next)
        setRatifyStatus('idle')
      } catch (error) {
        setRatifyStatus('error')
        setRatifyError(
          error instanceof ApiError
            ? (error.detail ?? `The server didn't save your decision (error ${error.status}). Try again.`)
            : "We couldn't reach the server to save your decision. Check the connection and try again.",
        )
      }
    },
    [source.mode],
  )

  const remove = useCallback(async () => {
    if (!session.current) return
    await deleteDecision(session.current.user, session.current.id)
    session.current = null
    setStored(false)
  }, [])

  return {
    board,
    transport,
    speed,
    setSpeed,
    skipToEnd,
    paused,
    togglePause,
    ratification,
    ratifyStatus,
    ratifyError,
    submitRatification,
    stored,
    remove,
  }
}
