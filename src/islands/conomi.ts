import * as THREE from 'three';
import {
  CONOMI_BUILDINGS,
  CONOMI_COURTYARD_Y,
  CONOMI_GLOBE_SCALE,
  CONOMI_GOSA_Y,
  CONOMI_LANDMARKS,
  CONOMI_POOL_WATER_Y,
  CONOMI_ROCKS,
  CONOMI_TREES,
  CONOMI_WORLD_SIZE,
  conomiRoadSignedDist,
  isInArlongCourtyard,
  sampleArlongPoolMask,
  sampleConomiHeight,
  sampleConomiTerracePondMask,
  toConomiSphereLocal,
} from '../utils/conomiTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = CONOMI_GLOBE_SCALE;
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

function createConomiTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = CONOMI_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * CONOMI_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * CONOMI_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const h = sampleConomiHeight(x, z);
      const hx = sampleConomiHeight(x + 0.9, z);
      const hz = sampleConomiHeight(x, z + 0.9);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 1.45, 0, 1);
      const fineNoise = (valueNoise2D(x * 1.35, z * 1.35) - 0.5) * 12;

      let rgb: [number, number, number] = [188, 168, 122];
      let alpha = 0;

      if (h < -0.18) {
        // Fade submerged terrain cleanly so the globe's 3D ocean renders smoothly right to the shore
        alpha = smoothstep(-0.42, -0.18, h);
        rgb = [184, 165, 120];
      } else {
        alpha = 1;
        // Wet-to-dry sandy shoreline transitioning to lush tropical meadow green
        const wetToDry = smoothstep(-0.18, 0.28, h);
        const sandColor = mixRgb([188, 168, 122], [226, 200, 138], wetToDry);
        const sandToGrass = smoothstep(0.32, 1.38, h);
        rgb = mixRgb(sandColor, [94, 166, 68], sandToGrass);

        // Central highland basin terraced emerald paddy rings (matching cocoyashi2.png)
        const dBasin = Math.hypot((x + 4) / 36, (z + 18) / 24);
        if (dBasin < 0.72 && h > 8.2 && slope < 0.25) {
          const cell = Math.sin(x * 0.26) * Math.cos(z * 0.26);
          const paddyT = smoothstep(-0.1, 0.35, cell);
          rgb = mixRgb([76, 138, 66], [108, 174, 82], paddyT);
        }

        // Steep cliff faces & mountain ridges (striated warm earth/brown rock matching cocoyashi.png)
        if (slope > 0.25 && !isInArlongCourtyard(x, z)) {
          const cliffT = smoothstep(0.24, 0.54, slope);
          const strata =
            Math.sin(h * 2.5 + x * 0.16) * 14 +
            (valueNoise2D(x * 0.65, z * 0.65) - 0.5) * 18;
          rgb = mixRgb(rgb, [158 + strata, 122 + strata * 0.8, 90 + strata * 0.6], cliffT);
        }

        // Gosa terraced farmland rows on hillside NW/South of Gosa Cove
        if (x > 46 && x < 72 && z > -36 && z < -18 && slope < 0.32) {
          const rowStrip = Math.sin((x + z * 0.4) * 1.45);
          if (rowStrip > 0.15) {
            rgb = mixRgb(rgb, [138, 118, 82], 0.55);
          }
        }

        // South-East Arlong terraced fish/water ponds
        const pondMask = sampleConomiTerracePondMask(x, z);
        if (pondMask > 0.05) {
          rgb = mixRgb(rgb, [74, 182, 212], pondMask * 0.92);
        }

        // Arlong Park white masonry courtyard & turquoise swimming pools
        if (isInArlongCourtyard(x, z)) {
          const pool = sampleArlongPoolMask(x, z);
          if (pool > 0.5) {
            rgb = [44, 168, 206];
          } else {
            const tile = ((Math.floor(x * 0.9) + Math.floor(z * 0.9)) & 1) === 0 ? 4 : -4;
            rgb = [226 + tile, 228 + tile, 232 + tile];
          }
        }

        // Sandy-ochre dirt paths connecting Arlong Park, Cocoyashi Village & Gosa Village
        const roadD = conomiRoadSignedDist(x, z);
        if (roadD < 0.48 && h > 0.8 && !isInArlongCourtyard(x, z)) {
          const roadT = 1 - smoothstep(-0.18, 0.45, roadD);
          const grain = (valueNoise2D(x * 2.3, z * 2.3) - 0.5) * 18;
          const isEdge = roadD > -0.15 && roadD < 0.35;
          const roadTone: [number, number, number] = isEdge
            ? [196 + grain * 0.6, 158 + grain * 0.6, 102 + grain * 0.6]
            : [216 + grain, 178 + grain, 118 + grain];
          rgb = mixRgb(rgb, roadTone, roadT * 0.92);
        }
      }

      data[idx] = clamp(Math.round(rgb[0] + (h > -0.18 ? fineNoise : 0)), 0, 255);
      data[idx + 1] = clamp(Math.round(rgb[1] + (h > -0.18 ? fineNoise : 0)), 0, 255);
      data[idx + 2] = clamp(Math.round(rgb[2] + (h > -0.18 ? fineNoise : 0)), 0, 255);
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

