import { memo, type CSSProperties } from 'react'
import { MEMBERS } from '../content'

// The C from the Crucible logo (assets/crucible-icon-reversed.svg): the letter is the vessel, the pool is the metal.
const C_SHELL =
  'M32.97 59.52Q27.17 59.52 22.26 57.47Q17.35 55.43 13.74 51.71Q10.13 47.99 8.12 42.9Q6.12 37.8 6.12 31.78Q6.12 25.75 8.09 20.77Q10.06 15.79 13.67 12.1Q17.27 8.42 22.18 6.45Q27.09 4.48 32.97 4.48Q39.59 4.48 44.9 7.05Q50.22 9.61 53.61 14.26Q56.99 18.91 57.73 25.16H46.58Q45.61 19.43 41.89 16.49Q38.17 13.55 33.04 13.55Q28.5 13.55 25.05 15.71Q21.59 17.87 19.65 21.92Q17.72 25.98 17.72 31.7Q17.72 37.5 19.69 41.71Q21.66 45.91 25.16 48.18Q28.65 50.45 33.19 50.45Q38.02 50.45 41.74 47.55Q45.46 44.64 46.58 38.92H57.88Q56.92 45.16 53.5 49.81Q50.07 54.46 44.79 56.99Q39.51 59.52 32.97 59.52Z'
const C_POOL =
  'M46.19 40.55H19.2Q19.43 41.14 19.69 41.71Q21.66 45.91 25.16 48.18Q28.65 50.45 33.19 50.45Q38.02 50.45 41.74 47.55Q44.91 45.07 46.19 40.55Z'

/**
 * Six embers, one per member, hovering around the crucible: x/y are offsets from its centre in rem. When the owner
 * starts typing a question they draw in toward the metal and the pool glows hotter.
 */
const EMBERS: { x: number; y: number; s: number }[] = [
  { x: -7.4, y: -3.2, s: 0.75 },
  { x: -10.6, y: 0.9, s: 0.5 },
  { x: -5.6, y: 1.9, s: 0.5 },
  { x: 6.2, y: -3.9, s: 0.625 },
  { x: 9.8, y: -0.6, s: 0.75 },
  { x: 6.6, y: 1.6, s: 0.5 },
]

/** The six-colour rule: one segment per member, in table order, the Chairman last. */
export const SeatRule = memo(function SeatRule({ className }: { className?: string }) {
  return (
    <div className={className ? `hm-seatrule ${className}` : 'hm-seatrule'} aria-hidden="true">
      {MEMBERS.map((m, i) => (
        <span key={m.id} style={{ '--k': m.color, '--i': i } as CSSProperties} />
      ))}
    </div>
  )
})

/** The brand moment between the hero and the showcase: the molten C sitting on the six-colour rule. */
export const BrandMark = memo(function BrandMark({ hot }: { hot: boolean }) {
  return (
    <div className="hm-brand" data-hot={hot || undefined} aria-hidden="true">
      <div className="hm-brand__stage">
        <span className="hm-brand__glow" />
        {MEMBERS.map((m, i) => {
          const e = EMBERS[i]
          return (
            <span
              key={m.id}
              className="hm-ember"
              style={{ '--k': m.color, '--x': `${e.x}rem`, '--y': `${e.y}rem`, '--s': `${e.s}rem`, '--i': i } as CSSProperties}
            >
              <span />
            </span>
          )
        })}
        <svg className="hm-brand__c" viewBox="0 0 64 64" focusable="false">
          <defs>
            <linearGradient id="hm-molten" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe7a3" />
              <stop offset=".45" stopColor="#f6a32b" />
              <stop offset="1" stopColor="#d4421f" />
            </linearGradient>
            <clipPath id="hm-pool-clip">
              <path d={C_POOL} />
            </clipPath>
          </defs>
          <path className="hm-brand__pool" d={C_POOL} fill="url(#hm-molten)" />
          <g clipPath="url(#hm-pool-clip)">
            <rect className="hm-brand__sheen" x="12" y="39" width="7" height="13" />
          </g>
          <path className="hm-brand__shell" d={C_SHELL} />
        </svg>
      </div>
      <SeatRule className="hm-brand__rule" />
    </div>
  )
})
