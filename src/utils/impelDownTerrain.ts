import { valueNoise2D } from './globeMath';

export const IMPEL_DOWN_WORLD_SIZE = 280;
export const IMPEL_DOWN_GLOBE_SCALE = 0.0018;
export const IMPEL_DOWN_GLOBE_CENTER = { u: 0.892, v: 0.576 } as const;
export const IMPEL_DOWN_ANGULAR_MASK_RADIUS = 0.032;
export const IMPEL_DOWN_ABYSS_RADIUS = 82.0;
export const IMPEL_DOWN_SEABED_Y = -62.0;

export const IMPEL_OUTER_WALL_RADIUS = 41.5;
export const IMPEL_INNER_DRUM_RADIUS = 24.5;
export const IMPEL_COURTYARD_Y = 14.5;
export const IMPEL_BRIDGE_DECK_Y = 2.6;

export function getImpelAbyssCosThreshold(globeRadius = 10): number {
  return Math.cos((IMPEL_DOWN_ABYSS_RADIUS * IMPEL_DOWN_GLOBE_SCALE) / globeRadius);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function boxSd(
  x: number,
  z: number,
  cx: number,
  cz: number,
  hx: number,
  hz: number
): number {
  const dx = Math.abs(x - cx) - hx;
  const dz = Math.abs(z - cz) - hz;
  return Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dz), 0);
}

export function toImpelSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * IMPEL_DOWN_GLOBE_SCALE;
  const sz = z * IMPEL_DOWN_GLOBE_SCALE;
  const rTarget = globeRadius + y * IMPEL_DOWN_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * Signed distance to the Tarai Current Stone Transit Bridge & Marine Ship Transit Port (+Z axis).
 * Connects the twin-towered outer prison entrance (z = +44) out to the Marine port dock (z = +98).
 */
export function impelTransitBridgeSignedDist(x: number, z: number): number {
  const moatCausewaySd = boxSd(x, z, 0, 34.0, 4.6, 11.0);
  const stoneBridgeSd = boxSd(x, z, 0, 58.0, 5.2, 16.5);
  const transitPortSd = boxSd(x, z, 0, 85.0, 12.8, 13.0);
  return Math.min(moatCausewaySd, stoneBridgeSd, transitPortSd);
}

/**
 * Computes surface-visible Impel Down elevation (meters above sea level) used for terrain/bridge walkability
 * and Sunny coastline hull collision. Returns negative outside the fortress/bridge inside calm waters.
 */
export function sampleImpelHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);

  // Inner courtyard grass/stone floor (surrounded by inner drum wall)
  if (r <= 22.0) {
    return IMPEL_COURTYARD_Y;
  }

  // Tall Inner Cylindrical Fortress Drum Wall (r in 22..26.2)
  if (r <= 26.2) {
    // Open lower sea-gate passage on +Z axis
    if (z > 18 && Math.abs(x) < 4.2) {
      return IMPEL_BRIDGE_DECK_Y;
    }
    return 24.0;
  }

  // Flooded Inner Sea Moat except along front causeway bridge (+Z)
  const bridgeSd = impelTransitBridgeSignedDist(x, z);
  if (r < 38.8) {
    if (bridgeSd < 0.8) {
      return IMPEL_BRIDGE_DECK_Y;
    }
    return -3.2;
  }

  // Outer Crenellated Circular Rampart Ring (r in 38.8..44.5)
  if (r <= 44.5) {
    if (z > 34 && Math.abs(x) < 4.8) {
      return IMPEL_BRIDGE_DECK_Y;
    }
    return 13.5;
  }

  // Great Tarai Current Stone Transit Bridge & Marine Transit Port (+Z)
  if (bridgeSd <= 1.2) {
    const t = 1 - smoothstep(-0.6, 1.2, bridgeSd);
    return -1.0 + (IMPEL_BRIDGE_DECK_Y + 1.0) * t;
  }

  return -1.2;
}

/**
 * Walkable elevation (clamped >= 0 above water for street-scale navigation above bridges & courtyards).
 */
export function sampleImpelWalkSurfaceHeight(x: number, z: number): number {
  return Math.max(0, sampleImpelHeight(x, z));
}

/**
 * Submarine abyssal seabed profile beneath Impel Down (reaches -62m under Calm Belt).
 * Used by the terrain geometry & camera clearance inside the underwater cutaway pit.
 */
