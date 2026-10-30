import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { RingGeometry } from 'three'
import { createInstancedGeometry, syncInstanceCount, type EventInstanceData } from './eventInstanceData'
import { createRingMaterial, syncRingMaterial } from './materials/ringMaterial'

/** Thin flat ring with outer radius 1; the shader places and sizes it. */
const RING_TEMPLATE = new RingGeometry(0.72, 1, 32)

export function BaseRings({ data }: { data: EventInstanceData }) {
  const geometry = useMemo(() => createInstancedGeometry(RING_TEMPLATE, data), [data])
  const material = useMemo(() => createRingMaterial(), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame(({ clock }) => {
    syncInstanceCount(geometry, data)
    syncRingMaterial(material, clock.elapsedTime)
  })

  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}
