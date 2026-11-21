import { valueNoise2D } from './globeMath';

export const PUNK_HAZARD_WORLD_SIZE = 280;
export const PUNK_HAZARD_GLOBE_SCALE = 0.0017;
export const PUNK_HAZARD_GLOBE_CENTER = { u: 0.058, v: 0.554 };
export const PUNK_HAZARD_ANGULAR_MASK_RADIUS = 0.035;
export const PUNK_HAZARD_SEA_LEVEL_Y = 0.0;

export type PunkHazardZone =
  | 'sea'
  | 'strait'
  | 'ice'
  | 'burning'
  | 'demarcation'
  | 'lab';

export interface PunkHazardVolcanoSpec {
  id: string;
  x: number;
  z: number;
  radius: number;
  height: number;
  craterRadius: number;
  smokeScale: number;
}

export interface PunkHazardIcePeakSpec {
  id: string;
  x: number;
  z: number;
  radius: number;
  height: number;
}

export interface PunkHazardRuinSpec {
  id: string;
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  yaw: number;
  tiltX: number;
  tiltZ: number;
}

export interface PunkHazardCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

export const PUNK_HAZARD_VOLCANOES: readonly PunkHazardVolcanoSpec[] = [
  {
    id: 'volcano-west',
    x: -46.0,
    z: 33.0,
    radius: 17.5,
    height: 24.5,
    craterRadius: 3.4,
    smokeScale: 1.0,
  },
  {
    id: 'volcano-center-west',
    x: -20.0,
    z: 38.0,
    radius: 18.5,
    height: 27.5,
    craterRadius: 3.8,
    smokeScale: 1.1,
  },
  {
    id: 'volcano-prime',
    x: 18.5,
    z: 43.0,
    radius: 21.5,
    height: 33.0,
    craterRadius: 4.5,
    smokeScale: 1.35,
  },
  {
    id: 'volcano-east',
    x: 46.0,
    z: 30.0,
    radius: 17.0,
    height: 25.0,
    craterRadius: 3.4,
    smokeScale: 1.05,
  },
  {
    id: 'volcano-south-west',
    x: -35.0,
    z: 53.0,
    radius: 13.5,
    height: 18.5,
    craterRadius: 2.5,
    smokeScale: 0.75,
  },
  {
    id: 'volcano-south-east',
    x: 38.0,
    z: 54.0,
    radius: 14.0,
    height: 20.0,
    craterRadius: 2.8,
    smokeScale: 0.8,
  },
];

export const PUNK_HAZARD_ICE_PEAKS: readonly PunkHazardIcePeakSpec[] = [
  { id: 'peak-nw-1', x: -56.0, z: -34.0, radius: 18.0, height: 29.0 },
  { id: 'peak-nw-2', x: -38.0, z: -56.0, radius: 20.0, height: 35.0 },
  { id: 'peak-n-main', x: -12.0, z: -62.0, radius: 24.0, height: 42.0 },
  { id: 'peak-ne-1', x: 14.0, z: -56.0, radius: 19.0, height: 34.0 },
  { id: 'peak-w-ridge', x: -52.0, z: -18.0, radius: 14.0, height: 22.0 },
  { id: 'peak-lab-flank-l', x: -34.0, z: -36.0, radius: 15.0, height: 27.0 },
  { id: 'peak-lab-flank-r', x: 11.0, z: -34.0, radius: 14.5, height: 26.0 },
  { id: 'peak-e-ridge', x: 26.0, z: -24.0, radius: 15.0, height: 24.0 },
  { id: 'peak-e-horn', x: 56.0, z: -22.0, radius: 14.0, height: 23.0 },
  { id: 'peak-bay-west', x: 18.0, z: -50.0, radius: 12.0, height: 23.0 },
  { id: 'peak-bay-east', x: 58.0, z: -32.0, radius: 13.5, height: 24.5 },
];