export function sampleImpelSeabedHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  if (r >= IMPEL_DOWN_ABYSS_RADIUS) {
    return 0.0;
  }
  const t = 1 - smoothstep(IMPEL_DOWN_ABYSS_RADIUS - 12.0, IMPEL_DOWN_ABYSS_RADIUS, r);
  const rockRipple = (valueNoise2D(x * 0.16 + 4.1, z * 0.16 + 8.3) - 0.5) * 4.2;
  return (IMPEL_DOWN_SEABED_Y + rockRipple) * t;
}

/**
 * Effective ground collision radius height for OrbitControls camera clearance:
 * returns above-water structure height on the surface bridges/citadel, and allows the camera
 * to dive smoothly down to the submarine seabed (-62m) when orbiting underwater levels!
 */
export function sampleImpelCameraFloorHeight(x: number, z: number, camHeightM: number): number {
  const bridgeSd = impelTransitBridgeSignedDist(x, z);
  if (bridgeSd <= 1.5 && camHeightM > -2.0) {
    return IMPEL_BRIDGE_DECK_Y;
  }
  const r = Math.hypot(x, z);
  if (r <= 24.5 && camHeightM > 4.0) {
    return IMPEL_COURTYARD_Y;
  }
  if (camHeightM < -1.5 && r < IMPEL_DOWN_ABYSS_RADIUS) {
    return sampleImpelSeabedHeight(x, z);
  }
  return Math.max(0, sampleImpelHeight(x, z));
}

export interface ImpelMarineShipSpec {
  id: string;
  x: number;
  z: number;
  yaw: number;
  scale: number;
}

/**
 * Encircles Impel Down with a ring of 14 anchored Marine battleships (faithful to image_8651b966.png)
 * while leaving the +Z stone transit bridge & port corridor clear.
 */
export function buildImpelMarineShips(): ImpelMarineShipSpec[] {
  const ships: ImpelMarineShipSpec[] = [];
  const totalCount = 16;
  for (let i = 0; i < totalCount; i++) {
    // Distributed around 360°; skip directly inside the stone transit port corridor
    const angle = (i / totalCount) * Math.PI * 2 + 0.19;
    const dist = 56.0 + (i % 2) * 5.2;
    const x = Math.sin(angle) * dist;
    const z = Math.cos(angle) * dist;
    if (z > 42 && Math.abs(x) < 16.5) continue;
    ships.push({
      id: `impel-battleship-${ships.length}`,
      x,
      z,
      yaw: angle + Math.PI * 0.52,
      scale: 0.94 + ((i * 7) % 5) * 0.04,
    });
  }
  return ships;
}

export interface ImpelPrisonLevelSpec {
  level: number;
  name: string;
  yTop: number;
  yBottom: number;
  radius: number;
  wallColor: number;
  accentColor: number;
  emissiveColor: number;
  emissiveIntensity: number;
}

/**
 * The 6 colossal submerged subterranean prison levels descending into Calm Belt abyss.
 */
export const IMPEL_SUBMARINE_LEVELS: readonly ImpelPrisonLevelSpec[] = [
  {
    level: 1,
    name: 'Niveau 1 · Enfer Écarlate',
    yTop: -3.5,
    yBottom: -12.0,
    radius: 23.8,
    wallColor: 0x7c3b3b,
    accentColor: 0xb91c1c,
    emissiveColor: 0x661212,
    emissiveIntensity: 0.28,
  },
  {
    level: 2,
    name: 'Niveau 2 · Enfer des Bêtes Féroces',
    yTop: -12.0,
    yBottom: -20.5,
    radius: 22.8,
    wallColor: 0x6f5b46,
    accentColor: 0xd97706,
    emissiveColor: 0x5c3610,
    emissiveIntensity: 0.25,
  },
  {
    level: 3,
    name: 'Niveau 3 · Enfer de la Faim',
    yTop: -20.5,
    yBottom: -29.0,
    radius: 21.8,
    wallColor: 0x9b8059,
    accentColor: 0xca8a04,
    emissiveColor: 0x634814,
    emissiveIntensity: 0.22,
  },
  {
    level: 4,
    name: 'Niveau 4 · Enfer des Flammes',
    yTop: -29.0,
    yBottom: -38.5,
    radius: 22.6,
    wallColor: 0x45221a,
    accentColor: 0xff5a1f,
    emissiveColor: 0xff4500,
    emissiveIntensity: 0.85,
  },
  {
    level: 5,
    name: 'Niveau 5 · Enfer des Glaces',
    yTop: -38.5,
    yBottom: -47.5,
    radius: 21.4,
    wallColor: 0x688ba6,
    accentColor: 0x7dd3fc,
    emissiveColor: 0x38bdf8,
    emissiveIntensity: 0.55,
  },
  {
    level: 6,
    name: 'Niveau 6 · Enfer Infini',
    yTop: -47.5,
    yBottom: -58.5,
    radius: 20.4,
    wallColor: 0x262936,
    accentColor: 0x818cf8,
    emissiveColor: 0x312e81,
    emissiveIntensity: 0.45,
  },
] as const;

