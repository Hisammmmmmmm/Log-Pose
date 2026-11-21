import * as THREE from 'three';
import {
  TOTTO_LAND_GLOBE_SCALE,
  TOTTO_LAND_PASTRY_ISLETS,
  TOTTO_LAND_PERIPHERAL_ISLANDS,
  TOTTO_LAND_SEA_SLUGS,
  sampleTottoLandHeight,
  toTottoLandSphereLocal,
} from '../utils/tottoLandTerrain';
import {
  createBurgerHomieFaceTexture,
  createCinnamonSpiralTexture,
  createCupcakeWrapperTexture,
  createDiagonalCandyTexture,
  createSwissCheeseTexture,
  createVerticalStripeTexture,
  createWaffleConeTexture,
} from './tottoLandTextures';

const S = TOTTO_LAND_GLOBE_SCALE;

export interface TottoLandAnimatedSlug {
  group: THREE.Group;
  cx: number;
  cz: number;
  orbitR: number;
  phase: number;
  speed: number;
}

export interface TottoLandPeripheralResult {
  seaSlugs: TottoLandAnimatedSlug[];
  homieWaves: THREE.Group[];
}

export type PlaceOnTottoLandFn = (
  obj: THREE.Object3D,
  lx: number,
  ly: number,
  lz: number,
  yaw?: number
) => void;

export interface TottoLandSharedAssets {
  trackGeo: <T extends THREE.BufferGeometry>(geo: T) => T;
  trackMat: <T extends THREE.Material>(mat: T) => T;
  trackTex: <T extends THREE.Texture>(tex: T) => T;
  creamMat: THREE.MeshStandardMaterial;
  pinkIcingMat: THREE.MeshStandardMaterial;
  hotPinkMat: THREE.MeshStandardMaterial;
  chocolateMat: THREE.MeshStandardMaterial;
  milkChocMat: THREE.MeshStandardMaterial;
  biscuitMat: THREE.MeshStandardMaterial;
  caramelMat: THREE.MeshStandardMaterial;
  goldMat: THREE.MeshStandardMaterial;
  cherryMat: THREE.MeshStandardMaterial;
  orangeMat: THREE.MeshStandardMaterial;
  mintMat: THREE.MeshStandardMaterial;
  berryMat: THREE.MeshStandardMaterial;
  candyStripeMat: THREE.MeshStandardMaterial;
  waffleMat: THREE.MeshStandardMaterial;
  treeBarkMat: THREE.MeshStandardMaterial;
  treeLeafMat: THREE.MeshStandardMaterial;
  darkWindowMat: THREE.MeshStandardMaterial;
}

