import { valueNoise2D } from './globeMath';

export const EGGHEAD_WORLD_SIZE = 240;
export const EGGHEAD_GLOBE_SCALE = 0.0022;
export const EGGHEAD_GLOBE_CENTER = { u: 0.354, v: 0.538 };
export const EGGHEAD_ANGULAR_MASK_RADIUS = 0.036;

export const EGGHEAD_FABRIOPHASE_Y = 12.0;
export const EGGHEAD_CLOUD_DECK_Y = 64.0;
export const EGGHEAD_CLOUD_BAND_Y = 60.4;

export const EGGHEAD_PUNK_TOWER_CENTER = { x: 0, z: -5 };
export const EGGHEAD_PUNK_RECORDS_CENTER = { x: 0, z: -2 };
export const EGGHEAD_EMET_CENTER = { x: -24, z: 24 };
export const EGGHEAD_HARBOR_CENTER = { x: 18, z: 42 };

export const EGGHEAD_SUB_LOCATIONS: Record<string, [number, number]> = {
  'egghead-island': [0, 0],
};

export const EGGHEAD_LANDMARKS = {
  punkTower: { x: 0, y: 12.0, z: -5 },
  fabriophasePlaza: { x: -4, y: 12.0, z: 14 },
  vegaforceArena: { x: 14, y: 12.0, z: 4 },
  emetHollow: { x: -24, y: 12.4, z: 24 },
  futureHarbor: { x: 18, y: 2.0, z: 44 },
  labophaseDeck: { x: 0, y: 65.0, z: 16 },
  punkRecordsDome: { x: 0, y: 74.0, z: -2 },
  sunnySpawnSea: { x: 46, z: 72 },
};

export type EggheadZone =
  | 'sea'
  | 'cliffs'
  | 'harbor'
  | 'fabriophase'
  | 'emet-scrapyard'
  | 'island-cloud'
  | 'labophase'
  | 'punk-records';

