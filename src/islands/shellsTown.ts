import * as THREE from 'three';
import {
  SHELLS_BASE_Y,
  SHELLS_BUILDINGS,
  SHELLS_GLOBE_SCALE,
  SHELLS_LANDMARKS,
  SHELLS_PIER_Y,
  SHELLS_TREES,
  SHELLS_WORLD_SIZE,
  shellsRoadSignedDist,
  sampleShellsHeight,
  toShellsSphereLocal,
} from '../utils/shellsTownTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = SHELLS_GLOBE_SCALE;
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

function createShellsTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = SHELLS_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * SHELLS_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * SHELLS_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const h = sampleShellsHeight(x, z);
      const hx = sampleShellsHeight(x + 0.85, z);
      const hz = sampleShellsHeight(x, z + 0.85);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 1.15, 0, 1);
      const fineNoise = (valueNoise2D(x * 1.25, z * 1.25) - 0.5) * 10;

      let rgb: [number, number, number] = [232, 212, 158];
      let alpha = 0;

      if (h < -4.35) {
        // Cut out ONLY deep underwater far below ocean facets so zero coastal gaps ever occur
        alpha = smoothstep(-4.85, -4.35, h);
        rgb = [76, 120, 132];
      } else {
        alpha = 1;
        // East Blue greens matching Yotsuba Island hills & coastal terraces
        const elevFactor = smoothstep(2.5, 22.0, h);
        const lushGrass = mixRgb([122, 182, 92], [86, 144, 64], elevFactor);
        const shoalToWet = smoothstep(-3.6, -0.35, h);
        const wetToDry = smoothstep(-0.35, 0.45, h);
        const submergedSand = mixRgb([92, 142, 144], [202, 182, 134], shoalToWet);
        const beachNoise = (valueNoise2D(x * 0.24 + 1.8, z * 0.24 + 5.3) - 0.5) * 0.32;
        const sandColor = mixRgb(submergedSand, [240, 218, 164], wetToDry);
        const sandToGrass = smoothstep(1.25 + beachNoise, 2.35 + beachNoise, h);
        rgb = mixRgb(sandColor, lushGrass, sandToGrass);

        // Tidy lighter lawn inside G-153 fortress compound
        if (x >= -34.5 && x <= 22.5 && z >= -32.5 && z <= 14.5 && h > 9.0) {
          rgb = mixRgb(rgb, [142, 192, 98], 0.72);
        }

        // Pale weathered limestone terraced cliff bands & craggy mountain shoulders
        if ((slope > 0.20 || h > 15.5) && h > 2.8) {
          const slopeT = smoothstep(0.20, 0.46, slope);
          const cragBand = smoothstep(15.5, 23.0, h) * 0.75;
          const cliffT = clamp(Math.max(slopeT, cragBand), 0, 1) * smoothstep(2.8, 3.6, h);
          const strata =
            Math.sin(h * 2.9 + x * 0.12 + z * 0.09) * 10 +
            (valueNoise2D(x * 0.75, z * 0.75) - 0.5) * 14;
          const limestone: [number, number, number] =
            h > 17.5
              ? [186 + strata, 188 + strata * 0.95, 174 + strata * 0.88]
              : [204 + strata, 206 + strata * 0.95, 188 + strata * 0.85];
          rgb = mixRgb(rgb, limestone, cliffT);
        }

        // Warm tan dirt roads, ramp & fortress courtyard lanes
        const roadD = shellsRoadSignedDist(x, z);
        if (roadD < 0.45 && h > 0.15) {
          const roadT = 1 - smoothstep(-0.18, 0.45, roadD);
          const grain = (valueNoise2D(x * 2.2, z * 2.2) - 0.5) * 13;
          const roadTone: [number, number, number] = [
            228 + grain,
            204 + grain,
            158 + grain,
          ];
          rgb = mixRgb(rgb, roadTone, roadT * 0.94);
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

/**
 * Iconic sky-blue Marine HQ tower texture with angled dark-blue hatch louvers
 * and the "MARINE" gull crest near the crown (matching shells_town2_25729c6b.png).
 */
function createMarineTowerTexture(withEmblem: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Sky-blue tower hull gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#8ec6e6');
  grad.addColorStop(0.55, '#6ca9cf');
  grad.addColorStop(1, '#5893ba');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Diagonal dark-blue armored louver bands staggered across height & circumference
  ctx.save();
  ctx.fillStyle = '#336285';
  const rows = [145, 225, 305, 390, 465];
  for (let r = 0; r < rows.length; r++) {
    const ry = rows[r];
    for (let x = -64 + (r % 2) * 34; x < 576; x += 92) {
      ctx.save();
      ctx.translate(x, ry);
      ctx.rotate(-0.56);
      ctx.beginPath();
      ctx.roundRect(-24, -8, 48, 16, 6);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();

  // Subtle horizontal concrete seam bands
  ctx.fillStyle = 'rgba(22, 54, 82, 0.18)';
  for (const sy of [92, 200, 316, 428]) {
    ctx.fillRect(0, sy, 512, 3);
  }

  // Marine Gull Crest + "MARINE" text centered at U = 0.5 (facing +Z South toward Shells Town & Sea)
  if (withEmblem) {
    const cx = 256;
    const cy = 76;
    ctx.strokeStyle = '#1b3e5c';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // Stylized Marine seagull wings
    ctx.moveTo(cx - 48, cy + 6);
    ctx.quadraticCurveTo(cx - 26, cy - 22, cx, cy - 2);
    ctx.quadraticCurveTo(cx + 26, cy - 22, cx + 48, cy + 6);
    ctx.stroke();

    ctx.fillStyle = '#1b3e5c';
    ctx.beginPath();
    ctx.arc(cx, cy - 12, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('MARINE', cx, cy + 16);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createFacadeTexture(baseColorHex: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const c = new THREE.Color(baseColorHex);
  ctx.fillStyle = `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle corner pilasters & stone plinth trim
  ctx.fillStyle = 'rgba(72, 58, 44, 0.22)';
  ctx.fillRect(0, 0, 10, 256);
  ctx.fillRect(246, 0, 10, 256);
  ctx.fillRect(0, 232, 256, 24);
  ctx.fillRect(0, 122, 256, 7);

  const slots = [34, 104, 174];
  for (let i = 0; i < slots.length; i++) {
    const x = slots[i];
    if (i === 1) {
      ctx.fillStyle = '#4e311d';
      ctx.fillRect(x, 148, 48, 84);
      ctx.strokeStyle = '#ece4d4';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, 148, 48, 84);
    } else {
      ctx.fillStyle = '#2d455c';
      ctx.fillRect(x, 148, 42, 44);
      ctx.strokeStyle = '#ece4d4';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, 148, 42, 44);
    }
    ctx.fillStyle = '#2d455c';
    ctx.fillRect(x + 4, 42, 38, 42);
    ctx.strokeStyle = '#ece4d4';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, 42, 38, 42);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createGateBannerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#e7e4d4';
  ctx.fillRect(0, 0, 512, 144);
  ctx.strokeStyle = '#22476b';
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, 500, 132);

  ctx.fillStyle = '#1b3e5c';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MARINE · G-153', 256, 54);

  ctx.fillStyle = '#4b6c88';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('153RD BRANCH · SHELLS TOWN', 256, 102);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRikaTavernSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#563119';
  ctx.fillRect(0, 0, 384, 128);
  ctx.fillStyle = '#f8ecd4';
  ctx.fillRect(10, 10, 364, 108);
  ctx.fillStyle = '#8b321c';
  ctx.font = 'bold 36px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FOOD FOOSH', 192, 48);
  ctx.fillStyle = '#4f3828';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText("TAVERNE DE RIKA · SHELLS TOWN", 192, 88);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMarineFlagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#f7f9fc';
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 152);

  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(86, 86);
  ctx.quadraticCurveTo(106, 54, 128, 76);
  ctx.quadraticCurveTo(150, 54, 170, 86);
  ctx.stroke();

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MARINE', 128, 126);

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
  style: 'hip' | 'gable' | 'flat'
): THREE.BufferGeometry {
  const hw = width * 0.5 + 0.25;
  const hd = depth * 0.5 + 0.25;
  if (style === 'flat') {
    const g = new THREE.BoxGeometry(width + 0.3, Math.max(0.2, height * 0.25), depth + 0.3);
    g.translate(0, Math.max(0.1, height * 0.125), 0);
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

export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance | null {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const regTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;
  const group = new THREE.Group();
  group.name = 'island-shells-town';

  const placeOnSphere = (
    obj: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    yaw = 0
  ) => {
    const sp = toShellsSphereLocal(x, y, z, globeRadius);
    obj.position.set(sp.x, sp.y, sp.z);
    _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, yaw);
    obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    obj.scale.multiplyScalar(S);
  };

  // 1. Sculpted 224x224 Shells Town & Yotsuba Terrain Mesh + 1024x1024 Texture
  const segs = 224;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(SHELLS_WORLD_SIZE, SHELLS_WORLD_SIZE, segs, segs)
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const posArr = posAttr.array as Float32Array;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posArr[i * 3];
    const z = posArr[i * 3 + 2];
    const h = sampleShellsHeight(x, z);
    const sp = toShellsSphereLocal(x, h, z, globeRadius);
    posArr[i * 3] = sp.x;
    posArr[i * 3 + 1] = sp.y;
    posArr[i * 3 + 2] = sp.z;
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainTex = regTex(createShellsTerrainTexture(1024));
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
  const unitCyl = trackGeo(new THREE.CylinderGeometry(1, 1, 1, 14));
  const roofShingleTex = regTex(createRoofShingleTexture());

  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xd9d8c4, roughness: 0.86, metalness: 0.04 })
  );
  const stoneTrimMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb9baa4, roughness: 0.88, metalness: 0.04 })
  );
  const roadStoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xd9c296, roughness: 0.88, metalness: 0.03 })
  );
  const darkTimberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4f2f1a, roughness: 0.84, metalness: 0.04 })
  );
  const timberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7c4e2c, roughness: 0.82, metalness: 0.04 })
  );
  const creamMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf7f2e7, roughness: 0.72, metalness: 0.03 })
  );
  const blueTrimMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4f8ab5, roughness: 0.62, metalness: 0.1 })
  );
  const ironMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x262d38, roughness: 0.45, metalness: 0.25 })
  );
  const ropeMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xd9b97e, roughness: 0.85, metalness: 0.02 })
  );

  const roofGeoCache = new Map<string, THREE.BufferGeometry>();
  const getRoofGeo = (
    w: number,
    d: number,
    h: number,
    style: 'hip' | 'gable' | 'flat'
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

  const facadeCache = new Map<number, THREE.MeshStandardMaterial>();
  const getFacadeMat = (color: number) => {
    let m = facadeCache.get(color);
    if (!m) {
      const tex = regTex(createFacadeTexture(color));
      m = trackMat(
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0.03 })
      );
      facadeCache.set(color, m);
    }
    return m;
  };

  // 2. STEPPED STONE RETAINING WALLS, AVENUE RAMP STEPS & SW BASTION
  {
    // Retaining walls flanking the G-153 South Gate ramp & cliff terrace (footings sunk deep into slope)
    const retainingSegments: readonly [number, number, number, number, number, number][] = [
      // [x, yBase, z, w, h, d]
      [-23.8, 4.6, 14.8, 21.8, 7.0, 1.4], // West of ramp upper cliff
      [7.8, 4.6, 14.8, 29.5, 7.0, 1.4],   // East of ramp upper cliff
      [-24.2, 1.2, 21.6, 21.0, 5.2, 1.2], // Lower mid-terrace wall W
      [8.0, 1.2, 21.6, 29.0, 5.2, 1.2],   // Lower mid-terrace wall E
    ];
    for (const [rx, ry, rz, rw, rh, rd] of retainingSegments) {
      const wall = new THREE.Mesh(unitBox, stoneMat);
      wall.scale.set(rw, rh, rd);
      placeOnSphere(wall, rx, ry + rh * 0.5 - 0.3, rz, 0);
      group.add(wall);
    }

    // Crisp stone sidewalls & broad steps along the ascending Avenue Ramp (-10, z=14.2..29.4)
    for (const sx of [-12.6, -7.4]) {
      for (let i = 0; i < 6; i++) {
        const sz = 15.2 + i * 2.4;
        const hHere = sampleShellsHeight(-10.0, sz);
        const rail = new THREE.Mesh(unitBox, stoneTrimMat);
        rail.scale.set(0.65, 1.6, 2.6);
        placeOnSphere(rail, sx, hHere + 0.45, sz, 0);
        group.add(rail);
      }
    }
    for (let zStep = 14.6; zStep <= 29.0; zStep += 1.2) {
      const hStep = sampleShellsHeight(-10.0, zStep);
      const tread = new THREE.Mesh(unitBox, roadStoneMat);
      tread.scale.set(4.6, 0.32, 1.18);
      placeOnSphere(tread, -10.0, hStep - 0.1, zStep, 0);
      group.add(tread);
    }

    // SW Cylindrical Pale-Stone Coastal Bastion anchored deeply into the western sandy beach & seabed
    const bastion = new THREE.Group();
    const bBody = new THREE.Mesh(unitCyl, stoneMat);
    bBody.scale.set(5.2, 11.4, 5.2);
    bBody.position.y = 5.7;
    const bRim = new THREE.Mesh(unitCyl, stoneTrimMat);
    bRim.scale.set(5.55, 0.7, 5.55);
    bRim.position.y = 11.5;
    bastion.add(bBody, bRim);
    placeOnSphere(
      bastion,
      SHELLS_LANDMARKS.swBastion.x,
      -2.6,
      SHELLS_LANDMARKS.swBastion.z,
      0
    );
    group.add(bastion);
  }

  // 3. G-153 SQUARE FORTRESS PERIMETER WALLS, GATES & SW EXECUTION COURTYARD
  {
    const baseWallGroup = new THREE.Group();
    const wH = 4.1;
    const wT = 1.25;

    const addWallRun = (x: number, z: number, w: number, d: number, h = wH) => {
      const mesh = new THREE.Mesh(unitBox, stoneMat);
      mesh.scale.set(w, h, d);
      mesh.position.set(x, h * 0.5, z);
      const cap = new THREE.Mesh(unitBox, stoneTrimMat);
      cap.scale.set(w + 0.16, 0.4, d + 0.16);
      cap.position.set(x, h + 0.18, z);
      baseWallGroup.add(mesh, cap);
    };

    // North wall (-32), West wall (-34)
    addWallRun(-6.0, -32.0, 56.8, wT);
    addWallRun(-34.0, -9.0, wT, 46.8);
    // South wall split around South Gate at x = -10 (width 5.4m opening)
    addWallRun(-23.35, 14.0, 21.3, wT);
    addWallRun(7.35, 14.0, 29.3, wT);
    // East wall split around East Gate at z = -12 (width 4.4m opening)
    addWallRun(22.0, -23.1, wT, 17.8);
    addWallRun(22.0, 2.1, wT, 23.8);

    // 4 Corner Bastion Towers
    for (const [cx, cz] of [
      [-34.0, -32.0],
      [22.0, -32.0],
      [-34.0, 14.0],
      [22.0, 14.0],
    ]) {
      const pillar = new THREE.Mesh(unitBox, stoneTrimMat);
      pillar.scale.set(2.8, wH + 1.2, 2.8);
      pillar.position.set(cx, (wH + 1.2) * 0.5, cz);
      baseWallGroup.add(pillar);
    }

    // South Arch Gatehouse at x = -10, z = 14
    const gateTex = regTex(createGateBannerTexture());
    const gateSignMat = trackMat(
      new THREE.MeshStandardMaterial({ map: gateTex, roughness: 0.55, metalness: 0.05 })
    );
    for (const gx of [-13.2, -6.8]) {
      const pylon = new THREE.Mesh(unitBox, stoneTrimMat);
      pylon.scale.set(1.8, 5.8, 2.2);
      pylon.position.set(gx, 2.9, 14.0);
      baseWallGroup.add(pylon);
    }
    const lintel = new THREE.Mesh(unitBox, stoneMat);
    lintel.scale.set(8.6, 1.8, 2.2);
    lintel.position.set(-10.0, 5.4, 14.0);
    const gatePlaque = new THREE.Mesh(unitBox, gateSignMat);
    gatePlaque.scale.set(5.4, 1.45, 0.14);
    gatePlaque.position.set(-10.0, 5.45, 15.14);
    baseWallGroup.add(lintel, gatePlaque);

    // East Gatehouse pillars at x = 22, z = -12
    for (const gz of [-14.4, -9.6]) {
      const pylon = new THREE.Mesh(unitBox, stoneTrimMat);
      pylon.scale.set(2.0, 5.2, 1.4);
      pylon.position.set(22.0, 2.6, gz);
      baseWallGroup.add(pylon);
    }
    const eastLintel = new THREE.Mesh(unitBox, stoneMat);
    eastLintel.scale.set(2.0, 1.3, 6.2);
    eastLintel.position.set(22.0, 4.9, -12.0);
    baseWallGroup.add(eastLintel);

    // SW Fenced Execution Courtyard partition walls (x in [-34..-15], z in [-2..14])
    addWallRun(-24.5, -2.0, 19.0, 0.65, 2.3);
    addWallRun(-15.0, 0.6, 0.65, 5.2, 2.3);
    addWallRun(-15.0, 11.4, 0.65, 5.2, 2.3);
    for (const pz of [3.4, 8.6]) {
      const gatePost = new THREE.Mesh(unitBox, darkTimberMat);
      gatePost.scale.set(0.55, 2.7, 0.55);
      gatePost.position.set(-15.0, 1.35, pz);
      baseWallGroup.add(gatePost);
    }

    // Zoro's Upright Wooden Crucifixion Cross at (-24.5, 6.0)
    const crossPost = new THREE.Mesh(unitBox, darkTimberMat);
    crossPost.scale.set(0.46, 3.6, 0.46);
    crossPost.position.set(-24.5, 1.75, 6.0);
    const crossBar = new THREE.Mesh(unitBox, darkTimberMat);
    crossBar.scale.set(2.3, 0.34, 0.34);
    crossBar.position.set(-24.5, 2.7, 6.0);
    const ropeCoil = new THREE.Mesh(unitCyl, ropeMat);
    ropeCoil.scale.set(0.32, 0.48, 0.32);
    ropeCoil.position.set(-24.5, 1.75, 6.0);
    const barrel = new THREE.Mesh(unitCyl, timberMat);
    barrel.scale.set(0.3, 0.72, 0.3);
    barrel.position.set(-22.2, 0.36, 6.9);
    baseWallGroup.add(crossPost, crossBar, ropeCoil, barrel);

    placeOnSphere(baseWallGroup, 0, SHELLS_BASE_Y - 0.08, 0, 0);
    group.add(baseWallGroup);
  }

  // 4. MONUMENTAL TWIN TILTED SKY-BLUE MARINE HQ TOWERS & CLIFF BUNKERS
  let marineFlagMesh: THREE.Mesh | null = null;
  {
    const mainTowerMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: regTex(createMarineTowerTexture(true)),
        roughness: 0.54,
        metalness: 0.14,
      })
    );
    const secTowerMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: regTex(createMarineTowerTexture(false)),
        roughness: 0.54,
        metalness: 0.14,
      })
    );
    const flagMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: regTex(createMarineFlagTexture()),
        roughness: 0.65,
        side: THREE.DoubleSide,
      })
    );

    // 4A. MAIN NORTH-WEST TOWER (-10.5, -10.0)
    const mainT = new THREE.Group();
    const tiltWrap = new THREE.Group();
    tiltWrap.rotation.z = -0.082;
    tiltWrap.rotation.x = 0.032;
    // Rotate Y = PI so canvas center U=0.5 ("MARINE" gull emblem) faces +Z South!
    const mainHullGeo = trackGeo(new THREE.CylinderGeometry(5.1, 7.2, 24.0, 28));
    mainHullGeo.rotateY(Math.PI);
    const mainHull = new THREE.Mesh(mainHullGeo, mainTowerMat);
    mainHull.position.y = 12.0;
    tiltWrap.add(mainHull);

    // External Spiral Staircase Collar hugging the conical hull cleanly (zero floating ends)
    const spiralPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const ang = Math.PI * 0.65 + t * Math.PI * 1.45;
      const y = 0.2 + t * 11.4;
      const hullR = 7.2 - (y / 24.0) * 2.1;
      const r = hullR + (i === 0 || i === 32 ? -0.35 : 0.22);
      spiralPts.push(new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r));
    }
    const spiralGeo = trackGeo(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPts), 36, 0.34, 6, false)
    );
    const spiralRamp = new THREE.Mesh(spiralGeo, blueTrimMat);
    tiltWrap.add(spiralRamp);

    // Top Parapet Rim, Side Bunker Turret & Spire Flagpole
    const topRim = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(5.45, 5.25, 1.3, 24)),
      blueTrimMat
    );
    topRim.position.y = 24.3;
    const gunTurret = new THREE.Mesh(unitBox, stoneTrimMat);
    gunTurret.scale.set(2.4, 1.3, 2.2);
    gunTurret.position.set(-2.6, 25.2, 2.2);
    const spireBase = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.15, 1.85, 3.4, 14)),
      blueTrimMat
    );
    spireBase.position.set(0.8, 26.2, -0.4);
    const flagpole = new THREE.Mesh(unitCyl, creamMat);
    flagpole.scale.set(0.14, 4.6, 0.14);
    flagpole.position.set(0.8, 29.8, -0.4);

    const flagGeo = trackGeo(new THREE.PlaneGeometry(3.2, 2.0, 6, 3));
    flagGeo.translate(1.6, 0, 0);
    marineFlagMesh = new THREE.Mesh(flagGeo, flagMat);
    marineFlagMesh.position.set(0.8, 31.0, -0.4);

    tiltWrap.add(topRim, gunTurret, spireBase, flagpole, marineFlagMesh);
    mainT.add(tiltWrap);
    placeOnSphere(
      mainT,
      SHELLS_LANDMARKS.mainTower.x,
      SHELLS_BASE_Y - 0.15,
      SHELLS_LANDMARKS.mainTower.z,
      0
    );
    group.add(mainT);

    // 4B. SECONDARY RIGHT/SE TOWER (+2.2, -1.8) + ANNEX WING
    const secT = new THREE.Group();
    const secTilt = new THREE.Group();
    secTilt.rotation.z = -0.072;
    secTilt.rotation.x = 0.028;
    const secHullGeo = trackGeo(new THREE.CylinderGeometry(3.9, 5.4, 16.5, 24));
    secHullGeo.rotateY(Math.PI);
    const secHull = new THREE.Mesh(secHullGeo, secTowerMat);
    secHull.position.y = 8.25;
    const secRim = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(4.2, 4.0, 1.1, 20)),
      blueTrimMat
    );
    secRim.position.y = 16.75;
    const secTurret = new THREE.Mesh(unitBox, stoneTrimMat);
    secTurret.scale.set(2.1, 1.15, 1.9);
    secTurret.position.set(0, 17.6, 0.6);
    secTilt.add(secHull, secRim, secTurret);
    secT.add(secTilt);
    placeOnSphere(
      secT,
      SHELLS_LANDMARKS.eastTower.x,
      SHELLS_BASE_Y - 0.15,
      SHELLS_LANDMARKS.eastTower.z,
      0
    );
    group.add(secT);

    // Rectangular Blue Annex Building tucked northeast of Secondary Tower
    const annex = new THREE.Mesh(unitBox, blueTrimMat);
    annex.scale.set(4.8, 7.6, 3.8);
    placeOnSphere(
      annex,
      SHELLS_LANDMARKS.towerAnnex.x,
      SHELLS_BASE_Y + 3.7,
      SHELLS_LANDMARKS.towerAnnex.z,
      0.55
    );
    group.add(annex);

    // 4C. 3 OUTER SLANTED BLUE CLIFF WATCHTOWER BUNKERS (from sea elevation)
    const cliffBunkers: readonly [number, number, number, number][] = [
      [-28.5, 20.5, 4.8, 2.2],
      [16.0, 23.5, 5.2, 2.4],
      [38.5, 10.5, 6.4, 2.6],
    ];
    for (const [bx, bz, bh, br] of cliffBunkers) {
      const bk = new THREE.Group();
      const bHull = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(br * 0.72, br, bh, 16)),
        secTowerMat
      );
      bHull.position.y = bh * 0.5;
      bHull.rotation.z = -0.07;
      const bCap = new THREE.Mesh(unitBox, stoneTrimMat);
      bCap.scale.set(br * 1.1, 0.85, br * 0.95);
      bCap.position.set(0, bh + 0.35, 0);
      bk.add(bHull, bCap);
      placeOnSphere(bk, bx, sampleShellsHeight(bx, bz) - 0.35, bz, 0);
      group.add(bk);
    }
  }

  // 5. ALL SHELLS TOWN HOUSES & G-153 MARINE BARRACKS + RIKA'S TAVERN SIGN & WELL
  for (const b of SHELLS_BUILDINGS) {
    const hGroup = new THREE.Group();
    const body = new THREE.Mesh(unitBox, getFacadeMat(b.wallColor));
    body.scale.set(b.width, b.height, b.depth);
    body.position.y = b.height * 0.5;
    hGroup.add(body);

    const roofH = Math.min(1.85, b.depth * 0.45);
    const roof = new THREE.Mesh(
      getRoofGeo(b.width, b.depth, roofH, b.roofStyle),
      getRoofMat(b.roofColor)
    );
    roof.position.y = b.height;
    hGroup.add(roof);

    if (b.hasChimney) {
      const chimney = new THREE.Mesh(unitBox, stoneTrimMat);
      chimney.scale.set(0.42, 1.0, 0.42);
      chimney.position.set(b.width * 0.28, b.height + roofH * 0.55, 0);
      hGroup.add(chimney);
    }

    if (b.hasAwning) {
      const awning = new THREE.Mesh(unitBox, blueTrimMat);
      awning.scale.set(0.95, 0.14, b.depth * 0.72);
      const sideSign = b.x < -10 ? 1 : -1;
      awning.position.set(sideSign * (b.width * 0.5 + 0.42), 1.65, 0);
      hGroup.add(awning);
    }

    if (b.id === 'town-rikas-tavern') {
      const signTex = regTex(createRikaTavernSignTexture());
      const signMat = trackMat(
        new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 })
      );
      const signBoard = new THREE.Mesh(unitBox, signMat);
      signBoard.scale.set(0.12, 0.78, 2.8);
      signBoard.position.set(b.width * 0.5 + 0.12, 2.35, 0);
      hGroup.add(signBoard);
    }

    placeOnSphere(hGroup, b.x, b.y - 0.08, b.z, b.yaw);
    group.add(hGroup);
  }

  // SE Town Circular Stone Fountain / Well (matching tiny circle on SE town block)
  {
    const well = new THREE.Group();
    const rim = new THREE.Mesh(unitCyl, stoneTrimMat);
    rim.scale.set(1.35, 0.75, 1.35);
    rim.position.y = 0.35;
    const cap = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.5, 0.8, 12)),
      getRoofMat(0xb6543c)
    );
    cap.position.y = 1.9;
    for (const px of [-0.9, 0.9]) {
      const post = new THREE.Mesh(unitBox, darkTimberMat);
      post.scale.set(0.16, 1.3, 0.16);
      post.position.set(px, 0.95, 0);
      well.add(post);
    }
    well.add(rim, cap);
    placeOnSphere(well, 19.5, sampleShellsHeight(19.5, 51.5) - 0.05, 51.5, 0);
    group.add(well);
  }

  // 6. DARK-BROWN 3-FINGER WOODEN HARBOR PIER & MOORED MARINE CUTTER
  let marineCutterGroup: THREE.Group | null = null;
  {
    const pier = new THREE.Group();
    // Crosshead apron connecting Main Avenue to the 3 harbor fingers
    const headDeck = new THREE.Mesh(unitBox, darkTimberMat);
    headDeck.scale.set(13.6, 0.3, 3.0);
    headDeck.position.set(0, 0, 0);
    pier.add(headDeck);

    // 3 parallel fingers extending south into the harbor (+Z)
    for (const fx of [-4.5, 0, 4.5]) {
      const fLen = fx === 0 ? 6.2 : 5.4;
      const finger = new THREE.Mesh(unitBox, darkTimberMat);
      finger.scale.set(2.15, 0.28, fLen);
      finger.position.set(fx, 0, 1.5 + fLen * 0.5);
      pier.add(finger);

      for (const pz of [2.5, 1.5 + fLen - 0.6]) {
        for (const px of [-0.75, 0.75]) {
          const piling = new THREE.Mesh(unitCyl, timberMat);
          piling.scale.set(0.16, 2.5, 0.16);
          piling.position.set(fx + px, -1.05, pz);
          pier.add(piling);
        }
        const bollard = new THREE.Mesh(unitCyl, timberMat);
        bollard.scale.set(0.14, 0.42, 0.14);
        bollard.position.set(fx + 0.72, 0.32, pz);
        pier.add(bollard);
      }
    }

    // Supply crates & barrels on the quay
    for (const [cx, cz] of [
      [-2.2, 0.4],
      [2.6, -0.3],
    ]) {
      const crate = new THREE.Mesh(unitBox, timberMat);
      crate.scale.set(0.8, 0.65, 0.8);
      crate.position.set(cx, 0.45, cz);
      pier.add(crate);
    }

    placeOnSphere(
      pier,
      SHELLS_LANDMARKS.harborPier.x,
      SHELLS_PIER_Y,
      SHELLS_LANDMARKS.harborPier.z - 1.6,
      0
    );
    group.add(pier);

    // Moored Marine Patrol Cutter just east of the 3-finger pier
    const cutter = new THREE.Group();
    const cHull = new THREE.Mesh(unitBox, creamMat);
    cHull.scale.set(2.4, 1.15, 7.6);
    cHull.position.y = 0.52;
    const cStripe = new THREE.Mesh(unitBox, blueTrimMat);
    cStripe.scale.set(2.48, 0.28, 7.65);
    cStripe.position.y = 0.92;
    const cMast = new THREE.Mesh(unitCyl, timberMat);
    cMast.scale.set(0.1, 4.6, 0.1);
    cMast.position.set(0, 3.2, -0.4);
    const cSail = new THREE.Mesh(unitBox, creamMat);
    cSail.scale.set(2.2, 2.4, 0.08);
    cSail.position.set(0, 3.5, -0.5);
    cutter.add(cHull, cStripe, cMast, cSail);
    placeOnSphere(
      cutter,
      SHELLS_LANDMARKS.marineCutter.x,
      SHELLS_LANDMARKS.marineCutter.y,
      SHELLS_LANDMARKS.marineCutter.z,
      0.35
    );
    group.add(cutter);
    marineCutterGroup = cutter;
  }

  // 7. INSTANCED MULTI-SPECIES TREES (COASTAL BROADLEAF GROVES & HILLSIDES)
  const leafMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84, metalness: 0.02 })
  );
  const broadleafTrees = SHELLS_TREES.filter((t) => t.kind === 'broadleaf');
  const pineTrees = SHELLS_TREES.filter((t) => t.kind === 'pine');

  if (broadleafTrees.length > 0) {
    const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.25, 1.3, 7));
    trunkGeo.translate(0, 0.65, 0);
    const crownMainGeo = trackGeo(new THREE.IcosahedronGeometry(1.08, 1));
    crownMainGeo.translate(0, 2.05, 0);
    const crownSideGeo = trackGeo(new THREE.IcosahedronGeometry(0.8, 1));
    crownSideGeo.translate(0.54, 1.76, 0.35);

    const tInst = new THREE.InstancedMesh(trunkGeo, timberMat, broadleafTrees.length);
    const c1Inst = new THREE.InstancedMesh(crownMainGeo, leafMat, broadleafTrees.length);
    const c2Inst = new THREE.InstancedMesh(crownSideGeo, leafMat, broadleafTrees.length);

    broadleafTrees.forEach((t, idx) => {
      const sp = toShellsSphereLocal(t.x, t.y, t.z, globeRadius);
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
      _tmpColor.setRGB(0.17 * t.tint, 0.54 * t.tint, 0.2 * t.tint);
      c1Inst.setColorAt(idx, _tmpColor);
      _tmpColor.setRGB(0.13 * t.tint, 0.45 * t.tint, 0.16 * t.tint);
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
      const sp = toShellsSphereLocal(t.x, t.y, t.z, globeRadius);
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
      _tmpColor.setRGB(0.12 * t.tint, 0.44 * t.tint, 0.18 * t.tint);
      c1Inst.setColorAt(idx, _tmpColor);
      _tmpColor.setRGB(0.15 * t.tint, 0.51 * t.tint, 0.21 * t.tint);
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

  const cutterBasePos = marineCutterGroup ? marineCutterGroup.position.clone() : null;

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      if (marineFlagMesh) {
        marineFlagMesh.rotation.y = Math.sin(elapsed * 3.1) * 0.18;
      }
      if (marineCutterGroup && cutterBasePos) {
        const bob = Math.sin(elapsed * 1.45 + 0.6) * 0.00018;
        marineCutterGroup.position
          .copy(cutterBasePos)
          .addScaledVector(_up, bob);
      }
    },
  };
}
