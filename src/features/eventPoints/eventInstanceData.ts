import { DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, type BufferGeometry } from 'three'

/**
 * Per-instance attributes shared by the beams and base rings: one instance
 * per cluster (a single event is a cluster of one). useClusters writes them;
 * the two meshes read the same buffers.
 */
export type EventInstanceData = {
  capacity: number
  /** Number of live instances. */
  count: number
  /** Unit surface normal at the event. */
  direction: InstancedBufferAttribute
  /** Index into EVENT_CATEGORIES. */
  category: InstancedBufferAttribute
  /** [height from, height to, start time in s]: the shader eases between them. */
  growth: InstancedBufferAttribute
  /** Cluster member count. */
  members: InstancedBufferAttribute
  /** Bit 0 hovered, bit 1 selected. */
  state: InstancedBufferAttribute
}

export const STATE_HOVERED = 1
export const STATE_SELECTED = 2

export function createEventInstanceData(capacity: number): EventInstanceData {
  const attribute = (size: number) => new InstancedBufferAttribute(new Float32Array(capacity * size), size).setUsage(DynamicDrawUsage)
  return {
    capacity,
    count: 0,
    direction: attribute(3),
    category: attribute(1),
    growth: attribute(3),
    members: attribute(1),
    state: attribute(1),
  }
}

export function attachInstanceData(geometry: InstancedBufferGeometry, data: EventInstanceData): void {
  geometry.setAttribute('aDirection', data.direction)
  geometry.setAttribute('aCategory', data.category)
  geometry.setAttribute('aGrowth', data.growth)
  geometry.setAttribute('aMembers', data.members)
  geometry.setAttribute('aState', data.state)
  geometry.instanceCount = data.count
}

/** An instanced copy of a template geometry, wired to the shared instance data. */
export function createInstancedGeometry(template: BufferGeometry, data: EventInstanceData): InstancedBufferGeometry {
  const geometry = new InstancedBufferGeometry()
  geometry.setIndex(template.getIndex())
  geometry.setAttribute('position', template.getAttribute('position'))
  attachInstanceData(geometry, data)
  return geometry
}

/** Draw only the live instances. Call every frame. */
export function syncInstanceCount(geometry: InstancedBufferGeometry, data: EventInstanceData): void {
  geometry.instanceCount = data.count
}