export const PUNK_HAZARD_RUINS: readonly PunkHazardRuinSpec[] = [
  { id: 'ruin-1', x: -32.0, z: 22.0, width: 5.2, height: 5.8, depth: 5.0, yaw: 0.28, tiltX: 0.08, tiltZ: -0.06 },
  { id: 'ruin-2', x: -16.0, z: 21.0, width: 5.8, height: 6.4, depth: 5.4, yaw: -0.22, tiltX: -0.05, tiltZ: 0.09 },
  { id: 'ruin-3', x: 16.0, z: 23.0, width: 5.0, height: 5.5, depth: 4.8, yaw: 0.44, tiltX: 0.06, tiltZ: 0.07 },
  { id: 'ruin-4', x: 30.0, z: 20.0, width: 6.0, height: 6.8, depth: 5.6, yaw: -0.35, tiltX: -0.08, tiltZ: -0.04 },
  { id: 'ruin-5', x: -58.0, z: 42.0, width: 4.8, height: 5.0, depth: 4.6, yaw: 0.61, tiltX: 0.09, tiltZ: 0.05 },
  { id: 'ruin-6', x: -34.0, z: 38.0, width: 5.4, height: 6.2, depth: 5.2, yaw: -0.14, tiltX: -0.07, tiltZ: 0.08 },
  { id: 'ruin-7', x: -8.0, z: 49.0, width: 5.6, height: 6.5, depth: 5.4, yaw: 0.19, tiltX: 0.06, tiltZ: -0.09 },
  { id: 'ruin-8', x: 6.0, z: 36.0, width: 4.8, height: 5.6, depth: 4.8, yaw: -0.48, tiltX: 0.07, tiltZ: 0.06 },
  { id: 'ruin-9', x: 24.0, z: 60.0, width: 5.2, height: 5.8, depth: 5.0, yaw: 0.32, tiltX: -0.06, tiltZ: 0.07 },
  { id: 'ruin-10', x: -21.0, z: 58.0, width: 5.5, height: 6.0, depth: 5.2, yaw: -0.27, tiltX: 0.08, tiltZ: 0.05 },
  { id: 'ruin-11', x: 56.0, z: 44.0, width: 4.9, height: 5.4, depth: 4.8, yaw: 0.52, tiltX: -0.07, tiltZ: -0.08 },
  { id: 'ruin-12', x: 0.0, z: 28.0, width: 4.6, height: 4.9, depth: 4.6, yaw: 0.12, tiltX: 0.05, tiltZ: 0.07 },
];

export const PUNK_HAZARD_LANDMARKS = {
  caesarLab: { x: -12.0, z: -36.5, yaw: 0.34 },
  caesarLabPlaza: { x: 8.5, z: -11.5 },
  g5BayShip: { x: 44.0, z: -56.0, yaw: -0.45 },
  g5IcePier: { x: 26.0, z: -42.5 },
  g5BayOverlook: { x: 34.5, z: -38.5 },
  punkHazardGate: { x: -6.0, z: 68.0, yaw: 0.0 },
  punkHazardGatePlaza: { x: -6.0, z: 82.6 },
  burningOverlook: { x: -2.0, z: 56.0 },
  demarcationOverlook: { x: 4.0, z: 22.0 },
  demarcationLakeCenter: { x: -2.0, z: 2.0 },
  sunnySpawnWest: { x: -102.0, z: 6.0 },
} as const;

