import { ridgedFbm2D, valueNoise2D } from './globeMath';

export const SKYPIEA_WORLD_SIZE = 360;
export const SKYPIEA_GLOBE_SCALE = 0.0028;
export const SKYPIEA_ALTITUDE = 0.50;
export const SKYPIEA_GLOBE_CENTER = { u: 0.6738, v: 0.5112 } as const;

/**
 * Local Skypiea coordinates inside Angel Bay's southern mouth in front of Angel Beach & Angel Pier
 * where the vertical Knock Up Stream erupts into the White-White Sea.
 */
export const KNOCK_UP_STREAM_SKY_LOCAL = { x: -12, z: 102 } as const;

/**
 * Radial distance from Skypiea center (in local units) marking the outer White-White Sea
 * cloud rim where the Giant Octopus Balloon deploys to glide back down to the Blue Sea.
 */
export const SKYPIEA_SEA_EXIT_RADIUS = 146;

/**
 * Blue Sea capture radius (world units at globeRadius = 10) for entering the Knock Up Stream.
 */
export const KNOCK_UP_STREAM_CAPTURE_RADIUS = 0.048;

export function toSkypieaSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const baseR = globeRadius + SKYPIEA_ALTITUDE;
  const sx = x * SKYPIEA_GLOBE_SCALE;
  const sz = z * SKYPIEA_GLOBE_SCALE;
  const rTarget = baseR + y * SKYPIEA_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) - baseR;
  return { x: sx, y: sy, z: sz };
}

/**
 * Computes exact equirectangular (u, v) on the Blue Sea directly beneath
 * Skypiea's Angel Bay Knock Up Stream arrival pool.
 */
export function getKnockUpStreamGlobeCoords(globeRadius = 10): {
  u: number;
  v: number;
} {
  const sx = KNOCK_UP_STREAM_SKY_LOCAL.x * SKYPIEA_GLOBE_SCALE;
  const sz = KNOCK_UP_STREAM_SKY_LOCAL.z * SKYPIEA_GLOBE_SCALE;
  const latScale = Math.max(0.2, Math.sin(SKYPIEA_GLOBE_CENTER.v * Math.PI));
  const du = sx / (Math.PI * 2 * globeRadius * latScale);
  const dv = sz / (Math.PI * globeRadius);
  return {
    u: SKYPIEA_GLOBE_CENTER.u + du,
    v: SKYPIEA_GLOBE_CENTER.v + dv,
  };
}

// Key Landmark Coordinates (360 x 360 world, North=-Z, South=+Z, West=-X, East=+X)
export const ANGEL_BAY_CENTER = { x: 2, z: 72 } as const;
export const ANGEL_BEACH_CENTER = { x: 58, z: 72 } as const;
export const ANGEL_PIER_START = { x: 50, z: 70 } as const;
export const ANGEL_PIER_END = { x: 24, z: 80 } as const;

export const UPPER_YARD_CENTER = { x: 102, z: -24 } as const;
export const UPPER_YARD_PLATEAU_Y = 23.5;
export const UPPER_YARD_RADIUS = 23.5;

export const GIANT_JACK_CENTER = { x: 28, z: -64 } as const;
export const JUNGLE_BUTTE_CENTER = { x: -36, z: -56 } as const;
export const SHANDORA_PYRAMID_CENTER = { x: -76, z: -38 } as const;
export const SHANDORA_RUINS_NW = { x: -112, z: -12 } as const;
export const SHANDORA_RUINS_SW = { x: -94, z: 24 } as const;

export const SKYPIEA_SUB_LOCATIONS: Record<string, [number, number]> = {
  skypiea: [0, 0],
  'upper-yard': [UPPER_YARD_CENTER.x, UPPER_YARD_CENTER.z],
  'angel-island': [ANGEL_BEACH_CENTER.x, ANGEL_BEACH_CENTER.z],
  'hidden-cloud-village': [-86, 16],
};

export interface SkypieaRoadPoint {
  x: number;
  z: number;
  width: number;
}

export interface SkypieaBridgeSpec {
  x: number;
  z: number;
  y: number;
  yaw: number;
  length: number;
  width: number;
}

