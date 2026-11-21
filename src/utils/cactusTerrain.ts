import { valueNoise2D } from './globeMath';

export const CACTUS_WORLD_SIZE = 220;
export const CACTUS_GLOBE_SCALE = 0.002;
export const CACTUS_GLOBE_CENTER = { u: 0.556, v: 0.505 } as const;
/**
 * Kept cleanly at 0.025 rad (+ 0.014 blend) so Cactus Island never overlaps
 * Twin Cape (~0.111 rad), Little Garden (~0.106 rad), or Kyuka Island (~0.115 rad).
 */
export const CACTUS_ANGULAR_MASK_RADIUS = 0.025;
/**
 * Aligns Cactus Island's coastal beaches & central bay waterline cleanly with
 * the globe's ocean surface mesh near the equator.
 */
export const CACTUS_SPHERE_SEA_OFFSET = -1.15;

export const CACTUS_SHORE_Y = 1.45;
export const CACTUS_VILLAGE_Y = 2.45;
export const CACTUS_PLATEAU_Y = 4.95;

export interface CactusLobeSpec {
  /** Offset from giant cactus center (x, y, z) in local island meters. */
  ox: number;
  oy: number;
  oz: number;
  rx: number;
  ry: number;
  rz: number;
  ribs: number;
  /** Slight tilt yaw/pitch so arm chains angle naturally upward/outward. */
  yaw: number;
  tiltZ: number;
}

export interface CactusGiantSpec {
  id:
    | 'cactus-w-main'
    | 'cactus-e-main'
    | 'cactus-nw'
    | 'cactus-ne'
    | 'cactus-sw'
    | 'cactus-se';
  x: number;
  z: number;
  /** Y center of the cactus dome ellipsoid (placed <= local ground so dome is half-buried). */
  centerY: number;
  /** Local terrain elevation at (x, z) for burial & cross grounding checks. */
  groundY: number;
  domeRx: number;
  domeRy: number;
  domeRz: number;
  ribs: number;
  ribDepth: number;
  yaw: number;
  lobes: readonly CactusLobeSpec[];
}

export interface CactusCrossSpec {
  id: string;
  giantId: CactusGiantSpec['id'];
  x: number;
  y: number;
  z: number;
  /** Outward surface normal blended slightly upward so cross juts cleanly from cactus surface. */
  nx: number;
  ny: number;
  nz: number;
  scale: number;
  roll: number;
  woodTint: number;
}

export interface CactusBuildingSpec {
  id: string;
  name: string;
  shore: 'west' | 'east';
  kind: 'house' | 'tavern' | 'cupola-hall' | 'storehouse';
  x: number;
  z: number;
  y: number;
  width: number;
  depth: number;
  tiers: 1 | 2 | 3;
  baseHeight: number;
  yaw: number;
  wallColor: number;
  trimColor: number;
  hasLadder: boolean;
  hasAwning: boolean;
}

export interface CactusRockPropSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  yaw: number;
  tint: number;
}

export interface CactusCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function distToSegment2D(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-8) return Math.hypot(px - ax, pz - az);
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / lenSq, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

function distToPolyline2D(
  px: number,
  pz: number,
  pts: readonly [number, number][]
): number {
  let minD = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distToSegment2D(
      px,
      pz,
      pts[i][0],
      pts[i][1],
      pts[i + 1][0],
      pts[i + 1][1]
    );
    if (d < minD) minD = d;
  }
  return minD;
}

/**
 * Sinuous centerline of Whisky Peak's central southern bay/harbor inlet.
 * Runs from the inner bay head (z ≈ -20) south out into open ocean (z > +64).
 */
export function cactusBayCenterX(z: number): number {
  return (
    -1.2 +
    Math.sin(z * 0.055 + 0.4) * 2.1 -
    smoothstep(28, 68, z) * 2.4
  );
}

/** Half-width of the central bay water channel at local Z. */
export function cactusBayHalfWidth(z: number): number {
  if (z < -20) {
    const t = clamp((z + 30) / 10, 0, 1);
    return 10.5 * t;
  }
  if (z <= 30) {
    // Broad inner harbor lined by West and East villages
    return 11.8 + Math.sin(((z + 20) / 50) * Math.PI) * 2.2;
  }
  if (z <= 58) {
    // Narrows slightly near the southern rocky promontories (matching Image 1)
    const t = (z - 30) / 28;
    return 11.8 - t * 2.1;
  }
  // Opens wide into the Paradise Sea south of z = 58
  return 9.7 + smoothstep(58, 76, z) * 28.0;
}

/**
 * Signed distance to the navigable bay inlet water (< 0 inside water, > 0 on land).
 */
export function cactusBaySignedDist(x: number, z: number): number {
  if (z < -25.5) {
    // Rounded semicircular north bay head at (-1.5, -20.5)
    const headDist = Math.hypot((x + 1.5) / 10.6, (z + 20.5) / 8.5);
    return (headDist - 1.0) * 9.5;
  }
  const cx = cactusBayCenterX(z);
  const hw = cactusBayHalfWidth(z);
  const shoreWiggle = (valueNoise2D(x * 0.14 + 2.1, z * 0.14 - 1.7) - 0.5) * 1.45;
  const latDist = Math.abs(x - cx) - (hw + shoreWiggle);
  if (z < -16) {
    const headDx = (x + 1.5) / 10.8;
    const headDz = (z + 20.5) / 9.2;
    const capDist = (Math.hypot(headDx, headDz) - 1.0) * 9.5;
    const blend = smoothstep(-25.5, -16.0, z);
    return capDist * (1 - blend) + latDist * blend;
  }
  return latDist;
}

/**
 * Smooth horseshoe coastline mask matching Whisky Peak's map silhouette (Image 1):
 * - 1.0 deep inland across the horseshoe plateau & village shores
 * - 0.0 in the outer ocean and carved deep inside the southern central bay
 */
