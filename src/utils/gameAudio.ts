import type { AppScreenMode } from './gameMenuState';
import type { SunnySkyZone } from './sunnyNavigation';

export type AudioCategory = 'music' | 'ambient' | 'sfx' | 'ui';

export type MusicSoundId =
  | 'music-title'
  | 'music-atlas'
  | 'music-voyage-calm'
  | 'music-voyage-storm'
  | 'music-skypiea'
  | 'music-fishman';

export type AmbientSoundId =
  | 'ambient-sea-calm'
  | 'ambient-sea-rough'
  | 'ambient-rain'
  | 'ambient-wind-snow'
  | 'ambient-ship-sail';

export type SfxSoundId =
  | 'sfx-thunder'
  | 'sfx-coup-de-burst'
  | 'sfx-hull-collision'
  | 'sfx-calm-belt'
  | 'sfx-reverse-mountain'
  | 'sfx-knock-up-stream'
  | 'sfx-octopus-balloon'
  | 'sfx-coating-bubble'
  | 'sfx-subsea-dive'
  | 'sfx-warning-alert'
  | 'sfx-log-pose-waypoint';

export type UiSoundId =
  | 'ui-menu-click'
  | 'ui-start-voyage'
  | 'ui-island-select'
  | 'ui-modal-open'
  | 'ui-modal-close';

export type GameSoundId =
  | MusicSoundId
  | AmbientSoundId
  | SfxSoundId
  | UiSoundId;

export interface GameAudioTrackSpec {
  id: GameSoundId;
  category: AudioCategory;
  /** URL path served from public/ */
  url: string;
  /** Exact project file path where the user places custom .mp3 files */
  publicPath: string;
  loop: boolean;
  baseGain: number;
  /** Leading silence trim offset in seconds for snappy UI/VFX playback */
  startOffsetSec?: number;
  /** Optional active clip cap in seconds when an MP3 has long trailing silence */
  maxPlaySec?: number;
  label: string;
}