export interface SkypieaHouseSpec {
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
  roofStyle: 'dome' | 'pitched' | 'cone';
  district: 'angel-beach' | 'shandia';
}

export interface SkypieaTreeSpec {
  x: number;
  z: number;
  y: number;
  scale: number;
  hueShift: number;
  kind: 'jungle' | 'palm';
  yaw: number;
}

export interface SkypieaCameraPreset {
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

function distToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): { dist: number; t: number } {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const lenSq = vx * vx + vz * vz;
  const t = lenSq > 1e-6 ? clamp((wx * vx + wz * vz) / lenSq, 0, 1) : 0;
  const dx = px - (ax + vx * t);
  const dz = pz - (az + vz * t);
  return { dist: Math.hypot(dx, dz), t };
}

/**
 * Polylines defining every visible dirt/stone path across Skypiea
 * matching skypea_6d53f3aa.jpg.
 */
export const SKYPIEA_ROAD_PATHS: readonly (readonly SkypieaRoadPoint[])[] = [
  // 1. Angel Beach coastal lane behind houses
  [
    { x: 52, z: 103, width: 2.8 },
    { x: 64, z: 86, width: 3.0 },
    { x: 65, z: 68, width: 3.2 },
    { x: 61, z: 50, width: 3.0 },
    { x: 52, z: 36, width: 2.8 },
  ],
  // 2. Ascent path climbing up to Upper Yard Golden Palace stairs
  [
    { x: 52, z: 36, width: 2.8 },
    { x: 68, z: 24, width: 2.9 },
    { x: 82, z: 12, width: 3.0 },
    { x: 94, z: -2, width: 3.4 },
    { x: 100, z: -12, width: 3.8 },
  ],
  // 3. Central Jungle East-West trail (from Angel Beach north fork across river bridges to Shandora Ruins)
  [
    { x: 52, z: 36, width: 2.8 },
    { x: 34, z: 26, width: 2.8 },
    { x: 22, z: 20, width: 2.6 },
    { x: 4, z: 19, width: 3.2 },
    { x: -12, z: 6, width: 2.7 },
    { x: -38, z: 17, width: 2.7 },
    { x: -62, z: 22, width: 2.8 },
    { x: -86, z: 22, width: 3.2 },
    { x: -102, z: 8, width: 2.8 },
    { x: -108, z: -6, width: 2.8 },
  ],
  // 4. Branch to Shandora Stepped Pyramid plaza
  [
    { x: -38, z: 17, width: 2.6 },
    { x: -49, z: -4, width: 2.6 },
    { x: -60, z: -18, width: 2.8 },
    { x: -68, z: -28, width: 3.4 },
  ],
  // 5. Central trail north toward Giant Jack cloud vortex
  [
    { x: 4, z: 19, width: 2.8 },
    { x: 8, z: -2, width: 2.6 },
    { x: 12, z: -26, width: 2.6 },
    { x: 18, z: -42, width: 2.6 },
  ],
  // 6. Southern overlook spur toward Angel Bay mouth
  [
    { x: 4, z: 19, width: 2.8 },
    { x: -6, z: 30, width: 2.6 },
  ],
  // 7. Southwest spur into Shandora South Ruin Courtyards
  [
    { x: -62, z: 22, width: 2.6 },
    { x: -78, z: 34, width: 2.8 },
    { x: -94, z: 34, width: 2.6 },
  ],
];

export const SKYPIEA_BRIDGES: readonly SkypieaBridgeSpec[] = [
  // East river bridge near Angel Beach north road
  { x: 23, z: 20, y: 3.8, yaw: -0.45, length: 9.4, width: 3.2 },
  // Central-West river bridge toward Shandora Ruins
  { x: -12, z: 5.5, y: 4.1, yaw: 0.65, length: 9.0, width: 3.1 },
  // Pyramid approach river bridge
  { x: -49, z: -5.5, y: 4.5, yaw: 1.05, length: 9.2, width: 3.1 },
];

/**
 * Signed distance to the closest dirt/stone footpath (< 0 on road, > 0 off road).
 */
