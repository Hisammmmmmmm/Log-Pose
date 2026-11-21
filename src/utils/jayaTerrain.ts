import { valueNoise2D } from './globeMath';

export const JAYA_WORLD_SIZE = 240;
export const JAYA_GLOBE_SCALE = 0.002;
export const JAYA_GLOBE_CENTER = { u: 0.668, v: 0.520 } as const;
/**
 * 0.028 rad (+ 0.015 blend) covers the 240m Jaya Island & offshore islets
 * while staying well clear of Foolshout Island (~0.089 rad) and Ukkari Island (~0.118 rad).
 */
export const JAYA_ANGULAR_MASK_RADIUS = 0.028;
/**
 * Aligns Jaya's coastal beaches, Mouth Bay harbor & Tropical Hotel lagoon with the globe ocean mesh.
 */
export const JAYA_SPHERE_SEA_OFFSET = -1.15;

export const JAYA_SHORE_Y = 1.45;
export const JAYA_TOWN_Y = 2.45;
export const JAYA_LAGOON_BED_Y = -0.35;

export interface JayaBuildingSpec {
  id: string;
  name: string;
  district:
    | 'mock-town-street'
    | 'mock-town-west'
    | 'mock-town-port'
    | 'tropical-hotel'
    | 'jungle-hideout'
    | 'cricket-house';
  kind:
    | 'saloon-pub'
    | 'shop-armory'
    | 'gambling-brothel'
    | 'watchtower-wood'
    | 'tower-round'
    | 'dock-warehouse'
    | 'tropical-hotel'
    | 'jungle-tent'
    | 'cricket-castle';
  x: number;
  z: number;
  y: number;
  radius: number;
  width: number;
  depth: number;
  wallHeight: number;
  roofHeight: number;
  yaw: number;
  wallColor: number;
  roofColor: number;
  trimColor: number;
  signText?: string;
}

export interface JayaShipSpec {
  id: string;
  name: string;
  x: number;
  z: number;
  y: number;
  length: number;
  beam: number;
  yaw: number;
  hullColor: number;
  accentColor: number;
  figurehead: 'horse' | 'serpent' | 'phoenix' | 'zebra' | 'ram' | 'salvage';
}

export interface JayaTreeSpec {
  id: string;
  kind: 'palm' | 'canopy' | 'fern';
  x: number;
  z: number;
  y: number;
  scale: number;
  yaw: number;
  tint: number;
}

export interface JayaPropSpec {
  id: string;
  kind: 'crate-stack' | 'barrel' | 'boulder' | 'campfire' | 'south-bird';
  x: number;
  z: number;
  y: number;
  scale: number;
  yaw: number;
}

export interface JayaCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

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

function capsuleSd(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  r: number
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  const t = lenSq > 1e-8 ? clamp(((px - ax) * dx + (pz - az) * dz) / lenSq, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t)) - r;
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

function distToPolyline2D(
  px: number,
  pz: number,
  pts: readonly [number, number][]
): number {
  let minD = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distToSegment2D(
      px,
      pz,
      pts[i][0],
      pts[i][1],
      pts[i + 1][0],
      pts[i + 1][1]
    );
    if (d < minD) minD = d;
  }
  return minD;
}

function smin(a: number, b: number, k: number): number {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return b * (1 - h) + a * h - k * h * (1 - h);
}

/**
 * Signed distance to Mouth Bay & the northern sea channel (< 0 water, > 0 land).
 * Splits Jaya into West Jaya (Mock Town) & East Jaya (Cricket + South Grave),
 * widening at the south into the sunken inner bay where Upper Yard once sat.
 */
export function jayaMouthBaySignedDist(x: number, z: number): number {
  // Northern channel down into Mouth Bay
  const channel = capsuleSd(x, z, -2, -98, -3, 38, 16.5);
  // Bulbous southern inner bay (where Upper Yard stood)
  const innerBay = ellipseSd(x, z, -5, 45, 31.5, 16.5);
  // Small bay indents along west and east coasts matching the jagged skull-tooth map
  const westPocketN = ellipseSd(x, z, -17, -41, 10.5, 6.2);
  const westPocketS = ellipseSd(x, z, -17, 25, 10.5, 8.2);
  const eastPocketN = ellipseSd(x, z, 15, -34, 11.5, 7.0);
  const eastPocketS = ellipseSd(x, z, 14, 15, 11.5, 9.0);

  let d = smin(channel, innerBay, 7.0);
  d = smin(d, westPocketN, 3.5);
  d = smin(d, westPocketS, 3.5);
  d = smin(d, eastPocketN, 3.5);
  d = smin(d, eastPocketS, 3.5);
  const wiggle = (valueNoise2D(x * 0.12 + 2.1, z * 0.12 - 1.4) - 0.5) * 2.4;
  return d + wiggle;
}

/**
 * Shallow turquoise cove right beside Mock Town for L'Hôtel Tropical on stilts (Image 4).
 */
export function jayaTropicalLagoonSignedDist(x: number, z: number): number {
  const cove = ellipseSd(x, z, -20.5, -2.5, 9.0, 6.5);
  const channelOut = capsuleSd(x, z, -20.5, -2.5, -6.0, -3.5, 4.4);
  return smin(cove, channelOut, 2.5);
}

/**
 * Small inland skull-eye ponds (NW near Mock Town brow, NE near Cricket's plateau).
 */
export function jayaInlandPondSignedDist(x: number, z: number): number {
  const nwEye = ellipseSd(x, z, -44.0, -64.0, 5.5, 4.4);
  const neEye = ellipseSd(x, z, 35.0, -51.5, 4.6, 3.8);
  return Math.min(nwEye, neEye);
}

/**
 * Land silhouette SDF of broken-skull Jaya (< 0 on dry island/islets, > 0 in sea).
 */
