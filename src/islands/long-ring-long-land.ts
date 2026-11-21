import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  LONG_RING_BOXING_ARENA,
  LONG_RING_FOXY_PIER,
  LONG_RING_FOXY_SHIP,
  LONG_RING_GLOBE_SCALE,
  LONG_RING_PROPS,
  LONG_RING_SEA_LEVEL_Y,
  LONG_RING_TONJIT_HOUSE,
  LONG_RING_TREES,
  LONG_RING_WORLD_SIZE,
  longRingLobesSignedDist,
  longRingPathSignedDist,
  longRingSubmergedBandSignedDist,
  sampleLongRingHeight,
  toLongRingSphereLocal,
} from '../utils/longRingTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = LONG_RING_GLOBE_SCALE;
const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);
const _rollAxis = new THREE.Vector3(0, 0, 1);

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

function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const merged = mergeGeometries(nonIndexed, false);
  for (const g of nonIndexed) {
    if (!parts.includes(g)) g.dispose();
  }
  for (const g of parts) g.dispose();
  return merged ?? new THREE.BoxGeometry(1, 1, 1);
}

function createLongRingTerrainTexture(size = 768): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = LONG_RING_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * LONG_RING_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * LONG_RING_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const h = sampleLongRingHeight(x, z);
      const hx = sampleLongRingHeight(x + 0.9, z);
      const hz = sampleLongRingHeight(x, z + 0.9);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 1.1, 0, 1);
      const grain = (valueNoise2D(x * 1.4, z * 1.4) - 0.5) * 12;
      const meadowPatch = valueNoise2D(x * 0.14 + 2.7, z * 0.14 - 1.9);

      let rgb: [number, number, number] = [118, 174, 78];
      let alpha = 0;

      if (h < -2.8) {
        alpha = smoothstep(-4.4, -2.8, h);
        rgb = [40, 132, 176];
      } else {
        alpha = 1;
        const shoalT = smoothstep(-2.4, 0.9, h);
        const beachT = smoothstep(0.9, 1.72, h);
        const grassT = smoothstep(1.68, 2.25, h);

        const shoalCol: [number, number, number] = [66, 198, 204];
        const sandCol = mixRgb([232, 212, 160], [216, 194, 140], meadowPatch * 0.65);
        const coastSand = mixRgb(shoalCol, sandCol, shoalT);

        // Sunlit sage & emerald meadow palette matching reference landscape
        const lowMeadow = mixRgb([124, 178, 84], [102, 162, 68], meadowPatch);
        const ridgeGrass = mixRgb([90, 148, 56], [74, 128, 48], meadowPatch);
        const elevT = smoothstep(2.6, 5.2, h);
        const meadowCol = mixRgb(lowMeadow, ridgeGrass, elevT);

        rgb = mixRgb(coastSand, sandCol, beachT);
        rgb = mixRgb(rgb, meadowCol, grassT);

        // Subtle warm coastal rock edge on steeper slopes
        const rockSlope = smoothstep(0.28, 0.58, slope) * smoothstep(2.0, 3.8, h);
        if (rockSlope > 0.02) {
          rgb = mixRgb(rgb, [146, 134, 102], rockSlope * 0.55);
        }

        // Compaction earth pad under Tonjit's stilts & Boxing Arena courtyard
        const arenaD = Math.hypot(
          x - LONG_RING_BOXING_ARENA.x,
          z - LONG_RING_BOXING_ARENA.z
        );
        if (arenaD < 8.8 && h > 1.8) {
          const padT = 1 - smoothstep(4.5, 8.8, arenaD);
          rgb = mixRgb(rgb, [178, 152, 104], padT * 0.62);
        }

        const tonjitD = Math.hypot(
          x - LONG_RING_TONJIT_HOUSE.x,
          z - LONG_RING_TONJIT_HOUSE.z
        );
        if (tonjitD < 3.8 && h > 1.8) {
          const tPad = 1 - smoothstep(1.6, 3.8, tonjitD);
          rgb = mixRgb(rgb, [168, 140, 96], tPad * 0.55);
        }

        // Crisp winding footpaths connecting beaches, Tonjit's house, Arena & Foxy jetty
        const pathD = longRingPathSignedDist(x, z);
        if (pathD < 0.75 && h > 1.35) {
          const edgeT =
            smoothstep(-0.35, 0.25, pathD) * (1 - smoothstep(0.25, 0.75, pathD));
          const coreT = 1 - smoothstep(-0.4, 0.28, pathD);
          rgb = mixRgb(rgb, [146, 122, 82], edgeT * 0.58);
          rgb = mixRgb(rgb, [196, 166, 112], coreT * 0.85);
        }
      }

      data[idx] = clamp(Math.round(rgb[0] + (h > 1.0 ? grain : 0)), 0, 255);
      data[idx + 1] = clamp(Math.round(rgb[1] + (h > 1.0 ? grain : 0)), 0, 255);
      data[idx + 2] = clamp(Math.round(rgb[2] + (h > 1.0 ? grain : 0)), 0, 255);
      data[idx + 3] = clamp(Math.round(alpha * 255), 0, 255);
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Translucent turquoise submerged reef ring texture painted strictly over the
 * shallow inter-island saddles so the 10-island fragmented ring reads clearly
 * from globe orbit (matching Oda's canonical submerged ring diagram).
 */
function createSubmergedRingTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = LONG_RING_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * LONG_RING_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * LONG_RING_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const bandSd = longRingSubmergedBandSignedDist(x, z);
      const { sd: lobeSd } = longRingLobesSignedDist(x, z);
      const ripple = valueNoise2D(x * 0.22, z * 0.22);

      // Show luminous turquoise shoal ring where underwater band lies between dry islands
      const ringAlpha = 1 - smoothstep(-1.5, 4.4, bandSd);
      const seaChannelMask = smoothstep(-2.5, 1.5, lobeSd);
      const beachHalo = 1 - smoothstep(0.0, 5.5, lobeSd);

      const totalAlpha = clamp(
        ringAlpha * (0.72 * seaChannelMask + 0.35 * (1 - seaChannelMask)) +
          beachHalo * 0.42,
        0,
        0.78
      );

      const rgb = mixRgb(
        [44, 194, 206],
        [106, 228, 214],
        clamp(ringAlpha * 0.75 + ripple * 0.25, 0, 1)
      );

      data[idx] = Math.round(rgb[0]);
      data[idx + 1] = Math.round(rgb[1]);
      data[idx + 2] = Math.round(rgb[2]);
      data[idx + 3] = Math.round(totalAlpha * 255);
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createPlankTexture(baseHex = '#966b43', rows = 10): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);
  const rowH = 256 / rows;
  for (let i = 0; i < rows; i++) {
    const shade = ((i * 31) % 22) - 11;
    ctx.fillStyle = `rgba(${shade > 0 ? 255 : 24}, ${shade > 0 ? 230 : 14}, ${shade > 0 ? 190 : 8}, ${Math.abs(shade) / 145})`;
    ctx.fillRect(0, i * rowH, 256, rowH);
    ctx.fillStyle = 'rgba(32, 18, 9, 0.52)';
    ctx.fillRect(0, i * rowH, 256, 2);
    const seamX = ((i * 73 + 29) % 210) + 20;
    ctx.fillRect(seamX, i * rowH, 2, rowH);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createFoxySailTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Cream canvas with bold Foxy crimson-pink horizontal stripes
  ctx.fillStyle = '#f8f1e6';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#cf3554';
  for (let y = 0; y < 256; y += 64) {
    ctx.fillRect(0, y, 256, 22);
  }

  // Stylized Foxy Pirates Jolly Roger emblem (dark skull + pointed fox ears + crossbones)
  ctx.fillStyle = '#18171c';
  ctx.beginPath();
  ctx.arc(128, 134, 42, 0, Math.PI * 2);
  ctx.fill();
  // Pointed fox ears atop skull
  ctx.beginPath();
  ctx.moveTo(92, 114);
  ctx.lineTo(80, 62);
  ctx.lineTo(116, 98);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(164, 114);
  ctx.lineTo(176, 62);
  ctx.lineTo(140, 98);
  ctx.closePath();
  ctx.fill();

  // White skull mask accent & eyes
  ctx.fillStyle = '#f8f1e6';
  ctx.beginPath();
  ctx.arc(112, 130, 8, 0, Math.PI * 2);
  ctx.arc(144, 130, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cf3554';
  ctx.fillRect(116, 152, 24, 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBoxingMatTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#efe7d2';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#c83442';
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, 228, 228);

  ctx.strokeStyle = '#254a8a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(128, 128, 54, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#c83442';
  ctx.beginPath();
  ctx.arc(128, 128, 22, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function buildTonjitStiltHouse(
  plankMat: THREE.Material,
  darkWoodMat: THREE.Material,
  thatchMat: THREE.Material,
  bambooMat: THREE.Material,
  stoneMat: THREE.Material,
  windowMat: THREE.Material,
  getColorMat: (hex: number, r?: number) => THREE.MeshStandardMaterial
): THREE.Group {
  const g = new THREE.Group();
  const H = LONG_RING_TONJIT_HOUSE.stiltHeight; // 5.8m tall slender stilts

  // Anchored stone earth plinth pad
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.95, 0.36, 10),
    stoneMat
  );
  pad.position.y = 0.08;
  pad.receiveShadow = true;
  g.add(pad);

  // 4 Tall Slender Stilts + X-Bracing struts
  const stiltOffsets: [number, number][] = [
    [-1.45, -1.35],
    [1.45, -1.35],
    [-1.45, 1.35],
    [1.45, 1.35],
  ];
  for (const [sx, sz] of stiltOffsets) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.15, H + 0.4, 7),
      bambooMat
    );
    leg.position.set(sx, (H + 0.4) * 0.5 - 0.1, sz);
    leg.castShadow = true;
    leg.receiveShadow = true;
    g.add(leg);

    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.25, 0.3, 8),
      stoneMat
    );
    collar.position.set(sx, 0.24, sz);
    g.add(collar);
  }

  // Horizontal cross-ties at mid-height & deck underside
  for (const tierY of [H * 0.38, H * 0.72, H - 0.14]) {
    const tieF = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.12, 0.12), bambooMat);
    tieF.position.set(0, tierY, 1.35);
    const tieB = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.12, 0.12), bambooMat);
    tieB.position.set(0, tierY, -1.35);
    const tieL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.95), bambooMat);
    tieL.position.set(-1.45, tierY, 0);
    const tieR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.95), bambooMat);
    tieR.position.set(1.45, tierY, 0);
    g.add(tieF, tieB, tieL, tieR);
  }

  // Elevated Wooden Veranda Deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.24, 3.8), darkWoodMat);
  deck.position.y = H + 0.08;
  deck.castShadow = true;
  deck.receiveShadow = true;
  g.add(deck);

  // Veranda Balustrade Rails (leaving opening on +X side for the ladder)
  const railSides: [number, number, number, number][] = [
    [0, 1.8, 3.8, 0.1],
    [0, -1.8, 3.8, 0.1],
    [-1.88, 0, 0.1, 3.6],
  ];
  for (const [rx, rz, rw, rd] of railSides) {
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.1, rd), plankMat);
    railTop.position.set(rx, H + 0.92, rz);
    g.add(railTop);
  }
  for (const [px, pz] of [
    [-1.86, -1.8],
    [0, -1.8],
    [1.86, -1.8],
    [-1.86, 0],
    [-1.86, 1.8],
    [0, 1.8],
    [1.86, 1.8],
  ]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.86, 6), darkWoodMat);
    post.position.set(px, H + 0.56, pz);
    g.add(post);
  }

  // Small Cozy Wooden Cabin at Deck Center (-0.25m shifted back slightly so porch fronts +X ladder)
  const cabinW = 2.65;
  const cabinD = 2.55;
  const cabinH = 2.05;
  const cabinX = -0.35;
  const cabinY = H + 0.2;

  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(cabinW, cabinH, cabinD),
    plankMat
  );
  walls.position.set(cabinX, cabinY + cabinH * 0.5, 0);
  walls.castShadow = true;
  walls.receiveShadow = true;
  g.add(walls);

  // Pitched Wood & Thatched Gable Roof (2 sloped panels + gable ends + ridge beam)
  const slopeAngle = 0.52;
  for (const side of [-1, 1]) {
    const slope = new THREE.Mesh(
      new THREE.BoxGeometry(cabinW + 0.55, 0.16, 1.95),
      thatchMat
    );
    slope.position.set(cabinX, cabinY + cabinH + 0.42, side * 0.72);
    slope.rotation.x = side * slopeAngle;
    slope.castShadow = true;
    g.add(slope);
  }
  const ridgeCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, cabinW + 0.68, 8),
    darkWoodMat
  );
  ridgeCap.rotation.z = Math.PI * 0.5;
  ridgeCap.position.set(cabinX, cabinY + cabinH + 0.94, 0);
  g.add(ridgeCap);

  // Cabin Doorway (+X facing porch) & glowing shuttered windows
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.38, 0.88), darkWoodMat);
  doorFrame.position.set(cabinX + cabinW * 0.5 + 0.02, cabinY + 0.7, 0);
  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 1.24, 0.72),
    getColorMat(0x523118, 0.88)
  );
  doorPanel.position.set(cabinX + cabinW * 0.5 + 0.05, cabinY + 0.65, 0);
  g.add(doorFrame, doorPanel);

  for (const wz of [-1, 1]) {
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.68, 0.12), darkWoodMat);
    winFrame.position.set(cabinX, cabinY + 1.18, wz * (cabinD * 0.5 + 0.03));
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.5, 0.14), windowMat);
    winGlass.position.set(cabinX, cabinY + 1.18, wz * (cabinD * 0.5 + 0.04));
    g.add(winFrame, winGlass);
  }

  // Slender stovepipe chimney & hanging porch lantern
  const chimney = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 1.15, 8),
    getColorMat(0x3a3634, 0.78)
  );
  chimney.position.set(cabinX - 0.65, cabinY + cabinH + 1.05, -0.55);
  g.add(chimney);

  const lanternGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.24, 8),
    windowMat
  );
  lanternGlow.position.set(cabinX + cabinW * 0.5 + 0.28, cabinY + 1.56, 0.58);
  g.add(lanternGlow);

  // Tall Climbing Bamboo Ladder from +X Deck Opening down to Earth Path
  const ladderLen = Math.hypot(2.2, H + 0.2);
  const ladderPitch = Math.atan2(2.2, H + 0.2);
  const ladderGroup = new THREE.Group();
  for (const lz of [-0.34, 0.34]) {
    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.065, ladderLen, 6),
      bambooMat
    );
    rail.position.set(0, 0, lz);
    ladderGroup.add(rail);
  }
  const rungCount = 13;
  for (let r = 0; r < rungCount; r++) {
    const ry = -ladderLen * 0.44 + (r / (rungCount - 1)) * (ladderLen * 0.88);
    const rung = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.72, 6),
      darkWoodMat
    );
    rung.rotation.x = Math.PI * 0.5;
    rung.position.set(0, ry, 0);
    ladderGroup.add(rung);
  }
  ladderGroup.rotation.z = -ladderPitch;
  ladderGroup.position.set(2.9, (H + 0.2) * 0.5, 0);
  g.add(ladderGroup);

  return g;
}