export interface EggheadCameraPreset {
  id: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export const EGGHEAD_CAMERA_PRESETS: readonly EggheadCameraPreset[] = [
  {
    id: 'overview',
    label: 'Vue Générale · Egghead',
    position: [28, 70, 142],
    target: [0, 47, -2],
  },
  {
    id: 'fabriophase-street',
    label: 'Fabriophase · Avenue VEGA',
    position: [-1.8, 21.2, 31.8],
    target: [-2.5, 19.6, 5.5],
  },
  {
    id: 'vegaforce-skypath',
    label: 'Sky-Paths & Vegaforce-01',
    position: [24.5, 22.5, 14.5],
    target: [11.0, 21.5, 3.5],
  },
  {
    id: 'punk-tower',
    label: 'Tour PUNK & Fusée à Vide',
    position: [18, 28, 48],
    target: [0, 34, -5],
  },
  {
    id: 'labophase-dome',
    label: 'Labophase & Punk Records',
    position: [8, 77, 46],
    target: [0, 81, -2],
  },
  {
    id: 'emet-scrapyard',
    label: "Géant d'Acier (Emet)",
    position: [-11.5, 20.8, 34.8],
    target: [-24.0, 20.2, 24.0],
  },
  {
    id: 'future-port',
    label: 'Port Futuriste & Défenses',
    position: [44, 17.5, 69],
    target: [18, 9.0, 38],
  },
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Signed distance on the XZ plane to Egghead's lower rocky cliff perimeter and armored port piers.
 * Positive = open navigable sea; Negative = rock/harbor pier collision.
 */
export function eggheadCliffSignedDist(lx: number, lz: number): number {
  const ang = Math.atan2(lz, lx);
  // Subtle organic coastline undulation + harbor bay indent in the southeast
  const coastRipple =
    Math.sin(ang * 5.0 + 0.6) * 2.4 +
    Math.cos(ang * 9.0 - 0.8) * 1.4 +
    (valueNoise2D(lx * 0.06 + 1.4, lz * 0.06 - 2.3) - 0.5) * 3.8;

  const rx = 50.5 + coastRipple;
  const rz = 45.0 + coastRipple * 0.85;
  const normR = Math.hypot(lx / rx, lz / rz);
  let dist = (normR - 1.0) * 47.0;

  // Southeast Futuristic Port Harbor Cove recessed cleanly into outer coast (z > 37 is open boat basin)
  const coveDx = (lx - 18) / 11.5;
  const coveDz = (lz - 46.5) / 9.2;
  const coveD = (Math.hypot(coveDx, coveDz) - 1.0) * 10.0;
  if (coveD < 0) {
    dist = Math.max(dist, -coveD - 1.5);
  }

  // Twin armored sea-gate breakwaters / piers flanking the futuristic harbor
  const westPier = Math.max(Math.abs(lx - 7.5) - 2.8, Math.abs(lz - 46.5) - 7.5);
  const eastPier = Math.max(Math.abs(lx - 28.5) - 2.8, Math.abs(lz - 45.5) - 7.5);
  dist = Math.min(dist, westPier, eastPier);

  return dist;
}

/**
 * Normalized radial coordinate for the upper floating Island Cloud plateau.
 */
export function eggheadCloudNormRadius(lx: number, lz: number): number {
  const ang = Math.atan2(lz, lx);
  const puff =
    Math.sin(ang * 7.0 + 0.4) * 1.6 +
    Math.cos(ang * 11.0 - 1.1) * 1.1;
  return Math.hypot(lx / (41.0 + puff), lz / (37.0 + puff * 0.85));
}

/**
 * Lower island height in local meters (sea cliffs, tropical outer rim, Emet hollow, Fabriophase deck, harbor).
 */
export function sampleEggheadLowerHeight(lx: number, lz: number): number {
  const cliffDist = eggheadCliffSignedDist(lx, lz);
  if (cliffDist >= 0.8) return 0;

  const inland = smoothstep(0.8, -5.8, cliffDist);
  const n1 = valueNoise2D(lx * 0.08 + 4.1, lz * 0.08 - 3.7);
  const n2 = valueNoise2D(lx * 0.22 - 1.9, lz * 0.22 + 5.2);

  // Futuristic Harbor Quay sits cleanly at low water level (y ~ 2.6m) behind seawall z > 32
  const inHarborBox =
    Math.abs(lx - 18) < 13.5 && lz > 30.0 && lz < 53.5;
  const harborEdgeDist = Math.max(
    Math.abs(lx - 18) - 10.5,
    Math.max(33.5 - lz, lz - 52.0)
  );
  const harborBlend = inHarborBox ? 1.0 - smoothstep(-1.2, 3.2, harborEdgeDist) : 0;

  // Base tropical cliff plateau (~12m) with vegetated coastal hills rising around Fabriophase (~13..18m)
  const rCenter = Math.hypot(lx / 36.0, lz / 32.0);
  const greenRimBump =
    smoothstep(0.68, 1.02, rCenter) *
    (1.0 - smoothstep(1.05, 1.38, rCenter)) *
    (3.4 + n1 * 4.2 + n2 * 1.6);

  // Fabriophase urban terrace stays crisp and walkable at 12.0m
  let h =
    inland *
    (EGGHEAD_FABRIOPHASE_Y +
      greenRimBump * (1.0 - harborBlend * 0.92) +
      (n2 - 0.5) * 0.35);

  // Crisp flat harbor quay shelf
  const harborSurfaceY = 2.6 + (n2 - 0.5) * 0.1;
  h = h * (1.0 - harborBlend * 0.95) + harborSurfaceY * (harborBlend * 0.95);

  // Carve Emet's rocky palm-shaded hollow on SW flank (flat junkyard floor ~11.8m backed by rock wall ~17.5m behind)
  const emetDx = lx - EGGHEAD_EMET_CENTER.x;
  const emetDz = lz - EGGHEAD_EMET_CENTER.z;
  const emetR = Math.hypot(emetDx, emetDz);
  if (emetR < 15.0) {
    const basin = 1.0 - smoothstep(5.5, 12.5, emetR);
    const backRidge = smoothstep(-2.0, -9.5, emetDx * 0.65 + emetDz * 0.76);
    const hollowTarget = 11.8 + backRidge * 6.4 + n1 * 1.2;
    h = h * (1.0 - basin) + hollowTarget * basin;
  }

  return Math.max(0, h);
}

/**
 * Upper Labophase Island Cloud plateau top elevation in local meters (~64..66.5m).
 * Returns 0 outside the floating Island Cloud footprint.
 */
export function sampleEggheadCloudHeight(lx: number, lz: number): number {
  const nr = eggheadCloudNormRadius(lx, lz);
  if (nr >= 1.0) return 0;

  const dome = Math.sqrt(Math.max(0, 1.0 - nr * nr * 0.85));
  const rimTuck = smoothstep(1.0, 0.72, nr);
  const deck = EGGHEAD_CLOUD_DECK_Y + dome * 1.8 * rimTuck;

  // Slight raised terrace ring under Punk Records crater
  const rEgg = Math.hypot(lx - EGGHEAD_PUNK_RECORDS_CENTER.x, lz - EGGHEAD_PUNK_RECORDS_CENTER.z);
  const eggPlinth = (1.0 - smoothstep(14.5, 22.0, rEgg)) * 1.2;
  return deck + eggPlinth;
}

/**
 * Surface height clamped during camera street-walking / globe zoom.
 * Automatically picks Labophase upper cloud deck when camera is elevated above 42m,
 * or lower Fabriophase / Emet hollow when inspecting the lower island.
 */
export function sampleEggheadWalkSurfaceHeight(
  lx: number,
  lz: number,
  camHeightM = 20.0
): number {
  if (camHeightM >= 42.0) {
    const cloudH = sampleEggheadCloudHeight(lx, lz);
    if (cloudH > 0) return cloudH;
  }
  return sampleEggheadLowerHeight(lx, lz);
}

export function sampleEggheadZone(
  lx: number,
  lz: number,
  ly = EGGHEAD_FABRIOPHASE_Y
): EggheadZone {
  if (ly >= 48.0) {
    const rEgg = Math.hypot(lx - EGGHEAD_PUNK_RECORDS_CENTER.x, lz - EGGHEAD_PUNK_RECORDS_CENTER.z);
    if (rEgg < 16.0) return 'punk-records';
    const nr = eggheadCloudNormRadius(lx, lz);
    if (nr < 0.78) return 'labophase';
    if (nr < 1.05) return 'island-cloud';
    return 'sea';
  }

  const cliffDist = eggheadCliffSignedDist(lx, lz);
  if (cliffDist >= 0.4) return 'sea';

  const harborDist = Math.hypot((lx - 18) / 14.5, (lz - 39.5) / 11.5);
  if (harborDist < 1.05) return 'harbor';

  const emetDist = Math.hypot(lx - EGGHEAD_EMET_CENTER.x, lz - EGGHEAD_EMET_CENTER.z);
  if (emetDist < 12.5) return 'emet-scrapyard';

  const rFab = Math.hypot(lx / 33.5, lz / 29.0);
  if (rFab < 1.0) return 'fabriophase';

  return 'cliffs';
}

export function toEggheadSphereLocal(
  lx: number,
  ly: number,
  lz: number,
  globeRadius: number
): { x: number; y: number; z: number } {
  const sx = lx * EGGHEAD_GLOBE_SCALE;
  const sz = lz * EGGHEAD_GLOBE_SCALE;
  const sy = ly * EGGHEAD_GLOBE_SCALE;
  const rr = globeRadius + sy;
  const d = Math.hypot(sx, sz);
  if (d < 1e-6) {
    return { x: 0, y: sy, z: 0 };
  }
  const theta = d / globeRadius;
  const s = Math.sin(theta) / d;
  const c = Math.cos(theta);
  return {
    x: rr * sx * s,
    y: rr * c - globeRadius,
    z: rr * sz * s,
  };
}
