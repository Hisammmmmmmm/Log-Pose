import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  JAYA_BUILDINGS,
  JAYA_GLOBE_SCALE,
  JAYA_HOTEL_BOARDWALK_PATH,
  JAYA_PROPS,
  JAYA_SHIPS,
  JAYA_TREES,
  JAYA_WORLD_SIZE,
  jayaInlandPondSignedDist,
  jayaJungleTrailSignedDist,
  jayaPlankRoadSignedDist,
  jayaTropicalLagoonSignedDist,
  sampleJayaHeight,
  sampleJayaJungleDensity,
  toJayaSphereLocal,
  type JayaBuildingSpec,
  type JayaShipSpec,
} from '../utils/jayaTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const merged = mergeGeometries(nonIndexed, false);
  for (const g of nonIndexed) {
    if (!parts.includes(g)) g.dispose();
  }
  for (const g of parts) g.dispose();
  return merged ?? new THREE.BoxGeometry(1, 1, 1);
}

const S = JAYA_GLOBE_SCALE;
const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);

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

function createJayaTerrainTexture(size = 768): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = JAYA_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * JAYA_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * JAYA_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const h = sampleJayaHeight(x, z);
      const hx = sampleJayaHeight(x + 0.9, z);
      const hz = sampleJayaHeight(x, z + 0.9);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 1.15, 0, 1);
      const grain = (valueNoise2D(x * 1.45, z * 1.45) - 0.5) * 12;
      const moss = valueNoise2D(x * 0.14 + 2.1, z * 0.14 - 3.4);
      const lagSd = jayaTropicalLagoonSignedDist(x, z);
      const pondSd = jayaInlandPondSignedDist(x, z);

      let rgb: [number, number, number] = [132, 168, 86];
      let alpha = 0;

      if (h < -3.4) {
        alpha = smoothstep(-4.8, -3.4, h);
        // Crystal turquoise lagoon glow near Tropical Hotel cove
        const lagGlow = 1 - smoothstep(-1.5, 4.5, lagSd);
        rgb = mixRgb([36, 134, 178], [58, 206, 212], lagGlow);
      } else {
        alpha = 1;
        const shallowT = smoothstep(-3.4, 0.2, h);
        const beachT = smoothstep(0.2, 1.85, h);
        const grassT = smoothstep(1.85, 3.0, h);

        const lagGlow = 1 - smoothstep(-2.0, 5.0, lagSd);
        const shoalCol = mixRgb(
          [48, 165, 192],
          [72, 218, 216],
          lagGlow
        );
        const sandCol = mixRgb([224, 202, 152], [208, 184, 132], moss * 0.6);
        const coastWater = mixRgb(shoalCol, sandCol, shallowT);

        // Tropical green meadow vs dense rainforest moss
        const jDens = sampleJayaJungleDensity(x, z);
        const meadowCol = mixRgb([124, 166, 76], [104, 146, 62], moss);
        const jungleFloor = mixRgb([68, 114, 48], [48, 92, 36], moss);
        const vegCol = mixRgb(meadowCol, jungleFloor, jDens * 0.85);

        rgb = mixRgb(coastWater, sandCol, beachT);
        rgb = mixRgb(rgb, vegCol, grassT);

        // Sandy/weathered earth around Mock Town ground beneath planks
        const inTown =
          smoothstep(-54, -46, x) *
          (1 - smoothstep(-26, -22, x)) *
          smoothstep(-49, -43, z) *
          (1 - smoothstep(-9, -5, z));
        if (inTown > 0.05) {
          rgb = mixRgb(rgb, [182, 156, 118], inTown * 0.72);
        }

        // Exposed rocky cliffs on Western Ridge & coastal escarpments (Map 2 + Image 6)
        const rockSlopeT = smoothstep(0.24, 0.56, slope) * smoothstep(2.0, 4.6, h);
        if (rockSlopeT > 0.01) {
          const strata = Math.sin(h * 2.2 + valueNoise2D(x * 0.28, z * 0.28) * 2.5) * 14;
          const cliffCol: [number, number, number] = [
            126 + strata,
            110 + strata * 0.9,
            88 + strata * 0.75,
          ];
          rgb = mixRgb(rgb, cliffCol, rockSlopeT * 0.92);
        }

        // Inland skull-eye ponds (turquoise freshwater)
        if (pondSd < 1.8 && h > 0.3) {
          const pondT = 1 - smoothstep(-0.8, 1.8, pondSd);
          rgb = mixRgb(rgb, [54, 174, 198], pondT * 0.94);
        }

        // Packed warm dirt jungle trail (Mock Town -> Isthmus -> Hideout -> Cricket)
        const trailD = jayaJungleTrailSignedDist(x, z);
        if (trailD < 0.85 && h > 1.3 && pondSd > 1.0) {
          const edgeT =
            smoothstep(-0.2, 0.35, trailD) * (1 - smoothstep(0.35, 0.85, trailD));
          const coreT = 1 - smoothstep(-0.35, 0.35, trailD);
          rgb = mixRgb(rgb, [132, 108, 72], edgeT * 0.65);
          rgb = mixRgb(rgb, [166, 134, 90], coreT * 0.88);
        }

        // Mock Town wooden plank street base stain
        const plankD = jayaPlankRoadSignedDist(x, z);
        if (plankD < 0.7 && h > 1.3) {
          const plankT = 1 - smoothstep(-0.25, 0.65, plankD);
          rgb = mixRgb(rgb, [128, 92, 58], plankT * 0.85);
        }
      }

      data[idx] = clamp(Math.round(rgb[0] + (h > 0.8 ? grain : 0)), 0, 255);
      data[idx + 1] = clamp(Math.round(rgb[1] + (h > 0.8 ? grain : 0)), 0, 255);
      data[idx + 2] = clamp(Math.round(rgb[2] + (h > 0.8 ? grain : 0)), 0, 255);
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

function createPlankTexture(baseHex = '#8d623b', plankCount = 12): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  const rowH = 256 / plankCount;
  for (let i = 0; i < plankCount; i++) {
    const shade = ((i * 37) % 24) - 12;
    ctx.fillStyle = `rgba(${shade > 0 ? 255 : 30}, ${shade > 0 ? 230 : 18}, ${shade > 0 ? 200 : 10}, ${Math.abs(shade) / 140})`;
    ctx.fillRect(0, i * rowH, 256, rowH);
    ctx.fillStyle = 'rgba(38, 22, 10, 0.55)';
    ctx.fillRect(0, i * rowH, 256, 2);
    // Staggered plank seam & nail heads
    const seamX = ((i * 89 + 41) % 220) + 18;
    ctx.fillRect(seamX, i * rowH, 2, rowH);
    ctx.fillStyle = 'rgba(28, 18, 10, 0.65)';
    ctx.fillRect(seamX + 6, i * rowH + 5, 3, 3);
    ctx.fillRect(seamX - 9, i * rowH + rowH - 8, 3, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 6);
  return tex;
}

function createRedTileRoofTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#bd3c31';
  ctx.fillRect(0, 0, 256, 256);

  // Scalloped red-terracotta tropical tile ribs
  for (let y = 0; y < 256; y += 22) {
    ctx.fillStyle = 'rgba(85, 22, 16, 0.35)';
    ctx.fillRect(0, y, 256, 3);
    for (let x = ((y / 22) % 2) * 16; x < 256; x += 32) {
      ctx.fillStyle = 'rgba(245, 165, 140, 0.18)';
      ctx.fillRect(x, y + 3, 14, 16);
      ctx.fillStyle = 'rgba(72, 18, 14, 0.3)';
      ctx.fillRect(x + 28, y + 2, 3, 20);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createSignTexture(
  text: string,
  bgColor = '#3c2618',
  textColor = '#f4dfb4'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#c89b54';
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, 246, 86);

  ctx.fillStyle = textColor;
  ctx.font = 'bold 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 50);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createOnionDomeTexture(diagonal: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#f8eef2';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#df6889';
  if (diagonal) {
    for (let i = -256; i < 512; i += 44) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 24, 0);
      ctx.lineTo(i + 150, 256);
      ctx.lineTo(i + 126, 256);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    for (let y = 0; y < 256; y += 56) {
      ctx.fillRect(0, y, 256, 28);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createGreenGoldConeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#2d4d3e';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#dfb844';
  for (let i = -256; i < 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 14, 0);
    ctx.lineTo(i + 142, 256);
    ctx.lineTo(i + 128, 256);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Hand-painted front facade CanvasTexture for Montblanc Cricket's castle cutout (Image 6):
 * Sunburst red/yellow main gate, 2 pinwheel medallions, colonnaded pink-arched faux windows,
 * gold scrollwork band, and 3 red stars.
 */
function createCricketFacadeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Clean whitewashed timber facade background
  ctx.fillStyle = '#f3f5fa';
  ctx.fillRect(0, 0, 512, 384);

  // Subtle vertical wood planking seams
  ctx.fillStyle = 'rgba(130, 145, 175, 0.16)';
  for (let x = 0; x < 512; x += 16) {
    ctx.fillRect(x, 0, 1.5, 384);
  }

  // Lower tier: Giant red-and-yellow sunburst arch & double timber doors
  const gx = 256;
  const gy = 384;
  ctx.fillStyle = '#c84239';
  ctx.beginPath();
  ctx.arc(gx, gy, 92, Math.PI, 0);
  ctx.fill();

  // Yellow triangular sunburst rays
  ctx.fillStyle = '#f1cc48';
  for (let i = 0; i < 9; i++) {
    const a0 = Math.PI + (i / 9) * Math.PI;
    const a1 = Math.PI + ((i + 0.5) / 9) * Math.PI;
    const a2 = Math.PI + ((i + 1) / 9) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(gx + Math.cos(a0) * 58, gy + Math.sin(a0) * 58);
    ctx.lineTo(gx + Math.cos(a1) * 90, gy + Math.sin(a1) * 90);
    ctx.lineTo(gx + Math.cos(a2) * 58, gy + Math.sin(a2) * 58);
    ctx.closePath();
    ctx.fill();
  }

  // Dark arched wooden double gate inside sunburst
  ctx.fillStyle = '#9b7b56';
  ctx.beginPath();
  ctx.arc(gx, gy - 8, 50, Math.PI, 0);
  ctx.lineTo(gx + 50, gy);
  ctx.lineTo(gx - 50, gy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#332820';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(gx, gy - 58);
  ctx.lineTo(gx, gy);
  ctx.stroke();

  // Two flanking green/yellow/white pinwheel medallions
  for (const mx of [132, 380]) {
    const my = 312;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx, my, 32, 0, Math.PI * 2);
    ctx.fill();
    for (let s = 0; s < 8; s++) {
      ctx.fillStyle = s % 2 === 0 ? '#3e7d5e' : s % 4 === 1 ? '#f2cc4b' : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.arc(mx, my, 30, (s * Math.PI) / 4, ((s + 1) * Math.PI) / 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // Two flanking small wing doors
  for (const dx of [62, 450]) {
    ctx.fillStyle = '#b48a64';
    ctx.beginPath();
    ctx.arc(dx, 362, 16, Math.PI, 0);
    ctx.lineTo(dx + 16, 384);
    ctx.lineTo(dx - 16, 384);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c84b68';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // Middle gallery: 6 pink-framed arched windows with white pillars
  for (let i = 0; i < 6; i++) {
    const wx = 128 + i * 51;
    const wy = 224;
    ctx.fillStyle = '#df7995';
    ctx.beginPath();
    ctx.arc(wx, wy, 17, Math.PI, 0);
    ctx.lineTo(wx + 17, wy + 28);
    ctx.lineTo(wx - 17, wy + 28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2d2d3d';
    ctx.beginPath();
    ctx.arc(wx, wy + 2, 9, Math.PI, 0);
    ctx.lineTo(wx + 9, wy + 24);
    ctx.lineTo(wx - 9, wy + 24);
    ctx.closePath();
    ctx.fill();
  }

  // Gold decorative crest & scrollwork above gallery
  ctx.fillStyle = '#dec04b';
  ctx.beginPath();
  ctx.arc(256, 176, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#dec04b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(156, 178);
  ctx.quadraticCurveTo(188, 166, 212, 180);
  ctx.moveTo(300, 180);
  ctx.quadraticCurveTo(324, 166, 356, 178);
  ctx.stroke();

  // Upper tier: 5 pink arched windows + 3 red stars near parapet
  for (let i = 0; i < 5; i++) {
    const wx = 160 + i * 48;
    const wy = 96;
    ctx.fillStyle = '#df7995';
    ctx.beginPath();
    ctx.arc(wx, wy, 14, Math.PI, 0);
    ctx.lineTo(wx + 14, wy + 22);
    ctx.lineTo(wx - 14, wy + 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2a2a38';
    ctx.fillRect(wx - 6, wy - 2, 12, 20);
  }

  // 3 Red stars near top parapet
  ctx.fillStyle = '#d44252';
  for (const sx of [200, 256, 312]) {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 === 0 ? 10 : 4.5;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      if (k === 0) ctx.moveTo(sx + Math.cos(a) * r, 46 + Math.sin(a) * r);
      else ctx.lineTo(sx + Math.cos(a) * r, 46 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildFlaredTropicalRoof(
  width: number,
  depth: number,
  height: number,
  roofMat: THREE.Material,
  ridgeMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const hw = width * 0.56;
  const hd = depth * 0.56;

  // Main pitched roof prism with flared eave skirt
  const geo = new THREE.ConeGeometry(1, height, 4);
  geo.rotateY(Math.PI * 0.25);
  geo.scale(hw * 1.41, 1, hd * 1.41);
  const cone = new THREE.Mesh(geo, roofMat);
  cone.position.y = height * 0.5;
  cone.castShadow = true;
  cone.receiveShadow = true;
  g.add(cone);

  // White ridge crest beam + upturned gable horn finials (Images 3 & 4)
  const ridgeLen = Math.max(width, depth) * 0.42;
  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(width > depth ? ridgeLen : 0.24, 0.24, width > depth ? 0.24 : ridgeLen),
    ridgeMat
  );
  ridge.position.y = height + 0.05;
  g.add(ridge);

  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.72, 5),
      ridgeMat
    );
    horn.position.set(
      width > depth ? side * (ridgeLen * 0.55) : 0,
      height + 0.22,
      width > depth ? 0 : side * (ridgeLen * 0.55)
    );
    horn.rotation.z = width > depth ? -side * 0.38 : 0;
    horn.rotation.x = width > depth ? 0 : side * 0.38;
    g.add(horn);
  }

  return g;
}

function createOnionDomeMesh(
  radius: number,
  height: number,
  mat: THREE.Material
): THREE.Mesh {
  const pts: THREE.Vector2[] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let r = 0;
    if (t < 0.18) {
      r = radius * (0.68 + (t / 0.18) * 0.32);
    } else if (t < 0.75) {
      const k = (t - 0.18) / 0.57;
      r = radius * Math.cos(k * Math.PI * 0.42);
    } else {
      const k = (t - 0.75) / 0.25;
      r = radius * 0.25 * Math.pow(1 - k, 1.3);
    }
    pts.push(new THREE.Vector2(Math.max(0.001, r), t * height));
  }
  const geo = new THREE.LatheGeometry(pts, 18);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

function buildMockTownBuilding(
  spec: JayaBuildingSpec,
  plankMat: THREE.Material,
  roofMat: THREE.Material,
  whiteTrimMat: THREE.Material,
  windowGlassMat: THREE.Material,
  darkIronMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();

  // Tall Square Wooden Watchtower (Image 3 center)
  if (spec.kind === 'watchtower-wood') {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: spec.wallColor,
      map: (plankMat as THREE.MeshStandardMaterial).map,
      roughness: 0.88,
    });
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(spec.width * 1.15, 1.4, spec.depth * 1.15),
      new THREE.MeshStandardMaterial({ color: 0x6f6860, roughness: 0.92 })
    );
    base.position.y = -0.3;
    g.add(base);

    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(spec.width, spec.wallHeight, spec.depth),
      bodyMat
    );
    shaft.position.y = spec.wallHeight * 0.5;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    g.add(shaft);

    // Timber belt ledges & circular porthole windows
    for (let floor = 1; floor <= 4; floor++) {
      const fy = floor * (spec.wallHeight * 0.21);
      const belt = new THREE.Mesh(
        new THREE.BoxGeometry(spec.width + 0.28, 0.22, spec.depth + 0.28),
        new THREE.MeshStandardMaterial({ color: spec.trimColor, roughness: 0.9 })
      );
      belt.position.y = fy - 0.75;
      g.add(belt);

      if (floor <= 3) {
        for (const faceZ of [spec.depth * 0.51, -spec.depth * 0.51]) {
          const porthole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.42, 0.16, 12),
            windowGlassMat
          );
          porthole.rotation.x = Math.PI * 0.5;
          porthole.position.set(0, fy, faceZ);
          g.add(porthole);
        }
      }
    }

    const roof = buildFlaredTropicalRoof(
      spec.width * 1.24,
      spec.depth * 1.24,
      spec.roofHeight,
      roofMat,
      whiteTrimMat
    );
    roof.position.y = spec.wallHeight;
    g.add(roof);
    return g;
  }

  // Tall Round White Stone Tower (Image 3 right & Image 5)
  if (spec.kind === 'tower-round') {
    const stoneMat = new THREE.MeshStandardMaterial({
      color: spec.wallColor,
      roughness: 0.84,
    });
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(spec.width * 0.58, spec.width * 0.64, 1.4, 14),
      stoneMat
    );
    base.position.y = -0.3;
    g.add(base);

    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(spec.width * 0.45, spec.width * 0.52, spec.wallHeight, 16),
      stoneMat
    );
    cyl.position.y = spec.wallHeight * 0.5;
    cyl.castShadow = true;
    cyl.receiveShadow = true;
    g.add(cyl);

    for (let ring = 1; ring <= 3; ring++) {
      const ry = ring * (spec.wallHeight * 0.26);
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(spec.width * 0.48, 0.11, 6, 16),
        whiteTrimMat
      );
      torus.rotation.x = Math.PI * 0.5;
      torus.position.y = ry;
      g.add(torus);

      for (let a = 0; a < 4; a++) {
        const ang = (a * Math.PI) / 2;
        const win = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.3, 0.18, 10),
          windowGlassMat
        );
        win.position.set(
          Math.cos(ang) * spec.width * 0.47,
          ry + 0.85,
          Math.sin(ang) * spec.width * 0.47
        );
        win.rotation.z = Math.PI * 0.5;
        win.rotation.y = -ang;
        g.add(win);
      }
    }

    const coneRoof = new THREE.Mesh(
      new THREE.ConeGeometry(spec.width * 0.62, spec.roofHeight, 12),
      roofMat
    );
    coneRoof.position.y = spec.wallHeight + spec.roofHeight * 0.5;
    coneRoof.castShadow = true;
    g.add(coneRoof);
    return g;
  }

  // Standard Mock Town Far-West / Tropical Saloons, Armories, Gambling Dens, Warehouses
  const wallMat = new THREE.MeshStandardMaterial({
    color: spec.wallColor,
    roughness: 0.86,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: spec.trimColor,
    roughness: 0.88,
  });

  // Stone foundation plinth extending -1.2m below y=0 so slopes never leave floating corners
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width + 0.3, 1.45, spec.depth + 0.3),
    new THREE.MeshStandardMaterial({ color: 0x73695f, roughness: 0.94 })
  );
  plinth.position.y = -0.5;
  plinth.receiveShadow = true;
  g.add(plinth);

  const lowerBody = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width, spec.wallHeight * 0.55, spec.depth),
    wallMat
  );
  lowerBody.position.y = spec.wallHeight * 0.275;
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  g.add(lowerBody);

  const upperBody = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.96, spec.wallHeight * 0.48, spec.depth * 0.96),
    trimMat
  );
  upperBody.position.y = spec.wallHeight * 0.76;
  upperBody.castShadow = true;
  g.add(upperBody);

  // Far-West wooden porch canopy & posts on front (+Z local)
  const porchW = spec.width * 0.88;
  const porchRoof = new THREE.Mesh(
    new THREE.BoxGeometry(porchW, 0.16, 1.15),
    plankMat
  );
  porchRoof.position.set(0, spec.wallHeight * 0.52, spec.depth * 0.5 + 0.48);
  porchRoof.rotation.x = 0.14;
  porchRoof.castShadow = true;
  g.add(porchRoof);

  for (const px of [-porchW * 0.42, porchW * 0.42]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, spec.wallHeight * 0.54, 7),
      plankMat
    );
    post.position.set(px, spec.wallHeight * 0.25, spec.depth * 0.5 + 0.92);
    g.add(post);
  }

  // Front double door + flanking windows + upper round windows
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 1.65, 0.14),
    plankMat
  );
  door.position.set(0, 0.82, spec.depth * 0.5 + 0.04);
  g.add(door);

  for (const wx of [-spec.width * 0.3, spec.width * 0.3]) {
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.78, 0.14),
      windowGlassMat
    );
    win.position.set(wx, 1.15, spec.depth * 0.5 + 0.04);
    g.add(win);

    const upWin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.14, 10),
      windowGlassMat
    );
    upWin.rotation.x = Math.PI * 0.5;
    upWin.position.set(wx * 0.75, spec.wallHeight * 0.82, spec.depth * 0.49);
    g.add(upWin);
  }

  // Shop / Pub / Armory wooden sign on front awning
  if (spec.signText) {
    const signMat = new THREE.MeshStandardMaterial({
      map: createSignTexture(
        spec.signText,
        spec.id === 'mt-pub-main' ? '#4a1c17' : '#3a2617',
        '#f8e4b8'
      ),
      roughness: 0.75,
    });
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.62, 0.1),
      signMat
    );
    sign.position.set(0, spec.wallHeight * 0.62, spec.depth * 0.5 + 0.78);
    g.add(sign);

    // Warm hanging tavern lantern outside Mock Town Pub
    if (spec.id === 'mt-pub-main') {
      const lantern = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.36, 0.26),
        new THREE.MeshStandardMaterial({
          color: 0xffd27a,
          emissive: 0xff9d3b,
          emissiveIntensity: 0.85,
        })
      );
      lantern.position.set(1.15, spec.wallHeight * 0.46, spec.depth * 0.5 + 0.88);
      g.add(lantern);
    }
  }

  // Steep flared red tropical tiled roof
  const roof = buildFlaredTropicalRoof(
    spec.width,
    spec.depth,
    spec.roofHeight,
    roofMat,
    whiteTrimMat
  );
  roof.position.y = spec.wallHeight;
  g.add(roof);

  // Barrel/crate accent next to entrance
  const sideBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.24, 0.65, 8),
    darkIronMat
  );
  sideBarrel.position.set(-spec.width * 0.35, 0.32, spec.depth * 0.5 + 0.45);
  g.add(sideBarrel);

  return g;
}