export function buildTottoLandPeripheralWorld(
  group: THREE.Group,
  globeRadius: number,
  placeOnTottoLand: PlaceOnTottoLandFn,
  assets: TottoLandSharedAssets
): TottoLandPeripheralResult {
  const {
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
  } = assets;

  // Peripheral-specific textures & materials
  const swissPlainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createSwissCheeseTexture(false)),
      roughness: 0.56,
    })
  );
  const swissLabelMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createSwissCheeseTexture(true)),
      roughness: 0.54,
    })
  );
  const burgerFaceMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createBurgerHomieFaceTexture()),
      roughness: 0.5,
    })
  );
  const cupcakeWrapMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createCupcakeWrapperTexture('#fde68a', '#d97706')),
      roughness: 0.72,
    })
  );
  const pinkCupcakeWrapMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createCupcakeWrapperTexture('#fbcfe8', '#db2777')),
      roughness: 0.72,
    })
  );
  const cinnamonCapMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createCinnamonSpiralTexture()),
      roughness: 0.65,
    })
  );
  const silverCutleryMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.22,
      metalness: 0.86,
    })
  );
  const glacierIceMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.14,
      roughness: 0.22,
      metalness: 0.15,
    })
  );
  const honeyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.18,
      roughness: 0.28,
      metalness: 0.12,
    })
  );
  const jellyLimeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      roughness: 0.18,
      metalness: 0.08,
      transparent: true,
      opacity: 0.88,
    })
  );
  const jellyBerryMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.18,
      metalness: 0.08,
      transparent: true,
      opacity: 0.88,
    })
  );
  const milkGlassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.08,
    })
  );
  const friesBoxMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.62 })
  );
  const friesMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.68 })
  );
  const grapeMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7e22ce, roughness: 0.45 })
  );
  const swirlPopMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createDiagonalCandyTexture('#fef08a', '#ec4899')),
      roughness: 0.36,
    })
  );
  const limeWaveMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x0284c7,
      emissiveIntensity: 0.18,
      roughness: 0.32,
    })
  );
  const tentaclePinkMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createVerticalStripeTexture('#f472b6', '#be185d', 8, false)),
      roughness: 0.55,
    })
  );

  // Shared reusable primitive geometries
  const boxGeo = trackGeo(new THREE.BoxGeometry(1 * S, 1 * S, 1 * S));
  const cylGeo = trackGeo(new THREE.CylinderGeometry(1 * S, 1 * S, 1 * S, 12));
  const coneGeo = trackGeo(new THREE.ConeGeometry(1 * S, 1 * S, 10));
  const sphereGeo = trackGeo(new THREE.SphereGeometry(1 * S, 12, 10));
  const domeGeo = trackGeo(
    new THREE.SphereGeometry(1 * S, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)
  );
  const torusGeo = trackGeo(new THREE.TorusGeometry(1 * S, 0.38 * S, 8, 16));

  // Helper to add a tiny frosted pastry house on peripheral islands
  const addPastryCottage = (
    parent: THREE.Group,
    ox: number,
    oy: number,
    oz: number,
    scale: number,
    wallMat: THREE.Material,
    roofMat: THREE.Material
  ) => {
    const c = new THREE.Group();
    c.position.set(ox * S, oy * S, oz * S);
    const body = new THREE.Mesh(boxGeo, wallMat);
    body.scale.set(2.2 * scale, 2.0 * scale, 2.0 * scale);
    body.position.y = 1.0 * scale * S;
    c.add(body);
    const roof = new THREE.Mesh(coneGeo, roofMat);
    roof.scale.set(1.75 * scale, 1.45 * scale, 1.75 * scale);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 2.65 * scale * S;
    c.add(roof);
    const frostingCap = new THREE.Mesh(boxGeo, creamMat);
    frostingCap.scale.set(2.35 * scale, 0.25 * scale, 2.15 * scale);
    frostingCap.position.y = 2.0 * scale * S;
    c.add(frostingCap);
    parent.add(c);
  };

  // Helper to add a fluted frosted cupcake landmark
  const addCupcakeTower = (
    parent: THREE.Group,
    ox: number,
    oy: number,
    oz: number,
    radius: number,
    height: number,
    wrapMat: THREE.Material,
    icingMat: THREE.Material,
    topCherry = true
  ) => {
    const cg = new THREE.Group();
    cg.position.set(ox * S, oy * S, oz * S);
    const base = new THREE.Mesh(
      trackGeo(
        new THREE.CylinderGeometry(
          radius * 1.18 * S,
          radius * 0.85 * S,
          height * S,
          14
        )
      ),
      wrapMat
    );
    base.position.y = height * 0.5 * S;
    cg.add(base);

    const puff = new THREE.Mesh(domeGeo, icingMat);
    puff.scale.set(radius * 1.24, radius * 0.92, radius * 1.24);
    puff.position.y = height * S;
    cg.add(puff);

    const swirl = new THREE.Mesh(coneGeo, creamMat);
    swirl.scale.set(radius * 0.65, radius * 0.8, radius * 0.65);
    swirl.position.y = (height + radius * 0.95) * S;
    cg.add(swirl);

    if (topCherry) {
      const cherry = new THREE.Mesh(sphereGeo, cherryMat);
      cherry.scale.setScalar(radius * 0.26);
      cherry.position.y = (height + radius * 1.45) * S;
      cg.add(cherry);
    }
    parent.add(cg);
  };

  // =========================================================================
  // 1. ALL 34 PERIPHERAL MINISTERIAL ISLANDS
  // =========================================================================
  for (let idx = 0; idx < TOTTO_LAND_PERIPHERAL_ISLANDS.length; idx++) {
    const isl = TOTTO_LAND_PERIPHERAL_ISLANDS[idx];
    const baseY = sampleTottoLandHeight(isl.x, isl.z);
    const islGroup = new THREE.Group();
    islGroup.name = `totto-peripheral-${isl.id}`;
    placeOnTottoLand(islGroup, isl.x, baseY - 0.15, isl.z, (idx % 5) * 0.18 - 0.36);

    if (isl.theme === 'cacao') {
      // Cacao Island (cacao_island_9e0cb4df.webp):
      // 3 steep cocoa mountain pyramids on the West + dense Chocolat Town spires on the East
      const peaks: readonly [number, number, number, number][] = [
        [-11.5, -4.5, 7.6, 14.5],
        [-7.0, 2.5, 8.2, 16.8],
        [-12.5, 5.5, 6.8, 12.2],
      ];
      for (const [px, pz, pr, ph] of peaks) {
        const pyr = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(pr * S, ph * S, 6)),
          chocolateMat
        );
        pyr.position.set(px * S, (ph * 0.45) * S, pz * S);
        pyr.rotation.y = px * 0.2;
        islGroup.add(pyr);

        const cap = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(pr * 0.42 * S, ph * 0.42 * S, 6)),
          milkChocMat
        );
        cap.position.set(px * S, (ph * 0.72) * S, pz * S);
        islGroup.add(cap);
      }

      // Chocolat Town dense chocolate castle towers & pointed spires (East)
      for (let t = 0; t < 24; t++) {
        const ring = t % 3;
        const a = (t / 24) * Math.PI * 2 + ring * 0.4;
        const rad = 2.2 + ring * 2.8;
        const tx = 7.5 + Math.cos(a) * rad;
        const tz = Math.sin(a) * (rad * 0.88);
        const h = 3.2 + ((t * 7) % 5) * 1.15 - ring * 0.5;
        const w = 1.25 + (t % 2) * 0.45;
        const mat = t % 3 === 0 ? milkChocMat : chocolateMat;

        const tower = new THREE.Mesh(boxGeo, mat);
        tower.scale.set(w, h, w);
        tower.position.set(tx * S, (h * 0.5) * S, tz * S);
        islGroup.add(tower);

        const spire = new THREE.Mesh(coneGeo, t % 2 === 0 ? caramelMat : creamMat);
        spire.scale.set(w * 0.78, 1.8 + (t % 3) * 0.6, w * 0.78);
        spire.position.set(tx * S, (h + 0.9) * S, tz * S);
        islGroup.add(spire);
      }

      // Foreground southern chocolate bay towers (matching reference cacao_island_9e0cb4df.webp)
      addPastryCottage(islGroup, 0.5, 0, 11.0, 1.15, chocolateMat, milkChocMat);
      addPastryCottage(islGroup, 9.5, 0, 10.5, 0.95, milkChocMat, caramelMat);

      // Lush cocoa-forest trees wrapping the western peaks
      for (let g = 0; g < 10; g++) {
        const ga = (g / 10) * Math.PI * 2;
        const gx = -9.0 + Math.cos(ga) * 10.5;
        const gz = Math.sin(ga) * 9.5;
        const foliage = new THREE.Mesh(sphereGeo, treeLeafMat);
        foliage.scale.set(1.6, 1.25, 1.6);
        foliage.position.set(gx * S, 1.1 * S, gz * S);
        islGroup.add(foliage);
      }
    } else if (isl.theme === 'cheese') {
      // Cheese Island (cheese_island_10a5c363.webp):
      // Dripping melted cheese wedges, "Cheese" slab, Burger Homie with chef hat, pizza slice, fries, milk bottles
      const leftCheese = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(5.6 * S, 12.2 * S, 4.4 * S)),
        swissPlainMat
      );
      leftCheese.position.set(-7.2 * S, 5.4 * S, -1.5 * S);
      leftCheese.rotation.z = 0.22;
      leftCheese.rotation.y = 0.2;
      islGroup.add(leftCheese);

      const mainCheese = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(8.2 * S, 11.4 * S, 5.0 * S)),
        swissLabelMat
      );
      mainCheese.position.set(5.4 * S, 5.0 * S, -0.5 * S);
      mainCheese.rotation.z = -0.18;
      mainCheese.rotation.y = -0.15;
      islGroup.add(mainCheese);

      const backCheese = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(4.8 * S, 8.8 * S, 4.2 * S)),
        swissPlainMat
      );
      backCheese.position.set(-1.5 * S, 4.2 * S, -6.2 * S);
      islGroup.add(backCheese);

      // Giant Chef-Hatted Smiling Burger Homie perched atop the cheese arch
      const burger = new THREE.Group();
      burger.position.set(-0.6 * S, 13.8 * S, 0.2 * S);
      const bunTop = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(4.2 * S, 5.0 * S, 4.0 * S, 16)),
        burgerFaceMat
      );
      bunTop.rotation.y = -Math.PI * 0.5;
      burger.add(bunTop);

      const bunDome = new THREE.Mesh(domeGeo, caramelMat);
      bunDome.scale.set(4.25, 2.2, 4.25);
      bunDome.position.y = 1.95 * S;
      burger.add(bunDome);

      const chefStem = new THREE.Mesh(cylGeo, milkGlassMat);
      chefStem.scale.set(1.6, 2.0, 1.6);
      chefStem.position.y = 4.6 * S;
      burger.add(chefStem);

      const chefPuff = new THREE.Mesh(sphereGeo, milkGlassMat);
      chefPuff.scale.set(2.8, 1.7, 2.8);
      chefPuff.position.y = 6.0 * S;
      burger.add(chefPuff);
      islGroup.add(burger);

      // Tilted Giant Pepperoni Pizza Slice (right)
      const pizza = new THREE.Group();
      pizza.position.set(11.0 * S, 9.2 * S, 1.2 * S);
      pizza.rotation.z = -0.45;
      const crust = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(4.2 * S, 8.6 * S, 3)),
        honeyMat
      );
      crust.rotation.x = Math.PI;
      pizza.add(crust);
      const pepperoni = new THREE.Mesh(sphereGeo, cherryMat);
      pepperoni.scale.set(0.8, 0.35, 0.8);
      pepperoni.position.set(0, 0.6 * S, 1.4 * S);
      pizza.add(pepperoni);
      islGroup.add(pizza);

      // Red "POTATO" Fries Box + Golden Fries (front right)
      const fries = new THREE.Group();
      fries.position.set(11.8 * S, 2.2 * S, 6.8 * S);
      const fBox = new THREE.Mesh(boxGeo, friesBoxMat);
      fBox.scale.set(3.2, 3.6, 2.0);
      fries.add(fBox);
      for (let f = -2; f <= 2; f++) {
        const stick = new THREE.Mesh(boxGeo, friesMat);
        stick.scale.set(0.45, 3.4, 0.45);
        stick.position.set(f * 0.55 * S, 2.6 * S, 0);
        stick.rotation.z = f * 0.08;
        fries.add(stick);
      }
      islGroup.add(fries);

      // Milk-Jug Houses along foreground town terrace
      for (const [mx, mz, sc] of [
        [-12.0, 6.2, 1.1],
        [-2.5, 7.6, 0.9],
        [7.2, 7.5, 1.15],
      ] as const) {
        const jug = new THREE.Group();
        jug.position.set(mx * S, 0, mz * S);
        const body = new THREE.Mesh(cylGeo, milkGlassMat);
        body.scale.set(1.8 * sc, 3.6 * sc, 1.8 * sc);
        body.position.y = 1.8 * sc * S;
        jug.add(body);
        const neck = new THREE.Mesh(cylGeo, milkGlassMat);
        neck.scale.set(0.8 * sc, 1.4 * sc, 0.8 * sc);
        neck.position.y = 4.1 * sc * S;
        jug.add(neck);
        const door = new THREE.Mesh(boxGeo, darkWindowMat);
        door.scale.set(0.75 * sc, 1.25 * sc, 0.3);
        door.position.set(0, 0.7 * sc * S, 1.78 * sc * S);
        jug.add(door);
        islGroup.add(jug);
      }
    } else if (isl.theme === 'funwari') {
      // Funwari Island (cutlery_funwary_island_c998b887.webp):
      // Giant fluted frosted cupcakes + spiral cinnamon rolls
      addCupcakeTower(islGroup, 2.5, 4.0, -3.5, 4.8, 7.4, pinkCupcakeWrapMat, pinkIcingMat, true);
      addCupcakeTower(islGroup, 4.0, 12.2, -3.0, 3.4, 5.2, cupcakeWrapMat, biscuitMat, false);
      addCupcakeTower(islGroup, -11.5, 0.0, 1.5, 4.4, 5.8, cupcakeWrapMat, goldMat, false);

      // Giant Tilted Spiral Cinnamon Rolls flanking center
      for (const [rx, ry, rz, rotZ, rad] of [
        [-4.2, 5.5, 0.5, 0.25, 3.8],
        [10.8, 3.8, 1.8, -0.32, 3.2],
      ] as const) {
        const roll = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(rad * S, rad * S, 4.2 * S, 16)),
          [cupcakeWrapMat, cinnamonCapMat, cinnamonCapMat]
        );
        roll.position.set(rx * S, ry * S, rz * S);
        roll.rotation.x = Math.PI * 0.5;
        roll.rotation.z = rotZ;
        islGroup.add(roll);
      }

      addPastryCottage(islGroup, -4.5, 0, 8.5, 1.0, creamMat, hotPinkMat);
      addPastryCottage(islGroup, 4.8, 0, 8.2, 1.1, creamMat, pinkIcingMat);
    } else if (isl.theme === 'cutlery') {
      // Cutlery Island: Monumental silver fork, spoon & knife rising above porcelain cake dishes
      const plate = new THREE.Mesh(cylGeo, milkGlassMat);
      plate.scale.set(11.5, 1.0, 11.5);
      plate.position.y = 0.5 * S;
      islGroup.add(plate);

      // Giant Fork
      const fork = new THREE.Group();
      fork.position.set(-4.8 * S, 0, -1.5 * S);
      fork.rotation.z = 0.14;
      const fHandle = new THREE.Mesh(boxGeo, silverCutleryMat);
      fHandle.scale.set(1.1, 13.5, 0.65);
      fHandle.position.y = 6.7 * S;
      fork.add(fHandle);
      const fNeck = new THREE.Mesh(boxGeo, silverCutleryMat);
      fNeck.scale.set(3.8, 1.2, 0.65);
      fNeck.position.y = 13.6 * S;
      fork.add(fNeck);
      for (let t = -1.5; t <= 1.5; t += 1.0) {
        const tine = new THREE.Mesh(boxGeo, silverCutleryMat);
        tine.scale.set(0.42, 4.2, 0.45);
        tine.position.set(t * 0.95 * S, 15.9 * S, 0);
        fork.add(tine);
      }
      islGroup.add(fork);

      // Giant Spoon
      const spoon = new THREE.Group();
      spoon.position.set(4.5 * S, 0, 1.2 * S);
      spoon.rotation.z = -0.16;
      const sHandle = new THREE.Mesh(boxGeo, silverCutleryMat);
      sHandle.scale.set(1.0, 12.8, 0.6);
      sHandle.position.y = 6.4 * S;
      spoon.add(sHandle);
      const sBowl = new THREE.Mesh(sphereGeo, silverCutleryMat);
      sBowl.scale.set(2.4, 3.4, 0.95);
      sBowl.position.y = 14.4 * S;
      spoon.add(sBowl);
      islGroup.add(spoon);

      addPastryCottage(islGroup, 0.5, 1.0, 6.2, 1.15, creamMat, pinkIcingMat);
      addPastryCottage(islGroup, -7.8, 1.0, 5.2, 0.95, biscuitMat, caramelMat);
    } else if (isl.theme === 'ice') {
      // Ice Island & Milenge Island: Giant frosted scoops & crystal spires
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        const rad = k === 0 ? 0 : 7.2;
        const h = k === 0 ? 12.5 : 7.0 + (k % 2) * 2.4;
        const cone = new THREE.Mesh(coneGeo, k % 2 === 0 ? glacierIceMat : waffleMat);
        cone.scale.set(k === 0 ? 4.4 : 2.8, h, k === 0 ? 4.4 : 2.8);
        cone.position.set(Math.cos(a) * rad * S, (h * 0.45) * S, Math.sin(a) * rad * S);
        islGroup.add(cone);

        const scoop = new THREE.Mesh(
          sphereGeo,
          k % 2 === 0 ? creamMat : mintMat
        );
        scoop.scale.setScalar(k === 0 ? 3.2 : 2.1);
        scoop.position.set(Math.cos(a) * rad * S, (h * 0.92) * S, Math.sin(a) * rad * S);
        islGroup.add(scoop);
      }
    } else if (isl.theme === 'biscuits') {
      // Biscuits Island: Giant square biscuit fortress castle + cracker battlements
      const keep = new THREE.Mesh(boxGeo, biscuitMat);
      keep.scale.set(11.0, 8.8, 9.6);
      keep.position.y = 4.4 * S;
      islGroup.add(keep);
      const icingRoof = new THREE.Mesh(boxGeo, creamMat);
      icingRoof.scale.set(11.6, 1.0, 10.2);
      icingRoof.position.y = 9.0 * S;
      islGroup.add(icingRoof);
      for (const sx of [-5.2, 5.2]) {
        for (const sz of [-4.5, 4.5]) {
          const tower = new THREE.Mesh(cylGeo, biscuitMat);
          tower.scale.set(2.1, 11.5, 2.1);
          tower.position.set(sx * S, 5.75 * S, sz * S);
          islGroup.add(tower);
          const cap = new THREE.Mesh(coneGeo, caramelMat);
          cap.scale.set(2.6, 3.2, 2.6);
          cap.position.set(sx * S, 12.8 * S, sz * S);
          islGroup.add(cap);
        }
      }
      addPastryCottage(islGroup, 0, 0, 8.8, 1.1, biscuitMat, chocolateMat);
    } else if (isl.theme === 'fruits') {
      // Fruits Island & 100% Island & Loving Island: Oversized strawberries, citrus, grapes
      const berryBody = new THREE.Mesh(coneGeo, cherryMat);
      berryBody.scale.set(5.4, 9.6, 5.4);
      berryBody.rotation.x = Math.PI;
      berryBody.position.set(-2.5 * S, 4.8 * S, -1.5 * S);
      islGroup.add(berryBody);
      const berryLeaf = new THREE.Mesh(cylGeo, treeLeafMat);
      berryLeaf.scale.set(4.5, 1.0, 4.5);
      berryLeaf.position.set(-2.5 * S, 9.4 * S, -1.5 * S);
      islGroup.add(berryLeaf);

      const orangeDome = new THREE.Mesh(sphereGeo, orangeMat);
      orangeDome.scale.set(4.2, 4.2, 4.2);
      orangeDome.position.set(6.4 * S, 3.6 * S, 2.2 * S);
      islGroup.add(orangeDome);

      for (let g = 0; g < 4; g++) {
        const grape = new THREE.Mesh(sphereGeo, grapeMat);
        grape.scale.setScalar(1.9);
        grape.position.set((-6.5 + g * 1.4) * S, (2.4 + (g % 2) * 1.6) * S, 5.4 * S);
        islGroup.add(grape);
      }
      addPastryCottage(islGroup, 2.5, 0, 7.2, 1.0, creamMat, orangeMat);
    } else if (isl.theme === 'candy') {
      // Candy Island, Sanshoku Island, Topping Island: Giant colorful swirl lollipops & sugar spires
      const lollipopColors = [hotPinkMat, swirlPopMat, mintMat, orangeMat];
      for (let l = 0; l < 5; l++) {
        const lx = (l - 2) * 4.2;
        const lz = ((l % 2) * 2 - 1) * 4.0;
        const lh = 7.5 + (l % 3) * 2.2;
        const stick = new THREE.Mesh(cylGeo, creamMat);
        stick.scale.set(0.38, lh, 0.38);
        stick.position.set(lx * S, (lh * 0.5) * S, lz * S);
        islGroup.add(stick);
        const pop = new THREE.Mesh(cylGeo, lollipopColors[l % lollipopColors.length]);
        pop.scale.set(2.4, 0.85, 2.4);
        pop.rotation.x = Math.PI / 2;
        pop.position.set(lx * S, (lh + 1.8) * S, lz * S);
        islGroup.add(pop);
      }
      addPastryCottage(islGroup, 0, 0, 7.0, 1.15, pinkIcingMat, candyStripeMat);
    } else if (isl.theme === 'nuts') {
      // Nuts Island & Tanega Futoru: Giant acorn & hazelnut towers
      for (const [nx, nz, sc] of [
        [-4.0, -2.0, 1.3],
        [4.8, 1.5, 1.1],
        [0.0, 5.5, 0.95],
      ] as const) {
        const nut = new THREE.Mesh(sphereGeo, caramelMat);
        nut.scale.set(3.2 * sc, 4.2 * sc, 3.2 * sc);
        nut.position.set(nx * S, 3.6 * sc * S, nz * S);
        islGroup.add(nut);
        const cap = new THREE.Mesh(domeGeo, chocolateMat);
        cap.scale.set(3.5 * sc, 2.4 * sc, 3.5 * sc);
        cap.position.set(nx * S, 5.2 * sc * S, nz * S);
        islGroup.add(cap);
      }
    } else if (isl.theme === 'jam') {
      // Jam Island: Crimson berry jam dome volcano + overflowing jam pots
      const jamMound = new THREE.Mesh(domeGeo, cherryMat);
      jamMound.scale.set(7.8, 7.6, 7.8);
      jamMound.position.set(0, 0, -1.0 * S);
      islGroup.add(jamMound);
      const jamCap = new THREE.Mesh(cylGeo, berryMat);
      jamCap.scale.set(3.2, 3.4, 3.2);
      jamCap.position.set(0, 6.8 * S, -1.0 * S);
      islGroup.add(jamCap);
      addPastryCottage(islGroup, -5.8, 0, 6.0, 1.0, biscuitMat, cherryMat);
      addPastryCottage(islGroup, 5.8, 0, 5.8, 1.0, creamMat, berryMat);
    } else if (isl.theme === 'milk') {
      // Milk & Noko Islands: Towering milk-carton & butter-cream palaces
      for (const [mx, mz, h] of [
        [-3.5, -2.0, 9.6],
        [4.2, 0.5, 7.6],
      ] as const) {
        const bottle = new THREE.Mesh(cylGeo, milkGlassMat);
        bottle.scale.set(3.2, h, 3.2);
        bottle.position.set(mx * S, (h * 0.5) * S, mz * S);
        islGroup.add(bottle);
        const cap = new THREE.Mesh(cylGeo, orangeMat);
        cap.scale.set(1.6, 1.4, 1.6);
        cap.position.set(mx * S, (h + 0.7) * S, mz * S);
        islGroup.add(cap);
      }
    } else if (isl.theme === 'jelly' || isl.theme === 'liqueur') {
      // Jelly & Liqueur Islands: Translucent shimmering jelly domes or golden goblets
      const m1 = isl.theme === 'jelly' ? jellyLimeMat : goldMat;
      const m2 = isl.theme === 'jelly' ? jellyBerryMat : cherryMat;
      const main = new THREE.Mesh(domeGeo, m1);
      main.scale.set(6.8, 8.2, 6.8);
      main.position.set(-1.5 * S, 0, -1.0 * S);
      islGroup.add(main);
      const side = new THREE.Mesh(domeGeo, m2);
      side.scale.set(4.5, 5.8, 4.5);
      side.position.set(6.2 * S, 0, 3.2 * S);
      islGroup.add(side);
      addPastryCottage(islGroup, -6.2, 0, 5.2, 0.95, creamMat, m2);
    } else if (isl.theme === 'honey') {
      // Rokumitsu Island: Golden honeycomb spires & honey pot
      for (let h = 0; h < 4; h++) {
        const hex = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(2.8 * S, 3.0 * S, (6.0 + h * 1.8) * S, 6)),
          honeyMat
        );
        hex.position.set(((h - 1.5) * 4.2) * S, ((6.0 + h * 1.8) * 0.5) * S, (h % 2 === 0 ? -2 : 3) * S);
        islGroup.add(hex);
      }
    } else {
      // Komugi (wheat windmill), Black (tea), Spice, Butter, Baked, Snack:
      // Distinct stacked pastry turrets, donut crowns, tea cups & biscuit houses
      const mainTone =
        isl.theme === 'tea'
          ? chocolateMat
          : isl.theme === 'butter'
            ? honeyMat
            : isl.theme === 'spice'
              ? cherryMat
              : biscuitMat;
      const tower = new THREE.Mesh(cylGeo, mainTone);
      tower.scale.set(4.8, 8.4, 4.8);
      tower.position.set(-1.5 * S, 4.2 * S, -1.5 * S);
      islGroup.add(tower);

      const crown = new THREE.Mesh(
        isl.theme === 'snack' ? torusGeo : domeGeo,
        isl.theme === 'komugi' ? goldMat : creamMat
      );
      if (isl.theme === 'snack') {
        crown.scale.setScalar(3.2);
        crown.rotation.x = Math.PI / 2;
        crown.position.set(-1.5 * S, 9.2 * S, -1.5 * S);
      } else {
        crown.scale.set(5.1, 3.4, 5.1);
        crown.position.set(-1.5 * S, 8.4 * S, -1.5 * S);
      }
      islGroup.add(crown);

      addPastryCottage(islGroup, 5.8, 0, 3.4, 1.05, creamMat, mainTone);
      addPastryCottage(islGroup, -6.4, 0, 4.8, 0.95, biscuitMat, pinkIcingMat);

      const tree = new THREE.Group();
      tree.position.set(6.5 * S, 0, -5.0 * S);
      const trunk = new THREE.Mesh(cylGeo, treeBarkMat);
      trunk.scale.set(0.5, 3.2, 0.5);
      trunk.position.y = 1.6 * S;
      tree.add(trunk);
      const canopy = new THREE.Mesh(sphereGeo, treeLeafMat);
      canopy.scale.set(2.1, 1.7, 2.1);
      canopy.position.y = 3.8 * S;
      tree.add(canopy);
      islGroup.add(tree);
    }

    group.add(islGroup);
  }

  // =========================================================================
  // 2. FLOATING TARTLET / CUPCAKE / DONUT PASTRY SEA ISLETS
  // =========================================================================
  for (const pit of TOTTO_LAND_PASTRY_ISLETS) {
    const py = sampleTottoLandHeight(pit.x, pit.z);
    const pg = new THREE.Group();
    placeOnTottoLand(pg, pit.x, py - 0.1, pit.z, pit.x * 0.13);
    const icingMat = trackMat(
      new THREE.MeshStandardMaterial({ color: pit.hue, roughness: 0.45 })
    );

    if (pit.kind === 'donut') {
      const dough = new THREE.Mesh(torusGeo, biscuitMat);
      dough.scale.setScalar(pit.radius * 0.55);
      dough.rotation.x = Math.PI / 2;
      dough.position.y = 0.8 * S;
      pg.add(dough);
      const glaze = new THREE.Mesh(torusGeo, icingMat);
      glaze.scale.setScalar(pit.radius * 0.56);
      glaze.rotation.x = Math.PI / 2;
      glaze.position.y = 1.18 * S;
      pg.add(glaze);
    } else if (pit.kind === 'cupcake') {
      addCupcakeTower(pg, 0, 0, 0, pit.radius * 0.58, 3.2, cupcakeWrapMat, icingMat, true);
    } else {
      // Fruit tartlet islet
      const crust = new THREE.Mesh(cylGeo, biscuitMat);
      crust.scale.set(pit.radius * 0.72, 1.8, pit.radius * 0.72);
      crust.position.y = 0.9 * S;
      pg.add(crust);
      const filling = new THREE.Mesh(domeGeo, icingMat);
      filling.scale.set(pit.radius * 0.68, 1.8, pit.radius * 0.68);
      filling.position.y = 1.7 * S;
      pg.add(filling);
    }
    group.add(pg);
  }

  // =========================================================================
  // 3. COLORFUL HOMIE CANDY SHIPS & SMILING HOMIE WAVE CRESTS
  // =========================================================================
  const shipSpecs: readonly [number, number, number, number][] = [
    [-78, 56, 0.4, 0xf43f5e],
    [76, 48, -0.5, 0xa855f7],
    [-86, -42, 0.9, 0xec4899],
    [82, -52, -0.8, 0xf59e0b],
    [6, 94, 0.15, 0x38bdf8],
    [124, 18, -1.1, 0x22c55e],
    [-122, -16, 1.2, 0xf472b6],
  ];
  for (const [sx, sz, yaw, sailHex] of shipSpecs) {
    const ship = new THREE.Group();
    placeOnTottoLand(ship, sx, 0.18, sz, yaw);
    const sailMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: sailHex,
        roughness: 0.55,
        side: THREE.DoubleSide,
      })
    );
    const hull = new THREE.Mesh(boxGeo, caramelMat);
    hull.scale.set(2.4, 1.2, 6.2);
    hull.position.y = 0.4 * S;
    ship.add(hull);
    const cabin = new THREE.Mesh(boxGeo, pinkIcingMat);
    cabin.scale.set(1.9, 1.4, 2.0);
    cabin.position.set(0, 1.4 * S, -1.4 * S);
    ship.add(cabin);
    const mast = new THREE.Mesh(cylGeo, creamMat);
    mast.scale.set(0.16, 5.8, 0.16);
    mast.position.set(0, 3.2 * S, 0.4 * S);
    ship.add(mast);
    const sail = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(3.4 * S, 3.2 * S)),
      sailMat
    );
    sail.position.set(0, 3.8 * S, 0.6 * S);
    ship.add(sail);
    group.add(ship);
  }

  // Smiling Homie Wave Crests rising on the turquoise sea (wale_cake_75fc46e8.JPG!)
  const homieWaves: THREE.Group[] = [];
  const waveCoords: readonly [number, number, number][] = [
    [-72, 66, 0.4],
    [66, 22, -0.6],
    [-92, -12, 0.9],
    [60, -56, -0.3],
    [-12, 92, 0.1],
  ];
  for (const [wx, wz, yaw] of waveCoords) {
    const wg = new THREE.Group();
    placeOnTottoLand(wg, wx, 0.12, wz, yaw);
    const crest = new THREE.Mesh(domeGeo, limeWaveMat);
    crest.scale.set(4.0, 2.8, 1.6);
    wg.add(crest);
    for (const ex of [-1.0, 1.0]) {
      const eye = new THREE.Mesh(sphereGeo, creamMat);
      eye.scale.set(0.45, 0.55, 0.28);
      eye.position.set(ex * S, 1.3 * S, 1.3 * S);
      wg.add(eye);
      const pupil = new THREE.Mesh(sphereGeo, darkWindowMat);
      pupil.scale.setScalar(0.22);
      pupil.position.set(ex * S, 1.3 * S, 1.52 * S);
      wg.add(pupil);
    }
    const foam = new THREE.Mesh(boxGeo, creamMat);
    foam.scale.set(5.4, 0.35, 1.8);
    foam.position.y = 0.15 * S;
    wg.add(foam);
    group.add(wg);
    homieWaves.push(wg);
  }

  // =========================================================================
  // 4. ANIMATED TERRITORIAL SEA SLUGS (UMI-USHI)
  // =========================================================================
  const seaSlugs: TottoLandAnimatedSlug[] = [];
  for (const spec of TOTTO_LAND_SEA_SLUGS) {
    const sg = new THREE.Group();
    const shellMat = trackMat(
      new THREE.MeshStandardMaterial({ color: spec.shellColor, roughness: 0.45 })
    );
    const body = new THREE.Mesh(cylGeo, tentaclePinkMat);
    body.scale.set(1.25, 5.2, 1.25);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.5 * S;
    sg.add(body);

    const shell = new THREE.Mesh(torusGeo, shellMat);
    shell.scale.setScalar(1.65);
    shell.rotation.y = Math.PI / 2;
    shell.position.set(0, 1.8 * S, -0.4 * S);
    sg.add(shell);

    for (const ex of [-0.55, 0.55]) {
      const stalk = new THREE.Mesh(cylGeo, creamMat);
      stalk.scale.set(0.16, 1.5, 0.16);
      stalk.position.set(ex * S, 1.7 * S, 2.2 * S);
      sg.add(stalk);
      const eye = new THREE.Mesh(sphereGeo, goldMat);
      eye.scale.setScalar(0.32);
      eye.position.set(ex * S, 2.5 * S, 2.2 * S);
      sg.add(eye);
    }

    const x0 = spec.cx + Math.cos(spec.phase) * spec.orbitR;
    const z0 = spec.cz + Math.sin(spec.phase) * spec.orbitR;
    const sp = toTottoLandSphereLocal(x0, 0.15, z0, globeRadius);
    sg.position.set(sp.x, sp.y, sp.z);
    group.add(sg);

    seaSlugs.push({
      group: sg,
      cx: spec.cx,
      cz: spec.cz,
      orbitR: spec.orbitR,
      phase: spec.phase,
      speed: spec.speed,
    });
  }

  return { seaSlugs, homieWaves };
}
