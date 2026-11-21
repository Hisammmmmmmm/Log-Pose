import * as THREE from 'three';
import {
  LOGUETOWN_BUILDINGS,
  LOGUETOWN_COURTYARD_Y,
  LOGUETOWN_DOCKED_SHIPS,
  LOGUETOWN_GLOBE_SCALE,
  LOGUETOWN_LANDMARKS,
  LOGUETOWN_PIERS,
  LOGUETOWN_QUAY_Y,
  LOGUETOWN_TOWN_Y,
  LOGUETOWN_TREES,
  LOGUETOWN_WALL_SEGMENTS,
  LOGUETOWN_WORLD_SIZE,
  isOnLoguetownPlaza,
  isOnLoguetownQuayOrPier,
  loguetownRoadSignedDist,
  sampleLoguetownHeight,
  toLoguetownSphereLocal,
} from '../utils/loguetownTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = LOGUETOWN_GLOBE_SCALE;
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

function createLoguetownTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = LOGUETOWN_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * LOGUETOWN_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * LOGUETOWN_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const h = sampleLoguetownHeight(x, z);
      const hx = sampleLoguetownHeight(x + 0.85, z);
      const hz = sampleLoguetownHeight(x, z + 0.85);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 1.4, 0, 1);
      const fineNoise = (valueNoise2D(x * 1.4, z * 1.4) - 0.5) * 12;

      let rgb: [number, number, number] = [28, 128, 168];
      let alpha = 0;

      if (h < -0.18) {
        // Keep submerged skirt invisible so the 3D globe ocean meets clean beach sand without vertical surf streaks
        const fade = smoothstep(-0.42, -0.18, h);
        rgb = [182, 162, 118];
        alpha = fade;
      } else {
        alpha = 1;
        // Coastal wet-to-dry beach sand transitioning to lush meadow green
        const wetToDry = smoothstep(-0.18, 0.25, h);
        const sandColor = mixRgb([188, 168, 122], [224, 202, 148], wetToDry);
        const sandToGrass = smoothstep(0.32, 1.32, h);
        rgb = mixRgb(sandColor, [102, 164, 72], sandToGrass);

        // Northern plateau grassy alpine tint + forest moss mottling
        if (h > 14.5) {
          const moss = valueNoise2D(x * 0.14 + 3.1, z * 0.14 + 8.4);
          rgb = mixRgb([96, 154, 66], [68, 122, 48], moss);
        }

        // Steep cliff faces & rocky mountain slopes (warm striated brown-tan rock)
        const isNorthCliffSide = z < -28 && h > 4.2 && slope > 0.24;
        if (slope > 0.32 || isNorthCliffSide) {
          const cliffT = smoothstep(0.24, 0.62, Math.max(slope, isNorthCliffSide ? 0.55 : 0));
          const strata = Math.sin(h * 2.4 + x * 0.15) * 12;
          rgb = mixRgb(rgb, [166 + strata, 134 + strata * 0.8, 104 + strata * 0.6], cliffT);
        }

        // Urban interior soil/garden green base inside city elevation
        if (h >= 2.8 && z > -35 && slope < 0.28) {
          rgb = mixRgb(rgb, [98, 158, 70], 0.82);
        }

        // Harbor Quays & Piers dressed stone deck
        if (isOnLoguetownQuayOrPier(x, z)) {
          const tile = ((Math.floor(x * 1.4) + Math.floor(z * 1.4)) & 1) === 0 ? 5 : -5;
          rgb = [168 + tile, 174 + tile, 182 + tile];
        }

        // Streets, Place de l'Échafaud & NE dirt trail
        const roadD = loguetownRoadSignedDist(x, z);
        if (roadD < 0.45 && (h > 2.4 || x > 38)) {
          const roadT = 1 - smoothstep(-0.2, 0.42, roadD);
          if (x > 40 && z < -15) {
            // Tan dirt footpath climbing to NE Shrine
            const dirtGrain = (valueNoise2D(x * 2.1, z * 2.1) - 0.5) * 16;
            rgb = mixRgb(rgb, [212 + dirtGrain, 182 + dirtGrain, 132 + dirtGrain], roadT * 0.94);
          } else {
            // Cobblestone avenues & Place de l'Échafaud
            const cobble =
              Math.sin(x * 3.8) * Math.sin(z * 3.8) * 6 +
              (valueNoise2D(x * 2.2, z * 2.2) - 0.5) * 8;
            const plazaTone: [number, number, number] = isOnLoguetownPlaza(x, z)
              ? [214 + cobble, 216 + cobble, 218 + cobble]
              : [198 + cobble, 200 + cobble, 202 + cobble];
            const isCurb = roadD > -0.25 && roadD < 0.24;
            rgb = mixRgb(rgb, isCurb ? [232, 230, 224] : plazaTone, roadT * 0.94);
          }
        }

        // Town Hall Courtyard stone floor & green garden quadrant beds
        if (Math.abs(x) < 9.5 && z > -28.5 && z < -15.5) {
          const dRing = Math.hypot(x, z + 22.2);
          const inPlanter = dRing > 2.3 && dRing < 5.6 && Math.abs(x) > 1.2 && Math.abs(z + 22.2) > 1.2;
          if (inPlanter) {
            rgb = [78, 146, 56];
          } else {
            rgb = [212, 214, 210];
          }
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

function createFacadeWindowTexture(
  baseColorHex: number,
  floors = 2,
  cols = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const c = new THREE.Color(baseColorHex);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle plaster grain & horizontal cornice bands
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(0, 0, 256, 10);
  ctx.fillStyle = 'rgba(40,34,28,0.12)';
  ctx.fillRect(0, 224, 256, 32);

  const marginX = 24;
  const stepX = (256 - marginX * 2) / cols;
  const floorH = 210 / floors;

  for (let fl = 0; fl < floors; fl++) {
    const wy = 24 + fl * floorH;
    // Floor divider trim
    ctx.fillStyle = 'rgba(255,252,245,0.45)';
    ctx.fillRect(0, wy - 7, 256, 5);

    for (let col = 0; col < cols; col++) {
      const wx = marginX + col * stepX + stepX * 0.22;
      const ww = stepX * 0.56;
      const wh = floorH * 0.56;

      // Ground floor door in center-ish slot
      if (fl === floors - 1 && col === Math.floor(cols / 2)) {
        ctx.fillStyle = '#5c3c24';
        ctx.fillRect(wx - 2, wy + 4, ww + 4, floorH - 4);
        ctx.strokeStyle = '#efe7d6';
        ctx.lineWidth = 3;
        ctx.strokeRect(wx - 2, wy + 4, ww + 4, floorH - 4);
        continue;
      }

      // Window shutters + dark glass + white frame
      ctx.fillStyle = '#365578';
      ctx.fillRect(wx - 4, wy + 2, 4, wh);
      ctx.fillRect(wx + ww, wy + 2, 4, wh);

      ctx.fillStyle = '#1f2b3a';
      ctx.fillRect(wx, wy + 2, ww, wh);
      ctx.strokeStyle = '#f5efe2';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(wx, wy + 2, ww, wh);
      ctx.beginPath();
      ctx.moveTo(wx + ww * 0.5, wy + 2);
      ctx.lineTo(wx + ww * 0.5, wy + 2 + wh);
      ctx.moveTo(wx, wy + 2 + wh * 0.45);
      ctx.lineTo(wx + ww, wy + 2 + wh * 0.45);
      ctx.stroke();
    }
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
    ctx.fillStyle = y % 32 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
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

function createLoguetownArchSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#d14b78';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#ffd584';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 112);

  ctx.fillStyle = '#fff9ee';
  ctx.font = 'bold 72px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Loguetown', 256, 66);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPitchedRoofGeo(
  width: number,
  depth: number,
  height: number,
  style: 'gable' | 'hip' | 'mansard'
): THREE.BufferGeometry {
  const hw = width * 0.5 + 0.28;
  const hd = depth * 0.5 + 0.28;
  const ridgeHalfW = style === 'gable' ? hw : style === 'hip' ? hw * 0.58 : hw * 0.72;
  const ridgeHalfD = style === 'mansard' ? hd * 0.65 : 0;

  if (style === 'mansard') {
    const verts = new Float32Array([
      // Front slope
      -hw, 0, hd, hw, 0, hd, ridgeHalfW, height, ridgeHalfD,
      -hw, 0, hd, ridgeHalfW, height, ridgeHalfD, -ridgeHalfW, height, ridgeHalfD,
      // Back slope
      hw, 0, -hd, -hw, 0, -hd, -ridgeHalfW, height, -ridgeHalfD,
      hw, 0, -hd, -ridgeHalfW, height, -ridgeHalfD, ridgeHalfW, height, -ridgeHalfD,
      // Left slope
      -hw, 0, -hd, -hw, 0, hd, -ridgeHalfW, height, ridgeHalfD,
      -hw, 0, -hd, -ridgeHalfW, height, ridgeHalfD, -ridgeHalfW, height, -ridgeHalfD,
      // Right slope
      hw, 0, hd, hw, 0, -hd, ridgeHalfW, height, -ridgeHalfD,
      hw, 0, hd, ridgeHalfW, height, -ridgeHalfD, ridgeHalfW, height, ridgeHalfD,
      // Flat top cap
      -ridgeHalfW, height, ridgeHalfD, ridgeHalfW, height, ridgeHalfD, ridgeHalfW, height, -ridgeHalfD,
      -ridgeHalfW, height, ridgeHalfD, ridgeHalfW, height, -ridgeHalfD, -ridgeHalfW, height, -ridgeHalfD,
    ]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    g.computeVertexNormals();
    return g;
  }

  const verts = new Float32Array([
    // Front roof slope
    -hw, 0, hd, hw, 0, hd, ridgeHalfW, height, 0,
    -hw, 0, hd, ridgeHalfW, height, 0, -ridgeHalfW, height, 0,
    // Back roof slope
    hw, 0, -hd, -hw, 0, -hd, -ridgeHalfW, height, 0,
    hw, 0, -hd, -ridgeHalfW, height, 0, ridgeHalfW, height, 0,
    // Left gable/hip triangle
    -hw, 0, -hd, -hw, 0, hd, -ridgeHalfW, height, 0,
    // Right gable/hip triangle
    hw, 0, hd, hw, 0, -hd, ridgeHalfW, height, 0,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
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
  group.name = 'island-loguetown';

  const placeOnSphere = (
    obj: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    yaw = 0
  ) => {
    const sp = toLoguetownSphereLocal(x, y, z, globeRadius);
    obj.position.set(sp.x, sp.y, sp.z);
    _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, yaw);
    obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    obj.scale.multiplyScalar(S);
  };

  // 1. High-resolution sculpted Loguetown Island Terrain + Coastal Lagoon Skirt
  const segs = 160;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(LOGUETOWN_WORLD_SIZE, LOGUETOWN_WORLD_SIZE, segs, segs)
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const posArr = posAttr.array as Float32Array;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posArr[i * 3];
    const z = posArr[i * 3 + 2];
    const h = sampleLoguetownHeight(x, z);
    const sp = toLoguetownSphereLocal(x, h, z, globeRadius);
    posArr[i * 3] = sp.x;
    posArr[i * 3 + 1] = sp.y;
    posArr[i * 3 + 2] = sp.z;
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainTex = regTex(createLoguetownTerrainTexture(1024));
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

  // Shared materials
  const stoneWallMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xaab1ba, roughness: 0.85, metalness: 0.05 })
  );
  const darkStoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6f7782, roughness: 0.88, metalness: 0.06 })
  );
  const whiteStoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.68, metalness: 0.04 })
  );
  const timberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7a4e2c, roughness: 0.82, metalness: 0.06 })
  );
  const ironMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.55, metalness: 0.45 })
  );
  const waterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0369a1,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.15,
    })
  );
  const roofShingleTex = regTex(createRoofShingleTexture());
  const gableGeoCache = new Map<string, THREE.BufferGeometry>();
  const getRoofGeo = (
    w: number,
    d: number,
    h: number,
    style: 'gable' | 'hip' | 'mansard'
  ) => {
    const key = `${w.toFixed(1)}-${d.toFixed(1)}-${h.toFixed(1)}-${style}`;
    let g = gableGeoCache.get(key);
    if (!g) {
      g = trackGeo(createPitchedRoofGeo(w, d, h, style));
      gableGeoCache.set(key, g);
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
          metalness: 0.05,
        })
      );
      roofMatCache.set(color, m);
    }
    return m;
  };

  const facadeMatCache = new Map<string, THREE.MeshStandardMaterial>();
  const getFacadeMat = (color: number, floors = 2, cols = 4) => {
    const key = `${color}-${floors}-${cols}`;
    let m = facadeMatCache.get(key);
    if (!m) {
      const tex = regTex(createFacadeWindowTexture(color, floors, cols));
      m = trackMat(
        new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.78,
          metalness: 0.04,
        })
      );
      facadeMatCache.set(key, m);
    }
    return m;
  };

  // 2. Fortified Perimeter City Walls, Corner Bastions & Harbor Gate Stairs
  const unitBox = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const unitCyl = trackGeo(new THREE.CylinderGeometry(1, 1, 1, 12));

  for (const seg of LOGUETOWN_WALL_SEGMENTS) {
    const dx = seg.bx - seg.ax;
    const dz = seg.bz - seg.az;
    const len = Math.hypot(dx, dz);
    const yaw = -Math.atan2(dz, dx);

    const buildWallSpan = (tStart: number, tEnd: number) => {
      const spanLen = (tEnd - tStart) * len;
      if (spanLen < 0.8) return;
      const tMid = (tStart + tEnd) * 0.5;
      const mx = seg.ax + dx * tMid;
      const mz = seg.az + dz * tMid;
      const wallGroup = new THREE.Group();

      // Main curtain wall rising above town floor and dropping down to seawall base
      const wallBody = new THREE.Mesh(unitBox, stoneWallMat);
      wallBody.scale.set(spanLen, 3.8, 1.35);
      wallBody.position.y = 0.2;
      wallGroup.add(wallBody);

      // Battlement parapet cap & merlons
      const cap = new THREE.Mesh(unitBox, darkStoneMat);
      cap.scale.set(spanLen + 0.1, 0.35, 1.6);
      cap.position.y = 2.2;
      wallGroup.add(cap);

      const merlonCount = Math.max(2, Math.floor(spanLen / 2.2));
      for (let m = 0; m < merlonCount; m++) {
        const mxOff = ((m + 0.5) / merlonCount - 0.5) * spanLen;
        const merlon = new THREE.Mesh(unitBox, stoneWallMat);
        merlon.scale.set(0.95, 0.55, 0.45);
        merlon.position.set(mxOff, 2.65, 0.52);
        wallGroup.add(merlon);
      }

      placeOnSphere(wallGroup, mx, LOGUETOWN_TOWN_Y, mz, yaw);
      group.add(wallGroup);
    };

    if (seg.hasGate && seg.gateT !== undefined && seg.gateHalfWidth !== undefined) {
      const halfT = seg.gateHalfWidth / len;
      buildWallSpan(0, Math.max(0, seg.gateT - halfT));
      buildWallSpan(Math.min(1, seg.gateT + halfT), 1);

      // Gate pillars + stepped stone stairway down to quay/trail
      const gx = seg.ax + dx * seg.gateT;
      const gz = seg.az + dz * seg.gateT;
      const gateGroup = new THREE.Group();
      for (const side of [-1, 1]) {
        const pillar = new THREE.Mesh(unitBox, darkStoneMat);
        pillar.scale.set(1.3, 4.4, 1.7);
        pillar.position.set(side * (seg.gateHalfWidth + 0.5), 0.6, 0);
        gateGroup.add(pillar);
      }
      // Stone steps + side parapet cheek walls descending cleanly to quay/trail
      for (let s = 0; s < 6; s++) {
        const step = new THREE.Mesh(unitBox, stoneWallMat);
        step.scale.set(seg.gateHalfWidth * 1.95, 0.42, 0.92);
        step.position.set(0, -0.18 - s * 0.28, 0.75 + s * 0.72);
        gateGroup.add(step);
      }
      for (const side of [-1, 1]) {
        const cheek = new THREE.Mesh(unitBox, darkStoneMat);
        cheek.scale.set(0.55, 1.95, 4.6);
        cheek.position.set(side * (seg.gateHalfWidth + 0.15), -0.65, 2.55);
        gateGroup.add(cheek);
      }
      placeOnSphere(gateGroup, gx, LOGUETOWN_TOWN_Y, gz, yaw);
      group.add(gateGroup);
    } else {
      buildWallSpan(0, 1);
    }

    // Corner cylindrical bastion turret at segment start
    const bastion = new THREE.Mesh(unitCyl, stoneWallMat);
    bastion.scale.set(1.35, 4.5, 1.35);
    placeOnSphere(bastion, seg.ax, LOGUETOWN_TOWN_Y + 0.4, seg.az, 0);
    group.add(bastion);
  }

  // West Garrison Internal Archway Wall (x = -41, z from -16.5 to +13.5, archway at z = -2.5)
  for (const [zA, zB] of [
    [-16.5, -5.8],
    [0.8, 13.5],
  ]) {
    const span = zB - zA;
    const gw = new THREE.Mesh(unitBox, stoneWallMat);
    gw.scale.set(0.95, 3.4, span);
    placeOnSphere(gw, -41, LOGUETOWN_TOWN_Y + 1.55, (zA + zB) * 0.5, 0);
    group.add(gw);
  }
  for (const pz of [-5.8, 0.8]) {
    const gatePillar = new THREE.Mesh(unitBox, darkStoneMat);
    gatePillar.scale.set(1.28, 4.1, 1.28);
    placeOnSphere(gatePillar, -41, LOGUETOWN_TOWN_Y + 1.9, pz, 0);
    group.add(gatePillar);
  }
  const westArchLintel = new THREE.Mesh(unitBox, darkStoneMat);
  westArchLintel.scale.set(1.2, 0.85, 7.8);
  placeOnSphere(westArchLintel, -41, LOGUETOWN_TOWN_Y + 3.65, -2.5, 0);
  group.add(westArchLintel);

  // 3. Harbor Quays Pilings & 6 Long Piers + Mooring Bollards
  for (const pier of LOGUETOWN_PIERS) {
    const pGroup = new THREE.Group();
    const deck = new THREE.Mesh(unitBox, stoneWallMat);
    deck.scale.set(pier.width, 0.55, pier.length);
    deck.position.y = -0.1;
    pGroup.add(deck);

    // Trim curb rails + timber bollards
    const curbL = new THREE.Mesh(unitBox, darkStoneMat);
    curbL.scale.set(0.32, 0.25, pier.length);
    curbL.position.set(-pier.width * 0.46, 0.24, 0);
    const curbR = curbL.clone();
    curbR.position.x = pier.width * 0.46;
    pGroup.add(curbL, curbR);

    const numPilings = Math.max(3, Math.floor(pier.length / 4.2));
    for (let i = 0; i < numPilings; i++) {
      const pz = ((i + 0.5) / numPilings - 0.5) * (pier.length - 1.5);
      for (const side of [-1, 1]) {
        const piling = new THREE.Mesh(unitCyl, timberMat);
        piling.scale.set(0.24, 2.4, 0.24);
        piling.position.set(side * (pier.width * 0.44), -0.9, pz);
        pGroup.add(piling);
        const bollard = new THREE.Mesh(unitCyl, timberMat);
        bollard.scale.set(0.22, 0.48, 0.22);
        bollard.position.set(side * (pier.width * 0.42), 0.42, pz);
        pGroup.add(bollard);
      }
    }

    placeOnSphere(pGroup, pier.x, LOGUETOWN_QUAY_Y, pier.z, pier.yaw);
    group.add(pGroup);
  }

  // 4. Docked Wooden Sailing Ships beside Harbor Quays
  const sailMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf7f1e1, roughness: 0.72, metalness: 0.02 })
  );
  const hullMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6b3e22, roughness: 0.78, metalness: 0.06 })
  );
  for (const ship of LOGUETOWN_DOCKED_SHIPS) {
    const sGroup = new THREE.Group();
    const hull = new THREE.Mesh(unitBox, hullMat);
    hull.scale.set(1.9, 1.0, 5.2);
    hull.position.y = 0.2;
    const bow = new THREE.Mesh(unitCyl, hullMat);
    bow.scale.set(0.95, 1.0, 0.95);
    bow.position.set(0, 0.2, 2.6);
    const deck = new THREE.Mesh(unitBox, timberMat);
    deck.scale.set(1.65, 0.18, 4.8);
    deck.position.y = 0.72;
    const bowsprit = new THREE.Mesh(unitCyl, timberMat);
    bowsprit.scale.set(0.08, 2.4, 0.08);
    bowsprit.rotation.x = Math.PI * 0.36;
    bowsprit.position.set(0, 1.0, 3.6);
    sGroup.add(hull, bow, deck, bowsprit);

    for (const [mz, mh] of [
      [-1.1, 4.2],
      [1.0, 4.9],
    ]) {
      const mast = new THREE.Mesh(unitCyl, timberMat);
      mast.scale.set(0.09, mh, 0.09);
      mast.position.set(0, 0.7 + mh * 0.5, mz);
      const yard = new THREE.Mesh(unitCyl, timberMat);
      yard.scale.set(0.06, 2.3, 0.06);
      yard.rotation.z = Math.PI * 0.5;
      yard.position.set(0, 0.7 + mh * 0.65, mz);
      const furledSail = new THREE.Mesh(unitBox, sailMat);
      furledSail.scale.set(2.1, 0.42, 0.42);
      furledSail.position.set(0, 0.7 + mh * 0.62, mz + 0.15);
      sGroup.add(mast, yard, furledSail);
    }

    placeOnSphere(sGroup, ship.x, 0.15, ship.z, ship.yaw);
    sGroup.scale.multiplyScalar(ship.scale);
    group.add(sGroup);
  }

  // 5. ICONIC HERO LANDMARKS
  // 5A. PLACE DE L'ÉCHAFAUD — THE EXECUTION SCAFFOLD (L'Échafaud)
  {
    const scGroup = new THREE.Group();
    const legSpan = 1.45;
    const scHeight = 4.6;

    // 4 heavy corner posts
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(unitBox, ironMat);
        post.scale.set(0.22, scHeight + 1.35, 0.22);
        post.position.set(sx * legSpan, (scHeight + 1.35) * 0.5, sz * legSpan);
        scGroup.add(post);
      }
    }

    // Horizontal tier beams & diagonal X-bracing on 4 faces (matching close-up truss)
    for (const ty of [1.4, 2.9, scHeight]) {
      for (const sz of [-1, 1]) {
        const barX = new THREE.Mesh(unitBox, ironMat);
        barX.scale.set(legSpan * 2.05, 0.16, 0.16);
        barX.position.set(0, ty, sz * legSpan);
        scGroup.add(barX);
      }
      for (const sx of [-1, 1]) {
        const barZ = new THREE.Mesh(unitBox, ironMat);
        barZ.scale.set(0.16, 0.16, legSpan * 2.05);
        barZ.position.set(sx * legSpan, ty, 0);
        scGroup.add(barZ);
      }
    }

    const diagLen = Math.hypot(legSpan * 2, 1.5);
    const diagAng = Math.atan2(1.5, legSpan * 2);
    for (const baseY of [0.75, 2.2, 3.7]) {
      for (const sz of [-1, 1]) {
        for (const dir of [-1, 1]) {
          const brace = new THREE.Mesh(unitBox, ironMat);
          brace.scale.set(diagLen, 0.1, 0.1);
          brace.position.set(0, baseY, sz * legSpan);
          brace.rotation.z = dir * diagAng;
          scGroup.add(brace);
        }
      }
      for (const sx of [-1, 1]) {
        for (const dir of [-1, 1]) {
          const brace = new THREE.Mesh(unitBox, ironMat);
          brace.scale.set(0.1, 0.1, diagLen);
          brace.position.set(sx * legSpan, baseY, 0);
          brace.rotation.x = dir * diagAng;
          scGroup.add(brace);
        }
      }
    }

    // Wooden scaffold plank deck + top safety rails + rear access stairs
    const deck = new THREE.Mesh(unitBox, getRoofMat(0xd49a45));
    deck.scale.set(legSpan * 2.28, 0.28, legSpan * 2.28);
    deck.position.y = scHeight + 0.1;
    scGroup.add(deck);

    for (const sz of [-1, 1]) {
      const rail = new THREE.Mesh(unitBox, timberMat);
      rail.scale.set(legSpan * 2.15, 0.12, 0.12);
      rail.position.set(0, scHeight + 1.15, sz * legSpan);
      scGroup.add(rail);
    }
    for (const sx of [-1, 1]) {
      const rail = new THREE.Mesh(unitBox, timberMat);
      rail.scale.set(0.12, 0.12, legSpan * 2.15);
      rail.position.set(sx * legSpan, scHeight + 1.15, 0);
      scGroup.add(rail);
    }

    // Access ladder/stairs neatly tucked on back-right corner facing Town Hall
    const ladder = new THREE.Mesh(unitBox, timberMat);
    ladder.scale.set(0.52, scHeight + 0.35, 0.14);
    ladder.position.set(0.95, scHeight * 0.5, -legSpan - 0.35);
    ladder.rotation.x = 0.2;
    scGroup.add(ladder);

    placeOnSphere(
      scGroup,
      LOGUETOWN_LANDMARKS.scaffold.x,
      LOGUETOWN_LANDMARKS.scaffold.y,
      LOGUETOWN_LANDMARKS.scaffold.z,
      0
    );
    group.add(scGroup);
  }

  // 5B. NEOCLASSICAL TOWN HALL / COURTHOUSE + FORMAL NORTH COURTYARD FOUNTAIN
  {
    const thGroup = new THREE.Group();
    const thFacadeMat = getFacadeMat(0xf8f0d8, 2, 6);
    const thOchreMat = getFacadeMat(0xd98c44, 1, 6);
    const blueMansardMat = getRoofMat(0x1f4f94);
    const orangeRoofMat = getRoofMat(0xd4562a);

    // Main central neoclassical hall
    const body = new THREE.Mesh(unitBox, thFacadeMat);
    body.scale.set(15.6, 5.2, 5.4);
    body.position.set(0, 2.6, 0);
    thGroup.add(body);

    // Ground-floor warm ochre arcade band
    const lowerBand = new THREE.Mesh(unitBox, thOchreMat);
    lowerBand.scale.set(15.8, 2.1, 5.55);
    lowerBand.position.set(0, 1.05, 0);
    thGroup.add(lowerBand);

    // Central projecting front portico + 6 white columns + upper balcony + triangular pediment
    const balcony = new THREE.Mesh(unitBox, whiteStoneMat);
    balcony.scale.set(6.8, 0.35, 2.1);
    balcony.position.set(0, 2.35, 3.2);
    const balconyRail = new THREE.Mesh(unitBox, whiteStoneMat);
    balconyRail.scale.set(6.8, 0.55, 0.25);
    balconyRail.position.set(0, 2.75, 4.15);
    const upperEntablature = new THREE.Mesh(unitBox, whiteStoneMat);
    upperEntablature.scale.set(6.8, 0.45, 2.1);
    upperEntablature.position.set(0, 5.1, 3.2);
    thGroup.add(balcony, balconyRail, upperEntablature);

    for (const cx of [-2.8, -1.7, -0.6, 0.6, 1.7, 2.8]) {
      const colLow = new THREE.Mesh(unitCyl, whiteStoneMat);
      colLow.scale.set(0.22, 2.2, 0.22);
      colLow.position.set(cx, 1.1, 3.85);
      thGroup.add(colLow);
      if (Math.abs(cx) > 1.2 || Math.abs(cx) < 0.8) {
        const colHigh = new THREE.Mesh(unitCyl, whiteStoneMat);
        colHigh.scale.set(0.2, 2.45, 0.2);
        colHigh.position.set(cx, 3.7, 3.85);
        thGroup.add(colHigh);
      }
    }

    const pediment = new THREE.Mesh(
      getRoofGeo(2.4, 6.8, 1.45, 'gable'),
      whiteStoneMat
    );
    pediment.rotation.y = Math.PI * 0.5;
    pediment.position.set(0, 5.3, 3.0);
    thGroup.add(pediment);

    // Cobalt-blue mansard roof + dormer accents
    const roof = new THREE.Mesh(
      getRoofGeo(15.6, 5.4, 2.2, 'mansard'),
      blueMansardMat
    );
    roof.position.set(0, 5.2, 0);
    thGroup.add(roof);

    // Twin side wing pavilions framing the courtyard entrance
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(unitBox, thFacadeMat);
      wing.scale.set(4.2, 4.5, 4.4);
      wing.position.set(sx * 9.8, 2.25, 0.2);
      const wingRoof = new THREE.Mesh(
        getRoofGeo(4.2, 4.4, 1.7, 'hip'),
        orangeRoofMat
      );
      wingRoof.position.set(sx * 9.8, 4.5, 0.2);
      thGroup.add(wing, wingRoof);
    }

    placeOnSphere(
      thGroup,
      LOGUETOWN_LANDMARKS.townHall.x,
      LOGUETOWN_LANDMARKS.townHall.y,
      LOGUETOWN_LANDMARKS.townHall.z,
      0
    );
    group.add(thGroup);

    // North Courtyard Circular Fountain
    const cfGroup = new THREE.Group();
    const cfRim = new THREE.Mesh(unitCyl, whiteStoneMat);
    cfRim.scale.set(2.1, 0.55, 2.1);
    cfRim.position.y = 0.25;
    const cfWater = new THREE.Mesh(unitCyl, waterMat);
    cfWater.scale.set(1.75, 0.45, 1.75);
    cfWater.position.y = 0.35;
    const cfPed = new THREE.Mesh(unitCyl, whiteStoneMat);
    cfPed.scale.set(0.45, 1.4, 0.45);
    cfPed.position.y = 0.7;
    cfGroup.add(cfRim, cfWater, cfPed);
    placeOnSphere(
      cfGroup,
      LOGUETOWN_LANDMARKS.northCourtyardFountain.x,
      LOGUETOWN_COURTYARD_Y,
      LOGUETOWN_LANDMARKS.northCourtyardFountain.z,
      0
    );
    group.add(cfGroup);
  }

  // 5C. ORNATE TIERED FOUNTAIN ON PLACE DE L'ÉCHAFAUD
  let fountainSpray: THREE.Mesh | null = null;
  {
    const fGroup = new THREE.Group();
    const outerBasin = new THREE.Mesh(unitCyl, whiteStoneMat);
    outerBasin.scale.set(2.1, 0.52, 2.1);
    outerBasin.position.y = 0.26;
    const basinWater = new THREE.Mesh(unitCyl, waterMat);
    basinWater.scale.set(1.82, 0.44, 1.82);
    basinWater.position.y = 0.34;
    const pillar = new THREE.Mesh(unitCyl, whiteStoneMat);
    pillar.scale.set(0.42, 2.1, 0.42);
    pillar.position.y = 1.05;
    const midBowl = new THREE.Mesh(unitCyl, whiteStoneMat);
    midBowl.scale.set(1.05, 0.28, 1.05);
    midBowl.position.y = 1.45;
    const topBowl = new THREE.Mesh(unitCyl, whiteStoneMat);
    topBowl.scale.set(0.58, 0.22, 0.58);
    topBowl.position.y = 2.05;
    fountainSpray = new THREE.Mesh(unitCyl, waterMat);
    fountainSpray.scale.set(0.24, 0.75, 0.24);
    fountainSpray.position.y = 2.45;
    fGroup.add(outerBasin, basinWater, pillar, midBowl, topBowl, fountainSpray);
    placeOnSphere(
      fGroup,
      LOGUETOWN_LANDMARKS.plazaFountain.x,
      LOGUETOWN_LANDMARKS.plazaFountain.y,
      LOGUETOWN_LANDMARKS.plazaFountain.z,
      0
    );
    group.add(fGroup);
  }

  // 5D. DOMED CATHEDRAL / BASILICA (NE of Plaza, ribbed orange & white dome)
  {
    const catGroup = new THREE.Group();
    const catWallMat = getFacadeMat(0xfaf8f2);
    const catOrangeMat = getRoofMat(0xd95628);

    // Main nave
    const nave = new THREE.Mesh(unitBox, catWallMat);
    nave.scale.set(8.6, 6.0, 10.4);
    nave.position.y = 3.0;
    const naveRoof = new THREE.Mesh(
      getRoofGeo(8.6, 10.4, 2.0, 'gable'),
      catOrangeMat
    );
    naveRoof.position.y = 6.0;
    catGroup.add(nave, naveRoof);

    // Tall central octagonal drum + ribbed terracotta dome
    const drum = new THREE.Mesh(unitCyl, whiteStoneMat);
    drum.scale.set(3.4, 3.2, 3.4);
    drum.position.set(0, 7.4, -0.5);
    const domeGeo = trackGeo(
      new THREE.SphereGeometry(3.45, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52)
    );
    const dome = new THREE.Mesh(domeGeo, catOrangeMat);
    dome.position.set(0, 8.9, -0.5);
    // Smooth curved white meridian dome ribs hugging the terracotta dome
    const ribArcGeo = trackGeo(new THREE.TorusGeometry(3.47, 0.11, 6, 18, Math.PI));
    for (let r = 0; r < 4; r++) {
      const rib = new THREE.Mesh(ribArcGeo, whiteStoneMat);
      rib.position.set(0, 8.9, -0.5);
      rib.rotation.y = (r / 4) * Math.PI;
      catGroup.add(rib);
    }
    const lantern = new THREE.Mesh(unitCyl, whiteStoneMat);
    lantern.scale.set(0.65, 1.4, 0.65);
    lantern.position.set(0, 12.6, -0.5);
    const spire = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.75, 1.6, 8)),
      catOrangeMat
    );
    spire.position.set(0, 14.0, -0.5);
    catGroup.add(drum, dome, lantern, spire);

    // Front apse chapel dome facing square
    const apse = new THREE.Mesh(unitCyl, whiteStoneMat);
    apse.scale.set(2.3, 4.4, 2.3);
    apse.position.set(0, 2.2, 5.2);
    const apseDome = new THREE.Mesh(domeGeo, catOrangeMat);
    apseDome.scale.setScalar(0.66);
    apseDome.position.set(0, 4.4, 5.2);
    catGroup.add(apse, apseDome);

    placeOnSphere(
      catGroup,
      LOGUETOWN_LANDMARKS.cathedral.x,
      LOGUETOWN_LANDMARKS.cathedral.y,
      LOGUETOWN_LANDMARKS.cathedral.z,
      -0.28
    );
    group.add(catGroup);
  }

  // 5E. SQUARE BRICK WATCHTOWER & CRENELLATED BASTION (Central South Plaza Edge)
  {
    const wtGroup = new THREE.Group();
    const brickMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xb56445, roughness: 0.84, metalness: 0.04 })
    );
    const redSpireMat = getRoofMat(0xc9422b);

    // Lower crenellated annex
    const annex = new THREE.Mesh(unitBox, brickMat);
    annex.scale.set(4.8, 3.4, 4.2);
    annex.position.set(-1.6, 1.7, 0.4);
    const annexRim = new THREE.Mesh(unitBox, whiteStoneMat);
    annexRim.scale.set(5.0, 0.3, 4.4);
    annexRim.position.set(-1.6, 3.45, 0.4);
    wtGroup.add(annex, annexRim);

    // Tall square watchtower shaft
    const shaft = new THREE.Mesh(unitBox, brickMat);
    shaft.scale.set(3.1, 7.0, 3.1);
    shaft.position.set(1.2, 3.5, 0);
    const cornice = new THREE.Mesh(unitBox, whiteStoneMat);
    cornice.scale.set(3.5, 0.42, 3.5);
    cornice.position.set(1.2, 7.0, 0);
    const spire = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(2.45, 2.6, 4)),
      redSpireMat
    );
    spire.rotation.y = Math.PI * 0.25;
    spire.position.set(1.2, 8.5, 0);
    wtGroup.add(shaft, cornice, spire);

    placeOnSphere(
      wtGroup,
      LOGUETOWN_LANDMARKS.watchtower.x,
      LOGUETOWN_LANDMARKS.watchtower.y,
      LOGUETOWN_LANDMARKS.watchtower.z,
      0
    );
    group.add(wtGroup);
  }

  // 5F. PINK "LOGUETOWN" ENTRANCE ARCHWAY (Spanning SE Avenue)
  {
    const archGroup = new THREE.Group();
    const pinkMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xd14b78, roughness: 0.58, metalness: 0.08 })
    );
    const signTex = regTex(createLoguetownArchSignTexture());
    const signMat = trackMat(
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5, metalness: 0.05 })
    );

    const spanW = 7.4;
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(unitBox, pinkMat);
      leg.scale.set(0.65, 4.2, 0.65);
      leg.position.set(sx * (spanW * 0.5), 2.1, 0);
      const brace = new THREE.Mesh(unitBox, pinkMat);
      brace.scale.set(0.45, 1.8, 0.45);
      brace.position.set(sx * (spanW * 0.42), 3.6, 0);
      brace.rotation.z = sx * 0.55;
      archGroup.add(leg, brace);
    }

    const crossbar = new THREE.Mesh(unitBox, pinkMat);
    crossbar.scale.set(spanW + 0.8, 1.35, 0.65);
    crossbar.position.set(0, 4.45, 0);
    archGroup.add(crossbar);

    const signGeo = trackGeo(new THREE.PlaneGeometry(spanW - 0.6, 1.15));
    const signFront = new THREE.Mesh(signGeo, signMat);
    signFront.position.set(0, 4.45, 0.34);
    const signBack = new THREE.Mesh(signGeo, signMat);
    signBack.rotation.y = Math.PI;
    signBack.position.set(0, 4.45, -0.34);
    archGroup.add(signFront, signBack);

    placeOnSphere(
      archGroup,
      LOGUETOWN_LANDMARKS.loguetownArch.x,
      LOGUETOWN_LANDMARKS.loguetownArch.y,
      LOGUETOWN_LANDMARKS.loguetownArch.z,
      LOGUETOWN_LANDMARKS.loguetownArch.yaw
    );
    group.add(archGroup);
  }

  // 5G. TWIN BLUE-ROOFED PORT WAREHOUSES + CARGO CRATES & BARRELS
  {
    const whWallMat = getFacadeMat(0xf5f0e2);
    const whRoofMat = getRoofMat(0x1f477a);
    const crateMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xc28645, roughness: 0.84, metalness: 0.04 })
    );

    for (const wh of [
      LOGUETOWN_LANDMARKS.warehouseWest,
      LOGUETOWN_LANDMARKS.warehouseEast,
    ]) {
      const whGroup = new THREE.Group();
      const body = new THREE.Mesh(unitBox, whWallMat);
      body.scale.set(7.4, 3.6, 5.4);
      body.position.y = 1.8;
      const roof = new THREE.Mesh(
        getRoofGeo(7.4, 5.4, 1.85, 'gable'),
        whRoofMat
      );
      roof.position.y = 3.6;
      const cargoDoor = new THREE.Mesh(unitBox, timberMat);
      cargoDoor.scale.set(2.8, 2.2, 0.25);
      cargoDoor.position.set(0, 1.1, 2.72);
      const hoist = new THREE.Mesh(unitBox, timberMat);
      hoist.scale.set(0.24, 0.24, 1.4);
      hoist.position.set(0, 4.2, 2.8);
      whGroup.add(body, roof, cargoDoor, hoist);

      // Stacks of port crates & barrels beside cargo doors
      for (const [cx, cy, cz, cs] of [
        [-2.8, 0.32, 3.2, 0.62],
        [-2.1, 0.32, 3.2, 0.58],
        [-2.45, 0.88, 3.2, 0.52],
        [2.7, 0.32, 3.1, 0.62],
      ]) {
        const crate = new THREE.Mesh(unitBox, crateMat);
        crate.scale.setScalar(cs);
        crate.position.set(cx, cy, cz);
        whGroup.add(crate);
      }

      placeOnSphere(whGroup, wh.x, wh.y, wh.z, 0.04);
      group.add(whGroup);
    }
  }

  // 5H. SW STONE LIGHTHOUSE (PHARE) WITH GLOWING LANTERN
  let lighthouseBeaconMat: THREE.MeshStandardMaterial | null = null;
  {
    const lhGroup = new THREE.Group();
    const towerGeo = trackGeo(new THREE.CylinderGeometry(1.18, 1.68, 7.6, 16));
    const tower = new THREE.Mesh(towerGeo, stoneWallMat);
    tower.position.y = 3.8;
    const gallery = new THREE.Mesh(unitCyl, darkStoneMat);
    gallery.scale.set(1.48, 0.35, 1.48);
    gallery.position.y = 7.7;

    lighthouseBeaconMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffe49e,
        emissive: 0xffb347,
        emissiveIntensity: 1.4,
        roughness: 0.25,
      })
    );
    const lantern = new THREE.Mesh(unitCyl, lighthouseBeaconMat);
    lantern.scale.set(0.95, 1.1, 0.95);
    lantern.position.y = 8.4;

    const cone = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.38, 1.85, 16)),
      getRoofMat(0xc9422b)
    );
    cone.position.y = 9.85;
    lhGroup.add(tower, gallery, lantern, cone);

    placeOnSphere(
      lhGroup,
      LOGUETOWN_LANDMARKS.lighthouse.x,
      LOGUETOWN_LANDMARKS.lighthouse.y,
      LOGUETOWN_LANDMARKS.lighthouse.z,
      0
    );
    group.add(lhGroup);
  }

  // 5I. WEST GARRISON CIRCULAR STONE WELL/TOWER + NE HILLTOP RED SHRINE + MARKET STALLS
  {
    const well = new THREE.Mesh(unitCyl, darkStoneMat);
    well.scale.set(2.3, 2.2, 2.3);
    placeOnSphere(
      well,
      LOGUETOWN_LANDMARKS.westWellTower.x,
      LOGUETOWN_LANDMARKS.westWellTower.y + 1.1,
      LOGUETOWN_LANDMARKS.westWellTower.z,
      0
    );
    group.add(well);

    // NE Hilltop Red Shrine
    const shGroup = new THREE.Group();
    const shBase = new THREE.Mesh(unitCyl, stoneWallMat);
    shBase.scale.set(2.5, 0.6, 2.5);
    shBase.position.y = 0.3;
    const shBody = new THREE.Mesh(unitCyl, getRoofMat(0xc43628));
    shBody.scale.set(1.9, 1.6, 1.9);
    shBody.position.y = 1.3;
    const shRoof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(2.65, 1.4, 16)),
      getRoofMat(0x8e241b)
    );
    shRoof.position.y = 2.7;
    shGroup.add(shBase, shBody, shRoof);
    placeOnSphere(
      shGroup,
      LOGUETOWN_LANDMARKS.neShrine.x,
      LOGUETOWN_LANDMARKS.neShrine.y,
      LOGUETOWN_LANDMARKS.neShrine.z,
      0
    );
    group.add(shGroup);

    // Market Stalls on Place de l'Échafaud
    const stalls: readonly [number, number, number, number][] = [
      [-8.5, -5.2, 0.05, 0xe89c28],
      [-7.2, 3.2, 0.25, 0x8b5cf6],
      [12.2, 1.2, -0.15, 0x22a668],
    ];
    for (const [sx, sz, syaw, scol] of stalls) {
      const stGroup = new THREE.Group();
      const table = new THREE.Mesh(unitBox, timberMat);
      table.scale.set(2.4, 0.75, 1.25);
      table.position.y = 0.38;
      const awning = new THREE.Mesh(unitBox, getRoofMat(scol));
      awning.scale.set(2.65, 0.18, 1.55);
      awning.position.y = 1.68;
      awning.rotation.x = 0.14;
      stGroup.add(table, awning);
      for (const px of [-1.12, 1.12]) {
        for (const pz of [-0.55, 0.55]) {
          const post = new THREE.Mesh(unitBox, timberMat);
          post.scale.set(0.1, 1.68, 0.1);
          post.position.set(px, 0.84, pz);
          stGroup.add(post);
        }
      }
      placeOnSphere(stGroup, sx, LOGUETOWN_TOWN_Y, sz, syaw);
      group.add(stGroup);
    }
  }

  // 6. EUROPEAN PORT-TOWN HOUSES (~52 detailed multi-story buildings)
  const chimneyMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xc2b6a3, roughness: 0.85 })
  );
  for (const b of LOGUETOWN_BUILDINGS) {
    const hGroup = new THREE.Group();
    const body = new THREE.Mesh(unitBox, getFacadeMat(b.wallColor));
    body.scale.set(b.width, b.height, b.depth);
    body.position.y = b.height * 0.5;
    hGroup.add(body);

    const roofH = Math.min(2.3, b.depth * 0.42);
    const roof = new THREE.Mesh(
      getRoofGeo(b.width, b.depth, roofH, b.roofStyle),
      getRoofMat(b.roofColor)
    );
    roof.position.y = b.height;
    hGroup.add(roof);

    if (b.hasDormers) {
      const dormer = new THREE.Mesh(unitBox, whiteStoneMat);
      dormer.scale.set(0.85, 0.8, 0.95);
      dormer.position.set(0, b.height + roofH * 0.42, b.depth * 0.25);
      hGroup.add(dormer);
    }
    if (b.hasChimney) {
      const chim = new THREE.Mesh(unitBox, chimneyMat);
      chim.scale.set(0.42, 1.15, 0.42);
      chim.position.set(b.width * 0.28, b.height + roofH * 0.65, -b.depth * 0.15);
      hGroup.add(chim);
    }

    placeOnSphere(hGroup, b.x, b.y, b.z, b.yaw);
    group.add(hGroup);
  }

  // 7. INSTANCED MULTI-PUFF LUSH GREEN TREES ACROSS PLATEAU, SHRINE TRAIL & URBAN GARDENS
  if (LOGUETOWN_TREES.length > 0) {
    const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.24, 1.3, 7));
    trunkGeo.translate(0, 0.65, 0);
    const crownMainGeo = trackGeo(new THREE.IcosahedronGeometry(0.98, 1));
    crownMainGeo.translate(0, 1.95, 0);
    const crownSideGeo = trackGeo(new THREE.IcosahedronGeometry(0.76, 1));
    crownSideGeo.translate(0.55, 1.72, 0.32);

    const crownMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, metalness: 0.02 })
    );
    const trunkInst = new THREE.InstancedMesh(trunkGeo, timberMat, LOGUETOWN_TREES.length);
    const crownMainInst = new THREE.InstancedMesh(crownMainGeo, crownMat, LOGUETOWN_TREES.length);
    const crownSideInst = new THREE.InstancedMesh(crownSideGeo, crownMat, LOGUETOWN_TREES.length);

    LOGUETOWN_TREES.forEach((t, idx) => {
      const sp = toLoguetownSphereLocal(t.x, t.y, t.z, globeRadius);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
      _tiltQuat.setFromUnitVectors(_up, _localNormal);
      _yawQuat.setFromAxisAngle(_yAxis, (t.x * 0.7 + t.z * 0.4) % (Math.PI * 2));
      _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
      _dummy.scale.setScalar(S * t.scale);
      _dummy.updateMatrix();
      trunkInst.setMatrixAt(idx, _dummy.matrix);
      crownMainInst.setMatrixAt(idx, _dummy.matrix);
      crownSideInst.setMatrixAt(idx, _dummy.matrix);

      _tmpColor.setRGB(0.18 * t.tint, 0.56 * t.tint, 0.22 * t.tint);
      crownMainInst.setColorAt(idx, _tmpColor);
      _tmpColor.setRGB(0.14 * t.tint, 0.48 * t.tint, 0.18 * t.tint);
      crownSideInst.setColorAt(idx, _tmpColor);
    });
    trunkInst.instanceMatrix.needsUpdate = true;
    crownMainInst.instanceMatrix.needsUpdate = true;
    crownSideInst.instanceMatrix.needsUpdate = true;
    if (crownMainInst.instanceColor) crownMainInst.instanceColor.needsUpdate = true;
    if (crownSideInst.instanceColor) crownSideInst.instanceColor.needsUpdate = true;
    group.add(trunkInst, crownMainInst, crownSideInst);
  }

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      if (fountainSpray) {
        const pulse = 0.85 + Math.sin(elapsed * 4.2) * 0.18;
        fountainSpray.scale.set(0.24 * pulse, 0.75 * pulse, 0.24 * pulse);
      }
      if (lighthouseBeaconMat) {
        lighthouseBeaconMat.emissiveIntensity = 1.25 + Math.sin(elapsed * 2.1) * 0.35;
      }
    },
  };
}
