export interface LoadingIslandInfo {
  id: string;
  name: string;
}

const SUB_ISLAND_PARENT_MAP: Record<string, string> = {
  alubarna: 'alabasta',
  rainbase: 'alabasta',
  nanohana: 'alabasta',
  elumalu: 'alabasta',
  tamarisk: 'alabasta',
  'upper-yard': 'skypiea',
  'angel-island': 'skypiea',
  'hidden-cloud-village': 'skypiea',
  'arlong-park': 'conomi-islands',
  'cocoyashi-village': 'conomi-islands',
  'gosa-village': 'conomi-islands',
  'syrup-village': 'gecko-islands',
  'honey-town': 'gecko-islands',
  'black-cat-beach': 'gecko-islands',
  'foosha-village': 'dawn-island',
  'goa-kingdom': 'dawn-island',
  'yotsuba-island': 'shells-town',
  'orange-town': 'organ-island',
};

export function resolveParentStreamedIslandId(islandId: string): string {
  return SUB_ISLAND_PARENT_MAP[islandId] ?? islandId;
}

export function isSelectedIslandLoading(
  selectedIslandId: string | null | undefined,
  loadingIslands: readonly LoadingIslandInfo[]
): boolean {
  if (!selectedIslandId || loadingIslands.length === 0) return false;
  const parentId = resolveParentStreamedIslandId(selectedIslandId);
  return loadingIslands.some(
    (item) => item.id === selectedIslandId || item.id === parentId
  );
}

export function formatIslandLoadingLabel(
  loadingIslands: readonly LoadingIslandInfo[]
): string {
  if (loadingIslands.length === 0) return '';
  const first = loadingIslands[0];
  if (loadingIslands.length === 1) {
    return `Chargement de ${first.name}…`;
  }
  return `Chargement de ${first.name} (+${loadingIslands.length - 1})…`;
}
