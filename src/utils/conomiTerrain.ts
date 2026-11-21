import { valueNoise2D } from './globeMath';

export const CONOMI_WORLD_SIZE = 280;
export const CONOMI_GLOBE_SCALE = 0.002;
export const CONOMI_GLOBE_CENTER = { u: 0.625, v: 0.225 } as const;
export const CONOMI_ANGULAR_MASK_RADIUS = 0.048;

export const CONOMI_COURTYARD_Y = 2.6;
export const CONOMI_POOL_WATER_Y = 1.05;
export const CONOMI_VILLAGE_Y = 2.8;
export const CONOMI_GOSA_Y = 2.55;
export const CONOMI_TANGERINE_Y = 3.1;

export const CONOMI_SUB_LOCATIONS: Record<string, [number, number]> = {
  'conomi-islands': [0, -10],
  'arlong-park': [-72, -20],
  'cocoyashi-village': [-4, 46],
  'gosa-village': [76, -14],
};

export interface ConomiHouseSpec {
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
  roofStyle: 'hip' | 'gable';
  district: 'cocoyashi' | 'bellemere' | 'gosa-ruin' | 'gosa-shed';
  ruinTiltX?: number;
  ruinTiltZ?: number;
  missingRoof?: boolean;
}

export interface ConomiTreeSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  scale: number;
  tint: number;
  kind: 'jungle' | 'palm' | 'tangerine';
}

export interface ConomiRockSpec {
  x: number;
  z: number;
  y: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  yaw: number;
}

export interface ConomiCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

export const CONOMI_LANDMARKS = {
  arlongPagoda: { x: -64.5, z: -20.0, y: CONOMI_COURTYARD_Y },
  arlongCourtyardCenter: { x: -79.5, z: -20.0, y: CONOMI_COURTYARD_Y },
  sharkSuperb: { x: -97.0, z: -43.5, y: 0.15, yaw: 1.52 },
  cocoyashiPier: { x: -12.0, z: 62.5, y: 1.55 },
  bellemereHouse: { x: 31.0, z: 41.5, y: 3.55 },
  bellemereGrave: { x: 35.5, z: 32.0, y: 5.2 },
  gosaCrossroads: { x: 75.5, z: -13.0, y: CONOMI_GOSA_Y },
} as const;

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

/**
 * Signed distance to all walkable dirt roads, Arlong Park approach paths,
 * Cocoyashi Village streets, Gosa Village crossroads, and northern mountain trail.
 * (< 0 inside road/path, > 0 outside).
 */
export function conomiRoadSignedDist(x: number, z: number): number {
  let minD = 999;

  const segments: readonly [number, number, number, number, number][] = [
    // Arlong Park East Gate -> South around terraced ponds -> West Coast Road
    [-56.5, -20.0, -56.5, -3.0, 1.9],
    [-56.5, -3.0, -68.0, 12.0, 2.0],
    [-68.0, 12.0, -64.0, 29.0, 2.0],
    [-64.0, 29.0, -45.0, 42.0, 2.1],
    [-45.0, 42.0, -24.0, 46.5, 2.2],

    // Cocoyashi Village Main E-W Avenue & Cross Streets
    [-24.0, 46.5, 16.0, 46.5, 2.2],
    [-6.0, 33.5, -6.0, 58.0, 2.1],
    [-16.5, 36.5, -16.5, 55.5, 1.8],
    [5.0, 36.5, 5.0, 54.5, 1.8],
    [-18.0, 37.5, 11.0, 37.5, 1.7],

    // Cocoyashi Pier Stair / Harbor Apron Path
    [-12.0, 54.0, -12.0, 61.5, 2.0],

    // Cocoyashi -> Bell-mere's Tangerine Grove & Hillside Cottage
    [16.0, 46.5, 25.0, 42.0, 1.8],
    [25.0, 42.0, 32.0, 35.0, 1.6],

    // Main Scenic Highway: Cocoyashi -> NE Foothills -> Gosa Village
    [16.0, 46.5, 32.0, 30.0, 2.1],
    [32.0, 30.0, 48.0, 14.0, 2.1],
    [48.0, 14.0, 62.0, -3.0, 2.1],
    [62.0, -3.0, 75.5, -13.0, 2.2],

    // Gosa Village Ruined Crossroads
    [75.5, -13.0, 88.5, -13.0, 2.2],
    [75.5, -27.5, 75.5, -2.0, 2.0],
    [66.0, -19.0, 83.0, -21.0, 1.7],

    // Scenic Northern Mountain Loop Trail (from Arlong Park North -> Highland Basin -> Gosa)
    [-58.0, -28.0, -52.0, -45.0, 1.7],
    [-52.0, -45.0, -24.0, -56.0, 1.7],
    [-24.0, -56.0, 10.0, -54.0, 1.7],
    [10.0, -54.0, 44.0, -38.0, 1.7],
    [44.0, -38.0, 66.0, -24.0, 1.7],
  ];

  for (const [ax, az, bx, bz, halfW] of segments) {
    const d = distToSegment2D(x, z, ax, az, bx, bz) - halfW;
    if (d < minD) minD = d;
  }

  return minD;
}

