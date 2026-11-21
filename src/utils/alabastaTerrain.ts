import { ridgedFbm2D, valueNoise2D } from './globeMath';

export const ALABASTA_WORLD_SIZE = 360;
export const ALABASTA_GLOBE_SCALE = 0.0028;
export const ALABASTA_GLOBE_CENTER = { u: 0.635, v: 0.486 } as const;
export const ALABASTA_ANGULAR_MASK_RADIUS = 0.095;

export function toAlabastaSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * ALABASTA_GLOBE_SCALE;
  const sz = z * ALABASTA_GLOBE_SCALE;
  const rTarget = globeRadius + y * ALABASTA_GLOBE_SCALE;
  const sy = Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) - globeRadius;
  return { x: sx, y: sy, z: sz };
}

export const ALUBARNA_CENTER = { x: 95, z: -38 } as const;
export const ALUBARNA_PLATEAU_Y = 15.0;
export const ALUBARNA_WALL_RADIUS = 32.5;
export const ALUBARNA_MESA_RADIUS = 36.0;

export const NANOHANA_CENTER = { x: 34, z: 114 } as const;
export const RAINBASE_CENTER = { x: 80, z: 61 } as const;
export const KATOREA_CENTER = { x: 126, z: 114 } as const;
export const ERUMALU_CENTER = { x: -40, z: 96 } as const;
export const YUBA_CENTER = { x: -126, z: 4 } as const;
export const SPIDERS_CAFE_CENTER = { x: -32, z: -86 } as const;

export interface AlabastaBuildingSpec {
  x: number;
  z: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  yaw: number;
  tint: number;
  hasAwning: boolean;
  awningHue: 'terracotta' | 'indigo' | 'ochre';
  hasRoofTower: boolean;
  isRuined?: boolean;
}

export interface AlabastaPalmSpec {
  x: number;
  z: number;
  y: number;
  height: number;
  lean: number;
  yaw: number;
}

