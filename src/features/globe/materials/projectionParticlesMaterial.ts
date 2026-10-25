import { AdditiveBlending, Color, ShaderMaterial, type IUniform } from 'three'
import { visualConfig } from '../../../shared/config/visualConfig'
import fragmentShader from '../shaders/projectionParticles.frag'
import vertexShader from '../shaders/projectionParticles.vert'

type ProjectionParticlesUniforms = {
  uColor: IUniform<Color>
  uTime: IUniform<number>
  uRise: IUniform<number>
  uSize: IUniform<number>
  uHalfHeight: IUniform<number>
  uOpacity: IUniform<number>
}

export type ProjectionParticlesMaterial = ShaderMaterial & { uniforms: ProjectionParticlesUniforms }

export function createProjectionParticlesMaterial(): ProjectionParticlesMaterial {
  const uniforms: ProjectionParticlesUniforms = {
    uColor: { value: new Color() },
    uTime: { value: 0 },
    uRise: { value: 1 },
    uSize: { value: 0 },
    uHalfHeight: { value: 1 },
    uOpacity: { value: 0 },
  }
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  }) as ProjectionParticlesMaterial
  syncProjectionParticlesMaterial(material, 0, 1)
  return material
}

/** `drawingBufferHeight` in device pixels, so particles keep their world size at any DPR. */
export function syncProjectionParticlesMaterial(material: ProjectionParticlesMaterial, time: number, drawingBufferHeight: number): void {
  const u = material.uniforms
  const ring = visualConfig.projectionRing
  u.uColor.value.set(visualConfig.palette.highlight)
  u.uTime.value = time
  u.uRise.value = ring.particleRise
  u.uSize.value = ring.particleSize
  u.uHalfHeight.value = drawingBufferHeight / 2
  u.uOpacity.value = ring.particleOpacity
  material.visible = ring.particleOpacity > 0
}
