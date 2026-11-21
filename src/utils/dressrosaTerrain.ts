import { valueNoise2D } from './globeMath';

export const DRESSROSA_WORLD_SIZE = 340;
export const DRESSROSA_GLOBE_SCALE = 0.002;
export const DRESSROSA_GLOBE_CENTER = { u: 0.088, v: 0.554 } as const;
export const DRESSROSA_ANGULAR_MASK_RADIUS = 0.038;
export const DRESSROSA_SEA_LEVEL_Y = 0.0;

export const DRESSROSA_ISLAND_CENTER = { x: 0.0, z: 12.0 } as const;
export const GREEN_BIT_ISLAND_CENTER = { x: 36.0, z: -114.0 } as const;

export const DRESSROSA_BRIDGE_START = { x: 24.0, z: -43.0 } as const;
export const DRESSROSA_BRIDGE_END = { x: 34.0, z: -92.0 } as const;
export const DRESSROSA_BRIDGE_DECK_Y = 10.6;
export const DRESSROSA_BRIDGE_HALF_WIDTH = 2.0;

export const CORRIDA_CENTER = { x: 36.0, z: 14.0 } as const;
export const CORRIDA_OUTER_RADIUS = 20.5;
export const CORRIDA_MOAT_INNER_R = 6.2;
export const CORRIDA_MOAT_OUTER_R = 12.6;
export const CORRIDA_COURTYARD_Y = 7.4;
export const CORRIDA_STAND_VIEW_Y = 11.4;

export const ROYAL_PLATEAU_CENTER = { x: -4.0, z: -18.0 } as const;
export const ROYAL_PLATEAU_Y = 27.0;

export const FLOWER_HILL_CENTER = { x: -42.0, z: -18.0 } as const;

export type DressrosaZone =
  | 'sea'
  | 'harbor'
  | 'acacia'
  | 'colosseum'
  | 'palace'
  | 'flower-hill'
  | 'cliff'
  | 'green-bit';

export interface DressrosaHouseSpec {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  yaw: number;
  style: 'spanish-white' | 'spanish-ochre' | 'blue-checkered' | 'candy-tower' | 'cafe';
}

export interface DressrosaWaterfallSpec {
  id: string;
  x: number;
  z: number;
  yaw: number;
  width: number;
  topY: number;
}

export interface DressrosaGiantTreeSpec {
  id: string;
  x: number;
  z: number;
  trunkRadius: number;
  height: number;
  canopyRadius: number;
  yaw: number;
}

export interface DressrosaTontattaHutSpec {
  id: string;
  x: number;
  z: number;
  yaw: number;
  scale: number;
  roofTone: 'leaf' | 'acorn' | 'petal';
}

export interface DressrosaCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

export const DRESSROSA_LANDMARKS = {
  overviewTarget: { x: 6.0, z: -24.0 },
  acaciaPlaza: { x: -12.8, z: 46.5 },
  acaciaHarbor: { x: -10.0, z: 62.0 },
  corridaColosseum: { x: 36.0, z: 14.0 },
  corridaViewerTerrace: { x: 36.0, z: 27.6 },
  royalPalace: { x: -4.0, z: -18.0 },
  flowerHill: { x: -42.0, z: -18.0 },
  flowerHillOverlook: { x: -49.5, z: -2.5 },
  undergroundGallery: { x: -14.5, z: -5.0 },
  undergroundGalleryOverlook: { x: -28.5, z: 5.5 },
  ironBridgeStart: { x: 24.0, z: -43.0 },
  ironBridgeMid: { x: 27.6, z: -60.5 },
  ironBridgeEnd: { x: 34.0, z: -92.0 },
  greenBitCenter: { x: 36.0, z: -114.0 },
  tontattaClearing: { x: 28.5, z: -109.5 },
  sunnySpawnHarbor: { x: -10.0, z: 102.0 },
  sunnySpawnGreenBit: { x: 86.0, z: -114.0 },
} as const;

export const DRESSROSA_SUB_LOCATIONS: Record<string, [number, number]> = {
  dressrosa: [0.0, 12.0],
  acacia: [-13.0, 42.0],
  'corrida-colosseum': [36.0, 14.0],
  'royal-palace-dressrosa': [-4.0, -18.0],
  'flower-hill': [-42.0, -18.0],
  'green-bit': [36.0, -114.0],
};

