import { valueNoise2D } from './globeMath';

export const SABAODY_WORLD_SIZE = 280;
export const SABAODY_GLOBE_SCALE = 0.0017;
export const SABAODY_GLOBE_CENTER = { u: 0.958, v: 0.502 } as const;
export const SABAODY_ANGULAR_MASK_RADIUS = 0.026;

export const SABAODY_SEA_LEVEL_Y = 0.0;

/**
 * Zone & landmark centers in local Sabaody meters (North = -Z, South = +Z, East = +X, West = -X).
 * Organized to reflect both the numbered Yarukiman grove clusters and the canonical architecture:
 * - Groves 1..29  : Central-West wild mangrove heartland & resin lagoons
 * - Groves 30..39 : South-East residential, hotels, shops & Sabaody Amusement Park (Ferris wheel + geodesic domes)
 * - Groves 40..49 : South-West coastal docks, ship moorings & Coating Craftsmen Village
 * - Groves 50..59 : Central-East business, law & institutional wood/brick-on-mangrove quarter
 * - Groves 60..69 : West / North-West lawless zone, Human Auction House & Shakky's Rip-Off Bar
 * - Groves 70..79 : North extremity Marine forward bastion & guarded route toward Mary Geoise
 */
export const SABAODY_GROVE_CLUSTERS = [
  { id: 'groves-1-29', label: 'Groves 1–29 · Cœur Yarukiman', x: -12.0, z: -2.0, rx: 24.0, rz: 20.0, baseH: 3.4, groveStart: 1, groveEnd: 29 },
  { id: 'groves-30-39', label: 'Groves 30–39 · Sabaody Park & Loisirs', x: 38.0, z: 34.0, rx: 27.0, rz: 24.0, baseH: 3.8, groveStart: 30, groveEnd: 39 },
  { id: 'groves-40-49', label: 'Groves 40–49 · Quais & Revêtement', x: -34.0, z: 40.0, rx: 28.0, rz: 22.0, baseH: 3.2, groveStart: 40, groveEnd: 49 },
  { id: 'groves-50-59', label: 'Groves 50–59 · Affaires & Droit', x: 26.0, z: -6.0, rx: 24.0, rz: 21.0, baseH: 3.9, groveStart: 50, groveEnd: 59 },
  { id: 'groves-60-69', label: 'Groves 60–69 · Secteur Hors-la-Loi', x: -46.0, z: -20.0, rx: 25.0, rz: 23.0, baseH: 3.6, groveStart: 60, groveEnd: 69 },
  { id: 'groves-70-79', label: 'Groves 70–79 · Base Marine Nord', x: 4.0, z: -56.0, rx: 26.0, rz: 20.0, baseH: 4.2, groveStart: 70, groveEnd: 79 },
] as const;

export const SABAODY_LANDMARKS = {
  // Groves 30-39 (SE): Sabaody Park Ferris Wheel & Dome Plaza
  ferrisWheel: { x: 47.5, z: 33.0, y: 3.8 },
  parkPlaza: { x: 34.0, z: 37.5, y: 3.8 },
  geodesicPavilion: { x: 25.5, z: 27.5, y: 3.8 },
  // Groves 40-49 (SW): Coating Craftsmen Village & Harbor Piers
  coatingYard: { x: -34.5, z: 36.5, y: 3.2 },
  coatingQuay: { x: -34.0, z: 54.0, y: 2.3 },
  // Groves 50-59 (Center-East): Business & Law Plaza
  businessPlaza: { x: 25.5, z: -4.5, y: 3.9 },
  // Groves 60-69 (W/NW): Human Auction House & Shakky's Bar
  auctionHouse: { x: -49.0, z: -26.5, y: 3.6 },
  shakkysBar: { x: -37.0, z: -15.5, y: 3.6 },
  // Groves 70-79 (North): Marine Forward Fortress
  marineFortress: { x: 4.0, z: -59.5, y: 4.2 },
  marineDock: { x: 4.0, z: -39.0, y: 2.3 },
} as const;