export const GAME_AUDIO_TRACKS: Record<GameSoundId, GameAudioTrackSpec> = {
  'music-title': {
    id: 'music-title',
    category: 'music',
    url: '/assets/audio/music/title-theme.mp3',
    publicPath: 'public/assets/audio/music/title-theme.mp3',
    loop: true,
    baseGain: 0.36,
    label: 'Musique du menu principal (Log Pose)',
  },
  'music-atlas': {
    id: 'music-atlas',
    category: 'music',
    url: '/assets/audio/music/atlas-explore.mp3',
    publicPath: 'public/assets/audio/music/atlas-explore.mp3',
    loop: true,
    baseGain: 0.48,
    label: "Musique d'exploration du globe (mode Atlas)",
  },
  'music-voyage-calm': {
    id: 'music-voyage-calm',
    category: 'music',
    url: '/assets/audio/music/voyage-calm.mp3',
    publicPath: 'public/assets/audio/music/voyage-calm.mp3',
    loop: true,
    baseGain: 0.36,
    label: 'Musique de navigation en mer calme (mode Voyage)',
  },
  'music-voyage-storm': {
    id: 'music-voyage-storm',
    category: 'music',
    url: '/assets/audio/music/voyage-storm.mp3',
    publicPath: 'public/assets/audio/music/voyage-storm.mp3',
    loop: true,
    baseGain: 0.42,
    label: 'Musique de tempête et orage en haute mer',
  },
  'music-skypiea': {
    id: 'music-skypiea',
    category: 'music',
    url: '/assets/audio/music/skypiea-sky.mp3',
    publicPath: 'public/assets/audio/music/skypiea-sky.mp3',
    loop: true,
    baseGain: 0.44,
    label: 'Musique céleste des Îles Célestes (Skypiea)',
  },
  'music-fishman': {
    id: 'music-fishman',
    category: 'music',
    url: '/assets/audio/music/fishman-abyss.mp3',
    publicPath: 'public/assets/audio/music/fishman-abyss.mp3',
    loop: true,
    baseGain: 0.34,
    label: "Musique des profondeurs (Île des Hommes-Poissons -10 000 m)",
  },
  'ambient-sea-calm': {
    id: 'ambient-sea-calm',
    category: 'ambient',
    url: '/assets/audio/ambient/sea-calm.mp3',
    publicPath: 'public/assets/audio/ambient/sea-calm.mp3',
    loop: true,
    baseGain: 0.46,
    label: 'Son continu de la mer calme (houle et clapotis)',
  },
  'ambient-sea-rough': {
    id: 'ambient-sea-rough',
    category: 'ambient',
    url: '/assets/audio/ambient/sea-rough.mp3',
    publicPath: 'public/assets/audio/ambient/sea-rough.mp3',
    loop: true,
    baseGain: 0.56,
    label: 'Son continu de la mer déchaînée (grosses vagues et écume)',
  },
  'ambient-rain': {
    id: 'ambient-rain',
    category: 'ambient',
    url: '/assets/audio/ambient/rain-loop.mp3',
    publicPath: 'public/assets/audio/ambient/rain-loop.mp3',
    loop: true,
    baseGain: 0.58,
    label: 'Pluie continue sous les nuages de pluie et orages',
  },
  'ambient-wind-snow': {
    id: 'ambient-wind-snow',
    category: 'ambient',
    url: '/assets/audio/ambient/wind-snow-loop.mp3',
    publicPath: 'public/assets/audio/ambient/wind-snow-loop.mp3',
    loop: true,
    baseGain: 0.4,
    label: 'Vent glacial continu sous les nuages de neige',
  },
  'ambient-ship-sail': {
    id: 'ambient-ship-sail',
    category: 'ambient',
    url: '/assets/audio/ambient/ship-sail-loop.mp3',
    publicPath: 'public/assets/audio/ambient/ship-sail-loop.mp3',
    loop: true,
    baseGain: 0.38,
    label: 'Coque du Thousand Sunny, voiles et sillage sur l’eau',
  },
  'sfx-thunder': {
    id: 'sfx-thunder',
    category: 'sfx',
    url: '/assets/audio/sfx/thunder.mp3',
    publicPath: 'public/assets/audio/sfx/thunder.mp3',
    loop: false,
    baseGain: 0.85,
    label: 'Coup de tonnerre lors des éclairs orageux',
  },
  'sfx-coup-de-burst': {
    id: 'sfx-coup-de-burst',
    category: 'sfx',
    url: '/assets/audio/sfx/coup-de-burst.mp3',
    publicPath: 'public/assets/audio/sfx/coup-de-burst.mp3',
    loop: false,
    baseGain: 0.92,
    label: 'Propulsion Coup de Burst du Thousand Sunny',
  },
  'sfx-hull-collision': {
    id: 'sfx-hull-collision',
    category: 'sfx',
    url: '/assets/audio/sfx/hull-collision.mp3',
    publicPath: 'public/assets/audio/sfx/hull-collision.mp3',
    loop: false,
    baseGain: 0.95,
    maxPlaySec: 1.25,
    label: 'Impact de collision contre une côte ou un récif',
  },
  'sfx-calm-belt': {
    id: 'sfx-calm-belt',
    category: 'sfx',
    url: '/assets/audio/sfx/calm-belt-roar.mp3',
    publicPath: 'public/assets/audio/sfx/calm-belt-roar.mp3',
    loop: false,
    baseGain: 0.65,
    label: 'Grondement des Rois des Mers (Calm Belt)',
  },
  'sfx-reverse-mountain': {
    id: 'sfx-reverse-mountain',
    category: 'sfx',
    url: '/assets/audio/sfx/reverse-mountain.mp3',
    publicPath: 'public/assets/audio/sfx/reverse-mountain.mp3',
    loop: false,
    baseGain: 0.95,
    label: 'Torrent ascendant de Reverse Mountain',
  },
  'sfx-knock-up-stream': {
    id: 'sfx-knock-up-stream',
    category: 'sfx',
    url: '/assets/audio/sfx/knock-up-stream.mp3',
    publicPath: 'public/assets/audio/sfx/knock-up-stream.mp3',
    loop: false,
    baseGain: 0.95,
    maxPlaySec: 3.1,
    label: 'Geyser du Knock Up Stream vers Skypiea',
  },
  'sfx-octopus-balloon': {
    id: 'sfx-octopus-balloon',
    category: 'sfx',
    url: '/assets/audio/sfx/octopus-balloon.mp3',
    publicPath: 'public/assets/audio/sfx/octopus-balloon.mp3',
    loop: false,
    baseGain: 1.35,
    startOffsetSec: 0.095,
    label: 'Déploiement du ballon pieuvre depuis Skypiea',
  },
  'sfx-coating-bubble': {
    id: 'sfx-coating-bubble',
    category: 'sfx',
    url: '/assets/audio/sfx/coating-bubble.mp3',
    publicPath: 'public/assets/audio/sfx/coating-bubble.mp3',
    loop: false,
    baseGain: 0.72,
    label: 'Activation du revêtement de résine (Sabaody)',
  },
  'sfx-subsea-dive': {
    id: 'sfx-subsea-dive',
    category: 'sfx',
    url: '/assets/audio/sfx/subsea-dive.mp3',
    publicPath: 'public/assets/audio/sfx/subsea-dive.mp3',
    loop: false,
    baseGain: 0.95,
    label: 'Plongée sous-marine vers l’Île des Hommes-Poissons',
  },
  'sfx-warning-alert': {
    id: 'sfx-warning-alert',
    category: 'sfx',
    url: '/assets/audio/sfx/warning-alert.mp3',
    publicPath: 'public/assets/audio/sfx/warning-alert.mp3',
    loop: false,
    baseGain: 0.68,
    label: 'Alerte de navigation (revêtement requis / zone bloquée)',
  },
  'sfx-log-pose-waypoint': {
    id: 'sfx-log-pose-waypoint',
    category: 'sfx',
    url: '/assets/audio/sfx/log-pose-waypoint.mp3',
    publicPath: 'public/assets/audio/sfx/log-pose-waypoint.mp3',
    loop: false,
    baseGain: 0.72,
    label: 'Carillon Log Pose lors d’une étape atteinte',
  },
  'ui-menu-click': {
    id: 'ui-menu-click',
    category: 'ui',
    url: '/assets/audio/ui/menu-click.mp3',
    publicPath: 'public/assets/audio/ui/menu-click.mp3',
    loop: false,
    baseGain: 1.05,
    startOffsetSec: 0.075,
    maxPlaySec: 0.45,
    label: 'Clic sur les boutons d’interface',
  },
  'ui-start-voyage': {
    id: 'ui-start-voyage',
    category: 'ui',
    url: '/assets/audio/ui/start-voyage.mp3',
    publicPath: 'public/assets/audio/ui/start-voyage.mp3',
    loop: false,
    baseGain: 0.95,
    startOffsetSec: 0.065,
    maxPlaySec: 2.75,
    label: 'Signal de départ du voyage ou entrée sur l’Atlas',
  },
  'ui-island-select': {
    id: 'ui-island-select',
    category: 'ui',
    url: '/assets/audio/ui/island-select.mp3',
    publicPath: 'public/assets/audio/ui/island-select.mp3',
    loop: false,
    baseGain: 0.95,
    startOffsetSec: 0.02,
    maxPlaySec: 0.62,
    label: 'Sélection d’une île / zoom caméra',
  },
  'ui-modal-open': {
    id: 'ui-modal-open',
    category: 'ui',
    url: '/assets/audio/ui/modal-open.mp3',
    publicPath: 'public/assets/audio/ui/modal-open.mp3',
    loop: false,
    baseGain: 0.56,
    label: 'Ouverture du Journal de bord ou des Paramètres',
  },
  'ui-modal-close': {
    id: 'ui-modal-close',
    category: 'ui',
    url: '/assets/audio/ui/modal-close.mp3',
    publicPath: 'public/assets/audio/ui/modal-close.mp3',
    loop: false,
    baseGain: 0.52,
    label: 'Fermeture d’une fenêtre ou retour',
  },
};

