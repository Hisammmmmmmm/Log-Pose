export const BARATIE_GLOBE_SCALE = 0.002;
export const BARATIE_GLOBE_CENTER = { u: 0.748, v: 0.358 } as const;
/**
 * Small open-sea clearing mask around Baratie (u: 0.748, v: 0.358) in East Blue's Sambas region.
 * Nearest neighbors are Sixis (u: 0.856, v: 0.358) and Oykot (u: 0.668, v: 0.365) — far away.
 */
export const BARATIE_ANGULAR_MASK_RADIUS = 0.024;
/**
 * Aligns Baratie local y=0 waterline flush with the 160x80 ocean sphere facet
 * at (u=0.748, v=0.358) where triangle chord sag sits ~0.95m below R=10.
 */
export const BARATIE_SPHERE_SEA_OFFSET = -0.12;

export const BARATIE_FIN_DECK_Y = 0.55;
export const BARATIE_MAIN_DECK_Y = 0.85;
export const BARATIE_TIER2_DECK_Y = 4.65;
export const BARATIE_TIER3_DECK_Y = 8.40;
export const BARATIE_QUARTER_DECK_Y = 4.65;

export interface BaratieCameraPreset {
  id: string;
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
  isStreetView: boolean;
}

export const BARATIE_LANDMARKS = {
  fishMouthTip: { x: -25.8, y: 2.3, z: 0 },
  fishHeadCenter: { x: -19.2, y: 3.1, z: 0 },
  mainEntrance: { x: 1.6, y: BARATIE_MAIN_DECK_Y, z: 6.85 },
  gangplankMat: { x: 1.6, y: BARATIE_FIN_DECK_Y, z: 10.6 },
  foreMast: { x: -11.0, y: BARATIE_MAIN_DECK_Y, z: 0 },
  aftMast: { x: 11.2, y: BARATIE_MAIN_DECK_Y, z: 0 },
  chimney: { x: 3.8, y: 14.5, z: 0 },
  tailFinCenter: { x: 21.4, y: 5.2, z: 0 },
  starboardFinCenter: { x: 0.2, y: BARATIE_FIN_DECK_Y, z: 13.8 },
  portFinCenter: { x: 0.2, y: BARATIE_FIN_DECK_Y, z: -13.8 },
} as const;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Half-width (Z extent) of the main ship hull at longitudinal coordinate x.
 * Bow (-X) tapers toward fish collar at x=-14.5, stern (+X) rounds off around x=+15.5.
 */
export function baratieMainHullHalfWidth(x: number): number {
  if (x < -14.8 || x > 16.0) return 0;
  const t = (x + 14.8) / 30.8; // 0 at bow, 1 at stern
  const profile = Math.sin(clamp(t, 0, 1) * Math.PI);
  // Broad midship belly with rounded bow & stern
  return 8.1 * Math.pow(profile, 0.42);
}

/**
 * Returns true if (x, z) lies on either the Starboard (+Z) or Port (-Z)
 * deployed curved wooden battle fin platform.
 */
export function isOnBaratieBattleFin(x: number, z: number): boolean {
  const az = Math.abs(z);
  if (az < 7.6 || az > 19.6) return false;
  if (x < -14.2 || x > 15.0) return false;

  // Sweeping semi-elliptical fin outer contour matching baratie2_80c38415.webp
  const cx = 0.4;
  const rx = 14.6;
  const nx = (x - cx) / rx;
  if (Math.abs(nx) >= 1) return false;
  const outerZ = 7.6 + 11.9 * Math.sqrt(Math.max(0, 1 - nx * nx));
  // Slight inward curve around bow hinge at x < -10
  const bowNotch = x < -9.5 ? Math.max(0, (-9.5 - x) * 0.55) : 0;
  return az >= 7.6 + bowNotch * 0.15 && az <= outerZ;
}

/**
 * Returns true if (x, z) lies inside the Baratie ship footprint (hull, fish head,
 * tail fin, or deployed battle fins) for Sunny navigation collision.
 */
export function isLocalPointInBaratieHull(x: number, z: number): boolean {
  const az = Math.abs(z);
  // Main hull body
  const hw = baratieMainHullHalfWidth(x);
  if (hw > 0 && az <= hw + 0.35) return true;
  // Giant fish head bow (-27.0 .. -13.5)
  if (x >= -27.2 && x <= -13.0 && az <= 5.4) return true;
  // Tail fin stern (+15.0 .. +25.4)
  if (x >= 14.8 && x <= 25.4 && az <= 4.2) return true;
  // Deployed starboard & port battle fins
  return isOnBaratieBattleFin(x, z);
}

/**
 * Returns the walkable surface elevation Y (in local meters) at (x, z)
 * for camera ground clamping & human-scale walking.
 */