export const DRESSROSA_WATERFALLS: readonly DressrosaWaterfallSpec[] = [
  { id: 'wf-west', x: -64.0, z: 22.0, yaw: -1.35, width: 10.5, topY: 9.2 },
  { id: 'wf-harbor-west', x: -29.0, z: 66.0, yaw: -0.25, width: 11.0, topY: 7.4 },
  { id: 'wf-harbor-east', x: 10.0, z: 64.0, yaw: 0.25, width: 10.5, topY: 7.4 },
  { id: 'wf-east', x: 64.0, z: 28.0, yaw: 1.25, width: 9.5, topY: 9.2 },
];

export const DRESSROSA_GIANT_TREES: readonly DressrosaGiantTreeSpec[] = [
  { id: 'gb-tree-1', x: 24.0, z: -112.0, trunkRadius: 2.3, height: 22.0, canopyRadius: 10.5, yaw: 0.4 },
  { id: 'gb-tree-2', x: 47.0, z: -116.0, trunkRadius: 2.6, height: 25.0, canopyRadius: 11.5, yaw: 1.5 },
  { id: 'gb-tree-3', x: 37.0, z: -130.0, trunkRadius: 2.8, height: 26.5, canopyRadius: 12.5, yaw: 2.6 },
  { id: 'gb-tree-4', x: 15.0, z: -124.0, trunkRadius: 2.0, height: 19.5, canopyRadius: 9.0, yaw: -0.7 },
  { id: 'gb-tree-5', x: 56.0, z: -102.0, trunkRadius: 2.1, height: 20.0, canopyRadius: 9.2, yaw: 0.9 },
  { id: 'gb-tree-6', x: 18.0, z: -99.0, trunkRadius: 1.9, height: 18.5, canopyRadius: 8.6, yaw: 2.1 },
  { id: 'gb-tree-7', x: 54.0, z: -129.0, trunkRadius: 2.2, height: 21.5, canopyRadius: 9.8, yaw: -1.4 },
  { id: 'gb-tree-8', x: 26.0, z: -136.0, trunkRadius: 2.1, height: 20.5, canopyRadius: 9.4, yaw: 1.1 },
  { id: 'gb-tree-9', x: 63.0, z: -116.0, trunkRadius: 1.8, height: 17.5, canopyRadius: 8.2, yaw: 2.9 },
  { id: 'gb-tree-10', x: 11.0, z: -110.0, trunkRadius: 1.8, height: 17.0, canopyRadius: 8.0, yaw: -2.2 },
];

export const DRESSROSA_TONTATTA_HUTS: readonly DressrosaTontattaHutSpec[] = [
  { id: 'hut-1', x: 31.0, z: -115.5, yaw: 0.4, scale: 1.0, roofTone: 'leaf' },
  { id: 'hut-2', x: 35.5, z: -118.0, yaw: -0.3, scale: 1.15, roofTone: 'acorn' },
  { id: 'hut-3', x: 40.5, z: -115.0, yaw: -0.9, scale: 0.95, roofTone: 'petal' },
  { id: 'hut-4', x: 33.0, z: -121.0, yaw: 0.2, scale: 1.05, roofTone: 'leaf' },
  { id: 'hut-5', x: 38.5, z: -121.5, yaw: -0.5, scale: 1.0, roofTone: 'acorn' },
  { id: 'hut-6', x: 28.5, z: -118.5, yaw: 0.85, scale: 0.9, roofTone: 'petal' },
  { id: 'hut-7', x: 42.0, z: -119.0, yaw: -1.2, scale: 1.0, roofTone: 'leaf' },
  { id: 'hut-8', x: 35.8, z: -113.5, yaw: 0.05, scale: 1.1, roofTone: 'petal' },
];

