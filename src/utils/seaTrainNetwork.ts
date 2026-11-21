import { equirectangularToSphere, type Vec3 } from './globeMath';
import { getEniesOrientedBasis } from './taraiCurrentNetwork';
import {
  WATER7_BLUE_STATION_YARD,
  WATER7_GLOBE_CENTER,
  WATER7_GLOBE_SCALE,
  WATER7_VIADUCT,
} from './water7Terrain';

export interface SeaTrainStationNode {
  id:
    | 'water-7'
    | 'shift-station'
    | 'pucci-island'
    | 'san-faldo'
    | 'st-poplar'
    | 'enies-lobby';
  name: string;
  u: number;
  v: number;
}

export const SEA_TRAIN_STATIONS: readonly SeaTrainStationNode[] = [
  { id: 'water-7', name: 'Blue Station (Water 7)', u: 0.812, v: 0.482 },
  { id: 'shift-station', name: 'Shift Station', u: 0.798, v: 0.508 },
  { id: 'pucci-island', name: 'Pucci Island', u: 0.790, v: 0.494 },
  { id: 'san-faldo', name: 'San Faldo', u: 0.782, v: 0.532 },
  { id: 'st-poplar', name: 'St. Poplar', u: 0.808, v: 0.536 },
  { id: 'enies-lobby', name: 'Enies Lobby', u: 0.868, v: 0.530 },
];

/** Day Station intermediate Marine relay platform along the Judicial Line */
export const DAY_STATION_JUNCTION = {
  u: 0.836,
  v: 0.506,
  name: 'Day Station',
} as const;

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

function add3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function sub3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function computeTangentPoint(
  centerU: number,
  centerV: number,
  lx: number,
  lz: number,
  scale: number,
  radius: number
): Vec3 {
  const origin = equirectangularToSphere(centerU, centerV, radius);
  const up = normalize3(origin);
  const pEast = equirectangularToSphere((centerU + 0.001) % 1, centerV, radius);
  const eastRaw = sub3(pEast, origin);
  const east = normalize3(sub3(eastRaw, scale3(up, dot3(eastRaw, up))));
  const south = normalize3(cross3(east, up));
  const world = add3(
    origin,
    add3(scale3(east, lx * scale), scale3(south, lz * scale))
  );
  return scale3(normalize3(world), radius);
}

/**
 * Water 7 Blue Station terminal harbor exit anchor (south-southeast bay)
 * and SE Sea Train Viaduct exit anchor.
 */
export function getWater7TerminalAnchors(globeRadius = 10): {
  blueStationStart: Vec3;
  blueStationSeaGate: Vec3;
  viaductStart: Vec3;
  viaductSeaExit: Vec3;
} {
  const ba = WATER7_BLUE_STATION_YARD.angle;
  const va = WATER7_VIADUCT.angle;
  return {
    blueStationStart: computeTangentPoint(
      WATER7_GLOBE_CENTER.u,
      WATER7_GLOBE_CENTER.v,
      Math.cos(ba) * WATER7_BLUE_STATION_YARD.rStart,
      Math.sin(ba) * WATER7_BLUE_STATION_YARD.rStart,
      WATER7_GLOBE_SCALE,
      globeRadius
    ),
    blueStationSeaGate: computeTangentPoint(
      WATER7_GLOBE_CENTER.u,
      WATER7_GLOBE_CENTER.v,
      Math.cos(ba) * WATER7_BLUE_STATION_YARD.rEnd,
      Math.sin(ba) * WATER7_BLUE_STATION_YARD.rEnd,
      WATER7_GLOBE_SCALE,
      globeRadius
    ),
    viaductStart: computeTangentPoint(
      WATER7_GLOBE_CENTER.u,
      WATER7_GLOBE_CENTER.v,
      Math.cos(va) * WATER7_VIADUCT.rStart,
      Math.sin(va) * WATER7_VIADUCT.rStart,
      WATER7_GLOBE_SCALE,
      globeRadius
    ),
    viaductSeaExit: computeTangentPoint(
      WATER7_GLOBE_CENTER.u,
      WATER7_GLOBE_CENTER.v,
      Math.cos(va) * WATER7_VIADUCT.rEnd,
      Math.sin(va) * WATER7_VIADUCT.rEnd,
      WATER7_GLOBE_SCALE,
      globeRadius
    ),
  };
}

/**
 * Computes the Enies Lobby front Sea Train pier anchor (south edge outside
 * the perimeter Grillage gate & Porte Principale).
 */
