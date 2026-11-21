import * as THREE from 'three';
import {
  GECKO_BLACK_CAT_BEACH_Y,
  GECKO_BUILDINGS,
  GECKO_FENCES,
  GECKO_GLOBE_SCALE,
  GECKO_HONEY_Y,
  GECKO_LANDMARKS,
  GECKO_MANSION_Y,
  GECKO_QUAY_Y,
  GECKO_ROCKS,
  GECKO_TREES,
  GECKO_WORLD_SIZE,
  geckoRoadSignedDist,
  isInHoneyPlaza,
  isInKayaEstate,
  sampleBlackCatBeachMask,
  sampleGeckoHeight,
  toGeckoSphereLocal,
} from '../utils/geckoTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = GECKO_GLOBE_SCALE;
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

function createGeckoTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = GECKO_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * GECKO_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * GECKO_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const h = sampleGeckoHeight(x, z);
      const hx = sampleGeckoHeight(x + 0.9, z);
      const hz = sampleGeckoHeight(x, z + 0.9);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 1.45, 0, 1);
      const fineNoise = (valueNoise2D(x * 1.35, z * 1.35) - 0.5) * 12;

      let rgb: [number, number, number] = [212, 186, 128];
      let alpha = 0;

      if (h < -0.18) {
        alpha = smoothstep(-0.42, -0.18, h);
        rgb = [194, 172, 124];
      } else {
        alpha = 1;
        // Sunny bright emerald-lime Syrup meadows & deeper forest greens inland
        const syrupZone =
          1 - smoothstep(0.65, 1.15, Math.hypot((x + 68) / 30, (z - 24) / 26));
        const meadowBase = mixRgb([86, 162, 62], [122, 202, 76], syrupZone);
        const wetToDry = smoothstep(-0.18, 0.35, h);
        const sandColor = mixRgb([194, 174, 126], [234, 210, 146], wetToDry);
        const sandToGrass = smoothstep(0.42, 1.85, h);
        rgb = mixRgb(sandColor, meadowBase, sandToGrass);

        // Black Cat Hideout sandy crescent beach
        const bcBeach = sampleBlackCatBeachMask(x, z);
        if (bcBeach > 0.05 && h < 2.4) {
          rgb = mixRgb(rgb, [236, 208, 142], bcBeach * 0.95);
        }

        // Steep cliff faces (warm striated earth-tan, darkening to basalt cliff at Black Cat cave)
        const inHoney = isInHoneyPlaza(x, z);
        const inKaya = isInKayaEstate(x, z);
        if (slope > 0.25 && !inHoney && !inKaya) {
          const cliffT = smoothstep(0.24, 0.55, slope);
          const strata =
            Math.sin(h * 2.4 + x * 0.15) * 13 +
            (valueNoise2D(x * 0.65, z * 0.65) - 0.5) * 16;
          const isBlackCatCliff = x > -10 && x < 28 && z > 24 && z < 39;
          const rockRgb: [number, number, number] = isBlackCatCliff
            ? [86 + strata * 0.6, 84 + strata * 0.6, 88 + strata * 0.6]
            : [164 + strata, 128 + strata * 0.8, 92 + strata * 0.6];
          rgb = mixRgb(rgb, rockRgb, cliffT);
        }

        // Kaya's trimmed manor estate lawn
        if (inKaya) {
          const trimStripe = ((Math.floor(x * 0.8) & 1) === 0) ? 6 : -4;
          rgb = [126 + trimStripe, 198 + trimStripe, 84 + trimStripe];
        }

        // Honey Town gray cobblestone plaza & eastern harbor quay
        if (inHoney) {
          const tile =
            ((Math.floor(x * 0.9) + Math.floor(z * 0.9)) & 1) === 0 ? 5 : -5;
          rgb = [204 + tile, 208 + tile, 214 + tile];
        }

        // Dirt roads & coastal slopes
        const roadD = geckoRoadSignedDist(x, z);
        if (roadD < 0.48 && h > 0.05 && !inHoney) {
          const roadT = 1 - smoothstep(-0.18, 0.45, roadD);
          const grain = (valueNoise2D(x * 2.2, z * 2.2) - 0.5) * 16;
          const roadTone: [number, number, number] = [
            222 + grain,
            188 + grain,
            128 + grain,
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

  // Timber frame corner beams & horizontal lintel
  ctx.fillStyle = '#6f4e37';
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
      ctx.strokeStyle = '#ece1cf';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, 148, 48, 84);
    } else {
      ctx.fillStyle = '#293949';
      ctx.fillRect(x, 146, 44, 46);
      ctx.strokeStyle = '#ece1cf';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, 146, 44, 46);
    }
    ctx.fillStyle = '#293949';
    ctx.fillRect(x + 4, 44, 38, 42);
    ctx.strokeStyle = '#ece1cf';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, 44, 38, 42);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMansionFacadeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Warm cream/ivory stone wall (image_34f27283.png)
  ctx.fillStyle = '#f6eed8';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#d9cfb8';
  ctx.fillRect(0, 230, 512, 26);
  ctx.fillRect(0, 124, 512, 8);
  ctx.fillRect(0, 0, 512, 10);

  // Symmetrical arched central window & tall flanking manor windows
  const cols = [44, 124, 224, 344, 424];
  for (let i = 0; i < cols.length; i++) {
    const x = cols[i];
    const w = i === 2 ? 64 : 44;
    // Upper floor window
    ctx.fillStyle = '#405e7c';
    ctx.fillRect(x, 38, w, 60);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, 38, w, 60);
    ctx.fillRect(x + w / 2 - 1, 38, 2, 60);
    ctx.fillRect(x, 66, w, 2);

    // Ground floor (central arched double entry)
    ctx.fillStyle = i === 2 ? '#293645' : '#405e7c';
    ctx.fillRect(x, 146, w, i === 2 ? 84 : 62);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(x, 146, w, i === 2 ? 84 : 62);
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
  style: 'hip' | 'gable' | 'mansard'
): THREE.BufferGeometry {
  const hw = width * 0.5 + 0.3;
  const hd = depth * 0.5 + 0.3;
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
  group.name = 'island-gecko';

  const placeOnSphere = (
    obj: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    yaw = 0
  ) => {
    const sp = toGeckoSphereLocal(x, y, z, globeRadius);
    obj.position.set(sp.x, sp.y, sp.z);
    _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, yaw);
    obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    obj.scale.multiplyScalar(S);
  };

  // 1. Sculpted 160x160 Gecko Terrain Mesh + 1024x1024 Painted Relief Texture
  const segs = 160;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(GECKO_WORLD_SIZE, GECKO_WORLD_SIZE, segs, segs)
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const posArr = posAttr.array as Float32Array;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posArr[i * 3];
    const z = posArr[i * 3 + 2];
    const h = sampleGeckoHeight(x, z);
    const sp = toGeckoSphereLocal(x, h, z, globeRadius);
    posArr[i * 3] = sp.x;
    posArr[i * 3 + 1] = sp.y;
    posArr[i * 3 + 2] = sp.z;
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainTex = regTex(createGeckoTerrainTexture(1024));
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

  const whiteFenceMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf7f5ef, roughness: 0.7, metalness: 0.03 })
  );
  const ivoryWallMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf6eed8, roughness: 0.72, metalness: 0.04 })
  );
  const stoneGrayMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x9aa2ad, roughness: 0.85, metalness: 0.05 })
  );
  const basaltRockMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x45484f, roughness: 0.9, metalness: 0.05 })
  );
  const seaRockMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x767a84, roughness: 0.88, metalness: 0.04 })
  );
  const timberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x784a2a, roughness: 0.82, metalness: 0.04 })
  );
  const wroughtIronMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x222730, roughness: 0.45, metalness: 0.25 })
  );
  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xebb238, roughness: 0.4, metalness: 0.25 })
  );
  const slateBlueRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4b6e97,
      map: roofShingleTex,
      roughness: 0.65,
      metalness: 0.06,
    })
  );
  const crimsonMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb93228, roughness: 0.72, metalness: 0.05 })
  );
  const blackCatHullMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x262932, roughness: 0.62, metalness: 0.14 })
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
    style: 'hip' | 'gable' | 'mansard'
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

  // 2. KAYA'S MANSION & WALLED ESTATE (faithful to image_34f27283.png)
  {
    const estate = new THREE.Group();
    const manorTex = regTex(createMansionFacadeTexture());
    const manorWallMat = trackMat(
      new THREE.MeshStandardMaterial({ map: manorTex, roughness: 0.74, metalness: 0.04 })
    );

    // Main 2-story Ivory Chateau at local (0, 0, 0), facing West (-X)
    const chateau = new THREE.Mesh(unitBox, manorWallMat);
    chateau.scale.set(5.4, 4.4, 10.2);
    chateau.position.y = 2.2;
    estate.add(chateau);

    // Slate-blue mansard roof
    const mansard = new THREE.Mesh(
      getRoofGeo(5.6, 10.4, 2.0, 'mansard'),
      slateBlueRoofMat
    );
    mansard.position.y = 4.4;
    estate.add(mansard);

    // 4 pitched dormer windows flanking central crest (2 north, 2 south) with dark window glass
    const windowGlassMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x2f4e6f, roughness: 0.25, metalness: 0.15 })
    );
    for (const dz of [-3.6, -2.0, 2.0, 3.6]) {
      const dormerBody = new THREE.Mesh(unitBox, ivoryWallMat);
      dormerBody.scale.set(1.2, 1.0, 0.9);
      dormerBody.position.set(-2.35, 5.1, dz);
      const dormerGlass = new THREE.Mesh(unitBox, windowGlassMat);
      dormerGlass.scale.set(0.08, 0.56, 0.48);
      dormerGlass.position.set(-2.96, 5.05, dz);
      const dormerRoof = new THREE.Mesh(
        getRoofGeo(1.25, 0.96, 0.55, 'gable'),
        slateBlueRoofMat
      );
      dormerRoof.position.set(-2.35, 5.6, dz);
      estate.add(dormerBody, dormerGlass, dormerRoof);
    }

    // Central front arched crest pediment + golden emblem + curved second-floor balcony portico
    const pediment = new THREE.Mesh(unitBox, ivoryWallMat);
    pediment.scale.set(1.1, 1.35, 2.4);
    pediment.position.set(-2.45, 5.08, 0);
    const pedimentArch = new THREE.Mesh(unitCyl, ivoryWallMat);
    pedimentArch.rotation.z = Math.PI * 0.5;
    pedimentArch.scale.set(1.1, 1.1, 1.2);
    pedimentArch.position.set(-2.45, 5.75, 0);
    const archTrim = new THREE.Mesh(unitCyl, slateBlueRoofMat);
    archTrim.rotation.z = Math.PI * 0.5;
    archTrim.scale.set(1.22, 0.96, 1.32);
    archTrim.position.set(-2.42, 5.78, 0);
    const crestRing = new THREE.Mesh(unitCyl, whiteFenceMat);
    crestRing.rotation.z = Math.PI * 0.5;
    crestRing.scale.set(0.58, 0.14, 0.58);
    crestRing.position.set(-3.01, 5.6, 0);
    const crestDisc = new THREE.Mesh(unitCyl, goldMat);
    crestDisc.rotation.z = Math.PI * 0.5;
    crestDisc.scale.set(0.42, 0.22, 0.42);
    crestDisc.position.set(-3.05, 5.6, 0);

    const porticoDeck = new THREE.Mesh(unitCyl, whiteFenceMat);
    porticoDeck.scale.set(1.5, 0.28, 1.8);
    porticoDeck.position.set(-2.9, 2.3, 0);
    const porticoRail = new THREE.Mesh(unitCyl, whiteFenceMat);
    porticoRail.scale.set(1.55, 0.45, 1.85);
    porticoRail.position.set(-2.9, 2.65, 0);
    for (const pz of [-1.2, 1.2]) {
      const col = new THREE.Mesh(unitCyl, whiteFenceMat);
      col.scale.set(0.18, 2.3, 0.18);
      col.position.set(-3.55, 1.15, pz);
      estate.add(col);
    }
    estate.add(pediment, pedimentArch, archTrim, crestRing, crestDisc, porticoDeck, porticoRail);

    // Rectangular white perimeter fence & stone base around estate (local x: -8.0..+7.2, z: -9.0..+9.0)
    const fenceSegments: readonly [number, number, number, number][] = [
      // North fence
      [-0.4, -9.0, 15.2, 0.35],
      // South fence
      [-0.4, 9.0, 15.2, 0.35],
      // East rear fence
      [7.2, 0, 0.35, 18.0],
      // West front fence (split for iron arched gate z in [-1.8..+1.8])
      [-8.0, -5.4, 0.35, 7.2],
      [-8.0, 5.4, 0.35, 7.2],
    ];
    for (const [fx, fz, fw, fd] of fenceSegments) {
      const fBase = new THREE.Mesh(unitBox, stoneGrayMat);
      fBase.scale.set(fw, 0.45, fd);
      fBase.position.set(fx, 0.22, fz);
      const fTop = new THREE.Mesh(unitBox, whiteFenceMat);
      fTop.scale.set(fw * 0.92, 1.15, fd * 0.92);
      fTop.position.set(fx, 1.0, fz);
      estate.add(fBase, fTop);
    }
    // Rhythmic stone piers along the front West wall (matching image_34f27283.png)
    for (const pz of [-8.9, -5.4, -1.9, 1.9, 5.4, 8.9]) {
      const pier = new THREE.Mesh(unitBox, whiteFenceMat);
      pier.scale.set(0.55, 1.9, 0.55);
      pier.position.set(-8.0, 0.95, pz);
      const cap = new THREE.Mesh(unitBox, stoneGrayMat);
      cap.scale.set(0.68, 0.16, 0.68);
      cap.position.set(-8.0, 1.96, pz);
      estate.add(pier, cap);
    }

    // Arched black wrought-iron overhead frame + vertical bar gate leaves
    const gateArchTop = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.85, 0.09, 6, 18, Math.PI)),
      wroughtIronMat
    );
    gateArchTop.rotation.y = Math.PI * 0.5;
    gateArchTop.position.set(-8.0, 2.05, 0);
    const gateHeaderBar = new THREE.Mesh(unitBox, wroughtIronMat);
    gateHeaderBar.scale.set(0.14, 0.14, 3.8);
    gateHeaderBar.position.set(-8.0, 2.08, 0);
    estate.add(gateArchTop, gateHeaderBar);

    // Open wrought-iron gate leaves built from slender vertical pickets & rails
    for (const gz of [-1, 1]) {
      const leafGroup = new THREE.Group();
      leafGroup.position.set(-7.95, 0.2, gz * 1.75);
      leafGroup.rotation.y = gz * 0.92;
      const dir = -gz;
      for (const frac of [0.15, 0.35, 0.55, 0.75, 0.95]) {
        const picket = new THREE.Mesh(unitBox, wroughtIronMat);
        picket.scale.set(0.06, 1.7, 0.06);
        picket.position.set(0, 0.85, dir * frac * 1.45);
        leafGroup.add(picket);
      }
      for (const ry of [0.25, 0.9, 1.65]) {
        const rail = new THREE.Mesh(unitBox, wroughtIronMat);
        rail.scale.set(0.07, 0.07, 1.45);
        rail.position.set(0, ry, dir * 0.725);
        leafGroup.add(rail);
      }
      estate.add(leafGroup);
    }

    // Trimmed ornamental garden hedges along driveway
    const hedgeMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x3b8f38, roughness: 0.85 })
    );
    for (const hz of [-2.4, 2.4]) {
      for (const hx of [-6.4, -4.6]) {
        const bush = new THREE.Mesh(
          trackGeo(new THREE.DodecahedronGeometry(0.5, 0)),
          hedgeMat
        );
        bush.position.set(hx, 0.42, hz);
        estate.add(bush);
      }
    }

    placeOnSphere(
      estate,
      GECKO_LANDMARKS.kayaMansion.x,
      GECKO_MANSION_Y,
      GECKO_LANDMARKS.kayaMansion.z,
      0
    );
    group.add(estate);
  }

  // 3. HONEY TOWN BRIDGES, SEAWALL QUAY, FOUNTAIN & STREET LANTERNS
  {
    // West Stone Bridge (41.5, -24.0) & East Stone Bridge (77.5, -16.5)
    for (const bx of [GECKO_LANDMARKS.honeyWestBridge, GECKO_LANDMARKS.honeyEastBridge]) {
      const br = new THREE.Group();
      const deck = new THREE.Mesh(unitBox, stoneGrayMat);
      deck.scale.set(6.8, 0.65, 4.4);
      deck.position.y = -0.25;
      br.add(deck);
      for (const sz of [-2.0, 2.0]) {
        const parapet = new THREE.Mesh(unitBox, whiteFenceMat);
        parapet.scale.set(6.8, 0.7, 0.35);
        parapet.position.set(0, 0.42, sz);
        br.add(parapet);
      }
      for (const px of [-2.4, 2.4]) {
        const pier = new THREE.Mesh(unitBox, stoneGrayMat);
        pier.scale.set(1.1, 3.6, 4.0);
        pier.position.set(px, -2.0, 0);
        br.add(pier);
      }
      placeOnSphere(br, bx.x, bx.y, bx.z, bx === GECKO_LANDMARKS.honeyEastBridge ? -0.3 : 0.05);
      group.add(br);
    }

    // Honey Town East Harbor Stone Quay Wall
    const quayWall = new THREE.Mesh(unitBox, stoneGrayMat);
    quayWall.scale.set(1.3, 2.4, 26.0);
    placeOnSphere(quayWall, 83.2, GECKO_QUAY_Y - 0.5, -1.0, 0.22);
    group.add(quayWall);

    // Tiered Stone Fountain Plaza in Honey Town NE square
    const fountain = new THREE.Group();
    const baseStep = new THREE.Mesh(unitCyl, stoneGrayMat);
    baseStep.scale.set(2.55, 0.25, 2.55);
    baseStep.position.y = 0.12;
    const rim = new THREE.Mesh(unitCyl, whiteFenceMat);
    rim.scale.set(2.15, 0.5, 2.15);
    rim.position.y = 0.42;
    const fWater = new THREE.Mesh(unitCyl, waterMat);
    fWater.scale.set(1.88, 0.14, 1.88);
    fWater.position.y = 0.62;
    const pedestal = new THREE.Mesh(unitCyl, whiteFenceMat);
    pedestal.scale.set(0.42, 1.15, 0.42);
    pedestal.position.y = 1.05;
    const upperBowl = new THREE.Mesh(unitCyl, whiteFenceMat);
    upperBowl.scale.set(1.05, 0.24, 1.05);
    upperBowl.position.y = 1.55;
    const upperWater = new THREE.Mesh(unitCyl, waterMat);
    upperWater.scale.set(0.88, 0.12, 0.88);
    upperWater.position.y = 1.66;
    const topFinial = new THREE.Mesh(unitCyl, stoneGrayMat);
    topFinial.scale.set(0.24, 0.65, 0.24);
    topFinial.position.y = 1.95;
    const jetPlume = new THREE.Mesh(unitCyl, waterMat);
    jetPlume.scale.set(0.14, 0.5, 0.14);
    jetPlume.position.y = 2.42;
    fountain.add(baseStep, rim, fWater, pedestal, upperBowl, upperWater, topFinial, jetPlume);
    placeOnSphere(
      fountain,
      GECKO_LANDMARKS.honeyFountain.x,
      GECKO_HONEY_Y,
      GECKO_LANDMARKS.honeyFountain.z,
      0
    );
    group.add(fountain);

    // Warm wrought-iron plaza street lamps along Honey Town square
    const lampGlowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffe49c,
        emissive: 0xffb84d,
        emissiveIntensity: 0.75,
        roughness: 0.3,
      })
    );
    for (const [lx, lz] of [
      [51.5, -26.5],
      [62.0, -27.5],
      [72.5, -21.5],
      [53.5, -19.5],
    ]) {
      const lamp = new THREE.Group();
      const post = new THREE.Mesh(unitCyl, wroughtIronMat);
      post.scale.set(0.09, 2.3, 0.09);
      post.position.y = 1.15;
      const globe = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.22, 8, 8)),
        lampGlowMat
      );
      globe.position.y = 2.42;
      lamp.add(post, globe);
      placeOnSphere(lamp, lx, GECKO_HONEY_Y, lz, 0);
      group.add(lamp);
    }
  }

  // 4. BLACK CAT HIDEOUT CLIFF CAVE, PIRATE TENT & BEZAN BLACK FLAGSHIP
  let campfireCore: THREE.Mesh | null = null;
  {
    // Dark Basalt Sea-Cave Mouth sculpted cleanly into the cliff behind Black Cat Beach
    const cave = new THREE.Group();
    const caveVoid = new THREE.Mesh(unitBox, wroughtIronMat);
    caveVoid.scale.set(4.2, 3.2, 2.4);
    caveVoid.position.set(0, 1.5, -0.4);
    cave.add(caveVoid);
    for (const [rx, ry, rz, sx, sy, sz] of [
      [-2.35, 1.55, 0.25, 1.7, 3.4, 1.9],
      [2.35, 1.55, 0.25, 1.7, 3.4, 1.9],
      [0, 3.25, 0.35, 5.6, 1.6, 2.0],
    ] as const) {
      const archRock = new THREE.Mesh(
        trackGeo(new THREE.DodecahedronGeometry(0.85, 0)),
        basaltRockMat
      );
      archRock.scale.set(sx, sy, sz);
      archRock.position.set(rx, ry, rz);
      cave.add(archRock);
    }
    placeOnSphere(
      cave,
      GECKO_LANDMARKS.blackCatCave.x,
      GECKO_BLACK_CAT_BEACH_Y,
      GECKO_LANDMARKS.blackCatCave.z,
      0
    );
    group.add(cave);

    // Striped Red/Black Pirate Camp Tent + Glowing Bonfire on Black Cat Beach
    const camp = new THREE.Group();
    const tentCone = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.6, 2.0, 6)),
      crimsonMat
    );
    tentCone.position.set(0, 1.0, 0);
    const tentTrim = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.66, 0.7, 6)),
      blackCatHullMat
    );
    tentTrim.position.set(0, 1.65, 0);
    // Bonfire logs + glowing ember core beside tent
    const emberMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff7b1a,
        emissive: 0xff4500,
        emissiveIntensity: 0.95,
        roughness: 0.4,
      })
    );
    campfireCore = new THREE.Mesh(
      trackGeo(new THREE.DodecahedronGeometry(0.38, 0)),
      emberMat
    );
    campfireCore.position.set(-2.5, 0.35, 1.2);
    for (const rot of [0.4, -0.5, 1.3]) {
      const log = new THREE.Mesh(unitCyl, timberMat);
      log.scale.set(0.11, 1.1, 0.11);
      log.position.set(-2.5, 0.16, 1.2);
      log.rotation.set(Math.PI * 0.45, rot, 0);
      camp.add(log);
    }
    camp.add(tentCone, tentTrim, campfireCore);
    placeOnSphere(camp, 15.2, GECKO_BLACK_CAT_BEACH_Y - 0.1, 41.2, -0.2);
    group.add(camp);

    // THE BEZAN BLACK (Kuro's Iconic Black Cat Pirate Ship anchored off the cove!)
    const ship = new THREE.Group();
    const hull = new THREE.Mesh(unitBox, blackCatHullMat);
    hull.scale.set(3.2, 1.5, 9.2);
    hull.position.y = 0.55;
    const deck = new THREE.Mesh(unitBox, timberMat);
    deck.scale.set(2.8, 0.2, 8.6);
    deck.position.y = 1.35;
    const crimsonRail = new THREE.Mesh(unitBox, crimsonMat);
    crimsonRail.scale.set(3.35, 0.3, 9.35);
    crimsonRail.position.y = 1.35;
    ship.add(hull, deck, crimsonRail);

    // 3 circular deck hatches (matching gecko_syrup_00c9644e.png top-down)
    for (const hz of [-2.4, 0, 2.4]) {
      const hatch = new THREE.Mesh(unitCyl, basaltRockMat);
      hatch.scale.set(0.65, 0.25, 0.65);
      hatch.position.set(0, 1.5, hz);
      ship.add(hatch);
    }

    // Clawed side paddle-oars (3 per side)
    for (const sx of [-1, 1]) {
      for (const oz of [-1.8, 0, 1.8]) {
        const oar = new THREE.Mesh(unitBox, blackCatHullMat);
        oar.scale.set(1.6, 0.14, 0.4);
        oar.position.set(sx * 2.1, 0.55, oz);
        oar.rotation.z = sx * -0.25;
        ship.add(oar);
      }
    }

    // Iconic Black Cat Head Figurehead at the Prow (+Z bow)
    const catHead = new THREE.Mesh(
      trackGeo(new THREE.DodecahedronGeometry(1.15, 0)),
      blackCatHullMat
    );
    catHead.scale.set(1.05, 0.95, 1.25);
    catHead.position.set(0, 1.4, 5.2);
    ship.add(catHead);
    for (const ex of [-0.55, 0.55]) {
      const ear = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.32, 0.9, 4)),
        blackCatHullMat
      );
      ear.position.set(ex, 2.35, 4.95);
      const eye = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.18, 6, 6)),
        goldMat
      );
      eye.position.set(ex * 0.72, 1.55, 6.25);
      ship.add(ear, eye);
    }

    // Twin masts + dark sails
    const sailMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xe6dfd3, roughness: 0.72, metalness: 0.02 })
    );
    for (const [mz, mh] of [
      [-1.5, 5.6],
      [1.8, 6.6],
    ]) {
      const mast = new THREE.Mesh(unitCyl, timberMat);
      mast.scale.set(0.13, mh, 0.13);
      mast.position.set(0, 1.4 + mh * 0.5, mz);
      const sail = new THREE.Mesh(unitBox, sailMat);
      sail.scale.set(3.4, mh * 0.52, 0.16);
      sail.position.set(0, 1.7 + mh * 0.52, mz + 0.18);
      ship.add(mast, sail);
    }

    placeOnSphere(
      ship,
      GECKO_LANDMARKS.bezanBlack.x,
      GECKO_LANDMARKS.bezanBlack.y,
      GECKO_LANDMARKS.bezanBlack.z,
      GECKO_LANDMARKS.bezanBlack.yaw
    );
    group.add(ship);
  }

  // 5. SYRUP VILLAGE COTTAGES, HONEY TOWN HOUSES & BLACK CAT CAMP SHACKS
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

  for (const b of GECKO_BUILDINGS) {
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
      chimney.scale.set(0.45, 1.1, 0.45);
      chimney.position.set(b.width * 0.28, b.height + roofH * 0.55, 0);
      hGroup.add(chimney);
    }

    placeOnSphere(hGroup, b.x, b.y - 0.06, b.z, b.yaw);
    group.add(hGroup);
  }

  // 6. RUSTIC WOODEN ROADSIDE FENCES IN SYRUP VILLAGE (image_b7163619.png)
  for (const f of GECKO_FENCES) {
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
    placeOnSphere(fence, mx, sampleGeckoHeight(mx, mz), mz, yaw);
    group.add(fence);
  }

  // 7. COASTAL BOULDERS
  for (const rk of GECKO_ROCKS) {
    const rock = new THREE.Mesh(
      trackGeo(new THREE.DodecahedronGeometry(1, 0)),
      seaRockMat
    );
    rock.scale.set(rk.scaleX, rk.scaleY, rk.scaleZ);
    placeOnSphere(rock, rk.x, rk.y, rk.z, rk.yaw);
    group.add(rock);
  }

  // 8. INSTANCED MULTI-SPECIES FOREST (BROADLEAF, PINE, CYPRESS & PALMS)
  const leafMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84, metalness: 0.02 })
  );

  const broadleafTrees = GECKO_TREES.filter((t) => t.kind === 'broadleaf');
  const pineTrees = GECKO_TREES.filter((t) => t.kind === 'pine');
  const cypressTrees = GECKO_TREES.filter((t) => t.kind === 'cypress');
  const palmTrees = GECKO_TREES.filter((t) => t.kind === 'palm');

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
      const sp = toGeckoSphereLocal(t.x, t.y, t.z, globeRadius);
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
      _tmpColor.setRGB(0.18 * t.tint, 0.58 * t.tint, 0.2 * t.tint);
      c1Inst.setColorAt(idx, _tmpColor);
      _tmpColor.setRGB(0.14 * t.tint, 0.49 * t.tint, 0.16 * t.tint);
      c2Inst.setColorAt(idx, _tmpColor);
    });
    tInst.instanceMatrix.needsUpdate = true;
    c1Inst.instanceMatrix.needsUpdate = true;
    c2Inst.instanceMatrix.needsUpdate = true;
    if (c1Inst.instanceColor) c1Inst.instanceColor.needsUpdate = true;
    if (c2Inst.instanceColor) c2Inst.instanceColor.needsUpdate = true;
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
      const sp = toGeckoSphereLocal(t.x, t.y, t.z, globeRadius);
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
      _tmpColor.setRGB(0.11 * t.tint, 0.45 * t.tint, 0.17 * t.tint);
      c1Inst.setColorAt(idx, _tmpColor);
      _tmpColor.setRGB(0.14 * t.tint, 0.52 * t.tint, 0.2 * t.tint);
      c2Inst.setColorAt(idx, _tmpColor);
    });
    ptInst.instanceMatrix.needsUpdate = true;
    c1Inst.instanceMatrix.needsUpdate = true;
    c2Inst.instanceMatrix.needsUpdate = true;
    if (c1Inst.instanceColor) c1Inst.instanceColor.needsUpdate = true;
    if (c2Inst.instanceColor) c2Inst.instanceColor.needsUpdate = true;
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
      const sp = toGeckoSphereLocal(t.x, t.y, t.z, globeRadius);
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
    group.add(ctInst, ccInst);
  }

  if (palmTrees.length > 0) {
    const pTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.19, 2.4, 7));
    pTrunkGeo.translate(0, 1.2, 0);
    const pFrondGeo = trackGeo(createPalmFrondCanopyGeo());
    const ptInst = new THREE.InstancedMesh(pTrunkGeo, timberMat, palmTrees.length);
    const pfInst = new THREE.InstancedMesh(pFrondGeo, leafMat, palmTrees.length);

    palmTrees.forEach((t, idx) => {
      const sp = toGeckoSphereLocal(t.x, t.y, t.z, globeRadius);
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

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      if (campfireCore) {
        const s = 0.9 + Math.sin(elapsed * 5.2) * 0.14;
        campfireCore.scale.setScalar(s);
      }
    },
  };
}