export const DRESSROSA_HOUSES: readonly DressrosaHouseSpec[] = [
  // Acacia Harbor West & East quayside row
  { id: 'h-w1', x: -34.0, z: 54.0, width: 5.2, depth: 4.8, height: 5.8, yaw: 0.12, style: 'spanish-white' },
  { id: 'h-w2', x: -27.5, z: 50.0, width: 4.8, depth: 4.6, height: 5.2, yaw: -0.08, style: 'spanish-ochre' },
  { id: 'h-w3', x: -39.0, z: 46.0, width: 5.6, depth: 5.0, height: 6.2, yaw: 0.35, style: 'cafe' },
  { id: 'h-w4', x: -33.0, z: 39.0, width: 5.0, depth: 4.8, height: 5.6, yaw: 0.18, style: 'spanish-white' },
  { id: 'h-w5', x: -45.0, z: 35.0, width: 5.8, depth: 5.2, height: 6.0, yaw: 0.48, style: 'spanish-ochre' },
  { id: 'h-w6', x: -42.0, z: 24.0, width: 5.2, depth: 4.8, height: 5.5, yaw: 0.25, style: 'spanish-white' },
  { id: 'h-w7', x: -51.0, z: 27.0, width: 5.4, depth: 5.0, height: 5.8, yaw: 0.62, style: 'cafe' },
  { id: 'h-w8', x: -30.0, z: 28.0, width: 4.9, depth: 4.7, height: 5.4, yaw: -0.15, style: 'spanish-ochre' },
  // Acacia Grand Plaza signature buildings (dressrosa_be8c96e4.webp!)
  { id: 'h-blue-hall', x: -22.5, z: 31.0, width: 7.4, depth: 6.4, height: 7.4, yaw: 0.28, style: 'blue-checkered' },
  { id: 'h-candy-tower-1', x: -16.5, z: 28.5, width: 3.4, depth: 3.4, height: 11.2, yaw: 0.0, style: 'candy-tower' },
  { id: 'h-candy-tower-2', x: -3.5, z: 29.0, width: 3.2, depth: 3.2, height: 10.2, yaw: 0.2, style: 'candy-tower' },
  { id: 'h-p1', x: -2.0, z: 34.0, width: 6.4, depth: 5.2, height: 6.2, yaw: -0.22, style: 'spanish-white' },
  { id: 'h-p2', x: 6.0, z: 41.0, width: 5.6, depth: 5.0, height: 5.8, yaw: -0.35, style: 'cafe' },
  { id: 'h-p3', x: 1.5, z: 50.0, width: 5.2, depth: 4.8, height: 5.4, yaw: 0.14, style: 'spanish-ochre' },
  { id: 'h-p4', x: 12.0, z: 51.0, width: 5.8, depth: 5.0, height: 6.0, yaw: -0.18, style: 'spanish-white' },
  { id: 'h-p5', x: 18.0, z: 43.0, width: 5.4, depth: 4.8, height: 5.6, yaw: -0.42, style: 'spanish-ochre' },
  // Colosseum Southern & Eastern Quarters
  { id: 'h-e1', x: 24.0, z: 49.0, width: 5.2, depth: 4.8, height: 5.4, yaw: 0.25, style: 'spanish-white' },
  { id: 'h-e2', x: 34.0, z: 45.0, width: 5.8, depth: 5.0, height: 5.8, yaw: -0.16, style: 'cafe' },
  { id: 'h-e3', x: 45.0, z: 38.0, width: 5.4, depth: 4.9, height: 5.6, yaw: -0.52, style: 'spanish-ochre' },
  { id: 'h-e4', x: 54.0, z: 24.0, width: 5.2, depth: 4.8, height: 5.5, yaw: -0.95, style: 'spanish-white' },
  { id: 'h-e5', x: 58.0, z: 8.0, width: 5.4, depth: 5.0, height: 5.8, yaw: -1.25, style: 'spanish-ochre' },
  { id: 'h-e6', x: 54.0, z: -10.0, width: 5.6, depth: 5.0, height: 6.0, yaw: -1.45, style: 'blue-checkered' },
  // Northern Foothills near Bridge approach
  { id: 'h-n1', x: 36.0, z: -26.0, width: 5.4, depth: 4.8, height: 5.6, yaw: -0.45, style: 'spanish-white' },
  { id: 'h-n2', x: 25.0, z: -30.0, width: 5.0, depth: 4.6, height: 5.4, yaw: 0.15, style: 'spanish-ochre' },
  { id: 'h-n3', x: 44.0, z: -18.0, width: 5.2, depth: 4.8, height: 5.6, yaw: -0.82, style: 'cafe' },
  { id: 'h-n4', x: -24.0, z: 12.0, width: 5.4, depth: 5.0, height: 5.8, yaw: 0.4, style: 'spanish-white' },
  { id: 'h-n5', x: -32.0, z: 6.0, width: 5.0, depth: 4.6, height: 5.2, yaw: 0.22, style: 'spanish-ochre' },
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Signed distance from dry Dressrosa or Green Bit landmass (< 0 on dry land, > 0 in ocean/harbor/moat).
 */
export function dressrosaArchipelagoSignedDist(x: number, z: number): {
  sd: number;
  island: 'dressrosa' | 'green-bit' | 'harbor' | 'sea';
} {
  // 1. Main Dressrosa island silhouette (centered at (0, 12), radius ~72m)
  const dx = x - DRESSROSA_ISLAND_CENTER.x;
  const dz = z - DRESSROSA_ISLAND_CENTER.z;
  const angD = Math.atan2(dz, dx);
  const rippleD =
    4.0 * Math.sin(angD * 4.0 + 0.5) +
    2.6 * Math.cos(angD * 7.0 - 0.9) +
    (valueNoise2D(x * 0.05 + 1.3, z * 0.05 - 2.1) - 0.5) * 6.5;

  const rxD = 71.0 + rippleD;
  const rzD = 66.0 + rippleD * 0.85;
  let dressrosaSd = (Math.hypot(dx / rxD, dz / rzD) - 1.0) * 66.0;

  // Carve Southern Acacia Harbor cove & narrow sea channel
  const harborMouthDx = (x + 10.0) / 17.0;
  const harborMouthDz = (z - 70.0) / 16.5;
  const harborMouthGap = (1.0 - Math.hypot(harborMouthDx, harborMouthDz)) * 16.0;

  // Connecting narrow harbor approach channel cutting south through outer cliffs
  const channelGap =
    z > 56.0 && z < 96.0 ? 11.2 - Math.abs(x + 10.0) : -20.0;
  const totalHarborGap = Math.max(harborMouthGap, channelGap);

  if (dressrosaSd < 0 && totalHarborGap > 0) {
    return { sd: totalHarborGap, island: 'harbor' };
  }
  dressrosaSd = Math.max(dressrosaSd, totalHarborGap);

  // 2. Green Bit jungle island (centered at (36, -114), radius ~33m x 27m)
  const gx = x - GREEN_BIT_ISLAND_CENTER.x;
  const gz = z - GREEN_BIT_ISLAND_CENTER.z;
  const angG = Math.atan2(gz, gx);
  const rippleG =
    2.8 * Math.sin(angG * 3.0 + 1.1) +
    1.8 * Math.cos(angG * 6.0 - 0.4) +
    (valueNoise2D(x * 0.07 + 5.1, z * 0.07 + 3.4) - 0.5) * 4.5;
  const rxG = 33.5 + rippleG;
  const rzG = 27.5 + rippleG * 0.85;
  const greenBitSd = (Math.hypot(gx / rxG, gz / rzG) - 1.0) * 29.0;

  if (dressrosaSd <= 0 && dressrosaSd <= greenBitSd) {
    return { sd: dressrosaSd, island: 'dressrosa' };
  }
  if (greenBitSd <= 0) {
    return { sd: greenBitSd, island: 'green-bit' };
  }
  return { sd: Math.min(dressrosaSd, greenBitSd), island: 'sea' };
}

/**
 * Samples surface zone for procedural texturing & foliage placement.
 */
export function sampleDressrosaZone(x: number, z: number): DressrosaZone {
  const { sd, island } = dressrosaArchipelagoSignedDist(x, z);
  if (island === 'sea') return 'sea';
  if (island === 'harbor') return 'harbor';
  if (sd > 0) return 'sea';
  if (island === 'green-bit') return 'green-bit';

  if (Math.hypot(x - ROYAL_PLATEAU_CENTER.x, z - ROYAL_PLATEAU_CENTER.z) < 22.0) {
    return 'palace';
  }
  if (Math.hypot(x - CORRIDA_CENTER.x, z - CORRIDA_CENTER.z) < CORRIDA_OUTER_RADIUS + 2.5) {
    return 'colosseum';
  }
  if (Math.hypot(x - FLOWER_HILL_CENTER.x, z - FLOWER_HILL_CENTER.z) < 23.0) {
    return 'flower-hill';
  }
  const radialFromCenter = Math.hypot(
    (x - DRESSROSA_ISLAND_CENTER.x) / 71.0,
    (z - DRESSROSA_ISLAND_CENTER.z) / 66.0
  );
  if (radialFromCenter > 0.87) {
    return 'cliff';
  }
  return 'acacia';
}

/**
 * Returns closest point parameter t along the Iron Bridge and lateral distance.
 */
export function getIronBridgeCoords(x: number, z: number): {
  t: number;
  perpDist: number;
} {
  const dx = DRESSROSA_BRIDGE_END.x - DRESSROSA_BRIDGE_START.x;
  const dz = DRESSROSA_BRIDGE_END.z - DRESSROSA_BRIDGE_START.z;
  const lenSq = dx * dx + dz * dz;
  const t = ((x - DRESSROSA_BRIDGE_START.x) * dx + (z - DRESSROSA_BRIDGE_START.z) * dz) / lenSq;
  const tc = clamp(t, 0, 1);
  const px = DRESSROSA_BRIDGE_START.x + dx * tc;
  const pz = DRESSROSA_BRIDGE_START.z + dz * tc;
  return {
    t,
    perpDist: Math.hypot(x - px, z - pz),
  };
}

/**
 * Samples local terrain height in Dressrosa meters (sea level = 0, negative = seabed).
 */
export function sampleDressrosaHeight(x: number, z: number): number {
  const { sd, island } = dressrosaArchipelagoSignedDist(x, z);

  if (island === 'sea' || island === 'harbor' || sd >= 0) {
    const depth = smoothstep(0.0, 9.0, sd);
    return -0.35 - depth * 2.5;
  }

  const micro = (valueNoise2D(x * 0.09 + 3.1, z * 0.09 - 2.7) - 0.5) * 1.1;

  if (island === 'green-bit') {
    const cliffT = smoothstep(0.0, 5.5, -sd);
    let h = 3.2 + cliffT * 4.4 + micro * 0.9;

    // Gentle central jungle clearing for Tontatta village at (34, -112)
    const dClearing = Math.hypot(x - 34.5, z + 114.5);
    const clearFlatten = 1 - smoothstep(7.0, 15.0, dClearing);
    h = h * (1 - clearFlatten) + 7.2 * clearFlatten;

    // Southern Iron Bridge abutment terrace
    const dBridgeLand = Math.hypot(
      x - DRESSROSA_BRIDGE_END.x,
      z - DRESSROSA_BRIDGE_END.z
    );
    const bridgeLandT = 1 - smoothstep(3.5, 9.5, dBridgeLand);
    h = h * (1 - bridgeLandT) + 9.2 * bridgeLandT;
    return h;
  }

  // Dressrosa: steep outer coastal cliff rim stepping inward into sunlit Acacia city basin
  const edgeCliffT = smoothstep(0.0, 4.5, -sd);
  const innerRimRamp = 1 - smoothstep(4.5, 13.5, -sd);
  const baseCliffRim = 9.8 * innerRimRamp;
  const cityBowl = 6.2 + micro * 0.55;
  let h = edgeCliffT * Math.max(cityBowl, baseCliffRim);

  // Acacia Harbor gentle coastal step down toward quayside piers
  const dAcaciaQuay = Math.hypot((x + 12.0) / 26.0, (z - 46.0) / 14.0);
  const quayFlatten = 1 - smoothstep(0.65, 1.15, dAcaciaQuay);
  h = h * (1 - quayFlatten) + 5.6 * quayFlatten;

  // Acacia Grand Plaza level stone pavement
  const dPlaza = Math.hypot(x - DRESSROSA_LANDMARKS.acaciaPlaza.x, z - DRESSROSA_LANDMARKS.acaciaPlaza.z);
  const plazaFlatten = 1 - smoothstep(6.0, 14.0, dPlaza);
  h = h * (1 - plazaFlatten) + 6.4 * plazaFlatten;

  // Corrida Colosseum foundation & flooded interior moat (dresrosa3_666607bc.JPG)
  const dCol = Math.hypot(x - CORRIDA_CENTER.x, z - CORRIDA_CENTER.z);
  if (dCol < CORRIDA_OUTER_RADIUS + 6.0) {
    const colFlatten = 1 - smoothstep(CORRIDA_OUTER_RADIUS - 1.0, CORRIDA_OUTER_RADIUS + 6.0, dCol);
    h = h * (1 - colFlatten) + CORRIDA_COURTYARD_Y * colFlatten;
  }

  // Flower Hill / Field of Sunflowers lush terraced plateau & panoramic ridge (west-northwest)
  const dFlower = Math.hypot((x - FLOWER_HILL_CENTER.x) / 22.0, (z - FLOWER_HILL_CENTER.z) / 19.0);
  if (dFlower < 1.38) {
    const flT = 1 - smoothstep(0.45, 1.32, dFlower);
    h = Math.max(h, 6.4 + flT * 7.6 + micro * 0.35);
  }
  const dFlowerRidge = Math.hypot(
    x - DRESSROSA_LANDMARKS.flowerHillOverlook.x,
    z - DRESSROSA_LANDMARKS.flowerHillOverlook.z
  );
  if (dFlowerRidge < 12.0) {
    const ridgeT = 1 - smoothstep(3.5, 11.5, dFlowerRidge);
    h = Math.max(h, 6.4 + ridgeT * 9.8);
  }

  // King's Plateau steep jagged limestone mesa crowned by Royal Palace
  // (Carve clean southwestern cutaway amphitheater for the Subterranean SMILE Factory galleries)
  const dUgCut = Math.hypot((x + 21.5) / 12.5, (z - 0.5) / 10.5);
  const ugCutMask = 1 - smoothstep(0.55, 1.15, dUgCut);

  const dRoyal = Math.hypot((x - ROYAL_PLATEAU_CENTER.x) / 18.5, (z - ROYAL_PLATEAU_CENTER.z) / 15.5);
  if (dRoyal < 1.55) {
    const cragMod = 0.92 + 0.08 * Math.sin(Math.atan2(z - ROYAL_PLATEAU_CENTER.z, x - ROYAL_PLATEAU_CENTER.x) * 7.0);
    const mesaT = (1 - smoothstep(0.68 * cragMod, 1.48 * cragMod, dRoyal)) * (1 - ugCutMask * 0.92);
    h = Math.max(h, 6.4 + mesaT * (ROYAL_PLATEAU_Y - 6.4));
  }

  // Underground SMILE Factory / Industrial Gallery flat cutaway apron beneath King's Plateau
  const dUgPlaza = Math.hypot((x + 22.5) / 11.0, (z - 1.5) / 9.5);
  const ugFlatten = 1 - smoothstep(0.5, 1.08, dUgPlaza);
  h = h * (1 - ugFlatten) + 6.6 * ugFlatten;

  // Dressrosa northern Iron Bridge abutment ramp
  const dBridgeStart = Math.hypot(
    x - DRESSROSA_BRIDGE_START.x,
    z - DRESSROSA_BRIDGE_START.z
  );
  const bridgeRampT = 1 - smoothstep(4.5, 11.5, dBridgeStart);
  h = h * (1 - bridgeRampT) + DRESSROSA_BRIDGE_DECK_Y * bridgeRampT;

  return h;
}

/**
 * Walkable elevation for street-level camera & Sunny exploration, including the Iron Bridge
 * roadway and Corrida Colosseum spectator stand terrace.
 */
export function sampleDressrosaWalkSurfaceHeight(x: number, z: number): number {
  const { t, perpDist } = getIronBridgeCoords(x, z);
  if (t >= -0.04 && t <= 1.04 && perpDist <= DRESSROSA_BRIDGE_HALF_WIDTH + 0.6) {
    return DRESSROSA_BRIDGE_DECK_Y;
  }

  const dCol = Math.hypot(x - CORRIDA_CENTER.x, z - CORRIDA_CENTER.z);
  if (dCol >= CORRIDA_MOAT_OUTER_R + 1.0 && dCol <= CORRIDA_OUTER_RADIUS - 1.2) {
    return CORRIDA_STAND_VIEW_Y;
  }

  const baseH = sampleDressrosaHeight(x, z);
  return Math.max(DRESSROSA_SEA_LEVEL_Y, baseH);
}

/**
 * Maps Dressrosa / Green Bit local meters onto the globe's curved tangent shell
 * around DRESSROSA_GLOBE_CENTER.
 */
export function toDressrosaSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius: number
): { x: number; y: number; z: number } {
  const sx = x * DRESSROSA_GLOBE_SCALE;
  const sz = z * DRESSROSA_GLOBE_SCALE;
  const sy = y * DRESSROSA_GLOBE_SCALE;
  const r2 = sx * sx + sz * sz;
  const sag = globeRadius - Math.sqrt(Math.max(0.01, globeRadius * globeRadius - r2));
  return {
    x: sx,
    y: sy - sag,
    z: sz,
  };
}

