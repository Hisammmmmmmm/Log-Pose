import { equirectangularToSphere, type Vec3 } from './globeMath';
import { ENIES_GLOBE_CENTER, ENIES_GLOBE_SCALE } from './eniesLobbyTerrain';

export interface TaraiVertexNode {
  id: 'enies-lobby' | 'marineford' | 'impel-down';
  name: string;
  u: number;
  v: number;
}

/**
 * Exact globe coordinates for the three Government stronghold vertices enclosing
 * the closed Tarai Current Triangle (matching onePieceLocations.ts).
 */
export const TARAI_VERTICES: readonly TaraiVertexNode[] = [
  { id: 'enies-lobby', name: 'Enies Lobby', u: 0.868, v: 0.530 },
  { id: 'marineford', name: 'Marineford', u: 0.905, v: 0.532 },
  { id: 'impel-down', name: 'Impel Down', u: 0.892, v: 0.576 },
] as const;

export const IMPEL_DOWN_CENTER_UV = { u: 0.892, v: 0.576 } as const;
export const IMPEL_DOWN_SCALE_CONST = 0.0018;

export const TARAI_CENTROID_UV = {
  u: (0.868 + 0.905 + 0.892) / 3,
  v: (0.530 + 0.532 + 0.576) / 3,
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

export interface SphereTangentBasis {
  origin: Vec3;
  up: Vec3;
  east: Vec3;
  south: Vec3;
}

export function buildBaseTangentBasis(
  u: number,
  v: number,
  globeRadius = 10
): SphereTangentBasis {
  const origin = equirectangularToSphere(u, v, globeRadius);
  const up = normalize3(origin);
  const pEast = equirectangularToSphere((u + 0.001) % 1, v, globeRadius);
  const eastRaw = sub3(pEast, origin);
  const east = normalize3(sub3(eastRaw, scale3(up, dot3(eastRaw, up))));
  const south = normalize3(cross3(east, up));
  return { origin, up, east, south };
}

/**
 * Rotates a tangent basis cleanly around its local surface normal `up` by `yawRad`
 * matching Three.js `Object3D.rotateY(yawRad)` on `makeBasis(east, up, south)`.
 */
export function rotateTangentBasis(
  base: SphereTangentBasis,
  yawRad: number
): SphereTangentBasis {
  const c = Math.cos(yawRad);
  const s = Math.sin(yawRad);
  return {
    origin: base.origin,
    up: base.up,
    east: normalize3(sub3(scale3(base.east, c), scale3(base.south, s))),
    south: normalize3(add3(scale3(base.east, s), scale3(base.south, c))),
  };
}

/**
 * Computes yaw angle so either local +Z (`axisSign = +1`) or local -Z (`axisSign = -1`)
 * aims along the great-circle tangent toward `targetUV`.
 */
export function computeYawTowardUV(
  fromUV: { u: number; v: number },
  targetUV: { u: number; v: number },
  axisSign: 1 | -1,
  globeRadius = 10
): number {
  const base = buildBaseTangentBasis(fromUV.u, fromUV.v, globeRadius);
  const tgt = equirectangularToSphere(targetUV.u, targetUV.v, globeRadius);
  const raw = sub3(tgt, base.origin);
  const tan = normalize3(sub3(raw, scale3(base.up, dot3(raw, base.up))));
  const desiredSouth = axisSign === 1 ? tan : scale3(tan, -1);
  return Math.atan2(dot3(desiredSouth, base.east), dot3(desiredSouth, base.south));
}

/**
 * Enies Lobby's local -Z axis (Tour Judiciaire -> Bridge of Hesitation -> Gate of Justice)
 * aims straight into the Tarai Current Triangle centroid, which simultaneously aligns
 * local +Z (Front Pier) straight toward Day Station / Water 7.
 */
export function getEniesLobbyOrientYawRad(): number {
  return computeYawTowardUV(ENIES_GLOBE_CENTER, TARAI_CENTROID_UV, -1, 10);
}

/**
 * Impel Down's local +Z axis (Twin-Tower Main Entrance -> Tarai Current Stone Transit Bridge ->
 * Marine Transit Port -> Impel Down Gate of Justice) aims straight toward the Triangle Centroid.
 */
export function getImpelDownOrientYawRad(): number {
  return computeYawTowardUV(IMPEL_DOWN_CENTER_UV, TARAI_CENTROID_UV, 1, 10);
}

export function getEniesOrientedBasis(globeRadius = 10): SphereTangentBasis {
  return rotateTangentBasis(
    buildBaseTangentBasis(ENIES_GLOBE_CENTER.u, ENIES_GLOBE_CENTER.v, globeRadius),
    getEniesLobbyOrientYawRad()
  );
}

export function getImpelDownOrientedBasis(globeRadius = 10): SphereTangentBasis {
  return rotateTangentBasis(
    buildBaseTangentBasis(IMPEL_DOWN_CENTER_UV.u, IMPEL_DOWN_CENTER_UV.v, globeRadius),
    getImpelDownOrientYawRad()
  );
}

export interface GateOfJusticePose {
  id: 'enies-lobby' | 'impel-down' | 'marineford';
  label: string;
  position: Vec3;
  /** Unit tangent direction pointing inward toward the Tarai Current Triangle interior. */
  inwardDir: Vec3;
  up: Vec3;
}

export interface TaraiCurrentBoundaryEdge {
  id: string;
  from: GateOfJusticePose['id'];
  to: GateOfJusticePose['id'];
  points: Vec3[];
}

export interface TaraiVortexArrowPose {
  ringIndex: number;
  position: Vec3;
  forward: Vec3;
  up: Vec3;
}

export function getTaraiCentroidWorld(globeRadius = 10): Vec3 {
  const p0 = equirectangularToSphere(0.868, 0.530, 1);
  const p1 = equirectangularToSphere(0.905, 0.532, 1);
  const p2 = equirectangularToSphere(0.892, 0.576, 1);
  return scale3(normalize3(add3(add3(p0, p1), p2)), globeRadius);
}

/**
 * Computes the exact spherical positions and inward-facing normals of the three
 * Gates of Justice closing the Tarai Current Triangle.
 */
export function buildTaraiGateOfJusticePoses(globeRadius = 10): GateOfJusticePose[] {
  const centroid = getTaraiCentroidWorld(globeRadius);

  // 1. Enies Lobby Gate of Justice sits at exact local (0, 0, -114) at the tip of the Bridge of Hesitation
  const elBasis = getEniesOrientedBasis(globeRadius);
  const elGatePos = scale3(
    normalize3(add3(elBasis.origin, scale3(elBasis.south, -114.0 * ENIES_GLOBE_SCALE))),
    globeRadius
  );
  const elUp = normalize3(elGatePos);
  const elInward = normalize3(
    sub3(sub3(centroid, elGatePos), scale3(elUp, dot3(sub3(centroid, elGatePos), elUp)))
  );

  // 2. Impel Down Gate of Justice sits at local (0, 0, +112) just beyond the Stone Transit Port
  const idBasis = getImpelDownOrientedBasis(globeRadius);
  const idGatePos = scale3(
    normalize3(add3(idBasis.origin, scale3(idBasis.south, 112.0 * IMPEL_DOWN_SCALE_CONST))),
    globeRadius
  );
  const idUp = normalize3(idGatePos);
  const idInward = normalize3(
    sub3(sub3(centroid, idGatePos), scale3(idUp, dot3(sub3(centroid, idGatePos), idUp)))
  );

  // 3. Marineford Gate of Justice sits just outside Marineford's SW sea approach facing into the triangle
  const mfOrigin = equirectangularToSphere(0.905, 0.532, globeRadius);
  const mfUp = normalize3(mfOrigin);
  const mfToCentroid = normalize3(
    sub3(sub3(centroid, mfOrigin), scale3(mfUp, dot3(sub3(centroid, mfOrigin), mfUp)))
  );
  const mfGatePos = scale3(
    normalize3(add3(mfOrigin, scale3(mfToCentroid, 0.225 * (globeRadius / 10)))),
    globeRadius
  );
  const mfGateUp = normalize3(mfGatePos);
  const mfInward = normalize3(
    sub3(sub3(centroid, mfGatePos), scale3(mfGateUp, dot3(sub3(centroid, mfGatePos), mfGateUp)))
  );

  return [
    {
      id: 'enies-lobby',
      label: 'Porte de la Justice · Enies Lobby',
      position: elGatePos,
      inwardDir: elInward,
      up: elUp,
    },
    {
      id: 'impel-down',
      label: 'Porte de la Justice · Impel Down',
      position: idGatePos,
      inwardDir: idInward,
      up: idUp,
    },
    {
      id: 'marineford',
      label: 'Porte de la Justice · Marineford',
      position: mfGatePos,
      inwardDir: mfInward,
      up: mfGateUp,
    },
  ];
}

function slerpPointsOnSphere(
  a: Vec3,
  b: Vec3,
  steps: number,
  radius: number
): Vec3[] {
  const na = normalize3(a);
  const nb = normalize3(b);
  const out: Vec3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = normalize3({
      x: na.x + (nb.x - na.x) * t,
      y: na.y + (nb.y - na.y) * t,
      z: na.z + (nb.z - na.z) * t,
    });
    out.push(scale3(p, radius));
  }
  return out;
}

