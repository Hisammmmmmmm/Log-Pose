import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cloud,
  Compass,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  Music,
  Navigation,
  RotateCcw,
  Search,
  Settings,
  Ship,
  Upload,
  Volume1,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  formatIslandLoadingLabel,
  isSelectedIslandLoading,
  type LoadingIslandInfo,
} from '../utils/islandLoading';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import { ALABASTA_CAMERA_PRESETS } from '../utils/alabastaTerrain';
import { SKYPIEA_CAMERA_PRESETS } from '../utils/skypieaTerrain';
import { WATER7_CAMERA_PRESETS } from '../utils/water7Terrain';
import { MARINEFORD_CAMERA_PRESETS } from '../utils/marinefordTerrain';
import { LOGUETOWN_CAMERA_PRESETS } from '../utils/loguetownTerrain';
import { CONOMI_CAMERA_PRESETS } from '../utils/conomiTerrain';
import { GECKO_CAMERA_PRESETS } from '../utils/geckoTerrain';
import { DAWN_CAMERA_PRESETS } from '../utils/dawnTerrain';
import { GOAT_CAMERA_PRESETS } from '../utils/goatTerrain';
import { SHELLS_CAMERA_PRESETS } from '../utils/shellsTownTerrain';
import { ORGAN_CAMERA_PRESETS } from '../utils/organTerrain';
import { SHIMOTSUKI_CAMERA_PRESETS } from '../utils/shimotsukiTerrain';
import { BARATIE_CAMERA_PRESETS } from '../utils/baratieTerrain';
import { RM_CAMERA_PRESETS } from '../utils/reverseMountainTerrain';
import { TWIN_CAPE_CAMERA_PRESETS } from '../utils/twinCapeTerrain';
import { LITTLE_GARDEN_CAMERA_PRESETS } from '../utils/littleGardenTerrain';
import { CACTUS_CAMERA_PRESETS } from '../utils/cactusTerrain';
import { DRUM_CAMERA_PRESETS } from '../utils/drumTerrain';
import { JAYA_CAMERA_PRESETS } from '../utils/jayaTerrain';
import { LONG_RING_CAMERA_PRESETS } from '../utils/longRingTerrain';
import {
  PUCCI_CAMERA_PRESETS,
  SAN_FALDO_CAMERA_PRESETS,
  SHIFT_CAMERA_PRESETS,
  ST_POPLAR_CAMERA_PRESETS,
} from '../utils/seaTrainStationsTerrain';
import { ENIES_CAMERA_PRESETS } from '../utils/eniesLobbyTerrain';
import { IMPEL_DOWN_CAMERA_PRESETS } from '../utils/impelDownTerrain';
import { AMAZON_LILY_CAMERA_PRESETS } from '../utils/amazonLilyTerrain';
import { THRILLER_BARK_CAMERA_PRESETS } from '../utils/thrillerBarkTerrain';
import { SABAODY_CAMERA_PRESETS } from '../utils/sabaodyTerrain';
import { MARY_GEOISE_CAMERA_PRESETS } from '../utils/maryGeoiseTerrain';
import { FISH_MAN_CAMERA_PRESETS } from '../utils/fishManIslandTerrain';
import { PUNK_HAZARD_CAMERA_PRESETS } from '../utils/punkHazardTerrain';
import { DRESSROSA_CAMERA_PRESETS } from '../utils/dressrosaTerrain';
import {
  TOTTO_LAND_CAMERA_PRESETS,
  TOTTO_LAND_SUB_LOCATIONS,
} from '../utils/tottoLandTerrain';
import { ZOU_CAMERA_PRESETS } from '../utils/zouTerrain';
import {
  WANO_CAMERA_PRESETS,
  WANO_SUB_LOCATIONS,
} from '../utils/wanoTerrain';
import {
  EGGHEAD_CAMERA_PRESETS,
  EGGHEAD_SUB_LOCATIONS,
} from '../utils/eggheadTerrain';
import {
  ELBAF_CAMERA_PRESETS,
  ELBAF_SUB_LOCATIONS,
} from '../utils/elbafTerrain';
import {
  filterIslands,
  formatCloudCover,
  formatHour,
  formatLatLon,
  type IslandLocation,
  type SeaRegion,
} from '../utils/globeMath';
import type { SunnyTelemetry } from './OnePieceGlobe';
import type {
  SunnyCameraMode,
  SunnyControlInput,
} from '../utils/sunnyNavigation';
import type { SfxSoundId, UiSoundId } from '../utils/gameAudio';
import {
  LogPoseWidget,
  MiniMapWidget,
  NavigationLoadingOverlay,
} from './NavigationWidgets';

export interface GlobeHUDProps {
  selectedIsland: IslandLocation | null;
  onSelectIsland: (island: IslandLocation | null) => void;
  activeDiveIsland:
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
    | 'elbaf'
    | null;
  activeDivePresetId: string | null;
  onDiveAlabasta: (presetId: string) => void;
  onDiveSkypiea: (presetId: string) => void;
  onDiveWater7: (presetId: string) => void;
  onDiveMarineford: (presetId: string) => void;
  onDiveLoguetown: (presetId: string) => void;
  onDiveConomi: (presetId: string) => void;
  onDiveGecko: (presetId: string) => void;
  onDiveDawn: (presetId: string) => void;
  onDiveGoat: (presetId: string) => void;
  onDiveShellsTown: (presetId: string) => void;
  onDiveOrgan: (presetId: string) => void;
  onDiveShimotsuki: (presetId: string) => void;
  onDiveBaratie: (presetId: string) => void;
  onDiveReverseMountain: (presetId: string) => void;
  onDiveTwinCape: (presetId: string) => void;
  onDiveLittleGarden: (presetId: string) => void;
  onDiveCactus: (presetId: string) => void;
  onDiveDrum: (presetId: string) => void;
  onDiveJaya: (presetId: string) => void;
  onDiveLongRing: (presetId: string) => void;
  onDiveShiftStation: (presetId: string) => void;
  onDivePucci: (presetId: string) => void;
  onDiveSanFaldo: (presetId: string) => void;
  onDiveStPoplar: (presetId: string) => void;
  onDiveEniesLobby: (presetId: string) => void;
  onDiveAmazonLily: (presetId: string) => void;
  onDiveThrillerBark: (presetId: string) => void;
  onDiveSabaody: (presetId: string) => void;
  onDiveMaryGeoise: (presetId: string) => void;
  onDiveImpelDown: (presetId: string) => void;
  onDiveFishMan: (presetId: string) => void;
  onDivePunkHazard: (presetId: string) => void;
  onDiveDressrosa: (presetId: string) => void;
  onDiveTottoLand: (presetId: string) => void;
  onDiveZou: (presetId: string) => void;
  onDiveWano: (presetId: string) => void;
  onDiveEgghead: (presetId: string) => void;
  onDiveElbaf: (presetId: string) => void;
  onSunnyAction: (action: 'resurface' | 'boost') => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  cloudCover: number;
  onChangeCloudCover: (cover: number) => void;
  timeOfDay: number;
  onChangeTimeOfDay: (hour: number) => void;
  onResetView: () => void;
  onUploadMapFile: (file: File) => void;
  isLoadingMap: boolean;
  loadingIslands: readonly LoadingIslandInfo[];
  mapError: string | null;
  onDismissError: () => void;
  sailingActive: boolean;
  sailingPreparing: boolean;
  onToggleSailing: () => void;
  onSailAtIsland: (island: IslandLocation) => void;
  sunnyCameraMode: SunnyCameraMode;
  onChangeSunnyCameraMode: (mode: SunnyCameraMode) => void;
  sunnyTelemetry: SunnyTelemetry;
  sunnyControlRef: React.MutableRefObject<SunnyControlInput>;
  mugiwaraRouteIslands: readonly IslandLocation[];
  mugiwaraRouteIndex: number;
  mugiwaraArrivedNotice: string | null;
  onPrevMugiwaraStage: () => void;
  onNextMugiwaraStage: () => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  soundVolume: number;
  onChangeSoundVolume: (volume: number) => void;
  onPlayUiSound?: (id: SfxSoundId | UiSoundId, intensity?: number, cooldownMs?: number) => void;
  onOpenSettings?: () => void;
  onReturnToMenu?: () => void;
}

