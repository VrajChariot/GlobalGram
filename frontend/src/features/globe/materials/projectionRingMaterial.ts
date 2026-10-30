import { AdditiveBlending, Color, DoubleSide, ShaderMaterial, type IUniform } from 'three'
import { visualConfig } from '../../../shared/config/visualConfig'
import fragmentShader from '../shaders/projectionRing.frag'
import vertexShader from '../shaders/projectionRing.vert'

type ProjectionRingUniforms = {
  uColor: IUniform<Color>
  uHighlight: IUniform<Color>
  uTime: IUniform<number>
  uIntensity: IUniform<number>
}

export type ProjectionRingMaterial = ShaderMaterial & { uniforms: ProjectionRingUniforms }

export function createProjectionRingMaterial(): ProjectionRingMaterial {
  const uniforms: ProjectionRingUniforms = {
    uColor: { value: new Color() },
    uHighlight: { value: new Color() },
    uTime: { value: 0 },
    uIntensity: { value: 0 },
  }
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  }) as ProjectionRingMaterial
  syncProjectionRingMaterial(material, 0)
  return material
}

export function syncProjectionRingMaterial(material: ProjectionRingMaterial, time: number): void {
  const u = material.uniforms
  u.uColor.value.set(visualConfig.palette.primary)
  u.uHighlight.value.set(visualConfig.palette.highlight)
  u.uTime.value = time
  u.uIntensity.value = visualConfig.projectionRing.intensity
  material.visible = visualConfig.projectionRing.intensity > 0
}
