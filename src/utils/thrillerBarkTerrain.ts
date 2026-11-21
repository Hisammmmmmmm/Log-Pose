import { valueNoise2D } from './globeMath';

export const THRILLER_BARK_WORLD_SIZE = 280;
export const THRILLER_BARK_GLOBE_SCALE = 0.0018;
export const THRILLER_BARK_GLOBE_CENTER = { u: 0.894, v: 0.492 } as const;
export const THRILLER_BARK_ANGULAR_MASK_RADIUS = 0.028;

export const THRILLER_BARK_SEA_LEVEL_Y = 0.0;
export const THRILLER_BARK_HULL_INNER_R = 88.0;
export const THRILLER_BARK_HULL_OUTER_R = 102.0;
export const THRILLER_BARK_ISLAND_RAMPART_R = 59.5;
export const THRILLER_BARK_MOAT_INNER_R = 18.5;
export const THRILLER_BARK_MOAT_OUTER_R = 23.8;

export const THRILLER_BARK_MANSION_CENTER = { x: 0.0, z: 11.2, y: 7.4 } as const;
export const THRILLER_BARK_CASTLE_CENTER = { x: 0.0, z: -4.2, y: 10.2 } as const;
export const THRILLER_BARK_PERONA_CENTER = { x: -27.5, z: -8.5, y: 11.4 } as const;
export const THRILLER_BARK_CHAPEL_CENTER = { x: 14.5, z: -7.5, y: 16.0 } as const;
export const THRILLER_BARK_OARS_FREEZER = { x: 8.8, z: -13.5, y: 8.2 } as const;
export const THRILLER_BARK_MOUTH_GATE = { x: 0.0, z: 95.0 } as const;
export const THRILLER_BARK_SIDE_MAST_POSITIONS = [
  { id: 'port', x: -91.5, z: 4.0 },
  { id: 'starboard', x: 91.5, z: 4.0 },
] as const;
export const THRILLER_BARK_CHAIN_ANCHORS = [
  { x: -73.0, z: 56.0 },
  { x: 73.0, z: 56.0 },
  { x: -74.0, z: -54.0 },
  { x: 74.0, z: -54.0 },
] as const;

export interface ThrillerBarkGraveSpec {
  id: string;
  kind: 'headstone' | 'cross' | 'crypt' | 'open-grave';
  x: number;
  z: number;
  y: number;
  yaw: number;
  tiltX: number;
  tiltZ: number;
  scale: number;
}

export interface ThrillerBarkTreeSpec {
  id: string;
  kind: 'dead-gnarled' | 'twisted-pine' | 'wonder-plant';
  x: number;
  z: number;
  y: number;
  scale: number;
  yaw: number;
  tint: number;
}

export interface ThrillerBarkPumpkinSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  scale: number;
  yaw: number;
}

export interface ThrillerBarkCreatureSpec {
  id: string;
  kind: 'zombie' | 'animal-zombie' | 'kumacy';
  x: number;
  z: number;
  y: number;
  scale: number;
  yaw: number;
}

export interface ThrillerBarkLanternSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  scale: number;
}