/**
 * Generates the three closed perimeter current channels linking Impel Down <-> Marineford <-> Enies Lobby.
 * Order matches the directional flow arrows shown on the One Piece Tarai Current chart.
 */
export function buildTaraiTriangleEdges(
  globeRadius = 10,
  lift = 0.0028,
  subdivisions = 26
): TaraiCurrentBoundaryEdge[] {
  const gates = buildTaraiGateOfJusticePoses(globeRadius);
  const byId = new Map(gates.map((g) => [g.id, g]));
  const gImpel = byId.get('impel-down')!;
  const gMarine = byId.get('marineford')!;
  const gEnies = byId.get('enies-lobby')!;
  const r = globeRadius + lift;

  return [
    {
      id: 'impel-to-marineford',
      from: 'impel-down',
      to: 'marineford',
      points: slerpPointsOnSphere(gImpel.position, gMarine.position, subdivisions, r),
    },
    {
      id: 'marineford-to-enies',
      from: 'marineford',
      to: 'enies-lobby',
      points: slerpPointsOnSphere(gMarine.position, gEnies.position, subdivisions, r),
    },
    {
      id: 'enies-to-impel',
      from: 'enies-lobby',
      to: 'impel-down',
      points: slerpPointsOnSphere(gEnies.position, gImpel.position, subdivisions, r),
    },
  ];
}