export function sampleCactusCoastMask(x: number, z: number): number {
  // Slightly wider horseshoe ellipse (~152m across, ~128m N-S)
  const rx = 74.0;
  const rz = 63.0;
  const baseEll = Math.hypot(x / rx, (z + 1.5) / rz);

  const ang = Math.atan2(z, x);
  const cliffHarmonic =
    Math.sin(ang * 3.0 + 0.4) * 0.045 +
    Math.cos(ang * 5.0 - 0.9) * 0.028 +
    Math.sin(ang * 8.0 + 1.2) * 0.015;
  const edgeNoise =
    (valueNoise2D(x * 0.065 + 3.8, z * 0.065 - 2.9) - 0.5) * 0.095 +
    (valueNoise2D(x * 0.16 - 1.4, z * 0.16 + 5.3) - 0.5) * 0.04;

  let core = 1 - smoothstep(0.68, 1.02, baseEll - cliffHarmonic);
  const rimBand = smoothstep(0.06, 0.44, core) * (1 - smoothstep(0.68, 0.94, core));
  let mask = clamp(core + edgeNoise * rimBand, 0, 1);

  // Carve the central bay water opening cleanly to the South (+Z)
  const baySd = cactusBaySignedDist(x, z);
  const bayWater = 1 - smoothstep(-3.8, 3.2, baySd);
  mask *= 1 - bayWater * 0.98;

  // Smooth zero fade toward the 220m mesh outer bounds
  const outerFade = 1 - smoothstep(0.84, 1.0, Math.hypot(x / 88.0, z / 76.0));
  mask *= outerFade;

  return clamp(mask, 0, 1);
}

// Winding village road polylines matching Image 1
export const CACTUS_WEST_RIVER_ROAD: readonly [number, number][] = [
  [-18.8, -14.0],
  [-17.2, -2.0],
  [-19.6, 12.0],
  [-19.2, 26.0],
  [-21.2, 39.5],
];

export const CACTUS_WEST_INNER_ROAD: readonly [number, number][] = [
  [-22.2, -12.0],
  [-23.5, 2.0],
  [-23.6, 15.0],
  [-22.8, 29.0],
  [-21.2, 39.5],
];

export const CACTUS_EAST_RIVER_ROAD: readonly [number, number][] = [
  [16.8, -15.5],
  [18.0, -1.0],
  [17.8, 14.5],
  [18.8, 30.0],
  [20.5, 43.5],
];

export const CACTUS_EAST_INNER_ROAD: readonly [number, number][] = [
  [21.6, -14.5],
  [23.2, 0.0],
  [22.4, 14.5],
  [23.8, 31.0],
  [23.2, 44.0],
];

export const CACTUS_CROSS_ROADS: readonly (readonly [number, number][])[] = [
  // West cross lanes & cactus hill spur
  [[-23.5, -2.0], [-17.2, -2.0]],
  [[-23.6, 13.5], [-19.6, 12.0]],
  [[-22.8, 27.5], [-19.2, 26.0]],
  [[-23.6, 13.5], [-31.0, 11.5]],
  // East cross lanes, tavern plaza apron & NE/E cactus trails
  [[18.0, -4.0], [23.2, -3.5]],
  [[17.8, 14.5], [22.4, 14.5]],
  [[18.8, 28.5], [23.8, 28.5]],
  [[20.5, 43.5], [23.2, 44.0]],
  [[22.4, 14.5], [29.8, 8.5]],
  [[21.6, -14.5], [25.8, -23.0]],
];

/**
 * Signed distance to the nearest village path/plaza (< 0 inside roadbed, > 0 outside).
 */
export function cactusRoadSignedDist(x: number, z: number): number {
  const halfWidth = 1.25;
  let d = distToPolyline2D(x, z, CACTUS_WEST_RIVER_ROAD);
  d = Math.min(d, distToPolyline2D(x, z, CACTUS_WEST_INNER_ROAD));
  d = Math.min(d, distToPolyline2D(x, z, CACTUS_EAST_RIVER_ROAD));
  d = Math.min(d, distToPolyline2D(x, z, CACTUS_EAST_INNER_ROAD));
  for (const seg of CACTUS_CROSS_ROADS) {
    d = Math.min(d, distToPolyline2D(x, z, seg));
  }
  // Baroque Works Tavern plaza widenings around (19.8, 14.5)
  const plazaDist = Math.hypot((x - 19.8) / 3.1, (z - 14.5) / 4.2) * 2.4;
  d = Math.min(d, plazaDist);
  return d - halfWidth;
}

/**
 * Normalized footprint factor inside the West or East sandy village zones (0..1).
 */
export function sampleCactusVillageMask(x: number, z: number): number {
  const baySd = cactusBaySignedDist(x, z);
  if (baySd < 0.2) return 0;

  // West village band flanking the west shore of the bay
  const westLat = smoothstep(0.3, 2.2, baySd) * (1 - smoothstep(14.5, 19.5, baySd));
  const westZ = smoothstep(-21.0, -14.0, z) * (1 - smoothstep(39.0, 46.0, z));
  const westMask = x < 0 ? westLat * westZ : 0;

  // East village band flanking the east shore of the bay
  const eastLat = smoothstep(0.3, 2.2, baySd) * (1 - smoothstep(16.0, 21.5, baySd));
  const eastZ = smoothstep(-22.0, -15.0, z) * (1 - smoothstep(44.0, 52.0, z));
  const eastMask = x > 0 ? eastLat * eastZ : 0;

  return clamp(Math.max(westMask, eastMask), 0, 1);
}

