import { Suspense, useRef, type ReactNode } from 'react'
import type { Group } from 'three'
import { Atmosphere } from './Atmosphere'
import { CoreSphere } from './CoreSphere'
import { Graticule } from './Graticule'
import { Landmass } from './Landmass'
import { useGlobeTransform } from './useGlobeTransform'

/**
 * The globe is rotated as a group; the camera only moves in and out.
 * Children (e.g. event points) are mounted inside the group so they rotate with it.
 */
export function GlobeScene({ children }: { children?: ReactNode }) {
  const group = useRef<Group>(null)
  useGlobeTransform(group)

  return (
    <group ref={group}>
      <Atmosphere />
      <CoreSphere />
      <Graticule />
      <Suspense fallback={null}>
        <Landmass />
      </Suspense>
      {children}
    </group>
  )
}
