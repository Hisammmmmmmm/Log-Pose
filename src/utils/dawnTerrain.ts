import { valueNoise2D } from './globeMath';

export const DAWN_WORLD_SIZE = 280;
export const DAWN_GLOBE_SCALE = 0.002;
export const DAWN_GLOBE_CENTER = { u: 0.885, v: 0.204 } as const;
export const DAWN_ANGULAR_MASK_RADIUS = 0.048;

export const DAWN_FOOSHA_BEACH_Y = 1.35;
export const DAWN_FOOSHA_Y = 3.2;
export const DAWN_WINDMILL_Y = 5.9;
export const DAWN_GRAY_Y = 3.05;
export const DAWN_GOA_EDGE_Y = 3.8;
export const DAWN_GOA_CENTER_Y = 6.4;
export const DAWN_GOA_HIGH_Y = 10.4;
export const DAWN_GOA_QUAY_Y = 2.2;
export const DAWN_DADAN_Y = 11.2;
export const DAWN_PIER_Y = 1.65;

export const DAWN_SUB_LOCATIONS: Record<string, [number, number]> = {
  'dawn-island': [14, 24],
  'foosha-village': [64, -10],
  'goa-kingdom': [-58, -14],
};

export interface DawnBuildingSpec {
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
  roofStyle: 'hip' | 'gable' | 'mansard' | 'flat';
  hasChimney?: boolean;
  hasPorch?: boolean;
  district: 'foosha' | 'gray-terminal' | 'goa-edge' | 'goa-center' | 'goa-high' | 'colubo';
}

export interface DawnTreeSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  scale: number;
  tint: number;
  kind: 'broadleaf' | 'pine' | 'cypress' | 'palm';
}

export interface DawnRockSpec {
  x: number;
  z: number;
  y: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  yaw: number;
  tint?: number;
}

