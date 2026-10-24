import { Perf } from 'r3f-perf'
import { useDebugStore } from '../../store/debugStore'

/** r3f-perf overlay; lives inside the Canvas. */
export function PerfMonitor() {
  const enabled = useDebugStore((s) => s.enabled)
  return enabled ? <Perf position="bottom-left" /> : null
}