export interface ThrillerBarkCameraPreset {
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
 * Sentiers hantés reliant la porte sud, le cimetière, la forêt morte, le pont-levis et le Jardin de Perona.
 */
export const THRILLER_BARK_PATHS: readonly (readonly [number, number][])[] = [
  // Main South Gatehouse -> Drawbridge -> Hogback Courtyard
  [
    [0.0, 56.0],
    [-1.5, 42.0],
    [0.0, 26.5],
    [0.0, 17.5],
  ],
  // Cemetery Loop (SW outskirts)
  [
    [-1.5, 42.0],
    [-14.0, 42.0],
    [-25.0, 35.0],
    [-33.0, 24.0],
    [-26.0, 14.0],
  ],
  // Dead Forest East Trail
  [
    [-1.5, 42.0],
    [16.0, 39.0],
    [32.0, 28.0],
    [36.0, 10.0],
    [28.0, -8.0],
  ],
  // Perona Wonder Garden Path (NW side)
  [
    [-26.0, 14.0],
    [-29.5, 2.0],
    [-28.0, -9.5],
  ],
];

/**
 * Elliptical distance of the giant pirate-ship hull ring.
 * Returns normalized radial factor (~1.0 around ship perimeter).
 */
export function thrillerBarkShipEllipseR(x: number, z: number): number {
  return Math.hypot(x / 0.96, z / 1.02);
}

/**
 * Signed distance (< 0 = inside the giant outer ship timber hull ring, > 0 = water outside or inside lagoon).
 */
export function thrillerBarkOuterHullSignedDist(x: number, z: number): number {
  const re = thrillerBarkShipEllipseR(x, z);
  const bandDist = Math.abs(re - 95.0) - 6.8;
  // Carve South Mouth Sea Gate entrance cleanly open at water level (x = -9..+9, z > 78)
  if (z > 76.0 && Math.abs(x) < 10.2) {
    const gateSide = 10.2 - Math.abs(x);
    return Math.max(bandDist, gateSide);
  }
  return bandDist;
}

/**
 * Signed distance (< 0 = inside inner island dry landmass bounded by fortified stone ramparts).
 */
export function thrillerBarkIslandSignedDist(x: number, z: number): number {
  const ang = Math.atan2(z, x);
  const r = Math.hypot(x, z);
  const edge =
    THRILLER_BARK_ISLAND_RAMPART_R +
    Math.cos(ang * 4.0) * 1.6 +
    (valueNoise2D(x * 0.05 + 3.2, z * 0.05 - 1.7) - 0.5) * 3.2;
  return r - edge;
}

export function thrillerBarkPathSignedDist(x: number, z: number): number {
  let minD = Infinity;
  for (const trail of THRILLER_BARK_PATHS) {
    const d = distToPolyline2D(x, z, trail) - 1.85;
    if (d < minD) minD = d;
  }
  return minD;
}

/**
 * Heightmap continu de Thriller Bark (en mètres locaux, mer = 0m) :
 * - Océan au large & lagon marin intérieur : -2.6m
 * - Bouche démoniaque géante (entrée maritime Sud) : chenal navigable à -2.4m
 * - Coque circulaire du navire géant : pont en bois sombre à +8.5m (poupe/proue +11m)
 * - Île centrale fortifiée (r < 59.5m) : falaises/remparts puis forêt & cimetière (+5.2m..+10.5m)
 * - Douve intérieure stagnante (r = 18.5..23.8m) : fosse à -1.8m
 * - Plateau du Manoir d'Hogback (+7.4m) & Château de Moria (+10.2m)
 * - Tertre de la Tour de Perona (+11.4m) & Terrasses de la Chapelle (+16.0m)
 */
export function sampleThrillerBarkHeight(x: number, z: number): number {
  const hullSd = thrillerBarkOuterHullSignedDist(x, z);
  const islandSd = thrillerBarkIslandSignedDist(x, z);
  const re = thrillerBarkShipEllipseR(x, z);
  const r = Math.hypot(x, z);

  const seaBed =
    -2.6 + (valueNoise2D(x * 0.08 + 1.3, z * 0.08 - 2.4) - 0.5) * 0.3;

  // Outside the ship hull or inside the inner sea lagoon
  if (hullSd > 2.4 && islandSd > 2.4) {
    return seaBed;
  }

  let h = seaBed;

  // 1. Giant Pirate Ship Outer Hull Wall & Timber Deck
  if (hullSd <= 2.4) {
    const hullMask = 1 - smoothstep(-1.4, 2.4, hullSd);
    const prowSternLift = smoothstep(55.0, 98.0, Math.abs(z)) * 3.0;
    const deckH = 8.4 + prowSternLift;
    h = Math.max(h, seaBed * (1 - hullMask) + deckH * hullMask);
  }

  // 2. Inner Haunted Island enclosed by stone ramparts
  if (islandSd <= 2.4 && re < 82.0) {
    const landMask = 1 - smoothstep(-1.8, 2.4, islandSd);
    const undulation =
      valueNoise2D(x * 0.065 + 4.1, z * 0.065 + 2.7) * 2.8 +
      valueNoise2D(x * 0.16 - 1.9, z * 0.16 + 6.2) * 1.1;
    let islandH = 5.4 + undulation;

    // Gentle rampart embankment shelf near the stone wall (r = 53..59.5m)
    if (islandSd > -6.5) {
      const wallShelf = smoothstep(-6.5, -1.5, islandSd);
      islandH = islandH * (1 - wallShelf * 0.4) + 7.2 * (wallShelf * 0.4);
    }

    // Cemetery slight sunken graves & earthen mounds (SW outskirts)
    const cemDist = Math.hypot((x + 25.0) / 18.0, (z - 33.0) / 15.0);
    if (cemDist < 1.2) {
      const cemFlat = 1 - smoothstep(0.65, 1.2, cemDist);
      islandH = islandH * (1 - cemFlat * 0.45) + 6.2 * (cemFlat * 0.45);
    }

    // Perona's Wonder Garden Elevated Mound (WNW side, connected by skybridge)
    const peronaDist = Math.hypot(
      (x - THRILLER_BARK_PERONA_CENTER.x) / 10.5,
      (z - THRILLER_BARK_PERONA_CENTER.z) / 10.5
    );
    if (peronaDist < 1.45) {
      const pT = 1 - smoothstep(0.55, 1.45, peronaDist);
      islandH = islandH * (1 - pT) + THRILLER_BARK_PERONA_CENTER.y * pT;
    }

    // Inner Stagnant Moat encircling the Central Castle Compound (r = 18.5..23.8m)
    if (r < THRILLER_BARK_MOAT_OUTER_R + 2.2) {
      if (r >= THRILLER_BARK_MOAT_INNER_R) {
        const moatT =
          smoothstep(
            THRILLER_BARK_MOAT_INNER_R - 0.8,
            THRILLER_BARK_MOAT_INNER_R + 1.0,
            r
          ) *
          (1 -
            smoothstep(
              THRILLER_BARK_MOAT_OUTER_R - 1.0,
              THRILLER_BARK_MOAT_OUTER_R + 1.8,
              r
            ));
        islandH = islandH * (1 - moatT) + -2.2 * moatT;
      } else {
        // Inside Central Moat: Hogback Mansion South Courtyard (+7.4m) & Moria Castle Plinth (+10.2m)
        const castleBlend = smoothstep(5.5, -2.5, z);
        islandH =
          THRILLER_BARK_MANSION_CENTER.y * (1 - castleBlend) +
          THRILLER_BARK_CASTLE_CENTER.y * castleBlend;

        // Elevated East Wing Terrace for Wedding Chapel
        const chapelDist = Math.hypot(
          (x - THRILLER_BARK_CHAPEL_CENTER.x) / 6.5,
          (z - THRILLER_BARK_CHAPEL_CENTER.z) / 7.5
        );
        if (chapelDist < 1.35) {
          const chT = 1 - smoothstep(0.65, 1.35, chapelDist);
          islandH =
            islandH * (1 - chT * 0.9) + THRILLER_BARK_CHAPEL_CENTER.y * (chT * 0.9);
        }
      }
    }

    // Smooth path grading (preserve Perona terrace height)
    const pathSd = thrillerBarkPathSignedDist(x, z);
    if (pathSd < 1.2 && r > THRILLER_BARK_MOAT_OUTER_R + 0.5 && peronaDist > 0.95) {
      const pT = 1 - smoothstep(-0.2, 1.2, pathSd);
      islandH = islandH * (1 - pT * 0.55) + 6.4 * (pT * 0.55);
    }

    h = Math.max(h, seaBed * (1 - landMask) + islandH * landMask);
  }

  return h;
}

/**
 * Walkable height including:
 * - Timber Pier & Mouth Gate Landing Causeway over the inner lagoon (x = -2.2..2.2, z = 58..88)
 * - Heavy Timber & Wrought-Iron Drawbridge over the inner moat (x = -2.6..2.6, z = 17.5..25.5)
 * - Aerial Stone Skybridge connecting Central Castle & Perona's Tower
 */
export function sampleThrillerBarkWalkSurfaceHeight(x: number, z: number): number {
  let h = sampleThrillerBarkHeight(x, z);

  // Inner lagoon timber pier running from near Mouth Gate to South Gatehouse
  if (Math.abs(x) < 2.6 && z >= 57.0 && z <= 86.0) {
    h = Math.max(h, 2.2);
  }

  // Heavy Drawbridge over the Inner Moat leading to Hogback's Courtyard
  if (Math.abs(x) < 2.8 && z >= 17.0 && z <= 25.5) {
    h = Math.max(h, 7.35);
  }

  // Aerial Skybridge between Central Castle & Perona's Tower
  const skyDist = distToSegment2D(
    x,
    z,
    -6.0,
    -5.0,
    THRILLER_BARK_PERONA_CENTER.x + 3.0,
    THRILLER_BARK_PERONA_CENTER.z
  );
  if (skyDist < 1.8) {
    h = Math.max(h, 13.8);
  }

  // Elevated Wedding Chapel floor terrace & aisle
  if (
    Math.abs(x - THRILLER_BARK_CHAPEL_CENTER.x) < 4.8 &&
    z >= THRILLER_BARK_CHAPEL_CENTER.z - 7.5 &&
    z <= THRILLER_BARK_CHAPEL_CENTER.z + 7.2
  ) {
    h = Math.max(h, THRILLER_BARK_CHAPEL_CENTER.y);
  }

  return Math.max(0, h);
}

export function toThrillerBarkSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * THRILLER_BARK_GLOBE_SCALE;
  const sz = z * THRILLER_BARK_GLOBE_SCALE;
  const rTarget = globeRadius + y * THRILLER_BARK_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * Tombes, croix brisées, caveaux fissurés et tombes ouvertes du cimetière lugubre.
 */
export function buildThrillerBarkGraves(): ThrillerBarkGraveSpec[] {
  const graves: ThrillerBarkGraveSpec[] = [];
  const kinds: ThrillerBarkGraveSpec['kind'][] = [
    'headstone',
    'cross',
    'headstone',
    'open-grave',
    'crypt',
    'cross',
  ];

  // Grid-scattered cemetery cluster in SW quadrant (x = -40..-10, z = 24..46)
  let idx = 0;
  for (let gx = -38; gx <= -12; gx += 6.2) {
    for (let gz = 26; gz <= 45; gz += 5.4) {
      const n1 = valueNoise2D(gx * 0.37 + 1.1, gz * 0.51 - 2.3);
      const n2 = valueNoise2D(gx * 0.29 - 4.4, gz * 0.43 + 3.1);
      const x = gx + (n1 - 0.5) * 2.4;
      const z = gz + (n2 - 0.5) * 2.0;

      if (Math.hypot(x, z) > 54.0 || Math.hypot(x, z) < 25.5) continue;
      if (thrillerBarkPathSignedDist(x, z) < 1.3) continue;

      const y = sampleThrillerBarkHeight(x, z);
      if (y < 4.0) continue;

      const kind = kinds[idx % kinds.length];
      graves.push({
        id: `tb-grave-${idx++}`,
        kind,
        x: Number(x.toFixed(2)),
        z: Number(z.toFixed(2)),
        y: Number(y.toFixed(2)),
        yaw: Number(((n1 - 0.5) * 1.1).toFixed(2)),
        tiltX: Number(((n2 - 0.5) * 0.24).toFixed(2)),
        tiltZ: Number(((n1 - 0.5) * 0.28).toFixed(2)),
        scale: Number((0.88 + n2 * 0.45).toFixed(2)),
      });
    }
  }
  return graves;
}

/**
 * Arbres morts tordus de la forêt sinistre & plantes étranges du Jardin des Merveilles de Perona.
 */
export function buildThrillerBarkTrees(): ThrillerBarkTreeSpec[] {
  const trees: ThrillerBarkTreeSpec[] = [];
  let idx = 0;

  // Dense Dead Sinister Forest belt between moat & outer ramparts (r = 25..55m)
  const count = 175;
  for (let i = 0; i < count; i++) {
    const h1 = valueNoise2D(i * 1.41 + 2.3, i * 0.87 - 3.9);
    const h2 = valueNoise2D(i * 0.73 - 1.8, i * 1.93 + 4.2);
    const ang = i * 2.39996 + h1 * 0.42;
    const rad = 25.8 + Math.sqrt((i + 0.5) / count) * 28.5;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;

    if (thrillerBarkIslandSignedDist(x, z) > -3.5) continue;
    if (thrillerBarkPathSignedDist(x, z) < 1.9) continue;
    // Keep front drawbridge/Hogback sightline open (x = -7..7, z = 20..52)
    if (Math.abs(x) < 7.2 && z > 20.0 && z < 52.0) continue;
    // Keep cemetery center open for graves
    if (x > -39 && x < -11 && z > 24 && z < 46) continue;
    // Keep Perona garden zone for wonder plants
    if (Math.hypot(x - THRILLER_BARK_PERONA_CENTER.x, z - THRILLER_BARK_PERONA_CENTER.z) < 10.5) {
      continue;
    }
    // Keep NE Moria Castle, Oars Freezer & Giant Cogwheel sightline clearing open
    if (distToSegment2D(x, z, 10.0, -46.0, 2.0, -14.0) < 9.5) {
      continue;
    }

    const y = sampleThrillerBarkHeight(x, z);
    if (y < 4.0) continue;

    trees.push({
      id: `tb-dead-tree-${idx++}`,
      kind: i % 3 === 0 ? 'twisted-pine' : 'dead-gnarled',
      x: Number(x.toFixed(2)),
      z: Number(z.toFixed(2)),
      y: Number((y - 0.1).toFixed(2)),
      scale: Number((0.9 + h1 * 0.65).toFixed(2)),
      yaw: Number((h2 * Math.PI * 2).toFixed(2)),
      tint: Number((0.75 + h2 * 0.35).toFixed(2)),
    });
  }

  // Perona Wonder Garden bizarre twisted flora around (-27.5, -8.5)
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + 0.2;
    const rad = 6.2 + (i % 2) * 2.8;
    const x = THRILLER_BARK_PERONA_CENTER.x + Math.cos(ang) * rad;
    const z = THRILLER_BARK_PERONA_CENTER.z + Math.sin(ang) * rad;
    const y = sampleThrillerBarkHeight(x, z);
    if (y < 5.0) continue;
    trees.push({
      id: `tb-wonder-plant-${idx++}`,
      kind: 'wonder-plant',
      x: Number(x.toFixed(2)),
      z: Number(z.toFixed(2)),
      y: Number((y - 0.05).toFixed(2)),
      scale: Number((0.85 + (i % 3) * 0.25).toFixed(2)),
      yaw: Number(ang.toFixed(2)),
      tint: 1.0,
    });
  }

