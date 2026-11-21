import {
  ALABASTA_ANGULAR_MASK_RADIUS,
  ALABASTA_GLOBE_CENTER,
  ALABASTA_GLOBE_SCALE,
  sampleAlabastaHeight,
} from './alabastaTerrain';
import { equirectangularToSphere, type IslandLocation, type Vec3 } from './globeMath';
import {
  MARINEFORD_ANGULAR_MASK_RADIUS,
  MARINEFORD_GLOBE_CENTER,
  MARINEFORD_GLOBE_SCALE,
  sampleMarinefordHeight,
} from './marinefordTerrain';
import {
  WATER7_ANGULAR_MASK_RADIUS,
  WATER7_GLOBE_CENTER,
  WATER7_GLOBE_SCALE,
  sampleWater7Height,
} from './water7Terrain';
import {
  LOGUETOWN_ANGULAR_MASK_RADIUS,
  LOGUETOWN_GLOBE_CENTER,
  LOGUETOWN_GLOBE_SCALE,
  sampleLoguetownHeight,
} from './loguetownTerrain';
import {
  CONOMI_ANGULAR_MASK_RADIUS,
  CONOMI_GLOBE_CENTER,
  CONOMI_GLOBE_SCALE,
  sampleConomiHeight,
} from './conomiTerrain';
import {
  GECKO_ANGULAR_MASK_RADIUS,
  GECKO_GLOBE_CENTER,
  GECKO_GLOBE_SCALE,
  sampleGeckoHeight,
} from './geckoTerrain';
import {
  DAWN_ANGULAR_MASK_RADIUS,
  DAWN_GLOBE_CENTER,
  DAWN_GLOBE_SCALE,
  sampleDawnHeight,
} from './dawnTerrain';
import {
  GOAT_ANGULAR_MASK_RADIUS,
  GOAT_GLOBE_CENTER,
  GOAT_GLOBE_SCALE,
  sampleGoatHeight,
} from './goatTerrain';
import {
  SHELLS_ANGULAR_MASK_RADIUS,
  SHELLS_GLOBE_CENTER,
  SHELLS_GLOBE_SCALE,
  sampleShellsHeight,
} from './shellsTownTerrain';
import {
  ORGAN_ANGULAR_MASK_RADIUS,
  ORGAN_GLOBE_CENTER,
  ORGAN_GLOBE_SCALE,
  sampleOrganHeight,
} from './organTerrain';
import {
  BARATIE_ANGULAR_MASK_RADIUS,
  BARATIE_GLOBE_CENTER,
  BARATIE_GLOBE_SCALE,
  isLocalPointInBaratieHull,
} from './baratieTerrain';
import {
  RM_GLOBE_CENTER,
  RM_GLOBE_SCALE,
  RM_LOCAL_EXTENT,
  RM_SUMMIT_RADIUS,
  sampleReverseMountainAt,
  worldToReverseMountainLocal,
  type ReverseMountainPhase,
} from './reverseMountainTerrain';
import {
  TWIN_CAPE_ANGULAR_MASK_RADIUS,
  TWIN_CAPE_GLOBE_CENTER,
  TWIN_CAPE_GLOBE_SCALE,
  isTwinCapeSeaObstacle,
} from './twinCapeTerrain';
import {
  LITTLE_GARDEN_ANGULAR_MASK_RADIUS,
  LITTLE_GARDEN_GLOBE_CENTER,
  LITTLE_GARDEN_GLOBE_SCALE,
  sampleLittleGardenHeight,
} from './littleGardenTerrain';
import {
  CACTUS_ANGULAR_MASK_RADIUS,
  CACTUS_GLOBE_CENTER,
  CACTUS_GLOBE_SCALE,
  sampleCactusHeight,
} from './cactusTerrain';
import {
  DRUM_ANGULAR_MASK_RADIUS,
  DRUM_GLOBE_CENTER,
  DRUM_GLOBE_SCALE,
  sampleDrumHeight,
} from './drumTerrain';
import {
  JAYA_ANGULAR_MASK_RADIUS,
  JAYA_GLOBE_CENTER,
  JAYA_GLOBE_SCALE,
  sampleJayaHeight,
} from './jayaTerrain';
import {
  LONG_RING_ANGULAR_MASK_RADIUS,
  LONG_RING_FOXY_SHIP,
  LONG_RING_GLOBE_CENTER,
  LONG_RING_GLOBE_SCALE,
  sampleLongRingHeight,
} from './longRingTerrain';
import {
  ANGEL_BEACH_CENTER,
  KNOCK_UP_STREAM_CAPTURE_RADIUS,
  KNOCK_UP_STREAM_SKY_LOCAL,
  SKYPIEA_ALTITUDE,
  SKYPIEA_GLOBE_CENTER,
  SKYPIEA_GLOBE_SCALE,
  SKYPIEA_SEA_EXIT_RADIUS,
  sampleSkypieaHeight,
  sampleSkypieaWalkSurfaceHeight,
} from './skypieaTerrain';
import {
  PUCCI_GLOBE_CENTER,
  SAN_FALDO_GLOBE_CENTER,
  SHIFT_ANGULAR_MASK_RADIUS,
  SHIFT_GLOBE_CENTER,
  SHIFT_GLOBE_SCALE,
  STATION_ISLAND_ANGULAR_MASK_RADIUS,
  STATION_ISLAND_GLOBE_SCALE,
  ST_POPLAR_GLOBE_CENTER,
  samplePucciHeight,
  sampleSanFaldoHeight,
  sampleShiftHeight,
  sampleStPoplarHeight,
} from './seaTrainStationsTerrain';
import {
  ENIES_ABYSS_RADIUS,
  ENIES_ANGULAR_MASK_RADIUS,
  ENIES_GLOBE_CENTER,
  ENIES_GLOBE_SCALE,
  sampleEniesHeight,
} from './eniesLobbyTerrain';
import {
  AMAZON_LILY_ANGULAR_MASK_RADIUS,
  AMAZON_LILY_GLOBE_CENTER,
  AMAZON_LILY_GLOBE_SCALE,
  sampleAmazonLilyHeight,
} from './amazonLilyTerrain';
import {
  THRILLER_BARK_ANGULAR_MASK_RADIUS,
  THRILLER_BARK_GLOBE_CENTER,
  THRILLER_BARK_GLOBE_SCALE,
  sampleThrillerBarkHeight,
} from './thrillerBarkTerrain';
import {
  SABAODY_ANGULAR_MASK_RADIUS,
  SABAODY_GLOBE_CENTER,
  SABAODY_GLOBE_SCALE,
  SABAODY_LANDMARKS,
  sampleSabaodyHeight,
} from './sabaodyTerrain';
import {
  FISH_MAN_DEPTH,
  FISH_MAN_GLOBE_CENTER,
  FISH_MAN_GLOBE_SCALE,
  FISH_MAN_LAGOOON_EXIT_RADIUS,
  FISH_MAN_LANDMARKS,
  FISH_MAN_NEW_WORLD_EXIT_COORDS,
  SUBSEA_PLUNGE_CAPTURE_RADIUS,
  SUBSEA_PLUNGE_GLOBE_COORDS,
  isNavigableFishManWater,
  sampleFishManHeight,
} from './fishManIslandTerrain';
import {
  MARY_GEOISE_ANGULAR_MASK_RADIUS,
  MARY_GEOISE_GLOBE_CENTER,
  MARY_GEOISE_GLOBE_SCALE,
  MARY_GEOISE_LANDMARKS,
} from './maryGeoiseTerrain';
import {
  IMPEL_DOWN_ANGULAR_MASK_RADIUS,
  IMPEL_DOWN_GLOBE_SCALE,
  sampleImpelHeight,
} from './impelDownTerrain';
import {
  getEniesOrientedBasis,
  getImpelDownOrientedBasis,
  isUVInTaraiTriangle,
} from './taraiCurrentNetwork';
import {
  PUNK_HAZARD_ANGULAR_MASK_RADIUS,
  PUNK_HAZARD_GLOBE_CENTER,
  PUNK_HAZARD_GLOBE_SCALE,
  PUNK_HAZARD_LANDMARKS,
  samplePunkHazardHeight,
} from './punkHazardTerrain';
import {
  DRESSROSA_ANGULAR_MASK_RADIUS,
  DRESSROSA_GLOBE_CENTER,
  DRESSROSA_GLOBE_SCALE,
  DRESSROSA_LANDMARKS,
  DRESSROSA_SUB_LOCATIONS,
  sampleDressrosaHeight,
} from './dressrosaTerrain';
import {
  TOTTO_LAND_ANGULAR_MASK_RADIUS,
  TOTTO_LAND_GLOBE_CENTER,
  TOTTO_LAND_GLOBE_SCALE,
  TOTTO_LAND_ISLAND_BY_ID,
  TOTTO_LAND_LANDMARKS,
  TOTTO_LAND_SUB_LOCATIONS,
  sampleTottoLandHeight,
} from './tottoLandTerrain';
import {
  ZOU_ANGULAR_MASK_RADIUS,
  ZOU_GLOBE_CENTER,
  ZOU_GLOBE_SCALE,
  ZOU_LANDMARKS,
  zouSeaLegSignedDist,
} from './zouTerrain';
import {
  WANO_ANGULAR_MASK_RADIUS,
  WANO_GLOBE_CENTER,
  WANO_GLOBE_SCALE,
  WANO_LANDMARKS,
  WANO_SUB_LOCATIONS,
  wanoCliffSignedDist,
} from './wanoTerrain';
import {
  EGGHEAD_ANGULAR_MASK_RADIUS,
  EGGHEAD_GLOBE_CENTER,
  EGGHEAD_GLOBE_SCALE,
  EGGHEAD_LANDMARKS,
  EGGHEAD_SUB_LOCATIONS,
  eggheadCliffSignedDist,
} from './eggheadTerrain';
import {
  ELBAF_ANGULAR_MASK_RADIUS,
  ELBAF_GLOBE_CENTER,
  ELBAF_GLOBE_SCALE,
  ELBAF_LANDMARKS,
  ELBAF_SUB_LOCATIONS,
  elbafCliffSignedDist,
} from './elbafTerrain';

/**
 * Scaled down >= 3.3x from initial 0.024 world length so Sunny matches
 * island harbors, piers, and Sea Train viaduct proportions.
 */
export const SUNNY_WORLD_LENGTH = 0.0072;
export const SUNNY_COLLISION_RADIUS = 0.0035;

export type SunnyCameraMode = 'navigator' | 'deck' | 'overhead';
export type SunnySkyZone =
  | 'blue-sea'
  | 'knock-up-stream'
  | 'skypiea'
  | 'balloon-glide'
  | 'subsea-dive'
  | 'fish-man-island';

export interface SunnyCameraOrbit {
  yaw: number;
  pitch: number;
  distanceScale: number;
}

export const DEFAULT_SUNNY_CAMERA_ORBIT: SunnyCameraOrbit = {
  yaw: 0,
  pitch: 0,
  distanceScale: 1,
};

export interface TangentFrame {
  origin: Vec3;
  up: Vec3;
  east: Vec3;
  south: Vec3;
}

export interface SunnyCollisionEnv {
  globeRadius: number;
  sampleGlobalHeight: (u: number, v: number) => number;
  sampleCalmBelt: (u: number, v: number) => number;
  sampleCanal: (u: number, v: number) => number;
  alabasta: TangentFrame;
  water7: TangentFrame;
  marineford: TangentFrame;
  loguetown: TangentFrame;
  conomi: TangentFrame;
  gecko: TangentFrame;
  dawn: TangentFrame;
  goat: TangentFrame;
  shellsTown: TangentFrame;
  organ: TangentFrame;
  baratie: TangentFrame;
  reverseMountain: TangentFrame;
  twinCape: TangentFrame;
  littleGarden: TangentFrame;
  cactus: TangentFrame;
  drum: TangentFrame;
  jaya: TangentFrame;
  longRing: TangentFrame;
  shiftStation: TangentFrame;
  pucci: TangentFrame;
  sanFaldo: TangentFrame;
  stPoplar: TangentFrame;
  eniesLobby: TangentFrame;
  impelDown: TangentFrame;
  amazonLily: TangentFrame;
  thrillerBark: TangentFrame;
  sabaody: TangentFrame;
  maryGeoise: TangentFrame;
  fishManIsland: TangentFrame;
  punkHazard: TangentFrame;
  dressrosa: TangentFrame;
  tottoLand: TangentFrame;
  zou: TangentFrame;
  wano: TangentFrame;
  egghead: TangentFrame;
  elbaf: TangentFrame;
  skypiea: TangentFrame;
  knockUpStreamCenter: Vec3;
  subseaPlungeCenter: Vec3;
  fishManNewWorldExitCenter: Vec3;
}

export interface SunnyState {
  /** World position constrained onto sphere radius globeRadius. */
  position: Vec3;
  /** Unit tangent forward direction on the sphere surface. */
  heading: Vec3;
  /** Current radial altitude above globeRadius (e.g. Reverse Mountain, Knock Up Stream, Skypiea, or -FISH_MAN_DEPTH). */
  elevation: number;
  /** Bow pitch angle in radians (+ nose up climbing, - nose down descending). */
  pitchAngle: number;
  /** Current signed tangential speed (world units / sec). */
  speed: number;
  /** Current angular turn velocity (rad / sec) for smooth rudder feel & banking. */
  turnVelocity: number;
  /** Visual roll angle (rad) when turning. */
  bankAngle: number;
  /** True when currently touching/sliding along an island coast. */
  collided: boolean;
  /** True when Sunny hits the windless Sea King Calm Belt barrier. */
  calmBeltBlocked: boolean;
  /** True while traversing Reverse Mountain's upward or descent canals. */
  inReverseMountainCanal: boolean;
  /** Current Reverse Mountain climbing/summit/descent phase when inside the monument. */
  reverseMountainPhase: ReverseMountainPhase | null;
  /** Current sky/ocean layer: Blue Sea, Knock Up Stream, Skypiea, Balloon glide, Subsea Dive, or Fish-Man Island. */
  skyZone: SunnySkyZone;
  /** 0..1 inflation progress of the giant balloon-shaped Octopus during descent from Skypiea. */
  balloonDeploy: number;
  /** 0..1 vertical ascent progress along the Knock Up Stream water column. */
  knockUpStreamProgress: number;
  /** True once Thousand Sunny is coated in Yarukiman mangrove resin from Sabaody. */
  coated?: boolean;
  /** True when approaching the Subsea Plunge vortex without Yarukiman coating. */
  coatingRequiredBlocked?: boolean;
  /** 0..1 depth progress plunging from sea surface to -10,000m Fish-Man Island. */
  subseaDiveProgress?: number;
  /** Nearest island name/id for subtle navigator compass info. */
  nearestIsland: IslandLocation | null;
  nearestDistance: number;
}

export interface SunnyControlInput {
  throttle: number; // 0 (idle) .. +1 (forward)
  steer: number; // -1 (right) .. +1 (left)
  boost: boolean; // Coup de Burst
}

export const COUP_DE_BURST_DURATION_SEC = 3;
export const COUP_DE_BURST_COOLDOWN_SEC = 5;

export interface SunnyBoostState {
  activeRemainingSec: number;
  cooldownRemainingSec: number;
}

export function createInitialSunnyBoostState(): SunnyBoostState {
  return { activeRemainingSec: 0, cooldownRemainingSec: 0 };
}

export function canTriggerSunnyBoost(boostState: SunnyBoostState): boolean {
  return boostState.activeRemainingSec <= 0 && boostState.cooldownRemainingSec <= 0;
}

export function triggerSunnyBoost(boostState: SunnyBoostState): {
  next: SunnyBoostState;
  triggered: boolean;
} {
  if (!canTriggerSunnyBoost(boostState)) {
    return { next: boostState, triggered: false };
  }
  return {
    next: {
      activeRemainingSec: COUP_DE_BURST_DURATION_SEC,
      cooldownRemainingSec: 0,
    },
    triggered: true,
  };
}

export function stepSunnyBoostState(
  boostState: SunnyBoostState,
  dt: number
): SunnyBoostState {
  const clampedDt = Math.max(0, dt);
  if (boostState.activeRemainingSec > 0) {
    const remainingActive = boostState.activeRemainingSec - clampedDt;
    if (remainingActive > 0) {
      return {
        activeRemainingSec: remainingActive,
        cooldownRemainingSec: 0,
      };
    }
    const overshoot = Math.max(0, -remainingActive);
    return {
      activeRemainingSec: 0,
      cooldownRemainingSec: Math.max(0, COUP_DE_BURST_COOLDOWN_SEC - overshoot),
    };
  }
  if (boostState.cooldownRemainingSec > 0) {
    return {
      activeRemainingSec: 0,
      cooldownRemainingSec: Math.max(0, boostState.cooldownRemainingSec - clampedDt),
    };
  }
  return boostState;
}

export interface SunnySeaWeatherContext {
  /** Local sea agitation [0..1] directly underneath overhead clouds (0 = very calm clear sea). */
  seaRoughness?: number;
  /** Forward propulsion multiplier [0.42..1.0] under rough sea / storm headwind drag. */
  speedFactor?: number;
  /** Elapsed time in seconds for dynamic wave buffeting. */
  elapsed?: number;
}

/**
 * Equirectangular (u, v) segments for Reverse Mountain's 4 Four-Blue entry canals
 * converging at the summit (0.500, 0.500) plus the Paradise exit chute eastward.
 */
export const REVERSE_MOUNTAIN_CANAL_SEGMENTS: readonly [
  [number, number],
  [number, number],
][] = [
  // East Blue entry canal -> summit
  [
    [0.546, 0.408],
    [0.500, 0.500],
  ],
  // North Blue entry canal -> summit
  [
    [0.454, 0.408],
    [0.500, 0.500],
  ],
  // West Blue entry canal -> summit
  [
    [0.448, 0.625],
    [0.500, 0.500],
  ],
  // South Blue entry canal -> summit
  [
    [0.548, 0.620],
    [0.500, 0.500],
  ],
  // Grand Line (Paradise) exit chute -> Twin Cape waters
  [
    [0.500, 0.500],
    [0.540, 0.500],
  ],
];