function buildBoxingArena(
  darkWoodMat: THREE.Material,
  plankMat: THREE.Material,
  matTexture: THREE.Texture,
  getColorMat: (hex: number, r?: number) => THREE.MeshStandardMaterial
): THREE.Group {
  const g = new THREE.Group();
  const size = LONG_RING_BOXING_ARENA.platformSize;
  const h = LONG_RING_BOXING_ARENA.platformHeight;
  const half = size * 0.5;

  // Heavy Timber Apron Frame
  const apron = new THREE.Mesh(new THREE.BoxGeometry(size, h, size), darkWoodMat);
  apron.position.y = h * 0.5;
  apron.castShadow = true;
  apron.receiveShadow = true;
  g.add(apron);

  // Fighting Ring Canvas Mat offset cleanly (+0.045m) to avoid Z-fighting
  const canvasMat = new THREE.MeshStandardMaterial({
    map: matTexture,
    roughness: 0.88,
  });
  const ringCanvas = new THREE.Mesh(
    new THREE.BoxGeometry(size - 0.52, 0.09, size - 0.52),
    canvasMat
  );
  ringCanvas.position.y = h + 0.045;
  ringCanvas.receiveShadow = true;
  g.add(ringCanvas);

  // Wooden Stairs on West (-X) and East (+X) Sides
  for (const sx of [-1, 1]) {
    for (let step = 0; step < 3; step++) {
      const stair = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, h * ((3 - step) / 3), 1.6),
        plankMat
      );
      stair.position.set(sx * (half + 0.25 + step * 0.42), h * ((3 - step) / 6), 0);
      stair.castShadow = true;
      stair.receiveShadow = true;
      g.add(stair);
    }
  }

  // Four Padded Corner Turnbuckle Posts (Red vs Blue Davy Back corners)
  const redCornerMat = getColorMat(0xc9323e, 0.55);
  const blueCornerMat = getColorMat(0x2856a8, 0.55);
  const goldCapMat = getColorMat(0xe5b842, 0.35);
  const ropeRedMat = getColorMat(0xd42c3b, 0.52);

  const postSpan = half - 0.36;
  const corners: [number, number, THREE.Material][] = [
    [-postSpan, -postSpan, blueCornerMat],
    [postSpan, -postSpan, redCornerMat],
    [postSpan, postSpan, redCornerMat],
    [-postSpan, postSpan, blueCornerMat],
  ];
  for (const [cx, cz, cMat] of corners) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.55, 8), cMat);
    post.position.set(cx, h + 0.78, cz);
    post.castShadow = true;
    g.add(post);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), goldCapMat);
    cap.position.set(cx, h + 1.58, cz);
    g.add(cap);
  }

  // 3 Taut Tiers of Ring Ropes along all 4 sides
  const spanLen = postSpan * 2;
  for (const ry of [h + 0.48, h + 0.9, h + 1.32]) {
    for (const sz of [-postSpan, postSpan]) {
      const ropeX = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.036, spanLen, 6),
        ropeRedMat
      );
      ropeX.rotation.z = Math.PI * 0.5;
      ropeX.position.set(0, ry, sz);
      g.add(ropeX);
    }
    for (const sx of [-postSpan, postSpan]) {
      const ropeZ = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.036, spanLen, 6),
        ropeRedMat
      );
      ropeZ.rotation.x = Math.PI * 0.5;
      ropeZ.position.set(sx, ry, 0);
      g.add(ropeZ);
    }
  }

  // Brass Boxing Gong Bell at Ringside & Fighter Stool
  const gongStand = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.4), darkWoodMat);
  gongStand.position.set(-half - 0.55, 0.45, -1.7);
  const gongBell = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12), goldCapMat);
  gongBell.rotation.z = Math.PI * 0.5;
  gongBell.position.set(-half - 0.55, 1.05, -1.7);
  g.add(gongStand, gongBell);

  // 4 Spectator Davy Back Fight Banners Framing the Arena Plain
  const bannerMat = getColorMat(0xcf3554, 0.72);
  const whiteTrim = getColorMat(0xf4eee0, 0.75);
  for (const [bx, bz, bYaw] of [
    [-half - 2.2, -half - 1.6, 0.4],
    [half + 2.2, -half - 1.6, -0.4],
    [-half - 2.2, half + 1.6, 2.7],
    [half + 2.2, half + 1.6, -2.7],
  ]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 4.4, 6), darkWoodMat);
    pole.position.set(bx, 2.2, bz);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.95, 0.06), bannerMat);
    flag.position.set(bx + Math.cos(bYaw) * 0.72, 3.75, bz + Math.sin(bYaw) * 0.72);
    flag.rotation.y = -bYaw;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.2, 0.08), whiteTrim);
    stripe.position.copy(flag.position);
    stripe.rotation.copy(flag.rotation);
    g.add(pole, flag, stripe);
  }

  return g;
}

