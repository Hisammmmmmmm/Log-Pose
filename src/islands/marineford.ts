import * as THREE from 'three';
import {
  MARINEFORD_BAY_CENTER,
  MARINEFORD_BAY_RADIUS,
  MARINEFORD_GLOBE_SCALE,
  MARINEFORD_KEEP_POS,
  MARINEFORD_SCAFFOLD_POS,
  MARINEFORD_WALL_CENTER,
  MARINEFORD_WALL_RADIUS_X,
  MARINEFORD_WALL_RADIUS_Z,
  MARINEFORD_WORLD_SIZE,
  buildMarinefordCannons,
  buildMarinefordHouses,
  buildMarinefordShips,
  buildMarinefordTents,
  buildMarinefordTrees,
  buildMarinefordWatchtowers,
  marinefordBaySignedDist,
  marinefordCoastSignedDist,
  marinefordRoadSignedDist,
  sampleMarinefordHeight,
  toMarinefordSphereLocal,
} from '../utils/marinefordTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = MARINEFORD_GLOBE_SCALE;
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

function createMarinefordTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = MARINEFORD_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * MARINEFORD_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * MARINEFORD_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const bayD = marinefordBaySignedDist(x, z);
      const coastD = marinefordCoastSignedDist(x, z);
      const h = sampleMarinefordHeight(x, z);
      const hx = sampleMarinefordHeight(x + 1.0, z);
      const hz = sampleMarinefordHeight(x, z + 1.0);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 2.2, 0, 1);

      const grain = (valueNoise2D(x * 1.4, z * 1.4) - 0.5) * 14;
      const macroNoise = valueNoise2D(x * 0.14, z * 0.14);

      // Base lush coastal meadow grass & mossy earth
      let rgb: [number, number, number] = mixRgb(
        [72, 118, 66],
        [106, 146, 82],
        macroNoise
      );

      // SW Encampment dry sandy clearing
      const dSwCamp = Math.hypot(x + 68, z - 38);
      if (dSwCamp < 15.5) {
        const campT = 1 - smoothstep(9.0, 15.5, dSwCamp);
        rgb = mixRgb(rgb, [196, 182, 148], campT * 0.85);
      }

      // Rocky cliffs along shore, lookouts, and jagged northern mountain backdrop
      if (slope > 0.22 || h > 11.5) {
        const rockT = Math.max(
          smoothstep(0.22, 0.62, slope),
          smoothstep(11.5, 22.0, h)
        );
        const strata = Math.sin(h * 1.6 + macroNoise * 2.5) * 10;
        const cliffRgb: [number, number, number] = [
          126 + strata,
          124 + strata,
          118 + strata,
        ];
        rgb = mixRgb(rgb, cliffRgb, rockT * 0.92);
      }

      // Oris Plaza grand grid-scored limestone flagstones & courtyard paving
      const roadD = marinefordRoadSignedDist(x, z);
      if (roadD < 0.55) {
        const roadT = 1 - smoothstep(-0.25, 0.55, roadD);
        const inPlaza = Math.abs(x) <= 30 && z >= -32 && z <= -2;
        if (inPlaza) {
          // Ceremonial limestone plaza slabs (grid-scored like reference illustration)
          const gx = Math.abs(((x % 5.5) + 5.5) % 5.5);
          const gz = Math.abs(((z % 5.5) + 5.5) % 5.5);
          const grout = gx < 0.28 || gz < 0.28 ? -20 : 0;
          rgb = mixRgb(rgb, [232 + grout, 226 + grout, 210 + grout], roadT);
        } else {
          const cobble =
            Math.sin(x * 4.2) * Math.sin(z * 4.2) * 6;
          const isCurb = roadD > -0.22 && roadD < 0.25;
          const pathRgb: [number, number, number] = isCurb
            ? [224, 218, 204]
            : [198 + cobble, 194 + cobble, 182 + cobble];
          rgb = mixRgb(rgb, pathRgb, roadT * 0.92);
        }
      }

      // Inner Crescent Quay limestone paving
      const rBay = Math.hypot(
        x - MARINEFORD_BAY_CENTER.x,
        z - MARINEFORD_BAY_CENTER.z
      );
      if (bayD >= -0.4 && rBay < MARINEFORD_BAY_RADIUS + 11.5 && z > -8) {
        const quayT = 1 - smoothstep(MARINEFORD_BAY_RADIUS + 8.0, MARINEFORD_BAY_RADIUS + 11.5, rBay);
        rgb = mixRgb(rgb, [218, 214, 204], quayT * 0.72);
      }

      // Sandy / pale rock shoreline transition
      if (coastD > -2.5 || bayD < 1.2) {
        const edgeT = Math.max(
          smoothstep(-2.5, 0.5, coastD),
          1 - smoothstep(-0.5, 1.4, bayD)
        );
        rgb = mixRgb(rgb, [168, 162, 146], edgeT * 0.7);
      }

      // Crisp coastal cutout so surrounding ocean mesh handles deep sea
      const landAlpha =
        (1 - smoothstep(-0.5, 2.8, coastD)) * smoothstep(-1.2, 0.8, bayD);

      data[idx] = clamp(Math.round(rgb[0] + grain), 0, 255);
      data[idx + 1] = clamp(Math.round(rgb[1] + grain), 0, 255);
      data[idx + 2] = clamp(Math.round(rgb[2] + grain), 0, 255);
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

function createMarinefordWaterTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = MARINEFORD_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * MARINEFORD_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * MARINEFORD_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const bayD = marinefordBaySignedDist(x, z);
      const coastD = marinefordCoastSignedDist(x, z);
      const wave =
        valueNoise2D(x * 0.14 + 3.1, z * 0.14 + 7.2) * 0.65 +
        valueNoise2D(x * 0.34, z * 0.34) * 0.35;

      let alpha = 0;
      let rgb: [number, number, number] = [44, 158, 208];

      // Shallow turquoise Oris Bay water + coastal reef halo
      if (bayD < 2.2) {
        const shoreFoam = 1 - smoothstep(0.0, 2.8, Math.abs(bayD));
        const depthT = clamp(-bayD / 24.0, 0, 1);
        rgb = mixRgb([76, 198, 232], [28, 128, 188], depthT);
        rgb = mixRgb(rgb, [215, 246, 255], shoreFoam * 0.62 + wave * 0.14);
        alpha = smoothstep(2.2, -0.5, bayD) * 0.92;
      } else if (coastD > -1.5 && coastD < 34.0) {
        const inF = smoothstep(-1.5, 2.0, coastD);
        const outF = 1 - smoothstep(10.0, 34.0, coastD);
        const surf = 1 - smoothstep(0.0, 3.0, Math.abs(coastD - 1.2));
        rgb = mixRgb([64, 186, 224], [22, 108, 166], smoothstep(0, 28, coastD));
        rgb = mixRgb(rgb, [210, 244, 254], surf * 0.65 + wave * 0.12);
        alpha = inF * outF * 0.86;
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

function createStoneBumpTexture(size = 256): THREE.CanvasTexture {
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
        valueNoise2D((x / size) * 22, (y / size) * 22) * 0.6 +
        valueNoise2D((x / size) * 58, (y / size) * 58) * 0.4;
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
 * Draws Marineford's iconic tall white fortress facade bearing bold black Kanji "海" & "軍"
 * flanking the central Marine Seagull Emblem & arched entrance (matching marinford_2ab8bc69.webp).
 */
function createMarineHQFacadeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Warm limestone fortress wall
  ctx.fillStyle = '#eeeae0';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle horizontal masonry lines
  ctx.strokeStyle = 'rgba(130, 126, 118, 0.28)';
  ctx.lineWidth = 2;
  for (let y = 32; y < 512; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Upper fortress arched window slits
  ctx.fillStyle = '#2b2f38';
  for (let x = 36; x <= 476; x += 44) {
    ctx.fillRect(x - 6, 48, 12, 22);
    ctx.fillRect(x - 6, 98, 12, 20);
  }

  // Iconic bold Kanji "海" (left) and "軍" (right) in deep ink black
  ctx.fillStyle = '#14171c';
  ctx.font = '900 170px "Noto Sans JP", "Hiragino Kaku Gothic Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('海', 115, 290);
  ctx.fillText('軍', 397, 290);

  // Central Marine Seagull Emblem (stylized gull wings & halo above portal)
  ctx.strokeStyle = '#16243b';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(256, 250, 26, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(256, 245);
  ctx.quadraticCurveTo(222, 224, 198, 252);
  ctx.moveTo(256, 245);
  ctx.quadraticCurveTo(290, 224, 314, 252);
  ctx.stroke();

  // Grand arched HQ Fortress entrance portal at base center
  ctx.fillStyle = '#1c1816';
  ctx.beginPath();
  ctx.arc(256, 420, 32, Math.PI, 0);
  ctx.lineTo(288, 512);
  ctx.lineTo(224, 512);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createGableRoofGeometry(): THREE.BufferGeometry {
  const hw = 0.54;
  const hd = 0.54;
  const h = 0.54;
  const vertices = new Float32Array([
    -hw, 0, hd,  hw, 0, hd,  hw, h, 0,
    -hw, 0, hd,  hw, h, 0,  -hw, h, 0,
     hw, 0, -hd, -hw, 0, -hd, -hw, h, 0,
     hw, 0, -hd, -hw, h, 0,   hw, h, 0,
    -hw, 0, -hd, -hw, 0, hd, -hw, h, 0,
     hw, 0, hd,   hw, 0, -hd, hw, h, 0,
    -hw, 0, -hd, hw, 0, -hd, hw, 0, hd,
    -hw, 0, -hd, hw, 0, hd, -hw, 0, hd,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
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
  const pos = toMarinefordSphereLocal(x, y, z, globeRadius);
  _localNormal.set(pos.x, globeRadius + pos.y, pos.z).normalize();
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

function placeOnMarinefordSphere(
  obj: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  globeRadius: number,
  yaw = 0
): void {
  const pos = toMarinefordSphereLocal(x, y, z, globeRadius);
  obj.position.set(pos.x, pos.y, pos.z);
  _localNormal.set(pos.x, globeRadius + pos.y, pos.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

/**
 * Marineford — Faithful 3D model combining marinford_2ab8bc69.webp & marine_ford_6704c00e.JPG:
 * crescent Oris Bay & harbor mouth, crenellated ramparts with terracotta pagoda watchtowers
 * and twin-barrel naval cannons, grid-paved Oris Plaza & twin-stair Execution Platform,
 * towering Marine HQ Keep with bold "海軍" facade & 3-tier Japanese pagoda crown, twin
 * cylindrical bastion towers, flanking town quarters with terracotta/teal roofs & paved paths,
 * SW encampment peninsula, cliffside waterfall & lookouts, warships, and northern mountain range.
 */
export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const group = new THREE.Group();
  group.name = 'island-marineford';

  const registerTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;

  // 1. Curved Spherical Island Terrain & Mountain Range (192 x 192)
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(MARINEFORD_WORLD_SIZE, MARINEFORD_WORLD_SIZE, 192, 192)
  );
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const ly = sampleMarinefordHeight(lx, lz);
    const projected = toMarinefordSphereLocal(lx, ly, lz, globeRadius);
    posAttr.setXYZ(i, projected.x, projected.y, projected.z);
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainTex = registerTex(createMarinefordTerrainTexture(1024));
  const bumpTex = registerTex(createStoneBumpTexture(256));
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      bumpMap: bumpTex,
      bumpScale: 0.0035,
      roughness: 0.84,
      metalness: 0.04,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.castShadow = true;
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // 2. Shallow Turquoise Oris Bay & Coastal Surf Lagoon Skirt
  const waterGeo = trackGeo(
    new THREE.PlaneGeometry(MARINEFORD_WORLD_SIZE, MARINEFORD_WORLD_SIZE, 72, 72)
  );
  waterGeo.rotateX(-Math.PI / 2);
  const wAttr = waterGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < wAttr.count; i++) {
    const lx = wAttr.getX(i);
    const lz = wAttr.getZ(i);
    const projected = toMarinefordSphereLocal(lx, 0.12, lz, globeRadius);
    wAttr.setXYZ(i, projected.x, projected.y, projected.z);
  }
  wAttr.needsUpdate = true;
  waterGeo.computeVertexNormals();

  const waterTex = registerTex(createMarinefordWaterTexture(1024));
  const waterMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: waterTex,
      roughness: 0.16,
      metalness: 0.16,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  group.add(new THREE.Mesh(waterGeo, waterMat));

  // Shared Architectural & Maritime Materials
  const fortressWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf0ece2, roughness: 0.72, metalness: 0.04 })
  );
  const paleStoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xd8d3c8, roughness: 0.78, metalness: 0.05 })
  );
  const pagodaSlateMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x262c36, roughness: 0.56, metalness: 0.14 })
  );
  const pagodaTerracottaMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xc95a2a, roughness: 0.62, metalness: 0.06 })
  );
  const crimsonTimberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x9c2c24, roughness: 0.66, metalness: 0.05 })
  );
  const marineNavyMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1d4b8f, roughness: 0.48, metalness: 0.12 })
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.36, metalness: 0.72 })
  );
  const darkTimberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4d3420, roughness: 0.85 })
  );
  const warmWoodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x966b3c, roughness: 0.82 })
  );
  const canvasSailMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf7f5ef, roughness: 0.76, side: THREE.DoubleSide })
  );
  const waterfallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x62e2f7,
      emissive: 0x1e8ab2,
      emissiveIntensity: 0.32,
      roughness: 0.18,
      transparent: true,
      opacity: 0.78,
    })
  );

  // 3. Crescent Fortress Seawall Ramparts (with Crenellations & Recessed Embrasures)
  const wallSegs = 56;
  const wallBodyGeo = trackGeo(new THREE.BoxGeometry(6.8 * S, 6.8 * S, 3.4 * S));
  const wallDeckGeo = trackGeo(new THREE.BoxGeometry(7.0 * S, 0.7 * S, 4.1 * S));
  const merlonGeo = trackGeo(new THREE.BoxGeometry(1.35 * S, 1.0 * S, 0.75 * S));
  const embrasureGeo = trackGeo(new THREE.BoxGeometry(1.1 * S, 1.4 * S, 0.35 * S));

  for (let i = 0; i < wallSegs; i++) {
    const ang = (i / wallSegs) * Math.PI * 2;
    const wx = MARINEFORD_WALL_CENTER.x + Math.cos(ang) * MARINEFORD_WALL_RADIUS_X;
    const wz = MARINEFORD_WALL_CENTER.z + Math.sin(ang) * MARINEFORD_WALL_RADIUS_Z;

    // Leave Southern Harbor Mouth & Northern HQ Keep courtyard clear
    if (wz > 54 && Math.abs(wx) < 13.8) continue;
    if (wz < -18 && Math.abs(wx) < 32.0) continue;

    // Tangent angle along ellipse
    const tx = -Math.sin(ang) * MARINEFORD_WALL_RADIUS_X;
    const tz = Math.cos(ang) * MARINEFORD_WALL_RADIUS_Z;
    const yaw = Math.atan2(tx, tz) - Math.PI * 0.5;

    const wGroup = new THREE.Group();
    placeOnMarinefordSphere(wGroup, wx, 5.4, wz, globeRadius, yaw);

    const wallBody = new THREE.Mesh(wallBodyGeo, fortressWhiteMat);
    const deck = new THREE.Mesh(wallDeckGeo, paleStoneMat);
    deck.position.y = 3.55 * S;
    wGroup.add(wallBody, deck);

    for (const mx of [-2.2, 0, 2.2]) {
      const mOut = new THREE.Mesh(merlonGeo, fortressWhiteMat);
      mOut.position.set(mx * S, 4.25 * S, 1.65 * S);
      wGroup.add(mOut);
    }
    for (const ex of [-1.8, 1.8]) {
      const emb = new THREE.Mesh(embrasureGeo, darkIronMat);
      emb.position.set(ex * S, -0.6 * S, 1.78 * S);
      wGroup.add(emb);
    }

    group.add(wGroup);
  }

  // 4. 8 Pagoda Watchtowers & Southern Harbor Mouth Bastions
  const watchtowers = buildMarinefordWatchtowers();
  const wtBaseGeo = trackGeo(new THREE.BoxGeometry(7.4 * S, 7.6 * S, 7.4 * S));
  const wtMidGeo = trackGeo(new THREE.BoxGeometry(5.6 * S, 3.6 * S, 5.6 * S));
  const wtUpperGeo = trackGeo(new THREE.BoxGeometry(4.4 * S, 2.4 * S, 4.4 * S));
  const wtRoof1Geo = trackGeo(new THREE.ConeGeometry(4.6 * S, 2.2 * S, 4));
  const wtRoof2Geo = trackGeo(new THREE.ConeGeometry(3.5 * S, 2.5 * S, 4));

  watchtowers.forEach((wt) => {
    const wtGroup = new THREE.Group();
    placeOnMarinefordSphere(wtGroup, wt.x, wt.y, wt.z, globeRadius, wt.yaw);
    wtGroup.scale.setScalar(wt.scale);

    const base = new THREE.Mesh(wtBaseGeo, fortressWhiteMat);
    base.position.y = 3.2 * S;
    const mid = new THREE.Mesh(wtMidGeo, fortressWhiteMat);
    mid.position.y = 8.4 * S;
    const roof1 = new THREE.Mesh(wtRoof1Geo, pagodaTerracottaMat);
    roof1.position.y = 10.6 * S;
    roof1.rotation.y = Math.PI * 0.25;

    const upper = new THREE.Mesh(wtUpperGeo, crimsonTimberMat);
    upper.position.y = 11.8 * S;
    const roof2 = new THREE.Mesh(wtRoof2Geo, pagodaTerracottaMat);
    roof2.position.y = 13.9 * S;
    roof2.rotation.y = Math.PI * 0.25;

    wtGroup.add(base, mid, roof1, upper, roof2);
    group.add(wtGroup);
  });

  // 5. Heavy Twin-Barrel Coastal & Rampart Naval Cannons
  const cannons = buildMarinefordCannons();
  const cMountGeo = trackGeo(new THREE.BoxGeometry(2.6 * S, 1.3 * S, 2.8 * S));
  const cBarrelGeo = trackGeo(new THREE.CylinderGeometry(0.24 * S, 0.30 * S, 3.2 * S, 8));
  cannons.forEach((cn) => {
    const cGroup = new THREE.Group();
    placeOnMarinefordSphere(cGroup, cn.x, cn.y, cn.z, globeRadius, cn.yaw);

    const mount = new THREE.Mesh(cMountGeo, darkIronMat);
    mount.position.y = 0.65 * S;
    cGroup.add(mount);

    for (const bx of [-0.55, 0.55]) {
      const barrel = new THREE.Mesh(cBarrelGeo, darkIronMat);
      barrel.position.set(bx * S, 1.1 * S, 1.6 * S);
      barrel.rotation.x = Math.PI * 0.42;
      cGroup.add(barrel);
    }
    group.add(cGroup);
  });

  // 6. Iconic Marine HQ Fortress Keep ("海 軍" + Seagull Emblem + 3-Tier Pagoda + Twin Bastion Towers)
  {
    const hqGroup = new THREE.Group();
    placeOnMarinefordSphere(
      hqGroup,
      MARINEFORD_KEEP_POS.x,
      4.5,
      MARINEFORD_KEEP_POS.z,
      globeRadius,
      0
    );

    // Fortified Stone Foundation & Keep Body
    const keepBase = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(34.0 * S, 4.5 * S, 22.0 * S)),
      paleStoneMat
    );
    keepBase.position.y = 1.5 * S;
    hqGroup.add(keepBase);

    const keepBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(29.0 * S, 22.0 * S, 17.5 * S)),
      fortressWhiteMat
    );
    keepBody.position.y = 14.5 * S;
    hqGroup.add(keepBody);

    // Crisp Front "海軍" + Marine Seagull Plaque facing Oris Plaza (+Z)
    const facadeTex = registerTex(createMarineHQFacadeTexture());
    const facadeMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: facadeTex,
        roughness: 0.62,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    const facadePlaque = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(28.0 * S, 21.2 * S)),
      facadeMat
    );
    facadePlaque.position.set(0, 14.5 * S, 8.82 * S);
    hqGroup.add(facadePlaque);

    // Stepping Shoulder Wings & Corner Turrets
    const wingGeo = trackGeo(new THREE.BoxGeometry(9.0 * S, 13.5 * S, 14.0 * S));
    const turretGeo = trackGeo(new THREE.BoxGeometry(4.2 * S, 17.5 * S, 4.2 * S));
    const turretRoofGeo = trackGeo(new THREE.ConeGeometry(3.4 * S, 3.2 * S, 4));
    for (const sx of [-18.5, 18.5]) {
      const wing = new THREE.Mesh(wingGeo, fortressWhiteMat);
      wing.position.set(sx * S, 10.2 * S, 0.5 * S);
      const t = new THREE.Mesh(turretGeo, fortressWhiteMat);
      t.position.set((sx + (sx > 0 ? 2.5 : -2.5)) * S, 12.2 * S, 5.5 * S);
      const tr = new THREE.Mesh(turretRoofGeo, pagodaSlateMat);
      tr.position.set((sx + (sx > 0 ? 2.5 : -2.5)) * S, 22.2 * S, 5.5 * S);
      tr.rotation.y = Math.PI * 0.25;
      hqGroup.add(wing, t, tr);
    }

    // 3-Tier Japanese Tenshu / Pagoda Palace Crown atop the Keep
    const pagodaTiers = [
      { w: 23.0, h: 4.0, d: 15.0, y: 27.5, rw: 26.5, rh: 2.2, rd: 17.5 },
      { w: 16.5, h: 3.8, d: 11.5, y: 31.8, rw: 19.8, rh: 2.1, rd: 13.8 },
      { w: 10.5, h: 3.6, d: 8.2, y: 35.8, rw: 13.5, rh: 2.6, rd: 10.5 },
    ];
    pagodaTiers.forEach((tier, idx) => {
      const core = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(tier.w * S, tier.h * S, tier.d * S)),
        idx === 0 ? fortressWhiteMat : crimsonTimberMat
      );
      core.position.y = tier.y * S;
      const eaveRoof = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(tier.rw * 0.66 * S, tier.rh * S, 4)),
        pagodaSlateMat
      );
      eaveRoof.position.y = (tier.y + tier.h * 0.5 + tier.rh * 0.35) * S;
      eaveRoof.rotation.y = Math.PI * 0.25;
      hqGroup.add(core, eaveRoof);
    });

    // Top Marine Flagpole & Pennant
    const pole = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.18 * S, 0.22 * S, 6.2 * S, 6)),
      darkIronMat
    );
    pole.position.y = 41.5 * S;
    const flag = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.2 * S, 1.7 * S, 0.18 * S)),
      canvasSailMat
    );
    flag.position.set(1.6 * S, 43.2 * S, 0);
    hqGroup.add(pole, flag);

    // Lower Courtyard Gatehouse directly in front of the Keep (z = -31 local -> zOffset +12)
    const gateHouse = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(19.0 * S, 6.2 * S, 8.2 * S)),
      fortressWhiteMat
    );
    gateHouse.position.set(0, 3.0 * S, 12.2 * S);
    const gateDeck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(11.0 * S, 1.4 * S, 5.2 * S)),
      warmWoodMat
    );
    gateDeck.position.set(0, 6.5 * S, 12.2 * S);
    const gateArch = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.6 * S, 4.0 * S, 0.6 * S)),
      darkIronMat
    );
    gateArch.position.set(0, 2.0 * S, 16.3 * S);
    hqGroup.add(gateHouse, gateDeck, gateArch);

    // Grand Stepped Stairway connecting HQ Gatehouse down to Oris Plaza
    for (let st = 0; st < 5; st++) {
      const step = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(9.2 * S, 0.65 * S, 1.15 * S)),
        paleStoneMat
      );
      step.position.set(0, (2.2 - st * 0.55) * S, (16.8 + st * 0.95) * S);
      hqGroup.add(step);
    }

    group.add(hqGroup);
  }

  // Twin Colossal Cylindrical Bastion Towers flanking the HQ Courtyard (from marinford_2ab8bc69.webp)
  const cylTowerGeo = trackGeo(new THREE.CylinderGeometry(6.4 * S, 6.7 * S, 17.5 * S, 24));
  const cylCapGeo = trackGeo(new THREE.CylinderGeometry(6.8 * S, 6.8 * S, 1.2 * S, 24));
  for (const tx of [-28.5, 28.5]) {
    const tGroup = new THREE.Group();
    placeOnMarinefordSphere(tGroup, tx, 2.8, -25.0, globeRadius, 0);

    const cyl = new THREE.Mesh(cylTowerGeo, fortressWhiteMat);
    cyl.position.y = 8.75 * S;
    const cap = new THREE.Mesh(cylCapGeo, paleStoneMat);
    cap.position.y = 17.6 * S;
    tGroup.add(cyl, cap);

    // Rooftop heavy dual-gun battery
    const turret = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.2 * S, 2.0 * S, 4.6 * S)),
      darkIronMat
    );
    turret.position.y = 19.0 * S;
    tGroup.add(turret);
    for (const bx of [-0.9, 0.9]) {
      const gun = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.32 * S, 0.38 * S, 5.0 * S, 8)),
        darkIronMat
      );
      gun.position.set(bx * S, 19.6 * S, 2.6 * S);
      gun.rotation.x = Math.PI * 0.44;
      tGroup.add(gun);
    }
    group.add(tGroup);
  }

  // 7. Twin-Stair Execution Scaffold Platform in Oris Plaza (matching marine_ford_6704c00e.JPG)
  {
    const exGroup = new THREE.Group();
    placeOnMarinefordSphere(
      exGroup,
      MARINEFORD_SCAFFOLD_POS.x,
      2.75,
      MARINEFORD_SCAFFOLD_POS.z,
      globeRadius,
      0
    );

    const podDeck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(9.6 * S, 4.8 * S, 6.8 * S)),
      paleStoneMat
    );
    podDeck.position.set(0, 2.4 * S, -2.5 * S);
    const podTrim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(10.0 * S, 0.55 * S, 7.2 * S)),
      warmWoodMat
    );
    podTrim.position.set(0, 4.85 * S, -2.5 * S);
    exGroup.add(podDeck, podTrim);

    // Gallows Arch Frame atop the Execution Platform
    for (const px of [-2.4, 2.4]) {
      const post = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.55 * S, 4.6 * S, 0.55 * S)),
        darkTimberMat
      );
      post.position.set(px * S, 7.2 * S, -3.5 * S);
      exGroup.add(post);
    }
    const crossBeam = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.8 * S, 0.65 * S, 0.7 * S)),
      darkTimberMat
    );
    crossBeam.position.set(0, 9.5 * S, -3.5 * S);
    exGroup.add(crossBeam);

    // Twin Parallel Ceremonial Stairways descending South into Oris Plaza
    for (const sx of [-2.8, 2.8]) {
      const rampGeo = trackGeo(new THREE.BoxGeometry(3.2 * S, 0.8 * S, 8.6 * S));
      const ramp = new THREE.Mesh(rampGeo, paleStoneMat);
      ramp.position.set(sx * S, 2.35 * S, 3.8 * S);
      ramp.rotation.x = 0.54;
      const railL = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.4 * S, 0.9 * S, 8.8 * S)),
        warmWoodMat
      );
      railL.position.set((sx - 1.55) * S, 2.8 * S, 3.8 * S);
      railL.rotation.x = 0.54;
      const railR = railL.clone();
      railR.position.x = (sx + 1.55) * S;
      exGroup.add(ramp, railL, railR);
    }
    group.add(exGroup);
  }

  // 8. Central Grand Stone Wharf Pier & Wooden Harbor Jetties inside Oris Bay
  {
    const pier = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(7.2 * S, 2.6 * S, 19.5 * S)),
      paleStoneMat
    );
    placeOnMarinefordSphere(pier, 0, 1.35, 5.2, globeRadius, 0);
    group.add(pier);

    for (const [jx, jz, jyaw] of [
      [-15, 4, 0.35],
      [16, 6, -0.35],
      [-23, 22, 0.95],
      [24, 24, -0.95],
    ]) {
      const jetty = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(3.2 * S, 1.4 * S, 9.5 * S)),
        warmWoodMat
      );
      placeOnMarinefordSphere(jetty, jx, 0.75, jz, globeRadius, jyaw);
      group.add(jetty);
    }
  }

  // 9. Composite Marine Warships inside Oris Bay & Harbor Mouth
  const ships = buildMarinefordShips();
  const shipGroups: Array<{ mesh: THREE.Group; baseY: number }> = [];
  const hullGeo = trackGeo(new THREE.BoxGeometry(3.0 * S, 1.8 * S, 10.2 * S));
  const bowGeo = trackGeo(new THREE.ConeGeometry(1.65 * S, 3.4 * S, 4));
  const cabinGeo = trackGeo(new THREE.BoxGeometry(2.5 * S, 1.7 * S, 3.2 * S));
  const mastGeo = trackGeo(new THREE.CylinderGeometry(0.14 * S, 0.18 * S, 7.6 * S, 6));
  const sailGeo = trackGeo(new THREE.BoxGeometry(3.6 * S, 3.4 * S, 0.16 * S));
  const stripeGeo = trackGeo(new THREE.BoxGeometry(3.65 * S, 0.55 * S, 0.2 * S));

  ships.forEach((sp) => {
    const sGroup = new THREE.Group();
    placeOnMarinefordSphere(sGroup, sp.x, 0.25, sp.z, globeRadius, sp.yaw);
    sGroup.scale.setScalar(sp.scale);

    const hull = new THREE.Mesh(hullGeo, fortressWhiteMat);
    hull.position.y = 0.8 * S;
    const bow = new THREE.Mesh(bowGeo, fortressWhiteMat);
    bow.rotation.x = Math.PI * 0.5;
    bow.rotation.y = Math.PI * 0.25;
    bow.position.set(0, 0.95 * S, 6.4 * S);
    const deck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.7 * S, 0.3 * S, 9.8 * S)),
      warmWoodMat
    );
    deck.position.y = 1.75 * S;
    const cabin = new THREE.Mesh(cabinGeo, fortressWhiteMat);
    cabin.position.set(0, 2.5 * S, -3.0 * S);
    const cabinRoof = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.7 * S, 0.35 * S, 3.4 * S)),
      marineNavyMat
    );
    cabinRoof.position.set(0, 3.45 * S, -3.0 * S);
    sGroup.add(hull, bow, deck, cabin, cabinRoof);

    for (const mz of [2.4, -0.8]) {
      const mast = new THREE.Mesh(mastGeo, darkTimberMat);
      mast.position.set(0, 5.4 * S, mz * S);
      const sail = new THREE.Mesh(sailGeo, canvasSailMat);
      sail.position.set(0, 6.2 * S, (mz + 0.22) * S);
      const stripe = new THREE.Mesh(stripeGeo, marineNavyMat);
      stripe.position.set(0, 6.2 * S, (mz + 0.24) * S);
      sGroup.add(mast, sail, stripe);
    }

    shipGroups.push({ mesh: sGroup, baseY: sGroup.position.y });
    group.add(sGroup);
  });

  // 10. Multi-Part Instanced Marine Town Houses (Terracotta & Teal Roofs)
  const houses = buildMarinefordHouses();
  const unitBoxGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const gableGeo = trackGeo(createGableRoofGeometry());

  const wallMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 })
  );
  const roofMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62 })
  );
  const darkPortalMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x261a12, roughness: 0.88 })
  );
  const shutterMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x243447, roughness: 0.75 })
  );
  const winMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c6878,
      emissive: 0xffd584,
      emissiveIntensity: 0.26,
      roughness: 0.38,
    })
  );

  const plinthInst = new THREE.InstancedMesh(unitBoxGeo, paleStoneMat, houses.length);
  const wallInst = new THREE.InstancedMesh(unitBoxGeo, wallMat, houses.length);
  const eaveInst = new THREE.InstancedMesh(unitBoxGeo, fortressWhiteMat, houses.length);
  const roofInst = new THREE.InstancedMesh(gableGeo, roofMat, houses.length);
  const doorInst = new THREE.InstancedMesh(unitBoxGeo, darkPortalMat, houses.length);

  const detailGroup = new THREE.Group();
  const winFrameInst = new THREE.InstancedMesh(unitBoxGeo, shutterMat, houses.length * 4);
  const winInst = new THREE.InstancedMesh(unitBoxGeo, winMat, houses.length * 4);
  const chimneyInst = new THREE.InstancedMesh(unitBoxGeo, paleStoneMat, houses.length);

  houses.forEach((h, i) => {
    plinthInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x,
        h.y + 0.15,
        h.z,
        h.yaw,
        0,
        h.width * 1.06,
        0.65,
        h.depth * 1.06,
        globeRadius
      )
    );
    wallInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x,
        h.y + h.height * 0.5 + 0.22,
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

    eaveInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x,
        h.y + h.height + 0.24,
        h.z,
        h.yaw,
        0,
        h.width * 1.08,
        0.22,
        h.depth * 1.08,
        globeRadius
      )
    );

    roofInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x,
        h.y + h.height + 0.32,
        h.z,
        h.yaw,
        0,
        h.width,
        h.height * 0.82,
        h.depth,
        globeRadius
      )
    );
    _tmpColor.setHex(h.roofColor);
    roofInst.setColorAt(i, _tmpColor);

    const sinY = Math.sin(h.yaw);
    const cosY = Math.cos(h.yaw);
    const frontOff = h.depth * 0.5 + 0.03;
    const paneOff = h.depth * 0.5 + 0.06;

    doorInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x + sinY * frontOff,
        h.y + 0.85,
        h.z + cosY * frontOff,
        h.yaw,
        0,
        0.7,
        1.15,
        0.14,
        globeRadius
      )
    );

    let wSlot = 0;
    for (const rowY of [0.35, 0.72]) {
      for (const colX of [-0.28, 0.28]) {
        const fx = h.x + sinY * frontOff + cosY * (h.width * colX);
        const fz = h.z + cosY * frontOff - sinY * (h.width * colX);
        const wx = h.x + sinY * paneOff + cosY * (h.width * colX);
        const wz = h.z + cosY * paneOff - sinY * (h.width * colX);
        const slotIdx = i * 4 + wSlot++;
        winFrameInst.setMatrixAt(
          slotIdx,
          setSphereInstMatrix(
            fx,
            h.y + h.height * rowY + 0.28,
            fz,
            h.yaw,
            0,
            0.54,
            0.6,
            0.08,
            globeRadius
          )
        );
        winInst.setMatrixAt(
          slotIdx,
          setSphereInstMatrix(
            wx,
            h.y + h.height * rowY + 0.28,
            wz,
            h.yaw,
            0,
            0.36,
            0.42,
            0.08,
            globeRadius
          )
        );
      }
    }

    chimneyInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x + cosY * (h.width * 0.28),
        h.y + h.height + 1.25,
        h.z - sinY * (h.width * 0.28),
        h.yaw,
        0,
        0.38,
        0.95,
        0.38,
        globeRadius
      )
    );
  });

  [plinthInst, wallInst, eaveInst, roofInst, doorInst].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.computeBoundingSphere();
    group.add(inst);
  });

  [winFrameInst, winInst, chimneyInst].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    detailGroup.add(inst);
  });
  group.add(detailGroup);

  // 11. Cliffside Lookout Pavilions & West Waterfall (from marinford_2ab8bc69.webp)
  const lookoutSpots: Array<[number, number, number]> = [
    [-64, 15.2, -38],
    [66, 13.2, -36],
  ];
  lookoutSpots.forEach(([lx, ly, lz]) => {
    const lGroup = new THREE.Group();
    placeOnMarinefordSphere(lGroup, lx, ly, lz, globeRadius, 0.3);

    const deck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(6.2 * S, 1.0 * S, 6.2 * S)),
      warmWoodMat
    );
    deck.position.y = 0.5 * S;
    const body = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.8 * S, 3.2 * S, 4.8 * S)),
      crimsonTimberMat
    );
    body.position.y = 2.6 * S;
    const roof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(4.6 * S, 2.2 * S, 4)),
      pagodaSlateMat
    );
    roof.position.y = 5.1 * S;
    roof.rotation.y = Math.PI * 0.25;
    const pole = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.12 * S, 0.12 * S, 3.2 * S, 5)),
      darkIronMat
    );
    pole.position.y = 7.0 * S;
    const flag = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.8 * S, 1.0 * S, 0.14 * S)),
      canvasSailMat
    );
    flag.position.set(0.9 * S, 8.0 * S, 0);
    lGroup.add(deck, body, roof, pole, flag);
    group.add(lGroup);
  });

  // Cliff Waterfall cascading down the NW Lookout spur
  const wf = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.2 * S, 12.6 * S, 1.2 * S)),
    waterfallMat
  );
  placeOnMarinefordSphere(wf, -67.5, 8.2, -30.5, globeRadius, -0.35);
  wf.rotateX(0.24);
  group.add(wf);

  // 12. SW Encampment Field Tents & Crates (matching marine_ford_6704c00e.JPG)
  const tents = buildMarinefordTents();
  const tentBodyGeo = trackGeo(createGableRoofGeometry());
  const tentMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe6dec8, roughness: 0.85 })
  );
  tents.forEach((t) => {
    const tMesh = new THREE.Mesh(tentBodyGeo, tentMat);
    placeOnMarinefordSphere(tMesh, t.x, t.y, t.z, globeRadius, t.yaw);
    tMesh.scale.set(4.2 * t.scale * S, 3.2 * t.scale * S, 3.2 * t.scale * S);
    group.add(tMesh);
  });

  // 13. Composite Instanced Pine & Coastal Trees
  const trees = buildMarinefordTrees();
  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.22, 0.34, 1.5, 6));
  const crownGeo = trackGeo(new THREE.DodecahedronGeometry(1.45, 0));
  const trunkInst = new THREE.InstancedMesh(trunkGeo, darkTimberMat, trees.length);
  const crownMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b7a44,
      roughness: 0.84,
      flatShading: true,
    })
  );
  const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, trees.length);

  trees.forEach((tr, i) => {
    trunkInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        tr.x,
        tr.y + 0.7 * tr.scale,
        tr.z,
        i * 0.7,
        0,
        tr.scale,
        tr.scale,
        tr.scale,
        globeRadius
      )
    );
    crownInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        tr.x,
        tr.y + 2.0 * tr.scale,
        tr.z,
        i * 1.1,
        0,
        tr.scale * 1.15,
        tr.scale * 1.35,
        tr.scale * 1.15,
        globeRadius
      )
    );
    _tmpColor.setRGB(0.85 * tr.tint, 1.0 * tr.tint, 0.85 * tr.tint);
    crownInst.setColorAt(i, _tmpColor);
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  crownInst.computeBoundingSphere();
  group.add(trunkInst, crownInst);

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number, distToCamera = 20) => {
      detailGroup.visible = distToCamera < 3.4;
      if (distToCamera < 3.4) {
        for (let i = 0; i < shipGroups.length; i++) {
          shipGroups[i].mesh.position.y =
            shipGroups[i].baseY + Math.sin(elapsed * 1.9 + i * 1.1) * 0.06 * S;
        }
      }
    },
  };
}
