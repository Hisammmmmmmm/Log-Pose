import * as THREE from 'three';
import {
  LITTLE_GARDEN_FOLIAGE,
  LITTLE_GARDEN_GLOBE_SCALE,
  LITTLE_GARDEN_JUNGLE_FLOOR_Y,
  LITTLE_GARDEN_LAKE,
  LITTLE_GARDEN_LAKE_WATER_Y,
  LITTLE_GARDEN_LANDMARKS,
  LITTLE_GARDEN_MR3_CLEARING_Y,
  LITTLE_GARDEN_SKELETONS,
  LITTLE_GARDEN_VOLCANOES,
  LITTLE_GARDEN_WORLD_SIZE,
  littleGardenLakeEllipseDist,
  littleGardenPathSignedDist,
  sampleLittleGardenHeight,
  toLittleGardenSphereLocal,
  type LittleGardenSkeletonSpec,
  type LittleGardenVolcanoSpec,
} from '../utils/littleGardenTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = LITTLE_GARDEN_GLOBE_SCALE;
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

function createLittleGardenTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = LITTLE_GARDEN_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * LITTLE_GARDEN_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * LITTLE_GARDEN_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const h = sampleLittleGardenHeight(x, z);
      const hx = sampleLittleGardenHeight(x + 0.9, z);
      const hz = sampleLittleGardenHeight(x, z + 0.9);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 1.15, 0, 1);
      const fineGrain = (valueNoise2D(x * 1.4, z * 1.4) - 0.5) * 14;
      const mossPatch = valueNoise2D(x * 0.16 + 3.2, z * 0.16 - 4.7);

      let rgb: [number, number, number] = [232, 214, 158];
      let alpha = 0;

      if (h < -3.6) {
        alpha = smoothstep(-5.2, -3.6, h);
        rgb = [144, 152, 134];
      } else {
        alpha = 1;
        // Underwater sandy coral shoals -> golden beaches -> prehistoric jungle canopy grass
        const shallowT = smoothstep(-3.6, -0.35, h);
        const wetSandT = smoothstep(-0.35, 0.55, h);
        const reefCol = mixRgb([122, 154, 146], [202, 192, 146], shallowT);
        const sandCol = mixRgb(reefCol, [238, 222, 168], wetSandT);

        // Rich Jurassic leaf greens varying with elevation and moisture noise
        const elevT = smoothstep(2.4, 7.2, h);
        const baseJungle = mixRgb([108, 174, 62], [68, 132, 44], elevT);
        const lushJungle = mixRgb(baseJungle, [126, 188, 66], mossPatch * 0.65);

        const beachToGrass = smoothstep(1.15, 2.25, h);
        rgb = mixRgb(sandCol, lushJungle, beachToGrass);

        // Steep cliff edge brown-tan earth accents
        const cliffT = smoothstep(0.28, 0.62, slope) * smoothstep(1.8, 3.0, h);
        if (cliffT > 0.01) {
          rgb = mixRgb(rgb, [138, 126, 86], cliffT * 0.72);
        }

        // Volcanic warm terracotta/ash ground skirts around each volcano
        for (const v of LITTLE_GARDEN_VOLCANOES) {
          const vd = Math.hypot(x - v.x, z - v.z);
          if (vd < v.baseRadius * 1.45) {
            const ashT = 1 - smoothstep(v.baseRadius * 0.7, v.baseRadius * 1.45, vd);
            rgb = mixRgb(rgb, [158, 118, 88], ashT * 0.68);
          }
        }

        // Lakefront golden-tan sandy rim around the elongated turquoise lake
        const lakeEll = littleGardenLakeEllipseDist(x, z);
        if (lakeEll < 1.48) {
          const lakeSandBand = 1 - smoothstep(1.06, 1.48, lakeEll);
          rgb = mixRgb(rgb, [234, 218, 158], lakeSandBand * 0.88);
          if (lakeEll < 1.04) {
            const siltT = 1 - smoothstep(0.65, 1.04, lakeEll);
            rgb = mixRgb(rgb, [92, 166, 168], siltT * 0.85);
          }
        }

        // Mr. 3's sunlit clearing bright green meadow floor (matching Image 3)
        const mr3Dist = Math.hypot(
          (x - LITTLE_GARDEN_LANDMARKS.mr3WaxHouse.x) / 10.5,
          (z - LITTLE_GARDEN_LANDMARKS.mr3WaxHouse.z) / 9.5
        );
        if (mr3Dist < 1.0 && h > 2.2) {
          const gladeT = 1 - smoothstep(0.45, 1.0, mr3Dist);
          rgb = mixRgb(rgb, [142, 198, 72], gladeT * 0.75);
        }

        // Unmistakable bright sunlit sandy-ochre dirt paths connecting island landmarks
        const pDist = littleGardenPathSignedDist(x, z);
        if (pDist < 0.75 && h > 0.65 && lakeEll > 1.02) {
          const borderT =
            smoothstep(-0.2, 0.25, pDist) * (1 - smoothstep(0.25, 0.75, pDist));
          const roadT = 1 - smoothstep(-0.2, 0.38, pDist);
          const dustSpeck = (valueNoise2D(x * 2.8, z * 2.8) - 0.5) * 14;
          rgb = mixRgb(rgb, [156, 160, 86], borderT * 0.55);
          rgb = mixRgb(
            rgb,
            [236 + dustSpeck, 216 + dustSpeck, 154 + dustSpeck],
            roadT * 0.95
          );
        }
      }

      data[idx] = clamp(Math.round(rgb[0] + (h > 0 ? fineGrain : 0)), 0, 255);
      data[idx + 1] = clamp(Math.round(rgb[1] + (h > 0 ? fineGrain : 0)), 0, 255);
      data[idx + 2] = clamp(Math.round(rgb[2] + (h > 0 ? fineGrain : 0)), 0, 255);
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

function createSkeletonBoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#f4f1e6');
  grad.addColorStop(0.55, '#e8e4d4');
  grad.addColorStop(1, '#cfcbb8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle prehistoric bone weathering fissures & moss tint speckles
  for (let i = 0; i < 42; i++) {
    const x = (i * 59) % 240;
    const y = (i * 83) % 240;
    ctx.strokeStyle = 'rgba(110, 108, 96, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 12 + (i % 9), y + 20 + (i % 14));
    ctx.stroke();
  }
  for (let i = 0; i < 36; i++) {
    const x = (i * 41 + 17) % 244;
    const y = (i * 71 + 29) % 244;
    ctx.fillStyle = 'rgba(92, 146, 62, 0.16)';
    ctx.beginPath();
    ctx.arc(x, y, 6 + (i % 8), 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createVolcanoRockTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Terracotta rust-red & warm ochre striated volcanic slopes (matching Images 1 & 2)
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#a84736');
  grad.addColorStop(0.45, '#be6249');
  grad.addColorStop(0.85, '#c97e5c');
  grad.addColorStop(1, '#946246');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Vertical erosion gullies & pale mineral streaks
  for (let x = 0; x < 256; x += 12) {
    ctx.fillStyle = x % 24 === 0 ? 'rgba(68, 24, 18, 0.26)' : 'rgba(235, 188, 156, 0.22)';
    ctx.fillRect(x, 0, 4, 256);
  }
  for (let i = 0; i < 65; i++) {
    const x = (i * 47) % 250;
    const y = (i * 73) % 240;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(84, 34, 26, 0.20)' : 'rgba(220, 152, 120, 0.18)';
    ctx.fillRect(x, y, 6, 18);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createWaxHouseTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Pale cool candle-wax white with subtle vertical light shading (matching Image 3)
  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#f6fbfe');
  grad.addColorStop(0.5, '#e8f2f8');
  grad.addColorStop(1, '#d4e4ef');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Soft vertical wax drip sheen folds
  for (let i = 0; i < 16; i++) {
    const x = (i * 19 + 7) % 248;
    const y = 18 + ((i * 37) % 140);
    const h = 36 + ((i * 23) % 72);
    ctx.strokeStyle = 'rgba(130, 154, 174, 0.24)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 4, y + h * 0.35, x + 5, y + h * 0.7, x, y + h);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createRedTippedLeafTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0.0, '#2c7e31');
  grad.addColorStop(0.55, '#59b242');
  grad.addColorStop(0.78, '#b5404d');
  grad.addColorStop(1.0, '#cc2c42');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 128);

  // Center leaf midrib vein
  ctx.strokeStyle = 'rgba(235, 248, 198, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(32, 126);
  ctx.lineTo(32, 6);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function buildFlutedVolcanoGeo(spec: LittleGardenVolcanoSpec): THREE.BufferGeometry {
  const radialSegs = Math.max(24, spec.ridgeCount * 3);
  const heightSegs = 12;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= heightSegs; iy++) {
    const v = iy / heightSegs;
    // Concave volcano slope tapering from flared base up to jagged crater rim
    const rFactor = Math.pow(1 - v, 0.68);
    const baseR =
      spec.craterRadius + (spec.baseRadius - spec.craterRadius) * rFactor;
    const y = v * spec.height;

    for (let ix = 0; ix <= radialSegs; ix++) {
      const u = ix / radialSegs;
      const theta = u * Math.PI * 2;
      const flute =
        Math.sin(theta * spec.ridgeCount + v * 1.1) *
        (0.14 + 0.08 * (1 - v)) *
        spec.baseRadius;
      const cragNoise =
        (valueNoise2D(Math.cos(theta) * 2.5 + v * 3, Math.sin(theta) * 2.5) - 0.5) *
        0.55;
      const rimDip = v > 0.88 ? Math.sin(theta * 5 + spec.yaw) * 0.32 : 0;
      const r = Math.max(spec.craterRadius * 0.82, baseR + flute + cragNoise);

      positions.push(Math.cos(theta) * r, y + rimDip, Math.sin(theta) * r);
      uvs.push(u * 2, 1 - v);
    }
  }

  for (let iy = 0; iy < heightSegs; iy++) {
    for (let ix = 0; ix < radialSegs; ix++) {
      const a = iy * (radialSegs + 1) + ix;
      const b = a + 1;
      const c = a + (radialSegs + 1);
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  // Inner sunken volcanic crater bowl
  const rimStartIdx = positions.length / 3;
  for (let ix = 0; ix <= radialSegs; ix++) {
    const u = ix / radialSegs;
    const theta = u * Math.PI * 2;
    const r = spec.craterRadius * 0.92;
    positions.push(Math.cos(theta) * r, spec.height * 0.96, Math.sin(theta) * r);
    uvs.push(u, 0.08);
  }
  const pitCenterIdx = positions.length / 3;
  positions.push(0, spec.height * 0.72, 0);
  uvs.push(0.5, 0.0);
  for (let ix = 0; ix < radialSegs; ix++) {
    indices.push(rimStartIdx + ix, pitCenterIdx, rimStartIdx + ix + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds one colossal mossy monster skeleton (with thick arched white ribs,
 * sculpted jagged anterior skull dome, dorsal spine crest, mossy hill-top patches,
 * and a hollow dark-blue cavernous interior visible through every rib arch).
 */
function buildGiantSkeletonGroup(
  spec: LittleGardenSkeletonSpec,
  boneMat: THREE.Material,
  darkCavernMat: THREE.Material,
  mossMat: THREE.Material,
  lightMossMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const skel = new THREE.Group();
  const halfLen = spec.length * 0.5;
  const halfWid = spec.width * 0.5;
  const hMax = spec.height;

  // 1. Hollow Dark-Blue Cavernous Interior Shell tucked cleanly inside ribcage arches
  const cavernSegsU = 16;
  const cavernSegsV = 10;
  const cPos: number[] = [];
  const cIdx: number[] = [];
  for (let iu = 0; iu <= cavernSegsU; iu++) {
    const u = iu / cavernSegsU; // 0.14..0.88 inside ribcage behind skull
    const tCage = 0.14 + u * 0.74;
    const along = (tCage - 0.5) * spec.length;
    const archEnvelope = Math.sin(clamp(tCage, 0.08, 0.92) * Math.PI);
    const rx = halfWid * (0.48 + 0.34 * archEnvelope);
    const ry = hMax * (0.42 + 0.38 * archEnvelope);
    for (let iv = 0; iv <= cavernSegsV; iv++) {
      const ang = (iv / cavernSegsV) * Math.PI;
      const xLocal = Math.cos(ang) * rx;
      const yLocal = Math.sin(ang) * ry - 0.4;
      cPos.push(along, yLocal, xLocal);
    }
  }
  for (let iu = 0; iu < cavernSegsU; iu++) {
    for (let iv = 0; iv < cavernSegsV; iv++) {
      const a = iu * (cavernSegsV + 1) + iv;
      const b = a + 1;
      const c = a + (cavernSegsV + 1);
      const d = c + 1;
      cIdx.push(a, b, c, b, d, c);
    }
  }
  const cavernGeo = trackGeo(new THREE.BufferGeometry());
  cavernGeo.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
  cavernGeo.setIndex(cIdx);
  cavernGeo.computeVertexNormals();
  const cavernMesh = new THREE.Mesh(cavernGeo, darkCavernMat);
  skel.add(cavernMesh);

  // 2. Massive Dorsal Spine Ridge Curve running continuously from Skull Crest to Tail
  const spinePts: THREE.Vector3[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const x = (t - 0.5) * spec.length;
    const envelope = Math.sin(clamp(t * 0.94 + 0.03, 0, 1) * Math.PI);
    const y = hMax * (0.34 + 0.64 * Math.pow(envelope, 0.72));
    const zWave = Math.sin(t * Math.PI * 1.5) * 0.45;
    spinePts.push(new THREE.Vector3(x, y, zWave));
  }
  const spineCurve = new THREE.CatmullRomCurve3(spinePts);
  const spineGeo = trackGeo(
    new THREE.TubeGeometry(spineCurve, 28, spec.width * 0.145, 9, false)
  );
  skel.add(new THREE.Mesh(spineGeo, boneMat));

  // Dorsal Vertebrae Knobs & Shoulder Ridge Plates
  for (let i = 1; i < 13; i++) {
    const t = i / 13;
    const pt = spineCurve.getPoint(t);
    const knob = new THREE.Mesh(
      trackGeo(new THREE.DodecahedronGeometry(spec.width * 0.11, 1)),
      boneMat
    );
    knob.scale.set(1.25, 0.85, 1.35);
    knob.position.copy(pt).add(new THREE.Vector3(0, 0.65, 0));
    skel.add(knob);
  }

  // 3. Sculpted Thick White Rib Arches Framing the Deep-Blue Cavern Openings
  for (let i = 0; i < spec.ribPairs; i++) {
    const t = 0.24 + (i / Math.max(1, spec.ribPairs - 1)) * 0.68;
    const xAlong = (t - 0.5) * spec.length;
    const env = Math.sin(clamp(t, 0.08, 0.92) * Math.PI);
    const ribW = halfWid * (0.76 + 0.34 * env);
    const ribH = hMax * (0.48 + 0.52 * Math.pow(env, 0.72));
    const ribRadius = spec.width * (0.072 + 0.022 * env);

    for (const side of [-1, 1] as const) {
      const ribCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(xAlong, ribH + 0.35, side * 0.3),
        new THREE.Vector3(xAlong + 0.25, ribH * 0.94, side * ribW * 0.58),
        new THREE.Vector3(xAlong + 0.45, ribH * 0.54, side * ribW * 0.98),
        new THREE.Vector3(xAlong + 0.2, ribH * 0.16, side * ribW * 1.03),
        new THREE.Vector3(xAlong - 0.1, -1.6, side * ribW * 0.92),
      ]);
      const ribGeo = trackGeo(new THREE.TubeGeometry(ribCurve, 12, ribRadius, 7, false));
      skel.add(new THREE.Mesh(ribGeo, boneMat));
    }

    // Irregular diagonal bone cross-strut between some rib tops for organic fossil look
    if (i < spec.ribPairs - 1 && i % 2 === 0) {
      const nextAlong =
        (0.24 + ((i + 1) / Math.max(1, spec.ribPairs - 1)) * 0.68 - 0.5) *
        spec.length;
      for (const side of [-1, 1] as const) {
        const bridge = new THREE.Mesh(
          trackGeo(
            new THREE.CylinderGeometry(
              ribRadius * 0.58,
              ribRadius * 0.68,
              Math.abs(nextAlong - xAlong) * 1.05,
              6
            )
          ),
          boneMat
        );
        bridge.position.set(
          (xAlong + nextAlong) * 0.5,
          ribH * 0.84,
          side * ribW * 0.52
        );
        bridge.rotation.z = Math.PI * 0.5;
        bridge.rotation.y = side * 0.22;
        skel.add(bridge);
      }
    }
  }

  // 4. Colossal Anterior Monster Skull Dome (resting at -halfLen, nose plunging into jungle floor)
  const skullX = -halfLen * 0.68;
  const cranium = new THREE.Mesh(
    trackGeo(new THREE.IcosahedronGeometry(halfWid * 0.92, 2)),
    boneMat
  );
  cranium.scale.set(1.38, 0.92, 0.96);
  cranium.position.set(skullX + 2.2, hMax * 0.48, 0);
  skel.add(cranium);

  const snout = new THREE.Mesh(
    trackGeo(new THREE.IcosahedronGeometry(halfWid * 0.72, 2)),
    boneMat
  );
  snout.scale.set(1.55, 0.68, 0.84);
  snout.position.set(-halfLen * 0.88, hMax * 0.25, 0);
  snout.rotation.z = 0.28;
  skel.add(snout);

  // Dark-blue recessed orbital eye cavities + jaw arch openings on skull sides
  for (const side of [-1, 1] as const) {
    const eyeSocket = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(halfWid * 0.34, 10, 8)),
      darkCavernMat
    );
    eyeSocket.scale.set(1.2, 0.95, 0.55);
    eyeSocket.position.set(skullX - 1.2, hMax * 0.44, side * halfWid * 0.72);
    skel.add(eyeSocket);

    const browArchCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(skullX + 3.0, hMax * 0.78, side * halfWid * 0.35),
      new THREE.Vector3(skullX - 0.8, hMax * 0.74, side * halfWid * 0.82),
      new THREE.Vector3(-halfLen * 0.92, hMax * 0.18, side * halfWid * 0.76),
      new THREE.Vector3(-halfLen * 0.96, -1.2, side * halfWid * 0.62),
    ]);
    skel.add(
      new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(browArchCurve, 12, spec.width * 0.085, 7, false)),
        boneMat
      )
    );
  }

  // 5. Lush Prehistoric Green Moss Blankets draped over skeleton ridge & flanks (matching Images 1 & 2)
  const mossSpecs: readonly [number, number, number, number, number, number, boolean][] = [
    [-halfLen * 0.58, hMax * 0.86, 0.6, 5.2, 1.35, 3.6, true],
    [-halfLen * 0.22, hMax * 0.98, -0.8, 6.4, 1.45, 4.1, false],
    [halfLen * 0.14, hMax * 0.94, 0.7, 5.8, 1.35, 3.8, true],
    [halfLen * 0.46, hMax * 0.76, -0.4, 4.8, 1.2, 3.2, false],
    [-halfLen * 0.34, hMax * 0.62, halfWid * 0.62, 3.4, 1.1, 2.2, true],
    [halfLen * 0.06, hMax * 0.64, -halfWid * 0.66, 3.6, 1.15, 2.3, false],
    [-halfLen * 0.75, hMax * 0.54, 0.3, 3.8, 1.05, 2.8, true],
  ];
  for (const [mx, my, mz, sx, sy, sz, isDark] of mossSpecs) {
    const mossCap = new THREE.Mesh(
      trackGeo(new THREE.IcosahedronGeometry(1, 1)),
      isDark ? mossMat : lightMossMat
    );
    mossCap.scale.set(sx, sy, sz);
    mossCap.position.set(mx, my, mz);
    skel.add(mossCap);
  }

  return skel;
}

