import * as THREE from 'three';
import { equirectangularToSphere, type Vec3 } from './globeMath';
import { DAWN_GLOBE_CENTER } from './dawnTerrain';
import {
  SKYPIEA_ALTITUDE,
  SKYPIEA_GLOBE_CENTER,
} from './skypieaTerrain';
import { MARY_GEOISE_GLOBE_CENTER } from './maryGeoiseTerrain';
import { THRILLER_BARK_GLOBE_CENTER } from './thrillerBarkTerrain';

/**
 * Distinct 3D volumetric cloud altitude band strictly below Skypiea
 * (SKYPIEA_ALTITUDE = 0.50). Even the tallest storm dome crest stays safely
 * beneath Skypiea's White-White Sea (< 0.47).
 */
export const GLOBE_CLOUD_ALTITUDE_MIN = 0.23;
export const GLOBE_CLOUD_ALTITUDE_MAX = 0.37;
export const MAX_SHADOW_CLOUD_UNIFORMS = 40;

export type CloudWeatherType = 'cumulus' | 'gray' | 'rain' | 'storm' | 'snow';

export interface CloudWeatherSpec {
  readonly code: number;
  readonly shadowStrength: number;
  readonly seaRoughness: number;
  readonly shipSpeedFactor: number;
  readonly precipRate: number;
}

export const CLOUD_WEATHER_SPECS: Record<CloudWeatherType, CloudWeatherSpec> = {
  cumulus: {
    code: 0,
    shadowStrength: 0.34,
    seaRoughness: 0.28,
    shipSpeedFactor: 0.94,
    precipRate: 0,
  },
  gray: {
    code: 1,
    shadowStrength: 0.56,
    seaRoughness: 0.52,
    shipSpeedFactor: 0.82,
    precipRate: 0,
  },
  snow: {
    code: 2,
    shadowStrength: 0.70,
    seaRoughness: 0.68,
    shipSpeedFactor: 0.70,
    precipRate: 0.85,
  },
  rain: {
    code: 3,
    shadowStrength: 0.78,
    seaRoughness: 0.80,
    shipSpeedFactor: 0.63,
    precipRate: 0.85,
  },
  storm: {
    code: 4,
    shadowStrength: 0.93,
    seaRoughness: 1.0,
    shipSpeedFactor: 0.45,
    precipRate: 1.0,
  },
};

export interface CloudPuffSpec {
  readonly ox: number;
  readonly oy: number;
  readonly oz: number;
  readonly sx: number;
  readonly sy: number;
  readonly sz: number;
}

export interface GlobeCloudFormation {
  readonly id: number;
  readonly weatherType: CloudWeatherType;
  readonly baseDir: Vec3;
  readonly orbitAxis: Vec3;
  readonly driftSpeed: number;
  readonly altitude: number;
  readonly radius: number;
  readonly heightScale: number;
  readonly coverThreshold: number;
  readonly yaw: number;
  readonly puffs: readonly CloudPuffSpec[];
}

export interface CloudShadowVec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface CloudShadowParamVec4 {
  /** Progressive shadow umbra opacity [0..0.95] */
  x: number;
  /** Sea agitation directly underneath [0..1] */
  y: number;
  /** Encoded weather type [0=cumulus, 1=gray, 2=snow, 3=rain, 4=storm] */
  z: number;
  /** Active storm lightning flash [0..1] */
  w: number;
}

export interface ActiveCloudTransform {
  dirX: number;
  dirY: number;
  dirZ: number;
  posX: number;
  posY: number;
  posZ: number;
  visScale: number;
  shadowRadius: number;
  shadowStrength: number;
  seaRoughness: number;
  weatherCode: number;
  lightning: number;
}

export interface UnderCloudWeatherSample {
  /** Local sea roughness [0..1]; 0 when no cloud is overhead (very calm sea). */
  seaRoughness: number;
  /** Effective shadow darkness overhead [0..0.95]. */
  shadowStrength: number;
  /** Forward ship propulsion multiplier [0.45..1.0]; 1.0 on calm clear sea. */
  speedFactor: number;
  /** Dominant cloud weather type overhead, or null if clear sky. */
  weatherType: CloudWeatherType | null;
  /** Rain intensity [0..1] beneath rain/storm clouds. */
  rainIntensity: number;
  /** Snow intensity [0..1] beneath snow clouds. */
  snowIntensity: number;
  /** Active storm lightning flash intensity [0..1]. */
  lightning: number;
}

