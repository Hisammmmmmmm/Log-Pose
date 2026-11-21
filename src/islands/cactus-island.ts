import * as THREE from 'three';
import {
  CACTUS_BUILDINGS,
  CACTUS_CROSSES,
  CACTUS_GIANTS,
  CACTUS_GLOBE_SCALE,
  CACTUS_LANDMARKS,
  CACTUS_ROCKS,
  CACTUS_WORLD_SIZE,
  cactusBaySignedDist,
  cactusRoadSignedDist,
  sampleCactusDomeSurface,
  sampleCactusHeight,
  sampleCactusLobeSurface,
  sampleCactusVillageMask,
  toCactusSphereLocal,
  type CactusBuildingSpec,
  type CactusGiantSpec,
  type CactusLobeSpec,
} from '../utils/cactusTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = CACTUS_GLOBE_SCALE;
const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);
const _yAxis = new THREE.Vector3(0, 1, 0);
const _dirVec = new THREE.Vector3();

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

function mergeSimpleBoxGeometries(
  boxes: readonly {
    w: number;
    h: number;
    d: number;
    x: number;
    y: number;
    z: number;
  }[]
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  for (const b of boxes) {
    const g = new THREE.BoxGeometry(b.w, b.h, b.d);
    g.translate(b.x, b.y, b.z);
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
      uvs.push(uv.getX(i), uv.getY(i));
    }
    const idx = g.index;
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices.push(idx.getX(i) + vertexOffset);
      }
    }
    vertexOffset += pos.count;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  merged.setIndex(indices);
  merged.computeBoundingSphere();
  return merged;
}

function createCactusTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = CACTUS_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * CACTUS_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * CACTUS_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const h = sampleCactusHeight(x, z);
      const hx = sampleCactusHeight(x + 0.9, z);
      const hz = sampleCactusHeight(x, z + 0.9);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 1.15, 0, 1);
      const grain = (valueNoise2D(x * 1.45, z * 1.45) - 0.5) * 14;
      const sandPatch = valueNoise2D(x * 0.14 + 2.1, z * 0.14 - 3.7);

      let rgb: [number, number, number] = [214, 174, 96];
      let alpha = 0;

      if (h < -3.6) {
        alpha = smoothstep(-5.0, -3.6, h);
        rgb = [132, 146, 138];
      } else {
        alpha = 1;
        // Underwater sandy shelf -> bay beach -> pale village sand -> ochre desert -> brown cliffs
        const shallowT = smoothstep(-3.6, -0.2, h);
        const wetSandT = smoothstep(-0.2, 0.85, h);
        const shelfCol = mixRgb([106, 152, 150], [194, 184, 146], shallowT);
        const beachCol = mixRgb(shelfCol, [232, 218, 176], wetSandT);

        // Ochre desert plateau (warm golden-tan matching Image 1)
        const desertCol = mixRgb([218, 178, 94], [192, 148, 78], sandPatch * 0.72);
        const beachToDesert = smoothstep(1.35, 3.35, h);
        rgb = mixRgb(beachCol, desertCol, beachToDesert);

        // Pale cream-tan sandy soil across both Twin Villages (Image 1 & 4 & 5)
        const vMask = sampleCactusVillageMask(x, z);
        if (vMask > 0.02 && h > 1.35) {
          const villageSand = mixRgb([232, 218, 182], [220, 204, 166], sandPatch * 0.45);
          rgb = mixRgb(rgb, villageSand, vMask * 0.92);
        }

        // Stepped dark-brown rocky cliffs (outer rim + inner north bay-head cliff)
        const cliffSlopeT = smoothstep(0.24, 0.55, slope) * smoothstep(2.0, 4.2, h);
        const highRimT = smoothstep(6.8, 9.6, h);
        const cliffFactor = clamp(Math.max(cliffSlopeT * 0.95, highRimT * 0.88), 0, 1);
        if (cliffFactor > 0.01) {
          const strata = Math.sin(h * 2.8 + valueNoise2D(x * 0.3, z * 0.3) * 2.0) * 10;
          const brownCliff: [number, number, number] = [
            142 + strata,
            90 + strata * 0.7,
            56 + strata * 0.5,
          ];
          rgb = mixRgb(rgb, brownCliff, cliffFactor);
        }

        // Subtle compacted earth ring around each giant half-buried cactus base
        for (const g of CACTUS_GIANTS) {
          const gd = Math.hypot((x - g.x) / (g.domeRx * 1.18), (z - g.z) / (g.domeRz * 1.18));
          if (gd < 1.0 && h > 1.8) {
            const rootT = 1 - smoothstep(0.62, 1.0, gd);
            rgb = mixRgb(rgb, [146, 126, 84], rootT * 0.46);
          }
        }

        // Clearly readable pale grey-tan village streets, tavern plaza & cactus trails
        const rDist = cactusRoadSignedDist(x, z);
        const baySd = cactusBaySignedDist(x, z);
        if (rDist < 0.72 && h > 1.3 && baySd > 0.4) {
          const curbT =
            smoothstep(-0.1, 0.28, rDist) * (1 - smoothstep(0.28, 0.72, rDist));
          const roadT = 1 - smoothstep(-0.22, 0.36, rDist);
          const dust = (valueNoise2D(x * 2.6, z * 2.6) - 0.5) * 12;
          rgb = mixRgb(rgb, [164, 146, 118], curbT * 0.65);
          rgb = mixRgb(
            rgb,
            [208 + dust, 198 + dust, 178 + dust],
            roadT * 0.92
          );
        }
      }

      data[idx] = clamp(Math.round(rgb[0] + (h > 0.5 ? grain : 0)), 0, 255);
      data[idx + 1] = clamp(Math.round(rgb[1] + (h > 0.5 ? grain : 0)), 0, 255);
      data[idx + 2] = clamp(Math.round(rgb[2] + (h > 0.5 ? grain : 0)), 0, 255);
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

function createCactusSkinTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Vertical gradient: darker earthy-olive near buried base, rich sage/emerald up the dome
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#629854');
  grad.addColorStop(0.45, '#538648');
  grad.addColorStop(0.76, '#5b7c4a');
  grad.addColorStop(0.92, '#7d6b4c');
  grad.addColorStop(1.0, '#725c3f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Vertical rib crest highlights & valley shadow stripes
  const ribStripes = 26;
  const stripeW = 512 / ribStripes;
  for (let i = 0; i < ribStripes; i++) {
    const cx = i * stripeW;
    ctx.fillStyle = 'rgba(28, 46, 22, 0.24)';
    ctx.fillRect(cx, 0, stripeW * 0.24, 512);
    ctx.fillStyle = 'rgba(176, 212, 134, 0.16)';
    ctx.fillRect(cx + stripeW * 0.42, 0, stripeW * 0.2, 512);

    // Subtle spine areole clusters along rib crests
    for (let y = 16; y < 440; y += 22) {
      ctx.fillStyle = 'rgba(232, 224, 192, 0.35)';
      ctx.fillRect(cx + stripeW * 0.48, y, 2.5, 2.5);
    }
  }

  // Organic horizontal growth bands
  for (let y = 24; y < 490; y += 28) {
    ctx.fillStyle = 'rgba(42, 64, 34, 0.08)';
    ctx.fillRect(0, y, 512, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createCrossWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#8b613c';
  ctx.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 6) {
    ctx.fillStyle = x % 12 === 0 ? 'rgba(54, 34, 18, 0.24)' : 'rgba(176, 132, 86, 0.16)';
    ctx.fillRect(x, 0, 3, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createAdobePlasterTexture(baseColorHex: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const c = new THREE.Color(baseColorHex);
  ctx.fillStyle = `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle desert adobe plaster shading & dusty lower plinth
  const baseGrad = ctx.createLinearGradient(0, 0, 0, 256);
  baseGrad.addColorStop(0, 'rgba(255, 252, 244, 0.12)');
  baseGrad.addColorStop(0.75, 'rgba(210, 188, 152, 0.06)');
  baseGrad.addColorStop(1, 'rgba(150, 122, 84, 0.34)');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 256, 256);

  // Stucco flecks & subtle masonry joints
  for (let i = 0; i < 60; i++) {
    const x = (i * 53) % 246;
    const y = (i * 89) % 246;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(140, 118, 88, 0.11)' : 'rgba(255, 250, 238, 0.14)';
    ctx.fillRect(x, y, 8 + (i % 8), 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createBaroqueTavernSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 176;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Dark weathered oak tavern signboard
  ctx.fillStyle = '#472512';
  ctx.fillRect(0, 0, 512, 176);

  ctx.strokeStyle = '#e8b954';
  ctx.lineWidth = 9;
  ctx.strokeRect(10, 10, 492, 156);
  ctx.strokeStyle = '#8b5a2b';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, 472, 136);

  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 40px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TAVERNE BAROQUE', 256, 66);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('WHISKY PEAK · BANQUET', 256, 120);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createStripedSailTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const stripes = 6;
  const w = 256 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#f4ecd8' : '#b83228';
    ctx.fillRect(i * w, 0, w + 1, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Builds the fluted/ribbed half-buried cactus dome geometry using the exact same
 * analytical surface formula as wooden cross placement.
 * `phi` runs down to -0.62 rad so the lower skirt plunges deep below local terrain!
 */
function buildRibbedDomeGeo(giant: CactusGiantSpec): THREE.BufferGeometry {
  const segU = Math.max(48, giant.ribs * 3);
  const segV = 26;
  const phiMin = -0.36;
  const phiMax = Math.PI * 0.495;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const vFrac = iv / segV;
    const phi = phiMin + vFrac * (phiMax - phiMin);
    for (let iu = 0; iu <= segU; iu++) {
      const uFrac = iu / segU;
      const theta = uFrac * Math.PI * 2;
      const pt = sampleCactusDomeSurface(giant, theta, phi);
      // Clamp bottom skirt to max 2.4m below local ground so half-buried cactus never pokes beneath sea floor
      const localGroundY = sampleCactusHeight(pt.x, pt.z);
      const clampedY = Math.max(pt.y, localGroundY - 2.4);
      positions.push(pt.x - giant.x, clampedY - giant.centerY, pt.z - giant.z);
      uvs.push(uFrac * (giant.ribs / 24), 1 - vFrac);
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * (segU + 1) + iu;
      const b = a + 1;
      const c = a + (segU + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function buildRibbedLobeGeo(lobe: CactusLobeSpec): THREE.BufferGeometry {
  const segU = 28;
  const segV = 16;
  const phiMin = -Math.PI * 0.48;
  const phiMax = Math.PI * 0.48;
  const zeroGiant = { x: 0, centerY: 0, z: 0 };

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const vFrac = iv / segV;
    const phi = phiMin + vFrac * (phiMax - phiMin);
    for (let iu = 0; iu <= segU; iu++) {
      const uFrac = iu / segU;
      const theta = uFrac * Math.PI * 2;
      const pt = sampleCactusLobeSurface(zeroGiant, lobe, theta, phi);
      positions.push(pt.x - lobe.ox, pt.y - lobe.oy, pt.z - lobe.oz);
      uvs.push(uFrac * 0.65, 1 - vFrac);
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * (segU + 1) + iu;
      const b = a + 1;
      const c = a + (segU + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function addWoodenLadder(
  parent: THREE.Group,
  x: number,
  yBottom: number,
  z: number,
  height: number,
  rotY: number,
  woodMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
) {
  const ladder = new THREE.Group();
  const railGeo = trackGeo(new THREE.BoxGeometry(0.08, height, 0.08));
  const leftRail = new THREE.Mesh(railGeo, woodMat);
  leftRail.position.set(-0.24, height * 0.5, 0);
  const rightRail = new THREE.Mesh(railGeo, woodMat);
  rightRail.position.set(0.24, height * 0.5, 0);
  ladder.add(leftRail, rightRail);

  const rungCount = Math.max(4, Math.floor(height / 0.42));
  const rungGeo = trackGeo(new THREE.BoxGeometry(0.5, 0.06, 0.06));
  for (let i = 1; i <= rungCount; i++) {
    const rung = new THREE.Mesh(rungGeo, woodMat);
    rung.position.set(0, (i / (rungCount + 1)) * height, 0);
    ladder.add(rung);
  }

  ladder.position.set(x, yBottom, z);
  ladder.rotation.y = rotY;
  ladder.rotation.x = -0.22; // Leaning naturally against the stepped wall
  parent.add(ladder);
}

function buildDesertBuilding(
  spec: CactusBuildingSpec,
  wallMat: THREE.Material,
  trimMat: THREE.Material,
  woodMat: THREE.Material,
  windowMat: THREE.Material,
  doorMat: THREE.Material,
  warmGlowMat: THREE.Material,
  goldMat: THREE.Material,
  tavernSignMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const g = new THREE.Group();
  const w = spec.width;
  const d = spec.depth;
  const h1 = spec.baseHeight;

  // Ground-floor adobe volume
  const tier1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h1, d)), wallMat);
  tier1.position.y = h1 * 0.5;
  g.add(tier1);

  // Roof parapet rim
  const rim1 = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(w + 0.16, 0.2, d + 0.16)),
    trimMat
  );
  rim1.position.y = h1 + 0.06;
  g.add(rim1);

  // Front doorway (+Z in building local coords; tavern has yaw = -PI/2 so +Z points west into plaza)
  const isTavern = spec.kind === 'tavern';
  const doorW = isTavern ? 1.25 : 0.82;
  const doorH = isTavern ? 1.95 : 1.55;
  const door = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(doorW, doorH, 0.12)),
    isTavern ? warmGlowMat : doorMat
  );
  door.position.set(0, doorH * 0.5, d * 0.5 + 0.02);
  g.add(door);

  const doorFrame = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(doorW + 0.2, doorH + 0.14, 0.08)),
    woodMat
  );
  doorFrame.position.set(0, doorH * 0.5 + 0.04, d * 0.5 - 0.01);
  g.add(doorFrame);

  // Blue-framed windows (warm lit for tavern)
  const winMat = isTavern ? warmGlowMat : windowMat;
  const winGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.72, 0.08));
  const frameGeo = trackGeo(new THREE.BoxGeometry(0.84, 0.88, 0.06));
  const winOffsetsX = isTavern ? [-w * 0.31, w * 0.31] : [-w * 0.28, w * 0.28];
  for (const wx of winOffsetsX) {
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(wx, h1 * 0.58, d * 0.5 + 0.03);
    const frame = new THREE.Mesh(frameGeo, trimMat);
    frame.position.set(wx, h1 * 0.58, d * 0.5 + 0.005);
    g.add(frame, win);
  }

  // Side windows
  const sideWinGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.68, 0.68));
  for (const sx of [-w * 0.5 - 0.02, w * 0.5 + 0.02]) {
    const sw = new THREE.Mesh(sideWinGeo, winMat);
    sw.position.set(sx, h1 * 0.58, 0);
    g.add(sw);
  }

  // Optional upper stepped tiers
  let topY = h1;
  if (spec.tiers >= 2) {
    const w2 = w * 0.72;
    const d2 = d * 0.7;
    const h2 = h1 * 0.74;
    const ox2 = spec.kind === 'cupola-hall' ? -w * 0.08 : (spec.shore === 'west' ? -0.25 : 0.25);
    const tier2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w2, h2, d2)), wallMat);
    tier2.position.set(ox2, h1 + h2 * 0.5, -d * 0.08);
    const rim2 = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(w2 + 0.14, 0.18, d2 + 0.14)),
      trimMat
    );
    rim2.position.set(ox2, h1 + h2 + 0.05, -d * 0.08);
    const uWin = new THREE.Mesh(winGeo, winMat);
    uWin.position.set(ox2, h1 + h2 * 0.55, -d * 0.08 + d2 * 0.5 + 0.02);
    g.add(tier2, rim2, uWin);
    topY = h1 + h2;

    if (spec.tiers === 3) {
      const w3 = w * 0.44;
      const d3 = d * 0.44;
      const h3 = h1 * 0.68;
      const tier3 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w3, h3, d3)), wallMat);
      tier3.position.set(ox2, topY + h3 * 0.5, -d * 0.12);
      const rim3 = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(w3 + 0.12, 0.16, d3 + 0.12)),
        trimMat
      );
      rim3.position.set(ox2, topY + h3 + 0.04, -d * 0.12);
      g.add(tier3, rim3);
      topY += h3;

      if (spec.kind === 'cupola-hall') {
        // Golden onion/dome cupola & cross finial matching Image 5 left!
        const drum = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.55, 0.62, 0.55, 14)),
          wallMat
        );
        drum.position.set(ox2, topY + 0.28, -d * 0.12);
        const dome = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.62, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62)),
          goldMat
        );
        dome.position.set(ox2, topY + 0.55, -d * 0.12);
        const spireV = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.06, 0.72, 0.06)),
          woodMat
        );
        spireV.position.set(ox2, topY + 1.38, -d * 0.12);
        const spireH = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.36, 0.06, 0.06)),
          woodMat
        );
        spireH.position.set(ox2, topY + 1.52, -d * 0.12);
        g.add(drum, dome, spireV, spireH);
      }
    }
  }

  // Wooden timber porch/pergola awning (matching Image 5 & Tavern veranda)
  if (spec.hasAwning) {
    const awningW = isTavern ? w * 0.92 : w * 0.72;
    const awningD = isTavern ? 2.15 : 1.35;
    const roof = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(awningW, 0.12, awningD)),
      woodMat
    );
    roof.position.set(0, 2.38, d * 0.5 + awningD * 0.48);
    roof.rotation.x = 0.09;
    g.add(roof);

    const postGeo = trackGeo(new THREE.CylinderGeometry(0.07, 0.08, 2.38, 7));
    const postOffsets = isTavern
      ? [-awningW * 0.44, -awningW * 0.14, awningW * 0.14, awningW * 0.44]
      : [-awningW * 0.42, awningW * 0.42];
    for (const px of postOffsets) {
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(px, 1.18, d * 0.5 + awningD * 0.88);
      g.add(post);
    }
  }

  // Exterior leaning wooden ladders onto roof terraces (iconic in Image 5!)
  if (spec.hasLadder) {
    addWoodenLadder(
      g,
      w * 0.34,
      0,
      d * 0.5 + 0.45,
      h1 + 0.35,
      0,
      woodMat,
      trackGeo
    );
    if (spec.tiers >= 2) {
      addWoodenLadder(
        g,
        -w * 0.22,
        h1,
        d * 0.25,
        h1 * 0.78 + 0.25,
        0,
        woodMat,
        trackGeo
      );
    }
  }

  // Baroque Works Tavern special details: Signboard, Banquet Tables & Whisky Barrels!
  if (isTavern) {
    const signBoard = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.8, 1.25, 0.14)),
      tavernSignMat
    );
    signBoard.position.set(0, h1 + 0.55, d * 0.5 + 0.18);
    g.add(signBoard);

    // Outdoor banquet tables & benches where Straw Hats drank with Baroque Works
    const tableTopGeo = trackGeo(new THREE.BoxGeometry(2.1, 0.12, 0.95));
    const legGeo = trackGeo(new THREE.BoxGeometry(0.12, 0.72, 0.85));
    const benchGeo = trackGeo(new THREE.BoxGeometry(2.0, 0.1, 0.34));
    const mugGeo = trackGeo(new THREE.CylinderGeometry(0.07, 0.08, 0.18, 7));

    for (const [tx, tz] of [
      [-1.7, d * 0.5 + 3.2],
      [1.7, d * 0.5 + 3.2],
    ]) {
      const tbl = new THREE.Mesh(tableTopGeo, woodMat);
      tbl.position.set(tx, 0.75, tz);
      const legL = new THREE.Mesh(legGeo, woodMat);
      legL.position.set(tx - 0.8, 0.36, tz);
      const legR = new THREE.Mesh(legGeo, woodMat);
      legR.position.set(tx + 0.8, 0.36, tz);
      const b1 = new THREE.Mesh(benchGeo, woodMat);
      b1.position.set(tx, 0.42, tz - 0.72);
      const b2 = new THREE.Mesh(benchGeo, woodMat);
      b2.position.set(tx, 0.42, tz + 0.72);
      g.add(tbl, legL, legR, b1, b2);

      for (const mx of [-0.6, 0.05, 0.55]) {
        const mug = new THREE.Mesh(mugGeo, goldMat);
        mug.position.set(tx + mx, 0.89, tz + (mx > 0 ? 0.14 : -0.12));
        g.add(mug);
      }
    }

    // Stacked oak whisky barrels beside tavern entrance
    const barrelGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.32, 0.78, 10));
    const barrelCoords: readonly [number, number, number][] = [
      [-w * 0.46, 0.39, d * 0.5 + 1.1],
      [-w * 0.34, 0.39, d * 0.5 + 1.15],
      [-w * 0.4, 1.14, d * 0.5 + 1.12],
      [w * 0.42, 0.39, d * 0.5 + 1.05],
    ];
    for (const [bx, by, bz] of barrelCoords) {
      const barrel = new THREE.Mesh(barrelGeo, woodMat);
      barrel.position.set(bx, by, bz);
      g.add(barrel);
    }

    // Warm tavern porch lanterns
    const lanternGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.34, 0.24));
    for (const lx of [-1.45, 1.45]) {
      const lan = new THREE.Mesh(lanternGeo, warmGlowMat);
      lan.position.set(lx, 2.25, d * 0.5 + 2.05);
      g.add(lan);
    }
  }

  return g;
}

function buildHarborShip(
  hullMat: THREE.Material,
  deckMat: THREE.Material,
  sailMat: THREE.Material,
  goldMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const ship = new THREE.Group();

  // Hull
  const hull = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.3, 1.1, 6.2)),
    hullMat
  );
  hull.position.y = 0.35;
  const prow = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(1.18, 2.1, 4)),
    hullMat
  );
  prow.rotation.x = Math.PI * 0.5;
  prow.rotation.y = Math.PI * 0.25;
  prow.position.set(0, 0.45, 3.9);

  // Deck & stern cabin
  const deck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.05, 0.14, 5.6)),
    deckMat
  );
  deck.position.y = 0.94;
  const sternCabin = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.1, 0.95, 1.8)),
    hullMat
  );
  sternCabin.position.set(0, 1.38, -2.05);

  // Bowsprit & main mast
  const bowsprit = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.07, 0.1, 2.5, 7)),
    deckMat
  );
  bowsprit.rotation.x = Math.PI * 0.4;
  bowsprit.position.set(0, 1.35, 4.7);

  const mast = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.11, 0.14, 5.6, 8)),
    deckMat
  );
  mast.position.set(0, 3.6, 0.4);

  const yard = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.07, 0.07, 4.4, 8)),
    deckMat
  );
  yard.rotation.z = Math.PI * 0.5;
  yard.position.set(0, 4.9, 0.4);

  const sail = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.0, 2.5, 0.08)),
    sailMat
  );
  sail.position.set(0, 3.65, 0.46);

  const crowsNest = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.45, 0.34, 0.42, 10)),
    goldMat
  );
  crowsNest.position.set(0, 5.6, 0.4);

  ship.add(hull, prow, deck, sternCabin, bowsprit, mast, yard, sail, crowsNest);
  return ship;
}

export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance | null {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const group = new THREE.Group();
  group.name = 'CactusIsland';

  const keepTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;

  const placeOnSphere = (
    obj: THREE.Object3D,
    lx: number,
    ly: number,
    lz: number,
    yaw = 0
  ) => {
    const sp = toCactusSphereLocal(lx, ly, lz, globeRadius);
    obj.position.set(sp.x, sp.y, sp.z);
    const normal = new THREE.Vector3(sp.x, sp.y + globeRadius, sp.z).normalize();
    const tilt = new THREE.Quaternion().setFromUnitVectors(_up, normal);
    const rot = new THREE.Quaternion().setFromAxisAngle(_yAxis, yaw);
    obj.quaternion.copy(tilt).multiply(rot);
    obj.scale.setScalar(S);
  };

  // Procedural textures & materials
  const terrainTex = keepTex(createCactusTerrainTexture(1024));
  const cactusTex = keepTex(createCactusSkinTexture());
  const crossWoodTex = keepTex(createCrossWoodTexture());
  const tavernSignTex = keepTex(createBaroqueTavernSignTexture());
  const sailTex = keepTex(createStripedSailTexture());

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.9,
      metalness: 0.02,
      transparent: true,
      alphaTest: 0.08,
    })
  );

  const cactusMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: cactusTex,
      roughness: 0.84,
      metalness: 0.02,
    })
  );

  const crossMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: crossWoodTex,
      color: 0xffffff,
      roughness: 0.86,
      metalness: 0.03,
    })
  );

  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x704828,
      roughness: 0.86,
      metalness: 0.04,
    })
  );

  const trimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xa4825a,
      roughness: 0.82,
      metalness: 0.03,
    })
  );

  const windowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x35648a,
      roughness: 0.45,
      metalness: 0.14,
    })
  );

  const doorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c361e,
      roughness: 0.85,
      metalness: 0.04,
    })
  );

  const warmGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      emissive: 0xff9d2e,
      emissiveIntensity: 0.85,
      roughness: 0.35,
      metalness: 0.05,
    })
  );

  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe8b23a,
      emissive: 0x543400,
      emissiveIntensity: 0.22,
      roughness: 0.3,
      metalness: 0.72,
    })
  );

  const tavernSignMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tavernSignTex,
      roughness: 0.62,
      metalness: 0.05,
    })
  );

  const shipHullMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6f4324,
      roughness: 0.78,
      metalness: 0.05,
    })
  );

  const shipDeckMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xba8f5c,
      roughness: 0.84,
      metalness: 0.04,
    })
  );

  const sailMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: sailTex,
      roughness: 0.78,
      metalness: 0.02,
    })
  );

  const rockMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x9b6b45,
      roughness: 0.92,
      metalness: 0.04,
    })
  );

  // 1. Curved Horseshoe Island Terrain Mesh projected onto Globe Sphere
  {
    const segs = 176;
    const plane = trackGeo(
      new THREE.PlaneGeometry(CACTUS_WORLD_SIZE, CACTUS_WORLD_SIZE, segs, segs)
    );
    plane.rotateX(-Math.PI / 2);
    const pos = plane.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const ly = sampleCactusHeight(lx, lz);
      const sp = toCactusSphereLocal(lx, ly, lz, globeRadius);
      pos.setXYZ(i, sp.x, sp.y, sp.z);
    }
    plane.computeVertexNormals();
    plane.computeBoundingSphere();
    group.add(new THREE.Mesh(plane, terrainMat));
  }

  // 2. Six Giant Half-Buried Ribbed Cactus Cemeteries + Stacked Arm Lobes
  for (const giant of CACTUS_GIANTS) {
    const cactusGroup = new THREE.Group();
    const domeMesh = new THREE.Mesh(
      trackGeo(buildRibbedDomeGeo(giant)),
      cactusMat
    );
    cactusGroup.add(domeMesh);

    for (const lobe of giant.lobes) {
      const lobeMesh = new THREE.Mesh(
        trackGeo(buildRibbedLobeGeo(lobe)),
        cactusMat
      );
      lobeMesh.position.set(lobe.ox, lobe.oy, lobe.oz);
      cactusGroup.add(lobeMesh);
    }

    placeOnSphere(cactusGroup, giant.x, giant.centerY, giant.z, 0);
    group.add(cactusGroup);
  }

  // 3. Hundreds of Instanced Wooden Grave Crosses strictly ON the Giant Cacti
  if (CACTUS_CROSSES.length > 0) {
    // Anchor base deep at y = -1.10 so every cross embeds solidly into cactus ribs even on steep flanks
    const crossGeo = trackGeo(
      mergeSimpleBoxGeometries([
        { w: 0.17, h: 2.25, d: 0.13, x: 0, y: 0.02, z: 0 },
        { w: 0.96, h: 0.17, d: 0.13, x: 0, y: 0.76, z: 0 },
      ])
    );
    const crossInstanced = new THREE.InstancedMesh(
      crossGeo,
      crossMat,
      CACTUS_CROSSES.length
    );
    for (let i = 0; i < CACTUS_CROSSES.length; i++) {
      const cr = CACTUS_CROSSES[i];
      const sp = toCactusSphereLocal(cr.x, cr.y, cr.z, globeRadius);
      _dummy.position.set(sp.x, sp.y, sp.z);

      const sphereNorm = new THREE.Vector3(sp.x, sp.y + globeRadius, sp.z).normalize();
      const tilt = new THREE.Quaternion().setFromUnitVectors(_up, sphereNorm);
      _dirVec.set(cr.nx, cr.ny, cr.nz).normalize();
      const align = new THREE.Quaternion().setFromUnitVectors(_up, _dirVec);
      const rollQ = new THREE.Quaternion().setFromAxisAngle(_yAxis, cr.roll);

      _dummy.quaternion.copy(tilt).multiply(align).multiply(rollQ);
      _dummy.scale.setScalar(S * cr.scale);
      _dummy.updateMatrix();
      crossInstanced.setMatrixAt(i, _dummy.matrix);
      _tmpColor.setRGB(cr.woodTint, cr.woodTint * 0.94, cr.woodTint * 0.86);
      crossInstanced.setColorAt(i, _tmpColor);
    }
    crossInstanced.instanceMatrix.needsUpdate = true;
    if (crossInstanced.instanceColor) {
      crossInstanced.instanceColor.needsUpdate = true;
    }
    crossInstanced.computeBoundingSphere();
    group.add(crossInstanced);
  }

  // 4. Village Buildings (17 Houses + Golden Cupola Hall + Baroque Works Tavern)
  const wallMatCache = new Map<number, THREE.MeshStandardMaterial>();
  for (const b of CACTUS_BUILDINGS) {
    let wMat = wallMatCache.get(b.wallColor);
    if (!wMat) {
      wMat = trackMat(
        new THREE.MeshStandardMaterial({
          map: keepTex(createAdobePlasterTexture(b.wallColor)),
          roughness: 0.84,
          metalness: 0.02,
        })
      );
      wallMatCache.set(b.wallColor, wMat);
    }
    const buildingGroup = buildDesertBuilding(
      b,
      wMat,
      trimMat,
      woodMat,
      windowMat,
      doorMat,
      warmGlowMat,
      goldMat,
      tavernSignMat,
      trackGeo
    );
    placeOnSphere(buildingGroup, b.x, b.y, b.z, b.yaw);
    group.add(buildingGroup);
  }

  // 5. Harbor Piers, Waterfront Mooring Stakes (Image 4 & 5) & Moored Brigantine Ship
  const buildPier = (px: number, pz: number, yaw: number, dirSign: number) => {
    const pier = new THREE.Group();
    const deck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.4, 0.18, 2.0)),
      shipDeckMat
    );
    deck.position.set(dirSign * 1.4, 1.55, 0);
    pier.add(deck);

    const postGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.13, 2.4, 7));
    for (const [ox, oz] of [
      [-0.4, -0.8],
      [-0.4, 0.8],
      [dirSign * 1.5, -0.8],
      [dirSign * 1.5, 0.8],
      [dirSign * 3.3, -0.8],
      [dirSign * 3.3, 0.8],
    ]) {
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(ox, 0.85, oz);
      pier.add(post);
    }
    placeOnSphere(pier, px, 0.25, pz, yaw);
    group.add(pier);
  };
  buildPier(CACTUS_LANDMARKS.westPier.x, CACTUS_LANDMARKS.westPier.z, CACTUS_LANDMARKS.westPier.yaw, 1);
  buildPier(CACTUS_LANDMARKS.eastPier.x, CACTUS_LANDMARKS.eastPier.z, CACTUS_LANDMARKS.eastPier.yaw, -1);

  // Waterfront mooring posts / stakes along sandy west & east bay shores (Image 5)
  const stakePositions: [number, number, number][] = [];
  for (let i = 0; i < 42; i++) {
    const z = -12 + i * 1.15;
    const xW = -12.8 - ((i * 7) % 3) * 0.45;
    const hW = sampleCactusHeight(xW, z);
    if (hW > 1.2 && hW < 2.5) {
      stakePositions.push([xW, hW - 0.1, z]);
    }
    const xE = 11.4 + ((i * 5) % 3) * 0.45;
    const hE = sampleCactusHeight(xE, z);
    if (hE > 1.2 && hE < 2.5) {
      stakePositions.push([xE, hE - 0.1, z]);
    }
  }
  if (stakePositions.length > 0) {
    const stakeGeo = trackGeo(new THREE.CylinderGeometry(0.07, 0.09, 0.95, 6));
    const stakesInst = new THREE.InstancedMesh(stakeGeo, woodMat, stakePositions.length);
    for (let i = 0; i < stakePositions.length; i++) {
      const [sx, sy, sz] = stakePositions[i];
      const sp = toCactusSphereLocal(sx, sy + 0.35, sz, globeRadius);
      _dummy.position.set(sp.x, sp.y, sp.z);
      const norm = new THREE.Vector3(sp.x, sp.y + globeRadius, sp.z).normalize();
      _dummy.quaternion.setFromUnitVectors(_up, norm);
      _dummy.scale.setScalar(S * (0.85 + (i % 3) * 0.14));
      _dummy.updateMatrix();
      stakesInst.setMatrixAt(i, _dummy.matrix);
    }
    stakesInst.instanceMatrix.needsUpdate = true;
    stakesInst.computeBoundingSphere();
    group.add(stakesInst);
  }

  // Moored Harbor Ship gently bobbing in the bay
  const shipGroup = buildHarborShip(
    shipHullMat,
    shipDeckMat,
    sailMat,
    goldMat,
    trackGeo
  );
  const shipBase = toCactusSphereLocal(
    CACTUS_LANDMARKS.mooredShip.x,
    1.15,
    CACTUS_LANDMARKS.mooredShip.z,
    globeRadius
  );
  const shipNorm = new THREE.Vector3(
    shipBase.x,
    shipBase.y + globeRadius,
    shipBase.z
  ).normalize();
  const shipBaseQuat = new THREE.Quaternion()
    .setFromUnitVectors(_up, shipNorm)
    .multiply(new THREE.Quaternion().setFromAxisAngle(_yAxis, CACTUS_LANDMARKS.mooredShip.yaw));
  shipGroup.position.set(shipBase.x, shipBase.y, shipBase.z);
  shipGroup.quaternion.copy(shipBaseQuat);
  shipGroup.scale.setScalar(S);
  group.add(shipGroup);

  // 6. Instanced Desert Boulders along Plateau & Cliff Bases
  if (CACTUS_ROCKS.length > 0) {
    const rockGeo = trackGeo(new THREE.DodecahedronGeometry(1.0, 0));
    const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, CACTUS_ROCKS.length);
    for (let i = 0; i < CACTUS_ROCKS.length; i++) {
      const r = CACTUS_ROCKS[i];
      const sp = toCactusSphereLocal(r.x, r.y, r.z, globeRadius);
      _dummy.position.set(sp.x, sp.y, sp.z);
      const norm = new THREE.Vector3(sp.x, sp.y + globeRadius, sp.z).normalize();
      const tilt = new THREE.Quaternion().setFromUnitVectors(_up, norm);
      const rot = new THREE.Quaternion().setFromAxisAngle(_yAxis, r.yaw);
      _dummy.quaternion.copy(tilt).multiply(rot);
      _dummy.scale.set(r.scaleX * S, r.scaleY * S, r.scaleZ * S);
      _dummy.updateMatrix();
      rockInst.setMatrixAt(i, _dummy.matrix);
      _tmpColor.setRGB(r.tint, r.tint * 0.88, r.tint * 0.76);
      rockInst.setColorAt(i, _tmpColor);
    }
    rockInst.instanceMatrix.needsUpdate = true;
    if (rockInst.instanceColor) {
      rockInst.instanceColor.needsUpdate = true;
    }
    rockInst.computeBoundingSphere();
    group.add(rockInst);
  }

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      const bob = Math.sin(elapsed * 1.4) * 0.08 * S;
      shipGroup.position.set(
        shipBase.x + shipNorm.x * bob,
        shipBase.y + shipNorm.y * bob,
        shipBase.z + shipNorm.z * bob
      );
      const roll = Math.sin(elapsed * 1.1) * 0.035;
      shipGroup.quaternion
        .copy(shipBaseQuat)
        .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll));
    },
  };
}
