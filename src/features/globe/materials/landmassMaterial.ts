import { AdditiveBlending, Color, ShaderMaterial, type IUniform } from 'three'
import { visualConfig } from '../../../shared/config/visualConfig'
import fragmentShader from '../shaders/landmass.frag'
import vertexShader from '../shaders/landmass.vert'

type LandmassUniforms = {
  uColor: IUniform<Color>
  uHighlight: IUniform<Color>
  uTime: IUniform<number>
  uSize: IUniform<number>
  uHalfHeight: IUniform<number>
  uOpacity: IUniform<number>
  uBackOpacity: IUniform<number>
  uTwinkle: IUniform<number>
}

export type LandmassMaterial = ShaderMaterial & { uniforms: LandmassUniforms }

export function createLandmassMaterial(): LandmassMaterial {
  const uniforms: LandmassUniforms = {
    uColor: { value: new Color() },
    uHighlight: { value: new Color() },
    uTime: { value: 0 },
    uSize: { value: 0 },
    uHalfHeight: { value: 1 },
    uOpacity: { value: 0 },
    uBackOpacity: { value: 0 },
    uTwinkle: { value: 0 },
  }
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  }) as LandmassMaterial
  syncLandmassMaterial(material, 0, 1)
  return material
}

/** `drawingBufferHeight` is in device pixels, so points keep their world size at any DPR. */
export function syncLandmassMaterial(material: LandmassMaterial, time: number, drawingBufferHeight: number): void {
  const u = material.uniforms
  const l = visualConfig.landmass
  u.uColor.value.set(visualConfig.palette.primary)
  u.uHighlight.value.set(visualConfig.palette.highlight)
  u.uTime.value = time
  u.uSize.value = l.size
  u.uHalfHeight.value = drawingBufferHeight / 2
  u.uOpacity.value = l.opacity
  u.uBackOpacity.value = l.backOpacity
  u.uTwinkle.value = l.twinkle
}
