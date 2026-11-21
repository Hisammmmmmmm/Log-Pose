export type SeaRegion =
  | 'Red Line'
  | 'Paradise'
  | 'New World'
  | 'East Blue'
  | 'West Blue'
  | 'North Blue'
  | 'South Blue'
  | 'Calm Belt';


export interface IslandLocation {
  id: string;
  name: string;
  subtitle: string;
  region: SeaRegion;
  arc: string;
  /** Normalized horizontal coordinate [0..1] on the equirectangular map (left -> right). */
  u: number;
  /** Normalized vertical coordinate [0..1] on the equirectangular map (top -> bottom). */
  v: number;
  /** Estimated relief tier for marker elevation above base sphere. */
  elevationTier: 'sea' | 'island' | 'sky' | 'redline';
  /** Danger / historical significance label. */
  notability: 'Legend' | 'Major Power' | 'Grand Line' | 'Four Blues';
  description: string;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type TerrainClass =
  | 'redline'
  | 'land'
  | 'desert'
  | 'snow'
  | 'canal'
  | 'calmbelt'
  | 'ocean';

export interface PixelClassification {
  terrain: TerrainClass;
  height: number;
  oceanMask: number;
}

/**
 * Converts equirectangular map coordinates (u in [0..1] left-to-right,
 * v in [0..1] top-to-bottom) to 3D Cartesian coordinates matching
 * Three.js SphereGeometry vertex mapping.
 */
export function equirectangularToSphere(
  u: number,
  v: number,
  radius: number
): Vec3 {
  const clampedU = Math.max(0, Math.min(1, u));
  const clampedV = Math.max(0, Math.min(1, v));

  const phi = clampedU * Math.PI * 2;
  const theta = clampedV * Math.PI;

  const sinTheta = Math.sin(theta);
  return {
    x: -radius * Math.cos(phi) * sinTheta,
    y: radius * Math.cos(theta),
    z: radius * Math.sin(phi) * sinTheta,
  };
}

/**
 * Formats equirectangular (u, v) into human-readable cartographic lat/lon.
 */
export function formatLatLon(u: number, v: number): string {
  const lat = (0.5 - v) * 180;
  const lon = (u - 0.5) * 360;
  const latStr = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr} · ${lonStr}`;
}

/**
 * Formats a 0..24 hour number into HH:MM (24-hour clock).
 */
export function formatHour(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  let hh = Math.floor(normalized);
  let mm = Math.round((normalized - hh) * 60);
  if (mm === 60) {
    mm = 0;
    hh = (hh + 1) % 24;
  }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Formats normalized cloud cover [0..1] as a percentage readout.
 */
export function formatCloudCover(cover: number): string {
  const clamped = Math.max(0, Math.min(1, cover));
  return `${Math.round(clamped * 100)}%`;
}

/**
 * Computes sun directional vector at a given hour (0..24) and orbital radius.
 */
export function computeSunPosition(hour: number, radius: number): Vec3 {
  const normalized = ((hour % 24) + 24) % 24;
  const angle = ((normalized - 12) / 24) * Math.PI * 2;
  const tilt = 0.28;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(tilt) * radius * 0.65,
    z: Math.sin(angle) * radius,
  };
}

/**
 * Returns 0 at midnight, 1 at noon, smoothly transitioning through dawn/dusk.
 */
export function computeDaylightFactor(hour: number): number {
  const normalized = ((hour % 24) + 24) % 24;
  const rad = ((normalized - 12) / 24) * Math.PI * 2;
  return 0.5 + 0.5 * Math.cos(rad);
}

/**
 * Duration of one full 24-hour planetary day/night rotation in real-time seconds (10 minutes).
 */
export const FULL_DAY_CYCLE_SECONDS = 600;

/**
 * Advances solar timeOfDay (0..24) by `deltaSeconds` given `cycleDurationSeconds` (default 600s = 10 min).
 */
export function advanceSolarHour(
  currentHour: number,
  deltaSeconds: number,
  cycleDurationSeconds = FULL_DAY_CYCLE_SECONDS
): number {
  const base = Number.isFinite(currentHour) ? currentHour : 12;
  if (
    !Number.isFinite(deltaSeconds) ||
    !Number.isFinite(cycleDurationSeconds) ||
    cycleDurationSeconds <= 0
  ) {
    return ((base % 24) + 24) % 24;
  }
  const next = base + (deltaSeconds * 24) / cycleDurationSeconds;
  return ((next % 24) + 24) % 24;
}

/**
 * Signed shortest modular difference in hours (-12..12] from `fromHour` to `toHour`.
 */
export function shortestSolarHourDelta(fromHour: number, toHour: number): number {
  const diff = ((((toHour - fromHour) % 24) + 24) % 24);
  return diff > 12 ? diff - 24 : diff;
}

/**
 * Deterministic 2D hash noise in [0..1] for procedural mountain ridges.
 */
export function hash2D(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

export function valueNoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2D(ix, iy);
  const b = hash2D(ix + 1, iy);
  const c = hash2D(ix, iy + 1);
  const d = hash2D(ix + 1, iy + 1);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function ridgedFbm2D(x: number, y: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = valueNoise2D(x * freq, y * freq);
    const ridge = 1 - Math.abs(n * 2 - 1);
    sum += ridge * ridge * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.07;
  }
  return norm > 0 ? sum / norm : 0;
}

/**
 * Classifies an RGB pixel from the One Piece equirectangular map into
 * terrain category, normalized elevation height [0..1], and ocean mask [0..1].
 */
export function classifyMapPixel(
  r: number,
  g: number,
  b: number
): PixelClassification {
  // 1. Red Line (crimson/terracotta continental ridge)
  if (r >= 82 && r - g >= 26 && r - b >= 26 && g < 112 && b < 112) {
    return {
      terrain: 'redline',
      height: 0.85,
      oceanMask: 0,
    };
  }

  // 2. Snow / bright white land (Drum Island, Skypiea, Whiteland)
  if (r >= 188 && g >= 188 && b >= 178 && Math.abs(r - b) < 40) {
    return {
      terrain: 'snow',
      height: 0.55,
      oceanMask: 0,
    };
  }

  // 3. Sand, clay and ochre continental land from the reference Blues maps.
  if (
    r >= 118 &&
    g >= 82 &&
    b <= 132 &&
    r - b >= 30 &&
    g - b >= 8 &&
    r >= g * 0.92 &&
    r <= g * 1.75
  ) {
    return {
      terrain: 'desert',
      height: 0.36,
      oceanMask: 0,
    };
  }

  // 4. Green and neutral landmasses (islands and giant continental shelves).
  const greenLand = g >= 65 && g - b >= 18 && r - b >= 6 && b < 135;
  const neutralLand =
    r >= 92 &&
    g >= 72 &&
    b <= 150 &&
    r - b >= 12 &&
    g - b >= 2;
  if (greenLand || neutralLand) {
    return {
      terrain: 'land',
      height: 0.42,
      oceanMask: 0,
    };
  }

  // 5. Calm Belt / bright cyan canals (Reverse Mountain canals & Calm Belt)
  if (b >= 135 && g >= 130 && r < 145 && b >= r + 15) {
    return {
      terrain: 'calmbelt',
      height: 0.01,
      oceanMask: 1,
    };
  }

  // 6. Deep ocean
  return {
    terrain: 'ocean',
    height: 0.0,
    oceanMask: 1,
  };
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * c),
    Math.round(a[1] + (b[1] - a[1]) * c),
    Math.round(a[2] + (b[2] - a[2]) * c),
  ];
}

/**
 * Generates clean procedural 3D terrain albedo RGB (no 2D map text/borders)
 * based on biome weights, normalized elevation [0..1], slope [0..1], and rock noise [0..1].
 */
export function computeTerrainAlbedo(params: {
  height: number;
  slope: number;
  redWeight: number;
  desertWeight: number;
  snowWeight: number;
  detailNoise: number;
}): [number, number, number] {
  const { height, slope, redWeight, desertWeight, snowWeight, detailNoise } =
    params;

  // Red Line continental strata (crimson sandstone, dark canyon crags, dusty peak crests)
  if (redWeight >= 0.42) {
    const baseRock: [number, number, number] = [152, 47, 40];
    const strata: [number, number, number] = [194, 84, 58];
    const cliffDark: [number, number, number] = [96, 28, 25];
    const peakDust: [number, number, number] = [212, 138, 112];

    let col = mixRgb(baseRock, strata, detailNoise * 0.85);
    col = mixRgb(col, cliffDark, Math.min(1, slope * 1.45) * 0.65);
    if (height > 0.82) {
      col = mixRgb(col, peakDust, Math.min(1, (height - 0.82) * 4.5) * 0.7);
    }
    return col;
  }

  // Desert islands (Alabasta dunes, sandstone mesas, oasis valleys)
  if (desertWeight > 0.35 && desertWeight >= snowWeight) {
    const sandLight: [number, number, number] = [228, 186, 112];
    const sandWarm: [number, number, number] = [196, 138, 68];
    const mesaRock: [number, number, number] = [156, 94, 54];
    let col = mixRgb(sandWarm, sandLight, detailNoise);
    col = mixRgb(col, mesaRock, Math.min(1, slope * 1.6) * 0.7);
    return col;
  }

  // Winter / Snow islands (Drum Rockies, Flevance, Whiteland, Loadstar)
  if (snowWeight > 0.38) {
    const glacier: [number, number, number] = [198, 221, 238];
    const snowCap: [number, number, number] = [242, 248, 252];
    const slateCliff: [number, number, number] = [108, 122, 138];
    let col = mixRgb(glacier, snowCap, Math.min(1, height * 1.2 + detailNoise * 0.2));
    col = mixRgb(col, slateCliff, Math.min(1, slope * 1.7) * 0.75);
    return col;
  }

  // Temperate / Tropical islands (shoreline sand -> lush forest -> rocky ridges -> alpine snow)
  const beachSand: [number, number, number] = [212, 188, 134];
  const forestLow: [number, number, number] = [44, 108, 52];
  const forestHigh: [number, number, number] = [78, 146, 68];
  const mountainRock: [number, number, number] = [112, 108, 98];
  const alpineSnow: [number, number, number] = [235, 242, 248];

  let col = mixRgb(forestLow, forestHigh, detailNoise * 0.92);
  if (height < 0.14) {
    const shoreT = Math.max(0, Math.min(1, (0.14 - height) / 0.08));
    col = mixRgb(col, beachSand, shoreT * 0.72);
  }
  if (slope > 0.34 || height > 0.48) {
    const rockT = Math.max(
      Math.min(1, Math.max(0, slope - 0.34) * 2.2),
      Math.max(0, (height - 0.48) * 2.4)
    );
    col = mixRgb(col, mountainRock, rockT * 0.78);
  }
  if (height > 0.66) {
    const snowT = Math.min(1, (height - 0.66) * 3.8);
    col = mixRgb(col, alpineSnow, snowT * 0.85);
  }
  return col;
}

/**
 * Filters locations by search query and optional sea region filter.
 */
export function filterIslands(
  islands: readonly IslandLocation[],
  query: string,
  regionFilter: SeaRegion | 'All' = 'All'
): IslandLocation[] {
  const q = query.trim().toLowerCase();
  return islands.filter((island) => {
    if (regionFilter !== 'All' && island.region !== regionFilter) {
      return false;
    }
    if (!q) return true;
    return (
      island.name.toLowerCase().includes(q) ||
      island.region.toLowerCase().includes(q) ||
      island.arc.toLowerCase().includes(q) ||
      island.subtitle.toLowerCase().includes(q)
    );
  });
}
