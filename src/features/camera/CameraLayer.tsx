import { useEffect, useState, type RefObject } from 'react'
import { describeCameraError, WebcamStream } from '../../infrastructure/camera/WebcamStream'

/** The mirrored webcam feed. The video element is owned by the caller so hand tracking can read it. */
export function CameraLayer({ videoRef }: { videoRef: RefObject<HTMLVideoElement | null> }) {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const webcam = new WebcamStream()
    webcam.start(video).catch((cause: unknown) => setError(describeCameraError(cause)))
    return () => webcam.stop()
  }, [videoRef])

  return (
    <div className="absolute inset-0 bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full -scale-x-100 object-cover brightness-70"
      />
      {error && (
        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded border border-cyan-300/40 bg-black/60 px-4 py-2 font-mono text-sm text-cyan-100">
          {error}
        </p>
      )}
    </div>
  )
}
