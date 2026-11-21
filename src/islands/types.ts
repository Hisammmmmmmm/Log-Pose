import * as THREE from 'three';
import type { IslandLocation } from '../utils/globeMath';

export interface SharedIslandMaterials {
  cloudWhite: THREE.MeshStandardMaterial;
  golden: THREE.MeshStandardMaterial;
  marble: THREE.MeshStandardMaterial;
  darkSlate: THREE.MeshStandardMaterial;
  snow: THREE.MeshStandardMaterial;
  waterVortex: THREE.MeshStandardMaterial;
}

export interface IslandMeshContext {
  island: IslandLocation;
  globeRadius: number;
  surfaceRadius: number;
  materials: SharedIslandMaterials;
  trackGeo: <T extends THREE.BufferGeometry>(geo: T) => T;
  trackMat: <T extends THREE.Material>(mat: T) => T;
  trackTex?: <T extends THREE.Texture>(tex: T) => T;
}

export interface IslandMeshInstance {
  group: THREE.Group;
  /** Radius from planet center where the group's local origin should sit. */
  radius: number;
  /** 'default' aligns local +Y to surface normal; 'cardinal' aligns +X=East, +Y=Up, +Z=South. */
  orientMode?: 'default' | 'cardinal';
  /** Optional tangent-plane yaw rotation (radians around local +Y) applied after cardinal basis alignment. */
  orientYawRad?: number;
  /** Optional per-frame animation & LOD hook. */
  update?: (elapsed: number, distToCamera?: number) => void;
}

export type IslandMeshBuilder = (
  ctx: IslandMeshContext
) => IslandMeshInstance | null;

/**
 * Default placeholder builder for islands without a bespoke 3D model yet.
 * Returns `null` so the procedural 3D terrain relief & scatter on the globe
 * acts as the placeholder until custom geometry is authored in the island's file.
 */
export function createPlaceholderIslandMesh(
  _ctx: IslandMeshContext
): IslandMeshInstance | null {
  return null;
}

export function createSharedIslandMaterials(
  trackMat: <T extends THREE.Material>(mat: T) => T
): SharedIslandMaterials {
  return {
    cloudWhite: trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf1f7ff,
        roughness: 0.9,
        metalness: 0.0,
      })
    ),
    golden: trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf3c65f,
        roughness: 0.25,
        metalness: 0.78,
      })
    ),
    marble: trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe9e4d9,
        roughness: 0.55,
        metalness: 0.1,
      })
    ),
    darkSlate: trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x627082,
        roughness: 0.85,
        metalness: 0.08,
        flatShading: true,
      })
    ),
    snow: trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf8fbff,
        roughness: 0.7,
        metalness: 0.02,
      })
    ),
    waterVortex: trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x5eead4,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.55,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.82,
      })
    ),
  };
}

