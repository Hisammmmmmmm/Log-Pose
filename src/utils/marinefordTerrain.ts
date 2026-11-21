import { ridgedFbm2D, valueNoise2D } from './globeMath';

export const MARINEFORD_WORLD_SIZE = 280;
export const MARINEFORD_GLOBE_SCALE = 0.0020;
export const MARINEFORD_GLOBE_CENTER = { u: 0.905, v: 0.532 } as const;
export const MARINEFORD_ANGULAR_MASK_RADIUS = 0.048;

export const MARINEFORD_BAY_CENTER = { x: 0, z: 30 } as const;
export const MARINEFORD_BAY_RADIUS = 33.5;
export const MARINEFORD_WALL_CENTER = { x: 0, z: 22 } as const;
export const MARINEFORD_WALL_RADIUS_X = 48.0;
export const MARINEFORD_WALL_RADIUS_Z = 47.0;

export const MARINEFORD_KEEP_POS = { x: 0, z: -43 } as const;
export const MARINEFORD_SCAFFOLD_POS = { x: 0, z: -13 } as const;

export interface MarinefordHouseSpec {
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
  isTealRoof: boolean;
  district: 'west-town' | 'east-town' | 'crescent-quay';
}

export interface MarinefordWatchtowerSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  yaw: number;
  scale: number;
}

export interface MarinefordCannonSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  yaw: number;
}

export interface MarinefordShipSpec {
  id: string;
  x: number;
  z: number;
  yaw: number;
  scale: number;
}

export interface MarinefordTentSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  yaw: number;
  scale: number;
}

export interface MarinefordTreeSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  scale: number;
  tint: number;
}

export interface MarinefordCameraPreset {
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
): number {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const c1 = vx * wx + vz * wz;
  if (c1 <= 0) return Math.hypot(px - ax, pz - az);
  const c2 = vx * vx + vz * vz;
  if (c2 <= c1) return Math.hypot(px - bx, pz - bz);
  const b = c1 / c2;
  const rx = ax + b * vx;
  const rz = az + b * vz;
  return Math.hypot(px - rx, pz - rz);
}

export function toMarinefordSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * MARINEFORD_GLOBE_SCALE;
  const sz = z * MARINEFORD_GLOBE_SCALE;
  const rTarget = globeRadius + y * MARINEFORD_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * Signed distance to Oris Bay & Southern Harbor Mouth (< 0 inside bay water, > 0 on land).
 */
export function marinefordBaySignedDist(x: number, z: number): number {
  const dBay =
    Math.hypot(x - MARINEFORD_BAY_CENTER.x, z - MARINEFORD_BAY_CENTER.z) -
    MARINEFORD_BAY_RADIUS;
  // Harbor mouth channel opening due South (|x| < 11.5, z in [52..115])
  if (z >= MARINEFORD_BAY_CENTER.z + 18) {
    const dChannel = Math.max(Math.abs(x) - 11.2, 54 - z);
    return Math.min(dBay, dChannel);
  }
  return dBay;
}

/**
 * Signed distance to the Crescent Fortress Rampart centerline.
 * Wraps from the West Harbor Gate -> around South-West, West, East, South-East -> East Harbor Gate,
 * joining the Fortress Keep wings on the North (z ≈ -36).
 */
export function marinefordWallSignedDist(x: number, z: number): number {
  const dx = (x - MARINEFORD_WALL_CENTER.x) / MARINEFORD_WALL_RADIUS_X;
  const dz = (z - MARINEFORD_WALL_CENTER.z) / MARINEFORD_WALL_RADIUS_Z;
  const rNorm = Math.hypot(dx, dz);
  const radialD = (rNorm - 1.0) * 47.5;

  // Leave Harbor Mouth open at South (|x| < 13.5, z > 58)
  if (z > 54 && Math.abs(x) < 13.8) {
    return Math.max(Math.abs(radialD), 13.8 - Math.abs(x));
  }
  // Open across North behind the HQ Keep courtyard (|x| < 32, z < -18)
  if (z < -18 && Math.abs(x) < 32.0) {
    return Math.max(Math.abs(radialD), 32.0 - Math.abs(x));
  }
  return Math.abs(radialD);
}

/**
 * Signed distance to Marineford's paved plazas, quay promenades, and town paths (< 0 on walkable road/plaza).
 */