export function jayaLandSignedDist(x: number, z: number): number {
  // West Jaya (NW brow -> Mock Town harbor shore -> SW jungle lobe)
  const nwBrow = ellipseSd(x, z, -40, -63, 21, 16);
  const nwTip = ellipseSd(x, z, -20, -61, 10, 6.5);
  const westTown = ellipseSd(x, z, -48, -26, 26, 28);
  const westRidge = capsuleSd(x, z, -65, -45, -66, 24, 14.5);
  const swJungle = ellipseSd(x, z, -47, 36, 24, 28);
  const swTooth = ellipseSd(x, z, -24, 12, 9.5, 7.5);
  const swBottomTooth = ellipseSd(x, z, -22, 46, 9, 6.5);

  // Southern isthmus land bridge
  const southBridge = capsuleSd(x, z, -40, 66, 42, 65, 9.5);
  const southBulge = ellipseSd(x, z, 2, 68, 12, 9);

  // East Jaya (Cricket's northern peninsula + South Grave dense forest)
  const neBrow = ellipseSd(x, z, 42, -49, 21, 15);
  const neTip = ellipseSd(x, z, 18, -50, 11, 7.2);
  const eastMiddle = ellipseSd(x, z, 42, -3, 25, 32);
  const eastToothN = ellipseSd(x, z, 17, -14, 10, 7);
  const eastToothS = ellipseSd(x, z, 18, 32, 11, 8.5);
  const seJungle = ellipseSd(x, z, 43, 40, 23, 25);

  let land = smin(nwBrow, nwTip, 4.5);
  land = smin(land, westTown, 7.0);
  land = smin(land, westRidge, 6.0);
  land = smin(land, swJungle, 7.0);
  land = smin(land, swTooth, 3.0);
  land = smin(land, swBottomTooth, 3.0);
  land = smin(land, southBridge, 5.0);
  land = smin(land, southBulge, 3.5);

  let east = smin(neBrow, neTip, 4.5);
  east = smin(east, eastMiddle, 7.0);
  east = smin(east, eastToothN, 3.0);
  east = smin(east, eastToothS, 3.0);
  east = smin(east, seJungle, 7.0);
  land = smin(land, east, 6.0);

  // Add subtle natural coastline jitter
  const coastNoise =
    (valueNoise2D(x * 0.08 + 1.3, z * 0.08 - 2.7) - 0.5) * 3.6 +
    (valueNoise2D(x * 0.21 - 3.9, z * 0.21 + 0.8) - 0.5) * 1.4;
  land += coastNoise;

  // Carve central Mouth Bay (inverted: water where baySd < 0 => land = max(land, -baySd))
  const baySd = jayaMouthBaySignedDist(x, z);
  land = Math.max(land, -baySd);

  // Carve shallow turquoise Tropical Hotel lagoon cove beside Mock Town
  const lagSd = jayaTropicalLagoonSignedDist(x, z);
  land = Math.max(land, -lagSd);

  // Add two iconic tiny offshore islets shown in Map 1 (NE islet + South isthmus islet)
  const neIslet = ellipseSd(x, z, 61, -71, 6.8, 5.0);
  const sIslet = ellipseSd(x, z, 22, 81, 5.6, 3.8);
  land = Math.min(land, neIslet, sIslet);

  return land;
}

/**
 * Outer coastline mask (0 in ocean/Mouth Bay, 1 on dry Jaya terrain).
 */
export function sampleJayaCoastMask(x: number, z: number): number {
  const landSd = jayaLandSignedDist(x, z);
  let mask = 1 - smoothstep(-3.0, 2.2, landSd);
  const outerFade = 1 - smoothstep(0.90, 1.02, Math.hypot(x / 112.0, z / 108.0));
  mask *= outerFade;
  return clamp(mask, 0, 1);
}

// --- Road & Trail Polylines ---
// Wide planked Rue Principale of Mock Town (Image 3)
export const JAYA_MOCK_MAIN_STREET: readonly [number, number][] = [
  [-35.5, -45.5],
  [-35.5, -28.0],
  [-35.5, -10.5],
];

// Harbor quay promenade along eastern edge of Mock Town
export const JAYA_MOCK_QUAY_ROAD: readonly [number, number][] = [
  [-26.0, -43.5],
  [-26.0, -13.0],
  [-32.5, -10.0],
  [-35.5, -10.5],
];

// Curved Tropical Hotel boardwalk path over turquoise lagoon (Image 4)
export const JAYA_HOTEL_BOARDWALK_PATH: readonly [number, number][] = [
  [-32.5, -10.0],
  [-28.2, -7.8],
  [-23.8, -5.8],
  [-19.6, -4.6],
];

// Secondary town lane (west side saloons & towers)
export const JAYA_MOCK_WEST_LANE: readonly [number, number][] = [
  [-45.0, -40.0],
  [-45.0, -16.0],
];

export const JAYA_MOCK_CROSS_LANE_N: readonly [number, number][] = [
  [-45.0, -37.0],
  [-26.0, -37.0],
];

export const JAYA_MOCK_CROSS_LANE_S: readonly [number, number][] = [
  [-45.0, -16.0],
  [-26.0, -16.0],
];

// Island-wide jungle trail: Mock Town -> SW Jungle -> Isthmus -> South Grave Hideout -> Cricket's House
export const JAYA_JUNGLE_TRAIL: readonly [number, number][] = [
  [-35.5, -10.5],
  [-41.0, 4.0],
  [-45.0, 22.0],
  [-43.0, 44.0],
  [-34.0, 58.0],
  [-14.0, 66.5],
  [8.0, 66.0],
  [33.0, 60.0],
  [41.0, 38.0],
  [39.0, 17.0],
  [44.0, -4.0],
  [47.5, -26.0],
  [52.0, -40.0],
];

export function jayaPlankRoadSignedDist(x: number, z: number): number {
  let d = distToPolyline2D(x, z, JAYA_MOCK_MAIN_STREET) - 2.35;
  d = Math.min(d, distToPolyline2D(x, z, JAYA_MOCK_QUAY_ROAD) - 1.85);
  d = Math.min(d, distToPolyline2D(x, z, JAYA_MOCK_WEST_LANE) - 1.45);
  d = Math.min(d, distToPolyline2D(x, z, JAYA_MOCK_CROSS_LANE_N) - 1.35);
  d = Math.min(d, distToPolyline2D(x, z, JAYA_MOCK_CROSS_LANE_S) - 1.35);
  return d;
}

