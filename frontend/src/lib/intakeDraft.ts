import type { Intake } from '../types'

/** Form-shaped intake: list fields are edited as comma-separated text. */
export interface IntakeDraft {
  question: string
  leaning: string
  name: string
  industry: string
  location: string
  size: string
  tools: string
  budget: string
  goals: string
  constraints: string
}

export const emptyDraft: IntakeDraft = {
  question: '',
  leaning: '',
  name: '',
  industry: '',
  location: '',
  size: '',
  tools: '',
  budget: '',
  goals: '',
  constraints: '',
}

export function draftFromIntake(intake: Intake): IntakeDraft {
  const p = intake.profile
  return {
    question: intake.question,
    leaning: intake.leaning,
    name: p.name,
    industry: p.industry,
    location: p.location,
    size: p.size,
    tools: p.current_tools.join(', '),
    budget: p.budget,
    goals: p.goals.join(', '),
    constraints: p.constraints,
  }
}

const splitList = (text: string) =>
  text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)

export function intakeFromDraft(d: IntakeDraft): Intake {
  return {
    question: d.question.trim(),
    leaning: d.leaning.trim(),
    profile: {
      name: d.name.trim(),
      industry: d.industry.trim(),
      location: d.location.trim(),
      size: d.size.trim(),
      current_tools: splitList(d.tools),
      budget: d.budget.trim(),
      goals: splitList(d.goals),
      constraints: d.constraints.trim(),
    },
  }
}
