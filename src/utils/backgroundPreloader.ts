/**
 * Prioritized, cooperative background asset preloader for the Log Pose start screen.
 * Staggers module chunk imports and optional 3D mesh warm-up across idle frames so
 * the start screen animations and WebGL intro loop remain responsive without freezing.
 */

export const PRIORITY_ISLAND_PRELOAD_ORDER: readonly string[] = [
  // Luffy's starting island & early East Blue
  'dawn-island',
  'goat-island',
  'shells-town',
  'organ-island',
  'shimotsuki',
  'gecko-islands',
  'baratie',
  'conomi-islands',
  'polestar-islands',
  // Reverse Mountain & Paradise route
  'reverse-mountain',
  'twin-cape',
  'cactus-island',
  'little-garden',
  'drum-island',
  'alabasta',
  'jaya',
  'skypiea',
  'long-ring-long-land',
  'water-7',
  'shift-station',
  'pucci-island',
  'san-faldo',
  'st-poplar',
  'enies-lobby',
  'thriller-bark',
  'sabaody',
  'amazon-lily',
  'impel-down',
  'marineford',
  'mary-geoise',
  'fish-man-island',
  'punk-hazard',
  'dressrosa',
  'zou',
  'whole-cake-island',
  'wano',
];

export type StartupPreloadPhase = 'map' | 'islands' | 'ready' | 'error';

export interface StartupPreloadState {
  phase: StartupPreloadPhase;
  /** Normalized progress in [0..1]. */
  progress: number;
  completedIslands: number;
  totalIslands: number;
  currentLabel: string;
  currentDetail: string;
}

export function computeStartupPreloadProgress(params: {
  mapFraction: number;
  fontsReady: boolean;
  completedIslands: number;
  totalIslands: number;
  phase: StartupPreloadPhase;
}): number {
  const { mapFraction, fontsReady, completedIslands, totalIslands, phase } =
    params;
  if (phase === 'ready') return 1;
  const clampedMap = Math.max(0, Math.min(1, mapFraction));
  const mapWeight = clampedMap * 0.18;
  const fontsWeight = fontsReady ? 0.02 : 0;
  const islandRatio =
    totalIslands > 0
      ? Math.max(0, Math.min(1, completedIslands / totalIslands))
      : 0;
  const islandWeight = islandRatio * 0.78;
  return Math.max(0, Math.min(0.99, mapWeight + fontsWeight + islandWeight));
}

export interface PreloadQueueProgress {
  completed: number;
  total: number;
  lastLoadedId: string | null;
}

export interface CooperativePreloadOptions {
  /** Island IDs to preload in priority order. */
  islandIds: readonly string[];
  /** Async task invoked for each island ID (e.g., module import or quiet mesh build). */
  loadTask: (islandId: string) => Promise<void>;
  /** Initial delay before starting so intro animations finish smoothly. */
  initialDelayMs?: number;
  /** Minimum delay between consecutive tasks to avoid starving WebGL/UI frames. */
  stepDelayMs?: number;
  /** Optional abort signal or check to stop preloading immediately on mode exit. */
  shouldStop?: () => boolean;
  /** Optional progress callback. */
  onProgress?: (progress: PreloadQueueProgress) => void;
  /** Injectable scheduler hook for deterministic unit testing. */
  scheduleStep?: (fn: () => void, delayMs: number) => () => void;
}

export function buildOrderedPreloadIds(
  availableIds: Iterable<string>,
  priorityOrder: readonly string[] = PRIORITY_ISLAND_PRELOAD_ORDER
): string[] {
  const available = new Set(availableIds);
  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const id of priorityOrder) {
    if (available.has(id) && !seen.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  }
  for (const id of available) {
    if (!seen.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  }
  return ordered;
}

function defaultScheduleStep(fn: () => void, delayMs: number): () => void {
  let idleHandle: number | null = null;
  const timer = globalThis.setTimeout(() => {
    const ric = (
      globalThis as unknown as {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number }
        ) => number;
      }
    ).requestIdleCallback;
    if (typeof ric === 'function') {
      idleHandle = ric(fn, { timeout: Math.max(120, delayMs) });
    } else {
      fn();
    }
  }, delayMs);

  return () => {
    globalThis.clearTimeout(timer);
    if (idleHandle !== null) {
      const cic = (
        globalThis as unknown as { cancelIdleCallback?: (id: number) => void }
      ).cancelIdleCallback;
      if (typeof cic === 'function') {
        cic(idleHandle);
      }
    }
  };
}

/**
 * Starts a sequential, cooperative background preload loop that yields between
 * every asset and supports clean cancellation.
 */
export function startCooperativePreloadQueue(
  options: CooperativePreloadOptions
): { cancel: () => void; done: Promise<PreloadQueueProgress> } {
  const {
    islandIds,
    loadTask,
    initialDelayMs = 450,
    stepDelayMs = 140,
    shouldStop,
    onProgress,
    scheduleStep = defaultScheduleStep,
  } = options;

  let cancelled = false;
  let cancelPendingSchedule: (() => void) | null = null;
  let index = 0;
  let completed = 0;
  const total = islandIds.length;

  const isStopped = () => cancelled || Boolean(shouldStop?.());

  const done = new Promise<PreloadQueueProgress>((resolve) => {
    const finish = (lastLoadedId: string | null) => {
      resolve({ completed, total, lastLoadedId });
    };

    if (total === 0) {
      finish(null);
      return;
    }

    const runNext = () => {
      if (isStopped() || index >= total) {
        finish(index > 0 ? islandIds[index - 1] ?? null : null);
        return;
      }

      const id = islandIds[index++];
      Promise.resolve()
        .then(() => loadTask(id))
        .catch(() => {
          // Background preloading is best-effort; never reject the menu queue
        })
        .finally(() => {
          if (isStopped()) {
            finish(id);
            return;
          }
          completed += 1;
          onProgress?.({ completed, total, lastLoadedId: id });
          if (index >= total) {
            finish(id);
          } else {
            cancelPendingSchedule = scheduleStep(runNext, stepDelayMs);
          }
        });
    };

    cancelPendingSchedule = scheduleStep(runNext, initialDelayMs);
  });

  return {
    cancel: () => {
      cancelled = true;
      cancelPendingSchedule?.();
      cancelPendingSchedule = null;
    },
    done,
  };
}
