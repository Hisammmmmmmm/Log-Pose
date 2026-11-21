import { valueNoise2D } from './globeMath';

export const MARY_GEOISE_WORLD_SIZE = 340;
export const MARY_GEOISE_TERRAIN_WIDTH = 420;
export const MARY_GEOISE_TERRAIN_DEPTH = 330;
export const MARY_GEOISE_TERRAIN_CENTER_X = 45;
export const MARY_GEOISE_GLOBE_SCALE = 0.0022;
export const MARY_GEOISE_GLOBE_CENTER = { u: 0.014, v: 0.515 } as const;
/**
 * World-unit altitude of the Red Line summit plateau above sea level (GLOBE_RADIUS = 10).
 * Matches the planetary Red Line crest (~10,000 m above Fish-Man Island).
 */
export const MARY_GEOISE_ALTITUDE = 0.88;
export const MARY_GEOISE_ANGULAR_MASK_RADIUS = 0.036;

export const MARY_GEOISE_PLATEAU_Y = 0.0;
/**
 * Exact local Y corresponding to true planetary sea level (r = GLOBE_RADIUS = 10.0):
 * -MARY_GEOISE_ALTITUDE / MARY_GEOISE_GLOBE_SCALE = -400.0 local meters.
 */
export const MARY_GEOISE_RED_PORT_SEA_Y = -MARY_GEOISE_ALTITUDE / MARY_GEOISE_GLOBE_SCALE;
export const MARY_GEOISE_UNDERGROUND_FLOOR_Y = -14.0;

/**
 * Canonical district and landmark centers in local Marie Geoise meters
 * (North = -Z, South = +Z, East = +X, West = -X).
 */
export const MARY_GEOISE_LANDMARKS = {
  // Château de Pangée (North-Central Heart)
  pangaeaCastle: { x: 0.0, z: -44.0, y: 0.0 },
  pangaeaGate: { x: 0.0, z: -8.0, y: 0.0 },
  emptyThroneHall: { x: 0.0, z: -34.0, y: 1.2 },
  // Secret Room of Flowers (deep inside/behind Pangaea Castle rear sanctuary)
  roomOfFlowers: { x: 0.0, z: -80.0, y: 0.6 },
  // Grand Celestial Dragon Marble Boulevard & Twin Travolators
  grandPromenade: { x: 0.0, z: 48.0, y: 0.0 },
  // Domain of the Gods & Socializing Square (East Plaza)
  socializingSquare: { x: 56.0, z: 34.0, y: 0.0 },
  socializingPavilion: { x: 68.0, z: 24.0, y: 0.8 },
  // Subterranean Slave Quarters & Travolator Engine Vault (Beneath Grand Boulevard)
  slaveQuarters: { x: 0.0, z: 66.0, y: MARY_GEOISE_UNDERGROUND_FLOOR_Y },
  // Red Port Upper Gate / Elevator & Gondola Terminal (East Cliff Brink) + Sea-Level Harbor (East Ocean)
  redPortUpperGate: { x: 106.0, z: -4.0, y: 0.0 },
  redPortLowerDock: { x: 168.0, z: -4.0, y: MARY_GEOISE_RED_PORT_SEA_Y },
} as const;

export interface MaryGeoiseMansionSpec {
  id: string;
  x: number;
  z: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  yaw: number;
  roofKind: 'gable' | 'hip-dome' | 'mansard';
  wallTone: 'ivory' | 'cream' | 'pearl';
}

export interface MaryGeoiseTreeSpec {
  x: number;
  z: number;
  y: number;
  height: number;
  radius: number;
  kind: 'cypress' | 'topiary' | 'garden-oak';
}

export interface MaryGeoiseFlowerSpec {
  x: number;
  y: number;
  z: number;
  scale: number;
  colorHex: number;
}

export interface MaryGeoiseButterflySpec {
  x: number;
  y: number;
  z: number;
  phase: number;
  speed: number;
  orbitR: number;
  tintHex: number;
}

export interface MaryGeoiseCameraPreset {
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

export function toMaryGeoiseSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const baseR = globeRadius + MARY_GEOISE_ALTITUDE;
  const sx = x * MARY_GEOISE_GLOBE_SCALE;
  const sz = z * MARY_GEOISE_GLOBE_SCALE;
  const rTarget = baseR + y * MARY_GEOISE_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) - baseR;
  return { x: sx, y: sy, z: sz };
}

