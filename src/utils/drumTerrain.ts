import { valueNoise2D } from './globeMath';

export const DRUM_WORLD_SIZE = 240;
export const DRUM_GLOBE_SCALE = 0.002;
export const DRUM_GLOBE_CENTER = { u: 0.594, v: 0.478 } as const;
/**
 * 0.028 rad (+ 0.015 blend) covers the 240m Drum Island & surrounding sea-ice floes
 * while staying well clear of Nanimonai (~0.131 rad), Kyuka (~0.140 rad), and Little Garden (~0.153 rad).
 */
export const DRUM_ANGULAR_MASK_RADIUS = 0.028;
/**
 * Aligns Drum Island's beaches & south harbor inlet cleanly with the globe ocean surface mesh.
 */
export const DRUM_SPHERE_SEA_OFFSET = -1.15;

export const DRUM_SHORE_Y = 1.45;
export const DRUM_PLAIN_Y = 2.55;
export const DRUM_LAKE_ICE_Y = 1.95;

export interface DrumTowerSpec {
  id:
    | 'rockie-castle'
    | 'rockie-n'
    | 'rockie-nw'
    | 'rockie-ne'
    | 'rockie-w'
    | 'rockie-e';
  name: string;
  x: number;
  z: number;
  topRadius: number;
  baseRadius: number;
  height: number;
  /** Y where the cylindrical rockie emerges from its foothill skirt. */
  groundY: number;
  hasCastle: boolean;
}

export interface DrumBuildingSpec {
  id: string;
  name: string;
  district:
    | 'bighorn'
    | 'cocoa-weed'
    | 'robelle'
    | 'hiluluk'
    | 'ropeway-station';
  kind:
    | 'bighorn-round'
    | 'cocoa-cottage'
    | 'robelle-wood'
    | 'hiluluk-cabin'
    | 'ropeway-station';
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
}

export interface DrumRopewaySpanSpec {
  id: string;
  label: string;
  start: [number, number, number];
  end: [number, number, number];
  sag: number;
  gondolaCount: number;
}

export interface DrumTreeSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  scale: number;
  yaw: number;
  tint: number;
}

export interface DrumIceFloeSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  rx: number;
  rz: number;
  height: number;
  isRockStack: boolean;
  yaw: number;
}

