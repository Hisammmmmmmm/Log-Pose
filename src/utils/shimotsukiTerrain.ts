import { valueNoise2D } from './globeMath';

export const SHIMOTSUKI_WORLD_SIZE = 260;
export const SHIMOTSUKI_GLOBE_SCALE = 0.002;
export const SHIMOTSUKI_GLOBE_CENTER = { u: 0.908, v: 0.305 } as const;
/**
 * Kept cleanly at 0.036 rad so Shimotsuki Village never overlaps
 * Kumate Island (u: 0.858, v: 0.278) or Sixis Island (u: 0.856, v: 0.358).
 */
export const SHIMOTSUKI_ANGULAR_MASK_RADIUS = 0.036;

export const SHIMOTSUKI_QUAY_Y = 1.35;
export const SHIMOTSUKI_VILLAGE_Y = 2.45;
export const SHIMOTSUKI_FIELDS_Y = 2.52;
export const SHIMOTSUKI_CEMETERY_Y = 2.65;
export const SHIMOTSUKI_DOJO_Y = 2.75;
export const SHIMOTSUKI_MID_HILL_Y = 5.9;
export const SHIMOTSUKI_RIDGE_Y = 10.2;
export const SHIMOTSUKI_PEAK_Y = 13.4;
export const SHIMOTSUKI_WATER_Y = -0.04;
/**
 * Aligns Shimotsuki local y=0 waterline seamlessly with the globe's 160x80 ocean
 * polygon facet at (u=0.908, v=0.305), where triangle chord sag sits ~1.40m below R=10.
 */
export const SHIMOTSUKI_SPHERE_SEA_OFFSET = -1.40;

export interface ShimotsukiBuildingSpec {
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
  style: 'minka' | 'storehouse' | 'courtyard-u' | 'dojo';
  hasEngawa?: boolean;
  hasLantern?: boolean;
}

export interface ShimotsukiTreeSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  scale: number;
  tint: number;
  kind: 'broadleaf' | 'pine';
}

export interface ShimotsukiFieldPlotSpec {
  id: string;
  cx: number;
  cz: number;
  hw: number;
  hd: number;
  yaw: number;
  crop: 'ochre' | 'green' | 'tea';
}

export interface ShimotsukiCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

export const SHIMOTSUKI_LANDMARKS = {
  harborQuay: { x: 16.5, z: -16.2, y: SHIMOTSUKI_QUAY_Y },
  westPier: { x: 13.5, z: -20.5, y: SHIMOTSUKI_QUAY_Y },
  eastPier: { x: 19.8, z: -19.8, y: SHIMOTSUKI_QUAY_Y },
  fishingBoatWest: { x: 15.8, z: -24.2, y: -0.08 },
  fishingBoatEast: { x: 22.6, z: -24.2, y: -0.08 },
  riverBridge: { x: 2.5, z: -8.5, y: 2.75 },
  isshinDojo: { x: 15.2, z: -0.8, y: SHIMOTSUKI_DOJO_Y, yaw: -Math.PI * 0.68 },
  dojoCourtyard: { x: 11.4, z: -3.2, y: SHIMOTSUKI_DOJO_Y },
  dojoWellsCenter: { x: 14.0, z: 5.2, y: SHIMOTSUKI_DOJO_Y },
  cemeteryCenter: { x: -17.5, z: 7.4, y: SHIMOTSUKI_CEMETERY_Y },
  kuinaGrave: { x: -19.8, z: 5.1, y: SHIMOTSUKI_CEMETERY_Y },
  uCourtyardHouse: { x: -20.0, z: -10.2, y: SHIMOTSUKI_VILLAGE_Y },
  villageWell: { x: -7.5, z: -2.2, y: SHIMOTSUKI_VILLAGE_Y },
  pineOverlook: { x: 27.6, z: 8.6, y: 8.4 },
} as const;

export const SHIMOTSUKI_RIVER_POINTS: readonly [number, number][] = [
  [-36.5, 0.8],
  [-34.0, 2.0],
  [-28.5, 3.2],
  [-21.5, -0.5],
  [-14.5, -2.5],
  [-7.5, -4.6],
  [-1.5, -7.2],
  [2.5, -8.5],
  [5.8, -11.5],
  [7.8, -15.6],
  [8.4, -20.5],
  [8.9, -25.8],
];

/**
 * Cultivated patchwork fields matching shimotsuki2_bc97d55c.JPG
 * spread across the fertile southern & eastern valley floor.
 */