const CACTUS_DOME_BASES: readonly {
  id: CactusGiantSpec['id'];
  x: number;
  z: number;
  domeRx: number;
  domeRy: number;
  domeRz: number;
  embedFraction: number;
  ribs: number;
  ribDepth: number;
  yaw: number;
}[] = [
  {
    id: 'cactus-w-main',
    x: -44.5,
    z: 8.5,
    domeRx: 14.5,
    domeRy: 21.0,
    domeRz: 14.5,
    embedFraction: 0.48,
    ribs: 24,
    ribDepth: 0.78,
    yaw: 0.2,
  },
  {
    id: 'cactus-e-main',
    x: 44.5,
    z: 10.5,
    domeRx: 15.0,
    domeRy: 21.5,
    domeRz: 15.0,
    embedFraction: 0.48,
    ribs: 24,
    ribDepth: 0.8,
    yaw: -0.35,
  },
  {
    id: 'cactus-nw',
    x: -29.5,
    z: -36.5,
    domeRx: 12.0,
    domeRy: 17.5,
    domeRz: 12.0,
    embedFraction: 0.48,
    ribs: 20,
    ribDepth: 0.68,
    yaw: 0.55,
  },
  {
    id: 'cactus-ne',
    x: 26.5,
    z: -36.0,
    domeRx: 12.2,
    domeRy: 17.8,
    domeRz: 12.2,
    embedFraction: 0.48,
    ribs: 20,
    ribDepth: 0.68,
    yaw: -0.45,
  },
  {
    id: 'cactus-sw',
    x: -28.0,
    z: 43.0,
    domeRx: 7.8,
    domeRy: 11.8,
    domeRz: 7.8,
    embedFraction: 0.48,
    ribs: 16,
    ribDepth: 0.45,
    yaw: 0.15,
  },
  {
    id: 'cactus-se',
    x: 33.8,
    z: 42.5,
    domeRx: 8.4,
    domeRy: 12.5,
    domeRz: 8.4,
    embedFraction: 0.48,
    ribs: 18,
    ribDepth: 0.48,
    yaw: -0.25,
  },
];

/**
 * Full procedural terrain elevation map for Cactus Island (Whisky Peak):
 * - Underwater sea & central bay inlet: -5.6m
 * - Sandy bay beaches: +1.35m -> +2.1m
 * - Twin Village Shore Terraces (West & East): +2.35m -> +3.1m
 * - Curved Inner Bay-Head Brown Cliff Wall (north of bay): +6.5m -> +9.8m
 * - Ochre Desert Plateau with rocky ridges & cactus earthen skirts: +4.8m -> +7.4m
 * - Outer Stepped Brown Perimeter Cliffs: +8.2m -> +12.4m
 */
export function sampleCactusHeight(x: number, z: number): number {
  const coast = sampleCactusCoastMask(x, z);
  const baseSea = -5.6 + (valueNoise2D(x * 0.08, z * 0.08) - 0.5) * 0.22;
  if (coast <= 0.01) return baseSea;

  const baySd = cactusBaySignedDist(x, z);
  const isBayCoast = baySd < 14.0 && z > -29.0;

  // Outer ocean shoreline rises steeply to tiered brown cliffs; inner bay shoreline slopes smoothly to sandy village beaches
  const subT = smoothstep(0.02, 0.22, coast);
  const shoreT = smoothstep(0.18, 0.40, coast);
  const plateauT = smoothstep(0.28, 0.60, coast);
  let h = baseSea + subT * 5.2 + shoreT * 2.45 + plateauT * 3.15; // -5.6 -> -0.4 -> +2.05 -> +5.2

  // Outer stepped brown perimeter cliffs around West, North, and East oceanside coasts (Image 1 & 2)
  const outerCliffBand =
    smoothstep(0.20, 0.42, coast) * (1 - smoothstep(0.72, 0.92, coast));
  const southMouthSuppress = smoothstep(40.0, 58.0, z) * (1 - smoothstep(14.0, 30.0, Math.abs(x)));
  const outerCliffStrength = outerCliffBand * (1 - southMouthSuppress) * (isBayCoast ? smoothstep(6.0, 14.5, baySd) : 1);
  const cragNoise =
    valueNoise2D(x * 0.11 + 4.2, z * 0.11 - 1.9) * 2.8 +
    valueNoise2D(x * 0.23 - 2.1, z * 0.23 + 3.4) * 1.3;
  // Quantize subtly into geological rock steps
  const steppedCliff = Math.round((5.8 + cragNoise) * 1.4) / 1.4;
  h += outerCliffStrength * steppedCliff;

  // Inner curved brown cliff ridge wrapping the North head of the central bay (Image 1)
  const bayHeadEll = Math.hypot((x + 1.0) / 21.5, (z + 25.5) / 9.2);
  const innerCliffMask =
    smoothstep(0.45, 0.85, bayHeadEll) *
    (1 - smoothstep(1.05, 1.38, bayHeadEll)) *
    (z < -16.5 ? 1 : 0);
  if (innerCliffMask > 0.01) {
    h += innerCliffMask * (3.6 + valueNoise2D(x * 0.18, z * 0.18) * 1.6);
  }

  // Natural rocky ridges & ochre desert plateau relief
  const ridgeA = valueNoise2D(x * 0.055 + 1.3, z * 0.055 - 4.1);
  const ridgeB = valueNoise2D(x * 0.13 - 3.7, z * 0.13 + 2.2);
  const inlandMask = smoothstep(0.58, 0.88, coast);
  h += (ridgeA * 1.9 + ridgeB * 0.85 - 0.65) * inlandMask;

  // Gentle earthen skirts around the 6 giant cacti so their lower half sits deeply rooted in rising desert earth
  for (const c of CACTUS_DOME_BASES) {
    const dNorm = Math.hypot((x - c.x) / (c.domeRx * 1.24), (z - c.z) / (c.domeRz * 1.24));
    if (dNorm < 1.0 && coast > 0.45) {
      const moundT = 1 - smoothstep(0.35, 1.0, dNorm);
      h = Math.max(h, CACTUS_PLATEAU_Y + 0.55) + moundT * 1.35;
    }
  }

  // Smooth West & East sandy village terraces overlooking the bay
  const villageMask = sampleCactusVillageMask(x, z);
  if (villageMask > 0.01 && coast > 0.25) {
    const bankDist = clamp((baySd - 0.5) / 13.0, 0, 1);
    const villageTargetH = CACTUS_VILLAGE_Y - 0.55 + bankDist * 1.15 + (ridgeB - 0.5) * 0.12;
    h = h * (1 - villageMask * 0.92) + villageTargetH * (villageMask * 0.92);
  }

  // Smooth walkable grading along village roads & plaza
  const rDist = cactusRoadSignedDist(x, z);
  if (rDist < 1.5 && baySd > 0.8 && coast > 0.42) {
    const rT = 1 - smoothstep(-0.2, 1.5, rDist);
    const roadGrade = clamp(h, CACTUS_VILLAGE_Y - 0.1, CACTUS_PLATEAU_Y + 1.2);
    h = h * (1 - rT * 0.65) + roadGrade * (rT * 0.65);
  }

  return h;
}