function createCocoyashiFacadeTexture(
  baseColorHex: number,
  ruined = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const c = new THREE.Color(baseColorHex);
  ctx.fillStyle = `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
  ctx.fillRect(0, 0, 256, 256);

  // Timber frame posts & horizontal beam
  ctx.fillStyle = ruined ? '#5c4636' : '#785233';
  ctx.fillRect(0, 0, 12, 256);
  ctx.fillRect(244, 0, 12, 256);
  ctx.fillRect(0, 232, 256, 24);
  ctx.fillRect(0, 116, 256, 12);

  // Windows & central doorway
  const slots = [34, 102, 170];
  for (let i = 0; i < slots.length; i++) {
    const x = slots[i];
    if (i === 1) {
      // Door
      ctx.fillStyle = ruined ? '#231c18' : '#5e3c24';
      ctx.fillRect(x, 146, 52, 86);
      ctx.strokeStyle = '#efe6d5';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, 146, 52, 86);
    } else {
      ctx.fillStyle = ruined ? '#1f1e22' : '#263648';
      ctx.fillRect(x, 144, 46, 48);
      ctx.strokeStyle = '#efe6d5';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, 144, 46, 48);
    }
    // Upper attic/second-band window
    ctx.fillStyle = ruined ? '#1f1e22' : '#263648';
    ctx.fillRect(x + 4, 44, 40, 44);
    ctx.strokeStyle = '#efe6d5';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, 44, 40, 44);
  }

  if (ruined) {
    ctx.fillStyle = 'rgba(42,30,22,0.38)';
    ctx.fillRect(28, 30, 80, 18);
    ctx.fillRect(150, 180, 74, 24);
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

function createPitchedRoofGeo(
  width: number,
  depth: number,
  height: number,
  style: 'hip' | 'gable'
): THREE.BufferGeometry {
  const hw = width * 0.5 + 0.32;
  const hd = depth * 0.5 + 0.32;
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

function createPagodaEaveGeo(
  baseW: number,
  baseD: number,
  topW: number,
  topD: number,
  height: number
): THREE.BufferGeometry {
  const bw = baseW * 0.5;
  const bd = baseD * 0.5;
  const tw = topW * 0.5;
  const td = topD * 0.5;

  const verts = new Float32Array([
    // Front
    -bw, 0, bd, bw, 0, bd, tw, height, td,
    -bw, 0, bd, tw, height, td, -tw, height, td,
    // Back
    bw, 0, -bd, -bw, 0, -bd, -tw, height, -td,
    bw, 0, -bd, -tw, height, -td, tw, height, -td,
    // Left
    -bw, 0, -bd, -bw, 0, bd, -tw, height, td,
    -bw, 0, -bd, -tw, height, td, -tw, height, -td,
    // Right
    bw, 0, bd, bw, 0, -bd, tw, height, -td,
    bw, 0, bd, tw, height, -td, tw, height, td,
    // Top cap
    -tw, height, td, tw, height, td, tw, height, -td,
    -tw, height, td, tw, height, -td, -tw, height, -td,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Builds a drooping 6-frond tropical palm canopy centered at (0, 2.38, 0).
 */
function createPalmFrondCanopyGeo(): THREE.BufferGeometry {
  const pos: number[] = [];
  const frondCount = 6;
  const pushTri = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number
  ) => {
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  };

  const baseY = 2.35;
  for (let i = 0; i < frondCount; i++) {
    const yaw = (i / frondCount) * Math.PI * 2 + (i % 2) * 0.15;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const toWorld = (lx: number, ly: number, lz: number): [number, number, number] => [
      lx * cosY - lz * sinY,
      baseY + ly,
      lx * sinY + lz * cosY,
    ];

    const midLen = 0.68;
    const tipLen = 1.48;
    const midLift = 0.28 + (i % 2) * 0.08;
    const tipDrop = -0.34 - (i % 2) * 0.12;
    const halfW = 0.28;

    const p0 = toWorld(0, 0, 0);
    const pML = toWorld(midLen, midLift, -halfW);
    const pMR = toWorld(midLen, midLift, halfW);
    const pTip = toWorld(tipLen, tipDrop, 0);

    // Upper quad (2 triangles) + drooping tip triangle, double-sided for upward & downward views
    pushTri(...p0, ...pML, ...pMR);
    pushTri(...p0, ...pMR, ...pML);
    pushTri(...pML, ...pTip, ...pMR);
    pushTri(...pML, ...pMR, ...pTip);
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
  group.name = 'island-conomi';

  const placeOnSphere = (
    obj: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    yaw = 0
  ) => {
    const sp = toConomiSphereLocal(x, y, z, globeRadius);
    obj.position.set(sp.x, sp.y, sp.z);
    _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, yaw);
    obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    obj.scale.multiplyScalar(S);
  };

  // 1. Sculpted 160x160 Conomi Terrain Mesh + 1024x1024 Painted Map Texture
  const segs = 160;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(CONOMI_WORLD_SIZE, CONOMI_WORLD_SIZE, segs, segs)
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const posArr = posAttr.array as Float32Array;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posArr[i * 3];
    const z = posArr[i * 3 + 2];
    const h = sampleConomiHeight(x, z);
    const sp = toConomiSphereLocal(x, h, z, globeRadius);
    posArr[i * 3] = sp.x;
    posArr[i * 3 + 1] = sp.y;
    posArr[i * 3 + 2] = sp.z;
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainTex = regTex(createConomiTerrainTexture(1024));
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

  // Shared primitives & materials
  const unitBox = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const unitCyl = trackGeo(new THREE.CylinderGeometry(1, 1, 1, 12));
  const roofShingleTex = regTex(createRoofShingleTexture());

  const whiteStoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf1eee6, roughness: 0.72, metalness: 0.04 })
  );
  const grayStoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.85, metalness: 0.05 })
  );
  const rockMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7a7e86, roughness: 0.9, metalness: 0.04 })
  );
  const timberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7a4b29, roughness: 0.82, metalness: 0.05 })
  );
  const goldTrimMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xebb134, roughness: 0.42, metalness: 0.25 })
  );
  const arlongRedMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc23828,
      map: roofShingleTex,
      roughness: 0.68,
      metalness: 0.05,
    })
  );
  const poolWaterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2ec4e8,
      emissive: 0x0a6b8a,
      emissiveIntensity: 0.35,
      roughness: 0.18,
      metalness: 0.12,
    })
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

  const facadeIntactTex = regTex(createCocoyashiFacadeTexture(0xf7f2e7, false));
  const facadeRuinTex = regTex(createCocoyashiFacadeTexture(0xd5c4ab, true));
  const facadeIntactMat = trackMat(
    new THREE.MeshStandardMaterial({ map: facadeIntactTex, roughness: 0.78, metalness: 0.03 })
  );
  const facadeRuinMat = trackMat(
    new THREE.MeshStandardMaterial({ map: facadeRuinTex, roughness: 0.88, metalness: 0.03 })
  );

  // 2. ARLONG PARK COMPOUND (6-Tier Pagoda, Courtyard Walls, Pools, Pavilions, Sea Gate)
  {
    const apGroup = new THREE.Group();

    // 2A. 6-Tier Iconic Saw-Shark Pagoda centered at (-64.5, -20.0) -> local (0,0,0)
    const pagoda = new THREE.Group();
    pagoda.position.set(15.0, 0, 0); // Relative to courtyard center (-79.5, -20.0)

    // Raised stone plinth
    const plinth = new THREE.Mesh(unitBox, whiteStoneMat);
    plinth.scale.set(12.2, 0.9, 13.6);
    plinth.position.y = 0.45;
    pagoda.add(plinth);

    // Ground arcade white pillars
    for (const px of [-5.2, -2.6, 2.6, 5.2]) {
      for (const pz of [-5.8, 5.8]) {
        const col = new THREE.Mesh(unitCyl, whiteStoneMat);
        col.scale.set(0.32, 3.0, 0.32);
        col.position.set(px, 2.2, pz);
        pagoda.add(col);
      }
    }

    const darkWindowMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x222933, roughness: 0.55, metalness: 0.1 })
    );

    // 5 stacked diminishing pagoda tiers with flared eaves + window openings + gold ridge trim
    const tiers = [
      { w: 10.6, d: 12.0, h: 3.1, eaveW: 13.2, eaveD: 14.6, y: 0.9 },
      { w: 8.8, d: 10.0, h: 2.5, eaveW: 11.4, eaveD: 12.6, y: 4.4 },
      { w: 7.2, d: 8.2, h: 2.2, eaveW: 9.6, eaveD: 10.6, y: 7.3 },
      { w: 5.6, d: 6.4, h: 1.9, eaveW: 7.8, eaveD: 8.6, y: 9.8 },
      { w: 4.2, d: 4.8, h: 1.7, eaveW: 6.2, eaveD: 6.8, y: 12.0 },
    ];
    tiers.forEach((t, ti) => {
      const core = new THREE.Mesh(unitBox, whiteStoneMat);
      core.scale.set(t.w, t.h, t.d);
      core.position.y = t.y + t.h * 0.5;
      pagoda.add(core);

      const timberBand = new THREE.Mesh(unitBox, arlongRedMat);
      timberBand.scale.set(t.w + 0.25, t.h * 0.36, t.d + 0.25);
      timberBand.position.y = t.y + t.h * 0.42;
      pagoda.add(timberBand);

      // Dark lattice window openings on East/West & North/South facades
      const winCount = Math.max(2, 4 - Math.floor(ti / 2));
      for (let wi = 0; wi < winCount; wi++) {
        const frac = (wi + 0.5) / winCount - 0.5;
        // West & East windows
        for (const sx of [-1, 1]) {
          if (ti === 0 && sx === -1 && Math.abs(frac) < 0.18) continue;
          const win = new THREE.Mesh(unitBox, darkWindowMat);
          win.scale.set(0.24, t.h * 0.46, 0.95);
          win.position.set(sx * (t.w * 0.5 + 0.14), t.y + t.h * 0.52, frac * (t.d * 0.72));
          pagoda.add(win);
        }
        // North & South windows
        for (const sz of [-1, 1]) {
          const win = new THREE.Mesh(unitBox, darkWindowMat);
          win.scale.set(0.95, t.h * 0.46, 0.24);
          win.position.set(frac * (t.w * 0.72), t.y + t.h * 0.52, sz * (t.d * 0.5 + 0.14));
          pagoda.add(win);
        }
      }

      const eave = new THREE.Mesh(
        trackGeo(createPagodaEaveGeo(t.eaveW, t.eaveD, t.w * 0.86, t.d * 0.86, 0.95)),
        arlongRedMat
      );
      eave.position.y = t.y + t.h - 0.15;
      pagoda.add(eave);

      const goldRim = new THREE.Mesh(unitBox, goldTrimMat);
      goldRim.scale.set(t.eaveW + 0.18, 0.14, t.eaveD + 0.18);
      goldRim.position.y = t.y + t.h - 0.12;
      pagoda.add(goldRim);
    });

    // Grand Arched West Entrance Doorway facing the Courtyard Pools
    const doorFrame = new THREE.Mesh(unitBox, goldTrimMat);
    doorFrame.scale.set(0.45, 2.65, 3.1);
    doorFrame.position.set(-5.32, 2.2, 0);
    const doorVoid = new THREE.Mesh(unitBox, darkWindowMat);
    doorVoid.scale.set(0.55, 2.35, 2.45);
    doorVoid.position.set(-5.35, 2.05, 0);
    pagoda.add(doorFrame, doorVoid);

    // Top pagoda crown roof, sculpted saw-shark fin crest & golden teeth
    const topCap = new THREE.Mesh(
      trackGeo(createPagodaEaveGeo(5.6, 6.2, 1.2, 1.4, 1.85)),
      arlongRedMat
    );
    topCap.position.y = 14.3;
    const finMast = new THREE.Mesh(unitBox, grayStoneMat);
    finMast.scale.set(0.55, 2.8, 1.8);
    finMast.position.set(0, 17.1, 0);
    finMast.rotation.z = -0.18;
    const sharkSpire = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.85, 2.4, 4)),
      goldTrimMat
    );
    sharkSpire.position.set(0.15, 17.5, 0);
    sharkSpire.rotation.y = Math.PI * 0.25;
    pagoda.add(topCap, finMast, sharkSpire);
    apGroup.add(pagoda);

    // 2B. White Crenellated Perimeter Wall enclosing Courtyard (x: -95..-57 -> local -15.5..+22.5, z: -33.5..-6.5 -> local -13.5..+13.5)
    const wallSpans: readonly [number, number, number, number][] = [
      // North wall
      [3.5, -13.5, 38.0, 0.9],
      // South wall
      [3.5, 13.5, 38.0, 0.9],
      // East wall (split for entrance gate beside pagoda)
      [22.5, -8.5, 0.9, 10.0],
      [22.5, 8.5, 0.9, 10.0],
      // West wall flanking the Sea Gate channel (z: -13.5..-4.8 and +4.8..+13.5)
      [-15.5, -9.2, 1.1, 8.8],
      [-15.5, 9.2, 1.1, 8.8],
    ];
    for (const [wx, wz, sw, sd] of wallSpans) {
      const wMesh = new THREE.Mesh(unitBox, whiteStoneMat);
      wMesh.scale.set(sw, 3.1, sd);
      wMesh.position.set(wx, 1.45, wz);
      apGroup.add(wMesh);
    }

    // Twin Red Timber-Stone Sea Gate Bastions at West Harbor Mouth (local x = -16.8, z = +-5.5)
    for (const sz of [-1, 1]) {
      const seaBastion = new THREE.Mesh(unitBox, arlongRedMat);
      seaBastion.scale.set(3.2, 3.8, 3.4);
      seaBastion.position.set(-16.8, 1.1, sz * 6.0);
      const bastionCap = new THREE.Mesh(
        getRoofGeo(3.4, 3.6, 1.1, 'hip'),
        goldTrimMat
      );
      bastionCap.position.set(-16.8, 3.0, sz * 6.0);
      apGroup.add(seaBastion, bastionCap);
    }

    // 2C. Two Red-Roofed Open Poolside Pavilions (local x = +3.5, z = +-9.0)
    for (const sz of [-1, 1]) {
      const pav = new THREE.Group();
      pav.position.set(3.5, 0, sz * 9.0);
      for (const cx of [-1.2, 1.2]) {
        for (const cz of [-1.2, 1.2]) {
          const post = new THREE.Mesh(unitCyl, timberMat);
          post.scale.set(0.14, 2.2, 0.14);
          post.position.set(cx, 1.1, cz);
          pav.add(post);
        }
      }
      const pRoof = new THREE.Mesh(getRoofGeo(3.2, 3.2, 1.2, 'hip'), arlongRedMat);
      pRoof.position.y = 2.2;
      pav.add(pRoof);
      apGroup.add(pav);
    }

    placeOnSphere(
      apGroup,
      CONOMI_LANDMARKS.arlongCourtyardCenter.x,
      CONOMI_COURTYARD_Y,
      CONOMI_LANDMARKS.arlongCourtyardCenter.z,
      0
    );
    group.add(apGroup);
  }

  // Animated Pool Water Plane inside Arlong Park
  let arlongWaterMesh: THREE.Mesh | null = null;
  {
    const pw = new THREE.Mesh(unitBox, poolWaterMat);
    pw.scale.set(25.0, 0.25, 19.0);
    placeOnSphere(pw, -83.5, CONOMI_POOL_WATER_Y, -20.0, 0);
    arlongWaterMesh = pw;
    group.add(pw);
  }

  // 2D. ARLONG'S "SHARK SUPERB" SAW-SHARK FLAGSHIP (Moored NW of Arlong Park)
  {
    const ss = new THREE.Group();
    const hull = new THREE.Mesh(unitBox, arlongRedMat);
    hull.scale.set(2.4, 1.25, 7.6);
    hull.position.y = 0.45;
    const deck = new THREE.Mesh(unitBox, timberMat);
    deck.scale.set(2.1, 0.2, 7.1);
    deck.position.y = 1.1;
    // Signature serrated saw-shark bow blade
    const sawBow = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.65, 3.2, 4)),
      grayStoneMat
    );
    sawBow.rotation.x = Math.PI * 0.5;
    sawBow.position.set(0, 1.15, 5.1);
    // Dorsal fin stern cabin
    const cabin = new THREE.Mesh(unitBox, whiteStoneMat);
    cabin.scale.set(1.8, 1.2, 2.0);
    cabin.position.set(0, 1.75, -2.1);
    ss.add(hull, deck, sawBow, cabin);

    const sailMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xfaf3e4, roughness: 0.72, metalness: 0.02 })
    );
    for (const [mz, mh] of [
      [-1.0, 4.6],
      [1.4, 5.6],
    ]) {
      const mast = new THREE.Mesh(unitCyl, timberMat);
      mast.scale.set(0.11, mh, 0.11);
      mast.position.set(0, 1.1 + mh * 0.5, mz);
      const sail = new THREE.Mesh(unitBox, sailMat);
      sail.scale.set(2.8, mh * 0.52, 0.14);
      sail.position.set(0, 1.3 + mh * 0.55, mz + 0.15);
      ss.add(mast, sail);
    }

    placeOnSphere(
      ss,
      CONOMI_LANDMARKS.sharkSuperb.x,
      CONOMI_LANDMARKS.sharkSuperb.y,
      CONOMI_LANDMARKS.sharkSuperb.z,
      CONOMI_LANDMARKS.sharkSuperb.yaw
    );
    group.add(ss);
  }

  // 3. COCOYASHI HARBOR TIMBER PIER & SEAWALL + BELL-MÈRE'S GRAVE MARKER
  {
    const pier = new THREE.Group();
    const pDeck = new THREE.Mesh(unitBox, timberMat);
    pDeck.scale.set(4.2, 0.35, 7.2);
    pDeck.position.y = 0;
    pier.add(pDeck);
    for (const px of [-1.8, 1.8]) {
      for (const pz of [-2.8, 0, 2.8]) {
        const post = new THREE.Mesh(unitCyl, timberMat);
        post.scale.set(0.2, 2.0, 0.2);
        post.position.set(px, -0.6, pz);
        pier.add(post);
      }
    }
    // Cocoyashi Pier supply crates & Genzo-style pinwheel sign post
    const crateOffsets: readonly [number, number][] = [
      [-1.1, 0.8],
      [-0.4, 1.2],
      [1.2, -1.5],
    ];
    for (const [cx, cz] of crateOffsets) {
      const crate = new THREE.Mesh(unitBox, timberMat);
      crate.scale.set(0.65, 0.55, 0.65);
      crate.position.set(cx, 0.45, cz);
      pier.add(crate);
    }
    const pinPost = new THREE.Mesh(unitCyl, timberMat);
    pinPost.scale.set(0.08, 2.2, 0.08);
    pinPost.position.set(1.5, 1.1, -2.5);
    const pinWheel = new THREE.Mesh(unitBox, arlongRedMat);
    pinWheel.scale.set(0.65, 0.65, 0.08);
    pinWheel.position.set(1.5, 2.05, -2.42);
    pinWheel.rotation.z = 0.45;
    pier.add(pinPost, pinWheel);

    placeOnSphere(
      pier,
      CONOMI_LANDMARKS.cocoyashiPier.x,
      CONOMI_LANDMARKS.cocoyashiPier.y,
      CONOMI_LANDMARKS.cocoyashiPier.z,
      0
    );
    group.add(pier);

    // Bell-mère's hillside stone grave monument & orchard crates overlooking the tangerine grove
    const grave = new THREE.Group();
    const gBase = new THREE.Mesh(unitBox, grayStoneMat);
    gBase.scale.set(1.2, 0.4, 1.2);
    gBase.position.y = 0.2;
    const gStone = new THREE.Mesh(unitBox, whiteStoneMat);
    gStone.scale.set(0.65, 1.25, 0.35);
    gStone.position.y = 0.95;
    grave.add(gBase, gStone);
    placeOnSphere(
      grave,
      CONOMI_LANDMARKS.bellemereGrave.x,
      sampleConomiHeight(
        CONOMI_LANDMARKS.bellemereGrave.x,
        CONOMI_LANDMARKS.bellemereGrave.z
      ),
      CONOMI_LANDMARKS.bellemereGrave.z,
      -0.3
    );
    group.add(grave);

    // Wooden fence & harvest crates beside Bell-mère's cottage
    const orchardFence = new THREE.Group();
    for (const fx of [-2.8, 0, 2.8]) {
      const fPost = new THREE.Mesh(unitBox, timberMat);
      fPost.scale.set(0.18, 0.9, 0.18);
      fPost.position.set(fx, 0.45, 0);
      orchardFence.add(fPost);
    }
    const fRail = new THREE.Mesh(unitBox, timberMat);
    fRail.scale.set(6.0, 0.12, 0.12);
    fRail.position.set(0, 0.68, 0);
    const harvestCrate = new THREE.Mesh(unitBox, goldTrimMat);
    harvestCrate.scale.set(0.7, 0.5, 0.7);
    harvestCrate.position.set(-1.4, 0.25, 0.7);
    orchardFence.add(fRail, harvestCrate);
    placeOnSphere(
      orchardFence,
      25.5,
      sampleConomiHeight(25.5, 45.8),
      45.8,
      -0.18
    );
    group.add(orchardFence);

    // Gosa East Bay damaged coastal seawall
    const gosaWall = new THREE.Mesh(unitBox, grayStoneMat);
    gosaWall.scale.set(1.1, 1.6, 16.0);
    placeOnSphere(gosaWall, 89.5, CONOMI_GOSA_Y - 0.5, -13.0, 0.12);
    group.add(gosaWall);
  }

  // 4. COCOYASHI HOUSES, BELL-MÈRE'S COTTAGE & GOSA RUINED/OVERTURNED HOUSES
  const ruinRubbleMatrices: THREE.Matrix4[] = [];
  for (const b of CONOMI_BUILDINGS) {
    const hGroup = new THREE.Group();
    const bodyPivot = new THREE.Group();
    const isRuin = b.district === 'gosa-ruin';

    const body = new THREE.Mesh(
      unitBox,
      isRuin ? facadeRuinMat : facadeIntactMat
    );
    body.scale.set(b.width, b.height, b.depth);
    body.position.y = b.height * 0.5;
    bodyPivot.add(body);

    if (!b.missingRoof) {
      const roofH = Math.min(1.65, b.depth * 0.45);
      const roof = new THREE.Mesh(
        getRoofGeo(b.width, b.depth, roofH, b.roofStyle),
        getRoofMat(b.roofColor)
      );
      roof.position.y = b.height;
      bodyPivot.add(roof);
    } else {
      // Charred broken timber roof rafters & fallen roof slab beside roofless ruin
      for (const rx of [-b.width * 0.3, 0, b.width * 0.3]) {
        const rafter = new THREE.Mesh(unitBox, timberMat);
        rafter.scale.set(0.16, 0.16, b.depth * 0.92);
        rafter.position.set(rx, b.height + 0.06, 0);
        rafter.rotation.x = rx > 0 ? 0.18 : -0.14;
        bodyPivot.add(rafter);
      }
      const ridge = new THREE.Mesh(unitBox, timberMat);
      ridge.scale.set(b.width * 0.85, 0.18, 0.18);
      ridge.position.set(0, b.height + 0.35, 0);
      ridge.rotation.z = 0.24;
      bodyPivot.add(ridge);

      const fallenRoof = new THREE.Mesh(
        getRoofGeo(b.width * 0.85, b.depth * 0.85, 0.9, 'gable'),
        getRoofMat(b.roofColor)
      );
      fallenRoof.position.set(b.width * 0.65, 0.15, b.depth * 0.35);
      fallenRoof.rotation.set(0.32, 0.5, -0.45);
      hGroup.add(fallenRoof);
    }

    if (b.ruinTiltX || b.ruinTiltZ) {
      bodyPivot.rotation.set(b.ruinTiltX ?? 0, 0, b.ruinTiltZ ?? 0);
    }
    hGroup.add(bodyPivot);

    placeOnSphere(hGroup, b.x, b.y - (isRuin ? 0.58 : 0.05), b.z, b.yaw);
    group.add(hGroup);

    if (isRuin) {
      for (let k = 0; k < 3; k++) {
        const rx = b.x + (k === 0 ? -1.4 : k === 1 ? 1.5 : 0.3);
        const rz = b.z + (k === 0 ? 1.3 : k === 1 ? -1.2 : 1.7);
        const ry = sampleConomiHeight(rx, rz);
        const sp = toConomiSphereLocal(rx, ry + 0.16, rz, globeRadius);
        _dummy.position.set(sp.x, sp.y, sp.z);
        _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
        _tiltQuat.setFromUnitVectors(_up, _localNormal);
        _yawQuat.setFromAxisAngle(_yAxis, rx * 0.7 + k);
        _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
        _dummy.scale.set(0.72 * S, 0.42 * S, 0.58 * S);
        _dummy.updateMatrix();
        ruinRubbleMatrices.push(_dummy.matrix.clone());
      }
    }
  }

  if (ruinRubbleMatrices.length > 0) {
    const rubbleInst = new THREE.InstancedMesh(
      unitBox,
      grayStoneMat,
      ruinRubbleMatrices.length
    );
    ruinRubbleMatrices.forEach((m, i) => rubbleInst.setMatrixAt(i, m));
    rubbleInst.instanceMatrix.needsUpdate = true;
    group.add(rubbleInst);
  }

  // 5. COASTAL SEA-STACK BOULDERS
  for (const rk of CONOMI_ROCKS) {
    const rock = new THREE.Mesh(
      trackGeo(new THREE.DodecahedronGeometry(1, 0)),
      rockMat
    );
    rock.scale.set(rk.scaleX, rk.scaleY, rk.scaleZ);
    placeOnSphere(rock, rk.x, rk.y, rk.z, rk.yaw);
    group.add(rock);
  }

  // 6. INSTANCED FOREST TREES, COASTAL PALMS & BELL-MÈRE'S TANGERINE GROVE WITH ORANGES
  const jungleTrees = CONOMI_TREES.filter((t) => t.kind === 'jungle');
  const palmTrees = CONOMI_TREES.filter((t) => t.kind === 'palm');
  const tangerineTrees = CONOMI_TREES.filter((t) => t.kind === 'tangerine');

  const leafMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.02 })
  );

  if (jungleTrees.length > 0) {
    const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.24, 1.3, 7));
    trunkGeo.translate(0, 0.65, 0);
    const crownMainGeo = trackGeo(new THREE.IcosahedronGeometry(0.98, 1));
    crownMainGeo.translate(0, 1.95, 0);
    const crownSideGeo = trackGeo(new THREE.IcosahedronGeometry(0.75, 1));
    crownSideGeo.translate(0.52, 1.72, 0.3);

    const tInst = new THREE.InstancedMesh(trunkGeo, timberMat, jungleTrees.length);
    const c1Inst = new THREE.InstancedMesh(crownMainGeo, leafMat, jungleTrees.length);
    const c2Inst = new THREE.InstancedMesh(crownSideGeo, leafMat, jungleTrees.length);

    jungleTrees.forEach((t, idx) => {
      const sp = toConomiSphereLocal(t.x, t.y, t.z, globeRadius);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
      _tiltQuat.setFromUnitVectors(_up, _localNormal);
      _yawQuat.setFromAxisAngle(_yAxis, (t.x * 0.6 + t.z * 0.4) % (Math.PI * 2));
      _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
      _dummy.scale.setScalar(S * t.scale);
      _dummy.updateMatrix();
      tInst.setMatrixAt(idx, _dummy.matrix);
      c1Inst.setMatrixAt(idx, _dummy.matrix);
      c2Inst.setMatrixAt(idx, _dummy.matrix);

      _tmpColor.setRGB(0.16 * t.tint, 0.56 * t.tint, 0.21 * t.tint);
      c1Inst.setColorAt(idx, _tmpColor);
      _tmpColor.setRGB(0.12 * t.tint, 0.47 * t.tint, 0.17 * t.tint);
      c2Inst.setColorAt(idx, _tmpColor);
    });
    tInst.instanceMatrix.needsUpdate = true;
    c1Inst.instanceMatrix.needsUpdate = true;
    c2Inst.instanceMatrix.needsUpdate = true;
    if (c1Inst.instanceColor) c1Inst.instanceColor.needsUpdate = true;
    if (c2Inst.instanceColor) c2Inst.instanceColor.needsUpdate = true;
    group.add(tInst, c1Inst, c2Inst);
  }

  if (palmTrees.length > 0) {
    const pTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.19, 2.4, 7));
    pTrunkGeo.translate(0, 1.2, 0);
    const pFrondGeo = trackGeo(createPalmFrondCanopyGeo());

    const ptInst = new THREE.InstancedMesh(pTrunkGeo, timberMat, palmTrees.length);
    const pfInst = new THREE.InstancedMesh(pFrondGeo, leafMat, palmTrees.length);

    palmTrees.forEach((t, idx) => {
      const sp = toConomiSphereLocal(t.x, t.y, t.z, globeRadius);
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
    group.add(ptInst, pfInst);
  }

  if (tangerineTrees.length > 0) {
    const mTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.12, 0.18, 1.1, 7));
    mTrunkGeo.translate(0, 0.55, 0);
    const mCrownGeo = trackGeo(new THREE.IcosahedronGeometry(0.95, 1));
    mCrownGeo.translate(0, 1.65, 0);
    const mFruitGeo = trackGeo(new THREE.SphereGeometry(0.14, 6, 6));
    const orangeFruitMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff8c1a,
        emissive: 0xb44300,
        emissiveIntensity: 0.2,
        roughness: 0.55,
      })
    );

    const mtInst = new THREE.InstancedMesh(mTrunkGeo, timberMat, tangerineTrees.length);
    const mcInst = new THREE.InstancedMesh(mCrownGeo, leafMat, tangerineTrees.length);
    const fruitCount = tangerineTrees.length * 4;
    const mfInst = new THREE.InstancedMesh(mFruitGeo, orangeFruitMat, fruitCount);

    const fruitOffsets: readonly [number, number, number][] = [
      [0.62, 1.52, 0.42],
      [-0.58, 1.7, 0.48],
      [0.32, 1.88, -0.58],
      [-0.45, 1.48, -0.52],
    ];

    tangerineTrees.forEach((t, idx) => {
      const sp = toConomiSphereLocal(t.x, t.y, t.z, globeRadius);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
      _tiltQuat.setFromUnitVectors(_up, _localNormal);
      _yawQuat.setFromAxisAngle(_yAxis, idx * 0.9);
      _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
      _dummy.scale.setScalar(S * t.scale);
      _dummy.updateMatrix();
      mtInst.setMatrixAt(idx, _dummy.matrix);
      mcInst.setMatrixAt(idx, _dummy.matrix);
      _tmpColor.setRGB(0.2 * t.tint, 0.64 * t.tint, 0.2 * t.tint);
      mcInst.setColorAt(idx, _tmpColor);

      fruitOffsets.forEach(([fx, fy, fz], fi) => {
        const fsp = toConomiSphereLocal(
          t.x + fx * t.scale,
          t.y + fy * t.scale,
          t.z + fz * t.scale,
          globeRadius
        );
        _dummy.position.set(fsp.x, fsp.y, fsp.z);
        _dummy.scale.setScalar(S * t.scale);
        _dummy.updateMatrix();
        mfInst.setMatrixAt(idx * 4 + fi, _dummy.matrix);
      });
    });

    mtInst.instanceMatrix.needsUpdate = true;
    mcInst.instanceMatrix.needsUpdate = true;
    mfInst.instanceMatrix.needsUpdate = true;
    if (mcInst.instanceColor) mcInst.instanceColor.needsUpdate = true;
    group.add(mtInst, mcInst, mfInst);
  }

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      if (arlongWaterMesh) {
        poolWaterMat.emissiveIntensity = 0.28 + Math.sin(elapsed * 2.4) * 0.1;
      }
    },
  };
}