export const NORTH_CALM_BELT_V = { min: 0.418, max: 0.453 } as const;
export const SOUTH_CALM_BELT_V = { min: 0.564, max: 0.600 } as const;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize3(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z);
  if (len < 1e-9) return { x: 0, y: 1, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function scale3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function add3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function sub3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function pointToSegmentDistUV(
  u: number,
  v: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return Math.hypot(u - ax, v - ay);
  const t = clamp(((u - ax) * dx + (v - ay) * dy) / lenSq, 0, 1);
  return Math.hypot(u - (ax + dx * t), v - (ay + dy * t));
}

export function buildTangentFrame(
  u: number,
  v: number,
  globeRadius: number
): TangentFrame {
  const origin = equirectangularToSphere(u, v, globeRadius);
  const up = normalize3(origin);
  const pEast = equirectangularToSphere((u + 0.001) % 1, v, globeRadius);
  const eastRaw = sub3(pEast, origin);
  const east = normalize3(sub3(eastRaw, scale3(up, dot3(eastRaw, up))));
  const south = normalize3(cross3(east, up));
  return { origin, up, east, south };
}

export function createDefaultSunnyCollisionEnv(
  globeRadius = 10,
  sampleGlobalHeight: (u: number, v: number) => number = () => 0,
  sampleCalmBelt?: (u: number, v: number) => number,
  sampleCanal?: (u: number, v: number) => number
): SunnyCollisionEnv {
  const skypieaFrame = buildTangentFrame(
    SKYPIEA_GLOBE_CENTER.u,
    SKYPIEA_GLOBE_CENTER.v,
    globeRadius
  );
  const skyOriginAtAltitude = scale3(
    skypieaFrame.up,
    globeRadius + SKYPIEA_ALTITUDE
  );
  const knockUpStreamCenter = scale3(
    normalize3(
      add3(
        skyOriginAtAltitude,
        add3(
          scale3(
            skypieaFrame.east,
            KNOCK_UP_STREAM_SKY_LOCAL.x * SKYPIEA_GLOBE_SCALE
          ),
          scale3(
            skypieaFrame.south,
            KNOCK_UP_STREAM_SKY_LOCAL.z * SKYPIEA_GLOBE_SCALE
          )
        )
      )
    ),
    globeRadius
  );

  const subseaPlungeCenter = equirectangularToSphere(
    SUBSEA_PLUNGE_GLOBE_COORDS.u,
    SUBSEA_PLUNGE_GLOBE_COORDS.v,
    globeRadius
  );
  const fishManNewWorldExitCenter = equirectangularToSphere(
    FISH_MAN_NEW_WORLD_EXIT_COORDS.u,
    FISH_MAN_NEW_WORLD_EXIT_COORDS.v,
    globeRadius
  );

  return {
    globeRadius,
    sampleGlobalHeight,
    sampleCalmBelt:
      sampleCalmBelt ??
      ((u, v) => {
        if (isUVInReverseMountainCanal(u, v)) return 0;
        const inNorth =
          v >= NORTH_CALM_BELT_V.min && v <= NORTH_CALM_BELT_V.max;
        const inSouth =
          v >= SOUTH_CALM_BELT_V.min && v <= SOUTH_CALM_BELT_V.max;
        return inNorth || inSouth ? 1 : 0;
      }),
    sampleCanal:
      sampleCanal ?? ((u, v) => (isUVInReverseMountainCanal(u, v) ? 1 : 0)),
    alabasta: buildTangentFrame(
      ALABASTA_GLOBE_CENTER.u,
      ALABASTA_GLOBE_CENTER.v,
      globeRadius
    ),
    water7: buildTangentFrame(
      WATER7_GLOBE_CENTER.u,
      WATER7_GLOBE_CENTER.v,
      globeRadius
    ),
    marineford: buildTangentFrame(
      MARINEFORD_GLOBE_CENTER.u,
      MARINEFORD_GLOBE_CENTER.v,
      globeRadius
    ),
    loguetown: buildTangentFrame(
      LOGUETOWN_GLOBE_CENTER.u,
      LOGUETOWN_GLOBE_CENTER.v,
      globeRadius
    ),
    conomi: buildTangentFrame(
      CONOMI_GLOBE_CENTER.u,
      CONOMI_GLOBE_CENTER.v,
      globeRadius
    ),
    gecko: buildTangentFrame(
      GECKO_GLOBE_CENTER.u,
      GECKO_GLOBE_CENTER.v,
      globeRadius
    ),
    dawn: buildTangentFrame(
      DAWN_GLOBE_CENTER.u,
      DAWN_GLOBE_CENTER.v,
      globeRadius
    ),
    goat: buildTangentFrame(
      GOAT_GLOBE_CENTER.u,
      GOAT_GLOBE_CENTER.v,
      globeRadius
    ),
    shellsTown: buildTangentFrame(
      SHELLS_GLOBE_CENTER.u,
      SHELLS_GLOBE_CENTER.v,
      globeRadius
    ),
    organ: buildTangentFrame(
      ORGAN_GLOBE_CENTER.u,
      ORGAN_GLOBE_CENTER.v,
      globeRadius
    ),
    baratie: buildTangentFrame(
      BARATIE_GLOBE_CENTER.u,
      BARATIE_GLOBE_CENTER.v,
      globeRadius
    ),
    reverseMountain: buildTangentFrame(
      RM_GLOBE_CENTER.u,
      RM_GLOBE_CENTER.v,
      globeRadius
    ),
    twinCape: buildTangentFrame(
      TWIN_CAPE_GLOBE_CENTER.u,
      TWIN_CAPE_GLOBE_CENTER.v,
      globeRadius
    ),
    littleGarden: buildTangentFrame(
      LITTLE_GARDEN_GLOBE_CENTER.u,
      LITTLE_GARDEN_GLOBE_CENTER.v,
      globeRadius
    ),
    cactus: buildTangentFrame(
      CACTUS_GLOBE_CENTER.u,
      CACTUS_GLOBE_CENTER.v,
      globeRadius
    ),
    drum: buildTangentFrame(
      DRUM_GLOBE_CENTER.u,
      DRUM_GLOBE_CENTER.v,
      globeRadius
    ),
    jaya: buildTangentFrame(
      JAYA_GLOBE_CENTER.u,
      JAYA_GLOBE_CENTER.v,
      globeRadius
    ),
    longRing: buildTangentFrame(
      LONG_RING_GLOBE_CENTER.u,
      LONG_RING_GLOBE_CENTER.v,
      globeRadius
    ),
    shiftStation: buildTangentFrame(
      SHIFT_GLOBE_CENTER.u,
      SHIFT_GLOBE_CENTER.v,
      globeRadius
    ),
    pucci: buildTangentFrame(
      PUCCI_GLOBE_CENTER.u,
      PUCCI_GLOBE_CENTER.v,
      globeRadius
    ),
    sanFaldo: buildTangentFrame(
      SAN_FALDO_GLOBE_CENTER.u,
      SAN_FALDO_GLOBE_CENTER.v,
      globeRadius
    ),
    stPoplar: buildTangentFrame(
      ST_POPLAR_GLOBE_CENTER.u,
      ST_POPLAR_GLOBE_CENTER.v,
      globeRadius
    ),
    eniesLobby: getEniesOrientedBasis(globeRadius),
    impelDown: getImpelDownOrientedBasis(globeRadius),
    amazonLily: buildTangentFrame(
      AMAZON_LILY_GLOBE_CENTER.u,
      AMAZON_LILY_GLOBE_CENTER.v,
      globeRadius
    ),
    thrillerBark: buildTangentFrame(
      THRILLER_BARK_GLOBE_CENTER.u,
      THRILLER_BARK_GLOBE_CENTER.v,
      globeRadius
    ),
    sabaody: buildTangentFrame(
      SABAODY_GLOBE_CENTER.u,
      SABAODY_GLOBE_CENTER.v,
      globeRadius
    ),
    maryGeoise: buildTangentFrame(
      MARY_GEOISE_GLOBE_CENTER.u,
      MARY_GEOISE_GLOBE_CENTER.v,
      globeRadius
    ),
    fishManIsland: buildTangentFrame(
      FISH_MAN_GLOBE_CENTER.u,
      FISH_MAN_GLOBE_CENTER.v,
      globeRadius
    ),
    punkHazard: buildTangentFrame(
      PUNK_HAZARD_GLOBE_CENTER.u,
      PUNK_HAZARD_GLOBE_CENTER.v,
      globeRadius
    ),
    dressrosa: buildTangentFrame(
      DRESSROSA_GLOBE_CENTER.u,
      DRESSROSA_GLOBE_CENTER.v,
      globeRadius
    ),
    tottoLand: buildTangentFrame(
      TOTTO_LAND_GLOBE_CENTER.u,
      TOTTO_LAND_GLOBE_CENTER.v,
      globeRadius
    ),
    zou: buildTangentFrame(
      ZOU_GLOBE_CENTER.u,
      ZOU_GLOBE_CENTER.v,
      globeRadius
    ),
    wano: buildTangentFrame(
      WANO_GLOBE_CENTER.u,
      WANO_GLOBE_CENTER.v,
      globeRadius
    ),
    egghead: buildTangentFrame(
      EGGHEAD_GLOBE_CENTER.u,
      EGGHEAD_GLOBE_CENTER.v,
      globeRadius
    ),
    elbaf: buildTangentFrame(
      ELBAF_GLOBE_CENTER.u,
      ELBAF_GLOBE_CENTER.v,
      globeRadius
    ),
    skypiea: skypieaFrame,
    knockUpStreamCenter,
    subseaPlungeCenter,
    fishManNewWorldExitCenter,
  };
}

export function worldPosToEquirectangular(pos: Vec3): { u: number; v: number } {
  const n = normalize3(pos);
  const theta = Math.acos(clamp(n.y, -1, 1));
  let phi = Math.atan2(n.z, -n.x);
  if (phi < 0) phi += Math.PI * 2;
  return {
    u: phi / (Math.PI * 2),
    v: theta / Math.PI,
  };
}

/**
 * Returns true if (u, v) lies inside one of Reverse Mountain's 4 Four-Blue
 * entry canals, the summit junction, or the Paradise exit chute.
 */
export function isUVInReverseMountainCanal(
  u: number,
  v: number,
  env?: Pick<SunnyCollisionEnv, 'sampleCanal'>
): boolean {
  if (Math.abs(u - 0.5) > 0.068 || Math.abs(v - 0.5) > 0.145) {
    return false;
  }
  for (const [[ax, ay], [bx, by]] of REVERSE_MOUNTAIN_CANAL_SEGMENTS) {
    if (pointToSegmentDistUV(u, v, ax, ay, bx, by) <= 0.0115) {
      return true;
    }
  }
  if (env && env.sampleCanal(u, v) > 0.28) {
    return true;
  }
  return false;
}

/**
 * Checks whether (u, v) lies inside the impassable North or South Calm Belt
 * (windless Sea King bands). Reverse Mountain canals cut through safely.
 */
export function isUVInCalmBelt(
  u: number,
  v: number,
  env?: Pick<SunnyCollisionEnv, 'sampleCalmBelt' | 'sampleCanal'>
): boolean {
  if (isUVInReverseMountainCanal(u, v, env)) {
    return false;
  }
  if (isUVInTaraiTriangle(u, v)) {
    return false;
  }
  // Red Line continental mass handles its own land collision
  const inCentralRedLine = Math.abs(u - 0.5) < 0.036;
  const inAntiMeridianRedLine = u < 0.022 || u > 0.978;
  if (inCentralRedLine || inAntiMeridianRedLine) {
    return false;
  }

  if (
    (v >= NORTH_CALM_BELT_V.min && v <= NORTH_CALM_BELT_V.max) ||
    (v >= SOUTH_CALM_BELT_V.min && v <= SOUTH_CALM_BELT_V.max)
  ) {
    return true;
  }

  if (
    env &&
    ((v >= 0.412 && v <= 0.456) || (v >= 0.562 && v <= 0.605)) &&
    env.sampleCalmBelt(u, v) > 0.44
  ) {
    return true;
  }

  return false;
}

export function isWorldPointCalmBelt(
  worldPos: Vec3,
  env: SunnyCollisionEnv
): boolean {
  const { u, v } = worldPosToEquirectangular(worldPos);
  return isUVInCalmBelt(u, v, env);
}

/**
 * Checks whether a single point on the globe surface is solid island land / seawall / cliff.
 */
export function isWorldPointLandCollision(
  worldPos: Vec3,
  env: SunnyCollisionEnv
): boolean {
  const unitPos = normalize3(worldPos);

  // 1. Marineford exact local heightmap (lets Sunny sail into Oris Bay & collide with seawalls)
  const angMf = Math.acos(clamp(dot3(unitPos, env.marineford.up), -1, 1));
  if (angMf < MARINEFORD_ANGULAR_MASK_RADIUS) {
    const dMf = sub3(worldPos, env.marineford.origin);
    const lx = dot3(dMf, env.marineford.east) / MARINEFORD_GLOBE_SCALE;
    const lz = dot3(dMf, env.marineford.south) / MARINEFORD_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 138) {
      return sampleMarinefordHeight(lx, lz) > 0.14;
    }
    return false;
  }

  // 2. Water 7 exact local heightmap (collides cleanly with outer seawall & viaduct)
  const angW7 = Math.acos(clamp(dot3(unitPos, env.water7.up), -1, 1));
  if (angW7 < WATER7_ANGULAR_MASK_RADIUS) {
    const dW7 = sub3(worldPos, env.water7.origin);
    const lx = dot3(dW7, env.water7.east) / WATER7_GLOBE_SCALE;
    const lz = dot3(dW7, env.water7.south) / WATER7_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 118) {
      return sampleWater7Height(lx, lz) > 0.15;
    }
    return false;
  }

  // 3. Alabasta exact local heightmap (navigable Sandora River, collides with desert shores)
  const angAl = Math.acos(clamp(dot3(unitPos, env.alabasta.up), -1, 1));
  if (angAl < ALABASTA_ANGULAR_MASK_RADIUS) {
    const dAl = sub3(worldPos, env.alabasta.origin);
    const lx = dot3(dAl, env.alabasta.east) / ALABASTA_GLOBE_SCALE;
    const lz = dot3(dAl, env.alabasta.south) / ALABASTA_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 140) {
      return sampleAlabastaHeight(lx, lz) > 0.14;
    }
    return false;
  }

  // 3A. Loguetown exact local heightmap (lets Sunny approach piers & collide with beaches/walls)
  const angLt = Math.acos(clamp(dot3(unitPos, env.loguetown.up), -1, 1));
  if (angLt < LOGUETOWN_ANGULAR_MASK_RADIUS) {
    const dLt = sub3(worldPos, env.loguetown.origin);
    const lx = dot3(dLt, env.loguetown.east) / LOGUETOWN_GLOBE_SCALE;
    const lz = dot3(dLt, env.loguetown.south) / LOGUETOWN_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 118) {
      return sampleLoguetownHeight(lx, lz) > 0.15;
    }
    return false;
  }

  // 3A2. Conomi Islands exact local heightmap (Arlong Bay, Cocoyashi shore & Gosa Cove)
  const angCn = Math.acos(clamp(dot3(unitPos, env.conomi.up), -1, 1));
  if (angCn < CONOMI_ANGULAR_MASK_RADIUS) {
    const dCn = sub3(worldPos, env.conomi.origin);
    const lx = dot3(dCn, env.conomi.east) / CONOMI_GLOBE_SCALE;
    const lz = dot3(dCn, env.conomi.south) / CONOMI_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 138) {
      return sampleConomiHeight(lx, lz) > 0.15;
    }
    return false;
  }

  // 3A3. Gecko Islands exact local heightmap (Black Cat Cove, Syrup beaches & Honey Town quay)
  const angGk = Math.acos(clamp(dot3(unitPos, env.gecko.up), -1, 1));
  if (angGk < GECKO_ANGULAR_MASK_RADIUS) {
    const dGk = sub3(worldPos, env.gecko.origin);
    const lx = dot3(dGk, env.gecko.east) / GECKO_GLOBE_SCALE;
    const lz = dot3(dGk, env.gecko.south) / GECKO_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 138) {
      return sampleGeckoHeight(lx, lz) > 0.15;
    }
    return false;
  }

  // 3A4. Dawn Island exact local heightmap (Foosha Crescent Bay, Goa Royal Harbor & Mt. Colubo)
  const angDw = Math.acos(clamp(dot3(unitPos, env.dawn.up), -1, 1));
  if (angDw < DAWN_ANGULAR_MASK_RADIUS) {
    const dDw = sub3(worldPos, env.dawn.origin);
    const lx = dot3(dDw, env.dawn.east) / DAWN_GLOBE_SCALE;
    const lz = dot3(dDw, env.dawn.south) / DAWN_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 138) {
      return sampleDawnHeight(lx, lz) > 0.15;
    }
    return false;
  }

  // 3A5. Goat Island exact local heightmap (East Hideout Cove & Rocky Capes)
  const angGt = Math.acos(clamp(dot3(unitPos, env.goat.up), -1, 1));
  if (angGt < GOAT_ANGULAR_MASK_RADIUS) {
    const dGt = sub3(worldPos, env.goat.origin);
    const lx = dot3(dGt, env.goat.east) / GOAT_GLOBE_SCALE;
    const lz = dot3(dGt, env.goat.south) / GOAT_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 138) {
      return sampleGoatHeight(lx, lz) > 0.15;
    }
    return false;
  }

  // 3A6. Shells Town & Marine Base G-153 exact local heightmap
  const angSt = Math.acos(clamp(dot3(unitPos, env.shellsTown.up), -1, 1));
  if (angSt < SHELLS_ANGULAR_MASK_RADIUS) {
    const dSt = sub3(worldPos, env.shellsTown.origin);
    const lx = dot3(dSt, env.shellsTown.east) / SHELLS_GLOBE_SCALE;
    const lz = dot3(dSt, env.shellsTown.south) / SHELLS_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 110) {
      return sampleShellsHeight(lx, lz) > 0.15;
    }
    return false;
  }

  // 3A7. Organ Island & Orange Town exact local heightmap (harbor quay & coastlines)
  const angOrg = Math.acos(clamp(dot3(unitPos, env.organ.up), -1, 1));
  if (angOrg < ORGAN_ANGULAR_MASK_RADIUS) {
    const dOrg = sub3(worldPos, env.organ.origin);
    const lx = dot3(dOrg, env.organ.east) / ORGAN_GLOBE_SCALE;
    const lz = dot3(dOrg, env.organ.south) / ORGAN_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 115) {
      return sampleOrganHeight(lx, lz) > 0.15;
    }
    return false;
  }

  // 3A8. Baratie floating restaurant ship hull & deployed battle fins
  const angBar = Math.acos(clamp(dot3(unitPos, env.baratie.up), -1, 1));
  if (angBar < BARATIE_ANGULAR_MASK_RADIUS) {
    const dBar = sub3(worldPos, env.baratie.origin);
    const lx = dot3(dBar, env.baratie.east) / BARATIE_GLOBE_SCALE;
    const lz = dot3(dBar, env.baratie.south) / BARATIE_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 34) {
      return isLocalPointInBaratieHull(lx, lz);
    }
    return false;
  }

  // 3A9. Twin Cape flanking promontories & Laboon in Grand Line exit bay (keeps center channel open)
  const angTc = Math.acos(clamp(dot3(unitPos, env.twinCape.up), -1, 1));
  if (angTc < TWIN_CAPE_ANGULAR_MASK_RADIUS) {
    const dTc = sub3(worldPos, env.twinCape.origin);
    const lx = dot3(dTc, env.twinCape.east) / TWIN_CAPE_GLOBE_SCALE;
    const lz = dot3(dTc, env.twinCape.south) / TWIN_CAPE_GLOBE_SCALE;
    if (isTwinCapeSeaObstacle(lx, lz)) {
      return true;
    }
  }

  // 3A10. Little Garden exact local heightmap (oval prehistoric coasts & NE Crescent Bay)
  const angLg = Math.acos(clamp(dot3(unitPos, env.littleGarden.up), -1, 1));
  if (angLg < LITTLE_GARDEN_ANGULAR_MASK_RADIUS) {
    const dLg = sub3(worldPos, env.littleGarden.origin);
    const lx = dot3(dLg, env.littleGarden.east) / LITTLE_GARDEN_GLOBE_SCALE;
    const lz = dot3(dLg, env.littleGarden.south) / LITTLE_GARDEN_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 92) {
      return sampleLittleGardenHeight(lx, lz) > 0.15;
    }
    return false;
  }

  // 3A11. Cactus Island (Whisky Peak) exact local heightmap (navigable central south bay, rocky coasts)
  const angCc = Math.acos(clamp(dot3(unitPos, env.cactus.up), -1, 1));
  if (angCc < CACTUS_ANGULAR_MASK_RADIUS) {
    const dCc = sub3(worldPos, env.cactus.origin);
    const lx = dot3(dCc, env.cactus.east) / CACTUS_GLOBE_SCALE;
    const lz = dot3(dCc, env.cactus.south) / CACTUS_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 92) {
      return sampleCactusHeight(lx, lz) > 0.15;
    }
    return false;
  }

  // 3A12. Drum Island exact local heightmap (navigable southern harbor cove, icy shores)
  const angDr = Math.acos(clamp(dot3(unitPos, env.drum.up), -1, 1));
  if (angDr < DRUM_ANGULAR_MASK_RADIUS) {
    const dDr = sub3(worldPos, env.drum.origin);
    const lx = dot3(dDr, env.drum.east) / DRUM_GLOBE_SCALE;
    const lz = dot3(dDr, env.drum.south) / DRUM_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 105) {
      return sampleDrumHeight(lx, lz) > 0.15;
    }
    return false;
  }

  // 3A13. Jaya Island exact local heightmap (navigable Mouth Bay harbor, West/East coasts & islets)
  const angJy = Math.acos(clamp(dot3(unitPos, env.jaya.up), -1, 1));
  if (angJy < JAYA_ANGULAR_MASK_RADIUS) {
    const dJy = sub3(worldPos, env.jaya.origin);
    const lx = dot3(dJy, env.jaya.east) / JAYA_GLOBE_SCALE;
    const lz = dot3(dJy, env.jaya.south) / JAYA_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 112) {
      return sampleJayaHeight(lx, lz) > 0.15;
    }
    return false;
  }

  // 3A14. Long Ring Long Land: 10 distinct islands separated by navigable high-tide channels + moored Sexy Foxy flagship
  const angLr = Math.acos(clamp(dot3(unitPos, env.longRing.up), -1, 1));
  if (angLr < LONG_RING_ANGULAR_MASK_RADIUS) {
    const dLr = sub3(worldPos, env.longRing.origin);
    const lx = dot3(dLr, env.longRing.east) / LONG_RING_GLOBE_SCALE;
    const lz = dot3(dLr, env.longRing.south) / LONG_RING_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 116) {
      if (sampleLongRingHeight(lx, lz) > 1.05) {
        return true;
      }
      if (
        Math.hypot(lx - LONG_RING_FOXY_SHIP.x, lz - LONG_RING_FOXY_SHIP.z) <
        LONG_RING_FOXY_SHIP.collisionRadius
      ) {
        return true;
      }
    }
    return false;
  }

  // 3A15. Shift Station twin platforms
  const angSh = Math.acos(clamp(dot3(unitPos, env.shiftStation.up), -1, 1));
  if (angSh < SHIFT_ANGULAR_MASK_RADIUS) {
    const dSh = sub3(worldPos, env.shiftStation.origin);
    const lx = dot3(dSh, env.shiftStation.east) / SHIFT_GLOBE_SCALE;
    const lz = dot3(dSh, env.shiftStation.south) / SHIFT_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 42) {
      return sampleShiftHeight(lx, lz) > 0.5;
    }
    return false;
  }

  // 3A16. Pucci Island gourmet headland & harbor quay
  const angPc = Math.acos(clamp(dot3(unitPos, env.pucci.up), -1, 1));
  if (angPc < STATION_ISLAND_ANGULAR_MASK_RADIUS) {
    const dPc = sub3(worldPos, env.pucci.origin);
    const lx = dot3(dPc, env.pucci.east) / STATION_ISLAND_GLOBE_SCALE;
    const lz = dot3(dPc, env.pucci.south) / STATION_ISLAND_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 58) {
      return samplePucciHeight(lx, lz) > 1.35;
    }
    return false;
  }

  // 3A17. San Faldo Carnival Island & harbor quay
  const angSf = Math.acos(clamp(dot3(unitPos, env.sanFaldo.up), -1, 1));
  if (angSf < STATION_ISLAND_ANGULAR_MASK_RADIUS) {
    const dSf = sub3(worldPos, env.sanFaldo.origin);
    const lx = dot3(dSf, env.sanFaldo.east) / STATION_ISLAND_GLOBE_SCALE;
    const lz = dot3(dSf, env.sanFaldo.south) / STATION_ISLAND_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 58) {
      return sampleSanFaldoHeight(lx, lz) > 1.35;
    }
    return false;
  }

  // 3A18. St. Poplar Spring Island & harbor quay
  const angSp = Math.acos(clamp(dot3(unitPos, env.stPoplar.up), -1, 1));
  if (angSp < STATION_ISLAND_ANGULAR_MASK_RADIUS) {
    const dSp = sub3(worldPos, env.stPoplar.origin);
    const lx = dot3(dSp, env.stPoplar.east) / STATION_ISLAND_GLOBE_SCALE;
    const lz = dot3(dSp, env.stPoplar.south) / STATION_ISLAND_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 58) {
      return sampleStPoplarHeight(lx, lz) > 1.35;
    }
    return false;
  }

  // 3A19. Enies Lobby 360° waterfall abyss rim, Front Ferry Pier & Bridge of Hesitation
  const angEl = Math.acos(clamp(dot3(unitPos, env.eniesLobby.up), -1, 1));
  if (angEl < ENIES_ANGULAR_MASK_RADIUS) {
    const dEl = sub3(worldPos, env.eniesLobby.origin);
    const lx = dot3(dEl, env.eniesLobby.east) / ENIES_GLOBE_SCALE;
    const lz = dot3(dEl, env.eniesLobby.south) / ENIES_GLOBE_SCALE;
    const rEl = Math.hypot(lx, lz);
    if (rEl < ENIES_ABYSS_RADIUS + 2.2) {
      return true;
    }
    if (rEl < 118) {
      return sampleEniesHeight(lx, lz) > 0.6;
    }
    return false;
  }

  // 3A20. Amazon Lily steep volcanic crater mountain & coastal cliffs (fortified SE port cove stays navigable)
  const angAlily = Math.acos(clamp(dot3(unitPos, env.amazonLily.up), -1, 1));
  if (angAlily < AMAZON_LILY_ANGULAR_MASK_RADIUS) {
    const dAlily = sub3(worldPos, env.amazonLily.origin);
    const lx = dot3(dAlily, env.amazonLily.east) / AMAZON_LILY_GLOBE_SCALE;
    const lz = dot3(dAlily, env.amazonLily.south) / AMAZON_LILY_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 126) {
      return sampleAmazonLilyHeight(lx, lz) > 0.25;
    }
    return false;
  }

  // 3A21. Thriller Bark world's largest ship-island hull ring, lagoon pier, ramparts & central island (South Mouth sea channel stays navigable)
  const angTb = Math.acos(clamp(dot3(unitPos, env.thrillerBark.up), -1, 1));
  if (angTb < THRILLER_BARK_ANGULAR_MASK_RADIUS) {
    const dTb = sub3(worldPos, env.thrillerBark.origin);
    const lx = dot3(dTb, env.thrillerBark.east) / THRILLER_BARK_GLOBE_SCALE;
    const lz = dot3(dTb, env.thrillerBark.south) / THRILLER_BARK_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 130) {
      return sampleThrillerBarkHeight(lx, lz) > 0.25;
    }
    return false;
  }

  // 3A21B. Sabaody Archipelago 79 Yarukiman grove islets (lagoons and southern Coating Port approach remain navigable)
  const angSab = Math.acos(clamp(dot3(unitPos, env.sabaody.up), -1, 1));
  if (angSab < SABAODY_ANGULAR_MASK_RADIUS) {
    const dSab = sub3(worldPos, env.sabaody.origin);
    const lx = dot3(dSab, env.sabaody.east) / SABAODY_GLOBE_SCALE;
    const lz = dot3(dSab, env.sabaody.south) / SABAODY_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 126) {
      return sampleSabaodyHeight(lx, lz) > 0.22;
    }
    return false;
  }

  // 3A21C. Punk Hazard split Ice & Burning Lands (central demarcation strait & northern bay remain navigable)
  const angPh = Math.acos(clamp(dot3(unitPos, env.punkHazard.up), -1, 1));
  if (angPh < PUNK_HAZARD_ANGULAR_MASK_RADIUS) {
    const dPh = sub3(worldPos, env.punkHazard.origin);
    const lx = dot3(dPh, env.punkHazard.east) / PUNK_HAZARD_GLOBE_SCALE;
    const lz = dot3(dPh, env.punkHazard.south) / PUNK_HAZARD_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 126) {
      return samplePunkHazardHeight(lx, lz) > 0.2;
    }
    return false;
  }

  // 3A21D. Dressrosa & Green Bit archipelago (southern Acacia harbor bay & Iron Bridge strait remain navigable)
  const angDrs = Math.acos(clamp(dot3(unitPos, env.dressrosa.up), -1, 1));
  if (angDrs < DRESSROSA_ANGULAR_MASK_RADIUS) {
    const dDrs = sub3(worldPos, env.dressrosa.origin);
    const lx = dot3(dDrs, env.dressrosa.east) / DRESSROSA_GLOBE_SCALE;
    const lz = dot3(dDrs, env.dressrosa.south) / DRESSROSA_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 168) {
      return sampleDressrosaHeight(lx, lz) > 0.2;
    }
    return false;
  }

  // 3A21E. Totto Land 35-island archipelago (Sweet City crescent harbor & ocean rings remain navigable)
  const angTl = Math.acos(clamp(dot3(unitPos, env.tottoLand.up), -1, 1));
  if (angTl < TOTTO_LAND_ANGULAR_MASK_RADIUS) {
    const dTl = sub3(worldPos, env.tottoLand.origin);
    const lx = dot3(dTl, env.tottoLand.east) / TOTTO_LAND_GLOBE_SCALE;
    const lz = dot3(dTl, env.tottoLand.south) / TOTTO_LAND_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 640) {
      return sampleTottoLandHeight(lx, lz) > 0.2;
    }
    return false;
  }

  // 3A21F. Zou (Zunesha's 4 colossal ocean-standing legs collide at sea level)
  const angZou = Math.acos(clamp(dot3(unitPos, env.zou.up), -1, 1));
  if (angZou < ZOU_ANGULAR_MASK_RADIUS) {
    const dZou = sub3(worldPos, env.zou.origin);
    const lx = dot3(dZou, env.zou.east) / ZOU_GLOBE_SCALE;
    const lz = dot3(dZou, env.zou.south) / ZOU_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 160) {
      return zouSeaLegSignedDist(lx, lz) < 0;
    }
    return false;
  }

  // 3A21G. Wano Kuni sheer sea cliffs & Onigashima island collide at sea level
  const angWano = Math.acos(clamp(dot3(unitPos, env.wano.up), -1, 1));
  if (angWano < WANO_ANGULAR_MASK_RADIUS) {
    const dWano = sub3(worldPos, env.wano.origin);
    const lx = dot3(dWano, env.wano.east) / WANO_GLOBE_SCALE;
    const lz = dot3(dWano, env.wano.south) / WANO_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 185) {
      return wanoCliffSignedDist(lx, lz) < 0;
    }
    return false;
  }

  // 3A21H. Egghead Island sea cliffs & fortified harbor breakwaters collide at sea level
  const angEgg = Math.acos(clamp(dot3(unitPos, env.egghead.up), -1, 1));
  if (angEgg < EGGHEAD_ANGULAR_MASK_RADIUS) {
    const dEgg = sub3(worldPos, env.egghead.origin);
    const lx = dot3(dEgg, env.egghead.east) / EGGHEAD_GLOBE_SCALE;
    const lz = dot3(dEgg, env.egghead.south) / EGGHEAD_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 130) {
      return eggheadCliffSignedDist(lx, lz) < 0;
    }
    return false;
  }

  // 3A21I. Elbaf Underworld rocky fjord cliffs & Viking breakwater piers collide at sea level
  const angElb = Math.acos(clamp(dot3(unitPos, env.elbaf.up), -1, 1));
  if (angElb < ELBAF_ANGULAR_MASK_RADIUS) {
    const dElb = sub3(worldPos, env.elbaf.origin);
    const lx = dot3(dElb, env.elbaf.east) / ELBAF_GLOBE_SCALE;
    const lz = dot3(dElb, env.elbaf.south) / ELBAF_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 145) {
      return elbafCliffSignedDist(lx, lz) < 0;
    }
    return false;
  }

  // 3A22. Impel Down concentric stone fortress rings, twin gatehouse, stone Tarai bridge & Marine transit port
  const angId = Math.acos(clamp(dot3(unitPos, env.impelDown.up), -1, 1));
  if (angId < IMPEL_DOWN_ANGULAR_MASK_RADIUS) {
    const dId = sub3(worldPos, env.impelDown.origin);
    const lx = dot3(dId, env.impelDown.east) / IMPEL_DOWN_GLOBE_SCALE;
    const lz = dot3(dId, env.impelDown.south) / IMPEL_DOWN_GLOBE_SCALE;
    if (Math.hypot(lx, lz) < 118) {
      return sampleImpelHeight(lx, lz) > 0.18;
    }
    return false;
  }

  // 3A23. Mary Geoise & East Red Port Harbor (sheer Red Line East cliff + sea-level piers; East harbor bay stays navigable)
  const angMg = Math.acos(clamp(dot3(unitPos, env.maryGeoise.up), -1, 1));
  if (angMg < MARY_GEOISE_ANGULAR_MASK_RADIUS + 0.028) {
    const dMg = sub3(worldPos, env.maryGeoise.origin);
    const lx = dot3(dMg, env.maryGeoise.east) / MARY_GEOISE_GLOBE_SCALE;
    const lz = dot3(dMg, env.maryGeoise.south) / MARY_GEOISE_GLOBE_SCALE;
    const rpZ = MARY_GEOISE_LANDMARKS.redPortUpperGate.z;
    if (lx >= 106 && lx <= 240 && Math.abs(lz - rpZ) < 88) {
      if (lx <= 146) {
        return true;
      }
      if (lx <= 180 && Math.abs(lz - rpZ) <= 36) {
        return true;
      }
      if (
        lx <= 199 &&
        (Math.abs(lz - (rpZ - 29)) <= 5 || Math.abs(lz - (rpZ + 29)) <= 5)
      ) {
        return true;
      }
      return false;
    }
  }

  // 3B. Reverse Mountain sculpted 3D canyon walls & 5 climbing/descending waterways
  const rmLocal = worldToReverseMountainLocal(worldPos, env.reverseMountain);
  if (
    rmLocal &&
    Math.abs(rmLocal.lx) <= RM_LOCAL_EXTENT - 4 &&
    Math.abs(rmLocal.lz) <= RM_LOCAL_EXTENT - 4
  ) {
    const rmSample = sampleReverseMountainAt(rmLocal.lx, rmLocal.lz);
    if (rmSample.inCanalOrSummit) {
      return false;
    }
    const rRm = Math.hypot(rmLocal.lx, rmLocal.lz);
    if (rRm < 138) {
      return rmSample.rockY > rmSample.waterY + 1.2;
    }
  }

  const { u, v } = worldPosToEquirectangular(worldPos);

  // Reverse Mountain's 4 entry canals & Paradise chute remain navigable water
  if (isUVInReverseMountainCanal(u, v, env)) {
    return false;
  }

  // Keep open ocean clear inside the Knock Up Stream eruption basin off Jaya
  if (
    Math.hypot(
      worldPos.x - env.knockUpStreamCenter.x,
      worldPos.y - env.knockUpStreamCenter.y,
      worldPos.z - env.knockUpStreamCenter.z
    ) <=
    KNOCK_UP_STREAM_CAPTURE_RADIUS * 1.35
  ) {
    return false;
  }

  // Keep Paradise Subsea Plunge Vortex navigable open sea right off Red Line
  if (
    Math.hypot(
      worldPos.x - env.subseaPlungeCenter.x,
      worldPos.y - env.subseaPlungeCenter.y,
      worldPos.z - env.subseaPlungeCenter.z
    ) <=
    SUBSEA_PLUNGE_CAPTURE_RADIUS * 1.45
  ) {
    return false;
  }

  // 4. Global planetary terrain heightmap (all other islands + Red Line)
  return env.sampleGlobalHeight(u, v) >= 0.06;
}