export function skypieaRoadSignedDist(x: number, z: number): number {
  let minD = 999;
  for (const poly of SKYPIEA_ROAD_PATHS) {
    for (let i = 0; i < poly.length - 1; i++) {
      const a = poly[i];
      const b = poly[i + 1];
      const seg = distToSegment(x, z, a.x, a.z, b.x, b.z);
      const w = a.width + (b.width - a.width) * seg.t;
      const d = seg.dist - w * 0.5;
      if (d < minD) minD = d;
    }
  }
  // Also include plaza clearings at Crossroads (4, 19) and Pyramid Forecourt (-68, -28)
  minD = Math.min(minD, Math.hypot(x - 4, z - 19) - 5.0);
  minD = Math.min(minD, Math.hypot(x + 68, z + 28) - 5.5);
  return minD;
}

/**
 * Signed distance to the main Skypiea landmass & satellite islets (< 0 on land, > 0 in cloud sea).
 */
export function skypieaCoastSignedDist(x: number, z: number): number {
  // Main oval landmass centered at (0, -4), slightly wider E-W
  const nx = x / 132;
  const nz = (z + 4) / 108;
  const ang = Math.atan2(nz, nx);
  const r = Math.hypot(nx, nz);

  const lobe =
    0.96 +
    0.05 * Math.cos(ang * 2 + 0.3) -
    0.04 * Math.sin(ang * 3 - 0.5) +
    0.03 * Math.cos(ang * 5 + 0.8);

  let d = (r - lobe) * 114;

  // Carve the iconic large southern circular Cloud Bay (Angel Bay)
  const bayDist = Math.hypot(x - ANGEL_BAY_CENTER.x, z - ANGEL_BAY_CENTER.z) - 43.5;
  if (bayDist < 0) {
    d = Math.max(d, -bayDist);
  }
  // Open southern mouth of Angel Bay
  const mouth = distToSegment(x, z, -2, 92, 4, 134);
  if (mouth.dist < 28) {
    d = Math.max(d, 26 - mouth.dist);
  }

  // Sculpt SE Angel Beach crescent tip curving toward Milky Road
  const seHook = distToSegment(x, z, 54, 88, 66, 114);
  d = Math.min(d, seHook.dist - (16 - seHook.t * 6));

  // Sculpt SW rocky peninsula curving below the ruins
  const swHook = distToSegment(x, z, -75, 76, -42, 102);
  d = Math.min(d, swHook.dist - 18);

  // Satellite Floating Islets matching skypea_6d53f3aa.jpg:
  // 1. NW Ruin Islet (top-left)
  d = Math.min(d, Math.hypot((x + 146) * 0.88, z + 106) - 13.5);
  // 2. NE Pyramid Islet (top-right)
  d = Math.min(d, Math.hypot((x - 136) * 0.9, z + 110) - 10.5);
  // 3. SW & South coastal islets
  d = Math.min(d, Math.hypot((x + 116) * 0.82, z - 86) - 11.0);
  d = Math.min(d, Math.hypot((x + 82) * 0.78, z - 106) - 10.0);
  d = Math.min(d, Math.hypot((x + 42) * 0.85, z - 118) - 7.5);
  d = Math.min(d, Math.hypot(x - 0, z - 113) - 4.2); // Tiny rock islet at bay mouth
  d = Math.min(d, Math.hypot((x - 98) * 0.76, z - 94) - 9.0); // SE flanking islet

  const coastNoise =
    (valueNoise2D(x * 0.05 + 4.1, z * 0.05 + 9.7) - 0.5) * 6.5;
  return d + coastNoise;
}

/**
 * Signed distance to Skypiea's meandering turquoise jungle rivers (< 0 inside water).
 */
