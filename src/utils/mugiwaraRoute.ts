import { equirectangularToSphere, type IslandLocation, type Vec3 } from './globeMath';
import { SKYPIEA_ALTITUDE } from './skypieaTerrain';

/**
 * Canonical ordered islands visited by the Straw Hat Pirates (Mugiwara)
 * from the final East Blue approach through Reverse Mountain, Paradise,
 * and the New World toward Laugh Tale.
 */
export const MUGIWARA_ROUTE_IDS = [
  'polestar-islands',
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
  'enies-lobby',
  'thriller-bark',
  'sabaody',
  'fish-man-island',
  'punk-hazard',
  'dressrosa',
  'zou',
  'whole-cake-island',
  'wano',
  'egghead-island',
  'elbaf',
  'loadstar',
  'laugh-tale',
] as const;

export interface LogPoseGuidance {
  targetIsland: IslandLocation;
  /** Clockwise angle in radians relative to Sunny's bow (0 = dead ahead, +PI/2 = starboard, -PI/2 = port). */
  relativeAngleRad: number;
  /** Clockwise compass bearing in radians relative to North (0 = North, +PI/2 = East). */
  northBearingRad: number;
  /** Sunny's own heading bearing relative to North (0 = North, +PI/2 = East) for mini-map rendering. */
  shipMapHeadingRad: number;
  /** Spherical arc distance in world units. */
  surfaceDistance: number;
  /** Scaled nautical distance in km. */
  distanceKm: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize3(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z);
  if (len < 1e-9) return { x: 0, y: 1, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function scale3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function sub3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function getMugiwaraRouteIslands(
  locations: readonly IslandLocation[]
): IslandLocation[] {
  const byId = new Map(locations.map((loc) => [loc.id, loc]));
  const result: IslandLocation[] = [];
  for (const id of MUGIWARA_ROUTE_IDS) {
    const loc = byId.get(id);
    if (loc) result.push(loc);
  }
  return result;
}

/**
 * Picks the canonical next Mugiwara destination index when starting a voyage
 * from `spawnIsland` (defaults to Reverse Mountain when setting sail from East Blue).
 */
export function resolveInitialMugiwaraRouteIndex(
  spawnIsland: IslandLocation | null,
  routeIslands: readonly IslandLocation[]
): number {
  if (routeIslands.length === 0) return 0;

  const reverseIdx = routeIslands.findIndex((i) => i.id === 'reverse-mountain');
  const defaultIdx = reverseIdx >= 0 ? reverseIdx : 0;

  if (!spawnIsland) {
    return defaultIdx;
  }

  const exactIdx = routeIslands.findIndex((i) => i.id === spawnIsland.id);
  if (exactIdx >= 0) {
    return Math.min(exactIdx + 1, routeIslands.length - 1);
  }

  // Starting in any of the Four Blues -> must first reach Reverse Mountain
  if (
    spawnIsland.region === 'East Blue' ||
    spawnIsland.region === 'North Blue' ||
    spawnIsland.region === 'West Blue' ||
    spawnIsland.region === 'South Blue'
  ) {
    return defaultIdx;
  }

  // Starting on Paradise or New World -> lock onto next downstream Mugiwara stop
  if (spawnIsland.region === 'Paradise') {
    const nextParadise = routeIslands.findIndex(
      (i) => i.region === 'Paradise' && i.u >= spawnIsland.u
    );
    if (nextParadise >= 0) return nextParadise;
    const fmiIdx = routeIslands.findIndex((i) => i.id === 'fish-man-island');
    return fmiIdx >= 0 ? fmiIdx : defaultIdx;
  }

  if (spawnIsland.region === 'New World') {
    const nextNw = routeIslands.findIndex(
      (i) => i.region === 'New World' && i.u >= spawnIsland.u
    );
    if (nextNw >= 0) return nextNw;
    return routeIslands.length - 1;
  }

  // Calm Belt island (e.g. Amazon Lily / Impel Down) -> next Paradise stop
  const sabaodyIdx = routeIslands.findIndex((i) => i.id === 'sabaody');
  return sabaodyIdx >= 0 ? sabaodyIdx : defaultIdx;
}

/**
 * Computes live Log Pose needle angles & surface distance toward `targetIsland`
 * in Sunny's local spherical tangent frame.
 */
export function computeLogPoseGuidance(
  shipPos: Vec3,
  shipHeading: Vec3,
  targetIsland: IslandLocation,
  globeRadius: number
): LogPoseGuidance {
  const up = normalize3(shipPos);
  const fwd = normalize3(sub3(shipHeading, scale3(up, dot3(shipHeading, up))));
  const starboard = normalize3(cross3(fwd, up));

  const targetPos = equirectangularToSphere(
    targetIsland.u,
    targetIsland.v,
    globeRadius
  );
  const targetUnit = normalize3(targetPos);

  // Tangent direction along great circle toward target
  const rawToTarget = sub3(targetPos, shipPos);
  const tanToTargetRaw = sub3(rawToTarget, scale3(up, dot3(rawToTarget, up)));
  const tanLen = Math.hypot(
    tanToTargetRaw.x,
    tanToTargetRaw.y,
    tanToTargetRaw.z
  );
  const tanToTarget =
    tanLen > 1e-7 ? scale3(tanToTargetRaw, 1 / tanLen) : fwd;

  const compFwd = dot3(tanToTarget, fwd);
  const compRight = dot3(tanToTarget, starboard);
  const relativeAngleRad = Math.atan2(compRight, compFwd);

  // Local geographic North (+Y projected onto tangent plane) and East
  const poleRef = Math.abs(up.y) < 0.995 ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: -1 };
  const north = normalize3(sub3(poleRef, scale3(up, dot3(poleRef, up))));
  const east = normalize3(cross3(north, up));

  const northBearingRad = Math.atan2(
    dot3(tanToTarget, east),
    dot3(tanToTarget, north)
  );
  const shipMapHeadingRad = Math.atan2(dot3(fwd, east), dot3(fwd, north));

  const arcAngle = Math.acos(clamp(dot3(up, targetUnit), -1, 1));
  const surfaceDistance = arcAngle * globeRadius;

  return {
    targetIsland,
    relativeAngleRad,
    northBearingRad,
    shipMapHeadingRad,
    surfaceDistance,
    distanceKm: Math.round(surfaceDistance * 120),
  };
}

/**
 * Checks whether Sunny has sailed close enough to lock and advance the Log Pose
 * to the next island on the Straw Hats' One Piece route.
 */
export function shouldAdvanceMugiwaraWaypoint(
  shipPos: Vec3,
  targetIsland: IslandLocation,
  globeRadius: number,
  arrivalSurfaceDistance = 0.24,
  elevation = 0
): boolean {
  const up = normalize3(shipPos);
  const targetUnit = normalize3(
    equirectangularToSphere(targetIsland.u, targetIsland.v, globeRadius)
  );
  const arcAngle = Math.acos(clamp(dot3(up, targetUnit), -1, 1));
  const threshold =
    targetIsland.elevationTier === 'sky'
      ? Math.max(arrivalSurfaceDistance, 0.34)
      : arrivalSurfaceDistance;
  if (targetIsland.id === 'fish-man-island') {
    return elevation <= -0.35;
  }
  if (targetIsland.elevationTier === 'sky' && elevation < SKYPIEA_ALTITUDE * 0.72) {
    return false;
  }
  return arcAngle * globeRadius <= threshold;
}

/**
 * Returns true when (u, v) lies inside Grand Line seas (between the North & South Calm Belts
 * and past Reverse Mountain's Paradise exit gate at u >= 0.535, or in the New World).
 */
export function isShipInGrandLineWaters(u: number, v: number): boolean {
  const normU = ((u % 1) + 1) % 1;
  if (v < 0.453 || v > 0.564) return false;
  return (normU >= 0.535 && normU <= 0.985) || (normU >= 0.03 && normU <= 0.46);
}

/**
 * Computes Log Pose waypoint advancement on telemetry update.
 * Immediately advances past Twin Cape to the next Paradise island (Cactus Island)
 * as soon as the ship enters Grand Line waters from Reverse Mountain / Four Blues.
 */
export function advanceMugiwaraRouteOnTelemetry(params: {
  shipPos: Vec3;
  u: number;
  v: number;
  currentIndex: number;
  routeIslands: readonly IslandLocation[];
  globeRadius: number;
  allowGrandLineSkip?: boolean;
  elevation?: number;
}): {
  nextIndex: number;
  arrivedAt: IslandLocation | null;
  enteredGrandLine: boolean;
} {
  const {
    shipPos,
    u,
    v,
    currentIndex,
    routeIslands,
    globeRadius,
    allowGrandLineSkip = true,
    elevation = 0,
  } = params;
  const target = routeIslands[currentIndex];
  if (!target || currentIndex >= routeIslands.length - 1) {
    return { nextIndex: currentIndex, arrivedAt: null, enteredGrandLine: false };
  }

  const twinCapeIdx = routeIslands.findIndex((i) => i.id === 'twin-cape');
  if (
    allowGrandLineSkip &&
    twinCapeIdx >= 0 &&
    currentIndex <= twinCapeIdx &&
    isShipInGrandLineWaters(u, v)
  ) {
    return {
      nextIndex: Math.min(twinCapeIdx + 1, routeIslands.length - 1),
      arrivedAt: routeIslands[twinCapeIdx],
      enteredGrandLine: true,
    };
  }

  if (shouldAdvanceMugiwaraWaypoint(shipPos, target, globeRadius, 0.24, elevation)) {
    return {
      nextIndex: Math.min(currentIndex + 1, routeIslands.length - 1),
      arrivedAt: target,
      enteredGrandLine: false,
    };
  }

  return { nextIndex: currentIndex, arrivedAt: null, enteredGrandLine: false };
}
