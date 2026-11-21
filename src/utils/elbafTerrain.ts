import { valueNoise2D } from './globeMath';

export const ELBAF_WORLD_SIZE = 280;
export const ELBAF_GLOBE_SCALE = 0.0021;
export const ELBAF_GLOBE_CENTER = { u: 0.378, v: 0.504 };
export const ELBAF_ANGULAR_MASK_RADIUS = 0.036;

export const ELBAF_UNDERWORLD_Y = 10.5;
export const ELBAF_SUNWORLD_Y = 66.0;
export const ELBAF_HEAVEN_Y = 126.0;

export const ELBAF_TRUNK_CENTER = { x: 0, z: -2 };
export const ELBAF_AURUST_CENTER = { x: -42, z: -4 };
export const ELBAF_WEST_VILLAGE_CENTER = { x: -32, z: 12 };
export const ELBAF_CHIEFTAIN_CENTER = { x: -12, z: 14 };
export const ELBAF_SWORD_CENTER = { x: 18, z: 18 };
export const ELBAF_HARBOR_CENTER = { x: 16, z: 58 };

export const ELBAF_SUB_LOCATIONS: Record<string, [number, number]> = {
  elbaf: [0, 0],
};

export const ELBAF_LANDMARKS = {
  adamTrunk: { x: 0, y: 10.5, z: -2 },
  aurustCastle: { x: -42, y: 74.0, z: -4 },
  westVillage: { x: -32, y: 67.5, z: 12 },
  chieftainHall: { x: -12, y: 76.0, z: 14 },
  owlLibrary: { x: -12, y: 67.0, z: 28 },
  giantSword: { x: 18, y: 67.0, z: 18 },
  brewVillage: { x: 4, y: 67.0, z: -36 },
  underworldFjord: { x: 16, y: 2.0, z: 58 },
  heavenCrown: { x: 0, y: 128.0, z: -2 },
  sunnySpawnSea: { x: 26, z: 92 },
};

export type ElbafZone =
  | 'sea'
  | 'fjord-harbor'
  | 'underworld-snow'
  | 'underworld-forest'
  | 'adam-trunk'
  | 'aurust-castle'
  | 'sunworld-village'
  | 'heaven-world';

