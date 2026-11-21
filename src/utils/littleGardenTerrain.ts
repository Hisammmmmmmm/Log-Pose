import { valueNoise2D } from './globeMath';

export const LITTLE_GARDEN_WORLD_SIZE = 220;
export const LITTLE_GARDEN_GLOBE_SCALE = 0.002;
export const LITTLE_GARDEN_GLOBE_CENTER = { u: 0.570, v: 0.486 } as const;
/**
 * Kept cleanly at 0.024 rad (+ 0.014 blend < 0.045 rad to Kyuka Island)
 * so Little Garden never overlaps neighboring Paradise islands.
 */
export const LITTLE_GARDEN_ANGULAR_MASK_RADIUS = 0.024;
/**
 * Aligns Little Garden's sandy shoreline & shallow reef cleanly with the
 * globe's ocean surface mesh chord near the equator.
 */
export const LITTLE_GARDEN_SPHERE_SEA_OFFSET = -1.15;

export const LITTLE_GARDEN_SHORE_Y = 1.4;
export const LITTLE_GARDEN_JUNGLE_FLOOR_Y = 2.8;
export const LITTLE_GARDEN_LAKE_WATER_Y = 2.05;
export const LITTLE_GARDEN_LAKE_BED_Y = 1.25;
export const LITTLE_GARDEN_MR3_CLEARING_Y = 3.15;

export interface LittleGardenSkeletonSpec {
  id: 'skeleton-nw' | 'skeleton-se';
  /** Center position of skeleton along its ribcage midpoint. */
  x: number;
  z: number;
  /** Orientation angle in XZ plane (radians): skull sits at -length/2 along local axis. */
  yaw: number;
  length: number;
  width: number;
  height: number;
  ribPairs: number;
}

export interface LittleGardenVolcanoSpec {
  id: string;
  x: number;
  z: number;
  baseRadius: number;
  height: number;
  craterRadius: number;
  ridgeCount: number;
  yaw: number;
  cluster: 'northeast' | 'southwest';
}

export interface LittleGardenFoliageSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  scale: number;
  tint: number;
  kind: 'canopy' | 'palm' | 'fern' | 'red-rosette';
  yaw: number;
}

export interface LittleGardenCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

export const LITTLE_GARDEN_LAKE = {
  cx: 15.0,
  cz: -23.5,
  rx: 14.5,
  rz: 4.3,
  yaw: 0.48,
  spireX: 15.2,
  spireZ: -23.6,
} as const;

export const LITTLE_GARDEN_SKELETONS: readonly LittleGardenSkeletonSpec[] = [
  {
    id: 'skeleton-nw',
    x: -25.0,
    z: -16.5,
    yaw: 0.56, // In Three.js Y-rotation: -along -> SW, +along -> NE (parallel to SE skeleton)
    length: 37.0,
    width: 14.5,
    height: 11.8,
    ribPairs: 6,
  },
  {
    id: 'skeleton-se',
    x: 17.5,
    z: 14.5,
    yaw: 0.54,
    length: 40.0,
    width: 15.6,
    height: 12.6,
    ribPairs: 7,
  },
];