/**
 * L'Hôtel Tropical over turquoise lagoon water on timber stilts + stone archway entrance (Image 4).
 */
function buildTropicalHotel(
  spec: JayaBuildingSpec,
  plankMat: THREE.Material,
  roofMat: THREE.Material,
  whiteTrimMat: THREE.Material,
  windowGlassMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const stoneWallMat = new THREE.MeshStandardMaterial({
    color: 0xebe5d9,
    roughness: 0.86,
  });
  const pilingsMat = new THREE.MeshStandardMaterial({
    color: 0x5c3e26,
    roughness: 0.92,
  });

  // Main elevated timber veranda deck sitting over lagoon water
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width + 1.4, 0.42, spec.depth + 1.8),
    plankMat
  );
  deck.position.y = 0.05;
  deck.receiveShadow = true;
  g.add(deck);

  // Stilt pilings extending down to -3.6m below deck so stilts firmly pierce lagoon bed
  for (let gx = -spec.width * 0.52; gx <= spec.width * 0.52 + 0.01; gx += 2.3) {
    for (let gz = -spec.depth * 0.52; gz <= spec.depth * 0.52 + 0.01; gz += 2.1) {
      const piling = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.18, 3.8, 7),
        pilingsMat
      );
      piling.position.set(gx, -1.8, gz);
      g.add(piling);
    }
  }

  // Central two-story hotel pavilion
  const centerHall = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.62, spec.wallHeight, spec.depth * 0.68),
    stoneWallMat
  );
  centerHall.position.set(0, spec.wallHeight * 0.5 + 0.2, -0.35);
  centerHall.castShadow = true;
  centerHall.receiveShadow = true;
  g.add(centerHall);

  // Front stone archway colonnade with `"TROPICAL HOTEL"` signboard (+Z local)
  const archWing = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.46, spec.wallHeight * 0.82, spec.depth * 0.48),
    stoneWallMat
  );
  archWing.position.set(spec.width * 0.25, spec.wallHeight * 0.41 + 0.2, spec.depth * 0.16);
  archWing.castShadow = true;
  g.add(archWing);

  const hotelSign = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.85, 0.14),
    new THREE.MeshStandardMaterial({
      map: createSignTexture('TROPICAL HOTEL', '#1b2a29', '#cbe9d4'),
      roughness: 0.72,
    })
  );
  hotelSign.position.set(spec.width * 0.25, spec.wallHeight * 0.72, spec.depth * 0.42);
  g.add(hotelSign);

  // Left stilt gazebo wing (Image 4 left side over lagoon)
  const leftWing = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.34, spec.wallHeight * 0.66, spec.depth * 0.5),
    stoneWallMat
  );
  leftWing.position.set(-spec.width * 0.38, spec.wallHeight * 0.33 + 0.2, 0.4);
  leftWing.castShadow = true;
  g.add(leftWing);

  // Windows along front colonnade
  for (let i = -2; i <= 2; i++) {
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 1.1, 0.15),
      windowGlassMat
    );
    win.position.set(i * 1.1, 1.85, spec.depth * 0.35);
    g.add(win);
  }

  // Stepped red flared/horned tropical tiled roofs (Image 4 signature silhouette!)
  const mainRoof = buildFlaredTropicalRoof(
    spec.width * 0.68,
    spec.depth * 0.72,
    spec.roofHeight,
    roofMat,
    whiteTrimMat
  );
  mainRoof.position.set(0, spec.wallHeight + 0.2, -0.35);
  g.add(mainRoof);

  const archRoof = buildFlaredTropicalRoof(
    spec.width * 0.5,
    spec.depth * 0.52,
    spec.roofHeight * 0.78,
    roofMat,
    whiteTrimMat
  );
  archRoof.position.set(spec.width * 0.25, spec.wallHeight * 0.82 + 0.2, spec.depth * 0.16);
  g.add(archRoof);

  const leftRoof = buildFlaredTropicalRoof(
    spec.width * 0.38,
    spec.depth * 0.54,
    spec.roofHeight * 0.72,
    roofMat,
    whiteTrimMat
  );
  leftRoof.position.set(-spec.width * 0.38, spec.wallHeight * 0.66 + 0.2, 0.4);
  g.add(leftRoof);

  return g;
}

