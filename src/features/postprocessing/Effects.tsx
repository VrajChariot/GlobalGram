import { useFrame } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, Noise } from '@react-three/postprocessing'
import type { BloomEffect, ChromaticAberrationEffect, NoiseEffect } from 'postprocessing'
import { useEffect, useMemo, useRef } from 'react'
import { RENDER_QUALITY, visualConfig } from '../../shared/config/visualConfig'
import { AlphaFromBrightnessEffect } from './AlphaFromBrightnessEffect'

export function Effects() {
  const bloom = useRef<BloomEffect>(null)
  const chromatic = useRef<ChromaticAberrationEffect>(null)
  const noise = useRef<NoiseEffect>(null)
  const alpha = useMemo(() => new AlphaFromBrightnessEffect(), [])
  useEffect(() => () => alpha.dispose(), [alpha])

  useFrame(() => {
    const p = visualConfig.post
    if (bloom.current) {
      bloom.current.intensity = p.bloomIntensity
      bloom.current.luminanceMaterial.threshold = p.bloomThreshold
      bloom.current.luminanceMaterial.smoothing = p.bloomSmoothing
      bloom.current.mipmapBlurPass.radius = p.bloomRadius
    }
    chromatic.current?.offset.set(p.chromaticOffset, p.chromaticOffset)
    if (noise.current) noise.current.blendMode.opacity.value = p.noiseOpacity
  })

  const p = visualConfig.post
  return (
    <EffectComposer multisampling={RENDER_QUALITY.multisampling}>
      <Bloom
        ref={bloom}
        mipmapBlur
        luminanceThreshold={p.bloomThreshold}
        luminanceSmoothing={p.bloomSmoothing}
        radius={p.bloomRadius}
        intensity={p.bloomIntensity}
      />
      <ChromaticAberration ref={chromatic} radialModulation={false} modulationOffset={0} />
      {/* Premultiplied so the grain only lands on the hologram, not the room behind it. */}
      <Noise ref={noise} premultiply opacity={p.noiseOpacity} />
      <primitive object={alpha} />
    </EffectComposer>
  )
}