export const SHIMOTSUKI_FIELD_PLOTS: readonly ShimotsukiFieldPlotSpec[] = [
  { id: 'field-sw-1', cx: -8.5, cz: 13.8, hw: 3.4, hd: 2.2, yaw: 0.08, crop: 'ochre' },
  { id: 'field-sw-2', cx: -1.4, cz: 14.6, hw: 3.2, hd: 2.3, yaw: -0.05, crop: 'green' },
  { id: 'field-sw-3', cx: 5.4, cz: 13.4, hw: 3.1, hd: 2.1, yaw: 0.12, crop: 'ochre' },
  { id: 'field-s-4', cx: -6.8, cz: 19.2, hw: 3.6, hd: 2.1, yaw: 0.04, crop: 'green' },
  { id: 'field-s-5', cx: 0.8, cz: 19.6, hw: 3.4, hd: 2.2, yaw: -0.08, crop: 'ochre' },
  { id: 'field-s-6', cx: 7.8, cz: 18.0, hw: 2.9, hd: 2.0, yaw: 0.14, crop: 'tea' },
  { id: 'field-e-7', cx: 10.6, cz: 12.2, hw: 2.5, hd: 1.9, yaw: -0.14, crop: 'green' },
  { id: 'field-harbor-8', cx: 21.8, cz: -10.8, hw: 2.3, hd: 1.7, yaw: 0.02, crop: 'green' },
];

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

/** Distance from (x, z) to the winding Shimotsuki stream flowing into the northern harbor bay. */
export function sampleShimotsukiRiverDistance(x: number, z: number): {
  dist: number;
  halfWidth: number;
} {
  let minD = 999;
  for (let i = 0; i < SHIMOTSUKI_RIVER_POINTS.length - 1; i++) {
    const [ax, az] = SHIMOTSUKI_RIVER_POINTS[i];
    const [bx, bz] = SHIMOTSUKI_RIVER_POINTS[i + 1];
    const d = distToSegment2D(x, z, ax, az, bx, bz);
    if (d < minD) minD = d;
  }
  const mouthWiden = smoothstep(-9.0, -23.5, z) * 1.45;
  return { dist: minD, halfWidth: 1.55 + mouthWiden };
}

/**
 * Returns plot match + edge distance for the terraced agricultural fields.
 */
export function sampleShimotsukiFieldMask(x: number, z: number): {
  inField: boolean;
  edgeDist: number;
  crop: ShimotsukiFieldPlotSpec['crop'] | null;
} {
  let bestDist = 999;
  let bestCrop: ShimotsukiFieldPlotSpec['crop'] | null = null;

  for (const plot of SHIMOTSUKI_FIELD_PLOTS) {
    const dx = x - plot.cx;
    const dz = z - plot.cz;
    const c = Math.cos(plot.yaw);
    const s = Math.sin(plot.yaw);
    const lx = dx * c + dz * s;
    const lz = -dx * s + dz * c;
    const dBox = Math.max(Math.abs(lx) - plot.hw, Math.abs(lz) - plot.hd);
    if (dBox < bestDist) {
      bestDist = dBox;
      bestCrop = plot.crop;
    }
  }

  return {
    inField: bestDist < 0,
    edgeDist: bestDist,
    crop: bestDist < 0.7 ? bestCrop : null,
  };
}

/**
 * Signed distance (< 0 inside Shimotsuki village sandy dirt lanes, cemetery lane,
 * Isshin Dojo approach, harbor quay boardwalk, or bridge approach; > 0 outside).
 */
export function shimotsukiRoadSignedDist(x: number, z: number): number {
  let minD = 999;

  const segments: readonly [number, number, number, number, number][] = [
    // Harbor timber boardwalk & bay apron behind twin piers
    [10.0, -15.2, 23.0, -15.2, 1.6],
    [11.0, -13.0, 20.5, -13.0, 1.35],
    // Main Harbor-to-Bridge-to-Village Spine
    [13.5, -14.2, 6.2, -10.8, 1.45],
    [6.2, -10.8, 2.5, -8.5, 1.25], // Across wooden bridge
    [2.5, -8.5, -2.5, -5.0, 1.35],
    [-2.5, -5.0, -9.0, -0.5, 1.35],
    [-9.0, -0.5, -14.5, 4.2, 1.3], // Toward Cemetery & South Village
    [-14.5, 4.2, -15.2, 8.8, 1.2],
    // Branch East from Bridge/Harbor Junction to Isshin Dojo Courtyard Gate & Fields
    [6.2, -10.8, 7.6, -5.8, 1.35],
    [7.6, -5.8, 9.8, -3.5, 1.45],
    [7.6, -5.8, 2.5, 0.5, 1.2],
    [2.5, 0.5, -2.2, 7.8, 1.25],
    [-2.2, 7.8, -4.2, 15.8, 1.2],
    [-4.2, 15.8, 3.8, 16.5, 1.1],
    [-9.0, -0.5, -5.8, 8.5, 1.15],
    // Northern Bank Village Loop serving U-Shaped Courtyard House & Northern Minkas
    [-0.8, -6.5, -4.5, -11.0, 1.25],
    [-4.5, -11.0, -11.5, -13.2, 1.25],
    [-11.5, -13.2, -16.8, -10.2, 1.25],
    [-11.5, -13.2, -8.5, -7.8, 1.1],
  ];

  for (const [ax, az, bx, bz, halfW] of segments) {
    const d = distToSegment2D(x, z, ax, az, bx, bz) - halfW;
    if (d < minD) minD = d;
  }

  // Open sandy junction in front of Harbor Quay & Dojo Approach
  const dojoApproach = Math.hypot(x - 10.6, z + 3.4) - 2.6;
  if (dojoApproach < minD) minD = dojoApproach;

  return minD;
}

