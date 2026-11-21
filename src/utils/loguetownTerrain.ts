import { valueNoise2D } from './globeMath';

export const LOGUETOWN_WORLD_SIZE = 240;
export const LOGUETOWN_GLOBE_SCALE = 0.00175;
export const LOGUETOWN_GLOBE_CENTER = { u: 0.562, v: 0.378 } as const;
export const LOGUETOWN_ANGULAR_MASK_RADIUS = 0.046;

export const LOGUETOWN_TOWN_Y = 3.2;
export const LOGUETOWN_QUAY_Y = 1.65;
export const LOGUETOWN_COURTYARD_Y = 3.45;
export const LOGUETOWN_SHRINE_Y = 11.8;

export interface LoguetownBuildingSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  yaw: number;
  wallColor: number;
  roofColor: number;
  roofStyle: 'gable' | 'hip' | 'mansard';
  hasDormers: boolean;
  hasChimney: boolean;
}

export interface LoguetownTreeSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  scale: number;
  tint: number;
}

export interface LoguetownPierSpec {
  id: string;
  x: number;
  z: number;
  length: number;
  width: number;
  yaw: number;
}

export interface LoguetownWallSegment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  hasGate?: boolean;
  gateT?: number;
  gateHalfWidth?: number;
}

export interface LoguetownCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

/**
 * Iconic Loguetown landmarks in local island coordinates (East=+X, Up=+Y, South=+Z).
 */
export const LOGUETOWN_LANDMARKS = {
  scaffold: { x: 0, z: -5.6, y: LOGUETOWN_TOWN_Y },
  townHall: { x: 0, z: -13.6, y: LOGUETOWN_TOWN_Y },
  northCourtyardFountain: { x: 0, z: -22.2, y: LOGUETOWN_COURTYARD_Y },
  plazaFountain: { x: 9.5, z: 8.8, y: LOGUETOWN_TOWN_Y },
  cathedral: { x: 25.0, z: -11.5, y: LOGUETOWN_TOWN_Y },
  watchtower: { x: -1.6, z: 19.8, y: LOGUETOWN_TOWN_Y },
  loguetownArch: { x: 19.2, z: 20.2, y: LOGUETOWN_TOWN_Y, yaw: 0.62 },
  warehouseWest: { x: 5.5, z: 41.2, y: LOGUETOWN_TOWN_Y },
  warehouseEast: { x: 16.5, z: 40.6, y: LOGUETOWN_TOWN_Y },
  lighthouse: { x: -22.2, z: 46.2, y: LOGUETOWN_TOWN_Y },
  neShrine: { x: 64.0, z: -40.0, y: LOGUETOWN_SHRINE_Y },
  westWellTower: { x: -53.8, z: -9.0, y: LOGUETOWN_TOWN_Y },
} as const;

/**
 * Fortified stone perimeter city wall enclosing West, South, and East flanks,
 * anchored into the NW and NE mountain cliff bases.
 */
export const LOGUETOWN_WALL_SEGMENTS: readonly LoguetownWallSegment[] = [
  { ax: -25, az: -33, bx: -40, bz: -17 },
  { ax: -40, az: -17, bx: -62, bz: -17 },
  { ax: -62, az: -17, bx: -62, bz: 14 },
  {
    ax: -62,
    az: 14,
    bx: -45,
    bz: 14,
    hasGate: true,
    gateT: 0.52,
    gateHalfWidth: 2.6,
  },
  {
    ax: -45,
    az: 14,
    bx: -45,
    bz: 37,
    hasGate: true,
    gateT: 0.52,
    gateHalfWidth: 2.5,
  },
  { ax: -45, az: 37, bx: -34, bz: 50 },
  { ax: -34, az: 50, bx: -18, bz: 52 },
  {
    ax: -18,
    az: 52,
    bx: 24,
    bz: 48,
    hasGate: true,
    gateT: 0.43,
    gateHalfWidth: 3.1,
  },
  {
    ax: 24,
    az: 48,
    bx: 44,
    bz: 29,
    hasGate: true,
    gateT: 0.22,
    gateHalfWidth: 2.7,
  },
  { ax: 44, az: 29, bx: 46, bz: 3 },
  {
    ax: 46,
    az: 3,
    bx: 38,
    bz: -28,
    hasGate: true,
    gateT: 0.65,
    gateHalfWidth: 2.5,
  },
];

/**
 * Six harbor piers matching the top-down map: 2 West piers, 3 South piers, 1 East pier.
 */
