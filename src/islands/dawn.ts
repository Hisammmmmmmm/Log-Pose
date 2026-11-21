import * as THREE from 'three';
import {
  DAWN_BUILDINGS,
  DAWN_DADAN_Y,
  DAWN_FENCES,
  DAWN_FOOSHA_Y,
  DAWN_GLOBE_SCALE,
  DAWN_GOA_CENTER_Y,
  DAWN_GOA_EDGE_Y,
  DAWN_GOA_HIGH_Y,
  DAWN_GOA_QUAY_Y,
  DAWN_GOA_WALLS,
  DAWN_LANDMARKS,
  DAWN_PIER_Y,
  DAWN_ROCKS,
  DAWN_TREES,
  DAWN_WORLD_SIZE,
  dawnRoadSignedDist,
  isInGoaCenterTown,
  isInGoaEdgeTown,
  isInGoaHighTown,
  isInGoaKingdom,
  isInGrayTerminal,
  sampleDawnHeight,
  sampleFooshaBayBeachMask,
  toDawnSphereLocal,
} from '../utils/dawnTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = DAWN_GLOBE_SCALE;
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

function createDawnTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = DAWN_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * DAWN_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * DAWN_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const h = sampleDawnHeight(x, z);
      const hx = sampleDawnHeight(x + 0.85, z);
      const hz = sampleDawnHeight(x, z + 0.85);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 1.35, 0, 1);
      const fineNoise = (valueNoise2D(x * 1.35, z * 1.35) - 0.5) * 12;

      let rgb: [number, number, number] = [212, 186, 128];
      let alpha = 0;

      if (h < -4.35) {
        // Cut out ONLY deep underwater far below the globe ocean surface so shorelines never tear
        alpha = smoothstep(-4.85, -4.35, h);
        rgb = [76, 118, 128];
      } else {
        alpha = 1;
        // Bright sunny East Blue Foosha meadow fading to deeper Mt. Colubo alpine forest greens
        const fooshaZone =
          1 - smoothstep(0.65, 1.15, Math.hypot((x - 60) / 26, (z + 10) / 22));
        const elevShade = smoothstep(5.5, 22.0, h);
        const meadowBase = mixRgb(
          mixRgb([74, 146, 54], [126, 200, 78], fooshaZone),
          [60, 114, 48],
          elevShade * 0.65
        );

        // Multi-stage underwater sandy shoal -> wet tidal sand -> warm golden beach -> organic coastal grass
        const shoalToWet = smoothstep(-3.6, -0.35, h);
        const wetToDry = smoothstep(-0.35, 0.45, h);
        const submergedSand = mixRgb([88, 134, 136], [192, 174, 126], shoalToWet);
        const beachNoise = (valueNoise2D(x * 0.24 + 3.1, z * 0.24 + 8.4) - 0.5) * 0.35;
        const sandColor = mixRgb(submergedSand, [238, 214, 152], wetToDry);
        const sandToGrass = smoothstep(1.15 + beachNoise, 2.35 + beachNoise, h);
        rgb = mixRgb(sandColor, meadowBase, sandToGrass);

        // Foosha Bay golden crescent beach accent
        const bayBeach = sampleFooshaBayBeachMask(x, z);
        if (bayBeach > 0.05 && h < 2.65 && h > -0.5) {
          rgb = mixRgb(rgb, [238, 212, 146], bayBeach * 0.85);
        }

        // Gray Terminal charred earth, ash & scrapyard grit
        const inGray = isInGrayTerminal(x, z);
        if (inGray && h > 1.2) {
          const ash = (valueNoise2D(x * 0.72, z * 0.72) - 0.5) * 26;
          rgb = mixRgb(rgb, [102 + ash, 92 + ash * 0.9, 82 + ash * 0.8], 0.88);
        }

        const inGoa = isInGoaKingdom(x, z);

        // Sculpted Mt. Colubo & Cordilleras striated mountain cliff crags + sunlit summit rock
        if (!inGoa && (slope > 0.20 || h > 16.5) && h > 1.4) {
          const slopeT = smoothstep(0.20, 0.48, slope);
          const cragBand = smoothstep(16.5, 24.5, h) * 0.72;
          const cliffT = clamp(Math.max(slopeT, cragBand), 0, 1);
          const strata =
            Math.sin(h * 2.6 + x * 0.14 + z * 0.08) * 14 +
            (valueNoise2D(x * 0.65, z * 0.65) - 0.5) * 18;
          const baseRock: [number, number, number] =
            h > 19.0
              ? [164 + strata, 146 + strata * 0.9, 122 + strata * 0.8]
              : [144 + strata, 122 + strata * 0.85, 96 + strata * 0.72];
          rgb = mixRgb(rgb, baseRock, cliffT);
        }

        // Goa Kingdom stratified stone paving (Edge -> Center -> High Town marble)
        if (inGoa && h > 1.5) {
          const tile =
            ((Math.floor(x * 0.85) + Math.floor(z * 0.85)) & 1) === 0 ? 6 : -6;
          if (isInGoaHighTown(x, z)) {
            rgb = [236 + tile * 0.7, 232 + tile * 0.7, 222 + tile * 0.7];
          } else if (isInGoaCenterTown(x, z)) {
            rgb = [210 + tile, 208 + tile, 206 + tile];
          } else if (isInGoaEdgeTown(x, z)) {
            rgb = [176 + tile, 168 + tile, 152 + tile];
          } else {
            rgb = [165 + tile, 162 + tile, 156 + tile];
          }
        }

        // Compacted ochre dirt paths & trails across Foosha, Mt. Colubo & Gray Terminal
        const roadD = dawnRoadSignedDist(x, z);
        if (roadD < 0.48 && h > 0.15) {
          const roadT = 1 - smoothstep(-0.16, 0.46, roadD);
          const grain = (valueNoise2D(x * 2.2, z * 2.2) - 0.5) * 16;
          if (inGoa) {
            const avenueStone: [number, number, number] = isInGoaHighTown(x, z)
              ? [245 + grain * 0.3, 240 + grain * 0.3, 226 + grain * 0.3]
              : [224 + grain * 0.4, 220 + grain * 0.4, 212 + grain * 0.4];
            rgb = mixRgb(rgb, avenueStone, roadT * 0.75);
          } else {
            const roadTone: [number, number, number] = inGray
              ? [144 + grain, 124 + grain, 98 + grain]
              : [220 + grain, 184 + grain, 122 + grain];
            rgb = mixRgb(rgb, roadTone, roadT * 0.92);
          }
        }
      }

      data[idx] = clamp(Math.round(rgb[0] + (h > -0.45 ? fineNoise : 0)), 0, 255);
      data[idx + 1] = clamp(
        Math.round(rgb[1] + (h > -0.45 ? fineNoise : 0)),
        0,
        255
      );
      data[idx + 2] = clamp(
        Math.round(rgb[2] + (h > -0.45 ? fineNoise : 0)),
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

function createCottageFacadeTexture(baseColorHex: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const c = new THREE.Color(baseColorHex);
  ctx.fillStyle = `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#6c492f';
  ctx.fillRect(0, 0, 12, 256);
  ctx.fillRect(244, 0, 12, 256);
  ctx.fillRect(0, 232, 256, 24);
  ctx.fillRect(0, 118, 256, 10);

  const slots = [34, 104, 174];
  for (let i = 0; i < slots.length; i++) {
    const x = slots[i];
    if (i === 1) {
      ctx.fillStyle = '#5c3b24';
      ctx.fillRect(x, 148, 48, 84);
      ctx.strokeStyle = '#efe5d4';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, 148, 48, 84);
    } else {
      ctx.fillStyle = '#2d4154';
      ctx.fillRect(x, 146, 44, 46);
      ctx.strokeStyle = '#efe5d4';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, 146, 44, 46);
    }
    ctx.fillStyle = '#2d4154';
    ctx.fillRect(x + 4, 44, 38, 42);
    ctx.strokeStyle = '#efe5d4';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, 44, 38, 42);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPartysBarFacadeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Warm East Blue cream tavern stucco & oak beams
  ctx.fillStyle = '#f5e7cb';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#6a4126';
  ctx.fillRect(0, 0, 18, 256);
  ctx.fillRect(494, 0, 18, 256);
  ctx.fillRect(0, 230, 512, 26);
  ctx.fillRect(0, 116, 512, 12);
  ctx.fillRect(160, 0, 10, 256);
  ctx.fillRect(342, 0, 10, 256);

  // Central double tavern saloon doors with warm amber glow panes
  ctx.fillStyle = '#522f18';
  ctx.fillRect(216, 134, 80, 96);
  ctx.strokeStyle = '#e7d6ba';
  ctx.lineWidth = 4;
  ctx.strokeRect(216, 134, 80, 96);
  ctx.fillStyle = '#ffcb6b';
  ctx.fillRect(226, 146, 26, 36);
  ctx.fillRect(260, 146, 26, 36);

  // Warm glowing side tavern windows (ground & upper floor)
  for (const wx of [54, 386]) {
    ctx.fillStyle = '#ffb84d';
    ctx.fillRect(wx, 146, 72, 50);
    ctx.strokeStyle = '#522f18';
    ctx.lineWidth = 4;
    ctx.strokeRect(wx, 146, 72, 50);
    ctx.fillRect(wx + 34, 146, 4, 50);
    ctx.fillRect(wx, 169, 72, 4);
  }
  for (const wx of [62, 224, 392]) {
    ctx.fillStyle = '#384c61';
    ctx.fillRect(wx, 36, 60, 54);
    ctx.strokeStyle = '#efe5d4';
    ctx.lineWidth = 3;
    ctx.strokeRect(wx, 36, 60, 54);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPartysBarSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#4e2c17';
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 492, 140);
  ctx.fillStyle = '#f8e9c8';
  ctx.fillRect(20, 20, 472, 120);

  ctx.fillStyle = '#3d1e0d';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PARTYS BAR', 256, 74);

  ctx.fillStyle = '#9b3c1b';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('MAKINO · FOOSHA TAVERN', 256, 118);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRedForceSailTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#f5eedc';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#b92622';
  ctx.fillRect(0, 0, 256, 28);
  ctx.fillRect(0, 228, 256, 28);

  // Red-Haired Pirates crossed sabers & skull emblem
  ctx.strokeStyle = '#222429';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(64, 64);
  ctx.lineTo(192, 192);
  ctx.moveTo(192, 64);
  ctx.lineTo(64, 192);
  ctx.stroke();

  ctx.fillStyle = '#222429';
  ctx.beginPath();
  ctx.arc(128, 124, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5eedc';
  ctx.beginPath();
  ctx.arc(114, 122, 8, 0, Math.PI * 2);
  ctx.arc(142, 122, 8, 0, Math.PI * 2);
  ctx.fill();

  // Three iconic red scar stripes across left eye
  ctx.strokeStyle = '#c82b24';
  ctx.lineWidth = 4;
  for (const dx of [-5, 0, 5]) {
    ctx.beginPath();
    ctx.moveTo(106 + dx, 102);
    ctx.lineTo(122 + dx, 144);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPalaceFacadeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#fbf6ea';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#e0d3b6';
  ctx.fillRect(0, 228, 512, 28);
  ctx.fillRect(0, 122, 512, 10);
  ctx.fillStyle = '#d4a644';
  ctx.fillRect(0, 0, 512, 10);

  const cols = [42, 122, 220, 344, 426];
  for (let i = 0; i < cols.length; i++) {
    const x = cols[i];
    const w = i === 2 ? 72 : 44;
    ctx.fillStyle = '#2c4d75';
    ctx.fillRect(x, 34, w, 66);
    ctx.strokeStyle = '#d9b25a';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, 34, w, 66);

    ctx.fillStyle = i === 2 ? '#1f2d42' : '#2c4d75';
    ctx.fillRect(x, 144, w, i === 2 ? 84 : 64);
    ctx.strokeStyle = '#d9b25a';
    ctx.strokeRect(x, 144, w, i === 2 ? 84 : 64);
  }

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

function createStoneMasonryTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#eee7d8';
  ctx.fillRect(0, 0, 256, 256);

  const rowH = 32;
  const colW = 64;
  for (let row = 0; row < 256 / rowH; row++) {
    const y = row * rowH;
    const offset = row % 2 === 0 ? 0 : colW / 2;
    for (let x = -offset; x < 256; x += colW) {
      const shade = ((row * 7 + Math.round(x)) % 3) * 6 - 6;
      const v = 236 + shade;
      ctx.fillStyle = `rgb(${v}, ${v - 7}, ${v - 20})`;
      ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);
    }
    ctx.fillStyle = 'rgba(110, 102, 88, 0.28)';
    ctx.fillRect(0, y, 256, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

function createPitchedRoofGeo(
  width: number,
  depth: number,
  height: number,
  style: 'hip' | 'gable' | 'mansard' | 'flat'
): THREE.BufferGeometry {
  const hw = width * 0.5 + 0.28;
  const hd = depth * 0.5 + 0.28;
  if (style === 'flat') {
    const g = new THREE.BoxGeometry(width + 0.35, Math.max(0.18, height * 0.25), depth + 0.35);
    g.translate(0, Math.max(0.09, height * 0.125), 0);
    return g;
  }
  if (style === 'mansard') {
    const tw = hw * 0.65;
    const td = hd * 0.78;
    const verts = new Float32Array([
      -hw, 0, hd, hw, 0, hd, tw, height, td,
      -hw, 0, hd, tw, height, td, -tw, height, td,
      hw, 0, -hd, -hw, 0, -hd, -tw, height, -td,
      hw, 0, -hd, -tw, height, -td, tw, height, -td,
      -hw, 0, -hd, -hw, 0, hd, -tw, height, td,
      -hw, 0, -hd, -tw, height, td, -tw, height, -td,
      hw, 0, hd, hw, 0, -hd, tw, height, -td,
      hw, 0, hd, tw, height, -td, tw, height, td,
      -tw, height, td, tw, height, td, tw, height, -td,
      -tw, height, td, tw, height, -td, -tw, height, -td,
    ]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    g.computeVertexNormals();
    return g;
  }

  const ridgeHalfW = style === 'gable' ? hw : hw * 0.42;
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

function createPalmFrondCanopyGeo(): THREE.BufferGeometry {
  const pos: number[] = [];
  const frondCount = 6;
  const baseY = 2.35;
  for (let i = 0; i < frondCount; i++) {
    const yaw = (i / frondCount) * Math.PI * 2 + (i % 2) * 0.15;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const toW = (lx: number, ly: number, lz: number): [number, number, number] => [
      lx * cosY - lz * sinY,
      baseY + ly,
      lx * sinY + lz * cosY,
    ];
    const p0 = toW(0, 0, 0);
    const pML = toW(0.68, 0.28, -0.26);
    const pMR = toW(0.68, 0.28, 0.26);
    const pTip = toW(1.48, -0.34, 0);
    pos.push(...p0, ...pML, ...pMR, ...p0, ...pMR, ...pML);
    pos.push(...pML, ...pTip, ...pMR, ...pML, ...pMR, ...pTip);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance | null {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const regTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;
  const group = new THREE.Group();
  group.name = 'island-dawn';

  const placeOnSphere = (
    obj: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    yaw = 0
  ) => {
    const sp = toDawnSphereLocal(x, y, z, globeRadius);
    obj.position.set(sp.x, sp.y, sp.z);
    _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, yaw);
    obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    obj.scale.multiplyScalar(S);
  };

  // 1. Sculpted 224x224 Dawn Island Terrain Mesh + 1024x1024 Relief Texture
  const segs = 224;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(DAWN_WORLD_SIZE, DAWN_WORLD_SIZE, segs, segs)
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const posArr = posAttr.array as Float32Array;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posArr[i * 3];
    const z = posArr[i * 3 + 2];
    const h = sampleDawnHeight(x, z);
    const sp = toDawnSphereLocal(x, h, z, globeRadius);
    posArr[i * 3] = sp.x;
    posArr[i * 3 + 1] = sp.y;
    posArr[i * 3 + 2] = sp.z;
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainTex = regTex(createDawnTerrainTexture(1024));
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.86,
      metalness: 0.04,
      transparent: false,
      alphaTest: 0.5,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Shared geometries & materials
  const unitBox = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const unitCyl = trackGeo(new THREE.CylinderGeometry(1, 1, 1, 12));
  const roofShingleTex = regTex(createRoofShingleTexture());

  const timberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x764726, roughness: 0.82, metalness: 0.04 })
  );
  const darkTimberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4b2b16, roughness: 0.84, metalness: 0.04 })
  );
  const stoneMasonryTex = regTex(createStoneMasonryTexture());
  const stoneGrayMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x9aa2ad,
      map: stoneMasonryTex,
      roughness: 0.86,
      metalness: 0.05,
    })
  );
  const limestoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4eee0,
      map: stoneMasonryTex,
      roughness: 0.76,
      metalness: 0.04,
    })
  );
  const creamPlasterMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf7efe0, roughness: 0.72, metalness: 0.03 })
  );
  const goaBlueRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2c568a,
      map: roofShingleTex,
      roughness: 0.62,
      metalness: 0.06,
    })
  );
  const terracottaRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc25433,
      map: roofShingleTex,
      roughness: 0.72,
      metalness: 0.04,
    })
  );
  const crimsonMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb92b24, roughness: 0.66, metalness: 0.06 })
  );
  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe6b43c, roughness: 0.35, metalness: 0.25 })
  );
  const ironMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x242830, roughness: 0.45, metalness: 0.25 })
  );
  const rustScrapMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6f4a37, roughness: 0.9, metalness: 0.12 })
  );
  const seaRockMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7b786e, roughness: 0.9, metalness: 0.03 })
  );
  const sailCanvasMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf2ead6, roughness: 0.75, metalness: 0.02 })
  );
  const lanternGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffe49c,
      emissive: 0xffa73b,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    })
  );
  const waterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x35c2e6,
      emissive: 0x0a6684,
      emissiveIntensity: 0.3,
      roughness: 0.18,
      metalness: 0.1,
    })
  );

  const roofGeoCache = new Map<string, THREE.BufferGeometry>();
  const getRoofGeo = (
    w: number,
    d: number,
    h: number,
    style: 'hip' | 'gable' | 'mansard' | 'flat'
  ) => {
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

  // 2. PARTYS BAR (MAKINO'S TAVERN) AT FOOSHA CROSSROADS
  {
    const bar = new THREE.Group();
    const barTex = regTex(createPartysBarFacadeTexture());
    const barWallMat = trackMat(
      new THREE.MeshStandardMaterial({ map: barTex, roughness: 0.74, metalness: 0.03 })
    );
    const signTex = regTex(createPartysBarSignTexture());
    const signMat = trackMat(
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6, metalness: 0.05 })
    );

    // Stone foundation plinth
    const plinth = new THREE.Mesh(unitBox, stoneGrayMat);
    plinth.scale.set(7.8, 0.34, 5.4);
    plinth.position.y = 0.17;
    bar.add(plinth);

    // Main 2-story tavern volume
    const body = new THREE.Mesh(unitBox, barWallMat);
    body.scale.set(7.4, 3.7, 4.9);
    body.position.y = 0.34 + 1.85;
    bar.add(body);

    // Terracotta gable roof + stone chimney
    const roof = new THREE.Mesh(
      getRoofGeo(7.6, 5.1, 1.85, 'gable'),
      terracottaRoofMat
    );
    roof.position.y = 4.04;
    const chimney = new THREE.Mesh(unitBox, stoneGrayMat);
    chimney.scale.set(0.62, 1.5, 0.62);
    chimney.position.set(2.4, 4.85, -0.7);
    bar.add(roof, chimney);

    // Covered front timber veranda (+Z facing Foosha Main Road)
    const porchDeck = new THREE.Mesh(unitBox, timberMat);
    porchDeck.scale.set(7.6, 0.28, 2.2);
    porchDeck.position.set(0, 0.14, 3.4);
    const porchRoof = new THREE.Mesh(unitBox, terracottaRoofMat);
    porchRoof.scale.set(7.8, 0.18, 2.5);
    porchRoof.position.set(0, 2.45, 3.5);
    porchRoof.rotation.x = 0.18;
    bar.add(porchDeck, porchRoof);

    for (const px of [-3.4, -1.35, 1.35, 3.4]) {
      const post = new THREE.Mesh(unitBox, darkTimberMat);
      post.scale.set(0.22, 1.94, 0.22);
      post.position.set(px, 1.2, 4.35);
      bar.add(post);
    }

    // Hanging "PARTYS BAR" Signboard above veranda awning
    const signBack = new THREE.Mesh(unitBox, darkTimberMat);
    signBack.scale.set(3.4, 1.05, 0.16);
    signBack.position.set(0, 3.36, 3.8);
    const signFace = new THREE.Mesh(unitBox, signMat);
    signFace.scale.set(3.25, 0.92, 0.06);
    signFace.position.set(0, 3.36, 3.89);
    bar.add(signBack, signFace);

    // Warm glowing veranda lanterns
    for (const lx of [-2.4, 2.4]) {
      const lantern = new THREE.Mesh(unitBox, lanternGlowMat);
      lantern.scale.set(0.26, 0.34, 0.26);
      lantern.position.set(lx, 2.04, 4.25);
      bar.add(lantern);
    }

    // Outdoor tavern barrels, crates, tables & stools where Luffy drank with Shanks
    for (const [bx, bz] of [
      [-2.9, 4.05],
      [-2.35, 4.15],
      [2.8, 4.0],
      [3.35, 3.95],
    ]) {
      const barrel = new THREE.Mesh(unitCyl, timberMat);
      barrel.scale.set(0.3, 0.72, 0.3);
      barrel.position.set(bx, 0.64, bz);
      const band = new THREE.Mesh(unitCyl, ironMat);
      band.scale.set(0.32, 0.08, 0.32);
      band.position.set(bx, 0.78, bz);
      bar.add(barrel, band);
    }
    for (const tx of [-1.45, 1.55]) {
      const tableTop = new THREE.Mesh(unitCyl, timberMat);
      tableTop.scale.set(0.68, 0.1, 0.68);
      tableTop.position.set(tx, 0.85, 5.1);
      const tableLeg = new THREE.Mesh(unitCyl, darkTimberMat);
      tableLeg.scale.set(0.14, 0.72, 0.14);
      tableLeg.position.set(tx, 0.45, 5.1);
      bar.add(tableTop, tableLeg);
      for (const sx of [-0.62, 0.62]) {
        const stool = new THREE.Mesh(unitCyl, darkTimberMat);
        stool.scale.set(0.22, 0.48, 0.22);
        stool.position.set(tx + sx, 0.24, 5.1);
        bar.add(stool);
      }
    }

    placeOnSphere(
      bar,
      DAWN_LANDMARKS.partysBar.x,
      DAWN_FOOSHA_Y - 0.06,
      DAWN_LANDMARKS.partysBar.z,
      DAWN_LANDMARKS.partysBar.yaw
    );
    group.add(bar);
  }

  // 3. FOOSHA VILLAGE ICONIC WINDMILL ON COASTAL BLUFF
  let windmillSails: THREE.Group | null = null;
  {
    const wm = new THREE.Group();
    const base = new THREE.Mesh(unitCyl, stoneGrayMat);
    base.scale.set(2.45, 1.4, 2.45);
    base.position.y = 0.7;
    const tower = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.45, 2.2, 6.2, 12)),
      creamPlasterMat
    );
    tower.position.y = 4.4;
    const collar = new THREE.Mesh(unitCyl, timberMat);
    collar.scale.set(1.6, 0.25, 1.6);
    collar.position.y = 7.4;
    const cap = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.75, 2.1, 12)),
      terracottaRoofMat
    );
    cap.position.y = 8.55;
    const wmDoor = new THREE.Mesh(unitBox, darkTimberMat);
    wmDoor.scale.set(0.95, 1.65, 0.25);
    wmDoor.position.set(0, 0.9, 2.22);
    wm.add(base, tower, collar, cap, wmDoor);

    // 4 Rotating Timber & Canvas Windmill Sails facing South-East toward Foosha Village & Bay
    windmillSails = new THREE.Group();
    windmillSails.position.set(0, 6.65, 1.72);
    const hub = new THREE.Mesh(unitCyl, darkTimberMat);
    hub.rotation.x = Math.PI * 0.5;
    hub.scale.set(0.32, 0.7, 0.32);
    windmillSails.add(hub);

    for (let i = 0; i < 4; i++) {
      const armGroup = new THREE.Group();
      armGroup.rotation.z = (i * Math.PI) / 2;
      const spar = new THREE.Mesh(unitBox, darkTimberMat);
      spar.scale.set(0.18, 4.4, 0.14);
      spar.position.y = 2.2;
      const sail = new THREE.Mesh(unitBox, sailCanvasMat);
      sail.scale.set(1.05, 3.4, 0.06);
      sail.position.set(0.55, 2.45, 0.05);
      armGroup.add(spar, sail);
      windmillSails.add(armGroup);
    }
    wm.add(windmillSails);

    placeOnSphere(
      wm,
      DAWN_LANDMARKS.fooshaWindmill.x,
      sampleDawnHeight(DAWN_LANDMARKS.fooshaWindmill.x, DAWN_LANDMARKS.fooshaWindmill.z) - 0.08,
      DAWN_LANDMARKS.fooshaWindmill.z,
      DAWN_LANDMARKS.fooshaWindmill.yaw
    );
    group.add(wm);
  }

  // 4. FOOSHA HARBOR PIER, LUFFY'S DINGHY & SHANKS' RED FORCE IN FOOSHA BAY
  let dinghyGroup: THREE.Group | null = null;
  let redForceGroup: THREE.Group | null = null;
  {
    // Wooden Harbor Pier extending from Foosha Beach (x=74..87, z=-12)
    const pier = new THREE.Group();
    const deck = new THREE.Mesh(unitBox, timberMat);
    deck.scale.set(13.4, 0.28, 3.2);
    deck.position.y = 0;
    pier.add(deck);
    for (const px of [-5.8, -2.9, 0, 2.9, 5.8]) {
      for (const pz of [-1.25, 1.25]) {
        const piling = new THREE.Mesh(unitCyl, darkTimberMat);
        piling.scale.set(0.18, 2.8, 0.18);
        piling.position.set(px, -1.1, pz);
        pier.add(piling);
      }
      const bollard = new THREE.Mesh(unitCyl, darkTimberMat);
      bollard.scale.set(0.14, 0.45, 0.14);
      bollard.position.set(px, 0.34, 1.3);
      pier.add(bollard);
    }
    const pierBarrel = new THREE.Mesh(unitCyl, timberMat);
    pierBarrel.scale.set(0.32, 0.72, 0.32);
    pierBarrel.position.set(4.5, 0.48, -0.8);
    pier.add(pierBarrel);
    placeOnSphere(pier, DAWN_LANDMARKS.fooshaPier.x, DAWN_PIER_Y, DAWN_LANDMARKS.fooshaPier.z, 0);
    group.add(pier);

    // Luffy's Small Wooden Dinghy moored beside the pier
    dinghyGroup = new THREE.Group();
    const dHull = new THREE.Mesh(unitBox, timberMat);
    dHull.scale.set(1.2, 0.42, 2.4);
    dHull.position.y = 0.18;
    const dBench = new THREE.Mesh(unitBox, darkTimberMat);
    dBench.scale.set(1.0, 0.08, 0.38);
    dBench.position.y = 0.38;
    const dBarrel = new THREE.Mesh(unitCyl, timberMat);
    dBarrel.scale.set(0.26, 0.56, 0.26);
    dBarrel.position.set(0, 0.56, -0.55);
    dinghyGroup.add(dHull, dBench, dBarrel);
    placeOnSphere(
      dinghyGroup,
      DAWN_LANDMARKS.luffyDinghy.x,
      DAWN_LANDMARKS.luffyDinghy.y,
      DAWN_LANDMARKS.luffyDinghy.z,
      DAWN_LANDMARKS.luffyDinghy.yaw
    );
    group.add(dinghyGroup);

    // Shanks' Red Force Flagship anchored in Foosha Bay
    redForceGroup = new THREE.Group();
    const redSailTex = regTex(createRedForceSailTexture());
    const redSailMat = trackMat(
      new THREE.MeshStandardMaterial({ map: redSailTex, roughness: 0.72, metalness: 0.03 })
    );

    const hull = new THREE.Mesh(unitBox, crimsonMat);
    hull.scale.set(3.6, 1.7, 10.6);
    hull.position.y = 0.68;
    const rfDeck = new THREE.Mesh(unitBox, timberMat);
    rfDeck.scale.set(3.2, 0.22, 9.8);
    rfDeck.position.y = 1.56;
    const sternCabin = new THREE.Mesh(unitBox, darkTimberMat);
    sternCabin.scale.set(3.3, 1.35, 2.8);
    sternCabin.position.set(0, 2.15, -3.5);
    const cabinRoof = new THREE.Mesh(unitBox, crimsonMat);
    cabinRoof.scale.set(3.5, 0.22, 3.0);
    cabinRoof.position.set(0, 2.86, -3.5);
    redForceGroup.add(hull, rfDeck, sternCabin, cabinRoof);

    // Iconic Crimson Dragon Prow Figurehead (+Z bow)
    const dragonNeck = new THREE.Mesh(unitBox, crimsonMat);
    dragonNeck.scale.set(0.85, 1.65, 1.4);
    dragonNeck.position.set(0, 1.85, 5.45);
    dragonNeck.rotation.x = 0.35;
    const dragonHead = new THREE.Mesh(
      trackGeo(new THREE.DodecahedronGeometry(0.82, 0)),
      crimsonMat
    );
    dragonHead.scale.set(0.95, 0.85, 1.35);
    dragonHead.position.set(0, 2.65, 6.2);
    const dragonCrest = new THREE.Mesh(unitBox, goldMat);
    dragonCrest.scale.set(0.24, 0.85, 0.9);
    dragonCrest.position.set(0, 3.15, 5.85);
    redForceGroup.add(dragonNeck, dragonHead, dragonCrest);

    // Twin Masts with Red-Haired Pirates Emblems
    for (const [mz, mh, sw] of [
      [-1.4, 7.6, 4.4],
      [2.4, 6.2, 3.5],
    ]) {
      const mast = new THREE.Mesh(unitCyl, darkTimberMat);
      mast.scale.set(0.15, mh, 0.15);
      mast.position.set(0, 1.55 + mh * 0.5, mz);
      const yard = new THREE.Mesh(unitBox, darkTimberMat);
      yard.scale.set(sw + 0.6, 0.14, 0.14);
      yard.position.set(0, 1.85 + mh * 0.72, mz + 0.16);
      const sail = new THREE.Mesh(unitBox, redSailMat);
      sail.scale.set(sw, mh * 0.48, 0.14);
      sail.position.set(0, 1.85 + mh * 0.46, mz + 0.18);
      redForceGroup.add(mast, yard, sail);
    }

    placeOnSphere(
      redForceGroup,
      DAWN_LANDMARKS.redForce.x,
      DAWN_LANDMARKS.redForce.y,
      DAWN_LANDMARKS.redForce.z,
      DAWN_LANDMARKS.redForce.yaw
    );
    group.add(redForceGroup);
  }

  // 5. MONT CORVO: CURLY DADAN'S BANDIT HUT, CAMPFIRE & ASL GIANT TREEHOUSE
  let dadanCampfireCore: THREE.Mesh | null = null;
  {
    const hut = new THREE.Group();
    const hutFacadeTex = regTex(createCottageFacadeTexture(0x9a653c));
    const hutWallMat = trackMat(
      new THREE.MeshStandardMaterial({ map: hutFacadeTex, roughness: 0.82, metalness: 0.03 })
    );
    const hutBody = new THREE.Mesh(unitBox, hutWallMat);
    hutBody.scale.set(5.6, 2.6, 4.2);
    hutBody.position.y = 1.3;
    const hutRoof = new THREE.Mesh(
      getRoofGeo(5.8, 4.4, 1.75, 'gable'),
      getRoofMat(0x5c4632)
    );
    hutRoof.position.y = 2.6;
    const hutPorch = new THREE.Mesh(unitBox, darkTimberMat);
    hutPorch.scale.set(5.4, 0.25, 1.75);
    hutPorch.position.set(0, 0.12, 2.85);
    const hutAwning = new THREE.Mesh(unitBox, getRoofMat(0x5c4632));
    hutAwning.scale.set(5.4, 0.14, 1.85);
    hutAwning.position.set(0, 2.25, 2.85);
    hutAwning.rotation.x = 0.14;
    for (const px of [-2.4, 0, 2.4]) {
      const pPost = new THREE.Mesh(unitBox, darkTimberMat);
      pPost.scale.set(0.18, 1.9, 0.18);
      pPost.position.set(px, 1.15, 3.55);
      hut.add(pPost);
    }
    const hutCrate = new THREE.Mesh(unitBox, timberMat);
    hutCrate.scale.set(0.75, 0.65, 0.75);
    hutCrate.position.set(-1.7, 0.56, 2.95);
    const hutBarrel = new THREE.Mesh(unitCyl, timberMat);
    hutBarrel.scale.set(0.28, 0.72, 0.28);
    hutBarrel.position.set(1.85, 0.58, 2.95);
    const hutChimney = new THREE.Mesh(unitBox, stoneGrayMat);
    hutChimney.scale.set(0.6, 1.6, 0.6);
    hutChimney.position.set(-1.9, 3.4, -0.5);
    hut.add(hutBody, hutRoof, hutPorch, hutAwning, hutCrate, hutBarrel, hutChimney);
    placeOnSphere(
      hut,
      DAWN_LANDMARKS.dadanHut.x,
      DAWN_DADAN_Y - 0.08,
      DAWN_LANDMARKS.dadanHut.z,
      DAWN_LANDMARKS.dadanHut.yaw
    );
    group.add(hut);

    // Bandit clearing campfire + logs
    const camp = new THREE.Group();
    const emberMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff8224,
        emissive: 0xff4800,
        emissiveIntensity: 1.0,
        roughness: 0.35,
      })
    );
    dadanCampfireCore = new THREE.Mesh(
      trackGeo(new THREE.DodecahedronGeometry(0.42, 0)),
      emberMat
    );
    dadanCampfireCore.position.y = 0.38;
    camp.add(dadanCampfireCore);
    for (const rot of [0.3, -0.6, 1.4]) {
      const log = new THREE.Mesh(unitCyl, darkTimberMat);
      log.scale.set(0.13, 1.25, 0.13);
      log.position.y = 0.18;
      log.rotation.set(Math.PI * 0.45, rot, 0);
      camp.add(log);
    }
    placeOnSphere(camp, 20.5, DAWN_DADAN_Y - 0.04, 14.5, 0);
    group.add(camp);

    // Ace, Sabo & Luffy's Giant Forest Treehouse
    const asl = new THREE.Group();
    const giantTrunk = new THREE.Mesh(unitCyl, darkTimberMat);
    giantTrunk.scale.set(1.1, 6.2, 1.1);
    giantTrunk.position.y = 3.1;
    const canopyMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x2d7a36, roughness: 0.85, metalness: 0.02 })
    );
    const canopy = new THREE.Mesh(
      trackGeo(new THREE.IcosahedronGeometry(3.4, 1)),
      canopyMat
    );
    canopy.scale.set(1.2, 0.72, 1.1);
    canopy.position.y = 6.9;
    const treeDeck = new THREE.Mesh(unitBox, timberMat);
    treeDeck.scale.set(3.8, 0.25, 3.6);
    treeDeck.position.set(0.8, 3.8, 0.4);
    const treeCabin = new THREE.Mesh(unitBox, timberMat);
    treeCabin.scale.set(2.4, 1.9, 2.3);
    treeCabin.position.set(0.9, 4.85, 0.4);
    const treeRoof = new THREE.Mesh(
      getRoofGeo(2.5, 2.4, 1.1, 'gable'),
      terracottaRoofMat
    );
    treeRoof.position.set(0.9, 5.8, 0.4);
    asl.add(giantTrunk, canopy, treeDeck, treeCabin, treeRoof);
    placeOnSphere(
      asl,
      DAWN_LANDMARKS.aslTreehouse.x,
      DAWN_LANDMARKS.aslTreehouse.y - 0.08,
      DAWN_LANDMARKS.aslTreehouse.z,
      DAWN_LANDMARKS.aslTreehouse.yaw
    );
    group.add(asl);
  }

  // 6. GRAY TERMINAL SCRAPYARD MOUNDS
  {
    const scrapSpots: readonly [number, number, number][] = [
      [-13.5, -16.5, 1.4],
      [-18.8, -8.5, 1.6],
      [-23.5, -17.2, 1.5],
      [-20.5, -2.5, 1.3],
      [-10.2, -14.8, 1.4],
      [-25.2, -10.0, 1.5],
    ];
    scrapSpots.forEach(([sx, sz, sc], i) => {
      const mound = new THREE.Group();
      const basePile = new THREE.Mesh(
        trackGeo(new THREE.DodecahedronGeometry(1.15, 0)),
        rustScrapMat
      );
      basePile.scale.set(1.4 * sc, 0.75 * sc, 1.2 * sc);
      basePile.position.y = 0.55 * sc;
      const plate = new THREE.Mesh(unitBox, stoneGrayMat);
      plate.scale.set(1.5 * sc, 0.14 * sc, 1.0 * sc);
      plate.position.set(0.2, 0.7 * sc, 0);
      plate.rotation.set(0.4, i * 0.7, -0.3);
      mound.add(basePile, plate);
      placeOnSphere(mound, sx, sampleDawnHeight(sx, sz) - 0.08, sz, i * 0.9);
      group.add(mound);
    });
  }

  // 7. GOA KINGDOM WALLS, GREAT GATE, CENTER FOUNTAIN, STAIRS & ROYAL PALACE
  {
    // Crenellated Perimeter & Tier Walls (deepened footings so no slope gap ever appears)
    for (const w of DAWN_GOA_WALLS) {
      const baseY = w.tier === 'high' ? DAWN_GOA_CENTER_Y : DAWN_GOA_EDGE_Y;
      const wall = new THREE.Group();
      const body = new THREE.Mesh(unitBox, limestoneMat);
      body.scale.set(w.width, w.height + 0.8, w.depth);
      body.position.y = (w.height - 0.8) * 0.5;
      const cap = new THREE.Mesh(unitBox, stoneGrayMat);
      cap.scale.set(w.width + 0.25, 0.35, w.depth + 0.25);
      cap.position.y = w.height + 0.15;
      wall.add(body, cap);
      placeOnSphere(wall, w.x, baseY - 0.2, w.z, 0);
      group.add(wall);
    }

    // Great Gate of Goa (separating Gray Terminal from Edge Town) + Inner Gate
    for (const gatePos of [
      { x: DAWN_LANDMARKS.goaGreatGate.x, z: DAWN_LANDMARKS.goaGreatGate.z, y: DAWN_GOA_EDGE_Y, scale: 1.0 },
      { x: DAWN_LANDMARKS.goaInnerGate.x, z: DAWN_LANDMARKS.goaInnerGate.z, y: DAWN_GOA_EDGE_Y, scale: 0.88 },
    ]) {
      const gate = new THREE.Group();
      for (const gz of [-3.4 * gatePos.scale, 3.4 * gatePos.scale]) {
        const tower = new THREE.Mesh(unitBox, limestoneMat);
        tower.scale.set(2.8 * gatePos.scale, 7.6 * gatePos.scale, 2.4 * gatePos.scale);
        tower.position.set(0, 3.8 * gatePos.scale, gz);
        const spire = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(1.75 * gatePos.scale, 2.6 * gatePos.scale, 8)),
          goaBlueRoofMat
        );
        spire.position.set(0, 8.8 * gatePos.scale, gz);
        gate.add(tower, spire);
      }
      const lintel = new THREE.Mesh(unitBox, limestoneMat);
      lintel.scale.set(2.5 * gatePos.scale, 2.4 * gatePos.scale, 6.2 * gatePos.scale);
      lintel.position.set(0, 6.4 * gatePos.scale, 0);
      for (const mz of [-2.2, -1.1, 0, 1.1, 2.2]) {
        const merlon = new THREE.Mesh(unitBox, limestoneMat);
        merlon.scale.set(0.65 * gatePos.scale, 0.68 * gatePos.scale, 0.65 * gatePos.scale);
        merlon.position.set(0.85 * gatePos.scale, 7.9 * gatePos.scale, mz * gatePos.scale);
        gate.add(merlon);
      }
      for (const lz of [-2.2 * gatePos.scale, 2.2 * gatePos.scale]) {
        const torch = new THREE.Mesh(unitBox, lanternGlowMat);
        torch.scale.set(0.28 * gatePos.scale, 0.44 * gatePos.scale, 0.28 * gatePos.scale);
        torch.position.set(1.38 * gatePos.scale, 3.8 * gatePos.scale, lz);
        gate.add(torch);
      }
      const crest = new THREE.Mesh(unitCyl, goldMat);
      crest.rotation.z = Math.PI * 0.5;
      crest.scale.set(0.65 * gatePos.scale, 0.32, 0.65 * gatePos.scale);
      crest.position.set(1.32 * gatePos.scale, 6.4 * gatePos.scale, 0);
      gate.add(lintel, crest);

      placeOnSphere(gate, gatePos.x, gatePos.y - 0.15, gatePos.z, 0);
      group.add(gate);
    }

    // Goa Inner Stepped Ramp & High Town Monumental Grand Staircase
    for (let s = 0; s < 10; s++) {
      const t = (s + 0.5) / 10;
      const sx = -66.0 - t * 6.0;
      const sy = DAWN_GOA_CENTER_Y + t * (DAWN_GOA_HIGH_Y - DAWN_GOA_CENTER_Y);
      const step = new THREE.Mesh(unitBox, limestoneMat);
      step.scale.set(0.7, 0.45, 5.8);
      placeOnSphere(step, sx, sy - 0.2, -14.0, 0);
      group.add(step);
    }
    for (const rz of [-17.1, -10.9]) {
      const balustrade = new THREE.Mesh(unitBox, stoneGrayMat);
      balustrade.scale.set(6.4, 1.0, 0.45);
      placeOnSphere(
        balustrade,
        -69.0,
        (DAWN_GOA_CENTER_Y + DAWN_GOA_HIGH_Y) * 0.5 + 0.2,
        rz,
        0
      );
      group.add(balustrade);
    }

    // Center Town Fountain Square
    const fountain = new THREE.Group();
    const fBase = new THREE.Mesh(unitCyl, stoneGrayMat);
    fBase.scale.set(2.4, 0.35, 2.4);
    fBase.position.y = 0.17;
    const fPool = new THREE.Mesh(unitCyl, waterMat);
    fPool.scale.set(1.95, 0.16, 1.95);
    fPool.position.y = 0.42;
    const fStem = new THREE.Mesh(unitCyl, limestoneMat);
    fStem.scale.set(0.4, 1.3, 0.4);
    fStem.position.y = 1.05;
    const fBowl = new THREE.Mesh(unitCyl, limestoneMat);
    fBowl.scale.set(0.95, 0.24, 0.95);
    fBowl.position.y = 1.65;
    fountain.add(fBase, fPool, fStem, fBowl);
    placeOnSphere(
      fountain,
      DAWN_LANDMARKS.goaFountain.x,
      DAWN_GOA_CENTER_Y - 0.04,
      DAWN_LANDMARKS.goaFountain.z,
      0
    );
    group.add(fountain);

    // Goa Kingdom Royal Palace on High Town Terrace
    const palace = new THREE.Group();
    const palaceTex = regTex(createPalaceFacadeTexture());
    const palaceWallMat = trackMat(
      new THREE.MeshStandardMaterial({ map: palaceTex, roughness: 0.7, metalness: 0.05 })
    );

    const pPlinth = new THREE.Mesh(unitBox, stoneGrayMat);
    pPlinth.scale.set(8.8, 0.55, 13.8);
    pPlinth.position.y = 0.27;
    const pMain = new THREE.Mesh(unitBox, palaceWallMat);
    pMain.scale.set(7.6, 5.2, 12.6);
    pMain.position.y = 3.15;
    const pMansard = new THREE.Mesh(
      getRoofGeo(7.8, 12.8, 2.2, 'mansard'),
      goaBlueRoofMat
    );
    pMansard.position.y = 5.75;
    // Central Royal Dome & Golden Finial
    const drum = new THREE.Mesh(unitCyl, limestoneMat);
    drum.scale.set(2.1, 1.7, 2.1);
    drum.position.y = 8.4;
    const dome = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(2.15, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55)),
      goldMat
    );
    dome.position.y = 9.25;
    const spire = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.32, 1.8, 8)),
      goldMat
    );
    spire.position.y = 11.9;
    // East Entry Open Colonnade Portico facing Grand Staircase (+X)
    const pPorticoBase = new THREE.Mesh(unitBox, stoneGrayMat);
    pPorticoBase.scale.set(2.3, 0.36, 5.0);
    pPorticoBase.position.set(4.55, 0.18, 0);
    palace.add(pPorticoBase);
    for (const cz of [-2.0, -0.75, 0.75, 2.0]) {
      const col = new THREE.Mesh(unitCyl, limestoneMat);
      col.scale.set(0.24, 3.15, 0.24);
      col.position.set(5.35, 1.92, cz);
      palace.add(col);
    }
    const pPorticoEntablature = new THREE.Mesh(unitBox, limestoneMat);
    pPorticoEntablature.scale.set(2.2, 0.46, 4.9);
    pPorticoEntablature.position.set(4.6, 3.68, 0);
    const pPorticoRoof = new THREE.Mesh(
      getRoofGeo(2.3, 5.0, 1.1, 'gable'),
      goaBlueRoofMat
    );
    pPorticoRoof.position.set(4.6, 3.9, 0);

    palace.add(pPlinth, pMain, pMansard, drum, dome, spire, pPorticoEntablature, pPorticoRoof);
    placeOnSphere(
      palace,
      DAWN_LANDMARKS.goaPalace.x,
      DAWN_GOA_HIGH_Y - 0.08,
      DAWN_LANDMARKS.goaPalace.z,
      0
    );
    group.add(palace);

    // Western Royal Harbor Stone Quay Wall (anchored deeply into seabed)
    const quayWall = new THREE.Mesh(unitBox, stoneGrayMat);
    quayWall.scale.set(1.6, 5.2, 14.4);
    placeOnSphere(quayWall, -97.2, DAWN_GOA_QUAY_Y - 1.5, -14.0, 0);
    group.add(quayWall);
  }

  // 8. HOUSES & SHACKS ACROSS FOOSHA VILLAGE, GRAY TERMINAL & GOA KINGDOM
  const facadeCache = new Map<number, THREE.MeshStandardMaterial>();
  const getFacadeMat = (color: number) => {
    let m = facadeCache.get(color);
    if (!m) {
      const tex = regTex(createCottageFacadeTexture(color));
      m = trackMat(
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0.03 })
      );
      facadeCache.set(color, m);
    }
    return m;
  };

  for (const b of DAWN_BUILDINGS) {
    const hGroup = new THREE.Group();
    const body = new THREE.Mesh(unitBox, getFacadeMat(b.wallColor));
    body.scale.set(b.width, b.height, b.depth);
    body.position.y = b.height * 0.5;
    hGroup.add(body);

    const roofH = Math.min(1.6, b.depth * 0.45);
    const roof = new THREE.Mesh(
      getRoofGeo(b.width, b.depth, roofH, b.roofStyle),
      getRoofMat(b.roofColor)
    );
    roof.position.y = b.height;
    hGroup.add(roof);

    if (b.hasChimney) {
      const chimney = new THREE.Mesh(unitBox, stoneGrayMat);
      chimney.scale.set(0.42, 1.05, 0.42);
      chimney.position.set(b.width * 0.28, b.height + roofH * 0.55, 0);
      hGroup.add(chimney);
    }

    if (b.hasPorch) {
      const awning = new THREE.Mesh(unitBox, timberMat);
      awning.scale.set(b.width * 0.75, 0.14, 0.9);
      awning.position.set(0, 1.42, b.depth * 0.5 + 0.42);
      hGroup.add(awning);
    }

    placeOnSphere(hGroup, b.x, b.y - 0.06, b.z, b.yaw);
    group.add(hGroup);
  }

  // 9. FOOSHA ROADSIDE WOODEN FENCES
  for (const f of DAWN_FENCES) {
    const len = Math.hypot(f.bx - f.ax, f.bz - f.az);
    const mx = (f.ax + f.bx) * 0.5;
    const mz = (f.az + f.bz) * 0.5;
    const yaw = -Math.atan2(f.bz - f.az, f.bx - f.ax);
    const fence = new THREE.Group();
    const postCount = Math.max(3, Math.round(len / 1.8));
    for (let i = 0; i <= postCount; i++) {
      const px = -len * 0.5 + (i / postCount) * len;
      const post = new THREE.Mesh(unitBox, timberMat);
      post.scale.set(0.14, 0.72, 0.14);
      post.position.set(px, 0.36, 0);
      fence.add(post);
    }
    for (const ry of [0.28, 0.56]) {
      const rail = new THREE.Mesh(unitBox, timberMat);
      rail.scale.set(len, 0.08, 0.08);
      rail.position.set(0, ry, 0);
      fence.add(rail);
    }
    placeOnSphere(fence, mx, sampleDawnHeight(mx, mz), mz, yaw);
    group.add(fence);
  }

  // 10. COASTAL & MT. COLUBO ROCK OUTCROPS
  for (const rk of DAWN_ROCKS) {
    const rock = new THREE.Mesh(
      trackGeo(new THREE.DodecahedronGeometry(1, 0)),
      seaRockMat
    );
    rock.scale.set(rk.scaleX, rk.scaleY, rk.scaleZ);
    placeOnSphere(rock, rk.x, rk.y, rk.z, rk.yaw);
    group.add(rock);
  }

  // 11. INSTANCED MULTI-SPECIES FOREST (BROADLEAF, PINE, CYPRESS & PALMS)
  const leafMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84, metalness: 0.02 })
  );

  const broadleafTrees = DAWN_TREES.filter((t) => t.kind === 'broadleaf');
  const pineTrees = DAWN_TREES.filter((t) => t.kind === 'pine');
  const cypressTrees = DAWN_TREES.filter((t) => t.kind === 'cypress');
  const palmTrees = DAWN_TREES.filter((t) => t.kind === 'palm');

  if (broadleafTrees.length > 0) {
    const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.25, 1.35, 7));
    trunkGeo.translate(0, 0.675, 0);
    const crownMainGeo = trackGeo(new THREE.IcosahedronGeometry(1.0, 1));
    crownMainGeo.translate(0, 2.0, 0);
    const crownSideGeo = trackGeo(new THREE.IcosahedronGeometry(0.76, 1));
    crownSideGeo.translate(0.55, 1.75, 0.32);

    const tInst = new THREE.InstancedMesh(trunkGeo, timberMat, broadleafTrees.length);
    const c1Inst = new THREE.InstancedMesh(crownMainGeo, leafMat, broadleafTrees.length);
    const c2Inst = new THREE.InstancedMesh(crownSideGeo, leafMat, broadleafTrees.length);

    broadleafTrees.forEach((t, idx) => {
      const sp = toDawnSphereLocal(t.x, t.y, t.z, globeRadius);
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
      _tmpColor.setRGB(0.18 * t.tint, 0.57 * t.tint, 0.2 * t.tint);
      c1Inst.setColorAt(idx, _tmpColor);
      _tmpColor.setRGB(0.14 * t.tint, 0.48 * t.tint, 0.16 * t.tint);
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
    const pTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.18, 1.0, 6));
    pTrunkGeo.translate(0, 0.5, 0);
    const tier1Geo = trackGeo(new THREE.ConeGeometry(0.95, 1.45, 7));
    tier1Geo.translate(0, 1.45, 0);
    const tier2Geo = trackGeo(new THREE.ConeGeometry(0.68, 1.25, 7));
    tier2Geo.translate(0, 2.25, 0);

    const ptInst = new THREE.InstancedMesh(pTrunkGeo, timberMat, pineTrees.length);
    const c1Inst = new THREE.InstancedMesh(tier1Geo, leafMat, pineTrees.length);
    const c2Inst = new THREE.InstancedMesh(tier2Geo, leafMat, pineTrees.length);

    pineTrees.forEach((t, idx) => {
      const sp = toDawnSphereLocal(t.x, t.y, t.z, globeRadius);
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
      _tmpColor.setRGB(0.11 * t.tint, 0.44 * t.tint, 0.17 * t.tint);
      c1Inst.setColorAt(idx, _tmpColor);
      _tmpColor.setRGB(0.14 * t.tint, 0.51 * t.tint, 0.2 * t.tint);
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

  if (cypressTrees.length > 0) {
    const cyTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.1, 0.16, 0.8, 6));
    cyTrunkGeo.translate(0, 0.4, 0);
    const cyConeGeo = trackGeo(new THREE.ConeGeometry(0.65, 2.7, 7));
    cyConeGeo.translate(0, 1.9, 0);
    const ctInst = new THREE.InstancedMesh(cyTrunkGeo, timberMat, cypressTrees.length);
    const ccInst = new THREE.InstancedMesh(cyConeGeo, leafMat, cypressTrees.length);

    cypressTrees.forEach((t, idx) => {
      const sp = toDawnSphereLocal(t.x, t.y, t.z, globeRadius);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
      _tiltQuat.setFromUnitVectors(_up, _localNormal);
      _yawQuat.setFromAxisAngle(_yAxis, idx);
      _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
      _dummy.scale.setScalar(S * t.scale);
      _dummy.updateMatrix();
      ctInst.setMatrixAt(idx, _dummy.matrix);
      ccInst.setMatrixAt(idx, _dummy.matrix);
      _tmpColor.setRGB(0.16 * t.tint, 0.54 * t.tint, 0.18 * t.tint);
      ccInst.setColorAt(idx, _tmpColor);
    });
    ctInst.instanceMatrix.needsUpdate = true;
    ccInst.instanceMatrix.needsUpdate = true;
    if (ccInst.instanceColor) ccInst.instanceColor.needsUpdate = true;
    ctInst.computeBoundingSphere();
    ccInst.computeBoundingSphere();
    group.add(ctInst, ccInst);
  }

  if (palmTrees.length > 0) {
    const pTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.19, 2.4, 7));
    pTrunkGeo.translate(0, 1.2, 0);
    const pFrondGeo = trackGeo(createPalmFrondCanopyGeo());
    const ptInst = new THREE.InstancedMesh(pTrunkGeo, timberMat, palmTrees.length);
    const pfInst = new THREE.InstancedMesh(pFrondGeo, leafMat, palmTrees.length);

    palmTrees.forEach((t, idx) => {
      const sp = toDawnSphereLocal(t.x, t.y, t.z, globeRadius);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
      _tiltQuat.setFromUnitVectors(_up, _localNormal);
      _yawQuat.setFromAxisAngle(_yAxis, (t.x + t.z) % (Math.PI * 2));
      _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
      _dummy.scale.setScalar(S * t.scale);
      _dummy.updateMatrix();
      ptInst.setMatrixAt(idx, _dummy.matrix);
      pfInst.setMatrixAt(idx, _dummy.matrix);
      _tmpColor.setRGB(0.2 * t.tint, 0.62 * t.tint, 0.22 * t.tint);
      pfInst.setColorAt(idx, _tmpColor);
    });
    ptInst.instanceMatrix.needsUpdate = true;
    pfInst.instanceMatrix.needsUpdate = true;
    if (pfInst.instanceColor) pfInst.instanceColor.needsUpdate = true;
    ptInst.computeBoundingSphere();
    pfInst.computeBoundingSphere();
    group.add(ptInst, pfInst);
  }

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      if (windmillSails) {
        windmillSails.rotation.z = -elapsed * 0.52;
      }
      if (dadanCampfireCore) {
        const s = 0.9 + Math.sin(elapsed * 5.2) * 0.14;
        dadanCampfireCore.scale.setScalar(s);
      }
    },
  };
}
