import { valueNoise2D } from './globeMath';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function ellipseSd(
  x: number,
  z: number,
  cx: number,
  cz: number,
  rx: number,
  rz: number
): number {
  const dx = (x - cx) / rx;
  const dz = (z - cz) / rz;
  return (Math.hypot(dx, dz) - 1.0) * Math.min(rx, rz);
}

function boxSd(
  x: number,
  z: number,
  cx: number,
  cz: number,
  hx: number,
  hz: number
): number {
  const dx = Math.abs(x - cx) - hx;
  const dz = Math.abs(z - cz) - hz;
  return Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dz), 0);
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

export interface StationCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

// ============================================================================
// 1. SHIFT STATION (u: 0.798, v: 0.508) — Lighthouse & Twin Sea Platforms
// ============================================================================

export const SHIFT_WORLD_SIZE = 110;
export const SHIFT_GLOBE_SCALE = 0.0013;
export const SHIFT_GLOBE_CENTER = { u: 0.798, v: 0.508 } as const;
export const SHIFT_ANGULAR_MASK_RADIUS = 0.011;
export const SHIFT_SEA_LEVEL_Y = 1.0;
export const SHIFT_SPHERE_SEA_OFFSET = -1.0;

export function toShiftSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * SHIFT_GLOBE_SCALE;
  const sz = z * SHIFT_GLOBE_SCALE;
  const rTarget = globeRadius + (y + SHIFT_SPHERE_SEA_OFFSET) * SHIFT_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * Shift Station twin concrete platforms separated by central rail corridor (|x| < 5.0).
 */
export function sampleShiftHeight(x: number, z: number): number {
  const leftPlat = boxSd(x, z, -9.2, 0, 4.2, 17.5);
  const rightPlat = boxSd(x, z, 9.2, 0, 4.2, 17.5);
  const sd = Math.min(leftPlat, rightPlat);
  if (sd <= 0) return 2.45;
  if (sd < 1.2) return 2.45 - smoothstep(0, 1.2, sd) * 3.8;
  return -1.4;
}

export function sampleShiftWalkSurfaceHeight(x: number, z: number): number {
  const baseH = sampleShiftHeight(x, z);
  // Overpass pedestrian bridge deck crossing x in [-6.8, +6.8], |z| < 2.2
  if (Math.abs(z) < 2.2 && Math.abs(x) < 6.8) {
    const t = Math.abs(x) / 6.8;
    const archH = 6.2 + (1 - t * t) * 2.4;
    return Math.max(baseH, archH);
  }
  return Math.max(SHIFT_SEA_LEVEL_Y, baseH);
}

export const SHIFT_CAMERA_PRESETS: StationCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle: 'Shift Station · Passerelle verte, phare blanc & maison de Kokoro',
    position: [1.5, 6.8, 40.0],
    target: [1.5, 4.4, -2.0],
    isStreetView: false,
  },
  {
    id: 'footbridge-top',
    label: 'Passerelle · Voie Ferrée',
    subtitle: 'Vue humaine depuis l’arche verte au-dessus des rails du Train des Mers',
    position: [0.0, 10.3, 0.2],
    target: [8.5, 5.2, -4.5],
    isStreetView: true,
  },
  {
    id: 'platform-cottage',
    label: 'Quai & Phare de Kokoro',
    subtitle: 'Promenade humaine devant la maison bleue et le phare blanc',
    position: [8.4, 4.2, 12.2],
    target: [9.2, 4.4, -4.0],
    isStreetView: true,
  },
];

// ============================================================================
// 2. STATION TOWN ISLES (PUCCI, SAN FALDO, ST. POPLAR)
// ============================================================================

export const STATION_ISLAND_WORLD_SIZE = 150;
export const STATION_ISLAND_GLOBE_SCALE = 0.0014;
export const STATION_ISLAND_ANGULAR_MASK_RADIUS = 0.014;
export const STATION_ISLAND_SEA_LEVEL_Y = 1.2;
export const STATION_ISLAND_SPHERE_SEA_OFFSET = -1.2;

export const PUCCI_GLOBE_CENTER = { u: 0.790, v: 0.494 } as const;
export const SAN_FALDO_GLOBE_CENTER = { u: 0.782, v: 0.532 } as const;
export const ST_POPLAR_GLOBE_CENTER = { u: 0.808, v: 0.536 } as const;

export function toStationIslandSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * STATION_ISLAND_GLOBE_SCALE;
  const sz = z * STATION_ISLAND_GLOBE_SCALE;
  const rTarget =
    globeRadius + (y + STATION_ISLAND_SPHERE_SEA_OFFSET) * STATION_ISLAND_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