export interface SabaodyBridgeSpec {
  id: string;
  label: string;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  width: number;
  deckY: number;
  archHeight: number;
}

export const SABAODY_BRIDGES: readonly SabaodyBridgeSpec[] = [
  {
    id: 'bridge-port-park',
    label: 'Pont Groves 40–30 (Port ↔ Parc)',
    ax: -11.0,
    az: 39.0,
    bx: 14.5,
    bz: 36.0,
    width: 3.6,
    deckY: 4.3,
    archHeight: 1.5,
  },
  {
    id: 'bridge-port-center',
    label: 'Pont Groves 40–10 (Port ↔ Cœur)',
    ax: -24.0,
    az: 21.0,
    bx: -18.0,
    bz: 13.0,
    width: 3.2,
    deckY: 4.2,
    archHeight: 1.2,
  },
  {
    id: 'bridge-park-business',
    label: 'Pont Groves 30–50 (Parc ↔ Affaires)',
    ax: 32.5,
    az: 14.5,
    bx: 29.0,
    bz: 9.5,
    width: 3.4,
    deckY: 4.4,
    archHeight: 1.3,
  },
  {
    id: 'bridge-center-business',
    label: 'Pont Groves 10–50 (Cœur ↔ Affaires)',
    ax: 6.5,
    az: -3.5,
    bx: 9.0,
    bz: -4.5,
    width: 3.6,
    deckY: 4.3,
    archHeight: 1.1,
  },
  {
    id: 'bridge-center-lawless',
    label: 'Pont Groves 20–60 (Cœur ↔ Secteur 60)',
    ax: -27.5,
    az: -11.0,
    bx: -31.0,
    bz: -13.5,
    width: 3.2,
    deckY: 4.2,
    archHeight: 1.1,
  },
  {
    id: 'bridge-business-marine',
    label: 'Pont Groves 50–70 (Affaires ↔ Marine)',
    ax: 20.5,
    az: -23.0,
    bx: 14.5,
    bz: -39.0,
    width: 3.4,
    deckY: 4.6,
    archHeight: 1.4,
  },
  {
    id: 'bridge-lawless-marine',
    label: 'Pont Groves 60–70 (Secteur 60 ↔ Marine)',
    ax: -26.0,
    az: -34.0,
    bx: -15.5,
    bz: -46.0,
    width: 3.0,
    deckY: 4.5,
    archHeight: 1.4,
  },
];

export interface SabaodyMangroveSpec {
  groveNumber: number; // 1..79
  clusterId: string;
  x: number;
  z: number;
  y: number;
  trunkRadius: number;
  trunkHeight: number;
  canopyRadius: number;
  yaw: number;
  isHero: boolean;
}

export interface SabaodyBubbleSpec {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  phase: number;
  riseSpeed: number;
  driftAmp: number;
}

export interface SabaodyCameraPreset {
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

function distToSegmentWithT(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): { dist: number; t: number } {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-8) return { dist: Math.hypot(px - ax, pz - az), t: 0 };
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / lenSq, 0, 1);
  return {
    dist: Math.hypot(px - (ax + dx * t), pz - (az + dz * t)),
    t,
  };
}

/**
 * Signed distance to the nearest mangrove grove islet (< 0 = dry grove land, > 0 = water channel / sea).
 */
export function sabaodyClusterSignedDist(x: number, z: number): {
  sd: number;
  clusterIndex: number;
  baseH: number;
} {
  let minSd = Infinity;
  let bestIdx = 0;
  let bestH = 3.5;

  for (let i = 0; i < SABAODY_GROVE_CLUSTERS.length; i++) {
    const c = SABAODY_GROVE_CLUSTERS[i];
    const dx = x - c.x;
    const dz = z - c.z;
    const ang = Math.atan2(dz, dx);
    const ellipR = Math.hypot(dx / c.rx, dz / c.rz);
    const lobeWarp =
      Math.cos(ang * 3 + i * 1.1) * 0.08 +
      (valueNoise2D(x * 0.055 + i * 3.1, z * 0.055 - i * 2.3) - 0.5) * 0.16;
    const sd = (ellipR - (1.0 + lobeWarp)) * Math.min(c.rx, c.rz);
    if (sd < minSd) {
      minSd = sd;
      bestIdx = i;
      bestH = c.baseH;
    }
  }

  return { sd: minSd, clusterIndex: bestIdx, baseH: bestH };
}

