import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { ATMOSPHERE_RADIUS } from '../../shared/config/visualConfig'
import { createAtmosphereMaterial, syncAtmosphereMaterial } from './materials/atmosphereMaterial'

export function Atmosphere() {
  const material = useMemo(() => createAtmosphereMaterial(), [])
  useEffect(() => () => material.dispose(), [material])
  useFrame(() => syncAtmosphereMaterial(material))

  return (
    <mesh material={material}>
      <sphereGeometry args={[ATMOSPHERE_RADIUS, 64, 48]} />
    </mesh>
  )
}