/**
 * Projects a sphere-surface position onto Skypiea's local tangent coordinates at sky altitude.
 */
export function worldToSkypieaLocal(
  worldPos: Vec3,
  skypieaFrame: TangentFrame,
  globeRadius = 10
): { lx: number; lz: number } {
  const skyRadius = globeRadius + SKYPIEA_ALTITUDE;
  const skyPos = scale3(normalize3(worldPos), skyRadius);
  const skyOrigin = scale3(skypieaFrame.up, skyRadius);
  const dSky = sub3(skyPos, skyOrigin);
  return {
    lx: dot3(dSky, skypieaFrame.east) / SKYPIEA_GLOBE_SCALE,
    lz: dot3(dSky, skypieaFrame.south) / SKYPIEA_GLOBE_SCALE,
  };
}

function skypieaLocalToSpherePoint(
  lx: number,
  lz: number,
  skypieaFrame: TangentFrame,
  globeRadius: number
): Vec3 {
  const skyOrigin = scale3(skypieaFrame.up, globeRadius + SKYPIEA_ALTITUDE);
  const skyPt = add3(
    skyOrigin,
    add3(
      scale3(skypieaFrame.east, lx * SKYPIEA_GLOBE_SCALE),
      scale3(skypieaFrame.south, lz * SKYPIEA_GLOBE_SCALE)
    )
  );
  return scale3(normalize3(skyPt), globeRadius);
}

/**
 * Checks whether a single point at Skypiea altitude collides with Skypiea land, cliffs, islets, or Angel Pier.
 * Angel Bay and the outer White-White Sea cloud rim remain open navigable water.
 */
export function isSkypieaPointLandCollision(
  worldPos: Vec3,
  env: SunnyCollisionEnv
): boolean {
  const unitPos = normalize3(worldPos);
  if (dot3(unitPos, env.skypiea.up) < 0.85) return false;
  const { lx, lz } = worldToSkypieaLocal(worldPos, env.skypiea, env.globeRadius);
  if (Math.hypot(lx, lz) > 155) return false;
  return sampleSkypieaWalkSurfaceHeight(lx, lz) > 0.35;
}

/**
 * Probes an 8-point hull ring at Skypiea sky-sea level to slide smoothly around Angel Bay,
 * Angel Beach, islets, and Angel Pier.
 */
export function probeSkypieaHullCollision(
  worldPos: Vec3,
  env: SunnyCollisionEnv,
  hullRadius = SUNNY_COLLISION_RADIUS
): { hit: boolean; pushOutDir: Vec3 } {
  const up = normalize3(worldPos);
  const refVec = Math.abs(up.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const tanA = normalize3(cross3(refVec, up));
  const tanB = normalize3(cross3(up, tanA));

  let hitCount = 0;
  let accumX = 0;
  let accumY = 0;
  let accumZ = 0;

  if (isSkypieaPointLandCollision(worldPos, env)) {
    hitCount++;
  }

  const samples = 8;
  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * Math.PI * 2;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const offset = add3(scale3(tanA, ca * hullRadius), scale3(tanB, sa * hullRadius));
    const samplePos = scale3(normalize3(add3(worldPos, offset)), env.globeRadius);
    if (isSkypieaPointLandCollision(samplePos, env)) {
      hitCount++;
      accumX -= offset.x;
      accumY -= offset.y;
      accumZ -= offset.z;
    }
  }

  if (hitCount === 0) {
    return { hit: false, pushOutDir: { x: 0, y: 0, z: 0 } };
  }

  let push = { x: accumX, y: accumY, z: accumZ };
  push = sub3(push, scale3(up, dot3(push, up)));
  const pushLen = Math.hypot(push.x, push.y, push.z);
  if (pushLen < 1e-6) {
    return { hit: true, pushOutDir: tanA };
  }
  return { hit: true, pushOutDir: scale3(push, 1 / pushLen) };
}

