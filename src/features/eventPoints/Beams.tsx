import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { CylinderGeometry } from 'three'
import { createInstancedGeometry, syncInstanceCount, type EventInstanceData } from './eventInstanceData'
import { createBeamMaterial, syncBeamMaterial } from './materials/beamMaterial'

/** Open hexagonal tube from y = 0 to 1; the shader scales and orients it. */
const BEAM_TEMPLATE = new CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0)

export function Beams({ data }: { data: EventInstanceData }) {
  const geometry = useMemo(() => createInstancedGeometry(BEAM_TEMPLATE, data), [data])
  const material = useMemo(() => createBeamMaterial(), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame(({ clock }) => {
    syncInstanceCount(geometry, data)
    syncBeamMaterial(material, clock.elapsedTime)
  })

  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}