export interface ImpelSeaKingSpec {
  id: string;
  orbitRadius: number;
  depthY: number;
  speed: number;
  phaseOffset: number;
  lengthScale: number;
  bodyColor: number;
  bellyColor: number;
}

export const IMPEL_SEA_KINGS: readonly ImpelSeaKingSpec[] = [
  {
    id: 'seaking-leviathan-alpha',
    orbitRadius: 38.5,
    depthY: -18.0,
    speed: 0.22,
    phaseOffset: 0.2,
    lengthScale: 1.15,
    bodyColor: 0x1b4f5e,
    bellyColor: 0x87b8be,
  },
  {
    id: 'seaking-crimson-eel',
    orbitRadius: 46.0,
    depthY: -31.0,
    speed: -0.18,
    phaseOffset: 2.1,
    lengthScale: 1.28,
    bodyColor: 0x4a293f,
    bellyColor: 0xb87686,
  },
  {
    id: 'seaking-abyss-drake',
    orbitRadius: 42.0,
    depthY: -44.0,
    speed: 0.15,
    phaseOffset: 4.3,
    lengthScale: 1.1,
    bodyColor: 0x214a39,
    bellyColor: 0x7cb89a,
  },
  {
    id: 'seaking-horn-whale',
    orbitRadius: 53.0,
    depthY: -24.0,
    speed: -0.14,
    phaseOffset: 5.2,
    lengthScale: 1.05,
    bodyColor: 0x2b3e58,
    bellyColor: 0x9bb2cc,
  },
] as const;

export interface ImpelTreeSpec {
  x: number;
  y: number;
  z: number;
  scale: number;
}

/**
 * Trees filling the inner green forest ring surrounding the 3-tower Gateway citadel.
 */
export function buildImpelForestTrees(): ImpelTreeSpec[] {
  const trees: ImpelTreeSpec[] = [];
  const rings = [11.5, 15.2, 19.0];
  rings.forEach((radius, rIdx) => {
    const count = 12 + rIdx * 6;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + rIdx * 0.25;
      const jitter = (valueNoise2D(Math.cos(ang) * 4 + rIdx, Math.sin(ang) * 4) - 0.5) * 1.4;
      const tx = Math.sin(ang) * (radius + jitter);
      const tz = Math.cos(ang) * (radius + jitter);
      // Keep Gateway entrance path (+Z) open
      if (tz > 8 && Math.abs(tx) < 3.4) continue;
      trees.push({
        x: tx,
        y: IMPEL_COURTYARD_Y,
        z: tz,
        scale: 0.85 + (i % 3) * 0.2,
      });
    }
  });
  return trees;
}

export interface ImpelDownCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

export const IMPEL_DOWN_CAMERA_PRESETS: ImpelDownCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle: 'Impel Down · Double enceinte, Flotte Marine, Pont du Tarai Current & Calm Belt',
    position: [54, 72, 126],
    target: [0, 0, 10],
    isStreetView: false,
  },
  {
    id: 'gateway-bridge',
    label: 'Pont Tarai & Port',
    subtitle: 'Grand pont de pierre entre le port de transit Marine et le Gateway',
    position: [0, 5.2, 90],
    target: [0, 14.0, 26],
    isStreetView: true,
  },
  {
    id: 'inner-courtyard',
    label: 'Gateway & Funiculaire',
    subtitle: 'Forêt intérieure, citadelle à 3 tours et départ du funiculaire',
    position: [0, 17.5, 20.0],
    target: [0, 22.5, 0],
    isStreetView: true,
  },
  {
    id: 'underwater-levels',
    label: 'Niveaux Sous-Marins',
    subtitle: 'Les 6 Enfers immergés, câble du funiculaire et Rois des Mers',
    position: [58, -24, 34],
    target: [0, -29, 0],
    isStreetView: false,
  },
  {
    id: 'tarai-triangle',
    label: 'Triangle du Tarai Current',
    subtitle: 'Vue orbitale du triangle fermé reliant Impel Down, Marineford et Enies Lobby',
    position: [120, 920, 740],
    target: [0, 0, 520],
    isStreetView: false,
  },
];
