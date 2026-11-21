import type { Vec3 } from './globeMath';

/**
 * Slightly raised global sea level above base GLOBE_RADIUS (10.0) so shorelines
 * meet ocean water cleanly and waves swell above deep coastal beds without
 * submerging harbor piers or low beaches.
 */
export const OCEAN_SEA_LEVEL_OFFSET = 0.00065;

export interface SphericalWaveTrain {
  readonly kx: number;
  readonly ky: number;
  readonly kz: number;
  readonly speed: number;
  readonly amp: number;
  readonly slopeGain: number;
}

/**
 * Broad planetary vertex swells (low spatial frequency <= 52 rad^-1 so a
 * 240x120 ocean sphere has zero vertex aliasing).
 */
export const OCEAN_VERTEX_SWELL_TRAINS: readonly SphericalWaveTrain[] = [
  { kx: 34, ky: 14, kz: 28, speed: 1.25, amp: 0.00016, slopeGain: 0.032 },
  { kx: -29, ky: 24, kz: 36, speed: 1.55, amp: 0.00011, slopeGain: 0.025 },
] as const;

/**
 * Ship-scale directional wave trains (wavelengths ~0.02 to ~0.15 world units,
 * matching 2x-18x Thousand Sunny hull length) shared between the ocean GLSL
 * shader and Sunny's physical buoyancy / pitch / roll solver.
 */
export const OCEAN_LOCAL_WAVE_TRAINS: readonly SphericalWaveTrain[] = [
  { kx: 310, ky: -195, kz: 245, speed: 2.15, amp: 0.00023, slopeGain: 0.125 },
  { kx: -480, ky: 520, kz: 390, speed: 2.85, amp: 0.00018, slopeGain: 0.12 },
  { kx: 980, ky: 740, kz: -1120, speed: 3.65, amp: 0.00011, slopeGain: 0.105 },
  { kx: -1650, ky: -1290, kz: 1740, speed: 4.55, amp: 0.00006, slopeGain: 0.09 },
] as const;

export interface OceanWaveSurfaceSample {
  /** Base sea-level rise + animated vertical wave height (world units). */
  seaLevelOffset: number;
  /** Animated wave displacement around mean sea level (world units). */
  waveHeight: number;
  /** Normalized crest intensity [0..1] for foam/wake response. */
  crestFactor: number;
  /** Wave slope along ship forward heading (radians, positive = bow lifts). */
  pitchSlope: number;
  /** Wave slope across ship starboard beam (radians, positive = heel right). */
  rollSlope: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function getEffectiveOceanRadius(globeRadius: number): number {
  return globeRadius + OCEAN_SEA_LEVEL_OFFSET;
}

export function computeUnderCloudWaveScale(underCloudRoughness: number): number {
  const r = clamp(underCloudRoughness, 0, 1);
  return 0.14 + Math.pow(r, 1.15) * 2.21;
}

/**
 * Evaluates the multi-directional ocean surface height, crest intensity, and
 * tangential pitch/roll slopes at a unit normal on the globe.
 * When `underCloudRoughness` [0..1] is provided, clear skies (0) yield a very
 * calm sea (0.14x swell) while gray/snow/rain/storm clouds escalate up to 2.35x.
 */
export function sampleOceanWaveSurface(
  unitPos: Vec3,
  elapsed: number,
  cloudCover = 0.8,
  calmBeltFactor = 0,
  heading?: Vec3,
  right?: Vec3,
  underCloudRoughness?: number
): OceanWaveSurfaceSample {
  const hasLocalRoughness = underCloudRoughness !== undefined;
  const rLocal = hasLocalRoughness ? clamp(underCloudRoughness, 0, 1) : 0;
  const weatherBoost = hasLocalRoughness
    ? computeUnderCloudWaveScale(rLocal)
    : 1 + clamp(cloudCover, 0, 1) * 0.45;
  const calmDamp = 1 - clamp(calmBeltFactor, 0, 1) * 0.92;
  const scale = weatherBoost * calmDamp;

  let waveHeight = 0;
  let maxAmp = 0;
  let gradX = 0;
  let gradY = 0;
  let gradZ = 0;

  const evalTrain = (w: SphericalWaveTrain) => {
    const phase =
      unitPos.x * w.kx +
      unitPos.y * w.ky +
      unitPos.z * w.kz -
      elapsed * w.speed;
    const s = Math.sin(phase);
    const c = Math.cos(phase);
    // Trochoidal sharpening: broader troughs, crisper crests
    const trochoid = s + 0.28 * (s * s - 0.5);
    waveHeight += trochoid * w.amp * scale;
    maxAmp += w.amp * scale;

    const kDotN = w.kx * unitPos.x + w.ky * unitPos.y + w.kz * unitPos.z;
    const kLen = Math.hypot(w.kx, w.ky, w.kz) || 1;
    const tx = (w.kx - unitPos.x * kDotN) / kLen;
    const ty = (w.ky - unitPos.y * kDotN) / kLen;
    const tz = (w.kz - unitPos.z * kDotN) / kLen;
    const dFactor = c * w.slopeGain * scale;
    gradX += tx * dFactor;
    gradY += ty * dFactor;
    gradZ += tz * dFactor;
  };

  for (const w of OCEAN_VERTEX_SWELL_TRAINS) {
    evalTrain(w);
  }
  for (const w of OCEAN_LOCAL_WAVE_TRAINS) {
    evalTrain(w);
  }

  const crestFactor =
    maxAmp > 1e-9 ? clamp(0.5 + (waveHeight / maxAmp) * 0.5, 0, 1) : 0.5;

  const maxPitch = hasLocalRoughness ? 0.095 + rLocal * 0.165 : 0.095;
  const maxRoll = hasLocalRoughness ? 0.075 + rLocal * 0.145 : 0.075;

  let pitchSlope = 0;
  let rollSlope = 0;
  if (heading) {
    pitchSlope = clamp(
      (gradX * heading.x + gradY * heading.y + gradZ * heading.z) * 0.48,
      -maxPitch,
      maxPitch
    );
  }
  if (right) {
    rollSlope = clamp(
      (gradX * right.x + gradY * right.y + gradZ * right.z) * 0.42,
      -maxRoll,
      maxRoll
    );
  }

  return {
    seaLevelOffset: OCEAN_SEA_LEVEL_OFFSET + waveHeight,
    waveHeight,
    crestFactor,
    pitchSlope,
    rollSlope,
  };
}
