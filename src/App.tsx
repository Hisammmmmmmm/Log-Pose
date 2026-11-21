import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GlobeHUD } from './components/GlobeHUD';
import { LoadingScreenOverlay } from './components/LoadingScreenOverlay';
import {
  GLOBE_RADIUS,
  OnePieceGlobe,
  type IslandDiveTarget,
  type SunnyActionSignal,
  type SunnyTelemetry,
  type WorldAudioStateUpdate,
} from './components/OnePieceGlobe';
import { StartMenuOverlay } from './components/StartMenuOverlay';
import { ONE_PIECE_LOCATIONS } from './data/onePieceLocations';
import { CUSTOM_3D_ISLAND_IDS } from './islands/lazyRegistry';
import {
  advanceSolarHour,
  equirectangularToSphere,
  type IslandLocation,
} from './utils/globeMath';
import {
  DEFAULT_GAME_SETTINGS,
  resolveDocumentBodyState,
  resolveLuffyStartIsland,
  shouldAutoStartFromSearch,
  type ActiveMenuModal,
  type AppScreenMode,
} from './utils/gameMenuState';
import {
  advanceMugiwaraRouteOnTelemetry,
  getMugiwaraRouteIslands,
  resolveInitialMugiwaraRouteIndex,
} from './utils/mugiwaraRoute';
import type { SunnyCameraMode, SunnyControlInput } from './utils/sunnyNavigation';
import type { LoadingIslandInfo } from './utils/islandLoading';
import type { StartupPreloadState } from './utils/backgroundPreloader';
import {
  GameAudioEngine,
  loadStoredAudioSettings,
  saveStoredAudioSettings,
  type SfxSoundId,
  type UiSoundId,
} from './utils/gameAudio';

const DEFAULT_MAP_URL = '/assets/aistudio/map_a1ae834f.jpeg';

const ALABASTA_ISLAND_FOR_PRESET: Record<string, string> = {
  overview: 'alabasta',
  'alubarna-street': 'alubarna',
  'alubarna-palace': 'alubarna',
  rainbase: 'rainbase',
  nanohana: 'nanohana',
  katorea: 'alabasta',
  erumalu: 'elumalu',
  yuba: 'alabasta',
  'spiders-cafe': 'alabasta',
};

const SKYPIEA_ISLAND_FOR_PRESET: Record<string, string> = {
  overview: 'skypiea',
  'angel-beach-street': 'angel-island',
  'angel-pier': 'angel-island',
  'jungle-path': 'skypiea',
  'upper-yard-palace': 'upper-yard',
  'shandora-pyramid': 'hidden-cloud-village',
  'shandora-ruins': 'hidden-cloud-village',
  'giant-jack': 'upper-yard',
};

const CONOMI_ISLAND_FOR_PRESET: Record<string, string> = {
  overview: 'conomi-islands',
  'arlong-park': 'arlong-park',
  'cocoyashi-village': 'cocoyashi-village',
  'tangerine-grove': 'cocoyashi-village',
  'gosa-village': 'gosa-village',
  'highland-trail': 'conomi-islands',
};

const GECKO_ISLAND_FOR_PRESET: Record<string, string> = {
  overview: 'gecko-islands',
  'syrup-village': 'syrup-village',
  'kaya-mansion': 'syrup-village',
  'honey-town': 'honey-town',
  'black-cat-beach': 'black-cat-beach',
  'highland-trail': 'gecko-islands',
};

const DAWN_ISLAND_FOR_PRESET: Record<string, string> = {
  overview: 'dawn-island',
  'partys-bar': 'foosha-village',
  'foosha-village': 'foosha-village',
  'goa-high-town': 'goa-kingdom',
  'goa-gate': 'goa-kingdom',
  'mount-colubo': 'dawn-island',
};

const ORGAN_ISLAND_FOR_PRESET: Record<string, string> = {
  overview: 'organ-island',
  'sea-big-top': 'orange-town',
  'whale-fountain': 'orange-town',
  'pet-food-chouchou': 'orange-town',
  'buggy-chapiteau': 'organ-island',
  'east-river-bridge': 'organ-island',
};

const DRESSROSA_ISLAND_FOR_PRESET: Record<string, string> = {
  overview: 'dressrosa',
  'acacia-plaza': 'acacia',
  'corrida-colosseum': 'corrida-colosseum',
  'royal-palace-sunflowers': 'royal-palace-dressrosa',
  'underground-factory': 'dressrosa',
  'iron-bridge': 'dressrosa',
  'green-bit-tontatta': 'green-bit',
};

const TOTTO_LAND_ISLAND_FOR_PRESET: Record<string, string> = {
  overview: 'whole-cake-island',
  'whole-cake-chateau': 'whole-cake-island',
  'sweet-city': 'whole-cake-island',
  'seducing-woods': 'whole-cake-island',
  'cacao-island': 'cacao-island',
  'cheese-island': 'cheese-island',
  'peripheral-cupcakes': 'funwari-island',
};

const WANO_ISLAND_FOR_PRESET: Record<string, string> = {
  overview: 'wano',
  'flower-capital': 'flower-capital',
  'mount-fuji': 'wano',
  kuri: 'kuri',
  ringo: 'ringo',
  'udon-kibi': 'udon',
  hakumai: 'hakumai',
  onigashima: 'onigashima',
};

