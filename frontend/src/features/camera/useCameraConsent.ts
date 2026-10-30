import { useEffect } from 'react'
import { queryCameraPermission } from '../../infrastructure/camera/WebcamStream'
import { useCameraStore } from '../../store/cameraStore'

/** Skips the intro when the browser already granted the camera; otherwise asks first. */
export function useCameraConsent(): void {
  useEffect(() => {
    let cancelled = false
    void queryCameraPermission().then((permission) => {
      const { status, setStatus } = useCameraStore.getState()
      if (cancelled || status !== 'checking') return
      setStatus(permission === 'granted' ? 'starting' : 'undecided')
    })
    return () => {
      cancelled = true
    }
  }, [])
}