export function getEniesLobbyPierAnchor(globeRadius = 10): {
  approachPoint: Vec3;
  pierDockPoint: Vec3;
} {
  const basis = getEniesOrientedBasis(globeRadius);
  const projectZ = (lz: number): Vec3 =>
    scale3(
      normalize3(add3(basis.origin, scale3(basis.south, lz * 0.0017))),
      globeRadius
    );
  return {
    approachPoint: projectZ(108),
    pierDockPoint: projectZ(72),
  };
}

export interface SeaTrainRouteSegment {
  id: string;
  label: string;
  lineType: 'main-trunk' | 'western-loop' | 'judicial-express';
  waypoints: Vec3[];
}

function uvOnSphere(u: number, v: number, radius: number): Vec3 {
  return equirectangularToSphere(u, v, radius);
}

/**
 * Generates smooth spherical Catmull-Rom-interpolated polylines for all Umi Ressha
 * Sea Train routes linking Water 7 Blue Station & Viaduct to Shift Station,
 * Pucci Island, San Faldo, St. Poplar, Day Station, and Enies Lobby.
 */
export function buildSeaTrainRouteSegments(
  globeRadius = 10,
  trackLift = 0.00055
): SeaTrainRouteSegment[] {
  const r = globeRadius + trackLift;
  const w7 = getWater7TerminalAnchors(r);
  const el = getEniesLobbyPierAnchor(r);

  // Ruler-straight N-S corridor through Shift Station twin platforms (z in [-34, +34])
  const shiftNorthFar = computeTangentPoint(0.798, 0.508, 0, -68, 0.0013, r);
  const shiftNorthOuter = computeTangentPoint(0.798, 0.508, 0, -34, 0.0013, r);
  const shiftCenter = uvOnSphere(0.798, 0.508, r);
  const shiftSouthOuter = computeTangentPoint(0.798, 0.508, 0, 34, 0.0013, r);
  const shiftSouthFar = computeTangentPoint(0.798, 0.508, 0, 68, 0.0013, r);

  // Offshore waterfront dock rail passes hugging each stone quay cleanly
  const pucciEast = computeTangentPoint(0.790, 0.494, 24, 28, 0.0014, r);
  const pucciDock = computeTangentPoint(0.790, 0.494, 0, 27.5, 0.0014, r);
  const pucciWest = computeTangentPoint(0.790, 0.494, -24, 28, 0.0014, r);

  const sanFaldoWest = computeTangentPoint(0.782, 0.532, -24, -28, 0.0014, r);
  const sanFaldoDock = computeTangentPoint(0.782, 0.532, 0, -27.5, 0.0014, r);
  const sanFaldoEast = computeTangentPoint(0.782, 0.532, 24, -28, 0.0014, r);

  const stPoplarWest = computeTangentPoint(0.808, 0.536, -24, -28, 0.0014, r);
  const stPoplarDock = computeTangentPoint(0.808, 0.536, 0, -27.5, 0.0014, r);
  const stPoplarEast = computeTangentPoint(0.808, 0.536, 24, -28, 0.0014, r);

  const dayStationPos = uvOnSphere(DAY_STATION_JUNCTION.u, DAY_STATION_JUNCTION.v, r);

  return [
    {
      id: 'water7-to-shift',
      label: 'Blue Station -> Shift Station',
      lineType: 'main-trunk',
      waypoints: [
        w7.blueStationStart,
        w7.blueStationSeaGate,
        uvOnSphere(0.807, 0.494, r),
        uvOnSphere(0.802, 0.499, r),
        shiftNorthFar,
        shiftNorthOuter,
        shiftCenter,
        shiftSouthOuter,
        shiftSouthFar,
      ],
    },
    {
      id: 'shift-to-pucci-sanfaldo',
      label: 'Shift Station -> Pucci -> San Faldo',
      lineType: 'western-loop',
      waypoints: [
        shiftNorthFar,
        uvOnSphere(0.796, 0.499, r),
        pucciEast,
        pucciDock,
        pucciWest,
        uvOnSphere(0.777, 0.512, r),
        sanFaldoWest,
        sanFaldoDock,
      ],
    },
    {
      id: 'sanfaldo-to-stpoplar-shift',
      label: 'San Faldo -> St. Poplar -> Shift Station',
      lineType: 'western-loop',
      waypoints: [
        sanFaldoDock,
        sanFaldoEast,
        uvOnSphere(0.795, 0.525, r),
        stPoplarWest,
        stPoplarDock,
        stPoplarEast,
        uvOnSphere(0.805, 0.522, r),
        shiftSouthFar,
      ],
    },
    {
      id: 'water7-judicial-enies-lobby',
      label: 'Water 7 Viaduct -> Day Station -> Enies Lobby',
      lineType: 'judicial-express',
      waypoints: [
        w7.viaductStart,
        w7.viaductSeaExit,
        uvOnSphere(0.827, 0.496, r),
        dayStationPos,
        uvOnSphere(0.847, 0.514, r),
        uvOnSphere(0.853, 0.519, r),
        el.approachPoint,
        el.pierDockPoint,
      ],
    },
    {
      id: 'stpoplar-to-judicial-junction',
      label: 'St. Poplar -> Judicial Line Junction',
      lineType: 'main-trunk',
      waypoints: [
        stPoplarEast,
        uvOnSphere(0.823, 0.524, r),
        uvOnSphere(0.832, 0.514, r),
        dayStationPos,
      ],
    },
  ];
}

