import { equirectangularToSphere, valueNoise2D } from './globeMath';

export const ZOU_WORLD_SIZE = 280;
export const ZOU_GLOBE_SCALE = 0.0022;
export const ZOU_GLOBE_CENTER = { u: 0.258, v: 0.558 } as const;
export const ZOU_ANGULAR_MASK_RADIUS = 0.04;

/** Base local Y (meters) of the Mokomo plateau atop Zunesha's rounded back. */
export const ZOU_BACK_DECK_Y = 66.0;

/** Horizontal elliptical radii of the walled island atop Zunesha's back (meters). */
export const ZOU_PLATEAU_RX = 52.0;
export const ZOU_PLATEAU_RZ = 46.0;

export type ZouZone =
  | 'sea'
  | 'zunesha-body'
  | 'monolith-rim'
  | 'whale-forest'
  | 'mokomo-city'
  | 'citadel'
  | 'ravaged-district';

export interface ZouLegSpec {
  id: string;
  x: number;
  z: number;
  radiusSea: number;
  radiusTop: number;
  stridePhase: number;
}

export interface ZouMonolithSpec {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  yaw: number;
}

export interface ZouCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

export const ZUNESHA_LEGS: readonly ZouLegSpec[] = [
  { id: 'front-left', x: -34, z: 23, radiusSea: 10.5, radiusTop: 14.0, stridePhase: 0.0 },
  { id: 'front-right', x: -30, z: -23, radiusSea: 10.5, radiusTop: 14.0, stridePhase: Math.PI * 0.65 },
  { id: 'back-left', x: 35, z: 21, radiusSea: 10.2, radiusTop: 13.5, stridePhase: Math.PI * 0.95 },
  { id: 'back-right', x: 40, z: -21, radiusSea: 10.2, radiusTop: 13.5, stridePhase: Math.PI * 0.28 },
] as const;

export const ZOU_MONOLITHS: readonly ZouMonolithSpec[] = [
  { id: 'mono-nw', x: -31, z: -23, width: 13.5, depth: 10.5, height: 28, yaw: 0.55 },
  { id: 'mono-n', x: 6, z: -34, width: 11.5, depth: 9.5, height: 25, yaw: -0.18 },
  { id: 'mono-ne', x: 34, z: -18, width: 14.0, depth: 10.8, height: 30, yaw: -0.78 },
  { id: 'mono-e', x: 37, z: 12, width: 13.0, depth: 10.2, height: 27, yaw: 1.28 },
  { id: 'mono-se', x: 18, z: 33, width: 10.5, depth: 8.8, height: 22, yaw: 0.42 },
  { id: 'mono-sw', x: -16, z: 33, width: 12.8, depth: 10.0, height: 26, yaw: -0.45 },
  { id: 'mono-w', x: -38, z: 4, width: 13.8, depth: 11.2, height: 29, yaw: 0.14 },
] as const;

export const ZOU_LANDMARKS = {
  zuneshaHead: { x: -78, y: 58, z: 0 },
  zuneshaTrunkTip: { x: -124, y: 54, z: 0 },
  citadel: { x: 0, y: ZOU_BACK_DECK_Y + 10.5, z: -2 },
  mokomoPlaza: { x: 0, y: ZOU_BACK_DECK_Y + 2.2, z: 16 },
  whaleTree: { x: 0, y: ZOU_BACK_DECK_Y + 15.0, z: -19 },
  roadPoneglyphShrine: { x: 0, y: ZOU_BACK_DECK_Y + 14.0, z: -13.5 },
  ravagedQuarter: { x: -18, y: ZOU_BACK_DECK_Y + 2.0, z: 18 },
  lookoutDeck: { x: 26, y: ZOU_BACK_DECK_Y + 6.5, z: 27 },
  sunnySpawnSea: { x: -146, z: 78 },
} as const;