export interface StationTownHouseSpec {
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
  hasAwning?: boolean;
  awningColor?: number;
}

// --- PUCCI ISLAND ("City of Gourmets", Pier at South z = +22) ----------------

export function pucciRoadSignedDist(x: number, z: number): number {
  const dA = distToSegment2D(x, z, 0, 22, 0, -2);
  const dB = distToSegment2D(x, z, -18, 8, 18, 8);
  const dC = distToSegment2D(x, z, 0, -2, -12, -18);
  return Math.min(dA, dB, dC) - 2.4;
}

export function samplePucciHeight(x: number, z: number): number {
  // Harbour rail quay at z in [18, 25]
  const quaySd = boxSd(x, z, 0, 21.5, 19.0, 3.2);
  const mainIsleSd = ellipseSd(x, z, 0, -2, 34, 24);
  const northRidgeSd = ellipseSd(x, z, -6, -16, 20, 14);
  const sd = Math.min(mainIsleSd, northRidgeSd, quaySd);

  if (sd > 6) return -3.6;
  const baseCoast = 1.2 + smoothstep(5.0, -2.5, sd) * 2.4;
  const terraceBoost =
    smoothstep(14, -18, z) * 7.8 +
    smoothstep(4, -6, northRidgeSd) * 4.4;
  const noise = valueNoise2D(x * 0.08 + 2.1, z * 0.08 + 1.4) * 1.4;

  let h = baseCoast + terraceBoost + noise;
  // Flatten harbor quay cleanly at y = 2.6
  if (quaySd < 1.2) {
    const qT = 1 - smoothstep(-0.6, 1.2, quaySd);
    h = h * (1 - qT) + 2.6 * qT;
  }
  // Smooth gourmet promenade road grade
  const roadD = pucciRoadSignedDist(x, z);
  if (roadD < 1.0 && sd < 0) {
    const roadGrade = clamp(2.6 + smoothstep(20, -18, z) * 8.2, 2.6, 10.8);
    const rt = 1 - smoothstep(-0.4, 1.0, roadD);
    h = h * (1 - rt * 0.78) + roadGrade * (rt * 0.78);
  }
  return h;
}

export function samplePucciWalkSurfaceHeight(x: number, z: number): number {
  return Math.max(STATION_ISLAND_SEA_LEVEL_Y, samplePucciHeight(x, z));
}

export function buildPucciHouses(): StationTownHouseSpec[] {
  const spots: Array<[number, number, number, number, number, number, number, number]> = [
    [-12, 13, 5.4, 4.4, 4.2, 0.1, 0xfaf0dc, 0xc94a38],
    [-6, 13, 4.8, 4.0, 4.0, 0.0, 0xf6e3be, 0xd86b3a],
    [6, 13, 5.0, 4.2, 4.4, 0.0, 0xf8ebd2, 0xb83f32],
    [12, 13, 5.2, 4.2, 3.8, -0.1, 0xf3dfc0, 0xd26a3c],
    [-14, 2, 5.0, 4.2, 4.8, 0.3, 0xfaf1df, 0xc2493b],
    [-7, 2, 4.6, 4.0, 5.2, 0.15, 0xf5e2c2, 0x9b392c],
    [7, 2, 4.8, 4.2, 5.0, -0.15, 0xfbf2de, 0xc95638],
    [14, 2, 5.4, 4.4, 4.5, -0.3, 0xf1dab8, 0xa83e30],
    [-11, -10, 5.2, 4.4, 5.4, 0.25, 0xf7ead0, 0xb84838],
    [8, -10, 5.0, 4.2, 5.1, -0.2, 0xf9edd4, 0xce5b3b],
    [-2, -16, 6.4, 5.0, 6.2, 0.0, 0xfff4df, 0x9e3229],
  ];
  return spots.map(([x, z, w, d, h, yaw, wc, rc], i) => ({
    id: `pucci-h-${i}`,
    x,
    z,
    y: samplePucciHeight(x, z),
    width: w,
    depth: d,
    height: h,
    yaw,
    wallColor: wc,
    roofColor: rc,
    hasAwning: i < 8,
    awningColor: i % 2 === 0 ? 0xd93838 : 0x2c8c58,
  }));
}