/**
 * Signed distance to Arlong Park white stone courtyard & sea channel.
 */
export function isInArlongCourtyard(x: number, z: number): boolean {
  return x >= -95.0 && x <= -57.0 && z >= -33.5 && z <= -6.5;
}

/**
 * Checks if point (x, z) lies inside one of Arlong Park's swimming pools or sea channel.
 */
export function sampleArlongPoolMask(x: number, z: number): number {
  // Main central pool + west canal out to sea gate
  if (x >= -98.0 && x <= -72.0 && z >= -24.6 && z <= -15.4) {
    return 1;
  }
  // North & South flanking side pools inside courtyard
  if (x >= -89.5 && x <= -81.0 && z >= -30.5 && z <= -26.2) {
    return 1;
  }
  if (x >= -89.5 && x <= -81.0 && z >= -13.8 && z <= -9.5) {
    return 1;
  }
  return 0;
}

/**
 * Checks if point (x, z) lies inside one of the terraced water/fish ponds south-east of Arlong Park.
 */
export function sampleConomiTerracePondMask(x: number, z: number): number {
  const ponds: readonly [number, number, number, number][] = [
    [-51.0, -9.0, 4.0, 3.2],
    [-51.5, -1.5, 3.8, 3.0],
    [-50.0, 5.5, 4.2, 3.0],
    [-58.0, 14.5, 4.6, 3.4],
    [-51.0, 19.5, 4.0, 3.0],
    [-58.5, 22.0, 4.4, 3.1],
  ];
  for (const [px, pz, rx, rz] of ponds) {
    const d = Math.hypot((x - px) / rx, (z - pz) / rz);
    if (d < 1.0) return 1 - smoothstep(0.7, 1.0, d);
  }
  return 0;
}

/**
 * Organic coastline outer land mask [0..1] faithful to cocoyashi.png.
 */
function sampleConomiOuterLandMask(x: number, z: number): number {
  // Base elliptical landmass stretched East-West
  const nx = (x - 2.0) / 102.0;
  const nz = (z + 2.0) / 68.0;
  const baseR = Math.hypot(nx, nz);

  const ang = Math.atan2(z + 2.0, x - 2.0);
  const coastNoise =
    Math.sin(ang * 4.0 + 0.5) * 0.055 +
    Math.cos(ang * 7.0 - 0.8) * 0.038 +
    (valueNoise2D(x * 0.055 + 2.3, z * 0.055 + 6.1) - 0.5) * 0.13;

  let mask = 1 - smoothstep(0.83, 1.01, baseR + coastNoise);

  // NW headland framing Shark Superb cove
  const nwCape = 1 - smoothstep(0.65, 1.15, Math.hypot((x + 68) / 26, (z + 49) / 18));
  mask = Math.max(mask, nwCape);

  // SW forested headland south of Arlong Park
  const swCape = 1 - smoothstep(0.68, 1.15, Math.hypot((x + 84) / 20, (z + 1) / 17));
  mask = Math.max(mask, swCape);

  // NE Gosa Bay headland (north of Gosa cove)
  const neCape = 1 - smoothstep(0.68, 1.15, Math.hypot((x - 68) / 24, (z + 44) / 18));
  mask = Math.max(mask, neCape);

  // SE rocky peninsula jutting southward (bottom-right of cocoyashi.png)
  const seCape = 1 - smoothstep(0.66, 1.15, Math.hypot((x - 68) / 22, (z - 38) / 26));
  mask = Math.max(mask, seCape);

  // Carve West Cove (Arlong Bay) cleanly so sea gate opens to deep blue bay
  const arlongBayCut =
    1 - smoothstep(0.55, 1.1, Math.hypot((x + 106) / 15.5, (z + 21) / 16.0));
  mask *= 1 - arlongBayCut * 0.96;

  // Carve East Cove (Gosa Bay) inward around (96, -13)
  const gosaBayCut =
    1 - smoothstep(0.45, 1.05, Math.hypot((x - 104) / 14.5, (z + 12) / 14.0));
  mask *= 1 - gosaBayCut * 0.92;

  return clamp(mask, 0, 1);
}

