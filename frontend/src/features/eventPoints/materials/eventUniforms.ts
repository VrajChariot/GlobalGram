import { Color, type IUniform } from 'three'
import { EVENT_CATEGORIES } from '../../../core/events/GlobeEvent'
import { SPAWN_DURATION_S } from '../../../core/motion/spawn'
import { visualConfig } from '../../../shared/config/visualConfig'

/** Uniforms declared in instanceCommon.glsl, plus intensity. */
export type EventCommonUniforms = {
  uTime: IUniform<number>
  uSpawnDuration: IUniform<number>
  uColors: IUniform<Color[]>
  uBackOpacity: IUniform<number>
  uLimbOpacity: IUniform<number>
  uWhiteness: IUniform<number>
  uIntensity: IUniform<number>
}

export function createEventCommonUniforms(): EventCommonUniforms {
  return {
    uTime: { value: 0 },
    uSpawnDuration: { value: SPAWN_DURATION_S },
    uColors: { value: EVENT_CATEGORIES.map(() => new Color()) },
    uBackOpacity: { value: 0 },
    uLimbOpacity: { value: 1 },
    uWhiteness: { value: 0 },
    uIntensity: { value: 1 },
  }
}

export function syncEventCommonUniforms(u: EventCommonUniforms, time: number): void {
  u.uTime.value = time
  EVENT_CATEGORIES.forEach((category, i) => u.uColors.value[i].set(visualConfig.eventColors[category]))
  u.uBackOpacity.value = visualConfig.eventPoints.backOpacity
  u.uLimbOpacity.value = visualConfig.eventPoints.limbOpacity
  u.uWhiteness.value = visualConfig.eventPoints.whiteness
  u.uIntensity.value = visualConfig.eventPoints.intensity
}
