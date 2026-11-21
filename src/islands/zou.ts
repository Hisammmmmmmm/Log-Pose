import * as THREE from 'three';
import type { IslandMeshContext, IslandMeshInstance } from './types';
import {
  ZOU_BACK_DECK_Y,
  ZOU_GLOBE_SCALE,
  ZOU_LANDMARKS,
  ZOU_MONOLITHS,
  ZOU_WORLD_SIZE,
  ZUNESHA_LEGS,
  isPointInsideRavagedSector,
  sampleZouHeight,
  toZouSphereLocal,
  zouPlateauNormRadius,
} from '../utils/zouTerrain';
import {
  createAqueductWaterTexture,
  createMokomoHouseFacadeTexture,
  createMokomoStoneTexture,
  createRainbowArcTexture,
  createSoftMistTexture,
  createWhaleBarkTexture,
  createZouPlateauTexture,
  createZuneshaSkinBumpTexture,
  createZuneshaSkinTexture,
} from './zouTextures';

const S = ZOU_GLOBE_SCALE;

// Reusable scratch math (zero allocations in update loop)
const _up = new THREE.Vector3(0, 1, 0);
const _yAxis = new THREE.Vector3(0, 1, 0);
const _localNormal = new THREE.Vector3();
const _tiltQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();
const _dummy = new THREE.Object3D();

