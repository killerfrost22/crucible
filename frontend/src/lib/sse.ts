import type { AdkEvent } from '../types'

/**
 * Incremental text/event-stream parser shared by live mode (fetch chunks) and replay (whole file).
 * Only `data:` fields matter for ADK; other fields and `:` comments are ignored.
 */
export class SseParser {
  private buffer = ''
  private data: string[] = []

  /** Feeds a chunk; returns the `data` payload of every event completed by it. */
  push(chunk: string): string[] {
    this.buffer += chunk
    const done: string[] = []
    let start = 0
    for (let i = 0; i < this.buffer.length; i++) {
      const ch = this.buffer[i]
      if (ch !== '\n' && ch !== '\r') continue
      // A trailing '\r' may be the first half of '\r\n' split across chunks; wait for more input.
      if (ch === '\r' && i === this.buffer.length - 1) break
      this.line(this.buffer.slice(start, i), done)
      if (ch === '\r' && this.buffer[i + 1] === '\n') i++
      start = i + 1
    }
    this.buffer = this.buffer.slice(start)
    return done
  }

  /** Ends the stream; a final event without a trailing blank line still counts. */
  flush(): string[] {
    const done: string[] = []
    if (this.buffer) this.line(this.buffer.replace(/\r$/, ''), done)
    this.buffer = ''
    this.line('', done)
    return done
  }

  private line(line: string, done: string[]) {
    if (line === '') {
      if (this.data.length) done.push(this.data.join('\n'))
      this.data = []
      return
    }
    if (line.startsWith(':')) return
    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    if (field !== 'data') return
    let value = colon === -1 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    this.data.push(value)
  }
}

/** Parses one `data` payload; malformed JSON becomes an error event instead of throwing. */
export function toAdkEvent(payload: string): AdkEvent {
  try {
    const value: unknown = JSON.parse(payload)
    if (value && typeof value === 'object') return value as AdkEvent
    return { error: `Unexpected event payload: ${payload.slice(0, 200)}` }
  } catch {
    return { error: `Could not read an event from the server: ${payload.slice(0, 200)}` }
  }
}

export function parseSseText(text: string): AdkEvent[] {
  const parser = new SseParser()
  return [...parser.push(text), ...parser.flush()].map(toAdkEvent)
}