/**
 * Projects a sphere-surface position onto Fish-Man Island's local tangent coordinates at -10,000 m depth.
 */
export function worldToFishManLocal(
  worldPos: Vec3,
  fishManFrame: TangentFrame,
  globeRadius = 10
): { lx: number; lz: number } {
  const fmiR = globeRadius - FISH_MAN_DEPTH;
  const fmiPos = scale3(normalize3(worldPos), fmiR);
  const fmiOrigin = scale3(fishManFrame.up, fmiR);
  const dFmi = sub3(fmiPos, fmiOrigin);
  return {
    lx: dot3(dFmi, fishManFrame.east) / FISH_MAN_GLOBE_SCALE,
    lz: dot3(dFmi, fishManFrame.south) / FISH_MAN_GLOBE_SCALE,
  };
}

function fishManLocalToSpherePoint(
  lx: number,
  lz: number,
  fishManFrame: TangentFrame,
  globeRadius: number
): Vec3 {
  const fmiOrigin = scale3(fishManFrame.up, globeRadius - FISH_MAN_DEPTH);
  const fmiPt = add3(
    fmiOrigin,
    add3(
      scale3(fishManFrame.east, lx * FISH_MAN_GLOBE_SCALE),
      scale3(fishManFrame.south, lz * FISH_MAN_GLOBE_SCALE)
    )
  );
  return scale3(normalize3(fmiPt), globeRadius);
}

export function isFishManLagoonPointBlocked(
  worldPos: Vec3,
  env: SunnyCollisionEnv
): boolean {
  const unitPos = normalize3(worldPos);
  if (dot3(unitPos, env.fishManIsland.up) < 0.85) return false;
  const { lx, lz } = worldToFishManLocal(worldPos, env.fishManIsland, env.globeRadius);
  const r = Math.hypot(lx, lz);
  // Allow exiting south through Main Entrance Water-Lock Gate (abs(lx) < 12, lz >= 64)
  if (lz > 64 && Math.abs(lx) < 14 && r < 92) return false;
  if (r > FISH_MAN_LAGOOON_EXIT_RADIUS + 8) return true;
  if (isNavigableFishManWater(lx, lz)) return false;
  return sampleFishManHeight(lx, lz) > 0.25;
}

export function probeFishManHullCollision(
  worldPos: Vec3,
  env: SunnyCollisionEnv,
  hullRadius = SUNNY_COLLISION_RADIUS
): { hit: boolean; pushOutDir: Vec3 } {
  const up = normalize3(worldPos);
  const refVec = Math.abs(up.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const tanA = normalize3(cross3(refVec, up));
  const tanB = normalize3(cross3(up, tanA));

  let hitCount = 0;
  let accumX = 0;
  let accumY = 0;
  let accumZ = 0;

  if (isFishManLagoonPointBlocked(worldPos, env)) {
    hitCount++;
  }

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const offset = add3(scale3(tanA, ca * hullRadius), scale3(tanB, sa * hullRadius));
    const samplePos = scale3(normalize3(add3(worldPos, offset)), env.globeRadius);
    if (isFishManLagoonPointBlocked(samplePos, env)) {
      hitCount++;
      accumX -= offset.x;
      accumY -= offset.y;
      accumZ -= offset.z;
    }
  }

  if (hitCount === 0) {
    return { hit: false, pushOutDir: { x: 0, y: 0, z: 0 } };
  }
  let push = { x: accumX, y: accumY, z: accumZ };
  push = sub3(push, scale3(up, dot3(push, up)));
  const pushLen = Math.hypot(push.x, push.y, push.z);
  if (pushLen < 1e-6) return { hit: true, pushOutDir: tanA };
  return { hit: true, pushOutDir: scale3(push, 1 / pushLen) };
}

export function applyYarukimanCoating(state: SunnyState): SunnyState {
  return {
    ...state,
    coated: true,
    coatingRequiredBlocked: false,
  };
}

export function triggerFishManPlunge(
  state: SunnyState,
  env: SunnyCollisionEnv
): SunnyState {
  const coatedState = applyYarukimanCoating(state);
  const startPos = scale3(normalize3(env.subseaPlungeCenter), env.globeRadius);
  const up = normalize3(startPos);
  const gatePos = fishManLocalToSpherePoint(
    FISH_MAN_LANDMARKS.mainEntranceGate.x,
    FISH_MAN_LANDMARKS.mainEntranceGate.z,
    env.fishManIsland,
    env.globeRadius
  );
  const toGateRaw = sub3(gatePos, startPos);
  const heading = normalize3(sub3(toGateRaw, scale3(up, dot3(toGateRaw, up))));
  return {
    ...coatedState,
    position: startPos,
    heading,
    elevation: -0.02,
    pitchAngle: -0.45,
    speed: 0.14,
    turnVelocity: 0,
    bankAngle: 0,
    collided: false,
    calmBeltBlocked: false,
    inReverseMountainCanal: false,
    reverseMountainPhase: null,
    skyZone: 'subsea-dive',
    subseaDiveProgress: 0.04,
  };
}

export function resurfaceToNewWorld(
  state: SunnyState,
  env: SunnyCollisionEnv,
  locations: readonly IslandLocation[] = []
): SunnyState {
  const exitPos = scale3(normalize3(env.fishManNewWorldExitCenter), env.globeRadius);
  const up = normalize3(exitPos);
  const eastRaw = env.fishManIsland.east;
  const heading = normalize3(sub3(eastRaw, scale3(up, dot3(eastRaw, up))));
  const nearest =
    locations.length > 0
      ? findNearestChartedIsland(exitPos, locations, env.globeRadius)
      : { island: state.nearestIsland, distance: state.nearestDistance };
  return {
    ...state,
    position: exitPos,
    heading,
    elevation: 0,
    pitchAngle: 0,
    speed: 0.08,
    turnVelocity: 0,
    bankAngle: 0,
    collided: false,
    calmBeltBlocked: false,
    inReverseMountainCanal: false,
    reverseMountainPhase: null,
    skyZone: 'blue-sea',
    balloonDeploy: 0,
    knockUpStreamProgress: 0,
    coated: false,
    subseaDiveProgress: 0,
    coatingRequiredBlocked: false,
    nearestIsland: nearest.island,
    nearestDistance: nearest.distance,
  };
}

/**
 * Probes an 8-point hull ring of radius `hullRadius` around `worldPos`.
 * Returns whether any part of the hull hits land, plus a tangent push-out normal pointing to sea.
 */
export function probeHullCollision(
  worldPos: Vec3,
  env: SunnyCollisionEnv,
  hullRadius = SUNNY_COLLISION_RADIUS
): { hit: boolean; pushOutDir: Vec3 } {
  const up = normalize3(worldPos);
  const refVec = Math.abs(up.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const tanA = normalize3(cross3(refVec, up));
  const tanB = normalize3(cross3(up, tanA));

  let hitCount = 0;
  let accumX = 0;
  let accumY = 0;
  let accumZ = 0;

  if (isWorldPointLandCollision(worldPos, env)) {
    hitCount++;
  }

  const samples = 8;
  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * Math.PI * 2;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const offset = add3(scale3(tanA, ca * hullRadius), scale3(tanB, sa * hullRadius));
    const samplePos = scale3(normalize3(add3(worldPos, offset)), env.globeRadius);
    if (isWorldPointLandCollision(samplePos, env)) {
      hitCount++;
      accumX -= offset.x;
      accumY -= offset.y;
      accumZ -= offset.z;
    }
  }

  if (hitCount === 0) {
    return { hit: false, pushOutDir: { x: 0, y: 0, z: 0 } };
  }

  let push = { x: accumX, y: accumY, z: accumZ };
  push = sub3(push, scale3(up, dot3(push, up)));
  const pushLen = Math.hypot(push.x, push.y, push.z);
  if (pushLen < 1e-6) {
    return { hit: true, pushOutDir: tanA };
  }
  return { hit: true, pushOutDir: scale3(push, 1 / pushLen) };
}

/**
 * Probes whether Sunny is touching or entering the Calm Belt and returns a tangent
 * push-out direction pointing back out of the Calm Belt band into open sea.
 */
export function probeCalmBeltBarrier(
  worldPos: Vec3,
  env: SunnyCollisionEnv,
  hullRadius = SUNNY_COLLISION_RADIUS
): { blocked: boolean; pushOutDir: Vec3 } {
  const up = normalize3(worldPos);
  const poleRef = Math.abs(up.y) < 0.995 ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: -1 };
  const north = normalize3(sub3(poleRef, scale3(up, dot3(poleRef, up))));
  const east = normalize3(cross3(north, up));

  const checkOffsets: [number, number][] = [
    [0, 0],
    [0, hullRadius],
    [0, -hullRadius],
    [hullRadius, 0],
    [-hullRadius, 0],
  ];

  let hitCalm = false;
  let accumN = 0;
  let accumE = 0;

  for (const [oe, on] of checkOffsets) {
    const pt = scale3(
      normalize3(add3(worldPos, add3(scale3(east, oe), scale3(north, on)))),
      env.globeRadius
    );
    if (isWorldPointCalmBelt(pt, env)) {
      hitCalm = true;
      accumE -= oe;
      accumN -= on;
    }
  }

  if (!hitCalm) {
    return { blocked: false, pushOutDir: { x: 0, y: 0, z: 0 } };
  }

  if (Math.hypot(accumE, accumN) < 1e-7) {
    // Center point is inside Calm Belt: push toward closest open sea edge (North/South of the Calm Belt band)
    const { v } = worldPosToEquirectangular(worldPos);
    if (v < 0.5) {
      // North Calm Belt [0.418..0.453]: push toward nearer open sea
      const dirN = v < 0.4355 ? 1 : -1;
      accumN = dirN;
    } else {
      // South Calm Belt [0.564..0.600]
      const dirN = v < 0.582 ? 1 : -1;
      accumN = dirN;
    }
  }

  const push = normalize3(add3(scale3(north, accumN), scale3(east, accumE)));
  return { blocked: true, pushOutDir: push };
}

/**
 * Finds the nearest charted island to a position on the sphere.
 */
export function findNearestChartedIsland(
  worldPos: Vec3,
  locations: readonly IslandLocation[],
  globeRadius: number,
  includeSky = false
): { island: IslandLocation | null; distance: number } {
  let bestIsland: IslandLocation | null = null;
  let bestDist = Infinity;

  for (const loc of locations) {
    if (!includeSky && loc.elevationTier === 'sky') continue;
    if (includeSky && loc.elevationTier !== 'sky') continue;
    const p = equirectangularToSphere(loc.u, loc.v, globeRadius);
    const d = Math.hypot(p.x - worldPos.x, p.y - worldPos.y, p.z - worldPos.z);
    if (d < bestDist) {
      bestDist = d;
      bestIsland = loc;
    }
  }
  return { island: bestIsland, distance: bestDist };
}

function sampleReverseMountainMotion(
  worldPos: Vec3,
  heading: Vec3,
  env: SunnyCollisionEnv
): {
  inCanal: boolean;
  phase: ReverseMountainPhase | null;
  elevation: number;
  pitchAngle: number;
  flowDir: Vec3;
  rLocal: number;
} {
  const local = worldToReverseMountainLocal(worldPos, env.reverseMountain);
  if (!local) {
    return {
      inCanal: false,
      phase: null,
      elevation: 0,
      pitchAngle: 0,
      flowDir: heading,
      rLocal: 999,
    };
  }
  const s = sampleReverseMountainAt(local.lx, local.lz);
  if (!s.inCanalOrSummit) {
    return {
      inCanal: false,
      phase: null,
      elevation: 0,
      pitchAngle: 0,
      flowDir: heading,
      rLocal: Math.hypot(local.lx, local.lz),
    };
  }

  const up = normalize3(worldPos);
  const flowRaw = add3(
    scale3(env.reverseMountain.east, s.flowX),
    scale3(env.reverseMountain.south, s.flowZ)
  );
  const flowTan = normalize3(sub3(flowRaw, scale3(up, dot3(flowRaw, up))));

  const elevHere = s.waterY * RM_GLOBE_SCALE;
  const probeStep = SUNNY_WORLD_LENGTH * 2.2;
  const aheadPos = scale3(
    normalize3(add3(worldPos, scale3(heading, probeStep))),
    env.globeRadius
  );
  const aheadLocal = worldToReverseMountainLocal(aheadPos, env.reverseMountain);
  let elevAhead = elevHere;
  if (aheadLocal) {
    const sAhead = sampleReverseMountainAt(aheadLocal.lx, aheadLocal.lz);
    elevAhead = (sAhead.inCanalOrSummit ? sAhead.waterY : sAhead.waterY) * RM_GLOBE_SCALE;
  }
  const pitchAngle = clamp(
    Math.atan2(elevAhead - elevHere, probeStep),
    -0.68,
    0.68
  );

  return {
    inCanal: true,
    phase: s.phase,
    elevation: elevHere,
    pitchAngle,
    flowDir: flowTan,
    rLocal: Math.hypot(local.lx, local.lz),
  };
}

/**
 * Steps Thousand Sunny sailing physics across the spherical ocean for `dt` seconds,
 * enforcing accurate island coastline collisions, Calm Belt barrier blocking,
 * Reverse Mountain currents, Knock Up Stream vertical elevator ascent to Skypiea,
 * Skypiea White-White Sea sailing, and Giant Octopus Balloon glide descent.
 */
