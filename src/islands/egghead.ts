import * as THREE from 'three';
import type { IslandMeshContext, IslandMeshInstance } from './types';
import {
  EGGHEAD_CLOUD_BAND_Y,
  EGGHEAD_CLOUD_DECK_Y,
  EGGHEAD_EMET_CENTER,
  EGGHEAD_FABRIOPHASE_Y,
  EGGHEAD_GLOBE_SCALE,
  EGGHEAD_PUNK_RECORDS_CENTER,
  EGGHEAD_PUNK_TOWER_CENTER,
  EGGHEAD_WORLD_SIZE,
  eggheadCliffSignedDist,
  eggheadCloudNormRadius,
  sampleEggheadCloudHeight,
  sampleEggheadLowerHeight,
  toEggheadSphereLocal,
} from '../utils/eggheadTerrain';
import {
  createEggheadBrokenEggTexture,
  createEggheadCandyStripeTexture,
  createEggheadCliffTexture,
  createEggheadCloudHoloBandTexture,
  createEggheadControllerTexture,
  createEggheadEmetArmorTexture,
  createEggheadFrontierShieldTexture,
  createEggheadLabFacadeTexture,
  createEggheadPunkRecordsHoloTexture,
  createEggheadPunkTowerTexture,
  createEggheadTerrainTexture,
  createEggheadVegaDiskTexture,
  createEggheadVegaPunkRingTexture,
} from './eggheadTextures';

const S = EGGHEAD_GLOBE_SCALE;

// Reusable scratch objects (zero allocations inside update loop)
const _up = new THREE.Vector3(0, 1, 0);
const _yAxis = new THREE.Vector3(0, 1, 0);
const _localNormal = new THREE.Vector3();
const _tiltQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _tmpPos = new THREE.Vector3();
const _tmpTangent = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