export function marinefordRoadSignedDist(x: number, z: number): number {
  let minD = 999;

  // 1. Oris Plaza grand central square
  const plazaDx = Math.abs(x) - 29.0;
  const plazaDz = Math.max(-30 - z, z - -3.5);
  const plazaD = Math.max(plazaDx, plazaDz);
  if (plazaD < minD) minD = plazaD;

  // 2. Central Stone Wharf Pier protruding into Oris Bay
  const pierD = Math.max(Math.abs(x) - 3.6, Math.max(-4.5 - z, z - 14.5));
  if (pierD < minD) minD = pierD;

  // 3. Inner crescent bay quay promenade
  const bayR = Math.hypot(x - MARINEFORD_BAY_CENTER.x, z - MARINEFORD_BAY_CENTER.z);
  const bayAng = Math.atan2(z - MARINEFORD_BAY_CENTER.z, x - MARINEFORD_BAY_CENTER.x);
  if (bayAng < 1.15 || bayAng > 1.98) {
    const promD = Math.abs(bayR - (MARINEFORD_BAY_RADIUS + 4.2)) - 3.2;
    if (promD < minD) minD = promD;
  }

  // 4. Outer coastal avenues & winding town paths (West Town, SW Encampment, East Town)
  const paths: Array<[number, number, number, number, number]> = [
    // West Gate -> West Town main street -> NW Cliff Lookout
    [-46, 12, -58, 4, 2.5],
    [-58, 4, -68, -14, 2.4],
    [-68, -14, -64, -36, 2.2],
    [-58, 4, -78, -6, 2.1],
    // West Town -> SW Grassy Encampment Peninsula
    [-58, 4, -64, 24, 2.3],
    [-64, 24, -68, 42, 2.5],
    // East Gate -> East Town winding boulevard -> NE Lookout
    [46, 10, 60, 0, 2.5],
    [60, 0, 72, -16, 2.4],
    [72, -16, 66, -34, 2.2],
    [60, 0, 80, -8, 2.0],
    // Fortress Courtyard approach along central axis
    [0, -30, 0, -40, 4.5],
  ];

  for (const [ax, az, bx, bz, halfW] of paths) {
    const d = distToSegment(x, z, ax, az, bx, bz) - halfW;
    if (d < minD) minD = d;
  }

  return minD;
}

/**
 * Signed distance to the main Marineford landmass coastline (< 0 on island, > 0 in open sea).
 */
export function marinefordCoastSignedDist(x: number, z: number): number {
  // Core crescent + HQ + mountain silhouette
  const dCore = Math.hypot(x * 0.92, (z + 6) * 0.94) - 80.0;
  // Northern mountain widening
  const dNorthMtn =
    z < -20 ? Math.hypot(x * 0.85, (z + 68) * 1.1) - 66.0 : 999;
  // Southwest grassy encampment peninsula (from marine_ford_6704c00e.JPG)
  const dSwPeninsula = Math.hypot(x + 68, z - 38) - 25.0;
  // East coastal spur
  const dEastSpur = Math.hypot(x - 76, z + 14) - 24.0;
  // NW cliff promontory
  const dNwCliff = Math.hypot(x + 76, z + 24) - 24.0;

  const coastNoise =
    (valueNoise2D(x * 0.055 + 2.1, z * 0.055 + 5.7) - 0.5) * 8.5;
  const rawIsland =
    Math.min(dCore, dNorthMtn, dSwPeninsula, dEastSpur, dNwCliff) + coastNoise;

  // Carve Oris Bay & Harbor mouth out of landmass
  const bayD = marinefordBaySignedDist(x, z);
  return Math.max(rawIsland, -bayD);
}

/**
 * Master ground height sampler for Marineford.
 */
