import { AdditiveBlending, BackSide, Color, ShaderMaterial, type IUniform } from 'three'
import { ATMOSPHERE_RADIUS, visualConfig } from '../../../shared/config/visualConfig'
import fragmentShader from '../shaders/atmosphere.frag'
import vertexShader from '../shaders/surface.vert'

type AtmosphereUniforms = {
  uColor: IUniform<Color>
  uIntensity: IUniform<number>
  uPower: IUniform<number>
  uInnerFade: IUniform<number>
  uGlobeEdge: IUniform<number>
}

export type AtmosphereMaterial = ShaderMaterial & { uniforms: AtmosphereUniforms }

export function createAtmosphereMaterial(): AtmosphereMaterial {
  const uniforms: AtmosphereUniforms = {
    uColor: { value: new Color() },
    uIntensity: { value: 0 },
    uPower: { value: 0 },
    uInnerFade: { value: 0 },
    // A view ray grazing the unit globe meets the halo shell's back face at this -dot(N, V).
    uGlobeEdge: { value: Math.sqrt(1 - 1 / (ATMOSPHERE_RADIUS * ATMOSPHERE_RADIUS)) },
  }
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    side: BackSide,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  }) as AtmosphereMaterial
  syncAtmosphereMaterial(material)
  return material
}

export function syncAtmosphereMaterial(material: AtmosphereMaterial): void {
  const u = material.uniforms
  const a = visualConfig.atmosphere
  // Skip the draw call entirely when the halo is switched off.
  material.visible = a.intensity > 0
  u.uColor.value.set(visualConfig.palette.primary)
  u.uIntensity.value = a.intensity
  u.uPower.value = a.power
  u.uInnerFade.value = a.innerFade
}