const WEATHER_BY_CODE: readonly CloudWeatherType[] = [
  'cumulus',
  'gray',
  'snow',
  'rain',
  'storm',
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / Math.max(1e-6, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function normalizeVec3(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dotVec3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Computes total horizontal disk surface area covered by a list of cloud formations.
 */
export function computeTotalCloudSurfaceArea(
  clouds: readonly GlobeCloudFormation[]
): number {
  let total = 0;
  for (let i = 0; i < clouds.length; i++) {
    const r = clouds[i].radius;
    total += Math.PI * r * r;
  }
  return total;
}

/**
 * Deterministic double-flicker internal lightning pulse for thunderstorm clouds.
 */
export function computeStormLightningIntensity(
  cloudId: number,
  elapsed: number
): number {
  const period = 4.6 + ((cloudId * 1.731) % 3.8);
  const phase = (elapsed + cloudId * 2.17) % period;
  if (phase > 0.34) return 0;
  const flashA = Math.exp(-Math.pow((phase - 0.06) / 0.032, 2));
  const flashB = 0.85 * Math.exp(-Math.pow((phase - 0.18) / 0.045, 2));
  return clamp(Math.max(flashA, flashB), 0, 1);
}

/**
 * Computes a sun direction in local navigation / start-screen space so daytime
 * solar hours (e.g. 13:30) always cast clear directional cloud shadows onto the
 * ocean and islands around the ship anywhere on the globe.
 */
export function computeLocalNavigationSunDir(
  shipUnitPos: Vec3,
  hour: number
): Vec3 {
  const up = normalizeVec3(shipUnitPos);
  const refPole: Vec3 =
    Math.abs(up.y) > 0.92 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 };
  const east = normalizeVec3(crossVec3(refPole, up));
  const north = normalizeVec3(crossVec3(up, east));

  const normalized = ((hour % 24) + 24) % 24;
  const hourAngle = ((normalized - 12) / 24) * Math.PI * 2;
  const cosH = Math.cos(hourAngle);
  const sinH = Math.sin(hourAngle);

  const tiltNorth = -0.34;
  const zenithWeight = cosH * 0.94;
  const eastWeight = -sinH * 0.94;

  return normalizeVec3({
    x: up.x * zenithWeight + east.x * eastWeight + north.x * tiltNorth,
    y: up.y * zenithWeight + east.y * eastWeight + north.y * tiltNorth,
    z: up.z * zenithWeight + east.z * eastWeight + north.z * tiltNorth,
  });
}

function buildPuffsForWeather(
  rand: () => number,
  weatherType: CloudWeatherType
): CloudPuffSpec[] {
  const isFlatDeck = weatherType === 'gray' || weatherType === 'rain';
  const isStormTower = weatherType === 'storm';
  const baseWidthScale = isFlatDeck ? 1.14 : isStormTower ? 1.08 : 1.0;
  const domeBoost = isStormTower ? 1.24 : isFlatDeck ? 0.78 : 1.0;

  const puffs: CloudPuffSpec[] = [
    // Central dome
    {
      ox: (rand() - 0.5) * 0.14,
      oy: (0.22 + rand() * 0.1) * domeBoost,
      oz: (rand() - 0.5) * 0.14,
      sx: (0.62 + rand() * 0.14) * baseWidthScale,
      sy: (0.52 + rand() * 0.14) * domeBoost,
      sz: (0.58 + rand() * 0.14) * baseWidthScale,
    },
    // Broadened lower shelf
    {
      ox: 0,
      oy: -0.05,
      oz: 0,
      sx: (0.98 + rand() * 0.18) * baseWidthScale,
      sy: 0.34 + rand() * 0.08,
      sz: (0.82 + rand() * 0.16) * baseWidthScale,
    },
    // Left shoulder
    {
      ox: (-0.58 - rand() * 0.16) * baseWidthScale,
      oy: 0.03 + rand() * 0.09,
      oz: (rand() - 0.5) * 0.24,
      sx: (0.52 + rand() * 0.14) * baseWidthScale,
      sy: 0.4 + rand() * 0.11,
      sz: (0.5 + rand() * 0.12) * baseWidthScale,
    },
    // Right shoulder
    {
      ox: (0.6 + rand() * 0.16) * baseWidthScale,
      oy: 0.05 + rand() * 0.09,
      oz: (rand() - 0.5) * 0.24,
      sx: (0.52 + rand() * 0.14) * baseWidthScale,
      sy: 0.42 + rand() * 0.11,
      sz: (0.5 + rand() * 0.12) * baseWidthScale,
    },
    // Front / aft trailing wisps
    {
      ox: (rand() - 0.5) * 0.36,
      oy: -0.02 + rand() * 0.07,
      oz: (0.46 + rand() * 0.14) * baseWidthScale,
      sx: (0.48 + rand() * 0.12) * baseWidthScale,
      sy: 0.31 + rand() * 0.09,
      sz: (0.45 + rand() * 0.12) * baseWidthScale,
    },
    {
      ox: (rand() - 0.5) * 0.36,
      oy: -0.02 + rand() * 0.07,
      oz: (-0.46 - rand() * 0.14) * baseWidthScale,
      sx: (0.46 + rand() * 0.12) * baseWidthScale,
      sy: 0.31 + rand() * 0.09,
      sz: (0.45 + rand() * 0.12) * baseWidthScale,
    },
  ];
  if (rand() > 0.28 || isStormTower) {
    puffs.push({
      ox: (rand() > 0.5 ? 1 : -1) * (0.3 + rand() * 0.18),
      oy: (0.18 + rand() * 0.11) * domeBoost,
      oz: (rand() - 0.5) * 0.22,
      sx: 0.42 + rand() * 0.1,
      sy: (0.36 + rand() * 0.1) * domeBoost,
      sz: 0.4 + rand() * 0.1,
    });
  }
  return puffs;
}

function makeTradeWindAxis(dir: Vec3, rand: () => number): Vec3 {
  const tiltX = (rand() - 0.5) * 0.36;
  const tiltZ = (rand() - 0.5) * 0.36;
  const axisRaw: Vec3 = {
    x: tiltX,
    y: 1.0,
    z: tiltZ,
  };
  const d = Math.abs(dotVec3(dir, normalizeVec3(axisRaw)));
  if (d > 0.9) {
    return normalizeVec3({ x: 0.65, y: 0.5, z: -0.4 });
  }
  return normalizeVec3(axisRaw);
}

function pickGlobalCloudWeather(
  dir: Vec3,
  rand: () => number
): CloudWeatherType {
  const absLat = Math.abs(dir.y);
  const r = rand();
  // Higher latitudes & winter seas favor snow clouds; tropical/Grand Line belts favor rain & thunderstorms
  if (absLat > 0.54) {
    if (r < 0.36) return 'snow';
    if (r < 0.58) return 'gray';
    if (r < 0.74) return 'cumulus';
    if (r < 0.89) return 'rain';
    return 'storm';
  }
  if (r < 0.27) return 'cumulus';
  if (r < 0.49) return 'gray';
  if (r < 0.70) return 'rain';
  if (r < 0.87) return 'storm';
  return 'snow';
}

/**
 * Generates ~475 distinct 3D cloud formations covering ~5x more surface area
 * across the planet plus curated East Blue hero clouds near Dawn Island,
 * spanning cumulus, gray, rain, thunderstorm, and snow clouds strictly below
 * Skypiea's altitude (0.50).
 */
export function generateGlobeClouds(
  sampleHeightAt?: (u: number, v: number) => number
): GlobeCloudFormation[] {
  const rand = mulberry32(421907);
  const clouds: GlobeCloudFormation[] = [];

  const skypieaUnit = normalizeVec3(
    equirectangularToSphere(SKYPIEA_GLOBE_CENTER.u, SKYPIEA_GLOBE_CENTER.v, 1)
  );
  const maryUnit = normalizeVec3(
    equirectangularToSphere(
      MARY_GEOISE_GLOBE_CENTER.u,
      MARY_GEOISE_GLOBE_CENTER.v,
      1
    )
  );
  const tbUnit = normalizeVec3(
    equirectangularToSphere(
      THRILLER_BARK_GLOBE_CENTER.u,
      THRILLER_BARK_GLOBE_CENTER.v,
      1
    )
  );
  const dawnUnit = normalizeVec3(
    equirectangularToSphere(DAWN_GLOBE_CENTER.u, DAWN_GLOBE_CENTER.v, 1)
  );

  const isExcluded = (unit: Vec3): boolean => {
    if (dotVec3(unit, skypieaUnit) > Math.cos(0.018)) return true;
    if (dotVec3(unit, maryUnit) > Math.cos(0.028)) return true;
    if (dotVec3(unit, tbUnit) > Math.cos(0.024)) return true;
    if (dotVec3(unit, dawnUnit) > Math.cos(0.068)) return true;
    if (sampleHeightAt) {
      const phi = Math.atan2(unit.z, -unit.x);
      const u = ((phi / (Math.PI * 2)) % 1 + 1) % 1;
      const v = Math.acos(clamp(unit.y, -1, 1)) / Math.PI;
      if (sampleHeightAt(u, v) > 0.36) return true;
    }
    return false;
  };

  // 1. Curated East Blue / Dawn Island navigation & start-menu hero clouds
  // Keep Foosha Bay spawn sunny/cumulus while placing gray, rain, storm, and snow fronts within sailing reach.
  const refPole: Vec3 = { x: 0, y: 1, z: 0 };
  const dawnEast = normalizeVec3(crossVec3(refPole, dawnUnit));
  const dawnNorth = normalizeVec3(crossVec3(dawnUnit, dawnEast));

  const heroOffsets: Array<{
    de: number;
    dn: number;
    alt: number;
    r: number;
    h: number;
    thresh: number;
    speed: number;
    weatherType: CloudWeatherType;
  }> = [
    // Fair-weather & light shadow cumulus drifting near Foosha Bay for Start Screen & initial launch
    { de: 0.012, dn: 0.002, alt: 0.25, r: 0.22, h: 0.036, thresh: 0.01, speed: 0.0024, weatherType: 'cumulus' },
    { de: 0.022, dn: -0.009, alt: 0.26, r: 0.25, h: 0.04, thresh: 0.03, speed: 0.0021, weatherType: 'cumulus' },
    { de: 0.003, dn: 0.014, alt: 0.255, r: 0.24, h: 0.038, thresh: 0.06, speed: 0.0023, weatherType: 'gray' },
    { de: -0.014, dn: 0.032, alt: 0.285, r: 0.29, h: 0.044, thresh: 0.08, speed: 0.002, weatherType: 'rain' },
    // Horizon skyline & nearby East Blue weather fronts (gray, rain, storm, snow)
    { de: -0.072, dn: 0.056, alt: 0.275, r: 0.35, h: 0.048, thresh: 0.03, speed: 0.0018, weatherType: 'gray' },
    { de: -0.042, dn: 0.095, alt: 0.315, r: 0.38, h: 0.052, thresh: 0.05, speed: 0.0017, weatherType: 'storm' },
    { de: 0.042, dn: 0.092, alt: 0.305, r: 0.37, h: 0.05, thresh: 0.07, speed: 0.0019, weatherType: 'rain' },
    { de: -0.098, dn: -0.032, alt: 0.265, r: 0.34, h: 0.046, thresh: 0.09, speed: 0.0021, weatherType: 'snow' },
    { de: 0.082, dn: -0.042, alt: 0.295, r: 0.36, h: 0.05, thresh: 0.11, speed: 0.0018, weatherType: 'storm' },
    { de: 0.052, dn: -0.018, alt: 0.27, r: 0.31, h: 0.045, thresh: 0.12, speed: 0.002, weatherType: 'rain' },
    { de: -0.058, dn: -0.084, alt: 0.335, r: 0.41, h: 0.054, thresh: 0.22, speed: 0.0017, weatherType: 'gray' },
    { de: 0.064, dn: 0.066, alt: 0.345, r: 0.39, h: 0.052, thresh: 0.34, speed: 0.0019, weatherType: 'storm' },
    { de: 0.004, dn: -0.068, alt: 0.31, r: 0.33, h: 0.048, thresh: 0.44, speed: 0.0021, weatherType: 'snow' },
    { de: 0.095, dn: 0.028, alt: 0.29, r: 0.36, h: 0.048, thresh: 0.54, speed: 0.0018, weatherType: 'cumulus' },
  ];

  for (const h of heroOffsets) {
    const dir = normalizeVec3({
      x: dawnUnit.x + dawnEast.x * h.de + dawnNorth.x * h.dn,
      y: dawnUnit.y + dawnEast.y * h.de + dawnNorth.y * h.dn,
      z: dawnUnit.z + dawnEast.z * h.de + dawnNorth.z * h.dn,
    });
    const maxSafeH = (SKYPIEA_ALTITUDE - 0.06 - h.alt) / 0.85;
    clouds.push({
      id: clouds.length,
      weatherType: h.weatherType,
      baseDir: dir,
      orbitAxis: makeTradeWindAxis(dir, rand),
      driftSpeed: h.speed,
      altitude: clamp(h.alt, GLOBE_CLOUD_ALTITUDE_MIN, GLOBE_CLOUD_ALTITUDE_MAX),
      radius: h.r,
      heightScale: Math.max(0.02, Math.min(h.h, maxSafeH)),
      coverThreshold: h.thresh,
      yaw: rand() * Math.PI * 2,
      puffs: buildPuffsForWeather(rand, h.weatherType),
    });
  }

  // 2. Global Fibonacci sphere distribution (~465 planetary cloud banks, ~5.4x surface area)
  const candidateCount = 485;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < candidateCount; i++) {
    const t = (i + 0.5) / candidateCount;
    const yBase = 1 - 2 * t;
    const rRing = Math.sqrt(Math.max(0, 1 - yBase * yBase));
    const theta = goldenAngle * i + (rand() - 0.5) * 0.38;
    const rawDir = normalizeVec3({
      x: Math.cos(theta) * rRing + (rand() - 0.5) * 0.12,
      y: yBase + (rand() - 0.5) * 0.1,
      z: Math.sin(theta) * rRing + (rand() - 0.5) * 0.12,
    });

    if (isExcluded(rawDir)) continue;

    const weatherType = pickGlobalCloudWeather(rawDir, rand);
    const alt =
      GLOBE_CLOUD_ALTITUDE_MIN +
      rand() * (GLOBE_CLOUD_ALTITUDE_MAX - GLOBE_CLOUD_ALTITUDE_MIN);
    // ~1.58x wider radius than original (~0.22..0.44 -> ~0.35..0.69), giving ~2.5x area per cloud * ~2.2x cloud count = >5x total area
    const typeWidthBoost =
      weatherType === 'storm'
        ? 1.12
        : weatherType === 'gray' || weatherType === 'rain'
          ? 1.06
          : 1.0;
    const radius = (0.34 + rand() * 0.34) * typeWidthBoost;
    const heightScale =
      (0.038 + rand() * 0.026) * (weatherType === 'storm' ? 1.15 : 1.0);
    const maxSafeH = (SKYPIEA_ALTITUDE - 0.06 - alt) / 0.85;

    clouds.push({
      id: clouds.length,
      weatherType,
      baseDir: rawDir,
      orbitAxis: makeTradeWindAxis(rawDir, rand),
      driftSpeed: 0.0055 + rand() * 0.0095,
      altitude: alt,
      radius,
      heightScale: Math.max(0.02, Math.min(heightScale, maxSafeH)),
      coverThreshold: 0.015 + Math.pow(rand(), 1.12) * 0.885,
      yaw: rand() * Math.PI * 2,
      puffs: buildPuffsForWeather(rand, weatherType),
    });
  }

  return clouds;
}

const _scoreIndices: number[] = [];
const _scoreValues: number[] = [];

/**
 * Advances all 3D cloud positions along their trade-wind orbital axes and packs
 * the top MAX_SHADOW_CLOUD_UNIFORMS clouds closest to `focusPoint` into
 * `outShadowVec4s` and `outShadowParams` (zero heap allocations).
 */
export function stepGlobeClouds(
  clouds: readonly GlobeCloudFormation[],
  elapsed: number,
  cloudCover: number,
  globeRadius: number,
  focusPoint: Vec3,
  sunDir: Vec3,
  outTransforms: ActiveCloudTransform[],
  outShadowVec4s: CloudShadowVec4[],
  sampleHeightAt?: (u: number, v: number) => number,
  outShadowParams?: CloudShadowParamVec4[]
): number {
  const cover = clamp(cloudCover, 0, 1);
  let activeShadowCandidates = 0;

  if (_scoreIndices.length < clouds.length) {
    _scoreIndices.length = clouds.length;
    _scoreValues.length = clouds.length;
  }

  for (let i = 0; i < clouds.length; i++) {
    const c = clouds[i];
    const spec = CLOUD_WEATHER_SPECS[c.weatherType];
    let visScale =
      cover <= 0.004
        ? 0
        : smoothstep(c.coverThreshold - 0.08, c.coverThreshold + 0.14, cover);

    const angle = elapsed * c.driftSpeed;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const k = c.orbitAxis;
    const v = c.baseDir;
    const kDotV = k.x * v.x + k.y * v.y + k.z * v.z;
    const kCrossX = k.y * v.z - k.z * v.y;
    const kCrossY = k.z * v.x - k.x * v.z;
    const kCrossZ = k.x * v.y - k.y * v.x;
    const oneMinusC = 1 - cosA;

    const dirX = v.x * cosA + kCrossX * sinA + k.x * kDotV * oneMinusC;
    const dirY = v.y * cosA + kCrossY * sinA + k.y * kDotV * oneMinusC;
    const dirZ = v.z * cosA + kCrossZ * sinA + k.z * kDotV * oneMinusC;

    if (visScale > 0.01 && sampleHeightAt) {
      const phi = Math.atan2(dirZ, -dirX);
      const u = ((phi / (Math.PI * 2)) % 1 + 1) % 1;
      const vMap = Math.acos(clamp(dirY, -1, 1)) / Math.PI;
      const hNorm = sampleHeightAt(u, vMap);
      if (hNorm > 0.18) {
        visScale *= 1 - smoothstep(0.18, 0.34, hNorm);
      }
    }

    const r = globeRadius + c.altitude;
    const posX = dirX * r;
    const posY = dirY * r;
    const posZ = dirZ * r;
    const shadowRadius =
      c.radius * (0.72 + 0.36 * visScale) * (visScale > 0.02 ? 1 : 0);
    const lightning =
      c.weatherType === 'storm' && visScale > 0.15
        ? computeStormLightningIntensity(c.id, elapsed) * visScale
        : 0;
    const shadowStrength = spec.shadowStrength * visScale;
    const seaRoughness = spec.seaRoughness * visScale;

    let tr = outTransforms[i];
    if (!tr) {
      tr = {
        dirX,
        dirY,
        dirZ,
        posX,
        posY,
        posZ,
        visScale,
        shadowRadius,
        shadowStrength,
        seaRoughness,
        weatherCode: spec.code,
        lightning,
      };
      outTransforms[i] = tr;
    } else {
      tr.dirX = dirX;
      tr.dirY = dirY;
      tr.dirZ = dirZ;
      tr.posX = posX;
      tr.posY = posY;
      tr.posZ = posZ;
      tr.visScale = visScale;
      tr.shadowRadius = shadowRadius;
      tr.shadowStrength = shadowStrength;
      tr.seaRoughness = seaRoughness;
      tr.weatherCode = spec.code;
      tr.lightning = lightning;
    }

    if (visScale > 0.03) {
      // Include clouds close to the focus point even on twilight/night side so under-cloud waves remain active
      const dx = posX - focusPoint.x;
      const dy = posY - focusPoint.y;
      const dz = posZ - focusPoint.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const sunLit = dirX * sunDir.x + dirY * sunDir.y + dirZ * sunDir.z;
      if (sunLit > -0.35 || distSq < 28) {
        _scoreIndices[activeShadowCandidates] = i;
        _scoreValues[activeShadowCandidates] = distSq;
        activeShadowCandidates++;
      }
    }
  }

  const limit = Math.min(MAX_SHADOW_CLOUD_UNIFORMS, activeShadowCandidates);
  for (let s = 0; s < limit; s++) {
    let bestIdx = s;
    let bestVal = _scoreValues[s];
    for (let j = s + 1; j < activeShadowCandidates; j++) {
      if (_scoreValues[j] < bestVal) {
        bestVal = _scoreValues[j];
        bestIdx = j;
      }
    }
    if (bestIdx !== s) {
      const tmpI = _scoreIndices[s];
      _scoreIndices[s] = _scoreIndices[bestIdx];
      _scoreIndices[bestIdx] = tmpI;
      const tmpV = _scoreValues[s];
      _scoreValues[s] = _scoreValues[bestIdx];
      _scoreValues[bestIdx] = tmpV;
    }

    const tr = outTransforms[_scoreIndices[s]];
    outShadowVec4s[s].x = tr.posX;
    outShadowVec4s[s].y = tr.posY;
    outShadowVec4s[s].z = tr.posZ;
    outShadowVec4s[s].w = tr.shadowRadius;

    if (outShadowParams && outShadowParams[s]) {
      outShadowParams[s].x = tr.shadowStrength;
      outShadowParams[s].y = tr.seaRoughness;
      outShadowParams[s].z = tr.weatherCode;
      outShadowParams[s].w = tr.lightning;
    }
  }

  for (let s = limit; s < outShadowVec4s.length; s++) {
    outShadowVec4s[s].x = 0;
    outShadowVec4s[s].y = 0;
    outShadowVec4s[s].z = 0;
    outShadowVec4s[s].w = 0;
    if (outShadowParams && outShadowParams[s]) {
      outShadowParams[s].x = 0;
      outShadowParams[s].y = 0;
      outShadowParams[s].z = 0;
      outShadowParams[s].w = 0;
    }
  }

  return limit;
}

/**
 * Pure analytical ray-cloud shadow occlusion matching the GLSL ocean/terrain
 * shadow projection shader (`1.0` = unshadowed sun, lower = cloud shadow umbra).
 */
export function sampleCloudShadowAtPoint(
  point: Vec3,
  sunDir: Vec3,
  shadowClouds: readonly CloudShadowVec4[],
  shadowCount: number,
  shadowStrength = 0.56,
  shadowParams?: readonly CloudShadowParamVec4[]
): number {
  let shadow = 1;
  const count = Math.min(shadowCount, shadowClouds.length);
  for (let i = 0; i < count; i++) {
    const sc = shadowClouds[i];
    if (sc.w <= 0.001) continue;
    const tox = sc.x - point.x;
    const toy = sc.y - point.y;
    const toz = sc.z - point.z;
    const t = tox * sunDir.x + toy * sunDir.y + toz * sunDir.z;
    if (t > 0) {
      const px = tox - sunDir.x * t;
      const py = toy - sunDir.y * t;
      const pz = toz - sunDir.z * t;
      const d2 = px * px + py * py + pz * pz;
      const rOuter = sc.w * 1.16;
      if (d2 < rOuter * rOuter) {
        const distNorm = Math.sqrt(d2) / sc.w;
        const occ = 1 - smoothstep(0.56, 1.16, distNorm);
        const cloudStr = shadowParams?.[i]
          ? clamp(shadowParams[i].x, 0, 0.95)
          : shadowStrength;
        shadow = Math.min(shadow, 1 - occ * cloudStr);
      }
    }
  }
  return shadow;
}

/**
 * Samples sea agitation, shadow intensity, ship propulsion penalty, and precipitation
 * directly underneath the nearest active clouds above `worldPoint`.
 * Returns `seaRoughness = 0` and `speedFactor = 1` when sky overhead is clear.
 */
export function sampleCloudWeatherUnderPoint(
  worldPoint: Vec3,
  shadowClouds: readonly CloudShadowVec4[],
  shadowParams: readonly CloudShadowParamVec4[],
  shadowCount: number,
  globeRadius = 10
): UnderCloudWeatherSample {
  const ptLen = Math.hypot(worldPoint.x, worldPoint.y, worldPoint.z) || 1;
  const ux = worldPoint.x / ptLen;
  const uy = worldPoint.y / ptLen;
  const uz = worldPoint.z / ptLen;

  let maxRoughness = 0;
  let maxShadow = 0;
  let minSpeedFactor = 1;
  let dominantCode = -1;
  let dominantWeight = 0;
  let rainIntensity = 0;
  let snowIntensity = 0;
  let lightning = 0;

  const count = Math.min(shadowCount, shadowClouds.length, shadowParams.length);
  for (let i = 0; i < count; i++) {
    const sc = shadowClouds[i];
    const sp = shadowParams[i];
    if (sc.w <= 0.001 || sp.y <= 0.001) continue;

    const cLen = Math.hypot(sc.x, sc.y, sc.z) || 1;
    const cx = sc.x / cLen;
    const cy = sc.y / cLen;
    const cz = sc.z / cLen;

    const dot = ux * cx + uy * cy + uz * cz;
    if (dot < 0.72) continue;

    const dx = (ux - cx) * globeRadius;
    const dy = (uy - cy) * globeRadius;
    const dz = (uz - cz) * globeRadius;
    const dist = Math.hypot(dx, dy, dz);
    const rOuter = sc.w * 1.24;
    if (dist >= rOuter) continue;

    const mask = 1 - smoothstep(sc.w * 0.42, rOuter, dist);
    if (mask <= 0.005) continue;

    const localRough = sp.y * mask;
    const localShadow = sp.x * mask;
    const code = Math.round(sp.z);
    const weatherType = WEATHER_BY_CODE[code] ?? 'cumulus';
    const spec = CLOUD_WEATHER_SPECS[weatherType];

    maxRoughness = Math.max(maxRoughness, localRough);
    maxShadow = Math.max(maxShadow, localShadow);
    const effectiveSpeed = 1 - (1 - spec.shipSpeedFactor) * mask;
    minSpeedFactor = Math.min(minSpeedFactor, effectiveSpeed);

    if (localRough > dominantWeight) {
      dominantWeight = localRough;
      dominantCode = code;
    }

    if (weatherType === 'rain') {
      rainIntensity = Math.max(rainIntensity, spec.precipRate * mask);
    } else if (weatherType === 'storm') {
      rainIntensity = Math.max(rainIntensity, spec.precipRate * mask);
      lightning = Math.max(lightning, sp.w * mask);
    } else if (weatherType === 'snow') {
      snowIntensity = Math.max(snowIntensity, spec.precipRate * mask);
    }
  }

  return {
    seaRoughness: clamp(maxRoughness, 0, 1),
    shadowStrength: clamp(maxShadow, 0, 0.95),
    speedFactor: clamp(minSpeedFactor, 0.42, 1),
    weatherType:
      dominantWeight > 0.06 && dominantCode >= 0
        ? WEATHER_BY_CODE[dominantCode] ?? 'cumulus'
        : null,
    rainIntensity: clamp(rainIntensity, 0, 1),
    snowIntensity: clamp(snowIntensity, 0, 1),
    lightning: clamp(lightning, 0, 1),
  };
}

export const CLOUD_SHADOW_GLSL_PARS = `
uniform vec4 uShadowClouds[${MAX_SHADOW_CLOUD_UNIFORMS}];
uniform vec4 uShadowCloudParams[${MAX_SHADOW_CLOUD_UNIFORMS}];
uniform float uCloudShadowStrength;

float computeCloudShadow(vec3 worldPos, vec3 sunDir) {
  if (uCloudShadowStrength <= 0.001) return 1.0;
  float shadow = 1.0;
  for (int i = 0; i < ${MAX_SHADOW_CLOUD_UNIFORMS}; i++) {
    vec4 sc = uShadowClouds[i];
    if (sc.w <= 0.001) continue;
    vec3 toCloud = sc.xyz - worldPos;
    float t = dot(toCloud, sunDir);
    if (t > 0.0) {
      vec3 perp = toCloud - sunDir * t;
      float d2 = dot(perp, perp);
      float r = sc.w;
      float rOuter = r * 1.16;
      if (d2 < rOuter * rOuter) {
        float distNorm = sqrt(d2) / r;
        float occ = 1.0 - smoothstep(0.56, 1.16, distNorm);
        float cStr = clamp(uShadowCloudParams[i].x * uCloudShadowStrength, 0.0, 0.95);
        shadow = min(shadow, 1.0 - occ * cStr);
      }
    }
  }
  return shadow;
}

vec2 computeUnderCloudSeaState(vec3 unitPos, float globeRadius) {
  float maxRough = 0.0;
  float maxLightning = 0.0;
  for (int i = 0; i < ${MAX_SHADOW_CLOUD_UNIFORMS}; i++) {
    vec4 sc = uShadowClouds[i];
    vec4 sp = uShadowCloudParams[i];
    if (sc.w <= 0.001 || sp.y <= 0.001) continue;
    vec3 cDir = normalize(sc.xyz);
    if (dot(unitPos, cDir) < 0.72) continue;
    float dist = length((unitPos - cDir) * globeRadius);
    float rOuter = sc.w * 1.24;
    if (dist < rOuter) {
      float mask = 1.0 - smoothstep(sc.w * 0.42, rOuter, dist);
      maxRough = max(maxRough, sp.y * mask);
      maxLightning = max(maxLightning, sp.w * mask);
    }
  }
  return vec2(clamp(maxRough, 0.0, 1.0), clamp(maxLightning, 0.0, 1.0));
}
`;

export interface GlobeCloudSystemHandle {
  mesh: THREE.InstancedMesh;
  clouds: GlobeCloudFormation[];
  shadowUniformVec4s: THREE.Vector4[];
  shadowParamVec4s: THREE.Vector4[];
  update: (params: {
    elapsed: number;
    cloudCover: number;
    globeRadius: number;
    focusPoint: Vec3;
    sunDir: Vec3;
    daylight: number;
    isTwilight: boolean;
    skyVisibility: number;
    sampleHeightAt?: (u: number, v: number) => number;
  }) => number;
  dispose: () => void;
}

function createSculptedCumulusPuffGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 16, 12);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const lobe =
      1 +
      0.055 * Math.sin(x * 3.6 + y * 2.1) * Math.cos(z * 3.1 - y * 1.8) +
      0.03 * Math.cos(x * 5.8 - z * 4.9);
    const flatBaseY = y < 0 ? y * 0.66 : y;
    pos.setXYZ(i, x * lobe, flatBaseY * lobe, z * lobe);
  }
  geo.computeVertexNormals();
  return geo;
}

