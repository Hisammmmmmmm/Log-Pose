import { type Vec3 } from './globeMath';

/**
 * Twin Cape sits directly at the eastern Grand Line exit mouth of Reverse Mountain
 * (corresponding to Reverse Mountain local coords lx ≈ 119.8, lz = 0 on GLOBE_RADIUS = 10).
 */
export const TWIN_CAPE_GLOBE_CENTER = { u: 0.5385, v: 0.500 } as const;
export const TWIN_CAPE_GLOBE_SCALE = 0.002;
export const TWIN_CAPE_ANGULAR_MASK_RADIUS = 0.032;

/** Top elevation of the Twin Cape rocky promontories & stone lighthouse aprons (0.11 world units). */
export const TWIN_CAPE_PROMONTORY_Y = 55.0;
export const TWIN_CAPE_APRON_Y = 56.2;

/** Local (tx, tz) centers of the Left (South, +Z) and Right (North, -Z) lighthouses at the mountain exit. */
export const TWIN_CAPE_LEFT_LIGHTHOUSE = { x: -6, z: 115 } as const;
export const TWIN_CAPE_RIGHT_LIGHTHOUSE = { x: -6, z: -115 } as const;

/** Crocus's stone-and-brick house tucked directly behind the Left Lighthouse against the crimson cliff. */
export const TWIN_CAPE_CROCUS_HOUSE = { x: -24, z: 114 } as const;

/** Giant Laboon floating in the Paradise water directly next to the Left Cape promontory. */
export const TWIN_CAPE_LABOON = { x: 42, z: 98, collisionRadius: 34 } as const;

function isInsideEllipse(
  lx: number,
  lz: number,
  cx: number,
  cz: number,
  rx: number,
  rz: number
): boolean {
  const dx = (lx - cx) / rx;
  const dz = (lz - cz) / rz;
  return dx * dx + dz * dz <= 1;
}

/**
 * Returns true if local (lx, lz) lies on either rocky headland terrace flanking the Grand Line mouth.
 */
export function isOnTwinCapePromontory(lx: number, lz: number): boolean {
  if (lx < -54 || lx > 24) return false;
  const az = Math.abs(lz);
  return az >= 78 && az <= 156;
}

/**
 * Walkable deck/terrace elevation in Twin Cape local units for human-scale exploration & Sunny collision.
 */
export function sampleTwinCapeWalkSurfaceHeight(lx: number, lz: number): number {
  if (
    isInsideEllipse(lx, lz, TWIN_CAPE_LEFT_LIGHTHOUSE.x, TWIN_CAPE_LEFT_LIGHTHOUSE.z, 26, 26) ||
    isInsideEllipse(lx, lz, TWIN_CAPE_RIGHT_LIGHTHOUSE.x, TWIN_CAPE_RIGHT_LIGHTHOUSE.z, 22, 22)
  ) {
    return TWIN_CAPE_APRON_Y;
  }
  if (isOnTwinCapePromontory(lx, lz)) {
    return TWIN_CAPE_PROMONTORY_Y;
  }
  return 0;
}

/**
 * Returns true if a ship at sea level in Twin Cape local coordinates (lx, lz) collides with
 * Laboon's body or the submerged rocky skirts of the two flanking cape headlands,
 * while keeping the central Grand Line exit channel (|lz| <= 54) wide open.
 */
export function isTwinCapeSeaObstacle(lx: number, lz: number): boolean {
  // Laboon obstacle in Paradise waters off the Left Cape
  if (
    Math.hypot(lx - TWIN_CAPE_LABOON.x, lz - TWIN_CAPE_LABOON.z) <=
    TWIN_CAPE_LABOON.collisionRadius
  ) {
    return true;
  }

  // Flanking cape cliffs outside the central Grand Line canyon channel
  if (lx >= -60 && lx <= 24 && Math.abs(lz) >= 68 && Math.abs(lz) <= 165) {
    return true;
  }

  return false;
}

/**
 * Projects Twin Cape local (lx, ly, lz) onto curved spherical coordinates around TWIN_CAPE_GLOBE_CENTER
 * with +X = East (toward Paradise), +Y = Up, +Z = South (Left when facing Reverse Mountain).
 */
export function toTwinCapeSphereLocal(
  lx: number,
  ly: number,
  lz: number,
  globeRadius = 10
): Vec3 {
  const sx = lx * TWIN_CAPE_GLOBE_SCALE;
  const sz = lz * TWIN_CAPE_GLOBE_SCALE;
  const d2 = sx * sx + sz * sz;
  const sphereDrop = Math.sqrt(Math.max(0.1, globeRadius * globeRadius - d2));
  const radialScale = (globeRadius + ly * TWIN_CAPE_GLOBE_SCALE) / globeRadius;
  return {
    x: sx * radialScale,
    y: sphereDrop * radialScale - globeRadius,
    z: sz * radialScale,
  };
}

export interface TwinCapeCameraPreset {
  id: string;
  label: string;
  position: readonly [number, number, number];
  target: readonly [number, number, number];
}

export const TWIN_CAPE_CAMERA_PRESETS: readonly TwinCapeCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    position: [375, 138, 12],
    target: [-18, 42, -26],
  },
  {
    id: 'left-lighthouse',
    label: 'Phare Gauche & Maison (Humain)',
    position: [58, 57.95, 178],
    target: [-14, 84, 114],
  },
  {
    id: 'crocus-house',
    label: 'Maison de Crocus (Humain)',
    position: [12, 57.95, 156],
    target: [-21, 67, 120],
  },
  {
    id: 'right-lighthouse',
    label: 'Phare Droit (Humain)',
    position: [58, 57.95, -178],
    target: [-12, 84, -115],
  },
  {
    id: 'laboon',
    label: 'Laboon (Niveau Mer)',
    position: [134, 4.4, 152],
    target: [40, 25, 98],
  },
  {
    id: 'mountain-gate',
    label: 'Entrée Grand Line',
    position: [148, 22, 0],
    target: [-35, 44, 0],
  },
] as const;
