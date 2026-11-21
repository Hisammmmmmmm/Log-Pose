import { equirectangularToSphere, valueNoise2D } from './globeMath';

export const WANO_WORLD_SIZE = 340;
export const WANO_GLOBE_SCALE = 0.0024;
export const WANO_GLOBE_CENTER = { u: 0.332, v: 0.498 } as const;
export const WANO_ANGULAR_MASK_RADIUS = 0.048;

/** Altitude (in local meters) of Wano's inner island plateaus atop the elevated inland sea. */
export const WANO_PLATEAU_Y = 26.2;
/** Outer jagged mountain crater rim base height (meters) enclosing the inland sea. */
export const WANO_RIM_Y = 29.8;
/** Elevated mountaintop inland sea water surface height (meters). */
export const WANO_CANAL_WATER_Y = 23.6;

export type WanoZone =
  | 'sea'
  | 'sea-cliff'
  | 'inland-sea'
  | 'river-canal'
  | 'flower-capital'
  | 'mount-fuji'
  | 'kuri'
  | 'kibi'
  | 'udon'
  | 'ringo'
  | 'hakumai'
  | 'onigashima';

export interface WanoCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

export interface WanoFactorySpireSpec {
  id: string;
  x: number;
  z: number;
  baseRadius: number;
  height: number;
  stacks: number;
}

export const WANO_ONIGASHIMA_CENTER = { x: 0.0, z: 33.5 } as const;
export const WANO_FUJI_CENTER = { x: 1.5, z: -26.5 } as const;
export const WANO_CASTLE_CENTER = { x: 1.5, z: -13.5 } as const;

export const WANO_LANDMARKS = {
  mainWaterfall: { x: 0.0, y: 12.0, z: 58.5 },
  flowerCapital: { x: 4.5, y: WANO_PLATEAU_Y + 0.5, z: -6.0 },
  orochiCastle: { x: 1.5, y: WANO_PLATEAU_Y + 18.0, z: -13.5 },
  mountFuji: { x: 1.5, y: 84.0, z: -26.5 },
  kuriVillage: { x: -54.0, y: WANO_PLATEAU_Y + 1.5, z: 1.5 },
  kuriBeach: { x: -62.5, y: WANO_PLATEAU_Y + 0.2, z: -10.0 },
  ringoGraveyard: { x: 42.0, y: WANO_PLATEAU_Y + 6.0, z: -21.0 },
  udonMine: { x: -23.5, y: WANO_PLATEAU_Y + 0.5, z: 2.0 },
  kibiHighlands: { x: -25.0, y: WANO_PLATEAU_Y + 3.0, z: -26.5 },
  hakumaiShrine: { x: 40.0, y: WANO_PLATEAU_Y + 4.0, z: 7.0 },
  onigashimaSkull: { x: 0.0, y: WANO_CANAL_WATER_Y + 14.0, z: 32.0 },
  sunnySpawnSea: { x: 56.0, z: 132.0 },
} as const;

export const WANO_SUB_LOCATIONS: Record<string, [number, number]> = {
  wano: [0.0, -4.0],
  'flower-capital': [1.5, -8.5],
  kuri: [-54.5, -9.0],
  kibi: [-25.0, -26.5],
  udon: [-23.5, 2.0],
  ringo: [42.0, -21.0],
  hakumai: [37.0, 7.0],
  onigashima: [0.0, 33.5],
};

export const WANO_UDON_SPIRES: readonly WanoFactorySpireSpec[] = [
  { id: 'spire-udon-w', x: -31.5, z: 1.5, baseRadius: 2.8, height: 11.5, stacks: 4 },
  { id: 'spire-udon-sw', x: -28.0, z: 7.5, baseRadius: 2.9, height: 12.5, stacks: 4 },
  { id: 'spire-udon-e', x: -15.5, z: 6.2, baseRadius: 2.5, height: 10.5, stacks: 3 },
  { id: 'spire-kibi-nw', x: -29.5, z: -29.0, baseRadius: 2.7, height: 11.0, stacks: 3 },
  { id: 'spire-kibi-ne', x: -19.5, z: -23.0, baseRadius: 2.6, height: 11.5, stacks: 4 },
];

