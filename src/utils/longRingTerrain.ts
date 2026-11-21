import { valueNoise2D } from './globeMath';

export const LONG_RING_WORLD_SIZE = 240;
export const LONG_RING_GLOBE_SCALE = 0.002;
export const LONG_RING_GLOBE_CENTER = { u: 0.72, v: 0.495 } as const;
/**
 * 0.026 rad (+ 0.015 blend) covers the 240m circular archipelago cleanly while
 * staying >3.5x clear of Weatheria (~0.145 rad) and Harahettania (~0.166 rad).
 */
export const LONG_RING_ANGULAR_MASK_RADIUS = 0.026;
/**
 * Aligns Long Ring Long Land's beaches and submerged ring shoals with the ocean sphere.
 * Ocean surface (GLOBE_RADIUS) sits at local height y = +1.15m.
 */
export const LONG_RING_SPHERE_SEA_OFFSET = -1.15;
export const LONG_RING_SEA_LEVEL_Y = 1.15;
export const LONG_RING_RING_RADIUS = 64.0;

export interface LongRingLobeSpec {
  index: number;
  id: string;
  name: string;
  angle: number;
  cx: number;
  cz: number;
  rx: number;
  rz: number;
  peakBoost: number;
}

export interface LongRingTreeSpec {
  id: string;
  kind: 'cypress-tall' | 'savanna-tall' | 'bamboo';
  x: number;
  z: number;
  y: number;
  scale: number;
  heightScale: number;
  yaw: number;
  tint: number;
}

export interface LongRingPropSpec {
  id: string;
  kind: 'shelly-dog' | 'long-bird' | 'boulder' | 'campfire' | 'crate-barrel';
  x: number;
  z: number;
  y: number;
  scale: number;
  yaw: number;
}