const _cloudDummy = new THREE.Object3D();
const _cloudUp = new THREE.Vector3(0, 1, 0);
const _cloudNormal = new THREE.Vector3();
const _cloudQuat = new THREE.Quaternion();
const _cloudYawQuat = new THREE.Quaternion();

/**
 * Creates the single-draw-call InstancedMesh 3D volumetric cloud system
 * with 5 distinct cloud weather types (cumulus, gray, snow, rain, thunderstorm),
 * internal lightning flashes, and progressive shadow/wave metadata.
 */
export function createGlobeCloudSystem(options: {
  isSoftwareGl: boolean;
  sampleHeightAt?: (u: number, v: number) => number;
}): GlobeCloudSystemHandle {
  const clouds = generateGlobeClouds(options.sampleHeightAt);
  let totalPuffs = 0;
  for (const c of clouds) {
    totalPuffs += c.puffs.length;
  }

  const puffGeo = createSculptedCumulusPuffGeometry();
  // x = weatherCode (0..4), y = lightningFlash (0..1)
  const weatherAttrArray = new Float32Array(totalPuffs * 2);
  const weatherAttr = new THREE.InstancedBufferAttribute(weatherAttrArray, 2);
  weatherAttr.setUsage(THREE.DynamicDrawUsage);
  puffGeo.setAttribute('aCloudWeather', weatherAttr);

  let initIdx = 0;
  for (let cIdx = 0; cIdx < clouds.length; cIdx++) {
    const c = clouds[cIdx];
    const code = CLOUD_WEATHER_SPECS[c.weatherType].code;
    for (let p = 0; p < c.puffs.length; p++) {
      weatherAttrArray[initIdx * 2] = code;
      weatherAttrArray[initIdx * 2 + 1] = 0;
      initIdx++;
    }
  }

  const cloudUniforms = {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uCloudDaylight: { value: 1.0 },
    uCloudTwilight: { value: 0.0 },
    uCloudOpacityScale: { value: 1.0 },
  };

  const puffMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.0,
    transparent: false,
    depthWrite: true,
  });

  puffMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDir = cloudUniforms.uSunDir;
    shader.uniforms.uCloudDaylight = cloudUniforms.uCloudDaylight;
    shader.uniforms.uCloudTwilight = cloudUniforms.uCloudTwilight;
    shader.uniforms.uCloudOpacityScale = cloudUniforms.uCloudOpacityScale;

    shader.vertexShader =
      `
      attribute vec2 aCloudWeather;
      varying vec3 vCloudWorldPos;
      varying vec3 vCloudWorldNormal;
      varying vec2 vCloudWeather;
      ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `
      #include <worldpos_vertex>
      vCloudWeather = aCloudWeather;
      vec4 cWPos = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        cWPos = instanceMatrix * cWPos;
      #endif
      cWPos = modelMatrix * cWPos;
      vCloudWorldPos = cWPos.xyz;

      vec3 cWNorm = objectNormal;
      #ifdef USE_INSTANCING
        cWNorm = mat3(instanceMatrix) * cWNorm;
      #endif
      vCloudWorldNormal = normalize(mat3(modelMatrix) * cWNorm);
      `
    );

    shader.fragmentShader =
      `
      uniform vec3 uSunDir;
      uniform float uCloudDaylight;
      uniform float uCloudTwilight;
      uniform float uCloudOpacityScale;
      varying vec3 vCloudWorldPos;
      varying vec3 vCloudWorldNormal;
      varying vec2 vCloudWeather;
      ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `
      #include <lights_fragment_end>
      vec3 cRadialUp = normalize(vCloudWorldPos);
      vec3 cNorm = normalize(vCloudWorldNormal);
      vec3 cSun = normalize(uSunDir);

      float topMask = smoothstep(-0.35, 0.72, dot(cNorm, cRadialUp));
      float sunFace = smoothstep(-0.35, 0.85, dot(cNorm, cSun));
      float hemisphereSun = smoothstep(-0.22, 0.35, dot(cRadialUp, cSun));
      float wCode = vCloudWeather.x;
      float flash = vCloudWeather.y;

      // 0: Cumulus (bright sunlit white + airy periwinkle belly)
      vec3 cumTop = mix(vec3(0.99, 0.995, 1.0), vec3(1.0, 0.85, 0.66), uCloudTwilight * 0.55);
      vec3 cumBelly = mix(vec3(0.68, 0.80, 0.94), vec3(0.50, 0.46, 0.66), uCloudTwilight * 0.5);

      // 1: Gray overcast cloud (silver-pewter top + muted slate base)
      vec3 grayTop = mix(vec3(0.72, 0.75, 0.79), vec3(0.74, 0.63, 0.58), uCloudTwilight * 0.42);
      vec3 grayBelly = vec3(0.38, 0.43, 0.50);

      // 2: Snow cloud (frosted pale ice-white crown + cool wintry blue-slate base)
      vec3 snowTop = mix(vec3(0.88, 0.94, 0.99), vec3(0.82, 0.80, 0.90), uCloudTwilight * 0.35);
      vec3 snowBelly = vec3(0.50, 0.58, 0.71);

      // 3: Rain cloud (heavy steel-blue crown + dark storm-slate base)
      vec3 rainTop = mix(vec3(0.49, 0.54, 0.62), vec3(0.54, 0.46, 0.52), uCloudTwilight * 0.38);
      vec3 rainBelly = vec3(0.22, 0.27, 0.35);

      // 4: Stormy rain cloud (dark charcoal-indigo cumulonimbus + ominous purple-black base)
      vec3 stormTop = mix(vec3(0.32, 0.34, 0.42), vec3(0.38, 0.30, 0.38), uCloudTwilight * 0.32);
      vec3 stormBelly = vec3(0.11, 0.13, 0.19);

      vec3 litTop = cumTop;
      vec3 coolBelly = cumBelly;
      if (wCode > 3.5) {
        litTop = stormTop;
        coolBelly = stormBelly;
      } else if (wCode > 2.5) {
        litTop = rainTop;
        coolBelly = rainBelly;
      } else if (wCode > 1.5) {
        litTop = snowTop;
        coolBelly = snowBelly;
      } else if (wCode > 0.5) {
        litTop = grayTop;
        coolBelly = grayBelly;
      }

      vec3 targetCloudColor = mix(coolBelly, litTop, clamp(topMask * 0.66 + sunFace * 0.44, 0.0, 1.0));
      vec3 nightCloud = mix(vec3(0.16, 0.23, 0.38), vec3(0.06, 0.08, 0.14), clamp(wCode * 0.25, 0.0, 1.0));
      float dayMix = clamp(hemisphereSun * (0.28 + 0.72 * uCloudDaylight), 0.14, 1.0);
      vec3 scatteredCloud = mix(nightCloud, targetCloudColor, dayMix);

      // Soft silver-lining rim (brighter on cumulus, muted on rain/storm)
      vec3 cView = normalize(cameraPosition - vCloudWorldPos);
      float rimPower = mix(0.16, 0.04, clamp(wCode * 0.25, 0.0, 1.0));
      float backLit = pow(max(0.0, dot(cView, -cSun)), 2.8) * hemisphereSun;
      scatteredCloud += vec3(1.0, 0.94, 0.80) * rimPower * backLit * uCloudDaylight;

      // Internal thunderstorm lightning flash illuminating base & core
      if (flash > 0.005) {
        float bellyGlow = mix(1.0, 0.45, topMask);
        scatteredCloud += vec3(0.72, 0.84, 1.0) * flash * bellyGlow * 1.15;
      }

      scatteredCloud *= uCloudOpacityScale;

      vec3 pbrLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
      reflectedLight.directDiffuse = mix(pbrLight * 0.25, scatteredCloud, 0.88);
      reflectedLight.indirectDiffuse = vec3(0.0);
      reflectedLight.directSpecular = vec3(0.0);
      reflectedLight.indirectSpecular = vec3(0.0);
      `
    );
  };

  const mesh = new THREE.InstancedMesh(puffGeo, puffMat, totalPuffs);
  mesh.castShadow = !options.isSoftwareGl;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;

  const activeTransforms: ActiveCloudTransform[] = [];
  const shadowUniformVec4s: THREE.Vector4[] = Array.from(
    { length: MAX_SHADOW_CLOUD_UNIFORMS },
    () => new THREE.Vector4(0, 0, 0, 0)
  );
  const shadowParamVec4s: THREE.Vector4[] = Array.from(
    { length: MAX_SHADOW_CLOUD_UNIFORMS },
    () => new THREE.Vector4(0, 0, 0, 0)
  );

  _cloudDummy.scale.set(0, 0, 0);
  _cloudDummy.updateMatrix();
  for (let i = 0; i < totalPuffs; i++) {
    mesh.setMatrixAt(i, _cloudDummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  const update: GlobeCloudSystemHandle['update'] = ({
    elapsed,
    cloudCover,
    globeRadius,
    focusPoint,
    sunDir,
    daylight,
    isTwilight,
    skyVisibility,
    sampleHeightAt,
  }) => {
    cloudUniforms.uSunDir.value.set(sunDir.x, sunDir.y, sunDir.z).normalize();
    cloudUniforms.uCloudDaylight.value = daylight;
    cloudUniforms.uCloudTwilight.value = isTwilight ? 1.0 : 0.0;
    cloudUniforms.uCloudOpacityScale.value = clamp(skyVisibility, 0.1, 1);

    const activeShadowCount = stepGlobeClouds(
      clouds,
      elapsed,
      cloudCover,
      globeRadius,
      focusPoint,
      sunDir,
      activeTransforms,
      shadowUniformVec4s,
      sampleHeightAt,
      shadowParamVec4s
    );

    const visibleOverall = skyVisibility > 0.04 && cloudCover > 0.005;
    mesh.visible = visibleOverall;
    if (!visibleOverall) {
      return 0;
    }

    let instanceIdx = 0;
    let lightningDirty = false;
    for (let cIdx = 0; cIdx < clouds.length; cIdx++) {
      const c = clouds[cIdx];
      const tr = activeTransforms[cIdx];
      const s = tr.visScale * skyVisibility;

      if (s <= 0.015) {
        _cloudDummy.position.set(0, 0, 0);
        _cloudDummy.scale.set(0, 0, 0);
        _cloudDummy.updateMatrix();
        for (let p = 0; p < c.puffs.length; p++) {
          weatherAttrArray[instanceIdx * 2 + 1] = 0;
          mesh.setMatrixAt(instanceIdx++, _cloudDummy.matrix);
        }
        continue;
      }

      _cloudNormal.set(tr.dirX, tr.dirY, tr.dirZ);
      _cloudQuat.setFromUnitVectors(_cloudUp, _cloudNormal);
      _cloudYawQuat.setFromAxisAngle(_cloudNormal, c.yaw);
      _cloudQuat.premultiply(_cloudYawQuat);

      if (tr.lightning > 0.001 || weatherAttrArray[instanceIdx * 2 + 1] > 0.001) {
        lightningDirty = true;
      }

      for (let p = 0; p < c.puffs.length; p++) {
        const puff = c.puffs[p];
        _cloudDummy.position
          .set(
            puff.ox * c.radius * s,
            puff.oy * c.heightScale * s,
            puff.oz * c.radius * s
          )
          .applyQuaternion(_cloudQuat);
        _cloudDummy.position.x += tr.posX;
        _cloudDummy.position.y += tr.posY;
        _cloudDummy.position.z += tr.posZ;
        _cloudDummy.quaternion.copy(_cloudQuat);
        _cloudDummy.scale.set(
          puff.sx * c.radius * s,
          puff.sy * c.heightScale * s,
          puff.sz * c.radius * s
        );
        _cloudDummy.updateMatrix();
        weatherAttrArray[instanceIdx * 2 + 1] = tr.lightning;
        mesh.setMatrixAt(instanceIdx++, _cloudDummy.matrix);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (lightningDirty) {
      weatherAttr.needsUpdate = true;
    }
    return activeShadowCount;
  };

  return {
    mesh,
    clouds,
    shadowUniformVec4s,
    shadowParamVec4s,
    update,
    dispose: () => {
      puffGeo.dispose();
      puffMat.dispose();
    },
  };
}

