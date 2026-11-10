import type { CSSProperties, ReactNode } from 'react'
import { SEATS } from '../seats'

const dot = (color: string) => ({ '--k': color }) as CSSProperties

type Step =
  | { kind: 'start' | 'fn' | 'join' | 'owner'; name: string; type: string; note: ReactNode }
  | { kind: 'agent'; name: string; id: string; model: string; color: string; molten?: boolean; note: ReactNode }
  | { kind: 'round'; round: 1 | 2; note: ReactNode }

/** The ADK workflow in backend/agents/crucible/agent.py, in edge order. */
const STEPS: Step[] = [
  {
    kind: 'start',
    name: 'START',
    type: 'run',
    note: (
      <>
        <code>POST /run_sse</code> starts a run. The owner’s question and business profile arrive as the new message, as JSON.
      </>
    ),
  },
  {
    kind: 'fn',
    name: 'intake',
    type: 'function',
    note: (
      <>
        Validates the message against the <code>Intake</code> schema and writes <code>state.intake</code>.
      </>
    ),
  },
  {
    kind: 'agent',
    name: 'Researcher',
    id: 'researcher',
    model: 'Sonnet 5.5 · web',
    color: 'var(--text-2)',
    note: (
      <>
        One web-searching call. Returns the decision in one neutral sentence, the options, 6–12 numbered facts with sources, and the
        open questions. Writes <code>state.evidence</code>.
      </>
    ),
  },
  {
    kind: 'fn',
    name: 'convene',
    type: 'function',
    note: 'Hands all five seats the same Round 1 brief.',
  },
  {
    kind: 'round',
    round: 1,
    note: 'Five agents run at once. Each reads the owner’s briefing and the same numbered facts, and takes a stance without seeing the others.',
  },
  {
    kind: 'join',
    name: 'round1',
    type: 'JoinNode',
    note: 'Waits until all five have answered, then passes their answers on together.',
  },
  {
    kind: 'fn',
    name: 'open_rebuttal',
    type: 'function',
    note: (
      <>
        Saves <code>state.round1</code> and writes the Round 1 transcript into the Round 2 brief.
      </>
    ),
  },
  {
    kind: 'round',
    round: 2,
    note: 'Each seat reads all of Round 1, rebuts other seats by name, and may concede a point or change its stance.',
  },
  {
    kind: 'join',
    name: 'round2',
    type: 'JoinNode',
    note: 'Waits for all five rebuttals.',
  },
  {
    kind: 'fn',
    name: 'close_debate',
    type: 'function',
    note: (
      <>
        Saves <code>state.round2</code> and hands the Chairman both rounds in full.
      </>
    ),
  },
  {
    kind: 'agent',
    name: 'Chairman',
    id: 'chairman',
    model: 'Sonnet 5.5',
    color: 'var(--seat-chairman)',
    molten: true,
    note: (
      <>
        Weighs the debate and returns the verdict: proceed, pilot, defer or reject, with its conditions, dissent and next steps. Writes{' '}
        <code>state.verdict</code>.
      </>
    ),
  },
  {
    kind: 'owner',
    name: 'Your call',
    type: 'after the run',
    note: (
      <>
        Not a node. The owner accepts or overrides the verdict, and the app saves that choice to the session with a <code>PATCH</code>. My
        decisions reads the session back, so a reload shows the board and that signature again.
      </>
    ),
  },
]

function Node({ step }: { step: Step }) {
  if (step.kind === 'round') {
    return (
      <div className="uth-par" data-part data-rail="h">
        <p className="uth-par__label">
          <span>Round {step.round}</span>
          <code>{`<seat>_r${step.round}`}</code> × 5 in parallel · Haiku 5.5
        </p>
        <ul className="uth-par__seats">
          {SEATS.map((s) => (
            <li key={s.id} className="uth-node uth-node--seat" data-part data-cursor={s.id} style={dot(`var(--seat-${s.id})`)}>
              <span className="uth-dot" />
              <span className="uth-node__seat">{s.title}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (step.kind === 'agent') {
    return (
      <div
        className={step.molten ? 'uth-node uth-node--agent uth-node--chair' : 'uth-node uth-node--agent'}
        data-part
        data-cursor={step.molten ? 'chairman' : undefined}
        style={dot(step.color)}
      >
        <span className="uth-node__type">LlmAgent</span>
        <span className="uth-node__name">
          <span className={step.molten ? 'uth-dot uth-dot--molten' : 'uth-dot'} />
          {step.name}
        </span>
        <span className="uth-node__model">{step.model}</span>
      </div>
    )
  }
  return (
    <div className={`uth-node uth-node--${step.kind}`} data-part>
      <span className="uth-node__type">{step.type}</span>
      <span className="uth-node__name">{step.name}</span>
    </div>
  )
}

/** The workflow as a build diagram: every node is a part the cursors put in place. */
export function Pipeline() {
  return (
    <ol className="uth-flow" aria-label="The Crucible workflow, top to bottom">
      {STEPS.map((step, i) => (
        <li key={i} className={`uth-flow__row uth-flow__row--${step.kind}`}>
          <div className="uth-flow__dia">
            <Node step={step} />
          </div>
          <p className="uth-flow__note" data-part="text">
            {step.note}
          </p>
        </li>
      ))}
    </ol>
  )
}