export interface LongRingCameraPreset {
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

/**
 * Ten distinct circular island lobes distributed around R = 64m.
 * Index 0: Tonjit's Main Island (SSW front)
 * Index 1: Foxy Boxing Arena & Harbor Pier Island (SSE neighbor)
 */
const LOBE_METADATA: readonly {
  id: string;
  name: string;
  rx: number;
  rz: number;
  peakBoost: number;
}[] = [
  { id: 'lobe-0-tonjit', name: 'Île Principale de Tonjit', rx: 16.0, rz: 14.8, peakBoost: 1.55 },
  { id: 'lobe-1-arena', name: "Île de l'Arène & du Sexy Foxy", rx: 16.2, rz: 15.0, peakBoost: 1.4 },
  { id: 'lobe-2-east-south', name: 'Îlot du Récif Est-Sud', rx: 14.2, rz: 13.6, peakBoost: 1.85 },
  { id: 'lobe-3-east', name: 'Îlot des Hautes Plaines Est', rx: 14.6, rz: 13.9, peakBoost: 2.15 },
  { id: 'lobe-4-north-east', name: 'Îlot des Bambous Allongés', rx: 14.0, rz: 14.2, peakBoost: 1.9 },
  { id: 'lobe-5-north', name: 'Colline Nord des Cyprès Géants', rx: 15.4, rz: 14.4, peakBoost: 2.45 },
  { id: 'lobe-6-north-west', name: 'Îlot de la Prairie Nord-Ouest', rx: 14.2, rz: 13.8, peakBoost: 1.75 },
  { id: 'lobe-7-west-north', name: 'Îlot du Couchant', rx: 14.4, rz: 13.6, peakBoost: 2.0 },
  { id: 'lobe-8-west', name: 'Îlot de la Lagune Ouest', rx: 14.0, rz: 14.4, peakBoost: 1.7 },
  { id: 'lobe-9-south-west', name: 'Îlot de Shelly & Pâturages', rx: 15.0, rz: 14.2, peakBoost: 1.65 },
];

export const LONG_RING_ISLAND_LOBES: readonly LongRingLobeSpec[] = LOBE_METADATA.map(
  (meta, index) => {
    const angle = 1.76 - index * ((Math.PI * 2) / 10);
    return {
      index,
      id: meta.id,
      name: meta.name,
      angle,
      cx: Number((Math.cos(angle) * LONG_RING_RING_RADIUS).toFixed(2)),
      cz: Number((Math.sin(angle) * LONG_RING_RING_RADIUS).toFixed(2)),
      rx: meta.rx,
      rz: meta.rz,
      peakBoost: meta.peakBoost,
    };
  }
);

const TONJIT_LOBE = LONG_RING_ISLAND_LOBES[0];
const ARENA_LOBE = LONG_RING_ISLAND_LOBES[1];

export const LONG_RING_TONJIT_HOUSE = {
  x: TONJIT_LOBE.cx - 0.2,
  z: TONJIT_LOBE.cz - 0.2,
  groundY: 2.95,
  stiltHeight: 5.8,
  yaw: 0.26,
} as const;

export const LONG_RING_BOXING_ARENA = {
  x: ARENA_LOBE.cx - 1.4,
  z: ARENA_LOBE.cz + 0.4,
  groundY: 2.65,
  platformSize: 6.8,
  platformHeight: 0.92,
  yaw: -0.32,
} as const;

// Wooden landing jetty extending from Arena island's inner lagoon cove toward the Sexy Foxy
export const LONG_RING_FOXY_PIER = {
  startX: ARENA_LOBE.cx - 1.6,
  startZ: ARENA_LOBE.cz - 13.2,
  endX: ARENA_LOBE.cx - 4.4,
  endZ: ARENA_LOBE.cz - 20.6,
  deckY: 2.35,
} as const;

// Foxy's Flagship moored in deep lagoon water clearly north of Lobe 1's northern jetty
export const LONG_RING_FOXY_SHIP = {
  name: 'Sexy Foxy',
  x: 7.5,
  z: 29.5,
  y: LONG_RING_SEA_LEVEL_Y,
  length: 20.0,
  beam: 5.4,
  collisionRadius: 10.8,
  yaw: 1.48, // bow pointed East across the lagoon cove so fox figurehead & starboard broadside frame cleanly from the jetty
} as const;

// Footpaths on Lobe 0 (Tonjit), Lobe 1 (Arena -> Sexy Foxy Pier), and scenic lobes
export const LONG_RING_FOOTPATHS: readonly (readonly [number, number][])[] = [
  // Lobe 0: Lagoon sandy shore -> Shelly's pasture -> Tonjit's Stilt Cabin -> Western bluff -> South beach
  [
    [TONJIT_LOBE.cx + 2.5, TONJIT_LOBE.cz - 12.2],
    [TONJIT_LOBE.cx + 2.2, TONJIT_LOBE.cz - 6.0],
    [TONJIT_LOBE.cx + 2.6, TONJIT_LOBE.cz + 0.4],
    [TONJIT_LOBE.cx - 1.8, TONJIT_LOBE.cz + 5.8],
    [TONJIT_LOBE.cx - 0.8, TONJIT_LOBE.cz + 12.4],
  ],
  // Spur right under Tonjit's house ladder
  [
    [TONJIT_LOBE.cx + 2.4, TONJIT_LOBE.cz + 0.2],
    [LONG_RING_TONJIT_HOUSE.x + 2.2, LONG_RING_TONJIT_HOUSE.z + 0.2],
  ],
  // Lobe 1: West beach -> Boxing Arena -> Northern Lagoon Jetty -> Sexy Foxy
  [
    [ARENA_LOBE.cx - 11.8, ARENA_LOBE.cz + 2.4],
    [ARENA_LOBE.cx - 6.2, ARENA_LOBE.cz + 1.2],
    [LONG_RING_BOXING_ARENA.x, LONG_RING_BOXING_ARENA.z],
    [ARENA_LOBE.cx - 1.0, ARENA_LOBE.cz - 7.0],
    [LONG_RING_FOXY_PIER.startX, LONG_RING_FOXY_PIER.startZ],
  ],
  // Lobe 1 south cove spur
  [
    [LONG_RING_BOXING_ARENA.x + 1.5, LONG_RING_BOXING_ARENA.z + 1.0],
    [ARENA_LOBE.cx + 5.5, ARENA_LOBE.cz + 5.8],
    [ARENA_LOBE.cx + 8.5, ARENA_LOBE.cz + 11.5],
  ],
  // Lobe 9 meadow trail
  [
    [LONG_RING_ISLAND_LOBES[9].cx + 8.0, LONG_RING_ISLAND_LOBES[9].cz + 4.0],
    [LONG_RING_ISLAND_LOBES[9].cx, LONG_RING_ISLAND_LOBES[9].cz],
    [LONG_RING_ISLAND_LOBES[9].cx - 7.5, LONG_RING_ISLAND_LOBES[9].cz - 5.2],
  ],
  // Lobe 5 northern cypress hill trail
  [
    [LONG_RING_ISLAND_LOBES[5].cx - 8.2, LONG_RING_ISLAND_LOBES[5].cz + 3.5],
    [LONG_RING_ISLAND_LOBES[5].cx, LONG_RING_ISLAND_LOBES[5].cz],
    [LONG_RING_ISLAND_LOBES[5].cx + 8.5, LONG_RING_ISLAND_LOBES[5].cz - 3.0],
  ],
];

export function longRingPathSignedDist(x: number, z: number): number {
  let minD = Infinity;
  for (const path of LONG_RING_FOOTPATHS) {
    const d = distToPolyline2D(x, z, path) - 1.25;
    if (d < minD) minD = d;
  }
  return minD;
}

/**
 * Signed distance to the nearest of the 10 rounded island lobes (< 0 inside island footprint).
 */
export function longRingLobesSignedDist(x: number, z: number): {
  sd: number;
  nearestIndex: number;
} {
  let bestSd = Infinity;
  let nearestIndex = 0;

  // Compute minor coastal irregularity shared consistently across lobes
  const coastRipple =
    (valueNoise2D(x * 0.14 + 3.1, z * 0.14 - 1.9) - 0.5) * 1.9 +
    (valueNoise2D(x * 0.31 - 1.4, z * 0.31 + 2.7) - 0.5) * 0.7;

  for (let i = 0; i < LONG_RING_ISLAND_LOBES.length; i++) {
    const lobe = LONG_RING_ISLAND_LOBES[i];
    const sd = ellipseSd(x, z, lobe.cx, lobe.cz, lobe.rx, lobe.rz) + coastRipple;
    if (sd < bestSd) {
      bestSd = sd;
      nearestIndex = i;
    }
  }
  return { sd: bestSd, nearestIndex };
}

/**
 * Signed distance to the continuous circular submerged ring band connecting all 10 islands
 * (< 0 inside the submerged ring bridge).
 */
export function longRingSubmergedBandSignedDist(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const wiggle = (valueNoise2D(x * 0.08 + 1.2, z * 0.08 - 4.1) - 0.5) * 2.2;
  return Math.abs(r - LONG_RING_RING_RADIUS) - 7.8 + wiggle;
}

/**
 * Continuous heightmap in local island coordinates (sea level = +1.15m):
 * - Deep lagoon & outer sea: -4.8m
 * - Submerged underwater connecting ring saddle between the 10 islands: -0.35m (1.5m below water)
 * - Sandy coastal beaches: +1.15m .. +2.15m
 * - Sunlit grassy plains & rounded hills: +2.25m .. +5.4m
 */
export function sampleLongRingHeight(x: number, z: number): number {
  const { sd, nearestIndex } = longRingLobesSignedDist(x, z);
  const ringBandSd = longRingSubmergedBandSignedDist(x, z);

  const oceanWaveBed =
    -4.8 + (valueNoise2D(x * 0.07 + 2.2, z * 0.07 + 0.8) - 0.5) * 0.25;

  // Submerged connecting isthmus ring between adjacent islands (-0.32m below sea level +1.15m)
  const submergedT = 1 - smoothstep(-2.0, 5.2, ringBandSd);
  const saddleBase = oceanWaveBed * (1 - submergedT) + (-0.32) * submergedT;

  // Wide gentle coastal slope: gradual sandy shoal -> broad sunny beach -> low coastal plain
  const coastMask = 1 - smoothstep(-5.0, 3.2, sd);
  if (coastMask <= 0.005) {
    return saddleBase;
  }

  const shelfT = smoothstep(0.02, 0.42, coastMask);
  const beachPlaneT = smoothstep(0.32, 0.72, coastMask);
  const meadowT = smoothstep(0.54, 0.92, coastMask);
  const interiorT = smoothstep(0.72, 1.0, coastMask);

  const lobe = LONG_RING_ISLAND_LOBES[nearestIndex];
  const hillNoise =
    valueNoise2D(x * 0.08 + 4.3, z * 0.08 - 2.6) * 1.15 +
    valueNoise2D(x * 0.19 - 1.8, z * 0.19 + 3.4) * 0.42;

  let h =
    saddleBase +
    shelfT * (1.16 - saddleBase) +
    beachPlaneT * 0.62 +
    meadowT * 0.78 +
    interiorT * (lobe.peakBoost * 0.65 + hillNoise * 0.75);

  // Grade Tonjit's House & Shelly's adjacent pasture cleanly flat around groundY = 2.95m
  const tonjitDist = Math.hypot(
    x - LONG_RING_TONJIT_HOUSE.x,
    z - LONG_RING_TONJIT_HOUSE.z
  );
  if (tonjitDist < 10.5 && coastMask > 0.35) {
    const tFlat = 1 - smoothstep(6.2, 10.5, tonjitDist);
    h = h * (1 - tFlat * 0.94) + LONG_RING_TONJIT_HOUSE.groundY * (tFlat * 0.94);
  }

  // Grade Boxing Arena plain on Lobe 1 cleanly flat around groundY = 2.65m
  const arenaDist = Math.hypot(
    x - LONG_RING_BOXING_ARENA.x,
    z - LONG_RING_BOXING_ARENA.z
  );
  if (arenaDist < 12.0 && coastMask > 0.35) {
    const aFlat = 1 - smoothstep(6.2, 12.0, arenaDist);
    h = h * (1 - aFlat * 0.94) + LONG_RING_BOXING_ARENA.groundY * (aFlat * 0.94);
  }

  // Gently grade compacted dirt footpaths so walking feels smooth
  const pDist = longRingPathSignedDist(x, z);
  if (pDist < 1.2 && coastMask > 0.38) {
    const pT = 1 - smoothstep(-0.3, 1.2, pDist);
    const clampedRoad = clamp(h, 2.25, 3.85);
    h = h * (1 - pT * 0.55) + clampedRoad * (pT * 0.55);
  }

  return h;
}

/**
 * Walkable height including Foxy's Lagoon Pier and Boxing Arena ring platform edges.
 */
export function sampleLongRingWalkSurfaceHeight(x: number, z: number): number {
  let h = sampleLongRingHeight(x, z);

  const pierDist = distToSegment2D(
    x,
    z,
    LONG_RING_FOXY_PIER.startX,
    LONG_RING_FOXY_PIER.startZ,
    LONG_RING_FOXY_PIER.endX,
    LONG_RING_FOXY_PIER.endZ
  );
  if (pierDist <= 1.45) {
    h = Math.max(h, LONG_RING_FOXY_PIER.deckY);
  }

  const dxA = x - LONG_RING_BOXING_ARENA.x;
  const dzA = z - LONG_RING_BOXING_ARENA.z;
  const halfArena = LONG_RING_BOXING_ARENA.platformSize * 0.5;
  if (Math.abs(dxA) <= halfArena + 0.6 && Math.abs(dzA) <= halfArena + 0.6) {
    h = Math.max(
      h,
      LONG_RING_BOXING_ARENA.groundY + LONG_RING_BOXING_ARENA.platformHeight
    );
  }

  return h;
}

/**
 * Transform local Long Ring coordinates (meters: East=+X, Altitude=+Y, South=+Z)
 * into spherical curved local coordinates attached to the globe radius.
 */
export function toLongRingSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius: number
): { x: number; y: number; z: number } {
  const S = LONG_RING_GLOBE_SCALE;
  const wx = x * S;
  const wz = z * S;
  const r = globeRadius + (y + LONG_RING_SPHERE_SEA_OFFSET) * S;
  const len = Math.sqrt(wx * wx + globeRadius * globeRadius + wz * wz);
  const k = r / len;
  return {
    x: wx * k,
    y: globeRadius * k - globeRadius,
    z: wz * k,
  };
}

