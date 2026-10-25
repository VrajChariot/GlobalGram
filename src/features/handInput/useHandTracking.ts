import { useEffect, type RefObject } from 'react'
import { HAND_LOSS_MS } from '../../core/gestures/thresholds'
import { mirrorHand } from '../../core/hands/HandFrame'
import { computeHandFeatures, cursorPoint, pinchDistance, velocityBetween, type Point } from '../../core/hands/handFeatures'
import { assignHandSlots, type HandSlot } from '../../core/hands/handSlots'
import { interactionBoxScale, interactionBoxToView } from '../../core/hands/interactionBox'
import { HandLandmarkFilter } from '../../core/hands/oneEuroFilter'
import { INITIAL_PINCH, pinchProgress, stepPinch } from '../../core/hands/pinchDetector'
import { HandTrackerClient, type HandTrackerResult } from '../../infrastructure/handTracking/HandTrackerClient'
import { gestureConfig } from '../../shared/config/gestureConfig'
import { useGestureStore } from '../../store/gestureStore'
import { useHandStore } from '../../store/handStore'
import { useReplayStore } from '../../store/replayStore'

const FPS_WINDOW_MS = 1000

/**
 * Runs the hand pipeline: each new video frame goes to the worker (dropped if
 * it's busy); each result is mirrored, filtered, turned into features and a
 * viewport cursor, and published to the hand and gesture stores.
 */
export function useHandTracking(videoRef: RefObject<HTMLVideoElement | null>): void {
  useEffect(() => {
    const client = new HandTrackerClient()
    const filter = new HandLandmarkFilter()
    const store = useHandStore.getState()
    let cancelled = false
    let pinch = INITIAL_PINCH
    let slots: HandSlot[] = []
    let nextSlotId = 0
    let primaryId = -1
    let previousCursor: { point: Point; time: number } | null = null
    let lastSeenAt = 0
    const resultTimes: number[] = []

    const process = (result: HandTrackerResult) => {
      const now = performance.now()
      const video = videoRef.current
      const replay = useReplayStore.getState()
      const videoSize = replay.active ? replay.video : { width: video?.videoWidth || 1280, height: video?.videoHeight || 720 }
      const view = { width: window.innerWidth, height: window.innerHeight }
      const boxFraction = gestureConfig.interaction.boxFraction

      resultTimes.push(now)
      while (resultTimes[0] < now - FPS_WINDOW_MS) resultTimes.shift()
      store.setStats({ inferenceMs: result.inferenceMs, latencyMs: now - result.timestamp, fps: resultTimes.length })
      store.setFrame({ hands: result.hands, timestamp: result.timestamp })

      const raw = result.hands.map(mirrorHand)
      if (raw.length === 0) {
        // Hold the last state briefly so a dropped detection doesn't flicker the cursor.
        if (now - lastSeenAt < HAND_LOSS_MS) return
        if (useHandStore.getState().primary) {
          filter.retain([])
          slots = []
          primaryId = -1
          pinch = INITIAL_PINCH
          previousCursor = null
          store.setHands([], [], null, null, lastSeenAt)
          if (useGestureStore.getState().cursor?.source === 'hand') useGestureStore.getState().setCursor(null)
        }
        return
      }

      // Identity by wrist continuity, not MediaPipe's flickering Left/Right label.
      const assigned = assignHandSlots(raw, slots, nextSlotId)
      slots = assigned.slots
      nextSlotId = assigned.nextId
      const keys = assigned.ids.map(String)
      filter.retain(keys)

      // Filter in on-screen pixels, so the One Euro parameters act on the jitter the user sees.
      const scale = interactionBoxScale(videoSize, view, boxFraction)
      const t = result.timestamp / 1000
      const filtered = raw.map((hand, i) => filter.apply(hand, keys[i], t, gestureConfig.oneEuro, scale.x, scale.y))

      let primaryIndex = assigned.ids.indexOf(primaryId)
      if (primaryIndex < 0) {
        primaryIndex = 0
        primaryId = assigned.ids[0]
        pinch = INITIAL_PINCH
        previousCursor = null
      }
      const primary = filtered[primaryIndex]

      const aspect = videoSize.width / videoSize.height
      const toView = (p: Point) => interactionBoxToView(p.x, p.y, videoSize, view, boxFraction)
      // Positions come from filtered landmarks; pinch distance from raw ones, so quick taps aren't smoothed away.
      const features = { ...computeHandFeatures(primary, aspect), pinchDist: pinchDistance(raw[primaryIndex], aspect) }
      pinch = stepPinch(pinch, features.pinchDist, result.timestamp)
      const pinching = pinch.pinching
      const cursor = toView(cursorPoint(features, pinching))

      const secondaryIndex = filtered.findIndex((_, i) => i !== primaryIndex)
      const secondaryFeatures =
        secondaryIndex >= 0
          ? { ...computeHandFeatures(filtered[secondaryIndex], aspect), pinchDist: pinchDistance(raw[secondaryIndex], aspect) }
          : null
      const secondary = secondaryFeatures ? { features: secondaryFeatures, pinchPoint: toView(secondaryFeatures.pinchPoint) } : null
      const velocity = previousCursor
        ? velocityBetween(previousCursor.point, cursor, (result.timestamp - previousCursor.time) / 1000)
        : { x: 0, y: 0 }
      previousCursor = { point: cursor, time: result.timestamp }
      lastSeenAt = now

      store.setVideoSize(videoSize.width, videoSize.height)
      store.setHands(
        raw,
        filtered,
        { features, pinching, pinchProgress: pinchProgress(pinch, features.pinchDist), cursor, pinchPoint: toView(features.pinchPoint), velocity },
        secondary,
        now,
      )
      useGestureStore.getState().setCursor({ ...cursor, source: 'hand' })
    }

    // While a recording replays, its frames stand in for the camera's.
    client.onResult = (result) => {
      if (!useReplayStore.getState().active) process(result)
    }
    const stopReplayFeed = useReplayStore.subscribe((replay, previous) => {
      if (replay.frame && replay.frame !== previous.frame) process(replay.frame)
    })
    client.onError = (message) => console.warn('hand tracker:', message)
    store.setStatus('loading')
    client
      .init()
      .then(({ delegate, renderer }) => {
        if (!cancelled) store.setStatus('ready', delegate, renderer)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        console.error(error)
        store.setStatus('error', null, null, error instanceof Error ? error.message : String(error))
      })

    // One submission per new camera frame; rAF only until the video exists.
    const pump = () => {
      if (cancelled) return
      const video = videoRef.current
      const live = !useReplayStore.getState().active
      if (live && video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) void client.submit(video)
      if (video && 'requestVideoFrameCallback' in video) video.requestVideoFrameCallback(pump)
      else requestAnimationFrame(pump)
    }
    pump()

    return () => {
      cancelled = true
      stopReplayFeed()
      client.dispose()
      store.setStatus('idle')
      store.setHands([], [], null, null, 0)
    }
  }, [videoRef])
}
