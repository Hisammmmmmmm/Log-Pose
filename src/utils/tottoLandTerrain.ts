import { equirectangularToSphere, valueNoise2D } from './globeMath';

export const TOTTO_LAND_WORLD_SIZE = 1320;
export const TOTTO_LAND_GLOBE_SCALE = 0.0036;
export const TOTTO_LAND_GLOBE_CENTER = { u: 0.198, v: 0.480 } as const;
export const TOTTO_LAND_ANGULAR_MASK_RADIUS = 0.232;
export const TOTTO_LAND_SEA_LEVEL_Y = 0.0;

export const WHOLE_CAKE_CHATEAU_CENTER = { x: 22.0, z: -14.0 } as const;
export const WHOLE_CAKE_CHATEAU_BASE_Y = 11.2;
export const SWEET_CITY_CENTER = { x: 18.0, z: 32.0 } as const;
export const SEDUCING_WOODS_CENTER = { x: -46.0, z: 2.0 } as const;

export type TottoLandTheme =
  | 'cacao'
  | 'cheese'
  | 'nuts'
  | 'biscuits'
  | 'jam'
  | 'ice'
  | 'fruits'
  | 'candy'
  | 'funwari'
  | 'cutlery'
  | 'milk'
  | 'jelly'
  | 'liqueur'
  | 'komugi'
  | 'tea'
  | 'spice'
  | 'honey'
  | 'baked'
  | 'butter'
  | 'snack';

export interface TottoLandPeripheralSpec {
  id: string;
  name: string;
  u: number;
  v: number;
  x: number;
  z: number;
  rx: number;
  rz: number;
  height: number;
  theme: TottoLandTheme;
}

export interface TottoLandPastryIsletSpec {
  id: string;
  x: number;
  z: number;
  radius: number;
  kind: 'tart' | 'cupcake' | 'donut';
  hue: number;
}

export interface TottoLandSeaSlugSpec {
  id: string;
  cx: number;
  cz: number;
  orbitR: number;
  phase: number;
  speed: number;
  shellColor: number;
}

export interface TottoLandCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

const ORIGIN_SPHERE = equirectangularToSphere(
  TOTTO_LAND_GLOBE_CENTER.u,
  TOTTO_LAND_GLOBE_CENTER.v,
  10
);
const ORIGIN_E_SPHERE = equirectangularToSphere(
  TOTTO_LAND_GLOBE_CENTER.u + 0.001,
  TOTTO_LAND_GLOBE_CENTER.v,
  10
);