function isTreeClearZone(x: number, z: number): boolean {
  if (Math.hypot(x - LONG_RING_TONJIT_HOUSE.x, z - LONG_RING_TONJIT_HOUSE.z) < 7.2) {
    return true;
  }
  if (
    Math.hypot(
      x - (LONG_RING_TONJIT_HOUSE.x + 4.0),
      z - (LONG_RING_TONJIT_HOUSE.z - 2.4)
    ) < 5.2
  ) {
    return true;
  }
  if (
    Math.hypot(
      x - (LONG_RING_TONJIT_HOUSE.x + 8.6),
      z - (LONG_RING_TONJIT_HOUSE.z + 4.2)
    ) < 4.5
  ) {
    return true;
  }
  if (
    Math.hypot(x - (TONJIT_LOBE.cx + 8.6), z - (TONJIT_LOBE.cz - 7.8)) < 3.4
  ) {
    return true;
  }
  if (Math.hypot(x - LONG_RING_BOXING_ARENA.x, z - LONG_RING_BOXING_ARENA.z) < 11.2) {
    return true;
  }
  if (longRingPathSignedDist(x, z) < 1.9) {
    return true;
  }
  const pierD = distToSegment2D(
    x,
    z,
    LONG_RING_FOXY_PIER.startX,
    LONG_RING_FOXY_PIER.startZ,
    LONG_RING_FOXY_PIER.endX,
    LONG_RING_FOXY_PIER.endZ
  );
  if (pierD < 3.6) return true;
  if (Math.hypot(x - 28.5, z - 45.8) < 3.8) return true;
  return false;
}