export function sampleCactusWalkSurfaceHeight(x: number, z: number): number {
  return Math.max(sampleCactusHeight(x, z), CACTUS_SHORE_Y);
}

/**
 * Evaluates a point & outward normal on a giant cactus dome ellipsoid with fluted vertical ribs.
 * Shared identically by the 3D cactus mesh generator and wooden cross placement math so every
 * cross sits flush ON the cactus skin.
 */
export function sampleCactusDomeSurface(
  giant: Pick<CactusGiantSpec, 'x' | 'centerY' | 'z' | 'domeRx' | 'domeRy' | 'domeRz' | 'ribs' | 'ribDepth' | 'yaw'>,
  theta: number,
  phi: number
): { x: number; y: number; z: number; nx: number; ny: number; nz: number } {
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const cosT = Math.cos(theta + giant.yaw);
  const sinT = Math.sin(theta + giant.yaw);

  // Fluted barrel-cactus vertical ribs (pronounced along equator, tapering smoothly to crown apex)
  const ribWave = Math.pow(0.5 + 0.5 * Math.cos(theta * giant.ribs), 1.65);
  const ribEnv = Math.pow(cosPhi, 0.45);
  const rBoost = 1 + (giant.ribDepth * ribWave * ribEnv) / giant.domeRx;

  const lx = giant.domeRx * rBoost * cosPhi * cosT;
  const ly = giant.domeRy * sinPhi;
  const lz = giant.domeRz * rBoost * cosPhi * sinT;

  // Approximate ellipsoid outward normal
  const nxRaw = lx / (giant.domeRx * giant.domeRx);
  const nyRaw = ly / (giant.domeRy * giant.domeRy);
  const nzRaw = lz / (giant.domeRz * giant.domeRz);
  const nLen = Math.hypot(nxRaw, nyRaw, nzRaw) || 1;

  return {
    x: giant.x + lx,
    y: giant.centerY + ly,
    z: giant.z + lz,
    nx: nxRaw / nLen,
    ny: nyRaw / nLen,
    nz: nzRaw / nLen,
  };
}

/**
 * Evaluates a point & outward normal on a stacked ovoid cactus arm lobe.
 */
export function sampleCactusLobeSurface(
  giant: Pick<CactusGiantSpec, 'x' | 'centerY' | 'z'>,
  lobe: CactusLobeSpec,
  theta: number,
  phi: number
): { x: number; y: number; z: number; nx: number; ny: number; nz: number } {
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const ribWave = Math.pow(0.5 + 0.5 * Math.cos(theta * lobe.ribs), 1.5);
  const rBoost = 1 + 0.048 * ribWave * cosPhi;

  const px = lobe.rx * rBoost * cosPhi * Math.cos(theta);
  const py = lobe.ry * sinPhi;
  const pz = lobe.rz * rBoost * cosPhi * Math.sin(theta);

  // Rotate around Z by tiltZ, then around Y by yaw
  const ct = Math.cos(lobe.tiltZ);
  const st = Math.sin(lobe.tiltZ);
  const rx1 = px * ct - py * st;
  const ry1 = px * st + py * ct;
  const rz1 = pz;

  const cy = Math.cos(lobe.yaw);
  const sy = Math.sin(lobe.yaw);
  const wx = rx1 * cy + rz1 * sy;
  const wy = ry1;
  const wz = -rx1 * sy + rz1 * cy;

  const nx0 = px / (lobe.rx * lobe.rx);
  const ny0 = py / (lobe.ry * lobe.ry);
  const nz0 = pz / (lobe.rz * lobe.rz);
  const nrx1 = nx0 * ct - ny0 * st;
  const nry1 = nx0 * st + ny0 * ct;
  const nrz1 = nz0;
  const nwx = nrx1 * cy + nrz1 * sy;
  const nwy = nry1;
  const nwz = -nrx1 * sy + nrz1 * cy;
  const nLen = Math.hypot(nwx, nwy, nwz) || 1;

  return {
    x: giant.x + lobe.ox + wx,
    y: giant.centerY + lobe.oy + wy,
    z: giant.z + lobe.oz + wz,
    nx: nwx / nLen,
    ny: nwy / nLen,
    nz: nwz / nLen,
  };
}