/**
 * Heightmap continu de l'archipel des Sabaody (en mètres locaux, niveau de la mer = 0 m).
 * - Lagon et chenaux navigables entre les groupes de mangroves : -2.6 m
 * - Îlots des mangroves Yarukiman (Groves 1–79) : +3.2 m .. +6.0 m avec racines affleurantes
 * - Plates-formes aplanies sous les places publiques (Parc Sabaody, Quais, Affaires, Enchères, Shakky, Base Marine)
 */
export function sampleSabaodyHeight(x: number, z: number): number {
  const { sd, baseH } = sabaodyClusterSignedDist(x, z);
  const seaBed =
    -2.55 + (valueNoise2D(x * 0.075 + 2.1, z * 0.075 - 1.4) - 0.5) * 0.35;

  if (sd > 3.2) {
    return seaBed;
  }

  const landMask = 1 - smoothstep(-2.4, 3.2, sd);
  const hillNoise =
    valueNoise2D(x * 0.06 + 1.7, z * 0.06 + 4.3) * 1.45 +
    valueNoise2D(x * 0.15 - 3.2, z * 0.15 + 1.9) * 0.45;
  let landH = baseH + hillNoise - 0.55;

  // Gently grade key plazas flat for crisp grounding of architecture & street presets
  const plazaZones: readonly { x: number; z: number; r: number; h: number }[] = [
    { x: SABAODY_LANDMARKS.parkPlaza.x, z: SABAODY_LANDMARKS.parkPlaza.z, r: 16.0, h: 3.8 },
    { x: SABAODY_LANDMARKS.ferrisWheel.x, z: SABAODY_LANDMARKS.ferrisWheel.z, r: 12.0, h: 3.8 },
    { x: SABAODY_LANDMARKS.coatingYard.x, z: SABAODY_LANDMARKS.coatingYard.z, r: 14.0, h: 3.2 },
    { x: SABAODY_LANDMARKS.businessPlaza.x, z: SABAODY_LANDMARKS.businessPlaza.z, r: 14.0, h: 3.9 },
    { x: SABAODY_LANDMARKS.auctionHouse.x, z: SABAODY_LANDMARKS.auctionHouse.z, r: 13.5, h: 3.6 },
    { x: SABAODY_LANDMARKS.shakkysBar.x, z: SABAODY_LANDMARKS.shakkysBar.z, r: 11.5, h: 3.6 },
    { x: SABAODY_LANDMARKS.marineFortress.x, z: SABAODY_LANDMARKS.marineFortress.z, r: 15.0, h: 4.2 },
  ];

  for (const pz of plazaZones) {
    const d = Math.hypot(x - pz.x, z - pz.z);
    if (d < pz.r) {
      const f = 1 - smoothstep(pz.r * 0.45, pz.r, d);
      landH = landH * (1 - f * 0.88) + pz.h * (f * 0.88);
    }
  }

  return seaBed * (1 - landMask) + landH * landMask;
}

/**
 * Walkable height including wooden suspension bridges and timber harbor piers.
 */
