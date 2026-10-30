import { Canvas, useThree } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import { useAutoQuality } from '../features/quality/useAutoQuality'
import { useQualityStore } from '../store/qualityStore'
import { CameraLayer } from '../features/camera/CameraLayer'
import { CoachCaption } from '../features/coach/CoachCaption'
import { CameraIntro } from '../features/camera/CameraIntro'
import { HelpSheet } from '../features/help/HelpSheet'
import { useCameraConsent } from '../features/camera/useCameraConsent'
import { DebugOverlay } from '../features/debug/DebugOverlay'
import { PerfMonitor } from '../features/debug/PerfMonitor'
import { EventLabels } from '../features/eventPoints/EventLabels'
import { EventPoints } from '../features/eventPoints/EventPoints'
import { useEventFeed } from '../features/eventPoints/useEventFeed'
import { GlobeScene } from '../features/globe/GlobeScene'
import { useGestureController } from '../features/handInput/useGestureController'
import { useHandTracking } from '../features/handInput/useHandTracking'
import { useMouseFallback } from '../features/handInput/useMouseFallback'
import { InfoPanel } from '../features/infoPanel/InfoPanel'
import { Effects } from '../features/postprocessing/Effects'
import { PickingController } from '../features/selection/PickingController'
import { Reticle } from '../features/selection/Reticle'
import { clearSelection, selectHovered, selectHoveredByPinch } from '../features/selection/selectionActions'
import { MockEventSource } from '../infrastructure/events/MockEventSource'
import { CAMERA_FOV } from '../shared/config/visualConfig'
import { useRenderDpr } from './useRenderDpr'
import { useGlobeStore } from '../store/globeStore'

/** Composition root: the only place that picks a concrete EventSource. */
const eventSource = new MockEventSource()

/** Drive render loop at 30fps when in low-quality mode. */
function FrameRateCap() {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    const interval = setInterval(() => {
      invalidate()
    }, 33)
    return () => clearInterval(interval)
  }, [invalidate])
  return null
}

/** Three full-screen layers, back to front: webcam video, 3D canvas, DOM HUD. */
export function App() {
  const canvasLayer = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const dpr = useRenderDpr()
  const tier = useQualityStore((s) => s.tier)
  useCameraConsent()
  useEventFeed(eventSource)
  useHandTracking(video)
  useGestureController({ onSelect: selectHoveredByPinch, onOpenPalm: clearSelection })
  useMouseFallback(canvasLayer, { onTap: selectHovered, onEscape: clearSelection })
  useAutoQuality()

  return (
    <div className="fixed inset-0 overflow-clip bg-black select-none">
      <CameraLayer videoRef={video} />

      <div ref={canvasLayer} className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing">
        <Canvas
          gl={{ alpha: true, antialias: true }}
          dpr={dpr}
          flat
          frameloop={tier === 'low' ? 'demand' : 'always'}
          camera={{ position: [0, 0, useGlobeStore.getState().distance], fov: CAMERA_FOV, near: 0.1, far: 50 }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          {tier === 'low' && <FrameRateCap />}
          <GlobeScene>
            <EventPoints />
          </GlobeScene>
          <PickingController />
          <Effects />
          <PerfMonitor />
        </Canvas>
      </div>

      <div className="pointer-events-none absolute inset-0">
        <EventLabels />
        <InfoPanel onClose={clearSelection} />
        <CameraIntro />
        <Reticle />
        <CoachCaption />
        <HelpSheet />
        <DebugOverlay />
      </div>
    </div>
  )
}