/**
 * Central C-shaped mountain ring + inner twin highland peaks + SE cliff bluff.
 */
function sampleConomiMountainRelief(x: number, z: number): number {
  let ridge = 0;

  // 1. C-shaped / Ring Mountain Crest enclosing Central Highland Basin
  // Center at (-4, -18), rx=48, rz=33
  const rx = (x + 4.0) / 48.0;
  const rz = (z + 18.0) / 33.0;
  const dRing = Math.hypot(rx, rz);
  const ringNoise =
    (valueNoise2D(x * 0.08 + 1.4, z * 0.08 + 4.9) - 0.5) * 0.14;

  // Ring wall peaking around dRing ~ 0.86, sloping down into basin inside and plains outside
  const outerWall = 1 - smoothstep(0.76, 1.12, dRing + ringNoise);
  const basinFloor = 1 - smoothstep(0.48, 0.78, dRing + ringNoise);
  const ringCrest = clamp(outerWall - basinFloor * 0.48, 0, 1);

  // Open a gentler saddle on far NE side toward Gosa trail
  const neSaddle =
    1 - smoothstep(8, 22, Math.hypot(x - 42, z + 20));
  const cRidgeHeight = ringCrest * (1 - neSaddle * 0.45) * 16.5;
  ridge = Math.max(ridge, cRidgeHeight);

  // Highland basin floor elevation (y ~ 9.5 - 11.5 with terraced undulations)
  if (basinFloor > 0.01) {
    const paddyCell =
      Math.sin(x * 0.24) * Math.cos(z * 0.24) * 0.65 +
      (valueNoise2D(x * 0.12 + 7.2, z * 0.12 + 3.5) - 0.5) * 1.4;
    ridge = Math.max(ridge, basinFloor * (9.8 + paddyCell));
  }

  // Two iconic inner peaks inside the highland basin (from cocoyashi.png)
  const westPeak =
    (1 - smoothstep(0.22, 0.98, Math.hypot((x + 32) / 13, (z + 15) / 11))) * 16.5;
  const eastPeak =
    (1 - smoothstep(0.25, 0.98, Math.hypot((x - 10) / 18, (z + 17) / 12))) * 19.5;
  ridge = Math.max(ridge, westPeak, eastPeak);

  // 2. SE Rocky Bluff / Cliff Plateau (cocoyashi.png bottom-right brown cliff ring)
  const seHill =
    (1 - smoothstep(0.28, 1.05, Math.hypot((x - 67) / 19, (z - 28) / 21))) * 11.8;
  ridge = Math.max(ridge, seHill);

  // 3. Bell-mère's hillside orchard knoll east of Cocoyashi (cocoyashi.png & cocoyashi2.png)
  const bellemereHill =
    (1 - smoothstep(0.25, 1.0, Math.hypot((x - 32) / 12.5, (z - 34) / 10.5))) * 5.2;
  ridge = Math.max(ridge, bellemereHill);

  return ridge;
}

/**
 * Master height sampler for Conomi Islands (Sea < -1.2, Quays/Beaches 0..2.2,
 * Arlong Courtyard 2.6, Cocoyashi 2.8, Gosa 2.55, Mountain Peaks ~20).
 */