/**
 * Island silhouette mask faithful to shimotsuki_3d0ef7d2.png:
 * - Deep U-shaped Northern Harbor Bay
 * - Massive rounded western limestone hill massif + 2 small SW rocky islets
 * - Sweeping NE-SE-South terraced crescent highland ridge
 */
function sampleShimotsukiCoastMask(x: number, z: number): number {
  const westMassif =
    1 - smoothstep(0.50, 1.03, Math.hypot((x + 36.0) / 27.0, (z + 2.0) / 30.0));
  const nwCape =
    1 - smoothstep(0.46, 1.03, Math.hypot((x + 17.5) / 21.0, (z + 25.0) / 18.0));
  const villageHeart =
    1 - smoothstep(0.50, 1.03, Math.hypot((x - 1.5) / 27.0, (z + 2.0) / 20.0));
  const neHeadland =
    1 - smoothstep(0.46, 1.03, Math.hypot((x - 35.5) / 17.5, (z + 21.0) / 22.0));
  const eastBelly =
    1 - smoothstep(0.50, 1.04, Math.hypot((x - 28.5) / 25.0, (z - 11.0) / 28.0));
  const southRidge =
    1 - smoothstep(0.50, 1.04, Math.hypot((x - 2.0) / 36.0, (z - 27.0) / 20.5));
  const swSpur =
    1 - smoothstep(0.44, 1.02, Math.hypot((x + 28.0) / 18.0, (z - 25.5) / 14.0));

  // Two signature small rocky islets off the SW tip visible on shimotsuki_3d0ef7d2.png
  const swIsletA =
    1 - smoothstep(0.32, 1.0, Math.hypot((x + 53.5) / 4.2, (z - 23.0) / 2.8));
  const swIsletB =
    1 - smoothstep(0.32, 1.0, Math.hypot((x + 46.8) / 3.4, (z - 25.5) / 2.5));

  const coreBase = Math.max(
    westMassif,
    nwCape,
    villageHeart,
    neHeadland,
    eastBelly,
    southRidge,
    swSpur,
    swIsletA * 0.78,
    swIsletB * 0.74
  );

  const ang = Math.atan2(z, x);
  const jaggedRaw =
    (valueNoise2D(x * 0.088 + 3.1, z * 0.088 - 5.4) - 0.5) * 0.095 +
    (valueNoise2D(x * 0.21 + 1.8, z * 0.21 + 4.9) - 0.5) * 0.042 +
    Math.sin(ang * 9.0 + 0.8) * 0.02;
  // Taper jaggedness strictly to outer coastal shoreline band -> zero interior pinholes
  const coastBand =
    smoothstep(0.05, 0.42, coreBase) * (1 - smoothstep(0.66, 0.94, coreBase));
  let mask = clamp(coreBase + jaggedRaw * coastBand, 0, 1);

  // Carve the deep Northern Harbor Bay cleanly down to the quay & river mouth (x: -2..+26, z < -15)
  const bayBowl =
    1 - smoothstep(0.30, 1.0, Math.hypot((x - 12.0) / 16.5, (z + 30.5) / 17.5));
  mask *= 1 - bayBowl * 0.96;

  // Carve straight northern harbor edge right in front of timber quay wall (z < -16.4 around x: 10.8..25.5)
  if (x >= 10.6 && x <= 25.5 && z < -16.2) {
    const quayCut = smoothstep(-16.2, -19.2, z);
    mask *= 1 - quayCut * 0.96;
  }

  // Open river-mouth estuary corridor directly into the northern harbor bay
  const estuaryCut =
    (1 - smoothstep(1.8, 5.2, Math.abs(x - 8.4))) *
    (1 - smoothstep(-19.2, -14.8, z));
  mask *= 1 - estuaryCut * 0.96;

  // Western indentation north of NW peninsula
  const nwNotch =
    1 - smoothstep(0.28, 1.0, Math.hypot((x + 44.0) / 12.0, (z + 30.0) / 10.0));
  mask *= 1 - nwNotch * 0.52;

  // Clean outer falloff inside the 260x260 mesh
  const outerFade = 1 - smoothstep(0.84, 1.0, Math.hypot(x / 84.0, z / 74.0));
  mask *= outerFade;

  return clamp(mask, 0, 1);
}

/**
 * Sculpted heightmap for Shimotsuki Island & Village:
 * - Seabed plunges solidly down to -6.5m (sinks safely beneath the ocean sphere curvature)
 * - U-shaped Northern Harbor Bay submerged cleanly below -1.8m for wooden piers & fishing boats
 * - Layered coastal/village meadow, Japanese Cemetery plot, Isshin Dojo platform, patchwork fields
 * - Western circular terraced limestone cliff massif cradling the river source
 * - Eastern & Southern Crescent tiered green hills & terraced cliffs
 */
