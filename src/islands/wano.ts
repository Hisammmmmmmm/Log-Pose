import * as THREE from 'three';
import type { IslandMeshContext, IslandMeshInstance } from './types';
import {
  WANO_CANAL_WATER_Y,
  WANO_CASTLE_CENTER,
  WANO_FUJI_CENTER,
  WANO_GLOBE_SCALE,
  WANO_LANDMARKS,
  WANO_ONIGASHIMA_CENTER,
  WANO_PLATEAU_Y,
  WANO_UDON_SPIRES,
  WANO_WORLD_SIZE,
  sampleWanoHeight,
  sampleWanoZone,
  toWanoSphereLocal,
  wanoPlateauNormRadius,
  wanoRiverDistance,
} from '../utils/wanoTerrain';
import {
  createEdoFacadeTexture,
  createHokusaiWaveTexture,
  createSakuraBlossomTexture,
  createThatchStoneRoofTexture,
  createUkiyoCloudTexture,
  createWanoCliffTexture,
  createWanoSmokeTexture,
  createWanoTerrainTexture,
  createWanoWaterfallTexture,
} from './wanoTextures';

const S = WANO_GLOBE_SCALE;

// Reusable scratch math helpers (zero allocations inside update loop)
const _up = new THREE.Vector3(0, 1, 0);
const _yAxis = new THREE.Vector3(0, 1, 0);
const _localNormal = new THREE.Vector3();
const _tiltQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function seededRand(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function placeOnWanoSphere(
  obj: THREE.Object3D,
  lx: number,
  ly: number,
  lz: number,
  globeRadius: number,
  yaw = 0
): void {
  const sp = toWanoSphereLocal(lx, ly, lz, globeRadius);
  obj.position.set(sp.x, sp.y, sp.z);
  _localNormal.set(sp.x, globeRadius + sp.y, sp.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

function buildCurvedGableRoof(
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  w: number,
  h: number,
  d: number,
  eaveFlare = 1.24
): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w * S, h * S, d * S, 2, 2, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let px = pos.getX(i);
    const py = pos.getY(i);
    let pz = pos.getZ(i);
    if (py > 0) {
      px *= 0.48;
      pz *= 0.48;
    } else {
      const edgeT = Math.min(1, (Math.abs(px) + Math.abs(pz)) / ((w + d) * 0.45 * S));
      px *= eaveFlare;
      pz *= eaveFlare;
      pos.setY(i, py + edgeT * h * 0.36 * S);
    }
    pos.setX(i, px);
    pos.setZ(i, pz);
  }
  geo.computeVertexNormals();
  return trackGeo(geo);
}

function addToriiGate(
  parent: THREE.Group,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  pillarMat: THREE.Material,
  accentMat: THREE.Material,
  w: number,
  h: number
): void {
  const pGeo = trackGeo(new THREE.CylinderGeometry(0.22 * S, 0.28 * S, h * S, 8));
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(pGeo, pillarMat);
    post.position.set(side * w * 0.44 * S, h * 0.5 * S, 0);
    parent.add(post);
  }
  const nuki = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(w * 1.15 * S, 0.3 * S, 0.32 * S)),
    pillarMat
  );
  nuki.position.y = h * 0.78 * S;
  parent.add(nuki);

  const kasagi = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(w * 1.38 * S, 0.44 * S, 0.46 * S)),
    accentMat
  );
  kasagi.position.y = h * 0.98 * S;
  parent.add(kasagi);
}