function norm3(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

const UP_REF = norm3(ORIGIN_SPHERE.x, ORIGIN_SPHERE.y, ORIGIN_SPHERE.z);
const EAST_REF = norm3(
  ORIGIN_E_SPHERE.x - ORIGIN_SPHERE.x,
  ORIGIN_E_SPHERE.y - ORIGIN_SPHERE.y,
  ORIGIN_E_SPHERE.z - ORIGIN_SPHERE.z
);
const SOUTH_REF = norm3(
  EAST_REF[1] * UP_REF[2] - EAST_REF[2] * UP_REF[1],
  EAST_REF[2] * UP_REF[0] - EAST_REF[0] * UP_REF[2],
  EAST_REF[0] * UP_REF[1] - EAST_REF[1] * UP_REF[0]
);

/** Converts globe (u, v) into Totto Land tangent-plane meters around Whole Cake Island. */
export function tottoLandLocalFromUV(u: number, v: number): [number, number] {
  const p = equirectangularToSphere(u, v, 10);
  const dx = p.x - ORIGIN_SPHERE.x;
  const dy = p.y - ORIGIN_SPHERE.y;
  const dz = p.z - ORIGIN_SPHERE.z;
  const sx = dx * EAST_REF[0] + dy * EAST_REF[1] + dz * EAST_REF[2];
  const sz = dx * SOUTH_REF[0] + dy * SOUTH_REF[1] + dz * SOUTH_REF[2];
  return [
    Number((sx / TOTTO_LAND_GLOBE_SCALE).toFixed(2)),
    Number((sz / TOTTO_LAND_GLOBE_SCALE).toFixed(2)),
  ];
}

interface RawPeripheralDef {
  id: string;
  name: string;
  u: number;
  v: number;
  rx: number;
  rz: number;
  height: number;
  theme: TottoLandTheme;
}

const RAW_PERIPHERAL_DEFS: readonly RawPeripheralDef[] = [
  { id: 'fruits-island', name: 'Fruits Island', u: 0.184, v: 0.461, rx: 24, rz: 20, height: 6.4, theme: 'fruits' },
  { id: 'sanshoku-island', name: 'Sanshoku Island', u: 0.175, v: 0.464, rx: 19, rz: 17, height: 5.5, theme: 'candy' },
  { id: 'komugi-island', name: 'Komugi Island', u: 0.178, v: 0.484, rx: 21, rz: 18, height: 5.8, theme: 'komugi' },
  { id: 'tanega-futoru-island', name: 'Tanega Futoru Island', u: 0.188, v: 0.488, rx: 18, rz: 16, height: 5.2, theme: 'nuts' },
  { id: 'piepie-island', name: 'Piepie Island', u: 0.172, v: 0.497, rx: 21, rz: 18, height: 5.4, theme: 'baked' },
  { id: 'black-island', name: 'Black Island', u: 0.180, v: 0.493, rx: 18, rz: 16, height: 5.6, theme: 'tea' },
  { id: 'poripori-island', name: 'Poripori Island', u: 0.188, v: 0.495, rx: 16, rz: 15, height: 5.0, theme: 'snack' },
  { id: 'unique-island', name: 'Unique Island', u: 0.182, v: 0.506, rx: 18, rz: 16, height: 5.4, theme: 'spice' },
  { id: 'loving-island', name: 'Loving Island', u: 0.182, v: 0.517, rx: 19, rz: 17, height: 5.5, theme: 'fruits' },
  { id: 'topping-island', name: 'Topping Island', u: 0.188, v: 0.522, rx: 17, rz: 15, height: 5.2, theme: 'candy' },
  { id: 'package-island', name: 'Package Island', u: 0.192, v: 0.526, rx: 17, rz: 16, height: 5.4, theme: 'baked' },
  { id: 'kimi-island', name: 'Kimi Island', u: 0.188, v: 0.508, rx: 18, rz: 16, height: 5.4, theme: 'butter' },
  { id: 'biscuits-island', name: 'Biscuits Island', u: 0.193, v: 0.504, rx: 22, rz: 19, height: 6.2, theme: 'biscuits' },
  { id: 'cheese-island', name: 'Cheese Island', u: 0.197, v: 0.512, rx: 25, rz: 19, height: 6.2, theme: 'cheese' },
  { id: 'flavor-island', name: 'Flavor Island', u: 0.199, v: 0.521, rx: 18, rz: 16, height: 5.2, theme: 'spice' },
  { id: 'kinko-island', name: 'Kinko Island', u: 0.200, v: 0.528, rx: 18, rz: 16, height: 5.6, theme: 'baked' },
  { id: 'rokumitsu-island', name: 'Rokumitsu Island', u: 0.200, v: 0.460, rx: 20, rz: 18, height: 5.8, theme: 'honey' },
  { id: 'ice-island', name: 'Ice Island', u: 0.209, v: 0.462, rx: 23, rz: 19, height: 6.8, theme: 'ice' },
  { id: '100-percent-island', name: '100% Island', u: 0.217, v: 0.462, rx: 21, rz: 18, height: 5.8, theme: 'fruits' },
  { id: 'yakigashi-island', name: 'Yakigashi Island', u: 0.228, v: 0.462, rx: 21, rz: 18, height: 6.0, theme: 'baked' },
  { id: 'margarine-island', name: 'Margarine Island', u: 0.222, v: 0.471, rx: 19, rz: 17, height: 5.5, theme: 'butter' },
  { id: 'cutlery-island', name: 'Cutlery Island', u: 0.214, v: 0.479, rx: 23, rz: 19, height: 6.2, theme: 'cutlery' },
  { id: 'candy-island', name: 'Candy Island', u: 0.206, v: 0.491, rx: 22, rz: 19, height: 6.2, theme: 'candy' },
  { id: 'nuts-island', name: 'Nuts Island', u: 0.202, v: 0.502, rx: 22, rz: 19, height: 6.2, theme: 'nuts' },
  { id: 'cacao-island', name: 'Cacao Island', u: 0.214, v: 0.496, rx: 26, rz: 21, height: 6.6, theme: 'cacao' },
  { id: 'jam-island', name: 'Jam Island', u: 0.209, v: 0.506, rx: 21, rz: 18, height: 5.6, theme: 'jam' },
  { id: 'funwari-island', name: 'Funwari Island', u: 0.209, v: 0.520, rx: 23, rz: 19, height: 6.4, theme: 'funwari' },
  { id: 'milenge-island', name: 'Milenge Island', u: 0.210, v: 0.527, rx: 18, rz: 16, height: 6.0, theme: 'ice' },
  { id: 'liqueur-island', name: 'Liqueur Island', u: 0.227, v: 0.487, rx: 21, rz: 18, height: 5.8, theme: 'liqueur' },
  { id: 'jelly-island', name: 'Jelly Island', u: 0.221, v: 0.495, rx: 20, rz: 18, height: 5.8, theme: 'jelly' },
  { id: 'noko-island', name: 'Noko Island', u: 0.222, v: 0.507, rx: 16, rz: 15, height: 5.4, theme: 'milk' },
  { id: 'milk-island', name: 'Milk Island', u: 0.224, v: 0.513, rx: 16, rz: 15, height: 5.6, theme: 'milk' },
  { id: 'kibo-island', name: 'Kibo Island', u: 0.218, v: 0.517, rx: 17, rz: 15, height: 5.2, theme: 'baked' },
  { id: 'potato-island', name: 'Potato Island', u: 0.221, v: 0.526, rx: 19, rz: 17, height: 5.4, theme: 'snack' },
];

export const TOTTO_LAND_PERIPHERAL_ISLANDS: readonly TottoLandPeripheralSpec[] =
  RAW_PERIPHERAL_DEFS.map((def) => {
    const [x, z] = tottoLandLocalFromUV(def.u, def.v);
    return { ...def, x, z };
  });

export const TOTTO_LAND_ISLAND_BY_ID: Record<string, TottoLandPeripheralSpec> =
  Object.fromEntries(TOTTO_LAND_PERIPHERAL_ISLANDS.map((isl) => [isl.id, isl]));

export const TOTTO_LAND_SUB_LOCATIONS: Record<string, [number, number]> = {
  'whole-cake-island': [0.0, 0.0],
  ...Object.fromEntries(
    TOTTO_LAND_PERIPHERAL_ISLANDS.map((isl) => [isl.id, [isl.x, isl.z]])
  ),
};

export const TOTTO_LAND_PASTRY_ISLETS: readonly TottoLandPastryIsletSpec[] = [
  { id: 'islet-1', x: -96, z: 64, radius: 5.8, kind: 'tart', hue: 0xf43f5e },
  { id: 'islet-2', x: 94, z: 54, radius: 6.2, kind: 'cupcake', hue: 0xf472b6 },
  { id: 'islet-3', x: -102, z: -72, radius: 5.6, kind: 'donut', hue: 0xf59e0b },
  { id: 'islet-4', x: 96, z: -64, radius: 5.8, kind: 'tart', hue: 0xa855f7 },
  { id: 'islet-5', x: -48, z: 108, radius: 5.5, kind: 'cupcake', hue: 0x38bdf8 },
  { id: 'islet-6', x: 64, z: 112, radius: 5.8, kind: 'donut', hue: 0xfb7185 },
  { id: 'islet-7', x: -124, z: -8, radius: 5.6, kind: 'tart', hue: 0xec4899 },
  { id: 'islet-8', x: 118, z: -12, radius: 6.0, kind: 'cupcake', hue: 0xfbbf24 },
  { id: 'islet-9', x: -64, z: -106, radius: 5.5, kind: 'donut', hue: 0x34d399 },
  { id: 'islet-10', x: 144, z: 48, radius: 5.8, kind: 'tart', hue: 0xf97316 },
  { id: 'islet-11', x: -148, z: 86, radius: 5.8, kind: 'cupcake', hue: 0xc084fc },
  { id: 'islet-12', x: 108, z: -132, radius: 5.6, kind: 'donut', hue: 0xf43f5e },
];

export const TOTTO_LAND_SEA_SLUGS: readonly TottoLandSeaSlugSpec[] = [
  { id: 'slug-1', cx: 0, cz: 0, orbitR: 118, phase: 0.4, speed: 0.14, shellColor: 0xec4899 },
  { id: 'slug-2', cx: 0, cz: 0, orbitR: 122, phase: 2.5, speed: -0.12, shellColor: 0x22c55e },
  { id: 'slug-3', cx: 0, cz: 0, orbitR: 120, phase: 4.5, speed: 0.13, shellColor: 0xf59e0b },
  { id: 'slug-4', cx: 0, cz: 0, orbitR: 235, phase: 1.1, speed: 0.08, shellColor: 0xa855f7 },
  { id: 'slug-5', cx: 0, cz: 0, orbitR: 240, phase: 3.4, speed: -0.075, shellColor: 0x06b6d4 },
  { id: 'slug-6', cx: 0, cz: 0, orbitR: 238, phase: 5.2, speed: 0.085, shellColor: 0xf43f5e },
];

export const TOTTO_LAND_LANDMARKS = {
  overviewTarget: { x: 8.0, z: 0.0 },
  wholeCakeChateau: { x: WHOLE_CAKE_CHATEAU_CENTER.x, z: WHOLE_CAKE_CHATEAU_CENTER.z },
  chateauSouthPlaza: { x: 20.0, z: 17.5 },
  sweetCityStreet: { x: 16.0, z: 37.5 },
  sweetCityHarbor: { x: 18.0, z: 64.0 },
  seducingWoodsEntry: { x: -24.0, z: 12.0 },
  seducingWoodsHeart: { x: -46.0, z: 2.0 },
  chateauWestBridge: { x: -4.0, z: -12.0 },
  chateauEastBridge: { x: 48.0, z: -14.0 },
  sweetCityJuiceBridge: { x: 16.0, z: 29.0 },
  seducingCausewayBridge: { x: -12.0, z: 18.0 },
  sunnySpawnHarbor: { x: 18.0, z: 88.0 },
  sunnySpawnCacao: {
    x: TOTTO_LAND_ISLAND_BY_ID['cacao-island'].x,
    z: TOTTO_LAND_ISLAND_BY_ID['cacao-island'].z + 36.0,
  },
  sunnySpawnCheese: {
    x: TOTTO_LAND_ISLAND_BY_ID['cheese-island'].x,
    z: TOTTO_LAND_ISLAND_BY_ID['cheese-island'].z + 34.0,
  },
} as const;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Signed distance from any dry landmass in Totto Land (< 0 on dry land, > 0 in water/moat/harbor).
 */
export function tottoLandArchipelagoSignedDist(x: number, z: number): {
  sd: number;
  islandId: string;
  kind:
    | 'whole-cake'
    | 'moat'
    | 'harbor'
    | 'juice-river'
    | 'peripheral'
    | 'pastry-islet'
    | 'sea';
} {
  // 1. Central Whole Cake Island (Eastern Chateau/Sweet City + Western Seducing Woods)
  const nCoast = (valueNoise2D(x * 0.045 + 2.1, z * 0.045 - 1.7) - 0.5) * 6.0;

  // Eastern main lobe (Chateau + Sweet City + northern pudding peaks + eastern teacup)
  const ex = (x - 19.0) / (46.0 + nCoast * 0.65);
  const ez = (z - 2.0) / (56.0 + nCoast * 0.7);
  const eastLobeSd = (Math.hypot(ex, ez) - 1.0) * 46.0;

  // Eastern teacup/parfait cape
  const cx = (x - 62.0) / 17.5;
  const cz = (z + 12.0) / 16.5;
  const capeSd = (Math.hypot(cx, cz) - 1.0) * 16.5;

  // Northern chocolate-caramel mountain bulge
  const nx = (x + 12.0) / 26.0;
  const nz = (z + 40.0) / 18.0;
  const northSd = (Math.hypot(nx, nz) - 1.0) * 18.0;

  // Western Seducing Woods lobe
  const wx = (x + 46.0) / (34.0 + nCoast * 0.7);
  const wz = (z - 2.0) / (40.0 + nCoast * 0.7);
  const westLobeSd = (Math.hypot(wx, wz) - 1.0) * 34.0;

  // Connecting land isthmus near north-center
  const ix = (x + 12.0) / 18.0;
  const iz = (z + 18.0) / 14.0;
  const isthmusSd = (Math.hypot(ix, iz) - 1.0) * 14.0;

  let wciSd = Math.min(eastLobeSd, capeSd, northSd, westLobeSd, isthmusSd);

  // Carve Southern Crescent Harbor cove into Sweet City waterfront
  const harborGap =
    (1.0 - Math.hypot((x - 18.0) / 17.5, (z - 55.5) / 11.5)) * 11.5;
  const harborMouth =
    z > 48.0 && z < 78.0 ? 11.5 - Math.abs(x - 18.0) : -20.0;
  const totalHarborGap = Math.max(harborGap, harborMouth);
  if (wciSd < 0 && totalHarborGap > 0) {
    return { sd: totalHarborGap, islandId: 'whole-cake-island', kind: 'harbor' };
  }
  wciSd = Math.max(wciSd, totalHarborGap);

  // Carve Chateau Canal Moat wrapping West, North, and East of Whole Cake Chateau
  // while keeping South royal staircase causeway & East/West land necks
  const dChateau = Math.hypot(
    (x - WHOLE_CAKE_CHATEAU_CENTER.x) / 1.06,
    z - WHOLE_CAKE_CHATEAU_CENTER.z
  );
  const moatGap = 5.4 - Math.abs(dChateau - 27.5);
  const inChateauSouthApproach =
    z > WHOLE_CAKE_CHATEAU_CENTER.z + 10.0 &&
    Math.abs(x - WHOLE_CAKE_CHATEAU_CENTER.x) < 11.0;
  if (wciSd < 0 && moatGap > 0 && !inChateauSouthApproach) {
    return { sd: moatGap, islandId: 'whole-cake-island', kind: 'moat' };
  }

  // Carve Sweet City East-West Orange Juice River (z ~ 29)
  const riverY = 29.0 + Math.sin(x * 0.08) * 2.2;
  const juiceGap = 2.6 - Math.abs(z - riverY);
  if (wciSd < 0 && juiceGap > 0 && x > -12.0 && x < 54.0) {
    return { sd: juiceGap, islandId: 'whole-cake-island', kind: 'juice-river' };
  }

  if (wciSd <= 0) {
    return { sd: wciSd, islandId: 'whole-cake-island', kind: 'whole-cake' };
  }

  // 2. All 34 Thematic Peripheral Islands of Totto Land
  let minSd = wciSd;
  let closestId = 'sea';
  for (let i = 0; i < TOTTO_LAND_PERIPHERAL_ISLANDS.length; i++) {
    const isl = TOTTO_LAND_PERIPHERAL_ISLANDS[i];
    const dx = x - isl.x;
    const dz = z - isl.z;
    const quickBound = Math.max(isl.rx, isl.rz) + 8.0;
    if (Math.abs(dx) > quickBound || Math.abs(dz) > quickBound) continue;

    const ang = Math.atan2(dz, dx);
    const wave =
      1.6 * Math.sin(ang * 3.0 + i * 1.3) +
      1.1 * Math.cos(ang * 5.0 - i * 0.7);
    const px = dx / (isl.rx + wave);
    const pz = dz / (isl.rz + wave * 0.85);
    const pSd = (Math.hypot(px, pz) - 1.0) * Math.min(isl.rx, isl.rz);
    if (pSd <= 0) {
      return { sd: pSd, islandId: isl.id, kind: 'peripheral' };
    }
    if (pSd < minSd) {
      minSd = pSd;
      closestId = isl.id;
    }
  }

  // 3. Miniature Tart / Cupcake / Donut sea islets
  for (let i = 0; i < TOTTO_LAND_PASTRY_ISLETS.length; i++) {
    const pit = TOTTO_LAND_PASTRY_ISLETS[i];
    const d = Math.hypot(x - pit.x, z - pit.z) - pit.radius;
    if (d <= 0) {
      return { sd: d, islandId: pit.id, kind: 'pastry-islet' };
    }
    if (d < minSd) {
      minSd = d;
      closestId = pit.id;
    }
  }

  return { sd: minSd, islandId: closestId, kind: 'sea' };
}

export type TottoLandZone =
  | 'sea'
  | 'harbor'
  | 'moat'
  | 'juice-river'
  | 'chateau'
  | 'sweet-city'
  | 'seducing-woods'
  | 'caramel-peaks'
  | 'parfait-cape'
  | 'peripheral'
  | 'pastry-islet';

export function sampleTottoLandZone(x: number, z: number): TottoLandZone {
  const { sd, kind } = tottoLandArchipelagoSignedDist(x, z);
  if (kind === 'harbor') return 'harbor';
  if (kind === 'moat') return 'moat';
  if (kind === 'juice-river') return 'juice-river';
  if (kind === 'peripheral') return 'peripheral';
  if (kind === 'pastry-islet') return 'pastry-islet';
  if (kind === 'sea' || sd > 0) return 'sea';

  if (
    Math.hypot(x - WHOLE_CAKE_CHATEAU_CENTER.x, z - WHOLE_CAKE_CHATEAU_CENTER.z) < 23.0
  ) {
    return 'chateau';
  }
  if (x < -13.0 && z > -28.0) {
    return 'seducing-woods';
  }
  if (z < -26.0 && x < 12.0) {
    return 'caramel-peaks';
  }
  if (x > 49.0 && z < 8.0) {
    return 'parfait-cape';
  }
  return 'sweet-city';
}

/**
 * Samples local terrain height in Totto Land meters (sea level = 0, negative = seabed).
 */
export function sampleTottoLandHeight(x: number, z: number): number {
  const { sd, islandId, kind } = tottoLandArchipelagoSignedDist(x, z);

  if (kind === 'sea' || kind === 'harbor' || kind === 'moat' || kind === 'juice-river' || sd >= 0) {
    if (kind === 'moat' || kind === 'juice-river') {
      return -0.65;
    }
    const depth = smoothstep(0.0, 8.0, sd);
    return -0.4 - depth * 2.2;
  }

  if (kind === 'pastry-islet') {
    return 1.8 + smoothstep(0.0, 2.5, -sd) * 1.4;
  }

  const micro = (valueNoise2D(x * 0.08 + 1.9, z * 0.08 - 3.4) - 0.5) * 1.1;

  if (kind === 'peripheral') {
    const isl = TOTTO_LAND_ISLAND_BY_ID[islandId];
    if (!isl) return 4.5;
    const cliffT = smoothstep(0.0, 4.5, -sd);
    let h = 2.6 + cliffT * (isl.height - 2.6) + micro * 0.85;
    if (isl.theme === 'cheese') {
      // Flat central town terrace for Cheese monoliths & Burger Homie
      const dTown = Math.hypot(x - isl.x, z - isl.z);
      const flatT = 1 - smoothstep(5.0, 12.0, dTown);
      h = h * (1 - flatT) + 6.4 * flatT;
    } else if (isl.theme === 'cacao') {
      // Three steep cocoa pyramid peaks on west side + Chocolat Town terrace on east
      const dx = x - isl.x;
      const dz = z - isl.z;
      for (const [px, pz, pr, ph] of [
        [-11.5, -4.5, 7.5, 19.5],
        [-7.0, 2.5, 8.2, 22.0],
        [-12.5, 5.5, 6.8, 17.5],
      ] as const) {
        const dp = Math.hypot(dx - px, dz - pz);
        if (dp < pr) {
          h = Math.max(h, 6.2 + (1 - dp / pr) * (ph - 6.2));
        }
      }
      const dTown = Math.hypot(dx - 7.5, dz);
      const townT = 1 - smoothstep(4.5, 11.5, dTown);
      h = h * (1 - townT) + 6.2 * townT;
    }
    return h;
  }

  // Whole Cake Island terrain
  const cliffT = smoothstep(0.0, 4.2, -sd);
  let h = 3.2 + cliffT * 3.4 + micro * 0.7;

  // Raised Chateau cake island plateau
  const dChateau = Math.hypot(
    (x - WHOLE_CAKE_CHATEAU_CENTER.x) / 1.05,
    z - WHOLE_CAKE_CHATEAU_CENTER.z
  );
  if (dChateau < 24.5) {
    const chT = 1 - smoothstep(14.5, 23.5, dChateau);
    h = h * (1 - chT) + WHOLE_CAKE_CHATEAU_BASE_Y * chT;
  }

  // Sweet City plaza terraces & harbor step
  const dHarborStep = Math.hypot((x - 18.0) / 24.0, (z - 42.0) / 14.0);
  if (dHarborStep < 1.15) {
    const qT = 1 - smoothstep(0.55, 1.12, dHarborStep);
    h = h * (1 - qT) + 5.2 * qT;
  }

  // Seducing Woods gentle undulating candy hills
  if (x < -12.0 && z > -26.0) {
    const swWave =
      Math.sin(x * 0.11) * Math.cos(z * 0.11) * 1.4 +
      (valueNoise2D(x * 0.05, z * 0.05) - 0.5) * 2.2;
    const clearingD = Math.hypot(x - SEDUCING_WOODS_CENTER.x, z - SEDUCING_WOODS_CENTER.z);
    const clearT = 1 - smoothstep(5.5, 13.0, clearingD);
    h = (7.2 + swWave) * (1 - clearT) + 7.2 * clearT;
  }

  // Northern Caramel-Chocolate Peaks crowned with Whipped Cream & Cherries
  for (const [mx, mz, mr, mh] of [
    [-22.0, -42.0, 13.0, 21.0],
    [-9.5, -45.5, 11.5, 18.5],
  ] as const) {
    const dm = Math.hypot(x - mx, z - mz);
    if (dm < mr) {
      const mT = 1 - smoothstep(1.2, mr, dm);
      h = Math.max(h, 6.2 + mT * (mh - 6.2));
    }
  }

  return h;
}

/**
 * Walkable elevation including arched bridges over the Chateau moat & Sweet City juice river.
 */
export function sampleTottoLandWalkSurfaceHeight(x: number, z: number): number {
  // West Chateau arched bridge
  if (Math.abs(z - TOTTO_LAND_LANDMARKS.chateauWestBridge.z) < 2.8 && x >= -10 && x <= 4) {
    const t = clamp((x + 10) / 14, 0, 1);
    return 7.4 + Math.sin(t * Math.PI) * 2.2 + t * 2.2;
  }
  // East Chateau arched bridge
  if (Math.abs(z - TOTTO_LAND_LANDMARKS.chateauEastBridge.z) < 2.8 && x >= 41 && x <= 55) {
    const t = clamp((x - 41) / 14, 0, 1);
    return 9.6 - t * 2.4 + Math.sin(t * Math.PI) * 2.0;
  }
  // Sweet City orange-juice river arched bridge
  if (
    Math.abs(x - TOTTO_LAND_LANDMARKS.sweetCityJuiceBridge.x) < 2.8 &&
    z >= 24.5 &&
    z <= 33.5
  ) {
    const t = clamp((z - 24.5) / 9.0, 0, 1);
    return 5.4 + Math.sin(t * Math.PI) * 1.9;
  }
  // Seducing Woods southern causeway bridge
  if (Math.abs(z - TOTTO_LAND_LANDMARKS.seducingCausewayBridge.z) < 2.8 && x >= -20 && x <= -5) {
    return 6.8;
  }

  return Math.max(TOTTO_LAND_SEA_LEVEL_Y, sampleTottoLandHeight(x, z));
}

export function toTottoLandSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * TOTTO_LAND_GLOBE_SCALE;
  const sz = z * TOTTO_LAND_GLOBE_SCALE;
  const sy = y * TOTTO_LAND_GLOBE_SCALE;
  const r2 = sx * sx + sz * sz;
  const sag =
    globeRadius - Math.sqrt(Math.max(0.01, globeRadius * globeRadius - r2));
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
  const groundY = sampleTottoLandWalkSurfaceHeight(lx, lz);
  return [
    Number(lx.toFixed(2)),
    Number((groundY + eyeHeight).toFixed(2)),
    Number(lz.toFixed(2)),
  ];
}

