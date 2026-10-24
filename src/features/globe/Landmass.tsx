import { useFrame, useLoader } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { ImageLoader } from 'three'
import { sampleLandPoints } from '../../core/geo/landSampling'
import { LAND_MASK_URL, LAND_POINT_COUNT } from '../../shared/config/visualConfig'
import { createLandmassMaterial, syncLandmassMaterial } from './materials/landmassMaterial'
import { readLandMask } from './readLandMask'

export function Landmass() {
  const image = useLoader(ImageLoader, LAND_MASK_URL)
  const positions = useMemo(() => sampleLandPoints(readLandMask(image), LAND_POINT_COUNT), [image])
  const material = useMemo(() => createLandmassMaterial(), [])
  useEffect(() => () => material.dispose(), [material])
  useFrame(({ clock, gl }) => syncLandmassMaterial(material, clock.elapsedTime, gl.domElement.height))

  return (
    <points material={material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
    </points>
  )
}