export function sampleShimotsukiHeight(x: number, z: number): number {
  const coast = sampleShimotsukiCoastMask(x, z);
  let h = -6.5 + (valueNoise2D(x * 0.09, z * 0.09) - 0.5) * 0.22;

  if (coast <= 0.01) {
    return h;
  }

  const subT = smoothstep(0.02, 0.34, coast);
  const shoreT = smoothstep(0.32, 0.56, coast);
  const inlandT = smoothstep(0.52, 0.88, coast);
  h = -6.5 + subT * 4.9 + shoreT * 2.25 + inlandT * 1.9; // -6.5m -> -1.6m -> +0.65m -> +2.55m

  // Gentle valley grass undulation outside flat settlement zones
  const valleyWave = (valueNoise2D(x * 0.055 - 4.1, z * 0.055 + 8.3) - 0.38) * 1.8;
  h += Math.max(0, valleyWave) * inlandT;

  // 1. Western Oval Horseshoe Terraced Limestone Massif (centered ~(-36, -3))
  const wEll = Math.hypot((x + 36.0) / 21.5, (z + 3.0) / 24.5);
  const wOuterStep = (1 - smoothstep(0.74, 1.02, wEll)) * smoothstep(0.45, 0.72, coast);
  const wMidStep = (1 - smoothstep(0.48, 0.70, wEll)) * smoothstep(0.55, 0.80, coast);
  // Inner crater depression holding the river headwater spring unless near the very central crag spire
  const wCraterDip = (1 - smoothstep(0.28, 0.50, wEll)) * 0.82;
  const wInnerSpire = (1 - smoothstep(0.08, 0.22, Math.hypot((x + 39.5) / 6.5, (z + 7.5) / 8.0))) * 4.4;
  // River notch opening eastward out of western basin toward village (around z = -3..+4, x = -28..-16)
  const gorgeOpening =
    (1 - smoothstep(3.2, 8.2, Math.abs(z - 0.5))) * smoothstep(-35.0, -21.0, x);
  const westCliffGain =
    (wOuterStep * 3.8 + wMidStep * 4.4 - wCraterDip * 3.2 + wInnerSpire) *
    (1 - gorgeOpening * 0.88);
  h = Math.max(h, SHIMOTSUKI_VILLAGE_Y + Math.max(0, westCliffGain));

  // 2. NW Peninsula Forested Mound (-16, -24)
  const nwHillDist = Math.hypot((x + 16.0) / 14.5, (z + 25.0) / 12.5);
  const nwHill = (1 - smoothstep(0.42, 0.98, nwHillDist)) * smoothstep(0.48, 0.76, coast);
  h = Math.max(h, SHIMOTSUKI_VILLAGE_Y + nwHill * 5.2);

  // 3. Sweeping Eastern & Southern Crescent Terraced Cliff Ridge (from NE headland around SE to South)
  // Arc centerline curving from (35, -20) -> (38, 4) -> (26, 23) -> (2, 29) -> (-22, 26)
  const crescentPts: readonly [number, number][] = [
    [36.0, -20.0],
    [39.5, -5.0],
    [35.5, 11.0],
    [24.0, 22.5],
    [6.0, 29.0],
    [-14.0, 27.5],
    [-28.5, 22.0],
  ];
  let cDist = 999;
  for (let i = 0; i < crescentPts.length - 1; i++) {
    const d = distToSegment2D(
      x,
      z,
      crescentPts[i][0],
      crescentPts[i][1],
      crescentPts[i + 1][0],
      crescentPts[i + 1][1]
    );
    if (d < cDist) cDist = d;
  }
  const cOuter = (1 - smoothstep(7.5, 13.5, cDist)) * smoothstep(0.45, 0.74, coast);
  const cMid = (1 - smoothstep(4.0, 7.2, cDist)) * smoothstep(0.52, 0.80, coast);
  const cCrest = (1 - smoothstep(1.2, 3.6, cDist)) * smoothstep(0.58, 0.84, coast);
  h = Math.max(
    h,
    SHIMOTSUKI_VILLAGE_Y +
      cOuter * (SHIMOTSUKI_MID_HILL_Y - SHIMOTSUKI_VILLAGE_Y) +
      cMid * (SHIMOTSUKI_RIDGE_Y - SHIMOTSUKI_MID_HILL_Y) +
      cCrest * (SHIMOTSUKI_PEAK_Y - SHIMOTSUKI_RIDGE_Y)
  );

  // Inner tiered knoll inside eastern crescent loop around (25, 10) + ridge-pine overlook bench around (29.2, 7.8)
  const eastKnoll = Math.hypot((x - 28.0) / 9.5, (z - 8.5) / 9.0);
  const knollRaise = (1 - smoothstep(0.45, 1.0, eastKnoll)) * smoothstep(0.5, 0.78, coast);
  h = Math.max(h, SHIMOTSUKI_VILLAGE_Y + knollRaise * 6.4);

  // Gentle pine overlook terrace shelf right at SHIMOTSUKI_LANDMARKS.pineOverlook (27.6, 8.6) -> ~8.4m
  const pineBench = Math.hypot(
    (x - SHIMOTSUKI_LANDMARKS.pineOverlook.x) / 4.2,
    (z - SHIMOTSUKI_LANDMARKS.pineOverlook.z) / 4.2
  );
  if (pineBench < 1.0) {
    const bT = 1 - smoothstep(0.35, 1.0, pineBench);
    h = h * (1 - bT * 0.88) + 8.4 * (bT * 0.88);
  }

  // Flatten walkable Shimotsuki Village & Fertile Fields Valley Basin
  if (x >= -24.5 && x <= 15.8 && z >= -16.5 && z <= 23.0) {
    const valleyMask =
      smoothstep(-24.5, -20.5, x) *
      (1 - smoothstep(11.5, 15.8, x)) *
      smoothstep(-16.5, -13.0, z) *
      (1 - smoothstep(19.5, 23.0, z)) *
      smoothstep(0.42, 0.70, coast);
    h = h * (1 - valleyMask * 0.96) + SHIMOTSUKI_VILLAGE_Y * (valleyMask * 0.96);
  }

  // Slight gentle terraced field lift (2.52m) over agricultural plots
  const fMask = sampleShimotsukiFieldMask(x, z);
  if (fMask.edgeDist < 0.9 && coast > 0.5) {
    const fT = 1 - smoothstep(-0.2, 0.9, fMask.edgeDist);
    h = h * (1 - fT * 0.9) + SHIMOTSUKI_FIELDS_Y * (fT * 0.9);
  }

  // Cemetery terrace plot (-17.5, +7.4) flat at 2.65m
  const cemDist = Math.hypot((x + 17.5) / 5.8, (z - 7.4) / 4.8);
  if (cemDist < 1.0 && coast > 0.5) {
    const cemT = 1 - smoothstep(0.55, 1.0, cemDist);
    h = h * (1 - cemT * 0.95) + SHIMOTSUKI_CEMETERY_Y * (cemT * 0.95);
  }

  // Isshin Dojo rectangular courtyard terrace (center (12.8, -2.0)) flat at 2.75m
  const dojoDx = Math.abs(x - 13.0) / 7.8;
  const dojoDz = Math.abs(z + 1.8) / 7.2;
  const dojoBox = Math.max(dojoDx, dojoDz);
  if (dojoBox < 1.0 && coast > 0.5) {
    const dojoT = 1 - smoothstep(0.68, 1.0, dojoBox);
    h = h * (1 - dojoT * 0.96) + SHIMOTSUKI_DOJO_Y * (dojoT * 0.96);
  }

  // Northern Harbor Quay terrace apron behind seawall (x: 11..24.5, z: -16.5..-12.2)
  if (x >= 10.8 && x <= 24.5 && z >= -16.8 && z <= -12.2) {
    const quayBand =
      smoothstep(10.8, 12.0, x) *
      (1 - smoothstep(22.5, 24.5, x)) *
      smoothstep(-16.8, -16.2, z) *
      (1 - smoothstep(-14.2, -12.2, z));
    h = h * (1 - quayBand * 0.96) + SHIMOTSUKI_QUAY_Y * (quayBand * 0.96);
  }

  // Keep Northern Harbor Bay seabed submerged below water for twin piers & boats
  const bayDeep =
    1 - smoothstep(0.28, 0.98, Math.hypot((x - 14.5) / 15.0, (z + 24.5) / 9.0));
  if (bayDeep > 0.01 && z < -16.2) {
    h = Math.min(h, -2.2 - bayDeep * 1.6);
  }

  // Carve winding river channel from western crater spring all the way out into northern bay
  const river = sampleShimotsukiRiverDistance(x, z);
  if (river.dist < river.halfWidth + 1.8 && x > -40.5 && z > -28.0) {
    const channelT = 1 - smoothstep(river.halfWidth * 0.44, river.halfWidth + 1.55, river.dist);
    const springFade = smoothstep(-40.5, -36.5, x);
    const bayMouthDeepen = smoothstep(-14.5, -22.5, z) * 1.25;
    const bedDepth = -2.45 - bayMouthDeepen;
    h = h * (1 - channelT * springFade) + bedDepth * (channelT * springFade);
  }

  return h;
}