/**
 * Montblanc Cricket's iconic theatrical wooden castle cutout facade + hidden shack behind (Image 6).
 */
function buildCricketCastleHouse(
  spec: JayaBuildingSpec,
  plankMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf4f5fa,
    roughness: 0.78,
  });
  const facadeMat = new THREE.MeshStandardMaterial({
    map: createCricketFacadeTexture(),
    roughness: 0.76,
  });
  const diagPinkDomeMat = new THREE.MeshStandardMaterial({
    map: createOnionDomeTexture(true),
    roughness: 0.58,
  });
  const horizPinkDomeMat = new THREE.MeshStandardMaterial({
    map: createOnionDomeTexture(false),
    roughness: 0.6,
  });
  const greenGoldConeMat = new THREE.MeshStandardMaterial({
    map: createGreenGoldConeTexture(),
    roughness: 0.62,
  });
  const pennantRedMat = new THREE.MeshStandardMaterial({
    color: 0xd94b58,
    side: THREE.DoubleSide,
    roughness: 0.65,
  });
  const ribbonGoldMat = new THREE.MeshStandardMaterial({
    color: 0xe6c149,
    side: THREE.DoubleSide,
    roughness: 0.6,
  });
  const cannonMat = new THREE.MeshStandardMaterial({
    color: 0x353c46,
    metalness: 0.45,
    roughness: 0.52,
  });

  // Stone terrace plinth so sunburst gate & pinwheel medallions clear grassy ground
  const plinthY = 0.35;
  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width * 0.98, 1.45, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x7a8064, roughness: 0.95 })
  );
  skirt.position.set(0, -0.35, 1.4);
  g.add(skirt);

  // 1. Wide flat whitewashed castle cutout wall (+Z facing east coast sea approach)
  const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(7.6, spec.wallHeight * 0.92, 0.36),
    [whiteMat, whiteMat, whiteMat, whiteMat, facadeMat, plankMat]
  );
  frontWall.position.set(0, spec.wallHeight * 0.46 + plinthY, 1.6);
  frontWall.castShadow = true;
  frontWall.receiveShadow = true;
  g.add(frontWall);

  // Splayed outer left & right rounded turret wings (Image 6)
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(
      new THREE.CylinderGeometry(1.42, 1.18, spec.wallHeight * 0.8, 14),
      whiteMat
    );
    wing.position.set(side * 4.55, spec.wallHeight * 0.4 + plinthY, 1.15);
    wing.rotation.z = -side * 0.14;
    wing.castShadow = true;
    g.add(wing);

    const wingDome = createOnionDomeMesh(1.65, 2.55, horizPinkDomeMat);
    wingDome.position.set(side * 4.78, spec.wallHeight * 0.78 + plinthY, 1.15);
    g.add(wingDome);

    // Tall inner flanking turrets with green & gold striped conical spires + red flags
    const spireTower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.76, spec.wallHeight * 0.98, 12),
      whiteMat
    );
    spireTower.position.set(side * 2.55, spec.wallHeight * 0.49 + plinthY, 1.62);
    spireTower.castShadow = true;
    g.add(spireTower);

    const spireCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.95, 2.7, 14),
      greenGoldConeMat
    );
    spireCone.position.set(side * 2.55, spec.wallHeight * 0.98 + 1.32 + plinthY, 1.62);
    spireCone.castShadow = true;
    g.add(spireCone);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, 1.25, 6),
      cannonMat
    );
    mast.position.set(side * 2.55, spec.wallHeight * 0.98 + 3.05 + plinthY, 1.62);
    g.add(mast);

    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.42), pennantRedMat);
    flag.position.set(side * 2.55 + 0.42, spec.wallHeight * 0.98 + 3.45 + plinthY, 1.62);
    g.add(flag);
  }

  // Central giant diagonal pink-and-white onion dome + double golden ribbons
  const mainDome = createOnionDomeMesh(2.05, 3.35, diagPinkDomeMat);
  mainDome.position.set(0, spec.wallHeight * 0.92 + plinthY, 1.55);
  g.add(mainDome);

  const topPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 1.4, 6),
    cannonMat
  );
  topPole.position.set(0, spec.wallHeight * 0.92 + 3.85 + plinthY, 1.55);
  g.add(topPole);

  for (const ry of [0.22, 0.56]) {
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.24), ribbonGoldMat);
    ribbon.position.set(0.72, spec.wallHeight * 0.92 + 3.9 + ry + plinthY, 1.55);
    g.add(ribbon);
  }

  // 4 jutting black faux cannons on the upper parapet (Image 6)
  for (const cx of [-2.2, -0.75, 0.75, 2.2]) {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.3, 1.1, 10),
      cannonMat
    );
    barrel.rotation.x = Math.PI * 0.45;
    barrel.position.set(cx, spec.wallHeight * 0.54 + plinthY, 1.95);
    barrel.castShadow = true;
    g.add(barrel);
  }

  // 2. Real modest weathered wooden shack & diving depot hidden right behind the wall (-Z local)
  const shackBody = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 2.8, 3.6),
    plankMat
  );
  shackBody.position.set(0, 1.4, -1.2);
  shackBody.castShadow = true;
  shackBody.receiveShadow = true;
  g.add(shackBody);

  const shackRoof = new THREE.Mesh(
    new THREE.ConeGeometry(4.2, 1.5, 4),
    new THREE.MeshStandardMaterial({ color: 0x5c422c, roughness: 0.92 })
  );
  shackRoof.rotation.y = Math.PI * 0.25;
  shackRoof.position.set(0, 3.55, -1.2);
  g.add(shackRoof);

  return g;
}