export function jayaJungleTrailSignedDist(x: number, z: number): number {
  return distToPolyline2D(x, z, JAYA_JUNGLE_TRAIL) - 1.5;
}

export function jayaRoadSignedDist(x: number, z: number): number {
  return Math.min(jayaPlankRoadSignedDist(x, z), jayaJungleTrailSignedDist(x, z));
}

/**
 * Dense tropical forest zones (Map 1 & Map 2):
 * - SW Jaya south of Mock Town
 * - Central/Southern Isthmus patch
 * - Vast South Grave rainforest across East Jaya
 */
export function sampleJayaJungleDensity(x: number, z: number): number {
  const swJungle = 1 - smoothstep(14, 28, ellipseSd(x, z, -46, 30, 18, 22));
  const bridgeForest = 1 - smoothstep(3, 10, ellipseSd(x, z, 2, 66, 11, 6.5));
  const southGrave = 1 - smoothstep(12, 26, ellipseSd(x, z, 41, 20, 22, 34));
  const neEdge = 1 - smoothstep(6, 16, ellipseSd(x, z, 26, -46, 12, 10));
  return clamp(Math.max(swJungle, bridgeForest, southGrave, neEdge), 0, 1);
}

/**
 * Full procedural terrain elevation map for Jaya Island:
 * - Deep ocean & Mouth Bay: -4.8m
 * - Shallow turquoise Tropical Hotel lagoon: -1.1m
 * - Sandy beaches & rocky shore shelves: +1.4m -> +2.4m
 * - Mock Town terrace: smooth +2.55m -> +3.1m
 * - Western rocky ridge behind Mock Town (Map 2): +8m -> +17.5m
 * - South Grave tropical jungle hills: +4.5m -> +14.5m
 * - Cricket's isolated East Coast terrace: smooth +3.55m overlooking coastal cliffs
 */
export function sampleJayaHeight(x: number, z: number): number {
  const coast = sampleJayaCoastMask(x, z);
  const lagSd = jayaTropicalLagoonSignedDist(x, z);
  const baseSea = -4.8 + (valueNoise2D(x * 0.09, z * 0.09) - 0.5) * 0.2;

  if (coast <= 0.01) {
    // Keep shallow turquoise cove shelf right under L'Hôtel Tropical
    if (lagSd < 2.2) {
      const lagT = 1 - smoothstep(-1.5, 4.5, lagSd);
      return baseSea * (1 - lagT) + JAYA_LAGOON_BED_Y * lagT;
    }
    return baseSea;
  }

  const subT = smoothstep(0.02, 0.24, coast);
  const shoreT = smoothstep(0.18, 0.48, coast);
  const plainT = smoothstep(0.35, 0.72, coast);
  let h = baseSea + subT * 4.9 + shoreT * 1.6 + plainT * 0.85; // -4.8 -> +2.55

  const rolling =
    (valueNoise2D(x * 0.06 + 1.7, z * 0.06 - 2.3) * 1.8 +
      valueNoise2D(x * 0.16 - 3.4, z * 0.16 + 1.9) * 0.65 -
      0.8) *
    smoothstep(0.45, 0.88, coast);
  h += rolling;

  // Western Rocky Ridge behind Mock Town (Map 2 ridges along west coast)
  const ridgeDist = capsuleSd(x, z, -66, -42, -65, 18, 5.5);
  if (ridgeDist < 12.0 && coast > 0.42) {
    const ridgeF = 1 - smoothstep(0.0, 12.0, ridgeDist);
    const crag =
      valueNoise2D(x * 0.15 + 3.1, z * 0.15 - 1.2) * 5.8 +
      valueNoise2D(x * 0.34, z * 0.34) * 2.2;
    h = Math.max(h, JAYA_TOWN_Y + ridgeF * 9.5 + ridgeF * crag);
  }

  // South Grave tropical rainforest interior hills (central-east Jaya)
  const sgHillDist = ellipseSd(x, z, 43, 18, 17, 29);
  if (sgHillDist < 12.0 && coast > 0.45) {
    const sgF = 1 - smoothstep(-6.0, 12.0, sgHillDist);
    const hillUndul = valueNoise2D(x * 0.09 - 2.2, z * 0.09 + 4.1) * 5.2;
    h += sgF * (4.4 + hillUndul);
  }

  // SW Jungle rolling hills
  const swHillDist = ellipseSd(x, z, -49, 32, 15, 19);
  if (swHillDist < 10.0 && coast > 0.45) {
    const swF = 1 - smoothstep(-4.0, 10.0, swHillDist);
    h += swF * (3.2 + valueNoise2D(x * 0.11 + 5.1, z * 0.11 - 0.8) * 3.4);
  }

  // Southern isthmus ridge
  const bridgeDist = capsuleSd(x, z, -24, 65, 26, 65, 4.5);
  if (bridgeDist < 5.0 && coast > 0.4) {
    const bF = 1 - smoothstep(0.0, 5.0, bridgeDist);
    h += bF * 1.4;
  }

  // Flatten Mock Town gently for crisp wooden street & building seating
  const mockZone =
    smoothstep(-54, -47, x) *
    (1 - smoothstep(-27, -21, x)) *
    smoothstep(-50, -43, z) *
    (1 - smoothstep(-10, -4, z));
  if (mockZone > 0.01 && coast > 0.4) {
    const targetTownY = JAYA_TOWN_Y + 0.15 + smoothstep(-26, -50, x) * 0.45;
    h = h * (1 - mockZone * 0.88) + targetTownY * (mockZone * 0.88);
  }

  // Flatten Pirate Jungle Hideout clearing inside South Grave (around (38, 17))
  const hideoutZone = 1 - smoothstep(5.5, 13.5, Math.hypot(x - 38.5, z - 17.0));
  if (hideoutZone > 0.01 && coast > 0.45) {
    h = h * (1 - hideoutZone * 0.82) + 4.65 * (hideoutZone * 0.82);
  }

  // Flatten Montblanc Cricket's East Coast terrace (+3.55m grass cliff plateau, Image 6)
  const cricketZone = 1 - smoothstep(9.0, 18.0, Math.hypot(x - 51.0, z + 47.0));
  if (cricketZone > 0.01 && coast > 0.35) {
    h = h * (1 - cricketZone * 0.92) + 3.55 * (cricketZone * 0.92);
  }

  // Inland skull-eye ponds (shallow calm water depression)
  const pondSd = jayaInlandPondSignedDist(x, z);
  if (pondSd < 2.2 && coast > 0.5) {
    const pondT = 1 - smoothstep(-1.0, 2.2, pondSd);
    h = h * (1 - pondT) + 0.55 * pondT;
  }

  // Grade walkable roads & jungle trail cleanly
  const rDist = jayaRoadSignedDist(x, z);
  if (rDist < 1.6 && coast > 0.42 && pondSd > 1.2) {
    const rT = 1 - smoothstep(-0.2, 1.6, rDist);
    const roadClamp = clamp(h, JAYA_TOWN_Y - 0.15, 6.2);
    h = h * (1 - rT * 0.65) + roadClamp * (rT * 0.65);
  }

  return h;
}