export interface AlabastaCameraPreset {
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
 * Computes signed distance to the Alabasta island outer perimeter (< 0 inside land, > 0 offshore)
 * calibrated directly against arabasta_bcb2f136.jpg.
 */
export function alabastaCoastSignedDist(x: number, z: number): number {
  // Base elliptical-diamond landmass footprint
  const nx = (x - 4) / 146;
  const nz = (z - 4) / 146;
  const ang = Math.atan2(nz, nx);
  const r = Math.hypot(nx, nz);

  // Subtle multi-harmonic coastline lobes matching the attached reference image
  const lobeScale =
    0.94 +
    0.09 * Math.cos(ang * 2 - 0.5) -
    0.08 * Math.cos(ang * 3 + 0.4) +
    0.05 * Math.sin(ang * 4 - 0.8) +
    0.04 * Math.cos(ang * 5 + 1.1);

  let d = (r - lobeScale) * 138;

  // Carve Northern Estuary Funnel around x in [-42..20], z < -118
  const northMouth = distToSegment(x, z, -38, -155, 8, -110);
  if (northMouth.dist < 22) {
    d = Math.max(d, 20 - northMouth.dist);
  }

  // Carve Nanohana Bay crescent (south central-east)
  const nanohanaBay = Math.hypot(x - 32, z - 146) - 24;
  if (nanohanaBay < 0) {
    d = Math.max(d, -nanohanaBay);
  }

  // Carve Southwestern sandy bay south of Erumalu
  const erumaluBay = Math.hypot((x + 48) * 0.65, z - 142) - 26;
  if (erumaluBay < 0) {
    d = Math.max(d, -erumaluBay);
  }

  // Extend the Southwestern cliff headland toward bottom-left (-172, +162)
  const swPeninsula = distToSegment(x, z, -115, 95, -175, 168);
  const swWidth = 26 * (1 - swPeninsula.t * 0.45);
  d = Math.min(d, swPeninsula.dist - swWidth);

  // Extend the Northern Delta rocky peninsula (ix: 0.52..0.77, iy: 0.06..0.16)
  const northPeninsula = distToSegment(x, z, 22, -148, 92, -126);
  d = Math.min(d, northPeninsula.dist - 21);

  // Extend the Southeastern Katorea headland
  const katoreaHeadland = Math.hypot(x - 126, z - 118) - 34;
  d = Math.min(d, katoreaHeadland);

  // Ensure rich golden dunes surround Alubarna on the east coast (matching aerial photo)
  const alubarnaEastDunes = Math.hypot((x - 102) * 0.88, z + 38) - 47;
  d = Math.min(d, alubarnaEastDunes);

  // Fine organic rocky coastline perturbation
  const coastNoise = (valueNoise2D(x * 0.045 + 11.3, z * 0.045 + 5.7) - 0.5) * 9.5;
  return d + coastNoise;
}

/**
 * Signed distance to the Sandora River & Northern Braided Delta channels (< 0 inside river water).
 */
export function sandoraRiverSignedDist(x: number, z: number): number {
  // Main trunk from south mouth (-12, 155) -> center (12, -10) -> delta split (10, -82) -> NW mouth (-38, -155)
  const s1 = distToSegment(x, z, -14, 162, 4, 52);
  const s2 = distToSegment(x, z, 4, 52, 14, -22);
  const s3 = distToSegment(x, z, 14, -22, 10, -80);
  const s4 = distToSegment(x, z, 10, -80, -38, -156);

  const w1 = 12.5 - s1.t * 4.0;
  const w2 = 8.5;
  const w3 = 8.0;
  const w4 = 7.5 + s4.t * 3.5;

  let d = Math.min(s1.dist - w1, s2.dist - w2, s3.dist - w3, s4.dist - w4);

  // Eastern braided delta channel curving NE past northern dunes
  const e1 = distToSegment(x, z, 10, -78, 56, -102);
  const e2 = distToSegment(x, z, 56, -102, 114, -124);
  d = Math.min(d, e1.dist - 4.8, e2.dist - 5.4);

  // Central braided delta forks creating the 3 green marsh delta islands
  const c1 = distToSegment(x, z, 18, -86, 46, -124);
  const c2 = distToSegment(x, z, 38, -96, 26, -126);
  d = Math.min(d, c1.dist - 3.6, c2.dist - 3.4);

  // Small Nanohana harbor basin notch right at (34, 127)
  const harbor = Math.hypot((x - 34) * 0.9, z - 127) - 7.5;
  d = Math.min(d, harbor);

  const meander = Math.sin(z * 0.055) * 2.2 + (valueNoise2D(x * 0.08, z * 0.08) - 0.5) * 2.4;
  return d + meander;
}

/**
 * Exact elevation of the two monumental stone ramps ascending Alubarna's mesa cliff.
 * Returns { weight: [0..1], height: number }.
 */
export function sampleAlubarnaRamp(x: number, z: number): {
  weight: number;
  height: number;
} {
  const cx = ALUBARNA_CENTER.x;
  const cz = ALUBARNA_CENTER.z;

  // 1. Southern grand ramp (straight south from z = -9 to z = +13)
  const southSeg = distToSegment(x, z, cx, cz + 29.5, cx, cz + 53.5);
  const southMask = 1 - smoothstep(2.2, 4.2, southSeg.dist);
  const southElev = ALUBARNA_PLATEAU_Y * (1 - southSeg.t) + 3.2 * southSeg.t;

  // 2. Western grand ramp (WSW from Alubarna west gate)
  const wAng = 2.66; // ~152 deg
  const wx0 = cx + Math.cos(wAng) * 29.5;
  const wz0 = cz + Math.sin(wAng) * 29.5;
  const wx1 = cx + Math.cos(wAng) * 53.0;
  const wz1 = cz + Math.sin(wAng) * 53.0;
  const westSeg = distToSegment(x, z, wx0, wz0, wx1, wz1);
  const westMask = 1 - smoothstep(2.1, 4.0, westSeg.dist);
  const westElev = ALUBARNA_PLATEAU_Y * (1 - westSeg.t) + 3.2 * westSeg.t;

  if (southMask >= westMask) {
    return { weight: southMask, height: southElev };
  }
  return { weight: westMask, height: westElev };
}

/**
 * Analytical terrain elevation groundHeightAt(x, z) across the entire 360×360 Alabasta scene.
 * Sea level is y = 0.0. Negative values lie underwater.
 */
export function sampleAlabastaHeight(x: number, z: number): number {
  const coastD = alabastaCoastSignedDist(x, z);
  const riverD = sandoraRiverSignedDist(x, z);

  // Offshore bathymetry & shallow coral shelf
  if (coastD >= 0) {
    const shelf = smoothstep(0, 22, coastD);
    return -0.15 - shelf * 4.8;
  }

  // Carved Sandora River bed
  if (riverD < 0) {
    const bankT = smoothstep(-5.5, 0, riverD);
    return -2.4 + bankT * 2.4;
  }

  // Land base rising smoothly from shoreline and riverbanks
  const inlandDist = Math.min(-coastD, riverD);
  const shoreRise = smoothstep(0, 11, inlandDist);
  let h = shoreRise * 2.8;

  // Wind-sculpted desert sand dunes (attenuated near towns & cliffs)
  const duneNoise = valueNoise2D(x * 0.038 + 2.1, z * 0.038 + 8.4);
  const duneWaves =
    Math.sin(x * 0.16 + z * 0.09 + duneNoise * 3.8) * 0.5 +
    Math.cos(x * 0.08 - z * 0.14 + duneNoise * 2.4) * 0.5;
  const duneAmp = smoothstep(4, 18, inlandDist) * 1.45;
  h += duneWaves * duneAmp + duneNoise * 0.85 * smoothstep(3, 14, inlandDist);

  // Western twin escarpment ridges flanking Yuba
  const ridgeNW = distToSegment(x, z, -104, -76, -116, -6);
  h += (1 - smoothstep(2.5, 11, ridgeNW.dist)) * (3.6 + ridgedFbm2D(x * 0.06, z * 0.06, 3) * 1.5);

  const ridgeSW = distToSegment(x, z, -118, 18, -121, 98);
  h += (1 - smoothstep(2.5, 11, ridgeSW.dist)) * (3.8 + ridgedFbm2D(x * 0.06 + 4, z * 0.06, 3) * 1.6);

  // Northern Delta Rocky Peninsula Highlands (top center-right of map)
  if (x > 4 && z < -108) {
    const hillMask =
      smoothstep(8, 28, x) *
      (1 - smoothstep(-132, -106, z)) *
      smoothstep(2, 12, -coastD) *
      smoothstep(0, 4, riverD);
    const mtnNoise = ridgedFbm2D(x * 0.045, z * 0.045, 4);
    h += hillMask * (3.8 + mtnNoise * 8.2);
  }

  // Southwestern coastal cliffs & badlands
  if (x < -75 && z > 60) {
    const swCliff = smoothstep(-75, -135, x) * smoothstep(60, 120, z) * smoothstep(1, 10, -coastD);
    h += swCliff * (2.6 + ridgedFbm2D(x * 0.05, z * 0.05, 3) * 3.8);
  }

  // Town flattening zones (level ground for walkable streets & grounded buildings)
  // 1. Rainbase oasis terrace
  const rainDist = Math.hypot(x - RAINBASE_CENTER.x, z - RAINBASE_CENTER.z);
  if (rainDist < 34) {
    const flatT = 1 - smoothstep(22, 34, rainDist);
    h = h * (1 - flatT) + 2.6 * flatT;
  }

  // 2. Nanohana harbor terrace
  const nanoDist = Math.hypot(x - NANOHANA_CENTER.x, z - NANOHANA_CENTER.z);
  if (nanoDist < 24) {
    const flatT = 1 - smoothstep(14, 24, nanoDist);
    const terraced = 1.6 + smoothstep(126, 98, z) * 1.4;
    h = h * (1 - flatT) + terraced * flatT;
  }

  // 3. Katorea fortified coastal terrace
  const katoDist = Math.hypot(x - KATOREA_CENTER.x, z - KATOREA_CENTER.z);
  if (katoDist < 28) {
    const flatT = 1 - smoothstep(18, 28, katoDist);
    h = h * (1 - flatT) + 4.8 * flatT;
  }

  // 4. Erumalu sunken oasis plaza
  const eruDist = Math.hypot(x - ERUMALU_CENTER.x, z - ERUMALU_CENTER.z);
  if (eruDist < 24) {
    const flatT = 1 - smoothstep(14, 24, eruDist);
    h = h * (1 - flatT) + 2.0 * flatT;
  }

  // 5. Yuba desert town clearing
  const yubaDist = Math.hypot(x - YUBA_CENTER.x, z - YUBA_CENTER.z);
  if (yubaDist < 20) {
    const flatT = 1 - smoothstep(11, 20, yubaDist);
    h = h * (1 - flatT) + 2.8 * flatT;
  }

  // 6. Spider's Cafe clearing
  const cafeDist = Math.hypot(x - SPIDERS_CAFE_CENTER.x, z - SPIDERS_CAFE_CENTER.z);
  if (cafeDist < 14) {
    const flatT = 1 - smoothstep(7, 14, cafeDist);
    h = h * (1 - flatT) + 3.4 * flatT;
  }

  // 7. Alubarna Elevated Limestone Mesa + Twin Monumental Ramps
  const aluDx = x - ALUBARNA_CENTER.x;
  const aluDz = z - ALUBARNA_CENTER.z;
  const aluAngle = Math.atan2(aluDz, aluDx);
  const cliffJagged =
    (ridgedFbm2D(Math.cos(aluAngle) * 3.0 + 7.1, Math.sin(aluAngle) * 3.0 + 3.4, 3) - 0.5) * 2.1;
  const aluR = Math.hypot(aluDx, aluDz);
  const mesaEdge = ALUBARNA_MESA_RADIUS + (aluR > ALUBARNA_WALL_RADIUS + 1 ? cliffJagged : 0);

  if (aluR <= ALUBARNA_WALL_RADIUS + 0.6) {
    h = ALUBARNA_PLATEAU_Y;
  } else if (aluR < mesaEdge + 10) {
    // Steep rocky cliff slope from 33.1 -> 39.5
    const mesaT = 1 - smoothstep(ALUBARNA_WALL_RADIUS + 0.6, mesaEdge + 4.5, aluR);
    h = Math.max(h, Math.max(2.2, h) * (1 - mesaT) + ALUBARNA_PLATEAU_Y * mesaT);
  }

  const ramp = sampleAlubarnaRamp(x, z);
  if (ramp.weight > 0.01) {
    h = Math.max(h, Math.max(2.2, h) * (1 - ramp.weight) + ramp.height * ramp.weight);
  }

  return h;
}

/**
 * Generates deterministic non-overlapping houses & market buildings along Alubarna's
 * concentric ring roads and 8 radial avenues so every street remains wide and walkable.
 */
export function buildAlubarnaBuildings(): AlabastaBuildingSpec[] {
  const buildings: AlabastaBuildingSpec[] = [];
  const cx = ALUBARNA_CENTER.x;
  const cz = ALUBARNA_CENTER.z;

  // 8 radial street angles (every 45 deg, plus WSW gate corridor at 2.66 rad)
  const streetAngles: number[] = [];
  for (let k = 0; k < 8; k++) {
    streetAngles.push(k * (Math.PI / 4));
  }
  streetAngles.push(2.66);

  const isOnRadialStreet = (ang: number, radius: number): boolean => {
    for (const sa of streetAngles) {
      let diff = Math.abs(ang - sa);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff * radius < 2.95) return true;
    }
    return false;
  };