function buildLongRingTrees(): LongRingTreeSpec[] {
  const trees: LongRingTreeSpec[] = [];
  let idx = 0;

  for (const lobe of LONG_RING_ISLAND_LOBES) {
    // 14-18 ultra-tall stretched trees per island lobe for authentic skyline silhouette
    const perLobeCount = lobe.index === 5 ? 20 : 15;
    for (let k = 0; k < perLobeCount; k++) {
      const h1 = valueNoise2D(lobe.cx * 0.37 + k * 2.13, lobe.cz * 0.41 - k * 1.71);
      const h2 = valueNoise2D(lobe.cx * 0.59 - k * 1.37, lobe.cz * 0.29 + k * 2.89);
      const angle = k * 2.39996 + h1 * 1.1;
      const radFrac = 0.24 + 0.54 * Math.sqrt(((k + 0.5) / perLobeCount));
      const x = lobe.cx + Math.cos(angle) * (lobe.rx * radFrac * 0.86);
      const z = lobe.cz + Math.sin(angle) * (lobe.rz * radFrac * 0.86);

      if (isTreeClearZone(x, z)) continue;
      const groundH = sampleLongRingHeight(x, z);
      if (groundH < 2.2) continue;

      const kindRoll = (k + Math.round(h2 * 10)) % 5;
      const kind: LongRingTreeSpec['kind'] =
        kindRoll === 0 ? 'savanna-tall' : kindRoll === 4 ? 'bamboo' : 'cypress-tall';

      trees.push({
        id: `lr-tree-${idx++}`,
        kind,
        x: Number(x.toFixed(2)),
        z: Number(z.toFixed(2)),
        y: Number((groundH - 0.12).toFixed(2)),
        scale: Number((0.85 + h1 * 0.38).toFixed(2)),
        heightScale: Number((0.92 + h2 * 0.48).toFixed(2)),
        yaw: Number((h1 * Math.PI * 2).toFixed(2)),
        tint: Number((0.86 + h2 * 0.28).toFixed(2)),
      });
    }
  }

  return trees;
}

