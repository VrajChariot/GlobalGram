import { Suspense, useRef, type ReactNode } from 'react'
import { GLOBE_LIFT } from '../../shared/config/visualConfig'
import type { Group } from 'three'
import { Atmosphere } from './Atmosphere'
import { CoreSphere } from './CoreSphere'
import { Graticule } from './Graticule'
import { Landmass } from './Landmass'
import { ProjectionRing } from './ProjectionRing'
import { useIdleMotion } from './useIdleMotion'
import { useGlobeTransform } from './useGlobeTransform'

/**
 * The globe is rotated as a group (the projection ring below it stays put);
 * the camera only moves in and out.
 * Children (e.g. event points) are mounted inside the group so they rotate with it.
 */
export function GlobeScene({ children }: { children?: ReactNode }) {
  const group = useRef<Group>(null)
  useIdleMotion(group)
  useGlobeTransform(group)

  return (
    <>
      <ProjectionRing />
      <group ref={group} position-y={GLOBE_LIFT}>
        <Atmosphere />
        <CoreSphere />
        <Graticule />
        <Suspense fallback={null}>
          <Landmass />
        </Suspense>
        {children}
      </group>
    </>
  )
}