/**
 * Samples clockwise swirling Tarai Current streamlines strictly inside the closed triangle
 * between Enies Lobby, Marineford, and Impel Down.
 */
export function buildTaraiVortexStreamlines(
  globeRadius = 10,
  lift = 0.0024
): Vec3[][] {
  const gates = buildTaraiGateOfJusticePoses(globeRadius);
  const centroid = getTaraiCentroidWorld(globeRadius);
  const r = globeRadius + lift;

  const rings = [0.76, 0.52, 0.30];
  const streamlines: Vec3[][] = [];

  for (const ringScale of rings) {
    // Shrink vertices toward centroid to form inner swirling triangular spiral bands
    const verts = gates.map((g) => {
      const p = add3(scale3(centroid, 1 - ringScale), scale3(g.position, ringScale));
      return scale3(normalize3(p), r);
    });
    const loop: Vec3[] = [];
    const stepsPerEdge = 16;
    for (let e = 0; e < 3; e++) {
      const a = verts[e];
      const b = verts[(e + 1) % 3];
      for (let s = 0; s < stepsPerEdge; s++) {
        const t = s / stepsPerEdge;
        // Slight inward curve bow matching vortex spiral inside the triangle
        const midPull = Math.sin(t * Math.PI) * 0.14 * ringScale;
        const lin = add3(scale3(a, 1 - t), scale3(b, t));
        const bowed = add3(scale3(lin, 1 - midPull), scale3(centroid, midPull));
        loop.push(scale3(normalize3(bowed), r));
      }
    }
    loop.push(loop[0]);
    streamlines.push(loop);
  }
  return streamlines;
}

/**
 * Checks whether equirectangular (u, v) sits inside the closed Tarai Current Triangle basin
 * (allowing Calm Belt navigation inside the judicial triangle when exiting via a Gate of Justice).
 */
export function isUVInTaraiTriangle(u: number, v: number): boolean {
  const ax = 0.868;
  const ay = 0.530;
  const bx = 0.905;
  const by = 0.532;
  const cx = 0.892;
  const cy = 0.576;

  const v0x = cx - ax;
  const v0y = cy - ay;
  const v1x = bx - ax;
  const v1y = by - ay;
  const v2x = u - ax;
  const v2y = v - ay;

  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;

  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
  const baryU = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const baryV = (dot00 * dot12 - dot01 * dot02) * invDenom;

  return baryU >= -0.04 && baryV >= -0.04 && baryU + baryV <= 1.04;
}
