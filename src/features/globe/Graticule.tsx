import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { buildGraticule } from '../../core/geo/graticule'
import { GRATICULE_STEP_DEG } from '../../shared/config/visualConfig'
import { createGraticuleMaterial, syncGraticuleMaterial } from './materials/graticuleMaterial'

/** Slightly above the surface so lines don't z-fight with land points. */
const GRATICULE_RADIUS = 1.001

export function Graticule() {
  const positions = useMemo(() => buildGraticule(GRATICULE_STEP_DEG, GRATICULE_RADIUS), [])
  const material = useMemo(() => createGraticuleMaterial(), [])
  useEffect(() => () => material.dispose(), [material])
  useFrame(() => syncGraticuleMaterial(material))

  return (
    <lineSegments material={material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
    </lineSegments>
  )
}