export const LITTLE_GARDEN_VOLCANOES: readonly LittleGardenVolcanoSpec[] = [
  // Northeast & East coastal volcanic ridge (matching Images 1 & 2)
  {
    id: 'volcano-ne-bay-west',
    x: 24.5,
    z: -41.5,
    baseRadius: 7.4,
    height: 9.2,
    craterRadius: 1.55,
    ridgeCount: 11,
    yaw: 0.3,
    cluster: 'northeast',
  },
  {
    id: 'volcano-ne-bay-back',
    x: 37.5,
    z: -43.0,
    baseRadius: 5.8,
    height: 6.8,
    craterRadius: 1.2,
    ridgeCount: 9,
    yaw: 1.1,
    cluster: 'northeast',
  },
  {
    id: 'volcano-ne-bay-east',
    x: 49.0,
    z: -29.0,
    baseRadius: 6.8,
    height: 7.8,
    craterRadius: 1.4,
    ridgeCount: 10,
    yaw: 2.0,
    cluster: 'northeast',
  },
  {
    id: 'volcano-east-main',
    x: 47.0,
    z: -14.5,
    baseRadius: 8.2,
    height: 10.6,
    craterRadius: 1.75,
    ridgeCount: 12,
    yaw: 0.85,
    cluster: 'northeast',
  },
  // Southwest & West active volcanoes (matching left flank of Images 1 & 2)
  {
    id: 'volcano-sw-coast',
    x: -50.5,
    z: 11.5,
    baseRadius: 7.6,
    height: 9.4,
    craterRadius: 1.6,
    ridgeCount: 11,
    yaw: 1.7,
    cluster: 'southwest',
  },
  {
    id: 'volcano-west-flank',
    x: -51.5,
    z: -4.5,
    baseRadius: 6.4,
    height: 7.5,
    craterRadius: 1.35,
    ridgeCount: 10,
    yaw: 2.4,
    cluster: 'southwest',
  },
  {
    id: 'volcano-nw-corner',
    x: -48.0,
    z: -25.5,
    baseRadius: 5.9,
    height: 6.9,
    craterRadius: 1.25,
    ridgeCount: 9,
    yaw: 0.45,
    cluster: 'southwest',
  },
  {
    id: 'volcano-sw-inner',
    x: -31.5,
    z: 10.5,
    baseRadius: 6.1,
    height: 7.3,
    craterRadius: 1.3,
    ridgeCount: 10,
    yaw: 1.25,
    cluster: 'southwest',
  },
];