export const LONG_RING_TREES: readonly LongRingTreeSpec[] = buildLongRingTrees();

function groundProp(
  id: string,
  kind: LongRingPropSpec['kind'],
  x: number,
  z: number,
  scale = 1,
  yaw = 0
): LongRingPropSpec {
  return {
    id,
    kind,
    x,
    z,
    y: Number((sampleLongRingHeight(x, z) - 0.04).toFixed(2)),
    scale,
    yaw,
  };
}

export const LONG_RING_PROPS: readonly LongRingPropSpec[] = [
  // Shelly (ultra-long white horse/dachshund) standing cleanly beside the meadow path near Tonjit's house
  groundProp(
    'shelly-main',
    'shelly-dog',
    LONG_RING_TONJIT_HOUSE.x + 4.0,
    LONG_RING_TONJIT_HOUSE.z - 2.4,
    1.0,
    -0.38
  ),
  // Stretched Long-Bird flapping near Tonjit's meadow clearing
  groundProp(
    'long-bird-tonjit',
    'long-bird',
    TONJIT_LOBE.cx - 4.2,
    TONJIT_LOBE.cz - 3.6,
    1.0,
    0.75
  ),
  // Second Shelly/Long-Dog grazing on SW neighboring Lobe 9
  groundProp(
    'shelly-pasture',
    'shelly-dog',
    LONG_RING_ISLAND_LOBES[9].cx + 1.8,
    LONG_RING_ISLAND_LOBES[9].cz + 1.2,
    0.92,
    1.1
  ),
  // Tonjit's Nomad Campfire & supply crates beside his stilt ladder
  groundProp(
    'tonjit-campfire',
    'campfire',
    LONG_RING_TONJIT_HOUSE.x - 2.8,
    LONG_RING_TONJIT_HOUSE.z + 2.2,
    0.95,
    0.2
  ),
  groundProp(
    'tonjit-crates',
    'crate-barrel',
    LONG_RING_TONJIT_HOUSE.x + 1.4,
    LONG_RING_TONJIT_HOUSE.z + 2.7,
    1.0,
    0.4
  ),
  // Boxing Arena corner crates/barrels & supplies
  groundProp(
    'arena-crates-w',
    'crate-barrel',
    LONG_RING_BOXING_ARENA.x - 5.2,
    LONG_RING_BOXING_ARENA.z - 3.2,
    1.05,
    0.35
  ),
  groundProp(
    'arena-crates-e',
    'crate-barrel',
    LONG_RING_BOXING_ARENA.x + 5.1,
    LONG_RING_BOXING_ARENA.z + 2.9,
    1.0,
    -0.6
  ),
  // Harbor jetty supply barrels waiting to load onto the Sexy Foxy
  groundProp(
    'pier-crates',
    'crate-barrel',
    LONG_RING_FOXY_PIER.startX + 1.8,
    LONG_RING_FOXY_PIER.startZ - 0.6,
    1.0,
    0.15
  ),
  // Coastal boulders tucked onto various ring lobes
  groundProp('boulder-0', 'boulder', TONJIT_LOBE.cx - 9.4, TONJIT_LOBE.cz - 5.8, 1.15, 0.6),
  groundProp('boulder-1', 'boulder', ARENA_LOBE.cx + 9.2, ARENA_LOBE.cz - 3.0, 1.25, 1.4),
  groundProp(
    'boulder-2',
    'boulder',
    LONG_RING_ISLAND_LOBES[3].cx + 6.0,
    LONG_RING_ISLAND_LOBES[3].cz + 4.5,
    1.3,
    2.1
  ),
  groundProp(
    'boulder-3',
    'boulder',
    LONG_RING_ISLAND_LOBES[5].cx - 6.8,
    LONG_RING_ISLAND_LOBES[5].cz - 5.2,
    1.35,
    0.9
  ),
  groundProp(
    'boulder-4',
    'boulder',
    LONG_RING_ISLAND_LOBES[7].cx + 5.5,
    LONG_RING_ISLAND_LOBES[7].cz - 6.0,
    1.2,
    1.7
  ),
];