export function sampleConomiHeight(x: number, z: number): number {
  const landMask = sampleConomiOuterLandMask(x, z);
  let h = -1.65 + (valueNoise2D(x * 0.08, z * 0.08) - 0.5) * 0.35;

  if (landMask > 0.01) {
    const beach = smoothstep(0.02, 0.32, landMask);
    const coastal = smoothstep(0.24, 0.85, landMask);
    h = -1.5 + beach * 1.9 + coastal * 2.15;
  }

  // Add mountain ring, highland basin, SE bluff & Bell-mere knoll
  const mountainH = sampleConomiMountainRelief(x, z);
  if (mountainH > 0.05 && landMask > 0.2) {
    h = Math.max(h, 0.6 + mountainH * smoothstep(0.2, 0.55, landMask));
  }

  // Level out Cocoyashi Village coastal terrace (x in [-26..+22], z in [32..59])
  const cocoBlend =
    (1 - smoothstep(0, 4.5, Math.max(Math.abs(x + 2) - 22, Math.abs(z - 45.5) - 12))) *
    smoothstep(0.25, 0.6, landMask);
  if (cocoBlend > 0.01) {
    h = h * (1 - cocoBlend) + CONOMI_VILLAGE_Y * cocoBlend;
  }

  // Level out Gosa Village eastern bay terrace (x in [64..89], z in [-26..+2])
  const gosaBlend =
    (1 - smoothstep(0, 4.0, Math.max(Math.abs(x - 76.5) - 11.5, Math.abs(z + 13) - 12.5))) *
    smoothstep(0.25, 0.6, landMask);
  if (gosaBlend > 0.01) {
    h = h * (1 - gosaBlend) + CONOMI_GOSA_Y * gosaBlend;
  }

  // Level out Arlong Park courtyard & carve swimming pool basins
  const arlongBlend =
    1 - smoothstep(0, 3.0, Math.max(Math.abs(x + 76) - 18.5, Math.abs(z + 20) - 13.5));
  if (arlongBlend > 0.01) {
    const poolMask = sampleArlongPoolMask(x, z);
    const targetY = poolMask > 0.5 ? 0.35 : CONOMI_COURTYARD_Y;
    h = h * (1 - arlongBlend) + targetY * arlongBlend;
  }

  // Depress terraced water/fish ponds south-east of Arlong Park slightly below ground
  const pondMask = sampleConomiTerracePondMask(x, z);
  if (pondMask > 0.05) {
    h = h * (1 - pondMask) + 1.55 * pondMask;
  }

  // Gentle slope on Cocoyashi Harbor Pier approach
  if (x >= -15 && x <= -9 && z >= 57 && z <= 64) {
    const t = clamp((z - 57) / 7, 0, 1);
    const pierRamp = CONOMI_VILLAGE_Y + (1.55 - CONOMI_VILLAGE_Y) * t;
    h = Math.max(h * 0.3 + pierRamp * 0.7, 1.55);
  }

  return h;
}

/**
 * Walkable surface height sampler used by camera ground clamp & street walking.
 */
export function sampleConomiWalkSurfaceHeight(x: number, z: number): number {
  const h = sampleConomiHeight(x, z);
  if (sampleArlongPoolMask(x, z) > 0.5) {
    return Math.max(h, CONOMI_POOL_WATER_Y + 0.45);
  }
  return h;
}

/**
 * Generates all village buildings across Cocoyashi Village, Bell-mère's Cottage,
 * and Gosa Village's ruined/overturned houses matching cocoyashi.png & cocoyashi2.png.
 */