/**
 * Walkable surface height including Wooden Docks, Curved Tropical Hotel Stilt Boardwalk & Plank Streets.
 */
export function sampleJayaWalkSurfaceHeight(x: number, z: number): number {
  const hotelDeck = distToPolyline2D(x, z, JAYA_HOTEL_BOARDWALK_PATH);
  if (hotelDeck < 2.4) {
    return 2.45;
  }
  // Harbor pier extending east from Mock Town docks
  if (x >= -27 && x <= -12 && z >= -45 && z <= -12) {
    return 2.35;
  }
  return Math.max(sampleJayaHeight(x, z), JAYA_SHORE_Y);
}

/**
 * Moored pirate ships at Port de Mock Town (5 lined up nose-in like Image 5, including Roshio's ship)
 * plus 2 Saruyama Alliance expedition vessels anchored off Cricket's eastern coast (Map 2).
 */
export const JAYA_SHIPS: readonly JayaShipSpec[] = [
  {
    id: 'ship-roshio',
    name: 'Navire de Roshio (Le Supplicié)',
    x: -16.4,
    z: -38.0,
    y: 0.05,
    length: 13.0,
    beam: 2.9,
    yaw: Math.PI * 0.5, // Bow pointing west toward quay
    hullColor: 0xc89a3c,
    accentColor: 0x7b3322,
    figurehead: 'horse',
  },
  {
    id: 'ship-bellamy-crew',
    name: 'Galion de Bellamy',
    x: -16.8,
    z: -32.2,
    y: 0.05,
    length: 12.6,
    beam: 2.8,
    yaw: Math.PI * 0.48,
    hullColor: 0x4f784a,
    accentColor: 0x9b7938,
    figurehead: 'serpent',
  },
  {
    id: 'ship-crimson-phoenix',
    name: 'Galion Écarlate du Port',
    x: -16.2,
    z: -26.4,
    y: 0.05,
    length: 12.8,
    beam: 2.85,
    yaw: Math.PI * 0.51,
    hullColor: 0xa44535,
    accentColor: 0xd9a84e,
    figurehead: 'phoenix',
  },
  {
    id: 'ship-striped-raider',
    name: 'Navire Corsaire Rayé',
    x: -16.7,
    z: -20.6,
    y: 0.05,
    length: 12.2,
    beam: 2.75,
    yaw: Math.PI * 0.49,
    hullColor: 0x6f7b88,
    accentColor: 0x2e3944,
    figurehead: 'zebra',
  },
  {
    id: 'ship-iron-ram',
    name: 'Brick Pirate du Quai Sud',
    x: -17.0,
    z: -14.8,
    y: 0.05,
    length: 11.8,
    beam: 2.7,
    yaw: Math.PI * 0.52,
    hullColor: 0x8b5b3c,
    accentColor: 0xc2934b,
    figurehead: 'ram',
  },
  // Two Saruyama Alliance / Masira & Shoujou vessels moored off Cricket's East Coast (Map 2)
  {
    id: 'ship-saruyama-1',
    name: 'Navire d’Exploration Saruyama Nord',
    x: 74.5,
    z: -54.0,
    y: 0.05,
    length: 11.4,
    beam: 2.9,
    yaw: -Math.PI * 0.45,
    hullColor: 0x7c5337,
    accentColor: 0xd4a448,
    figurehead: 'salvage',
  },
  {
    id: 'ship-saruyama-2',
    name: 'Navire de Récupération Saruyama Sud',
    x: 75.5,
    z: -44.5,
    y: 0.05,
    length: 10.6,
    beam: 2.7,
    yaw: -Math.PI * 0.52,
    hullColor: 0x624432,
    accentColor: 0xb93f32,
    figurehead: 'salvage',
  },
];

/**
 * Buildings across Mock Town, L'Hôtel Tropical, South Grave Pirate Hideout & Cricket's House.
 * Coordinates keep >= 0.4m clearance between footprints so buildings align tightly along plank streets without intersecting.
 */