export const LOGUETOWN_PIERS: readonly LoguetownPierSpec[] = [
  { id: 'pier-west-1', x: -62.5, z: 23.2, length: 16.0, width: 3.4, yaw: Math.PI * 0.5 },
  { id: 'pier-west-2', x: -61.5, z: 33.2, length: 14.0, width: 3.4, yaw: Math.PI * 0.5 },
  { id: 'pier-south-1', x: -9.6, z: 68.5, length: 19.0, width: 3.6, yaw: 0.04 },
  { id: 'pier-south-2', x: 3.4, z: 70.5, length: 23.0, width: 4.0, yaw: -0.05 },
  { id: 'pier-south-3', x: 18.4, z: 66.5, length: 18.0, width: 3.6, yaw: 0.06 },
  { id: 'pier-east-1', x: 44.0, z: 48.4, length: 18.0, width: 3.4, yaw: Math.PI * 0.5 - 0.08 },
];

export interface LoguetownShipSpec {
  id: string;
  x: number;
  z: number;
  yaw: number;
  scale: number;
}

export const LOGUETOWN_DOCKED_SHIPS: readonly LoguetownShipSpec[] = [
  { id: 'ship-south-w', x: -16.5, z: 69.5, yaw: 0.15, scale: 1.0 },
  { id: 'ship-south-m', x: 10.6, z: 72.5, yaw: -0.18, scale: 1.12 },
  { id: 'ship-east-bay', x: 31.5, z: 60.5, yaw: 1.32, scale: 0.96 },
  { id: 'ship-west-quay', x: -64.5, z: 16.0, yaw: 1.55, scale: 0.94 },
];

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

