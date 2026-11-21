import { valueNoise2D } from './globeMath';

export const ORGAN_WORLD_SIZE = 260;
export const ORGAN_GLOBE_SCALE = 0.002;
export const ORGAN_GLOBE_CENTER = { u: 0.772, v: 0.226 } as const;
/**
 * Kept strictly at 0.036 rad (~3.6° arc) so Organ Island & Orange Town
 * never overlap Island of Rare Animals (u: 0.764, v: 0.258, sep ~0.106 rad)
 * or Gecko Islands (sep ~0.27 rad).
 */
export const ORGAN_ANGULAR_MASK_RADIUS = 0.036;

export const ORGAN_QUAY_Y = 1.45;
export const ORGAN_TOWN_Y = 2.65;
export const ORGAN_EAST_CLEARING_Y = 2.85;
export const ORGAN_MID_HILL_Y = 6.2;
export const ORGAN_RIDGE_Y = 10.6;
export const ORGAN_PEAK_Y = 13.8;
export const ORGAN_WATER_Y = -0.04;

export const ORGAN_SUB_LOCATIONS: Record<string, [number, number]> = {
  'organ-island': [0, -14],
  'orange-town': [-8, 36],
};

export interface OrganBuildingSpec {
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
  roofStyle: 'gable' | 'hip';
  hasDormers?: boolean;
  hasChimney?: boolean;
  hasFlowerBox?: boolean;
  isChurch?: boolean;
}

export interface OrganTreeSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  scale: number;
  tint: number;
  kind: 'broadleaf' | 'pine';
}

export interface OrganCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

export const ORGAN_LANDMARKS = {
  townCornerHall: { x: -18.5, z: 22.8, y: ORGAN_TOWN_Y },
  petFoodShop: { x: 6.2, z: 29.8, y: ORGAN_TOWN_Y },
  chouchou: { x: 6.2, z: 33.9, y: ORGAN_TOWN_Y },
  whaleFountain: { x: -10.0, z: 46.8, y: ORGAN_TOWN_Y },
  church: { x: -3.2, z: 22.0, y: ORGAN_TOWN_Y },
  eastBridge: { x: 28.8, z: 40.5, y: 3.1 },
  buggyChapiteau: { x: 47.2, z: 29.2, y: ORGAN_EAST_CLEARING_Y },
  harborQuay: { x: -4.0, z: 56.2, y: ORGAN_QUAY_Y },
  bigTopShip: { x: 3.5, z: 65.5, y: 0.1 },
  swTowerCrater: { x: -30.5, z: 33.5, y: ORGAN_TOWN_Y },
  townWell: { x: 10.6, z: 38.6, y: ORGAN_TOWN_Y },
} as const;