function dist3(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

/**
 * Centripetal Catmull-Rom (alpha = 0.5, Barry-Goldman): never overshoots or loops
 * even when long open-ocean spans meet short station pier approaches.
 */
function centripetalCatmullRomVec3(
  p0: Vec3,
  p1: Vec3,
  p2: Vec3,
  p3: Vec3,
  u: number
): Vec3 {
  const d01 = Math.max(1e-5, Math.sqrt(dist3(p0, p1)));
  const d12 = Math.max(1e-5, Math.sqrt(dist3(p1, p2)));
  const d23 = Math.max(1e-5, Math.sqrt(dist3(p2, p3)));

  const t0 = 0;
  const t1 = t0 + d01;
  const t2 = t1 + d12;
  const t3 = t2 + d23;
  const t = t1 + (t2 - t1) * u;

  const A1 = lerpVec3(p0, p1, (t - t0) / (t1 - t0));
  const A2 = lerpVec3(p1, p2, (t - t1) / (t2 - t1));
  const A3 = lerpVec3(p2, p3, (t - t2) / (t3 - t2));

  const B1 = lerpVec3(A1, A2, (t - t0) / (t2 - t0));
  const B2 = lerpVec3(A2, A3, (t - t1) / (t3 - t1));

  return lerpVec3(B1, B2, (t - t1) / (t2 - t1));
}

/**
 * Resamples a waypoint sequence into evenly projected points strictly sitting
 * on radius (globeRadius + trackLift).
 */
export function sampleSphericalSpline(
  waypoints: readonly Vec3[],
  subdivisions: number,
  targetRadius: number
): Vec3[] {
  if (waypoints.length < 2) return [...waypoints];
  const out: Vec3[] = [];
  const n = waypoints.length;
  for (let i = 0; i < n - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    // Reflect virtual endpoints cleanly along segment direction when at array boundary
    const p0 =
      i > 0
        ? waypoints[i - 1]
        : sub3(scale3(p1, 2), p2);
    const p3 =
      i + 2 < n
        ? waypoints[i + 2]
        : sub3(scale3(p2, 2), p1);
    const steps = subdivisions;
    const limit = i === n - 2 ? steps + 1 : steps;
    for (let s = 0; s < limit; s++) {
      const t = s / steps;
      const pt = centripetalCatmullRomVec3(p0, p1, p2, p3, t);
      out.push(scale3(normalize3(pt), targetRadius));
    }
  }
  return out;
}

export interface PuffingTomPose {
  id: string;
  position: Vec3;
  forward: Vec3;
  up: Vec3;
}

function buildCircuitPoints(
  globeRadius: number,
  trackLift: number
): {
  judicialCircuit: Vec3[];
  westernCircuit: Vec3[];
} {
  const r = globeRadius + trackLift;
  const w7 = getWater7TerminalAnchors(r);
  const el = getEniesLobbyPierAnchor(r);
  const shiftNorthFar = computeTangentPoint(0.798, 0.508, 0, -68, 0.0013, r);
  const shiftNorthOuter = computeTangentPoint(0.798, 0.508, 0, -34, 0.0013, r);
  const shiftCenter = uvOnSphere(0.798, 0.508, r);
  const shiftSouthOuter = computeTangentPoint(0.798, 0.508, 0, 34, 0.0013, r);
  const shiftSouthFar = computeTangentPoint(0.798, 0.508, 0, 68, 0.0013, r);

  const pucciEast = computeTangentPoint(0.790, 0.494, 24, 28, 0.0014, r);
  const pucciDock = computeTangentPoint(0.790, 0.494, 0, 27.5, 0.0014, r);
  const pucciWest = computeTangentPoint(0.790, 0.494, -24, 28, 0.0014, r);

  const sanFaldoWest = computeTangentPoint(0.782, 0.532, -24, -28, 0.0014, r);
  const sanFaldoDock = computeTangentPoint(0.782, 0.532, 0, -27.5, 0.0014, r);
  const sanFaldoEast = computeTangentPoint(0.782, 0.532, 24, -28, 0.0014, r);

  const stPoplarWest = computeTangentPoint(0.808, 0.536, -24, -28, 0.0014, r);
  const stPoplarDock = computeTangentPoint(0.808, 0.536, 0, -27.5, 0.0014, r);
  const stPoplarEast = computeTangentPoint(0.808, 0.536, 24, -28, 0.0014, r);

  const dayStationPos = uvOnSphere(DAY_STATION_JUNCTION.u, DAY_STATION_JUNCTION.v, r);

  // Circuit A (Out and back): Blue Station -> Shift -> St. Poplar -> Day Station -> Enies Lobby Pier -> back
  const outboundA = sampleSphericalSpline(
    [
      w7.blueStationSeaGate,
      uvOnSphere(0.804, 0.497, r),
      shiftNorthFar,
      shiftNorthOuter,
      shiftCenter,
      shiftSouthOuter,
      shiftSouthFar,
      uvOnSphere(0.805, 0.522, r),
      stPoplarEast,
      uvOnSphere(0.823, 0.524, r),
      dayStationPos,
      uvOnSphere(0.848, 0.515, r),
      el.approachPoint,
      el.pierDockPoint,
    ],
    18,
    r
  );
  const inboundA = [...outboundA].slice(1, -1).reverse();
  const judicialCircuit = [...outboundA, ...inboundA];

  // Circuit B (Loop): Water 7 Viaduct -> Day Station -> St. Poplar -> San Faldo -> Pucci -> Shift -> Water 7
  const westernCircuit = sampleSphericalSpline(
    [
      w7.viaductSeaExit,
      uvOnSphere(0.827, 0.496, r),
      dayStationPos,
      uvOnSphere(0.823, 0.524, r),
      stPoplarEast,
      stPoplarDock,
      stPoplarWest,
      uvOnSphere(0.795, 0.525, r),
      sanFaldoEast,
      sanFaldoDock,
      sanFaldoWest,
      uvOnSphere(0.777, 0.512, r),
      pucciWest,
      pucciDock,
      pucciEast,
      uvOnSphere(0.796, 0.499, r),
      shiftNorthFar,
      uvOnSphere(0.804, 0.497, r),
      w7.blueStationSeaGate,
    ],
    16,
    r
  );

  return { judicialCircuit, westernCircuit };
}

function samplePoseOnClosedOrLoopPath(
  pts: readonly Vec3[],
  phase: number,
  radius: number
): { position: Vec3; forward: Vec3; up: Vec3 } {
  const n = pts.length;
  const wrapped = ((phase % 1) + 1) % 1;
  const exact = wrapped * (n - 1);
  const i0 = Math.floor(exact);
  const i1 = Math.min(n - 1, i0 + 1);
  const frac = exact - i0;
  const pA = pts[i0];
  const pB = pts[i1];
  const posRaw = {
    x: pA.x + (pB.x - pA.x) * frac,
    y: pA.y + (pB.y - pA.y) * frac,
    z: pA.z + (pB.z - pA.z) * frac,
  };
  const up = normalize3(posRaw);
  const position = scale3(up, radius);

  const iNext = i1 === i0 ? (i0 + 1) % n : Math.min(n - 1, i0 + 2);
  const lookPt = pts[iNext];
  const diff = sub3(lookPt, pA);
  const tangent = sub3(diff, scale3(up, dot3(diff, up)));
  const forward = normalize3(tangent);
  return { position, forward, up };
}

const circuitCache = new Map<
  string,
  { judicialCircuit: Vec3[]; westernCircuit: Vec3[] }
>();

/**
 * Samples Puffing Tom & Umi Ressha locomotive poses cleanly on the globe rails.
 */
export function sampleSeaTrainTrains(
  elapsedS: number,
  globeRadius = 10,
  trackLift = 0.00055
): PuffingTomPose[] {
  const key = `${globeRadius.toFixed(3)}:${trackLift.toFixed(6)}`;
  let cached = circuitCache.get(key);
  if (!cached) {
    cached = buildCircuitPoints(globeRadius, trackLift);
    circuitCache.set(key, cached);
  }

  const r = globeRadius + trackLift;
  const pTom = samplePoseOnClosedOrLoopPath(
    cached.judicialCircuit,
    elapsedS / 44,
    r
  );
  const pLoop = samplePoseOnClosedOrLoopPath(
    cached.westernCircuit,
    elapsedS / 34 + 0.35,
    r
  );

  return [
    { id: 'puffing-tom-express', ...pTom },
    { id: 'puffing-tom-loop', ...pLoop },
  ];
}
