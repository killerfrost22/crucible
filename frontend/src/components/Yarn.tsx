import { motion } from 'motion/react'
import { useLayoutEffect, useState, type RefObject } from 'react'
import type { SeatId } from '../types'
import { EASE_OUT } from './motion'

export interface YarnLink {
  from: SeatId
  to: SeatId
}

interface YarnProps {
  container: RefObject<HTMLElement | null>
  pins: RefObject<Partial<Record<SeatId, HTMLElement | null>>>
  links: YarnLink[]
  activeSeat: SeatId | null
}

interface Strand extends YarnLink {
  d: string
}

/** Red string from each rebutting seat's pin to the pin of the seat it answers. Decorative: the slips carry the same text. */
export function Yarn({ container, pins, links, activeSeat }: YarnProps) {
  const [strands, setStrands] = useState<Strand[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const key = links.map((l) => `${l.from}>${l.to}`).join(',')

  useLayoutEffect(() => {
    const host = container.current
    if (!host) return
    const wide = window.matchMedia('(min-width: 768px)')
    const measure = () => {
      if (!wide.matches) {
        setStrands([])
        return
      }
      const box = host.getBoundingClientRect()
      const centre = (seat: SeatId) => {
        const el = pins.current[seat]
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top }
      }
      const next: Strand[] = []
      for (const link of links) {
        const a = centre(link.from)
        const b = centre(link.to)
        if (!a || !b) continue
        const dist = Math.hypot(b.x - a.x, b.y - a.y)
        // Pulled taut over the pins: the string bows up into the gap above the cards, never across their text.
        const lift = 28 + dist * 0.12
        const cx = (a.x + b.x) / 2
        const cy = Math.min(a.y, b.y) - lift
        next.push({ ...link, d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}` })
      }
      setSize({ w: box.width, h: box.height })
      setStrands(next)
    }
    measure()
    // Cards settle after their pin-in animation; measure again once they have.
    const settle = window.setTimeout(measure, 900)
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    wide.addEventListener('change', measure)
    window.addEventListener('resize', measure)
    return () => {
      window.clearTimeout(settle)
      observer.disconnect()
      wide.removeEventListener('change', measure)
      window.removeEventListener('resize', measure)
    }
    // `key` captures the link list; the refs are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (!strands.length) return null
  const box = { width: size.w, height: size.h, viewBox: `0 0 ${size.w} ${size.h}`, 'aria-hidden': true, focusable: false } as const
  const lit = strands.filter((s) => activeSeat && (s.from === activeSeat || s.to === activeSeat))
  return (
    <>
      {/* Ambient layer sits behind the cards; it shows in the gutters. */}
      <svg className="yarn yarn--back" {...box}>
        {strands.map((s) => (
          <g key={`${s.from}>${s.to}`} className="yarn__strand" data-state={activeSeat ? 'off' : undefined}>
            {(['yarn__shadow', 'yarn__thread'] as const).map((cls) => (
              <motion.path
                key={cls}
                className={cls}
                d={s.d}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.9, ease: EASE_OUT }}
              />
            ))}
          </g>
        ))}
      </svg>
      {/* The focused seat's strings come over the cards so the whole connection reads. */}
      <svg className="yarn yarn--front" {...box}>
        {lit.map((s) => (
          <g key={`${s.from}>${s.to}`} className="yarn__strand">
            {(['yarn__shadow', 'yarn__thread'] as const).map((cls) => (
              <motion.path
                key={cls}
                className={cls}
                d={s.d}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.45, ease: EASE_OUT }}
              />
            ))}
          </g>
        ))}
      </svg>
    </>
  )
}