export function sampleSabaodyWalkSurfaceHeight(x: number, z: number): number {
  let h = sampleSabaodyHeight(x, z);

  for (const b of SABAODY_BRIDGES) {
    const { dist, t } = distToSegmentWithT(x, z, b.ax, b.az, b.bx, b.bz);
    if (dist <= b.width * 0.5 + 0.55) {
      const arch = Math.sin(t * Math.PI) * b.archHeight;
      h = Math.max(h, b.deckY + arch);
    }
  }

  // Timber Coating Port Piers extending south into the harbor bay (Groves 40-49)
  const pierSpecs: readonly { ax: number; az: number; bx: number; bz: number; hw: number; y: number }[] = [
    { ax: -42.0, az: 50.0, bx: -42.0, bz: 74.0, hw: 2.6, y: 2.3 },
    { ax: -34.0, az: 48.0, bx: -34.0, bz: 72.0, hw: 3.0, y: 2.3 },
    { ax: -26.0, az: 50.0, bx: -26.0, bz: 76.0, hw: 2.8, y: 2.3 },
    { ax: -46.0, az: 60.0, bx: -22.0, bz: 60.0, hw: 2.6, y: 2.3 },
    // Marine North Pier (Groves 70-79)
    { ax: 4.0, az: -66.0, bx: 4.0, bz: -86.0, hw: 3.0, y: 2.5 },
  ];
  for (const p of pierSpecs) {
    if (distToSegment2D(x, z, p.ax, p.az, p.bx, p.bz) <= p.hw) {
      h = Math.max(h, p.y);
    }
  }

  return Math.max(0, h);
}

export function toSabaodySphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * SABAODY_GLOBE_SCALE;
  const sz = z * SABAODY_GLOBE_SCALE;
  const rTarget = globeRadius + y * SABAODY_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * Generates all 79 numbered Yarukiman Mangrove Trees distributed faithfully across Groves 1..79,
 * keeping sightlines, plazas, bridges, and camera view corridors clear while enclosing every zone
 * in towering fluted mangrove trunks and lush high canopies.
 */