const RAW_JAYA_BUILDINGS: readonly Omit<JayaBuildingSpec, 'y'>[] = [
  // --- 1. PORT DE MOCK TOWN (Warehouses & harbor saloons along Quay x ≈ -29.2) ---
  {
    id: 'mt-port-1',
    name: 'Entrepôt Maritime du Port',
    district: 'mock-town-port',
    kind: 'dock-warehouse',
    x: -29.8,
    z: -42.0,
    radius: 2.4,
    width: 4.2,
    depth: 3.6,
    wallHeight: 3.1,
    roofHeight: 2.3,
    yaw: Math.PI * 0.5,
    wallColor: 0x8a5e3c,
    roofColor: 0xb83c32,
    trimColor: 0xe6ddd0,
    signText: 'DOCKS',
  },
  {
    id: 'mt-port-tower-round',
    name: 'Tour Ronde Blanche du Port',
    district: 'mock-town-port',
    kind: 'tower-round',
    x: -30.2,
    z: -36.5,
    radius: 2.3,
    width: 4.0,
    depth: 4.0,
    wallHeight: 9.8,
    roofHeight: 2.8,
    yaw: Math.PI * 0.5,
    wallColor: 0xebe4d8,
    roofColor: 0xb6392f,
    trimColor: 0x6f4a2d,
  },
  {
    id: 'mt-port-2',
    name: 'Taverne des Quais',
    district: 'mock-town-port',
    kind: 'saloon-pub',
    x: -29.8,
    z: -31.2,
    radius: 2.3,
    width: 4.0,
    depth: 3.6,
    wallHeight: 3.3,
    roofHeight: 2.4,
    yaw: -Math.PI * 0.5,
    wallColor: 0x9b6b45,
    roofColor: 0xbf4135,
    trimColor: 0xebe3d5,
    signText: 'PORT BAR',
  },
  {
    id: 'mt-pub-main',
    name: 'Le Pub de Mock Town',
    district: 'mock-town-street',
    kind: 'saloon-pub',
    x: -30.2,
    z: -25.8,
    radius: 2.75,
    width: 4.8,
    depth: 4.2,
    wallHeight: 3.9,
    roofHeight: 2.9,
    yaw: -Math.PI * 0.5, // Porch & pub sign face directly onto Rue Principale (x = -35.5)
    wallColor: 0x8d5b38,
    roofColor: 0xba382e,
    trimColor: 0xf1e8da,
    signText: 'MOCK PUB',
  },
  {
    id: 'mt-gecker',
    name: 'Armurerie Gecker',
    district: 'mock-town-street',
    kind: 'shop-armory',
    x: -30.2,
    z: -20.2,
    radius: 2.45,
    width: 4.2,
    depth: 3.8,
    wallHeight: 3.4,
    roofHeight: 2.6,
    yaw: -Math.PI * 0.5,
    wallColor: 0xe6decb,
    roofColor: 0xc24034,
    trimColor: 0x72492a,
    signText: 'Gecker',
  },
  {
    id: 'mt-port-3',
    name: 'Auberge de la Baie Sud',
    district: 'mock-town-port',
    kind: 'gambling-brothel',
    x: -30.4,
    z: -14.8,
    radius: 2.35,
    width: 4.0,
    depth: 3.6,
    wallHeight: 3.3,
    roofHeight: 2.4,
    yaw: -Math.PI * 0.5,
    wallColor: 0xdccbb4,
    roofColor: 0xb4372d,
    trimColor: 0x7c4e2e,
    signText: 'SALOON',
  },

  // --- 2. RUE PRINCIPALE OUEST (West frontage facing Rue Principale x ≈ -40.5) ---
  {
    id: 'mt-street-w1',
    name: 'Saloon du Crâne Brisé',
    district: 'mock-town-street',
    kind: 'saloon-pub',
    x: -40.6,
    z: -42.5,
    radius: 2.4,
    width: 4.2,
    depth: 3.6,
    wallHeight: 3.5,
    roofHeight: 2.5,
    yaw: Math.PI * 0.5,
    wallColor: 0x996740,
    roofColor: 0xb93c31,
    trimColor: 0xeee6d8,
    signText: 'SALOON',
  },
  {
    id: 'mt-street-w2',
    name: 'Maison de Jeu "Golden Jack"',
    district: 'mock-town-street',
    kind: 'gambling-brothel',
    x: -40.8,
    z: -37.2,
    radius: 2.45,
    width: 4.3,
    depth: 3.8,
    wallHeight: 3.7,
    roofHeight: 2.7,
    yaw: Math.PI * 0.5,
    wallColor: 0xebe2d3,
    roofColor: 0xc03f33,
    trimColor: 0x774c2c,
    signText: 'CASINO',
  },
  {
    id: 'mt-watchtower-wood',
    name: 'Beffroi en Bois de Mock Town',
    district: 'mock-town-street',
    kind: 'watchtower-wood',
    x: -40.6,
    z: -31.5,
    radius: 2.3,
    width: 3.6,
    depth: 3.6,
    wallHeight: 11.4,
    roofHeight: 2.6,
    yaw: Math.PI * 0.5,
    wallColor: 0x7a4f30,
    roofColor: 0xb5372d,
    trimColor: 0x52341f,
  },
  {
    id: 'mt-street-w3',
    name: 'Bordel de la Rose Écarlate',
    district: 'mock-town-street',
    kind: 'gambling-brothel',
    x: -40.8,
    z: -25.8,
    radius: 2.55,
    width: 4.5,
    depth: 3.9,
    wallHeight: 3.8,
    roofHeight: 2.8,
    yaw: Math.PI * 0.5,
    wallColor: 0xdfd0be,
    roofColor: 0xb8382f,
    trimColor: 0x853b36,
    signText: 'VELVET',
  },
  {
    id: 'mt-street-w4',
    name: 'Armurerie du Chien Fou',
    district: 'mock-town-street',
    kind: 'shop-armory',
    x: -40.6,
    z: -20.2,
    radius: 2.35,
    width: 4.1,
    depth: 3.6,
    wallHeight: 3.3,
    roofHeight: 2.4,
    yaw: Math.PI * 0.5,
    wallColor: 0x8d5e3b,
    roofColor: 0xbf4135,
    trimColor: 0xeee5d7,
    signText: 'ARMS',
  },
  {
    id: 'mt-street-w5',
    name: 'Tripot & Comptoir Pirate',
    district: 'mock-town-street',
    kind: 'saloon-pub',
    x: -40.6,
    z: -14.8,
    radius: 2.3,
    width: 4.0,
    depth: 3.5,
    wallHeight: 3.2,
    roofHeight: 2.4,
    yaw: Math.PI * 0.5,
    wallColor: 0xe6dccb,
    roofColor: 0xb6392f,
    trimColor: 0x754a2b,
    signText: 'TAVERN',
  },

  // --- 3. QUARTIER OUEST (Secondary Far-West pirate blocks x ≈ -49.2) ---
  {
    id: 'mt-west-1',
    name: 'Forge & Poudrière de Mock Town',
    district: 'mock-town-west',
    kind: 'shop-armory',
    x: -49.2,
    z: -39.5,
    radius: 2.25,
    width: 3.9,
    depth: 3.4,
    wallHeight: 3.1,
    roofHeight: 2.3,
    yaw: Math.PI * 0.5,
    wallColor: 0x7f5536,
    roofColor: 0xb3382e,
    trimColor: 0xe6ddd0,
  },
  {
    id: 'mt-west-2',
    name: 'Taverne des Boucaniers',
    district: 'mock-town-west',
    kind: 'saloon-pub',
    x: -49.5,
    z: -33.2,
    radius: 2.3,
    width: 4.0,
    depth: 3.5,
    wallHeight: 3.2,
    roofHeight: 2.3,
    yaw: Math.PI * 0.5,
    wallColor: 0xe3d8c5,
    roofColor: 0xbc3e32,
    trimColor: 0x6f472a,
  },
  {
    id: 'mt-west-3',
    name: 'Maison de Jeu Ouest',
    district: 'mock-town-west',
    kind: 'gambling-brothel',
    x: -49.4,
    z: -26.8,
    radius: 2.3,
    width: 4.0,
    depth: 3.6,
    wallHeight: 3.4,
    roofHeight: 2.4,
    yaw: Math.PI * 0.5,
    wallColor: 0x8e5f3b,
    roofColor: 0xb93c31,
    trimColor: 0xede5d7,
  },
  {
    id: 'mt-west-4',
    name: 'Auberge du Croissant',
    district: 'mock-town-west',
    kind: 'shop-armory',
    x: -49.2,
    z: -20.4,
    radius: 2.25,
    width: 3.9,
    depth: 3.4,
    wallHeight: 3.1,
    roofHeight: 2.3,
    yaw: Math.PI * 0.5,
    wallColor: 0xe8dfd0,
    roofColor: 0xc14034,
    trimColor: 0x73492a,
  },
  {
    id: 'mt-west-5',
    name: 'Dortoir des Équipages',
    district: 'mock-town-west',
    kind: 'dock-warehouse',
    x: -49.0,
    z: -14.2,
    radius: 2.2,
    width: 3.8,
    depth: 3.4,
    wallHeight: 3.0,
    roofHeight: 2.2,
    yaw: Math.PI * 0.5,
    wallColor: 0x885b3a,
    roofColor: 0xb6392f,
    trimColor: 0xe7decb,
  },

  // --- 4. L'HÔTEL TROPICAL SUR PILOTIS (Over turquoise lagoon cove, Image 4) ---
  {
    id: 'tropical-hotel',
    name: 'L’Hôtel Tropical',
    district: 'tropical-hotel',
    kind: 'tropical-hotel',
    x: -18.5,
    z: -2.2,
    radius: 5.2,
    width: 9.6,
    depth: 6.4,
    wallHeight: 4.1,
    roofHeight: 3.2,
    yaw: -Math.PI * 0.65, // Entrance arch & sign face NW along the curved lagoon boardwalk!
    wallColor: 0xede6da,
    roofColor: 0xc94235,
    trimColor: 0x8e6440,
    signText: 'TROPICAL HOTEL',
  },

  // --- 5. REPAIRE PIRATE DE LA JUNGLE (South Grave clearing in central/east rainforest) ---
  {
    id: 'jungle-hideout-1',
    name: 'Tente du Repaire Pirate Est',
    district: 'jungle-hideout',
    kind: 'jungle-tent',
    x: 34.5,
    z: 14.5,
    radius: 2.4,
    width: 4.2,
    depth: 3.6,
    wallHeight: 2.6,
    roofHeight: 2.1,
    yaw: 0.72,
    wallColor: 0xc2ab84,
    roofColor: 0x8f3f2f,
    trimColor: 0x624328,
  },
  {
    id: 'jungle-hideout-2',
    name: 'Cabane de Guet de South Grave',
    district: 'jungle-hideout',
    kind: 'jungle-tent',
    x: 42.5,
    z: 18.2,
    radius: 2.5,
    width: 4.4,
    depth: 3.8,
    wallHeight: 2.9,
    roofHeight: 2.2,
    yaw: -1.85,
    wallColor: 0x7d5334,
    roofColor: 0x5c6e3d,
    trimColor: 0x4b331e,
  },

  // --- 6. MAISON-CHÂTEAU DE MONTBLANC CRICKET (Isolated on East Coast headland, Image 6) ---
  {
    id: 'cricket-castle-house',
    name: 'Maison de Montblanc Cricket (Alliance Saruyama)',
    district: 'cricket-house',
    kind: 'cricket-castle',
    x: 52.0,
    z: -48.0,
    radius: 6.4,
    width: 11.8,
    depth: 6.2,
    wallHeight: 6.6,
    roofHeight: 5.0,
    yaw: Math.PI * 0.42, // Facade faces ENE toward the inner bay/east coast sea approach!
    wallColor: 0xf4f4f6,
    roofColor: 0xd95679,
    trimColor: 0xd7b139,
  },
];

