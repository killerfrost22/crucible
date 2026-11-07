// Easing curves shared by every animation; mirrors the --ease-* CSS tokens.

/** Quick settle with a slight overshoot, for things that land: cards, beads, the poured ingot. */
export const EASE_SNAP = [0.2, 0.9, 0.3, 1.12] as const
/** Confident deceleration for content reveals. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const
/** Slow start and finish, for heavy moves: the crucible tipping, metal cooling. */
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const
/** Accelerates into contact, for a struck hallmark. */
export const EASE_STRIKE = [0.55, 0, 0.85, 0.35] as const
/** Gravity: a falling bead speeds up. */
export const EASE_FALL = [0.5, 0, 0.9, 0.5] as const
