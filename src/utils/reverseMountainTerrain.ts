import { ridgedFbm2D, valueNoise2D, type Vec3 } from './globeMath';

export const RM_GLOBE_CENTER = { u: 0.5, v: 0.5 } as const;
export const RM_GLOBE_SCALE = 0.02;
export const RM_LOCAL_EXTENT = 160; // +/- 3.20 world units around (0.5, 0.5)
export const RM_ANGULAR_MASK_RADIUS = 0.285; // 2.85 world units inner sphere blend clearing all 5 gorges

export const RM_MOUNTAIN_BASE_RADIUS = 132; // 2.64 world units from summit
export const RM_SUMMIT_RADIUS = 11.5; // 0.23 world units summit basin radius
export const RM_SUMMIT_WATER_Y = 58.0; // +1.16 world units above sea level
export const RM_CANAL_HALF_WIDTH = 3.8; // 0.076 world units (~10x Sunny width)
export const RM_OUTER_CURRENT_RADIUS = 205; // 4.10 world units (reaches Four Blues outside Calm Belt)

export type ReverseMountainCanalId =
  | 'east-blue'
  | 'north-blue'
  | 'west-blue'
  | 'south-blue'
  | 'grand-line'
  | 'summit';

export type ReverseMountainPhase =
  | 'approach'
  | 'climbing'
  | 'summit'
  | 'descending';

export interface ReverseMountainCanalDef {
  id: Exclude<ReverseMountainCanalId, 'summit'>;
  label: string;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  isDescent: boolean;
}

const SQRT1_2 = Math.SQRT1_2;

/**
 * The 5 iconic Reverse Mountain waterways in local tangent space (East=+X, South=+Z):
 * 4 diagonal entry canals climbing from the Four Blues to the summit (0, 0),
 * and 1 eastern exit chute descending down into Paradise / Grand Line.
 */
export const RM_CANALS: readonly ReverseMountainCanalDef[] = [
  {
    id: 'east-blue',
    label: 'Canal East Blue',
    startX: 145,
    startZ: -145,
    endX: 0,
    endZ: 0,
    isDescent: false,
  },
  {
    id: 'north-blue',
    label: 'Canal North Blue',
    startX: -145,
    startZ: -145,
    endX: 0,
    endZ: 0,
    isDescent: false,
  },
  {
    id: 'west-blue',
    label: 'Canal West Blue',
    startX: -145,
    startZ: 145,
    endX: 0,
    endZ: 0,
    isDescent: false,
  },
  {
    id: 'south-blue',
    label: 'Canal South Blue',
    startX: 145,
    startZ: 145,
    endX: 0,
    endZ: 0,
    isDescent: false,
  },
  {
    id: 'grand-line',
    label: 'Descente Grand Line',
    startX: 0,
    startZ: 0,
    endX: 126,
    endZ: 0,
    isDescent: true,
  },
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function distToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): { dist: number; t: number; cx: number; cz: number } {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-8) {
    return { dist: Math.hypot(px - ax, pz - az), t: 0, cx: ax, cz: az };
  }
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / lenSq, 0, 1);
  const cx = ax + dx * t;
  const cz = az + dz * t;
  return { dist: Math.hypot(px - cx, pz - cz), t, cx, cz };
}

/**
 * Canal half-width widens slightly near ocean mouths and inside the summit basin.
 */
export function getCanalHalfWidthAtRadius(r: number): number {
  const flareOuter = smoothstep(105, 165, r) * 3.4;
  const flareSummit = (1 - smoothstep(8, 22, r)) * 3.2;
  return RM_CANAL_HALF_WIDTH + flareOuter + flareSummit;
}

/**
 * Water surface height (in local units) as a function of radial distance from the summit.
 * Smooth S-curve climb from ocean level (r >= 132, y = 0) up to summit basin (r <= 11.5, y = 58).
 */
export function sampleReverseMountainClimbY(r: number, isGrandLineExit = false): number {
  const outerR = isGrandLineExit ? 120 : RM_MOUNTAIN_BASE_RADIUS;
  if (r >= outerR) return 0;
  if (r <= RM_SUMMIT_RADIUS) return RM_SUMMIT_WATER_Y;
  const t = clamp((outerR - r) / (outerR - RM_SUMMIT_RADIUS), 0, 1);
  return RM_SUMMIT_WATER_Y * (t * t * (3 - 2 * t));
}

export interface ReverseMountainSample {
  inCanalOrSummit: boolean;
  canalId: ReverseMountainCanalId | null;
  phase: ReverseMountainPhase | null;
  waterY: number;
  rockY: number;
  distToCenterline: number;
  halfWidth: number;
  flowX: number;
  flowZ: number;
}

/**
 * Samples full Reverse Mountain terrain, canal water elevation, canyon cliff rock height,
 * and current flow direction at local (lx, lz).
 */
