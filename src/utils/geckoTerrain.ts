import { valueNoise2D } from './globeMath';

export const GECKO_WORLD_SIZE = 280;
export const GECKO_GLOBE_SCALE = 0.002;
export const GECKO_GLOBE_CENTER = { u: 0.710, v: 0.250 } as const;
export const GECKO_ANGULAR_MASK_RADIUS = 0.048;

export const GECKO_SYRUP_Y = 3.4;
export const GECKO_MANSION_Y = 5.2;
export const GECKO_HONEY_Y = 6.2;
export const GECKO_QUAY_Y = 2.2;
export const GECKO_BLACK_CAT_BEACH_Y = 1.45;

export const GECKO_SUB_LOCATIONS: Record<string, [number, number]> = {
  'gecko-islands': [0, -6],
  'syrup-village': [-68, 22],
  'honey-town': [60, -24],
  'black-cat-beach': [10, 44],
};

export interface GeckoHouseSpec {
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
  roofStyle: 'hip' | 'gable' | 'mansard';
  hasChimney?: boolean;
  district: 'syrup' | 'honey' | 'black-cat';
}

export interface GeckoTreeSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  scale: number;
  tint: number;
  kind: 'broadleaf' | 'pine' | 'cypress' | 'palm';
}

export interface GeckoRockSpec {
  x: number;
  z: number;
  y: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  yaw: number;
}

