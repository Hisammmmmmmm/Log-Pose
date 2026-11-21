import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CSS2DObject,
  CSS2DRenderer,
} from 'three/addons/renderers/CSS2DRenderer.js';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import {
  createSharedIslandMaterials,
  type IslandMeshInstance,
} from '../islands/types';
import {
  CUSTOM_3D_ISLAND_IDS,
  HEAVY_CITY_ISLAND_IDS,
  loadIslandBuilder,
} from '../islands/lazyRegistry';
import {
  buildOrderedPreloadIds,
  computeStartupPreloadProgress,
  startCooperativePreloadQueue,
  type StartupPreloadState,
} from '../utils/backgroundPreloader';
import type { LoadingIslandInfo } from '../utils/islandLoading';
import type { SfxSoundId, UiSoundId } from '../utils/gameAudio';
import {
  ALABASTA_ANGULAR_MASK_RADIUS,
  ALABASTA_CAMERA_PRESETS,
  ALABASTA_GLOBE_CENTER,
  ALABASTA_GLOBE_SCALE,
  sampleAlabastaHeight,
  toAlabastaSphereLocal,
} from '../utils/alabastaTerrain';
import {
  SKYPIEA_ALTITUDE,
  SKYPIEA_CAMERA_PRESETS,
  SKYPIEA_GLOBE_CENTER,
  SKYPIEA_GLOBE_SCALE,
  SKYPIEA_SUB_LOCATIONS,
  getKnockUpStreamGlobeCoords,
  sampleSkypieaWalkSurfaceHeight,
  toSkypieaSphereLocal,
} from '../utils/skypieaTerrain';
import {
  createKnockUpStreamModel,
  type KnockUpStreamHandle,
} from '../utils/knockUpStreamModel';
import {
  WATER7_ANGULAR_MASK_RADIUS,
  WATER7_CAMERA_PRESETS,
  WATER7_GLOBE_CENTER,
  WATER7_GLOBE_SCALE,
  sampleWater7WalkSurfaceHeight,
  toWater7SphereLocal,
} from '../utils/water7Terrain';
import {
  MARINEFORD_ANGULAR_MASK_RADIUS,
  MARINEFORD_CAMERA_PRESETS,
  MARINEFORD_GLOBE_CENTER,
  MARINEFORD_GLOBE_SCALE,
  sampleMarinefordWalkSurfaceHeight,
  toMarinefordSphereLocal,
} from '../utils/marinefordTerrain';
import {
  LOGUETOWN_ANGULAR_MASK_RADIUS,
  LOGUETOWN_CAMERA_PRESETS,
  LOGUETOWN_GLOBE_CENTER,
  LOGUETOWN_GLOBE_SCALE,
  sampleLoguetownWalkSurfaceHeight,
  toLoguetownSphereLocal,
} from '../utils/loguetownTerrain';
import {
  CONOMI_ANGULAR_MASK_RADIUS,
  CONOMI_CAMERA_PRESETS,
  CONOMI_GLOBE_CENTER,
  CONOMI_GLOBE_SCALE,
  CONOMI_SUB_LOCATIONS,
  sampleConomiWalkSurfaceHeight,
  toConomiSphereLocal,
} from '../utils/conomiTerrain';
import {
  GECKO_ANGULAR_MASK_RADIUS,
  GECKO_CAMERA_PRESETS,
  GECKO_GLOBE_CENTER,
  GECKO_GLOBE_SCALE,
  GECKO_SUB_LOCATIONS,
  sampleGeckoWalkSurfaceHeight,
  toGeckoSphereLocal,
} from '../utils/geckoTerrain';
import {
  DAWN_ANGULAR_MASK_RADIUS,
  DAWN_CAMERA_PRESETS,
  DAWN_GLOBE_CENTER,
  DAWN_GLOBE_SCALE,
  DAWN_SUB_LOCATIONS,
  sampleDawnWalkSurfaceHeight,
  toDawnSphereLocal,
} from '../utils/dawnTerrain';
import {
  GOAT_ANGULAR_MASK_RADIUS,
  GOAT_CAMERA_PRESETS,
  GOAT_GLOBE_CENTER,
  GOAT_GLOBE_SCALE,
  sampleGoatWalkSurfaceHeight,
  toGoatSphereLocal,
} from '../utils/goatTerrain';
import {
  SHELLS_ANGULAR_MASK_RADIUS,
  SHELLS_CAMERA_PRESETS,
  SHELLS_GLOBE_CENTER,
  SHELLS_GLOBE_SCALE,
  sampleShellsWalkSurfaceHeight,
  toShellsSphereLocal,
} from '../utils/shellsTownTerrain';
import {
  ORGAN_ANGULAR_MASK_RADIUS,
  ORGAN_CAMERA_PRESETS,
  ORGAN_GLOBE_CENTER,
  ORGAN_GLOBE_SCALE,
  ORGAN_SUB_LOCATIONS,
  sampleOrganWalkSurfaceHeight,
  toOrganSphereLocal,
} from '../utils/organTerrain';
import {
  SHIMOTSUKI_ANGULAR_MASK_RADIUS,
  SHIMOTSUKI_CAMERA_PRESETS,
  SHIMOTSUKI_GLOBE_CENTER,
  SHIMOTSUKI_GLOBE_SCALE,
  SHIMOTSUKI_SPHERE_SEA_OFFSET,
  sampleShimotsukiWalkSurfaceHeight,
  toShimotsukiSphereLocal,
} from '../utils/shimotsukiTerrain';
import {
  BARATIE_ANGULAR_MASK_RADIUS,
  BARATIE_CAMERA_PRESETS,
  BARATIE_GLOBE_CENTER,
  BARATIE_GLOBE_SCALE,
  BARATIE_SPHERE_SEA_OFFSET,
  sampleBaratieWalkSurfaceHeight,
  toBaratieSphereLocal,
} from '../utils/baratieTerrain';
import {
  RM_ANGULAR_MASK_RADIUS,
  RM_CAMERA_PRESETS,
  RM_GLOBE_CENTER,
  RM_GLOBE_SCALE,
  RM_SUMMIT_WATER_Y,
  sampleReverseMountainAt,
  sampleReverseMountainHeight,
  toReverseMountainSphereLocal,
  type ReverseMountainPhase,
} from '../utils/reverseMountainTerrain';
import {
  TWIN_CAPE_CAMERA_PRESETS,
  TWIN_CAPE_GLOBE_CENTER,
  TWIN_CAPE_GLOBE_SCALE,
  sampleTwinCapeWalkSurfaceHeight,
  toTwinCapeSphereLocal,
} from '../utils/twinCapeTerrain';
import {
  LITTLE_GARDEN_ANGULAR_MASK_RADIUS,
  LITTLE_GARDEN_CAMERA_PRESETS,
  LITTLE_GARDEN_GLOBE_CENTER,
  LITTLE_GARDEN_GLOBE_SCALE,
  LITTLE_GARDEN_SPHERE_SEA_OFFSET,
  sampleLittleGardenWalkSurfaceHeight,
  toLittleGardenSphereLocal,
} from '../utils/littleGardenTerrain';
import {
  CACTUS_ANGULAR_MASK_RADIUS,
  CACTUS_CAMERA_PRESETS,
  CACTUS_GLOBE_CENTER,
  CACTUS_GLOBE_SCALE,
  CACTUS_SPHERE_SEA_OFFSET,
  sampleCactusWalkSurfaceHeight,
  toCactusSphereLocal,
} from '../utils/cactusTerrain';
import {
  DRUM_ANGULAR_MASK_RADIUS,
  DRUM_CAMERA_PRESETS,
  DRUM_GLOBE_CENTER,
  DRUM_GLOBE_SCALE,
  DRUM_SPHERE_SEA_OFFSET,
  sampleDrumWalkSurfaceHeight,
  toDrumSphereLocal,
} from '../utils/drumTerrain';
import {
  JAYA_ANGULAR_MASK_RADIUS,
  JAYA_CAMERA_PRESETS,
  JAYA_GLOBE_CENTER,
  JAYA_GLOBE_SCALE,
  JAYA_SPHERE_SEA_OFFSET,
  sampleJayaWalkSurfaceHeight,
  toJayaSphereLocal,
} from '../utils/jayaTerrain';
import {
  LONG_RING_ANGULAR_MASK_RADIUS,
  LONG_RING_CAMERA_PRESETS,
  LONG_RING_GLOBE_CENTER,
  LONG_RING_GLOBE_SCALE,
  LONG_RING_SPHERE_SEA_OFFSET,
  sampleLongRingWalkSurfaceHeight,
  toLongRingSphereLocal,
} from '../utils/longRingTerrain';
import {
  createSeaTrainNetworkModel,
  type SeaTrainNetworkHandle,
} from '../islands/sea-train-network';
import {
  PUCCI_CAMERA_PRESETS,
  PUCCI_GLOBE_CENTER,
  SAN_FALDO_CAMERA_PRESETS,
  SAN_FALDO_GLOBE_CENTER,
  SHIFT_ANGULAR_MASK_RADIUS,
  SHIFT_CAMERA_PRESETS,
  SHIFT_GLOBE_CENTER,
  SHIFT_GLOBE_SCALE,
  SHIFT_SPHERE_SEA_OFFSET,
  STATION_ISLAND_ANGULAR_MASK_RADIUS,
  STATION_ISLAND_GLOBE_SCALE,
  STATION_ISLAND_SPHERE_SEA_OFFSET,
  ST_POPLAR_CAMERA_PRESETS,
  ST_POPLAR_GLOBE_CENTER,
  samplePucciWalkSurfaceHeight,
  sampleSanFaldoWalkSurfaceHeight,
  sampleShiftWalkSurfaceHeight,
  sampleStPoplarWalkSurfaceHeight,
  toShiftSphereLocal,
  toStationIslandSphereLocal,
} from '../utils/seaTrainStationsTerrain';
import {
  ENIES_ANGULAR_MASK_RADIUS,
  ENIES_CAMERA_PRESETS,
  ENIES_GLOBE_CENTER,
  ENIES_GLOBE_SCALE,
  getEniesAbyssCosThreshold,
  sampleEniesWalkSurfaceHeight,
  toEniesSphereLocal,
} from '../utils/eniesLobbyTerrain';
import {
  AMAZON_LILY_ANGULAR_MASK_RADIUS,
  AMAZON_LILY_CAMERA_PRESETS,
  AMAZON_LILY_GLOBE_CENTER,
  AMAZON_LILY_GLOBE_SCALE,
  sampleAmazonLilyWalkSurfaceHeight,
  toAmazonLilySphereLocal,
} from '../utils/amazonLilyTerrain';
import {
  THRILLER_BARK_ANGULAR_MASK_RADIUS,
  THRILLER_BARK_CAMERA_PRESETS,
  THRILLER_BARK_GLOBE_CENTER,
  THRILLER_BARK_GLOBE_SCALE,
  sampleThrillerBarkWalkSurfaceHeight,
  toThrillerBarkSphereLocal,
} from '../utils/thrillerBarkTerrain';
import {
  SABAODY_ANGULAR_MASK_RADIUS,
  SABAODY_CAMERA_PRESETS,
  SABAODY_GLOBE_CENTER,
  SABAODY_GLOBE_SCALE,
  sampleSabaodyWalkSurfaceHeight,
  toSabaodySphereLocal,
} from '../utils/sabaodyTerrain';
import {
  PUNK_HAZARD_ANGULAR_MASK_RADIUS,
  PUNK_HAZARD_CAMERA_PRESETS,
  PUNK_HAZARD_GLOBE_CENTER,
  PUNK_HAZARD_GLOBE_SCALE,
  samplePunkHazardWalkSurfaceHeight,
  toPunkHazardSphereLocal,
} from '../utils/punkHazardTerrain';
import {
  DRESSROSA_ANGULAR_MASK_RADIUS,
  DRESSROSA_CAMERA_PRESETS,
  DRESSROSA_GLOBE_CENTER,
  DRESSROSA_GLOBE_SCALE,
  DRESSROSA_SUB_LOCATIONS,
  sampleDressrosaWalkSurfaceHeight,
  toDressrosaSphereLocal,
} from '../utils/dressrosaTerrain';
import {
  TOTTO_LAND_ANGULAR_MASK_RADIUS,
  TOTTO_LAND_CAMERA_PRESETS,
  TOTTO_LAND_GLOBE_CENTER,
  TOTTO_LAND_GLOBE_SCALE,
  TOTTO_LAND_SUB_LOCATIONS,
  sampleTottoLandWalkSurfaceHeight,
  toTottoLandSphereLocal,
} from '../utils/tottoLandTerrain';
import {
  ZOU_ANGULAR_MASK_RADIUS,
  ZOU_BACK_DECK_Y,
  ZOU_CAMERA_PRESETS,
  ZOU_GLOBE_CENTER,
  ZOU_GLOBE_SCALE,
  sampleZouWalkSurfaceHeight,
  toZouSphereLocal,
} from '../utils/zouTerrain';
import {
  WANO_ANGULAR_MASK_RADIUS,
  WANO_CAMERA_PRESETS,
  WANO_GLOBE_CENTER,
  WANO_GLOBE_SCALE,
  WANO_PLATEAU_Y,
  WANO_SUB_LOCATIONS,
  sampleWanoWalkSurfaceHeight,
  toWanoSphereLocal,
} from '../utils/wanoTerrain';
import {
  EGGHEAD_ANGULAR_MASK_RADIUS,
  EGGHEAD_CAMERA_PRESETS,
  EGGHEAD_CLOUD_DECK_Y,
  EGGHEAD_GLOBE_CENTER,
  EGGHEAD_GLOBE_SCALE,
  EGGHEAD_SUB_LOCATIONS,
  sampleEggheadWalkSurfaceHeight,
  toEggheadSphereLocal,
} from '../utils/eggheadTerrain';
import {
  ELBAF_ANGULAR_MASK_RADIUS,
  ELBAF_CAMERA_PRESETS,
  ELBAF_GLOBE_CENTER,
  ELBAF_GLOBE_SCALE,
  ELBAF_HEAVEN_Y,
  ELBAF_SUB_LOCATIONS,
  sampleElbafWalkSurfaceHeight,
  toElbafSphereLocal,
} from '../utils/elbafTerrain';
import {
  MARY_GEOISE_ALTITUDE,
  MARY_GEOISE_ANGULAR_MASK_RADIUS,
  MARY_GEOISE_CAMERA_PRESETS,
  MARY_GEOISE_GLOBE_CENTER,
  MARY_GEOISE_GLOBE_SCALE,
  sampleMaryGeoiseCameraFloorHeight,
  sampleMaryGeoiseWalkSurfaceHeight,
  toMaryGeoiseSphereLocal,
} from '../utils/maryGeoiseTerrain';
import {
  FISH_MAN_CAMERA_PRESETS,
  FISH_MAN_DEPTH,
  FISH_MAN_GLOBE_CENTER,
  FISH_MAN_GLOBE_SCALE,
  SUBSEA_PLUNGE_GLOBE_COORDS,
  sampleFishManCameraFloorHeight,
  sampleFishManHeight,
  toFishManSphereLocal,
} from '../utils/fishManIslandTerrain';
import {
  createSubseaPlungeModel,
  type SubseaPlungeHandle,
} from '../utils/subseaPlungeModel';
import {
  IMPEL_DOWN_ANGULAR_MASK_RADIUS,
  IMPEL_DOWN_CAMERA_PRESETS,
  IMPEL_DOWN_GLOBE_CENTER,
  IMPEL_DOWN_GLOBE_SCALE,
  getImpelAbyssCosThreshold,
  sampleImpelCameraFloorHeight,
  sampleImpelWalkSurfaceHeight,
  toImpelSphereLocal,
} from '../utils/impelDownTerrain';
import {
  getEniesOrientedBasis,
  getImpelDownOrientedBasis,
  getTaraiCentroidWorld,
} from '../utils/taraiCurrentNetwork';
import {
  createTaraiCurrentNetworkModel,
  type TaraiCurrentNetworkHandle,
} from '../islands/tarai-current-network';
import {
  advanceSolarHour,
  computeDaylightFactor,
  computeSunPosition,
  equirectangularToSphere,
  shortestSolarHourDelta,
  type IslandLocation,
} from '../utils/globeMath';
import {
  createOceanNormalTexture,
  processWorldMapImageProgressive,
  type ProcessedGlobeMaps,
} from '../utils/mapProcessor';
import {
  CLOUD_SHADOW_GLSL_PARS,
  computeLocalNavigationSunDir,
  createGlobeCloudSystem,
  sampleCloudWeatherUnderPoint,
  type UnderCloudWeatherSample,
} from '../utils/globeClouds';
import { createCloudWeatherEffects } from '../utils/cloudWeatherEffects';
import { createIslandMistSystem } from '../utils/islandMist';
import {
  createThousandSunnyModel,
  type SunnyShipHandle,
} from '../utils/sunnyModel';
import {
  DEFAULT_SUNNY_CAMERA_ORBIT,
  SUNNY_ORBIT_DIST_MAX,
  SUNNY_ORBIT_DIST_MIN,
  SUNNY_ORBIT_PITCH_MAX,
  SUNNY_ORBIT_PITCH_MIN,
  SUNNY_WORLD_LENGTH,
  computeSunnyNavigatorCamera,
  computeTitleScreenSunnyAndCamera,
  createDefaultSunnyCollisionEnv,
  createInitialSunnyBoostState,
  createSafeSunnySpawn,
  resurfaceToNewWorld,
  stepSunnyBoostState,
  stepSunnySailing,
  triggerSunnyBoost,
  worldPosToEquirectangular,
  type SunnyBoostState,
  type SunnyCameraMode,
  type SunnyCameraOrbit,
  type SunnyCollisionEnv,
  type SunnyControlInput,
  type SunnySkyZone,
  type SunnyState,
} from '../utils/sunnyNavigation';
import { computeLogPoseGuidance } from '../utils/mugiwaraRoute';
import {
  OCEAN_LOCAL_WAVE_TRAINS,
  OCEAN_SEA_LEVEL_OFFSET,
  OCEAN_VERTEX_SWELL_TRAINS,
  sampleOceanWaveSurface,
} from '../utils/oceanWaves';

const OCEAN_VERTEX_SWELL_GLSL = OCEAN_VERTEX_SWELL_TRAINS.map(
  (w) =>
    `  { float ph = dot(oceanUnitV, vec3(${w.kx.toFixed(2)}, ${w.ky.toFixed(2)}, ${w.kz.toFixed(2)})) - uTime * ${w.speed.toFixed(2)}; float s = sin(ph); oceanSwellV += (s + 0.28 * (s * s - 0.5)) * ${w.amp.toFixed(6)}; }`
).join('\n');

const OCEAN_EVAL_WAVES_GLSL = `
void evalOceanWaves(vec3 unitPos, float t, float waveScale, float closeFade, float microFade, out float crestFactor, out vec3 totalGrad) {
  float h = 0.0;
  float maxAmp = 0.0;
  totalGrad = vec3(0.0);
  float localGradWeight = mix(0.18, 1.0, closeFade);
${OCEAN_VERTEX_SWELL_TRAINS.map(
  (w) =>
    `  { vec3 k = vec3(${w.kx.toFixed(2)}, ${w.ky.toFixed(2)}, ${w.kz.toFixed(2)}); float ph = dot(unitPos, k) - t * ${w.speed.toFixed(2)}; float s = sin(ph); float c = cos(ph); h += (s + 0.28 * (s * s - 0.5)) * ${w.amp.toFixed(6)} * waveScale; maxAmp += ${w.amp.toFixed(6)} * waveScale; vec3 tang = (k - unitPos * dot(k, unitPos)) / ${Math.hypot(w.kx, w.ky, w.kz).toFixed(4)}; totalGrad += tang * (c * ${w.slopeGain.toFixed(4)} * waveScale); }`
).join('\n')}
${OCEAN_LOCAL_WAVE_TRAINS.map(
  (w) =>
    `  { vec3 k = vec3(${w.kx.toFixed(2)}, ${w.ky.toFixed(2)}, ${w.kz.toFixed(2)}); float ph = dot(unitPos, k) - t * ${w.speed.toFixed(2)}; float s = sin(ph); float c = cos(ph); h += (s + 0.28 * (s * s - 0.5)) * ${w.amp.toFixed(6)} * waveScale; maxAmp += ${w.amp.toFixed(6)} * waveScale; vec3 tang = (k - unitPos * dot(k, unitPos)) / ${Math.hypot(w.kx, w.ky, w.kz).toFixed(4)}; totalGrad += tang * (c * ${w.slopeGain.toFixed(4)} * waveScale * localGradWeight); }`
).join('\n')}
  if (microFade > 0.005) {
    vec3 kA = vec3(3950.0, 2240.0, -3410.0);
    float cA = cos(dot(unitPos, kA) - t * 5.2);
    vec3 tA = (kA - unitPos * dot(kA, unitPos)) / 5679.7;
    totalGrad += tA * (cA * 0.082 * waveScale * microFade);

    vec3 kB = vec3(-5480.0, 4120.0, 4690.0);
    float cB = cos(dot(unitPos, kB) - t * 6.4);
    vec3 tB = (kB - unitPos * dot(kB, unitPos)) / 8294.7;
    totalGrad += tB * (cB * 0.068 * waveScale * microFade);

    vec3 kC = vec3(7920.0, -6350.0, 5840.0);
    float cC = cos(dot(unitPos, kC) - t * 7.8);
    vec3 tC = (kC - unitPos * dot(kC, unitPos)) / 11711.3;
    totalGrad += tC * (cC * 0.052 * waveScale * microFade);
  }
  crestFactor = clamp(0.5 + (h / max(maxAmp, 0.000001)) * 0.5, 0.0, 1.0);
}
`;

const ZERO_WAVE_SAMPLE = {
  seaLevelOffset: 0,
  waveHeight: 0,
  crestFactor: 0.5,
  pitchSlope: 0,
  rollSlope: 0,
};

export const GLOBE_RADIUS = 10;
const TERRAIN_SEA_FLOOR_OFFSET = -0.14;
const TERRAIN_RELIEF_SCALE = 1.18;
const DEFAULT_CAMERA_POS = new THREE.Vector3(26.8, 6.6, 14.8);

// Reusable scratch math objects (zero GC in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _vForward = new THREE.Vector3();
const _vRight = new THREE.Vector3();
const _vMove = new THREE.Vector3();
const _vFocus = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();
const _upVec = new THREE.Vector3(0, 1, 0);
const _basisMat = new THREE.Matrix4();
const _dummyObj = new THREE.Object3D();
const _tmpColor = new THREE.Color();
const _spaceBg = new THREE.Color(0x030712);
const _daySkyBg = new THREE.Color(0x69b0e4);
const _twilightSkyBg = new THREE.Color(0xd27e4c);
const _florianSkyBg = new THREE.Color(0x11091f);
const _florianSunTint = new THREE.Color(0xc8bce8);
const _florianHemiSky = new THREE.Color(0x7658a6);
const _florianHemiGround = new THREE.Color(0x18102a);
const _florianOceanTint = new THREE.Color(0x282d4c);
const _fmiAbyssBg = new THREE.Color(0x04263b);
const _fmiSunTint = new THREE.Color(0x9be7ff);
const _fmiHemiSky = new THREE.Color(0x38bdf8);
const _fmiHemiGround = new THREE.Color(0x062038);
const _skyTarget = new THREE.Color();

export interface IslandDiveTarget {
  island:
    | 'alabasta'
    | 'skypiea'
    | 'water-7'
    | 'marineford'
    | 'polestar-islands'
    | 'conomi-islands'
    | 'gecko-islands'
    | 'dawn-island'
    | 'goat-island'
    | 'shells-town'
    | 'organ-island'
    | 'shimotsuki'
    | 'baratie'
    | 'reverse-mountain'
    | 'twin-cape'
    | 'little-garden'
    | 'cactus-island'
    | 'drum-island'
    | 'jaya'
    | 'long-ring-long-land'
    | 'shift-station'
    | 'pucci-island'
    | 'san-faldo'
    | 'st-poplar'
    | 'enies-lobby'
    | 'impel-down'
    | 'amazon-lily'
    | 'thriller-bark'
    | 'sabaody'
    | 'mary-geoise'
    | 'fish-man-island'
    | 'punk-hazard'
    | 'dressrosa'
    | 'whole-cake-island'
    | 'zou'
    | 'wano'
    | 'egghead-island'
    | 'elbaf';
  presetId: string;
  trigger: number;
}

export interface SunnyTelemetry {
  speedKnots: number;
  collided: boolean;
  calmBeltBlocked: boolean;
  inReverseMountainCanal: boolean;
  reverseMountainPhase: ReverseMountainPhase | null;
  skyZone: SunnySkyZone;
  balloonDeploy: number;
  knockUpStreamProgress: number;
  coated: boolean;
  coatingRequiredBlocked: boolean;
  subseaDiveProgress: number;
  elevationMeters: number;
  pitchDeg: number;
  u: number;
  v: number;
  shipMapHeadingDeg: number;
  logPoseRelativeAngleDeg: number;
  logPoseDistanceKm: number;
  orbitYawDeg: number;
  orbitPitchDeg: number;
  nearestIslandName: string | null;
  nearestDistanceKm: number;
  boostActive: boolean;
  boostRemainingSec: number;
  boostCooldownSec: number;
}

export interface SunnyActionSignal {
  action: 'resurface' | 'boost';
  trigger: number;
}

export interface WorldAudioStateUpdate {
  seaRoughness: number;
  rainIntensity: number;
  snowIntensity: number;
  weatherType: 'cumulus' | 'gray' | 'rain' | 'storm' | 'snow' | null;
  cameraSurfaceMix: number;
}

export interface OnePieceGlobeProps {
  mapSourceUrl: string;
  selectedIsland: IslandLocation | null;
  onSelectIsland: (island: IslandLocation | null) => void;
  showLabels: boolean;
  cloudCover: number;
  timeOfDay: number;
  resetSignal: number;
  diveTarget?: IslandDiveTarget | null;
  sailingActive?: boolean;
  sunnyCameraMode?: SunnyCameraMode;
  sunnyControlRef?: React.MutableRefObject<SunnyControlInput>;
  sunnyWarpTarget?: { island: IslandLocation | null; trigger: number } | null;
  sunnyActionSignal?: SunnyActionSignal | null;
  mugiwaraTargetIsland?: IslandLocation | null;
  onSunnyTelemetry?: (telemetry: SunnyTelemetry) => void;
  onSailingPreparingChange?: (preparing: boolean) => void;
  onLoadedIslandsChange?: (ids: string[]) => void;
  onLoadingIslandsChange?: (loadingIslands: LoadingIslandInfo[]) => void;
  isPaused?: boolean;
  titleScreenActive?: boolean;
  loadingScreenActive?: boolean;
  retryLoadSignal?: number;
  onPreloadProgressChange?: (completed: number, total: number) => void;
  onPreloadStatusChange?: (status: StartupPreloadState) => void;
  onStartupPreloadComplete?: () => void;
  onMapLoadStateChange?: (loading: boolean, error: string | null) => void;
  onWorldAudioUpdate?: (update: WorldAudioStateUpdate) => void;
  onPlayAudioSfx?: (id: SfxSoundId | UiSoundId, intensity?: number, cooldownMs?: number) => void;
}

interface FlyTransition {
  active: boolean;
  startTime: number;
  duration: number;
  startCamDir: THREE.Vector3;
  targetCamDir: THREE.Vector3;
  startCamDist: number;
  targetCamDist: number;
  startLookAt: THREE.Vector3;
  targetLookAt: THREE.Vector3;
}

interface MarkerRecord {
  island: IslandLocation;
  group: THREE.Group;
  hitProxy: THREE.Mesh;
  ringMesh: THREE.Mesh;
  gemMesh: THREE.Mesh;
  labelObj: CSS2DObject;
  labelBtn: HTMLButtonElement;
  basePos: THREE.Vector3;
  normal: THREE.Vector3;
  priority: number;
}

function getMarkerPriority(island: IslandLocation): number {
  switch (island.notability) {
    case 'Legend':
      return 4;
    case 'Major Power':
      return 3;
    case 'Grand Line':
      return 2;
    default:
      return 1;
  }
}

function terrainRadiusAtHeight(hNorm: number): number {
  if (hNorm < 0.06) {
    return GLOBE_RADIUS + TERRAIN_SEA_FLOOR_OFFSET;
  }
  return GLOBE_RADIUS - 0.06 + hNorm * TERRAIN_RELIEF_SCALE;
}