  // Concentric housing rings strictly separated by ring avenues at r = 13.5, 23.0, 30.2
  const ringSpecs = [
    { rMin: 15.6, rMax: 17.5, stepRad: 0.22 },
    { rMin: 18.6, rMax: 20.6, stepRad: 0.19 },
    { rMin: 25.0, rMax: 26.8, stepRad: 0.145 },
    { rMin: 27.6, rMax: 29.0, stepRad: 0.135 },
  ];

  const hues: Array<'terracotta' | 'indigo' | 'ochre'> = [
    'terracotta',
    'indigo',
    'ochre',
  ];

  let idx = 0;
  for (const ring of ringSpecs) {
    const rMid = (ring.rMin + ring.rMax) * 0.5;
    for (let a = 0.08; a < Math.PI * 2 - 0.05; a += ring.stepRad) {
      const jitterA = (valueNoise2D(rMid * 0.7, a * 5.3) - 0.5) * ring.stepRad * 0.28;
      const ang = a + jitterA;
      const r =
        rMid + (valueNoise2D(a * 4.1, rMid * 1.1) - 0.5) * (ring.rMax - ring.rMin) * 0.45;

      if (isOnRadialStreet(ang, r)) continue;

      const x = cx + Math.cos(ang) * r;
      const z = cz + Math.sin(ang) * r;
      const hRand = valueNoise2D(x * 0.37, z * 0.37);
      const w = 2.0 + (hRand * 1.15);
      const d = 1.9 + (valueNoise2D(z * 0.41, x * 0.41) * 1.05);
      const height = 2.1 + hRand * 2.1;

      buildings.push({
        x,
        z,
        y: ALUBARNA_PLATEAU_Y,
        width: w,
        depth: d,
        height,
        yaw: -ang + Math.PI / 2,
        tint: 0.88 + hRand * 0.22,
        hasAwning: idx % 3 === 0,
        awningHue: hues[idx % hues.length],
        hasRoofTower: idx % 7 === 0,
      });
      idx++;
    }
  }

