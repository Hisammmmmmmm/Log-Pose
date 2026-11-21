import { valueNoise2D } from './globeMath';

export const GOAT_WORLD_SIZE = 240;
export const GOAT_GLOBE_SCALE = 0.002;
export const GOAT_GLOBE_CENTER = { u: 0.872, v: 0.168 } as const;
export const GOAT_ANGULAR_MASK_RADIUS = 0.044;

export const GOAT_HIDEOUT_Y = 2.4;
export const GOAT_PIER_Y = 1.45;
export const GOAT_VALLEY_Y = 4.2;
export const GOAT_NORTH_MESA_Y = 14.5;
export const GOAT_SW_MESA_Y = 17.5;

export interface GoatBuildingSpec {
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
  roofStyle: 'hip' | 'gable' | 'flat';
  hasPorch?: boolean;
  hasChimney?: boolean;
  district: 'hideout' | 'trail';
}

export interface GoatTreeSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  scale: number;
  tint: number;
  kind: 'broadleaf' | 'pine' | 'palm';
}

export interface GoatRockSpec {
  x: number;
  z: number;
  y: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  yaw: number;
}

export interface GoatCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

export const GOAT_LANDMARKS = {
  alvidaHq: { x: 24.5, z: -8.5, y: GOAT_HIDEOUT_Y, yaw: 0.12 },
  woodenQuay: { x: 42.6, z: 2.0, y: GOAT_PIER_Y, length: 32.0, width: 2.8 },
  missLoveDuck: { x: 52.8, z: 2.0, y: 0.14, yaw: Math.PI },
  kobyDinghy: { x: 46.2, z: 19.6, y: 0.08, yaw: 0.35 },
  trailCabin: { x: -25.8, z: -26.5, y: 4.5, yaw: 0.45 },
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
 * Signed distance (< 0 inside road/courtyard/pier, > 0 outside) to Goat Island's
 * walkable dirt yard, long wooden harbor quay, NW forest trail, and overlook spur.
 */
export function goatRoadSignedDist(x: number, z: number): number {
  let minD = 999;

  const segments: readonly [number, number, number, number, number][] = [
    // 1. Long North-South Wooden Harbor Quay & Dockside Apron
    [42.6, -12.8, 42.6, 16.8, 2.0],
    [39.8, -11.5, 39.8, 15.5, 1.9],
    // 2. Alvida's Hideout Central Sandy Courtyard Spine & Cross Lanes
    [39.5, 0.5, 22.5, 0.5, 2.5],
    [26.8, -4.2, 26.8, 11.5, 2.1],
    [38.5, 8.6, 23.5, 8.6, 1.9],
    // 3. Westward Forest Trail through the Central Saddle -> NW Sandy Cove Beach
    [22.5, 0.5, 11.0, -4.5, 1.85],
    [11.0, -4.5, -2.5, -10.5, 1.85],
    [-2.5, -10.5, -16.5, -17.5, 1.8],
    [-16.5, -17.5, -29.0, -23.5, 1.8],
    [-29.0, -23.5, -39.5, -31.0, 1.75],
    [-39.5, -31.0, -49.5, -34.5, 1.75],
    // 4. Spur trail toward Northern Bluff / Hideout Overlook
    [-2.5, -10.5, 10.5, -19.5, 1.65],
    [10.5, -19.5, 21.5, -24.5, 1.65],
  ];

  for (const [ax, az, bx, bz, halfW] of segments) {
    const d = distToSegment2D(x, z, ax, az, bx, bz) - halfW;
    if (d < minD) minD = d;
  }

  // Open courtyard forecourt right in front of Alvida's Pink HQ
  const hqYardDist = Math.hypot(x - 25.8, z + 1.5) - 3.6;
  if (hqYardDist < minD) minD = hqYardDist;

  return minD;
}

export function isInHideoutYard(x: number, z: number): boolean {
  return x >= 13.5 && x <= 41.8 && z >= -15.5 && z <= 17.5;
}

/**
 * Northern Cliff-Ringed Mesa mask (0 outside, 1 flat grassy summit plateau).
 */
export function sampleNorthMesaMask(x: number, z: number): number {
  const rx = (x - 1.5) / 21.5;
  const rz = (z + 41.0) / 14.5;
  const warp = (valueNoise2D(x * 0.08 + 2.1, z * 0.08 + 5.7) - 0.5) * 0.14;
  return 1 - smoothstep(0.68, 1.04, Math.hypot(rx, rz) + warp);
}

/**
 * Southwestern Cliff-Ringed Mesa mask (larger diagonal plateau).
 */
export function sampleSwMesaMask(x: number, z: number): number {
  const dx = x + 24.5;
  const dz = z - 29.0;
  const cosA = Math.cos(-0.46);
  const sinA = Math.sin(-0.46);
  const lx = dx * cosA - dz * sinA;
  const lz = dx * sinA + dz * cosA;
  const warp = (valueNoise2D(x * 0.075 + 8.3, z * 0.075 + 1.4) - 0.5) * 0.14;
  return 1 - smoothstep(0.68, 1.04, Math.hypot(lx / 25.5, lz / 17.5) + warp);
}

/**
 * Outer coastline silhouette faithfully reproducing goat_515474f9.png:
 * - Two northern headlands (NW peninsula + North-Central bluff headland)
 * - Prominent continuous SW rocky cape & West sandy coves
 * - Sheltered SE/East cove cradling Alvida's Hideout & Miss Love Duck
 * - Southern cove headland jutting out below the hideout bay
 */
function sampleGoatOuterLandMask(x: number, z: number): number {
  const coreBody =
    1 - smoothstep(0.68, 1.04, Math.hypot((x + 8) / 50, (z - 2) / 48));
  const northWestCape =
    1 - smoothstep(0.64, 1.03, Math.hypot((x + 25) / 19, (z + 49) / 21));
  const northCenterBody =
    1 - smoothstep(0.66, 1.03, Math.hypot((x - 1) / 27, (z + 36) / 23));
  const northEastCape =
    1 - smoothstep(0.62, 1.02, Math.hypot((x - 15) / 18, (z + 52) / 18));
  const eastShoulder =
    1 - smoothstep(0.64, 1.02, Math.hypot((x - 31) / 18, (z + 24) / 17));
  const westCoast =
    1 - smoothstep(0.65, 1.03, Math.hypot((x + 48) / 21, (z - 12) / 25));
  const swLandBridge =
    1 - smoothstep(0.66, 1.04, Math.hypot((x + 31) / 28, (z - 32) / 26));
  const swPeninsula =
    1 - smoothstep(0.64, 1.03, Math.hypot((x + 42) / 22, (z - 47) / 22));
  const seCoveArm =
    1 - smoothstep(0.62, 1.02, Math.hypot((x - 24) / 17, (z - 27) / 13));
  const hideoutBayPlatform =
    1 - smoothstep(0.66, 1.02, Math.hypot((x - 28) / 21, (z - 2) / 19));

  const coastNoise =
    (valueNoise2D(x * 0.068 + 3.4, z * 0.068 + 6.9) - 0.5) * 0.16 +
    Math.sin(Math.atan2(z, x) * 7.0) * 0.035;

  let mask = clamp(
    Math.max(
      coreBody,
      northWestCape,
      northCenterBody,
      northEastCape,
      eastShoulder,
      westCoast,
      swLandBridge,
      swPeninsula,
      seCoveArm,
      hideoutBayPlatform
    ) + coastNoise,
    0,
    1
  );

  // Carve sheltered East Cove directly east of x = 40.5 (where wooden quay meets harbor water)
  const eastCoveCut =
    1 - smoothstep(0.32, 1.0, Math.hypot((x - 58.5) / 20.5, (z - 2.0) / 22.0));
  mask *= 1 - eastCoveCut * 0.98;

  // Carve subtle NW bay indentation for the beach landing (well west of trail cabin)
  const nwBayCut =
    1 - smoothstep(0.5, 1.04, Math.hypot((x + 63.0) / 13.0, (z + 36.0) / 13.0));
  mask *= 1 - nwBayCut * 0.72;

  // Carve southern notch between SW peninsula and SE cove arm
  const southNotchCut =
    1 - smoothstep(0.48, 1.02, Math.hypot((x - 2.0) / 15.0, (z - 54.0) / 16.0));
  mask *= 1 - southNotchCut * 0.84;

  return clamp(mask, 0, 1);
}

/**
 * Master height sampler for Goat Island:
 * - Ocean floor < -1.2
 * - Hideout East Cove courtyard ~ 2.4m sloping gently down into harbor water by x=42
 * - Central valley & forest trails ~ 4.2m
 * - Two iconic steep cliff-ringed mesas: North Mesa 14.5m & SW Mesa 17.5m
 */
export function sampleGoatHeight(x: number, z: number): number {
  const landMask = sampleGoatOuterLandMask(x, z);
  let h = -1.65 + (valueNoise2D(x * 0.085, z * 0.085) - 0.5) * 0.28;

  if (landMask > 0.01) {
    const beachSlope = smoothstep(0.04, 0.28, landMask);
    const inlandRise = smoothstep(0.24, 0.72, landMask);
    const gentleHills =
      (valueNoise2D(x * 0.055 + 4.1, z * 0.055 + 2.7) - 0.5) * 1.4;
    h = -1.45 + beachSlope * 3.1 + inlandRise * 2.55 + inlandRise * gentleHills;
  }

  // Steep-walled North & SW Rocky Mesas (flat green forested tops!)
  const northMesa = sampleNorthMesaMask(x, z);
  if (northMesa > 0.01 && landMask > 0.2) {
    const cliffH = 3.8 + northMesa * (GOAT_NORTH_MESA_Y - 3.8);
    h = Math.max(h, cliffH * smoothstep(0.18, 0.45, landMask));
  }

  const swMesa = sampleSwMesaMask(x, z);
  if (swMesa > 0.01 && landMask > 0.2) {
    const cliffH = 4.0 + swMesa * (GOAT_SW_MESA_Y - 4.0);
    h = Math.max(h, cliffH * smoothstep(0.18, 0.45, landMask));
  }

  // Smooth natural basin for Alvida's Hideout East Cove Courtyard (no boxy cliff steps)
  const yardRad = Math.hypot((x - 28.8) / 16.5, (z - 1.2) / 16.0);
  const hideoutBlend =
    (1 - smoothstep(0.62, 1.18, yardRad)) * smoothstep(0.12, 0.45, landMask);
  if (hideoutBlend > 0.01) {
    const shoreDrop = smoothstep(37.5, 43.2, x) * 1.35;
    h = h * (1 - hideoutBlend) + (GOAT_HIDEOUT_Y - shoreDrop) * hideoutBlend;
  }

  // Ensure harbor bay water under quay edge & Miss Love Duck drops below pier deck
  if (x > 40.6 && z > -15.5 && z < 19.0) {
    const bayDrop = smoothstep(40.6, 44.5, x);
    const harborBed = 0.7 - bayDrop * 2.15;
    h = Math.min(h, harborBed);
  }

  // Carve smooth walkable grade along NW Valley Forest Trail & Hideout Approach
  const roadD = goatRoadSignedDist(x, z);
  if (roadD < 1.1 && x < 26 && x > -52 && z > -38 && z < 8) {
    const roadBlend = 1 - smoothstep(-0.2, 1.1, roadD);
    const tWest = clamp((22.5 - x) / 72.0, 0, 1);
    const trailTarget =
      GOAT_HIDEOUT_Y + Math.sin(tWest * Math.PI * 0.85) * 2.6 - smoothstep(0.75, 1.0, tWest) * 1.1;
    h = Math.min(h, h * (1 - roadBlend * 0.82) + trailTarget * (roadBlend * 0.82));
  }

  return h;
}

/**
 * Walkable surface sampler (includes East Harbor Wooden Quay deck at 1.45m
 * and its stepped ramp connecting seamlessly to the courtyard).
 */
export function sampleGoatWalkSurfaceHeight(x: number, z: number): number {
  const h = sampleGoatHeight(x, z);
  if (x >= 40.9 && x <= 44.3 && z >= -14.2 && z <= 18.2) {
    return Math.max(h, GOAT_PIER_Y);
  }
  return h;
}

/**
 * Exact 7 hideout compound buildings + 1 NW forest trail cabin matching goat_515474f9.png.
 */
export function buildGoatBuildings(): GoatBuildingSpec[] {
  const buildings: GoatBuildingSpec[] = [];

  // 1. NE Large Brown Warehouse / Boathouse
  buildings.push({
    id: 'hideout-ne-warehouse',
    x: 36.2,
    z: -7.5,
    y: sampleGoatHeight(36.2, -7.5),
    width: 6.2,
    depth: 5.2,
    height: 3.1,
    yaw: 0.04,
    wallColor: 0xe6d6bc,
    roofColor: 0x8f5634,
    roofStyle: 'gable',
    hasChimney: true,
    district: 'hideout',
  });

  // 2. Small Central Brown Shed / Armory (tucked between Pink HQ and NE Warehouse)
  buildings.push({
    id: 'hideout-armory-shed',
    x: 31.4,
    z: -5.4,
    y: sampleGoatHeight(31.4, -5.4),
    width: 2.6,
    depth: 2.4,
    height: 2.1,
    yaw: 0.0,
    wallColor: 0xc29e74,
    roofColor: 0x7a4829,
    roofStyle: 'hip',
    district: 'hideout',
  });

  // 3. East White-Cream House facing quay & Miss Love Duck
  buildings.push({
    id: 'hideout-east-white-house',
    x: 34.8,
    z: 4.5,
    y: sampleGoatHeight(34.8, 4.5),
    width: 5.2,
    depth: 4.0,
    height: 2.6,
    yaw: -0.05,
    wallColor: 0xf7f2e5,
    roofColor: 0xe8dec8,
    roofStyle: 'gable',
    hasPorch: true,
    district: 'hideout',
  });

  // 4. West Cream/White House (left side of courtyard)
  buildings.push({
    id: 'hideout-west-white-house',
    x: 18.2,
    z: 5.5,
    y: sampleGoatHeight(18.2, 5.5),
    width: 4.6,
    depth: 5.6,
    height: 2.7,
    yaw: 0.08,
    wallColor: 0xf6efe0,
    roofColor: 0xeee4d0,
    roofStyle: 'gable',
    hasPorch: true,
    hasChimney: true,
    district: 'hideout',
  });

  // 5. West-North Narrow Brown Barracks
  buildings.push({
    id: 'hideout-west-barracks',
    x: 18.2,
    z: -4.6,
    y: sampleGoatHeight(18.2, -4.6),
    width: 5.2,
    depth: 2.8,
    height: 2.3,
    yaw: 0.14,
    wallColor: 0xd5be9a,
    roofColor: 0x8f5634,
    roofStyle: 'gable',
    district: 'hideout',
  });

  // 6. South-East Small Brown Watchpost
  buildings.push({
    id: 'hideout-se-watchpost',
    x: 33.0,
    z: 12.2,
    y: sampleGoatHeight(33.0, 12.2),
    width: 3.6,
    depth: 3.0,
    height: 2.2,
    yaw: 0.06,
    wallColor: 0xc8a982,
    roofColor: 0x7c4b2c,
    roofStyle: 'hip',
    district: 'hideout',
  });

  // 7. NW Forest Trail Cabin (shown on reference map beside the NW path)
  buildings.push({
    id: 'trail-forest-cabin',
    x: GOAT_LANDMARKS.trailCabin.x,
    z: GOAT_LANDMARKS.trailCabin.z,
    y: sampleGoatHeight(GOAT_LANDMARKS.trailCabin.x, GOAT_LANDMARKS.trailCabin.z),
    width: 3.4,
    depth: 2.5,
    height: 2.1,
    yaw: GOAT_LANDMARKS.trailCabin.yaw,
    wallColor: 0xb88f64,
    roofColor: 0x6f4327,
    roofStyle: 'gable',
    hasChimney: true,
    district: 'trail',
  });

  return buildings;
}

/**
 * Generates lush green forest groves across both mesa plateaus, the central saddle,
 * the northern & southern capes, and coastal palms around the sheltered bay.
 */
export function buildGoatTrees(): GoatTreeSpec[] {
  const trees: GoatTreeSpec[] = [];
  let idx = 0;

  const pushTree = (
    x: number,
    z: number,
    scale: number,
    kind: GoatTreeSpec['kind']
  ) => {
    const y = sampleGoatHeight(x, z);
    if (y < 1.2) return;
    if (goatRoadSignedDist(x, z) < 0.75) return;
    if (isInHideoutYard(x, z)) return;
    // Keep steep rocky cliff walls free of floating trees
    const hx = sampleGoatHeight(x + 1.0, z);
    const hz = sampleGoatHeight(x, z + 1.0);
    if (Math.hypot(hx - y, hz - y) > 0.72) return;

    // Keep clear radius around buildings & trail cabin
    if (Math.hypot(x - GOAT_LANDMARKS.alvidaHq.x, z - GOAT_LANDMARKS.alvidaHq.z) < 6.2) return;
    if (Math.hypot(x - GOAT_LANDMARKS.trailCabin.x, z - GOAT_LANDMARKS.trailCabin.z) < 3.6) return;

    trees.push({
      id: `goat-tree-${idx++}`,
      x,
      z,
      y,
      scale,
      tint: 0.84 + valueNoise2D(x * 0.25, z * 0.25) * 0.3,
      kind,
    });
  };

  // 1. Dense island-wide forest groves (Vogel spiral covering hills, mesas & peninsulas)
  const totalSamples = 240;
  for (let i = 0; i < totalSamples; i++) {
    const ang = i * 2.39996;
    const rad = 4 + Math.sqrt((i + 0.5) / totalSamples) * 68;
    const tx = -8 + Math.cos(ang) * rad * 0.96;
    const tz = Math.sin(ang) * rad * 0.96;

    const h = sampleGoatHeight(tx, tz);
    if (h < 1.6) continue;
    const onMesa = h > 11.5;
    const kind: GoatTreeSpec['kind'] =
      onMesa && i % 3 === 0 ? 'pine' : h < 2.6 && i % 5 === 0 ? 'palm' : 'broadleaf';
    pushTree(tx, tz, 1.1 + (i % 4) * 0.22, kind);
  }

  // 2. Coastal Palm Accents framing Alvida's Hideout cove & southern arm
  const palmSpots: readonly [number, number][] = [
    [35.5, -21.5],
    [31.5, -26.5],
    [29.5, 22.0],
    [23.5, 27.5],
    [-46.0, -39.5],
    [-49.5, 48.0],
  ];
  for (const [px, pz] of palmSpots) {
    pushTree(px, pz, 1.28, 'palm');
  }

  return trees;
}

/**
 * Coastal sea stacks and rocky cliff talus around Goat Island's headlands.
 */
export function buildGoatRocks(): GoatRockSpec[] {
  return [
    { x: 43.0, z: -24.0, y: 0.5, scaleX: 2.3, scaleY: 2.6, scaleZ: 2.1, yaw: 0.4 },
    { x: 38.0, z: 24.5, y: 0.4, scaleX: 2.4, scaleY: 2.2, scaleZ: 2.2, yaw: 1.2 },
    { x: -58.0, z: 62.0, y: 0.5, scaleX: 3.1, scaleY: 3.4, scaleZ: 2.7, yaw: 0.8 },
    { x: -64.0, z: 4.0, y: 0.5, scaleX: 2.6, scaleY: 2.9, scaleZ: 2.4, yaw: 2.1 },
    { x: 18.0, z: -64.0, y: 0.5, scaleX: 2.5, scaleY: 2.8, scaleZ: 2.2, yaw: 1.6 },
    { x: -24.0, z: -62.0, y: 0.5, scaleX: 2.7, scaleY: 3.0, scaleZ: 2.4, yaw: 0.3 },
  ];
}

export const GOAT_BUILDINGS: readonly GoatBuildingSpec[] = buildGoatBuildings();
export const GOAT_TREES: readonly GoatTreeSpec[] = buildGoatTrees();
export const GOAT_ROCKS: readonly GoatRockSpec[] = buildGoatRocks();

export function toGoatSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * GOAT_GLOBE_SCALE;
  const sz = z * GOAT_GLOBE_SCALE;
  const rTarget = globeRadius + y * GOAT_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * Curated Overview + Human-Scale Street Views across Goat Island:
 * Alvida's Hideout Courtyard, Miss Love Duck Ship, Harbor Quay Pier,
 * NW Forest Trail & Cabin, and Northern Bluff Overlook.
 */
export const GOAT_CAMERA_PRESETS: GoatCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle:
      'Île de Goat · Deux plateaux rocheux boisés, sentier forestier, repaire d’Alvida et le Miss Love Duck amarré à l’est',
    position: [12, 114, 134],
    target: [4, 4, -2],
    isStreetView: false,
  },
  {
    id: 'alvida-hideout',
    label: "Repaire d'Alvida",
    subtitle:
      'Vue à hauteur d’homme au cœur de la cour du repaire face au quartier général rose d’Alvida et aux baraquements',
    position: [28.8, sampleGoatWalkSurfaceHeight(28.8, 3.2) + 1.85, 3.2],
    target: [24.2, GOAT_HIDEOUT_Y + 2.35, -7.8],
    isStreetView: true,
  },
  {
    id: 'miss-love-duck',
    label: 'Miss Love Duck (Navire)',
    subtitle:
      'Vue humaine depuis le nord du quai sur la proue cygne du Miss Love Duck d’Alvida, sa coque rose et ses voiles à cœur',
    position: [41.2, sampleGoatWalkSurfaceHeight(41.2, -13.5) + 2.15, -13.5],
    target: [51.6, GOAT_PIER_Y + 2.8, 1.5],
    isStreetView: true,
  },
  {
    id: 'quay-pier',
    label: 'Quai du Port & Tonneaux',
    subtitle:
      'À hauteur d’homme sur le grand ponton nord-sud le long de la coque rose du Miss Love Duck et du repaire',
    position: [42.6, sampleGoatWalkSurfaceHeight(42.6, 13.8) + 1.85, 13.8],
    target: [45.0, GOAT_PIER_Y + 2.4, -4.5],
    isStreetView: true,
  },
  {
    id: 'forest-trail',
    label: 'Sentier & Cabane Forêt',
    subtitle:
      'Vue humaine sur le chemin forestier serpentant entre les deux plateaux rocheux jusqu’à la cabane en bois',
    position: [-35.2, sampleGoatWalkSurfaceHeight(-35.2, -28.0) + 1.9, -28.0],
    target: [-23.5, 5.6, -21.5],
    isStreetView: true,
  },
  {
    id: 'mesa-overlook',
    label: 'Belvédère · Falaises',
    subtitle:
      'Vue dégagée depuis le sentier haut dominant le repaire d’Alvida, la crique est et le Miss Love Duck',
    position: [14.5, sampleGoatWalkSurfaceHeight(14.5, -21.5) + 2.2, -21.5],
    target: [36.0, GOAT_HIDEOUT_Y + 2.4, -1.0],
    isStreetView: true,
  },
];
