import { useMagneticPicking } from './useMagneticPicking'

/** Hosts picking inside the Canvas render loop; renders nothing. */
export function PickingController() {
  useMagneticPicking()
  return null
}
