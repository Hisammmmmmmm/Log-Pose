import * as THREE from 'three';
import {
  ORGAN_BUILDINGS,
  ORGAN_GLOBE_SCALE,
  ORGAN_LANDMARKS,
  ORGAN_QUAY_Y,
  ORGAN_RIVER_POINTS,
  ORGAN_TOWN_Y,
  ORGAN_TREES,
  ORGAN_WATER_Y,
  ORGAN_WORLD_SIZE,
  organRoadSignedDist,
  sampleOrganHeight,
  sampleOrganRiverDistance,
  toOrganSphereLocal,
} from '../utils/organTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = ORGAN_GLOBE_SCALE;
const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);
const _localNormal = new THREE.Vector3();
const _tiltQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();
const _yAxis = new THREE.Vector3(0, 1, 0);

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

function createOrganTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = ORGAN_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * ORGAN_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * ORGAN_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const h = sampleOrganHeight(x, z);
      const hx = sampleOrganHeight(x + 0.9, z);
      const hz = sampleOrganHeight(x, z + 0.9);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 1.25, 0, 1);
      const fineNoise = (valueNoise2D(x * 1.2, z * 1.2) - 0.5) * 11;

      let rgb: [number, number, number] = [226, 206, 154];
      let alpha = 0;

      const river = sampleOrganRiverDistance(x, z);
      const inRiverBed = river.dist < river.halfWidth + 0.8 && z > -48.0;

      if (h < -4.2 && !inRiverBed) {
        alpha = smoothstep(-5.8, -4.2, h);
        rgb = [164, 150, 118];
      } else {
        alpha = 1;
        // East Blue lush woodland & grassy plateaus matching organ_town_39b1ec20.png
        const elevT = smoothstep(2.6, 16.5, h);
        const forestGreen = mixRgb([126, 188, 86], [88, 148, 62], elevT);
        const deepToBeach = smoothstep(-3.8, -0.25, h);
        const wetToDry = smoothstep(-0.25, 0.52, h);
        const submergedSand = mixRgb([154, 146, 122], [204, 186, 140], deepToBeach);
        const sandColor = mixRgb(submergedSand, [236, 218, 166], wetToDry);
        const sandToGrass = smoothstep(0.75, 1.75, h);
        rgb = mixRgb(sandColor, forestGreen, sandToGrass);

        // Stratified grey-tan mountain rock cliff rings & broad flat limestone plateau caps
        if (h > 3.55) {
          const cliffT = smoothstep(0.20, 0.44, slope) * smoothstep(3.55, 4.35, h);
          const peakCapT = smoothstep(9.2, 11.2, h) * 0.55;
          const rockMix = clamp(Math.max(cliffT, peakCapT), 0, 1);
          if (rockMix > 0.01) {
            const strata =
              Math.sin(h * 3.0 + x * 0.14) * 9 +
              (valueNoise2D(x * 0.8, z * 0.8) - 0.5) * 12;
            const rockRgb: [number, number, number] = [
              190 + strata,
              178 + strata * 0.9,
              160 + strata * 0.85,
            ];
            rgb = mixRgb(rgb, rockRgb, rockMix);
          }
        }

        // Riverbed gravel/teal silt shading under water ribbon
        if (inRiverBed && z > -48.0) {
          const bedT = 1 - smoothstep(river.halfWidth * 0.3, river.halfWidth + 0.9, river.dist);
          rgb = mixRgb(rgb, [118, 152, 136], bedT * 0.85);
        }

        // Buggy Ball blast crater scorched earth patch on SW town edge (-30.5, 33.5)
        const craterDist = Math.hypot(
          (x - ORGAN_LANDMARKS.swTowerCrater.x) / 6.2,
          (z - ORGAN_LANDMARKS.swTowerCrater.z) / 4.4
        );
        if (craterDist < 1.15 && h > 1.8) {
          const scorchT = 1 - smoothstep(0.35, 1.15, craterDist);
          rgb = mixRgb(rgb, [94, 72, 62], scorchT * 0.88);
        }

        // Unified pale grey-white swirled cobblestone urban town ground (matching image_182c38a1.png & Orange_town_9b70d5ba.jpeg)
        if (x >= -29.5 && x <= 20.5 && z >= 13.8 && z <= 54.6 && h > 1.2) {
          const urbanBlend =
            smoothstep(-29.5, -27.2, x) *
            (1 - smoothstep(18.5, 20.5, x)) *
            smoothstep(13.8, 15.6, z) *
            (1 - smoothstep(53.2, 54.6, z));
          const cobbleWave =
            Math.sin(x * 3.2 + Math.cos(z * 2.8) * 1.4) * 5 +
            (valueNoise2D(x * 2.6, z * 2.6) - 0.5) * 9;
          const urbanRgb: [number, number, number] = [
            215 + cobbleWave,
            218 + cobbleWave,
            212 + cobbleWave * 0.95,
          ];
          rgb = mixRgb(rgb, urbanRgb, urbanBlend * 0.92);
        }

        // Cobbled stone avenues inside Orange Town vs warm tan dirt trail east of bridge
        const roadD = organRoadSignedDist(x, z);
        if (roadD < 0.48 && h > 0.12 && !(inRiverBed && river.dist < river.halfWidth)) {
          const roadT = 1 - smoothstep(-0.18, 0.48, roadD);
          if (x < 21.8) {
            // Pale cobbled fan pattern matching image_182c38a1.png & Orange_town_9b70d5ba.jpeg
            const cobbleWave =
              Math.sin(x * 3.2 + Math.cos(z * 2.8) * 1.4) * 6 +
              (valueNoise2D(x * 2.6, z * 2.6) - 0.5) * 10;
            const cobbleRgb: [number, number, number] = [
              228 + cobbleWave,
              229 + cobbleWave,
              222 + cobbleWave * 0.95,
            ];
            rgb = mixRgb(rgb, cobbleRgb, roadT * 0.96);
          } else {
            const trailGrain = (valueNoise2D(x * 2.1, z * 2.1) - 0.5) * 12;
            rgb = mixRgb(
              rgb,
              [224 + trailGrain, 198 + trailGrain, 146 + trailGrain],
              roadT * 0.92
            );
          }
        }
      }

      data[idx] = clamp(Math.round(rgb[0] + (h > -0.15 ? fineNoise : 0)), 0, 255);
      data[idx + 1] = clamp(
        Math.round(rgb[1] + (h > -0.15 ? fineNoise : 0)),
        0,
        255
      );
      data[idx + 2] = clamp(
        Math.round(rgb[2] + (h > -0.15 ? fineNoise : 0)),
        0,
        255
      );
      data[idx + 3] = clamp(Math.round(alpha * 255), 0, 255);
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
 * European half-timbered ("colombages") Orange Town facade texture with oak posts,
 * horizontal lintels, diagonal upper-floor bracing, windows, doorway & stone plinth.
 */