function pointInPolygon2D(
  x: number,
  z: number,
  poly: readonly [number, number][]
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    const intersect =
      zi > z !== zj > z &&
      x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const CITY_POLYGON: readonly [number, number][] = [
  [-25, -33],
  [-40, -17],
  [-62, -17],
  [-62, 14],
  [-45, 14],
  [-45, 37],
  [-34, 50],
  [-18, 52],
  [24, 48],
  [44, 29],
  [46, 3],
  [38, -28],
];

const WEST_QUAY_POLYGON: readonly [number, number][] = [
  [-56, 14],
  [-45, 14],
  [-45, 39],
  [-56, 39],
];

const SOUTH_QUAY_POLYGON: readonly [number, number][] = [
  [-23, 47],
  [25, 44],
  [37, 41],
  [38, 54],
  [25, 59],
  [-18, 61],
  [-23, 54],
];

/**
 * Signed distance to the fortified city wall (< 0 inside wall thickness, > 0 away).
 */
export function loguetownWallSignedDist(x: number, z: number): number {
  let minD = 999;
  for (const seg of LOGUETOWN_WALL_SEGMENTS) {
    const d = distToSegment2D(x, z, seg.ax, seg.az, seg.bx, seg.bz) - 1.1;
    if (d < minD) minD = d;
  }
  return minD;
}

/**
 * Signed distance to walkable streets, plazas, harbor staircases, and NE trail.
 * (< 0 inside walkable street/plaza/trail, > 0 off road).
 */
export function loguetownRoadSignedDist(x: number, z: number): number {
  let minD = 999;

  // 1. Place de l'Échafaud (main central cobblestone square)
  const sqHalfW = 16.5;
  const sqHalfD = 13.5;
  const sqCx = 1.0;
  const sqCz = 2.5;
  const qx = Math.abs(x - sqCx) - sqHalfW;
  const qz = Math.abs(z - sqCz) - sqHalfD;
  const plazaDist =
    Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
  minD = Math.min(minD, plazaDist);

  // 2. Town Hall inner formal courtyard (North of Town Hall)
  const cyQx = Math.abs(x - 0) - 9.2;
  const cyQz = Math.abs(z + 22.0) - 6.0;
  const courtyardDist =
    Math.hypot(Math.max(cyQx, 0), Math.max(cyQz, 0)) +
    Math.min(Math.max(cyQx, cyQz), 0);
  minD = Math.min(minD, courtyardDist);

  // 3. Radiating avenues, perimeter streets, harbor stairways & NE trail
  const segments: readonly [number, number, number, number, number][] = [
    // Central South Avenue -> Main South Harbor Gate
    [0.0, 15.0, 0.0, 54.0, 2.7],
    // SW Avenue -> Lighthouse & SW block
    [-11.5, 14.0, -21.5, 29.0, 2.3],
    [-21.5, 29.0, -23.0, 42.5, 2.3],
    [-23.0, 42.5, -16.0, 47.0, 2.2],
    // SE Avenue -> Pink Loguetown Archway -> SE Harbor Gate
    [14.5, 13.5, 22.5, 25.0, 2.5],
    [22.5, 25.0, 28.5, 48.0, 2.4],
    // West Avenue -> Garrison Courtyard Gate -> Marine compound
    [-14.5, -2.5, -41.0, -2.5, 2.4],
    [-41.0, -2.5, -51.5, -2.5, 2.6],
    [-48.5, -10.5, -48.5, 16.5, 2.4],
    // East Avenue -> East Perimeter Road
    [16.5, 1.8, 39.5, 1.8, 2.3],
    // Inner Perimeter Loop Road inside city walls
    [-38.0, -14.5, -38.0, 16.5, 2.0],
    [-38.0, 16.5, -38.0, 36.0, 2.0],
    [-38.0, 36.0, -28.0, 46.5, 2.0],
    [-28.0, 46.5, 0.0, 47.0, 2.1],
    [0.0, 47.0, 28.5, 44.5, 2.1],
    [28.5, 44.5, 40.5, 28.0, 2.0],
    [40.5, 28.0, 41.5, 3.0, 2.0],
    [41.5, 3.0, 35.5, -24.5, 2.0],
    // NW branch lane from square
    [-14.5, -8.5, -29.0, -14.5, 1.9],
    [-29.0, -14.5, -38.0, -14.5, 1.9],
    // NE dirt trail from East Gate up to Shrine Hill
    [39.5, -18.0, 50.5, -21.5, 1.8],
    [50.5, -21.5, 58.0, -29.0, 1.8],
    [58.0, -29.0, 63.5, -39.5, 2.2],
  ];

  for (const [ax, az, bx, bz, halfW] of segments) {
    const d = distToSegment2D(x, z, ax, az, bx, bz) - halfW;
    if (d < minD) minD = d;
  }

  return minD;
}

/**
 * Returns true if point (x, z) lies inside Place de l'Échafaud.
 */
export function isOnLoguetownPlaza(x: number, z: number): boolean {
  return x >= -15.5 && x <= 17.5 && z >= -11.0 && z <= 16.0;
}

/**
 * Returns true if point (x, z) lies on a harbor quay or pier deck.
 */
export function isOnLoguetownQuayOrPier(x: number, z: number): boolean {
  if (
    pointInPolygon2D(x, z, WEST_QUAY_POLYGON) ||
    pointInPolygon2D(x, z, SOUTH_QUAY_POLYGON)
  ) {
    return true;
  }
  for (const p of LOGUETOWN_PIERS) {
    const dx = x - p.x;
    const dz = z - p.z;
    const cosY = Math.cos(-p.yaw);
    const sinY = Math.sin(-p.yaw);
    const lx = dx * cosY - dz * sinY;
    const lz = dx * sinY + dz * cosY;
    if (Math.abs(lx) <= p.width * 0.52 && Math.abs(lz) <= p.length * 0.52) {
      return true;
    }
  }
  return false;
}

/**
 * Approximate organic island coastal radius / outer land mask [0..1]
 * matching the natural outer beaches, NW forest cape, northern mountain crescent,
 * and NE shrine headland from logue_town_b4e4df35.png.
 */
function sampleIslandOuterLandMask(x: number, z: number): number {
  // Elliptical base shifted slightly north/east for natural silhouette
  const nx = (x - 1.5) / 68.5;
  const nz = (z + 6.5) / 69.0;
  const baseR = Math.hypot(nx, nz);

  const ang = Math.atan2(z + 6.5, x - 1.5);
  const coastWave =
    Math.sin(ang * 5.0 + 0.4) * 0.055 +
    Math.cos(ang * 9.0 - 1.1) * 0.032 +
    (valueNoise2D(x * 0.065 + 3.1, z * 0.065 + 7.4) - 0.5) * 0.11;

  // Extend NE peninsula specifically for the Shrine headland (+64, -40)
  const dShrine = Math.hypot((x - 62) / 17.5, (z + 39) / 16.5);
  const shrineLobe = 1 - smoothstep(0.75, 1.18, dShrine);

  // Trim SW & South-Central bay slightly so quays & piers jut clearly into open water
  const isSouthHarbor = z > 44 && x > -52 && x < 42;
  const harborTrim = isSouthHarbor ? 0.12 : 0;

  const naturalLand = 1 - smoothstep(0.84 - harborTrim, 1.02 - harborTrim, baseR + coastWave);
  return Math.max(naturalLand, shrineLobe);
}

/**
 * Northern mountain ridge & steep town-facing cliffs matching logue_town_b4e4df35.png.
 */
function sampleNorthernCliffElevation(x: number, z: number): number {
  // Ridge crescent center at (2, -56), spanning x in [-62..+65], z in [-73..-31]
  const rx = (x - 1.0) / 57.0;
  const rz = (z + 53.5) / 19.5;
  const crescentBend = rx * rx * 0.22;
  const d = Math.hypot(rx, rz - crescentBend);

  const cliffNoise =
    (valueNoise2D(x * 0.11 + 1.9, z * 0.11 + 5.2) - 0.5) * 0.14 +
    (valueNoise2D(x * 0.28, z * 0.28) - 0.5) * 0.06;

  // Steep south face facing the town (z around -34..-42), slightly softer outer north coast
  const isSouthFace = z > -52;
  const innerEdge = isSouthFace ? 0.66 : 0.62;
  const outerEdge = isSouthFace ? 0.96 : 1.04;
  const ridgeFactor = 1 - smoothstep(innerEdge, outerEdge, d + cliffNoise);
  if (ridgeFactor <= 0.001) return 0;

  // Plateau undulation on top
  const plateauBump =
    (valueNoise2D(x * 0.08 + 11.2, z * 0.08 + 2.7) - 0.5) * 3.2 +
    Math.sin(x * 0.12) * 0.65;
  return ridgeFactor * (17.5 + plateauBump);
}

/**
 * NE coastal slope leading up to the Red Shrine hill at (+64, -40).
 */
function sampleNEShrineHill(x: number, z: number): number {
  const d = Math.hypot((x - 63.5) / 14.5, (z + 40.0) / 14.0);
  const hill = 1 - smoothstep(0.28, 1.08, d);
  if (hill <= 0.001) return 0;
  return hill * 11.35;
}

/**
 * Master terrain & masonry height sampler for Loguetown.
 */
export function sampleLoguetownHeight(x: number, z: number): number {
  // 1. Check enclosed walled city plateau first
  const inCity = pointInPolygon2D(x, z, CITY_POLYGON);
  const cliffH = sampleNorthernCliffElevation(x, z);
  const shrineHill = sampleNEShrineHill(x, z);
  const landMask = sampleIslandOuterLandMask(x, z);

  let h = -1.6 + (valueNoise2D(x * 0.08, z * 0.08) - 0.5) * 0.45;

  if (landMask > 0.01) {
    const beachSlope = smoothstep(0.02, 0.35, landMask);
    const coastalSlope = smoothstep(0.25, 0.85, landMask);
    h = -1.5 + beachSlope * 1.9 + coastalSlope * 1.45;
  }

  // Add NW forested headland gentle rise
  if (x < -25 && z < -12 && landMask > 0.25) {
    const nwHill = 1 - smoothstep(6.0, 26.0, Math.hypot(x + 48, z + 30));
    h += nwHill * 4.2;
  }

  // Add NE Shrine Hill
  if (shrineHill > 0.01) {
    h = Math.max(h, 0.45 + shrineHill);
  }

  // Add Northern Mountain Cliffs
  if (cliffH > 0.01) {
    h = Math.max(h, 0.5 + cliffH);
  }

  // Walled town flat urban terrace (y = 3.2), carved cleanly inside city walls
  if (inCity) {
    const courtyardBlend =
      1 -
      smoothstep(
        0.0,
        1.2,
        Math.max(Math.abs(x) - 10.5, Math.abs(z + 22.0) - 6.8)
      );
    const townH = LOGUETOWN_TOWN_Y + courtyardBlend * (LOGUETOWN_COURTYARD_Y - LOGUETOWN_TOWN_Y);
    // Cliffs on far northern edge only override outside town hall rear wall
    h = Math.max(townH, cliffH > 4.2 && z < -32 ? cliffH + 0.5 : townH);
  }

  // Harbor Quays & Piers (flat walkable stone level y = 1.65)
  if (isOnLoguetownQuayOrPier(x, z)) {
    h = Math.max(h, LOGUETOWN_QUAY_Y);
  }

  // Smooth stepped ramps connecting city gates down to West & South Quays and NE Bridge Trail
  const gateRamps: readonly [number, number, number, number, number, number][] = [
    // Main South Harbor Gate staircase (0, 50) -> (0, 55)
    [0.0, 49.0, 0.0, 55.0, 3.0, LOGUETOWN_TOWN_Y],
    // SE Harbor Gate staircase (28, 45) -> (31, 49)
    [28.0, 44.5, 31.5, 49.5, 2.5, LOGUETOWN_TOWN_Y],
    // West Garrison Gate staircase (-53, 14) -> (-53, 19)
    [-53.0, 14.0, -53.0, 19.0, 2.4, LOGUETOWN_TOWN_Y],
    // SW Harbor Gate staircase (-45, 26) -> (-50, 26)
    [-45.0, 26.0, -50.0, 26.0, 2.4, LOGUETOWN_TOWN_Y],
  ];
  for (const [ax, az, bx, bz, halfW, topY] of gateRamps) {
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / lenSq, 0, 1);
    const px = ax + dx * t;
    const pz = az + dz * t;
    const perp = Math.hypot(x - px, z - pz);
    if (perp < halfW + 0.8) {
      const rampY = topY + (LOGUETOWN_QUAY_Y - topY) * t;
      const blend = 1 - smoothstep(halfW - 0.5, halfW + 0.8, perp);
      h = h * (1 - blend) + Math.max(h, rampY) * blend;
    }
  }

  return h;
}

