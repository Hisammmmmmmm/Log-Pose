import {
  createPlaceholderIslandMesh,
  type IslandMeshContext,
  type IslandMeshInstance,
} from './types';

/** Spider Miles — currently uses procedural globe terrain relief as placeholder. */
export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance | null {
  return createPlaceholderIslandMesh(ctx);
}