function camAtGround(lx: number, lz: number, eyeHeight = 1.75): [number, number, number] {
  const groundY = sampleLongRingWalkSurfaceHeight(lx, lz);
  return [
    Number(lx.toFixed(2)),
    Number((groundY + eyeHeight).toFixed(2)),
    Number(lz.toFixed(2)),
  ];
}

export const LONG_RING_CAMERA_PRESETS: readonly LongRingCameraPreset[] = [
  {
    id: 'overview',
    label: 'Archipel en Anneau (10 Îles)',
    subtitle: 'Les 10 îles circulaires séparées à marée haute & plateau submergé',
    position: [12, 132, 152],
    target: [2, 2, 10],
    isStreetView: false,
  },
  {
    id: 'tonjit-house',
    label: 'Maison sur Pilotis de Tonjit',
    subtitle: 'Vue humaine (1,75 m) · Cabane perchée, Shelly & sentier côtier',
    position: camAtGround(LONG_RING_TONJIT_HOUSE.x + 11.4, LONG_RING_TONJIT_HOUSE.z + 5.2, 1.75),
    target: [LONG_RING_TONJIT_HOUSE.x + 1.8, LONG_RING_TONJIT_HOUSE.groundY + 3.8, LONG_RING_TONJIT_HOUSE.z - 0.4],
    isStreetView: true,
  },
  {
    id: 'tall-trees-plain',
    label: 'Plaines & Arbres Géants',
    subtitle: 'Vue humaine (1,75 m) · Arbres très allongés, herbes vertes & Shelly',
    position: camAtGround(TONJIT_LOBE.cx + 8.6, TONJIT_LOBE.cz - 7.8, 1.75),
    target: [TONJIT_LOBE.cx - 4.0, 5.2, LONG_RING_ISLAND_LOBES[5].cz * 0.45],
    isStreetView: true,
  },
  {
    id: 'boxing-arena',
    label: 'Arène de Boxe Luffy vs Foxy',
    subtitle: 'Vue humaine (1,75 m) · Ring de combat sur la plaine de l’île voisine',
    position: camAtGround(LONG_RING_BOXING_ARENA.x - 9.0, LONG_RING_BOXING_ARENA.z + 6.4, 1.75),
    target: [LONG_RING_BOXING_ARENA.x, LONG_RING_BOXING_ARENA.groundY + 1.8, LONG_RING_BOXING_ARENA.z],
    isStreetView: true,
  },
  {
    id: 'sexy-foxy',
    label: 'Navire Amiral Sexy Foxy',
    subtitle: 'Vue humaine (1,75 m) · Sur l’embarcadère face à la proue renard',
    position: camAtGround(28.5, 45.8, 1.75),
    target: [13.8, LONG_RING_SEA_LEVEL_Y + 4.8, 30.2],
    isStreetView: true,
  },
];