/**
 * Walkable ground + elevated plaza/quay/scaffold-stair height sampler used by
 * human-scale preset verification and WASD street walking.
 */
export function sampleLoguetownWalkSurfaceHeight(x: number, z: number): number {
  return sampleLoguetownHeight(x, z);
}

/**
 * Generates ~70 distinct European port-town houses & civic wings matching the
 * exact block layout of logue_town_b4e4df35.png while staying strictly off
 * streets, plazas, quays, walls, and hero landmark footprints.
 */
export function buildLoguetownHouses(): LoguetownBuildingSpec[] {
  const houses: LoguetownBuildingSpec[] = [];

  const wallPalette = [0xf7f1e3, 0xf2e6cf, 0xfaf6ec, 0xebdcc0, 0xe7ecf2];
  const roofTerracotta = 0xd4562a;
  const roofCrimson = 0xc63c2d;
  const roofBlue = 0x264b7a;
  const roofCream = 0xd9a74e;
  const roofGreen = 0x2f6852;

  const rawPlacements: Array<{
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    yaw: number;
    roof: number;
    wall?: number;
    style?: 'gable' | 'hip' | 'mansard';
  }> = [
    // --- Town Hall Rear & Side Courtyard Enclosure Wings (matching top-down orange blocks) ---
    { x: -9.5, z: -30.5, w: 7.4, d: 3.6, h: 4.8, yaw: 0, roof: roofTerracotta, style: 'hip' },
    { x: 0.0, z: -30.8, w: 8.6, d: 3.8, h: 5.2, yaw: 0, roof: roofTerracotta, style: 'hip' },
    { x: 9.5, z: -30.5, w: 7.4, d: 3.6, h: 4.8, yaw: 0, roof: roofTerracotta, style: 'hip' },
    { x: -12.8, z: -24.5, w: 3.6, d: 5.4, h: 4.6, yaw: Math.PI * 0.5, roof: roofTerracotta, style: 'hip' },
    { x: -12.8, z: -18.2, w: 3.6, d: 4.8, h: 4.5, yaw: Math.PI * 0.5, roof: roofTerracotta, style: 'hip' },
    { x: 12.8, z: -24.5, w: 3.6, d: 5.4, h: 4.6, yaw: -Math.PI * 0.5, roof: roofTerracotta, style: 'hip' },
    { x: 12.8, z: -18.2, w: 3.6, d: 4.8, h: 4.5, yaw: -Math.PI * 0.5, roof: roofTerracotta, style: 'hip' },

    // --- NW Quarter (classic gabled guild/civic hall + houses west of Town Hall) ---
    { x: -24.0, z: -23.0, w: 8.2, d: 4.8, h: 4.6, yaw: 0.25, roof: roofTerracotta, style: 'gable' },
    { x: -30.5, z: -19.0, w: 5.2, d: 4.4, h: 3.8, yaw: 0.25, roof: roofCream, style: 'gable' },
    { x: -21.5, z: -14.8, w: 5.0, d: 5.8, h: 4.1, yaw: 0.05, roof: roofCrimson, style: 'gable' },
    { x: -29.0, z: -9.0, w: 5.6, d: 4.2, h: 3.9, yaw: 0.48, roof: roofBlue, style: 'gable' },
    { x: -22.5, z: -7.5, w: 5.4, d: 3.8, h: 4.0, yaw: 0.48, roof: roofCream, style: 'gable' },

    // --- West Marine / Garrison Courtyard Buildings ---
    { x: -55.8, z: -1.5, w: 5.0, d: 7.2, h: 4.4, yaw: Math.PI * 0.5, roof: roofBlue, wall: 0xebe6db, style: 'hip' },
    { x: -55.8, z: 8.2, w: 4.4, d: 6.4, h: 3.8, yaw: Math.PI * 0.5, roof: roofBlue, wall: 0xe6e2d8, style: 'hip' },

    // --- Mid-West Quarter (West of Place de l'Échafaud, south of West Ave) ---
    { x: -21.5, z: 4.2, w: 5.2, d: 5.2, h: 4.4, yaw: Math.PI * 0.5, roof: roofTerracotta, style: 'gable' },
    { x: -28.0, z: 4.2, w: 5.2, d: 4.8, h: 4.0, yaw: 0, roof: roofBlue, style: 'gable' },
    { x: -33.2, z: 4.0, w: 4.2, d: 4.6, h: 3.8, yaw: 0, roof: roofCrimson, style: 'gable' },
    { x: -22.5, z: 10.6, w: 5.4, d: 4.4, h: 4.1, yaw: 0.45, roof: roofBlue, style: 'gable' },
    { x: -32.2, z: 11.4, w: 5.8, d: 4.4, h: 3.9, yaw: 0.25, roof: roofCrimson, style: 'gable' },
    { x: -29.5, z: 18.2, w: 6.2, d: 4.4, h: 4.2, yaw: -0.65, roof: roofCrimson, style: 'gable' },
    { x: -33.8, z: 24.5, w: 4.4, d: 4.8, h: 3.7, yaw: 0.05, roof: roofGreen, style: 'gable' },
    { x: -27.5, z: 25.0, w: 4.4, d: 4.2, h: 3.9, yaw: -0.1, roof: roofBlue, style: 'gable' },

    // --- Far SW Harbor Neighborhood (above SW seawall & Lighthouse) ---
    { x: -34.2, z: 31.8, w: 4.6, d: 4.2, h: 3.8, yaw: 0, roof: roofTerracotta, style: 'gable' },
    { x: -29.2, z: 32.0, w: 4.4, d: 5.2, h: 4.0, yaw: 0, roof: roofCream, style: 'gable' },
    { x: -34.0, z: 39.2, w: 4.4, d: 5.2, h: 3.7, yaw: 0, roof: roofBlue, style: 'gable' },
    { x: -29.2, z: 39.8, w: 4.4, d: 4.6, h: 3.8, yaw: 0, roof: roofCrimson, style: 'gable' },

    // --- South-West Central Block (between SW Ave & Central Ave, flanking Watchtower) ---
    { x: -9.5, z: 22.8, w: 5.0, d: 4.6, h: 4.3, yaw: 0.12, roof: roofBlue, style: 'hip' },
    { x: -13.0, z: 28.5, w: 4.6, d: 5.6, h: 3.9, yaw: 0.28, roof: roofGreen, style: 'gable' },
    { x: -6.8, z: 28.8, w: 4.4, d: 5.2, h: 4.1, yaw: 0.0, roof: roofCrimson, style: 'gable' },
    { x: -14.8, z: 36.0, w: 4.8, d: 5.8, h: 4.0, yaw: 0.18, roof: roofCream, style: 'gable' },
    { x: -8.0, z: 36.2, w: 4.6, d: 4.6, h: 3.9, yaw: 0.0, roof: roofTerracotta, style: 'gable' },
    { x: -13.8, z: 42.2, w: 4.2, d: 3.4, h: 3.5, yaw: 0.08, roof: roofCream, style: 'gable' },
    { x: -8.0, z: 42.0, w: 4.4, d: 3.4, h: 3.6, yaw: 0.0, roof: roofCrimson, style: 'gable' },

    // --- South-East Central Block (behind Warehouses, beside SE Ave & Watchtower) ---
    { x: 11.8, z: 23.0, w: 5.6, d: 4.8, h: 4.4, yaw: -0.35, roof: roofBlue, style: 'hip' },
    { x: 5.2, z: 25.0, w: 4.4, d: 4.8, h: 4.0, yaw: -0.1, roof: roofGreen, style: 'gable' },
    { x: 5.0, z: 31.8, w: 4.4, d: 4.8, h: 3.9, yaw: 0.0, roof: roofBlue, style: 'gable' },
    { x: 11.5, z: 29.8, w: 4.4, d: 4.6, h: 4.1, yaw: -0.35, roof: roofTerracotta, style: 'gable' },
    { x: 17.5, z: 31.5, w: 4.4, d: 4.6, h: 3.9, yaw: -0.32, roof: roofCrimson, style: 'gable' },
    { x: 22.8, z: 35.8, w: 4.6, d: 4.2, h: 3.7, yaw: -0.22, roof: roofTerracotta, style: 'gable' },

    // --- NE & East Quarter (around Cathedral, East Ave & East Perimeter) ---
    { x: 21.0, z: -22.5, w: 6.2, d: 4.4, h: 4.4, yaw: 0, roof: roofBlue, style: 'hip' },
    { x: 29.2, z: -21.0, w: 5.4, d: 4.4, h: 4.1, yaw: -0.18, roof: roofCream, style: 'gable' },
    { x: 19.8, z: -2.6, w: 5.4, d: 4.2, h: 4.2, yaw: 0.25, roof: roofCrimson, style: 'gable' },
    { x: 27.5, z: -3.2, w: 5.6, d: 4.4, h: 4.4, yaw: -0.05, roof: roofTerracotta, style: 'hip' },
    { x: 35.2, z: -10.5, w: 4.0, d: 6.6, h: 4.0, yaw: -0.1, roof: roofTerracotta, style: 'gable' },
    { x: 36.2, z: 8.5, w: 4.0, d: 5.6, h: 3.9, yaw: 0.0, roof: roofCrimson, style: 'gable' },
    { x: 36.5, z: 16.0, w: 3.8, d: 4.6, h: 3.8, yaw: 0.05, roof: roofBlue, style: 'gable' },

    // --- East-South Block (east of Place de l'Échafaud & east of Loguetown Archway) ---
    { x: 22.2, z: 8.2, w: 6.6, d: 5.0, h: 4.8, yaw: -0.12, roof: roofBlue, style: 'mansard' },
    { x: 29.5, z: 8.0, w: 4.8, d: 4.4, h: 4.1, yaw: 0.0, roof: roofCrimson, style: 'gable' },
    { x: 27.5, z: 14.5, w: 4.8, d: 4.4, h: 4.0, yaw: -0.35, roof: roofBlue, style: 'gable' },
    { x: 34.5, z: 23.0, w: 4.8, d: 4.2, h: 3.8, yaw: -0.2, roof: roofTerracotta, style: 'gable' },
    { x: 29.5, z: 25.5, w: 4.6, d: 5.4, h: 4.0, yaw: -0.45, roof: roofBlue, style: 'gable' },
    { x: 34.8, z: 30.8, w: 4.8, d: 4.4, h: 3.7, yaw: -0.48, roof: roofTerracotta, style: 'gable' },
  ];

  rawPlacements.forEach((p, i) => {
    const roadD = loguetownRoadSignedDist(p.x, p.z);
    // Keep houses cleanly off streets and off Place de l'Échafaud
    if (roadD < 0.9 || isOnLoguetownPlaza(p.x, p.z)) {
      return;
    }
    houses.push({
      id: `lt-house-${i}`,
      x: p.x,
      z: p.z,
      y: LOGUETOWN_TOWN_Y,
      width: p.w,
      depth: p.d,
      height: p.h,
      yaw: p.yaw,
      wallColor: p.wall ?? wallPalette[i % wallPalette.length],
      roofColor: p.roof,
      roofStyle: p.style ?? 'gable',
      hasDormers: i % 2 === 0,
      hasChimney: i % 3 !== 1,
    });
  });

  return houses;
}

