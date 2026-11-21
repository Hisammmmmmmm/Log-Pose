import * as THREE from 'three';
import {
  SHIMOTSUKI_BUILDINGS,
  SHIMOTSUKI_CEMETERY_Y,
  SHIMOTSUKI_DOJO_Y,
  SHIMOTSUKI_FIELD_PLOTS,
  SHIMOTSUKI_GLOBE_SCALE,
  SHIMOTSUKI_LANDMARKS,
  SHIMOTSUKI_QUAY_Y,
  SHIMOTSUKI_RIVER_POINTS,
  SHIMOTSUKI_TREES,
  SHIMOTSUKI_VILLAGE_Y,
  SHIMOTSUKI_WATER_Y,
  SHIMOTSUKI_WORLD_SIZE,
  sampleShimotsukiFieldMask,
  sampleShimotsukiHeight,
  sampleShimotsukiRiverDistance,
  shimotsukiRoadSignedDist,
  toShimotsukiSphereLocal,
} from '../utils/shimotsukiTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = SHIMOTSUKI_GLOBE_SCALE;
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

function createShimotsukiTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = SHIMOTSUKI_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * SHIMOTSUKI_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * SHIMOTSUKI_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const h = sampleShimotsukiHeight(x, z);
      const hx = sampleShimotsukiHeight(x + 0.9, z);
      const hz = sampleShimotsukiHeight(x, z + 0.9);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 1.25, 0, 1);
      const fineNoise = (valueNoise2D(x * 1.2, z * 1.2) - 0.5) * 10;

      let rgb: [number, number, number] = [226, 206, 154];
      let alpha = 0;

      const river = sampleShimotsukiRiverDistance(x, z);
      const inRiverBed = river.dist < river.halfWidth + 0.85 && x > -40.5 && z > -28.0;

      if (h < -4.2 && !inRiverBed) {
        alpha = smoothstep(-5.8, -4.2, h);
        rgb = [154, 146, 118];
      } else {
        alpha = 1;
        // East Blue emerald & spring-green valley hills (matching shimotsuki_3d0ef7d2.png & shimotsuki2_bc97d55c.JPG)
        const elevT = smoothstep(2.4, 13.5, h);
        const valleyGreen = mixRgb([124, 186, 82], [74, 138, 52], elevT);
        const deepToBeach = smoothstep(-3.8, -0.25, h);
        const wetToDry = smoothstep(-0.25, 0.52, h);
        const submergedSand = mixRgb([144, 142, 120], [198, 182, 136], deepToBeach);
        const sandColor = mixRgb(submergedSand, [232, 214, 162], wetToDry);
        const sandToGrass = smoothstep(0.75, 1.75, h);
        rgb = mixRgb(sandColor, valleyGreen, sandToGrass);

        // Grey limestone terraced cliff steps on western oval massif & outer crescent cliffs (keep inner valley overlook hillside lush green!)
        if (h > 3.65) {
          const isInnerOverlookSlope = x > 14.0 && x < 34.0 && z > -2.0 && z < 20.0;
          const cliffSlopeStart = isInnerOverlookSlope ? 0.38 : 0.22;
          const cliffT = smoothstep(cliffSlopeStart, cliffSlopeStart + 0.22, slope) * smoothstep(3.65, 4.5, h);
          const craterRockyTop =
            Math.hypot((x + 39.5) / 5.5, (z + 7.5) / 6.5) < 1.0 && h > 5.2 ? 0.42 : 0;
          const rockMix = clamp(Math.max(cliffT * (isInnerOverlookSlope ? 0.45 : 1.0), craterRockyTop), 0, 1);
          if (rockMix > 0.01) {
            const strata =
              Math.sin(h * 3.1 + x * 0.16) * 10 +
              (valueNoise2D(x * 0.85, z * 0.85) - 0.5) * 12;
            const rockRgb: [number, number, number] = [
              148 + strata,
              146 + strata * 0.95,
              138 + strata * 0.9,
            ];
            rgb = mixRgb(rgb, rockRgb, rockMix);
          }
        }

        // Riverbed gravel/teal silt beneath stream
        if (inRiverBed) {
          const bedT =
            1 - smoothstep(river.halfWidth * 0.25, river.halfWidth + 0.75, river.dist);
          rgb = mixRgb(rgb, [104, 146, 132], bedT * 0.86);
        }

        // Agricultural terraced field plots (warm ochre soil, lush paddy green, tea rows)
        const field = sampleShimotsukiFieldMask(x, z);
        if (field.edgeDist < 0.45 && h > 1.2) {
          const insideT = 1 - smoothstep(-0.18, 0.12, field.edgeDist);
          const bundT =
            smoothstep(-0.18, 0.08, field.edgeDist) *
            (1 - smoothstep(0.08, 0.45, field.edgeDist));
          const furrowWave = Math.sin((x * 0.8 + z * 1.4) * 5.2) * 7;
          let plotColor: [number, number, number] = [148, 198, 78];
          if (field.crop === 'ochre') {
            plotColor = [194 + furrowWave, 152 + furrowWave * 0.8, 86 + furrowWave * 0.5];
          } else if (field.crop === 'tea') {
            plotColor = [96 + furrowWave * 0.7, 156 + furrowWave, 64 + furrowWave * 0.5];
          } else {
            plotColor = [146 + furrowWave * 0.7, 204 + furrowWave, 84 + furrowWave * 0.5];
          }
          rgb = mixRgb(rgb, [132, 114, 78], bundT * 0.85);
          rgb = mixRgb(rgb, plotColor, insideT * 0.95);
        }

        // Cemetery gravel terrace plot (-17.5, +7.4)
        const cemDx = Math.abs(x + 17.5) - 4.7;
        const cemDz = Math.abs(z - 7.4) - 3.6;
        const cemBox = Math.max(cemDx, cemDz);
        if (cemBox < 0.35 && h > 1.5) {
          const cemT = 1 - smoothstep(-0.15, 0.35, cemBox);
          const gravelSpeck = (valueNoise2D(x * 3.4, z * 3.4) - 0.5) * 14;
          rgb = mixRgb(
            rgb,
            [216 + gravelSpeck, 208 + gravelSpeck, 188 + gravelSpeck],
            cemT * 0.92
          );
        }

        // Isshin Dojo sandy rectangular courtyard (centered around (12.8, -2.0), rotated subtly)
        const ddx = x - 12.6;
        const ddz = z + 2.0;
        const dAng = SHIMOTSUKI_LANDMARKS.isshinDojo.yaw;
        const dlx = ddx * Math.cos(dAng) + ddz * Math.sin(dAng);
        const dlz = -ddx * Math.sin(dAng) + ddz * Math.cos(dAng);
        const dojoBox = Math.max(Math.abs(dlx) - 5.4, Math.abs(dlz) - 5.2);
        if (dojoBox < 0.35 && h > 1.5) {
          const dojoT = 1 - smoothstep(-0.15, 0.35, dojoBox);
          const sandGrain = (valueNoise2D(x * 2.5, z * 2.5) - 0.5) * 10;
          rgb = mixRgb(
            rgb,
            [236 + sandGrain, 214 + sandGrain, 166 + sandGrain],
            dojoT * 0.94
          );
        }

        // Winding sandy village dirt trails
        const roadD = shimotsukiRoadSignedDist(x, z);
        if (roadD < 0.45 && h > 0.25 && !(inRiverBed && river.dist < river.halfWidth)) {
          const roadT = 1 - smoothstep(-0.2, 0.45, roadD);
          const dustGrain = (valueNoise2D(x * 2.4, z * 2.4) - 0.5) * 10;
          rgb = mixRgb(
            rgb,
            [232 + dustGrain, 208 + dustGrain, 156 + dustGrain],
            roadT * 0.93
          );
        }
      }

      data[idx] = clamp(Math.round(rgb[0] + (h > -0.15 ? fineNoise : 0)), 0, 255);
      data[idx + 1] = clamp(
        Math.round(rgb[1] + (h > -0.15 ? fineNoise : 0)),
        0,
        255
      );
      data[idx + 2] = clamp(
        Math.round(rgb[2] + (h > -0.15 ? fineNoise : 0)),
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
 * Traditional Japanese Minka / Dojo white-plaster & dark-cedar facade
 * with stone base plinth, lattice koshi / shoji sliding screens.
 */
function createJapaneseFacadeTexture(
  baseColorHex: number,
  isDojo = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const c = new THREE.Color(baseColorHex);
  ctx.fillStyle = `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
  ctx.fillRect(0, 0, 256, 256);

  // Dark weathered stone foundation plinth at bottom
  ctx.fillStyle = '#7e7d75';
  ctx.fillRect(0, 224, 256, 32);
  ctx.fillStyle = 'rgba(30, 28, 25, 0.28)';
  for (let x = 0; x < 256; x += 32) {
    ctx.fillRect(x, 224, 2, 32);
  }

  // Dark cedar timber structural columns & horizontal beams
  ctx.fillStyle = '#472f1e';
  ctx.fillRect(0, 0, 12, 228);
  ctx.fillRect(244, 0, 12, 228);
  ctx.fillRect(82, 0, 8, 228);
  ctx.fillRect(166, 0, 8, 228);
  ctx.fillRect(0, 0, 256, 12);
  ctx.fillRect(0, 108, 256, 10);

  // Lower dark timber wainscot dado planks (namako / ita-kabe)
  ctx.fillStyle = '#634128';
  ctx.fillRect(12, 166, 232, 60);

  // Central Shoji sliding doors & warm cedar lattice
  const shojiStart = isDojo ? 48 : 88;
  const shojiW = isDojo ? 160 : 80;
  ctx.fillStyle = '#efe5ca';
  ctx.fillRect(shojiStart, 118, shojiW, 106);
  ctx.strokeStyle = '#4a311e';
  ctx.lineWidth = 3;
  ctx.strokeRect(shojiStart, 118, shojiW, 106);

  for (let gx = shojiStart + 20; gx < shojiStart + shojiW; gx += 20) {
    ctx.fillStyle = '#5c3c24';
    ctx.fillRect(gx - 1, 118, 2, 106);
  }
  for (let gy = 140; gy < 224; gy += 22) {
    ctx.fillStyle = '#5c3c24';
    ctx.fillRect(shojiStart, gy - 1, shojiW, 2);
  }

  // Upper traditional wooden lattice clerestory windows
  const winBoxes = isDojo
    ? [
        [24, 34, 48, 48],
        [100, 34, 56, 48],
        [184, 34, 48, 48],
      ]
    : [
        [24, 36, 44, 44],
        [104, 36, 48, 44],
        [188, 36, 44, 44],
      ];
  for (const [wx, wy, ww, wh] of winBoxes) {
    ctx.fillStyle = '#4d3522';
    ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = '#ede0be';
    ctx.fillRect(wx + 4, wy + 4, ww - 8, wh - 8);
    ctx.fillStyle = '#573a22';
    ctx.fillRect(wx + ww * 0.5 - 1.5, wy, 3, wh);
    ctx.fillRect(wx + ww * 0.25 - 1, wy, 2, wh);
    ctx.fillRect(wx + ww * 0.75 - 1, wy, 2, wh);
    ctx.fillRect(wx, wy + wh * 0.5 - 1.5, ww, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Ribbed dark blue-slate Japanese Kawara roof tile texture.
 */
function createKawaraTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);

  // Vertical curved tile ribs
  for (let x = 0; x < 256; x += 16) {
    ctx.fillStyle = 'rgba(15, 22, 36, 0.26)';
    ctx.fillRect(x, 0, 4, 256);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(x + 6, 0, 3, 256);
  }
  // Horizontal overlapping tile courses
  for (let y = 0; y < 256; y += 22) {
    ctx.fillStyle = 'rgba(12, 18, 28, 0.22)';
    ctx.fillRect(0, y, 256, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

/**
 * Authentic wooden plaque texture reading `一心道場` (ISSHIN DOJO).
 */
function createIsshinDojoSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 176;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#3b2414';
  ctx.fillRect(0, 0, 512, 176);

  ctx.strokeStyle = '#d6b474';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 156);

  ctx.fillStyle = '#f6ead0';
  ctx.font = 'bold 72px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('一 心 道 場', 256, 76);

  ctx.fillStyle = '#e5cf9a';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText('ISSHIN DOJO · SHIMOTSUKI', 256, 138);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Curved overhanging Japanese hip/gable (`Irimoya` / `Kirizuma`) roof geometry
 * with concave swoop & flared eaves.
 */
function createJapaneseRoofGeo(
  width: number,
  depth: number,
  height: number,
  style: 'kirizuma' | 'irimoya'
): THREE.BufferGeometry {
  const hw = width * 0.5 + 0.52;
  const hd = depth * 0.5 + 0.52;
  const ridgeHalfW = style === 'kirizuma' ? hw : hw * 0.58;
  const midZ = hd * 0.5;
  const midY = height * 0.42;

  const verts = new Float32Array([
    // Front lower swept apron (+Z)
    -hw, -0.08, hd, hw, -0.08, hd, hw * 0.94, midY, midZ,
    -hw, -0.08, hd, hw * 0.94, midY, midZ, -hw * 0.94, midY, midZ,
    // Front upper slope (+Z)
    -hw * 0.94, midY, midZ, hw * 0.94, midY, midZ, ridgeHalfW, height, 0,
    -hw * 0.94, midY, midZ, ridgeHalfW, height, 0, -ridgeHalfW, height, 0,

    // Back lower swept apron (-Z)
    hw, -0.08, -hd, -hw, -0.08, -hd, -hw * 0.94, midY, -midZ,
    hw, -0.08, -hd, -hw * 0.94, midY, -midZ, hw * 0.94, midY, -midZ,
    // Back upper slope (-Z)
    hw * 0.94, midY, -midZ, -hw * 0.94, midY, -midZ, -ridgeHalfW, height, 0,
    hw * 0.94, midY, -midZ, -ridgeHalfW, height, 0, ridgeHalfW, height, 0,

    // Side hips (W & E)
    -hw, -0.08, -hd, -hw, -0.08, hd, -ridgeHalfW, height, 0,
    hw, -0.08, hd, hw, -0.08, -hd, ridgeHalfW, height, 0,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  g.computeVertexNormals();
  return g;
}

function createGableEndTriangleGeo(depth: number, height: number): THREE.BufferGeometry {
  const hd = depth * 0.5;
  const verts = new Float32Array([
    0, 0, hd, 0, 0, -hd, 0, height, 0,
    0, 0, -hd, 0, 0, hd, 0, height, 0,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  g.computeVertexNormals();
  return g;
}

function createWasenHullGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.85); // Squared stern
  shape.bezierCurveTo(0.62, 1.75, 0.72, 0.6, 0.68, -0.4);
  shape.bezierCurveTo(0.55, -1.25, 0.22, -1.9, 0, -2.2); // Upcurved prow
  shape.bezierCurveTo(-0.22, -1.9, -0.55, -1.25, -0.68, -0.4);
  shape.bezierCurveTo(-0.72, 0.6, -0.62, 1.75, 0, 1.85);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 2,
    curveSegments: 14,
  });
  geo.rotateX(Math.PI * 0.5);
  geo.translate(0, 0.45, 0);
  return geo;
}

export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance | null {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const regTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;

  const group = new THREE.Group();
  group.name = 'island-shimotsuki';

  const placeOnSphere = (
    obj: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    yaw = 0
  ) => {
    const sp = toShimotsukiSphereLocal(x, y, z, globeRadius);
    obj.position.set(sp.x, sp.y, sp.z);
    _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, yaw);
    obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    obj.scale.multiplyScalar(S);
  };

  // 1. SCULPTED 192x192 SHIMOTSUKI TERRAIN MESH + 1024x1024 PROCEDURAL CANVAS TEXTURE
  const segs = 192;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(SHIMOTSUKI_WORLD_SIZE, SHIMOTSUKI_WORLD_SIZE, segs, segs)
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const posArr = posAttr.array as Float32Array;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posArr[i * 3];
    const z = posArr[i * 3 + 2];
    const h = sampleShimotsukiHeight(x, z);
    const sp = toShimotsukiSphereLocal(x, h, z, globeRadius);
    posArr[i * 3] = sp.x;
    posArr[i * 3 + 1] = sp.y;
    posArr[i * 3 + 2] = sp.z;
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainTex = regTex(createShimotsukiTerrainTexture(1024));
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.88,
      metalness: 0.03,
      transparent: true,
      alphaTest: 0.04,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // 1B. WINDING SHIMOTSUKI STREAM WATER SURFACE RIBBON (merges seamlessly into Northern Bay)
  {
    const nPts = SHIMOTSUKI_RIVER_POINTS.length;
    const curvePts = SHIMOTSUKI_RIVER_POINTS.map(([rx, rz], idx) => {
      const t = idx / Math.max(1, nPts - 1);
      // Inland stream at +0.08m above sea datum, tapering smoothly down to -0.08m inside the bay estuary
      const mouthDrop = smoothstep(0.66, 1.0, t) * 0.16;
      const waterY = SHIMOTSUKI_WATER_Y + 0.12 - mouthDrop;
      const sp = toShimotsukiSphereLocal(rx, waterY, rz, globeRadius);
      return new THREE.Vector3(sp.x, sp.y, sp.z);
    });
    const riverCurve = new THREE.CatmullRomCurve3(curvePts);
    const ribbonSamples = 58;
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= ribbonSamples; i++) {
      const t = i / ribbonSamples;
      const p = riverCurve.getPoint(t);
      const tan = riverCurve.getTangent(t).normalize();
      const upN = p.clone().add(new THREE.Vector3(0, globeRadius, 0)).normalize();
      const side = new THREE.Vector3().crossVectors(tan, upN).normalize();
      const halfW = (1.45 + smoothstep(0.55, 0.98, t) * 1.4) * S;

      const left = p.clone().addScaledVector(side, -halfW);
      const right = p.clone().addScaledVector(side, halfW);
      positions.push(left.x, left.y, left.z, right.x, right.y, right.z);

      if (i < ribbonSamples) {
        const b = i * 2;
        indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }
    const riverGeo = trackGeo(new THREE.BufferGeometry());
    riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    riverGeo.setIndex(indices);
    riverGeo.computeVertexNormals();
    const riverMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x2482b8,
        roughness: 0.18,
        metalness: 0.1,
        transparent: true,
        opacity: 0.86,
      })
    );
    group.add(new THREE.Mesh(riverGeo, riverMat));
  }

  // Shared Geometries & Calibrated Materials
  const unitBox = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const unitCyl = trackGeo(new THREE.CylinderGeometry(1, 1, 1, 12));
  const unitSphere = trackGeo(new THREE.SphereGeometry(1, 12, 10));
  const kawaraTex = regTex(createKawaraTileTexture());

  const darkCedarMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4b2f1b, roughness: 0.82, metalness: 0.04 })
  );
  const cedarTimberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x865732, roughness: 0.78, metalness: 0.04 })
  );
  const agedWoodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x9c7246, roughness: 0.84, metalness: 0.03 })
  );
  const palePlasterMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf4efe2, roughness: 0.78, metalness: 0.02 })
  );
  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb9b8ae, roughness: 0.86, metalness: 0.03 })
  );
  const graniteSteleMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x8a8c8a, roughness: 0.72, metalness: 0.05 })
  );
  const kuinaGraniteMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xaab0ad, roughness: 0.62, metalness: 0.06 })
  );
  const darkRidgeMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x27303f, roughness: 0.68, metalness: 0.08 })
  );
  const goldTrimMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xd9a83e, roughness: 0.36, metalness: 0.24 })
  );
  const lanternGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffebae,
      emissive: 0xffaf40,
      emissiveIntensity: 0.88,
      roughness: 0.28,
    })
  );
  const earthBundMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7c633b, roughness: 0.94, metalness: 0.02 })
  );
  const strawHayMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xd1af58, roughness: 0.9, metalness: 0.02 })
  );
  const greenCropMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x67a83c, roughness: 0.88, metalness: 0.02 })
  );
  const darkPineNeedlesMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x2b6e35, roughness: 0.84, metalness: 0.02 })
  );
  const lightPineNeedlesMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b8644, roughness: 0.82, metalness: 0.02 })
  );
  const whiteBlossomMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 0.65 })
  );
  const bambooMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c8c42, roughness: 0.72 })
  );

  const roofGeoCache = new Map<string, THREE.BufferGeometry>();
  const getRoofGeo = (
    w: number,
    d: number,
    h: number,
    style: 'kirizuma' | 'irimoya'
  ) => {
    const key = `${w.toFixed(1)}-${d.toFixed(1)}-${h.toFixed(1)}-${style}`;
    let g = roofGeoCache.get(key);
    if (!g) {
      g = trackGeo(createJapaneseRoofGeo(w, d, h, style));
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
          map: kawaraTex,
          roughness: 0.68,
          metalness: 0.08,
        })
      );
      roofMatCache.set(color, m);
    }
    return m;
  };

  const facadeCache = new Map<string, THREE.MeshStandardMaterial>();
  const getFacadeMat = (color: number, isDojo = false) => {
    const key = `${color}-${isDojo ? 'd' : 'm'}`;
    let m = facadeCache.get(key);
    if (!m) {
      const tex = regTex(createJapaneseFacadeTexture(color, isDojo));
      m = trackMat(
        new THREE.MeshStandardMaterial({
          map: tex,
          color: 0xffffff,
          roughness: 0.8,
          metalness: 0.02,
        })
      );
      facadeCache.set(key, m);
    }
    return m;
  };

  // Helper: assemble one traditional Japanese Minka / Storehouse / Courtyard wing
  const addMinkaWing = (
    parent: THREE.Group,
    w: number,
    h: number,
    d: number,
    wallColor: number,
    roofColor: number,
    style: 'kirizuma' | 'irimoya',
    ox = 0,
    oz = 0,
    hasEngawa = false
  ) => {
    const wing = new THREE.Group();
    wing.position.set(ox, 0, oz);

    const plinth = new THREE.Mesh(unitBox, stoneMat);
    plinth.scale.set(w + 0.24, 0.24, d + 0.24);
    plinth.position.y = 0.12;
    wing.add(plinth);

    const body = new THREE.Mesh(unitBox, getFacadeMat(wallColor, false));
    body.scale.set(w, h, d);
    body.position.y = 0.2 + h * 0.5;
    wing.add(body);

    if (hasEngawa) {
      const porch = new THREE.Mesh(unitBox, agedWoodMat);
      porch.scale.set(w * 0.88, 0.18, 0.72);
      porch.position.set(0, 0.24, d * 0.5 + 0.34);
      const step = new THREE.Mesh(unitBox, stoneMat);
      step.scale.set(1.25, 0.12, 0.45);
      step.position.set(0, 0.08, d * 0.5 + 0.76);
      wing.add(porch, step);
    }

    const roofH = Math.min(1.65, d * 0.52);
    const roof = new THREE.Mesh(
      getRoofGeo(w, d, roofH, style),
      getRoofMat(roofColor)
    );
    roof.position.y = 0.2 + h;
    wing.add(roof);

    if (style === 'kirizuma') {
      const gableGeo = trackGeo(createGableEndTriangleGeo(d, roofH));
      const gW = new THREE.Mesh(gableGeo, palePlasterMat);
      gW.position.set(-w * 0.5 - 0.01, 0.2 + h, 0);
      const gE = new THREE.Mesh(gableGeo, palePlasterMat);
      gE.position.set(w * 0.5 + 0.01, 0.2 + h, 0);
      wing.add(gW, gE);
    }

    const ridgeLen = style === 'kirizuma' ? w + 1.05 : w * 0.58 + 0.25;
    const ridgeBeam = new THREE.Mesh(unitBox, darkRidgeMat);
    ridgeBeam.scale.set(ridgeLen, 0.16, 0.24);
    ridgeBeam.position.y = 0.2 + h + roofH + 0.04;
    wing.add(ridgeBeam);

    for (const endX of [-ridgeLen * 0.48, ridgeLen * 0.48]) {
      const finial = new THREE.Mesh(unitBox, darkRidgeMat);
      finial.scale.set(0.18, 0.24, 0.28);
      finial.position.set(endX, 0.2 + h + roofH + 0.14, 0);
      wing.add(finial);
    }

    parent.add(wing);
  };

  // Helper: traditional Japanese Stone Toro Lantern
  const createStoneToro = (): THREE.Group => {
    const toro = new THREE.Group();
    const base = new THREE.Mesh(unitBox, stoneMat);
    base.scale.set(0.42, 0.16, 0.42);
    base.position.y = 0.08;
    const pillar = new THREE.Mesh(unitCyl, stoneMat);
    pillar.scale.set(0.11, 0.72, 0.11);
    pillar.position.y = 0.52;
    const firebox = new THREE.Mesh(unitBox, lanternGlowMat);
    firebox.scale.set(0.24, 0.24, 0.24);
    firebox.position.y = 1.0;
    const roofCap = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.32, 0.22, 4)),
      stoneMat
    );
    roofCap.rotation.y = Math.PI * 0.25;
    roofCap.position.y = 1.24;
    const topKnob = new THREE.Mesh(unitSphere, stoneMat);
    topKnob.scale.setScalar(0.06);
    topKnob.position.y = 1.38;
    toro.add(base, pillar, firebox, roofCap, topKnob);
    return toro;
  };

  // 2. TRADITIONAL JAPANESE VILLAGE HOUSES, STOREHOUSES & U-SHAPED MANOR COMPOUND
  for (const b of SHIMOTSUKI_BUILDINGS) {
    if (b.style === 'dojo') continue; // Built as custom walled hero complex below

    const hGroup = new THREE.Group();
    if (b.style === 'courtyard-u') {
      // Three-wing U-shaped traditional manor compound at NW edge (-20, -10.2)
      addMinkaWing(hGroup, 5.2, b.height, 2.2, b.wallColor, b.roofColor, 'kirizuma', 0, -1.2, true);
      const wingL = new THREE.Group();
      wingL.rotation.y = Math.PI * 0.5;
      addMinkaWing(wingL, 3.0, b.height * 0.92, 1.9, b.wallColor, b.roofColor, 'kirizuma', -1.2, -1.85, false);
      const wingR = new THREE.Group();
      wingR.rotation.y = Math.PI * 0.5;
      addMinkaWing(wingR, 3.0, b.height * 0.92, 1.9, b.wallColor, b.roofColor, 'kirizuma', -1.2, 1.85, false);
      hGroup.add(wingL, wingR);
    } else {
      addMinkaWing(
        hGroup,
        b.width,
        b.height,
        b.depth,
        b.wallColor,
        b.roofColor,
        b.style === 'storehouse' ? 'kirizuma' : 'irimoya',
        0,
        0,
        Boolean(b.hasEngawa)
      );
    }

    if (b.hasLantern) {
      const toro = createStoneToro();
      toro.scale.setScalar(0.85);
      toro.position.set(b.width * 0.42, 0, b.depth * 0.5 + 0.72);
      hGroup.add(toro);
    }

    placeOnSphere(hGroup, b.x, b.y - 0.08, b.z, b.yaw);
    group.add(hGroup);
  }

  // 3. HERO LANDMARK: ISSHIN DOJO (一心道場) + WALLED SANDY COURTYARD + 3 TRAINING WELLS
  {
    const dojoComplex = new THREE.Group();
    const dW = 7.4;
    const dH = 3.1;
    const dD = 5.4;

    // Stone Plinth + Timber Engawa Perimeter Veranda
    const plinth = new THREE.Mesh(unitBox, stoneMat);
    plinth.scale.set(dW + 1.1, 0.36, dD + 1.1);
    plinth.position.y = 0.18;
    dojoComplex.add(plinth);

    const engawa = new THREE.Mesh(unitBox, agedWoodMat);
    engawa.scale.set(dW + 1.25, 0.22, dD + 1.25);
    engawa.position.y = 0.42;
    dojoComplex.add(engawa);

    // Wide wooden entrance stairs facing Courtyard (+Z local -> WNW world)
    for (let s = 0; s < 3; s++) {
      const step = new THREE.Mesh(unitBox, cedarTimberMat);
      step.scale.set(2.5, 0.14, 0.34);
      step.position.set(0, 0.08 + s * 0.12, dD * 0.5 + 0.92 - s * 0.24);
      dojoComplex.add(step);
    }

    // Main Dojo Building Hall
    const dojoBody = new THREE.Mesh(unitBox, getFacadeMat(0xf4efe2, true));
    dojoBody.scale.set(dW, dH, dD);
    dojoBody.position.y = 0.48 + dH * 0.5;
    dojoComplex.add(dojoBody);

    // Grand Double-Tiered Japanese Irimoya Roof with Sweeping Eaves
    const mainRoofH = 2.45;
    const mainRoof = new THREE.Mesh(
      getRoofGeo(dW + 0.8, dD + 0.8, mainRoofH, 'irimoya'),
      getRoofMat(0x45536b)
    );
    mainRoof.position.y = 0.48 + dH;
    dojoComplex.add(mainRoof);

    const lowerPorchEave = new THREE.Mesh(
      getRoofGeo(3.4, 1.4, 0.85, 'kirizuma'),
      getRoofMat(0x45536b)
    );
    lowerPorchEave.position.set(0, 2.86, dD * 0.5 + 0.55);
    dojoComplex.add(lowerPorchEave);

    // Porch Pillars flanking Dojo Entry
    for (const px of [-1.45, 1.45]) {
      const pillar = new THREE.Mesh(unitBox, darkCedarMat);
      pillar.scale.set(0.18, 2.42, 0.18);
      pillar.position.set(px, 1.64, dD * 0.5 + 0.82);
      dojoComplex.add(pillar);
    }

    // Bold `一心道場` Calligraphy Signboard mounted cleanly beneath porch eave
    const signMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: regTex(createIsshinDojoSignTexture()),
        color: 0xffffff,
        roughness: 0.55,
        metalness: 0.05,
      })
    );
    const signBack = new THREE.Mesh(unitBox, darkCedarMat);
    signBack.scale.set(2.48, 0.72, 0.12);
    signBack.position.set(0, 2.26, dD * 0.5 + 0.86);
    const signFace = new THREE.Mesh(unitBox, signMat);
    signFace.scale.set(2.34, 0.64, 0.08);
    signFace.position.set(0, 2.26, dD * 0.5 + 0.92);
    dojoComplex.add(signBack, signFace);

    // Ridge Beam & Golden Onigawara End Finials
    const ridgeW = (dW + 0.8) * 0.58 + 0.4;
    const dojoRidge = new THREE.Mesh(unitBox, darkRidgeMat);
    dojoRidge.scale.set(ridgeW, 0.24, 0.34);
    dojoRidge.position.y = 0.48 + dH + mainRoofH + 0.06;
    dojoComplex.add(dojoRidge);

    for (const gx of [-ridgeW * 0.49, ridgeW * 0.49]) {
      const oni = new THREE.Mesh(unitBox, goldTrimMat);
      oni.scale.set(0.24, 0.36, 0.38);
      oni.position.set(gx, 0.48 + dH + mainRoofH + 0.2, 0);
      dojoComplex.add(oni);
    }

    // Rectangular Tsukiji-bei Courtyard Compound Wall extending forward (+Z local -> WNW)
    const wallY = 0.72;
    const wallH = 1.45;
    const addPerimeterWall = (wx: number, wz: number, ww: number, wd: number) => {
      const wBase = new THREE.Mesh(unitBox, palePlasterMat);
      wBase.scale.set(ww, wallH, wd);
      wBase.position.set(wx, wallY, wz);
      const wCap = new THREE.Mesh(unitBox, darkRidgeMat);
      wCap.scale.set(ww + 0.18, 0.2, wd + 0.18);
      wCap.position.set(wx, wallY + wallH * 0.5 + 0.08, wz);
      dojoComplex.add(wBase, wCap);
    };

    // East/Back wall behind Dojo, South wall, North wall, & Front West Courtyard Wall with Gate Gap
    addPerimeterWall(0, -3.55, 10.6, 0.32); // Back wall behind Dojo
    addPerimeterWall(-5.25, 2.2, 0.32, 11.4); // Side wall (left looking at dojo -> North side)
    addPerimeterWall(5.25, 2.2, 0.32, 11.4); // Side wall (right looking at dojo -> South side)
    addPerimeterWall(-3.25, 7.85, 4.1, 0.32); // Front wall left of entrance gate
    addPerimeterWall(3.25, 7.85, 4.1, 0.32); // Front wall right of entrance gate

    // Open Traditional Timber Dojo Gateway (+Z courtyard edge)
    for (const gx of [-1.2, 1.2]) {
      const gatePost = new THREE.Mesh(unitBox, darkCedarMat);
      gatePost.scale.set(0.26, 2.55, 0.26);
      gatePost.position.set(gx, 1.28, 7.85);
      dojoComplex.add(gatePost);
    }
    const gateRoof = new THREE.Mesh(
      getRoofGeo(3.2, 1.2, 0.72, 'kirizuma'),
      getRoofMat(0x45536b)
    );
    gateRoof.position.set(0, 2.52, 7.85);
    dojoComplex.add(gateRoof);

    // Courtyard Training Wooden Practice Dummies / Weapon Rack & Flanking Stone Lanterns
    const dummyPost = new THREE.Mesh(unitCyl, agedWoodMat);
    dummyPost.scale.set(0.14, 1.35, 0.14);
    dummyPost.position.set(-3.1, 0.68, 4.8);
    const dummyBar = new THREE.Mesh(unitBox, cedarTimberMat);
    dummyBar.scale.set(0.95, 0.1, 0.1);
    dummyBar.position.set(-3.1, 1.05, 4.8);
    dojoComplex.add(dummyPost, dummyBar);

    for (const lx of [-2.2, 2.2]) {
      const l = createStoneToro();
      l.position.set(lx, 0, 5.2);
      dojoComplex.add(l);
    }

    placeOnSphere(
      dojoComplex,
      SHIMOTSUKI_LANDMARKS.isshinDojo.x,
      SHIMOTSUKI_DOJO_Y - 0.06,
      SHIMOTSUKI_LANDMARKS.isshinDojo.z,
      SHIMOTSUKI_LANDMARKS.isshinDojo.yaw
    );
    group.add(dojoComplex);

    // 3 Circular Stone Training Wells / Boulders right outside Dojo South Wall (seen in shimotsuki_3d0ef7d2.png!)
    const wellOffsets: readonly [number, number][] = [
      [12.4, 5.5],
      [13.9, 5.1],
      [15.4, 4.7],
    ];
    for (const [wx, wz] of wellOffsets) {
      const wy = sampleShimotsukiHeight(wx, wz);
      const ring = new THREE.Group();
      const rim = new THREE.Mesh(unitCyl, stoneMat);
      rim.scale.set(0.48, 0.42, 0.48);
      rim.position.y = 0.21;
      const cap = new THREE.Mesh(unitCyl, darkRidgeMat);
      cap.scale.set(0.36, 0.06, 0.36);
      cap.position.y = 0.44;
      ring.add(rim, cap);
      placeOnSphere(ring, wx, wy - 0.04, wz, 0);
      group.add(ring);
    }
  }

  // 4. SHIMOTSUKI JAPANESE CEMETERY (-17.5, +7.4) WITH 4 ROWS OF GRAVESTONES & KUINA'S MONUMENT
  {
    const cemGroup = new THREE.Group();
    const padY = SHIMOTSUKI_CEMETERY_Y;

    // Low stone border wall around cemetery edge
    const borders: readonly [number, number, number, number][] = [
      [0, -3.5, 9.2, 0.22],
      [0, 3.5, 9.2, 0.22],
      [-4.55, 0, 0.22, 7.0],
      [4.55, 1.5, 0.22, 4.0], // Entrance opening on NE corner toward village trail
    ];
    for (const [bx, bz, bw, bd] of borders) {
      const wall = new THREE.Mesh(unitBox, stoneMat);
      wall.scale.set(bw, 0.34, bd);
      wall.position.set(bx, 0.17, bz);
      cemGroup.add(wall);
    }

    // 4 neat horizontal rows: [4, 5, 5, 4] matching shimotsuki_3d0ef7d2.png
    const rows: readonly { zOff: number; xs: readonly number[] }[] = [
      { zOff: -2.2, xs: [-2.4, -0.8, 0.8, 2.4] },
      { zOff: -0.75, xs: [-3.2, -1.6, 0.0, 1.6, 3.2] },
      { zOff: 0.75, xs: [-3.2, -1.6, 0.0, 1.6, 3.2] },
      { zOff: 2.2, xs: [-2.4, -0.8, 0.8, 2.4] },
    ];

    rows.forEach((row, rIdx) => {
      row.xs.forEach((gx, gIdx) => {
        const isKuina = rIdx === 0 && gIdx === 0;
        const grave = new THREE.Group();
        grave.position.set(gx, 0, row.zOff);

        const base = new THREE.Mesh(
          unitBox,
          isKuina ? kuinaGraniteMat : stoneMat
        );
        base.scale.set(isKuina ? 0.84 : 0.62, isKuina ? 0.24 : 0.2, isKuina ? 0.64 : 0.48);
        base.position.y = isKuina ? 0.12 : 0.1;

        const plinthMid = new THREE.Mesh(
          unitBox,
          isKuina ? kuinaGraniteMat : stoneMat
        );
        plinthMid.scale.set(isKuina ? 0.62 : 0.46, 0.12, isKuina ? 0.48 : 0.36);
        plinthMid.position.y = (isKuina ? 0.24 : 0.2) + 0.06;

        const stele = new THREE.Mesh(
          unitBox,
          isKuina ? kuinaGraniteMat : graniteSteleMat
        );
        stele.scale.set(isKuina ? 0.42 : 0.32, isKuina ? 1.12 : 0.8, isKuina ? 0.32 : 0.24);
        stele.position.y = (isKuina ? 0.36 : 0.32) + (isKuina ? 0.56 : 0.4);

        const cap = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(isKuina ? 0.3 : 0.22, 0.14, 4)),
          isKuina ? kuinaGraniteMat : graniteSteleMat
        );
        cap.rotation.y = Math.PI * 0.25;
        cap.position.y = (isKuina ? 0.36 + 1.12 : 0.32 + 0.8) + 0.06;

        const facePanel = new THREE.Mesh(unitBox, darkRidgeMat);
        facePanel.scale.set(isKuina ? 0.26 : 0.18, isKuina ? 0.72 : 0.48, 0.03);
        facePanel.position.set(0, (isKuina ? 0.36 : 0.32) + (isKuina ? 0.56 : 0.4), isKuina ? -0.165 : -0.125);

        grave.add(base, plinthMid, stele, cap, facePanel);

        if (isKuina) {
          // Kuina's Grave: bamboo flower vases & fresh white blossoms on NE/North side facing approaching path + wooden sotoba
          for (const fx of [-0.24, 0.24]) {
            const cup = new THREE.Mesh(unitCyl, bambooMat);
            cup.scale.set(0.06, 0.24, 0.06);
            cup.position.set(fx, 0.36, -0.24);
            const flower = new THREE.Mesh(unitSphere, whiteBlossomMat);
            flower.scale.set(0.13, 0.1, 0.13);
            flower.position.set(fx, 0.52, -0.24);
            grave.add(cup, flower);
          }
          const incenseBowl = new THREE.Mesh(unitCyl, stoneMat);
          incenseBowl.scale.set(0.11, 0.1, 0.11);
          incenseBowl.position.set(0, 0.29, -0.22);
          const sotoba = new THREE.Mesh(unitBox, agedWoodMat);
          sotoba.scale.set(0.1, 1.32, 0.04);
          sotoba.position.set(0.24, 0.68, 0.24);
          sotoba.rotation.z = -0.06;
          grave.add(incenseBowl, sotoba);
        } else if ((rIdx + gIdx) % 3 === 0) {
          const sotoba = new THREE.Mesh(unitBox, agedWoodMat);
          sotoba.scale.set(0.08, 0.96, 0.03);
          sotoba.position.set(-0.14, 0.5, 0.18);
          grave.add(sotoba);
        }

        cemGroup.add(grave);
      });
    });

    const cemToro = createStoneToro();
    cemToro.position.set(3.8, 0, -2.5);
    cemGroup.add(cemToro);

    placeOnSphere(
      cemGroup,
      SHIMOTSUKI_LANDMARKS.cemeteryCenter.x,
      padY - 0.04,
      SHIMOTSUKI_LANDMARKS.cemeteryCenter.z,
      0
    );
    group.add(cemGroup);
  }

  // 5. AGRICULTURAL FIELDS (`CHAMPS`): TERRACE BUNDS, FENCES, CROPS & HAYSTACKS
  {
    for (const plot of SHIMOTSUKI_FIELD_PLOTS) {
      const fGroup = new THREE.Group();
      const py = sampleShimotsukiHeight(plot.cx, plot.cz);

      // Raised earthen terrace edge bunds around field perimeter
      const bundThickness = 0.24;
      const bundHeight = 0.22;
      const bN = new THREE.Mesh(unitBox, earthBundMat);
      bN.scale.set(plot.hw * 2 + 0.2, bundHeight, bundThickness);
      bN.position.set(0, bundHeight * 0.45, -plot.hd);
      const bS = new THREE.Mesh(unitBox, earthBundMat);
      bS.scale.set(plot.hw * 2 + 0.2, bundHeight, bundThickness);
      bS.position.set(0, bundHeight * 0.45, plot.hd);
      const bW = new THREE.Mesh(unitBox, earthBundMat);
      bW.scale.set(bundThickness, bundHeight, plot.hd * 2);
      bW.position.set(-plot.hw, bundHeight * 0.45, 0);
      const bE = new THREE.Mesh(unitBox, earthBundMat);
      bE.scale.set(bundThickness, bundHeight, plot.hd * 2);
      bE.position.set(plot.hw, bundHeight * 0.45, 0);
      fGroup.add(bN, bS, bW, bE);

      // Low rustic post-and-rail wooden fence along northern/eastern border of valley fields
      if (plot.crop !== 'tea') {
        const rail = new THREE.Mesh(unitBox, agedWoodMat);
        rail.scale.set(plot.hw * 1.8, 0.07, 0.07);
        rail.position.set(0, 0.42, -plot.hd);
        fGroup.add(rail);
        for (let fx = -plot.hw * 0.85; fx <= plot.hw * 0.85; fx += 1.4) {
          const post = new THREE.Mesh(unitBox, darkCedarMat);
          post.scale.set(0.09, 0.5, 0.09);
          post.position.set(fx, 0.25, -plot.hd);
          fGroup.add(post);
        }
      }

      // 3D crop rows or golden plowed ridges inside plot
      const rowCount = 4;
      for (let r = 0; r < rowCount; r++) {
        const rz = -plot.hd * 0.65 + (r / (rowCount - 1)) * (plot.hd * 1.3);
        const ridge = new THREE.Mesh(
          unitBox,
          plot.crop === 'ochre' ? earthBundMat : greenCropMat
        );
        ridge.scale.set(plot.hw * 1.65, plot.crop === 'ochre' ? 0.14 : 0.24, 0.34);
        ridge.position.set(0, plot.crop === 'ochre' ? 0.07 : 0.12, rz);
        fGroup.add(ridge);
      }

      // Cozy farm haystack & harvest crates on ochre plots
      if (plot.crop === 'ochre') {
        const hay = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(0.55, 0.85, 8)),
          strawHayMat
        );
        hay.position.set(plot.hw * 0.65, 0.42, plot.hd * 0.62);
        fGroup.add(hay);
      }

      placeOnSphere(fGroup, plot.cx, py - 0.03, plot.cz, plot.yaw);
      group.add(fGroup);
    }
  }

  // 6. NORTHERN HARBOR TIMBER QUAY, TWIN WOODEN PIERS & MOORED FISHING BOATS (WASEN)
  const bobbingBoats: {
    group: THREE.Group;
    basePos: THREE.Vector3;
    baseNormal: THREE.Vector3;
    phase: number;
  }[] = [];
  {
    // Quay Seawall & Boardwalk (x: 11.2..23.6, z: -15.6) plunging deeply into sea!
    const quayWall = new THREE.Mesh(unitBox, stoneMat);
    quayWall.scale.set(12.4, 6.8, 1.8);
    placeOnSphere(quayWall, 17.4, SHIMOTSUKI_QUAY_Y - 3.3, -15.6, 0);
    group.add(quayWall);

    const boardwalk = new THREE.Mesh(unitBox, agedWoodMat);
    boardwalk.scale.set(12.4, 0.22, 1.9);
    placeOnSphere(boardwalk, 17.4, SHIMOTSUKI_QUAY_Y + 0.12, -15.7, 0);
    group.add(boardwalk);

    // Twin Parallel Wooden Piers jutting North (-Z) into Harbor Bay
    const pierSpecs: readonly [number, number, number][] = [
      [13.5, -20.2, 8.0], // Longer West Pier
      [19.8, -19.4, 6.4], // Slightly shorter East Pier
    ];
    for (const [px, pz, pLen] of pierSpecs) {
      const pier = new THREE.Group();
      const deck = new THREE.Mesh(unitBox, agedWoodMat);
      deck.scale.set(1.75, 0.2, pLen);
      deck.position.y = SHIMOTSUKI_QUAY_Y + 0.12;
      pier.add(deck);

      // Deep vertical wooden pilings plunging to -5.5m well below ocean wave sag
      for (const sx of [-0.72, 0.72]) {
        for (const sz of [-pLen * 0.42, -pLen * 0.14, pLen * 0.14, pLen * 0.42]) {
          const piling = new THREE.Mesh(unitCyl, darkCedarMat);
          piling.scale.set(0.14, 6.8, 0.14);
          piling.position.set(sx, SHIMOTSUKI_QUAY_Y - 2.9, sz);
          const bollard = new THREE.Mesh(unitCyl, darkCedarMat);
          bollard.scale.set(0.12, 0.35, 0.12);
          bollard.position.set(sx, SHIMOTSUKI_QUAY_Y + 0.36, sz);
          pier.add(piling, bollard);
        }
      }
      placeOnSphere(pier, px, 0, pz, 0);
      group.add(pier);
    }

    // Two Traditional Japanese Wooden Fishing Boats (Wasen) resting naturally in the bay water
    const wasenHullGeo = trackGeo(createWasenHullGeo());
    const boatCoords: readonly [number, number, number, number][] = [
      [
        SHIMOTSUKI_LANDMARKS.fishingBoatWest.x,
        SHIMOTSUKI_LANDMARKS.fishingBoatWest.y,
        SHIMOTSUKI_LANDMARKS.fishingBoatWest.z,
        0.28,
      ],
      [
        SHIMOTSUKI_LANDMARKS.fishingBoatEast.x,
        SHIMOTSUKI_LANDMARKS.fishingBoatEast.y,
        SHIMOTSUKI_LANDMARKS.fishingBoatEast.z,
        -0.42,
      ],
    ];
    boatCoords.forEach(([bx, by, bz, yaw], idx) => {
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(wasenHullGeo, agedWoodMat);
      const rail = new THREE.Mesh(unitBox, darkCedarMat);
      rail.scale.set(1.15, 0.12, 0.24);
      rail.position.set(0, 0.48, 0.2);
      const canopy = new THREE.Mesh(unitBox, strawHayMat);
      canopy.scale.set(0.95, 0.45, 1.15);
      canopy.position.set(0, 0.72, 0.65);
      const oar = new THREE.Mesh(unitBox, cedarTimberMat);
      oar.scale.set(0.08, 0.08, 2.2);
      oar.position.set(0.68, 0.5, 0.3);
      oar.rotation.y = 0.28;
      boat.add(hull, rail, canopy, oar);
      placeOnSphere(boat, bx, by, bz, yaw);
      group.add(boat);
      const basePos = boat.position.clone();
      const baseNormal = new THREE.Vector3(basePos.x, basePos.y + globeRadius, basePos.z).normalize();
      bobbingBoats.push({ group: boat, basePos, baseNormal, phase: idx * 2.1 });
    });
  }

  // 7. ARCHED WOODEN BRIDGE, STONE TORO LANTERNS, VILLAGE WELL & ICONIC RIDGE PINE OVERLOOK
  {
    // Arched Wooden Bridge at (2.5, -8.5)
    const bridge = new THREE.Group();
    const span = 7.8;
    const deckSegs = 10;
    for (let i = 0; i < deckSegs; i++) {
      const t = (i + 0.5) / deckSegs;
      const lx = (t - 0.5) * span;
      const ly = Math.sin(t * Math.PI) * 0.78;
      const plank = new THREE.Mesh(unitBox, agedWoodMat);
      plank.scale.set(span / deckSegs + 0.06, 0.2, 2.45);
      plank.position.set(lx, ly, 0);
      bridge.add(plank);

      for (const rz of [-1.1, 1.1]) {
        const post = new THREE.Mesh(unitBox, darkCedarMat);
        post.scale.set(0.14, 0.76, 0.14);
        post.position.set(lx, ly + 0.42, rz);
        const rail = new THREE.Mesh(unitBox, darkCedarMat);
        rail.scale.set(span / deckSegs + 0.1, 0.12, 0.14);
        rail.position.set(lx, ly + 0.78, rz);
        bridge.add(post, rail);
      }
    }
    for (const px of [-2.0, 2.0]) {
      for (const pz of [-1.0, 1.0]) {
        const piling = new THREE.Mesh(unitCyl, darkCedarMat);
        piling.scale.set(0.18, 5.8, 0.18);
        piling.position.set(px, -2.6, pz);
        bridge.add(piling);
      }
    }
    placeOnSphere(bridge, SHIMOTSUKI_LANDMARKS.riverBridge.x, SHIMOTSUKI_VILLAGE_Y + 0.08, SHIMOTSUKI_LANDMARKS.riverBridge.z, -0.36);
    group.add(bridge);

    // Traditional Village Stone Well
    const well = new THREE.Group();
    const wRim = new THREE.Mesh(unitCyl, stoneMat);
    wRim.scale.set(0.72, 0.6, 0.72);
    wRim.position.y = 0.3;
    const wRoof = new THREE.Mesh(
      getRoofGeo(1.4, 1.2, 0.65, 'kirizuma'),
      getRoofMat(0x45536b)
    );
    wRoof.position.y = 1.45;
    for (const px of [-0.55, 0.55]) {
      const p = new THREE.Mesh(unitBox, darkCedarMat);
      p.scale.set(0.12, 1.15, 0.12);
      p.position.set(px, 0.9, 0);
      well.add(p);
    }
    well.add(wRim, wRoof);
    placeOnSphere(well, SHIMOTSUKI_LANDMARKS.villageWell.x, SHIMOTSUKI_VILLAGE_Y, SHIMOTSUKI_LANDMARKS.villageWell.z, 0.4);
    group.add(well);

    // Sculpted Windswept Gnarled Japanese Pine (`Matsu`) framing right-hand upper overlook like shimotsuki2_bc97d55c.JPG!
    const cliffPine = new THREE.Group();
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.4, -0.25, 0.4),
      new THREE.Vector3(0.15, 1.35, 0.25),
      new THREE.Vector3(-0.75, 2.7, -0.05),
      new THREE.Vector3(-2.15, 3.05, -0.25),
      new THREE.Vector3(-3.65, 2.95, -0.35),
    ]);
    const mainTrunk = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(trunkCurve, 14, 0.25, 8, false)),
      darkCedarMat
    );
    const subBranchCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.1, 2.8, -0.1),
      new THREE.Vector3(-1.25, 3.55, 0.45),
      new THREE.Vector3(-1.55, 3.8, 0.9),
    ]);
    const subBranch = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(subBranchCurve, 8, 0.13, 7, false)),
      darkCedarMat
    );
    cliffPine.add(mainTrunk, subBranch);

    const pinePads: readonly [number, number, number, number, number, number, boolean][] = [
      [-3.85, 3.18, -0.38, 2.3, 0.54, 1.7, true],
      [-2.65, 3.25, -0.15, 1.7, 0.46, 1.35, false],
      [-1.55, 3.92, 0.9, 1.6, 0.46, 1.28, true],
      [-0.75, 3.22, 0.35, 1.15, 0.38, 1.0, false],
    ];
    for (const [px, py, pz, sx, sy, sz, dark] of pinePads) {
      const pad = new THREE.Mesh(
        unitSphere,
        dark ? darkPineNeedlesMat : lightPineNeedlesMat
      );
      pad.scale.set(sx, sy, sz);
      pad.position.set(px, py, pz);
      cliffPine.add(pad);
    }

    placeOnSphere(
      cliffPine,
      SHIMOTSUKI_LANDMARKS.pineOverlook.x,
      sampleShimotsukiHeight(
        SHIMOTSUKI_LANDMARKS.pineOverlook.x,
        SHIMOTSUKI_LANDMARKS.pineOverlook.z
      ) - 0.1,
      SHIMOTSUKI_LANDMARKS.pineOverlook.z,
      0.52
    );
    group.add(cliffPine);
  }

  // 8. INSTANCED BROADLEAF & JAPANESE CEDAR/PINE WOODLAND HILLSIDE FORESTS
  const leafMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84, metalness: 0.02 })
  );
  const broadleafTrees = SHIMOTSUKI_TREES.filter((t) => t.kind === 'broadleaf');
  const pineTrees = SHIMOTSUKI_TREES.filter((t) => t.kind === 'pine');

  if (broadleafTrees.length > 0) {
    const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.15, 0.23, 1.3, 7));
    trunkGeo.translate(0, 0.65, 0);
    const crownMainGeo = trackGeo(new THREE.IcosahedronGeometry(1.08, 1));
    crownMainGeo.translate(0, 2.02, 0);
    const crownSideGeo = trackGeo(new THREE.IcosahedronGeometry(0.8, 1));
    crownSideGeo.translate(0.5, 1.74, 0.34);

    const tInst = new THREE.InstancedMesh(trunkGeo, cedarTimberMat, broadleafTrees.length);
    const c1Inst = new THREE.InstancedMesh(crownMainGeo, leafMat, broadleafTrees.length);
    const c2Inst = new THREE.InstancedMesh(crownSideGeo, leafMat, broadleafTrees.length);

    broadleafTrees.forEach((t, idx) => {
      const sp = toShimotsukiSphereLocal(t.x, t.y, t.z, globeRadius);
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
      _tmpColor.setRGB(0.14 * t.tint, 0.49 * t.tint, 0.17 * t.tint);
      c1Inst.setColorAt(idx, _tmpColor);
      _tmpColor.setRGB(0.1 * t.tint, 0.4 * t.tint, 0.14 * t.tint);
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
    const pTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.18, 1.08, 6));
    pTrunkGeo.translate(0, 0.54, 0);
    const tier1Geo = trackGeo(new THREE.ConeGeometry(0.92, 1.48, 7));
    tier1Geo.translate(0, 1.48, 0);
    const tier2Geo = trackGeo(new THREE.ConeGeometry(0.65, 1.24, 7));
    tier2Geo.translate(0, 2.28, 0);

    const ptInst = new THREE.InstancedMesh(pTrunkGeo, cedarTimberMat, pineTrees.length);
    const c1Inst = new THREE.InstancedMesh(tier1Geo, leafMat, pineTrees.length);
    const c2Inst = new THREE.InstancedMesh(tier2Geo, leafMat, pineTrees.length);

    pineTrees.forEach((t, idx) => {
      const sp = toShimotsukiSphereLocal(t.x, t.y, t.z, globeRadius);
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
      _tmpColor.setRGB(0.09 * t.tint, 0.39 * t.tint, 0.16 * t.tint);
      c1Inst.setColorAt(idx, _tmpColor);
      _tmpColor.setRGB(0.12 * t.tint, 0.45 * t.tint, 0.19 * t.tint);
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

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      for (const b of bobbingBoats) {
        const bob = Math.sin(elapsed * 1.45 + b.phase) * 0.00004;
        b.group.position.copy(b.basePos).addScaledVector(b.baseNormal, bob);
      }
    },
  };
}