export function sampleMarinefordHeight(x: number, z: number): number {
  const bayD = marinefordBaySignedDist(x, z);
  if (bayD < 0.8) {
    // Smooth harbor seabed down to -2.6
    const t = smoothstep(-3.0, 0.8, bayD);
    return -2.6 + t * 2.2;
  }

  const coastD = marinefordCoastSignedDist(x, z);
  if (coastD > 5.0) {
    const seaRipple = (valueNoise2D(x * 0.08, z * 0.08) - 0.5) * 0.45;
    return -2.4 + seaRipple;
  }

  // Coastal cliff rise from ocean to island base (y ≈ 2.6)
  const shoreLift = (1 - smoothstep(-3.2, 3.8, coastD)) * 5.0;
  let h = -2.4 + shoreLift; // Base island ground ~2.6

  // Flatten Oris Plaza & Quay promenade cleanly at y = 2.8
  const rWallSpace = Math.hypot(
    (x - MARINEFORD_WALL_CENTER.x) / MARINEFORD_WALL_RADIUS_X,
    (z - MARINEFORD_WALL_CENTER.z) / MARINEFORD_WALL_RADIUS_Z
  );
  if (rWallSpace < 1.04 && z > -35) {
    const plazaFlat = 1 - smoothstep(0.92, 1.04, rWallSpace);
    h = h * (1 - plazaFlat) + 2.75 * plazaFlat;
  }

  // Stepped Fortress Courtyard terrace (z in [-46..-30], |x| < 32)
  if (z < -28 && z > -48 && Math.abs(x) < 35) {
    const mX = 1 - smoothstep(26, 35, Math.abs(x));
    const mZ = smoothstep(-28, -33, z) * (1 - smoothstep(-44, -48, z));
    h = Math.max(h, 2.75 + 2.8 * mX * mZ);
  }

  // Gentle West & East Town slopes rising slightly inland toward foothills
  if (z >= -48 && z <= 20 && Math.abs(x) >= 44 && Math.abs(x) <= 92) {
    const inlandT = smoothstep(20, -48, z) * (1 - smoothstep(75, 95, Math.abs(x)));
    const gentleHill = inlandT * 4.5;
    // Keep walkable paths smooth
    const roadD = marinefordRoadSignedDist(x, z);
    const roadFlatten = 1 - smoothstep(-0.5, 2.5, roadD);
    h += gentleHill * (1 - roadFlatten * 0.45);
  }

  // SW Encampment Plateau bluff (x ≈ -68, z ≈ +38)
  const dSw = Math.hypot(x + 68, z - 38);
  if (dSw < 23) {
    const plateauT = 1 - smoothstep(14, 23, dSw);
    h = Math.max(h, 2.6 + plateauT * 2.2);
  }

  // NW & NE Lookout Cliff Spurs (matching marinford_2ab8bc69.webp)
  const dNwLookout = Math.hypot(x + 64, z + 38);
  if (dNwLookout < 14) {
    h = Math.max(h, 2.8 + (1 - smoothstep(6, 14, dNwLookout)) * 12.5);
  }
  const dNeLookout = Math.hypot(x - 66, z + 36);
  if (dNeLookout < 14) {
    h = Math.max(h, 2.8 + (1 - smoothstep(6, 14, dNeLookout)) * 10.5);
  }

  // Sweeping Jagged Rocky Mountain Backdrop North of the HQ Keep (z < -48)
  if (z < -45) {
    const northRamp = smoothstep(-45, -62, z);
    const radialFade = 1 - smoothstep(55, 118, Math.hypot(x * 0.85, z + 72));
    const ridge1 = ridgedFbm2D((x + 140) * 0.022, (z + 140) * 0.022, 4);
    const ridge2 = ridgedFbm2D((x + 40) * 0.055, (z + 40) * 0.055, 3);
    const centralSpine = Math.exp(-(x * x) / (2 * 34 * 34));
    const mtnElev =
      northRamp *
      radialFade *
      (16.0 + centralSpine * 26.0 + ridge1 * 22.0 + ridge2 * 8.0);
    h = Math.max(h, 2.6 + mtnElev);
  }

  return h;
}

/**
 * Walkable ground + Central Pier + Execution Platform Twin Stairs height sampler
 * used for WASD human walking and camera ground-clearance checks.
 */
export function sampleMarinefordWalkSurfaceHeight(x: number, z: number): number {
  let h = sampleMarinefordHeight(x, z);

  // Central Stone Wharf Pier (x in [-3.8..3.8], z in [-5..15])
  if (Math.abs(x) <= 3.9 && z >= -5 && z <= 15.2) {
    h = Math.max(h, 2.45);
  }

  // Execution Platform & Twin Grand Stairs (x in [-5.8..5.8], z in [-19..-6])
  if (Math.abs(x) <= 5.8 && z >= -19.5 && z <= -6.0) {
    if (z <= -13.5) {
      h = Math.max(h, 7.6);
    } else {
      const climbT = smoothstep(-6.0, -13.5, z);
      h = Math.max(h, 2.75 + climbT * 4.85);
    }
  }

  // Fortress Grand Entrance Staircase (|x| <= 5, z in [-34..-28])
  if (Math.abs(x) <= 5.0 && z >= -35 && z <= -28) {
    const stairT = smoothstep(-28, -35, z);
    h = Math.max(h, 2.75 + stairT * 2.95);
  }

  return h;
}