  return buildings;
}

/**
 * Generates deterministic street-aligned buildings for Nanohana, Katorea, Rainbase,
 * Yuba, and Erumalu so every settlement has crisp walkable roads and houses.
 */
export function buildRegionalTownBuildings(): AlabastaBuildingSpec[] {
  const list: AlabastaBuildingSpec[] = [];
  const hues: Array<'terracotta' | 'indigo' | 'ochre'> = [
    'terracotta',
    'indigo',
    'ochre',
  ];

  // 1. NANOHANA PORT TOWN (4x5 coastal blocks with central N-S & E-W streets)
  const nanoOffsetsX = [-12, -8.5, -5.0, 5.0, 8.5, 12];
  const nanoOffsetsZ = [-10, -6.5, -2.5, 1.5];
  let idx = 0;
  for (const ox of nanoOffsetsX) {
    for (const oz of nanoOffsetsZ) {
      if (Math.abs(ox) < 2.2) continue; // Main harbor street
      const x = NANOHANA_CENTER.x + ox + (valueNoise2D(ox, oz) - 0.5) * 0.6;
      const z = NANOHANA_CENTER.z + oz + (valueNoise2D(oz, ox) - 0.5) * 0.6;
      const y = sampleAlabastaHeight(x, z);
      if (y < 0.5) continue;
      const n = valueNoise2D(x * 0.4, z * 0.4);
      list.push({
        x,
        z,
        y,
        width: 2.1 + n * 0.9,
        depth: 2.0 + n * 0.8,
        height: 2.2 + n * 1.6,
        yaw: ox < 0 ? Math.PI / 2 : -Math.PI / 2,
        tint: 0.94 + n * 0.12,
        hasAwning: idx % 2 === 0,
        awningHue: hues[idx % hues.length],
        hasRoofTower: idx % 5 === 0,
      });
      idx++;
    }
  }

  // 2. KATOREA WALLED TOWN (grid inside pentagonal curtain walls)
  for (let gx = -12; gx <= 12; gx += 4.2) {
    for (let gz = -11; gz <= 11; gz += 4.2) {
      if (Math.abs(gx) < 2.4 || Math.abs(gz) < 2.4) continue; // Cross streets
      if (Math.hypot(gx, gz) > 15.5) continue;
      const x = KATOREA_CENTER.x + gx + (valueNoise2D(gx * 0.8, gz) - 0.5) * 0.7;
      const z = KATOREA_CENTER.z + gz + (valueNoise2D(gz * 0.8, gx) - 0.5) * 0.7;
      const y = sampleAlabastaHeight(x, z);
      const n = valueNoise2D(x * 0.5, z * 0.5);
      list.push({
        x,
        z,
        y,
        width: 2.2 + n * 0.9,
        depth: 2.1 + n * 0.9,
        height: 2.0 + n * 1.5,
        yaw: (idx % 4) * (Math.PI / 2),
        tint: 0.82 + n * 0.16,
        hasAwning: idx % 4 === 0,
        awningHue: hues[idx % hues.length],
        hasRoofTower: idx % 6 === 0,
      });
      idx++;
    }
  }

  // 3. RAINBASE RESORT VILLAS (ringing the palm oasis outside the pyramid & skull)
  for (let a = 0.2; a < Math.PI * 2; a += 0.34) {
    if (a > -0.3 && a < 0.4) continue; // Keep space clear around giant skull
    const r = 17.5 + (idx % 2) * 3.8;
    const x = RAINBASE_CENTER.x - 4 + Math.cos(a) * r;
    const z = RAINBASE_CENTER.z + Math.sin(a) * r;
    if (Math.hypot(x - 104, z - 62) < 9.5) continue;
    const y = sampleAlabastaHeight(x, z);
    const n = valueNoise2D(x * 0.4, z * 0.4);
    list.push({
      x,
      z,
      y,
      width: 2.3 + n * 0.8,
      depth: 2.1 + n * 0.8,
      height: 2.3 + n * 1.4,
      yaw: -a + Math.PI / 2,
      tint: 0.92 + n * 0.14,
      hasAwning: true,
      awningHue: 'indigo',
      hasRoofTower: idx % 4 === 0,
    });
    idx++;
  }

  // 4. YUBA OASIS SETTLEMENT (adobe ruins & houses along main street)
  for (let row = -10; row <= 10; row += 3.6) {
    for (const side of [-4.2, 4.2]) {
      const x = YUBA_CENTER.x + side + (valueNoise2D(row, side) - 0.5) * 0.8;
      const z = YUBA_CENTER.z + row;
      const y = sampleAlabastaHeight(x, z);
      const n = valueNoise2D(x * 0.5, z * 0.5);
      list.push({
        x,
        z,
        y,
        width: 2.1 + n * 0.8,
        depth: 2.0 + n * 0.7,
        height: 1.5 + n * 1.4,
        yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2,
        tint: 0.78 + n * 0.14,
        hasAwning: false,
        awningHue: 'ochre',
        hasRoofTower: false,
        isRuined: idx % 2 === 0,
      });
      idx++;
    }
  }

  // 5. ERUMALU GREEN CITY RUINS (geometric sunken plaza grid)
  for (let gx = -9; gx <= 9; gx += 4.5) {
    for (let gz = -9; gz <= 9; gz += 4.5) {
      if (Math.abs(gx) < 2 && Math.abs(gz) < 2) continue; // Central dry fountain square
      const x = ERUMALU_CENTER.x + gx;
      const z = ERUMALU_CENTER.z + gz;
      const y = sampleAlabastaHeight(x, z);
      const n = valueNoise2D(x * 0.6, z * 0.6);
      list.push({
        x,
        z,
        y,
        width: 2.2 + n * 0.6,
        depth: 2.1 + n * 0.6,
        height: 1.2 + n * 1.2,
        yaw: 0.25,
        tint: 0.76 + n * 0.14,
        hasAwning: false,
        awningHue: 'ochre',
        hasRoofTower: false,
        isRuined: true,
      });
      idx++;
    }
  }

  return list;
}

