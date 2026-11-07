import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import type { Phase } from '../lib/board'
import type { HumanError } from '../lib/errors'
import { SEATS, STANCE_LABEL } from '../seats'
import type { Decision, Ratification, Round1Opinion, Round2Opinion, SeatId } from '../types'
import { EASE_FALL, EASE_OUT } from './motion'

/** One rebuttal: `from` answered `to`. */
export interface Filament {
  from: SeatId
  to: SeatId
}

type Stage = 'cold' | 'assay' | 'melt' | 'refine' | 'settle' | 'pour' | 'cast' | 'cooled'

interface CrucibleProps {
  phase: Phase
  hasIntake: boolean
  round1: Partial<Record<SeatId, Round1Opinion>>
  round2: Partial<Record<SeatId, Round2Opinion>>
  decision: Decision | null
  /** Plain word for the decision, struck on the ingot. */
  hallmark: string | null
  ratification: Ratification | null
  error: HumanError | null
  /** The meeting ended without a recommendation. */
  stopped: boolean
  filaments: Filament[]
  /** Seat whose filaments are lit (hover/focus, or a rebuttal that just landed). */
  activeSeat: SeatId | null
  onHoverSeat: (seat: SeatId | null) => void
}

// ── Geometry (viewBox 0 0 400 470) ───────────────────────────────────────────

const VB_W = 400
const VB_H = 470
const NODE_R = 22
/** The five seats ride an arc over the vessel, in table order, left to right. */
const NODE_AT = Object.fromEntries(
  SEATS.map((s, i) => {
    const a = ((150 - i * 30) * Math.PI) / 180
    return [s.id, { x: 200 + 182 * Math.cos(a), y: 250 - 182 * Math.sin(a) }]
  }),
) as Record<SeatId, { x: number; y: number }>
const INITIAL = Object.fromEntries(SEATS.map((s) => [s.id, s.title[0]])) as Record<SeatId, string>

const OUTER = 'M104 182H296L314 175L306 196H284L266 322Q262 346 236 348H164Q138 346 134 322L116 196H104Z'
const INTERIOR = 'M126 196H274L257 318Q254 336 234 337H166Q146 336 143 318Z'
const RIM = 'M104 183H296L313 176'
/** Interior floor; each Round-1 opinion lifts the melt one step. */
const FLOOR = 337
const STEP = 26
const MOUTH = { x: 200, y: 206 }
const MOLD = 'M204 410H396L384 456H216Z'
const INGOT = 'M211 415H389L379 451H221Z'
const CHARGE = [
  'M150 336L156 318L170 314L178 326L174 336Z',
  'M172 336L180 320L196 316L204 330L198 336Z',
  'M200 336L206 322L222 319L230 330L226 336Z',
  'M224 336L232 324L246 322L250 336Z',
  'M184 322L192 306L206 304L212 316L202 322Z',
]