/**
 * Generates Marine Town Houses with cream-white walls and terracotta/teal roofs
 * along the West Town, East Town, and inner Crescent Harbor Promenade,
 * strictly avoiding Oris Bay, Oris Plaza, rampart walls, HQ Keep, and walkable roads.
 */
export function buildMarinefordHouses(): MarinefordHouseSpec[] {
  const houses: MarinefordHouseSpec[] = [];
  const wallPalette = [0xf4efe4, 0xebe4d6, 0xf8f5ec, 0xe4ddd0];
  const terracottaPalette = [0xd85a2b, 0xe06834, 0xc94d22];
  const tealPalette = [0x3b9a8e, 0x47aba0, 0x2f877d];

  const candidates: Array<{
    x: number;
    z: number;
    yaw: number;
    district: MarinefordHouseSpec['district'];
  }> = [];

  // 1. Inner Crescent Harbor Promenade row (West & East curves inside seawall)
  for (let i = 0; i < 28; i++) {
    const ang = -Math.PI * 0.72 + (i / 27) * Math.PI * 1.44;
    if (Math.abs(ang - Math.PI * 0.5) < 0.48) continue; // Keep Harbor Mouth clear
    if (ang > -Math.PI * 0.78 && ang < -Math.PI * 0.22) continue; // Keep Oris Plaza North clear
    const r = MARINEFORD_BAY_RADIUS + 8.6;
    const x = MARINEFORD_BAY_CENTER.x + Math.cos(ang) * r;
    const z = MARINEFORD_BAY_CENTER.z + Math.sin(ang) * r;
    candidates.push({
      x,
      z,
      yaw: -ang + Math.PI * 0.5 + Math.PI,
      district: 'crescent-quay',
    });
  }

  // 2. West Marine Town grid (matching dense houses outside West Rampart in both images)
  for (let gx = -80; gx <= -48; gx += 6.2) {
    for (let gz = -40; gz <= 14; gz += 6.2) {
      const jx = (valueNoise2D(gx * 0.31, gz * 0.31) - 0.5) * 2.0;
      const jz = (valueNoise2D(gx * 0.47 + 3, gz * 0.47) - 0.5) * 2.0;
      candidates.push({
        x: gx + jx,
        z: gz + jz,
        yaw: Math.PI * 0.5 + (jx * 0.2),
        district: 'west-town',
      });
    }
  }

  // 3. East Marine Town grid
  for (let gx = 48; gx <= 80; gx += 6.2) {
    for (let gz = -40; gz <= 10; gz += 6.2) {
      const jx = (valueNoise2D(gx * 0.33 + 7, gz * 0.33) - 0.5) * 2.0;
      const jz = (valueNoise2D(gx * 0.49 + 5, gz * 0.49) - 0.5) * 2.0;
      candidates.push({
        x: gx + jx,
        z: gz + jz,
        yaw: -Math.PI * 0.5 + (jx * 0.2),
        district: 'east-town',
      });
    }
  }

  let idx = 0;
  for (const c of candidates) {
    const coastD = marinefordCoastSignedDist(c.x, c.z);
    if (coastD > -4.2) continue;
    if (marinefordBaySignedDist(c.x, c.z) < 4.5) continue;
    if (marinefordWallSignedDist(c.x, c.z) < 3.8) continue;
    if (marinefordRoadSignedDist(c.x, c.z) < 1.2) continue;
    // Keep away from Twin Bastion Towers & NW/NE cliff peaks
    if (Math.hypot(Math.abs(c.x) - 29, c.z + 25) < 11.5) continue;
    if (Math.hypot(c.x + 64, c.z + 38) < 11.0) continue;
    if (Math.hypot(c.x - 66, c.z + 36) < 11.0) continue;

    // Ensure minimum spacing from previously placed houses
    const tooClose = houses.some(
      (h) => Math.hypot(h.x - c.x, h.z - c.z) < 4.9
    );
    if (tooClose) continue;

    const y = sampleMarinefordHeight(c.x, c.z);
    if (y < 1.8 || y > 11.5) continue;

    const n = valueNoise2D(c.x * 0.19, c.z * 0.19);
    const isTeal = idx % 3 === 1;
    houses.push({
      id: `mf-house-${idx++}`,
      x: c.x,
      z: c.z,
      y,
      width: 3.3 + n * 1.1,
      depth: 3.0 + (idx % 3) * 0.35,
      height: 2.8 + ((idx + 1) % 3) * 0.75 + n * 0.6,
      yaw: c.yaw,
      wallColor: wallPalette[idx % wallPalette.length],
      roofColor: isTeal
        ? tealPalette[idx % tealPalette.length]
        : terracottaPalette[idx % terracottaPalette.length],
      isTealRoof: isTeal,
      district: c.district,
    });
  }

  return houses;
}