function seededRand(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function placeOnEggheadSphere(
  obj: THREE.Object3D,
  lx: number,
  ly: number,
  lz: number,
  globeRadius: number,
  yaw = 0
): void {
  const sp = toEggheadSphereLocal(lx, ly, lz, globeRadius);
  obj.position.set(sp.x, sp.y, sp.z);
  _localNormal.set(sp.x, globeRadius + sp.y, sp.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

export function createIslandMesh(ctx: IslandMeshContext): IslandMeshInstance {
  const { globeRadius, trackGeo, trackMat } = ctx;
  const trackTex = ctx.trackTex ?? (<T extends THREE.Texture>(t: T) => t);
  const group = new THREE.Group();
  group.name = 'island-egghead';

  // Textures
  const terrainTex = trackTex(createEggheadTerrainTexture(1024));
  const cliffTex = trackTex(createEggheadCliffTexture(512));
  const cloudBandTex = trackTex(createEggheadCloudHoloBandTexture(1024, 128));
  const punkRecordsHoloTex = trackTex(createEggheadPunkRecordsHoloTexture(1024, 256));
  const punkTowerTex = trackTex(createEggheadPunkTowerTexture(512, 256));
  const candyTex = trackTex(createEggheadCandyStripeTexture(256));
  const vegaDiskTex = trackTex(createEggheadVegaDiskTexture(512, 256));
  const vegaPunkRingTex = trackTex(createEggheadVegaPunkRingTexture(1024, 128));
  const controllerTex = trackTex(createEggheadControllerTexture(512, 256));
  const labFacadeTex = trackTex(createEggheadLabFacadeTexture(512));
  const brokenEggTex = trackTex(createEggheadBrokenEggTexture(512));
  const shieldTex = trackTex(createEggheadFrontierShieldTexture(512));
  const emetTex = trackTex(createEggheadEmetArmorTexture(512));

  // Shared materials
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: terrainTex,
      roughness: 0.84,
      metalness: 0.04,
      transparent: true,
      alphaTest: 0.05,
    })
  );
  const cliffRockMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: cliffTex,
      roughness: 0.92,
      metalness: 0.04,
    })
  );
  const cloudMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fbff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.08,
      roughness: 0.72,
      metalness: 0.02,
    })
  );
  const cloudBandMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: cloudBandTex,
      emissive: 0x60a5fa,
      emissiveMap: cloudBandTex,
      emissiveIntensity: 1.05,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const whiteLabMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: labFacadeTex,
      roughness: 0.36,
      metalness: 0.18,
    })
  );
  const pastelWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.35,
      metalness: 0.14,
    })
  );
  const darkSlateMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.42,
      metalness: 0.55,
    })
  );
  const cyanNeonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.85,
      roughness: 0.25,
      metalness: 0.2,
    })
  );
  const yellowNeonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xfacc15,
      emissiveIntensity: 0.75,
      roughness: 0.28,
      metalness: 0.2,
    })
  );
  const redAccentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.45,
      roughness: 0.34,
      metalness: 0.18,
    })
  );
  const orangeVoxelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.18,
      roughness: 0.42,
      metalness: 0.12,
    })
  );
  const biodomeGlassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xdcf7ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.14,
      roughness: 0.08,
      metalness: 0.05,
      transmission: 0.42,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    })
  );
  const frontierShieldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: shieldTex,
      emissive: 0x38bdf8,
      emissiveMap: shieldTex,
      emissiveIntensity: 0.65,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const palmTrunkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7c5338,
      roughness: 0.9,
      metalness: 0.02,
    })
  );
  const palmCrownMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.74,
      metalness: 0.02,
    })
  );

  // 1. Lower Tropical Cliff & Fabriophase Base Terrain Mesh
  const seg = 148;
  const terrGeo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= seg; iy++) {
    const vNorm = iy / seg;
    const lz = (vNorm - 0.5) * EGGHEAD_WORLD_SIZE;
    for (let ix = 0; ix <= seg; ix++) {
      const uNorm = ix / seg;
      const lx = (uNorm - 0.5) * EGGHEAD_WORLD_SIZE;
      const cliffDist = eggheadCliffSignedDist(lx, lz);
      const rawH = sampleEggheadLowerHeight(lx, lz);
      const ly = cliffDist > 2.2 ? -0.45 : rawH > 0 ? rawH : -0.18;
      const sp = toEggheadSphereLocal(lx, ly, lz, globeRadius);
      positions.push(sp.x, sp.y, sp.z);
      uvs.push(uNorm, 1 - vNorm);
    }
  }

  for (let iy = 0; iy < seg; iy++) {
    for (let ix = 0; ix < seg; ix++) {
      const lxCenter = ((ix + 0.5) / seg - 0.5) * EGGHEAD_WORLD_SIZE;
      const lzCenter = ((iy + 0.5) / seg - 0.5) * EGGHEAD_WORLD_SIZE;
      if (eggheadCliffSignedDist(lxCenter, lzCenter) > 4.2) continue;

      const a = iy * (seg + 1) + ix;
      const b = a + 1;
      const c = a + seg + 1;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }
  terrGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  terrGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  terrGeo.setIndex(indices);
  terrGeo.computeVertexNormals();
  trackGeo(terrGeo);
  group.add(new THREE.Mesh(terrGeo, terrainMat));

  // Coastal cliff crag boulders around perimeter (InstancedMesh)
  const cragGeo = trackGeo(new THREE.DodecahedronGeometry(1.0 * S, 0));
  const cragPoints: { x: number; y: number; z: number; s: number; sy: number; yaw: number }[] = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const rx = 49.0 * Math.cos(a);
    const rz = 43.5 * Math.sin(a);
    // Keep SE harbor mouth clear
    if (rx > 4 && rx < 32 && rz > 30) continue;
    const h = sampleEggheadLowerHeight(rx, rz);
    cragPoints.push({
      x: rx + (seededRand(i * 3.1) - 0.5) * 3.0,
      y: Math.max(0.8, h * 0.45),
      z: rz + (seededRand(i * 5.7) - 0.5) * 3.0,
      s: 2.4 + seededRand(i * 7.3) * 2.4,
      sy: 3.4 + seededRand(i * 9.1) * 3.8,
      yaw: seededRand(i * 11.3) * Math.PI * 2,
    });
  }
  const cragInst = new THREE.InstancedMesh(cragGeo, cliffRockMat, cragPoints.length);
  for (let i = 0; i < cragPoints.length; i++) {
    const c = cragPoints[i];
    placeOnEggheadSphere(_dummy, c.x, c.y, c.z, globeRadius, c.yaw);
    _dummy.scale.set(c.s, c.sy, c.s * 0.85);
    _dummy.updateMatrix();
    cragInst.setMatrixAt(i, _dummy.matrix);
  }
  cragInst.instanceMatrix.needsUpdate = true;
  group.add(cragInst);

  // 2. Tropical Giant Palm Trees (coastal rim + Emet hollow + Labophase crater)
  const palmSpots: { x: number; y: number; z: number; scale: number; yaw: number }[] = [];
  for (let i = 0; i < 130; i++) {
    const a = seededRand(i * 17.3 + 1.1) * Math.PI * 2;
    const r = 32.0 + seededRand(i * 23.7) * 16.5;
    const px = Math.cos(a) * r * 1.06;
    const pz = Math.sin(a) * r * 0.94;
    if (eggheadCliffSignedDist(px, pz) > -3.5) continue;
    if (px > 4 && px < 32 && pz > 28) continue;
    const py = sampleEggheadLowerHeight(px, pz);
    if (py < 9.5) continue;
    palmSpots.push({
      x: px,
      y: py,
      z: pz,
      scale: 0.85 + seededRand(i * 31.1) * 0.75,
      yaw: seededRand(i * 37.9) * Math.PI * 2,
    });
  }
  // Keep E-SE camera sightline in front of Emet & harbor entrance clear of trunks
  for (let i = palmSpots.length - 1; i >= 0; i--) {
    const p = palmSpots[i];
    if (p.x > -22 && p.x < -8 && p.z > 20 && p.z < 37) {
      palmSpots.splice(i, 1);
    }
  }
  // Extra lush palms flanking left/right/behind Emet's rocky valley
  const emetPalmOffsets: [number, number, number][] = [
    [-34, 17, 1.35],
    [-35, 29, 1.25],
    [-28, 12, 1.4],
    [-30, 35, 1.2],
  ];
  for (let i = 0; i < emetPalmOffsets.length; i++) {
    const [ex, ez, sc] = emetPalmOffsets[i];
    palmSpots.push({
      x: ex,
      y: sampleEggheadLowerHeight(ex, ez),
      z: ez,
      scale: sc,
      yaw: i * 1.1,
    });
  }
  // Palms inside the broken Punk Records crater atop Island Cloud!
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + 0.2;
    const r = 4.2 + seededRand(i * 13.9) * 8.2;
    const px = EGGHEAD_PUNK_RECORDS_CENTER.x + Math.cos(a) * r;
    const pz = EGGHEAD_PUNK_RECORDS_CENTER.z + Math.sin(a) * r;
    palmSpots.push({
      x: px,
      y: sampleEggheadCloudHeight(px, pz) + 0.6,
      z: pz,
      scale: 0.72 + seededRand(i * 19.1) * 0.38,
      yaw: a,
    });
  }

  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.24 * S, 0.42 * S, 5.6 * S, 7));
  trunkGeo.translate(0, 2.8 * S, 0);

  // Build 7-frond curved tropical palm canopy into single InstancedMesh geometry
  const crownGeo = new THREE.BufferGeometry();
  const cVerts: number[] = [];
  const cNorms: number[] = [];
  const cIndices: number[] = [];
  const fronds = 7;
  for (let f = 0; f < fronds; f++) {
    const fa = (f / fronds) * Math.PI * 2 + (f % 2) * 0.14;
    const ca = Math.cos(fa);
    const sa = Math.sin(fa);
    const rx = -sa;
    const rz = ca;
    const baseIdx = cVerts.length / 3;
    const steps = 4;
    for (let st = 0; st <= steps; st++) {
      const t = st / steps;
      const dist = t * 3.1 * S;
      const archY = (5.65 + Math.sin(t * Math.PI * 0.85) * 0.9 - t * t * 1.35) * S;
      const halfW = (0.14 + Math.sin(t * Math.PI) * 0.56) * S;
      const cx = ca * dist;
      const cz = sa * dist;
      cVerts.push(cx - rx * halfW, archY - 0.12 * S, cz - rz * halfW);
      cVerts.push(cx + rx * halfW, archY - 0.12 * S, cz + rz * halfW);
      cVerts.push(cx, archY + 0.16 * S, cz);
      cNorms.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
    }
    for (let st = 0; st < steps; st++) {
      const r0 = baseIdx + st * 3;
      const r1 = r0 + 3;
      cIndices.push(r0, r1, r0 + 2, r0 + 2, r1, r1 + 2);
      cIndices.push(r0 + 2, r1 + 2, r0 + 1, r0 + 1, r1 + 2, r1 + 1);
    }
  }
  crownGeo.setAttribute('position', new THREE.Float32BufferAttribute(cVerts, 3));
  crownGeo.setAttribute('normal', new THREE.Float32BufferAttribute(cNorms, 3));
  crownGeo.setIndex(cIndices);
  crownGeo.computeVertexNormals();
  trackGeo(crownGeo);

  const trunkInst = new THREE.InstancedMesh(trunkGeo, palmTrunkMat, palmSpots.length);
  const crownInst = new THREE.InstancedMesh(crownGeo, palmCrownMat, palmSpots.length);
  for (let i = 0; i < palmSpots.length; i++) {
    const p = palmSpots[i];
    placeOnEggheadSphere(_dummy, p.x, p.y, p.z, globeRadius, p.yaw);
    _dummy.scale.setScalar(p.scale);
    _dummy.updateMatrix();
    trunkInst.setMatrixAt(i, _dummy.matrix);
    crownInst.setMatrixAt(i, _dummy.matrix);
    const shade = 0.8 + seededRand(i * 41.3) * 0.35;
    _color.setRGB(0.16 * shade, 0.56 * shade, 0.2 * shade);
    crownInst.setColorAt(i, _color);
  }
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
  group.add(trunkInst, crownInst);

  // 3. Central Purple PUNK Reactor Chimney-Dome & Cumulus Steam Column
  const punkTowerGroup = new THREE.Group();
  placeOnEggheadSphere(
    punkTowerGroup,
    EGGHEAD_PUNK_TOWER_CENTER.x,
    EGGHEAD_FABRIOPHASE_Y,
    EGGHEAD_PUNK_TOWER_CENTER.z,
    globeRadius
  );
  const punkReactorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: punkTowerTex,
      emissive: 0xa855f7,
      emissiveMap: punkTowerTex,
      emissiveIntensity: 0.45,
      roughness: 0.32,
      metalness: 0.25,
    })
  );
  const punkBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(7.2 * S, 8.2 * S, 10.5 * S, 24)),
    punkReactorMat
  );
  punkBase.position.y = 5.25 * S;
  punkTowerGroup.add(punkBase);

  const punkDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(7.2 * S, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5)),
    punkReactorMat
  );
  punkDome.position.y = 10.5 * S;
  punkTowerGroup.add(punkDome);

  const punkRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(7.35 * S, 0.42 * S, 10, 32)),
    cyanNeonMat
  );
  punkRing.rotation.x = Math.PI * 0.5;
  punkRing.position.y = 10.6 * S;
  punkTowerGroup.add(punkRing);

  const punkNeck = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.1 * S, 2.8 * S, 6.2 * S, 16)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xc084fc,
        roughness: 0.35,
        metalness: 0.3,
      })
    )
  );
  punkNeck.position.y = 20.2 * S;
  punkTowerGroup.add(punkNeck);

  const punkFlange = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.8 * S, 2.3 * S, 1.2 * S, 16)),
    pastelWhiteMat
  );
  punkFlange.position.y = 23.2 * S;
  punkTowerGroup.add(punkFlange);
  group.add(punkTowerGroup);

  // Thick rising Cumulus Steam Pillar connecting chimney -> Island Cloud
  const steamColumnPuffs: { mesh: THREE.Mesh; basePos: THREE.Vector3; phase: number }[] = [];
  const steamSphereGeo = trackGeo(new THREE.SphereGeometry(1.0 * S, 14, 10));
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const ly = 35.5 + t * 23.5;
    const ang = t * 4.4;
    const radOff = 0.8 + t * 2.2;
    const lx = EGGHEAD_PUNK_TOWER_CENTER.x + Math.cos(ang) * radOff;
    const lz = EGGHEAD_PUNK_TOWER_CENTER.z + Math.sin(ang) * radOff;
    const rPuff = 3.1 + t * 4.8 + Math.sin(i * 2.1) * 0.6;
    const puff = new THREE.Mesh(steamSphereGeo, cloudMat);
    placeOnEggheadSphere(puff, lx, ly, lz, globeRadius);
    puff.scale.set(rPuff, rPuff * 0.85, rPuff);
    group.add(puff);
    steamColumnPuffs.push({
      mesh: puff,
      basePos: puff.position.clone(),
      phase: i * 0.7,
    });
  }

  // 4. Spiraling Vacuum Rocket Track & Animated Rocket Capsule
  const vacuumHelixLocalPts: THREE.Vector3[] = [];
  const vacuumHelixWorldPts: THREE.Vector3[] = [];
  const helixSteps = 72;
  for (let i = 0; i <= helixSteps; i++) {
    const t = i / helixSteps;
    const ang = t * Math.PI * 2.35 + 0.5;
    const rad = 8.4 + t * 8.2;
    const lx = EGGHEAD_PUNK_TOWER_CENTER.x + Math.cos(ang) * rad;
    const lz = EGGHEAD_PUNK_TOWER_CENTER.z + Math.sin(ang) * rad;
    const ly = 13.5 + t * (EGGHEAD_CLOUD_DECK_Y + 2.2 - 13.5);
    vacuumHelixLocalPts.push(new THREE.Vector3(lx, ly, lz));
    const sp = toEggheadSphereLocal(lx, ly, lz, globeRadius);
    vacuumHelixWorldPts.push(new THREE.Vector3(sp.x, sp.y, sp.z));
  }
  const vacuumCurve = new THREE.CatmullRomCurve3(vacuumHelixWorldPts);
  const vacuumTubeGeo = trackGeo(new THREE.TubeGeometry(vacuumCurve, 72, 0.24 * S, 8, false));
  group.add(new THREE.Mesh(vacuumTubeGeo, yellowNeonMat));

  // Luminous guide rings along Vacuum track
  const trackRingGeo = trackGeo(new THREE.TorusGeometry(0.95 * S, 0.14 * S, 8, 18));
  const trackRingInst = new THREE.InstancedMesh(trackRingGeo, cyanNeonMat, 18);
  for (let i = 0; i < 18; i++) {
    const u = (i + 0.5) / 18;
    const pt = vacuumCurve.getPointAt(u);
    const tang = vacuumCurve.getTangentAt(u);
    _dummy.position.copy(pt);
    _tiltQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tang);
    _dummy.quaternion.copy(_tiltQuat);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    trackRingInst.setMatrixAt(i, _dummy.matrix);
  }
  trackRingInst.instanceMatrix.needsUpdate = true;
  group.add(trackRingInst);

  // Animated Vacuum Rocket Pod
  const vacuumPod = new THREE.Group();
  const podShell = new THREE.Mesh(
    trackGeo(new THREE.CapsuleGeometry(0.75 * S, 1.6 * S, 6, 12)),
    pastelWhiteMat
  );
  podShell.rotation.x = Math.PI * 0.5;
  vacuumPod.add(podShell);
  const podGlow = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.68 * S, 12, 8)),
    cyanNeonMat
  );
  podGlow.position.z = 0.65 * S;
  vacuumPod.add(podGlow);
  group.add(vacuumPod);

  // 5. Floating Island Cloud Plateau (Cumuloregalis) & =066= / =100= Holo Ring
  const cloudGroup = new THREE.Group();
  // Central sculpted cloud cushion top
  const cSeg = 64;
  const cloudTopGeo = new THREE.BufferGeometry();
  const cPos: number[] = [];
  const cUvs: number[] = [];
  const cIdx: number[] = [];
  const cloudSpan = 88;
  for (let iy = 0; iy <= cSeg; iy++) {
    const vn = iy / cSeg;
    const lz = (vn - 0.5) * cloudSpan;
    for (let ix = 0; ix <= cSeg; ix++) {
      const un = ix / cSeg;
      const lx = (un - 0.5) * cloudSpan;
      const nr = eggheadCloudNormRadius(lx, lz);
      const ly =
        nr < 1.0
          ? sampleEggheadCloudHeight(lx, lz)
          : EGGHEAD_CLOUD_DECK_Y - Math.min(8.5, (nr - 1.0) * 32.0);
      const sp = toEggheadSphereLocal(lx, ly, lz, globeRadius);
      cPos.push(sp.x, sp.y, sp.z);
      cUvs.push(un, 1 - vn);
    }
  }
  for (let iy = 0; iy < cSeg; iy++) {
    for (let ix = 0; ix < cSeg; ix++) {
      const lxC = ((ix + 0.5) / cSeg - 0.5) * cloudSpan;
      const lzC = ((iy + 0.5) / cSeg - 0.5) * cloudSpan;
      if (eggheadCloudNormRadius(lxC, lzC) > 1.08) continue;
      const a = iy * (cSeg + 1) + ix;
      const b = a + 1;
      const c = a + cSeg + 1;
      const d = c + 1;
      cIdx.push(a, c, b, b, c, d);
    }
  }
  cloudTopGeo.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
  cloudTopGeo.setAttribute('uv', new THREE.Float32BufferAttribute(cUvs, 2));
  cloudTopGeo.setIndex(cIdx);
  cloudTopGeo.computeVertexNormals();
  trackGeo(cloudTopGeo);
  cloudGroup.add(new THREE.Mesh(cloudTopGeo, cloudMat));

  // Thick fluffy multi-lobe Island Cloud underbelly & perimeter puffs
  const cloudPuffGeo = trackGeo(new THREE.IcosahedronGeometry(1.0 * S, 2));
  const cloudPuffs: { x: number; y: number; z: number; sx: number; sy: number; sz: number }[] = [];
  // Rim lobes wrapping the plateau edge
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2;
    const rx = 35.5 + Math.sin(i * 2.3) * 3.2;
    const rz = 32.0 + Math.cos(i * 1.9) * 2.8;
    const rad = 7.4 + seededRand(i * 5.9) * 3.8;
    cloudPuffs.push({
      x: Math.cos(a) * rx,
      y: EGGHEAD_CLOUD_DECK_Y - 3.6 + (seededRand(i * 7.1) - 0.5) * 2.2,
      z: Math.sin(a) * rz,
      sx: rad * 1.25,
      sy: rad * 0.85,
      sz: rad * 1.2,
    });
  }
  // Underside billowing cumulus belly
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + 0.3;
    const r = i < 4 ? 5.0 : 18.0 + (i % 3) * 5.0;
    const rad = 8.2 + seededRand(i * 11.7) * 3.6;
    cloudPuffs.push({
      x: Math.cos(a) * r,
      y: EGGHEAD_CLOUD_DECK_Y - 9.2 - (i < 4 ? 3.5 : 0),
      z: Math.sin(a) * r * 0.9,
      sx: rad * 1.35,
      sy: rad * 0.78,
      sz: rad * 1.25,
    });
  }
  // Floating decorative mid-sky side cumulus wisps matching image_8d341d86.png
  const skyWisps: [number, number, number, number][] = [
    [-36, 46, 22, 6.2],
    [35, 48, 20, 6.8],
    [-42, 62, -16, 5.4],
    [40, 58, -18, 5.8],
    [18, 40, 32, 5.2],
  ];
  for (const [wx, wy, wz, wr] of skyWisps) {
    cloudPuffs.push({ x: wx, y: wy, z: wz, sx: wr * 1.4, sy: wr * 0.72, sz: wr * 1.1 });
    cloudPuffs.push({
      x: wx + wr * 0.65,
      y: wy + wr * 0.25,
      z: wz - wr * 0.2,
      sx: wr * 0.95,
      sy: wr * 0.65,
      sz: wr * 0.85,
    });
  }
  const cloudPuffInst = new THREE.InstancedMesh(cloudPuffGeo, cloudMat, cloudPuffs.length);
  for (let i = 0; i < cloudPuffs.length; i++) {
    const p = cloudPuffs[i];
    placeOnEggheadSphere(_dummy, p.x, p.y, p.z, globeRadius);
    _dummy.scale.set(p.sx, p.sy, p.sz);
    _dummy.updateMatrix();
    cloudPuffInst.setMatrixAt(i, _dummy.matrix);
  }
  cloudPuffInst.instanceMatrix.needsUpdate = true;
  cloudGroup.add(cloudPuffInst);

  // Orbiting glowing cyan holographic =066= / =100= Cloud Ring Band outside fluffy rim
  const cloudHaloBand = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(50.2 * S, 50.2 * S, 4.6 * S, 64, 1, true)),
    cloudBandMat
  );
  placeOnEggheadSphere(cloudHaloBand, 0, EGGHEAD_CLOUD_BAND_Y, 0, globeRadius);
  cloudGroup.add(cloudHaloBand);
  group.add(cloudGroup);

  // 6. Upper Labophase Research Complex + Frontier Dome + Colossal Cracked PUNK RECORDS Dome
  const labophaseGroup = new THREE.Group();
  placeOnEggheadSphere(
    labophaseGroup,
    EGGHEAD_PUNK_RECORDS_CENTER.x,
    EGGHEAD_CLOUD_DECK_Y + 0.6,
    EGGHEAD_PUNK_RECORDS_CENTER.z,
    globeRadius
  );

  // Labophase sleek white research buildings (arranged around the broken egg)
  const labSpecs: [number, number, number, number, number, number][] = [
    [-20, 14, 10.5, 9.5, 6.2, 0.25],
    [19, 13, 11.2, 8.8, 6.5, -0.3],
    [-22, -10, 9.5, 11.0, 8.0, 0.55],
    [21, -9, 10.0, 10.5, 7.6, -0.45],
    [0, 21, 14.0, 5.2, 5.2, 0.0],
    [-10, -21, 12.0, 6.8, 7.0, 0.15],
    [12, -20, 11.5, 7.5, 6.8, -0.18],
  ];
  for (const [bx, bz, bw, bd, bh, yaw] of labSpecs) {
    const bGroup = new THREE.Group();
    bGroup.position.set(bx * S, 0, bz * S);
    bGroup.rotation.y = yaw;
    const body = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(bw * S, bh * S, bd * S)),
      whiteLabMat
    );
    body.position.y = bh * 0.5 * S;
    bGroup.add(body);

    const roof = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(bw * 0.42 * S, bw * 0.48 * S, 1.1 * S, 16)),
      pastelWhiteMat
    );
    roof.position.y = (bh + 0.55) * S;
    bGroup.add(roof);

    const trim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(bw * 0.44 * S, 0.18 * S, 8, 24)),
      cyanNeonMat
    );
    trim.rotation.x = Math.PI * 0.5;
    trim.position.y = (bh + 0.1) * S;
    bGroup.add(trim);
    labophaseGroup.add(bGroup);
  }

  // Shimmering translucent Frontier Dome energy shield arching over Labophase
  const frontierDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(34.5 * S, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.54)),
    frontierShieldMat
  );
  frontierDome.position.y = 0.2 * S;
  labophaseGroup.add(frontierDome);

  // Colossal Broken Egg Dome: PUNK RECORDS
  const eggRadius = 15.6;
  const eggTexMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: brokenEggTex,
      emissive: 0xc084fc,
      emissiveIntensity: 0.16,
      roughness: 0.3,
      metalness: 0.14,
      side: THREE.DoubleSide,
    })
  );
  const eggInnerRimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xa855f7,
      emissiveIntensity: 0.28,
      roughness: 0.35,
      metalness: 0.15,
    })
  );

  // Lower Egg Crater Bowl
  const lowerEggBowl = new THREE.Mesh(
    trackGeo(
      new THREE.SphereGeometry(
        eggRadius * S,
        36,
        18,
        0,
        Math.PI * 2,
        Math.PI * 0.38,
        Math.PI * 0.32
      )
    ),
    eggTexMat
  );
  lowerEggBowl.position.y = 4.2 * S;
  labophaseGroup.add(lowerEggBowl);

  // Zigzag broken tooth crown along lower egg rim
  const toothGeo = trackGeo(new THREE.ConeGeometry(2.3 * S, 4.4 * S, 4));
  const toothCount = 16;
  const lowerTeethInst = new THREE.InstancedMesh(toothGeo, eggInnerRimMat, toothCount);
  for (let i = 0; i < toothCount; i++) {
    const a = (i / toothCount) * Math.PI * 2;
    const rad = eggRadius * 0.92 * S;
    _dummy.position.set(Math.cos(a) * rad, 9.8 * S, Math.sin(a) * rad);
    _dummy.rotation.set(0, -a, 0);
    _dummy.scale.set(1, 1, 0.55);
    _dummy.updateMatrix();
    lowerTeethInst.setMatrixAt(i, _dummy.matrix);
  }
  lowerTeethInst.instanceMatrix.needsUpdate = true;
  labophaseGroup.add(lowerTeethInst);

  // Curved Holographic "PUNK RECORDS" glowing screen suspended inside the broken egg mouth
  const punkScreenMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: punkRecordsHoloTex,
      emissive: 0xe879f9,
      emissiveMap: punkRecordsHoloTex,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const punkHoloScreen = new THREE.Mesh(
    trackGeo(
      new THREE.CylinderGeometry(
        13.2 * S,
        13.2 * S,
        8.2 * S,
        32,
        1,
        true,
        -Math.PI * 0.42,
        Math.PI * 0.84
      )
    ),
    punkScreenMat
  );
  punkHoloScreen.position.y = 14.5 * S;
  labophaseGroup.add(punkHoloScreen);

  // Upper Cracked Egg Cap hovering and tilted open above the crater
  const upperEggGroup = new THREE.Group();
  upperEggGroup.position.set(0, 18.2 * S, -2.0 * S);
  upperEggGroup.rotation.x = -0.26;
  const upperEggCap = new THREE.Mesh(
    trackGeo(
      new THREE.SphereGeometry(
        eggRadius * 0.96 * S,
        36,
        20,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.5
      )
    ),
    eggTexMat
  );
  upperEggGroup.add(upperEggCap);

  // Inverted zigzag teeth under upper shell cap
  const upperTeethInst = new THREE.InstancedMesh(toothGeo, eggInnerRimMat, toothCount);
  for (let i = 0; i < toothCount; i++) {
    const a = ((i + 0.5) / toothCount) * Math.PI * 2;
    const rad = eggRadius * 0.92 * S;
    _dummy.position.set(Math.cos(a) * rad, -1.5 * S, Math.sin(a) * rad);
    _dummy.rotation.set(Math.PI, -a, 0);
    _dummy.scale.set(1, 1, 0.55);
    _dummy.updateMatrix();
    upperTeethInst.setMatrixAt(i, _dummy.matrix);
  }
  upperTeethInst.instanceMatrix.needsUpdate = true;
  upperEggGroup.add(upperTeethInst);

  // Orbiting Blue Blocky Data / Circuitry Ring around upper Punk Records egg!
  const dataOrbitRing = new THREE.Group();
  dataOrbitRing.position.set(0, 8.2 * S, 0);
  dataOrbitRing.rotation.set(0.24, 0, -0.32);
  const circuitBlockGeo = trackGeo(new THREE.BoxGeometry(1.0 * S, 1.0 * S, 1.0 * S));
  const circuitBlockMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.35,
      roughness: 0.32,
      metalness: 0.45,
    })
  );
  const blockCount = 46;
  const circuitInst = new THREE.InstancedMesh(circuitBlockGeo, circuitBlockMat, blockCount);
  for (let i = 0; i < blockCount; i++) {
    const a = (i / blockCount) * Math.PI * 2;
    const rad = (17.5 + Math.sin(i * 2.7) * 2.1) * S;
    const hOff = (seededRand(i * 9.3) - 0.5) * 3.8 * S;
    _dummy.position.set(Math.cos(a) * rad, hOff, Math.sin(a) * rad);
    _dummy.rotation.set(0, -a, 0);
    _dummy.scale.set(
      1.6 + seededRand(i * 3.3) * 2.8,
      1.1 + seededRand(i * 5.1) * 2.2,
      1.2 + seededRand(i * 7.7) * 1.6
    );
    _dummy.updateMatrix();
    circuitInst.setMatrixAt(i, _dummy.matrix);
    const blueShade = 0.72 + seededRand(i * 11.7) * 0.28;
    _color.setRGB(0.22 * blueShade, 0.58 * blueShade, 0.96 * blueShade);
    circuitInst.setColorAt(i, _color);
  }
  circuitInst.instanceMatrix.needsUpdate = true;
  if (circuitInst.instanceColor) circuitInst.instanceColor.needsUpdate = true;
  dataOrbitRing.add(circuitInst);
  upperEggGroup.add(dataOrbitRing);
  labophaseGroup.add(upperEggGroup);
  group.add(labophaseGroup);

  // 7. Fabriophase Retro-Futuristic Cityscape (image_a76ed54a & image_ff8d19d6 & image_8bfbd801)
  const candyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: candyTex,
      roughness: 0.38,
      metalness: 0.12,
    })
  );
  const vegaPunkRingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: vegaPunkRingTex,
      emissive: 0x38bdf8,
      emissiveMap: vegaPunkRingTex,
      emissiveIntensity: 0.9,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );

  // 7a. Candy-Striped "VEGA PUNK" Glass Biodome Tower (-3.5, 11)
  const vegaTower = new THREE.Group();
  placeOnEggheadSphere(vegaTower, -3.5, EGGHEAD_FABRIOPHASE_Y, 10.8, globeRadius);
  const vtShaft = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.3 * S, 1.5 * S, 8.6 * S, 20)),
    candyMat
  );
  vtShaft.position.y = 4.3 * S;
  vegaTower.add(vtShaft);
  const vtPlate = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(4.4 * S, 4.0 * S, 0.85 * S, 24)),
    yellowNeonMat
  );
  vtPlate.position.y = 8.9 * S;
  vegaTower.add(vtPlate);
  // Mini rocket domes inside clear glass globe
  for (const [mx, mz, col] of [
    [-1.2, -0.6, 0xec4899],
    [1.1, 0.7, 0x38bdf8],
    [0.0, -1.3, 0x4ade80],
  ] as [number, number, number][]) {
    const mPod = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.85 * S, 2.6 * S, 10)),
      trackMat(new THREE.MeshStandardMaterial({ color: col, roughness: 0.35 }))
    );
    mPod.position.set(mx * S, 10.6 * S, mz * S);
    vegaTower.add(mPod);
  }
  const vtGlass = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(4.1 * S, 24, 18)),
    biodomeGlassMat
  );
  vtGlass.position.y = 12.4 * S;
  vegaTower.add(vtGlass);
  const vtBanner = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(4.3 * S, 4.3 * S, 1.45 * S, 28, 1, true)),
    vegaPunkRingMat
  );
  vtBanner.position.y = 13.6 * S;
  vegaTower.add(vtBanner);
  // Star Spire atop Biodome
  const vtSpire = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.18 * S, 0.38 * S, 2.8 * S, 8)),
    redAccentMat
  );
  vtSpire.position.y = 17.4 * S;
  vegaTower.add(vtSpire);
  const vtStarHalo = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(1.1 * S, 0.18 * S, 8, 20)),
    yellowNeonMat
  );
  vtStarHalo.rotation.x = Math.PI * 0.5;
  vtStarHalo.position.y = 18.2 * S;
  vegaTower.add(vtStarHalo);
  const vtStar = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.75 * S, 0)),
    yellowNeonMat
  );
  vtStar.position.y = 19.1 * S;
  vegaTower.add(vtStar);
  group.add(vegaTower);

  // 7b. Glowing "VEGA" Upright Oval Billboard facing Avenue VEGA (2.2, 18.0)
  const vegaSignGroup = new THREE.Group();
  placeOnEggheadSphere(vegaSignGroup, 2.2, EGGHEAD_FABRIOPHASE_Y, 18.0, globeRadius, -0.14);
  const signPillar = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.85 * S, 1.2 * S, 3.8 * S, 14)),
    redAccentMat
  );
  signPillar.position.y = 1.9 * S;
  vegaSignGroup.add(signPillar);
  const vegaDiskMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: vegaDiskTex,
      emissive: 0x38bdf8,
      emissiveMap: vegaDiskTex,
      emissiveIntensity: 0.72,
      roughness: 0.25,
      side: THREE.DoubleSide,
    })
  );
  const vegaFaceGeo = trackGeo(new THREE.CircleGeometry(3.2 * S, 32));
  const vegaFront = new THREE.Mesh(vegaFaceGeo, vegaDiskMat);
  vegaFront.scale.set(1.45, 0.78, 1);
  vegaFront.position.set(0, 5.2 * S, 0.25 * S);
  vegaSignGroup.add(vegaFront);
  const vegaBack = new THREE.Mesh(vegaFaceGeo, vegaDiskMat);
  vegaBack.rotation.y = Math.PI;
  vegaBack.scale.set(1.45, 0.78, 1);
  vegaBack.position.set(0, 5.2 * S, -0.25 * S);
  vegaSignGroup.add(vegaBack);
  const vegaRim = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(3.2 * S, 0.28 * S, 10, 32)),
    yellowNeonMat
  );
  vegaRim.scale.set(1.45, 0.78, 1);
  vegaRim.position.y = 5.2 * S;
  vegaSignGroup.add(vegaRim);
  group.add(vegaSignGroup);

  // 7c. Stacked Orange Voxel / Tetris Tower (-12.5, 9.5)
  const voxelGroup = new THREE.Group();
  placeOnEggheadSphere(voxelGroup, -12.5, EGGHEAD_FABRIOPHASE_Y, 9.5, globeRadius, 0.35);
  const voxelOffsets: [number, number, number, number, number, number][] = [
    [0, 2.2, 0, 2.6, 4.4, 2.6],
    [1.1, 5.4, 0, 3.2, 2.2, 2.6],
    [-0.9, 8.2, 0, 3.6, 3.2, 2.8],
    [1.2, 10.6, 0, 2.8, 2.2, 2.6],
  ];
  for (const [vx, vy, vz, vw, vh, vd] of voxelOffsets) {
    const block = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(vw * S, vh * S, vd * S)),
      orangeVoxelMat
    );
    block.position.set(vx * S, vy * S, vz * S);
    voxelGroup.add(block);
  }
  const voxelHead = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.8 * S, 1.5 * S, 2.4 * S)),
    pastelWhiteMat
  );
  voxelHead.position.set(1.2 * S, 12.2 * S, 0);
  voxelGroup.add(voxelHead);
  group.add(voxelGroup);

  // 7d. Purple Retro Game-Controller Billboard Tower (-13.5, 18.2)
  const ctrlTower = new THREE.Group();
  placeOnEggheadSphere(ctrlTower, -13.5, EGGHEAD_FABRIOPHASE_Y, 18.2, globeRadius, 0.35);
  const ctrlBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.6 * S, 3.0 * S, 4.4 * S, 16)),
    cyanNeonMat
  );
  ctrlBase.position.y = 2.2 * S;
  ctrlTower.add(ctrlBase);
  const ctrlMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: controllerTex,
      emissive: 0xa855f7,
      emissiveMap: controllerTex,
      emissiveIntensity: 0.45,
      roughness: 0.3,
    })
  );
  const ctrlBoard = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.8 * S, 3.6 * S, 1.2 * S)),
    ctrlMat
  );
  ctrlBoard.position.y = 6.2 * S;
  ctrlTower.add(ctrlBoard);
  group.add(ctrlTower);

  // 7e. Giant Floating Wireless Headphones (8.5, 22.5, 16.5) — animated gentle bob
  const headphonesGroup = new THREE.Group();
  const headphonesAnchor = new THREE.Group();
  placeOnEggheadSphere(headphonesAnchor, 8.5, EGGHEAD_FABRIOPHASE_Y + 9.5, 16.5, globeRadius, -0.55);
  const hpBand = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(2.6 * S, 0.38 * S, 10, 28, Math.PI)),
    redAccentMat
  );
  headphonesGroup.add(hpBand);
  const hpBody = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.3 * S, 1.3 * S, 4.6 * S, 16)),
    darkSlateMat
  );
  hpBody.rotation.z = Math.PI * 0.5;
  headphonesGroup.add(hpBody);
  const hpEarGreenMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      emissive: 0x22c55e,
      emissiveIntensity: 0.55,
      roughness: 0.25,
    })
  );
  for (const side of [-1, 1]) {
    const cupRim = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.75 * S, 1.75 * S, 0.8 * S, 20)),
      redAccentMat
    );
    cupRim.rotation.z = Math.PI * 0.5;
    cupRim.position.x = side * 2.55 * S;
    headphonesGroup.add(cupRim);
    const cupGlow = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.35 * S, 1.35 * S, 0.88 * S, 20)),
      hpEarGreenMat
    );
    cupGlow.rotation.z = Math.PI * 0.5;
    cupGlow.position.x = side * 2.6 * S;
    headphonesGroup.add(cupGlow);
  }
  headphonesAnchor.add(headphonesGroup);
  group.add(headphonesAnchor);

  // 7f. Secondary Glass Biodomes, Pastel Skyscrapers & Star Pylons across Fabriophase
  const domeBuildings: [number, number, number, number, number][] = [
    [1.2, 3.5, 2.8, 4.2, 0x06b6d4],
    [16.5, 13.5, 3.8, 5.2, 0x6366f1],
    [-19.5, 5.5, 3.4, 7.2, 0x3b82f6],
    [-16.0, -10.5, 3.6, 6.4, 0xec4899],
    [13.5, -12.5, 3.8, 7.6, 0x10b981],
    [-6.0, -16.5, 3.2, 8.2, 0x8b5cf6],
    [22.5, -3.5, 3.1, 5.8, 0xf59e0b],
    [-25.0, -2.0, 2.9, 5.0, 0x14b8a6],
    [3.0, 21.5, 2.7, 3.6, 0xf43f5e],
    [-22.0, 12.0, 2.8, 4.4, 0x0ea5e9],
  ];
  for (const [fx, fz, fr, fh, col] of domeBuildings) {
    const b = new THREE.Group();
    placeOnEggheadSphere(b, fx, EGGHEAD_FABRIOPHASE_Y, fz, globeRadius);
    const base = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(fr * 0.85 * S, fr * S, fh * S, 16)),
      whiteLabMat
    );
    base.position.y = fh * 0.5 * S;
    b.add(base);
    const accent = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(fr * 0.9 * S, 0.24 * S, 8, 22)),
      trackMat(new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35 }))
    );
    accent.rotation.x = Math.PI * 0.5;
    accent.position.y = fh * S;
    b.add(accent);
    const dome = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(fr * 0.92 * S, 18, 14)),
      biodomeGlassMat
    );
    dome.position.y = (fh + fr * 0.65) * S;
    b.add(dome);
    const core = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(fr * 0.38 * S, fr * 0.85 * S, 8)),
      trackMat(new THREE.MeshStandardMaterial({ color: col, roughness: 0.35 }))
    );
    core.position.y = (fh + fr * 0.45) * S;
    b.add(core);
    group.add(b);
  }

  // 8. Luminous Sky-Paths, Red/Yellow Sky-Rings, Vegaforce-01, Cyber Dragon & Sky-Whale (image_ff8d19d6)
  const skyPathPts: THREE.Vector3[] = [];
  const spCoords: [number, number, number][] = [
    [-8, 18, 18],
    [1, 20, 13],
    [7, 22, 7],
    [12, 23, 0],
    [18, 21, -8],
  ];
  for (const [sx, sy, sz] of spCoords) {
    const sp = toEggheadSphereLocal(sx, sy, sz, globeRadius);
    skyPathPts.push(new THREE.Vector3(sp.x, sp.y, sp.z));
  }
  const skyCurve = new THREE.CatmullRomCurve3(skyPathPts);
  const skyTubeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.22,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
  );
  group.add(new THREE.Mesh(trackGeo(new THREE.TubeGeometry(skyCurve, 44, 1.35 * S, 12, false)), skyTubeMat));

  const skyRingGeo = trackGeo(new THREE.TorusGeometry(1.65 * S, 0.26 * S, 10, 24));
  const skyRingInst = new THREE.InstancedMesh(skyRingGeo, yellowNeonMat, 12);
  for (let i = 0; i < 12; i++) {
    const u = (i + 0.4) / 12;
    const pt = skyCurve.getPointAt(u);
    const tang = skyCurve.getTangentAt(u);
    _dummy.position.copy(pt);
    _tiltQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tang);
    _dummy.quaternion.copy(_tiltQuat);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    skyRingInst.setMatrixAt(i, _dummy.matrix);
    _color.setHex(i % 4 === 0 ? 0xef4444 : 0xfacc15);
    skyRingInst.setColorAt(i, _color);
  }
  skyRingInst.instanceMatrix.needsUpdate = true;
  if (skyRingInst.instanceColor) skyRingInst.instanceColor.needsUpdate = true;
  group.add(skyRingInst);

  // Vegaforce-01 Green Heavy Mecha (hovering at (14.5, 17.5, 2.5))
  const vegaforceAnchor = new THREE.Group();
  placeOnEggheadSphere(vegaforceAnchor, 14.5, EGGHEAD_FABRIOPHASE_Y + 5.8, 2.5, globeRadius, -0.45);
  const vegaforceBody = new THREE.Group();
  const vfGreenMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.34, metalness: 0.35 })
  );
  const vfTorso = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(2.4 * S, 16, 12)),
    vfGreenMat
  );
  vfTorso.scale.set(1.15, 1.05, 0.95);
  vegaforceBody.add(vfTorso);
  const vfHead = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.0 * S, 1.1 * S, 1.6 * S, 12)),
    pastelWhiteMat
  );
  vfHead.position.y = 2.4 * S;
  vegaforceBody.add(vfHead);
  const vfCrest = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.4 * S, 0.42 * S, 0.35 * S)),
    yellowNeonMat
  );
  vfCrest.position.set(0, 3.25 * S, 0.65 * S);
  vegaforceBody.add(vfCrest);
  for (const side of [-1, 1]) {
    const thruster = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.95 * S, 1.2 * S, 2.6 * S, 12)),
      darkSlateMat
    );
    thruster.rotation.x = Math.PI * 0.35;
    thruster.position.set(side * 2.5 * S, 0.8 * S, -1.6 * S);
    vegaforceBody.add(thruster);
    const arm = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.1 * S, 2.4 * S, 1.2 * S)),
      vfGreenMat
    );
    arm.position.set(side * 2.9 * S, -0.6 * S, 0.5 * S);
    vegaforceBody.add(arm);
  }
  vegaforceAnchor.add(vegaforceBody);
  group.add(vegaforceAnchor);

  // Red Cyber Dragon Hologram arching over Avenue VEGA
  const dragonAnchor = new THREE.Group();
  placeOnEggheadSphere(dragonAnchor, 7.2, EGGHEAD_FABRIOPHASE_Y + 13.5, 4.5, globeRadius, 0.55);
  const dragonGroup = new THREE.Group();
  const dragonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xef4444,
      emissiveIntensity: 0.38,
      roughness: 0.3,
      metalness: 0.25,
    })
  );
  for (let i = 0; i < 6; i++) {
    const segMesh = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry((1.25 - i * 0.14) * S, 2.4 * S, 8)),
      dragonMat
    );
    segMesh.rotation.z = Math.PI * 0.5 + i * 0.14;
    segMesh.position.set((-i * 1.4) * S, Math.sin(i * 0.9) * 1.2 * S, (i * 0.6) * S);
    dragonGroup.add(segMesh);
  }
  const dHead = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.8 * S, 1.6 * S, 1.8 * S)),
    dragonMat
  );
  dHead.position.set(1.5 * S, 0.4 * S, 0);
  dragonGroup.add(dHead);
  const dJaw = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.4 * S, 0.6 * S, 1.5 * S)),
    pastelWhiteMat
  );
  dJaw.position.set(1.7 * S, -0.55 * S, 0);
  dragonGroup.add(dJaw);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(2.2 * S, 5.2 * S, 4)),
      dragonMat
    );
    wing.rotation.set(side * 0.9, 0, -0.4);
    wing.position.set(-1.5 * S, 1.8 * S, side * 2.6 * S);
    dragonGroup.add(wing);
  }
  dragonAnchor.add(dragonGroup);
  group.add(dragonAnchor);

  // Sky-Whale Hologram soaring above Vegaforce (9.5, 31.5, -1)
  const whaleAnchor = new THREE.Group();
  placeOnEggheadSphere(whaleAnchor, 9.5, EGGHEAD_FABRIOPHASE_Y + 19.5, -1.0, globeRadius, 0.3);
  const whaleGroup = new THREE.Group();
  const whaleBody = new THREE.Mesh(
    trackGeo(new THREE.CapsuleGeometry(1.1 * S, 3.8 * S, 8, 12)),
    cyanNeonMat
  );
  whaleBody.rotation.z = Math.PI * 0.5;
  whaleGroup.add(whaleBody);
  const whaleTail = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.4 * S, 0.35 * S, 2.8 * S)),
    pastelWhiteMat
  );
  whaleTail.position.x = -2.8 * S;
  whaleGroup.add(whaleTail);
  whaleAnchor.add(whaleGroup);
  group.add(whaleAnchor);

  // Hovering Utopian Saucer Pods around Fabriophase
  const hoverPods: { group: THREE.Group; baseY: number; phase: number }[] = [];
  const podLocs: [number, number, number][] = [
    [-16, 28, 12],
    [16, 28, 10],
    [0, 26, 24],
    [-22, 27, -6],
    [22, 27, -10],
  ];
  for (let i = 0; i < podLocs.length; i++) {
    const [px, py, pz] = podLocs[i];
    const anchor = new THREE.Group();
    placeOnEggheadSphere(anchor, px, py, pz, globeRadius, i * 0.8);
    const podInner = new THREE.Group();
    const saucer = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.6 * S, 2.2 * S, 0.85 * S, 18)),
      pastelWhiteMat
    );
    podInner.add(saucer);
    const canopy = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(1.65 * S, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)),
      biodomeGlassMat
    );
    canopy.position.y = 0.35 * S;
    podInner.add(canopy);
    const rim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(2.45 * S, 0.16 * S, 8, 22)),
      i % 2 === 0 ? cyanNeonMat : yellowNeonMat
    );
    rim.rotation.x = Math.PI * 0.5;
    podInner.add(rim);
    anchor.add(podInner);
    group.add(anchor);
    hoverPods.push({ group: podInner, baseY: 0, phase: i * 1.3 });
  }

  // 9. Ancient Iron Giant "Emet" in Mossy Palm Hollow (image_78f55736.png)
  const emetGroup = new THREE.Group();
  const emetGroundY = sampleEggheadLowerHeight(EGGHEAD_EMET_CENTER.x, EGGHEAD_EMET_CENTER.z);
  placeOnEggheadSphere(
    emetGroup,
    EGGHEAD_EMET_CENTER.x,
    emetGroundY - 0.8,
    EGGHEAD_EMET_CENTER.z,
    globeRadius,
    0.88
  );
  const emetMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: emetTex,
      roughness: 0.78,
      metalness: 0.42,
    })
  );
  const mossMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5ca43e,
      roughness: 0.9,
      metalness: 0.02,
    })
  );

  // Broad barrel torso seated in scrap
  const emetTorso = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(4.4 * S, 5.2 * S, 7.6 * S, 18)),
    emetMat
  );
  emetTorso.position.y = 3.8 * S;
  emetTorso.rotation.x = 0.12;
  emetGroup.add(emetTorso);

  // Mossy shoulder cowl & pauldrons
  const emetShoulders = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(10.8 * S, 2.8 * S, 5.2 * S)),
    emetMat
  );
  emetShoulders.position.set(0, 7.6 * S, 0.2 * S);
  emetGroup.add(emetShoulders);
  const shoulderMoss = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(10.6 * S, 0.95 * S, 4.9 * S)),
    mossMat
  );
  shoulderMoss.position.set(0, 9.0 * S, 0.1 * S);
  emetGroup.add(shoulderMoss);

  // Heavy Viking helmet head + visor grill + one curved left horn + broken right horn stump
  const emetHead = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.1 * S, 2.4 * S, 3.6 * S, 14)),
    emetMat
  );
  emetHead.position.set(0, 10.4 * S, 0.8 * S);
  emetGroup.add(emetHead);
  const emetDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(2.15 * S, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)),
    emetMat
  );
  emetDome.position.set(0, 12.1 * S, 0.8 * S);
  emetGroup.add(emetDome);

  // Slotted helmet visor bars
  for (let v = -2; v <= 2; v++) {
    const slit = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.2 * S, 1.5 * S, 0.35 * S)),
      darkSlateMat
    );
    slit.position.set(v * 0.45 * S, 10.1 * S, 3.05 * S);
    emetGroup.add(slit);
  }
  // Intact left curved horn
  const leftHornPts = [
    new THREE.Vector3(-2.1 * S, 12.2 * S, 0.8 * S),
    new THREE.Vector3(-3.8 * S, 13.6 * S, 0.6 * S),
    new THREE.Vector3(-4.2 * S, 15.8 * S, 1.0 * S),
  ];
  const leftHorn = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(leftHornPts), 14, 0.45 * S, 8, false)),
    emetMat
  );
  emetGroup.add(leftHorn);
  // Broken right horn stump
  const rightStump = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.45 * S, 0.58 * S, 1.7 * S, 8)),
    emetMat
  );
  rightStump.rotation.z = -1.1;
  rightStump.position.set(2.5 * S, 12.3 * S, 0.8 * S);
  emetGroup.add(rightStump);

  // Massive forearms buried into the foreground scrap heap
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.7 * S, 2.0 * S, 6.4 * S, 12)),
      emetMat
    );
    arm.position.set(side * 5.8 * S, 4.2 * S, 1.6 * S);
    arm.rotation.set(-0.45, 0, side * 0.25);
    emetGroup.add(arm);
  }
  // Rusted metal lance/pipe protruding from Emet's chest
  const chestPipe = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.24 * S, 0.28 * S, 7.2 * S, 8)),
    darkSlateMat
  );
  chestPipe.position.set(-1.6 * S, 5.4 * S, 3.8 * S);
  chestPipe.rotation.set(0.35, 0, 0.65);
  emetGroup.add(chestPipe);

  // Foreground colorful junkyard scrap parts around Emet (InstancedMesh)
  const scrapGeo = trackGeo(new THREE.BoxGeometry(1.0 * S, 1.0 * S, 1.0 * S));
  const scrapMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.68, metalness: 0.48 })
  );
  const scrapCount = 44;
  const scrapInst = new THREE.InstancedMesh(scrapGeo, scrapMat, scrapCount);
  const scrapPalette = [0xc26538, 0x64748b, 0x38bdf8, 0xeab308, 0x94a3b8, 0xdc2626];
  for (let i = 0; i < scrapCount; i++) {
    const a = (i / scrapCount) * Math.PI * 1.4 - Math.PI * 0.2;
    const rad = (5.8 + seededRand(i * 13.7) * 5.6) * S;
    _dummy.position.set(Math.sin(a) * rad, (0.4 + seededRand(i * 5.3) * 1.1) * S, Math.cos(a) * rad);
    _dummy.rotation.set(
      seededRand(i * 3.1) * 1.5,
      seededRand(i * 7.7) * 3.1,
      seededRand(i * 11.9) * 1.5
    );
    _dummy.scale.set(
      1.1 + seededRand(i * 2.1) * 1.8,
      0.7 + seededRand(i * 4.3) * 1.2,
      1.0 + seededRand(i * 6.7) * 1.6
    );
    _dummy.updateMatrix();
    scrapInst.setMatrixAt(i, _dummy.matrix);
    _color.setHex(scrapPalette[i % scrapPalette.length]);
    scrapInst.setColorAt(i, _color);
  }
  scrapInst.instanceMatrix.needsUpdate = true;
  if (scrapInst.instanceColor) scrapInst.instanceColor.needsUpdate = true;
  emetGroup.add(scrapInst);
  group.add(emetGroup);

  // 10. Futuristic Harbor Docks, Sea Defense Gate & Solid Pier Decks
  const harborGroup = new THREE.Group();
  placeOnEggheadSphere(harborGroup, 18, 0.0, 46, globeRadius);
  const dockDeckMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      roughness: 0.45,
      metalness: 0.25,
    })
  );
  // Landward concrete/steel quay promenade deck + seawall steps
  const quayDeck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(26.0 * S, 3.2 * S, 11.0 * S)),
    dockDeckMat
  );
  quayDeck.position.set(0, 1.6 * S, -11.5 * S);
  harborGroup.add(quayDeck);

  // Twin armored sea-gate breakwaters & pylons flanking harbor channel
  for (const side of [-1, 1]) {
    const pierDeck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.2 * S, 2.8 * S, 16.5 * S)),
      dockDeckMat
    );
    pierDeck.position.set(side * 10.5 * S, 1.4 * S, 0.0);
    harborGroup.add(pierDeck);

    const pierStripe = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.4 * S, 0.45 * S, 16.6 * S)),
      cyanNeonMat
    );
    pierStripe.position.set(side * 10.5 * S, 2.65 * S, 0.0);
    harborGroup.add(pierStripe);

    const pylon = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.8 * S, 9.8 * S, 4.2 * S)),
      whiteLabMat
    );
    pylon.position.set(side * 10.5 * S, 6.2 * S, 4.5 * S);
    harborGroup.add(pylon);
    const beacon = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(1.15 * S, 12, 8)),
      cyanNeonMat
    );
    beacon.position.set(side * 10.5 * S, 11.8 * S, 4.5 * S);
    harborGroup.add(beacon);
  }
  // Overhead glowing laser-gate arch across the harbor entrance
  const gateArch = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(10.5 * S, 0.38 * S, 8, 28, Math.PI)),
    cyanNeonMat
  );
  gateArch.position.set(0, 11.0 * S, 4.5 * S);
  harborGroup.add(gateArch);
  group.add(harborGroup);

  // Subtle offshore Marine Blockade perimeter ships (kept well clear of Sunny's SE spawn lane)
  const shipHullGeo = trackGeo(new THREE.BoxGeometry(2.2 * S, 1.3 * S, 5.8 * S));
  const shipSailGeo = trackGeo(new THREE.BoxGeometry(3.2 * S, 3.8 * S, 0.35 * S));
  const shipCoords: [number, number, number][] = [
    [-72, 42, 0.9],
    [-80, -10, 1.5],
    [-64, -56, 2.2],
    [-10, -76, 3.1],
    [52, -62, -2.2],
    [76, -14, -1.5],
    [72, 34, -0.9],
    [-42, 68, 0.4],
  ];
  const shipHullInst = new THREE.InstancedMesh(shipHullGeo, darkSlateMat, shipCoords.length);
  const shipSailInst = new THREE.InstancedMesh(shipSailGeo, pastelWhiteMat, shipCoords.length);
  for (let i = 0; i < shipCoords.length; i++) {
    const [sx, sz, syaw] = shipCoords[i];
    placeOnEggheadSphere(_dummy, sx, 0.55, sz, globeRadius, syaw);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    shipHullInst.setMatrixAt(i, _dummy.matrix);
    placeOnEggheadSphere(_dummy, sx, 3.1, sz, globeRadius, syaw);
    _dummy.updateMatrix();
    shipSailInst.setMatrixAt(i, _dummy.matrix);
  }
  shipHullInst.instanceMatrix.needsUpdate = true;
  shipSailInst.instanceMatrix.needsUpdate = true;
  group.add(shipHullInst, shipSailInst);

  // Subtle ambient animation (zero allocations)
  const update = (elapsed: number) => {
    // 1. Vacuum Rocket Capsule spiraling smoothly between Fabriophase & Labophase
    const u = (elapsed * 0.085) % 1;
    vacuumCurve.getPointAt(u, _tmpPos);
    vacuumCurve.getTangentAt(u, _tmpTangent);
    vacuumPod.position.copy(_tmpPos);
    _lookTarget.copy(_tmpPos).add(_tmpTangent);
    vacuumPod.lookAt(_lookTarget);

    // 2. Slow telemetry orbit of =066= / =100= Cloud Band & Punk Records Data Circuit Ring
    cloudHaloBand.rotation.y = elapsed * 0.09;
    dataOrbitRing.rotation.y = elapsed * 0.14;

    // 3. Frontier Dome gentle energy shimmer
    frontierShieldMat.opacity = 0.21 + Math.sin(elapsed * 1.9) * 0.04;

    // 4. Gentle vertical bob on Hover Pods, Headphones, Vegaforce-01, Dragon & Sky-Whale
    for (let i = 0; i < hoverPods.length; i++) {
      hoverPods[i].group.position.y =
        (hoverPods[i].baseY + Math.sin(elapsed * 1.8 + hoverPods[i].phase) * 0.55) * S;
    }
    headphonesGroup.position.y = Math.sin(elapsed * 1.45) * 0.45 * S;
    vegaforceBody.position.y = Math.sin(elapsed * 1.35 + 0.7) * 0.5 * S;
    dragonGroup.position.y = Math.sin(elapsed * 1.15 + 1.4) * 0.65 * S;
    whaleGroup.position.y = Math.sin(elapsed * 1.25 + 2.1) * 0.6 * S;

    // 5. Gentle steam column breathe
    for (let i = 0; i < steamColumnPuffs.length; i++) {
      const sp = steamColumnPuffs[i];
      const pulse = 1 + Math.sin(elapsed * 1.3 + sp.phase) * 0.05;
      sp.mesh.position.set(
        sp.basePos.x + Math.sin(elapsed * 0.8 + sp.phase) * 0.35 * S,
        sp.basePos.y,
        sp.basePos.z + Math.cos(elapsed * 0.7 + sp.phase) * 0.35 * S
      );
      void pulse;
    }
  };

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update,
  };
}