export const PUNK_HAZARD_FENCE_ARC: readonly { x: number; z: number }[] = [
  { x: -60.0, z: 36.0 },
  { x: -53.0, z: 48.0 },
  { x: -43.0, z: 57.5 },
  { x: -30.0, z: 64.0 },
  { x: -16.0, z: 67.0 },
  // Gate centered at x = -6.0, z = 68.0 (gap from x = -11.5 to -0.5)
  { x: 4.5, z: 67.0 },
  { x: 19.0, z: 65.0 },
  { x: 33.0, z: 60.5 },
  { x: 46.0, z: 54.0 },
  { x: 56.0, z: 45.0 },
  { x: 62.0, z: 33.5 },
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Centerline Z of the winding central demarcation strait separating
 * the Ice Half (north, z < straitZ) from the Burning Half (south, z > straitZ).
 */
export function punkHazardStraitCenterZ(x: number): number {
  return 1.5 - 0.11 * x + 4.8 * Math.sin(x * 0.055 + 0.4);
}

/**
 * Half-width of the central demarcation strait / lake channel.
 * Widens into the iconic thermal lake near x = -2 and at the east/west ocean mouths.
 */
export function punkHazardStraitHalfWidth(x: number): number {
  const lakeBulge = 5.4 * Math.exp(-((x + 2.0) * (x + 2.0)) / (16.0 * 16.0));
  const mouthFlare = 6.0 * smoothstep(32.0, 68.0, Math.abs(x));
  return 6.4 + lakeBulge + mouthFlare;
}

/**
 * Evaluates signed distance to the island landmass (< 0 on dry land, > 0 in sea or central strait).
 */
export function punkHazardLandSignedDist(x: number, z: number): {
  sd: number;
  half: 'ice' | 'burning' | 'strait' | 'sea';
} {
  // Organic overall island silhouette radius (~78m east-west, ~82m north-south)
  const angle = Math.atan2(z, x);
  const coastRipple =
    5.5 * Math.sin(angle * 3.0 + 0.7) +
    3.6 * Math.cos(angle * 5.0 - 1.1) +
    (valueNoise2D(x * 0.055 + 1.8, z * 0.055 - 2.4) - 0.5) * 9.0;

  const rx = 77.0 + coastRipple;
  const rz = 81.0 + coastRipple * 0.85;
  const ellipseDist = (Math.hypot(x / rx, z / rz) - 1.0) * 74.0;

  // Carve the Northern Frozen Bay where the G-5 Marine warship is moored (x ~ 44, z ~ -56)
  const bayDx = (x - 44.0) / 15.5;
  const bayDz = (z + 58.0) / 15.5;
  const bayDist = (1.0 - Math.hypot(bayDx, bayDz)) * 16.0;

  // Keep a wide southern coastal gate beach dry out to z = 84 outside the fence
  const gateApronDist = Math.hypot((x + 6.0) / 16.5, (z - 76.5) / 9.5) * 10.0 - 10.0;

  const outerIslandSd = Math.min(Math.max(ellipseDist, bayDist), gateApronDist);

  // Carve the central demarcation strait across the island
  const straitCz = punkHazardStraitCenterZ(x);
  const straitHw = punkHazardStraitHalfWidth(x);
  const dzStrait = z - straitCz;
  const straitGap = straitHw - Math.abs(dzStrait);

  if (outerIslandSd > 0.0) {
    return { sd: outerIslandSd, half: 'sea' };
  }
  if (straitGap > 0.0) {
    return { sd: straitGap, half: 'strait' };
  }

  const sd = Math.max(outerIslandSd, straitGap);
  return {
    sd,
    half: dzStrait < 0 ? 'ice' : 'burning',
  };
}

/**
 * Evaluates glowing molten lava river intensity [0..1] inside the Burning Lands.
 */
export function samplePunkHazardLavaIntensity(x: number, z: number): number {
  const straitCz = punkHazardStraitCenterZ(x);
  if (z <= straitCz + 4.0) return 0;

  // Two sinuous lava channels flowing down from the primary volcanoes
  const river1Z = 37.0 + 7.0 * Math.sin(x * 0.075 - 0.6);
  const river2X = 14.0 + 8.0 * Math.cos(z * 0.08 + 0.5);
  const d1 = Math.abs(z - river1Z);
  const d2 = x > -2 && z > 14 && z < 66 ? Math.abs(x - river2X) : 999;

  const flow1 = 1 - smoothstep(1.2, 3.3, d1 + (valueNoise2D(x * 0.25, z * 0.25) - 0.5) * 1.1);
  const flow2 = 1 - smoothstep(1.1, 3.0, d2 + (valueNoise2D(x * 0.28 + 4, z * 0.28) - 0.5) * 1.1);

  const crater1 = 1 - smoothstep(1.8, 4.4, Math.hypot(x - 18.5, z - 43.0));
  const crater2 = 1 - smoothstep(1.5, 3.8, Math.hypot(x + 20.0, z - 38.0));

  const { sd, half } = punkHazardLandSignedDist(x, z);
  if (sd > -1.2 || half !== 'burning') return 0;

  return clamp(Math.max(flow1, flow2, crater1, crater2), 0, 1);
}

/**
 * Samples geological zone for texturing, prop placement, and audio/weather tint.
 */
export function samplePunkHazardZone(x: number, z: number): PunkHazardZone {
  const { sd, half } = punkHazardLandSignedDist(x, z);
  if (half === 'sea') return 'sea';
  if (half === 'strait') return 'strait';
  if (sd > 0) return 'sea';

  if (Math.hypot(x - PUNK_HAZARD_LANDMARKS.caesarLab.x, z - PUNK_HAZARD_LANDMARKS.caesarLab.z) < 16.5) {
    return 'lab';
  }

  const distToBank = Math.abs(z - punkHazardStraitCenterZ(x)) - punkHazardStraitHalfWidth(x);
  if (distToBank < 7.5) {
    return 'demarcation';
  }

  return half === 'ice' ? 'ice' : 'burning';
}

/**
 * Samples local terrain height in Punk Hazard meters (sea level = 0, negative = seabed).
 */
export function samplePunkHazardHeight(x: number, z: number): number {
  const { sd, half } = punkHazardLandSignedDist(x, z);

  // Open sea or central demarcation strait channel
  if (sd >= 0) {
    const depthFactor = smoothstep(0.0, 7.5, sd);
    return -0.25 - depthFactor * 2.4;
  }

  const inlandT = smoothstep(0.0, 11.0, -sd);
  const micro = (valueNoise2D(x * 0.085 + 2.3, z * 0.085 - 1.7) - 0.5) * 1.6;
  const fine = (valueNoise2D(x * 0.24 - 4.1, z * 0.24 + 3.2) - 0.5) * 0.65;

  let h = 1.6 + inlandT * 2.7 + micro + fine;

  if (half === 'ice') {
    // Jagged glacial mountains rising across the Ice Half
    for (const peak of PUNK_HAZARD_ICE_PEAKS) {
      const d = Math.hypot(x - peak.x, z - peak.z);
      if (d < peak.radius) {
        const t = 1 - d / peak.radius;
        // Angular ridge facets for dramatic anime-style jagged snow peaks
        const ridge = 0.82 + 0.18 * Math.sin(Math.atan2(z - peak.z, x - peak.x) * 5.0);
        h = Math.max(h, 3.2 + Math.pow(t, 1.35) * peak.height * ridge);
      }
    }

    // Flattened snowy courtyard in front of Caesar's Lab & the lab foundation apron
    const dLabPlaza = Math.hypot(
      x - PUNK_HAZARD_LANDMARKS.caesarLabPlaza.x,
      z - PUNK_HAZARD_LANDMARKS.caesarLabPlaza.z
    );
    const labPlazaFlatten = 1 - smoothstep(5.5, 13.5, dLabPlaza);
    h = h * (1 - labPlazaFlatten) + 4.8 * labPlazaFlatten;

    const dLabBase = Math.hypot(
      (x - PUNK_HAZARD_LANDMARKS.caesarLab.x) / 15.0,
      (z - PUNK_HAZARD_LANDMARKS.caesarLab.z) / 11.5
    );
    const labFoundation = 1 - smoothstep(0.75, 1.25, dLabBase);
    h = h * (1 - labFoundation) + 5.0 * labFoundation;

    // Flat ice pier terrace & Frozen Bay overlook next to the G-5 Marine Warship
    const dPier = Math.hypot(
      x - PUNK_HAZARD_LANDMARKS.g5IcePier.x,
      z - PUNK_HAZARD_LANDMARKS.g5IcePier.z
    );
    const pierFlatten = 1 - smoothstep(4.0, 9.5, dPier);
    h = h * (1 - pierFlatten) + 4.4 * pierFlatten;

    const dBayOverlook = Math.hypot(
      x - PUNK_HAZARD_LANDMARKS.g5BayOverlook.x,
      z - PUNK_HAZARD_LANDMARKS.g5BayOverlook.z
    );
    const bayOverlookFlatten = 1 - smoothstep(3.5, 8.5, dBayOverlook);
    h = h * (1 - bayOverlookFlatten) + 4.2 * bayOverlookFlatten;
  } else if (half === 'burning') {
    // Active volcanic cones with depressed glowing craters
    for (const v of PUNK_HAZARD_VOLCANOES) {
      const d = Math.hypot(x - v.x, z - v.z);
      if (d < v.radius) {
        const t = 1 - d / v.radius;
        let coneH = 3.5 + Math.pow(t, 1.25) * v.height;
        if (d < v.craterRadius) {
          const ct = 1 - d / v.craterRadius;
          coneH -= ct * 5.5;
        }
        h = Math.max(h, coneH);
      }
    }

    // Carve glowing molten lava channels gently below neighboring basalt shelves
    const lava = samplePunkHazardLavaIntensity(x, z);
    if (lava > 0.15) {
      h -= lava * 1.15;
    }

    // Southern coastal apron & Gate Plaza (PUNK HAZARD security gate sits cleanly at y = 2.6m)
    const dGateApron = Math.hypot(
      (x - PUNK_HAZARD_LANDMARKS.punkHazardGate.x) / 17.5,
      (z - 74.5) / 10.5
    );
    const gateFlatten = 1 - smoothstep(0.55, 1.15, dGateApron);
    h = h * (1 - gateFlatten) + 2.6 * gateFlatten;

    // Burning Lands street overlook plaza
    const dBurnPlaza = Math.hypot(
      x - PUNK_HAZARD_LANDMARKS.burningOverlook.x,
      z - PUNK_HAZARD_LANDMARKS.burningOverlook.z
    );
    const burnFlatten = 1 - smoothstep(4.5, 10.0, dBurnPlaza);
    h = h * (1 - burnFlatten) + 4.4 * burnFlatten;

    // Demarcation strait southern overlook bluff
    const dDemPlaza = Math.hypot(
      x - PUNK_HAZARD_LANDMARKS.demarcationOverlook.x,
      z - PUNK_HAZARD_LANDMARKS.demarcationOverlook.z
    );
    const demFlatten = 1 - smoothstep(4.2, 9.5, dDemPlaza);
    h = h * (1 - demFlatten) + 4.2 * demFlatten;
  }

  return h;
}

/**
 * Walkable ground elevation for street-level camera clamping & preset anchoring.
 */
export function samplePunkHazardWalkSurfaceHeight(x: number, z: number): number {
  const baseH = samplePunkHazardHeight(x, z);
  return Math.max(PUNK_HAZARD_SEA_LEVEL_Y, baseH);
}

/**
 * Projects Punk Hazard local meters onto the curved sphere tangent shell
 * around PUNK_HAZARD_GLOBE_CENTER (matching Sabaody / Thriller Bark / Wano math).
 */
export function toPunkHazardSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius: number
): { x: number; y: number; z: number } {
  const sx = x * PUNK_HAZARD_GLOBE_SCALE;
  const sz = z * PUNK_HAZARD_GLOBE_SCALE;
  const sy = y * PUNK_HAZARD_GLOBE_SCALE;
  const r2 = sx * sx + sz * sz;
  const sag = globeRadius - Math.sqrt(Math.max(0.01, globeRadius * globeRadius - r2));
  return {
    x: sx,
    y: sy - sag,
    z: sz,
  };
}

