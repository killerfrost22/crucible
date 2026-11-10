import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { AdkEvent, Intake, Ratification } from '../types'
import { ApiError, createSession, ratify, runBoard, userId } from './api'
import { initialBoard, reduceBoard, type BoardState } from './board'
import { CLIENT_INCOMPLETE, CLIENT_NETWORK, CLIENT_REPLAY, CLIENT_REPLAY_MISSING } from './errors'
import { loadReplay, ReplayMissingError, ReplayPlayer } from './replay'

export type RunSource = { mode: 'live'; intake: Intake } | { mode: 'replay'; name: string }
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
}

function transportError(error: unknown): AdkEvent {
  if (error instanceof ApiError) return { errorCode: error.code ?? `HTTP_${error.status}`, errorMessage: error.detail ?? error.message }
  return { errorCode: CLIENT_NETWORK, errorMessage: error instanceof Error ? error.message : String(error) }
}

/**
 * Drives one board meeting from either transport into the shared reducer.
 * Mount a fresh instance (React `key`) per meeting.
 */
export function useBoardRun(source: RunSource): BoardRun {
  const [board, dispatch] = useReducer(reduceBoard, source, (s) =>
    s.mode === 'live' ? { ...initialBoard, intake: s.intake } : initialBoard,
  )
  const [transport, setTransport] = useState<Transport>('connecting')
  const [speed, setSpeedState] = useState<ReplaySpeed>(2)
  const [ratification, setRatification] = useState<Ratification | null>(null)
  const [ratifyStatus, setRatifyStatus] = useState<RatifyStatus>('idle')
  const [ratifyError, setRatifyError] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const player = useRef<ReplayPlayer | null>(null)
  const session = useRef<{ user: string; id: string } | null>(null)
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

  return { board, transport, speed, setSpeed, skipToEnd, paused, togglePause, ratification, ratifyStatus, ratifyError, submitRatification }
}