function filamentPath(a: { x: number; y: number }, b: { x: number; y: number }, bend: number) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  // Pulled in towards the mouth so every filament runs through the heat, never off the top.
  const cx = mx + (200 - mx) * 0.5 + (-(b.y - a.y) / len) * bend
  const cy = my + (220 - my) * 0.5 + ((b.x - a.x) / len) * bend
  // The spark where it lands: just outside the target node.
  const t = 1 - (NODE_R + 6) / (len * 1.15)
  const u = 1 - t
  const tip = { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y }
  return { d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`, tip }
}

/** Fixed spark vectors so a burst looks hand-made but never reshuffles. */
const SPARKS = [
  [-46, -64],
  [-22, -88],
  [4, -96],
  [28, -80],
  [52, -58],
  [-62, -34],
  [70, -30],
  [14, -54],
] as const

interface Burst {
  key: string
  seat: SeatId
  big: boolean
}

function stageOf(p: { phase: Phase; decision: Decision | null; poured: boolean; cooled: boolean; hasIntake: boolean }): Stage {
  if (p.decision) return p.poured ? 'cast' : 'pour'
  if (p.cooled) return 'cooled'
  if (p.phase === 'chairman') return 'settle'
  if (p.phase === 'rebuttals') return 'refine'
  if (p.phase === 'round1') return 'melt'
  return p.hasIntake ? 'assay' : 'cold'
}

/**
 * The signature: a crucible whose melt builds as each seat opens, glows while the seats refine the argument,
 * throws off sparks and slag when someone concedes or changes position, then pours into the mold where the
 * verdict sets as an ingot with the decision struck on it. Decorative; the caption says the same in words.
 */
export function Crucible(props: CrucibleProps) {
  const { phase, hasIntake, round1, round2, decision, hallmark, ratification, error, stopped, filaments, activeSeat, onHoverSeat } = props
  const ids = useId().replace(/:/g, '')
  const reduce = useReducedMotion() ?? false

  // The pour plays once, then the ingot cools in the mold.
  const [poured, setPoured] = useState(false)
  useEffect(() => {
    if (!decision) return
    const timer = window.setTimeout(() => setPoured(true), reduce ? 0 : 1700)
    return () => window.clearTimeout(timer)
  }, [decision, reduce])

  const cooled = !decision && (Boolean(error) || stopped)
  const stage = stageOf({ phase, decision, poured, cooled, hasIntake })
  const opened = SEATS.filter((s) => round1[s.id]).length
  const answered = SEATS.filter((s) => round2[s.id]).length
  const level = stage === 'pour' || stage === 'cast' ? 0 : opened

  // Beads: each opening position drips into the melt in its seat's colour.
  const seenOpen = useRef(new Set<SeatId>())
  const [drops, setDrops] = useState<SeatId[]>([])
  useEffect(() => {
    const fresh = SEATS.map((s) => s.id).filter((id) => round1[id] && !seenOpen.current.has(id))
    if (!fresh.length) return
    for (const id of fresh) seenOpen.current.add(id)
    if (!reduce) setDrops((d) => [...d, ...fresh])
  }, [round1, reduce])

  // Sparks: a concession or a changed position throws metal off the surface.
  const seenRebut = useRef(new Set<SeatId>())
  const [bursts, setBursts] = useState<Burst[]>([])
  useEffect(() => {
    const fresh = SEATS.map((s) => s.id).filter((id) => round2[id] && !seenRebut.current.has(id))
    if (!fresh.length) return
    for (const id of fresh) seenRebut.current.add(id)
    if (reduce) return
    const next = fresh
      .filter((id) => round2[id]!.changed_position || round2[id]!.concessions.length > 0)
      .map((id) => ({ key: `${id}-${Date.now()}`, seat: id, big: round2[id]!.changed_position }))
    if (next.length) setBursts((b) => [...b, ...next])
  }, [round2, reduce])

  // Slag: one skimmed lump per concession or change of position, riding the surface.
  const slag = Math.min(
    8,
    SEATS.reduce((sum, s) => sum + (round2[s.id]?.concessions.length ?? 0) + (round2[s.id]?.changed_position ? 1 : 0), 0),
  )

  const surfaceY = FLOOR - level * STEP

  const caption = captionFor({ stage, hasIntake, opened, answered, slag, hallmark, ratification, error })

  return (
    <figure className="forge" data-stage={stage} style={{ '--level': level } as CSSProperties}>
      <svg className="forge__art" viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${ids}-melt`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--heat-1)" />
            <stop offset="0.3" stopColor="var(--heat-2)" />
            <stop offset="1" stopColor="var(--heat-3)" />
          </linearGradient>
          <linearGradient id={`${ids}-crust`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5a4b3f" />
            <stop offset="0.25" stopColor="#3a3029" />
            <stop offset="1" stopColor="#211b17" />
          </linearGradient>
          <radialGradient id={`${ids}-glow`}>
            <stop offset="0" stopColor="var(--heat-2)" stopOpacity="0.55" />
            <stop offset="0.45" stopColor="var(--heat-3)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--heat-3)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${ids}-wall`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2b2520" />
            <stop offset="0.3" stopColor="#5a5045" />
            <stop offset="0.55" stopColor="#3d352e" />
            <stop offset="1" stopColor="#221d19" />
          </linearGradient>
          <linearGradient id={`${ids}-wallheat`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--heat-2)" />
            <stop offset="1" stopColor="var(--heat-3)" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id={`${ids}-cool`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a7f72" />
            <stop offset="0.18" stopColor="#5c534a" />
            <stop offset="1" stopColor="#38312b" />
          </linearGradient>
          <clipPath id={`${ids}-in`}>
            <path d={INTERIOR} />
          </clipPath>
        </defs>

        <ellipse className="forge__glow" cx="200" cy="236" rx="190" ry="150" fill={`url(#${ids}-glow)`} />

        {/* The mold waits from the start; the verdict is cast into it. */}
        <g className="forge__mold">
          <path className="mold__bed" d={MOLD} />
          <g className="ingot">
            <path d={INGOT} fill={`url(#${ids}-cool)`} />
            <path className="ingot__hot" d={INGOT} fill={`url(#${ids}-melt)`} />
          </g>
          {hallmark && (
            <g className="hallmark">
              <text x="300" y="440" className="hallmark__shade">
                {hallmark.toUpperCase()}
              </text>
              <text x="300" y="439" className="hallmark__text">
                {hallmark.toUpperCase()}
              </text>
            </g>
          )}
          {ratification && (
            <g className="seal" data-action={ratification.action}>
              <circle cx="372" cy="398" r="14" />
              {ratification.action === 'accept' ? <path d="M365 398.5l4.6 4.6 8.4-9" /> : <path d="M378 394a7 7 0 1 0 1.6 5.5M378.6 389.5v5h-5" />}
            </g>
          )}
        </g>

        <rect className="forge__stream" x="309" y="186" width="9" height="226" rx="4.5" fill={`url(#${ids}-melt)`} />

        <g className="forge__vessel">
          <path d={OUTER} fill={`url(#${ids}-wall)`} />
          <path className="vessel__heat" d={OUTER} fill={`url(#${ids}-wallheat)`} />
          <g clipPath={`url(#${ids}-in)`}>
            <path d={INTERIOR} fill="var(--sunk)" />
            <g className="forge__charge">
              {CHARGE.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
            <g className="forge__melt">
              <rect x="110" y={FLOOR} width="180" height="170" fill={`url(#${ids}-crust)`} />
              <rect className="melt__hot" x="110" y={FLOOR} width="180" height="170" fill={`url(#${ids}-melt)`} />
              <path
                className="melt__churn"
                d={`M40 ${FLOOR + 2}q15 -6 30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0v10H40Z`}
              />
              <g className="melt__slag">
                {Array.from({ length: slag }, (_, i) => (
                  <path
                    key={i}
                    d={`M${150 + (i % 4) * 11 + (i > 3 ? 5 : 0)} ${FLOOR + 1}l3 -4h6l3 3l-2 3h-8Z`}
                    style={{ '--i': i } as CSSProperties}
                  />
                ))}
              </g>
            </g>
          </g>
          <path className="vessel__rim" d={RIM} />
        </g>

        <g className="forge__filaments">
          {filaments.map((f) => {
            const back = filaments.some((g) => g.from === f.to && g.to === f.from)
            const bend = back ? (SEATS.findIndex((s) => s.id === f.from) < SEATS.findIndex((s) => s.id === f.to) ? 10 : -10) : 0
            const { d, tip } = filamentPath(NODE_AT[f.from], NODE_AT[f.to], bend)
            const lit = activeSeat !== null && (f.from === activeSeat || f.to === activeSeat)
            return (
              <g key={`${f.from}>${f.to}`} className="filament" data-state={lit ? 'lit' : activeSeat ? 'off' : undefined}>
                <path className="filament__glow" d={d} />
                <path className="filament__core" d={d} />
                <circle className="filament__tip" cx={tip.x} cy={tip.y} r="3.5" />
              </g>
            )
          })}
        </g>

        <g className="forge__nodes">
          {SEATS.map((s) => {
            const at = NODE_AT[s.id]
            const state = round2[s.id] ? 'answered' : round1[s.id] ? 'in' : phase === 'round1' && !cooled ? 'thinking' : 'waiting'
            return (
              <g
                key={s.id}
                className="node"
                data-state={state}
                data-dim={
                  (activeSeat &&
                    activeSeat !== s.id &&
                    !filaments.some((f) => (f.from === activeSeat && f.to === s.id) || (f.to === activeSeat && f.from === s.id))) ||
                  undefined
                }
                style={{ '--c': `var(--seat-${s.id})` } as CSSProperties}
                transform={`translate(${at.x.toFixed(1)} ${at.y.toFixed(1)})`}
                onMouseEnter={() => onHoverSeat(s.id)}
                onMouseLeave={() => onHoverSeat(null)}
              >
                <circle className="node__ring" r={NODE_R + 6} />
                <circle className="node__body" r={NODE_R} />
                <circle className="node__fill" r={NODE_R} />
                <text className="node__label" y="1">
                  {INITIAL[s.id]}
                </text>
              </g>
            )
          })}
        </g>

        {drops.map((seat) => {
          const at = NODE_AT[seat]
          return (
            <motion.circle
              key={seat}
              r="6"
              cx="0"
              cy="0"
              fill={`var(--seat-${seat})`}
              initial={{ x: at.x, y: at.y + NODE_R, opacity: 0, scale: 0.4 }}
              animate={{ x: MOUTH.x, y: MOUTH.y + 10, opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 0.6] }}
              transition={{
                x: { duration: 0.75, ease: EASE_OUT },
                y: { duration: 0.75, ease: EASE_FALL },
                opacity: { duration: 0.75, times: [0, 0.15, 0.85, 1] },
                scale: { duration: 0.75, times: [0, 0.15, 0.85, 1] },
              }}
              onAnimationComplete={() => setDrops((d) => d.filter((x) => x !== seat))}
            />
          )
        })}

        {bursts.map((b) => {
          const sparks = SPARKS.slice(0, b.big ? 8 : 5)
          return (
            <g key={b.key}>
              {/* The surface flares where the point is given up. */}
              <motion.ellipse
                cx="0"
                cy="0"
                rx="34"
                ry="7"
                fill="var(--heat-1)"
                initial={{ x: 200, y: surfaceY, scale: 0.3, opacity: 0.9 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.7, ease: EASE_OUT }}
              />
              {sparks.map(([dx, dy], i) => (
                <motion.circle
                  key={i}
                  r={i % 3 === 0 ? 3.6 : 2.6}
                  cx="0"
                  cy="0"
                  fill={i % 2 ? 'var(--heat-1)' : `var(--seat-${b.seat})`}
                  initial={{ x: 200, y: surfaceY, opacity: 0 }}
                  animate={{ x: [200, 200 + dx * 0.75, 200 + dx * 1.1], y: [surfaceY, surfaceY + dy * 1.1, surfaceY + dy * 0.6], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.05, delay: i * 0.03, ease: EASE_OUT }}
                  onAnimationComplete={i === sparks.length - 1 ? () => setBursts((all) => all.filter((x) => x.key !== b.key)) : undefined}
                />
              ))}
            </g>
          )
        })}
      </svg>
      <figcaption className="forge__caption">
        <span className="forge__reading">{caption.reading}</span>
        <span className="forge__status">{caption.status}</span>
        {caption.hint && <span className="forge__hint">{caption.hint}</span>}
      </figcaption>
    </figure>
  )
}