export function buildSabaodyMangroves(): SabaodyMangroveSpec[] {
  const result: SabaodyMangroveSpec[] = [];

  const plazaExclusions: readonly { x: number; z: number; r: number }[] = [
    { x: SABAODY_LANDMARKS.ferrisWheel.x, z: SABAODY_LANDMARKS.ferrisWheel.z, r: 9.5 },
    { x: SABAODY_LANDMARKS.parkPlaza.x, z: SABAODY_LANDMARKS.parkPlaza.z, r: 10.5 },
    { x: SABAODY_LANDMARKS.geodesicPavilion.x, z: SABAODY_LANDMARKS.geodesicPavilion.z, r: 7.5 },
    { x: SABAODY_LANDMARKS.coatingYard.x, z: SABAODY_LANDMARKS.coatingYard.z, r: 9.0 },
    { x: SABAODY_LANDMARKS.businessPlaza.x, z: SABAODY_LANDMARKS.businessPlaza.z, r: 8.5 },
    { x: SABAODY_LANDMARKS.auctionHouse.x, z: SABAODY_LANDMARKS.auctionHouse.z, r: 11.0 },
    { x: SABAODY_LANDMARKS.shakkysBar.x, z: SABAODY_LANDMARKS.shakkysBar.z, r: 9.0 },
    { x: SABAODY_LANDMARKS.marineFortress.x, z: SABAODY_LANDMARKS.marineFortress.z, r: 11.0 },
  ];

  // Clear camera sightlines for all street-view presets
  const sightlineCorridors: readonly { ax: number; az: number; bx: number; bz: number; r: number }[] = [
    { ax: 22.5, az: 46.0, bx: 47.5, bz: 33.0, r: 6.5 }, // Park plaza -> Ferris wheel
    { ax: -26.0, az: 75.5, bx: -34.5, bz: 36.5, r: 7.5 }, // Port pier -> Coating yard
    { ax: 13.5, az: 8.0, bx: 29.0, bz: -9.0, r: 6.5 }, // Business plaza
    { ax: -46.0, az: -3.0, bx: -49.0, bz: -28.0, r: 7.0 }, // Auction house facade
    { ax: -33.5, az: -1.0, bx: -37.0, bz: -16.5, r: 8.5 }, // Shakky's Bar facade
    { ax: 8.5, az: -37.0, bx: 4.0, bz: -60.0, r: 10.5 }, // Marine fortress twin towers & flags
  ];

  for (const cluster of SABAODY_GROVE_CLUSTERS) {
    const count = cluster.groveEnd - cluster.groveStart + 1;
    let placed = 0;
    let attempt = 0;

    while (placed < count && attempt < count * 14) {
      attempt++;
      const groveNumber = cluster.groveStart + placed;
      const seed = groveNumber * 1.73 + attempt * 0.91;
      const n1 = valueNoise2D(seed * 0.43 + 2.1, attempt * 0.37 - 1.5);
      const n2 = valueNoise2D(seed * 0.29 - 3.4, attempt * 0.61 + 2.7);
      const ang = (placed / count) * Math.PI * 2 + (n1 - 0.5) * 0.75 + attempt * 0.31;
      const radFrac = 0.24 + 0.68 * Math.sqrt(((placed + 0.5) / count + n2 * 0.25) % 1);
      const x = cluster.x + Math.cos(ang) * cluster.rx * radFrac;
      const z = cluster.z + Math.sin(ang) * cluster.rz * radFrac;

      const y = sampleSabaodyHeight(x, z);
      if (y < 1.35) continue;

      // Keep clear of bridge endpoints & decks
      let blocked = false;
      for (const b of SABAODY_BRIDGES) {
        if (distToSegment2D(x, z, b.ax, b.az, b.bx, b.bz) < b.width * 0.9 + 2.5) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      for (const ex of plazaExclusions) {
        if (Math.hypot(x - ex.x, z - ex.z) < ex.r) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      for (const cor of sightlineCorridors) {
        if (distToSegment2D(x, z, cor.ax, cor.az, cor.bx, cor.bz) < cor.r) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      // Minimum spacing against previously placed trunks
      for (const prev of result) {
        if (Math.hypot(x - prev.x, z - prev.z) < 4.8) {
          blocked = true;
          break;
        }
      }
      if (blocked && attempt < count * 10) continue;

      const isHero = placed % 3 === 0;
      const trunkRadius = isHero ? 2.4 + n1 * 1.35 : 1.35 + n2 * 0.95;
      const trunkHeight = isHero ? 50.0 + n2 * 22.0 : 38.0 + n1 * 14.0;
      const canopyRadius = isHero ? 12.5 + n1 * 4.5 : 8.5 + n2 * 3.0;

      result.push({
        groveNumber,
        clusterId: cluster.id,
        x: Number(x.toFixed(2)),
        z: Number(z.toFixed(2)),
        y: Number((y - 0.35).toFixed(2)),
        trunkRadius: Number(trunkRadius.toFixed(2)),
        trunkHeight: Number(trunkHeight.toFixed(2)),
        canopyRadius: Number(canopyRadius.toFixed(2)),
        yaw: Number((n2 * Math.PI * 2).toFixed(2)),
        isHero,
      });
      placed++;
    }
  }

  return result;
}

/**
 * Generates characteristic iridescent Yarukiman resin soap bubbles floating across the archipelago.
 */
export function buildSabaodyBubbles(): SabaodyBubbleSpec[] {
  const bubbles: SabaodyBubbleSpec[] = [];
  const total = 110;
  for (let i = 0; i < total; i++) {
    const n1 = valueNoise2D(i * 0.71 + 4.2, i * 0.33 - 1.9);
    const n2 = valueNoise2D(i * 0.49 - 2.6, i * 0.83 + 5.1);
    const n3 = valueNoise2D(i * 0.91 + 1.3, i * 0.57 + 0.8);

    const cluster = SABAODY_GROVE_CLUSTERS[i % SABAODY_GROVE_CLUSTERS.length];
    const ang = n1 * Math.PI * 2;
    const rad = 0.25 + n2 * 1.05;
    let x = cluster.x + Math.cos(ang) * cluster.rx * rad;
    let z = cluster.z + Math.sin(ang) * cluster.rz * rad;
    const groundY = Math.max(0.5, sampleSabaodyHeight(x, z));
    let y = groundY + 4.5 + n3 * 36.0;
    const radius = 0.95 + n1 * 2.55;

    // Keep street-view camera sightlines & lens spheres unobstructed by low-hanging bubbles
    const camKeepOut: readonly [number, number][] = [
      [22.5, 45.5],
      [-26.0, 75.5],
      [13.5, 8.0],
      [-46.0, -3.5],
      [-33.5, -1.5],
      [8.5, -39.5],
    ];
    for (const [cx, cz] of camKeepOut) {
      if (Math.hypot(x - cx, z - cz) < radius + 5.2 && y < 12.0) {
        y += 10.5;
      }
    }

    bubbles.push({
      id: `sabaody-bubble-${i}`,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      z: Number(z.toFixed(2)),
      radius: Number(radius.toFixed(2)),
      phase: Number((n2 * Math.PI * 2).toFixed(2)),
      riseSpeed: Number((0.45 + n3 * 0.7).toFixed(2)),
      driftAmp: Number((0.8 + n1 * 1.4).toFixed(2)),
    });
  }
  return bubbles;
}

function camAtGround(
  lx: number,
  lz: number,
  eyeHeight = 1.75
): [number, number, number] {
  const groundY = sampleSabaodyWalkSurfaceHeight(lx, lz);
  return [
    Number(lx.toFixed(2)),
    Number((groundY + eyeHeight).toFixed(2)),
    Number(lz.toFixed(2)),
  ];
}

export const SABAODY_CAMERA_PRESETS: readonly SabaodyCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble · 79 Mangroves",
    subtitle:
      'Archipel des Sabaody : 79 arbres Yarukiman, ponts suspendus, bulles de résine & 6 zones numérotées',
    position: [-14.0, 96.0, 178.0],
    target: [0.0, 14.0, 2.0],
    isStreetView: false,
  },
  {
    id: 'sabaody-park',
    label: 'Parc & Loisirs · Groves 30–39',
    subtitle:
      'Vue humaine (1,75 m) · Grande roue, dômes géodésiques pastel, pelouses & scooters Bon-Chari',
    position: camAtGround(22.5, 45.5, 1.75),
    target: [42.0, 12.0, 32.0],
    isStreetView: true,
  },
  {
    id: 'coating-port',
    label: 'Port & Revêtement · Groves 40–49',
    subtitle:
      'Vue humaine (1,75 m) · Quais côtiers, navires enrobés de bulles géantes & village du revêtement',
    position: camAtGround(-26.0, 75.5, 1.75),
    target: [-34.5, 4.5, 51.0],
    isStreetView: true,
  },
  {
    id: 'business-law',
    label: 'Affaires & Droit · Groves 50–59',
    subtitle:
      'Vue humaine (1,75 m) · Architecture bois et brique accrochée aux troncs & dômes à treillis doré',
    position: camAtGround(13.5, 8.0, 1.75),
    target: [28.0, 11.2, -9.5],
    isStreetView: true,
  },
  {
    id: 'auction-house',
    label: 'Salle des Ventes · Groves 60–69',
    subtitle:
      'Vue humaine (1,75 m) · Secteur hors-la-loi, façade HUMAN à fronton de chaume & 4 minarets turquoise',
    position: camAtGround(-46.0, -3.5, 1.75),
    target: [-47.5, 7.6, -26.5],
    isStreetView: true,
  },
  {
    id: 'shakkys-bar',
    label: 'Bar de Shakky · Grove 13 / 60',
    subtitle:
      'Vue humaine (1,75 m) · Base en pierre moussue, fenêtres en bouteille & dôme vert du Bar de Shakky',
    position: camAtGround(-33.5, -1.5, 1.75),
    target: [-35.5, 5.2, -15.5],
    isStreetView: true,
  },
  {
    id: 'marine-base',
    label: 'Base Marine · Groves 70–79',
    subtitle:
      'Vue humaine (1,75 m) · Avant-poste militaire au nord & route fortifiée vers Marie Joie',
    position: camAtGround(8.5, -39.5, 1.75),
    target: [7.5, 6.8, -59.5],
    isStreetView: true,
  },
];