export const ORGAN_RIVER_POINTS: readonly [number, number][] = [
  [8.0, -47.0],
  [4.0, -37.0],
  [6.8, -26.0],
  [14.8, -16.0],
  [20.5, -5.0],
  [25.5, 8.0],
  [28.5, 22.0],
  [28.8, 35.0],
  [28.6, 47.0],
  [26.5, 62.0],
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

/** Distance from point (x, z) to the winding Organ Island river centerline. */
export function sampleOrganRiverDistance(x: number, z: number): {
  dist: number;
  halfWidth: number;
} {
  let minD = 999;
  for (let i = 0; i < ORGAN_RIVER_POINTS.length - 1; i++) {
    const [ax, az] = ORGAN_RIVER_POINTS[i];
    const [bx, bz] = ORGAN_RIVER_POINTS[i + 1];
    const d = distToSegment2D(x, z, ax, az, bx, bz);
    if (d < minD) minD = d;
  }
  const mouthWiden = smoothstep(10.0, 56.0, z) * 1.15;
  return { dist: minD, halfWidth: 2.35 + mouthWiden };
}

/**
 * Signed distance (< 0 inside walkable cobbled streets, plaza, harbor quay, or bridge path;
 * > 0 outside) matching Orange Town's dense street grid & east peninsula bridge road.
 */
export function organRoadSignedDist(x: number, z: number): number {
  let minD = 999;

  const segments: readonly [number, number, number, number, number][] = [
    // Main N-S Whale Fountain Avenue from harbor quay (z=56.5) to north square (z=16.5)
    [-10.0, 56.5, -10.0, 16.5, 2.55],
    // Secondary N-S East Market lanes
    [0.8, 53.5, 0.8, 17.0, 1.55],
    [13.8, 53.0, 13.8, 17.5, 1.5],
    [-22.5, 52.0, -22.5, 28.5, 1.45],
    // Main E-W Grand Avenue passing Town Hall, PET FOOD, & east across wooden bridge to Buggy's Grand Chapiteau
    [-33.5, 36.2, 23.0, 36.2, 1.95],
    [22.5, 36.2, 28.8, 40.5, 1.45],
    [28.8, 40.5, 42.5, 32.5, 1.65],
    // Upper Town & Mid-North E-W cross street
    [-29.5, 19.2, 20.5, 19.2, 1.45],
    // Plaza south frontage in front of Town Corner Hall
    [-25.5, 27.6, 17.0, 27.6, 1.65],
    // Southern Waterfront Boulevard & Harbor Quay promenade
    [-25.5, 53.2, 16.5, 53.2, 1.65],
    [-25.5, 56.2, 17.5, 56.2, 1.7],
    // Lower mid-block lane flanking Whale Fountain
    [-26.5, 45.2, 19.5, 45.2, 1.55],
  ];

  for (const [ax, az, bx, bz, halfW] of segments) {
    const d = distToSegment2D(x, z, ax, az, bx, bz) - halfW;
    if (d < minD) minD = d;
  }

  // Open circular plaza around Whale Fountain (-10, 46.8)
  const fountainPlaza = Math.hypot(x + 10.0, z - 46.8) - 4.8;
  if (fountainPlaza < minD) minD = fountainPlaza;

  // Open square apron in front of Town Corner Hall (-15.5, 29.2)
  const hallApron = Math.hypot((x + 15.5) / 6.2, (z - 29.2) / 3.4) * 3.4 - 3.4;
  if (hallApron < minD) minD = hallApron;

  // Open clearing apron in front of Buggy's Grand Chapiteau (41.2, 32.8)
  const chapiteauApron = Math.hypot(x - 41.2, z - 32.8) - 4.6;
  if (chapiteauApron < minD) minD = chapiteauApron;

  return minD;
}

/**
 * Island silhouette mask faithful to organ_town_39b1ec20.png:
 * Jagged diamond/triangular landmass with broad northern mountain massif,
 * jutting western forest shoulder, eastern peninsula east of the river,
 * and southern Orange Town bay with a straight quay frontage.
 */
function sampleOrganCoastMask(x: number, z: number): number {
  const northMass =
    1 - smoothstep(0.55, 1.04, Math.hypot((x + 2.0) / 58.0, (z + 24.0) / 42.0));
  const nwBridge =
    1 - smoothstep(0.5, 1.02, Math.hypot((x + 33.0) / 26.0, (z + 18.0) / 22.0));
  const westShoulder =
    1 - smoothstep(0.46, 1.03, Math.hypot((x + 48.0) / 32.0, (z + 6.0) / 24.0));
  const westMidBridge =
    1 - smoothstep(0.5, 1.02, Math.hypot((x + 36.0) / 24.0, (z - 14.0) / 22.0));
  const swCape =
    1 - smoothstep(0.44, 1.03, Math.hypot((x + 36.0) / 22.0, (z - 34.0) / 22.0));
  const townBelly =
    1 - smoothstep(0.52, 1.04, Math.hypot((x + 4.0) / 42.0, (z - 28.0) / 30.0));
  const eastPeninsula =
    1 - smoothstep(0.48, 1.04, Math.hypot((x - 45.0) / 26.0, (z - 12.0) / 36.0));
  const eastTip =
    1 - smoothstep(0.44, 1.02, Math.hypot((x - 58.0) / 18.0, (z - 2.0) / 15.0));

  const coreBase = Math.max(
    northMass,
    nwBridge,
    westShoulder,
    westMidBridge,
    swCape,
    townBelly,
    eastPeninsula,
    eastTip
  );

  const ang = Math.atan2(z, x);
  const jaggedRaw =
    (valueNoise2D(x * 0.085 + 4.2, z * 0.085 + 9.4) - 0.5) * 0.085 +
    (valueNoise2D(x * 0.19 - 3.1, z * 0.19 + 1.7) - 0.5) * 0.038 +
    Math.sin(ang * 7.0 + 0.6) * 0.018;
  // Taper jagged coastal noise away inside the solid interior so no interior pinholes appear
  const coastBand = smoothstep(0.05, 0.42, coreBase) * (1 - smoothstep(0.68, 0.94, coreBase));
  let mask = clamp(coreBase + jaggedRaw * coastBand, 0, 1);

  // Outer western bay curve indentation north of SW cape (around x=-60, z=18)
  const westCove =
    1 - smoothstep(0.25, 1.0, Math.hypot((x + 61.0) / 15.0, (z - 18.0) / 12.0));
  mask *= 1 - westCove * 0.36;

  // River southern estuary inlet around x=26..30, z=48..62
  const estuaryCut =
    1 - smoothstep(0.28, 1.0, Math.hypot((x - 27.0) / 10.5, (z - 55.0) / 12.0));
  mask *= 1 - estuaryCut * 0.85;

  // Straighten the southern Orange Town harbor edge slightly along z ~ 55..58
  if (x >= -28.0 && x <= 18.0 && z > 54.5) {
    const seaCut = smoothstep(55.0, 58.5, z);
    mask *= 1 - seaCut;
  }

  // Ensure coastline cleanly hits 0 well inside the 260x260 plane
  const outerFade = 1 - smoothstep(0.84, 1.0, Math.hypot(x / 92.0, z / 84.0));
  mask *= outerFade;

  return clamp(mask, 0, 1);
}

/**
 * Multi-tiered heightmap for Organ Island:
 * - Deep seabed foundation down to -6.5m (plunges well below ocean sphere chord sag)
 * - Gentle golden sand shoreline sloping cleanly beneath the ocean surface (-1.6m -> +0.65m -> +2.73m)
 * - Flat walkable Orange Town plateau at 2.65m + Harbor Quay shelf at 1.45m
 * - Eastern forested clearing peninsula at 2.85m for Buggy's Grand Chapiteau
 * - Iconic stepped grey/tan rocky mountain ridges (NW ridge, NE ridge, SW ridge, East Peak)
 * - Winding river channel carved from the northern valley out to the south estuary
 */
export function sampleOrganHeight(x: number, z: number): number {
  const coast = sampleOrganCoastMask(x, z);
  let h = -6.5 + (valueNoise2D(x * 0.09, z * 0.09) - 0.5) * 0.24;

  if (coast <= 0.01) {
    return h;
  }

  const subT = smoothstep(0.02, 0.34, coast);
  const shoreT = smoothstep(0.32, 0.56, coast);
  const inlandT = smoothstep(0.52, 0.88, coast);
  h = -6.5 + subT * 4.9 + shoreT * 2.25 + inlandT * 2.08; // -6.5m seabed -> -1.6m submerged shelf -> +0.65m beach -> +2.73m grass

  // Gentle woodland undulation in forested regions (outside Orange Town)
  const undulation = (valueNoise2D(x * 0.055 + 11.2, z * 0.055 - 4.7) - 0.35) * 2.6;
  h += Math.max(0, undulation) * inlandT;

  // 1. NW-Central Long Terraced Mountain Ridge (broad flat-topped limestone tiers matching orange_town_39b1ec20.png)
  const nwAngle = -0.58;
  const rx1 = (x + 22.0) * Math.cos(nwAngle) - (z + 32.0) * Math.sin(nwAngle);
  const rz1 = (x + 22.0) * Math.sin(nwAngle) + (z + 32.0) * Math.cos(nwAngle);
  const nwDist = Math.hypot(rx1 / 33.0, rz1 / 16.5);
  const nwStep1 = (1 - smoothstep(0.76, 1.0, nwDist)) * smoothstep(0.45, 0.72, coast);
  const nwStep2 = (1 - smoothstep(0.48, 0.68, nwDist)) * smoothstep(0.55, 0.8, coast);
  const nwStep3 =
    (1 - smoothstep(0.32, 0.48, Math.hypot((rx1 - 2.0) / 18.0, rz1 / 10.0))) *
    smoothstep(0.6, 0.85, coast);

  h = Math.max(
    h,
    ORGAN_TOWN_Y +
      nwStep1 * (ORGAN_MID_HILL_Y - ORGAN_TOWN_Y) +
      nwStep2 * (ORGAN_RIDGE_Y - ORGAN_MID_HILL_Y) +
      nwStep3 * (ORGAN_PEAK_Y - ORGAN_RIDGE_Y)
  );

  // 2. NE Horseshoe Terraced Cliff Ridge (curved east of the river headwaters)
  const neDist = Math.hypot((x - 19.0) / 22.0, (z + 35.0) / 15.0);
  const neStep1 = (1 - smoothstep(0.72, 0.98, neDist)) * smoothstep(0.45, 0.72, coast);
  const neStep2 = (1 - smoothstep(0.42, 0.65, neDist)) * smoothstep(0.55, 0.8, coast);
  h = Math.max(
    h,
    ORGAN_TOWN_Y +
      neStep1 * (ORGAN_MID_HILL_Y - ORGAN_TOWN_Y) +
      neStep2 * (ORGAN_RIDGE_Y + 0.9 - ORGAN_MID_HILL_Y)
  );

  // 3. Secondary Mid-West Rocky Outcrop (above SW Orange Town)
  const swCragDist = Math.hypot((x + 41.0) / 12.0, (z - 2.0) / 12.0);
  const swCrag = (1 - smoothstep(0.48, 0.95, swCragDist)) * smoothstep(0.4, 0.72, coast);
  h = Math.max(h, ORGAN_TOWN_Y + swCrag * 6.2);

  // 4. Eastern Peninsula Terraced Hill Peak (north of Eastern Clearing Pavilion)
  const eastPeakDist = Math.hypot((x - 51.0) / 14.5, (z - 1.5) / 15.5);
  const eastPeak1 = (1 - smoothstep(0.68, 1.0, eastPeakDist)) * smoothstep(0.45, 0.75, coast);
  const eastPeak2 = (1 - smoothstep(0.38, 0.62, eastPeakDist)) * smoothstep(0.55, 0.82, coast);
  h = Math.max(h, ORGAN_TOWN_Y + eastPeak1 * 3.8 + eastPeak2 * 4.4);

  // Flatten walkable Orange Town plateau cleanly at ORGAN_TOWN_Y (2.65m)
  if (x >= -38.0 && x <= 23.5 && z >= 12.5 && z <= 55.2) {
    const townMask =
      smoothstep(-38.0, -33.5, x) *
      (1 - smoothstep(19.5, 23.5, x)) *
      smoothstep(12.5, 16.5, z) *
      (1 - smoothstep(52.2, 55.2, z)) *
      smoothstep(0.36, 0.65, coast);
    h = h * (1 - townMask) + ORGAN_TOWN_Y * townMask;
  }

  // Concave SW Buggy Ball Blast Crater depression (-30.5, 33.5) so rubble beams sit firmly inside
  const blastDist = Math.hypot((x + 30.5) / 5.4, (z - 33.5) / 4.2);
  if (blastDist < 1.0) {
    const bowl = 1 - smoothstep(0.35, 1.0, blastDist);
    h -= bowl * 0.48;
  }

  // Harbor Quay apron along z = 54.5..57.5 (drops cleanly from town down to sea wall)
  if (x >= -27.5 && x <= 18.5 && z >= 53.8 && z <= 58.0) {
    const quayBand =
      smoothstep(53.8, 54.9, z) * (1 - smoothstep(56.8, 58.0, z));
    h = h * (1 - quayBand * 0.92) + ORGAN_QUAY_Y * (quayBand * 0.92);
  }

  // Flatten East Clearing Peninsula around the bridge road & Buggy's Grand Chapiteau
  const eastClearingMask =
    (1 - smoothstep(0.58, 1.0, Math.hypot((x - 45.8) / 18.5, (z - 30.5) / 15.5))) *
    smoothstep(0.38, 0.68, coast);
  if (eastClearingMask > 0.01) {
    h = h * (1 - eastClearingMask * 0.94) + ORGAN_EAST_CLEARING_Y * (eastClearingMask * 0.94);
  }

  // Carve winding river channel from northern spring out to southern sea bay
  const { dist: riverDist, halfWidth } = sampleOrganRiverDistance(x, z);
  if (riverDist < halfWidth + 3.8) {
    const channelT = 1 - smoothstep(halfWidth * 0.45, halfWidth + 3.2, riverDist);
    // Keep mountain spring valley smoothly transitioning near z=-46
    const sourceFade = smoothstep(-50.0, -40.0, z);
    const bedDepth = -2.8;
    h = h * (1 - channelT * sourceFade) + bedDepth * (channelT * sourceFade);
  }

  return h;
}

/**
 * Walkable elevation sampler including the eastern wooden river bridge deck
 * and southern harbor stone/timber quay.
 */
export function sampleOrganWalkSurfaceHeight(x: number, z: number): number {
  const h = sampleOrganHeight(x, z);

  // Eastern arched wooden bridge crossing the river around (28.8, 40.5)
  if (x >= 23.6 && x <= 34.0 && Math.abs(z - 40.5) <= 1.85) {
    const u = (x - 23.6) / (34.0 - 23.6);
    const archH = ORGAN_EAST_CLEARING_Y + Math.sin(u * Math.PI) * 0.95;
    return Math.max(h, archH);
  }

  // Southern Harbor Quay deck
  if (x >= -26.5 && x <= 18.0 && z >= 54.6 && z <= 57.6) {
    return Math.max(h, ORGAN_QUAY_Y + 0.12);
  }

  return h;
}

/**
 * Builds Orange Town's rich half-timbered houses, Town Corner Hall, PET FOOD store,
 * and church bell tower.
 */
export function buildOrganBuildings(): OrganBuildingSpec[] {
  const specs: OrganBuildingSpec[] = [];

  const terracotta = 0xc14b36;
  const burntOrange = 0xd97336;
  const plumRoof = 0x7c5576;
  const slateBlue = 0x4b749c;
  const sageGreen = 0x5c8a5e;
  const warmUmber = 0x8d5b3e;
  const crimsonTrim = 0xb8382c;

  const creamA = 0xf7efd8;
  const creamB = 0xf4e8cb;
  const creamC = 0xfaf3e4;
  const yellowWarm = 0xf3df9e;

  // Hero Buildings
  specs.push(
    {
      id: 'town-corner-hall',
      x: ORGAN_LANDMARKS.townCornerHall.x,
      z: ORGAN_LANDMARKS.townCornerHall.z,
      y: sampleOrganHeight(ORGAN_LANDMARKS.townCornerHall.x, ORGAN_LANDMARKS.townCornerHall.z),
      width: 9.6,
      depth: 7.4,
      height: 5.0,
      yaw: 0,
      wallColor: yellowWarm,
      roofColor: slateBlue,
      roofStyle: 'hip',
    },
    {
      id: 'pet-food-shop',
      x: ORGAN_LANDMARKS.petFoodShop.x,
      z: ORGAN_LANDMARKS.petFoodShop.z,
      y: sampleOrganHeight(ORGAN_LANDMARKS.petFoodShop.x, ORGAN_LANDMARKS.petFoodShop.z),
      width: 6.4,
      depth: 5.4,
      height: 3.6,
      yaw: 0,
      wallColor: creamA,
      roofColor: crimsonTrim,
      roofStyle: 'gable',
      hasChimney: true,
      hasFlowerBox: true,
    },
    {
      id: 'town-church',
      x: ORGAN_LANDMARKS.church.x,
      z: ORGAN_LANDMARKS.church.z,
      y: sampleOrganHeight(ORGAN_LANDMARKS.church.x, ORGAN_LANDMARKS.church.z),
      width: 5.2,
      depth: 5.4,
      height: 4.1,
      yaw: 0,
      wallColor: creamC,
      roofColor: slateBlue,
      roofStyle: 'gable',
      isChurch: true,
    }
  );

  // Surrounding Orange Town half-timbered houses arranged cleanly along cobbled streets
  const houses: readonly Omit<OrganBuildingSpec, 'y'>[] = [
    // Upper Town Row (north of z=19.2 avenue)
    { id: 'ot-n1', x: -24.5, z: 14.8, width: 5.0, depth: 3.8, height: 3.0, yaw: 0, wallColor: creamA, roofColor: terracotta, roofStyle: 'gable', hasDormers: true, hasChimney: true },
    { id: 'ot-n2', x: -16.5, z: 14.8, width: 5.2, depth: 3.8, height: 3.2, yaw: 0, wallColor: creamB, roofColor: burntOrange, roofStyle: 'gable', hasDormers: true },
    { id: 'ot-n3', x: -4.2, z: 14.8, width: 4.8, depth: 3.6, height: 3.0, yaw: 0, wallColor: creamC, roofColor: plumRoof, roofStyle: 'gable', hasChimney: true },
    { id: 'ot-n4', x: 6.2, z: 14.8, width: 5.4, depth: 3.8, height: 3.1, yaw: 0, wallColor: creamA, roofColor: sageGreen, roofStyle: 'gable', hasDormers: true },
    { id: 'ot-n5', x: 15.2, z: 15.0, width: 5.0, depth: 3.8, height: 2.9, yaw: 0, wallColor: creamB, roofColor: terracotta, roofStyle: 'hip', hasChimney: true },

    // Mid-North Row flanking Church & PET FOOD (between z=19.2 and z=27.6)
    { id: 'ot-mn1', x: -27.5, z: 22.8, width: 4.6, depth: 4.0, height: 3.0, yaw: 0, wallColor: creamC, roofColor: terracotta, roofStyle: 'gable', hasDormers: true },
    { id: 'ot-mn2', x: 6.2, z: 22.8, width: 5.0, depth: 3.8, height: 3.1, yaw: 0, wallColor: creamB, roofColor: burntOrange, roofStyle: 'gable', hasChimney: true },
    { id: 'ot-mn3', x: 17.8, z: 23.0, width: 4.8, depth: 4.2, height: 3.0, yaw: 0, wallColor: creamA, roofColor: plumRoof, roofStyle: 'gable', hasDormers: true },

    // Central Town Row flanking E-W Grand Avenue (z ~ 30..32)
    { id: 'ot-c1', x: -4.2, z: 31.2, width: 4.8, depth: 3.6, height: 3.2, yaw: 0, wallColor: creamA, roofColor: plumRoof, roofStyle: 'gable', hasDormers: true, hasFlowerBox: true },
    { id: 'ot-c2', x: 17.8, z: 31.2, width: 4.8, depth: 3.8, height: 3.0, yaw: 0, wallColor: creamC, roofColor: warmUmber, roofStyle: 'gable', hasChimney: true },

    // West Street Houses flanking Whale Fountain Avenue (x ~ -16.8, north of blast crater or framing street)
    { id: 'ot-w1', x: -16.5, z: 40.5, width: 4.8, depth: 3.8, height: 3.2, yaw: Math.PI * 0.5, wallColor: creamC, roofColor: terracotta, roofStyle: 'gable', hasDormers: true, hasFlowerBox: true },
    { id: 'ot-w2', x: -16.5, z: 46.8, width: 4.8, depth: 4.0, height: 3.3, yaw: Math.PI * 0.5, wallColor: creamA, roofColor: burntOrange, roofStyle: 'gable', hasDormers: true, hasFlowerBox: true },
    { id: 'ot-w3', x: -16.8, z: 50.8, width: 4.2, depth: 3.4, height: 2.9, yaw: 0, wallColor: creamB, roofColor: slateBlue, roofStyle: 'hip', hasChimney: true },

    // Far-West SW Block
    { id: 'ot-sw1', x: -27.2, z: 40.6, width: 4.4, depth: 3.6, height: 2.8, yaw: 0, wallColor: creamB, roofColor: warmUmber, roofStyle: 'gable' },
    { id: 'ot-sw2', x: -27.2, z: 48.8, width: 4.8, depth: 3.6, height: 2.9, yaw: 0, wallColor: creamA, roofColor: terracotta, roofStyle: 'gable', hasChimney: true },

    // East Side of Whale Fountain Avenue (x ~ -3.8)
    { id: 'ot-e1', x: -4.0, z: 40.6, width: 4.8, depth: 3.8, height: 3.2, yaw: -Math.PI * 0.5, wallColor: creamB, roofColor: burntOrange, roofStyle: 'gable', hasDormers: true, hasFlowerBox: true },
    { id: 'ot-e2', x: -4.0, z: 46.8, width: 4.8, depth: 3.8, height: 3.3, yaw: -Math.PI * 0.5, wallColor: creamC, roofColor: terracotta, roofStyle: 'gable', hasDormers: true, hasFlowerBox: true },
    { id: 'ot-e3', x: -4.2, z: 50.8, width: 4.2, depth: 3.4, height: 2.9, yaw: 0, wallColor: creamA, roofColor: sageGreen, roofStyle: 'gable', hasChimney: true },

    // Mid-East Quarter Blocks (between x=1 and x=21)
    { id: 'ot-me1', x: 6.8, z: 42.2, width: 5.2, depth: 3.6, height: 3.0, yaw: 0, wallColor: creamA, roofColor: sageGreen, roofStyle: 'gable', hasDormers: true },
    { id: 'ot-me2', x: 6.8, z: 49.4, width: 5.0, depth: 3.6, height: 2.9, yaw: 0, wallColor: creamC, roofColor: terracotta, roofStyle: 'gable', hasChimney: true },
    { id: 'ot-me3', x: 18.2, z: 40.6, width: 4.6, depth: 3.6, height: 2.9, yaw: 0, wallColor: creamB, roofColor: burntOrange, roofStyle: 'gable', hasDormers: true },
    { id: 'ot-me4', x: 18.0, z: 49.2, width: 4.4, depth: 3.6, height: 2.8, yaw: 0, wallColor: creamA, roofColor: plumRoof, roofStyle: 'hip' },
  ];

  for (const h of houses) {
    specs.push({
      ...h,
      y: sampleOrganHeight(h.x, h.z),
    });
  }

  return specs;
}

/**
 * Rich woodland canopy surrounding the northern ridges, western & eastern peninsulas,
 * riverbanks, and town outskirts — strictly outside cobbled roads, river channel, and buildings.
 */
export function buildOrganTrees(): OrganTreeSpec[] {
  const trees: OrganTreeSpec[] = [];
  let idx = 0;
  const buildings = buildOrganBuildings();

  const pushTree = (x: number, z: number, scale: number, kind: OrganTreeSpec['kind']) => {
    const y = sampleOrganHeight(x, z);
    if (y < 1.15) return;
    if (organRoadSignedDist(x, z) < 1.1) return;

    const river = sampleOrganRiverDistance(x, z);
    if (river.dist < river.halfWidth + 1.45) return;

    // Keep sheer cliff escarpments free
    const hx = sampleOrganHeight(x + 1.1, z);
    const hz = sampleOrganHeight(x, z + 1.1);
    if (Math.hypot(hx - y, hz - y) > 0.72) return;

    // Clear landmarks (Buggy Grand Chapiteau, Whale Fountain, Blast crater)
    if (Math.hypot(x - ORGAN_LANDMARKS.buggyChapiteau.x, z - ORGAN_LANDMARKS.buggyChapiteau.z) < 9.2) return;
    if (Math.hypot(x - ORGAN_LANDMARKS.whaleFountain.x, z - ORGAN_LANDMARKS.whaleFountain.z) < 6.5) return;
    if (Math.hypot(x - ORGAN_LANDMARKS.swTowerCrater.x, z - ORGAN_LANDMARKS.swTowerCrater.z) < 6.0) return;

    for (const b of buildings) {
      if (
        Math.abs(x - b.x) < b.width * 0.5 + 1.8 &&
        Math.abs(z - b.z) < b.depth * 0.5 + 1.8
      ) {
        return;
      }
    }

    trees.push({
      id: `organ-tree-${idx++}`,
      x,
      z,
      y,
      scale,
      tint: 0.84 + valueNoise2D(x * 0.27, z * 0.27) * 0.3,
      kind,
    });
  };

  // Vogel spiral distribution across the forested island belts
  const totalSamples = 320;
  for (let i = 0; i < totalSamples; i++) {
    const ang = i * 2.39996;
    const rad = 10 + Math.sqrt((i + 0.5) / totalSamples) * 74;
    const tx = Math.cos(ang) * rad;
    const tz = Math.sin(ang) * rad - 4;
    const kind: OrganTreeSpec['kind'] = i % 5 === 0 ? 'pine' : 'broadleaf';
    pushTree(tx, tz, 1.05 + (i % 4) * 0.18, kind);
  }

  // Signature town & riverbank green groves visible in the anime/game overview
  const curatedGroves: readonly [number, number, number][] = [
    [-27.5, 16.5, 1.25],
    [-33.5, 22.0, 1.3],
    [-36.5, 43.0, 1.25],
    [-33.0, 52.5, 1.2],
    [-10.2, 24.8, 1.1],
    [13.6, 26.5, 1.12],
    [22.5, 17.5, 1.28],
    [23.5, 29.0, 1.22],
    [23.5, 49.0, 1.25],
    [35.0, 31.0, 1.3],
    [37.0, 44.5, 1.28],
    [54.5, 36.0, 1.32],
    [55.0, 22.5, 1.25],
    [40.0, 21.0, 1.3],
  ];
  for (const [gx, gz, sc] of curatedGroves) {
    pushTree(gx, gz, sc, 'broadleaf');
  }

  return trees;
}

export const ORGAN_BUILDINGS: readonly OrganBuildingSpec[] = buildOrganBuildings();
export const ORGAN_TREES: readonly OrganTreeSpec[] = buildOrganTrees();

export function toOrganSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * ORGAN_GLOBE_SCALE;
  const sz = z * ORGAN_GLOBE_SCALE;
  const rTarget = globeRadius + y * ORGAN_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * 6 curated camera angles from Overview & Harbor Sea Approach down to Human-Scale Street Views
 * (Whale Fountain Avenue, PET FOOD & Chouchou, Eastern River Bridge, and Buggy's Grand Chapiteau).
 */
export const ORGAN_CAMERA_PRESETS: OrganCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle:
      "Île d'Organ · Crêtes rocheuses nord, rivière et pont de bois, Orange Town, grand chapiteau de Baggy à droite et navire Big Top",
    position: [6, 118, 124],
    target: [4, 3, 14],
    isStreetView: false,
  },
  {
    id: 'sea-big-top',
    label: 'Navire Big Top · Quai',
    subtitle:
      "Approche du port sud face au Big Top de Baggy (chapiteau rayé rouge et blanc et figure de proue clown) devant Orange Town",
    position: [-26.0, 12.5, 96.0],
    target: [-2.0, 4.8, 52.0],
    isStreetView: false,
  },
  {
    id: 'whale-fountain',
    label: 'Fontaine Baleine (Rue)',
    subtitle:
      "À hauteur d'homme sur l'avenue pavée devant la fontaine Baleine, les maisons à colombages et le clocher d'Orange Town",
    position: [-10.0, sampleOrganWalkSurfaceHeight(-10.0, 53.2) + 1.85, 53.2],
    target: [-10.0, ORGAN_TOWN_Y + 2.05, 32.0],
    isStreetView: true,
  },
  {
    id: 'pet-food-chouchou',
    label: 'Boutique Chouchou',
    subtitle:
      "À hauteur d'homme devant la boutique PET FOOD héroïquement gardée par le petit chien blanc Chouchou",
    position: [6.8, sampleOrganWalkSurfaceHeight(6.8, 38.6) + 1.85, 38.6],
    target: [6.2, ORGAN_TOWN_Y + 1.45, 31.2],
    isStreetView: true,
  },
  {
    id: 'buggy-chapiteau',
    label: 'Chapiteau de Baggy',
    subtitle:
      "À hauteur d'homme devant le grand chapiteau rayé rouge et blanc de Baggy le Clown, juste à droite après le pont",
    position: [33.5, sampleOrganWalkSurfaceHeight(33.5, 37.6) + 1.85, 37.6],
    target: [ORGAN_LANDMARKS.buggyChapiteau.x, ORGAN_EAST_CLEARING_Y + 4.8, ORGAN_LANDMARKS.buggyChapiteau.z],
    isStreetView: true,
  },
  {
    id: 'east-river-bridge',
    label: 'Pont de la Rivière',
    subtitle:
      "Vue humaine sur le pont en bois traversant la rivière d'Organ vers le grand chapiteau de Baggy dans la clairière à droite",
    position: [23.8, sampleOrganWalkSurfaceHeight(23.8, 39.2) + 1.85, 39.2],
    target: [ORGAN_LANDMARKS.buggyChapiteau.x, ORGAN_EAST_CLEARING_Y + 3.4, ORGAN_LANDMARKS.buggyChapiteau.z],
    isStreetView: true,
  },
];
