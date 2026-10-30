import { useEffect, type RefObject } from 'react'
import { describeCameraError, WebcamStream } from '../../infrastructure/camera/WebcamStream'
import { useCameraStore } from '../../store/cameraStore'

/** The mirrored webcam feed. The video element is owned by the caller so hand tracking can read it. */
export function CameraLayer({ videoRef }: { videoRef: RefObject<HTMLVideoElement | null> }) {
  const wanted = useCameraStore((s) => s.status === 'starting' || s.status === 'live')

  useEffect(() => {
    const video = videoRef.current
    if (!video || !wanted) return
    const { setStatus } = useCameraStore.getState()
    const webcam = new WebcamStream()
    let active = true
    webcam.start(video).then(
      () => {
        if (active) setStatus('live')
      },
      (cause: unknown) => {
        if (active) setStatus('error', describeCameraError(cause))
      },
    )
    return () => {
      active = false
      webcam.stop()
    }
  }, [videoRef, wanted])

  return (
    <div className="absolute inset-0 bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full -scale-x-100 object-cover brightness-70"
      />
    </div>
  )
}
