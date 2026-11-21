import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  buildTaraiGateOfJusticePoses,
  buildTaraiTriangleEdges,
  buildTaraiVortexStreamlines,
  getTaraiCentroidWorld,
} from '../utils/taraiCurrentNetwork';

const _norm = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _basis = new THREE.Matrix4();
const _dummy = new THREE.Object3D();

export interface TaraiCurrentNetworkHandle {
  group: THREE.Group;
  update: (elapsedS: number) => void;
  dispose: () => void;
}

function createWorldGovernmentGateTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Weathered monumental pale limestone-slate panel
    ctx.fillStyle = '#aeb9c7';
    ctx.fillRect(0, 0, 256, 512);

    // Subtle recessed vertical armor seams & rivets
    ctx.strokeStyle = 'rgba(42, 54, 68, 0.35)';
    ctx.lineWidth = 4;
    for (let y = 32; y < 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    ctx.strokeRect(8, 8, 240, 496);

    // World Government 5-ring cross emblem
    ctx.strokeStyle = '#183763';
    ctx.fillStyle = '#183763';
    ctx.lineWidth = 10;
    const cx = 128;
    const cy = 220;
    ctx.beginPath();
    ctx.moveTo(cx - 56, cy);
    ctx.lineTo(cx + 56, cy);
    ctx.moveTo(cx, cy - 56);
    ctx.lineTo(cx, cy + 56);
    ctx.stroke();

    const discs: Array<[number, number, number]> = [
      [cx, cy, 18],
      [cx - 46, cy, 13],
      [cx + 46, cy, 13],
      [cx, cy - 46, 13],
      [cx, cy + 46, 13],
    ];
    for (const [dx, dy, dr] of discs) {
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#dbe7f4';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createGateOfJusticeMonument(
  scale: number,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  trackMat: <T extends THREE.Material>(m: T) => T,
  gateMat: THREE.MeshStandardMaterial
): THREE.Group {
  const g = new THREE.Group();
  const pylonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x768699,
      roughness: 0.72,
      metalness: 0.18,
    })
  );
  const crownMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd4dde8,
      roughness: 0.58,
      metalness: 0.24,
    })
  );
  const trimSteelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x384654,
      roughness: 0.45,
      metalness: 0.55,
    })
  );

  // Monumental semicircular-vaulted double leaves slightly ajar at the center so ships/currents pass through
  const doorW = 24.0 * scale;
  const doorH = 44.0 * scale;
  const doorD = 5.4 * scale;

  for (const side of [-1, 1]) {
    const leaf = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(doorW, doorH, doorD)),
      gateMat
    );
    // Slight inward curve + subtle portal gap in center for visual clarity & current passage
    leaf.position.set(side * 15.8 * scale, doorH * 0.5, -1.6 * scale);
    leaf.rotation.y = side * -0.14;
    g.add(leaf);

    // Tall outer buttress pylon
    const pylon = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(8.5 * scale, doorH * 1.12, 9.2 * scale)),
      pylonMat
    );
    pylon.position.set(side * 31.2 * scale, doorH * 0.56, 0);
    g.add(pylon);

    // Stepped pylon crown finial
    const cap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(3.8 * scale, 5.2 * scale, 7.5 * scale, 8)),
      crownMat
    );
    cap.position.set(side * 31.2 * scale, doorH * 1.12 + 3.7 * scale, 0);
    g.add(cap);
  }

  // Iconic curved upper limestone crown spanning across the towering double doors (matching image_235412c2.png silhouette)
  const archSpan = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(28.0 * scale, 3.6 * scale, 8, 24, Math.PI)),
    crownMat
  );
  archSpan.position.set(0, doorH * 0.72, 0);
  archSpan.scale.set(1.08, 0.78, 1.45);
  g.add(archSpan);

  // Heavy upper cross-lintel beam & sea-level threshold plinth
  const lintel = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(66.0 * scale, 6.2 * scale, 7.6 * scale)),
    trimSteelMat
  );
  lintel.position.set(0, doorH + 1.8 * scale, 0);
  g.add(lintel);

  const seaPlinth = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(72.0 * scale, 3.2 * scale, 13.0 * scale)),
    pylonMat
  );
  seaPlinth.position.set(0, 0.8 * scale, 0);
  g.add(seaPlinth);

  return g;
}

function buildTubeRibbon(
  points: readonly THREE.Vector3[],
  radius: number,
  segmentsPerPoint = 2
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([...points], false, 'centripetal');
  return new THREE.TubeGeometry(
    curve,
    Math.max(18, points.length * segmentsPerPoint),
    radius,
    5,
    false
  );
}