export const JAYA_BUILDINGS: readonly JayaBuildingSpec[] =
  RAW_JAYA_BUILDINGS.map((b) => ({
    ...b,
    y:
      b.kind === 'tropical-hotel'
        ? 2.25
        : sampleJayaHeight(b.x, b.z) - 0.12,
  }));

export const JAYA_LANDMARKS = {
  mockTownCenter: { x: -35.5, z: -26.5 },
  mockPub: JAYA_BUILDINGS.find((b) => b.id === 'mt-pub-main')!,
  watchtowerWood: JAYA_BUILDINGS.find((b) => b.id === 'mt-watchtower-wood')!,
  towerRound: JAYA_BUILDINGS.find((b) => b.id === 'mt-port-tower-round')!,
  tropicalHotel: JAYA_BUILDINGS.find((b) => b.id === 'tropical-hotel')!,
  jungleHideout: { x: 38.5, z: 16.5 },
  cricketHouse: JAYA_BUILDINGS.find((b) => b.id === 'cricket-castle-house')!,
  harborPier: { x: -24.5, z: -43.5 },
} as const;

export function buildJayaTrees(): JayaTreeSpec[] {
  const trees: JayaTreeSpec[] = [];
  let idx = 0;

  // 1. Dense multi-layer tropical rainforest (South Grave, SW jungle, isthmus & town borders)
  const total = 560;
  for (let i = 0; i < total; i++) {
    const ang = i * 2.399963 + 0.41;
    const rad = 10 + Math.sqrt((i + 0.5) / total) * 78;
    const x = Math.cos(ang) * rad * 1.04;
    const z = Math.sin(ang) * rad * 1.02;

    const coast = sampleJayaCoastMask(x, z);
    if (coast < 0.54) continue;
    if (jayaInlandPondSignedDist(x, z) < 1.6) continue;
    if (jayaRoadSignedDist(x, z) < 1.6) continue;
    if (distToPolyline2D(x, z, JAYA_HOTEL_BOARDWALK_PATH) < 3.0) continue;

    // Keep Mock Town streets clear, allow scenic palms along western edge & town outskirts
    const inTownCore = x > -53 && x < -25 && z > -46 && z < -10;
    if (inTownCore) continue;

    // Keep Cricket's terrace & hideout camp center clear
    if (Math.hypot(x - 52, z + 48) < 11.0) continue;
    if (Math.hypot(x - 38.5, z - 16.5) < 5.2) continue;

    let nearBuilding = false;
    for (const b of JAYA_BUILDINGS) {
      if (Math.hypot(x - b.x, z - b.z) < b.radius + 2.4) {
        nearBuilding = true;
        break;
      }
    }
    if (nearBuilding) continue;

    const y = sampleJayaHeight(x, z);
    if (y < 1.8) continue;

    const jungleWeight = sampleJayaJungleDensity(x, z);
    const noiseGate = valueNoise2D(x * 0.09 + 2.2, z * 0.09 - 1.5);
    if (jungleWeight < 0.25 && noiseGate < 0.58) continue;

    const nearShore = coast < 0.82 || jungleWeight < 0.45;
    const kind: JayaTreeSpec['kind'] = nearShore
      ? i % 3 === 0
        ? 'fern'
        : 'palm'
      : i % 5 === 0
        ? 'palm'
        : i % 4 === 0
          ? 'fern'
          : 'canopy';

    trees.push({
      id: `jaya-tree-${idx++}`,
      kind,
      x,
      z,
      y: y - 0.12,
      scale:
        kind === 'canopy'
          ? 0.95 + (i % 5) * 0.18
          : kind === 'palm'
            ? 0.9 + (i % 4) * 0.16
            : 0.8 + (i % 3) * 0.2,
      yaw: (i * 1.63) % (Math.PI * 2),
      tint: 0.82 + valueNoise2D(x * 0.22, z * 0.22) * 0.3,
    });
  }

  // 2. Hero swaying coconut palms framing Mock Town curbs (clear of central street plankwalk), Tropical Hotel & Cricket's cliffs
  const heroPalms: readonly [number, number, number][] = [
    [-32.6, -34.2, 1.32],
    [-38.4, -29.4, 1.28],
    [-32.7, -17.5, 1.24],
    [-38.5, -39.8, 1.35],
    [-44.5, -24.0, 1.25],
    [-26.2, -10.8, 1.3],
    [-13.5, -6.8, 1.22],
    [-25.5, 1.2, 1.18],
    [45.5, -56.5, 1.25],
    [43.0, -41.0, 1.3],
    [59.5, -56.5, 1.2],
    [57.5, -37.0, 1.25],
  ];
  for (const [px, pz, ps] of heroPalms) {
    trees.push({
      id: `jaya-tree-${idx++}`,
      kind: 'palm',
      x: px,
      z: pz,
      y: sampleJayaHeight(px, pz) - 0.1,
      scale: ps,
      yaw: (idx * 1.17) % (Math.PI * 2),
      tint: 0.98,
    });
  }

  return trees;
}