export const WANO_CAMERA_PRESETS: readonly WanoCameraPreset[] = [
  {
    id: 'overview',
    label: 'Pays des Wa & Chutes',
    subtitle:
      'Falaises géantes, mer intérieure sur la montagne, 6 îles-provinces, Onigashima et Grande Cascade',
    position: [0, 79, 160],
    target: [0, 30, 0],
    isStreetView: false,
  },
  {
    id: 'flower-capital',
    label: 'Capitale des Fleurs',
    subtitle: 'Canal aux cerisiers sakura, ponts rouges, pagode et château doré d\'Orochi',
    position: [1.5, WANO_PLATEAU_Y + 10.5, 15.0],
    target: [1.5, WANO_PLATEAU_Y + 9.5, -13.5],
    isStreetView: true,
  },
  {
    id: 'mount-fuji',
    label: 'Mont Fuji de Wano',
    subtitle: 'Volcan sacré au sommet enneigé entouré de nuages d\'estampe au cœur du pays',
    position: [36.0, WANO_PLATEAU_Y + 32.0, 10.0],
    target: [1.5, WANO_PLATEAU_Y + 32.0, -26.5],
    isStreetView: false,
  },
  {
    id: 'kuri',
    label: 'Kuri : Villages & Plage',
    subtitle: 'Île verdoyante d\'Okobore, toits lestés de pierres, bambous et plage aux pins noueux',
    position: [-72.0, WANO_PLATEAU_Y + 10.5, 14.0],
    target: [-54.0, WANO_PLATEAU_Y + 2.5, -6.0],
    isStreetView: true,
  },
  {
    id: 'ringo',
    label: 'Ringo : Cimetière des Sabres',
    subtitle: 'Île du nord-est sous la neige parsemée de sabres dressés et du sanctuaire sacré',
    position: [58.0, WANO_PLATEAU_Y + 13.5, -5.0],
    target: [41.0, WANO_PLATEAU_Y + 7.0, -22.0],
    isStreetView: true,
  },
  {
    id: 'udon-kibi',
    label: 'Udon & Usines Fumantes',
    subtitle: 'Île aride d\'Udon, mine des prisonniers et cheminées d\'armement crachant leur fumée',
    position: [-14.0, WANO_PLATEAU_Y + 13.5, 22.0],
    target: [-23.5, WANO_PLATEAU_Y + 4.5, 1.5],
    isStreetView: true,
  },
  {
    id: 'hakumai',
    label: 'Hakumai & Sanctuaire',
    subtitle: 'Île d\'automne dorée, sanctuaire d\'Enma et port sur la mer intérieure',
    position: [56.0, WANO_PLATEAU_Y + 13.0, 24.0],
    target: [35.0, WANO_PLATEAU_Y + 3.5, 6.5],
    isStreetView: true,
  },
  {
    id: 'onigashima',
    label: 'Onigashima : Crâne Démon',
    subtitle: 'Forteresse de Kaido posée dans la baie au sommet de la Grande Cascade',
    position: [14.0, WANO_CANAL_WATER_Y + 17.0, 69.5],
    target: [0.0, WANO_CANAL_WATER_Y + 11.5, 33.5],
    isStreetView: true,
  },
] as const;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function sdEllipse(
  x: number,
  z: number,
  cx: number,
  cz: number,
  rx: number,
  rz: number,
  rot = 0
): number {
  const dx = x - cx;
  const dz = z - cz;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const lx = dx * c + dz * s;
  const lz = -dx * s + dz * c;
  return (Math.hypot(lx / rx, lz / rz) - 1.0) * Math.min(rx, rz);
}

function sdRoundedBox(
  x: number,
  z: number,
  cx: number,
  cz: number,
  hx: number,
  hz: number,
  radius: number
): number {
  const dx = Math.abs(x - cx) - (hx - radius);
  const dz = Math.abs(z - cz) - (hz - radius);
  return (
    Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) +
    Math.min(Math.max(dx, dz), 0) -
    radius
  );
}

function sdDiamond(
  x: number,
  z: number,
  cx: number,
  cz: number,
  rx: number,
  rz: number
): number {
  const ax = Math.abs(x - cx) / rx;
  const az = Math.abs(z - cz) / rz;
  const p = 1.32;
  const norm = Math.pow(Math.pow(ax, p) + Math.pow(az, p), 1 / p);
  return (norm - 1.0) * Math.min(rx, rz);
}

/**
 * Projects Wano local meters `(x, y, z)` onto the globe tangent frame.
 */