function buildLobeChain(
  domeRx: number,
  domeRy: number,
  domeRz: number,
  azimuth: number,
  elevPhi: number,
  baseRadius: number,
  count: number,
  outTilt: number
): CactusLobeSpec[] {
  const chain: CactusLobeSpec[] = [];
  let curX = domeRx * Math.cos(elevPhi) * Math.cos(azimuth) * 0.92;
  let curY = domeRy * Math.sin(elevPhi) * 0.92;
  let curZ = domeRz * Math.cos(elevPhi) * Math.sin(azimuth) * 0.92;

  const dirX = Math.cos(azimuth) * Math.sin(outTilt);
  const dirZ = Math.sin(azimuth) * Math.sin(outTilt);
  const dirY = Math.cos(outTilt);

  let r = baseRadius;
  for (let i = 0; i < count; i++) {
    const step = i === 0 ? r * 0.58 : r * 1.38;
    curX += dirX * step;
    curY += dirY * step;
    curZ += dirZ * step;
    chain.push({
      ox: curX,
      oy: curY,
      oz: curZ,
      rx: r,
      ry: r * 1.12,
      rz: r,
      ribs: 14,
      yaw: -azimuth,
      tiltZ: -outTilt * 0.6,
    });
    r *= 0.84;
  }
  return chain;
}

export const CACTUS_GIANTS: readonly CactusGiantSpec[] = CACTUS_DOME_BASES.map(
  (base) => {
    const groundY = sampleCactusHeight(base.x, base.z);
    // Half-buried: centerY is positioned so ~45-50% of the ellipsoid lies below local groundY!
    const centerY = groundY - base.domeRy * (base.embedFraction - 0.5);
    const scaleFactor = base.domeRx / 21.0;

    let lobes: CactusLobeSpec[] = [];
    if (base.id === 'cactus-w-main' || base.id === 'cactus-e-main') {
      lobes = [
        ...buildLobeChain(base.domeRx, base.domeRy, base.domeRz, 0.35, 0.62, 5.2 * scaleFactor, 3, 0.52),
        ...buildLobeChain(base.domeRx, base.domeRy, base.domeRz, 2.35, 0.68, 4.9 * scaleFactor, 3, 0.45),
        ...buildLobeChain(base.domeRx, base.domeRy, base.domeRz, 4.15, 0.84, 4.5 * scaleFactor, 2, 0.25),
      ];
    } else if (base.id === 'cactus-nw' || base.id === 'cactus-ne') {
      lobes = [
        ...buildLobeChain(base.domeRx, base.domeRy, base.domeRz, 0.85, 0.68, 4.2 * scaleFactor, 3, 0.44),
        ...buildLobeChain(base.domeRx, base.domeRy, base.domeRz, 3.65, 0.78, 3.8 * scaleFactor, 2, 0.32),
      ];
    } else {
      lobes = [
        ...buildLobeChain(base.domeRx, base.domeRy, base.domeRz, 1.15, 0.72, 3.6 * scaleFactor, 2, 0.38),
        ...buildLobeChain(base.domeRx, base.domeRy, base.domeRz, 4.25, 0.76, 3.2 * scaleFactor, 2, 0.34),
      ];
    }

    return {
      ...base,
      groundY,
      centerY: groundY - 0.65 - base.domeRy * (base.embedFraction - 0.44),
      lobes,
    };
  }
);

function isInsideDome(
  giant: CactusGiantSpec,
  px: number,
  py: number,
  pz: number,
  margin = 0.96
): boolean {
  const dx = (px - giant.x) / (giant.domeRx * margin);
  const dy = (py - giant.centerY) / (giant.domeRy * margin);
  const dz = (pz - giant.z) / (giant.domeRz * margin);
  return dx * dx + dy * dy + dz * dz < 1.0;
}

/**
 * Deterministically places hundreds of wooden grave crosses STRICTLY ON the exposed
 * upper surfaces of the 6 giant cacti and their stacked lobes — never below a cactus
 * and never below ground level.
 */
