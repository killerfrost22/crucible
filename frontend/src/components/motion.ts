// Easing curves shared by every animation; mirrors the --ease-* CSS tokens.

/** Quick settle with a slight overshoot, like paper snapping flat under a pin. */
export const EASE_PIN = [0.2, 0.9, 0.3, 1.12] as const
/** Confident deceleration for content reveals. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const
/** Accelerates into contact, for rubber stamps. */
export const EASE_STAMP = [0.55, 0, 0.85, 0.35] as const
