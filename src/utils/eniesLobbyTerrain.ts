import { valueNoise2D } from './globeMath';

export const ENIES_WORLD_SIZE = 240;
export const ENIES_GLOBE_SCALE = 0.0017;
export const ENIES_GLOBE_CENTER = { u: 0.868, v: 0.530 } as const;
export const ENIES_ANGULAR_MASK_RADIUS = 0.026;
export const ENIES_ABYSS_RADIUS = 68.0;
export const ENIES_ABYSS_FLOOR_Y = -28.0;
export const ENIES_MAIN_PLATEAU_Y = 14.0;
export const ENIES_FRONT_GATE_Y = 4.8;
export const ENIES_GRILLAGE_RADIUS = 84.0;

export function getEniesAbyssCosThreshold(globeRadius = 10): number {
  return Math.cos((ENIES_ABYSS_RADIUS * ENIES_GLOBE_SCALE) / globeRadius);
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

function boxSd(
  x: number,
  z: number,
  cx: number,
  cz: number,
  hx: number,
  hz: number
): number {
  const dx = Math.abs(x - cx) - hx;
  const dz = Math.abs(z - cz) - hz;
  return Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dz), 0);
}

export function toEniesSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * ENIES_GLOBE_SCALE;
  const sz = z * ENIES_GLOBE_SCALE;
  const rTarget = globeRadius + y * ENIES_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

export interface EniesTownHouseSpec {
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
}

export interface EniesCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

/**
 * Signed distance to Enies Lobby's elevated cliff islands & bridge structures
 * inside the circular waterfall abyss. Negative = solid island rock/grass plateau.
 */
export function eniesCliffSignedDist(x: number, z: number): number {
  const frontIslandSd = ellipseSd(x, z, 0, 58.0, 18.5, 9.5);
  const causewaySd = boxSd(x, z, 0, 39.0, 4.4, 15.0);
  const mainIslandSd = ellipseSd(x, z, 0, 2.5, 29.5, 25.5);
  const drawbridgeSd = boxSd(x, z, 0, -28.0, 3.6, 8.0);
  const towerIslandSd = ellipseSd(x, z, 0, -45.5, 13.5, 11.5);
  const bridgeHesitationSd = boxSd(x, z, 0, -75.0, 3.3, 21.0);
  const frontPierSd = boxSd(x, z, 0, 72.0, 8.2, 5.2);

  return Math.min(
    frontIslandSd,
    causewaySd,
    mainIslandSd,
    drawbridgeSd,
    towerIslandSd,
    bridgeHesitationSd,
    frontPierSd
  );
}

/**
 * Computes exact Enies Lobby terrain & chasm elevation (meters):
 * - Outer sea beyond r = 68m sits at y = 0 (seamlessly meeting globe ocean).
 * - Inside r < 68m waterfall brink, the ocean floor plunges into a -28m deep abyss.
 * - Floating cliff plateaus rise sheerly above the chasm:
 *   - Front Pier (y = 1.8) -> Front Gate Island (y = 4.8) -> Causeway ramp ->
 *     Main Island Town & Courthouse (y = 14.0) -> Drawbridge -> Tower of Law (y = 14.0) ->
 *     Bridge of Hesitation (y = 13.5).
 */
