import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { CircleGeometry } from 'three'
import { createInstancedGeometry, syncInstanceCount, type EventInstanceData } from './eventInstanceData'
import { createPinMaterial, syncPinMaterial } from './materials/pinMaterial'

/** Pointy-top hexagon of radius 1; the shader billboards it at each beam tip. */
const PIN_TEMPLATE = new CircleGeometry(1, 6, Math.PI / 6)

export function Pins({ data }: { data: EventInstanceData }) {
  const geometry = useMemo(() => createInstancedGeometry(PIN_TEMPLATE, data), [data])
  const material = useMemo(() => createPinMaterial(), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame(({ clock }) => {
    syncInstanceCount(geometry, data)
    syncPinMaterial(material, clock.elapsedTime)
  })

  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}
