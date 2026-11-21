import * as THREE from 'three';
import { valueNoise2D } from '../utils/globeMath';
import {
  MARY_GEOISE_ALTITUDE,
  MARY_GEOISE_GLOBE_SCALE,
  MARY_GEOISE_LANDMARKS,
  MARY_GEOISE_RED_PORT_SEA_Y,
  MARY_GEOISE_TERRAIN_CENTER_X,
  MARY_GEOISE_TERRAIN_DEPTH,
  MARY_GEOISE_TERRAIN_WIDTH,
  MARY_GEOISE_UNDERGROUND_FLOOR_Y,
  buildMaryGeoiseButterflies,
  buildMaryGeoiseCypressTrees,
  buildMaryGeoiseMansions,
  buildMaryGeoiseRoomFlowers,
  maryGeoiseRedPortCliffFactor,
  sampleMaryGeoiseHeight,
  toMaryGeoiseSphereLocal,
} from '../utils/maryGeoiseTerrain';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = MARY_GEOISE_GLOBE_SCALE;
const _up = new THREE.Vector3(0, 1, 0);
const _localNormal = new THREE.Vector3();
const _tiltQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();
const _yAxis = new THREE.Vector3(0, 1, 0);
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

function placeOnMaryGeoiseSphere(
  obj: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  globeRadius: number,
  yaw = 0
): void {
  const pos = toMaryGeoiseSphereLocal(x, y, z, globeRadius);
  obj.position.set(pos.x, pos.y, pos.z);
  const baseR = globeRadius + MARY_GEOISE_ALTITUDE;
  _localNormal.set(pos.x, baseR + pos.y, pos.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

function createMaryGeoiseTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const xMin = MARY_GEOISE_TERRAIN_CENTER_X - MARY_GEOISE_TERRAIN_WIDTH * 0.5;
  const zMin = -MARY_GEOISE_TERRAIN_DEPTH * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * MARY_GEOISE_TERRAIN_DEPTH + zMin;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * MARY_GEOISE_TERRAIN_WIDTH + xMin;
      const idx = (py * size + px) * 4;

      const cliffFrac = maryGeoiseRedPortCliffFactor(x, z);
      const n1 = valueNoise2D(x * 0.14 + 2.7, z * 0.14 - 1.9);
      const n2 = valueNoise2D(x * 0.42 - 3.1, z * 0.42 + 4.4);
      const grain = (n2 - 0.5) * 14;

      let rgb: [number, number, number] = [142, 48, 38];
      let alpha = 1;

      if (cliffFrac > 0.02) {
        // Sheer East Red Line stratified cliffs descending 10,000 m down below sea level
        const strata = 0.5 + 0.5 * Math.sin(cliffFrac * Math.PI * 16 + n1 * 2.2);
        rgb = mixRgb([120, 36, 30], [186, 76, 50], strata);
        if (cliffFrac > 0.94 && x > 144) {
          // Taper mesh alpha cleanly underwater so planetary deep ocean takes over seamlessly
          rgb = mixRgb([96, 32, 28], [22, 68, 86], smoothstep(144, 170, x));
          alpha = 1 - smoothstep(160, 215, x);
        }
      } else if (x < -102 || Math.abs(z) > 110 || (x > 106 && Math.abs(z + 4) >= 148)) {
        // Outer Red Line rocky crest blending smoothly onto the planetary ridge
        rgb = mixRgb([138, 46, 38], [176, 74, 52], n1);
        const outerFade = smoothstep(134, 164, Math.max(-x, Math.abs(z)));
        alpha = 1 - outerFade * 0.88;
      } else {
        // Inside the Fortified Holy City (White Marble Avenues + Emerald Lawns + Moat + Sapphire Pool)
        rgb = mixRgb([84, 152, 72], [116, 178, 86], n1);

        // Grand Central Marble Promenade (x in -15..+15, z in -12..106)
        const onGrandAve = Math.abs(x) < 14.5 && z > -14 && z < 107;
        // West & Central Marble Cross Avenue (z = 14)
        const onCrossAve = Math.abs(z - 14) < 8.5 && x > -98 && x < 54;
        // East Red Port Royal Marble Avenue (z = -4, from Castle Plaza -> Moat Bridge -> East Gate -> Cliff Terminal)
        const onRedPortEastAve = Math.abs(z + 4) < 6.5 && x > 22 && x < 109;
        // Castle Forecourt Plaza
        const onCastlePlaza = Math.abs(x) < 38 && z > -24 && z < 10;
        // South Residential Cross Avenue
        const onSouthAve = Math.abs(z - 55) < 5.5 && Math.abs(x) < 88;
        // Western North-South Noble Avenue
        const onWestAve = Math.abs(x + 46) < 4.5 && z > -78 && z < 96;
        // Eastern North-South Noble Avenue
        const onEastAve = Math.abs(x - 42) < 4.5 && z > -78 && z < 96;

        if (
          onGrandAve ||
          onCrossAve ||
          onRedPortEastAve ||
          onCastlePlaza ||
          onSouthAve ||
          onWestAve ||
          onEastAve
        ) {
          const tileChecker =
            ((Math.floor((x + 200) * 0.5) + Math.floor((z + 200) * 0.5)) & 1) === 0;
          rgb = tileChecker ? [232, 232, 226] : [218, 217, 210];
          // Gold marble trim along promenade edges
          if (onGrandAve && (Math.abs(Math.abs(x) - 13.6) < 0.7 || Math.abs(Math.abs(x) - 5.6) < 2.1)) {
            rgb = Math.abs(Math.abs(x) - 5.6) < 2.1 ? [188, 178, 154] : [214, 180, 92];
          }
          if (onRedPortEastAve && Math.abs(Math.abs(z + 4) - 5.9) < 0.55) {
            rgb = [214, 180, 92];
          }
        }

        // Ornamental moat canal right of Pangaea Castle (clear of East Red Port avenue bridge at z = -4)
        if (x > 26 && x < 34 && z > -70 && z < 8 && Math.abs(z + 4) > 5.8) {
          rgb = mixRgb([36, 128, 168], [58, 166, 198], n1);
        }

        // Sapphire Pool in Domain of the Gods / Socializing Square (image_d00e3501.png)
        const poolDist = Math.hypot(
          (x - MARY_GEOISE_LANDMARKS.socializingSquare.x) / 18.5,
          (z - MARY_GEOISE_LANDMARKS.socializingSquare.z) / 12.0
        );
        if (poolDist < 1.15) {
          if (poolDist < 0.96 && x < 63.5) {
            rgb = mixRgb([28, 134, 214], [64, 178, 242], n1);
          } else {
            rgb = [234, 234, 228];
          }
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
 * Chambord neoclassical cream-stone facade grid with vertical arched blue-slate windows.
 */
function createPangaeaFacadeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#e7ddc2';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle vertical pilasters & horizontal cornices (4 stories)
    for (let row = 0; row < 4; row++) {
      const yBase = row * 128;
      ctx.fillStyle = '#cbb98e';
      ctx.fillRect(0, yBase, 512, 10);
      ctx.fillStyle = '#f5eedc';
      ctx.fillRect(0, yBase + 10, 512, 5);

      for (let col = 0; col < 6; col++) {
        const xBase = col * 85 + 16;
        // Pilaster frame
        ctx.fillStyle = '#d8caa4';
        ctx.fillRect(xBase - 6, yBase + 22, 62, 90);
        // Dark slate glass window bay
        ctx.fillStyle = '#334e63';
        ctx.fillRect(xBase + 2, yBase + 28, 46, 76);
        // Mullions
        ctx.fillStyle = '#e7ddc2';
        ctx.fillRect(xBase + 23, yBase + 28, 4, 76);
        ctx.fillRect(xBase + 2, yBase + 64, 46, 4);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Teal-emerald slate diamond roof tiles matching Pangaea Castle roofs in all reference images.
 */
function createTealSlateRoofTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#357b72';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#245852';
    ctx.lineWidth = 2;
    const step = 32;
    for (let y = 0; y < 256; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
      for (let x = 0; x < 256; x += step) {
        const offset = (y / step) % 2 === 0 ? 0 : step * 0.5;
        ctx.beginPath();
        ctx.moveTo((x + offset) % 256, y);
        ctx.lineTo((x + offset) % 256, y + step);
        ctx.stroke();
      }
    }
    // Subtle copper highlight ribs
    ctx.fillStyle = 'rgba(130, 214, 198, 0.18)';
    for (let x = 0; x < 256; x += 64) {
      ctx.fillRect(x, 0, 4, 256);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * World Government 5-Circle Cross Emblem banner texture.
 */
function createWorldGovFlagTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 384;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 256, 384);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 236, 364);

    // Connecting crossbars
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(128, 108);
    ctx.lineTo(128, 276);
    ctx.moveTo(44, 192);
    ctx.lineTo(212, 192);
    ctx.stroke();

    // 5 iconic World Government circles
    const pts: readonly [number, number][] = [
      [128, 192],
      [128, 108],
      [128, 276],
      [44, 192],
      [212, 192],
    ];
    for (const [cx, cy] of pts) {
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createDungeonBrickTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#141110';
    ctx.fillRect(0, 0, 256, 256);
    const h = 32;
    for (let y = 0; y < 256; y += h) {
      const shift = (y / h) % 2 === 0 ? 0 : 32;
      for (let x = -32; x < 256; x += 64) {
        const shade = 28 + ((x * 7 + y * 13) & 11);
        ctx.fillStyle = `rgb(${shade + 4}, ${shade}, ${shade - 3})`;
        ctx.fillRect(x + shift + 2, y + 2, 60, 28);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Neoclassical townhouse facade texture for Celestial Dragon mansions.
 */
function createMansionFacadeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f2ede2';
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 2; row++) {
      const yb = row * 128;
      ctx.fillStyle = '#d9ccb2';
      ctx.fillRect(0, yb, 256, 10);
      ctx.fillStyle = '#e7dcc5';
      ctx.fillRect(0, yb + 10, 256, 4);
      for (let col = 0; col < 3; col++) {
        const xb = col * 84 + 14;
        ctx.fillStyle = '#cfc1a3';
        ctx.fillRect(xb - 4, yb + 24, 56, 86);
        ctx.fillStyle = '#2f495e';
        ctx.fillRect(xb + 2, yb + 30, 44, 72);
        ctx.fillStyle = '#f2ede2';
        ctx.fillRect(xb + 22, yb + 30, 4, 72);
        ctx.fillRect(xb + 2, yb + 64, 44, 4);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Sunlit botanical conservatory wall with limestone arches & climbing emerald ivy for the Room of Flowers.
 */
function createFlowerConservatoryWallTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#8b997e';
    ctx.fillRect(0, 0, 512, 256);
    for (let ax = 0; ax < 512; ax += 128) {
      ctx.fillStyle = '#b9bfa9';
      ctx.fillRect(ax + 8, 12, 112, 232);
      ctx.fillStyle = '#4c6e46';
      ctx.fillRect(ax + 20, 28, 88, 198);
      // Leaf clusters & hanging vines
      for (let v = 0; v < 26; v++) {
        const lx = ax + 14 + ((v * 37) % 100);
        const ly = 16 + ((v * 53) % 210);
        ctx.fillStyle = v % 3 === 0 ? '#689e52' : v % 3 === 1 ? '#3d6938' : '#89bd65';
        ctx.beginPath();
        ctx.arc(lx, ly, 9 + (v % 5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(3, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Ceremonial gilded arched Levely doors for the Socializing Square Rotunda.
 */
function createReverieDoorsTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#e7dfd0';
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 8; i++) {
      const x = i * 64 + 6;
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(x, 22, 52, 212);
      ctx.fillStyle = '#6da6cf';
      ctx.fillRect(x + 5, 28, 42, 196);
      ctx.fillStyle = '#e3be4e';
      ctx.fillRect(x + 24, 28, 4, 196);
      ctx.fillRect(x + 5, 118, 42, 4);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Terre Sainte de Marie Geoise (Mary Geoise) — Complete 3D procedural reconstruction:
 * 1. Red Line 10,000 m summit plateau & sheer West Red Port cliffside with hydraulic lifts & Bondola gondolas
 * 2. Fortified White & Gold perimeter walls, corner bastions & triumphal city gates
 * 3. Monumental Château de Pangée (Chambord facade, 4 drum towers, 7-arch barbican gate, central clock spire)
 * 4. Inside Pangaea Castle: Salle du Trône Vacant (+ 20 planted swords) & Authority Council hall
 * 5. Hidden Room of Flowers Sanctuary (golden light shafts, rare blossoms, animated butterflies & Imu)
 * 6. Domaine des Dragons Célestes (mansions, marble avenues, animated travolators & bubble-helmeted Nobles)
 * 7. Domaine des Dieux / Place de la Socialisation (sapphire pool, twin arc fountains, 5-arch rotunda, CP0)
 * 8. Subterranean Slave Quarters & Travolator Capstan Engine Vaults beneath the marble boulevard
 */
export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance | null {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const registerTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;
  const group = new THREE.Group();
  group.name = 'mary-geoise-holy-land';

  const terrainTex = registerTex(createMaryGeoiseTerrainTexture(1024));
  const facadeTex = registerTex(createPangaeaFacadeTexture());
  const roofTex = registerTex(createTealSlateRoofTexture());
  const wgFlagTex = registerTex(createWorldGovFlagTexture());
  const brickTex = registerTex(createDungeonBrickTexture());
  const mansionTex = registerTex(createMansionFacadeTexture());
  const conservatoryTex = registerTex(createFlowerConservatoryWallTexture());
  const reverieDoorsTex = registerTex(createReverieDoorsTexture());

  // Varied PBR Material Palette
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.85,
      metalness: 0.04,
      transparent: true,
      alphaTest: 0.04,
    })
  );
  const marbleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4f1ea,
      roughness: 0.34,
      metalness: 0.06,
    })
  );
  const creamStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6dac0,
      roughness: 0.62,
      metalness: 0.04,
    })
  );
  const sandstoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd3bc91,
      roughness: 0.72,
      metalness: 0.05,
    })
  );
  const pangaeaWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: facadeTex,
      roughness: 0.56,
      metalness: 0.05,
    })
  );
  const tealRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: roofTex,
      roughness: 0.48,
      metalness: 0.14,
    })
  );
  const slateRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x35536b,
      roughness: 0.52,
      metalness: 0.14,
    })
  );
  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe3b94c,
      roughness: 0.24,
      metalness: 0.84,
    })
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x262930,
      roughness: 0.42,
      metalness: 0.76,
    })
  );
  const crimsonCarpetMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8f1924,
      roughness: 0.88,
      metalness: 0.02,
    })
  );
  const darkSlateGlassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x22384c,
      roughness: 0.18,
      metalness: 0.35,
    })
  );
  const wgBannerMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: wgFlagTex,
      roughness: 0.65,
      metalness: 0.04,
      side: THREE.DoubleSide,
    })
  );
  const waterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2496e8,
      emissive: 0x0b3964,
      emissiveIntensity: 0.22,
      roughness: 0.12,
      metalness: 0.18,
      transparent: true,
      opacity: 0.82,
    })
  );
  const jetWaterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x74dcff,
      emissive: 0x2596be,
      emissiveIntensity: 0.42,
      roughness: 0.16,
      metalness: 0.1,
      transparent: true,
      opacity: 0.76,
    })
  );
  const foliageMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x35783f,
      roughness: 0.86,
      metalness: 0.02,
      envMapIntensity: 0.35,
    })
  );
  const cypressDarkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x26542f,
      roughness: 0.88,
      metalness: 0.02,
      envMapIntensity: 0.3,
    })
  );
  const trunkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c422c,
      roughness: 0.9,
      metalness: 0.02,
    })
  );
  const dungeonWoodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3a2415,
      roughness: 0.92,
      metalness: 0.04,
      envMapIntensity: 0.06,
    })
  );
  const mansionFacadeMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: mansionTex,
      roughness: 0.56,
      metalness: 0.04,
    })
  );
  const conservatoryWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: conservatoryTex,
      roughness: 0.84,
      metalness: 0.04,
      envMapIntensity: 0.22,
      side: THREE.BackSide,
    })
  );
  const reverieDoorsMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: reverieDoorsTex,
      roughness: 0.38,
      metalness: 0.16,
    })
  );
  const lanternGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfff1be,
      emissive: 0xf7b944,
      emissiveIntensity: 1.35,
      roughness: 0.2,
    })
  );
  const resinBubbleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd4f4ff,
      emissive: 0x4ca6cc,
      emissiveIntensity: 0.24,
      roughness: 0.08,
      metalness: 0.15,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    })
  );
  const dungeonBrickMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: brickTex,
      roughness: 0.96,
      metalness: 0.02,
      envMapIntensity: 0.04,
      side: THREE.FrontSide,
    })
  );
  const dungeonIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e2128,
      roughness: 0.52,
      metalness: 0.62,
      envMapIntensity: 0.12,
    })
  );
  const torchFlameMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffa938,
      emissive: 0xff6200,
      emissiveIntensity: 1.8,
      roughness: 0.25,
    })
  );
  const sunBeamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfff5c8,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const silhouetteBlackMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x05060a,
      roughness: 0.94,
      metalness: 0.0,
      envMapIntensity: 0.03,
    })
  );
  const imuEyeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xef4444,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    })
  );
  const cloudMistMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf7fbff,
      emissive: 0xd9ecff,
      emissiveIntensity: 0.16,
      roughness: 0.95,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    })
  );

  // ---------------------------------------------------------------------------
  // 1. SCULPTED RED LINE PLATEAU & EASTERN RED PORT CLIFF TERRAIN
  // ---------------------------------------------------------------------------
  const segsX = 192;
  const segsZ = 152;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(
      MARY_GEOISE_TERRAIN_WIDTH,
      MARY_GEOISE_TERRAIN_DEPTH,
      segsX,
      segsZ
    )
  );
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i) + MARY_GEOISE_TERRAIN_CENTER_X;
    const lz = posAttr.getZ(i);
    const ly = sampleMaryGeoiseHeight(lx, lz);
    const sp = toMaryGeoiseSphereLocal(lx, ly, lz, globeRadius);
    posAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Shimmering Sapphire Water Planes (Socializing Pool & Castle Right Moat; Red Port sits on true globe ocean)
  const poolPlane = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(18.2 * S, 18.2 * S, 0.2 * S, 28)),
    waterMat
  );
  poolPlane.scale.set(1.0, 1.0, 0.64);
  placeOnMaryGeoiseSphere(
    poolPlane,
    MARY_GEOISE_LANDMARKS.socializingSquare.x - 1.5,
    -0.12,
    MARY_GEOISE_LANDMARKS.socializingSquare.z,
    globeRadius
  );
  group.add(poolPlane);

  const moatPlane = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(7.8 * S, 0.25 * S, 76 * S)),
    waterMat
  );
  placeOnMaryGeoiseSphere(moatPlane, 30.0, -0.25, -31.0, globeRadius);
  group.add(moatPlane);

  // Ornamental Marble Bridge crossing Right Moat along the East Red Port Royal Boulevard (z = -4)
  const moatBridge = new THREE.Group();
  const mbDeck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(11.0 * S, 0.65 * S, 12.4 * S)),
    marbleMat
  );
  mbDeck.position.y = 0.08 * S;
  moatBridge.add(mbDeck);
  for (const side of [-1, 1]) {
    const mbRail = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(11.0 * S, 1.0 * S, 0.5 * S)),
      goldMat
    );
    mbRail.position.set(0, 0.85 * S, side * 5.95 * S);
    moatBridge.add(mbRail);
  }
  placeOnMaryGeoiseSphere(moatBridge, 30.0, 0.0, -4.0, globeRadius);
  group.add(moatBridge);

  // ---------------------------------------------------------------------------
  // 2. FORTIFIED WHITE & GOLD PERIMETER WALLS, BASTIONS & TRIUMPHAL GATES
  // ---------------------------------------------------------------------------
  const addWallSegment = (
    x: number,
    z: number,
    len: number,
    height: number,
    thick: number,
    yaw = 0
  ) => {
    const wGroup = new THREE.Group();
    const core = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(len * S, height * S, thick * S)),
      marbleMat
    );
    core.position.y = height * 0.5 * S;
    wGroup.add(core);

    const goldBand = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry((len + 0.2) * S, 0.7 * S, (thick + 0.35) * S)),
      goldMat
    );
    goldBand.position.y = (height - 1.2) * S;
    wGroup.add(goldBand);

    // Battlement crenels along top
    const crenelCount = Math.max(3, Math.floor(len / 4.2));
    const crenelGeo = trackGeo(new THREE.BoxGeometry(1.7 * S, 1.35 * S, (thick + 0.15) * S));
    for (let i = 0; i < crenelCount; i++) {
      const cx = ((i + 0.5) / crenelCount - 0.5) * (len - 2.2) * S;
      const cr = new THREE.Mesh(crenelGeo, marbleMat);
      cr.position.set(cx, (height + 0.65) * S, 0);
      wGroup.add(cr);
    }

    placeOnMaryGeoiseSphere(wGroup, x, -0.2, z, globeRadius, yaw);
    group.add(wGroup);
  };

  // Perimeter Curtain Walls (North, South left/right of Main Gate, East flanking Red Port Gate at z=-4, solid West Wall)
  addWallSegment(0, -106, 196, 13.5, 4.2, 0);
  addWallSegment(-55, 104, 86, 12.5, 4.0, 0);
  addWallSegment(55, 104, 86, 12.5, 4.0, 0);
  addWallSegment(98, -60.5, 91, 12.5, 4.0, Math.PI / 2);
  addWallSegment(98, 55.5, 97, 12.5, 4.0, Math.PI / 2);
  addWallSegment(-98, -1.0, 210, 13.0, 4.2, Math.PI / 2);

  // Corner & Gate Guard Watchtowers
  const buildWallBastion = (bx: number, bz: number, tall = 20) => {
    const bGroup = new THREE.Group();
    const drum = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(4.2 * S, 4.6 * S, tall * S, 12)),
      marbleMat
    );
    drum.position.y = tall * 0.5 * S;
    const goldRim = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(4.55 * S, 4.55 * S, 0.9 * S, 12)),
      goldMat
    );
    goldRim.position.y = (tall - 0.8) * S;
    const roof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(4.8 * S, 7.2 * S, 12)),
      tealRoofMat
    );
    roof.position.y = (tall + 3.6) * S;
    const finial = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.16 * S, 0.35 * S, 3.2 * S, 8)),
      goldMat
    );
    finial.position.y = (tall + 8.4) * S;
    bGroup.add(drum, goldRim, roof, finial);
    placeOnMaryGeoiseSphere(bGroup, bx, -0.2, bz, globeRadius);
    group.add(bGroup);
  };

  for (const [bx, bz] of [
    [-98, -106],
    [98, -106],
    [-98, 104],
    [98, 104],
    [-12, 104],
    [12, 104],
    [98, -15],
    [98, 7],
  ]) {
    buildWallBastion(bx, bz, Math.abs(bz) > 100 ? 22 : 19);
  }

  // Grand Southern Triumphal Archway connecting walls across the Grand Promenade
  const southArch = new THREE.Group();
  const archLintel = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(20 * S, 5.2 * S, 4.6 * S)),
    marbleMat
  );
  archLintel.position.y = 12.2 * S;
  const archCrest = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(21 * S, 1.1 * S, 5.0 * S)),
    goldMat
  );
  archCrest.position.y = 15.2 * S;
  const archBanner = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(4.6 * S, 6.2 * S)),
    wgBannerMat
  );
  archBanner.position.set(0, 12.5 * S, 2.38 * S);
  southArch.add(archLintel, archCrest, archBanner);
  placeOnMaryGeoiseSphere(southArch, 0, 0, 104, globeRadius);
  group.add(southArch);

  // Eastern Red Port Triumphal Gate Archway overlooking the New World sea
  const eastArch = new THREE.Group();
  const eLintel = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(18 * S, 5.0 * S, 4.4 * S)),
    marbleMat
  );
  eLintel.position.y = 12.0 * S;
  const eCrest = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(19 * S, 1.1 * S, 4.8 * S)),
    goldMat
  );
  eCrest.position.y = 14.9 * S;
  const eBanner = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(4.4 * S, 5.8 * S)),
    wgBannerMat
  );
  eBanner.position.set(0, 12.2 * S, 2.32 * S);
  eastArch.add(eLintel, eCrest, eBanner);
  placeOnMaryGeoiseSphere(eastArch, 98, 0, -4, globeRadius, Math.PI / 2);
  group.add(eastArch);

  // ---------------------------------------------------------------------------
  // 3. CHÂTEAU DE PANGÉE (PANGAEA CASTLE) & SALLE DU TRÔNE VACANT (images 1–4)
  // ---------------------------------------------------------------------------
  const castleGroup = new THREE.Group();

  // Raised marble terrace plinth under Pangaea Castle
  const plinth = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(84 * S, 1.4 * S, 62 * S)),
    sandstoneMat
  );
  plinth.position.set(0, 0.55 * S, -41 * S);
  castleGroup.add(plinth);

  // Left & Right Multi-Story Chambord Palatial Wings (leaving central Empty Throne nave clear!)
  for (const side of [-1, 1]) {
    const wingBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(23 * S, 26 * S, 46 * S)),
      pangaeaWallMat
    );
    wingBody.position.set(side * 27.5 * S, 14.0 * S, -41 * S);
    wingBody.castShadow = true;
    castleGroup.add(wingBody);

    // Steep Chambord teal-slate pitched roof atop each wing (tucked flush inside corner drum towers!)
    const wingCornice = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(23.6 * S, 1.0 * S, 46.4 * S)),
      creamStoneMat
    );
    wingCornice.position.set(side * 27.5 * S, 27.2 * S, -41 * S);
    castleGroup.add(wingCornice);

    const wingRoof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(14.8 * S, 9.8 * S, 4)),
      tealRoofMat
    );
    wingRoof.rotation.y = Math.PI / 4;
    wingRoof.scale.set(0.96, 1.0, 1.82);
    wingRoof.position.set(side * 27.5 * S, 32.2 * S, -41 * S);
    castleGroup.add(wingRoof);

    // Secondary octagonal domed cupola flanking central spire (matching image_49a79cff.png)
    const cupDrum = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(3.8 * S, 4.1 * S, 7.5 * S, 8)),
      creamStoneMat
    );
    cupDrum.position.set(side * 21.5 * S, 31.0 * S, -29 * S);
    const cupDome = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(4.0 * S, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)),
      tealRoofMat
    );
    cupDome.position.set(side * 21.5 * S, 34.8 * S, -29 * S);
    const cupSpire = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.45 * S, 4.2 * S, 8)),
      goldMat
    );
    cupSpire.position.set(side * 21.5 * S, 40.2 * S, -29 * S);
    castleGroup.add(cupDrum, cupDome, cupSpire);
  }

  // Rear Castle Wall Bridge enclosing Empty Throne Hall behind the Throne Dais (z = -57..-63)
  const rearBridge = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(36 * S, 27 * S, 10 * S)),
    pangaeaWallMat
  );
  rearBridge.position.set(0, 14.5 * S, -58 * S);
  castleGroup.add(rearBridge);

  const rearRoof = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(37 * S, 4.5 * S, 11 * S)),
    tealRoofMat
  );
  rearRoof.position.set(0, 29.8 * S, -58 * S);
  castleGroup.add(rearRoof);

  // High Upper Story Clerestory Nave Roof over the Empty Throne Hall (y = 22..29m so interior stays tall!)
  const hallCeiling = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(34 * S, 5.5 * S, 36 * S)),
    creamStoneMat
  );
  hallCeiling.position.set(0, 25.0 * S, -35 * S);
  castleGroup.add(hallCeiling);

  const hallRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(20.5 * S, 10.5 * S, 4)),
    tealRoofMat
  );
  hallRoof.rotation.y = Math.PI / 4;
  hallRoof.scale.set(1.12, 1.0, 1.2);
  hallRoof.position.set(0, 32.8 * S, -35 * S);
  castleGroup.add(hallRoof);

  // Iconic Central Soaring Chambord Lantern / Clock Spire Tower (height ~84 m!)
  const spireBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(11.5 * S, 18.0 * S, 11.5 * S)),
    pangaeaWallMat
  );
  spireBase.position.set(0, 38.0 * S, -35 * S);
  const spireBaseBelt = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(12.2 * S, 1.2 * S, 12.2 * S)),
    creamStoneMat
  );
  spireBaseBelt.position.set(0, 46.8 * S, -35 * S);
  castleGroup.add(spireBase, spireBaseBelt);

  const spireDrum = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(5.2 * S, 5.8 * S, 15.0 * S, 14)),
    creamStoneMat
  );
  spireDrum.position.set(0, 54.0 * S, -35 * S);
  castleGroup.add(spireDrum);

  // Clock / Rose Medallions on front & rear faces of central spire (image_49a79cff.png)
  const clockGeo = trackGeo(new THREE.CylinderGeometry(2.1 * S, 2.1 * S, 0.5 * S, 16));
  clockGeo.rotateX(Math.PI / 2);
  for (const cz of [-29.4, -40.6]) {
    const clk = new THREE.Mesh(clockGeo, goldMat);
    clk.position.set(0, 55.5 * S, cz * S);
    const clkInner = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.55 * S, 1.55 * S, 0.65 * S, 16)),
      darkSlateGlassMat
    );
    clkInner.rotation.x = Math.PI / 2;
    clkInner.position.set(0, 55.5 * S, cz * S);
    const lowerMedallion = new THREE.Mesh(clockGeo, goldMat);
    lowerMedallion.scale.setScalar(0.75);
    lowerMedallion.position.set(0, 48.0 * S, cz * S);
    castleGroup.add(clk, clkInner, lowerMedallion);
  }

  const spireDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(5.5 * S, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)),
    tealRoofMat
  );
  spireDome.position.set(0, 61.5 * S, -35 * S);
  const spireLantern = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.3 * S, 2.8 * S, 8.5 * S, 10)),
    creamStoneMat
  );
  spireLantern.position.set(0, 69.5 * S, -35 * S);
  const spireCap = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(2.9 * S, 9.2 * S, 10)),
    tealRoofMat
  );
  spireCap.position.set(0, 78.0 * S, -35 * S);
  const spireNeedle = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.15 * S, 0.55 * S, 7.5 * S, 8)),
    goldMat
  );
  spireNeedle.position.set(0, 85.0 * S, -35 * S);
  castleGroup.add(spireDome, spireLantern, spireCap, spireNeedle);

  // 4 Prominent Front Chambord Drum Towers + 2 Rear Corner Towers (with dormers & slim chimneys)
  const drumPositions: readonly [number, number, number][] = [
    [-14.5, -15.5, 30],
    [14.5, -15.5, 30],
    [-36.0, -16.5, 29],
    [36.0, -16.5, 29],
    [-36.0, -60.0, 28],
    [36.0, -60.0, 28],
  ];
  for (const [tx, tz, th] of drumPositions) {
    const tDrum = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(5.5 * S, 5.8 * S, th * S, 16)),
      pangaeaWallMat
    );
    tDrum.position.set(tx * S, (th * 0.5 + 1.0) * S, tz * S);
    const tBelt = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(6.05 * S, 6.05 * S, 0.9 * S, 16)),
      creamStoneMat
    );
    tBelt.position.set(tx * S, (th + 1.1) * S, tz * S);
    const tCone = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(5.85 * S, 13.0 * S, 16)),
      tealRoofMat
    );
    tCone.position.set(tx * S, (th + 7.6) * S, tz * S);
    // Carved white front dormer lucarne
    const dormer = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.4 * S, 3.6 * S, 2.2 * S)),
      creamStoneMat
    );
    dormer.position.set(tx * S, (th + 4.2) * S, (tz + 4.2) * S);
    // Top lantern pinnacle + twin slender chimney stacks
    const tLantern = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.1 * S, 1.3 * S, 6.2 * S, 8)),
      creamStoneMat
    );
    tLantern.position.set(tx * S, (th + 16.2) * S, tz * S);
    const tNeedle = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.25 * S, 4.4 * S, 8)),
      tealRoofMat
    );
    tNeedle.position.set(tx * S, (th + 21.4) * S, tz * S);
    castleGroup.add(tDrum, tBelt, tCone, dormer, tLantern, tNeedle);

    for (const cx of [-2.4, 2.4]) {
      const chim = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.48 * S, 0.62 * S, 7.2 * S, 6)),
        creamStoneMat
      );
      chim.position.set((tx + cx) * S, (th + 10.5) * S, (tz - 1.5) * S);
      castleGroup.add(chim);
    }
  }

  // Grand Crenellated Sandstone Barbican Gatehouse (projecting forward, matching image_f89ac20a.png)
  const gateL = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.8 * S, 16.0 * S, 8.2 * S)),
    sandstoneMat
  );
  gateL.position.set(-7.1 * S, 8.2 * S, -9.2 * S);
  const gateR = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.8 * S, 16.0 * S, 8.2 * S)),
    sandstoneMat
  );
  gateR.position.set(7.1 * S, 8.2 * S, -9.2 * S);
  const gateUpper = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(21.0 * S, 6.8 * S, 8.2 * S)),
    sandstoneMat
  );
  gateUpper.position.set(0, 13.6 * S, -9.2 * S);
  const gateParapet = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(21.6 * S, 1.4 * S, 8.8 * S)),
    creamStoneMat
  );
  gateParapet.position.set(0, 17.5 * S, -9.2 * S);
  castleGroup.add(gateL, gateR, gateUpper, gateParapet);

  // Semicircular Iron Portcullis Archway top trim & 7-arch upper gallery windows (image_f89ac20a.png)
  const gateArchRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(3.8 * S, 0.55 * S, 8, 16, Math.PI)),
    creamStoneMat
  );
  gateArchRing.position.set(0, 6.4 * S, -5.0 * S);
  castleGroup.add(gateArchRing);

  for (let gx = -6.0; gx <= 6.1; gx += 2.0) {
    const arcWin = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.1 * S, 2.5 * S, 0.35 * S)),
      darkSlateGlassMat
    );
    arcWin.position.set(gx * S, 13.6 * S, -5.02 * S);
    castleGroup.add(arcWin);
  }
  for (const bx of [-9.5, -5.8, -2.0, 2.0, 5.8, 9.5]) {
    const crenel = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.8 * S, 1.5 * S, 1.4 * S)),
      sandstoneMat
    );
    crenel.position.set(bx * S, 18.9 * S, -5.4 * S);
    castleGroup.add(crenel);
  }

  // ---------------------------------------------------------------------------
  // 3B. INSIDE PANGAEA CASTLE: SALLE DU TRÔNE VACANT + 20 SWORDS + AUTHORITY HALL
  // ---------------------------------------------------------------------------
  // Crimson ceremonial carpet runner from Gatehouse (-6) up to Empty Throne Dais (-42)
  const carpet = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.6 * S, 0.16 * S, 37 * S)),
    crimsonCarpetMat
  );
  carpet.position.set(0, 1.32 * S, -24.5 * S);
  castleGroup.add(carpet);

  // 10 Fluted Interior Marble Columns & Hanging World Government Banners
  const colGeo = trackGeo(new THREE.CylinderGeometry(0.75 * S, 0.9 * S, 18.5 * S, 10));
  for (let cz = -18; cz >= -44; cz -= 6.5) {
    for (const side of [-1, 1]) {
      const col = new THREE.Mesh(colGeo, marbleMat);
      col.position.set(side * 10.5 * S, 10.4 * S, cz * S);
      const colCap = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(2.1 * S, 0.7 * S, 2.1 * S)),
        goldMat
      );
      colCap.position.set(side * 10.5 * S, 19.6 * S, cz * S);
      castleGroup.add(col, colCap);

      const banner = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(2.6 * S, 5.5 * S)),
        wgBannerMat
      );
      banner.position.set(side * 9.3 * S, 13.5 * S, cz * S);
      banner.rotation.y = side * -Math.PI * 0.5;
      castleGroup.add(banner);
    }
  }

  // Stepped Empty Throne Dais (z = -41..-47) + Ornate Golden Empty Throne + 20 Planted Weapons!
  for (let step = 0; step < 5; step++) {
    const sw = (13.5 - step * 1.4) * S;
    const sd = (9.5 - step * 1.0) * S;
    const stepMesh = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(sw, 0.52 * S, sd)),
      marbleMat
    );
    stepMesh.position.set(0, (1.45 + step * 0.52) * S, (-42.5 - step * 0.35) * S);
    castleGroup.add(stepMesh);
  }
  // Ornate Empty Throne (composite 4-part gilded seat + high crested backrest)
  const throneGroup = new THREE.Group();
  const tBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.8 * S, 1.4 * S, 2.2 * S)),
    goldMat
  );
  tBase.position.y = 0.7 * S;
  const tCushion = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.4 * S, 0.35 * S, 1.8 * S)),
    crimsonCarpetMat
  );
  tCushion.position.y = 1.55 * S;
  const tBack = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.8 * S, 4.4 * S, 0.55 * S)),
    goldMat
  );
  tBack.position.set(0, 3.4 * S, -0.85 * S);
  const tCrown = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.95 * S, 0)),
    goldMat
  );
  tCrown.position.set(0, 6.1 * S, -0.85 * S);
  throneGroup.add(tBase, tCushion, tBack, tCrown);
  throneGroup.position.set(0, 3.85 * S, -44.2 * S);
  castleGroup.add(throneGroup);

  // Ceremonial Royal Apse Backdrop & World Government Crest behind the Empty Throne Dais
  const throneApseWall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(18.0 * S, 18.5 * S, 1.4 * S)),
    creamStoneMat
  );
  throneApseWall.position.set(0, 10.2 * S, -49.2 * S);
  const throneVelvetTapestry = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(8.2 * S, 13.5 * S, 0.35 * S)),
    crimsonCarpetMat
  );
  throneVelvetTapestry.position.set(0, 9.6 * S, -48.4 * S);
  const throneCrest = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(4.2 * S, 6.2 * S)),
    wgBannerMat
  );
  throneCrest.position.set(0, 13.0 * S, -48.1 * S);
  castleGroup.add(throneApseWall, throneVelvetTapestry, throneCrest);

  // 20 Royal Founder Swords planted around the base of the Empty Throne steps!
  const bladeGeo = trackGeo(new THREE.BoxGeometry(0.18 * S, 2.3 * S, 0.06 * S));
  const hiltGeo = trackGeo(new THREE.BoxGeometry(0.68 * S, 0.16 * S, 0.16 * S));
  for (let sIdx = 0; sIdx < 20; sIdx++) {
    const side = sIdx < 10 ? -1 : 1;
    const rank = sIdx % 10;
    const sx = side * (3.6 + (rank % 5) * 1.15) * S;
    const sz = (-38.2 - Math.floor(rank / 5) * 2.2) * S;
    const sy = (1.9 + Math.floor(rank / 5) * 0.55) * S;
    const sword = new THREE.Group();
    const blade = new THREE.Mesh(bladeGeo, marbleMat);
    blade.position.y = 1.15 * S;
    const guard = new THREE.Mesh(hiltGeo, goldMat);
    guard.position.y = 2.1 * S;
    const pommel = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.08 * S, 0.08 * S, 0.55 * S, 6)),
      goldMat
    );
    pommel.position.y = 2.45 * S;
    sword.add(blade, guard, pommel);
    sword.position.set(sx, sy, sz);
    sword.rotation.z = side * 0.14;
    castleGroup.add(sword);
  }

  // Authority Council Sofa & Globe inside the West Wing Gallery (Cinq Doyens)
  const councilSofa = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.2 * S, 1.1 * S, 1.8 * S)),
    crimsonCarpetMat
  );
  councilSofa.position.set(-13.5 * S, 1.8 * S, -31.0 * S);
  const councilGlobe = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.85 * S, 12, 10)),
    goldMat
  );
  councilGlobe.position.set(-13.5 * S, 3.2 * S, -27.5 * S);
  castleGroup.add(councilSofa, councilGlobe);

  placeOnMaryGeoiseSphere(
    castleGroup,
    MARY_GEOISE_LANDMARKS.pangaeaCastle.x,
    0.0,
    0.0,
    globeRadius
  );
  group.add(castleGroup);

  // ---------------------------------------------------------------------------
  // 4. LA CHAMBRE DES FLEURS (SECRET ROOM OF FLOWERS SANCTUARY AT z = -80)
  // ---------------------------------------------------------------------------
  const flowersRoomGroup = new THREE.Group();
  const rfZ = MARY_GEOISE_LANDMARKS.roomOfFlowers.z;

  // Enclosed circular botanical conservatory wall veiled in lush climbing ivy & limestone arches
  const sancWall = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(18.5 * S, 19.0 * S, 16.0 * S, 24, 1, true)),
    conservatoryWallMat
  );
  sancWall.position.set(0, 8.0 * S, rfZ * S);
  flowersRoomGroup.add(sancWall);

  // Conservatory pilasters & hanging emerald vine curtains (half-step offset so no column sits behind Imu)
  const consPillarGeo = trackGeo(new THREE.CylinderGeometry(0.42 * S, 0.52 * S, 15.6 * S, 8));
  for (let p = 0; p < 12; p++) {
    const ang = ((p + 0.5) / 12) * Math.PI * 2;
    const cp = new THREE.Mesh(consPillarGeo, creamStoneMat);
    cp.position.set(Math.cos(ang) * 18.0 * S, 7.8 * S, (rfZ + Math.sin(ang) * 18.0) * S);
    flowersRoomGroup.add(cp);
  }

  // Outer stone shell & conservatory dome framing the sunlit oculus
  const sancOuterWall = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(19.6 * S, 20.0 * S, 16.0 * S, 24, 1, true)),
    creamStoneMat
  );
  sancOuterWall.position.set(0, 8.0 * S, rfZ * S);
  const sancOculusRim = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(11.5 * S, 1.4 * S, 8, 24)),
    tealRoofMat
  );
  sancOculusRim.rotation.x = Math.PI / 2;
  sancOculusRim.position.set(0, 16.2 * S, rfZ * S);
  flowersRoomGroup.add(sancOuterWall, sancOculusRim);

  // Sunlit Emerald Garden Floor & Raised Grass Mound inside the Room of Flowers
  const rfLawn = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(18.4 * S, 18.4 * S, 0.7 * S, 24)),
    foliageMat
  );
  rfLawn.position.set(0, 0.25 * S, rfZ * S);
  const rfMound = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(8.5 * S, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.42)),
    foliageMat
  );
  rfMound.scale.set(1.2, 0.28, 1.0);
  rfMound.position.set(0, -0.4 * S, (rfZ - 5.5) * S);
  flowersRoomGroup.add(rfLawn, rfMound);

  // Diagonal Golden Light Shafts behind/flanking Imu so the black silhouette pops crisply
  for (const bx of [-4.6, 4.6]) {
    const beam = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.8 * S, 4.4 * S, 18.0 * S, 12, 1, true)),
      sunBeamMat
    );
    beam.position.set(bx * S, 9.2 * S, (rfZ - 4.0) * S);
    beam.rotation.z = bx < 0 ? 0.14 : -0.14;
    flowersRoomGroup.add(beam);
  }

  // Tall Obsidian-Black Crowned Silhouette of Imu standing on the grassy mound among rare blossoms
  const imuGroup = new THREE.Group();
  const imuRobe = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.92 * S, 3.6 * S, 14)),
    silhouetteBlackMat
  );
  imuRobe.position.y = 1.8 * S;
  const imuShoulders = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.46 * S, 0.56 * S, 1.55 * S, 10)),
    silhouetteBlackMat
  );
  imuShoulders.position.y = 3.35 * S;
  const imuHead = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.28 * S, 10, 8)),
    silhouetteBlackMat
  );
  imuHead.position.y = 4.25 * S;
  const imuCrown = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.26 * S, 0.28 * S, 1.7 * S, 10)),
    silhouetteBlackMat
  );
  imuCrown.position.y = 5.2 * S;
  for (const spX of [-0.18, 0.0, 0.18]) {
    const spike = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.08 * S, 0.65 * S, 6)),
      silhouetteBlackMat
    );
    spike.position.set(spX * S, 6.3 * S, 0);
    imuGroup.add(spike);
  }
  for (const ex of [-0.09, 0.09]) {
    const eye = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.038 * S, 6, 6)),
      imuEyeMat
    );
    eye.position.set(ex * S, 4.28 * S, 0.25 * S);
    imuGroup.add(eye);
  }
  imuGroup.add(imuRobe, imuShoulders, imuHead, imuCrown);
  imuGroup.position.set(0, 1.45 * S, (rfZ - 6.5) * S);
  flowersRoomGroup.add(imuGroup);

  placeOnMaryGeoiseSphere(flowersRoomGroup, 0, 0, 0, globeRadius);
  group.add(flowersRoomGroup);

  // Instanced Multi-Petal Exotic Blossoms inside Room of Flowers
  const roomFlowers = buildMaryGeoiseRoomFlowers();
  const flowerStemGeo = trackGeo(new THREE.CylinderGeometry(0.045 * S, 0.06 * S, 0.78 * S, 5));
  flowerStemGeo.translate(0, 0.39 * S, 0);
  const flowerPetalGeo = trackGeo(new THREE.CylinderGeometry(0.28 * S, 0.08 * S, 0.24 * S, 6));
  flowerPetalGeo.translate(0, 0.84 * S, 0);
  const flowerCenterGeo = trackGeo(new THREE.SphereGeometry(0.11 * S, 6, 5));
  flowerCenterGeo.translate(0, 0.94 * S, 0);

  const flowerHeadMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x221622,
      emissiveIntensity: 0.42,
      roughness: 0.38,
      envMapIntensity: 0.45,
    })
  );
  const flowerCenterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.35,
      roughness: 0.35,
    })
  );
  const flowerStemInst = new THREE.InstancedMesh(flowerStemGeo, cypressDarkMat, roomFlowers.length);
  const flowerHeadInst = new THREE.InstancedMesh(flowerPetalGeo, flowerHeadMat, roomFlowers.length);
  const flowerCoreInst = new THREE.InstancedMesh(flowerCenterGeo, flowerCenterMat, roomFlowers.length);
  for (let i = 0; i < roomFlowers.length; i++) {
    const fl = roomFlowers[i];
    const sp = toMaryGeoiseSphereLocal(fl.x, fl.y, fl.z, globeRadius);
    const baseR = globeRadius + MARY_GEOISE_ALTITUDE;
    _localNormal.set(sp.x, baseR + sp.y, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _dummy.position.set(sp.x, sp.y, sp.z);
    _dummy.quaternion.copy(_tiltQuat);
    _dummy.scale.setScalar(fl.scale);
    _dummy.updateMatrix();
    flowerStemInst.setMatrixAt(i, _dummy.matrix);
    flowerHeadInst.setMatrixAt(i, _dummy.matrix);
    flowerCoreInst.setMatrixAt(i, _dummy.matrix);
    _tmpColor.setHex(fl.colorHex);
    flowerHeadInst.setColorAt(i, _tmpColor);
  }
  flowerStemInst.instanceMatrix.needsUpdate = true;
  flowerHeadInst.instanceMatrix.needsUpdate = true;
  flowerCoreInst.instanceMatrix.needsUpdate = true;
  if (flowerHeadInst.instanceColor) flowerHeadInst.instanceColor.needsUpdate = true;
  flowerStemInst.computeBoundingSphere();
  flowerHeadInst.computeBoundingSphere();
  flowerCoreInst.computeBoundingSphere();
  group.add(flowerStemInst, flowerHeadInst, flowerCoreInst);

  // Animated Fluttering Butterflies in the Room of Flowers
  const butterflies = buildMaryGeoiseButterflies();
  const butterflyGeo = trackGeo(new THREE.OctahedronGeometry(0.2 * S, 0));
  butterflyGeo.scale(2.1, 0.22, 1.15);
  const butterflyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffe48f,
      emissiveIntensity: 0.72,
      roughness: 0.3,
    })
  );
  const butterflyInst = new THREE.InstancedMesh(
    butterflyGeo,
    butterflyMat,
    butterflies.length
  );
  butterflyInst.frustumCulled = false;
  for (let i = 0; i < butterflies.length; i++) {
    _tmpColor.setHex(butterflies[i].tintHex);
    butterflyInst.setColorAt(i, _tmpColor);
  }
  if (butterflyInst.instanceColor) butterflyInst.instanceColor.needsUpdate = true;
  group.add(butterflyInst);

  // ---------------------------------------------------------------------------
  // 5. DOMAINE DES DRAGONS CÉLESTES: VILLAS, PROMENADE BALUSTRADES, TRAVOLATORS
  // ---------------------------------------------------------------------------
  const mansions = buildMaryGeoiseMansions();
  for (const m of mansions) {
    const mGroup = new THREE.Group();
    const roofM = m.roofKind === 'hip-dome' ? tealRoofMat : slateRoofMat;

    const body = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(m.width * S, m.height * S, m.depth * S)),
      mansionFacadeMat
    );
    body.position.y = m.height * 0.5 * S;
    body.castShadow = true;
    mGroup.add(body);

    const trim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry((m.width + 0.65) * S, 0.7 * S, (m.depth + 0.65) * S)),
      goldMat
    );
    trim.position.y = (m.height - 0.25) * S;
    mGroup.add(trim);

    // Roof silhouette + stone chimneys
    if (m.roofKind === 'hip-dome') {
      const dome = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(Math.min(m.width, m.depth) * 0.42 * S, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)),
        roofM
      );
      dome.position.y = m.height * S;
      const finial = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.45 * S, 2.2 * S, 6)),
        goldMat
      );
      finial.position.y = (m.height + Math.min(m.width, m.depth) * 0.42 + 0.8) * S;
      mGroup.add(dome, finial);
    } else {
      const roof = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(Math.max(m.width, m.depth) * 0.72 * S, 4.2 * S, 4)),
        roofM
      );
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(
        m.width / Math.max(m.width, m.depth),
        1,
        m.depth / Math.max(m.width, m.depth)
      );
      roof.position.y = (m.height + 2.1) * S;
      const chim = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.1 * S, 3.0 * S, 1.1 * S)),
        creamStoneMat
      );
      chim.position.set(m.width * 0.24 * S, (m.height + 2.5) * S, 0);
      mGroup.add(roof, chim);
    }

    // Front columned portico
    const portico = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(m.width * 0.42 * S, 3.2 * S, 1.5 * S)),
      marbleMat
    );
    portico.position.set(0, 1.6 * S, (m.depth * 0.5 + 0.6) * S);
    mGroup.add(portico);

    placeOnMaryGeoiseSphere(mGroup, m.x, m.y - 0.1, m.z, globeRadius, m.yaw);
    group.add(mGroup);
  }

  // Grand Marble Promenade Balustrades & Street Lantern Pedestals (image_f89ac20a.png)
  for (let pz = 0; pz <= 94; pz += 11.5) {
    for (const side of [-1, 1]) {
      const lamp = new THREE.Group();
      const ped = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.15 * S, 2.2 * S, 1.15 * S)),
        sandstoneMat
      );
      ped.position.y = 1.1 * S;
      const post = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.14 * S, 0.22 * S, 2.1 * S, 8)),
        darkIronMat
      );
      post.position.y = 3.2 * S;
      const globe = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.45 * S, 10, 8)),
        lanternGlowMat
      );
      globe.position.y = 4.4 * S;
      lamp.add(ped, post, globe);
      placeOnMaryGeoiseSphere(lamp, side * 12.6, 0, pz, globeRadius);
      group.add(lamp);
    }
  }

  // Automated Sub-Surface Travolator Tracks & Animated Celestial Dragons wearing Bubble Helmets
  for (const tx of [-5.6, 5.6]) {
    const trackFrame = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.4 * S, 0.22 * S, 92 * S)),
      darkIronMat
    );
    placeOnMaryGeoiseSphere(trackFrame, tx, 0.06, 48, globeRadius);
    group.add(trackFrame);

    const trackBelt = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.7 * S, 0.26 * S, 91 * S)),
      sandstoneMat
    );
    placeOnMaryGeoiseSphere(trackBelt, tx, 0.09, 48, globeRadius);
    group.add(trackBelt);
  }

  interface TravolatorRider {
    group: THREE.Group;
    laneX: number;
    dir: 1 | -1;
    baseZ: number;
  }
  const celestialRiders: TravolatorRider[] = [];
  for (let i = 0; i < 8; i++) {
    const rider = new THREE.Group();
    const robe = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.42 * S, 0.56 * S, 1.55 * S, 8)),
      marbleMat
    );
    robe.position.y = 0.85 * S;
    const collar = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.55 * S, 0.58 * S, 0.25 * S, 8)),
      goldMat
    );
    collar.position.y = 1.65 * S;
    const head = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.24 * S, 8, 6)),
      sandstoneMat
    );
    head.position.y = 1.98 * S;
    const bubbleHelmet = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.54 * S, 12, 10)),
      resinBubbleMat
    );
    bubbleHelmet.position.y = 2.02 * S;
    rider.add(robe, collar, head, bubbleHelmet);
    group.add(rider);

    const dir: 1 | -1 = i % 2 === 0 ? -1 : 1;
    const laneX = dir === -1 ? -5.6 : 5.6;
    const baseZ = 8 + (i % 4) * 22;
    placeOnMaryGeoiseSphere(rider, laneX, 0.2, baseZ, globeRadius);
    celestialRiders.push({ group: rider, laneX, dir, baseZ });
  }

  // Instanced Multi-Tiered Lush Cypress & Ornamental Park Trees
  const cypressTrees = buildMaryGeoiseCypressTrees();
  const cTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.22 * S, 0.32 * S, 1.0, 6));
  cTrunkGeo.translate(0, 0.5, 0);
  const cCrownLowGeo = trackGeo(new THREE.ConeGeometry(1.05, 0.65, 9));
  cCrownLowGeo.translate(0, 0.325, 0);
  const cCrownTopGeo = trackGeo(new THREE.ConeGeometry(0.76, 0.72, 9));
  cCrownTopGeo.translate(0, 0.62, 0);
  const tTrunkInst = new THREE.InstancedMesh(cTrunkGeo, trunkMat, cypressTrees.length);
  const tCrownLowInst = new THREE.InstancedMesh(cCrownLowGeo, cypressDarkMat, cypressTrees.length);
  const tCrownTopInst = new THREE.InstancedMesh(cCrownTopGeo, foliageMat, cypressTrees.length);
  for (let i = 0; i < cypressTrees.length; i++) {
    const t = cypressTrees[i];
    const sp = toMaryGeoiseSphereLocal(t.x, t.y - 0.1, t.z, globeRadius);
    const baseR = globeRadius + MARY_GEOISE_ALTITUDE;
    _localNormal.set(sp.x, baseR + sp.y, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);

    _dummy.position.set(sp.x, sp.y, sp.z);
    _dummy.quaternion.copy(_tiltQuat);
    _dummy.scale.set(1, t.height * 0.34 * S, 1);
    _dummy.updateMatrix();
    tTrunkInst.setMatrixAt(i, _dummy.matrix);

    const spCrown = toMaryGeoiseSphereLocal(t.x, t.y + t.height * 0.2, t.z, globeRadius);
    _dummy.position.set(spCrown.x, spCrown.y, spCrown.z);
    _dummy.scale.set(t.radius * S, t.height * 0.88 * S, t.radius * S);
    _dummy.updateMatrix();
    tCrownLowInst.setMatrixAt(i, _dummy.matrix);
    tCrownTopInst.setMatrixAt(i, _dummy.matrix);
    _tmpColor.setRGB(0.18, 0.42 + (i % 3) * 0.04, 0.21);
    tCrownLowInst.setColorAt(i, _tmpColor);
    _tmpColor.setRGB(0.24, 0.52 + (i % 4) * 0.04, 0.26);
    tCrownTopInst.setColorAt(i, _tmpColor);
  }
  tTrunkInst.instanceMatrix.needsUpdate = true;
  tCrownLowInst.instanceMatrix.needsUpdate = true;
  tCrownTopInst.instanceMatrix.needsUpdate = true;
  if (tCrownLowInst.instanceColor) tCrownLowInst.instanceColor.needsUpdate = true;
  if (tCrownTopInst.instanceColor) tCrownTopInst.instanceColor.needsUpdate = true;
  tTrunkInst.computeBoundingSphere();
  tCrownLowInst.computeBoundingSphere();
  tCrownTopInst.computeBoundingSphere();
  group.add(tTrunkInst, tCrownLowInst, tCrownTopInst);

  // ---------------------------------------------------------------------------
  // 6. DOMAINE DES DIEUX & PLACE DE LA SOCIALISATION (image_d00e3501.png)
  // ---------------------------------------------------------------------------
  const socialGroup = new THREE.Group();
  const sqX = MARY_GEOISE_LANDMARKS.socializingSquare.x;
  const sqZ = MARY_GEOISE_LANDMARKS.socializingSquare.z;

  // Centerpiece Circular Marble Rotunda Pavilion with 5 Rounded Arches, Reverie Doors & Teal Dome (image_d00e3501.png)
  const pavGroup = new THREE.Group();
  const pavBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(11.0 * S, 11.6 * S, 1.5 * S, 24)),
    marbleMat
  );
  pavBase.position.y = 0.75 * S;
  const pavStairs = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(7.2 * S, 1.2 * S, 5.2 * S)),
    marbleMat
  );
  pavStairs.position.set(-10.8 * S, 0.45 * S, 0.8 * S);
  pavStairs.rotation.y = -0.18;
  pavGroup.add(pavBase, pavStairs);

  // Inner gilded & glazed Levely ceremonial double doors + 10 outer colonnade piers with arch trim
  const pavCore = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(6.8 * S, 6.8 * S, 7.4 * S, 20)),
    reverieDoorsMat
  );
  pavCore.position.y = 4.9 * S;
  pavGroup.add(pavCore);

  const pavColGeo = trackGeo(new THREE.CylinderGeometry(0.42 * S, 0.5 * S, 7.8 * S, 10));
  for (let c = 0; c < 10; c++) {
    const ang = (c / 10) * Math.PI * 2;
    const col = new THREE.Mesh(pavColGeo, marbleMat);
    col.position.set(Math.cos(ang) * 9.8 * S, 5.2 * S, Math.sin(ang) * 9.8 * S);
    pavGroup.add(col);
  }
  const pavCornice = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(10.8 * S, 10.6 * S, 1.3 * S, 24)),
    marbleMat
  );
  pavCornice.position.y = 9.4 * S;
  const pavGoldTrim = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(10.95 * S, 10.95 * S, 0.35 * S, 24)),
    goldMat
  );
  pavGoldTrim.position.y = 9.95 * S;
  const pavDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(10.2 * S, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5)),
    tealRoofMat
  );
  pavDome.scale.set(1, 0.65, 1);
  pavDome.position.y = 10.0 * S;
  const pavLantern = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.4 * S, 1.6 * S, 4.5 * S, 10)),
    marbleMat
  );
  pavLantern.position.y = 18.0 * S;
  const pavLanternCap = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(1.65 * S, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)),
    tealRoofMat
  );
  pavLanternCap.position.y = 20.2 * S;
  pavGroup.add(pavCornice, pavGoldTrim, pavDome, pavLantern, pavLanternCap);

  placeOnMaryGeoiseSphere(
    pavGroup,
    MARY_GEOISE_LANDMARKS.socializingPavilion.x,
    0,
    MARY_GEOISE_LANDMARKS.socializingPavilion.z,
    globeRadius
  );
  group.add(pavGroup);

  // Curved Marble Colonnade Wings flanking the Socializing Pool (image_d00e3501.png)
  for (const side of [-1, 1]) {
    const colonnade = new THREE.Group();
    const backWall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(18.0 * S, 7.2 * S, 2.2 * S)),
      marbleMat
    );
    backWall.position.y = 3.6 * S;
    const roof = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(19.0 * S, 1.1 * S, 4.5 * S)),
      tealRoofMat
    );
    roof.position.set(0, 7.6 * S, 1.0 * S);
    colonnade.add(backWall, roof);
    for (let cx = -7.5; cx <= 7.6; cx += 3.0) {
      const col = new THREE.Mesh(pavColGeo, marbleMat);
      col.scale.set(0.75, 0.85, 0.75);
      col.position.set(cx * S, 3.3 * S, 2.6 * S);
      colonnade.add(col);
    }
    placeOnMaryGeoiseSphere(
      colonnade,
      sqX + 8.0,
      0,
      sqZ + side * 19.5,
      globeRadius,
      side === -1 ? -0.35 : -Math.PI + 0.35
    );
    group.add(colonnade);
  }

  // Twin Sculpted Curving Cyan Water-Jet Arc Fountains inside the Pool (matching image_d00e3501.png M-arches!)
  for (const fz of [sqZ - 8.5, sqZ + 8.5]) {
    const fGroup = new THREE.Group();
    const fBasin = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.6 * S, 2.9 * S, 0.9 * S, 16)),
      marbleMat
    );
    fBasin.position.y = 0.45 * S;
    const fStem = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.45 * S, 0.65 * S, 2.8 * S, 10)),
      marbleMat
    );
    fStem.position.y = 1.8 * S;
    fGroup.add(fBasin, fStem);

    for (const side of [-1, 1]) {
      const arcCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 3.2 * S, 0),
        new THREE.Vector3(0, 4.6 * S, side * 1.1 * S),
        new THREE.Vector3(0, 3.4 * S, side * 2.1 * S),
        new THREE.Vector3(0, 0.5 * S, side * 2.4 * S),
      ]);
      const jetMesh = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(arcCurve, 14, 0.32 * S, 8, false)),
        jetWaterMat
      );
      fGroup.add(jetMesh);
    }
    placeOnMaryGeoiseSphere(fGroup, sqX - 6.5, 0, fz, globeRadius);
    group.add(fGroup);
  }

  // Elite CP0 Guards in White Suits & Masks standing on the Rotunda Steps & Paved Quay (clear of water!)
  const cp0Spots: readonly [number, number, number][] = [
    [57.5, 1.35, 22.8],
    [57.8, 1.35, 25.4],
    [59.2, 1.45, 24.0],
    [35.2, 0.0, 27.5],
    [35.2, 0.0, 42.5],
  ];
  for (const [gx, gy, gz] of cp0Spots) {
    const cp0 = new THREE.Group();
    const legs = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.24 * S, 0.28 * S, 0.85 * S, 8)),
      marbleMat
    );
    legs.position.y = 0.425 * S;
    const torso = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.58 * S, 0.72 * S, 0.32 * S)),
      marbleMat
    );
    torso.position.y = 1.2 * S;
    const tie = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.1 * S, 0.52 * S, 0.36 * S)),
      darkIronMat
    );
    tie.position.y = 1.22 * S;
    const maskHead = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.2 * S, 8, 6)),
      marbleMat
    );
    maskHead.position.y = 1.72 * S;
    const hatBrim = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.32 * S, 0.32 * S, 0.05 * S, 10)),
      darkIronMat
    );
    hatBrim.position.y = 1.88 * S;
    const bowlerHat = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.2 * S, 0.22 * S, 0.24 * S, 10)),
      darkIronMat
    );
    bowlerHat.position.y = 2.0 * S;
    cp0.add(legs, torso, tie, maskHead, hatBrim, bowlerHat);
    placeOnMaryGeoiseSphere(cp0, gx, gy, gz, globeRadius, -Math.PI / 2);
    group.add(cp0);
  }
  group.add(socialGroup);

  // ---------------------------------------------------------------------------
  // 7. LES SOUTERRAINS & QUARTIERS DES ESCLAVES (UNDERGROUND AT y = -14 m)
  // ---------------------------------------------------------------------------
  const ugGroup = new THREE.Group();
  const ugFloorY = MARY_GEOISE_UNDERGROUND_FLOOR_Y;
  const ugZ = MARY_GEOISE_LANDMARKS.slaveQuarters.z;

  // Damp cobblestone dungeon floor & enclosed vaulted brick chamber (58m x 40m x 11.5m)
  const ugFloor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(58 * S, 0.8 * S, 42 * S)),
    dungeonBrickMat
  );
  ugFloor.position.set(0, (ugFloorY - 0.4) * S, ugZ * S);
  const ugCeil = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(58 * S, 0.8 * S, 42 * S)),
    dungeonBrickMat
  );
  ugCeil.position.set(0, (ugFloorY + 11.6) * S, ugZ * S);
  const ugBackWall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(58 * S, 12.2 * S, 1.2 * S)),
    dungeonBrickMat
  );
  ugBackWall.position.set(0, (ugFloorY + 5.7) * S, (ugZ - 21) * S);
  const ugFrontWall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(58 * S, 12.2 * S, 1.2 * S)),
    dungeonBrickMat
  );
  ugFrontWall.position.set(0, (ugFloorY + 5.7) * S, (ugZ + 21) * S);
  ugGroup.add(ugFloor, ugCeil, ugBackWall, ugFrontWall);

  // East & West Iron-Barred Slave Cells + Wall Pillars + Flickering Torches
  const barGeo = trackGeo(new THREE.CylinderGeometry(0.09 * S, 0.09 * S, 7.2 * S, 6));
  const ugPillarGeo = trackGeo(new THREE.BoxGeometry(2.2 * S, 11.4 * S, 2.2 * S));
  for (let pz = ugZ - 16; pz <= ugZ + 16; pz += 8) {
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(ugPillarGeo, dungeonBrickMat);
      pillar.position.set(side * 15.5 * S, (ugFloorY + 5.7) * S, pz * S);
      ugGroup.add(pillar);

      const outerWall = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.2 * S, 12.2 * S, 8.2 * S)),
        dungeonBrickMat
      );
      outerWall.position.set(side * 28.0 * S, (ugFloorY + 5.7) * S, pz * S);
      ugGroup.add(outerWall);

      // Cell iron bars
      for (let b = -3.0; b <= 3.1; b += 1.0) {
        const bar = new THREE.Mesh(barGeo, dungeonIronMat);
        bar.position.set(side * 19.5 * S, (ugFloorY + 3.6) * S, (pz + b) * S);
        ugGroup.add(bar);
      }

      // Captive prisoner silhouette inside cell
      const prisoner = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.28 * S, 0.34 * S, 1.55 * S, 7)),
        silhouetteBlackMat
      );
      prisoner.position.set(side * 23.0 * S, (ugFloorY + 0.8) * S, pz * S);
      ugGroup.add(prisoner);

      // Warm torch sconce on every inner pillar
      const sconce = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.14 * S, 0.1 * S, 0.9 * S, 6)),
        dungeonIronMat
      );
      sconce.position.set(side * 14.2 * S, (ugFloorY + 4.4) * S, pz * S);
      const flame = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.32 * S, 0.85 * S, 6)),
        torchFlameMat
      );
      flame.position.set(side * 14.2 * S, (ugFloorY + 5.1) * S, pz * S);
      ugGroup.add(sconce, flame);
    }
  }

  // Animated Giant Dark Timber & Brass Travolator Capstan Wheels + Chain Drives
  const capstanWheels: THREE.Group[] = [];
  for (const [wx, wz] of [
    [-5.6, ugZ - 8.0],
    [5.6, ugZ - 8.0],
    [-5.6, ugZ + 6.0],
    [5.6, ugZ + 6.0],
  ]) {
    const capGroup = new THREE.Group();
    const hub = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.1 * S, 1.3 * S, 11.2 * S, 10)),
      dungeonWoodMat
    );
    hub.position.y = 5.6 * S;
    const gearRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(3.4 * S, 0.35 * S, 8, 16)),
      goldMat
    );
    gearRing.rotation.x = Math.PI / 2;
    gearRing.position.y = 8.8 * S;
    capGroup.add(hub, gearRing);

    for (let spoke = 0; spoke < 4; spoke++) {
      const ang = (spoke / 4) * Math.PI * 2;
      const bar = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(7.2 * S, 0.32 * S, 0.32 * S)),
        dungeonWoodMat
      );
      bar.position.y = 1.85 * S;
      bar.rotation.y = ang;
      capGroup.add(bar);

      // Slave laborer silhouette pushing the capstan bar
      const slave = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.28 * S, 0.34 * S, 1.6 * S, 7)),
        silhouetteBlackMat
      );
      slave.position.set(Math.cos(ang) * 3.1 * S, 0.8 * S, Math.sin(ang) * 3.1 * S);
      capGroup.add(slave);
    }

    capGroup.position.set(wx * S, ugFloorY * S, wz * S);
    ugGroup.add(capGroup);
    capstanWheels.push(capGroup);
  }

  // Restrained warm torchlight so dark damp dungeon brickwork, iron bars & capstans look atmospheric
  const ugLightA = new THREE.PointLight(0xff7426, 0.55, 38 * S, 1.6);
  ugLightA.position.set(0, (ugFloorY + 6.8) * S, (ugZ - 4) * S);
  const ugLightB = new THREE.PointLight(0xff8438, 0.45, 36 * S, 1.6);
  ugLightB.position.set(0, (ugFloorY + 6.8) * S, (ugZ + 10) * S);
  ugGroup.add(ugLightA, ugLightB);

  placeOnMaryGeoiseSphere(ugGroup, 0, 0, 0, globeRadius);
  group.add(ugGroup);

  // ---------------------------------------------------------------------------
  // 8. RED PORT EAST SEAWARD CLIFF: 400M HYDRAULIC ELEVATOR, BONDOLAS & SEA HARBOR
  // ---------------------------------------------------------------------------
  const rpZ = MARY_GEOISE_LANDMARKS.redPortUpperGate.z;

  // A. Upper Cliffside Terminal & Cantilevered Summit Elevator Boarding Bridge (East Wall Edge, x = 100..138, y = 0)
  const upperTerm = new THREE.Group();
  const utDeck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(14.0 * S, 2.4 * S, 44.0 * S)),
    sandstoneMat
  );
  utDeck.position.set(0, -0.6 * S, -4.0 * S);
  const utRail = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.45 * S, 1.15 * S, 42.0 * S)),
    goldMat
  );
  utRail.position.set(6.7 * S, 1.1 * S, -4.0 * S);

  // Twin Bondola Cableway Stone & Gold Pylons at Summit Terminal
  for (const pzOff of [-5.8, 5.8]) {
    const pylon = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.4 * S, 16.5 * S, 3.6 * S)),
      marbleMat
    );
    pylon.position.set(3.0 * S, 8.2 * S, pzOff * S);
    const pylonCap = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(2.8 * S, 4.2 * S, 4)),
      tealRoofMat
    );
    pylonCap.rotation.y = Math.PI / 4;
    pylonCap.position.set(3.0 * S, 18.4 * S, pzOff * S);
    upperTerm.add(pylon, pylonCap);
  }
  const utCrossBeam = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.8 * S, 2.6 * S, 17.5 * S)),
    goldMat
  );
  utCrossBeam.position.set(3.0 * S, 15.2 * S, 0);

  // Cantilevered Steel & Marble Boarding Bridge projecting out to the Seaward Elevator Shaft (x = 110 -> 138, z = -20)
  const gantryBridge = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(30.0 * S, 1.8 * S, 7.6 * S)),
    darkIronMat
  );
  gantryBridge.position.set(17.5 * S, -0.3 * S, -16.0 * S);
  const gantryDeck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(30.0 * S, 0.45 * S, 6.4 * S)),
    marbleMat
  );
  gantryDeck.position.set(17.5 * S, 0.72 * S, -16.0 * S);
  for (const rSide of [-1, 1]) {
    const gRail = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(29.5 * S, 1.0 * S, 0.35 * S)),
      goldMat
    );
    gRail.position.set(17.5 * S, 1.45 * S, (-16.0 + rSide * 3.0) * S);
    upperTerm.add(gRail);
  }

  upperTerm.add(utDeck, utRail, utCrossBeam, gantryBridge, gantryDeck);
  placeOnMaryGeoiseSphere(upperTerm, 106.5, 0, rpZ, globeRadius);
  group.add(upperTerm);

  // B. 400 m Seaward Hydraulic Elevator Tower anchored to the Eastern Red Line Cliff (x = 138, z = -20)
  const elevX = 138.0;
  const elevZ = rpZ - 16.0;
  const spElevBot = toMaryGeoiseSphereLocal(elevX, MARY_GEOISE_RED_PORT_SEA_Y - 2.0, elevZ, globeRadius);
  const spElevTop = toMaryGeoiseSphereLocal(elevX, 16.0, elevZ, globeRadius);
  const elevBotVec = new THREE.Vector3(spElevBot.x, spElevBot.y, spElevBot.z);
  const elevTopVec = new THREE.Vector3(spElevTop.x, spElevTop.y, spElevTop.z);
  const elevAxis = new THREE.Vector3().subVectors(elevTopVec, elevBotVec);
  const elevTotalLen = elevAxis.length();

  const elevTowerGroup = new THREE.Group();
  elevTowerGroup.position.copy(elevBotVec);
  elevTowerGroup.quaternion.setFromUnitVectors(_up, elevAxis.clone().normalize());

  // 4 Vertical Steel Lattice Guide Columns spanning full 400m from Sea Port up to Summit Bridge
  for (const cx of [-2.8, 2.8]) {
    for (const cz of [-2.8, 2.8]) {
      const col = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.85 * S, elevTotalLen, 0.85 * S)),
        darkIronMat
      );
      col.position.set(cx * S, elevTotalLen * 0.5, cz * S);
      elevTowerGroup.add(col);
    }
  }
  // Horizontal Gold-Trimmed Steel Brace Frames every ~32 m + Cliff Wall Anchor Struts
  const ringCount = 13;
  for (let r = 0; r <= ringCount; r++) {
    const ry = (r / ringCount) * (elevTotalLen - 12 * S) + 4 * S;
    const ring = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(6.8 * S, 1.1 * S, 6.8 * S)),
      r === ringCount || r === 0 ? goldMat : darkIronMat
    );
    ring.position.set(0, ry, 0);
    elevTowerGroup.add(ring);

    // Steel anchor struts bolted West back into the Red Line cliff face along upper & middle cliff
    if (r >= 2 && r <= ringCount - 1) {
      const anchorLen = (32.0 - (r / ringCount) * 20.0) * S;
      const anchor = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(anchorLen, 1.5 * S, 5.4 * S)),
        darkIronMat
      );
      anchor.position.set(-anchorLen * 0.5, ry, 0);
      elevTowerGroup.add(anchor);
    }
  }

  // Animated Hydraulic Elevator Lift Car descending all the way from Summit (y=0) to Ocean Harbor (y=-397)
  const elevCar = new THREE.Group();
  const carDeck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.2 * S, 0.9 * S, 5.2 * S)),
    marbleMat
  );
  const carTrim = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.5 * S, 0.55 * S, 5.5 * S)),
    goldMat
  );
  carTrim.position.y = 0.6 * S;
  const carCanopy = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.4 * S, 0.8 * S, 5.4 * S)),
    crimsonCarpetMat
  );
  carCanopy.position.y = 4.6 * S;
  const carBeacon = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.65 * S, 8, 6)),
    lanternGlowMat
  );
  carBeacon.position.y = 5.4 * S;
  for (const px of [-2.2, 2.2]) {
    for (const pz of [-2.2, 2.2]) {
      const post = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.18 * S, 0.18 * S, 4.2 * S, 6)),
        goldMat
      );
      post.position.set(px * S, 2.5 * S, pz * S);
      elevCar.add(post);
    }
  }
  elevCar.add(carDeck, carTrim, carCanopy, carBeacon);
  elevTowerGroup.add(elevCar);
  group.add(elevTowerGroup);

  // C. Twin Diagonal Bondola Cableways (Summit Terminal -> Sea-Level Red Port Terminal)
  const baseRSphere = globeRadius + MARY_GEOISE_ALTITUDE;

  for (const czOff of [-4.8, 4.8]) {
    const spU = toMaryGeoiseSphereLocal(109.5, 14.5, rpZ + czOff, globeRadius);
    const spL = toMaryGeoiseSphereLocal(162.0, MARY_GEOISE_RED_PORT_SEA_Y + 11.2, rpZ + czOff, globeRadius);
    const uV = new THREE.Vector3(spU.x, spU.y, spU.z);
    const lV = new THREE.Vector3(spL.x, spL.y, spL.z);
    const cV = new THREE.Vector3().subVectors(lV, uV);
    const cable = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.32 * S, 0.32 * S, cV.length(), 8)),
      darkIronMat
    );
    cable.position.addVectors(uV, lV).multiplyScalar(0.5);
    cable.quaternion.setFromUnitVectors(_up, cV.clone().normalize());
    group.add(cable);
  }

  // Mid-Cliff Bondola Cable Support Bracket anchored into the East Red Line rock
  const midBracket = new THREE.Group();
  const mbArm = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(16.0 * S, 3.2 * S, 13.5 * S)),
    darkIronMat
  );
  const mbCap = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.2 * S, 4.4 * S, 14.2 * S)),
    goldMat
  );
  mbCap.position.x = 7.4 * S;
  midBracket.add(mbArm, mbCap);
  placeOnMaryGeoiseSphere(midBracket, 128.0, -195.0, rpZ, globeRadius);
  group.add(midBracket);

  // 4 Animated Bondola Gondola Cabins gliding between Summit and Sea Level
  interface BondolaSpec {
    group: THREE.Group;
    laneZOff: number;
    phase: number;
  }
  const bondolas: BondolaSpec[] = [];
  for (let i = 0; i < 4; i++) {
    const bGroup = new THREE.Group();
    const hanger = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.16 * S, 0.16 * S, 2.8 * S, 6)),
      darkIronMat
    );
    hanger.position.y = 1.4 * S;
    const cabin = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.4 * S, 3.4 * S, 3.8 * S)),
      crimsonCarpetMat
    );
    cabin.position.y = -1.2 * S;
    const cabinTrim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.7 * S, 0.55 * S, 4.1 * S)),
      goldMat
    );
    cabinTrim.position.y = 0.28 * S;
    bGroup.add(hanger, cabin, cabinTrim);
    group.add(bGroup);
    bondolas.push({
      group: bGroup,
      laneZOff: i < 2 ? -4.8 : 4.8,
      phase: (i % 2) * 0.5 + (i >= 2 ? 0.25 : 0),
    });
  }

  // D. RED PORT LOWER OCEAN HARBOR AT TRUE SEA LEVEL (r = GLOBE_RADIUS = 10.0, East edge of Red Line)
  const lowerPortGroup = new THREE.Group();

  // Main Sea-Level Harbor Stone Quay & Marble Promenade Deck (y = -3m underwater .. +3.0m above sea)
  const mainQuay = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(36.0 * S, 6.2 * S, 72.0 * S)),
    sandstoneMat
  );
  mainQuay.position.set(-4.0 * S, 0.0, 0);
  const mainQuayTop = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(34.5 * S, 0.5 * S, 70.5 * S)),
    marbleMat
  );
  mainQuayTop.position.set(-4.0 * S, 3.05 * S, 0);
  const quayGoldEdge = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.9 * S, 0.7 * S, 71.0 * S)),
    goldMat
  );
  quayGoldEdge.position.set(13.6 * S, 3.05 * S, 0);
  lowerPortGroup.add(mainQuay, mainQuayTop, quayGoldEdge);

  // Sea-Level Elevator Landing Jetty connecting Elevator Tower Base (x = 138, z = -20) to Main Quay
  const elevJetty = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(16.0 * S, 5.8 * S, 12.0 * S)),
    sandstoneMat
  );
  elevJetty.position.set(-24.0 * S, 0.1 * S, -16.0 * S);
  const elevJettyTop = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(15.2 * S, 0.5 * S, 11.2 * S)),
    marbleMat
  );
  elevJettyTop.position.set(-24.0 * S, 3.0 * S, -16.0 * S);
  lowerPortGroup.add(elevJetty, elevJettyTop);

  // Twin Breakwater Jetties jutting East into the Open New World Ocean
  for (const pz of [-29.0, 29.0]) {
    const jetty = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(24.0 * S, 5.2 * S, 9.0 * S)),
      sandstoneMat
    );
    jetty.position.set(22.0 * S, 0.1 * S, pz * S);
    const jettyDeck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(23.0 * S, 0.45 * S, 8.2 * S)),
      marbleMat
    );
    jettyDeck.position.set(22.0 * S, 2.75 * S, pz * S);
    const jettyLamp = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.8 * S, 8, 6)),
      lanternGlowMat
    );
    jettyLamp.position.set(32.5 * S, 5.4 * S, pz * S);
    const lampPost = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.25 * S, 0.35 * S, 2.6 * S, 6)),
      darkIronMat
    );
    lampPost.position.set(32.5 * S, 4.0 * S, pz * S);
    lowerPortGroup.add(jetty, jettyDeck, lampPost, jettyLamp);
  }

  // Grand Red Port Sea Terminal Building (receiving the Bondola cables at y = +11.2 m)
  const rpTermHall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(16.0 * S, 9.2 * S, 26.0 * S)),
    pangaeaWallMat
  );
  rpTermHall.position.set(-4.0 * S, 7.6 * S, 0);
  const rpTermRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(13.5 * S, 6.2 * S, 4)),
    tealRoofMat
  );
  rpTermRoof.rotation.y = Math.PI / 4;
  rpTermRoof.scale.set(0.88, 1.0, 1.38);
  rpTermRoof.position.set(-4.0 * S, 15.2 * S, 0);
  const rpTermArch = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.2 * S, 3.2 * S, 16.5 * S)),
    goldMat
  );
  rpTermArch.position.set(-5.0 * S, 11.4 * S, 0);
  const rpTermBanner = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(4.0 * S, 5.8 * S)),
    wgBannerMat
  );
  rpTermBanner.rotation.y = Math.PI / 2;
  rpTermBanner.position.set(4.15 * S, 7.8 * S, 0);
  lowerPortGroup.add(rpTermHall, rpTermRoof, rpTermArch, rpTermBanner);

  // Tall Harbor Beacon Lighthouse at the tip of the South Breakwater (world x ~ 196, z ~ +25)
  const lhBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.4 * S, 3.4 * S, 20.0 * S, 12)),
    marbleMat
  );
  lhBase.position.set(29.0 * S, 12.2 * S, 29.0 * S);
  const lhGallery = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(3.0 * S, 3.0 * S, 1.2 * S, 12)),
    goldMat
  );
  lhGallery.position.set(29.0 * S, 22.4 * S, 29.0 * S);
  const lhLantern = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.7 * S, 1.7 * S, 3.0 * S, 10)),
    lanternGlowMat
  );
  lhLantern.position.set(29.0 * S, 24.4 * S, 29.0 * S);
  const lhCap = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(2.5 * S, 3.6 * S, 10)),
    tealRoofMat
  );
  lhCap.position.set(29.0 * S, 27.6 * S, 29.0 * S);
  lowerPortGroup.add(lhBase, lhGallery, lhLantern, lhCap);

  // 3 Moored World Government Escort Ships Floating Directly on the East Sea beside the Piers
  for (const [sx, sz, sYaw] of [
    [22.0, -14.0, 0.08],
    [24.0, 12.0, -0.06],
    [10.0, 46.0, 0.25],
  ] as const) {
    const ship = new THREE.Group();
    const shipHull = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(15.0 * S, 2.8 * S, 4.8 * S)),
      marbleMat
    );
    shipHull.position.y = 0.8 * S;
    const shipTrim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(15.4 * S, 0.55 * S, 5.1 * S)),
      goldMat
    );
    shipTrim.position.y = 2.0 * S;
    ship.add(shipHull, shipTrim);
    for (const mx of [-3.5, 2.5]) {
      const mast = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.18 * S, 0.25 * S, 10.5 * S, 6)),
        trunkMat
      );
      mast.position.set(mx * S, 6.8 * S, 0);
      const sail = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.22 * S, 5.6 * S, 4.6 * S)),
        marbleMat
      );
      sail.position.set((mx + 0.35) * S, 7.6 * S, 0);
      ship.add(mast, sail);
    }
    ship.position.set(sx * S, 0, sz * S);
    ship.rotation.y = sYaw;
    lowerPortGroup.add(ship);
  }

  placeOnMaryGeoiseSphere(
    lowerPortGroup,
    166.0,
    MARY_GEOISE_RED_PORT_SEA_Y,
    rpZ,
    globeRadius
  );
  group.add(lowerPortGroup);

  // Wispy high-altitude cloud puffs wrapping North/South/West plateau edges (kept clear of East Red Port sightline)
  const cloudGroup = new THREE.Group();
  for (let c = 0; c < 14; c++) {
    const cloud = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry((9.0 + (c % 4) * 3.5) * S, 10, 8)),
      cloudMistMat
    );
    cloud.scale.set(2.2, 0.35, 1.4);
    const cz = c % 2 === 0 ? -105 - (c % 3) * 12 : 108 + (c % 3) * 12;
    const cx = -90 + c * 15;
    const cy = -45 + (c % 4) * 14;
    cloud.position.set(cx * S, cy * S, cz * S);
    cloudGroup.add(cloud);
  }
  placeOnMaryGeoiseSphere(cloudGroup, 0, 0, 0, globeRadius);
  group.add(cloudGroup);

  const updateAnimations = (elapsed: number) => {
    // 1. Butterflies fluttering inside the Room of Flowers
    const baseR = globeRadius + MARY_GEOISE_ALTITUDE;
    for (let i = 0; i < butterflies.length; i++) {
      const bf = butterflies[i];
      const bx = bf.x + Math.cos(elapsed * bf.speed + bf.phase) * bf.orbitR;
      const bz = bf.z + Math.sin(elapsed * bf.speed * 1.3 + bf.phase) * bf.orbitR;
      const by = bf.y + Math.sin(elapsed * 3.4 + bf.phase) * 0.45;
      const sp = toMaryGeoiseSphereLocal(bx, by, bz, globeRadius);
      _localNormal.set(sp.x, baseR + sp.y, sp.z).normalize();
      _tiltQuat.setFromUnitVectors(_up, _localNormal);
      _yawQuat.setFromAxisAngle(_yAxis, elapsed * bf.speed + bf.phase);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
      const wingFlap = 0.65 + 0.45 * Math.sin(elapsed * 14.0 + bf.phase);
      _dummy.scale.set(1.0, wingFlap, 1.0);
      _dummy.updateMatrix();
      butterflyInst.setMatrixAt(i, _dummy.matrix);
    }
    butterflyInst.instanceMatrix.needsUpdate = true;

    // 2. Celestial Dragons gliding along the Twin Marble Travolators
    for (let i = 0; i < celestialRiders.length; i++) {
      const cr = celestialRiders[i];
      const span = 88;
      const raw = (cr.baseZ - 6 + elapsed * 3.2 * cr.dir) % span;
      const wrappedZ = 6 + (raw < 0 ? raw + span : raw);
      placeOnMaryGeoiseSphere(
        cr.group,
        cr.laneX,
        0.2,
        wrappedZ,
        globeRadius,
        cr.dir === -1 ? Math.PI : 0
      );
    }

    // 3. Underground Slave Capstan Wheels turning beneath the surface
    for (let i = 0; i < capstanWheels.length; i++) {
      capstanWheels[i].rotation.y = elapsed * (i % 2 === 0 ? 0.55 : -0.55);
    }

    // 4. Red Port Bondola Gondolas gliding smoothly up & down the full 400m East Cliff cables
    for (let i = 0; i < bondolas.length; i++) {
      const bd = bondolas[i];
      const t = 0.5 + 0.44 * Math.sin(elapsed * 0.22 + bd.phase * Math.PI * 2);
      const gx = 109.5 + (162.0 - 109.5) * t;
      const gy = 14.5 + (MARY_GEOISE_RED_PORT_SEA_Y + 11.2 - 14.5) * t;
      const gz = rpZ + bd.laneZOff;
      const sp = toMaryGeoiseSphereLocal(gx, gy, gz, globeRadius);
      bd.group.position.set(sp.x, sp.y, sp.z);
      _localNormal.set(sp.x, baseRSphere + sp.y, sp.z).normalize();
      bd.group.quaternion.setFromUnitVectors(_up, _localNormal);
    }

    // 5. Seaward Vertical Hydraulic Elevator Car gliding smoothly between Sea-Level Harbor and 10,000 m Summit
    const elevT = 0.5 + 0.48 * Math.sin(elapsed * 0.19 + 0.8);
    const carYLocal = 5.0 * S + elevT * (elevTotalLen - 21.0 * S);
    elevCar.position.set(0, carYLocal, 0);
  };
  updateAnimations(0);

  return {
    group,
    radius: globeRadius + MARY_GEOISE_ALTITUDE,
    orientMode: 'cardinal',
    update: updateAnimations,
  };
}
