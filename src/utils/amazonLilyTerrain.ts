import { valueNoise2D } from './globeMath';

export const AMAZON_LILY_WORLD_SIZE = 260;
export const AMAZON_LILY_GLOBE_SCALE = 0.0018;
export const AMAZON_LILY_GLOBE_CENTER = { u: 0.854, v: 0.576 } as const;
export const AMAZON_LILY_ANGULAR_MASK_RADIUS = 0.025;
export const AMAZON_LILY_SEA_LEVEL_Y = 0.0;
export const AMAZON_LILY_CRATER_FLOOR_Y = 3.4;
export const AMAZON_LILY_CRATER_RIM_RADIUS = 37.5;
export const AMAZON_LILY_CRATER_RIM_Y = 42.0;
export const AMAZON_LILY_PALACE_CENTER = { x: -16.5, z: -21.0, y: 22.5 } as const;
export const AMAZON_LILY_ARENA_CENTER = {
  x: -2.0,
  z: 2.0,
  floorY: 4.2,
  pitY: 1.9,
  innerRadius: 5.2,
  pitOuterRadius: 7.9,
  standOuterRadius: 11.4,
} as const;
export const AMAZON_LILY_GORGON_TOWER = { x: -2.0, z: -12.8, y: 4.4 } as const;

export const AMAZON_LILY_PORT_CHANNEL = {
  basinCenter: { x: 24.0, z: 9.0 },
  portalMid: { x: 47.0, z: 21.0 },
  seaMouth: { x: 84.0, z: 39.0 },
  doorCenter: { x: 48.0, z: 21.5 },
  doorYaw: 1.09,
} as const;

export interface AmazonLilyHouseSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  yaw: number;
  stiltHeight: number;
  wallColor: number;
  roofColor: number;
  isCliffStilt: boolean;
}

export interface AmazonLilyTreeSpec {
  id: string;
  kind: 'jungle-canopy' | 'palm' | 'cliff-pine';
  x: number;
  z: number;
  y: number;
  scale: number;
  yaw: number;
  tint: number;
}

export interface AmazonLilyMushroomSpec {
  id: string;
  kind: 'parasite-glow' | 'giant-spotted' | 'cluster';
  x: number;
  z: number;
  y: number;
  scale: number;
  yaw: number;
  capColor: number;
}

export interface AmazonLilyFaunaSpec {
  id: string;
  kind: 'giant-boar' | 'panther' | 'giant-snake';
  x: number;
  z: number;
  y: number;
  scale: number;
  yaw: number;
}