export const ALL_GAME_AUDIO_TRACKS: readonly GameAudioTrackSpec[] =
  Object.values(GAME_AUDIO_TRACKS);

export const MUSIC_TRACK_IDS: readonly MusicSoundId[] = [
  'music-title',
  'music-atlas',
  'music-voyage-calm',
  'music-voyage-storm',
  'music-skypiea',
  'music-fishman',
];

export const AMBIENT_TRACK_IDS: readonly AmbientSoundId[] = [
  'ambient-sea-calm',
  'ambient-sea-rough',
  'ambient-rain',
  'ambient-wind-snow',
  'ambient-ship-sail',
];

export const DEFAULT_SOUND_VOLUME = 0.75;
export const DEFAULT_MUSIC_ENABLED = true;
export const AUDIO_SETTINGS_STORAGE_KEY =
  'grand-line-atlas-audio-settings-v1';

export interface AudioUserSettings {
  musicEnabled: boolean;
  soundVolume: number;
}

export function clampAudioVolume(volume: number): number {
  if (!Number.isFinite(volume)) return DEFAULT_SOUND_VOLUME;
  return Math.max(0, Math.min(1, volume));
}

export function parseStoredAudioSettings(
  raw: string | null
): AudioUserSettings {
  if (!raw) {
    return {
      musicEnabled: DEFAULT_MUSIC_ENABLED,
      soundVolume: DEFAULT_SOUND_VOLUME,
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AudioUserSettings> | null;
    if (!parsed || typeof parsed !== 'object') {
      return {
        musicEnabled: DEFAULT_MUSIC_ENABLED,
        soundVolume: DEFAULT_SOUND_VOLUME,
      };
    }
    return {
      musicEnabled:
        typeof parsed.musicEnabled === 'boolean'
          ? parsed.musicEnabled
          : DEFAULT_MUSIC_ENABLED,
      soundVolume:
        typeof parsed.soundVolume === 'number'
          ? clampAudioVolume(parsed.soundVolume)
          : DEFAULT_SOUND_VOLUME,
    };
  } catch {
    return {
      musicEnabled: DEFAULT_MUSIC_ENABLED,
      soundVolume: DEFAULT_SOUND_VOLUME,
    };
  }
}

export function loadStoredAudioSettings(): AudioUserSettings {
  if (typeof window === 'undefined') {
    return {
      musicEnabled: DEFAULT_MUSIC_ENABLED,
      soundVolume: DEFAULT_SOUND_VOLUME,
    };
  }
  try {
    return parseStoredAudioSettings(
      window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY)
    );
  } catch {
    return {
      musicEnabled: DEFAULT_MUSIC_ENABLED,
      soundVolume: DEFAULT_SOUND_VOLUME,
    };
  }
}

