import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { createCoreSphereMaterial, syncCoreSphereMaterial } from './materials/coreSphereMaterial'

export function CoreSphere() {
  const material = useMemo(() => createCoreSphereMaterial(), [])
  useEffect(() => () => material.dispose(), [material])
  useFrame(({ clock }) => syncCoreSphereMaterial(material, clock.elapsedTime))

  return (
    <mesh material={material}>
      <sphereGeometry args={[1, 96, 64]} />
    </mesh>
  )
}