/**
 * Signed factor [0..1] for the sheer eastern Red Line cliff drop (x > 106)
 * descending all the way from 10,000 m down to true planetary sea level (-400 m) at Red Port Harbor.
 */
export function maryGeoiseRedPortCliffFactor(x: number, z: number): number {
  // East precipice starts cleanly outside the East Fortified Wall & Upper Terminal (x = 106)
  if (x <= 106) return 0;
  const zStretch = smoothstep(148, 78, Math.abs(z + 4));
  const cliffProgress = smoothstep(106, 146, x);
  return cliffProgress * zStretch;
}

/**
 * Continuous surface elevation in local Marie Geoise meters relative to the 10,000 m Red Line summit plateau (0 m).
 * - Summit city plateau: -1.15 m .. 0.0 m (ornamental moat & Sapphire Pool)
 * - Outer Red Line rim (North / South / West): tapers gently -12 m .. 0 m to meet the planetary Red Line ridge
 * - Eastern Red Port cliffside (x > 106): plunges sheer -400 m down to true planetary ocean floor (-416 m)
 */
export function sampleMaryGeoiseHeight(x: number, z: number): number {
  const cliffFrac = maryGeoiseRedPortCliffFactor(x, z);
  const strataNoise =
    (valueNoise2D(x * 0.09 + 1.4, z * 0.09 - 2.3) - 0.5) * 3.8 +
    (valueNoise2D(x * 0.24 - 4.1, z * 0.24 + 3.7) - 0.5) * 1.4;

  // Sheer Red Line cliff plunge down to true ocean floor beneath Red Port Harbor
  if (cliffFrac > 0.001) {
    const seaFloor = MARY_GEOISE_RED_PORT_SEA_Y - (x > 142 ? 16.0 : 4.0);
    const cliffRough = cliffFrac > 0.06 && cliffFrac < 0.94 ? strataNoise * 1.4 : 0;
    return seaFloor * cliffFrac + cliffRough * (1 - Math.abs(cliffFrac * 2 - 1));
  }

  // Ornamental moat canal flanking Pangaea Castle right/west (as seen in marie_geoise_5dd2bb4e.JPG)
  const inRightCanal =
    x > 26 && x < 34 && z > -70 && z < 8 && Math.abs(z + 31) < 38;
  if (inRightCanal && Math.abs(z + 4) > 5.8) {
    const wallBlend = Math.min(smoothstep(26, 27.6, x), smoothstep(34, 32.4, x));
    return -1.15 * wallBlend;
  }

  // Sapphire reflective pool in the Domain of the Gods / Socializing Square (image_d00e3501.png)
  const dxPool = (x - MARY_GEOISE_LANDMARKS.socializingSquare.x) / 18.5;
  const dzPool = (z - MARY_GEOISE_LANDMARKS.socializingSquare.z) / 12.0;
  const poolR = Math.hypot(dxPool, dzPool);
  if (poolR < 1.0 && x < 63.5) {
    return -0.55 * (1 - smoothstep(0.86, 1.0, poolR));
  }

  // Outer perimeter gentle Red Line taper outside city walls (West / North / South)
  const maxAbs = Math.max(Math.abs(x) / 106, Math.abs(z) / 114);
  if (maxAbs > 1.04) {
    const rimT = smoothstep(1.04, 1.52, maxAbs);
    const ridgeUndulation = (valueNoise2D(x * 0.05 + 2.1, z * 0.05 + 6.4) - 0.5) * 4.5;
    return (-12.0 + ridgeUndulation) * rimT;
  }

  return 0.0;
}

/**
 * Walkable surface elevation at street level (plateau 0 m, East Harbor docks -397 m).
 */
export function sampleMaryGeoiseWalkSurfaceHeight(x: number, z: number): number {
  const h = sampleMaryGeoiseHeight(x, z);
  // Red Port lower harbor quays & breakwater piers rest cleanly 3.0 m above planetary ocean level (-400 m)
  if (x >= 144 && x <= 198 && Math.abs(z + 4) <= 38) {
    return MARY_GEOISE_RED_PORT_SEA_Y + 3.0;
  }
  // Upper cliffside boarding terrace outside East Gate
  if (x >= 98 && x <= 116 && Math.abs(z + 4) <= 22) {
    return 0.0;
  }
  return Math.max(MARY_GEOISE_RED_PORT_SEA_Y, h);
}

/**
 * Camera floor collision height for OrbitControls:
 * allows diving smoothly underground into the Subterranean Slave Quarters (-14 m)
 * and descending the Eastern Red Port cliffside all the way to planetary sea level (-400 m).
 */