/**
 * Foxy's Iconic Flagship: The *Sexy Foxy*
 * Features sculpted Fox-Head Figurehead (`figure de proue en forme de renard`),
 * side paddlewheels, twin-deck sterncastle, and pink/crimson striped Foxy Jolly Roger sails.
 */
function buildSexyFoxyShip(
  darkWoodMat: THREE.Material,
  plankMat: THREE.Material,
  sailMat: THREE.Material,
  getColorMat: (hex: number, r?: number) => THREE.MeshStandardMaterial
): THREE.Group {
  const g = new THREE.Group();
  const L = LONG_RING_FOXY_SHIP.length; // 21m
  const B = LONG_RING_FOXY_SHIP.beam; // 5.6m

  const foxyCrimsonMat = getColorMat(0xcf3554, 0.62);
  const foxyPinkMat = getColorMat(0xe57e96, 0.68);
  const creamTrimMat = getColorMat(0xf4ead8, 0.78);
  const goldMat = getColorMat(0xe2b346, 0.34);
  const foxFurMat = getColorMat(0xd96b27, 0.62);
  const foxNoseMat = getColorMat(0x18151a, 0.25);
  const windowGlowMat = getColorMat(0xffc966, 0.35);

  // Main Curved Hull Body + Beveled Tapered Bow
  const mainHull = new THREE.Mesh(new THREE.BoxGeometry(B * 0.92, 2.75, L * 0.62), foxyCrimsonMat);
  mainHull.position.set(0, 0.45, -L * 0.04);
  mainHull.castShadow = true;
  mainHull.receiveShadow = true;
  g.add(mainHull);

  // Lower Waterline Keel Hull Band
  const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(B * 0.82, 1.35, L * 0.7), darkWoodMat);
  lowerHull.position.set(0, -0.5, -L * 0.02);
  g.add(lowerHull);

  // White & Pink Racing Hull Trim Bands
  const hullStripe = new THREE.Mesh(new THREE.BoxGeometry(B * 0.96, 0.38, L * 0.63), creamTrimMat);
  hullStripe.position.set(0, 1.35, -L * 0.04);
  g.add(hullStripe);

  // Tapered Forward Bow Hull Segments (+Z direction = Bow!)
  const bowMid = new THREE.Mesh(new THREE.CylinderGeometry(1.75, B * 0.45, L * 0.24, 6), foxyCrimsonMat);
  bowMid.rotation.x = Math.PI * 0.5;
  bowMid.scale.set(1.0, 1.0, 0.68);
  bowMid.position.set(0, 0.65, L * 0.34);
  bowMid.castShadow = true;
  g.add(bowMid);

  const bowProa = new THREE.Mesh(new THREE.ConeGeometry(1.72, L * 0.18, 6), foxyPinkMat);
  bowProa.rotation.x = Math.PI * 0.5;
  bowProa.scale.set(0.88, 1.0, 0.72);
  bowProa.position.set(0, 0.95, L * 0.49);
  bowProa.castShadow = true;
  g.add(bowProa);

  // Planked Weather Deck
  const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(B * 0.86, 0.24, L * 0.66), plankMat);
  mainDeck.position.set(0, 1.88, -L * 0.02);
  mainDeck.receiveShadow = true;
  g.add(mainDeck);

  // Ornate Twin-Tier Aft Sterncastle (-Z direction = Stern)
  const sternBase = new THREE.Mesh(new THREE.BoxGeometry(B * 0.95, 2.55, L * 0.22), foxyPinkMat);
  sternBase.position.set(0, 2.75, -L * 0.32);
  sternBase.castShadow = true;
  g.add(sternBase);

  const sternCabin = new THREE.Mesh(new THREE.BoxGeometry(B * 0.84, 1.55, L * 0.16), foxyCrimsonMat);
  sternCabin.position.set(0, 4.45, -L * 0.34);
  sternCabin.castShadow = true;
  g.add(sternCabin);

  const sternRoof = new THREE.Mesh(new THREE.BoxGeometry(B * 0.92, 0.28, L * 0.19), goldMat);
  sternRoof.position.set(0, 5.32, -L * 0.34);
  g.add(sternRoof);

  // Stern Transom Windows
  for (const wx of [-1.25, 0, 1.25]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.18), windowGlowMat);
    win.position.set(wx, 3.05, -L * 0.435);
    g.add(win);
  }

  // Iconic Dual Side Paddlewheels & Pink Wheelhouse Boxes (Port & Starboard)
  for (const sx of [-1, 1]) {
    const box = new THREE.Mesh(
      new THREE.CylinderGeometry(1.72, 1.72, 1.1, 12, 1, false, 0, Math.PI),
      foxyPinkMat
    );
    box.rotation.z = Math.PI * 0.5;
    box.rotation.x = Math.PI * 0.5;
    box.position.set(sx * (B * 0.5 + 0.32), 0.75, -0.4);
    box.castShadow = true;
    g.add(box);

    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.48, 0.75, 10), darkWoodMat);
    wheel.rotation.z = Math.PI * 0.5;
    wheel.position.set(sx * (B * 0.5 + 0.38), 0.3, -0.4);
    g.add(wheel);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.66, 0.14, 6, 14), goldMat);
    rim.rotation.y = Math.PI * 0.5;
    rim.position.set(sx * (B * 0.5 + 0.85), 0.75, -0.4);
    g.add(rim);

    // Hull Portholes
    for (let p = -1; p <= 1; p++) {
      const port = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.16, 10), goldMat);
      port.rotation.z = Math.PI * 0.5;
      port.position.set(sx * (B * 0.47), 0.75, 2.9 + p * 1.45);
      g.add(port);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCULPTED FOX-HEAD FIGUREHEAD ("figure de proue en forme de renard")
  // Extending prominently off the prow (+Z) with pointed ears, elongated snout & collar!
  // ═══════════════════════════════════════════════════════════════════════
  const foxGroup = new THREE.Group();
  foxGroup.position.set(0, 2.05, L * 0.52);
  foxGroup.scale.setScalar(1.18);

  // Cream Fluffy Fox Neck Ruff Collar seated on the prow tip
  const neckCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.02, 0.9, 10), creamTrimMat);
  neckCollar.rotation.x = Math.PI * 0.34;
  neckCollar.position.set(0, 0.1, 0.18);
  foxGroup.add(neckCollar);

  // Sculpted Russet-Orange Fox Cranium
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.84, 12, 10), foxFurMat);
  skull.scale.set(0.95, 0.86, 1.15);
  skull.position.set(0, 0.52, 0.92);
  skull.castShadow = true;
  foxGroup.add(skull);

  // White Fluffy Cheek Whisker Ruffs
  for (const sx of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.65, 5), creamTrimMat);
    cheek.rotation.z = -sx * Math.PI * 0.42;
    cheek.rotation.y = sx * 0.35;
    cheek.position.set(sx * 0.72, 0.36, 0.82);
    foxGroup.add(cheek);
  }

  // Long Tapered Pointed Fox Snout + White Underside + Glossy Black Nose Tip
  const snoutTop = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.55, 6), foxFurMat);
  snoutTop.rotation.x = Math.PI * 0.52;
  snoutTop.scale.set(0.95, 1.0, 0.78);
  snoutTop.position.set(0, 0.44, 1.78);
  snoutTop.castShadow = true;
  foxGroup.add(snoutTop);

  const snoutBottom = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.35, 6), creamTrimMat);
  snoutBottom.rotation.x = Math.PI * 0.5;
  snoutBottom.scale.set(0.92, 1.0, 0.42);
  snoutBottom.position.set(0, 0.25, 1.66);
  foxGroup.add(snoutBottom);

  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), foxNoseMat);
  noseTip.position.set(0, 0.42, 2.55);
  foxGroup.add(noseTip);

  // Expressive Cunning Fox Eyes (gold iris + dark pupils)
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), foxNoseMat);
    eye.position.set(sx * 0.42, 0.72, 1.48);
    foxGroup.add(eye);
  }

  // Iconic Tall Pointed Triangular Fox Ears + Cream Inner Ear Cones
  for (const sx of [-1, 1]) {
    const outerEar = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.28, 4), foxFurMat);
    outerEar.rotation.z = -sx * 0.24;
    outerEar.rotation.x = -0.15;
    outerEar.position.set(sx * 0.56, 1.44, 0.72);
    outerEar.castShadow = true;
    foxGroup.add(outerEar);

    const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.92, 4), creamTrimMat);
    innerEar.rotation.copy(outerEar.rotation);
    innerEar.position.set(sx * 0.56, 1.4, 0.85);
    foxGroup.add(innerEar);
  }

  // Angled Gilded Bowsprit Rising Cleanly Beneath the Fox Chin & Snout
  const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.21, 4.5, 8), darkWoodMat);
  bowsprit.rotation.x = Math.PI * 0.44;
  bowsprit.position.set(0, -0.02, 2.38);
  foxGroup.add(bowsprit);

  g.add(foxGroup);

  // 3 Tall Masts with Striped Foxy Pirates Square Sails & Crow's Nests
  const mastSpecs = [
    { mz: 4.1, height: 10.2, sailW: 4.2, sailH: 3.3 },
    { mz: -0.4, height: 12.6, sailW: 5.2, sailH: 3.9 },
    { mz: -5.4, height: 9.4, sailW: 3.6, sailH: 2.8 },
  ];
  for (const ms of mastSpecs) {
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.22, ms.height, 8),
      darkWoodMat
    );
    mast.position.set(0, 1.9 + ms.height * 0.5, ms.mz);
    mast.castShadow = true;
    g.add(mast);

    const nest = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.48, 0.55, 8), plankMat);
    nest.position.set(0, 1.9 + ms.height * 0.78, ms.mz);
    g.add(nest);

    // Lower Main Striped Square Sail + Upper Topsail
    for (const [yFrac, wScale, hScale] of [
      [0.44, 1.0, 1.0],
      [0.72, 0.74, 0.7],
    ] as const) {
      const sW = ms.sailW * wScale;
      const sH = ms.sailH * hScale;
      const sy = 1.9 + ms.height * yFrac;

      const yard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, sW + 0.65, 6),
        darkWoodMat
      );
      yard.rotation.z = Math.PI * 0.5;
      yard.position.set(0, sy + sH * 0.48, ms.mz + 0.16);
      g.add(yard);

      const arcR = sW * 1.15;
      const sailGeo = new THREE.CylinderGeometry(
        arcR,
        arcR,
        sH,
        10,
        1,
        true,
        -0.44,
        0.88
      );
      const sailMesh = new THREE.Mesh(sailGeo, sailMat);
      sailMesh.position.set(0, sy, ms.mz - arcR * 0.84 + 0.18);
      sailMesh.castShadow = true;
      g.add(sailMesh);
    }

    // Masthead Foxy Crimson Pennant Flag
    const pennant = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 1.5), foxyCrimsonMat);
    pennant.position.set(0, 1.9 + ms.height - 0.35, ms.mz - 0.75);
    g.add(pennant);
  }

  return g;
}