const INITIAL_TELEMETRY: SunnyTelemetry = {
  speedKnots: 0,
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
  elevationMeters: 0,
  pitchDeg: 0,
  u: 0.552,
  v: 0.398,
  shipMapHeadingDeg: 200,
  logPoseRelativeAngleDeg: 0,
  logPoseDistanceKm: 0,
  orbitYawDeg: 0,
  orbitPitchDeg: 0,
  nearestIslandName: null,
  nearestDistanceKm: 0,
  boostActive: false,
  boostRemainingSec: 0,
  boostCooldownSec: 0,
};

export default function App() {
  const [appMode, setAppMode] = useState<AppScreenMode>(() =>
    typeof window !== 'undefined' &&
    shouldAutoStartFromSearch(window.location.search)
      ? 'atlas'
      : 'loading'
  );
  const [menuModal, setMenuModal] = useState<ActiveMenuModal>(null);
  const [preloadedCount, setPreloadedCount] = useState<number>(0);
  const [retryLoadSignal, setRetryLoadSignal] = useState<number>(0);
  const [preloadStatus, setPreloadStatus] = useState<StartupPreloadState>(() => ({
    phase: 'map',
    progress: 0.03,
    completedIslands: 0,
    totalIslands: CUSTOM_3D_ISLAND_IDS.size,
    currentLabel: 'CHARGEMENT...',
    currentDetail: 'Initialisation du Log Pose…',
  }));
  const [mapSourceUrl, setMapSourceUrl] = useState<string>(DEFAULT_MAP_URL);
  const [selectedIsland, setSelectedIsland] = useState<IslandLocation | null>(
    null
  );
  const [diveTarget, setDiveTarget] = useState<IslandDiveTarget | null>(null);
  const [showLabels, setShowLabels] = useState<boolean>(
    DEFAULT_GAME_SETTINGS.showLabels
  );
  const [cloudCover, setCloudCover] = useState<number>(
    DEFAULT_GAME_SETTINGS.cloudCover
  );
  const [timeOfDay, setTimeOfDay] = useState<number>(
    DEFAULT_GAME_SETTINGS.timeOfDay
  );
  const [resetSignal, setResetSignal] = useState<number>(0);
  const [isLoadingMap, setIsLoadingMap] = useState<boolean>(true);
  const [mapError, setMapError] = useState<string | null>(null);

  const mugiwaraRouteIslands = useMemo(
    () => getMugiwaraRouteIslands(ONE_PIECE_LOCATIONS),
    []
  );

  const [sailingActive, setSailingActive] = useState<boolean>(false);
  const [sailingPreparing, setSailingPreparing] = useState<boolean>(false);
  const [sunnyCameraMode, setSunnyCameraMode] = useState<SunnyCameraMode>(
    DEFAULT_GAME_SETTINGS.sunnyCameraMode
  );
  const [musicEnabled, setMusicEnabled] = useState<boolean>(
    () => loadStoredAudioSettings().musicEnabled
  );
  const [soundVolume, setSoundVolume] = useState<number>(
    () => loadStoredAudioSettings().soundVolume
  );
  const audioEngineRef = useRef<GameAudioEngine | null>(null);
  const worldAudioRef = useRef<WorldAudioStateUpdate>({
    seaRoughness: 0,
    rainIntensity: 0,
    snowIntensity: 0,
    weatherType: null,
    cameraSurfaceMix: 0.25,
  });
  const [sunnyTelemetry, setSunnyTelemetry] =
    useState<SunnyTelemetry>(INITIAL_TELEMETRY);
  const [sunnyWarpTarget, setSunnyWarpTarget] = useState<{
    island: IslandLocation | null;
    trigger: number;
  } | null>(null);
  const [sunnyActionSignal, setSunnyActionSignal] =
    useState<SunnyActionSignal | null>(null);
  const [loadedIslands, setLoadedIslands] = useState<string[]>([]);
  const [loadingIslands, setLoadingIslands] = useState<LoadingIslandInfo[]>([]);
  const [mugiwaraRouteIndex, setMugiwaraRouteIndex] = useState<number>(() =>
    resolveInitialMugiwaraRouteIndex(null, mugiwaraRouteIslands)
  );
  const [mugiwaraArrivedNotice, setMugiwaraArrivedNotice] = useState<
    string | null
  >(null);

  const sunnyControlRef = useRef<SunnyControlInput>({
    throttle: 0,
    steer: 0,
    boost: false,
  });
  const uploadedObjectUrlRef = useRef<string | null>(null);
  const mugiwaraRouteIndexRef = useRef<number>(mugiwaraRouteIndex);
  mugiwaraRouteIndexRef.current = mugiwaraRouteIndex;
  const arrivedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const engine = new GameAudioEngine({ musicEnabled, soundVolume });
    audioEngineRef.current = engine;
    void engine.preloadTracks();
    return () => {
      engine.dispose();
      audioEngineRef.current = null;
      if (uploadedObjectUrlRef.current) {
        URL.revokeObjectURL(uploadedObjectUrlRef.current);
      }
      if (arrivedTimerRef.current !== null) {
        window.clearTimeout(arrivedTimerRef.current);
      }
    };
    // Initial audio settings synced by dedicated effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveStoredAudioSettings({ musicEnabled, soundVolume });
    audioEngineRef.current?.updateSettings({ musicEnabled, soundVolume });
  }, [musicEnabled, soundVolume]);

  useEffect(() => {
    audioEngineRef.current?.updateWorldContext({
      appMode,
      sailingActive,
      skyZone: sunnyTelemetry.skyZone,
      selectedIslandId: selectedIsland?.id ?? null,
      seaRoughness: worldAudioRef.current.seaRoughness,
      rainIntensity: worldAudioRef.current.rainIntensity,
      snowIntensity: worldAudioRef.current.snowIntensity,
      speedKnots: sunnyTelemetry.speedKnots,
      cameraSurfaceMix: worldAudioRef.current.cameraSurfaceMix,
      weatherType: worldAudioRef.current.weatherType,
    });
  }, [
    appMode,
    sailingActive,
    selectedIsland?.id,
    sunnyTelemetry.skyZone,
    sunnyTelemetry.speedKnots,
  ]);

  useEffect(() => {
    document.body.dataset.state = resolveDocumentBodyState(appMode, menuModal);
  }, [appMode, menuModal]);

  useEffect(() => {
    if (appMode === 'loading' || appMode === 'quit' || menuModal !== null) {
      return;
    }
    let lastTickMs = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const dtSeconds = Math.min(5, Math.max(0.05, (now - lastTickMs) / 1000));
      lastTickMs = now;
      setTimeOfDay((prev) => advanceSolarHour(prev, dtSeconds));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [appMode, menuModal]);

  const handlePlayAudioSfx = useCallback(
    (id: SfxSoundId | UiSoundId, intensity = 1, cooldownMs = 90) => {
      audioEngineRef.current?.playSfx(id, intensity, cooldownMs);
    },
    []
  );

  const handleWorldAudioUpdate = useCallback(
    (update: WorldAudioStateUpdate) => {
      worldAudioRef.current.seaRoughness = update.seaRoughness;
      worldAudioRef.current.rainIntensity = update.rainIntensity;
      worldAudioRef.current.snowIntensity = update.snowIntensity;
      worldAudioRef.current.weatherType = update.weatherType;
      worldAudioRef.current.cameraSurfaceMix = update.cameraSurfaceMix;
      audioEngineRef.current?.updateWorldContext({
        appMode,
        sailingActive,
        skyZone: sunnyTelemetry.skyZone,
        selectedIslandId: selectedIsland?.id ?? null,
        seaRoughness: update.seaRoughness,
        rainIntensity: update.rainIntensity,
        snowIntensity: update.snowIntensity,
        speedKnots: sunnyTelemetry.speedKnots,
        cameraSurfaceMix: update.cameraSurfaceMix,
        weatherType: update.weatherType,
      });
    },
    [
      appMode,
      sailingActive,
      selectedIsland?.id,
      sunnyTelemetry.skyZone,
      sunnyTelemetry.speedKnots,
    ]
  );

  const handleToggleMusic = useCallback(() => {
    audioEngineRef.current?.playSfx('ui-menu-click', 0.85, 80);
    setMusicEnabled((prev) => !prev);
  }, []);

  const handleChangeSoundVolume = useCallback((nextVolume: number) => {
    void audioEngineRef.current?.unlockAndResume();
    setSoundVolume(nextVolume);
  }, []);

  const mugiwaraTargetIsland =
    mugiwaraRouteIslands[mugiwaraRouteIndex] ?? mugiwaraRouteIslands[0] ?? null;

  const handlePreloadProgressChange = useCallback((completed: number) => {
    setPreloadedCount(completed);
  }, []);

  const handleStartupPreloadComplete = useCallback(() => {
    setAppMode((prev) => (prev === 'loading' ? 'title' : prev));
  }, []);

  const handleRetryStartupLoad = useCallback(() => {
    audioEngineRef.current?.playSfx('ui-menu-click', 0.9, 90);
    setMapError(null);
    setPreloadStatus({
      phase: 'map',
      progress: 0.04,
      completedIslands: 0,
      totalIslands: CUSTOM_3D_ISLAND_IDS.size,
      currentLabel: 'CHARGEMENT...',
      currentDetail: 'Nouvelle tentative de chargement…',
    });
    setRetryLoadSignal((n) => n + 1);
  }, []);

  const handleResetView = useCallback(() => {
    audioEngineRef.current?.playSfx('ui-menu-click', 0.85, 80);
    sunnyControlRef.current = { throttle: 0, steer: 0, boost: false };
    setSailingPreparing(false);
    setSailingActive(false);
    setAppMode('atlas');
    setMugiwaraArrivedNotice(null);
    setSelectedIsland(null);
    setDiveTarget(null);
    setResetSignal((s) => s + 1);
  }, []);

  const handleSelectIsland = useCallback(
    (island: IslandLocation | null) => {
      if (island) {
        audioEngineRef.current?.playSfx('ui-island-select', 0.9, 120);
      } else {
        audioEngineRef.current?.playSfx('ui-menu-click', 0.7, 90);
      }
      setDiveTarget(null);
      setSelectedIsland(island);
      if (sailingActive && island) {
        setSunnyWarpTarget((prev) => ({
          island,
          trigger: (prev?.trigger ?? 0) + 1,
        }));
      }
    },
    [sailingActive]
  );

  const handleToggleSailing = useCallback(() => {
    audioEngineRef.current?.playSfx(
      !sailingActive ? 'ui-start-voyage' : 'ui-menu-click',
      0.95,
      120
    );
    sunnyControlRef.current = { throttle: 0, steer: 0, boost: false };
    setDiveTarget(null);
    setMugiwaraArrivedNotice(null);
    if (!sailingActive) {
      const startIdx = resolveInitialMugiwaraRouteIndex(
        selectedIsland,
        mugiwaraRouteIslands
      );
      mugiwaraRouteIndexRef.current = startIdx;
      setMugiwaraRouteIndex(startIdx);
      setSailingPreparing(true);
      setSailingActive(true);
      setAppMode('voyage');
      if (selectedIsland) {
        setSunnyWarpTarget((w) => ({
          island: selectedIsland,
          trigger: (w?.trigger ?? 0) + 1,
        }));
      }
    } else {
      setSailingPreparing(false);
      setSailingActive(false);
      setAppMode('atlas');
    }
  }, [mugiwaraRouteIslands, sailingActive, selectedIsland]);

  const handleSailAtIsland = useCallback(
    (island: IslandLocation) => {
      audioEngineRef.current?.playSfx('ui-start-voyage', 1.0, 140);
      sunnyControlRef.current = { throttle: 0, steer: 0, boost: false };
      setDiveTarget(null);
      setMugiwaraArrivedNotice(null);
      const startIdx = resolveInitialMugiwaraRouteIndex(
        island,
        mugiwaraRouteIslands
      );
      mugiwaraRouteIndexRef.current = startIdx;
      setMugiwaraRouteIndex(startIdx);
      setSelectedIsland(island);
      setSailingPreparing(true);
      setSailingActive(true);
      setAppMode('voyage');
      setSunnyWarpTarget((prev) => ({
        island,
        trigger: (prev?.trigger ?? 0) + 1,
      }));
    },
    [mugiwaraRouteIslands]
  );

  const handleMenuStartAtlas = useCallback(() => {
    void audioEngineRef.current?.unlockAndResume();
    audioEngineRef.current?.playSfx('ui-start-voyage', 0.9, 120);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    sunnyControlRef.current = { throttle: 0, steer: 0, boost: false };
    setMenuModal(null);
    setSailingPreparing(false);
    setSailingActive(false);
    setDiveTarget(null);
    setSelectedIsland(null);
    setAppMode('atlas');
  }, []);

  const handleMenuStartVoyage = useCallback(() => {
    void audioEngineRef.current?.unlockAndResume();
    audioEngineRef.current?.playSfx('ui-start-voyage', 1.0, 120);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setMenuModal(null);
    const luffyStartIsland = resolveLuffyStartIsland(ONE_PIECE_LOCATIONS);
    if (luffyStartIsland) {
      handleSailAtIsland(luffyStartIsland);
    } else {
      setSailingPreparing(true);
      setSailingActive(true);
      setAppMode('voyage');
    }
  }, [handleSailAtIsland]);

  const handleJournalObserveIsland = useCallback((island: IslandLocation) => {
    audioEngineRef.current?.playSfx('ui-island-select', 0.95, 120);
    setMenuModal(null);
    setSailingPreparing(false);
    setSailingActive(false);
    setDiveTarget(null);
    setAppMode('atlas');
    setSelectedIsland(island);
  }, []);

  const handleJournalSailToIsland = useCallback(
    (island: IslandLocation) => {
      setMenuModal(null);
      handleSailAtIsland(island);
    },
    [handleSailAtIsland]
  );

  const handleReturnToMenu = useCallback(() => {
    audioEngineRef.current?.playSfx('ui-modal-close', 0.9, 100);
    sunnyControlRef.current = { throttle: 0, steer: 0, boost: false };
    setSailingPreparing(false);
    setSailingActive(false);
    setMugiwaraArrivedNotice(null);
    setDiveTarget(null);
    setSelectedIsland(null);
    setMenuModal(null);
    setAppMode('title');
  }, []);

  const handleResetSettings = useCallback(() => {
    audioEngineRef.current?.playSfx('ui-menu-click', 0.9, 90);
    setTimeOfDay(DEFAULT_GAME_SETTINGS.timeOfDay);
    setCloudCover(DEFAULT_GAME_SETTINGS.cloudCover);
    setShowLabels(DEFAULT_GAME_SETTINGS.showLabels);
    setSunnyCameraMode(DEFAULT_GAME_SETTINGS.sunnyCameraMode);
    setMusicEnabled(DEFAULT_GAME_SETTINGS.musicEnabled);
    setSoundVolume(DEFAULT_GAME_SETTINGS.soundVolume);
  }, []);

  const handleSunnyTelemetry = useCallback(
    (telemetry: SunnyTelemetry) => {
      setSunnyTelemetry(telemetry);
      const idx = mugiwaraRouteIndexRef.current;
      const target = mugiwaraRouteIslands[idx];
      if (target && idx < mugiwaraRouteIslands.length - 1) {
        const shipPos = equirectangularToSphere(
          telemetry.u,
          telemetry.v,
          GLOBE_RADIUS
        );
        const step = advanceMugiwaraRouteOnTelemetry({
          shipPos,
          u: telemetry.u,
          v: telemetry.v,
          currentIndex: idx,
          routeIslands: mugiwaraRouteIslands,
          globeRadius: GLOBE_RADIUS,
          allowGrandLineSkip:
            telemetry.speedKnots > 0 || telemetry.inReverseMountainCanal,
          elevation: telemetry.elevationMeters / 120,
        });
        if (step.arrivedAt && step.nextIndex !== idx) {
          const nextIsland = mugiwaraRouteIslands[step.nextIndex];
          audioEngineRef.current?.playSfx('sfx-log-pose-waypoint', 0.95, 1000);
          mugiwaraRouteIndexRef.current = step.nextIndex;
          setMugiwaraRouteIndex(step.nextIndex);
          setMugiwaraArrivedNotice(
            step.enteredGrandLine
              ? `Entrée dans Grand Line (Twin Cape) → Cap sur ${nextIsland.name} !`
              : `Étape atteinte : ${step.arrivedAt.name} → Cap sur ${nextIsland.name} !`
          );
          if (arrivedTimerRef.current !== null) {
            window.clearTimeout(arrivedTimerRef.current);
          }
          arrivedTimerRef.current = window.setTimeout(() => {
            setMugiwaraArrivedNotice(null);
            arrivedTimerRef.current = null;
          }, 4200);
        }
      }
    },
    [mugiwaraRouteIslands]
  );

  const handlePrevMugiwaraStage = useCallback(() => {
    audioEngineRef.current?.playSfx('ui-menu-click', 0.85, 80);
    setMugiwaraArrivedNotice(null);
    setMugiwaraRouteIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextMugiwaraStage = useCallback(() => {
    audioEngineRef.current?.playSfx('ui-menu-click', 0.85, 80);
    setMugiwaraArrivedNotice(null);
    setMugiwaraRouteIndex((prev) =>
      Math.min(mugiwaraRouteIslands.length - 1, prev + 1)
    );
  }, [mugiwaraRouteIslands.length]);

  const commitIslandDive = useCallback(
    (island: IslandDiveTarget['island'], presetId: string) => {
      audioEngineRef.current?.playSfx('ui-island-select', 0.9, 100);
      setSailingPreparing(false);
      setSailingActive(false);
      setDiveTarget((prev) => ({
        island,
        presetId,
        trigger: (prev?.trigger ?? 0) + 1,
      }));
    },
    []
  );

  const handleDiveAlabasta = useCallback(
    (presetId = 'overview') => {
      const mappedId = ALABASTA_ISLAND_FOR_PRESET[presetId] ?? 'alabasta';
      const matchingIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === mappedId);
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('alabasta', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveSkypiea = useCallback(
    (presetId = 'overview') => {
      const mappedId = SKYPIEA_ISLAND_FOR_PRESET[presetId] ?? 'skypiea';
      const matchingIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === mappedId);
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('skypiea', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveWater7 = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === 'water-7');
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('water-7', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveMarineford = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'marineford'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('marineford', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveLoguetown = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'polestar-islands'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('polestar-islands', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveConomi = useCallback(
    (presetId = 'overview') => {
      const mappedId = CONOMI_ISLAND_FOR_PRESET[presetId] ?? 'conomi-islands';
      const matchingIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === mappedId);
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('conomi-islands', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveGecko = useCallback(
    (presetId = 'overview') => {
      const mappedId = GECKO_ISLAND_FOR_PRESET[presetId] ?? 'gecko-islands';
      const matchingIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === mappedId);
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('gecko-islands', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveDawn = useCallback(
    (presetId = 'overview') => {
      const mappedId = DAWN_ISLAND_FOR_PRESET[presetId] ?? 'dawn-island';
      const matchingIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === mappedId);
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('dawn-island', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveGoat = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'goat-island'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('goat-island', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveShellsTown = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'shells-town'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('shells-town', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveOrgan = useCallback(
    (presetId = 'overview') => {
      const mappedId = ORGAN_ISLAND_FOR_PRESET[presetId] ?? 'organ-island';
      const matchingIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === mappedId);
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('organ-island', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveShimotsuki = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'shimotsuki'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('shimotsuki', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveBaratie = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === 'baratie');
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('baratie', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveReverseMountain = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'reverse-mountain'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('reverse-mountain', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveTwinCape = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === 'twin-cape');
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('twin-cape', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveLittleGarden = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'little-garden'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('little-garden', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveCactus = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'cactus-island'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('cactus-island', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveDrum = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'drum-island'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('drum-island', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveJaya = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === 'jaya');
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id || prev?.id === 'mock-town'
            ? prev
            : matchingIsland
        );
      }
      commitIslandDive('jaya', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveLongRing = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'long-ring-long-land'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('long-ring-long-land', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveShiftStation = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'shift-station'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('shift-station', presetId);
    },
    [commitIslandDive]
  );

  const handleDivePucci = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'pucci-island'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('pucci-island', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveSanFaldo = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'san-faldo'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('san-faldo', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveStPoplar = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'st-poplar'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('st-poplar', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveEniesLobby = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'enies-lobby'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('enies-lobby', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveAmazonLily = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'amazon-lily'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('amazon-lily', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveThrillerBark = useCallback(
    (presetId: string) => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'thriller-bark'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('thriller-bark', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveSabaody = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'sabaody'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('sabaody', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveMaryGeoise = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'mary-geoise'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('mary-geoise', presetId);
    },
    [commitIslandDive]
  );

  const handleDivePunkHazard = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'punk-hazard'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('punk-hazard', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveDressrosa = useCallback(
    (presetId = 'overview') => {
      const mappedId = DRESSROSA_ISLAND_FOR_PRESET[presetId] ?? 'dressrosa';
      const matchingIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === mappedId);
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('dressrosa', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveTottoLand = useCallback(
    (presetId = 'overview') => {
      const mappedId =
        TOTTO_LAND_ISLAND_FOR_PRESET[presetId] ?? 'whole-cake-island';
      const matchingIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === mappedId);
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('whole-cake-island', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveZou = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === 'zou');
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('zou', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveWano = useCallback(
    (presetId = 'overview') => {
      const mappedId = WANO_ISLAND_FOR_PRESET[presetId] ?? 'wano';
      const matchingIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === mappedId);
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('wano', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveEgghead = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'egghead-island'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('egghead-island', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveElbaf = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === 'elbaf');
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('elbaf', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveImpelDown = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'impel-down'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('impel-down', presetId);
    },
    [commitIslandDive]
  );

  const handleDiveFishMan = useCallback(
    (presetId = 'overview') => {
      const matchingIsland = ONE_PIECE_LOCATIONS.find(
        (i) => i.id === 'fish-man-island'
      );
      if (matchingIsland) {
        setSelectedIsland((prev) =>
          prev?.id === matchingIsland.id ? prev : matchingIsland
        );
      }
      commitIslandDive('fish-man-island', presetId);
    },
    [commitIslandDive]
  );

  const handleSunnyAction = useCallback(
    (action: 'resurface' | 'boost') => {
      if (action === 'resurface') {
        audioEngineRef.current?.playSfx('sfx-subsea-dive', 0.95, 300);
      }
      setSunnyActionSignal((prev) => ({
        action,
        trigger: (prev?.trigger ?? 0) + 1,
      }));
    },
    []
  );

  const handleUploadMapFile = useCallback((file: File) => {
    audioEngineRef.current?.playSfx('ui-menu-click', 0.9, 80);
    if (uploadedObjectUrlRef.current) {
      URL.revokeObjectURL(uploadedObjectUrlRef.current);
    }
    const nextUrl = URL.createObjectURL(file);
    uploadedObjectUrlRef.current = nextUrl;
    setMapError(null);
    setMapSourceUrl(nextUrl);
  }, []);

  const handleMapLoadStateChange = useCallback(
    (loading: boolean, error: string | null) => {
      setIsLoadingMap(loading);
      setMapError(error);
    },
    []
  );

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-[#030712]"
      data-app-mode={appMode}
      data-preloaded-count={preloadedCount}
      data-view-mode={sailingActive ? 'sailing' : 'globe'}
      data-sailing-mode={sailingActive ? 'active' : 'inactive'}
      data-sailing-loading={sailingPreparing ? 'true' : 'false'}
      data-sunny-camera={sunnyCameraMode}
      data-sunny-collided={sunnyTelemetry.collided ? 'true' : 'false'}
      data-calm-belt-blocked={sunnyTelemetry.calmBeltBlocked ? 'true' : 'false'}
      data-in-reverse-canal={
        sunnyTelemetry.inReverseMountainCanal ? 'true' : 'false'
      }
      data-rm-phase={sunnyTelemetry.reverseMountainPhase ?? 'none'}
      data-sunny-sky-zone={sunnyTelemetry.skyZone}
      data-balloon-deploy={Math.round(sunnyTelemetry.balloonDeploy * 100)}
      data-kus-progress={Math.round(sunnyTelemetry.knockUpStreamProgress * 100)}
      data-sunny-coated={sunnyTelemetry.coated ? 'true' : 'false'}
      data-subsea-blocked={sunnyTelemetry.coatingRequiredBlocked ? 'true' : 'false'}
      data-subsea-progress={Math.round(sunnyTelemetry.subseaDiveProgress * 100)}
      data-sunny-elevation={sunnyTelemetry.elevationMeters}
      data-sunny-pitch={sunnyTelemetry.pitchDeg}
      data-log-pose-target={mugiwaraTargetIsland?.id ?? 'none'}
      data-sunny-orbit-yaw={Math.round(sunnyTelemetry.orbitYawDeg)}
      data-sunny-orbit-pitch={Math.round(sunnyTelemetry.orbitPitchDeg)}
      data-loaded-islands={loadedIslands.join(',')}
      data-loading-islands={loadingIslands.map((i) => i.id).join(',')}
      data-alabasta-preset={
        diveTarget?.island === 'alabasta' ? diveTarget.presetId : 'none'
      }
      data-skypiea-preset={
        diveTarget?.island === 'skypiea' ? diveTarget.presetId : 'none'
      }
      data-water7-preset={
        diveTarget?.island === 'water-7' ? diveTarget.presetId : 'none'
      }
      data-marineford-preset={
        diveTarget?.island === 'marineford' ? diveTarget.presetId : 'none'
      }
      data-polestar-preset={
        diveTarget?.island === 'polestar-islands' ? diveTarget.presetId : 'none'
      }
      data-conomi-preset={
        diveTarget?.island === 'conomi-islands' ? diveTarget.presetId : 'none'
      }
      data-gecko-preset={
        diveTarget?.island === 'gecko-islands' ? diveTarget.presetId : 'none'
      }
      data-dawn-preset={
        diveTarget?.island === 'dawn-island' ? diveTarget.presetId : 'none'
      }
      data-goat-preset={
        diveTarget?.island === 'goat-island' ? diveTarget.presetId : 'none'
      }
      data-shells-preset={
        diveTarget?.island === 'shells-town' ? diveTarget.presetId : 'none'
      }
      data-organ-preset={
        diveTarget?.island === 'organ-island' ? diveTarget.presetId : 'none'
      }
      data-shimotsuki-preset={
        diveTarget?.island === 'shimotsuki' ? diveTarget.presetId : 'none'
      }
      data-baratie-preset={
        diveTarget?.island === 'baratie' ? diveTarget.presetId : 'none'
      }
      data-twin-cape-preset={
        diveTarget?.island === 'twin-cape' ? diveTarget.presetId : 'none'
      }
      data-little-garden-preset={
        diveTarget?.island === 'little-garden' ? diveTarget.presetId : 'none'
      }
      data-cactus-preset={
        diveTarget?.island === 'cactus-island' ? diveTarget.presetId : 'none'
      }
      data-drum-preset={
        diveTarget?.island === 'drum-island' ? diveTarget.presetId : 'none'
      }
      data-jaya-preset={
        diveTarget?.island === 'jaya' ? diveTarget.presetId : 'none'
      }
      data-long-ring-preset={
        diveTarget?.island === 'long-ring-long-land' ? diveTarget.presetId : 'none'
      }
      data-shift-preset={
        diveTarget?.island === 'shift-station' ? diveTarget.presetId : 'none'
      }
      data-pucci-preset={
        diveTarget?.island === 'pucci-island' ? diveTarget.presetId : 'none'
      }
      data-san-faldo-preset={
        diveTarget?.island === 'san-faldo' ? diveTarget.presetId : 'none'
      }
      data-st-poplar-preset={
        diveTarget?.island === 'st-poplar' ? diveTarget.presetId : 'none'
      }
      data-enies-preset={
        diveTarget?.island === 'enies-lobby' ? diveTarget.presetId : 'none'
      }
      data-amazon-lily-preset={
        diveTarget?.island === 'amazon-lily' ? diveTarget.presetId : 'none'
      }
      data-thriller-bark-preset={
        diveTarget?.island === 'thriller-bark' ? diveTarget.presetId : 'none'
      }
      data-sabaody-preset={
        diveTarget?.island === 'sabaody' ? diveTarget.presetId : 'none'
      }
      data-mary-geoise-preset={
        diveTarget?.island === 'mary-geoise' ? diveTarget.presetId : 'none'
      }
      data-impel-down-preset={
        diveTarget?.island === 'impel-down' ? diveTarget.presetId : 'none'
      }
      data-fish-man-preset={
        diveTarget?.island === 'fish-man-island' ? diveTarget.presetId : 'none'
      }
      data-punk-hazard-preset={
        diveTarget?.island === 'punk-hazard' ? diveTarget.presetId : 'none'
      }
      data-dressrosa-preset={
        diveTarget?.island === 'dressrosa' ? diveTarget.presetId : 'none'
      }
      data-totto-land-preset={
        diveTarget?.island === 'whole-cake-island' ? diveTarget.presetId : 'none'
      }
      data-zou-preset={
        diveTarget?.island === 'zou' ? diveTarget.presetId : 'none'
      }
      data-wano-preset={
        diveTarget?.island === 'wano' ? diveTarget.presetId : 'none'
      }
      data-egghead-preset={
        diveTarget?.island === 'egghead-island' ? diveTarget.presetId : 'none'
      }
      data-elbaf-preset={
        diveTarget?.island === 'elbaf' ? diveTarget.presetId : 'none'
      }
      data-selected-island={selectedIsland?.id ?? 'none'}
      data-cloud-cover={Math.round(cloudCover * 100)}
      data-labels={showLabels ? 'visible' : 'hidden'}
      data-music-enabled={musicEnabled ? 'true' : 'false'}
      data-sound-volume={Math.round(soundVolume * 100)}
    >
      <OnePieceGlobe
        mapSourceUrl={mapSourceUrl}
        selectedIsland={selectedIsland}
        onSelectIsland={handleSelectIsland}
        showLabels={showLabels}
        cloudCover={cloudCover}
        timeOfDay={timeOfDay}
        resetSignal={resetSignal}
        diveTarget={diveTarget}
        sailingActive={sailingActive}
        sunnyCameraMode={sunnyCameraMode}
        sunnyControlRef={sunnyControlRef}
        sunnyWarpTarget={sunnyWarpTarget}
        sunnyActionSignal={sunnyActionSignal}
        mugiwaraTargetIsland={mugiwaraTargetIsland}
        onSunnyTelemetry={handleSunnyTelemetry}
        onSailingPreparingChange={setSailingPreparing}
        onLoadedIslandsChange={setLoadedIslands}
        onLoadingIslandsChange={setLoadingIslands}
        isPaused={Boolean(menuModal)}
        titleScreenActive={
          appMode === 'loading' || appMode === 'title' || appMode === 'quit'
        }
        loadingScreenActive={appMode === 'loading'}
        retryLoadSignal={retryLoadSignal}
        onPreloadProgressChange={handlePreloadProgressChange}
        onPreloadStatusChange={setPreloadStatus}
        onStartupPreloadComplete={handleStartupPreloadComplete}
        onMapLoadStateChange={handleMapLoadStateChange}
        onWorldAudioUpdate={handleWorldAudioUpdate}
        onPlayAudioSfx={handlePlayAudioSfx}
      />

      {(appMode === 'atlas' || appMode === 'voyage') && (
        <GlobeHUD
          selectedIsland={selectedIsland}
          onSelectIsland={handleSelectIsland}
          activeDiveIsland={diveTarget?.island ?? null}
          activeDivePresetId={diveTarget?.presetId ?? null}
          onDiveAlabasta={handleDiveAlabasta}
          onDiveSkypiea={handleDiveSkypiea}
          onDiveWater7={handleDiveWater7}
          onDiveMarineford={handleDiveMarineford}
          onDiveLoguetown={handleDiveLoguetown}
          onDiveConomi={handleDiveConomi}
          onDiveGecko={handleDiveGecko}
          onDiveDawn={handleDiveDawn}
          onDiveGoat={handleDiveGoat}
          onDiveShellsTown={handleDiveShellsTown}
          onDiveOrgan={handleDiveOrgan}
          onDiveShimotsuki={handleDiveShimotsuki}
          onDiveBaratie={handleDiveBaratie}
          onDiveReverseMountain={handleDiveReverseMountain}
          onDiveTwinCape={handleDiveTwinCape}
          onDiveLittleGarden={handleDiveLittleGarden}
          onDiveCactus={handleDiveCactus}
          onDiveDrum={handleDiveDrum}
          onDiveJaya={handleDiveJaya}
          onDiveLongRing={handleDiveLongRing}
          onDiveShiftStation={handleDiveShiftStation}
          onDivePucci={handleDivePucci}
          onDiveSanFaldo={handleDiveSanFaldo}
          onDiveStPoplar={handleDiveStPoplar}
          onDiveEniesLobby={handleDiveEniesLobby}
          onDiveAmazonLily={handleDiveAmazonLily}
          onDiveThrillerBark={handleDiveThrillerBark}
          onDiveSabaody={handleDiveSabaody}
          onDiveMaryGeoise={handleDiveMaryGeoise}
          onDiveImpelDown={handleDiveImpelDown}
          onDiveFishMan={handleDiveFishMan}
          onDivePunkHazard={handleDivePunkHazard}
          onDiveDressrosa={handleDiveDressrosa}
          onDiveTottoLand={handleDiveTottoLand}
          onDiveZou={handleDiveZou}
          onDiveWano={handleDiveWano}
          onDiveEgghead={handleDiveEgghead}
          onDiveElbaf={handleDiveElbaf}
          onSunnyAction={handleSunnyAction}
          showLabels={showLabels}
          onToggleLabels={() => {
            audioEngineRef.current?.playSfx('ui-menu-click', 0.8, 80);
            setShowLabels((v) => !v);
          }}
          cloudCover={cloudCover}
          onChangeCloudCover={setCloudCover}
          timeOfDay={timeOfDay}
          onChangeTimeOfDay={setTimeOfDay}
          onResetView={handleResetView}
          onUploadMapFile={handleUploadMapFile}
          isLoadingMap={isLoadingMap}
          loadingIslands={loadingIslands}
          mapError={mapError}
          onDismissError={() => {
            audioEngineRef.current?.playSfx('ui-menu-click', 0.75, 80);
            setMapError(null);
          }}
          sailingActive={sailingActive}
          sailingPreparing={sailingPreparing}
          onToggleSailing={handleToggleSailing}
          onSailAtIsland={handleSailAtIsland}
          sunnyCameraMode={sunnyCameraMode}
          onChangeSunnyCameraMode={(mode) => {
            audioEngineRef.current?.playSfx('ui-menu-click', 0.8, 80);
            setSunnyCameraMode(mode);
          }}
          sunnyTelemetry={sunnyTelemetry}
          sunnyControlRef={sunnyControlRef}
          mugiwaraRouteIslands={mugiwaraRouteIslands}
          mugiwaraRouteIndex={mugiwaraRouteIndex}
          mugiwaraArrivedNotice={mugiwaraArrivedNotice}
          onPrevMugiwaraStage={handlePrevMugiwaraStage}
          onNextMugiwaraStage={handleNextMugiwaraStage}
          musicEnabled={musicEnabled}
          onToggleMusic={handleToggleMusic}
          soundVolume={soundVolume}
          onChangeSoundVolume={handleChangeSoundVolume}
          onPlayUiSound={handlePlayAudioSfx}
          onOpenSettings={() => {
            audioEngineRef.current?.playSfx('ui-modal-open', 0.9, 80);
            setMenuModal('settings');
          }}
          onReturnToMenu={handleReturnToMenu}
        />
      )}

      {appMode === 'loading' && (
        <LoadingScreenOverlay
          preloadState={preloadStatus}
          error={mapError}
          onRetry={handleRetryStartupLoad}
        />
      )}

      {(appMode === 'title' || appMode === 'quit' || menuModal !== null) && (
        <StartMenuOverlay
          mode={appMode}
          activeModal={menuModal}
          onStartAtlas={handleMenuStartAtlas}
          onStartVoyage={handleMenuStartVoyage}
          onOpenJournal={() => {
            audioEngineRef.current?.playSfx('ui-modal-open', 0.9, 80);
            setMenuModal('journal');
          }}
          onOpenSettings={() => {
            audioEngineRef.current?.playSfx('ui-modal-open', 0.9, 80);
            setMenuModal('settings');
          }}
          onQuit={() => {
            audioEngineRef.current?.playSfx('ui-modal-close', 0.9, 80);
            setMenuModal(null);
            setAppMode('quit');
          }}
          onResumeFromQuit={() => {
            audioEngineRef.current?.playSfx('ui-start-voyage', 0.85, 100);
            setAppMode('title');
          }}
          onCloseModal={() => {
            audioEngineRef.current?.playSfx('ui-modal-close', 0.85, 80);
            setMenuModal(null);
          }}
          selectedIsland={selectedIsland}
          onObserveIslandOnAtlas={handleJournalObserveIsland}
          onSailToIsland={handleJournalSailToIsland}
          timeOfDay={timeOfDay}
          onChangeTimeOfDay={setTimeOfDay}
          cloudCover={cloudCover}
          onChangeCloudCover={setCloudCover}
          showLabels={showLabels}
          onToggleLabels={() => {
            audioEngineRef.current?.playSfx('ui-menu-click', 0.8, 80);
            setShowLabels((v) => !v);
          }}
          sunnyCameraMode={sunnyCameraMode}
          onChangeSunnyCameraMode={(mode) => {
            audioEngineRef.current?.playSfx('ui-menu-click', 0.8, 80);
            setSunnyCameraMode(mode);
          }}
          musicEnabled={musicEnabled}
          onToggleMusic={handleToggleMusic}
          soundVolume={soundVolume}
          onChangeSoundVolume={handleChangeSoundVolume}
          onPlayUiSound={handlePlayAudioSfx}
          onUploadMapFile={handleUploadMapFile}
          onResetSettings={handleResetSettings}
        />
      )}
    </main>
  );
}