export function sampleMaryGeoiseCameraFloorHeight(
  x: number,
  z: number,
  camHeightM: number
): number {
  if (
    camHeightM < -2.0 &&
    Math.abs(x) <= 38 &&
    z >= 42 &&
    z <= 92
  ) {
    return MARY_GEOISE_UNDERGROUND_FLOOR_Y;
  }
  // Everywhere east of the Red Port cliff rim (cliff wall, lower sea harbor, eastern ocean)
  if (x >= 106 || (x >= 96 && Math.abs(z + 4) < 55 && camHeightM < -2.0)) {
    return sampleMaryGeoiseWalkSurfaceHeight(x, z);
  }
  return Math.max(0.0, sampleMaryGeoiseWalkSurfaceHeight(x, z));
}

/**
 * Generates Celestial Dragon private noble mansions & neoclassical townhouses inside the fortified walls,
 * keeping Pangaea Castle, Grand Marble Promenade, and Domain of the Gods clear.
 */
export function buildMaryGeoiseMansions(): MaryGeoiseMansionSpec[] {
  const mansions: MaryGeoiseMansionSpec[] = [];
  const wallTones: readonly ('ivory' | 'cream' | 'pearl')[] = ['ivory', 'cream', 'pearl'];
  const roofKinds: readonly ('gable' | 'hip-dome' | 'mansard')[] = [
    'mansard',
    'hip-dome',
    'gable',
  ];

  // Candidate urban blocks inside the white-and-gold city walls (West, SW, SE districts)
  const blockAnchors: readonly { x: number; z: number; yaw: number; scale: number }[] = [
    // West Celestial Dragon Luxury Quarter
    { x: -34, z: 16, yaw: Math.PI / 2, scale: 1.15 },
    { x: -56, z: 16, yaw: 0, scale: 1.25 },
    { x: -78, z: 16, yaw: Math.PI / 2, scale: 1.1 },
    { x: -34, z: 42, yaw: Math.PI / 2, scale: 1.2 },
    { x: -58, z: 42, yaw: Math.PI, scale: 1.3 },
    { x: -80, z: 42, yaw: Math.PI / 2, scale: 1.1 },
    { x: -34, z: 68, yaw: Math.PI / 2, scale: 1.15 },
    { x: -58, z: 68, yaw: 0, scale: 1.22 },
    { x: -80, z: 68, yaw: 0, scale: 1.05 },
    { x: -46, z: 88, yaw: 0, scale: 1.18 },
    { x: -72, z: 88, yaw: 0, scale: 1.12 },
    { x: -58, z: -12, yaw: 0, scale: 1.2 },
    { x: -78, z: -12, yaw: Math.PI / 2, scale: 1.1 },
    { x: -72, z: -42, yaw: Math.PI / 2, scale: 1.25 },
    { x: -72, z: -72, yaw: 0, scale: 1.15 },
    // East / South-East Noble Estates flanking Socializing Square
    { x: 34, z: 74, yaw: 0, scale: 1.18 },
    { x: 58, z: 76, yaw: 0, scale: 1.25 },
    { x: 80, z: 72, yaw: -Math.PI / 2, scale: 1.12 },
    { x: 34, z: 92, yaw: 0, scale: 1.1 },
    { x: 64, z: 92, yaw: 0, scale: 1.15 },
    { x: 74, z: -24, yaw: -Math.PI / 2, scale: 1.2 },
    { x: 74, z: -48, yaw: -Math.PI / 2, scale: 1.25 },
    { x: 72, z: -74, yaw: 0, scale: 1.15 },
    { x: 54, z: -78, yaw: 0, scale: 1.1 },
  ];

  for (let i = 0; i < blockAnchors.length; i++) {
    const a = blockAnchors[i];
    const n1 = valueNoise2D(i * 1.37 + 2.1, i * 0.71 - 1.3);
    const n2 = valueNoise2D(i * 0.63 + 5.2, i * 1.19 + 0.8);
    mansions.push({
      id: `celestial-mansion-${i}`,
      x: a.x,
      z: a.z,
      y: 0,
      width: Number(((9.5 + n1 * 3.8) * a.scale).toFixed(2)),
      depth: Number(((8.0 + n2 * 3.2) * a.scale).toFixed(2)),
      height: Number(((7.2 + n1 * 4.2) * a.scale).toFixed(2)),
      yaw: a.yaw,
      roofKind: roofKinds[i % roofKinds.length],
      wallTone: wallTones[i % wallTones.length],
    });
  }

  return mansions;
}