/**
 * Walkable elevation sampler including the arched village wooden bridge,
 * northern harbor timber quay, and twin wooden piers.
 */
export function sampleShimotsukiWalkSurfaceHeight(x: number, z: number): number {
  const h = sampleShimotsukiHeight(x, z);

  // Wooden bridge crossing stream around (2.5, -8.5) connecting (-1.5,-7.2)->(6.2,-10.8)
  const bDx = x - 2.5;
  const bDz = z + 8.5;
  const bAng = -0.36;
  const bl = bDx * Math.cos(bAng) + bDz * Math.sin(bAng);
  const bw = -bDx * Math.sin(bAng) + bDz * Math.cos(bAng);
  if (Math.abs(bl) <= 3.9 && Math.abs(bw) <= 1.35) {
    const u = (bl + 3.9) / 7.8;
    const archH = SHIMOTSUKI_VILLAGE_Y + 0.1 + Math.sin(u * Math.PI) * 0.78;
    return Math.max(h, archH);
  }

  // Harbor Quay boardwalk (x: 11..23, z: -16.6..-14.8)
  if (x >= 10.5 && x <= 23.5 && z >= -16.8 && z <= -14.8) {
    return Math.max(h, SHIMOTSUKI_QUAY_Y + 0.14);
  }

  // Twin Harbor Wooden Piers extending North (-Z)
  if (
    (Math.abs(x - 13.5) <= 0.95 && z >= -24.2 && z <= -15.8) ||
    (Math.abs(x - 19.8) <= 0.95 && z >= -22.6 && z <= -15.8)
  ) {
    return Math.max(h, SHIMOTSUKI_QUAY_Y + 0.18);
  }

  return h;
}