function camAtGround(
  lx: number,
  lz: number,
  eyeHeight = 1.75
): [number, number, number] {
  const groundY = samplePunkHazardWalkSurfaceHeight(lx, lz);
  return [
    Number(lx.toFixed(2)),
    Number((groundY + eyeHeight).toFixed(2)),
    Number(lz.toFixed(2)),
  ];
}

export const PUNK_HAZARD_CAMERA_PRESETS: readonly PunkHazardCameraPreset[] = [
  {
    id: 'overview',
    label: 'Vue Générale · Glace & Enfer',
    subtitle:
      'Dualité totale : Terres Brûlantes volcaniques & enceinte PUNK HAZARD au sud, complexe enneigé de Caesar & baie G-5 au nord',
    position: [-26.0, 96.0, 172.0],
    target: [0.0, 12.0, 2.0],
    isStreetView: false,
  },
  {
    id: 'punk-hazard-gate',
    label: 'Porte PUNK HAZARD',
    subtitle:
      'Vue humaine (1,75 m) · Portail à rayures rouges/noires, panneau biohazard, inscription PUNK HAZARD fondante & mer de flammes',
    position: camAtGround(
      PUNK_HAZARD_LANDMARKS.punkHazardGatePlaza.x,
      PUNK_HAZARD_LANDMARKS.punkHazardGatePlaza.z,
      1.75
    ),
    target: [-6.0, 5.2, 68.0],
    isStreetView: true,
  },
  {
    id: 'burning-lands',
    label: 'Volcans & Ruines Fondues',
    subtitle:
      'Vue humaine (1,75 m) · Coulées de lave, bâtiments industriels fondus & volcans fumeux des Terres Brûlantes',
    position: camAtGround(
      PUNK_HAZARD_LANDMARKS.burningOverlook.x,
      PUNK_HAZARD_LANDMARKS.burningOverlook.z,
      1.75
    ),
    target: [14.5, 16.5, 42.0],
    isStreetView: true,
  },
  {
    id: 'demarcation-strait',
    label: 'Détroit de Démarcation',
    subtitle:
      'Vue humaine (1,75 m) · Frontière thermique eau / glace / feu entre les deux moitiés dévastées de l’île',
    position: camAtGround(
      PUNK_HAZARD_LANDMARKS.demarcationOverlook.x,
      PUNK_HAZARD_LANDMARKS.demarcationOverlook.z,
      1.75
    ),
    target: [-6.0, 7.5, -24.0],
    isStreetView: true,
  },
  {
    id: 'caesar-lab',
    label: 'Laboratoire de Caesar',
    subtitle:
      'Vue humaine (1,75 m) · Complexe enfoui sous la neige, rayures jaune/noir, grue suspendue, cheminées & gaz Shinokuni',
    position: camAtGround(
      PUNK_HAZARD_LANDMARKS.caesarLabPlaza.x,
      PUNK_HAZARD_LANDMARKS.caesarLabPlaza.z,
      1.75
    ),
    target: [-12.0, 10.5, -35.5],
    isStreetView: true,
  },
  {
    id: 'frozen-bay',
    label: 'Baie Gelée & Navire G-5',
    subtitle:
      'Vue humaine (1,75 m) · Banquise nord, icebergs dérivants & cuirassé à trois mâts de la Marine G-5 au mouillage',
    position: camAtGround(
      PUNK_HAZARD_LANDMARKS.g5BayOverlook.x,
      PUNK_HAZARD_LANDMARKS.g5BayOverlook.z,
      1.75
    ),
    target: [43.5, 3.4, -55.5],
    isStreetView: true,
  },
];