export function skypieaRiverSignedDist(x: number, z: number): number {
  // Main trunk from Angel Bay NE shore (27, 36) -> (20, 14) -> central fork (2, 2)
  const r1 = distToSegment(x, z, 28, 38, 21, 14);
  const r2 = distToSegment(x, z, 21, 14, 2, 2);

  // NE Branch meandering toward Giant Jack cloud vortex
  const ne1 = distToSegment(x, z, 21, 14, 30, -14);
  const ne2 = distToSegment(x, z, 30, -14, 26, -42);

  // Central-North Branch past the volcanic jungle butte
  const cn1 = distToSegment(x, z, 2, 2, -16, -18);
  const cn2 = distToSegment(x, z, -16, -18, -22, -48);
  const cn3 = distToSegment(x, z, -22, -48, -28, -80);

  // West Branch curving past Shandora Pyramid
  const w1 = distToSegment(x, z, 2, 2, -26, 8);
  const w2 = distToSegment(x, z, -26, 8, -55, -10);
  const w3 = distToSegment(x, z, -55, -10, -76, -18);
  const w4 = distToSegment(x, z, -76, -18, -96, -26);

  let d = Math.min(
    r1.dist - 3.6,
    r2.dist - 3.0,
    ne1.dist - 2.4,
    ne2.dist - 2.3,
    cn1.dist - 2.5,
    cn2.dist - 2.3,
    cn3.dist - 2.0,
    w1.dist - 2.6,
    w2.dist - 2.6,
    w3.dist - 3.2,
    w4.dist - 2.1
  );

  // Subtle natural river meander
  const meander =
    Math.sin(x * 0.14 + z * 0.11) * 1.15 +
    (valueNoise2D(x * 0.08 + 2.3, z * 0.08 + 6.1) - 0.5) * 1.4;
  return d + meander;
}

/**
 * Continuous ramp climbing from the East jungle approach up to Upper Yard Golden Palace plateau.
 */
export function sampleUpperYardRamp(x: number, z: number): {
  weight: number;
  height: number;
} {
  // Ascent path from (66, 22) -> (94, -2) -> (100, -12) -> plateau edge (102, -18)
  const s1 = distToSegment(x, z, 68, 24, 94, -2);
  const s2 = distToSegment(x, z, 94, -2, 102, -16);
  const w1 = 1 - smoothstep(2.2, 4.4, s1.dist);
  const w2 = 1 - smoothstep(2.4, 4.8, s2.dist);
  const h1 = 5.2 + s1.t * 9.5;
  const h2 = 14.7 + s2.t * (UPPER_YARD_PLATEAU_Y - 14.7);

  if (w2 >= w1) {
    return { weight: w2, height: h2 };
  }
  return { weight: w1, height: h1 };
}

/**
 * Analytical terrain elevation groundHeightAt(x, z) across Skypiea.
 * Sea / Cloud-bay surface level is y = 0.0.
 */
