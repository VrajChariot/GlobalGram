import { BlendFunction, Effect } from 'postprocessing'
import fragmentShader from './shaders/alphaFromBrightness.frag'

/** Must be the last effect in the composer. */
export class AlphaFromBrightnessEffect extends Effect {
  constructor() {
    super('AlphaFromBrightnessEffect', fragmentShader, { blendFunction: BlendFunction.SRC })
  }
}
