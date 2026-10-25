/** Pinch starts below this normalised thumb–index distance… */
export const PINCH_START = 0.25
/** …and ends above this (hysteresis). */
export const PINCH_END = 0.4
/** A hand missing for this long counts as gone. */
export const HAND_LOSS_MS = 150
/** Pinch movement (fraction of screen width) that turns a pinch into a drag, whenever it happens. */
export const DRAG_START_FRACTION = 0.03
/**
 * A pinch released within this, having moved less than DRAG_START_FRACTION,
 * is a tap. The spec's 250 ms, plus a frame of slack: at 10–15 fps tracking a
 * real 250 ms tap measures 270–350 ms between the frames that see it.
 */
export const TAP_MAX_MS = 350
/**
 * Mid-drag or mid-zoom, an opened pinch must stay open this long (or open
 * past PINCH_END) to count: one noisy frame must never end a rotation.
 */
export const RELEASE_CONFIRM_MS = 120
/** Openness (0 = fist, 1 = flat open hand) above which the palm counts as open… */
export const OPEN_PALM = 0.9
/**
 * …with the thumb spread away from the index (pinch distance above this).
 * Openness alone can't tell a flat palm from a relaxed open or OK-sign hand:
 * their fingertips reach just as far, but the thumb rests by the index.
 */
export const OPEN_PALM_THUMB_SPREAD = 0.7
/** …for at least this long. */
export const OPEN_PALM_HOLD_MS = 300
export const DWELL_SELECT_MS = 600
/** Hand drags released slower than this (rad/s) don't fling: release jitter shouldn't spin the globe. */
export const MIN_FLING_SPEED = 0.6
