import { useControls } from 'leva'
import { bindSection } from './levaBinding'

/**
 * Live visual tuning values. Render loops read this object every frame, and
 * the leva panel writes into it through transient onChange handlers, so
 * slider drags never re-render React.
 */
export const visualConfig = {
  palette: {
    primary: '#35AAC1',
    highlight: '#E6FCFF',
  },
  core: {
    rimPower: 6,
    rimStrength: 1.4,
    scanlineOpacity: 0.08,
    scanlineDensity: 1.5,
    scanlineSpeed: 4,
    flicker: 0.05,
  },
  landmass: {
    size: 0.008,
    opacity: 0.85,
    backOpacity: 0.12,
    twinkle: 0.35,
  },
  graticule: {
    opacity: 0.07,
    backOpacity: 0.11,
  },
  atmosphere: {
    intensity: 0,
    power: 0,
    innerFade: 0,
  },
  /** Keyed by EventCategory. */
  eventColors: {
    conflict: '#FF4D5E',
    politics: '#B98CFF',
    disaster: '#FF9F40',
    economy: '#4DFFB8',
    science: '#3FE0FF',
    other: '#E6FCFF',
  },
  eventPoints: {
    beamWidth: 0.0022,
    clusterWidth: 1.8,
    intensity: 0.8,
    whiteness: 0.75,
    pinSize: 0.011,
    /** Pin size multiplier for clusters. */
    clusterPin: 1.35,
    backOpacity: 0.15,
    limbOpacity: 0.4,
    ringSize: 0.014,
    ringOpacity: 0.6,
    /** Screen radius within which beams merge into a cluster. */
    clusterRadiusPx: 36,
  },
  /** Pin (beam) heights in globe radii; changes re-cluster and animate. */
  pinHeights: {
    base: 0.025,
    perImportance: 0.11,
    clusterGrowth: 0.08,
    clusterMax: 0.26,
  },
  post: {
    bloomThreshold: 0.2,
    bloomIntensity: 1.2,
    bloomSmoothing: 0.3,
    bloomRadius: 0.6,
    chromaticOffset: 0.0008,
    noiseOpacity: 0.04,
  },
  motion: {
    /** Exponential damping rate (1/s) easing the globe towards its target. */
    damping: 16,
    /** While dragging, extrapolate the drag up to this far ahead (s) between input samples. */
    predictionLead: 0.08,
  },
}

/** Fixed at build time: changing them means rebuilding geometry. */
export const LAND_POINT_COUNT = 40_000
export const LAND_MASK_URL = '/land-mask.png'
export const GRATICULE_STEP_DEG = 15
export const ATMOSPHERE_RADIUS = 1.12
/** Vertical field of view in degrees. */
export const CAMERA_FOV = 45

/**
 * Render resolution budget. The hand tracker shares the GPU with the scene,
 * and MediaPipe waits on it every inference: rendering a Retina window at 2×
 * with 4× MSAA saturated the GPU and dropped tracking to ~2 fps. The pixel
 * ratio is therefore capped by total pixels, not just by a fixed ratio, so
 * big screens can't fall off the same cliff.
 */
export const RENDER_QUALITY = {
  maxDpr: 1.5,
  /** Device pixels the canvas may have in total (≈ a 1645×952 window at 1.5×). */
  pixelBudget: 3_600_000,
  multisampling: 2,
}

/** Registers every visualConfig value as a leva control. Mount once. */
export function useVisualConfigControls(): void {
  useControls('Palette', bindSection(visualConfig.palette), { collapsed: true })
  useControls(
    'Core sphere',
    bindSection(visualConfig.core, {
      rimPower: { min: 0.5, max: 6 },
      rimStrength: { min: 0, max: 4 },
      scanlineOpacity: { min: 0, max: 0.5 },
      scanlineDensity: { min: 0.1, max: 4 },
      scanlineSpeed: { min: 0, max: 20 },
      flicker: { min: 0, max: 0.5 },
    }),
    { collapsed: true },
  )
  useControls(
    'Landmass',
    bindSection(visualConfig.landmass, {
      size: { min: 0.002, max: 0.04, step: 0.001 },
      opacity: { min: 0, max: 1 },
      backOpacity: { min: 0, max: 1 },
      twinkle: { min: 0, max: 1 },
    }),
    { collapsed: true },
  )
  useControls(
    'Graticule',
    bindSection(visualConfig.graticule, {
      opacity: { min: 0, max: 0.5, step: 0.005 },
      backOpacity: { min: 0, max: 1 },
    }),
    { collapsed: true },
  )
  useControls(
    'Atmosphere',
    bindSection(visualConfig.atmosphere, {
      intensity: { min: 0, max: 3 },
      power: { min: 0, max: 6 },
      innerFade: { min: 0, max: 0.6 },
    }),
    { collapsed: true },
  )
  useControls('Event colours', bindSection(visualConfig.eventColors), { collapsed: true })
  useControls(
    'Event points',
    bindSection(visualConfig.eventPoints, {
      beamWidth: { min: 0.0005, max: 0.01, step: 0.0001 },
      clusterWidth: { min: 1, max: 4 },
      intensity: { min: 0, max: 3 },
      whiteness: { min: 0, max: 1 },
      pinSize: { min: 0.002, max: 0.04, step: 0.001 },
      clusterPin: { min: 1, max: 3 },
      backOpacity: { min: 0, max: 1 },
      limbOpacity: { min: 0, max: 1 },
      ringSize: { min: 0.002, max: 0.05, step: 0.001 },
      ringOpacity: { min: 0, max: 1 },
      clusterRadiusPx: { min: 0, max: 80, step: 1 },
    }),
    { collapsed: true },
  )
  useControls(
    'Pin heights',
    bindSection(visualConfig.pinHeights, {
      base: { min: 0, max: 0.2, step: 0.005 },
      perImportance: { min: 0, max: 1, step: 0.01 },
      clusterGrowth: { min: 0, max: 1, step: 0.01 },
      clusterMax: { min: 0.02, max: 1, step: 0.01 },
    }),
    { collapsed: true },
  )
  useControls(
    'Post',
    bindSection(visualConfig.post, {
      bloomThreshold: { min: 0, max: 1 },
      bloomIntensity: { min: 0, max: 4 },
      bloomSmoothing: { min: 0, max: 1 },
      bloomRadius: { min: 0, max: 1 },
      chromaticOffset: { min: 0, max: 0.01, step: 0.0001 },
      noiseOpacity: { min: 0, max: 0.3, step: 0.005 },
    }),
    { collapsed: true },
  )
  useControls(
    'Motion',
    bindSection(visualConfig.motion, { damping: { min: 1, max: 40 }, predictionLead: { min: 0, max: 0.2, step: 0.005 } }),
    { collapsed: true },
  )
}
