import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { mulberry32 } from '../../core/math/random'
import { visualConfig } from '../../shared/config/visualConfig'
import { createProjectionParticlesMaterial, syncProjectionParticlesMaterial } from './materials/projectionParticlesMaterial'
import { createProjectionRingMaterial, syncProjectionRingMaterial } from './materials/projectionRingMaterial'

const PARTICLE_COUNT = 280
/** Plane half-size; the shader's ring radii are fractions of this. */
const PLATE_RADIUS = 1.25

/** Emitter plate under the globe with particles rising towards it. Doesn't rotate with the globe. */
export function ProjectionRing() {
  const ringMaterial = useMemo(() => createProjectionRingMaterial(), [])
  const particleMaterial = useMemo(() => createProjectionParticlesMaterial(), [])
  const seeds = useMemo(() => {
    const random = mulberry32(7)
    const out = new Float32Array(PARTICLE_COUNT * 4)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      out[i * 4] = random() * Math.PI * 2 // angle
      out[i * 4 + 1] = PLATE_RADIUS * (0.55 + random() * 0.35) // radius, around the main ring
      out[i * 4 + 2] = 0.08 + random() * 0.12 // rises per second (fraction of the full rise)
      out[i * 4 + 3] = random() // phase
    }
    return out
  }, [])
  // Positions are computed in the shader; three still wants a position attribute for the draw count.
  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), [])
  useEffect(() => () => ringMaterial.dispose(), [ringMaterial])
  useEffect(() => () => particleMaterial.dispose(), [particleMaterial])

  useFrame(({ clock, gl }) => {
    syncProjectionRingMaterial(ringMaterial, clock.elapsedTime)
    syncProjectionParticlesMaterial(particleMaterial, clock.elapsedTime, gl.domElement.height)
  })

  return (
    <group position-y={visualConfig.projectionRing.y}>
      <mesh rotation-x={-Math.PI / 2} material={ringMaterial}>
        <planeGeometry args={[PLATE_RADIUS * 2, PLATE_RADIUS * 2]} />
      </mesh>
      <points material={particleMaterial} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[seeds, 4]} />
        </bufferGeometry>
      </points>
    </group>
  )
}
