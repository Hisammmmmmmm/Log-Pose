import type { IslandLocation, SeaRegion } from './globeMath';
import type { SunnyCameraMode } from './sunnyNavigation';

export type AppScreenMode = 'loading' | 'title' | 'atlas' | 'voyage' | 'quit';
export type ActiveMenuModal = 'journal' | 'settings' | null;

export const LUFFY_START_ISLAND_ID = 'foosha-village';
export const LUFFY_START_FALLBACK_ID = 'dawn-island';

export interface GameSettingsState {
  timeOfDay: number;
  cloudCover: number;
  showLabels: boolean;
  sunnyCameraMode: SunnyCameraMode;
  musicEnabled: boolean;
  soundVolume: number;
}

export const DEFAULT_GAME_SETTINGS: GameSettingsState = {
  timeOfDay: 13.5,
  cloudCover: 0.8,
  showLabels: true,
  sunnyCameraMode: 'navigator',
  musicEnabled: true,
  soundVolume: 0.75,
};

export function formatSoundVolume(volume: number): string {
  const clamped = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0;
  return `${Math.round(clamped * 100)}%`;
}

export const JOURNAL_REGIONS: readonly (SeaRegion | 'All')[] = [
  'All',
  'East Blue',
  'Paradise',
  'New World',
  'Red Line',
  'Calm Belt',
  'North Blue',
  'South Blue',
  'West Blue',
];

export const JOURNAL_REGION_LABELS: Record<SeaRegion | 'All', string> = {
  All: 'Toutes les mers',
  'East Blue': 'East Blue',
  Paradise: 'Paradise (Grand Line)',
  'New World': 'Nouveau Monde',
  'Red Line': 'Red Line',
  'Calm Belt': 'Calm Belt',
  'North Blue': 'North Blue',
  'South Blue': 'South Blue',
  'West Blue': 'West Blue',
};

/**
 * Resolves Luffy's first departure island (Foosha Village on Dawn Island)
 * for starting Voyage mode cleanly from the start screen.
 */
export function resolveLuffyStartIsland(
  locations: readonly IslandLocation[]
): IslandLocation | null {
  return (
    locations.find((loc) => loc.id === LUFFY_START_ISLAND_ID) ??
    locations.find((loc) => loc.id === LUFFY_START_FALLBACK_ID) ??
    locations[0] ??
    null
  );
}

/**
 * Parses URL query string to support `?autostart=1` direct launch into gameplay/atlas.
 */
export function shouldAutoStartFromSearch(search: string): boolean {
  if (!search) return false;
  const params = new URLSearchParams(search);
  return params.get('autostart') === '1' || params.get('autostart') === 'true';
}

/**
 * Maps current screen mode & modal state to standardized `document.body.dataset.state`
 * values (`loading`, `title`, `playing`, `paused`) for automated verification & focus handling.
 */
export function resolveDocumentBodyState(
  mode: AppScreenMode,
  modal: ActiveMenuModal
): 'loading' | 'title' | 'playing' | 'paused' {
  if (mode === 'loading') return 'loading';
  if (mode === 'quit') return 'paused';
  if (mode === 'title') return modal ? 'paused' : 'title';
  return modal ? 'paused' : 'playing';
}

/**
 * Filters charted islands for the Journal de bord encyclopedia.
 */
export function filterJournalIslands(
  locations: readonly IslandLocation[],
  query: string,
  region: SeaRegion | 'All' = 'All'
): IslandLocation[] {
  const q = query.trim().toLowerCase();
  return locations.filter((island) => {
    if (region !== 'All' && island.region !== region) {
      return false;
    }
    if (!q) return true;
    return (
      island.name.toLowerCase().includes(q) ||
      island.subtitle.toLowerCase().includes(q) ||
      island.arc.toLowerCase().includes(q) ||
      island.region.toLowerCase().includes(q) ||
      island.description.toLowerCase().includes(q)
    );
  });
}

/**
 * Computes total count per region for quick encyclopedia tabs.
 */
export function countJournalRegions(
  locations: readonly IslandLocation[]
): Record<SeaRegion | 'All', number> {
  const counts: Record<SeaRegion | 'All', number> = {
    All: locations.length,
    'East Blue': 0,
    Paradise: 0,
    'New World': 0,
    'Red Line': 0,
    'Calm Belt': 0,
    'North Blue': 0,
    'South Blue': 0,
    'West Blue': 0,
  };
  for (const loc of locations) {
    counts[loc.region] = (counts[loc.region] ?? 0) + 1;
  }
  return counts;
}