/**
 * Generates manicured cypress & ornamental garden trees lining avenues, moat banks, and parks.
 */
export function buildMaryGeoiseCypressTrees(): MaryGeoiseTreeSpec[] {
  const trees: MaryGeoiseTreeSpec[] = [];

  // Flanking Grand Promenade avenues (kept outside x = [-17, +17] marble boulevard)
  for (let z = 6; z <= 94; z += 11) {
    trees.push({ x: -18.5, z, y: 0, height: 6.8, radius: 1.5, kind: 'cypress' });
    trees.push({ x: 18.5, z, y: 0, height: 6.8, radius: 1.5, kind: 'cypress' });
  }

  // Parkland cypress & garden oaks around Socializing Square (image_d00e3501.png)
  const parkPoints: readonly [number, number, 'cypress' | 'topiary' | 'garden-oak'][] = [
    [35, 16, 'cypress'],
    [40, 14, 'cypress'],
    [33, 50, 'cypress'],
    [39, 53, 'cypress'],
    [76, 48, 'cypress'],
    [82, 42, 'cypress'],
    [76, 7, 'cypress'],
    [82, 11, 'cypress'],
    [26, -12, 'garden-oak'],
    [42, -26, 'garden-oak'],
    [42, -52, 'garden-oak'],
    [-38, -28, 'garden-oak'],
    [-38, -56, 'garden-oak'],
    [-46, 2, 'topiary'],
    [-46, 28, 'topiary'],
    [-46, 54, 'topiary'],
    [44, 58, 'topiary'],
  ];

  for (let i = 0; i < parkPoints.length; i++) {
    const [x, z, kind] = parkPoints[i];
    const n = valueNoise2D(i * 0.81 + 1.1, z * 0.13);
    trees.push({
      x,
      z,
      y: 0,
      height: kind === 'cypress' ? 7.2 + n * 2.8 : kind === 'garden-oak' ? 6.2 + n * 2.2 : 3.2 + n * 0.8,
      radius: kind === 'cypress' ? 1.35 + n * 0.35 : kind === 'garden-oak' ? 3.2 + n * 0.9 : 1.4,
      kind,
    });
  }

  return trees;
}

/**
 * Generates rare vibrant blossoms across the sunlit Room of Flowers sanctuary (z ~ -80).
 */
export function buildMaryGeoiseRoomFlowers(): MaryGeoiseFlowerSpec[] {
  const flowers: MaryGeoiseFlowerSpec[] = [];
  const palette = [0xf43f5e, 0xfbbf24, 0x38bdf8, 0xc084fc, 0xfb7185, 0xfef08a, 0x34d399];
  const centerZ = MARY_GEOISE_LANDMARKS.roomOfFlowers.z;

  for (let i = 0; i < 240; i++) {
    const n1 = valueNoise2D(i * 0.67 + 3.1, i * 0.41 - 2.4);
    const n2 = valueNoise2D(i * 0.53 - 1.8, i * 0.89 + 4.2);
    const ang = n1 * Math.PI * 2;
    const rad = 2.0 + n2 * 13.8;
    const x = Math.cos(ang) * rad;
    const z = centerZ + Math.sin(ang) * rad;
    // Leave clear central walking carpet along x = 0 toward Imu's dais
    if (Math.abs(x) < 1.9 && z > centerZ - 4.5) continue;
    // Place flower cleanly on top of either the central grass mound or outer sanctuary lawn
    const moundRadSq =
      (x / 10.2) * (x / 10.2) +
      ((z - (centerZ - 5.5)) / 8.5) * ((z - (centerZ - 5.5)) / 8.5);
    const moundY =
      moundRadSq < 1.0 ? -0.4 + 2.38 * Math.sqrt(Math.max(0, 1 - moundRadSq)) : 0.6;
    const baseY = Math.max(0.62, moundY);
    flowers.push({
      x: Number(x.toFixed(2)),
      y: Number(baseY.toFixed(2)),
      z: Number(z.toFixed(2)),
      scale: Number((0.58 + n1 * 0.56).toFixed(2)),
      colorHex: palette[i % palette.length],
    });
  }
  return flowers;
}

/**
 * Generates animated butterfly specs drifting inside the Room of Flowers.
 */
