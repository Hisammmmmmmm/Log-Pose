import * as THREE from 'three';
import {
  ANGEL_BAY_CENTER,
  ANGEL_PIER_END,
  ANGEL_PIER_START,
  GIANT_JACK_CENTER,
  JUNGLE_BUTTE_CENTER,
  SHANDORA_PYRAMID_CENTER,
  SHANDORA_RUINS_NW,
  SHANDORA_RUINS_SW,
  SKYPIEA_ALTITUDE,
  SKYPIEA_BRIDGES,
  SKYPIEA_GLOBE_SCALE,
  SKYPIEA_WORLD_SIZE,
  UPPER_YARD_CENTER,
  UPPER_YARD_PLATEAU_Y,
  buildSkypieaHouses,
  buildSkypieaTrees,
  sampleSkypieaHeight,
  sampleUpperYardRamp,
  skypieaCoastSignedDist,
  skypieaRiverSignedDist,
  skypieaRoadSignedDist,
  toSkypieaSphereLocal,
} from '../utils/skypieaTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = SKYPIEA_GLOBE_SCALE;
const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);
const _localNormal = new THREE.Vector3();
const _tiltQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();
const _xAxis = new THREE.Vector3(1, 0, 0);
const _yAxis = new THREE.Vector3(0, 1, 0);
const _pitchQuat = new THREE.Quaternion();

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const c = clamp(t, 0, 1);
  return [
    a[0] + (b[0] - a[0]) * c,
    a[1] + (b[1] - a[1]) * c,
    a[2] + (b[2] - a[2]) * c,
  ];
}

function createSkypieaTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = SKYPIEA_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * SKYPIEA_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * SKYPIEA_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const coastD = skypieaCoastSignedDist(x, z);
      const riverD = skypieaRiverSignedDist(x, z);
      const roadD = skypieaRoadSignedDist(x, z);
      const h = sampleSkypieaHeight(x, z);

      const hx = sampleSkypieaHeight(x + 1.1, z);
      const hz = sampleSkypieaHeight(x, z + 1.1);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 2.0, 0, 1);

      const fineGrain = (valueNoise2D(x * 1.45, z * 1.45) - 0.5) * 14;
      const mossPatch = valueNoise2D(x * 0.08 + 3.1, z * 0.08 + 7.4);

      // Rich lush tropical jungle floor base
      let rgb = mixRgb([46, 98, 42], [74, 134, 56], mossPatch);

      // Golden-white Angel Beach crescent sand
      const bayR = Math.hypot(x - ANGEL_BAY_CENTER.x, z - ANGEL_BAY_CENTER.z);
      const beachMask =
        x > 29 && x < 79 && z > 33 && z < 112 && bayR > 39 && bayR < 74
          ? smoothstep(29, 38, x) *
            (1 - smoothstep(66, 77, x)) *
            smoothstep(33, 41, z)
          : 0;
      if (beachMask > 0.01) {
        const wetSand = 1 - smoothstep(0, 3.2, -coastD);
        const sandCol = mixRgb([242, 224, 178], [218, 194, 148], wetSand * 0.65);
        rgb = mixRgb(rgb, sandCol, beachMask * 0.96);
      }

      // Riverbank damp earth & sandy shore highlights
      if (riverD > -0.4 && riverD < 2.1 && coastD < -0.5) {
        const bankT = 1 - smoothstep(0.1, 2.1, riverD);
        rgb = mixRgb(rgb, [166, 152, 108], bankT * 0.68);
      }

      // Steep rocky cliff strata (Upper Yard, coast cliffs, volcanic butte)
      if (slope > 0.28) {
        const rockT = smoothstep(0.28, 0.72, slope);
        const strata =
          Math.sin(h * 2.1 + valueNoise2D(x * 0.18, z * 0.18) * 2.5) * 14;
        const cliffCol: [number, number, number] = [
          138 + strata,
          104 + strata * 0.8,
          76 + strata * 0.6,
        ];
        rgb = mixRgb(rgb, cliffCol, rockT * 0.92);
      }

      // Upper Yard summit stone terrace & courtyard pavers
      const uyR = Math.hypot(x - UPPER_YARD_CENTER.x, z - UPPER_YARD_CENTER.z);
      if (uyR < 18.5) {
        const tile = ((Math.floor(x * 1.2) + Math.floor(z * 1.2)) & 1) === 0 ? 5 : -5;
        const plazaT = 1 - smoothstep(14, 18.5, uyR);
        rgb = mixRgb(rgb, [218 + tile, 196 + tile, 150 + tile], plazaT * 0.85);
      }

      // Shandora Ruins & Pyramid stone courtyard ground
      const nwRuinR = Math.hypot(x - SHANDORA_RUINS_NW.x, z - SHANDORA_RUINS_NW.z);
      const swRuinR = Math.hypot(x - SHANDORA_RUINS_SW.x, z - SHANDORA_RUINS_SW.z);
      const pyrR = Math.hypot(
        x - SHANDORA_PYRAMID_CENTER.x,
        z - SHANDORA_PYRAMID_CENTER.z
      );
      if (nwRuinR < 18 || swRuinR < 20 || pyrR < 16) {
        const tile = ((Math.floor(x * 1.1) + Math.floor(z * 1.1)) & 1) === 0 ? 6 : -6;
        const ruinT = Math.max(
          1 - smoothstep(11, 18, nwRuinR),
          1 - smoothstep(13, 20, swRuinR),
          1 - smoothstep(10, 16, pyrR)
        );
        rgb = mixRgb(rgb, [148 + tile, 144 + tile, 114 + tile], ruinT * 0.72);
      }

      // Crisp winding dirt/sandstone footpaths ("les chemins")
      if (roadD < 0.7 && riverD > 0.3 && coastD < -0.5) {
        const roadT = 1 - smoothstep(-0.35, 0.7, roadD);
        const edgeMix = smoothstep(-0.6, 0.4, roadD);
        const pathCol = mixRgb([214, 190, 142], [176, 152, 102], edgeMix);
        rgb = mixRgb(rgb, pathCol, roadT * 0.94);
      }

      // Upper Yard uphill stone ramp coloring
      const uyRamp = sampleUpperYardRamp(x, z);
      if (uyRamp.weight > 0.35) {
        const stepBands = Math.sin((x - z) * 2.5) * 6;
        rgb = mixRgb(
          rgb,
          [208 + stepBands, 184 + stepBands, 138 + stepBands],
          0.88
        );
      }

      // Darken outer cliff lip for crisp separation against the sky
      if (coastD > -1.4 && coastD < 2.2) {
        const rimT = smoothstep(-1.4, 1.0, coastD);
        rgb = mixRgb(rgb, [118, 92, 68], rimT * 0.72);
      }

      // Crisp organic alpha mask outside landmass & satellite islets (eliminates square slab)
      const landAlpha = 1 - smoothstep(0.3, 2.2, coastD);

      data[idx] = clamp(Math.round(rgb[0] + fineGrain), 0, 255);
      data[idx + 1] = clamp(Math.round(rgb[1] + fineGrain * 0.9), 0, 255);
      data[idx + 2] = clamp(Math.round(rgb[2] + fineGrain * 0.75), 0, 255);
      data[idx + 3] = clamp(Math.round(landAlpha * 255), 0, 255);
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Generates a 512x512 swirling hurricane cloud vortex texture for Giant Jack's eye.
 */
function createCloudVortexTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = size * 0.5;

  for (let py = 0; py < size; py++) {
    const dy = (py - half) / half;
    for (let px = 0; px < size; px++) {
      const dx = (px - half) / half;
      const idx = (py * size + px) * 4;
      const r = Math.hypot(dx, dy);
      if (r >= 1) {
        data[idx + 3] = 0;
        continue;
      }

      const angle = Math.atan2(dy, dx);
      const spiral =
        Math.sin(angle * 4 - r * 14.5) * 0.5 +
        Math.sin(angle * 7 - r * 22.0 + 1.4) * 0.3 +
        (valueNoise2D((dx + 1) * 5.2, (dy + 1) * 5.2) - 0.5) * 0.45;
      const ringMask =
        smoothstep(0.14, 0.28, r) * (1 - smoothstep(0.68, 0.98, r));
      const bandDensity = clamp(0.56 + spiral * 0.44, 0, 1);
      const alpha = ringMask * bandDensity * 0.9;

      const shade = mixRgb([214, 232, 250], [255, 255, 255], bandDensity);
      data[idx] = Math.round(shade[0]);
      data[idx + 1] = Math.round(shade[1]);
      data[idx + 2] = Math.round(shade[2]);
      data[idx + 3] = Math.round(clamp(alpha, 0, 1) * 255);
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createTileableMicroBumpTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n =
        valueNoise2D((x / size) * 24, (y / size) * 24) * 0.65 +
        valueNoise2D((x / size) * 64, (y / size) * 64) * 0.35;
      const v = clamp(Math.round(n * 255), 0, 255);
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

/**
 * Generates RGBA texture for Angel Bay sky-blue cloud lagoon & meandering turquoise rivers.
 */
function createSkypieaWaterTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = SKYPIEA_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * SKYPIEA_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * SKYPIEA_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const coastD = skypieaCoastSignedDist(x, z);
      const riverD = skypieaRiverSignedDist(x, z);
      const bayR = Math.hypot(x - ANGEL_BAY_CENTER.x, z - ANGEL_BAY_CENTER.z);

      let rgb: [number, number, number] = [56, 152, 214];
      let alpha = 0;

      // Meandering turquoise jungle rivers
      if (coastD < 2.0 && riverD < 1.3) {
        const centerT = clamp(-riverD / 2.6, 0, 1);
        rgb = mixRgb([96, 218, 224], [32, 138, 178], centerT);
        alpha = (1 - smoothstep(-0.3, 1.3, riverD)) * 0.94;
      } else if (bayR < 52 && coastD > -1.0) {
        // Angel Bay circular sky-blue water with submerged cloud wisps
        const cloudSwirl =
          valueNoise2D(x * 0.09 + 2.1, z * 0.09 + 5.7) * 0.65 +
          valueNoise2D(x * 0.22 + 8.3, z * 0.22 + 1.4) * 0.35;
        const deepT = smoothstep(0, 18, coastD);
        rgb = mixRgb([92, 194, 232], [44, 114, 186], deepT);
        rgb = mixRgb(rgb, [168, 214, 244], smoothstep(0.55, 0.85, cloudSwirl) * 0.45);
        const shoreFade = 1 - smoothstep(42, 54, bayR) * smoothstep(2, 14, coastD);
        alpha = clamp(0.86 * shoreFade, 0, 0.92);
      }

      data[idx] = Math.round(rgb[0]);
      data[idx + 1] = Math.round(rgb[1]);
      data[idx + 2] = Math.round(rgb[2]);
      data[idx + 3] = Math.round(clamp(alpha, 0, 1) * 255);
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createOnionDomeGeometry(radius: number, height: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const baseCurve =
      0.84 * Math.cos(t * Math.PI * 0.5) + Math.sin(t * Math.PI) * 0.56;
    const r = Math.max(0.0008, radius * baseCurve * (1 - 0.12 * t));
    pts.push(new THREE.Vector2(r, t * height));
  }
  pts.push(new THREE.Vector2(0.0008, height * 1.24));
  return new THREE.LatheGeometry(pts, 18);
}

function createPalmCrownGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const frondCount = 8;

  for (let i = 0; i < frondCount; i++) {
    const yaw = (i / frondCount) * Math.PI * 2 + (i % 2) * 0.2;
    const pitchDrop = i % 2 === 0 ? 0.26 : 0.46;
    const length = 1.45 + (i % 3) * 0.14;
    const width = 0.26;

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const baseIdx = positions.length / 3;
    const segs = 4;

    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const r = t * length;
      const yOff = Math.sin(t * Math.PI * 0.72) * 0.3 - t * t * pitchDrop;
      const halfW = width * Math.sin(clamp(t, 0.08, 0.95) * Math.PI);
      const cx = cosY * r;
      const cz = sinY * r;
      const lx = -sinY * halfW;
      const lz = cosY * halfW;
      positions.push(cx - lx, yOff, cz - lz);
      positions.push(cx + lx, yOff, cz + lz);
      normals.push(0, 1, 0, 0, 1, 0);
    }

    for (let s = 0; s < segs; s++) {
      const a = baseIdx + s * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function setSphereInstMatrix(
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch: number,
  sx: number,
  sy: number,
  sz: number,
  globeRadius: number
): THREE.Matrix4 {
  const baseR = globeRadius + SKYPIEA_ALTITUDE;
  const pos = toSkypieaSphereLocal(x, y, z, globeRadius);
  _localNormal.set(pos.x, baseR + pos.y, pos.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
  if (pitch !== 0) {
    _pitchQuat.setFromAxisAngle(_xAxis, pitch);
    _dummy.quaternion.multiply(_pitchQuat);
  }
  _dummy.position.set(pos.x, pos.y, pos.z);
  _dummy.scale.set(sx * S, sy * S, sz * S);
  _dummy.updateMatrix();
  return _dummy.matrix;
}

function placeOnSkypieaSphere(
  obj: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  globeRadius: number,
  yaw = 0
): void {
  const baseR = globeRadius + SKYPIEA_ALTITUDE;
  const pos = toSkypieaSphereLocal(x, y, z, globeRadius);
  obj.position.set(pos.x, pos.y, pos.z);
  _localNormal.set(pos.x, baseR + pos.y, pos.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

/**
 * Skypiea — Floating Sky Kingdom modeled closely after skypea_6d53f3aa.jpg,
 * featuring Angel Beach village & circular pier, winding jungle footpaths & bridges,
 * meandering turquoise rivers, Upper Yard Golden Palace cliff mesa, Shandora Stepped
 * Pyramid & overgrown stone ruins, Giant Jack rising from a swirling cloud vortex,
 * thunderstorm anvil cloud, White-White Sea cloud deck, and human-scale zoom support.
 */
export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance {
  const { globeRadius, materials, trackGeo, trackMat, trackTex } = ctx;
  const group = new THREE.Group();
  group.name = 'island-skypiea';

  const registerTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;

  // 1. High-Resolution Curved Spherical Terrain Mesh (192 x 192)
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(SKYPIEA_WORLD_SIZE, SKYPIEA_WORLD_SIZE, 192, 192)
  );
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const ly = sampleSkypieaHeight(lx, lz);
    const projected = toSkypieaSphereLocal(lx, ly, lz, globeRadius);
    posAttr.setXYZ(i, projected.x, projected.y, projected.z);
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainTex = registerTex(createSkypieaTerrainTexture(1024));
  const bumpTex = registerTex(createTileableMicroBumpTexture(256));
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      bumpMap: bumpTex,
      bumpScale: 0.004,
      roughness: 0.88,
      metalness: 0.02,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  group.add(terrainMesh);

  // 2. Sculpted Floating Rock Underside (tucked inside solid land silhouette, clear of Angel Bay)
  const underRockMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6f5946,
      roughness: 0.94,
      metalness: 0.03,
      flatShading: true,
    })
  );
  const underSpire = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(64 * S, 24 * S, 16 * S, 24)),
    underRockMat
  );
  underSpire.position.set(0, -8.8 * S, -28 * S);
  underSpire.scale.set(1.45, 1.0, 0.68);
  group.add(underSpire);

  for (const [ux, uz, ur] of [
    [-72, -8, 28],
    [76, -8, 26],
  ]) {
    const flankSpire = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(ur * S, 13 * S, 12)),
      underRockMat
    );
    flankSpire.rotation.x = Math.PI;
    flankSpire.position.set(ux * S, -7.2 * S, uz * S);
    group.add(flankSpire);
  }

  // 3. Angel Bay Cloud Lagoon & Turquoise Jungle Rivers Sheet
  const waterGeo = trackGeo(
    new THREE.PlaneGeometry(SKYPIEA_WORLD_SIZE, SKYPIEA_WORLD_SIZE, 72, 72)
  );
  waterGeo.rotateX(-Math.PI / 2);
  const wAttr = waterGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < wAttr.count; i++) {
    const lx = wAttr.getX(i);
    const lz = wAttr.getZ(i);
    const projected = toSkypieaSphereLocal(lx, 0.14, lz, globeRadius);
    wAttr.setXYZ(i, projected.x, projected.y, projected.z);
  }
  wAttr.needsUpdate = true;
  waterGeo.computeVertexNormals();

  const waterTex = registerTex(createSkypieaWaterTexture(1024));
  const waterMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: waterTex,
      roughness: 0.14,
      metalness: 0.18,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  group.add(waterMesh);

  // 4. Shared Architectural & Natural Materials
  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xcab895,
      roughness: 0.86,
      metalness: 0.03,
    })
  );
  const ruinStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x9c987b,
      roughness: 0.9,
      metalness: 0.02,
      flatShading: true,
    })
  );
  const whiteMarbleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf0eadc,
      roughness: 0.62,
      metalness: 0.05,
    })
  );
  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7a5230,
      roughness: 0.84,
    })
  );
  const barkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4f3b2a,
      roughness: 0.94,
      flatShading: true,
    })
  );
  const sailMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfaf5eb,
      roughness: 0.72,
      side: THREE.DoubleSide,
    })
  );
  const softCloudMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4f8ff,
      roughness: 0.92,
      metalness: 0.0,
      transparent: true,
      opacity: 0.92,
    })
  );
  const stormCloudMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x72829a,
      roughness: 0.95,
      metalness: 0.02,
      transparent: true,
      opacity: 0.94,
    })
  );

  // 5. Angel Beach Pier, Circular Ring Platform & Moored Sky-Boats
  const pierGroup = new THREE.Group();
  const pierDx = ANGEL_PIER_END.x - ANGEL_PIER_START.x;
  const pierDz = ANGEL_PIER_END.z - ANGEL_PIER_START.z;
  const pierLen = Math.hypot(pierDx, pierDz);
  const pierYaw = -Math.atan2(pierDz, pierDx);
  const pierMidX = (ANGEL_PIER_START.x + ANGEL_PIER_END.x) * 0.5;
  const pierMidZ = (ANGEL_PIER_START.z + ANGEL_PIER_END.z) * 0.5;

  const pierDeck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(pierLen * S, 0.22 * S, 1.8 * S)),
    woodMat
  );
  placeOnSkypieaSphere(pierDeck, pierMidX, 0.92, pierMidZ, globeRadius, pierYaw);
  pierGroup.add(pierDeck);

  // Pier support pilings & railing posts along the pier
  const pilingGeo = trackGeo(new THREE.CylinderGeometry(0.14 * S, 0.16 * S, 2.2 * S, 6));
  for (let p = 0; p <= 8; p++) {
    const t = p / 8;
    const px = ANGEL_PIER_START.x + pierDx * t;
    const pz = ANGEL_PIER_START.z + pierDz * t;
    for (const side of [-0.78, 0.78]) {
      const ox = (-pierDz / pierLen) * side;
      const oz = (pierDx / pierLen) * side;
      const piling = new THREE.Mesh(pilingGeo, woodMat);
      placeOnSkypieaSphere(piling, px + ox, 0.25, pz + oz, globeRadius);
      pierGroup.add(piling);
    }
  }

  // Circular Ring Platform at the end of the pier
  const ringPlatform = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(4.2 * S, 4.4 * S, 0.26 * S, 20)),
    woodMat
  );
  placeOnSkypieaSphere(
    ringPlatform,
    ANGEL_PIER_END.x,
    0.92,
    ANGEL_PIER_END.z,
    globeRadius
  );
  pierGroup.add(ringPlatform);

  const ringCenterPool = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.9 * S, 1.9 * S, 0.3 * S, 16)),
    materials.waterVortex
  );
  placeOnSkypieaSphere(
    ringCenterPool,
    ANGEL_PIER_END.x,
    0.94,
    ANGEL_PIER_END.z,
    globeRadius
  );
  pierGroup.add(ringCenterPool);

  // Moored Sky-Waver / Sailboat Skiffs near the pier
  const boatNodes: Array<{ mesh: THREE.Group; baseY: number }> = [];
  const boatConfigs: Array<[number, number, number]> = [
    [ANGEL_PIER_END.x - 4.2, ANGEL_PIER_END.z - 4.8, 0.4],
    [ANGEL_PIER_END.x + 5.6, ANGEL_PIER_END.z + 5.2, -0.7],
  ];
  boatConfigs.forEach(([bx, bz, byaw]) => {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.95 * S, 0.45 * S, 2.6 * S)),
      woodMat
    );
    hull.position.y = 0.2 * S;
    const mast = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.05 * S, 0.06 * S, 2.2 * S, 6)),
      woodMat
    );
    mast.position.y = 1.3 * S;
    const sail = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(1.25 * S, 1.5 * S)),
      sailMat
    );
    sail.position.set(0.06 * S, 1.45 * S, 0.1 * S);
    sail.rotation.y = 0.35;
    boat.add(hull, mast, sail);
    placeOnSkypieaSphere(boat, bx, 0.16, bz, globeRadius, byaw);
    boatNodes.push({ mesh: boat, baseY: boat.position.y });
    pierGroup.add(boat);
  });
  group.add(pierGroup);

  // 6. Central Domed Beach Pavilion at the foot of Angel Beach Pier
  const pavGroup = new THREE.Group();
  const pavY = Math.max(0.85, sampleSkypieaHeight(55, 69));
  placeOnSkypieaSphere(pavGroup, 55, pavY, 69, globeRadius, -1.55);
  const pavBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.6 * S, 2.9 * S, 2.1 * S, 10)),
    whiteMarbleMat
  );
  pavBase.position.y = 1.0 * S;
  const pavDome = new THREE.Mesh(
    trackGeo(createOnionDomeGeometry(2.35 * S, 3.2 * S)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xd65b4a, roughness: 0.45 }))
  );
  pavDome.position.y = 2.05 * S;
  const pavFinial = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.32 * S, 1.0 * S, 8)),
    materials.golden
  );
  pavFinial.position.y = 5.4 * S;
  pavGroup.add(pavBase, pavDome, pavFinial);
  group.add(pavGroup);

  // 7. Multi-Part Angel Beach Houses & Shandia Sky Huts (Instanced for Crisp Human-Scale Detail)
  const houses = buildSkypieaHouses();
  const unitBoxGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const plinthGeo = trackGeo(new THREE.BoxGeometry(1.08, 0.55, 1.08));
  const pitchedRoofGeo = trackGeo(new THREE.ConeGeometry(0.76, 0.72, 4));
  pitchedRoofGeo.rotateY(Math.PI / 4);
  const coneRoofGeo = trackGeo(new THREE.ConeGeometry(0.68, 0.85, 10));
  const domeRoofGeo = trackGeo(
    new THREE.SphereGeometry(0.56, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)
  );
  const doorGeo = trackGeo(new THREE.BoxGeometry(0.45, 0.75, 0.12));
  const winGeo = trackGeo(new THREE.BoxGeometry(0.28, 0.32, 0.08));
  const awningGeo = trackGeo(new THREE.BoxGeometry(0.88, 0.09, 0.55));

  const wallMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 })
  );
  const roofMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72 })
  );
  const doorMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.9 })
  );
  const winMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3a4a5e,
      emissive: 0xffd17a,
      emissiveIntensity: 0.32,
      roughness: 0.4,
    })
  );

  const plinthInst = new THREE.InstancedMesh(plinthGeo, stoneMat, houses.length);
  const wallInst = new THREE.InstancedMesh(unitBoxGeo, wallMat, houses.length);

  const pitchedHouses = houses.filter((h) => h.roofStyle === 'pitched');
  const domeHouses = houses.filter((h) => h.roofStyle === 'dome');
  const coneHouses = houses.filter((h) => h.roofStyle === 'cone');

  const pitchedInst = new THREE.InstancedMesh(
    pitchedRoofGeo,
    roofMat,
    Math.max(1, pitchedHouses.length)
  );
  const domeInst = new THREE.InstancedMesh(
    domeRoofGeo,
    roofMat,
    Math.max(1, domeHouses.length)
  );
  const coneInst = new THREE.InstancedMesh(
    coneRoofGeo,
    roofMat,
    Math.max(1, coneHouses.length)
  );

  const detailGroup = new THREE.Group();
  const doorInst = new THREE.InstancedMesh(doorGeo, doorMat, houses.length);
  const winInst = new THREE.InstancedMesh(winGeo, winMat, houses.length * 2);
  const awningInst = new THREE.InstancedMesh(awningGeo, roofMat, houses.length);

  houses.forEach((h, i) => {
    plinthInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x,
        h.y - 0.1,
        h.z,
        h.yaw,
        0,
        h.width,
        1,
        h.depth,
        globeRadius
      )
    );
    wallInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x,
        h.y + h.height * 0.5,
        h.z,
        h.yaw,
        0,
        h.width,
        h.height,
        h.depth,
        globeRadius
      )
    );
    _tmpColor.setHex(h.wallColor);
    wallInst.setColorAt(i, _tmpColor);

    const sinY = Math.sin(h.yaw);
    const cosY = Math.cos(h.yaw);
    const frontOff = h.depth * 0.5 + 0.03;

    doorInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x + sinY * frontOff,
        h.y + 0.56,
        h.z + cosY * frontOff,
        h.yaw,
        0,
        1.25,
        1.45,
        1,
        globeRadius
      )
    );

    const winY = h.y + h.height * 0.62;
    for (const sIdx of [0, 1]) {
      const sx = (sIdx === 0 ? -1 : 1) * h.width * 0.28;
      winInst.setMatrixAt(
        i * 2 + sIdx,
        setSphereInstMatrix(
          h.x + sinY * frontOff + cosY * sx,
          winY,
          h.z + cosY * frontOff - sinY * sx,
          h.yaw,
          0,
          1,
          1,
          1,
          globeRadius
        )
      );
    }

    awningInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x + sinY * (h.depth * 0.5 + 0.34),
        h.y + h.height * 0.72,
        h.z + cosY * (h.depth * 0.5 + 0.34),
        h.yaw,
        0.28,
        h.width * 0.75,
        1,
        1.2,
        globeRadius
      )
    );
    _tmpColor.setHex(h.roofColor);
    awningInst.setColorAt(i, _tmpColor);
  });

  pitchedHouses.forEach((h, i) => {
    pitchedInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x,
        h.y + h.height + 0.55,
        h.z,
        h.yaw,
        0,
        h.width * 1.12,
        1.55,
        h.depth * 1.12,
        globeRadius
      )
    );
    _tmpColor.setHex(h.roofColor);
    pitchedInst.setColorAt(i, _tmpColor);
  });

  domeHouses.forEach((h, i) => {
    domeInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x,
        h.y + h.height - 0.05,
        h.z,
        h.yaw,
        0,
        h.width * 0.92,
        1.65,
        h.depth * 0.92,
        globeRadius
      )
    );
    _tmpColor.setHex(h.roofColor);
    domeInst.setColorAt(i, _tmpColor);
  });

  coneHouses.forEach((h, i) => {
    coneInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x,
        h.y + h.height + 0.65,
        h.z,
        h.yaw,
        0,
        h.width * 1.05,
        1.65,
        h.depth * 1.05,
        globeRadius
      )
    );
    _tmpColor.setHex(h.roofColor);
    coneInst.setColorAt(i, _tmpColor);
  });

  [plinthInst, wallInst, pitchedInst, domeInst, coneInst].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.computeBoundingSphere();
    group.add(inst);
  });

  [doorInst, winInst, awningInst].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
    detailGroup.add(inst);
  });

  // Angel Beach Coastal Umbrellas & Pier Cargo Crates (human-scale coastal clutter)
  const umbrellaPoleGeo = trackGeo(new THREE.CylinderGeometry(0.05 * S, 0.06 * S, 2.2 * S, 6));
  const umbrellaCapGeo = trackGeo(new THREE.ConeGeometry(1.35 * S, 0.55 * S, 8));
  const umbrellaSpots: Array<[number, number, number]> = [
    [52.5, 62.5, 0xe86b56],
    [52.8, 75.5, 0x3b8bc4],
    [58.5, 84.5, 0xebb144],
    [48.5, 88.5, 0x52a879],
    [64.5, 58.0, 0xd85c6b],
    [60.5, 93.0, 0x4b87bd],
  ];
  umbrellaSpots.forEach(([ux, uz, ucol]) => {
    const uy = sampleSkypieaHeight(ux, uz);
    const uGroup = new THREE.Group();
    placeOnSkypieaSphere(uGroup, ux, uy, uz, globeRadius);
    const pole = new THREE.Mesh(umbrellaPoleGeo, woodMat);
    pole.position.y = 1.1 * S;
    const cap = new THREE.Mesh(
      umbrellaCapGeo,
      trackMat(new THREE.MeshStandardMaterial({ color: ucol, roughness: 0.65 }))
    );
    cap.position.y = 2.15 * S;
    uGroup.add(pole, cap);
    detailGroup.add(uGroup);
  });

  const crateGeo = trackGeo(new THREE.BoxGeometry(0.85 * S, 0.72 * S, 0.85 * S));
  const crateSpots: Array<[number, number, number]> = [
    [51.4, 68.0, 0.25],
    [50.6, 68.7, -0.4],
    [46.8, 70.9, 0.1],
  ];
  crateSpots.forEach(([cx, cz, cyaw]) => {
    const cMesh = new THREE.Mesh(crateGeo, woodMat);
    placeOnSkypieaSphere(cMesh, cx, 1.38, cz, globeRadius, cyaw);
    detailGroup.add(cMesh);
  });

  group.add(detailGroup);

  // 8. Grounded Wooden & Stone River Bridges along Jungle Paths
  SKYPIEA_BRIDGES.forEach((b) => {
    const bGroup = new THREE.Group();
    placeOnSkypieaSphere(bGroup, b.x, b.y, b.z, globeRadius, b.yaw);

    const deck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(b.length * S, 0.28 * S, b.width * S)),
      woodMat
    );
    bGroup.add(deck);

    for (const side of [-b.width * 0.44, b.width * 0.44]) {
      const rail = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(b.length * S, 0.48 * S, 0.16 * S)),
        woodMat
      );
      rail.position.set(0, 0.38 * S, side * S);
      bGroup.add(rail);
    }

    for (const end of [-b.length * 0.42, b.length * 0.42]) {
      const abutment = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.1 * S, 2.6 * S, b.width * 1.06 * S)),
        stoneMat
      );
      abutment.position.set(end * S, -1.2 * S, 0);
      bGroup.add(abutment);
    }
    group.add(bGroup);
  });

  // 9. Upper Yard Golden Palace / Sanctuary (East Cliff Mesa)
  const palaceGroup = new THREE.Group();
  placeOnSkypieaSphere(
    palaceGroup,
    UPPER_YARD_CENTER.x,
    UPPER_YARD_PLATEAU_Y,
    UPPER_YARD_CENTER.z,
    globeRadius,
    -0.58
  );

  const pTerrace = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(16.5 * S, 1.8 * S, 13.5 * S)),
    whiteMarbleMat
  );
  pTerrace.position.y = 0.85 * S;
  palaceGroup.add(pTerrace);

  // White marble perimeter balustrades (leaving center front open for staircase)
  const balSideGeo = trackGeo(new THREE.BoxGeometry(0.45 * S, 0.85 * S, 13.2 * S));
  const balBackGeo = trackGeo(new THREE.BoxGeometry(16.5 * S, 0.85 * S, 0.45 * S));
  const balFrontHalfGeo = trackGeo(new THREE.BoxGeometry(4.6 * S, 0.85 * S, 0.45 * S));
  for (const sx of [-8.0, 8.0]) {
    const bSide = new THREE.Mesh(balSideGeo, whiteMarbleMat);
    bSide.position.set(sx * S, 2.15 * S, 0);
    palaceGroup.add(bSide);
  }
  const bBack = new THREE.Mesh(balBackGeo, whiteMarbleMat);
  bBack.position.set(0, 2.15 * S, -6.5 * S);
  palaceGroup.add(bBack);
  for (const sx of [-5.85, 5.85]) {
    const bFront = new THREE.Mesh(balFrontHalfGeo, whiteMarbleMat);
    bFront.position.set(sx * S, 2.15 * S, 6.5 * S);
    palaceGroup.add(bFront);
  }

  // Wide white-stone front staircase descending from the palace terrace
  for (let st = 0; st < 6; st++) {
    const stair = new THREE.Mesh(
      trackGeo(
        new THREE.BoxGeometry((6.8 - st * 0.35) * S, 0.42 * S, (5.2 - st * 0.65) * S)
      ),
      whiteMarbleMat
    );
    stair.position.set(0, (0.25 + st * 0.35) * S, (7.8 - st * 0.55) * S);
    palaceGroup.add(stair);
  }

  // Main Golden Sanctum Hall & Upper Tier + Overhanging Flared Temple Eaves
  const goldTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd99b26,
      roughness: 0.34,
      metalness: 0.78,
    })
  );
  const pLowerHall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(13.2 * S, 3.8 * S, 9.8 * S)),
    materials.golden
  );
  pLowerHall.position.y = 3.55 * S;
  palaceGroup.add(pLowerHall);

  const pLowerEave1 = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(15.2 * S, 0.48 * S, 11.6 * S)),
    goldTrimMat
  );
  pLowerEave1.position.y = 5.45 * S;
  const pLowerEave2 = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(14.1 * S, 0.38 * S, 10.6 * S)),
    materials.golden
  );
  pLowerEave2.position.y = 5.82 * S;
  palaceGroup.add(pLowerEave1, pLowerEave2);

  const pUpperTier = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(9.4 * S, 3.2 * S, 7.6 * S)),
    materials.golden
  );
  pUpperTier.position.y = 7.25 * S;
  palaceGroup.add(pUpperTier);

  const pUpperEave1 = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(11.4 * S, 0.46 * S, 9.4 * S)),
    goldTrimMat
  );
  pUpperEave1.position.y = 8.9 * S;
  const pUpperEave2 = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(10.2 * S, 0.36 * S, 8.4 * S)),
    materials.golden
  );
  pUpperEave2.position.y = 9.25 * S;
  palaceGroup.add(pUpperEave1, pUpperEave2);

  // Dark Sanctuary Portal Doorway & Arched Side Windows
  const portalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x241812,
      roughness: 0.85,
      emissive: 0x4a2e10,
      emissiveIntensity: 0.25,
    })
  );
  const pPortal = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.5 * S, 2.9 * S, 0.45 * S)),
    portalMat
  );
  pPortal.position.set(0, 3.1 * S, 4.88 * S);
  const pPortalArch = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.2 * S, 0.55 * S, 0.65 * S)),
    goldTrimMat
  );
  pPortalArch.position.set(0, 4.65 * S, 4.92 * S);
  palaceGroup.add(pPortal, pPortalArch);

  const pSideWinGeo = trackGeo(new THREE.BoxGeometry(0.35 * S, 1.65 * S, 1.15 * S));
  for (const sx of [-6.58, 6.58]) {
    for (const sz of [-2.4, 0, 2.4]) {
      const sw = new THREE.Mesh(pSideWinGeo, portalMat);
      sw.position.set(sx * S, 3.55 * S, sz * S);
      palaceGroup.add(sw);
    }
  }

  // Front Colonnade Pillars
  const pColGeo = trackGeo(new THREE.CylinderGeometry(0.28 * S, 0.32 * S, 3.6 * S, 8));
  for (let c = -5; c <= 5; c += 2) {
    const col = new THREE.Mesh(pColGeo, whiteMarbleMat);
    col.position.set(c * 1.15 * S, 3.5 * S, 5.15 * S);
    palaceGroup.add(col);
  }

  // Grand Central Golden Onion Dome & 4 Corner Spires
  const mainDome = new THREE.Mesh(
    trackGeo(createOnionDomeGeometry(3.6 * S, 6.2 * S)),
    materials.golden
  );
  mainDome.position.y = 9.35 * S;
  palaceGroup.add(mainDome);

  const spireGeo = trackGeo(createOnionDomeGeometry(1.15 * S, 2.4 * S));
  const turretGeo = trackGeo(new THREE.CylinderGeometry(1.0 * S, 1.15 * S, 3.4 * S, 8));
  for (const sx of [-5.2, 5.2]) {
    for (const sz of [-3.6, 3.6]) {
      const turret = new THREE.Mesh(turretGeo, materials.golden);
      turret.position.set(sx * S, 5.8 * S, sz * S);
      const spire = new THREE.Mesh(spireGeo, materials.golden);
      spire.position.set(sx * S, 7.45 * S, sz * S);
      palaceGroup.add(turret, spire);
    }
  }
  group.add(palaceGroup);

  // 10. Giant Jack Beanstalk & Swirling White Cloud Vortex
  const jackGroup = new THREE.Group();
  const jackBaseY = sampleSkypieaHeight(GIANT_JACK_CENTER.x, GIANT_JACK_CENTER.z);
  placeOnSkypieaSphere(
    jackGroup,
    GIANT_JACK_CENTER.x,
    jackBaseY,
    GIANT_JACK_CENTER.z,
    globeRadius
  );

  // Towering curved gnarled trunk
  const jackCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -1.5 * S, 0),
    new THREE.Vector3(1.2 * S, 8.0 * S, -1.0 * S),
    new THREE.Vector3(-1.8 * S, 18.0 * S, 1.4 * S),
    new THREE.Vector3(1.5 * S, 29.0 * S, 0.5 * S),
    new THREE.Vector3(-0.6 * S, 39.0 * S, -1.2 * S),
  ]);
  const jackTrunk = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(jackCurve, 18, 4.4 * S, 10, false)),
    barkMat
  );
  jackGroup.add(jackTrunk);

  // Massive sprawling buttress roots gripping the earth inside the cloud eye
  for (let r = 0; r < 7; r++) {
    const a = (r / 7) * Math.PI * 2 + 0.3;
    const rootCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 2.5 * S, 6.2 * S, Math.sin(a) * 2.5 * S),
      new THREE.Vector3(Math.cos(a) * 7.8 * S, 1.6 * S, Math.sin(a) * 7.8 * S),
      new THREE.Vector3(Math.cos(a + 0.18) * 14.2 * S, -2.5 * S, Math.sin(a + 0.18) * 14.2 * S),
    ]);
    const rootMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(rootCurve, 10, 1.45 * S, 7, false)),
      barkMat
    );
    jackGroup.add(rootMesh);
  }
  group.add(jackGroup);

  // 11. Shandora Stepped Mesoamerican Pyramid
  const pyrGroup = new THREE.Group();
  const pyrBaseY = sampleSkypieaHeight(
    SHANDORA_PYRAMID_CENTER.x,
    SHANDORA_PYRAMID_CENTER.z
  );
  placeOnSkypieaSphere(
    pyrGroup,
    SHANDORA_PYRAMID_CENTER.x,
    pyrBaseY,
    SHANDORA_PYRAMID_CENTER.z,
    globeRadius,
    0.58
  );
  for (let tier = 0; tier < 6; tier++) {
    const size = (19.5 - tier * 2.65) * S;
    const tierMesh = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(size, 2.2 * S, size)),
      stoneMat
    );
    tierMesh.position.y = (0.9 + tier * 2.15) * S;
    pyrGroup.add(tierMesh);
  }
  // Monumental front staircase facing SE plaza
  const pyrStair = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.2 * S, 14.2 * S, 5.4 * S)),
    ruinStoneMat
  );
  pyrStair.position.set(0, 6.4 * S, 6.2 * S);
  pyrStair.rotation.x = -0.58;
  pyrGroup.add(pyrStair);

  const pyrShrine = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.4 * S, 2.8 * S, 4.4 * S)),
    ruinStoneMat
  );
  pyrShrine.position.y = 14.2 * S;
  pyrGroup.add(pyrShrine);
  group.add(pyrGroup);

  // 12. Ancient Overgrown Shandora Ruins (NW Circular Citadel & SW Courtyards)
  const nwRuinGroup = new THREE.Group();
  const nwRuinY = sampleSkypieaHeight(SHANDORA_RUINS_NW.x, SHANDORA_RUINS_NW.z);
  placeOnSkypieaSphere(
    nwRuinGroup,
    SHANDORA_RUINS_NW.x,
    nwRuinY,
    SHANDORA_RUINS_NW.z,
    globeRadius
  );
  const arcWallGeo = trackGeo(new THREE.BoxGeometry(5.6 * S, 4.2 * S, 1.4 * S));
  const brokenColGeo = trackGeo(new THREE.CylinderGeometry(0.55 * S, 0.65 * S, 4.8 * S, 7));
  for (let s = 0; s < 10; s++) {
    if (s === 2 || s === 6) continue; // Ruined breaches in circular wall
    const a = (s / 10) * Math.PI * 2;
    const wall = new THREE.Mesh(arcWallGeo, ruinStoneMat);
    wall.position.set(Math.cos(a) * 12.5 * S, 1.8 * S, Math.sin(a) * 12.5 * S);
    wall.rotation.y = -a + Math.PI / 2;
    wall.scale.y = 0.72 + (s % 3) * 0.25;
    nwRuinGroup.add(wall);

    const col = new THREE.Mesh(brokenColGeo, ruinStoneMat);
    col.position.set(Math.cos(a + 0.2) * 8.2 * S, 2.1 * S, Math.sin(a + 0.2) * 8.2 * S);
    nwRuinGroup.add(col);
  }
  group.add(nwRuinGroup);

  // SW Open-Air Ruined Stone Courtyards
  const swCourtyardSpecs: Array<[number, number, number, number, number]> = [
    [-98, 22, 11.5, 9.5, 0.2],
    [-86, 36, 9.2, 8.2, -0.35],
    [-108, 34, 8.4, 7.6, 0.45],
  ];
  swCourtyardSpecs.forEach(([cx, cz, cw, cd, cyaw]) => {
    const cy = sampleSkypieaHeight(cx, cz);
    const cGroup = new THREE.Group();
    placeOnSkypieaSphere(cGroup, cx, cy, cz, globeRadius, cyaw);
    const wN = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(cw * S, 3.2 * S, 1.1 * S)),
      ruinStoneMat
    );
    wN.position.set(0, 1.4 * S, -cd * 0.5 * S);
    const wS = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(cw * 0.65 * S, 2.4 * S, 1.1 * S)),
      ruinStoneMat
    );
    wS.position.set(-cw * 0.15 * S, 1.0 * S, cd * 0.5 * S);
    const wE = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.1 * S, 2.9 * S, cd * S)),
      ruinStoneMat
    );
    wE.position.set(cw * 0.5 * S, 1.2 * S, 0);
    const wW = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.1 * S, 3.5 * S, cd * 0.8 * S)),
      ruinStoneMat
    );
    wW.position.set(-cw * 0.5 * S, 1.5 * S, 0);
    cGroup.add(wN, wS, wE, wW);
    group.add(cGroup);
  });

  // Satellite Islet Ruin Tower (NW) & Mini Pyramid (NE)
  const nwIsletY = sampleSkypieaHeight(-146, -106);
  const nwTower = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.8 * S, 2.4 * S, 5.2 * S, 6)),
    ruinStoneMat
  );
  placeOnSkypieaSphere(nwTower, -146, nwIsletY + 2.2, -106, globeRadius);
  group.add(nwTower);

  const neIsletY = sampleSkypieaHeight(136, -110);
  const nePyr = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(4.8 * S, 6.4 * S, 4)),
    stoneMat
  );
  placeOnSkypieaSphere(nePyr, 136, neIsletY + 2.8, -110, globeRadius, Math.PI / 4);
  group.add(nePyr);

  // 13. Dense Tropical Jungle Canopy & Angel Beach Palms (Instanced)
  const trees = buildSkypieaTrees();
  const jungleTrees = trees.filter((t) => t.kind === 'jungle');
  const palmTrees = trees.filter((t) => t.kind === 'palm');

  const jTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.5, 2.6, 6));
  const jTrunkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c4028, roughness: 0.92 })
  );
  const jCrownGeo = trackGeo(new THREE.DodecahedronGeometry(2.85, 1));
  const jCrownMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      flatShading: true,
    })
  );

  const jTrunkInst = new THREE.InstancedMesh(
    jTrunkGeo,
    jTrunkMat,
    Math.max(1, jungleTrees.length)
  );
  const jCrownInst = new THREE.InstancedMesh(
    jCrownGeo,
    jCrownMat,
    Math.max(1, jungleTrees.length)
  );

  jungleTrees.forEach((t, i) => {
    jTrunkInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        t.x,
        t.y + 1.1 * t.scale,
        t.z,
        t.yaw,
        0,
        t.scale,
        t.scale,
        t.scale,
        globeRadius
      )
    );
    jCrownInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        t.x,
        t.y + 3.4 * t.scale,
        t.z,
        t.yaw,
        0,
        t.scale * 1.18,
        t.scale * 0.85,
        t.scale * 1.18,
        globeRadius
      )
    );
    _tmpColor.setHSL(0.28 + t.hueShift * 0.055, 0.56, 0.24 + (i % 5) * 0.025);
    jCrownInst.setColorAt(i, _tmpColor);
  });

  [jTrunkInst, jCrownInst].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.computeBoundingSphere();
    group.add(inst);
  });

  // Coastal Angel Beach Coconut Palms
  const pTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.19, 1, 7));
  const pCrownGeo = trackGeo(createPalmCrownGeometry());
  const pCrownMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b8430,
      roughness: 0.72,
      side: THREE.DoubleSide,
    })
  );
  const pTrunkInst = new THREE.InstancedMesh(
    pTrunkGeo,
    jTrunkMat,
    Math.max(1, palmTrees.length)
  );
  const pCrownInst = new THREE.InstancedMesh(
    pCrownGeo,
    pCrownMat,
    Math.max(1, palmTrees.length)
  );

  palmTrees.forEach((p, i) => {
    const h = 3.8 * p.scale;
    const lean = 0.12;
    const lx = Math.cos(p.yaw) * lean * h * 0.5;
    const lz = Math.sin(p.yaw) * lean * h * 0.5;
    pTrunkInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        p.x + lx * 0.5,
        p.y + h * 0.48,
        p.z + lz * 0.5,
        p.yaw,
        lean * 0.8,
        1,
        h,
        1,
        globeRadius
      )
    );
    pCrownInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        p.x + lx,
        p.y + h - 0.1,
        p.z + lz,
        p.yaw,
        0,
        p.scale * 1.15,
        p.scale * 1.15,
        p.scale * 1.15,
        globeRadius
      )
    );
  });
  [pTrunkInst, pCrownInst].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    group.add(inst);
  });

  // 14. White-White Sea Billowing Cloud Banks, Giant Jack Vortex, Milky Road & NW Storm Cloud
  // Curved Swirling Cloud Vortex Disc around Giant Jack's eye
  const vortexSize = 90;
  const vortexGeo = trackGeo(new THREE.PlaneGeometry(vortexSize, vortexSize, 24, 24));
  vortexGeo.rotateX(-Math.PI / 2);
  const vAttr = vortexGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < vAttr.count; i++) {
    const vx = GIANT_JACK_CENTER.x + vAttr.getX(i);
    const vz = GIANT_JACK_CENTER.z + vAttr.getZ(i);
    const radial = Math.hypot(vAttr.getX(i), vAttr.getZ(i));
    const vy = 11.4 + Math.sin(radial * 0.14) * 1.1;
    const projected = toSkypieaSphereLocal(vx, vy, vz, globeRadius);
    vAttr.setXYZ(i, projected.x, projected.y, projected.z);
  }
  vAttr.needsUpdate = true;
  vortexGeo.computeVertexNormals();
  const vortexTex = registerTex(createCloudVortexTexture(512));
  const vortexMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: vortexTex,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const vortexMesh = new THREE.Mesh(vortexGeo, vortexMat);
  group.add(vortexMesh);

  const cloudPuffGeo = trackGeo(new THREE.IcosahedronGeometry(1, 2));
  const cloudSpecs: Array<{
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    storm?: boolean;
  }> = [];

  // Giant Jack billowing cloud vortex rim
  for (let c = 0; c < 36; c++) {
    const a = (c / 36) * Math.PI * 2;
    const r = 19 + (c % 3) * 7.2;
    cloudSpecs.push({
      x: GIANT_JACK_CENTER.x + Math.cos(a) * r,
      y: 12.2 + (c % 2) * 2.2,
      z: GIANT_JACK_CENTER.z + Math.sin(a) * r * 0.82,
      sx: 7.0 + (c % 4) * 1.5,
      sy: 2.8 + (c % 3) * 0.8,
      sz: 7.0 + (c % 4) * 1.5,
    });
  }
  // Upper cloud wisps crowning Giant Jack
  for (let c = 0; c < 10; c++) {
    const a = (c / 10) * Math.PI * 2;
    cloudSpecs.push({
      x: GIANT_JACK_CENTER.x + Math.cos(a) * 6.5,
      y: 35.5 + (c % 2) * 2.0,
      z: GIANT_JACK_CENTER.z + Math.sin(a) * 6.5,
      sx: 6.0,
      sy: 2.7,
      sz: 6.0,
    });
  }

  // Jungle Butte cloud collar
  for (let c = 0; c < 6; c++) {
    const a = (c / 6) * Math.PI * 2;
    cloudSpecs.push({
      x: JUNGLE_BUTTE_CENTER.x + Math.cos(a) * 9.5,
      y: 11.5,
      z: JUNGLE_BUTTE_CENTER.z + Math.sin(a) * 9.5,
      sx: 5.2,
      sy: 2.4,
      sz: 5.2,
    });
  }

  // Perimeter White-White Sea cloud banks & Milky Road SE waterfall puff
  for (let c = 0; c < 44; c++) {
    const a = (c / 44) * Math.PI * 2;
    const r = 138 + (c % 4) * 11;
    cloudSpecs.push({
      x: Math.cos(a) * r * 1.06,
      y: -3.2 + (c % 3) * 1.4,
      z: -4 + Math.sin(a) * r * 0.9,
      sx: 14.5 + (c % 3) * 4.5,
      sy: 4.8 + (c % 2) * 2.0,
      sz: 14.5 + (c % 3) * 4.5,
    });
  }
  // Milky Road SE cloud cascade
  for (let m = 0; m < 8; m++) {
    const t = m / 7;
    cloudSpecs.push({
      x: 68 + t * 24,
      y: 1.5 - t * 5.2,
      z: 104 + Math.sin(t * 2.2) * 8 + t * 18,
      sx: 4.5 + t * 4.2,
      sy: 2.5 + t * 2.0,
      sz: 4.5 + t * 4.2,
    });
  }

  const whiteClouds = cloudSpecs.filter((c) => !c.storm);
  const cloudInst = new THREE.InstancedMesh(
    cloudPuffGeo,
    softCloudMat,
    whiteClouds.length
  );
  whiteClouds.forEach((c, i) => {
    cloudInst.setMatrixAt(
      i,
      setSphereInstMatrix(c.x, c.y, c.z, i * 0.4, 0, c.sx, c.sy, c.sz, globeRadius)
    );
    _tmpColor.setHSL(0.58, 0.25, 0.94 + (i % 3) * 0.02);
    cloudInst.setColorAt(i, _tmpColor);
  });
  cloudInst.instanceMatrix.needsUpdate = true;
  if (cloudInst.instanceColor) cloudInst.instanceColor.needsUpdate = true;
  cloudInst.computeBoundingSphere();
  group.add(cloudInst);

  // NW Thunderstorm Anvil Cloud & Glowing Lightning Bolts
  const stormGroup = new THREE.Group();
  placeOnSkypieaSphere(stormGroup, -44, 38, -94, globeRadius);
  const stormPuffs: Array<[number, number, number, number, number]> = [
    [0, 2, 0, 18, 7],
    [-14, 0.5, 3, 13, 5.5],
    [15, 0.5, -2, 14, 5.5],
    [-6, 6.5, -2, 12, 5.8],
    [7, 6.0, 2, 11, 5.2],
  ];
  stormPuffs.forEach(([sx, sy, sz, rx, ry]) => {
    const puff = new THREE.Mesh(cloudPuffGeo, stormCloudMat);
    puff.position.set(sx * S, sy * S, sz * S);
    puff.scale.set(rx * S, ry * S, rx * 0.85 * S);
    stormGroup.add(puff);
  });

  const boltMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xbfe8ff,
      transparent: true,
      opacity: 0.88,
    })
  );
  const bolts: THREE.Mesh[] = [];
  const boltOffsets: Array<[number, number]> = [
    [-7, 3],
    [4, 2],
    [13, -1],
  ];
  boltOffsets.forEach(([bx, bz]) => {
    const boltCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(bx * S, -2 * S, bz * S),
      new THREE.Vector3((bx - 2.2) * S, -9 * S, bz * S),
      new THREE.Vector3((bx + 1.8) * S, -16 * S, bz * S),
      new THREE.Vector3((bx - 1.5) * S, -24 * S, bz * S),
    ]);
    const bolt = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(boltCurve, 6, 0.36 * S, 4, false)),
      boltMat
    );
    stormGroup.add(bolt);
    bolts.push(bolt);
  });
  group.add(stormGroup);

  return {
    group,
    radius: globeRadius + SKYPIEA_ALTITUDE,
    orientMode: 'cardinal',
    update: (elapsed: number, distToCamera = 20) => {
      detailGroup.visible = distToCamera < 3.4;
      if (distToCamera < 3.4) {
        for (let i = 0; i < boatNodes.length; i++) {
          boatNodes[i].mesh.position.y =
            boatNodes[i].baseY + Math.sin(elapsed * 2.0 + i * 1.6) * 0.05 * S;
        }
      }
      // Subtle lightning flicker in the NW storm cloud
      const flash = Math.sin(elapsed * 5.7) * Math.sin(elapsed * 13.3);
      boltMat.opacity = flash > 0.62 ? 0.96 : 0.28;
    },
  };
}