export const JAYA_TREES: readonly JayaTreeSpec[] = buildJayaTrees();

export function buildJayaProps(): JayaPropSpec[] {
  const props: JayaPropSpec[] = [];
  let idx = 0;

  // Barrels & cargo crates lining Mock Town street & docks (Image 3)
  const townCrates: readonly [number, number, JayaPropSpec['kind']][] = [
    [-33.1, -27.6, 'barrel'],
    [-33.2, -24.2, 'crate-stack'],
    [-38.0, -34.5, 'barrel'],
    [-37.8, -22.8, 'crate-stack'],
    [-33.0, -39.2, 'crate-stack'],
    [-26.5, -34.5, 'crate-stack'],
    [-26.4, -23.0, 'barrel'],
    [-26.5, -17.5, 'crate-stack'],
    // Diving crates behind Montblanc Cricket's castle cutout wall (Saruyama gear)
    [46.5, -49.5, 'crate-stack'],
    [46.8, -45.5, 'barrel'],
  ];
  for (const [px, pz, kind] of townCrates) {
    props.push({
      id: `jaya-prop-${idx++}`,
      kind,
      x: px,
      z: pz,
      y: sampleJayaHeight(px, pz) - 0.04,
      scale: 1.0,
      yaw: (idx * 0.9) % (Math.PI * 2),
    });
  }

  // Jungle pirate camp campfire + stashes + colorful South Birds (wildlife in South Grave!)
  props.push({
    id: `jaya-prop-${idx++}`,
    kind: 'campfire',
    x: 38.5,
    z: 16.5,
    y: sampleJayaHeight(38.5, 16.5) - 0.04,
    scale: 1.1,
    yaw: 0,
  });
  props.push({
    id: `jaya-prop-${idx++}`,
    kind: 'crate-stack',
    x: 37.2,
    z: 18.6,
    y: sampleJayaHeight(37.2, 18.6) - 0.04,
    scale: 1.05,
    yaw: 0.4,
  });
  props.push({
    id: `jaya-prop-${idx++}`,
    kind: 'barrel',
    x: 40.4,
    z: 15.2,
    y: sampleJayaHeight(40.4, 15.2) - 0.04,
    scale: 1.0,
    yaw: 1.1,
  });

  // Iconic Jaya wildlife: South Birds in jungle clearings!
  const birdSpots: readonly [number, number][] = [
    [35.2, 19.8],
    [41.5, 12.2],
    [32.5, 25.5],
    [-46.5, 28.0],
  ];
  for (const [bx, bz] of birdSpots) {
    props.push({
      id: `jaya-prop-${idx++}`,
      kind: 'south-bird',
      x: bx,
      z: bz,
      y: sampleJayaHeight(bx, bz),
      scale: 1.0,
      yaw: (idx * 1.4) % (Math.PI * 2),
    });
  }

  // Coastal cliff boulders on western ridge & Cricket terrace flanks
  const boulders: readonly [number, number, number][] = [
    [-64, -30, 1.4],
    [-66, -10, 1.6],
    [-63, 12, 1.3],
    [61, -36, 1.2],
    [45, -61, 1.3],
    [22, 68, 1.4],
  ];
  for (const [rx, rz, rs] of boulders) {
    props.push({
      id: `jaya-prop-${idx++}`,
      kind: 'boulder',
      x: rx,
      z: rz,
      y: sampleJayaHeight(rx, rz) - 0.2,
      scale: rs,
      yaw: (idx * 1.25) % (Math.PI * 2),
    });
  }

  return props;
}