export interface GeckoFenceSpec {
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

export interface GeckoCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

export const GECKO_LANDMARKS = {
  kayaMansion: { x: -47.0, z: 22.0, y: GECKO_MANSION_Y },
  kayaGate: { x: -55.0, z: 22.0, y: GECKO_MANSION_Y },
  syrupCrossroads: { x: -66.0, z: 22.0, y: GECKO_SYRUP_Y },
  honeyWestBridge: { x: 41.5, z: -24.0, y: GECKO_HONEY_Y },
  honeyEastBridge: { x: 77.5, z: -16.5, y: GECKO_HONEY_Y },
  honeyFountain: { x: 68.0, z: -29.0, y: GECKO_HONEY_Y },
  blackCatCave: { x: 8.5, z: 35.2, y: GECKO_BLACK_CAT_BEACH_Y },
  bezanBlack: { x: 10.0, z: 56.5, y: 0.15, yaw: -1.56 },
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
 * Signed distance to all walkable dirt roads, coastal entry slopes,
 * Honey Town cobblestone plaza/bridges, and Black Cat cove beach.
 * (< 0 inside road/plaza, > 0 outside).
 */
export function geckoRoadSignedDist(x: number, z: number): number {
  let minD = 999;

  const segments: readonly [number, number, number, number, number][] = [
    // NW coastal slope down into Syrup Village
    [-90.0, -2.0, -82.0, 7.0, 2.0],
    [-82.0, 7.0, -75.0, 14.5, 2.0],
    // SW coastal slope rising into Syrup Village
    [-68.0, 52.0, -68.0, 38.0, 2.1],
    [-68.0, 38.0, -66.0, 22.0, 2.1],

    // Syrup Village Main Avenue leading East straight up to Kaya's Mansion Gate
    [-82.0, 22.0, -55.0, 22.0, 2.2],
    // Kaya's Mansion driveway & inner courtyard walk
    [-55.0, 22.0, -49.5, 22.0, 2.0],

    // Syrup Village Organic Countryside Loop & Knolls
    [-75.0, 14.5, -80.0, 22.0, 1.8],
    [-80.0, 22.0, -76.5, 34.5, 1.8],
    [-76.5, 34.5, -68.0, 38.0, 1.8],
    [-66.0, 22.0, -61.5, 12.5, 1.6],
    [-61.5, 12.5, -75.0, 14.5, 1.6],
    [-68.0, 38.0, -54.0, 35.5, 1.7],
    [-54.0, 35.5, -40.5, 22.0, 1.8],
    [-55.0, 22.0, -40.5, 22.0, 1.9],

    // Winding Central Forest Highway (Syrup -> Valley -> Honey Town West Bridge)
    [-40.5, 22.0, -33.5, 9.0, 1.9],
    [-33.5, 9.0, -28.0, -8.0, 1.9],
    [-28.0, -8.0, -14.0, -24.5, 1.9],
    [-14.0, -24.5, 8.0, -27.5, 1.9],
    [8.0, -27.5, 28.0, -24.5, 1.9],
    [28.0, -24.5, 44.0, -24.0, 2.0],

    // Honey Town Stone Bridges & Main Plaza Avenues
    [44.0, -24.0, 62.0, -23.0, 3.0],
    [62.0, -23.0, 76.0, -17.0, 2.8],
    [57.0, -23.5, 58.8, -35.5, 1.8],
    [60.5, -23.0, 67.5, -28.5, 2.2],
    [76.0, -17.0, 86.0, -14.0, 2.2],
    // Honey Town East Harbor Quay Promenade
    [81.5, -15.5, 76.5, 10.5, 2.4],

    // Black Cat Cove Sandy Beach Walk
    [-2.0, 41.5, 20.0, 41.5, 2.2],
    [8.5, 38.0, 8.5, 44.5, 2.2],
  ];

  for (const [ax, az, bx, bz, halfW] of segments) {
    const d = distToSegment2D(x, z, ax, az, bx, bz) - halfW;
    if (d < minD) minD = d;
  }

  return minD;
}

/**
 * Checks whether (x, z) falls inside Kaya's Mansion walled estate courtyard.
 */
export function isInKayaEstate(x: number, z: number): boolean {
  return x >= -55.2 && x <= -39.5 && z >= 12.8 && z <= 31.2;
}

/**
 * Checks whether (x, z) lies inside Honey Town's cobblestone stone plaza/quay.
 */
export function isInHoneyPlaza(x: number, z: number): boolean {
  const mainPlaza = x >= 44.5 && x <= 77.5 && z >= -36.5 && z <= -12.0;
  const eastQuay = x >= 74.5 && x <= 84.5 && z >= -18.0 && z <= 13.0;
  return mainPlaza || eastQuay;
}

/**
 * Checks whether (x, z) lies inside the south-central Black Cat Cove sandy beach.
 */
export function sampleBlackCatBeachMask(x: number, z: number): number {
  const dx = (x - 9.0) / 16.5;
  const dz = (z - 42.0) / 6.2;
  const d = Math.hypot(dx, dz);
  return 1 - smoothstep(0.65, 1.05, d);
}

/**
 * Main island + 3 canonical offshore satellite islets matching gecko_syrup_00c9644e.png.
 */
function sampleGeckoOuterLandMask(x: number, z: number): number {
  // West / Syrup Village lobe
  const syrupLobe =
    1 - smoothstep(0.74, 1.02, Math.hypot((x + 62) / 42, (z - 18) / 36));
  // Central forested & highland plateau lobe
  const centralLobe =
    1 - smoothstep(0.74, 1.04, Math.hypot((x + 6) / 64, (z + 8) / 44));
  // NE Honey Town plateau lobe
  const honeyLobe =
    1 - smoothstep(0.72, 1.02, Math.hypot((x - 60) / 34, (z + 18) / 30));
  // SE forested cape lobe
  const seLobe =
    1 - smoothstep(0.7, 1.02, Math.hypot((x - 52) / 30, (z - 22) / 26));
  // East Honey Town harbor quay spur
  const quaySpur =
    1 - smoothstep(0.65, 1.05, Math.hypot((x - 79) / 13, (z - 0) / 19));

  const mainCoastNoise =
    (valueNoise2D(x * 0.055 + 3.1, z * 0.055 + 8.4) - 0.5) * 0.16 +
    Math.sin(Math.atan2(z, x) * 5.0) * 0.035;

  let mainMask = clamp(
    Math.max(syrupLobe, centralLobe, honeyLobe, seLobe, quaySpur) + mainCoastNoise,
    0,
    1
  );

  // Carve Black Cat Hideout Cove along South-Central coast (x ~ 9, z ~ 45..52)
  const coveCut =
    1 - smoothstep(0.45, 1.05, Math.hypot((x - 9.0) / 16.0, (z - 52.0) / 11.5));
  mainMask *= 1 - coveCut * 0.94;

  // Carve shallow bay south-east of Syrup & north-west of Honey Town
  const southBayCut =
    1 - smoothstep(0.5, 1.1, Math.hypot((x + 30) / 18, (z - 54) / 14));
  mainMask *= 1 - southBayCut * 0.85;

  // Three Satellite Islets (NW, NNE off Honey Town, ESE twin-hill islet)
  const nwIslet =
    1 - smoothstep(0.62, 1.02, Math.hypot((x + 73) / 9.5, (z + 39) / 12.5));
  const nneIslet =
    1 - smoothstep(0.62, 1.02, Math.hypot((x - 42) / 13.5, (z + 56) / 8.5));
  const eseIslet =
    1 - smoothstep(0.65, 1.02, Math.hypot((x - 108) / 16.5, (z - 22) / 21.5));

  return clamp(Math.max(mainMask, nwIslet, nneIslet, eseIslet), 0, 1);
}

/**
 * Central highland massif, coastal cliff walls, SE hill, and offshore islet peaks.
 */
function sampleGeckoMountainRelief(x: number, z: number): number {
  let ridge = 0;

  // 1. Central Ringed Highland Massif (right of Syrup Village, SW of Honey Town)
  const rx = (x - 12.0) / 36.0;
  const rz = (z + 5.0) / 24.0;
  const dRing = Math.hypot(rx, rz);
  const ringNoise = (valueNoise2D(x * 0.085 + 2.1, z * 0.085 + 5.7) - 0.5) * 0.14;
  const outerMass = 1 - smoothstep(0.72, 1.08, dRing + ringNoise);
  const innerTerrace = 1 - smoothstep(0.4, 0.72, dRing + ringNoise);
  const centralRingH = outerMass * 13.8 + innerTerrace * 3.8;
  const summitPeak =
    (1 - smoothstep(0.18, 0.85, Math.hypot((x - 16) / 15, (z + 5) / 11))) * 19.6;
  ridge = Math.max(ridge, centralRingH, summitPeak);

  // 2. North Forest Ridge framing the Central Highway Trail
  const northRidge =
    (1 - smoothstep(0.32, 1.05, Math.hypot((x + 12) / 34, (z + 38) / 11))) * 12.6;
  ridge = Math.max(ridge, northRidge);

  // 3. West-Central Forest Spur between Syrup & Central Trail
  const westSpur =
    (1 - smoothstep(0.3, 1.0, Math.hypot((x + 27) / 14, (z + 12) / 18))) * 11.2;
  ridge = Math.max(ridge, westSpur);

  // 4. SE Peninsula Hill
  const seHill =
    (1 - smoothstep(0.28, 1.02, Math.hypot((x - 56) / 18, (z - 24) / 17))) * 11.8;
  ridge = Math.max(ridge, seHill);

  // 5. Sheer Cliff Backing behind Black Cat Beach (z ~ 33..37, x ~ -6..25)
  const blackCatCliff =
    (1 - smoothstep(0.25, 1.0, Math.hypot((x - 9) / 20, (z - 27) / 9.5))) * 10.2;
  ridge = Math.max(ridge, blackCatCliff);

  // 6. Satellite Islet Hills
  const nwIsletH =
    (1 - smoothstep(0.2, 0.95, Math.hypot((x + 73) / 7.5, (z + 39) / 10.0))) * 7.2;
  const nneIsletH =
    (1 - smoothstep(0.2, 0.95, Math.hypot((x - 42) / 10.5, (z + 56) / 6.5))) * 6.5;
  const eseIsletPeakN =
    (1 - smoothstep(0.2, 0.95, Math.hypot((x - 107) / 11.0, (z - 15) / 10.0))) * 9.8;
  const eseIsletPeakS =
    (1 - smoothstep(0.2, 0.95, Math.hypot((x - 109) / 10.0, (z - 31) / 9.5))) * 8.4;
  ridge = Math.max(ridge, nwIsletH, nneIsletH, eseIsletPeakN, eseIsletPeakS);

  return ridge;
}

/**
 * Master height sampler for Gecko Islands:
 * Ocean < -1.2, Black Cat cove beach ~1.45, coastal cliffs ~6.5, Syrup Meadow ~3.4,
 * Kaya's Mansion ~5.2, Honey Town Plateau ~6.2, Central Peaks ~19.6.
 */
export function sampleGeckoHeight(x: number, z: number): number {
  const landMask = sampleGeckoOuterLandMask(x, z);
  let h = -1.65 + (valueNoise2D(x * 0.08, z * 0.08) - 0.5) * 0.3;

  if (landMask > 0.01) {
    // Coastal cliff profile: rapid rise out of ocean onto a ~5.6m bluff rim around the island
    const cliffStep = smoothstep(0.05, 0.28, landMask);
    const inland = smoothstep(0.24, 0.72, landMask);
    h = -1.5 + cliffStep * 4.4 + inland * 2.1;
  }

  // Carve the two canonical sandy coastal slopes into Syrup Village (NW slope & SW slope)
  const nwSlopeRamp =
    1 - smoothstep(0.4, 1.15, Math.hypot((x + 90) / 10, (z - 0) / 9));
  const swSlopeRamp =
    1 - smoothstep(0.4, 1.15, Math.hypot((x + 68) / 8.5, (z - 50) / 11));
  if (nwSlopeRamp > 0.01 && landMask > 0.02) {
    const t = clamp((z + 5) / 14, 0, 1);
    const rampY = 0.2 + t * 3.1;
    h = h * (1 - nwSlopeRamp * 0.85) + rampY * (nwSlopeRamp * 0.85);
  }
  if (swSlopeRamp > 0.01 && landMask > 0.02) {
    const t = clamp((55 - z) / 16, 0, 1);
    const rampY = 0.1 + t * 3.25;
    h = h * (1 - swSlopeRamp * 0.88) + rampY * (swSlopeRamp * 0.88);
  }

  // Mountain ridges & central highlands
  const mountainH = sampleGeckoMountainRelief(x, z);
  if (mountainH > 0.05 && landMask > 0.16) {
    h = Math.max(h, 0.8 + mountainH * smoothstep(0.16, 0.5, landMask));
  }

  // Rolling Emerald Meadow Basin for Syrup Village (x in [-92..-50], z in [6..46])
  const syrupBlend =
    (1 - smoothstep(0, 6.0, Math.max(Math.abs(x + 71) - 18, Math.abs(z - 25) - 18))) *
    smoothstep(0.28, 0.65, landMask);
  if (syrupBlend > 0.01) {
    const gentleHill =
      Math.sin(x * 0.12) * Math.cos(z * 0.12) * 0.42 +
      (x + 71) * 0.032; // Gentle upward tilt east toward Kaya's Mansion
    const targetSyrupY = GECKO_SYRUP_Y + gentleHill;
    h = h * (1 - syrupBlend) + targetSyrupY * syrupBlend;
  }

  // Level terrace for Kaya's Mansion Estate (x in [-56..-38], z in [12..32])
  const mansionBlend =
    1 - smoothstep(0, 4.5, Math.max(Math.abs(x + 47) - 8.5, Math.abs(z - 22) - 9.0));
  if (mansionBlend > 0.01) {
    h = h * (1 - mansionBlend) + GECKO_MANSION_Y * mansionBlend;
  }

  // Level cobblestone plateau for Honey Town (x in [44..78], z in [-38..-11])
  const honeyBlend =
    (1 - smoothstep(0, 4.0, Math.max(Math.abs(x - 61) - 15.5, Math.abs(z + 24.5) - 12.0))) *
    smoothstep(0.25, 0.6, landMask);
  if (honeyBlend > 0.01) {
    h = h * (1 - honeyBlend) + GECKO_HONEY_Y * honeyBlend;
  }

  // Step down Honey Town SE Harbor Quay (x in [74..85], z in [-16..14])
  const quayBlend =
    (1 - smoothstep(0, 3.0, Math.max(Math.abs(x - 79.5) - 4.5, Math.abs(z + 1.0) - 12.5))) *
    smoothstep(0.25, 0.55, landMask);
  if (quayBlend > 0.01) {
    h = h * (1 - quayBlend) + GECKO_QUAY_Y * quayBlend;
  }

  // Carve West Cliff Ravine separating Central Trail from Honey Town West Bridge (x ~ 41.5, z ~ -24)
  const westRavine =
    1 - smoothstep(0.3, 1.0, Math.hypot((x - 41.5) / 3.4, (z + 24.0) / 9.0));
  if (westRavine > 0.01) {
    h = h * (1 - westRavine) + 2.2 * westRavine;
  }

  // Carve Black Cat Hideout Sandy Cove Beach (x in [-6..24], z in [37..47])
  const beachMask = sampleBlackCatBeachMask(x, z);
  if (beachMask > 0.01 && landMask > 0.02) {
    const seaSlope = clamp((46.5 - z) / 8.5, 0, 1);
    const targetBeachY = -0.35 + seaSlope * 1.95;
    h = h * (1 - beachMask) + targetBeachY * beachMask;
  }

  // Carve smooth walkable grade along Central Forest Highway (Syrup -> Honey Town)
  const trailGate = x >= -41 && x <= 40 && z >= -31 && z <= 24;
  if (trailGate) {
    const roadD = geckoRoadSignedDist(x, z);
    if (roadD < 1.2) {
      const roadBlend = 1 - smoothstep(-0.2, 1.2, roadD);
      const tProg = clamp((x + 40) / 80, 0, 1);
      const valleyFloor = GECKO_MANSION_Y + Math.sin(tProg * Math.PI) * 2.2 + tProg * 1.0;
      h = Math.min(h, h * (1 - roadBlend * 0.72) + valleyFloor * (roadBlend * 0.72));
    }
  }

  return h;
}

/**
 * Walkable surface sampler for human-scale camera clamp & bridges.
 */
export function sampleGeckoWalkSurfaceHeight(x: number, z: number): number {
  const h = sampleGeckoHeight(x, z);
  // West Bridge deck at Honey Town gate (x in 38..45, z in -26.5..-21.5)
  if (x >= 38.0 && x <= 45.2 && z >= -26.8 && z <= -21.2) {
    return Math.max(h, GECKO_HONEY_Y);
  }
  // East Bridge deck at Honey Town east bluff (x in 74.5..80.5, z in -19.2..-13.8)
  if (x >= 74.5 && x <= 80.5 && z >= -19.2 && z <= -13.8) {
    return Math.max(h, GECKO_HONEY_Y);
  }
  return h;
}

/**
 * Generates Syrup Village rustic cottages, Honey Town pastel pink/mauve town houses,
 * and Black Cat Hideout beach camp shacks.
 */
export function buildGeckoBuildings(): GeckoHouseSpec[] {
  const buildings: GeckoHouseSpec[] = [];

  const roofStraw = 0xcbb26a;
  const roofSlate = 0x4f6d92;
  const roofTerracotta = 0xc95e3a;
  const roofOchre = 0xd8a63c;
  const roofPlum = 0x9b5a7c;

  // 1. Syrup Village Scattered Countryside Cottages & 2-Story Inn (matching Image 1 & Image 3)
  const syrupSpots: Array<{
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    yaw: number;
    roof: number;
    style: 'hip' | 'gable';
  }> = [
    { x: -85.5, z: 13.5, w: 3.3, d: 2.7, h: 2.1, yaw: 0.32, roof: roofStraw, style: 'gable' },
    { x: -72.0, z: 9.0, w: 3.4, d: 2.8, h: 2.2, yaw: -0.18, roof: roofSlate, style: 'gable' },
    { x: -67.5, z: 16.5, w: 3.5, d: 2.9, h: 2.2, yaw: 0.12, roof: roofOchre, style: 'gable' },
    { x: -74.5, z: 26.8, w: 3.6, d: 2.8, h: 2.2, yaw: -0.08, roof: roofTerracotta, style: 'gable' },
    { x: -85.2, z: 27.5, w: 3.2, d: 2.7, h: 2.1, yaw: 0.25, roof: roofStraw, style: 'gable' },
    { x: -81.8, z: 38.8, w: 3.4, d: 2.8, h: 2.1, yaw: -0.35, roof: roofSlate, style: 'gable' },
    { x: -72.5, z: 32.0, w: 3.1, d: 2.6, h: 2.0, yaw: 0.18, roof: roofTerracotta, style: 'hip' },
    { x: -62.5, z: 29.0, w: 3.3, d: 2.8, h: 2.1, yaw: -0.12, roof: roofOchre, style: 'gable' },
    { x: -62.2, z: 42.2, w: 3.2, d: 2.7, h: 2.0, yaw: 0.22, roof: roofStraw, style: 'gable' },
    { x: -57.5, z: 29.2, w: 3.1, d: 2.7, h: 2.1, yaw: -0.05, roof: roofTerracotta, style: 'gable' },
    // Larger 2-story Village Inn / Town Hall overlooking NW Syrup slope (Image 3 right background)
    { x: -75.0, z: 2.8, w: 4.8, d: 3.4, h: 3.4, yaw: 0.08, roof: roofTerracotta, style: 'hip' },
    // South-east knoll pink-purple roof cottage beside curved ridge (Image 1)
    { x: -46.8, z: 39.5, w: 3.6, d: 2.9, h: 2.2, yaw: -0.38, roof: roofPlum, style: 'gable' },
    { x: -60.5, z: 5.5, w: 3.2, d: 2.7, h: 2.1, yaw: 0.42, roof: roofOchre, style: 'gable' },
  ];

  syrupSpots.forEach((s, i) => {
    buildings.push({
      id: `syrup-house-${i}`,
      x: s.x,
      z: s.z,
      y: sampleGeckoHeight(s.x, s.z),
      width: s.w,
      depth: s.d,
      height: s.h,
      yaw: s.yaw,
      wallColor: i % 3 === 0 ? 0xf5ecd9 : i % 3 === 1 ? 0xefe2cf : 0xe9e7df,
      roofColor: s.roof,
      roofStyle: s.style,
      hasChimney: i % 2 === 0,
      district: 'syrup',
    });
  });

  // 2. Honey Town Dense Pink, Rose & Mauve Townhouses (matching gecko_syrup_00c9644e.png)
  const honeyPink = 0xec94b8;
  const honeyRose = 0xd66a97;
  const honeyMauve = 0xa864a8;
  const honeyPlum = 0x864d8f;

  const honeySpots: Array<{
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    yaw: number;
    roof: number;
  }> = [
    // North of main plaza
    { x: 48.8, z: -30.5, w: 3.9, d: 2.9, h: 2.7, yaw: 0.14, roof: honeyPink },
    { x: 53.6, z: -31.8, w: 3.3, d: 2.8, h: 2.6, yaw: -0.1, roof: honeyRose },
    { x: 63.8, z: -33.6, w: 3.5, d: 2.7, h: 2.6, yaw: 0.2, roof: honeyMauve },
    { x: 70.2, z: -32.4, w: 3.4, d: 2.7, h: 2.8, yaw: -0.15, roof: honeyPink },
    { x: 74.2, z: -26.2, w: 3.2, d: 2.8, h: 2.5, yaw: 0.28, roof: honeyPlum },
    // South of main plaza
    { x: 48.2, z: -17.5, w: 3.6, d: 2.9, h: 2.6, yaw: -0.12, roof: honeyPink },
    { x: 54.5, z: -17.0, w: 3.5, d: 2.8, h: 2.7, yaw: 0.08, roof: honeyRose },
    { x: 60.2, z: -16.8, w: 3.4, d: 2.7, h: 2.5, yaw: -0.22, roof: honeyMauve },
    { x: 65.8, z: -14.8, w: 3.6, d: 2.8, h: 2.6, yaw: 0.15, roof: honeyPink },
    { x: 71.2, z: -12.6, w: 3.2, d: 2.7, h: 2.5, yaw: -0.3, roof: honeyPlum },
    { x: 56.8, z: -11.8, w: 3.3, d: 2.7, h: 2.4, yaw: 0.35, roof: honeyMauve },
    { x: 62.2, z: -9.8, w: 3.1, d: 2.6, h: 2.4, yaw: -0.18, roof: honeyRose },
    // East Harbor Quay row & coastal bluff house
    { x: 74.5, z: -5.5, w: 3.5, d: 2.9, h: 2.6, yaw: 0.25, roof: honeyPink },
    { x: 73.2, z: 1.5, w: 3.6, d: 2.9, h: 2.5, yaw: 0.22, roof: honeyRose },
    { x: 71.8, z: 8.5, w: 3.4, d: 2.8, h: 2.5, yaw: 0.2, roof: honeyPink },
    { x: 86.2, z: -9.5, w: 3.1, d: 2.6, h: 2.3, yaw: -0.25, roof: honeyPink },
  ];

  honeySpots.forEach((h, i) => {
    buildings.push({
      id: `honey-house-${i}`,
      x: h.x,
      z: h.z,
      y: sampleGeckoHeight(h.x, h.z),
      width: h.w,
      depth: h.d,
      height: h.h,
      yaw: h.yaw,
      wallColor: 0xf7eef2,
      roofColor: h.roof,
      roofStyle: i % 3 === 0 ? 'hip' : 'gable',
      district: 'honey',
    });
  });

  // 3. Black Cat Hideout Beach Pirate Shacks (left side of cove sand, Image 1)
  buildings.push(
    {
      id: 'black-cat-shack-0',
      x: -2.2,
      z: 38.6,
      y: sampleGeckoHeight(-2.2, 38.6),
      width: 2.6,
      depth: 2.2,
      height: 1.8,
      yaw: 0.15,
      wallColor: 0xd8c6a6,
      roofColor: 0x6f425b,
      roofStyle: 'gable',
      district: 'black-cat',
    },
    {
      id: 'black-cat-shack-1',
      x: 2.2,
      z: 38.3,
      y: sampleGeckoHeight(2.2, 38.3),
      width: 2.8,
      depth: 2.2,
      height: 1.9,
      yaw: -0.1,
      wallColor: 0xcab48e,
      roofColor: 0x52394a,
      roofStyle: 'hip',
      district: 'black-cat',
    }
  );

  return buildings;
}

/**
 * Generates wooden post-and-rail roadside fences across Syrup Village (Image 3).
 */
export function buildGeckoFences(): GeckoFenceSpec[] {
  return [
    { ax: -78.5, az: 31.5, bx: -71.5, bz: 35.5 },
    { ax: -65.0, az: 36.5, bx: -57.0, bz: 34.5 },
    { ax: -73.0, az: 19.2, bx: -61.0, bz: 19.2 },
    { ax: -64.5, az: 25.0, bx: -57.5, bz: 25.0 },
    { ax: -84.0, az: 10.5, bx: -77.5, bz: 15.2 },
  ];
}

/**
 * Generates lush forest trees across central ridges, Syrup hillsides,
 * Kaya's Mansion oak + cypress trees, and the 3 satellite islets.
 */
export function buildGeckoTrees(): GeckoTreeSpec[] {
  const trees: GeckoTreeSpec[] = [];
  let idx = 0;

  const pushTree = (
    x: number,
    z: number,
    scale: number,
    kind: GeckoTreeSpec['kind']
  ) => {
    const y = sampleGeckoHeight(x, z);
    if (y < 1.3) return;
    if (geckoRoadSignedDist(x, z) < 0.7) return;
    if (isInKayaEstate(x, z)) return;
    if (isInHoneyPlaza(x, z)) return;
    if (sampleBlackCatBeachMask(x, z) > 0.25) return;
    trees.push({
      id: `gecko-tree-${idx++}`,
      x,
      z,
      y,
      scale,
      tint: 0.85 + valueNoise2D(x * 0.22, z * 0.22) * 0.3,
      kind,
    });
  };

  // 1. Kaya's Mansion Signature Estate Trees (giant oak behind left wing & cypress on right, Image 2)
  trees.push(
    {
      id: 'kaya-oak-tree',
      x: -43.5,
      z: 16.0,
      y: GECKO_MANSION_Y,
      scale: 2.35,
      tint: 1.05,
      kind: 'broadleaf',
    },
    {
      id: 'kaya-cypress-tree',
      x: -44.0,
      z: 28.2,
      y: GECKO_MANSION_Y,
      scale: 1.45,
      tint: 0.96,
      kind: 'cypress',
    }
  );

  // 2. Dense Central Highland & Ridge Forest (Vogel spiral distribution)
  const totalSamples = 230;
  for (let i = 0; i < totalSamples; i++) {
    const ang = i * 2.39996;
    const rad = 8 + Math.sqrt((i + 0.5) / totalSamples) * 78;
    const tx = 4 + Math.cos(ang) * rad * 1.15;
    const tz = -6 + Math.sin(ang) * rad * 0.72;
    // Keep Syrup town core open meadow with selective accents
    if (tx < -55 && tx > -88 && tz > 6 && tz < 44 && i % 4 !== 0) continue;
    const h = sampleGeckoHeight(tx, tz);
    if (h < 1.9) continue;
    const kind: GeckoTreeSpec['kind'] =
      i % 5 === 0 ? 'pine' : h < 3.4 && i % 7 === 0 ? 'palm' : 'broadleaf';
    pushTree(tx, tz, 1.2 + (i % 4) * 0.22, kind);
  }

  // 3. Satellite Islet & Coastal Rim Groves
  const rimSpots: readonly [number, number, GeckoTreeSpec['kind']][] = [
    [-73, -38, 'broadleaf'], [-75, -42, 'pine'], [-70, -35, 'broadleaf'],
    [40, -56, 'broadleaf'], [45, -55, 'pine'], [38, -55, 'broadleaf'],
    [107, 15, 'broadleaf'], [110, 22, 'pine'], [108, 30, 'broadleaf'], [104, 24, 'broadleaf'],
    [-82, 18, 'broadleaf'], [-64, 18, 'broadleaf'], [-70, 27, 'cypress'],
    [-58, 36, 'broadleaf'], [-50, 44, 'broadleaf'], [-40, 40, 'pine'],
    [54, 18, 'broadleaf'], [62, 26, 'pine'], [48, 30, 'broadleaf'],
  ];
  for (const [rx, rz, kind] of rimSpots) {
    pushTree(rx, rz, 1.25, kind);
  }

  return trees;
}

/**
 * Coastal sea rocks, Black Cat sea-cave boulders & cliff outcrops.
 */
export function buildGeckoRocks(): GeckoRockSpec[] {
  return [
    { x: -96, z: 24, y: 0.4, scaleX: 2.6, scaleY: 3.1, scaleZ: 2.4, yaw: 0.4 },
    { x: -88, z: 54, y: 0.5, scaleX: 2.8, scaleY: 3.2, scaleZ: 2.6, yaw: 1.1 },
    { x: -50, z: 52, y: 0.6, scaleX: 2.9, scaleY: 3.4, scaleZ: 2.5, yaw: 2.1 },
    { x: -12, z: 46, y: 0.8, scaleX: 3.1, scaleY: 3.6, scaleZ: 2.7, yaw: 0.7 },
    { x: 26, z: 46, y: 0.8, scaleX: 3.0, scaleY: 3.4, scaleZ: 2.8, yaw: 1.7 },
    { x: 86, z: 18, y: 0.5, scaleX: 2.8, scaleY: 3.0, scaleZ: 2.6, yaw: 0.3 },
    { x: 88, z: -26, y: 0.6, scaleX: 2.7, scaleY: 3.1, scaleZ: 2.4, yaw: 1.5 },
    { x: -45, z: -48, y: 0.6, scaleX: 3.0, scaleY: 3.4, scaleZ: 2.7, yaw: 2.4 },
  ];
}

export const GECKO_BUILDINGS: readonly GeckoHouseSpec[] = buildGeckoBuildings();
export const GECKO_FENCES: readonly GeckoFenceSpec[] = buildGeckoFences();
export const GECKO_TREES: readonly GeckoTreeSpec[] = buildGeckoTrees();
export const GECKO_ROCKS: readonly GeckoRockSpec[] = buildGeckoRocks();

export function toGeckoSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * GECKO_GLOBE_SCALE;
  const sz = z * GECKO_GLOBE_SCALE;
  const rTarget = globeRadius + y * GECKO_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * Curated Overview + Human-Scale Street Views across Syrup Village,
 * Kaya's Mansion, Honey Town, Black Cat Hideout Beach, and the Highland Trail.
 */
export const GECKO_CAMERA_PRESETS: GeckoCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle: 'Îles Gecko · Syrup & Résidence de Kaya à l’ouest, Honey Town au nord-est, Repaire du Chat Noir au sud',
    position: [-14, 114, 148],
    target: [2, 5, 2],
    isStreetView: false,
  },
  {
    id: 'syrup-village',
    label: 'Village de Syrup',
    subtitle: 'Vue humaine sur les sentiers champêtres de Syrup face aux chaumières et au manoir de Kaya',
    position: [-82.0, sampleGeckoWalkSurfaceHeight(-82.0, 33.5) + 3.0, 33.5],
    target: [-52.0, GECKO_SYRUP_Y + 2.4, 21.5],
    isStreetView: true,
  },
  {
    id: 'kaya-mansion',
    label: 'Résidence de Kaya',
    subtitle: 'À hauteur d’homme devant le portail en fer forgé et le manoir bleu de Kaya',
    position: [-66.5, sampleGeckoWalkSurfaceHeight(-66.5, 22.8) + 2.0, 22.8],
    target: [-46.5, GECKO_MANSION_Y + 3.2, 22.0],
    isStreetView: true,
  },
  {
    id: 'honey-town',
    label: 'Honey Town',
    subtitle: 'Vue humaine sur la place pavée de Honey Town, ses ponts de pierre et ses toits roses',
    position: [50.5, GECKO_HONEY_Y + 2.3, -18.5],
    target: [69.5, GECKO_HONEY_Y + 2.0, -27.5],
    isStreetView: true,
  },
  {
    id: 'black-cat-beach',
    label: 'Plage du Chat Noir',
    subtitle: 'Vue humaine sur la crique du débarquement, la grotte du Chat Noir et le Bezan Black',
    position: [21.5, sampleGeckoWalkSurfaceHeight(21.5, 42.5) + 2.4, 42.5],
    target: [4.5, GECKO_BLACK_CAT_BEACH_Y + 1.4, 43.5],
    isStreetView: true,
  },
  {
    id: 'highland-trail',
    label: 'Sentier des Collines',
    subtitle: 'Panorama humain depuis le chemin forestier reliant Syrup Village à Honey Town',
    position: [-14.0, sampleGeckoWalkSurfaceHeight(-14.0, -24.5) + 2.1, -24.5],
    target: [-52.0, GECKO_MANSION_Y + 2.5, 16.0],
    isStreetView: true,
  },
];
