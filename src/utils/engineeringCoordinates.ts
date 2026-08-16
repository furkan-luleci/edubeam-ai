/**
 * USER-FACING ENGINEERING CONVENTION
 *
 *              +z
 *               ^
 *               |
 *               +----> +x
 *
 * EduBeam/SVG internally uses positive vertical coordinates downward.
 * Keep that internal convention unchanged and convert only at
 * user-facing boundaries.
 */

export function engineeringZToEduBeam(
  z: number
): number {
  return -z;
}

export function eduBeamZToEngineering(
  z: number
): number {
  return -z;
}

export function engineeringFzToEduBeam(
  fz: number
): number {
  return -fz;
}

export function eduBeamFzToEngineering(
  fz: number
): number {
  return -fz;
}

/**
 * Element loads can be specified in:
 *
 * LCS = local member coordinate system
 * GCS = global coordinate system
 *
 * Only GLOBAL z should be reversed.
 * Local member z must retain EduBeam's existing LCS convention.
 */
export function engineeringElementFzToEduBeam(
  fz: number,
  lcs: boolean
): number {
  return lcs
    ? fz
    : engineeringFzToEduBeam(fz);
}

export function eduBeamElementFzToEngineering(
  fz: number,
  lcs: boolean
): number {
  return lcs
    ? fz
    : eduBeamFzToEngineering(fz);
}