export interface DrumCameraPreset {
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
 * Signed distance to the southern navigable harbor inlet / cove (< 0 water, > 0 land).
 * Matches Image 1's southern harbor pier bay & Image 2's snowy water approach channel.
 */
export function drumHarborSignedDist(x: number, z: number): number {
  if (z < 64) {
    const cap = Math.hypot((x + 2.0) / 9.5, (z - 67.5) / 8.5);
    return (cap - 1.0) * 9.0;
  }
  const cx = -2.0 + Math.sin((z - 64) * 0.05) * 2.2;
  const hw =
    z <= 80
      ? 9.5 - ((z - 64) / 16) * 1.4
      : 8.1 + smoothstep(80, 98, z) * 32.0;
  const wiggle = (valueNoise2D(x * 0.14 + 1.1, z * 0.14 - 2.3) - 0.5) * 1.3;
  return Math.abs(x - cx) - (hw + wiggle);
}

/**
 * Signed distance to the Great Frozen Lake north of Cocoa Weed (< 0 on frozen ice, > 0 on snowy shore).
 * Centered at (31, 7) with ~28m x 25m organic oval basin.
 */
export function drumFrozenLakeSignedDist(x: number, z: number): number {
  const dx = (x - 31.0) / 13.8;
  const dz = (z - 7.0) / 12.2;
  const ang = Math.atan2(dz, dx);
  const lobeNoise =
    Math.sin(ang * 3.0 + 0.5) * 0.09 +
    Math.cos(ang * 5.0 - 0.8) * 0.05 +
    (valueNoise2D(x * 0.12 + 3.4, z * 0.12 - 1.2) - 0.5) * 0.12;
  return (Math.hypot(dx, dz) - (1.0 + lobeNoise)) * 12.6;
}

/**
 * Outer coastline mask of Drum Island (0 in sea / southern cove, 1 on dry snowy island).
 */
export function sampleDrumCoastMask(x: number, z: number): number {
  const rx = 89.0;
  const rz = 85.0;
  const baseEll = Math.hypot(x / rx, (z + 2.0) / rz);
  const ang = Math.atan2(z, x);
  const harmonic =
    Math.sin(ang * 3.0 + 0.7) * 0.048 +
    Math.cos(ang * 5.0 - 0.5) * 0.032 +
    Math.sin(ang * 7.0 + 1.8) * 0.018;
  const edgeNoise =
    (valueNoise2D(x * 0.06 + 4.1, z * 0.06 - 2.2) - 0.5) * 0.1 +
    (valueNoise2D(x * 0.15 - 1.9, z * 0.15 + 3.8) - 0.5) * 0.045;

  const core = 1 - smoothstep(0.68, 1.02, baseEll - harmonic);
  const rimBand =
    smoothstep(0.06, 0.45, core) * (1 - smoothstep(0.68, 0.94, core));
  let mask = clamp(core + edgeNoise * rimBand, 0, 1);

  // Carve navigable southern harbor inlet up to Bighorn Quay (z ≈ 54..100)
  const harborSd = drumHarborSignedDist(x, z);
  const harborWater = 1 - smoothstep(-3.2, 2.8, harborSd);
  mask *= 1 - harborWater * 0.98;

  // Zero fade before mesh border
  const outerFade = 1 - smoothstep(0.84, 1.0, Math.hypot(x / 104.0, z / 98.0));
  mask *= outerFade;
  return clamp(mask, 0, 1);
}

// Snowy road network linking Harbor Pier -> Bighorn -> Cocoa Weed -> Frozen Lake/Ropeway & Hiluluk -> Robelle
export const DRUM_BIGHORN_AVE: readonly [number, number][] = [
  [-2.0, 56.5],
  [-8.0, 52.0],
  [-12.0, 44.5],
  [-15.5, 36.5],
];

export const DRUM_COCOA_LAKE_ROAD: readonly [number, number][] = [
  [-8.0, 52.0],
  [8.0, 45.5],
  [24.0, 36.0],
  [29.5, 24.5],
  [18.5, 16.0],
  [16.0, 4.0],
  [24.2, -4.5],
];

export const DRUM_HILULUK_ROBELLE_ROAD: readonly [number, number][] = [
  [-12.0, 44.5],
  [-28.0, 44.0],
  [-43.5, 45.5],
  [-45.0, 35.0],
  [-41.5, 25.0],
  [-41.0, 14.5],
];

export const DRUM_ROBELLE_CROSS_LANE: readonly [number, number][] = [
  [-49.5, 19.5],
  [-34.5, 19.5],
];

export const DRUM_FOOTHILL_SPUR_ROAD: readonly [number, number][] = [
  [-15.5, 36.5],
  [-12.0, 22.0],
  [-4.0, 8.0],
];

export function drumRoadSignedDist(x: number, z: number): number {
  let d = distToPolyline2D(x, z, DRUM_BIGHORN_AVE);
  d = Math.min(d, distToPolyline2D(x, z, DRUM_COCOA_LAKE_ROAD));
  d = Math.min(d, distToPolyline2D(x, z, DRUM_HILULUK_ROBELLE_ROAD));
  d = Math.min(d, distToPolyline2D(x, z, DRUM_ROBELLE_CROSS_LANE));
  d = Math.min(d, distToPolyline2D(x, z, DRUM_FOOTHILL_SPUR_ROAD));
  // Harbor landing square around (-4.5, 57.0)
  d = Math.min(d, Math.hypot(x + 4.5, z - 57.0) * 0.72);
  return d - 1.35;
}

/**
 * The 6 iconic cylindrical Drum Rockies (tallest central tower crowned by Drum Castle).
 * Arranged so sea approach from South sees 6 distinct towers with central Castle Peak tallest.
 */
const RAW_DRUM_TOWERS: readonly Omit<DrumTowerSpec, 'groundY'>[] = [
  {
    id: 'rockie-castle',
    name: 'Mont Drum (Château de Drum)',
    x: 0.0,
    z: -22.0,
    topRadius: 18.2,
    baseRadius: 22.5,
    height: 55.0,
    hasCastle: true,
  },
  {
    id: 'rockie-n',
    name: 'Pic Nord-Centre',
    x: -16.0,
    z: -59.0,
    topRadius: 11.4,
    baseRadius: 15.8,
    height: 41.5,
    hasCastle: false,
  },
  {
    id: 'rockie-nw',
    name: 'Tour Nord-Ouest',
    x: -48.0,
    z: -44.0,
    topRadius: 12.0,
    baseRadius: 17.0,
    height: 38.0,
    hasCastle: false,
  },
  {
    id: 'rockie-ne',
    name: 'Tour Nord-Est',
    x: 48.0,
    z: -40.0,
    topRadius: 12.2,
    baseRadius: 17.5,
    height: 39.5,
    hasCastle: false,
  },
  {
    id: 'rockie-w',
    name: 'Tour Ouest',
    x: -60.0,
    z: -6.0,
    topRadius: 11.0,
    baseRadius: 15.2,
    height: 33.5,
    hasCastle: false,
  },
  {
    id: 'rockie-e',
    name: 'Tour Est',
    x: 68.0,
    z: 4.0,
    topRadius: 11.6,
    baseRadius: 16.5,
    height: 35.0,
    hasCastle: false,
  },
];

/**
 * Full procedural terrain elevation map for Drum Island (excluding vertical cylindrical Drum Rockie shafts,
 * which are sculpted as dedicated high-detail cliff cylinders rising seamlessly from these foothills):
 * - Underwater sea & harbor channel: -5.6m
 * - Harbor beaches & coastal plain: +1.6m -> +2.9m
 * - Great Frozen Lake (north of Cocoa Weed): flat +1.95m ice basin
 * - Snowy village & forest plains (Bighorn, Cocoa Weed, Robelle, Hiluluk outskirts): +2.4m -> +3.8m
 * - Craggy alpine foothills ringing the 6 Drum Rockies: +6.5m -> +16.0m
 */
export function sampleDrumHeight(x: number, z: number): number {
  const coast = sampleDrumCoastMask(x, z);
  const baseSea = -5.6 + (valueNoise2D(x * 0.08, z * 0.08) - 0.5) * 0.2;
  if (coast <= 0.01) return baseSea;

  const subT = smoothstep(0.02, 0.22, coast);
  const shoreT = smoothstep(0.18, 0.42, coast);
  const plainT = smoothstep(0.32, 0.65, coast);
  let h = baseSea + subT * 5.2 + shoreT * 2.15 + plainT * 1.15; // -5.6 -> +2.9

  // Rolling snowdrifts & winter meadow undulations
  const driftA = valueNoise2D(x * 0.055 + 2.4, z * 0.055 - 1.7);
  const driftB = valueNoise2D(x * 0.14 - 3.1, z * 0.14 + 4.3);
  h += (driftA * 1.25 + driftB * 0.45 - 0.55) * smoothstep(0.45, 0.85, coast);

  // Alpine rocky foothills & ridges rising around the bases of the 6 Drum Rockies (matching Image 2 & 4)
  for (const t of RAW_DRUM_TOWERS) {
    const d = Math.hypot(x - t.x, z - t.z);
    const outerSkirt = t.baseRadius * 1.65;
    if (d < outerSkirt && coast > 0.35) {
      const f = 1 - smoothstep(t.baseRadius * 0.52, outerSkirt, d);
      const crag =
        valueNoise2D(x * 0.12 + t.x * 0.1, z * 0.12 - t.z * 0.1) * 2.8 +
        valueNoise2D(x * 0.26, z * 0.26) * 1.2;
      const peakLift = t.hasCastle ? 10.2 : 7.8;
      h = Math.max(h, DRUM_PLAIN_Y + f * peakLift + f * crag);
    }
  }

  // Smooth Bighorn, Cocoa Weed, Robelle & Hiluluk snowy plains so houses & streets sit naturally
  const bighornZone =
    smoothstep(-32, -24, x) *
    (1 - smoothstep(12, 20, x)) *
    smoothstep(34, 42, z) *
    (1 - smoothstep(63, 70, z));
  const cocoaZone =
    smoothstep(14, 21, x) *
    (1 - smoothstep(42, 48, x)) *
    smoothstep(22, 27, z) *
    (1 - smoothstep(41, 47, z));
  const robelleZone =
    smoothstep(-56, -48, x) *
    (1 - smoothstep(-28, -22, x)) *
    smoothstep(6, 12, z) *
    (1 - smoothstep(32, 38, z));
  const hilulukZone = 1 - smoothstep(6.0, 15.0, Math.hypot(x + 51.0, z - 46.0));
  const stationZone = 1 - smoothstep(4.5, 9.5, Math.hypot(x - 24.2, z + 7.8));
  const settleMask = clamp(
    Math.max(bighornZone, cocoaZone, robelleZone, hilulukZone, stationZone),
    0,
    1
  );
  if (settleMask > 0.01 && coast > 0.38) {
    const targetVillageY =
      DRUM_PLAIN_Y + 0.15 + smoothstep(60, 15, z) * 0.75 + (driftB - 0.5) * 0.14;
    h = h * (1 - settleMask * 0.85) + targetVillageY * (settleMask * 0.85);
  }

  // Great Frozen Lake flat icy basin north of Cocoa Weed
  const lakeSd = drumFrozenLakeSignedDist(x, z);
  if (lakeSd < 3.6 && coast > 0.45) {
    const iceT = 1 - smoothstep(-1.4, 3.6, lakeSd);
    h = h * (1 - iceT) + DRUM_LAKE_ICE_Y * iceT;
  }

  // Smooth walkable snow road grading
  const rDist = drumRoadSignedDist(x, z);
  const harborSd = drumHarborSignedDist(x, z);
  if (rDist < 1.6 && harborSd > 0.8 && coast > 0.4) {
    const rT = 1 - smoothstep(-0.2, 1.6, rDist);
    const roadY = clamp(h, DRUM_PLAIN_Y - 0.15, DRUM_PLAIN_Y + 2.4);
    h = h * (1 - rT * 0.6) + roadY * (rT * 0.6);
  }

  return h;
}

export const DRUM_TOWERS: readonly DrumTowerSpec[] = RAW_DRUM_TOWERS.map((t) => ({
  ...t,
  groundY: sampleDrumHeight(t.x, t.z),
}));

/**
 * Walkable surface height including the flat snow summit plateau of the Central Castle Rockie
 * so human-scale exploration & WASD walking also work cleanly inside the Castle courtyard!
 */
export function sampleDrumWalkSurfaceHeight(x: number, z: number): number {
  const castleTower = DRUM_TOWERS[0];
  const distCastle = Math.hypot(x - castleTower.x, z - castleTower.z);
  if (distCastle < castleTower.topRadius - 0.6) {
    return castleTower.height;
  }
  return Math.max(sampleDrumHeight(x, z), DRUM_SHORE_Y);
}

/**
 * Houses & landmarks across Drum Island:
 * - 12 Bighorn round brick houses with snow-ringed conical roofs (harbor entry village)
 * - 5 Cocoa Weed timber cottages (south of the Great Frozen Lake)
 * - 10 Robelle densely-packed dark-timber buildings (western valley)
 * - Dr. Hiluluk's isolated cabin/clinic (outskirts of Bighorn at snowy forest & foothill edge)
 * - Ropeway Lower Terminus Station (north of Cocoa Weed on shore of Great Frozen Lake)
 */
const RAW_DRUM_BUILDINGS: readonly Omit<DrumBuildingSpec, 'y'>[] = [
  // --- 1. VILLAGE DE BIGHORN (12 round cylindrical houses at harbor entrance, Image 4) ---
  {
    id: 'bh-round-1',
    name: 'Maison Ronde du Quai Est',
    district: 'bighorn',
    kind: 'bighorn-round',
    x: 4.5,
    z: 56.5,
    radius: 2.35,
    width: 4.7,
    depth: 4.7,
    wallHeight: 3.1,
    roofHeight: 3.8,
    yaw: -2.4,
    wallColor: 0xc27b72,
    roofColor: 0x5c6f46,
  },
  {
    id: 'bh-round-2',
    name: 'Maison Ronde du Port',
    district: 'bighorn',
    kind: 'bighorn-round',
    x: 9.8,
    z: 52.8,
    radius: 2.25,
    width: 4.5,
    depth: 4.5,
    wallHeight: 3.0,
    roofHeight: 3.6,
    yaw: -2.1,
    wallColor: 0xc9847a,
    roofColor: 0x62754a,
  },
  {
    id: 'bh-round-3',
    name: 'Maison Ronde Centrale Est',
    district: 'bighorn',
    kind: 'bighorn-round',
    x: 0.5,
    z: 53.2,
    radius: 2.45,
    width: 4.9,
    depth: 4.9,
    wallHeight: 3.25,
    roofHeight: 3.9,
    yaw: -2.7,
    wallColor: 0xbd766e,
    roofColor: 0x576a42,
  },
  {
    id: 'bh-round-4',
    name: 'Maison Ronde Sud-Ouest',
    district: 'bighorn',
    kind: 'bighorn-round',
    x: -14.2,
    z: 58.2,
    radius: 2.35,
    width: 4.7,
    depth: 4.7,
    wallHeight: 3.1,
    roofHeight: 3.8,
    yaw: 0.75,
    wallColor: 0xc68278,
    roofColor: 0x5e7147,
  },
  {
    id: 'bh-round-5',
    name: 'Auberge Ronde de Bighorn',
    district: 'bighorn',
    kind: 'bighorn-round',
    x: -17.0,
    z: 51.0,
    radius: 2.55,
    width: 5.1,
    depth: 5.1,
    wallHeight: 3.4,
    roofHeight: 4.1,
    yaw: 1.05,
    wallColor: 0xbf7870,
    roofColor: 0x5a6c44,
  },
  {
    id: 'bh-round-6',
    name: 'Maison Ronde de la Place',
    district: 'bighorn',
    kind: 'bighorn-round',
    x: -22.5,
    z: 54.5,
    radius: 2.2,
    width: 4.4,
    depth: 4.4,
    wallHeight: 2.95,
    roofHeight: 3.5,
    yaw: 0.9,
    wallColor: 0xb7726a,
    roofColor: 0x617349,
  },
  {
    id: 'bh-round-7',
    name: 'Maison Ronde de Dalton',
    district: 'bighorn',
    kind: 'bighorn-round',
    x: -5.8,
    z: 41.2,
    radius: 2.45,
    width: 4.9,
    depth: 4.9,
    wallHeight: 3.25,
    roofHeight: 3.9,
    yaw: -2.4,
    wallColor: 0xc58076,
    roofColor: 0x596b43,
  },
  {
    id: 'bh-round-8',
    name: 'Maison Ronde du Carrefour',
    district: 'bighorn',
    kind: 'bighorn-round',
    x: -19.8,
    z: 40.5,
    radius: 2.35,
    width: 4.7,
    depth: 4.7,
    wallHeight: 3.1,
    roofHeight: 3.8,
    yaw: 1.2,
    wallColor: 0xbe786f,
    roofColor: 0x62744a,
  },
  {
    id: 'bh-round-9',
    name: 'Maison Ronde Nord-Ouest',
    district: 'bighorn',
    kind: 'bighorn-round',
    x: -24.5,
    z: 48.2,
    radius: 2.25,
    width: 4.5,
    depth: 4.5,
    wallHeight: 3.0,
    roofHeight: 3.65,
    yaw: 0.55,
    wallColor: 0xc8847b,
    roofColor: 0x576942,
  },
  {
    id: 'bh-round-10',
    name: 'Maison Ronde Nord',
    district: 'bighorn',
    kind: 'bighorn-round',
    x: -10.5,
    z: 35.8,
    radius: 2.3,
    width: 4.6,
    depth: 4.6,
    wallHeight: 3.05,
    roofHeight: 3.7,
    yaw: -2.3,
    wallColor: 0xba746c,
    roofColor: 0x5f7148,
  },
  {
    id: 'bh-round-11',
    name: 'Maison Ronde de la Lisère',
    district: 'bighorn',
    kind: 'bighorn-round',
    x: -22.2,
    z: 34.0,
    radius: 2.25,
    width: 4.5,
    depth: 4.5,
    wallHeight: 3.0,
    roofHeight: 3.6,
    yaw: 1.3,
    wallColor: 0xc47e74,
    roofColor: 0x5b6d45,
  },
  {
    id: 'bh-round-12',
    name: 'Maison Ronde du Phare Neigeux',
    district: 'bighorn',
    kind: 'bighorn-round',
    x: 4.2,
    z: 42.0,
    radius: 2.2,
    width: 4.4,
    depth: 4.4,
    wallHeight: 2.95,
    roofHeight: 3.55,
    yaw: -2.8,
    wallColor: 0xc07a71,
    roofColor: 0x63764b,
  },

  // --- 2. VILLAGE DE COCOA WEED (South of the Great Frozen Lake, 5 cottages) ---
  {
    id: 'cw-house-1',
    name: 'Chalet Sud de Cocoa Weed',
    district: 'cocoa-weed',
    kind: 'cocoa-cottage',
    x: 22.2,
    z: 41.2,
    radius: 2.3,
    width: 4.2,
    depth: 3.8,
    wallHeight: 2.9,
    roofHeight: 2.3,
    yaw: -0.35,
    wallColor: 0xb99d7c,
    roofColor: 0x4b5d6c,
  },
  {
    id: 'cw-house-2',
    name: 'Auberge de Cocoa Weed',
    district: 'cocoa-weed',
    kind: 'cocoa-cottage',
    x: 30.8,
    z: 36.2,
    radius: 2.6,
    width: 4.8,
    depth: 4.2,
    wallHeight: 3.1,
    roofHeight: 2.5,
    yaw: -2.35,
    wallColor: 0xc5aa88,
    roofColor: 0x536675,
  },
  {
    id: 'cw-house-3',
    name: 'Maison de la Rive du Lac',
    district: 'cocoa-weed',
    kind: 'cocoa-cottage',
    x: 23.8,
    z: 27.5,
    radius: 2.3,
    width: 4.1,
    depth: 3.8,
    wallHeight: 2.85,
    roofHeight: 2.25,
    yaw: 1.25,
    wallColor: 0xaf9373,
    roofColor: 0x485968,
  },
  {
    id: 'cw-house-4',
    name: 'Chalet Est de Cocoa Weed',
    district: 'cocoa-weed',
    kind: 'cocoa-cottage',
    x: 34.5,
    z: 27.2,
    radius: 2.35,
    width: 4.3,
    depth: 3.8,
    wallHeight: 2.9,
    roofHeight: 2.3,
    yaw: -1.75,
    wallColor: 0xbda282,
    roofColor: 0x506271,
  },
  {
    id: 'cw-house-5',
    name: 'Entrepôt de Cocoa Weed',
    district: 'cocoa-weed',
    kind: 'cocoa-cottage',
    x: 37.8,
    z: 33.8,
    radius: 2.2,
    width: 4.0,
    depth: 3.6,
    wallHeight: 2.75,
    roofHeight: 2.1,
    yaw: -2.6,
    wallColor: 0xa78b6b,
    roofColor: 0x455664,
  },

  // --- 3. TERMINUS DU TÉLÉPHÉRIQUE (North of Cocoa Weed, shore of Great Frozen Lake) ---
  {
    id: 'ropeway-lake-station',
    name: 'Gare Basse du Téléphérique de Drum',
    district: 'ropeway-station',
    kind: 'ropeway-station',
    x: 24.2,
    z: -7.8,
    radius: 3.6,
    width: 6.4,
    depth: 5.4,
    wallHeight: 3.8,
    roofHeight: 2.8,
    yaw: 2.25, // Faces SE across the Great Frozen Lake while cables climb NW toward Castle
    wallColor: 0x8b6240,
    roofColor: 0x3b6e68,
  },

  // --- 4. CLINIQUE / CABANE DU DR. HILULUK (Outskirts of Bighorn, forest edge in lower foothills) ---
  {
    id: 'hiluluk-clinic',
    name: 'Cabane & Clinique du Dr. Hiluluk',
    district: 'hiluluk',
    kind: 'hiluluk-cabin',
    x: -51.5,
    z: 46.5,
    radius: 3.2,
    width: 5.4,
    depth: 4.6,
    wallHeight: 3.2,
    roofHeight: 2.9,
    yaw: 1.55, // Porch & Sakura flag face east toward the forest trail
    wallColor: 0x9b6b45,
    roofColor: 0x5d4433,
  },

  // --- 5. VILLE DE ROBELLE (10 tightly packed wooden buildings along narrow alleys) ---
  {
    id: 'robelle-1',
    name: 'Maison en Bois Robelle Sud-Ouest',
    district: 'robelle',
    kind: 'robelle-wood',
    x: -48.5,
    z: 24.5,
    radius: 1.9,
    width: 3.5,
    depth: 3.3,
    wallHeight: 3.1,
    roofHeight: 2.2,
    yaw: 0.08,
    wallColor: 0x825739,
    roofColor: 0x4f3928,
  },
  {
    id: 'robelle-2',
    name: 'Atelier en Bois de Robelle',
    district: 'robelle',
    kind: 'robelle-wood',
    x: -44.0,
    z: 24.6,
    radius: 1.9,
    width: 3.4,
    depth: 3.3,
    wallHeight: 3.3,
    roofHeight: 2.3,
    yaw: -0.04,
    wallColor: 0x764d31,
    roofColor: 0x473324,
  },
  {
    id: 'robelle-3',
    name: 'Auberge de Bois Robelle',
    district: 'robelle',
    kind: 'robelle-wood',
    x: -37.2,
    z: 24.5,
    radius: 2.0,
    width: 3.7,
    depth: 3.4,
    wallHeight: 3.4,
    roofHeight: 2.4,
    yaw: -1.5,
    wallColor: 0x8b5f3f,
    roofColor: 0x523b2a,
  },
  {
    id: 'robelle-4',
    name: 'Maison Serrée Ruelle Nord',
    district: 'robelle',
    kind: 'robelle-wood',
    x: -48.2,
    z: 14.8,
    radius: 1.9,
    width: 3.5,
    depth: 3.2,
    wallHeight: 3.2,
    roofHeight: 2.25,
    yaw: 3.05,
    wallColor: 0x7a5134,
    roofColor: 0x4b3626,
  },
  {
    id: 'robelle-5',
    name: 'Maison Serrée Centre',
    district: 'robelle',
    kind: 'robelle-wood',
    x: -43.8,
    z: 14.6,
    radius: 1.95,
    width: 3.4,
    depth: 3.4,
    wallHeight: 3.5,
    roofHeight: 2.45,
    yaw: 3.12,
    wallColor: 0x8d6141,
    roofColor: 0x543c2b,
  },
  {
    id: 'robelle-6',
    name: 'Boutique en Bois de Robelle',
    district: 'robelle',
    kind: 'robelle-wood',
    x: -37.4,
    z: 15.0,
    radius: 1.9,
    width: 3.5,
    depth: 3.3,
    wallHeight: 3.15,
    roofHeight: 2.2,
    yaw: -1.62,
    wallColor: 0x734b30,
    roofColor: 0x463223,
  },
  {
    id: 'robelle-7',
    name: 'Maison Pignon Nord',
    district: 'robelle',
    kind: 'robelle-wood',
    x: -46.8,
    z: 9.8,
    radius: 1.9,
    width: 3.5,
    depth: 3.2,
    wallHeight: 3.0,
    roofHeight: 2.2,
    yaw: 0.12,
    wallColor: 0x84593b,
    roofColor: 0x4d3828,
  },
  {
    id: 'robelle-8',
    name: 'Bâtisse Charpentée Est',
    district: 'robelle',
    kind: 'robelle-wood',
    x: -41.5,
    z: 9.5,
    radius: 1.95,
    width: 3.6,
    depth: 3.2,
    wallHeight: 3.3,
    roofHeight: 2.35,
    yaw: -0.08,
    wallColor: 0x795033,
    roofColor: 0x493425,
  },
  {
    id: 'robelle-9',
    name: 'Maison du Passage Est',
    district: 'robelle',
    kind: 'robelle-wood',
    x: -36.5,
    z: 9.8,
    radius: 1.85,
    width: 3.4,
    depth: 3.1,
    wallHeight: 3.05,
    roofHeight: 2.15,
    yaw: -1.42,
    wallColor: 0x895e3e,
    roofColor: 0x513b29,
  },
  {
    id: 'robelle-10',
    name: 'Remise en Bois de Robelle',
    district: 'robelle',
    kind: 'robelle-wood',
    x: -32.2,
    z: 21.8,
    radius: 1.85,
    width: 3.3,
    depth: 3.4,
    wallHeight: 2.95,
    roofHeight: 2.1,
    yaw: -1.58,
    wallColor: 0x714a2f,
    roofColor: 0x443022,
  },
];

export const DRUM_BUILDINGS: readonly DrumBuildingSpec[] =
  RAW_DRUM_BUILDINGS.map((b) => ({
    ...b,
    y: sampleDrumHeight(b.x, b.z) - 0.12,
  }));

export const DRUM_LANDMARKS = {
  castleTower: DRUM_TOWERS[0],
  hilulukClinic: DRUM_BUILDINGS.find((b) => b.id === 'hiluluk-clinic')!,
  ropewayLakeStation: DRUM_BUILDINGS.find(
    (b) => b.id === 'ropeway-lake-station'
  )!,
  harborPier: { x: -2.0, z: 60.2, yaw: 0.06 },
  frozenLakeCenter: { x: 31.0, z: 7.0 },
  bighornPlaza: { x: -10.5, z: 48.0 },
  robelleCenter: { x: -41.5, z: 19.5 },
} as const;

/**
 * Three dramatic alpine ropeway spans radiating from Drum Castle summit:
 * 1. Main Castle Summit <-> Great Frozen Lake Terminus Station (north of Cocoa Weed)
 * 2. Castle Summit <-> West Drum Rockie Relay
 * 3. Castle Summit <-> North-East Drum Rockie Relay
 */
export const DRUM_ROPEWAY_SPANS: readonly DrumRopewaySpanSpec[] = [
  {
    id: 'ropeway-lake-main',
    label: 'Téléphérique Château — Lac Gelé',
    start: [10.5, 55.2, -14.2],
    end: [24.2, sampleDrumHeight(24.2, -7.8) + 4.2, -7.8],
    sag: 3.8,
    gondolaCount: 3,
  },
  {
    id: 'ropeway-west-relay',
    label: 'Téléphérique Château — Tour Ouest',
    start: [-11.5, 54.8, -16.5],
    end: [-52.5, 33.8, -6.5],
    sag: 4.2,
    gondolaCount: 2,
  },
  {
    id: 'ropeway-ne-relay',
    label: 'Téléphérique Château — Tour Nord-Est',
    start: [11.2, 54.8, -26.5],
    end: [41.5, 39.2, -41.0],
    sag: 4.1,
    gondolaCount: 2,
  },
];

export function buildDrumTrees(): DrumTreeSpec[] {
  const trees: DrumTreeSpec[] = [];
  let idx = 0;
  const total = 440;
  for (let i = 0; i < total; i++) {
    const ang = i * 2.399963 + 0.35;
    const rad = 12 + Math.sqrt((i + 0.5) / total) * 72;
    const x = Math.cos(ang) * rad * 1.05;
    const z = Math.sin(ang) * rad * 0.94;

    const coast = sampleDrumCoastMask(x, z);
    if (coast < 0.5) continue;
    if (drumHarborSignedDist(x, z) < 2.5) continue;
    if (drumFrozenLakeSignedDist(x, z) < 1.8) continue;
    if (drumRoadSignedDist(x, z) < 1.55) continue;

    // Keep clear of buildings
    let nearBuilding = false;
    for (const b of DRUM_BUILDINGS) {
      if (Math.hypot(x - b.x, z - b.z) < b.radius + 2.2) {
        nearBuilding = true;
        break;
      }
    }
    if (nearBuilding) continue;

    // Keep clear of sheer cylindrical Drum Rockie shafts (allow foothills around their skirts!)
    let insideRockie = false;
    for (const t of DRUM_TOWERS) {
      if (Math.hypot(x - t.x, z - t.z) < t.baseRadius + 1.4) {
        insideRockie = true;
        break;
      }
    }
    if (insideRockie) continue;

    const y = sampleDrumHeight(x, z);
    if (y < 2.0 || y > 13.5) continue;

    // Higher forest density around Frozen Lake, Hiluluk's forest edge, Robelle & foothills
    const nearHilulukForest = Math.hypot(x + 56, z - 44) < 22;
    const nearLakeForest = Math.hypot(x - 31, z - 7) < 28;
    const nearRobelleForest = Math.hypot(x + 48, z - 18) < 22;
    const densityGate = valueNoise2D(x * 0.085 + 1.9, z * 0.085 - 2.4);
    if (
      !nearHilulukForest &&
      !nearLakeForest &&
      !nearRobelleForest &&
      densityGate < 0.44
    ) {
      continue;
    }

    trees.push({
      id: `drum-tree-${idx++}`,
      x,
      z,
      y: y - 0.1,
      scale: 0.8 + (i % 5) * 0.16,
      yaw: (i * 1.47) % (Math.PI * 2),
      tint: 0.84 + valueNoise2D(x * 0.25, z * 0.25) * 0.28,
    });
  }

  // Hand-placed snowy pines framing Dr. Hiluluk's Clinic & Bighorn avenue (Image 4)
  const heroPines: readonly [number, number, number][] = [
    [-58.5, 42.5, 1.35],
    [-58.0, 50.2, 1.25],
    [-54.8, 54.8, 1.3],
    [-47.2, 54.5, 1.15],
    [-57.2, 38.2, 1.4],
    [-28.5, 52.5, 1.15],
    [13.5, 48.0, 1.15],
    [35.0, -7.5, 1.3],
    [17.5, -13.5, 1.28],
    [43.2, 14.0, 1.25],
  ];
  for (const [hx, hz, hs] of heroPines) {
    trees.push({
      id: `drum-tree-${idx++}`,
      x: hx,
      z: hz,
      y: sampleDrumHeight(hx, hz) - 0.1,
      scale: hs,
      yaw: (idx * 0.9) % (Math.PI * 2),
      tint: 0.96,
    });
  }

  return trees;
}

export const DRUM_TREES: readonly DrumTreeSpec[] = buildDrumTrees();

export function buildDrumIceFloes(): DrumIceFloeSpec[] {
  const floes: DrumIceFloeSpec[] = [
    // Prominent snowy coastal rock stack off SW harbor entrance (Image 1 bottom-left)
    {
      id: 'ice-stack-sw',
      x: -44.0,
      z: 74.0,
      y: 0.4,
      rx: 8.5,
      rz: 7.0,
      height: 7.2,
      isRockStack: true,
      yaw: 0.3,
    },
    {
      id: 'ice-stack-se',
      x: 42.0,
      z: 70.0,
      y: 0.4,
      rx: 9.2,
      rz: 6.5,
      height: 6.0,
      isRockStack: true,
      yaw: -0.45,
    },
    {
      id: 'ice-stack-w',
      x: -94.0,
      z: 18.0,
      y: 0.4,
      rx: 6.0,
      rz: 5.2,
      height: 5.4,
      isRockStack: true,
      yaw: 1.1,
    },
  ];

  const ringCoords: readonly [number, number, number, number][] = [
    [-72, 64, 4.8, 3.6],
    [-26, 86, 4.2, 3.2],
    [18, 84, 4.6, 3.5],
    [66, 62, 5.2, 3.8],
    [88, 34, 4.4, 3.4],
    [94, -18, 5.0, 3.6],
    [76, -64, 4.6, 3.3],
    [22, -88, 5.2, 3.9],
    [-34, -86, 4.8, 3.4],
    [-78, -56, 5.0, 3.8],
    [-96, -12, 4.5, 3.2],
    [-82, 44, 4.2, 3.1],
    [4, 92, 3.8, 2.8],
    [54, 78, 4.0, 3.0],
  ];

  ringCoords.forEach(([x, z, rx, rz], i) => {
    floes.push({
      id: `ice-floe-${i}`,
      x,
      z,
      y: 0.95,
      rx,
      rz,
      height: 0.75 + (i % 3) * 0.2,
      isRockStack: false,
      yaw: (i * 0.85) % (Math.PI * 2),
    });
  });

  return floes;
}

export const DRUM_ICE_FLOES: readonly DrumIceFloeSpec[] = buildDrumIceFloes();

export function toDrumSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * DRUM_GLOBE_SCALE;
  const sz = z * DRUM_GLOBE_SCALE;
  const rTarget =
    globeRadius + (y + DRUM_SPHERE_SEA_OFFSET) * DRUM_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * 7 curated camera presets covering Aerial Overview (Image 1), Water Approach (Image 2),
 * Human-scale street views of Bighorn (Image 4), Dr. Hiluluk's Clinic, Robelle,
 * Great Frozen Lake & Ropeway Terminus (north of Cocoa Weed), and Drum Castle Summit (Image 3).
 */
export const DRUM_CAMERA_PRESETS: DrumCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle:
      "Île de Drum · 6 montagnes cylindriques Drum Rockies, Château de Drum au sommet, Téléphérique, Bighorn, Cocoa Weed, Lac Gelé, Robelle et clinique d'Hiluluk",
    position: [6, 114, 130],
    target: [0, 16.5, -4],
    isStreetView: false,
  },
  {
    id: 'water-approach',
    label: 'Approche Maritime',
    subtitle:
      "Entrée par la passe maritime glacée face aux forêts enneigées et à la silhouette des 6 tours Drum Rockies",
    position: [-2.0, 11.5, 94.0],
    target: [-2.0, 18.0, -14.0],
    isStreetView: false,
  },
  {
    id: 'bighorn-street',
    label: 'Bighorn · Maisons Rondes (Humain)',
    subtitle:
      "À hauteur d'homme (1,75 m) dans la rue enneigée de Bighorn entre les maisons rondes à toits coniques cerclés de neige, face aux Drum Rockies",
    position: [
      -9.2,
      sampleDrumWalkSurfaceHeight(-9.2, 52.8) + 1.75,
      52.8,
    ],
    target: [-13.5, sampleDrumWalkSurfaceHeight(-13.5, 38.0) + 4.8, 36.0],
    isStreetView: true,
  },
  {
    id: 'hiluluk-cabin',
    label: 'Clinique Dr. Hiluluk (Humain)',
    subtitle:
      "À hauteur d'homme (1,75 m) à l'écart de Bighorn, en bordure de forêt enneigée au pied des montagnes devant la cabane et le drapeau Sakura d'Hiluluk",
    position: [
      -38.2,
      sampleDrumWalkSurfaceHeight(-38.2, 48.2) + 1.75,
      48.2,
    ],
    target: [
      DRUM_LANDMARKS.hilulukClinic.x,
      DRUM_LANDMARKS.hilulukClinic.y + 3.0,
      DRUM_LANDMARKS.hilulukClinic.z,
    ],
    isStreetView: true,
  },
  {
    id: 'robelle-town',
    label: 'Ville de Robelle (Humain)',
    subtitle:
      "À hauteur d'homme (1,75 m) dans les ruelles étroites de Robelle bordées de bâtiments en bois resserrés",
    position: [
      -41.0,
      sampleDrumWalkSurfaceHeight(-41.0, 31.2) + 1.75,
      31.2,
    ],
    target: [-41.0, sampleDrumWalkSurfaceHeight(-41.0, 14.5) + 2.6, 14.5],
    isStreetView: true,
  },
  {
    id: 'frozen-lake-ropeway',
    label: 'Lac Gelé & Téléphérique (Humain)',
    subtitle:
      "À hauteur d'homme (1,75 m) au nord de Cocoa Weed, sur la rive sud-est du grand lac gelé face à la gare du téléphérique et aux câbles montant au château",
    position: [
      40.0,
      sampleDrumWalkSurfaceHeight(40.0, 18.5) + 1.75,
      18.5,
    ],
    target: [24.0, 6.2, -7.8],
    isStreetView: true,
  },
  {
    id: 'drum-castle',
    label: 'Château de Drum (Sommet)',
    subtitle:
      "À hauteur d'homme (1,75 m) sur l'esplanade enneigée du mont central devant les remparts et tourelles turquoise du Château de Drum",
    position: [
      5.2,
      sampleDrumWalkSurfaceHeight(5.2, -5.2) + 1.75,
      -5.2,
    ],
    target: [-0.4, 62.2, -24.5],
    isStreetView: true,
  },
];
