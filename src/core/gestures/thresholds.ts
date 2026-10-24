/** Pinch starts below this normalised thumb–index distance… */
export const PINCH_START = 0.25
/** …and ends above this (hysteresis). */
export const PINCH_END = 0.4
/** A hand missing for this long counts as gone. */
export const HAND_LOSS_MS = 150
/** Pinch movement (fraction of screen width) that turns a pinch into a drag. */
export const DRAG_START_FRACTION = 0.03
export const DRAG_WINDOW_MS = 200
/** A pinch released within this, having moved less than DRAG_START_FRACTION, is a tap. */
export const TAP_MAX_MS = 250
/** Openness (0 = fist, 1 = flat open hand) above which the palm counts as open… */
export const OPEN_PALM = 0.9
/** …for at least this long. */
export const OPEN_PALM_HOLD_MS = 300
export const DWELL_SELECT_MS = 600