export function sampleBaratieWalkSurfaceHeight(x: number, z: number): number {
  const az = Math.abs(z);

  // Tier 3 upper balcony ring (around penthouse walls)
  const tier3Outer =
    Math.hypot(Math.max(0, Math.abs(x) - 4.2) / 5.2, Math.max(0, az - 1.2) / 4.2) <= 1.0;
  if (tier3Outer && Math.abs(x) <= 9.2 && az <= 5.2) {
    // Inside Tier 3 roof cap vs open balcony
    if (Math.abs(x) <= 7.1 && az <= 3.55) {
      return BARATIE_TIER3_DECK_Y;
    }
    return BARATIE_TIER3_DECK_Y;
  }

  // Tier 2 promenade balcony (x in [-11.5, 11.5], |z| in [5.0, 6.75])
  if (Math.abs(x) <= 11.6 && az <= 6.85) {
    if (Math.abs(x) > 9.3 || az > 4.95) {
      return BARATIE_TIER2_DECK_Y;
    }
    return BARATIE_TIER3_DECK_Y;
  }

  // Rear quarterdeck (+11.2 .. +17.8)
  if (x >= 11.2 && x <= 17.8 && az <= 5.4) {
    return BARATIE_QUARTER_DECK_Y;
  }

  // Main outer hull promenade
  const hullW = baratieMainHullHalfWidth(x);
  if (hullW > 0 && az <= hullW) {
    return BARATIE_MAIN_DECK_Y;
  }

  // Deployed battle fin platforms
  if (isOnBaratieBattleFin(x, z)) {
    return BARATIE_FIN_DECK_Y;
  }

  return 0;
}

/**
 * Projects Baratie local coordinates (meters) onto the globe sphere tangent frame.
 */
export function toBaratieSphereLocal(
  x: number,
  y: number,
  z: number,
  globeRadius = 10
): { x: number; y: number; z: number } {
  const sx = x * BARATIE_GLOBE_SCALE;
  const sz = z * BARATIE_GLOBE_SCALE;
  const rTarget =
    globeRadius + (y + BARATIE_SPHERE_SEA_OFFSET) * BARATIE_GLOBE_SCALE;
  const sy =
    Math.sqrt(Math.max(0.25, rTarget * rTarget - sx * sx - sz * sz)) -
    globeRadius;
  return { x: sx, y: sy, z: sz };
}

/**
 * 6 curated camera presets from Isometric Overview & Anime Broadside
 * down to Human-Scale Immersion (1.75m eye height on battle fins & upper balcony).
 */
export const BARATIE_CAMERA_PRESETS: BaratieCameraPreset[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    subtitle:
      'Baratie · Navire-restaurant Sabagashira avec ses deux nageoires de combat déployées, ses 3 voiles rayées jaune et blanc et sa nageoire caudale',
    position: [-34, 32, 40],
    target: [0, 4.8, 0],
    isStreetView: false,
  },
  {
    id: 'broadside',
    label: 'Profil Anime',
    subtitle:
      "Vue trois-quarts tribord fidèle à l'anime : proue poisson grande ouverte, enseigne BARATIE, arche d'entrée dorée et grand pignon RESTAURANT",
    position: [-14, 5.4, 34],
    target: [-2, 6.2, 0],
    isStreetView: false,
  },
  {
    id: 'entrance-fin',
    label: 'Entrée & Nageoire (Humain)',
    subtitle:
      "À hauteur d'homme (1,75 m) sur la nageoire tribord en planches de bois, face à l'arche dorée d'entrée, au ponton et aux façades BARATIE / RESTAURANT",
    position: [1.8, BARATIE_FIN_DECK_Y + 1.75, 18.2],
    target: [1.2, BARATIE_FIN_DECK_Y + 4.5, 4.2],
    isStreetView: true,
  },
  {
    id: 'fish-bow',
    label: 'Gueule du Poisson (Humain)',
    subtitle:
      "À hauteur d'homme devant l'immense tête de poisson Sabagashira-1, son collier d'or, sa lèvre orange et les 3 canons dissimulés dans sa gueule",
    position: [-29.4, 2.35, 6.8],
    target: [-20.4, 2.75, -0.3],
    isStreetView: true,
  },
  {
    id: 'upper-balcony',
    label: 'Balcon BARATIE (Humain)',
    subtitle:
      "À hauteur d'homme sur la coursive du 2e pont derrière la rambarde en croix, entre tonneaux de cuisine, fenêtres en ogive et bouées BARATIE",
    position: [-7.2, BARATIE_TIER2_DECK_Y + 1.75, 5.95],
    target: [4.2, BARATIE_TIER2_DECK_Y + 1.95, 5.35],
    isStreetView: true,
  },
  {
    id: 'stern-tail',
    label: 'Poupe & Caudale (Humain)',
    subtitle:
      "À hauteur d'homme sur la nageoire arrière face au pont arrière, à l'immense nageoire caudale rouge et or et à la voile arrière rayée",
    position: [11.2, BARATIE_FIN_DECK_Y + 1.75, 13.4],
    target: [18.4, 4.8, 0.4],
    isStreetView: true,
  },
];