export interface DawnFenceSpec {
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

export interface DawnWallSpec {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  tier: 'outer' | 'inner' | 'high';
}

export interface DawnCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

export const DAWN_LANDMARKS = {
  partysBar: { x: 60.5, z: -15.6, y: DAWN_FOOSHA_Y, yaw: 0 },
  fooshaWindmill: { x: 52.5, z: -24.5, y: DAWN_WINDMILL_Y, yaw: 0.32 },
  fooshaPier: { x: 80.5, z: -12.0, y: DAWN_PIER_Y },
  mayorHouse: { x: 72.8, z: -17.6, y: DAWN_FOOSHA_Y, yaw: -0.25 },
  redForce: { x: 96.5, z: -11.5, y: 0.12, yaw: -1.38 },
  luffyDinghy: { x: 83.8, z: -9.8, y: 0.08, yaw: 1.4 },
  dadanHut: { x: 24.5, z: 18.8, y: DAWN_DADAN_Y, yaw: -2.45 },
  aslTreehouse: { x: 6.5, z: 12.0, y: 11.4, yaw: 0.4 },
  goaGreatGate: { x: -29.0, z: -14.0, y: DAWN_GOA_EDGE_Y },
  goaInnerGate: { x: -45.0, z: -14.0, y: DAWN_GOA_EDGE_Y },
  goaFountain: { x: -56.0, z: -14.0, y: DAWN_GOA_CENTER_Y },
  goaHighStairs: { x: -69.0, z: -14.0, y: DAWN_GOA_CENTER_Y },
  goaPalace: { x: -84.0, z: -14.0, y: DAWN_GOA_HIGH_Y },
} as const;

export const DAWN_GOA_WALLS: readonly DawnWallSpec[] = [
  // Outer Wall along x = -29 (leaving Great Gate opening for z in [-16.6, -11.4])
  { id: 'outer-wall-n', x: -29.0, z: -26.8, width: 2.2, depth: 20.4, height: 5.2, tier: 'outer' },
  { id: 'outer-wall-s', x: -29.0, z: -1.2, width: 2.2, depth: 20.4, height: 5.2, tier: 'outer' },
  // Outer N & S perimeter walls framing Edge + Center Town
  { id: 'outer-rim-n', x: -49.5, z: -36.5, width: 42.0, depth: 2.0, height: 4.6, tier: 'outer' },
  { id: 'outer-rim-s', x: -49.5, z: 8.5, width: 42.0, depth: 2.0, height: 4.6, tier: 'outer' },
  // Inner Wall along x = -45 (leaving Inner Gate opening for z in [-16.4, -11.6])
  { id: 'inner-wall-n', x: -45.0, z: -26.5, width: 1.8, depth: 20.2, height: 4.8, tier: 'inner' },
  { id: 'inner-wall-s', x: -45.0, z: -1.5, width: 1.8, depth: 20.2, height: 4.8, tier: 'inner' },
  // High Town Retaining Citadel Wall along x = -69 (leaving Grand Staircase z in [-17.2, -10.8])
  { id: 'high-wall-n', x: -69.0, z: -24.2, width: 2.0, depth: 14.0, height: 5.4, tier: 'high' },
  { id: 'high-wall-s', x: -69.0, z: -3.8, width: 2.0, depth: 14.0, height: 5.4, tier: 'high' },
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

/**
 * Signed distance (< 0 inside road/plaza, > 0 outside) to all Dawn Island paths:
 * Foosha streets & pier, Partys Bar crossroads, Windmill bluff path, Mt. Colubo
 * switchbacks to Dadan's Hut & ASL treehouse, Gray Terminal scrap lane, and Goa avenues.
 */
export function dawnRoadSignedDist(x: number, z: number): number {
  let minD = 999;

  const segments: readonly [number, number, number, number, number][] = [
    // 1. Foosha Harbor Pier & Beach approach -> Partys Bar Crossroads
    [86.5, -12.0, 74.0, -12.0, 1.55],
    [74.0, -12.0, 67.5, -11.5, 2.0],
    [67.5, -11.5, 60.5, -10.0, 2.3],
    // Partys Bar front terrace apron
    [57.5, -10.8, 63.5, -10.8, 2.4],
    // Foosha Main Road west toward Midway Forest
    [60.5, -10.0, 52.0, -8.8, 1.9],
    [52.0, -8.8, 43.5, -8.0, 1.9],

    // 2. Foosha Village Windmill Hill Path & North Cottage Lane
    [60.5, -10.0, 57.5, -17.5, 1.55],
    [57.5, -17.5, 53.5, -22.2, 1.55],
    [67.5, -11.5, 69.0, -21.5, 1.55],
    [69.0, -21.5, 60.5, -24.5, 1.45],

    // 3. Foosha South Meadow Loop
    [67.5, -11.5, 66.5, -2.5, 1.6],
    [66.5, -2.5, 57.0, 1.0, 1.6],
    [57.0, 1.0, 48.0, -2.5, 1.6],
    [48.0, -2.5, 43.5, -8.0, 1.6],

    // 4. Mont Corvo (Mt. Colubo) Switchback Trail -> Dadan's Hut & ASL Treehouse
    [43.5, -8.0, 39.0, 1.0, 1.65],
    [39.0, 1.0, 32.0, 8.5, 1.65],
    [32.0, 8.5, 21.0, 13.5, 2.2], // Dadan clearing entrance
    [21.0, 13.5, 10.5, 12.0, 1.65],
    [10.5, 12.0, 4.5, 5.5, 1.6], // Past ASL Giant Treehouse ridge
    [4.5, 5.5, -4.5, -2.0, 1.65],
    [-4.5, -2.0, -11.0, -10.0, 1.7],

    // 5. Midway Forest Direct Highway (Foosha -> Gray Terminal)
    [43.5, -8.0, 27.0, -9.5, 1.75],
    [27.0, -9.5, 8.0, -7.5, 1.75],
    [8.0, -7.5, -11.0, -10.0, 1.8],

    // 6. Gray Terminal Approach -> Goa Great Gate
    [-11.0, -10.0, -20.5, -13.2, 2.1],
    [-20.5, -13.2, -29.0, -14.0, 2.4],

    // 7. Goa Kingdom Royal Spine (Great Gate -> Edge -> Inner Gate -> Center Plaza -> High Town -> Palace)
    [-29.0, -14.0, -45.0, -14.0, 2.4],
    [-45.0, -14.0, -68.5, -14.0, 2.8],
    [-68.5, -14.0, -79.5, -14.0, 2.7],
    // Goa Edge Town Cross Avenue
    [-37.0, -28.0, -37.0, 0.0, 1.9],
    // Goa Center Town Cross Avenues & Fountain Square
    [-56.0, -29.5, -56.0, 2.0, 2.4],
    [-63.5, -24.5, -63.5, -3.5, 1.9],
    // Goa High Town Promenade & Western Harbor Descent
    [-76.5, -24.0, -76.5, -4.0, 2.1],
    [-89.5, -14.0, -95.0, -14.0, 1.9],
  ];

  for (const [ax, az, bx, bz, halfW] of segments) {
    const d = distToSegment2D(x, z, ax, az, bx, bz) - halfW;
    if (d < minD) minD = d;
  }

  // Central Goa Center Town Fountain Circle Plaza
  const plazaDist = Math.hypot(x + 56.0, z + 14.0) - 5.2;
  if (plazaDist < minD) minD = plazaDist;

  // Dadan clearing yard
  const dadanDist = Math.hypot(x - 20.5, z - 14.5) - 4.0;
  if (dadanDist < minD) minD = dadanDist;

  return minD;
}

export function isNearGoaWall(x: number, z: number, margin = 1.1): boolean {
  for (const w of DAWN_GOA_WALLS) {
    if (
      Math.abs(x - w.x) <= w.width * 0.5 + margin &&
      Math.abs(z - w.z) <= w.depth * 0.5 + margin
    ) {
      return true;
    }
  }
  return false;
}

export function isInGoaKingdom(x: number, z: number): boolean {
  return x >= -96 && x <= -28.2 && z >= -37.5 && z <= 9.5;
}

export function isInGoaEdgeTown(x: number, z: number): boolean {
  return x >= -44.6 && x <= -29.0 && z >= -35.5 && z <= 7.5;
}

export function isInGoaCenterTown(x: number, z: number): boolean {
  return x >= -68.6 && x < -44.6 && z >= -35.5 && z <= 7.5;
}

export function isInGoaHighTown(x: number, z: number): boolean {
  return x >= -90.5 && x < -68.6 && z >= -29.5 && z <= 1.5;
}

export function isInGrayTerminal(x: number, z: number): boolean {
  return x > -28.2 && x <= -3.5 && z >= -26.0 && z <= 7.5;
}

export function sampleFooshaBayBeachMask(x: number, z: number): number {
  const dx = (x - 78.5) / 11.5;
  const dz = (z + 11.5) / 18.5;
  return 1 - smoothstep(0.55, 1.05, Math.hypot(dx, dz));
}

function ridgedNoise2D(x: number, z: number): number {
  const n1 = 1 - Math.abs(valueNoise2D(x, z) * 2 - 1);
  const n2 = 1 - Math.abs(valueNoise2D(x * 2.13 + 5.7, z * 2.13 + 1.9) * 2 - 1);
  return clamp(n1 * 0.68 + n2 * 0.32, 0, 1);
}

function sampleDawnOuterLandMask(x: number, z: number): number {
  // 1. Goa Kingdom Western Peninsula
  const goaLobe =
    1 - smoothstep(0.56, 1.12, Math.hypot((x + 62) / 45, (z + 14) / 39));
  // 2. Central Neck (Gray Terminal + Midway Forest)
  const centralLobe =
    1 - smoothstep(0.54, 1.12, Math.hypot((x + 6) / 41, (z + 4) / 35));
  // 3. Mont Corvo / Mt. Colubo Southern-Central Massif
  const coluboLobe =
    1 - smoothstep(0.56, 1.12, Math.hypot((x - 16) / 48, (z - 22) / 37));
  // 4. Foosha Village Eastern Wing
  const fooshaLobe =
    1 - smoothstep(0.54, 1.10, Math.hypot((x - 62) / 39, (z + 11) / 36));
  // 5. NE Cape framing Foosha Harbor Bay from the north
  const northCape =
    1 - smoothstep(0.46, 1.14, Math.hypot((x - 84) / 16.5, (z + 34) / 12.0));
  // 6. SE Cape framing Foosha Harbor Bay from the south
  const southCape =
    1 - smoothstep(0.46, 1.14, Math.hypot((x - 76) / 17.5, (z - 14) / 14.0));

  const coastNoise =
    (valueNoise2D(x * 0.052 + 4.3, z * 0.052 + 7.1) - 0.5) * 0.14 +
    Math.sin(Math.atan2(z, x) * 6.0) * 0.03;

  let mainMask = clamp(
    Math.max(goaLobe, centralLobe, coluboLobe, fooshaLobe, northCape, southCape) +
      coastNoise,
    0,
    1
  );

  // Carve sheltered Foosha Crescent Harbor Bay on the East coast (x ~ 82..112, z ~ -25..+4)
  const fooshaBayCut =
    1 - smoothstep(0.42, 1.04, Math.hypot((x - 96.5) / 21.8, (z + 11.5) / 17.8));
  mainMask *= 1 - fooshaBayCut * 0.96;

  // Carve Western Royal Sea Gate inlet off Goa High Town
  const goaBayCut =
    1 - smoothstep(0.44, 1.05, Math.hypot((x + 106.0) / 13.0, (z + 14.0) / 14.0));
  mainMask *= 1 - goaBayCut * 0.9;

  // Small offshore rocky sea stacks / satellite islets
  const seIslet =
    1 - smoothstep(0.52, 1.08, Math.hypot((x - 98) / 9.0, (z - 26) / 8.0));
  const nwIslet =
    1 - smoothstep(0.52, 1.08, Math.hypot((x + 88) / 8.5, (z + 48) / 7.0));

  // Ensure seabed always closes cleanly inside the 280x280 terrain plane
  const boundsFade = 1 - smoothstep(0.84, 0.98, Math.hypot(x / 136, z / 136));

  return clamp(Math.max(mainMask, seIslet, nwIslet) * boundsFade, 0, 1);
}

/**
 * Mont Corvo (Mt. Colubo) sculpted ridged massif, twin peaks, radiating spurs,
 * northern coastal cordillera, and Foosha Windmill bluff.
 */
function sampleDawnMountainRelief(x: number, z: number): number {
  let ridge = 0;

  // Multi-octave ridge & rock strata texture for natural peaks (never flat domes)
  const ridgeDetail = ridgedNoise2D(x * 0.075 + 2.1, z * 0.075 + 4.4);
  const fineCrag = ridgedNoise2D(x * 0.16 + 8.3, z * 0.16 + 3.2);

  // 1. Mt. Colubo Main Massif, Saddle Ridge & Twin Craggy Peaks
  const mainMassEnv = 1 - smoothstep(0.22, 1.05, Math.hypot((x - 16) / 44, (z - 22) / 31));
  const mainMass = mainMassEnv * (11.5 + ridgeDetail * 4.4);

  // Radiating crest spine linking West Summit (9,35) <-> East Twin Peak (32,27) <-> SE Spur (56,22)
  const spineDist = distToSegment2D(x, z, 5, 36, 33, 27);
  const centralSpine = (1 - smoothstep(2.0, 22.0, spineDist)) * (14.2 + ridgeDetail * 5.2);

  const seSpurDist = distToSegment2D(x, z, 32, 27, 57, 20);
  const seSpur = (1 - smoothstep(2.0, 16.5, seSpurDist)) * (8.4 + ridgeDetail * 3.8);

  const swSpurDist = distToSegment2D(x, z, 9, 35, -14, 29);
  const swSpur = (1 - smoothstep(2.0, 16.0, swSpurDist)) * (10.5 + ridgeDetail * 4.0);

  const peakWestEnv = 1 - smoothstep(0.06, 0.95, Math.hypot((x - 9) / 18.5, (z - 34.5) / 15.5));
  const peakWest = peakWestEnv * (24.5 + ridgeDetail * 4.6 + fineCrag * 1.6);

  const peakEastEnv = 1 - smoothstep(0.08, 0.95, Math.hypot((x - 31.5) / 17.0, (z - 27.0) / 14.5));
  const peakEast = peakEastEnv * (19.8 + ridgeDetail * 4.2 + fineCrag * 1.4);

  ridge = Math.max(ridge, mainMass, centralSpine, seSpur, swSpur, peakWest, peakEast);

  // 2. Foosha Windmill Coastal Bluff (x ~ 52.5, z ~ -24.5)
  const windmillHill =
    (1 - smoothstep(0.22, 1.02, Math.hypot((x - 52.5) / 11.5, (z + 24.5) / 9.5))) *
    DAWN_WINDMILL_Y;
  ridge = Math.max(ridge, windmillHill);

  // 3. Northern Cordillera behind Midway Forest & Foosha North (sculpted twin crests)
  const northSpineDist = distToSegment2D(x, z, -16, -32, 42, -31);
  const northCordillera =
    (1 - smoothstep(2.5, 16.0, northSpineDist)) * (10.2 + ridgeDetail * 5.4);
  const northEastPeak =
    (1 - smoothstep(0.15, 0.98, Math.hypot((x - 24) / 18, (z + 30) / 11))) *
    (12.2 + ridgeDetail * 4.0);
  ridge = Math.max(ridge, northCordillera, northEastPeak);

  // 4. SE Cape Sea Bluff overlooking Red Force anchorage (tapers cleanly before shoreline)
  const seCapeHill =
    (1 - smoothstep(0.18, 0.98, Math.hypot((x - 71.5) / 11.5, (z - 12.5) / 9.5))) *
    (7.6 + ridgeDetail * 2.8);
  ridge = Math.max(ridge, seCapeHill);

  // 5. NE Cape Headland Crest north of Foosha Bay
  const neCapeHill =
    (1 - smoothstep(0.18, 0.96, Math.hypot((x - 79.0) / 11.0, (z + 32.0) / 8.5))) *
    (6.2 + ridgeDetail * 2.4);
  ridge = Math.max(ridge, neCapeHill);

  // 6. NW Goa Headland Crest above Royal Estate Cliffs
  const goaNorthRidge =
    (1 - smoothstep(0.2, 0.98, Math.hypot((x + 68) / 24, (z + 40) / 9.5))) *
    (8.6 + ridgeDetail * 3.0);
  ridge = Math.max(ridge, goaNorthRidge);

  return ridge;
}

/**
 * Master height sampler for Dawn Island:
 * - Deep opaque seabed skirt down to -4.8m (eliminates see-through water gaps)
 * - Gentle shoal (-0.45m) -> golden sandy shoreline beach (-0.45..+1.55m) -> green meadows
 * - Foosha Crescent Beach ~ 1.35 -> Foosha Village Meadow ~ 3.2 -> Windmill Bluff ~ 5.9
 * - Gray Terminal ~ 3.05 (bumpy ash terrain)
 * - Goa Kingdom tiered city: Edge Town 3.8 -> Center Town 6.4 -> High Town Palace Terrace 10.4
 * - Mont Corvo (Mt. Colubo): Dadan Clearing ~ 11.2, Ridged Twin Peaks ~ 28m
 */
export function sampleDawnHeight(x: number, z: number): number {
  const landMask = sampleDawnOuterLandMask(x, z);
  let h = -4.8 + (valueNoise2D(x * 0.08, z * 0.08) - 0.5) * 0.24;

  if (landMask > 0.01) {
    // Deep submerged sandy shoal (-4.8m -> -0.45m), wide sandy beach (-0.45m -> +1.65m), coastal meadow (+1.65m -> +3.15m)
    const shoalT = smoothstep(0.01, 0.28, landMask);
    const beachSlope = smoothstep(0.28, 0.62, landMask);
    const inland = smoothstep(0.62, 0.88, landMask);
    h = -4.8 + shoalT * 4.35 + beachSlope * 2.1 + inland * 1.5;
  }

  // Mountain relief (Mt. Colubo ridged peaks & spurs, Windmill hill, northern cordillera)
  // Gated by landMask >= 0.44 so sandy shorelines always slope gently into the sea
  const mountainH = sampleDawnMountainRelief(x, z);
  if (mountainH > 0.05 && landMask > 0.44) {
    h = Math.max(h, 0.9 + mountainH * smoothstep(0.44, 0.74, landMask));
  }

  // Foosha Village Gentle Emerald Basin (x in [43..78], z in [-28..8])
  const fooshaBlend =
    (1 - smoothstep(0, 6.0, Math.max(Math.abs(x - 60) - 16, Math.abs(z + 10) - 15))) *
    smoothstep(0.32, 0.62, landMask);
  if (fooshaBlend > 0.01) {
    const gentleRoll = Math.sin(x * 0.11) * Math.cos(z * 0.11) * 0.32;
    const windmillLift =
      (1 - smoothstep(0.3, 1.05, Math.hypot((x - 52.5) / 8.5, (z + 24.5) / 7.0))) *
      (DAWN_WINDMILL_Y - DAWN_FOOSHA_Y);
    const targetFooshaY = DAWN_FOOSHA_Y + gentleRoll + windmillLift;
    h = h * (1 - fooshaBlend) + targetFooshaY * fooshaBlend;
  }

  // Carve Foosha Crescent Sandy Beach gently down into harbor water
  const beachMask = sampleFooshaBayBeachMask(x, z);
  if (beachMask > 0.01 && landMask > 0.02) {
    const shoreSlope = clamp((85.5 - x) / 14.5, 0, 1);
    const targetBeachY = -0.75 + shoreSlope * 3.05;
    h = h * (1 - beachMask * 0.92) + targetBeachY * (beachMask * 0.92);
  }

  // Curly Dadan's Bandit Hut Clearing Terrace on Mt. Colubo (x ~ 21, z ~ 15)
  const dadanBlend =
    1 - smoothstep(0.38, 1.02, Math.hypot((x - 22.0) / 10.5, (z - 16.0) / 9.0));
  if (dadanBlend > 0.01) {
    h = h * (1 - dadanBlend) + DAWN_DADAN_Y * dadanBlend;
  }

  // ASL Giant Treehouse Ridge Terrace (x ~ 6.5, z ~ 12.0)
  const aslBlend =
    1 - smoothstep(0.35, 1.0, Math.hypot((x - 6.5) / 6.5, (z - 12.0) / 6.0));
  if (aslBlend > 0.01) {
    h = h * (1 - aslBlend) + 11.4 * aslBlend;
  }

  // Gray Terminal Depressed Scrapyard Basin (x in [-28..-4], z in [-25..7])
  const grayBlend =
    (1 - smoothstep(0, 4.5, Math.max(Math.abs(x + 16) - 10.5, Math.abs(z + 9) - 13.5))) *
    smoothstep(0.34, 0.62, landMask);
  if (grayBlend > 0.01) {
    const scrapRough = (valueNoise2D(x * 0.25 + 9.2, z * 0.25 + 2.1) - 0.5) * 0.85;
    const roadClear = dawnRoadSignedDist(x, z) < 0.8 ? 0.15 : 1.0;
    h = h * (1 - grayBlend) + (DAWN_GRAY_Y + scrapRough * roadClear) * grayBlend;
  }

  // Goa Kingdom Stratified Stone Plateaus (Edge Town -> Center Town -> High Town)
  // 1. Edge Town (x in [-45..-29], z in [-35..7])
  const edgeBlend =
    (1 - smoothstep(0, 2.5, Math.max(Math.abs(x + 37) - 7.2, Math.abs(z + 14) - 20.5))) *
    smoothstep(0.34, 0.62, landMask);
  if (edgeBlend > 0.01) {
    h = h * (1 - edgeBlend) + DAWN_GOA_EDGE_Y * edgeBlend;
  }

  // 2. Center Town (x in [-69..-45], z in [-35..7])
  const centerBlend =
    (1 - smoothstep(0, 2.5, Math.max(Math.abs(x + 57) - 11.2, Math.abs(z + 14) - 20.5))) *
    smoothstep(0.34, 0.62, landMask);
  if (centerBlend > 0.01) {
    h = h * (1 - centerBlend) + DAWN_GOA_CENTER_Y * centerBlend;
  }

  // 3. High Town Citadel & Royal Palace Plateau (x in [-90..-69], z in [-29..1])
  const highBlend =
    (1 - smoothstep(0, 2.4, Math.max(Math.abs(x + 79.5) - 9.8, Math.abs(z + 14) - 14.2))) *
    smoothstep(0.34, 0.62, landMask);
  if (highBlend > 0.01) {
    h = h * (1 - highBlend) + DAWN_GOA_HIGH_Y * highBlend;
  }

  // 4. Western Royal Harbor Quay (x in [-98..-90], z in [-22..-6])
  const quayBlend =
    (1 - smoothstep(0, 2.2, Math.max(Math.abs(x + 94) - 3.6, Math.abs(z + 14) - 7.5))) *
    smoothstep(0.28, 0.56, landMask);
  if (quayBlend > 0.01) {
    h = h * (1 - quayBlend) + DAWN_GOA_QUAY_Y * quayBlend;
  }

  // Smooth walkable grade along Mt. Colubo Switchback & Midway Forest trails
  const roadD = dawnRoadSignedDist(x, z);
  if (roadD < 1.25 && x > -28 && x < 48 && z > -20 && z < 24) {
    const roadBlend = 1 - smoothstep(-0.2, 1.25, roadD);
    if (z > 0) {
      // Mountain switchback smooth ramp between Foosha (3.2m), Dadan (11.2m), ASL (11.4m), and Gray Terminal (3.05m)
      let targetRoadY = DAWN_DADAN_Y;
      if (x > 22) {
        const t = clamp((43.5 - x) / (43.5 - 22.0), 0, 1);
        targetRoadY = DAWN_FOOSHA_Y + t * (DAWN_DADAN_Y - DAWN_FOOSHA_Y);
      } else if (x < 4.5) {
        const t = clamp((4.5 - x) / (4.5 - -11.0), 0, 1);
        targetRoadY = 11.4 - t * (11.4 - DAWN_GRAY_Y);
      }
      h = h * (1 - roadBlend * 0.78) + targetRoadY * (roadBlend * 0.78);
    } else if (x > -12 && x < 44) {
      // Midway forest path gentle rise
      const tProg = clamp((x + 11) / 55, 0, 1);
      const midFloor = DAWN_GRAY_Y + Math.sin(tProg * Math.PI) * 2.4 + tProg * 0.15;
      h = Math.min(h, h * (1 - roadBlend * 0.72) + midFloor * (roadBlend * 0.72));
    }
  }

  return h;
}

/**
 * Walkable surface sampler for human-scale street walking, Foosha pier,
 * and Goa's stepped stone ramps & monumental staircases.
 */
export function sampleDawnWalkSurfaceHeight(x: number, z: number): number {
  const h = sampleDawnHeight(x, z);

  // Foosha Harbor Wooden Pier (x in [73.5..87.2], z in [-14.0..-10.0])
  if (x >= 73.5 && x <= 87.2 && z >= -14.0 && z <= -10.0) {
    return Math.max(h, DAWN_PIER_Y);
  }

  // Goa Inner Gate Stepped Ramp (x in [-47.8..-42.2], z in [-16.8..-11.2])
  if (x >= -47.8 && x <= -42.2 && z >= -16.8 && z <= -11.2) {
    const t = clamp((-42.2 - x) / 5.6, 0, 1);
    return Math.max(h, DAWN_GOA_EDGE_Y + t * (DAWN_GOA_CENTER_Y - DAWN_GOA_EDGE_Y));
  }

  // Goa High Town Grand Ceremonial Staircase (x in [-72.2..-65.8], z in [-17.4..-10.6])
  if (x >= -72.2 && x <= -65.8 && z >= -17.4 && z <= -10.6) {
    const t = clamp((-65.8 - x) / 6.4, 0, 1);
    return Math.max(h, DAWN_GOA_CENTER_Y + t * (DAWN_GOA_HIGH_Y - DAWN_GOA_CENTER_Y));
  }

  return h;
}

/**
 * Generates all houses across Foosha Village, Gray Terminal, Goa Edge/Center/High Town.
 * (Hero landmarks Partys Bar, Foosha Windmill, Dadan's Hut, ASL Treehouse & Goa Royal Palace
 * are constructed as bespoke multi-part groups in dawn.ts.)
 */
export function buildDawnBuildings(): DawnBuildingSpec[] {
  const buildings: DawnBuildingSpec[] = [];

  const roofStraw = 0xcbb26a;
  const roofTerracotta = 0xc65a37;
  const roofSlate = 0x4b6a92;
  const roofOchre = 0xd6a03b;
  const roofGoaBlue = 0x2d588a;
  const roofRust = 0x7c4a3a;

  // 1. Foosha Village Cozy Coastal Cottages (clearly spaced off paths & around Partys Bar)
  const fooshaSpots: Array<{
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    yaw: number;
    roof: number;
    style: 'gable' | 'hip';
  }> = [
    { x: 52.0, z: -14.8, w: 3.6, d: 2.8, h: 2.2, yaw: 0.08, roof: roofStraw, style: 'gable' },
    { x: 72.8, z: -17.6, w: 4.2, d: 3.2, h: 2.6, yaw: -0.25, roof: roofTerracotta, style: 'hip' }, // Mayor Woop Slap's House
    { x: 64.5, z: -17.2, w: 3.3, d: 2.7, h: 2.1, yaw: 0.15, roof: roofSlate, style: 'gable' },
    { x: 64.5, z: -27.2, w: 3.5, d: 2.8, h: 2.2, yaw: -0.1, roof: roofOchre, style: 'gable' },
    { x: 74.0, z: -25.0, w: 3.4, d: 2.7, h: 2.1, yaw: 0.28, roof: roofTerracotta, style: 'gable' },
    { x: 69.8, z: -6.2, w: 3.5, d: 2.8, h: 2.2, yaw: -0.16, roof: roofStraw, style: 'gable' },
    { x: 60.5, z: -4.2, w: 3.4, d: 2.7, h: 2.1, yaw: 0.12, roof: roofSlate, style: 'gable' },
    { x: 53.5, z: -3.5, w: 3.3, d: 2.7, h: 2.1, yaw: -0.12, roof: roofOchre, style: 'gable' },
    { x: 61.5, z: 4.5, w: 3.6, d: 2.9, h: 2.2, yaw: 0.22, roof: roofTerracotta, style: 'hip' },
    { x: 52.5, z: 5.0, w: 3.2, d: 2.6, h: 2.0, yaw: -0.22, roof: roofStraw, style: 'gable' },
    { x: 47.0, z: -13.8, w: 3.4, d: 2.7, h: 2.1, yaw: 0.18, roof: roofTerracotta, style: 'gable' },
    { x: 60.5, z: -20.5, w: 3.2, d: 2.6, h: 2.1, yaw: -0.08, roof: roofStraw, style: 'gable' },
  ];

  fooshaSpots.forEach((s, i) => {
    buildings.push({
      id: `foosha-house-${i}`,
      x: s.x,
      z: s.z,
      y: sampleDawnHeight(s.x, s.z),
      width: s.w,
      depth: s.d,
      height: s.h,
      yaw: s.yaw,
      wallColor: i % 3 === 0 ? 0xf6eedb : i % 3 === 1 ? 0xefe1cb : 0xe9e6dd,
      roofColor: s.roof,
      roofStyle: s.style,
      hasChimney: i % 2 === 0,
      hasPorch: i % 3 === 0,
      district: 'foosha',
    });
  });

  // 2. Gray Terminal Scrapyard Shacks (outside main road, rustic weathered corrugated hues)
  const graySpots: Array<{ x: number; z: number; w: number; d: number; h: number; yaw: number }> = [
    { x: -16.5, z: -6.5, w: 2.8, d: 2.3, h: 1.7, yaw: 0.35 },
    { x: -22.5, z: -6.8, w: 3.0, d: 2.4, h: 1.8, yaw: -0.25 },
    { x: -15.5, z: -19.5, w: 2.9, d: 2.4, h: 1.7, yaw: 0.18 },
    { x: -23.0, z: -20.2, w: 3.1, d: 2.5, h: 1.8, yaw: -0.4 },
    { x: -11.0, z: -2.8, w: 2.7, d: 2.2, h: 1.6, yaw: 0.5 },
    { x: -24.5, z: 0.5, w: 2.8, d: 2.3, h: 1.7, yaw: -0.15 },
  ];
  graySpots.forEach((g, i) => {
    buildings.push({
      id: `gray-shack-${i}`,
      x: g.x,
      z: g.z,
      y: sampleDawnHeight(g.x, g.z),
      width: g.w,
      depth: g.d,
      height: g.h,
      yaw: g.yaw,
      wallColor: i % 2 === 0 ? 0x8f7e6c : 0x766c62,
      roofColor: roofRust,
      roofStyle: 'flat',
      district: 'gray-terminal',
    });
  });

  // 3. Goa Kingdom Edge Town Humble Townhouses
  const edgeSpots: Array<{ x: number; z: number; w: number; d: number; h: number; yaw: number }> = [
    { x: -33.2, z: -20.5, w: 3.2, d: 2.7, h: 2.2, yaw: 0 },
    { x: -33.2, z: -26.0, w: 3.3, d: 2.8, h: 2.3, yaw: 0 },
    { x: -33.2, z: -7.5, w: 3.2, d: 2.7, h: 2.2, yaw: 0 },
    { x: -33.2, z: -2.0, w: 3.3, d: 2.8, h: 2.1, yaw: 0 },
    { x: -41.0, z: -20.5, w: 3.3, d: 2.7, h: 2.3, yaw: 0 },
    { x: -41.0, z: -26.5, w: 3.4, d: 2.8, h: 2.3, yaw: 0 },
    { x: -41.0, z: -7.5, w: 3.3, d: 2.7, h: 2.2, yaw: 0 },
    { x: -41.0, z: -1.5, w: 3.4, d: 2.8, h: 2.2, yaw: 0 },
  ];
  edgeSpots.forEach((e, i) => {
    buildings.push({
      id: `goa-edge-${i}`,
      x: e.x,
      z: e.z,
      y: sampleDawnHeight(e.x, e.z),
      width: e.w,
      depth: e.d,
      height: e.h,
      yaw: e.yaw,
      wallColor: i % 2 === 0 ? 0xded3be : 0xd2c8b8,
      roofColor: i % 2 === 0 ? roofSlate : roofTerracotta,
      roofStyle: 'gable',
      district: 'goa-edge',
    });
  });

  // 4. Goa Kingdom Center Town European Boulevards
  const centerSpots: Array<{ x: number; z: number; w: number; d: number; h: number; roof: number }> = [
    { x: -50.2, z: -20.5, w: 3.8, d: 3.0, h: 2.8, roof: roofGoaBlue },
    { x: -50.2, z: -26.5, w: 3.6, d: 3.0, h: 2.7, roof: roofTerracotta },
    { x: -50.2, z: -7.5, w: 3.8, d: 3.0, h: 2.8, roof: roofGoaBlue },
    { x: -50.2, z: -1.5, w: 3.6, d: 3.0, h: 2.7, roof: roofOchre },
    { x: -60.0, z: -22.2, w: 3.6, d: 2.9, h: 2.8, roof: roofGoaBlue },
    { x: -60.0, z: -28.0, w: 3.5, d: 2.9, h: 2.7, roof: roofTerracotta },
    { x: -60.0, z: -5.8, w: 3.6, d: 2.9, h: 2.8, roof: roofGoaBlue },
    { x: -60.0, z: 0.2, w: 3.5, d: 2.9, h: 2.7, roof: roofSlate },
    { x: -66.5, z: -21.0, w: 3.4, d: 2.8, h: 2.7, roof: roofGoaBlue },
    { x: -66.5, z: -7.0, w: 3.4, d: 2.8, h: 2.7, roof: roofTerracotta },
  ];
  centerSpots.forEach((c, i) => {
    buildings.push({
      id: `goa-center-${i}`,
      x: c.x,
      z: c.z,
      y: sampleDawnHeight(c.x, c.z),
      width: c.w,
      depth: c.d,
      height: c.h,
      yaw: 0,
      wallColor: i % 2 === 0 ? 0xf7f1e3 : 0xf2e6d0,
      roofColor: c.roof,
      roofStyle: i % 3 === 0 ? 'mansard' : 'hip',
      hasChimney: i % 2 === 0,
      district: 'goa-center',
    });
  });

  // 5. Goa Kingdom High Town Noble Estates flanking the Royal Palace
  const highSpots: Array<{ x: number; z: number; w: number; d: number; h: number }> = [
    { x: -73.0, z: -21.5, w: 4.2, d: 3.4, h: 3.2 },
    { x: -73.0, z: -6.5, w: 4.2, d: 3.4, h: 3.2 },
    { x: -80.8, z: -23.5, w: 4.5, d: 3.5, h: 3.4 },
    { x: -80.8, z: -4.5, w: 4.5, d: 3.5, h: 3.4 },
  ];
  highSpots.forEach((h, i) => {
    buildings.push({
      id: `goa-high-${i}`,
      x: h.x,
      z: h.z,
      y: sampleDawnHeight(h.x, h.z),
      width: h.w,
      depth: h.d,
      height: h.h,
      yaw: 0,
      wallColor: 0xfbf7ee,
      roofColor: roofGoaBlue,
      roofStyle: 'mansard',
      hasChimney: true,
      district: 'goa-high',
    });
  });

  return buildings;
}

/**
 * Generates wooden post-and-rail roadside fences along Foosha Village paths & meadows.
 */
export function buildDawnFences(): DawnFenceSpec[] {
  return [
    { ax: 55.5, az: -12.8, bx: 50.5, bz: -12.0 },
    { ax: 65.5, az: -13.2, bx: 72.5, bz: -14.2 },
    { ax: 63.0, az: -7.0, bx: 55.5, bz: -6.2 },
    { ax: 59.5, az: -19.5, bx: 56.5, bz: -23.2 },
    { ax: 47.0, az: -5.5, bx: 53.5, bz: -1.8 },
  ];
}

/**
 * Generates lush East Blue forests across Mont Corvo, Midway Forest,
 * Foosha hillsides, and coastal palms around Foosha Crescent Bay.
 */
export function buildDawnTrees(): DawnTreeSpec[] {
  const trees: DawnTreeSpec[] = [];
  let idx = 0;

  const pushTree = (
    x: number,
    z: number,
    scale: number,
    kind: DawnTreeSpec['kind']
  ) => {
    const y = sampleDawnHeight(x, z);
    if (y < 1.35) return;
    if (dawnRoadSignedDist(x, z) < 0.75) return;
    if (isNearGoaWall(x, z, 2.2)) return;
    if (isInGoaKingdom(x, z)) return;
    if (isInGrayTerminal(x, z)) return;
    if (sampleFooshaBayBeachMask(x, z) > 0.38) return;
    // Keep clear radius around hero buildings
    if (Math.hypot(x - DAWN_LANDMARKS.partysBar.x, z - DAWN_LANDMARKS.partysBar.z) < 5.5) return;
    if (Math.hypot(x - DAWN_LANDMARKS.fooshaWindmill.x, z - DAWN_LANDMARKS.fooshaWindmill.z) < 5.2) return;
    if (Math.hypot(x - DAWN_LANDMARKS.dadanHut.x, z - DAWN_LANDMARKS.dadanHut.z) < 4.8) return;
    if (Math.hypot(x - DAWN_LANDMARKS.aslTreehouse.x, z - DAWN_LANDMARKS.aslTreehouse.z) < 4.5) return;

    trees.push({
      id: `dawn-tree-${idx++}`,
      x,
      z,
      y,
      scale,
      tint: 0.86 + valueNoise2D(x * 0.24, z * 0.24) * 0.28,
      kind,
    });
  };

  // 1. Dense Mont Corvo, Midway Forest & Foosha Outer Groves (Vogel spiral)
  const totalSamples = 250;
  for (let i = 0; i < totalSamples; i++) {
    const ang = i * 2.39996;
    const rad = 6 + Math.sqrt((i + 0.5) / totalSamples) * 76;
    const tx = 16 + Math.cos(ang) * rad * 0.98;
    const tz = 10 + Math.sin(ang) * rad * 0.78;

    // Keep Foosha central village meadow fairly open so houses & paths stand out cleanly
    if (tx > 48 && tx < 76 && tz > -26 && tz < 6 && i % 5 !== 0) continue;
    const h = sampleDawnHeight(tx, tz);
    if (h < 1.8 || h > 20.5) continue;
    const kind: DawnTreeSpec['kind'] =
      h > 10.5 && i % 3 === 0
        ? 'pine'
        : h < 3.4 && tx > 64 && i % 4 === 0
          ? 'palm'
          : 'broadleaf';
    pushTree(tx, tz, 1.15 + (i % 4) * 0.22, kind);
  }

  // 2. Decorative Goa High Town Ornamental Cypress & Palms along outer terraces
  const goaParkTrees: readonly [number, number, DawnTreeSpec['kind']][] = [
    [-73.5, -18.2, 'cypress'],
    [-73.5, -9.8, 'cypress'],
    [-80.2, -18.2, 'cypress'],
    [-80.2, -9.8, 'cypress'],
    [-53.5, -18.5, 'broadleaf'],
    [-53.5, -9.5, 'broadleaf'],
  ];
  for (const [gx, gz, kind] of goaParkTrees) {
    trees.push({
      id: `goa-park-${idx++}`,
      x: gx,
      z: gz,
      y: sampleDawnHeight(gx, gz),
      scale: 1.25,
      tint: 0.96,
      kind,
    });
  }

  // 3. Foosha Bay Coastal Palm Accents
  const palmSpots: readonly [number, number][] = [
    [76.0, -21.5],
    [78.5, -24.5],
    [75.5, -2.5],
    [74.2, 2.5],
  ];
  for (const [px, pz] of palmSpots) {
    pushTree(px, pz, 1.32, 'palm');
  }

  return trees;
}

/**
 * Coastal sea stacks and rocky Mont Corvo cliff outcrops.
 */
export function buildDawnRocks(): DawnRockSpec[] {
  const groundRock = (x: number, z: number, scaleY: number) =>
    Math.max(-0.45, sampleDawnHeight(x, z)) - scaleY * 0.25;
  return [
    { x: 96, z: 24, y: groundRock(96, 24, 3.0), scaleX: 2.9, scaleY: 3.0, scaleZ: 2.6, yaw: 0.5 },
    { x: 94, z: -32, y: groundRock(94, -32, 2.8), scaleX: 2.6, scaleY: 2.8, scaleZ: 2.4, yaw: 1.4 },
    { x: -100, z: -28, y: groundRock(-100, -28, 3.0), scaleX: 2.8, scaleY: 3.0, scaleZ: 2.5, yaw: 0.9 },
    { x: -94, z: 10, y: groundRock(-94, 10, 2.8), scaleX: 2.7, scaleY: 2.8, scaleZ: 2.6, yaw: 2.0 },
    { x: 10, z: 36, y: sampleDawnHeight(10, 36) - 0.8, scaleX: 3.4, scaleY: 2.8, scaleZ: 3.0, yaw: 0.7 },
    { x: 30, z: 28, y: sampleDawnHeight(30, 28) - 0.8, scaleX: 2.9, scaleY: 2.6, scaleZ: 2.7, yaw: 1.8 },
  ];
}

export const DAWN_BUILDINGS: readonly DawnBuildingSpec[] = buildDawnBuildings();
export const DAWN_FENCES: readonly DawnFenceSpec[] = buildDawnFences();
export const DAWN_TREES: readonly DawnTreeSpec[] = buildDawnTrees();
export const DAWN_ROCKS: readonly DawnRockSpec[] = buildDawnRocks();

export function toDawnSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * DAWN_GLOBE_SCALE;
  const sz = z * DAWN_GLOBE_SCALE;
  const rTarget = globeRadius + y * DAWN_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * Curated Overview + Human-Scale Street Views across Dawn Island:
 * Foosha Village, Partys Bar (Luffy & Shanks' tavern), Goa Kingdom High Town,
 * Goa Great Gate / Gray Terminal, and Mont Corvo (Dadan's Bandit Hut).
 */
export const DAWN_CAMERA_PRESETS: DawnCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle:
      'Île de Dawn · Royaume de Goa à l’ouest, Gray Terminal, Mont Corvo au centre-sud, Foosha & baie à l’est',
    position: [4, 118, 152],
    target: [0, 5, -4],
    isStreetView: false,
  },
  {
    id: 'partys-bar',
    label: 'Partys Bar (Taverne)',
    subtitle:
      'Vue à hauteur d’homme devant le Partys Bar où Luffy buvait avec Shanks, sa terrasse, tonneaux et tables sur la place de Foosha',
    position: [67.2, sampleDawnWalkSurfaceHeight(67.2, -5.8) + 1.85, -5.8],
    target: [60.2, DAWN_FOOSHA_Y + 2.05, -14.8],
    isStreetView: true,
  },
  {
    id: 'foosha-village',
    label: 'Village de Foosha',
    subtitle:
      'Vue humaine depuis le ponton du port de Foosha vers Partys Bar, les maisons, le Grand Moulin et le Mont Corvo',
    position: [82.0, sampleDawnWalkSurfaceHeight(82.0, -11.5) + 1.95, -11.5],
    target: [57.5, DAWN_FOOSHA_Y + 2.5, -16.8],
    isStreetView: true,
  },
  {
    id: 'goa-high-town',
    label: 'Goa · High Town',
    subtitle:
      'Vue humaine depuis l’avenue centrale face au Grand Escalier cérémoniel, aux villas nobles et au Palais Royal de Goa',
    position: [-61.2, sampleDawnWalkSurfaceHeight(-61.2, -12.0) + 2.15, -12.0],
    target: [-82.5, DAWN_GOA_HIGH_Y + 3.2, -14.0],
    isStreetView: true,
  },
  {
    id: 'goa-gate',
    label: 'Grande Porte · Gray Terminal',
    subtitle:
      'À hauteur d’homme sur la piste du Gray Terminal face à la Grande Porte fortifiée du Royaume de Goa',
    position: [-19.5, sampleDawnWalkSurfaceHeight(-19.5, -13.0) + 2.1, -13.0],
    target: [-32.0, DAWN_GOA_EDGE_Y + 3.4, -14.0],
    isStreetView: true,
  },
  {
    id: 'mount-colubo',
    label: 'Mont Corvo · Cabane de Dadan',
    subtitle:
      'Vue humaine sur la clairière de Curly Dadan, le feu de camp, la cabane dans l’arbre ASL et les sommets du Mont Corvo',
    position: [30.2, sampleDawnWalkSurfaceHeight(30.2, 9.2) + 2.2, 9.2],
    target: [17.8, DAWN_DADAN_Y + 2.15, 16.8],
    isStreetView: true,
  },
];