export function toWanoSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * WANO_GLOBE_SCALE;
  const sz = z * WANO_GLOBE_SCALE;
  const rTarget = globeRadius + y * WANO_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/** Normalized elliptical distance inside Wano's outer mountain cliff rim (`<= 1.0` inside cliffs). */
export function wanoPlateauNormRadius(x: number, z: number): number {
  const nx = x / 94.0;
  const nz = (z + 2.0) / 66.0;
  const n = valueNoise2D(x * 0.055 + 4.1, z * 0.055 - 2.3) - 0.5;
  // Subtle front flattening around the southern Great Waterfall face
  const southFlatten =
    z > 32.0
      ? Math.exp(-Math.pow(x / 20.0, 2)) * smoothstep(32.0, 62.0, z) * 0.07
      : 0.0;
  return Math.hypot(nx, nz) + n * 0.045 + southFlatten;
}

/** Signed distance in meters to each inner island atop the elevated inland sea (< 0 on land). */
export function wanoInnerIslandDist(x: number, z: number): {
  minDist: number;
  island: 'kuri' | 'kibi' | 'udon' | 'flower-capital' | 'ringo' | 'hakumai' | 'onigashima';
  oniDist: number;
  capitalDist: number;
} {
  const wobble = (valueNoise2D(x * 0.12 - 2.4, z * 0.12 + 5.7) - 0.5) * 1.6;
  const dKuri = sdEllipse(x, z, -54.5, -10.0, 12.2, 22.5, -0.2) + wobble * 0.85;
  const dKibi = sdRoundedBox(x, z, -25.0, -26.5, 9.2, 8.2, 2.4) + wobble * 0.65;
  const dUdon = sdRoundedBox(x, z, -23.5, 2.0, 11.4, 8.2, 2.4) + wobble * 0.65;
  const dCapital = sdDiamond(x, z, 1.5, -17.5, 14.5, 17.5) + wobble * 0.55;
  const dRingo = sdEllipse(x, z, 42.0, -21.0, 20.5, 11.5, 0.22) + wobble * 0.85;
  const dHakumai = sdEllipse(x, z, 37.0, 7.0, 24.0, 9.6, 0.08) + wobble * 0.85;
  const dOnigashima =
    sdEllipse(x, z, WANO_ONIGASHIMA_CENTER.x, WANO_ONIGASHIMA_CENTER.z, 13.2, 10.2, 0) +
    wobble * 0.7;

  let minDist = dKuri;
  let island: 'kuri' | 'kibi' | 'udon' | 'flower-capital' | 'ringo' | 'hakumai' | 'onigashima' =
    'kuri';
  if (dKibi < minDist) {
    minDist = dKibi;
    island = 'kibi';
  }
  if (dUdon < minDist) {
    minDist = dUdon;
    island = 'udon';
  }
  if (dCapital < minDist) {
    minDist = dCapital;
    island = 'flower-capital';
  }
  if (dRingo < minDist) {
    minDist = dRingo;
    island = 'ringo';
  }
  if (dHakumai < minDist) {
    minDist = dHakumai;
    island = 'hakumai';
  }
  if (dOnigashima < minDist) {
    minDist = dOnigashima;
    island = 'onigashima';
  }

  return { minDist, island, oniDist: dOnigashima, capitalDist: dCapital };
}

/** Normalized distance inside Onigashima island atop the southern inland bay (`<= 1.0` on land). */
export function onigashimaNormRadius(x: number, z: number): number {
  const dx = (x - WANO_ONIGASHIMA_CENTER.x) / 13.2;
  const dz = (z - WANO_ONIGASHIMA_CENTER.z) / 10.2;
  const n = valueNoise2D(x * 0.14 - 7.3, z * 0.14 + 1.9) - 0.5;
  return Math.hypot(dx, dz) + n * 0.1;
}

/** Signed distance in meters to Wano's sheer outer mountain cliffs (< 0 inside mountain). */
export function wanoCliffSignedDist(x: number, z: number): number {
  const wnr = wanoPlateauNormRadius(x, z);
  return (wnr - 1.06) * 70.0;
}

/** Signed distance to the narrow Sakura Canal flowing south through Flower Capital plaza. */
export function wanoRiverDistance(x: number, z: number): number {
  const inCapitalZ = z > -10.5 && z < 0.8;
  if (!inCapitalZ) return 99.0;
  return Math.abs(x - 1.5) - 1.55;
}