/**
 * Builds Mr. 3's Wax House faithful to Image 3 (`image_cd17378d.png`):
 * - Tapered flat-topped rounded white wax block
 * - Sculpted wavy overhanging melted-wax roof drip curtain around top rim
 * - Tall arched door with dark outline jamb/arch & small golden doorknob
 * - Curled fiddlehead ferns, tropical palm tree behind left edge,
 *   and bright red-tipped tropical rosette plants framing human eye level
 */
function buildMr3WaxClearing(
  waxMat: THREE.Material,
  darkOutlineMat: THREE.Material,
  goldKnobMat: THREE.Material,
  trunkMat: THREE.Material,
  mossMat: THREE.Material,
  fernMat: THREE.Material,
  redLeafMat: THREE.Material,
  canopyLeafMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const scene = new THREE.Group();
  const mr3 = LITTLE_GARDEN_LANDMARKS.mr3WaxHouse;
  const W = mr3.width;
  const D = mr3.depth;
  const H = mr3.height;

  // Helper squircle coordinate at angle theta & height progress v
  const squircleXZ = (theta: number, v: number, scaleMult = 1.0): [number, number] => {
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const sqx = Math.sign(cosT) * Math.pow(Math.abs(cosT), 0.62);
    const sqz = Math.sign(sinT) * Math.pow(Math.abs(sinT), 0.62);
    const taper = 1 - v * 0.16;
    const topRound = v > 0.88 ? 1 - Math.pow((v - 0.88) / 0.12, 2) * 0.06 : 1;
    const ripple = Math.sin(theta * 5 + v * 2.5) * 0.032 * (1 - v * 0.45);
    return [
      sqx * (W * 0.5) * taper * topRound * (1 + ripple) * scaleMult,
      sqz * (D * 0.5) * taper * topRound * (1 + ripple) * scaleMult,
    ];
  };

  // 1. Solid Outward-Facing Tapered Rounded Candle-Wax House Body (fixed CCW winding!)
  const radialSegs = 48;
  const heightSegs = 16;
  const wPos: number[] = [];
  const wUv: number[] = [];
  const wIdx: number[] = [];

  for (let iy = 0; iy <= heightSegs; iy++) {
    const v = iy / heightSegs;
    const y = v * H;
    for (let ix = 0; ix <= radialSegs; ix++) {
      const u = ix / radialSegs;
      const theta = u * Math.PI * 2;
      const [px, pz] = squircleXZ(theta, v, 1.0);
      wPos.push(px, y, pz);
      wUv.push(u * 2, 1 - v);
    }
  }
  for (let iy = 0; iy < heightSegs; iy++) {
    for (let ix = 0; ix < radialSegs; ix++) {
      const a = iy * (radialSegs + 1) + ix;
      const b = a + 1;
      const c = a + (radialSegs + 1);
      const d = c + 1;
      // Outward-facing CCW winding!
      wIdx.push(a, c, b, b, c, d);
    }
  }
  // Slightly domed white roof cap welded flush to top ring
  const roofCenterIdx = wPos.length / 3;
  wPos.push(0, H + 0.12, 0);
  wUv.push(0.5, 0.5);
  const topRingStart = heightSegs * (radialSegs + 1);
  for (let ix = 0; ix < radialSegs; ix++) {
    wIdx.push(topRingStart + ix, roofCenterIdx, topRingStart + ix + 1);
  }

  const waxBodyGeo = trackGeo(new THREE.BufferGeometry());
  waxBodyGeo.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3));
  waxBodyGeo.setAttribute('uv', new THREE.Float32BufferAttribute(wUv, 2));
  waxBodyGeo.setIndex(wIdx);
  waxBodyGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(waxBodyGeo, waxMat));

  // 2. Solid 3D Sculpted Melted-Wax Roof Drip Overhang Curtain + Pillowed Cap
  // Built as a closed thick upper-lip mantle so there are zero gaps or floating spheres!
  const dripSegs = 64;
  const dripTubeCurvePts: THREE.Vector3[] = [];
  const dPos: number[] = [];
  const dUv: number[] = [];
  const dIdx: number[] = [];

  for (let ix = 0; ix <= dripSegs; ix++) {
    const u = ix / dripSegs;
    const theta = u * Math.PI * 2;
    const waveLen =
      0.46 +
      0.28 * Math.sin(theta * 5.0 + 0.6) +
      0.22 * Math.cos(theta * 9.0 - 0.5);
    const botY = H - clamp(waveLen, 0.24, 1.05);
    const vBot = clamp(botY / H, 0.68, 0.94);

    // Top ring welded into roof edge
    const [tx, tz] = squircleXZ(theta, 0.98, 1.015);
    dPos.push(tx, H + 0.02, tz);
    dUv.push(u * 2, 0.0);

    // Thickened lower drip skirt proud of the tapered wall
    const [bx, bz] = squircleXZ(theta, vBot, 1.045);
    dPos.push(bx, botY, bz);
    dUv.push(u * 2, 0.4);

    if (ix < dripSegs) {
      dripTubeCurvePts.push(new THREE.Vector3(bx * 1.004, botY, bz * 1.004));
    }
  }
  for (let ix = 0; ix < dripSegs; ix++) {
    const a = ix * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    // Outward-facing skirt
    dIdx.push(a, b, c, b, d, c);
  }
  const dripGeo = trackGeo(new THREE.BufferGeometry());
  dripGeo.setAttribute('position', new THREE.Float32BufferAttribute(dPos, 3));
  dripGeo.setAttribute('uv', new THREE.Float32BufferAttribute(dUv, 2));
  dripGeo.setIndex(dIdx);
  dripGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(dripGeo, waxMat));

  // Rounded melted-wax bead & subtle underside contour tracing right along the wavy bottom edge of the drip skirt
  const dripLipCurve = new THREE.CatmullRomCurve3(dripTubeCurvePts, true);
  scene.add(
    new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(dripLipCurve, 80, 0.075, 7, true)),
      waxMat
    )
  );
  // Subtle dark shadow underside crease just beneath the drip beads (matches anime ink contour in Image 3)
  const dripCreasePts = dripTubeCurvePts.map(
    (p) => new THREE.Vector3(p.x * 0.996, p.y - 0.055, p.z * 0.996)
  );
  const dripCreaseCurve = new THREE.CatmullRomCurve3(dripCreasePts, true);
  scene.add(
    new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(dripCreaseCurve, 80, 0.022, 5, true)),
      darkOutlineMat
    )
  );

  // Subtle side-wall melted wax drip ridges hugging wall surface cleanly
  const wallFoldPaths: readonly [number, number][] = [
    [1.18, 0.55],
    [1.62, 0.42],
    [1.96, 0.38],
  ];
  for (const [theta, hStart] of wallFoldPaths) {
    const fPts: THREE.Vector3[] = [];
    for (let s = 0; s <= 5; s++) {
      const t = s / 5;
      const v = clamp(hStart - t * 0.25, 0.15, 0.85);
      const thWobble = theta + Math.sin(t * Math.PI * 1.4) * 0.11;
      const [fx, fz] = squircleXZ(thWobble, v, 1.015);
      fPts.push(new THREE.Vector3(fx, v * H, fz));
    }
    scene.add(
      new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fPts), 10, 0.04, 6, false)),
        waxMat
      )
    );
  }

  // 3. Tall Arched Wax Front Door with Clean Dark Arch Outline & Golden Doorknob (Exact Image 3)
  const doorGroup = new THREE.Group();
  doorGroup.position.set(0, 0, D * 0.478);
  doorGroup.rotation.x = -0.11;

  const doorW = 0.98;
  const doorRectH = 1.28;
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-doorW * 0.5, 0);
  doorShape.lineTo(doorW * 0.5, 0);
  doorShape.lineTo(doorW * 0.5, doorRectH);
  doorShape.absarc(0, doorRectH, doorW * 0.5, 0, Math.PI, false);
  doorShape.lineTo(-doorW * 0.5, 0);

  const doorPanelGeo = trackGeo(
    new THREE.ExtrudeGeometry(doorShape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.03,
      bevelThickness: 0.03,
    })
  );
  doorGroup.add(new THREE.Mesh(doorPanelGeo, waxMat));

  // Crisp dark contour frame tracing the door arch
  const framePts: THREE.Vector3[] = [];
  framePts.push(new THREE.Vector3(-doorW * 0.52, 0.02, 0.105));
  framePts.push(new THREE.Vector3(-doorW * 0.52, doorRectH, 0.105));
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI - (i / 16) * Math.PI;
    framePts.push(
      new THREE.Vector3(
        Math.cos(a) * doorW * 0.52,
        doorRectH + Math.sin(a) * doorW * 0.52,
        0.105
      )
    );
  }
  framePts.push(new THREE.Vector3(doorW * 0.52, doorRectH, 0.105));
  framePts.push(new THREE.Vector3(doorW * 0.52, 0.02, 0.105));
  const frameCurve = new THREE.CatmullRomCurve3(framePts);
  doorGroup.add(
    new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(frameCurve, 28, 0.032, 6, false)),
      darkOutlineMat
    )
  );

  // Small bright golden round doorknob on viewer's left side of the door
  const knob = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.068, 12, 10)),
    goldKnobMat
  );
  knob.position.set(-0.29, 0.85, 0.15);
  doorGroup.add(knob);
  scene.add(doorGroup);

  // 4. Close-Up Botanical Framing Faithful to Image 3
  // 4a. Tropical palm tree rising just behind left roof shoulder
  const palmGroup = new THREE.Group();
  palmGroup.position.set(-3.2, 0, -2.7);
  const pTrunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.2, 0),
    new THREE.Vector3(-0.3, 2.2, 0.12),
    new THREE.Vector3(-0.1, 4.4, -0.08),
    new THREE.Vector3(0.25, 5.65, 0.08),
  ]);
  palmGroup.add(
    new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(pTrunkCurve, 12, 0.22, 7, false)),
      trunkMat
    )
  );
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2;
    const frondCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.25, 5.65, 0.08),
      new THREE.Vector3(0.25 + Math.cos(ang) * 1.15, 6.25, 0.08 + Math.sin(ang) * 1.15),
      new THREE.Vector3(0.25 + Math.cos(ang) * 2.25, 5.2, 0.08 + Math.sin(ang) * 2.25),
    ]);
    const frond = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(frondCurve, 7, 0.24, 5, false)),
      fernMat
    );
    frond.scale.set(1.0, 0.34, 1.0);
    palmGroup.add(frond);
  }
  scene.add(palmGroup);

  // 4b. Dense Rainforest Canopy Curtain & Tall Tree Trunks framing the entire clearing backdrop (eliminates sea horizon gap!)
  const bgTrees: readonly [number, number, number, number, boolean][] = [
    [-7.2, -2.4, 0.34, 11.2, true],
    [-5.6, -4.8, 0.38, 12.0, false],
    [-2.4, -5.2, 0.42, 12.5, true],
    [1.1, -5.0, 0.4, 12.2, false],
    [4.4, -4.4, 0.36, 11.4, true],
    [6.6, -2.2, 0.34, 10.8, false],
    [-8.5, 0.6, 0.32, 10.6, false],
    [8.2, 0.8, 0.35, 11.0, true],
  ];
  for (const [tx, tz, tr, th, deepTone] of bgTrees) {
    const trunk = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(tr * 0.72, tr * 1.18, th, 7)),
      trunkMat
    );
    trunk.position.set(tx, th * 0.5 - 0.3, tz);
    // Low bushy understory + high overhanging canopy crown
    const lowBush = new THREE.Mesh(
      trackGeo(new THREE.IcosahedronGeometry(2.6, 1)),
      deepTone ? mossMat : canopyLeafMat
    );
    lowBush.scale.set(1.35, 0.95, 1.25);
    lowBush.position.set(tx * 0.96, 2.2, tz);
    const midBush = new THREE.Mesh(
      trackGeo(new THREE.IcosahedronGeometry(2.9, 1)),
      canopyLeafMat
    );
    midBush.scale.set(1.45, 0.92, 1.3);
    midBush.position.set(tx, 5.2, tz);
    const highCrown = new THREE.Mesh(
      trackGeo(new THREE.IcosahedronGeometry(3.2, 1)),
      deepTone ? canopyLeafMat : mossMat
    );
    highCrown.scale.set(1.4, 0.82, 1.35);
    highCrown.position.set(tx, th * 0.82, tz);
    scene.add(trunk, lowBush, midBush, highCrown);
  }

  // 4c. Mossy Rock & Curled Fiddlehead Ferns firmly inside Lower-Left Foreground (viewer camera at world -Z => local z = +3.2..+4.4, x = -2.7..-3.7)
  const mossMound = new THREE.Mesh(
    trackGeo(new THREE.IcosahedronGeometry(0.92, 1)),
    mossMat
  );
  mossMound.scale.set(1.4, 0.6, 1.1);
  mossMound.position.set(-3.2, 0.22, 3.6);
  scene.add(mossMound);

  const spiralSpecs: readonly [number, number, number, number, number][] = [
    [-2.85, 3.45, 0.95, 0.35, 1.85],
    [-2.4, 3.85, 0.88, -0.25, 1.5],
    [-3.35, 3.9, 1.05, 0.1, 1.72],
    [-2.1, 4.15, 0.78, 0.55, 1.28],
  ];
  for (const [sx, sz, sc, rotY, hTall] of spiralSpecs) {
    const pts: THREE.Vector3[] = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.14 * sc, hTall * 0.45, 0),
      new THREE.Vector3(0.06 * sc, hTall * 0.84, 0),
      new THREE.Vector3(-0.22 * sc, hTall * 0.98, 0),
      new THREE.Vector3(-0.4 * sc, hTall * 0.82, 0),
      new THREE.Vector3(-0.3 * sc, hTall * 0.65, 0),
      new THREE.Vector3(-0.15 * sc, hTall * 0.72, 0),
    ];
    const fCurve = new THREE.CatmullRomCurve3(pts);
    const fMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(fCurve, 18, 0.065 * sc, 6, false)),
      fernMat
    );
    fMesh.position.set(sx, 0.05, sz);
    fMesh.rotation.y = rotY;
    scene.add(fMesh);
  }

  // 4d. Vivid Crimson Red-Tipped Tropical Bromeliad Rosettes in Lower-Right Foreground (local x = +2.3..+3.5, z = +3.1..+4.1)
  const rosetteCenters: readonly [number, number, number][] = [
    [2.55, 3.55, 1.24],
    [3.35, 3.95, 1.12],
    [2.05, 4.1, 0.96],
  ];
  const bladeGeo = trackGeo(new THREE.ConeGeometry(0.26, 1.38, 4));
  bladeGeo.translate(0, 0.69, 0);
  bladeGeo.scale(1.3, 1.0, 0.16);

  for (const [rx, rz, rScale] of rosetteCenters) {
    const ros = new THREE.Group();
    ros.position.set(rx, 0.02, rz);
    ros.scale.setScalar(rScale);
    for (let i = 0; i < 10; i++) {
      const blade = new THREE.Mesh(bladeGeo, redLeafMat);
      blade.rotation.y = (i / 10) * Math.PI * 2 + (i % 2) * 0.22;
      blade.rotation.x = 0.46 + (i % 3) * 0.22;
      ros.add(blade);
    }
    scene.add(ros);
  }

  return scene;
}