export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const group = new THREE.Group();
  group.name = 'wano-island-root';

  const keepTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;

  // Procedural Ukiyo-e / Edo Textures
  const terrainTex = keepTex(createWanoTerrainTexture(1024));
  const cliffTex = keepTex(createWanoCliffTexture(512));
  const facadeTex = keepTex(createEdoFacadeTexture(256));
  const thatchTex = keepTex(createThatchStoneRoofTexture(256));
  const sakuraTex = keepTex(createSakuraBlossomTexture(256));
  const waterfallTex = keepTex(createWanoWaterfallTexture(256));
  const hokusaiWaveTex = keepTex(createHokusaiWaveTexture(256));
  const ukiyoCloudTex = keepTex(createUkiyoCloudTexture(256));
  const smokeTex = keepTex(createWanoSmokeTexture(128));

  // Calibrated Materials
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      alphaTest: 0.35,
      roughness: 0.9,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );

  const cliffMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: cliffTex,
      roughness: 0.92,
      metalness: 0.02,
    })
  );

  const inlandSeaMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e5ca8,
      emissive: 0x0a2752,
      emissiveIntensity: 0.34,
      roughness: 0.2,
      metalness: 0.14,
      transparent: true,
      opacity: 0.78,
    })
  );

  const waterfallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: waterfallTex,
      color: 0xb2f2ff,
      emissive: 0x165378,
      emissiveIntensity: 0.3,
      roughness: 0.22,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    })
  );

  const hokusaiWaveMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: hokusaiWaveTex,
      transparent: true,
      alphaTest: 0.22,
      side: THREE.DoubleSide,
    })
  );

  const foamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xf4fbff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const castleWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: facadeTex,
      roughness: 0.72,
      metalness: 0.04,
    })
  );

  const castleRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x262f4d,
      roughness: 0.45,
      metalness: 0.18,
    })
  );

  const goldTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf2bf3f,
      emissive: 0x5c3c04,
      emissiveIntensity: 0.24,
      roughness: 0.28,
      metalness: 0.82,
    })
  );

  const vermilionMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc92c28,
      roughness: 0.48,
      metalness: 0.08,
    })
  );

  const darkWoodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b2a1e,
      roughness: 0.86,
      metalness: 0.02,
    })
  );

  const thatchRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: thatchTex,
      roughness: 0.9,
      metalness: 0.0,
    })
  );

  const fujiSlopeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4b5770,
      roughness: 0.88,
      metalness: 0.04,
    })
  );

  const snowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf6f9ff,
      roughness: 0.78,
      metalness: 0.02,
    })
  );

  const sakuraMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: sakuraTex,
      roughness: 0.82,
      metalness: 0.0,
    })
  );

  const pineCanopyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x297c3e,
      roughness: 0.84,
      metalness: 0.0,
    })
  );

  const pineBarkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7c6042,
      roughness: 0.9,
      metalness: 0.02,
    })
  );

  const udonRockMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x9c8262,
      roughness: 0.94,
      metalness: 0.02,
    })
  );

  const ironStackMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2d3038,
      roughness: 0.55,
      metalness: 0.62,
    })
  );

  const obsidianMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2b2538,
      roughness: 0.9,
      metalness: 0.06,
    })
  );

  const oniSkullBoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x56486e,
      roughness: 0.78,
      metalness: 0.08,
    })
  );

  const oniHornMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1a1522,
      emissive: 0x2a0814,
      emissiveIntensity: 0.35,
      roughness: 0.42,
      metalness: 0.25,
    })
  );

  const oniGlowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff6b4a,
    })
  );

  const oniMistMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x9b4dff,
      map: smokeTex,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const sootSmokeMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x2c2b30,
      map: smokeTex,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const ukiyoCloudMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: ukiyoCloudTex,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const steelBladeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.24,
      metalness: 0.88,
    })
  );

  const shimenawaRopeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc9a35a,
      roughness: 0.9,
      metalness: 0.02,
    })
  );

  // =========================================================================
  // 1. OUTER FLUTED MOUNTAIN SHELL, ELEVATED INLAND SEA, WATERFALL & SURF
  // =========================================================================
  const segs = 128;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(WANO_WORLD_SIZE * S, WANO_WORLD_SIZE * S, segs, segs)
  );
  terrainGeo.rotateX(-Math.PI * 0.5);
  const tPos = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < tPos.count; i++) {
    const lx = tPos.getX(i) / S;
    const lz = tPos.getZ(i) / S;
    const ly = sampleWanoHeight(lx, lz);
    const sp = toWanoSphereLocal(lx, ly, lz, globeRadius);
    tPos.setXYZ(i, sp.x, sp.y, sp.z);
  }
  terrainGeo.computeVertexNormals();
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  group.add(terrainMesh);

  // Vertical Fluted Sea Cliff Buttresses ringing Wano's outer mountain wall — InstancedMesh
  const cliffRibGeo = trackGeo(new THREE.CylinderGeometry(4.4 * S, 6.6 * S, 29.5 * S, 6));
  const ribCount = 50;
  const cliffRibsInst = new THREE.InstancedMesh(cliffRibGeo, cliffMat, ribCount);
  let ribIdx = 0;
  for (let i = 0; i < ribCount; i++) {
    const ang = (i / ribCount) * Math.PI * 2;
    const dirX = Math.cos(ang);
    const dirZ = Math.sin(ang);
    let r = 95.0;
    while (r > 40.0 && wanoPlateauNormRadius(dirX * r, dirZ * r - 2.0) > 0.99) {
      r -= 2.2;
    }
    const cx = dirX * (r + 1.6);
    const cz = dirZ * (r + 1.6) - 2.0;
    if (Math.abs(cx) < 13.0 && cz > 32.0) continue; // Keep Great Waterfall cleft open

    placeOnWanoSphere(_dummy, cx, 14.5, cz, globeRadius, ang + seededRand(i * 3) * 0.4);
    const sScale = 0.85 + seededRand(i * 7) * 0.42;
    _dummy.scale.set(sScale, 0.95 + seededRand(i * 9) * 0.16, sScale * 1.18);
    _dummy.updateMatrix();
    cliffRibsInst.setMatrixAt(ribIdx++, _dummy.matrix);
  }
  cliffRibsInst.count = ribIdx;
  cliffRibsInst.instanceMatrix.needsUpdate = true;
  group.add(cliffRibsInst);

  // Great Curtain Waterfall (Nobe-no-Taki) spilling straight down from the elevated inland sea
  const mainFall = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(21.0 * S, 24.5 * S)),
    waterfallMat
  );
  placeOnWanoSphere(mainFall, 0, 11.8, 56.8, globeRadius, 0);
  mainFall.rotateX(-0.2);
  group.add(mainFall);

  // Waterfall lip crest foam arcs converging behind the spillway below Onigashima
  const wfLipFoam = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(11.5 * S, 13.8 * S, 24, 1, Math.PI * 0.15, Math.PI * 0.7)),
    foamMat
  );
  placeOnWanoSphere(wfLipFoam, 0, WANO_CANAL_WATER_Y + 0.18, 46.0, globeRadius, 0);
  wfLipFoam.rotateX(-Math.PI * 0.5);
  group.add(wfLipFoam);

  // Koi-carp rock spires flanking the Great Curtain Waterfall shoulders
  const koiSpireGeo = trackGeo(new THREE.ConeGeometry(4.6 * S, 25.0 * S, 7));
  for (const side of [-1, 1]) {
    const koiRock = new THREE.Mesh(koiSpireGeo, cliffMat);
    placeOnWanoSphere(koiRock, side * 14.2, 12.2, 54.0, globeRadius, side * 0.3);
    group.add(koiRock);
  }

  // 2 small wooden Wano galleon ships riding up the Great Waterfall cascade
  const shipHullGeo = trackGeo(new THREE.BoxGeometry(2.4 * S, 1.3 * S, 5.8 * S));
  const shipSailGeo = trackGeo(new THREE.PlaneGeometry(3.2 * S, 3.4 * S));
  for (let i = 0; i < 2; i++) {
    const sg = new THREE.Group();
    const hull = new THREE.Mesh(shipHullGeo, darkWoodMat);
    sg.add(hull);
    const sail = new THREE.Mesh(shipSailGeo, snowMat);
    sail.position.set(0, 2.2 * S, 0);
    sg.add(sail);
    placeOnWanoSphere(
      sg,
      i === 0 ? -4.2 : 4.5,
      i === 0 ? 5.2 : 13.0,
      i === 0 ? 60.4 : 58.6,
      globeRadius,
      i === 0 ? 0.15 : -0.2
    );
    sg.rotateX(-0.32);
    group.add(sg);
  }

  // Churning white sea-foam plume at base of the Great Waterfall
  const wfBaseFoam = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(16.0 * S, 24)),
    foamMat
  );
  placeOnWanoSphere(wfBaseFoam, 0, 0.55, 62.5, globeRadius, 0);
  wfBaseFoam.rotateX(-Math.PI * 0.5);
  group.add(wfBaseFoam);

  // Hokusai Stylized Crashing Ocean Waves ringing the base of Wano's giant mountain cliffs
  const hokusaiWaves: { mesh: THREE.Mesh; baseX: number; baseZ: number; phase: number }[] = [];
  const waveCardGeo = trackGeo(new THREE.PlaneGeometry(18.5 * S, 9.6 * S));
  for (let i = 0; i < 30; i++) {
    const ang = (i / 30) * Math.PI * 2;
    const wx = Math.cos(ang) * 99.0;
    const wz = Math.sin(ang) * 70.0 - 2.0;
    const wave = new THREE.Mesh(waveCardGeo, hokusaiWaveMat);
    placeOnWanoSphere(wave, wx, 2.8, wz, globeRadius, -ang + Math.PI * 0.5);
    group.add(wave);
    hokusaiWaves.push({ mesh: wave, baseX: wx, baseZ: wz, phase: i * 0.45 });
  }

  // Elevated Mountaintop Inland Sea Water Surface (filling entire crater basin inside the outer cliff rim)
  const inlandSeaGeo = trackGeo(new THREE.PlaneGeometry(192 * S, 138 * S, 96, 72));
  inlandSeaGeo.rotateX(-Math.PI * 0.5);
  const rpPos = inlandSeaGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < rpPos.count; i++) {
    const lx = rpPos.getX(i) / S;
    const lz = rpPos.getZ(i) / S - 2.0;
    const nr = wanoPlateauNormRadius(lx, lz);
    const ly = nr < 0.895 ? WANO_CANAL_WATER_Y : -4.5;
    const sp = toWanoSphereLocal(lx, ly, lz, globeRadius);
    rpPos.setXYZ(i, sp.x, sp.y, sp.z);
  }
  inlandSeaGeo.computeVertexNormals();
  const inlandSeaMesh = new THREE.Mesh(inlandSeaGeo, inlandSeaMat);
  group.add(inlandSeaMesh);

  // Wooden Wano skiff boats gliding in the Flower Capital channel & southern inland bay
  const canalBoats: { group: THREE.Group; baseX: number; baseZ: number; phase: number }[] = [];
  for (let i = 0; i < 2; i++) {
    const bg = new THREE.Group();
    const hull = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.42 * S, 0.25 * S, 3.0 * S, 7)),
      darkWoodMat
    );
    hull.rotation.x = Math.PI * 0.5;
    hull.scale.set(1.2, 1.0, 0.55);
    bg.add(hull);
    const lanternSail = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.58 * S, 0.5 * S, 1.6 * S, 8)),
      snowMat
    );
    lanternSail.position.y = 1.1 * S;
    bg.add(lanternSail);
    const bx = i === 0 ? 1.5 : -12.0;
    const bz = i === 0 ? -5.0 : 19.0;
    placeOnWanoSphere(bg, bx, WANO_CANAL_WATER_Y + 0.35, bz, globeRadius, i === 0 ? 0 : 1.1);
    group.add(bg);
    canalBoats.push({ group: bg, baseX: bx, baseZ: bz, phase: i * 2.1 });
  }

  // =========================================================================
  // 2. MOUNT FUJI OF WANO & STYLIZED UKIYO-E CLOUDS
  // =========================================================================
  const fujiGroup = new THREE.Group();
  placeOnWanoSphere(
    fujiGroup,
    WANO_FUJI_CENTER.x,
    WANO_PLATEAU_Y - 1.0,
    WANO_FUJI_CENTER.z,
    globeRadius,
    0
  );
  const fujiCone = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.6 * S, 11.4 * S, 56.0 * S, 24)),
    fujiSlopeMat
  );
  fujiCone.position.y = 28.0 * S;
  fujiGroup.add(fujiCone);

  const fujiSnowGeo = trackGeo(
    new THREE.CylinderGeometry(2.72 * S, 5.8 * S, 17.5 * S, 18, 4)
  );
  const fSnowPos = fujiSnowGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < fSnowPos.count; i++) {
    const sy = fSnowPos.getY(i) / S;
    if (sy < -4.0) {
      const ang = Math.atan2(fSnowPos.getZ(i), fSnowPos.getX(i));
      fSnowPos.setY(i, sy * S + Math.sin(ang * 7.0) * 2.4 * S);
    }
  }
  fujiSnowGeo.computeVertexNormals();
  const fujiSnowCap = new THREE.Mesh(fujiSnowGeo, snowMat);
  fujiSnowCap.position.y = 47.5 * S;
  fujiGroup.add(fujiSnowCap);

  const fujiCloudRing = new THREE.Group();
  const cloudStripGeo = trackGeo(new THREE.PlaneGeometry(13.0 * S, 5.5 * S));
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const cl = new THREE.Mesh(cloudStripGeo, ukiyoCloudMat);
    cl.position.set(Math.cos(ang) * 9.5 * S, (29.0 + (i % 2) * 7.0) * S, Math.sin(ang) * 9.5 * S);
    cl.rotation.y = -ang + Math.PI * 0.5;
    fujiCloudRing.add(cl);
  }
  fujiGroup.add(fujiCloudRing);
  group.add(fujiGroup);

  // =========================================================================
  // 3. FLOWER CAPITAL, SHOGUN OROCHI'S CASTLE, BRIDGES, PAGODA & SAKURA
  // =========================================================================
  const castlePromGroup = new THREE.Group();
  const castleGroundY = sampleWanoHeight(WANO_CASTLE_CENTER.x, WANO_CASTLE_CENTER.z);
  placeOnWanoSphere(
    castlePromGroup,
    WANO_CASTLE_CENTER.x,
    castleGroundY - 2.0,
    WANO_CASTLE_CENTER.z,
    globeRadius,
    0
  );

  const terraceDeck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.8 * S, 0.9 * S, 6.2 * S)),
    vermilionMat
  );
  terraceDeck.position.y = 2.1 * S;
  castlePromGroup.add(terraceDeck);

  const keepTiers: [number, number, number, number][] = [
    [5.6, 2.7, 5.0, 3.8],
    [4.2, 2.4, 3.8, 6.4],
    [2.8, 2.2, 2.6, 8.7],
  ];
  for (let t = 0; t < keepTiers.length; t++) {
    const [kw, kh, kd, ky] = keepTiers[t];
    const body = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(kw * S, kh * S, kd * S)),
      castleWallMat
    );
    body.position.y = ky * S;
    castlePromGroup.add(body);

    const roof = new THREE.Mesh(
      buildCurvedGableRoof(trackGeo, kw * 1.18, 1.2, kd * 1.18, 1.28),
      castleRoofMat
    );
    roof.position.y = (ky + kh * 0.5 + 0.55) * S;
    castlePromGroup.add(roof);
  }

  const shachiGeo = trackGeo(new THREE.ConeGeometry(0.35 * S, 1.3 * S, 6));
  for (const side of [-1, 1]) {
    const ornament = new THREE.Mesh(shachiGeo, goldTrimMat);
    ornament.position.set(side * 0.9 * S, 11.4 * S, 0);
    ornament.rotation.z = side * -0.28;
    castlePromGroup.add(ornament);
  }

  // 3 vertical waterfalls pouring cleanly down front castle promontory cliff face
  for (const wx of [-1.7, 0.0, 1.7]) {
    const cFall = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(1.1 * S, 10.8 * S)),
      waterfallMat
    );
    cFall.position.set(wx * S, -3.4 * S, 3.8 * S);
    cFall.rotation.x = -0.16;
    castlePromGroup.add(cFall);
  }

  // Colossal Curved Pine Tree overarching Orochi's Castle
  const castlePineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(4.2 * S, -4.5 * S, -0.8 * S),
    new THREE.Vector3(7.0 * S, 3.2 * S, -0.4 * S),
    new THREE.Vector3(6.2 * S, 11.2 * S, 0.0 * S),
    new THREE.Vector3(1.2 * S, 14.2 * S, 0.2 * S),
    new THREE.Vector3(-4.4 * S, 12.2 * S, 0.3 * S),
  ]);
  const castlePineTrunk = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(castlePineCurve, 20, 0.85 * S, 8, false)),
    pineBarkMat
  );
  castlePromGroup.add(castlePineTrunk);

  const pinePadSpecs: [number, number, number, number][] = [
    [1.4, 15.0, 0.2, 3.8],
    [-1.2, 14.5, 0.5, 2.9],
    [3.5, 13.8, -0.2, 3.0],
    [6.2, 11.0, 0.0, 2.9],
    [-4.6, 11.5, 0.4, 3.0],
    [7.0, 6.4, -0.3, 2.6],
  ];
  const pinePadGeo = trackGeo(new THREE.IcosahedronGeometry(S, 1));
  for (const [px, py, pz, pr] of pinePadSpecs) {
    const pad = new THREE.Mesh(pinePadGeo, pineCanopyMat);
    pad.position.set(px * S, py * S, pz * S);
    pad.scale.set(pr * 1.25, pr * 0.42, pr * 0.95);
    castlePromGroup.add(pad);
  }
  group.add(castlePromGroup);

  // Golden Otemon Gate + Twin Arched Red Taiko Bridges + Torii flanking plaza
  const gateGroup = new THREE.Group();
  const gateY = sampleWanoHeight(1.5, -7.8);
  placeOnWanoSphere(gateGroup, 1.5, gateY, -7.8, globeRadius, 0);
  const gateBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.0 * S, 2.4 * S, 1.7 * S)),
    darkWoodMat
  );
  gateBody.position.y = 1.2 * S;
  gateGroup.add(gateBody);
  const gateRoof = new THREE.Mesh(
    buildCurvedGableRoof(trackGeo, 4.9, 1.4, 2.5, 1.22),
    goldTrimMat
  );
  gateRoof.position.y = 2.8 * S;
  gateGroup.add(gateRoof);
  group.add(gateGroup);

  for (const side of [-1, 1]) {
    const bx = 1.5 + side * 4.8;
    const archCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3((bx - 2.6) * S, (WANO_PLATEAU_Y + 0.4) * S, -8.5 * S),
      new THREE.Vector3(bx * S, (WANO_PLATEAU_Y + 3.2) * S, -8.5 * S),
      new THREE.Vector3((bx + 2.6) * S, (WANO_PLATEAU_Y + 0.4) * S, -8.5 * S),
    ]);
    const bridgeGeo = trackGeo(new THREE.TubeGeometry(archCurve, 12, 0.55 * S, 6, false));
    const bridge = new THREE.Mesh(bridgeGeo, vermilionMat);
    placeOnWanoSphere(bridge, 0, 0, 0, globeRadius, 0);
    group.add(bridge);

    const torii = new THREE.Group();
    const tx = bx + side * 2.2;
    placeOnWanoSphere(torii, tx, sampleWanoHeight(tx, -8.2), -8.2, globeRadius, 0);
    addToriiGate(torii, trackGeo, vermilionMat, darkWoodMat, 2.8, 4.0);
    group.add(torii);
  }

  // Canal footbridge across Flower Capital's Sakura Canal
  const canalBridge = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.2 * S, 0.45 * S, 1.8 * S)),
    vermilionMat
  );
  placeOnWanoSphere(canalBridge, 1.5, WANO_CANAL_WATER_Y + 2.75, -4.5, globeRadius, 0);
  group.add(canalBridge);

  // 5-Story Vermilion Pagoda West of Orochi's Castle
  const pagodaGroup = new THREE.Group();
  const pagY = sampleWanoHeight(-5.5, -14.8);
  placeOnWanoSphere(pagodaGroup, -5.5, pagY - 0.3, -14.8, globeRadius, 0);
  for (let floor = 0; floor < 5; floor++) {
    const fw = 2.7 - floor * 0.32;
    const fy = 1.1 + floor * 1.85;
    const tierBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(fw * S, 1.35 * S, fw * S)),
      vermilionMat
    );
    tierBody.position.y = fy * S;
    pagodaGroup.add(tierBody);

    const tierRoof = new THREE.Mesh(
      buildCurvedGableRoof(trackGeo, fw * 1.45, 0.78, fw * 1.45, 1.22),
      castleRoofMat
    );
    tierRoof.position.y = (fy + 0.85) * S;
    pagodaGroup.add(tierRoof);
  }
  const spire = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.08 * S, 0.2 * S, 3.2 * S, 6)),
    goldTrimMat
  );
  spire.position.y = 11.2 * S;
  pagodaGroup.add(spire);
  group.add(pagodaGroup);

  // Flower Capital Edo Machiya Houses (strictly filtered onto level Capital ground, never on Mt. Fuji or water)
  const townSpecs: { x: number; y: number; z: number; w: number; h: number; d: number; yaw: number; tint: number }[] = [];
  for (let i = 0; i < 140; i++) {
    const hx = 1.5 + (seededRand(i * 19 + 1) - 0.5) * 24.0;
    const hz = -12.0 + (seededRand(i * 23 + 3) - 0.5) * 20.0;
    if (sampleWanoZone(hx, hz) !== 'flower-capital') continue;
    if (Math.hypot(hx - WANO_FUJI_CENTER.x, hz - WANO_FUJI_CENTER.z) < 10.2) continue;
    if (Math.hypot(hx - WANO_CASTLE_CENTER.x, hz - WANO_CASTLE_CENTER.z) < 5.2) continue;
    if (Math.hypot(hx + 5.5, hz + 14.8) < 2.8) continue;
    if (wanoRiverDistance(hx, hz) < 1.8) continue;
    const hy = sampleWanoHeight(hx, hz);
    if (Math.abs(hy - WANO_PLATEAU_Y) > 1.35) continue;

    townSpecs.push({
      x: hx,
      y: hy,
      z: hz,
      w: 1.45 + seededRand(i + 7) * 0.9,
      h: 1.35 + seededRand(i + 11) * 0.9,
      d: 1.4 + seededRand(i + 13) * 0.85,
      yaw: (Math.floor(seededRand(i + 17) * 4) * Math.PI) / 2,
      tint: i % 5,
    });
  }

  const unitBoxGeo = trackGeo(new THREE.BoxGeometry(S, S, S));
  const unitGableGeo = buildCurvedGableRoof(trackGeo, 1.25, 0.65, 1.25, 1.18);
  const townWallsInst = new THREE.InstancedMesh(unitBoxGeo, castleWallMat, Math.max(1, townSpecs.length));
  const townRoofsInst = new THREE.InstancedMesh(
    unitGableGeo,
    trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.12 })),
    Math.max(1, townSpecs.length)
  );
  const roofPalette = [0x32426e, 0x623770, 0x2d6b4e, 0x8f5b28, 0x3b485e];
  for (let i = 0; i < townSpecs.length; i++) {
    const hs = townSpecs[i];
    placeOnWanoSphere(_dummy, hs.x, hs.y + hs.h * 0.5 - 0.15, hs.z, globeRadius, hs.yaw);
    _dummy.scale.set(hs.w, hs.h, hs.d);
    _dummy.updateMatrix();
    townWallsInst.setMatrixAt(i, _dummy.matrix);

    placeOnWanoSphere(_dummy, hs.x, hs.y + hs.h + 0.1, hs.z, globeRadius, hs.yaw);
    _dummy.scale.set(hs.w, hs.h * 0.68, hs.d);
    _dummy.updateMatrix();
    townRoofsInst.setMatrixAt(i, _dummy.matrix);
    _color.setHex(roofPalette[hs.tint]);
    townRoofsInst.setColorAt(i, _color);
  }
  townWallsInst.count = townSpecs.length;
  townRoofsInst.count = townSpecs.length;
  townWallsInst.instanceMatrix.needsUpdate = true;
  townRoofsInst.instanceMatrix.needsUpdate = true;
  if (townRoofsInst.instanceColor) townRoofsInst.instanceColor.needsUpdate = true;
  group.add(townWallsInst, townRoofsInst);

  // Sakura Blossom Trees lining Flower Capital Canal & Ringo Graveyard
  const sakuraSpecs: { x: number; y: number; z: number; r: number; h: number }[] = [];
  for (let cz = -9.5; cz <= -2.0; cz += 2.2) {
    for (const side of [-1, 1]) {
      const sx = 1.5 + side * 2.8;
      if (sampleWanoZone(sx, cz) === 'flower-capital') {
        const sy = sampleWanoHeight(sx, cz);
        sakuraSpecs.push({ x: sx, y: sy, z: cz, r: 1.7 + seededRand(cz + side) * 0.5, h: 2.5 });
      }
    }
  }
  for (let i = 0; i < 64; i++) {
    const inRingo = i >= 38;
    const sx = inRingo
      ? 24.0 + seededRand(i * 11) * 34.0
      : 1.5 + (seededRand(i * 13) - 0.5) * 24.0;
    const sz = inRingo
      ? -31.0 + seededRand(i * 17) * 20.0
      : -18.0 + seededRand(i * 19) * 16.0;
    const z = sampleWanoZone(sx, sz);
    if (inRingo && z !== 'ringo') continue;
    if (!inRingo && z !== 'flower-capital') continue;
    if (!inRingo && Math.hypot(sx - WANO_CASTLE_CENTER.x, sz - WANO_CASTLE_CENTER.z) < 5.0) continue;
    sakuraSpecs.push({
      x: sx,
      y: sampleWanoHeight(sx, sz),
      z: sz,
      r: 1.6 + seededRand(i + 4) * 1.0,
      h: 2.4 + seededRand(i + 9) * 1.1,
    });
  }

  const trunkCylGeo = trackGeo(new THREE.CylinderGeometry(0.2 * S, 0.3 * S, S, 6));
  const crownSphGeo = trackGeo(new THREE.SphereGeometry(S, 10, 8));
  const sakuraTrunks = new THREE.InstancedMesh(trunkCylGeo, darkWoodMat, sakuraSpecs.length);
  const sakuraCrowns = new THREE.InstancedMesh(crownSphGeo, sakuraMat, sakuraSpecs.length);
  for (let i = 0; i < sakuraSpecs.length; i++) {
    const sk = sakuraSpecs[i];
    placeOnWanoSphere(_dummy, sk.x, sk.y + sk.h * 0.45, sk.z, globeRadius, 0);
    _dummy.scale.set(1, sk.h, 1);
    _dummy.updateMatrix();
    sakuraTrunks.setMatrixAt(i, _dummy.matrix);

    placeOnWanoSphere(_dummy, sk.x, sk.y + sk.h * 0.96, sk.z, globeRadius, 0);
    _dummy.scale.set(sk.r, sk.r * 0.72, sk.r);
    _dummy.updateMatrix();
    sakuraCrowns.setMatrixAt(i, _dummy.matrix);
  }
  sakuraTrunks.instanceMatrix.needsUpdate = true;
  sakuraCrowns.instanceMatrix.needsUpdate = true;
  group.add(sakuraTrunks, sakuraCrowns);

  // =========================================================================
  // 4. KURI PROVINCE: OKOBORE STONE-THATCH VILLAGE, BAMBOO & KURI BEACH
  // =========================================================================
  const kuriCottageCoords: [number, number, number][] = [
    [-53.5, 1.5, 0.2],
    [-57.0, 4.0, -0.35],
    [-50.5, 5.5, 0.65],
    [-55.0, -3.5, 1.15],
    [-58.5, 0.0, -0.15],
    [-53.0, -8.5, 0.45],
  ];
  const kuriWallGeo = trackGeo(new THREE.BoxGeometry(2.4 * S, 1.6 * S, 2.1 * S));
  const kuriRoofGeo = trackGeo(new THREE.ConeGeometry(2.25 * S, 2.4 * S, 4));
  const kuriLanternGeo = trackGeo(new THREE.SphereGeometry(0.28 * S, 6, 6));
  for (let i = 0; i < kuriCottageCoords.length; i++) {
    const [kx, kz, kyaw] = kuriCottageCoords[i];
    if (sampleWanoZone(kx, kz) !== 'kuri') continue;
    const ky = sampleWanoHeight(kx, kz);
    const cg = new THREE.Group();
    placeOnWanoSphere(cg, kx, ky - 0.15, kz, globeRadius, kyaw);

    const wall = new THREE.Mesh(kuriWallGeo, castleWallMat);
    wall.position.y = 0.8 * S;
    cg.add(wall);

    const roof = new THREE.Mesh(kuriRoofGeo, thatchRoofMat);
    roof.rotation.y = Math.PI * 0.25;
    roof.position.y = 2.5 * S;
    cg.add(roof);

    const lantern = new THREE.Mesh(kuriLanternGeo, vermilionMat);
    lantern.position.set(0.8 * S, 1.15 * S, 1.15 * S);
    lantern.scale.set(0.85, 1.25, 0.85);
    cg.add(lantern);
    group.add(cg);
  }

  // Oden Castle Ruins on northern Kuri hilltop
  const odenRuinY = sampleWanoHeight(-52, -23);
  const odenRuins = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(3.4 * S, 4.2 * S, 2.8 * S, 8)),
    udonRockMat
  );
  placeOnWanoSphere(odenRuins, -52, odenRuinY + 1.0, -23, globeRadius, 0.4);
  group.add(odenRuins);

  // Kuri Bamboo Grove strictly inside Kuri island
  const bambooSpecs: { x: number; y: number; z: number; hScale: number; yaw: number }[] = [];
  for (let i = 0; i < 65 && bambooSpecs.length < 40; i++) {
    const bx = -52.0 + (seededRand(i * 7 + 2) - 0.5) * 12.0;
    const bz = -13.0 + (seededRand(i * 11 + 5) - 0.5) * 11.0;
    if (sampleWanoZone(bx, bz) !== 'kuri') continue;
    bambooSpecs.push({
      x: bx,
      y: sampleWanoHeight(bx, bz),
      z: bz,
      hScale: 0.78 + seededRand(i + 3) * 0.42,
      yaw: seededRand(i) * Math.PI,
    });
  }
  const bambooGeo = trackGeo(new THREE.CylinderGeometry(0.14 * S, 0.18 * S, 6.2 * S, 6));
  const bambooInst = new THREE.InstancedMesh(
    bambooGeo,
    trackMat(new THREE.MeshStandardMaterial({ color: 0x4ca64e, roughness: 0.65 })),
    Math.max(1, bambooSpecs.length)
  );
  for (let i = 0; i < bambooSpecs.length; i++) {
    const b = bambooSpecs[i];
    placeOnWanoSphere(_dummy, b.x, b.y + 2.8, b.z, globeRadius, b.yaw);
    _dummy.scale.set(1, b.hScale, 1);
    _dummy.updateMatrix();
    bambooInst.setMatrixAt(i, _dummy.matrix);
  }
  bambooInst.count = bambooSpecs.length;
  bambooInst.instanceMatrix.needsUpdate = true;
  group.add(bambooInst);

  // Gnarled curving pines & beached wrecked hull on Kuri's western shore
  const beachPines: [number, number, number][] = [
    [-61.5, -6.5, 0.2],
    [-62.0, -14.0, 1.4],
    [-59.0, -18.5, -0.6],
  ];
  for (const [px, pz, pyaw] of beachPines) {
    if (sampleWanoZone(px, pz) !== 'kuri') continue;
    const py = sampleWanoHeight(px, pz);
    const pg = new THREE.Group();
    placeOnWanoSphere(pg, px, py - 0.2, pz, globeRadius, pyaw);
    const bCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.9 * S, 1.8 * S, 0),
      new THREE.Vector3(-0.5 * S, 3.6 * S, 0.5 * S),
      new THREE.Vector3(1.1 * S, 5.1 * S, 0),
    ]);
    pg.add(new THREE.Mesh(trackGeo(new THREE.TubeGeometry(bCurve, 10, 0.32 * S, 6, false)), pineBarkMat));
    const pCap = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(2.1 * S, 10, 7)), pineCanopyMat);
    pCap.position.set(1.1 * S, 5.3 * S, 0);
    pCap.scale.set(1.4, 0.42, 1.15);
    pg.add(pCap);
    group.add(pg);
  }

  const wreckGroup = new THREE.Group();
  const wreckY = sampleWanoHeight(WANO_LANDMARKS.kuriBeach.x, WANO_LANDMARKS.kuriBeach.z);
  placeOnWanoSphere(
    wreckGroup,
    WANO_LANDMARKS.kuriBeach.x,
    wreckY + 0.5,
    WANO_LANDMARKS.kuriBeach.z,
    globeRadius,
    0.8
  );
  wreckGroup.rotateZ(1.05);
  const wreckHull = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(1.7 * S, 10, 8)),
    vermilionMat
  );
  wreckHull.scale.set(1.0, 0.75, 1.6);
  wreckGroup.add(wreckHull);
  const wreckMast = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.1 * S, 0.14 * S, 3.4 * S, 6)),
    darkWoodMat
  );
  wreckMast.position.set(0, 1.5 * S, 0);
  wreckGroup.add(wreckMast);
  group.add(wreckGroup);

  // =========================================================================
  // 5. RINGO SNOWBOUND ISLAND, TWIN SHIMENAWA MONOLITHS & SWORD GRAVES
  // =========================================================================
  const shrineMonoGroup = new THREE.Group();
  const smY = sampleWanoHeight(42.0, -21.0);
  placeOnWanoSphere(shrineMonoGroup, 42.0, smY - 0.5, -21.0, globeRadius, -0.3);
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.3 * S, 2.0 * S, 10.0 * S, 8)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xaab4c2, roughness: 0.88 }))
    );
    pillar.position.set(side * 4.2 * S, 4.9 * S, 0);
    shrineMonoGroup.add(pillar);
  }
  const ropeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.2 * S, 8.8 * S, 0),
    new THREE.Vector3(0, 7.1 * S, 0.35 * S),
    new THREE.Vector3(4.2 * S, 8.8 * S, 0),
  ]);
  shrineMonoGroup.add(
    new THREE.Mesh(trackGeo(new THREE.TubeGeometry(ropeCurve, 12, 0.42 * S, 7, false)), shimenawaRopeMat)
  );
  for (const sx of [-1.8, 0, 1.8]) {
    const shide = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.4 * S, 1.0 * S, 0.08 * S)),
      snowMat
    );
    shide.position.set(sx * S, 6.6 * S, 0.3 * S);
    shrineMonoGroup.add(shide);
  }
  group.add(shrineMonoGroup);

  // Upright Sword Graves planted strictly inside Ringo's snowy island
  const swordCount = 54;
  const katanaBladeGeo = trackGeo(new THREE.BoxGeometry(0.13 * S, 2.3 * S, 0.05 * S));
  const katanaGuardGeo = trackGeo(new THREE.BoxGeometry(0.48 * S, 0.1 * S, 0.3 * S));
  const swordsInst = new THREE.InstancedMesh(katanaBladeGeo, steelBladeMat, swordCount);
  const guardsInst = new THREE.InstancedMesh(katanaGuardGeo, goldTrimMat, swordCount);
  let swIdx = 0;
  for (let i = 0; i < 140 && swIdx < swordCount; i++) {
    const gx = 24.0 + seededRand(i * 13 + 2) * 35.0;
    const gz = -31.0 + seededRand(i * 19 + 4) * 21.0;
    if (sampleWanoZone(gx, gz) !== 'ringo') continue;
    const gy = sampleWanoHeight(gx, gz);
    placeOnWanoSphere(_dummy, gx, gy + 0.9, gz, globeRadius, seededRand(i + 1) * Math.PI);
    _dummy.rotateZ((seededRand(i + 5) - 0.5) * 0.25);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    swordsInst.setMatrixAt(swIdx, _dummy.matrix);

    placeOnWanoSphere(_dummy, gx, gy + 1.55, gz, globeRadius, seededRand(i + 1) * Math.PI);
    _dummy.rotateZ((seededRand(i + 5) - 0.5) * 0.25);
    _dummy.updateMatrix();
    guardsInst.setMatrixAt(swIdx, _dummy.matrix);
    swIdx++;
  }
  swordsInst.count = swIdx;
  guardsInst.count = swIdx;
  swordsInst.instanceMatrix.needsUpdate = true;
  guardsInst.instanceMatrix.needsUpdate = true;
  group.add(swordsInst, guardsInst);

  // Snow-draped evergreen pine trees across Ringo
  const snowPineCount = 36;
  const pineGreenConGeo = trackGeo(new THREE.ConeGeometry(1.3 * S, 3.8 * S, 9));
  const pineSnowTopGeo = trackGeo(new THREE.ConeGeometry(0.98 * S, 1.9 * S, 9));
  const snowPineBasesInst = new THREE.InstancedMesh(pineGreenConGeo, pineCanopyMat, snowPineCount);
  const snowPinesInst = new THREE.InstancedMesh(pineSnowTopGeo, snowMat, snowPineCount);
  let spIdx = 0;
  for (let i = 0; i < 120 && spIdx < snowPineCount; i++) {
    const px = 22.0 + seededRand(i * 29 + 1) * 40.0;
    const pz = -33.0 + seededRand(i * 31 + 3) * 24.0;
    if (sampleWanoZone(px, pz) !== 'ringo') continue;
    if (Math.hypot(px - 42.0, pz + 21.0) < 9.5) continue;
    const py = sampleWanoHeight(px, pz);
    const sc = 0.7 + seededRand(i) * 0.45;
    placeOnWanoSphere(_dummy, px, py + 1.7 * sc, pz, globeRadius, i * 0.7);
    _dummy.scale.setScalar(sc);
    _dummy.updateMatrix();
    snowPineBasesInst.setMatrixAt(spIdx, _dummy.matrix);

    placeOnWanoSphere(_dummy, px, py + 3.0 * sc, pz, globeRadius, i * 0.7);
    _dummy.scale.setScalar(sc);
    _dummy.updateMatrix();
    snowPinesInst.setMatrixAt(spIdx, _dummy.matrix);
    spIdx++;
  }
  snowPineBasesInst.count = spIdx;
  snowPinesInst.count = spIdx;
  snowPineBasesInst.instanceMatrix.needsUpdate = true;
  snowPinesInst.instanceMatrix.needsUpdate = true;
  group.add(snowPineBasesInst, snowPinesInst);

  // =========================================================================
  // 6. UDON & KIBI: PRISONER MINE TORII CAMP & SMOKING CHIMNEY SPIRES
  // =========================================================================
  const mineY = sampleWanoHeight(WANO_LANDMARKS.udonMine.x, WANO_LANDMARKS.udonMine.z);
  const mineGroup = new THREE.Group();
  placeOnWanoSphere(
    mineGroup,
    WANO_LANDMARKS.udonMine.x,
    mineY,
    WANO_LANDMARKS.udonMine.z,
    globeRadius,
    0.2
  );
  const palisadeRing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(5.6 * S, 6.0 * S, 1.5 * S, 18, 1, true)),
    darkWoodMat
  );
  palisadeRing.position.y = 0.75 * S;
  mineGroup.add(palisadeRing);

  const mineTorii = new THREE.Group();
  mineTorii.position.set(0, 0, 5.7 * S);
  addToriiGate(mineTorii, trackGeo, vermilionMat, darkWoodMat, 3.6, 5.0);
  mineGroup.add(mineTorii);

  const udonHutWallGeo = trackGeo(new THREE.BoxGeometry(1.7 * S, 1.05 * S, 1.55 * S));
  const udonHutRoofGeo = buildCurvedGableRoof(trackGeo, 2.1, 0.75, 1.95, 1.15);
  for (let h = 0; h < 6; h++) {
    const ha = (h / 6) * Math.PI * 2;
    const hut = new THREE.Mesh(udonHutWallGeo, castleWallMat);
    hut.position.set(Math.cos(ha) * 3.1 * S, 0.5 * S, Math.sin(ha) * 3.1 * S);
    hut.rotation.y = -ha;
    mineGroup.add(hut);

    const hRoof = new THREE.Mesh(udonHutRoofGeo, castleRoofMat);
    hRoof.position.set(Math.cos(ha) * 3.1 * S, 1.35 * S, Math.sin(ha) * 3.1 * S);
    hRoof.rotation.y = -ha;
    mineGroup.add(hRoof);
  }
  group.add(mineGroup);

  // Towering Udon & Kibi Stone Chimney Spires belching dark pollution plumes
  const smokePuffs: { mesh: THREE.Mesh; baseX: number; baseY: number; baseZ: number; phase: number }[] = [];
  const smokeCardGeo = trackGeo(new THREE.PlaneGeometry(5.8 * S, 3.8 * S));
  for (let i = 0; i < WANO_UDON_SPIRES.length; i++) {
    const spSpec = WANO_UDON_SPIRES[i];
    const sy = sampleWanoHeight(spSpec.x, spSpec.z);
    const sg = new THREE.Group();
    placeOnWanoSphere(sg, spSpec.x, sy - 0.6, spSpec.z, globeRadius, i * 0.8);

    const spireRock = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(spSpec.baseRadius * 0.56 * S, spSpec.baseRadius * S, spSpec.height * S, 9)),
      udonRockMat
    );
    spireRock.position.y = spSpec.height * 0.5 * S;
    sg.add(spireRock);

    for (let st = 0; st < spSpec.stacks; st++) {
      const pipe = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.24 * S, 0.3 * S, 4.5 * S, 7)),
        ironStackMat
      );
      pipe.position.set((st - (spSpec.stacks - 1) * 0.5) * 0.72 * S, (spSpec.height + 1.8) * S, 0);
      sg.add(pipe);
    }
    group.add(sg);

    for (let p = 0; p < 3; p++) {
      const puff = new THREE.Mesh(smokeCardGeo, sootSmokeMat);
      const bx = spSpec.x + p * 2.4;
      const by = sy + spSpec.height + 3.8 + p * 1.7;
      const bz = spSpec.z - p * 1.0;
      placeOnWanoSphere(puff, bx, by, bz, globeRadius, i * 0.4 + p);
      group.add(puff);
      smokePuffs.push({ mesh: puff, baseX: bx, baseY: by, baseZ: bz, phase: i * 1.3 + p * 0.9 });
    }
  }

  // =========================================================================
  // 7. HAKUMAI AUTUMN ISLAND, ENMA SHRINE, HABU PIER & REGIONAL FOLIAGE
  // =========================================================================
  const enmaY = sampleWanoHeight(WANO_LANDMARKS.hakumaiShrine.x, WANO_LANDMARKS.hakumaiShrine.z);
  const enmaGroup = new THREE.Group();
  placeOnWanoSphere(
    enmaGroup,
    WANO_LANDMARKS.hakumaiShrine.x,
    enmaY,
    WANO_LANDMARKS.hakumaiShrine.z,
    globeRadius,
    -0.4
  );
  const enmaHall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.6 * S, 2.3 * S, 3.0 * S)),
    darkWoodMat
  );
  enmaHall.position.y = 1.15 * S;
  enmaGroup.add(enmaHall);
  const enmaRoof = new THREE.Mesh(
    buildCurvedGableRoof(trackGeo, 4.4, 1.5, 3.8, 1.24),
    castleRoofMat
  );
  enmaRoof.position.y = 2.9 * S;
  enmaGroup.add(enmaRoof);
  const enmaTorii = new THREE.Group();
  enmaTorii.position.set(0, 0, 3.8 * S);
  addToriiGate(enmaTorii, trackGeo, castleRoofMat, goldTrimMat, 2.9, 4.2);
  enmaGroup.add(enmaTorii);
  group.add(enmaGroup);

  // Habu / Mogura wooden port pier anchored solidly onto Hakumai's southern shore
  const habuDock = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.2 * S, 0.7 * S, 6.4 * S)),
    darkWoodMat
  );
  placeOnWanoSphere(habuDock, 25.0, WANO_CANAL_WATER_Y + 0.65, 13.8, globeRadius, 0.15);
  group.add(habuDock);

  // Instanced regional trees strictly inside Kuri (emerald) & Hakumai (autumn amber/crimson)
  const regionTreeData: { x: number; y: number; z: number; r: number; h: number; hex: number }[] = [];
  const hakumaiPalette = [0xe89a2c, 0xd65a24, 0xedb838, 0x4b8f3c];
  for (let i = 0; i < 340 && regionTreeData.length < 155; i++) {
    const tx = (seededRand(i * 37 + 5) - 0.5) * 145.0;
    const tz = (seededRand(i * 41 + 9) - 0.5) * 90.0 - 5.0;
    const zone = sampleWanoZone(tx, tz);
    if (zone !== 'kuri' && zone !== 'hakumai') continue;
    if (zone === 'kuri' && Math.hypot(tx + 54.0, tz - 1.5) < 7.5) continue;
    if (zone === 'kuri' && Math.hypot(tx + 62.5, tz + 10.0) < 7.0) continue;
    if (zone === 'hakumai' && Math.hypot(tx - 40.0, tz - 7.0) < 6.2) continue;
    if (zone === 'hakumai' && Math.hypot(tx - 25.0, tz - 13.5) < 4.5) continue;

    regionTreeData.push({
      x: tx,
      y: sampleWanoHeight(tx, tz),
      z: tz,
      r: 1.5 + seededRand(i + 2) * 1.1,
      h: 2.2 + seededRand(i + 6) * 1.4,
      hex:
        zone === 'hakumai'
          ? hakumaiPalette[i % hakumaiPalette.length]
          : i % 2 === 0
            ? 0x2e853c
            : 0x3b9b46,
    });
  }
  const regTrunks = new THREE.InstancedMesh(trunkCylGeo, darkWoodMat, Math.max(1, regionTreeData.length));
  const regCrowns = new THREE.InstancedMesh(
    crownSphGeo,
    trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86 })),
    Math.max(1, regionTreeData.length)
  );
  for (let i = 0; i < regionTreeData.length; i++) {
    const rt = regionTreeData[i];
    placeOnWanoSphere(_dummy, rt.x, rt.y + rt.h * 0.45, rt.z, globeRadius, 0);
    _dummy.scale.set(1, rt.h, 1);
    _dummy.updateMatrix();
    regTrunks.setMatrixAt(i, _dummy.matrix);

    placeOnWanoSphere(_dummy, rt.x, rt.y + rt.h * 0.92, rt.z, globeRadius, 0);
    _dummy.scale.set(rt.r, rt.r * 0.78, rt.r);
    _dummy.updateMatrix();
    regCrowns.setMatrixAt(i, _dummy.matrix);
    _color.setHex(rt.hex);
    regCrowns.setColorAt(i, _color);
  }
  regTrunks.count = regionTreeData.length;
  regCrowns.count = regionTreeData.length;
  regTrunks.instanceMatrix.needsUpdate = true;
  regCrowns.instanceMatrix.needsUpdate = true;
  if (regCrowns.instanceColor) regCrowns.instanceColor.needsUpdate = true;
  group.add(regTrunks, regCrowns);

  // =========================================================================
  // 8. ONIGASHIMA ATOP WANO MOUNTAIN IN THE SOUTHERN INLAND SEA BAY
  // =========================================================================
  const oniGroup = new THREE.Group();
  placeOnWanoSphere(
    oniGroup,
    WANO_ONIGASHIMA_CENTER.x,
    WANO_CANAL_WATER_Y,
    WANO_ONIGASHIMA_CENTER.z,
    globeRadius,
    0
  );

  // Obsidian crag ring behind & flanking Onigashima (kept clear of southern skull face)
  const cragGeo = trackGeo(new THREE.ConeGeometry(3.2 * S, 10.5 * S, 6));
  const oniCragsInst = new THREE.InstancedMesh(cragGeo, obsidianMat, 12);
  let cragIdx = 0;
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    if (ang > 0.55 && ang < 2.55) continue; // Keep southern skull & cheeks completely unobstructed
    const rx = Math.cos(ang) * 10.8 * S;
    const rz = Math.sin(ang) * 8.2 * S;
    _dummy.position.set(rx, 4.8 * S, rz);
    _dummy.rotation.set(0, ang, 0);
    _dummy.scale.set(0.82, 0.75 + seededRand(i * 5) * 0.5, 0.82);
    _dummy.updateMatrix();
    oniCragsInst.setMatrixAt(cragIdx++, _dummy.matrix);
  }
  oniCragsInst.count = cragIdx;
  oniCragsInst.instanceMatrix.needsUpdate = true;
  oniGroup.add(oniCragsInst);

  // Colossal Horned Demon Skull Fortress ("Dokuro") perched above the Great Curtain Waterfall
  const skullGroup = new THREE.Group();
  skullGroup.position.set(0, 8.2 * S, -1.2 * S);

  const cranium = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(7.2 * S, 20, 16)),
    oniSkullBoneMat
  );
  cranium.scale.set(1.12, 0.94, 0.92);
  skullGroup.add(cranium);

  // Sculpted organic heavy brow arches & cheekbone ridges (replaces flat box)
  const browArchGeo = trackGeo(new THREE.SphereGeometry(3.6 * S, 14, 10));
  for (const side of [-1, 1]) {
    const browLobe = new THREE.Mesh(browArchGeo, oniSkullBoneMat);
    browLobe.position.set(side * 2.8 * S, 1.9 * S, 4.7 * S);
    browLobe.scale.set(1.35, 0.45, 0.78);
    browLobe.rotation.z = side * -0.18;
    skullGroup.add(browLobe);

    const cheek = new THREE.Mesh(browArchGeo, oniSkullBoneMat);
    cheek.position.set(side * 3.8 * S, -1.2 * S, 4.5 * S);
    cheek.scale.set(0.9, 0.5, 0.75);
    skullGroup.add(cheek);
  }

  // Glowing fiery amber/crimson hollow eye sockets & nasal triangle
  const eyeGlowGeo = trackGeo(new THREE.SphereGeometry(1.7 * S, 12, 10));
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGlowGeo, oniGlowMat);
    eye.position.set(side * 3.0 * S, 0.35 * S, 5.9 * S);
    eye.scale.set(1.15, 0.85, 0.45);
    skullGroup.add(eye);
  }
  const noseGlow = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.95 * S, 1.8 * S, 3)),
    oniGlowMat
  );
  noseGlow.position.set(0, -1.2 * S, 6.4 * S);
  skullGroup.add(noseGlow);

  // Cavernous open entrance maw + skull teeth
  const mawBackdrop = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(3.4 * S, 12, 10)),
    trackMat(new THREE.MeshBasicMaterial({ color: 0x16071c }))
  );
  mawBackdrop.position.set(0, -3.8 * S, 5.1 * S);
  mawBackdrop.scale.set(1.35, 0.8, 0.6);
  skullGroup.add(mawBackdrop);

  const toothGeo = trackGeo(new THREE.BoxGeometry(0.95 * S, 1.2 * S, 0.9 * S));
  for (let t = -3; t <= 3; t++) {
    const tooth = new THREE.Mesh(toothGeo, oniSkullBoneMat);
    tooth.position.set(t * 1.0 * S, -2.5 * S, 6.1 * S);
    skullGroup.add(tooth);
  }

  // Two Colossal Sweeping Bull Horns rising from the skull
  for (const side of [-1, 1]) {
    const hornCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 5.6 * S, 2.5 * S, 0),
      new THREE.Vector3(side * 10.8 * S, 4.5 * S, 1.0 * S),
      new THREE.Vector3(side * 13.2 * S, 9.6 * S, 2.2 * S),
      new THREE.Vector3(side * 11.4 * S, 16.0 * S, 2.9 * S),
    ]);
    const hornGeo = trackGeo(new THREE.TubeGeometry(hornCurve, 18, 1.75 * S, 10, false));
    const hPos = hornGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < hPos.count; i++) {
      const ringIdx = Math.floor(i / 11);
      const t = Math.min(1, ringIdx / 18);
      const center = hornCurve.getPoint(t);
      const sc = 1.15 - t * 0.92;
      hPos.setXYZ(
        i,
        center.x + (hPos.getX(i) - center.x) * sc,
        center.y + (hPos.getY(i) - center.y) * sc,
        center.z + (hPos.getZ(i) - center.z) * sc
      );
    }
    hornGeo.computeVertexNormals();
    skullGroup.add(new THREE.Mesh(hornGeo, oniHornMat));
  }

  // Titanic Giant Katana jammed slantwise beside the Demon Skull
  const giantSword = new THREE.Group();
  giantSword.position.set(8.6 * S, 1.6 * S, 3.2 * S);
  giantSword.rotation.z = -0.34;
  const gBlade = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.68 * S, 12.2 * S, 0.2 * S)),
    steelBladeMat
  );
  gBlade.position.y = 5.0 * S;
  giantSword.add(gBlade);
  const gGuard = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.25 * S, 1.25 * S, 0.34 * S, 10)),
    goldTrimMat
  );
  gGuard.position.y = 8.0 * S;
  giantSword.add(gGuard);
  const gHilt = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.32 * S, 0.4 * S, 3.2 * S, 8)),
    oniHornMat
  );
  gHilt.position.y = 9.7 * S;
  giantSword.add(gHilt);
  skullGroup.add(giantSword);

  oniGroup.add(skullGroup);

  // Pleasure Hall Dark Fortress Pavilions & Southern Entrance Torii facing the Great Waterfall
  const oniTorii = new THREE.Group();
  oniTorii.position.set(0, 1.6 * S, 9.6 * S);
  addToriiGate(oniTorii, trackGeo, vermilionMat, obsidianMat, 3.8, 5.2);
  oniGroup.add(oniTorii);

  for (let p = 0; p < 6; p++) {
    const px = ((p % 3) - 1) * 3.8;
    const pz = p < 3 ? 4.8 : 7.4;
    const pav = new THREE.Group();
    pav.position.set(px * S, 2.0 * S, pz * S);
    const pBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.2 * S, 2.0 * S, 2.0 * S)),
      darkWoodMat
    );
    pBody.position.y = 1.0 * S;
    pav.add(pBody);
    const pRoof = new THREE.Mesh(
      buildCurvedGableRoof(trackGeo, 2.8, 1.1, 2.6, 1.24),
      castleRoofMat
    );
    pRoof.position.y = 2.3 * S;
    pav.add(pRoof);
    oniGroup.add(pav);
  }

  // Swirling Purple Demon Mist Clouds atop Onigashima in the elevated southern bay
  const oniMistCards: { mesh: THREE.Mesh; baseX: number; baseY: number; baseZ: number; phase: number }[] = [];
  const oniMistGeo = trackGeo(new THREE.PlaneGeometry(12.0 * S, 6.2 * S));
  for (let i = 0; i < 6; i++) {
    const mx = ((i % 3) - 1) * 6.5;
    const my = WANO_CANAL_WATER_Y + 5.5 + (i % 2) * 3.5;
    const mz = WANO_ONIGASHIMA_CENTER.z + (i < 3 ? 4.0 : -3.0);
    const mist = new THREE.Mesh(oniMistGeo, oniMistMat);
    placeOnWanoSphere(mist, mx, my, mz, globeRadius, (i - 2.5) * 0.28);
    group.add(mist);
    oniMistCards.push({ mesh: mist, baseX: mx, baseY: my, baseZ: mz, phase: i * 1.1 });
  }
  group.add(oniGroup);

  // =========================================================================
  // 9. ANIMATED DRIFTING SAKURA PETALS & RINGO / ONIGASHIMA WINTER SNOWFLAKES
  // =========================================================================
  const petalCount = 64;
  const petalGeo = trackGeo(new THREE.PlaneGeometry(0.42 * S, 0.28 * S));
  const petalMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffb7d8,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    })
  );
  const petalsInst = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);
  petalsInst.frustumCulled = false;
  const petalSeeds = Array.from({ length: petalCount }, (_, i) => ({
    x: 1.5 + (seededRand(i * 11 + 3) - 0.5) * 22.0,
    z: -12.0 + (seededRand(i * 17 + 7) - 0.5) * 18.0,
    baseY: WANO_PLATEAU_Y + 2.0,
    speed: 1.3 + seededRand(i * 5) * 1.5,
    phase: i * 0.55,
  }));
  group.add(petalsInst);

  const snowCount = 72;
  const snowFlakeGeo = trackGeo(new THREE.PlaneGeometry(0.36 * S, 0.36 * S));
  const snowFlakeMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    })
  );
  const snowInst = new THREE.InstancedMesh(snowFlakeGeo, snowFlakeMat, snowCount);
  snowInst.frustumCulled = false;
  const snowSeeds = Array.from({ length: snowCount }, (_, i) => ({
    x: i < 44 ? 24.0 + seededRand(i * 13 + 1) * 34.0 : (seededRand(i * 19 + 3) - 0.5) * 28.0,
    z:
      i < 44
        ? -31.0 + seededRand(i * 23 + 5) * 20.0
        : WANO_ONIGASHIMA_CENTER.z - 10.0 + seededRand(i * 29 + 7) * 20.0,
    baseY: i < 44 ? WANO_PLATEAU_Y + 3.0 : WANO_CANAL_WATER_Y + 4.0,
    speed: 2.1 + seededRand(i * 9) * 1.7,
    phase: i * 0.42,
  }));
  group.add(snowInst);

  // =========================================================================
  // 10. ZERO-GC PER-FRAME ANIMATION LOOP
  // =========================================================================
  const update = (elapsed: number) => {
    waterfallTex.offset.y = -((elapsed * 0.55) % 1);
    fujiCloudRing.rotation.y = elapsed * 0.05;

    for (let i = 0; i < hokusaiWaves.length; i++) {
      const hw = hokusaiWaves[i];
      const sp = toWanoSphereLocal(
        hw.baseX,
        2.5 + Math.sin(elapsed * 2.1 + hw.phase) * 0.48,
        hw.baseZ,
        globeRadius
      );
      hw.mesh.position.set(sp.x, sp.y, sp.z);
    }

    for (let i = 0; i < canalBoats.length; i++) {
      const cb = canalBoats[i];
      const zTravel =
        i === 0
          ? -9.5 + ((elapsed * 1.2 + cb.phase * 4.0) % 9.5)
          : 18.0 + Math.sin(elapsed * 0.4 + cb.phase) * 3.0;
      const xTravel =
        i === 0
          ? 1.5
          : -14.0 + Math.cos(elapsed * 0.35 + cb.phase) * 5.0;
      placeOnWanoSphere(
        cb.group,
        xTravel,
        WANO_CANAL_WATER_Y + 0.35 + Math.sin(elapsed * 3.0 + cb.phase) * 0.08,
        zTravel,
        globeRadius,
        i === 0 ? 0 : 1.1
      );
    }

    for (let i = 0; i < smokePuffs.length; i++) {
      const sm = smokePuffs[i];
      const drift = Math.sin(elapsed * 0.8 + sm.phase) * 1.4;
      const lift = (elapsed * 0.9 + sm.phase) % 3.0;
      const sp = toWanoSphereLocal(
        sm.baseX + lift * 1.0,
        sm.baseY + lift * 1.1 + drift * 0.3,
        sm.baseZ,
        globeRadius
      );
      sm.mesh.position.set(sp.x, sp.y, sp.z);
    }

    for (let i = 0; i < oniMistCards.length; i++) {
      const om = oniMistCards[i];
      const sp = toWanoSphereLocal(
        om.baseX + Math.sin(elapsed * 0.65 + om.phase) * 1.8,
        om.baseY + Math.cos(elapsed * 0.55 + om.phase) * 0.6,
        om.baseZ,
        globeRadius
      );
      om.mesh.position.set(sp.x, sp.y, sp.z);
    }

    for (let i = 0; i < petalCount; i++) {
      const p = petalSeeds[i];
      const drop = (elapsed * p.speed + p.phase * 4.0) % 12.0;
      const px = p.x + Math.sin(elapsed * 1.3 + p.phase) * 1.4;
      const py = p.baseY + 12.0 - drop;
      const pz = p.z + Math.cos(elapsed * 1.1 + p.phase) * 1.1;
      placeOnWanoSphere(_dummy, px, py, pz, globeRadius, elapsed + p.phase);
      _dummy.rotateX(elapsed * 1.8 + p.phase);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      petalsInst.setMatrixAt(i, _dummy.matrix);
    }
    petalsInst.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < snowCount; i++) {
      const s = snowSeeds[i];
      const drop = (elapsed * s.speed + s.phase * 5.0) % 16.0;
      const sx = s.x + Math.sin(elapsed * 1.6 + s.phase) * 1.1;
      const sy = s.baseY + 16.0 - drop;
      placeOnWanoSphere(_dummy, sx, sy, s.z, globeRadius, elapsed * 0.5);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      snowInst.setMatrixAt(i, _dummy.matrix);
    }
    snowInst.instanceMatrix.needsUpdate = true;
  };

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update,
  };
}