function placeOnZouSphere(
  obj: THREE.Object3D,
  lx: number,
  ly: number,
  lz: number,
  globeRadius: number,
  yaw = 0
): void {
  const sp = toZouSphereLocal(lx, ly, lz, globeRadius);
  obj.position.set(sp.x, sp.y, sp.z);
  _localNormal.set(sp.x, globeRadius + sp.y, sp.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

function seededRand(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance | null {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const group = new THREE.Group();
  group.name = 'zou-island-root';

  const keepTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;

  // Textures & Materials
  const zuneshaSkinTex = keepTex(createZuneshaSkinTexture(512));
  const zuneshaBumpTex = keepTex(createZuneshaSkinBumpTexture(512));
  const plateauTex = keepTex(createZouPlateauTexture(1024));
  const mokomoStoneTex = keepTex(createMokomoStoneTexture(512));
  const houseFacadeTex = keepTex(createMokomoHouseFacadeTexture(256));
  const whaleBarkTex = keepTex(createWhaleBarkTexture(512));
  const aqueductWaterTex = keepTex(createAqueductWaterTexture(256));
  const rainbowTex = keepTex(createRainbowArcTexture(256));
  const mistTex = keepTex(createSoftMistTexture(128));

  const zuneshaSkinMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: zuneshaSkinTex,
      bumpMap: zuneshaBumpTex,
      bumpScale: 0.012,
      roughness: 0.92,
      metalness: 0.02,
    })
  );

  const eyeSocketMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x050608,
      roughness: 0.98,
      metalness: 0.0,
    })
  );

  const tuskMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6dcc0,
      roughness: 0.56,
      metalness: 0.04,
    })
  );

  const plateauMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: plateauTex,
      alphaTest: 0.35,
      roughness: 0.9,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );

  const mokomoStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: mokomoStoneTex,
      roughness: 0.88,
      metalness: 0.03,
    })
  );

  const rimStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7a7e72,
      map: mokomoStoneTex,
      roughness: 0.92,
      metalness: 0.02,
    })
  );

  const houseWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: houseFacadeTex,
      roughness: 0.86,
      metalness: 0.02,
    })
  );

  const houseRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdccbb0,
      roughness: 0.85,
      metalness: 0.02,
    })
  );

  const darkPortalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x161412,
      roughness: 0.96,
      metalness: 0.0,
    })
  );

  const mossMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4b933b,
      roughness: 0.94,
      metalness: 0.0,
    })
  );

  const canopyEmeraldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x26843d,
      roughness: 0.88,
      metalness: 0.0,
    })
  );

  const canopyBrightMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3da84a,
      roughness: 0.86,
      metalness: 0.0,
    })
  );

  const canopyDeepMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1a5f2c,
      roughness: 0.9,
      metalness: 0.0,
    })
  );

  const whaleBarkMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: whaleBarkTex,
      roughness: 0.84,
      metalness: 0.02,
    })
  );

  const trunkWoodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6f553c,
      roughness: 0.9,
      metalness: 0.02,
    })
  );

  const timberDeckMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xa47d52,
      roughness: 0.84,
      metalness: 0.04,
    })
  );

  const aqueductWaterMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: aqueductWaterTex,
      color: 0x72f2ff,
      emissive: 0x0b4c60,
      emissiveIntensity: 0.32,
      roughness: 0.25,
      metalness: 0.08,
      transparent: true,
      opacity: 0.92,
    })
  );

  const waterfallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: aqueductWaterTex,
      color: 0x9ef4ff,
      emissive: 0x1a6880,
      emissiveIntensity: 0.28,
      roughness: 0.24,
      transparent: true,
      opacity: 0.84,
      side: THREE.DoubleSide,
    })
  );

  const seaFoamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xf4fcff,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const cloudMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf7fbff,
      roughness: 0.96,
      metalness: 0.0,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    })
  );

  const rainbowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: rainbowTex,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const koroGasMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      map: mistTex,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const eruptionSpoutMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xc2f6ff,
      map: aqueductWaterTex,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    })
  );

  const rainStreakMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xe6faff,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    })
  );

  const ruinedStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8d8274,
      map: mokomoStoneTex,
      roughness: 0.95,
      metalness: 0.01,
    })
  );

  const poneglyphMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8e1726,
      emissive: 0x4c0913,
      emissiveIntensity: 0.55,
      roughness: 0.42,
      metalness: 0.15,
    })
  );

  // =========================================================================
  // 1. ZUNESHA — THE TITANIC THOUSAND-YEAR-OLD WALKING ELEPHANT
  // =========================================================================
  const zuneshaGroup = new THREE.Group();
  placeOnZouSphere(zuneshaGroup, 0, 0, 0, globeRadius, 0);
  group.add(zuneshaGroup);

  // Broad barrel torso & dome carrying Zou
  const torsoGeo = trackGeo(new THREE.SphereGeometry(48 * S, 36, 26));
  const torsoPos = torsoGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < torsoPos.count; i++) {
    let x = torsoPos.getX(i) / S;
    let y = torsoPos.getY(i) / S;
    let z = torsoPos.getZ(i) / S;
    x *= 1.32; // Elongate front-to-back (~63m radius)
    z *= 0.94; // Flank width (~45m half-width)
    y = y * 0.46 + 46.5; // Belly ~24.4m, flat-crowned saddle back ~68.6m
    // Slightly flatten top saddle under the plateau while keeping rounded shoulders
    if (y > 64.5 && Math.hypot(x / 52, z / 46) < 1.02) {
      y = 64.5 + (y - 64.5) * 0.25;
    }
    // Slight barrel chest slope on front (-X)
    if (x < -30) {
      y -= (-30 - x) * 0.16;
    }
    torsoPos.setXYZ(i, x * S, y * S, z * S);
  }
  torsoGeo.computeVertexNormals();
  const torsoMesh = new THREE.Mesh(torsoGeo, zuneshaSkinMat);
  zuneshaGroup.add(torsoMesh);

  // Sculpted shoulder hump & chest brisket
  const shoulderGeo = trackGeo(new THREE.SphereGeometry(24 * S, 24, 18));
  const shoulderMesh = new THREE.Mesh(shoulderGeo, zuneshaSkinMat);
  shoulderMesh.position.set(-48 * S, 51 * S, 0);
  shoulderMesh.scale.set(0.95, 1.05, 1.38);
  zuneshaGroup.add(shoulderMesh);

  const brisketMesh = new THREE.Mesh(shoulderGeo, zuneshaSkinMat);
  brisketMesh.position.set(-54 * S, 38 * S, 0);
  brisketMesh.scale.set(0.85, 0.72, 1.1);
  zuneshaGroup.add(brisketMesh);

  // Colossal Head, furrowed brow, deep hollow eye sockets, tusks, frayed ears & trunk
  const headGroup = new THREE.Group();
  headGroup.position.set(-72 * S, 55 * S, 0);
  zuneshaGroup.add(headGroup);

  const craniumGeo = trackGeo(new THREE.SphereGeometry(22 * S, 26, 20));
  const craniumPos = craniumGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < craniumPos.count; i++) {
    let x = craniumPos.getX(i) / S;
    let y = craniumPos.getY(i) / S;
    let z = craniumPos.getZ(i) / S;
    x *= 1.15;
    y *= 1.08;
    z *= 0.96;
    // Slight concave sunken temples & cheekbones for aged gaunt look
    if (x < -4 && Math.abs(z) > 10 && y > -4 && y < 10) {
      const dent = Math.exp(-Math.pow((y - 2) / 5.5, 2));
      z -= Math.sign(z) * dent * 2.2;
    }
    craniumPos.setXYZ(i, x * S, y * S, z * S);
  }
  craniumGeo.computeVertexNormals();
  const craniumMesh = new THREE.Mesh(craniumGeo, zuneshaSkinMat);
  headGroup.add(craniumMesh);

  // Subtle brow ridge + deep pitch-black hollow eye sockets recessed into Zunesha's weathered skull (Image 1)
  const browGeo = trackGeo(new THREE.SphereGeometry(6.2 * S, 16, 12));
  const socketGeo = trackGeo(new THREE.SphereGeometry(5.2 * S, 16, 12));
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(browGeo, zuneshaSkinMat);
    brow.position.set(-12.4 * S, 6.4 * S, side * 11.4 * S);
    brow.scale.set(0.68, 0.34, 1.18);
    headGroup.add(brow);

    const socket = new THREE.Mesh(socketGeo, eyeSocketMat);
    socket.position.set(-16.1 * S, 2.0 * S, side * 11.2 * S);
    socket.scale.set(0.62, 1.04, 0.92);
    headGroup.add(socket);
  }

  // Big ragged / frayed fan-shaped elephant ears (Image 1)
  for (const side of [-1, 1]) {
    const earGroup = new THREE.Group();
    earGroup.position.set(2.5 * S, 3.5 * S, side * 20.5 * S);
    earGroup.rotation.y = side * -0.45;
    earGroup.rotation.x = side * 0.16;

    const mainEarGeo = trackGeo(new THREE.CylinderGeometry(13.5 * S, 9.5 * S, 3.0 * S, 12));
    const mainEar = new THREE.Mesh(mainEarGeo, zuneshaSkinMat);
    mainEar.rotation.x = Math.PI * 0.5;
    mainEar.scale.set(1.0, 1.0, 1.25);
    earGroup.add(mainEar);

    // Tattered lower ear lobes / notches
    const lobeGeo = trackGeo(new THREE.ConeGeometry(3.4 * S, 9.5 * S, 7));
    for (let l = -1; l <= 1; l++) {
      const lobe = new THREE.Mesh(lobeGeo, zuneshaSkinMat);
      lobe.position.set(l * 5.2 * S, -12.8 * S, 0);
      lobe.rotation.z = Math.PI + l * 0.14;
      earGroup.add(lobe);
    }
    headGroup.add(earGroup);
  }

  // Two colossal upward-sweeping curved ivory tusks (Image 1)
  for (const side of [-1, 1]) {
    const tuskCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-12 * S, -9 * S, side * 9.5 * S),
      new THREE.Vector3(-25 * S, -17 * S, side * 14.5 * S),
      new THREE.Vector3(-42 * S, -17 * S, side * 17.5 * S),
      new THREE.Vector3(-56 * S, -6 * S, side * 16.5 * S),
    ]);
    const tuskGeo = trackGeo(new THREE.TubeGeometry(tuskCurve, 22, 2.7 * S, 10, false));
    // Taper tusk toward tip
    const tPos = tuskGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < tPos.count; i++) {
      const ringIdx = Math.floor(i / 11);
      const t = Math.min(1, ringIdx / 22);
      const center = tuskCurve.getPoint(t);
      const scale = 1.0 - t * 0.88;
      tPos.setXYZ(
        i,
        center.x + (tPos.getX(i) - center.x) * scale,
        center.y + (tPos.getY(i) - center.y) * scale,
        center.z + (tPos.getZ(i) - center.z) * scale
      );
    }
    tuskGeo.computeVertexNormals();
    const tusk = new THREE.Mesh(tuskGeo, tuskMat);
    headGroup.add(tusk);

    // Skin sheath cuff around tusk root
    const sheath = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(3.6 * S, 4.2 * S, 5.5 * S, 12)),
      zuneshaSkinMat
    );
    sheath.position.set(-14 * S, -10.5 * S, side * 10.5 * S);
    sheath.rotation.z = Math.PI * 0.34;
    headGroup.add(sheath);
  }

  // Articulated colossal sweeping trunk (pivoted for gentle idle + Eruption Rain motion)
  const trunkPivot = new THREE.Group();
  trunkPivot.position.set(-16 * S, -6 * S, 0);
  headGroup.add(trunkPivot);

  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-12 * S, -14 * S, 0),
    new THREE.Vector3(-28 * S, -17 * S, 0),
    new THREE.Vector3(-40 * S, -8 * S, 0),
    new THREE.Vector3(-43 * S, 9 * S, 0),
  ]);
  const trunkGeo = trackGeo(new THREE.TubeGeometry(trunkCurve, 28, 5.2 * S, 12, false));
  const trPos = trunkGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < trPos.count; i++) {
    const ringIdx = Math.floor(i / 13);
    const t = Math.min(1, ringIdx / 28);
    const center = trunkCurve.getPoint(t);
    const scale = 1.18 - t * 0.58;
    trPos.setXYZ(
      i,
      center.x + (trPos.getX(i) - center.x) * scale,
      center.y + (trPos.getY(i) - center.y) * scale,
      center.z + (trPos.getZ(i) - center.z) * scale
    );
  }
  trunkGeo.computeVertexNormals();
  const trunkMesh = new THREE.Mesh(trunkGeo, zuneshaSkinMat);
  trunkPivot.add(trunkMesh);

  // Flared trunk tip & nostril rim
  const trunkTipRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(2.5 * S, 0.85 * S, 8, 14)),
    zuneshaSkinMat
  );
  trunkTipRing.position.set(-43 * S, 9.2 * S, 0);
  trunkTipRing.rotation.x = Math.PI * 0.5;
  trunkPivot.add(trunkTipRing);

  // 4 Titanic Pillar Legs plunging into ocean + Sea-Foam Collars
  const legFoamRings: THREE.Mesh[] = [];
  const foamRingGeo = trackGeo(new THREE.RingGeometry(9.8 * S, 16.5 * S, 28));
  for (let i = 0; i < ZUNESHA_LEGS.length; i++) {
    const leg = ZUNESHA_LEGS[i];
    const legGroup = new THREE.Group();
    const strideShift = Math.sin(leg.stridePhase) * 3.5 * S;
    legGroup.position.set(leg.x * S + strideShift, 16 * S, leg.z * S);

    // Upper thigh
    const thigh = new THREE.Mesh(
      trackGeo(
        new THREE.CylinderGeometry(leg.radiusTop * S, 11.4 * S, 24 * S, 16)
      ),
      zuneshaSkinMat
    );
    thigh.position.y = 14 * S;
    thigh.rotation.z = Math.sin(leg.stridePhase) * 0.08;
    legGroup.add(thigh);

    // Knee joint bulge
    const knee = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(11.6 * S, 14, 12)),
      zuneshaSkinMat
    );
    knee.position.y = 2 * S;
    legGroup.add(knee);

    // Lower column plunging below sea level (y = -10..18)
    const shin = new THREE.Mesh(
      trackGeo(
        new THREE.CylinderGeometry(11.0 * S, leg.radiusSea * S * 1.05, 28 * S, 16)
      ),
      zuneshaSkinMat
    );
    shin.position.y = -11 * S;
    legGroup.add(shin);

    zuneshaGroup.add(legGroup);

    // Churning white sea-foam collar around each leg at ocean surface
    const foam = new THREE.Mesh(foamRingGeo, seaFoamMat);
    placeOnZouSphere(
      foam,
      leg.x + Math.sin(leg.stridePhase) * 3.5,
      0.55,
      leg.z,
      globeRadius,
      i * 0.7
    );
    foam.rotateX(-Math.PI * 0.5);
    group.add(foam);
    legFoamRings.push(foam);
  }

  // Dangling elephant tail at rear (+X)
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(60 * S, 43 * S, 0),
    new THREE.Vector3(68 * S, 34 * S, 1.5 * S),
    new THREE.Vector3(73 * S, 22 * S, 0.5 * S),
    new THREE.Vector3(76 * S, 13 * S, 0),
  ]);
  const tailGeo = trackGeo(new THREE.TubeGeometry(tailCurve, 12, 1.5 * S, 8, false));
  const tailMesh = new THREE.Mesh(tailGeo, zuneshaSkinMat);
  zuneshaGroup.add(tailMesh);
  const tailTuft = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(2.6 * S, 5.0 * S, 7)),
    zuneshaSkinMat
  );
  tailTuft.position.set(76 * S, 11.5 * S, 0);
  zuneshaGroup.add(tailTuft);

  // Wispy Cloud Collars drifting below Zunesha's flanks, chest & legs (never obscuring eyes)
  const driftingClouds: {
    group: THREE.Group;
    baseX: number;
    baseY: number;
    baseZ: number;
    speed: number;
    phase: number;
  }[] = [];
  const cloudPuffGeo = trackGeo(new THREE.SphereGeometry(5.6 * S, 12, 10));
  const cloudAnchors = [
    [-54, 30, 32],
    [-64, 34, -34],
    [-26, 22, 38],
    [-16, 28, -38],
    [22, 24, 38],
    [48, 32, -36],
    [60, 40, 26],
  ];
  for (let i = 0; i < cloudAnchors.length; i++) {
    const [cx, cy, cz] = cloudAnchors[i];
    const cg = new THREE.Group();
    for (let p = 0; p < 4; p++) {
      const puff = new THREE.Mesh(cloudPuffGeo, cloudMat);
      puff.position.set(
        (p - 1.5) * 4.5 * S,
        Math.sin(p * 1.7) * 0.9 * S,
        (seededRand(i * 11 + p) - 0.5) * 2.8 * S
      );
      const sc = 0.72 + seededRand(i * 7 + p) * 0.7;
      puff.scale.set(sc * 1.55, sc * 0.36, sc * 1.05);
      cg.add(puff);
    }
    placeOnZouSphere(cg, cx, cy, cz, globeRadius, seededRand(i * 5) * Math.PI);
    group.add(cg);
    driftingClouds.push({
      group: cg,
      baseX: cx,
      baseY: cy,
      baseZ: cz,
      speed: 0.25 + (i % 3) * 0.12,
      phase: i * 1.1,
    });
  }

  // =========================================================================
  // 2. ZOU BACK PLATEAU TERRAIN, STONE PARAPET & 7 GIANT MOSSY MONOLITHS
  // =========================================================================
  const segs = 96;
  const plateauGeo = trackGeo(
    new THREE.PlaneGeometry(ZOU_WORLD_SIZE * S, ZOU_WORLD_SIZE * S, segs, segs)
  );
  plateauGeo.rotateX(-Math.PI * 0.5);
  const pPos = plateauGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pPos.count; i++) {
    const lx = pPos.getX(i) / S;
    const lz = pPos.getZ(i) / S;
    const nr = zouPlateauNormRadius(lx, lz);
    let ly = sampleZouHeight(lx, lz);
    if (nr > 0.955) {
      // Smooth beveled slope blending seamlessly into Zunesha's rounded back
      const t = Math.min(1, (nr - 0.955) / 0.065);
      const smooth = t * t * (3 - 2 * t);
      ly = ly * (1 - smooth) + (ZOU_BACK_DECK_Y - 3.6) * smooth;
    }
    const sp = toZouSphereLocal(lx, ly, lz, globeRadius);
    pPos.setXYZ(i, sp.x, sp.y, sp.z);
  }
  plateauGeo.computeVertexNormals();
  const plateauMesh = new THREE.Mesh(plateauGeo, plateauMat);
  group.add(plateauMesh);

  // Mossy carved stone parapet ring around the cliff perimeter (with breach at Ravaged SW)
  const parapetCount = 34;
  const parapetGeo = trackGeo(new THREE.BoxGeometry(9.2 * S, 4.4 * S, 2.8 * S));
  const parapetMossGeo = trackGeo(new THREE.BoxGeometry(8.8 * S, 1.3 * S, 2.5 * S));
  for (let i = 0; i < parapetCount; i++) {
    const ang = (i / parapetCount) * Math.PI * 2;
    const px = Math.cos(ang) * 49.5;
    const pz = Math.sin(ang) * 43.8;
    // Leave shattered claw-breach gap at SW ravaged gate (ang ~ 2.45 rad)
    if (px < -24 && pz > 16) continue;
    const py = sampleZouHeight(px, pz);
    const block = new THREE.Mesh(parapetGeo, rimStoneMat);
    placeOnZouSphere(block, px, py + 0.8, pz, globeRadius, -ang + Math.PI * 0.5);
    group.add(block);

    const cap = new THREE.Mesh(parapetMossGeo, mossMat);
    placeOnZouSphere(cap, px, py + 3.1, pz, globeRadius, -ang + Math.PI * 0.5);
    group.add(cap);
  }

  // 7 Monumental Mossy Rectangular Monoliths (Images 2, 4, 5)
  const nicheMat = darkPortalMat;
  for (let i = 0; i < ZOU_MONOLITHS.length; i++) {
    const m = ZOU_MONOLITHS[i];
    const baseY = sampleZouHeight(m.x, m.z);
    const mg = new THREE.Group();
    placeOnZouSphere(mg, m.x, baseY - 1.5, m.z, globeRadius, m.yaw);

    // Main weathered stone monolith shaft
    const shaft = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(m.width * S, m.height * S, m.depth * S)),
      mokomoStoneMat
    );
    shaft.position.y = m.height * 0.5 * S;
    mg.add(shaft);

    // Stepped plinth base
    const plinth = new THREE.Mesh(
      trackGeo(
        new THREE.BoxGeometry(
          (m.width + 2.2) * S,
          4.2 * S,
          (m.depth + 2.2) * S
        )
      ),
      rimStoneMat
    );
    plinth.position.y = 2.0 * S;
    mg.add(plinth);

    // Recessed dark rectangular window-niches & horizontal slit rows (Image 4 & 5)
    for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
      const zSign = sideIdx === 0 ? 1 : -1;
      const bigNiche = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(m.width * 0.42 * S, 3.6 * S, 0.7 * S)),
        nicheMat
      );
      bigNiche.position.set(0, m.height * 0.52 * S, zSign * m.depth * 0.49 * S);
      mg.add(bigNiche);

      // Row of 4 small upper slit windows
      for (let sIdx = -1.5; sIdx <= 1.5; sIdx += 1.0) {
        const slit = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.95 * S, 2.0 * S, 0.7 * S)),
          nicheMat
        );
        slit.position.set(
          sIdx * 2.1 * S,
          m.height * 0.74 * S,
          zSign * m.depth * 0.49 * S
        );
        mg.add(slit);
      }
    }

    // Thick lush emerald moss crown + hanging moss curtains
    const crownCap = new THREE.Mesh(
      trackGeo(
        new THREE.BoxGeometry(
          (m.width + 0.8) * S,
          3.2 * S,
          (m.depth + 0.8) * S
        )
      ),
      mossMat
    );
    crownCap.position.y = (m.height + 0.9) * S;
    mg.add(crownCap);

    for (let k = 0; k < 4; k++) {
      const mound = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry((3.0 + (k % 2) * 1.1) * S, 10, 8)),
        k % 2 === 0 ? mossMat : canopyBrightMat
      );
      mound.position.set(
        (k - 1.5) * m.width * 0.22 * S,
        (m.height + 2.2) * S,
        (k % 2 === 0 ? 1 : -1) * m.depth * 0.18 * S
      );
      mound.scale.set(1.2, 0.75, 1.1);
      mg.add(mound);
    }

    group.add(mg);
  }

  // =========================================================================
  // 3. MOKOMO DUKEDOM CITADEL, 4 CYAN AQUEDUCTS & STEPPED SANDSTONE CITY
  // =========================================================================
  const citadelGroup = new THREE.Group();
  const citadelBaseY = sampleZouHeight(0, -2.0);
  placeOnZouSphere(citadelGroup, 0, citadelBaseY - 0.5, -2.0, globeRadius, 0);

  // Lower cylindrical fortified bastion
  const lowerBastion = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(8.3 * S, 8.8 * S, 8.2 * S, 24)),
    mokomoStoneMat
  );
  lowerBastion.position.y = 4.1 * S;
  citadelGroup.add(lowerBastion);

  // Upper cylindrical citadel keep (offset slightly back-right like Image 3)
  const upperKeep = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(5.5 * S, 5.8 * S, 7.2 * S, 22)),
    mokomoStoneMat
  );
  upperKeep.position.set(0.8 * S, 11.0 * S, -1.6 * S);
  citadelGroup.add(upperKeep);

  // Flanking cylindrical turrets on lower & upper tiers
  const turretSpecs: [number, number, number, number, number][] = [
    [-7.8, 4.6, 3.6, 2.1, 9.2],
    [7.8, 4.6, 3.6, 2.2, 9.4],
    [4.4, 11.4, 2.2, 1.6, 8.6],
    [-4.2, 10.8, 0.6, 1.5, 7.2],
  ];
  for (const [tx, ty, tz, tr, th] of turretSpecs) {
    const turret = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(tr * S, (tr + 0.25) * S, th * S, 14)),
      mokomoStoneMat
    );
    turret.position.set(tx * S, ty * S, tz * S);
    citadelGroup.add(turret);
  }

  // Upper keep portal & small spillway
  const upperPortal = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.95 * S, 0.95 * S, 1.4 * S, 10)),
    darkPortalMat
  );
  upperPortal.rotation.x = Math.PI * 0.5;
  upperPortal.position.set(4.4 * S, 12.2 * S, 3.6 * S);
  citadelGroup.add(upperPortal);

  // Crenellation battlements around lower & upper rings
  const merlonGeo = trackGeo(new THREE.BoxGeometry(1.1 * S, 0.9 * S, 0.9 * S));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const merlon = new THREE.Mesh(merlonGeo, mokomoStoneMat);
    merlon.position.set(Math.cos(a) * 8.0 * S, 8.5 * S, Math.sin(a) * 8.0 * S);
    merlon.rotation.y = -a;
    citadelGroup.add(merlon);
  }

  // 4 Arched Citadel Portals & Steep Diagonal Cyan Aqueduct Chutes (Image 3 & 5)
  const aqueductAngles = [0.68, 1.28, 1.92, 2.52]; // Spreading across southern stepped city
  for (let i = 0; i < aqueductAngles.length; i++) {
    const ang = aqueductAngles[i];
    const dirX = Math.cos(ang);
    const dirZ = Math.sin(ang);

    // Arched portal at bastion wall
    const portal = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.85 * S, 2.5 * S, 1.4 * S)),
      darkPortalMat
    );
    portal.position.set(dirX * 8.2 * S, 3.6 * S, dirZ * 8.2 * S);
    portal.rotation.y = -ang + Math.PI * 0.5;
    citadelGroup.add(portal);

    // Steep diagonal stone trough & cyan water ribbon descending to city plaza
    const startX = dirX * 8.1;
    const startZ = -2.0 + dirZ * 8.1;
    const endX = dirX * 22.8;
    const endZ = -2.0 + dirZ * 22.8;
    const startY = citadelBaseY + 2.6;
    const endY = sampleZouHeight(endX, endZ) + 0.35;

    const dx = endX - startX;
    const dy = endY - startY;
    const dz = endZ - startZ;
    const len = Math.hypot(dx, dy, dz);
    const midX = (startX + endX) * 0.5;
    const midY = (startY + endY) * 0.5;
    const midZ = (startZ + endZ) * 0.5;
    const slopePitch = Math.atan2(-dy, Math.hypot(dx, dz));

    const chuteGroup = new THREE.Group();
    placeOnZouSphere(chuteGroup, midX, midY, midZ, globeRadius, -ang + Math.PI * 0.5);
    chuteGroup.rotateX(slopePitch);

    // Stone chute bed + side ledges
    const chuteBed = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.3 * S, 0.7 * S, len * S)),
      mokomoStoneMat
    );
    chuteGroup.add(chuteBed);

    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.32 * S, 1.15 * S, len * S)),
        mokomoStoneMat
      );
      curb.position.set(side * 1.05 * S, 0.3 * S, 0);
      chuteGroup.add(curb);
    }

    const waterRibbon = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(1.75 * S, len * S)),
      aqueductWaterMat
    );
    waterRibbon.rotation.x = -Math.PI * 0.5;
    waterRibbon.position.y = 0.42 * S;
    chuteGroup.add(waterRibbon);

    group.add(chuteGroup);
  }
  group.add(citadelGroup);

  // Dense Stepped Mokomo Sandstone Houses (InstancedMesh for smooth 60fps performance)
  const houseSpecs: { x: number; y: number; z: number; w: number; h: number; d: number; yaw: number }[] = [];
  for (let ring = 0; ring < 7; ring++) {
    const rad = 10.2 + ring * 2.05;
    const count = 16 + ring * 4;
    for (let k = 0; k < count; k++) {
      const ang = (k / count) * Math.PI * 2 + ring * 0.21;
      const hx = Math.cos(ang) * rad;
      const hz = 1.5 + Math.sin(ang) * rad * 0.94;
      // Leave forest opening behind citadel (north), keep clear of 4 aqueduct chutes & ravaged quarter
      if (hz < -5.5 && Math.abs(hx) < 12) continue;
      if (isPointInsideRavagedSector(hx, hz)) continue;
      const citAng = Math.atan2(hz + 2.0, hx);
      let nearChute = false;
      for (const ca of aqueductAngles) {
        if (Math.abs(citAng - ca) < 0.14 && Math.hypot(hx, hz + 2.0) < 23.5) {
          nearChute = true;
          break;
        }
      }
      if (nearChute) continue;

      const seed = ring * 100 + k;
      const w = 1.65 + seededRand(seed + 1) * 1.35;
      const d = 1.5 + seededRand(seed + 2) * 1.2;
      const h = 1.55 + seededRand(seed + 3) * 1.75;
      const hy = sampleZouHeight(hx, hz);
      houseSpecs.push({
        x: hx,
        y: hy,
        z: hz,
        w,
        h,
        d,
        yaw: -ang + (seededRand(seed + 4) - 0.5) * 0.4,
      });
    }
  }

  const unitBoxGeo = trackGeo(new THREE.BoxGeometry(S, S, S));
  const houseWallsInst = new THREE.InstancedMesh(
    unitBoxGeo,
    houseWallMat,
    houseSpecs.length
  );
  const houseRoofsInst = new THREE.InstancedMesh(
    unitBoxGeo,
    houseRoofMat,
    houseSpecs.length
  );
  for (let i = 0; i < houseSpecs.length; i++) {
    const hs = houseSpecs[i];
    placeOnZouSphere(_dummy, hs.x, hs.y + hs.h * 0.5 - 0.3, hs.z, globeRadius, hs.yaw);
    _dummy.scale.set(hs.w, hs.h, hs.d);
    _dummy.updateMatrix();
    houseWallsInst.setMatrixAt(i, _dummy.matrix);

    placeOnZouSphere(_dummy, hs.x, hs.y + hs.h - 0.15, hs.z, globeRadius, hs.yaw);
    _dummy.scale.set(hs.w + 0.16, 0.24, hs.d + 0.16);
    _dummy.updateMatrix();
    houseRoofsInst.setMatrixAt(i, _dummy.matrix);
  }
  houseWallsInst.instanceMatrix.needsUpdate = true;
  houseRoofsInst.instanceMatrix.needsUpdate = true;
  group.add(houseWallsInst);
  group.add(houseRoofsInst);

  // Luffy's Wooden Palm Lookout Platform (Image 4 foreground right)
  const deckGroup = new THREE.Group();
  const deckY = sampleZouHeight(ZOU_LANDMARKS.lookoutDeck.x, ZOU_LANDMARKS.lookoutDeck.z);
  placeOnZouSphere(
    deckGroup,
    ZOU_LANDMARKS.lookoutDeck.x,
    deckY + 0.6,
    ZOU_LANDMARKS.lookoutDeck.z,
    globeRadius,
    -0.55
  );
  const deckFloor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(7.2 * S, 0.45 * S, 5.4 * S)),
    timberDeckMat
  );
  deckGroup.add(deckFloor);
  for (const px of [-3.3, -1.1, 1.1, 3.3]) {
    const post = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.14 * S, 0.14 * S, 1.4 * S, 6)),
      trunkWoodMat
    );
    post.position.set(px * S, 0.8 * S, -2.45 * S);
    deckGroup.add(post);
  }
  const railBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.9 * S, 0.16 * S, 0.16 * S)),
    trunkWoodMat
  );
  railBar.position.set(0, 1.35 * S, -2.45 * S);
  deckGroup.add(railBar);

  // Slender palm tree standing beside the wooden lookout deck (Image 4)
  const palmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.9 * S, 0.1 * S, -1.8 * S),
    new THREE.Vector3(3.3 * S, 3.5 * S, -2.0 * S),
    new THREE.Vector3(3.8 * S, 7.2 * S, -2.2 * S),
  ]);
  const palmTrunk = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(palmCurve, 10, 0.24 * S, 7, false)),
    trunkWoodMat
  );
  deckGroup.add(palmTrunk);
  const palmFrondGeo = trackGeo(new THREE.ConeGeometry(0.85 * S, 3.4 * S, 5));
  for (let f = 0; f < 6; f++) {
    const fa = (f / 6) * Math.PI * 2;
    const frond = new THREE.Mesh(palmFrondGeo, canopyBrightMat);
    frond.position.set(3.8 * S, 7.3 * S, -2.2 * S);
    frond.rotation.z = Math.PI * 0.62;
    frond.rotation.y = fa;
    frond.translateY(-1.5 * S);
    deckGroup.add(frond);
  }
  group.add(deckGroup);

  // =========================================================================
  // 4. WHALE FOREST, GIANT WHALE TREE (ARBRE-BALEINE) & ROAD PONEGLYPH SHRINE
  // =========================================================================
  const whaleGroup = new THREE.Group();
  const whaleBaseY = sampleZouHeight(ZOU_LANDMARKS.whaleTree.x, ZOU_LANDMARKS.whaleTree.z);
  placeOnZouSphere(
    whaleGroup,
    ZOU_LANDMARKS.whaleTree.x,
    whaleBaseY - 1.2,
    ZOU_LANDMARKS.whaleTree.z,
    globeRadius,
    0
  );

  // Sculpted pale-bark Whale Body Trunk (head/body on left, thick rising crown column)
  const whaleBody = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(6.8 * S, 20, 16)),
    whaleBarkMat
  );
  whaleBody.position.set(-1.5 * S, 7.2 * S, 0);
  whaleBody.scale.set(1.22, 1.32, 0.96);
  whaleGroup.add(whaleBody);

  // Massive root buttresses gripping Whale Hill
  for (let r = 0; r < 5; r++) {
    const ra = (r / 5) * Math.PI * 2;
    const root = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.6 * S, 3.2 * S, 6.2 * S, 9)),
      whaleBarkMat
    );
    root.position.set(
      (-1.2 + Math.cos(ra) * 5.2) * S,
      2.6 * S,
      Math.sin(ra) * 4.6 * S
    );
    root.rotation.z = -Math.cos(ra) * 0.45;
    root.rotation.x = Math.sin(ra) * 0.45;
    whaleGroup.add(root);
  }

  // Upper vertical neck/trunk column supporting the colossal umbrella canopy
  const neckTrunk = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(4.4 * S, 5.6 * S, 14.5 * S, 16)),
    whaleBarkMat
  );
  neckTrunk.position.set(-2.2 * S, 17.5 * S, 0);
  whaleGroup.add(neckTrunk);

  // Sweeping Curved Whale Tail + Twin Flukes rising free on the right (+X) (Image 4 & 5)
  const whaleTailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.5 * S, 5.2 * S, 0),
    new THREE.Vector3(8.5 * S, 5.8 * S, 0),
    new THREE.Vector3(12.8 * S, 9.5 * S, 0),
    new THREE.Vector3(15.2 * S, 14.2 * S, 0),
  ]);
  const whaleTailGeo = trackGeo(new THREE.TubeGeometry(whaleTailCurve, 18, 2.9 * S, 10, false));
  const wtPos = whaleTailGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < wtPos.count; i++) {
    const ringIdx = Math.floor(i / 11);
    const t = Math.min(1, ringIdx / 18);
    const center = whaleTailCurve.getPoint(t);
    const sc = 1.25 - t * 0.72;
    wtPos.setXYZ(
      i,
      center.x + (wtPos.getX(i) - center.x) * sc,
      center.y + (wtPos.getY(i) - center.y) * sc,
      center.z + (wtPos.getZ(i) - center.z) * sc
    );
  }
  whaleTailGeo.computeVertexNormals();
  const whaleTailMesh = new THREE.Mesh(whaleTailGeo, whaleBarkMat);
  whaleGroup.add(whaleTailMesh);

  // Twin whale tail flukes flaring into the sky
  const flukeGeo = trackGeo(new THREE.ConeGeometry(2.3 * S, 5.6 * S, 6));
  const flukeLeft = new THREE.Mesh(flukeGeo, whaleBarkMat);
  flukeLeft.position.set(14.1 * S, 15.6 * S, -1.6 * S);
  flukeLeft.rotation.set(-0.55, 0.15, 0.35);
  flukeLeft.scale.set(0.45, 1.0, 1.2);
  whaleGroup.add(flukeLeft);

  const flukeRight = new THREE.Mesh(flukeGeo, whaleBarkMat);
  flukeRight.position.set(16.3 * S, 15.6 * S, 1.6 * S);
  flukeRight.rotation.set(0.55, -0.15, -0.35);
  flukeRight.scale.set(0.45, 1.0, 1.2);
  whaleGroup.add(flukeRight);

  // Colossal Layered Emerald Umbrella Canopy atop the Whale Tree
  const canopyDisks: [number, number, number, number, number, number][] = [
    [-2.5, 25.5, 0.0, 13.5, 4.4, 0],
    [-9.2, 24.4, 1.8, 8.8, 3.6, 1],
    [5.2, 24.6, -1.2, 8.6, 3.6, 1],
    [-2.2, 27.6, -3.5, 9.4, 3.8, 2],
    [-1.8, 27.2, 4.2, 9.2, 3.8, 0],
    [-12.5, 23.2, -2.4, 6.5, 2.8, 2],
    [7.8, 23.4, 2.6, 6.2, 2.8, 0],
  ];
  for (const [cx, cy, cz, cr, ch, matIdx] of canopyDisks) {
    const mat =
      matIdx === 0
        ? canopyEmeraldMat
        : matIdx === 1
          ? canopyBrightMat
          : canopyDeepMat;
    const dome = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(cr * S, 18, 12)),
      mat
    );
    dome.position.set(cx * S, cy * S, cz * S);
    dome.scale.set(1.15, ch / cr, 1.02);
    whaleGroup.add(dome);
  }
  group.add(whaleGroup);

  // Hidden Road Poneglyph Shrine tucked at the front root base of the Whale Tree
  const shrineY = sampleZouHeight(
    ZOU_LANDMARKS.roadPoneglyphShrine.x,
    ZOU_LANDMARKS.roadPoneglyphShrine.z
  );
  const shrineGroup = new THREE.Group();
  placeOnZouSphere(
    shrineGroup,
    ZOU_LANDMARKS.roadPoneglyphShrine.x,
    shrineY,
    ZOU_LANDMARKS.roadPoneglyphShrine.z,
    globeRadius,
    0
  );
  const shrineArch = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.6 * S, 3.2 * S, 2.6 * S)),
    mokomoStoneMat
  );
  shrineArch.position.y = 1.4 * S;
  shrineGroup.add(shrineArch);
  const roadPoneglyph = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.4 * S, 1.5 * S, 1.4 * S)),
    poneglyphMat
  );
  roadPoneglyph.position.set(0, 1.15 * S, 0.95 * S);
  shrineGroup.add(roadPoneglyph);
  group.add(shrineGroup);

  // Dense Whale Forest Jungle Canopy & Signature Lollipop Trees (InstancedMesh)
  const treePositions: { x: number; y: number; z: number; r: number; h: number; tallLollipop: boolean }[] = [];
  for (let i = 0; i < 240; i++) {
    const ang = seededRand(i * 13 + 3) * Math.PI * 2;
    const radN = 0.44 + seededRand(i * 17 + 9) * 0.48;
    const tx = Math.cos(ang) * radN * 48.0;
    const tz = Math.sin(ang) * radN * 42.0;
    const distCit = Math.hypot(tx, tz - 1.5);
    if (distCit < 22.8 && tz > -8.0) continue;
    if (isPointInsideRavagedSector(tx, tz)) continue;
    // Keep street-view corridors open for Citadel, Whale Tree, and Ravaged Quarter
    if (tx < -5 && tz > 6 && tx > -36 && tz < 36) continue;
    if (tx > -4 && tx < 34 && tz > -20 && tz < 10) continue;
    if (Math.abs(tx) < 10 && tz > 18 && tz < 44) continue;
    if (Math.hypot(tx, tz + 19.0) < 7.2) continue;
    // Keep away from monolith footprints
    let nearMono = false;
    for (const m of ZOU_MONOLITHS) {
      if (Math.hypot(tx - m.x, tz - m.z) < 8.5) {
        nearMono = true;
        break;
      }
    }
    if (nearMono) continue;

    const ty = sampleZouHeight(tx, tz);
    const tallLollipop = i % 7 === 0;
    treePositions.push({
      x: tx,
      y: ty,
      z: tz,
      r: tallLollipop ? 2.4 + seededRand(i + 5) * 1.1 : 2.1 + seededRand(i + 5) * 1.7,
      h: tallLollipop ? 7.0 + seededRand(i + 8) * 3.5 : 3.0 + seededRand(i + 8) * 2.2,
      tallLollipop,
    });
  }

  const trunkCylGeo = trackGeo(new THREE.CylinderGeometry(0.24 * S, 0.38 * S, S, 7));
  const crownSphGeo = trackGeo(new THREE.SphereGeometry(S, 10, 8));
  const forestTrunks = new THREE.InstancedMesh(
    trunkCylGeo,
    trunkWoodMat,
    treePositions.length
  );
  const forestCrowns = new THREE.InstancedMesh(
    crownSphGeo,
    canopyEmeraldMat,
    treePositions.length
  );
  for (let i = 0; i < treePositions.length; i++) {
    const tp = treePositions[i];
    placeOnZouSphere(_dummy, tp.x, tp.y + tp.h * 0.45, tp.z, globeRadius, 0);
    _dummy.scale.set(1, tp.h, 1);
    _dummy.updateMatrix();
    forestTrunks.setMatrixAt(i, _dummy.matrix);

    placeOnZouSphere(_dummy, tp.x, tp.y + tp.h * 0.92, tp.z, globeRadius, 0);
    _dummy.scale.set(tp.r, tp.r * (tp.tallLollipop ? 0.95 : 0.78), tp.r);
    _dummy.updateMatrix();
    forestCrowns.setMatrixAt(i, _dummy.matrix);
  }
  forestTrunks.instanceMatrix.needsUpdate = true;
  forestCrowns.instanceMatrix.needsUpdate = true;
  group.add(forestTrunks);
  group.add(forestCrowns);

  // 3 Waterfalls pouring off Whale Hill & Plateau Cliff Rim
  const waterfallFoamPlumes: THREE.Mesh[] = [];
  const waterfallSpecs: [number, number, number, number, number][] = [
    [-16, -24, -18, -12, 0.25],
    [16, -23, 18, -11, -0.25],
    [-46, -15, -51, -17, 1.7],
  ];
  for (let i = 0; i < waterfallSpecs.length; i++) {
    const [sx, sz, ex, ez, yaw] = waterfallSpecs[i];
    const sy = sampleZouHeight(sx, sz) + 1.0;
    const ey = i === 2 ? ZOU_BACK_DECK_Y - 12.0 : sampleZouHeight(ex, ez);
    const len = Math.hypot(ex - sx, sy - ey, ez - sz);
    const wf = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(2.2 * S, len * S)),
      waterfallMat
    );
    placeOnZouSphere(
      wf,
      (sx + ex) * 0.5,
      (sy + ey) * 0.5,
      (sz + ez) * 0.5,
      globeRadius,
      yaw
    );
    wf.rotateX(-0.55);
    group.add(wf);

    const plume = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(2.1 * S, 10, 8)),
      seaFoamMat
    );
    placeOnZouSphere(plume, ex, ey + 0.6, ez, globeRadius, 0);
    plume.scale.set(1.3, 0.55, 1.3);
    group.add(plume);
    waterfallFoamPlumes.push(plume);
  }

  // =========================================================================
  // 5. RAVAGED BATTLE QUARTER & LINGERING VIOLET KORO GAS
  // =========================================================================
  const rubbleSpecs: [number, number, number, number, number, number][] = [
    [-16, 15, 3.2, 2.2, 2.6, 0.4],
    [-21, 19, 3.6, 1.8, 2.4, -0.5],
    [-13, 21, 2.8, 2.4, 2.2, 0.9],
    [-24, 15, 2.4, 1.4, 2.0, -0.8],
    [-18, 24, 3.0, 1.6, 2.8, 0.25],
    [-26, 22, 4.4, 2.6, 2.2, 0.6], // Breached outer gate ruin
  ];
  for (const [rx, rz, rw, rh, rd, tilt] of rubbleSpecs) {
    const ry = sampleZouHeight(rx, rz);
    const ruin = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(rw * S, rh * S, rd * S)),
      ruinedStoneMat
    );
    placeOnZouSphere(ruin, rx, ry + rh * 0.32, rz, globeRadius, tilt);
    ruin.rotateZ(tilt * 0.42);
    ruin.rotateX(tilt * 0.24);
    group.add(ruin);
  }
  // Scattered angular masonry debris blocks
  for (let i = 0; i < 24; i++) {
    const rx = -25 + seededRand(i * 19 + 1) * 16;
    const rz = 11 + seededRand(i * 23 + 3) * 16;
    const ry = sampleZouHeight(rx, rz);
    const debris = new THREE.Mesh(
      trackGeo(new THREE.DodecahedronGeometry((0.45 + seededRand(i + 9) * 0.6) * S, 0)),
      ruinedStoneMat
    );
    placeOnZouSphere(debris, rx, ry + 0.3, rz, globeRadius, i * 0.8);
    group.add(debris);
  }

  // Animated Violet Koro Toxic Mist Clouds in the Ravaged Quarter
  const koroGasClouds: {
    mesh: THREE.Mesh;
    baseX: number;
    baseY: number;
    baseZ: number;
    phase: number;
  }[] = [];
  const koroPlaneGeo = trackGeo(new THREE.PlaneGeometry(8.5 * S, 5.8 * S));
  for (let i = 0; i < 12; i++) {
    const kx = -24 + seededRand(i * 29 + 2) * 14;
    const kz = 12 + seededRand(i * 31 + 5) * 14;
    const ky = sampleZouHeight(kx, kz) + 2.2 + (i % 3) * 1.1;
    const cloud = new THREE.Mesh(koroPlaneGeo, koroGasMat);
    placeOnZouSphere(cloud, kx, ky, kz, globeRadius, i * 0.52);
    group.add(cloud);
    koroGasClouds.push({ mesh: cloud, baseX: kx, baseY: ky, baseZ: kz, phase: i * 0.85 });
  }

  // =========================================================================
  // 6. POST-RAIN RAINBOW ARCH & ANIMATED ERUPTION RAIN (PLUIES D'ÉRUPTION)
  // =========================================================================
  // Vivid Rainbow Arch framing the Whale Tree & Monoliths (Images 2 & 5)
  const rainbowCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-42, ZOU_BACK_DECK_Y + 4.0, -4),
    new THREE.Vector3(-24, ZOU_BACK_DECK_Y + 42.0, -14),
    new THREE.Vector3(0, ZOU_BACK_DECK_Y + 54.0, -18),
    new THREE.Vector3(24, ZOU_BACK_DECK_Y + 42.0, -14),
    new THREE.Vector3(42, ZOU_BACK_DECK_Y + 4.0, -4),
  ]);
  const rainbowArcGeo = trackGeo(
    new THREE.TubeGeometry(rainbowCurve, 44, 3.6, 6, false)
  );
  // Flatten tube into a ribbon facing outward/south and project onto globe frame
  const rbPos = rainbowArcGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < rbPos.count; i++) {
    const ringIdx = Math.floor(i / 7);
    const t = Math.min(1, ringIdx / 44);
    const center = rainbowCurve.getPoint(t);
    const offX = rbPos.getX(i) - center.x;
    const offY = rbPos.getY(i) - center.y;
    const offZ = rbPos.getZ(i) - center.z;
    const sp = toZouSphereLocal(
      center.x + offX * 0.65,
      center.y + offY * 1.15,
      center.z + offZ * 0.16,
      globeRadius
    );
    rbPos.setXYZ(i, sp.x, sp.y, sp.z);
  }
  rainbowArcGeo.computeVertexNormals();
  const rainbowMesh = new THREE.Mesh(rainbowArcGeo, rainbowMat);
  group.add(rainbowMesh);

  // Arching Seawater Spout Plume from Zunesha's Trunk sweeping high toward the northern forest
  const spoutCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-130, 58, 0),
    new THREE.Vector3(-106, 98, -6),
    new THREE.Vector3(-62, 124, -14),
    new THREE.Vector3(-16, 112, -22),
    new THREE.Vector3(16, 88, -24),
  ]);
  const spoutGeo = trackGeo(new THREE.TubeGeometry(spoutCurve, 32, 2.5, 10, false));
  const spAttr = spoutGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < spAttr.count; i++) {
    const ringIdx = Math.floor(i / 11);
    const t = Math.min(1, ringIdx / 32);
    const c = spoutCurve.getPoint(t);
    const flare = 0.42 + t * 1.45;
    const sp = toZouSphereLocal(
      c.x + (spAttr.getX(i) - c.x) * flare,
      c.y + (spAttr.getY(i) - c.y) * flare,
      c.z + (spAttr.getZ(i) - c.z) * flare,
      globeRadius
    );
    spAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  spoutGeo.computeVertexNormals();
  const eruptionSpoutMesh = new THREE.Mesh(spoutGeo, eruptionSpoutMat);
  group.add(eruptionSpoutMesh);

  // Delicate Falling Eruption Rain Streaks across the plateau (InstancedMesh, zero GC in update)
  const rainCount = 140;
  const rainGeo = trackGeo(new THREE.BoxGeometry(0.048 * S, 2.5 * S, 0.048 * S));
  const rainInst = new THREE.InstancedMesh(rainGeo, rainStreakMat, rainCount);
  const rainDrops: { x: number; z: number; yOff: number; speed: number }[] = [];
  for (let i = 0; i < rainCount; i++) {
    const ang = seededRand(i * 41 + 3) * Math.PI * 2;
    const rad = Math.sqrt(seededRand(i * 43 + 7)) * 46.0;
    const rx = Math.cos(ang) * rad;
    const rz = Math.sin(ang) * rad * 0.88;
    const yOff = seededRand(i * 47 + 11) * 44.0;
    const speed = 28.0 + seededRand(i * 53 + 13) * 16.0;
    rainDrops.push({ x: rx, z: rz, yOff, speed });
    placeOnZouSphere(
      _dummy,
      rx,
      ZOU_BACK_DECK_Y + 4.0 + yOff,
      rz,
      globeRadius,
      0
    );
    _dummy.rotateZ(0.14);
    _dummy.updateMatrix();
    rainInst.setMatrixAt(i, _dummy.matrix);
  }
  rainInst.instanceMatrix.needsUpdate = true;
  group.add(rainInst);

  // =========================================================================
  // 7. ZERO-GC RUNTIME ANIMATION LOOP
  // =========================================================================
  let elapsedTime = 0;

  const update = (dt: number) => {
    elapsedTime += dt;

    // Gentle eternal walking sway of Zunesha's head & trunk
    trunkPivot.rotation.z = Math.sin(elapsedTime * 0.72) * 0.09;
    trunkPivot.rotation.y = Math.cos(elapsedTime * 0.48) * 0.05;
    headGroup.rotation.z = Math.sin(elapsedTime * 0.42) * 0.025;
    tailMesh.rotation.x = Math.sin(elapsedTime * 1.1) * 0.07;

    // Aqueduct & waterfall scrolling cyan water
    aqueductWaterTex.offset.y -= dt * 0.85;

    // Sea-foam pulsing around Zunesha's 4 colossal ocean legs
    for (let i = 0; i < legFoamRings.length; i++) {
      const pulse = 1.0 + 0.1 * Math.sin(elapsedTime * 2.2 + i * 1.5);
      legFoamRings[i].scale.set(pulse, pulse, 1.0);
    }

    // Waterfall mist plumes
    for (let i = 0; i < waterfallFoamPlumes.length; i++) {
      const s = 1.0 + 0.12 * Math.sin(elapsedTime * 3.4 + i * 1.3);
      waterfallFoamPlumes[i].scale.set(1.3 * s, 0.55 * s, 1.3 * s);
    }

    // Drifting clouds around Zunesha's belly & legs
    for (let i = 0; i < driftingClouds.length; i++) {
      const dc = driftingClouds[i];
      const driftX = dc.baseX + Math.sin(elapsedTime * dc.speed + dc.phase) * 5.5;
      const driftY = dc.baseY + Math.cos(elapsedTime * dc.speed * 0.8 + dc.phase) * 1.4;
      placeOnZouSphere(dc.group, driftX, driftY, dc.baseZ, globeRadius, dc.phase);
    }

    // Swirling violet Koro toxic mist
    for (let i = 0; i < koroGasClouds.length; i++) {
      const kg = koroGasClouds[i];
      const wx = kg.baseX + Math.sin(elapsedTime * 0.65 + kg.phase) * 1.8;
      const wy = kg.baseY + Math.cos(elapsedTime * 0.8 + kg.phase) * 0.55;
      placeOnZouSphere(kg.mesh, wx, wy, kg.baseZ, globeRadius, elapsedTime * 0.15 + kg.phase);
    }

    // Eruption Rain (Pluies d'Éruption) spout + rain fall + post-rain rainbow shimmer
    const eruptionWave = 0.5 + 0.5 * Math.sin(elapsedTime * 0.55);
    eruptionSpoutMat.opacity = 0.18 + eruptionWave * 0.34;
    rainStreakMat.opacity = 0.12 + eruptionWave * 0.24;
    rainbowMat.opacity = 0.64 + (1.0 - eruptionWave * 0.4) * 0.28;

    for (let i = 0; i < rainDrops.length; i++) {
      const rd = rainDrops[i];
      const fallY =
        ZOU_BACK_DECK_Y +
        2.5 +
        ((rd.yOff - elapsedTime * rd.speed) % 44.0 + 44.0) % 44.0;
      placeOnZouSphere(_dummy, rd.x, fallY, rd.z, globeRadius, 0);
      _dummy.rotateZ(0.14);
      _dummy.updateMatrix();
      rainInst.setMatrixAt(i, _dummy.matrix);
    }
    rainInst.instanceMatrix.needsUpdate = true;
  };

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update,
  };
}
