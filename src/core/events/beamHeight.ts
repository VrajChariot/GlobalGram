export type BeamHeightParams = {
  /** Height of a zero-importance beam. */
  base: number
  /** Added height at importance 1. */
  perImportance: number
  /** Each doubling of a cluster's size adds this share of its tallest member's height. */
  clusterGrowth: number
  /** Clusters never stand taller than this. */
  clusterMax: number
}

export const DEFAULT_BEAM_HEIGHT: BeamHeightParams = {
  base: 0.03,
  perImportance: 0.25,
  clusterGrowth: 0.15,
  clusterMax: 0.34,
}

export function beamHeight(importance: number, params: BeamHeightParams = DEFAULT_BEAM_HEIGHT): number {
  return params.base + Math.min(1, Math.max(0, importance)) * params.perImportance
}

/** Clusters stand taller than their most important member, growing with log(count). */
export function clusterBeamHeight(
  maxImportance: number,
  count: number,
  params: BeamHeightParams = DEFAULT_BEAM_HEIGHT,
): number {
  const single = beamHeight(maxImportance, params)
  if (count <= 1) return single
  return Math.min(params.clusterMax, single * (1 + params.clusterGrowth * Math.log2(count)) + params.base / 2)
}