export function buildConomiHouses(): ConomiHouseSpec[] {
  const houses: ConomiHouseSpec[] = [];

  const roofTerracotta = 0xd9582e;
  const roofCrimson = 0xc93b2b;
  const roofPurple = 0x7c5aa6;
  const roofAmber = 0xde8234;

  // 1. Cocoyashi Village (14 crisp white houses with terracotta, crimson, purple hip/gable roofs)
  const cocoyashiPlacements: Array<{
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    yaw: number;
    roof: number;
  }> = [
    // West column (west of x=-16.5 lane)
    { x: -21.5, z: 33.2, w: 3.4, d: 3.2, h: 2.5, yaw: 0.04, roof: roofTerracotta },
    { x: -21.8, z: 41.2, w: 3.2, d: 3.0, h: 2.4, yaw: -0.04, roof: roofCrimson },
    { x: -21.2, z: 51.2, w: 3.6, d: 3.2, h: 2.5, yaw: 0.08, roof: roofPurple },

    // Inner-west block (between x=-16.5 and x=-6.0)
    { x: -11.2, z: 33.0, w: 3.8, d: 3.2, h: 2.6, yaw: 0.0, roof: roofTerracotta },
    { x: -11.2, z: 41.2, w: 3.5, d: 3.1, h: 2.5, yaw: 0.02, roof: roofPurple },
    { x: -11.4, z: 51.0, w: 3.4, d: 3.2, h: 2.4, yaw: -0.03, roof: roofAmber },

    // Inner-east block (between x=-6.0 and x=+5.0)
    { x: -0.8, z: 33.2, w: 3.6, d: 3.0, h: 2.5, yaw: 0.02, roof: roofCrimson },
    { x: -0.6, z: 41.2, w: 3.5, d: 3.2, h: 2.7, yaw: 0.0, roof: roofTerracotta },
    { x: -0.5, z: 51.2, w: 3.6, d: 3.1, h: 2.4, yaw: 0.04, roof: roofPurple },

    // East block (east of x=+5.0, bordering Tangerine Grove)
    { x: 10.2, z: 33.4, w: 3.4, d: 3.2, h: 2.5, yaw: -0.05, roof: roofPurple },
    { x: 10.4, z: 41.5, w: 3.4, d: 3.1, h: 2.5, yaw: 0.05, roof: roofTerracotta },
    { x: 10.5, z: 51.0, w: 3.5, d: 3.2, h: 2.4, yaw: -0.08, roof: roofCrimson },
    { x: 16.5, z: 36.2, w: 3.2, d: 3.0, h: 2.4, yaw: 0.14, roof: roofAmber },
  ];

  cocoyashiPlacements.forEach((p, idx) => {
    houses.push({
      id: `cocoyashi-house-${idx}`,
      x: p.x,
      z: p.z,
      y: sampleConomiHeight(p.x, p.z),
      width: p.w,
      depth: p.d,
      height: p.h,
      yaw: p.yaw,
      wallColor: 0xf7f2e7,
      roofColor: p.roof,
      roofStyle: idx % 4 === 2 ? 'gable' : 'hip',
      district: 'cocoyashi',
    });
  });

  // 2. Bell-mère's Red-Roofed Cottage (right beside the tangerine grove on the gentle rise)
  houses.push({
    id: 'bellemere-cottage',
    x: CONOMI_LANDMARKS.bellemereHouse.x,
    z: CONOMI_LANDMARKS.bellemereHouse.z,
    y: sampleConomiHeight(
      CONOMI_LANDMARKS.bellemereHouse.x,
      CONOMI_LANDMARKS.bellemereHouse.z
    ),
    width: 4.4,
    depth: 3.4,
    height: 2.5,
    yaw: -0.25,
    wallColor: 0xf6ebd8,
    roofColor: 0xc23828,
    roofStyle: 'gable',
    district: 'bellemere',
  });

  // 3. Gosa Village Ruined & Overturned Houses (scattered around eastern bay crossroads)
  const gosaRuins: Array<{
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    yaw: number;
    tiltX: number;
    tiltZ: number;
    missingRoof?: boolean;
  }> = [
    { x: 70.6, z: -3.2, w: 3.2, d: 2.8, h: 2.1, yaw: 0.35, tiltX: 0.44, tiltZ: -0.34 },
    { x: 64.5, z: -13.8, w: 3.4, d: 2.9, h: 2.2, yaw: -0.45, tiltX: -0.38, tiltZ: 0.48 },
    { x: 80.8, z: -7.2, w: 3.1, d: 2.8, h: 2.0, yaw: 0.65, tiltX: 0.36, tiltZ: 0.46, missingRoof: true },
    { x: 86.2, z: -18.2, w: 3.3, d: 2.9, h: 2.1, yaw: -0.25, tiltX: -0.48, tiltZ: -0.32 },
    { x: 85.8, z: -7.4, w: 2.9, d: 2.6, h: 1.9, yaw: 0.9, tiltX: 0.52, tiltZ: -0.28 },
    { x: 70.4, z: -24.8, w: 3.0, d: 2.6, h: 2.0, yaw: 0.18, tiltX: -0.36, tiltZ: 0.42, missingRoof: true },
    { x: 80.8, z: -25.4, w: 3.2, d: 2.7, h: 2.0, yaw: -0.6, tiltX: 0.42, tiltZ: 0.35 },
    { x: 79.8, z: -2.6, w: 2.8, d: 2.6, h: 1.8, yaw: 0.5, tiltX: 0.28, tiltZ: -0.54 },
    // Partially surviving farm shed north-west of Gosa
    { x: 57.5, z: -22.5, w: 3.6, d: 3.0, h: 2.2, yaw: -0.2, tiltX: 0.06, tiltZ: -0.07 },
  ];

  gosaRuins.forEach((r, idx) => {
    houses.push({
      id: `gosa-ruin-${idx}`,
      x: r.x,
      z: r.z,
      y: sampleConomiHeight(r.x, r.z),
      width: r.w,
      depth: r.d,
      height: r.h,
      yaw: r.yaw,
      wallColor: idx === gosaRuins.length - 1 ? 0xdfd3bf : 0xd5c4ab,
      roofColor: idx % 2 === 0 ? 0xb4482c : 0x9b3a28,
      roofStyle: 'gable',
      district: idx === gosaRuins.length - 1 ? 'gosa-shed' : 'gosa-ruin',
      ruinTiltX: r.tiltX,
      ruinTiltZ: r.tiltZ,
      missingRoof: r.missingRoof,
    });
  });

  return houses;
}

