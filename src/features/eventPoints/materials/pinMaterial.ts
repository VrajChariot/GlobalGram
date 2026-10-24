import { AdditiveBlending, ShaderMaterial, type IUniform } from 'three'
import { visualConfig } from '../../../shared/config/visualConfig'
import fragmentShader from '../shaders/pin.frag'
import vertexShader from '../shaders/pin.vert'
import { createEventCommonUniforms, syncEventCommonUniforms, type EventCommonUniforms } from './eventUniforms'

type PinUniforms = EventCommonUniforms & {
  uPinSize: IUniform<number>
  uClusterPin: IUniform<number>
}

export type PinMaterial = ShaderMaterial & { uniforms: PinUniforms }

export function createPinMaterial(): PinMaterial {
  const uniforms: PinUniforms = {
    ...createEventCommonUniforms(),
    uPinSize: { value: 0 },
    uClusterPin: { value: 1 },
  }
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  }) as PinMaterial
  syncPinMaterial(material, 0)
  return material
}

export function syncPinMaterial(material: PinMaterial, time: number): void {
  const u = material.uniforms
  syncEventCommonUniforms(u, time)
  u.uPinSize.value = visualConfig.eventPoints.pinSize
  u.uClusterPin.value = visualConfig.eventPoints.clusterPin
}
