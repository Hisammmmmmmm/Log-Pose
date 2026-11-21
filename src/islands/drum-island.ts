import * as THREE from 'three';
import {
  DRUM_BUILDINGS,
  DRUM_GLOBE_SCALE,
  DRUM_ICE_FLOES,
  DRUM_LAKE_ICE_Y,
  DRUM_LANDMARKS,
  DRUM_ROPEWAY_SPANS,
  DRUM_TOWERS,
  DRUM_TREES,
  DRUM_WORLD_SIZE,
  drumFrozenLakeSignedDist,
  drumHarborSignedDist,
  drumRoadSignedDist,
  sampleDrumHeight,
  toDrumSphereLocal,
  type DrumBuildingSpec,
  type DrumTowerSpec,
} from '../utils/drumTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = DRUM_GLOBE_SCALE;
const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);
const _yAxis = new THREE.Vector3(0, 1, 0);
const _tangent = new THREE.Vector3();

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

function createDrumTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = DRUM_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * DRUM_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * DRUM_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const h = sampleDrumHeight(x, z);
      const hx = sampleDrumHeight(x + 0.9, z);
      const hz = sampleDrumHeight(x, z + 0.9);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 1.1, 0, 1);
      const grain = (valueNoise2D(x * 1.4, z * 1.4) - 0.5) * 10;
      const drift = valueNoise2D(x * 0.14 + 2.3, z * 0.14 - 3.1);

      let rgb: [number, number, number] = [235, 243, 250];
      let alpha = 0;

      if (h < -3.5) {
        alpha = smoothstep(-5.0, -3.5, h);
        rgb = [88, 138, 168];
      } else {
        alpha = 1;
        // Icy shoal -> dark slate rocky winter beach -> sparkling white snow -> rocky foothills
        const shallowT = smoothstep(-3.5, 0.2, h);
        const snowBeachT = smoothstep(0.2, 1.55, h);
        const shoalCol = mixRgb([76, 134, 166], [116, 132, 146], shallowT);
        const snowCol = mixRgb([228, 238, 248], [244, 249, 255], drift * 0.8);
        rgb = mixRgb(shoalCol, snowCol, snowBeachT);

        // Exposed craggy alpine slate & brownish rock on steep foothills
        const rockSlopeT = smoothstep(0.28, 0.62, slope) * smoothstep(2.2, 5.2, h);
        if (rockSlopeT > 0.01) {
          const strata = Math.sin(h * 2.5 + valueNoise2D(x * 0.25, z * 0.25) * 2.0) * 12;
          const rockCol: [number, number, number] = [
            118 + strata,
            108 + strata * 0.85,
            102 + strata * 0.7,
          ];
          rgb = mixRgb(rgb, rockCol, rockSlopeT * 0.92);
        }

        // Great Frozen Lake (translucent pale-cyan ice with frosted rim & subtle fracture veins)
        const lakeSd = drumFrozenLakeSignedDist(x, z);
        if (lakeSd < 1.4 && h > 1.2) {
          const iceFactor = 1 - smoothstep(-0.9, 1.4, lakeSd);
          const vein = Math.abs(
            Math.sin(x * 0.38 + z * 0.24 + valueNoise2D(x * 0.2, z * 0.2) * 3.5)
          );
          const crackHighlight = vein < 0.09 ? 18 : 0;
          const iceCol = mixRgb([154, 206, 232], [198, 232, 248], drift * 0.7);
          const rimFrost = smoothstep(-1.4, 0.8, lakeSd);
          const finalIce: [number, number, number] = [
            clamp(iceCol[0] + crackHighlight + rimFrost * 28, 0, 255),
            clamp(iceCol[1] + crackHighlight + rimFrost * 22, 0, 255),
            clamp(iceCol[2] + crackHighlight + rimFrost * 12, 0, 255),
          ];
          rgb = mixRgb(rgb, finalIce, iceFactor * 0.96);
        }

        // Clear readable packed-snow & timber-dusted roads connecting Bighorn, Cocoa Weed, Lake, Hiluluk & Robelle
        const rDist = drumRoadSignedDist(x, z);
        const harborSd = drumHarborSignedDist(x, z);
        if (rDist < 0.75 && h > 1.3 && harborSd > 0.5 && lakeSd > 0.8) {
          const curbT =
            smoothstep(-0.1, 0.28, rDist) * (1 - smoothstep(0.28, 0.75, rDist));
          const roadT = 1 - smoothstep(-0.25, 0.35, rDist);
          const slush = (valueNoise2D(x * 2.2, z * 2.2) - 0.5) * 14;
          rgb = mixRgb(rgb, [164, 174, 186], curbT * 0.72);
          rgb = mixRgb(
            rgb,
            [205 + slush, 212 + slush, 222 + slush],
            roadT * 0.9
          );
        }
      }

      data[idx] = clamp(Math.round(rgb[0] + (h > 0.6 ? grain : 0)), 0, 255);
      data[idx + 1] = clamp(Math.round(rgb[1] + (h > 0.6 ? grain : 0)), 0, 255);
      data[idx + 2] = clamp(Math.round(rgb[2] + (h > 0.6 ? grain : 0)), 0, 255);
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

function createDrumRockieCliffTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let py = 0; py < size; py++) {
    const v = py / (size - 1); // 0 = top rim, 1 = foothill base
    for (let px = 0; px < size; px++) {
      const u = px / size;
      const ang = u * Math.PI * 2;
      // Seamless horizontal cylindrical coordinates for noise sampling
      const nx = Math.cos(ang) * 2.4;
      const nz = Math.sin(ang) * 2.4;

      // Vertical fluted rock crevices & organic basalt striations (no artificial plaid!)
      const flute =
        (valueNoise2D(nx * 3.8 + 1.2, nz * 3.8 - 2.1 + v * 1.4) - 0.5) * 32 +
        (valueNoise2D(nx * 8.5 - 3.4, nz * 8.5 + 1.7 + v * 2.2) - 0.5) * 18;
      // Subtle weathered horizontal sedimentary cliff ledges
      const strataWave = valueNoise2D(nx * 2.0 + 4.1, nz * 2.0 + v * 5.0);
      const strata = Math.sin(v * 34.0 + strataWave * 3.2) * 8;
      const micro = (valueNoise2D(nx * 14.0 + v * 12.0, nz * 14.0 - v * 9.0) - 0.5) * 14;

      // Warm-brownish alpine cliff rock darkening inside crevices & frosted toward base/top
      let r = 136 + flute + strata + micro;
      let g = 117 + flute * 0.9 + strata * 0.85 + micro;
      let b = 102 + flute * 0.8 + strata * 0.75 + micro;

      const topFrost = smoothstep(0.08, 0.0, v) * 0.45;
      const baseSnow = smoothstep(0.84, 0.99, v) * 0.78;
      const frost = clamp(topFrost + baseSnow, 0, 1);
      r = r * (1 - frost) + 226 * frost;
      g = g * (1 - frost) + 236 * frost;
      b = b * (1 - frost) + 246 * frost;

      const idx = (py * size + px) * 4;
      data[idx] = clamp(Math.round(r), 0, 255);
      data[idx + 1] = clamp(Math.round(g), 0, 255);
      data[idx + 2] = clamp(Math.round(b), 0, 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createBighornBrickTexture(baseHex: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const c = new THREE.Color(baseHex);
  ctx.fillStyle = `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
  ctx.fillRect(0, 0, 256, 256);

  // Horizontal brick mortar lines & staggered vertical joints (Image 4)
  ctx.fillStyle = 'rgba(72, 42, 38, 0.25)';
  const rows = 10;
  const rowH = 256 / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    ctx.fillRect(0, y, 256, 2);
    const offset = (r % 2) * 24;
    for (let x = offset; x < 256; x += 48) {
      ctx.fillRect(x, y, 2, rowH);
    }
  }

  // Lower snow dusting at base
  const snowGrad = ctx.createLinearGradient(0, 195, 0, 256);
  snowGrad.addColorStop(0, 'rgba(240, 247, 255, 0)');
  snowGrad.addColorStop(1, 'rgba(240, 247, 255, 0.42)');
  ctx.fillStyle = snowGrad;
  ctx.fillRect(0, 195, 256, 61);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createHilulukFlagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 172;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Black pirate banner with Dr. Hiluluk's iconic skull + pink sakura petals!
  ctx.fillStyle = '#12151c';
  ctx.fillRect(0, 0, 256, 172);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 164);

  // Crossed bones
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(64, 46);
  ctx.lineTo(192, 134);
  ctx.moveTo(192, 46);
  ctx.lineTo(64, 134);
  ctx.stroke();

  // Skull
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(128, 76, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(110, 96, 36, 20);

  // Eyes & smile
  ctx.fillStyle = '#12151c';
  ctx.beginPath();
  ctx.arc(116, 76, 6.5, 0, Math.PI * 2);
  ctx.arc(140, 76, 6.5, 0, Math.PI * 2);
  ctx.fill();

  // Floating pink Sakura cherry blossom petals around skull
  ctx.fillStyle = '#f472b6';
  const petals: readonly [number, number, number][] = [
    [48, 36, 0.3],
    [205, 34, -0.4],
    [42, 118, 0.6],
    [212, 122, -0.5],
    [128, 28, 0.1],
    [92, 138, -0.3],
    [164, 140, 0.4],
  ];
  for (const [px, py, rot] of petals) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createCastleMasonryTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#d9e5f0';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = 'rgba(116, 138, 162, 0.22)';
  for (let y = 0; y < 256; y += 22) {
    ctx.fillRect(0, y, 256, 2);
    const off = ((y / 22) % 2) * 20;
    for (let x = off; x < 256; x += 40) {
      ctx.fillRect(x, y, 2, 22);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Builds one cylindrical Drum Rockie fluted rock shaft rising from below foothill ground
 * up to `tower.height`, with outward triangle winding (a, c, b, b, c, d).
 */
function buildDrumRockieGeo(tower: DrumTowerSpec): THREE.BufferGeometry {
  const segU = 42;
  const segV = 14;
  const baseY = Math.max(0.5, tower.groundY - 4.0);
  const topY = tower.height;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const vFrac = iv / segV;
    const y = baseY + vFrac * (topY - baseY);
    // Flared rugged talus at the base rising to crisp cylindrical rock shaft
    const flare = Math.pow(1 - vFrac, 2.2);
    const rBase = tower.topRadius + (tower.baseRadius - tower.topRadius) * flare;

    for (let iu = 0; iu <= segU; iu++) {
      const uFrac = iu / segU;
      const theta = uFrac * Math.PI * 2;
      const flute =
        Math.sin(theta * 14 + tower.x * 0.2) * 0.42 +
        Math.cos(theta * 23 - tower.z * 0.2) * 0.24 +
        (valueNoise2D(Math.cos(theta) * 2.5 + tower.x, vFrac * 4.5 + tower.z) - 0.5) * 0.9;
      const r = rBase + flute * (0.65 + flare * 0.65);

      positions.push(Math.cos(theta) * r, y, Math.sin(theta) * r);
      uvs.push(uFrac * 2, vFrac);
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

/**
 * Continuous sculpted overhanging snow mantle sitting atop each Drum Rockie (Image 1 & 2),
 * draping smoothly over the rim into multi-harmonic scalloped snow tongues (zero detached blobs).
 */
function buildDrumSnowCap(
  tower: DrumTowerSpec,
  snowMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const capGroup = new THREE.Group();
  const topR = tower.topRadius * 1.035;
  const segU = 64;

  // 1. Flat/gently crowned snowy plateau disc on top
  const plateau = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(topR * 0.99, topR * 1.02, 0.95, segU)),
    snowMat
  );
  plateau.position.y = tower.height + 0.05;
  capGroup.add(plateau);

  // 2. Continuous draped scalloped snow-skirt mantle wrapping seamlessly around the top cliff edge
  const segV = 7;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const vFrac = iv / segV; // 0 = plateau rim, 1 = scalloped snow curtain tip
    // Outward bulge near lip, tapering cleanly back toward cliff wall at bottom
    const bulge = Math.sin(vFrac * Math.PI) * 0.42 - vFrac * 0.32;

    for (let iu = 0; iu <= segU; iu++) {
      const theta = (iu / segU) * Math.PI * 2;
      const flute =
        Math.sin(theta * 14 + tower.x * 0.2) * 0.34 +
        Math.cos(theta * 23 - tower.z * 0.2) * 0.18;
      // Multi-frequency continuous scalloped snow curtain depth
      const hang =
        3.2 +
        Math.sin(theta * 7 + tower.x * 0.15) * 1.45 +
        Math.cos(theta * 13 - tower.z * 0.15) * 0.92 +
        Math.sin(theta * 21 + tower.x * 0.4) * 0.45;

      const r = topR + flute * (1 - vFrac * 0.35) + bulge + 0.36;
      const y = tower.height + 0.55 - Math.pow(vFrac, 1.12) * hang;
      positions.push(Math.cos(theta) * r, y, Math.sin(theta) * r);
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * (segU + 1) + iu;
      const b = a + 1;
      const c = a + (segU + 1);
      const d = c + 1;
      // Outward winding (a -> c -> b, b -> c -> d)
      indices.push(a, c, b, b, c, d);
    }
  }

  const skirtGeo = new THREE.BufferGeometry();
  skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  skirtGeo.setIndex(indices);
  skirtGeo.computeVertexNormals();
  skirtGeo.computeBoundingSphere();
  capGroup.add(new THREE.Mesh(trackGeo(skirtGeo), snowMat));

  return capGroup;
}

/**
 * Builds Drum Castle (Château de Drum) perched atop the central Drum Rockie (Image 3).
 */
function buildDrumCastle(
  castleWallMat: THREE.Material,
  tealRoofMat: THREE.Material,
  snowMat: THREE.Material,
  slateWinMat: THREE.Material,
  warmGlowMat: THREE.Material,
  woodMat: THREE.Material,
  metalMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const castle = new THREE.Group();

  // Base courtyard terrace plinth (on top of rockie-castle y = 55.0)
  const terrace = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(14.5, 15.0, 0.7, 32)),
    castleWallMat
  );
  terrace.position.y = 0.35;
  castle.add(terrace);

  // Outer battlements wall ring (open arched gate facing South +Z toward Castle Esplanade!)
  const wallBack = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(17.2, 4.2, 1.6)),
    castleWallMat
  );
  wallBack.position.set(0, 2.5, -7.2);
  const wallWest = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.6, 4.2, 13.0)),
    castleWallMat
  );
  wallWest.position.set(-8.0, 2.5, -1.2);
  const wallEast = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.6, 4.2, 13.0)),
    castleWallMat
  );
  wallEast.position.set(8.0, 2.5, -1.2);

  // Front South Gatehouse Curtain, Stepped Gate Pediment & Arched Wooden Gate (Image 3 lower foreground)
  const gateL = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.6, 4.5, 1.7)),
    castleWallMat
  );
  gateL.position.set(-4.8, 2.6, 4.8);
  const gateR = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.6, 4.5, 1.7)),
    castleWallMat
  );
  gateR.position.set(4.8, 2.6, 4.8);
  const gateBridge = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.6, 2.2, 1.7)),
    castleWallMat
  );
  gateBridge.position.set(0, 3.85, 4.8);
  const gateGableStep1 = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.4, 1.35, 1.4)),
    castleWallMat
  );
  gateGableStep1.position.set(0, 5.4, 4.8);
  const gateGableStep2 = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.6, 1.2, 1.4)),
    castleWallMat
  );
  gateGableStep2.position.set(0, 6.5, 4.8);
  const gateDoor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.6, 2.8, 0.35)),
    woodMat
  );
  gateDoor.position.set(0, 1.75, 4.85);
  castle.add(
    wallBack,
    wallWest,
    wallEast,
    gateL,
    gateR,
    gateBridge,
    gateGableStep1,
    gateGableStep2,
    gateDoor
  );

  // Gatehouse corbelled bartizans (Image 3 lower portal towers)
  for (const bx of [-2.45, 2.45]) {
    const bartizan = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.55, 0.42, 2.5, 10)),
      castleWallMat
    );
    bartizan.position.set(bx, 4.9, 5.45);
    const bCap = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.68, 1.25, 10)),
      tealRoofMat
    );
    bCap.position.set(bx, 6.75, 5.45);
    castle.add(bartizan, bCap);
  }

  // Main Palas / Central Keep (Neuschwanstein-style stepped gable hall matching Image 3!)
  const keep = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(10.8, 9.8, 7.6)),
    castleWallMat
  );
  keep.position.set(0, 5.3, -3.2);
  castle.add(keep);

  // Neuschwanstein Stepped Front Gable & Snow Ridge on Keep (Image 3 upper center!)
  for (let s = 0; s < 3; s++) {
    const gw = 8.4 - s * 2.4;
    const step = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(gw, 1.45, 0.7)),
      castleWallMat
    );
    step.position.set(0, 10.6 + s * 1.25, 0.5);
    const stepSnow = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(gw + 0.16, 0.36, 0.85)),
      snowMat
    );
    stepSnow.position.set(0, 11.4 + s * 1.25, 0.5);
    castle.add(step, stepSnow);
  }

  // Steep turquoise-teal snow-dusted keep roof
  const keepRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(7.3, 4.4, 4)),
    tealRoofMat
  );
  keepRoof.rotation.y = Math.PI * 0.25;
  keepRoof.position.set(0, 12.2, -3.2);
  const keepRoofSnow = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(5.5, 2.6, 4)),
    snowMat
  );
  keepRoofSnow.rotation.y = Math.PI * 0.25;
  keepRoofSnow.position.set(0, 13.1, -3.2);
  castle.add(keepRoof, keepRoofSnow);

  // Rows of arched dark-blue & warm-glowing castle windows on front & gatehouse
  const winGeo = trackGeo(new THREE.BoxGeometry(0.76, 1.18, 0.2));
  for (let row = 0; row < 3; row++) {
    for (let col = -3; col <= 3; col++) {
      if (col === 0 && row === 0) continue;
      const isLit = (row + Math.abs(col)) % 3 === 0;
      const win = new THREE.Mesh(winGeo, isLit ? warmGlowMat : slateWinMat);
      win.position.set(col * 1.28, 4.3 + row * 2.1, 0.66);
      castle.add(win);
    }
  }
  for (const gx of [-4.8, -3.4, 3.4, 4.8]) {
    const gWin = new THREE.Mesh(winGeo, slateWinMat);
    gWin.position.set(gx, 3.2, 5.66);
    castle.add(gWin);
  }

  // Tall Central Watchtower Spire + Corner Turrets with Turquoise Conical Roofs & Snow Caps (Image 3)
  const turretSpecs: readonly [number, number, number, number, number][] = [
    [2.8, -5.6, 1.5, 19.2, 4.8], // Towering main spire keep (Image 3 upper-right!)
    [-5.8, 4.6, 1.65, 9.6, 3.8], // Front-left gate turret
    [5.8, 4.6, 1.65, 9.6, 3.8], // Front-right gate turret
    [-7.8, -6.8, 1.8, 11.8, 4.2], // Rear-left bastion tower
    [7.8, -6.8, 1.8, 11.8, 4.2], // Rear-right bastion tower
    [-5.5, 0.2, 1.18, 11.2, 3.3], // Keep flank bartizan West
    [5.6, 0.4, 1.18, 12.0, 3.4], // Keep flank bartizan East
  ];

  for (const [tx, tz, rad, th, roofH] of turretSpecs) {
    const shaft = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(rad * 0.94, rad, th, 14)),
      castleWallMat
    );
    shaft.position.set(tx, th * 0.5 + 0.4, tz);

    const corbel = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(rad * 1.14, rad * 0.96, 0.78, 14)),
      castleWallMat
    );
    corbel.position.set(tx, th + 0.4, tz);

    const spire = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(rad * 1.22, roofH, 14)),
      tealRoofMat
    );
    spire.position.set(tx, th + 0.78 + roofH * 0.5, tz);

    const spireSnow = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(rad * 0.86, roofH * 0.62, 14)),
      snowMat
    );
    spireSnow.position.set(tx, th + 0.78 + roofH * 0.68, tz);

    const finial = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.05, 0.08, 1.3, 6)),
      metalMat
    );
    finial.position.set(tx, th + 0.78 + roofH + 0.5, tz);

    castle.add(shaft, corbel, spire, spireSnow, finial);
  }

  // Ropeway Summit Boarding Cantilever Platforms tucked on East & West cliff flanks
  const platGeo = trackGeo(new THREE.BoxGeometry(3.0, 0.45, 2.6));
  const platE = new THREE.Mesh(platGeo, woodMat);
  platE.position.set(13.0, 0.8, 2.0);
  const platW = new THREE.Mesh(platGeo, woodMat);
  platW.position.set(-13.0, 0.8, 2.4);
  castle.add(platE, platW);

  return castle;
}

/**
 * Builds each distinct Drum Island building typology cleanly pivoted at bottom-center (y = 0):
 * - Bighorn Round Brick House with Snow-Ringed Olive Conical Roof (Image 4!)
 * - Cocoa Weed Winter Timber Cottage
 * - Robelle Narrow Steep-Gable Wooden Building
 * - Dr. Hiluluk's Isolated Clinic Cabin + Sakura Jolly Roger Flag
 * - Ropeway Terminus Station + Bullwheel Gantry
 */
function buildDrumBuilding(
  spec: DrumBuildingSpec,
  brickMat: THREE.Material,
  woodMat: THREE.Material,
  darkTimberMat: THREE.Material,
  oliveRoofMat: THREE.Material,
  tealRoofMat: THREE.Material,
  snowMat: THREE.Material,
  windowMat: THREE.Material,
  warmGlowMat: THREE.Material,
  copperMat: THREE.Material,
  hilulukFlagMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const g = new THREE.Group();

  if (spec.kind === 'bighorn-round') {
    const r = spec.radius;
    const wh = spec.wallHeight;
    const rh = spec.roofHeight;

    // Cylindrical terracotta-brick wall & stone base plinth (Image 4)
    const plinth = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(r * 1.04, r * 1.09, 1.6, 20)),
      darkTimberMat
    );
    plinth.position.y = -0.45;
    const wall = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(r, r * 1.02, wh, 20)),
      brickMat
    );
    wall.position.y = 0.3 + wh * 0.5;
    g.add(plinth, wall);

    // Tall olive-green conical roof with 4 white snow rings & copper finial (exact match Image 4!)
    const cone = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(r * 1.14, rh, 20)),
      oliveRoofMat
    );
    cone.position.y = 0.3 + wh + rh * 0.5 - 0.1;
    g.add(cone);

    for (let ringIdx = 0; ringIdx < 4; ringIdx++) {
      const frac = 0.12 + ringIdx * 0.22;
      const ringR = r * 1.14 * (1 - frac) + 0.06;
      const ring = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(ringR, 0.13 - ringIdx * 0.015, 6, 20)),
        snowMat
      );
      ring.rotation.x = Math.PI * 0.5;
      ring.position.y = 0.3 + wh + rh * frac - 0.05;
      g.add(ring);
    }

    // Peak amber/copper finial ornament (Image 4)
    const finialStem = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.11, 0.15, 0.55, 8)),
      copperMat
    );
    finialStem.position.y = 0.3 + wh + rh + 0.12;
    const finialOrb = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.22, 10, 8)),
      copperMat
    );
    finialOrb.position.y = 0.3 + wh + rh + 0.45;
    g.add(finialStem, finialOrb);

    // Projecting front gabled vestibule + wooden door + snow cap (Image 4)
    const porch = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.55, wh * 0.72, 0.95)),
      brickMat
    );
    porch.position.set(0, wh * 0.36 + 0.25, r * 0.82);
    const porchRoof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.15, 1.05, 4)),
      snowMat
    );
    porchRoof.rotation.y = Math.PI * 0.25;
    porchRoof.position.set(0, wh * 0.72 + 0.68, r * 0.82);
    const door = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.78, 1.55, 0.12)),
      woodMat
    );
    door.position.set(0, 1.0, r * 0.82 + 0.48);
    g.add(porch, porchRoof, door);

    // Blue-slate paned windows around the curved brick facade
    const winGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.72, 0.14));
    for (const ang of [-1.1, 1.1, 2.75]) {
      const win = new THREE.Mesh(winGeo, windowMat);
      win.position.set(
        Math.sin(ang) * (r + 0.01),
        wh * 0.55 + 0.2,
        Math.cos(ang) * (r + 0.01)
      );
      win.rotation.y = ang;
      g.add(win);
    }

    // Brick chimney with snow lip
    const chim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.45, 1.4, 0.45)),
      brickMat
    );
    chim.position.set(-r * 0.42, wh + 1.1, -r * 0.35);
    g.add(chim);
    return g;
  }

  // Timber & stone pitched-roof buildings (Cocoa Weed, Robelle, Hiluluk Cabin, Ropeway Station)
  const w = spec.width;
  const d = spec.depth;
  const wh = spec.wallHeight;
  const rh = spec.roofHeight;
  const isRobelle = spec.kind === 'robelle-wood';
  const isHiluluk = spec.kind === 'hiluluk-cabin';
  const isStation = spec.kind === 'ropeway-station';

  const bodyMat = isRobelle || isHiluluk ? woodMat : brickMat;
  const foundation = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(w + 0.35, 2.0, d + 0.35)),
    darkTimberMat
  );
  foundation.position.y = -0.82;
  const body = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(w, wh, d)),
    bodyMat
  );
  body.position.y = wh * 0.5 + 0.15;
  g.add(foundation, body);

  // Dark exposed timber corner posts & cross beams (distinct look for Robelle & Hiluluk)
  if (isRobelle || isHiluluk || isStation) {
    const postGeo = trackGeo(new THREE.BoxGeometry(0.22, wh + 0.15, 0.22));
    for (const sx of [-w * 0.48, w * 0.48]) {
      for (const sz of [-d * 0.48, d * 0.48]) {
        const post = new THREE.Mesh(postGeo, darkTimberMat);
        post.position.set(sx, wh * 0.5 + 0.15, sz);
        g.add(post);
      }
    }
  }

  // Steep pitched winter roof + thick snow cap
  const roofBaseMat = isStation ? tealRoofMat : darkTimberMat;
  const roof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(Math.max(w, d) * 0.78, rh, 4)),
    roofBaseMat
  );
  roof.rotation.y = Math.PI * 0.25;
  roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
  roof.position.y = wh + 0.15 + rh * 0.5 - 0.12;
  g.add(roof);

  const roofSnow = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(Math.max(w, d) * 0.72, rh * 0.88, 4)),
    snowMat
  );
  roofSnow.rotation.y = Math.PI * 0.25;
  roofSnow.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
  roofSnow.position.y = wh + 0.34 + rh * 0.5;
  g.add(roofSnow);

  // Door & glowing amber windows
  const door = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.88, 1.75, 0.12)),
    darkTimberMat
  );
  door.position.set(0, 1.0, d * 0.5 + 0.03);
  g.add(door);

  const winMat = isHiluluk || isStation || isRobelle ? warmGlowMat : windowMat;
  const winGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.76, 0.1));
  for (const wx of [-w * 0.3, w * 0.3]) {
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(wx, wh * 0.58 + 0.15, d * 0.5 + 0.03);
    g.add(win);
  }

  // Chimney
  const chimney = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.48, 1.55, 0.48)),
    brickMat
  );
  chimney.position.set(-w * 0.28, wh + rh * 0.68, -d * 0.18);
  g.add(chimney);

  // Dr. Hiluluk's iconic Sakura Jolly Roger Flagpole & Timber Porch
  if (isHiluluk) {
    const porchDeck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(w * 0.9, 0.22, 1.35)),
      darkTimberMat
    );
    porchDeck.position.set(0, 0.18, d * 0.5 + 0.65);
    const pole = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.08, 0.1, 6.2, 8)),
      darkTimberMat
    );
    pole.position.set(w * 0.45, 3.1, d * 0.5 + 0.9);
    const flag = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.15, 1.35, 0.05)),
      hilulukFlagMat
    );
    flag.position.set(w * 0.45 + 1.1, 5.4, d * 0.5 + 0.9);
    g.add(porchDeck, pole, flag);
  }

  // Ropeway Lower Terminus Station Bullwheel Tower & Boarding Deck (north of Cocoa Weed on Frozen Lake!)
  if (isStation) {
    const gantry = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.4, 2.2, 2.4)),
      darkTimberMat
    );
    gantry.position.set(0, wh + 1.1, -d * 0.38);
    const wheel = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.3, 1.3, 0.26, 16)),
      copperMat
    );
    wheel.position.set(0, wh + 2.25, -d * 0.38);
    const dockDeck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(w + 1.4, 0.28, 2.2)),
      woodMat
    );
    dockDeck.position.set(0, 0.25, d * 0.5 + 1.0);
    const pilingGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.16, 2.4, 8));
    for (const px of [-(w + 0.8) * 0.45, 0, (w + 0.8) * 0.45]) {
      const piling = new THREE.Mesh(pilingGeo, darkTimberMat);
      piling.position.set(px, -0.85, d * 0.5 + 1.85);
      g.add(piling);
    }
    g.add(gantry, wheel, dockDeck);
  }

  return g;
}

function buildHarborShip(
  hullMat: THREE.Material,
  deckMat: THREE.Material,
  sailMat: THREE.Material,
  copperMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const ship = new THREE.Group();
  const hull = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.2, 1.05, 6.0)),
    hullMat
  );
  hull.position.y = 0.35;
  const prow = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(1.12, 2.0, 4)),
    hullMat
  );
  prow.rotation.x = Math.PI * 0.5;
  prow.rotation.y = Math.PI * 0.25;
  prow.position.set(0, 0.42, 3.8);
  const deck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.95, 0.14, 5.4)),
    deckMat
  );
  deck.position.y = 0.9;
  const mast = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.1, 0.13, 5.4, 8)),
    deckMat
  );
  mast.position.set(0, 3.5, 0.3);
  const sail = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.8, 2.4, 0.08)),
    sailMat
  );
  sail.position.set(0, 3.55, 0.36);
  const nest = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.4, 0.3, 0.38, 10)),
    copperMat
  );
  nest.position.set(0, 5.45, 0.3);
  ship.add(hull, prow, deck, mast, sail, nest);
  return ship;
}

export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance | null {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const group = new THREE.Group();
  group.name = 'DrumIsland';

  const keepTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;

  const placeOnSphere = (
    obj: THREE.Object3D,
    lx: number,
    ly: number,
    lz: number,
    yaw = 0
  ) => {
    const sp = toDrumSphereLocal(lx, ly, lz, globeRadius);
    obj.position.set(sp.x, sp.y, sp.z);
    const normal = new THREE.Vector3(sp.x, sp.y + globeRadius, sp.z).normalize();
    const tilt = new THREE.Quaternion().setFromUnitVectors(_up, normal);
    const rot = new THREE.Quaternion().setFromAxisAngle(_yAxis, yaw);
    obj.quaternion.copy(tilt).multiply(rot);
    obj.scale.setScalar(S);
  };

  // Procedural textures & PBR materials (768px terrain texture builds >2x faster while preserving 3.2 px/m sharpness)
  const terrainTex = keepTex(createDrumTerrainTexture(768));
  const rockieTex = keepTex(createDrumRockieCliffTexture());
  const castleTex = keepTex(createCastleMasonryTexture());
  const hilulukFlagTex = keepTex(createHilulukFlagTexture());

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.78,
      metalness: 0.03,
      transparent: true,
      alphaTest: 0.08,
    })
  );

  const iceLakeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x82cff2,
      emissive: 0x164a68,
      emissiveIntensity: 0.14,
      roughness: 0.11,
      metalness: 0.18,
      transparent: true,
      opacity: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );

  const rockieMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: rockieTex,
      roughness: 0.9,
      metalness: 0.04,
    })
  );

  const snowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4f8fc,
      roughness: 0.74,
      metalness: 0.02,
    })
  );

  const castleWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: castleTex,
      roughness: 0.76,
      metalness: 0.04,
    })
  );

  const tealRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x328a7f,
      roughness: 0.56,
      metalness: 0.16,
    })
  );

  const oliveRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c7046,
      roughness: 0.84,
      metalness: 0.02,
    })
  );

  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x865936,
      roughness: 0.84,
      metalness: 0.03,
    })
  );

  const darkTimberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4f3422,
      roughness: 0.88,
      metalness: 0.04,
    })
  );

  const windowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2f5378,
      roughness: 0.36,
      metalness: 0.18,
    })
  );

  const warmGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffd888,
      emissive: 0xff9a28,
      emissiveIntensity: 0.82,
      roughness: 0.35,
      metalness: 0.04,
    })
  );

  const copperMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd9923b,
      roughness: 0.34,
      metalness: 0.68,
    })
  );

  const cableMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2a3340,
      roughness: 0.45,
      metalness: 0.75,
    })
  );

  const pineFoliageMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x28543d,
      roughness: 0.86,
      metalness: 0.02,
    })
  );

  const seaIceMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6f3fc,
      roughness: 0.32,
      metalness: 0.06,
    })
  );

  const hilulukFlagMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: hilulukFlagTex,
      roughness: 0.7,
      metalness: 0.02,
    })
  );

  // 1. Sphere-Projected Winter Island Terrain Mesh
  {
    const segs = 184;
    const plane = trackGeo(
      new THREE.PlaneGeometry(DRUM_WORLD_SIZE, DRUM_WORLD_SIZE, segs, segs)
    );
    plane.rotateX(-Math.PI / 2);
    const pos = plane.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const ly = sampleDrumHeight(lx, lz);
      const sp = toDrumSphereLocal(lx, ly, lz, globeRadius);
      pos.setXYZ(i, sp.x, sp.y, sp.z);
    }
    plane.computeVertexNormals();
    plane.computeBoundingSphere();
    group.add(new THREE.Mesh(plane, terrainMat));
  }

  // Glossy Reflective Frozen Lake Ice Basin (north of Cocoa Weed, shaped to shoreline contour)
  {
    const lakePts: THREE.Vector2[] = [];
    const segs = 40;
    for (let i = 0; i < segs; i++) {
      const ang = (i / segs) * Math.PI * 2;
      const lobe =
        1.0 +
        Math.sin(ang * 3.0 + 0.5) * 0.09 +
        Math.cos(ang * 5.0 - 0.8) * 0.05;
      lakePts.push(
        new THREE.Vector2(
          Math.cos(ang) * 14.2 * lobe,
          Math.sin(ang) * 12.6 * lobe
        )
      );
    }
    const lakeShape = new THREE.Shape(lakePts);
    const lakeGeo = trackGeo(new THREE.ShapeGeometry(lakeShape));
    lakeGeo.rotateX(-Math.PI * 0.5);
    const lakeMesh = new THREE.Mesh(lakeGeo, iceLakeMat);
    const lakeWrap = new THREE.Group();
    lakeWrap.add(lakeMesh);
    placeOnSphere(
      lakeWrap,
      DRUM_LANDMARKS.frozenLakeCenter.x,
      DRUM_LAKE_ICE_Y + 0.12,
      DRUM_LANDMARKS.frozenLakeCenter.z,
      0
    );
    group.add(lakeWrap);
  }

  // 2. Six Towering Cylindrical Drum Rockies + Scalloped Snow Caps + Drum Castle
  for (const tower of DRUM_TOWERS) {
    const tGroup = new THREE.Group();
    const rockShaft = new THREE.Mesh(
      trackGeo(buildDrumRockieGeo(tower)),
      rockieMat
    );
    const snowCap = buildDrumSnowCap(tower, snowMat, trackGeo);
    tGroup.add(rockShaft, snowCap);

    if (tower.hasCastle) {
      const castle = buildDrumCastle(
        castleWallMat,
        tealRoofMat,
        snowMat,
        windowMat,
        warmGlowMat,
        woodMat,
        cableMat,
        trackGeo
      );
      castle.position.set(0, tower.height + 0.35, 0);
      tGroup.add(castle);
    }

    placeOnSphere(tGroup, tower.x, 0, tower.z, 0);
    group.add(tGroup);
  }

  // 3. Drum Ropeway (Téléphérique de Drum) Cables & Animated Gondola Cabins
  const gondolaMovers: {
    group: THREE.Group;
    curveA: THREE.CatmullRomCurve3;
    phase: number;
    speed: number;
  }[] = [];

  const ropewayGroup = new THREE.Group();
  for (let sIdx = 0; sIdx < DRUM_ROPEWAY_SPANS.length; sIdx++) {
    const span = DRUM_ROPEWAY_SPANS[sIdx];
    for (const lateralOffset of [-0.65, 0.65]) {
      const pts: THREE.Vector3[] = [];
      const dx = span.end[0] - span.start[0];
      const dz = span.end[2] - span.start[2];
      const len = Math.hypot(dx, dz) || 1;
      const perpX = (-dz / len) * lateralOffset;
      const perpZ = (dx / len) * lateralOffset;

      const steps = 16;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = span.start[0] + dx * t + perpX;
        const z = span.start[2] + dz * t + perpZ;
        const y =
          span.start[1] +
          (span.end[1] - span.start[1]) * t -
          Math.sin(t * Math.PI) * span.sag;
        const sp = toDrumSphereLocal(x, y, z, globeRadius);
        pts.push(new THREE.Vector3(sp.x, sp.y, sp.z));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const cable = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(curve, 24, 0.11 * S, 5, false)),
        cableMat
      );
      ropewayGroup.add(cable);

      // Add suspended gondola cabins on the first track of each span
      if (lateralOffset < 0) {
        for (let gIdx = 0; gIdx < span.gondolaCount; gIdx++) {
          const cab = new THREE.Group();
          const hanger = new THREE.Mesh(
            trackGeo(new THREE.BoxGeometry(0.16, 1.15, 0.16)),
            cableMat
          );
          hanger.position.y = -0.62;
          const cabinBox = new THREE.Mesh(
            trackGeo(new THREE.BoxGeometry(1.35, 1.1, 1.15)),
            woodMat
          );
          cabinBox.position.y = -1.6;
          const cabinRoof = new THREE.Mesh(
            trackGeo(new THREE.BoxGeometry(1.5, 0.22, 1.3)),
            snowMat
          );
          cabinRoof.position.y = -0.98;
          const cabWin = new THREE.Mesh(
            trackGeo(new THREE.BoxGeometry(1.4, 0.44, 0.7)),
            warmGlowMat
          );
          cabWin.position.y = -1.5;
          cab.add(hanger, cabinBox, cabinRoof, cabWin);
          cab.scale.setScalar(S);
          ropewayGroup.add(cab);

          gondolaMovers.push({
            group: cab,
            curveA: curve,
            phase: (gIdx + 0.35) / span.gondolaCount + sIdx * 0.21,
            speed: 0.032 + sIdx * 0.008,
          });
        }
      }
    }
  }
  group.add(ropewayGroup);

  // 4. All Village Buildings (Bighorn Round Houses, Cocoa Weed, Robelle Wood Town, Dr. Hiluluk's Clinic, Ropeway Terminus)
  const brickMatCache = new Map<number, THREE.MeshStandardMaterial>();
  for (const b of DRUM_BUILDINGS) {
    let bMat = brickMatCache.get(b.wallColor);
    if (!bMat) {
      bMat = trackMat(
        new THREE.MeshStandardMaterial({
          map: keepTex(createBighornBrickTexture(b.wallColor)),
          roughness: 0.84,
          metalness: 0.02,
        })
      );
      brickMatCache.set(b.wallColor, bMat);
    }
    const building = buildDrumBuilding(
      b,
      bMat,
      woodMat,
      darkTimberMat,
      oliveRoofMat,
      tealRoofMat,
      snowMat,
      windowMat,
      warmGlowMat,
      copperMat,
      hilulukFlagMat,
      trackGeo
    );
    placeOnSphere(building, b.x, b.y, b.z, b.yaw);
    group.add(building);
  }

  // Bighorn Street Wooden Picket Fences with Horizontal Rails (Image 4)
  {
    const leftPts: [number, number, number][] = [];
    const rightPts: [number, number, number][] = [];
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const fxL = -11.5 - t * 3.5;
      const fzL = 50.0 - t * 14.0;
      const hL = sampleDrumHeight(fxL, fzL);
      if (hL > 2.0) leftPts.push([fxL, hL - 0.05, fzL]);

      const fxR = -4.5 - t * 3.5;
      const fzR = 52.0 - t * 14.0;
      const hR = sampleDrumHeight(fxR, fzR);
      if (hR > 2.0) rightPts.push([fxR, hR - 0.05, fzR]);
    }
    const allPosts = [...leftPts, ...rightPts];
    if (allPosts.length > 0) {
      const postGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.78, 0.14));
      const fInst = new THREE.InstancedMesh(postGeo, woodMat, allPosts.length);
      for (let i = 0; i < allPosts.length; i++) {
        const [px, py, pz] = allPosts[i];
        const sp = toDrumSphereLocal(px, py + 0.36, pz, globeRadius);
        _dummy.position.set(sp.x, sp.y, sp.z);
        const norm = new THREE.Vector3(sp.x, sp.y + globeRadius, sp.z).normalize();
        _dummy.quaternion.setFromUnitVectors(_up, norm);
        _dummy.scale.setScalar(S);
        _dummy.updateMatrix();
        fInst.setMatrixAt(i, _dummy.matrix);
      }
      fInst.instanceMatrix.needsUpdate = true;
      fInst.computeBoundingSphere();
      group.add(fInst);

      // Add continuous 2-tier horizontal wooden rails between consecutive fence posts
      const buildFenceRails = (pts: [number, number, number][]) => {
        if (pts.length < 2) return;
        for (const railH of [0.28, 0.56]) {
          const curvePts = pts.map(([px, py, pz]) => {
            const sp = toDrumSphereLocal(px, py + railH, pz, globeRadius);
            return new THREE.Vector3(sp.x, sp.y, sp.z);
          });
          const railCurve = new THREE.CatmullRomCurve3(curvePts);
          const railMesh = new THREE.Mesh(
            trackGeo(new THREE.TubeGeometry(railCurve, 24, 0.055 * S, 4, false)),
            woodMat
          );
          group.add(railMesh);
        }
      };
      buildFenceRails(leftPts);
      buildFenceRails(rightPts);
    }
  }

  // 5. Harbor Pier & Moored Winter Ship in Southern Cove (Image 1 & 2)
  {
    const pier = new THREE.Group();
    const mainDeck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(6.8, 0.24, 2.4)),
      woodMat
    );
    mainDeck.position.set(0, 1.55, 1.5);
    const spurDeck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.2, 0.24, 4.8)),
      woodMat
    );
    spurDeck.position.set(2.3, 1.55, 3.8);
    pier.add(mainDeck, spurDeck);

    const postGeo = trackGeo(new THREE.CylinderGeometry(0.13, 0.15, 2.4, 7));
    for (const [px, pz] of [
      [-3.1, 0.6],
      [-3.1, 2.4],
      [0, 0.6],
      [0, 2.4],
      [3.1, 0.6],
      [3.1, 2.4],
      [1.4, 5.8],
      [3.2, 5.8],
    ]) {
      const post = new THREE.Mesh(postGeo, darkTimberMat);
      post.position.set(px, 0.85, pz);
      pier.add(post);
    }
    placeOnSphere(
      pier,
      DRUM_LANDMARKS.harborPier.x,
      0.25,
      DRUM_LANDMARKS.harborPier.z,
      DRUM_LANDMARKS.harborPier.yaw
    );
    group.add(pier);
  }

  const shipGroup = buildHarborShip(
    darkTimberMat,
    woodMat,
    snowMat,
    copperMat,
    trackGeo
  );
  const shipBase = toDrumSphereLocal(-2.2, 1.15, 70.0, globeRadius);
  const shipNorm = new THREE.Vector3(
    shipBase.x,
    shipBase.y + globeRadius,
    shipBase.z
  ).normalize();
  const shipBaseQuat = new THREE.Quaternion()
    .setFromUnitVectors(_up, shipNorm)
    .multiply(new THREE.Quaternion().setFromAxisAngle(_yAxis, Math.PI + 0.18));
  shipGroup.position.set(shipBase.x, shipBase.y, shipBase.z);
  shipGroup.quaternion.copy(shipBaseQuat);
  shipGroup.scale.setScalar(S);
  group.add(shipGroup);

  // 6. Instanced Multi-Tiered Snowy Evergreen Pine Forests (around Hiluluk, Lake, Robelle & Bighorn!)
  if (DRUM_TREES.length > 0) {
    const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.24, 1.5, 6));
    const lowerBoughGeo = trackGeo(new THREE.ConeGeometry(1.25, 2.2, 7));
    const lowerSnowGeo = trackGeo(new THREE.ConeGeometry(1.06, 1.55, 7));
    const upperBoughGeo = trackGeo(new THREE.ConeGeometry(0.95, 2.1, 7));
    const upperSnowGeo = trackGeo(new THREE.ConeGeometry(0.8, 1.75, 7));

    const trunkInst = new THREE.InstancedMesh(trunkGeo, darkTimberMat, DRUM_TREES.length);
    const lowerBoughInst = new THREE.InstancedMesh(lowerBoughGeo, pineFoliageMat, DRUM_TREES.length);
    const lowerSnowInst = new THREE.InstancedMesh(lowerSnowGeo, snowMat, DRUM_TREES.length);
    const upperBoughInst = new THREE.InstancedMesh(upperBoughGeo, pineFoliageMat, DRUM_TREES.length);
    const upperSnowInst = new THREE.InstancedMesh(upperSnowGeo, snowMat, DRUM_TREES.length);

    for (let i = 0; i < DRUM_TREES.length; i++) {
      const tr = DRUM_TREES[i];

      const spTrunk = toDrumSphereLocal(tr.x, tr.y + 0.7 * tr.scale, tr.z, globeRadius);
      _dummy.position.set(spTrunk.x, spTrunk.y, spTrunk.z);
      const norm = new THREE.Vector3(spTrunk.x, spTrunk.y + globeRadius, spTrunk.z).normalize();
      const tilt = new THREE.Quaternion().setFromUnitVectors(_up, norm);
      const rot = new THREE.Quaternion().setFromAxisAngle(_yAxis, tr.yaw);
      _dummy.quaternion.copy(tilt).multiply(rot);
      _dummy.scale.setScalar(S * tr.scale);
      _dummy.updateMatrix();
      trunkInst.setMatrixAt(i, _dummy.matrix);

      const spLow = toDrumSphereLocal(tr.x, tr.y + 1.85 * tr.scale, tr.z, globeRadius);
      _dummy.position.set(spLow.x, spLow.y, spLow.z);
      _dummy.updateMatrix();
      lowerBoughInst.setMatrixAt(i, _dummy.matrix);
      _tmpColor.setRGB(tr.tint, tr.tint, tr.tint);
      lowerBoughInst.setColorAt(i, _tmpColor);

      const spLowSnow = toDrumSphereLocal(tr.x, tr.y + 2.25 * tr.scale, tr.z, globeRadius);
      _dummy.position.set(spLowSnow.x, spLowSnow.y, spLowSnow.z);
      _dummy.updateMatrix();
      lowerSnowInst.setMatrixAt(i, _dummy.matrix);

      const spUp = toDrumSphereLocal(tr.x, tr.y + 3.0 * tr.scale, tr.z, globeRadius);
      _dummy.position.set(spUp.x, spUp.y, spUp.z);
      _dummy.updateMatrix();
      upperBoughInst.setMatrixAt(i, _dummy.matrix);
      upperBoughInst.setColorAt(i, _tmpColor);

      const spUpSnow = toDrumSphereLocal(tr.x, tr.y + 3.45 * tr.scale, tr.z, globeRadius);
      _dummy.position.set(spUpSnow.x, spUpSnow.y, spUpSnow.z);
      _dummy.updateMatrix();
      upperSnowInst.setMatrixAt(i, _dummy.matrix);
    }
    for (const inst of [
      trunkInst,
      lowerBoughInst,
      lowerSnowInst,
      upperBoughInst,
      upperSnowInst,
    ]) {
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      group.add(inst);
    }
    if (lowerBoughInst.instanceColor) lowerBoughInst.instanceColor.needsUpdate = true;
    if (upperBoughInst.instanceColor) upperBoughInst.instanceColor.needsUpdate = true;
  }

  // 7. Floating Sea-Ice Floes & Coastal Snowy Sea Stacks (Image 1)
  for (const floe of DRUM_ICE_FLOES) {
    if (floe.isRockStack) {
      const stack = new THREE.Group();
      const rock = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(floe.rx, floe.height, 7)),
        rockieMat
      );
      rock.position.y = floe.height * 0.42;
      const cap = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(floe.rx * 0.62, floe.height * 0.48, 7)),
        snowMat
      );
      cap.position.y = floe.height * 0.72;
      stack.add(rock, cap);
      placeOnSphere(stack, floe.x, floe.y, floe.z, floe.yaw);
      group.add(stack);
    } else {
      const ice = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(floe.rx * 0.92, floe.rx, floe.height, 7)),
        seaIceMat
      );
      ice.scale.set(1, 1, floe.rz / floe.rx);
      const wrap = new THREE.Group();
      wrap.add(ice);
      placeOnSphere(wrap, floe.x, floe.y, floe.z, floe.yaw);
      group.add(wrap);
    }
  }

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      // Gently bob moored ship in southern harbor cove
      const bob = Math.sin(elapsed * 1.3) * 0.08 * S;
      shipGroup.position.set(
        shipBase.x + shipNorm.x * bob,
        shipBase.y + shipNorm.y * bob,
        shipBase.z + shipNorm.z * bob
      );
      const roll = Math.sin(elapsed * 1.05) * 0.032;
      shipGroup.quaternion
        .copy(shipBaseQuat)
        .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll));

      // Animate Ropeway Gondola Cabins gliding back and forth along the 3 Drum spans
      for (const m of gondolaMovers) {
        const raw = (elapsed * m.speed + m.phase) % 2;
        const u = clamp(raw <= 1 ? raw : 2 - raw, 0.06, 0.94);
        m.curveA.getPointAt(u, m.group.position);
        m.curveA.getTangentAt(u, _tangent);
        // Align gondola upright relative to local globe normal while facing cable direction
        const upDir = _dummy.position
          .copy(m.group.position)
          .add(new THREE.Vector3(0, globeRadius, 0))
          .normalize();
        const tilt = new THREE.Quaternion().setFromUnitVectors(_up, upDir);
        const flatTan = _tangent
          .addScaledVector(upDir, -_tangent.dot(upDir))
          .normalize();
        const yaw = Math.atan2(flatTan.x, flatTan.z);
        m.group.quaternion
          .copy(tilt)
          .multiply(new THREE.Quaternion().setFromAxisAngle(_yAxis, yaw));
      }
    },
  };
}
