import { useEffect, useRef } from 'react'
import { HAND_CONNECTIONS, type TrackedHand } from '../../core/hands/HandFrame'
import { interactionBox, videoToView, type Size } from '../../core/hands/interactionBox'
import { gestureConfig } from '../../shared/config/gestureConfig'
import { useHandStore } from '../../store/handStore'

const RAW_COLOUR = 'rgba(180, 180, 180, 0.8)'
const FILTERED_COLOUR = '#3FE0FF'

/** Raw (grey) and filtered (cyan) hand skeletons drawn over the video, plus the interaction box. */
export function LandmarkSkeleton() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    let frame = 0

    const draw = () => {
      frame = requestAnimationFrame(draw)
      const dpr = window.devicePixelRatio || 1
      const view = { width: window.innerWidth, height: window.innerHeight }
      if (canvas.width !== Math.round(view.width * dpr) || canvas.height !== Math.round(view.height * dpr)) {
        canvas.width = Math.round(view.width * dpr)
        canvas.height = Math.round(view.height * dpr)
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, view.width, view.height)

      const { raw, filtered, primary, videoWidth, videoHeight } = useHandStore.getState()
      const video = { width: videoWidth, height: videoHeight }

      const box = interactionBox(video, view, gestureConfig.interaction.boxFraction)
      const topLeft = videoToView(box.x0, box.y0, video, view)
      const bottomRight = videoToView(box.x1, box.y1, video, view)
      context.setLineDash([6, 6])
      context.strokeStyle = 'rgba(63, 224, 255, 0.35)'
      context.lineWidth = 1
      context.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
      context.setLineDash([])

      for (const hand of raw) drawHand(context, hand, video, view, RAW_COLOUR, 1)
      for (const hand of filtered) drawHand(context, hand, video, view, FILTERED_COLOUR, 2)

      if (primary) {
        context.fillStyle = primary.pinching ? '#FFFFFF' : FILTERED_COLOUR
        context.beginPath()
        context.arc(primary.cursor.x, primary.cursor.y, 4, 0, Math.PI * 2)
        context.fill()
      }
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
}

function drawHand(context: CanvasRenderingContext2D, hand: TrackedHand, video: Size, view: Size, colour: string, width: number): void {
  const points = hand.landmarks.map((l) => videoToView(l.x, l.y, video, view))
  context.strokeStyle = colour
  context.fillStyle = colour
  context.lineWidth = width
  context.beginPath()
  for (const [a, b] of HAND_CONNECTIONS) {
    context.moveTo(points[a].x, points[a].y)
    context.lineTo(points[b].x, points[b].y)
  }
  context.stroke()
  for (const p of points) {
    context.beginPath()
    context.arc(p.x, p.y, width + 1, 0, Math.PI * 2)
    context.fill()
  }
}