/**
 * Generates Bell-mère's tangerine grove + coastal palms + central mountain jungle forest.
 */
export function buildConomiTrees(): ConomiTreeSpec[] {
  const trees: ConomiTreeSpec[] = [];
  let idx = 0;

  const pushTree = (
    x: number,
    z: number,
    scale: number,
    kind: ConomiTreeSpec['kind']
  ) => {
    const y = sampleConomiHeight(x, z);
    if (y < 0.8) return;
    if (conomiRoadSignedDist(x, z) < 0.7) return;
    if (isInArlongCourtyard(x, z) && kind !== 'palm') return;
    if (sampleArlongPoolMask(x, z) > 0.2) return;
    if (sampleConomiTerracePondMask(x, z) > 0.2) return;
    trees.push({
      id: `conomi-tree-${idx++}`,
      x,
      z,
      y,
      scale,
      tint: 0.86 + valueNoise2D(x * 0.23, z * 0.23) * 0.28,
      kind,
    });
  };

  // 1. Bell-mère's Tangerine Grove (4x3 neat orchard grid east of Cocoyashi houses)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const tx = 20.5 + col * 3.3;
      const tz = 48.0 + row * 2.8;
      const ty = sampleConomiHeight(tx, tz);
      trees.push({
        id: `conomi-tangerine-${row}-${col}`,
        x: tx,
        z: tz,
        y: ty,
        scale: 0.92 + ((row + col) % 2) * 0.08,
        tint: 0.95 + ((row * 3 + col) % 3) * 0.05,
        kind: 'tangerine',
      });
    }
  }

  // 2. Central Mountain Ring & Highland Basin Tropical Forest (dense green groves)
  const forestSamples = 185;
  for (let i = 0; i < forestSamples; i++) {
    const ang = i * 2.39996;
    const rad = 12 + Math.sqrt((i + 0.5) / forestSamples) * 72;
    const tx = -2 + Math.cos(ang) * rad * 1.15;
    const tz = -14 + Math.sin(ang) * rad * 0.78;
    // Skip Cocoyashi & Gosa town footprints
    if (tx > -28 && tx < 30 && tz > 28 && tz < 60) continue;
    if (tx > 62 && tx < 92 && tz > -28 && tz < 4) continue;
    const h = sampleConomiHeight(tx, tz);
    if (h < 1.55) continue;
    const isPalm = h < 3.5 && i % 4 === 0;
    pushTree(tx, tz, (isPalm ? 1.1 : 1.35) + (i % 4) * 0.22, isPalm ? 'palm' : 'jungle');
  }

  // 3. Coastal Coconut Palms framing Arlong Cove, Cocoyashi Bay, and Gosa Cove
  const palmSpots: readonly [number, number][] = [
    [-86, -38], [-78, -42], [-66, -38], [-58, -36],
    [-88, -2], [-80, 6], [-72, 12], [-56, 36],
    [-38, 49], [-29, 54], [28, 56], [42, 50],
    [54, 38], [62, 18], [86, -34], [76, -39],
    [-86, -30], [-65, -30], [-65, -10], // Arlong Park courtyard corner palms
  ];
  for (const [px, pz] of palmSpots) {
    const h = sampleConomiHeight(px, pz);
    if (
      h > 0.6 &&
      conomiRoadSignedDist(px, pz) >= 0.7 &&
      sampleArlongPoolMask(px, pz) <= 0.2
    ) {
      trees.push({
        id: `conomi-palm-${idx++}`,
        x: px,
        z: pz,
        y: h,
        scale: 1.05 + (idx % 3) * 0.14,
        tint: 0.94,
        kind: 'palm',
      });
    }
  }

  return trees;
}

/**
 * Coastal sea-stack boulders & cliff outcrops matching cocoyashi2.png.
 */
