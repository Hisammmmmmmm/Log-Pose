import * as THREE from 'three';
import {
  GOAT_BUILDINGS,
  GOAT_GLOBE_SCALE,
  GOAT_HIDEOUT_Y,
  GOAT_LANDMARKS,
  GOAT_PIER_Y,
  GOAT_ROCKS,
  GOAT_TREES,
  GOAT_WORLD_SIZE,
  goatRoadSignedDist,
  sampleGoatHeight,
  toGoatSphereLocal,
} from '../utils/goatTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = GOAT_GLOBE_SCALE;
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

function createGoatTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = GOAT_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * GOAT_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * GOAT_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const h = sampleGoatHeight(x, z);
      const hx = sampleGoatHeight(x + 0.9, z);
      const hz = sampleGoatHeight(x, z + 0.9);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 1.4, 0, 1);
      const fineNoise = (valueNoise2D(x * 1.3, z * 1.3) - 0.5) * 12;

      let rgb: [number, number, number] = [226, 198, 138];
      let alpha = 0;

      if (h < -0.18) {
        alpha = smoothstep(-0.42, -0.18, h);
        rgb = [204, 180, 130];
      } else {
        alpha = 1;
        // East Blue lush grassy lowlands and flat green mesa tops
        const inlandFactor = smoothstep(3.2, 13.0, h);
        const meadowBase = mixRgb([124, 200, 82], [96, 174, 64], inlandFactor);
        const wetToDry = smoothstep(-0.18, 0.38, h);
        const sandColor = mixRgb([204, 182, 132], [238, 212, 148], wetToDry);
        const sandToGrass = smoothstep(0.55, 1.85, h);
        rgb = mixRgb(sandColor, meadowBase, sandToGrass);

        // Hideout East Cove sandy beach & courtyard base
        if (x > 16 && x < 43 && z > -16 && z < 18) {
          const yardMask =
            (1 - smoothstep(0.55, 1.15, Math.hypot((x - 30.0) / 13.0, (z - 1.0) / 15.0))) *
            smoothstep(0.3, 1.4, h);
          rgb = mixRgb(rgb, [230, 200, 146], yardMask * 0.85);
        }

        // Steep cliff rings around the Northern and Southwestern rocky mesas
        if (slope > 0.24) {
          const cliffT = smoothstep(0.24, 0.52, slope);
          const strata =
            Math.sin(h * 2.5 + x * 0.14) * 12 +
            (valueNoise2D(x * 0.7, z * 0.7) - 0.5) * 15;
          const rockRgb: [number, number, number] = [
            142 + strata,
            110 + strata * 0.8,
            82 + strata * 0.65,
          ];
          rgb = mixRgb(rgb, rockRgb, cliffT);
        }

        // Walkable tan dirt paths & hideout courtyard lanes
        const roadD = goatRoadSignedDist(x, z);
        if (roadD < 0.45 && h > 0.05) {
          const roadT = 1 - smoothstep(-0.18, 0.44, roadD);
          const grain = (valueNoise2D(x * 2.2, z * 2.2) - 0.5) * 15;
          const roadTone: [number, number, number] = [
            228 + grain,
            196 + grain,
            140 + grain,
          ];
          rgb = mixRgb(rgb, roadTone, roadT * 0.92);
        }
      }

      data[idx] = clamp(Math.round(rgb[0] + (h > -0.18 ? fineNoise : 0)), 0, 255);
      data[idx + 1] = clamp(
        Math.round(rgb[1] + (h > -0.18 ? fineNoise : 0)),
        0,
        255
      );
      data[idx + 2] = clamp(
        Math.round(rgb[2] + (h > -0.18 ? fineNoise : 0)),
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

  ctx.fillStyle = '#5e3d24';
  ctx.fillRect(0, 0, 12, 256);
  ctx.fillRect(244, 0, 12, 256);
  ctx.fillRect(0, 232, 256, 24);
  ctx.fillRect(0, 118, 256, 10);

  const slots = [34, 104, 174];
  for (let i = 0; i < slots.length; i++) {
    const x = slots[i];
    if (i === 1) {
      ctx.fillStyle = '#4e2f1a';
      ctx.fillRect(x, 146, 48, 86);
      ctx.strokeStyle = '#efe5d4';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, 146, 48, 86);
    } else {
      ctx.fillStyle = '#2d3f52';
      ctx.fillRect(x, 146, 44, 46);
      ctx.strokeStyle = '#efe5d4';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, 146, 44, 46);
    }
    ctx.fillStyle = '#2d3f52';
    ctx.fillRect(x + 4, 44, 38, 42);
    ctx.strokeStyle = '#efe5d4';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, 44, 38, 42);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAlvidaSailTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Clean cream-white sail with bubblegum pink border & Alvida Heart-Skull Jolly Roger
  ctx.fillStyle = '#fcf6f8';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#e76f9b';
  ctx.fillRect(0, 0, 256, 24);
  ctx.fillRect(0, 232, 256, 24);

  // Pink heart behind skull
  ctx.fillStyle = '#f07ba6';
  ctx.beginPath();
  ctx.moveTo(128, 198);
  ctx.bezierCurveTo(64, 152, 54, 92, 92, 74);
  ctx.bezierCurveTo(114, 64, 128, 84, 128, 96);
  ctx.bezierCurveTo(128, 84, 142, 64, 164, 74);
  ctx.bezierCurveTo(202, 92, 192, 152, 128, 198);
  ctx.fill();

  // Crossed bones
  ctx.strokeStyle = '#232329';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(76, 86);
  ctx.lineTo(180, 184);
  ctx.moveTo(180, 86);
  ctx.lineTo(76, 184);
  ctx.stroke();

  // Skull silhouette
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#232329';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(128, 124, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#232329';
  ctx.beginPath();
  ctx.arc(116, 122, 7, 0, Math.PI * 2);
  ctx.arc(140, 122, 7, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAlvidaBannerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#572038';
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#f2b84b';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 144);
  ctx.fillStyle = '#fcebf2';
  ctx.fillRect(18, 18, 476, 124);

  ctx.fillStyle = '#8b1e4b';
  ctx.font = 'bold 46px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("ALVIDA'S HIDEOUT", 256, 68);

  ctx.fillStyle = '#b94473';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('GOAT ISLAND · IRON MACE PIRATES', 256, 114);

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
  const hw = width * 0.5 + 0.28;
  const hd = depth * 0.5 + 0.28;
  if (style === 'flat') {
    const g = new THREE.BoxGeometry(width + 0.35, Math.max(0.2, height * 0.25), depth + 0.35);
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

function createMissLoveDuckHullGeo(): THREE.BufferGeometry {
  // Oval/teardrop boat silhouette matching the top-down hull in goat_515474f9.png
  const shape = new THREE.Shape();
  shape.moveTo(0, 8.6); // Rounded stern (+Z after rotation)
  shape.bezierCurveTo(3.2, 8.4, 4.1, 4.2, 4.0, 0.5);
  shape.bezierCurveTo(3.9, -4.0, 2.7, -8.2, 0, -10.4); // Tapered bow (-Z)
  shape.bezierCurveTo(-2.7, -8.2, -3.9, -4.0, -4.0, 0.5);
  shape.bezierCurveTo(-4.1, 4.2, -3.2, 8.4, 0, 8.6);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 2.2,
    bevelEnabled: true,
    bevelThickness: 0.35,
    bevelSize: 0.28,
    bevelSegments: 2,
    curveSegments: 20,
  });
  geo.rotateX(Math.PI * 0.5);
  geo.translate(0, 2.2, 0);
  return geo;
}

function createHeartShieldGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -1.0);
  s.bezierCurveTo(-1.3, -0.2, -1.4, 1.0, -0.65, 1.2);
  s.bezierCurveTo(-0.2, 1.3, 0, 0.9, 0, 0.7);
  s.bezierCurveTo(0, 0.9, 0.2, 1.3, 0.65, 1.2);
  s.bezierCurveTo(1.4, 1.0, 1.3, -0.2, 0, -1.0);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 1,
  });
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
  group.name = 'island-goat';

  const placeOnSphere = (
    obj: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    yaw = 0
  ) => {
    const sp = toGoatSphereLocal(x, y, z, globeRadius);
    obj.position.set(sp.x, sp.y, sp.z);
    _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, yaw);
    obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    obj.scale.multiplyScalar(S);
  };

  // 1. Sculpted 128x128 Goat Island Terrain Mesh + 1024x1024 Relief Texture
  const segs = 128;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(GOAT_WORLD_SIZE, GOAT_WORLD_SIZE, segs, segs)
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const posArr = posAttr.array as Float32Array;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posArr[i * 3];
    const z = posArr[i * 3 + 2];
    const h = sampleGoatHeight(x, z);
    const sp = toGoatSphereLocal(x, h, z, globeRadius);
    posArr[i * 3] = sp.x;
    posArr[i * 3 + 1] = sp.y;
    posArr[i * 3 + 2] = sp.z;
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainTex = regTex(createGoatTerrainTexture(1024));
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
  const stoneGrayMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x8e95a0, roughness: 0.86, metalness: 0.05 })
  );
  const creamWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf8f3eb, roughness: 0.68, metalness: 0.03 })
  );
  const peachDeckMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf3d8c4, roughness: 0.72, metalness: 0.03 })
  );
  const pinkHullMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xef88ad, roughness: 0.56, metalness: 0.06 })
  );
  const deepRoseMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x8f3859, roughness: 0.66, metalness: 0.06 })
  );
  const pinkRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe26f98,
      map: roofShingleTex,
      roughness: 0.68,
      metalness: 0.04,
    })
  );
  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe6b43c, roughness: 0.35, metalness: 0.25 })
  );
  const ironMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x242830, roughness: 0.45, metalness: 0.25 })
  );
  const seaRockMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x727782, roughness: 0.88, metalness: 0.04 })
  );
  const lanternGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffe49c,
      emissive: 0xffa73b,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    })
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
      const tex = regTex(createCottageFacadeTexture(color));
      m = trackMat(
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0.03 })
      );
      facadeCache.set(color, m);
    }
    return m;
  };

  // 2. ALVIDA'S L-SHAPED PINK-ROOFED HEADQUARTERS (NW CORNER OF HIDEOUT COMPOUND)
  {
    const hq = new THREE.Group();
    const hqWallMat = getFacadeMat(0xf7eae8);
    const bannerTex = regTex(createAlvidaBannerTexture());
    const bannerMat = trackMat(
      new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.58, metalness: 0.05 })
    );

    // Stone foundation plinths (Main East-West wing + South-East L-wing)
    const mainPlinth = new THREE.Mesh(unitBox, stoneGrayMat);
    mainPlinth.scale.set(7.6, 0.32, 4.6);
    mainPlinth.position.y = 0.16;
    const wingPlinth = new THREE.Mesh(unitBox, stoneGrayMat);
    wingPlinth.scale.set(3.6, 0.32, 3.8);
    wingPlinth.position.set(1.8, 0.16, 2.8);
    hq.add(mainPlinth, wingPlinth);

    // Main Wing 2-story body & pink shingled gable roof
    const mainBody = new THREE.Mesh(unitBox, hqWallMat);
    mainBody.scale.set(7.2, 3.3, 4.2);
    mainBody.position.y = 0.32 + 1.65;
    const mainRoof = new THREE.Mesh(
      getRoofGeo(7.4, 4.4, 1.7, 'gable'),
      pinkRoofMat
    );
    mainRoof.position.y = 3.62;
    hq.add(mainBody, mainRoof);

    // Perpendicular L-Wing & pink roof matching the pink L-shape on goat_515474f9.png
    const wingBody = new THREE.Mesh(unitBox, hqWallMat);
    wingBody.scale.set(3.3, 3.0, 3.5);
    wingBody.position.set(1.8, 0.32 + 1.5, 2.6);
    const wingRoof = new THREE.Mesh(
      getRoofGeo(3.4, 3.6, 1.45, 'gable'),
      pinkRoofMat
    );
    wingRoof.rotation.y = Math.PI * 0.5;
    wingRoof.position.set(1.8, 3.32, 2.6);
    hq.add(wingBody, wingRoof);

    // Stone Chimney
    const chimney = new THREE.Mesh(unitBox, stoneGrayMat);
    chimney.scale.set(0.65, 1.5, 0.65);
    chimney.position.set(-2.3, 4.4, -0.6);
    hq.add(chimney);

    // Front Porch Awning & Posts facing Courtyard (+Z)
    const porchDeck = new THREE.Mesh(unitBox, timberMat);
    porchDeck.scale.set(4.1, 0.24, 1.6);
    porchDeck.position.set(-1.7, 0.12, 2.8);
    const porchRoof = new THREE.Mesh(unitBox, pinkRoofMat);
    porchRoof.scale.set(4.2, 0.16, 1.8);
    porchRoof.position.set(-1.7, 2.25, 2.85);
    porchRoof.rotation.x = 0.16;
    hq.add(porchDeck, porchRoof);

    for (const px of [-3.5, -1.7, 0.1]) {
      const post = new THREE.Mesh(unitBox, darkTimberMat);
      post.scale.set(0.18, 1.88, 0.18);
      post.position.set(px, 1.15, 3.5);
      hq.add(post);
    }

    // "ALVIDA'S HIDEOUT" Signboard above front porch
    const signBack = new THREE.Mesh(unitBox, darkTimberMat);
    signBack.scale.set(3.2, 0.95, 0.14);
    signBack.position.set(-1.7, 3.02, 2.35);
    const signFace = new THREE.Mesh(unitBox, bannerMat);
    signFace.scale.set(3.05, 0.84, 0.06);
    signFace.position.set(-1.7, 3.02, 2.43);
    hq.add(signBack, signFace);

    // Barrels & loot crates flanking the porch
    for (const [bx, bz] of [
      [-3.3, 3.1],
      [-2.8, 3.2],
      [3.1, 4.6],
    ]) {
      const barrel = new THREE.Mesh(unitCyl, timberMat);
      barrel.scale.set(0.28, 0.68, 0.28);
      barrel.position.set(bx, 0.56, bz);
      const band = new THREE.Mesh(unitCyl, ironMat);
      band.scale.set(0.3, 0.08, 0.3);
      band.position.set(bx, 0.7, bz);
      hq.add(barrel, band);
    }

    placeOnSphere(
      hq,
      GOAT_LANDMARKS.alvidaHq.x,
      GOAT_HIDEOUT_Y - 0.06,
      GOAT_LANDMARKS.alvidaHq.z,
      GOAT_LANDMARKS.alvidaHq.yaw
    );
    group.add(hq);
  }

  // 3. LONG NORTH-SOUTH WOODEN HARBOR QUAY & APRON RAMP
  {
    const quay = new THREE.Group();
    const qLen = GOAT_LANDMARKS.woodenQuay.length;
    const qW = GOAT_LANDMARKS.woodenQuay.width;
    const deck = new THREE.Mesh(unitBox, darkTimberMat);
    deck.scale.set(qW, 0.28, qLen);
    quay.add(deck);

    // Side edge stringer & walkway planks
    const trimW = new THREE.Mesh(unitBox, timberMat);
    trimW.scale.set(0.18, 0.32, qLen);
    trimW.position.set(-qW * 0.5 + 0.08, 0.04, 0);
    const trimE = new THREE.Mesh(unitBox, timberMat);
    trimE.scale.set(0.18, 0.32, qLen);
    trimE.position.set(qW * 0.5 - 0.08, 0.04, 0);
    quay.add(trimW, trimE);

    // Vertical support pilings & mooring bollards every ~4.5m
    for (let pz = -qLen * 0.46; pz <= qLen * 0.46; pz += 4.6) {
      for (const px of [-qW * 0.42, qW * 0.42]) {
        const piling = new THREE.Mesh(unitCyl, darkTimberMat);
        piling.scale.set(0.18, 2.9, 0.18);
        piling.position.set(px, -1.15, pz);
        quay.add(piling);
      }
      const bollard = new THREE.Mesh(unitCyl, darkTimberMat);
      bollard.scale.set(0.16, 0.48, 0.16);
      bollard.position.set(qW * 0.42, 0.34, pz);
      quay.add(bollard);
    }

    // Sloped wooden gangways connecting quay (1.45m) up to sandy courtyard (2.2m)
    for (const rz of [-4.5, 6.5]) {
      const ramp = new THREE.Mesh(unitBox, timberMat);
      ramp.scale.set(2.4, 0.2, 2.6);
      ramp.position.set(-qW * 0.5 - 1.0, 0.34, rz);
      ramp.rotation.z = -0.3;
      quay.add(ramp);
    }

    // Stacked crates & Luffy's apple/sake barrel on the quay
    for (const [cx, cz, cw] of [
      [-0.2, 10.5, 0.85],
      [0.35, 11.4, 0.72],
      [-0.4, -7.8, 0.8],
    ]) {
      const crate = new THREE.Mesh(unitBox, timberMat);
      crate.scale.set(cw, cw * 0.85, cw);
      crate.position.set(cx, cw * 0.42 + 0.14, cz);
      quay.add(crate);
    }
    for (const [bx, bz] of [
      [0.45, 9.6],
      [-0.5, 12.1],
      [0.3, -9.2],
    ]) {
      const barrel = new THREE.Mesh(unitCyl, timberMat);
      barrel.scale.set(0.3, 0.7, 0.3);
      barrel.position.set(bx, 0.48, bz);
      const band = new THREE.Mesh(unitCyl, ironMat);
      band.scale.set(0.32, 0.08, 0.32);
      band.position.set(bx, 0.62, bz);
      quay.add(barrel, band);
    }

    placeOnSphere(
      quay,
      GOAT_LANDMARKS.woodenQuay.x,
      GOAT_PIER_Y,
      GOAT_LANDMARKS.woodenQuay.z,
      0
    );
    group.add(quay);
  }

  // 4. ALVIDA'S PIRATE FLAGSHIP: MISS LOVE DUCK + KOBY'S ESCAPE DINGHY
  let missLoveDuckGroup: THREE.Group | null = null;
  let kobyDinghyGroup: THREE.Group | null = null;
  {
    const ship = new THREE.Group();
    const sailTex = regTex(createAlvidaSailTexture());
    const sailMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: sailTex,
        roughness: 0.68,
        metalness: 0.03,
        side: THREE.DoubleSide,
      })
    );
    const orangeBeakMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.42, metalness: 0.08 })
    );

    // Sculpted pink rounded hull + deep plum waterline keel + crisp white gunwale rail
    const hullGeo = trackGeo(createMissLoveDuckHullGeo());
    const hullMesh = new THREE.Mesh(hullGeo, pinkHullMat);
    hullMesh.scale.set(1.0, 0.9, 1.0);
    ship.add(hullMesh);

    const keelTrim = new THREE.Mesh(hullGeo, deepRoseMat);
    keelTrim.scale.set(1.02, 0.32, 1.02);
    keelTrim.position.y = -0.1;
    ship.add(keelTrim);

    // Side wing bulwark fins visible in the top-down map
    for (const sx of [-4.05, 4.05]) {
      const wing = new THREE.Mesh(unitBox, pinkHullMat);
      wing.scale.set(0.45, 0.9, 7.6);
      wing.position.set(sx, 2.0, 0.8);
      const wingTrim = new THREE.Mesh(unitBox, creamWhiteMat);
      wingTrim.scale.set(0.5, 0.2, 7.8);
      wingTrim.position.set(sx, 2.52, 0.8);
      ship.add(wing, wingTrim);
    }

    // Main cream wooden deck + raised semicircular aft quarterdeck + captain cabin
    const mainDeck = new THREE.Mesh(unitBox, peachDeckMat);
    mainDeck.scale.set(6.4, 0.24, 15.6);
    mainDeck.position.set(0, 2.38, -0.4);
    const aftDeck = new THREE.Mesh(unitCyl, peachDeckMat);
    aftDeck.scale.set(3.2, 0.95, 3.8);
    aftDeck.position.set(0, 2.85, 5.2);
    const aftRail = new THREE.Mesh(unitCyl, creamWhiteMat);
    aftRail.scale.set(3.35, 0.22, 3.95);
    aftRail.position.set(0, 3.4, 5.2);
    const cabin = new THREE.Mesh(unitBox, pinkHullMat);
    cabin.scale.set(3.8, 1.4, 2.8);
    cabin.position.set(0, 3.25, 6.2);
    ship.add(mainDeck, aftDeck, aftRail, cabin);

    // Ornate Pink Heart Stern Gallery & Twin Golden Lanterns (+Z stern)
    const heartGeo = trackGeo(createHeartShieldGeo());
    const sternHeart = new THREE.Mesh(heartGeo, pinkHullMat);
    sternHeart.scale.set(1.5, 1.5, 1.2);
    sternHeart.position.set(0, 3.6, 8.65);
    ship.add(sternHeart);

    for (const lx of [-1.4, 1.4]) {
      const lantern = new THREE.Mesh(unitBox, lanternGlowMat);
      lantern.scale.set(0.32, 0.45, 0.32);
      lantern.position.set(lx, 3.95, 8.6);
      ship.add(lantern);
    }

    // Iconic Giant White Duck / Swan Prow Figurehead extending at the bow (-Z)
    const neckCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 2.3, -9.2),
      new THREE.Vector3(0, 3.3, -10.4),
      new THREE.Vector3(0, 4.4, -10.8),
      new THREE.Vector3(0, 5.1, -11.4),
    ]);
    const duckNeck = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(neckCurve, 12, 0.56, 10, false)),
      creamWhiteMat
    );
    const duckHead = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.92, 12, 10)),
      creamWhiteMat
    );
    duckHead.scale.set(0.95, 0.9, 1.15);
    duckHead.position.set(0, 5.35, -11.55);
    const duckBeak = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.48, 1.5, 10)),
      orangeBeakMat
    );
    duckBeak.scale.set(1.15, 1.0, 0.62);
    duckBeak.rotation.x = -Math.PI * 0.52;
    duckBeak.position.set(0, 5.2, -12.95);
    const duckCrown = new THREE.Mesh(unitCyl, goldMat);
    duckCrown.scale.set(0.55, 0.52, 0.55);
    duckCrown.position.set(0, 6.22, -11.5);
    const bowsprit = new THREE.Mesh(unitCyl, creamWhiteMat);
    bowsprit.scale.set(0.14, 4.2, 0.14);
    bowsprit.rotation.x = -Math.PI * 0.42;
    bowsprit.position.set(0, 3.6, -11.2);
    ship.add(duckNeck, duckHead, duckBeak, duckCrown, bowsprit);
    for (const cx of [-0.72, 0.72]) {
      const cheek = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.24, 8, 8)),
        pinkHullMat
      );
      cheek.position.set(cx, 5.18, -11.98);
      const eye = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.14, 8, 8)),
        ironMat
      );
      eye.position.set(cx * 0.85, 5.55, -12.18);
      ship.add(cheek, eye);
    }

    // 3 White Masts with Crow's-Nest Rings & Curved Billowing Alvida Heart-Skull Sails
    const mastConfigs: readonly [number, number, number][] = [
      [-5.6, 8.6, 4.4],
      [-0.4, 10.6, 5.8],
      [4.5, 8.2, 4.1],
    ];
    for (const [mz, mh, sw] of mastConfigs) {
      const mast = new THREE.Mesh(unitCyl, creamWhiteMat);
      mast.scale.set(0.2, mh, 0.2);
      mast.position.set(0, 2.4 + mh * 0.5, mz);
      const yard = new THREE.Mesh(unitBox, darkTimberMat);
      yard.scale.set(sw + 0.8, 0.16, 0.16);
      yard.position.set(0, 2.7 + mh * 0.72, mz - 0.18);

      const sailH = mh * 0.5;
      const sailGeo = trackGeo(new THREE.PlaneGeometry(sw, sailH, 8, 6));
      const sPos = sailGeo.attributes.position as THREE.BufferAttribute;
      for (let si = 0; si < sPos.count; si++) {
        const sx = sPos.getX(si) / (sw * 0.5);
        const sy = sPos.getY(si) / (sailH * 0.5);
        const billow = (1 - sy * sy * 0.75) * (1 - sx * sx * 0.35) * -0.82;
        sPos.setZ(si, billow);
      }
      sailGeo.computeVertexNormals();
      const sail = new THREE.Mesh(sailGeo, sailMat);
      sail.position.set(0, 2.7 + mh * 0.44, mz - 0.16);

      const nest = new THREE.Mesh(unitCyl, creamWhiteMat);
      nest.scale.set(0.85, 0.42, 0.85);
      nest.position.set(0, 2.4 + mh * 0.82, mz);
      ship.add(mast, yard, sail, nest);
    }

    // Main forestay rigging line from bowsprit tip to foremast top
    const stayCurve = new THREE.LineCurve3(
      new THREE.Vector3(0, 4.2, -13.0),
      new THREE.Vector3(0, 10.2, -5.6)
    );
    const forestay = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(stayCurve, 4, 0.05, 5, false)),
      creamWhiteMat
    );
    ship.add(forestay);

    // Note: yaw = 0 faces -Z bow northward (matching top-down map!)
    placeOnSphere(
      ship,
      GOAT_LANDMARKS.missLoveDuck.x,
      GOAT_LANDMARKS.missLoveDuck.y,
      GOAT_LANDMARKS.missLoveDuck.z,
      0
    );
    group.add(ship);
    missLoveDuckGroup = ship;

    // Koby's Small Escape Dinghy moored beside the south end of the wooden quay
    const dinghy = new THREE.Group();
    const dHull = new THREE.Mesh(unitBox, timberMat);
    dHull.scale.set(1.25, 0.44, 2.5);
    dHull.position.y = 0.18;
    const dBench = new THREE.Mesh(unitBox, darkTimberMat);
    dBench.scale.set(1.05, 0.08, 0.38);
    dBench.position.y = 0.4;
    const dOar = new THREE.Mesh(unitBox, darkTimberMat);
    dOar.scale.set(0.1, 0.08, 2.0);
    dOar.position.set(0.32, 0.45, 0);
    dOar.rotation.y = 0.25;
    dinghy.add(dHull, dBench, dOar);
    placeOnSphere(
      dinghy,
      GOAT_LANDMARKS.kobyDinghy.x,
      GOAT_LANDMARKS.kobyDinghy.y,
      GOAT_LANDMARKS.kobyDinghy.z,
      GOAT_LANDMARKS.kobyDinghy.yaw
    );
    group.add(dinghy);
    kobyDinghyGroup = dinghy;
  }

  // 5. ALL HIDEOUT COMPOUND HOUSES, WAREHOUSE & NW TRAIL CABIN
  for (const b of GOAT_BUILDINGS) {
    const hGroup = new THREE.Group();
    const body = new THREE.Mesh(unitBox, getFacadeMat(b.wallColor));
    body.scale.set(b.width, b.height, b.depth);
    body.position.y = b.height * 0.5;
    hGroup.add(body);

    const roofH = Math.min(1.75, b.depth * 0.46);
    const roof = new THREE.Mesh(
      getRoofGeo(b.width, b.depth, roofH, b.roofStyle),
      getRoofMat(b.roofColor)
    );
    roof.position.y = b.height;
    hGroup.add(roof);

    if (b.hasChimney) {
      const chimney = new THREE.Mesh(unitBox, stoneGrayMat);
      chimney.scale.set(0.45, 1.05, 0.45);
      chimney.position.set(b.width * 0.28, b.height + roofH * 0.55, 0);
      hGroup.add(chimney);
    }

    if (b.hasPorch) {
      const awning = new THREE.Mesh(unitBox, timberMat);
      awning.scale.set(b.width * 0.65, 0.14, 0.95);
      awning.position.set(0, 1.5, b.depth * 0.5 + 0.44);
      hGroup.add(awning);
    }

    placeOnSphere(hGroup, b.x, b.y - 0.06, b.z, b.yaw);
    group.add(hGroup);
  }

  // 6. COASTAL ROCK OUTCROPS
  for (const rk of GOAT_ROCKS) {
    const rock = new THREE.Mesh(
      trackGeo(new THREE.DodecahedronGeometry(1, 0)),
      seaRockMat
    );
    rock.scale.set(rk.scaleX, rk.scaleY, rk.scaleZ);
    placeOnSphere(rock, rk.x, rk.y, rk.z, rk.yaw);
    group.add(rock);
  }

  // 7. INSTANCED MULTI-SPECIES FOREST (BROADLEAF GROVES, MESA PINES & COASTAL PALMS)
  const leafMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84, metalness: 0.02 })
  );

  const broadleafTrees = GOAT_TREES.filter((t) => t.kind === 'broadleaf');
  const pineTrees = GOAT_TREES.filter((t) => t.kind === 'pine');
  const palmTrees = GOAT_TREES.filter((t) => t.kind === 'palm');

  if (broadleafTrees.length > 0) {
    const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.25, 1.35, 7));
    trunkGeo.translate(0, 0.675, 0);
    const crownMainGeo = trackGeo(new THREE.IcosahedronGeometry(1.05, 1));
    crownMainGeo.translate(0, 2.05, 0);
    const crownSideGeo = trackGeo(new THREE.IcosahedronGeometry(0.78, 1));
    crownSideGeo.translate(0.55, 1.78, 0.34);

    const tInst = new THREE.InstancedMesh(trunkGeo, timberMat, broadleafTrees.length);
    const c1Inst = new THREE.InstancedMesh(crownMainGeo, leafMat, broadleafTrees.length);
    const c2Inst = new THREE.InstancedMesh(crownSideGeo, leafMat, broadleafTrees.length);

    broadleafTrees.forEach((t, idx) => {
      const sp = toGoatSphereLocal(t.x, t.y, t.z, globeRadius);
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
      _tmpColor.setRGB(0.18 * t.tint, 0.56 * t.tint, 0.19 * t.tint);
      c1Inst.setColorAt(idx, _tmpColor);
      _tmpColor.setRGB(0.14 * t.tint, 0.47 * t.tint, 0.15 * t.tint);
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
      const sp = toGoatSphereLocal(t.x, t.y, t.z, globeRadius);
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
      _tmpColor.setRGB(0.12 * t.tint, 0.45 * t.tint, 0.17 * t.tint);
      c1Inst.setColorAt(idx, _tmpColor);
      _tmpColor.setRGB(0.15 * t.tint, 0.52 * t.tint, 0.2 * t.tint);
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

  if (palmTrees.length > 0) {
    const pTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.19, 2.4, 7));
    pTrunkGeo.translate(0, 1.2, 0);
    const pFrondGeo = trackGeo(createPalmFrondCanopyGeo());
    const ptInst = new THREE.InstancedMesh(pTrunkGeo, timberMat, palmTrees.length);
    const pfInst = new THREE.InstancedMesh(pFrondGeo, leafMat, palmTrees.length);

    palmTrees.forEach((t, idx) => {
      const sp = toGoatSphereLocal(t.x, t.y, t.z, globeRadius);
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

  const shipBasePos = missLoveDuckGroup ? missLoveDuckGroup.position.clone() : null;
  const dinghyBasePos = kobyDinghyGroup ? kobyDinghyGroup.position.clone() : null;

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      if (missLoveDuckGroup && shipBasePos) {
        const bob = Math.sin(elapsed * 1.35) * 0.00022;
        missLoveDuckGroup.position
          .copy(shipBasePos)
          .addScaledVector(_up, bob);
      }
      if (kobyDinghyGroup && dinghyBasePos) {
        const bob = Math.sin(elapsed * 1.9 + 1.1) * 0.00018;
        kobyDinghyGroup.position
          .copy(dinghyBasePos)
          .addScaledVector(_up, bob);
      }
    },
  };
}
