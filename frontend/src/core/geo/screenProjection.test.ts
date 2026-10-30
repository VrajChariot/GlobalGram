import { describe, expect, it } from 'vitest'
import { facing, projectToScreen } from './screenProjection'

/** Camera at (0, 0, d) looking down −Z, 90° vertical fov, square aspect: column-major. */
function viewProjection(d: number, near = 0.1, far = 100): number[] {
  const f = 1 // 1 / tan(45°)
  const a = (far + near) / (near - far)
  const b = (2 * far * near) / (near - far)
  // P * translate(0, 0, -d)
  return [f, 0, 0, 0, 0, f, 0, 0, 0, 0, a, -1, 0, 0, a * -d + b, d]
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

describe('projectToScreen', () => {
  const out = new Float32Array(2)

  it('maps the view axis to the screen centre', () => {
    expect(projectToScreen(viewProjection(3), 0, 0, 0, 800, 600, out, 0)).toBe(true)
    expect([out[0], out[1]]).toEqual([400, 300])
  })

  it('puts +X right and +Y up (screen y grows downward)', () => {
    projectToScreen(viewProjection(2), 1, 1, 0, 800, 800, out, 0)
    expect(out[0]).toBeCloseTo(600)
    expect(out[1]).toBeCloseTo(200)
  })

  it('rejects points behind the camera', () => {
    expect(projectToScreen(viewProjection(2), 0, 0, 5, 800, 600, out, 0)).toBe(false)
  })
})

describe('facing', () => {
  const camera = [0, 0, 3]

  it('is positive on the near hemisphere and negative on the far one', () => {
    expect(facing(IDENTITY, camera, 0, 0, 1)).toBeCloseTo(1)
    expect(facing(IDENTITY, camera, 0, 0, -1)).toBeLessThan(0)
  })

  it('follows the model rotation', () => {
    // 180° about Y: model +Z ends up at world −Z.
    const turned = [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1]
    expect(facing(turned, camera, 0, 0, 1)).toBeLessThan(0)
    expect(facing(turned, camera, 0, 0, -1)).toBeCloseTo(1)
  })
})