/**
 * Generates grounded palm trees matching the dense groves at Rainbase, Erumalu,
 * Alubarna royal gardens, Yuba, and Spider's Cafe.
 */
export function buildAlabastaPalms(): AlabastaPalmSpec[] {
  const palms: AlabastaPalmSpec[] = [];

  // 1. Erumalu Oasis Grove (dense southwest spreading grove matching photo)
  for (let i = 0; i < 68; i++) {
    const a = valueNoise2D(i * 1.3, 4.7) * Math.PI * 2;
    const dist = 6.5 + valueNoise2D(i * 2.7, 9.1) * 24;
    const x = ERUMALU_CENTER.x - 10 + Math.cos(a) * dist * 1.15;
    const z = ERUMALU_CENTER.z + 6 + Math.sin(a) * dist * 0.75;
    if (Math.hypot(x - ERUMALU_CENTER.x, z - ERUMALU_CENTER.z) < 10.5) continue;
    const y = sampleAlabastaHeight(x, z);
    if (y < 0.6) continue;
    palms.push({
      x,
      z,
      y,
      height: 3.2 + valueNoise2D(x, z) * 2.2,
      lean: 0.08 + valueNoise2D(z, x) * 0.18,
      yaw: valueNoise2D(i, 1.9) * Math.PI * 2,
    });
  }

  // 2. Rainbase Oasis Palms (ringing pyramid & water basin)
  for (let i = 0; i < 62; i++) {
    const a = (i / 62) * Math.PI * 2 + valueNoise2D(i, 3.1) * 0.25;
    const dist = 10.5 + valueNoise2D(i * 3.1, 7.2) * 14.5;
    const x = RAINBASE_CENTER.x - 4 + Math.cos(a) * dist * 1.25;
    const z = RAINBASE_CENTER.z + Math.sin(a) * dist * 0.82;
    if (Math.hypot(x - 104, z - 62) < 8.8) continue;
    if (Math.hypot(x - 76, z - 60) < 9.2) continue;
    const y = sampleAlabastaHeight(x, z);
    if (y < 0.8) continue;
    palms.push({
      x,
      z,
      y,
      height: 3.4 + valueNoise2D(x * 0.4, z * 0.4) * 2.1,
      lean: 0.08 + valueNoise2D(z * 0.5, x * 0.5) * 0.16,
      yaw: a,
    });
  }

  // 3. Alubarna Plaza & Avenue Palms (strictly clear of the 4 cardinal avenues & stairs)
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    if (Math.abs(Math.cos(a)) < 0.28 || Math.abs(Math.sin(a)) < 0.28) continue;
    const r = i % 2 === 0 ? 12.6 : 21.8;
    const x = ALUBARNA_CENTER.x + Math.cos(a) * r;
    const z = ALUBARNA_CENTER.z + Math.sin(a) * r;
    palms.push({
      x,
      z,
      y: ALUBARNA_PLATEAU_Y,
      height: 3.0 + (i % 3) * 0.55,
      lean: 0.06,
      yaw: a,
    });
  }

  // 4. Spider's Cafe iconic lone palm
  const cafePalmX = SPIDERS_CAFE_CENTER.x - 5.2;
  const cafePalmZ = SPIDERS_CAFE_CENTER.z - 1.5;
  palms.push({
    x: cafePalmX,
    z: cafePalmZ,
    y: sampleAlabastaHeight(cafePalmX, cafePalmZ),
    height: 5.2,
    lean: 0.14,
    yaw: 0.8,
  });

  return palms;
}