/**
 * Traditional Japanese houses (`minka` & `machiya`), harbor storehouses,
 * U-shaped western courtyard compound, and the hero Isshin Dojo —
 * faithfully placed per shimotsuki_3d0ef7d2.png.
 */
export function buildShimotsukiBuildings(): ShimotsukiBuildingSpec[] {
  const specs: ShimotsukiBuildingSpec[] = [];

  const creamPlaster = 0xf4efe2;
  const warmPlaster = 0xeee4cf;
  const softStoneWall = 0xe8e4d8;
  const slateBlueRoof = 0x45536b;
  const charcoalTileRoof = 0x3b4456;
  const indigoSlateRoof = 0x4c5d7a;

  // 1. Hero Building: Isshin Dojo (一心道場)
  specs.push({
    id: 'isshin-dojo',
    x: SHIMOTSUKI_LANDMARKS.isshinDojo.x,
    z: SHIMOTSUKI_LANDMARKS.isshinDojo.z,
    y: sampleShimotsukiHeight(
      SHIMOTSUKI_LANDMARKS.isshinDojo.x,
      SHIMOTSUKI_LANDMARKS.isshinDojo.z
    ),
    width: 7.4,
    depth: 5.4,
    height: 3.1,
    yaw: SHIMOTSUKI_LANDMARKS.isshinDojo.yaw,
    wallColor: creamPlaster,
    roofColor: slateBlueRoof,
    style: 'dojo',
    hasEngawa: true,
    hasLantern: true,
  });

  const villageSpecs: readonly Omit<ShimotsukiBuildingSpec, 'y'>[] = [
    // Western U-shaped traditional manor compound (-20, -10.2) visible at far left of village map
    {
      id: 'sh-u-compound',
      x: -20.0,
      z: -10.2,
      width: 5.2,
      depth: 4.8,
      height: 2.35,
      yaw: 0.2,
      wallColor: warmPlaster,
      roofColor: charcoalTileRoof,
      style: 'courtyard-u',
      hasEngawa: true,
      hasLantern: true,
    },
    // Northern Riverbank Village Row (north of winding river)
    {
      id: 'sh-n1',
      x: -14.8,
      z: -15.6,
      width: 4.1,
      depth: 3.0,
      height: 2.2,
      yaw: -0.25,
      wallColor: creamPlaster,
      roofColor: slateBlueRoof,
      style: 'minka',
      hasEngawa: true,
    },
    {
      id: 'sh-n2',
      x: -8.6,
      z: -15.4,
      width: 3.8,
      depth: 2.8,
      height: 2.15,
      yaw: 0.12,
      wallColor: warmPlaster,
      roofColor: indigoSlateRoof,
      style: 'minka',
      hasLantern: true,
    },
    {
      id: 'sh-n3',
      x: -3.2,
      z: -13.6,
      width: 3.9,
      depth: 2.8,
      height: 2.25,
      yaw: -0.35,
      wallColor: softStoneWall,
      roofColor: charcoalTileRoof,
      style: 'minka',
      hasEngawa: true,
    },
    {
      id: 'sh-n4',
      x: -12.6,
      z: -7.6,
      width: 3.8,
      depth: 2.7,
      height: 2.1,
      yaw: 0.28,
      wallColor: creamPlaster,
      roofColor: slateBlueRoof,
      style: 'minka',
    },
    {
      id: 'sh-n5',
      x: -6.8,
      z: -10.1,
      width: 3.6,
      depth: 2.6,
      height: 2.05,
      yaw: -0.35,
      wallColor: warmPlaster,
      roofColor: charcoalTileRoof,
      style: 'minka',
      hasLantern: true,
    },

    // Southern Riverbank Village Houses (south of river & around trails)
    {
      id: 'sh-s1',
      x: -11.4,
      z: -0.8,
      width: 4.3,
      depth: 3.1,
      height: 2.25,
      yaw: -0.18,
      wallColor: warmPlaster,
      roofColor: indigoSlateRoof,
      style: 'minka',
      hasEngawa: true,
      hasLantern: true,
    },
    {
      id: 'sh-s2',
      x: -4.2,
      z: -1.4,
      width: 3.8,
      depth: 2.7,
      height: 2.15,
      yaw: 0.42,
      wallColor: creamPlaster,
      roofColor: slateBlueRoof,
      style: 'minka',
    },
    {
      id: 'sh-s3',
      x: 1.6,
      z: -3.2,
      width: 3.7,
      depth: 2.6,
      height: 2.1,
      yaw: -0.52,
      wallColor: softStoneWall,
      roofColor: charcoalTileRoof,
      style: 'minka',
      hasLantern: true,
    },
    {
      id: 'sh-s4',
      x: -10.8,
      z: 5.0,
      width: 3.8,
      depth: 2.8,
      height: 2.15,
      yaw: 0.22,
      wallColor: creamPlaster,
      roofColor: slateBlueRoof,
      style: 'minka',
      hasEngawa: true,
    },
    {
      id: 'sh-s5',
      x: -5.4,
      z: 8.6,
      width: 4.2,
      depth: 3.0,
      height: 2.3,
      yaw: 0.08,
      wallColor: warmPlaster,
      roofColor: charcoalTileRoof,
      style: 'minka',
      hasEngawa: true,
      hasLantern: true,
    },
    // Farmstead near the terraced fields & valley road (visible in shimotsuki2_bc97d55c.JPG)
    {
      id: 'sh-farm-1',
      x: 8.6,
      z: 7.4,
      width: 4.0,
      depth: 2.9,
      height: 2.2,
      yaw: -0.35,
      wallColor: creamPlaster,
      roofColor: indigoSlateRoof,
      style: 'minka',
      hasEngawa: true,
    },

    // Northern Harbor Storehouses right behind the Timber Quay & Twin Piers
    {
      id: 'sh-harbor-1',
      x: 12.2,
      z: -10.2,
      width: 4.0,
      depth: 2.8,
      height: 2.25,
      yaw: 0.14,
      wallColor: softStoneWall,
      roofColor: charcoalTileRoof,
      style: 'storehouse',
      hasLantern: true,
    },
    {
      id: 'sh-harbor-2',
      x: 17.6,
      z: -10.4,
      width: 4.4,
      depth: 2.8,
      height: 2.3,
      yaw: -0.06,
      wallColor: creamPlaster,
      roofColor: slateBlueRoof,
      style: 'storehouse',
      hasLantern: true,
    },
  ];

  for (const b of villageSpecs) {
    specs.push({
      ...b,
      y: sampleShimotsukiHeight(b.x, b.z),
    });
  }

  return specs;
}