export function buildCactusCrosses(): CactusCrossSpec[] {
  const crosses: CactusCrossSpec[] = [];
  let idx = 0;

  for (const giant of CACTUS_GIANTS) {
    // 1. Dome surface crosses across upper hemisphere rings
    const ringCount = giant.domeRx > 13 ? 7 : giant.domeRx > 10 ? 5 : 4;
    for (let r = 0; r < ringCount; r++) {
      // phi strictly above ground/equator band so no cross ever sits below terrain or underneath
      const phi = 0.24 + (r / Math.max(1, ringCount - 1)) * 1.06;
      const ringCircumference = Math.cos(phi) * giant.domeRx;
      const countInRing = Math.max(9, Math.round(ringCircumference * 1.55));

      for (let k = 0; k < countInRing; k++) {
        const jitter = (valueNoise2D(k * 1.7 + r * 3.1, giant.x + giant.z) - 0.5) * 0.14;
        const theta = (k / countInRing) * Math.PI * 2 + r * 0.41 + jitter;
        const phiJ = clamp(phi + jitter * 0.24, 0.22, 1.38);

        const pt = sampleCactusDomeSurface(giant, theta, phiJ);
        const coast = sampleCactusCoastMask(pt.x, pt.z);
        const groundY = sampleCactusHeight(pt.x, pt.z);
        // Hard invariant: strictly ON cactus above dry island terrain & upper surface normal >= 0.14
        if (coast < 0.52 || groundY < 2.2 || pt.y <= groundY + 1.05 || pt.ny < 0.14) continue;

        // Avoid crosses buried inside an attached arm lobe base
        let blockedByLobe = false;
        for (const lobe of giant.lobes) {
          const lx = (pt.x - (giant.x + lobe.ox)) / (lobe.rx * 0.98);
          const ly = (pt.y - (giant.centerY + lobe.oy)) / (lobe.ry * 0.98);
          const lz = (pt.z - (giant.z + lobe.oz)) / (lobe.rz * 0.98);
          if (lx * lx + ly * ly + lz * lz < 1.0) {
            blockedByLobe = true;
            break;
          }
        }
        if (blockedByLobe) continue;

        // Blend 64% skyward + 36% outward surface normal so grave crosses stand tall & legible ON the cactus
        const bx = pt.nx * 0.36;
        const by = pt.ny * 0.36 + 0.64;
        const bz = pt.nz * 0.36;
        const bLen = Math.hypot(bx, by, bz) || 1;

        crosses.push({
          id: `cross-${idx++}`,
          giantId: giant.id,
          x: pt.x,
          y: pt.y,
          z: pt.z,
          nx: bx / bLen,
          ny: by / bLen,
          nz: bz / bLen,
          scale: 0.92 + valueNoise2D(pt.x * 0.5, pt.z * 0.5) * 0.42,
          roll: (valueNoise2D(pt.z * 0.8, pt.x * 0.8) - 0.5) * 0.22,
          woodTint: 0.78 + valueNoise2D(pt.x * 0.3, pt.y * 0.3) * 0.36,
        });
      }
    }

    // 2. Stacked lobe arm crosses on upper sides of each cactus lobe
    for (let li = 0; li < giant.lobes.length; li++) {
      const lobe = giant.lobes[li];
      const lobeSteps = 10;
      for (let s = 0; s < lobeSteps; s++) {
        const theta = (s / lobeSteps) * Math.PI * 2 + li * 0.65;
        const phi = 0.28 + (s % 3) * 0.32;
        const pt = sampleCactusLobeSurface(giant, lobe, theta, phi);
        const coast = sampleCactusCoastMask(pt.x, pt.z);
        const groundY = sampleCactusHeight(pt.x, pt.z);
        if (coast < 0.52 || groundY < 2.2 || pt.y <= groundY + 1.05 || pt.ny < 0.16) continue;
        if (isInsideDome(giant, pt.x, pt.y, pt.z, 1.03)) continue;

        const bx = pt.nx * 0.36;
        const by = pt.ny * 0.36 + 0.64;
        const bz = pt.nz * 0.36;
        const bLen = Math.hypot(bx, by, bz) || 1;

        crosses.push({
          id: `cross-${idx++}`,
          giantId: giant.id,
          x: pt.x,
          y: pt.y,
          z: pt.z,
          nx: bx / bLen,
          ny: by / bLen,
          nz: bz / bLen,
          scale: 0.78 + (s % 3) * 0.14,
          roll: ((s % 5) - 2) * 0.05,
          woodTint: 0.8 + ((s + li) % 4) * 0.08,
        });
      }
    }
  }

  return crosses;
}

export const CACTUS_CROSSES: readonly CactusCrossSpec[] = buildCactusCrosses();

/**
 * 17 stepped desert buildings lining both shores of the Whisky Peak central bay:
 * - 8 West Shore dwellings including the Cupola Landmark Hall (Image 5)
 * - 9 East Shore dwellings including the Baroque Works Tavern & Banquet Plaza
 */
