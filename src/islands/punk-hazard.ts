import * as THREE from 'three';
import { valueNoise2D } from '../utils/globeMath';
import {
  PUNK_HAZARD_FENCE_ARC,
  PUNK_HAZARD_GLOBE_SCALE,
  PUNK_HAZARD_ICE_PEAKS,
  PUNK_HAZARD_LANDMARKS,
  PUNK_HAZARD_RUINS,
  PUNK_HAZARD_VOLCANOES,
  PUNK_HAZARD_WORLD_SIZE,
  punkHazardLandSignedDist,
  punkHazardStraitCenterZ,
  samplePunkHazardHeight,
  samplePunkHazardLavaIntensity,
  toPunkHazardSphereLocal,
} from '../utils/punkHazardTerrain';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = PUNK_HAZARD_GLOBE_SCALE;
const _up = new THREE.Vector3(0, 1, 0);
const _yAxis = new THREE.Vector3(0, 1, 0);
const _localNormal = new THREE.Vector3();
const _tiltQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();
const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();

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

function placeOnPunkHazardSphere(
  obj: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  globeRadius: number,
  yaw = 0
): void {
  const pos = toPunkHazardSphereLocal(x, y, z, globeRadius);
  obj.position.set(pos.x, pos.y, pos.z);
  _localNormal.set(pos.x, globeRadius + pos.y, pos.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

function createPunkHazardTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = PUNK_HAZARD_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * PUNK_HAZARD_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * PUNK_HAZARD_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const { sd, half: halfZone } = punkHazardLandSignedDist(x, z);
      const grain = (valueNoise2D(x * 0.55, z * 0.55) - 0.5) * 14;
      const n = valueNoise2D(x * 0.14 + 2.1, z * 0.14 - 3.4);
      const ridgeN = valueNoise2D(x * 0.34 - 1.2, z * 0.34 + 4.7);

      let rgb: [number, number, number] = [14, 72, 114];
      let alpha = 1;

      if (halfZone === 'sea' || (sd > 1.2 && halfZone === 'strait')) {
        // Turquoise-cobalt demarcation strait & coastal shallows fading smoothly into ocean
        const shallowT = 1 - smoothstep(1.2, 20.0, sd);
        rgb = mixRgb([12, 68, 118], [32, 132, 168], shallowT);
        if (halfZone === 'sea') {
          alpha = 1 - smoothstep(9.0, 26.0, sd);
        } else {
          // Strait water stays crisp deep arctic-thermal teal
          rgb = mixRgb([24, 116, 158], [58, 158, 192], n);
          alpha = 0.94;
        }
      } else if (sd > -1.4) {
        // Coastal rim: ice shelf edge on north vs charred ember shore on south
        const straitCz = punkHazardStraitCenterZ(x);
        if (z < straitCz) {
          rgb = mixRgb([165, 212, 240], [72, 158, 202], smoothstep(-1.4, 1.2, sd));
        } else {
          rgb = mixRgb([72, 28, 22], [196, 78, 26], smoothstep(-1.4, 1.2, sd));
        }
      } else if (halfZone === 'ice') {
        // Ice Half: blinding arctic snow with glacial blue crevasse veining
        rgb = mixRgb([214, 234, 250], [244, 250, 255], n);
        if (ridgeN > 0.62) {
          rgb = mixRgb(rgb, [142, 192, 232], (ridgeN - 0.62) * 2.1);
        }
        // Packed icy roadway in Caesar's Lab courtyard
        const dLabPlaza = Math.hypot(
          x - PUNK_HAZARD_LANDMARKS.caesarLabPlaza.x,
          z - PUNK_HAZARD_LANDMARKS.caesarLabPlaza.z
        );
        if (dLabPlaza < 12.5) {
          rgb = mixRgb(rgb, [188, 218, 242], 0.45);
        }
        // Ruined Vegapunk relics frost-ash near southern demarcation bank
        const bankDist = Math.abs(z - punkHazardStraitCenterZ(x));
        if (bankDist < 17.5) {
          rgb = mixRgb(rgb, [152, 174, 196], 0.35);
        }
      } else {
        // Burning Half: dark volcanic basalt, scorched ash, glowing molten rivers & cinder heat
        rgb = mixRgb([46, 22, 22], [92, 34, 24], n);
        if (ridgeN > 0.58) {
          rgb = mixRgb(rgb, [132, 48, 22], (ridgeN - 0.58) * 1.65);
        }

        const lava = samplePunkHazardLavaIntensity(x, z);
        if (lava > 0.05) {
          const core = smoothstep(0.38, 0.92, lava);
          const hot = mixRgb([224, 72, 14], [255, 212, 56], core);
          rgb = mixRgb(rgb, hot, smoothstep(0.05, 0.42, lava));
        }

        // Scorched volcanic road apron outside PUNK HAZARD gate
        const dGate = Math.hypot(
          (x - PUNK_HAZARD_LANDMARKS.punkHazardGate.x) / 14.0,
          (z - 71.5) / 8.5
        );
        if (dGate < 1.1) {
          rgb = mixRgb(rgb, [104, 42, 32], (1 - dGate) * 0.52);
        }
      }

      data[idx] = clamp(Math.round(rgb[0] + grain), 0, 255);
      data[idx + 1] = clamp(Math.round(rgb[1] + grain), 0, 255);
      data[idx + 2] = clamp(Math.round(rgb[2] + grain), 0, 255);
      data[idx + 3] = clamp(Math.round(alpha * 255), 0, 255);
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Diagonal hazard stripes texture (yellow/black for Caesar Lab base, red/black for security fence).
 */
function createHazardStripeTexture(
  stripeA: string,
  stripeB: string,
  repeatX = 4
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = stripeB;
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = stripeA;
    for (let x = -256; x < 512; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 256);
      ctx.lineTo(x + 24, 256);
      ctx.lineTo(x + 280, 0);
      ctx.lineTo(x + 256, 0);
      ctx.closePath();
      ctx.fill();
    }

    // Subtle steel panel border & rivets
    ctx.fillStyle = 'rgba(10, 12, 16, 0.35)';
    ctx.fillRect(0, 0, 256, 12);
    ctx.fillRect(0, 244, 256, 12);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, 1);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Transparent diamond wire chain-link fence texture matching punk_hazard4_39b9ee84.JPG.
 */
function createChainLinkTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    ctx.strokeStyle = '#3c2a2c';
    ctx.lineWidth = 4;

    for (let x = -256; x < 512; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 256, 256);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + 256, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }

    // Subtle orange-crimson heat highlight on wire edges
    ctx.strokeStyle = 'rgba(234, 88, 12, 0.28)';
    ctx.lineWidth = 1.5;
    for (let x = -256; x < 512; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x + 2, 0);
      ctx.lineTo(x + 258, 256);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Iconic "PUNK HAZARD" rusted/crimson framed gate sign with bold riveted lettering (punk_hazard4_39b9ee84.JPG).
 */
function createPunkHazardSignTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Dark scorched iron plate
    ctx.fillStyle = '#3f1717';
    ctx.fillRect(0, 0, 512, 160);

    // Outer crimson steel bezel + rivets
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 498, 146);

    ctx.strokeStyle = '#1f0b0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 480, 128);

    ctx.fillStyle = '#f87171';
    for (let x = 24; x <= 488; x += 38) {
      ctx.beginPath();
      ctx.arc(x, 24, 3, 0, Math.PI * 2);
      ctx.arc(x, 136, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bold "PUNK HAZARD" lettering
    ctx.font = '900 56px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#180606';
    ctx.fillText('PUNK HAZARD', 259, 86);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('PUNK HAZARD', 256, 82);
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1.5;
    ctx.strokeText('PUNK HAZARD', 256, 82);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Purple/yellow striped biohazard warning sign mounted on the double gate doors (punk_hazard4_39b9ee84.JPG).
 */
function createBiohazardSignTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 192;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 0, 256, 192);

    // Diagonal purple/violet hazard strips along top/bottom
    ctx.fillStyle = '#4c1d95';
    for (let x = -192; x < 448; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 192);
      ctx.lineTo(x + 16, 192);
      ctx.lineTo(x + 208, 0);
      ctx.lineTo(x + 192, 0);
      ctx.closePath();
      ctx.fill();
    }

    // Center warning box
    ctx.fillStyle = '#facc15';
    ctx.fillRect(42, 34, 172, 124);
    ctx.strokeStyle = '#3b0764';
    ctx.lineWidth = 6;
    ctx.strokeRect(42, 34, 172, 124);

    // Three warning triangles / biohazard motif
    ctx.fillStyle = '#3b0764';
    ctx.beginPath();
    ctx.moveTo(128, 52);
    ctx.lineTo(176, 134);
    ctx.lineTo(80, 134);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(128, 102, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3b0764';
    ctx.beginPath();
    ctx.arc(128, 102, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3b0764';
    ctx.fillText('DANGER', 128, 151);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createIslandMesh(ctx: IslandMeshContext): IslandMeshInstance {
  const { globeRadius, trackGeo, trackMat } = ctx;
  const trackTex = ctx.trackTex ?? (<T extends THREE.Texture>(t: T): T => t);
  const group = new THREE.Group();
  group.name = 'custom-punk-hazard';

  // =========================================================================
  // 1. SPHERICAL-CURVED SPLIT TERRAIN SHELL (108x108 vertices)
  // =========================================================================
  const segs = 108;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(PUNK_HAZARD_WORLD_SIZE, PUNK_HAZARD_WORLD_SIZE, segs, segs)
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const h = samplePunkHazardHeight(lx, lz);
    const sp = toPunkHazardSphereLocal(lx, h, lz, globeRadius);
    posAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  terrainGeo.computeVertexNormals();

  const terrainTex = trackTex(createPunkHazardTerrainTexture(1024));
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.04,
      transparent: true,
      alphaTest: 0.04,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  group.add(terrainMesh);

  // Shared materials
  const snowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf0f7ff,
      roughness: 0.72,
      metalness: 0.04,
    })
  );
  const iceMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xaad8f5,
      roughness: 0.34,
      metalness: 0.08,
    })
  );
  const steelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7b8896,
      roughness: 0.48,
      metalness: 0.24,
    })
  );
  const darkSteelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x262f3a,
      roughness: 0.56,
      metalness: 0.22,
    })
  );
  const hazardYellowTex = trackTex(createHazardStripeTexture('#facc15', '#171717', 4));
  const hazardYellowMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: hazardYellowTex,
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.16,
    })
  );
  const hazardRedTex = trackTex(createHazardStripeTexture('#dc2626', '#111111', 2));
  const hazardRedMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: hazardRedTex,
      color: 0xffffff,
      roughness: 0.58,
      metalness: 0.14,
    })
  );
  const chainLinkTex = trackTex(createChainLinkTexture());
  const chainLinkMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: chainLinkTex,
      color: 0xffffff,
      roughness: 0.52,
      metalness: 0.2,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
    })
  );
  const pipeOrangeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc2410c,
      roughness: 0.52,
      metalness: 0.18,
    })
  );
  const concreteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5d4a44,
      roughness: 0.9,
      metalness: 0.04,
    })
  );
  const lavaSlagMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 1.05,
      roughness: 0.36,
      metalness: 0.06,
    })
  );
  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6b4428,
      roughness: 0.86,
      metalness: 0.02,
    })
  );

  // =========================================================================
  // 2. ICE HALF: JAGGED GLACIAL ICE SPIRES, FROSTED PINES & FLOATING ICE FLOES
  // =========================================================================
  const iceSpireGeo = trackGeo(new THREE.ConeGeometry(1, 1, 5));
  iceSpireGeo.translate(0, 0.5, 0);
  const iceSpireCount = 135;
  const iceSpireInstanced = new THREE.InstancedMesh(iceSpireGeo, iceMat, iceSpireCount);
  let spireIdx = 0;

  for (let i = 0; i < iceSpireCount * 2 && spireIdx < iceSpireCount; i++) {
    const n1 = valueNoise2D(i * 0.67 + 1.2, i * 0.43 - 2.7);
    const n2 = valueNoise2D(i * 0.39 - 4.5, i * 0.77 + 1.8);
    const n3 = valueNoise2D(i * 0.91 + 0.5, i * 0.53 + 6.1);

    let lx = -68 + n1 * 136;
    let lz = -72 + n2 * 64;
    if (i < PUNK_HAZARD_ICE_PEAKS.length * 3) {
      const peak = PUNK_HAZARD_ICE_PEAKS[i % PUNK_HAZARD_ICE_PEAKS.length];
      const ang = n1 * Math.PI * 2;
      const rad = 2.0 + n2 * 7.5;
      lx = peak.x + Math.cos(ang) * rad;
      lz = peak.z + Math.sin(ang) * rad;
    }

    const { sd, half } = punkHazardLandSignedDist(lx, lz);
    if (half !== 'ice' || sd > -2.0) continue;

    // Keep Caesar Lab, its courtyard corridor, & Frozen Bay sightlines completely clear
    if (
      Math.hypot(lx - PUNK_HAZARD_LANDMARKS.caesarLabPlaza.x, lz - PUNK_HAZARD_LANDMARKS.caesarLabPlaza.z) < 13.5 ||
      Math.hypot(lx - PUNK_HAZARD_LANDMARKS.caesarLab.x, lz - PUNK_HAZARD_LANDMARKS.caesarLab.z) < 16.0 ||
      Math.hypot(lx + 1.5, lz + 23.5) < 13.5 ||
      Math.hypot(lx - PUNK_HAZARD_LANDMARKS.g5IcePier.x, lz - PUNK_HAZARD_LANDMARKS.g5IcePier.z) < 10.5 ||
      Math.hypot(lx - PUNK_HAZARD_LANDMARKS.g5BayOverlook.x, lz - PUNK_HAZARD_LANDMARKS.g5BayOverlook.z) < 13.5 ||
      Math.hypot(lx - 39.0, lz + 47.0) < 10.5
    ) {
      continue;
    }

    const groundY = samplePunkHazardHeight(lx, lz);
    const sp = toPunkHazardSphereLocal(lx, groundY - 0.6, lz, globeRadius);
    _localNormal.set(sp.x, globeRadius + sp.y, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, n3 * Math.PI * 2);

    const w = (3.1 + n2 * 4.2) * S;
    const h = (5.8 + n3 * 12.5) * S;
    _dummy.position.set(sp.x, sp.y, sp.z);
    _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    _dummy.scale.set(w, h, w * 0.94);
    _dummy.updateMatrix();
    iceSpireInstanced.setMatrixAt(spireIdx, _dummy.matrix);

    const shade = 0.88 + n1 * 0.14;
    _tmpColor.setRGB(0.86 * shade, 0.94 * shade, 1.0 * shade);
    iceSpireInstanced.setColorAt(spireIdx, _tmpColor);
    spireIdx++;
  }
  iceSpireInstanced.count = spireIdx;
  iceSpireInstanced.instanceMatrix.needsUpdate = true;
  if (iceSpireInstanced.instanceColor) iceSpireInstanced.instanceColor.needsUpdate = true;
  iceSpireInstanced.computeBoundingSphere();
  group.add(iceSpireInstanced);

  // Frosted dead conifers along snowy valleys (punk_hazard5_ff6ad8b3.JPG)
  const pineGeo = trackGeo(new THREE.ConeGeometry(1, 1, 6));
  pineGeo.translate(0, 0.5, 0);
  const pineMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      roughness: 0.82,
      metalness: 0.02,
    })
  );
  const pineInstanced = new THREE.InstancedMesh(pineGeo, pineMat, 70);
  let pineIdx = 0;
  for (let i = 0; i < 160 && pineIdx < 70; i++) {
    const n1 = valueNoise2D(i * 0.57 + 8.3, i * 0.29 - 1.4);
    const n2 = valueNoise2D(i * 0.83 - 3.1, i * 0.61 + 4.9);
    const lx = -60 + n1 * 120;
    const lz = -62 + n2 * 52;
    const { sd, half } = punkHazardLandSignedDist(lx, lz);
    if (half !== 'ice' || sd > -3.5) continue;
    if (
      Math.hypot(lx - PUNK_HAZARD_LANDMARKS.caesarLabPlaza.x, lz - PUNK_HAZARD_LANDMARKS.caesarLabPlaza.z) < 12.5 ||
      Math.hypot(lx - PUNK_HAZARD_LANDMARKS.caesarLab.x, lz - PUNK_HAZARD_LANDMARKS.caesarLab.z) < 16.0 ||
      Math.hypot(lx + 1.5, lz + 23.5) < 12.0 ||
      Math.hypot(lx - PUNK_HAZARD_LANDMARKS.g5BayOverlook.x, lz - PUNK_HAZARD_LANDMARKS.g5BayOverlook.z) < 12.5 ||
      Math.hypot(lx - 39.0, lz + 47.0) < 9.5
    ) {
      continue;
    }
    const groundY = samplePunkHazardHeight(lx, lz);
    if (groundY > 14.0) continue;

    const sp = toPunkHazardSphereLocal(lx, groundY - 0.15, lz, globeRadius);
    _localNormal.set(sp.x, globeRadius + sp.y, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, n1 * Math.PI * 2);

    const w = (1.1 + n2 * 0.85) * S;
    const h = (3.4 + n1 * 2.8) * S;
    _dummy.position.set(sp.x, sp.y, sp.z);
    _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    _dummy.scale.set(w, h, w);
    _dummy.updateMatrix();
    pineInstanced.setMatrixAt(pineIdx, _dummy.matrix);

    const tint = 0.72 + n2 * 0.25;
    _tmpColor.setRGB(0.66 * tint, 0.82 * tint, 0.94 * tint);
    pineInstanced.setColorAt(pineIdx, _tmpColor);
    pineIdx++;
  }
  pineInstanced.count = pineIdx;
  pineInstanced.instanceMatrix.needsUpdate = true;
  if (pineInstanced.instanceColor) pineInstanced.instanceColor.needsUpdate = true;
  pineInstanced.computeBoundingSphere();
  group.add(pineInstanced);

  // Floating ice floes in Northern Frozen Bay & northern demarcation strait (punk_hazard_f21bc845.JPG)
  const floeGeo = trackGeo(new THREE.CylinderGeometry(1, 1.15, 0.55, 6));
  const floeInstanced = new THREE.InstancedMesh(floeGeo, snowMat, 48);
  let floeIdx = 0;
  for (let i = 0; i < 95 && floeIdx < 48; i++) {
    const n1 = valueNoise2D(i * 0.44 + 2.5, i * 0.72 + 1.1);
    const n2 = valueNoise2D(i * 0.69 - 5.2, i * 0.37 + 3.8);
    let lx: number;
    let lz: number;
    if (i < 24) {
      // Northern Frozen Bay + offshore northern sea
      lx = 22 + n1 * 48;
      lz = -86 + n2 * 36;
    } else {
      // Northern edge of Demarcation Strait
      lx = -58 + n1 * 116;
      lz = punkHazardStraitCenterZ(lx) - 3.5 + (n2 - 0.5) * 6.5;
    }
    // Keep away from G-5 ship hull
    if (Math.hypot(lx - PUNK_HAZARD_LANDMARKS.g5BayShip.x, lz - PUNK_HAZARD_LANDMARKS.g5BayShip.z) < 8.5) {
      continue;
    }
    if (samplePunkHazardHeight(lx, lz) > -0.2) continue;

    const sp = toPunkHazardSphereLocal(lx, 0.14, lz, globeRadius);
    _localNormal.set(sp.x, globeRadius + sp.y, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, n1 * Math.PI * 2);

    const rx = (1.6 + n2 * 2.5) * S;
    const rz = (1.3 + n1 * 2.1) * S;
    _dummy.position.set(sp.x, sp.y, sp.z);
    _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    _dummy.scale.set(rx, 0.7 * S, rz);
    _dummy.updateMatrix();
    floeInstanced.setMatrixAt(floeIdx, _dummy.matrix);
    floeIdx++;
  }
  floeInstanced.count = floeIdx;
  floeInstanced.instanceMatrix.needsUpdate = true;
  floeInstanced.computeBoundingSphere();
  group.add(floeInstanced);

  // =========================================================================
  // 3. CAESAR CLOWN'S SNOW-BURIED RESEARCH LAB & CRANE (punk_hazard_f21bc845.JPG)
  // =========================================================================
  const labGroup = new THREE.Group();
  const labY = samplePunkHazardHeight(
    PUNK_HAZARD_LANDMARKS.caesarLab.x,
    PUNK_HAZARD_LANDMARKS.caesarLab.z
  );
  placeOnPunkHazardSphere(
    labGroup,
    PUNK_HAZARD_LANDMARKS.caesarLab.x,
    labY,
    PUNK_HAZARD_LANDMARKS.caesarLab.z,
    globeRadius,
    PUNK_HAZARD_LANDMARKS.caesarLab.yaw
  );

  // Yellow/black diagonal hazard-striped cylindrical lower wall base
  const labBaseGeo = trackGeo(new THREE.CylinderGeometry(11.6 * S, 12.4 * S, 4.4 * S, 24));
  const labBase = new THREE.Mesh(labBaseGeo, hazardYellowMat);
  labBase.position.y = 2.2 * S;
  labGroup.add(labBase);

  // Riveted industrial steel upper drum & snow-draped dome roof
  const labUpperGeo = trackGeo(new THREE.CylinderGeometry(11.1 * S, 11.7 * S, 5.2 * S, 24));
  const labUpper = new THREE.Mesh(labUpperGeo, steelMat);
  labUpper.position.y = 6.8 * S;
  labGroup.add(labUpper);

  const labDomeGeo = trackGeo(
    new THREE.SphereGeometry(11.4 * S, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.55)
  );
  const labDome = new THREE.Mesh(labDomeGeo, snowMat);
  labDome.scale.set(1.06, 0.72, 1.04);
  labDome.position.y = 8.4 * S;
  labGroup.add(labDome);

  // Flanking domed hangar wings (left & right) buried in snow
  for (const side of [-1, 1]) {
    const wingBaseGeo = trackGeo(new THREE.CylinderGeometry(6.8 * S, 7.3 * S, 3.8 * S, 18));
    const wingBase = new THREE.Mesh(wingBaseGeo, hazardYellowMat);
    wingBase.position.set(side * 10.5 * S, 1.9 * S, -2.0 * S);
    labGroup.add(wingBase);

    const wingDomeGeo = trackGeo(
      new THREE.SphereGeometry(7.1 * S, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)
    );
    const wingDome = new THREE.Mesh(wingDomeGeo, snowMat);
    wingDome.scale.set(1.05, 0.78, 1.05);
    wingDome.position.set(side * 10.5 * S, 3.6 * S, -2.0 * S);
    labGroup.add(wingDome);
  }

  // Dark arched entrance portal & heavy steel blast surround facing courtyard (+Z)
  const portalArchGeo = trackGeo(new THREE.BoxGeometry(5.6 * S, 4.8 * S, 3.2 * S));
  const portalArch = new THREE.Mesh(portalArchGeo, steelMat);
  portalArch.position.set(0, 2.4 * S, 11.0 * S);
  labGroup.add(portalArch);

  const portalVoidGeo = trackGeo(new THREE.BoxGeometry(3.8 * S, 3.6 * S, 0.6 * S));
  const portalVoidMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x090d14,
      roughness: 0.9,
      metalness: 0.1,
    })
  );
  const portalVoid = new THREE.Mesh(portalVoidGeo, portalVoidMat);
  portalVoid.position.set(0, 1.9 * S, 12.4 * S);
  labGroup.add(portalVoid);

  const portalSnowCapGeo = trackGeo(new THREE.BoxGeometry(6.2 * S, 1.1 * S, 3.8 * S));
  const portalSnowCap = new THREE.Mesh(portalSnowCapGeo, snowMat);
  portalSnowCap.position.set(0, 5.1 * S, 11.0 * S);
  labGroup.add(portalSnowCap);

  // Icicle cones fringe hanging around Caesar Lab snow eaves (punk_hazard_f21bc845.JPG)
  const icicleGeo = trackGeo(new THREE.ConeGeometry(0.45 * S, 1.9 * S, 5));
  for (let k = -5; k <= 5; k++) {
    const ang = k * 0.24;
    const icicle = new THREE.Mesh(icicleGeo, iceMat);
    icicle.rotation.x = Math.PI;
    icicle.position.set(Math.sin(ang) * 11.4 * S, 8.1 * S, Math.cos(ang) * 11.4 * S);
    labGroup.add(icicle);
  }

  // Protruding snow-capped exhaust chimneys & elbow pipes (punk_hazard_f21bc845.JPG)
  const pipeGeo = trackGeo(new THREE.CylinderGeometry(0.65 * S, 0.72 * S, 5.4 * S, 10));
  const pipeCapGeo = trackGeo(new THREE.SphereGeometry(0.95 * S, 10, 8));
  const chimneyOffsets: readonly [number, number, number][] = [
    [-7.2, 11.0, -3.5],
    [-2.5, 13.8, -4.8],
    [4.4, 13.0, -2.2],
    [8.8, 9.6, 1.5],
    [-11.5, 8.0, 2.2],
  ];
  for (const [cx, cy, cz] of chimneyOffsets) {
    const chim = new THREE.Mesh(pipeGeo, steelMat);
    chim.position.set(cx * S, cy * S, cz * S);
    labGroup.add(chim);

    const snowCap = new THREE.Mesh(pipeCapGeo, snowMat);
    snowCap.scale.set(1.15, 0.75, 1.15);
    snowCap.position.set(cx * S, (cy + 2.8) * S, cz * S);
    labGroup.add(snowCap);
  }

  // Overhanging industrial crane & swaying hazard-striped crate clearly silhouetted on right/front flank
  const craneBase = new THREE.Group();
  craneBase.position.set(5.2 * S, 9.8 * S, 6.8 * S);

  const boomGeo = trackGeo(new THREE.BoxGeometry(1.0 * S, 1.0 * S, 10.6 * S));
  const boom = new THREE.Mesh(boomGeo, darkSteelMat);
  boom.rotation.x = -0.34;
  boom.position.set(0, 1.9 * S, 4.8 * S);
  craneBase.add(boom);

  const cranePivot = new THREE.Group();
  cranePivot.position.set(0, 3.6 * S, 9.4 * S);

  const cableGeo = trackGeo(new THREE.CylinderGeometry(0.13 * S, 0.13 * S, 4.6 * S, 6));
  const cable = new THREE.Mesh(cableGeo, darkSteelMat);
  cable.position.y = -2.3 * S;
  cranePivot.add(cable);

  const crateGeo = trackGeo(new THREE.BoxGeometry(2.8 * S, 2.5 * S, 2.8 * S));
  const crate = new THREE.Mesh(crateGeo, hazardYellowMat);
  crate.position.y = -5.4 * S;
  cranePivot.add(crate);

  craneBase.add(cranePivot);
  labGroup.add(craneBase);

  // Wrecked Brownbeard/pirate ship hull planks half-buried in snow out front
  const wreckGroup = new THREE.Group();
  wreckGroup.position.set(-6.5 * S, 0.1 * S, 16.5 * S);
  const hullRemnantGeo = trackGeo(new THREE.CylinderGeometry(1.5 * S, 2.0 * S, 4.6 * S, 8, 1, false, 0, Math.PI));
  const hullRemnant = new THREE.Mesh(hullRemnantGeo, woodMat);
  hullRemnant.rotation.set(0.35, 0.55, 1.28);
  hullRemnant.position.y = 0.7 * S;
  wreckGroup.add(hullRemnant);

  const brokenMastGeo = trackGeo(new THREE.CylinderGeometry(0.26 * S, 0.32 * S, 4.8 * S, 7));
  const brokenMast = new THREE.Mesh(brokenMastGeo, woodMat);
  brokenMast.rotation.set(0.55, 0.2, -0.45);
  brokenMast.position.set(2.4 * S, 1.3 * S, 0.4 * S);
  wreckGroup.add(brokenMast);
  labGroup.add(wreckGroup);

  group.add(labGroup);

  // =========================================================================
  // 4. ANCHORED G-5 MARINE THREE-MASTED WARSHIP & FROZEN PIER (punk_hazard_f21bc845.JPG)
  // =========================================================================
  const shipGroup = new THREE.Group();
  placeOnPunkHazardSphere(
    shipGroup,
    PUNK_HAZARD_LANDMARKS.g5BayShip.x,
    0.05,
    PUNK_HAZARD_LANDMARKS.g5BayShip.z,
    globeRadius,
    PUNK_HAZARD_LANDMARKS.g5BayShip.yaw
  );

  const shipHullGeo = trackGeo(new THREE.BoxGeometry(3.4 * S, 1.9 * S, 9.8 * S));
  const shipHull = new THREE.Mesh(shipHullGeo, steelMat);
  shipHull.position.y = 0.85 * S;
  shipGroup.add(shipHull);

  const shipBowGeo = trackGeo(new THREE.ConeGeometry(1.7 * S, 3.0 * S, 4));
  const shipBow = new THREE.Mesh(shipBowGeo, woodMat);
  shipBow.rotation.x = Math.PI / 2;
  shipBow.rotation.y = Math.PI / 4;
  shipBow.position.set(0, 1.0 * S, 6.2 * S);
  shipGroup.add(shipBow);

  const cabinGeo = trackGeo(new THREE.BoxGeometry(2.7 * S, 1.9 * S, 3.2 * S));
  const cabin = new THREE.Mesh(cabinGeo, snowMat);
  cabin.position.set(0, 2.5 * S, -2.8 * S);
  shipGroup.add(cabin);

  // Twin side paddle wheels (visible in punk_hazard_f21bc845.JPG!)
  const wheelGeo = trackGeo(new THREE.CylinderGeometry(1.1 * S, 1.1 * S, 0.55 * S, 12));
  for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(wheelGeo, darkSteelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 2.0 * S, 0.9 * S, -1.5 * S);
    shipGroup.add(wheel);
  }

  // Three masts & crisp Marine sails with blue Marine emblem stripes
  const sailCanvas = document.createElement('canvas');
  sailCanvas.width = 128;
  sailCanvas.height = 128;
  const sailCtx = sailCanvas.getContext('2d');
  if (sailCtx) {
    sailCtx.fillStyle = '#f8fafc';
    sailCtx.fillRect(0, 0, 128, 128);
    sailCtx.fillStyle = '#1d4ed8';
    sailCtx.fillRect(0, 16, 128, 14);
    sailCtx.fillRect(0, 98, 128, 14);
    sailCtx.beginPath();
    sailCtx.arc(64, 64, 18, 0, Math.PI * 2);
    sailCtx.strokeStyle = '#1d4ed8';
    sailCtx.lineWidth = 6;
    sailCtx.stroke();
  }
  const sailTex = trackTex(new THREE.CanvasTexture(sailCanvas));
  sailTex.colorSpace = THREE.SRGBColorSpace;
  const sailMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: sailTex,
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );
  const mastGeo = trackGeo(new THREE.CylinderGeometry(0.16 * S, 0.22 * S, 7.2 * S, 7));
  const sailGeo = trackGeo(new THREE.PlaneGeometry(3.2 * S, 2.5 * S));
  for (const mz of [-1.2, 1.4, 3.8]) {
    const mast = new THREE.Mesh(mastGeo, woodMat);
    mast.position.set(0, 4.4 * S, mz * S);
    shipGroup.add(mast);

    const sail = new THREE.Mesh(sailGeo, sailMat);
    sail.position.set(0, 4.9 * S, (mz + 0.18) * S);
    shipGroup.add(sail);
  }
  const bowspritGeo = trackGeo(new THREE.CylinderGeometry(0.1 * S, 0.16 * S, 3.8 * S, 6));
  const bowsprit = new THREE.Mesh(bowspritGeo, woodMat);
  bowsprit.rotation.x = Math.PI * 0.42;
  bowsprit.position.set(0, 2.1 * S, 7.2 * S);
  shipGroup.add(bowsprit);
  group.add(shipGroup);

  // Frozen wooden pier beside G-5 bay
  const pierGroup = new THREE.Group();
  const pierY = samplePunkHazardHeight(
    PUNK_HAZARD_LANDMARKS.g5IcePier.x,
    PUNK_HAZARD_LANDMARKS.g5IcePier.z
  );
  placeOnPunkHazardSphere(
    pierGroup,
    PUNK_HAZARD_LANDMARKS.g5IcePier.x + 2.8,
    pierY - 0.1,
    PUNK_HAZARD_LANDMARKS.g5IcePier.z - 2.4,
    globeRadius,
    -0.55
  );
  const pierDeckGeo = trackGeo(new THREE.BoxGeometry(3.4 * S, 0.45 * S, 8.6 * S));
  const pierDeck = new THREE.Mesh(pierDeckGeo, woodMat);
  pierDeck.position.y = 0.25 * S;
  pierGroup.add(pierDeck);

  const pierSnowGeo = trackGeo(new THREE.BoxGeometry(3.1 * S, 0.18 * S, 8.2 * S));
  const pierSnow = new THREE.Mesh(pierSnowGeo, snowMat);
  pierSnow.position.y = 0.54 * S;
  pierGroup.add(pierSnow);
  group.add(pierGroup);

  // =========================================================================
  // 5. PURPLE TOXIC SHINOKUNI GAS CLOUDS (punk_hazard_f21bc845.JPG)
  // =========================================================================
  const gasGeo = trackGeo(new THREE.DodecahedronGeometry(1, 1));
  const gasMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x581c87,
      emissiveIntensity: 0.42,
      roughness: 0.85,
      metalness: 0.0,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
  );
  const gasCount = 46;
  const gasInstanced = new THREE.InstancedMesh(gasGeo, gasMat, gasCount);
  gasInstanced.frustumCulled = false;
  const gasRecords: Array<{
    lx: number;
    ly: number;
    lz: number;
    r: number;
    phase: number;
  }> = [];

  for (let i = 0; i < 120 && gasRecords.length < gasCount; i++) {
    const n1 = valueNoise2D(i * 0.61 + 2.1, i * 0.49 - 1.3);
    const n2 = valueNoise2D(i * 0.37 - 4.2, i * 0.83 + 2.7);
    const n3 = valueNoise2D(i * 0.88 + 0.9, i * 0.52 + 5.3);

    // Concentrate toxic Shinokuni valleys flanking Caesar's Lab (avoiding camera sightlines)
    const lx = -58 + n1 * 88;
    const lz = -52 + n2 * 40;
    if (
      Math.hypot(lx - PUNK_HAZARD_LANDMARKS.caesarLabPlaza.x, lz - PUNK_HAZARD_LANDMARKS.caesarLabPlaza.z) < 15.5 ||
      Math.hypot(lx - PUNK_HAZARD_LANDMARKS.caesarLab.x, lz - PUNK_HAZARD_LANDMARKS.caesarLab.z) < 16.0 ||
      Math.hypot(lx + 1.5, lz + 23.5) < 14.5 ||
      Math.hypot(lx - PUNK_HAZARD_LANDMARKS.g5BayOverlook.x, lz - PUNK_HAZARD_LANDMARKS.g5BayOverlook.z) < 14.5 ||
      Math.hypot(lx - 39.0, lz + 47.0) < 11.5
    ) {
      continue;
    }
    const { half } = punkHazardLandSignedDist(lx, lz);
    if (half !== 'ice') continue;

    const gy = samplePunkHazardHeight(lx, lz);
    gasRecords.push({
      lx,
      ly: gy + 2.2 + n3 * 5.2,
      lz,
      r: 3.0 + n1 * 3.8,
      phase: n2 * Math.PI * 2,
    });
  }

  for (let i = 0; i < gasRecords.length; i++) {
    const g = gasRecords[i];
    const sp = toPunkHazardSphereLocal(g.lx, g.ly, g.lz, globeRadius);
    _dummy.position.set(sp.x, sp.y, sp.z);
    _dummy.quaternion.identity();
    _dummy.scale.set(g.r * S, g.r * 0.72 * S, g.r * S);
    _dummy.updateMatrix();
    gasInstanced.setMatrixAt(i, _dummy.matrix);
  }
  gasInstanced.count = gasRecords.length;
  gasInstanced.instanceMatrix.needsUpdate = true;
  gasInstanced.computeBoundingSphere();
  group.add(gasInstanced);

  // =========================================================================
  // 6. BURNING LANDS: MELTED INDUSTRIAL RUINS, VOLCANO CRATERS & SMOKE PLUMES
  // =========================================================================
  const ruinBoxGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const slagCapGeo = trackGeo(new THREE.BoxGeometry(1.08, 0.28, 1.08));
  const windowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1a0b09,
      emissive: 0x9a3412,
      emissiveIntensity: 0.38,
      roughness: 0.7,
    })
  );
  const windowGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.22, 1.03));

  for (const ruin of PUNK_HAZARD_RUINS) {
    const rGroup = new THREE.Group();
    const gy = samplePunkHazardHeight(ruin.x, ruin.z);
    placeOnPunkHazardSphere(rGroup, ruin.x, gy - 0.3, ruin.z, globeRadius, ruin.yaw);

    const body = new THREE.Mesh(ruinBoxGeo, concreteMat);
    body.scale.set(ruin.width * S, ruin.height * S, ruin.depth * S);
    body.position.y = ruin.height * 0.48 * S;
    body.rotation.set(ruin.tiltX, 0, ruin.tiltZ);
    rGroup.add(body);

    const slagRoof = new THREE.Mesh(slagCapGeo, lavaSlagMat);
    slagRoof.scale.set(ruin.width * S, ruin.height * S * 0.55, ruin.depth * S);
    slagRoof.position.y = ruin.height * 0.94 * S;
    slagRoof.rotation.set(ruin.tiltX, 0, ruin.tiltZ);
    rGroup.add(slagRoof);

    // Melted dripping slag columns & dark industrial window slits
    for (const wx of [-0.26, 0.26]) {
      const win = new THREE.Mesh(windowGeo, windowMat);
      win.scale.set(ruin.width * S, ruin.height * S, ruin.depth * S);
      win.position.set(wx * ruin.width * S, ruin.height * 0.56 * S, 0);
      win.rotation.set(ruin.tiltX, 0, ruin.tiltZ);
      rGroup.add(win);
    }

    group.add(rGroup);
  }

  // Recessed glowing volcano crater bowls + softer wind-swept ash smoke clouds
  const craterGlowGeo = trackGeo(new THREE.CircleGeometry(1, 16));
  craterGlowGeo.rotateX(-Math.PI / 2);
  for (const v of PUNK_HAZARD_VOLCANOES) {
    const craterMesh = new THREE.Mesh(craterGlowGeo, lavaSlagMat);
    const craterY = samplePunkHazardHeight(v.x, v.z) + 0.35;
    placeOnPunkHazardSphere(craterMesh, v.x, craterY, v.z, globeRadius, 0);
    craterMesh.scale.setScalar(v.craterRadius * 0.48 * S);
    group.add(craterMesh);
  }

  const smokeGeo = trackGeo(new THREE.DodecahedronGeometry(1, 1));
  const smokeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b2c2a,
      emissive: 0x3f1d0b,
      emissiveIntensity: 0.22,
      roughness: 0.96,
      metalness: 0.0,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    })
  );
  const smokePerVolcano = 7;
  const smokeTotal = PUNK_HAZARD_VOLCANOES.length * smokePerVolcano;
  const smokeInstanced = new THREE.InstancedMesh(smokeGeo, smokeMat, smokeTotal);
  smokeInstanced.frustumCulled = false;
  smokeInstanced.computeBoundingSphere();
  group.add(smokeInstanced);

  // =========================================================================
  // 7. CURVED PERIMETER SECURITY FENCE & ICONIC "PUNK HAZARD" GATE (punk_hazard4_39b9ee84.JPG)
  // =========================================================================
  const fenceGroup = new THREE.Group();

  const postGeo = trackGeo(new THREE.BoxGeometry(0.9 * S, 6.2 * S, 0.9 * S));
  const beamGeo = trackGeo(new THREE.BoxGeometry(1, 1.55 * S, 0.35 * S));
  const meshPanelGeo = trackGeo(new THREE.PlaneGeometry(1, 4.2 * S));
  const topRailGeo = trackGeo(new THREE.BoxGeometry(1, 0.32 * S, 0.32 * S));

  const addFenceSpan = (
    ax: number,
    az: number,
    bx: number,
    bz: number
  ) => {
    const mx = (ax + bx) * 0.5;
    const mz = (az + bz) * 0.5;
    const len = Math.hypot(bx - ax, bz - az);
    const yaw = -Math.atan2(bz - az, bx - ax);
    const baseY =
      (samplePunkHazardHeight(ax, az) + samplePunkHazardHeight(bx, bz)) * 0.5;

    const spanObj = new THREE.Group();
    placeOnPunkHazardSphere(spanObj, mx, baseY, mz, globeRadius, yaw);

    const lowBeam = new THREE.Mesh(beamGeo, hazardRedMat);
    lowBeam.scale.set(len * S, 1, 1);
    lowBeam.position.y = 1.15 * S;
    spanObj.add(lowBeam);

    const chainPanel = new THREE.Mesh(meshPanelGeo, chainLinkMat);
    chainPanel.scale.set(len * S, 1, 1);
    chainPanel.position.y = 3.9 * S;
    spanObj.add(chainPanel);

    const topRail = new THREE.Mesh(topRailGeo, darkSteelMat);
    topRail.scale.set(len * S, 1, 1);
    topRail.position.y = 6.0 * S;
    spanObj.add(topRail);

    fenceGroup.add(spanObj);
  };

  for (let i = 0; i < PUNK_HAZARD_FENCE_ARC.length; i++) {
    const pt = PUNK_HAZARD_FENCE_ARC[i];
    const postY = samplePunkHazardHeight(pt.x, pt.z);
    const post = new THREE.Mesh(postGeo, hazardRedMat);
    placeOnPunkHazardSphere(post, pt.x, postY + 3.0, pt.z, globeRadius, 0);
    fenceGroup.add(post);

    // Connect segments everywhere except the central gate opening (between index 4 and 5)
    if (i < PUNK_HAZARD_FENCE_ARC.length - 1 && i !== 4) {
      const next = PUNK_HAZARD_FENCE_ARC[i + 1];
      addFenceSpan(pt.x, pt.z, next.x, next.z);
    }
  }

  // Connect outer fence posts smoothly up to the two Punk Hazard Gate Pillars
  const gateX = PUNK_HAZARD_LANDMARKS.punkHazardGate.x;
  const gateZ = PUNK_HAZARD_LANDMARKS.punkHazardGate.z;
  addFenceSpan(PUNK_HAZARD_FENCE_ARC[4].x, PUNK_HAZARD_FENCE_ARC[4].z, gateX - 4.4, gateZ);
  addFenceSpan(gateX + 4.4, gateZ, PUNK_HAZARD_FENCE_ARC[5].x, PUNK_HAZARD_FENCE_ARC[5].z);

  // Iconic "PUNK HAZARD" Double Gate Portal (punk_hazard4_39b9ee84.JPG)
  const gateObj = new THREE.Group();
  const gateY = samplePunkHazardHeight(gateX, gateZ);
  placeOnPunkHazardSphere(gateObj, gateX, gateY, gateZ, globeRadius, 0);

  // Left & Right thick red/black diagonal hazard-striped gate columns
  const gatePillarGeo = trackGeo(new THREE.BoxGeometry(1.35 * S, 7.6 * S, 1.35 * S));
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(gatePillarGeo, hazardRedMat);
    pillar.position.set(side * 4.4 * S, 3.8 * S, 0);
    gateObj.add(pillar);

    // Thick orange industrial vertical pipes hugging the gate columns
    const vPipeGeo = trackGeo(new THREE.CylinderGeometry(0.32 * S, 0.32 * S, 7.2 * S, 8));
    const vPipe = new THREE.Mesh(vPipeGeo, pipeOrangeMat);
    vPipe.position.set(side * 5.25 * S, 3.6 * S, 0.35 * S);
    gateObj.add(vPipe);

    // Dripping orange molten sludge blob on top of each gate pillar
    const dripGeo = trackGeo(new THREE.SphereGeometry(0.85 * S, 10, 8));
    const drip = new THREE.Mesh(dripGeo, lavaSlagMat);
    drip.scale.set(1.2, 0.72, 1.1);
    drip.position.set(side * 4.35 * S, 7.65 * S, 0.1 * S);
    gateObj.add(drip);
  }

  // Double chain-link + hazard-striped steel doors
  const doorMeshGeo = trackGeo(new THREE.PlaneGeometry(3.6 * S, 5.4 * S));
  const doorBeamGeo = trackGeo(new THREE.BoxGeometry(3.65 * S, 1.3 * S, 0.25 * S));
  const doorFrameGeo = trackGeo(new THREE.BoxGeometry(0.22 * S, 5.6 * S, 0.28 * S));
  for (const side of [-1, 1]) {
    const doorMesh = new THREE.Mesh(doorMeshGeo, chainLinkMat);
    doorMesh.position.set(side * 1.85 * S, 2.8 * S, 0);
    gateObj.add(doorMesh);

    const doorBand = new THREE.Mesh(doorBeamGeo, hazardRedMat);
    doorBand.position.set(side * 1.85 * S, 1.45 * S, 0);
    gateObj.add(doorBand);

    const innerStile = new THREE.Mesh(doorFrameGeo, pipeOrangeMat);
    innerStile.position.set(side * 0.12 * S, 2.8 * S, 0);
    gateObj.add(innerStile);
  }

  // Purple/yellow triangular Biohazard Warning Plaque centered on the doors
  const bioTex = trackTex(createBiohazardSignTexture());
  const bioMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: bioTex,
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.1,
    })
  );
  const bioGeo = trackGeo(new THREE.BoxGeometry(1.7 * S, 1.3 * S, 0.18 * S));
  const bioSign = new THREE.Mesh(bioGeo, bioMat);
  bioSign.position.set(0, 2.85 * S, 0.2 * S);
  gateObj.add(bioSign);

  // Crooked "PUNK HAZARD" banner frame spanning above the gate with dripping molten sludge
  const signTex = trackTex(createPunkHazardSignTexture());
  const signMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: signTex,
      color: 0xffffff,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.35,
      roughness: 0.48,
      metalness: 0.16,
    })
  );
  const signBoardGeo = trackGeo(new THREE.BoxGeometry(7.8 * S, 2.35 * S, 0.36 * S));
  const signBoard = new THREE.Mesh(signBoardGeo, signMat);
  signBoard.position.set(0, 6.25 * S, 0.22 * S);
  signBoard.rotation.z = 0.085; // Crooked tilt matching punk_hazard4_39b9ee84.JPG!
  gateObj.add(signBoard);

  // Molten orange sludge dripping off the crooked PUNK HAZARD banner
  const sludgeGeo = trackGeo(new THREE.SphereGeometry(0.55 * S, 8, 8));
  for (const sx of [-3.0, -0.8, 2.4]) {
    const sludge = new THREE.Mesh(sludgeGeo, lavaSlagMat);
    sludge.scale.set(1.6, 0.65, 1.1);
    sludge.position.set(sx * S, (7.35 + sx * 0.085) * S, 0.28 * S);
    gateObj.add(sludge);
  }

  fenceGroup.add(gateObj);
  group.add(fenceGroup);

  // =========================================================================
  // 8. SEA OF FLAMES SHORELINE + FALLING SNOWFLAKES & RISING EMBERS
  // =========================================================================
  const flameGeo = trackGeo(new THREE.ConeGeometry(0.68, 3.1, 4));
  flameGeo.translate(0, 1.55, 0);
  const flameMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xff7b00,
      emissive: 0xff4800,
      emissiveIntensity: 1.35,
      roughness: 0.32,
      metalness: 0.0,
      transparent: true,
      opacity: 0.88,
    })
  );
  const flameCount = 175;
  const flameInstanced = new THREE.InstancedMesh(flameGeo, flameMat, flameCount);
  flameInstanced.frustumCulled = false;
  const flameRecords: Array<{
    lx: number;
    ly: number;
    lz: number;
    w: number;
    h: number;
    phase: number;
  }> = [];

  for (let i = 0; i < 155; i++) {
    const t = i / 154;
    // Arc around entire southern Burning Lands coast & burning offshore sea patches
    const angle = 0.14 + t * (Math.PI - 0.28);
    const radialJitter = ((valueNoise2D(i * 0.71, i * 0.37) - 0.5) * 9.5);
    const radius = i % 4 === 0 ? 85.0 + radialJitter : 78.5 + radialJitter * 0.5;
    const lx = Math.cos(angle) * radius;
    const lz = Math.sin(angle) * radius;

    // Keep direct centerline sightline in front of gate camera (-6, 81.5) clear
    if (Math.abs(lx + 6.0) < 4.5 && lz > 72.0) continue;

    const gy = Math.max(0.05, samplePunkHazardHeight(lx, lz));
    flameRecords.push({
      lx,
      ly: gy,
      lz,
      w: 0.85 + valueNoise2D(i * 0.43, 1.7) * 1.15,
      h: 1.3 + valueNoise2D(2.3, i * 0.63) * 2.4,
      phase: i * 0.55,
    });
  }

  // Add foreground flanking flame licks on left/right corners of the Punk Hazard Gate plaza (punk_hazard4_39b9ee84.JPG)
  const gateEdgeFlames: readonly [number, number][] = [
    [-11.8, 76.8], [-10.8, 77.6], [-12.5, 78.2], [-10.2, 78.8],
    [-0.2, 76.8], [0.8, 77.6], [-1.0, 78.5], [1.4, 78.0],
  ];
  for (let i = 0; i < gateEdgeFlames.length && flameRecords.length < flameCount; i++) {
    const [lx, lz] = gateEdgeFlames[i];
    const gy = Math.max(0.05, samplePunkHazardHeight(lx, lz));
    flameRecords.push({
      lx,
      ly: gy,
      lz,
      w: 0.72,
      h: 1.15,
      phase: i * 0.9,
    });
  }

  flameInstanced.count = flameRecords.length;
  for (let i = 0; i < flameRecords.length; i++) {
    const hot = (i % 3) / 2;
    _tmpColor.setRGB(1.0, 0.38 + hot * 0.42, 0.04 + hot * 0.18);
    flameInstanced.setColorAt(i, _tmpColor);
  }
  if (flameInstanced.instanceColor) flameInstanced.instanceColor.needsUpdate = true;
  flameInstanced.computeBoundingSphere();
  group.add(flameInstanced);

  // =========================================================================
  // 9. ANIMATED UPDATE LOOP (ZERO ALLOCATION)
  // =========================================================================
  const update = (elapsed: number, dist?: number) => {
    const isClose = dist === undefined || dist < 1.8;

    // Gentle sway on Caesar Lab's suspended hazard crate
    cranePivot.rotation.z = Math.sin(elapsed * 0.85) * 0.07;
    cranePivot.rotation.x = Math.cos(elapsed * 0.65) * 0.04;

    if (!isClose) return;

    // 1. Flicker Sea of Flames along Burning Lands shoreline
    for (let i = 0; i < flameRecords.length; i++) {
      const f = flameRecords[i];
      const pulse = 0.82 + 0.34 * Math.sin(elapsed * 6.2 + f.phase);
      const sp = toPunkHazardSphereLocal(f.lx, f.ly, f.lz, globeRadius);
      _localNormal.set(sp.x, globeRadius + sp.y, sp.z).normalize();
      _tiltQuat.setFromUnitVectors(_up, _localNormal);
      _yawQuat.setFromAxisAngle(_yAxis, f.phase + Math.sin(elapsed * 2.5 + f.phase) * 0.25);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
      _dummy.scale.set(f.w * S, f.h * pulse * S, f.w * S);
      _dummy.updateMatrix();
      flameInstanced.setMatrixAt(i, _dummy.matrix);
    }
    flameInstanced.instanceMatrix.needsUpdate = true;

    // 2. Drift purple Shinokuni gas clouds slowly across Ice Half valleys
    for (let i = 0; i < gasRecords.length; i++) {
      const g = gasRecords[i];
      const driftX = Math.sin(elapsed * 0.35 + g.phase) * 1.8;
      const driftY = Math.cos(elapsed * 0.45 + g.phase) * 0.7;
      const sp = toPunkHazardSphereLocal(g.lx + driftX, g.ly + driftY, g.lz, globeRadius);
      const breathe = 1 + Math.sin(elapsed * 0.6 + g.phase) * 0.08;
      _dummy.position.set(sp.x, sp.y, sp.z);
      _dummy.quaternion.identity();
      _dummy.scale.set(g.r * breathe * S, g.r * 0.72 * S, g.r * breathe * S);
      _dummy.updateMatrix();
      gasInstanced.setMatrixAt(i, _dummy.matrix);
    }
    gasInstanced.instanceMatrix.needsUpdate = true;

    // 3. Wind-blown ash smoke clouds billowing from all 6 volcanic craters
    let sIdx = 0;
    for (let vIdx = 0; vIdx < PUNK_HAZARD_VOLCANOES.length; vIdx++) {
      const v = PUNK_HAZARD_VOLCANOES[vIdx];
      for (let k = 0; k < smokePerVolcano; k++) {
        const life = ((elapsed * 0.18 + k / smokePerVolcano + vIdx * 0.17) % 1 + 1) % 1;
        const puffY = v.height * 0.92 + 2.2 + life * 17.0 * v.smokeScale;
        const driftX = life * 11.5 + Math.sin(elapsed * 0.7 + k + vIdx) * 1.6;
        const driftZ = -life * 5.0;
        const puffR = (1.9 + life * 4.4) * v.smokeScale * (1 - life * 0.18);

        const sp = toPunkHazardSphereLocal(v.x + driftX, puffY, v.z + driftZ, globeRadius);
        _dummy.position.set(sp.x, sp.y, sp.z);
        _dummy.quaternion.identity();
        _dummy.scale.set(puffR * 1.42 * S, puffR * 0.72 * S, puffR * 1.25 * S);
        _dummy.updateMatrix();
        smokeInstanced.setMatrixAt(sIdx++, _dummy.matrix);
      }
    }
    smokeInstanced.instanceMatrix.needsUpdate = true;
  };

  // Run initial frame so flames & smoke plumes start populated immediately
  update(0, 0);

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update,
  };
}
