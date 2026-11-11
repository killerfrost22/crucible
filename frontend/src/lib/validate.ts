import { SEAT_IDS, type Evidence, type Intake, type Round1Opinion, type Round2Opinion, type Verdict } from '../types'

/**
 * Shape checks for what the board sends (live events, recordings, saved state), mirroring backend/agents/crucible/
 * schemas.py. A rule returns null when the value fits, else the path of the first part that doesn't, for the error's
 * technical details. Optional fields may be absent (older recordings); if present, they must fit too.
 */
type Rule = (value: unknown, path: string) => string | null

/** The app's one plain-object guard; fields stay `unknown` until checked. */
export const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

const str: Rule = (v, p) => (typeof v === 'string' ? null : p)
const num: Rule = (v, p) => (typeof v === 'number' && Number.isFinite(v) ? null : p)
const bool: Rule = (v, p) => (typeof v === 'boolean' ? null : p)
const nullable =
  (rule: Rule): Rule =>
  (v, p) =>
    v === null ? null : rule(v, p)
const oneOf =
  (...values: readonly string[]): Rule =>
  (v, p) =>
    typeof v === 'string' && values.includes(v) ? null : p

function list(item: Rule): Rule {
  return (v, p) => {
    if (!Array.isArray(v)) return p
    for (let i = 0; i < v.length; i++) {
      const bad = item(v[i], `${p}[${i}]`)
      if (bad) return bad
    }
    return null
  }
}

function shape(required: Record<string, Rule>, optional: Record<string, Rule> = {}): Rule {
  return (v, p) => {
    if (!isObject(v)) return p
    for (const [key, rule] of Object.entries(required)) {
      const bad = rule(v[key], `${p}.${key}`)
      if (bad) return bad
    }
    for (const [key, rule] of Object.entries(optional)) {
      if (v[key] === undefined) continue
      const bad = rule(v[key], `${p}.${key}`)
      if (bad) return bad
    }
    return null
  }
}

const seat = oneOf(...SEAT_IDS)

const INTAKE = shape({
  question: str,
  leaning: str,
  profile: shape({
    name: str,
    industry: str,
    location: str,
    size: str,
    current_tools: list(str),
    budget: str,
    goals: list(str),
    constraints: str,
  }),
})

const EVIDENCE = shape({
  decision: str,
  options: list(str),
  facts: list(
    shape(
      { claim: str, source: str, verified: bool },
      { check: shape({ status: oneOf('ok', 'broken', 'unreachable'), checked_at: str, http_status: nullable(num) }) },
    ),
  ),
  open_questions: list(str),
})

const TOOL = shape(
  { name: str, use: str, monthly_cost: str, works_with: str, caveat: str },
  { url: str, price_fact: str, pilot_test: str },
)

const OPINION = {
  stance: oneOf('support', 'oppose', 'conditional'),
  headline: str,
  summary: str,
  key_points: list(str),
  risks: list(str),
  confidence: num,
  pushback: str,
}

const SEAT_EXTRAS = {
  checks: list(shape({ area: oneOf('legal', 'compliance', 'financial', 'goals', 'operational'), status: oneOf('pass', 'flag', 'block'), note: str })),
  tools: list(TOOL),
}

const ROUND1 = shape(OPINION, SEAT_EXTRAS)

const ROUND2 = shape(
  {
    ...OPINION,
    changed_position: bool,
    changed_because: str,
    rebuttals: list(shape({ target: seat, their_claim: str, response: str })),
    concessions: list(str),
  },
  SEAT_EXTRAS,
)

const POINT = shape({ seat, point: str })

const VERDICT = shape(
  {
    decision: oneOf('proceed', 'pilot', 'defer', 'reject'),
    headline: str,
    confidence: num,
    rationale: str,
    decisive_arguments: list(POINT),
    dissent: list(POINT),
    conditions: list(str),
    next_steps: list(shape({ when: oneOf('this week', 'next 30 days', 'next 90 days'), action: str })),
    ai_tools: list(TOOL),
    escalate_to: oneOf('none', 'attorney', 'accountant', 'sbdc_advisor', 'regulator'),
    escalation_reason: str,
  },
  { would_change: list(str), no_new_tool: str },
)

/** Either the value, now typed, or where it stopped fitting. */
export type Checked<T> = { ok: true; value: T } | { ok: false; at: string }

function check<T>(rule: Rule, value: unknown, name: string): Checked<T> {
  const bad = rule(value, name)
  // The rule has just checked every field the type promises, so the cast reflects what was verified.
  return bad ? { ok: false, at: bad } : { ok: true, value: value as T }
}

export const checkIntake = (v: unknown) => check<Intake>(INTAKE, v, 'intake')
export const checkEvidence = (v: unknown) => check<Evidence>(EVIDENCE, v, 'evidence')
export const checkRound1 = (v: unknown) => check<Round1Opinion>(ROUND1, v, 'opinion')
export const checkRound2 = (v: unknown) => check<Round2Opinion>(ROUND2, v, 'rebuttal')
export const checkVerdict = (v: unknown) => check<Verdict>(VERDICT, v, 'verdict')
