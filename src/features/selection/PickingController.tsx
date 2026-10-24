import { usePointerPicking } from './usePointerPicking'

/** Hosts picking inside the Canvas render loop; renders nothing. */
export function PickingController() {
  usePointerPicking()
  return null
}