export function sampleSkypieaHeight(x: number, z: number): number {
  const coastD = skypieaCoastSignedDist(x, z);
  const riverD = skypieaRiverSignedDist(x, z);

  // Off-island cloud sea shelf
  if (coastD >= 0) {
    const drop = smoothstep(0, 14, coastD);
    return -0.25 - drop * 3.8;
  }

  // Carved turquoise river channels (except under bridges where water flows beneath)
  if (riverD < 0) {
    const bankT = smoothstep(-2.6, 0, riverD);
    return -1.6 + bankT * 2.2;
  }

  const inland = Math.min(-coastD, riverD);

  // Smooth sandy beach slope around Angel Beach (east arc of Angel Bay)
  const bayR = Math.hypot(x - ANGEL_BAY_CENTER.x, z - ANGEL_BAY_CENTER.z);
  const isAngelBeachZone =
    x > 28 && x < 84 && z > 32 && z < 114 && bayR > 38 && bayR < 78;

  // Base island cliff rim rises briskly from coast (6..7m cliffs on rocky outer coasts, gentle 0.5..3m on Angel Beach)
  const beachBlend = isAngelBeachZone
    ? smoothstep(28, 42, x) * (1 - smoothstep(72, 84, x)) * smoothstep(32, 44, z)
    : 0;

  const rockyCoastRise = smoothstep(0, 7.5, -coastD) * 5.8;
  const gentleBeachRise = smoothstep(0, 14, -coastD) * 2.1;
  let h = rockyCoastRise * (1 - beachBlend) + gentleBeachRise * beachBlend;

  // River bank slope so terrain meets water seamlessly
  const riverBank = smoothstep(0, 4.5, riverD);
  h = h * (0.35 + 0.65 * riverBank);

  // Rolling lush jungle hills across interior
  const jungleHills =
    valueNoise2D(x * 0.032 + 3.4, z * 0.032 + 7.9) * 3.2 +
    ridgedFbm2D(x * 0.025 + 1.1, z * 0.025 + 5.2, 3) * 2.4;
  h += jungleHills * smoothstep(4, 16, inland) * (1 - beachBlend * 0.85);

  // 1. Upper Yard Steep Cliff Mesa (East side, matching "Upper Yard" banner in image)
  const uyDx = x - UPPER_YARD_CENTER.x;
  const uyDz = z - UPPER_YARD_CENTER.z;
  const uyR = Math.hypot(uyDx, uyDz);
  const uyAng = Math.atan2(uyDz, uyDx);
  const uyJagged =
    (ridgedFbm2D(Math.cos(uyAng) * 2.8 + 4.1, Math.sin(uyAng) * 2.8 + 8.3, 3) - 0.5) * 2.4;
  const uyEdge = UPPER_YARD_RADIUS + (uyR > UPPER_YARD_RADIUS - 2 ? uyJagged : 0);

  if (uyR <= UPPER_YARD_RADIUS - 3.5) {
    h = UPPER_YARD_PLATEAU_Y;
  } else if (uyR < uyEdge + 9) {
    const mesaT = 1 - smoothstep(UPPER_YARD_RADIUS - 3.5, uyEdge + 7.5, uyR);
    h = Math.max(h, h * (1 - mesaT) + UPPER_YARD_PLATEAU_Y * mesaT);
  }

  // Smooth uphill ascent path to Upper Yard
  const uyRamp = sampleUpperYardRamp(x, z);
  if (uyRamp.weight > 0.01) {
    h = h * (1 - uyRamp.weight) + uyRamp.height * uyRamp.weight;
  }

  // 2. North-Central Flat-Topped Jungle Butte (Volcanic cone with cloud collar)
  const butteR = Math.hypot(x - JUNGLE_BUTTE_CENTER.x, z - JUNGLE_BUTTE_CENTER.z);
  if (butteR < 19) {
    const butteT = 1 - smoothstep(5.5, 17.5, butteR);
    h = Math.max(h, h * (1 - butteT) + 19.5 * butteT);
  }

  // 3. Giant Jack Swirling Vortex Mound
  const jackR = Math.hypot(x - GIANT_JACK_CENTER.x, z - GIANT_JACK_CENTER.z);
  if (jackR < 26) {
    const jackT = 1 - smoothstep(8, 25, jackR);
    h = Math.max(h, h * (1 - jackT) + 10.5 * jackT);
  }

  // 4. Shandora Stepped Pyramid Terrace & Forecourt Plaza
  const pyrR = Math.hypot(
    x - SHANDORA_PYRAMID_CENTER.x,
    z - SHANDORA_PYRAMID_CENTER.z
  );
  if (pyrR < 24) {
    const t = 1 - smoothstep(14, 24, pyrR);
    h = h * (1 - t) + 7.2 * t;
  }

  // 5. Western Shandora Ruins Terraces (NW Circular Citadel & SW Courtyards)
  const nwRuinR = Math.hypot(x - SHANDORA_RUINS_NW.x, z - SHANDORA_RUINS_NW.z);
  if (nwRuinR < 26) {
    const t = 1 - smoothstep(15, 26, nwRuinR);
    h = h * (1 - t) + 11.2 * t;
  }
  const swRuinR = Math.hypot(x - SHANDORA_RUINS_SW.x, z - SHANDORA_RUINS_SW.z);
  if (swRuinR < 28) {
    const t = 1 - smoothstep(17, 28, swRuinR);
    h = h * (1 - t) + 7.8 * t;
  }

  // 6. Flatten Angel Beach village terrace gently so houses sit cleanly above tide
  if (isAngelBeachZone) {
    const roadDist = Math.abs(x - 62);
    const villageT =
      (1 - smoothstep(8, 18, roadDist)) *
      smoothstep(38, 48, z) *
      (1 - smoothstep(96, 108, z));
    h = h * (1 - villageT * 0.65) + 1.85 * (villageT * 0.65);
  }

  // 7. Gentle smoothing along dirt roads so human-scale walking is never bumpy
  const roadD = skypieaRoadSignedDist(x, z);
  if (roadD < 1.2 && riverD > 0.6 && uyRamp.weight < 0.25) {
    const roadSmooth = 1 - smoothstep(-0.2, 1.2, roadD);
    const avgH =
      (h +
        4.6) *
      0.5;
    // Only gentle leveling on non-cliff jungle paths
    if (uyR > uyEdge + 7 && x < 72) {
      h = h * (1 - roadSmooth * 0.45) + avgH * (roadSmooth * 0.45);
    }
  }

  return h;
}