/**
 * Dense Japanese woodland cedar/pine & broadleaf hill groves around Shimotsuki Island,
 * strictly excluding roads, cultivated fields, cemetery, harbor bay, river, buildings,
 * and the eastern pine-overlook camera sightline.
 */
export function buildShimotsukiTrees(): ShimotsukiTreeSpec[] {
  const trees: ShimotsukiTreeSpec[] = [];
  let idx = 0;
  const buildings = buildShimotsukiBuildings();

  const pushTree = (x: number, z: number, scale: number, kind: ShimotsukiTreeSpec['kind']) => {
    const y = sampleShimotsukiHeight(x, z);
    if (y < 1.35) return;
    if (shimotsukiRoadSignedDist(x, z) < 1.15) return;

    const river = sampleShimotsukiRiverDistance(x, z);
    if (river.dist < river.halfWidth + 1.4) return;

    // Exclude agricultural terraced field zones
    const fMask = sampleShimotsukiFieldMask(x, z);
    if (fMask.edgeDist < 1.35) return;

    // Exclude Cemetery plot
    if (Math.hypot((x + 17.5) / 7.2, (z - 7.4) / 6.2) < 1.0) return;

    // Exclude Isshin Dojo walled courtyard + 3 stone training wells outside south wall
    if (Math.abs(x - 13.2) < 9.0 && Math.abs(z + 1.2) < 8.4) return;

    // Keep pineOverlook summit camera sightline clear of stray instanced trees
    if (Math.hypot(x - SHIMOTSUKI_LANDMARKS.pineOverlook.x, z - SHIMOTSUKI_LANDMARKS.pineOverlook.z) < 6.0) {
      return;
    }

    // Keep sheer cliff faces bare so grey limestone terraces show cleanly
    const hx = sampleShimotsukiHeight(x + 1.1, z);
    const hz = sampleShimotsukiHeight(x, z + 1.1);
    if (Math.hypot(hx - y, hz - y) > 0.72) return;

    for (const b of buildings) {
      if (
        Math.abs(x - b.x) < b.width * 0.5 + 1.8 &&
        Math.abs(z - b.z) < b.depth * 0.5 + 1.8
      ) {
        return;
      }
    }

    trees.push({
      id: `shimotsuki-tree-${idx++}`,
      x,
      z,
      y,
      scale,
      tint: 0.84 + valueNoise2D(x * 0.25, z * 0.25) * 0.3,
      kind,
    });
  };

  // Vogel spiral canopy across northern, western, eastern & southern hill belts
  const totalSamples = 340;
  for (let i = 0; i < totalSamples; i++) {
    const ang = i * 2.39996;
    const rad = 8 + Math.sqrt((i + 0.5) / totalSamples) * 62;
    const tx = Math.cos(ang) * rad;
    const tz = Math.sin(ang) * rad;
    const kind: ShimotsukiTreeSpec['kind'] = i % 3 === 0 ? 'pine' : 'broadleaf';
    pushTree(tx, tz, 1.0 + (i % 4) * 0.16, kind);
  }

  // Curated village accent trees framing houses & cemetery edge cleanly
  const accentTrees: readonly [number, number, number, ShimotsukiTreeSpec['kind']][] = [
    [-22.5, -4.5, 1.15, 'broadleaf'],
    [-23.5, 3.8, 1.2, 'pine'],
    [-19.5, 14.5, 1.25, 'broadleaf'],
    [-1.2, -16.8, 1.15, 'broadleaf'],
    [-19.2, -16.8, 1.2, 'pine'],
    [22.5, -14.5, 1.18, 'broadleaf'],
    [23.5, -5.5, 1.22, 'pine'],
    [19.2, 6.2, 1.15, 'broadleaf'],
    [-12.5, 19.5, 1.25, 'broadleaf'],
    [13.8, 16.5, 1.25, 'pine'],
  ];
  for (const [ax, az, sc, kind] of accentTrees) {
    pushTree(ax, az, sc, kind);
  }

  return trees;
}