export const ALABASTA_CAMERA_PRESETS: AlabastaCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle: 'Île complète · Rivière Sandora',
    position: [0, 238, 224],
    target: [0, 2, 0],
    isStreetView: false,
  },
  {
    id: 'alubarna-street',
    label: 'Alubarna · Rues',
    subtitle: 'Point de vue piéton dans la cité',
    position: [ALUBARNA_CENTER.x + 1.0, ALUBARNA_PLATEAU_Y + 1.8, ALUBARNA_CENTER.z + 27.2],
    target: [ALUBARNA_CENTER.x, ALUBARNA_PLATEAU_Y + 3.4, ALUBARNA_CENTER.z + 2.0],
    isStreetView: true,
  },
  {
    id: 'alubarna-palace',
    label: 'Palais Royal',
    subtitle: 'Esplanade & dômes dorés',
    position: [ALUBARNA_CENTER.x - 13.5, ALUBARNA_PLATEAU_Y + 6.2, ALUBARNA_CENTER.z + 15.5],
    target: [ALUBARNA_CENTER.x, ALUBARNA_PLATEAU_Y + 4.4, ALUBARNA_CENTER.z],
    isStreetView: false,
  },
  {
    id: 'rainbase',
    label: 'Rainbase',
    subtitle: 'Rain Dinners & crâne géant',
    position: [RAINBASE_CENTER.x + 8.5, 6.8, RAINBASE_CENTER.z + 28.0],
    target: [RAINBASE_CENTER.x + 6.5, 6.2, RAINBASE_CENTER.z],
    isStreetView: true,
  },
  {
    id: 'nanohana',
    label: 'Nanohana · Port',
    subtitle: 'Quais, maisons & voiliers',
    position: [NANOHANA_CENTER.x + 0.8, 3.9, NANOHANA_CENTER.z - 6.0],
    target: [NANOHANA_CENTER.x, 2.2, NANOHANA_CENTER.z + 15.0],
    isStreetView: true,
  },
  {
    id: 'katorea',
    label: 'Katorea',
    subtitle: 'Citadelle pentagonale',
    position: [KATOREA_CENTER.x - 1.5, 7.2, KATOREA_CENTER.z + 12.5],
    target: [KATOREA_CENTER.x, 6.0, KATOREA_CENTER.z - 4.0],
    isStreetView: true,
  },
  {
    id: 'erumalu',
    label: 'Erumalu',
    subtitle: 'Ruines & palmeraie',
    position: [ERUMALU_CENTER.x - 11, 4.4, ERUMALU_CENTER.z + 12],
    target: [ERUMALU_CENTER.x, 3.0, ERUMALU_CENTER.z],
    isStreetView: true,
  },
  {
    id: 'yuba',
    label: 'Yuba',
    subtitle: 'Oasis & falaises occidentales',
    position: [YUBA_CENTER.x + 0.5, 5.1, YUBA_CENTER.z + 11.5],
    target: [YUBA_CENTER.x, 4.2, YUBA_CENTER.z - 2],
    isStreetView: true,
  },
  {
    id: 'spiders-cafe',
    label: "Spider's Cafe",
    subtitle: 'Relais du désert nord',
    position: [SPIDERS_CAFE_CENTER.x + 6, 5.4, SPIDERS_CAFE_CENTER.z + 10],
    target: [SPIDERS_CAFE_CENTER.x - 1, 4.8, SPIDERS_CAFE_CENTER.z],
    isStreetView: true,
  },
];