export interface ElbafCameraPreset {
  id: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export const ELBAF_CAMERA_PRESETS: readonly ElbafCameraPreset[] = [
  {
    id: 'overview',
    label: 'Vue Générale · Elbaf & Yggdrasil',
    position: [22, 76, 170],
    target: [0, 66, -2],
  },
  {
    id: 'sunworld-west-village',
    label: "Monde du Soleil · Village de l'Ouest",
    position: [-12, 81, 46],
    target: [-32, 72, 8],
  },
  {
    id: 'aurust-castle',
    label: "Château Royal d'Aurust",
    position: [-18, 89, 34],
    target: [-42, 80, -4],
  },
  {
    id: 'banquet-hall',
    label: 'Hall du Chef & Taverne Viking',
    position: [6, 84, 34],
    target: [-14, 73, 14],
  },
  {
    id: 'giant-sword-library',
    label: 'Épée Géante & Bibliothèque',
    position: [48, 94, 54],
    target: [12, 79, 18],
  },
  {
    id: 'underworld-fjord',
    label: 'Monde Souterrain & Port Viking',
    position: [36, 26, 98],
    target: [8, 15, 42],
  },
  {
    id: 'heaven-world',
    label: "Monde Céleste · Cime d'Adam",
    position: [24, 150, 48],
    target: [0, 134, -2],
  },
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Signed distance on the XZ plane to Elbaf's rugged Underworld mountain coast and Viking fjord breakwaters.
 * Positive = open navigable sea; Negative = rocky cliff / pier collision.
 */
export function elbafCliffSignedDist(lx: number, lz: number): number {
  const ang = Math.atan2(lz, lx);
  const coastRipple =
    Math.sin(ang * 5.0 + 0.4) * 3.8 +
    Math.cos(ang * 8.0 - 0.9) * 2.4 +
    (valueNoise2D(lx * 0.045 + 1.7, lz * 0.045 - 2.2) - 0.5) * 5.5;

  const rx = 64.0 + coastRipple;
  const rz = 58.0 + coastRipple * 0.9;
  const normR = Math.hypot(lx / rx, lz / rz);
  let dist = (normR - 1.0) * 60.0;

  // Deep SE Fjord Cove opening south-southeast for giant Viking Longships
  const coveDx = (lx - 16) / 13.0;
  const coveDz = (lz - 62.0) / 14.0;
  const coveD = (Math.hypot(coveDx, coveDz) - 1.0) * 12.5;
  if (coveD < 0) {
    dist = Math.max(dist, -coveD - 2.0);
  }

  // Twin Dragon-head Viking Breakwater Piers guarding the fjord mouth
  const westPier = Math.max(Math.abs(lx - 4.0) - 3.2, Math.abs(lz - 61.5) - 9.0);
  const eastPier = Math.max(Math.abs(lx - 28.0) - 3.2, Math.abs(lz - 60.5) - 9.0);
  dist = Math.min(dist, westPier, eastPier);

  return dist;
}

/**
 * Normalized radial coordinate for the Sun World (middle bough tier, radius ~ 58m).
 */
export function elbafSunWorldNormRadius(lx: number, lz: number): number {
  const ang = Math.atan2(lz, lx);
  const boughLobe =
    Math.sin(ang * 6.0 + 0.5) * 3.6 +
    Math.cos(ang * 10.0 - 1.2) * 2.1 +
    (valueNoise2D(lx * 0.05 + 3.1, lz * 0.05 + 1.4) - 0.5) * 3.4;
  return Math.hypot(lx / (57.5 + boughLobe), lz / (52.5 + boughLobe * 0.9));
}

/**
 * Normalized radial coordinate for the Heaven World (upper canopy crown, radius ~ 43m).
 */
export function elbafHeavenNormRadius(lx: number, lz: number): number {
  const ang = Math.atan2(lz, lx);
  const crownLobe =
    Math.sin(ang * 7.0 - 0.3) * 2.6 +
    Math.cos(ang * 11.0 + 0.8) * 1.5;
  return Math.hypot(lx / (42.5 + crownLobe), lz / (39.5 + crownLobe * 0.9));
}

/**
 * Underworld ground elevation in local meters (icy fjord coast, jagged snow peaks, ancient forest & Adam root flare).
 */
export function sampleElbafUnderworldHeight(lx: number, lz: number): number {
  const cliffDist = elbafCliffSignedDist(lx, lz);
  if (cliffDist >= 0.8) return 0;

  const inland = smoothstep(0.8, -6.5, cliffDist);
  const n1 = valueNoise2D(lx * 0.07 + 3.4, lz * 0.07 - 2.9);
  const n2 = valueNoise2D(lx * 0.19 - 2.1, lz * 0.19 + 4.7);

  // Outer jagged Underworld mountain crown around r = 42..60m
  const radial = Math.hypot(lx / 54.0, lz / 49.0);
  const mountainRing =
    smoothstep(0.55, 0.86, radial) *
    (1.0 - smoothstep(0.95, 1.18, radial)) *
    (10.5 + n1 * 12.5 + Math.abs(n2 - 0.5) * 9.0);

  // SE Viking Fjord Harbor dock shelf stays low (~2.6m) behind z > 44
  const inHarborBox = Math.abs(lx - 16) < 16.0 && lz > 40.0 && lz < 70.0;
  const harborEdgeDist = Math.max(
    Math.abs(lx - 16) - 12.5,
    Math.max(44.5 - lz, lz - 68.5)
  );
  const harborBlend = inHarborBox ? 1.0 - smoothstep(-1.5, 4.0, harborEdgeDist) : 0;

  // Root flare rising toward Treasure Tree Adam trunk
  const rTrunk = Math.hypot(lx - ELBAF_TRUNK_CENTER.x, lz - ELBAF_TRUNK_CENTER.z);
  const rootFlare = (1.0 - smoothstep(13.0, 29.0, rTrunk)) * (9.5 + n1 * 3.5);

  let h =
    inland *
    (ELBAF_UNDERWORLD_Y +
      mountainRing * (1.0 - harborBlend * 0.95) +
      rootFlare +
      (n2 - 0.5) * 1.1);

  const harborSurfaceY = 2.6 + (n2 - 0.5) * 0.12;
  h = h * (1.0 - harborBlend * 0.95) + harborSurfaceY * (harborBlend * 0.95);

  return Math.max(0, h);
}

/**
 * Sun World plateau elevation (middle bough realm ~66..79m: central trunk, Aurust cliff, Chieftain promontory, villages).
 */
export function sampleElbafSunWorldHeight(lx: number, lz: number): number {
  const nr = elbafSunWorldNormRadius(lx, lz);
  if (nr >= 1.0) return 0;

  const n1 = valueNoise2D(lx * 0.08 - 1.5, lz * 0.08 + 2.7);
  const n2 = valueNoise2D(lx * 0.24 + 4.3, lz * 0.24 - 3.1);

  const rimBevel = smoothstep(1.0, 0.84, nr);
  let h = ELBAF_SUNWORLD_Y + rimBevel * (1.4 + n1 * 1.4 + (n2 - 0.5) * 0.4);

  // Aurust Castle elevated rocky outcrop on the West edge
  const rAurust = Math.hypot((lx - ELBAF_AURUST_CENTER.x) / 11.5, (lz - ELBAF_AURUST_CENTER.z) / 10.5);
  if (rAurust < 1.35) {
    h += (1.0 - smoothstep(0.45, 1.35, rAurust)) * 7.8;
  }

  // Chieftain's Banquet Hall rocky promontory (elbaf5_85b7ca3d.jpg)
  const rChief = Math.hypot((lx - ELBAF_CHIEFTAIN_CENTER.x) / 9.5, (lz - ELBAF_CHIEFTAIN_CENTER.z) / 8.5);
  if (rChief < 1.3) {
    h += (1.0 - smoothstep(0.4, 1.3, rChief)) * 8.2;
  }

  return h;
}

/**
 * Heaven World canopy crest elevation (upper Yggdrasil crown ~126..134m).
 */
export function sampleElbafHeavenHeight(lx: number, lz: number): number {
  const nr = elbafHeavenNormRadius(lx, lz);
  if (nr >= 1.0) return 0;

  const n1 = valueNoise2D(lx * 0.09 + 5.2, lz * 0.09 - 4.4);
  const dome = Math.sqrt(Math.max(0, 1.0 - nr * nr * 0.72));
  return ELBAF_HEAVEN_Y + dome * 6.5 + (n1 - 0.5) * 1.2;
}

/**
 * Three-tier walk surface clamping for globe close-up exploration:
 * - >= 112m: Heaven World summit canopy
 * - >= 52m: Sun World village & castle boughs
 * - < 52m: Underworld snow mountains & Viking fjord harbor
 */
export function sampleElbafWalkSurfaceHeight(
  lx: number,
  lz: number,
  camHeightM = 20.0
): number {
  if (camHeightM >= 112.0) {
    const heavenH = sampleElbafHeavenHeight(lx, lz);
    if (heavenH > 0) return heavenH;
  }
  if (camHeightM >= 52.0) {
    const sunH = sampleElbafSunWorldHeight(lx, lz);
    if (sunH > 0) return sunH;
  }
  return sampleElbafUnderworldHeight(lx, lz);
}

export function sampleElbafZone(
  lx: number,
  lz: number,
  ly = ELBAF_UNDERWORLD_Y
): ElbafZone {
  if (ly >= 112.0) {
    return elbafHeavenNormRadius(lx, lz) < 1.04 ? 'heaven-world' : 'sea';
  }

  const rTrunk = Math.hypot(lx - ELBAF_TRUNK_CENTER.x, lz - ELBAF_TRUNK_CENTER.z);
  if (rTrunk < 14.5) return 'adam-trunk';

  if (ly >= 52.0) {
    if (elbafSunWorldNormRadius(lx, lz) >= 1.04) return 'sea';
    const rAurust = Math.hypot(lx - ELBAF_AURUST_CENTER.x, lz - ELBAF_AURUST_CENTER.z);
    if (rAurust < 13.0) return 'aurust-castle';
    return 'sunworld-village';
  }

  const cliffDist = elbafCliffSignedDist(lx, lz);
  if (cliffDist >= 0.4) return 'sea';

  const harborDist = Math.hypot((lx - 16) / 16.0, (lz - 53.0) / 12.5);
  if (harborDist < 1.05) return 'fjord-harbor';

  const radial = Math.hypot(lx / 54.0, lz / 49.0);
  if (radial > 0.62) return 'underworld-snow';
  return 'underworld-forest';
}

export function toElbafSphereLocal(
  lx: number,
  ly: number,
  lz: number,
  globeRadius: number
): { x: number; y: number; z: number } {
  const sx = lx * ELBAF_GLOBE_SCALE;
  const sz = lz * ELBAF_GLOBE_SCALE;
  const sy = ly * ELBAF_GLOBE_SCALE;
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
