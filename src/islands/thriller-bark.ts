import * as THREE from 'three';
import {
  THRILLER_BARK_CASTLE_CENTER,
  THRILLER_BARK_CHAIN_ANCHORS,
  THRILLER_BARK_CHAPEL_CENTER,
  THRILLER_BARK_GLOBE_SCALE,
  THRILLER_BARK_ISLAND_RAMPART_R,
  THRILLER_BARK_MANSION_CENTER,
  THRILLER_BARK_OARS_FREEZER,
  THRILLER_BARK_PERONA_CENTER,
  THRILLER_BARK_SIDE_MAST_POSITIONS,
  THRILLER_BARK_WORLD_SIZE,
  buildThrillerBarkCreatures,
  buildThrillerBarkGraves,
  buildThrillerBarkLanterns,
  buildThrillerBarkPumpkins,
  buildThrillerBarkTrees,
  sampleThrillerBarkHeight,
  thrillerBarkIslandSignedDist,
  thrillerBarkOuterHullSignedDist,
  thrillerBarkPathSignedDist,
  thrillerBarkShipEllipseR,
  toThrillerBarkSphereLocal,
} from '../utils/thrillerBarkTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = THRILLER_BARK_GLOBE_SCALE;
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

function placeOnThrillerBarkSphere(
  obj: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  globeRadius: number,
  yaw = 0
): void {
  const pos = toThrillerBarkSphereLocal(x, y, z, globeRadius);
  obj.position.set(pos.x, pos.y, pos.z);
  _localNormal.set(pos.x, globeRadius + pos.y, pos.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

function createThrillerBarkTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = THRILLER_BARK_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * THRILLER_BARK_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * THRILLER_BARK_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const hullSd = thrillerBarkOuterHullSignedDist(x, z);
      const islandSd = thrillerBarkIslandSignedDist(x, z);
      const pathSd = thrillerBarkPathSignedDist(x, z);
      const re = thrillerBarkShipEllipseR(x, z);
      const r = Math.hypot(x, z);

      const h = sampleThrillerBarkHeight(x, z);
      const hx = sampleThrillerBarkHeight(x + 1.1, z);
      const hz = sampleThrillerBarkHeight(x, z + 1.1);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 2.2, 0, 1);
      const grain = (valueNoise2D(x * 0.72, z * 0.72) - 0.5) * 14;

      let rgb: [number, number, number] = [20, 26, 44];
      let alpha = 1;

      if (hullSd > 2.4 && islandSd > 2.4) {
        if (re < 95.0) {
          rgb = [18, 25, 42];
          alpha = 0.94;
        } else {
          const edgeFade = 1 - smoothstep(2.4, 5.5, hullSd);
          rgb = [20, 28, 46];
          alpha = edgeFade;
        }
      } else if (hullSd <= 2.0) {
        const plankStripe = Math.sin((x + z * 0.15) * 2.1) * 9;
        const n = valueNoise2D(x * 0.18, z * 0.18);
        rgb = mixRgb([124, 106, 70], [172, 148, 98], n);
        rgb = [
          rgb[0] + plankStripe,
          rgb[1] + plankStripe * 0.85,
          rgb[2] + plankStripe * 0.6,
        ];
      } else if (r >= 18.0 && r <= 24.4 && h < 1.5) {
        rgb = [16, 22, 32];
      } else if (r < 18.5) {
        const flagN = valueNoise2D(x * 0.5, z * 0.5);
        rgb = mixRgb([56, 52, 68], [86, 80, 100], flagN);
      } else if (slope > 0.35 || islandSd > -3.5) {
        const rockN = valueNoise2D(x * 0.25 + 2.2, z * 0.25 - 1.4);
        rgb = mixRgb([72, 62, 60], [112, 98, 86], rockN);
      } else {
        const soilN = valueNoise2D(x * 0.16 + 4.1, z * 0.16 + 2.3);
        const cemDist = Math.hypot((x + 25.0) / 18.0, (z - 33.0) / 15.0);
        rgb = mixRgb([32, 42, 32], [52, 56, 48], soilN);
        if (cemDist < 1.1) {
          rgb = mixRgb(rgb, [54, 44, 38], 0.55);
        }
        if (
          Math.hypot(
            x - THRILLER_BARK_PERONA_CENTER.x,
            z - THRILLER_BARK_PERONA_CENTER.z
          ) < 10.5
        ) {
          rgb = mixRgb(rgb, [78, 48, 86], 0.5);
        }
        if (pathSd < 0.8) {
          const pT = 1 - smoothstep(-0.2, 0.8, pathSd);
          rgb = mixRgb(rgb, [96, 90, 102], pT * 0.8);
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
 * Weathered Ochre-Tan Ship Hull Plank Texture (triller_bark_0ed9b1bc.JPG)
 */
function createShipHullPlankTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#9c885a';
    ctx.fillRect(0, 0, 512, 256);

    for (let x = 0; x < 512; x += 24) {
      const shade = 140 + ((x * 17) % 28);
      ctx.fillStyle = `rgb(${shade}, ${Math.round(shade * 0.86)}, ${Math.round(shade * 0.58)})`;
      ctx.fillRect(x, 0, 22, 256);
      ctx.fillStyle = 'rgba(32, 24, 14, 0.42)';
      ctx.fillRect(x + 22, 0, 2, 256);
    }

    // Horizontal timber strakes & weathering
    ctx.fillStyle = 'rgba(28, 22, 14, 0.35)';
    for (const y of [44, 128, 208]) {
      ctx.fillRect(0, y, 512, 5);
    }

    // Dark waterline grime at bottom edge
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.0, 'rgba(18, 16, 12, 0.12)');
    g.addColorStop(0.7, 'rgba(22, 20, 14, 0.08)');
    g.addColorStop(1.0, 'rgba(16, 18, 22, 0.65)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Weathered Fortress Stone Rampart Masonry Texture
 */
function createRampartStoneTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#8b7a6c';
    ctx.fillRect(0, 0, 256, 256);

    const rowH = 24;
    for (let row = 0; row < 11; row++) {
      const y = row * rowH;
      const offset = (row % 2) * 20;
      for (let col = -1; col < 7; col++) {
        const x = col * 42 + offset;
        const tone = 118 + (((row * 7 + col * 13) & 31) - 10);
        ctx.fillStyle = `rgb(${tone + 14}, ${tone + 4}, ${tone - 6})`;
        ctx.fillRect(x + 2, y + 2, 38, rowH - 4);
      }
    }
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(20, 16, 18, 0.08)');
    g.addColorStop(0.78, 'rgba(20, 24, 20, 0.18)');
    g.addColorStop(1.0, 'rgba(18, 24, 20, 0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Weathered Rose-Mauve Gothic Stone Facade Texture (triller_bark2_9cc1240e.JPG)
 */
function createGothicStoneTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#7e6e8a';
    ctx.fillRect(0, 0, 256, 256);
    const rowH = 18;
    for (let r = 0; r < 15; r++) {
      const y = r * rowH;
      const off = (r % 2) * 16;
      for (let col = -1; col < 9; col++) {
        const x = col * 32 + off;
        const v = 104 + (((r * 11 + col * 5) & 15) - 6);
        ctx.fillStyle = `rgb(${v + 18}, ${v + 4}, ${v + 28})`;
        ctx.fillRect(x + 1, y + 1, 30, rowH - 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Giant Black Sail featuring Gecko Moria's Skull, Twin Flame Brackets & Bat-Wings Jolly Roger (triller_bark_0ed9b1bc.JPG)
 */
function createMoriaJollyRogerTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 384;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#18151d';
    ctx.fillRect(0, 0, 512, 384);

    // Subtle stitched canvas ribs
    ctx.strokeStyle = 'rgba(255,255,255,0.065)';
    ctx.lineWidth = 3;
    for (let x = 20; x < 512; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 384);
      ctx.stroke();
    }

    // Dual jagged pale-violet bat wings
    ctx.fillStyle = '#8b7da1';
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.translate(256, 178);
      ctx.scale(dir, 1);
      ctx.beginPath();
      ctx.moveTo(48, -28);
      ctx.quadraticCurveTo(132, -96, 226, -54);
      ctx.quadraticCurveTo(214, -4, 218, 56);
      ctx.quadraticCurveTo(174, 16, 152, 54);
      ctx.quadraticCurveTo(118, 16, 98, 50);
      ctx.quadraticCurveTo(70, 14, 46, 36);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Twin wavy pale bone-grey flame brackets flanking the skull (triller_bark_0ed9b1bc.JPG)
    ctx.fillStyle = '#cdc6d6';
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.translate(256, 172);
      ctx.scale(dir, 1);
      ctx.beginPath();
      ctx.moveTo(46, -78);
      ctx.bezierCurveTo(72, -52, 56, -24, 72, 2);
      ctx.bezierCurveTo(84, 24, 66, 54, 46, 72);
      ctx.bezierCurveTo(54, 42, 42, 24, 48, 0);
      ctx.bezierCurveTo(54, -22, 34, -46, 46, -78);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Central skull + 3 crown horns
    ctx.fillStyle = '#dbd5e3';
    ctx.beginPath();
    ctx.arc(256, 146, 42, 0, Math.PI * 2);
    ctx.fill();

    for (const [ox, h] of [
      [-20, 32],
      [0, 38],
      [20, 32],
    ]) {
      ctx.beginPath();
      ctx.moveTo(256 + ox - 8, 114);
      ctx.quadraticCurveTo(256 + ox, 112 - h, 256 + ox + 2, 112 - h);
      ctx.lineTo(256 + ox + 8, 114);
      ctx.fill();
    }

    // Chin/jaw
    ctx.fillRect(234, 174, 44, 34);

    // Lower pelvic/crossbone prongs under jaw
    ctx.beginPath();
    ctx.arc(256, 224, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(240, 212, 32, 12);

    // Eye sockets & nasal notch
    ctx.fillStyle = '#18151d';
    ctx.beginPath();
    ctx.ellipse(239, 146, 11, 9, 0.15, 0, Math.PI * 2);
    ctx.ellipse(273, 146, 11, 9, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Teeth grid
    ctx.strokeStyle = '#18151d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(234, 191);
    ctx.lineTo(278, 191);
    for (let tx = 243; tx <= 269; tx += 9) {
      ctx.moveTo(tx, 178);
      ctx.lineTo(tx, 206);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Side Tattered Pale Sail lettering "THRILLER BARK" (triller_bark_0ed9b1bc.JPG)
 */
function createThrillerBarkSideSailTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 384;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#cac3b5';
    ctx.fillRect(0, 0, 512, 384);

    ctx.strokeStyle = 'rgba(65, 56, 46, 0.28)';
    ctx.lineWidth = 4;
    for (let x = 24; x < 512; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 384);
      ctx.stroke();
    }

    // Subtle weathered border shading
    const grad = ctx.createLinearGradient(0, 0, 0, 384);
    grad.addColorStop(0, 'rgba(30,24,18,0.18)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(20,16,14,0.22)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 384);

    ctx.fillStyle = '#242026';
    ctx.font = 'bold 68px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('THRILLER', 256, 148);
    ctx.font = 'bold 74px Georgia, serif';
    ctx.fillText('BARK', 256, 240);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Pale Weathered Upper Topsail Canvas Texture
 */
function createUpperCanvasSailTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 192;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#c5beb0';
    ctx.fillRect(0, 0, 256, 192);
    ctx.strokeStyle = 'rgba(60, 52, 42, 0.26)';
    ctx.lineWidth = 3;
    for (let x = 18; x < 256; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 192);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * 6-Petal Swirling Gothic Rose Window (triller_bark2_9cc1240e.JPG)
 */
function createGothicRoseWindowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#332b42';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#9287a8';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(128, 128, 108, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#20192b';
    ctx.beginPath();
    ctx.arc(128, 128, 96, 0, Math.PI * 2);
    ctx.fill();

    // 6 swirling flame/teardrop tracery ribs
    ctx.strokeStyle = '#8b80a2';
    ctx.lineWidth = 8;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(128 + Math.cos(a) * 22, 128 + Math.sin(a) * 22);
      ctx.quadraticCurveTo(
        128 + Math.cos(a + 0.55) * 62,
        128 + Math.sin(a + 0.55) * 62,
        128 + Math.cos(a + 0.28) * 94,
        128 + Math.sin(a + 0.28) * 94
      );
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        128 + Math.cos(a + 0.52) * 66,
        128 + Math.sin(a + 0.52) * 66,
        15,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(128, 128, 22, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStainedGlassTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#c03864');
    grad.addColorStop(0.35, '#7c42d8');
    grad.addColorStop(0.7, '#2c96d8');
    grad.addColorStop(1, '#e8a232');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);

    ctx.strokeStyle = '#181420';
    ctx.lineWidth = 6;
    for (let y = 32; y < 256; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(64, 0);
    ctx.lineTo(64, 256);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFlorianMistTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(128, 128, 16, 128, 128, 124);
    g.addColorStop(0, 'rgba(138, 96, 174, 0.44)');
    g.addColorStop(0.55, 'rgba(92, 62, 132, 0.24)');
    g.addColorStop(1, 'rgba(54, 38, 86, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a billowing curved sail geometry with wind-belly curvature and subtle scalloped hem.
 */
function createBillowingSailGeometry(
  width: number,
  height: number,
  bellyDepth: number,
  topTaper = 0.92,
  scallopAmp = 0.06
): THREE.BufferGeometry {
  const segX = 16;
  const segY = 12;
  const geo = new THREE.PlaneGeometry(width, height, segX, segY);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const u = px / width + 0.5; // 0..1
    const v = py / height + 0.5; // 0 (bottom) .. 1 (top)

    const taper = topTaper + (1 - topTaper) * (1 - v);
    const xOut = px * taper;

    // Arch-shaped lower hem + subtle tattered scallop
    const bottomCurve =
      (1 - v) * (1 - Math.sin(u * Math.PI) * 0.14) * height * 0.18;
    const scallop =
      v < 0.15 ? Math.sin(u * Math.PI * 6) * scallopAmp * height * (1 - v / 0.15) : 0;
    const yOut = py + bottomCurve + scallop;

    const belly = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * bellyDepth;
    const rib = Math.sin(u * Math.PI * 10) * bellyDepth * 0.04;
    pos.setXYZ(i, xOut, yOut, belly + rib);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a continuous curved Outer Pirate Ship Hull Wall & Walkable Deck Bulwark
 * around the ellipse, cleanly parting at the South Demonic Mouth Sea-Gate.
 */
function createOuterShipHullGeometry(globeRadius: number): THREE.BufferGeometry {
  const segs = 128;
  // Cross-section profile points: [radialScaleOffsetFrom95, yOffset]
  const profile: Array<[number, number, number]> = [
    [5.8, -2.8, 0.0], // outer waterline
    [8.8, 3.8, 0.32], // outer mid flare
    [9.4, 11.4, 0.65], // outer gunwale top
    [7.4, 11.4, 0.72], // outer parapet inner rim
    [7.0, 8.8, 0.8], // ship deck outer
    [-6.6, 8.8, 0.9], // ship deck inner
    [-7.0, 10.6, 0.94], // inner parapet top
    [-8.4, 10.6, 0.98], // inner parapet face
    [-8.4, -2.6, 1.0], // inner lagoon wall
  ];

  // Angles from mouth-right (approx 84 deg) around to mouth-left (approx 96 deg)
  const startAng = Math.PI * 0.5 + 0.118;
  const endAng = Math.PI * 2.5 - 0.118;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const ringStride = profile.length;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const ang = startAng + (endAng - startAng) * t;
    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);

    const zApprox = sinA * 102.5;
    const sheerLift =
      zApprox > 40
        ? smoothstep(40, 98, zApprox) * 2.4
        : smoothstep(-45, -102, zApprox) * 3.4;

    for (let p = 0; p < ringStride; p++) {
      const [rOff, yBase, vTex] = profile[p];
      const rad = 95.0 + rOff;
      const lx = cosA * rad * 0.96;
      const lz = sinA * rad * 1.02;
      const ly = yBase > 0 ? yBase + sheerLift : yBase;
      const sp = toThrillerBarkSphereLocal(lx, ly, lz, globeRadius);
      positions.push(sp.x, sp.y, sp.z);
      uvs.push(t * 24, 1 - vTex);
    }
  }

  for (let i = 0; i < segs; i++) {
    for (let p = 0; p < ringStride - 1; p++) {
      const a = i * ringStride + p;
      const b = (i + 1) * ringStride + p;
      const c = (i + 1) * ringStride + (p + 1);
      const d = i * ringStride + (p + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a pitched gothic gable roof prism extruded along X.
 */
function createGableRoofGeometry(
  lengthX: number,
  widthZ: number,
  heightY: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-widthZ * 0.5, 0);
  shape.lineTo(widthZ * 0.5, 0);
  shape.lineTo(0, heightY);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: lengthX,
    bevelEnabled: false,
    steps: 1,
  });
  geo.translate(0, 0, -lengthX * 0.5);
  geo.rotateY(Math.PI * 0.5);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a toothed iron cogwheel group (used on mouth piers & giant ghostly wheel).
 */
function buildToothedCogwheel(
  radius: number,
  tube: number,
  teethCount: number,
  spokeCount: number,
  mat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const wg = new THREE.Group();
  const rim = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(radius, tube, 8, Math.max(16, teethCount * 2))),
    mat
  );
  const hub = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(tube * 2.1, tube * 2.1, tube * 2.2, 10)),
    mat
  );
  hub.rotation.x = Math.PI * 0.5;
  wg.add(rim, hub);

  const toothGeo = trackGeo(new THREE.BoxGeometry(tube * 1.8, tube * 1.9, tube * 1.8));
  for (let i = 0; i < teethCount; i++) {
    const a = (i / teethCount) * Math.PI * 2;
    const tooth = new THREE.Mesh(toothGeo, mat);
    tooth.position.set(
      Math.cos(a) * (radius + tube * 1.15),
      Math.sin(a) * (radius + tube * 1.15),
      0
    );
    tooth.rotation.z = a;
    wg.add(tooth);
  }

  const spokeGeo = trackGeo(
    new THREE.CylinderGeometry(tube * 0.42, tube * 0.42, radius * 1.92, 6)
  );
  for (let s = 0; s < spokeCount; s++) {
    const spoke = new THREE.Mesh(spokeGeo, mat);
    spoke.rotation.z = (s / spokeCount) * Math.PI;
    wg.add(spoke);
  }
  return wg;
}

/**
 * Thriller Bark — Île-Navire du Triangle de Florian
 * Fidèle à triller_bark_0ed9b1bc.JPG et triller_bark2_9cc1240e.JPG :
 * - Coque continue de navire pirate en bois vieilli, sabords de canons & gouvernail géant à la poupe Nord
 * - Bouche démoniaque géante à la proue Sud (lèvres charnues cramoisies, double rangée de dents blanches & piliers à engrenages)
 * - 3 mâts géants solidement ancrés (2 latéraux sur les ponts bâbord/tribord avec voiles « THRILLER BARK », 1 central massif en chêne avec grand pavillon crâne à ailes de chauve-souris de Moria) + 4 chaînes à maillons
 * - Remparts crénelés, 12 tours de guet plates à créneaux, brèche rocheuse frontale & forêt sinistre dense
 * - Manoir gothique du Dr Hogback (rosace à 6 lobes tourbillonnants, frise à 5 arcades, lucarnes pointues, toits en croupe sombre & échauguettes)
 * - Château-mât de Moria, grande roue dentée fantomatique, Congélateur d'Oars, Tour de Perona & Chapelle au clocher à croix
 * - Dôme céleste sombre & brume violette du Triangle de Florian au-dessus de l'île
 */
export function createIslandMesh(ctx: IslandMeshContext): IslandMeshInstance {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const group = new THREE.Group();
  group.name = 'island-thriller-bark';
  const registerTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;

  // 1. Continuous Ship-Hull, Lagoon, Rampart & Island Terrain Mesh (220 x 220)
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(
      THRILLER_BARK_WORLD_SIZE,
      THRILLER_BARK_WORLD_SIZE,
      220,
      220
    )
  );
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const ly = sampleThrillerBarkHeight(lx, lz);
    const sp = toThrillerBarkSphereLocal(lx, ly, lz, globeRadius);
    posAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainTex = registerTex(createThrillerBarkTerrainTexture(1024));
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.88,
      metalness: 0.05,
      alphaTest: 0.25,
      side: THREE.DoubleSide,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.castShadow = true;
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Shared Haunted Gothic Palette
  const hullTimberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: registerTex(createShipHullPlankTexture()),
      roughness: 0.84,
      metalness: 0.04,
      side: THREE.DoubleSide,
    })
  );
  const mastTimberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x9c8252, roughness: 0.82 })
  );
  const darkTimberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x453424, roughness: 0.88 })
  );
  const rampartStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: registerTex(createRampartStoneTexture()),
      roughness: 0.86,
      metalness: 0.04,
    })
  );
  const stoneMauveMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: registerTex(createGothicStoneTexture()),
      emissive: 0x161022,
      emissiveIntensity: 0.14,
      roughness: 0.84,
      metalness: 0.05,
    })
  );
  const stoneDarkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x574c66, roughness: 0.85 })
  );
  const stonePaleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x9b8eae,
      emissive: 0x181224,
      emissiveIntensity: 0.12,
      roughness: 0.8,
    })
  );
  const spireSlateMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1e192b, roughness: 0.72 })
  );
  const ironMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2a2e38,
      roughness: 0.42,
      metalness: 0.75,
    })
  );
  const mouthLipMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc22b5b,
      emissive: 0x240410,
      emissiveIntensity: 0.18,
      roughness: 0.48,
    })
  );
  const boneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf0ebe2, roughness: 0.46 })
  );
  const mouthVoidMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x120b16, roughness: 0.95 })
  );
  const peronaPinkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x9e426c, roughness: 0.65 })
  );
  const iceMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x94d8f2,
      emissive: 0x1c4c70,
      emissiveIntensity: 0.35,
      roughness: 0.16,
      metalness: 0.1,
      transparent: true,
      opacity: 0.78,
    })
  );
  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd8a840,
      roughness: 0.34,
      metalness: 0.7,
    })
  );

  // 2. Continuous Pirate Ship Outer Hull, Cannon Portholes, Demonic Mouth Gate (South Prow) & Stern Rudder
  {
    const hullWallMesh = new THREE.Mesh(
      trackGeo(createOuterShipHullGeometry(globeRadius)),
      hullTimberMat
    );
    hullWallMesh.castShadow = true;
    hullWallMesh.receiveShadow = true;
    group.add(hullWallMesh);

    // Cannon portholes embedded flush along port & starboard outer hull flanks
    const portCount = 28;
    const portRingGeo = trackGeo(new THREE.TorusGeometry(1.45 * S, 0.34 * S, 6, 14));
    const portHoleGeo = trackGeo(new THREE.CircleGeometry(1.25 * S, 12));
    const portRingInst = new THREE.InstancedMesh(portRingGeo, ironMat, portCount);
    const portHoleInst = new THREE.InstancedMesh(portHoleGeo, mouthVoidMat, portCount);
    const dummy = new THREE.Object3D();
    let pIdx = 0;

    for (let i = 0; i < portCount; i++) {
      const ang = (i / portCount) * Math.PI * 2;
      const hx = Math.cos(ang) * 100.3;
      const hz = Math.sin(ang) * 106.5;
      if (hz > 74 && Math.abs(hx) < 18.0) continue;

      const sheerLift =
        hz > 40
          ? smoothstep(40, 98, hz) * 2.4
          : smoothstep(-45, -102, hz) * 3.4;
      const outYaw = Math.atan2(Math.cos(ang) * 100.3, Math.sin(ang) * 106.5);
      placeOnThrillerBarkSphere(
        dummy,
        hx,
        6.2 + sheerLift,
        hz,
        globeRadius,
        outYaw
      );
      dummy.updateMatrix();
      portRingInst.setMatrixAt(pIdx, dummy.matrix);
      portHoleInst.setMatrixAt(pIdx++, dummy.matrix);
    }
    portRingInst.count = pIdx;
    portHoleInst.count = pIdx;
    portRingInst.instanceMatrix.needsUpdate = true;
    portHoleInst.instanceMatrix.needsUpdate = true;
    portRingInst.computeBoundingSphere();
    portHoleInst.computeBoundingSphere();
    group.add(portRingInst, portHoleInst);

    // Monumental Demonic Mouth Sea-Gate at South Prow (triller_bark_0ed9b1bc.JPG)
    // Leaves central waterway open between twin rows of grinning white teeth & crimson lips
    const mouthGroup = new THREE.Group();
    placeOnThrillerBarkSphere(mouthGroup, 0, 0, 96.2, globeRadius, 0);

    // Twin massive timber & iron gate piers + giant toothed gear wheels
    for (const side of [-1, 1]) {
      const pier = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(6.4 * S, 18.0 * S, 12.6 * S)),
        hullTimberMat
      );
      pier.position.set(side * 13.0 * S, 7.6 * S, 0);
      const pierCap = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(7.0 * S, 1.5 * S, 13.2 * S)),
        darkTimberMat
      );
      pierCap.position.set(side * 13.0 * S, 16.6 * S, 0);
      const pierStrap = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(6.6 * S, 0.95 * S, 12.8 * S)),
        ironMat
      );
      pierStrap.position.set(side * 13.0 * S, 11.8 * S, 0);

      const gear = buildToothedCogwheel(
        3.8 * S,
        0.58 * S,
        12,
        6,
        ironMat,
        trackGeo
      );
      gear.position.set(side * 16.5 * S, 12.6 * S, 0.4 * S);
      mouthGroup.add(pier, pierCap, pierStrap, gear);
    }

    // Sculpted Cupid's-bow crimson upper & lower lips
    const upperLipCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-11.2 * S, 7.2 * S, 3.1 * S),
      new THREE.Vector3(-7.0 * S, 12.6 * S, 3.5 * S),
      new THREE.Vector3(-2.8 * S, 14.8 * S, 3.8 * S),
      new THREE.Vector3(0.0, 13.3 * S, 3.9 * S),
      new THREE.Vector3(2.8 * S, 14.8 * S, 3.8 * S),
      new THREE.Vector3(7.0 * S, 12.6 * S, 3.5 * S),
      new THREE.Vector3(11.2 * S, 7.2 * S, 3.1 * S),
    ]);
    const upperLip = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(upperLipCurve, 32, 2.25 * S, 10, false)),
      mouthLipMat
    );

    const lowerLipCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-11.2 * S, 6.4 * S, 3.1 * S),
      new THREE.Vector3(-6.4 * S, 2.5 * S, 3.6 * S),
      new THREE.Vector3(0.0, 1.7 * S, 3.9 * S),
      new THREE.Vector3(6.4 * S, 2.5 * S, 3.6 * S),
      new THREE.Vector3(11.2 * S, 6.4 * S, 3.1 * S),
    ]);
    const lowerLip = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(lowerLipCurve, 28, 2.3 * S, 10, false)),
      mouthLipMat
    );
    mouthGroup.add(upperLip, lowerLip);

    // Full grinning rows of big white square teeth framing the open archway
    const toothOffsets = [-8.3, -5.0, -1.7, 1.7, 5.0, 8.3];
    for (const tx of toothOffsets) {
      const archCurve = 1.0 - Math.pow(Math.abs(tx) / 11.2, 2) * 0.45;
      const upperTooth = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(2.85 * S, 3.3 * S, 1.8 * S)),
        boneMat
      );
      upperTooth.position.set(tx * S, (9.2 + archCurve * 2.1) * S, 2.8 * S);

      const lowerTooth = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(2.85 * S, 2.8 * S, 1.8 * S)),
        boneMat
      );
      lowerTooth.position.set(tx * S, (4.8 - archCurve * 1.4) * S, 2.8 * S);
      mouthGroup.add(upperTooth, lowerTooth);
    }
    group.add(mouthGroup);

    // Colossal Stern Poop-Deck Rail & Rudder protruding off North Stern
    const rudderGroup = new THREE.Group();
    placeOnThrillerBarkSphere(rudderGroup, 0, 2.0, -108.5, globeRadius, 0);
    const rudderPost = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.5 * S, 1.7 * S, 20.0 * S, 8)),
      ironMat
    );
    rudderPost.position.set(0, 6.5 * S, 2.0 * S);
    const rudderBlade = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.4 * S, 15.0 * S, 13.5 * S)),
      darkTimberMat
    );
    rudderBlade.position.set(0, 2.2 * S, -5.0 * S);
    const rudderTrim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.7 * S, 1.5 * S, 14.0 * S)),
      ironMat
    );
    rudderTrim.position.set(0, 7.0 * S, -5.0 * S);
    rudderGroup.add(rudderPost, rudderBlade, rudderTrim);
    group.add(rudderGroup);
  }

  // 3. Flooded Inner Ship Lagoon Water, Timber Pier Causeway & Crenellated Island Ramparts + Flat Battlement Watchtowers
  {
    const waterGeo = trackGeo(new THREE.CircleGeometry(94.0 * S, 48));
    waterGeo.rotateX(-Math.PI * 0.5);
    const waterMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x131d30,
        emissive: 0x050812,
        emissiveIntensity: 0.35,
        roughness: 0.22,
        metalness: 0.16,
        transparent: true,
        opacity: 0.9,
      })
    );
    const lagoonWater = new THREE.Mesh(waterGeo, waterMat);
    placeOnThrillerBarkSphere(lagoonWater, 0, 0.06, 0, globeRadius, 0);
    group.add(lagoonWater);

    // Timber Landing Causeway inside inner lagoon leading to the front rocky breach
    const pier = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.0 * S, 1.0 * S, 30.0 * S)),
      darkTimberMat
    );
    placeOnThrillerBarkSphere(pier, 0, 1.75, 72.0, globeRadius, 0);
    group.add(pier);

    // Fortified Stone Rampart Ring & Flat Crenellated Watchtowers (triller_bark_0ed9b1bc.JPG)
    const wallCount = 46;
    const towerCount = 12;
    const wallGeo = trackGeo(new THREE.BoxGeometry(8.8 * S, 11.4 * S, 3.0 * S));
    const merlonGeo = trackGeo(new THREE.BoxGeometry(1.8 * S, 1.7 * S, 3.1 * S));
    const towerBodyGeo = trackGeo(new THREE.CylinderGeometry(3.4 * S, 4.0 * S, 15.0 * S, 12));
    const towerCrownGeo = trackGeo(new THREE.CylinderGeometry(4.0 * S, 3.6 * S, 2.2 * S, 12));
    const towerMerlonGeo = trackGeo(new THREE.BoxGeometry(1.35 * S, 1.6 * S, 1.2 * S));

    const wallInst = new THREE.InstancedMesh(wallGeo, rampartStoneMat, wallCount);
    const merlonInst = new THREE.InstancedMesh(merlonGeo, rampartStoneMat, wallCount * 2);
    const towerInst = new THREE.InstancedMesh(towerBodyGeo, rampartStoneMat, towerCount);
    const towerCrownInst = new THREE.InstancedMesh(towerCrownGeo, rampartStoneMat, towerCount);
    const towerMerlonInst = new THREE.InstancedMesh(
      towerMerlonGeo,
      rampartStoneMat,
      towerCount * 8
    );

    const dummy = new THREE.Object3D();
    let wIdx = 0;
    let mIdx = 0;
    let tIdx = 0;
    let tmIdx = 0;

    for (let i = 0; i < wallCount; i++) {
      const ang = (i / wallCount) * Math.PI * 2;
      const wx = Math.cos(ang) * THRILLER_BARK_ISLAND_RAMPART_R;
      const wz = Math.sin(ang) * THRILLER_BARK_ISLAND_RAMPART_R;
      if (wz > 48 && Math.abs(wx) < 6.4) continue;

      const yaw = -ang + Math.PI * 0.5;
      placeOnThrillerBarkSphere(dummy, wx, 4.2, wz, globeRadius, yaw);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      wallInst.setMatrixAt(wIdx++, dummy.matrix);

      for (const off of [-2.2, 2.2]) {
        const mx = wx - Math.sin(ang) * off;
        const mz = wz + Math.cos(ang) * off;
        placeOnThrillerBarkSphere(dummy, mx, 10.6, mz, globeRadius, yaw);
        dummy.updateMatrix();
        merlonInst.setMatrixAt(mIdx++, dummy.matrix);
      }
    }

    for (let i = 0; i < towerCount; i++) {
      const ang = (i / towerCount) * Math.PI * 2 + 0.22;
      const tx = Math.cos(ang) * (THRILLER_BARK_ISLAND_RAMPART_R + 0.6);
      const tz = Math.sin(ang) * (THRILLER_BARK_ISLAND_RAMPART_R + 0.6);
      if (tz > 50 && Math.abs(tx) < 7.0) continue;

      placeOnThrillerBarkSphere(dummy, tx, 5.8, tz, globeRadius, 0);
      dummy.updateMatrix();
      towerInst.setMatrixAt(tIdx, dummy.matrix);

      placeOnThrillerBarkSphere(dummy, tx, 13.8, tz, globeRadius, 0);
      dummy.updateMatrix();
      towerCrownInst.setMatrixAt(tIdx++, dummy.matrix);

      for (let b = 0; b < 8; b++) {
        const ba = (b / 8) * Math.PI * 2;
        const bx = tx + Math.cos(ba) * 3.35;
        const bz = tz + Math.sin(ba) * 3.35;
        placeOnThrillerBarkSphere(dummy, bx, 15.5, bz, globeRadius, -ba + Math.PI * 0.5);
        dummy.updateMatrix();
        towerMerlonInst.setMatrixAt(tmIdx++, dummy.matrix);
      }
    }

    // Jagged rocky breach crags & coastal cliff boulders around inner island edge (triller_bark_0ed9b1bc.JPG)
    for (const [cx, cy, cz, sx, sy, sz] of [
      [-7.6, 5.8, 58.2, 1.25, 1.65, 1.35],
      [7.6, 5.8, 58.2, 1.25, 1.65, 1.35],
      [-13.5, 4.2, 57.5, 1.1, 1.25, 1.1],
      [13.5, 4.2, 57.5, 1.1, 1.25, 1.1],
    ]) {
      const crag = new THREE.Mesh(
        trackGeo(new THREE.DodecahedronGeometry(4.4 * S, 0)),
        rampartStoneMat
      );
      crag.scale.set(sx, sy, sz);
      placeOnThrillerBarkSphere(crag, cx, cy, cz, globeRadius, cx * 0.15);
      group.add(crag);
    }

    wallInst.count = wIdx;
    merlonInst.count = mIdx;
    towerInst.count = tIdx;
    towerCrownInst.count = tIdx;
    towerMerlonInst.count = tmIdx;
    wallInst.instanceMatrix.needsUpdate = true;
    merlonInst.instanceMatrix.needsUpdate = true;
    towerInst.instanceMatrix.needsUpdate = true;
    towerCrownInst.instanceMatrix.needsUpdate = true;
    towerMerlonInst.instanceMatrix.needsUpdate = true;
    wallInst.computeBoundingSphere();
    merlonInst.computeBoundingSphere();
    towerInst.computeBoundingSphere();
    towerCrownInst.computeBoundingSphere();
    towerMerlonInst.computeBoundingSphere();
    group.add(wallInst, merlonInst, towerInst, towerCrownInst, towerMerlonInst);
  }

  // 4. Giant Pirate Ship Masts (Grounded on Hull Decks!), Billowing Curved Sails & Linked Anchor Chains
  {
    const moriaSailMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: registerTex(createMoriaJollyRogerTexture()),
        emissive: 0x0f0b18,
        emissiveIntensity: 0.22,
        roughness: 0.78,
        side: THREE.DoubleSide,
      })
    );
    const sideSailMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: registerTex(createThrillerBarkSideSailTexture()),
        emissive: 0x1e1a24,
        emissiveIntensity: 0.22,
        roughness: 0.82,
        side: THREE.DoubleSide,
      })
    );
    const upperCanvasMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: registerTex(createUpperCanvasSailTexture()),
        emissive: 0x1e1a24,
        emissiveIntensity: 0.18,
        roughness: 0.84,
        side: THREE.DoubleSide,
      })
    );

    // Port & Starboard Side Masts rising cleanly off the wooden hull decks (re ≈ 95)
    for (const mastSpec of THRILLER_BARK_SIDE_MAST_POSITIONS) {
      const side = mastSpec.x < 0 ? -1 : 1;
      const deckY = sampleThrillerBarkHeight(mastSpec.x, mastSpec.z);
      const mastGroup = new THREE.Group();
      placeOnThrillerBarkSphere(
        mastGroup,
        mastSpec.x,
        deckY,
        mastSpec.z,
        globeRadius,
        side * -0.14
      );

      const mastCollar = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(3.3 * S, 4.0 * S, 2.2 * S, 10)),
        darkTimberMat
      );
      mastCollar.position.y = 1.1 * S;

      const mastPole = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(1.75 * S, 2.7 * S, 70.0 * S, 10)),
        mastTimberMat
      );
      mastPole.position.y = 35.0 * S;

      const crowsNest = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(3.2 * S, 2.4 * S, 2.2 * S, 10)),
        darkTimberMat
      );
      crowsNest.position.y = 58.0 * S;

      mastGroup.add(mastCollar, mastPole, crowsNest);

      for (const [yy, w, h, belly] of [
        [30.0, 44.0, 22.0, 4.8],
        [50.5, 36.0, 16.5, 3.6],
      ]) {
        const yard = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.72 * S, 0.85 * S, (w + 6.0) * S, 8)),
          darkTimberMat
        );
        yard.rotation.z = Math.PI * 0.5;
        yard.position.y = (yy + h * 0.5) * S;

        const sail = new THREE.Mesh(
          trackGeo(createBillowingSailGeometry(w * S, h * S, belly * S, 0.92, 0.045)),
          yy < 38 ? sideSailMat : upperCanvasMat
        );
        sail.position.set(0, yy * S, 1.5 * S);
        mastGroup.add(yard, sail);
      }

      // Fluttering dark swallowtail pennant at masthead
      const pennant = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(11.0 * S, 3.4 * S)),
        spireSlateMat
      );
      pennant.position.set(side * 5.6 * S, 67.5 * S, 0);
      mastGroup.add(pennant);
      group.add(mastGroup);
    }

    // Giant Central Main Ship Mast Timber Column & Billowing Moria Jolly Roger Sail
    const centerSailGroup = new THREE.Group();
    placeOnThrillerBarkSphere(
      centerSailGroup,
      0,
      0,
      THRILLER_BARK_CASTLE_CENTER.z,
      globeRadius,
      0
    );

    const centralTimberMast = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(4.0 * S, 6.2 * S, 106.0 * S, 14)),
      mastTimberMat
    );
    centralTimberMast.position.y = 53.0 * S;
    centerSailGroup.add(centralTimberMast);

    // Iron mast hoops along central timber shaft
    for (const bandY of [42.0, 62.0, 82.0, 98.0]) {
      const hoop = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(4.9 * S, 0.45 * S, 6, 16)),
        ironMat
      );
      hoop.rotation.x = Math.PI * 0.5;
      hoop.position.y = bandY * S;
      centerSailGroup.add(hoop);
    }

    // Main central yardarm + colossal billowing black Moria Jolly Roger sail
    const mainYard = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.15 * S, 1.3 * S, 86.0 * S, 10)),
      darkTimberMat
    );
    mainYard.rotation.z = Math.PI * 0.5;
    mainYard.position.set(0, 80.0 * S, 3.5 * S);

    const moriaSail = new THREE.Mesh(
      trackGeo(createBillowingSailGeometry(74.0 * S, 35.0 * S, 7.2 * S, 0.96, 0.04)),
      moriaSailMat
    );
    moriaSail.position.set(0, 62.0 * S, 4.2 * S);

    // Upper central yardarm & pale billowing topsail
    const upperYard = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.9 * S, 1.0 * S, 60.0 * S, 8)),
      darkTimberMat
    );
    upperYard.rotation.z = Math.PI * 0.5;
    upperYard.position.set(0, 100.0 * S, 3.0 * S);

    const upperMainSail = new THREE.Mesh(
      trackGeo(createBillowingSailGeometry(54.0 * S, 18.0 * S, 4.8 * S, 0.92, 0.03)),
      upperCanvasMat
    );
    upperMainSail.position.set(0, 90.5 * S, 3.4 * S);

    // Central mast crow's nest, finial cap & swallowtail pennant
    const mainCrowsNest = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(5.6 * S, 4.4 * S, 2.8 * S, 12)),
      darkTimberMat
    );
    mainCrowsNest.position.y = 104.0 * S;
    const mainMastTip = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(4.2 * S, 4.5 * S, 10)),
      darkTimberMat
    );
    mainMastTip.position.y = 108.2 * S;
    const mainPennant = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(16.0 * S, 4.4 * S)),
      spireSlateMat
    );
    mainPennant.position.set(8.2 * S, 108.5 * S, 0);

    centerSailGroup.add(
      mainYard,
      moriaSail,
      upperYard,
      upperMainSail,
      mainCrowsNest,
      mainMastTip,
      mainPennant
    );
    group.add(centerSailGroup);

    // 4 Giant Interlocking Iron Anchor Chains from Central Mast to Wooden Ship Hull Deck
    const linksPerChain = 34;
    const totalLinks = THRILLER_BARK_CHAIN_ANCHORS.length * linksPerChain;
    const linkGeo = trackGeo(new THREE.TorusGeometry(0.85 * S, 0.28 * S, 6, 12));
    linkGeo.scale(0.68, 1.32, 0.85);
    const chainInst = new THREE.InstancedMesh(linkGeo, ironMat, totalLinks);

    const dummy = new THREE.Object3D();
    const linkQuat = new THREE.Quaternion();
    const twistQuat = new THREE.Quaternion();
    const tangent = new THREE.Vector3();
    let cIdx = 0;

    for (const anchor of THRILLER_BARK_CHAIN_ANCHORS) {
      const pTop = toThrillerBarkSphereLocal(
        0,
        74.0,
        THRILLER_BARK_CASTLE_CENTER.z,
        globeRadius
      );
      const deckY = sampleThrillerBarkHeight(anchor.x, anchor.z);
      const pBot = toThrillerBarkSphereLocal(
        anchor.x,
        Math.max(8.8, deckY),
        anchor.z,
        globeRadius
      );
      const start = new THREE.Vector3(pTop.x, pTop.y, pTop.z);
      const end = new THREE.Vector3(pBot.x, pBot.y, pBot.z);
      const mid = start.clone().lerp(end, 0.5);
      mid.y -= 2.6 * S;
      const curve = new THREE.CatmullRomCurve3([start, mid, end]);

      for (let k = 0; k < linksPerChain; k++) {
        const u = (k + 0.5) / linksPerChain;
        const pt = curve.getPoint(u);
        curve.getTangent(u, tangent).normalize();
        linkQuat.setFromUnitVectors(_yAxis, tangent);
        twistQuat.setFromAxisAngle(_yAxis, (k % 2) * (Math.PI * 0.5));
        dummy.position.copy(pt);
        dummy.quaternion.copy(linkQuat).multiply(twistQuat);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        chainInst.setMatrixAt(cIdx++, dummy.matrix);
      }
    }
    chainInst.count = cIdx;
    chainInst.instanceMatrix.needsUpdate = true;
    chainInst.computeBoundingSphere();
    group.add(chainInst);
  }

  // 5. Drawbridge, Dr. Hogback's Gothic Mansion (triller_bark2_9cc1240e.JPG), Moria's Mast-Castle, Giant Cogwheel, Oars Freezer, Chapel & Perona's Tower
  const glowingLanternMats: THREE.MeshStandardMaterial[] = [];
  const mistSprites: THREE.Mesh[] = [];
  let ferrisWheelRef: THREE.Group | null = null;
  let skyDomeMat: THREE.ShaderMaterial | null = null;
  let skyDomeRef: THREE.Mesh | null = null;

  {
    // Heavy Wrought-Iron & Timber Drawbridge spanning the Inner Moat (z = 17.5..25.5)
    const bridgeGroup = new THREE.Group();
    placeOnThrillerBarkSphere(bridgeGroup, 0, 7.2, 21.5, globeRadius, 0);
    const deck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.6 * S, 0.55 * S, 8.8 * S)),
      darkTimberMat
    );
    bridgeGroup.add(deck);
    for (const bx of [-2.75, 2.75]) {
      const post = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.36 * S, 2.8 * S, 0.42 * S)),
        ironMat
      );
      post.position.set(bx * S, 1.3 * S, 3.8 * S);
      const rail = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.22 * S, 0.95 * S, 8.8 * S)),
        ironMat
      );
      rail.position.set(bx * S, 0.65 * S, 0);
      bridgeGroup.add(post, rail);
    }
    group.add(bridgeGroup);

    // Dr. Hogback's Gothic Mansion (matching triller_bark2_9cc1240e.JPG closely!)
    const hogbackGroup = new THREE.Group();
    placeOnThrillerBarkSphere(
      hogbackGroup,
      THRILLER_BARK_MANSION_CENTER.x,
      THRILLER_BARK_MANSION_CENTER.y,
      THRILLER_BARK_MANSION_CENTER.z,
      globeRadius,
      0
    );

    const roseWinMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: registerTex(createGothicRoseWindowTexture()),
        roughness: 0.48,
      })
    );
    const stainedGlassMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: registerTex(createStainedGlassTexture()),
        emissive: 0x3b1f5c,
        emissiveIntensity: 0.45,
        roughness: 0.35,
      })
    );
    const darkWindowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x181322,
        emissive: 0x2a1a40,
        emissiveIntensity: 0.25,
        roughness: 0.32,
      })
    );

    // Wide Two-Story Gothic Wings + Pitched Slate Gable Roof + 4 Pointed Dormer Windows
    const wingBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(25.0 * S, 8.2 * S, 8.2 * S)),
      stoneMauveMat
    );
    wingBody.position.y = 4.1 * S;

    const wingCornice = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(25.6 * S, 0.65 * S, 8.7 * S)),
      stonePaleMat
    );
    wingCornice.position.y = 8.2 * S;

    const wingGableRoof = new THREE.Mesh(
      trackGeo(createGableRoofGeometry(25.4 * S, 8.8 * S, 4.4 * S)),
      spireSlateMat
    );
    wingGableRoof.position.y = 8.4 * S;

    // 4 Pointed Gothic Dormer Windows along the front pitched roof (2 left, 2 right)
    for (const dx of [-10.0, -5.8, 5.8, 10.0]) {
      const dormerBody = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.15 * S, 1.8 * S, 1.4 * S)),
        stonePaleMat
      );
      dormerBody.position.set(dx * S, 10.2 * S, 2.55 * S);
      const dormerGlass = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.65 * S, 1.3 * S, 0.22 * S)),
        darkWindowMat
      );
      dormerGlass.position.set(dx * S, 10.1 * S, 3.25 * S);
      const dormerRoof = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.9 * S, 1.45 * S, 4)),
        spireSlateMat
      );
      dormerRoof.rotation.y = Math.PI * 0.25;
      dormerRoof.position.set(dx * S, 11.75 * S, 2.55 * S);
      hogbackGroup.add(dormerBody, dormerGlass, dormerRoof);
    }

    // Two rows of gothic lancet windows on front facade (dark slate panes with stone lintels, triller_bark2_9cc1240e.JPG)
    for (const wx of [-10.8, -8.5, -6.2, 6.2, 8.5, 10.8]) {
      for (const wy of [2.5, 5.6]) {
        const winFrame = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(1.22 * S, 2.15 * S, 0.22 * S)),
          stonePaleMat
        );
        winFrame.position.set(wx * S, wy * S, 4.08 * S);
        const win = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.88 * S, 1.85 * S, 0.3 * S)),
          darkWindowMat
        );
        win.position.set(wx * S, wy * S, 4.14 * S);
        hogbackGroup.add(winFrame, win);
      }
    }

    // Flanking Left & Right Corner Turrets with Slender Slate Spires
    for (const sx of [-12.6, 12.6]) {
      const sideTurret = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(3.4 * S, 12.8 * S, 6.4 * S)),
        stoneMauveMat
      );
      sideTurret.position.set(sx * S, 6.4 * S, 0.6 * S);
      const sideSpire = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(2.6 * S, 7.4 * S, 4)),
        spireSlateMat
      );
      sideSpire.rotation.y = Math.PI * 0.25;
      sideSpire.position.set(sx * S, 16.4 * S, 0.6 * S);
      hogbackGroup.add(sideTurret, sideSpire);
    }

    // Central Gothic Rose-Window Bell Tower
    const centerTower = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(7.2 * S, 15.2 * S, 9.2 * S)),
      stoneMauveMat
    );
    centerTower.position.y = 7.6 * S;

    const roseFrame = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.85 * S, 2.85 * S, 0.35 * S, 20)),
      stonePaleMat
    );
    roseFrame.rotation.x = Math.PI * 0.5;
    roseFrame.position.set(0, 7.6 * S, 4.55 * S);

    const roseDisc = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.45 * S, 2.45 * S, 0.42 * S, 20)),
      roseWinMat
    );
    roseDisc.rotation.x = Math.PI * 0.5;
    roseDisc.position.set(0, 7.6 * S, 4.62 * S);

    // 5-Arch Blind Arcade Frieze with Stone Colonnettes & Crenellated Battlements
    for (let a = -2; a <= 2; a++) {
      const arch = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.9 * S, 1.55 * S, 0.32 * S)),
        darkWindowMat
      );
      arch.position.set(a * 1.25 * S, 12.2 * S, 4.62 * S);
      const pier = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.28 * S, 1.7 * S, 0.38 * S)),
        stonePaleMat
      );
      pier.position.set((a * 1.25 + 0.62) * S, 12.2 * S, 4.64 * S);
      hogbackGroup.add(arch, pier);
    }
    for (let m = -2; m <= 2; m++) {
      const merlon = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.9 * S, 1.15 * S, 0.9 * S)),
        stonePaleMat
      );
      merlon.position.set(m * 1.45 * S, 15.65 * S, 4.2 * S);
      hogbackGroup.add(merlon);
    }

    // Corner Bartizan Turrets flanking the Rose Tower Parapet
    for (const bx of [-3.5, 3.5]) {
      const bartizan = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.75 * S, 0.72 * S, 4.4 * S, 8)),
        stonePaleMat
      );
      bartizan.position.set(bx * S, 15.6 * S, 4.4 * S);
      const bCap = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.95 * S, 1.6 * S, 8)),
        spireSlateMat
      );
      bCap.position.set(bx * S, 18.5 * S, 4.4 * S);
      hogbackGroup.add(bartizan, bCap);
    }

    // Upper Belfry Stage with Small Clock Dial + Tall Steep Pyramidal Spire + Front Dormer
    const towerUpper = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.6 * S, 5.4 * S, 5.6 * S)),
      stoneMauveMat
    );
    towerUpper.position.y = 17.8 * S;

    const clockDial = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.95 * S, 0.95 * S, 0.32 * S, 14)),
      roseWinMat
    );
    clockDial.rotation.x = Math.PI * 0.5;
    clockDial.position.set(0, 17.6 * S, 2.84 * S);

    const hogbackSpire = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(4.15 * S, 9.4 * S, 4)),
      spireSlateMat
    );
    hogbackSpire.rotation.y = Math.PI * 0.25;
    hogbackSpire.position.y = 25.0 * S;

    const spireDormer = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.85 * S, 1.4 * S, 1.1 * S)),
      stonePaleMat
    );
    spireDormer.position.set(0, 22.8 * S, 1.6 * S);

    const portalFrame = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.8 * S, 4.2 * S, 0.65 * S)),
      stonePaleMat
    );
    portalFrame.position.set(0, 2.1 * S, 4.5 * S);
    const mansionDoor = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.6 * S, 3.5 * S, 0.72 * S)),
      darkTimberMat
    );
    mansionDoor.position.set(0, 1.75 * S, 4.62 * S);

    hogbackGroup.add(
      wingBody,
      wingCornice,
      wingGableRoof,
      centerTower,
      roseFrame,
      roseDisc,
      towerUpper,
      clockDial,
      hogbackSpire,
      spireDormer,
      portalFrame,
      mansionDoor
    );
    group.add(hogbackGroup);

    // Gecko Moria's Towering Gothic Mast-Castle (Center 0, -4.2) + Giant Cogwheel + Side Crane Jib
    const castleGroup = new THREE.Group();
    placeOnThrillerBarkSphere(
      castleGroup,
      THRILLER_BARK_CASTLE_CENTER.x,
      THRILLER_BARK_CASTLE_CENTER.y,
      THRILLER_BARK_CASTLE_CENTER.z,
      globeRadius,
      0
    );

    const castleKeep = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(19.5 * S, 18.5 * S, 15.0 * S)),
      stoneMauveMat
    );
    castleKeep.position.y = 9.25 * S;

    const castleGable = new THREE.Mesh(
      trackGeo(createGableRoofGeometry(20.0 * S, 15.4 * S, 6.2 * S)),
      spireSlateMat
    );
    castleGable.position.y = 18.4 * S;

    // Rose-stone base collar hugging the Central Mast rising out of the Castle
    const mastKeepBase = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(7.2 * S, 8.6 * S, 14.0 * S, 12)),
      stoneMauveMat
    );
    mastKeepBase.position.y = 24.0 * S;
    const mastGallery = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(8.2 * S, 7.4 * S, 3.0 * S, 12)),
      stonePaleMat
    );
    mastGallery.position.y = 31.8 * S;

    castleGroup.add(castleKeep, castleGable, mastKeepBase, mastGallery);

    // Flanking Pointed Gothic Castle Turrets
    for (const [tx, tz, th] of [
      [-9.2, 6.6, 26.0],
      [9.2, 6.6, 26.0],
      [-9.2, -6.6, 30.0],
      [9.2, -6.6, 30.0],
      [-12.8, 0.0, 22.0],
      [12.8, 0.0, 22.0],
    ]) {
      const turret = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(2.2 * S, 2.7 * S, th * S, 10)),
        stoneMauveMat
      );
      turret.position.set(tx * S, th * 0.5 * S, tz * S);
      const tRoof = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(2.85 * S, 8.2 * S, 8)),
        spireSlateMat
      );
      tRoof.position.set(tx * S, (th + 4.0) * S, tz * S);
      castleGroup.add(turret, tRoof);
    }

    // Projecting Starboard Crane / Hanging Cage Jib off Moria's Castle Mast (triller_bark_0ed9b1bc.JPG)
    const craneArm = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(11.5 * S, 1.1 * S, 1.1 * S)),
      ironMat
    );
    craneArm.position.set(9.0 * S, 37.5 * S, 0);
    const craneCage = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.2 * S, 2.2 * S, 4.8 * S, 8)),
      stoneDarkMat
    );
    craneCage.position.set(14.0 * S, 33.8 * S, 0);
    castleGroup.add(craneArm, craneCage);

    // Giant Ghostly Toothed Ferris / Cogwheel Silhouetted in Purple Mist Behind Mansion (triller_bark2_9cc1240e.JPG)
    const ferrisWheel = buildToothedCogwheel(
      12.4 * S,
      0.62 * S,
      18,
      8,
      ironMat,
      trackGeo
    );
    ferrisWheel.position.set(-15.5 * S, 35.5 * S, -6.8 * S);
    ferrisWheelRef = ferrisWheel;
    castleGroup.add(ferrisWheel);

    // Gecko Moria's Throne Hall Portal & Crimson Seat
    const thronePortal = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.4 * S, 6.0 * S, 1.2 * S)),
      spireSlateMat
    );
    thronePortal.position.set(0, 3.0 * S, 7.6 * S);
    const throneSeat = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.2 * S, 3.6 * S, 1.6 * S)),
      peronaPinkMat
    );
    throneSeat.position.set(0, 1.8 * S, 6.8 * S);
    castleGroup.add(thronePortal, throneSeat);
    group.add(castleGroup);

    // Subterranean Oars Freezer Vault beside North-East Castle Wing
    const oarsGroup = new THREE.Group();
    placeOnThrillerBarkSphere(
      oarsGroup,
      THRILLER_BARK_OARS_FREEZER.x,
      THRILLER_BARK_OARS_FREEZER.y,
      THRILLER_BARK_OARS_FREEZER.z,
      globeRadius,
      0.35
    );
    const vaultArch = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(8.5 * S, 8.2 * S, 7.5 * S)),
      stoneDarkMat
    );
    vaultArch.position.y = 4.1 * S;
    const iceBlock = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.6 * S, 6.8 * S, 4.4 * S)),
      iceMat
    );
    iceBlock.position.set(0, 3.4 * S, 2.4 * S);
    const oarsSkull = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(1.7 * S, 10, 8)),
      boneMat
    );
    oarsSkull.position.set(0, 4.3 * S, 2.5 * S);
    for (const hx of [-1.4, 1.4]) {
      const horn = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.45 * S, 2.4 * S, 6)),
        boneMat
      );
      horn.position.set(hx * S, 5.8 * S, 2.5 * S);
      horn.rotation.z = -hx * 0.45;
      oarsGroup.add(horn);
    }
    oarsGroup.add(vaultArch, iceBlock, oarsSkull);
    group.add(oarsGroup);

    // High-Perched Wedding Chapel Wing + Belfry Spire & Cross (triller_bark2_9cc1240e.JPG)
    const chapelGroup = new THREE.Group();
    placeOnThrillerBarkSphere(
      chapelGroup,
      THRILLER_BARK_CHAPEL_CENTER.x,
      THRILLER_BARK_CHAPEL_CENTER.y,
      THRILLER_BARK_CHAPEL_CENTER.z,
      globeRadius,
      0
    );
    const chapelPlinth = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(10.5 * S, 12.0 * S, 15.5 * S)),
      stoneMauveMat
    );
    chapelPlinth.position.y = -6.0 * S;
    const chapelFloor = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(9.6 * S, 0.5 * S, 15.0 * S)),
      stonePaleMat
    );
    const altar = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.2 * S, 2.4 * S, 2.2 * S)),
      boneMat
    );
    altar.position.set(0, 1.2 * S, -5.6 * S);
    const altarCross = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.45 * S, 2.8 * S, 0.35 * S)),
      goldMat
    );
    altarCross.position.set(0, 3.6 * S, -5.8 * S);

    const apseWall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(9.6 * S, 10.5 * S, 1.2 * S)),
      stoneMauveMat
    );
    apseWall.position.set(0, 5.25 * S, -7.2 * S);
    for (const gx of [-2.8, 0.0, 2.8]) {
      const glass = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.7 * S, 6.2 * S, 0.35 * S)),
        stainedGlassMat
      );
      glass.position.set(gx * S, 5.0 * S, -6.5 * S);
      chapelGroup.add(glass);
    }

    const chapelRoof = new THREE.Mesh(
      trackGeo(createGableRoofGeometry(10.2 * S, 15.6 * S, 4.8 * S)),
      spireSlateMat
    );
    chapelRoof.rotation.y = Math.PI * 0.5;
    chapelRoof.position.set(0, 10.5 * S, 0);

    // Tall Chapel Spire & Gothic Cross Finial visible above castle silhouette
    const chapelSpire = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(2.6 * S, 10.5 * S, 4)),
      spireSlateMat
    );
    chapelSpire.rotation.y = Math.PI * 0.25;
    chapelSpire.position.set(0, 19.2 * S, -5.0 * S);
    const chapelCrossV = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.32 * S, 3.4 * S, 0.32 * S)),
      ironMat
    );
    chapelCrossV.position.set(0, 25.8 * S, -5.0 * S);
    const chapelCrossH = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.1 * S, 0.32 * S, 0.32 * S)),
      ironMat
    );
    chapelCrossH.position.set(0, 26.4 * S, -5.0 * S);

    for (const px of [-4.4, 4.4]) {
      for (let pz = -4; pz <= 5; pz += 3) {
        const col = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.38 * S, 0.44 * S, 10.5 * S, 6)),
          stonePaleMat
        );
        col.position.set(px * S, 5.2 * S, pz * S);
        chapelGroup.add(col);
      }
    }
    for (let pz = -2.2; pz <= 3.6; pz += 1.45) {
      for (const sideX of [-2.4, 2.4]) {
        const pew = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(2.6 * S, 0.85 * S, 0.65 * S)),
          darkTimberMat
        );
        pew.position.set(sideX * S, 0.55 * S, pz * S);
        chapelGroup.add(pew);
      }
    }
    chapelGroup.add(
      chapelPlinth,
      chapelFloor,
      altar,
      altarCross,
      apseWall,
      chapelRoof,
      chapelSpire,
      chapelCrossV,
      chapelCrossH
    );
    group.add(chapelGroup);

    // Perona's Whimsical Gothic Tower (Wonder Garden -27.5, -8.5) + Aerial Skybridge
    const peronaGroup = new THREE.Group();
    placeOnThrillerBarkSphere(
      peronaGroup,
      THRILLER_BARK_PERONA_CENTER.x,
      THRILLER_BARK_PERONA_CENTER.y,
      THRILLER_BARK_PERONA_CENTER.z,
      globeRadius,
      0.25
    );
    const pBase = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(4.4 * S, 5.2 * S, 11.0 * S, 12)),
      stoneMauveMat
    );
    pBase.position.y = 5.5 * S;
    const pBand = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(4.65 * S, 4.65 * S, 2.2 * S, 12)),
      peronaPinkMat
    );
    pBand.position.y = 9.8 * S;
    const pDome = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(5.2 * S, 7.6 * S, 12)),
      peronaPinkMat
    );
    pDome.position.y = 14.5 * S;
    const pFinial = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.2 * S, 0.45 * S, 3.2 * S, 6)),
      goldMat
    );
    pFinial.position.y = 19.6 * S;
    peronaGroup.add(pBase, pBand, pDome, pFinial);
    group.add(peronaGroup);

    // Aerial Stone Skybridge linking Central Castle & Perona's Tower over the Inner Moat
    const bridgeMidX =
      (THRILLER_BARK_CASTLE_CENTER.x + THRILLER_BARK_PERONA_CENTER.x) * 0.5;
    const bridgeMidZ =
      (THRILLER_BARK_CASTLE_CENTER.z + THRILLER_BARK_PERONA_CENTER.z) * 0.5;
    const bridgeLen = Math.hypot(
      THRILLER_BARK_PERONA_CENTER.x - THRILLER_BARK_CASTLE_CENTER.x,
      THRILLER_BARK_PERONA_CENTER.z - THRILLER_BARK_CASTLE_CENTER.z
    );
    const bridgeYaw = Math.atan2(
      THRILLER_BARK_PERONA_CENTER.x - THRILLER_BARK_CASTLE_CENTER.x,
      THRILLER_BARK_PERONA_CENTER.z - THRILLER_BARK_CASTLE_CENTER.z
    );
    const skybridge = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.6 * S, 0.85 * S, bridgeLen * S)),
      stoneDarkMat
    );
    placeOnThrillerBarkSphere(
      skybridge,
      bridgeMidX,
      13.8,
      bridgeMidZ,
      globeRadius,
      bridgeYaw
    );
    group.add(skybridge);
  }

  // 6. Dense Sinister Forest (Gnarled Dead Trunks + Dark Mossy-Olive Canopy Clumps), Wonder Plants, Giant Pumpkins & Gloomy Cemetery
  {
    const trees = buildThrillerBarkTrees();
    const deadTrees = trees.filter((t) => t.kind !== 'wonder-plant');
    const wonderPlants = trees.filter((t) => t.kind === 'wonder-plant');
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    if (deadTrees.length > 0) {
      const deadTrunkGeo = trackGeo(
        new THREE.CylinderGeometry(0.22 * S, 0.54 * S, 5.4 * S, 6)
      );
      const deadBranchGeo = trackGeo(
        new THREE.CylinderGeometry(0.1 * S, 0.2 * S, 3.4 * S, 5)
      );
      const canopyGeo = trackGeo(new THREE.DodecahedronGeometry(2.45 * S, 0));
      const canopyMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.92,
          flatShading: true,
        })
      );

      const dtInst = new THREE.InstancedMesh(
        deadTrunkGeo,
        darkTimberMat,
        deadTrees.length
      );
      const dbInst = new THREE.InstancedMesh(
        deadBranchGeo,
        darkTimberMat,
        deadTrees.length * 2
      );
      const dcInst = new THREE.InstancedMesh(
        canopyGeo,
        canopyMat,
        deadTrees.length
      );

      let bIdx = 0;
      deadTrees.forEach((t, i) => {
        placeOnThrillerBarkSphere(
          dummy,
          t.x,
          t.y + 2.5 * t.scale,
          t.z,
          globeRadius,
          t.yaw
        );
        dummy.scale.setScalar(t.scale);
        dummy.updateMatrix();
        dtInst.setMatrixAt(i, dummy.matrix);

        // Dark mossy-olive & spooky charcoal foliage massing (matches triller_bark_0ed9b1bc.JPG)
        placeOnThrillerBarkSphere(
          dummy,
          t.x,
          t.y + 5.2 * t.scale,
          t.z,
          globeRadius,
          t.yaw
        );
        dummy.scale.set(1.18 * t.scale, 0.88 * t.scale, 1.15 * t.scale);
        dummy.updateMatrix();
        dcInst.setMatrixAt(i, dummy.matrix);
        if (i % 3 === 0) {
          col.setRGB(0.13 * t.tint, 0.19 * t.tint, 0.12 * t.tint);
        } else if (i % 3 === 1) {
          col.setRGB(0.16 * t.tint, 0.22 * t.tint, 0.14 * t.tint);
        } else {
          col.setRGB(0.14 * t.tint, 0.14 * t.tint, 0.2 * t.tint);
        }
        dcInst.setColorAt(i, col);

        for (const side of [-1, 1]) {
          placeOnThrillerBarkSphere(
            dummy,
            t.x + side * 0.95 * t.scale,
            t.y + 4.0 * t.scale,
            t.z,
            globeRadius,
            t.yaw + side * 0.6
          );
          dummy.rotateZ(side * 0.85);
          dummy.scale.setScalar(t.scale);
          dummy.updateMatrix();
          dbInst.setMatrixAt(bIdx++, dummy.matrix);
        }
      });
      dtInst.instanceMatrix.needsUpdate = true;
      dbInst.instanceMatrix.needsUpdate = true;
      dcInst.instanceMatrix.needsUpdate = true;
      if (dcInst.instanceColor) dcInst.instanceColor.needsUpdate = true;
      dtInst.computeBoundingSphere();
      dbInst.computeBoundingSphere();
      dcInst.computeBoundingSphere();
      group.add(dtInst, dbInst, dcInst);
    }

    if (wonderPlants.length > 0) {
      const stemGeo = trackGeo(new THREE.CylinderGeometry(0.14 * S, 0.24 * S, 2.4 * S, 5));
      const bulbGeo = trackGeo(new THREE.DodecahedronGeometry(1.15 * S, 0));
      const plantBulbMat = trackMat(
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
      );
      const stInst = new THREE.InstancedMesh(stemGeo, darkTimberMat, wonderPlants.length);
      const blInst = new THREE.InstancedMesh(bulbGeo, plantBulbMat, wonderPlants.length);
      wonderPlants.forEach((w, i) => {
        placeOnThrillerBarkSphere(
          dummy,
          w.x,
          w.y + 1.1 * w.scale,
          w.z,
          globeRadius,
          w.yaw
        );
        dummy.scale.setScalar(w.scale);
        dummy.updateMatrix();
        stInst.setMatrixAt(i, dummy.matrix);

        placeOnThrillerBarkSphere(
          dummy,
          w.x,
          w.y + 2.5 * w.scale,
          w.z,
          globeRadius,
          w.yaw
        );
        dummy.scale.set(w.scale * 1.15, w.scale * 0.85, w.scale * 1.15);
        dummy.updateMatrix();
        blInst.setMatrixAt(i, dummy.matrix);
        blInst.setColorAt(i, col.setHex(i % 2 === 0 ? 0xb4448e : 0x388276));
      });
      stInst.instanceMatrix.needsUpdate = true;
      blInst.instanceMatrix.needsUpdate = true;
      if (blInst.instanceColor) blInst.instanceColor.needsUpdate = true;
      stInst.computeBoundingSphere();
      blInst.computeBoundingSphere();
      group.add(stInst, blInst);
    }

    // Giant Pumpkins
    const pumpkinMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd96818,
        emissive: 0x3b1200,
        emissiveIntensity: 0.25,
        roughness: 0.65,
      })
    );
    const stemGreenMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x2c4e24, roughness: 0.85 })
    );
    for (const p of buildThrillerBarkPumpkins()) {
      const pg = new THREE.Group();
      placeOnThrillerBarkSphere(pg, p.x, p.y, p.z, globeRadius, p.yaw);
      const body = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(1.15 * S * p.scale, 10, 8)),
        pumpkinMat
      );
      body.scale.set(1.15, 0.82, 1.15);
      body.position.y = 0.85 * S * p.scale;
      const stem = new THREE.Mesh(
        trackGeo(
          new THREE.CylinderGeometry(
            0.12 * S * p.scale,
            0.22 * S * p.scale,
            0.55 * S * p.scale,
            5
          )
        ),
        stemGreenMat
      );
      stem.position.y = 1.85 * S * p.scale;
      pg.add(body, stem);
      group.add(pg);
    }

    // Cemetery Graves, Broken Crosses, Cracked Crypts & Open Pits
    const dirtMoundMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x2c221b, roughness: 0.95 })
    );
    for (const g of buildThrillerBarkGraves()) {
      const gg = new THREE.Group();
      placeOnThrillerBarkSphere(gg, g.x, g.y, g.z, globeRadius, g.yaw);
      const sc = g.scale * S;

      if (g.kind === 'headstone' || g.kind === 'open-grave') {
        const stone = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.95 * sc, 1.65 * sc, 0.35 * sc)),
          stonePaleMat
        );
        stone.position.y = 0.78 * sc;
        stone.rotation.set(g.tiltX, 0, g.tiltZ);
        const mound = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(1.25 * sc, 0.28 * sc, 1.95 * sc)),
          dirtMoundMat
        );
        mound.position.set(0, 0.14 * sc, 1.05 * sc);
        gg.add(stone, mound);
      } else if (g.kind === 'cross') {
        const post = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.24 * sc, 1.85 * sc, 0.22 * sc)),
          darkTimberMat
        );
        post.position.y = 0.88 * sc;
        post.rotation.set(g.tiltX, 0, g.tiltZ);
        const bar = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(1.05 * sc, 0.22 * sc, 0.22 * sc)),
          darkTimberMat
        );
        bar.position.set(0, 1.28 * sc, 0);
        bar.rotation.set(g.tiltX, 0, g.tiltZ + 0.15);
        gg.add(post, bar);
      } else {
        const crypt = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(2.1 * sc, 2.2 * sc, 2.6 * sc)),
          stoneDarkMat
        );
        crypt.position.y = 1.1 * sc;
        const cryptRoof = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(1.8 * sc, 1.2 * sc, 4)),
          spireSlateMat
        );
        cryptRoof.rotation.y = Math.PI * 0.25;
        cryptRoof.position.y = 2.75 * sc;
        gg.add(crypt, cryptRoof);
      }
      group.add(gg);
    }

    // Flickering Iron Lantern Posts
    for (const l of buildThrillerBarkLanterns()) {
      const lg = new THREE.Group();
      placeOnThrillerBarkSphere(lg, l.x, l.y, l.z, globeRadius, 0);
      const pole = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.08 * S, 0.12 * S, 2.5 * S, 5)),
        ironMat
      );
      pole.position.y = 1.25 * S;
      const orbMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xffb84c,
          emissive: 0xff8020,
          emissiveIntensity: 0.9,
          roughness: 0.25,
        })
      );
      glowingLanternMats.push(orbMat);
      const orb = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.24 * S, 6, 6)),
        orbMat
      );
      orb.position.y = 2.55 * S;
      lg.add(pole, orb);
      group.add(lg);
    }
  }

  // 7. Nocturnal Creatures, Florian Triangle Mist Banks & Dark Storm Sky Canopy Dome
  {
    const zombieSkinMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x6b8472, roughness: 0.85 })
    );
    const zombieRagMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x453b4c, roughness: 0.9 })
    );
    const beastFurMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x6e4e3a, roughness: 0.88 })
    );
    const kumacyBearMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x7c5a3e, roughness: 0.86 })
    );
    const kumacyPatchMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x241f28, roughness: 0.88 })
    );

    for (const c of buildThrillerBarkCreatures()) {
      const cg = new THREE.Group();
      placeOnThrillerBarkSphere(cg, c.x, c.y, c.z, globeRadius, c.yaw);
      const sc = c.scale * S;

      if (c.kind === 'zombie') {
        const torso = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.55 * sc, 0.8 * sc, 0.32 * sc)),
          zombieRagMat
        );
        torso.position.y = 1.05 * sc;
        const head = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.22 * sc, 7, 6)),
          zombieSkinMat
        );
        head.position.set(0, 1.65 * sc, 0.05 * sc);
        for (const lx of [-0.15, 0.15]) {
          const leg = new THREE.Mesh(
            trackGeo(new THREE.CylinderGeometry(0.08 * sc, 0.07 * sc, 0.68 * sc, 5)),
            zombieRagMat
          );
          leg.position.set(lx * sc, 0.34 * sc, 0);
          const arm = new THREE.Mesh(
            trackGeo(new THREE.CylinderGeometry(0.06 * sc, 0.06 * sc, 0.62 * sc, 5)),
            zombieSkinMat
          );
          arm.rotation.x = Math.PI * 0.45;
          arm.position.set(lx * 2.1 * sc, 1.32 * sc, 0.3 * sc);
          cg.add(leg, arm);
        }
        cg.add(torso, head);
      } else if (c.kind === 'kumacy') {
        const torso = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.88 * sc, 10, 8)),
          kumacyBearMat
        );
        torso.scale.set(1.0, 1.15, 0.9);
        torso.position.y = 1.55 * sc;
        const head = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.62 * sc, 9, 8)),
          kumacyBearMat
        );
        head.position.y = 2.65 * sc;
        const snoutPatch = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.28 * sc, 7, 6)),
          boneMat
        );
        snoutPatch.position.set(0, 2.52 * sc, 0.48 * sc);
        for (const ex of [-0.45, 0.45]) {
          const ear = new THREE.Mesh(
            trackGeo(new THREE.SphereGeometry(0.2 * sc, 6, 5)),
            kumacyPatchMat
          );
          ear.position.set(ex * sc, 3.15 * sc, 0);
          const leg = new THREE.Mesh(
            trackGeo(new THREE.CylinderGeometry(0.22 * sc, 0.2 * sc, 0.85 * sc, 6)),
            kumacyPatchMat
          );
          leg.position.set(ex * 0.78 * sc, 0.42 * sc, 0);
          cg.add(ear, leg);
        }
        cg.add(torso, head, snoutPatch);
      } else {
        const body = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.82 * sc, 0.75 * sc, 1.7 * sc)),
          beastFurMat
        );
        body.position.y = 0.95 * sc;
        const head = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.62 * sc, 0.56 * sc, 0.72 * sc)),
          zombieSkinMat
        );
        head.position.set(0, 1.32 * sc, 1.05 * sc);
        for (const [lx, lz] of [
          [-0.32, 0.55],
          [0.32, 0.55],
          [-0.32, -0.55],
          [0.32, -0.55],
        ]) {
          const leg = new THREE.Mesh(
            trackGeo(new THREE.CylinderGeometry(0.11 * sc, 0.09 * sc, 0.65 * sc, 5)),
            beastFurMat
          );
          leg.position.set(lx * sc, 0.32 * sc, lz * sc);
          cg.add(leg);
        }
        cg.add(body, head);
      }
      group.add(cg);
    }

    // Translucent Florian Triangle Purple/Grey Fog Ribbons hovering across Forest & High Castle
    const mistMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: registerTex(createFlorianMistTexture()),
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    const mistSpots: Array<[number, number, number, number]> = [
      [-28.0, 9.5, 32.0, 38.0],
      [26.0, 9.5, 28.0, 36.0],
      [-24.0, 11.0, -18.0, 36.0],
      [28.0, 11.0, -24.0, 38.0],
      [0.0, 28.0, -12.0, 56.0],
      [0.0, 48.0, -8.0, 62.0],
    ];
    for (const [mx, my, mz, mw] of mistSpots) {
      const mPlane = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(mw * S, mw * S)),
        mistMat
      );
      mPlane.rotation.x = -Math.PI * 0.5;
      const wrapper = new THREE.Group();
      placeOnThrillerBarkSphere(wrapper, mx, my, mz, globeRadius, 0);
      wrapper.add(mPlane);
      group.add(wrapper);
      mistSprites.push(mPlane);
    }

    // Overhead Dark Violet-Indigo Storm Sky Dome (visible when zoomed into Florian Triangle)
    const skyDomeGeo = trackGeo(
      new THREE.SphereGeometry(540.0 * S, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.54)
    );
    skyDomeMat = trackMat(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
        },
        vertexShader: `
          varying vec3 vLocalPos;
          void main() {
            vLocalPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uOpacity;
          varying vec3 vLocalPos;
          void main() {
            vec3 dir = normalize(vLocalPos);
            float h = clamp(dir.y, -0.1, 1.0);
            float angle = atan(dir.z, dir.x);
            float stormWave = 0.5 + 0.5 * sin(angle * 4.0 + uTime * 0.12 + dir.y * 8.0);
            float stormWave2 = 0.5 + 0.5 * cos(angle * 7.0 - uTime * 0.08 + dir.y * 12.0);
            vec3 horizonCol = mix(vec3(0.15, 0.075, 0.25), vec3(0.10, 0.055, 0.18), stormWave);
            vec3 midCol = mix(vec3(0.085, 0.042, 0.15), vec3(0.13, 0.06, 0.22), stormWave2);
            vec3 zenithCol = vec3(0.028, 0.015, 0.058);
            vec3 col = mix(horizonCol, midCol, smoothstep(0.02, 0.35, h));
            col = mix(col, zenithCol, smoothstep(0.32, 0.88, h));
            float horizonFade = smoothstep(-0.08, 0.10, h);
            gl_FragColor = vec4(col, uOpacity * horizonFade * 0.96);
          }
        `,
      })
    );
    const skyDome = new THREE.Mesh(skyDomeGeo, skyDomeMat);
    skyDome.position.y = -6.0 * S;
    skyDome.visible = false;
    skyDome.frustumCulled = false;
    skyDomeRef = skyDome;
    group.add(skyDome);
  }

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number, distToCamera?: number) => {
      glowingLanternMats.forEach((mat, idx) => {
        mat.emissiveIntensity =
          0.65 + 0.35 * Math.sin(elapsed * 5.2 + idx * 1.9);
      });
      mistSprites.forEach((m, idx) => {
        m.rotation.z = elapsed * (idx % 2 === 0 ? 0.04 : -0.035) + idx;
      });
      if (ferrisWheelRef) {
        ferrisWheelRef.rotation.z = elapsed * 0.04;
      }
      if (skyDomeMat && skyDomeRef) {
        const d = distToCamera ?? 10;
        const skyFade = 1 - smoothstep(0.58, 0.90, d);
        skyDomeMat.uniforms.uTime.value = elapsed;
        skyDomeMat.uniforms.uOpacity.value = skyFade;
        skyDomeRef.visible = skyFade > 0.01;
      }
    },
  };
}