const RAW_CACTUS_BUILDINGS: readonly Omit<CactusBuildingSpec, 'y'>[] = [
  // WEST SHORE VILLAGE (8 buildings)
  {
    id: 'w-house-nw',
    name: 'Maison Nord-Ouest',
    shore: 'west',
    kind: 'house',
    x: -26.5,
    z: -10.5,
    width: 4.2,
    depth: 3.8,
    tiers: 2,
    baseHeight: 2.8,
    yaw: 0.12,
    wallColor: 0xefe3cb,
    trimColor: 0x9c7b56,
    hasLadder: true,
    hasAwning: false,
  },
  {
    id: 'w-house-n2',
    name: 'Maison du Quai Nord',
    shore: 'west',
    kind: 'house',
    x: -16.0,
    z: -8.5,
    width: 3.8,
    depth: 3.6,
    tiers: 2,
    baseHeight: 2.6,
    yaw: -0.08,
    wallColor: 0xe6d7bc,
    trimColor: 0x8f6f4d,
    hasLadder: false,
    hasAwning: true,
  },
  {
    id: 'w-cupola-hall',
    name: 'Beffroi à Coupole Dorée',
    shore: 'west',
    kind: 'cupola-hall',
    x: -27.5,
    z: 3.5,
    width: 5.4,
    depth: 4.8,
    tiers: 3,
    baseHeight: 3.2,
    yaw: 0.05,
    wallColor: 0xf4ead6,
    trimColor: 0x8d6c49,
    hasLadder: true,
    hasAwning: true,
  },
  {
    id: 'w-house-mid-shore',
    name: 'Maison de la Rive Ouest',
    shore: 'west',
    kind: 'storehouse',
    x: -15.8,
    z: 4.8,
    width: 4.0,
    depth: 4.2,
    tiers: 2,
    baseHeight: 2.6,
    yaw: 0.1,
    wallColor: 0xeadcc2,
    trimColor: 0x967350,
    hasLadder: true,
    hasAwning: true,
  },
  {
    id: 'w-house-mid2',
    name: 'Maison des Terrasses',
    shore: 'west',
    kind: 'house',
    x: -27.8,
    z: 18.0,
    width: 4.4,
    depth: 4.0,
    tiers: 2,
    baseHeight: 2.8,
    yaw: -0.1,
    wallColor: 0xf1e5cf,
    trimColor: 0x9c7b56,
    hasLadder: true,
    hasAwning: false,
  },
  {
    id: 'w-house-sw1',
    name: 'Entrepôt du Port Ouest',
    shore: 'west',
    kind: 'storehouse',
    x: -16.2,
    z: 19.5,
    width: 3.9,
    depth: 3.8,
    tiers: 1,
    baseHeight: 2.9,
    yaw: 0.08,
    wallColor: 0xe4d4b7,
    trimColor: 0x876746,
    hasLadder: false,
    hasAwning: true,
  },
  {
    id: 'w-house-sw2',
    name: 'Maison Sud-Ouest',
    shore: 'west',
    kind: 'house',
    x: -26.8,
    z: 31.5,
    width: 4.2,
    depth: 3.8,
    tiers: 2,
    baseHeight: 2.7,
    yaw: 0.16,
    wallColor: 0xede0c8,
    trimColor: 0x957451,
    hasLadder: true,
    hasAwning: false,
  },
  {
    id: 'w-house-s-gate',
    name: 'Vigie de la Passe Ouest',
    shore: 'west',
    kind: 'house',
    x: -16.8,
    z: 33.5,
    width: 3.8,
    depth: 3.6,
    tiers: 2,
    baseHeight: 2.6,
    yaw: -0.14,
    wallColor: 0xf0e4cd,
    trimColor: 0x8c6b4a,
    hasLadder: false,
    hasAwning: true,
  },

  // EAST SHORE VILLAGE (9 buildings, including Baroque Works Tavern!)
  {
    id: 'e-house-n1',
    name: 'Maison du Cap Nord-Est',
    shore: 'east',
    kind: 'house',
    x: 13.8,
    z: -10.5,
    width: 3.9,
    depth: 3.6,
    tiers: 2,
    baseHeight: 2.6,
    yaw: 0.06,
    wallColor: 0xede1c9,
    trimColor: 0x92704e,
    hasLadder: true,
    hasAwning: false,
  },
  {
    id: 'e-house-n2',
    name: 'Maison Haute Nord-Est',
    shore: 'east',
    kind: 'house',
    x: 26.8,
    z: -9.0,
    width: 4.4,
    depth: 4.0,
    tiers: 2,
    baseHeight: 2.8,
    yaw: -0.1,
    wallColor: 0xf3e8d2,
    trimColor: 0x9a7853,
    hasLadder: false,
    hasAwning: true,
  },
  {
    id: 'e-house-mid1',
    name: 'Maison du Débarcadère',
    shore: 'east',
    kind: 'house',
    x: 15.0,
    z: 1.5,
    width: 3.9,
    depth: 4.0,
    tiers: 2,
    baseHeight: 2.7,
    yaw: -0.05,
    wallColor: 0xe7d8bd,
    trimColor: 0x8a6948,
    hasLadder: true,
    hasAwning: true,
  },
  {
    id: 'e-house-mid2',
    name: 'Auberge Annexe',
    shore: 'east',
    kind: 'house',
    x: 27.2,
    z: 2.0,
    width: 4.3,
    depth: 4.0,
    tiers: 2,
    baseHeight: 2.8,
    yaw: 0.08,
    wallColor: 0xf1e5ce,
    trimColor: 0x967552,
    hasLadder: true,
    hasAwning: false,
  },
  {
    id: 'baroque-tavern',
    name: 'Taverne Baroque Works',
    shore: 'east',
    kind: 'tavern',
    x: 27.2,
    z: 14.8,
    width: 6.2,
    depth: 7.4,
    tiers: 2,
    baseHeight: 3.35,
    yaw: -Math.PI * 0.5, // Front facade faces west (-X) directly onto the Tavern Plaza!
    wallColor: 0xf5ebd5,
    trimColor: 0x7a4e2d,
    hasLadder: true,
    hasAwning: true,
  },
  {
    id: 'e-house-mid3',
    name: 'Maison du Marché',
    shore: 'east',
    kind: 'storehouse',
    x: 15.2,
    z: 22.5,
    width: 4.0,
    depth: 4.0,
    tiers: 2,
    baseHeight: 2.6,
    yaw: 0.1,
    wallColor: 0xe6d6bb,
    trimColor: 0x8e6d4b,
    hasLadder: false,
    hasAwning: true,
  },
  {
    id: 'e-house-s1',
    name: 'Maison des Chasseurs de Primes',
    shore: 'east',
    kind: 'house',
    x: 27.8,
    z: 25.5,
    width: 4.4,
    depth: 4.0,
    tiers: 3,
    baseHeight: 2.85,
    yaw: -0.06,
    wallColor: 0xf2e6d0,
    trimColor: 0x957452,
    hasLadder: true,
    hasAwning: false,
  },
  {
    id: 'e-house-s2',
    name: 'Entrepôt de Whisky Peak',
    shore: 'east',
    kind: 'storehouse',
    x: 15.8,
    z: 35.5,
    width: 4.1,
    depth: 3.8,
    tiers: 1,
    baseHeight: 2.8,
    yaw: -0.12,
    wallColor: 0xe8d9be,
    trimColor: 0x8a6948,
    hasLadder: false,
    hasAwning: true,
  },
  {
    id: 'e-house-s3',
    name: 'Maison du Détroit Est',
    shore: 'east',
    kind: 'house',
    x: 25.4,
    z: 34.2,
    width: 4.2,
    depth: 3.8,
    tiers: 2,
    baseHeight: 2.7,
    yaw: 0.14,
    wallColor: 0xefe2ca,
    trimColor: 0x947350,
    hasLadder: true,
    hasAwning: false,
  },
];

export const CACTUS_BUILDINGS: readonly CactusBuildingSpec[] =
  RAW_CACTUS_BUILDINGS.map((b) => ({
    ...b,
    y: sampleCactusHeight(b.x, b.z) - 0.15,
  }));

export const CACTUS_LANDMARKS = {
  baroqueTavern: CACTUS_BUILDINGS.find((b) => b.id === 'baroque-tavern')!,
  cupolaHall: CACTUS_BUILDINGS.find((b) => b.id === 'w-cupola-hall')!,
  westPier: { x: -12.6, z: 13.5, yaw: 0.08 },
  eastPier: { x: 11.4, z: 14.5, yaw: -0.06 },
  mooredShip: { x: -7.2, z: 14.5, yaw: -0.22 },
  tavernPlaza: { x: 20.6, z: 14.5 },
} as const;