const ALABASTA_ISLAND_IDS = new Set([
  'alabasta',
  'alubarna',
  'rainbase',
  'nanohana',
  'elumalu',
  'tamarisk',
]);

const SKYPIEA_ISLAND_IDS = new Set([
  'skypiea',
  'upper-yard',
  'angel-island',
  'hidden-cloud-village',
]);

const CONOMI_ISLAND_IDS = new Set([
  'conomi-islands',
  'arlong-park',
  'cocoyashi-village',
  'gosa-village',
]);

const GECKO_ISLAND_IDS = new Set([
  'gecko-islands',
  'syrup-village',
  'honey-town',
  'black-cat-beach',
]);

const DAWN_ISLAND_IDS = new Set([
  'dawn-island',
  'foosha-village',
  'goa-kingdom',
]);

const SHELLS_ISLAND_IDS = new Set([
  'shells-town',
  'yotsuba-island',
]);

const ORGAN_ISLAND_IDS = new Set([
  'organ-island',
  'orange-town',
]);

const JAYA_ISLAND_IDS = new Set([
  'jaya',
  'mock-town',
]);

const DRESSROSA_ISLAND_IDS = new Set([
  'dressrosa',
  'green-bit',
  'acacia',
  'corrida-colosseum',
  'royal-palace-dressrosa',
  'flower-hill',
]);

const TOTTO_LAND_ISLAND_IDS = new Set(Object.keys(TOTTO_LAND_SUB_LOCATIONS));

const WANO_ISLAND_IDS = new Set(Object.keys(WANO_SUB_LOCATIONS));

const REGION_FILTERS: readonly (SeaRegion | 'All')[] = [
  'All',
  'Paradise',
  'New World',
  'Red Line',
  'East Blue',
  'West Blue',
  'North Blue',
  'South Blue',
  'Calm Belt',
];

const FEATURED_SEARCH_IDS = [
  'fish-man-island',
  'mary-geoise',
  'sabaody',
  'impel-down',
  'thriller-bark',
  'amazon-lily',
  'enies-lobby',
  'water-7',
  'shift-station',
  'pucci-island',
  'san-faldo',
  'st-poplar',
  'long-ring-long-land',
  'jaya',
  'mock-town',
  'drum-island',
  'cactus-island',
  'little-garden',
  'twin-cape',
  'baratie',
  'shimotsuki',
  'organ-island',
  'orange-town',
  'shells-town',
  'yotsuba-island',
  'goat-island',
  'dawn-island',
  'gecko-islands',
  'conomi-islands',
  'polestar-islands',
  'skypiea',
  'alabasta',
  'wano',
  'marineford',
  'dressrosa',
  'green-bit',
  'whole-cake-island',
  'cacao-island',
  'cheese-island',
  'zou',
  'egghead-island',
  'elbaf',
] as const;

const HUMAN_EXPLORABLE_IDS = new Set([
  ...Object.keys(TOTTO_LAND_SUB_LOCATIONS),
  ...Object.keys(WANO_SUB_LOCATIONS),
  ...Object.keys(EGGHEAD_SUB_LOCATIONS),
  ...Object.keys(ELBAF_SUB_LOCATIONS),
  'zou',
  'dressrosa',
  'green-bit',
  'acacia',
  'corrida-colosseum',
  'royal-palace-dressrosa',
  'flower-hill',
  'punk-hazard',
  'fish-man-island',
  'mary-geoise',
  'sabaody',
  'impel-down',
  'thriller-bark',
  'amazon-lily',
  'enies-lobby',
  'shift-station',
  'pucci-island',
  'san-faldo',
  'st-poplar',
  'long-ring-long-land',
  'jaya',
  'mock-town',
  'drum-island',
  'cactus-island',
  'little-garden',
  'baratie',
  'shimotsuki',
  'organ-island',
  'orange-town',
  'shells-town',
  'yotsuba-island',
  'goat-island',
  'dawn-island',
  'foosha-village',
  'goa-kingdom',
  'gecko-islands',
  'syrup-village',
  'honey-town',
  'black-cat-beach',
  'conomi-islands',
  'arlong-park',
  'cocoyashi-village',
  'gosa-village',
  'polestar-islands',
  'reverse-mountain',
  'twin-cape',
  'marineford',
  'water-7',
  'skypiea',
  'upper-yard',
  'angel-island',
  'hidden-cloud-village',
  'alabasta',
  'alubarna',
  'rainbase',
  'nanohana',
  'elumalu',
  'tamarisk',
]);