export function sampleReverseMountainAt(
  lx: number,
  lz: number
): ReverseMountainSample {
  const r = Math.hypot(lx, lz);
  const halfW = getCanalHalfWidthAtRadius(r);

  // Check nearest canal segment
  let bestCanal: ReverseMountainCanalDef | null = null;
  let bestDist = Infinity;
  for (const canal of RM_CANALS) {
    const seg = distToSegment(
      lx,
      lz,
      canal.startX,
      canal.startZ,
      canal.endX,
      canal.endZ
    );
    if (seg.dist < bestDist) {
      bestDist = seg.dist;
      bestCanal = canal;
    }
  }

  const inSummit = r <= RM_SUMMIT_RADIUS + 1.5;
  const onCanal = bestCanal !== null && bestDist <= halfW;
  const inCanalOrSummit = inSummit || onCanal;

  // Water elevation
  const isExit = bestCanal?.id === 'grand-line';
  const waterY = sampleReverseMountainClimbY(r, isExit);

  // Determine current flow direction (unit tangent in local XZ)
  let flowX = 0;
  let flowZ = 0;
  let phase: ReverseMountainPhase | null = null;
  let canalId: ReverseMountainCanalId | null = null;

  if (inSummit) {
    canalId = 'summit';
    phase = 'summit';
    // At summit basin: swirl smoothly toward the eastern Grand Line exit (+X)
    // Tangential swirl + pull toward (RM_SUMMIT_RADIUS + 4, 0)
    const targetX = RM_SUMMIT_RADIUS + 6;
    const targetZ = 0;
    const toExitX = targetX - lx;
    const toExitZ = targetZ - lz;
    const toLen = Math.hypot(toExitX, toExitZ) || 1;
    // Slight clockwise/counter-clockwise orbital curl depending on side so boat curves smoothly around center
    const swirlSign = lz >= 0 ? -1 : 1;
    const tangX = (lz / Math.max(2, r)) * swirlSign;
    const tangZ = (-lx / Math.max(2, r)) * swirlSign;
    const blendCurve = r > 3.5 ? 0.32 : 0.0;
    const fx = toExitX / toLen + tangX * blendCurve;
    const fz = toExitZ / toLen + tangZ * blendCurve;
    const fl = Math.hypot(fx, fz) || 1;
    flowX = fx / fl;
    flowZ = fz / fl;
  } else if (bestCanal) {
    canalId = bestCanal.id;
    const cdx = bestCanal.endX - bestCanal.startX;
    const cdz = bestCanal.endZ - bestCanal.startZ;
    const clen = Math.hypot(cdx, cdz) || 1;
    flowX = cdx / clen;
    flowZ = cdz / clen;
    if (bestCanal.isDescent) {
      phase = r <= 122 ? 'descending' : 'approach';
    } else {
      phase = r <= RM_MOUNTAIN_BASE_RADIUS ? 'climbing' : 'approach';
    }
  }

  // Sculpted Red Line + Reverse Mountain rock elevation
  // 1. Base continuous Red Line corridor along N-S axis (|x| < 105)
  const redLineCorridor = 1 - smoothstep(84, 114, Math.abs(lx));
  const noiseMacro = ridgedFbm2D(lx * 0.018 + 3.1, lz * 0.018 + 1.7, 3);
  const noiseFine = valueNoise2D(lx * 0.065 + 7.4, lz * 0.065 + 2.3);
  const redLineBaseY = redLineCorridor * (36 + noiseMacro * 14 + noiseFine * 4);

  // 2. Central Reverse Mountain volcanic-crimson cone rising above Red Line
  const coneMask = 1 - smoothstep(55, 146, r);
  const angularLobe =
    0.88 +
    0.12 * Math.cos(Math.atan2(lz, lx) * 4 + Math.PI) + // 4 mountain buttresses between the 4 entry canals!
    0.08 * noiseMacro;
  const coneY = coneMask * (74 * angularLobe + noiseFine * 6);

  // 3. Raised steep crimson canyon walls flanking all 5 climbing/descending waterways
  const wallProximity = 1 - smoothstep(halfW + 3.2, halfW + 20, bestDist);
  const canyonWallTargetY =
    (r <= 135 ? waterY + 15.5 + noiseMacro * 8.0 : 4.5) * wallProximity;

  // 4. Blend rock height cleanly; carve bed below water inside canals & summit basin
  let rockY = Math.max(redLineBaseY, coneY, canyonWallTargetY);

  // Taper off rock height at outer ocean flanks (|x| > 110 outside canals)
  if (Math.abs(lx) > 105 && r > 125) {
    rockY *= 1 - smoothstep(105, 138, Math.abs(lx));
  }

  // Carve the 5 gorges + summit pool strictly open with crisp, smooth canyon walls
  const carveProfile = Math.min(
    smoothstep(RM_SUMMIT_RADIUS + 0.1, RM_SUMMIT_RADIUS + 4.2, r),
    smoothstep(halfW + 0.4, halfW + 3.4, bestDist)
  );
  const carvedBedY = waterY - 6.0;
  rockY = carvedBedY + (rockY - carvedBedY) * carveProfile;

  // Keep Grand Line eastern mouth open past x > 116 and sculpt Twin Cape promontory shelves on both extremities
  if (lx > 112.5 && Math.abs(lz) < 38) {
    const absZ = Math.abs(lz);
    const exitFade =
      smoothstep(114, 134, lx) * (1 - smoothstep(7, 15.5, absZ));
    rockY = rockY * (1 - exitFade) + -3.5 * exitFade;

    // Two symmetric Twin Cape rocky headland shelves at lx in [115.5, 121.4], |lz| in [8.4, 14.8]
    const capeXBand =
      smoothstep(113.6, 115.8, lx) * (1 - smoothstep(121.0, 123.2, lx));
    const capeZBand =
      smoothstep(7.2, 9.0, absZ) * (1 - smoothstep(14.4, 17.5, absZ));
    const capeShelfMask = capeXBand * capeZBand;
    rockY = rockY * (1 - capeShelfMask) + 5.5 * capeShelfMask;

    // Smoothly taper eastern Red Line cliffs into deep Paradise sea past lx > 121.4 (including Laboon cove)
    if (lx > 120.5) {
      const seaFade =
        smoothstep(120.5, 125.0, lx) * (1 - smoothstep(16.0, 36.0, absZ));
      rockY = rockY * (1 - seaFade) + -3.5 * seaFade;
    }
  }

  return {
    inCanalOrSummit,
    canalId,
    phase,
    waterY,
    rockY,
    distToCenterline: bestDist,
    halfWidth: halfW,
    flowX,
    flowZ,
  };
}

