import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import { createIslandMesh as buildAlabasta } from './alabasta';
import { createIslandMesh as buildCactusIsland } from './cactus-island';
import { createIslandMesh as buildConomi } from './conomi';
import { createIslandMesh as buildDawn } from './dawn';
import { createIslandMesh as buildDrumIsland } from './drum-island';
import { createIslandMesh as buildFishManIsland } from './fish-man-island';
import { createIslandMesh as buildGecko } from './gecko';
import { createIslandMesh as buildGoat } from './goat';
import { createIslandMesh as buildLoguetown } from './loguetown';
import { createIslandMesh as buildMarineford } from './marineford';
import { createIslandMesh as buildMaryGeoise } from './mary-geoise';
import { createIslandMesh as buildOrgan } from './organ';
import { createIslandMesh as buildReverseMountain } from './reverse-mountain';
import { createIslandMesh as buildShellsTown } from './shellsTown';
import { createIslandMesh as buildShimotsuki } from './shimotsuki';
import { createIslandMesh as buildSkypiea } from './skypiea';
import { createIslandMesh as buildWano } from './wano';
import { createIslandMesh as buildWater7 } from './water-7';
import {
  createPlaceholderIslandMesh,
  createSharedIslandMaterials,
  type IslandMeshBuilder,
  type IslandMeshContext,
  type IslandMeshInstance,
  type SharedIslandMaterials,
} from './types';

export {
  createSharedIslandMaterials,
  type IslandMeshBuilder,
  type IslandMeshContext,
  type IslandMeshInstance,
  type SharedIslandMaterials,
};

const CUSTOM_BUILDERS: Record<string, IslandMeshBuilder> = {
  'reverse-mountain': buildReverseMountain,
  'mary-geoise': buildMaryGeoise,
  'fish-man-island': buildFishManIsland,
  'drum-island': buildDrumIsland,
  alabasta: buildAlabasta,
  skypiea: buildSkypiea,
  'water-7': buildWater7,
  marineford: buildMarineford,
  'polestar-islands': buildLoguetown,
  'conomi-islands': buildConomi,
  'gecko-islands': buildGecko,
  'dawn-island': buildDawn,
  'goat-island': buildGoat,
  'shells-town': buildShellsTown,
  'organ-island': buildOrgan,
  shimotsuki: buildShimotsuki,
  wano: buildWano,
  'cactus-island': buildCactusIsland,
};

export const ISLAND_MESH_BUILDERS: Record<string, IslandMeshBuilder> =
  Object.fromEntries(
    ONE_PIECE_LOCATIONS.map((loc) => [
      loc.id,
      CUSTOM_BUILDERS[loc.id] ?? createPlaceholderIslandMesh,
    ])
  );

export interface BuiltIslandEntry {
  island: { id: string; name: string };
  instance: IslandMeshInstance;
}