/**
 * Returns walkable surface elevation including the Angel Beach wooden pier & circular platform
 * and the 3 jungle river bridges so human-scale walking stays flush on decks above water.
 */
export function sampleSkypieaWalkSurfaceHeight(x: number, z: number): number {
  let h = sampleSkypieaHeight(x, z);

  // Angel Beach Pier deck
  const pierSeg = distToSegment(
    x,
    z,
    ANGEL_PIER_START.x,
    ANGEL_PIER_START.z,
    ANGEL_PIER_END.x,
    ANGEL_PIER_END.z
  );
  if (pierSeg.dist < 1.2) {
    h = Math.max(h, 1.05);
  }
  // Circular pier end-platform
  if (Math.hypot(x - ANGEL_PIER_END.x, z - ANGEL_PIER_END.z) < 4.5) {
    h = Math.max(h, 1.08);
  }

  // Jungle river bridges
  for (const b of SKYPIEA_BRIDGES) {
    const dx = x - b.x;
    const dz = z - b.z;
    const cosY = Math.cos(b.yaw);
    const sinY = Math.sin(b.yaw);
    const localAlong = dx * cosY - dz * sinY;
    const localAcross = dx * sinY + dz * cosY;
    if (
      Math.abs(localAlong) <= b.length * 0.52 &&
      Math.abs(localAcross) <= b.width * 0.55
    ) {
      h = Math.max(h, b.y + 0.16);
    }
  }

  return h;
}

/**
 * Generates colorful Angel Beach houses & western Shandia village huts
 * matching the layout in skypea_6d53f3aa.jpg.
 */