/**
 * Convenience height sampler matching other terrain modules:
 * returns max(water/land surface) or pure rock height.
 */
export function sampleReverseMountainHeight(lx: number, lz: number): number {
  const s = sampleReverseMountainAt(lx, lz);
  return Math.max(s.rockY, s.inCanalOrSummit ? s.waterY : -5);
}

/**
 * Converts local Reverse Mountain tangent coordinates (lx, ly, lz) into local curved sphere space
 * matching `orientOnSphere(group, 0.5, 0.5, globeRadius)` (where +X=East, +Y=Up, +Z=South).
 */
export function toReverseMountainSphereLocal(
  lx: number,
  ly: number,
  lz: number,
  globeRadius = 10
): Vec3 {
  const sx = lx * RM_GLOBE_SCALE;
  const sz = lz * RM_GLOBE_SCALE;
  const d2 = sx * sx + sz * sz;
  const sphereDrop = Math.sqrt(Math.max(0.1, globeRadius * globeRadius - d2));
  const radialScale = (globeRadius + ly * RM_GLOBE_SCALE) / globeRadius;
  return {
    x: sx * radialScale,
    y: sphereDrop * radialScale - globeRadius,
    z: sz * radialScale,
  };
}

/**
 * Projects a globe surface point onto Reverse Mountain local (lx, lz) if within domain,
 * returning null if outside Reverse Mountain's local footprint.
 */
export function worldToReverseMountainLocal(
  worldPos: Vec3,
  frame: { origin: Vec3; up: Vec3; east: Vec3; south: Vec3 }
): { lx: number; lz: number } | null {
  if (
    worldPos.x * frame.up.x +
      worldPos.y * frame.up.y +
      worldPos.z * frame.up.z <=
    0
  ) {
    return null;
  }
  const dx = worldPos.x - frame.origin.x;
  const dy = worldPos.y - frame.origin.y;
  const dz = worldPos.z - frame.origin.z;
  const sx = dx * frame.east.x + dy * frame.east.y + dz * frame.east.z;
  const sz = dx * frame.south.x + dy * frame.south.y + dz * frame.south.z;
  const lx = sx / RM_GLOBE_SCALE;
  const lz = sz / RM_GLOBE_SCALE;
  if (Math.hypot(lx, lz) > RM_OUTER_CURRENT_RADIUS + 8) {
    return null;
  }
  return { lx, lz };
}

export const RM_CAMERA_PRESETS = [
  {
    id: 'overview',
    label: 'Vue Montagne',
    x: 75,
    y: 255,
    z: 175,
    lookX: 0,
    lookY: 26,
    lookZ: 0,
  },
  {
    id: 'summit-basin',
    label: 'Sommet & Bassin',
    x: 24,
    y: 118,
    z: 32,
    lookX: 0,
    lookY: 56,
    lookZ: 0,
  },
  {
    id: 'east-blue-climb',
    label: 'Montée East Blue',
    x: 96,
    y: 54,
    z: -88,
    lookX: 25,
    lookY: 44,
    lookZ: -25,
  },
  {
    id: 'grand-line-descent',
    label: 'Descente Grand Line',
    x: 124,
    y: 54,
    z: 22,
    lookX: 24,
    lookY: 40,
    lookZ: 0,
  },
] as const;

export { SQRT1_2 };
