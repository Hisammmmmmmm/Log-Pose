import { valueNoise2D } from './globeMath';

export const WATER7_WORLD_SIZE = 240;
export const WATER7_GLOBE_SCALE = 0.0019;
export const WATER7_GLOBE_CENTER = { u: 0.812, v: 0.482 } as const;
export const WATER7_ANGULAR_MASK_RADIUS = 0.045;

export const WATER7_SEAWALL_RADIUS = 76;
export const WATER7_FOUNTAIN_DRUM_RADIUS = 20.5;
export const WATER7_FOUNTAIN_BASE_Y = 22.0;

export const WATER7_TIER_RADII = {
  fountainDrum: 20.5,
  tier3Inner: 21.0,
  tier3Outer: 34.5,
  tier2Inner: 35.0,
  tier2Outer: 49.5,
  tier1Inner: 50.0,
  tier1Outer: 64.5,
  promenadeInner: 65.0,
  promenadeOuter: 76.0,
} as const;

export const WATER7_RING_AVENUES = [27.5, 42.5, 57.5, 70.5] as const;

// Radial turquoise aqueduct canal angles (radians, East=0, South=+PI/2)
export const WATER7_CANAL_ANGLES = [
  0.22, 1.18, 1.96, 2.94, 4.02, 5.15,
] as const;

// Radial stone stair-ramps connecting Promenade -> Tier 1 -> Tier 2 -> Tier 3
export const WATER7_STAIR_ANGLES = [
  0.74, 1.57, 2.45, 3.48, 4.58, 5.68,
] as const;

// Waterfront Dock Bastions & Iconic Landmarks
export const WATER7_DOCK_SPECS = [
  { dockNum: '1', angle: 2.26, r: 78.5 },
  { dockNum: '2', angle: 1.72, r: 78.5 },
  { dockNum: '3', angle: 0.90, r: 78.5 },
] as const;

export const WATER7_GALLEY_STATION = {
  angle: 1.44,
  r: 71.8,
} as const;

export const WATER7_BLUE_STATION_YARD = {
  angle: 1.44,
  rStart: 75.0,
  rEnd: 103.5,
  bayHalfWidths: [-6.6, -2.2, 2.2, 6.6] as const,
  trackOffsets: [-4.4, 0.0, 4.4] as const,
} as const;

export const WATER7_VIADUCT = {
  angle: 0.54,
  rStart: 73.5,
  rEnd: 102.0,
  halfWidth: 2.4,
  startY: 3.4,
  endY: 0.5,
} as const;

export interface Water7BridgeSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  yaw: number;
  length: number;
  width: number;
  ringRadius: number;
  canalAngle: number;
}

export interface Water7HouseSpec {
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
  tier: 1 | 2 | 3 | 0;
  hasBalcony: boolean;
}

export interface Water7CraneSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  yaw: number;
  scale: number;
}

