/**
 * "Built by many hands": the landing page assembles itself the way a team builds a page in a design tool.
 *
 * React owns the markup and marks it up for this module:
 * - `data-part` blocks (and `data-part="text"` runs of text, `data-part="art"` illustrations) start hidden and are
 *   built the first time they scroll into view: guide lines, a selection box with its W × H readout, a skeleton, a
 *   text-selection sweep with an I-beam, red spacing to the previous part, a crosshair, and one of the advisors'
 *   named cursors flying over to do the work.
 * - `data-rail="v|h|vh"` elements throw red alignment rails while the page scrolls down, and scrolling down sets off
 *   ambient "editing" bursts on parts already built. Scrolling back up stays quiet: no rails, no bursts, and parts
 *   not built yet simply appear.
 *
 * Everything moves with transform and opacity. Sizes are written only when a target's size changes.
 * `startBuildFx` returns a cleanup that cancels the frame loop, timers and listeners, removes the overlay, and leaves
 * every part visible.
 */

export interface FxAdvisor {
  name: string
  /** CSS color for the cursor and its name tag. */
  color: string
  /** Optional CSS background for the name tag (the Chairman's is molten). */
  tag?: string
}

interface FxObject {
  n?: HTMLElement
  /** Elements whose rects this object reads each frame. */
  t?: Element[]
  update(t: number): boolean
  kill?(): void
}

interface Rail {
  n: HTMLElement
  target: Element
  dir: 'v' | 'h'
  sec: Element
  o: number
}

const CYAN = 'var(--guide)'
const RED = 'var(--measure)'

const BEAM =
  '<svg width="9" height="18" viewBox="0 0 9 18" aria-hidden="true"><path d="M1 1.5c2 0 3.5.6 3.5 2.2v10.6c0 1.6-1.5 2.2-3.5 2.2M8 1.5c-2 0-3.5.6-3.5 2.2v10.6c0 1.6 1.5 2.2 3.5 2.2" fill="none" stroke="#fff" stroke-width="1.3"/></svg>'
const ARROW =
  '<svg width="16" height="20" viewBox="0 0 16 20" aria-hidden="true"><path d="M1.2 1.2v15l4-3.5 2.8 6.1 2.7-1.2-2.7-6 5.4-.2z" fill="currentColor" stroke="#13100d" stroke-width="1.2" stroke-linejoin="round"/></svg>'

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
/** Fade-in / hold / fade-out envelope over an object's life. */
const envl = (age: number, life: number, fin: number, fout: number) => (age < 0 || age > life ? 0 : Math.min(1, age / fin, (life - age) / fout))
const px = Math.round
const move = (x: number, y: number) => `translate3d(${x}px,${y}px,0)`