  return trees;
}

/**
 * Citrouilles géantes dans la forêt sinistre et près du cimetière.
 */
export function buildThrillerBarkPumpkins(): ThrillerBarkPumpkinSpec[] {
  const spots: [number, number][] = [
    [-11.5, 45.0],
    [-8.5, 36.5],
    [11.0, 44.5],
    [17.5, 34.0],
    [25.0, 25.0],
    [-34.0, 32.0],
    [28.5, -18.0],
    [-22.0, -28.0],
    [14.0, -34.0],
    [-12.0, -36.0],
  ];
  return spots
    .map(([x, z], i) => {
      const y = sampleThrillerBarkHeight(x, z);
      return {
        id: `tb-pumpkin-${i}`,
        x,
        z,
        y: Number(y.toFixed(2)),
        scale: Number((0.85 + (i % 3) * 0.25).toFixed(2)),
        yaw: Number(((i * 0.9) % (Math.PI * 2)).toFixed(2)),
      };
    })
    .filter((p) => p.y > 4.0);
}

/**
 * Créatures nocturnes : zombies rafistolés dans le cimetière, hybrides du Dr Hogback dans la forêt & Kumacy au Jardin de Perona.
 */
export function buildThrillerBarkCreatures(): ThrillerBarkCreatureSpec[] {
  const placements: Array<{
    kind: ThrillerBarkCreatureSpec['kind'];
    x: number;
    z: number;
    scale: number;
    yaw: number;
  }> = [
    // Cemetery shambling zombies
    { kind: 'zombie', x: -16.5, z: 39.0, scale: 1.0, yaw: 0.8 },
    { kind: 'zombie', x: -24.0, z: 31.5, scale: 1.05, yaw: 1.4 },
    { kind: 'zombie', x: -30.5, z: 38.0, scale: 0.95, yaw: 0.3 },
    // Hogback grotesque animal zombies patrolling forest trails
    { kind: 'animal-zombie', x: 13.5, z: 36.5, scale: 1.15, yaw: -0.9 },
    { kind: 'animal-zombie', x: 24.5, z: 18.0, scale: 1.2, yaw: -1.6 },
    { kind: 'animal-zombie', x: -19.5, z: 20.5, scale: 1.1, yaw: 0.5 },
    // Perona's Wonder Garden stuffed beasts + Kumacy
    { kind: 'kumacy', x: -25.5, z: -4.2, scale: 1.25, yaw: 0.35 },
    { kind: 'animal-zombie', x: -32.0, z: -12.5, scale: 1.05, yaw: 1.1 },
  ];

  return placements.map((p, i) => ({
    id: `tb-creature-${i}`,
    kind: p.kind,
    x: p.x,
    z: p.z,
    y: Number(sampleThrillerBarkHeight(p.x, p.z).toFixed(2)),
    scale: p.scale,
    yaw: p.yaw,
  }));
}