export function saveStoredAudioSettings(settings: AudioUserSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        musicEnabled: Boolean(settings.musicEnabled),
        soundVolume: clampAudioVolume(settings.soundVolume),
      })
    );
  } catch {
    // Ignore private mode / quota errors cleanly
  }
}

export function computeEffectiveMusicGain(
  soundVolume: number,
  musicEnabled: boolean,
  baseGain: number,
  fadeFactor = 1
): number {
  if (!musicEnabled) return 0;
  const vol = clampAudioVolume(soundVolume);
  const fade = Math.max(0, Math.min(1, fadeFactor));
  return Math.max(0, vol * baseGain * fade);
}

export function computeEffectiveSfxGain(
  soundVolume: number,
  baseGain: number,
  intensity = 1
): number {
  const vol = clampAudioVolume(soundVolume);
  const clampedIntensity = Math.max(0, Math.min(1.5, intensity));
  return Math.max(0, Math.min(1.8, vol * baseGain * clampedIntensity));
}

/**
 * Computes safe start offset & playback duration slice for an MP3 track so leading
 * or trailing silence does not delay UI/VFX playback.
 */
export function computePlaybackSlice(
  spec: Pick<GameAudioTrackSpec, 'startOffsetSec' | 'maxPlaySec'>,
  bufferDurationSec: number
): { offsetSec: number; playDurationSec?: number } {
  if (!Number.isFinite(bufferDurationSec) || bufferDurationSec <= 0) {
    return { offsetSec: 0 };
  }
  const rawOffset = spec.startOffsetSec ?? 0;
  const maxSafeOffset = Math.max(0, bufferDurationSec - 0.05);
  const offsetSec = Math.max(0, Math.min(rawOffset, maxSafeOffset));
  if (
    typeof spec.maxPlaySec === 'number' &&
    Number.isFinite(spec.maxPlaySec) &&
    spec.maxPlaySec > 0
  ) {
    const remaining = Math.max(0.05, bufferDurationSec - offsetSec);
    return {
      offsetSec,
      playDurationSec: Math.min(spec.maxPlaySec, remaining),
    };
  }
  return { offsetSec };
}

export interface AudioWorldContext {
  appMode: AppScreenMode;
  sailingActive: boolean;
  skyZone: SunnySkyZone;
  selectedIslandId: string | null;
  seaRoughness: number;
  rainIntensity: number;
  snowIntensity: number;
  speedKnots: number;
  cameraSurfaceMix: number;
  weatherType: 'cumulus' | 'gray' | 'rain' | 'storm' | 'snow' | null;
}

export function resolveMusicTrackForContext(
  ctx: AudioWorldContext
): MusicSoundId | null {
  if (ctx.appMode === 'loading') return null;
  if (ctx.appMode === 'title' || ctx.appMode === 'quit') {
    return 'music-title';
  }
  if (
    ctx.skyZone === 'subsea-dive' ||
    ctx.skyZone === 'fish-man-island' ||
    (!ctx.sailingActive && ctx.selectedIslandId === 'fish-man-island')
  ) {
    return 'music-fishman';
  }
  if (
    ctx.skyZone === 'skypiea' ||
    ctx.skyZone === 'knock-up-stream' ||
    ctx.skyZone === 'balloon-glide' ||
    (!ctx.sailingActive &&
      (ctx.selectedIslandId === 'skypiea' ||
        ctx.selectedIslandId === 'upper-yard' ||
        ctx.selectedIslandId === 'angel-island' ||
        ctx.selectedIslandId === 'hidden-cloud-village'))
  ) {
    return 'music-skypiea';
  }
  if (ctx.sailingActive || ctx.appMode === 'voyage') {
    if (ctx.weatherType === 'storm' || ctx.seaRoughness >= 0.62) {
      return 'music-voyage-storm';
    }
    return 'music-voyage-calm';
  }
  return 'music-atlas';
}

export interface SeaAmbienceMix {
  calmSeaGain: number;
  roughSeaGain: number;
  rainGain: number;
  windSnowGain: number;
  shipSailGain: number;
}