export const LITTLE_GARDEN_LANDMARKS = {
  lakeCenter: { x: LITTLE_GARDEN_LAKE.cx, z: LITTLE_GARDEN_LAKE.cz },
  lakeSpire: { x: LITTLE_GARDEN_LAKE.spireX, z: LITTLE_GARDEN_LAKE.spireZ },
  mr3WaxHouse: {
    x: -4.0,
    z: 38.2,
    y: LITTLE_GARDEN_MR3_CLEARING_Y,
    yaw: Math.PI, // Front arched door faces -Z (toward camera at z ~ 30.2 & incoming path)
    width: 4.9,
    depth: 4.1,
    height: 3.7,
  },
  crescentBay: { x: 37.5, z: -31.5 },
  looseRibsSouth: [
    { x: -17.5, z: 24.5, yaw: 0.42, scale: 1.05 },
    { x: -24.5, z: 22.0, yaw: -0.65, scale: 0.92 },
    { x: -37.0, z: 18.5, yaw: 1.05, scale: 0.85 },
  ],
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

export function littleGardenLakeEllipseDist(x: number, z: number): number {
  const dx = x - LITTLE_GARDEN_LAKE.cx;
  const dz = z - LITTLE_GARDEN_LAKE.cz;
  const c = Math.cos(LITTLE_GARDEN_LAKE.yaw);
  const s = Math.sin(LITTLE_GARDEN_LAKE.yaw);
  const lx = dx * c + dz * s;
  const lz = -dx * s + dz * c;
  // Slightly organic bean/teardrop bend on the lake shore matching Image 1
  const bend = Math.sin((lx / LITTLE_GARDEN_LAKE.rx) * Math.PI) * 0.55;
  return Math.hypot(lx / LITTLE_GARDEN_LAKE.rx, (lz - bend) / LITTLE_GARDEN_LAKE.rz);
}

export function littleGardenSkeletonFootprintDist(
  x: number,
  z: number,
  spec: LittleGardenSkeletonSpec
): { normalized: number; along: number; across: number } {
  const dx = x - spec.x;
  const dz = z - spec.z;
  // Inverse of Three.js Y-rotation: world (dx, dz) -> local (along, across)
  const c = Math.cos(spec.yaw);
  const s = Math.sin(spec.yaw);
  const along = dx * c - dz * s;
  const across = dx * s + dz * c;
  const normalized = Math.hypot(along / (spec.length * 0.52), across / (spec.width * 0.54));
  return { normalized, along, across };
}

/**
 * Signed distance (< 0 inside the beaten sunlit dirt/sandy jungle trail network;
 * > 0 outside). Matches the clearly visible branching trails in Image 1:
 *  - Main canyon avenue between the two colossal beast skeletons
 *  - Lakeside ring promenade circling the turquoise lake & central rock spire
 *  - Branch NE to Crescent Bay & East Volcanic Ridge
 *  - Branch SW past loose ribs & volcanoes to the SW beach
 *  - Branch South curving cleanly to Mr. 3's Wax Clearing
 */
export function littleGardenPathSignedDist(x: number, z: number): number {
  let minD = 999;

  const segments: readonly [number, number, number, number, number][] = [
    // SW beach landing -> passing SW volcanoes & loose ribs -> central canyon entrance
    [-46.0, 29.0, -34.0, 21.0, 1.85],
    [-34.0, 21.0, -21.0, 12.0, 1.95],
    [-21.0, 12.0, -10.5, 4.0, 2.25],
    // Grand Central Canyon Avenue straight between the 2 colossal skeletons
    [-10.5, 4.0, -2.5, -5.0, 2.35],
    [-2.5, -5.0, 2.5, -14.5, 2.35],
    [2.5, -14.5, 6.5, -24.5, 2.25],
    // North-west lakefront promenade curving around upper-left / north rim of lake
    [6.5, -24.5, 11.5, -30.5, 2.15],
    [11.5, -30.5, 21.5, -29.0, 2.0],
    [21.5, -29.0, 29.0, -21.0, 1.85],
    // South-east lakefront promenade curving between lake and NE edge of SE skeleton
    [2.5, -14.5, 12.0, -17.0, 2.0],
    [12.0, -17.0, 22.5, -13.5, 1.9],
    [22.5, -13.5, 29.0, -21.0, 1.85],
    // Branch North to Crescent Bay sandy shore & bay headlands
    [11.5, -30.5, 17.5, -38.5, 1.9],
    [17.5, -38.5, 28.0, -35.5, 1.85],
    // Branch East toward East Volcano Ridge pass
    [29.0, -21.0, 38.5, -18.5, 1.75],
    [38.5, -18.5, 41.0, -6.5, 1.6],
    // Branch South-West along west flank & NW skeleton pass
    [-34.0, 21.0, -40.5, 5.5, 1.65],
    [-40.5, 5.5, -37.5, -8.5, 1.6],
    // Branch South curving behind/west of SE skeleton straight into Mr. 3's Wax Clearing
    [-10.5, 4.0, -14.5, 14.0, 1.75],
    [-14.5, 14.0, -11.5, 24.5, 1.75],
    [-11.5, 24.5, -4.0, 29.2, 1.8],
  ];

  for (const [ax, az, bx, bz, halfW] of segments) {
    const d = distToSegment2D(x, z, ax, az, bx, bz) - halfW;
    if (d < minD) minD = d;
  }

  // Open sandy plaza / vista apron overlooking lake & central canyon junction
  const canyonPlaza = Math.hypot((x - 1.5) / 5.2, (z + 20.5) / 4.2) - 1.0;
  if (canyonPlaza * 3.8 < minD) minD = Math.min(minD, canyonPlaza * 3.8);

  // Subtle dirt entry apron right before Mr. 3's Wax Clearing edge
  const mr3Apron = Math.hypot((x + 4.0) / 3.4, (z - 30.2) / 2.2) - 1.0;
  if (mr3Apron * 2.5 < minD) minD = Math.min(minD, mr3Apron * 2.5);

  return minD;
}

/**
 * Island coastline mask faithful to Image 1:
 * Oval prehistoric island (~148u x 114u) with gently scalloped reefs/coves
 * and a clear Crescent Bay cut on the upper-right (NE) coast.
 */
export function sampleLittleGardenCoastMask(x: number, z: number): number {
  const rx = 68.5;
  const rz = 52.5;
  const baseEll = Math.hypot(x / rx, z / rz);

  const ang = Math.atan2(z, x);
  const headlandHarmonic =
    Math.sin(ang * 3.0 - 0.5) * 0.055 +
    Math.cos(ang * 5.0 + 1.1) * 0.032 +
    Math.sin(ang * 8.0 + 0.3) * 0.018;
  const coastNoise =
    (valueNoise2D(x * 0.065 + 4.7, z * 0.065 - 2.3) - 0.5) * 0.11 +
    (valueNoise2D(x * 0.17 - 1.9, z * 0.17 + 6.1) - 0.5) * 0.045;

  let core = 1 - smoothstep(0.64, 1.03, baseEll - headlandHarmonic);
  const shoreBand = smoothstep(0.06, 0.44, core) * (1 - smoothstep(0.68, 0.94, core));
  let mask = clamp(core + coastNoise * shoreBand, 0, 1);

  // Carve the Northeast Crescent Bay cleanly inward around (+37.5, -31.5)
  const bayEll = Math.hypot((x - 39.5) / 14.5, (z + 33.5) / 12.0);
  const bayCut = 1 - smoothstep(0.32, 1.0, bayEll);
  mask *= 1 - bayCut * 0.95;

  // Small SE cove indent matching foreground of Image 2
  const seCove = 1 - smoothstep(0.30, 1.0, Math.hypot((x - 42.0) / 11.0, (z - 32.0) / 9.5));
  mask *= 1 - seCove * 0.65;

  // Smooth fade at mesh perimeter
  const outerFade = 1 - smoothstep(0.84, 1.0, Math.hypot(x / 84.0, z / 68.0));
  mask *= outerFade;

  return clamp(mask, 0, 1);
}

/**
 * Full procedural terrain elevation map for Little Garden:
 * - Underwater reef slopes cleanly down to -5.8m into the ocean
 * - Sandy beach shelf (+0.4m -> +1.6m) around perimeter & NE Crescent Bay
 * - Rolling prehistoric jungle hills (+2.8m -> +7.6m)
 * - Raised earthen volcano pedestals underneath all 8 striated cones
 * - Recessed Prehistoric Turquoise Lake (+1.25m bed, +2.05m water) + central spire mound
 * - Flat green glade clearing around Mr. 3's Wax House (+3.15m)
 * - Gently graded dirt path beds so trails remain clearly visible and walkable everywhere
 */
export function sampleLittleGardenHeight(x: number, z: number): number {
  const coast = sampleLittleGardenCoastMask(x, z);
  let h = -5.8 + (valueNoise2D(x * 0.08, z * 0.08) - 0.5) * 0.25;
  if (coast <= 0.01) return h;

  const subT = smoothstep(0.02, 0.34, coast);
  const shoreT = smoothstep(0.32, 0.54, coast);
  const bluffT = smoothstep(0.50, 0.80, coast);
  h = -5.8 + subT * 4.7 + shoreT * 2.1 + bluffT * 1.85; // -5.8 -> -1.1 -> +1.0 -> +2.85

  // Natural rolling jungle hills & prehistoric ridges
  const hillNoiseA = valueNoise2D(x * 0.042 + 2.4, z * 0.042 - 1.8);
  const hillNoiseB = valueNoise2D(x * 0.095 - 5.1, z * 0.095 + 3.2);
  const inlandMask = smoothstep(0.58, 0.88, coast);
  h += (hillNoiseA * 2.8 + hillNoiseB * 1.1 - 0.8) * inlandMask;

  // NW forested upland ridge behind Skeleton NW
  const nwRidge = 1 - smoothstep(0.25, 1.0, Math.hypot((x + 25.0) / 26.0, (z + 36.0) / 14.0));
  h += nwRidge * 3.4 * inlandMask;

  // Central forested hillock separating canyon from southern cove
  const southRidge = 1 - smoothstep(0.28, 1.0, Math.hypot((x + 22.0) / 20.0, (z - 22.0) / 13.0));
  h += southRidge * 2.6 * inlandMask;

  // Eastern ridge mound framing SE skeleton & East volcanoes
  const eastRidge = 1 - smoothstep(0.30, 1.0, Math.hypot((x - 34.0) / 16.0, (z - 12.0) / 15.0));
  h += eastRidge * 2.5 * inlandMask;

  // Subtle earthen plinths under both colossal skeletons so ribs sit rooted into rising terrain
  for (const skel of LITTLE_GARDEN_SKELETONS) {
    const { normalized } = littleGardenSkeletonFootprintDist(x, z, skel);
    if (normalized < 1.25) {
      const moundT = 1 - smoothstep(0.55, 1.25, normalized);
      h = Math.max(h, LITTLE_GARDEN_JUNGLE_FLOOR_Y + 0.55 + moundT * 0.9);
    }
  }

  // Volcanic earthen skirts beneath each volcano
  for (const v of LITTLE_GARDEN_VOLCANOES) {
    const vd = Math.hypot(x - v.x, z - v.z);
    if (vd < v.baseRadius * 1.38) {
      const skirtT = 1 - smoothstep(v.baseRadius * 0.45, v.baseRadius * 1.38, vd);
      h += skirtT * 2.1 * inlandMask;
    }
  }

  // Smooth flat sunlit clearing around Mr. 3's Wax House (-4, 38.2)
  const mr3Dist = Math.hypot(
    (x - LITTLE_GARDEN_LANDMARKS.mr3WaxHouse.x) / 11.5,
    (z - LITTLE_GARDEN_LANDMARKS.mr3WaxHouse.z) / 10.5
  );
  if (mr3Dist < 1.0 && coast > 0.5) {
    const cT = 1 - smoothstep(0.45, 1.0, mr3Dist);
    h = h * (1 - cT * 0.92) + LITTLE_GARDEN_MR3_CLEARING_Y * (cT * 0.92);
  }

  // Gently grade along visible jungle dirt paths so they sit slightly proud/smooth against grass
  const pDist = littleGardenPathSignedDist(x, z);
  if (pDist < 1.8 && coast > 0.46) {
    const pT = 1 - smoothstep(-0.35, 1.8, pDist);
    const roadBaseH = clamp(
      LITTLE_GARDEN_JUNGLE_FLOOR_Y + 0.15 + hillNoiseA * 1.05,
      2.65,
      4.45
    );
    h = h * (1 - pT * 0.72) + roadBaseH * (pT * 0.72);
  }

  // Carve the recessed elongated Prehistoric Turquoise Lake & sandy shore apron
  const lakeEll = littleGardenLakeEllipseDist(x, z);
  if (lakeEll < 1.48 && coast > 0.5) {
    // Sandy lakefront beach apron between 0.98 and 1.48
    const shoreFlatT = (1 - smoothstep(1.0, 1.48, lakeEll)) * 0.88;
    h = h * (1 - shoreFlatT) + 2.55 * shoreFlatT;

    // Deep recessed lake basin inside 1.02
    if (lakeEll < 1.05) {
      const basinT = 1 - smoothstep(0.68, 1.05, lakeEll);
      h = h * (1 - basinT) + LITTLE_GARDEN_LAKE_BED_Y * basinT;
    }
  }

  // Central rocky spire islet inside the lake
  const spireDist = Math.hypot(
    x - LITTLE_GARDEN_LAKE.spireX,
    z - LITTLE_GARDEN_LAKE.spireZ
  );
  if (spireDist < 2.6) {
    const islandT = 1 - smoothstep(0.9, 2.6, spireDist);
    h = h * (1 - islandT) + 2.35 * islandT;
  }

  return h;
}

export function sampleLittleGardenWalkSurfaceHeight(x: number, z: number): number {
  const h = sampleLittleGardenHeight(x, z);
  return Math.max(h, LITTLE_GARDEN_SHORE_Y);
}

/**
 * Generates instanced prehistoric rainforest trees, tropical palms, curled ferns,
 * and red-tipped bromeliad rosettes, keeping all dirt paths, skeletons, lake,
 * volcanoes, and Mr. 3's Wax House clearing entrance clean and unobstructed.
 */
export function buildLittleGardenFoliage(): LittleGardenFoliageSpec[] {
  const items: LittleGardenFoliageSpec[] = [];
  let idx = 0;

  const canPlaceAt = (x: number, z: number, pathBuffer = 0.85): { ok: boolean; y: number } => {
    const y = sampleLittleGardenHeight(x, z);
    if (y < 2.25) return { ok: false, y };

    // Keep all dirt trails clearly visible from orbit and unobstructed for walking!
    if (littleGardenPathSignedDist(x, z) < pathBuffer) return { ok: false, y };

    // Keep out of lake & lake sandy beach inner rim
    if (littleGardenLakeEllipseDist(x, z) < 1.18) return { ok: false, y };

    // Keep out of both colossal beast skeletons (allow lush vines/ferns right along outer edges only)
    for (const skel of LITTLE_GARDEN_SKELETONS) {
      const { normalized } = littleGardenSkeletonFootprintDist(x, z, skel);
      if (normalized < 0.98) return { ok: false, y };
    }

    // Keep out of active volcanic slopes
    for (const v of LITTLE_GARDEN_VOLCANOES) {
      if (Math.hypot(x - v.x, z - v.z) < v.baseRadius * 0.96) return { ok: false, y };
    }

    // Keep Mr. 3's Wax House pad & front camera corridor completely open!
    const mr3 = LITTLE_GARDEN_LANDMARKS.mr3WaxHouse;
    if (Math.hypot(x - mr3.x, z - mr3.z) < 4.5) return { ok: false, y };
    // Clear camera sightline corridor from (-4, 29.8) -> (-4, 38.2)
    if (Math.abs(x - mr3.x) < 3.6 && z >= 28.0 && z <= 39.5) return { ok: false, y };

    return { ok: true, y };
  };

  // 1. Dense layered prehistoric jungle canopy trees across hills & interior ridges
  const totalCanopy = 560;
  for (let i = 0; i < totalCanopy; i++) {
    const ang = i * 2.399963;
    const rad = 5 + Math.sqrt((i + 0.5) / totalCanopy) * 63;
    const x = Math.cos(ang) * rad * 1.12;
    const z = Math.sin(ang) * rad * 0.88;
    const check = canPlaceAt(x, z, 0.95);
    if (!check.ok) continue;

    // Slight clearing buffer inside Mr. 3 glade so we frame it cleanly with curated trees
    if (
      Math.hypot(
        x - LITTLE_GARDEN_LANDMARKS.mr3WaxHouse.x,
        z - LITTLE_GARDEN_LANDMARKS.mr3WaxHouse.z
      ) < 7.2
    ) {
      continue;
    }

    items.push({
      id: `lg-canopy-${idx++}`,
      x,
      z,
      y: check.y,
      scale: 0.95 + (i % 5) * 0.17,
      tint: 0.8 + valueNoise2D(x * 0.22, z * 0.22) * 0.36,
      kind: i % 6 === 0 ? 'palm' : 'canopy',
      yaw: (i * 1.17) % (Math.PI * 2),
    });
  }

  // 2. Coastal & lakeside tropical palm trees (matching perimeter silhouette of Image 1)
  const palmPoints: readonly [number, number, number][] = [
    [-55, -14, 1.15],
    [-44, -36, 1.2],
    [-28, -42, 1.1],
    [-6, -44, 1.18],
    [10, -42, 1.2],
    [29, -24, 1.15],
    [22, -11, 1.12],
    [2, -20, 1.08],
    [54, 4, 1.2],
    [45, 22, 1.15],
    [28, 36, 1.22],
    [11, 41, 1.15],
    [-22, 39, 1.2],
    [-42, 31, 1.18],
    [-54, 20, 1.1],
    [-16, -34, 1.1],
  ];
  for (const [px, pz, sc] of palmPoints) {
    const check = canPlaceAt(px, pz, 0.8);
    if (!check.ok) continue;
    items.push({
      id: `lg-palm-${idx++}`,
      x: px,
      z: pz,
      y: check.y,
      scale: sc,
      tint: 0.92 + valueNoise2D(px * 0.3, pz * 0.3) * 0.16,
      kind: 'palm',
      yaw: (px * 0.4 + pz * 0.7) % (Math.PI * 2),
    });
  }

  // 3. Prehistoric curled ferns & red-tipped tropical rosettes scattered around jungle clearings & borders
  const fernSamples = 170;
  for (let i = 0; i < fernSamples; i++) {
    const ang = i * 2.399963 + 0.7;
    const rad = 5 + Math.sqrt((i + 0.5) / fernSamples) * 56;
    const x = Math.cos(ang) * rad * 1.08;
    const z = Math.sin(ang) * rad * 0.86;
    const check = canPlaceAt(x, z, 0.55);
    if (!check.ok) continue;
    items.push({
      id: `lg-undergrowth-${idx++}`,
      x,
      z,
      y: check.y,
      scale: 0.85 + (i % 4) * 0.15,
      tint: 0.86 + valueNoise2D(x * 0.35, z * 0.35) * 0.28,
      kind: i % 3 === 0 ? 'red-rosette' : 'fern',
      yaw: (i * 0.93) % (Math.PI * 2),
    });
  }

  return items;
}

export const LITTLE_GARDEN_FOLIAGE: readonly LittleGardenFoliageSpec[] =
  buildLittleGardenFoliage();

export function toLittleGardenSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * LITTLE_GARDEN_GLOBE_SCALE;
  const sz = z * LITTLE_GARDEN_GLOBE_SCALE;
  const rTarget =
    globeRadius + (y + LITTLE_GARDEN_SPHERE_SEA_OFFSET) * LITTLE_GARDEN_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * 6 curated presets spanning Aerial Overview (Image 1), Coastal Sea Vista (Image 2),
 * and 1.75m Human-Scale Views (Mr. 3's Wax House matching Image 3, Giant Skeleton Trail,
 * and Prehistoric Turquoise Lake).
 */
export const LITTLE_GARDEN_CAMERA_PRESETS: LittleGardenCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle:
      "Île préhistorique de Little Garden · Deux squelettes géants recouverts de mousse, chemins dorés, lac turquoise, volcans rouges fumants et jungle dense",
    position: [-2, 108, 114],
    target: [0, 3.5, -3],
    isStreetView: false,
  },
  {
    id: 'sea-vista',
    label: 'Vue Maritime (Volcans)',
    subtitle:
      "Panorama côtier face aux plages de sable, aux volcans striés rouge ocre et aux deux gigantesques squelettes émergeant de la jungle",
    position: [-54, 15.5, 68],
    target: [6, 5.8, -8],
    isStreetView: false,
  },
  {
    id: 'mr3-wax-house',
    label: 'Base de Mr. 3 (Humain)',
    subtitle:
      "À hauteur d'homme (1,75 m) dans la clairière devant la maison en cire blanche fondue de Mr. 3, porte cintrée, poignée dorée, fougères spiralées et plantes rouges",
    position: [
      LITTLE_GARDEN_LANDMARKS.mr3WaxHouse.x + 0.12,
      sampleLittleGardenWalkSurfaceHeight(
        LITTLE_GARDEN_LANDMARKS.mr3WaxHouse.x + 0.12,
        LITTLE_GARDEN_LANDMARKS.mr3WaxHouse.z - 8.6
      ) + 1.75,
      LITTLE_GARDEN_LANDMARKS.mr3WaxHouse.z - 8.6,
    ],
    target: [
      LITTLE_GARDEN_LANDMARKS.mr3WaxHouse.x,
      LITTLE_GARDEN_MR3_CLEARING_Y + 1.7,
      LITTLE_GARDEN_LANDMARKS.mr3WaxHouse.z,
    ],
    isStreetView: true,
  },
  {
    id: 'skeleton-path',
    label: 'Chemin & Squelettes (Humain)',
    subtitle:
      "À hauteur d'homme sur le grand chemin sablonneux serpentant entre les deux colossales carcasses moussues de monstres géants",
    position: [
      -5.5,
      sampleLittleGardenWalkSurfaceHeight(-5.5, -2.5) + 1.75,
      -2.5,
    ],
    target: [4.5, LITTLE_GARDEN_JUNGLE_FLOOR_Y + 4.8, -16.5],
    isStreetView: true,
  },
  {
    id: 'prehistoric-lake',
    label: 'Lac & Chemin (Humain)',
    subtitle:
      "À hauteur d'homme sur la rive sableuse du lac préhistorique turquoise, son piton rocheux central et les volcans à l'horizon",
    position: [
      4.5,
      sampleLittleGardenWalkSurfaceHeight(4.5, -18.5) + 1.75,
      -18.5,
    ],
    target: [
      LITTLE_GARDEN_LAKE.spireX + 3.0,
      LITTLE_GARDEN_LAKE_WATER_Y + 2.4,
      LITTLE_GARDEN_LAKE.spireZ - 2.0,
    ],
    isStreetView: true,
  },
  {
    id: 'volcano-ridge',
    label: 'Volcans & Baie',
    subtitle:
      "Survol des cratères volcaniques rouge terre cuite panachés de fumée et de la baie en croissant au nord-est",
    position: [12, 34, 8],
    target: [34, 6.5, -27],
    isStreetView: false,
  },
];
