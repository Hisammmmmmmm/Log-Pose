import { valueNoise2D } from './globeMath';

export const SHELLS_WORLD_SIZE = 240;
export const SHELLS_GLOBE_SCALE = 0.0018;
export const SHELLS_GLOBE_CENTER = { u: 0.855, v: 0.156 } as const;
/**
 * Kept strictly at 0.018 rad so Shells Town (u: 0.855, v: 0.156) never overlaps
 * neighboring Goat Island (u: 0.872, v: 0.168, separation ~0.0642 rad).
 */
export const SHELLS_ANGULAR_MASK_RADIUS = 0.024;

export const SHELLS_PIER_Y = 1.35;
export const SHELLS_TOWN_Y = 2.6;
export const SHELLS_MID_TERRACE_Y = 6.2;
export const SHELLS_BASE_Y = 11.5;
export const SHELLS_RIDGE_Y = 26.5;

export interface ShellsBuildingSpec {
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
  hasAwning?: boolean;
  hasChimney?: boolean;
  district: 'town' | 'marine';
}

export interface ShellsTreeSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  scale: number;
  tint: number;
  kind: 'broadleaf' | 'pine';
}

export interface ShellsCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

export const SHELLS_LANDMARKS = {
  mainTower: { x: -10.5, z: -10.0, y: SHELLS_BASE_Y },
  eastTower: { x: 2.2, z: -1.8, y: SHELLS_BASE_Y },
  towerAnnex: { x: 7.4, z: -6.2, y: SHELLS_BASE_Y },
  southGate: { x: -10.0, z: 14.0, y: SHELLS_BASE_Y },
  eastGate: { x: 22.0, z: -12.0, y: SHELLS_BASE_Y },
  zoroCross: { x: -24.5, z: 6.0, y: SHELLS_BASE_Y },
  rikasTavern: { x: -15.8, z: 43.8, y: SHELLS_TOWN_Y },
  harborPier: { x: -10.0, z: 63.6, y: SHELLS_PIER_Y },
  marineCutter: { x: 0.5, z: 65.8, y: 0.12 },
  swBastion: { x: -46.0, z: 34.0, y: 3.4 },
} as const;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function ridgedNoise2D(x: number, z: number): number {
  const n1 = 1 - Math.abs(valueNoise2D(x, z) * 2 - 1);
  const n2 = 1 - Math.abs(valueNoise2D(x * 2.17 + 4.9, z * 2.17 + 3.1) * 2 - 1);
  return clamp(n1 * 0.68 + n2 * 0.32, 0, 1);
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
 * Signed distance (< 0 inside walkable road/courtyard/pier, > 0 outside)
 * covering the harbor 3-finger pier, N-S main avenue, town cross-streets,
 * ascending G-153 ramp, and Marine fortress courtyard lanes.
 */
export function shellsRoadSignedDist(x: number, z: number): number {
  let minD = 999;

  const segments: readonly [number, number, number, number, number][] = [
    // 1. Main N-S Harbor Pier + Straight Avenue all the way up to G-153 South Gate
    [-10.0, 68.2, -10.0, 12.0, 2.35],
    // Harbor waterfront promenade behind the 3-finger pier
    [-16.5, 60.4, -3.5, 60.4, 1.85],
    // 2. Shells Town East-West Cross Streets & Eastern Quarter Loops
    [-31.0, 50.5, 19.0, 50.5, 1.65],
    [-33.0, 39.5, 22.0, 39.5, 1.75],
    [-29.5, 29.0, 20.5, 29.0, 1.65],
    [1.0, 54.0, 1.0, 29.0, 1.55],
    [13.5, 53.5, 13.5, 29.0, 1.55],
    [-21.5, 51.5, -21.5, 29.0, 1.45],
    // 3. G-153 Inner Courtyard Paths (South Gate -> Central Yard -> Barracks & Execution Gate)
    [-10.0, 14.0, -10.0, -19.5, 2.55],
    [-22.0, -18.5, 17.5, -18.5, 2.1],
    [12.5, -22.0, 12.5, 7.5, 2.25],
    [-10.0, 7.5, 12.5, 7.5, 1.9],
    // Courtyard South Plaza apron in front of Twin Towers
    [-10.0, 12.2, -5.5, 11.5, 2.2],
    // Walkway into SW Execution Yard & viewing path
    [-10.0, 6.0, -24.5, 6.0, 1.75],
    [-24.5, 6.0, -26.4, 11.4, 1.75],
    // East Gate path
    [12.5, -12.0, 27.5, -12.0, 1.7],
  ];

  for (const [ax, az, bx, bz, halfW] of segments) {
    const d = distToSegment2D(x, z, ax, az, bx, bz) - halfW;
    if (d < minD) minD = d;
  }

  // Open plaza apron south of Twin Towers & north of South Gate
  const plazaDist = Math.hypot((x + 4.5) / 8.5, (z - 4.0) / 5.5) - 1.0;
  if (plazaDist * 6.0 < minD) minD = plazaDist * 6.0;

  return minD;
}

export function isInG153Compound(x: number, z: number): boolean {
  return x >= -35.0 && x <= 23.0 && z >= -33.0 && z <= 15.0;
}

/**
 * Outer coastline silhouette matching Yotsuba Island:
 * Broadened gentle outer shoal & cove shoulders around Shells Town,
 * northern limestone massif, eastern rounded lobe, and western SW bastion headland.
 */
function sampleShellsCoastMask(x: number, z: number): number {
  const mainBody =
    1 - smoothstep(0.46, 1.06, Math.hypot((x + 1.5) / 62.0, (z + 2.0) / 68.0));
  const northEastLobe =
    1 - smoothstep(0.44, 1.05, Math.hypot((x - 18.0) / 37.0, (z + 44.0) / 27.0));
  const eastLobe =
    1 - smoothstep(0.44, 1.05, Math.hypot((x - 39.0) / 29.0, (z + 8.0) / 35.0));
  const westHeadland =
    1 - smoothstep(0.44, 1.05, Math.hypot((x + 43.0) / 27.0, (z + 6.0) / 33.0));
  const southTownShelf =
    1 - smoothstep(0.44, 1.06, Math.hypot((x + 4.0) / 51.0, (z - 39.0) / 28.0));

  const ang = Math.atan2(z, x);
  const coastNoise =
    (valueNoise2D(x * 0.065 + 2.3, z * 0.065 + 7.1) - 0.5) * 0.055 +
    Math.cos(ang * 5.0 - 0.8) * 0.02;

  let mask = clamp(
    Math.max(mainBody, northEastLobe, eastLobe, westHeadland, southTownShelf) +
      coastNoise,
    0,
    1
  );

  // Harbor bay indentation at south coast (around z = 62..69) where the 3 piers extend
  const pierWaterCut =
    1 - smoothstep(0.28, 1.0, Math.hypot((x + 10.0) / 18.0, (z - 68.5) / 7.5));
  mask *= 1 - pierWaterCut * 0.92;

  // Guarantee island coastline falls cleanly to 0 well inside the 240x240 plane (no square edge clips)
  const outerBoundsFade = 1 - smoothstep(0.84, 0.99, Math.hypot(x / 84.0, z / 84.0));
  mask *= outerBoundsFade;

  return clamp(mask, 0, 1);
}

/**
 * Concentric terraced elevation model + sculpted northern limestone cordillera:
 * - Deep opaque seabed skirt down to -4.8m (eliminates see-through gaps)
 * - Gentle sandy shoal (-0.45m) -> golden beach shoreline (-0.45..+1.6m) -> Shells Town (~2.6m)
 * - Middle terraced cliff shelf ~ 6.2m flanking N, W, E of G-153 (without blocking the southern beach!)
 * - Square G-153 Fortress Plateau ~ 11.5m (flat walkable compound)
 * - Sculpted North, NE & NW Yotsuba limestone mountain peaks & spurs (~21..27m) behind G-153
 * - Smooth sloped stone avenue ramp connecting Shells Town (z=29) straight up to G-153 Gate (z=14)
 */
export function sampleShellsHeight(x: number, z: number): number {
  const coast = sampleShellsCoastMask(x, z);
  let h = -4.8 + (valueNoise2D(x * 0.09, z * 0.09) - 0.5) * 0.22;

  if (coast <= 0.01) {
    return h;
  }

  // Deep submerged sandy shoal (-4.8m -> -0.45m) -> golden sandy beach (-0.45m -> +1.60m) -> lower grassy town shelf (+2.60m)
  const shoalT = smoothstep(0.01, 0.24, coast);
  const beachT = smoothstep(0.24, 0.52, coast);
  const lowerT = smoothstep(0.52, 0.84, coast);
  h = -4.8 + shoalT * 4.35 + beachT * 2.05 + lowerT * 1.0;

  // Do not extend cliff terraces into the southern coastal town basin or beach (z > 16)
  const northCliffWeight = 1 - smoothstep(14.5, 29.0, z);

  // Outer Concentric Mid-Terrace Shelf (~6.2m) wrapping N, W, and E around G-153
  const outerRingDist = Math.hypot((x + 2.5) / 48.0, (z + 10.0) / 41.0);
  const outerTerrace =
    (1 - smoothstep(0.70, 0.96, outerRingDist)) *
    smoothstep(0.46, 0.72, coast) *
    northCliffWeight;
  if (outerTerrace > 0.01) {
    h = Math.max(h, SHELLS_TOWN_Y + outerTerrace * (SHELLS_MID_TERRACE_Y - SHELLS_TOWN_Y));
  }

  // Inner G-153 Fortress Plateau & Citadel Hill (~11.5m)
  const dxBox = Math.max(0, Math.abs(x + 6.0) - 29.0);
  const dzBox = Math.max(0, Math.abs(z + 9.0) - 23.0);
  const boxDist = Math.hypot(dxBox, dzBox);
  const basePlateauMask = 1 - smoothstep(0.4, 5.2, boxDist);
  const innerHillMask =
    (1 - smoothstep(0.70, 0.96, Math.hypot((x + 1.5) / 40.5, (z + 11.5) / 34.5))) *
    northCliffWeight;
  const tier2 = Math.max(basePlateauMask, innerHillMask) * smoothstep(0.50, 0.76, coast);
  if (tier2 > 0.01) {
    // Stepped ascent: townside skirt -> mid-terrace (6.2m) -> citadel plateau (11.5m)
    const steppedTarget =
      SHELLS_TOWN_Y +
      smoothstep(0.0, 0.45, tier2) * (SHELLS_MID_TERRACE_Y - SHELLS_TOWN_Y) +
      smoothstep(0.35, 1.0, tier2) * (SHELLS_BASE_Y - SHELLS_MID_TERRACE_Y);
    h = Math.max(h, steppedTarget);
  }

  // Sculpted Northern, NE & NW Yotsuba Limestone Mountain Amphitheater behind G-153
  const ridgeDetail = ridgedNoise2D(x * 0.085 + 3.2, z * 0.085 + 6.1);
  const cragDetail = ridgedNoise2D(x * 0.18 + 1.4, z * 0.18 + 7.9);

  // Main North Summit Crest behind Twin Marine Towers
  const nPeakEnv = 1 - smoothstep(0.08, 0.96, Math.hypot((x + 8.0) / 26.0, (z + 45.0) / 15.0));
  const nePeakEnv = 1 - smoothstep(0.10, 0.96, Math.hypot((x - 27.0) / 20.0, (z + 30.0) / 16.5));
  const nwPeakEnv = 1 - smoothstep(0.10, 0.96, Math.hypot((x + 39.0) / 18.0, (z + 27.0) / 16.0));
  const eastSpurEnv =
    1 - smoothstep(2.0, 18.0, distToSegment2D(x, z, 27.0, -30.0, 39.0, 6.0));
  const westSpurEnv =
    1 - smoothstep(2.0, 16.0, distToSegment2D(x, z, -39.0, -27.0, -42.0, 14.0));

  const mountainRaw = Math.max(
    nPeakEnv * (22.5 + ridgeDetail * 5.2 + cragDetail * 1.4),
    nePeakEnv * (19.0 + ridgeDetail * 4.5 + cragDetail * 1.2),
    nwPeakEnv * (17.5 + ridgeDetail * 4.2 + cragDetail * 1.2),
    eastSpurEnv * (9.2 + ridgeDetail * 3.4),
    westSpurEnv * (8.6 + ridgeDetail * 3.2)
  );
  const mountainGate = (1 - basePlateauMask * 0.96) * smoothstep(0.48, 0.76, coast);
  if (mountainRaw > 0.05 && mountainGate > 0.01) {
    h = Math.max(h, SHELLS_TOWN_Y + mountainRaw * mountainGate);
  }

  // Enforce crisp flat G-153 Marine Base courtyard at exact 11.5m
  if (x >= -35.5 && x <= 23.5 && z >= -33.5 && z <= 15.0) {
    const edgeFeather =
      smoothstep(-35.5, -33.5, x) *
      (1 - smoothstep(21.5, 23.5, x)) *
      smoothstep(-33.5, -31.5, z) *
      (1 - smoothstep(13.2, 15.0, z));
    h = h * (1 - edgeFeather) + SHELLS_BASE_Y * edgeFeather;
  }

  // Flatten lower Shells Town southern basin cleanly (~2.6m), tapering smoothly to golden beach for z > 54.5
  if (z >= 25.5 && z <= 59.5 && x >= -39.0 && x <= 31.0) {
    const townRad = Math.hypot((x + 4.0) / 34.0, (z - 40.5) / 17.5);
    const townFlat =
      (1 - smoothstep(0.62, 1.0, townRad)) *
      smoothstep(0.40, 0.70, coast) *
      (1 - smoothstep(54.2, 59.5, z));
    h = h * (1 - townFlat * 0.88) + SHELLS_TOWN_Y * (townFlat * 0.88);
  }

  // Carve smooth walkable central Avenue Ramp ascending from Shells Town (z=29.5, y=2.6)
  // straight up through the escarpment into G-153 South Gate (z=13.5, y=11.5)
  if (Math.abs(x + 10.0) < 4.2 && z >= 13.0 && z <= 31.0) {
    const latBlend = 1 - smoothstep(2.1, 4.2, Math.abs(x + 10.0));
    const rampT = smoothstep(13.8, 29.8, z);
    const rampH = SHELLS_BASE_Y * (1 - rampT) + SHELLS_TOWN_Y * rampT;
    h = h * (1 - latBlend) + rampH * latBlend;
  }

  // Smooth sandy cove descent into harbor water beneath the 3-finger wooden pier
  if (z > 57.5 && x > -25.0 && x < 8.0) {
    const coveDrop = smoothstep(57.5, 67.0, z);
    h = Math.min(h, 2.4 - coveDrop * 5.2);
  }

  return h;
}

/**
 * Walkable surface sampler (includes the 3-finger wooden harbor pier at 1.35m).
 */
export function sampleShellsWalkSurfaceHeight(x: number, z: number): number {
  const h = sampleShellsHeight(x, z);
  // Main crosshead quay & 3 southern wooden fingers at x=-10
  if (z >= 60.2 && z <= 63.4 && x >= -16.8 && x <= -3.2) {
    return Math.max(h, SHELLS_PIER_Y);
  }
  if (z >= 63.0 && z <= 68.8) {
    if (
      Math.abs(x + 14.5) <= 1.15 ||
      Math.abs(x + 10.0) <= 1.3 ||
      Math.abs(x + 5.5) <= 1.15
    ) {
      return Math.max(h, SHELLS_PIER_Y);
    }
  }
  return h;
}

/**
 * Shells Town houses (warm cream walls & terracotta/red-brown shingled roofs)
 * + G-153 Marine Base perimeter barracks & warehouses matching both images.
 */
export function buildShellsBuildings(): ShellsBuildingSpec[] {
  const specs: ShellsBuildingSpec[] = [];

  // === A. G-153 MARINE BASE PERIMETER BARRACKS & BUILDINGS ===
  const marineBuildings: readonly Omit<ShellsBuildingSpec, 'y' | 'district'>[] = [
    // NW Red-roofed barracks
    {
      id: 'g153-nw-barracks-1',
      x: -28.0,
      z: -24.5,
      width: 5.2,
      depth: 4.0,
      height: 4.0,
      yaw: 0,
      wallColor: 0xf4f1e6,
      roofColor: 0x9c3f32,
      roofStyle: 'gable',
    },
    // NW Blue-roofed armory wing (visible in shells_town_ac94007e.png & tall white tower block behind main tower)
    {
      id: 'g153-nw-hall',
      x: -21.0,
      z: -25.2,
      width: 6.2,
      depth: 4.4,
      height: 5.8,
      yaw: 0,
      wallColor: 0xf6f4ec,
      roofColor: 0x3b6894,
      roofStyle: 'hip',
    },
    // North Central Tall Marine HQ Barracks (multi-story building perched behind main blue tower)
    {
      id: 'g153-n-hq-wing',
      x: -12.0,
      z: -25.5,
      width: 7.4,
      depth: 5.0,
      height: 8.2,
      yaw: 0,
      wallColor: 0xf5f2e8,
      roofColor: 0xa44134,
      roofStyle: 'gable',
    },
    // North-Central Red Warehouse
    {
      id: 'g153-nc-warehouse',
      x: -2.0,
      z: -25.2,
      width: 5.6,
      depth: 4.2,
      height: 4.4,
      yaw: 0,
      wallColor: 0xf0eadb,
      roofColor: 0xa03e30,
      roofStyle: 'gable',
    },
    // NE Large Slate-Blue Marine Hall
    {
      id: 'g153-ne-blue-hall',
      x: 7.8,
      z: -25.0,
      width: 8.4,
      depth: 4.8,
      height: 4.8,
      yaw: 0,
      wallColor: 0xf2efe4,
      roofColor: 0x2c5c88,
      roofStyle: 'hip',
    },
    // NE Corner Red Quarters
    {
      id: 'g153-ne-quarters',
      x: 17.5,
      z: -24.5,
      width: 4.4,
      depth: 6.2,
      height: 4.2,
      yaw: 0,
      wallColor: 0xf4f0e4,
      roofColor: 0x9b3e30,
      roofStyle: 'gable',
    },
    // West Perimeter Guardhouse & Blue Bunkhouse
    {
      id: 'g153-w-guardhouse',
      x: -28.5,
      z: -14.5,
      width: 4.2,
      depth: 5.8,
      height: 3.6,
      yaw: 0,
      wallColor: 0xefe9da,
      roofColor: 0x9c3f32,
      roofStyle: 'gable',
    },
    {
      id: 'g153-w-armory',
      x: -28.5,
      z: -6.8,
      width: 4.2,
      depth: 5.4,
      height: 3.5,
      yaw: 0,
      wallColor: 0xeef0f2,
      roofColor: 0x2e5e8a,
      roofStyle: 'hip',
    },
  ];

  for (const mb of marineBuildings) {
    specs.push({
      ...mb,
      y: sampleShellsHeight(mb.x, mb.z),
      district: 'marine',
    });
  }

  // === B. SHELLS TOWN HOUSES (WEST & EAST OF MAIN AVENUE) ===
  const townCoords: readonly {
    id: string;
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    yaw?: number;
    roof?: number;
    awning?: boolean;
  }[] = [
    // Upper Town Row (along mid-terrace ledge z ~ 24.5..33)
    { id: 'town-u1', x: -24.5, z: 25.0, w: 4.6, d: 3.6, h: 2.5, yaw: 0.04 },
    { id: 'town-u2', x: -17.5, z: 25.2, w: 4.2, d: 3.4, h: 2.6, yaw: -0.02, awning: true },
    { id: 'town-u3', x: -3.8, z: 25.4, w: 4.4, d: 3.6, h: 2.7, yaw: 0.02 },
    { id: 'town-u4', x: 3.8, z: 25.2, w: 4.6, d: 3.6, h: 2.5, yaw: -0.04 },
    { id: 'town-u5', x: 11.5, z: 25.5, w: 4.2, d: 3.4, h: 2.4, yaw: 0.05 },

    // Mid-West Quarter (flanking West side of Main Avenue)
    { id: 'town-mw1', x: -29.0, z: 34.0, w: 4.8, d: 3.8, h: 2.6, yaw: 0.08 },
    { id: 'town-mw2', x: -16.2, z: 34.2, w: 5.0, d: 4.2, h: 2.9, yaw: 0.0, awning: true },
    { id: 'town-mw3', x: -27.5, z: 44.5, w: 5.2, d: 4.0, h: 2.7, yaw: 0.05 },
    { id: 'town-rikas-tavern', x: -16.0, z: 44.2, w: 5.6, d: 4.8, h: 3.2, yaw: 0.0, roof: 0x993d2b, awning: true },
    { id: 'town-sw1', x: -25.0, z: 54.5, w: 4.4, d: 3.8, h: 2.5, yaw: -0.05 },
    { id: 'town-sw2', x: -16.5, z: 55.2, w: 4.8, d: 4.0, h: 2.6, yaw: 0.02, awning: true },

    // Mid-East Quarter (dense grid of terracotta-roofed houses right of Main Avenue)
    { id: 'town-me1', x: -4.2, z: 34.4, w: 4.6, d: 3.8, h: 2.7, yaw: 0.0, awning: true },
    { id: 'town-me2', x: 6.8, z: 34.2, w: 4.8, d: 3.8, h: 2.6, yaw: 0.02 },
    { id: 'town-me3', x: 18.8, z: 34.5, w: 4.4, d: 3.6, h: 2.5, yaw: -0.04 },
    { id: 'town-me4', x: -4.2, z: 44.5, w: 4.8, d: 4.2, h: 2.8, yaw: 0.0, awning: true },
    { id: 'town-me5', x: 6.8, z: 44.6, w: 4.6, d: 4.0, h: 2.7, yaw: -0.02 },
    { id: 'town-me6', x: 18.5, z: 44.2, w: 4.4, d: 3.8, h: 2.6, yaw: 0.05 },

    // Lower Waterfront Row near the Harbor Pier
    { id: 'town-se1', x: -4.0, z: 55.0, w: 4.8, d: 4.0, h: 2.7, yaw: 0.0, awning: true },
    { id: 'town-se2', x: 6.8, z: 54.8, w: 4.6, d: 3.8, h: 2.5, yaw: 0.03 },
    { id: 'town-se3', x: 14.2, z: 55.2, w: 4.2, d: 3.4, h: 2.4, yaw: -0.03 },
  ];

  const roofPalette = [0xb6543c, 0xa24530, 0xc46044, 0x9b402d];
  const wallPalette = [0xf6efe0, 0xf2e6cf, 0xfaeedb, 0xefe3cb];

  townCoords.forEach((tc, idx) => {
    specs.push({
      id: tc.id,
      x: tc.x,
      z: tc.z,
      y: sampleShellsHeight(tc.x, tc.z),
      width: tc.w,
      depth: tc.d,
      height: tc.h,
      yaw: tc.yaw ?? 0,
      wallColor: wallPalette[idx % wallPalette.length],
      roofColor: tc.roof ?? roofPalette[idx % roofPalette.length],
      roofStyle: idx % 3 === 0 ? 'hip' : 'gable',
      hasAwning: tc.awning,
      hasChimney: idx % 4 === 1,
      district: 'town',
    });
  });

  return specs;
}

/**
 * Generates dense coastal foliage around Shells Town, outer hill slopes,
 * north/east terraced belts, and tidy courtyard trees inside G-153.
 */
export function buildShellsTrees(): ShellsTreeSpec[] {
  const trees: ShellsTreeSpec[] = [];
  let idx = 0;

  const buildings = buildShellsBuildings();

  const pushTree = (
    x: number,
    z: number,
    scale: number,
    kind: ShellsTreeSpec['kind']
  ) => {
    const y = sampleShellsHeight(x, z);
    if (y < 1.35) return;
    if (shellsRoadSignedDist(x, z) < 0.75) return;
    // Keep sheer rocky cliff walls clear while allowing forested mountain slopes
    const hx = sampleShellsHeight(x + 1.0, z);
    const hz = sampleShellsHeight(x, z + 1.0);
    if (Math.hypot(hx - y, hz - y) > 0.96) return;

    // Keep Twin Marine HQ Towers, Execution Yard cross, and buildings unobstructed
    if (Math.hypot(x - SHELLS_LANDMARKS.mainTower.x, z - SHELLS_LANDMARKS.mainTower.z) < 9.5) return;
    if (Math.hypot(x - SHELLS_LANDMARKS.eastTower.x, z - SHELLS_LANDMARKS.eastTower.z) < 7.8) return;
    if (Math.hypot(x - SHELLS_LANDMARKS.zoroCross.x, z - SHELLS_LANDMARKS.zoroCross.z) < 7.5) return;
    if (Math.hypot(x - SHELLS_LANDMARKS.swBastion.x, z - SHELLS_LANDMARKS.swBastion.z) < 5.5) return;

    // Keep main G-153 central lawn tidy (only perimeter compound greenery)
    if (isInG153Compound(x, z)) {
      const inCourtyardCenter = x > -22 && x < 16 && z > -16 && z < 11;
      if (inCourtyardCenter) return;
      // Keep inside SW Execution yard grass open
      if (x >= -34 && x <= -15 && z >= -2 && z <= 14) return;
    }

    for (const b of buildings) {
      if (
        Math.abs(x - b.x) < b.width * 0.5 + 1.6 &&
        Math.abs(z - b.z) < b.depth * 0.5 + 1.6
      ) {
        return;
      }
    }

    trees.push({
      id: `shells-tree-${idx++}`,
      x,
      z,
      y,
      scale,
      tint: 0.85 + valueNoise2D(x * 0.25, z * 0.25) * 0.28,
      kind,
    });
  };

  // Vogel spiral distribution over outer green belts, foothills & lower coastal woods
  const totalSamples = 360;
  for (let i = 0; i < totalSamples; i++) {
    const ang = i * 2.39996;
    const rad = 8 + Math.sqrt((i + 0.5) / totalSamples) * 62;
    const tx = Math.cos(ang) * rad;
    const tz = Math.sin(ang) * rad;
    const kind: ShellsTreeSpec['kind'] = i % 5 === 0 ? 'pine' : 'broadleaf';
    pushTree(tx, tz, 1.05 + (i % 4) * 0.2, kind);
  }

  // Extra coastal tree clusters framing Shells Town base
  const coastalGrove: readonly [number, number][] = [
    [-33.5, 48.0],
    [-35.0, 52.5],
    [-29.5, 58.0],
    [-21.5, 58.2],
    [1.5, 59.0],
    [10.0, 58.5],
    [22.5, 52.0],
    [25.5, 42.0],
    [26.0, 32.0],
    [-3.5, 19.0],
    [-21.0, 18.2],
    [-16.0, 18.0],
  ];
  for (const [gx, gz] of coastalGrove) {
    pushTree(gx, gz, 1.32, 'broadleaf');
  }

  return trees;
}

export const SHELLS_BUILDINGS: readonly ShellsBuildingSpec[] = buildShellsBuildings();
export const SHELLS_TREES: readonly ShellsTreeSpec[] = buildShellsTrees();

export function toShellsSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * SHELLS_GLOBE_SCALE;
  const sz = z * SHELLS_GLOBE_SCALE;
  const rTarget = globeRadius + y * SHELLS_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * Overview, iconic Sea-Level Elevation view, and 4 Human-Scale Street Views
 * across Shells Town, the 3-finger harbor pier, G-153 Courtyard, and Zoro's Execution Yard.
 */
export const SHELLS_CAMERA_PRESETS: ShellsCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle:
      'Région de Yotsuba · Shells Town, ponton sud à trois branches, falaises en terrasses et forteresse G-153 de la Marine',
    position: [4, 118, 128],
    target: [-3, 6, 6],
    isStreetView: false,
  },
  {
    id: 'sea-approach',
    label: 'Vue Mer · Citadelle',
    subtitle:
      'Perspective depuis la mer face aux terrasses de pierre, la ville côtière et les deux tours bleues penchées de la base G-153',
    position: [20, 10.5, 118],
    target: [-5, 15.2, 0],
    isStreetView: false,
  },
  {
    id: 'shells-avenue',
    label: 'Avenue Shells Town',
    subtitle:
      'Vue à hauteur d’homme sur l’avenue principale devant la taverne de Rika face à la rampe montante et la porte G-153',
    position: [-10.0, sampleShellsWalkSurfaceHeight(-10.0, 48.0) + 1.85, 48.0],
    target: [-10.0, SHELLS_BASE_Y + 3.2, 8.0],
    isStreetView: true,
  },
  {
    id: 'g153-courtyard',
    label: 'Cour Base G-153',
    subtitle:
      'À hauteur d’homme au cœur de l’esplanade G-153 face aux deux gigantesques tours bleues inclinées et aux casernes',
    position: [-7.5, sampleShellsWalkSurfaceHeight(-7.5, 11.8) + 1.85, 11.8],
    target: [-4.0, SHELLS_BASE_Y + 11.0, -6.0],
    isStreetView: true,
  },
  {
    id: 'execution-yard',
    label: 'Cour d’Exécution (Zoro)',
    subtitle:
      'Vue humaine dans l’enclos sud-ouest devant la croix en bois où Roronoa Zoro était attaché sous les tours de la Marine',
    position: [-26.2, sampleShellsWalkSurfaceHeight(-26.2, 11.2) + 1.85, 11.2],
    target: [-20.0, SHELLS_BASE_Y + 3.3, 2.0],
    isStreetView: true,
  },
  {
    id: 'harbor-pier',
    label: 'Ponton du Port',
    subtitle:
      'À hauteur d’homme sur l’embarcadère en bois à trois branches face au cotre de la Marine et à la grande rue de Shells Town',
    position: [-10.0, sampleShellsWalkSurfaceHeight(-10.0, 66.8) + 1.85, 66.8],
    target: [-9.5, SHELLS_TOWN_Y + 3.2, 34.0],
    isStreetView: true,
  },
];