export const JAYA_PROPS: readonly JayaPropSpec[] = buildJayaProps();

export function toJayaSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * JAYA_GLOBE_SCALE;
  const sz = z * JAYA_GLOBE_SCALE;
  const rTarget =
    globeRadius + (y + JAYA_SPHERE_SEA_OFFSET) * JAYA_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * 7 curated camera presets covering Aerial Broken-Skull Jaya (Map 1 & 2),
 * Mock Town Port & 5 Pirate Ships (Image 5), 1.75m Rue Principale (Image 3),
 * 1.75m Pub de Mock Town, 1.75m L'Hôtel Tropical on Lagoon Stilts (Image 4),
 * 1.75m South Grave Jungle Hideout, and 1.75m Montblanc Cricket's Castle House (Image 6).
 */
export const JAYA_CAMERA_PRESETS: JayaCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble (Jaya)",
    subtitle:
      "Île de Jaya en demi-crâne · Baie de Mouth Bay, Mock Town à l'ouest, dense jungle de South Grave au cœur de l'île et maison-château de Cricket à l'est",
    position: [4, 122, 118],
    target: [0, 3.5, 2],
    isStreetView: false,
  },
  {
    id: 'mock-town-port',
    label: 'Port & Navires Pirates',
    subtitle:
      "Docks de bois de Mock Town où sont amarrés cinq navires pirates (dont celui de Roshio), devant les toits rouges et les deux tours",
    position: [2.0, 14.5, -14.0],
    target: [-26.0, 4.5, -28.0],
    isStreetView: false,
  },
  {
    id: 'rue-principale',
    label: 'Rue Principale (Humain)',
    subtitle:
      "À hauteur d'homme (1,75 m) sur les planches de la rue principale bordée de saloons, armureries, maisons de jeu, tonneaux, palmiers et des deux tours",
    position: [
      -35.5,
      sampleJayaWalkSurfaceHeight(-35.5, -15.5) + 1.75,
      -15.5,
    ],
    target: [
      -35.5,
      sampleJayaWalkSurfaceHeight(-35.5, -35.0) + 5.2,
      -35.0,
    ],
    isStreetView: true,
  },
  {
    id: 'mock-town-pub',
    label: 'Pub de Mock Town (Humain)',
    subtitle:
      "À hauteur d'homme (1,75 m) devant le Pub de Mock Town où Luffy croise Bellamy, entre porches en bois usé et toits rouges tropicaux",
    position: [
      -36.2,
      sampleJayaWalkSurfaceHeight(-36.2, -24.2) + 1.75,
      -24.2,
    ],
    target: [
      JAYA_LANDMARKS.mockPub.x,
      JAYA_LANDMARKS.mockPub.y + 2.4,
      JAYA_LANDMARKS.mockPub.z,
    ],
    isStreetView: true,
  },
  {
    id: 'tropical-hotel',
    label: 'Hôtel Tropical (Humain)',
    subtitle:
      "À hauteur d'homme (1,75 m) sur le ponton courbe sur pilotis au-dessus du lagon turquoise face aux arcades et au panneau de L'Hôtel Tropical",
    position: [
      -27.8,
      sampleJayaWalkSurfaceHeight(-27.8, -7.6) + 1.75,
      -7.6,
    ],
    target: [
      JAYA_LANDMARKS.tropicalHotel.x,
      JAYA_LANDMARKS.tropicalHotel.y + 2.6,
      JAYA_LANDMARKS.tropicalHotel.z,
    ],
    isStreetView: true,
  },
  {
    id: 'jungle-hideout',
    label: 'Jungle & Repaire Pirate (Humain)',
    subtitle:
      "À hauteur d'homme (1,75 m) sur le sentier de la forêt tropicale dense de South Grave devant le repaire pirate et la faune locale (South Birds)",
    position: [
      39.8,
      sampleJayaWalkSurfaceHeight(39.8, 25.5) + 1.75,
      25.5,
    ],
    target: [
      38.5,
      sampleJayaWalkSurfaceHeight(38.5, 16.5) + 2.2,
      16.5,
    ],
    isStreetView: true,
  },
  {
    id: 'cricket-house',
    label: 'Maison de Cricket (Humain)',
    subtitle:
      "À hauteur d'homme (1,75 m) sur la côte est isolée devant la façade en bois en forme de château de Montblanc Cricket, ses dômes roses et ses faux canons",
    position: [
      65.5,
      sampleJayaWalkSurfaceHeight(65.5, -45.5) + 1.75,
      -45.5,
    ],
    target: [
      JAYA_LANDMARKS.cricketHouse.x,
      JAYA_LANDMARKS.cricketHouse.y + 5.2,
      JAYA_LANDMARKS.cricketHouse.z,
    ],
    isStreetView: true,
  },
];