export function GlobeHUD({
  selectedIsland,
  onSelectIsland,
  activeDiveIsland,
  activeDivePresetId,
  onDiveAlabasta,
  onDiveSkypiea,
  onDiveWater7,
  onDiveMarineford,
  onDiveLoguetown,
  onDiveConomi,
  onDiveGecko,
  onDiveDawn,
  onDiveGoat,
  onDiveShellsTown,
  onDiveOrgan,
  onDiveShimotsuki,
  onDiveBaratie,
  onDiveReverseMountain,
  onDiveTwinCape,
  onDiveLittleGarden,
  onDiveCactus,
  onDiveDrum,
  onDiveJaya,
  onDiveLongRing,
  onDiveShiftStation,
  onDivePucci,
  onDiveSanFaldo,
  onDiveStPoplar,
  onDiveEniesLobby,
  onDiveAmazonLily,
  onDiveThrillerBark,
  onDiveSabaody,
  onDiveMaryGeoise,
  onDiveImpelDown,
  onDiveFishMan,
  onDivePunkHazard,
  onDiveDressrosa,
  onDiveTottoLand,
  onDiveZou,
  onDiveWano,
  onDiveEgghead,
  onDiveElbaf,
  onSunnyAction,
  showLabels,
  onToggleLabels,
  cloudCover,
  onChangeCloudCover,
  timeOfDay,
  onChangeTimeOfDay,
  onResetView,
  onUploadMapFile,
  isLoadingMap,
  loadingIslands,
  mapError,
  onDismissError,
  sailingActive,
  sailingPreparing,
  onToggleSailing,
  onSailAtIsland,
  sunnyCameraMode,
  onChangeSunnyCameraMode,
  sunnyTelemetry,
  sunnyControlRef,
  mugiwaraRouteIslands,
  mugiwaraRouteIndex,
  mugiwaraArrivedNotice,
  onPrevMugiwaraStage,
  onNextMugiwaraStage,
  musicEnabled,
  onToggleMusic,
  soundVolume,
  onChangeSoundVolume,
  onPlayUiSound,
  onOpenSettings,
  onReturnToMenu,
}: GlobeHUDProps) {
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(() => sailingActive);
  const [headerCollapsed, setHeaderCollapsed] = useState(() => sailingActive);
  const [loreCollapsed, setLoreCollapsed] = useState(false);
  const [helmCollapsed, setHelmCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<SeaRegion | 'All'>('All');
  const [dockSearchQuery, setDockSearchQuery] = useState('');
  const [dockSearchOpen, setDockSearchOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dockSearchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (sailingActive) {
      setHeaderCollapsed(true);
      setHelmCollapsed(true);
      setDockCollapsed(true);
      setDirectoryOpen(false);
      setDockSearchOpen(false);
    } else {
      setHeaderCollapsed(false);
      setDockCollapsed(false);
      sunnyControlRef.current.throttle = 0;
      sunnyControlRef.current.steer = 0;
      sunnyControlRef.current.boost = false;
    }
  }, [sailingActive, sunnyControlRef]);

  const setControlThrottle = (val: number) => {
    sunnyControlRef.current.throttle = Math.max(0, val);
  };
  const setControlSteer = (val: number) => {
    sunnyControlRef.current.steer = val;
  };
  const boostState: 'active' | 'cooldown' | 'ready' = sunnyTelemetry.boostActive
    ? 'active'
    : sunnyTelemetry.boostCooldownSec > 0
      ? 'cooldown'
      : 'ready';

  useEffect(() => {
    const onOutsidePointer = (e: PointerEvent) => {
      if (
        dockSearchRef.current &&
        !dockSearchRef.current.contains(e.target as Node)
      ) {
        setDockSearchOpen(false);
      }
    };
    window.addEventListener('pointerdown', onOutsidePointer);
    return () => window.removeEventListener('pointerdown', onOutsidePointer);
  }, []);

  const filteredLocations = useMemo(
    () => filterIslands(ONE_PIECE_LOCATIONS, searchQuery, regionFilter),
    [searchQuery, regionFilter]
  );

  const dockSearchResults = useMemo(() => {
    const trimmed = dockSearchQuery.trim();
    if (!trimmed) {
      return FEATURED_SEARCH_IDS.map((id) =>
        ONE_PIECE_LOCATIONS.find((loc) => loc.id === id)
      ).filter((loc): loc is IslandLocation => Boolean(loc));
    }
    const q = trimmed.toLowerCase();
    const matches = filterIslands(ONE_PIECE_LOCATIONS, trimmed, 'All');
    const scoreMatch = (loc: IslandLocation): number => {
      const name = loc.name.toLowerCase();
      if (name === q) return 0;
      if (name.startsWith(q)) return 1;
      if (name.includes(q)) return 2;
      if (loc.subtitle.toLowerCase().includes(q)) return 3;
      return 4;
    };
    return [...matches].sort((a, b) => scoreMatch(a) - scoreMatch(b)).slice(0, 8);
  }, [dockSearchQuery]);

  const handleSelectFromDockSearch = (island: IslandLocation) => {
    onSelectIsland(island);
    setDockSearchQuery('');
    setDockSearchOpen(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleCycleIsland = (dir: -1 | 1) => {
    if (!selectedIsland) {
      onSelectIsland(ONE_PIECE_LOCATIONS[0]);
      return;
    }
    const idx = ONE_PIECE_LOCATIONS.findIndex(
      (i) => i.id === selectedIsland.id
    );
    const nextIdx =
      (idx + dir + ONE_PIECE_LOCATIONS.length) % ONE_PIECE_LOCATIONS.length;
    onSelectIsland(ONE_PIECE_LOCATIONS[nextIdx]);
  };

  const isAlabastaSelected =
    selectedIsland !== null && ALABASTA_ISLAND_IDS.has(selectedIsland.id);
  const isSkypieaSelected =
    selectedIsland !== null && SKYPIEA_ISLAND_IDS.has(selectedIsland.id);
  const isWater7Selected = selectedIsland?.id === 'water-7';
  const isMarinefordSelected = selectedIsland?.id === 'marineford';
  const isPolestarSelected = selectedIsland?.id === 'polestar-islands';
  const isConomiSelected =
    selectedIsland !== null && CONOMI_ISLAND_IDS.has(selectedIsland.id);
  const isGeckoSelected =
    selectedIsland !== null && GECKO_ISLAND_IDS.has(selectedIsland.id);
  const isDawnSelected =
    selectedIsland !== null && DAWN_ISLAND_IDS.has(selectedIsland.id);
  const isGoatSelected = selectedIsland?.id === 'goat-island';
  const isShellsSelected =
    selectedIsland !== null && SHELLS_ISLAND_IDS.has(selectedIsland.id);
  const isOrganSelected =
    selectedIsland !== null && ORGAN_ISLAND_IDS.has(selectedIsland.id);
  const isShimotsukiSelected = selectedIsland?.id === 'shimotsuki';
  const isBaratieSelected = selectedIsland?.id === 'baratie';
  const isReverseMountainSelected = selectedIsland?.id === 'reverse-mountain';
  const isTwinCapeSelected = selectedIsland?.id === 'twin-cape';
  const isLittleGardenSelected = selectedIsland?.id === 'little-garden';
  const isCactusSelected = selectedIsland?.id === 'cactus-island';
  const isDrumSelected = selectedIsland?.id === 'drum-island';
  const isJayaSelected =
    selectedIsland !== null && JAYA_ISLAND_IDS.has(selectedIsland.id);
  const isLongRingSelected = selectedIsland?.id === 'long-ring-long-land';
  const isShiftSelected = selectedIsland?.id === 'shift-station';
  const isPucciSelected = selectedIsland?.id === 'pucci-island';
  const isSanFaldoSelected = selectedIsland?.id === 'san-faldo';
  const isStPoplarSelected = selectedIsland?.id === 'st-poplar';
  const isEniesSelected = selectedIsland?.id === 'enies-lobby';
  const isImpelDownSelected = selectedIsland?.id === 'impel-down';
  const isAmazonLilySelected = selectedIsland?.id === 'amazon-lily';
  const isThrillerBarkSelected = selectedIsland?.id === 'thriller-bark';
  const isSabaodySelected = selectedIsland?.id === 'sabaody';
  const isMaryGeoiseSelected = selectedIsland?.id === 'mary-geoise';
  const isFishManSelected = selectedIsland?.id === 'fish-man-island';
  const isPunkHazardSelected = selectedIsland?.id === 'punk-hazard';
  const isDressrosaSelected =
    selectedIsland !== null && DRESSROSA_ISLAND_IDS.has(selectedIsland.id);
  const isTottoLandSelected =
    selectedIsland !== null && TOTTO_LAND_ISLAND_IDS.has(selectedIsland.id);
  const isZouSelected = selectedIsland?.id === 'zou';
  const isWanoSelected =
    selectedIsland !== null && WANO_ISLAND_IDS.has(selectedIsland.id);
  const isEggheadSelected =
    selectedIsland !== null && selectedIsland.id in EGGHEAD_SUB_LOCATIONS;
  const isElbafSelected =
    selectedIsland !== null && selectedIsland.id in ELBAF_SUB_LOCATIONS;

  const currentLogPoseTarget =
    mugiwaraRouteIslands[mugiwaraRouteIndex] ?? mugiwaraRouteIslands[0] ?? null;
  const selectedIslandLoading = isSelectedIslandLoading(
    selectedIsland?.id,
    loadingIslands
  );
  const islandLoadingLabel = formatIslandLoadingLabel(loadingIslands);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4">
      <NavigationLoadingOverlay visible={sailingActive && sailingPreparing} />

      {loadingIslands.length > 0 && !(sailingActive && sailingPreparing) && (
        <div
          data-testid="island-loading-indicator"
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed left-1/2 top-20 z-30 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-amber-400/45 bg-[#070c18]/94 px-4 py-2.5 shadow-2xl sm:top-5"
        >
          <Loader2
            className="h-5 w-5 shrink-0 animate-spin text-amber-300"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="font-display truncate text-xs font-semibold tracking-wide text-amber-200 sm:text-sm">
              {islandLoadingLabel}
            </p>
            <p className="text-[11px] text-slate-400">
              Génération du relief et des bâtiments 3D
            </p>
          </div>
        </div>
      )}

      {/* Top Row: Brand Header (Left) & Log Pose + Mini-Map OR Selected Island Lore Card (Right) */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left Minimal Brand Title */}
        <header
          data-testid="hud-header"
          data-collapsed={headerCollapsed ? 'true' : 'false'}
          className={`pointer-events-auto rounded-xl border border-white/12 bg-[#070c18]/92 shadow-xl ${
            headerCollapsed ? 'px-3 py-2' : 'px-4 py-3'
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            {onReturnToMenu && (
              <button
                type="button"
                data-testid="return-to-menu-btn"
                onClick={onReturnToMenu}
                aria-label="Retour au menu principal Log Pose"
                className="flex min-h-[32px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#d4a24c]/35 bg-[#0b1326] px-2.5 py-1 text-xs font-semibold text-amber-100 transition-colors hover:border-[#d4a24c] hover:bg-[#131f3a]"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-[#d4a24c]" aria-hidden="true" />
                <span>Menu</span>
              </button>
            )}
            <Compass
              className="h-5 w-5 shrink-0 text-[#d4a24c]"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h1 className="font-display text-sm font-semibold tracking-wide text-slate-100 sm:text-base whitespace-nowrap">
                Grand Line World Atlas
              </h1>
              {!headerCollapsed && (
                <p className="text-xs text-slate-400">
                  {sailingActive
                    ? 'Sunny Go · Glisser souris pour pivoter caméra · Flèches ↑ ← → · Espace Coup de Burst'
                    : 'Drag to orbit · Scroll deep into islands · ZQSD / WASD to walk at street level'}
                </p>
              )}
            </div>

            {!headerCollapsed && (
              <div className="ml-1 flex items-center gap-2 border-l border-white/12 pl-3">
                <button
                  type="button"
                  data-testid="hud-music-toggle"
                  onClick={onToggleMusic}
                  aria-pressed={musicEnabled}
                  aria-label={
                    musicEnabled ? 'Couper la musique' : 'Activer la musique'
                  }
                  title={
                    musicEnabled ? 'Musique activée (cliquer pour couper)' : 'Musique coupée (cliquer pour activer)'
                  }
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    musicEnabled
                      ? 'border-[#d4a24c]/55 bg-[#d4a24c]/15 text-amber-200 hover:bg-[#d4a24c]/25'
                      : 'border-white/12 bg-white/5 text-slate-400 hover:border-white/25 hover:text-slate-200'
                  }`}
                >
                  {musicEnabled ? (
                    <Music className="h-3.5 w-3.5 text-[#f5c565]" aria-hidden="true" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  )}
                  <span className="hidden md:inline">
                    {musicEnabled ? 'Musique' : 'Muet'}
                  </span>
                </button>

                <div className="flex items-center gap-1.5">
                  {soundVolume <= 0.01 ? (
                    <VolumeX className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  ) : soundVolume < 0.5 ? (
                    <Volume1 className="h-3.5 w-3.5 shrink-0 text-[#d4a24c]" aria-hidden="true" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 shrink-0 text-[#d4a24c]" aria-hidden="true" />
                  )}
                  <label htmlFor="hud-volume-slider" className="sr-only">
                    Volume sonore
                  </label>
                  <input
                    id="hud-volume-slider"
                    data-testid="hud-volume-slider"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={soundVolume}
                    onChange={(e) => onChangeSoundVolume(Number(e.target.value))}
                    className="atlas-slider w-16 sm:w-20"
                    aria-label="Volume sonore"
                  />
                  <span
                    data-testid="hud-volume-readout"
                    className="font-mono-tabular w-8 text-right text-[11px] font-medium text-amber-200"
                  >
                    {Math.round(soundVolume * 100)}%
                  </span>
                </div>

                {onOpenSettings && (
                  <button
                    type="button"
                    data-testid="hud-settings-btn"
                    onClick={onOpenSettings}
                    aria-label="Ouvrir les paramètres"
                    title="Paramètres"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/14 bg-white/5 text-slate-200 transition-colors hover:border-[#d4a24c]/60 hover:text-amber-200"
                  >
                    <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              data-testid="header-collapse-btn"
              onClick={() => {
                onPlayUiSound?.('ui-menu-click', 0.8, 70);
                setHeaderCollapsed((c) => !c);
              }}
              aria-expanded={!headerCollapsed}
              aria-label={headerCollapsed ? 'Déplier la barre supérieure' : 'Replier la barre supérieure'}
              title={headerCollapsed ? 'Déplier la barre supérieure' : 'Replier la barre supérieure'}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/14 bg-white/5 text-slate-200 transition-colors hover:border-[#d4a24c]/60 hover:text-amber-200"
            >
              {headerCollapsed ? (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {!headerCollapsed && isLoadingMap && (
            <p
              className="mt-2 flex items-center gap-2 text-xs font-medium text-[#f5c565]"
              role="status"
            >
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
              <span>Generating 3D terrain relief and ocean bathymetry...</span>
            </p>
          )}

          {mapError && (
            <div
              className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-red-400/30 bg-red-950/80 px-3 py-1.5 text-xs text-red-200"
              role="alert"
            >
              <span>{mapError}</span>
              <button
                type="button"
                onClick={onDismissError}
                className="rounded p-0.5 text-red-200 hover:bg-red-900/60"
                aria-label="Dismiss map load error"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </header>

        {/* Top-Right: Sailing Log Pose + Mini-Map OR Selected Island Lore Card */}
        {sailingActive && currentLogPoseTarget ? (
          <div className="flex flex-col items-end gap-2.5">
            <LogPoseWidget
              telemetry={sunnyTelemetry}
              targetIsland={currentLogPoseTarget}
              routeIndex={mugiwaraRouteIndex}
              routeTotal={mugiwaraRouteIslands.length}
              arrivedNotice={mugiwaraArrivedNotice}
              onPrevStage={onPrevMugiwaraStage}
              onNextStage={onNextMugiwaraStage}
              onPlayUiSound={onPlayUiSound}
            />
            <MiniMapWidget
              telemetry={sunnyTelemetry}
              targetIsland={currentLogPoseTarget}
              routeIslands={mugiwaraRouteIslands}
              routeIndex={mugiwaraRouteIndex}
              allLocations={ONE_PIECE_LOCATIONS}
              onPlayUiSound={onPlayUiSound}
            />
          </div>
        ) : selectedIsland ? (
          <aside
            className={`pointer-events-auto w-full max-w-[356px] rounded-xl border border-white/14 bg-[#070c18]/94 shadow-2xl ${
              loreCollapsed ? 'p-3' : 'p-4'
            }`}
            aria-label="Selected Island Lore"
            data-testid="island-lore-card"
            data-collapsed={loreCollapsed ? 'true' : 'false'}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#d4a24c]">
                  <span>{selectedIsland.region}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedIsland.notability}</span>
                </div>
                <h2 className="font-display mt-1 text-lg font-semibold leading-snug text-slate-50">
                  {selectedIsland.name}
                </h2>
                {!loreCollapsed && (
                  <p className="text-xs font-medium text-slate-300">
                    {selectedIsland.subtitle}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  data-testid="lore-collapse-btn"
                  onClick={() => {
                    onPlayUiSound?.('ui-menu-click', 0.8, 70);
                    setLoreCollapsed((c) => !c);
                  }}
                  aria-expanded={!loreCollapsed}
                  aria-label={loreCollapsed ? 'Déplier la fiche de l’île' : 'Replier la fiche de l’île'}
                  title={loreCollapsed ? 'Déplier la fiche' : 'Replier la fiche'}
                  className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition-colors hover:border-[#d4a24c]/50 hover:text-amber-200"
                >
                  {loreCollapsed ? (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectIsland(null)}
                  className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition-colors hover:border-white/25 hover:text-white"
                  aria-label="Close island lore card"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!loreCollapsed && (
              <>
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-xs leading-relaxed text-slate-300">
                {selectedIsland.description}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span>{selectedIsland.arc}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-slate-300">
                {formatLatLon(selectedIsland.u, selectedIsland.v)}
              </span>
            </div>

            {selectedIslandLoading && (
              <div
                data-testid="island-card-loading"
                className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/35 bg-amber-500/12 px-3 py-2 text-xs font-medium text-amber-200"
              >
                <Loader2
                  className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-300"
                  aria-hidden="true"
                />
                <span>Chargement du modèle 3D de l&apos;île…</span>
              </div>
            )}

            {isAlabastaSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#d4a24c]">
                  Zoom Rue &amp; Cités · Alabasta
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ALABASTA_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'alabasta' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveAlabasta(preset.id)}
                        data-testid={`dive-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-[#d4a24c] bg-[#d4a24c] text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-[#d4a24c]/50 hover:bg-[#d4a24c]/18 hover:text-[#f5c565]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isSkypieaSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                  Exploration Humaine · Skypiea
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SKYPIEA_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'skypiea' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveSkypiea(preset.id)}
                        data-testid={`skypiea-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-sky-400 bg-sky-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-sky-400/50 hover:bg-sky-400/18 hover:text-sky-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isWater7Selected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                  Exploration Humaine · Water 7
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {WATER7_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'water-7' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveWater7(preset.id)}
                        data-testid={`water7-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-cyan-400/50 hover:bg-cyan-400/18 hover:text-cyan-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isMarinefordSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                  Exploration Humaine · Marineford
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MARINEFORD_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'marineford' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveMarineford(preset.id)}
                        data-testid={`marineford-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-amber-400 bg-amber-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-amber-400/50 hover:bg-amber-400/18 hover:text-amber-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isPolestarSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-rose-300">
                  Exploration Humaine · Polestar Islands
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {LOGUETOWN_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'polestar-islands' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveLoguetown(preset.id)}
                        data-testid={`polestar-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-rose-400 bg-rose-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-rose-400/50 hover:bg-rose-400/18 hover:text-rose-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isConomiSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-orange-300">
                  Exploration Humaine · Îles Conomi
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CONOMI_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'conomi-islands' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveConomi(preset.id)}
                        data-testid={`conomi-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-orange-400 bg-orange-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-orange-400/50 hover:bg-orange-400/18 hover:text-orange-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isGeckoSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                  Exploration Humaine · Îles Gecko
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {GECKO_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'gecko-islands' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveGecko(preset.id)}
                        data-testid={`gecko-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-emerald-400/50 hover:bg-emerald-400/18 hover:text-emerald-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isDawnSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                  Exploration Humaine · Île de Dawn
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DAWN_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'dawn-island' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveDawn(preset.id)}
                        data-testid={`dawn-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-amber-400 bg-amber-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-amber-400/50 hover:bg-amber-400/18 hover:text-amber-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isGoatSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-pink-300">
                  Exploration Humaine · Île de Goat
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {GOAT_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'goat-island' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveGoat(preset.id)}
                        data-testid={`goat-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-pink-400 bg-pink-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-pink-400/50 hover:bg-pink-400/18 hover:text-pink-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isShellsSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                  Exploration Humaine · Yotsuba &amp; Shells Town
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SHELLS_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'shells-town' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveShellsTown(preset.id)}
                        data-testid={`shells-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-sky-400 bg-sky-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-sky-400/50 hover:bg-sky-400/18 hover:text-sky-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isOrganSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-orange-300">
                  Exploration Humaine · Organ &amp; Orange Town
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ORGAN_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'organ-island' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveOrgan(preset.id)}
                        data-testid={`organ-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-orange-400 bg-orange-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-orange-400/50 hover:bg-orange-400/18 hover:text-orange-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isShimotsukiSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                  Exploration Humaine · Village de Shimotsuki &amp; Dojo Isshin
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SHIMOTSUKI_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'shimotsuki' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveShimotsuki(preset.id)}
                        data-testid={`shimotsuki-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-emerald-400/50 hover:bg-emerald-400/18 hover:text-emerald-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isBaratieSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                  Exploration Humaine · Restaurant Flottant Baratie
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {BARATIE_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'baratie' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveBaratie(preset.id)}
                        data-testid={`baratie-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-amber-400 bg-amber-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-amber-400/50 hover:bg-amber-400/18 hover:text-amber-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isReverseMountainSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                  Vue Montagne &amp; Courants · Reverse Mountain
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {RM_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'reverse-mountain' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveReverseMountain(preset.id)}
                        data-testid={`rm-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-sky-400 bg-sky-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-sky-400/50 hover:bg-sky-400/18 hover:text-sky-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isTwinCapeSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                  Exploration Humaine · Twin Cape &amp; Laboon
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TWIN_CAPE_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'twin-cape' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveTwinCape(preset.id)}
                        data-testid={`twin-cape-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-emerald-400/50 hover:bg-emerald-400/18 hover:text-emerald-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isLittleGardenSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-lime-300">
                  Exploration Humaine · Little Garden
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {LITTLE_GARDEN_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'little-garden' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveLittleGarden(preset.id)}
                        data-testid={`little-garden-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-lime-400 bg-lime-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-lime-400/50 hover:bg-lime-400/18 hover:text-lime-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isCactusSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                  Exploration Humaine · Île Cactus (Whisky Peak)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CACTUS_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'cactus-island' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveCactus(preset.id)}
                        data-testid={`cactus-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-amber-400 bg-amber-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-amber-400/50 hover:bg-amber-400/18 hover:text-amber-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isDrumSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                  Exploration Humaine · Île de Drum
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DRUM_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'drum-island' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveDrum(preset.id)}
                        data-testid={`drum-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-sky-400 bg-sky-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-sky-400/50 hover:bg-sky-400/18 hover:text-sky-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isJayaSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                  Exploration Humaine · Île de Jaya &amp; Mock Town
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {JAYA_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'jaya' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveJaya(preset.id)}
                        data-testid={`jaya-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-emerald-400/50 hover:bg-emerald-400/18 hover:text-emerald-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isLongRingSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-lime-300">
                  Exploration Humaine · Long Ring Long Land
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {LONG_RING_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'long-ring-long-land' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveLongRing(preset.id)}
                        data-testid={`longring-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-lime-400 bg-lime-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-lime-400/50 hover:bg-lime-400/18 hover:text-lime-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isShiftSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                  Exploration Humaine · Shift Station (Umi Ressha)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SHIFT_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'shift-station' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveShiftStation(preset.id)}
                        data-testid={`shift-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-emerald-400/50 hover:bg-emerald-400/18 hover:text-emerald-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isPucciSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                  Exploration Humaine · Pucci (Cité des Gourmets)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PUCCI_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'pucci-island' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDivePucci(preset.id)}
                        data-testid={`pucci-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-amber-400 bg-amber-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-amber-400/50 hover:bg-amber-400/18 hover:text-amber-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isSanFaldoSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-pink-300">
                  Exploration Humaine · San Faldo (Cité du Carnaval)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SAN_FALDO_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'san-faldo' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveSanFaldo(preset.id)}
                        data-testid={`san-faldo-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-pink-400 bg-pink-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-pink-400/50 hover:bg-pink-400/18 hover:text-pink-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isStPoplarSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-rose-300">
                  Exploration Humaine · St. Poplar (Île Printanière)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ST_POPLAR_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'st-poplar' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveStPoplar(preset.id)}
                        data-testid={`st-poplar-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-rose-400 bg-rose-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-rose-400/50 hover:bg-rose-400/18 hover:text-rose-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isEniesSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                  Exploration Humaine · Enies Lobby (Île Judiciaire)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ENIES_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'enies-lobby' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveEniesLobby(preset.id)}
                        data-testid={`enies-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-cyan-400/50 hover:bg-cyan-400/18 hover:text-cyan-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isAmazonLilySelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-rose-300">
                  Exploration Humaine · Amazon Lily (Empire Kuja)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {AMAZON_LILY_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'amazon-lily' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveAmazonLily(preset.id)}
                        data-testid={`amazon-lily-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-rose-400 bg-rose-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-rose-400/50 hover:bg-rose-400/18 hover:text-rose-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isThrillerBarkSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-purple-300">
                  Exploration Humaine · Thriller Bark (Île-Navire)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {THRILLER_BARK_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'thriller-bark' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveThrillerBark(preset.id)}
                        data-testid={`thriller-bark-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-purple-400 bg-purple-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-purple-400/50 hover:bg-purple-400/18 hover:text-purple-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isSabaodySelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                  Exploration Humaine · Archipel des Sabaody (79 Mangroves)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SABAODY_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'sabaody' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveSabaody(preset.id)}
                        data-testid={`sabaody-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-emerald-400/50 hover:bg-emerald-400/18 hover:text-emerald-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isMaryGeoiseSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                  Terre Sainte · Mary Geoise (10 000 m Red Line)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MARY_GEOISE_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'mary-geoise' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveMaryGeoise(preset.id)}
                        data-testid={`mary-geoise-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-amber-400 bg-amber-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-amber-400/50 hover:bg-amber-400/18 hover:text-amber-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isPunkHazardSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-orange-300">
                  Exploration Humaine · Punk Hazard (Glace &amp; Terres Brûlantes)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PUNK_HAZARD_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'punk-hazard' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDivePunkHazard(preset.id)}
                        data-testid={`punk-hazard-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-orange-400 bg-orange-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-orange-400/50 hover:bg-orange-400/18 hover:text-orange-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isDressrosaSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-rose-300">
                  Exploration Humaine · Dressrosa, Colisée &amp; Green Bit
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DRESSROSA_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'dressrosa' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveDressrosa(preset.id)}
                        data-testid={`dressrosa-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-rose-400 bg-rose-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-rose-400/50 hover:bg-rose-400/18 hover:text-rose-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isTottoLandSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-pink-300">
                  Exploration Humaine · Archipel Totto Land (35 Îles)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TOTTO_LAND_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'whole-cake-island' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveTottoLand(preset.id)}
                        data-testid={`totto-land-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-pink-400 bg-pink-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-pink-400/50 hover:bg-pink-400/18 hover:text-pink-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isZouSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                  Exploration Humaine · Zo, Zunesha &amp; Duché de Mokomo
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ZOU_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'zou' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveZou(preset.id)}
                        data-testid={`zou-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-emerald-400/50 hover:bg-emerald-400/18 hover:text-emerald-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isWanoSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-rose-300">
                  Exploration Humaine · Pays des Wa (Wano Kuni) &amp; Onigashima
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {WANO_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'wano' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveWano(preset.id)}
                        data-testid={`wano-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-rose-400 bg-rose-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-rose-400/50 hover:bg-rose-400/18 hover:text-rose-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isEggheadSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                  Exploration Humaine · Île du Futur Egghead &amp; Labophase
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EGGHEAD_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'egghead-island' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveEgghead(preset.id)}
                        data-testid={`egghead-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-cyan-400/50 hover:bg-cyan-400/18 hover:text-cyan-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isElbafSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                  Exploration Humaine · Royaume des Géants d&apos;Elbaf
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ELBAF_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'elbaf' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveElbaf(preset.id)}
                        data-testid={`elbaf-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-emerald-400/50 hover:bg-emerald-400/18 hover:text-emerald-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isImpelDownSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                  Surface &amp; Enfers Immergés · Impel Down &amp; Tarai Current
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {IMPEL_DOWN_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'impel-down' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveImpelDown(preset.id)}
                        data-testid={`impel-down-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-indigo-400 bg-indigo-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-indigo-400/50 hover:bg-indigo-400/18 hover:text-indigo-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isFishManSelected && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                  Royaume Sous-Marin · Île des Hommes-Poissons (-10 000 m)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {FISH_MAN_CAMERA_PRESETS.map((preset) => {
                    const isActive =
                      activeDiveIsland === 'fish-man-island' &&
                      activeDivePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onDiveFishMan(preset.id)}
                        data-testid={`fish-man-island-preset-${preset.id}`}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                            : 'border-white/14 bg-white/5 text-slate-200 hover:border-cyan-400/50 hover:bg-cyan-400/18 hover:text-cyan-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCycleIsland(-1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-white/5 text-slate-200 transition-colors hover:bg-white/12"
                  aria-label="Previous island"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCycleIsland(1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-white/5 text-slate-200 transition-colors hover:bg-white/12"
                  aria-label="Next island"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedIsland.elevationTier !== 'sky' && (
                  <button
                    type="button"
                    onClick={() => onSailAtIsland(selectedIsland)}
                    data-testid="sail-here-btn"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-amber-500/20 px-2.5 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-400 hover:text-slate-950 whitespace-nowrap shrink-0"
                  >
                    <Ship className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Naviguer ici</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectIsland({ ...selectedIsland })}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#d4a24c] px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-[#e5b663] whitespace-nowrap shrink-0"
                >
                  <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Re-Center Camera</span>
                </button>
              </div>
            </div>
              </>
            )}
          </aside>
        ) : null}
      </div>

      {/* Collapsible Island Directory & Search Drawer (Left Flank, toggled on demand) */}
      {directoryOpen && (
        <aside
          className={`pointer-events-auto absolute left-4 ${
            headerCollapsed ? 'top-16' : 'top-24'
          } z-30 flex max-h-[calc(100vh-215px)] w-80 flex-col rounded-xl border border-white/14 bg-[#070c18]/94 shadow-2xl`}
          aria-label="Island Navigator"
          data-testid="island-directory"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-100">
                World Log Pose Directory
              </h2>
              <p className="text-[11px] text-slate-400">
                {filteredLocations.length} of {ONE_PIECE_LOCATIONS.length}{' '}
                charted locations
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onPlayUiSound?.('ui-modal-close', 0.8, 70);
                setDirectoryOpen(false);
              }}
              className="rounded-lg border border-white/10 p-1 text-slate-400 transition-colors hover:border-white/25 hover:text-white"
              aria-label="Close island directory"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2.5 border-b border-white/10 p-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <label htmlFor="island-search" className="sr-only">
                Search islands, arcs, or seas
              </label>
              <input
                id="island-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search island, sea, or arc..."
                className="w-full rounded-lg border border-white/12 bg-slate-900/90 py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#d4a24c] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="sea-region-filter" className="sr-only">
                Filter by sea region
              </label>
              <select
                id="sea-region-filter"
                value={regionFilter}
                onChange={(e) =>
                  setRegionFilter(e.target.value as SeaRegion | 'All')
                }
                className="w-full rounded-lg border border-white/12 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-200 focus:border-[#d4a24c] focus:outline-none"
              >
                {REGION_FILTERS.map((region) => (
                  <option key={region} value={region}>
                    {region === 'All' ? 'All Seas & Regions' : region}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="atlas-scroll flex-1 overflow-y-auto p-2 space-y-1">
            {filteredLocations.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-400">
                No charted islands match &ldquo;{searchQuery}&rdquo;.
              </p>
            ) : (
              filteredLocations.map((island) => {
                const isSelected = selectedIsland?.id === island.id;
                return (
                  <div
                    key={island.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors ${
                      isSelected
                        ? 'border-[#d4a24c]/60 bg-[#d4a24c]/12'
                        : 'border-transparent hover:border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-100">
                        {island.name}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        {island.region} · {island.arc}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectIsland(island);
                      }}
                      className="shrink-0 rounded-md border border-[#d4a24c]/40 bg-[#d4a24c]/15 px-2.5 py-1 text-[11px] font-semibold text-[#f5c565] transition-colors hover:bg-[#d4a24c] hover:text-slate-950 whitespace-nowrap"
                      aria-label={`Fly to ${island.name}`}
                    >
                      Fly To
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* Bottom Center Collapsible Control Dock */}
      <div className="flex flex-col items-center gap-2">
        {sailingActive && (
          <section
            data-testid="sunny-helm-hud"
            data-collapsed={helmCollapsed ? 'true' : 'false'}
            aria-label="Barre du Thousand Sunny"
            className={`pointer-events-auto flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-[#070c18]/94 shadow-2xl ${
              helmCollapsed ? 'w-auto max-w-[640px] px-3 py-1.5' : 'w-full max-w-[1180px] px-3.5 py-2'
            }`}
          >
            {/* Ship telemetry & collision status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/35">
                  <Ship className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-amber-200 leading-tight">
                    Thousand Sunny · À l&apos;échelle
                  </p>
                  <p className="font-mono-tabular text-[11px] text-slate-300">
                    {sunnyTelemetry.speedKnots.toFixed(1)} kt
                    {sunnyTelemetry.nearestIslandName
                      ? ` · ${sunnyTelemetry.nearestIslandName} (${Math.round(sunnyTelemetry.nearestDistanceKm)} km)`
                      : ''}
                  </p>
                </div>
              </div>

              {sunnyTelemetry.calmBeltBlocked && (
                <span
                  data-testid="sunny-helm-calm-belt"
                  className="inline-flex items-center gap-1 rounded-md border border-teal-400/50 bg-teal-500/20 px-2 py-0.5 text-[11px] font-semibold text-teal-200"
                >
                  <span>Calm Belt · Reverse Mountain requis</span>
                </span>
              )}

              {sunnyTelemetry.coatingRequiredBlocked && (
                <span
                  data-testid="sunny-helm-coating-blocked"
                  className="inline-flex items-center gap-1 rounded-md border border-cyan-400/50 bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-200"
                >
                  <span>Revêtement Sabaody requis</span>
                </span>
              )}

              {(sunnyTelemetry.reverseMountainPhase === 'climbing' ||
                sunnyTelemetry.reverseMountainPhase === 'summit' ||
                sunnyTelemetry.reverseMountainPhase === 'descending') && (
                <span
                  data-testid="sunny-rm-phase-pill"
                  className="inline-flex items-center gap-1 rounded-md border border-sky-400/50 bg-sky-500/20 px-2 py-0.5 text-[11px] font-semibold text-sky-200"
                >
                  <span>
                    {sunnyTelemetry.reverseMountainPhase === 'climbing'
                      ? `Ascension +${sunnyTelemetry.elevationMeters} m`
                      : sunnyTelemetry.reverseMountainPhase === 'summit'
                        ? `Sommet (+${sunnyTelemetry.elevationMeters} m) · Virage`
                        : `Descente Grand Line (${sunnyTelemetry.elevationMeters} m)`}
                  </span>
                </span>
              )}

              {sunnyTelemetry.collided && (
                <span
                  data-testid="sunny-collision-badge"
                  className="inline-flex items-center gap-1 rounded-md border border-red-400/50 bg-red-500/20 px-2 py-0.5 text-[11px] font-semibold text-red-200"
                >
                  <Anchor className="h-3 w-3" aria-hidden="true" />
                  <span>Collision côte</span>
                </span>
              )}
            </div>

            {!helmCollapsed && (
              <>
            {/* Scale Navigator Camera Modes */}
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'navigator', label: 'Vue Navigateur' },
                  { id: 'deck', label: 'Vue Pont' },
                  { id: 'overhead', label: 'Vue Aérienne' },
                ] as const
              ).map((mode) => {
                const active = sunnyCameraMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onChangeSunnyCameraMode(mode.id)}
                    data-testid={`sunny-cam-${mode.id}`}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                      active
                        ? 'border-amber-400 bg-amber-400 text-slate-950'
                        : 'border-white/14 bg-white/5 text-slate-200 hover:border-amber-400/50 hover:text-amber-200'
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>

            {/* Directional Arrow Pad + Coup de Burst + Exit */}
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1 rounded-lg border border-white/12 bg-slate-900/90 p-1"
                role="group"
                aria-label="Flèches de navigation"
              >
                <button
                  type="button"
                  data-testid="sunny-steer-left"
                  aria-label="Tourner à gauche"
                  onPointerDown={() => setControlSteer(1)}
                  onPointerUp={() => setControlSteer(0)}
                  onPointerLeave={() => setControlSteer(0)}
                  onPointerCancel={() => setControlSteer(0)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-white/12 bg-white/5 text-slate-100 hover:bg-amber-400 hover:text-slate-950 active:bg-amber-400 active:text-slate-950"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  data-testid="sunny-throttle-up"
                  aria-label="Avancer"
                  onPointerDown={() => setControlThrottle(1)}
                  onPointerUp={() => setControlThrottle(0)}
                  onPointerLeave={() => setControlThrottle(0)}
                  onPointerCancel={() => setControlThrottle(0)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-white/12 bg-white/5 text-slate-100 hover:bg-amber-400 hover:text-slate-950 active:bg-amber-400 active:text-slate-950"
                >
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  data-testid="sunny-steer-right"
                  aria-label="Tourner à droite"
                  onPointerDown={() => setControlSteer(-1)}
                  onPointerUp={() => setControlSteer(0)}
                  onPointerLeave={() => setControlSteer(0)}
                  onPointerCancel={() => setControlSteer(0)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-white/12 bg-white/5 text-slate-100 hover:bg-amber-400 hover:text-slate-950 active:bg-amber-400 active:text-slate-950"
                >
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              {sunnyTelemetry.skyZone === 'fish-man-island' && (
                <button
                  type="button"
                  onClick={() => onSunnyAction('resurface')}
                  data-testid="sunny-resurface-btn"
                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/60 bg-cyan-500/25 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-100 transition-colors hover:bg-cyan-400 hover:text-slate-950 whitespace-nowrap"
                >
                  <span>Remonter Nouveau Monde</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onSunnyAction('boost')}
                disabled={boostState !== 'ready'}
                data-testid="sunny-boost-btn"
                data-boost-state={boostState}
                aria-pressed={boostState === 'active'}
                title="Coup de Burst (touche Espace · 3s · recharge 5s)"
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  boostState === 'active'
                    ? 'border-orange-400 bg-orange-500 text-slate-950'
                    : boostState === 'cooldown'
                      ? 'cursor-not-allowed border-slate-500/35 bg-slate-800/75 text-slate-400'
                      : 'border-orange-400/40 bg-orange-500/15 text-orange-200 hover:bg-orange-500/30'
                }`}
              >
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {boostState === 'active'
                    ? `Burst · ${sunnyTelemetry.boostRemainingSec.toFixed(1)}s`
                    : boostState === 'cooldown'
                      ? `Recharge · ${sunnyTelemetry.boostCooldownSec.toFixed(1)}s`
                      : 'Coup de Burst'}
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleSailing}
                data-testid="sunny-exit-btn"
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:border-white/30 hover:bg-white/10 whitespace-nowrap"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Quitter</span>
              </button>
            </div>
              </>
            )}

            <button
              type="button"
              data-testid="helm-collapse-btn"
              onClick={() => {
                onPlayUiSound?.('ui-menu-click', 0.8, 70);
                setHelmCollapsed((c) => !c);
              }}
              aria-expanded={!helmCollapsed}
              aria-label={helmCollapsed ? 'Déplier la barre du Sunny' : 'Replier la barre du Sunny'}
              title={helmCollapsed ? 'Déplier la barre' : 'Replier la barre'}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/14 bg-white/5 text-slate-200 hover:border-amber-400/50 hover:text-amber-200"
            >
              {helmCollapsed ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </section>
        )}

        <div className="flex flex-col items-center w-full">
          <button
            type="button"
            data-testid="dock-collapse-btn"
            onClick={() => {
              onPlayUiSound?.('ui-menu-click', 0.8, 70);
              setDockCollapsed((c) => !c);
            }}
            className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 border-white/12 bg-[#070c18]/92 px-3 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:text-white"
            aria-expanded={!dockCollapsed}
            aria-controls="globe-control-dock"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Show Controls</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Hide Controls</span>
              </>
            )}
          </button>

          {!dockCollapsed && (
            <nav
              id="globe-control-dock"
              aria-label="Globe Controls"
              className="pointer-events-auto flex w-full max-w-[1320px] flex-wrap xl:flex-nowrap items-center justify-between gap-2 rounded-2xl border border-white/14 bg-[#070c18]/94 px-3 py-1.5 shadow-2xl"
            >
              {/* 1. Island Directory Toggle, Sunny Sailing Toggle & Dock Island Search Bar */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onToggleSailing}
                  data-testid="toggle-sailing-btn"
                  aria-pressed={sailingActive}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    sailingActive
                      ? 'border-amber-400 bg-amber-400 text-slate-950'
                      : 'border-amber-400/45 bg-amber-500/15 text-amber-200 hover:bg-amber-400 hover:text-slate-950'
                  }`}
                >
                  <Ship className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Naviguer · Sunny Go</span>
                </button>

                <button
                  type="button"
                  data-testid="toggle-directory-btn"
                  onClick={() => {
                    setDirectoryOpen((o) => {
                      const next = !o;
                      onPlayUiSound?.(next ? 'ui-modal-open' : 'ui-modal-close', 0.8, 70);
                      return next;
                    });
                  }}
                  aria-expanded={directoryOpen}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    directoryOpen
                      ? 'border-[#d4a24c] bg-[#d4a24c] text-slate-950'
                      : 'border-white/14 bg-white/5 text-slate-100 hover:border-white/30 hover:bg-white/10'
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Locations ({ONE_PIECE_LOCATIONS.length})</span>
                </button>

              <div ref={dockSearchRef} className="relative">
                <label htmlFor="dock-island-search" className="sr-only">
                  Rechercher une île
                </label>
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#d4a24c]"
                  aria-hidden="true"
                />
                <input
                  id="dock-island-search"
                  data-testid="dock-island-search"
                  type="text"
                  value={dockSearchQuery}
                  onFocus={() => setDockSearchOpen(true)}
                  onChange={(e) => {
                    setDockSearchQuery(e.target.value);
                    setDockSearchOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && dockSearchResults.length > 0) {
                      e.preventDefault();
                      handleSelectFromDockSearch(dockSearchResults[0]);
                    } else if (e.key === 'Escape') {
                      setDockSearchOpen(false);
                    }
                  }}
                  placeholder="Rechercher une île..."
                  className="w-48 sm:w-60 rounded-lg border border-white/16 bg-slate-900/90 py-1.5 pl-8 pr-7 text-xs text-slate-100 placeholder:text-slate-400 focus:border-[#d4a24c] focus:outline-none"
                  autoComplete="off"
                />
                {dockSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setDockSearchQuery('');
                      setDockSearchOpen(true);
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-white"
                    aria-label="Clear island search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}

                {dockSearchOpen && (
                  <div
                    className="absolute bottom-full left-0 z-40 mb-2 w-72 sm:w-80 overflow-hidden rounded-xl border border-white/16 bg-[#070c18]/98 shadow-2xl"
                    data-testid="dock-search-results"
                  >
                    <div className="border-b border-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {dockSearchQuery.trim()
                        ? `${dockSearchResults.length} résultat(s)`
                        : 'Îles principales · Sélection rapide'}
                    </div>
                    <div className="atlas-scroll max-h-64 overflow-y-auto p-1.5 space-y-0.5">
                      {dockSearchResults.length === 0 ? (
                        <p className="px-3 py-4 text-center text-xs text-slate-400">
                          Aucune île trouvée pour &ldquo;{dockSearchQuery}&rdquo;.
                        </p>
                      ) : (
                        dockSearchResults.map((island) => (
                          <button
                            key={island.id}
                            type="button"
                            onClick={() => handleSelectFromDockSearch(island)}
                            data-testid={`dock-search-item-${island.id}`}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-white/10"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-slate-100">
                                {island.name}
                              </p>
                              <p className="truncate text-[10px] text-slate-400">
                                {island.region} · {island.arc}
                              </p>
                            </div>
                            {HUMAN_EXPLORABLE_IDS.has(island.id) && (
                              <span className="shrink-0 rounded border border-cyan-400/40 bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-200">
                                Vue 3D
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Sky Cloud Cover Slider */}
            <div className="flex items-center gap-2 px-1">
              <Cloud
                className="h-3.5 w-3.5 shrink-0 text-sky-300"
                aria-hidden="true"
              />
              <label
                htmlFor="cloud-cover-slider"
                className="text-xs font-medium text-slate-300 whitespace-nowrap"
              >
                Clouds
              </label>
              <input
                id="cloud-cover-slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(cloudCover * 100)}
                onChange={(e) =>
                  onChangeCloudCover(parseFloat(e.target.value) / 100)
                }
                className="atlas-slider w-20 sm:w-24"
              />
              <span
                className="font-mono-tabular w-9 text-right text-xs font-medium text-sky-200"
                data-testid="cloud-readout"
              >
                {formatCloudCover(cloudCover)}
              </span>
            </div>

            {/* 3. Time of Day Lighting Slider */}
            <div className="flex items-center gap-2 px-1">
              <label
                htmlFor="time-of-day-slider"
                className="text-xs font-medium text-slate-300 whitespace-nowrap"
              >
                Solar Time
              </label>
              <input
                id="time-of-day-slider"
                type="range"
                min={0}
                max={24}
                step={0.05}
                value={timeOfDay}
                onChange={(e) => onChangeTimeOfDay(parseFloat(e.target.value))}
                className="atlas-slider w-20 sm:w-24"
              />
              <span
                className="font-mono-tabular w-11 text-right text-xs font-medium text-[#f5c565]"
                data-testid="time-readout"
              >
                {formatHour(timeOfDay)}
              </span>
            </div>

            {/* 4. Utility Actions: Labels Toggle, Reset View, Map Upload */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onToggleLabels}
                aria-pressed={showLabels}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  showLabels
                    ? 'border-white/20 bg-white/10 text-slate-100'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {showLabels ? (
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{showLabels ? 'Hide Labels' : 'Show Labels'}</span>
              </button>

              <button
                type="button"
                onClick={onResetView}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/14 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-white/30 hover:bg-white/10 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset View</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onUploadMapFile(file);
                  }
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => {
                  onPlayUiSound?.('ui-menu-click', 0.85, 80);
                  fileInputRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/14 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-white/30 hover:bg-white/10 whitespace-nowrap shrink-0"
                title="Upload custom equirectangular map texture"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Upload Map</span>
              </button>
            </div>
          </nav>
        )}
        </div>
      </div>
    </div>
  );
}