function createHalfTimberFacadeTexture(baseColorHex: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const c = new THREE.Color(baseColorHex);
  ctx.fillStyle = `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
  ctx.fillRect(0, 0, 256, 256);

  // Masonry stone plinth along ground floor bottom
  ctx.fillStyle = '#aba69a';
  ctx.fillRect(0, 232, 256, 24);
  ctx.fillStyle = 'rgba(60, 50, 40, 0.25)';
  for (let x = 0; x < 256; x += 24) {
    ctx.fillRect(x, 232, 2, 24);
  }

  // Dark oak half-timber posts & beams
  ctx.fillStyle = '#5c3b22';
  ctx.fillRect(0, 0, 11, 236);
  ctx.fillRect(245, 0, 11, 236);
  ctx.fillRect(82, 0, 8, 236);
  ctx.fillRect(166, 0, 8, 236);
  ctx.fillRect(0, 0, 256, 10);
  ctx.fillRect(0, 116, 256, 10);

  // Diagonal X-braces in lower outer bays matching anime/manga architecture
  ctx.strokeStyle = '#5c3b22';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(11, 126);
  ctx.lineTo(82, 230);
  ctx.moveTo(82, 126);
  ctx.lineTo(11, 230);
  ctx.moveTo(174, 126);
  ctx.lineTo(245, 230);
  ctx.moveTo(245, 126);
  ctx.lineTo(174, 230);
  ctx.stroke();

  // Center doorway & upper/lower mullioned windows
  ctx.fillStyle = '#52301a';
  ctx.fillRect(102, 152, 52, 82);
  ctx.strokeStyle = '#e7ddc8';
  ctx.lineWidth = 3;
  ctx.strokeRect(102, 152, 52, 82);

  const winPositions = [
    [24, 34, 42, 52],
    [104, 34, 48, 52],
    [190, 34, 42, 52],
    [24, 146, 42, 46],
    [190, 146, 42, 46],
  ];
  for (const [wx, wy, ww, wh] of winPositions) {
    ctx.fillStyle = '#334d66';
    ctx.fillRect(wx, wy, ww, wh);
    ctx.strokeStyle = '#efe5d2';
    ctx.lineWidth = 3;
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.fillStyle = '#5c3b22';
    ctx.fillRect(wx + ww * 0.5 - 1.5, wy, 3, wh);
    ctx.fillRect(wx, wy + wh * 0.5 - 1.5, ww, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBuggyChapiteauBannerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#991b1b';
  ctx.fillRect(0, 0, 512, 144);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 128);

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 42px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CHAPITEAU DE BAGGY', 256, 56);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('CIRQUE DES PIRATES DE BAGGY', 256, 108);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPetFoodSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#a82c22';
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#f5cf6e';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 144);

  ctx.fillStyle = '#f7d868';
  ctx.font = 'bold 68px Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PET FOOD', 256, 70);

  ctx.fillStyle = '#fff3d2';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('BOUTIQUE DE CHOUCHOU', 256, 126);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCircusTentTexture(primaryHex = '#d4312c', secondaryHex = '#fcfaf4'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const stripes = 16;
  const w = 512 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? primaryHex : secondaryHex;
    ctx.fillRect(i * w, 0, Math.ceil(w) + 1, 256);
  }
  // Scalloped gold valance band near base
  ctx.fillStyle = '#eab308';
  ctx.fillRect(0, 224, 512, 18);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

function createBuggyFlagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#181a20';
  ctx.fillRect(0, 0, 256, 160);

  // Crossbones
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(64, 34);
  ctx.lineTo(192, 128);
  ctx.moveTo(192, 34);
  ctx.lineTo(64, 128);
  ctx.stroke();

  // Skull + iconic Buggy red clown nose & markings
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(128, 76, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(112, 92, 32, 22);

  ctx.fillStyle = '#181a20';
  ctx.beginPath();
  ctx.arc(116, 70, 6, 0, Math.PI * 2);
  ctx.arc(140, 70, 6, 0, Math.PI * 2);
  ctx.fill();

  // Bright red clown nose
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(128, 82, 10, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRoofShingleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 16) {
    ctx.fillStyle = 'rgba(0,0,0,0.09)';
    ctx.fillRect(0, y, 128, 2);
    for (let x = (y / 16) % 2 === 0 ? 0 : 8; x < 128; x += 16) {
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(x, y, 2, 16);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createPitchedRoofGeo(
  width: number,
  depth: number,
  height: number,
  style: 'hip' | 'gable'
): THREE.BufferGeometry {
  const hw = width * 0.5 + 0.25;
  const hd = depth * 0.5 + 0.25;
  const ridgeHalfW = style === 'gable' ? hw : hw * 0.44;
  const verts = new Float32Array([
    -hw, 0, hd, hw, 0, hd, ridgeHalfW, height, 0,
    -hw, 0, hd, ridgeHalfW, height, 0, -ridgeHalfW, height, 0,
    hw, 0, -hd, -hw, 0, -hd, -ridgeHalfW, height, 0,
    hw, 0, -hd, -ridgeHalfW, height, 0, ridgeHalfW, height, 0,
    -hw, 0, -hd, -hw, 0, hd, -ridgeHalfW, height, 0,
    hw, 0, hd, hw, 0, -hd, ridgeHalfW, height, 0,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  g.computeVertexNormals();
  return g;
}

function createGableEndTriangleGeo(depth: number, height: number): THREE.BufferGeometry {
  const hd = depth * 0.5;
  const verts = new Float32Array([
    0, 0, hd, 0, 0, -hd, 0, height, 0,
    0, 0, -hd, 0, 0, hd, 0, height, 0,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  g.computeVertexNormals();
  return g;
}

function createBigTopHullGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 10.5); // Rounded stern (+Z before rotation)
  shape.bezierCurveTo(3.8, 10.2, 4.7, 5.4, 4.6, 0.5);
  shape.bezierCurveTo(4.4, -4.8, 3.0, -9.2, 0, -11.4); // Tapered bow (-Z)
  shape.bezierCurveTo(-3.0, -9.2, -4.4, -4.8, -4.6, 0.5);
  shape.bezierCurveTo(-4.7, 5.4, -3.8, 10.2, 0, 10.5);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 2.4,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.3,
    bevelSegments: 2,
    curveSegments: 20,
  });
  geo.rotateX(Math.PI * 0.5);
  geo.translate(0, 2.4, 0);
  return geo;
}

export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance | null {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const regTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;
  const group = new THREE.Group();
  group.name = 'island-organ';

  const placeOnSphere = (
    obj: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    yaw = 0
  ) => {
    const sp = toOrganSphereLocal(x, y, z, globeRadius);
    obj.position.set(sp.x, sp.y, sp.z);
    _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, yaw);
    obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    obj.scale.multiplyScalar(S);
  };

  // 1. SCULPTED 192x192 ORGAN ISLAND TERRAIN MESH + 1024x1024 CANVAS TEXTURE
  const segs = 192;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(ORGAN_WORLD_SIZE, ORGAN_WORLD_SIZE, segs, segs)
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const posArr = posAttr.array as Float32Array;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posArr[i * 3];
    const z = posArr[i * 3 + 2];
    const h = sampleOrganHeight(x, z);
    const sp = toOrganSphereLocal(x, h, z, globeRadius);
    posArr[i * 3] = sp.x;
    posArr[i * 3 + 1] = sp.y;
    posArr[i * 3 + 2] = sp.z;
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainTex = regTex(createOrganTerrainTexture(1024));
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.86,
      metalness: 0.04,
      transparent: true,
      alphaTest: 0.04,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // 1B. WINDING ORGAN RIVER WATER SURFACE RIBBON
  {
    const curvePts = ORGAN_RIVER_POINTS.map(([rx, rz]) => {
      const sp = toOrganSphereLocal(rx, ORGAN_WATER_Y + 0.14, rz, globeRadius);
      return new THREE.Vector3(sp.x, sp.y, sp.z);
    });
    const riverCurve = new THREE.CatmullRomCurve3(curvePts);
    const ribbonSamples = 48;
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= ribbonSamples; i++) {
      const t = i / ribbonSamples;
      const p = riverCurve.getPoint(t);
      const tan = riverCurve.getTangent(t).normalize();
      const upN = p.clone().add(new THREE.Vector3(0, globeRadius, 0)).normalize();
      const side = new THREE.Vector3().crossVectors(tan, upN).normalize();
      const halfW = (2.15 + smoothstep(0.45, 0.95, t) * 1.1) * S;

      const left = p.clone().addScaledVector(side, -halfW);
      const right = p.clone().addScaledVector(side, halfW);
      positions.push(left.x, left.y, left.z, right.x, right.y, right.z);

      if (i < ribbonSamples) {
        const b = i * 2;
        indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }
    const riverGeo = trackGeo(new THREE.BufferGeometry());
    riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    riverGeo.setIndex(indices);
    riverGeo.computeVertexNormals();
    const riverMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x2692c8,
        roughness: 0.18,
        metalness: 0.12,
        transparent: true,
        opacity: 0.86,
      })
    );
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    group.add(riverMesh);
  }

  // Shared materials & geometries
  const unitBox = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const unitCyl = trackGeo(new THREE.CylinderGeometry(1, 1, 1, 14));
  const unitSphere = trackGeo(new THREE.SphereGeometry(1, 12, 10));
  const roofShingleTex = regTex(createRoofShingleTexture());

  const darkTimberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4f2f1a, roughness: 0.84, metalness: 0.04 })
  );
  const timberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x85532c, roughness: 0.82, metalness: 0.04 })
  );
  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xd0d0c6, roughness: 0.82, metalness: 0.04 })
  );
  const darkStoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x8d8e87, roughness: 0.86, metalness: 0.04 })
  );
  const creamWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfaf5eb, roughness: 0.72, metalness: 0.03 })
  );
  const skyBlueTrimMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4d8cb8, roughness: 0.6, metalness: 0.08 })
  );
  const crimsonMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xc23328, roughness: 0.62, metalness: 0.06 })
  );
  const brightRedNoseMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe62925, roughness: 0.32, metalness: 0.08 })
  );
  const purpleHullMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x9b6b9e, roughness: 0.64, metalness: 0.06 })
  );
  const darkPlumMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c3a62, roughness: 0.72, metalness: 0.06 })
  );
  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe8b93c, roughness: 0.34, metalness: 0.25 })
  );
  const ironMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.42, metalness: 0.3 })
  );
  const waterJetMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      roughness: 0.16,
      metalness: 0.05,
      transparent: true,
      opacity: 0.82,
    })
  );
  const lampGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffe6a3,
      emissive: 0xffb347,
      emissiveIntensity: 0.85,
      roughness: 0.3,
    })
  );
  const flowerGreenMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b7a38, roughness: 0.86 })
  );
  const flowerRedMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.72 })
  );

  const roofGeoCache = new Map<string, THREE.BufferGeometry>();
  const getRoofGeo = (w: number, d: number, h: number, style: 'hip' | 'gable') => {
    const key = `${w.toFixed(1)}-${d.toFixed(1)}-${h.toFixed(1)}-${style}`;
    let g = roofGeoCache.get(key);
    if (!g) {
      g = trackGeo(createPitchedRoofGeo(w, d, h, style));
      roofGeoCache.set(key, g);
    }
    return g;
  };

  const roofMatCache = new Map<number, THREE.MeshStandardMaterial>();
  const getRoofMat = (color: number) => {
    let m = roofMatCache.get(color);
    if (!m) {
      m = trackMat(
        new THREE.MeshStandardMaterial({
          color,
          map: roofShingleTex,
          roughness: 0.72,
          metalness: 0.04,
        })
      );
      roofMatCache.set(color, m);
    }
    return m;
  };

  const facadeCache = new Map<number, THREE.MeshStandardMaterial>();
  const getFacadeMat = (color: number) => {
    let m = facadeCache.get(color);
    if (!m) {
      const tex = regTex(createHalfTimberFacadeTexture(color));
      m = trackMat(
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0.03 })
      );
      facadeCache.set(color, m);
    }
    return m;
  };

  const buggyFlagMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: regTex(createBuggyFlagTexture()),
      roughness: 0.65,
      side: THREE.DoubleSide,
    })
  );
  const circusTentMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: regTex(createCircusTentTexture('#cf2c28', '#faf6ee')),
      roughness: 0.66,
      metalness: 0.04,
    })
  );
  const purpleTentMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: regTex(createCircusTentTexture('#7e4b8a', '#f2cf66')),
      roughness: 0.66,
      metalness: 0.04,
    })
  );

  // 2. HALF-TIMBERED ORANGE TOWN HOUSES, CHURCH STEEPLE & PET FOOD STORE
  for (const b of ORGAN_BUILDINGS) {
    if (b.id === 'town-corner-hall') continue; // Custom detailed build below

    const hGroup = new THREE.Group();
    const body = new THREE.Mesh(unitBox, getFacadeMat(b.wallColor));
    body.scale.set(b.width, b.height, b.depth);
    body.position.y = b.height * 0.5;
    hGroup.add(body);

    const roofH = Math.min(2.05, b.depth * 0.48);
    const roof = new THREE.Mesh(
      getRoofGeo(b.width, b.depth, roofH, b.roofStyle),
      getRoofMat(b.roofColor)
    );
    roof.position.y = b.height;
    hGroup.add(roof);

    // Gable wall ends when gable roof is used
    if (b.roofStyle === 'gable') {
      const gableGeo = trackGeo(createGableEndTriangleGeo(b.depth, roofH));
      const gW = new THREE.Mesh(gableGeo, getFacadeMat(b.wallColor));
      gW.position.set(-b.width * 0.5 - 0.01, b.height, 0);
      const gE = new THREE.Mesh(gableGeo, getFacadeMat(b.wallColor));
      gE.position.set(b.width * 0.5 + 0.01, b.height, 0);
      hGroup.add(gW, gE);
    }

    if (b.hasChimney) {
      const chimney = new THREE.Mesh(unitBox, darkStoneMat);
      chimney.scale.set(0.42, 1.05, 0.42);
      chimney.position.set(b.width * 0.28, b.height + roofH * 0.62, 0.25);
      hGroup.add(chimney);
    }

    if (b.hasDormers) {
      for (const dx of [-b.width * 0.24, b.width * 0.24]) {
        const dormer = new THREE.Mesh(unitBox, creamWhiteMat);
        dormer.scale.set(0.82, 0.72, 0.9);
        dormer.position.set(dx, b.height + roofH * 0.36, b.depth * 0.26);
        const dCap = new THREE.Mesh(
          getRoofGeo(0.86, 0.94, 0.42, 'gable'),
          getRoofMat(b.roofColor)
        );
        dCap.position.set(dx, b.height + roofH * 0.72, b.depth * 0.26);
        hGroup.add(dormer, dCap);
      }
    }

    if (b.hasFlowerBox) {
      const planter = new THREE.Mesh(unitBox, darkTimberMat);
      planter.scale.set(1.1, 0.24, 0.32);
      planter.position.set(-b.width * 0.26, 1.05, b.depth * 0.5 + 0.16);
      const bush = new THREE.Mesh(unitBox, flowerGreenMat);
      bush.scale.set(0.98, 0.22, 0.26);
      bush.position.set(-b.width * 0.26, 1.24, b.depth * 0.5 + 0.16);
      const blossoms = new THREE.Mesh(unitSphere, flowerRedMat);
      blossoms.scale.set(0.2, 0.14, 0.16);
      blossoms.position.set(-b.width * 0.26, 1.36, b.depth * 0.5 + 0.16);
      const barrel = new THREE.Mesh(unitCyl, timberMat);
      barrel.scale.set(0.28, 0.66, 0.28);
      barrel.position.set(b.width * 0.34, 0.33, b.depth * 0.5 + 0.32);
      hGroup.add(planter, bush, blossoms, barrel);
    }

    // Church Bell-Tower Steeple (visible down Whale Fountain avenue in Orange_manga_de459b0c.webp)
    if (b.isChurch) {
      const belfry = new THREE.Mesh(unitBox, creamWhiteMat);
      belfry.scale.set(1.85, 3.8, 1.85);
      belfry.position.set(0, b.height + roofH + 0.8, -0.5);
      const spire = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(1.45, 2.7, 4)),
        getRoofMat(b.roofColor)
      );
      spire.rotation.y = Math.PI * 0.25;
      spire.position.set(0, b.height + roofH + 4.05, -0.5);
      const crossV = new THREE.Mesh(unitBox, goldMat);
      crossV.scale.set(0.14, 0.95, 0.14);
      crossV.position.set(0, b.height + roofH + 5.7, -0.5);
      const crossH = new THREE.Mesh(unitBox, goldMat);
      crossH.scale.set(0.55, 0.14, 0.14);
      crossH.position.set(0, b.height + roofH + 5.85, -0.5);
      hGroup.add(belfry, spire, crossV, crossH);
    }

    // PET FOOD Shop red trim, storefront awning & "PET FOOD" banner sign
    if (b.id === 'pet-food-shop') {
      const petSignMat = trackMat(
        new THREE.MeshStandardMaterial({
          map: regTex(createPetFoodSignTexture()),
          roughness: 0.55,
          metalness: 0.05,
        })
      );
      // Red corner trim posts
      for (const sx of [-b.width * 0.5 + 0.16, b.width * 0.5 - 0.16]) {
        const post = new THREE.Mesh(unitBox, crimsonMat);
        post.scale.set(0.32, b.height, 0.34);
        post.position.set(sx, b.height * 0.5, b.depth * 0.5 + 0.04);
        hGroup.add(post);
      }
      // Red sloped porch awning facing South (+Z)
      const awning = new THREE.Mesh(unitBox, crimsonMat);
      awning.scale.set(b.width * 0.9, 0.16, 1.35);
      awning.position.set(0, 2.05, b.depth * 0.5 + 0.62);
      awning.rotation.x = 0.22;
      // Bold "PET FOOD" wooden sign directly over storefront
      const signBack = new THREE.Mesh(unitBox, darkTimberMat);
      signBack.scale.set(4.5, 1.25, 0.16);
      signBack.position.set(0, 2.95, b.depth * 0.5 + 0.14);
      const signFace = new THREE.Mesh(unitBox, petSignMat);
      signFace.scale.set(4.3, 1.12, 0.08);
      signFace.position.set(0, 2.95, b.depth * 0.5 + 0.24);
      hGroup.add(awning, signBack, signFace);

      // Pet Food crates & sacks neatly stacked beside shop entrance
      for (const [cx, cw] of [
        [-2.05, 0.72],
        [-1.35, 0.58],
        [2.0, 0.68],
      ]) {
        const crate = new THREE.Mesh(unitBox, timberMat);
        crate.scale.set(cw, cw * 0.85, cw);
        crate.position.set(cx, cw * 0.42, b.depth * 0.5 + 0.48);
        hGroup.add(crate);
      }
    }

    placeOnSphere(hGroup, b.x, b.y - 0.08, b.z, b.yaw);
    group.add(hGroup);
  }

  // 3A. ORANGE TOWN CORNER HALL (-18.5, 22.8) — Clean civic corner building with rooftop terrace (not Buggy's HQ)
  const pubFlags: THREE.Mesh[] = [];
  {
    const hall = new THREE.Group();
    const bW = 9.6;
    const bH = 5.0;
    const bD = 7.4;

    const hallBody = new THREE.Mesh(unitBox, getFacadeMat(0xf3df9e));
    hallBody.scale.set(bW, bH, bD);
    hallBody.position.y = bH * 0.5;
    hall.add(hallBody);

    const cornice = new THREE.Mesh(unitBox, skyBlueTrimMat);
    cornice.scale.set(bW + 0.75, 0.85, bD + 0.75);
    cornice.position.y = bH + 0.2;
    hall.add(cornice);

    for (const gx of [-3.1, 0, 3.1]) {
      const eave = new THREE.Mesh(
        getRoofGeo(2.3, 1.5, 1.05, 'gable'),
        skyBlueTrimMat
      );
      eave.position.set(gx, bH + 0.52, bD * 0.5 + 0.12);
      hall.add(eave);
    }

    const roofDeck = new THREE.Mesh(unitBox, stoneMat);
    roofDeck.scale.set(bW + 0.3, 0.28, bD + 0.3);
    roofDeck.position.y = bH + 0.65;
    hall.add(roofDeck);

    const railH = 0.75;
    const addRail = (rx: number, rz: number, rw: number, rd: number) => {
      const r = new THREE.Mesh(unitBox, creamWhiteMat);
      r.scale.set(rw, 0.14, rd);
      r.position.set(rx, bH + 0.75 + railH, rz);
      hall.add(r);
      const count = Math.max(2, Math.round(Math.max(rw, rd) / 1.1));
      for (let i = 0; i <= count; i++) {
        const t = i / count - 0.5;
        const post = new THREE.Mesh(unitBox, creamWhiteMat);
        post.scale.set(0.1, railH, 0.1);
        post.position.set(
          rx + (rw > rd ? t * (rw - 0.15) : 0),
          bH + 0.75 + railH * 0.5,
          rz + (rd > rw ? t * (rd - 0.15) : 0)
        );
        hall.add(post);
      }
    };
    addRail(0, -bD * 0.5, bW, 0.12);
    addRail(0, bD * 0.5, bW, 0.12);
    addRail(-bW * 0.5, 0, 0.12, bD);
    addRail(bW * 0.5, 0, 0.12, bD);

    // Covered Front Porch & Exterior East Staircase
    const porchRoof = new THREE.Mesh(unitBox, skyBlueTrimMat);
    porchRoof.scale.set(5.4, 0.22, 1.6);
    porchRoof.position.set(0, 2.35, bD * 0.5 + 0.8);
    hall.add(porchRoof);
    for (const px of [-2.4, 2.4]) {
      const post = new THREE.Mesh(unitBox, creamWhiteMat);
      post.scale.set(0.16, 2.35, 0.16);
      post.position.set(px, 1.17, bD * 0.5 + 1.5);
      hall.add(post);
    }

    const stairSteps = 10;
    for (let s = 0; s < stairSteps; s++) {
      const t = s / (stairSteps - 1);
      const step = new THREE.Mesh(unitBox, creamWhiteMat);
      step.scale.set(1.15, 0.2, 0.55);
      step.position.set(
        bW * 0.5 + 0.62,
        0.35 + t * (bH + 0.3),
        bD * 0.35 - t * (bD * 0.65)
      );
      hall.add(step);
    }

    // Small clean civic slate-blue rooftop pavilion
    const cupolaBase = new THREE.Mesh(unitBox, creamWhiteMat);
    cupolaBase.scale.set(3.2, 1.2, 2.8);
    cupolaBase.position.set(0, bH + 0.78 + 0.6, -0.2);
    const cupolaRoof = new THREE.Mesh(
      getRoofGeo(3.4, 3.0, 1.25, 'hip'),
      getRoofMat(0x4b749c)
    );
    cupolaRoof.position.set(0, bH + 0.78 + 1.2, -0.2);
    hall.add(cupolaBase, cupolaRoof);

    placeOnSphere(
      hall,
      ORGAN_LANDMARKS.townCornerHall.x,
      ORGAN_LANDMARKS.townCornerHall.y - 0.08,
      ORGAN_LANDMARKS.townCornerHall.z,
      0
    );
    group.add(hall);
  }

  // 3B. BUGGY'S GRAND CHAPITEAU (HQ ACROSS THE EASTERN BRIDGE: 47.2, 29.2)
  {
    const chapiteau = new THREE.Group();
    const ringSandMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xd9bc82, roughness: 0.9, metalness: 0.02 })
    );
    const darkInteriorMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x281316, roughness: 0.92, metalness: 0.02 })
    );
    const chapBannerMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: regTex(createBuggyChapiteauBannerTexture()),
        roughness: 0.5,
        metalness: 0.05,
      })
    );

    // Circular sawdust circus ring plinth sunk solidly into clearing ground
    const plinth = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(7.2, 7.6, 0.44, 24)),
      ringSandMat
    );
    plinth.position.y = 0.02;
    const curb = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(7.15, 0.16, 8, 28)),
      darkTimberMat
    );
    curb.rotation.x = Math.PI * 0.5;
    curb.position.y = 0.18;
    chapiteau.add(plinth, curb);

    // Main 16-sided Red & White Striped Circus Tent Drum & Towering Conical Big Top Canopy
    const mainDrum = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(5.9, 6.4, 3.8, 16)),
      circusTentMat
    );
    mainDrum.position.y = 2.05;
    const eaveValance = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(6.75, 6.95, 0.42, 16)),
      crimsonMat
    );
    eaveValance.position.y = 3.85;
    const goldTrimRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(6.45, 0.12, 8, 28)),
      goldMat
    );
    goldTrimRing.rotation.x = Math.PI * 0.5;
    goldTrimRing.position.y = 4.02;
    const mainCanopy = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(7.1, 4.9, 16)),
      circusTentMat
    );
    mainCanopy.position.y = 6.35;

    // Upper Crown Cupola Tier + Finial + Waving Buggy Jolly Roger Flag
    const upperDrum = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.05, 2.35, 1.3, 12)),
      circusTentMat
    );
    upperDrum.position.y = 8.45;
    const upperCone = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(2.4, 2.05, 12)),
      circusTentMat
    );
    upperCone.position.y = 10.05;
    const finialBall = new THREE.Mesh(unitSphere, goldMat);
    finialBall.scale.setScalar(0.36);
    finialBall.position.y = 11.1;
    const mainMast = new THREE.Mesh(unitCyl, darkTimberMat);
    mainMast.scale.set(0.1, 3.1, 0.1);
    mainMast.position.y = 12.6;
    const chapFlag = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(2.8, 1.75, 4, 2)),
      buggyFlagMat
    );
    chapFlag.position.set(1.4, 13.3, 0);
    pubFlags.push(chapFlag);

    chapiteau.add(
      mainDrum,
      eaveValance,
      goldTrimRing,
      mainCanopy,
      upperDrum,
      upperCone,
      finialBall,
      mainMast,
      chapFlag
    );

    // Projecting Front Marquee Entrance (+Z oriented toward WSW wooden bridge trail)
    const entryArch = new THREE.Mesh(unitBox, darkInteriorMat);
    entryArch.scale.set(2.9, 3.0, 1.8);
    entryArch.position.set(0, 1.65, 5.75);
    const entryGlow = new THREE.Mesh(unitBox, lampGlowMat);
    entryGlow.scale.set(1.75, 2.25, 0.16);
    entryGlow.position.set(0, 1.45, 5.65);

    const marqueeRoof = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.8, 0.34, 2.6)),
      circusTentMat
    );
    marqueeRoof.rotation.x = 0.14;
    marqueeRoof.position.set(0, 3.35, 6.9);

    const marqueeTrim = new THREE.Mesh(unitBox, crimsonMat);
    marqueeTrim.scale.set(3.95, 0.32, 0.24);
    marqueeTrim.position.set(0, 3.25, 8.12);

    // Parted Crimson Curtain Flaps + Striped Front Entrance Poles + Warm Lanterns
    for (const sx of [-1.45, 1.45]) {
      const curtain = new THREE.Mesh(unitBox, crimsonMat);
      curtain.scale.set(0.95, 3.05, 0.35);
      curtain.position.set(sx * 0.92, 1.7, 6.7);
      curtain.rotation.z = sx > 0 ? -0.14 : 0.14;

      const pole = new THREE.Mesh(unitCyl, goldMat);
      pole.scale.set(0.14, 3.35, 0.14);
      pole.position.set(sx * 1.25, 1.72, 7.95);

      const postCap = new THREE.Mesh(unitSphere, brightRedNoseMat);
      postCap.scale.setScalar(0.22);
      postCap.position.set(sx * 1.25, 3.55, 7.95);

      const lantern = new THREE.Mesh(unitSphere, lampGlowMat);
      lantern.scale.set(0.22, 0.28, 0.22);
      lantern.position.set(sx * 1.45, 2.65, 8.05);

      chapiteau.add(curtain, pole, postCap, lantern);
    }

    // "CHAPITEAU DE BAGGY" Carnival Banner Sign mounted cleanly above marquee entrance
    const bannerBack = new THREE.Mesh(unitBox, darkTimberMat);
    bannerBack.scale.set(4.5, 1.25, 0.16);
    bannerBack.position.set(0, 4.18, 8.08);
    const bannerFace = new THREE.Mesh(unitBox, chapBannerMat);
    bannerFace.scale.set(4.32, 1.1, 0.08);
    bannerFace.position.set(0, 4.18, 8.17);
    chapiteau.add(entryArch, entryGlow, marqueeRoof, marqueeTrim, bannerBack, bannerFace);

    // Perimeter Guy Ropes & Wooden Stakes anchoring the Big Top
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.32;
      // Leave entrance corridor clear
      if (Math.sin(a) > 0.72 && Math.abs(Math.cos(a)) < 0.55) continue;
      const sx = Math.cos(a) * 7.6;
      const sz = Math.sin(a) * 7.6;
      const ex = Math.cos(a) * 6.3;
      const ez = Math.sin(a) * 6.3;

      const stake = new THREE.Mesh(unitCyl, darkTimberMat);
      stake.scale.set(0.1, 0.72, 0.1);
      stake.position.set(sx, 0.3, sz);
      stake.rotation.z = Math.cos(a) * -0.25;
      stake.rotation.x = Math.sin(a) * 0.25;

      const ropeGeo = trackGeo(
        new THREE.TubeGeometry(
          new THREE.LineCurve3(
            new THREE.Vector3(ex, 3.85, ez),
            new THREE.Vector3(sx, 0.35, sz)
          ),
          3,
          0.035,
          4,
          false
        )
      );
      const rope = new THREE.Mesh(ropeGeo, creamWhiteMat);
      chapiteau.add(stake, rope);
    }

    // Buggy Pirates Cannon & Pirate Supply Barrels flanking the Chapiteau Entrance
    const cannonGroup = new THREE.Group();
    const carriage = new THREE.Mesh(unitBox, darkTimberMat);
    carriage.scale.set(1.2, 0.65, 1.85);
    carriage.position.y = 0.42;
    const barrel = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.36, 0.52, 2.8, 14)),
      ironMat
    );
    barrel.rotation.x = Math.PI * 0.46;
    barrel.position.set(0, 0.95, 0.32);
    const muzzleRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.38, 0.065, 8, 14)),
      goldMat
    );
    muzzleRing.position.set(0, 1.12, 1.68);
    cannonGroup.add(carriage, barrel, muzzleRing);
    cannonGroup.position.set(-3.1, 0.12, 7.2);
    cannonGroup.rotation.y = 0.15;

    for (const [bx, bz] of [
      [3.1, 7.1],
      [3.75, 6.7],
      [2.65, 7.65],
    ]) {
      const keg = new THREE.Mesh(unitCyl, crimsonMat);
      keg.scale.set(0.38, 0.86, 0.38);
      keg.position.set(bx, 0.55, bz);
      chapiteau.add(keg);
    }
    const crate = new THREE.Mesh(unitBox, timberMat);
    crate.scale.set(0.95, 0.85, 0.95);
    crate.position.set(3.45, 0.54, 7.6);
    chapiteau.add(cannonGroup, crate);

    placeOnSphere(
      chapiteau,
      ORGAN_LANDMARKS.buggyChapiteau.x,
      ORGAN_LANDMARKS.buggyChapiteau.y - 0.08,
      ORGAN_LANDMARKS.buggyChapiteau.z,
      -1.02
    );
    group.add(chapiteau);
  }

  // 4. CHOUCHOU GUARDING THE PET FOOD STOREFRONT (6.2, 33.9)
  let chouchouHead: THREE.Group | null = null;
  {
    const dog = new THREE.Group();
    const whiteFurMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xfaf8f2, roughness: 0.9, metalness: 0.01 })
    );
    const dogCollarMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45, metalness: 0.1 })
    );

    // Seated fluffy torso & haunches (grounded at bottom-center y=0)
    const torso = new THREE.Mesh(unitSphere, whiteFurMat);
    torso.scale.set(0.34, 0.38, 0.42);
    torso.position.set(0, 0.36, -0.04);
    const chestFluff = new THREE.Mesh(unitSphere, whiteFurMat);
    chestFluff.scale.set(0.32, 0.34, 0.32);
    chestFluff.position.set(0, 0.42, 0.12);

    // Front legs & seated back paws
    for (const px of [-0.14, 0.14]) {
      const frontLeg = new THREE.Mesh(unitCyl, whiteFurMat);
      frontLeg.scale.set(0.08, 0.38, 0.08);
      frontLeg.position.set(px, 0.19, 0.2);
      const backPaw = new THREE.Mesh(unitSphere, whiteFurMat);
      backPaw.scale.set(0.11, 0.09, 0.16);
      backPaw.position.set(px * 1.15, 0.09, -0.02);
      dog.add(frontLeg, backPaw);
    }

    // Fluffy tail curled up at rear
    const tail = new THREE.Mesh(unitSphere, whiteFurMat);
    tail.scale.set(0.11, 0.14, 0.12);
    tail.position.set(0, 0.34, -0.36);

    // Red collar & gold bell tag
    const collar = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.22, 0.045, 8, 16)),
      dogCollarMat
    );
    collar.rotation.x = Math.PI * 0.44;
    collar.position.set(0, 0.58, 0.15);
    const tag = new THREE.Mesh(unitSphere, goldMat);
    tag.scale.setScalar(0.06);
    tag.position.set(0, 0.54, 0.36);

    // Head group (gently looks/bobs faithfully on guard)
    const headGrp = new THREE.Group();
    headGrp.position.set(0, 0.72, 0.18);
    const cranium = new THREE.Mesh(unitSphere, whiteFurMat);
    cranium.scale.set(0.29, 0.27, 0.28);
    const muzzle = new THREE.Mesh(unitSphere, whiteFurMat);
    muzzle.scale.set(0.16, 0.12, 0.18);
    muzzle.position.set(0, -0.05, 0.22);
    const nose = new THREE.Mesh(unitSphere, ironMat);
    nose.scale.set(0.06, 0.045, 0.05);
    nose.position.set(0, -0.02, 0.36);
    headGrp.add(cranium, muzzle, nose);

    for (const ex of [-0.11, 0.11]) {
      const eye = new THREE.Mesh(unitSphere, ironMat);
      eye.scale.setScalar(0.04);
      eye.position.set(ex, 0.05, 0.23);
      const ear = new THREE.Mesh(unitSphere, whiteFurMat);
      ear.scale.set(0.11, 0.19, 0.11);
      ear.rotation.z = ex > 0 ? -0.35 : 0.35;
      ear.position.set(ex * 2.35, -0.02, -0.02);
      headGrp.add(eye, ear);
    }
    chouchouHead = headGrp;

    // Food bowl beside Chouchou on cobblestones
    const bowl = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.26, 0.32, 0.14, 14)),
      crimsonMat
    );
    bowl.position.set(0.55, 0.07, 0.18);

    dog.add(torso, chestFluff, tail, collar, tag, headGrp, bowl);
    dog.scale.setScalar(1.26);
    placeOnSphere(
      dog,
      ORGAN_LANDMARKS.chouchou.x,
      ORGAN_TOWN_Y,
      ORGAN_LANDMARKS.chouchou.z,
      0.08
    );
    group.add(dog);
  }

  // 5. ICONIC WHALE FOUNTAIN IN THE CENTRAL SQUARE (-10.0, 46.8)
  let whaleJetLeft: THREE.Mesh | null = null;
  let whaleJetRight: THREE.Mesh | null = null;
  {
    const fount = new THREE.Group();
    const outerBasin = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(3.05, 3.25, 0.62, 24)),
      stoneMat
    );
    outerBasin.position.y = 0.31;
    const innerRim = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.15, 2.35, 0.92, 20)),
      darkStoneMat
    );
    innerRim.position.y = 0.46;
    const waterDisc = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.85, 2.85, 0.08, 24)),
      waterJetMat
    );
    waterDisc.position.y = 0.58;
    const plinth = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.7, 0.95, 0.8, 16)),
      stoneMat
    );
    plinth.position.y = 1.1;

    // Carved Smiling Whale Statue arching upward inside fountain
    const whaleBodyCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.45, -0.15),
      new THREE.Vector3(0, 2.05, -0.45),
      new THREE.Vector3(0, 2.75, 0.05),
      new THREE.Vector3(0, 3.0, 0.55),
    ]);
    const whaleBody = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(whaleBodyCurve, 12, 0.55, 10, false)),
      stoneMat
    );
    const whaleHead = new THREE.Mesh(unitSphere, stoneMat);
    whaleHead.scale.set(0.86, 0.82, 0.92);
    whaleHead.position.set(0, 2.95, 0.38);
    // Grinning carved mouth groove
    const smile = new THREE.Mesh(unitBox, darkStoneMat);
    smile.scale.set(1.12, 0.22, 0.55);
    smile.position.set(0, 2.72, 0.85);
    const tailFluke = new THREE.Mesh(unitBox, stoneMat);
    tailFluke.scale.set(1.35, 0.18, 0.62);
    tailFluke.position.set(0, 1.75, -0.68);
    tailFluke.rotation.x = -0.5;
    fount.add(outerBasin, innerRim, waterDisc, plinth, whaleBody, whaleHead, smile, tailFluke);

    for (const fx of [-0.72, 0.72]) {
      const fin = new THREE.Mesh(unitBox, stoneMat);
      fin.scale.set(0.56, 0.16, 0.36);
      fin.rotation.z = fx > 0 ? -0.35 : 0.35;
      fin.position.set(fx, 2.38, 0.15);
      fount.add(fin);
    }

    // Twin Arched Water Jets spouting out of Whale Blowhole into the outer basin
    const makeJet = (dirSign: number) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 3.65, 0.25),
        new THREE.Vector3(dirSign * 0.95, 4.35, 0.22),
        new THREE.Vector3(dirSign * 1.95, 3.1, 0.18),
        new THREE.Vector3(dirSign * 2.35, 0.65, 0.15),
      ]);
      return new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(curve, 16, 0.13, 8, false)),
        waterJetMat
      );
    };
    whaleJetLeft = makeJet(-1);
    whaleJetRight = makeJet(1);
    fount.add(whaleJetLeft, whaleJetRight);

    placeOnSphere(
      fount,
      ORGAN_LANDMARKS.whaleFountain.x,
      ORGAN_TOWN_Y,
      ORGAN_LANDMARKS.whaleFountain.z,
      0
    );
    group.add(fount);
  }

  // 6. SOUTHERN HARBOR QUAY & BUGGY'S PIRATE FLAGSHIP ("BIG TOP")
  let bigTopShipGroup: THREE.Group | null = null;
  {
    // Timber & stone harbor seawall quay along z = 56.2
    const quay = new THREE.Group();
    const deck = new THREE.Mesh(unitBox, darkTimberMat);
    deck.scale.set(44.5, 0.36, 3.4);
    deck.position.y = 0.08;
    const stoneWall = new THREE.Mesh(unitBox, darkStoneMat);
    stoneWall.scale.set(44.2, 6.8, 3.1);
    stoneWall.position.y = -3.35;
    quay.add(deck, stoneWall);

    for (let px = -20.5; px <= 20.5; px += 4.5) {
      const bollard = new THREE.Mesh(unitCyl, darkTimberMat);
      bollard.scale.set(0.18, 0.52, 0.18);
      bollard.position.set(px, 0.42, 1.3);
      quay.add(bollard);
    }
    for (const [cx, cz] of [
      [-14.5, -0.4],
      [-13.6, -0.3],
      [6.5, -0.5],
    ]) {
      const crate = new THREE.Mesh(unitBox, timberMat);
      crate.scale.set(0.85, 0.72, 0.85);
      crate.position.set(cx, 0.6, cz);
      quay.add(crate);
    }
    placeOnSphere(
      quay,
      ORGAN_LANDMARKS.harborQuay.x,
      ORGAN_QUAY_Y,
      ORGAN_LANDMARKS.harborQuay.z,
      0
    );
    group.add(quay);

    // BUGGY'S FLAGSHIP "BIG TOP" moored along southern quay facing West (-X)
    const ship = new THREE.Group();
    const hullGeo = trackGeo(createBigTopHullGeo());
    const hullMesh = new THREE.Mesh(hullGeo, purpleHullMat);
    ship.add(hullMesh);

    const keelTrim = new THREE.Mesh(hullGeo, darkPlumMat);
    keelTrim.scale.set(1.03, 0.32, 1.03);
    keelTrim.position.y = -0.1;
    const gunwale = new THREE.Mesh(hullGeo, timberMat);
    gunwale.scale.set(1.02, 0.14, 1.02);
    gunwale.position.y = 2.38;
    ship.add(keelTrim, gunwale);

    const mainDeck = new THREE.Mesh(unitBox, timberMat);
    mainDeck.scale.set(7.4, 0.24, 17.5);
    mainDeck.position.set(0, 2.45, -0.2);
    ship.add(mainDeck);

    // Broadside Cannons along port & starboard hull
    for (const sx of [-4.4, 4.4]) {
      for (const cz of [-4.5, 0.5, 4.8]) {
        const c = new THREE.Mesh(unitCyl, ironMat);
        c.rotation.z = Math.PI * 0.5;
        c.scale.set(0.26, 1.15, 0.26);
        c.position.set(sx, 1.65, cz);
        ship.add(c);
      }
    }

    // Central Massive Red & White Striped Big Top Circus Tent on Main Deck!
    const tentDrum = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(3.85, 4.05, 2.2, 16)),
      circusTentMat
    );
    tentDrum.position.set(0, 3.6, -0.8);
    const tentRoof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(4.25, 4.1, 16)),
      circusTentMat
    );
    tentRoof.position.set(0, 6.75, -0.8);
    const tentEntrance = new THREE.Mesh(unitBox, ironMat);
    tentEntrance.scale.set(1.8, 1.9, 1.3);
    tentEntrance.position.set(0, 3.45, -4.45);
    ship.add(tentDrum, tentRoof, tentEntrance);

    // Secondary Purple & Gold Striped Stern Dome / Pavilion (matching orange_town_39b1ec20.png)
    const sternDrum = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.65, 2.85, 1.9, 14)),
      purpleTentMat
    );
    sternDrum.position.set(0, 3.55, 6.6);
    const sternCone = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(2.9, 2.2, 14)),
      purpleTentMat
    );
    sternCone.position.set(0, 5.6, 6.6);
    ship.add(sternDrum, sternCone);

    // Iconic Giant Clown-Elephant Figurehead at the Bow (-Z)
    const fh = new THREE.Group();
    fh.position.set(0, 3.5, -11.4);
    // White pleated clown ruff collar ring
    const ruffRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.55, 0.52, 10, 18)),
      creamWhiteMat
    );
    ruffRing.position.set(0, -0.2, 0.65);
    const headSphere = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(1.55, 14, 12)),
      creamWhiteMat
    );
    headSphere.position.set(0, 0.65, -0.2);
    // Red skullcap on top of clown-elephant head
    const cap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(1.48, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.45)),
      brightRedNoseMat
    );
    cap.position.set(0, 0.78, -0.2);
    // Trunk extending forward holding a GIANT glossy Red Clown Nose!
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.4, -1.3),
      new THREE.Vector3(0, 0.25, -2.5),
      new THREE.Vector3(0, 0.48, -3.4),
    ]);
    const trunk = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(trunkCurve, 10, 0.34, 8, false)),
      creamWhiteMat
    );
    const clownNose = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.95, 14, 12)),
      brightRedNoseMat
    );
    clownNose.position.set(0, 0.62, -3.95);
    fh.add(ruffRing, headSphere, cap, trunk, clownNose);

    for (const sx of [-1.45, 1.45]) {
      const ear = new THREE.Mesh(unitSphere, creamWhiteMat);
      ear.scale.set(0.45, 0.95, 0.85);
      ear.position.set(sx, 0.62, 0.1);
      const tusk = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.18, 1.1, 8)),
        creamWhiteMat
      );
      tusk.rotation.x = -Math.PI * 0.45;
      tusk.position.set(sx * 0.55, 0.1, -1.65);
      const eye = new THREE.Mesh(unitSphere, ironMat);
      eye.scale.setScalar(0.18);
      eye.position.set(sx * 0.48, 0.9, -1.55);
      fh.add(ear, tusk, eye);
    }
    ship.add(fh);

    // Tall Foremast & Mainmast with Stacked Crescent White Sails, Ratlines & Buggy Flags
    const mastSpecs: readonly [number, number, number][] = [
      [-6.8, 9.6, 5.4],
      [-0.8, 12.2, 6.4],
    ];
    const sailMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfefcf7,
        roughness: 0.7,
        side: THREE.DoubleSide,
      })
    );
    for (const [mz, mh, sw] of mastSpecs) {
      const mast = new THREE.Mesh(unitCyl, timberMat);
      mast.scale.set(0.22, mh, 0.22);
      mast.position.set(0, 2.4 + mh * 0.5, mz);

      const nest = new THREE.Mesh(unitCyl, darkTimberMat);
      nest.scale.set(0.92, 0.45, 0.92);
      nest.position.set(0, 2.4 + mh * 0.78, mz);

      const yardSpecs: readonly [number, number, number][] = [
        [0.44, sw, mh * 0.22],
        [0.68, sw * 0.84, mh * 0.18],
      ];
      for (const [fracY, yWidth, sailH] of yardSpecs) {
        const yPos = 2.4 + mh * fracY;
        const yard = new THREE.Mesh(unitBox, darkTimberMat);
        yard.scale.set(yWidth + 0.85, 0.15, 0.15);
        yard.position.set(0, yPos + sailH * 0.5, mz - 0.16);

        const sailGeo = trackGeo(new THREE.PlaneGeometry(yWidth, sailH, 10, 6));
        const sPos = sailGeo.attributes.position as THREE.BufferAttribute;
        for (let si = 0; si < sPos.count; si++) {
          const sx = sPos.getX(si) / (yWidth * 0.5);
          const sy = sPos.getY(si) / (sailH * 0.5);
          // Crescent drape: belly forward (-Z) and upward scallop at bottom center
          const belly = (1 - sy * sy * 0.65) * (1 - sx * sx * 0.35) * -0.92;
          if (sy < 0) {
            sPos.setY(si, sPos.getY(si) + (1 - sx * sx) * sailH * 0.22);
          }
          sPos.setZ(si, belly);
        }
        sailGeo.computeVertexNormals();
        const sail = new THREE.Mesh(sailGeo, sailMat);
        sail.position.set(0, yPos, mz - 0.22);
        ship.add(yard, sail);
      }

      const flag = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(2.3, 1.4, 4, 2)),
        buggyFlagMat
      );
      flag.position.set(1.2, 2.4 + mh * 0.94, mz);
      pubFlags.push(flag);

      // Diagonal shroud stays to gunwale
      for (const sx of [-3.6, 3.6]) {
        for (const szOff of [-0.55, 0.55]) {
          const stay = new THREE.Mesh(
            trackGeo(
              new THREE.TubeGeometry(
                new THREE.LineCurve3(
                  new THREE.Vector3(sx, 2.5, mz + szOff),
                  new THREE.Vector3(sx * 0.18, 2.4 + mh * 0.76, mz)
                ),
                4,
                0.05,
                5,
                false
              )
            ),
            darkTimberMat
          );
          ship.add(stay);
        }
      }

      ship.add(mast, nest, flag);
    }

    // Orient bow West (-X) with yaw = +PI/2 matching map & isometric view!
    placeOnSphere(
      ship,
      ORGAN_LANDMARKS.bigTopShip.x,
      ORGAN_LANDMARKS.bigTopShip.y,
      ORGAN_LANDMARKS.bigTopShip.z,
      Math.PI * 0.5
    );
    group.add(ship);
    bigTopShipGroup = ship;
  }

  // 7. EASTERN ARCHED WOODEN RIVER BRIDGE, BLAST CRATER RUBBLE, WELL & STREETLAMPS
  {
    const bridge = new THREE.Group();
    const span = 10.4;
    const deckSegs = 12;
    for (let i = 0; i < deckSegs; i++) {
      const t = (i + 0.5) / deckSegs;
      const lx = (t - 0.5) * span;
      const ly = Math.sin(t * Math.PI) * 0.95;
      const plank = new THREE.Mesh(unitBox, timberMat);
      plank.scale.set(span / deckSegs + 0.08, 0.26, 3.4);
      plank.position.set(lx, ly, 0);
      bridge.add(plank);

      for (const rz of [-1.55, 1.55]) {
        const post = new THREE.Mesh(unitBox, darkTimberMat);
        post.scale.set(0.16, 0.88, 0.16);
        post.position.set(lx, ly + 0.48, rz);
        const rail = new THREE.Mesh(unitBox, darkTimberMat);
        rail.scale.set(span / deckSegs + 0.12, 0.14, 0.16);
        rail.position.set(lx, ly + 0.88, rz);
        bridge.add(post, rail);
      }
    }
    for (const px of [-2.4, 2.4]) {
      for (const pz of [-1.4, 1.4]) {
        const piling = new THREE.Mesh(unitCyl, darkTimberMat);
        piling.scale.set(0.22, 6.8, 0.22);
        piling.position.set(px, -2.8, pz);
        bridge.add(piling);
      }
    }
    placeOnSphere(
      bridge,
      ORGAN_LANDMARKS.eastBridge.x,
      2.85,
      ORGAN_LANDMARKS.eastBridge.z,
      0
    );
    group.add(bridge);

    // SW Buggy Ball Blast Crater Rubble (-30.5, 33.5) sunk firmly inside concave crater floor
    const rubblePos: readonly [number, number, number][] = [
      [-31.2, 33.2, 0.4],
      [-29.2, 34.1, -0.6],
      [-31.8, 34.0, 1.1],
      [-28.8, 32.8, 0.2],
    ];
    for (const [rx, rz, rot] of rubblePos) {
      const beam = new THREE.Mesh(unitBox, darkTimberMat);
      beam.scale.set(1.6, 0.24, 0.32);
      placeOnSphere(beam, rx, sampleOrganHeight(rx, rz) - 0.04, rz, rot);
      group.add(beam);
    }

    // Stone Town Well near E-W Avenue (10.6, 38.6)
    const well = new THREE.Group();
    const wRim = new THREE.Mesh(unitCyl, stoneMat);
    wRim.scale.set(0.82, 0.68, 0.82);
    wRim.position.y = 0.34;
    const wRoof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.05, 0.65, 8)),
      crimsonMat
    );
    wRoof.position.y = 1.65;
    for (const px of [-0.62, 0.62]) {
      const post = new THREE.Mesh(unitBox, darkTimberMat);
      post.scale.set(0.14, 1.1, 0.14);
      post.position.set(px, 0.9, 0);
      well.add(post);
    }
    well.add(wRim, wRoof);
    placeOnSphere(
      well,
      ORGAN_LANDMARKS.townWell.x,
      ORGAN_TOWN_Y,
      ORGAN_LANDMARKS.townWell.z,
      0
    );
    group.add(well);

    // Cast-Iron European Streetlamps along Whale Fountain Avenue & Market Street
    const lampCoords: readonly [number, number][] = [
      [-13.0, 51.8],
      [-7.0, 51.8],
      [-13.0, 42.5],
      [-7.0, 42.5],
      [-13.0, 34.0],
      [2.8, 34.2],
      [9.6, 34.2],
      [15.8, 34.2],
    ];
    for (const [lx, lz] of lampCoords) {
      const lamp = new THREE.Group();
      const post = new THREE.Mesh(unitCyl, ironMat);
      post.scale.set(0.08, 2.35, 0.08);
      post.position.y = 1.18;
      const bulb = new THREE.Mesh(unitBox, lampGlowMat);
      bulb.scale.set(0.24, 0.34, 0.24);
      bulb.position.y = 2.48;
      const cap = new THREE.Mesh(unitBox, ironMat);
      cap.scale.set(0.32, 0.1, 0.32);
      cap.position.y = 2.68;
      lamp.add(post, bulb, cap);
      placeOnSphere(lamp, lx, sampleOrganHeight(lx, lz), lz, 0);
      group.add(lamp);
    }

    // SW Coastal Red Watch-Tower Circle visible on organ_town_39b1ec20.png
    const swTower = new THREE.Group();
    const tBase = new THREE.Mesh(unitCyl, stoneMat);
    tBase.scale.set(1.65, 2.8, 1.65);
    tBase.position.y = 1.4;
    const tCap = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(2.05, 1.5, 12)),
      crimsonMat
    );
    tCap.position.y = 3.55;
    swTower.add(tBase, tCap);
    placeOnSphere(swTower, -44.5, sampleOrganHeight(-44.5, 38.5) - 0.1, 38.5, 0);
    group.add(swTower);
  }

  // 8. INSTANCED BROADLEAF & PINE WOODLAND TREES
  const leafMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84, metalness: 0.02 })
  );
  const broadleafTrees = ORGAN_TREES.filter((t) => t.kind === 'broadleaf');
  const pineTrees = ORGAN_TREES.filter((t) => t.kind === 'pine');

  if (broadleafTrees.length > 0) {
    const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.25, 1.35, 7));
    trunkGeo.translate(0, 0.67, 0);
    const crownMainGeo = trackGeo(new THREE.IcosahedronGeometry(1.12, 1));
    crownMainGeo.translate(0, 2.08, 0);
    const crownSideGeo = trackGeo(new THREE.IcosahedronGeometry(0.84, 1));
    crownSideGeo.translate(0.55, 1.78, 0.36);

    const tInst = new THREE.InstancedMesh(trunkGeo, timberMat, broadleafTrees.length);
    const c1Inst = new THREE.InstancedMesh(crownMainGeo, leafMat, broadleafTrees.length);
    const c2Inst = new THREE.InstancedMesh(crownSideGeo, leafMat, broadleafTrees.length);

    broadleafTrees.forEach((t, idx) => {
      const sp = toOrganSphereLocal(t.x, t.y, t.z, globeRadius);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
      _tiltQuat.setFromUnitVectors(_up, _localNormal);
      _yawQuat.setFromAxisAngle(_yAxis, (t.x * 0.5 + t.z * 0.7) % (Math.PI * 2));
      _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
      _dummy.scale.setScalar(S * t.scale);
      _dummy.updateMatrix();
      tInst.setMatrixAt(idx, _dummy.matrix);
      c1Inst.setMatrixAt(idx, _dummy.matrix);
      c2Inst.setMatrixAt(idx, _dummy.matrix);
      _tmpColor.setRGB(0.16 * t.tint, 0.54 * t.tint, 0.19 * t.tint);
      c1Inst.setColorAt(idx, _tmpColor);
      _tmpColor.setRGB(0.12 * t.tint, 0.44 * t.tint, 0.15 * t.tint);
      c2Inst.setColorAt(idx, _tmpColor);
    });
    tInst.instanceMatrix.needsUpdate = true;
    c1Inst.instanceMatrix.needsUpdate = true;
    c2Inst.instanceMatrix.needsUpdate = true;
    if (c1Inst.instanceColor) c1Inst.instanceColor.needsUpdate = true;
    if (c2Inst.instanceColor) c2Inst.instanceColor.needsUpdate = true;
    tInst.computeBoundingSphere();
    c1Inst.computeBoundingSphere();
    c2Inst.computeBoundingSphere();
    group.add(tInst, c1Inst, c2Inst);
  }

  if (pineTrees.length > 0) {
    const pTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.18, 1.05, 6));
    pTrunkGeo.translate(0, 0.52, 0);
    const tier1Geo = trackGeo(new THREE.ConeGeometry(0.95, 1.5, 7));
    tier1Geo.translate(0, 1.5, 0);
    const tier2Geo = trackGeo(new THREE.ConeGeometry(0.68, 1.25, 7));
    tier2Geo.translate(0, 2.3, 0);

    const ptInst = new THREE.InstancedMesh(pTrunkGeo, timberMat, pineTrees.length);
    const c1Inst = new THREE.InstancedMesh(tier1Geo, leafMat, pineTrees.length);
    const c2Inst = new THREE.InstancedMesh(tier2Geo, leafMat, pineTrees.length);

    pineTrees.forEach((t, idx) => {
      const sp = toOrganSphereLocal(t.x, t.y, t.z, globeRadius);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
      _tiltQuat.setFromUnitVectors(_up, _localNormal);
      _yawQuat.setFromAxisAngle(_yAxis, idx * 0.8);
      _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
      _dummy.scale.setScalar(S * t.scale);
      _dummy.updateMatrix();
      ptInst.setMatrixAt(idx, _dummy.matrix);
      c1Inst.setMatrixAt(idx, _dummy.matrix);
      c2Inst.setMatrixAt(idx, _dummy.matrix);
      _tmpColor.setRGB(0.11 * t.tint, 0.43 * t.tint, 0.18 * t.tint);
      c1Inst.setColorAt(idx, _tmpColor);
      _tmpColor.setRGB(0.14 * t.tint, 0.50 * t.tint, 0.21 * t.tint);
      c2Inst.setColorAt(idx, _tmpColor);
    });
    ptInst.instanceMatrix.needsUpdate = true;
    c1Inst.instanceMatrix.needsUpdate = true;
    c2Inst.instanceMatrix.needsUpdate = true;
    if (c1Inst.instanceColor) c1Inst.instanceColor.needsUpdate = true;
    if (c2Inst.instanceColor) c2Inst.instanceColor.needsUpdate = true;
    ptInst.computeBoundingSphere();
    c1Inst.computeBoundingSphere();
    c2Inst.computeBoundingSphere();
    group.add(ptInst, c1Inst, c2Inst);
  }

  const shipBasePos = bigTopShipGroup ? bigTopShipGroup.position.clone() : null;

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      for (let i = 0; i < pubFlags.length; i++) {
        pubFlags[i].rotation.y = Math.sin(elapsed * 2.9 + i * 0.9) * 0.18;
      }
      if (bigTopShipGroup && shipBasePos) {
        const bob = Math.sin(elapsed * 1.4) * 0.0002;
        bigTopShipGroup.position
          .copy(shipBasePos)
          .addScaledVector(_up, bob);
      }
      if (chouchouHead) {
        chouchouHead.rotation.y = Math.sin(elapsed * 1.15) * 0.16;
      }
      if (whaleJetLeft && whaleJetRight) {
        const pulse = 0.96 + Math.sin(elapsed * 4.5) * 0.04;
        whaleJetLeft.scale.y = pulse;
        whaleJetRight.scale.y = pulse;
      }
    },
  };
}
