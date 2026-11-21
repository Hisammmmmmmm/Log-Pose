import * as THREE from 'three';
import type { IslandMeshContext, IslandMeshInstance } from './types';
import {
  ELBAF_AURUST_CENTER,
  ELBAF_CHIEFTAIN_CENTER,
  ELBAF_GLOBE_SCALE,
  ELBAF_HEAVEN_Y,
  ELBAF_SUNWORLD_Y,
  ELBAF_TRUNK_CENTER,
  ELBAF_UNDERWORLD_Y,
  ELBAF_WORLD_SIZE,
  elbafCliffSignedDist,
  elbafHeavenNormRadius,
  elbafSunWorldNormRadius,
  sampleElbafHeavenHeight,
  sampleElbafSunWorldHeight,
  sampleElbafUnderworldHeight,
  toElbafSphereLocal,
} from '../utils/elbafTerrain';
import {
  createElbafAdamBarkTexture,
  createElbafCanopyTexture,
  createElbafCastleStoneTexture,
  createElbafMistTexture,
  createElbafRainbowTexture,
  createElbafSailTexture,
  createElbafShingleRoofTexture,
  createElbafSunWorldTerrainTexture,
  createElbafSwordSteelTexture,
  createElbafUnderworldTerrainTexture,
  createElbafVikingWoodTexture,
  createElbafWaterfallTexture,
} from './elbafTextures';

const S = ELBAF_GLOBE_SCALE;

// Reusable scratch objects (zero allocations in update loop)
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