export interface AmazonLilyCameraPreset {
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
 * Sinueux chemin de rivière au fond du cratère rejoignant le bassin portuaire intérieur.
 */
export const AMAZON_LILY_RIVER_POINTS: readonly [number, number][] = [
  [-18.0, 21.0],
  [-9.5, 22.5],
  [2.5, 20.5],
  [12.5, 15.0],
  [20.5, 9.5],
];

/**
 * Sentiers de terre battue dans la jungle côtière et le cratère.
 */
export const AMAZON_LILY_TRAILS: readonly (readonly [number, number][])[] = [
  // Jungle trail on SW/S coast
  [
    [-68.0, 56.0],
    [-55.0, 58.0],
    [-40.0, 54.0],
    [-26.0, 58.0],
    [-12.0, 62.0],
  ],
  // Inner crater main market & arena promenade
  [
    [-2.0, 14.5],
    [-2.0, 4.0],
    [7.5, 3.0],
    [15.5, 5.5],
    [17.5, 16.5],
  ],
  // Staircase / ramp ascending to the Kuja Palace
  [
    [-9.5, -6.5],
    [-10.5, -13.5],
    [-13.5, -17.5],
    [-16.5, -20.5],
  ],
];

/**
 * Pitons rocheux périphériques autour de la montagne centrale (fidèles à image_422abdc3.png).
 */
const OUTER_ROCK_SPIRES: readonly { x: number; z: number; rx: number; h: number }[] = [
  { x: -64.0, z: 24.0, rx: 10.5, h: 24.0 },
  { x: -50.0, z: 34.0, rx: 9.0, h: 19.5 },
  { x: 52.0, z: -12.0, rx: 11.5, h: 25.0 },
  { x: 64.0, z: 10.0, rx: 9.8, h: 21.0 },
  { x: -56.0, z: -36.0, rx: 12.0, h: 26.5 },
  { x: 42.0, z: -50.0, rx: 11.0, h: 24.0 },
];

export function amazonLilyCoastSignedDist(x: number, z: number): number {
  const ang = Math.atan2(z, x);
  const r = Math.hypot(x, z);
  const coastalOutline =
    90.0 +
    Math.cos(ang * 3.0 + 0.6) * 6.5 +
    Math.sin(ang * 5.0 - 0.9) * 4.2 +
    (valueNoise2D(x * 0.045 + 2.1, z * 0.045 - 1.4) - 0.5) * 9.0;
  return r - coastalOutline;
}

export function amazonLilyRiverSignedDist(x: number, z: number): number {
  return distToPolyline2D(x, z, AMAZON_LILY_RIVER_POINTS) - 2.3;
}

export function amazonLilyPortWaterSignedDist(x: number, z: number): number {
  const basinDist =
    Math.hypot((x - 23.0) / 8.8, (z - 9.0) / 7.2) * 7.2 - 7.2;
  const channelDist =
    distToSegment2D(
      x,
      z,
      AMAZON_LILY_PORT_CHANNEL.basinCenter.x,
      AMAZON_LILY_PORT_CHANNEL.basinCenter.z,
      AMAZON_LILY_PORT_CHANNEL.seaMouth.x,
      AMAZON_LILY_PORT_CHANNEL.seaMouth.z
    ) - 6.4;
  return Math.min(basinDist, channelDist);
}

export function amazonLilyPathSignedDist(x: number, z: number): number {
  let minD = Infinity;
  for (const trail of AMAZON_LILY_TRAILS) {
    const d = distToPolyline2D(x, z, trail) - 1.65;
    if (d < minD) minD = d;
  }
  return minD;
}

/**
 * Signed distance to narrow sandy beaches tucked into coastal coves (< 0 = beach cove).
 */
export function amazonLilyBeachCoveFactor(x: number, z: number): number {
  const southWestCove = Math.exp(
    -(Math.pow((x + 48) / 22, 2) + Math.pow((z - 76) / 14, 2))
  );
  const northEastCove = Math.exp(
    -(Math.pow((x - 66) / 18, 2) + Math.pow((z + 58) / 16, 2))
  );
  return clamp(Math.max(southWestCove, northEastCove), 0, 1);
}

/**
 * Heightmap continu d'Amazon Lily (en mètres locaux, niveau de la mer = 0m) :
 * - Océan au large & bassin marin : -2.8m .. -0.3m
 * - Plages étroites dans les criques : 0 .. +1.6m
 * - Falaises côtières abruptes & plateau de jungle dense : +7.5m .. +12.5m
 * - Pitons rocheux périphériques : +19m .. +26m
 * - Montagne centrale en cône tronqué : grimpe jusqu'à la crête à y = +42m (r = 37.5m)
 * - Cratère central en amphithéâtre : gradins intérieurs descendant à y = +3.4m
 * - Arène de combat au centre + fosse à pieux (+2.0m) + esplanade du Palais Kuja (+22.5m)
 * - Chenal du port souterrain creusé au niveau de la mer (-2.4m) sous une voûte 3D
 */
export function sampleAmazonLilyHeight(x: number, z: number): number {
  const coastSd = amazonLilyCoastSignedDist(x, z);
  const r = Math.hypot(x, z);
  const ang = Math.atan2(z, x);

  const seaBed =
    -2.9 + (valueNoise2D(x * 0.08 + 1.1, z * 0.08 + 3.7) - 0.5) * 0.35;

  const portSd = amazonLilyPortWaterSignedDist(x, z);

  // Outside coastline
  if (coastSd > 4.5 && portSd > 3.5) {
    return seaBed;
  }

  // Coastal cliff rise (with gentle narrow sandy slope in coves)
  const beachFactor = amazonLilyBeachCoveFactor(x, z);
  const cliffWidth = 2.6 + beachFactor * 7.8;
  const landMask = 1 - smoothstep(-cliffWidth, 3.2, coastSd);
  const jungleNoise =
    valueNoise2D(x * 0.055 + 4.4, z * 0.055 - 2.3) * 3.4 +
    valueNoise2D(x * 0.14 - 1.7, z * 0.14 + 5.1) * 1.4;
  let baseHeight = 8.4 + jungleNoise;

  // Slightly flatten beach shelf in coves before climbing inland cliff
  if (beachFactor > 0.25 && coastSd > -8.5) {
    const beachRamp = smoothstep(2.5, -7.5, coastSd);
    baseHeight = baseHeight * (1 - beachFactor * 0.65) + beachRamp * 3.2;
  }

  let h = seaBed * (1 - landMask) + baseHeight * landMask;

  // Flanking coastal & jungle rock spires (image_422abdc3.png)
  for (const spire of OUTER_ROCK_SPIRES) {
    const d = Math.hypot(x - spire.x, z - spire.z);
    if (d < spire.rx * 1.6) {
      const t = 1 - smoothstep(spire.rx * 0.28, spire.rx * 1.45, d);
      const crag = (valueNoise2D(x * 0.28, z * 0.28) - 0.3) * 2.2;
      h = Math.max(h, (spire.h + crag) * t + baseHeight * (1 - t));
    }
  }

  // Central Truncated-Cone Mountain & Crater
  const rimPerturb =
    Math.sin(ang * 7.0 + 0.4) * 1.4 +
    (valueNoise2D(x * 0.08 + 9.1, z * 0.08 - 4.3) - 0.5) * 2.8;
  const effectiveRimR = AMAZON_LILY_CRATER_RIM_RADIUS + rimPerturb * 0.45;
  const outerBaseR = 57.5 + rimPerturb * 0.7;

  if (r <= outerBaseR + 4.0) {
    if (r >= effectiveRimR) {
      // Steep outer mountain cone rising from jungle floor to rim at y = 42m
      const coneT = 1 - smoothstep(effectiveRimR, outerBaseR, r);
      const ridgeNoise =
        (valueNoise2D(ang * 3.5 + 2.0, r * 0.09) - 0.5) * 3.0 * (1 - coneT * 0.4);
      const coneH =
        baseHeight +
        (AMAZON_LILY_CRATER_RIM_Y - baseHeight) * Math.pow(coneT, 0.82) +
        ridgeNoise * smoothstep(outerBaseR, effectiveRimR + 4.0, r);
      h = Math.max(h, coneH);

      // Slightly flatten south outer face where the giant "九蛇" kanji is carved
      if (z > 20 && Math.abs(x) < 19 && r > effectiveRimR + 3 && r < outerBaseR - 2) {
        const flatT =
          (1 - smoothstep(8, 19, Math.abs(x))) *
          smoothstep(effectiveRimR + 2, effectiveRimR + 8, r);
        h = h * (1 - flatT * 0.22) + (coneH - ridgeNoise * 0.7) * (flatT * 0.22);
      }
    } else {
      // Inside Crater: amphitheater stepped cliffs descending down to valley floor y = 3.4m
      const innerT = smoothstep(18.5, effectiveRimR, r);
      // Terraced cliff steps for Kuja amphitheater architecture
      const rawInner =
        AMAZON_LILY_CRATER_FLOOR_Y +
        (AMAZON_LILY_CRATER_RIM_Y - AMAZON_LILY_CRATER_FLOOR_Y) *
          Math.pow(innerT, 1.48);
      const stepTier = Math.round(rawInner / 5.2) * 5.2;
      const steppedInner =
        rawInner * 0.74 +
        stepTier * 0.26 +
        (valueNoise2D(x * 0.18, z * 0.18) - 0.5) * 0.85 * innerT;

      h = steppedInner;

      // Kuja Palace Elevated Royal Terrace (NW high crater wall)
      const dxP = (x - AMAZON_LILY_PALACE_CENTER.x) / 10.5;
      const dzP = (z - AMAZON_LILY_PALACE_CENTER.z) / 8.5;
      const palaceDist = Math.hypot(dxP, dzP);
      if (palaceDist < 1.35) {
        const pT = 1 - smoothstep(0.68, 1.35, palaceDist);
        h = h * (1 - pT * 0.92) + AMAZON_LILY_PALACE_CENTER.y * (pT * 0.92);
      }

      // Gorgon Sisters Observation Pavilion Terrace (just north of Arena)
      const dxG = (x - AMAZON_LILY_GORGON_TOWER.x) / 8.0;
      const dzG = (z - AMAZON_LILY_GORGON_TOWER.z) / 5.2;
      const gDist = Math.hypot(dxG, dzG);
      if (gDist < 1.35) {
        const gT = 1 - smoothstep(0.65, 1.35, gDist);
        h = h * (1 - gT * 0.94) + AMAZON_LILY_GORGON_TOWER.y * (gT * 0.94);
      }

      // Central Combat Arena & Spike Moat
      const arenaR = Math.hypot(
        x - AMAZON_LILY_ARENA_CENTER.x,
        z - AMAZON_LILY_ARENA_CENTER.z
      );
      if (arenaR < AMAZON_LILY_ARENA_CENTER.standOuterRadius + 2.5) {
        if (arenaR < AMAZON_LILY_ARENA_CENTER.innerRadius) {
          h = AMAZON_LILY_ARENA_CENTER.floorY;
        } else if (arenaR < AMAZON_LILY_ARENA_CENTER.pitOuterRadius) {
          const pitBlend =
            smoothstep(
              AMAZON_LILY_ARENA_CENTER.innerRadius,
              AMAZON_LILY_ARENA_CENTER.innerRadius + 0.65,
              arenaR
            ) *
            (1 -
              smoothstep(
                AMAZON_LILY_ARENA_CENTER.pitOuterRadius - 0.65,
                AMAZON_LILY_ARENA_CENTER.pitOuterRadius,
                arenaR
              ));
          h =
            AMAZON_LILY_ARENA_CENTER.floorY * (1 - pitBlend) +
            AMAZON_LILY_ARENA_CENTER.pitY * pitBlend;
        } else if (arenaR < AMAZON_LILY_ARENA_CENTER.standOuterRadius) {
          const standT = smoothstep(
            AMAZON_LILY_ARENA_CENTER.pitOuterRadius,
            AMAZON_LILY_ARENA_CENTER.standOuterRadius,
            arenaR
          );
          h = AMAZON_LILY_ARENA_CENTER.floorY + standT * 2.6;
        } else {
          const outerT =
            1 -
            smoothstep(
              AMAZON_LILY_ARENA_CENTER.standOuterRadius,
              AMAZON_LILY_ARENA_CENTER.standOuterRadius + 2.5,
              arenaR
            );
          h = h * (1 - outerT) + (AMAZON_LILY_ARENA_CENTER.floorY + 1.8) * outerT;
        }
      }

      // Sinueux river bed carving inside crater bottom
      const rivSd = amazonLilyRiverSignedDist(x, z);
      if (rivSd < 2.2) {
        const rivMask = 1 - smoothstep(-0.3, 2.2, rivSd);
        h = h * (1 - rivMask) + -0.95 * rivMask;
      }
    }
  }

  // Carve Underground Port Basin & Sea Cave Channel cleanly to sea level (-2.4m bed)
  if (portSd < 6.4) {
    const channelT = 1 - smoothstep(-0.6, 6.4, portSd);
    const channelTarget = -2.4;
    h = h * (1 - channelT) + channelTarget * channelT;
  }

  // Port stone quay overlooking the inner basin & Perfume Yuda (x = 8..18, z = 12..19)
  const quayDist = Math.hypot((x - 13.0) / 5.2, (z - 15.5) / 3.8);
  if (quayDist < 1.35 && portSd > 0.2) {
    const qT = 1 - smoothstep(0.6, 1.35, quayDist);
    h = h * (1 - qT * 0.92) + 3.0 * (qT * 0.92);
  }

  // Smooth walkable footpath grading
  const pathSd = amazonLilyPathSignedDist(x, z);
  if (pathSd < 1.2 && landMask > 0.5 && portSd > 1.2) {
    const pT = 1 - smoothstep(-0.3, 1.2, pathSd);
    const clampedTrail = clamp(h, 3.3, 23.0);
    h = h * (1 - pT * 0.45) + clampedTrail * (pT * 0.45);
  }

  return h;
}

/**
 * Walkable height including crater bridges over river/moat and stone arena stands.
 */
export function sampleAmazonLilyWalkSurfaceHeight(x: number, z: number): number {
  let h = sampleAmazonLilyHeight(x, z);

  // Two stone/timber bridges crossing the crater river & arena moat walkway
  const dBridgeSouth = distToSegment2D(x, z, -3.5, 24.5, -1.5, 17.5);
  if (dBridgeSouth < 1.45) {
    h = Math.max(h, 3.7);
  }
  const dBridgeEast = distToSegment2D(x, z, 9.5, 18.0, 13.5, 11.5);
  if (dBridgeEast < 1.45) {
    h = Math.max(h, 3.6);
  }
  // Arena N/S entry bridges spanning over the spike moat
  if (Math.abs(x - AMAZON_LILY_ARENA_CENTER.x) < 1.5 && Math.abs(z - 8.5) < 2.2) {
    h = Math.max(h, AMAZON_LILY_ARENA_CENTER.floorY + 0.1);
  }
  if (Math.abs(x - AMAZON_LILY_ARENA_CENTER.x) < 1.5 && Math.abs(z + 4.5) < 2.2) {
    h = Math.max(h, AMAZON_LILY_ARENA_CENTER.floorY + 0.1);
  }

  return Math.max(0, h);
}

export function toAmazonLilySphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * AMAZON_LILY_GLOBE_SCALE;
  const sz = z * AMAZON_LILY_GLOBE_SCALE;
  const rTarget = globeRadius + y * AMAZON_LILY_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * Génère les maisons du village Kuja au fond du cratère et les galeries sur pilotis
 * accrochées en amphithéâtre sur les parois intérieures (image_94a12ca6.png & image_a9ec93d6.png).
 */
export function buildAmazonLilyHouses(): AmazonLilyHouseSpec[] {
  const houses: AmazonLilyHouseSpec[] = [];
  const wallColors = [0xf5ede0, 0xefe3ce, 0xf8f1e6, 0xe8d7be];
  const roofColors = [0xb9372a, 0xc74332, 0xa32d22, 0x62738a];
  let idx = 0;

  // 1. Amphitheater cliff-mounted houses on stilts lining interior crater walls (y = 9..28m)
  const stiltAngles = [
    -2.55, -2.2, -1.85, -1.5, -1.05, -0.7, -0.35, 0.72, 1.05, 1.4, 1.75, 2.1, 2.45,
    2.8,
  ];
  for (let i = 0; i < stiltAngles.length; i++) {
    const ang = stiltAngles[i];
    for (const tier of [0, 1]) {
      const r = tier === 0 ? 25.0 : 30.8;
      const hx = Math.cos(ang) * r;
      const hz = Math.sin(ang) * r;
      // Leave Kuja Palace terrace clear on NW and underground port clear on ESE
      if (Math.hypot(hx - AMAZON_LILY_PALACE_CENTER.x, hz - AMAZON_LILY_PALACE_CENTER.z) < 11.5) {
        continue;
      }
      if (amazonLilyPortWaterSignedDist(hx, hz) < 3.6) continue;
      if (Math.hypot(hx - AMAZON_LILY_GORGON_TOWER.x, hz - AMAZON_LILY_GORGON_TOWER.z) < 9.5) {
        continue;
      }

      const groundH = sampleAmazonLilyHeight(hx, hz);
      if (groundH < 6.5 || groundH > 34.0) continue;

      houses.push({
        id: `kuja-cliff-house-${idx++}`,
        x: Number(hx.toFixed(2)),
        z: Number(hz.toFixed(2)),
        y: Number(groundH.toFixed(2)),
        width: 3.8 + (i % 3) * 0.7,
        depth: 2.9 + (tier % 2) * 0.4,
        height: 2.7 + (i % 2) * 0.65,
        yaw: Number((-ang - Math.PI * 0.5).toFixed(2)),
        stiltHeight: 3.4 + tier * 1.1,
        wallColor: wallColors[idx % wallColors.length],
        roofColor: roofColors[idx % roofColors.length],
        isCliffStilt: true,
      });
    }
  }

  // 2. Crater valley floor dwellings & market quarter around the arena & river
  const floorCoords: [number, number, number][] = [
    [-16.5, 4.5, 0.3],
    [-16.5, 10.5, 0.1],
    [-13.5, 15.0, -0.3],
    [-10.5, 10.0, 0.5],
    [10.2, -5.5, -0.4],
    [13.5, -1.5, -0.8],
    [10.8, 7.5, -1.1],
    [5.5, 12.2, 0.4],
    [10.0, -11.8, -0.3],
    [-12.2, -1.5, 0.7],
    [4.2, -16.2, 0.0],
    [12.5, -16.5, -0.6],
    [-2.5, 16.2, 0.1],
    [-19.5, -4.0, 0.9],
  ];
  for (let i = 0; i < floorCoords.length; i++) {
    const [hx, hz, yaw] = floorCoords[i];
    if (amazonLilyRiverSignedDist(hx, hz) < 2.2) continue;
    if (amazonLilyPortWaterSignedDist(hx, hz) < 3.0) continue;
    if (
      Math.hypot(hx - AMAZON_LILY_ARENA_CENTER.x, hz - AMAZON_LILY_ARENA_CENTER.z) <
      AMAZON_LILY_ARENA_CENTER.standOuterRadius + 1.4
    ) {
      continue;
    }
    const groundH = sampleAmazonLilyHeight(hx, hz);
    if (groundH < 2.2) continue;

    houses.push({
      id: `kuja-village-house-${idx++}`,
      x: hx,
      z: hz,
      y: Number(groundH.toFixed(2)),
      width: 3.2 + (i % 3) * 0.45,
      depth: 2.7 + (i % 2) * 0.4,
      height: 2.4 + (i % 3) * 0.45,
      yaw,
      stiltHeight: 0,
      wallColor: wallColors[idx % wallColors.length],
      roofColor: roofColors[idx % roofColors.length],
      isCliffStilt: false,
    });
  }

  return houses;
}

/**
 * Arbres tropicaux de la jungle dense extérieure + pins de falaise dans le cratère.
 */
export function buildAmazonLilyTrees(): AmazonLilyTreeSpec[] {
  const trees: AmazonLilyTreeSpec[] = [];
  let idx = 0;

  // Dense outer jungle ring (r = 55..88m)
  const count = 190;
  for (let i = 0; i < count; i++) {
    const h1 = valueNoise2D(i * 1.73 + 2.1, i * 0.91 - 4.7);
    const h2 = valueNoise2D(i * 0.67 - 3.3, i * 2.13 + 1.9);
    const ang = i * 2.39996 + h1 * 0.45;
    const rad = 55.5 + Math.sqrt((i + 0.5) / count) * 32.0;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;

    if (amazonLilyCoastSignedDist(x, z) > -3.5) continue;
    if (amazonLilyPortWaterSignedDist(x, z) < 5.5) continue;
    if (amazonLilyPathSignedDist(x, z) < 2.6) continue;
    // Keep front view clear near coastal base right below "九蛇"
    if (z > 42 && z < 66 && Math.abs(x) < 16) continue;

    const y = sampleAmazonLilyHeight(x, z);
    if (y < 4.5 || y > 22.0) continue;

    trees.push({
      id: `al-jungle-tree-${idx++}`,
      kind: i % 4 === 0 ? 'palm' : 'jungle-canopy',
      x: Number(x.toFixed(2)),
      z: Number(z.toFixed(2)),
      y: Number((y - 0.15).toFixed(2)),
      scale: Number((0.88 + h1 * 0.58).toFixed(2)),
      yaw: Number((h2 * Math.PI * 2).toFixed(2)),
      tint: Number((0.82 + h2 * 0.32).toFixed(2)),
    });
  }

  // Twisted cliff pines clinging to inner crater cliffs and mountain rim
  const pineCount = 46;
  for (let i = 0; i < pineCount; i++) {
    const ang = (i / pineCount) * Math.PI * 2 + 0.14;
    const rad = i % 2 === 0 ? 33.5 : 39.5;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    if (amazonLilyPortWaterSignedDist(x, z) < 5.0) continue;
    if (Math.hypot(x - AMAZON_LILY_PALACE_CENTER.x, z - AMAZON_LILY_PALACE_CENTER.z) < 9.5) {
      continue;
    }
    const y = sampleAmazonLilyHeight(x, z);
    if (y < 14.0) continue;
    trees.push({
      id: `al-pine-${idx++}`,
      kind: 'cliff-pine',
      x: Number(x.toFixed(2)),
      z: Number(z.toFixed(2)),
      y: Number((y - 0.1).toFixed(2)),
      scale: Number((0.82 + ((i * 37) % 10) * 0.04).toFixed(2)),
      yaw: Number((ang + Math.PI * 0.5).toFixed(2)),
      tint: 0.96,
    });
  }

  return trees;
}

/**
 * Champignons exotiques & champignons parasites colorés dans la jungle sauvage.
 */
export function buildAmazonLilyMushrooms(): AmazonLilyMushroomSpec[] {
  const mushrooms: AmazonLilyMushroomSpec[] = [];
  const colors = [0xd63646, 0x7a42d4, 0x2d9bd6, 0xe88b2e];
  const spots: [number, number][] = [
    [-46.0, 51.0],
    [-51.5, 53.5],
    [-35.0, 56.5],
    [-58.0, 48.0],
    [-62.0, 38.0],
    [-53.0, -48.0],
    [48.0, -56.0],
    [66.0, -28.0],
    [-22.0, 66.0],
    [-30.0, 64.0],
    [22.0, 62.0],
    [-68.0, 12.0],
    [60.0, 48.0],
    [-44.0, -60.0],
  ];

  spots.forEach(([x, z], i) => {
    const y = sampleAmazonLilyHeight(x, z);
    if (y < 3.5) return;
    mushrooms.push({
      id: `al-mushroom-${i}`,
      kind: i % 3 === 0 ? 'parasite-glow' : i % 2 === 0 ? 'giant-spotted' : 'cluster',
      x,
      z,
      y: Number((y - 0.05).toFixed(2)),
      scale: Number((0.9 + (i % 4) * 0.22).toFixed(2)),
      yaw: Number(((i * 1.1) % (Math.PI * 2)).toFixed(2)),
      capColor: colors[i % colors.length],
    });
  });
  return mushrooms;
}

/**
 * Faune massive de la jungle d'Amazon Lily (sangliers géants, panthères, serpents).
 */
export function buildAmazonLilyFauna(): AmazonLilyFaunaSpec[] {
  const placements: Array<{
    kind: AmazonLilyFaunaSpec['kind'];
    x: number;
    z: number;
    scale: number;
    yaw: number;
  }> = [
    { kind: 'giant-boar', x: -37.5, z: 48.5, scale: 1.15, yaw: 0.7 },
    { kind: 'giant-boar', x: 26.0, z: -60.0, scale: 1.2, yaw: -1.1 },
    { kind: 'panther', x: -53.5, z: 45.5, scale: 1.05, yaw: 1.85 },
    { kind: 'panther', x: 58.0, z: -26.0, scale: 1.1, yaw: -2.2 },
    { kind: 'giant-snake', x: -32.0, z: 58.5, scale: 1.1, yaw: 0.25 },
    { kind: 'giant-snake', x: -64.0, z: -18.0, scale: 1.15, yaw: 1.3 },
  ];

  return placements.map((p, i) => ({
    id: `al-fauna-${i}`,
    kind: p.kind,
    x: p.x,
    z: p.z,
    y: Number(sampleAmazonLilyHeight(p.x, p.z).toFixed(2)),
    scale: p.scale,
    yaw: p.yaw,
  }));
}

function camAtGround(
  lx: number,
  lz: number,
  eyeHeight = 1.75
): [number, number, number] {
  const groundY = sampleAmazonLilyWalkSurfaceHeight(lx, lz);
  return [
    Number(lx.toFixed(2)),
    Number((groundY + eyeHeight).toFixed(2)),
    Number(lz.toFixed(2)),
  ];
}

export const AMAZON_LILY_CAMERA_PRESETS: readonly AmazonLilyCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble · Île Kuja",
    subtitle: 'Montagne 九蛇, couronne de serpents, jungle sauvage & falaises côtières',
    position: [4.0, 48.0, 172.0],
    target: [0.0, 22.0, 2.0],
    isStreetView: false,
  },
  {
    id: 'crater-arch',
    label: "Cratère · Vue par l'Arche",
    subtitle: 'Plongée à travers les têtes de serpents sur le Palais, la cité et le port',
    position: [22.0, 68.0, 38.0],
    target: [-8.0, 12.0, -6.0],
    isStreetView: false,
  },
  {
    id: 'combat-arena',
    label: 'Arène & Sœurs Gorgones',
    subtitle: 'Vue humaine (1,75 m) · Fosse à pieux, tour impériale & habitations sur pilotis',
    position: camAtGround(-2.0, 14.2, 1.75),
    target: [-2.0, 6.2, -5.5],
    isStreetView: true,
  },
  {
    id: 'kuja-palace',
    label: 'Palais Kuja · Hauteurs',
    subtitle: 'Vue humaine (1,75 m) · Esplanade impériale sur les parois du cratère',
    position: camAtGround(-3.5, -5.5, 1.75),
    target: [-16.5, 28.0, -21.0],
    isStreetView: true,
  },
  {
    id: 'underground-port',
    label: 'Port Souterrain · Yuda',
    subtitle: 'Vue humaine (1,75 m) · Quai fortifié, Perfume Yuda, serpents géants & grande porte',
    position: camAtGround(13.2, 14.8, 1.75),
    target: [35.5, 5.5, 15.8],
    isStreetView: true,
  },
  {
    id: 'jungle-fauna',
    label: 'Jungle Sauvage & Champignons',
    subtitle: 'Vue humaine (1,75 m) · Faune géante, champignons parasites & paroi 九蛇',
    position: camAtGround(-43.5, 60.5, 1.75),
    target: [-37.0, 10.2, 49.0],
    isStreetView: true,
  },
];