/**
 * Generates dense foliage across the Northern Cliff Plateau, NW coastal woods,
 * NE Shrine trail, Formal Courtyard garden, and urban greenery pockets.
 */
export function buildLoguetownTrees(): LoguetownTreeSpec[] {
  const trees: LoguetownTreeSpec[] = [];
  let idx = 0;

  const pushTree = (x: number, z: number, scale = 1.0) => {
    const y = sampleLoguetownHeight(x, z);
    if (y < 0.35) return;
    if (loguetownRoadSignedDist(x, z) < 0.6) return;
    if (isOnLoguetownPlaza(x, z)) return;
    trees.push({
      id: `lt-tree-${idx++}`,
      x,
      z,
      y,
      scale,
      tint: 0.86 + valueNoise2D(x * 0.25, z * 0.25) * 0.28,
    });
  };

  // 1. Northern Cliff Plateau woodlands (3 major groves matching top-down map)
  const plateauGroves: readonly [number, number, number][] = [
    [-25, -56, 7.5],
    [-2, -55, 11.0],
    [28, -56, 10.5],
  ];
  for (const [gx, gz, rad] of plateauGroves) {
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + gx * 0.1;
      const r = (0.25 + ((i * 7) % 10) / 13) * rad;
      pushTree(gx + Math.cos(a) * r, gz + Math.sin(a) * r * 0.65, 1.35 + (i % 3) * 0.28);
    }
  }

  // 2. NW Forested Headland & West outer coastline
  for (let i = 0; i < 16; i++) {
    const x = -58 + (i % 4) * 7.2 + Math.sin(i * 1.7) * 2.1;
    const z = -42 + Math.floor(i / 4) * 6.8 + Math.cos(i * 1.3) * 1.8;
    pushTree(x, z, 1.3 + (i % 3) * 0.25);
  }
  const outerCoastTrees: readonly [number, number][] = [
    [-68, -6], [-69, 4], [-67, 11],
    [49, -12], [51, -2], [50, 12], [48, 22],
    [54, -33], [57, -23], [67, -29], [68, -46],
  ];
  for (const [tx, tz] of outerCoastTrees) {
    pushTree(tx, tz, 1.25);
  }

  // 3. Town Hall Formal Courtyard garden trees (4 quadrant pairs)
  const courtyardTrees: readonly [number, number][] = [
    [-5.5, -25.2], [5.5, -25.2], [-5.5, -18.8], [5.5, -18.8],
  ];
  for (const [tx, tz] of courtyardTrees) {
    pushTree(tx, tz, 0.88);
  }

  // 4. Urban street & park accent trees matching close-up image_e3c75a87.png
  const urbanTrees: readonly [number, number][] = [
    [-25, 11], [-35, -8], [-42, 4], [-42, 11],
    [2.5, 34], [12.5, 36.5], [22.8, 28.0], [34.5, 10.5],
    [20.5, -18.0], [31.5, -15.5], [-17.5, 21.0], [-18.5, 35.5],
  ];
  for (const [tx, tz] of urbanTrees) {
    pushTree(tx, tz, 1.05);
  }

  return trees;
}