/**
 * Generates Crescent Rampart Pagoda Watchtowers + Harbor Entrance Gate Bastions.
 */
export function buildMarinefordWatchtowers(): MarinefordWatchtowerSpec[] {
  const towers: MarinefordWatchtowerSpec[] = [];
  // Symmetrical crescent angles (skip south mouth around PI/2 and north keep gap around -PI/2)
  const angles = [
    Math.PI * 0.5 + 0.32, // SW Harbor Mouth Bastion
    Math.PI * 0.5 - 0.32, // SE Harbor Mouth Bastion
    Math.PI * 0.85,
    Math.PI * 1.14,
    -Math.PI * 0.68,
    Math.PI * 0.15,
    -Math.PI * 0.14,
    -Math.PI * 0.32,
  ];

  angles.forEach((ang, i) => {
    const x = MARINEFORD_WALL_CENTER.x + Math.cos(ang) * MARINEFORD_WALL_RADIUS_X;
    const z = MARINEFORD_WALL_CENTER.z + Math.sin(ang) * MARINEFORD_WALL_RADIUS_Z;
    const isGateBastion = i < 2;
    towers.push({
      id: `mf-tower-${i}`,
      x,
      z,
      y: 2.75,
      yaw: -ang + Math.PI * 0.5,
      scale: isGateBastion ? 1.28 : 1.0,
    });
  });

  return towers;
}

/**
 * Generates heavy twin-barrel coastal & rampart cannons along the crescent walls
 * (matching marinford_2ab8bc69.webp).
 */
export function buildMarinefordCannons(): MarinefordCannonSpec[] {
  const cannons: MarinefordCannonSpec[] = [];
  const count = 24;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2;
    const x = MARINEFORD_WALL_CENTER.x + Math.cos(ang) * MARINEFORD_WALL_RADIUS_X;
    const z = MARINEFORD_WALL_CENTER.z + Math.sin(ang) * MARINEFORD_WALL_RADIUS_Z;
    if (z > 54 && Math.abs(x) < 15.5) continue;
    if (z < -18 && Math.abs(x) < 33.5) continue;
    // Skip right on top of watchtowers
    const onTower = buildMarinefordWatchtowers().some(
      (t) => Math.hypot(t.x - x, t.z - z) < 5.5
    );
    if (onTower) continue;

    cannons.push({
      id: `mf-cannon-${cannons.length}`,
      x,
      z,
      y: 9.1,
      yaw: -ang + Math.PI * 0.5,
    });
  }
  return cannons;
}

/**
 * Generates Marine warships moored inside Oris Bay and approaching the Harbor Mouth
 * (matching marine_ford_6704c00e.JPG).
 */
export function buildMarinefordShips(): MarinefordShipSpec[] {
  return [
    { id: 'mf-ship-0', x: -18, z: 22, yaw: 0.4, scale: 1.0 },
    { id: 'mf-ship-1', x: -10, z: 32, yaw: 0.1, scale: 0.95 },
    { id: 'mf-ship-2', x: 18, z: 18, yaw: -0.5, scale: 1.02 },
    { id: 'mf-ship-3', x: 22, z: 36, yaw: -0.9, scale: 0.96 },
    { id: 'mf-ship-4', x: -24, z: 42, yaw: 0.85, scale: 0.92 },
    { id: 'mf-ship-5', x: 6.8, z: 72, yaw: 0.14, scale: 1.06 },
    { id: 'mf-ship-6', x: -7.5, z: 84, yaw: -0.18, scale: 1.04 },
  ];
}

/**
 * Generates Marine canvas encampment tents on the SW grassy peninsula & plaza flanks.
 */