export function buildSkypieaHouses(): SkypieaHouseSpec[] {
  const houses: SkypieaHouseSpec[] = [];

  const wallPalette = [0xf7f1e3, 0xfdf8ec, 0xefe3ce, 0xf4ece1];
  const roofPalette = [
    0xd65b4a, // Coral red
    0x3b86b8, // Sky azure
    0xe5a93c, // Sun ochre
    0x3a9d8f, // Seafoam teal
    0xc46943, // Terracotta
    0x5d76b8, // Cobalt
  ];

  // 1. Angel Beach crescent shoreline village (14 houses curving along both sides of the beach lane)
  const beachAnchors: Array<{ x: number; z: number; yaw: number; style: 'dome' | 'pitched' | 'cone' }> = [
    { x: 47, z: 42, yaw: -1.15, style: 'pitched' },
    { x: 63, z: 42, yaw: -1.35, style: 'dome' },
    { x: 54, z: 50, yaw: -1.42, style: 'pitched' },
    { x: 68, z: 53, yaw: -1.48, style: 'cone' },
    { x: 54, z: 60, yaw: -1.52, style: 'dome' },
    { x: 71, z: 64, yaw: -1.58, style: 'pitched' },
    // Central Pier Plaza Houses flanking the domed beach pavilion at (56, 70)
    { x: 71, z: 73, yaw: -1.66, style: 'dome' },
    { x: 56, z: 78, yaw: -1.72, style: 'pitched' },
    { x: 70, z: 82, yaw: -1.80, style: 'cone' },
    { x: 54, z: 86, yaw: -1.92, style: 'pitched' },
    { x: 68, z: 91, yaw: -2.02, style: 'dome' },
    { x: 51, z: 95, yaw: -2.14, style: 'pitched' },
    { x: 62, z: 100, yaw: -2.25, style: 'cone' },
    { x: 46, z: 103, yaw: -2.42, style: 'dome' },
  ];

  beachAnchors.forEach((a, i) => {
    const y = Math.max(0.75, sampleSkypieaHeight(a.x, a.z));
    const n = valueNoise2D(a.x * 0.4, a.z * 0.4);
    houses.push({
      id: `angel-house-${i}`,
      x: a.x,
      z: a.z,
      y,
      width: 2.7 + n * 0.85,
      depth: 2.5 + n * 0.75,
      height: 2.1 + n * 0.9,
      yaw: a.yaw,
      wallColor: wallPalette[i % wallPalette.length],
      roofColor: roofPalette[i % roofPalette.length],
      roofStyle: a.style,
      district: 'angel-beach',
    });
  });

  // 2. Western Shandia / Jungle Clearing sky huts nestled beside the ruins plaza
  const shandiaAnchors: Array<{ x: number; z: number; yaw: number }> = [
    { x: -75, z: 15, yaw: 0.4 },
    { x: -82, z: 12, yaw: 0.9 },
    { x: -89, z: 14, yaw: 1.4 },
    { x: -72, z: 27, yaw: -0.6 },
    { x: -83, z: 28, yaw: 2.1 },
    { x: -91, z: 27, yaw: 1.9 },
  ];

  shandiaAnchors.forEach((a, i) => {
    const y = Math.max(2.0, sampleSkypieaHeight(a.x, a.z));
    houses.push({
      id: `shandia-hut-${i}`,
      x: a.x,
      z: a.z,
      y,
      width: 2.6,
      depth: 2.6,
      height: 2.0 + (i % 2) * 0.45,
      yaw: a.yaw,
      wallColor: 0xe8d9be,
      roofColor: i % 2 === 0 ? 0x6fa863 : 0xd69643,
      roofStyle: 'cone',
      district: 'shandia',
    });
  });

  return houses;
}

/**
 * Generates dense tropical jungle canopy trees + Angel Beach palm trees
 * strictly clear of all dirt paths, rivers, beaches, cliff walls, and plazas.
 */
export function buildSkypieaTrees(): SkypieaTreeSpec[] {
  const trees: SkypieaTreeSpec[] = [];
  const houses = buildSkypieaHouses();

  // 1. Dense Jungle Canopy across the green interior (grid + organic jitter)
  for (let gx = -126; gx <= 122; gx += 7.2) {
    for (let gz = -104; gz <= 98; gz += 7.2) {
      const jx = (valueNoise2D(gx * 0.31 + 1.7, gz * 0.31 + 5.2) - 0.5) * 5.2;
      const jz = (valueNoise2D(gz * 0.37 + 8.1, gx * 0.37 + 2.4) - 0.5) * 5.2;
      const x = gx + jx;
      const z = gz + jz;

      const coastD = skypieaCoastSignedDist(x, z);
      if (coastD > -4.5) continue;

      const riverD = skypieaRiverSignedDist(x, z);
      if (riverD < 2.3) continue;

      const roadD = skypieaRoadSignedDist(x, z);
      if (roadD < 2.4) continue;

      // Exclude Angel Beach sandy crescent & bay
      const bayR = Math.hypot(x - ANGEL_BAY_CENTER.x, z - ANGEL_BAY_CENTER.z);
      if (bayR < 49) continue;
      if (x > 34 && x < 74 && z > 36 && z < 108) continue;

      // Exclude Upper Yard Golden Palace plateau & stairs
      if (Math.hypot(x - UPPER_YARD_CENTER.x, z - UPPER_YARD_CENTER.z) < 28) continue;

      // Exclude Giant Jack inner vortex eye
      if (Math.hypot(x - GIANT_JACK_CENTER.x, z - GIANT_JACK_CENTER.z) < 22) continue;

      // Exclude Shandora Pyramid & Ruins courtyards
      if (Math.hypot(x - SHANDORA_PYRAMID_CENTER.x, z - SHANDORA_PYRAMID_CENTER.z) < 18) continue;
      if (Math.hypot(x - SHANDORA_RUINS_NW.x, z - SHANDORA_RUINS_NW.z) < 18) continue;
      if (Math.hypot(x - SHANDORA_RUINS_SW.x, z - SHANDORA_RUINS_SW.z) < 17) continue;

      // Exclude Jungle Butte steep peak
      if (Math.hypot(x - JUNGLE_BUTTE_CENTER.x, z - JUNGLE_BUTTE_CENTER.z) < 11) continue;

      // Exclude house footprints
      let nearHouse = false;
      for (const h of houses) {
        if (Math.hypot(x - h.x, z - h.z) < 4.5) {
          nearHouse = true;
          break;
        }
      }
      if (nearHouse) continue;

      const y = sampleSkypieaHeight(x, z);
      if (y < 1.2) continue;

      const n = valueNoise2D(x * 0.5, z * 0.5);
      trees.push({
        x,
        z,
        y,
        scale: 0.78 + n * 0.62,
        hueShift: n,
        kind: 'jungle',
        yaw: n * Math.PI * 2,
      });
    }
  }

  // 2. Angel Beach Coastal Palms lining the sandy shore & road edge
  const palmCoords: Array<[number, number]> = [
    [47, 42], [49, 53], [48, 63], [52, 74], [49, 85], [46, 95],
    [68, 46], [70, 58], [71, 70], [70, 82], [68, 94], [62, 106],
    [76, 62], [75, 76], [74, 88], [44, 102],
  ];
  palmCoords.forEach(([px, pz], idx) => {
    const y = Math.max(0.6, sampleSkypieaHeight(px, pz));
    trees.push({
      x: px,
      z: pz,
      y,
      scale: 0.9 + (idx % 3) * 0.16,
      hueShift: 0.5,
      kind: 'palm',
      yaw: (idx * 1.37) % (Math.PI * 2),
    });
  });

  return trees;
}