export const LOGUETOWN_BUILDINGS: readonly LoguetownBuildingSpec[] =
  buildLoguetownHouses();
export const LOGUETOWN_TREES: readonly LoguetownTreeSpec[] =
  buildLoguetownTrees();

export function toLoguetownSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * LOGUETOWN_GLOBE_SCALE;
  const sz = z * LOGUETOWN_GLOBE_SCALE;
  const rTarget = globeRadius + y * LOGUETOWN_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * Curated Overview + True Human-Eye Street Views for Loguetown.
 */
export const LOGUETOWN_CAMERA_PRESETS: LoguetownCameraPreset[] = [
  {
    id: 'overview',
    label: 'Loguetown',
    subtitle: 'Loguetown sur Polestar Islands · Falaises nord, remparts, port et Place de l’Échafaud',
    position: [20, 96, 138],
    target: [0, 5, -4],
    isStreetView: false,
  },
  {
    id: 'execution-plaza',
    label: "Place de l'Échafaud",
    subtitle: 'Point de vue humain face à l’échafaud de Gol D. Roger et au Palais de Justice',
    position: [-5.5, LOGUETOWN_TOWN_Y + 1.95, 11.2],
    target: [0.0, LOGUETOWN_TOWN_Y + 2.8, -8.5],
    isStreetView: true,
  },
  {
    id: 'loguetown-arch',
    label: 'Arche & Rue du Port',
    subtitle: 'Vue humaine sous l’arche rose Loguetown vers le beffroi et la cathédrale',
    position: [26.2, LOGUETOWN_TOWN_Y + 1.95, 30.8],
    target: [7.0, LOGUETOWN_TOWN_Y + 3.0, 7.5],
    isStreetView: true,
  },
  {
    id: 'harbor-quays',
    label: 'Quais, Phare & Jetées',
    subtitle: 'Promenade portuaire devant les entrepôts bleus, navires et le phare sud-ouest',
    position: [3.4, LOGUETOWN_QUAY_Y + 2.1, 73.5],
    target: [-7.5, LOGUETOWN_TOWN_Y + 2.8, 43.0],
    isStreetView: true,
  },
  {
    id: 'west-garrison',
    label: 'Quartier Ouest & Garnison',
    subtitle: 'Vue humaine dans la rue ouest vers l’enceinte fortifiée de la Marine',
    position: [-31.5, LOGUETOWN_TOWN_Y + 1.9, -2.5],
    target: [-53.5, LOGUETOWN_TOWN_Y + 2.05, -2.0],
    isStreetView: true,
  },
  {
    id: 'north-shrine-vista',
    label: 'Falaise Nord & Sanctuaire',
    subtitle: 'Panorama humain depuis le sentier du sanctuaire rouge sur la colline nord-est',
    position: [60.8, LOGUETOWN_SHRINE_Y + 2.1, -37.2],
    target: [0.0, LOGUETOWN_TOWN_Y + 2.5, 4.0],
    isStreetView: true,
  },
];
