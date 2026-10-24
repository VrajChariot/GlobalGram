import { useMemo } from 'react'
import { useEventStore } from '../../store/eventStore'
import { BaseRings } from './BaseRings'
import { Beams } from './Beams'
import { Pins } from './Pins'
import { createEventInstanceData } from './eventInstanceData'
import { useClusters } from './useClusters'
import { useScreenCache } from './useScreenCache'

const MIN_CAPACITY = 2048

/** Mount inside the globe group so beams rotate with it. */
export function EventPoints() {
  const capacity = useEventStore((s) => Math.max(MIN_CAPACITY, s.events.length))
  const data = useMemo(() => createEventInstanceData(capacity), [capacity])
  useClusters(data)
  useScreenCache(data)

  return (
    <>
      <Beams data={data} />
      <BaseRings data={data} />
      <Pins data={data} />
    </>
  )
}