export const PUCCI_CAMERA_PRESETS: StationCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle: 'Île de Pucci · Cité des Gourmets & Gare du Train des Mers',
    position: [22, 34, 52],
    target: [0, 4, 2],
    isStreetView: false,
  },
  {
    id: 'station-quay',
    label: 'Gare · Train des Mers',
    subtitle: 'Vue humaine sur le quai devant le portique PUCCI STATION',
    position: [-9.8, 4.6, 19.0],
    target: [2.0, 5.2, 23.8],
    isStreetView: true,
  },
  {
    id: 'gourmet-plaza',
    label: 'Terrasses des Gourmets',
    subtitle: 'Promenade humaine entre les trattorias à auvents rayés',
    position: [0.0, 7.6, 8.2],
    target: [0.0, 5.4, 22.0],
    isStreetView: true,
  },
];

// --- SAN FALDO ("Carnival City", Pier at North z = -22) ----------------------

export function sanFaldoRoadSignedDist(x: number, z: number): number {
  const dA = distToSegment2D(x, z, 0, -22, 0, 14);
  const dB = distToSegment2D(x, z, -18, 2, 18, 2);
  const dPlaza = Math.hypot(x, z - 2) - 7.5;
  return Math.min(dA - 2.3, dB - 2.1, dPlaza);
}

export function sampleSanFaldoHeight(x: number, z: number): number {
  const quaySd = boxSd(x, z, 0, -21.5, 19.5, 3.2);
  const lobeA = ellipseSd(x, z, 0, 2, 33, 25);
  const lobeB = ellipseSd(x, z, 12, 14, 18, 13);
  const sd = Math.min(lobeA, lobeB, quaySd);

  if (sd > 6) return -3.6;
  const coast = 1.2 + smoothstep(5.0, -2.5, sd) * 2.5;
  const innerHill = smoothstep(-2, -20, ellipseSd(x, z, 0, 6, 22, 17)) * 4.8;
  const noise = valueNoise2D(x * 0.09 + 7.2, z * 0.09 + 3.1) * 1.1;

  let h = coast + innerHill + noise;
  if (quaySd < 1.2) {
    const qT = 1 - smoothstep(-0.6, 1.2, quaySd);
    h = h * (1 - qT) + 2.6 * qT;
  }
  const roadD = sanFaldoRoadSignedDist(x, z);
  if (roadD < 1.0 && sd < 0) {
    const rt = 1 - smoothstep(-0.4, 1.0, roadD);
    const roadY = 2.6 + smoothstep(-20, 8, z) * 3.2;
    h = h * (1 - rt * 0.85) + roadY * (rt * 0.85);
  }
  return h;
}

export function sampleSanFaldoWalkSurfaceHeight(x: number, z: number): number {
  return Math.max(STATION_ISLAND_SEA_LEVEL_Y, sampleSanFaldoHeight(x, z));
}

export function buildSanFaldoHouses(): StationTownHouseSpec[] {
  const spots: Array<[number, number, number, number, number, number, number, number]> = [
    [-12, -13, 4.8, 4.2, 4.5, 0.0, 0xffe4ec, 0xe05276],
    [-7, -12, 4.4, 3.8, 5.2, 0.1, 0xfff3c8, 0x3b82d6],
    [7, -12, 4.6, 4.0, 4.8, -0.1, 0xdff7ec, 0xe87d32],
    [12, -13, 4.8, 4.2, 4.4, 0.0, 0xffe9d4, 0x8b5cf6],
    [-13, -3, 5.0, 4.4, 5.4, 0.2, 0xfff0d6, 0xd9467a],
    [13, -3, 5.0, 4.4, 5.6, -0.2, 0xe5f3ff, 0xf59e0b],
    [-11, 11, 5.4, 4.6, 5.8, -0.25, 0xfee5df, 0x2563eb],
    [11, 11, 5.4, 4.6, 5.5, 0.25, 0xfef3c7, 0xdc2626],
    [0, 17, 6.0, 4.8, 8.6, 0.0, 0xfff7e6, 0xd4384e], // Bell/clock tower
  ];
  return spots.map(([x, z, w, d, h, yaw, wc, rc], i) => ({
    id: `sanfaldo-h-${i}`,
    x,
    z,
    y: sampleSanFaldoHeight(x, z),
    width: w,
    depth: d,
    height: h,
    yaw,
    wallColor: wc,
    roofColor: rc,
    hasAwning: i < 8,
    awningColor: i % 2 === 0 ? 0xf59e0b : 0xec4899,
  }));
}

export const SAN_FALDO_CAMERA_PRESETS: StationCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle: 'San Faldo · Cité du Carnaval, chapiteaux & gare maritime',
    position: [-22, 34, -52],
    target: [0, 4, 0],
    isStreetView: false,
  },
  {
    id: 'station-quay',
    label: 'Gare · Train des Mers',
    subtitle: 'Vue humaine le long du quai sous l’arche SAN FALDO',
    position: [9.8, 4.6, -19.0],
    target: [-2.0, 5.2, -23.8],
    isStreetView: true,
  },
  {
    id: 'carnival-plaza',
    label: 'Place du Carnaval',
    subtitle: 'Vue humaine parmi les façades pastel, fanions et beffroi',
    position: [0.0, 6.8, -9.5],
    target: [0.0, 7.2, 16.0],
    isStreetView: true,
  },
];