/**
 * Builds the closed Tarai Current Triangle connecting Impel Down, Marineford, and Enies Lobby,
 * guarded solely by the three towering Gates of Justice, with animated clockwise swirling current chevrons.
 */
export function createTaraiCurrentNetworkModel(
  globeRadius = 10
): TaraiCurrentNetworkHandle {
  const group = new THREE.Group();
  group.name = 'tarai-current-triangle';

  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const texs: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    texs.push(t);
    return t;
  };

  const gates = buildTaraiGateOfJusticePoses(globeRadius);
  const edges = buildTaraiTriangleEdges(globeRadius, 0.0032, 24);
  const streamlines = buildTaraiVortexStreamlines(globeRadius, 0.0026);

  // 1. Monumental Gates of Justice at all 3 Triangle Vertices
  const gateTex = trackTex(createWorldGovernmentGateTexture());
  const gateMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: gateTex,
      roughness: 0.58,
      metalness: 0.22,
    })
  );

  const gateScale = 0.0017;
  for (const gp of gates) {
    const gate = createGateOfJusticeMonument(gateScale, trackGeo, trackMat, gateMat);
    gate.name = `gate-of-justice-${gp.id}`;
    gate.position.set(gp.position.x, gp.position.y, gp.position.z);
    _norm.set(gp.up.x, gp.up.y, gp.up.z).normalize();
    _fwd.set(gp.inwardDir.x, gp.inwardDir.y, gp.inwardDir.z).normalize();
    _right.crossVectors(_norm, _fwd).normalize();
    _basis.makeBasis(_right, _norm, _fwd);
    gate.quaternion.setFromRotationMatrix(_basis);
    group.add(gate);
  }

  // 2. Closed Triangular Barrier Current Ribbons & Glowing Perimeter Walls
  const perimeterOuterGeos: THREE.BufferGeometry[] = [];
  const perimeterCoreGeos: THREE.BufferGeometry[] = [];
  const edgePaths: THREE.Vector3[][] = [];

  for (const edge of edges) {
    const vecPts = edge.points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    edgePaths.push(vecPts);

    const outerRibbon = buildTubeRibbon(vecPts, 0.011, 2);
    const coreRibbon = buildTubeRibbon(vecPts, 0.005, 2);
    perimeterOuterGeos.push(
      outerRibbon.index ? outerRibbon.toNonIndexed() : outerRibbon
    );
    perimeterCoreGeos.push(
      coreRibbon.index ? coreRibbon.toNonIndexed() : coreRibbon
    );
    outerRibbon.dispose();
    coreRibbon.dispose();
  }

  const mergedOuter = trackGeo(mergeGeometries(perimeterOuterGeos, false));
  const mergedCore = trackGeo(mergeGeometries(perimeterCoreGeos, false));
  for (const g of perimeterOuterGeos) g.dispose();
  for (const g of perimeterCoreGeos) g.dispose();

  const outerBarrierMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e6ea8,
      emissive: 0x0c4a7a,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      transparent: true,
      opacity: 0.56,
    })
  );
  const coreBarrierMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb8f3ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.85,
      roughness: 0.18,
      transparent: true,
      opacity: 0.88,
    })
  );

  group.add(
    new THREE.Mesh(mergedOuter, outerBarrierMat),
    new THREE.Mesh(mergedCore, coreBarrierMat)
  );

  // 3. Concentric Swirling Clockwise Tarai Current Streamlines inside the Triangle
  const swirlGeos: THREE.BufferGeometry[] = [];
  const vortexPaths: THREE.Vector3[][] = [];

  for (const loop of streamlines) {
    const vecPts = loop.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    vortexPaths.push(vecPts);
    const g = buildTubeRibbon(vecPts, 0.0042, 1);
    swirlGeos.push(g.index ? g.toNonIndexed() : g);
    g.dispose();
  }

  const mergedSwirl = trackGeo(mergeGeometries(swirlGeos, false));
  for (const g of swirlGeos) g.dispose();
  const swirlMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      roughness: 0.22,
      transparent: true,
      opacity: 0.52,
    })
  );
  group.add(new THREE.Mesh(mergedSwirl, swirlMat));

  // Translucent cerulean sea vortex tint disc across the triangle interior
  const centroid = getTaraiCentroidWorld(globeRadius);
  {
    const gPositions = gates.map((gp) => new THREE.Vector3(gp.position.x, gp.position.y, gp.position.z));
    const triVerts: number[] = [];
    // Subdivide triangle once around centroid so it hugs spherical curvature cleanly
    const cVec = new THREE.Vector3(centroid.x, centroid.y, centroid.z)
      .normalize()
      .multiplyScalar(globeRadius + 0.0018);
    for (let i = 0; i < 3; i++) {
      const a = gPositions[i].clone().normalize().multiplyScalar(globeRadius + 0.0018);
      const b = gPositions[(i + 1) % 3].clone().normalize().multiplyScalar(globeRadius + 0.0018);
      const mAB = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(globeRadius + 0.0018);
      const mAC = a.clone().add(cVec).multiplyScalar(0.5).normalize().multiplyScalar(globeRadius + 0.0018);
      const mBC = b.clone().add(cVec).multiplyScalar(0.5).normalize().multiplyScalar(globeRadius + 0.0018);

      triVerts.push(
        a.x, a.y, a.z, mAB.x, mAB.y, mAB.z, mAC.x, mAC.y, mAC.z,
        mAB.x, mAB.y, mAB.z, b.x, b.y, b.z, mBC.x, mBC.y, mBC.z,
        mAC.x, mAC.y, mAC.z, mAB.x, mAB.y, mAB.z, mBC.x, mBC.y, mBC.z,
        mAC.x, mAC.y, mAC.z, mBC.x, mBC.y, mBC.z, cVec.x, cVec.y, cVec.z
      );
    }
    const basinGeo = trackGeo(new THREE.BufferGeometry());
    basinGeo.setAttribute('position', new THREE.Float32BufferAttribute(triVerts, 3));
    basinGeo.computeVertexNormals();
    const basinMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0369a1,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    group.add(new THREE.Mesh(basinGeo, basinMat));
  }

  // 4. Animated Directional Flow Chevrons racing along perimeter edges + vortex spirals
  const CHEVRONS_PER_EDGE = 7;
  const CHEVRONS_PER_LOOP = 9;
  const totalChevrons =
    edgePaths.length * CHEVRONS_PER_EDGE + vortexPaths.length * CHEVRONS_PER_LOOP;

  const chevronGeo = trackGeo(new THREE.ConeGeometry(0.015, 0.036, 4));
  chevronGeo.rotateX(Math.PI * 0.5);
  chevronGeo.scale(1.1, 0.42, 1.0);
  const chevronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe0f8ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.95,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
    })
  );
  const chevronInst = new THREE.InstancedMesh(chevronGeo, chevronMat, totalChevrons);
  chevronInst.frustumCulled = false;
  group.add(chevronInst);

  const samplePolylinePose = (
    pts: readonly THREE.Vector3[],
    phase: number,
    liftOffset: number,
    outIdx: number
  ) => {
    const n = pts.length;
    const t = ((phase % 1) + 1) % 1;
    const exact = t * (n - 1);
    const i0 = Math.floor(exact);
    const i1 = Math.min(n - 1, i0 + 1);
    const f = exact - i0;
    const pos = pts[i0].clone().lerp(pts[i1], f);
    _norm.copy(pos).normalize();
    pos.copy(_norm).multiplyScalar(globeRadius + liftOffset);
    const pLook = pts[Math.min(n - 1, i0 + 1)];
    const pPrev = pts[Math.max(0, i0 - 1)];
    _fwd.copy(pLook).sub(pPrev);
    _fwd.addScaledVector(_norm, -_fwd.dot(_norm)).normalize();
    _right.crossVectors(_norm, _fwd).normalize();
    _basis.makeBasis(_right, _norm, _fwd);
    _dummy.position.copy(pos);
    _dummy.quaternion.setFromRotationMatrix(_basis);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    chevronInst.setMatrixAt(outIdx, _dummy.matrix);
  };

  return {
    group,
    update: (elapsedS: number) => {
      let idx = 0;
      const edgePhaseBase = elapsedS * 0.14;
      for (const pts of edgePaths) {
        for (let k = 0; k < CHEVRONS_PER_EDGE; k++) {
          samplePolylinePose(
            pts,
            edgePhaseBase + k / CHEVRONS_PER_EDGE,
            0.0055,
            idx++
          );
        }
      }
      for (let r = 0; r < vortexPaths.length; r++) {
        const pts = vortexPaths[r];
        const speed = 0.11 + r * 0.04;
        for (let k = 0; k < CHEVRONS_PER_LOOP; k++) {
          samplePolylinePose(
            pts,
            elapsedS * speed + k / CHEVRONS_PER_LOOP,
            0.0045,
            idx++
          );
        }
      }
      chevronInst.instanceMatrix.needsUpdate = true;
      coreBarrierMat.emissiveIntensity = 0.72 + Math.sin(elapsedS * 2.4) * 0.18;
    },
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      texs.forEach((t) => t.dispose());
    },
  };
}