function captionFor(c: {
  stage: Stage
  hasIntake: boolean
  opened: number
  answered: number
  slag: number
  hallmark: string | null
  ratification: Ratification | null
  error: HumanError | null
}): { reading: string; status: string; hint?: string } {
  switch (c.stage) {
    case 'cold':
      return { reading: 'Crucible · cold', status: 'Waiting for your question' }
    case 'assay':
      return { reading: 'Assay', status: 'The Researcher is checking the facts', hint: 'Each advisor’s opening position adds heat.' }
    case 'melt':
      return { reading: `Heat ${c.opened}/5`, status: `Round 1: ${c.opened} of 5 opinions in`, hint: 'Each advisor’s opening position adds heat.' }
    case 'refine':
      return {
        reading: c.slag ? `Refining · ${c.slag} skimmed` : 'Refining',
        status: `Rebuttals: ${c.answered} of 5 answered`,
        hint: 'Glowing lines show who answered whom. Sparks mark a concession.',
      }
    case 'settle':
      return { reading: 'Settling', status: 'The Chairman is weighing the debate', hint: 'Glowing lines show who answered whom.' }
    case 'pour':
      return { reading: 'Pouring', status: 'The Chairman has decided' }
    case 'cast':
      return {
        reading: c.ratification ? 'Cast · signed' : 'Cast',
        status: `Recommendation: ${c.hallmark ?? ''}`,
        hint: c.ratification ? (c.ratification.action === 'accept' ? 'You accepted it.' : 'You overrode it.') : 'The final call is yours.',
      }
    case 'cooled':
      return {
        reading: 'Cooled',
        status: c.error ? c.error.title : 'The meeting stopped before a recommendation',
        hint: 'Everything the board finished is still here.',
      }
  }
}