export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance | null {
  const { globeRadius } = ctx;
  const trackGeo = ctx.trackGeo ?? (<T extends THREE.BufferGeometry>(g: T) => g);
  const trackMat = ctx.trackMat ?? (<T extends THREE.Material>(m: T) => m);
  const trackTex = ctx.trackTex ?? (<T extends THREE.Texture>(t: T) => t);

  const root = new THREE.Group();
  root.name = 'island-long-ring-long-land';

  const colorMatCache = new Map<string, THREE.MeshStandardMaterial>();
  const getColorMat = (hex: number, roughness = 0.85) => {
    const key = `${hex}_${roughness}`;
    let m = colorMatCache.get(key);
    if (!m) {
      m = trackMat(new THREE.MeshStandardMaterial({ color: hex, roughness }));
      colorMatCache.set(key, m);
    }
    return m;
  };

  const terrainTex = trackTex(createLongRingTerrainTexture(768));
  const submergedRingTex = trackTex(createSubmergedRingTexture(512));
  const plankTex = trackTex(createPlankTexture('#a47647', 10));
  const darkPlankTex = trackTex(createPlankTexture('#624024', 10));
  const foxySailTex = trackTex(createFoxySailTexture());
  const boxingMatTex = trackTex(createBoxingMatTexture());

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.9,
      metalness: 0.02,
      transparent: true,
      alphaTest: 0.14,
    })
  );
  const submergedShoalMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: submergedRingTex,
      roughness: 0.18,
      metalness: 0.08,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
    })
  );
  const plankMat = trackMat(new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.86 }));
  const darkWoodMat = trackMat(new THREE.MeshStandardMaterial({ map: darkPlankTex, roughness: 0.88 }));
  const thatchMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xc29e58, roughness: 0.92 }));
  const bambooMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x9c8246, roughness: 0.82 }));
  const stoneMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x87837a, roughness: 0.94 }));
  const windowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x262b36,
      emissive: 0xffb347,
      emissiveIntensity: 0.35,
      roughness: 0.32,
    })
  );
  const foxySailMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: foxySailTex,
      roughness: 0.84,
      side: THREE.DoubleSide,
    })
  );

  // 1. Curved Spherical 160x160 Terrain Mesh
  const segs = 160;
  const planeGeo = trackGeo(
    new THREE.PlaneGeometry(LONG_RING_WORLD_SIZE, LONG_RING_WORLD_SIZE, segs, segs)
  );
  planeGeo.rotateX(-Math.PI / 2);
  const posAttr = planeGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const ly = sampleLongRingHeight(lx, lz);
    const sp = toLongRingSphereLocal(lx, ly, lz, globeRadius);
    posAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  posAttr.needsUpdate = true;
  planeGeo.computeVertexNormals();

  const terrainMesh = new THREE.Mesh(planeGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  root.add(terrainMesh);

  // 2. Submerged Shallow Turquoise Ring Overlay sitting cleanly above ocean sphere
  const shoalSegs = 96;
  const shoalGeo = trackGeo(
    new THREE.PlaneGeometry(LONG_RING_WORLD_SIZE, LONG_RING_WORLD_SIZE, shoalSegs, shoalSegs)
  );
  shoalGeo.rotateX(-Math.PI / 2);
  const sPosAttr = shoalGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sPosAttr.count; i++) {
    const lx = sPosAttr.getX(i);
    const lz = sPosAttr.getZ(i);
    const sp = toLongRingSphereLocal(lx, LONG_RING_SEA_LEVEL_Y + 0.045, lz, globeRadius);
    sPosAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  sPosAttr.needsUpdate = true;
  shoalGeo.computeVertexNormals();
  const shoalMesh = new THREE.Mesh(shoalGeo, submergedShoalMat);
  root.add(shoalMesh);

  const placeAtLocal = (
    obj: THREE.Object3D,
    lx: number,
    ly: number,
    lz: number,
    yaw = 0
  ) => {
    const sp = toLongRingSphereLocal(lx, ly, lz, globeRadius);
    obj.position.set(sp.x, sp.y, sp.z);
    obj.scale.setScalar(S);
    const radialNormal = new THREE.Vector3(sp.x, sp.y + globeRadius, sp.z).normalize();
    obj.quaternion.setFromUnitVectors(_up, radialNormal);
    if (yaw !== 0) obj.rotateY(yaw);
  };

  // 3. Tonjit's Cabin on Tall Stilts (heart of Lobe 0)
  const tonjitGroup = buildTonjitStiltHouse(
    plankMat,
    darkWoodMat,
    thatchMat,
    bambooMat,
    stoneMat,
    windowMat,
    getColorMat
  );
  placeAtLocal(
    tonjitGroup,
    LONG_RING_TONJIT_HOUSE.x,
    sampleLongRingHeight(LONG_RING_TONJIT_HOUSE.x, LONG_RING_TONJIT_HOUSE.z) - 0.05,
    LONG_RING_TONJIT_HOUSE.z,
    LONG_RING_TONJIT_HOUSE.yaw
  );
  root.add(tonjitGroup);

  // 4. Final Luffy vs Foxy Boxing Arena (open cleared plain on neighboring Lobe 1)
  const arenaGroup = buildBoxingArena(darkWoodMat, plankMat, boxingMatTex, getColorMat);
  placeAtLocal(
    arenaGroup,
    LONG_RING_BOXING_ARENA.x,
    sampleLongRingHeight(LONG_RING_BOXING_ARENA.x, LONG_RING_BOXING_ARENA.z) - 0.04,
    LONG_RING_BOXING_ARENA.z,
    LONG_RING_BOXING_ARENA.yaw
  );
  root.add(arenaGroup);

  // 5. Foxy's Harbor Landing Pier + Sexy Foxy Flagship (moored in lagoon off Lobe 1)
  const pierLen = Math.hypot(
    LONG_RING_FOXY_PIER.endX - LONG_RING_FOXY_PIER.startX,
    LONG_RING_FOXY_PIER.endZ - LONG_RING_FOXY_PIER.startZ
  );
  const pierMidX = (LONG_RING_FOXY_PIER.startX + LONG_RING_FOXY_PIER.endX) * 0.5;
  const pierMidZ = (LONG_RING_FOXY_PIER.startZ + LONG_RING_FOXY_PIER.endZ) * 0.5;
  const pierYaw = Math.atan2(
    LONG_RING_FOXY_PIER.endX - LONG_RING_FOXY_PIER.startX,
    LONG_RING_FOXY_PIER.endZ - LONG_RING_FOXY_PIER.startZ
  );

  const pierGroup = new THREE.Group();
  const pierDeck = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.28, pierLen + 0.8),
    darkWoodMat
  );
  pierDeck.receiveShadow = true;
  pierDeck.castShadow = true;
  pierGroup.add(pierDeck);
  for (let pz = -pierLen * 0.42; pz <= pierLen * 0.45; pz += pierLen * 0.28) {
    for (const px of [-1.05, 1.05]) {
      const piling = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.16, 4.2, 6),
        darkWoodMat
      );
      piling.position.set(px, -1.9, pz);
      pierGroup.add(piling);
    }
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.72, 6),
      plankMat
    );
    bollard.position.set(1.05, 0.44, pz);
    pierGroup.add(bollard);
  }
  placeAtLocal(pierGroup, pierMidX, LONG_RING_FOXY_PIER.deckY - 0.14, pierMidZ, pierYaw);
  root.add(pierGroup);

  const shipGroup = buildSexyFoxyShip(darkWoodMat, plankMat, foxySailMat, getColorMat);
  const shipBaseSp = toLongRingSphereLocal(
    LONG_RING_FOXY_SHIP.x,
    LONG_RING_FOXY_SHIP.y,
    LONG_RING_FOXY_SHIP.z,
    globeRadius
  );
  placeAtLocal(
    shipGroup,
    LONG_RING_FOXY_SHIP.x,
    LONG_RING_FOXY_SHIP.y,
    LONG_RING_FOXY_SHIP.z,
    LONG_RING_FOXY_SHIP.yaw
  );
  root.add(shipGroup);
  const shipBaseQuat = shipGroup.quaternion.clone();
  const shipRadial = new THREE.Vector3(
    shipBaseSp.x,
    shipBaseSp.y + globeRadius,
    shipBaseSp.z
  ).normalize();

  // 6. Instanced Ultra-Tall Stretched Trees (Cypress spires, Savanna flat-tops & Elongated Bamboo)
  const cypressTrees = LONG_RING_TREES.filter((t) => t.kind === 'cypress-tall');
  const savannaTrees = LONG_RING_TREES.filter((t) => t.kind === 'savanna-tall');
  const bambooTrees = LONG_RING_TREES.filter((t) => t.kind === 'bamboo');

  const barkMat = getColorMat(0x7c5a3c, 0.92);
  const foliageInstMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 })
  );

  if (cypressTrees.length > 0) {
    // Ultra-tall slender trunk (y = 0 -> 8.8m) + 3 interlocking narrow tapering cypress tiers (no gaps!)
    const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.25, 9.2, 6));
    trunkGeo.translate(0, 4.6, 0);

    const tierLow = new THREE.ConeGeometry(0.92, 4.4, 7);
    tierLow.translate(0, 7.6, 0);
    const tierMid = new THREE.ConeGeometry(0.76, 4.2, 7);
    tierMid.translate(0, 9.35, 0);
    const highSpire = new THREE.ConeGeometry(0.56, 3.8, 7);
    highSpire.translate(0, 11.1, 0);
    const crownGeo = trackGeo(mergeParts([tierLow, tierMid, highSpire]));

    const trunks = new THREE.InstancedMesh(trunkGeo, barkMat, cypressTrees.length);
    const crowns = new THREE.InstancedMesh(crownGeo, foliageInstMat, cypressTrees.length);
    trunks.castShadow = true;
    crowns.castShadow = true;
    crowns.receiveShadow = true;
    crowns.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(cypressTrees.length * 3),
      3
    );

    cypressTrees.forEach((t, i) => {
      const sp = toLongRingSphereLocal(t.x, t.y, t.z, globeRadius);
      const radialN = new THREE.Vector3(sp.x, sp.y + globeRadius, sp.z).normalize();
      _dummy.position.set(sp.x, sp.y, sp.z);
      _dummy.quaternion.setFromUnitVectors(_up, radialN);
      _dummy.rotateY(t.yaw);
      _dummy.scale.set(S * t.scale, S * t.scale * t.heightScale, S * t.scale);
      _dummy.updateMatrix();
      trunks.setMatrixAt(i, _dummy.matrix);
      crowns.setMatrixAt(i, _dummy.matrix);
      _tmpColor.setRGB(0.14 * t.tint, 0.36 * t.tint, 0.14 * t.tint);
      crowns.setColorAt(i, _tmpColor);
    });
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
    trunks.computeBoundingSphere();
    crowns.computeBoundingSphere();
    root.add(trunks, crowns);
  }

  if (savannaTrees.length > 0) {
    // Tall slim trunk rising to broad multi-lobed high canopy (left tree in reference photo!)
    const sTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.32, 9.2, 6));
    sTrunkGeo.translate(0, 4.6, 0);

    const capMain = new THREE.DodecahedronGeometry(1.75, 1);
    capMain.scale(1.25, 0.55, 1.2);
    capMain.translate(0, 9.6, 0);
    const capSide = new THREE.DodecahedronGeometry(1.25, 1);
    capSide.scale(1.1, 0.5, 1.1);
    capSide.translate(1.1, 9.15, 0.45);
    const sCrownGeo = trackGeo(mergeParts([capMain, capSide]));

    const sTrunks = new THREE.InstancedMesh(sTrunkGeo, barkMat, savannaTrees.length);
    const sCrowns = new THREE.InstancedMesh(sCrownGeo, foliageInstMat, savannaTrees.length);
    sTrunks.castShadow = true;
    sCrowns.castShadow = true;
    sCrowns.receiveShadow = true;
    sCrowns.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(savannaTrees.length * 3),
      3
    );

    savannaTrees.forEach((t, i) => {
      const sp = toLongRingSphereLocal(t.x, t.y, t.z, globeRadius);
      const radialN = new THREE.Vector3(sp.x, sp.y + globeRadius, sp.z).normalize();
      _dummy.position.set(sp.x, sp.y, sp.z);
      _dummy.quaternion.setFromUnitVectors(_up, radialN);
      _dummy.rotateY(t.yaw);
      _dummy.scale.set(S * t.scale, S * t.scale * t.heightScale, S * t.scale);
      _dummy.updateMatrix();
      sTrunks.setMatrixAt(i, _dummy.matrix);
      sCrowns.setMatrixAt(i, _dummy.matrix);
      _tmpColor.setRGB(0.2 * t.tint, 0.45 * t.tint, 0.16 * t.tint);
      sCrowns.setColorAt(i, _tmpColor);
    });
    sTrunks.instanceMatrix.needsUpdate = true;
    sCrowns.instanceMatrix.needsUpdate = true;
    if (sCrowns.instanceColor) sCrowns.instanceColor.needsUpdate = true;
    sTrunks.computeBoundingSphere();
    sCrowns.computeBoundingSphere();
    root.add(sTrunks, sCrowns);
  }

  if (bambooTrees.length > 0) {
    // Clustered tall slender green bamboo stalks (iconic Long Ring "stretch" bamboo)
    const culms: THREE.BufferGeometry[] = [];
    for (let c = 0; c < 3; c++) {
      const ang = (c * Math.PI * 2) / 3;
      const culm = new THREE.CylinderGeometry(0.11, 0.15, 9.6, 5);
      culm.translate(Math.cos(ang) * 0.35, 4.8, Math.sin(ang) * 0.35);
      culms.push(culm);
      const tuft = new THREE.ConeGeometry(0.58, 2.2, 5);
      tuft.translate(Math.cos(ang) * 0.35, 9.8, Math.sin(ang) * 0.35);
      culms.push(tuft);
    }
    const bambooGeo = trackGeo(mergeParts(culms));
    const bambooInst = new THREE.InstancedMesh(bambooGeo, foliageInstMat, bambooTrees.length);
    bambooInst.castShadow = true;
    bambooInst.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(bambooTrees.length * 3),
      3
    );

    bambooTrees.forEach((t, i) => {
      const sp = toLongRingSphereLocal(t.x, t.y, t.z, globeRadius);
      const radialN = new THREE.Vector3(sp.x, sp.y + globeRadius, sp.z).normalize();
      _dummy.position.set(sp.x, sp.y, sp.z);
      _dummy.quaternion.setFromUnitVectors(_up, radialN);
      _dummy.rotateY(t.yaw);
      _dummy.scale.set(S * t.scale, S * t.scale * t.heightScale, S * t.scale);
      _dummy.updateMatrix();
      bambooInst.setMatrixAt(i, _dummy.matrix);
      _tmpColor.setRGB(0.22 * t.tint, 0.44 * t.tint, 0.16 * t.tint);
      bambooInst.setColorAt(i, _tmpColor);
    });
    bambooInst.instanceMatrix.needsUpdate = true;
    if (bambooInst.instanceColor) bambooInst.instanceColor.needsUpdate = true;
    bambooInst.computeBoundingSphere();
    root.add(bambooInst);
  }

  // 7. Long Fauna (Shelly the Long Dachshund/Horse, Stretched Long-Bird), Campfire & Props
  const whiteFurMat = getColorMat(0xf4f1ea, 0.78);
  const darkEyeMat = getColorMat(0x18181c, 0.3);
  const redCollarMat = getColorMat(0xd43737, 0.65);
  const crateMat = getColorMat(0xa57444, 0.88);
  const rockMat = getColorMat(0x7d7a72, 0.94);

  let flameMesh: THREE.Mesh | null = null;
  const rotQuatScratch = new THREE.Quaternion();

  for (const prop of LONG_RING_PROPS) {
    const pg = new THREE.Group();
    if (prop.kind === 'shelly-dog') {
      // Iconic ultra-long white stretched dachshund/horse (~5.2m torso, floppy ears!)
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.26, 4.9, 10),
        whiteFurMat
      );
      torso.rotation.x = Math.PI * 0.5;
      torso.position.set(0, 0.62, 0);
      torso.castShadow = true;
      pg.add(torso);

      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.33, 0.07, 6, 12),
        redCollarMat
      );
      collar.position.set(0, 0.72, 2.25);
      pg.add(collar);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), whiteFurMat);
      head.position.set(0, 0.86, 2.55);
      head.castShadow = true;
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.44, 8), whiteFurMat);
      muzzle.rotation.x = Math.PI * 0.5;
      muzzle.position.set(0, 0.78, 2.95);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), darkEyeMat);
      nose.position.set(0, 0.8, 3.18);
      pg.add(head, muzzle, nose);

      for (const sx of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.26), whiteFurMat);
        ear.rotation.z = sx * 0.16;
        ear.position.set(sx * 0.36, 0.76, 2.48);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), darkEyeMat);
        eye.position.set(sx * 0.21, 0.94, 2.86);
        pg.add(ear, eye);

        for (const legZ of [2.1, -2.15]) {
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.07, 0.58, 6),
            whiteFurMat
          );
          leg.position.set(sx * 0.18, 0.29, legZ);
          pg.add(leg);
        }
      }
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.65, 6), whiteFurMat);
      tail.rotation.x = -0.65;
      tail.position.set(0, 0.78, -2.65);
      pg.add(tail);
    } else if (prop.kind === 'long-bird') {
      // Wide-wingspan Long Ring bird perched atop tall slender legs
      for (const sx of [-1, 1]) {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 1.45, 5),
          darkEyeMat
        );
        leg.position.set(sx * 0.14, 0.72, 0);
        const wing = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.48), whiteFurMat);
        wing.rotation.z = sx * 0.1;
        wing.position.set(sx * 1.45, 1.7, -0.05);
        pg.add(leg, wing);
      }
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.3, 8), whiteFurMat);
      body.rotation.x = Math.PI * 0.45;
      body.position.set(0, 1.65, 0.1);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.58, 6), getColorMat(0xe8a832, 0.5));
      beak.rotation.x = Math.PI * 0.48;
      beak.position.set(0, 1.98, 0.92);
      pg.add(body, beak);
    } else if (prop.kind === 'campfire') {
      for (let s = 0; s < 6; s++) {
        const a = (s * Math.PI * 2) / 6;
        const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), rockMat);
        st.position.set(Math.cos(a) * 0.68, 0.1, Math.sin(a) * 0.68);
        pg.add(st);
      }
      flameMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.26, 0.85, 7),
        trackMat(
          new THREE.MeshStandardMaterial({
            color: 0xff9a2e,
            emissive: 0xff5a12,
            emissiveIntensity: 1.35,
            roughness: 0.4,
          })
        )
      );
      flameMesh.position.y = 0.45;
      pg.add(flameMesh);
    } else if (prop.kind === 'crate-barrel') {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.82, 0.88), crateMat);
      box.position.y = 0.41;
      box.castShadow = true;
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.28, 0.88, 9),
        darkWoodMat
      );
      barrel.position.set(0.75, 0.44, 0.25);
      barrel.castShadow = true;
      pg.add(box, barrel);
    } else if (prop.kind === 'boulder') {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.35, 0), rockMat);
      rock.scale.set(1.25, 0.78, 1.0);
      rock.position.y = 0.55;
      rock.castShadow = true;
      pg.add(rock);
    }

    placeAtLocal(
      pg,
      prop.x,
      prop.kind === 'shelly-dog' ? prop.y + 0.04 : prop.y,
      prop.z,
      prop.yaw
    );
    pg.scale.multiplyScalar(prop.scale);
    root.add(pg);
  }

  return {
    group: root,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsedS: number) => {
      const heave = Math.sin(elapsedS * 1.4) * 0.08 * S;
      const roll = Math.sin(elapsedS * 1.1) * 0.03;
      shipGroup.position
        .set(shipBaseSp.x, shipBaseSp.y, shipBaseSp.z)
        .addScaledVector(shipRadial, heave);
      rotQuatScratch.setFromAxisAngle(_rollAxis, roll);
      shipGroup.quaternion.copy(shipBaseQuat).multiply(rotQuatScratch);

      if (flameMesh) {
        flameMesh.scale.set(1, 1 + Math.sin(elapsedS * 7.4) * 0.14, 1);
      }
    },
  };
}