export const ZOU_CAMERA_PRESETS: readonly ZouCameraPreset[] = [
  {
    id: 'overview',
    label: 'Zunesha depuis la mer',
    subtitle: 'Vue majestueuse du pachyderme millénaire avançant au-dessus des flots et des nuages',
    position: [-186, 46, 142],
    target: [-26, 44, 0],
    isStreetView: false,
  },
  {
    id: 'aerial-mokomo',
    label: 'Dos de Zo & Arc-en-ciel',
    subtitle: 'Panorama aérien du Duché de Mokomo, des monolithes moussus et de l\'arc-en-ciel',
    position: [-76, 158, 118],
    target: [-6, 74, 0],
    isStreetView: false,
  },
  {
    id: 'citadel-aqueducts',
    label: 'Citadelle & Aqueducs',
    subtitle: 'Cité en terrasses de Mokomo et ses quatre aqueducs cyan sous l\'Arbre-Baleine',
    position: [2, ZOU_BACK_DECK_Y + 12.5, 38],
    target: [0, ZOU_BACK_DECK_Y + 23.0, -11],
    isStreetView: true,
  },
  {
    id: 'whale-tree',
    label: 'Forêt & Arbre-Baleine',
    subtitle: 'Panorama sur l\'Arbre-Baleine géant, les monolithes sacrés et la Forêt de la Baleine',
    position: [26, ZOU_BACK_DECK_Y + 27.5, 19],
    target: [1, ZOU_BACK_DECK_Y + 27.0, -16],
    isStreetView: true,
  },
  {
    id: 'ravaged-koro',
    label: 'Quartier Ravagé & Gaz Koro',
    subtitle: 'Stigmates de l\'assaut de Jack : remparts brisés, décombres et brumes toxiques violettes',
    position: [-30, ZOU_BACK_DECK_Y + 12.0, 31],
    target: [-17, ZOU_BACK_DECK_Y + 3.5, 18],
    isStreetView: true,
  },
  {
    id: 'eruption-rain',
    label: 'Pluies d\'Éruption',
    subtitle: 'Zunesha projette des torrents d\'eau de mer sur son dos pour nourrir toute l\'île',
    position: [-178, 92, 138],
    target: [-38, 70, 0],
    isStreetView: false,
  },
] as const;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Projects Zou local meters `(x, y, z)` onto the globe's tangent-space local coordinates
 * (`y = 0` at ocean level `r = globeRadius`, `y = ZOU_BACK_DECK_Y` high above the clouds).
 */
export function toZouSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * ZOU_GLOBE_SCALE;
  const sz = z * ZOU_GLOBE_SCALE;
  const rTarget = globeRadius + y * ZOU_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/** Normalized elliptical distance inside the plateau atop Zunesha's back (`<= 1.0` inside wall). */
export function zouPlateauNormRadius(x: number, z: number): number {
  const nx = x / ZOU_PLATEAU_RX;
  const nz = z / ZOU_PLATEAU_RZ;
  const n = valueNoise2D(x * 0.08 + 2.3, z * 0.08 - 4.1) - 0.5;
  return Math.hypot(nx, nz) + n * 0.045;
}

/** Signed distance in meters from the plateau rim (`< 0` inside Zou island back, `> 0` outside). */
export function zouPlateauSignedDist(x: number, z: number): number {
  const nr = zouPlateauNormRadius(x, z);
  return (nr - 1.0) * 48.0;
}