export const SKYPIEA_CAMERA_PRESETS: SkypieaCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle: 'Skypiea complète · Mer Blanche-Blanche',
    position: [-14, 206, 242],
    target: [12, 6, 4],
    isStreetView: false,
  },
  {
    id: 'angel-beach-street',
    label: 'Angel Beach · Maisons',
    subtitle: 'Point de vue humain sur la plage et les maisons',
    position: [50.5, 2.9, 86.0],
    target: [57.0, 2.7, 68.0],
    isStreetView: true,
  },
  {
    id: 'angel-pier',
    label: 'Ponton & Baie',
    subtitle: 'Vue piéton depuis la jetée sur la baie céleste',
    position: [43.5, 2.5, 72.5],
    target: [24.0, 1.8, 80.0],
    isStreetView: true,
  },
  {
    id: 'jungle-path',
    label: 'Chemin de la Jungle',
    subtitle: 'Sentier, ponts et rivières au niveau humain',
    position: [30.5, 6.2, 24.5],
    target: [12.0, 5.2, 18.0],
    isStreetView: true,
  },
  {
    id: 'upper-yard-palace',
    label: 'Upper Yard · Palais d’Or',
    subtitle: 'Escaliers & sanctuaire doré sur la falaise',
    position: [83.5, 26.2, -1.5],
    target: [102.0, 29.2, -24.0],
    isStreetView: true,
  },
  {
    id: 'shandora-pyramid',
    label: 'Pyramide Shandora',
    subtitle: 'Parvis, degrés de pierre et rivière ouest',
    position: [-58.5, 9.2, -16.0],
    target: [-76.0, 14.0, -38.0],
    isStreetView: true,
  },
  {
    id: 'shandora-ruins',
    label: 'Ruines de Shandora',
    subtitle: 'Cité antique envahie par la jungle',
    position: [-94.0, 10.6, 20.5],
    target: [-107.0, 12.2, -6.0],
    isStreetView: true,
  },
  {
    id: 'giant-jack',
    label: 'Giant Jack · Vortex',
    subtitle: 'Haricot géant & tourbillon de nuages',
    position: [12.0, 16.5, -24.0],
    target: [28.0, 22.0, -64.0],
    isStreetView: false,
  },
];