// --- ST. POPLAR ("Queen of Spring Isles", Pier at North z = -22) --------------

export function stPoplarRoadSignedDist(x: number, z: number): number {
  const dA = distToSegment2D(x, z, 0, -22, 0, 4);
  const dB = distToSegment2D(x, z, 0, 4, 8.6, 9.2);
  const dC = distToSegment2D(x, z, -14, -4, 14, -4);
  return Math.min(dA, dB, dC) - 2.1;
}

export function sampleStPoplarHeight(x: number, z: number): number {
  const quaySd = boxSd(x, z, 0, -21.5, 19.0, 3.2);
  const meadowSd = ellipseSd(x, z, 0, 2, 34, 24);
  const eastKnollSd = ellipseSd(x, z, 12, 12, 16, 13);
  const sd = Math.min(meadowSd, eastKnollSd, quaySd);

  if (sd > 6) return -3.6;
  const coast = 1.2 + smoothstep(5.0, -2.5, sd) * 2.4;
  const hill =
    smoothstep(8, -10, eastKnollSd) * 7.4 +
    smoothstep(8, -12, meadowSd) * 3.0;
  const noise = valueNoise2D(x * 0.08 + 11.4, z * 0.08 + 6.2) * 1.1;

  let h = coast + hill + noise;
  if (quaySd < 1.2) {
    const qT = 1 - smoothstep(-0.6, 1.2, quaySd);
    h = h * (1 - qT) + 2.6 * qT;
  }
  const roadD = stPoplarRoadSignedDist(x, z);
  if (roadD < 1.0 && sd < 0) {
    const rt = 1 - smoothstep(-0.4, 1.0, roadD);
    const grade = 2.6 + smoothstep(-20, 14, z) * 5.8;
    h = h * (1 - rt * 0.72) + grade * (rt * 0.72);
  }
  return h;
}

export function sampleStPoplarWalkSurfaceHeight(x: number, z: number): number {
  return Math.max(STATION_ISLAND_SEA_LEVEL_Y, sampleStPoplarHeight(x, z));
}

export function buildStPoplarHouses(): StationTownHouseSpec[] {
  const spots: Array<[number, number, number, number, number, number, number, number]> = [
    [-11, -12, 4.4, 3.8, 3.6, 0.1, 0xfef9ec, 0x52a868],
    [-6, -11, 4.0, 3.6, 3.4, 0.05, 0xfff5e4, 0xd87a98],
    [7, -12, 4.2, 3.8, 3.6, -0.1, 0xf6fbf0, 0x4b9470],
    [-12, -2, 4.6, 4.0, 4.0, 0.25, 0xfdf7ea, 0xc86e4b],
    [7, -2, 4.4, 3.8, 3.9, -0.2, 0xfaf2e4, 0xe06d88],
    [-8, 9, 4.8, 4.0, 4.1, 0.35, 0xfff9ee, 0x4b9468],
    [12, 13, 5.2, 5.2, 7.8, -0.35, 0xfaf2e0, 0xb8523c], // Hilltop spring windmill base
  ];
  return spots.map(([x, z, w, d, h, yaw, wc, rc], i) => ({
    id: `stpoplar-h-${i}`,
    x,
    z,
    y: sampleStPoplarHeight(x, z),
    width: w,
    depth: d,
    height: h,
    yaw,
    wallColor: wc,
    roofColor: rc,
  }));
}

export const ST_POPLAR_CAMERA_PRESETS: StationCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle: 'St. Poplar · Reine des Îles Printanières & Gare fleurie',
    position: [-22, 34, -52],
    target: [0, 4, 2],
    isStreetView: false,
  },
  {
    id: 'station-quay',
    label: 'Gare · Train des Mers',
    subtitle: 'Vue humaine devant le portique ST. POPLAR au bord de la mer',
    position: [-9.8, 4.6, -19.0],
    target: [2.0, 5.2, -23.8],
    isStreetView: true,
  },
  {
    id: 'spring-meadow',
    label: 'Sentier des Cerisiers',
    subtitle: 'Promenade humaine à travers les tulipes vers le moulin à vent',
    position: [-1.5, 7.85, -3.5],
    target: [12.0, 10.5, 13.0],
    isStreetView: true,
  },
];