/** Checks whether `(x, z)` at sea level intersects one of Zunesha's 4 colossal ocean-standing legs. */
export function zouSeaLegSignedDist(x: number, z: number): number {
  let minDist = 1e6;
  for (let i = 0; i < ZUNESHA_LEGS.length; i++) {
    const leg = ZUNESHA_LEGS[i];
    const d = Math.hypot(x - leg.x, z - leg.z) - (leg.radiusSea + 2.5);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

export function isPointInsideRavagedSector(x: number, z: number): boolean {
  const dx = (x + 17.5) / 14.0;
  const dz = (z - 18.0) / 13.5;
  return dx * dx + dz * dz < 1.0;
}

export function sampleZouZone(x: number, z: number): ZouZone {
  const nr = zouPlateauNormRadius(x, z);
  if (nr > 1.04) {
    if (zouSeaLegSignedDist(x, z) < 0) return 'zunesha-body';
    if (x > -115 && x < 72 && Math.abs(z) < 48) return 'zunesha-body';
    return 'sea';
  }
  if (nr > 0.91) return 'monolith-rim';

  const distCitadel = Math.hypot(x, z + 2.0);
  if (distCitadel < 9.2) return 'citadel';

  if (isPointInsideRavagedSector(x, z)) return 'ravaged-district';

  const distCity = Math.hypot(x * 0.92, (z - 5.5) * 1.05);
  if (distCity < 23.5 && z > -10) return 'mokomo-city';

  return 'whale-forest';
}

/**
 * Samples the terrain height (in local meters above sea level) on Zunesha's back plateau.
 * Returns `0` outside Zunesha's back plateau.
 */
export function sampleZouHeight(x: number, z: number): number {
  const nr = zouPlateauNormRadius(x, z);
  if (nr > 1.03) return 0;

  const rimFade = 1.0 - smoothstep(0.95, 1.03, nr);
  const micro =
    (valueNoise2D(x * 0.14 + 5.1, z * 0.14 - 3.7) - 0.5) * 1.1 +
    (valueNoise2D(x * 0.38 - 1.9, z * 0.38 + 8.4) - 0.5) * 0.45;

  // Stone parapet rim ridge
  const rimWall =
    Math.exp(-Math.pow((nr - 0.965) / 0.035, 2)) *
    (isPointInsideRavagedSector(x, z) ? 0.6 : 2.5);

  // Central terraced mound for Mokomo Dukedom & Citadel
  const cityDist = Math.hypot(x, z - 2.0);
  const cityStepBase =
    (1.0 - smoothstep(8.0, 24.5, cityDist)) * 7.8 +
    (1.0 - smoothstep(4.5, 12.5, Math.hypot(x, z + 2.0))) * 3.2;

  // Whale Forest sacred hill behind (north of) the Citadel
  const whaleHillDist = Math.hypot(x * 0.78, z + 20.5);
  const whaleHill = (1.0 - smoothstep(4.0, 23.0, whaleHillDist)) * 16.0;

  // Outer forested undulations & lookout ridge
  const forestRing =
    smoothstep(0.45, 0.85, nr) * (1.0 - smoothstep(0.86, 0.96, nr)) * 3.2;
  const lookoutMound =
    (1.0 - smoothstep(3.0, 12.0, Math.hypot(x - 26, z - 27))) * 4.5;

  const h =
    ZOU_BACK_DECK_Y -
    1.2 +
    (rimWall + cityStepBase + whaleHill + forestRing + lookoutMound + micro) *
      rimFade;

  return Math.max(ZOU_BACK_DECK_Y - 1.5, h);
}

/**
 * Walkable height used by street-view camera clamping & character exploration on Zou.
 */
export function sampleZouWalkSurfaceHeight(x: number, z: number): number {
  const nr = zouPlateauNormRadius(x, z);
  if (nr > 1.02) return 0;
  let h = sampleZouHeight(x, z);

  // Citadel upper bastion floor
  const dCit = Math.hypot(x, z + 2.0);
  if (dCit < 8.4) {
    h = Math.max(h, ZOU_BACK_DECK_Y + 10.2);
  }
  // Wooden lookout platform
  if (Math.hypot(x - 26, z - 27) < 4.5) {
    h = Math.max(h, ZOU_BACK_DECK_Y + 6.3);
  }
  return h;
}

/**
 * Verifies clearance from nearby charted New World islands on the globe.
 */
export function angularDistanceToZou(u: number, v: number): number {
  const a = equirectangularToSphere(u, v, 1);
  const b = equirectangularToSphere(ZOU_GLOBE_CENTER.u, ZOU_GLOBE_CENTER.v, 1);
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  return Math.acos(dot);
}
