import * as THREE from 'three';
import type { IslandMeshContext, IslandMeshInstance } from './types';
import {
  SEDUCING_WOODS_CENTER,
  SWEET_CITY_CENTER,
  TOTTO_LAND_GLOBE_SCALE,
  TOTTO_LAND_LANDMARKS,
  TOTTO_LAND_WORLD_SIZE,
  WHOLE_CAKE_CHATEAU_BASE_Y,
  WHOLE_CAKE_CHATEAU_CENTER,
  sampleTottoLandHeight,
  toTottoLandSphereLocal,
} from '../utils/tottoLandTerrain';
import {
  createDiagonalCandyTexture,
  createPolkaDotCakeTexture,
  createTottoLandTerrainTexture,
  createVerticalStripeTexture,
  createWaffleConeTexture,
} from './tottoLandTextures';
import { buildTottoLandPeripheralWorld } from './tottoLandPeripheral';

const S = TOTTO_LAND_GLOBE_SCALE;

// Reusable scratch objects (zero GC in update loop)
const _up = new THREE.Vector3(0, 1, 0);
const _yAxis = new THREE.Vector3(0, 1, 0);
const _localNormal = new THREE.Vector3();
const _tiltQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();

function placeOnTottoLandSphere(
  obj: THREE.Object3D,
  lx: number,
  ly: number,
  lz: number,
  globeRadius: number,
  yaw = 0
): void {
  const sp = toTottoLandSphereLocal(lx, ly, lz, globeRadius);
  obj.position.set(sp.x, sp.y, sp.z);
  _localNormal.set(sp.x, globeRadius + sp.y, sp.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance {
  const { globeRadius, trackGeo, trackMat } = ctx;
  const trackTex = ctx.trackTex ?? (<T extends THREE.Texture>(t: T): T => t);
  const group = new THREE.Group();
  group.name = 'custom-totto-land';

  const place = (
    obj: THREE.Object3D,
    lx: number,
    ly: number,
    lz: number,
    yaw = 0
  ) => placeOnTottoLandSphere(obj, lx, ly, lz, globeRadius, yaw);

  // =========================================================================
  // 1. SPHERICAL-CURVED 35-ISLAND ARCHIPELAGO TERRAIN MESH (176x176)
  // =========================================================================
  const terrainSegs = 176;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(
      TOTTO_LAND_WORLD_SIZE,
      TOTTO_LAND_WORLD_SIZE,
      terrainSegs,
      terrainSegs
    )
  );
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const h = sampleTottoLandHeight(lx, lz);
    const sp = toTottoLandSphereLocal(lx, h, lz, globeRadius);
    posAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createTottoLandTerrainTexture(1024)),
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.03,
      transparent: true,
      alphaTest: 0.04,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  group.add(terrainMesh);

  // =========================================================================
  // 3. SHARED PATISSERIE & HOMIE PBR MATERIALS + GEOMETRIES
  // =========================================================================
  const creamMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfff8fb, roughness: 0.45 })
  );
  const pinkIcingMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.44 })
  );
  const hotPinkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.46 })
  );
  const chocolateMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4e2718, roughness: 0.62 })
  );
  const milkChocMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7c3f26, roughness: 0.58 })
  );
  const biscuitMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe6b16a, roughness: 0.74 })
  );
  const caramelMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.46 })
  );
  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.3,
      metalness: 0.55,
    })
  );
  const cherryMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.32 })
  );
  const orangeMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.42 })
  );
  const mintMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.46 })
  );
  const berryMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.46 })
  );
  const treeBarkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5b3a24, roughness: 0.9 })
  );
  const treeLeafMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x2d8a47, roughness: 0.78 })
  );
  const darkWindowMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35 })
  );
  const timberPierMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xc2854c, roughness: 0.8 })
  );
  const candleFlameMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf97316,
      emissiveIntensity: 1.55,
      roughness: 0.25,
    })
  );
  const candyStripeMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createDiagonalCandyTexture('#ffffff', '#f43f5e')),
      roughness: 0.42,
    })
  );
  const waffleMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createWaffleConeTexture()),
      roughness: 0.68,
    })
  );
  const pinkDotsMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createPolkaDotCakeTexture('#f472b6', '#be185d')),
      roughness: 0.5,
    })
  );
  const apricotDotsMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createPolkaDotCakeTexture('#fdba74', '#ea580c')),
      roughness: 0.5,
    })
  );
  const purpleStripeMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createVerticalStripeTexture('#7e22ce', '#f3e8ff', 14, true)),
      roughness: 0.48,
    })
  );
  const roseStripeMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createVerticalStripeTexture('#f43f5e', '#ffe4e6', 14, true)),
      roughness: 0.5,
    })
  );

  const boxGeo = trackGeo(new THREE.BoxGeometry(1 * S, 1 * S, 1 * S));
  const cylGeo = trackGeo(new THREE.CylinderGeometry(1 * S, 1 * S, 1 * S, 24));
  const coneGeo = trackGeo(new THREE.ConeGeometry(1 * S, 1 * S, 14));
  const sphereGeo = trackGeo(new THREE.SphereGeometry(1 * S, 14, 12));
  const domeGeo = trackGeo(
    new THREE.SphereGeometry(1 * S, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.54)
  );
  const torusGeo = trackGeo(new THREE.TorusGeometry(1 * S, 0.22 * S, 8, 24));

  // Animated handles
  const candleFlames: THREE.Mesh[] = [];
  const hotAirBalloons: { group: THREE.Group; baseY: number; phase: number }[] = [];

  // =========================================================================
  // 4. WHOLE CAKE CHATEAU — TOWERING WEDDING CAKE PALACE (wale_cake_75fc46e8 / 3 / 4)
  // =========================================================================
  const chateau = new THREE.Group();
  chateau.name = 'whole-cake-chateau';
  place(
    chateau,
    WHOLE_CAKE_CHATEAU_CENTER.x,
    WHOLE_CAKE_CHATEAU_BASE_Y - 0.5,
    WHOLE_CAKE_CHATEAU_CENTER.z,
    0
  );

  // Main stacked wedding-cake tiers
  const tiers: readonly {
    r: number;
    h: number;
    y: number;
    mat: THREE.Material;
    trimMat: THREE.Material;
  }[] = [
    { r: 15.8, h: 7.2, y: 0, mat: pinkDotsMat, trimMat: creamMat },
    { r: 12.6, h: 6.4, y: 7.2, mat: roseStripeMat, trimMat: creamMat },
    { r: 9.8, h: 6.2, y: 13.6, mat: purpleStripeMat, trimMat: creamMat },
    { r: 6.8, h: 5.4, y: 19.8, mat: pinkIcingMat, trimMat: creamMat },
    { r: 4.5, h: 4.2, y: 25.2, mat: purpleStripeMat, trimMat: creamMat },
  ];

  for (let t = 0; t < tiers.length; t++) {
    const tier = tiers[t];
    const body = new THREE.Mesh(cylGeo, tier.mat);
    body.scale.set(tier.r, tier.h, tier.r);
    body.position.y = (tier.y + tier.h * 0.5) * S;
    chateau.add(body);

    // Dripping cream icing rim torus around top of each tier
    const icingRim = new THREE.Mesh(torusGeo, tier.trimMat);
    icingRim.scale.set(tier.r * 1.01, tier.r * 1.01, 2.1);
    icingRim.rotation.x = Math.PI / 2;
    icingRim.position.y = (tier.y + tier.h) * S;
    chateau.add(icingRim);

    // Top flat white cream disk
    const cap = new THREE.Mesh(cylGeo, tier.trimMat);
    cap.scale.set(tier.r * 1.02, 0.55, tier.r * 1.02);
    cap.position.y = (tier.y + tier.h) * S;
    chateau.add(cap);

    // Decorative fruit/candy droplets ringing each tier ledge
    const berryCount = 10 - t;
    for (let b = 0; b < berryCount; b++) {
      const a = (b / berryCount) * Math.PI * 2 + t * 0.4;
      const dot = new THREE.Mesh(
        sphereGeo,
        b % 3 === 0 ? cherryMat : b % 3 === 1 ? berryMat : goldMat
      );
      dot.scale.setScalar(0.62);
      dot.position.set(
        Math.cos(a) * (tier.r - 0.35) * S,
        (tier.y + tier.h + 0.55) * S,
        Math.sin(a) * (tier.r - 0.35) * S
      );
      chateau.add(dot);
    }
  }

  // Iconic Crown Cupcake Spire atop the Chateau (wale_cake_75fc46e8.JPG)
  const crownBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(3.5 * S, 2.6 * S, 4.6 * S, 16)),
    biscuitMat
  );
  crownBase.position.y = 31.7 * S;
  chateau.add(crownBase);

  const crownCream = new THREE.Mesh(domeGeo, creamMat);
  crownCream.scale.set(3.9, 3.2, 3.9);
  crownCream.position.y = 33.8 * S;
  chateau.add(crownCream);

  const crownSwirl = new THREE.Mesh(coneGeo, pinkIcingMat);
  crownSwirl.scale.set(2.2, 4.4, 2.2);
  crownSwirl.position.y = 37.8 * S;
  chateau.add(crownSwirl);

  const crownCherry = new THREE.Mesh(sphereGeo, cherryMat);
  crownCherry.scale.setScalar(0.95);
  crownCherry.position.y = 40.1 * S;
  chateau.add(crownCherry);

  // Helper to place giant striped lit birthday candles on the Chateau
  const addChateauCandle = (
    ox: number,
    oy: number,
    oz: number,
    rad: number,
    h: number
  ) => {
    const cg = new THREE.Group();
    cg.position.set(ox * S, oy * S, oz * S);
    const stick = new THREE.Mesh(cylGeo, candyStripeMat);
    stick.scale.set(rad, h, rad);
    stick.position.y = h * 0.5 * S;
    cg.add(stick);

    const flame = new THREE.Mesh(coneGeo, candleFlameMat);
    flame.scale.set(rad * 1.15, rad * 3.1, rad * 1.15);
    flame.position.y = (h + rad * 1.65) * S;
    cg.add(flame);
    candleFlames.push(flame);
    chateau.add(cg);
  };

  // Ring of tall candles on Tier 2, Tier 3 & Crown (matching reference!)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.35;
    addChateauCandle(Math.cos(a) * 11.2, 13.6, Math.sin(a) * 11.2, 0.72, 7.6);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    addChateauCandle(Math.cos(a) * 5.8, 25.2, Math.sin(a) * 5.8, 0.62, 7.4);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    addChateauCandle(Math.cos(a) * 3.6, 29.4, Math.sin(a) * 3.6, 0.52, 6.2);
  }

  // Flanking Polka-Dot & Fruit-Cake Castle Wings (wale_cake3_b341c3ce / wale_cake4_4262133a)
  // West Wing: Pink Polka-Dot Cake Tower
  const westWing = new THREE.Mesh(cylGeo, pinkDotsMat);
  westWing.scale.set(7.4, 10.6, 7.4);
  westWing.position.set(-14.0 * S, 5.3 * S, 1.5 * S);
  chateau.add(westWing);
  const westWingTop = new THREE.Mesh(domeGeo, creamMat);
  westWingTop.scale.set(7.6, 2.8, 7.6);
  westWingTop.position.set(-14.0 * S, 10.4 * S, 1.5 * S);
  chateau.add(westWingTop);
  addChateauCandle(-14.0, 12.6, 1.5, 0.75, 5.8);

  // Back-West Tall Chocolate Fudge Tower
  const fudgeTower = new THREE.Mesh(cylGeo, chocolateMat);
  fudgeTower.scale.set(4.5, 16.5, 4.5);
  fudgeTower.position.set(-11.5 * S, 8.2 * S, -11.0 * S);
  chateau.add(fudgeTower);
  const fudgeCream = new THREE.Mesh(domeGeo, creamMat);
  fudgeCream.scale.set(4.8, 2.4, 4.8);
  fudgeCream.position.set(-11.5 * S, 16.4 * S, -11.0 * S);
  chateau.add(fudgeCream);
  addChateauCandle(-11.5, 18.2, -11.0, 0.65, 5.2);

  // East Wing: Apricot Polka-Dot & Giant Fruit-Cake Pavilion
  const eastWing = new THREE.Mesh(cylGeo, apricotDotsMat);
  eastWing.scale.set(8.0, 9.8, 8.0);
  eastWing.position.set(14.5 * S, 4.9 * S, 2.0 * S);
  chateau.add(eastWing);
  const eastFruitCap = new THREE.Mesh(cylGeo, creamMat);
  eastFruitCap.scale.set(8.2, 1.2, 8.2);
  eastFruitCap.position.set(14.5 * S, 10.0 * S, 2.0 * S);
  chateau.add(eastFruitCap);
  const fruitCone = new THREE.Mesh(coneGeo, candyStripeMat);
  fruitCone.scale.set(2.4, 4.2, 2.4);
  fruitCone.position.set(14.5 * S, 12.6 * S, 2.0 * S);
  chateau.add(fruitCone);
  // Giant Citrus Orange Wedges, Melon & Berries crowning East Wing
  for (let f = 0; f < 6; f++) {
    const a = (f / 6) * Math.PI * 2;
    const fruit = new THREE.Mesh(
      sphereGeo,
      f % 3 === 0 ? orangeMat : f % 3 === 1 ? cherryMat : mintMat
    );
    fruit.scale.set(1.4, 1.8, 1.1);
    fruit.position.set(
      (14.5 + Math.cos(a) * 5.4) * S,
      11.5 * S,
      (2.0 + Math.sin(a) * 5.4) * S
    );
    chateau.add(fruit);
  }

  // Grand Royal Front Gatehouse + Candy-Cane Pillars + Cream Staircase Cascade
  const gateFrame = new THREE.Mesh(boxGeo, goldMat);
  gateFrame.scale.set(7.6, 8.2, 3.4);
  gateFrame.position.set(0, 4.1 * S, 15.6 * S);
  chateau.add(gateFrame);
  const gateDoors = new THREE.Mesh(boxGeo, chocolateMat);
  gateDoors.scale.set(4.6, 5.8, 3.65);
  gateDoors.position.set(0, 2.9 * S, 15.65 * S);
  chateau.add(gateDoors);
  for (const sx of [-4.2, 4.2]) {
    const pillar = new THREE.Mesh(cylGeo, candyStripeMat);
    pillar.scale.set(0.95, 10.8, 0.95);
    pillar.position.set(sx * S, 5.4 * S, 16.5 * S);
    chateau.add(pillar);
    const orb = new THREE.Mesh(sphereGeo, cherryMat);
    orb.scale.setScalar(1.0);
    orb.position.set(sx * S, 11.2 * S, 16.5 * S);
    chateau.add(orb);
  }

  // Stepped Whipped-Cream Grand Staircase descending South toward Sweet City
  for (let st = 0; st < 8; st++) {
    const stair = new THREE.Mesh(boxGeo, creamMat);
    stair.scale.set(6.8 + st * 0.45, 0.95, 2.2);
    stair.position.set(0, (3.2 - st * 0.72) * S, (17.5 + st * 1.45) * S);
    chateau.add(stair);
  }

  group.add(chateau);

  // =========================================================================
  // 5. FOUR ARCHED CANDY BRIDGES (CHATEAU MOAT, JUICE RIVER, SEDUCING CAUSEWAY)
  // =========================================================================
  const addCandyBridge = (
    lx: number,
    ly: number,
    lz: number,
    length: number,
    width: number,
    archH: number,
    yaw: number,
    deckMat: THREE.Material
  ) => {
    const bg = new THREE.Group();
    place(bg, lx, ly, lz, yaw);
    const segments = 7;
    for (let k = 0; k < segments; k++) {
      const t = k / (segments - 1);
      const px = (t - 0.5) * length;
      const py = Math.sin(t * Math.PI) * archH;
      const slope = Math.cos(t * Math.PI) * (archH / length) * 2.2;
      const plank = new THREE.Mesh(boxGeo, deckMat);
      plank.scale.set(length / segments + 0.35, 0.65, width);
      plank.position.set(px * S, py * S, 0);
      plank.rotation.z = slope;
      bg.add(plank);
    }
    for (const side of [-1, 1]) {
      for (let p = 0; p < 5; p++) {
        const t = p / 4;
        const px = (t - 0.5) * length;
        const py = Math.sin(t * Math.PI) * archH + 0.9;
        const post = new THREE.Mesh(cylGeo, candyStripeMat);
        post.scale.set(0.24, 1.4, 0.24);
        post.position.set(px * S, py * S, side * (width * 0.45) * S);
        bg.add(post);
      }
    }
    group.add(bg);
  };

  // West Moat Bridge (Chateau -> Seducing Woods)
  addCandyBridge(
    TOTTO_LAND_LANDMARKS.chateauWestBridge.x,
    7.6,
    TOTTO_LAND_LANDMARKS.chateauWestBridge.z,
    14.5,
    3.6,
    2.2,
    0,
    creamMat
  );
  // East Moat Bridge (Chateau -> Parfait Cape)
  addCandyBridge(
    TOTTO_LAND_LANDMARKS.chateauEastBridge.x,
    7.8,
    TOTTO_LAND_LANDMARKS.chateauEastBridge.z,
    14.5,
    3.6,
    2.0,
    0,
    creamMat
  );
  // Sweet City Arched Yellow-and-Pink Candy Bridge over the Orange Juice River!
  addCandyBridge(
    TOTTO_LAND_LANDMARKS.sweetCityJuiceBridge.x,
    5.4,
    TOTTO_LAND_LANDMARKS.sweetCityJuiceBridge.z,
    9.5,
    3.8,
    2.1,
    Math.PI * 0.5,
    goldMat
  );
  // Seducing Woods Southern Causeway Bridge
  addCandyBridge(
    TOTTO_LAND_LANDMARKS.seducingCausewayBridge.x,
    6.4,
    TOTTO_LAND_LANDMARKS.seducingCausewayBridge.z,
    13.5,
    3.4,
    1.2,
    0.18,
    biscuitMat
  );

  // =========================================================================
  // 6. SWEET CITY — HARBOR QUAY, CANDY BUILDINGS, CONE TURRETS, FERRIS WHEEL & BALLOONS
  // =========================================================================
  // Crescent Timber/Biscuit Harbor Piers + Moored Harbor Boats
  const pierSpecs: readonly [number, number, number, number][] = [
    [4.0, 56.5, 9.5, 0.42],
    [11.0, 62.5, 10.5, 0.22],
    [18.0, 65.0, 11.0, 0.0],
    [25.5, 62.5, 10.5, -0.22],
    [32.5, 56.5, 9.5, -0.44],
  ];
  for (const [px, pz, len, yaw] of pierSpecs) {
    const pier = new THREE.Group();
    place(pier, px, 1.0, pz, yaw);
    const deck = new THREE.Mesh(boxGeo, timberPierMat);
    deck.scale.set(2.8, 0.45, len);
    pier.add(deck);
    for (let k = -1; k <= 1; k++) {
      for (const sx of [-1.1, 1.1]) {
        const post = new THREE.Mesh(cylGeo, biscuitMat);
        post.scale.set(0.22, 2.2, 0.22);
        post.position.set(sx * S, -0.6 * S, k * (len * 0.35) * S);
        pier.add(post);
      }
    }
    group.add(pier);
  }

  // Harbor Promenade Promenade Embankment Deck
  const quayArc = new THREE.Mesh(
    trackGeo(
      new THREE.RingGeometry(15.5 * S, 20.5 * S, 24, 1, Math.PI * 0.12, Math.PI * 0.76)
    ),
    timberPierMat
  );
  place(quayArc, 18.0, 1.35, 53.5, 0);
  quayArc.rotateX(-Math.PI / 2);
  group.add(quayArc);

  // Sweet City Patisserie Houses (Gingerbread cottages, Macaron domes, Ice-cream cone turrets)
  const sweetBuildings: readonly {
    x: number;
    z: number;
    w: number;
    h: number;
    d: number;
    yaw: number;
    kind: 'gingerbread' | 'cone-tower' | 'macaron' | 'flan';
  }[] = [
    { x: 6.5, z: 36.0, w: 4.2, h: 4.4, d: 3.8, yaw: 0.2, kind: 'gingerbread' },
    { x: 11.2, z: 39.5, w: 3.4, h: 5.0, d: 3.2, yaw: -0.15, kind: 'cone-tower' },
    { x: 24.5, z: 36.5, w: 4.4, h: 4.6, d: 4.0, yaw: -0.22, kind: 'gingerbread' },
    { x: 29.8, z: 39.5, w: 3.6, h: 5.6, d: 3.4, yaw: 0.18, kind: 'cone-tower' },
    { x: 3.5, z: 45.0, w: 4.0, h: 4.0, d: 3.6, yaw: 0.3, kind: 'macaron' },
    { x: 9.2, z: 48.0, w: 3.8, h: 4.2, d: 3.6, yaw: 0.1, kind: 'gingerbread' },
    { x: 26.8, z: 47.5, w: 4.2, h: 4.5, d: 3.8, yaw: -0.15, kind: 'macaron' },
    { x: 33.5, z: 44.5, w: 3.6, h: 4.8, d: 3.4, yaw: -0.35, kind: 'cone-tower' },
    { x: -1.5, z: 39.5, w: 4.2, h: 4.2, d: 3.8, yaw: 0.4, kind: 'flan' },
    { x: 36.5, z: 35.5, w: 4.0, h: 4.4, d: 3.8, yaw: -0.25, kind: 'gingerbread' },
    { x: 8.5, z: 22.0, w: 4.2, h: 4.8, d: 3.8, yaw: 0.1, kind: 'cone-tower' },
    { x: 27.5, z: 22.0, w: 4.2, h: 4.6, d: 3.8, yaw: -0.12, kind: 'macaron' },
    { x: 37.0, z: 24.5, w: 4.4, h: 5.0, d: 4.0, yaw: -0.28, kind: 'gingerbread' },
    { x: -2.0, z: 26.0, w: 4.0, h: 4.4, d: 3.8, yaw: 0.25, kind: 'gingerbread' },
    { x: 43.0, z: 31.0, w: 3.8, h: 5.8, d: 3.6, yaw: -0.2, kind: 'cone-tower' },
    { x: -5.5, z: 44.0, w: 3.6, h: 5.2, d: 3.4, yaw: 0.45, kind: 'cone-tower' },
    { x: 42.5, z: 42.0, w: 4.2, h: 4.4, d: 3.8, yaw: -0.4, kind: 'macaron' },
    { x: 1.5, z: 18.0, w: 4.0, h: 5.2, d: 3.6, yaw: 0.25, kind: 'gingerbread' },
    { x: 35.5, z: 14.0, w: 4.2, h: 5.4, d: 3.8, yaw: -0.25, kind: 'cone-tower' },
    { x: 48.0, z: 18.0, w: 4.6, h: 4.8, d: 4.0, yaw: -0.35, kind: 'macaron' },
  ];

  for (let i = 0; i < sweetBuildings.length; i++) {
    const b = sweetBuildings[i];
    const gy = sampleTottoLandHeight(b.x, b.z);
    const hg = new THREE.Group();
    place(hg, b.x, gy - 0.2, b.z, b.yaw);

    if (b.kind === 'flan') {
      // Caramel Flan/Pudding Landmark (matching Sweet City foreground wale_cake5_5c209af3.JPG)
      const base = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(2.6 * S, 3.4 * S, 3.4 * S, 16)),
        goldMat
      );
      base.position.y = 1.7 * S;
      hg.add(base);
      const sauce = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(2.7 * S, 2.8 * S, 1.1 * S, 16)),
        chocolateMat
      );
      sauce.position.y = 3.1 * S;
      hg.add(sauce);
    } else if (b.kind === 'macaron') {
      const wall = new THREE.Mesh(cylGeo, biscuitMat);
      wall.scale.set(b.w * 0.55, b.h, b.w * 0.55);
      wall.position.y = b.h * 0.5 * S;
      hg.add(wall);
      const dome = new THREE.Mesh(
        domeGeo,
        i % 2 === 0 ? pinkIcingMat : mintMat
      );
      dome.scale.set(b.w * 0.6, b.w * 0.45, b.w * 0.6);
      dome.position.y = b.h * S;
      hg.add(dome);
      const trim = new THREE.Mesh(torusGeo, creamMat);
      trim.scale.set(b.w * 0.58, b.w * 0.58, 1.4);
      trim.rotation.x = Math.PI / 2;
      trim.position.y = b.h * S;
      hg.add(trim);
    } else if (b.kind === 'cone-tower') {
      const tower = new THREE.Mesh(cylGeo, creamMat);
      tower.scale.set(b.w * 0.48, b.h, b.w * 0.48);
      tower.position.y = b.h * 0.5 * S;
      hg.add(tower);
      const scoop = new THREE.Mesh(
        sphereGeo,
        i % 2 === 0 ? pinkIcingMat : orangeMat
      );
      scoop.scale.setScalar(b.w * 0.52);
      scoop.position.y = (b.h + 0.8) * S;
      hg.add(scoop);
      const cone = new THREE.Mesh(coneGeo, waffleMat);
      cone.scale.set(b.w * 0.52, 4.4, b.w * 0.52);
      cone.position.y = (b.h + 3.2) * S;
      hg.add(cone);
    } else {
      const body = new THREE.Mesh(
        boxGeo,
        i % 2 === 0 ? biscuitMat : creamMat
      );
      body.scale.set(b.w, b.h, b.d);
      body.position.y = b.h * 0.5 * S;
      hg.add(body);
      const eave = new THREE.Mesh(boxGeo, creamMat);
      eave.scale.set(b.w + 0.45, 0.55, b.d + 0.45);
      eave.position.y = b.h * S;
      hg.add(eave);
      const roof = new THREE.Mesh(coneGeo, hotPinkMat);
      roof.scale.set(Math.max(b.w, b.d) * 0.78, 2.4, Math.max(b.w, b.d) * 0.78);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = (b.h + 1.35) * S;
      hg.add(roof);
      const door = new THREE.Mesh(boxGeo, chocolateMat);
      door.scale.set(1.1, 1.8, 0.25);
      door.position.set(0, 0.9 * S, (b.d * 0.5 + 0.08) * S);
      hg.add(door);
    }
    group.add(hg);
  }

  // Sweet City Colorful Ferris Wheel (Grande Roue — wale_cake5_5c209af3.JPG left!)
  const ferrisBaseY = sampleTottoLandHeight(-2.5, 29.0);
  const ferrisGroup = new THREE.Group();
  place(ferrisGroup, -2.5, ferrisBaseY, 29.0, 0.25);

  for (const sx of [-1.2, 1.2]) {
    const leg = new THREE.Mesh(boxGeo, candyStripeMat);
    leg.scale.set(0.65, 11.5, 0.65);
    leg.position.set(sx * S, 5.4 * S, 0);
    leg.rotation.z = sx * -0.18;
    ferrisGroup.add(leg);
  }

  const ferrisWheel = new THREE.Group();
  ferrisWheel.position.set(0, 9.6 * S, 0);
  const rim = new THREE.Mesh(torusGeo, goldMat);
  rim.scale.set(6.2, 6.2, 1.2);
  ferrisWheel.add(rim);
  for (let sp = 0; sp < 8; sp++) {
    const a = (sp / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(boxGeo, creamMat);
    spoke.scale.set(0.28, 12.2, 0.28);
    spoke.rotation.z = a;
    ferrisWheel.add(spoke);

    const gondola = new THREE.Mesh(
      sphereGeo,
      sp % 3 === 0 ? hotPinkMat : sp % 3 === 1 ? mintMat : orangeMat
    );
    gondola.scale.setScalar(0.85);
    gondola.position.set(Math.cos(a) * 6.2 * S, Math.sin(a) * 6.2 * S, 0);
    ferrisWheel.add(gondola);
  }
  ferrisGroup.add(ferrisWheel);
  group.add(ferrisGroup);

  // Floating Ice-Cream Cone Hot-Air Balloons above Sweet City (wale_cake5_5c209af3.JPG)
  const balloonCoords: readonly [number, number, number, number][] = [
    [4.0, 26.5, 24.0, 0xf472b6],
    [22.0, 30.0, 18.0, 0xfacc15],
    [34.0, 25.5, 28.0, 0x38bdf8],
    [13.0, 28.5, 42.0, 0xa855f7],
  ];
  for (let i = 0; i < balloonCoords.length; i++) {
    const [bx, by, bz, hex] = balloonCoords[i];
    const bg = new THREE.Group();
    place(bg, bx, by, bz, 0);
    const bMat = trackMat(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.4 }));
    const env = new THREE.Mesh(sphereGeo, bMat);
    env.scale.set(2.1, 2.6, 2.1);
    bg.add(env);
    const basket = new THREE.Mesh(coneGeo, waffleMat);
    basket.scale.set(0.85, 1.6, 0.85);
    basket.rotation.x = Math.PI;
    basket.position.y = -3.0 * S;
    bg.add(basket);
    group.add(bg);
    hotAirBalloons.push({ group: bg, baseY: by, phase: i * 1.4 });
  }

  // =========================================================================
  // 7. EASTERN PARFAIT CAPE & NORTHERN CARAMEL-CHOCOLATE PEAKS + TEACUP PAVILION
  // =========================================================================
  // Eastern Cape Lighthouse & Cupcake Towers (x ~ 62, z ~ -12)
  const capeY = sampleTottoLandHeight(62.0, -12.0);
  const capeLighthouse = new THREE.Group();
  place(capeLighthouse, 62.0, capeY - 0.2, -12.0, 0);
  const lhTower = new THREE.Mesh(cylGeo, purpleStripeMat);
  lhTower.scale.set(3.2, 11.5, 3.2);
  lhTower.position.y = 5.75 * S;
  capeLighthouse.add(lhTower);
  const lhCrown = new THREE.Mesh(coneGeo, creamMat);
  lhCrown.scale.set(3.6, 4.2, 3.6);
  lhCrown.position.y = 13.4 * S;
  capeLighthouse.add(lhCrown);
  group.add(capeLighthouse);

  // Giant Teacup Pavilions (North x=0, z=-34 & East x=55, z=-18, matching wale_cake_75fc46e8.JPG)
  for (const [tx, tz] of [
    [0.0, -34.0],
    [54.5, -18.5],
  ] as const) {
    const ty = sampleTottoLandHeight(tx, tz);
    const teacup = new THREE.Group();
    place(teacup, tx, ty - 0.2, tz, 0.4);
    const saucer = new THREE.Mesh(cylGeo, creamMat);
    saucer.scale.set(4.8, 0.6, 4.8);
    saucer.position.y = 0.3 * S;
    teacup.add(saucer);
    const cup = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(3.8 * S, 2.4 * S, 3.8 * S, 16)),
      pinkIcingMat
    );
    cup.position.y = 2.4 * S;
    teacup.add(cup);
    const tea = new THREE.Mesh(cylGeo, chocolateMat);
    tea.scale.set(3.4, 0.3, 3.4);
    tea.position.y = 4.25 * S;
    teacup.add(tea);
    const handle = new THREE.Mesh(torusGeo, creamMat);
    handle.scale.setScalar(1.3);
    handle.position.set(3.6 * S, 2.5 * S, 0);
    teacup.add(handle);
    group.add(teacup);
  }

  // Northern Twin Chocolate-Caramel Mountain Peaks crowned with Whipped Cream & Cherries!
  for (const [px, pz, rad, h] of [
    [-22.0, -42.0, 9.5, 16.5],
    [-9.5, -45.5, 8.2, 14.0],
  ] as const) {
    const pk = new THREE.Group();
    place(pk, px, 6.0, pz, 0);
    const cone = new THREE.Mesh(coneGeo, chocolateMat);
    cone.scale.set(rad, h, rad);
    cone.position.y = h * 0.5 * S;
    pk.add(cone);
    const creamCap = new THREE.Mesh(coneGeo, creamMat);
    creamCap.scale.set(rad * 0.48, h * 0.42, rad * 0.48);
    creamCap.position.y = h * 0.78 * S;
    pk.add(creamCap);
    const cherry = new THREE.Mesh(sphereGeo, cherryMat);
    cherry.scale.setScalar(1.5);
    cherry.position.y = (h + 0.8) * S;
    pk.add(cherry);
    group.add(pk);
  }

  // =========================================================================
  // 8. SEDUCING WOODS — LIVING HOMIE TREES WITH FACES, LOLLIPOPS & CANDY MUSHROOMS
  // =========================================================================
  const homieTreeCoords: readonly [number, number, number][] = [
    [-46, 2, 1.35],
    [-56, -12, 1.2],
    [-34, -14, 1.15],
    [-64, 4, 1.25],
    [-30, 14, 1.1],
    [-54, 18, 1.25],
    [-40, 26, 1.15],
    [-66, -18, 1.05],
    [-46, -26, 1.15],
    [-26, -2, 1.1],
    [-68, 20, 1.05],
    [-34, -28, 1.0],
    [-58, 30, 1.05],
    [-74, -4, 1.0],
    [-48, 14, 0.95],
    [-40, -6, 1.0],
    [-62, -28, 1.0],
    [-24, 24, 1.05],
  ];

  for (let i = 0; i < homieTreeCoords.length; i++) {
    const [tx, tz, sc] = homieTreeCoords[i];
    const ty = sampleTottoLandHeight(tx, tz);
    const tree = new THREE.Group();
    place(tree, tx, ty - 0.3, tz, (i * 0.9) % (Math.PI * 2));

    // Gnarled twisting Homie trunk
    const trunk = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.1 * sc * S, 1.85 * sc * S, 7.6 * sc * S, 8)),
      treeBarkMat
    );
    trunk.position.y = 3.8 * sc * S;
    trunk.rotation.z = i % 2 === 0 ? 0.08 : -0.07;
    tree.add(trunk);

    // Lush layered rounded forest canopy
    for (const [cx, cy, cz, cr] of [
      [0, 8.2, 0, 4.2],
      [-2.2, 7.0, 1.2, 2.8],
      [2.1, 7.2, -1.0, 3.0],
    ] as const) {
      const foliage = new THREE.Mesh(sphereGeo, treeLeafMat);
      foliage.scale.set(cr * sc, cr * 0.8 * sc, cr * sc);
      foliage.position.set(cx * sc * S, cy * sc * S, cz * sc * S);
      tree.add(foliage);
    }

    // Expressive Living Homie Eyes & Mouth on the Tree Trunk!
    for (const ex of [-0.52, 0.52]) {
      const eyeWhite = new THREE.Mesh(sphereGeo, creamMat);
      eyeWhite.scale.set(0.32 * sc, 0.38 * sc, 0.22 * sc);
      eyeWhite.position.set(ex * sc * S, 4.4 * sc * S, 1.38 * sc * S);
      tree.add(eyeWhite);
      const pupil = new THREE.Mesh(sphereGeo, darkWindowMat);
      pupil.scale.setScalar(0.16 * sc);
      pupil.position.set(ex * sc * S, 4.4 * sc * S, 1.56 * sc * S);
      tree.add(pupil);
    }
    const mouth = new THREE.Mesh(boxGeo, darkWindowMat);
    mouth.scale.set(0.95 * sc, 0.42 * sc, 0.28 * sc);
    mouth.position.set(0, 3.1 * sc * S, 1.42 * sc * S);
    tree.add(mouth);

    group.add(tree);
  }

  // Giant Swirl Lollipops & Candy Mushrooms scattered along Seducing Woods clearings
  const popCoords: readonly [number, number, number][] = [
    [-42, 12, 0xf43f5e],
    [-51, 8, 0xa855f7],
    [-38, -2, 0x38bdf8],
    [-56, 24, 0xf472b6],
    [-32, 20, 0xfacc15],
    [-48, -16, 0x34d399],
  ];
  for (const [px, pz, hex] of popCoords) {
    const py = sampleTottoLandHeight(px, pz);
    const pop = new THREE.Group();
    place(pop, px, py - 0.1, pz, px * 0.15);
    const stick = new THREE.Mesh(cylGeo, creamMat);
    stick.scale.set(0.24, 6.2, 0.24);
    stick.position.y = 3.1 * S;
    pop.add(stick);
    const diskMat = trackMat(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.38 }));
    const disk = new THREE.Mesh(cylGeo, diskMat);
    disk.scale.set(1.85, 0.65, 1.85);
    disk.rotation.x = Math.PI / 2;
    disk.position.y = 6.8 * S;
    pop.add(disk);
    group.add(pop);
  }

  // =========================================================================
  // 9. ALL 34 PERIPHERAL ISLANDS, PASTRY ISLETS, CANDY SHIPS, HOMIE WAVES & SEA SLUGS
  // =========================================================================
  const { seaSlugs, homieWaves } = buildTottoLandPeripheralWorld(
    group,
    globeRadius,
    place,
    {
      trackGeo,
      trackMat,
      trackTex,
      creamMat,
      pinkIcingMat,
      hotPinkMat,
      chocolateMat,
      milkChocMat,
      biscuitMat,
      caramelMat,
      goldMat,
      cherryMat,
      orangeMat,
      mintMat,
      berryMat,
      candyStripeMat,
      waffleMat,
      treeBarkMat,
      treeLeafMat,
      darkWindowMat,
    }
  );

  // =========================================================================
  // 10. ZERO-GC RUNTIME ANIMATION LOOP
  // =========================================================================
  let elapsedTime = 0;

  const update = (dt: number) => {
    elapsedTime += dt;

    // Sweet City Ferris Wheel rotation
    ferrisWheel.rotation.z += dt * 0.42;

    // Gentle Hot-Air Ice-Cream Balloon bob
    for (let i = 0; i < hotAirBalloons.length; i++) {
      const b = hotAirBalloons[i];
      const bob = Math.sin(elapsedTime * 1.15 + b.phase) * 1.3;
      const [bx, , bz] = balloonCoords[i];
      place(b.group, bx, b.baseY + bob, bz, elapsedTime * 0.12 + b.phase);
    }

    // Candle Flame pulse on Whole Cake Chateau
    for (let i = 0; i < candleFlames.length; i++) {
      const pulse = 1 + 0.14 * Math.sin(elapsedTime * 6.5 + i * 1.3);
      candleFlames[i].scale.set(0.75 * pulse, 2.2 * pulse, 0.75 * pulse);
    }

    // Smiling Homie Wave bob
    for (let i = 0; i < homieWaves.length; i++) {
      homieWaves[i].scale.y = 1 + 0.08 * Math.sin(elapsedTime * 2.2 + i * 1.1);
    }

    // Territorial Sea Slugs (Umiushi) patrolling the archipelago waters
    for (let i = 0; i < seaSlugs.length; i++) {
      const slug = seaSlugs[i];
      const theta = elapsedTime * slug.speed + slug.phase;
      const sx = slug.cx + Math.cos(theta) * slug.orbitR;
      const sz = slug.cz + Math.sin(theta) * slug.orbitR;
      const heading = Math.atan2(
        -Math.sin(theta) * slug.speed,
        Math.cos(theta) * slug.speed
      );
      place(
        slug.group,
        sx,
        0.18 + 0.1 * Math.sin(elapsedTime * 2.4 + slug.phase),
        sz,
        heading
      );
    }
  };

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update,
  };
}