export interface Water7CameraPreset {
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

function normalizeAngleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function toWater7SphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * WATER7_GLOBE_SCALE;
  const sz = z * WATER7_GLOBE_SCALE;
  const rTarget = globeRadius + y * WATER7_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * Signed perpendicular distance to the closest radial turquoise canal
 * (< 0 inside water channel, > 0 outside).
 */
export function water7CanalSignedDist(x: number, z: number): number {
  const r = Math.hypot(x, z);
  if (r < WATER7_FOUNTAIN_DRUM_RADIUS - 1.5 || r > WATER7_SEAWALL_RADIUS + 4.0) {
    return 999;
  }
  const ang = Math.atan2(z, x);
  let minD = 999;
  for (const ca of WATER7_CANAL_ANGLES) {
    const dAng = Math.abs(normalizeAngleDiff(ang, ca));
    if (dAng < Math.PI * 0.45) {
      const perp = r * Math.sin(dAng);
      const halfWidth = 2.05;
      const d = perp - halfWidth;
      if (d < minD) minD = d;
    }
  }
  return minD;
}

/**
 * Computes the continuous sloped water surface elevation of a radial aqueduct canal
 * from the Central Fountain Drum out to the outer sea wall gates.
 */
export function sampleWater7CanalWaterHeight(r: number): number {
  if (r <= WATER7_FOUNTAIN_DRUM_RADIUS) return WATER7_FOUNTAIN_BASE_Y + 0.3;
  // Cascading down across the 3 terraces to ocean level
  const t3 = 1 - smoothstep(31.5, 36.5, r);
  const t2 = 1 - smoothstep(46.5, 51.5, r);
  const t1 = 1 - smoothstep(61.5, 66.5, r);
  const tSea = 1 - smoothstep(73.5, 78.5, r);
  return 0.25 + tSea * 2.2 + t1 * 2.8 + t2 * 4.6 + t3 * 4.8;
}

/**
 * Signed distance to walkable streets (concentric ring avenues + stair ramps)
 * (< 0 on road/stairway, > 0 off road).
 */
export function water7RoadSignedDist(x: number, z: number): number {
  const r = Math.hypot(x, z);
  if (r < WATER7_FOUNTAIN_DRUM_RADIUS - 0.5 || r > WATER7_SEAWALL_RADIUS + 1.5) {
    return 999;
  }

  let minD = 999;
  for (const ringR of WATER7_RING_AVENUES) {
    const halfW = ringR > 65 ? 2.4 : 2.1;
    const d = Math.abs(r - ringR) - halfW;
    if (d < minD) minD = d;
  }

  // Radial stairways between rings
  const ang = Math.atan2(z, x);
  for (const sa of WATER7_STAIR_ANGLES) {
    const dAng = Math.abs(normalizeAngleDiff(ang, sa));
    if (dAng < Math.PI * 0.4 && r >= 25.5 && r <= 73.5) {
      const perp = r * Math.sin(dAng) - 2.1;
      if (perp < minD) minD = perp;
    }
  }

  return minD;
}

/**
 * Computes proximity [0..1] to the nearest radial stone stair-ramp so tier walls
 * smoothly slope into walkable stairways instead of vertical cliff drops.
 */
function sampleStairRampBlend(x: number, z: number, r: number): number {
  if (r < 24 || r > 76) return 0;
  const ang = Math.atan2(z, x);
  let best = 0;
  for (const sa of WATER7_STAIR_ANGLES) {
    const dAng = Math.abs(normalizeAngleDiff(ang, sa));
    if (dAng < 0.45) {
      const perp = r * Math.sin(dAng);
      const w = 1 - smoothstep(1.9, 3.2, perp);
      if (w > best) best = w;
    }
  }
  return best;
}

/**
 * Master terrain & masonry height sampler for Water Seven.
 * Produces crisp stepped white-stone tiers, seawall outer drop,
 * carved canal troughs, and smooth walkable stair-ramps.
 */
export function sampleWater7Height(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const ang = Math.atan2(z, x);

  // Outer ocean & shallow coral seabed
  if (r > WATER7_SEAWALL_RADIUS + 4.5) {
    const ripple = (valueNoise2D(x * 0.08, z * 0.08) - 0.5) * 0.6;
    return -1.4 + ripple;
  }

  const stairBlend = sampleStairRampBlend(x, z, r);
  const wallSlope = 0.8 + stairBlend * 4.4;

  // Base concentric stepped tiers rising toward center
  const tSea = 1 - smoothstep(WATER7_SEAWALL_RADIUS - wallSlope * 0.35, WATER7_SEAWALL_RADIUS + 0.9, r);
  const tProm = 1 - smoothstep(64.5 - wallSlope, 65.2 + wallSlope * 0.35, r);
  const tTier1 = 1 - smoothstep(49.5 - wallSlope, 50.2 + wallSlope * 0.35, r);
  const tTier2 = 1 - smoothstep(34.5 - wallSlope, 35.2 + wallSlope * 0.35, r);
  const tDrum = 1 - smoothstep(20.1, 21.4, r);

  let h =
    -1.4 +
    tSea * 4.0 + // Outer seawall / promenade base (~2.6)
    tProm * 3.0 + // Tier 1 (~5.6)
    tTier1 * 4.8 + // Tier 2 (~10.4)
    tTier2 * 4.8 + // Tier 3 (~15.2)
    tDrum * 6.8; // Central Fountain Drum (~22.0)

  // Keep Dock 1/2/3 & Galley-La architectural masonry crisp without rounded terrain bulges
  // (Architectural bastions, harbor stairs, and Galley-La quay plinths extend cleanly into the sea.)

  // Carve radial canal beds below the tier stone surface
  const canalD = water7CanalSignedDist(x, z);
  if (canalD < 0.45 && r > WATER7_FOUNTAIN_DRUM_RADIUS + 0.5) {
    const bedDepth = sampleWater7CanalWaterHeight(r) - 1.1;
    const carveT = 1 - smoothstep(-0.3, 0.45, canalD);
    h = h * (1 - carveT) + Math.min(h, bedDepth) * carveT;
  }

  return h;
}

/**
 * Generates the 24 arched stone pedestrian bridges where each concentric ring avenue
 * crosses each of the 6 radial aqueduct canals.
 */
export function buildWater7Bridges(): Water7BridgeSpec[] {
  const bridges: Water7BridgeSpec[] = [];
  WATER7_RING_AVENUES.forEach((ringR, rIdx) => {
    WATER7_CANAL_ANGLES.forEach((ca, cIdx) => {
      const x = Math.cos(ca) * ringR;
      const z = Math.sin(ca) * ringR;
      const tierY =
        rIdx === 0 ? 15.25 : rIdx === 1 ? 10.45 : rIdx === 2 ? 5.65 : 2.65;
      // Tangent direction along the ring avenue (perpendicular to radial canal)
      const yaw = -ca + Math.PI * 0.5;
      bridges.push({
        id: `bridge-r${rIdx}-c${cIdx}`,
        x,
        z,
        y: tierY + 0.48,
        yaw,
        length: 6.4,
        width: 3.4,
        ringRadius: ringR,
        canalAngle: ca,
      });
    });
  });
  return bridges;
}

export const WATER7_BRIDGES: readonly Water7BridgeSpec[] = buildWater7Bridges();

/**
 * Ground + walkable bridge + Sea Train viaduct height sampler used by WASD human walking
 * and camera clearance checks.
 */
export function sampleWater7WalkSurfaceHeight(x: number, z: number): number {
  let h = sampleWater7Height(x, z);

  // Check arched canal bridges
  for (const b of WATER7_BRIDGES) {
    const dx = x - b.x;
    const dz = z - b.z;
    if (dx * dx + dz * dz < 22) {
      const cosY = Math.cos(b.yaw);
      const sinY = Math.sin(b.yaw);
      const lx = dx * cosY - dz * sinY;
      const lz = dx * sinY + dz * cosY;
      if (Math.abs(lx) <= b.length * 0.52 && Math.abs(lz) <= b.width * 0.56) {
        const arch = Math.cos((lx / (b.length * 0.5)) * Math.PI * 0.5) * 0.45;
        h = Math.max(h, b.y + arch);
      }
    }
  }

  // Check SE Sea Train Viaduct ramp
  const r = Math.hypot(x, z);
  if (r >= WATER7_VIADUCT.rStart - 1 && r <= WATER7_VIADUCT.rEnd + 1) {
    const ang = Math.atan2(z, x);
    const dAng = Math.abs(normalizeAngleDiff(ang, WATER7_VIADUCT.angle));
    const perp = r * Math.sin(dAng);
    if (perp <= WATER7_VIADUCT.halfWidth + 0.25) {
      const t = clamp(
        (r - WATER7_VIADUCT.rStart) /
          (WATER7_VIADUCT.rEnd - WATER7_VIADUCT.rStart),
        0,
        1
      );
      const deckY =
        WATER7_VIADUCT.startY +
        (WATER7_VIADUCT.endY - WATER7_VIADUCT.startY) * t;
      h = Math.max(h, deckY);
    }
  }

  return h;
}

/**
 * Generates ~115 terraced Venetian stone houses with terracotta-orange pitched roofs
 * densely lining Tiers 1, 2, and 3 and the Promenade while strictly avoiding canals,
 * avenues, stairways, and the Galley-La front plaza.
 */
export function buildWater7Houses(): Water7HouseSpec[] {
  const houses: Water7HouseSpec[] = [];
  const wallPalette = [0xf6f2ea, 0xeee8dc, 0xfaf7f0, 0xe8e1d5];
  const roofPalette = [0xd95628, 0xe36432, 0xc94922, 0xe8723a];

  const bandSpecs: Array<{
    tier: 0 | 1 | 2 | 3;
    r: number;
    baseY: number;
    stepArc: number;
    faceOutward: boolean;
  }> = [
    // Outer waterfront inner-ring villas
    { tier: 0, r: 66.8, baseY: 2.6, stepArc: 7.4, faceOutward: true },
    // Tier 1 outer & inner street rows
    { tier: 1, r: 62.0, baseY: 5.6, stepArc: 6.8, faceOutward: false },
    { tier: 1, r: 53.0, baseY: 5.6, stepArc: 6.4, faceOutward: true },
    // Tier 2 outer & inner street rows
    { tier: 2, r: 46.8, baseY: 10.4, stepArc: 6.2, faceOutward: false },
    { tier: 2, r: 38.0, baseY: 10.4, stepArc: 6.0, faceOutward: true },
    // Tier 3 upper villas hugging the central fountain drum
    { tier: 3, r: 31.8, baseY: 15.2, stepArc: 5.9, faceOutward: false },
    { tier: 3, r: 23.8, baseY: 15.2, stepArc: 5.7, faceOutward: true },
  ];

  let idx = 0;
  bandSpecs.forEach((band) => {
    const count = Math.floor((Math.PI * 2 * band.r) / band.stepArc);
    for (let i = 0; i < count; i++) {
      const jitterAng =
        (valueNoise2D(i * 0.71 + band.r, band.tier * 3.1) - 0.5) * 0.025;
      const ang = (i / count) * Math.PI * 2 + jitterAng;
      const x = Math.cos(ang) * band.r;
      const z = Math.sin(ang) * band.r;

      // Never block canals, ring avenues, stairways, or Galley-La front plaza
      if (water7CanalSignedDist(x, z) < 2.2) continue;
      if (water7RoadSignedDist(x, z) < 0.85) continue;

      const dGalleyAng = Math.abs(
        normalizeAngleDiff(ang, WATER7_GALLEY_STATION.angle)
      );
      if (band.r > 63 && band.r * Math.sin(dAngOrZero(dGalleyAng)) < 10.5) {
        continue;
      }

      const dViaductAng = Math.abs(normalizeAngleDiff(ang, WATER7_VIADUCT.angle));
      if (band.r > 63 && band.r * Math.sin(dAngOrZero(dViaductAng)) < 4.5) {
        continue;
      }

      const n = valueNoise2D(x * 0.23, z * 0.23);
      const width = 3.5 + n * 1.4;
      const depth = 3.2 + ((i % 3) * 0.45);
      const height = 3.1 + ((i + band.tier) % 3) * 0.95 + n * 0.8;
      // Orient house front (+Z local) toward the adjacent concentric avenue
      const radialYaw = Math.atan2(x, z);
      const yaw = band.faceOutward ? radialYaw : radialYaw + Math.PI;

      houses.push({
        id: `w7-house-${idx++}`,
        x,
        z,
        y: band.baseY,
        width,
        depth,
        height,
        yaw,
        wallColor: wallPalette[idx % wallPalette.length],
        roofColor: roofPalette[idx % roofPalette.length],
        tier: band.tier,
        hasBalcony: idx % 2 === 0,
      });
    }
  });

  return houses;
}

function dAngOrZero(dAng: number): number {
  return dAng < Math.PI * 0.5 ? dAng : Math.PI * 0.5;
}

/**
 * Generates perimeter shipyard timber cranes matching water_seven_84e9eef9.jpg.
 */
export function buildWater7Cranes(): Water7CraneSpec[] {
  const craneAngles = [0.82, 1.84, 2.75, 3.65, 4.65, 5.72];
  return craneAngles.map((ang, i) => {
    const r = 74.2;
    return {
      id: `w7-crane-${i}`,
      x: Math.cos(ang) * r,
      z: Math.sin(ang) * r,
      y: 2.6,
      yaw: -ang + Math.PI * 0.5,
      scale: 0.95 + (i % 2) * 0.14,
    };
  });
}

export const WATER7_CAMERA_PRESETS: Water7CameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle: 'Water Seven complète · Cité aquatique & Grande Fontaine',
    position: [28, 128, 178],
    target: [0, 14, 0],
    isStreetView: false,
  },
  {
    id: 'canal-bridge',
    label: 'Pont & Canal Central',
    subtitle: 'Vue humaine depuis le pont vers le canal et la Grande Fontaine',
    position: [21.9, 8.9, 53.2],
    target: [10.5, 16.5, 24.5],
    isStreetView: true,
  },
  {
    id: 'tier-street',
    label: 'Ruelle Terrasses · Maisons',
    subtitle: 'Promenade au niveau humain entre les maisons à toits orangés',
    position: [-14.0, 8.2, 56.2],
    target: [8.0, 7.6, 57.0],
    isStreetView: true,
  },
  {
    id: 'dock1-waterfront',
    label: 'Quai & Dock 1 · Galley-La',
    subtitle: 'Façade bleue de Galley-La, Docks 1-2-3 et grues navales',
    position: [36.0, 11.5, 96.0],
    target: [4.0, 7.0, 68.0],
    isStreetView: true,
  },
  {
    id: 'fountain-plaza',
    label: 'Grande Fontaine · Sommet',
    subtitle: 'Vue humaine depuis le boulevard supérieur sous les cascades',
    position: [-18.5, 17.8, 22.0],
    target: [0, 32.0, 0],
    isStreetView: true,
  },
  {
    id: 'blue-station',
    label: 'Blue Station · Umi Ressha',
    subtitle: 'Grand terminal à 4 voies, dôme turquoise et déversoirs',
    position: [19.0, 14.5, 118.0],
    target: [9.5, 8.5, 74.0],
    isStreetView: false,
  },
  {
    id: 'seatrain-viaduct',
    label: 'Viaduc Train des Mers',
    subtitle: 'Rampe côtière vers Enies Lobby et la lagune turquoise',
    position: [84.0, 9.2, 66.0],
    target: [60.0, 5.0, 38.0],
    isStreetView: true,
  },
];