export function buildConomiRocks(): ConomiRockSpec[] {
  return [
    { x: -102, z: -26, y: 0.6, scaleX: 2.8, scaleY: 3.4, scaleZ: 2.6, yaw: 0.4 },
    { x: -101, z: -13, y: 0.6, scaleX: 2.6, scaleY: 3.1, scaleZ: 2.5, yaw: 1.2 },
    { x: -12, z: -74, y: 0.5, scaleX: 3.2, scaleY: 3.6, scaleZ: 2.9, yaw: 0.8 },
    { x: 18, z: -72, y: 0.4, scaleX: 2.4, scaleY: 2.6, scaleZ: 2.2, yaw: 2.1 },
    { x: 52, z: -58, y: 0.4, scaleX: 2.6, scaleY: 2.8, scaleZ: 2.4, yaw: 0.2 },
    { x: 48, z: 54, y: 1.0, scaleX: 3.4, scaleY: 3.8, scaleZ: 2.8, yaw: 0.7 },
    { x: 64, z: 62, y: 0.8, scaleX: 3.0, scaleY: 3.2, scaleZ: 2.6, yaw: 1.9 },
    { x: 16, z: 64, y: 0.7, scaleX: 2.6, scaleY: 2.5, scaleZ: 2.2, yaw: 1.1 },
    { x: -34, z: 60, y: 0.6, scaleX: 2.8, scaleY: 2.4, scaleZ: 2.3, yaw: 2.5 },
  ];
}

export const CONOMI_BUILDINGS: readonly ConomiHouseSpec[] = buildConomiHouses();
export const CONOMI_TREES: readonly ConomiTreeSpec[] = buildConomiTrees();
export const CONOMI_ROCKS: readonly ConomiRockSpec[] = buildConomiRocks();

export function toConomiSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * CONOMI_GLOBE_SCALE;
  const sz = z * CONOMI_GLOBE_SCALE;
  const rTarget = globeRadius + y * CONOMI_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * Curated Overview + True Human-Eye Street Views across Arlong Park, Cocoyashi,
 * Bell-mère's Tangerine Grove, Gosa Ruins, and the Highland Trail.
 */
export const CONOMI_CAMERA_PRESETS: ConomiCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle: 'Île de Conomi · Arlong Park à l’ouest, Cocoyashi au sud et Gosa à l’est',
    position: [-26, 108, 146],
    target: [0, 4, -4],
    isStreetView: false,
  },
  {
    id: 'arlong-park',
    label: 'Cour d’Arlong Park',
    subtitle: 'Point de vue humain au bord du bassin face à la pagode à six étages d’Arlong',
    position: [-91.6, CONOMI_COURTYARD_Y + 2.25, -13.2],
    target: [-64.5, CONOMI_COURTYARD_Y + 7.4, -20.0],
    isStreetView: true,
  },
  {
    id: 'cocoyashi-village',
    label: 'Village de Cocoyashi',
    subtitle: 'Vue humaine dans la rue principale de Cocoyashi entre maisons blanches et toits colorés',
    position: [-14.0, CONOMI_VILLAGE_Y + 1.9, 46.5],
    target: [6.0, CONOMI_VILLAGE_Y + 2.2, 43.0],
    isStreetView: true,
  },
  {
    id: 'tangerine-grove',
    label: 'Verger de Belmer',
    subtitle: 'Sous les mandariniers de Belmer près de sa maison face aux toits de Cocoyashi',
    position: [28.0, sampleConomiHeight(28.0, 41.5) + 1.9, 41.5],
    target: [12.0, CONOMI_VILLAGE_Y + 2.0, 46.5],
    isStreetView: true,
  },
  {
    id: 'gosa-village',
    label: 'Ruines de Gosa',
    subtitle: 'Vue humaine au carrefour dévasté du village de Gosa sur la baie est',
    position: [64.8, CONOMI_GOSA_Y + 2.0, -12.0],
    target: [82.5, CONOMI_GOSA_Y + 1.4, -12.8],
    isStreetView: true,
  },
  {
    id: 'highland-trail',
    label: 'Sentier des Crêtes',
    subtitle: 'Panorama humain depuis le sentier montagneux nord surplombant le bassin et Arlong Park',
    position: [-24.0, sampleConomiHeight(-24.0, -56.0) + 2.1, -56.0],
    target: [-64.5, CONOMI_COURTYARD_Y + 7.5, -20.0],
    isStreetView: true,
  },
];