export function buildCactusRocks(): CactusRockPropSpec[] {
  const rocks: CactusRockPropSpec[] = [];
  let idx = 0;
  const total = 220;
  for (let i = 0; i < total; i++) {
    const ang = i * 2.399963 + 0.5;
    const rad = 16 + Math.sqrt((i + 0.5) / total) * 56;
    const x = Math.cos(ang) * rad * 1.08;
    const z = Math.sin(ang) * rad * 0.92;
    const coast = sampleCactusCoastMask(x, z);
    if (coast < 0.45) continue;
    if (cactusBaySignedDist(x, z) < 3.0) continue;
    if (cactusRoadSignedDist(x, z) < 1.2) continue;
    if (sampleCactusVillageMask(x, z) > 0.35) continue;

    let nearBuilding = false;
    for (const b of CACTUS_BUILDINGS) {
      if (Math.hypot(x - b.x, z - b.z) < 4.5) {
        nearBuilding = true;
        break;
      }
    }
    if (nearBuilding) continue;

    let insideCactus = false;
    for (const g of CACTUS_GIANTS) {
      if (Math.hypot(x - g.x, z - g.z) < g.domeRx * 0.94) {
        insideCactus = true;
        break;
      }
    }
    if (insideCactus) continue;

    const y = sampleCactusHeight(x, z);
    if (y < 1.9) continue;

    const baseScale = 0.55 + (i % 5) * 0.24;
    rocks.push({
      id: `cactus-rock-${idx++}`,
      x,
      z,
      y: y - 0.12,
      scaleX: baseScale * (1.0 + (i % 3) * 0.25),
      scaleY: baseScale * 0.68,
      scaleZ: baseScale * (0.9 + ((i + 1) % 3) * 0.2),
      yaw: (i * 1.13) % (Math.PI * 2),
      tint: 0.78 + valueNoise2D(x * 0.25, z * 0.25) * 0.36,
    });
  }
  return rocks;
}

export const CACTUS_ROCKS: readonly CactusRockPropSpec[] = buildCactusRocks();

export function toCactusSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * CACTUS_GLOBE_SCALE;
  const sz = z * CACTUS_GLOBE_SCALE;
  const rTarget =
    globeRadius + (y + CACTUS_SPHERE_SEA_OFFSET) * CACTUS_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * 6 curated presets spanning Aerial Overview (Image 1), Bay Sea Approach (Images 3 & 4),
 * and 1.75m Human-Scale Street Exploration (Baroque Works Tavern, West Village Cupola Street,
 * East Village Harbor Street, and Giant Cross-Covered Cactus Cemetery Ridge).
 */
export const CACTUS_CAMERA_PRESETS: CactusCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle:
      "Île Cactus (Whisky Peak) · Baie centrale navigable, falaises brunes extérieures, 6 cactus-cimetières géants couverts de croix et villages jumeaux",
    position: [4, 108, 106],
    target: [6, 4.0, 2],
    isStreetView: false,
  },
  {
    id: 'bay-approach',
    label: 'Approche de la Baie',
    subtitle:
      "Entrée par le détroit sud face au navire amarré, aux maisons étagées des deux rives et aux immenses cactus côtelés",
    position: [-2.0, 13.0, 70.0],
    target: [0, 7.2, 6.0],
    isStreetView: false,
  },
  {
    id: 'baroque-tavern',
    label: 'Taverne Baroque Works (Humain)',
    subtitle:
      "À hauteur d'homme (1,75 m) sur la place pavée devant la Taverne de Baroque Works, tables de banquet, tonneaux, lanternes et cactus géant",
    position: [
      17.0,
      sampleCactusWalkSurfaceHeight(17.0, 17.4) + 1.75,
      17.4,
    ],
    target: [
      CACTUS_LANDMARKS.baroqueTavern.x - 2.6,
      CACTUS_LANDMARKS.baroqueTavern.y + 2.35,
      CACTUS_LANDMARKS.baroqueTavern.z,
    ],
    isStreetView: true,
  },
  {
    id: 'west-village-street',
    label: 'Village Ouest & Coupole (Humain)',
    subtitle:
      "À hauteur d'homme (1,75 m) dans la rue ouest devant les maisons à échelles en bois, le beffroi à coupole dorée et les pieux du rivage",
    position: [
      -18.8,
      sampleCactusWalkSurfaceHeight(-18.8, 13.0) + 1.75,
      13.0,
    ],
    target: [
      CACTUS_LANDMARKS.cupolaHall.x + 1.5,
      CACTUS_LANDMARKS.cupolaHall.y + 4.2,
      CACTUS_LANDMARKS.cupolaHall.z,
    ],
    isStreetView: true,
  },
  {
    id: 'east-village-street',
    label: 'Chemin du Port Est (Humain)',
    subtitle:
      "À hauteur d'homme (1,75 m) sur le chemin sablonneux longeant les maisons du village est et la baie centrale",
    position: [
      18.6,
      sampleCactusWalkSurfaceHeight(18.6, -1.5) + 1.75,
      -1.5,
    ],
    target: [
      22.5,
      sampleCactusWalkSurfaceHeight(22.5, 14.8) + 2.8,
      14.8,
    ],
    isStreetView: true,
  },
  {
    id: 'cactus-cemetery',
    label: 'Cimetière des Cactus (Humain)',
    subtitle:
      "À hauteur d'homme (1,75 m) sur le sentier du plateau face à un cactus géant à moitié enfoncé dans le sol et hérissé de croix en bois",
    position: [
      30.5,
      sampleCactusWalkSurfaceHeight(30.5, -18.5) + 1.75,
      -18.5,
    ],
    target: [44.5, 14.2, 10.5],
    isStreetView: true,
  },
];