function camAtGround(
  lx: number,
  lz: number,
  eyeHeight = 1.75
): [number, number, number] {
  const groundY = sampleDressrosaWalkSurfaceHeight(lx, lz);
  return [
    Number(lx.toFixed(2)),
    Number((groundY + eyeHeight).toFixed(2)),
    Number(lz.toFixed(2)),
  ];
}

export const DRESSROSA_CAMERA_PRESETS: readonly DressrosaCameraPreset[] = [
  {
    id: 'overview',
    label: 'Vue Générale · Dressrosa & Green Bit',
    subtitle:
      'Vue aérienne complète : falaises & cascades, Acacia, Colisée Corrida, Palais Royal, Pont de Fer & Green Bit',
    position: [-32.0, 108.0, 132.0],
    target: [6.0, 10.0, -24.0],
    isStreetView: false,
  },
  {
    id: 'acacia-plaza',
    label: 'Acacia · Port & Architecture',
    subtitle:
      'Vue humaine (1,75 m) · Maisons méditerranéennes blanches, toits bleus à damier, tours rayées, arc triomphal, aqueduc & jouets',
    position: camAtGround(
      DRESSROSA_LANDMARKS.acaciaPlaza.x,
      DRESSROSA_LANDMARKS.acaciaPlaza.z,
      1.75
    ),
    target: [-15.2, 10.0, 21.0],
    isStreetView: true,
  },
  {
    id: 'corrida-colosseum',
    label: 'Arène du Colisée Corrida',
    subtitle:
      'Vue humaine (1,75 m) · Gradins dorés, tribune VIP, bassin à poissons combattants, passerelles & ring central de l’arène',
    position: camAtGround(
      DRESSROSA_LANDMARKS.corridaViewerTerrace.x,
      DRESSROSA_LANDMARKS.corridaViewerTerrace.z,
      1.75
    ),
    target: [36.0, 12.6, 2.0],
    isStreetView: true,
  },
  {
    id: 'royal-palace-sunflowers',
    label: 'Palais Royal & Tournesols',
    subtitle:
      'Vue humaine (1,75 m) · Colline aux tournesols dorés & coquelicots face au plateau escarpé du Palais Royal de Dressrosa',
    position: camAtGround(
      DRESSROSA_LANDMARKS.flowerHillOverlook.x,
      DRESSROSA_LANDMARKS.flowerHillOverlook.z,
      1.75
    ),
    target: [-10.0, 22.0, -17.5],
    isStreetView: true,
  },
  {
    id: 'underground-factory',
    label: 'Galeries Souterraines · Usine SMILE',
    subtitle:
      'Vue humaine (1,75 m) · Vaste complexe industriel souterrain creusé sous le Palais Royal, forges, engrenages & cuves SAD',
    position: camAtGround(
      DRESSROSA_LANDMARKS.undergroundGalleryOverlook.x,
      DRESSROSA_LANDMARKS.undergroundGalleryOverlook.z,
      1.75
    ),
    target: [-14.0, 10.2, -5.0],
    isStreetView: true,
  },
  {
    id: 'iron-bridge',
    label: 'Pont de Fer & Poissons Combattants',
    subtitle:
      'Vue panoramique · Viaduc métallique au-dessus des eaux agitées reliant Dressrosa à la jungle de Green Bit',
    position: [10.0, 19.5, -48.0],
    target: [31.0, 8.5, -78.0],
    isStreetView: false,
  },
  {
    id: 'green-bit-tontatta',
    label: 'Green Bit & Village Tontatta',
    subtitle:
      'Vue humaine (1,75 m) · Forêt colossale aux racines entrelacées, plantes géantes & village miniature Tontatta',
    position: camAtGround(
      DRESSROSA_LANDMARKS.tontattaClearing.x,
      DRESSROSA_LANDMARKS.tontattaClearing.z,
      1.75
    ),
    target: [36.5, 10.2, -118.5],
    isStreetView: true,
  },
];