export function createIslandMesh({
  island,
  globeRadius,
  materials,
  trackGeo,
  trackMat,
  trackTex,
}: IslandMeshContext): IslandMeshInstance {
  const group = new THREE.Group();
  group.name = `island-${island.id}`;

  const placeOnSphere = (
    obj: THREE.Object3D,
    lx: number,
    ly: number,
    lz: number,
    yaw = 0
  ) => {
    const sp = toLittleGardenSphereLocal(lx, ly, lz, globeRadius);
    obj.position.set(sp.x, sp.y, sp.z);
    const normal = new THREE.Vector3(sp.x, sp.y + globeRadius, sp.z).normalize();
    const tilt = new THREE.Quaternion().setFromUnitVectors(_up, normal);
    const rot = new THREE.Quaternion().setFromAxisAngle(_yAxis, yaw);
    obj.quaternion.copy(tilt).multiply(rot);
    obj.scale.setScalar(S);
  };

  const keepTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;

  // Shared materials
  const boneTex = keepTex(createSkeletonBoneTexture());
  const volcanoTex = keepTex(createVolcanoRockTexture());
  const waxTex = keepTex(createWaxHouseTexture());
  const redLeafTex = keepTex(createRedTippedLeafTexture());

  const terrainTex = keepTex(createLittleGardenTerrainTexture(1024));
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.88,
      metalness: 0.02,
      transparent: true,
      alphaTest: 0.08,
    })
  );

  const boneMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: boneTex,
      roughness: 0.84,
      metalness: 0.03,
    })
  );
  const darkCavernMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e3b68,
      roughness: 0.94,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );
  const mossMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4c8e35,
      roughness: 0.86,
      metalness: 0.02,
    })
  );
  const lightMossMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6eaf45,
      roughness: 0.84,
      metalness: 0.02,
    })
  );
  const volcanoMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: volcanoTex,
      roughness: 0.9,
      metalness: 0.04,
    })
  );
  const magmaMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xff5a20,
      emissive: 0xff3d00,
      emissiveIntensity: 1.15,
      roughness: 0.55,
      metalness: 0.05,
    })
  );
  const waxMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: waxTex,
      roughness: 0.52,
      metalness: 0.04,
    })
  );
  const darkOutlineMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x35495c,
      roughness: 0.68,
      metalness: 0.05,
    })
  );
  const goldKnobMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf7bd2a,
      emissive: 0x6b4500,
      emissiveIntensity: 0.2,
      roughness: 0.24,
      metalness: 0.78,
    })
  );
  const lakeWaterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2ecae0,
      emissive: 0x0b5266,
      emissiveIntensity: 0.14,
      roughness: 0.14,
      metalness: 0.18,
      transparent: true,
      opacity: 0.88,
    })
  );
  const spireStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xded9cb,
      roughness: 0.86,
      metalness: 0.03,
    })
  );
  const trunkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x624228,
      roughness: 0.88,
      metalness: 0.02,
    })
  );
  const fernMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x52a638,
      roughness: 0.78,
      metalness: 0.03,
    })
  );
  const redLeafMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: redLeafTex,
      roughness: 0.68,
      metalness: 0.04,
      side: THREE.DoubleSide,
    })
  );
  const canopyLeafMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.02,
    })
  );
  const staticCanopyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x458b35,
      roughness: 0.82,
      metalness: 0.02,
    })
  );

  // 1. Curved Prehistoric Terrain Grid Projected onto Globe Sphere
  {
    const segs = 168;
    const plane = trackGeo(
      new THREE.PlaneGeometry(
        LITTLE_GARDEN_WORLD_SIZE,
        LITTLE_GARDEN_WORLD_SIZE,
        segs,
        segs
      )
    );
    plane.rotateX(-Math.PI / 2);
    const pos = plane.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const ly = sampleLittleGardenHeight(lx, lz);
      const sp = toLittleGardenSphereLocal(lx, ly, lz, globeRadius);
      pos.setXYZ(i, sp.x, sp.y, sp.z);
    }
    plane.computeVertexNormals();
    plane.computeBoundingSphere();
    group.add(new THREE.Mesh(plane, terrainMat));
  }

  // 2. Elongated Turquoise Prehistoric Lake + Tall Central Limestone Spire (Image 1)
  {
    const lakeGridSegs = 28;
    const wPos: number[] = [];
    const wIdx: number[] = [];
    const spanX = LITTLE_GARDEN_LAKE.rx * 2.6;
    const spanZ = LITTLE_GARDEN_LAKE.rx * 2.6;
    for (let iz = 0; iz <= lakeGridSegs; iz++) {
      for (let ix = 0; ix <= lakeGridSegs; ix++) {
        const lx =
          LITTLE_GARDEN_LAKE.cx + (ix / lakeGridSegs - 0.5) * spanX;
        const lz =
          LITTLE_GARDEN_LAKE.cz + (iz / lakeGridSegs - 0.5) * spanZ;
        const ell = littleGardenLakeEllipseDist(lx, lz);
        const dropY =
          ell < 1.03 ? LITTLE_GARDEN_LAKE_WATER_Y : LITTLE_GARDEN_LAKE_WATER_Y - 1.1;
        const sp = toLittleGardenSphereLocal(lx, dropY, lz, globeRadius);
        wPos.push(sp.x, sp.y, sp.z);
      }
    }
    for (let iz = 0; iz < lakeGridSegs; iz++) {
      for (let ix = 0; ix < lakeGridSegs; ix++) {
        const a = iz * (lakeGridSegs + 1) + ix;
        const b = a + 1;
        const c = a + (lakeGridSegs + 1);
        const d = c + 1;
        wIdx.push(a, c, b, b, c, d);
      }
    }
    const lakeGeo = trackGeo(new THREE.BufferGeometry());
    lakeGeo.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3));
    lakeGeo.setIndex(wIdx);
    lakeGeo.computeVertexNormals();
    group.add(new THREE.Mesh(lakeGeo, lakeWaterMat));

    // Iconic tall central rock/fossil spire rising inside the lake
    const spireGroup = new THREE.Group();
    const baseMound = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.1, 1.85, 1.35, 9)),
      spireStoneMat
    );
    baseMound.position.y = 0.25;
    const mainPillar = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.05, 4.9, 8)),
      spireStoneMat
    );
    mainPillar.position.y = 2.6;
    const sideCrag = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.62, 2.75, 7)),
      spireStoneMat
    );
    sideCrag.position.set(0.85, 1.35, 0.35);
    sideCrag.rotation.z = -0.22;
    const boulder = new THREE.Mesh(
      trackGeo(new THREE.DodecahedronGeometry(0.65, 0)),
      spireStoneMat
    );
    boulder.position.set(-1.1, 0.35, -0.4);
    spireGroup.add(baseMound, mainPillar, sideCrag, boulder);
    placeOnSphere(
      spireGroup,
      LITTLE_GARDEN_LAKE.spireX,
      LITTLE_GARDEN_LAKE_WATER_Y - 0.15,
      LITTLE_GARDEN_LAKE.spireZ,
      0.35
    );
    group.add(spireGroup);
  }

  // 3. Both Colossal Mossy White Monster Skeletons + Loose Giant Ribs on SW Grass
  for (const skelSpec of LITTLE_GARDEN_SKELETONS) {
    const skelGroup = buildGiantSkeletonGroup(
      skelSpec,
      boneMat,
      darkCavernMat,
      mossMat,
      lightMossMat,
      trackGeo
    );
    placeOnSphere(
      skelGroup,
      skelSpec.x,
      LITTLE_GARDEN_JUNGLE_FLOOR_Y + 0.35,
      skelSpec.z,
      skelSpec.yaw
    );
    group.add(skelGroup);
  }

  for (const loose of LITTLE_GARDEN_LANDMARKS.looseRibsSouth) {
    const looseRib = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.6, -0.4, 0),
      new THREE.Vector3(-0.9, 1.05, 0.35),
      new THREE.Vector3(1.1, 0.95, 0.2),
      new THREE.Vector3(2.8, -0.4, -0.15),
    ]);
    looseRib.add(
      new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(curve, 12, 0.42, 7, false)),
        boneMat
      )
    );
    const groundY = sampleLittleGardenHeight(loose.x, loose.z);
    placeOnSphere(looseRib, loose.x, groundY + 0.05, loose.z, loose.yaw);
    looseRib.scale.multiplyScalar(loose.scale);
    group.add(looseRib);
  }

  // 4. Eight Striated Terracotta-Red Volcanoes with Glowing Craters & Rising Smoke Puffs
  const smokePuffs: {
    mesh: THREE.Mesh;
    basePos: THREE.Vector3;
    normal: THREE.Vector3;
    drift: THREE.Vector3;
    phase: number;
    baseScale: number;
  }[] = [];

  const smokeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xeef3f6,
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    })
  );
  const smokeGeo = trackGeo(new THREE.SphereGeometry(1.0, 10, 8));

  for (const vSpec of LITTLE_GARDEN_VOLCANOES) {
    const vGroup = new THREE.Group();
    const cone = new THREE.Mesh(
      trackGeo(buildFlutedVolcanoGeo(vSpec)),
      volcanoMat
    );
    const lavaDisk = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(vSpec.craterRadius * 0.72, 14)),
      magmaMat
    );
    lavaDisk.rotation.x = -Math.PI / 2;
    lavaDisk.position.y = vSpec.height * 0.8;
    vGroup.add(cone, lavaDisk);

    const baseGroundY = sampleLittleGardenHeight(vSpec.x, vSpec.z) - 0.95;
    placeOnSphere(vGroup, vSpec.x, baseGroundY, vSpec.z, vSpec.yaw);
    group.add(vGroup);

    // 6 staggered drifting wispy smoke plumes per volcano cone
    const ventLocal = toLittleGardenSphereLocal(
      vSpec.x,
      baseGroundY + vSpec.height + 0.45,
      vSpec.z,
      globeRadius
    );
    const ventPos = new THREE.Vector3(ventLocal.x, ventLocal.y, ventLocal.z);
    const ventNorm = new THREE.Vector3(
      ventLocal.x,
      ventLocal.y + globeRadius,
      ventLocal.z
    ).normalize();
    const driftDir = new THREE.Vector3(0.58, 0.28, -0.45).normalize();

    for (let p = 0; p < 6; p++) {
      const puff = new THREE.Mesh(smokeGeo, smokeMat);
      puff.position.copy(ventPos);
      group.add(puff);
      smokePuffs.push({
        mesh: puff,
        basePos: ventPos,
        normal: ventNorm,
        drift: driftDir,
        phase: p / 6 + vSpec.yaw * 0.12,
        baseScale: (vSpec.craterRadius * 0.78) * S,
      });
    }
  }

  // 5. Mr. 3's Wax House & Botanical Clearing (Hero Human-Scale Scene matching Image 3)
  {
    const mr3 = LITTLE_GARDEN_LANDMARKS.mr3WaxHouse;
    const mr3Group = buildMr3WaxClearing(
      waxMat,
      darkOutlineMat,
      goldKnobMat,
      trunkMat,
      mossMat,
      fernMat,
      redLeafMat,
      staticCanopyMat,
      trackGeo
    );
    placeOnSphere(
      mr3Group,
      mr3.x,
      LITTLE_GARDEN_MR3_CLEARING_Y - 0.04,
      mr3.z,
      mr3.yaw
    );
    group.add(mr3Group);
  }

  // 6. Instanced Prehistoric Rainforest Canopy, Palms, Curled Ferns & Red-Tipped Rosettes
  const canopyList = LITTLE_GARDEN_FOLIAGE.filter((f) => f.kind === 'canopy');
  const palmList = LITTLE_GARDEN_FOLIAGE.filter((f) => f.kind === 'palm');
  const fernList = LITTLE_GARDEN_FOLIAGE.filter((f) => f.kind === 'fern');
  const rosetteList = LITTLE_GARDEN_FOLIAGE.filter(
    (f) => f.kind === 'red-rosette'
  );

  if (canopyList.length > 0) {
    const tGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.28, 1.35, 6));
    tGeo.translate(0, 0.65, 0);
    const c1Geo = trackGeo(new THREE.IcosahedronGeometry(1.65, 1));
    c1Geo.scale(1.38, 0.72, 1.32);
    c1Geo.translate(0, 1.85, 0);
    const c2Geo = trackGeo(new THREE.IcosahedronGeometry(1.18, 1));
    c2Geo.scale(1.28, 0.68, 1.24);
    c2Geo.translate(0.95, 1.62, 0.62);

    const tInst = new THREE.InstancedMesh(tGeo, trunkMat, canopyList.length);
    const c1Inst = new THREE.InstancedMesh(
      c1Geo,
      canopyLeafMat,
      canopyList.length
    );
    const c2Inst = new THREE.InstancedMesh(
      c2Geo,
      canopyLeafMat,
      canopyList.length
    );

    canopyList.forEach((f, idx) => {
      const sp = toLittleGardenSphereLocal(f.x, f.y - 0.05, f.z, globeRadius);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
      _tiltQuat.setFromUnitVectors(_up, _localNormal);
      _yawQuat.setFromAxisAngle(_yAxis, f.yaw);
      _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
      _dummy.scale.setScalar(S * f.scale);
      _dummy.updateMatrix();
      tInst.setMatrixAt(idx, _dummy.matrix);
      c1Inst.setMatrixAt(idx, _dummy.matrix);
      c2Inst.setMatrixAt(idx, _dummy.matrix);

      _tmpColor.setRGB(0.22 * f.tint, 0.56 * f.tint, 0.19 * f.tint);
      c1Inst.setColorAt(idx, _tmpColor);
      _tmpColor.setRGB(0.3 * f.tint, 0.64 * f.tint, 0.22 * f.tint);
      c2Inst.setColorAt(idx, _tmpColor);
    });
    for (const inst of [tInst, c1Inst, c2Inst]) {
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.computeBoundingSphere();
      group.add(inst);
    }
  }

  if (palmList.length > 0) {
    const pTrunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.28, 1.5, 0.1),
      new THREE.Vector3(0.18, 3.1, 0),
    ]);
    const pTrunkGeo = trackGeo(
      new THREE.TubeGeometry(pTrunkCurve, 8, 0.16, 6, false)
    );
    const crownParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const frondCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.18, 3.1, 0),
        new THREE.Vector3(0.18 + Math.cos(a) * 0.9, 3.55, Math.sin(a) * 0.9),
        new THREE.Vector3(0.18 + Math.cos(a) * 1.65, 2.75, Math.sin(a) * 1.65),
      ]);
      const fg = new THREE.TubeGeometry(frondCurve, 5, 0.16, 4, false);
      crownParts.push(fg);
    }
    const pTrunkInst = new THREE.InstancedMesh(
      pTrunkGeo,
      trunkMat,
      palmList.length
    );
    const frondInsts = crownParts.map(
      (fg) => new THREE.InstancedMesh(trackGeo(fg), canopyLeafMat, palmList.length)
    );
    palmList.forEach((f, idx) => {
      const sp = toLittleGardenSphereLocal(f.x, f.y - 0.05, f.z, globeRadius);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
      _tiltQuat.setFromUnitVectors(_up, _localNormal);
      _yawQuat.setFromAxisAngle(_yAxis, f.yaw);
      _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
      _dummy.scale.setScalar(S * f.scale);
      _dummy.updateMatrix();
      pTrunkInst.setMatrixAt(idx, _dummy.matrix);
      _tmpColor.setRGB(0.27 * f.tint, 0.62 * f.tint, 0.21 * f.tint);
      frondInsts.forEach((fi) => {
        fi.setMatrixAt(idx, _dummy.matrix);
        fi.setColorAt(idx, _tmpColor);
      });
    });
    pTrunkInst.instanceMatrix.needsUpdate = true;
    pTrunkInst.computeBoundingSphere();
    group.add(pTrunkInst);
    frondInsts.forEach((fi) => {
      fi.instanceMatrix.needsUpdate = true;
      if (fi.instanceColor) fi.instanceColor.needsUpdate = true;
      fi.computeBoundingSphere();
      group.add(fi);
    });
  }

  if (fernList.length > 0) {
    const fCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.18, 0.65, 0),
      new THREE.Vector3(0.05, 1.15, 0),
      new THREE.Vector3(-0.22, 1.28, 0),
      new THREE.Vector3(-0.32, 1.05, 0),
    ]);
    const fGeo = trackGeo(new THREE.TubeGeometry(fCurve, 10, 0.065, 5, false));
    const fInst = new THREE.InstancedMesh(fGeo, canopyLeafMat, fernList.length);
    fernList.forEach((f, idx) => {
      const sp = toLittleGardenSphereLocal(f.x, f.y - 0.03, f.z, globeRadius);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
      _tiltQuat.setFromUnitVectors(_up, _localNormal);
      _yawQuat.setFromAxisAngle(_yAxis, f.yaw);
      _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
      _dummy.scale.setScalar(S * f.scale);
      _dummy.updateMatrix();
      fInst.setMatrixAt(idx, _dummy.matrix);
      _tmpColor.setRGB(0.28 * f.tint, 0.68 * f.tint, 0.22 * f.tint);
      fInst.setColorAt(idx, _tmpColor);
    });
    fInst.instanceMatrix.needsUpdate = true;
    if (fInst.instanceColor) fInst.instanceColor.needsUpdate = true;
    fInst.computeBoundingSphere();
    group.add(fInst);
  }

  if (rosetteList.length > 0) {
    const rBlade = trackGeo(new THREE.ConeGeometry(0.22, 1.05, 4));
    rBlade.translate(0, 0.52, 0);
    rBlade.scale(1.25, 1.0, 0.18);
    rBlade.rotateX(0.55);
    const rInst = new THREE.InstancedMesh(
      rBlade,
      redLeafMat,
      rosetteList.length * 3
    );
    let rIdx = 0;
    rosetteList.forEach((f) => {
      const sp = toLittleGardenSphereLocal(f.x, f.y - 0.03, f.z, globeRadius);
      _localNormal.set(sp.x, sp.y + globeRadius, sp.z).normalize();
      _tiltQuat.setFromUnitVectors(_up, _localNormal);
      for (let b = 0; b < 3; b++) {
        _dummy.position.set(sp.x, sp.y, sp.z);
        _yawQuat.setFromAxisAngle(_yAxis, f.yaw + b * ((Math.PI * 2) / 3));
        _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
        _dummy.scale.setScalar(S * f.scale);
        _dummy.updateMatrix();
        rInst.setMatrixAt(rIdx++, _dummy.matrix);
      }
    });
    rInst.instanceMatrix.needsUpdate = true;
    rInst.computeBoundingSphere();
    group.add(rInst);
  }

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      for (const p of smokePuffs) {
        const cycle = (elapsed * 0.16 + p.phase) % 1;
        const rise = cycle * 7.5 * S;
        const spread = (1 + cycle * 2.2) * p.baseScale;
        p.mesh.position
          .copy(p.basePos)
          .addScaledVector(p.normal, rise)
          .addScaledVector(p.drift, rise * 0.65);
        p.mesh.scale.setScalar(spread);
      }
    },
  };
}