export function computeSeaAmbienceMix(
  ctx: AudioWorldContext
): SeaAmbienceMix {
  if (ctx.appMode === 'loading') {
    return {
      calmSeaGain: 0,
      roughSeaGain: 0,
      rainGain: 0,
      windSnowGain: 0,
      shipSailGain: 0,
    };
  }

  const rough = Math.max(0, Math.min(1, ctx.seaRoughness));
  const rain = Math.max(0, Math.min(1, ctx.rainIntensity));
  const snow = Math.max(0, Math.min(1, ctx.snowIntensity));
  const surface = Math.max(0, Math.min(1, ctx.cameraSurfaceMix));
  const isSubsea =
    ctx.skyZone === 'subsea-dive' || ctx.skyZone === 'fish-man-island';
  const isSky =
    ctx.skyZone === 'skypiea' ||
    ctx.skyZone === 'knock-up-stream' ||
    ctx.skyZone === 'balloon-glide';

  if (isSubsea) {
    return {
      calmSeaGain: 0.14,
      roughSeaGain: 0,
      rainGain: 0,
      windSnowGain: 0,
      shipSailGain: ctx.sailingActive
        ? Math.min(0.35, ctx.speedKnots / 70)
        : 0,
    };
  }

  if (isSky) {
    return {
      calmSeaGain: 0.04,
      roughSeaGain: 0,
      rainGain: rain * 0.45,
      windSnowGain: 0.25 + snow * 0.5,
      shipSailGain: ctx.sailingActive
        ? Math.min(0.45, 0.1 + ctx.speedKnots / 65)
        : 0,
    };
  }

  if (ctx.appMode === 'title' || ctx.appMode === 'quit') {
    return {
      calmSeaGain: Math.max(0.28, 0.62 * (1 - rough * 0.72)),
      roughSeaGain: rough * 0.62,
      rainGain: rain * 0.55,
      windSnowGain: snow * 0.5,
      shipSailGain: 0.18,
    };
  }

  if (ctx.sailingActive || ctx.appMode === 'voyage') {
    const speedFactor = Math.max(0, Math.min(1, ctx.speedKnots / 42));
    return {
      calmSeaGain: Math.max(0.22, 0.9 * (1 - rough * 0.75)),
      roughSeaGain: Math.pow(rough, 1.05) * 0.95,
      rainGain: rain * 0.85,
      windSnowGain: snow * 0.85,
      shipSailGain: 0.16 + speedFactor * 0.72 + rough * 0.14,
    };
  }

  // Atlas globe view: always keep a soft ocean horizon bed, swelling stronger as camera zooms near water/islands
  const atlasOceanPresence = 0.22 + surface * 0.65;
  return {
    calmSeaGain: atlasOceanPresence * (1 - rough * 0.7),
    roughSeaGain: atlasOceanPresence * rough * 0.88,
    rainGain: surface * rain * 0.72,
    windSnowGain: surface * snow * 0.72,
    shipSailGain: 0,
  };
}

export const UI_AND_SFX_TRACK_IDS: readonly (UiSoundId | SfxSoundId)[] = [
  'ui-menu-click',
  'ui-start-voyage',
  'ui-island-select',
  'ui-modal-open',
  'ui-modal-close',
  'sfx-thunder',
  'sfx-coup-de-burst',
  'sfx-hull-collision',
  'sfx-calm-belt',
  'sfx-reverse-mountain',
  'sfx-knock-up-stream',
  'sfx-octopus-balloon',
  'sfx-coating-bubble',
  'sfx-subsea-dive',
  'sfx-warning-alert',
  'sfx-log-pose-waypoint',
];

interface PendingOneShot {
  id: SfxSoundId | UiSoundId;
  intensity: number;
  expiresAtMs: number;
}

/**
 * Runtime Web Audio + MP3 playback engine with smooth music crossfades,
 * continuous dynamic sea/weather mixing, SFX cooldowns, gesture queueing,
 * pre-decoding, leading-silence trimming, and HTMLAudio fallback.
 */
