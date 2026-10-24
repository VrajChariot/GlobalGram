import { AdditiveBlending, Color, ShaderMaterial, type IUniform } from 'three'
import { visualConfig } from '../../../shared/config/visualConfig'
import fragmentShader from '../shaders/graticule.frag'
import vertexShader from '../shaders/graticule.vert'

type GraticuleUniforms = {
  uColor: IUniform<Color>
  uOpacity: IUniform<number>
  uBackOpacity: IUniform<number>
}

export type GraticuleMaterial = ShaderMaterial & { uniforms: GraticuleUniforms }

export function createGraticuleMaterial(): GraticuleMaterial {
  const uniforms: GraticuleUniforms = {
    uColor: { value: new Color() },
    uOpacity: { value: 0 },
    uBackOpacity: { value: 0 },
  }
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  }) as GraticuleMaterial
  syncGraticuleMaterial(material)
  return material
}

export function syncGraticuleMaterial(material: GraticuleMaterial): void {
  const u = material.uniforms
  u.uColor.value.set(visualConfig.palette.primary)
  u.uOpacity.value = visualConfig.graticule.opacity
  u.uBackOpacity.value = visualConfig.graticule.backOpacity
}