const cacaoLoc = TOTTO_LAND_ISLAND_BY_ID['cacao-island'];
const cheeseLoc = TOTTO_LAND_ISLAND_BY_ID['cheese-island'];
const cutleryLoc = TOTTO_LAND_ISLAND_BY_ID['cutlery-island'];
const funwariLoc = TOTTO_LAND_ISLAND_BY_ID['funwari-island'];

export const TOTTO_LAND_CAMERA_PRESETS: readonly TottoLandCameraPreset[] = [
  {
    id: 'overview',
    label: 'Archipel · Totto Land (35 Îles)',
    subtitle:
      'Vue aérienne complète : Whole Cake Island au centre et les 34 îles ministérielles entourées par l’océan',
    position: [-26.0, 165.0, 228.0],
    target: [6.0, 10.0, 6.0],
    isStreetView: false,
  },
  {
    id: 'whole-cake-chateau',
    label: 'Château de Whole Cake',
    subtitle:
      'Pièce montée royale à étages, glaçage dégoulinant, bougies géantes, dômes fruités, douves & port en croissant',
    position: [14.0, 44.0, 96.0],
    target: [21.0, 24.0, -10.0],
    isStreetView: false,
  },
  {
    id: 'sweet-city',
    label: 'Sweet City · Rues Sucrées',
    subtitle:
      'Vue humaine (1,75 m) · Maisons en pain d’épices, tours en cornets de glace, rivière de jus d’orange, pont & grande roue',
    position: camAtGround(
      TOTTO_LAND_LANDMARKS.sweetCityStreet.x,
      TOTTO_LAND_LANDMARKS.sweetCityStreet.z,
      1.75
    ),
    target: [20.5, 18.0, -8.0],
    isStreetView: true,
  },
  {
    id: 'seducing-woods',
    label: 'Forêt de la Séduction',
    subtitle:
      'Vue humaine (1,75 m) · Arbres Homies à visages expressifs, sentiers mouvants, sucettes géantes & sommets caramel',
    position: camAtGround(
      TOTTO_LAND_LANDMARKS.seducingWoodsHeart.x,
      TOTTO_LAND_LANDMARKS.seducingWoodsHeart.z + 10.0,
      1.75
    ),
    target: [-42.0, 9.5, -16.0],
    isStreetView: true,
  },
  {
    id: 'cacao-island',
    label: 'Île Cacao · Chocolat Town',
    subtitle:
      'Falaises en chocolat noir, trois montagnes pyramidales cacaotées et cité sculptée en chocolat de Pudding',
    position: [cacaoLoc.x + 8.0, 32.0, cacaoLoc.z + 52.0],
    target: [cacaoLoc.x, 9.0, cacaoLoc.z - 2.0],
    isStreetView: false,
  },
  {
    id: 'cheese-island',
    label: 'Île Fromage · Burger Homie',
    subtitle:
      'Falaises de fromage fondu, dalles d’emmental géantes, Burger Homie chef cuistot, pizza & maisons bouteilles de lait',
    position: [cheeseLoc.x - 4.0, 26.0, cheeseLoc.z + 48.0],
    target: [cheeseLoc.x, 12.0, cheeseLoc.z],
    isStreetView: false,
  },
  {
    id: 'peripheral-cupcakes',
    label: 'Îles Pâtisseries · Cupcakes & Glace',
    subtitle:
      'Cupcakes géants & roulés à la cannelle, couverts monumentaux, îlots tartes/donuts et limaces de mer de garde',
    position: [cutleryLoc.x - 18.0, 34.0, cutleryLoc.z + 52.0],
    target: [
      (cutleryLoc.x + funwariLoc.x) * 0.5,
      10.0,
      cutleryLoc.z - 4.0,
    ],
    isStreetView: false,
  },
];