export function buildMarinefordTents(): MarinefordTentSpec[] {
  const spots: Array<[number, number, number, number]> = [
    [-64, 34, 0.3, 1.05],
    [-72, 36, -0.4, 1.0],
    [-68, 44, 0.8, 0.95],
    [-58, 42, -0.2, 0.98],
    [-76, 42, 0.5, 0.92],
    [-33, 6, 0.4, 0.9],
    [-35, -2, 0.2, 0.9],
    [34, 4, -0.4, 0.9],
  ];
  return spots.map(([x, z, yaw, scale], i) => ({
    id: `mf-tent-${i}`,
    x,
    z,
    y: sampleMarinefordHeight(x, z),
    yaw,
    scale,
  }));
}

/**
 * Generates lush Marineford pine & coastal trees along foothills, town gardens, and cliffs.
 */
export function buildMarinefordTrees(): MarinefordTreeSpec[] {
  const trees: MarinefordTreeSpec[] = [];
  const houses = buildMarinefordHouses();

  for (let gx = -94; gx <= 94; gx += 6.0) {
    for (let gz = -78; gz <= 58; gz += 6.0) {
      const n1 = valueNoise2D(gx * 0.27 + 9.1, gz * 0.27 + 3.4);
      if (n1 < 0.46) continue;
      const x = gx + (n1 - 0.5) * 3.8;
      const z = gz + (valueNoise2D(gx * 0.19, gz * 0.19 + 8.2) - 0.5) * 3.8;

      if (marinefordCoastSignedDist(x, z) > -3.2) continue;
      if (marinefordBaySignedDist(x, z) < 3.5) continue;
      if (marinefordWallSignedDist(x, z) < 4.0) continue;
      if (marinefordRoadSignedDist(x, z) < 1.8) continue;
      // Keep Oris Plaza & HQ courtyard clear
      if (Math.abs(x) < 36 && z > -55 && z < 4) continue;
      // Keep high rocky mountain spires treeless
      const y = sampleMarinefordHeight(x, z);
      if (y < 2.0 || y > 18.0) continue;
      // Avoid SW tent area directly
      if (Math.hypot(x + 68, z - 38) < 11) continue;
      // Avoid houses
      if (houses.some((h) => Math.hypot(h.x - x, h.z - z) < 3.4)) continue;

      trees.push({
        id: `mf-tree-${trees.length}`,
        x,
        z,
        y,
        scale: 0.78 + n1 * 0.65,
        tint: 0.8 + (n1 * 0.3),
      });
      if (trees.length >= 260) return trees;
    }
  }
  return trees;
}

export const MARINEFORD_CAMERA_PRESETS: MarinefordCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle: 'Marineford complète · Baie d’Oris, Forteresse & Montagnes',
    position: [36, 132, 188],
    target: [0, 12, -8],
    isStreetView: false,
  },
  {
    id: 'oris-plaza',
    label: 'Place Oris & Échafaud',
    subtitle: 'Vue humaine sur la place pavée devant l’échafaud et le QG 海軍',
    position: [-10.5, 5.2, 6.5],
    target: [0, 13.5, -36.0],
    isStreetView: true,
  },
  {
    id: 'town-street',
    label: 'Quartier Marine · Maisons',
    subtitle: 'Ruelle pavée à hauteur humaine entre maisons blanches et toits colorés',
    position: [-58.5, 6.2, 3.5],
    target: [-65.0, 5.6, -12.0],
    isStreetView: true,
  },
  {
    id: 'harbor-bay',
    label: 'Port & Murailles du Croissant',
    subtitle: 'Quai d’Oris, navires de la Marine, canons et tours de guet',
    position: [26.0, 8.8, 44.0],
    target: [-6.0, 7.0, 10.0],
    isStreetView: true,
  },
  {
    id: 'hq-keep',
    label: 'Quartier Général · 海軍',
    subtitle: 'Parvis du donjon principal, emblème de la Marine et pagode',
    position: [12.0, 8.4, -22.0],
    target: [0, 23.0, -43.0],
    isStreetView: true,
  },
  {
    id: 'sw-camp-trail',
    label: 'Campement Ouest & Sentier',
    subtitle: 'Presqu’île ouest, tentes militaires et sentier côtier',
    position: [-62.0, 7.6, 26.0],
    target: [-68.0, 5.2, 40.0],
    isStreetView: true,
  },
];