export function startBuildFx(root: HTMLElement, advisors: FxAdvisor[]): () => void {
  const now = () => performance.now()
  const timers = new Set<number>()
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id)
      fn()
    }, ms)
    timers.add(id)
  }

  // Hide every part without letting the reset itself transition (on a replay they are visible right now).
  const parts = Array.from(root.querySelectorAll<HTMLElement>('[data-part]'))
  root.classList.add('fx', 'fx-reset')
  for (const p of parts) p.classList.remove('built', 'done')
  const built = new WeakSet<Element>()

  const layer = document.createElement('div')
  layer.className = 'lp-insp'
  layer.setAttribute('aria-hidden', 'true')
  document.body.appendChild(layer)

  let VW = innerWidth
  let VH = innerHeight
  const setViewport = () => {
    VW = innerWidth
    VH = innerHeight
    layer.style.setProperty('--vw', `${VW}px`)
    layer.style.setProperty('--vh', `${VH}px`)
  }
  setViewport()

  // One rect read per element per frame, all reads before any writes.
  let rects = new Map<Element, DOMRect>()
  const R = (el: Element) => {
    let r = rects.get(el)
    if (!r) {
      r = el.getBoundingClientRect()
      rects.set(el, r)
    }
    return r
  }

  const objs: FxObject[] = []
  const node = (cls: string, html?: string) => {
    const n = document.createElement('div')
    n.className = cls
    if (html) n.innerHTML = html
    n.style.opacity = '0'
    layer.appendChild(n)
    return n
  }
  const add = (o: FxObject) => {
    objs.push(o)
    kick()
    return o
  }

  /** Guide line shooting out from an element edge across the viewport. */
  function guide(target: Element, edge: 'left' | 'right' | 'top' | 'bottom', color: string, life = 900, delay = 0) {
    const vert = edge === 'left' || edge === 'right'
    const n = node(vert ? 'gv' : 'gh')
    n.style.background = color
    const born = now() + delay
    add({
      n,
      t: [target],
      update(t) {
        const age = t - born
        if (age > life) return false
        if (age < 0) return true
        const r = R(target)
        const d = easeOut(clamp(age / 420))
        if (vert) {
          const x = px(edge === 'left' ? r.left : r.right - 1)
          const y0 = clamp(r.top, 0, VH)
          n.style.transform = `${move(x, y0 * (1 - d))} scaleY(${d})`
        } else {
          const y = px(edge === 'top' ? r.top : r.bottom - 1)
          const x0 = clamp(r.left, 0, VW)
          n.style.transform = `${move(x0 * (1 - d), y)} scaleX(${d})`
        }
        n.style.opacity = String(envl(age, life, 60, 360))
        return true
      },
    })
  }

  /** Selection box with corner handles and a W × H readout. */
  function box(target: Element, life = 950, delay = 0) {
    const n = node('bx', '<i></i><i></i><i></i><i></i><b></b>')
    const label = n.lastChild as HTMLElement
    const born = now() + delay
    let lw = -1
    let lh = -1
    add({
      n,
      t: [target],
      update(t) {
        const age = t - born
        if (age > life) return false
        if (age < 0) return true
        const r = R(target)
        const w = px(r.width)
        const h = px(r.height)
        n.style.transform = move(px(r.left), px(r.top))
        if (w !== lw || h !== lh) {
          n.style.width = `${w}px`
          n.style.height = `${h}px`
          label.textContent = `${w} × ${h}`
          lw = w
          lh = h
        }
        n.style.opacity = String(envl(age, life, 80, 300))
        return true
      },
    })
  }

  /** Placeholder block that sits where content is about to render. */
  function skel(target: Element, until: number) {
    const n = node('sk')
    const born = now()
    let lw = -1
    let lh = -1
    add({
      n,
      t: [target],
      update(t) {
        if (t > until + 380) return false
        const r = R(target)
        const w = px(r.width)
        const h = px(r.height)
        n.style.transform = move(px(r.left), px(r.top))
        if (w !== lw || h !== lh) {
          n.style.width = `${w}px`
          n.style.height = `${h}px`
          lw = w
          lh = h
        }
        n.style.opacity = String(t < until ? Math.min(1, (t - born) / 90) : 1 - (t - until) / 380)
        return true
      },
    })
  }

  /** Rendered line boxes of a run of text, relative to the element. */
  function lineRects(target: Element) {
    const base = target.getBoundingClientRect()
    const rows: { left: number; right: number; top: number; bottom: number }[] = []
    const range = document.createRange()
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT)
    for (let tn = walker.nextNode(); tn; tn = walker.nextNode()) {
      if (!tn.nodeValue?.trim()) continue
      range.selectNodeContents(tn)
      for (const q of Array.from(range.getClientRects())) {
        if (q.width < 2 || q.height < 2) continue
        const cy = q.top + q.height / 2
        const row = rows.find((o) => Math.abs((o.top + o.bottom) / 2 - cy) < Math.min(q.height, o.bottom - o.top) * 0.5)
        if (row) {
          row.left = Math.min(row.left, q.left)
          row.right = Math.max(row.right, q.right)
          row.top = Math.min(row.top, q.top)
          row.bottom = Math.max(row.bottom, q.bottom)
        } else rows.push({ left: q.left, right: q.right, top: q.top, bottom: q.bottom })
      }
    }
    return rows.map((o) => ({ dx: o.left - base.left, dy: o.top - base.top, w: o.right - o.left, h: o.bottom - o.top }))
  }

  /** Text: per-line skeleton bars, a selection sweep (scaleX from the left) and an I-beam riding it. */
  function textFx(target: Element) {
    const rows = lineRects(target)
    if (!rows.length) return
    const sel = rows.map(() => node('ln'))
    const bars = rows.map(() => node('lsk'))
    const beam = node('beam', BEAM)
    const per = 75
    const sweep = 280
    const born = now()
    const life = rows.length * per + sweep + 900
    rows.forEach((q, i) => {
      bars[i].style.width = `${px(q.w)}px`
      bars[i].style.height = `${px(q.h * 0.62)}px`
      sel[i].style.width = `${px(q.w)}px`
      sel[i].style.height = `${px(q.h)}px`
    })
    add({
      t: [target],
      kill() {
        for (const n of [...sel, ...bars, beam]) n.remove()
      },
      update(t) {
        const age = t - born
        if (age > life) return false
        const r = R(target)
        rows.forEach((q, i) => {
          const a = age - i * per
          const p = easeOut(clamp(a / sweep))
          const x = px(r.left + q.dx)
          const y = px(r.top + q.dy)
          bars[i].style.transform = move(x, px(y + q.h * 0.19))
          bars[i].style.opacity = String(clamp(age / 90) * clamp(1 - (a - sweep) / 260))
          sel[i].style.transform = `${move(x, y)} scaleX(${p})`
          sel[i].style.opacity = String(a < 0 ? 0 : envl(a, sweep + 650, 40, 380))
        })
        const k = Math.min(rows.length - 1, Math.max(0, Math.floor(age / per)))
        const q = rows[k]
        const pp = easeOut(clamp((age - k * per) / sweep))
        beam.style.transform = move(px(r.left + q.dx + q.w * pp), px(r.top + q.dy + q.h / 2))
        beam.style.opacity = String(envl(age, rows.length * per + sweep + 320, 60, 300))
        return true
      },
    })
  }

  /** Red spacing measurement between two stacked elements. */
  function gapFx(a: Element, b: Element, life = 900, delay = 0) {
    const n = node('gp', '<b></b>')
    const label = n.firstChild as HTMLElement
    const born = now() + delay
    let last = -1
    add({
      n,
      t: [a, b],
      update(t) {
        const age = t - born
        if (age > life) return false
        if (age < 0) return true
        const A = R(a)
        const B = R(b)
        const h = B.top - A.bottom
        if (h < 4) {
          n.style.opacity = '0'
          return true
        }
        const L = Math.max(A.left, B.left)
        const Rr = Math.min(A.right, B.right)
        const x = Rr > L ? px(Rr - Math.min(28, (Rr - L) / 2)) : px(A.left + 16)
        n.style.transform = move(x, px(A.bottom))
        const hh = px(h)
        if (hh !== last) {
          n.style.height = `${hh}px`
          label.textContent = String(hh)
          last = hh
        }
        n.style.opacity = String(envl(age, life, 80, 320))
        return true
      },
    })
  }

  /** Crosshair marker at an element's top-left corner. */
  function plusFx(target: Element, life = 900, delay = 0) {
    const n = node('pl')
    const born = now() + delay
    add({
      n,
      t: [target],
      update(t) {
        const age = t - born
        if (age > life) return false
        if (age < 0) return true
        const r = R(target)
        n.style.transform = move(px(r.left) - 5, px(r.top) - 5)
        n.style.opacity = String(envl(age, life, 60, 300))
        return true
      },
    })
  }

  /** The board, as multiplayer cursors with a short motion trail. */
  class Cursor {
    n: HTMLElement
    ghosts: HTMLElement[]
    x: number
    y: number
    o = 0
    hist: [number, number][] = []
    seed = Math.random() * 6
    active = -1e9
    tg: Element | null = null
    sx = 0
    sy = 0
    fx = 0
    fy = 0
    t0 = 0
    dur = 1
    arc = 0

    constructor(def: FxAdvisor, i: number) {
      this.n = node('cur', ARROW + '<span></span>')
      const tag = this.n.lastChild as HTMLElement
      tag.textContent = def.name
      if (def.tag) tag.style.background = def.tag
      this.n.style.setProperty('--k', def.color)
      this.ghosts = [0, 1, 2].map(() => {
        const g = node('cur ghost', ARROW)
        g.style.setProperty('--k', def.color)
        return g
      })
      this.x = i % 2 ? VW + 40 : -40
      this.y = VH * (0.2 + 0.12 * i)
    }

    go(target: Element, fx: number, fy: number, dur: number) {
      this.sx = this.x
      this.sy = this.y
      this.tg = target
      this.fx = fx
      this.fy = fy
      this.t0 = now()
      this.dur = dur
      this.active = now()
      this.arc = (Math.random() - 0.5) * 140
    }

    update(t: number) {
      if (this.tg) {
        const r = R(this.tg)
        const tx = r.left + this.fx * r.width
        const ty = r.top + this.fy * r.height
        const p = clamp((t - this.t0) / this.dur)
        const e = easeInOut(p)
        const dx = tx - this.sx
        const dy = ty - this.sy
        const len = Math.hypot(dx, dy) || 1
        const bend = Math.sin(Math.PI * e) * this.arc * Math.min(1, len / 400)
        this.x = this.sx + dx * e - (dy / len) * bend
        this.y = this.sy + dy * e + (dx / len) * bend
        if (p >= 1) {
          this.x += Math.sin(t / 650 + this.seed) * 2.2
          this.y += Math.cos(t / 800 + this.seed) * 1.8
        }
      }
      const want = t - this.active < 1800 ? 1 : 0
      this.o += (want - this.o) * 0.12
      if (this.o < 0.004) this.o = 0
      this.hist.unshift([this.x, this.y])
      if (this.hist.length > 10) this.hist.pop()
      this.n.style.transform = `translate3d(${this.x.toFixed(1)}px,${this.y.toFixed(1)}px,0)`
      this.n.style.opacity = this.o.toFixed(3)
      const h3 = this.hist[3]
      const speed = h3 ? Math.hypot(this.x - h3[0], this.y - h3[1]) : 0
      this.ghosts.forEach((g, i) => {
        const h = this.hist[(i + 1) * 3]
        if (!h) {
          g.style.opacity = '0'
          return
        }
        g.style.transform = `translate3d(${h[0].toFixed(1)}px,${h[1].toFixed(1)}px,0)`
        g.style.opacity = (clamp((speed - 14) / 60) * this.o * (0.42 - i * 0.12)).toFixed(3)
      })
      return this.o > 0 || want === 1
    }
  }

  const cursors = advisors.map((d, i) => new Cursor(d, i))
  let ci = 0
  const cursorTo = (p: Element, dur: number) => {
    const c = cursors[(ci++ + (Math.random() < 0.3 ? 1 : 0)) % cursors.length]
    c.go(p, 0.16 + Math.random() * 0.66, 0.2 + Math.random() * 0.6, dur)
  }

  // Red alignment rails: attached to layout, shown while scrolling.
  const boosts = new WeakMap<Element, number>()
  const rails: Rail[] = []
  for (const el of Array.from(root.querySelectorAll('[data-rail]'))) {
    const mode = el.getAttribute('data-rail') ?? ''
    const sec = el.closest('section') ?? root
    for (const dir of ['v', 'h'] as const) {
      if (!mode.includes(dir)) continue
      const n = node(dir === 'v' ? 'gv rl' : 'gh rl')
      n.style.background = RED
      rails.push({ n, target: el, dir, sec, o: 0 })
    }
  }

  // Scroll activity drives the rails and the ambient bursts.
  let lastY = scrollY
  let lastT = now()
  let act = 0
  let actTarget = 0
  let lastScroll = -1e9
  let lastAmb = 0
  let scrollingUp = false

  function updRail(rl: Rail, t: number) {
    const r = R(rl.target)
    const sr = R(rl.sec)
    const inView = r.width > 0 && sr.bottom > 0 && sr.top < VH
    const boost = envl(t - (boosts.get(rl.sec) ?? -1e9), 1900, 140, 700)
    const want = inView ? Math.max(act * 0.85, boost * 0.9) : 0
    rl.o += (want - rl.o) * 0.16
    if (rl.o < 0.004) rl.o = 0
    rl.n.style.opacity = rl.o.toFixed(3)
    if (rl.o > 0) rl.n.style.transform = rl.dir === 'v' ? move(px(r.left), 0) : move(0, px(r.top))
    return rl.o > 0 || want > 0
  }

  // Parts and their build sequence.
  let lastBuilt: Element | null = null
  function buildPart(p: HTMLElement) {
    const t = now()
    const sec = p.closest('section, header')
    if (sec) boosts.set(sec, t)
    if (p.dataset.part === 'text') {
      textFx(p)
      guide(p, 'left', CYAN, 1000)
      if (Math.random() < 0.55) guide(p, 'top', CYAN, 900, 80)
      later(() => markBuilt(p), 230)
    } else {
      skel(p, t + 320)
      box(p, 1000, 30)
      guide(p, 'left', CYAN, 1000)
      guide(p, 'top', CYAN, 1000, 60)
      if (Math.random() < 0.5) guide(p, 'right', CYAN, 950, 120)
      plusFx(p, 1000, 90)
      later(() => markBuilt(p), 300)
    }
    if (lastBuilt && lastBuilt !== p && !lastBuilt.contains(p) && !p.contains(lastBuilt)) {
      const A = lastBuilt.getBoundingClientRect()
      const B = p.getBoundingClientRect()
      const g = B.top - A.bottom
      if (g > 8 && g < 220 && Math.min(A.right, B.right) - Math.max(A.left, B.left) > 24) gapFx(lastBuilt, p, 1000, 100)
    }
    cursorTo(p, 560 + Math.random() * 260)
    lastBuilt = p
  }
  function markBuilt(p: HTMLElement) {
    p.classList.add('built')
    built.add(p)
    later(() => p.classList.add('done'), 700)
  }

  const queue: HTMLElement[] = []
  let draining = false
  function drain() {
    const p = queue.shift()
    if (!p) {
      draining = false
      return
    }
    buildPart(p)
    const n = queue.length
    later(drain, n > 8 ? 16 : n > 3 ? 38 : 70)
  }
  function enqueue(p: HTMLElement) {
    queue.push(p)
    if (!draining) {
      draining = true
      drain()
    }
  }
  // Pending parts are checked against the viewport every frame rather than with an IntersectionObserver: a hidden
  // part's own rect still counts, and the queue order stays document order.
  let pending: HTMLElement[] = []
  function checkPending() {
    pending = pending.filter((p) => {
      const r = R(p)
      const visible = r.width > 0 && r.height > 0 && r.top < VH * 0.98 && r.bottom > VH * 0.02
      if (visible) {
        if (scrollingUp) revealQuietly(p)
        else enqueue(p)
      }
      return !visible
    })
  }
  /** Parts reached by scrolling back up are shown as they are, without the build. */
  function revealQuietly(p: HTMLElement) {
    p.classList.add('quiet')
    markBuilt(p)
  }

  function neighborBelow(p: Element) {
    const a = R(p)
    let best: Element | null = null
    let bd = 1e9
    for (const q of parts) {
      if (q === p || !built.has(q) || q.contains(p) || p.contains(q)) continue
      const b = R(q)
      if (b.width < 4) continue
      const g = b.top - a.bottom
      if (g < 6 || g > 180) continue
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) < 24) continue
      if (g < bd) {
        bd = g
        best = q
      }
    }
    return best
  }
  function ambient() {
    const vis = parts.filter((p) => {
      if (!built.has(p)) return false
      const r = R(p)
      return r.width > 4 && r.bottom > VH * 0.1 && r.top < VH * 0.9 && r.height < VH * 1.1
    })
    if (!vis.length) return
    const p = vis[Math.floor(Math.random() * vis.length)]
    box(p, 650)
    guide(p, Math.random() < 0.5 ? 'left' : 'right', CYAN, 720)
    if (Math.random() < 0.6) guide(p, Math.random() < 0.5 ? 'top' : 'bottom', CYAN, 720, 40)
    if (Math.random() < 0.5) {
      const nb = neighborBelow(p)
      if (nb) gapFx(p, nb, 760)
    }
    if (Math.random() < 0.35) plusFx(p, 700)
    cursorTo(p, 420 + Math.random() * 200)
  }

  // Frame loop: runs only while something is moving.
  let raf = 0
  function kick() {
    if (!raf) raf = requestAnimationFrame(frame)
  }
  function frame(t: number) {
    raf = 0
    rects = new Map()
    for (const o of objs) if (o.t) for (const el of o.t) R(el)
    for (const c of cursors) if (c.tg) R(c.tg)
    for (const rl of rails) {
      R(rl.target)
      R(rl.sec)
    }
    if (pending.length) checkPending()

    if (t - lastScroll > 140) actTarget *= 0.86
    act += (actTarget - act) * 0.14
    if (act < 0.003) act = 0
    if (act > 0.18 && t - lastAmb > 210 - act * 100 && objs.length < 110) {
      lastAmb = t
      ambient()
    }

    for (let i = objs.length - 1; i >= 0; i--) {
      const o = objs[i]
      if (!o.update(t)) {
        if (o.kill) o.kill()
        else o.n?.remove()
        objs.splice(i, 1)
      }
    }
    let busy = act > 0 || objs.length > 0 || draining
    for (const c of cursors) busy = c.update(t) || busy
    for (const rl of rails) busy = updRail(rl, t) || busy
    if (busy) kick()
  }

  const onScroll = () => {
    const t = now()
    const y = scrollY
    const dt = Math.max(16, t - lastT)
    const dy = y - lastY
    lastY = y
    lastT = t
    lastScroll = t
    if (dy !== 0) scrollingUp = dy < 0
    if (scrollingUp) act = actTarget = 0
    else actTarget = Math.max(actTarget * 0.6, clamp(((Math.abs(dy) / dt) * 1000) / 1400))
    kick()
  }
  const onResize = () => {
    setViewport()
    kick()
  }
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('resize', onResize)

  // Two frames with the reset in place, then start building from the top.
  let startRaf = requestAnimationFrame(() => {
    startRaf = requestAnimationFrame(() => {
      startRaf = 0
      root.classList.remove('fx-reset')
      pending = parts.slice()
      kick()
    })
  })

  return () => {
    cancelAnimationFrame(startRaf)
    cancelAnimationFrame(raf)
    raf = 0
    for (const id of timers) clearTimeout(id)
    timers.clear()
    removeEventListener('scroll', onScroll)
    removeEventListener('resize', onResize)
    layer.remove()
    root.classList.remove('fx', 'fx-reset')
    for (const p of parts) p.classList.remove('built', 'done', 'quiet')
  }
}
