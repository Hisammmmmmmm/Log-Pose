import type { IslandMeshBuilder } from './types';
import { createIslandMesh as buildReverseMountain } from './reverse-mountain';
import { createIslandMesh as buildTwinCape } from './twin-cape';

export const CUSTOM_3D_ISLAND_IDS = new Set<string>([
  'alabasta',
  'skypiea',
  'water-7',
  'marineford',
  'polestar-islands',
  'conomi-islands',
  'gecko-islands',
  'dawn-island',
  'goat-island',
  'shells-town',
  'organ-island',
  'shimotsuki',
  'baratie',
  'wano',
  'drum-island',
  'mary-geoise',
  'reverse-mountain',
  'twin-cape',
  'little-garden',
  'cactus-island',
  'jaya',
  'long-ring-long-land',
  'shift-station',
  'pucci-island',
  'san-faldo',
  'st-poplar',
  'enies-lobby',
  'impel-down',
  'amazon-lily',
  'thriller-bark',
  'sabaody',
  'fish-man-island',
  'punk-hazard',
  'dressrosa',
  'whole-cake-island',
  'zou',
  'egghead-island',
  'elbaf',
]);

/**
 * Heavy bespoke city islands that only load when zoomed in, selected,
 * or approached closely by the Thousand Sunny.
 */
export const HEAVY_CITY_ISLAND_IDS = new Set<string>([
  'alabasta',
  'skypiea',
  'water-7',
  'marineford',
  'polestar-islands',
  'conomi-islands',
  'gecko-islands',
  'dawn-island',
  'goat-island',
  'shells-town',
  'organ-island',
  'shimotsuki',
  'baratie',
  'wano',
  'little-garden',
  'cactus-island',
  'drum-island',
  'jaya',
  'long-ring-long-land',
  'pucci-island',
  'san-faldo',
  'st-poplar',
  'enies-lobby',
  'impel-down',
  'amazon-lily',
  'thriller-bark',
  'sabaody',
  'mary-geoise',
  'fish-man-island',
  'punk-hazard',
  'dressrosa',
  'whole-cake-island',
  'zou',
  'egghead-island',
  'elbaf',
]);

const builderLoaders: Record<string, () => Promise<IslandMeshBuilder>> = {
  alabasta: () => import('./alabasta').then((m) => m.createIslandMesh),
  skypiea: () => import('./skypiea').then((m) => m.createIslandMesh),
  'water-7': () => import('./water-7').then((m) => m.createIslandMesh),
  marineford: () => import('./marineford').then((m) => m.createIslandMesh),
  'polestar-islands': () => import('./loguetown').then((m) => m.createIslandMesh),
  'conomi-islands': () => import('./conomi').then((m) => m.createIslandMesh),
  'gecko-islands': () => import('./gecko').then((m) => m.createIslandMesh),
  'dawn-island': () => import('./dawn').then((m) => m.createIslandMesh),
  'goat-island': () => import('./goat').then((m) => m.createIslandMesh),
  'shells-town': () => import('./shellsTown').then((m) => m.createIslandMesh),
  'organ-island': () => import('./organ').then((m) => m.createIslandMesh),
  shimotsuki: () => import('./shimotsuki').then((m) => m.createIslandMesh),
  baratie: () => import('./baratie').then((m) => m.createIslandMesh),
  wano: () => import('./wano').then((m) => m.createIslandMesh),
  'little-garden': () => import('./little-garden').then((m) => m.createIslandMesh),
  'cactus-island': () => import('./cactus-island').then((m) => m.createIslandMesh),
  'drum-island': () => import('./drum-island').then((m) => m.createIslandMesh),
  jaya: () => import('./jaya').then((m) => m.createIslandMesh),
  'long-ring-long-land': () =>
    import('./long-ring-long-land').then((m) => m.createIslandMesh),
  'shift-station': () =>
    import('./shift-station').then((m) => m.createIslandMesh),
  'pucci-island': () =>
    import('./pucci-island').then((m) => m.createIslandMesh),
  'san-faldo': () => import('./san-faldo').then((m) => m.createIslandMesh),
  'st-poplar': () => import('./st-poplar').then((m) => m.createIslandMesh),
  'enies-lobby': () => import('./enies-lobby').then((m) => m.createIslandMesh),
  'impel-down': () => import('./impel-down').then((m) => m.createIslandMesh),
  'amazon-lily': () => import('./amazon-lily').then((m) => m.createIslandMesh),
  'thriller-bark': () => import('./thriller-bark').then((m) => m.createIslandMesh),
  sabaody: () => import('./sabaody').then((m) => m.createIslandMesh),
  'mary-geoise': () => import('./mary-geoise').then((m) => m.createIslandMesh),
  'fish-man-island': () => import('./fish-man-island').then((m) => m.createIslandMesh),
  'punk-hazard': () => import('./punk-hazard').then((m) => m.createIslandMesh),
  dressrosa: () => import('./dressrosa').then((m) => m.createIslandMesh),
  'whole-cake-island': () =>
    import('./whole-cake-island').then((m) => m.createIslandMesh),
  zou: () => import('./zou').then((m) => m.createIslandMesh),
  'egghead-island': () => import('./egghead').then((m) => m.createIslandMesh),
  elbaf: () => import('./elbaf').then((m) => m.createIslandMesh),
};

const builderCache = new Map<string, IslandMeshBuilder>([
  ['reverse-mountain', buildReverseMountain],
  ['twin-cape', buildTwinCape],
]);
const inFlightCache = new Map<string, Promise<IslandMeshBuilder | null>>();

export function hasCustomIslandBuilder(islandId: string): boolean {
  return CUSTOM_3D_ISLAND_IDS.has(islandId);
}

export function getCachedIslandBuilder(
  islandId: string
): IslandMeshBuilder | null {
  return builderCache.get(islandId) ?? null;
}

export async function loadIslandBuilder(
  islandId: string
): Promise<IslandMeshBuilder | null> {
  const cached = builderCache.get(islandId);
  if (cached) return cached;

  const existingPromise = inFlightCache.get(islandId);
  if (existingPromise) return existingPromise;

  const loader = builderLoaders[islandId];
  if (!loader) return null;

  const promise = loader()
    .then((builder) => {
      builderCache.set(islandId, builder);
      inFlightCache.delete(islandId);
      return builder;
    })
    .catch((err) => {
      inFlightCache.delete(islandId);
      throw err;
    });

  inFlightCache.set(islandId, promise);
  return promise;
}