function placeOnElbafSphere(
  obj: THREE.Object3D,
  lx: number,
  ly: number,
  lz: number,
  globeRadius: number,
  yaw = 0
): void {
  const sp = toElbafSphereLocal(lx, ly, lz, globeRadius);
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
  group.name = 'island-elbaf';

  // Procedural Textures
  const underTerrainTex = trackTex(createElbafUnderworldTerrainTexture(1024));
  const sunTerrainTex = trackTex(createElbafSunWorldTerrainTexture(1024));
  const barkTex = trackTex(createElbafAdamBarkTexture(512));
  const canopyTex = trackTex(createElbafCanopyTexture(512));
  const woodTex = trackTex(createElbafVikingWoodTexture(512));
  const roofTex = trackTex(createElbafShingleRoofTexture(512));
  const stoneTex = trackTex(createElbafCastleStoneTexture(512));
  const swordTex = trackTex(createElbafSwordSteelTexture(512));
  const sailTex = trackTex(createElbafSailTexture(256));
  const rainbowTex = trackTex(createElbafRainbowTexture(512, 128));
  const waterfallTex = trackTex(createElbafWaterfallTexture(256, 512));
  const mistTex = trackTex(createElbafMistTexture(256, 128));

  // Shared PBR Materials
  const underTerrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: underTerrainTex,
      roughness: 0.9,
      metalness: 0.04,
      transparent: true,
      alphaTest: 0.05,
    })
  );
  const sunTerrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: sunTerrainTex,
      roughness: 0.85,
      metalness: 0.02,
      transparent: true,
      alphaTest: 0.15,
    })
  );
  const barkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: barkTex,
      roughness: 0.92,
      metalness: 0.02,
    })
  );
  const canopyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: canopyTex,
      roughness: 0.8,
      metalness: 0.02,
    })
  );
  const foliageInstanceMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.02,
    })
  );
  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: woodTex,
      roughness: 0.82,
      metalness: 0.05,
    })
  );
  const darkTimberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.86,
      metalness: 0.06,
    })
  );
  const roofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: roofTex,
      roughness: 0.78,
      metalness: 0.05,
    })
  );
  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: stoneTex,
      roughness: 0.88,
      metalness: 0.05,
    })
  );
  const spireBlueMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.55, metalness: 0.15 })
  );
  const spireRedMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.55, metalness: 0.15 })
  );
  const goldTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xb45309,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.72,
    })
  );
  const swordBladeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: swordTex,
      roughness: 0.42,
      metalness: 0.68,
    })
  );
  const sailMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: sailTex,
      roughness: 0.75,
      side: THREE.DoubleSide,
    })
  );
  const cloudMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xe0f2fe,
      emissiveIntensity: 0.09,
      roughness: 0.88,
      metalness: 0.0,
    })
  );
  const mistMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      map: mistTex,
      transparent: true,
      opacity: 0.42,
      roughness: 0.96,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const waterfallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: waterfallTex,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.24,
      transparent: true,
      opacity: 0.86,
      roughness: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const rainbowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: rainbowTex,
      emissive: 0xffffff,
      emissiveMap: rainbowTex,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.88,
      roughness: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const cragRockMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.04,
    })
  );
  const pineMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.84,
      metalness: 0.02,
    })
  );
  const forgeGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfb923c,
      emissive: 0xea580c,
      emissiveIntensity: 0.95,
      roughness: 0.3,
    })
  );

  // =========================================================================
  // 1. UNDERWORLD TERRAIN MESH (Snowy Fjord Cliffs, Mountain Rim & Forest)
  // =========================================================================
  const seg = 96;
  const underGeo = trackGeo(
    new THREE.PlaneGeometry(ELBAF_WORLD_SIZE * S, ELBAF_WORLD_SIZE * S, seg, seg)
  );
  underGeo.rotateX(-Math.PI / 2);
  const uPos = underGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uPos.count; i++) {
    const ix = i % (seg + 1);
    const iz = Math.floor(i / (seg + 1));
    const lx = (ix / seg - 0.5) * ELBAF_WORLD_SIZE;
    const lz = (iz / seg - 0.5) * ELBAF_WORLD_SIZE;
    const cliffDist = elbafCliffSignedDist(lx, lz);
    const h = cliffDist > 2.2 ? -0.35 : sampleElbafUnderworldHeight(lx, lz);
    const sp = toElbafSphereLocal(lx, h, lz, globeRadius);
    uPos.setXYZ(i, sp.x, sp.y, sp.z);
  }
  underGeo.computeVertexNormals();
  const underMesh = new THREE.Mesh(underGeo, underTerrainMat);
  underMesh.name = 'elbaf-underworld-terrain';
  group.add(underMesh);

  // =========================================================================
  // 2. SUN WORLD PLATEAU DECK & CANOPY UNDERSIDE (Middle Tier y ~ 66..78m)
  // =========================================================================
  const sunSpan = 140;
  const sunSeg = 88;
  const sunGeo = trackGeo(
    new THREE.PlaneGeometry(sunSpan * S, sunSpan * S, sunSeg, sunSeg)
  );
  sunGeo.rotateX(-Math.PI / 2);
  const sPos = sunGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sPos.count; i++) {
    const ix = i % (sunSeg + 1);
    const iz = Math.floor(i / (sunSeg + 1));
    const lx = (ix / sunSeg - 0.5) * sunSpan;
    const lz = (iz / sunSeg - 0.5) * sunSpan;
    const nr = elbafSunWorldNormRadius(lx, lz);
    const h =
      nr >= 1.04
        ? ELBAF_SUNWORLD_Y - 5.5
        : sampleElbafSunWorldHeight(lx, lz) || ELBAF_SUNWORLD_Y - 4.0;
    const sp = toElbafSphereLocal(lx, h, lz, globeRadius);
    sPos.setXYZ(i, sp.x, sp.y, sp.z);
  }
  sunGeo.computeVertexNormals();
  const sunMesh = new THREE.Mesh(sunGeo, sunTerrainMat);
  sunMesh.name = 'elbaf-sunworld-deck';
  group.add(sunMesh);

  // Solid thick timber/canopy belly supporting Sun World above Underworld
  const sunBelly = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(54 * S, 41 * S, 8.5 * S, 36)),
    barkMat
  );
  placeOnElbafSphere(sunBelly, 0, ELBAF_SUNWORLD_Y - 4.8, 0, globeRadius);
  group.add(sunBelly);

  // =========================================================================
  // 3. TREASURE TREE ADAM (Yggdrasil Colossal Fluted Trunk, Roots & Boughs)
  // =========================================================================
  // Flared fluted trunk rising continuously from ocean roots (0m) to Heaven Crown (134m)
  const trunkPoints: THREE.Vector2[] = [
    new THREE.Vector2(25.5 * S, 0 * S),
    new THREE.Vector2(19.5 * S, 18 * S),
    new THREE.Vector2(16.2 * S, 44 * S),
    new THREE.Vector2(15.2 * S, 68 * S),
    new THREE.Vector2(13.8 * S, 96 * S),
    new THREE.Vector2(13.2 * S, 118 * S),
    new THREE.Vector2(18.5 * S, 128 * S),
    new THREE.Vector2(2.0 * S, 134 * S),
  ];
  const trunkMesh = new THREE.Mesh(
    trackGeo(new THREE.LatheGeometry(trunkPoints, 24)),
    barkMat
  );
  placeOnElbafSphere(trunkMesh, ELBAF_TRUNK_CENTER.x, 0, ELBAF_TRUNK_CENTER.z, globeRadius);
  group.add(trunkMesh);

  // Colossal sweeping Root Buttresses in Underworld & Bough Struts under Sun World & Heaven World
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);

    // Underworld Root Buttress
    const rootCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(
        toElbafSphereLocal(ca * 13, 28, sa * 13 - 2, globeRadius).x,
        toElbafSphereLocal(ca * 13, 28, sa * 13 - 2, globeRadius).y,
        toElbafSphereLocal(ca * 13, 28, sa * 13 - 2, globeRadius).z
      ),
      new THREE.Vector3(
        toElbafSphereLocal(ca * 24, 15, sa * 24 - 2, globeRadius).x,
        toElbafSphereLocal(ca * 24, 15, sa * 24 - 2, globeRadius).y,
        toElbafSphereLocal(ca * 24, 15, sa * 24 - 2, globeRadius).z
      ),
      new THREE.Vector3(
        toElbafSphereLocal(ca * 36, 9, sa * 36 - 2, globeRadius).x,
        toElbafSphereLocal(ca * 36, 9, sa * 36 - 2, globeRadius).y,
        toElbafSphereLocal(ca * 36, 9, sa * 36 - 2, globeRadius).z
      ),
    ]);
    group.add(new THREE.Mesh(trackGeo(new THREE.TubeGeometry(rootCurve, 10, 2.5 * S, 7, false)), barkMat));

    // Mid-Tier Sun World Supporting Great Bough
    const sunBoughCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(
        toElbafSphereLocal(ca * 11, 46, sa * 11 - 2, globeRadius).x,
        toElbafSphereLocal(ca * 11, 46, sa * 11 - 2, globeRadius).y,
        toElbafSphereLocal(ca * 11, 46, sa * 11 - 2, globeRadius).z
      ),
      new THREE.Vector3(
        toElbafSphereLocal(ca * 30, 58, sa * 30 - 2, globeRadius).x,
        toElbafSphereLocal(ca * 30, 58, sa * 30 - 2, globeRadius).y,
        toElbafSphereLocal(ca * 30, 58, sa * 30 - 2, globeRadius).z
      ),
      new THREE.Vector3(
        toElbafSphereLocal(ca * 52, 62, sa * 52 - 2, globeRadius).x,
        toElbafSphereLocal(ca * 52, 62, sa * 52 - 2, globeRadius).y,
        toElbafSphereLocal(ca * 52, 62, sa * 52 - 2, globeRadius).z
      ),
    ]);
    group.add(new THREE.Mesh(trackGeo(new THREE.TubeGeometry(sunBoughCurve, 10, 2.3 * S, 7, false)), barkMat));

    // Upper-Tier Heaven World Supporting Bough
    const heavenBoughCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(
        toElbafSphereLocal(ca * 10, 106, sa * 10 - 2, globeRadius).x,
        toElbafSphereLocal(ca * 10, 106, sa * 10 - 2, globeRadius).y,
        toElbafSphereLocal(ca * 10, 106, sa * 10 - 2, globeRadius).z
      ),
      new THREE.Vector3(
        toElbafSphereLocal(ca * 24, 118, sa * 24 - 2, globeRadius).x,
        toElbafSphereLocal(ca * 24, 118, sa * 24 - 2, globeRadius).y,
        toElbafSphereLocal(ca * 24, 118, sa * 24 - 2, globeRadius).z
      ),
      new THREE.Vector3(
        toElbafSphereLocal(ca * 38, 123, sa * 38 - 2, globeRadius).x,
        toElbafSphereLocal(ca * 38, 123, sa * 38 - 2, globeRadius).y,
        toElbafSphereLocal(ca * 38, 123, sa * 38 - 2, globeRadius).z
      ),
    ]);
    group.add(new THREE.Mesh(trackGeo(new THREE.TubeGeometry(heavenBoughCurve, 10, 2.0 * S, 7, false)), barkMat));
  }

  // =========================================================================
  // 4. SUN WORLD & HEAVEN WORLD FOLIAGE CANOPY CLUSTERS (InstancedMesh)
  // =========================================================================
  // Heaven World Upper Crown Dome + Canopy Clusters
  const heavenCrownMesh = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(43.5 * S, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.56)),
    canopyMat
  );
  heavenCrownMesh.scale.set(1.0, 0.36, 0.94);
  placeOnElbafSphere(heavenCrownMesh, 0, ELBAF_HEAVEN_Y - 2.0, -2, globeRadius);
  group.add(heavenCrownMesh);

  // Sacred Heaven World Rune Monolith Crest at Summit (visible cleanly above crown foliage)
  const shrineGroup = new THREE.Group();
  const shrineBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(8.2 * S, 10.5 * S, 4.8 * S, 8)),
    stoneMat
  );
  shrineBase.position.y = 1.6 * S;
  shrineGroup.add(shrineBase);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const monolith = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.5 * S, 6.8 * S, 1.1 * S)),
      stoneMat
    );
    monolith.position.set(Math.cos(ang) * 6.4 * S, 5.2 * S, Math.sin(ang) * 6.4 * S);
    monolith.rotation.y = -ang;
    shrineGroup.add(monolith);
  }
  const shrineAltar = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.6 * S, 2.2 * S, 2.6 * S, 8)),
    goldTrimMat
  );
  shrineAltar.position.y = 4.6 * S;
  shrineGroup.add(shrineAltar);
  const shrineArch = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(4.2 * S, 0.65 * S, 10, 22, Math.PI)),
    goldTrimMat
  );
  shrineArch.position.y = 6.4 * S;
  shrineGroup.add(shrineArch);
  placeOnElbafSphere(shrineGroup, 0, sampleElbafHeavenHeight(0, -2) + 2.6, -2, globeRadius);
  group.add(shrineGroup);

  // Instanced foliage mounds rimming Sun World & Heaven World (matches green leafy shelves!)
  const foliageGeo = trackGeo(new THREE.IcosahedronGeometry(5.2 * S, 1));
  const rimFoliageCount = 136;
  const heavenFoliageCount = 72;
  const totalFoliage = rimFoliageCount + heavenFoliageCount;
  const foliageInst = new THREE.InstancedMesh(foliageGeo, foliageInstanceMat, totalFoliage);
  const leafPalette = [0x15803d, 0x16a34a, 0x22c55e, 0x4ade80, 0x84cc16, 0x65a30d];

  let fIdx = 0;
  for (let i = 0; i < rimFoliageCount; i++) {
    const ang = (i / rimFoliageCount) * Math.PI * 2 + seededRand(i * 3.1) * 0.14;
    const radFrac = 0.88 + seededRand(i * 7.7) * 0.17;
    const lx = Math.cos(ang) * 56.5 * radFrac;
    const lz = Math.sin(ang) * 51.5 * radFrac;
    const ly = ELBAF_SUNWORLD_Y - 2.6 + (seededRand(i * 5.3) - 0.3) * 4.8;
    const sp = toElbafSphereLocal(lx, ly, lz, globeRadius);
    _dummy.position.set(sp.x, sp.y, sp.z);
    _localNormal.set(sp.x, globeRadius + sp.y, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, seededRand(i * 11.1) * Math.PI * 2);
    _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    const sx = (0.85 + seededRand(i * 13.7) * 0.65) * 1.15;
    const sy = 0.58 + seededRand(i * 17.3) * 0.35;
    _dummy.scale.set(sx, sy, sx * 0.92);
    _dummy.updateMatrix();
    foliageInst.setMatrixAt(fIdx, _dummy.matrix);
    _color.setHex(leafPalette[i % leafPalette.length]);
    foliageInst.setColorAt(fIdx, _color);
    fIdx++;
  }

  for (let i = 0; i < heavenFoliageCount; i++) {
    const ring = i < 48 ? 0.92 : 0.62;
    const ang = (i / (i < 48 ? 48 : 24)) * Math.PI * 2 + seededRand(i * 9.3) * 0.25;
    const lx = Math.cos(ang) * 41.5 * ring;
    const lz = Math.sin(ang) * 38.5 * ring - 2;
    const ly = ELBAF_HEAVEN_Y + (i < 48 ? 0.5 : 8.5) + seededRand(i * 4.9) * 3.5;
    const sp = toElbafSphereLocal(lx, ly, lz, globeRadius);
    _dummy.position.set(sp.x, sp.y, sp.z);
    _localNormal.set(sp.x, globeRadius + sp.y, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, seededRand(i * 19.7) * Math.PI * 2);
    _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    const sx = 1.05 + seededRand(i * 23.1) * 0.65;
    const sy = 0.62 + seededRand(i * 29.3) * 0.32;
    _dummy.scale.set(sx, sy, sx);
    _dummy.updateMatrix();
    foliageInst.setMatrixAt(fIdx, _dummy.matrix);
    _color.setHex(i < 48 ? leafPalette[(i + 1) % leafPalette.length] : 0xa3e635);
    foliageInst.setColorAt(fIdx, _color);
    fIdx++;
  }
  foliageInst.instanceMatrix.needsUpdate = true;
  if (foliageInst.instanceColor) foliageInst.instanceColor.needsUpdate = true;
  foliageInst.computeBoundingSphere();
  group.add(foliageInst);

  // =========================================================================
  // 5. AURUST CASTLE & VIKING BRIDGE (West Bluff, elbaf3 & elbaf4 refs)
  // =========================================================================
  const aurustGroup = new THREE.Group();
  const aurustGroundY = sampleElbafSunWorldHeight(ELBAF_AURUST_CENTER.x, ELBAF_AURUST_CENTER.z);
  placeOnElbafSphere(
    aurustGroup,
    ELBAF_AURUST_CENTER.x,
    aurustGroundY - 0.4,
    ELBAF_AURUST_CENTER.z,
    globeRadius,
    0.42
  );

  // Fortress curtain terrace & stone walls
  const castleKeep = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(10.5 * S, 8.5 * S, 8.5 * S)),
    stoneMat
  );
  castleKeep.position.y = 4.25 * S;
  aurustGroup.add(castleKeep);

  // Tall Central Watchtower (elbaf3_7ca3eb93.jpg cylindrical stone keep + battlements)
  const mainTower = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(3.1 * S, 3.5 * S, 16.5 * S, 16)),
    stoneMat
  );
  mainTower.position.set(-1.2 * S, 8.2 * S, -0.8 * S);
  aurustGroup.add(mainTower);
  const battlementCrown = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(3.65 * S, 3.3 * S, 2.2 * S, 16)),
    stoneMat
  );
  battlementCrown.position.set(-1.2 * S, 16.5 * S, -0.8 * S);
  aurustGroup.add(battlementCrown);

  // Flanking Turrets with Steep Blue & Red Conical Nordic Spires
  const turretSpecs: [number, number, number, number, boolean][] = [
    [3.8, 3.2, 11.0, 2.1, true],
    [-4.4, 3.4, 10.5, 2.0, false],
    [4.0, -3.4, 12.2, 2.2, false],
    [-4.2, -3.2, 9.8, 1.9, true],
  ];
  for (const [tx, tz, th, tr, isRed] of turretSpecs) {
    const shaft = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(tr * S, (tr + 0.3) * S, th * S, 12)),
      stoneMat
    );
    shaft.position.set(tx * S, (th * 0.5) * S, tz * S);
    aurustGroup.add(shaft);
    const spire = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry((tr + 0.55) * S, (th * 0.55) * S, 12)),
      isRed ? spireRedMat : spireBlueMat
    );
    spire.position.set(tx * S, (th + th * 0.27) * S, tz * S);
    aurustGroup.add(spire);
    const finial = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.42 * S, 8, 8)),
      goldTrimMat
    );
    finial.position.set(tx * S, (th + th * 0.55) * S, tz * S);
    aurustGroup.add(finial);
  }

  // East Castle Gatehouse Wall facing West Village
  const gateWall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.2 * S, 5.6 * S, 7.2 * S)),
    stoneMat
  );
  gateWall.position.set(6.4 * S, 2.8 * S, 1.2 * S);
  aurustGroup.add(gateWall);
  const gateArch = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(1.6 * S, 0.45 * S, 8, 16, Math.PI)),
    goldTrimMat
  );
  gateArch.rotation.y = Math.PI * 0.5;
  gateArch.position.set(7.5 * S, 2.2 * S, 1.2 * S);
  aurustGroup.add(gateArch);
  group.add(aurustGroup);

  // Arched Stone & Timber Viking Bridge over West Waterfall Gully (-32, 6)
  const bridgeGroup = new THREE.Group();
  const bridgeDeck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(11.0 * S, 1.1 * S, 3.6 * S)),
    stoneMat
  );
  bridgeDeck.position.y = 2.6 * S;
  bridgeGroup.add(bridgeDeck);
  const bridgeArchSpan = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(4.5 * S, 0.7 * S, 8, 20, Math.PI)),
    stoneMat
  );
  bridgeArchSpan.position.y = -0.2 * S;
  bridgeGroup.add(bridgeArchSpan);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(11.0 * S, 0.75 * S, 0.35 * S)),
      darkTimberMat
    );
    rail.position.set(0, 3.55 * S, side * 1.65 * S);
    bridgeGroup.add(rail);
  }
  placeOnElbafSphere(
    bridgeGroup,
    -31.0,
    sampleElbafSunWorldHeight(-31.0, 2.5) + 0.5,
    2.5,
    globeRadius,
    0.45
  );
  group.add(bridgeGroup);

  // =========================================================================
  // 6. VIKING LONGHOUSES, CHIEFTAIN'S HALL, WATCHTOWER & OWL LIBRARY
  // =========================================================================
  function buildVikingLonghouse(scaleFactor: number): THREE.Group {
    const hGroup = new THREE.Group();
    const w = 4.6 * scaleFactor * S;
    const h = 3.2 * scaleFactor * S;
    const d = 7.4 * scaleFactor * S;

    // Stone foundation plinth
    const plinth = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(w * 1.08, 0.75 * scaleFactor * S, d * 1.06)),
      stoneMat
    );
    plinth.position.y = 0.35 * scaleFactor * S;
    hGroup.add(plinth);

    // Timber log cabin hall
    const body = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(w, h, d)),
      woodMat
    );
    body.position.y = 0.7 * scaleFactor * S + h * 0.5;
    hGroup.add(body);

    // Steep Pitched Terracotta Shingle Roof (2 angled slabs meeting at ridge)
    const roofSlope = Math.PI * 0.27;
    const slabW = w * 0.86;
    const slabH = 0.42 * scaleFactor * S;
    for (const side of [-1, 1]) {
      const slab = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(slabW, slabH, d * 1.12)),
        roofMat
      );
      slab.position.set(
        side * w * 0.31,
        0.7 * scaleFactor * S + h + w * 0.25,
        0
      );
      slab.rotation.z = -side * roofSlope;
      hGroup.add(slab);
    }

    // Iconic Crossed Viking Horned Gable Finials (front & back ridge ends!)
    const ridgeY = 0.7 * scaleFactor * S + h + w * 0.54;
    for (const endZ of [-1, 1]) {
      for (const hornSide of [-1, 1]) {
        const horn = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.36 * scaleFactor * S, 2.3 * scaleFactor * S, 0.34 * scaleFactor * S)),
          darkTimberMat
        );
        horn.position.set(hornSide * 0.45 * scaleFactor * S, ridgeY + 0.45 * scaleFactor * S, endZ * d * 0.54);
        horn.rotation.z = -hornSide * 0.46;
        hGroup.add(horn);
      }
      // Golden Shield Emblem beneath gable peak
      const shield = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.68 * scaleFactor * S, 0.68 * scaleFactor * S, 0.2 * scaleFactor * S, 14)),
        goldTrimMat
      );
      shield.rotation.x = Math.PI * 0.5;
      shield.position.set(0, 0.7 * scaleFactor * S + h * 0.82, endZ * (d * 0.52));
      hGroup.add(shield);
    }

    return hGroup;
  }

  // Named Sun World Villages (faithful to elbaf_76b189ed.webp & elbaf5/elbaf6)
  const longhousePlacements: [number, number, number, number][] = [
    // West Village (clustered near Aurust Castle & BR-8)
    [-33.5, 11.5, 1.05, 0.3],
    [-27.5, 15.5, 0.92, -0.5],
    [-37.0, 17.0, 0.95, 1.1],
    [-26.0, 7.5, 0.88, 0.8],
    // Huntsmen Village (NW)
    [-28.0, -30.0, 1.0, 0.6],
    [-21.5, -33.5, 0.88, -0.4],
    // Brew Village / Taverne (North)
    [4.0, -37.0, 1.15, 0.1],
    [11.5, -35.0, 0.92, -0.7],
    // Haugen (NE)
    [35.5, -24.0, 0.95, -0.9],
    // Fishermen Village (East)
    [41.5, 5.0, 1.0, 1.4],
    // Craftsmen Village (SE)
    [31.0, 23.0, 1.05, -0.5],
    [36.5, 18.0, 0.9, 0.4],
    // Walrus School (South-Southwest)
    [-20.5, 32.0, 1.05, 0.5],
  ];
  for (const [hx, hz, sc, yaw] of longhousePlacements) {
    const house = buildVikingLonghouse(sc);
    placeOnElbafSphere(
      house,
      hx,
      sampleElbafSunWorldHeight(hx, hz) - 0.15,
      hz,
      globeRadius,
      yaw
    );
    group.add(house);
  }

  // Chieftain's Grand Banquet Hall atop Central Promontory (-12, 14, elbaf5_85b7ca3d.jpg)
  const chieftainTerrace = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(6.8 * S, 8.8 * S, 5.2 * S, 12)),
    stoneMat
  );
  const chiefY = sampleElbafSunWorldHeight(ELBAF_CHIEFTAIN_CENTER.x, ELBAF_CHIEFTAIN_CENTER.z);
  placeOnElbafSphere(
    chieftainTerrace,
    ELBAF_CHIEFTAIN_CENTER.x,
    chiefY - 2.35,
    ELBAF_CHIEFTAIN_CENTER.z,
    globeRadius
  );
  group.add(chieftainTerrace);

  const chieftainHall = buildVikingLonghouse(1.55);
  placeOnElbafSphere(
    chieftainHall,
    ELBAF_CHIEFTAIN_CENTER.x,
    chiefY - 0.1,
    ELBAF_CHIEFTAIN_CENTER.z,
    globeRadius,
    0.22
  );
  group.add(chieftainHall);

  // Tall Multi-Tier Wooden Viking Watchtower (elbaf5_85b7ca3d.jpg & elbaf6_c2d792a6.jpg left skyline)
  const towerGroup = new THREE.Group();
  for (let tier = 0; tier < 5; tier++) {
    const w = (3.4 - tier * 0.22) * S;
    const deck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(w, 2.3 * S, w)),
      tier % 2 === 0 ? woodMat : darkTimberMat
    );
    deck.position.y = (1.15 + tier * 2.4) * S;
    towerGroup.add(deck);
    const rim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(w + 0.55 * S, 0.32 * S, w + 0.55 * S)),
      darkTimberMat
    );
    rim.position.y = (2.3 + tier * 2.4) * S;
    towerGroup.add(rim);
  }
  const watchRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(2.6 * S, 3.2 * S, 4)),
    roofMat
  );
  watchRoof.rotation.y = Math.PI * 0.25;
  watchRoof.position.y = 13.6 * S;
  towerGroup.add(watchRoof);
  placeOnElbafSphere(
    towerGroup,
    -21.5,
    sampleElbafSunWorldHeight(-21.5, 16.5) - 0.2,
    16.5,
    globeRadius,
    0.2
  );
  group.add(towerGroup);

  // Owl Library (Bibliothèque de la Chouette, -12, 28, canonical map)
  const libraryGroup = new THREE.Group();
  const libBody = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(4.2 * S, 4.8 * S, 6.2 * S, 12)),
    stoneMat
  );
  libBody.position.y = 3.1 * S;
  libraryGroup.add(libBody);
  const libRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(5.2 * S, 4.2 * S, 12)),
    spireBlueMat
  );
  libRoof.position.y = 8.2 * S;
  libraryGroup.add(libRoof);
  // Twin Owl-Wing Crest Gables on roof
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.4 * S, 2.6 * S, 0.5 * S)),
      goldTrimMat
    );
    wing.position.set(side * 2.0 * S, 8.8 * S, 2.8 * S);
    wing.rotation.z = -side * 0.42;
    libraryGroup.add(wing);
  }
  const libDoor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.0 * S, 3.2 * S, 1.2 * S)),
    darkTimberMat
  );
  libDoor.position.set(0, 1.6 * S, 4.3 * S);
  libraryGroup.add(libDoor);
  placeOnElbafSphere(
    libraryGroup,
    -12.0,
    sampleElbafSunWorldHeight(-12.0, 28.0) - 0.2,
    28.0,
    globeRadius,
    0.15
  );
  group.add(libraryGroup);

  // Craftsmen Forge Glow Mound (32, 22)
  const forgeHearth = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.6 * S, 2.2 * S, 1.6 * S, 10)),
    forgeGlowMat
  );
  placeOnElbafSphere(forgeHearth, 33.5, sampleElbafSunWorldHeight(33.5, 21.0) + 0.6, 21.0, globeRadius);
  group.add(forgeHearth);

  // =========================================================================
  // 7. COLOSSAL GIANT SWORD STABBED INTO SUN WORLD (elbaf_429ba98c & elbaf2)
  // =========================================================================
  const swordAnchor = new THREE.Group();
  const swordY = sampleElbafSunWorldHeight(18, 18);
  placeOnElbafSphere(swordAnchor, 18.5, swordY - 2.0, 18.0, globeRadius, -0.35);

  const swordPivot = new THREE.Group();
  swordPivot.rotation.z = -0.34; // iconic diagonal tilt seen in elbaf_429ba98c.jpg & elbaf2!
  swordPivot.rotation.x = 0.16;

  // Massive Rune Blade rising out of Sun World soil/canopy
  const blade = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.4 * S, 26.0 * S, 0.95 * S)),
    swordBladeMat
  );
  blade.position.y = 13.0 * S;
  swordPivot.add(blade);
  // Central fuller spine
  const fuller = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.95 * S, 25.0 * S, 1.35 * S)),
    goldTrimMat
  );
  fuller.position.y = 13.0 * S;
  swordPivot.add(fuller);
  // Giant Crossguard
  const crossguard = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(11.5 * S, 1.8 * S, 2.1 * S)),
    darkTimberMat
  );
  crossguard.position.y = 26.2 * S;
  swordPivot.add(crossguard);
  for (const side of [-1, 1]) {
    const cap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(1.35 * S, 10, 10)),
      spireRedMat
    );
    cap.position.set(side * 6.0 * S, 26.2 * S, 0);
    swordPivot.add(cap);
  }
  // Hilt Grip & Pommel
  const grip = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.95 * S, 1.05 * S, 7.2 * S, 12)),
    darkTimberMat
  );
  grip.position.y = 30.2 * S;
  swordPivot.add(grip);
  const pommel = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(1.7 * S, 12, 10)),
    goldTrimMat
  );
  pommel.position.y = 34.2 * S;
  swordPivot.add(pommel);
  swordAnchor.add(swordPivot);
  group.add(swordAnchor);

  // =========================================================================
  // 8. PAINTER'S RAINBOW BRIDGE (elbaf_429ba98c, elbaf3, elbaf4, elbaf5)
  // =========================================================================
  const rainbowCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(
      toElbafSphereLocal(20, 74, 24, globeRadius).x,
      toElbafSphereLocal(20, 74, 24, globeRadius).y,
      toElbafSphereLocal(20, 74, 24, globeRadius).z
    ),
    new THREE.Vector3(
      toElbafSphereLocal(42, 85, 32, globeRadius).x,
      toElbafSphereLocal(42, 85, 32, globeRadius).y,
      toElbafSphereLocal(42, 85, 32, globeRadius).z
    ),
    new THREE.Vector3(
      toElbafSphereLocal(60, 50, 42, globeRadius).x,
      toElbafSphereLocal(60, 50, 42, globeRadius).y,
      toElbafSphereLocal(60, 50, 42, globeRadius).z
    ),
    new THREE.Vector3(
      toElbafSphereLocal(70, 0.5, 52, globeRadius).x,
      toElbafSphereLocal(70, 0.5, 52, globeRadius).y,
      toElbafSphereLocal(70, 0.5, 52, globeRadius).z
    ),
  ]);
  const rainbowArcMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(rainbowCurve, 44, 1.9 * S, 10, false)),
    rainbowMat
  );
  group.add(rainbowArcMesh);

  // =========================================================================
  // 9. MONUMENTAL WATERFALLS (Heaven -> Sun World & Sun World -> Ocean!)
  // =========================================================================
  const waterfallSpecs: [number, number, number, number, number, number][] = [
    // [lx, lz, topY, bottomY, width, yaw]
    [-48, 28, ELBAF_SUNWORLD_Y - 1, 0.0, 5.8, 0.52],
    [-26, 51, ELBAF_SUNWORLD_Y - 1, 0.0, 5.4, 0.15],
    [44, 30, ELBAF_SUNWORLD_Y - 1, 0.0, 5.0, -0.58],
    [-38, -32, ELBAF_SUNWORLD_Y - 1, 0.0, 4.8, 0.8],
    // Upper Heaven -> Sun World Cascades (positioned clear of Aurust Castle & Giant Sword)
    [-26, -24, ELBAF_HEAVEN_Y - 1, ELBAF_SUNWORLD_Y + 2, 3.6, 0.35],
    [25, 8, ELBAF_HEAVEN_Y - 1, ELBAF_SUNWORLD_Y + 2, 3.4, -0.45],
    [-12, -32, ELBAF_HEAVEN_Y - 1, ELBAF_SUNWORLD_Y + 2, 3.2, 0.1],
  ];
  for (const [wx, wz, topY, botY, wWidth, wYaw] of waterfallSpecs) {
    const hSpan = (topY - botY) * S;
    const wfMesh = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(wWidth * S, hSpan, 1, 4)),
      waterfallMat
    );
    placeOnElbafSphere(wfMesh, wx, (topY + botY) * 0.5, wz, globeRadius, wYaw);
    group.add(wfMesh);
  }

  // =========================================================================
  // 10. UNDERWORLD FJORD HARBOR PIERS & GIANT VIKING DRAKKAR FLEET
  // =========================================================================
  const quayDeckMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7c5838, roughness: 0.85, metalness: 0.06 })
  );
  // Twin horizontal Viking Fjord Breakwater Piers (solid clean horizontal timber decks!)
  for (const [px, pz] of [
    [4.0, 61.5],
    [28.0, 60.5],
  ] as [number, number][]) {
    const pierGroup = new THREE.Group();
    const deck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.6 * S, 2.2 * S, 18.0 * S)),
      quayDeckMat
    );
    deck.position.y = 1.1 * S;
    pierGroup.add(deck);
    // Carved Dragon-head prow beacon at tip of each breakwater pier
    const prowNeck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.3 * S, 4.5 * S, 1.6 * S)),
      darkTimberMat
    );
    prowNeck.position.set(0, 3.4 * S, 8.2 * S);
    prowNeck.rotation.x = 0.25;
    pierGroup.add(prowNeck);
    const prowHorn = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.1 * S, 2.6 * S, 6)),
      goldTrimMat
    );
    prowHorn.position.set(0, 5.6 * S, 8.9 * S);
    prowHorn.rotation.x = 0.45;
    pierGroup.add(prowHorn);
    placeOnElbafSphere(pierGroup, px, 0, pz, globeRadius, 0);
    group.add(pierGroup);
  }
  // Inner Harbor Quay Walk (16, 48)
  const innerQuay = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(22.0 * S, 2.6 * S, 7.0 * S)),
    quayDeckMat
  );
  placeOnElbafSphere(innerQuay, 16.0, 1.3, 47.0, globeRadius, 0);
  group.add(innerQuay);

  // Giant Viking Drakkars (Composite ships with dragon prow & striped square sail)
  const drakkarAnchors: {
    obj: THREE.Group;
    baseX: number;
    baseY: number;
    baseZ: number;
    nx: number;
    ny: number;
    nz: number;
  }[] = [];
  const drakkarSpecs: [number, number, number, number][] = [
    [13.0, 58.0, 0.2, 1.0],
    [21.5, 65.5, -0.35, 0.95],
    [48.0, 74.0, -0.8, 1.05],
    [-46.0, 68.0, 0.75, 1.0],
  ];
  for (const [dx, dz, dyaw, dScale] of drakkarSpecs) {
    const ship = new THREE.Group();
    const hull = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.2 * dScale * S, 1.8 * dScale * S, 10.5 * dScale * S)),
      darkTimberMat
    );
    hull.position.y = 0.9 * dScale * S;
    ship.add(hull);
    const dragonProw = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.95 * dScale * S, 3.8 * dScale * S, 6)),
      goldTrimMat
    );
    dragonProw.position.set(0, 3.0 * dScale * S, 5.6 * dScale * S);
    dragonProw.rotation.x = 0.35;
    ship.add(dragonProw);
    const mast = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.28 * dScale * S, 0.34 * dScale * S, 8.2 * dScale * S, 8)),
      woodMat
    );
    mast.position.y = 5.0 * dScale * S;
    ship.add(mast);
    const sail = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(5.8 * dScale * S, 5.2 * dScale * S)),
      sailMat
    );
    sail.position.set(0, 5.4 * dScale * S, 0.35 * dScale * S);
    ship.add(sail);

    placeOnElbafSphere(ship, dx, 0, dz, globeRadius, dyaw);
    group.add(ship);
    const len = Math.hypot(ship.position.x, globeRadius + ship.position.y, ship.position.z);
    drakkarAnchors.push({
      obj: ship,
      baseX: ship.position.x,
      baseY: ship.position.y,
      baseZ: ship.position.z,
      nx: ship.position.x / len,
      ny: (globeRadius + ship.position.y) / len,
      nz: ship.position.z / len,
    });
  }

  // =========================================================================
  // 11. INSTANCED PINE FORESTS, ROCKY CRAGS & FLOATING SKY CLOUDS
  // =========================================================================
  // Underworld & Sun World Giant Nordic Pines
  const pineConeGeo = trackGeo(new THREE.ConeGeometry(2.1 * S, 7.6 * S, 7));
  const pinePositions: [number, number, number, number][] = [];
  for (let i = 0; i < 160; i++) {
    const lx = (seededRand(i * 19.1 + 2.3) - 0.5) * 124;
    const lz = (seededRand(i * 31.7 + 4.9) - 0.5) * 114;
    const cliffDist = elbafCliffSignedDist(lx, lz);
    const rTrunk = Math.hypot(lx - ELBAF_TRUNK_CENTER.x, lz - ELBAF_TRUNK_CENTER.z);
    if (cliffDist < -4.0 && rTrunk > 18.0 && Math.hypot(lx - 16, lz - 54) > 15.0) {
      const h = sampleElbafUnderworldHeight(lx, lz);
      if (h > 4.0) {
        pinePositions.push([lx, h - 0.3, lz, 0.85 + seededRand(i * 7.3) * 0.65]);
      }
    }
  }
  // Sun World Pines around villages & river valley
  for (let i = 0; i < 65; i++) {
    const ang = seededRand(i * 43.1 + 9.2) * Math.PI * 2;
    const rad = 19.0 + seededRand(i * 17.9 + 3.1) * 32.0;
    const lx = Math.cos(ang) * rad;
    const lz = Math.sin(ang) * rad * 0.92;
    // Keep clear of Aurust keep & Chieftain plaza centers
    if (
      Math.hypot(lx - ELBAF_AURUST_CENTER.x, lz - ELBAF_AURUST_CENTER.z) > 9.5 &&
      Math.hypot(lx - ELBAF_CHIEFTAIN_CENTER.x, lz - ELBAF_CHIEFTAIN_CENTER.z) > 8.5 &&
      Math.hypot(lx - 18, lz - 18) > 7.5 &&
      elbafSunWorldNormRadius(lx, lz) < 0.94
    ) {
      const h = sampleElbafSunWorldHeight(lx, lz);
      pinePositions.push([lx, h - 0.25, lz, 0.65 + seededRand(i * 11.7) * 0.45]);
    }
  }

  const pineInst = new THREE.InstancedMesh(pineConeGeo, pineMat, pinePositions.length);
  for (let i = 0; i < pinePositions.length; i++) {
    const [px, py, pz, sc] = pinePositions[i];
    const sp = toElbafSphereLocal(px, py + 3.4 * sc, pz, globeRadius);
    _dummy.position.set(sp.x, sp.y, sp.z);
    _localNormal.set(sp.x, globeRadius + sp.y, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, seededRand(i * 13.3) * Math.PI * 2);
    _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    _dummy.scale.set(sc, sc * (0.95 + seededRand(i * 5.7) * 0.3), sc);
    _dummy.updateMatrix();
    pineInst.setMatrixAt(i, _dummy.matrix);
    const isSnow = py < 40 && py > 15.5;
    _color.setHex(isSnow ? (i % 2 === 0 ? 0x2d5a4c : 0xcbd5e1) : i % 2 === 0 ? 0x166534 : 0x15803d);
    pineInst.setColorAt(i, _color);
  }
  pineInst.instanceMatrix.needsUpdate = true;
  if (pineInst.instanceColor) pineInst.instanceColor.needsUpdate = true;
  pineInst.computeBoundingSphere();
  group.add(pineInst);

  // Underworld Jagged Sea Crags
  const cragGeo = trackGeo(new THREE.DodecahedronGeometry(3.2 * S, 0));
  const cragInst = new THREE.InstancedMesh(cragGeo, cragRockMat, 26);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + 0.1;
    const rad = 62.5 + seededRand(i * 15.1) * 5.5;
    const lx = Math.cos(a) * rad;
    const lz = Math.sin(a) * rad * 0.91;
    const sp = toElbafSphereLocal(lx, 1.2, lz, globeRadius);
    _dummy.position.set(sp.x, sp.y, sp.z);
    _localNormal.set(sp.x, globeRadius + sp.y, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, i * 1.1);
    _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    _dummy.scale.set(1.1 + seededRand(i) * 0.6, 1.5 + seededRand(i + 4) * 1.2, 1.0);
    _dummy.updateMatrix();
    cragInst.setMatrixAt(i, _dummy.matrix);
    _color.setHex(i % 2 === 0 ? 0x475569 : 0x64748b);
    cragInst.setColorAt(i, _color);
  }
  cragInst.instanceMatrix.needsUpdate = true;
  if (cragInst.instanceColor) cragInst.instanceColor.needsUpdate = true;
  cragInst.computeBoundingSphere();
  group.add(cragInst);

  // Floating Puffy Clouds around Sun World, Heaven World & Svalr Overlook (clear of camera sightlines)
  const cloudPuffGeo = trackGeo(new THREE.SphereGeometry(5.2 * S, 12, 10));
  const cloudCenters: [number, number, number, number][] = [
    [-54, 88, 22, 1.05],
    [52, 96, 10, 1.1],
    [-26, 114, -38, 1.2],
    [36, 122, -28, 1.15],
    [-42, 134, -8, 1.15],
    [44, 138, 16, 1.1],
    [-6, 86, -42, 1.0],
  ];
  const cloudGroup = new THREE.Group();
  for (const [cx, cy, cz, cs] of cloudCenters) {
    const cluster = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const puff = new THREE.Mesh(cloudPuffGeo, cloudMat);
      puff.position.set((k - 1.5) * 3.1 * cs * S, (k % 2) * 1.1 * cs * S, ((k * 3) % 2 - 0.5) * 1.8 * cs * S);
      puff.scale.set(cs * 1.25, cs * 0.52, cs * 0.95);
      cluster.add(puff);
    }
    placeOnElbafSphere(cluster, cx, cy, cz, globeRadius, cx * 0.1);
    cloudGroup.add(cluster);
  }
  group.add(cloudGroup);

  // Underworld Soft Feathered Misty Veil Ring shrouding mountain base (elbaf_429ba98c & elbaf2)
  const mistCyl = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(58 * S, 64 * S, 16 * S, 36, 1, true)),
    mistMat
  );
  placeOnElbafSphere(mistCyl, 0, 21.0, 0, globeRadius);
  group.add(mistCyl);

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      // Animate cascading waterfalls & gentle drakkar sea swell (zero allocations)
      waterfallTex.offset.y = -elapsed * 0.65;
      forgeGlowMat.emissiveIntensity = 0.8 + Math.sin(elapsed * 4.2) * 0.2;
      for (let i = 0; i < drakkarAnchors.length; i++) {
        const d = drakkarAnchors[i];
        const bob = Math.sin(elapsed * 1.4 + i * 1.7) * 0.16 * S;
        d.obj.position.set(
          d.baseX + d.nx * bob,
          d.baseY + d.ny * bob,
          d.baseZ + d.nz * bob
        );
      }
    },
  };
}