/**
 * Lanternes vacillantes le long de l'allée du cimetière, du pont-levis et du Jardin de Perona.
 */
export function buildThrillerBarkLanterns(): ThrillerBarkLanternSpec[] {
  const spots: [number, number][] = [
    [-3.2, 52.0],
    [3.2, 52.0],
    [-3.2, 34.0],
    [3.2, 34.0],
    [-3.2, 25.5],
    [3.2, 25.5],
    [-14.5, 40.0],
    [-23.5, 34.5],
    [-22.5, -3.5],
    [-31.5, -3.5],
  ];
  return spots.map(([x, z], i) => ({
    id: `tb-lantern-${i}`,
    x,
    z,
    y: Number(sampleThrillerBarkHeight(x, z).toFixed(2)),
    scale: 1.0,
  }));
}

function camAtGround(
  lx: number,
  lz: number,
  eyeHeight = 1.75
): [number, number, number] {
  const groundY = sampleThrillerBarkWalkSurfaceHeight(lx, lz);
  return [
    Number(lx.toFixed(2)),
    Number((groundY + eyeHeight).toFixed(2)),
    Number(lz.toFixed(2)),
  ];
}

export const THRILLER_BARK_CAMERA_PRESETS: readonly ThrillerBarkCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble · Île-Navire",
    subtitle: 'Proue démoniaque géante, voiles Thriller Bark, remparts & château gothique',
    position: [0.0, 108.0, 238.0],
    target: [0.0, 18.0, 8.0],
    isStreetView: false,
  },
  {
    id: 'mouth-gate',
    label: 'Porte Démoniaque · Proue',
    subtitle: 'Vue humaine (1,75 m) · Bouche géante rouge & remparts sur l’eau intérieure',
    position: camAtGround(0.0, 66.0, 1.75),
    target: [0.0, 8.5, 96.0],
    isStreetView: true,
  },
  {
    id: 'hogback-cemetery',
    label: 'Cimetière & Manoir Hogback',
    subtitle: 'Vue humaine (1,75 m) · Tombes ouvertes, pont-levis & rosace gothique',
    position: camAtGround(-2.5, 40.5, 1.75),
    target: [0.0, 20.5, 9.0],
    isStreetView: true,
  },
  {
    id: 'moria-castle',
    label: 'Mât Central & Château Moria',
    subtitle: 'Vue humaine (1,75 m) · Cour sombre, flèches noires, grande roue & congélateur d’Oars',
    position: camAtGround(10.0, -46.0, 1.75),
    target: [0.0, 25.0, -5.0],
    isStreetView: true,
  },
  {
    id: 'perona-garden',
    label: 'Tour de Perona · Jardin',
    subtitle: 'Vue humaine (1,75 m) · Jardin des Merveilles, Kumacy & passerelle aérienne',
    position: camAtGround(-28.8, 2.5, 1.75),
    target: [-26.5, 17.5, -8.5],
    isStreetView: true,
  },
  {
    id: 'wedding-chapel',
    label: 'Chapelle de Mariage · Vitraux',
    subtitle: 'Vue humaine (1,75 m) · Allée des bancs sombres, autel monumental & vitraux',
    position: camAtGround(14.5, -1.2, 1.75),
    target: [14.5, THRILLER_BARK_CHAPEL_CENTER.y + 3.2, -13.0],
    isStreetView: true,
  },
];