export const SHIMOTSUKI_BUILDINGS: readonly ShimotsukiBuildingSpec[] =
  buildShimotsukiBuildings();
export const SHIMOTSUKI_TREES: readonly ShimotsukiTreeSpec[] =
  buildShimotsukiTrees();

export function toShimotsukiSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * SHIMOTSUKI_GLOBE_SCALE;
  const sz = z * SHIMOTSUKI_GLOBE_SCALE;
  const rTarget =
    globeRadius + (y + SHIMOTSUKI_SPHERE_SEA_OFFSET) * SHIMOTSUKI_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * 6 curated camera presets from Full Island Overview & Harbor Bay Piers
 * down to Human-Scale Immersion (Isshin Dojo Courtyard, Cemetery & Kuina's Grave,
 * Village Wooden Bridge, and the Iconic Eastern Ridge Pine Field Overlook).
 */
export const SHIMOTSUKI_CAMERA_PRESETS: ShimotsukiCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle:
      "Île de Shimotsuki · Massif rocheux ouest, baie nord & pontons, maisons japonaises, cimetière, Dojo Isshin, champs cultivés et crête sud-est",
    position: [2, 114, 118],
    target: [0, 3, -1],
    isStreetView: false,
  },
  {
    id: 'harbor-bay',
    label: 'Baie & Pontons',
    subtitle:
      'Baie nord de Shimotsuki avec quai en bois, double ponton, barques traditionnelles, entrepôts et embouchure de la rivière',
    position: [15.5, 11.5, -56.0],
    target: [13.5, 2.2, -13.0],
    isStreetView: false,
  },
  {
    id: 'isshin-dojo',
    label: 'Dojo Isshin (Cour)',
    subtitle:
      "À hauteur d'homme devant le portail et la cour sableuse du Dojo Isshin (一心道場), sa véranda engawa et son toit irimoya en tuiles bleues",
    position: [5.4, sampleShimotsukiWalkSurfaceHeight(5.4, -7.2) + 1.85, -7.2],
    target: [SHIMOTSUKI_LANDMARKS.isshinDojo.x, SHIMOTSUKI_DOJO_Y + 2.35, SHIMOTSUKI_LANDMARKS.isshinDojo.z],
    isStreetView: true,
  },
  {
    id: 'cemetery-kuina',
    label: 'Cimetière & Stèle',
    subtitle:
      "À hauteur d'homme dans le cimetière japonais devant les rangées de stèles en pierre et la tombe fleurie de Kuina",
    position: [-16.6, sampleShimotsukiWalkSurfaceHeight(-16.6, 2.4) + 1.85, 2.4],
    target: [-19.4, SHIMOTSUKI_CEMETERY_Y + 0.72, 5.8],
    isStreetView: true,
  },
  {
    id: 'village-bridge',
    label: 'Pont & Rue (Minka)',
    subtitle:
      "À hauteur d'homme devant le pont en bois enjambant la rivière et les maisons traditionnelles japonaises à toits de tuiles sombres",
    position: [8.4, sampleShimotsukiWalkSurfaceHeight(8.4, -10.8) + 1.85, -10.8],
    target: [-2.0, SHIMOTSUKI_VILLAGE_Y + 1.35, -7.8],
    isStreetView: true,
  },
  {
    id: 'ridge-pine-overlook',
    label: 'Pin & Champs (Colline)',
    subtitle:
      "Sous les branches noueuses du pin de la colline est, surplombant la vallée verdoyante, les parcelles de champs ocre/verts et les maisons",
    position: [30.2, sampleShimotsukiWalkSurfaceHeight(30.2, 9.8) + 1.85, 9.8],
    target: [-1.5, SHIMOTSUKI_FIELDS_Y + 0.9, 12.2],
    isStreetView: true,
  },
];