export function sampleWanoZone(x: number, z: number): WanoZone {
  const nr = wanoPlateauNormRadius(x, z);
  if (nr > 1.04) return 'sea';
  if (nr >= 0.85) return 'sea-cliff';

  const { minDist, island } = wanoInnerIslandDist(x, z);
  if (minDist > 0.0) {
    return 'inland-sea';
  }

  if (island === 'onigashima') return 'onigashima';
  if (island === 'flower-capital') {
    if (Math.hypot(x - WANO_FUJI_CENTER.x, z - WANO_FUJI_CENTER.z) < 11.2) {
      return 'mount-fuji';
    }
    if (wanoRiverDistance(x, z) < 0.0 && Math.hypot(x - 1.5, z + 13.5) > 5.0) {
      return 'river-canal';
    }
    return 'flower-capital';
  }
  return island;
}

/**
 * Samples local terrain elevation (in meters) across Wano's outer striated mountain rim,
 * elevated mountaintop inland sea basin, 6 floating province islands, Mount Fuji, and Onigashima.
 */
export function sampleWanoHeight(x: number, z: number): number {
  const nr = wanoPlateauNormRadius(x, z);
  if (nr > 1.11) return -0.35;

  const ang = Math.atan2(z + 2.0, x);
  // Outer vertical mountain cliff wall rising from ocean (nr=1.06) to jagged rim (nr=0.90..0.95)
  const outerDrop = 1.0 - smoothstep(0.95, 1.065, nr);
  const rimPeaks =
    (Math.abs(Math.sin(ang * 13.0 + 0.4)) * 3.8 +
      valueNoise2D(x * 0.08 + 1.3, z * 0.08 - 4.2) * 3.2) *
    smoothstep(0.84, 0.92, nr) *
    (1.0 - smoothstep(0.96, 1.03, nr));

  const cliffFluting =
    Math.sin(ang * 42.0) *
    smoothstep(0.93, 1.02, nr) *
    (1.0 - smoothstep(1.04, 1.11, nr)) *
    1.5;

  // Inner transition from jagged outer mountain rim (nr=0.875) down into elevated inland sea basin (nr=0.825)
  const innerRimRamp = smoothstep(0.825, 0.885, nr);
  const inlandBedY = 19.8;

  // Great Curtain Waterfall spillway at South front (|x| < 12.5, z > 36) draining the inland sea out over the lip
  const wfMaskX = Math.exp(-Math.pow(x / 11.5, 4));
  const wfMaskZ = z > 34.0 ? smoothstep(34.0, 50.0, z) : 0.0;
  const waterfallCleft = wfMaskX * wfMaskZ;

  // Base mountain shell elevation (outer sea cliffs + crater rim + sunken elevated sea basin)
  const baseShellRim = WANO_RIM_Y + rimPeaks;
  const mountainWithBasin =
    inlandBedY + (baseShellRim - inlandBedY) * innerRimRamp;
  // Carve down the waterfall spillway lip cleanly to WANO_CANAL_WATER_Y - 0.5 at the rim
  const rimCut =
    mountainWithBasin * (1.0 - waterfallCleft * 0.92) +
    (WANO_CANAL_WATER_Y - 0.6) * (waterfallCleft * 0.92);

  let h = -0.35 + (rimCut + 0.35) * outerDrop + cliffFluting;

  // Inside the elevated mountaintop basin (nr < 0.855): sculpt the 7 floating islands rising out of the inland sea!
  if (nr < 0.86) {
    const { minDist, island } = wanoInnerIslandDist(x, z);
    // Smooth coastal shelf rising from sea bed (19.8m) past water surface (23.6m) onto island top (26.2m)
    const landFactor = 1.0 - smoothstep(-1.8, 2.2, minDist);
    const basinClip = 1.0 - smoothstep(0.81, 0.855, nr);
    const activeLand = landFactor * basinClip;

    if (activeLand > 0.002) {
      const micro =
        (valueNoise2D(x * 0.14 + 2.7, z * 0.14 - 6.1) - 0.5) * 1.4 +
        (valueNoise2D(x * 0.34 - 4.4, z * 0.34 + 3.2) - 0.5) * 0.5;

      let islandH = WANO_PLATEAU_Y + micro * 0.45;

      if (island === 'onigashima') {
        const dOni = Math.hypot(
          x - WANO_ONIGASHIMA_CENTER.x,
          (z - WANO_ONIGASHIMA_CENTER.z) * 1.25
        );
        const calderaRing =
          Math.exp(-Math.pow((dOni - 8.5) / 2.8, 2)) * (6.8 + micro * 1.8);
        const frontNotch =
          z > WANO_ONIGASHIMA_CENTER.z + 3.0
            ? Math.exp(-Math.pow(x / 3.8, 2)) * 4.5
            : 0.0;
        const skullMound =
          (1.0 - smoothstep(2.5, 7.5, Math.hypot(x, z - (WANO_ONIGASHIMA_CENTER.z - 1.5)))) * 3.2;
        islandH = WANO_CANAL_WATER_Y + 2.4 + calderaRing - frontNotch + skullMound;
      } else if (island === 'flower-capital') {
        const dFuji = Math.hypot(x - WANO_FUJI_CENTER.x, z - WANO_FUJI_CENTER.z);
        let fujiRise = 0.0;
        if (dFuji < 13.5) {
          const t = 1.0 - clamp((dFuji - 1.8) / 11.7, 0, 1);
          fujiRise = Math.pow(t, 1.55) * 58.0;
          if (dFuji < 2.2) {
            fujiRise -= (1.0 - dFuji / 2.2) * 2.8;
          }
        }
        const dCastle = Math.hypot(x - WANO_CASTLE_CENTER.x, z - WANO_CASTLE_CENTER.z);
        const castlePromontory = (1.0 - smoothstep(2.0, 4.3, dCastle)) * 9.5;
        const rDist = wanoRiverDistance(x, z);
        const canalCarve =
          dFuji > 10.0 && dCastle > 4.2 && rDist < 0.8
            ? (1.0 - smoothstep(-0.8, 0.8, rDist)) * 4.2
            : 0.0;
        islandH = WANO_PLATEAU_Y + micro * 0.15 + fujiRise + castlePromontory - canalCarve;
      } else if (island === 'ringo') {
        const alpine =
          Math.abs(valueNoise2D(x * 0.1 - 1.5, z * 0.1 + 7.2) - 0.5) * 10.5;
        const graveyardHill =
          (1.0 - smoothstep(3.0, 11.0, Math.hypot(x - 42.0, z + 21.0))) * 5.2;
        islandH += 1.4 + alpine + graveyardHill;
      } else if (island === 'kuri') {
        const dBeach = Math.hypot(x + 62.5, z + 10.0);
        const beachFlatten = smoothstep(3.5, 8.5, dBeach);
        const hillN = Math.max(0, valueNoise2D(x * 0.09 + 9.2, z * 0.09 - 1.8) - 0.35);
        islandH = WANO_PLATEAU_Y + (1.0 + hillN * 7.2) * beachFlatten;
      } else if (island === 'kibi') {
        islandH +=
          1.4 + Math.max(0, valueNoise2D(x * 0.11 + 3.1, z * 0.11 + 2.4) - 0.4) * 7.5;
      } else if (island === 'udon') {
        islandH = WANO_PLATEAU_Y + 0.3 + micro * 0.4;
      } else if (island === 'hakumai') {
        const shrineBluff =
          (1.0 - smoothstep(3.0, 9.5, Math.hypot(x - 40.0, z - 7.0))) * 4.2;
        islandH += 0.9 + shrineBluff;
      }

      h = h * (1.0 - activeLand) + Math.max(h, islandH) * activeLand;
    }
  }

  return Math.max(-0.35, h);
}

/**
 * Walkable height for street-view camera clamping & character exploration atop Wano & Onigashima.
 */
export function sampleWanoWalkSurfaceHeight(x: number, z: number): number {
  const raw = sampleWanoHeight(x, z);
  if (raw <= 0.1) return 0;
  if (wanoPlateauNormRadius(x, z) < 0.87) {
    return Math.max(WANO_CANAL_WATER_Y + 0.35, raw);
  }
  return raw;
}

/**
 * Angular clearance helper from neighboring charted New World islands.
 */
export function angularDistanceToWano(u: number, v: number): number {
  const a = equirectangularToSphere(u, v, 1);
  const b = equirectangularToSphere(
    WANO_GLOBE_CENTER.u,
    WANO_GLOBE_CENTER.v,
    1
  );
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  return Math.acos(dot);
}