export function sampleEniesHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const frontIslandSd = ellipseSd(x, z, 0, 58.0, 18.5, 9.5);
  const causewaySd = boxSd(x, z, 0, 39.0, 4.4, 15.0);
  const mainIslandSd = ellipseSd(x, z, 0, 2.5, 29.5, 25.5);
  const drawbridgeSd = boxSd(x, z, 0, -28.0, 3.6, 8.0);
  const towerIslandSd = ellipseSd(x, z, 0, -45.5, 13.5, 11.5);
  const bridgeHesitationSd = boxSd(x, z, 0, -75.0, 3.3, 21.0);
  const frontPierSd = boxSd(x, z, 0, 72.0, 8.2, 5.2);

  // Target plateau height for any cliff landmass
  let plateauH = ENIES_MAIN_PLATEAU_Y;
  const rough = (valueNoise2D(x * 0.22 + 3.7, z * 0.22 + 1.9) - 0.5) * 0.45;

  const frontWeight = 1 - smoothstep(-1.0, 1.5, frontIslandSd);
  const pierWeight = 1 - smoothstep(-0.8, 1.2, frontPierSd);
  const causewayT = smoothstep(50.0, 26.0, z);
  const bridgeHWeight = 1 - smoothstep(-0.8, 1.2, bridgeHesitationSd);

  if (pierWeight > 0.5 && z > 66.5) {
    plateauH = 1.8;
  } else if (frontWeight > 0.5) {
    plateauH = ENIES_FRONT_GATE_Y + rough * 0.25;
  } else if (causewaySd < 1.2 && z > 24.0 && z < 54.0) {
    plateauH =
      ENIES_FRONT_GATE_Y + (ENIES_MAIN_PLATEAU_Y - ENIES_FRONT_GATE_Y) * causewayT;
  } else if (bridgeHWeight > 0.5 && z < -54.0) {
    plateauH = 13.5;
  } else if (mainIslandSd <= 1.2) {
    // Gentle amphitheater rise toward flanks/Courthouse while central plaza stays crisp flat
    const centerAvenueClear = smoothstep(4.5, 11.0, Math.abs(x));
    plateauH = ENIES_MAIN_PLATEAU_Y + centerAvenueClear * 0.9 + rough * 0.35;
  } else if (towerIslandSd <= 1.2 || drawbridgeSd <= 1.2) {
    plateauH = ENIES_MAIN_PLATEAU_Y + rough * 0.2;
  }

  const minCliffSd = Math.min(
    frontIslandSd,
    causewaySd,
    mainIslandSd,
    drawbridgeSd,
    towerIslandSd,
    bridgeHesitationSd,
    frontPierSd
  );

  // Outer ocean rim beyond waterfall chasm edge
  if (r >= ENIES_ABYSS_RADIUS) {
    // Sea-level shelf & slight rim swell outside chasm; Bridge of Hesitation passes cleanly overhead if z < -56
    if (bridgeHesitationSd < 0.8 && z < -56.0 && z > -96.0) {
      return 13.5;
    }
    const rimFall = smoothstep(ENIES_ABYSS_RADIUS, ENIES_ABYSS_RADIUS + 3.0, r);
    const outerSeaY = (1 - rimFall) * 0.35 + rimFall * -0.45;
    if (minCliffSd < 1.0) {
      const cliffWall = 1 - smoothstep(-0.8, 1.8, minCliffSd);
      return outerSeaY * (1 - cliffWall) + plateauH * cliffWall;
    }
    return outerSeaY;
  }

  // Inside waterfall abyss: steep craggy pedestal walls dropping cleanly to -28m, rising smoothly toward sea level right at the r=68m waterfall curtain rim
  const rimShelf = smoothstep(ENIES_ABYSS_RADIUS - 6.0, ENIES_ABYSS_RADIUS, r);
  const abyssLocalFloor = ENIES_ABYSS_FLOOR_Y * (1 - rimShelf);
  if (minCliffSd <= 0) {
    return plateauH;
  }
  const frontSlopeWidth = z > 42.0 ? 10.5 : 5.8;
  const cliffFalloff = smoothstep(0.0, frontSlopeWidth, minCliffSd);
  const frontMask = smoothstep(66.0, 40.0, z);
  const cragDetail =
    (1 - cliffFalloff) *
    (1 - rimShelf) *
    frontMask *
    (valueNoise2D(x * 0.32 + 9.2, z * 0.32 + 4.4) - 0.5) *
    1.1;
  return plateauH * (1 - cliffFalloff) + abyssLocalFloor * cliffFalloff + cragDetail;
}

