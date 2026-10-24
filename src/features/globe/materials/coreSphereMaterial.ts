import { AdditiveBlending, Color, ShaderMaterial, type IUniform } from 'three'
import { visualConfig } from '../../../shared/config/visualConfig'
import fragmentShader from '../shaders/coreSphere.frag'
import vertexShader from '../shaders/surface.vert'

type CoreSphereUniforms = {
  uColor: IUniform<Color>
  uHighlight: IUniform<Color>
  uTime: IUniform<number>
  uRimPower: IUniform<number>
  uRimStrength: IUniform<number>
  uScanlineOpacity: IUniform<number>
  uScanlineDensity: IUniform<number>
  uScanlineSpeed: IUniform<number>
  uFlicker: IUniform<number>
}

export type CoreSphereMaterial = ShaderMaterial & { uniforms: CoreSphereUniforms }

export function createCoreSphereMaterial(): CoreSphereMaterial {
  const uniforms: CoreSphereUniforms = {
    uColor: { value: new Color() },
    uHighlight: { value: new Color() },
    uTime: { value: 0 },
    uRimPower: { value: 0 },
    uRimStrength: { value: 0 },
    uScanlineOpacity: { value: 0 },
    uScanlineDensity: { value: 0 },
    uScanlineSpeed: { value: 0 },
    uFlicker: { value: 0 },
  }
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  }) as CoreSphereMaterial
  syncCoreSphereMaterial(material, 0)
  return material
}

export function syncCoreSphereMaterial(material: CoreSphereMaterial, time: number): void {
  const u = material.uniforms
  const c = visualConfig.core
  u.uColor.value.set(visualConfig.palette.primary)
  u.uHighlight.value.set(visualConfig.palette.highlight)
  u.uTime.value = time
  u.uRimPower.value = c.rimPower
  u.uRimStrength.value = c.rimStrength
  u.uScanlineOpacity.value = c.scanlineOpacity
  u.uScanlineDensity.value = c.scanlineDensity
  u.uScanlineSpeed.value = c.scanlineSpeed
  u.uFlicker.value = c.flicker
}