export function stepSunnySailing(
  state: SunnyState,
  input: SunnyControlInput,
  dt: number,
  env: SunnyCollisionEnv,
  locations: readonly IslandLocation[] = [],
  weather?: SunnySeaWeatherContext
): SunnyState {
  const clampedDt = Math.min(0.08, Math.max(0.001, dt));
  const up = normalize3(state.position);
  const skyZone: SunnySkyZone = state.skyZone ?? 'blue-sea';
  let coated = Boolean(state.coated);

  // Project heading strictly onto local tangent plane
  let heading = sub3(state.heading, scale3(up, dot3(state.heading, up)));
  heading = normalize3(heading);

  const rawThrottle = clamp(input.throttle, 0, 1);
  const throttle = input.boost ? Math.max(rawThrottle, 1) : rawThrottle;

  // ---------------------------------------------------------------------------
  // STATE A0: SUBSEA PLUNGE CURRENT DESCENT (Paradise -> -10,000m Fish-Man Gate)
  // ---------------------------------------------------------------------------
  if (skyZone === 'subsea-dive') {
    const entryGateWorld = fishManLocalToSpherePoint(
      FISH_MAN_LANDMARKS.mainEntranceGate.x,
      FISH_MAN_LANDMARKS.mainEntranceGate.z + 10,
      env.fishManIsland,
      env.globeRadius
    );
    const startDiveWorld = scale3(normalize3(env.subseaPlungeCenter), env.globeRadius);
    const prevProgress = clamp(state.subseaDiveProgress ?? 0.05, 0, 1);
    const diveRate = 0.28 + (throttle > 0 ? 0.12 : 0) + (input.boost ? 0.24 : 0);
    const nextProgress = Math.min(1, prevProgress + diveRate * clampedDt);
    const smoothT = nextProgress * nextProgress * (3 - 2 * nextProgress);

    const nextPos = scale3(
      normalize3(
        add3(
          scale3(startDiveWorld, 1 - smoothT),
          scale3(entryGateWorld, smoothT)
        )
      ),
      env.globeRadius
    );
    const newUp = normalize3(nextPos);
    const lagoonCenter = fishManLocalToSpherePoint(
      FISH_MAN_LANDMARKS.coralLagoonEntry.x,
      FISH_MAN_LANDMARKS.coralLagoonEntry.z,
      env.fishManIsland,
      env.globeRadius
    );
    const toGateRaw = sub3(lagoonCenter, nextPos);
    const toGateTan = normalize3(sub3(toGateRaw, scale3(newUp, dot3(toGateRaw, newUp))));
    const alignAlpha = 1 - Math.exp(-5.0 * clampedDt);
    heading = normalize3(
      add3(scale3(heading, 1 - alignAlpha), scale3(toGateTan, alignAlpha))
    );
    heading = normalize3(sub3(heading, scale3(newUp, dot3(heading, newUp))));

    const nextElevation = -FISH_MAN_DEPTH * smoothT;
    const pitchSlope = -0.44 * (1 - Math.pow(nextProgress, 2));
    const nextPitch =
      state.pitchAngle + (pitchSlope - state.pitchAngle) * (1 - Math.exp(-8 * clampedDt));

    if (nextProgress >= 1 - 1e-4) {
      const arrivalPos = fishManLocalToSpherePoint(
        FISH_MAN_LANDMARKS.coralLagoonEntry.x,
        48,
        env.fishManIsland,
        env.globeRadius
      );
      const arrivalUp = normalize3(arrivalPos);
      const northTarget = fishManLocalToSpherePoint(
        FISH_MAN_LANDMARKS.coralHills.x,
        FISH_MAN_LANDMARKS.coralHills.z,
        env.fishManIsland,
        env.globeRadius
      );
      const rawNorth = sub3(northTarget, arrivalPos);
      const arrivalHeading = normalize3(
        sub3(rawNorth, scale3(arrivalUp, dot3(rawNorth, arrivalUp)))
      );
      const fmiLoc =
        locations.find((l) => l.id === 'fish-man-island') ??
        findNearestChartedIsland(arrivalPos, locations, env.globeRadius).island;
      return {
        position: arrivalPos,
        heading: arrivalHeading,
        elevation: -FISH_MAN_DEPTH,
        pitchAngle: 0,
        speed: 0.065,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'fish-man-island',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        coated: true,
        coatingRequiredBlocked: false,
        subseaDiveProgress: 1,
        nearestIsland: fmiLoc,
        nearestDistance: 0,
      };
    }

    const fmiLoc =
      locations.find((l) => l.id === 'fish-man-island') ?? state.nearestIsland;
    return {
      position: nextPos,
      heading,
      elevation: nextElevation,
      pitchAngle: nextPitch,
      speed: 0.14,
      turnVelocity: 0,
      bankAngle: Math.sin(nextProgress * Math.PI * 3) * 0.07,
      collided: false,
      calmBeltBlocked: false,
      inReverseMountainCanal: false,
      reverseMountainPhase: null,
      skyZone: 'subsea-dive',
      balloonDeploy: 0,
      knockUpStreamProgress: 0,
      coated: true,
      coatingRequiredBlocked: false,
      subseaDiveProgress: nextProgress,
      nearestIsland: fmiLoc,
      nearestDistance: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // STATE A1: FISH-MAN ISLAND CORAL LAGOON SAILING (-10,000m UNDERSEA GROTTO)
  // ---------------------------------------------------------------------------
  if (skyZone === 'fish-man-island') {
    const targetTurn = clamp(input.steer, -1, 1) * 1.85;
    const turnAlpha = 1 - Math.exp(-9.0 * clampedDt);
    const nextTurnVel =
      state.turnVelocity + (targetTurn - state.turnVelocity) * turnAlpha;

    if (Math.abs(nextTurnVel) > 1e-4) {
      const angle = nextTurnVel * clampedDt;
      const right = normalize3(cross3(heading, up));
      heading = normalize3(
        add3(scale3(heading, Math.cos(angle)), scale3(right, -Math.sin(angle)))
      );
    }

    const maxForward = input.boost ? 0.19 : 0.075;
    const targetSpeed = throttle > 0 ? throttle * maxForward : 0;
    const accelRate = throttle > 0 ? (input.boost ? 6.2 : 3.8) : 2.6;
    const speedAlpha = 1 - Math.exp(-accelRate * clampedDt);
    let nextSpeed = Math.max(0, state.speed + (targetSpeed - state.speed) * speedAlpha);

    let nextPos = add3(state.position, scale3(heading, nextSpeed * clampedDt));
    nextPos = scale3(normalize3(nextPos), env.globeRadius);

    let collided = false;
    const fmiProbe = probeFishManHullCollision(nextPos, env, SUNNY_COLLISION_RADIUS);
    if (fmiProbe.hit) {
      collided = true;
      const velVec = scale3(heading, nextSpeed);
      const inwardDot = dot3(velVec, fmiProbe.pushOutDir);
      if (inwardDot < 0) {
        const slideVel = sub3(
          velVec,
          scale3(fmiProbe.pushOutDir, inwardDot * 1.05)
        );
        const slideStep = Math.hypot(slideVel.x, slideVel.y, slideVel.z);
        const slidePos = scale3(
          normalize3(
            add3(
              state.position,
              add3(
                scale3(slideVel, clampedDt),
                scale3(fmiProbe.pushOutDir, SUNNY_COLLISION_RADIUS * 0.45)
              )
            )
          ),
          env.globeRadius
        );
        if (!probeFishManHullCollision(slidePos, env, SUNNY_COLLISION_RADIUS).hit) {
          nextPos = slidePos;
          nextSpeed = Math.min(nextSpeed, slideStep * (nextSpeed >= 0 ? 1 : -1));
        } else {
          nextPos = state.position;
          nextSpeed *= 0.2;
        }
      }
    }

    const newUp = normalize3(nextPos);
    heading = normalize3(sub3(heading, scale3(newUp, dot3(heading, newUp))));
    const targetBank =
      -nextTurnVel * clamp(Math.abs(nextSpeed) * 5.0, 0.2, 1.0) * 0.14;
    const bankAngle =
      state.bankAngle + (targetBank - state.bankAngle) * (1 - Math.exp(-7.5 * clampedDt));
    const nextPitch =
      state.pitchAngle + (0 - state.pitchAngle) * (1 - Math.exp(-10 * clampedDt));

    const { lx, lz } = worldToFishManLocal(nextPos, env.fishManIsland, env.globeRadius);
    if (lz > FISH_MAN_LAGOOON_EXIT_RADIUS + 6 && Math.abs(lx) < 16) {
      return resurfaceToNewWorld(
        {
          ...state,
          position: nextPos,
          heading,
          coated: false,
        },
        env,
        locations
      );
    }

    const fmiLoc =
      locations.find((l) => l.id === 'fish-man-island') ?? state.nearestIsland;
    return {
      position: nextPos,
      heading,
      elevation: -FISH_MAN_DEPTH,
      pitchAngle: nextPitch,
      speed: nextSpeed,
      turnVelocity: nextTurnVel,
      bankAngle,
      collided,
      calmBeltBlocked: false,
      inReverseMountainCanal: false,
      reverseMountainPhase: null,
      skyZone: 'fish-man-island',
      balloonDeploy: 0,
      knockUpStreamProgress: 0,
      coated: true,
      coatingRequiredBlocked: false,
      subseaDiveProgress: 1,
      nearestIsland: fmiLoc,
      nearestDistance: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // STATE A: KNOCK UP STREAM VERTICAL WATER ELEVATOR (Blue Sea -> Angel Bay)
  // ---------------------------------------------------------------------------
  if (skyZone === 'knock-up-stream') {
    const centerPos = scale3(normalize3(env.knockUpStreamCenter), env.globeRadius);
    const centerUp = normalize3(centerPos);
    // Ride on the forward/outer crest of the Knock Up Stream rather than hidden deep inside the core cylinder
    const beachWorld = skypieaLocalToSpherePoint(
      ANGEL_BEACH_CENTER.x,
      ANGEL_BEACH_CENTER.z,
      env.skypiea,
      env.globeRadius
    );
    const rawDelta = sub3(beachWorld, centerPos);
    const beachDirTan = normalize3(
      sub3(rawDelta, scale3(centerUp, dot3(rawDelta, centerUp)))
    );
    const rightTan = normalize3(cross3(beachDirTan, centerUp));
    const crestRidePos = scale3(
      normalize3(
        add3(
          centerPos,
          add3(scale3(beachDirTan, -0.014), scale3(rightTan, 0.018))
        )
      ),
      env.globeRadius
    );
    const pullAlpha = 1 - Math.exp(-7.5 * clampedDt);
    let nextPos = scale3(
      normalize3(
        add3(
          scale3(state.position, 1 - pullAlpha),
          scale3(crestRidePos, pullAlpha)
        )
      ),
      env.globeRadius
    );
    const newUp = normalize3(nextPos);

    // Orient Sunny smoothly toward Angel Beach across Angel Bay during ascent
    const toBeachRaw = sub3(beachWorld, nextPos);
    const toBeachTan = normalize3(sub3(toBeachRaw, scale3(newUp, dot3(toBeachRaw, newUp))));
    const alignAlpha = 1 - Math.exp(-3.8 * clampedDt);
    heading = normalize3(
      add3(scale3(heading, 1 - alignAlpha), scale3(toBeachTan, alignAlpha))
    );
    heading = normalize3(sub3(heading, scale3(newUp, dot3(heading, newUp))));

    const climbRate =
      0.24 + (throttle > 0 ? 0.08 : 0) + (input.boost ? 0.16 : 0);
    const nextElevation = Math.min(SKYPIEA_ALTITUDE, state.elevation + climbRate * clampedDt);
    const progress = clamp(nextElevation / SKYPIEA_ALTITUDE, 0, 1);

    // Pitch nose upward riding the vertical jet, easing horizontal level as Sunny crests into Angel Bay
    const crestEase = progress > 0.84 ? (1 - progress) / 0.16 : 1;
    const targetPitch = 0.56 * crestEase;
    const nextPitch =
      state.pitchAngle + (targetPitch - state.pitchAngle) * (1 - Math.exp(-8 * clampedDt));
    const bankAlpha = 1 - Math.exp(-6 * clampedDt);
    const bankAngle =
      state.bankAngle + (Math.sin(progress * Math.PI * 5) * 0.08 - state.bankAngle) * bankAlpha;

    // Cresting into Skypiea's Angel Bay directly in front of Angel Beach & Angel Pier
    if (nextElevation >= SKYPIEA_ALTITUDE - 1e-4) {
      const arrivalLocalX = 12;
      const arrivalLocalZ = 76;
      const arrivalPos = skypieaLocalToSpherePoint(
        arrivalLocalX,
        arrivalLocalZ,
        env.skypiea,
        env.globeRadius
      );
      const arrivalUp = normalize3(arrivalPos);
      const beachDirRaw = sub3(
        skypieaLocalToSpherePoint(
          ANGEL_BEACH_CENTER.x,
          ANGEL_BEACH_CENTER.z,
          env.skypiea,
          env.globeRadius
        ),
        arrivalPos
      );
      const arrivalHeading = normalize3(
        sub3(beachDirRaw, scale3(arrivalUp, dot3(beachDirRaw, arrivalUp)))
      );
      const nearestSky = findNearestChartedIsland(
        arrivalPos,
        locations,
        env.globeRadius,
        true
      );
      return {
        position: arrivalPos,
        heading: arrivalHeading,
        elevation: SKYPIEA_ALTITUDE,
        pitchAngle: 0,
        speed: 0.075,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'skypiea',
        balloonDeploy: 0,
        knockUpStreamProgress: 1,
        nearestIsland: nearestSky.island,
        nearestDistance: nearestSky.distance,
      };
    }

    const nearest =
      locations.length > 0
        ? findNearestChartedIsland(nextPos, locations, env.globeRadius, progress > 0.5)
        : { island: state.nearestIsland, distance: state.nearestDistance };

    return {
      position: nextPos,
      heading,
      elevation: nextElevation,
      pitchAngle: nextPitch,
      speed: 0.085,
      turnVelocity: 0,
      bankAngle,
      collided: false,
      calmBeltBlocked: false,
      inReverseMountainCanal: false,
      reverseMountainPhase: null,
      skyZone: 'knock-up-stream',
      balloonDeploy: 0,
      knockUpStreamProgress: progress,
      nearestIsland: nearest.island,
      nearestDistance: nearest.distance,
    };
  }

  // ---------------------------------------------------------------------------
  // STATE B: SKYPIEA WHITE-WHITE SEA SAILING
  // ---------------------------------------------------------------------------
  if (skyZone === 'skypiea') {
    const targetTurn = clamp(input.steer, -1, 1) * 1.85;
    const turnAlpha = 1 - Math.exp(-9.0 * clampedDt);
    const nextTurnVel =
      state.turnVelocity + (targetTurn - state.turnVelocity) * turnAlpha;

    if (Math.abs(nextTurnVel) > 1e-4) {
      const angle = nextTurnVel * clampedDt;
      const right = normalize3(cross3(heading, up));
      heading = normalize3(
        add3(scale3(heading, Math.cos(angle)), scale3(right, -Math.sin(angle)))
      );
    }

    const maxForward = input.boost ? 0.28 : 0.096;
    const targetSpeed = throttle > 0 ? throttle * maxForward : 0;
    const accelRate = throttle > 0 ? (input.boost ? 6.6 : 4.0) : 2.6;
    const speedAlpha = 1 - Math.exp(-accelRate * clampedDt);
    let nextSpeed = Math.max(0, state.speed + (targetSpeed - state.speed) * speedAlpha);

    let nextPos = add3(state.position, scale3(heading, nextSpeed * clampedDt));
    nextPos = scale3(normalize3(nextPos), env.globeRadius);

    // Collide & slide cleanly against Skypiea cliffs, Angel Beach, islets, and Angel Pier
    let collided = false;
    const skyProbe = probeSkypieaHullCollision(nextPos, env, SUNNY_COLLISION_RADIUS);
    if (skyProbe.hit) {
      collided = true;
      const velVec = scale3(heading, nextSpeed);
      const inwardDot = dot3(velVec, skyProbe.pushOutDir);
      if (inwardDot < 0) {
        const slideVel = sub3(
          velVec,
          scale3(skyProbe.pushOutDir, inwardDot * 1.05)
        );
        const slideStep = Math.hypot(slideVel.x, slideVel.y, slideVel.z);
        const slidePos = scale3(
          normalize3(
            add3(
              state.position,
              add3(
                scale3(slideVel, clampedDt),
                scale3(skyProbe.pushOutDir, SUNNY_COLLISION_RADIUS * 0.48)
              )
            )
          ),
          env.globeRadius
        );
        const retry = probeSkypieaHullCollision(
          slidePos,
          env,
          SUNNY_COLLISION_RADIUS
        );
        if (!retry.hit) {
          nextPos = slidePos;
          nextSpeed = Math.min(nextSpeed, slideStep * (nextSpeed >= 0 ? 1 : -1));
        } else {
          const pushBackPos = scale3(
            normalize3(
              add3(
                state.position,
                scale3(skyProbe.pushOutDir, SUNNY_COLLISION_RADIUS * 0.65)
              )
            ),
            env.globeRadius
          );
          nextPos = !probeSkypieaHullCollision(
            pushBackPos,
            env,
            SUNNY_COLLISION_RADIUS
          ).hit
            ? pushBackPos
            : state.position;
          nextSpeed *= 0.25;
        }
      } else {
        const nudgePos = scale3(
          normalize3(
            add3(nextPos, scale3(skyProbe.pushOutDir, SUNNY_COLLISION_RADIUS * 0.42))
          ),
          env.globeRadius
        );
        if (!probeSkypieaHullCollision(nudgePos, env, SUNNY_COLLISION_RADIUS).hit) {
          nextPos = nudgePos;
        }
      }
    }

    const newUp = normalize3(nextPos);
    heading = normalize3(sub3(heading, scale3(newUp, dot3(heading, newUp))));
    const targetBank =
      -nextTurnVel * clamp(Math.abs(nextSpeed) * 5.0, 0.2, 1.0) * 0.14;
    const bankAlpha = 1 - Math.exp(-7.5 * clampedDt);
    const bankAngle =
      state.bankAngle + (targetBank - state.bankAngle) * bankAlpha;
    const nextPitch = state.pitchAngle + (0 - state.pitchAngle) * (1 - Math.exp(-10 * clampedDt));

    // Check if Sunny sailed out to Skypiea's outer White-White Sea cloud rim -> deploy Giant Octopus Balloon!
    const { lx, lz } = worldToSkypieaLocal(nextPos, env.skypiea, env.globeRadius);
    const distFromCenter = Math.hypot(lx, lz);
    const nearSeaRim =
      distFromCenter >= SKYPIEA_SEA_EXIT_RADIUS &&
      sampleSkypieaHeight(lx, lz) <= 0.15;

    const nearestSky =
      locations.length > 0
        ? findNearestChartedIsland(nextPos, locations, env.globeRadius, true)
        : { island: state.nearestIsland, distance: state.nearestDistance };

    if (nearSeaRim) {
      return {
        position: nextPos,
        heading,
        elevation: SKYPIEA_ALTITUDE,
        pitchAngle: nextPitch,
        speed: Math.max(0.08, Math.abs(nextSpeed)),
        turnVelocity: nextTurnVel,
        bankAngle,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'balloon-glide',
        balloonDeploy: 0.08,
        knockUpStreamProgress: 0,
        nearestIsland: nearestSky.island,
        nearestDistance: nearestSky.distance,
      };
    }

    return {
      position: nextPos,
      heading,
      elevation: SKYPIEA_ALTITUDE,
      pitchAngle: nextPitch,
      speed: nextSpeed,
      turnVelocity: nextTurnVel,
      bankAngle,
      collided,
      calmBeltBlocked: false,
      inReverseMountainCanal: false,
      reverseMountainPhase: null,
      skyZone: 'skypiea',
      balloonDeploy: 0,
      knockUpStreamProgress: 0,
      nearestIsland: nearestSky.island,
      nearestDistance: nearestSky.distance,
    };
  }

  // ---------------------------------------------------------------------------
  // STATE C: GIANT OCTOPUS BALLOON GLIDE DESCENT (Skypiea Edge -> Blue Sea)
  // ---------------------------------------------------------------------------
  if (skyZone === 'balloon-glide') {
    const targetTurn = clamp(input.steer, -1, 1) * 1.45;
    const turnAlpha = 1 - Math.exp(-7.0 * clampedDt);
    const nextTurnVel =
      state.turnVelocity + (targetTurn - state.turnVelocity) * turnAlpha;

    if (Math.abs(nextTurnVel) > 1e-4) {
      const angle = nextTurnVel * clampedDt;
      const right = normalize3(cross3(heading, up));
      heading = normalize3(
        add3(scale3(heading, Math.cos(angle)), scale3(right, -Math.sin(angle)))
      );
    }

    const desiredGlideSpeed =
      throttle > 0
        ? 0.078 + (input.boost ? 0.11 : 0.04) * throttle
        : 0.072;
    const speedAlpha = 1 - Math.exp(-3.5 * clampedDt);
    const nextSpeed = Math.max(0, state.speed + (desiredGlideSpeed - state.speed) * speedAlpha);

    let nextPos = add3(state.position, scale3(heading, nextSpeed * clampedDt));
    nextPos = scale3(normalize3(nextPos), env.globeRadius);
    const newUp = normalize3(nextPos);
    heading = normalize3(sub3(heading, scale3(newUp, dot3(heading, newUp))));

    const nextBalloon = Math.min(1, state.balloonDeploy + clampedDt * 1.75);
    const descentRate = 0.135 + (throttle > 0 ? 0.025 : 0);
    const nextElevation = Math.max(0, state.elevation - descentRate * clampedDt);

    const targetBank = -nextTurnVel * 0.11;
    const bankAlpha = 1 - Math.exp(-6.5 * clampedDt);
    const bankAngle =
      state.bankAngle + (targetBank - state.bankAngle) * bankAlpha;
    const targetPitch = -0.11;
    const nextPitch =
      state.pitchAngle + (targetPitch - state.pitchAngle) * (1 - Math.exp(-7 * clampedDt));

    // Safely touch down onto Blue Sea
    if (nextElevation <= 1e-4) {
      let landingPos = nextPos;
      const calmLanding = probeCalmBeltBarrier(
        landingPos,
        env,
        SUNNY_COLLISION_RADIUS * 1.6
      );
      if (calmLanding.blocked) {
        landingPos = scale3(
          normalize3(
            add3(landingPos, scale3(calmLanding.pushOutDir, SUNNY_COLLISION_RADIUS * 6))
          ),
          env.globeRadius
        );
      }
      const landLanding = probeHullCollision(
        landingPos,
        env,
        SUNNY_COLLISION_RADIUS * 1.6
      );
      if (landLanding.hit) {
        landingPos = scale3(
          normalize3(
            add3(landingPos, scale3(landLanding.pushOutDir, SUNNY_COLLISION_RADIUS * 8))
          ),
          env.globeRadius
        );
      }
      const lUp = normalize3(landingPos);
      const lHeading = normalize3(sub3(heading, scale3(lUp, dot3(heading, lUp))));
      const nearestBlue = findNearestChartedIsland(
        landingPos,
        locations,
        env.globeRadius
      );
      return {
        position: landingPos,
        heading: lHeading,
        elevation: 0,
        pitchAngle: 0,
        speed: Math.min(0.08, nextSpeed),
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearestBlue.island,
        nearestDistance: nearestBlue.distance,
      };
    }

    const nearest =
      locations.length > 0
        ? findNearestChartedIsland(
            nextPos,
            locations,
            env.globeRadius,
            nextElevation > SKYPIEA_ALTITUDE * 0.55
          )
        : { island: state.nearestIsland, distance: state.nearestDistance };

    return {
      position: nextPos,
      heading,
      elevation: nextElevation,
      pitchAngle: nextPitch,
      speed: nextSpeed,
      turnVelocity: nextTurnVel,
      bankAngle,
      collided: false,
      calmBeltBlocked: false,
      inReverseMountainCanal: false,
      reverseMountainPhase: null,
      skyZone: 'balloon-glide',
      balloonDeploy: nextBalloon,
      knockUpStreamProgress: 0,
      nearestIsland: nearest.island,
      nearestDistance: nearest.distance,
    };
  }

  // ---------------------------------------------------------------------------
  // STATE D: STANDARD BLUE SEA & REVERSE MOUNTAIN SAILING
  // ---------------------------------------------------------------------------
  const rmMotion = sampleReverseMountainMotion(state.position, heading, env);

  // Rudder turning
  const targetTurn = clamp(input.steer, -1, 1) * 1.85;
  const turnAlpha = 1 - Math.exp(-9.0 * clampedDt);
  const nextTurnVel =
    state.turnVelocity + (targetTurn - state.turnVelocity) * turnAlpha;

  if (Math.abs(nextTurnVel) > 1e-4) {
    const angle = nextTurnVel * clampedDt;
    const right = normalize3(cross3(heading, up));
    heading = normalize3(
      add3(
        scale3(heading, Math.cos(angle)),
        scale3(right, -Math.sin(angle))
      )
    );
  }

  // Summit whirlpool & canyon current steering assist so Sunny turns cleanly at peak toward Grand Line
  if (rmMotion.inCanal && rmMotion.phase && Math.abs(input.steer) < 0.25) {
    const alignStrength =
      rmMotion.phase === 'summit' || rmMotion.rLocal <= RM_SUMMIT_RADIUS + 4.5
        ? 4.6
        : input.throttle >= 0
          ? 1.25
          : 0;
    if (alignStrength > 0) {
      const blend = 1 - Math.exp(-alignStrength * clampedDt);
      const blended = add3(
        scale3(heading, 1 - blend),
        scale3(rmMotion.flowDir, blend)
      );
      heading = normalize3(sub3(blended, scale3(up, dot3(blended, up))));
    }
  }

  const startUV = worldPosToEquirectangular(state.position);
  const inCanal =
    rmMotion.inCanal || isUVInReverseMountainCanal(startUV.u, startUV.v, env);

  // Forward / Coup de Burst speed + Reverse Mountain upward/downward rushing current (no reverse gear)
  const canalBonus = inCanal && throttle > 0 ? 0.042 : 0;
  const openSeaRoughness = !inCanal ? clamp(weather?.seaRoughness ?? 0, 0, 1) : 0;
  const openSeaSpeedFactor = !inCanal
    ? clamp(weather?.speedFactor ?? (1 - openSeaRoughness * 0.55), 0.42, 1)
    : 1;
  const waveSurge =
    openSeaRoughness > 0.25 && weather?.elapsed !== undefined
      ? 1 - Math.max(0, Math.sin(weather.elapsed * 2.6)) * openSeaRoughness * 0.16
      : 1;

  const maxForward =
    (input.boost ? 0.32 : 0.096) * openSeaSpeedFactor * waveSurge + canalBonus;

  // Strong marine current sweeps Sunny up the slopes, around the summit, and down into Grand Line
  let currentCarrySpeed = 0;
  if (rmMotion.inCanal) {
    const fwdDotFlow = dot3(heading, rmMotion.flowDir);
    if (rmMotion.phase === 'summit') {
      currentCarrySpeed = 0.082;
    } else if (fwdDotFlow > 0.12) {
      if (rmMotion.phase === 'climbing') currentCarrySpeed = 0.085;
      else if (rmMotion.phase === 'descending') currentCarrySpeed = 0.125;
      else if (rmMotion.phase === 'approach') currentCarrySpeed = 0.034;
    }
  }

  const desiredManualSpeed = throttle > 0 ? throttle * maxForward : 0;
  const targetSpeed = Math.max(desiredManualSpeed, currentCarrySpeed);
  const baseAccelRate =
    throttle > 0 || currentCarrySpeed > 0
      ? input.boost
        ? 6.5
        : 4.0
      : 2.6;
  const accelRate = baseAccelRate * (0.45 + 0.55 * openSeaSpeedFactor);
  const speedAlpha = 1 - Math.exp(-accelRate * clampedDt);
  let nextSpeed = Math.max(0, state.speed + (targetSpeed - state.speed) * speedAlpha);

  // Compute candidate geodesic move along sphere
  const stepDist = nextSpeed * clampedDt;
  let nextPos = add3(state.position, scale3(heading, stepDist));
  nextPos = scale3(normalize3(nextPos), env.globeRadius);

  // 1. Calm Belt barrier: stops forward progress across the Calm Belt outside Reverse Mountain
  let calmBeltBlocked = false;
  const calmProbe = probeCalmBeltBarrier(nextPos, env, SUNNY_COLLISION_RADIUS);
  const currentCalmProbe = probeCalmBeltBarrier(
    state.position,
    env,
    SUNNY_COLLISION_RADIUS * 1.15
  );
  if (calmProbe.blocked) {
    calmBeltBlocked = true;
    const velVec = scale3(heading, nextSpeed);
    const inwardDot = dot3(velVec, calmProbe.pushOutDir);
    if (inwardDot < 0) {
      // Allow sliding parallel to the Calm Belt wall along the sea edge, never across it
      const parallelVel = sub3(
        velVec,
        scale3(calmProbe.pushOutDir, inwardDot)
      );
      const alreadyInside = isWorldPointCalmBelt(state.position, env);
      const pushDist = alreadyInside ? SUNNY_COLLISION_RADIUS * 0.25 : 0;
      const safePos = scale3(
        normalize3(
          add3(
            state.position,
            add3(
              scale3(parallelVel, clampedDt * 0.55),
              scale3(calmProbe.pushOutDir, pushDist)
            )
          )
        ),
        env.globeRadius
      );
      const recheck = probeCalmBeltBarrier(safePos, env, SUNNY_COLLISION_RADIUS);
      if (!recheck.blocked) {
        nextPos = safePos;
        nextSpeed =
          Math.hypot(parallelVel.x, parallelVel.y, parallelVel.z) *
          0.55 *
          (nextSpeed >= 0 ? 1 : -1);
      } else {
        // Hold flush against the Calm Belt edge without bouncing backward
        const pushBack = alreadyInside
          ? scale3(
              normalize3(
                add3(
                  state.position,
                  scale3(calmProbe.pushOutDir, SUNNY_COLLISION_RADIUS * 0.35)
                )
              ),
              env.globeRadius
            )
          : state.position;
        nextPos = !isWorldPointCalmBelt(pushBack, env)
          ? pushBack
          : state.position;
        nextSpeed = 0;
      }
    }
  } else if (
    currentCalmProbe.blocked &&
    input.throttle > 0 &&
    dot3(heading, currentCalmProbe.pushOutDir) < -0.15
  ) {
    // Player is actively holding throttle into the Calm Belt edge
    calmBeltBlocked = true;
    nextSpeed = 0;
    nextPos = state.position;
  }

  // 2. Collision detection + smooth coastline slide
  let collided = false;
  const probe = probeHullCollision(nextPos, env, SUNNY_COLLISION_RADIUS);
  if (probe.hit) {
    collided = true;
    const velVec = scale3(heading, nextSpeed);
    const inwardDot = dot3(velVec, probe.pushOutDir);
    if (inwardDot < 0) {
      const slideVel = sub3(
        velVec,
        scale3(probe.pushOutDir, inwardDot * 1.05)
      );
      const slideStep = Math.hypot(slideVel.x, slideVel.y, slideVel.z);
      const slidePos = scale3(
        normalize3(
          add3(
            state.position,
            add3(
              scale3(slideVel, clampedDt),
              scale3(probe.pushOutDir, SUNNY_COLLISION_RADIUS * 0.48)
            )
          )
        ),
        env.globeRadius
      );
      const retry = probeHullCollision(slidePos, env, SUNNY_COLLISION_RADIUS);
      if (!retry.hit && !probeCalmBeltBarrier(slidePos, env, SUNNY_COLLISION_RADIUS).blocked) {
        nextPos = slidePos;
        nextSpeed = Math.min(nextSpeed, slideStep * (nextSpeed >= 0 ? 1 : -1));
      } else {
        const pushBackPos = scale3(
          normalize3(
            add3(state.position, scale3(probe.pushOutDir, SUNNY_COLLISION_RADIUS * 0.65))
          ),
          env.globeRadius
        );
        const pushCheck = probeHullCollision(
          pushBackPos,
          env,
          SUNNY_COLLISION_RADIUS
        );
        nextPos = !pushCheck.hit ? pushBackPos : state.position;
        nextSpeed *= 0.25;
      }
    } else {
      const nudgePos = scale3(
        normalize3(add3(nextPos, scale3(probe.pushOutDir, SUNNY_COLLISION_RADIUS * 0.42))),
        env.globeRadius
      );
      if (!probeHullCollision(nudgePos, env, SUNNY_COLLISION_RADIUS).hit) {
        nextPos = nudgePos;
      }
    }
  }

  // Re-orthogonalize heading onto new sphere normal
  const newUp = normalize3(nextPos);
  heading = normalize3(sub3(heading, scale3(newUp, dot3(heading, newUp))));

  // Banking angle for visual turn heel + storm wave buffeting
  const stormHeel =
    openSeaRoughness > 0.25 && weather?.elapsed !== undefined
      ? Math.sin(weather.elapsed * 2.15 + 0.7) * openSeaRoughness * 0.055
      : 0;
  const targetBank =
    -nextTurnVel * clamp(Math.abs(nextSpeed) * 5.0, 0.2, 1.0) * 0.14 + stormHeel;
  const bankAlpha = 1 - Math.exp(-7.5 * clampedDt);
  const bankAngle = state.bankAngle + (targetBank - state.bankAngle) * bankAlpha;

  const endUV = worldPosToEquirectangular(nextPos);
  const rmEnd = sampleReverseMountainMotion(nextPos, heading, env);
  const endInCanal =
    rmEnd.inCanal || isUVInReverseMountainCanal(endUV.u, endUV.v, env);

  const elevAlpha = 1 - Math.exp(-16 * clampedDt);
  const pitchAlpha = 1 - Math.exp(-11 * clampedDt);
  const targetElevation = rmEnd.inCanal ? rmEnd.elevation + 0.0008 : rmEnd.elevation;
  const nextElevation = rmEnd.inCanal
    ? Math.max(targetElevation, state.elevation + (targetElevation - state.elevation) * elevAlpha)
    : state.elevation + (targetElevation - state.elevation) * elevAlpha;
  const stormPitchJitter =
    !rmEnd.inCanal && openSeaRoughness > 0.25 && weather?.elapsed !== undefined
      ? Math.cos(weather.elapsed * 2.45) * openSeaRoughness * 0.045
      : 0;
  const nextPitch =
    state.pitchAngle +
    (rmEnd.pitchAngle + stormPitchJitter - state.pitchAngle) * pitchAlpha;

  // 3. Auto-coat Sunny exclusively when sailing into Sabaody harbor / Groves 40-49 Coating Yard piers
  const sabaodyCoatingPoint = scale3(
    normalize3(
      add3(
        env.sabaody.origin,
        add3(
          scale3(env.sabaody.east, SABAODY_LANDMARKS.coatingQuay.x * SABAODY_GLOBE_SCALE),
          scale3(env.sabaody.south, (SABAODY_LANDMARKS.coatingQuay.z + 20) * SABAODY_GLOBE_SCALE)
        )
      )
    ),
    env.globeRadius
  );
  const distToCoatingQuay = Math.hypot(
    nextPos.x - sabaodyCoatingPoint.x,
    nextPos.y - sabaodyCoatingPoint.y,
    nextPos.z - sabaodyCoatingPoint.z
  );
  const distToSabaodyCenter = Math.hypot(
    nextPos.x - env.sabaody.origin.x,
    nextPos.y - env.sabaody.origin.y,
    nextPos.z - env.sabaody.origin.z
  );
  if (distToCoatingQuay <= 0.038 || distToSabaodyCenter <= 0.145) {
    coated = true;
  }

  // 4. Check Knock Up Stream capture on the Blue Sea off Jaya -> trigger water elevator!
  const distToKUS = Math.hypot(
    nextPos.x - env.knockUpStreamCenter.x,
    nextPos.y - env.knockUpStreamCenter.y,
    nextPos.z - env.knockUpStreamCenter.z
  );
  if (!rmEnd.inCanal && nextElevation < 0.08 && distToKUS <= KNOCK_UP_STREAM_CAPTURE_RADIUS) {
    const nearest =
      locations.length > 0
        ? findNearestChartedIsland(nextPos, locations, env.globeRadius)
        : { island: state.nearestIsland, distance: state.nearestDistance };
    return {
      position: nextPos,
      heading,
      elevation: Math.max(0.015, nextElevation),
      pitchAngle: 0.35,
      speed: 0.085,
      turnVelocity: 0,
      bankAngle: 0,
      collided: false,
      calmBeltBlocked: false,
      inReverseMountainCanal: false,
      reverseMountainPhase: null,
      skyZone: 'knock-up-stream',
      balloonDeploy: 0,
      knockUpStreamProgress: 0.02,
      coated,
      coatingRequiredBlocked: false,
      subseaDiveProgress: 0,
      nearestIsland: nearest.island,
      nearestDistance: nearest.distance,
    };
  }

  // 5. Check Subsea Plunge Vortex ("Courants Périlleux") off Red Line -> requires Yarukiman coating!
  let coatingRequiredBlocked = false;
  const distToPlunge = Math.hypot(
    nextPos.x - env.subseaPlungeCenter.x,
    nextPos.y - env.subseaPlungeCenter.y,
    nextPos.z - env.subseaPlungeCenter.z
  );
  if (!rmEnd.inCanal && nextElevation < 0.08 && distToPlunge <= SUBSEA_PLUNGE_CAPTURE_RADIUS) {
    if (coated) {
      return {
        position: nextPos,
        heading,
        elevation: -0.02,
        pitchAngle: -0.45,
        speed: 0.14,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'subsea-dive',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        coated: true,
        coatingRequiredBlocked: false,
        subseaDiveProgress: 0.04,
        nearestIsland:
          locations.find((l) => l.id === 'fish-man-island') ?? state.nearestIsland,
        nearestDistance: 0,
      };
    } else {
      coatingRequiredBlocked = true;
      const westRaw = scale3(env.fishManIsland.east, -1);
      const outDir = normalize3(sub3(westRaw, scale3(newUp, dot3(westRaw, newUp))));
      const fromPlunge = sub3(nextPos, env.subseaPlungeCenter);
      const tanPushRaw = sub3(fromPlunge, scale3(newUp, dot3(fromPlunge, newUp)));
      const pushLen = Math.hypot(tanPushRaw.x, tanPushRaw.y, tanPushRaw.z);
      const pushDir =
        pushLen > 1e-6 ? scale3(tanPushRaw, 1 / pushLen) : outDir;
      nextPos = scale3(
        normalize3(
          add3(env.subseaPlungeCenter, scale3(pushDir, SUBSEA_PLUNGE_CAPTURE_RADIUS + 0.008))
        ),
        env.globeRadius
      );
      nextSpeed = 0;
    }
  }

  const nearest =
    locations.length > 0
      ? findNearestChartedIsland(nextPos, locations, env.globeRadius)
      : { island: state.nearestIsland, distance: state.nearestDistance };

  return {
    position: nextPos,
    heading,
    elevation: nextElevation,
    pitchAngle: nextPitch,
    speed: nextSpeed,
    turnVelocity: nextTurnVel,
    bankAngle,
    collided,
    calmBeltBlocked,
    inReverseMountainCanal: endInCanal,
    reverseMountainPhase: rmEnd.phase,
    skyZone: 'blue-sea',
    balloonDeploy: 0,
    knockUpStreamProgress: 0,
    coated,
    coatingRequiredBlocked,
    subseaDiveProgress: 0,
    nearestIsland: nearest.island,
    nearestDistance: nearest.distance,
  };
}

/**
 * Computes a safe deep-water spawn point & heading for the Thousand Sunny.
 * Defaults to the East Blue approach off Loguetown facing Reverse Mountain
 * so players immediately experience the Calm Belt barrier & Reverse Mountain entry.
 */
export function createSafeSunnySpawn(
  targetIsland: IslandLocation | null,
  env: SunnyCollisionEnv,
  locations: readonly IslandLocation[] = []
): SunnyState {
  // Default voyage spawn: East Blue open water between Loguetown and Reverse Mountain
  if (!targetIsland) {
    const startPos = equirectangularToSphere(0.552, 0.398, env.globeRadius);
    const reverseApproach = equirectangularToSphere(0.542, 0.410, env.globeRadius);
    const up = normalize3(startPos);
    const rawDir = sub3(reverseApproach, startPos);
    const heading = normalize3(sub3(rawDir, scale3(up, dot3(rawDir, up))));
    if (
      !probeHullCollision(startPos, env, SUNNY_COLLISION_RADIUS * 1.6).hit &&
      !probeCalmBeltBarrier(startPos, env, SUNNY_COLLISION_RADIUS * 1.6).blocked
    ) {
      const nearest = findNearestChartedIsland(startPos, locations, env.globeRadius);
      return {
        position: startPos,
        heading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Dawn Island / Foosha Village / Goa Kingdom: spawn in clear East Blue waters off Foosha Crescent Bay facing Red Force, Foosha Windmill & Mt. Colubo
  if (
    targetIsland?.id === 'foosha-village' ||
    targetIsland?.id === 'dawn-island' ||
    targetIsland?.id === 'goa-kingdom'
  ) {
    const pos = scale3(
      normalize3(
        add3(
          env.dawn.origin,
          add3(
            scale3(env.dawn.east, 114 * DAWN_GLOBE_SCALE),
            scale3(env.dawn.south, -4 * DAWN_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const fooshaHarborPos = scale3(
      normalize3(
        add3(
          env.dawn.origin,
          add3(
            scale3(env.dawn.east, 64 * DAWN_GLOBE_SCALE),
            scale3(env.dawn.south, -14 * DAWN_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(pos);
    const toFoosha = sub3(fooshaHarborPos, pos);
    const heading = normalize3(sub3(toFoosha, scale3(up, dot3(toFoosha, up))));
    if (
      !probeHullCollision(pos, env, SUNNY_COLLISION_RADIUS * 1.5).hit &&
      !probeCalmBeltBarrier(pos, env, SUNNY_COLLISION_RADIUS * 1.5).blocked
    ) {
      const nearest = findNearestChartedIsland(pos, locations, env.globeRadius);
      return {
        position: pos,
        heading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: targetIsland ?? nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Jaya / Mock Town selected: spawn off Jaya's eastern Cricket shore facing the Knock Up Stream a short sail away
  if (targetIsland?.id === 'jaya' || targetIsland?.id === 'mock-town') {
    const lx = 80;
    const lz = -46;
    const pos = scale3(
      normalize3(
        add3(
          env.jaya.origin,
          add3(
            scale3(env.jaya.east, lx * JAYA_GLOBE_SCALE),
            scale3(env.jaya.south, lz * JAYA_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(pos);
    const toStream = sub3(env.knockUpStreamCenter, pos);
    const heading = normalize3(sub3(toStream, scale3(up, dot3(toStream, up))));
    if (
      !probeHullCollision(pos, env, SUNNY_COLLISION_RADIUS * 1.5).hit &&
      !probeCalmBeltBarrier(pos, env, SUNNY_COLLISION_RADIUS * 1.5).blocked
    ) {
      const nearest = findNearestChartedIsland(pos, locations, env.globeRadius);
      return {
        position: pos,
        heading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Long Ring Long Land selected: spawn inside the calm central lagoon looking toward Tonjit's island & Sexy Foxy
  if (targetIsland?.id === 'long-ring-long-land') {
    const lx = -2.0;
    const lz = 28.0;
    const pos = scale3(
      normalize3(
        add3(
          env.longRing.origin,
          add3(
            scale3(env.longRing.east, lx * LONG_RING_GLOBE_SCALE),
            scale3(env.longRing.south, lz * LONG_RING_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(pos);
    const toTarget = scale3(
      normalize3(
        add3(
          env.longRing.origin,
          add3(
            scale3(env.longRing.east, LONG_RING_FOXY_SHIP.x * LONG_RING_GLOBE_SCALE),
            scale3(env.longRing.south, LONG_RING_FOXY_SHIP.z * LONG_RING_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const rawHeading = sub3(toTarget, pos);
    const heading = normalize3(
      sub3(rawHeading, scale3(up, dot3(rawHeading, up)))
    );
    if (
      !probeHullCollision(pos, env, SUNNY_COLLISION_RADIUS * 1.5).hit &&
      !probeCalmBeltBarrier(pos, env, SUNNY_COLLISION_RADIUS * 1.5).blocked
    ) {
      const nearest = findNearestChartedIsland(pos, locations, env.globeRadius);
      return {
        position: pos,
        heading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Enies Lobby selected: spawn outside southern Grillage sea gate facing Ferry Pier & Porte Principale
  if (targetIsland?.id === 'enies-lobby') {
    const lx = 0;
    const lz = 94;
    const pos = scale3(
      normalize3(
        add3(
          env.eniesLobby.origin,
          add3(
            scale3(env.eniesLobby.east, lx * ENIES_GLOBE_SCALE),
            scale3(env.eniesLobby.south, lz * ENIES_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(pos);
    const toGate = sub3(env.eniesLobby.origin, pos);
    const heading = normalize3(sub3(toGate, scale3(up, dot3(toGate, up))));
    if (!probeHullCollision(pos, env, SUNNY_COLLISION_RADIUS * 1.4).hit) {
      const nearest = findNearestChartedIsland(pos, locations, env.globeRadius);
      return {
        position: pos,
        heading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Amazon Lily selected: spawn off the SE coast facing the fortified underground cave port mouth
  if (targetIsland?.id === 'amazon-lily') {
    const lx = 96;
    const lz = 46;
    const pos = scale3(
      normalize3(
        add3(
          env.amazonLily.origin,
          add3(
            scale3(env.amazonLily.east, lx * AMAZON_LILY_GLOBE_SCALE),
            scale3(env.amazonLily.south, lz * AMAZON_LILY_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(pos);
    const toPort = sub3(env.amazonLily.origin, pos);
    const heading = normalize3(sub3(toPort, scale3(up, dot3(toPort, up))));
    if (!probeHullCollision(pos, env, SUNNY_COLLISION_RADIUS * 1.4).hit) {
      const nearest = findNearestChartedIsland(pos, locations, env.globeRadius);
      return {
        position: pos,
        heading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Thriller Bark: spawn cleanly in navigable Florian Triangle waters outside the South Demonic Mouth Gate facing north
  if (targetIsland?.id === 'thriller-bark') {
    const pos = scale3(
      normalize3(
        add3(
          env.thrillerBark.origin,
          scale3(env.thrillerBark.south, 132.0 * THRILLER_BARK_GLOBE_SCALE)
        )
      ),
      env.globeRadius
    );
    const up = normalize3(pos);
    const toMouth = sub3(env.thrillerBark.origin, pos);
    const heading = normalize3(sub3(toMouth, scale3(up, dot3(toMouth, up))));
    if (!probeHullCollision(pos, env, SUNNY_COLLISION_RADIUS * 1.4).hit) {
      const nearest = findNearestChartedIsland(pos, locations, env.globeRadius);
      return {
        position: pos,
        heading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Shift Station / Pucci / San Faldo / St. Poplar: spawn on open sea outside Sea Train pier
  if (
    targetIsland?.id === 'shift-station' ||
    targetIsland?.id === 'pucci-island' ||
    targetIsland?.id === 'san-faldo' ||
    targetIsland?.id === 'st-poplar'
  ) {
    const isShift = targetIsland.id === 'shift-station';
    const frame = isShift
      ? env.shiftStation
      : targetIsland.id === 'pucci-island'
        ? env.pucci
        : targetIsland.id === 'san-faldo'
          ? env.sanFaldo
          : env.stPoplar;
    const scale = isShift ? SHIFT_GLOBE_SCALE : STATION_ISLAND_GLOBE_SCALE;
    const lz = isShift ? 28 : targetIsland.id === 'pucci-island' ? 38 : -38;
    const pos = scale3(
      normalize3(add3(frame.origin, scale3(frame.south, lz * scale))),
      env.globeRadius
    );
    const up = normalize3(pos);
    const toStation = sub3(frame.origin, pos);
    const heading = normalize3(
      sub3(toStation, scale3(up, dot3(toStation, up)))
    );
    if (!probeHullCollision(pos, env, SUNNY_COLLISION_RADIUS * 1.4).hit) {
      const nearest = findNearestChartedIsland(pos, locations, env.globeRadius);
      return {
        position: pos,
        heading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Skypiea / Angel Island / Upper Yard / Shandora: spawn inside Angel Bay facing Angel Beach
  if (
    targetIsland &&
    (targetIsland.id === 'skypiea' ||
      targetIsland.id === 'angel-island' ||
      targetIsland.id === 'upper-yard' ||
      targetIsland.id === 'hidden-cloud-village')
  ) {
    const pos = skypieaLocalToSpherePoint(14, 78, env.skypiea, env.globeRadius);
    const up = normalize3(pos);
    const beachWorld = skypieaLocalToSpherePoint(
      ANGEL_BEACH_CENTER.x,
      ANGEL_BEACH_CENTER.z,
      env.skypiea,
      env.globeRadius
    );
    const toBeach = sub3(beachWorld, pos);
    const heading = normalize3(sub3(toBeach, scale3(up, dot3(toBeach, up))));
    const nearestSky = findNearestChartedIsland(pos, locations, env.globeRadius, true);
    return {
      position: pos,
      heading,
      elevation: SKYPIEA_ALTITUDE,
      pitchAngle: 0,
      speed: 0,
      turnVelocity: 0,
      bankAngle: 0,
      collided: false,
      calmBeltBlocked: false,
      inReverseMountainCanal: false,
      reverseMountainPhase: null,
      skyZone: 'skypiea',
      balloonDeploy: 0,
      knockUpStreamProgress: 0,
      nearestIsland: nearestSky.island,
      nearestDistance: nearestSky.distance,
    };
  }

  // Marineford: directly south of the Harbor Mouth looking North into Oris Bay
  if (targetIsland?.id === 'marineford') {
    const lx = 0;
    const lz = 94;
    const worldPt = scale3(
      normalize3(
        add3(
          env.marineford.origin,
          add3(
            scale3(env.marineford.east, lx * MARINEFORD_GLOBE_SCALE),
            scale3(env.marineford.south, lz * MARINEFORD_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(worldPt);
    const northHeading = normalize3(
      sub3(
        scale3(env.marineford.south, -1),
        scale3(up, dot3(scale3(env.marineford.south, -1), up))
      )
    );
    if (!probeHullCollision(worldPt, env, SUNNY_COLLISION_RADIUS * 1.4).hit) {
      const nearest = findNearestChartedIsland(worldPt, locations, env.globeRadius);
      return {
        position: worldPt,
        heading: northHeading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Punk Hazard selected: place Sunny west of the central demarcation strait facing east so Ice Half & Burning Half flank the bow
  if (targetIsland?.id === 'punk-hazard') {
    const lx = PUNK_HAZARD_LANDMARKS.sunnySpawnWest.x;
    const lz = PUNK_HAZARD_LANDMARKS.sunnySpawnWest.z;
    const worldPt = scale3(
      normalize3(
        add3(
          env.punkHazard.origin,
          add3(
            scale3(env.punkHazard.east, lx * PUNK_HAZARD_GLOBE_SCALE),
            scale3(env.punkHazard.south, lz * PUNK_HAZARD_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(worldPt);
    const eastHeading = normalize3(
      sub3(env.punkHazard.east, scale3(up, dot3(env.punkHazard.east, up)))
    );
    if (!probeHullCollision(worldPt, env, SUNNY_COLLISION_RADIUS * 1.4).hit) {
      const nearest = findNearestChartedIsland(worldPt, locations, env.globeRadius);
      return {
        position: worldPt,
        heading: eastHeading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Dressrosa & Green Bit selected: anchor outside Acacia southern harbor mouth or east off Green Bit
  if (targetIsland && targetIsland.id in DRESSROSA_SUB_LOCATIONS) {
    const isGreenBit = targetIsland.id === 'green-bit';
    const spawnPt = isGreenBit
      ? DRESSROSA_LANDMARKS.sunnySpawnGreenBit
      : DRESSROSA_LANDMARKS.sunnySpawnHarbor;
    const worldPt = scale3(
      normalize3(
        add3(
          env.dressrosa.origin,
          add3(
            scale3(env.dressrosa.east, spawnPt.x * DRESSROSA_GLOBE_SCALE),
            scale3(env.dressrosa.south, spawnPt.z * DRESSROSA_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(worldPt);
    const rawHeading = isGreenBit
      ? scale3(env.dressrosa.east, -1)
      : scale3(env.dressrosa.south, -1);
    const heading = normalize3(
      sub3(rawHeading, scale3(up, dot3(rawHeading, up)))
    );
    if (!probeHullCollision(worldPt, env, SUNNY_COLLISION_RADIUS * 1.4).hit) {
      const nearest = findNearestChartedIsland(worldPt, locations, env.globeRadius);
      return {
        position: worldPt,
        heading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Totto Land (Whole Cake Island + 34 peripheral culinary islands): anchor in Sweet City bay or off target island's south shore
  if (targetIsland && targetIsland.id in TOTTO_LAND_SUB_LOCATIONS) {
    const periph = TOTTO_LAND_ISLAND_BY_ID[targetIsland.id];
    const spawnPt =
      targetIsland.id === 'cacao-island'
        ? TOTTO_LAND_LANDMARKS.sunnySpawnCacao
        : targetIsland.id === 'cheese-island'
          ? TOTTO_LAND_LANDMARKS.sunnySpawnCheese
          : periph
            ? { x: periph.x, z: periph.z + periph.rz + 13.0 }
            : TOTTO_LAND_LANDMARKS.sunnySpawnHarbor;
    const worldPt = scale3(
      normalize3(
        add3(
          env.tottoLand.origin,
          add3(
            scale3(env.tottoLand.east, spawnPt.x * TOTTO_LAND_GLOBE_SCALE),
            scale3(env.tottoLand.south, spawnPt.z * TOTTO_LAND_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(worldPt);
    const rawHeading = scale3(env.tottoLand.south, -1);
    const heading = normalize3(
      sub3(rawHeading, scale3(up, dot3(rawHeading, up)))
    );
    if (!probeHullCollision(worldPt, env, SUNNY_COLLISION_RADIUS * 1.4).hit) {
      const nearest = findNearestChartedIsland(worldPt, locations, env.globeRadius);
      return {
        position: worldPt,
        heading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Zou selected: spawn Sunny in open water off Zunesha's front-left flank facing the walking colossus
  if (targetIsland && targetIsland.id === 'zou') {
    const spawnPt = ZOU_LANDMARKS.sunnySpawnSea;
    const worldPt = scale3(
      normalize3(
        add3(
          env.zou.origin,
          add3(
            scale3(env.zou.east, spawnPt.x * ZOU_GLOBE_SCALE),
            scale3(env.zou.south, spawnPt.z * ZOU_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(worldPt);
    const rawHeading = add3(scale3(env.zou.east, 0.72), scale3(env.zou.south, -0.68));
    const heading = normalize3(
      sub3(rawHeading, scale3(up, dot3(rawHeading, up)))
    );
    if (!probeHullCollision(worldPt, env, SUNNY_COLLISION_RADIUS * 1.4).hit) {
      const nearest = findNearestChartedIsland(worldPt, locations, env.globeRadius);
      return {
        position: worldPt,
        heading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Wano or Wano region selected: spawn Sunny in open SE water off Onigashima facing the Great Waterfall cliffs
  if (targetIsland && targetIsland.id in WANO_SUB_LOCATIONS) {
    const spawnPt = WANO_LANDMARKS.sunnySpawnSea;
    const worldPt = scale3(
      normalize3(
        add3(
          env.wano.origin,
          add3(
            scale3(env.wano.east, spawnPt.x * WANO_GLOBE_SCALE),
            scale3(env.wano.south, spawnPt.z * WANO_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(worldPt);
    const rawHeading = add3(scale3(env.wano.east, -0.45), scale3(env.wano.south, -0.89));
    const heading = normalize3(
      sub3(rawHeading, scale3(up, dot3(rawHeading, up)))
    );
    if (!probeHullCollision(worldPt, env, SUNNY_COLLISION_RADIUS * 1.4).hit) {
      const nearest = findNearestChartedIsland(worldPt, locations, env.globeRadius);
      return {
        position: worldPt,
        heading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Egghead Island selected: spawn Sunny in open SE bay facing Futuristic Port & towering Punk Records cloud
  if (targetIsland && targetIsland.id in EGGHEAD_SUB_LOCATIONS) {
    const spawnPt = EGGHEAD_LANDMARKS.sunnySpawnSea;
    const worldPt = scale3(
      normalize3(
        add3(
          env.egghead.origin,
          add3(
            scale3(env.egghead.east, spawnPt.x * EGGHEAD_GLOBE_SCALE),
            scale3(env.egghead.south, spawnPt.z * EGGHEAD_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(worldPt);
    const rawHeading = add3(
      scale3(env.egghead.east, -0.48),
      scale3(env.egghead.south, -0.88)
    );
    const heading = normalize3(
      sub3(rawHeading, scale3(up, dot3(rawHeading, up)))
    );
    if (!probeHullCollision(worldPt, env, SUNNY_COLLISION_RADIUS * 1.4).hit) {
      const nearest = findNearestChartedIsland(worldPt, locations, env.globeRadius);
      return {
        position: worldPt,
        heading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Elbaf selected: spawn Sunny in open SE sea off Viking Fjord Harbor facing NW toward Treasure Tree Adam
  if (targetIsland && targetIsland.id in ELBAF_SUB_LOCATIONS) {
    const spawnPt = ELBAF_LANDMARKS.sunnySpawnSea;
    const worldPt = scale3(
      normalize3(
        add3(
          env.elbaf.origin,
          add3(
            scale3(env.elbaf.east, spawnPt.x * ELBAF_GLOBE_SCALE),
            scale3(env.elbaf.south, spawnPt.z * ELBAF_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(worldPt);
    const rawHeading = add3(
      scale3(env.elbaf.east, -0.35),
      scale3(env.elbaf.south, -0.94)
    );
    const heading = normalize3(
      sub3(rawHeading, scale3(up, dot3(rawHeading, up)))
    );
    if (!probeHullCollision(worldPt, env, SUNNY_COLLISION_RADIUS * 1.4).hit) {
      const nearest = findNearestChartedIsland(worldPt, locations, env.globeRadius);
      return {
        position: worldPt,
        heading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Sabaody selected: place Sunny in open harbor water south of Groves 40-49 Coating Quay facing north toward the piers
  if (targetIsland?.id === 'sabaody') {
    const lx = -34;
    const lz = 98;
    const worldPt = scale3(
      normalize3(
        add3(
          env.sabaody.origin,
          add3(
            scale3(env.sabaody.east, lx * SABAODY_GLOBE_SCALE),
            scale3(env.sabaody.south, lz * SABAODY_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(worldPt);
    const northHeading = normalize3(
      sub3(
        scale3(env.sabaody.south, -1),
        scale3(up, dot3(scale3(env.sabaody.south, -1), up))
      )
    );
    if (!probeHullCollision(worldPt, env, SUNNY_COLLISION_RADIUS * 1.4).hit) {
      const nearest = findNearestChartedIsland(worldPt, locations, env.globeRadius);
      return {
        position: worldPt,
        heading: northHeading,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        coated: false,
        coatingRequiredBlocked: false,
        subseaDiveProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Fish-Man Island selected: spawn Sunny already coated in Yarukiman resin inside the Coral Lagoon facing Coral Hills & Ryugu Palace
  if (targetIsland?.id === 'fish-man-island') {
    const pos = fishManLocalToSpherePoint(
      FISH_MAN_LANDMARKS.coralLagoonEntry.x,
      48,
      env.fishManIsland,
      env.globeRadius
    );
    const up = normalize3(pos);
    const northTarget = fishManLocalToSpherePoint(
      FISH_MAN_LANDMARKS.coralHills.x,
      FISH_MAN_LANDMARKS.coralHills.z,
      env.fishManIsland,
      env.globeRadius
    );
    const rawDir = sub3(northTarget, pos);
    const heading = normalize3(sub3(rawDir, scale3(up, dot3(rawDir, up))));
    return {
      position: pos,
      heading,
      elevation: -FISH_MAN_DEPTH,
      pitchAngle: 0,
      speed: 0,
      turnVelocity: 0,
      bankAngle: 0,
      collided: false,
      calmBeltBlocked: false,
      inReverseMountainCanal: false,
      reverseMountainPhase: null,
      skyZone: 'fish-man-island',
      balloonDeploy: 0,
      knockUpStreamProgress: 0,
      coated: true,
      coatingRequiredBlocked: false,
      subseaDiveProgress: 1,
      nearestIsland: targetIsland,
      nearestDistance: 0,
    };
  }

  // Mary Geoise selected: spawn Sunny in clear New World sea right off the East Red Port Harbor facing West toward Red Line
  if (targetIsland?.id === 'mary-geoise') {
    const rpZ = MARY_GEOISE_LANDMARKS.redPortUpperGate.z;
    const eastCandidates: Vec3[] = [
      ...[
        [212, rpZ],
        [226, rpZ],
        [244, rpZ + 10],
      ].map(([lx, lz]) =>
        scale3(
          normalize3(
            add3(
              env.maryGeoise.origin,
              add3(
                scale3(env.maryGeoise.east, lx * MARY_GEOISE_GLOBE_SCALE),
                scale3(env.maryGeoise.south, lz * MARY_GEOISE_GLOBE_SCALE)
              )
            )
          ),
          env.globeRadius
        )
      ),
      ...[0.0225, 0.0255, 0.029].map((uCand) =>
        equirectangularToSphere(uCand, MARY_GEOISE_GLOBE_CENTER.v, env.globeRadius)
      ),
    ];

    for (const worldPt of eastCandidates) {
      if (
        !probeHullCollision(worldPt, env, SUNNY_COLLISION_RADIUS * 1.5).hit &&
        !probeCalmBeltBarrier(worldPt, env, SUNNY_COLLISION_RADIUS * 1.5).blocked
      ) {
        const up = normalize3(worldPt);
        const toRedPort = sub3(env.maryGeoise.origin, worldPt);
        const westHeading = normalize3(
          sub3(toRedPort, scale3(up, dot3(toRedPort, up)))
        );
        const nearest = findNearestChartedIsland(
          worldPt,
          locations,
          env.globeRadius
        );
        return {
          position: worldPt,
          heading: westHeading,
          elevation: 0,
          pitchAngle: 0,
          speed: 0,
          turnVelocity: 0,
          bankAngle: 0,
          collided: false,
          calmBeltBlocked: false,
          inReverseMountainCanal: false,
          reverseMountainPhase: null,
          skyZone: 'blue-sea',
          balloonDeploy: 0,
          knockUpStreamProgress: 0,
          nearestIsland: nearest.island,
          nearestDistance: nearest.distance,
        };
      }
    }
  }

  // Impel Down selected: place Sunny inside clear Tarai Current waters right off the Marine Transit Port facing the fortress
  if (targetIsland?.id === 'impel-down') {
    const lx = 0;
    const lz = 104;
    const worldPt = scale3(
      normalize3(
        add3(
          env.impelDown.origin,
          add3(
            scale3(env.impelDown.east, lx * IMPEL_DOWN_GLOBE_SCALE),
            scale3(env.impelDown.south, lz * IMPEL_DOWN_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(worldPt);
    const towardFortress = normalize3(
      sub3(
        scale3(env.impelDown.south, -1),
        scale3(up, dot3(scale3(env.impelDown.south, -1), up))
      )
    );
    if (!probeHullCollision(worldPt, env, SUNNY_COLLISION_RADIUS * 1.4).hit) {
      const nearest = findNearestChartedIsland(worldPt, locations, env.globeRadius);
      return {
        position: worldPt,
        heading: towardFortress,
        elevation: 0,
        pitchAngle: 0,
        speed: 0,
        turnVelocity: 0,
        bankAngle: 0,
        collided: false,
        calmBeltBlocked: false,
        inReverseMountainCanal: false,
        reverseMountainPhase: null,
        skyZone: 'blue-sea',
        balloonDeploy: 0,
        knockUpStreamProgress: 0,
        nearestIsland: nearest.island,
        nearestDistance: nearest.distance,
      };
    }
  }

  // Reverse Mountain selected: place Sunny inside the lower climbing East Blue canyon facing summit
  if (targetIsland?.id === 'reverse-mountain') {
    const lx = 86;
    const lz = -86;
    const pos = scale3(
      normalize3(
        add3(
          env.reverseMountain.origin,
          add3(
            scale3(env.reverseMountain.east, lx * RM_GLOBE_SCALE),
            scale3(env.reverseMountain.south, lz * RM_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(pos);
    const toSummit = sub3(env.reverseMountain.origin, pos);
    const heading = normalize3(sub3(toSummit, scale3(up, dot3(toSummit, up))));
    const rmInit = sampleReverseMountainMotion(pos, heading, env);
    const nearest = findNearestChartedIsland(pos, locations, env.globeRadius);
    return {
      position: pos,
      heading,
      elevation: rmInit.elevation,
      pitchAngle: rmInit.pitchAngle,
      speed: 0.095,
      turnVelocity: 0,
      bankAngle: 0,
      collided: false,
      calmBeltBlocked: false,
      inReverseMountainCanal: true,
      reverseMountainPhase: rmInit.phase,
      skyZone: 'blue-sea',
      balloonDeploy: 0,
      knockUpStreamProgress: 0,
      nearestIsland: nearest.island,
      nearestDistance: nearest.distance,
    };
  }

  // Twin Cape selected: spawn Sunny in clear Grand Line water right in front of the Twin Lighthouses & Laboon
  if (targetIsland?.id === 'twin-cape') {
    const lx = 128;
    const lz = -16;
    const pos = scale3(
      normalize3(
        add3(
          env.twinCape.origin,
          add3(
            scale3(env.twinCape.east, lx * TWIN_CAPE_GLOBE_SCALE),
            scale3(env.twinCape.south, lz * TWIN_CAPE_GLOBE_SCALE)
          )
        )
      ),
      env.globeRadius
    );
    const up = normalize3(pos);
    const lookWest = sub3(env.twinCape.origin, pos);
    const heading = normalize3(sub3(lookWest, scale3(up, dot3(lookWest, up))));
    const nearest = findNearestChartedIsland(pos, locations, env.globeRadius);
    return {
      position: pos,
      heading,
      elevation: 0,
      pitchAngle: 0,
      speed: 0,
      turnVelocity: 0,
      bankAngle: 0,
      collided: false,
      calmBeltBlocked: false,
      inReverseMountainCanal: false,
      reverseMountainPhase: null,
      skyZone: 'blue-sea',
      balloonDeploy: 0,
      knockUpStreamProgress: 0,
      nearestIsland: nearest.island,
      nearestDistance: nearest.distance,
    };
  }

  const anchor = targetIsland
    ? equirectangularToSphere(targetIsland.u, targetIsland.v, env.globeRadius)
    : equirectangularToSphere(0.552, 0.398, env.globeRadius);
  const anchorUp = normalize3(anchor);
  const refVec =
    Math.abs(anchorUp.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const tanE = normalize3(cross3(refVec, anchorUp));
  const tanS = normalize3(cross3(anchorUp, tanE));

  // Spiral search for clear open sea around the island facing inward toward the island
  for (let ring = 1; ring <= 16; ring++) {
    const r = 0.08 + ring * 0.045;
    for (let k = 0; k < 12; k++) {
      const angle = Math.PI * 0.5 + (k / 12) * Math.PI * 2;
      const candidate = scale3(
        normalize3(
          add3(
            anchor,
            add3(
              scale3(tanE, Math.cos(angle) * r),
              scale3(tanS, Math.sin(angle) * r)
            )
          )
        ),
        env.globeRadius
      );
      if (
        !probeHullCollision(candidate, env, SUNNY_COLLISION_RADIUS * 1.6).hit &&
        !probeCalmBeltBarrier(candidate, env, SUNNY_COLLISION_RADIUS * 1.6).blocked
      ) {
        const candUp = normalize3(candidate);
        const toIsland = sub3(anchor, candidate);
        const heading = normalize3(
          sub3(toIsland, scale3(candUp, dot3(toIsland, candUp)))
        );
        const nearest = findNearestChartedIsland(
          candidate,
          locations,
          env.globeRadius
        );
        return {
          position: candidate,
          heading,
          elevation: 0,
          pitchAngle: 0,
          speed: 0,
          turnVelocity: 0,
          bankAngle: 0,
          collided: false,
          calmBeltBlocked: false,
          inReverseMountainCanal: false,
          reverseMountainPhase: null,
          skyZone: 'blue-sea',
          balloonDeploy: 0,
          knockUpStreamProgress: 0,
          nearestIsland: nearest.island,
          nearestDistance: nearest.distance,
        };
      }
    }
  }

  // Fallback deep Paradise water
  const fallbackPos = equirectangularToSphere(0.542, 0.502, env.globeRadius);
  const fUp = normalize3(fallbackPos);
  const fEast = normalize3(cross3({ x: 0, y: 1, z: 0 }, fUp));
  return {
    position: fallbackPos,
    heading: fEast,
    elevation: 0,
    pitchAngle: 0,
    speed: 0,
    turnVelocity: 0,
    bankAngle: 0,
    collided: false,
    calmBeltBlocked: false,
    inReverseMountainCanal: false,
    reverseMountainPhase: null,
    skyZone: 'blue-sea',
    balloonDeploy: 0,
    knockUpStreamProgress: 0,
    nearestIsland: null,
    nearestDistance: 0,
  };
}

function rotateTangentHorizontally(
  vec: Vec3,
  fwd: Vec3,
  right: Vec3,
  up: Vec3,
  yaw: number
): Vec3 {
  const fComp = dot3(vec, fwd);
  const rComp = dot3(vec, right);
  const uComp = dot3(vec, up);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const newF = fComp * c - rComp * s;
  const newR = fComp * s + rComp * c;
  return add3(add3(scale3(fwd, newF), scale3(right, newR)), scale3(up, uComp));
}

export const SUNNY_ORBIT_PITCH_MIN = -0.44;
export const SUNNY_ORBIT_PITCH_MAX = 1.35;
export const SUNNY_ORBIT_DIST_MIN = 0.55;
export const SUNNY_ORBIT_DIST_MAX = 5.5;

/**
 * Computes true-to-scale Navigator Camera position & look target relative to Sunny Go,
 * applying mouse orbit rotation (`orbit.yaw`, `orbit.pitch`, `orbit.distanceScale`) around the ship.
 */
export function computeSunnyNavigatorCamera(
  state: SunnyState,
  mode: SunnyCameraMode,
  globeRadius: number,
  orbit: SunnyCameraOrbit = DEFAULT_SUNNY_CAMERA_ORBIT
): { position: Vec3; target: Vec3; up: Vec3 } {
  const up = normalize3(state.position);
  const shipPos3D = scale3(up, globeRadius + state.elevation);
  const fwd = normalize3(
    sub3(state.heading, scale3(up, dot3(state.heading, up)))
  );
  const right = normalize3(cross3(fwd, up));

  if (mode === 'deck') {
    const camPos = add3(
      add3(shipPos3D, scale3(fwd, SUNNY_WORLD_LENGTH * 0.27)),
      scale3(up, SUNNY_WORLD_LENGTH * 0.56)
    );
    const baseLookOffset = add3(
      scale3(fwd, SUNNY_WORLD_LENGTH * 2.4),
      scale3(
        up,
        SUNNY_WORLD_LENGTH *
          (0.28 + Math.sin(-orbit.pitch + state.pitchAngle * 0.75) * 1.65)
      )
    );
    const rotatedLook = rotateTangentHorizontally(
      baseLookOffset,
      fwd,
      right,
      up,
      orbit.yaw
    );
    const lookTarget = add3(shipPos3D, rotatedLook);
    return { position: camPos, target: lookTarget, up };
  }

  // Center of Sunny (mid-mast/deck) used as orbit pivot so 360° mouse drag circles Sunny cleanly
  const shipCenter = add3(shipPos3D, scale3(up, SUNNY_WORLD_LENGTH * 0.52));

  if (mode === 'overhead') {
    const lookTarget = add3(
      shipPos3D,
      scale3(up, SUNNY_WORLD_LENGTH * 0.35)
    );
    const baseOffset = add3(
      scale3(fwd, -SUNNY_WORLD_LENGTH * 6.8),
      scale3(up, SUNNY_WORLD_LENGTH * 7.4)
    );
    const horizLen = Math.hypot(
      dot3(baseOffset, fwd),
      dot3(baseOffset, right)
    );
    const vertLen = dot3(baseOffset, up);
    const totalDist =
      Math.hypot(horizLen, vertLen) *
      clamp(orbit.distanceScale, SUNNY_ORBIT_DIST_MIN, SUNNY_ORBIT_DIST_MAX);
    const basePitch = Math.atan2(vertLen, Math.max(1e-6, horizLen));
    const finalPitch = clamp(basePitch + orbit.pitch, -0.22, 1.44);

    const horizDirBase = normalize3(
      add3(
        scale3(fwd, dot3(baseOffset, fwd)),
        scale3(right, dot3(baseOffset, right))
      )
    );
    const horizDir = rotateTangentHorizontally(
      horizDirBase,
      fwd,
      right,
      up,
      orbit.yaw
    );
    const camOffset = add3(
      scale3(horizDir, Math.cos(finalPitch) * totalDist),
      scale3(up, Math.sin(finalPitch) * totalDist)
    );
    let camPos = add3(lookTarget, camOffset);
    const minR = globeRadius + state.elevation + SUNNY_WORLD_LENGTH * 0.36;
    if (Math.hypot(camPos.x, camPos.y, camPos.z) < minR) {
      camPos = scale3(normalize3(camPos), minR);
    }
    return { position: camPos, target: lookTarget, up };
  }

  // Navigator mode: positioned behind stern slightly above mast height, angled gently downward
  // across Sunny so the ship sits cleanly above the bottom HUD while the ocean & horizon ahead
  // remain completely unobstructed. Widen framing dynamically for Knock Up Stream & Giant Octopus Balloon glide.
  const isKUS = state.skyZone === 'knock-up-stream';
  const isBalloon = state.skyZone === 'balloon-glide';
  const behindDist = isKUS
    ? 14.5
    : isBalloon
      ? 11.8
      : state.inReverseMountainCanal
        ? 7.8
        : 7.6;
  const sideOffset = isKUS
    ? 5.2
    : isBalloon
      ? 2.2
      : state.inReverseMountainCanal
        ? 0.42
        : 0.68;
  const relHeight = isKUS
    ? 3.2
    : isBalloon
      ? 2.95
      : state.inReverseMountainCanal
        ? 1.25
        : 1.18;

  const baseCamOffset = add3(
    add3(
      scale3(fwd, -SUNNY_WORLD_LENGTH * behindDist),
      scale3(right, SUNNY_WORLD_LENGTH * sideOffset)
    ),
    scale3(up, SUNNY_WORLD_LENGTH * relHeight)
  );

  const horizLen = Math.hypot(
    dot3(baseCamOffset, fwd),
    dot3(baseCamOffset, right)
  );
  const vertLen = dot3(baseCamOffset, up);
  const distScale = clamp(
    orbit.distanceScale,
    SUNNY_ORBIT_DIST_MIN,
    SUNNY_ORBIT_DIST_MAX
  );
  const totalDist = Math.hypot(horizLen, vertLen) * distScale;
  const basePitch = Math.atan2(vertLen, Math.max(1e-6, horizLen));
  const slopeBias = isKUS
    ? -0.08
    : isBalloon
      ? 0.06
      : state.inReverseMountainCanal
        ? -state.pitchAngle * 0.55
        : -state.pitchAngle * 0.35;
  const finalPitch = clamp(basePitch + orbit.pitch + slopeBias, -0.78, 1.38);

  const horizDirBase = normalize3(
    add3(
      scale3(fwd, dot3(baseCamOffset, fwd)),
      scale3(right, dot3(baseCamOffset, right))
    )
  );
  const horizDir = rotateTangentHorizontally(
    horizDirBase,
    fwd,
    right,
    up,
    orbit.yaw
  );

  const camOffset = add3(
    scale3(horizDir, Math.cos(finalPitch) * totalDist),
    scale3(up, Math.sin(finalPitch) * totalDist)
  );
  let camPos = add3(shipCenter, camOffset);

  // Keep camera above ocean surface; if pitching below wave clearance, tilt gaze upward smoothly
  const minWaterClearance = SUNNY_WORLD_LENGTH * 0.24;
  const minR = globeRadius + state.elevation + minWaterClearance;
  const minSafeOffsetUp = -(SUNNY_WORLD_LENGTH * 0.52 - minWaterClearance);
  const waterFloorPitch = Math.asin(
    clamp(minSafeOffsetUp / Math.max(1e-6, totalDist), -0.99, 0.99)
  );
  let clippedUpPitch = 0;
  if (Math.hypot(camPos.x, camPos.y, camPos.z) < minR) {
    camPos = scale3(normalize3(camPos), minR);
    clippedUpPitch = Math.max(0, waterFloorPitch - finalPitch);
  }

  // Smoothly blend look target from horizon ahead back onto shipCenter when pitching steep or zooming far out
  const pitchDownFactor = Math.max(0, orbit.pitch);
  const zoomOutFactor = Math.max(0, distScale - 1.0);
  const horizonWeight =
    Math.exp(-pitchDownFactor * 1.8) * Math.exp(-zoomOutFactor * 0.55);
  const lookAheadDist =
    SUNNY_WORLD_LENGTH *
    (isKUS ? 2.6 : isBalloon ? 4.2 : state.inReverseMountainCanal ? 5.0 : 5.6) *
    horizonWeight;

  const horizSpan = Math.max(
    SUNNY_WORLD_LENGTH * 3.0,
    Math.cos(Math.max(0, waterFloorPitch)) * totalDist + lookAheadDist
  );
  const skyTiltUp =
    clippedUpPitch > 0
      ? Math.tan(Math.min(clippedUpPitch, 0.22)) * horizSpan
      : 0;

  const lookUpOffset = isKUS
    ? SUNNY_WORLD_LENGTH * 1.15
    : isBalloon
      ? SUNNY_WORLD_LENGTH * 0.65
      : SUNNY_WORLD_LENGTH *
          (-0.22 * horizonWeight +
            Math.sin(state.pitchAngle) *
              (state.inReverseMountainCanal ? 3.2 : 1.15)) +
        skyTiltUp;

  const rotatedLookFwd = rotateTangentHorizontally(
    scale3(fwd, lookAheadDist),
    fwd,
    right,
    up,
    orbit.yaw
  );
  const lookTarget = add3(
    shipCenter,
    add3(rotatedLookFwd, scale3(up, lookUpOffset))
  );

  return { position: camPos, target: lookTarget, up };
}

export interface TitleScreenSunnyFraming {
  sunnyState: SunnyState;
  cameraPosition: Vec3;
  cameraTarget: Vec3;
  cameraUp: Vec3;
}

/**
 * Computes Thousand Sunny's foreground anchorage and plunging ("vue plongeante")
 * camera framing off Dawn Island (Foosha Crescent Bay, Windmill & Mt. Colubo),
 * keeping Sunny's wooden/crimson bulwark, deck, sail, and Lion Prow prominent in
 * the lower-right foreground while Dawn Island rises across the sparkling sea.
 */
export function computeTitleScreenSunnyAndCamera(
  env: SunnyCollisionEnv,
  elapsed = 0
): TitleScreenSunnyFraming {
  const L = SUNNY_WORLD_LENGTH;
  const pos = scale3(
    normalize3(
      add3(
        env.dawn.origin,
        add3(
          scale3(env.dawn.east, 94 * DAWN_GLOBE_SCALE),
          scale3(env.dawn.south, -50 * DAWN_GLOBE_SCALE)
        )
      )
    ),
    env.globeRadius
  );
  const fooshaTargetPos = scale3(
    normalize3(
      add3(
        env.dawn.origin,
        add3(
          scale3(env.dawn.east, 56 * DAWN_GLOBE_SCALE),
          scale3(env.dawn.south, -16 * DAWN_GLOBE_SCALE)
        )
      )
    ),
    env.globeRadius
  );
  const up = normalize3(pos);
  const rawFwd = sub3(fooshaTargetPos, pos);
  const fwd = normalize3(sub3(rawFwd, scale3(up, dot3(rawFwd, up))));
  const right = normalize3(cross3(fwd, up));

  const pitchBob = Math.sin(elapsed * 1.05) * 0.013;
  const bankBob = Math.cos(elapsed * 0.82) * 0.02;

  const sunnyState: SunnyState = {
    position: pos,
    heading: fwd,
    elevation: 0,
    pitchAngle: pitchBob,
    speed: 0.035,
    turnVelocity: 0,
    bankAngle: bankBob,
    collided: false,
    calmBeltBlocked: false,
    inReverseMountainCanal: false,
    reverseMountainPhase: null,
    skyZone: 'blue-sea',
    balloonDeploy: 0,
    knockUpStreamProgress: 0,
    nearestIsland: null,
    nearestDistance: 0,
  };

  const swaySide = Math.sin(elapsed * 0.28) * (L * 0.05);
  const swayUp = Math.cos(elapsed * 0.36) * (L * 0.022);

  // Elevated 3/4 port-quarter plunging angle: frames Sunny's wooden/crimson
  // railing ("bastingage"), deck, sail & Lion Prow in the lower-right foreground
  // overlooking sparkling Foosha Bay, the Windmill, and Mt. Colubo.
  let cameraPosition = add3(
    pos,
    add3(
      add3(
        scale3(fwd, -L * 1.48),
        scale3(right, -L * 0.96 + swaySide)
      ),
      scale3(up, L * 0.74 + swayUp)
    )
  );
  const minR = env.globeRadius + L * 0.32;
  if (Math.hypot(cameraPosition.x, cameraPosition.y, cameraPosition.z) < minR) {
    cameraPosition = scale3(normalize3(cameraPosition), minR);
  }

  const cameraTarget = add3(
    pos,
    add3(
      add3(scale3(fwd, L * 5.2), scale3(right, -L * 0.72)),
      scale3(up, L * 0.08)
    )
  );

  return {
    sunnyState,
    cameraPosition,
    cameraTarget,
    cameraUp: up,
  };
}


