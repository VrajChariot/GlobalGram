import { useCameraStore } from '../../store/cameraStore'

/** First-visit explainer shown before the browser's camera prompt. */
export function CameraIntro() {
  const undecided = useCameraStore((s) => s.status === 'undecided')
  const setStatus = useCameraStore((s) => s.setStatus)
  if (!undecided) return null

  return (
    <section
      aria-labelledby="intro-title"
      className="pointer-events-auto absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-[6vw] pt-24 pb-[8vh]"
    >
      <div className="max-w-[28rem] text-light">
        <h1 id="intro-title" className="text-4xl leading-[1.05] font-bold tracking-[-0.02em] sm:text-5xl">
          Turn the world with your hands
        </h1>
        <p className="mt-4 text-base leading-[1.55] text-haze">
          GlobalGram follows your hands through your camera so you can spin the globe, zoom in and open events by pinching the air.
          The video is processed on this device and never leaves it.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => setStatus('starting')}
            className="h-11 rounded-lg bg-light px-5 font-semibold text-[#04101A]"
          >
            Turn on camera
          </button>
          <button
            type="button"
            onClick={() => setStatus('off')}
            className="h-11 rounded-lg border border-hairline px-5 font-medium text-light hover:bg-white/10"
          >
            Use mouse only
          </button>
        </div>
        <p className="mt-4 text-sm text-haze">You can turn the camera on later from Gestures.</p>
      </div>
    </section>
  )
}
