import { AdditiveBlending, ShaderMaterial, type IUniform } from 'three'
import { visualConfig } from '../../../shared/config/visualConfig'
import fragmentShader from '../shaders/beam.frag'
import vertexShader from '../shaders/beam.vert'
import { createEventCommonUniforms, syncEventCommonUniforms, type EventCommonUniforms } from './eventUniforms'

type BeamUniforms = EventCommonUniforms & {
  uWidth: IUniform<number>
  uClusterWidth: IUniform<number>
}

export type BeamMaterial = ShaderMaterial & { uniforms: BeamUniforms }

export function createBeamMaterial(): BeamMaterial {
  const uniforms: BeamUniforms = {
    ...createEventCommonUniforms(),
    uWidth: { value: 0 },
    uClusterWidth: { value: 1 },
  }
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  }) as BeamMaterial
  syncBeamMaterial(material, 0)
  return material
}

export function syncBeamMaterial(material: BeamMaterial, time: number): void {
  const u = material.uniforms
  syncEventCommonUniforms(u, time)
  u.uWidth.value = visualConfig.eventPoints.beamWidth
  u.uClusterWidth.value = visualConfig.eventPoints.clusterWidth
}