export function sampleEniesWalkSurfaceHeight(x: number, z: number): number {
  const h = sampleEniesHeight(x, z);
  return Math.max(0, h);
}

export function eniesMainPlazaSignedDist(x: number, z: number): number {
  // Ceremonial central promenade from Front Pier (+72) -> Porte Principale (+58) -> Avenue -> Courthouse (-18) -> Tower (-45) -> Bridge (-92)
  const centralStrip = boxSd(x, z, 0, -10, 4.6, 84.0);
  const courtForecourt = ellipseSd(x, z, 0, -4, 6.2, 7.0);
  return Math.min(centralStrip, courtForecourt);
}

/**
 * Generates packed Mediterranean peach/terracotta town buildings flanking both sides
 * of Enies Lobby's Main Island central ceremonial avenue (matching image_ad1ab35a.png).
 */
export function buildEniesTownHouses(): EniesTownHouseSpec[] {
  const wallPalette = [0xf5d4be, 0xf2c8ae, 0xeec1a4, 0xf8dfcc, 0xebba9c];
  const roofPalette = [0xc96248, 0xb8523c, 0xd47652, 0xa84836];
  const houses: EniesTownHouseSpec[] = [];
  let idx = 0;

  for (const side of [-1, 1]) {
    const xCols = [9.8, 15.6, 21.4];
    const zRows = [17.0, 10.5, 4.0, -2.5, -9.0];
    for (let c = 0; c < xCols.length; c++) {
      for (let r = 0; r < zRows.length; r++) {
        const hx = side * xCols[c];
        const hz = zRows[r] + (c % 2 === 1 ? 1.4 : 0);
        // Keep safely inside the Main Island cliff edge and outside Courthouse footprint
        if (ellipseSd(hx, hz, 0, 2.5, 25.8, 22.0) > -1.2) continue;
        const n = valueNoise2D(hx * 0.27 + 1.3, hz * 0.27 + 5.1);
        houses.push({
          id: `enies-house-${idx++}`,
          x: hx,
          z: hz,
          y: sampleEniesHeight(hx, hz),
          width: 4.0 + n * 1.4,
          depth: 3.8 + ((r + c) % 2) * 0.8,
          height: 3.8 + ((idx + c) % 3) * 1.35 + n * 1.1,
          yaw: side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5,
          wallColor: wallPalette[idx % wallPalette.length],
          roofColor: roofPalette[idx % roofPalette.length],
        });
      }
    }
  }
  return houses;
}

export const ENIES_CAMERA_PRESETS: EniesCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle: 'Enies Lobby · Abysse, Grillage, Porte Principale, Palais & Tour Judiciaire',
    position: [44, 72, 118],
    target: [0, 8, -4],
    isStreetView: false,
  },
  {
    id: 'front-elevation',
    label: 'Île Sans-Nuit · Cascade',
    subtitle: 'Vue frontale depuis le débarcadère vers l’abîme et ENIES LOBBY',
    position: [0.0, 32.0, 108.0],
    target: [0.0, 20.0, -24.0],
    isStreetView: false,
  },
  {
    id: 'main-avenue',
    label: 'Avenue Centrale · Ville',
    subtitle: 'Vue humaine après la Porte Principale vers le Palais de la Justice',
    position: [0.0, 15.8, 17.5],
    target: [0.0, 18.0, -45.0],
    isStreetView: true,
  },
  {
    id: 'tower-of-law',
    label: 'Tour Judiciaire',
    subtitle: 'Vue humaine sous le fronton ENIES LOBBY au-dessus du gouffre',
    position: [0.0, 17.2, -19.2],
    target: [0.0, 24.0, -45.5],
    isStreetView: true,
  },
  {
    id: 'bridge-of-hesitation',
    label: "Pont de l'Hésitation",
    subtitle: 'Vue humaine sur le pont vers les Portes de la Justice',
    position: [0.0, 15.3, -64.0],
    target: [0.0, 17.0, -112.0],
    isStreetView: true,
  },
];
