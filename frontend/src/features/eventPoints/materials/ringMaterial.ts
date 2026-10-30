import { AdditiveBlending, DoubleSide, ShaderMaterial, type IUniform } from 'three'
import { visualConfig } from '../../../shared/config/visualConfig'
import fragmentShader from '../shaders/ring.frag'
import vertexShader from '../shaders/ring.vert'
import { createEventCommonUniforms, syncEventCommonUniforms, type EventCommonUniforms } from './eventUniforms'

type RingUniforms = EventCommonUniforms & {
  uRingSize: IUniform<number>
  uRingOpacity: IUniform<number>
}

export type RingMaterial = ShaderMaterial & { uniforms: RingUniforms }

export function createRingMaterial(): RingMaterial {
  const uniforms: RingUniforms = {
    ...createEventCommonUniforms(),
    uRingSize: { value: 0 },
    uRingOpacity: { value: 1 },
  }
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  }) as RingMaterial
  syncRingMaterial(material, 0)
  return material
}

export function syncRingMaterial(material: RingMaterial, time: number): void {
  const u = material.uniforms
  syncEventCommonUniforms(u, time)
  u.uRingSize.value = visualConfig.eventPoints.ringSize
  u.uRingOpacity.value = visualConfig.eventPoints.ringOpacity
}
