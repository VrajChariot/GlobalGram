const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 },
  },
}

/** One webcam session bound to a <video>. Safe to stop() before start() settles. */
export class WebcamStream {
  private stream: MediaStream | null = null
  private stopped = false

  async start(video: HTMLVideoElement): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS)
    if (this.stopped) {
      stopTracks(stream)
      return
    }
    this.stream = stream
    video.srcObject = stream
    await video.play()
  }

  stop(): void {
    this.stopped = true
    if (this.stream) stopTracks(this.stream)
    this.stream = null
  }
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop()
}

export function describeCameraError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Camera access was blocked. Allow it in the address bar and reload.'
    if (error.name === 'NotFoundError') return 'No camera found.'
    if (error.name === 'NotReadableError') return 'The camera is in use by another app.'
  }
  if (!window.isSecureContext) return 'The camera needs a secure context (https or localhost).'
  return 'Could not start the camera.'
}

/** Camera permission without prompting. 'unknown' where the Permissions API lacks `camera` (Firefox, Safari). */
export async function queryCameraPermission(): Promise<PermissionState | 'unknown'> {
  try {
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
    return result.state
  } catch {
    return 'unknown'
  }
}