export function OnePieceGlobe({
  mapSourceUrl,
  selectedIsland,
  onSelectIsland,
  showLabels,
  cloudCover,
  timeOfDay,
  resetSignal,
  diveTarget,
  sailingActive = false,
  sunnyCameraMode = 'navigator',
  sunnyControlRef,
  sunnyWarpTarget,
  sunnyActionSignal,
  mugiwaraTargetIsland = null,
  onSunnyTelemetry,
  onSailingPreparingChange,
  onLoadedIslandsChange,
  onLoadingIslandsChange,
  isPaused = false,
  titleScreenActive = false,
  loadingScreenActive = false,
  retryLoadSignal = 0,
  onPreloadProgressChange,
  onPreloadStatusChange,
  onStartupPreloadComplete,
  onMapLoadStateChange,
  onWorldAudioUpdate,
  onPlayAudioSfx,
}: OnePieceGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const labelMountRef = useRef<HTMLDivElement | null>(null);

  const selectedIslandRef = useRef<IslandLocation | null>(selectedIsland);
  const showLabelsRef = useRef<boolean>(showLabels);
  const cloudCoverRef = useRef<number>(cloudCover);
  const timeOfDayRef = useRef<number>(timeOfDay);
  const sailingActiveRef = useRef<boolean>(sailingActive);
  const sunnyCameraModeRef = useRef<SunnyCameraMode>(sunnyCameraMode);
  const sunnyControlInputRef = sunnyControlRef;
  const mugiwaraTargetRef = useRef<IslandLocation | null>(mugiwaraTargetIsland);
  const onSunnyTelemetryRef = useRef(onSunnyTelemetry);
  const onSailingPreparingChangeRef = useRef(onSailingPreparingChange);
  const onLoadedIslandsChangeRef = useRef(onLoadedIslandsChange);
  const onLoadingIslandsChangeRef = useRef(onLoadingIslandsChange);
  const isPausedRef = useRef<boolean>(isPaused);
  const titleScreenActiveRef = useRef<boolean>(titleScreenActive);
  const loadingScreenActiveRef = useRef<boolean>(loadingScreenActive);
  const onPreloadProgressChangeRef = useRef(onPreloadProgressChange);
  const onPreloadStatusChangeRef = useRef(onPreloadStatusChange);
  const onStartupPreloadCompleteRef = useRef(onStartupPreloadComplete);
  const onSelectIslandRef = useRef(onSelectIsland);
  const onMapLoadStateChangeRef = useRef(onMapLoadStateChange);
  const onWorldAudioUpdateRef = useRef(onWorldAudioUpdate);
  const onPlayAudioSfxRef = useRef(onPlayAudioSfx);

  selectedIslandRef.current = selectedIsland;
  showLabelsRef.current = showLabels;
  cloudCoverRef.current = cloudCover;
  timeOfDayRef.current = timeOfDay;
  sailingActiveRef.current = sailingActive;
  sunnyCameraModeRef.current = sunnyCameraMode;
  mugiwaraTargetRef.current = mugiwaraTargetIsland;
  onSunnyTelemetryRef.current = onSunnyTelemetry;
  onSailingPreparingChangeRef.current = onSailingPreparingChange;
  onLoadedIslandsChangeRef.current = onLoadedIslandsChange;
  onLoadingIslandsChangeRef.current = onLoadingIslandsChange;
  isPausedRef.current = isPaused;
  titleScreenActiveRef.current = titleScreenActive;
  loadingScreenActiveRef.current = loadingScreenActive;
  onPreloadProgressChangeRef.current = onPreloadProgressChange;
  onPreloadStatusChangeRef.current = onPreloadStatusChange;
  onStartupPreloadCompleteRef.current = onStartupPreloadComplete;
  onSelectIslandRef.current = onSelectIsland;
  onMapLoadStateChangeRef.current = onMapLoadStateChange;
  onWorldAudioUpdateRef.current = onWorldAudioUpdate;
  onPlayAudioSfxRef.current = onPlayAudioSfx;

  const sceneControlRef = useRef<{
    flyToIsland: (island: IslandLocation) => void;
    flyToPreset: (
      island:
        | 'alabasta'
        | 'skypiea'
        | 'water-7'
        | 'marineford'
        | 'polestar-islands'
        | 'conomi-islands'
        | 'gecko-islands'
        | 'dawn-island'
        | 'goat-island'
        | 'shells-town'
        | 'organ-island'
        | 'shimotsuki'
        | 'baratie'
        | 'reverse-mountain'
        | 'twin-cape'
        | 'little-garden'
        | 'cactus-island'
        | 'drum-island'
        | 'jaya'
        | 'long-ring-long-land'
        | 'shift-station'
        | 'pucci-island'
        | 'san-faldo'
        | 'st-poplar'
        | 'enies-lobby'
        | 'impel-down'
        | 'amazon-lily'
        | 'thriller-bark'
        | 'sabaody'
        | 'mary-geoise'
        | 'fish-man-island'
        | 'punk-hazard'
        | 'dressrosa'
        | 'whole-cake-island'
        | 'zou'
        | 'wano'
        | 'egghead-island'
        | 'elbaf',
      presetId: string
    ) => void;
    setSailingMode: (active: boolean, targetIsland?: IslandLocation | null) => void;
    setTitleScreenMode: (active: boolean) => void;
    warpSunnyToIsland: (island: IslandLocation | null) => void;
    triggerSunnyAction: (action: 'resurface' | 'boost') => void;
    resetView: () => void;
    loadMapUrl: (url: string) => void;
    updateLabelVisibility: (visible: boolean) => void;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvasMount = canvasMountRef.current;
    const labelMount = labelMountRef.current;
    if (!container || !canvasMount || !labelMount) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    canvasMount.appendChild(renderer.domElement);

    const css2dRenderer = new CSS2DRenderer();
    css2dRenderer.setSize(width, height);
    css2dRenderer.domElement.style.position = 'absolute';
    css2dRenderer.domElement.style.inset = '0';
    css2dRenderer.domElement.style.pointerEvents = 'none';
    labelMount.appendChild(css2dRenderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    const florianFog = new THREE.FogExp2(0x160c29, 0.0);
    const fmiFog = new THREE.FogExp2(0x05334e, 0.0);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.36;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.05, 220);
    camera.position.copy(DEFAULT_CAMERA_POS);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.075;
    controls.enablePan = true;
    controls.panSpeed = 0.65;
    controls.rotateSpeed = 0.68;
    controls.zoomSpeed = 0.9;
    controls.minDistance = 0.0016;
    controls.maxDistance = 54;
    controls.target.set(0, 0, 0);
    controls.update();

    // Lighting rig (warm directional sunlight + cool hemisphere fill + rim)
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f1a30, 0.58);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff4e0, 2.4);
    sunLight.position.set(40, 12, 20);
    scene.add(sunLight.target);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(1024, 1024);
      sunLight.shadow.camera.near = 18;
      sunLight.shadow.camera.far = 75;
      sunLight.shadow.camera.left = -13;
      sunLight.shadow.camera.right = 13;
      sunLight.shadow.camera.top = 13;
      sunLight.shadow.camera.bottom = -13;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.025;
    }
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x4b7bec, 0.44);
    rimLight.position.set(-30, -10, -25);
    scene.add(rimLight);

    // 1. Starry Space Background
    const starCount = 2600;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 85 + Math.random() * 60;
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = Math.random() * Math.PI * 2;
      starPositions[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      starPositions[i * 3 + 1] = r * Math.cos(theta);
      starPositions[i * 3 + 2] = r * Math.sin(theta) * Math.sin(phi);

      const tint = Math.random();
      if (tint < 0.25) {
        _tmpColor.setHex(0x9ecbff);
      } else if (tint < 0.42) {
        _tmpColor.setHex(0xffe6b3);
      } else {
        _tmpColor.setHex(0xf1f5f9);
      }
      const brightness = 0.55 + Math.random() * 0.45;
      starColors[i * 3] = _tmpColor.r * brightness;
      starColors[i * 3 + 1] = _tmpColor.g * brightness;
      starColors[i * 3 + 2] = _tmpColor.b * brightness;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(starPositions, 3)
    );
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.42,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 2A. True 3D Sculpted Land & Mountain Crust Mesh (fast progressive CPU-displaced sphere)
    const terrainGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 288, 144);
    const baseTerrainNormals = new Float32Array(
      (terrainGeo.attributes.normal.array as Float32Array).length
    );
    baseTerrainNormals.set(terrainGeo.attributes.normal.array as Float32Array);

    const globeCloudSystem = createGlobeCloudSystem({ isSoftwareGl });
    scene.add(globeCloudSystem.mesh);
    const cloudWeatherEffects = createCloudWeatherEffects();
    scene.add(cloudWeatherEffects.group);

    const sharedUniforms = {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(1, 0.2, 0.4).normalize() },
      uCloudCover: { value: cloudCoverRef.current },
      uSeaLevelOffset: { value: OCEAN_SEA_LEVEL_OFFSET },
      uGlobeRadius: { value: GLOBE_RADIUS },
      uShadowClouds: { value: globeCloudSystem.shadowUniformVec4s },
      uShadowCloudParams: { value: globeCloudSystem.shadowParamVec4s },
      uCloudShadowStrength: { value: isSoftwareGl ? 1.05 : 1.0 },
      uEniesCenter: {
        value: (() => {
          const p = equirectangularToSphere(
            ENIES_GLOBE_CENTER.u,
            ENIES_GLOBE_CENTER.v,
            1
          );
          return new THREE.Vector3(p.x, p.y, p.z).normalize();
        })(),
      },
      uEniesPitCos: { value: getEniesAbyssCosThreshold(GLOBE_RADIUS) },
      uImpelCenter: {
        value: (() => {
          const p = equirectangularToSphere(
            IMPEL_DOWN_GLOBE_CENTER.u,
            IMPEL_DOWN_GLOBE_CENTER.v,
            1
          );
          return new THREE.Vector3(p.x, p.y, p.z).normalize();
        })(),
      },
      uImpelPitCos: { value: getImpelAbyssCosThreshold(GLOBE_RADIUS) },
    };

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.86,
      metalness: 0.04,
      normalScale: new THREE.Vector2(1.25, 1.25),
      emissive: new THREE.Color(0xffbe55),
      emissiveIntensity: 1.0,
    });

    terrainMat.onBeforeCompile = (shader) => {
      shader.uniforms.uSunDir = sharedUniforms.uSunDir;
      shader.uniforms.uShadowClouds = sharedUniforms.uShadowClouds;
      shader.uniforms.uShadowCloudParams = sharedUniforms.uShadowCloudParams;
      shader.uniforms.uCloudShadowStrength = sharedUniforms.uCloudShadowStrength;

      shader.vertexShader =
        `varying vec3 vWorldNormalTerrain;\nvarying vec3 vTerrainWorldPos;\n` +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `
        #include <worldpos_vertex>
        vWorldNormalTerrain = normalize(mat3(modelMatrix) * objectNormal);
        vTerrainWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

      shader.fragmentShader =
        `
        uniform vec3 uSunDir;
        varying vec3 vWorldNormalTerrain;
        varying vec3 vTerrainWorldPos;
        ${CLOUD_SHADOW_GLSL_PARS}
        ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        float sunDot = dot(normalize(vWorldNormalTerrain), normalize(uSunDir));
        float nightMask = smoothstep(0.18, -0.22, sunDot);
        totalEmissiveRadiance *= nightMask * 2.35;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_fragment_end>',
        `
        #include <lights_fragment_end>
        float terrainCloudVis = computeCloudShadow(vTerrainWorldPos, normalize(uSunDir));
        reflectedLight.directDiffuse *= terrainCloudVis;
        reflectedLight.directSpecular *= terrainCloudVis * terrainCloudVis;
        reflectedLight.indirectDiffuse *= mix(0.52, 1.0, terrainCloudVis);
        reflectedLight.indirectSpecular *= mix(0.55, 1.0, terrainCloudVis);
        `
      );
    };

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.castShadow = !isSoftwareGl;
    terrainMesh.receiveShadow = !isSoftwareGl;
    scene.add(terrainMesh);

    // 2B. Separate 3D Animated Ocean Sphere at Raised Sea Level (R = 10.0 + OCEAN_SEA_LEVEL_OFFSET)
    const oceanGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 240, 120);
    const oceanNormalTex = createOceanNormalTexture(256);

    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.14,
      metalness: 0.12,
      normalMap: oceanNormalTex,
      normalScale: new THREE.Vector2(0.28, 0.28),
    });

    oceanMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = sharedUniforms.uTime;
      shader.uniforms.uSunDir = sharedUniforms.uSunDir;
      shader.uniforms.uCloudCover = sharedUniforms.uCloudCover;
      shader.uniforms.uSeaLevelOffset = sharedUniforms.uSeaLevelOffset;
      shader.uniforms.uGlobeRadius = sharedUniforms.uGlobeRadius;
      shader.uniforms.uShadowClouds = sharedUniforms.uShadowClouds;
      shader.uniforms.uShadowCloudParams = sharedUniforms.uShadowCloudParams;
      shader.uniforms.uCloudShadowStrength = sharedUniforms.uCloudShadowStrength;
      shader.uniforms.uEniesCenter = sharedUniforms.uEniesCenter;
      shader.uniforms.uEniesPitCos = sharedUniforms.uEniesPitCos;
      shader.uniforms.uImpelCenter = sharedUniforms.uImpelCenter;
      shader.uniforms.uImpelPitCos = sharedUniforms.uImpelPitCos;

      shader.vertexShader =
        `
        uniform float uTime;
        uniform float uCloudCover;
        uniform float uSeaLevelOffset;
        uniform float uGlobeRadius;
        ${CLOUD_SHADOW_GLSL_PARS}
        varying vec2 vOceanUv;
        varying vec3 vOceanLocalPos;
        varying vec3 vOceanWorldPos;
        ` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vec3 oceanUnitV = normalize(position);
        vec2 underSeaV = computeUnderCloudSeaState(oceanUnitV, uGlobeRadius);
        float oceanScaleV = 0.14 + pow(clamp(underSeaV.x, 0.0, 1.0), 1.15) * 2.21;
        float oceanSwellV = 0.0;
        ${OCEAN_VERTEX_SWELL_GLSL}
        transformed += oceanUnitV * (uSeaLevelOffset + oceanSwellV * oceanScaleV);
        vOceanUv = uv;
        vOceanLocalPos = position;
        vOceanWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

      shader.fragmentShader =
        `
        uniform float uTime;
        uniform vec3 uSunDir;
        uniform float uCloudCover;
        uniform float uGlobeRadius;
        uniform vec3 uEniesCenter;
        uniform float uEniesPitCos;
        uniform vec3 uImpelCenter;
        uniform float uImpelPitCos;
        varying vec2 vOceanUv;
        varying vec3 vOceanLocalPos;
        varying vec3 vOceanWorldPos;
        ${CLOUD_SHADOW_GLSL_PARS}
        ${OCEAN_EVAL_WAVES_GLSL}
        ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        vec3 normOceanPos = normalize(vOceanLocalPos);
        if (
          dot(normOceanPos, uEniesCenter) > uEniesPitCos ||
          dot(normOceanPos, uImpelCenter) > uImpelPitCos
        ) {
          discard;
        }
        float oceanViewDist = length(vViewPosition);
        float oceanCloseFade = 1.0 - smoothstep(0.25, 2.8, oceanViewDist);
        float oceanMicroFade = 1.0 - smoothstep(0.06, 0.95, oceanViewDist);
        vec2 underSeaF = computeUnderCloudSeaState(normOceanPos, uGlobeRadius);
        float underRoughness = underSeaF.x;
        float underLightning = underSeaF.y;
        float oceanWaveScale = 0.14 + pow(clamp(underRoughness, 0.0, 1.0), 1.15) * 2.21;
        float oceanCrest = 0.5;
        vec3 oceanWaveGrad = vec3(0.0);
        evalOceanWaves(normOceanPos, uTime, oceanWaveScale, oceanCloseFade, oceanMicroFade, oceanCrest, oceanWaveGrad);

        float troughShade = smoothstep(0.56, 0.06, oceanCrest) * (0.08 + 0.22 * oceanCloseFade) * (0.25 + underRoughness * 0.95);
        float crestLift = smoothstep(0.50, 0.96, oceanCrest) * (0.06 + 0.22 * oceanCloseFade) * (0.25 + underRoughness * 0.95);
        diffuseColor.rgb *= (1.0 - troughShade + crestLift);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.54, 0.68), crestLift * 0.42);

        // Darken & churn ocean hues progressively beneath heavy gray/rain/storm clouds
        float stormTintMix = smoothstep(0.32, 0.98, underRoughness) * 0.46;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.17, 0.28), stormTintMix);

        vec3 waveNViewPreview = normalize(mat3(viewMatrix) * normalize(normOceanPos - oceanWaveGrad * (0.28 + 0.72 * oceanCloseFade)));
        float oceanFresnel = pow(1.0 - max(0.0, dot(normalize(vViewPosition), waveNViewPreview)), 3.2);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.62, 0.84), oceanFresnel * (0.14 + 0.16 * oceanCloseFade));

        float foamThreshold = mix(0.92, 0.48, underRoughness);
        float foamMask = smoothstep(foamThreshold, 0.96, oceanCrest) * oceanCloseFade * smoothstep(0.18, 0.68, underRoughness);
        if (foamMask > 0.01) {
          float fPat =
            sin(dot(normOceanPos, vec3(1650.0, -1210.0, 1390.0)) + uTime * 2.1) *
            sin(dot(normOceanPos, vec3(-1310.0, 1170.0, 1610.0)) - uTime * 1.7);
          float foam = smoothstep(0.04, 0.72, fPat * 0.5 + 0.5) * foamMask * (0.45 + underRoughness * 0.38);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.97, 1.0), clamp(foam, 0.0, 0.88));
        }
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `
        vec3 macroNormalView = waveNViewPreview;
        #ifdef USE_NORMALMAP_TANGENTSPACE
          float farTexWeight = (1.0 - oceanMicroFade * 0.82) * (0.045 + underRoughness * 0.18);
          if (farTexWeight > 0.01) {
            vec2 uvWaveA = vOceanUv * vec2(44.0, 22.0) + vec2(uTime * 0.015, uTime * 0.009);
            vec2 uvWaveB = vOceanUv * vec2(31.0, 15.0) - vec2(uTime * 0.011, uTime * 0.013);
            vec3 waveA = texture2D(normalMap, uvWaveA).xyz * 2.0 - 1.0;
            vec3 waveB = texture2D(normalMap, uvWaveB).xyz * 2.0 - 1.0;
            vec3 oceanN = normalize(vec3((waveA.xy + waveB.xy) * farTexWeight, 1.0));
            vec3 rippleViewN = normalize(tbn * oceanN);
            normal = normalize(macroNormalView + (rippleViewN - nonPerturbedNormal));
          } else {
            normal = macroNormalView;
          }
        #else
          normal = macroNormalView;
        #endif
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_fragment_end>',
        `
        #include <lights_fragment_end>
        float oceanCloudVis = computeCloudShadow(vOceanWorldPos, normalize(uSunDir));
        reflectedLight.directDiffuse *= oceanCloudVis;
        reflectedLight.directSpecular *= oceanCloudVis * oceanCloudVis;
        reflectedLight.indirectDiffuse *= mix(0.42, 1.0, oceanCloudVis);
        reflectedLight.indirectSpecular *= mix(0.38, 1.0, oceanCloudVis);
        if (underLightning > 0.005) {
          reflectedLight.directDiffuse += vec3(0.45, 0.62, 0.92) * underLightning * (0.28 + 0.55 * oceanCrest);
        }
        `
      );
    };

    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.receiveShadow = !isSoftwareGl;
    scene.add(oceanMesh);

    // 3. Instanced 3D Mountain Boulders (subtle Red Line ridges) & Lush Island Forest Canopies
    const MAX_CRAGS = 360;
    const cragGeo = new THREE.DodecahedronGeometry(0.085, 0);
    cragGeo.scale(1.2, 0.75, 1.0);
    const cragMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.04,
      flatShading: true,
    });
    const cragInstanced = new THREE.InstancedMesh(cragGeo, cragMat, MAX_CRAGS);
    cragInstanced.castShadow = !isSoftwareGl;
    cragInstanced.receiveShadow = !isSoftwareGl;
    cragInstanced.count = 0;
    cragInstanced.frustumCulled = false;
    scene.add(cragInstanced);

    const MAX_TREES = 520;
    const treeGeo = new THREE.DodecahedronGeometry(0.068, 0);
    treeGeo.translate(0, 0.045, 0);
    const treeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.02,
      flatShading: true,
    });
    const treeInstanced = new THREE.InstancedMesh(treeGeo, treeMat, MAX_TREES);
    treeInstanced.castShadow = !isSoftwareGl;
    treeInstanced.receiveShadow = !isSoftwareGl;
    treeInstanced.count = 0;
    treeInstanced.frustumCulled = false;
    scene.add(treeInstanced);

    // 4. Modular Per-Island 3D Models (each island has its own module under src/islands/)
    const landmarksGroup = new THREE.Group();
    scene.add(landmarksGroup);

    let landmarkGeos: THREE.BufferGeometry[] = [];
    const sharedIslandMatPool: THREE.Material[] = [];
    let customIslandMats: THREE.Material[] = [];
    let customIslandTexs: THREE.Texture[] = [];
    let builtIslands: IslandMeshInstance[] = [];

    const sharedIslandMaterials = createSharedIslandMaterials((m) => {
      sharedIslandMatPool.push(m);
      return m;
    });

    // Exact spherical tangent frame for Alabasta (East=+X, Up=+Y, South=+Z)
    const alabastaOriginPos = (() => {
      const p = equirectangularToSphere(
        ALABASTA_GLOBE_CENTER.u,
        ALABASTA_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const alabastaUp = alabastaOriginPos.clone().normalize();
    const alabastaEast = (() => {
      const pE = equirectangularToSphere(
        ALABASTA_GLOBE_CENTER.u + 0.001,
        ALABASTA_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(alabastaOriginPos)
        .normalize();
    })();
    const alabastaSouth = new THREE.Vector3()
      .crossVectors(alabastaEast, alabastaUp)
      .normalize();
    const alabastaUnitNormal = alabastaUp.clone();

    // Exact spherical tangent frame for Skypiea (floating at GLOBE_RADIUS + SKYPIEA_ALTITUDE)
    const skypieaOriginPos = (() => {
      const p = equirectangularToSphere(
        SKYPIEA_GLOBE_CENTER.u,
        SKYPIEA_GLOBE_CENTER.v,
        GLOBE_RADIUS + SKYPIEA_ALTITUDE
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const skypieaUp = skypieaOriginPos.clone().normalize();
    const skypieaEast = (() => {
      const pE = equirectangularToSphere(
        SKYPIEA_GLOBE_CENTER.u + 0.001,
        SKYPIEA_GLOBE_CENTER.v,
        GLOBE_RADIUS + SKYPIEA_ALTITUDE
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(skypieaOriginPos)
        .normalize();
    })();
    const skypieaSouth = new THREE.Vector3()
      .crossVectors(skypieaEast, skypieaUp)
      .normalize();

    // Exact spherical tangent frame for Water 7 (East=+X, Up=+Y, South=+Z)
    const water7OriginPos = (() => {
      const p = equirectangularToSphere(
        WATER7_GLOBE_CENTER.u,
        WATER7_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const water7Up = water7OriginPos.clone().normalize();
    const water7East = (() => {
      const pE = equirectangularToSphere(
        WATER7_GLOBE_CENTER.u + 0.001,
        WATER7_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(water7OriginPos)
        .normalize();
    })();
    const water7South = new THREE.Vector3()
      .crossVectors(water7East, water7Up)
      .normalize();
    const water7UnitNormal = water7Up.clone();

    // Exact spherical tangent frame for Marineford (East=+X, Up=+Y, South=+Z)
    const marinefordOriginPos = (() => {
      const p = equirectangularToSphere(
        MARINEFORD_GLOBE_CENTER.u,
        MARINEFORD_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const marinefordUp = marinefordOriginPos.clone().normalize();
    const marinefordEast = (() => {
      const pE = equirectangularToSphere(
        MARINEFORD_GLOBE_CENTER.u + 0.001,
        MARINEFORD_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(marinefordOriginPos)
        .normalize();
    })();
    const marinefordSouth = new THREE.Vector3()
      .crossVectors(marinefordEast, marinefordUp)
      .normalize();
    const marinefordUnitNormal = marinefordUp.clone();

    // Exact spherical tangent frame for Loguetown (East=+X, Up=+Y, South=+Z)
    const loguetownOriginPos = (() => {
      const p = equirectangularToSphere(
        LOGUETOWN_GLOBE_CENTER.u,
        LOGUETOWN_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const loguetownUp = loguetownOriginPos.clone().normalize();
    const loguetownEast = (() => {
      const pE = equirectangularToSphere(
        LOGUETOWN_GLOBE_CENTER.u + 0.001,
        LOGUETOWN_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(loguetownOriginPos)
        .normalize();
    })();
    const loguetownSouth = new THREE.Vector3()
      .crossVectors(loguetownEast, loguetownUp)
      .normalize();
    const loguetownUnitNormal = loguetownUp.clone();

    // Exact spherical tangent frame for Conomi Islands (East=+X, Up=+Y, South=+Z)
    const conomiOriginPos = (() => {
      const p = equirectangularToSphere(
        CONOMI_GLOBE_CENTER.u,
        CONOMI_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const conomiUp = conomiOriginPos.clone().normalize();
    const conomiEast = (() => {
      const pE = equirectangularToSphere(
        CONOMI_GLOBE_CENTER.u + 0.001,
        CONOMI_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(conomiOriginPos)
        .normalize();
    })();
    const conomiSouth = new THREE.Vector3()
      .crossVectors(conomiEast, conomiUp)
      .normalize();
    const conomiUnitNormal = conomiUp.clone();

    // Exact spherical tangent frame for Gecko Islands (East=+X, Up=+Y, South=+Z)
    const geckoOriginPos = (() => {
      const p = equirectangularToSphere(
        GECKO_GLOBE_CENTER.u,
        GECKO_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const geckoUp = geckoOriginPos.clone().normalize();
    const geckoEast = (() => {
      const pE = equirectangularToSphere(
        GECKO_GLOBE_CENTER.u + 0.001,
        GECKO_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(geckoOriginPos)
        .normalize();
    })();
    const geckoSouth = new THREE.Vector3()
      .crossVectors(geckoEast, geckoUp)
      .normalize();
    const geckoUnitNormal = geckoUp.clone();

    // Exact spherical tangent frame for Dawn Island (East=+X, Up=+Y, South=+Z)
    const dawnOriginPos = (() => {
      const p = equirectangularToSphere(
        DAWN_GLOBE_CENTER.u,
        DAWN_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const dawnUp = dawnOriginPos.clone().normalize();
    const dawnEast = (() => {
      const pE = equirectangularToSphere(
        DAWN_GLOBE_CENTER.u + 0.001,
        DAWN_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(dawnOriginPos)
        .normalize();
    })();
    const dawnSouth = new THREE.Vector3()
      .crossVectors(dawnEast, dawnUp)
      .normalize();
    const dawnUnitNormal = dawnUp.clone();

    // Exact spherical tangent frame for Goat Island (East=+X, Up=+Y, South=+Z)
    const goatOriginPos = (() => {
      const p = equirectangularToSphere(
        GOAT_GLOBE_CENTER.u,
        GOAT_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const goatUp = goatOriginPos.clone().normalize();
    const goatEast = (() => {
      const pE = equirectangularToSphere(
        GOAT_GLOBE_CENTER.u + 0.001,
        GOAT_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(goatOriginPos)
        .normalize();
    })();
    const goatSouth = new THREE.Vector3()
      .crossVectors(goatEast, goatUp)
      .normalize();
    const goatUnitNormal = goatUp.clone();

    // Exact spherical tangent frame for Shells Town / Yotsuba (East=+X, Up=+Y, South=+Z)
    const shellsOriginPos = (() => {
      const p = equirectangularToSphere(
        SHELLS_GLOBE_CENTER.u,
        SHELLS_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const shellsUp = shellsOriginPos.clone().normalize();
    const shellsEast = (() => {
      const pE = equirectangularToSphere(
        SHELLS_GLOBE_CENTER.u + 0.001,
        SHELLS_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(shellsOriginPos)
        .normalize();
    })();
    const shellsSouth = new THREE.Vector3()
      .crossVectors(shellsEast, shellsUp)
      .normalize();
    const shellsUnitNormal = shellsUp.clone();
    const yotsubaUnitNormal = (() => {
      const p = equirectangularToSphere(0.865, 0.105, GLOBE_RADIUS);
      return new THREE.Vector3(p.x, p.y, p.z).normalize();
    })();

    // Exact spherical tangent frame for Organ Island / Orange Town (East=+X, Up=+Y, South=+Z)
    const organOriginPos = (() => {
      const p = equirectangularToSphere(
        ORGAN_GLOBE_CENTER.u,
        ORGAN_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const organUp = organOriginPos.clone().normalize();
    const organEast = (() => {
      const pE = equirectangularToSphere(
        ORGAN_GLOBE_CENTER.u + 0.001,
        ORGAN_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(organOriginPos)
        .normalize();
    })();
    const organSouth = new THREE.Vector3()
      .crossVectors(organEast, organUp)
      .normalize();
    const organUnitNormal = organUp.clone();

    // Exact spherical tangent frame for Shimotsuki Village (East=+X, Up=+Y, South=+Z)
    const shimotsukiOriginPos = (() => {
      const p = equirectangularToSphere(
        SHIMOTSUKI_GLOBE_CENTER.u,
        SHIMOTSUKI_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const shimotsukiUp = shimotsukiOriginPos.clone().normalize();
    const shimotsukiEast = (() => {
      const pE = equirectangularToSphere(
        SHIMOTSUKI_GLOBE_CENTER.u + 0.001,
        SHIMOTSUKI_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(shimotsukiOriginPos)
        .normalize();
    })();
    const shimotsukiSouth = new THREE.Vector3()
      .crossVectors(shimotsukiEast, shimotsukiUp)
      .normalize();
    const shimotsukiUnitNormal = shimotsukiUp.clone();

    // Exact spherical tangent frame for Baratie (East=+X, Up=+Y, South=+Z)
    const baratieOriginPos = (() => {
      const p = equirectangularToSphere(
        BARATIE_GLOBE_CENTER.u,
        BARATIE_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const baratieUp = baratieOriginPos.clone().normalize();
    const baratieEast = (() => {
      const pE = equirectangularToSphere(
        BARATIE_GLOBE_CENTER.u + 0.001,
        BARATIE_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(baratieOriginPos)
        .normalize();
    })();
    const baratieSouth = new THREE.Vector3()
      .crossVectors(baratieEast, baratieUp)
      .normalize();
    const baratieUnitNormal = baratieUp.clone();

    // Exact spherical tangent frame for Reverse Mountain (East=+X, Up=+Y, South=+Z)
    const rmOriginPos = (() => {
      const p = equirectangularToSphere(
        RM_GLOBE_CENTER.u,
        RM_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const rmUp = rmOriginPos.clone().normalize();
    const rmEast = (() => {
      const pE = equirectangularToSphere(
        RM_GLOBE_CENTER.u + 0.001,
        RM_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(rmOriginPos)
        .normalize();
    })();
    const rmSouth = new THREE.Vector3().crossVectors(rmEast, rmUp).normalize();
    const rmUnitNormal = rmUp.clone();

    // Exact spherical tangent frame for Twin Cape at Reverse Mountain Grand Line mouth
    const twinCapeOriginPos = (() => {
      const p = equirectangularToSphere(
        TWIN_CAPE_GLOBE_CENTER.u,
        TWIN_CAPE_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const twinCapeUp = twinCapeOriginPos.clone().normalize();
    const twinCapeEast = (() => {
      const pE = equirectangularToSphere(
        TWIN_CAPE_GLOBE_CENTER.u + 0.001,
        TWIN_CAPE_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(twinCapeOriginPos)
        .normalize();
    })();
    const twinCapeSouth = new THREE.Vector3()
      .crossVectors(twinCapeEast, twinCapeUp)
      .normalize();

    // Exact spherical tangent frame for Little Garden (East=+X, Up=+Y, South=+Z)
    const littleGardenOriginPos = (() => {
      const p = equirectangularToSphere(
        LITTLE_GARDEN_GLOBE_CENTER.u,
        LITTLE_GARDEN_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const littleGardenUp = littleGardenOriginPos.clone().normalize();
    const littleGardenEast = (() => {
      const pE = equirectangularToSphere(
        LITTLE_GARDEN_GLOBE_CENTER.u + 0.001,
        LITTLE_GARDEN_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(littleGardenOriginPos)
        .normalize();
    })();
    const littleGardenSouth = new THREE.Vector3()
      .crossVectors(littleGardenEast, littleGardenUp)
      .normalize();
    const littleGardenUnitNormal = littleGardenUp.clone();

    // Exact spherical tangent frame for Cactus Island / Whisky Peak (East=+X, Up=+Y, South=+Z)
    const cactusOriginPos = (() => {
      const p = equirectangularToSphere(
        CACTUS_GLOBE_CENTER.u,
        CACTUS_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const cactusUp = cactusOriginPos.clone().normalize();
    const cactusEast = (() => {
      const pE = equirectangularToSphere(
        CACTUS_GLOBE_CENTER.u + 0.001,
        CACTUS_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(cactusOriginPos)
        .normalize();
    })();
    const cactusSouth = new THREE.Vector3()
      .crossVectors(cactusEast, cactusUp)
      .normalize();
    const cactusUnitNormal = cactusUp.clone();

    // Exact spherical tangent frame for Drum Island (East=+X, Up=+Y, South=+Z)
    const drumOriginPos = (() => {
      const p = equirectangularToSphere(
        DRUM_GLOBE_CENTER.u,
        DRUM_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const drumUp = drumOriginPos.clone().normalize();
    const drumEast = (() => {
      const pE = equirectangularToSphere(
        DRUM_GLOBE_CENTER.u + 0.001,
        DRUM_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(drumOriginPos)
        .normalize();
    })();
    const drumSouth = new THREE.Vector3()
      .crossVectors(drumEast, drumUp)
      .normalize();
    const drumUnitNormal = drumUp.clone();

    // Exact spherical tangent frame for Jaya Island (East=+X, Up=+Y, South=+Z)
    const jayaOriginPos = (() => {
      const p = equirectangularToSphere(
        JAYA_GLOBE_CENTER.u,
        JAYA_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const jayaUp = jayaOriginPos.clone().normalize();
    const jayaEast = (() => {
      const pE = equirectangularToSphere(
        JAYA_GLOBE_CENTER.u + 0.001,
        JAYA_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(jayaOriginPos)
        .normalize();
    })();
    const jayaSouth = new THREE.Vector3()
      .crossVectors(jayaEast, jayaUp)
      .normalize();
    const jayaUnitNormal = jayaUp.clone();

    // Exact spherical tangent frame for Long Ring Long Land (East=+X, Up=+Y, South=+Z)
    const longRingOriginPos = (() => {
      const p = equirectangularToSphere(
        LONG_RING_GLOBE_CENTER.u,
        LONG_RING_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const longRingUp = longRingOriginPos.clone().normalize();
    const longRingEast = (() => {
      const pE = equirectangularToSphere(
        LONG_RING_GLOBE_CENTER.u + 0.001,
        LONG_RING_GLOBE_CENTER.v,
        GLOBE_RADIUS
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(longRingOriginPos)
        .normalize();
    })();
    const longRingSouth = new THREE.Vector3()
      .crossVectors(longRingEast, longRingUp)
      .normalize();
    const longRingUnitNormal = longRingUp.clone();

    // Exact spherical tangent frames for Sea Train Stations & Enies Lobby (East=+X, Up=+Y, South=+Z)
    const makeTangentFrame = (u: number, v: number) => {
      const p = equirectangularToSphere(u, v, GLOBE_RADIUS);
      const originPos = new THREE.Vector3(p.x, p.y, p.z);
      const up = originPos.clone().normalize();
      const pE = equirectangularToSphere(u + 0.001, v, GLOBE_RADIUS);
      const east = new THREE.Vector3(pE.x, pE.y, pE.z).sub(originPos).normalize();
      const south = new THREE.Vector3().crossVectors(east, up).normalize();
      const unitNormal = up.clone();
      return { originPos, up, east, south, unitNormal };
    };

    const {
      originPos: shiftOriginPos,
      up: shiftUp,
      east: shiftEast,
      south: shiftSouth,
      unitNormal: shiftUnitNormal,
    } = makeTangentFrame(SHIFT_GLOBE_CENTER.u, SHIFT_GLOBE_CENTER.v);

    const {
      originPos: pucciOriginPos,
      up: pucciUp,
      east: pucciEast,
      south: pucciSouth,
      unitNormal: pucciUnitNormal,
    } = makeTangentFrame(PUCCI_GLOBE_CENTER.u, PUCCI_GLOBE_CENTER.v);

    const {
      originPos: sanFaldoOriginPos,
      up: sanFaldoUp,
      east: sanFaldoEast,
      south: sanFaldoSouth,
      unitNormal: sanFaldoUnitNormal,
    } = makeTangentFrame(SAN_FALDO_GLOBE_CENTER.u, SAN_FALDO_GLOBE_CENTER.v);

    const {
      originPos: stPoplarOriginPos,
      up: stPoplarUp,
      east: stPoplarEast,
      south: stPoplarSouth,
      unitNormal: stPoplarUnitNormal,
    } = makeTangentFrame(ST_POPLAR_GLOBE_CENTER.u, ST_POPLAR_GLOBE_CENTER.v);

    const eniesBasis = getEniesOrientedBasis(GLOBE_RADIUS);
    const eniesOriginPos = new THREE.Vector3(
      eniesBasis.origin.x,
      eniesBasis.origin.y,
      eniesBasis.origin.z
    );
    const eniesUp = new THREE.Vector3(
      eniesBasis.up.x,
      eniesBasis.up.y,
      eniesBasis.up.z
    );
    const eniesEast = new THREE.Vector3(
      eniesBasis.east.x,
      eniesBasis.east.y,
      eniesBasis.east.z
    );
    const eniesSouth = new THREE.Vector3(
      eniesBasis.south.x,
      eniesBasis.south.y,
      eniesBasis.south.z
    );
    const eniesUnitNormal = eniesUp.clone();

    const impelBasis = getImpelDownOrientedBasis(GLOBE_RADIUS);
    const impelDownOriginPos = new THREE.Vector3(
      impelBasis.origin.x,
      impelBasis.origin.y,
      impelBasis.origin.z
    );
    const impelDownUp = new THREE.Vector3(
      impelBasis.up.x,
      impelBasis.up.y,
      impelBasis.up.z
    );
    const impelDownEast = new THREE.Vector3(
      impelBasis.east.x,
      impelBasis.east.y,
      impelBasis.east.z
    );
    const impelDownSouth = new THREE.Vector3(
      impelBasis.south.x,
      impelBasis.south.y,
      impelBasis.south.z
    );
    const impelDownUnitNormal = impelDownUp.clone();

    const taraiCentroidWorld = (() => {
      const c = getTaraiCentroidWorld(GLOBE_RADIUS);
      return new THREE.Vector3(c.x, c.y, c.z);
    })();

    const {
      originPos: amazonLilyOriginPos,
      up: amazonLilyUp,
      east: amazonLilyEast,
      south: amazonLilySouth,
      unitNormal: amazonLilyUnitNormal,
    } = makeTangentFrame(AMAZON_LILY_GLOBE_CENTER.u, AMAZON_LILY_GLOBE_CENTER.v);

    const {
      originPos: thrillerBarkOriginPos,
      up: thrillerBarkUp,
      east: thrillerBarkEast,
      south: thrillerBarkSouth,
      unitNormal: thrillerBarkUnitNormal,
    } = makeTangentFrame(THRILLER_BARK_GLOBE_CENTER.u, THRILLER_BARK_GLOBE_CENTER.v);

    const {
      originPos: sabaodyOriginPos,
      up: sabaodyUp,
      east: sabaodyEast,
      south: sabaodySouth,
      unitNormal: sabaodyUnitNormal,
    } = makeTangentFrame(SABAODY_GLOBE_CENTER.u, SABAODY_GLOBE_CENTER.v);

    const {
      originPos: punkHazardOriginPos,
      up: punkHazardUp,
      east: punkHazardEast,
      south: punkHazardSouth,
      unitNormal: punkHazardUnitNormal,
    } = makeTangentFrame(PUNK_HAZARD_GLOBE_CENTER.u, PUNK_HAZARD_GLOBE_CENTER.v);

    const {
      originPos: dressrosaOriginPos,
      up: dressrosaUp,
      east: dressrosaEast,
      south: dressrosaSouth,
      unitNormal: dressrosaUnitNormal,
    } = makeTangentFrame(DRESSROSA_GLOBE_CENTER.u, DRESSROSA_GLOBE_CENTER.v);

    const {
      originPos: tottoLandOriginPos,
      up: tottoLandUp,
      east: tottoLandEast,
      south: tottoLandSouth,
      unitNormal: tottoLandUnitNormal,
    } = makeTangentFrame(TOTTO_LAND_GLOBE_CENTER.u, TOTTO_LAND_GLOBE_CENTER.v);

    const {
      originPos: zouOriginPos,
      up: zouUp,
      east: zouEast,
      south: zouSouth,
      unitNormal: zouUnitNormal,
    } = makeTangentFrame(ZOU_GLOBE_CENTER.u, ZOU_GLOBE_CENTER.v);

    const {
      originPos: wanoOriginPos,
      up: wanoUp,
      east: wanoEast,
      south: wanoSouth,
      unitNormal: wanoUnitNormal,
    } = makeTangentFrame(WANO_GLOBE_CENTER.u, WANO_GLOBE_CENTER.v);

    const {
      originPos: eggheadOriginPos,
      up: eggheadUp,
      east: eggheadEast,
      south: eggheadSouth,
      unitNormal: eggheadUnitNormal,
    } = makeTangentFrame(EGGHEAD_GLOBE_CENTER.u, EGGHEAD_GLOBE_CENTER.v);

    const {
      originPos: elbafOriginPos,
      up: elbafUp,
      east: elbafEast,
      south: elbafSouth,
      unitNormal: elbafUnitNormal,
    } = makeTangentFrame(ELBAF_GLOBE_CENTER.u, ELBAF_GLOBE_CENTER.v);

    // Exact spherical tangent frame for Mary Geoise (perched at 10,000 m atop Red Line)
    const maryGeoiseOriginPos = (() => {
      const p = equirectangularToSphere(
        MARY_GEOISE_GLOBE_CENTER.u,
        MARY_GEOISE_GLOBE_CENTER.v,
        GLOBE_RADIUS + MARY_GEOISE_ALTITUDE
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const maryGeoiseUp = maryGeoiseOriginPos.clone().normalize();
    const maryGeoiseEast = (() => {
      const pE = equirectangularToSphere(
        MARY_GEOISE_GLOBE_CENTER.u + 0.001,
        MARY_GEOISE_GLOBE_CENTER.v,
        GLOBE_RADIUS + MARY_GEOISE_ALTITUDE
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(maryGeoiseOriginPos)
        .normalize();
    })();
    const maryGeoiseSouth = new THREE.Vector3()
      .crossVectors(maryGeoiseEast, maryGeoiseUp)
      .normalize();
    const maryGeoiseUnitNormal = maryGeoiseUp.clone();

    // Exact spherical tangent frame for Fish-Man Island (10,000 m beneath Mary Geoise inside Red Line cavern)
    const fishManOriginPos = (() => {
      const p = equirectangularToSphere(
        FISH_MAN_GLOBE_CENTER.u,
        FISH_MAN_GLOBE_CENTER.v,
        GLOBE_RADIUS - FISH_MAN_DEPTH
      );
      return new THREE.Vector3(p.x, p.y, p.z);
    })();
    const fishManUp = fishManOriginPos.clone().normalize();
    const fishManEast = (() => {
      const pE = equirectangularToSphere(
        FISH_MAN_GLOBE_CENTER.u + 0.001,
        FISH_MAN_GLOBE_CENTER.v,
        GLOBE_RADIUS - FISH_MAN_DEPTH
      );
      return new THREE.Vector3(pE.x, pE.y, pE.z)
        .sub(fishManOriginPos)
        .addScaledVector(
          fishManUp,
          -new THREE.Vector3(pE.x, pE.y, pE.z)
            .sub(fishManOriginPos)
            .dot(fishManUp)
        )
        .normalize();
    })();
    const fishManSouth = new THREE.Vector3()
      .crossVectors(fishManEast, fishManUp)
      .normalize();

    const skypieaUnitNormal = skypieaUp.clone();
    const kusUnitNormal = (() => {
      const k = getKnockUpStreamGlobeCoords(GLOBE_RADIUS);
      const p = equirectangularToSphere(k.u, k.v, GLOBE_RADIUS);
      return new THREE.Vector3(p.x, p.y, p.z).normalize();
    })();

    const orientOnSphere = (
      obj: THREE.Object3D,
      u: number,
      v: number,
      radius: number,
      orientMode: 'default' | 'cardinal' = 'default',
      orientYawRad = 0
    ) => {
      const p = equirectangularToSphere(u, v, radius);
      obj.position.set(p.x, p.y, p.z);
      _v1.set(p.x, p.y, p.z).normalize();

      if (orientMode === 'cardinal') {
        const pE = equirectangularToSphere(Math.min(1, u + 0.001), v, radius);
        _v2.set(pE.x - p.x, pE.y - p.y, pE.z - p.z);
        _v2.addScaledVector(_v1, -_v2.dot(_v1)).normalize();
        _v3.crossVectors(_v2, _v1).normalize();
        _basisMat.makeBasis(_v2, _v1, _v3);
        obj.quaternion.setFromRotationMatrix(_basisMat);
      } else {
        _targetQuat.setFromUnitVectors(_upVec, _v1);
        obj.quaternion.copy(_targetQuat);
      }
      if (orientYawRad !== 0) {
        obj.rotateY(orientYawRad);
      }
    };

    interface StreamedIslandRecord {
      island: IslandLocation;
      unitNormal: THREE.Vector3;
      worldPos: THREE.Vector3;
      status: 'unloaded' | 'loading' | 'ready' | 'failed';
      failedAttempts: number;
      nextRetryAt: number;
      built: IslandMeshInstance | null;
    }

    const streamedRecords: StreamedIslandRecord[] = ONE_PIECE_LOCATIONS.filter((loc) =>
      CUSTOM_3D_ISLAND_IDS.has(loc.id)
    ).map((island) => {
      const p =
        island.id === 'fish-man-island'
          ? equirectangularToSphere(
              FISH_MAN_GLOBE_CENTER.u,
              FISH_MAN_GLOBE_CENTER.v,
              GLOBE_RADIUS - FISH_MAN_DEPTH
            )
          : equirectangularToSphere(island.u, island.v, GLOBE_RADIUS);
      const wp = new THREE.Vector3(p.x, p.y, p.z);
      return {
        island,
        unitNormal: wp.clone().normalize(),
        worldPos: wp,
        status: 'unloaded',
        failedAttempts: 0,
        nextRetryAt: 0,
        built: null,
      };
    });
    const streamedRecordById = new Map(
      streamedRecords.map((rec) => [rec.island.id, rec])
    );
    let streamEpoch = 0;

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      landmarkGeos.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      customIslandMats.push(m);
      return m;
    };
    const trackTex = <T extends THREE.Texture>(t: T): T => {
      customIslandTexs.push(t);
      return t;
    };

    const finalizingPaintIds = new Set<string>();

    const emitLoadedIslands = () => {
      const readyIds = streamedRecords
        .filter((r) => r.status === 'ready')
        .map((r) => r.island.id);
      onLoadedIslandsChangeRef.current?.(readyIds);
    };

    const emitLoadingIslands = () => {
      const loadingList: LoadingIslandInfo[] = streamedRecords
        .filter(
          (r) =>
            (r.status === 'loading' || finalizingPaintIds.has(r.island.id)) &&
            HEAVY_CITY_ISLAND_IDS.has(r.island.id)
        )
        .map((r) => ({ id: r.island.id, name: r.island.name }));
      onLoadingIslandsChangeRef.current?.(loadingList);
    };

    const clearStreamedIslands = () => {
      streamEpoch++;
      finalizingPaintIds.clear();
      landmarksGroup.clear();
      landmarkGeos.forEach((g) => g.dispose());
      customIslandMats.forEach((m) => m.dispose());
      customIslandTexs.forEach((t) => t.dispose());
      landmarkGeos = [];
      customIslandMats = [];
      customIslandTexs = [];
      builtIslands = [];
      for (const rec of streamedRecords) {
        rec.status = 'unloaded';
        rec.failedAttempts = 0;
        rec.nextRetryAt = 0;
        rec.built = null;
      }
      emitLoadedIslands();
      emitLoadingIslands();
    };

    const loadingPromisesById = new Map<string, Promise<void>>();

    const ensureIslandLoaded = (
      islandId: string,
      quiet = false
    ): Promise<void> => {
      const rec = streamedRecordById.get(islandId);
      if (!rec || rec.status === 'ready' || rec.status === 'failed' || !currentMaps) {
        return Promise.resolve();
      }
      if (rec.nextRetryAt > performance.now()) {
        return Promise.resolve();
      }
      const existingPromise = loadingPromisesById.get(islandId);
      if (rec.status === 'loading' && existingPromise) {
        return existingPromise;
      }

      const epoch = streamEpoch;
      const mapsRef = currentMaps;
      const isHeavy = !quiet && HEAVY_CITY_ISLAND_IDS.has(islandId);
      rec.status = 'loading';
      if (isHeavy) {
        emitLoadingIslands();
      }

      const loadPromise = loadIslandBuilder(islandId)
        .then(async (builder) => {
          if (disposed || epoch !== streamEpoch || !builder) {
            if (epoch === streamEpoch && rec.status === 'loading') {
              rec.status = 'unloaded';
              if (isHeavy) emitLoadingIslands();
            }
            return;
          }

          // Let React paint the spinning loading icon before synchronous 3D mesh/texture construction
          if (isHeavy) {
            await new Promise<void>((resolve) => {
              requestAnimationFrame(() => window.setTimeout(resolve, 0));
            });
            if (disposed || epoch !== streamEpoch) {
              if (epoch === streamEpoch && rec.status === 'loading') {
                rec.status = 'unloaded';
                emitLoadingIslands();
              }
              return;
            }
            finalizingPaintIds.add(islandId);
          }

          const hNorm = mapsRef.sampleHeightAt(rec.island.u, rec.island.v);
          const surfaceRadius = terrainRadiusAtHeight(hNorm);
          const built = builder({
            island: rec.island,
            globeRadius: GLOBE_RADIUS,
            surfaceRadius,
            materials: sharedIslandMaterials,
            trackGeo,
            trackMat,
            trackTex,
          });
          if (built) {
            const targetU =
              rec.island.id === 'fish-man-island'
                ? FISH_MAN_GLOBE_CENTER.u
                : rec.island.id === 'wano'
                  ? WANO_GLOBE_CENTER.u
                  : rec.island.u;
            const targetV =
              rec.island.id === 'fish-man-island'
                ? FISH_MAN_GLOBE_CENTER.v
                : rec.island.id === 'wano'
                  ? WANO_GLOBE_CENTER.v
                  : rec.island.v;
            orientOnSphere(
              built.group,
              targetU,
              targetV,
              built.radius,
              built.orientMode ?? 'default',
              built.orientYawRad ?? 0
            );
            if (!isSoftwareGl) {
              built.group.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  const mat = child.material as THREE.Material | THREE.Material[];
                  const isTranslucent = Array.isArray(mat)
                    ? mat.some((m) => m.transparent)
                    : Boolean(mat?.transparent);
                  if (!isTranslucent) {
                    child.receiveShadow = true;
                    if (rec.island.id !== 'skypiea') {
                      child.castShadow = true;
                    }
                  }
                }
              });
            }
            if (titleScreenActiveRef.current && !sailingActiveRef.current) {
              built.group.visible = rec.island.id === 'dawn-island';
            }
            landmarksGroup.add(built.group);
            builtIslands.push(built);
            rec.built = built;
            rec.status = 'ready';
            rec.failedAttempts = 0;
            rec.nextRetryAt = 0;
            emitLoadedIslands();
          } else {
            rec.status = 'ready';
          }

          if (isHeavy) {
            requestAnimationFrame(() => {
              finalizingPaintIds.delete(islandId);
              if (!disposed) emitLoadingIslands();
            });
          }
        })
        .catch(() => {
          finalizingPaintIds.delete(islandId);
          if (epoch === streamEpoch) {
            rec.failedAttempts += 1;
            if (rec.failedAttempts >= 2) {
              rec.status = 'failed';
            } else {
              rec.status = 'unloaded';
              rec.nextRetryAt = performance.now() + 8000 * rec.failedAttempts;
            }
            if (isHeavy) emitLoadingIslands();
          }
        })
        .finally(() => {
          if (loadingPromisesById.get(islandId) === loadPromise) {
            loadingPromisesById.delete(islandId);
          }
        });

      loadingPromisesById.set(islandId, loadPromise);
      return loadPromise;
    };

    // 5. Fresnel Atmosphere Halo
    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.15, 96, 64);
    const atmosUniforms = {
      uSunDir: { value: new THREE.Vector3(1, 0.2, 0.4).normalize() },
    };
    const atmosMat = new THREE.ShaderMaterial({
      uniforms: atmosUniforms,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: `
        varying vec3 vNormalWorld;
        varying vec3 vWorldPos;
        void main() {
          vNormalWorld = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        varying vec3 vNormalWorld;
        varying vec3 vWorldPos;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float ndv = clamp(-dot(vNormalWorld, viewDir), 0.0, 1.0);
          float outerFade = smoothstep(0.0, 0.42, ndv);
          float limbGlow = pow(1.0 - ndv, 2.2) * outerFade * 2.4;
          float sunSide = smoothstep(-0.45, 0.65, dot(vNormalWorld, normalize(uSunDir)));
          vec3 dayGlow = vec3(0.28, 0.68, 1.0);
          vec3 sunsetGlow = vec3(0.95, 0.56, 0.24);
          float terminator = exp(-pow(dot(vNormalWorld, normalize(uSunDir)) * 3.2, 2.0));
          vec3 finalColor = mix(dayGlow, sunsetGlow, terminator * 0.42);
          float alpha = limbGlow * mix(0.22, 0.85, sunSide);
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosMesh);

    // 6. Distinct 3D Volumetric Cumulus Cloud Formations (strictly below Skypiea altitude)
    // Mounted earlier via globeCloudSystem.mesh so sharedUniforms binds uShadowClouds cleanly.

    // 8. Island 3D Markers & CSS2DRenderer Floating Labels
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);

    const ringGeo = new THREE.TorusGeometry(0.085, 0.012, 8, 24);
    const pinGeo = new THREE.CylinderGeometry(0.012, 0.007, 0.22, 8);
    const gemGeo = new THREE.OctahedronGeometry(0.052, 0);
    const hitGeo = new THREE.SphereGeometry(0.32, 8, 8);

    const matGold = new THREE.MeshStandardMaterial({
      color: 0xf5c565,
      emissive: 0xd4a24c,
      emissiveIntensity: 0.55,
      roughness: 0.25,
      metalness: 0.75,
    });
    const matCyan = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      roughness: 0.28,
      metalness: 0.65,
    });
    const matActive = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfde68a,
      emissiveIntensity: 1.25,
      roughness: 0.15,
      metalness: 0.8,
    });
    const matHit = new THREE.MeshBasicMaterial({ visible: false });

    const markerRecords: MarkerRecord[] = [];
    const interactables: THREE.Object3D[] = [];

    for (const island of ONE_PIECE_LOCATIONS) {
      const group = new THREE.Group();

      const isImportant =
        island.notability === 'Legend' || island.notability === 'Major Power';
      const beaconMat = isImportant ? matGold : matCyan;

      const ringMesh = new THREE.Mesh(ringGeo, beaconMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.05;

      const pinMesh = new THREE.Mesh(pinGeo, beaconMat);
      pinMesh.position.y = 0.15;

      const gemMesh = new THREE.Mesh(gemGeo, beaconMat);
      gemMesh.position.y = 0.29;

      const hitProxy = new THREE.Mesh(hitGeo, matHit);
      hitProxy.position.y = 0.18;
      hitProxy.userData.island = island;
      interactables.push(hitProxy);

      group.add(ringMesh, pinMesh, gemMesh, hitProxy);

      const labelBtn = document.createElement('button');
      labelBtn.type = 'button';
      labelBtn.className = 'globe-label-btn';
      labelBtn.setAttribute('aria-label', `Select ${island.name} on globe`);
      labelBtn.dataset.islandId = island.id;

      const dotSpan = document.createElement('span');
      dotSpan.style.width = '6px';
      dotSpan.style.height = '6px';
      dotSpan.style.borderRadius = '9999px';
      dotSpan.style.flexShrink = '0';
      dotSpan.style.backgroundColor = isImportant ? '#f5c565' : '#38bdf8';

      const textSpan = document.createElement('span');
      textSpan.textContent = island.name;
      labelBtn.appendChild(dotSpan);
      labelBtn.appendChild(textSpan);

      labelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectIslandRef.current(island);
      });

      const labelObj = new CSS2DObject(labelBtn);
      labelObj.position.set(0, 0.42, 0);
      group.add(labelObj);

      const pos = equirectangularToSphere(
        island.u,
        island.v,
        GLOBE_RADIUS + 0.25
      );
      const basePos = new THREE.Vector3(pos.x, pos.y, pos.z);
      const normal = basePos.clone().normalize();
      group.position.copy(basePos);
      _targetQuat.setFromUnitVectors(_upVec, normal);
      group.quaternion.copy(_targetQuat);

      markersGroup.add(group);
      markerRecords.push({
        island,
        group,
        hitProxy,
        ringMesh,
        gemMesh,
        labelObj,
        labelBtn,
        basePos,
        normal,
        priority: getMarkerPriority(island),
      });
    }

    const islandMistSystem = createIslandMistSystem({
      locations: ONE_PIECE_LOCATIONS,
      markerRecords,
      globeRadius: GLOBE_RADIUS,
      isSoftwareGl,
    });
    scene.add(islandMistSystem.mesh);

    // Apply physical CPU vertex displacement to terrainGeo, position landmarks, crags, trees, and markers
    const applyTerrainReliefAndScatter = (maps: ProcessedGlobeMaps) => {
      const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
      const uvAttr = terrainGeo.attributes.uv as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      const uvArr = uvAttr.array as Float32Array;
      const count = posAttr.count;

      for (let i = 0; i < count; i++) {
        const u = uvArr[i * 2];
        const vGl = uvArr[i * 2 + 1];
        const imgV = 1 - vGl;
        const nx = baseTerrainNormals[i * 3];
        const ny = baseTerrainNormals[i * 3 + 1];
        const nz = baseTerrainNormals[i * 3 + 2];

        // Submerge coarse planetary terrain under Alabasta, Water 7, Marineford, and Reverse Mountain detailed meshes
        const angCos =
          nx * alabastaUnitNormal.x +
          ny * alabastaUnitNormal.y +
          nz * alabastaUnitNormal.z;
        const angDist = Math.acos(Math.max(-1, Math.min(1, angCos)));
        const angCosW7 =
          nx * water7UnitNormal.x +
          ny * water7UnitNormal.y +
          nz * water7UnitNormal.z;
        const angDistW7 = Math.acos(Math.max(-1, Math.min(1, angCosW7)));
        const angCosMf =
          nx * marinefordUnitNormal.x +
          ny * marinefordUnitNormal.y +
          nz * marinefordUnitNormal.z;
        const angDistMf = Math.acos(Math.max(-1, Math.min(1, angCosMf)));
        const angCosLt =
          nx * loguetownUnitNormal.x +
          ny * loguetownUnitNormal.y +
          nz * loguetownUnitNormal.z;
        const angDistLt = Math.acos(Math.max(-1, Math.min(1, angCosLt)));
        const angCosCn =
          nx * conomiUnitNormal.x +
          ny * conomiUnitNormal.y +
          nz * conomiUnitNormal.z;
        const angDistCn = Math.acos(Math.max(-1, Math.min(1, angCosCn)));
        const angCosGk =
          nx * geckoUnitNormal.x +
          ny * geckoUnitNormal.y +
          nz * geckoUnitNormal.z;
        const angDistGk = Math.acos(Math.max(-1, Math.min(1, angCosGk)));
        const angCosDw =
          nx * dawnUnitNormal.x +
          ny * dawnUnitNormal.y +
          nz * dawnUnitNormal.z;
        const angDistDw = Math.acos(Math.max(-1, Math.min(1, angCosDw)));
        const angCosGt =
          nx * goatUnitNormal.x +
          ny * goatUnitNormal.y +
          nz * goatUnitNormal.z;
        const angDistGt = Math.acos(Math.max(-1, Math.min(1, angCosGt)));
        const angCosSt =
          nx * shellsUnitNormal.x +
          ny * shellsUnitNormal.y +
          nz * shellsUnitNormal.z;
        const angDistSt = Math.acos(Math.max(-1, Math.min(1, angCosSt)));
        const angCosYt =
          nx * yotsubaUnitNormal.x +
          ny * yotsubaUnitNormal.y +
          nz * yotsubaUnitNormal.z;
        const angDistYt = Math.acos(Math.max(-1, Math.min(1, angCosYt)));
        const angCosOrg =
          nx * organUnitNormal.x +
          ny * organUnitNormal.y +
          nz * organUnitNormal.z;
        const angDistOrg = Math.acos(Math.max(-1, Math.min(1, angCosOrg)));
        const angCosShm =
          nx * shimotsukiUnitNormal.x +
          ny * shimotsukiUnitNormal.y +
          nz * shimotsukiUnitNormal.z;
        const angDistShm = Math.acos(Math.max(-1, Math.min(1, angCosShm)));
        const angCosBar =
          nx * baratieUnitNormal.x +
          ny * baratieUnitNormal.y +
          nz * baratieUnitNormal.z;
        const angDistBar = Math.acos(Math.max(-1, Math.min(1, angCosBar)));
        const angCosRm =
          nx * rmUnitNormal.x +
          ny * rmUnitNormal.y +
          nz * rmUnitNormal.z;
        const angDistRm = Math.acos(Math.max(-1, Math.min(1, angCosRm)));
        const angCosLg =
          nx * littleGardenUnitNormal.x +
          ny * littleGardenUnitNormal.y +
          nz * littleGardenUnitNormal.z;
        const angDistLg = Math.acos(Math.max(-1, Math.min(1, angCosLg)));
        const angCosCc =
          nx * cactusUnitNormal.x +
          ny * cactusUnitNormal.y +
          nz * cactusUnitNormal.z;
        const angDistCc = Math.acos(Math.max(-1, Math.min(1, angCosCc)));
        const angCosDr =
          nx * drumUnitNormal.x +
          ny * drumUnitNormal.y +
          nz * drumUnitNormal.z;
        const angDistDr = Math.acos(Math.max(-1, Math.min(1, angCosDr)));
        const angCosJy =
          nx * jayaUnitNormal.x +
          ny * jayaUnitNormal.y +
          nz * jayaUnitNormal.z;
        const angDistJy = Math.acos(Math.max(-1, Math.min(1, angCosJy)));
        const angCosLr =
          nx * longRingUnitNormal.x +
          ny * longRingUnitNormal.y +
          nz * longRingUnitNormal.z;
        const angDistLr = Math.acos(Math.max(-1, Math.min(1, angCosLr)));
        const angCosSh =
          nx * shiftUnitNormal.x +
          ny * shiftUnitNormal.y +
          nz * shiftUnitNormal.z;
        const angDistSh = Math.acos(Math.max(-1, Math.min(1, angCosSh)));
        const angCosPc =
          nx * pucciUnitNormal.x +
          ny * pucciUnitNormal.y +
          nz * pucciUnitNormal.z;
        const angDistPc = Math.acos(Math.max(-1, Math.min(1, angCosPc)));
        const angCosSf =
          nx * sanFaldoUnitNormal.x +
          ny * sanFaldoUnitNormal.y +
          nz * sanFaldoUnitNormal.z;
        const angDistSf = Math.acos(Math.max(-1, Math.min(1, angCosSf)));
        const angCosSp =
          nx * stPoplarUnitNormal.x +
          ny * stPoplarUnitNormal.y +
          nz * stPoplarUnitNormal.z;
        const angDistSp = Math.acos(Math.max(-1, Math.min(1, angCosSp)));
        const angCosEl =
          nx * eniesUnitNormal.x +
          ny * eniesUnitNormal.y +
          nz * eniesUnitNormal.z;
        const angDistEl = Math.acos(Math.max(-1, Math.min(1, angCosEl)));
        const angCosId =
          nx * impelDownUnitNormal.x +
          ny * impelDownUnitNormal.y +
          nz * impelDownUnitNormal.z;
        const angDistId = Math.acos(Math.max(-1, Math.min(1, angCosId)));
        const angCosAlily =
          nx * amazonLilyUnitNormal.x +
          ny * amazonLilyUnitNormal.y +
          nz * amazonLilyUnitNormal.z;
        const angDistAlily = Math.acos(Math.max(-1, Math.min(1, angCosAlily)));
        const angCosTb =
          nx * thrillerBarkUnitNormal.x +
          ny * thrillerBarkUnitNormal.y +
          nz * thrillerBarkUnitNormal.z;
        const angDistTb = Math.acos(Math.max(-1, Math.min(1, angCosTb)));
        const angCosSab =
          nx * sabaodyUnitNormal.x +
          ny * sabaodyUnitNormal.y +
          nz * sabaodyUnitNormal.z;
        const angDistSab = Math.acos(Math.max(-1, Math.min(1, angCosSab)));
        const angCosPh =
          nx * punkHazardUnitNormal.x +
          ny * punkHazardUnitNormal.y +
          nz * punkHazardUnitNormal.z;
        const angDistPh = Math.acos(Math.max(-1, Math.min(1, angCosPh)));
        const angCosDrs =
          nx * dressrosaUnitNormal.x +
          ny * dressrosaUnitNormal.y +
          nz * dressrosaUnitNormal.z;
        const angDistDrs = Math.acos(Math.max(-1, Math.min(1, angCosDrs)));
        const angCosTl =
          nx * tottoLandUnitNormal.x +
          ny * tottoLandUnitNormal.y +
          nz * tottoLandUnitNormal.z;
        const angDistTl = Math.acos(Math.max(-1, Math.min(1, angCosTl)));
        const angCosZou =
          nx * zouUnitNormal.x +
          ny * zouUnitNormal.y +
          nz * zouUnitNormal.z;
        const angDistZou = Math.acos(Math.max(-1, Math.min(1, angCosZou)));
        const angCosWano =
          nx * wanoUnitNormal.x +
          ny * wanoUnitNormal.y +
          nz * wanoUnitNormal.z;
        const angDistWano = Math.acos(Math.max(-1, Math.min(1, angCosWano)));
        const angCosEgg =
          nx * eggheadUnitNormal.x +
          ny * eggheadUnitNormal.y +
          nz * eggheadUnitNormal.z;
        const angDistEgg = Math.acos(Math.max(-1, Math.min(1, angCosEgg)));
        const angCosElb =
          nx * elbafUnitNormal.x +
          ny * elbafUnitNormal.y +
          nz * elbafUnitNormal.z;
        const angDistElb = Math.acos(Math.max(-1, Math.min(1, angCosElb)));
        const angCosMg =
          nx * maryGeoiseUnitNormal.x +
          ny * maryGeoiseUnitNormal.y +
          nz * maryGeoiseUnitNormal.z;
        const angDistMg = Math.acos(Math.max(-1, Math.min(1, angCosMg)));
        const angCosSk =
          nx * skypieaUnitNormal.x +
          ny * skypieaUnitNormal.y +
          nz * skypieaUnitNormal.z;
        const angDistSk = Math.acos(Math.max(-1, Math.min(1, angCosSk)));
        const angCosKus =
          nx * kusUnitNormal.x +
          ny * kusUnitNormal.y +
          nz * kusUnitNormal.z;
        const angDistKus = Math.acos(Math.max(-1, Math.min(1, angCosKus)));
        let nearRmOuterCanal = false;
        if (angDistRm >= RM_ANGULAR_MASK_RADIUS && angDistRm < 0.50 && angCosRm > 0) {
          const sxR = (nx * GLOBE_RADIUS - rmOriginPos.x) * rmEast.x +
            (ny * GLOBE_RADIUS - rmOriginPos.y) * rmEast.y +
            (nz * GLOBE_RADIUS - rmOriginPos.z) * rmEast.z;
          const szR = (nx * GLOBE_RADIUS - rmOriginPos.x) * rmSouth.x +
            (ny * GLOBE_RADIUS - rmOriginPos.y) * rmSouth.y +
            (nz * GLOBE_RADIUS - rmOriginPos.z) * rmSouth.z;
          const rmCheck = sampleReverseMountainAt(
            sxR / RM_GLOBE_SCALE,
            szR / RM_GLOBE_SCALE
          );
          if (rmCheck.distToCenterline < rmCheck.halfWidth + 14.0) {
            nearRmOuterCanal = true;
          }
        }
        const clearYotsubaSea =
          (angDistSt < 0.075 || angDistYt < 0.12) && angDistGt > 0.036;
        let r: number;
        if (
          angDist < ALABASTA_ANGULAR_MASK_RADIUS ||
          angDistW7 < WATER7_ANGULAR_MASK_RADIUS ||
          angDistMf < MARINEFORD_ANGULAR_MASK_RADIUS ||
          angDistLt < LOGUETOWN_ANGULAR_MASK_RADIUS ||
          angDistCn < CONOMI_ANGULAR_MASK_RADIUS ||
          angDistGk < GECKO_ANGULAR_MASK_RADIUS ||
          angDistDw < DAWN_ANGULAR_MASK_RADIUS ||
          angDistGt < GOAT_ANGULAR_MASK_RADIUS ||
          angDistSt < SHELLS_ANGULAR_MASK_RADIUS ||
          clearYotsubaSea ||
          angDistOrg < ORGAN_ANGULAR_MASK_RADIUS ||
          angDistShm < SHIMOTSUKI_ANGULAR_MASK_RADIUS ||
          angDistBar < BARATIE_ANGULAR_MASK_RADIUS ||
          angDistLg < LITTLE_GARDEN_ANGULAR_MASK_RADIUS ||
          angDistCc < CACTUS_ANGULAR_MASK_RADIUS ||
          angDistDr < DRUM_ANGULAR_MASK_RADIUS ||
          angDistJy < JAYA_ANGULAR_MASK_RADIUS ||
          angDistLr < LONG_RING_ANGULAR_MASK_RADIUS ||
          angDistSh < SHIFT_ANGULAR_MASK_RADIUS ||
          angDistPc < STATION_ISLAND_ANGULAR_MASK_RADIUS ||
          angDistSf < STATION_ISLAND_ANGULAR_MASK_RADIUS ||
          angDistSp < STATION_ISLAND_ANGULAR_MASK_RADIUS ||
          angDistEl < ENIES_ANGULAR_MASK_RADIUS ||
          angDistId < IMPEL_DOWN_ANGULAR_MASK_RADIUS ||
          angDistAlily < AMAZON_LILY_ANGULAR_MASK_RADIUS ||
          angDistTb < THRILLER_BARK_ANGULAR_MASK_RADIUS ||
          angDistSab < SABAODY_ANGULAR_MASK_RADIUS ||
          angDistPh < PUNK_HAZARD_ANGULAR_MASK_RADIUS ||
          angDistDrs < DRESSROSA_ANGULAR_MASK_RADIUS ||
          angDistTl < TOTTO_LAND_ANGULAR_MASK_RADIUS ||
          angDistZou < ZOU_ANGULAR_MASK_RADIUS ||
          angDistWano < WANO_ANGULAR_MASK_RADIUS ||
          angDistEgg < EGGHEAD_ANGULAR_MASK_RADIUS ||
          angDistElb < ELBAF_ANGULAR_MASK_RADIUS ||
          angDistSk < 0.044 ||
          angDistKus < 0.036 ||
          angDistRm < RM_ANGULAR_MASK_RADIUS ||
          nearRmOuterCanal
        ) {
          r = angDistId < IMPEL_DOWN_ANGULAR_MASK_RADIUS ? GLOBE_RADIUS - 0.22 : GLOBE_RADIUS - 0.18;
        } else if (angDistLg < LITTLE_GARDEN_ANGULAR_MASK_RADIUS + 0.015) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistLg - LITTLE_GARDEN_ANGULAR_MASK_RADIUS) / 0.015;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistCc < CACTUS_ANGULAR_MASK_RADIUS + 0.015) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistCc - CACTUS_ANGULAR_MASK_RADIUS) / 0.015;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistDr < DRUM_ANGULAR_MASK_RADIUS + 0.015) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistDr - DRUM_ANGULAR_MASK_RADIUS) / 0.015;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistJy < JAYA_ANGULAR_MASK_RADIUS + 0.015) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistJy - JAYA_ANGULAR_MASK_RADIUS) / 0.015;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistLr < LONG_RING_ANGULAR_MASK_RADIUS + 0.015) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistLr - LONG_RING_ANGULAR_MASK_RADIUS) / 0.015;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistSh < SHIFT_ANGULAR_MASK_RADIUS + 0.015) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistSh - SHIFT_ANGULAR_MASK_RADIUS) / 0.015;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistPc < STATION_ISLAND_ANGULAR_MASK_RADIUS + 0.015) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistPc - STATION_ISLAND_ANGULAR_MASK_RADIUS) / 0.015;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistSf < STATION_ISLAND_ANGULAR_MASK_RADIUS + 0.015) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistSf - STATION_ISLAND_ANGULAR_MASK_RADIUS) / 0.015;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistSp < STATION_ISLAND_ANGULAR_MASK_RADIUS + 0.015) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistSp - STATION_ISLAND_ANGULAR_MASK_RADIUS) / 0.015;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistEl < ENIES_ANGULAR_MASK_RADIUS + 0.018) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistEl - ENIES_ANGULAR_MASK_RADIUS) / 0.018;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistId < IMPEL_DOWN_ANGULAR_MASK_RADIUS + 0.015) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistId - IMPEL_DOWN_ANGULAR_MASK_RADIUS) / 0.015;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.22) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistAlily < AMAZON_LILY_ANGULAR_MASK_RADIUS + 0.015) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistAlily - AMAZON_LILY_ANGULAR_MASK_RADIUS) / 0.015;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistTb < THRILLER_BARK_ANGULAR_MASK_RADIUS + 0.015) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistTb - THRILLER_BARK_ANGULAR_MASK_RADIUS) / 0.015;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistMg < MARY_GEOISE_ANGULAR_MASK_RADIUS + 0.025) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const sxMg =
            (nx * GLOBE_RADIUS - maryGeoiseOriginPos.x) * maryGeoiseEast.x +
            (ny * GLOBE_RADIUS - maryGeoiseOriginPos.y) * maryGeoiseEast.y +
            (nz * GLOBE_RADIUS - maryGeoiseOriginPos.z) * maryGeoiseEast.z;
          const szMg =
            (nx * GLOBE_RADIUS - maryGeoiseOriginPos.x) * maryGeoiseSouth.x +
            (ny * GLOBE_RADIUS - maryGeoiseOriginPos.y) * maryGeoiseSouth.y +
            (nz * GLOBE_RADIUS - maryGeoiseOriginPos.z) * maryGeoiseSouth.z;
          const lxMg = sxMg / MARY_GEOISE_GLOBE_SCALE;
          const lzMg = szMg / MARY_GEOISE_GLOBE_SCALE;

          // Carve East cliff base & Red Port Harbor ocean bay down to sea floor so real planetary water reaches Red Line cliff
          const zFade =
            1 -
            Math.max(
              0,
              Math.min(1, (Math.abs(lzMg + 4) - 86) / 44)
            );
          const eastCliffDrop =
            Math.max(0, Math.min(1, (lxMg - 102) / 34)) * zFade;

          let baseR = GLOBE_RADIUS + 0.52;
          if (eastCliffDrop > 0.001) {
            const dropSmooth =
              eastCliffDrop * eastCliffDrop * (3 - 2 * eastCliffDrop);
            baseR =
              (GLOBE_RADIUS + 0.52) * (1 - dropSmooth) +
              (GLOBE_RADIUS - 0.16) * dropSmooth;
          }

          if (angDistMg < MARY_GEOISE_ANGULAR_MASK_RADIUS) {
            r = baseR;
          } else {
            const blendLin =
              (angDistMg - MARY_GEOISE_ANGULAR_MASK_RADIUS) / 0.025;
            const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
            const floorR = eastCliffDrop > 0.5 ? baseR : Math.min(baseR, outerR);
            r = floorR * (1 - blendSmooth) + outerR * blendSmooth;
          }
        } else if (angDistSab < SABAODY_ANGULAR_MASK_RADIUS + 0.015) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistSab - SABAODY_ANGULAR_MASK_RADIUS) / 0.015;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistPh < PUNK_HAZARD_ANGULAR_MASK_RADIUS + 0.015) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistPh - PUNK_HAZARD_ANGULAR_MASK_RADIUS) / 0.015;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistDrs < DRESSROSA_ANGULAR_MASK_RADIUS + 0.015) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistDrs - DRESSROSA_ANGULAR_MASK_RADIUS) / 0.015;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistTl < TOTTO_LAND_ANGULAR_MASK_RADIUS + 0.02) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistTl - TOTTO_LAND_ANGULAR_MASK_RADIUS) / 0.02;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistRm < RM_ANGULAR_MASK_RADIUS + 0.055) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistRm - RM_ANGULAR_MASK_RADIUS) / 0.055;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistLt < LOGUETOWN_ANGULAR_MASK_RADIUS + 0.052) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistLt - LOGUETOWN_ANGULAR_MASK_RADIUS) / 0.052;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistCn < CONOMI_ANGULAR_MASK_RADIUS + 0.052) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistCn - CONOMI_ANGULAR_MASK_RADIUS) / 0.052;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistGk < GECKO_ANGULAR_MASK_RADIUS + 0.052) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistGk - GECKO_ANGULAR_MASK_RADIUS) / 0.052;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistDw < DAWN_ANGULAR_MASK_RADIUS + 0.052) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistDw - DAWN_ANGULAR_MASK_RADIUS) / 0.052;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistGt < GOAT_ANGULAR_MASK_RADIUS + 0.052) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistGt - GOAT_ANGULAR_MASK_RADIUS) / 0.052;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistOrg < ORGAN_ANGULAR_MASK_RADIUS + 0.045) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistOrg - ORGAN_ANGULAR_MASK_RADIUS) / 0.045;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if (angDistShm < SHIMOTSUKI_ANGULAR_MASK_RADIUS + 0.045) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = (angDistShm - SHIMOTSUKI_ANGULAR_MASK_RADIUS) / 0.045;
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else if ((angDistYt < 0.15 || angDistSt < 0.10) && angDistGt > 0.044) {
          const hNorm = maps.sampleHeightAt(u, imgV);
          const outerR = terrainRadiusAtHeight(hNorm);
          const blendLin = Math.max(
            0,
            Math.min(
              1,
              Math.min((angDistSt - 0.075) / 0.025, (angDistYt - 0.12) / 0.03)
            )
          );
          const blendSmooth = blendLin * blendLin * (3 - 2 * blendLin);
          r = (GLOBE_RADIUS - 0.18) * (1 - blendSmooth) + outerR * blendSmooth;
        } else {
          const hNorm = maps.sampleHeightAt(u, imgV);
          r = terrainRadiusAtHeight(hNorm);
        }

        posArr[i * 3] = nx * r;
        posArr[i * 3 + 1] = ny * r;
        posArr[i * 3 + 2] = nz * r;
      }

      posAttr.needsUpdate = true;
      terrainGeo.computeVertexNormals();
      terrainGeo.computeBoundingSphere();

      // Scatter subtle 3D Red Line rocky outcrops
      let cragIdx = 0;
      for (const pt of maps.rockCrags) {
        if (cragIdx >= MAX_CRAGS) break;
        const r = terrainRadiusAtHeight(pt.height) - 0.03;
        const sp = equirectangularToSphere(pt.u, pt.v, r);
        _v1.set(sp.x, sp.y, sp.z).normalize();
        if (
          _v1.dot(alabastaUnitNormal) > Math.cos(ALABASTA_ANGULAR_MASK_RADIUS) ||
          _v1.dot(water7UnitNormal) > Math.cos(WATER7_ANGULAR_MASK_RADIUS) ||
          _v1.dot(marinefordUnitNormal) > Math.cos(MARINEFORD_ANGULAR_MASK_RADIUS) ||
          _v1.dot(loguetownUnitNormal) > Math.cos(LOGUETOWN_ANGULAR_MASK_RADIUS) ||
          _v1.dot(conomiUnitNormal) > Math.cos(CONOMI_ANGULAR_MASK_RADIUS) ||
          _v1.dot(geckoUnitNormal) > Math.cos(GECKO_ANGULAR_MASK_RADIUS) ||
          _v1.dot(dawnUnitNormal) > Math.cos(DAWN_ANGULAR_MASK_RADIUS) ||
          _v1.dot(goatUnitNormal) > Math.cos(GOAT_ANGULAR_MASK_RADIUS) ||
          _v1.dot(shellsUnitNormal) > Math.cos(0.088) ||
          _v1.dot(yotsubaUnitNormal) > Math.cos(0.125) ||
          _v1.dot(organUnitNormal) > Math.cos(ORGAN_ANGULAR_MASK_RADIUS + 0.045) ||
          _v1.dot(shimotsukiUnitNormal) > Math.cos(SHIMOTSUKI_ANGULAR_MASK_RADIUS + 0.045) ||
          _v1.dot(baratieUnitNormal) > Math.cos(BARATIE_ANGULAR_MASK_RADIUS + 0.04) ||
          _v1.dot(littleGardenUnitNormal) > Math.cos(LITTLE_GARDEN_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(cactusUnitNormal) > Math.cos(CACTUS_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(drumUnitNormal) > Math.cos(DRUM_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(jayaUnitNormal) > Math.cos(JAYA_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(longRingUnitNormal) > Math.cos(LONG_RING_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(shiftUnitNormal) > Math.cos(SHIFT_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(pucciUnitNormal) > Math.cos(STATION_ISLAND_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(sanFaldoUnitNormal) > Math.cos(STATION_ISLAND_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(stPoplarUnitNormal) > Math.cos(STATION_ISLAND_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(eniesUnitNormal) > Math.cos(ENIES_ANGULAR_MASK_RADIUS + 0.018) ||
          _v1.dot(impelDownUnitNormal) > Math.cos(IMPEL_DOWN_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(amazonLilyUnitNormal) > Math.cos(AMAZON_LILY_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(thrillerBarkUnitNormal) > Math.cos(THRILLER_BARK_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(sabaodyUnitNormal) > Math.cos(SABAODY_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(punkHazardUnitNormal) > Math.cos(PUNK_HAZARD_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(dressrosaUnitNormal) > Math.cos(DRESSROSA_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(tottoLandUnitNormal) > Math.cos(TOTTO_LAND_ANGULAR_MASK_RADIUS + 0.02) ||
          _v1.dot(zouUnitNormal) > Math.cos(ZOU_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(wanoUnitNormal) > Math.cos(WANO_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(eggheadUnitNormal) > Math.cos(EGGHEAD_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(elbafUnitNormal) > Math.cos(ELBAF_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(maryGeoiseUnitNormal) > Math.cos(MARY_GEOISE_ANGULAR_MASK_RADIUS + 0.018) ||
          _v1.dot(skypieaUnitNormal) > Math.cos(0.052) ||
          _v1.dot(kusUnitNormal) > Math.cos(0.044) ||
          _v1.dot(rmUnitNormal) > Math.cos(RM_ANGULAR_MASK_RADIUS + 0.03)
        ) {
          continue;
        }
        _dummyObj.position.set(sp.x, sp.y, sp.z);
        _targetQuat.setFromUnitVectors(_upVec, _v1);
        _dummyObj.quaternion.copy(_targetQuat);
        _dummyObj.rotateY(pt.u * 40);
        _dummyObj.scale.set(pt.scale * 1.15, pt.scale * 0.45, pt.scale * 0.85);
        _dummyObj.updateMatrix();
        cragInstanced.setMatrixAt(cragIdx, _dummyObj.matrix);
        _tmpColor.setRGB(
          0.16 * pt.tint,
          0.026 * pt.tint,
          0.021 * pt.tint
        );
        cragInstanced.setColorAt(cragIdx, _tmpColor);
        cragIdx++;
      }
      cragInstanced.count = cragIdx;
      cragInstanced.instanceMatrix.needsUpdate = true;
      if (cragInstanced.instanceColor) {
        cragInstanced.instanceColor.needsUpdate = true;
      }

      // Scatter 3D Island Forest Clusters
      let treeIdx = 0;
      for (const pt of maps.forestClusters) {
        if (treeIdx >= MAX_TREES) break;
        const r = terrainRadiusAtHeight(pt.height) - 0.02;
        const sp = equirectangularToSphere(pt.u, pt.v, r);
        _v1.set(sp.x, sp.y, sp.z).normalize();
        if (
          _v1.dot(alabastaUnitNormal) > Math.cos(ALABASTA_ANGULAR_MASK_RADIUS) ||
          _v1.dot(water7UnitNormal) > Math.cos(WATER7_ANGULAR_MASK_RADIUS) ||
          _v1.dot(marinefordUnitNormal) > Math.cos(MARINEFORD_ANGULAR_MASK_RADIUS) ||
          _v1.dot(loguetownUnitNormal) > Math.cos(LOGUETOWN_ANGULAR_MASK_RADIUS) ||
          _v1.dot(conomiUnitNormal) > Math.cos(CONOMI_ANGULAR_MASK_RADIUS) ||
          _v1.dot(geckoUnitNormal) > Math.cos(GECKO_ANGULAR_MASK_RADIUS) ||
          _v1.dot(dawnUnitNormal) > Math.cos(DAWN_ANGULAR_MASK_RADIUS) ||
          _v1.dot(goatUnitNormal) > Math.cos(GOAT_ANGULAR_MASK_RADIUS) ||
          _v1.dot(shellsUnitNormal) > Math.cos(0.088) ||
          _v1.dot(yotsubaUnitNormal) > Math.cos(0.125) ||
          _v1.dot(organUnitNormal) > Math.cos(ORGAN_ANGULAR_MASK_RADIUS + 0.045) ||
          _v1.dot(shimotsukiUnitNormal) > Math.cos(SHIMOTSUKI_ANGULAR_MASK_RADIUS + 0.045) ||
          _v1.dot(baratieUnitNormal) > Math.cos(BARATIE_ANGULAR_MASK_RADIUS + 0.04) ||
          _v1.dot(littleGardenUnitNormal) > Math.cos(LITTLE_GARDEN_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(cactusUnitNormal) > Math.cos(CACTUS_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(drumUnitNormal) > Math.cos(DRUM_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(jayaUnitNormal) > Math.cos(JAYA_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(longRingUnitNormal) > Math.cos(LONG_RING_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(shiftUnitNormal) > Math.cos(SHIFT_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(pucciUnitNormal) > Math.cos(STATION_ISLAND_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(sanFaldoUnitNormal) > Math.cos(STATION_ISLAND_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(stPoplarUnitNormal) > Math.cos(STATION_ISLAND_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(eniesUnitNormal) > Math.cos(ENIES_ANGULAR_MASK_RADIUS + 0.018) ||
          _v1.dot(impelDownUnitNormal) > Math.cos(IMPEL_DOWN_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(amazonLilyUnitNormal) > Math.cos(AMAZON_LILY_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(thrillerBarkUnitNormal) > Math.cos(THRILLER_BARK_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(sabaodyUnitNormal) > Math.cos(SABAODY_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(punkHazardUnitNormal) > Math.cos(PUNK_HAZARD_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(dressrosaUnitNormal) > Math.cos(DRESSROSA_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(tottoLandUnitNormal) > Math.cos(TOTTO_LAND_ANGULAR_MASK_RADIUS + 0.02) ||
          _v1.dot(zouUnitNormal) > Math.cos(ZOU_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(wanoUnitNormal) > Math.cos(WANO_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(eggheadUnitNormal) > Math.cos(EGGHEAD_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(elbafUnitNormal) > Math.cos(ELBAF_ANGULAR_MASK_RADIUS + 0.015) ||
          _v1.dot(maryGeoiseUnitNormal) > Math.cos(MARY_GEOISE_ANGULAR_MASK_RADIUS + 0.018) ||
          _v1.dot(skypieaUnitNormal) > Math.cos(0.052) ||
          _v1.dot(kusUnitNormal) > Math.cos(0.044) ||
          _v1.dot(rmUnitNormal) > Math.cos(RM_ANGULAR_MASK_RADIUS + 0.03)
        ) {
          continue;
        }
        _dummyObj.position.set(sp.x, sp.y, sp.z);
        _targetQuat.setFromUnitVectors(_upVec, _v1);
        _dummyObj.quaternion.copy(_targetQuat);
        _dummyObj.scale.setScalar(pt.scale * 0.88);
        _dummyObj.updateMatrix();
        treeInstanced.setMatrixAt(treeIdx, _dummyObj.matrix);
        _tmpColor.setRGB(
          0.042 * pt.tint,
          0.145 * pt.tint,
          0.045 * pt.tint
        );
        treeInstanced.setColorAt(treeIdx, _tmpColor);
        treeIdx++;
      }
      treeInstanced.count = treeIdx;
      treeInstanced.instanceMatrix.needsUpdate = true;
      if (treeInstanced.instanceColor) {
        treeInstanced.instanceColor.needsUpdate = true;
      }

      // Reset streamed island pool so only visible/requested islands build on demand (Reverse Mountain & Twin Cape always preloaded)
      clearStreamedIslands();
      if (loadingScreenActiveRef.current) {
        startStartupPreload();
      } else {
        ensureIslandLoaded('reverse-mountain', titleScreenActiveRef.current);
        ensureIslandLoaded('twin-cape', titleScreenActiveRef.current);
        if (titleScreenActiveRef.current) {
          ensureIslandLoaded('dawn-island', true);
          startTitleBackgroundPreload();
        }
      }
      if (selectedIslandRef.current && CUSTOM_3D_ISLAND_IDS.has(selectedIslandRef.current.id)) {
        ensureIslandLoaded(selectedIslandRef.current.id);
        if (selectedIslandRef.current.id === 'jaya') {
          ensureIslandLoaded('skypiea');
        } else if (selectedIslandRef.current.id === 'skypiea') {
          ensureIslandLoaded('jaya');
        }
      } else if (
        selectedIslandRef.current &&
        (selectedIslandRef.current.id === 'arlong-park' ||
          selectedIslandRef.current.id === 'cocoyashi-village' ||
          selectedIslandRef.current.id === 'gosa-village')
      ) {
        ensureIslandLoaded('conomi-islands');
      } else if (
        selectedIslandRef.current &&
        (selectedIslandRef.current.id === 'syrup-village' ||
          selectedIslandRef.current.id === 'honey-town' ||
          selectedIslandRef.current.id === 'black-cat-beach')
      ) {
        ensureIslandLoaded('gecko-islands');
      } else if (
        selectedIslandRef.current &&
        (selectedIslandRef.current.id === 'foosha-village' ||
          selectedIslandRef.current.id === 'goa-kingdom')
      ) {
        ensureIslandLoaded('dawn-island');
      } else if (
        selectedIslandRef.current &&
        selectedIslandRef.current.id === 'orange-town'
      ) {
        ensureIslandLoaded('organ-island');
      } else if (
        selectedIslandRef.current &&
        selectedIslandRef.current.id === 'mock-town'
      ) {
        ensureIslandLoaded('jaya');
        ensureIslandLoaded('skypiea');
      } else if (
        selectedIslandRef.current &&
        (selectedIslandRef.current.id === 'upper-yard' ||
          selectedIslandRef.current.id === 'angel-island' ||
          selectedIslandRef.current.id === 'hidden-cloud-village')
      ) {
        ensureIslandLoaded('skypiea');
        ensureIslandLoaded('jaya');
      } else if (
        selectedIslandRef.current &&
        selectedIslandRef.current.id in DRESSROSA_SUB_LOCATIONS
      ) {
        ensureIslandLoaded('dressrosa');
      } else if (
        selectedIslandRef.current &&
        selectedIslandRef.current.id in TOTTO_LAND_SUB_LOCATIONS
      ) {
        ensureIslandLoaded('whole-cake-island');
      } else if (
        selectedIslandRef.current &&
        selectedIslandRef.current.id in WANO_SUB_LOCATIONS
      ) {
        ensureIslandLoaded('wano');
      } else if (
        selectedIslandRef.current &&
        selectedIslandRef.current.id in EGGHEAD_SUB_LOCATIONS
      ) {
        ensureIslandLoaded('egghead-island');
      } else if (
        selectedIslandRef.current &&
        selectedIslandRef.current.id in ELBAF_SUB_LOCATIONS
      ) {
        ensureIslandLoaded('elbaf');
      }

      // Update island marker anchors (Alabasta markers use exact integrated city heights)
      const alabastaCityCoords: Record<string, [number, number]> = {
        alabasta: [0, 0],
        alubarna: [95, -38],
        rainbase: [80, 61],
        nanohana: [34, 114],
        elumalu: [-40, 96],
        tamarisk: [122, -6],
      };

      for (const rec of markerRecords) {
        if (alabastaCityCoords[rec.island.id]) {
          const [lx, lz] = alabastaCityCoords[rec.island.id];
          const ly = Math.max(0.2, sampleAlabastaHeight(lx, lz)) + 1.2;
          const sp = toAlabastaSphereLocal(lx, ly, lz, GLOBE_RADIUS);
          rec.basePos
            .copy(alabastaOriginPos)
            .addScaledVector(alabastaEast, sp.x)
            .addScaledVector(alabastaUp, sp.y)
            .addScaledVector(alabastaSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (SKYPIEA_SUB_LOCATIONS[rec.island.id]) {
          const [lx, lz] = SKYPIEA_SUB_LOCATIONS[rec.island.id];
          const ly = Math.max(0.4, sampleSkypieaWalkSurfaceHeight(lx, lz)) + 1.8;
          const sp = toSkypieaSphereLocal(lx, ly, lz, GLOBE_RADIUS);
          rec.basePos
            .copy(skypieaOriginPos)
            .addScaledVector(skypieaEast, sp.x)
            .addScaledVector(skypieaUp, sp.y)
            .addScaledVector(skypieaSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'water-7') {
          const sp = toWater7SphereLocal(0, 52, 0, GLOBE_RADIUS);
          rec.basePos
            .copy(water7OriginPos)
            .addScaledVector(water7East, sp.x)
            .addScaledVector(water7Up, sp.y)
            .addScaledVector(water7South, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'marineford') {
          const sp = toMarinefordSphereLocal(0, 52, -43, GLOBE_RADIUS);
          rec.basePos
            .copy(marinefordOriginPos)
            .addScaledVector(marinefordEast, sp.x)
            .addScaledVector(marinefordUp, sp.y)
            .addScaledVector(marinefordSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'polestar-islands') {
          const sp = toLoguetownSphereLocal(0, 22, -4, GLOBE_RADIUS);
          rec.basePos
            .copy(loguetownOriginPos)
            .addScaledVector(loguetownEast, sp.x)
            .addScaledVector(loguetownUp, sp.y)
            .addScaledVector(loguetownSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (CONOMI_SUB_LOCATIONS[rec.island.id]) {
          const [lx, lz] = CONOMI_SUB_LOCATIONS[rec.island.id];
          const ly = Math.max(0.4, sampleConomiWalkSurfaceHeight(lx, lz)) + 16.0;
          const sp = toConomiSphereLocal(lx, ly, lz, GLOBE_RADIUS);
          rec.basePos
            .copy(conomiOriginPos)
            .addScaledVector(conomiEast, sp.x)
            .addScaledVector(conomiUp, sp.y)
            .addScaledVector(conomiSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (GECKO_SUB_LOCATIONS[rec.island.id]) {
          const [lx, lz] = GECKO_SUB_LOCATIONS[rec.island.id];
          const ly = Math.max(0.4, sampleGeckoWalkSurfaceHeight(lx, lz)) + 16.0;
          const sp = toGeckoSphereLocal(lx, ly, lz, GLOBE_RADIUS);
          rec.basePos
            .copy(geckoOriginPos)
            .addScaledVector(geckoEast, sp.x)
            .addScaledVector(geckoUp, sp.y)
            .addScaledVector(geckoSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (DAWN_SUB_LOCATIONS[rec.island.id]) {
          const [lx, lz] = DAWN_SUB_LOCATIONS[rec.island.id];
          const ly = Math.max(0.4, sampleDawnWalkSurfaceHeight(lx, lz)) + 16.0;
          const sp = toDawnSphereLocal(lx, ly, lz, GLOBE_RADIUS);
          rec.basePos
            .copy(dawnOriginPos)
            .addScaledVector(dawnEast, sp.x)
            .addScaledVector(dawnUp, sp.y)
            .addScaledVector(dawnSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'goat-island') {
          const ly = Math.max(0.4, sampleGoatWalkSurfaceHeight(26, 0)) + 16.0;
          const sp = toGoatSphereLocal(26, ly, 0, GLOBE_RADIUS);
          rec.basePos
            .copy(goatOriginPos)
            .addScaledVector(goatEast, sp.x)
            .addScaledVector(goatUp, sp.y)
            .addScaledVector(goatSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'shells-town') {
          const sp = toShellsSphereLocal(-4, 34, -4, GLOBE_RADIUS);
          rec.basePos
            .copy(shellsOriginPos)
            .addScaledVector(shellsEast, sp.x)
            .addScaledVector(shellsUp, sp.y)
            .addScaledVector(shellsSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (ORGAN_SUB_LOCATIONS[rec.island.id]) {
          const [lx, lz] = ORGAN_SUB_LOCATIONS[rec.island.id];
          const ly = Math.max(0.4, sampleOrganWalkSurfaceHeight(lx, lz)) + 16.0;
          const sp = toOrganSphereLocal(lx, ly, lz, GLOBE_RADIUS);
          rec.basePos
            .copy(organOriginPos)
            .addScaledVector(organEast, sp.x)
            .addScaledVector(organUp, sp.y)
            .addScaledVector(organSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'baratie') {
          const sp = toBaratieSphereLocal(0, 24.5, 0, GLOBE_RADIUS);
          rec.basePos
            .copy(baratieOriginPos)
            .addScaledVector(baratieEast, sp.x)
            .addScaledVector(baratieUp, sp.y)
            .addScaledVector(baratieSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'reverse-mountain') {
          const sp = toReverseMountainSphereLocal(0, RM_SUMMIT_WATER_Y + 6, 0, GLOBE_RADIUS);
          rec.basePos
            .copy(rmOriginPos)
            .addScaledVector(rmEast, sp.x)
            .addScaledVector(rmUp, sp.y)
            .addScaledVector(rmSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'twin-cape') {
          const sp = toTwinCapeSphereLocal(-4, 72, 0, GLOBE_RADIUS);
          rec.basePos
            .copy(twinCapeOriginPos)
            .addScaledVector(twinCapeEast, sp.x)
            .addScaledVector(twinCapeUp, sp.y)
            .addScaledVector(twinCapeSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'little-garden') {
          const sp = toLittleGardenSphereLocal(0, 22.0, 0, GLOBE_RADIUS);
          rec.basePos
            .copy(littleGardenOriginPos)
            .addScaledVector(littleGardenEast, sp.x)
            .addScaledVector(littleGardenUp, sp.y)
            .addScaledVector(littleGardenSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'cactus-island') {
          const sp = toCactusSphereLocal(0, 22.0, 0, GLOBE_RADIUS);
          rec.basePos
            .copy(cactusOriginPos)
            .addScaledVector(cactusEast, sp.x)
            .addScaledVector(cactusUp, sp.y)
            .addScaledVector(cactusSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'drum-island') {
          const sp = toDrumSphereLocal(0, 62.0, -18.0, GLOBE_RADIUS);
          rec.basePos
            .copy(drumOriginPos)
            .addScaledVector(drumEast, sp.x)
            .addScaledVector(drumUp, sp.y)
            .addScaledVector(drumSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'jaya' || rec.island.id === 'mock-town') {
          const [lx, ly, lz] =
            rec.island.id === 'mock-town' ? [-35.5, 13.5, -28.0] : [2.0, 12.0, 14.0];
          const sp = toJayaSphereLocal(lx, ly, lz, GLOBE_RADIUS);
          rec.basePos
            .copy(jayaOriginPos)
            .addScaledVector(jayaEast, sp.x)
            .addScaledVector(jayaUp, sp.y)
            .addScaledVector(jayaSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'long-ring-long-land') {
          const sp = toLongRingSphereLocal(0.0, 12.5, 0.0, GLOBE_RADIUS);
          rec.basePos
            .copy(longRingOriginPos)
            .addScaledVector(longRingEast, sp.x)
            .addScaledVector(longRingUp, sp.y)
            .addScaledVector(longRingSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'shift-station') {
          const sp = toShiftSphereLocal(8.2, 16.0, -5.0, GLOBE_RADIUS);
          rec.basePos
            .copy(shiftOriginPos)
            .addScaledVector(shiftEast, sp.x)
            .addScaledVector(shiftUp, sp.y)
            .addScaledVector(shiftSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'pucci-island') {
          const sp = toStationIslandSphereLocal(0.0, 14.0, 2.0, GLOBE_RADIUS);
          rec.basePos
            .copy(pucciOriginPos)
            .addScaledVector(pucciEast, sp.x)
            .addScaledVector(pucciUp, sp.y)
            .addScaledVector(pucciSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'san-faldo') {
          const sp = toStationIslandSphereLocal(0.0, 14.0, 2.0, GLOBE_RADIUS);
          rec.basePos
            .copy(sanFaldoOriginPos)
            .addScaledVector(sanFaldoEast, sp.x)
            .addScaledVector(sanFaldoUp, sp.y)
            .addScaledVector(sanFaldoSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'st-poplar') {
          const sp = toStationIslandSphereLocal(0.0, 14.0, 2.0, GLOBE_RADIUS);
          rec.basePos
            .copy(stPoplarOriginPos)
            .addScaledVector(stPoplarEast, sp.x)
            .addScaledVector(stPoplarUp, sp.y)
            .addScaledVector(stPoplarSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'enies-lobby') {
          const sp = toEniesSphereLocal(0.0, 42.0, -10.0, GLOBE_RADIUS);
          rec.basePos
            .copy(eniesOriginPos)
            .addScaledVector(eniesEast, sp.x)
            .addScaledVector(eniesUp, sp.y)
            .addScaledVector(eniesSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'amazon-lily') {
          const sp = toAmazonLilySphereLocal(0.0, 62.0, -10.0, GLOBE_RADIUS);
          rec.basePos
            .copy(amazonLilyOriginPos)
            .addScaledVector(amazonLilyEast, sp.x)
            .addScaledVector(amazonLilyUp, sp.y)
            .addScaledVector(amazonLilySouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'thriller-bark') {
          const sp = toThrillerBarkSphereLocal(0.0, 96.0, -4.0, GLOBE_RADIUS);
          rec.basePos
            .copy(thrillerBarkOriginPos)
            .addScaledVector(thrillerBarkEast, sp.x)
            .addScaledVector(thrillerBarkUp, sp.y)
            .addScaledVector(thrillerBarkSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'sabaody') {
          const sp = toSabaodySphereLocal(0.0, 56.0, 0.0, GLOBE_RADIUS);
          rec.basePos
            .copy(sabaodyOriginPos)
            .addScaledVector(sabaodyEast, sp.x)
            .addScaledVector(sabaodyUp, sp.y)
            .addScaledVector(sabaodySouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'punk-hazard') {
          const sp = toPunkHazardSphereLocal(0.0, 44.0, 0.0, GLOBE_RADIUS);
          rec.basePos
            .copy(punkHazardOriginPos)
            .addScaledVector(punkHazardEast, sp.x)
            .addScaledVector(punkHazardUp, sp.y)
            .addScaledVector(punkHazardSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (DRESSROSA_SUB_LOCATIONS[rec.island.id]) {
          const [lx, lz] = DRESSROSA_SUB_LOCATIONS[rec.island.id];
          const ly = Math.max(2.0, sampleDressrosaWalkSurfaceHeight(lx, lz)) + 16.0;
          const sp = toDressrosaSphereLocal(lx, ly, lz, GLOBE_RADIUS);
          rec.basePos
            .copy(dressrosaOriginPos)
            .addScaledVector(dressrosaEast, sp.x)
            .addScaledVector(dressrosaUp, sp.y)
            .addScaledVector(dressrosaSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (TOTTO_LAND_SUB_LOCATIONS[rec.island.id]) {
          const [lx, lz] = TOTTO_LAND_SUB_LOCATIONS[rec.island.id];
          const ly =
            rec.island.id === 'whole-cake-island'
              ? 56.0
              : Math.max(2.0, sampleTottoLandWalkSurfaceHeight(lx, lz)) + 16.0;
          const sp = toTottoLandSphereLocal(lx, ly, lz, GLOBE_RADIUS);
          rec.basePos
            .copy(tottoLandOriginPos)
            .addScaledVector(tottoLandEast, sp.x)
            .addScaledVector(tottoLandUp, sp.y)
            .addScaledVector(tottoLandSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'zou') {
          const sp = toZouSphereLocal(0.0, ZOU_BACK_DECK_Y + 46.0, -14.0, GLOBE_RADIUS);
          rec.basePos
            .copy(zouOriginPos)
            .addScaledVector(zouEast, sp.x)
            .addScaledVector(zouUp, sp.y)
            .addScaledVector(zouSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (WANO_SUB_LOCATIONS[rec.island.id]) {
          const [lx, lz] = WANO_SUB_LOCATIONS[rec.island.id];
          const ly =
            rec.island.id === 'wano'
              ? WANO_PLATEAU_Y + 46.0
              : rec.island.id === 'flower-capital'
                ? WANO_PLATEAU_Y + 24.0
                : rec.island.id === 'onigashima'
                  ? WANO_PLATEAU_Y + 26.0
                  : Math.max(4.0, sampleWanoWalkSurfaceHeight(lx, lz)) + 14.0;
          const sp = toWanoSphereLocal(lx, ly, lz, GLOBE_RADIUS);
          rec.basePos
            .copy(wanoOriginPos)
            .addScaledVector(wanoEast, sp.x)
            .addScaledVector(wanoUp, sp.y)
            .addScaledVector(wanoSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id in EGGHEAD_SUB_LOCATIONS) {
          const sp = toEggheadSphereLocal(
            0.0,
            EGGHEAD_CLOUD_DECK_Y + 42.0,
            -2.0,
            GLOBE_RADIUS
          );
          rec.basePos
            .copy(eggheadOriginPos)
            .addScaledVector(eggheadEast, sp.x)
            .addScaledVector(eggheadUp, sp.y)
            .addScaledVector(eggheadSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id in ELBAF_SUB_LOCATIONS) {
          const sp = toElbafSphereLocal(
            0.0,
            ELBAF_HEAVEN_Y + 26.0,
            -2.0,
            GLOBE_RADIUS
          );
          rec.basePos
            .copy(elbafOriginPos)
            .addScaledVector(elbafEast, sp.x)
            .addScaledVector(elbafUp, sp.y)
            .addScaledVector(elbafSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'mary-geoise') {
          const sp = toMaryGeoiseSphereLocal(0.0, 78.0, -44.0, GLOBE_RADIUS);
          rec.basePos
            .copy(maryGeoiseOriginPos)
            .addScaledVector(maryGeoiseEast, sp.x)
            .addScaledVector(maryGeoiseUp, sp.y)
            .addScaledVector(maryGeoiseSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        if (rec.island.id === 'impel-down') {
          const sp = toImpelSphereLocal(0.0, 48.0, 0.0, GLOBE_RADIUS);
          rec.basePos
            .copy(impelDownOriginPos)
            .addScaledVector(impelDownEast, sp.x)
            .addScaledVector(impelDownUp, sp.y)
            .addScaledVector(impelDownSouth, sp.z);
          rec.normal.copy(rec.basePos).normalize();
          rec.group.position.copy(rec.basePos);
          _targetQuat.setFromUnitVectors(_upVec, rec.normal);
          rec.group.quaternion.copy(_targetQuat);
          continue;
        }

        const hNorm = maps.sampleHeightAt(rec.island.u, rec.island.v);
        const r =
          rec.island.elevationTier === 'sky'
            ? GLOBE_RADIUS + 1.38
            : Math.max(GLOBE_RADIUS + 0.04, terrainRadiusAtHeight(hNorm) + 0.04);
        const pos = equirectangularToSphere(rec.island.u, rec.island.v, r);
        rec.basePos.set(pos.x, pos.y, pos.z);
        rec.normal.copy(rec.basePos).normalize();
        rec.group.position.copy(rec.basePos);
        _targetQuat.setFromUnitVectors(_upVec, rec.normal);
        rec.group.quaternion.copy(_targetQuat);
      }
      islandMistSystem.syncAnchorPositions();
    };

    let currentMaps: ProcessedGlobeMaps | null = null;
    let loadSeq = 0;

    // Thousand Sunny Ship State (created lazily on first sailing activation)
    let sunnyHandle: SunnyShipHandle | null = null;
    let sunnyState: SunnyState | null = null;
    let sunnyCollisionEnv: SunnyCollisionEnv = createDefaultSunnyCollisionEnv(
      GLOBE_RADIUS,
      () => 0
    );

    // Towering Knock Up Stream water column linking Blue Sea off Jaya to Skypiea's Angel Bay
    const knockUpStreamHandle: KnockUpStreamHandle = createKnockUpStreamModel();
    const kusInitialUV = worldPosToEquirectangular(
      sunnyCollisionEnv.knockUpStreamCenter
    );
    orientOnSphere(
      knockUpStreamHandle.group,
      kusInitialUV.u,
      kusInitialUV.v,
      GLOBE_RADIUS,
      'default'
    );
    knockUpStreamHandle.group.visible = false;
    scene.add(knockUpStreamHandle.group);

    // Perilous Subsea Plunge Vortex off Red Line West descending -10,000 m toward Fish-Man Island
    const subseaPlungeHandle: SubseaPlungeHandle = createSubseaPlungeModel();
    orientOnSphere(
      subseaPlungeHandle.group,
      SUBSEA_PLUNGE_GLOBE_COORDS.u,
      SUBSEA_PLUNGE_GLOBE_COORDS.v,
      GLOBE_RADIUS,
      'default'
    );
    subseaPlungeHandle.group.visible = false;
    scene.add(subseaPlungeHandle.group);

    // Continuous Umi Ressha Sea Train Ocean Rail Network, Day Station Relay & Animated Puffing Tom Trains
    const seaTrainNetworkHandle: SeaTrainNetworkHandle =
      createSeaTrainNetworkModel(GLOBE_RADIUS);
    seaTrainNetworkHandle.group.visible = false;
    scene.add(seaTrainNetworkHandle.group);

    // Closed Tarai Current Triangle, 3 Gates of Justice & Animated Clockwise Swirling Currents
    const taraiCurrentNetworkHandle: TaraiCurrentNetworkHandle =
      createTaraiCurrentNetworkModel(GLOBE_RADIUS);
    taraiCurrentNetworkHandle.group.visible = false;
    scene.add(taraiCurrentNetworkHandle.group);

    let lastTelemetrySentMs = 0;
    let lastStreamCheckMs = 0;
    let sailingPrepSeq = 0;
    let isDraggingSunnyCam = false;
    let dragLastX = 0;
    let dragLastY = 0;
    let activeDragPointerId: number | null = null;
    const sunnyOrbit: SunnyCameraOrbit = { ...DEFAULT_SUNNY_CAMERA_ORBIT };
    const sunnyOrbitTarget: SunnyCameraOrbit = { ...DEFAULT_SUNNY_CAMERA_ORBIT };
    let sunnyBoostState: SunnyBoostState = createInitialSunnyBoostState();

    const resetSunnyOrbit = (immediate = true) => {
      sunnyOrbitTarget.yaw = DEFAULT_SUNNY_CAMERA_ORBIT.yaw;
      sunnyOrbitTarget.pitch = DEFAULT_SUNNY_CAMERA_ORBIT.pitch;
      sunnyOrbitTarget.distanceScale = DEFAULT_SUNNY_CAMERA_ORBIT.distanceScale;
      if (immediate) {
        sunnyOrbit.yaw = DEFAULT_SUNNY_CAMERA_ORBIT.yaw;
        sunnyOrbit.pitch = DEFAULT_SUNNY_CAMERA_ORBIT.pitch;
        sunnyOrbit.distanceScale = DEFAULT_SUNNY_CAMERA_ORBIT.distanceScale;
      }
    };

    const emitSunnyTelemetryNow = () => {
      if (!sunnyState) return;
      const uv = worldPosToEquirectangular(sunnyState.position);
      const targetIsland =
        mugiwaraTargetRef.current ??
        ONE_PIECE_LOCATIONS.find((l) => l.id === 'reverse-mountain') ??
        ONE_PIECE_LOCATIONS[0];
      const guidance = computeLogPoseGuidance(
        sunnyState.position,
        sunnyState.heading,
        targetIsland,
        GLOBE_RADIUS
      );
      onSunnyTelemetryRef.current?.({
        speedKnots: Math.round(Math.abs(sunnyState.speed) * 145),
        collided: sunnyState.collided,
        calmBeltBlocked: sunnyState.calmBeltBlocked,
        inReverseMountainCanal: sunnyState.inReverseMountainCanal,
        reverseMountainPhase: sunnyState.reverseMountainPhase,
        skyZone: sunnyState.skyZone,
        balloonDeploy: sunnyState.balloonDeploy,
        knockUpStreamProgress: sunnyState.knockUpStreamProgress,
        coated: Boolean(sunnyState.coated),
        coatingRequiredBlocked: Boolean(sunnyState.coatingRequiredBlocked),
        subseaDiveProgress: sunnyState.subseaDiveProgress ?? 0,
        elevationMeters: Math.round(sunnyState.elevation * 120),
        pitchDeg: Math.round((sunnyState.pitchAngle * 180) / Math.PI),
        u: uv.u,
        v: uv.v,
        shipMapHeadingDeg: (guidance.shipMapHeadingRad * 180) / Math.PI,
        logPoseRelativeAngleDeg: (guidance.relativeAngleRad * 180) / Math.PI,
        logPoseDistanceKm: guidance.distanceKm,
        orbitYawDeg: Math.round((sunnyOrbit.yaw * 180) / Math.PI),
        orbitPitchDeg: Math.round((sunnyOrbit.pitch * 180) / Math.PI),
        nearestIslandName: sunnyState.nearestIsland?.name ?? null,
        nearestDistanceKm: Math.round(sunnyState.nearestDistance * 120),
        boostActive: sunnyBoostState.activeRemainingSec > 0,
        boostRemainingSec: Number(sunnyBoostState.activeRemainingSec.toFixed(2)),
        boostCooldownSec: Number(sunnyBoostState.cooldownRemainingSec.toFixed(2)),
      });
    };

    const sampleSunnyWaveForState = (
      state: SunnyState,
      elapsedSec: number,
      underCloudRoughness = 0
    ) => {
      if (state.skyZone !== 'blue-sea' || state.inReverseMountainCanal) {
        return ZERO_WAVE_SAMPLE;
      }
      _v1.set(state.position.x, state.position.y, state.position.z).normalize();
      _vForward.set(state.heading.x, state.heading.y, state.heading.z).normalize();
      _vRight.crossVectors(_v1, _vForward).normalize();
      const uv = worldPosToEquirectangular(state.position);
      const calm = sunnyCollisionEnv.sampleCalmBelt(uv.u, uv.v);
      return sampleOceanWaveSurface(
        _v1,
        elapsedSec,
        cloudCoverSmooth,
        calm,
        _vForward,
        _vRight,
        underCloudRoughness
      );
    };

    const applySunnyTransform = (state: SunnyState, seaSurfaceOffset = 0) => {
      if (!sunnyHandle) return;
      _v2.set(state.position.x, state.position.y, state.position.z).normalize(); // up
      sunnyHandle.group.position
        .copy(_v2)
        .multiplyScalar(GLOBE_RADIUS + state.elevation + seaSurfaceOffset);
      _vForward.set(state.heading.x, state.heading.y, state.heading.z).normalize(); // +Z
      _vRight.crossVectors(_v2, _vForward).normalize(); // +X
      _basisMat.makeBasis(_vRight, _v2, _vForward);
      sunnyHandle.group.quaternion.setFromRotationMatrix(_basisMat);
      if (Math.abs(state.pitchAngle) > 1e-4) {
        sunnyHandle.group.rotateX(-state.pitchAngle);
      }
    };

    const ensureSunnyCreated = () => {
      if (!sunnyHandle) {
        sunnyHandle = createThousandSunnyModel();
        if (!isSoftwareGl) {
          sunnyHandle.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const mat = child.material as THREE.Material | THREE.Material[];
              const isTranslucent = Array.isArray(mat)
                ? mat.some((m) => m.transparent)
                : Boolean(mat?.transparent);
              if (!isTranslucent) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            }
          });
        }
        scene.add(sunnyHandle.group);
      }
      if (!sunnyState) {
        sunnyState = createSafeSunnySpawn(
          selectedIslandRef.current,
          sunnyCollisionEnv,
          ONE_PIECE_LOCATIONS
        );
        const initWave = sampleSunnyWaveForState(sunnyState, elapsed);
        applySunnyTransform(sunnyState, initWave.seaLevelOffset);
      }
    };

    const prepareSailingSession = (targetIsland: IslandLocation | null) => {
      const prepSeq = ++sailingPrepSeq;
      onSailingPreparingChangeRef.current?.(true);
      sunnyBoostState = createInitialSunnyBoostState();
      resetSunnyOrbit();

      requestAnimationFrame(async () => {
        if (disposed || prepSeq !== sailingPrepSeq || !sailingActiveRef.current) {
          return;
        }
        ensureSunnyCreated();
        sunnyState = createSafeSunnySpawn(
          targetIsland,
          sunnyCollisionEnv,
          ONE_PIECE_LOCATIONS
        );
        const prepWave = sampleSunnyWaveForState(sunnyState, elapsed);
        applySunnyTransform(sunnyState, prepWave.seaLevelOffset);
        if (sunnyHandle) sunnyHandle.group.visible = true;
        syncVfxAudioEdgesFromState();

        const pendingLoads: Promise<void>[] = [];
        for (const rec of streamedRecords) {
          const d = rec.worldPos.distanceTo(sunnyHandle!.group.position);
          const threshold =
            rec.island.id === 'reverse-mountain' || rec.island.id === 'twin-cape'
              ? 4.8
              : rec.island.id === 'whole-cake-island'
                ? 3.4
                : rec.island.id === 'jaya' || rec.island.id === 'skypiea'
                  ? 2.8
                  : 1.65;
          if (d < threshold) {
            pendingLoads.push(ensureIslandLoaded(rec.island.id));
          }
        }
        if (targetIsland && CUSTOM_3D_ISLAND_IDS.has(targetIsland.id)) {
          pendingLoads.push(ensureIslandLoaded(targetIsland.id));
        }
        if (
          targetIsland &&
          (targetIsland.id === 'jaya' ||
            targetIsland.id === 'mock-town' ||
            targetIsland.id === 'skypiea' ||
            targetIsland.id === 'angel-island' ||
            targetIsland.id === 'upper-yard' ||
            targetIsland.id === 'hidden-cloud-village')
        ) {
          pendingLoads.push(ensureIslandLoaded('jaya'));
          pendingLoads.push(ensureIslandLoaded('skypiea'));
        }
        if (!targetIsland || targetIsland.id === 'reverse-mountain' || targetIsland.id === 'twin-cape') {
          pendingLoads.push(ensureIslandLoaded('reverse-mountain'));
          pendingLoads.push(ensureIslandLoaded('twin-cape'));
        }
        if (targetIsland && (targetIsland.id === 'fish-man-island' || targetIsland.id === 'sabaody')) {
          pendingLoads.push(ensureIslandLoaded('fish-man-island'));
        }
        if (targetIsland && targetIsland.id in DRESSROSA_SUB_LOCATIONS) {
          pendingLoads.push(ensureIslandLoaded('dressrosa'));
        }
        if (targetIsland && targetIsland.id in TOTTO_LAND_SUB_LOCATIONS) {
          pendingLoads.push(ensureIslandLoaded('whole-cake-island'));
        }
        if (targetIsland && targetIsland.id in WANO_SUB_LOCATIONS) {
          pendingLoads.push(ensureIslandLoaded('wano'));
        }
        if (targetIsland && targetIsland.id in EGGHEAD_SUB_LOCATIONS) {
          pendingLoads.push(ensureIslandLoaded('egghead-island'));
        }
        if (targetIsland && targetIsland.id in ELBAF_SUB_LOCATIONS) {
          pendingLoads.push(ensureIslandLoaded('elbaf'));
        }
        if (pendingLoads.length > 0) {
          await Promise.allSettled(pendingLoads);
        }
        if (disposed || prepSeq !== sailingPrepSeq || !sailingActiveRef.current) {
          return;
        }

        const camGoal = computeSunnyNavigatorCamera(
          sunnyState!,
          sunnyCameraModeRef.current,
          GLOBE_RADIUS,
          sunnyOrbit
        );
        camera.position.set(
          camGoal.position.x,
          camGoal.position.y,
          camGoal.position.z
        );
        controls.target.set(camGoal.target.x, camGoal.target.y, camGoal.target.z);
        camera.up.set(camGoal.up.x, camGoal.up.y, camGoal.up.z);
        camera.lookAt(controls.target);
        controls.enabled = false;
        emitSunnyTelemetryNow();

        window.setTimeout(() => {
          requestAnimationFrame(() => {
            if (!disposed && prepSeq === sailingPrepSeq) {
              onSailingPreparingChangeRef.current?.(false);
            }
          });
        }, isSoftwareGl ? 140 : 240);
      });
    };

    const warpSunnyToIsland = (targetIsland: IslandLocation | null) => {
      if (sailingActiveRef.current) {
        prepareSailingSession(targetIsland);
        return;
      }
      ensureSunnyCreated();
      sunnyState = createSafeSunnySpawn(
        targetIsland,
        sunnyCollisionEnv,
        ONE_PIECE_LOCATIONS
      );
      applySunnyTransform(sunnyState);
      syncVfxAudioEdgesFromState();
      emitSunnyTelemetryNow();
    };

    const tryActivateSunnyBoost = () => {
      if (!sailingActiveRef.current || isPausedRef.current) return;
      ensureSunnyCreated();
      if (!sunnyState) return;
      const { next, triggered } = triggerSunnyBoost(sunnyBoostState);
      if (!triggered) return;
      sunnyBoostState = next;
      prevBoost = true;
      onPlayAudioSfxRef.current?.('sfx-coup-de-burst', 1.0, 200);
      emitSunnyTelemetryNow();
    };

    const triggerSunnyAction = (action: 'resurface' | 'boost') => {
      if (action === 'boost') {
        tryActivateSunnyBoost();
        return;
      }
      ensureSunnyCreated();
      if (!sunnyState) return;
      if (action === 'resurface') {
        sunnyState = resurfaceToNewWorld(
          sunnyState,
          sunnyCollisionEnv,
          ONE_PIECE_LOCATIONS
        );
      }
      applySunnyTransform(sunnyState);
      syncVfxAudioEdgesFromState();
      emitSunnyTelemetryNow();
    };

    let titlePreloadQueue: { cancel: () => void } | null = null;
    let startupCompleteTimer: number | null = null;
    let startupPreloadCompleted = false;
    const preloadedChunkIds = new Set<string>();
    const islandNameById = new Map<string, string>(
      ONE_PIECE_LOCATIONS.map((loc) => [loc.id, loc.name])
    );

    const startStartupPreload = async () => {
      titlePreloadQueue?.cancel();
      titlePreloadQueue = null;
      if (startupCompleteTimer !== null) {
        window.clearTimeout(startupCompleteTimer);
        startupCompleteTimer = null;
      }
      if (disposed || !loadingScreenActiveRef.current || !currentMaps) return;

      ensureSunnyCreated();
      const orderedIds = buildOrderedPreloadIds(CUSTOM_3D_ISLAND_IDS);
      const total = orderedIds.length;

      let fontsReady = false;
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        await Promise.race([
          document.fonts.ready.then(() => {
            fontsReady = true;
          }),
          new Promise<void>((resolve) => window.setTimeout(resolve, 1100)),
        ]);
      } else {
        fontsReady = true;
      }
      if (disposed || !loadingScreenActiveRef.current) return;
      fontsReady = true;

      onPreloadStatusChangeRef.current?.({
        phase: 'islands',
        progress: computeStartupPreloadProgress({
          mapFraction: 1,
          fontsReady,
          completedIslands: 0,
          totalIslands: total,
          phase: 'islands',
        }),
        completedIslands: 0,
        totalIslands: total,
        currentLabel: 'CHARGEMENT...',
        currentDetail: 'Préparation des îles 3D…',
      });

      const queue = startCooperativePreloadQueue({
        islandIds: orderedIds,
        initialDelayMs: 30,
        stepDelayMs: isSoftwareGl ? 20 : 12,
        shouldStop: () => disposed || !loadingScreenActiveRef.current,
        scheduleStep: (fn, delayMs) => {
          const id = window.setTimeout(fn, delayMs);
          return () => window.clearTimeout(id);
        },
        loadTask: async (islandId) => {
          if (disposed || !loadingScreenActiveRef.current) return;
          if (!preloadedChunkIds.has(islandId)) {
            await loadIslandBuilder(islandId);
            preloadedChunkIds.add(islandId);
          }
          if (!disposed && loadingScreenActiveRef.current) {
            await ensureIslandLoaded(islandId, true);
          }
        },
        onProgress: ({ completed, total: queueTotal, lastLoadedId }) => {
          if (disposed) return;
          onPreloadProgressChangeRef.current?.(completed, queueTotal);
          const islandName = lastLoadedId
            ? islandNameById.get(lastLoadedId) ?? lastLoadedId
            : 'Grand Line';
          onPreloadStatusChangeRef.current?.({
            phase: 'islands',
            progress: computeStartupPreloadProgress({
              mapFraction: 1,
              fontsReady,
              completedIslands: completed,
              totalIslands: queueTotal,
              phase: 'islands',
            }),
            completedIslands: completed,
            totalIslands: queueTotal,
            currentLabel: 'CHARGEMENT...',
            currentDetail: `${islandName} (${completed}/${queueTotal})`,
          });
        },
      });
      titlePreloadQueue = queue;

      await queue.done;
      if (disposed || !loadingScreenActiveRef.current) return;

      startupPreloadCompleted = true;
      onPreloadStatusChangeRef.current?.({
        phase: 'ready',
        progress: 1,
        completedIslands: total,
        totalIslands: total,
        currentLabel: 'CHARGEMENT...',
        currentDetail: 'Toutes les îles sont prêtes',
      });

      startupCompleteTimer = window.setTimeout(() => {
        startupCompleteTimer = null;
        if (!disposed && loadingScreenActiveRef.current) {
          onStartupPreloadCompleteRef.current?.();
        }
      }, 240);
    };

    const startTitleBackgroundPreload = () => {
      if (loadingScreenActiveRef.current || startupPreloadCompleted) return;
      titlePreloadQueue?.cancel();
      titlePreloadQueue = null;
      if (disposed || !titleScreenActiveRef.current || !currentMaps) return;

      const orderedIds = buildOrderedPreloadIds(CUSTOM_3D_ISLAND_IDS);
      const meshWarmupIds = new Set(orderedIds.slice(0, isSoftwareGl ? 3 : 7));

      titlePreloadQueue = startCooperativePreloadQueue({
        islandIds: orderedIds,
        initialDelayMs: 650,
        stepDelayMs: isSoftwareGl ? 220 : 90,
        shouldStop: () => disposed || !titleScreenActiveRef.current,
        loadTask: async (islandId) => {
          if (disposed || !titleScreenActiveRef.current) return;
          if (!preloadedChunkIds.has(islandId)) {
            await loadIslandBuilder(islandId);
            preloadedChunkIds.add(islandId);
          }
          if (
            !disposed &&
            titleScreenActiveRef.current &&
            meshWarmupIds.has(islandId)
          ) {
            await ensureIslandLoaded(islandId, true);
          }
        },
        onProgress: ({ completed, total }) => {
          if (!disposed) {
            onPreloadProgressChangeRef.current?.(completed, total);
          }
        },
      });
    };

    const setSailingMode = (
      active: boolean,
      targetIsland?: IslandLocation | null
    ) => {
      flyState.active = false;
      zoomAnchorActive = false;
      isDraggingSunnyCam = false;
      activeDragPointerId = null;
      if (active) {
        titlePreloadQueue?.cancel();
        titlePreloadQueue = null;
        prepareSailingSession(
          targetIsland !== undefined ? targetIsland : selectedIslandRef.current
        );
      } else {
        sailingPrepSeq++;
        sunnyBoostState = createInitialSunnyBoostState();
        onSailingPreparingChangeRef.current?.(false);
        if (!titleScreenActiveRef.current) {
          controls.enabled = true;
          if (sunnyHandle) sunnyHandle.group.visible = false;
          if (sunnyState) {
            _v2.set(
              sunnyState.position.x,
              sunnyState.position.y,
              sunnyState.position.z
            );
            _v1.copy(_v2).normalize();
            camera.position.copy(_v2).addScaledVector(_v1, 0.55);
            controls.target.copy(_v2);
          }
        }
      }
    };

    const setTitleScreenMode = (active: boolean) => {
      flyState.active = false;
      zoomAnchorActive = false;
      isDraggingSunnyCam = false;
      activeDragPointerId = null;
      if (active) {
        controls.enabled = false;
        ensureSunnyCreated();
        if (sunnyHandle) sunnyHandle.group.visible = true;
        if (currentMaps && !loadingScreenActiveRef.current && !startupPreloadCompleted) {
          ensureIslandLoaded('dawn-island', true);
          startTitleBackgroundPreload();
        }
        const framing = computeTitleScreenSunnyAndCamera(
          sunnyCollisionEnv,
          elapsed
        );
        sunnyState = framing.sunnyState;
        applySunnyTransform(sunnyState);
        camera.position.set(
          framing.cameraPosition.x,
          framing.cameraPosition.y,
          framing.cameraPosition.z
        );
        controls.target.set(
          framing.cameraTarget.x,
          framing.cameraTarget.y,
          framing.cameraTarget.z
        );
        camera.up.set(framing.cameraUp.x, framing.cameraUp.y, framing.cameraUp.z);
        camera.lookAt(controls.target);
        camera.near = 0.00022;
        camera.updateProjectionMatrix();
      } else {
        titlePreloadQueue?.cancel();
        titlePreloadQueue = null;
        if (!sailingActiveRef.current) {
          if (sunnyHandle) {
            sunnyHandle.group.visible = false;
          }
          controls.enabled = true;
          camera.up.copy(_upVec);
          if (selectedIslandRef.current) {
            flyToIsland(selectedIslandRef.current);
          } else {
            camera.position.copy(DEFAULT_CAMERA_POS);
            controls.target.set(0, 0, 0);
            camera.lookAt(controls.target);
            controls.update();
          }
        }
      }
    };

    const loadMapUrl = (url: string, retryAttempt = 0) => {
      const seq = retryAttempt === 0 ? ++loadSeq : loadSeq;
      onMapLoadStateChangeRef.current?.(true, null);
      if (loadingScreenActiveRef.current) {
        onPreloadStatusChangeRef.current?.({
          phase: 'map',
          progress: computeStartupPreloadProgress({
            mapFraction: 0.25,
            fontsReady: false,
            completedIslands: 0,
            totalIslands: CUSTOM_3D_ISLAND_IDS.size,
            phase: 'map',
          }),
          completedIslands: 0,
          totalIslands: CUSTOM_3D_ISLAND_IDS.size,
          currentLabel: 'CHARGEMENT...',
          currentDetail: 'Carte du monde & océans…',
        });
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        if (seq !== loadSeq || disposed) return;
        if (loadingScreenActiveRef.current) {
          onPreloadStatusChangeRef.current?.({
            phase: 'map',
            progress: computeStartupPreloadProgress({
              mapFraction: 0.65,
              fontsReady: false,
              completedIslands: 0,
              totalIslands: CUSTOM_3D_ISLAND_IDS.size,
              phase: 'map',
            }),
            completedIslands: 0,
            totalIslands: CUSTOM_3D_ISLAND_IDS.size,
            currentLabel: 'CHARGEMENT...',
            currentDetail: 'Synthèse des reliefs & courants…',
          });
        }
        const maxAniso = renderer.capabilities.getMaxAnisotropy();
        const nextMaps = await processWorldMapImageProgressive(
          img,
          maxAniso,
          () => disposed || seq !== loadSeq
        );
        if (!nextMaps || seq !== loadSeq || disposed) {
          nextMaps?.dispose();
          return;
        }

        if (currentMaps) {
          currentMaps.dispose();
        }
        currentMaps = nextMaps;
        sunnyCollisionEnv = createDefaultSunnyCollisionEnv(
          GLOBE_RADIUS,
          nextMaps.sampleHeightAt,
          nextMaps.sampleCalmBeltAt,
          nextMaps.sampleCanalAt
        );

        terrainMat.map = nextMaps.terrainAlbedoTexture;
        terrainMat.normalMap = nextMaps.terrainNormalTexture;
        terrainMat.emissiveMap = nextMaps.nightLightsTexture;
        terrainMat.needsUpdate = true;

        oceanMat.map = nextMaps.oceanColorTexture;
        oceanMat.needsUpdate = true;

        applyTerrainReliefAndScatter(nextMaps);
        onMapLoadStateChangeRef.current?.(false, null);
      };
      img.onerror = () => {
        if (seq !== loadSeq || disposed) return;
        if (retryAttempt < 1) {
          window.setTimeout(() => {
            if (!disposed && seq === loadSeq) {
              loadMapUrl(url, retryAttempt + 1);
            }
          }, 1600);
          return;
        }
        const errMsg =
          'Could not decode map image. Please choose a valid PNG or JPEG equirectangular map.';
        onMapLoadStateChangeRef.current?.(false, errMsg);
        if (loadingScreenActiveRef.current) {
          onPreloadStatusChangeRef.current?.({
            phase: 'error',
            progress: 0,
            completedIslands: 0,
            totalIslands: CUSTOM_3D_ISLAND_IDS.size,
            currentLabel: 'CHARGEMENT...',
            currentDetail: errMsg,
          });
        }
      };
      img.src = url;
    };

    const flyState: FlyTransition = {
      active: false,
      startTime: 0,
      duration: 1.1,
      startCamDir: DEFAULT_CAMERA_POS.clone().normalize(),
      targetCamDir: DEFAULT_CAMERA_POS.clone().normalize(),
      startCamDist: DEFAULT_CAMERA_POS.length(),
      targetCamDist: DEFAULT_CAMERA_POS.length(),
      startLookAt: new THREE.Vector3(0, 0, 0),
      targetLookAt: new THREE.Vector3(0, 0, 0),
    };

    const alabastaLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toAlabastaSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(alabastaOriginPos)
        .addScaledVector(alabastaEast, sp.x)
        .addScaledVector(alabastaUp, sp.y)
        .addScaledVector(alabastaSouth, sp.z);
    };

    const skypieaLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toSkypieaSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(skypieaOriginPos)
        .addScaledVector(skypieaEast, sp.x)
        .addScaledVector(skypieaUp, sp.y)
        .addScaledVector(skypieaSouth, sp.z);
    };

    const water7LocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toWater7SphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(water7OriginPos)
        .addScaledVector(water7East, sp.x)
        .addScaledVector(water7Up, sp.y)
        .addScaledVector(water7South, sp.z);
    };

    const marinefordLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toMarinefordSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(marinefordOriginPos)
        .addScaledVector(marinefordEast, sp.x)
        .addScaledVector(marinefordUp, sp.y)
        .addScaledVector(marinefordSouth, sp.z);
    };

    const loguetownLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toLoguetownSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(loguetownOriginPos)
        .addScaledVector(loguetownEast, sp.x)
        .addScaledVector(loguetownUp, sp.y)
        .addScaledVector(loguetownSouth, sp.z);
    };

    const conomiLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toConomiSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(conomiOriginPos)
        .addScaledVector(conomiEast, sp.x)
        .addScaledVector(conomiUp, sp.y)
        .addScaledVector(conomiSouth, sp.z);
    };

    const geckoLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toGeckoSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(geckoOriginPos)
        .addScaledVector(geckoEast, sp.x)
        .addScaledVector(geckoUp, sp.y)
        .addScaledVector(geckoSouth, sp.z);
    };

    const dawnLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toDawnSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(dawnOriginPos)
        .addScaledVector(dawnEast, sp.x)
        .addScaledVector(dawnUp, sp.y)
        .addScaledVector(dawnSouth, sp.z);
    };

    const goatLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toGoatSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(goatOriginPos)
        .addScaledVector(goatEast, sp.x)
        .addScaledVector(goatUp, sp.y)
        .addScaledVector(goatSouth, sp.z);
    };

    const shellsLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toShellsSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(shellsOriginPos)
        .addScaledVector(shellsEast, sp.x)
        .addScaledVector(shellsUp, sp.y)
        .addScaledVector(shellsSouth, sp.z);
    };

    const organLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toOrganSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(organOriginPos)
        .addScaledVector(organEast, sp.x)
        .addScaledVector(organUp, sp.y)
        .addScaledVector(organSouth, sp.z);
    };

    const shimotsukiLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toShimotsukiSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(shimotsukiOriginPos)
        .addScaledVector(shimotsukiEast, sp.x)
        .addScaledVector(shimotsukiUp, sp.y)
        .addScaledVector(shimotsukiSouth, sp.z);
    };

    const baratieLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toBaratieSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(baratieOriginPos)
        .addScaledVector(baratieEast, sp.x)
        .addScaledVector(baratieUp, sp.y)
        .addScaledVector(baratieSouth, sp.z);
    };

    const reverseMountainLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toReverseMountainSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(rmOriginPos)
        .addScaledVector(rmEast, sp.x)
        .addScaledVector(rmUp, sp.y)
        .addScaledVector(rmSouth, sp.z);
    };

    const twinCapeLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toTwinCapeSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(twinCapeOriginPos)
        .addScaledVector(twinCapeEast, sp.x)
        .addScaledVector(twinCapeUp, sp.y)
        .addScaledVector(twinCapeSouth, sp.z);
    };

    const littleGardenLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toLittleGardenSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(littleGardenOriginPos)
        .addScaledVector(littleGardenEast, sp.x)
        .addScaledVector(littleGardenUp, sp.y)
        .addScaledVector(littleGardenSouth, sp.z);
    };

    const cactusLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toCactusSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(cactusOriginPos)
        .addScaledVector(cactusEast, sp.x)
        .addScaledVector(cactusUp, sp.y)
        .addScaledVector(cactusSouth, sp.z);
    };

    const drumLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toDrumSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(drumOriginPos)
        .addScaledVector(drumEast, sp.x)
        .addScaledVector(drumUp, sp.y)
        .addScaledVector(drumSouth, sp.z);
    };

    const jayaLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toJayaSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(jayaOriginPos)
        .addScaledVector(jayaEast, sp.x)
        .addScaledVector(jayaUp, sp.y)
        .addScaledVector(jayaSouth, sp.z);
    };

    const longRingLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toLongRingSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(longRingOriginPos)
        .addScaledVector(longRingEast, sp.x)
        .addScaledVector(longRingUp, sp.y)
        .addScaledVector(longRingSouth, sp.z);
    };

    const shiftLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toShiftSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(shiftOriginPos)
        .addScaledVector(shiftEast, sp.x)
        .addScaledVector(shiftUp, sp.y)
        .addScaledVector(shiftSouth, sp.z);
    };

    const pucciLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toStationIslandSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(pucciOriginPos)
        .addScaledVector(pucciEast, sp.x)
        .addScaledVector(pucciUp, sp.y)
        .addScaledVector(pucciSouth, sp.z);
    };

    const sanFaldoLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toStationIslandSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(sanFaldoOriginPos)
        .addScaledVector(sanFaldoEast, sp.x)
        .addScaledVector(sanFaldoUp, sp.y)
        .addScaledVector(sanFaldoSouth, sp.z);
    };

    const stPoplarLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toStationIslandSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(stPoplarOriginPos)
        .addScaledVector(stPoplarEast, sp.x)
        .addScaledVector(stPoplarUp, sp.y)
        .addScaledVector(stPoplarSouth, sp.z);
    };

    const eniesLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toEniesSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(eniesOriginPos)
        .addScaledVector(eniesEast, sp.x)
        .addScaledVector(eniesUp, sp.y)
        .addScaledVector(eniesSouth, sp.z);
    };

    const amazonLilyLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toAmazonLilySphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(amazonLilyOriginPos)
        .addScaledVector(amazonLilyEast, sp.x)
        .addScaledVector(amazonLilyUp, sp.y)
        .addScaledVector(amazonLilySouth, sp.z);
    };

    const thrillerBarkLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toThrillerBarkSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(thrillerBarkOriginPos)
        .addScaledVector(thrillerBarkEast, sp.x)
        .addScaledVector(thrillerBarkUp, sp.y)
        .addScaledVector(thrillerBarkSouth, sp.z);
    };

    const sabaodyLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toSabaodySphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(sabaodyOriginPos)
        .addScaledVector(sabaodyEast, sp.x)
        .addScaledVector(sabaodyUp, sp.y)
        .addScaledVector(sabaodySouth, sp.z);
    };

    const punkHazardLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toPunkHazardSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(punkHazardOriginPos)
        .addScaledVector(punkHazardEast, sp.x)
        .addScaledVector(punkHazardUp, sp.y)
        .addScaledVector(punkHazardSouth, sp.z);
    };

    const dressrosaLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toDressrosaSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(dressrosaOriginPos)
        .addScaledVector(dressrosaEast, sp.x)
        .addScaledVector(dressrosaUp, sp.y)
        .addScaledVector(dressrosaSouth, sp.z);
    };

    const tottoLandLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toTottoLandSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(tottoLandOriginPos)
        .addScaledVector(tottoLandEast, sp.x)
        .addScaledVector(tottoLandUp, sp.y)
        .addScaledVector(tottoLandSouth, sp.z);
    };

    const zouLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toZouSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(zouOriginPos)
        .addScaledVector(zouEast, sp.x)
        .addScaledVector(zouUp, sp.y)
        .addScaledVector(zouSouth, sp.z);
    };

    const wanoLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toWanoSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(wanoOriginPos)
        .addScaledVector(wanoEast, sp.x)
        .addScaledVector(wanoUp, sp.y)
        .addScaledVector(wanoSouth, sp.z);
    };

    const eggheadLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toEggheadSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(eggheadOriginPos)
        .addScaledVector(eggheadEast, sp.x)
        .addScaledVector(eggheadUp, sp.y)
        .addScaledVector(eggheadSouth, sp.z);
    };

    const elbafLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toElbafSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(elbafOriginPos)
        .addScaledVector(elbafEast, sp.x)
        .addScaledVector(elbafUp, sp.y)
        .addScaledVector(elbafSouth, sp.z);
    };

    const maryGeoiseLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toMaryGeoiseSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(maryGeoiseOriginPos)
        .addScaledVector(maryGeoiseEast, sp.x)
        .addScaledVector(maryGeoiseUp, sp.y)
        .addScaledVector(maryGeoiseSouth, sp.z);
    };

    const fishManLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toFishManSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(fishManOriginPos)
        .addScaledVector(fishManEast, sp.x)
        .addScaledVector(fishManUp, sp.y)
        .addScaledVector(fishManSouth, sp.z);
    };

    const impelDownLocalToWorld = (
      lx: number,
      ly: number,
      lz: number,
      out: THREE.Vector3
    ) => {
      const sp = toImpelSphereLocal(lx, ly, lz, GLOBE_RADIUS);
      return out
        .copy(impelDownOriginPos)
        .addScaledVector(impelDownEast, sp.x)
        .addScaledVector(impelDownUp, sp.y)
        .addScaledVector(impelDownSouth, sp.z);
    };

    const sampleGlobeGroundRadiusAtWorldPos = (worldPos: THREE.Vector3): number => {
      // Subsea abyssal grotto beneath Red Line (-10,000 m Fish-Man Island)
      if (worldPos.length() < GLOBE_RADIUS - 0.14) {
        _v4.copy(worldPos).sub(fishManOriginPos);
        const sxFm = _v4.dot(fishManEast);
        const szFm = _v4.dot(fishManSouth);
        if (sxFm * sxFm + szFm * szFm < 0.42 && worldPos.dot(fishManUp) > 0) {
          const lx = sxFm / FISH_MAN_GLOBE_SCALE;
          const lz = szFm / FISH_MAN_GLOBE_SCALE;
          const camHeightM =
            (worldPos.length() - (GLOBE_RADIUS - FISH_MAN_DEPTH)) /
            FISH_MAN_GLOBE_SCALE;
          const h = sampleFishManCameraFloorHeight(lx, lz, camHeightM);
          return GLOBE_RADIUS - FISH_MAN_DEPTH + h * FISH_MAN_GLOBE_SCALE;
        }
        return 0;
      }

      _v4.copy(worldPos).sub(alabastaOriginPos);
      const sxA = _v4.dot(alabastaEast);
      const szA = _v4.dot(alabastaSouth);
      if (sxA * sxA + szA * szA < 0.25 && worldPos.dot(alabastaUp) > 0) {
        const lx = sxA / ALABASTA_GLOBE_SCALE;
        const lz = szA / ALABASTA_GLOBE_SCALE;
        const h = Math.max(0, sampleAlabastaHeight(lx, lz));
        return GLOBE_RADIUS + h * ALABASTA_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(water7OriginPos);
      const sxW = _v4.dot(water7East);
      const szW = _v4.dot(water7South);
      if (sxW * sxW + szW * szW < 0.08 && worldPos.dot(water7Up) > 0) {
        const lx = sxW / WATER7_GLOBE_SCALE;
        const lz = szW / WATER7_GLOBE_SCALE;
        const h = Math.max(0, sampleWater7WalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * WATER7_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(marinefordOriginPos);
      const sxM = _v4.dot(marinefordEast);
      const szM = _v4.dot(marinefordSouth);
      if (sxM * sxM + szM * szM < 0.14 && worldPos.dot(marinefordUp) > 0) {
        const lx = sxM / MARINEFORD_GLOBE_SCALE;
        const lz = szM / MARINEFORD_GLOBE_SCALE;
        const h = Math.max(0, sampleMarinefordWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * MARINEFORD_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(loguetownOriginPos);
      const sxL = _v4.dot(loguetownEast);
      const szL = _v4.dot(loguetownSouth);
      if (sxL * sxL + szL * szL < 0.08 && worldPos.dot(loguetownUp) > 0) {
        const lx = sxL / LOGUETOWN_GLOBE_SCALE;
        const lz = szL / LOGUETOWN_GLOBE_SCALE;
        const h = Math.max(0, sampleLoguetownWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * LOGUETOWN_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(conomiOriginPos);
      const sxC = _v4.dot(conomiEast);
      const szC = _v4.dot(conomiSouth);
      if (sxC * sxC + szC * szC < 0.12 && worldPos.dot(conomiUp) > 0) {
        const lx = sxC / CONOMI_GLOBE_SCALE;
        const lz = szC / CONOMI_GLOBE_SCALE;
        const h = Math.max(0, sampleConomiWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * CONOMI_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(geckoOriginPos);
      const sxG = _v4.dot(geckoEast);
      const szG = _v4.dot(geckoSouth);
      if (sxG * sxG + szG * szG < 0.12 && worldPos.dot(geckoUp) > 0) {
        const lx = sxG / GECKO_GLOBE_SCALE;
        const lz = szG / GECKO_GLOBE_SCALE;
        const h = Math.max(0, sampleGeckoWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * GECKO_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(dawnOriginPos);
      const sxD = _v4.dot(dawnEast);
      const szD = _v4.dot(dawnSouth);
      if (sxD * sxD + szD * szD < 0.12 && worldPos.dot(dawnUp) > 0) {
        const lx = sxD / DAWN_GLOBE_SCALE;
        const lz = szD / DAWN_GLOBE_SCALE;
        const h = Math.max(0, sampleDawnWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * DAWN_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(goatOriginPos);
      const sxGt = _v4.dot(goatEast);
      const szGt = _v4.dot(goatSouth);
      if (sxGt * sxGt + szGt * szGt < 0.08 && worldPos.dot(goatUp) > 0) {
        const lx = sxGt / GOAT_GLOBE_SCALE;
        const lz = szGt / GOAT_GLOBE_SCALE;
        const h = Math.max(0, sampleGoatWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * GOAT_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(shellsOriginPos);
      const sxSt = _v4.dot(shellsEast);
      const szSt = _v4.dot(shellsSouth);
      if (sxSt * sxSt + szSt * szSt < 0.045 && worldPos.dot(shellsUp) > 0) {
        const lx = sxSt / SHELLS_GLOBE_SCALE;
        const lz = szSt / SHELLS_GLOBE_SCALE;
        const h = Math.max(0, sampleShellsWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * SHELLS_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(organOriginPos);
      const sxOrg = _v4.dot(organEast);
      const szOrg = _v4.dot(organSouth);
      if (sxOrg * sxOrg + szOrg * szOrg < 0.07 && worldPos.dot(organUp) > 0) {
        const lx = sxOrg / ORGAN_GLOBE_SCALE;
        const lz = szOrg / ORGAN_GLOBE_SCALE;
        const h = Math.max(0, sampleOrganWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * ORGAN_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(shimotsukiOriginPos);
      const sxShm = _v4.dot(shimotsukiEast);
      const szShm = _v4.dot(shimotsukiSouth);
      if (sxShm * sxShm + szShm * szShm < 0.07 && worldPos.dot(shimotsukiUp) > 0) {
        const lx = sxShm / SHIMOTSUKI_GLOBE_SCALE;
        const lz = szShm / SHIMOTSUKI_GLOBE_SCALE;
        const h = Math.max(0, sampleShimotsukiWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + (h + SHIMOTSUKI_SPHERE_SEA_OFFSET) * SHIMOTSUKI_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(baratieOriginPos);
      const sxBar = _v4.dot(baratieEast);
      const szBar = _v4.dot(baratieSouth);
      if (sxBar * sxBar + szBar * szBar < 0.015 && worldPos.dot(baratieUp) > 0) {
        const lx = sxBar / BARATIE_GLOBE_SCALE;
        const lz = szBar / BARATIE_GLOBE_SCALE;
        const h = Math.max(0, sampleBaratieWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + (h + BARATIE_SPHERE_SEA_OFFSET) * BARATIE_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(twinCapeOriginPos);
      const sxTc = _v4.dot(twinCapeEast);
      const szTc = _v4.dot(twinCapeSouth);
      if (sxTc * sxTc + szTc * szTc < 0.14 && worldPos.dot(twinCapeUp) > 0) {
        const lx = sxTc / TWIN_CAPE_GLOBE_SCALE;
        const lz = szTc / TWIN_CAPE_GLOBE_SCALE;
        const h = sampleTwinCapeWalkSurfaceHeight(lx, lz);
        if (h > 0) {
          return GLOBE_RADIUS + h * TWIN_CAPE_GLOBE_SCALE;
        }
      }

      _v4.copy(worldPos).sub(littleGardenOriginPos);
      const sxLg = _v4.dot(littleGardenEast);
      const szLg = _v4.dot(littleGardenSouth);
      if (sxLg * sxLg + szLg * szLg < 0.045 && worldPos.dot(littleGardenUp) > 0) {
        const lx = sxLg / LITTLE_GARDEN_GLOBE_SCALE;
        const lz = szLg / LITTLE_GARDEN_GLOBE_SCALE;
        const h = Math.max(0, sampleLittleGardenWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + (h + LITTLE_GARDEN_SPHERE_SEA_OFFSET) * LITTLE_GARDEN_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(cactusOriginPos);
      const sxCc = _v4.dot(cactusEast);
      const szCc = _v4.dot(cactusSouth);
      if (sxCc * sxCc + szCc * szCc < 0.045 && worldPos.dot(cactusUp) > 0) {
        const lx = sxCc / CACTUS_GLOBE_SCALE;
        const lz = szCc / CACTUS_GLOBE_SCALE;
        const h = Math.max(0, sampleCactusWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + (h + CACTUS_SPHERE_SEA_OFFSET) * CACTUS_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(drumOriginPos);
      const sxDr = _v4.dot(drumEast);
      const szDr = _v4.dot(drumSouth);
      if (sxDr * sxDr + szDr * szDr < 0.065 && worldPos.dot(drumUp) > 0) {
        const lx = sxDr / DRUM_GLOBE_SCALE;
        const lz = szDr / DRUM_GLOBE_SCALE;
        const h = Math.max(0, sampleDrumWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + (h + DRUM_SPHERE_SEA_OFFSET) * DRUM_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(jayaOriginPos);
      const sxJy = _v4.dot(jayaEast);
      const szJy = _v4.dot(jayaSouth);
      if (sxJy * sxJy + szJy * szJy < 0.065 && worldPos.dot(jayaUp) > 0) {
        const lx = sxJy / JAYA_GLOBE_SCALE;
        const lz = szJy / JAYA_GLOBE_SCALE;
        const h = Math.max(0, sampleJayaWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + (h + JAYA_SPHERE_SEA_OFFSET) * JAYA_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(longRingOriginPos);
      const sxLr = _v4.dot(longRingEast);
      const szLr = _v4.dot(longRingSouth);
      if (sxLr * sxLr + szLr * szLr < 0.065 && worldPos.dot(longRingUp) > 0) {
        const lx = sxLr / LONG_RING_GLOBE_SCALE;
        const lz = szLr / LONG_RING_GLOBE_SCALE;
        const h = Math.max(0, sampleLongRingWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + (h + LONG_RING_SPHERE_SEA_OFFSET) * LONG_RING_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(shiftOriginPos);
      const sxSh = _v4.dot(shiftEast);
      const szSh = _v4.dot(shiftSouth);
      if (sxSh * sxSh + szSh * szSh < 0.015 && worldPos.dot(shiftUp) > 0) {
        const lx = sxSh / SHIFT_GLOBE_SCALE;
        const lz = szSh / SHIFT_GLOBE_SCALE;
        const h = Math.max(0, sampleShiftWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + (h + SHIFT_SPHERE_SEA_OFFSET) * SHIFT_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(pucciOriginPos);
      const sxPc = _v4.dot(pucciEast);
      const szPc = _v4.dot(pucciSouth);
      if (sxPc * sxPc + szPc * szPc < 0.025 && worldPos.dot(pucciUp) > 0) {
        const lx = sxPc / STATION_ISLAND_GLOBE_SCALE;
        const lz = szPc / STATION_ISLAND_GLOBE_SCALE;
        const h = Math.max(0, samplePucciWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + (h + STATION_ISLAND_SPHERE_SEA_OFFSET) * STATION_ISLAND_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(sanFaldoOriginPos);
      const sxSf = _v4.dot(sanFaldoEast);
      const szSf = _v4.dot(sanFaldoSouth);
      if (sxSf * sxSf + szSf * szSf < 0.025 && worldPos.dot(sanFaldoUp) > 0) {
        const lx = sxSf / STATION_ISLAND_GLOBE_SCALE;
        const lz = szSf / STATION_ISLAND_GLOBE_SCALE;
        const h = Math.max(0, sampleSanFaldoWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + (h + STATION_ISLAND_SPHERE_SEA_OFFSET) * STATION_ISLAND_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(stPoplarOriginPos);
      const sxSp = _v4.dot(stPoplarEast);
      const szSp = _v4.dot(stPoplarSouth);
      if (sxSp * sxSp + szSp * szSp < 0.025 && worldPos.dot(stPoplarUp) > 0) {
        const lx = sxSp / STATION_ISLAND_GLOBE_SCALE;
        const lz = szSp / STATION_ISLAND_GLOBE_SCALE;
        const h = Math.max(0, sampleStPoplarWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + (h + STATION_ISLAND_SPHERE_SEA_OFFSET) * STATION_ISLAND_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(eniesOriginPos);
      const sxEl = _v4.dot(eniesEast);
      const szEl = _v4.dot(eniesSouth);
      if (sxEl * sxEl + szEl * szEl < 0.08 && worldPos.dot(eniesUp) > 0) {
        const lx = sxEl / ENIES_GLOBE_SCALE;
        const lz = szEl / ENIES_GLOBE_SCALE;
        const h = Math.max(0, sampleEniesWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * ENIES_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(amazonLilyOriginPos);
      const sxAlily = _v4.dot(amazonLilyEast);
      const szAlily = _v4.dot(amazonLilySouth);
      if (sxAlily * sxAlily + szAlily * szAlily < 0.08 && worldPos.dot(amazonLilyUp) > 0) {
        const lx = sxAlily / AMAZON_LILY_GLOBE_SCALE;
        const lz = szAlily / AMAZON_LILY_GLOBE_SCALE;
        const h = Math.max(0, sampleAmazonLilyWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * AMAZON_LILY_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(thrillerBarkOriginPos);
      const sxTb = _v4.dot(thrillerBarkEast);
      const szTb = _v4.dot(thrillerBarkSouth);
      if (sxTb * sxTb + szTb * szTb < 0.095 && worldPos.dot(thrillerBarkUp) > 0) {
        const lx = sxTb / THRILLER_BARK_GLOBE_SCALE;
        const lz = szTb / THRILLER_BARK_GLOBE_SCALE;
        const h = Math.max(0, sampleThrillerBarkWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * THRILLER_BARK_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(sabaodyOriginPos);
      const sxSab = _v4.dot(sabaodyEast);
      const szSab = _v4.dot(sabaodySouth);
      if (sxSab * sxSab + szSab * szSab < 0.095 && worldPos.dot(sabaodyUp) > 0) {
        const lx = sxSab / SABAODY_GLOBE_SCALE;
        const lz = szSab / SABAODY_GLOBE_SCALE;
        const h = Math.max(0, sampleSabaodyWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * SABAODY_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(punkHazardOriginPos);
      const sxPh = _v4.dot(punkHazardEast);
      const szPh = _v4.dot(punkHazardSouth);
      if (sxPh * sxPh + szPh * szPh < 0.095 && worldPos.dot(punkHazardUp) > 0) {
        const lx = sxPh / PUNK_HAZARD_GLOBE_SCALE;
        const lz = szPh / PUNK_HAZARD_GLOBE_SCALE;
        const h = Math.max(0, samplePunkHazardWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * PUNK_HAZARD_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(dressrosaOriginPos);
      const sxDrs = _v4.dot(dressrosaEast);
      const szDrs = _v4.dot(dressrosaSouth);
      if (sxDrs * sxDrs + szDrs * szDrs < 0.14 && worldPos.dot(dressrosaUp) > 0) {
        const lx = sxDrs / DRESSROSA_GLOBE_SCALE;
        const lz = szDrs / DRESSROSA_GLOBE_SCALE;
        const h = Math.max(0, sampleDressrosaWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * DRESSROSA_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(tottoLandOriginPos);
      const sxTl = _v4.dot(tottoLandEast);
      const szTl = _v4.dot(tottoLandSouth);
      if (sxTl * sxTl + szTl * szTl < 5.25 && worldPos.dot(tottoLandUp) > 0) {
        const lx = sxTl / TOTTO_LAND_GLOBE_SCALE;
        const lz = szTl / TOTTO_LAND_GLOBE_SCALE;
        const h = Math.max(0, sampleTottoLandWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * TOTTO_LAND_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(zouOriginPos);
      const sxZou = _v4.dot(zouEast);
      const szZou = _v4.dot(zouSouth);
      if (sxZou * sxZou + szZou * szZou < 0.045 && worldPos.dot(zouUp) > 0) {
        const lx = sxZou / ZOU_GLOBE_SCALE;
        const lz = szZou / ZOU_GLOBE_SCALE;
        const h = sampleZouWalkSurfaceHeight(lx, lz);
        if (h > 0) {
          return GLOBE_RADIUS + h * ZOU_GLOBE_SCALE;
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(wanoOriginPos);
      const sxWano = _v4.dot(wanoEast);
      const szWano = _v4.dot(wanoSouth);
      if (sxWano * sxWano + szWano * szWano < 0.28 && worldPos.dot(wanoUp) > 0) {
        const lx = sxWano / WANO_GLOBE_SCALE;
        const lz = szWano / WANO_GLOBE_SCALE;
        const h = sampleWanoWalkSurfaceHeight(lx, lz);
        if (h > 0) {
          return GLOBE_RADIUS + h * WANO_GLOBE_SCALE;
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(eggheadOriginPos);
      const sxEgg = _v4.dot(eggheadEast);
      const szEgg = _v4.dot(eggheadSouth);
      if (sxEgg * sxEgg + szEgg * szEgg < 0.14 && worldPos.dot(eggheadUp) > 0) {
        const lx = sxEgg / EGGHEAD_GLOBE_SCALE;
        const lz = szEgg / EGGHEAD_GLOBE_SCALE;
        const camHeightM = (worldPos.length() - GLOBE_RADIUS) / EGGHEAD_GLOBE_SCALE;
        const h = sampleEggheadWalkSurfaceHeight(lx, lz, camHeightM);
        if (h > 0) {
          return GLOBE_RADIUS + h * EGGHEAD_GLOBE_SCALE;
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(elbafOriginPos);
      const sxElb = _v4.dot(elbafEast);
      const szElb = _v4.dot(elbafSouth);
      if (sxElb * sxElb + szElb * szElb < 0.16 && worldPos.dot(elbafUp) > 0) {
        const lx = sxElb / ELBAF_GLOBE_SCALE;
        const lz = szElb / ELBAF_GLOBE_SCALE;
        const camHeightM = (worldPos.length() - GLOBE_RADIUS) / ELBAF_GLOBE_SCALE;
        const h = sampleElbafWalkSurfaceHeight(lx, lz, camHeightM);
        if (h > 0) {
          return GLOBE_RADIUS + h * ELBAF_GLOBE_SCALE;
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(maryGeoiseOriginPos);
      const sxMg = _v4.dot(maryGeoiseEast);
      const szMg = _v4.dot(maryGeoiseSouth);
      if (sxMg * sxMg + szMg * szMg < 0.36 && worldPos.dot(maryGeoiseUp) > 0) {
        const lx = sxMg / MARY_GEOISE_GLOBE_SCALE;
        const lz = szMg / MARY_GEOISE_GLOBE_SCALE;
        const camHeightM =
          (worldPos.length() - (GLOBE_RADIUS + MARY_GEOISE_ALTITUDE)) /
          MARY_GEOISE_GLOBE_SCALE;
        const h = sampleMaryGeoiseCameraFloorHeight(lx, lz, camHeightM);
        return GLOBE_RADIUS + MARY_GEOISE_ALTITUDE + h * MARY_GEOISE_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(impelDownOriginPos);
      const sxId = _v4.dot(impelDownEast);
      const szId = _v4.dot(impelDownSouth);
      if (sxId * sxId + szId * szId < 0.08 && worldPos.dot(impelDownUp) > 0) {
        const lx = sxId / IMPEL_DOWN_GLOBE_SCALE;
        const lz = szId / IMPEL_DOWN_GLOBE_SCALE;
        const camHeightM = (worldPos.length() - GLOBE_RADIUS) / IMPEL_DOWN_GLOBE_SCALE;
        const h = sampleImpelCameraFloorHeight(lx, lz, camHeightM);
        return GLOBE_RADIUS + h * IMPEL_DOWN_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(rmOriginPos);
      const sxR = _v4.dot(rmEast);
      const szR = _v4.dot(rmSouth);
      if (sxR * sxR + szR * szR < 10.2 && worldPos.dot(rmUp) > 0) {
        const lx = sxR / RM_GLOBE_SCALE;
        const lz = szR / RM_GLOBE_SCALE;
        if (Math.hypot(lx, lz) < 156) {
          const h = Math.max(0, sampleReverseMountainHeight(lx, lz));
          return GLOBE_RADIUS + h * RM_GLOBE_SCALE;
        }
      }

      _v4.copy(worldPos).sub(skypieaOriginPos);
      const sxS = _v4.dot(skypieaEast);
      const szS = _v4.dot(skypieaSouth);
      if (
        sxS * sxS + szS * szS < 0.28 &&
        worldPos.dot(skypieaUp) > 0 &&
        worldPos.length() > GLOBE_RADIUS + SKYPIEA_ALTITUDE * 0.5
      ) {
        const lx = sxS / SKYPIEA_GLOBE_SCALE;
        const lz = szS / SKYPIEA_GLOBE_SCALE;
        const h = Math.max(0, sampleSkypieaWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + SKYPIEA_ALTITUDE + h * SKYPIEA_GLOBE_SCALE;
      }

      if (currentMaps) {
        _v4.copy(worldPos).normalize();
        const theta = Math.acos(THREE.MathUtils.clamp(_v4.y, -1, 1));
        let phi = Math.atan2(_v4.z, -_v4.x);
        if (phi < 0) phi += Math.PI * 2;
        const u = phi / (Math.PI * 2);
        const v = theta / Math.PI;
        const hNorm = currentMaps.sampleHeightAt(u, v);
        return Math.max(GLOBE_RADIUS + 0.04, terrainRadiusAtHeight(hNorm));
      }
      return GLOBE_RADIUS + 0.04;
    };

    const sampleSailingGroundRadiusAtWorldPos = (worldPos: THREE.Vector3): number => {
      if (worldPos.length() < GLOBE_RADIUS - 0.14) {
        _v4.copy(worldPos).sub(fishManOriginPos);
        const sxFm = _v4.dot(fishManEast);
        const szFm = _v4.dot(fishManSouth);
        if (sxFm * sxFm + szFm * szFm < 0.42 && worldPos.dot(fishManUp) > 0) {
          const lx = sxFm / FISH_MAN_GLOBE_SCALE;
          const lz = szFm / FISH_MAN_GLOBE_SCALE;
          const h = Math.max(0, sampleFishManHeight(lx, lz));
          return GLOBE_RADIUS - FISH_MAN_DEPTH + h * FISH_MAN_GLOBE_SCALE;
        }
        return 0;
      }

      _v4.copy(worldPos).sub(alabastaOriginPos);
      const sxA = _v4.dot(alabastaEast);
      const szA = _v4.dot(alabastaSouth);
      if (sxA * sxA + szA * szA < 0.25 && worldPos.dot(alabastaUp) > 0) {
        const lx = sxA / ALABASTA_GLOBE_SCALE;
        const lz = szA / ALABASTA_GLOBE_SCALE;
        const h = Math.max(0, sampleAlabastaHeight(lx, lz));
        return GLOBE_RADIUS + h * ALABASTA_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(water7OriginPos);
      const sxW = _v4.dot(water7East);
      const szW = _v4.dot(water7South);
      if (sxW * sxW + szW * szW < 0.08 && worldPos.dot(water7Up) > 0) {
        const lx = sxW / WATER7_GLOBE_SCALE;
        const lz = szW / WATER7_GLOBE_SCALE;
        const h = Math.max(0, sampleWater7WalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * WATER7_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(marinefordOriginPos);
      const sxM = _v4.dot(marinefordEast);
      const szM = _v4.dot(marinefordSouth);
      if (sxM * sxM + szM * szM < 0.14 && worldPos.dot(marinefordUp) > 0) {
        const lx = sxM / MARINEFORD_GLOBE_SCALE;
        const lz = szM / MARINEFORD_GLOBE_SCALE;
        const h = Math.max(0, sampleMarinefordWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * MARINEFORD_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(loguetownOriginPos);
      const sxL = _v4.dot(loguetownEast);
      const szL = _v4.dot(loguetownSouth);
      if (sxL * sxL + szL * szL < 0.08 && worldPos.dot(loguetownUp) > 0) {
        const lx = sxL / LOGUETOWN_GLOBE_SCALE;
        const lz = szL / LOGUETOWN_GLOBE_SCALE;
        const h = Math.max(0, sampleLoguetownWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * LOGUETOWN_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(conomiOriginPos);
      const sxC = _v4.dot(conomiEast);
      const szC = _v4.dot(conomiSouth);
      if (sxC * sxC + szC * szC < 0.12 && worldPos.dot(conomiUp) > 0) {
        const lx = sxC / CONOMI_GLOBE_SCALE;
        const lz = szC / CONOMI_GLOBE_SCALE;
        const h = Math.max(0, sampleConomiWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * CONOMI_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(geckoOriginPos);
      const sxG = _v4.dot(geckoEast);
      const szG = _v4.dot(geckoSouth);
      if (sxG * sxG + szG * szG < 0.12 && worldPos.dot(geckoUp) > 0) {
        const lx = sxG / GECKO_GLOBE_SCALE;
        const lz = szG / GECKO_GLOBE_SCALE;
        const h = Math.max(0, sampleGeckoWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * GECKO_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(dawnOriginPos);
      const sxD = _v4.dot(dawnEast);
      const szD = _v4.dot(dawnSouth);
      if (sxD * sxD + szD * szD < 0.12 && worldPos.dot(dawnUp) > 0) {
        const lx = sxD / DAWN_GLOBE_SCALE;
        const lz = szD / DAWN_GLOBE_SCALE;
        const h = Math.max(0, sampleDawnWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * DAWN_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(goatOriginPos);
      const sxGt = _v4.dot(goatEast);
      const szGt = _v4.dot(goatSouth);
      if (sxGt * sxGt + szGt * szGt < 0.08 && worldPos.dot(goatUp) > 0) {
        const lx = sxGt / GOAT_GLOBE_SCALE;
        const lz = szGt / GOAT_GLOBE_SCALE;
        const h = Math.max(0, sampleGoatWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * GOAT_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(shellsOriginPos);
      const sxSt = _v4.dot(shellsEast);
      const szSt = _v4.dot(shellsSouth);
      if (sxSt * sxSt + szSt * szSt < 0.045 && worldPos.dot(shellsUp) > 0) {
        const lx = sxSt / SHELLS_GLOBE_SCALE;
        const lz = szSt / SHELLS_GLOBE_SCALE;
        const h = Math.max(0, sampleShellsWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * SHELLS_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(organOriginPos);
      const sxOrg = _v4.dot(organEast);
      const szOrg = _v4.dot(organSouth);
      if (sxOrg * sxOrg + szOrg * szOrg < 0.07 && worldPos.dot(organUp) > 0) {
        const lx = sxOrg / ORGAN_GLOBE_SCALE;
        const lz = szOrg / ORGAN_GLOBE_SCALE;
        const h = Math.max(0, sampleOrganWalkSurfaceHeight(lx, lz));
        return GLOBE_RADIUS + h * ORGAN_GLOBE_SCALE;
      }

      _v4.copy(worldPos).sub(shimotsukiOriginPos);
      const sxShm = _v4.dot(shimotsukiEast);
      const szShm = _v4.dot(shimotsukiSouth);
      if (sxShm * sxShm + szShm * szShm < 0.07 && worldPos.dot(shimotsukiUp) > 0) {
        const lx = sxShm / SHIMOTSUKI_GLOBE_SCALE;
        const lz = szShm / SHIMOTSUKI_GLOBE_SCALE;
        const rawH = sampleShimotsukiWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return Math.max(
            GLOBE_RADIUS,
            GLOBE_RADIUS + (rawH + SHIMOTSUKI_SPHERE_SEA_OFFSET) * SHIMOTSUKI_GLOBE_SCALE
          );
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(baratieOriginPos);
      const sxBar = _v4.dot(baratieEast);
      const szBar = _v4.dot(baratieSouth);
      if (sxBar * sxBar + szBar * szBar < 0.015 && worldPos.dot(baratieUp) > 0) {
        const lx = sxBar / BARATIE_GLOBE_SCALE;
        const lz = szBar / BARATIE_GLOBE_SCALE;
        const rawH = sampleBaratieWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return Math.max(
            GLOBE_RADIUS,
            GLOBE_RADIUS + (rawH + BARATIE_SPHERE_SEA_OFFSET) * BARATIE_GLOBE_SCALE
          );
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(twinCapeOriginPos);
      const sxTc = _v4.dot(twinCapeEast);
      const szTc = _v4.dot(twinCapeSouth);
      if (sxTc * sxTc + szTc * szTc < 0.14 && worldPos.dot(twinCapeUp) > 0) {
        const lx = sxTc / TWIN_CAPE_GLOBE_SCALE;
        const lz = szTc / TWIN_CAPE_GLOBE_SCALE;
        const h = sampleTwinCapeWalkSurfaceHeight(lx, lz);
        if (h > 0) {
          return GLOBE_RADIUS + h * TWIN_CAPE_GLOBE_SCALE;
        }
      }

      _v4.copy(worldPos).sub(littleGardenOriginPos);
      const sxLg = _v4.dot(littleGardenEast);
      const szLg = _v4.dot(littleGardenSouth);
      if (sxLg * sxLg + szLg * szLg < 0.045 && worldPos.dot(littleGardenUp) > 0) {
        const lx = sxLg / LITTLE_GARDEN_GLOBE_SCALE;
        const lz = szLg / LITTLE_GARDEN_GLOBE_SCALE;
        const rawH = sampleLittleGardenWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return Math.max(
            GLOBE_RADIUS,
            GLOBE_RADIUS + (rawH + LITTLE_GARDEN_SPHERE_SEA_OFFSET) * LITTLE_GARDEN_GLOBE_SCALE
          );
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(cactusOriginPos);
      const sxCc = _v4.dot(cactusEast);
      const szCc = _v4.dot(cactusSouth);
      if (sxCc * sxCc + szCc * szCc < 0.045 && worldPos.dot(cactusUp) > 0) {
        const lx = sxCc / CACTUS_GLOBE_SCALE;
        const lz = szCc / CACTUS_GLOBE_SCALE;
        const rawH = sampleCactusWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return Math.max(
            GLOBE_RADIUS,
            GLOBE_RADIUS + (rawH + CACTUS_SPHERE_SEA_OFFSET) * CACTUS_GLOBE_SCALE
          );
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(drumOriginPos);
      const sxDr = _v4.dot(drumEast);
      const szDr = _v4.dot(drumSouth);
      if (sxDr * sxDr + szDr * szDr < 0.065 && worldPos.dot(drumUp) > 0) {
        const lx = sxDr / DRUM_GLOBE_SCALE;
        const lz = szDr / DRUM_GLOBE_SCALE;
        const rawH = sampleDrumWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return Math.max(
            GLOBE_RADIUS,
            GLOBE_RADIUS + (rawH + DRUM_SPHERE_SEA_OFFSET) * DRUM_GLOBE_SCALE
          );
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(jayaOriginPos);
      const sxJy = _v4.dot(jayaEast);
      const szJy = _v4.dot(jayaSouth);
      if (sxJy * sxJy + szJy * szJy < 0.065 && worldPos.dot(jayaUp) > 0) {
        const lx = sxJy / JAYA_GLOBE_SCALE;
        const lz = szJy / JAYA_GLOBE_SCALE;
        const rawH = sampleJayaWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return Math.max(
            GLOBE_RADIUS,
            GLOBE_RADIUS + (rawH + JAYA_SPHERE_SEA_OFFSET) * JAYA_GLOBE_SCALE
          );
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(longRingOriginPos);
      const sxLr = _v4.dot(longRingEast);
      const szLr = _v4.dot(longRingSouth);
      if (sxLr * sxLr + szLr * szLr < 0.065 && worldPos.dot(longRingUp) > 0) {
        const lx = sxLr / LONG_RING_GLOBE_SCALE;
        const lz = szLr / LONG_RING_GLOBE_SCALE;
        const rawH = sampleLongRingWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return Math.max(
            GLOBE_RADIUS,
            GLOBE_RADIUS + (rawH + LONG_RING_SPHERE_SEA_OFFSET) * LONG_RING_GLOBE_SCALE
          );
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(shiftOriginPos);
      const sxSh = _v4.dot(shiftEast);
      const szSh = _v4.dot(shiftSouth);
      if (sxSh * sxSh + szSh * szSh < 0.015 && worldPos.dot(shiftUp) > 0) {
        const lx = sxSh / SHIFT_GLOBE_SCALE;
        const lz = szSh / SHIFT_GLOBE_SCALE;
        const rawH = sampleShiftWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return Math.max(
            GLOBE_RADIUS,
            GLOBE_RADIUS + (rawH + SHIFT_SPHERE_SEA_OFFSET) * SHIFT_GLOBE_SCALE
          );
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(pucciOriginPos);
      const sxPc = _v4.dot(pucciEast);
      const szPc = _v4.dot(pucciSouth);
      if (sxPc * sxPc + szPc * szPc < 0.025 && worldPos.dot(pucciUp) > 0) {
        const lx = sxPc / STATION_ISLAND_GLOBE_SCALE;
        const lz = szPc / STATION_ISLAND_GLOBE_SCALE;
        const rawH = samplePucciWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return Math.max(
            GLOBE_RADIUS,
            GLOBE_RADIUS + (rawH + STATION_ISLAND_SPHERE_SEA_OFFSET) * STATION_ISLAND_GLOBE_SCALE
          );
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(sanFaldoOriginPos);
      const sxSf = _v4.dot(sanFaldoEast);
      const szSf = _v4.dot(sanFaldoSouth);
      if (sxSf * sxSf + szSf * szSf < 0.025 && worldPos.dot(sanFaldoUp) > 0) {
        const lx = sxSf / STATION_ISLAND_GLOBE_SCALE;
        const lz = szSf / STATION_ISLAND_GLOBE_SCALE;
        const rawH = sampleSanFaldoWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return Math.max(
            GLOBE_RADIUS,
            GLOBE_RADIUS + (rawH + STATION_ISLAND_SPHERE_SEA_OFFSET) * STATION_ISLAND_GLOBE_SCALE
          );
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(stPoplarOriginPos);
      const sxSp = _v4.dot(stPoplarEast);
      const szSp = _v4.dot(stPoplarSouth);
      if (sxSp * sxSp + szSp * szSp < 0.025 && worldPos.dot(stPoplarUp) > 0) {
        const lx = sxSp / STATION_ISLAND_GLOBE_SCALE;
        const lz = szSp / STATION_ISLAND_GLOBE_SCALE;
        const rawH = sampleStPoplarWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return Math.max(
            GLOBE_RADIUS,
            GLOBE_RADIUS + (rawH + STATION_ISLAND_SPHERE_SEA_OFFSET) * STATION_ISLAND_GLOBE_SCALE
          );
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(eniesOriginPos);
      const sxEl = _v4.dot(eniesEast);
      const szEl = _v4.dot(eniesSouth);
      if (sxEl * sxEl + szEl * szEl < 0.08 && worldPos.dot(eniesUp) > 0) {
        const lx = sxEl / ENIES_GLOBE_SCALE;
        const lz = szEl / ENIES_GLOBE_SCALE;
        const rawH = sampleEniesWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return GLOBE_RADIUS + rawH * ENIES_GLOBE_SCALE;
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(amazonLilyOriginPos);
      const sxAlily = _v4.dot(amazonLilyEast);
      const szAlily = _v4.dot(amazonLilySouth);
      if (sxAlily * sxAlily + szAlily * szAlily < 0.08 && worldPos.dot(amazonLilyUp) > 0) {
        const lx = sxAlily / AMAZON_LILY_GLOBE_SCALE;
        const lz = szAlily / AMAZON_LILY_GLOBE_SCALE;
        const rawH = sampleAmazonLilyWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return GLOBE_RADIUS + rawH * AMAZON_LILY_GLOBE_SCALE;
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(thrillerBarkOriginPos);
      const sxTb = _v4.dot(thrillerBarkEast);
      const szTb = _v4.dot(thrillerBarkSouth);
      if (sxTb * sxTb + szTb * szTb < 0.095 && worldPos.dot(thrillerBarkUp) > 0) {
        const lx = sxTb / THRILLER_BARK_GLOBE_SCALE;
        const lz = szTb / THRILLER_BARK_GLOBE_SCALE;
        const rawH = sampleThrillerBarkWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return GLOBE_RADIUS + rawH * THRILLER_BARK_GLOBE_SCALE;
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(sabaodyOriginPos);
      const sxSab = _v4.dot(sabaodyEast);
      const szSab = _v4.dot(sabaodySouth);
      if (sxSab * sxSab + szSab * szSab < 0.095 && worldPos.dot(sabaodyUp) > 0) {
        const lx = sxSab / SABAODY_GLOBE_SCALE;
        const lz = szSab / SABAODY_GLOBE_SCALE;
        const rawH = sampleSabaodyWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return GLOBE_RADIUS + rawH * SABAODY_GLOBE_SCALE;
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(punkHazardOriginPos);
      const sxPh = _v4.dot(punkHazardEast);
      const szPh = _v4.dot(punkHazardSouth);
      if (sxPh * sxPh + szPh * szPh < 0.095 && worldPos.dot(punkHazardUp) > 0) {
        const lx = sxPh / PUNK_HAZARD_GLOBE_SCALE;
        const lz = szPh / PUNK_HAZARD_GLOBE_SCALE;
        const rawH = samplePunkHazardWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return GLOBE_RADIUS + rawH * PUNK_HAZARD_GLOBE_SCALE;
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(dressrosaOriginPos);
      const sxDrs = _v4.dot(dressrosaEast);
      const szDrs = _v4.dot(dressrosaSouth);
      if (sxDrs * sxDrs + szDrs * szDrs < 0.14 && worldPos.dot(dressrosaUp) > 0) {
        const lx = sxDrs / DRESSROSA_GLOBE_SCALE;
        const lz = szDrs / DRESSROSA_GLOBE_SCALE;
        const rawH = sampleDressrosaWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return GLOBE_RADIUS + rawH * DRESSROSA_GLOBE_SCALE;
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(tottoLandOriginPos);
      const sxTl = _v4.dot(tottoLandEast);
      const szTl = _v4.dot(tottoLandSouth);
      if (sxTl * sxTl + szTl * szTl < 5.25 && worldPos.dot(tottoLandUp) > 0) {
        const lx = sxTl / TOTTO_LAND_GLOBE_SCALE;
        const lz = szTl / TOTTO_LAND_GLOBE_SCALE;
        const rawH = sampleTottoLandWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return GLOBE_RADIUS + rawH * TOTTO_LAND_GLOBE_SCALE;
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(zouOriginPos);
      const sxZou = _v4.dot(zouEast);
      const szZou = _v4.dot(zouSouth);
      if (sxZou * sxZou + szZou * szZou < 0.045 && worldPos.dot(zouUp) > 0) {
        const lx = sxZou / ZOU_GLOBE_SCALE;
        const lz = szZou / ZOU_GLOBE_SCALE;
        const rawH = sampleZouWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return GLOBE_RADIUS + rawH * ZOU_GLOBE_SCALE;
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(wanoOriginPos);
      const sxWano = _v4.dot(wanoEast);
      const szWano = _v4.dot(wanoSouth);
      if (sxWano * sxWano + szWano * szWano < 0.28 && worldPos.dot(wanoUp) > 0) {
        const lx = sxWano / WANO_GLOBE_SCALE;
        const lz = szWano / WANO_GLOBE_SCALE;
        const rawH = sampleWanoWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return GLOBE_RADIUS + rawH * WANO_GLOBE_SCALE;
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(eggheadOriginPos);
      const sxEgg = _v4.dot(eggheadEast);
      const szEgg = _v4.dot(eggheadSouth);
      if (sxEgg * sxEgg + szEgg * szEgg < 0.14 && worldPos.dot(eggheadUp) > 0) {
        const lx = sxEgg / EGGHEAD_GLOBE_SCALE;
        const lz = szEgg / EGGHEAD_GLOBE_SCALE;
        const camHeightM = (worldPos.length() - GLOBE_RADIUS) / EGGHEAD_GLOBE_SCALE;
        const rawH = sampleEggheadWalkSurfaceHeight(lx, lz, camHeightM);
        if (rawH > 0) {
          return GLOBE_RADIUS + rawH * EGGHEAD_GLOBE_SCALE;
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(elbafOriginPos);
      const sxElb = _v4.dot(elbafEast);
      const szElb = _v4.dot(elbafSouth);
      if (sxElb * sxElb + szElb * szElb < 0.16 && worldPos.dot(elbafUp) > 0) {
        const lx = sxElb / ELBAF_GLOBE_SCALE;
        const lz = szElb / ELBAF_GLOBE_SCALE;
        const camHeightM = (worldPos.length() - GLOBE_RADIUS) / ELBAF_GLOBE_SCALE;
        const rawH = sampleElbafWalkSurfaceHeight(lx, lz, camHeightM);
        if (rawH > 0) {
          return GLOBE_RADIUS + rawH * ELBAF_GLOBE_SCALE;
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(maryGeoiseOriginPos);
      const sxMg = _v4.dot(maryGeoiseEast);
      const szMg = _v4.dot(maryGeoiseSouth);
      if (sxMg * sxMg + szMg * szMg < 0.36 && worldPos.dot(maryGeoiseUp) > 0) {
        const lx = sxMg / MARY_GEOISE_GLOBE_SCALE;
        const lz = szMg / MARY_GEOISE_GLOBE_SCALE;
        const rawH = sampleMaryGeoiseWalkSurfaceHeight(lx, lz);
        return Math.max(
          GLOBE_RADIUS,
          GLOBE_RADIUS + MARY_GEOISE_ALTITUDE + rawH * MARY_GEOISE_GLOBE_SCALE
        );
      }

      _v4.copy(worldPos).sub(impelDownOriginPos);
      const sxId = _v4.dot(impelDownEast);
      const szId = _v4.dot(impelDownSouth);
      if (sxId * sxId + szId * szId < 0.08 && worldPos.dot(impelDownUp) > 0) {
        const lx = sxId / IMPEL_DOWN_GLOBE_SCALE;
        const lz = szId / IMPEL_DOWN_GLOBE_SCALE;
        const rawH = sampleImpelWalkSurfaceHeight(lx, lz);
        if (rawH > 0) {
          return GLOBE_RADIUS + rawH * IMPEL_DOWN_GLOBE_SCALE;
        }
        return GLOBE_RADIUS;
      }

      _v4.copy(worldPos).sub(rmOriginPos);
      const sxR = _v4.dot(rmEast);
      const szR = _v4.dot(rmSouth);
      if (sxR * sxR + szR * szR < 10.2 && worldPos.dot(rmUp) > 0) {
        const lx = sxR / RM_GLOBE_SCALE;
        const lz = szR / RM_GLOBE_SCALE;
        if (Math.hypot(lx, lz) < 156) {
          const h = Math.max(0, sampleReverseMountainHeight(lx, lz));
          return GLOBE_RADIUS + h * RM_GLOBE_SCALE;
        }
      }

      if (sunnyState?.skyZone === 'skypiea') {
        _v4.copy(worldPos).sub(skypieaOriginPos);
        const sxS = _v4.dot(skypieaEast);
        const szS = _v4.dot(skypieaSouth);
        if (sxS * sxS + szS * szS < 0.28 && worldPos.dot(skypieaUp) > 0) {
          const lx = sxS / SKYPIEA_GLOBE_SCALE;
          const lz = szS / SKYPIEA_GLOBE_SCALE;
          const rawH = sampleSkypieaWalkSurfaceHeight(lx, lz);
          if (rawH > 0) {
            return GLOBE_RADIUS + SKYPIEA_ALTITUDE + rawH * SKYPIEA_GLOBE_SCALE;
          }
          return GLOBE_RADIUS + SKYPIEA_ALTITUDE;
        }
      }

      if (currentMaps) {
        _v4.copy(worldPos).normalize();
        const theta = Math.acos(THREE.MathUtils.clamp(_v4.y, -1, 1));
        let phi = Math.atan2(_v4.z, -_v4.x);
        if (phi < 0) phi += Math.PI * 2;
        const u = phi / (Math.PI * 2);
        const v = theta / Math.PI;
        const hNorm = currentMaps.sampleHeightAt(u, v);
        if (hNorm >= 0.06) {
          return Math.max(GLOBE_RADIUS, terrainRadiusAtHeight(hNorm));
        }
      }
      return GLOBE_RADIUS;
    };

    const flyToIsland = (island: IslandLocation) => {
      if (CUSTOM_3D_ISLAND_IDS.has(island.id)) {
        ensureIslandLoaded(island.id);
      }
      if (island.id === 'alubarna' || island.id === 'rainbase' || island.id === 'nanohana' || island.id === 'elumalu' || island.id === 'tamarisk') {
        ensureIslandLoaded('alabasta');
      }
      if (island.id === 'skypiea' || island.id === 'upper-yard' || island.id === 'angel-island' || island.id === 'hidden-cloud-village') {
        ensureIslandLoaded('skypiea');
        ensureIslandLoaded('jaya');
      }
      if (island.id === 'arlong-park' || island.id === 'cocoyashi-village' || island.id === 'gosa-village') {
        ensureIslandLoaded('conomi-islands');
      }
      if (island.id === 'syrup-village' || island.id === 'honey-town' || island.id === 'black-cat-beach') {
        ensureIslandLoaded('gecko-islands');
      }
      if (island.id === 'foosha-village' || island.id === 'goa-kingdom') {
        ensureIslandLoaded('dawn-island');
      }
      if (island.id === 'yotsuba-island') {
        ensureIslandLoaded('shells-town');
      }
      if (island.id === 'orange-town') {
        ensureIslandLoaded('organ-island');
      }
      if (island.id === 'jaya' || island.id === 'mock-town') {
        ensureIslandLoaded('jaya');
        ensureIslandLoaded('skypiea');
      }
      if (island.id in DRESSROSA_SUB_LOCATIONS) {
        ensureIslandLoaded('dressrosa');
      }
      if (island.id in TOTTO_LAND_SUB_LOCATIONS) {
        ensureIslandLoaded('whole-cake-island');
      }
      if (island.id === 'reverse-mountain') {
        ensureIslandLoaded('twin-cape');
      }
      if (island.id === 'twin-cape') {
        ensureIslandLoaded('reverse-mountain');
        const overviewPreset = TWIN_CAPE_CAMERA_PRESETS[0];
        const destCamPos = twinCapeLocalToWorld(
          overviewPreset.position[0],
          overviewPreset.position[1],
          overviewPreset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = twinCapeLocalToWorld(
          overviewPreset.target[0],
          overviewPreset.target[1],
          overviewPreset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'little-garden') {
        const overviewPreset = LITTLE_GARDEN_CAMERA_PRESETS[0];
        const destCamPos = littleGardenLocalToWorld(
          overviewPreset.position[0],
          overviewPreset.position[1],
          overviewPreset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = littleGardenLocalToWorld(
          overviewPreset.target[0],
          overviewPreset.target[1],
          overviewPreset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'cactus-island') {
        const overviewPreset = CACTUS_CAMERA_PRESETS[0];
        const destCamPos = cactusLocalToWorld(
          overviewPreset.position[0],
          overviewPreset.position[1],
          overviewPreset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = cactusLocalToWorld(
          overviewPreset.target[0],
          overviewPreset.target[1],
          overviewPreset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'drum-island') {
        const overviewPreset = DRUM_CAMERA_PRESETS[0];
        const destCamPos = drumLocalToWorld(
          overviewPreset.position[0],
          overviewPreset.position[1],
          overviewPreset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = drumLocalToWorld(
          overviewPreset.target[0],
          overviewPreset.target[1],
          overviewPreset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'jaya' || island.id === 'mock-town') {
        const preset =
          island.id === 'mock-town'
            ? (JAYA_CAMERA_PRESETS.find((p) => p.id === 'mock-town-port') ??
              JAYA_CAMERA_PRESETS[0])
            : JAYA_CAMERA_PRESETS[0];
        const destCamPos = jayaLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = jayaLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'long-ring-long-land') {
        const preset = LONG_RING_CAMERA_PRESETS[0];
        const destCamPos = longRingLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = longRingLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'shift-station') {
        const preset = SHIFT_CAMERA_PRESETS[0];
        const destCamPos = shiftLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = shiftLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'pucci-island') {
        const preset = PUCCI_CAMERA_PRESETS[0];
        const destCamPos = pucciLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = pucciLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'san-faldo') {
        const preset = SAN_FALDO_CAMERA_PRESETS[0];
        const destCamPos = sanFaldoLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = sanFaldoLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'st-poplar') {
        const preset = ST_POPLAR_CAMERA_PRESETS[0];
        const destCamPos = stPoplarLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = stPoplarLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'enies-lobby') {
        const preset = ENIES_CAMERA_PRESETS[0];
        const destCamPos = eniesLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = eniesLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'amazon-lily') {
        const preset = AMAZON_LILY_CAMERA_PRESETS[0];
        const destCamPos = amazonLilyLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = amazonLilyLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'thriller-bark') {
        const preset = THRILLER_BARK_CAMERA_PRESETS[0];
        const destCamPos = thrillerBarkLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = thrillerBarkLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'sabaody') {
        const preset = SABAODY_CAMERA_PRESETS[0];
        const destCamPos = sabaodyLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = sabaodyLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'punk-hazard') {
        const preset = PUNK_HAZARD_CAMERA_PRESETS[0];
        const destCamPos = punkHazardLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = punkHazardLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'dressrosa') {
        const preset = DRESSROSA_CAMERA_PRESETS[0];
        const destCamPos = dressrosaLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = dressrosaLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'green-bit') {
        const destCamPos = dressrosaLocalToWorld(36.0, 52.0, -54.0, new THREE.Vector3());
        const destTgtPos = dressrosaLocalToWorld(36.0, 9.5, -114.0, new THREE.Vector3());
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id in TOTTO_LAND_SUB_LOCATIONS) {
        let destCamPos: THREE.Vector3;
        let destTgtPos: THREE.Vector3;
        const presetId =
          island.id === 'whole-cake-island'
            ? 'overview'
            : island.id === 'cacao-island'
              ? 'cacao-island'
              : island.id === 'cheese-island'
                ? 'cheese-island'
                : island.id === 'funwari-island' || island.id === 'cutlery-island'
                  ? 'peripheral-cupcakes'
                  : null;
        const preset = presetId
          ? TOTTO_LAND_CAMERA_PRESETS.find((p) => p.id === presetId) ??
            TOTTO_LAND_CAMERA_PRESETS[0]
          : null;
        if (preset) {
          destCamPos = tottoLandLocalToWorld(
            preset.position[0],
            preset.position[1],
            preset.position[2],
            new THREE.Vector3()
          );
          destTgtPos = tottoLandLocalToWorld(
            preset.target[0],
            preset.target[1],
            preset.target[2],
            new THREE.Vector3()
          );
        } else {
          const [lx, lz] = TOTTO_LAND_SUB_LOCATIONS[island.id];
          destCamPos = tottoLandLocalToWorld(lx, 28.0, lz + 44.0, new THREE.Vector3());
          destTgtPos = tottoLandLocalToWorld(lx, 8.0, lz, new THREE.Vector3());
        }
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'zou') {
        const preset = ZOU_CAMERA_PRESETS[0];
        const destCamPos = zouLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = zouLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id in WANO_SUB_LOCATIONS) {
        ensureIslandLoaded('wano');
        const presetId =
          island.id === 'wano'
            ? 'overview'
            : island.id === 'flower-capital'
              ? 'flower-capital'
              : island.id === 'kuri'
                ? 'kuri'
                : island.id === 'ringo'
                  ? 'ringo'
                  : island.id === 'udon'
                    ? 'udon-kibi'
                    : island.id === 'hakumai'
                      ? 'hakumai'
                      : island.id === 'onigashima'
                        ? 'onigashima'
                        : null;
        let destCamPos: THREE.Vector3;
        let destTgtPos: THREE.Vector3;
        if (presetId) {
          const preset =
            WANO_CAMERA_PRESETS.find((p) => p.id === presetId) ??
            WANO_CAMERA_PRESETS[0];
          destCamPos = wanoLocalToWorld(
            preset.position[0],
            preset.position[1],
            preset.position[2],
            new THREE.Vector3()
          );
          destTgtPos = wanoLocalToWorld(
            preset.target[0],
            preset.target[1],
            preset.target[2],
            new THREE.Vector3()
          );
        } else {
          const [lx, lz] = WANO_SUB_LOCATIONS[island.id];
          destCamPos = wanoLocalToWorld(
            lx + 16.0,
            WANO_PLATEAU_Y + 18.0,
            lz + 26.0,
            new THREE.Vector3()
          );
          destTgtPos = wanoLocalToWorld(
            lx,
            WANO_PLATEAU_Y + 5.0,
            lz,
            new THREE.Vector3()
          );
        }
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id in EGGHEAD_SUB_LOCATIONS) {
        ensureIslandLoaded('egghead-island');
        const preset = EGGHEAD_CAMERA_PRESETS[0];
        const destCamPos = eggheadLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = eggheadLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id in ELBAF_SUB_LOCATIONS) {
        ensureIslandLoaded('elbaf');
        const preset = ELBAF_CAMERA_PRESETS[0];
        const destCamPos = elbafLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = elbafLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'mary-geoise') {
        const preset = MARY_GEOISE_CAMERA_PRESETS[0];
        const destCamPos = maryGeoiseLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = maryGeoiseLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'fish-man-island') {
        const preset = FISH_MAN_CAMERA_PRESETS[0];
        const destCamPos = fishManLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = fishManLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.12 : 1.15;
        flyState.active = true;
        return;
      }
      if (island.id === 'impel-down') {
        const preset = IMPEL_DOWN_CAMERA_PRESETS[0];
        const destCamPos = impelDownLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = impelDownLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.15;
        flyState.active = true;
        return;
      }
      const rec = markerRecords.find((r) => r.island.id === island.id);
      const surfacePos =
        island.id === 'baratie'
          ? baratieLocalToWorld(0, 5.2, 0, new THREE.Vector3())
          : island.id === 'twin-cape'
            ? twinCapeLocalToWorld(-6, 48, 22, new THREE.Vector3())
            : rec
              ? rec.basePos.clone()
            : (() => {
                const p = equirectangularToSphere(
                  island.u,
                  island.v,
                  GLOBE_RADIUS + 0.4
                );
                return new THREE.Vector3(p.x, p.y, p.z);
              })();
      const normal = surfacePos.clone().normalize();
      const east = new THREE.Vector3(0, 1, 0).cross(normal);
      if (east.lengthSq() < 0.001) east.set(1, 0, 0);
      east.normalize();
      const north = normal.clone().cross(east).normalize();

      const isAlabastaSub = [
        'rainbase',
        'alubarna',
        'elumalu',
        'nanohana',
        'tamarisk',
      ].includes(island.id);
      const isSkypieaSub = [
        'upper-yard',
        'angel-island',
        'hidden-cloud-village',
      ].includes(island.id);
      const isConomiSub = [
        'arlong-park',
        'cocoyashi-village',
        'gosa-village',
      ].includes(island.id);
      const isGeckoSub = [
        'syrup-village',
        'honey-town',
        'black-cat-beach',
      ].includes(island.id);
      const isDawnSub = ['foosha-village', 'goa-kingdom'].includes(island.id);
      const isOrganSub = island.id === 'orange-town';
      const isDressrosaSub = [
        'acacia',
        'corrida-colosseum',
        'royal-palace-dressrosa',
        'flower-hill',
      ].includes(island.id);
      const isMajor =
        island.notability === 'Legend' || island.notability === 'Major Power';

      const camDistScale =
        island.id === 'alabasta'
          ? 1.05
          : island.id === 'skypiea'
            ? 0.96
            : island.id === 'water-7'
              ? 0.42
              : island.id === 'marineford'
                ? 0.52
                : island.id === 'polestar-islands'
                  ? 0.34
                  : island.id === 'conomi-islands' ||
                      island.id === 'gecko-islands' ||
                      island.id === 'dawn-island'
                    ? 0.36
                    : island.id === 'goat-island' ||
                        island.id === 'organ-island' ||
                        island.id === 'shimotsuki'
                      ? 0.34
                      : island.id === 'shells-town'
                        ? 0.31
                        : island.id === 'baratie'
                          ? 0.095
                          : island.id === 'twin-cape'
                            ? 0.19
                            : island.id === 'reverse-mountain'
                        ? 3.1
                        : isAlabastaSub ||
                            isSkypieaSub ||
                            isConomiSub ||
                            isGeckoSub ||
                            isDawnSub ||
                            isOrganSub ||
                            isDressrosaSub
                          ? 0.19
                          : island.elevationTier === 'sky'
                            ? 4.8
                            : isMajor
                              ? 5.2
                              : 4.1;
      const viewOffset = normal
        .clone()
        .multiplyScalar(camDistScale)
        .addScaledVector(
          north,
          isAlabastaSub ||
            isSkypieaSub ||
            isConomiSub ||
            isGeckoSub ||
            isDawnSub ||
            isOrganSub ||
            isDressrosaSub
            ? -0.14
            : island.id === 'water-7'
              ? -0.34
              : island.id === 'marineford'
                ? -0.42
                : island.id === 'polestar-islands' ||
                    island.id === 'conomi-islands' ||
                    island.id === 'gecko-islands' ||
                    island.id === 'dawn-island' ||
                    island.id === 'goat-island' ||
                    island.id === 'shells-town' ||
                    island.id === 'organ-island' ||
                    island.id === 'shimotsuki'
                  ? -0.26
                  : island.id === 'baratie'
                    ? -0.08
                    : island.id === 'twin-cape'
                      ? -0.22
                      : island.id === 'reverse-mountain'
                    ? -1.85
                    : island.id === 'alabasta' || island.id === 'skypiea'
                      ? -0.58
                      : isMajor
                        ? -1.4
                        : -1.2
        )
        .addScaledVector(
          east,
          isAlabastaSub ||
            isSkypieaSub ||
            isConomiSub ||
            isGeckoSub ||
            isDawnSub ||
            isOrganSub ||
            isDressrosaSub
            ? 0.08
            : island.id === 'water-7'
              ? 0.07
              : island.id === 'marineford'
                ? 0.10
                : island.id === 'polestar-islands' ||
                    island.id === 'conomi-islands' ||
                    island.id === 'gecko-islands' ||
                    island.id === 'dawn-island' ||
                    island.id === 'goat-island' ||
                    island.id === 'shells-town' ||
                    island.id === 'organ-island' ||
                    island.id === 'shimotsuki'
                  ? -0.05
                  : island.id === 'baratie'
                    ? -0.055
                    : island.id === 'twin-cape'
                      ? 0.39
                      : island.id === 'reverse-mountain'
                    ? 1.65
                    : island.id === 'alabasta' || island.id === 'skypiea'
                      ? 0.14
                      : isMajor
                        ? 0.9
                        : 0.7
        );

      const destCamPos = surfacePos.clone().add(viewOffset);

      flyState.startCamDir.copy(camera.position).normalize();
      flyState.startCamDist = camera.position.length();
      flyState.targetCamDir.copy(destCamPos).normalize();
      flyState.targetCamDist = destCamPos.length();
      flyState.startLookAt.copy(controls.target);
      flyState.targetLookAt.copy(surfacePos);
      flyState.startTime = performance.now();
      flyState.duration = isSoftwareGl ? 0.75 : 1.15;
      flyState.active = true;
    };

    const flyToPreset = (
      island:
        | 'alabasta'
        | 'skypiea'
        | 'water-7'
        | 'marineford'
        | 'polestar-islands'
        | 'conomi-islands'
        | 'gecko-islands'
        | 'dawn-island'
        | 'goat-island'
        | 'shells-town'
        | 'organ-island'
        | 'shimotsuki'
        | 'baratie'
        | 'reverse-mountain'
        | 'twin-cape'
        | 'little-garden'
        | 'cactus-island'
        | 'drum-island'
        | 'jaya'
        | 'long-ring-long-land'
        | 'shift-station'
        | 'pucci-island'
        | 'san-faldo'
        | 'st-poplar'
        | 'enies-lobby'
        | 'impel-down'
        | 'amazon-lily'
        | 'thriller-bark'
        | 'sabaody'
        | 'mary-geoise'
        | 'fish-man-island'
        | 'punk-hazard'
        | 'dressrosa'
        | 'whole-cake-island'
        | 'zou'
        | 'wano'
        | 'egghead-island'
        | 'elbaf',
      presetId: string
    ) => {
      ensureIslandLoaded(island);
      if (island === 'fish-man-island') {
        const preset =
          FISH_MAN_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          FISH_MAN_CAMERA_PRESETS[0];
        const destCamPos = fishManLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = fishManLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'shift-station') {
        const preset =
          SHIFT_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          SHIFT_CAMERA_PRESETS[0];
        const destCamPos = shiftLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = shiftLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'pucci-island') {
        const preset =
          PUCCI_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          PUCCI_CAMERA_PRESETS[0];
        const destCamPos = pucciLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = pucciLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'san-faldo') {
        const preset =
          SAN_FALDO_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          SAN_FALDO_CAMERA_PRESETS[0];
        const destCamPos = sanFaldoLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = sanFaldoLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'st-poplar') {
        const preset =
          ST_POPLAR_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          ST_POPLAR_CAMERA_PRESETS[0];
        const destCamPos = stPoplarLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = stPoplarLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'enies-lobby') {
        const preset =
          ENIES_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          ENIES_CAMERA_PRESETS[0];
        const destCamPos = eniesLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = eniesLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'amazon-lily') {
        const preset =
          AMAZON_LILY_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          AMAZON_LILY_CAMERA_PRESETS[0];
        const destCamPos = amazonLilyLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = amazonLilyLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'thriller-bark') {
        const preset =
          THRILLER_BARK_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          THRILLER_BARK_CAMERA_PRESETS[0];
        const destCamPos = thrillerBarkLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = thrillerBarkLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'sabaody') {
        const preset =
          SABAODY_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          SABAODY_CAMERA_PRESETS[0];
        const destCamPos = sabaodyLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = sabaodyLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'punk-hazard') {
        const preset =
          PUNK_HAZARD_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          PUNK_HAZARD_CAMERA_PRESETS[0];
        const destCamPos = punkHazardLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = punkHazardLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'dressrosa') {
        const preset =
          DRESSROSA_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          DRESSROSA_CAMERA_PRESETS[0];
        const destCamPos = dressrosaLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = dressrosaLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'whole-cake-island') {
        const preset =
          TOTTO_LAND_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          TOTTO_LAND_CAMERA_PRESETS[0];
        const destCamPos = tottoLandLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = tottoLandLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'zou') {
        const preset =
          ZOU_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          ZOU_CAMERA_PRESETS[0];
        const destCamPos = zouLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = zouLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'wano') {
        const preset =
          WANO_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          WANO_CAMERA_PRESETS[0];
        const destCamPos = wanoLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = wanoLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'egghead-island') {
        const preset =
          EGGHEAD_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          EGGHEAD_CAMERA_PRESETS[0];
        const destCamPos = eggheadLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = eggheadLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'elbaf') {
        const preset =
          ELBAF_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          ELBAF_CAMERA_PRESETS[0];
        const destCamPos = elbafLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = elbafLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'mary-geoise') {
        const preset =
          MARY_GEOISE_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          MARY_GEOISE_CAMERA_PRESETS[0];
        const destCamPos = maryGeoiseLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = maryGeoiseLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'impel-down') {
        if (presetId === 'tarai-triangle') {
          ensureIslandLoaded('enies-lobby');
          ensureIslandLoaded('marineford');
          const cUp = taraiCentroidWorld.clone().normalize();
          const cEast = new THREE.Vector3(0, 1, 0).cross(cUp).normalize();
          const cSouth = new THREE.Vector3().crossVectors(cEast, cUp).normalize();
          const destTgtPos = taraiCentroidWorld.clone();
          const destCamPos = taraiCentroidWorld
            .clone()
            .addScaledVector(cUp, 2.85)
            .addScaledVector(cSouth, 1.32)
            .addScaledVector(cEast, 0.12);
          flyState.startCamDir.copy(camera.position).normalize();
          flyState.startCamDist = camera.position.length();
          flyState.targetCamDir.copy(destCamPos).normalize();
          flyState.targetCamDist = destCamPos.length();
          flyState.startLookAt.copy(controls.target);
          flyState.targetLookAt.copy(destTgtPos);
          flyState.startTime = performance.now();
          flyState.duration = isSoftwareGl ? 0.08 : 1.05;
          flyState.active = true;
          return;
        }
        const preset =
          IMPEL_DOWN_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          IMPEL_DOWN_CAMERA_PRESETS[0];
        const destCamPos = impelDownLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = impelDownLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );
        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'long-ring-long-land') {
        const preset =
          LONG_RING_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          LONG_RING_CAMERA_PRESETS[0];
        const destCamPos = longRingLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = longRingLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'jaya') {
        const preset =
          JAYA_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          JAYA_CAMERA_PRESETS[0];
        const destCamPos = jayaLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = jayaLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.08 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'drum-island') {
        const preset =
          DRUM_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          DRUM_CAMERA_PRESETS[0];
        const destCamPos = drumLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = drumLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.45 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'cactus-island') {
        const preset =
          CACTUS_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          CACTUS_CAMERA_PRESETS[0];
        const destCamPos = cactusLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = cactusLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'little-garden') {
        const preset =
          LITTLE_GARDEN_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          LITTLE_GARDEN_CAMERA_PRESETS[0];
        const destCamPos = littleGardenLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = littleGardenLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'twin-cape') {
        ensureIslandLoaded('reverse-mountain');
        const preset =
          TWIN_CAPE_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          TWIN_CAPE_CAMERA_PRESETS[0];
        const destCamPos = twinCapeLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = twinCapeLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'baratie') {
        const preset =
          BARATIE_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          BARATIE_CAMERA_PRESETS[0];
        const destCamPos = baratieLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = baratieLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'shimotsuki') {
        const preset =
          SHIMOTSUKI_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          SHIMOTSUKI_CAMERA_PRESETS[0];
        const destCamPos = shimotsukiLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = shimotsukiLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'organ-island') {
        const preset =
          ORGAN_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          ORGAN_CAMERA_PRESETS[0];
        const destCamPos = organLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = organLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'shells-town') {
        const preset =
          SHELLS_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          SHELLS_CAMERA_PRESETS[0];
        const destCamPos = shellsLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = shellsLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'goat-island') {
        const preset =
          GOAT_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          GOAT_CAMERA_PRESETS[0];
        const destCamPos = goatLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = goatLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'dawn-island') {
        const preset =
          DAWN_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          DAWN_CAMERA_PRESETS[0];
        const destCamPos = dawnLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = dawnLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'gecko-islands') {
        const preset =
          GECKO_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          GECKO_CAMERA_PRESETS[0];
        const destCamPos = geckoLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = geckoLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'conomi-islands') {
        const preset =
          CONOMI_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          CONOMI_CAMERA_PRESETS[0];
        const destCamPos = conomiLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = conomiLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'polestar-islands') {
        const preset =
          LOGUETOWN_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          LOGUETOWN_CAMERA_PRESETS[0];
        const destCamPos = loguetownLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = loguetownLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'reverse-mountain') {
        const preset =
          RM_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          RM_CAMERA_PRESETS[0];
        const destCamPos = reverseMountainLocalToWorld(
          preset.x,
          preset.y,
          preset.z,
          new THREE.Vector3()
        );
        const destTgtPos = reverseMountainLocalToWorld(
          preset.lookX,
          preset.lookY,
          preset.lookZ,
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.05;
        flyState.active = true;
        return;
      }
      if (island === 'marineford') {
        const preset =
          MARINEFORD_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          MARINEFORD_CAMERA_PRESETS[0];
        const destCamPos = marinefordLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = marinefordLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.05;
        flyState.active = true;
        return;
      }

      if (island === 'water-7') {
        const preset =
          WATER7_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          WATER7_CAMERA_PRESETS[0];
        const destCamPos = water7LocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = water7LocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.05;
        flyState.active = true;
        return;
      }

      if (island === 'skypiea') {
        const preset =
          SKYPIEA_CAMERA_PRESETS.find((p) => p.id === presetId) ??
          SKYPIEA_CAMERA_PRESETS[0];
        const destCamPos = skypieaLocalToWorld(
          preset.position[0],
          preset.position[1],
          preset.position[2],
          new THREE.Vector3()
        );
        const destTgtPos = skypieaLocalToWorld(
          preset.target[0],
          preset.target[1],
          preset.target[2],
          new THREE.Vector3()
        );

        flyState.startCamDir.copy(camera.position).normalize();
        flyState.startCamDist = camera.position.length();
        flyState.targetCamDir.copy(destCamPos).normalize();
        flyState.targetCamDist = destCamPos.length();
        flyState.startLookAt.copy(controls.target);
        flyState.targetLookAt.copy(destTgtPos);
        flyState.startTime = performance.now();
        flyState.duration = isSoftwareGl ? 0.75 : 1.05;
        flyState.active = true;
        return;
      }

      const preset =
        ALABASTA_CAMERA_PRESETS.find((p) => p.id === presetId) ??
        ALABASTA_CAMERA_PRESETS[0];
      const destCamPos = alabastaLocalToWorld(
        preset.position[0],
        preset.position[1],
        preset.position[2],
        new THREE.Vector3()
      );
      const destTgtPos = alabastaLocalToWorld(
        preset.target[0],
        preset.target[1],
        preset.target[2],
        new THREE.Vector3()
      );

      flyState.startCamDir.copy(camera.position).normalize();
      flyState.startCamDist = camera.position.length();
      flyState.targetCamDir.copy(destCamPos).normalize();
      flyState.targetCamDist = destCamPos.length();
      flyState.startLookAt.copy(controls.target);
      flyState.targetLookAt.copy(destTgtPos);
      flyState.startTime = performance.now();
      flyState.duration = isSoftwareGl ? 0.75 : 1.05;
      flyState.active = true;
    };

    const resetView = () => {
      flyState.startCamDir.copy(camera.position).normalize();
      flyState.startCamDist = camera.position.length();
      flyState.targetCamDir.copy(DEFAULT_CAMERA_POS).normalize();
      flyState.targetCamDist = DEFAULT_CAMERA_POS.length();
      flyState.startLookAt.copy(controls.target);
      flyState.targetLookAt.set(0, 0, 0);
      flyState.startTime = performance.now();
      flyState.duration = isSoftwareGl ? 0.7 : 1.05;
      flyState.active = true;
    };

    const updateLabelVisibility = (visible: boolean) => {
      markersGroup.visible = visible;
      css2dRenderer.domElement.style.display = visible ? 'block' : 'none';
    };

    sceneControlRef.current = {
      flyToIsland,
      flyToPreset,
      setSailingMode,
      setTitleScreenMode,
      warpSunnyToIsland,
      triggerSunnyAction,
      resetView,
      loadMapUrl,
      updateLabelVisibility,
    };

    const onControlsStart = () => {
      flyState.active = false;
    };
    controls.addEventListener('start', onControlsStart);

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    // Continuous cursor-surface zoom anchoring (scroll deep into any island down to street height)
    const zoomAnchorTarget = new THREE.Vector3();
    let zoomAnchorActive = false;

    const onWheel = (e: WheelEvent) => {
      if (titleScreenActiveRef.current) return;
      if (sailingActiveRef.current) {
        sunnyOrbitTarget.distanceScale = THREE.MathUtils.clamp(
          sunnyOrbitTarget.distanceScale * (e.deltaY > 0 ? 1.1 : 0.91),
          SUNNY_ORBIT_DIST_MIN,
          SUNNY_ORBIT_DIST_MAX
        );
        return;
      }

      flyState.active = false;
      const distToTarget = camera.position.distanceTo(controls.target);

      if (e.deltaY < 0) {
        // Scrolling IN: raycast cursor against globe/island geometry to lock zoom pivot onto surface
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(
          [landmarksGroup, terrainMesh, oceanMesh],
          true
        );
        if (
          hits.length > 0 &&
          (distToTarget > 0.15 ||
            (distToTarget > 0.035 &&
              (selectedIslandRef.current?.id === 'baratie' ||
                selectedIslandRef.current?.id === 'twin-cape')) ||
            (distToTarget > 0.012 &&
              (selectedIslandRef.current?.id === 'little-garden' ||
                selectedIslandRef.current?.id === 'cactus-island' ||
                selectedIslandRef.current?.id === 'drum-island' ||
                selectedIslandRef.current?.id === 'jaya' ||
                selectedIslandRef.current?.id === 'mock-town' ||
                selectedIslandRef.current?.id === 'long-ring-long-land' ||
                selectedIslandRef.current?.id === 'shift-station' ||
                selectedIslandRef.current?.id === 'pucci-island' ||
                selectedIslandRef.current?.id === 'san-faldo' ||
                selectedIslandRef.current?.id === 'st-poplar' ||
                selectedIslandRef.current?.id === 'enies-lobby' ||
                selectedIslandRef.current?.id === 'impel-down' ||
                selectedIslandRef.current?.id === 'amazon-lily' ||
                selectedIslandRef.current?.id === 'thriller-bark' ||
                selectedIslandRef.current?.id === 'sabaody' ||
                selectedIslandRef.current?.id === 'mary-geoise' ||
                selectedIslandRef.current?.id === 'fish-man-island' ||
                selectedIslandRef.current?.id === 'punk-hazard' ||
                (selectedIslandRef.current !== null &&
                  selectedIslandRef.current.id in DRESSROSA_SUB_LOCATIONS) ||
                (selectedIslandRef.current !== null &&
                  selectedIslandRef.current.id in TOTTO_LAND_SUB_LOCATIONS) ||
                (selectedIslandRef.current !== null &&
                  selectedIslandRef.current.id in WANO_SUB_LOCATIONS) ||
                (selectedIslandRef.current !== null &&
                  selectedIslandRef.current.id in EGGHEAD_SUB_LOCATIONS) ||
                (selectedIslandRef.current !== null &&
                  selectedIslandRef.current.id in ELBAF_SUB_LOCATIONS) ||
                selectedIslandRef.current?.id === 'zou')) ||
            controls.target.length() < 6)
        ) {
          zoomAnchorTarget.copy(hits[0].point);
          zoomAnchorActive = true;
        }
      } else if (e.deltaY > 0 && distToTarget > 2.4 && controls.target.length() > 1.0) {
        // Scrolling OUT past local altitude smoothly re-centers orbit around globe origin
        zoomAnchorTarget.set(0, 0, 0);
        zoomAnchorActive = true;
      }
    };

    // Keyboard WASD / ZQSD / Arrow street walking when zoomed near planet surface
    const pressedKeys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if (titleScreenActiveRef.current) return;
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (sailingActiveRef.current && !isPausedRef.current && e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) {
          tryActivateSunnyBoost();
        }
        return;
      }
      if (
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'KeyZ',
          'KeyQ',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'ShiftLeft',
          'ShiftRight',
        ].includes(e.code)
      ) {
        if (sailingActiveRef.current && e.code.startsWith('Arrow')) {
          e.preventDefault();
        }
        pressedKeys.add(e.code);
        flyState.active = false;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.code);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (titleScreenActiveRef.current) return;
      downX = e.clientX;
      downY = e.clientY;
      if (sailingActiveRef.current) {
        isDraggingSunnyCam = true;
        activeDragPointerId = e.pointerId;
        dragLastX = e.clientX;
        dragLastY = e.clientY;
        renderer.domElement.setPointerCapture?.(e.pointerId);
        renderer.domElement.style.cursor = 'grabbing';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (titleScreenActiveRef.current) return;
      if (
        isDraggingSunnyCam &&
        (activeDragPointerId === null || activeDragPointerId === e.pointerId)
      ) {
        isDraggingSunnyCam = false;
        activeDragPointerId = null;
        renderer.domElement.releasePointerCapture?.(e.pointerId);
      }

      if (sailingActiveRef.current) {
        renderer.domElement.style.cursor = 'grab';
        return;
      }

      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(interactables, false);
      if (hits.length > 0) {
        const island = hits[0].object.userData.island as
          | IslandLocation
          | undefined;
        if (island) {
          onSelectIslandRef.current(island);
        }
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (
        isDraggingSunnyCam &&
        (activeDragPointerId === null || activeDragPointerId === e.pointerId)
      ) {
        isDraggingSunnyCam = false;
        activeDragPointerId = null;
      }
      if (sailingActiveRef.current) {
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (titleScreenActiveRef.current) {
        renderer.domElement.style.cursor = 'default';
        return;
      }
      if (sailingActiveRef.current) {
        if (isDraggingSunnyCam) {
          const dx = e.clientX - dragLastX;
          const dy = e.clientY - dragLastY;
          dragLastX = e.clientX;
          dragLastY = e.clientY;
          sunnyOrbitTarget.yaw += dx * 0.0068;
          sunnyOrbitTarget.pitch = THREE.MathUtils.clamp(
            sunnyOrbitTarget.pitch + dy * 0.0056,
            SUNNY_ORBIT_PITCH_MIN,
            SUNNY_ORBIT_PITCH_MAX
          );
          renderer.domElement.style.cursor = 'grabbing';
          return;
        }
        renderer.domElement.style.cursor = 'grab';
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(interactables, false);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    const onContextMenu = (e: MouseEvent) => {
      if (sailingActiveRef.current) {
        e.preventDefault();
      }
    };

    const onDblClick = () => {
      if (sailingActiveRef.current) {
        resetSunnyOrbit(false);
      }
    };

    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    renderer.domElement.addEventListener('dblclick', onDblClick);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp);

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      css2dRenderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    loadMapUrl(mapSourceUrl);
    updateLabelVisibility(showLabelsRef.current);

    let disposed = false;
    let frameId = 0;
    let lastTime = performance.now();
    let cloudCoverSmooth = cloudCoverRef.current;
    let shipWeatherRoughness = 0;
    let shipSpeedFactor = 1;
    let lastNavShadowMode: boolean | null = null;
    let elapsed = 0;
    let lastSunnyCamMode: SunnyCameraMode = sunnyCameraModeRef.current;
    let lastAudioUpdateMs = 0;
    let prevThunderFlash = false;
    let prevCollided = false;
    let prevCalmBeltBlocked = false;
    let prevCoatingBlocked = false;
    let prevBoost = false;
    let prevCoated = false;
    let prevInReverseCanal = false;
    let prevSkyZone: SunnySkyZone = 'blue-sea';
    let smoothSolarHour = timeOfDayRef.current;
    let lastSyncedPropHour = timeOfDayRef.current;
    const syncVfxAudioEdgesFromState = () => {
      prevCollided = sunnyState?.collided ?? false;
      prevCalmBeltBlocked = sunnyState?.calmBeltBlocked ?? false;
      prevCoatingBlocked = Boolean(sunnyState?.coatingRequiredBlocked);
      prevBoost = sunnyBoostState.activeRemainingSec > 0;
      prevCoated = Boolean(sunnyState?.coated);
      prevInReverseCanal = sunnyState?.inReverseMountainCanal ?? false;
      prevSkyZone = sunnyState?.skyZone ?? 'blue-sea';
    };
    const worldAudioScratch: WorldAudioStateUpdate = {
      seaRoughness: 0,
      rainIntensity: 0,
      snowIntensity: 0,
      weatherType: null,
      cameraSurfaceMix: 0,
    };

    const projectedLabels: {
      rec: MarkerRecord;
      sx: number;
      sy: number;
      distSq: number;
      isSelected: boolean;
    }[] = [];

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;

      if (isPausedRef.current) {
        lastTime = performance.now();
        frameId = window.setTimeout(tick, 140);
        return;
      }

      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      elapsed += dt;

      // 1. Update Sun Position & Time of Day lighting (smooth 60fps progression over 10-min 24h cycle)
      const propHour = timeOfDayRef.current;
      const propDelta = shortestSolarHourDelta(lastSyncedPropHour, propHour);
      if (Math.abs(propDelta) > 0.06 || Math.abs(shortestSolarHourDelta(smoothSolarHour, propHour)) > 0.12) {
        smoothSolarHour = propHour;
      } else {
        smoothSolarHour = advanceSolarHour(smoothSolarHour, dt);
      }
      lastSyncedPropHour = propHour;
      const hour = smoothSolarHour;
      const inNavOrTitle =
        titleScreenActiveRef.current || sailingActiveRef.current;
      if (inNavOrTitle) {
        const anchorPos = sunnyState ? sunnyState.position : dawnOriginPos;
        _v2.copy(anchorPos).normalize();
        const navSunDir = computeLocalNavigationSunDir(_v2, hour);
        _v1.set(navSunDir.x, navSunDir.y, navSunDir.z).normalize();
        sunLight.target.position.copy(anchorPos);
        sunLight.position.copy(anchorPos).addScaledVector(_v1, 42);
      } else {
        const sunPos = computeSunPosition(hour, 48);
        sunLight.target.position.set(0, 0, 0);
        sunLight.position.set(sunPos.x, sunPos.y, sunPos.z);
        _v1.set(sunPos.x, sunPos.y, sunPos.z).normalize();
      }
      if (!isSoftwareGl && lastNavShadowMode !== inNavOrTitle) {
        lastNavShadowMode = inNavOrTitle;
        if (inNavOrTitle) {
          sunLight.shadow.camera.left = -1.6;
          sunLight.shadow.camera.right = 1.6;
          sunLight.shadow.camera.top = 1.6;
          sunLight.shadow.camera.bottom = -1.6;
          sunLight.shadow.camera.near = 28;
          sunLight.shadow.camera.far = 58;
        } else {
          sunLight.shadow.camera.left = -13;
          sunLight.shadow.camera.right = 13;
          sunLight.shadow.camera.top = 13;
          sunLight.shadow.camera.bottom = -13;
          sunLight.shadow.camera.near = 18;
          sunLight.shadow.camera.far = 75;
        }
        sunLight.shadow.camera.updateProjectionMatrix();
      }
      sharedUniforms.uSunDir.value.copy(_v1);
      atmosUniforms.uSunDir.value.copy(_v1);
      sharedUniforms.uTime.value = elapsed;

      const camR = camera.position.length();
      const targetDistNow = camera.position.distanceTo(controls.target);
      const fmiCamDist = camera.position.distanceTo(fishManOriginPos);
      const isSubseaSunny =
        sailingActiveRef.current &&
        sunnyState !== null &&
        (sunnyState.skyZone === 'subsea-dive' ||
          sunnyState.skyZone === 'fish-man-island');
      const fmiAbyssMix = isSubseaSunny
        ? 1
        : THREE.MathUtils.clamp((GLOBE_RADIUS - 0.14 - camR) / 0.32, 0, 1) *
          (1 - THREE.MathUtils.smoothstep(fmiCamDist, 0.88, 1.55));

      const tbCamDist = camera.position.distanceTo(thrillerBarkOriginPos);
      const tbTargetDist = controls.target.distanceTo(thrillerBarkOriginPos);
      const tbSkyMix =
        (1 - THREE.MathUtils.smoothstep(tbCamDist, 0.56, 1.08)) *
        (1 - THREE.MathUtils.smoothstep(tbTargetDist, 0.42, 0.96));

      const daylight = computeDaylightFactor(hour);
      const isTwilight = daylight > 0.15 && daylight < 0.65;
      if (isTwilight) {
        sunLight.color.setHex(0xffb478);
        sunLight.intensity = 2.05;
      } else {
        sunLight.color.setHex(0xfff5e4);
        sunLight.intensity = 2.4;
      }
      if (!isSoftwareGl) {
        sunLight.castShadow = fmiAbyssMix < 0.25;
      }
      hemiLight.color.setHex(0x93c5fd);
      hemiLight.groundColor.setHex(0x132038);
      hemiLight.intensity = 0.58;

      if (fmiAbyssMix > 0.005) {
        sunLight.color.lerp(_fmiSunTint, fmiAbyssMix);
        sunLight.intensity = THREE.MathUtils.lerp(
          sunLight.intensity,
          1.15,
          fmiAbyssMix
        );
        hemiLight.color.lerp(_fmiHemiSky, fmiAbyssMix);
        hemiLight.groundColor.lerp(_fmiHemiGround, fmiAbyssMix);
        hemiLight.intensity = THREE.MathUtils.lerp(0.58, 0.78, fmiAbyssMix);
        oceanMat.color.setHex(0xffffff);
      } else if (tbSkyMix > 0.005) {
        sunLight.color.lerp(_florianSunTint, tbSkyMix);
        sunLight.intensity = THREE.MathUtils.lerp(
          sunLight.intensity,
          1.62,
          tbSkyMix
        );
        hemiLight.color.lerp(_florianHemiSky, tbSkyMix);
        hemiLight.groundColor.lerp(_florianHemiGround, tbSkyMix);
        hemiLight.intensity = THREE.MathUtils.lerp(0.58, 0.78, tbSkyMix);
        oceanMat.color.setHex(0xffffff).lerp(_florianOceanTint, tbSkyMix);
      } else {
        oceanMat.color.setHex(0xffffff);
      }

      // 2. Distinct 3D Cumulus Cloud Drift, Altitude Layering (< Skypiea) & Shadow Projection
      const targetCloudCover = Math.max(0, Math.min(1, cloudCoverRef.current));
      cloudCoverSmooth +=
        (targetCloudCover - cloudCoverSmooth) * Math.min(1, dt * 14);
      sharedUniforms.uCloudCover.value = cloudCoverSmooth;

      const tbCloudMask = (1 - tbSkyMix * 0.94) * (1 - fmiAbyssMix);
      if (inNavOrTitle && sunnyState) {
        _vFocus.set(sunnyState.position.x, sunnyState.position.y, sunnyState.position.z);
      } else {
        _vFocus.copy(camera.position).normalize().multiplyScalar(GLOBE_RADIUS);
      }
      const activeShadowCount = globeCloudSystem.update({
        elapsed,
        cloudCover: cloudCoverSmooth,
        globeRadius: GLOBE_RADIUS,
        focusPoint: _vFocus,
        sunDir: sharedUniforms.uSunDir.value,
        daylight,
        isTwilight,
        skyVisibility: tbCloudMask,
        sampleHeightAt: currentMaps?.sampleHeightAt,
      });
      sharedUniforms.uCloudShadowStrength.value =
        (isSoftwareGl ? 1.05 : 1.0) * tbCloudMask * (0.35 + 0.65 * daylight);

      const weatherProbePoint =
        inNavOrTitle && sunnyState ? sunnyState.position : _vFocus;
      const localWeather: UnderCloudWeatherSample =
        tbCloudMask > 0.1
          ? sampleCloudWeatherUnderPoint(
              weatherProbePoint,
              globeCloudSystem.shadowUniformVec4s,
              globeCloudSystem.shadowParamVec4s,
              activeShadowCount,
              GLOBE_RADIUS
            )
          : {
              seaRoughness: 0,
              shadowStrength: 0,
              speedFactor: 1,
              weatherType: null,
              rainIntensity: 0,
              snowIntensity: 0,
              lightning: 0,
            };

      const isOpenBlueSeaSunny =
        sunnyState !== null &&
        sunnyState.skyZone === 'blue-sea' &&
        !sunnyState.inReverseMountainCanal;
      const targetShipRough = isOpenBlueSeaSunny ? localWeather.seaRoughness : 0;
      const targetShipSpeed = isOpenBlueSeaSunny ? localWeather.speedFactor : 1;
      const weatherLerp = Math.min(1, dt * 3.8);
      shipWeatherRoughness += (targetShipRough - shipWeatherRoughness) * weatherLerp;
      shipSpeedFactor += (targetShipSpeed - shipSpeedFactor) * weatherLerp;

      if (localWeather.lightning > 0.02 && tbCloudMask > 0.1) {
        hemiLight.intensity += localWeather.lightning * 0.65;
      }
      const thunderPeak = localWeather.lightning > 0.35 && tbCloudMask > 0.15;
      if (thunderPeak && !prevThunderFlash) {
        onPlayAudioSfxRef.current?.('sfx-thunder', 0.85, 1600);
      }
      prevThunderFlash = thunderPeak;

      const showLocalPrecip =
        tbCloudMask > 0.15 &&
        (inNavOrTitle || camR < GLOBE_RADIUS + 1.35);
      if (showLocalPrecip) {
        _v4.copy(_vFocus).normalize().multiplyScalar(GLOBE_RADIUS);
        cloudWeatherEffects.update({
          elapsed,
          anchorWorldPos: _v4,
          rainIntensity: localWeather.rainIntensity,
          snowIntensity: localWeather.snowIntensity,
          lightning: localWeather.lightning,
          stormFactor: localWeather.weatherType === 'storm' ? 1 : 0,
        });
      } else {
        cloudWeatherEffects.group.visible = false;
      }

      atmosMesh.visible = camR > GLOBE_RADIUS + 0.85 && targetDistNow > 1.05 && fmiAbyssMix < 0.2;

      // Blend space background to atmospheric sky when zoomed onto any surface OR floating sky island
      const localSkyMix =
        controls.target.length() > 7.5
          ? THREE.MathUtils.clamp((1.85 - targetDistNow) / 1.15, 0, 1)
          : 0;
      const surfaceSkyMix = THREE.MathUtils.clamp((GLOBE_RADIUS + 1.45 - camR) / 1.05, 0, 1);
      const atmoSkyMix = Math.max(surfaceSkyMix, localSkyMix);

      if (now - lastAudioUpdateMs > 180) {
        lastAudioUpdateMs = now;
        worldAudioScratch.seaRoughness = isOpenBlueSeaSunny
          ? shipWeatherRoughness
          : localWeather.seaRoughness;
        worldAudioScratch.rainIntensity = localWeather.rainIntensity;
        worldAudioScratch.snowIntensity = localWeather.snowIntensity;
        worldAudioScratch.weatherType = localWeather.weatherType;
        worldAudioScratch.cameraSurfaceMix = atmoSkyMix;
        onWorldAudioUpdateRef.current?.(worldAudioScratch);
      }
      if (atmoSkyMix > 0.005 || fmiAbyssMix > 0.005) {
        if (isTwilight) {
          _skyTarget.copy(_twilightSkyBg);
        } else {
          _skyTarget.copy(_spaceBg).lerp(_daySkyBg, Math.max(0.08, daylight));
        }
        if (tbSkyMix > 0.005) {
          _skyTarget.lerp(_florianSkyBg, tbSkyMix);
        }
        if (fmiAbyssMix > 0.005) {
          _skyTarget.lerp(_fmiAbyssBg, fmiAbyssMix);
        }
        (scene.background as THREE.Color)
          .copy(_spaceBg)
          .lerp(_skyTarget, Math.max(atmoSkyMix, fmiAbyssMix));
      } else {
        (scene.background as THREE.Color).copy(_spaceBg);
      }
      if (fmiAbyssMix > 0.02) {
        fmiFog.density = 0.28 * fmiAbyssMix;
        scene.fog = fmiFog;
      } else if (tbSkyMix > 0.02) {
        florianFog.density = 1.05 * tbSkyMix;
        scene.fog = florianFog;
      } else if (scene.fog) {
        scene.fog = null;
      }
      const starFade =
        (1 - atmoSkyMix * Math.min(1, daylight * 1.3)) *
        (1 - tbSkyMix) *
        (1 - fmiAbyssMix);
      starMat.opacity = 0.85 * Math.max(0, starFade);
      starField.visible = starMat.opacity > 0.02;

      // On-demand viewport-driven island streaming & visibility culling
      if (currentMaps && now - lastStreamCheckMs > 180) {
        lastStreamCheckMs = now;
        _v3.copy(camera.position).normalize();
        let startedThisTick = false;

        for (const rec of streamedRecords) {
          const distToCam = camera.position.distanceTo(rec.worldPos);
          const facing = rec.unitNormal.dot(_v3);
          const sunnyRange =
            rec.island.id === 'reverse-mountain' || rec.island.id === 'twin-cape'
              ? 4.8
              : rec.island.id === 'whole-cake-island'
                ? 3.4
                : rec.island.id === 'jaya' || rec.island.id === 'skypiea'
                  ? 2.8
                  : 1.45;
          const nearSunny =
            sailingActiveRef.current &&
            sunnyState !== null &&
            Math.hypot(
              rec.worldPos.x - sunnyState.position.x,
              rec.worldPos.y - sunnyState.position.y,
              rec.worldPos.z - sunnyState.position.z
            ) < sunnyRange;

          if (rec.status === 'unloaded' && !startedThisTick && rec.nextRetryAt <= now) {
            const isSelected =
              selectedIslandRef.current?.id === rec.island.id ||
              (rec.island.id === 'dressrosa' &&
                selectedIslandRef.current !== null &&
                selectedIslandRef.current.id in DRESSROSA_SUB_LOCATIONS) ||
              (rec.island.id === 'whole-cake-island' &&
                selectedIslandRef.current !== null &&
                selectedIslandRef.current.id in TOTTO_LAND_SUB_LOCATIONS) ||
              (rec.island.id === 'wano' &&
                selectedIslandRef.current !== null &&
                selectedIslandRef.current.id in WANO_SUB_LOCATIONS) ||
              (rec.island.id === 'egghead-island' &&
                selectedIslandRef.current !== null &&
                selectedIslandRef.current.id in EGGHEAD_SUB_LOCATIONS) ||
              (rec.island.id === 'elbaf' &&
                selectedIslandRef.current !== null &&
                selectedIslandRef.current.id in ELBAF_SUB_LOCATIONS);
            const isHeavy = HEAVY_CITY_ISLAND_IDS.has(rec.island.id);
            const shouldLoad = isHeavy
              ? isSelected || nearSunny || (facing > 0.05 && distToCam < 7.2)
              : isSelected || nearSunny || (facing > 0.08 && distToCam < 38.0);

            if (shouldLoad) {
              ensureIslandLoaded(rec.island.id);
              startedThisTick = true;
            }
          }

          if (rec.built) {
            const visible =
              titleScreenActiveRef.current && !sailingActiveRef.current
                ? rec.island.id === 'dawn-island'
                : nearSunny || facing > -0.26 || distToCam < 5.5;
            rec.built.group.visible = visible;
          }
        }
      }

      // Show & animate the Knock Up Stream water column whenever Jaya or Skypiea or Sunny is nearby
      const jayaRec = streamedRecordById.get('jaya');
      const skypieaRec = streamedRecordById.get('skypiea');
      const showKUS =
        Boolean(jayaRec?.built?.group.visible || skypieaRec?.built?.group.visible) ||
        (sailingActiveRef.current &&
          sunnyState !== null &&
          (sunnyState.skyZone !== 'blue-sea' ||
            _v4
              .set(
                sunnyState.position.x,
                sunnyState.position.y,
                sunnyState.position.z
              )
              .distanceTo(knockUpStreamHandle.group.position) < 2.8)) ||
        camera.position.distanceTo(knockUpStreamHandle.group.position) < 7.5;
      knockUpStreamHandle.group.visible = showKUS;
      if (showKUS) {
        knockUpStreamHandle.update(elapsed);
      }

      // Show & animate the Paradise Subsea Plunge Vortex off Red Line West whenever Fish-Man Island / Sabaody or Sunny is nearby
      const sabaodyRec = streamedRecordById.get('sabaody');
      const fishManRec = streamedRecordById.get('fish-man-island');
      if (fishManRec?.built && (isSubseaSunny || camR < GLOBE_RADIUS - 0.14)) {
        fishManRec.built.group.visible = true;
      }
      const showPlunge =
        Boolean(sabaodyRec?.built?.group.visible || fishManRec?.built?.group.visible) ||
        isSubseaSunny ||
        (sailingActiveRef.current &&
          sunnyState !== null &&
          _v4
            .set(
              sunnyState.position.x,
              sunnyState.position.y,
              sunnyState.position.z
            )
            .distanceTo(subseaPlungeHandle.group.position) < 3.5) ||
        camera.position.distanceTo(subseaPlungeHandle.group.position) < 9.0;
      subseaPlungeHandle.group.visible = showPlunge;
      if (showPlunge) {
        subseaPlungeHandle.update(elapsed);
      }

      // Show & animate the Umi Ressha Sea Train Ocean Rail Network + Animated Puffing Tom Trains
      const water7Rec = streamedRecordById.get('water-7');
      const shiftRec = streamedRecordById.get('shift-station');
      const pucciRec = streamedRecordById.get('pucci-island');
      const sanFaldoRec = streamedRecordById.get('san-faldo');
      const stPoplarRec = streamedRecordById.get('st-poplar');
      const eniesRec = streamedRecordById.get('enies-lobby');
      const showSeaTrain =
        Boolean(
          water7Rec?.built?.group.visible ||
            shiftRec?.built?.group.visible ||
            pucciRec?.built?.group.visible ||
            sanFaldoRec?.built?.group.visible ||
            stPoplarRec?.built?.group.visible ||
            eniesRec?.built?.group.visible
        ) ||
        camera.position.distanceTo(water7OriginPos) < 9.5 ||
        camera.position.distanceTo(eniesOriginPos) < 9.5 ||
        (sailingActiveRef.current &&
          sunnyState !== null &&
          (_v4
            .set(
              sunnyState.position.x,
              sunnyState.position.y,
              sunnyState.position.z
            )
            .distanceTo(water7OriginPos) < 4.5 ||
            _v4.distanceTo(eniesOriginPos) < 4.5));
      seaTrainNetworkHandle.group.visible = showSeaTrain;
      if (showSeaTrain) {
        seaTrainNetworkHandle.update(elapsed, camera.position);
      }

      // Show & animate the closed Tarai Current Triangle, 3 Gates of Justice & swirling vortex currents
      const marinefordRec = streamedRecordById.get('marineford');
      const impelDownRec = streamedRecordById.get('impel-down');
      const showTarai =
        Boolean(
          eniesRec?.built?.group.visible ||
            marinefordRec?.built?.group.visible ||
            impelDownRec?.built?.group.visible
        ) ||
        camera.position.distanceTo(taraiCentroidWorld) < 11.5 ||
        (sailingActiveRef.current &&
          sunnyState !== null &&
          _v4
            .set(
              sunnyState.position.x,
              sunnyState.position.y,
              sunnyState.position.z
            )
            .distanceTo(taraiCentroidWorld) < 5.0);
      taraiCurrentNetworkHandle.group.visible = showTarai;
      if (showTarai) {
        taraiCurrentNetworkHandle.update(elapsed);
      }

      // Update visible per-island custom animations & distance-based LOD
      for (const built of builtIslands) {
        if (!built.group.visible) continue;
        built.update?.(elapsed, camera.position.distanceTo(built.group.position));
      }

      // 3. Smooth Spherical Great-Circle Camera Fly-To Transition
      if (flyState.active) {
        const progress = Math.min(
          1,
          (now - flyState.startTime) / (flyState.duration * 1000)
        );
        const t = 1 - Math.pow(1 - progress, 3);

        // Slerp along great circle around the globe so camera never clips through the planet
        const dotDir = Math.max(
          -1,
          Math.min(1, flyState.startCamDir.dot(flyState.targetCamDir))
        );
        if (dotDir > 0.99995) {
          _v1.copy(flyState.targetCamDir);
        } else {
          const omega = Math.acos(dotDir);
          const sinOmega = Math.sin(omega);
          if (sinOmega < 1e-4) {
            _v1
              .copy(flyState.startCamDir)
              .lerp(flyState.targetCamDir, t)
              .normalize();
          } else {
            const s0 = Math.sin((1 - t) * omega) / sinOmega;
            const s1 = Math.sin(t * omega) / sinOmega;
            _v1
              .copy(flyState.startCamDir)
              .multiplyScalar(s0)
              .addScaledVector(flyState.targetCamDir, s1)
              .normalize();
          }
        }

        // Lift arc only on long planetary flights; close-range city dives glide low & smoothly
        const arcHeight =
          dotDir > 0.996 ? 0.008 : dotDir > 0.94 ? 0.35 : dotDir < 0.2 ? 6.5 : 2.2;
        const arcLift = Math.sin(t * Math.PI) * arcHeight;
        const curDist =
          flyState.startCamDist +
          (flyState.targetCamDist - flyState.startCamDist) * t +
          arcLift;

        camera.position.copy(_v1).multiplyScalar(curDist);
        controls.target.lerpVectors(
          flyState.startLookAt,
          flyState.targetLookAt,
          t
        );

        if (progress >= 1) {
          camera.position
            .copy(flyState.targetCamDir)
            .multiplyScalar(flyState.targetCamDist);
          controls.target.copy(flyState.targetLookAt);
          flyState.active = false;

          const finishTargetR = controls.target.length();
          const finishDist = camera.position.distanceTo(controls.target);
          if (finishTargetR > 7.5 && finishDist < 3.6) {
            const raw = 1 - Math.max(0, Math.min(1, (finishDist - 0.55) / 3.05));
            const finishUpBlend = raw * raw * (3 - 2 * raw);
            _v2.copy(controls.target).normalize();
            camera.up.copy(_upVec).lerp(_v2, finishUpBlend).normalize();
            controls.maxPolarAngle = Math.PI * (1.0 - finishUpBlend * 0.36);
          } else {
            camera.up.copy(_upVec);
            controls.maxPolarAngle = Math.PI;
          }
          const ctrlInternal = controls as unknown as {
            _quat: THREE.Quaternion;
            _quatInverse: THREE.Quaternion;
          };
          ctrlInternal._quat.setFromUnitVectors(camera.up, _upVec);
          ctrlInternal._quatInverse.copy(ctrlInternal._quat).invert();

          const prevDamp = controls.enableDamping;
          controls.enableDamping = false;
          controls.update();
          controls.enableDamping = prevDamp;
        }
      } else if (zoomAnchorActive) {
        controls.target.lerp(zoomAnchorTarget, Math.min(1, dt * 8.5));
        if (controls.target.distanceTo(zoomAnchorTarget) < 0.004) {
          controls.target.copy(zoomAnchorTarget);
          zoomAnchorActive = false;
        }
      }

      // Log Pose Start Screen Cinematic Foreground Mode (Sunny Go off Dawn Island)
      if (titleScreenActiveRef.current && !sailingActiveRef.current) {
        ensureSunnyCreated();
        if (sunnyHandle) {
          sunnyHandle.group.visible = true;
          const framing = computeTitleScreenSunnyAndCamera(
            sunnyCollisionEnv,
            elapsed
          );
          sunnyState = framing.sunnyState;
          const titleWave = sampleSunnyWaveForState(
            sunnyState,
            elapsed,
            shipWeatherRoughness
          );
          applySunnyTransform(sunnyState, titleWave.seaLevelOffset);
          sunnyHandle.update(elapsed, 0.038, framing.sunnyState.bankAngle, {
            skyZone: 'blue-sea',
            balloonDeploy: 0,
            coated: false,
            wavePitch: titleWave.pitchSlope,
            waveRoll: titleWave.rollSlope,
            waveCrest: titleWave.crestFactor,
            seaRoughness: shipWeatherRoughness,
          });
          camera.position.set(
            framing.cameraPosition.x,
            framing.cameraPosition.y,
            framing.cameraPosition.z
          );
          if (titleWave.seaLevelOffset !== 0) {
            _v2
              .set(
                sunnyState.position.x,
                sunnyState.position.y,
                sunnyState.position.z
              )
              .normalize();
            camera.position.addScaledVector(_v2, titleWave.seaLevelOffset * 0.4);
          }
          controls.target.set(
            framing.cameraTarget.x,
            framing.cameraTarget.y,
            framing.cameraTarget.z
          );
          camera.up.set(framing.cameraUp.x, framing.cameraUp.y, framing.cameraUp.z);
          camera.lookAt(controls.target);
        }
        const dawnRec = streamedRecordById.get('dawn-island');
        if (dawnRec?.built) {
          dawnRec.built.group.visible = true;
        } else if (currentMaps && dawnRec?.status === 'unloaded') {
          ensureIslandLoaded('dawn-island', true);
        }
      } else if (sailingActiveRef.current && sunnyState && sunnyHandle) {
        const prevBoostActive = sunnyBoostState.activeRemainingSec > 0;
        const prevBoostCooldown = sunnyBoostState.cooldownRemainingSec > 0;
        sunnyBoostState = stepSunnyBoostState(sunnyBoostState, dt);
        const nextBoostActive = sunnyBoostState.activeRemainingSec > 0;
        const nextBoostCooldown = sunnyBoostState.cooldownRemainingSec > 0;
        const boostPhaseChanged =
          prevBoostActive !== nextBoostActive || prevBoostCooldown !== nextBoostCooldown;

        const keyThrottle =
          pressedKeys.has('ArrowUp') ||
          pressedKeys.has('KeyW') ||
          pressedKeys.has('KeyZ')
            ? 1
            : 0;
        const keySteer =
          (pressedKeys.has('ArrowLeft') ||
          pressedKeys.has('KeyA') ||
          pressedKeys.has('KeyQ')
            ? 1
            : 0) -
          (pressedKeys.has('ArrowRight') || pressedKeys.has('KeyD') ? 1 : 0);

        const touchIn = sunnyControlInputRef?.current;
        const combinedInput: SunnyControlInput = {
          throttle: THREE.MathUtils.clamp(
            keyThrottle + Math.max(0, touchIn?.throttle ?? 0),
            0,
            1
          ),
          steer: THREE.MathUtils.clamp(keySteer + (touchIn?.steer ?? 0), -1, 1),
          boost: nextBoostActive,
        };

        sunnyState = stepSunnySailing(
          sunnyState,
          combinedInput,
          dt,
          sunnyCollisionEnv,
          ONE_PIECE_LOCATIONS,
          {
            seaRoughness: shipWeatherRoughness,
            speedFactor: shipSpeedFactor,
            elapsed,
          }
        );

        const boostNow = Boolean(combinedInput.boost);
        if (boostNow && !prevBoost) {
          onPlayAudioSfxRef.current?.('sfx-coup-de-burst', 1.0, 900);
        }
        prevBoost = boostNow;

        if (sunnyState.collided && !prevCollided) {
          onPlayAudioSfxRef.current?.('sfx-hull-collision', 0.95, 360);
        }
        prevCollided = sunnyState.collided;

        if (sunnyState.calmBeltBlocked && !prevCalmBeltBlocked) {
          onPlayAudioSfxRef.current?.('sfx-calm-belt', 0.95, 1300);
        }
        prevCalmBeltBlocked = sunnyState.calmBeltBlocked;

        const coatingBlockedNow = Boolean(sunnyState.coatingRequiredBlocked);
        if (coatingBlockedNow && !prevCoatingBlocked) {
          onPlayAudioSfxRef.current?.('sfx-warning-alert', 1.0, 1400);
        }
        prevCoatingBlocked = coatingBlockedNow;

        const coatedNow = Boolean(sunnyState.coated);
        if (coatedNow && !prevCoated) {
          onPlayAudioSfxRef.current?.('sfx-coating-bubble', 1.0, 1200);
        }
        prevCoated = coatedNow;

        if (sunnyState.inReverseMountainCanal && !prevInReverseCanal) {
          onPlayAudioSfxRef.current?.('sfx-reverse-mountain', 0.95, 2200);
        }
        prevInReverseCanal = sunnyState.inReverseMountainCanal;

        if (sunnyState.skyZone !== prevSkyZone) {
          if (sunnyState.skyZone === 'knock-up-stream') {
            onPlayAudioSfxRef.current?.('sfx-knock-up-stream', 1.0, 1500);
          } else if (sunnyState.skyZone === 'skypiea' && prevSkyZone === 'knock-up-stream') {
            onPlayAudioSfxRef.current?.('sfx-log-pose-waypoint', 0.9, 1000);
          } else if (sunnyState.skyZone === 'balloon-glide') {
            onPlayAudioSfxRef.current?.('sfx-octopus-balloon', 1.0, 1500);
          } else if (sunnyState.skyZone === 'subsea-dive') {
            onPlayAudioSfxRef.current?.('sfx-subsea-dive', 1.0, 1500);
          } else if (
            sunnyState.skyZone === 'blue-sea' &&
            (prevSkyZone === 'fish-man-island' || prevSkyZone === 'subsea-dive')
          ) {
            onPlayAudioSfxRef.current?.('sfx-subsea-dive', 0.9, 1200);
          }
          prevSkyZone = sunnyState.skyZone;
        }

        if (
          sunnyState.skyZone === 'subsea-dive' ||
          sunnyState.skyZone === 'fish-man-island'
        ) {
          ensureIslandLoaded('fish-man-island');
        }
        const sailWave = sampleSunnyWaveForState(
          sunnyState,
          elapsed,
          shipWeatherRoughness
        );
        applySunnyTransform(sunnyState, sailWave.seaLevelOffset);
        sunnyHandle.update(elapsed, sunnyState.speed, sunnyState.bankAngle, {
          balloonDeploy: sunnyState.balloonDeploy,
          skyZone: sunnyState.skyZone,
          coated: Boolean(sunnyState.coated),
          wavePitch: sailWave.pitchSlope,
          waveRoll: sailWave.rollSlope,
          waveCrest: sailWave.crestFactor,
          seaRoughness: shipWeatherRoughness,
          boostActive: nextBoostActive,
        });

        const modeSwitched = lastSunnyCamMode !== sunnyCameraModeRef.current;
        if (modeSwitched) {
          resetSunnyOrbit(true);
        }
        lastSunnyCamMode = sunnyCameraModeRef.current;

        const orbitDamp = modeSwitched ? 1 : 1 - Math.exp(-18 * dt);
        sunnyOrbit.yaw += (sunnyOrbitTarget.yaw - sunnyOrbit.yaw) * orbitDamp;
        sunnyOrbit.pitch += (sunnyOrbitTarget.pitch - sunnyOrbit.pitch) * orbitDamp;
        sunnyOrbit.distanceScale +=
          (sunnyOrbitTarget.distanceScale - sunnyOrbit.distanceScale) * orbitDamp;

        const camGoal = computeSunnyNavigatorCamera(
          sunnyState,
          sunnyCameraModeRef.current,
          GLOBE_RADIUS,
          sunnyOrbit
        );
        const camDamp = modeSwitched ? 1 : 1 - Math.exp(-26 * dt);
        _v1.set(camGoal.position.x, camGoal.position.y, camGoal.position.z);
        _v2.set(camGoal.target.x, camGoal.target.y, camGoal.target.z);
        _v3.set(camGoal.up.x, camGoal.up.y, camGoal.up.z);

        camera.position.lerp(_v1, camDamp);
        controls.target.lerp(_v2, camDamp);
        camera.up.lerp(_v3, camDamp).normalize();

        // Keep sailing camera cleanly above raised ocean, canyon cliffs, or subsea lagoon floor
        const sailFloorBase = sampleSailingGroundRadiusAtWorldPos(camera.position);
        const minOceanFloor =
          sunnyState.skyZone === 'blue-sea'
            ? GLOBE_RADIUS + OCEAN_SEA_LEVEL_OFFSET
            : GLOBE_RADIUS;
        const sailFloor =
          sunnyState.skyZone === 'subsea-dive' ||
          sunnyState.skyZone === 'fish-man-island'
            ? Math.max(sailFloorBase, GLOBE_RADIUS + sunnyState.elevation)
            : Math.max(
                sailFloorBase,
                minOceanFloor,
                GLOBE_RADIUS + sunnyState.elevation * 0.85 + sailWave.seaLevelOffset
              );
        const sailMinR = sailFloor + SUNNY_WORLD_LENGTH * 0.24;
        if (camera.position.length() < sailMinR) {
          camera.position.setLength(sailMinR);
        }
        camera.lookAt(controls.target);

        if (boostPhaseChanged || now - lastTelemetrySentMs > 120) {
          lastTelemetrySentMs = now;
          emitSunnyTelemetryNow();
        }
      } else {
        // WASD / ZQSD / Arrow tangential walking when zoomed onto an island surface
        const distToTarget = camera.position.distanceTo(controls.target);
        if (distToTarget < 2.2 && controls.target.length() > 6.5) {
          const moveFwd =
            (pressedKeys.has('KeyW') ||
            pressedKeys.has('KeyZ') ||
            pressedKeys.has('ArrowUp')
              ? 1
              : 0) -
            (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown') ? 1 : 0);
          const moveRight =
            (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight') ? 1 : 0) -
            (pressedKeys.has('KeyA') ||
            pressedKeys.has('KeyQ') ||
            pressedKeys.has('ArrowLeft')
              ? 1
              : 0);

          if (moveFwd !== 0 || moveRight !== 0) {
            _v2.copy(controls.target).normalize(); // Local surface normal
            camera.getWorldDirection(_vForward);
            _vForward.addScaledVector(_v2, -_vForward.dot(_v2));
            if (_vForward.lengthSq() > 1e-8) _vForward.normalize();
            _vRight.crossVectors(_vForward, _v2).normalize();

            _vMove
              .set(0, 0, 0)
              .addScaledVector(_vForward, moveFwd)
              .addScaledVector(_vRight, moveRight)
              .normalize();

            const sprint =
              pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight') ? 2.1 : 1.0;
            const speed = THREE.MathUtils.clamp(distToTarget * 0.75, 0.025, 0.45) * sprint;

            camera.position.addScaledVector(_vMove, speed * dt);
            controls.target.addScaledVector(_vMove, speed * dt);

            // Follow local street/ramp ground elevation smoothly
            const curGround = sampleGlobeGroundRadiusAtWorldPos(camera.position);
            const targetEyeR = curGround + Math.max(0.0045, distToTarget * 0.25);
            const curR = camera.position.length();
            const newR = THREE.MathUtils.damp(curR, targetEyeR, 9, dt);
            camera.position.setLength(newR);

            const tgtGround = sampleGlobeGroundRadiusAtWorldPos(controls.target);
            controls.target.setLength(tgtGround + 0.002);
          }
        }

        // Align OrbitControls local gravity camera.up with sphere normal when zoomed in on an island
        const targetR = controls.target.length();
        const postDist = camera.position.distanceTo(controls.target);
        let upBlend = 0;
        if (targetR > 7.5 && postDist < 3.6) {
          const raw = 1 - Math.max(0, Math.min(1, (postDist - 0.55) / 3.05));
          upBlend = raw * raw * (3 - 2 * raw);
        }

        if (upBlend > 0.01) {
          _v2.copy(controls.target).normalize();
          _v3.copy(_upVec).lerp(_v2, upBlend).normalize();
          camera.up.lerp(_v3, Math.min(1, dt * 12)).normalize();
          controls.maxPolarAngle = Math.PI * (1.0 - upBlend * 0.36);
        } else {
          camera.up.lerp(_upVec, Math.min(1, dt * 10)).normalize();
          controls.maxPolarAngle = Math.PI;
        }

        const ctrlInternal = controls as unknown as {
          _quat: THREE.Quaternion;
          _quatInverse: THREE.Quaternion;
        };
        ctrlInternal._quat.setFromUnitVectors(camera.up, _upVec);
        ctrlInternal._quatInverse.copy(ctrlInternal._quat).invert();

        controls.zoomSpeed = THREE.MathUtils.clamp(0.45 + postDist * 0.14, 0.45, 0.92);
        controls.panSpeed = THREE.MathUtils.clamp(0.25 + postDist * 0.15, 0.22, 0.65);
        if (!flyState.active) {
          controls.update();
        }

        // Exact Terrain & Ocean Ground Clearance Clamp (skip during subsea fly-to dives into -10,000 m grotto)
        const isSubseaFly =
          flyState.active && flyState.targetCamDist < GLOBE_RADIUS - 0.14;
        if (!isSubseaFly) {
          const minSurfaceR =
            sampleGlobeGroundRadiusAtWorldPos(camera.position) + 0.003;
          if (camera.position.length() < minSurfaceR) {
            camera.position.setLength(minSurfaceR);
          }
        }
      }

      const mistSnapshot = islandMistSystem.update({
        elapsed,
        sunnyPos: sunnyState ? sunnyState.position : null,
        cameraPos: camera.position,
        sunDir: sharedUniforms.uSunDir.value,
        sailingActive: sailingActiveRef.current,
        daylight,
        isTwilight,
        hideForSubseaMix: fmiAbyssMix,
        sunnyElevation: sunnyState?.elevation ?? 0,
      });
      if (container) {
        container.dataset.nearestMist = mistSnapshot.nearestIslandMistFactor.toFixed(2);
        container.dataset.mistIslands = String(mistSnapshot.activeMistIslandCount);
      }

      const postDist = camera.position.distanceTo(controls.target);
      const groundRNow =
        sailingActiveRef.current || titleScreenActiveRef.current
          ? sampleSailingGroundRadiusAtWorldPos(camera.position)
          : sampleGlobeGroundRadiusAtWorldPos(camera.position);

      // Dynamic camera near plane to prevent close-up clipping & planetary z-fighting
      const clearance = Math.max(0.00025, camera.position.length() - groundRNow);
      const desiredNear =
        sailingActiveRef.current || titleScreenActiveRef.current
          ? THREE.MathUtils.clamp(
              Math.min(clearance, postDist) * 0.09,
              0.00018,
              0.03
            )
          : THREE.MathUtils.clamp(
              Math.min(clearance, postDist) * 0.14,
              0.00035,
              0.08
            );
      if (Math.abs(camera.near - desiredNear) / camera.near > 0.08) {
        camera.near = desiredNear;
        camera.updateProjectionMatrix();
      }

      // 4. Marker highlight, street-scale marker fade & CSS2D label occlusion/declutter
      const activeId = selectedIslandRef.current?.id ?? null;
      const viewWidth = container?.clientWidth || window.innerWidth;
      const viewHeight = container?.clientHeight || window.innerHeight;
      const showMarkersAtAltitude = postDist >= 1.25;
      markersGroup.visible =
        !titleScreenActiveRef.current &&
        showLabelsRef.current &&
        showMarkersAtAltitude;
      const labelsVisible =
        !titleScreenActiveRef.current && showLabelsRef.current && postDist >= 0.35;

      projectedLabels.length = 0;

      for (const rec of markerRecords) {
        const isSel = rec.island.id === activeId;
        const isImportant =
          rec.island.notability === 'Legend' ||
          rec.island.notability === 'Major Power';
        const targetMat = isSel ? matActive : isImportant ? matGold : matCyan;
        if (rec.gemMesh.material !== targetMat) {
          rec.gemMesh.material = targetMat;
          rec.ringMesh.material = targetMat;
        }
        rec.gemMesh.rotation.y = elapsed * 1.4;
        const altScale = postDist < 2.6 ? THREE.MathUtils.clamp(postDist / 2.6, 0.22, 1.0) : 1.0;
        const scale = (isSel ? 1.35 : isImportant ? 1.0 : 0.72) * altScale;
        rec.group.scale.setScalar(scale);

        if (!labelsVisible) {
          rec.labelObj.visible = false;
          rec.labelBtn.style.opacity = '0';
          rec.labelBtn.style.pointerEvents = 'none';
          continue;
        }
        rec.labelBtn.dataset.active = isSel ? 'true' : 'false';
        _v2.copy(camera.position).sub(rec.basePos).normalize();
        const facing = rec.normal.dot(_v2);

        if (facing < 0.1) {
          rec.labelObj.visible = false;
          rec.labelBtn.style.opacity = '0';
          rec.labelBtn.style.pointerEvents = 'none';
        } else {
          _v3.copy(rec.basePos).project(camera);
          if (_v3.z > 1) {
            rec.labelObj.visible = false;
            rec.labelBtn.style.opacity = '0';
            rec.labelBtn.style.pointerEvents = 'none';
          } else {
            const sx = ((_v3.x + 1) * 0.5) * viewWidth;
            const sy = ((-_v3.y + 1) * 0.5) * viewHeight;
            projectedLabels.push({
              rec,
              sx,
              sy,
              distSq: camera.position.distanceToSquared(rec.basePos),
              isSelected: isSel,
            });
          }
        }
      }

      if (labelsVisible && projectedLabels.length > 0) {
        projectedLabels.sort((a, b) => {
          if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1;
          if (a.rec.priority !== b.rec.priority)
            return b.rec.priority - a.rec.priority;
          return a.distSq - b.distSq;
        });

        const accepted: { x: number; y: number }[] = [];
        const camDist = camera.position.distanceTo(controls.target);
        const boxW = camDist < 12 ? 78 : 112;
        const boxH = camDist < 12 ? 22 : 28;

        for (const item of projectedLabels) {
          let overlaps = false;
          for (const prev of accepted) {
            if (
              Math.abs(item.sx - prev.x) < boxW &&
              Math.abs(item.sy - prev.y) < boxH
            ) {
              overlaps = true;
              break;
            }
          }
          if (overlaps && !item.isSelected) {
            item.rec.labelObj.visible = false;
            item.rec.labelBtn.style.opacity = '0';
            item.rec.labelBtn.style.pointerEvents = 'none';
          } else {
            accepted.push({ x: item.sx, y: item.sy });
            item.rec.labelObj.visible = true;
            item.rec.labelBtn.style.opacity = '1';
            item.rec.labelBtn.style.pointerEvents = 'auto';
          }
        }
      }

      renderer.render(scene, camera);
      if (labelsVisible) {
        css2dRenderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      frameId = window.setTimeout(tick, 16);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      titlePreloadQueue?.cancel();
      titlePreloadQueue = null;
      if (startupCompleteTimer !== null) {
        window.clearTimeout(startupCompleteTimer);
        startupCompleteTimer = null;
      }
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);

      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp);
      controls.removeEventListener('start', onControlsStart);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      renderer.domElement.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

      controls.dispose();
      currentMaps?.dispose();
      oceanNormalTex.dispose();
      globeCloudSystem.dispose();
      islandMistSystem.dispose();
      cloudWeatherEffects.dispose();
      terrainGeo.dispose();
      terrainMat.dispose();
      oceanGeo.dispose();
      oceanMat.dispose();
      cragGeo.dispose();
      cragMat.dispose();
      treeGeo.dispose();
      treeMat.dispose();
      landmarkGeos.forEach((g) => g.dispose());
      sharedIslandMatPool.forEach((m) => m.dispose());
      customIslandMats.forEach((m) => m.dispose());
      customIslandTexs.forEach((t) => t.dispose());
      atmosGeo.dispose();
      atmosMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      ringGeo.dispose();
      pinGeo.dispose();
      gemGeo.dispose();
      hitGeo.dispose();
      matGold.dispose();
      matCyan.dispose();
      matActive.dispose();
      matHit.dispose();
      envTarget.dispose();
      sunnyHandle?.dispose();
      knockUpStreamHandle.dispose();
      subseaPlungeHandle.dispose();
      seaTrainNetworkHandle.dispose();
      taraiCurrentNetworkHandle.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === canvasMount) {
        canvasMount.removeChild(renderer.domElement);
      }
      if (css2dRenderer.domElement.parentNode === labelMount) {
        labelMount.removeChild(css2dRenderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneControlRef.current?.setTitleScreenMode(titleScreenActive);
  }, [titleScreenActive]);

  useEffect(() => {
    if (selectedIsland && !sailingActive && !titleScreenActive) {
      sceneControlRef.current?.flyToIsland(selectedIsland);
    }
  }, [selectedIsland, sailingActive, titleScreenActive]);

  useEffect(() => {
    sceneControlRef.current?.setSailingMode(sailingActive);
  }, [sailingActive]);

  useEffect(() => {
    if (sunnyWarpTarget && sunnyWarpTarget.trigger > 0) {
      sceneControlRef.current?.warpSunnyToIsland(sunnyWarpTarget.island);
    }
  }, [sunnyWarpTarget]);

  useEffect(() => {
    if (sunnyActionSignal && sunnyActionSignal.trigger > 0) {
      sceneControlRef.current?.triggerSunnyAction(sunnyActionSignal.action);
    }
  }, [sunnyActionSignal]);

  useEffect(() => {
    if (diveTarget && diveTarget.trigger > 0) {
      sceneControlRef.current?.flyToPreset(diveTarget.island, diveTarget.presetId);
    }
  }, [diveTarget]);

  useEffect(() => {
    if (resetSignal > 0) {
      sceneControlRef.current?.resetView();
    }
  }, [resetSignal]);

  useEffect(() => {
    sceneControlRef.current?.updateLabelVisibility(showLabels);
  }, [showLabels]);

  const prevUrlRef = useRef<string>(mapSourceUrl);
  useEffect(() => {
    if (prevUrlRef.current !== mapSourceUrl) {
      prevUrlRef.current = mapSourceUrl;
      sceneControlRef.current?.loadMapUrl(mapSourceUrl);
    }
  }, [mapSourceUrl]);

  useEffect(() => {
    if (retryLoadSignal > 0) {
      sceneControlRef.current?.loadMapUrl(mapSourceUrl);
    }
  }, [retryLoadSignal, mapSourceUrl]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#030712]"
      data-testid="globe-viewport"
    >
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />
      <div
        ref={labelMountRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />
    </div>
  );
}