export function buildMaryGeoiseButterflies(): MaryGeoiseButterflySpec[] {
  const butterflies: MaryGeoiseButterflySpec[] = [];
  const tints = [0xfef08a, 0x93c5fd, 0xf9a8d4, 0xfde047, 0xe9d5ff];
  const centerZ = MARY_GEOISE_LANDMARKS.roomOfFlowers.z;

  for (let i = 0; i < 24; i++) {
    const n1 = valueNoise2D(i * 0.77 + 1.9, i * 0.31 + 6.1);
    const n2 = valueNoise2D(i * 0.43 - 3.2, i * 0.97 + 0.5);
    const ang = (i / 24) * Math.PI * 2;
    const r = 2.2 + n1 * 8.5;
    butterflies.push({
      x: Number((Math.cos(ang) * r).toFixed(2)),
      y: Number((2.2 + n2 * 3.8).toFixed(2)),
      z: Number((centerZ + Math.sin(ang) * r).toFixed(2)),
      phase: Number((n1 * Math.PI * 2).toFixed(2)),
      speed: Number((1.1 + n2 * 1.4).toFixed(2)),
      orbitR: Number((0.6 + n1 * 1.3).toFixed(2)),
      tintHex: tints[i % tints.length],
    });
  }
  return butterflies;
}

function camAtSurface(
  lx: number,
  lz: number,
  eyeHeight = 1.75
): [number, number, number] {
  const groundY = sampleMaryGeoiseWalkSurfaceHeight(lx, lz);
  return [
    Number(lx.toFixed(2)),
    Number((groundY + eyeHeight).toFixed(2)),
    Number(lz.toFixed(2)),
  ];
}

export const MARY_GEOISE_CAMERA_PRESETS: readonly MaryGeoiseCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble · Terre Sainte",
    subtitle:
      'Capitale du Gouvernement Mondial perchée à 10 000 m sur Red Line · Château de Pangée, Cité & Red Port à l’Est',
    position: [152.0, 86.0, 148.0],
    target: [26.0, -24.0, -8.0],
    isStreetView: false,
  },
  {
    id: 'pangaea-castle',
    label: 'Château de Pangée · Portail',
    subtitle:
      'Vue humaine (1,75 m) · Grand portail crénelé, tours Chambord vert-ardoise, réverbères & flèche centrale',
    position: camAtSurface(0.0, 20.5, 1.75),
    target: [0.0, 22.0, -40.0],
    isStreetView: true,
  },
  {
    id: 'celestial-city',
    label: 'Cité des Dragons Célestes',
    subtitle:
      'Vue humaine (1,75 m) · Avenues de marbre blanc, palais privés, trottoirs roulants & Nobles sous bulle',
    position: camAtSurface(-2.0, 84.0, 1.75),
    target: [-6.0, 6.5, 32.0],
    isStreetView: true,
  },
  {
    id: 'socializing-square',
    label: 'Place de la Socialisation · CP0',
    subtitle:
      'Vue humaine (1,75 m) · Bassin saphir, jets d’eau arqués, colonnades de marbre & rotonde de la Rêverie',
    position: camAtSurface(31.0, 36.2, 1.85),
    target: [67.0, 6.2, 24.5],
    isStreetView: true,
  },
  {
    id: 'empty-throne',
    label: 'Trône Vacant & 20 Armes',
    subtitle:
      'Intérieur Château de Pangée · Tapis pourpre, Trône Vacant entouré des 20 armes fondatrices & Salle de l’Autorité',
    position: [0.0, 4.2, -16.5],
    target: [0.0, 6.2, -41.0],
    isStreetView: true,
  },
  {
    id: 'room-of-flowers',
    label: 'Chambre des Fleurs · Imu',
    subtitle:
      'Sanctuaire secret · Puits de lumière naturelle, fleurs rares, papillons & silhouette d’Imu',
    position: [0.0, 3.3, -67.5],
    target: [0.0, 3.2, -87.0],
    isStreetView: true,
  },
  {
    id: 'slave-quarters',
    label: 'Souterrains & Esclaves',
    subtitle:
      'Sous les avenues · Geôles obscures, torches, engrenages géants & rouages des trottoirs roulants',
    position: [0.5, -10.4, 83.5],
    target: [-10.5, -10.4, 61.0],
    isStreetView: true,
  },
  {
    id: 'red-port',
    label: 'Red Port · Ascenseur & Port Est',
    subtitle:
      'Falaise Est de Red Line · Ascenseur hydraulique, télécabines descendant à 0 m & port océanique en contrebas',
    position: [525.0, -165.0, 275.0],
    target: [144.0, -205.0, -8.0],
    isStreetView: false,
  },
];