export class GameAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private musicBusGain: GainNode | null = null;
  private sfxBusGain: GainNode | null = null;

  private rawBuffers = new Map<GameSoundId, ArrayBuffer>();
  private decodedBuffers = new Map<GameSoundId, AudioBuffer>();
  private failedDecodeIds = new Set<GameSoundId>();
  private loadingRaw = new Map<GameSoundId, Promise<ArrayBuffer | null>>();
  private decoding = new Map<GameSoundId, Promise<AudioBuffer | null>>();

  private loopNodes = new Map<
    GameSoundId,
    { source: AudioBufferSourceNode; gain: GainNode }
  >();
  private htmlLoopFallbacks = new Map<GameSoundId, HTMLAudioElement>();
  private pendingLoopTargets = new Map<GameSoundId, number>();
  private lastSfxTimeMs = new Map<GameSoundId, number>();
  private pendingOneShots: PendingOneShot[] = [];
  private predecodedPriority = false;

  private settings: AudioUserSettings;
  private worldContext: AudioWorldContext = {
    appMode: 'loading',
    sailingActive: false,
    skyZone: 'blue-sea',
    selectedIslandId: null,
    seaRoughness: 0,
    rainIntensity: 0,
    snowIntensity: 0,
    speedKnots: 0,
    cameraSurfaceMix: 0.25,
    weatherType: null,
  };
  private unlocked = false;
  private disposed = false;
  private gestureCleanup: (() => void) | null = null;

  constructor(initialSettings?: Partial<AudioUserSettings>) {
    this.settings = {
      musicEnabled:
        initialSettings?.musicEnabled ?? DEFAULT_MUSIC_ENABLED,
      soundVolume: clampAudioVolume(
        initialSettings?.soundVolume ?? DEFAULT_SOUND_VOLUME
      ),
    };
    this.installGestureUnlock();
  }

  private installGestureUnlock(): void {
    if (typeof window === 'undefined') return;
    const onGesture = () => {
      void this.unlockAndResume();
    };
    window.addEventListener('pointerdown', onGesture, {
      passive: true,
      capture: true,
    });
    window.addEventListener('keydown', onGesture, {
      passive: true,
      capture: true,
    });
    window.addEventListener('touchstart', onGesture, {
      passive: true,
      capture: true,
    });
    window.addEventListener('click', onGesture, {
      passive: true,
      capture: true,
    });
    this.gestureCleanup = () => {
      window.removeEventListener('pointerdown', onGesture, { capture: true });
      window.removeEventListener('keydown', onGesture, { capture: true });
      window.removeEventListener('touchstart', onGesture, { capture: true });
      window.removeEventListener('click', onGesture, { capture: true });
    };
  }

  private ensureContext(): AudioContext | null {
    if (this.disposed || typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;
    const AudioCtxCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtxCtor) return null;

    const ctx = new AudioCtxCtor();
    const master = ctx.createGain();
    const musicBus = ctx.createGain();
    const sfxBus = ctx.createGain();

    master.gain.value = clampAudioVolume(this.settings.soundVolume);
    musicBus.gain.value = this.settings.musicEnabled ? 1 : 0;
    sfxBus.gain.value = 1;

    musicBus.connect(master);
    sfxBus.connect(master);

    if (typeof ctx.createDynamicsCompressor === 'function') {
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -6;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.18;
      master.connect(compressor);
      compressor.connect(ctx.destination);
      this.compressor = compressor;
    } else {
      master.connect(ctx.destination);
    }

    this.ctx = ctx;
    this.masterGain = master;
    this.musicBusGain = musicBus;
    this.sfxBusGain = sfxBus;
    return ctx;
  }

  async unlockAndResume(): Promise<void> {
    if (this.disposed) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return;
      }
    }
    this.unlocked = ctx.state === 'running';
    if (this.unlocked) {
      this.syncMixers();
      this.flushPendingOneShots();
      if (!this.predecodedPriority) {
        this.predecodedPriority = true;
        void this.predecodePriorityTracks();
      }
    }
  }

  private async predecodePriorityTracks(): Promise<void> {
    if (this.disposed) return;
    await Promise.all(
      UI_AND_SFX_TRACK_IDS.map((id) =>
        this.getDecodedBuffer(id).catch(() => null)
      )
    );
  }

  async preloadTracks(ids?: readonly GameSoundId[]): Promise<void> {
    if (this.disposed || typeof fetch === 'undefined') return;
    const list = ids ?? ALL_GAME_AUDIO_TRACKS.map((t) => t.id);
    await Promise.all(
      list.map((id) => this.fetchRawTrack(id).catch(() => null))
    );
  }

  private async fetchRawTrack(id: GameSoundId): Promise<ArrayBuffer | null> {
    const cached = this.rawBuffers.get(id);
    if (cached) return cached;
    const inflight = this.loadingRaw.get(id);
    if (inflight) return inflight;

    const spec = GAME_AUDIO_TRACKS[id];
    const promise = fetch(spec.url)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((buf) => {
        if (buf) {
          this.rawBuffers.set(id, buf);
        }
        return buf;
      })
      .catch(() => null)
      .finally(() => {
        this.loadingRaw.delete(id);
      });

    this.loadingRaw.set(id, promise);
    return promise;
  }

  private async getDecodedBuffer(id: GameSoundId): Promise<AudioBuffer | null> {
    if (this.disposed || this.failedDecodeIds.has(id)) return null;
    const existing = this.decodedBuffers.get(id);
    if (existing) return existing;

    const inflight = this.decoding.get(id);
    if (inflight) return inflight;

    const ctx = this.ensureContext();
    if (!ctx) return null;

    const promise = (async () => {
      const raw = await this.fetchRawTrack(id);
      if (!raw || this.disposed) return null;
      try {
        // Clone buffer because decodeAudioData detaches the passed ArrayBuffer
        const copy = raw.slice(0);
        const decoded = await ctx.decodeAudioData(copy);
        if (!this.disposed) {
          this.decodedBuffers.set(id, decoded);
        }
        return decoded;
      } catch {
        this.failedDecodeIds.add(id);
        return null;
      }
    })().finally(() => {
      this.decoding.delete(id);
    });

    this.decoding.set(id, promise);
    return promise;
  }

  private setLoopTargetGain(id: GameSoundId, targetGain: number): void {
    const prev = this.pendingLoopTargets.get(id);
    if (prev !== undefined && Math.abs(prev - targetGain) < 0.002) {
      return;
    }
    this.pendingLoopTargets.set(id, targetGain);

    const ctx = this.ctx;
    if (!ctx || !this.unlocked) return;

    const node = this.loopNodes.get(id);
    if (node) {
      node.gain.gain.setTargetAtTime(
        Math.max(0, targetGain),
        ctx.currentTime,
        0.22
      );
      return;
    }

    const htmlAudio = this.htmlLoopFallbacks.get(id);
    if (htmlAudio) {
      const spec = GAME_AUDIO_TRACKS[id];
      const busMuted = spec.category === 'music' && !this.settings.musicEnabled;
      const vol = busMuted
        ? 0
        : Math.max(0, Math.min(1, targetGain * this.settings.soundVolume));
      htmlAudio.volume = vol;
      if (vol > 0.002 && htmlAudio.paused) {
        void htmlAudio.play().catch(() => undefined);
      } else if (vol <= 0.002 && !htmlAudio.paused) {
        htmlAudio.pause();
      }
      return;
    }

    if (targetGain > 0.003) {
      void this.startLoopChannel(id);
    }
  }

  private async startLoopChannel(id: GameSoundId): Promise<void> {
    if (
      this.disposed ||
      this.loopNodes.has(id) ||
      this.htmlLoopFallbacks.has(id)
    ) {
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBusGain || !this.sfxBusGain) return;

    const buffer = await this.getDecodedBuffer(id);
    if (
      this.disposed ||
      this.loopNodes.has(id) ||
      this.htmlLoopFallbacks.has(id)
    ) {
      return;
    }

    const spec = GAME_AUDIO_TRACKS[id];
    if (!buffer) {
      if (typeof Audio !== 'undefined') {
        const audio = new Audio(spec.url);
        audio.loop = true;
        const target = this.pendingLoopTargets.get(id) ?? 0;
        const busMuted =
          spec.category === 'music' && !this.settings.musicEnabled;
        audio.volume = busMuted
          ? 0
          : Math.max(0, Math.min(1, target * this.settings.soundVolume));
        this.htmlLoopFallbacks.set(id, audio);
        if (audio.volume > 0.002) {
          void audio.play().catch(() => undefined);
        }
      }
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gainNode = ctx.createGain();
    const target = this.pendingLoopTargets.get(id) ?? 0;
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.setTargetAtTime(Math.max(0, target), ctx.currentTime, 0.28);

    source.connect(gainNode);
    gainNode.connect(
      spec.category === 'music' ? this.musicBusGain : this.sfxBusGain
    );
    source.start(0);
    this.loopNodes.set(id, { source, gain: gainNode });
  }

  updateSettings(next: AudioUserSettings): void {
    const clampedVol = clampAudioVolume(next.soundVolume);
    this.settings = {
      musicEnabled: Boolean(next.musicEnabled),
      soundVolume: clampedVol,
    };

    if (this.ctx && this.masterGain && this.musicBusGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(clampedVol, now, 0.05);
      this.musicBusGain.gain.setTargetAtTime(
        this.settings.musicEnabled ? 1 : 0,
        now,
        0.12
      );
    }

    for (const [id, audio] of this.htmlLoopFallbacks.entries()) {
      const spec = GAME_AUDIO_TRACKS[id];
      const target = this.pendingLoopTargets.get(id) ?? 0;
      const busMuted = spec.category === 'music' && !this.settings.musicEnabled;
      audio.volume = busMuted
        ? 0
        : Math.max(0, Math.min(1, target * clampedVol));
    }

    this.syncMixers();
  }

  updateWorldContext(next: AudioWorldContext): void {
    this.worldContext = next;
    this.syncMixers();
  }

  private syncMixers(): void {
    if (this.disposed) return;

    const activeMusic = resolveMusicTrackForContext(this.worldContext);
    for (const id of MUSIC_TRACK_IDS) {
      const spec = GAME_AUDIO_TRACKS[id];
      const gain =
        this.settings.musicEnabled && id === activeMusic ? spec.baseGain : 0;
      this.setLoopTargetGain(id, gain);
    }

    const seaMix = computeSeaAmbienceMix(this.worldContext);
    this.setLoopTargetGain(
      'ambient-sea-calm',
      GAME_AUDIO_TRACKS['ambient-sea-calm'].baseGain * seaMix.calmSeaGain
    );
    this.setLoopTargetGain(
      'ambient-sea-rough',
      GAME_AUDIO_TRACKS['ambient-sea-rough'].baseGain * seaMix.roughSeaGain
    );
    this.setLoopTargetGain(
      'ambient-rain',
      GAME_AUDIO_TRACKS['ambient-rain'].baseGain * seaMix.rainGain
    );
    this.setLoopTargetGain(
      'ambient-wind-snow',
      GAME_AUDIO_TRACKS['ambient-wind-snow'].baseGain * seaMix.windSnowGain
    );
    this.setLoopTargetGain(
      'ambient-ship-sail',
      GAME_AUDIO_TRACKS['ambient-ship-sail'].baseGain * seaMix.shipSailGain
    );
  }

  private flushPendingOneShots(): void {
    if (this.disposed || this.pendingOneShots.length === 0) return;
    const nowMs =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const queue = this.pendingOneShots.splice(0, this.pendingOneShots.length);
    for (const item of queue) {
      if (nowMs <= item.expiresAtMs) {
        void this.triggerOneShot(item.id, item.intensity);
      }
    }
  }

  private playHtmlOneShotFallback(
    id: SfxSoundId | UiSoundId,
    intensity: number
  ): void {
    if (this.disposed || typeof Audio === 'undefined') return;
    const spec = GAME_AUDIO_TRACKS[id];
    const effective = Math.max(
      0,
      Math.min(
        1,
        computeEffectiveSfxGain(
          this.settings.soundVolume,
          spec.baseGain,
          intensity
        )
      )
    );
    if (effective <= 0.001) return;

    const audio = new Audio(spec.url);
    audio.volume = effective;
    const offsetSec = spec.startOffsetSec ?? 0;
    const startPlayback = () => {
      if (offsetSec > 0 && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.min(
          offsetSec,
          Math.max(0, audio.duration - 0.05)
        );
      }
      void audio.play().catch(() => undefined);
    };

    if (offsetSec > 0) {
      audio.addEventListener('loadedmetadata', startPlayback, { once: true });
      void audio.play().catch(() => undefined);
    } else {
      void audio.play().catch(() => undefined);
    }
  }

  playSfx(
    id: SfxSoundId | UiSoundId,
    intensity = 1,
    cooldownMs = 90
  ): void {
    if (this.disposed) return;
    if (clampAudioVolume(this.settings.soundVolume) <= 0.001) return;

    const nowMs =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const prevMs = this.lastSfxTimeMs.get(id) ?? -Infinity;
    if (nowMs - prevMs < cooldownMs) return;
    this.lastSfxTimeMs.set(id, nowMs);

    void this.triggerOneShot(id, intensity);
  }

  private async triggerOneShot(
    id: SfxSoundId | UiSoundId,
    intensity: number
  ): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBusGain || this.disposed) {
      this.playHtmlOneShotFallback(id, intensity);
      return;
    }

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        this.unlocked = (ctx.state as AudioContextState) === 'running';
      } catch {
        // Handled cleanly below
      }
    }

    if ((ctx.state as AudioContextState) !== 'running') {
      const nowMs =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (this.pendingOneShots.length >= 6) {
        this.pendingOneShots.shift();
      }
      this.pendingOneShots.push({
        id,
        intensity,
        expiresAtMs: nowMs + 1400,
      });
      return;
    }

    const buffer = await this.getDecodedBuffer(id);
    if (this.disposed) return;
    if (!buffer) {
      this.playHtmlOneShotFallback(id, intensity);
      return;
    }

    const spec = GAME_AUDIO_TRACKS[id];
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.value = Math.max(
      0,
      Math.min(1.8, spec.baseGain * Math.max(0, intensity))
    );

    source.connect(gainNode);
    gainNode.connect(this.sfxBusGain);
    source.onended = () => {
      try {
        source.disconnect();
        gainNode.disconnect();
      } catch {
        // Ignore already disconnected
      }
    };

    const { offsetSec, playDurationSec } = computePlaybackSlice(
      spec,
      buffer.duration
    );
    if (playDurationSec !== undefined) {
      source.start(0, offsetSec, playDurationSec);
    } else {
      source.start(0, offsetSec);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.gestureCleanup?.();
    this.gestureCleanup = null;
    this.pendingOneShots.length = 0;

    for (const { source, gain } of this.loopNodes.values()) {
      try {
        source.stop();
      } catch {
        // Ignore
      }
      try {
        source.disconnect();
        gain.disconnect();
      } catch {
        // Ignore
      }
    }
    for (const audio of this.htmlLoopFallbacks.values()) {
      try {
        audio.pause();
        audio.src = '';
      } catch {
        // Ignore
      }
    }
    this.loopNodes.clear();
    this.htmlLoopFallbacks.clear();
    this.pendingLoopTargets.clear();
    this.decodedBuffers.clear();
    this.rawBuffers.clear();
    this.failedDecodeIds.clear();
    this.compressor = null;

    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
  }
}
