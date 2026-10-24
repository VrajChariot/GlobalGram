import { useControls } from 'leva'
import { DEFAULT_ONE_EURO } from '../../core/hands/oneEuroFilter'
import { INTERACTION_BOX_FRACTION } from '../../core/hands/interactionBox'
import { bindSection } from './levaBinding'

/** Live hand-input tuning. The hand pipeline reads this on every frame. */
export const gestureConfig = {
  oneEuro: { ...DEFAULT_ONE_EURO },
  interaction: {
    /** Share of the visible camera frame mapped to the full viewport. */
    boxFraction: INTERACTION_BOX_FRACTION,
  },
}

/** Registers gestureConfig as leva controls. Mount once. */
export function useGestureConfigControls(): void {
  useControls(
    'One Euro filter',
    bindSection(gestureConfig.oneEuro, {
      minCutoff: { min: 0.01, max: 10, step: 0.01 },
      beta: { min: 0, max: 0.5, step: 0.001 },
      dCutoff: { min: 0.1, max: 10, step: 0.1 },
    }),
    { collapsed: true },
  )
  useControls('Interaction box', bindSection(gestureConfig.interaction, { boxFraction: { min: 0.3, max: 1, step: 0.01 } }), {
    collapsed: true,
  })
}