interface StandingsProps {
  round1: Partial<Record<SeatId, Round1Opinion>>
  round2: Partial<Record<SeatId, Round2Opinion>>
  thinking: boolean
  /** Seats not connected to the lit one fade back. */
  dimmed: (seat: SeatId) => boolean
  onHoverSeat: (seat: SeatId | null) => void
}

/** Where the board stands, in words: each seat's latest position, beside the crucible. */
export function Standings({ round1, round2, thinking, dimmed, onHoverSeat }: StandingsProps) {
  return (
    <div className="standings">
      <h2 className="standings__title">Where the board stands</h2>
      <ul>
        {SEATS.map((s) => {
          const latest = round2[s.id] ?? round1[s.id]
          return (
            <li
              key={s.id}
              style={{ '--c': `var(--seat-${s.id})` } as CSSProperties}
              data-dim={dimmed(s.id) || undefined}
              onMouseEnter={() => onHoverSeat(s.id)}
              onMouseLeave={() => onHoverSeat(null)}
            >
              <a href={`#seat-card-${s.id}`}>
                <span className="standings__name">{s.title}</span>
                {latest ? (
                  <span className="standings__stance" data-stance={latest.stance}>
                    {STANCE_LABEL[latest.stance]}
                    {round2[s.id]?.changed_position && <span className="standings__moved"> · changed</span>}
                  </span>
                ) : (
                  <span className="standings__stance">{thinking ? 'Thinking…' : 'Waiting'}</span>
                )}
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