function buildPirateShipMesh(
  ship: JayaShipSpec,
  plankMat: THREE.Material,
  getColorMat: (hex: string | number, roughness?: number) => THREE.MeshStandardMaterial,
  sailMat: THREE.Material,
  blackFlagMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const hullMat = getColorMat(ship.hullColor, 0.78);
  const accentMat = getColorMat(ship.accentColor, 0.68);
  const trimGoldMat = getColorMat(0xdcb448, 0.52);

  // Sculpted galleon hull profile (pointed bow at +Z, rounded transom at -Z)
  const halfB = ship.beam * 0.5;
  const halfL = ship.length * 0.5;
  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, halfL * 1.04);
  hullShape.quadraticCurveTo(halfB * 0.92, halfL * 0.55, halfB, 0);
  hullShape.quadraticCurveTo(halfB * 0.95, -halfL * 0.65, halfB * 0.68, -halfL * 0.92);
  hullShape.lineTo(-halfB * 0.68, -halfL * 0.92);
  hullShape.quadraticCurveTo(-halfB * 0.95, -halfL * 0.65, -halfB, 0);
  hullShape.quadraticCurveTo(-halfB * 0.92, halfL * 0.55, 0, halfL * 1.04);

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 1.55,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.12,
    bevelSegments: 2,
    curveSegments: 10,
  });
  hullGeo.rotateX(Math.PI * 0.5);
  const hullMesh = new THREE.Mesh(hullGeo, hullMat);
  hullMesh.position.y = 1.48;
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  g.add(hullMesh);

  // Hull decorative trim belt + main planked deck
  const beltGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.2,
    bevelEnabled: false,
    curveSegments: 10,
  });
  beltGeo.rotateX(Math.PI * 0.5);
  const beltMesh = new THREE.Mesh(beltGeo, accentMat);
  beltMesh.scale.set(1.03, 1, 1.01);
  beltMesh.position.y = 1.6;
  g.add(beltMesh);

  const deckGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.12,
    bevelEnabled: false,
    curveSegments: 10,
  });
  deckGeo.rotateX(Math.PI * 0.5);
  const deckMesh = new THREE.Mesh(deckGeo, plankMat);
  deckMesh.scale.set(0.88, 1, 0.92);
  deckMesh.position.y = 1.62;
  g.add(deckMesh);

  // Elevated stern poop deck + rear stern cabin windows (Image 5)
  const poopDeck = new THREE.Mesh(
    new THREE.BoxGeometry(ship.beam * 0.86, 1.15, ship.length * 0.25),
    accentMat
  );
  poopDeck.position.set(0, 2.08, -ship.length * 0.28);
  poopDeck.castShadow = true;
  g.add(poopDeck);

  const cabinRoof = new THREE.Mesh(
    new THREE.BoxGeometry(ship.beam * 0.92, 0.14, ship.length * 0.27),
    plankMat
  );
  cabinRoof.position.set(0, 2.68, -ship.length * 0.28);
  g.add(cabinRoof);

  const sternWindow = new THREE.Mesh(
    new THREE.BoxGeometry(ship.beam * 0.62, 0.42, 0.12),
    trimGoldMat
  );
  sternWindow.position.set(0, 2.2, -ship.length * 0.41);
  g.add(sternWindow);

  // Bowsprit & sculpted figurehead (+Z bow)
  const bowsprit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.13, 3.6, 6),
    plankMat
  );
  bowsprit.rotation.x = Math.PI * 0.37;
  bowsprit.position.set(0, 2.02, ship.length * 0.55);
  g.add(bowsprit);

  const figGroup = new THREE.Group();
  figGroup.position.set(0, 1.68, ship.length * 0.5);
  if (ship.figurehead === 'horse') {
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.95, 0.55), getColorMat(0xe2b64c, 0.58));
    neck.rotation.x = 0.35;
    neck.position.set(0, 0.35, 0.18);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.72), getColorMat(0xe2b64c, 0.58));
    head.rotation.x = 0.2;
    head.position.set(0, 0.85, 0.42);
    figGroup.add(neck, head);
  } else if (ship.figurehead === 'serpent') {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.1, 7), getColorMat(0x4ca662, 0.6));
    neck.rotation.x = 0.45;
    neck.position.set(0, 0.42, 0.2);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.78, 6), getColorMat(0x4ca662, 0.6));
    snout.rotation.x = Math.PI * 0.48;
    snout.position.set(0, 0.88, 0.58);
    figGroup.add(neck, snout);
  } else if (ship.figurehead === 'phoenix') {
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.15, 5), getColorMat(0xd64836, 0.56));
    crest.rotation.x = 0.42;
    crest.position.set(0, 0.45, 0.28);
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.95), trimGoldMat);
      wing.position.set(sx * 0.35, 0.42, 0.05);
      wing.rotation.z = sx * 0.35;
      figGroup.add(wing);
    }
    figGroup.add(crest);
  } else if (ship.figurehead === 'zebra') {
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.92, 0.5), getColorMat(0xebeef2, 0.62));
    neck.rotation.x = 0.32;
    neck.position.set(0, 0.38, 0.16);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.46), getColorMat(0x23262b, 0.7));
    stripe.position.set(0, 0.45, 0.2);
    figGroup.add(neck, stripe);
  } else {
    const ram = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0), getColorMat(0xc9914e, 0.62));
    ram.scale.set(0.85, 1.1, 1.3);
    ram.position.set(0, 0.28, 0.2);
    figGroup.add(ram);
  }
  g.add(figGroup);

  // 3 masts with crow's nests, rigging yards, billowing curved sails & Jolly Roger pennants
  const mastOffsets = [-ship.length * 0.24, 0.25, ship.length * 0.25];
  for (let m = 0; m < mastOffsets.length; m++) {
    const mz = mastOffsets[m];
    const mastH = m === 1 ? 8.6 : 6.7;
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.15, mastH, 7),
      plankMat
    );
    mast.position.set(0, 1.55 + mastH * 0.5, mz);
    mast.castShadow = true;
    g.add(mast);

    // Crow's nest
    const nest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.32, 0.42, 8),
      plankMat
    );
    nest.position.set(0, 1.55 + mastH * 0.84, mz);
    g.add(nest);

    // Two billowing curved square sails per mast (CylinderGeometry arc)
    for (const sy of [mastH * 0.42, mastH * 0.72]) {
      const sailW = (m === 1 ? 3.55 : 2.75) * (sy > mastH * 0.6 ? 0.78 : 1);
      const sailH = sy > mastH * 0.6 ? 1.5 : 1.95;
      const yard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, sailW + 0.45, 6),
        plankMat
      );
      yard.rotation.z = Math.PI * 0.5;
      yard.position.set(0, 1.55 + sy, mz);
      g.add(yard);

      // Curved billowing sail geometry bulging toward +Z bow
      const arcRadius = sailW * 1.15;
      const sailGeo = new THREE.CylinderGeometry(
        arcRadius,
        arcRadius,
        sailH,
        8,
        1,
        true,
        -0.46,
        0.92
      );
      const sailMesh = new THREE.Mesh(sailGeo, sailMat);
      sailMesh.position.set(0, 1.55 + sy - sailH * 0.48, mz - arcRadius * 0.84);
      sailMesh.castShadow = true;
      g.add(sailMesh);
    }

    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.52), blackFlagMat);
    flag.position.set(0.48, 1.55 + mastH - 0.16, mz);
    g.add(flag);
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
  root.name = 'island-jaya';

  const colorMatCache = new Map<string, THREE.MeshStandardMaterial>();
  const getColorMat = (hex: string | number, roughness = 0.85) => {
    const key = `${hex}_${roughness}`;
    let m = colorMatCache.get(key);
    if (!m) {
      m = trackMat(new THREE.MeshStandardMaterial({ color: hex, roughness }));
      colorMatCache.set(key, m);
    }
    return m;
  };

  const terrainTex = trackTex(createJayaTerrainTexture(768));
  const plankTex = trackTex(createPlankTexture('#8b5f39', 12));
  const darkPlankTex = trackTex(createPlankTexture('#5c3c22', 10));
  const roofTex = trackTex(createRedTileRoofTexture());

  const terrainMat = trackMat(new THREE.MeshStandardMaterial({
    map: terrainTex,
    roughness: 0.9,
    metalness: 0.02,
    transparent: true,
    alphaTest: 0.14,
  }));
  const plankMat = trackMat(new THREE.MeshStandardMaterial({
    map: plankTex,
    roughness: 0.86,
  }));
  const darkPlankMat = trackMat(new THREE.MeshStandardMaterial({
    map: darkPlankTex,
    roughness: 0.9,
  }));
  const roofMat = trackMat(new THREE.MeshStandardMaterial({
    map: roofTex,
    roughness: 0.72,
  }));
  const whiteTrimMat = trackMat(new THREE.MeshStandardMaterial({
    color: 0xf0e9dc,
    roughness: 0.84,
  }));
  const windowGlassMat = trackMat(new THREE.MeshStandardMaterial({
    color: 0x263242,
    emissive: 0xffb347,
    emissiveIntensity: 0.25,
    roughness: 0.35,
  }));
  const darkIronMat = trackMat(new THREE.MeshStandardMaterial({
    color: 0x3b3530,
    roughness: 0.82,
    metalness: 0.25,
  }));
  const sailMat = trackMat(new THREE.MeshStandardMaterial({
    color: 0xf4eee0,
    roughness: 0.85,
    side: THREE.DoubleSide,
  }));
  const blackFlagMat = trackMat(new THREE.MeshStandardMaterial({
    color: 0x16191f,
    side: THREE.DoubleSide,
    roughness: 0.7,
  }));

  // 1. Curved planetary terrain mesh (160x160 balanced detail)
  const segs = 160;
  const planeGeo = trackGeo(new THREE.PlaneGeometry(
    JAYA_WORLD_SIZE,
    JAYA_WORLD_SIZE,
    segs,
    segs
  ));
  planeGeo.rotateX(-Math.PI / 2);
  const posAttr = planeGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const ly = sampleJayaHeight(lx, lz);
    const sp = toJayaSphereLocal(lx, ly, lz, globeRadius);
    posAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  posAttr.needsUpdate = true;
  planeGeo.computeVertexNormals();

  const terrainMesh = new THREE.Mesh(planeGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  root.add(terrainMesh);

  // Place helper on curved sphere tangent frame
  const placeAtLocal = (
    obj: THREE.Object3D,
    lx: number,
    ly: number,
    lz: number,
    yaw = 0
  ) => {
    const sp = toJayaSphereLocal(lx, ly, lz, globeRadius);
    obj.position.set(sp.x, sp.y, sp.z);
    obj.scale.setScalar(S);
    const radialNormal = new THREE.Vector3(
      sp.x,
      sp.y + globeRadius,
      sp.z
    ).normalize();
    obj.quaternion.setFromUnitVectors(_up, radialNormal);
    if (yaw !== 0) obj.rotateY(yaw);
  };

  // 2. Translucent turquoise lagoon & inland pond water surfaces (Images 1 & 4)
  const lagoonWaterMat = trackMat(new THREE.MeshStandardMaterial({
    color: 0x45d6d8,
    roughness: 0.14,
    metalness: 0.12,
    transparent: true,
    opacity: 0.82,
  }));
  const lagoonGeo = trackGeo(new THREE.CircleGeometry(10.5, 24));
  lagoonGeo.rotateX(-Math.PI * 0.5);
  const lagoonPatch = new THREE.Mesh(lagoonGeo, lagoonWaterMat);
  placeAtLocal(lagoonPatch, -20.5, 1.05, -2.5);
  root.add(lagoonPatch);

  for (const [px, pz, pr] of [
    [-44.0, -64.0, 5.4],
    [35.0, -51.5, 4.5],
  ] as const) {
    const pondGeo = trackGeo(new THREE.CircleGeometry(pr, 20));
    pondGeo.rotateX(-Math.PI * 0.5);
    const pondMesh = new THREE.Mesh(pondGeo, lagoonWaterMat);
    placeAtLocal(pondMesh, px, 1.15, pz);
    root.add(pondMesh);
  }

  // 3. Mock Town Wooden Plank Street (Rue Principale), Dilapidated Harbor Quay & Long Pier
  const streetGroup = new THREE.Group();
  const mainStreetPlanks = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.22, 36.0),
    plankMat
  );
  mainStreetPlanks.position.set(0, 0.05, 0);
  mainStreetPlanks.receiveShadow = true;
  streetGroup.add(mainStreetPlanks);
  placeAtLocal(streetGroup, -35.5, 2.52, -28.0);
  root.add(streetGroup);

  // Dilapidated Harbor Quay + North-East Wooden Pier (Image 5)
  const quayGroup = new THREE.Group();
  const quayDeck = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.32, 33.5),
    darkPlankMat
  );
  quayDeck.position.set(0, 0.1, 0);
  quayDeck.receiveShadow = true;
  quayGroup.add(quayDeck);
  for (let pz = -15.5; pz <= 15.5; pz += 3.1) {
    const piling = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 4.8, 6),
      darkPlankMat
    );
    piling.position.set(1.5, -2.1, pz);
    quayGroup.add(piling);
  }
  placeAtLocal(quayGroup, -24.8, 2.25, -28.0);
  root.add(quayGroup);

  const pierGroup = new THREE.Group();
  const longPier = new THREE.Mesh(
    new THREE.BoxGeometry(16.0, 0.3, 2.6),
    darkPlankMat
  );
  longPier.position.set(0, 0.05, 0);
  pierGroup.add(longPier);
  for (let px = -7.0; px <= 7.0; px += 2.8) {
    for (const pz of [-1.0, 1.0]) {
      const piling = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.16, 4.6, 6),
        darkPlankMat
      );
      piling.position.set(px, -2.0, pz);
      pierGroup.add(piling);
    }
  }
  placeAtLocal(pierGroup, -17.5, 2.2, -43.0);
  root.add(pierGroup);

  // Curved Wooden Stilt Boardwalk over Turquoise Lagoon leading to L'Hôtel Tropical (Image 4)
  for (let i = 0; i < JAYA_HOTEL_BOARDWALK_PATH.length - 1; i++) {
    const [ax, az] = JAYA_HOTEL_BOARDWALK_PATH[i];
    const [bx, bz] = JAYA_HOTEL_BOARDWALK_PATH[i + 1];
    const segLen = Math.hypot(bx - ax, bz - az) + 0.5;
    const mx = (ax + bx) * 0.5;
    const mz = (az + bz) * 0.5;
    const segYaw = Math.atan2(bx - ax, bz - az);

    const bwGroup = new THREE.Group();
    const deckSeg = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.28, segLen),
      plankMat
    );
    deckSeg.position.y = 0.1;
    deckSeg.receiveShadow = true;
    bwGroup.add(deckSeg);

    for (const rx of [-1.1, 1.1]) {
      const postA = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.13, 3.6, 6),
        darkPlankMat
      );
      postA.position.set(rx, -1.6, -segLen * 0.35);
      bwGroup.add(postA);

      const postB = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.13, 3.6, 6),
        darkPlankMat
      );
      postB.position.set(rx, -1.6, segLen * 0.35);
      bwGroup.add(postB);
    }
    placeAtLocal(bwGroup, mx, 2.35, mz, segYaw);
    root.add(bwGroup);
  }

  // Wide wooden landing platform at boardwalk start (matching Image 4 foreground!)
  const hotelLanding = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 0.32, 4.4),
    plankMat
  );
  placeAtLocal(hotelLanding, -32.8, 2.38, -10.2, 0.35);
  root.add(hotelLanding);

  // 4. Buildings across Mock Town, Tropical Hotel, South Grave Hideout & Cricket's House
  for (const b of JAYA_BUILDINGS) {
    let bMesh: THREE.Group;
    if (b.kind === 'tropical-hotel') {
      bMesh = buildTropicalHotel(b, plankMat, roofMat, whiteTrimMat, windowGlassMat);
    } else if (b.kind === 'cricket-castle') {
      bMesh = buildCricketCastleHouse(b, darkPlankMat);
    } else if (b.kind === 'jungle-tent') {
      bMesh = new THREE.Group();
      const tentWall = new THREE.Mesh(
        new THREE.BoxGeometry(b.width, b.wallHeight * 0.72, b.depth),
        new THREE.MeshStandardMaterial({ color: b.wallColor, roughness: 0.9 })
      );
      tentWall.position.y = b.wallHeight * 0.36;
      tentWall.castShadow = true;
      bMesh.add(tentWall);
      const tentRoof = new THREE.Mesh(
        new THREE.ConeGeometry(b.width * 0.85, b.roofHeight, 4),
        new THREE.MeshStandardMaterial({ color: b.roofColor, roughness: 0.88 })
      );
      tentRoof.rotation.y = Math.PI * 0.25;
      tentRoof.position.y = b.wallHeight * 0.72 + b.roofHeight * 0.5;
      tentRoof.castShadow = true;
      bMesh.add(tentRoof);
    } else {
      bMesh = buildMockTownBuilding(
        b,
        plankMat,
        roofMat,
        whiteTrimMat,
        windowGlassMat,
        darkIronMat
      );
    }
    placeAtLocal(bMesh, b.x, b.y, b.z, b.yaw);
    root.add(bMesh);
  }

  // Cricket's small East Coast wooden dock near Saruyama terrace
  const cricketDock = new THREE.Group();
  const cDeck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.28, 2.1), darkPlankMat);
  cricketDock.add(cDeck);
  for (const px of [-2.0, 0, 2.0]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 3.6, 6),
      darkPlankMat
    );
    post.position.set(px, -1.7, 0);
    cricketDock.add(post);
  }
  placeAtLocal(cricketDock, 64.5, 2.1, -46.5, -0.25);
  root.add(cricketDock);

  // 5. Moored Pirate Ships & Saruyama Vessels (animated bobbing)
  const animatedShips: {
    group: THREE.Group;
    baseLocal: { x: number; y: number; z: number };
    baseQuat: THREE.Quaternion;
    radial: THREE.Vector3;
    phase: number;
  }[] = [];
  for (let i = 0; i < JAYA_SHIPS.length; i++) {
    const shipSpec = JAYA_SHIPS[i];
    const shipGroup = buildPirateShipMesh(
      shipSpec,
      darkPlankMat,
      getColorMat,
      sailMat,
      blackFlagMat
    );
    const sp = toJayaSphereLocal(shipSpec.x, shipSpec.y, shipSpec.z, globeRadius);
    placeAtLocal(shipGroup, shipSpec.x, shipSpec.y, shipSpec.z, shipSpec.yaw);
    root.add(shipGroup);
    animatedShips.push({
      group: shipGroup,
      baseLocal: sp,
      baseQuat: shipGroup.quaternion.clone(),
      radial: new THREE.Vector3(sp.x, sp.y + globeRadius, sp.z).normalize(),
      phase: i * 1.35,
    });
  }

  // 6. Instanced Tropical Jungle (Curved Frond Palms, Multi-lobed Rainforest Canopy & Radiating Ferns)
  const palms = JAYA_TREES.filter((t) => t.kind === 'palm');
  const canopies = JAYA_TREES.filter((t) => t.kind === 'canopy');
  const ferns = JAYA_TREES.filter((t) => t.kind === 'fern');

  const trunkMat = getColorMat(0x7a5638, 0.92);
  const palmLeafMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 }));
  const canopyLeafMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86 }));

  if (palms.length > 0) {
    // 3-segment gently curved tropical palm trunk
    const trunkParts: THREE.BufferGeometry[] = [];
    const segHeights = [1.65, 1.65, 1.6];
    const segOffsetsX = [0.06, 0.22, 0.38];
    const segTilts = [-0.08, -0.1, -0.06];
    let curY = 0;
    for (let s = 0; s < 3; s++) {
      const seg = new THREE.CylinderGeometry(0.24 - s * 0.04, 0.28 - s * 0.04, segHeights[s] + 0.12, 6);
      seg.rotateZ(segTilts[s]);
      seg.translate(segOffsetsX[s], curY + segHeights[s] * 0.5, 0);
      trunkParts.push(seg);
      curY += segHeights[s];
    }
    const pTrunkGeo = trackGeo(mergeParts(trunkParts));

    // 7 radiating arched palm frond blades + coconuts at crown apex
    const frondParts: THREE.BufferGeometry[] = [];
    const crownX = 0.44;
    const crownY = 4.78;
    for (let f = 0; f < 7; f++) {
      const ang = (f * Math.PI * 2) / 7;
      // Inner rising frond segment
      const inner = new THREE.BoxGeometry(0.48, 0.08, 1.45);
      inner.rotateX(-0.18);
      inner.translate(0, 0.14, 0.72);
      inner.rotateY(ang);
      inner.translate(crownX, crownY, 0);
      frondParts.push(inner);

      // Outer drooping palm leaf tip
      const outer = new THREE.ConeGeometry(0.32, 1.45, 4);
      outer.scale(1.1, 1.0, 0.24);
      outer.rotateX(Math.PI * 0.68);
      outer.translate(0, -0.14, 1.85);
      outer.rotateY(ang);
      outer.translate(crownX, crownY, 0);
      frondParts.push(outer);
    }
    const pCrownGeo = trackGeo(mergeParts(frondParts));

    const pTrunks = new THREE.InstancedMesh(pTrunkGeo, trunkMat, palms.length);
    const pCrowns = new THREE.InstancedMesh(pCrownGeo, palmLeafMat, palms.length);
    pTrunks.castShadow = true;
    pCrowns.castShadow = true;
    pCrowns.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(palms.length * 3),
      3
    );

    palms.forEach((p, idx) => {
      const sp = toJayaSphereLocal(p.x, p.y, p.z, globeRadius);
      const radialN = new THREE.Vector3(sp.x, sp.y + globeRadius, sp.z).normalize();
      _dummy.position.set(sp.x, sp.y, sp.z);
      _dummy.quaternion.setFromUnitVectors(_up, radialN);
      _dummy.rotateY(p.yaw);
      _dummy.rotateZ(0.06 * Math.sin(idx));
      _dummy.scale.setScalar(S * p.scale);
      _dummy.updateMatrix();
      pTrunks.setMatrixAt(idx, _dummy.matrix);
      pCrowns.setMatrixAt(idx, _dummy.matrix);
      _tmpColor.setRGB(0.24 * p.tint, 0.56 * p.tint, 0.2 * p.tint);
      pCrowns.setColorAt(idx, _tmpColor);
    });
    pTrunks.instanceMatrix.needsUpdate = true;
    pCrowns.instanceMatrix.needsUpdate = true;
    if (pCrowns.instanceColor) pCrowns.instanceColor.needsUpdate = true;
    root.add(pTrunks, pCrowns);
  }

  if (canopies.length > 0) {
    const cTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.44, 3.6, 6));
    cTrunkGeo.translate(0, 1.8, 0);
    // Multi-lobed 4-cluster tropical rainforest crown
    const lobeA = new THREE.DodecahedronGeometry(1.75, 1);
    lobeA.scale(1.15, 0.82, 1.1);
    lobeA.translate(0, 4.4, 0);
    const lobeB = new THREE.DodecahedronGeometry(1.3, 1);
    lobeB.translate(1.15, 3.65, 0.65);
    const lobeC = new THREE.DodecahedronGeometry(1.25, 1);
    lobeC.translate(-1.1, 3.75, 0.4);
    const lobeD = new THREE.DodecahedronGeometry(1.2, 1);
    lobeD.translate(0.1, 3.8, -1.15);
    const cFoliageGeo = trackGeo(mergeParts([lobeA, lobeB, lobeC, lobeD]));

    const cTrunks = new THREE.InstancedMesh(cTrunkGeo, trunkMat, canopies.length);
    const cFoliage = new THREE.InstancedMesh(cFoliageGeo, canopyLeafMat, canopies.length);
    cTrunks.castShadow = true;
    cFoliage.castShadow = true;
    cFoliage.receiveShadow = true;
    cFoliage.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(canopies.length * 3),
      3
    );

    canopies.forEach((c, idx) => {
      const sp = toJayaSphereLocal(c.x, c.y, c.z, globeRadius);
      const radialN = new THREE.Vector3(sp.x, sp.y + globeRadius, sp.z).normalize();
      _dummy.position.set(sp.x, sp.y, sp.z);
      _dummy.quaternion.setFromUnitVectors(_up, radialN);
      _dummy.rotateY(c.yaw);
      _dummy.scale.setScalar(S * c.scale);
      _dummy.updateMatrix();
      cTrunks.setMatrixAt(idx, _dummy.matrix);
      cFoliage.setMatrixAt(idx, _dummy.matrix);
      _tmpColor.setRGB(0.16 * c.tint, 0.44 * c.tint, 0.16 * c.tint);
      cFoliage.setColorAt(idx, _tmpColor);
    });
    cTrunks.instanceMatrix.needsUpdate = true;
    cFoliage.instanceMatrix.needsUpdate = true;
    if (cFoliage.instanceColor) cFoliage.instanceColor.needsUpdate = true;
    root.add(cTrunks, cFoliage);
  }

  if (ferns.length > 0) {
    const fernParts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 5; k++) {
      const blade = new THREE.ConeGeometry(0.36, 1.35, 4);
      blade.scale(1.0, 1.0, 0.28);
      blade.rotateX(0.95);
      blade.translate(0, 0.45, 0.48);
      blade.rotateY((k * Math.PI * 2) / 5);
      fernParts.push(blade);
    }
    const fernGeo = trackGeo(mergeParts(fernParts));
    const fernInst = new THREE.InstancedMesh(fernGeo, canopyLeafMat, ferns.length);
    fernInst.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(ferns.length * 3),
      3
    );
    ferns.forEach((f, idx) => {
      const sp = toJayaSphereLocal(f.x, f.y, f.z, globeRadius);
      const radialN = new THREE.Vector3(sp.x, sp.y + globeRadius, sp.z).normalize();
      _dummy.position.set(sp.x, sp.y, sp.z);
      _dummy.quaternion.setFromUnitVectors(_up, radialN);
      _dummy.rotateY(f.yaw);
      _dummy.scale.setScalar(S * f.scale);
      _dummy.updateMatrix();
      fernInst.setMatrixAt(idx, _dummy.matrix);
      _tmpColor.setRGB(0.26 * f.tint, 0.56 * f.tint, 0.21 * f.tint);
      fernInst.setColorAt(idx, _tmpColor);
    });
    fernInst.instanceMatrix.needsUpdate = true;
    if (fernInst.instanceColor) fernInst.instanceColor.needsUpdate = true;
    root.add(fernInst);
  }

  // 7. Props: Barrels, Cargo Crates, Campfire, Boulders & Jaya Wildlife (South Birds)
  const crateMat = getColorMat(0xa47449, 0.88);
  const rockMat = getColorMat(0x7a7064, 0.94);
  const birdBodyMat = getColorMat(0x4ea668, 0.65);
  const birdWingMat = getColorMat(0x377a4d, 0.7);
  const birdBeakMat = getColorMat(0xeeb838, 0.52);
  const birdCrestMat = getColorMat(0xd45a3e, 0.62);
  const birdEyeMat = getColorMat(0x14181e, 0.35);
  const logMat = getColorMat(0x4b301c, 0.94);
  let flameMesh: THREE.Mesh | null = null;

  for (const prop of JAYA_PROPS) {
    const pg = new THREE.Group();
    if (prop.kind === 'barrel') {
      const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.82, 9), crateMat);
      b1.position.y = 0.41;
      const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.78, 9), crateMat);
      b2.position.set(0.62, 0.39, 0.24);
      pg.add(b1, b2);
    } else if (prop.kind === 'crate-stack') {
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.95), crateMat);
      c1.position.y = 0.42;
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.7, 0.75), crateMat);
      c2.position.set(0.12, 1.18, -0.05);
      c2.rotation.y = 0.35;
      pg.add(c1, c2);
    } else if (prop.kind === 'boulder') {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 0), rockMat);
      rock.scale.set(1.2, 0.82, 1.0);
      rock.position.y = 0.65;
      pg.add(rock);
    } else if (prop.kind === 'campfire') {
      // Stone ring + crossed charred logs + 3-tongue layered flame cluster
      for (let s = 0; s < 7; s++) {
        const ang = (s * Math.PI * 2) / 7;
        const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), rockMat);
        stone.scale.set(1.1, 0.65, 1.0);
        stone.position.set(Math.cos(ang) * 0.76, 0.1, Math.sin(ang) * 0.76);
        pg.add(stone);
      }
      for (let l = 0; l < 3; l++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.25, 6), logMat);
        log.rotation.z = Math.PI * 0.42;
        log.rotation.y = (l * Math.PI) / 3;
        log.position.y = 0.18;
        pg.add(log);
      }
      const embers = new THREE.Mesh(
        new THREE.CylinderGeometry(0.56, 0.68, 0.14, 8),
        getColorMat(0x3a2417, 0.95)
      );
      embers.position.y = 0.08;
      flameMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.92, 7),
        trackMat(new THREE.MeshStandardMaterial({
          color: 0xff9a2e,
          emissive: 0xff5a12,
          emissiveIntensity: 1.35,
          roughness: 0.4,
        }))
      );
      flameMesh.position.y = 0.56;
      const innerFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.58, 6),
        trackMat(new THREE.MeshStandardMaterial({
          color: 0xffe46b,
          emissive: 0xffc83b,
          emissiveIntensity: 1.5,
          roughness: 0.3,
        }))
      );
      innerFlame.position.set(0.08, 0.44, 0.06);
      pg.add(embers, flameMesh, innerFlame);
    } else if (prop.kind === 'south-bird') {
      // Iconic Jaya South Bird: plump body, folded wings, tail fan, round eyes, hooked yellow beak & red crest
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), birdBodyMat);
      body.scale.set(0.92, 1.15, 1.15);
      body.position.y = 0.66;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 9, 8), birdBodyMat);
      head.position.set(0, 1.24, 0.18);
      for (const sx of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.56), birdWingMat);
        wing.position.set(sx * 0.4, 0.72, -0.02);
        wing.rotation.z = sx * 0.14;
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), birdEyeMat);
        eye.position.set(sx * 0.18, 1.32, 0.36);
        pg.add(wing, eye);
      }
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.52, 4), birdWingMat);
      tail.rotation.x = -Math.PI * 0.38;
      tail.position.set(0, 0.56, -0.52);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.72, 6), birdBeakMat);
      beak.rotation.x = Math.PI * 0.48;
      beak.position.set(0, 1.2, 0.58);
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.52, 5), birdCrestMat);
      crest.rotation.x = -0.35;
      crest.position.set(0, 1.6, 0.08);
      pg.add(body, head, tail, beak, crest);
    }
    placeAtLocal(pg, prop.x, prop.y, prop.z, prop.yaw);
    pg.scale.multiplyScalar(prop.scale);
    root.add(pg);
  }

  return {
    group: root,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsedS: number) => {
      for (const s of animatedShips) {
        const heave = Math.sin(elapsedS * 1.45 + s.phase) * 0.08 * S;
        const roll = Math.sin(elapsedS * 1.15 + s.phase) * 0.032;
        s.group.position
          .set(s.baseLocal.x, s.baseLocal.y, s.baseLocal.z)
          .addScaledVector(s.radial, heave);
        s.group.quaternion
          .copy(s.baseQuat)
          .multiply(
            new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 0, 1),
              roll
            )
          );
      }
      if (flameMesh) {
        const pulse = 1 + Math.sin(elapsedS * 7.2) * 0.14;
        flameMesh.scale.set(1, pulse, 1);
      }
    },
  };
}
