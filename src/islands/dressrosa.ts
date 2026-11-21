import * as THREE from 'three';
import type { IslandMeshContext, IslandMeshInstance } from './types';
import { valueNoise2D } from '../utils/globeMath';
import {
  CORRIDA_CENTER,
  CORRIDA_COURTYARD_Y,
  CORRIDA_MOAT_INNER_R,
  CORRIDA_MOAT_OUTER_R,
  CORRIDA_OUTER_RADIUS,
  DRESSROSA_BRIDGE_DECK_Y,
  DRESSROSA_BRIDGE_END,
  DRESSROSA_BRIDGE_START,
  DRESSROSA_GIANT_TREES,
  DRESSROSA_GLOBE_SCALE,
  DRESSROSA_HOUSES,
  DRESSROSA_LANDMARKS,
  DRESSROSA_TONTATTA_HUTS,
  DRESSROSA_WATERFALLS,
  DRESSROSA_WORLD_SIZE,
  FLOWER_HILL_CENTER,
  ROYAL_PLATEAU_CENTER,
  ROYAL_PLATEAU_Y,
  dressrosaArchipelagoSignedDist,
  sampleDressrosaHeight,
  sampleDressrosaZone,
  toDressrosaSphereLocal,
} from '../utils/dressrosaTerrain';

const S = DRESSROSA_GLOBE_SCALE;

// Reusable scratch objects (zero GC in update loop)
const _up = new THREE.Vector3(0, 1, 0);
const _yAxis = new THREE.Vector3(0, 1, 0);
const _localNormal = new THREE.Vector3();
const _tiltQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();
const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();

function placeOnDressrosaSphere(
  obj: THREE.Object3D,
  lx: number,
  ly: number,
  lz: number,
  globeRadius: number,
  yaw = 0
): void {
  const sp = toDressrosaSphereLocal(lx, ly, lz, globeRadius);
  obj.position.set(sp.x, sp.y, sp.z);
  _localNormal.set(sp.x, globeRadius + sp.y, sp.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

function createDressrosaTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(size, size);
    const data = img.data;
    const half = DRESSROSA_WORLD_SIZE * 0.5;

    for (let py = 0; py < size; py++) {
      const lz = (py / (size - 1)) * DRESSROSA_WORLD_SIZE - half;
      for (let px = 0; px < size; px++) {
        const lx = (px / (size - 1)) * DRESSROSA_WORLD_SIZE - half;
        const idx = (py * size + px) * 4;
        const { sd, island } = dressrosaArchipelagoSignedDist(lx, lz);

        if (sd > 2.4) {
          data[idx] = 16;
          data[idx + 1] = 104;
          data[idx + 2] = 148;
          data[idx + 3] = 0;
          continue;
        }

        const n1 = valueNoise2D(lx * 0.14 + 4.2, lz * 0.14 - 2.9);
        const n2 = valueNoise2D(lx * 0.42 - 1.7, lz * 0.42 + 6.4);

        let r = 228;
        let g = 205;
        let b = 164;
        let a = 255;

        if (sd > 0.35) {
          // Coastal turquoise reef / foaming surf collar strictly outside cliff slope (dresrosa_ec098a49.JPG)
          const surfT = Math.max(0, Math.min(1, (2.4 - sd) / 2.05));
          const wave = n2 > 0.66 ? 26 : 0;
          r = 46 + surfT * 112 + wave;
          g = 174 + surfT * 52 + wave;
          b = 202 + surfT * 36 + wave;
          a = Math.round(surfT * 205);
        } else {
          const zone = sampleDressrosaZone(lx, lz);
          if (zone === 'green-bit') {
            // Deep primeval emerald jungle floor with sunlit clearing glow
            const moss = n1 * 0.65 + n2 * 0.35;
            const dClear = Math.hypot(lx - 35.0, lz + 116.0);
            const sun = dClear < 10.5 ? (1 - dClear / 10.5) * 34 : 0;
            r = 42 + moss * 42 + sun;
            g = 116 + moss * 56 + sun * 1.1;
            b = 46 + moss * 28 + sun * 0.45;
          } else if (zone === 'flower-hill') {
            // Lush meadow green speckled with golden sunflower & crimson poppy beds
            const meadow = n1 * 0.6 + n2 * 0.4;
            r = 86 + meadow * 44;
            g = 154 + meadow * 34;
            b = 58 + meadow * 22;
            if (n2 > 0.64) {
              r = 246;
              g = 198;
              b = 38;
            } else if (n1 > 0.68 && n2 > 0.42) {
              r = 224;
              g = 62;
              b = 56;
            }
          } else if (zone === 'palace') {
            // Steep striated limestone crags around King's Plateau + whitewashed royal terrace top
            const dRoyal = Math.hypot(
              (lx - ROYAL_PLATEAU_CENTER.x) / 18.5,
              (lz - ROYAL_PLATEAU_CENTER.z) / 15.5
            );
            if (dRoyal < 0.78) {
              r = 228 + n2 * 18;
              g = 216 + n2 * 16;
              b = 192 + n2 * 14;
            } else {
              const strata = Math.sin(dRoyal * 22.0 + n1 * 4.0) * 12;
              r = 182 + n1 * 32 - n2 * 16 + strata;
              g = 138 + n1 * 24 - n2 * 14 + strata * 0.7;
              b = 94 + n1 * 18 + strata * 0.4;
            }
          } else if (zone === 'cliff') {
            // Sunlit coastal sandstone cliffs
            r = 204 + n1 * 28 - n2 * 16;
            g = 158 + n1 * 22 - n2 * 14;
            b = 104 + n1 * 16;
          } else if (zone === 'colosseum') {
            // Travertine sandstone radial promenade around Corrida Colosseum
            const tile =
              (Math.floor(lx * 0.8) + Math.floor(lz * 0.8)) % 2 === 0 ? 8 : -6;
            r = 234 + tile + n2 * 10;
            g = 206 + tile + n2 * 8;
            b = 160 + tile + n2 * 8;
          } else {
            // Acacia sunlit Mediterranean cobblestones + mosaic radial star around the Fountain
            const cobble =
              Math.abs(Math.sin(lx * 2.2) * Math.sin(lz * 2.2)) > 0.86
                ? -14
                : 6;
            r = 238 + cobble + n1 * 12;
            g = 216 + cobble + n1 * 10;
            b = 178 + cobble + n1 * 8;

            const dPlaza = Math.hypot(lx + 13.5, lz - 36.5);
            if (dPlaza < 11.5) {
              const ang = Math.atan2(lz - 36.5, lx + 13.5);
              const star = Math.cos(ang * 8) > 0.25;
              const ring = Math.abs((dPlaza % 3.2) - 1.6) < 0.35;
              if (ring) {
                r = 214;
                g = 114;
                b = 88;
              } else if (star) {
                r = 246;
                g = 236;
                b = 216;
              } else {
                r = 224;
                g = 196;
                b = 152;
              }
            }

            // Inner Acacia turquoise canal ribbon heading toward Colosseum / Harbor
            if (
              (Math.abs(lx - 8.0) < 2.1 && lz > 24 && lz < 56) ||
              (Math.abs(lz - 44.0) < 1.9 && lx > -4 && lx < 12)
            ) {
              r = 44;
              g = 168;
              b = 208;
            }
          }
          if (island === 'harbor') a = 0;
        }

        data[idx] = Math.max(0, Math.min(255, Math.round(r)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        data[idx + 3] = a;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createColosseumFacadeTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Travertine weathered warm sandstone/rose-ochre gradient (dressrosa2_4dc96366.webp)
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0.0, '#d8b27c');
    grad.addColorStop(0.32, '#c59666');
    grad.addColorStop(0.5, '#b88672');
    grad.addColorStop(0.75, '#cda16d');
    grad.addColorStop(1.0, '#d8b27c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Horizontal entablature ledges between 4 stories
    const bands = [0, 58, 122, 188, 244];
    for (const by of bands) {
      ctx.fillStyle = '#ead1a6';
      ctx.fillRect(0, by, w, 8);
      ctx.fillStyle = 'rgba(65, 38, 18, 0.34)';
      ctx.fillRect(0, by + 8, w, 4);
    }

    const cols = 32;
    const cw = w / cols;
    // Lower 3 tiers: Roman vaulted arches + vertical half-columns
    for (let tier = 0; tier < 3; tier++) {
      const yTop = 196 - tier * 64;
      const archH = 44;
      for (let i = 0; i < cols; i++) {
        const cx = i * cw + cw * 0.5;
        ctx.fillStyle = '#192436';
        ctx.beginPath();
        ctx.arc(cx, yTop + 18, cw * 0.32, Math.PI, 0);
        ctx.lineTo(cx + cw * 0.32, yTop + archH);
        ctx.lineTo(cx - cw * 0.32, yTop + archH);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#edd4ac';
        ctx.fillRect(i * cw + 1, yTop + 2, 4, archH);
      }
    }

    // Top attic tier: rectangular carved niches
    for (let i = 0; i < cols; i++) {
      ctx.fillStyle = '#2d231a';
      ctx.fillRect(i * cw + cw * 0.34, 18, cw * 0.32, 22);
      ctx.fillStyle = '#edd4ac';
      ctx.fillRect(i * cw + 1, 10, 4, 46);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function createColosseumCrowdTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#c89e5a';
    ctx.fillRect(0, 0, w, h);
    // Crisp stepped travertine tiers + dense fine spectators (dresrosa3_666607bc.JPG)
    const palette = [
      '#f59e0b',
      '#ef4444',
      '#38bdf8',
      '#fde68a',
      '#f1f5f9',
      '#fb7185',
      '#94a3b8',
      '#7c2d12',
    ];
    for (let row = 0; row < 20; row++) {
      const y = row * 12 + 4;
      ctx.fillStyle = '#d9b578';
      ctx.fillRect(0, y + 7, w, 4);
      ctx.fillStyle = 'rgba(60,36,16,0.38)';
      ctx.fillRect(0, y + 10, w, 2);
      for (let x = 2; x < w; x += 5) {
        const n = valueNoise2D(x * 0.47 + row * 2.1, row * 3.7);
        ctx.fillStyle =
          palette[Math.floor(n * palette.length * 1.7) % palette.length];
        ctx.fillRect(x, y + 1, 3, 6);
        // Spectator head dot
        ctx.fillStyle = '#f1c27d';
        ctx.fillRect(x + 1, y - 1, 2, 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function createBlueCheckeredRoofTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const step = 32;
    for (let y = 0; y < 256; y += step) {
      for (let x = 0; x < 256; x += step) {
        const even = (x / step + y / step) % 2 === 0;
        ctx.fillStyle = even ? '#2d7dc4' : '#f8fafc';
        ctx.fillRect(x, y, step, step);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createCandyStripeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#dc2626';
    for (let x = 0; x < 256; x += 64) {
      ctx.fillRect(x, 0, 32, 256);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < 256; y += 64) {
      ctx.fillRect(0, y, 256, 4);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function createArchWallGeometry(
  totalWidth: number,
  totalHeight: number,
  archHalfWidth: number,
  archSpringY: number,
  archTopY: number,
  depth: number
): THREE.ExtrudeGeometry {
  const hw = totalWidth * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, totalHeight);
  shape.lineTo(-hw, totalHeight);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-archHalfWidth, 0);
  hole.lineTo(-archHalfWidth, archSpringY);
  hole.absarc(
    0,
    archSpringY,
    archHalfWidth,
    Math.PI,
    0,
    true
  );
  // Subtle rounded top if archTopY > archSpringY + archHalfWidth
  if (archTopY < archSpringY + archHalfWidth) {
    // already rounded by absarc
  }
  hole.lineTo(archHalfWidth, 0);
  hole.closePath();
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 14,
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

export function createIslandMesh(ctx: IslandMeshContext): IslandMeshInstance {
  const { globeRadius, trackGeo, trackMat } = ctx;
  const trackTex = ctx.trackTex ?? (<T extends THREE.Texture>(t: T): T => t);
  const group = new THREE.Group();
  group.name = 'custom-dressrosa';

  // =========================================================================
  // 1. SPHERICAL-CURVED ARCHIPELAGO TERRAIN SHELL (160x160 vertices)
  // =========================================================================
  const segs = 160;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(DRESSROSA_WORLD_SIZE, DRESSROSA_WORLD_SIZE, segs, segs)
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const h = sampleDressrosaHeight(lx, lz);
    const sp = toDressrosaSphereLocal(lx, h, lz, globeRadius);
    posAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  terrainGeo.computeVertexNormals();

  const terrainTex = trackTex(createDressrosaTerrainTexture(1024));
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      color: 0xffffff,
      roughness: 0.86,
      metalness: 0.04,
      transparent: true,
      alphaTest: 0.04,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  group.add(terrainMesh);

  // Shared PBR materials
  const whiteStuccoMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfbf8f0, roughness: 0.82, metalness: 0.02 })
  );
  const ochreStuccoMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf4d5ab, roughness: 0.8, metalness: 0.02 })
  );
  const sandstoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xdab47c, roughness: 0.86, metalness: 0.03 })
  );
  const cliffRockMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb98a5a, roughness: 0.92, metalness: 0.03 })
  );
  const terracottaMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xc84b31, roughness: 0.68, metalness: 0.05 })
  );
  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.28, metalness: 0.62 })
  );
  const brassMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.34, metalness: 0.68 })
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.55 })
  );
  const darkWindowMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.15 })
  );
  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7c4d2b, roughness: 0.86, metalness: 0.02 })
  );
  const barkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c3c24, roughness: 0.92, metalness: 0.02 })
  );
  const foliageMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x2f8545, roughness: 0.78, metalness: 0.02 })
  );
  const brightLeafMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4ead4b, roughness: 0.74, metalness: 0.02 })
  );
  const waterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1ea8d8,
      emissive: 0x0c4a6e,
      emissiveIntensity: 0.24,
      roughness: 0.18,
      metalness: 0.12,
      transparent: true,
      opacity: 0.88,
    })
  );
  const foamMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6f8ff,
      emissive: 0xbae6fd,
      emissiveIntensity: 0.38,
      roughness: 0.48,
      transparent: true,
      opacity: 0.8,
    })
  );
  const blueCheckeredMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createBlueCheckeredRoofTexture()),
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.08,
    })
  );
  const candyStripeMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createCandyStripeTexture()),
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.06,
    })
  );
  const warmLanternMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.0,
      roughness: 0.3,
    })
  );
  const sadVatGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6ee7b7,
      emissive: 0x10b981,
      emissiveIntensity: 1.05,
      roughness: 0.24,
    })
  );
  const forgeGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfb923c,
      emissive: 0xea580c,
      emissiveIntensity: 1.25,
      roughness: 0.3,
    })
  );

  // =========================================================================
  // 2. CLIFFSIDE WATERFALLS, SEA ROCKS & ACACIA HARBOR PIERS + BOATS
  // =========================================================================
  const waterfallPlumes: THREE.Mesh[] = [];
  for (let i = 0; i < DRESSROSA_WATERFALLS.length; i++) {
    const wf = DRESSROSA_WATERFALLS[i];
    const wfGroup = new THREE.Group();
    placeOnDressrosaSphere(wfGroup, wf.x, 0.0, wf.z, globeRadius, wf.yaw);

    const sheetGeo = trackGeo(new THREE.PlaneGeometry(wf.width * S, (wf.topY + 1.2) * S));
    const sheet = new THREE.Mesh(sheetGeo, waterMat);
    sheet.position.set(0, wf.topY * 0.5 * S, 0.5 * S);
    wfGroup.add(sheet);

    const foamRibbonGeo = trackGeo(
      new THREE.PlaneGeometry(wf.width * 0.78 * S, (wf.topY + 0.8) * S)
    );
    const foamRibbon = new THREE.Mesh(foamRibbonGeo, foamMat);
    foamRibbon.position.set(0, wf.topY * 0.5 * S, 0.7 * S);
    wfGroup.add(foamRibbon);

    const splashGeo = trackGeo(
      new THREE.CylinderGeometry(wf.width * 0.65 * S, wf.width * 0.85 * S, 1.1 * S, 12)
    );
    const splash = new THREE.Mesh(splashGeo, foamMat);
    splash.position.set(0, 0.4 * S, 1.4 * S);
    wfGroup.add(splash);
    waterfallPlumes.push(splash);

    group.add(wfGroup);
  }

  // Craggy King's Plateau limestone buttresses & coastal sea-stack rocks
  const cragGeo = trackGeo(new THREE.DodecahedronGeometry(1.0 * S, 0));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rx = ROYAL_PLATEAU_CENTER.x + Math.cos(a) * 16.2;
    const rz = ROYAL_PLATEAU_CENTER.z + Math.sin(a) * 13.6;
    // Leave southwestern cliff flank clear for the Subterranean Industrial Gallery cutaway!
    if (rx < -8.5 && rz > -12.0 && rz < 4.0) continue;
    const crag = new THREE.Mesh(cragGeo, cliffRockMat);
    placeOnDressrosaSphere(crag, rx, 13.5, rz, globeRadius, a);
    crag.scale.set(3.2 + (i % 3) * 0.8, 9.2 + (i % 2) * 2.5, 2.8);
    group.add(crag);
  }

  // Southern Acacia Harbor Wooden Piers & Moored Sailboats
  const pierCoords: readonly [number, number, number][] = [
    [-19.5, 56.5, 0.2],
    [-11.0, 56.5, 0.0],
    [-2.5, 58.0, -0.25],
  ];
  for (const [px, pz, yaw] of pierCoords) {
    const pier = new THREE.Group();
    placeOnDressrosaSphere(pier, px, 0.8, pz, globeRadius, yaw);
    const deck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.6 * S, 0.35 * S, 8.2 * S)),
      woodMat
    );
    pier.add(deck);
    for (const postZ of [-3.2, 0.0, 3.2]) {
      for (const postX of [-1.05, 1.05]) {
        const post = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.14 * S, 0.14 * S, 2.2 * S, 6)),
          barkMat
        );
        post.position.set(postX * S, -0.6 * S, postZ * S);
        pier.add(post);
      }
    }
    group.add(pier);
  }

  const harborBoats: readonly [number, number, number][] = [
    [-15.5, 65.5, 0.55],
    [-4.5, 69.0, -0.35],
    [-11.5, 76.5, 0.15],
  ];
  for (const [bx, bz, yaw] of harborBoats) {
    const boat = new THREE.Group();
    placeOnDressrosaSphere(boat, bx, 0.25, bz, globeRadius, yaw);
    const hull = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.2 * S, 1.1 * S, 5.8 * S)),
      woodMat
    );
    boat.add(hull);
    const prow = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.1 * S, 2.2 * S, 4)),
      woodMat
    );
    prow.rotation.x = Math.PI / 2;
    prow.rotation.y = Math.PI / 4;
    prow.position.set(0, 0.1 * S, 3.8 * S);
    boat.add(prow);
    const mast = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.11 * S, 0.14 * S, 5.2 * S, 6)),
      barkMat
    );
    mast.position.set(0, 2.7 * S, 0.3 * S);
    boat.add(mast);
    const sail = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(2.6 * S, 2.8 * S)),
      whiteStuccoMat
    );
    sail.position.set(0, 3.1 * S, 0.55 * S);
    boat.add(sail);
    group.add(boat);
  }

  // =========================================================================
  // 3. ACACIA SPANISH MEDITERRANEAN CITY, ARCHWAY, AQUEDUCT, TOYS & TOY HOUSE
  // =========================================================================
  for (const h of DRESSROSA_HOUSES) {
    const gy = sampleDressrosaHeight(h.x, h.z);
    const houseGroup = new THREE.Group();
    placeOnDressrosaSphere(houseGroup, h.x, gy - 0.3, h.z, globeRadius, h.yaw);

    if (h.style === 'candy-tower') {
      // Red-and-white spiral striped turret (dressrosa_be8c96e4.webp!)
      const baseBody = new THREE.Mesh(
        trackGeo(
          new THREE.CylinderGeometry(
            h.width * 0.55 * S,
            h.width * 0.62 * S,
            h.height * 0.65 * S,
            12
          )
        ),
        ochreStuccoMat
      );
      baseBody.position.y = h.height * 0.32 * S;
      houseGroup.add(baseBody);

      const spire = new THREE.Mesh(
        trackGeo(
          new THREE.ConeGeometry(h.width * 0.68 * S, h.height * 0.48 * S, 12)
        ),
        candyStripeMat
      );
      spire.position.y = h.height * 0.82 * S;
      houseGroup.add(spire);

      const finial = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.32 * S, 8, 8)),
        goldMat
      );
      finial.position.y = h.height * 1.07 * S;
      houseGroup.add(finial);
    } else {
      const wallMat = h.style === 'spanish-ochre' ? ochreStuccoMat : whiteStuccoMat;
      const body = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(h.width * S, h.height * S, h.depth * S)),
        wallMat
      );
      body.position.y = h.height * 0.5 * S;
      houseGroup.add(body);

      // Stepped Spanish parapet gable & scalloped Gaudí crest finials
      const gable = new THREE.Mesh(
        trackGeo(
          new THREE.BoxGeometry((h.width + 0.3) * S, 0.72 * S, (h.depth + 0.3) * S)
        ),
        whiteStuccoMat
      );
      gable.position.y = h.height * S;
      houseGroup.add(gable);

      if (h.style === 'blue-checkered' || h.id === 'h-p1') {
        for (let sx = -2; sx <= 2; sx++) {
          const scallop = new THREE.Mesh(
            trackGeo(new THREE.SphereGeometry(0.42 * S, 8, 6)),
            whiteStuccoMat
          );
          scallop.position.set(
            sx * (h.width * 0.2) * S,
            (h.height + 0.52) * S,
            (h.depth * 0.5 + 0.12) * S
          );
          houseGroup.add(scallop);
        }
      }

      // Pitched terracotta OR iconic blue-checkered tiled roof (dressrosa_be8c96e4.webp)
      const roofMat =
        h.style === 'blue-checkered' ? blueCheckeredMat : terracottaMat;
      const roof = new THREE.Mesh(
        trackGeo(
          new THREE.ConeGeometry(Math.max(h.width, h.depth) * 0.74 * S, 2.3 * S, 4)
        ),
        roofMat
      );
      roof.rotation.y = Math.PI / 4;
      roof.position.y = (h.height + 1.15) * S;
      houseGroup.add(roof);

      // Arched dark doorway + upper windows
      const door = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.1 * S, 2.0 * S, 0.24 * S)),
        darkWindowMat
      );
      door.position.set(0, 1.0 * S, (h.depth * 0.5 + 0.05) * S);
      houseGroup.add(door);

      for (const wx of [-h.width * 0.26, h.width * 0.26]) {
        const win = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.72 * S, 0.9 * S, 0.2 * S)),
          darkWindowMat
        );
        win.position.set(wx * S, h.height * 0.65 * S, (h.depth * 0.5 + 0.05) * S);
        houseGroup.add(win);
      }

      if (h.style === 'cafe') {
        const awning = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(h.width * 0.84 * S, 0.35 * S, 1.45 * S)),
          candyStripeMat
        );
        awning.rotation.x = 0.28;
        awning.position.set(0, 2.4 * S, (h.depth * 0.5 + 0.65) * S);
        houseGroup.add(awning);
      }
    }

    group.add(houseGroup);
  }

  // Pierced Grand Triumphal City Archway framing Acacia Square (dressrosa_be8c96e4.webp!)
  const archX = -13.0;
  const archZ = 25.5;
  const archY = sampleDressrosaHeight(archX, archZ);
  const cityArch = new THREE.Group();
  placeOnDressrosaSphere(cityArch, archX, archY - 0.15, archZ, globeRadius, 0.08);
  const archShellGeo = trackGeo(
    createArchWallGeometry(10.8 * S, 8.8 * S, 2.6 * S, 3.6 * S, 6.2 * S, 2.6 * S)
  );
  const archShell = new THREE.Mesh(archShellGeo, ochreStuccoMat);
  cityArch.add(archShell);
  const archCornice = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(11.6 * S, 0.85 * S, 3.1 * S)),
    whiteStuccoMat
  );
  archCornice.position.y = 9.0 * S;
  cityArch.add(archCornice);
  for (const side of [-1, 1]) {
    const col = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.42 * S, 0.48 * S, 7.6 * S, 8)),
      whiteStuccoMat
    );
    col.position.set(side * 3.8 * S, 3.8 * S, 1.38 * S);
    cityArch.add(col);
  }
  group.add(cityArch);

  // Multi-Arch Roman Aqueduct rising gracefully behind the City Archway (dressrosa_be8c96e4.webp!)
  const aqBaseY = sampleDressrosaHeight(-12.0, 12.0);
  const aqueduct = new THREE.Group();
  placeOnDressrosaSphere(aqueduct, -12.0, aqBaseY - 0.2, 12.0, globeRadius, 0.12);
  const aqBayGeo = trackGeo(
    createArchWallGeometry(4.6 * S, 12.5 * S, 1.45 * S, 6.2 * S, 8.0 * S, 2.2 * S)
  );
  for (let b = -3; b <= 3; b++) {
    const bay = new THREE.Mesh(aqBayGeo, ochreStuccoMat);
    bay.position.set(b * 4.55 * S, 0, 0);
    aqueduct.add(bay);
  }
  const aqChannel = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(32.5 * S, 1.1 * S, 2.6 * S)),
    sandstoneMat
  );
  aqChannel.position.y = 12.8 * S;
  aqueduct.add(aqChannel);
  group.add(aqueduct);

  // Serpentine Candy-Striped Gaudí Low Wall, Staircase & Statues beside Acacia Square (dressrosa_be8c96e4.webp!)
  const serpentPts: THREE.Vector3[] = [];
  for (let k = 0; k <= 10; k++) {
    const t = k / 10;
    const lx = -7.0 + t * 5.2 + Math.sin(t * Math.PI * 2.0) * 1.1;
    const lz = 39.5 - t * 9.0;
    const ly = sampleDressrosaHeight(lx, lz) + 0.72;
    const sp = toDressrosaSphereLocal(lx, ly, lz, globeRadius);
    serpentPts.push(new THREE.Vector3(sp.x, sp.y, sp.z));
  }
  const serpentGeo = trackGeo(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(serpentPts), 24, 0.36 * S, 8, false)
  );
  const serpentRail = new THREE.Mesh(serpentGeo, candyStripeMat);
  group.add(serpentRail);

  // Grand Plaza Stone Staircase ascending toward the Archway
  const plazaStair = new THREE.Group();
  const stairBaseY = sampleDressrosaHeight(-11.0, 31.5);
  placeOnDressrosaSphere(plazaStair, -11.0, stairBaseY - 0.1, 31.5, globeRadius, 0.08);
  for (let st = 0; st < 5; st++) {
    const step = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry((6.2 - st * 0.25) * S, 0.38 * S, (2.8 - st * 0.45) * S)),
      sandstoneMat
    );
    step.position.set(0, (st * 0.32 + 0.16) * S, -st * 0.45 * S);
    plazaStair.add(step);
  }
  group.add(plazaStair);

  // Western Toy House / Circular Domed Factory Pavilions (dresrosa_ec098a49.JPG left side!)
  const toyHouse = new THREE.Group();
  const thY = sampleDressrosaHeight(-30.0, 14.5);
  placeOnDressrosaSphere(toyHouse, -30.0, thY - 0.2, 14.5, globeRadius, 0.3);
  for (const [ox, oz, rad, h] of [
    [0, 0, 4.4, 5.4],
    [-6.2, 1.8, 3.4, 4.4],
  ] as const) {
    const hall = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(rad * S, (rad + 0.25) * S, h * S, 16)),
      whiteStuccoMat
    );
    hall.position.set(ox * S, h * 0.5 * S, oz * S);
    toyHouse.add(hall);
    const dome = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(rad * 1.02 * S, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.52)),
      terracottaMat
    );
    dome.position.set(ox * S, h * S, oz * S);
    toyHouse.add(dome);
  }
  group.add(toyHouse);

  // Acacia Grand Plaza Stone Fountain (placed beside promenade so arch vista stays clear)
  const fountainY = sampleDressrosaHeight(-8.5, 37.5);
  const fountain = new THREE.Group();
  placeOnDressrosaSphere(fountain, -8.5, fountainY, 37.5, globeRadius, 0);
  const basin = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(3.2 * S, 3.5 * S, 0.9 * S, 16)),
    whiteStuccoMat
  );
  basin.position.y = 0.45 * S;
  fountain.add(basin);
  const pool = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.8 * S, 2.8 * S, 0.2 * S, 16)),
    waterMat
  );
  pool.position.y = 0.88 * S;
  fountain.add(pool);
  const ped = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.65 * S, 0.9 * S, 2.6 * S, 12)),
    whiteStuccoMat
  );
  ped.position.y = 1.6 * S;
  fountain.add(ped);
  const topBowl = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.5 * S, 0.8 * S, 0.6 * S, 12)),
    whiteStuccoMat
  );
  topBowl.position.y = 2.8 * S;
  fountain.add(topBowl);
  group.add(fountain);

  // Ornate Cast-Iron Streetlamps & Marble Statues lining Acacia Plaza
  const lampCoords: readonly [number, number][] = [
    [-17.2, 39.2],
    [-9.5, 38.8],
    [-16.8, 30.2],
    [-8.8, 30.2],
  ];
  for (const [lx, lz] of lampCoords) {
    const ly = sampleDressrosaHeight(lx, lz);
    const lamp = new THREE.Group();
    placeOnDressrosaSphere(lamp, lx, ly, lz, globeRadius, 0);
    const pole = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.08 * S, 0.14 * S, 3.2 * S, 6)),
      darkIronMat
    );
    pole.position.y = 1.6 * S;
    lamp.add(pole);
    const globe = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.28 * S, 8, 8)),
      warmLanternMat
    );
    globe.position.y = 3.3 * S;
    lamp.add(globe);
    group.add(lamp);
  }

  for (const [sx, sz, yaw] of [
    [-16.2, 33.0, 0.4],
    [-9.2, 34.0, -0.35],
  ] as const) {
    const sy = sampleDressrosaHeight(sx, sz);
    const statue = new THREE.Group();
    placeOnDressrosaSphere(statue, sx, sy, sz, globeRadius, yaw);
    const plinth = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.1 * S, 1.3 * S, 1.1 * S)),
      sandstoneMat
    );
    plinth.position.y = 0.65 * S;
    statue.add(plinth);
    const figure = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.28 * S, 0.42 * S, 1.7 * S, 8)),
      whiteStuccoMat
    );
    figure.position.y = 2.15 * S;
    statue.add(figure);
    const head = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.24 * S, 8, 8)),
      whiteStuccoMat
    );
    head.position.y = 3.15 * S;
    statue.add(head);
    group.add(statue);
  }

  // Festive colorful bunting banners crisscrossed above Acacia plaza (dresrosa_ec098a49.JPG)
  const buntingColors = [0xef4444, 0xf59e0b, 0x0ea5e9, 0x10b981, 0xf43f5e];
  const pennantGeo = trackGeo(new THREE.ConeGeometry(0.32 * S, 0.68 * S, 3));
  const buntingLines: readonly [[number, number], [number, number]][] = [
    [[-21, 34], [-3, 35]],
    [[-23, 41], [-5, 42]],
    [[-18, 48], [2, 46]],
    [[6, 36], [19, 32]],
  ];
  for (let b = 0; b < buntingLines.length; b++) {
    const [[x0, z0], [x1, z1]] = buntingLines[b];
    const lineMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: buntingColors[b % buntingColors.length],
        roughness: 0.6,
      })
    );
    for (let k = 0; k < 9; k++) {
      const t = k / 8;
      const bx = x0 + (x1 - x0) * t;
      const bz = z0 + (z1 - z0) * t;
      const sag = Math.sin(t * Math.PI) * 1.1;
      const by = sampleDressrosaHeight(bx, bz) + 5.8 - sag;
      const flag = new THREE.Mesh(pennantGeo, lineMat);
      placeOnDressrosaSphere(flag, bx, by, bz, globeRadius, 0);
      flag.rotateX(Math.PI);
      group.add(flag);
    }
  }

  // Living Toys & Citizens strolling Acacia Plaza (nutcracker soldiers with wind-up keys!)
  const toyCoords: readonly [number, number, number][] = [
    [-11.2, 39.0, 0.5],
    [-16.4, 38.2, -0.4],
    [-14.8, 34.0, 1.1],
    [-9.5, 44.5, -0.9],
    [-17.2, 45.0, 0.2],
    [-12.2, 36.2, 2.4],
    [-15.2, 41.2, -1.5],
  ];
  const toyRedMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.48 })
  );
  const toyBlueMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.48 })
  );
  for (let i = 0; i < toyCoords.length; i++) {
    const [tx, tz, yaw] = toyCoords[i];
    const ty = sampleDressrosaHeight(tx, tz);
    const toy = new THREE.Group();
    placeOnDressrosaSphere(toy, tx, ty, tz, globeRadius, yaw);
    const body = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.28 * S, 0.34 * S, 0.85 * S, 8)),
      i % 2 === 0 ? toyRedMat : toyBlueMat
    );
    body.position.y = 0.65 * S;
    toy.add(body);
    const head = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.28 * S, 8, 8)),
      ochreStuccoMat
    );
    head.position.y = 1.25 * S;
    toy.add(head);
    const hat = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.22 * S, 0.3 * S, 0.42 * S, 8)),
      darkIronMat
    );
    hat.position.y = 1.56 * S;
    toy.add(hat);
    const keyRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.18 * S, 0.04 * S, 6, 10)),
      goldMat
    );
    keyRing.position.set(0, 0.72 * S, -0.34 * S);
    toy.add(keyRing);
    group.add(toy);
  }

  // Mediterranean Palm Trees around Acacia plazas & cliff terraces
  const palmGeo = trackGeo(new THREE.CylinderGeometry(0.18 * S, 0.32 * S, 5.2 * S, 7));
  palmGeo.translate(0, 2.6 * S, 0);
  const palmFrondGeo = trackGeo(new THREE.ConeGeometry(1.55 * S, 1.2 * S, 6));
  const palmSpots: readonly [number, number][] = [
    [-22, 47], [-19, 36], [-8, 39], [-3, 47], [4, 34], [14, 36], [20, 28],
    [-27, 22], [-34, 15], [52, 16], [48, -4], [16, -24], [14, -18], [22, -36],
  ];
  for (let i = 0; i < palmSpots.length; i++) {
    const [px, pz] = palmSpots[i];
    const py = sampleDressrosaHeight(px, pz);
    const palm = new THREE.Group();
    placeOnDressrosaSphere(palm, px, py - 0.15, pz, globeRadius, i * 1.1);
    const trunk = new THREE.Mesh(palmGeo, barkMat);
    trunk.rotation.z = 0.1;
    palm.add(trunk);
    const crown = new THREE.Mesh(palmFrondGeo, brightLeafMat);
    crown.position.set(-0.5 * S, 5.1 * S, 0);
    palm.add(crown);
    group.add(palm);
  }

  // =========================================================================
  // 4. MONUMENTAL CORRIDA COLOSSEUM (EXTERIOR ARCHES, PILASTERS, SPIKES, ARENA)
  // =========================================================================
  const colGroup = new THREE.Group();
  placeOnDressrosaSphere(
    colGroup,
    CORRIDA_CENTER.x,
    CORRIDA_COURTYARD_Y,
    CORRIDA_CENTER.z,
    globeRadius,
    0
  );

  const colFacadeMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createColosseumFacadeTexture()),
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.04,
      side: THREE.DoubleSide,
    })
  );
  const colCrowdMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createColosseumCrowdTexture()),
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );

  // Outer multi-tiered Roman facade cylinder
  const outerWallGeo = trackGeo(
    new THREE.CylinderGeometry(
      CORRIDA_OUTER_RADIUS * S,
      (CORRIDA_OUTER_RADIUS + 0.5) * S,
      13.8 * S,
      40,
      1,
      true
    )
  );
  const outerWall = new THREE.Mesh(outerWallGeo, colFacadeMat);
  outerWall.position.y = 6.9 * S;
  colGroup.add(outerWall);

  // 3D Vertical Travertine Pilaster Ribs & Horizontal Cornice Ledges (dressrosa2_4dc96366.webp)
  const ribGeo = trackGeo(new THREE.BoxGeometry(0.45 * S, 13.7 * S, 0.55 * S));
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const rib = new THREE.Mesh(ribGeo, sandstoneMat);
    rib.position.set(
      Math.cos(a) * (CORRIDA_OUTER_RADIUS + 0.15) * S,
      6.85 * S,
      Math.sin(a) * (CORRIDA_OUTER_RADIUS + 0.15) * S
    );
    rib.rotation.y = -a + Math.PI / 2;
    colGroup.add(rib);
  }
  for (const ly of [3.4, 6.8, 10.2]) {
    const ledge = new THREE.Mesh(
      trackGeo(
        new THREE.TorusGeometry((CORRIDA_OUTER_RADIUS + 0.25) * S, 0.28 * S, 6, 40)
      ),
      ochreStuccoMat
    );
    ledge.rotation.x = Math.PI / 2;
    ledge.position.y = ly * S;
    colGroup.add(ledge);
  }

  // Inner backing wall & solid upper promenade cap
  const innerRimWallGeo = trackGeo(
    new THREE.CylinderGeometry(
      (CORRIDA_OUTER_RADIUS - 1.4) * S,
      (CORRIDA_OUTER_RADIUS - 1.4) * S,
      13.6 * S,
      36,
      1,
      true
    )
  );
  const innerRimWall = new THREE.Mesh(innerRimWallGeo, sandstoneMat);
  innerRimWall.position.y = 6.8 * S;
  colGroup.add(innerRimWall);

  const upperWalkwayCap = new THREE.Mesh(
    trackGeo(
      new THREE.RingGeometry(
        (CORRIDA_OUTER_RADIUS - 1.45) * S,
        CORRIDA_OUTER_RADIUS * S,
        40
      )
    ),
    sandstoneMat
  );
  upperWalkwayCap.rotation.x = -Math.PI / 2;
  upperWalkwayCap.position.y = 13.65 * S;
  colGroup.add(upperWalkwayCap);

  const topRingGeo = trackGeo(
    new THREE.TorusGeometry((CORRIDA_OUTER_RADIUS - 0.7) * S, 0.75 * S, 8, 40)
  );
  const topRing = new THREE.Mesh(topRingGeo, sandstoneMat);
  topRing.rotation.x = Math.PI / 2;
  topRing.position.y = 13.7 * S;
  colGroup.add(topRing);

  // 18 iconic dramatic angled Colosseum crown spikes (dresrosa_ec098a49.JPG!)
  const spikeGeo = trackGeo(new THREE.ConeGeometry(1.05 * S, 4.6 * S, 4));
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const spike = new THREE.Mesh(spikeGeo, ochreStuccoMat);
    spike.position.set(
      Math.cos(a) * (CORRIDA_OUTER_RADIUS - 0.3) * S,
      15.6 * S,
      Math.sin(a) * (CORRIDA_OUTER_RADIUS - 0.3) * S
    );
    spike.rotation.y = -a;
    spike.rotation.z = -0.22;
    colGroup.add(spike);
  }

  // Grand stepped spectator grandstands seamlessly meeting moat wall to outer rim (dresrosa3_666607bc.JPG!)
  const standTierGeo = trackGeo(
    new THREE.CylinderGeometry(
      (CORRIDA_OUTER_RADIUS - 1.4) * S,
      (CORRIDA_MOAT_OUTER_R + 0.45) * S,
      9.4 * S,
      40,
      1,
      true
    )
  );
  const standTier = new THREE.Mesh(standTierGeo, colCrowdMat);
  standTier.position.y = 6.2 * S;
  colGroup.add(standTier);

  // Upper interior arched gallery band circling top of stands (dresrosa3_666607bc.JPG)
  const innerArcadeGeo = trackGeo(
    new THREE.CylinderGeometry(
      (CORRIDA_OUTER_RADIUS - 1.45) * S,
      (CORRIDA_OUTER_RADIUS - 1.45) * S,
      3.0 * S,
      40,
      1,
      true
    )
  );
  const innerArcade = new THREE.Mesh(innerArcadeGeo, colFacadeMat);
  innerArcade.position.y = 12.1 * S;
  colGroup.add(innerArcade);

  // Moat inner retaining parapet wall & 4 radial stair aisle ribs
  const moatRetainer = new THREE.Mesh(
    trackGeo(
      new THREE.CylinderGeometry(
        (CORRIDA_MOAT_OUTER_R + 0.5) * S,
        (CORRIDA_MOAT_OUTER_R + 0.5) * S,
        2.0 * S,
        36,
        1,
        true
      )
    ),
    sandstoneMat
  );
  moatRetainer.position.y = 1.0 * S;
  colGroup.add(moatRetainer);

  for (let b = 0; b < 4; b++) {
    const a = (b * Math.PI) / 2 + Math.PI / 4;
    const aisle = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.95 * S, 0.35 * S, 9.8 * S)),
      sandstoneMat
    );
    const rA = ((CORRIDA_MOAT_OUTER_R + CORRIDA_OUTER_RADIUS - 1.0) * 0.5) * S;
    aisle.position.set(Math.sin(a) * rA, 6.4 * S, Math.cos(a) * rA);
    aisle.rotation.y = a;
    aisle.rotation.x = -0.88;
    colGroup.add(aisle);
  }

  // North VIP / Diamante Commentator Balcony Box + Wide Broadcast Screen (dresrosa3_666607bc.JPG!)
  const vipBox = new THREE.Group();
  vipBox.position.set(0, 8.8 * S, -(CORRIDA_MOAT_OUTER_R + 2.8) * S);
  const vipBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(8.4 * S, 4.8 * S, 3.8 * S)),
    sandstoneMat
  );
  vipBox.add(vipBody);
  const vipRoof = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(9.0 * S, 0.8 * S, 4.3 * S)),
    darkIronMat
  );
  vipRoof.position.y = 2.6 * S;
  vipBox.add(vipRoof);
  const vipScreenMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.95,
      roughness: 0.22,
    })
  );
  const vipBalcony = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.8 * S, 2.5 * S, 0.45 * S)),
    vipScreenMat
  );
  vipBalcony.position.set(0, 0.65 * S, 1.95 * S);
  vipBox.add(vipBalcony);
  colGroup.add(vipBox);

  // Flooded Fighting Fish water moat inside the Colosseum
  const moatGeo = trackGeo(
    new THREE.RingGeometry(
      CORRIDA_MOAT_INNER_R * S,
      (CORRIDA_MOAT_OUTER_R + 0.8) * S,
      36
    )
  );
  const moat = new THREE.Mesh(moatGeo, waterMat);
  moat.rotation.x = -Math.PI / 2;
  moat.position.y = 1.15 * S;
  colGroup.add(moat);

  // Raised Central Battle Ring Platform + Inlaid Battle Ring Markings + 4 Radial Iron Bridges
  const arenaRing = new THREE.Mesh(
    trackGeo(
      new THREE.CylinderGeometry(
        CORRIDA_MOAT_INNER_R * S,
        (CORRIDA_MOAT_INNER_R + 0.35) * S,
        2.2 * S,
        28
      )
    ),
    sandstoneMat
  );
  arenaRing.position.y = 1.1 * S;
  colGroup.add(arenaRing);

  const arenaSandMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf1d6a3, roughness: 0.9 })
  );
  const arenaFloor = new THREE.Mesh(
    trackGeo(
      new THREE.CylinderGeometry(
        (CORRIDA_MOAT_INNER_R - 0.5) * S,
        (CORRIDA_MOAT_INNER_R - 0.5) * S,
        0.25 * S,
        28
      )
    ),
    arenaSandMat
  );
  arenaFloor.position.y = 2.22 * S;
  colGroup.add(arenaFloor);

  const ringLine = new THREE.Mesh(
    trackGeo(
      new THREE.RingGeometry(
        (CORRIDA_MOAT_INNER_R - 2.3) * S,
        (CORRIDA_MOAT_INNER_R - 1.9) * S,
        28
      )
    ),
    terracottaMat
  );
  ringLine.rotation.x = -Math.PI / 2;
  ringLine.position.y = 2.36 * S;
  colGroup.add(ringLine);

  for (let b = 0; b < 4; b++) {
    const a = (b * Math.PI) / 2;
    const walkway = new THREE.Mesh(
      trackGeo(
        new THREE.BoxGeometry(
          1.8 * S,
          0.32 * S,
          (CORRIDA_MOAT_OUTER_R - CORRIDA_MOAT_INNER_R + 1.5) * S
        )
      ),
      darkIronMat
    );
    const rMid = (CORRIDA_MOAT_INNER_R + CORRIDA_MOAT_OUTER_R) * 0.5 * S;
    walkway.position.set(Math.sin(a) * rMid, 2.15 * S, Math.cos(a) * rMid);
    walkway.rotation.y = a;
    colGroup.add(walkway);
  }

  // Southern Colosseum Main Entrance Portico with Roman Columns & Pediment
  const portico = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(7.6 * S, 8.4 * S, 4.2 * S)),
    sandstoneMat
  );
  portico.position.set(0, 4.2 * S, (CORRIDA_OUTER_RADIUS + 0.5) * S);
  colGroup.add(portico);
  const porticoPediment = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(5.6 * S, 2.2 * S, 4)),
    terracottaMat
  );
  porticoPediment.rotation.y = Math.PI / 4;
  porticoPediment.position.set(0, 9.4 * S, (CORRIDA_OUTER_RADIUS + 0.5) * S);
  colGroup.add(porticoPediment);
  const porticoArch = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.4 * S, 5.2 * S, 4.5 * S)),
    darkWindowMat
  );
  porticoArch.position.set(0, 2.6 * S, (CORRIDA_OUTER_RADIUS + 0.5) * S);
  colGroup.add(porticoArch);

  group.add(colGroup);

  // =========================================================================
  // 5. KING'S PLATEAU, ROYAL PALACE, GRAND STAIRS & SUBTERRANEAN SMILE FACTORY
  // =========================================================================
  const palaceGroup = new THREE.Group();
  placeOnDressrosaSphere(
    palaceGroup,
    ROYAL_PLATEAU_CENTER.x,
    ROYAL_PLATEAU_Y,
    ROYAL_PLATEAU_CENTER.z,
    globeRadius,
    0.08
  );

  // Solid stone plateau foundation skirt anchoring Royal Palace deep into King's Plateau cliff
  const palacePlinth = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(13.9 * S, 15.6 * S, 5.2 * S, 20)),
    cliffRockMat
  );
  palacePlinth.position.y = -2.4 * S;
  palaceGroup.add(palacePlinth);

  const palaceTerraceCap = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(13.6 * S, 13.8 * S, 0.8 * S, 20)),
    sandstoneMat
  );
  palaceTerraceCap.position.y = 0.2 * S;
  palaceGroup.add(palaceTerraceCap);

  // Surrounding whitewashed fortress ring wall & corner bastion turrets
  const wallRing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(13.0 * S, 13.5 * S, 4.4 * S, 16, 1, true)),
    whiteStuccoMat
  );
  wallRing.position.y = 2.2 * S;
  palaceGroup.add(wallRing);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const tx = Math.cos(a) * 12.6 * S;
    const tz = Math.sin(a) * 12.6 * S;
    const turret = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.55 * S, 1.75 * S, 9.2 * S, 12)),
      whiteStuccoMat
    );
    turret.position.set(tx, 2.2 * S, tz);
    palaceGroup.add(turret);
    const roof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.95 * S, 3.0 * S, 12)),
      terracottaMat
    );
    roof.position.set(tx, 8.2 * S, tz);
    palaceGroup.add(roof);
  }

  // Main multi-tiered Royal Palace Keep (dresrosa_ec098a49.JPG top!)
  const keepBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(13.5 * S, 6.2 * S, 10.5 * S)),
    whiteStuccoMat
  );
  keepBase.position.y = 3.1 * S;
  palaceGroup.add(keepBase);
  for (const wx of [-4.2, -1.4, 1.4, 4.2]) {
    const kWin = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.95 * S, 1.5 * S, 10.7 * S)),
      darkWindowMat
    );
    kWin.position.set(wx * S, 3.6 * S, 0);
    palaceGroup.add(kWin);
  }
  const keepBaseRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(9.6 * S, 3.8 * S, 4)),
    terracottaMat
  );
  keepBaseRoof.rotation.y = Math.PI / 4;
  keepBaseRoof.position.y = 7.8 * S;
  palaceGroup.add(keepBaseRoof);

  const upperKeep = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(8.4 * S, 5.0 * S, 7.2 * S)),
    whiteStuccoMat
  );
  upperKeep.position.y = 8.4 * S;
  palaceGroup.add(upperKeep);
  const upperRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(6.2 * S, 4.2 * S, 4)),
    terracottaMat
  );
  upperRoof.rotation.y = Math.PI / 4;
  upperRoof.position.y = 12.8 * S;
  palaceGroup.add(upperRoof);

  // Towering Central Crown Spire
  const centralSpire = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.6 * S, 2.2 * S, 5.5 * S, 12)),
    whiteStuccoMat
  );
  centralSpire.position.y = 14.2 * S;
  palaceGroup.add(centralSpire);
  const spireRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(2.1 * S, 4.4 * S, 12)),
    terracottaMat
  );
  spireRoof.position.y = 18.8 * S;
  palaceGroup.add(spireRoof);
  const spireGold = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.65 * S, 0)),
    goldMat
  );
  spireGold.position.y = 21.3 * S;
  palaceGroup.add(spireGold);

  group.add(palaceGroup);

  // Sweeping stone ramp / grand stair viaduct climbing from Acacia plaza to Royal Palace
  for (let step = 0; step < 9; step++) {
    const t = step / 8;
    const sx = -8.5 + t * 5.0 + Math.sin(t * Math.PI) * 3.8;
    const sz = 16.0 - t * 23.0;
    const sy = 6.6 + t * (ROYAL_PLATEAU_Y - 7.0);
    const stairBlock = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.8 * S, 3.2 * S, 4.0 * S)),
      sandstoneMat
    );
    placeOnDressrosaSphere(stairBlock, sx, sy - 1.2, sz, globeRadius, -0.25);
    group.add(stairBlock);
  }

  // Vast Subterranean Industrial Galleries / SMILE Factory & Trading Port beneath King's Plateau
  const ugGroup = new THREE.Group();
  placeOnDressrosaSphere(
    ugGroup,
    DRESSROSA_LANDMARKS.undergroundGallery.x,
    6.6,
    DRESSROSA_LANDMARKS.undergroundGallery.z,
    globeRadius,
    -0.84
  );

  // Monumental vaulted industrial cavern portal carved cleanly into King's Plateau cliff base
  const cavernShellGeo = trackGeo(
    createArchWallGeometry(19.0 * S, 11.4 * S, 6.8 * S, 4.2 * S, 9.8 * S, 7.6 * S)
  );
  const cavernShell = new THREE.Mesh(cavernShellGeo, cliffRockMat);
  ugGroup.add(cavernShell);

  const cavernBack = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(17.8 * S, 10.2 * S, 1.2 * S)),
    darkWindowMat
  );
  cavernBack.position.set(0, 5.1 * S, -3.6 * S);
  ugGroup.add(cavernBack);

  // Steel Catwalk, Conveyor Girder & Glowing Forge Furnaces
  const galleryCatwalk = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(14.8 * S, 0.48 * S, 6.2 * S)),
    darkIronMat
  );
  galleryCatwalk.position.set(0, 3.6 * S, -0.3 * S);
  ugGroup.add(galleryCatwalk);

  const craneBeam = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(15.2 * S, 0.55 * S, 0.8 * S)),
    brassMat
  );
  craneBeam.position.set(0, 8.1 * S, 0.4 * S);
  ugGroup.add(craneBeam);

  const forgeFurnace = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.8 * S, 2.8 * S, 2.6 * S)),
    forgeGlowMat
  );
  forgeFurnace.position.set(-2.9 * S, 1.45 * S, 0.3 * S);
  ugGroup.add(forgeFurnace);

  // Glowing Emerald SAD / SMILE Fermentation Vats & Industrial Lamps
  for (const vx of [2.5, 4.5]) {
    const vat = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.84 * S, 0.84 * S, 4.4 * S, 10)),
      sadVatGlowMat
    );
    vat.position.set(vx * S, 2.3 * S, 0.4 * S);
    ugGroup.add(vat);
    const vatCap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.92 * S, 0.92 * S, 0.4 * S, 10)),
      darkIronMat
    );
    vatCap.position.set(vx * S, 4.6 * S, 0.4 * S);
    ugGroup.add(vatCap);
  }

  for (const lx of [-4.0, 0.0, 4.0]) {
    const lamp = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.45 * S, 8, 8)),
      warmLanternMat
    );
    lamp.position.set(lx * S, 7.6 * S, 0.8 * S);
    ugGroup.add(lamp);
  }

  for (const pipeX of [-7.4, 7.4]) {
    const stack = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.5 * S, 0.62 * S, 7.2 * S, 8)),
      darkIronMat
    );
    stack.position.set(pipeX * S, 3.6 * S, 1.5 * S);
    ugGroup.add(stack);
  }

  // Animated Brass Industrial Gearwheels inside the Subterranean Galleries
  const factoryGears: THREE.Mesh[] = [];
  const gearSpecs: readonly [number, number, number, number][] = [
    [-3.6, 5.8, -0.8, 1.85],
    [0.1, 6.4, -0.6, 1.48],
    [3.6, 5.5, -0.8, 1.72],
  ];
  for (const [gx, gy, gz, rad] of gearSpecs) {
    const gear = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(rad * S, rad * S, 0.48 * S, 12)),
      brassMat
    );
    gear.rotation.x = Math.PI / 2;
    gear.position.set(gx * S, gy * S, gz * S);
    ugGroup.add(gear);
    factoryGears.push(gear);
  }
  group.add(ugGroup);

  // =========================================================================
  // 6. FLOWER HILL GOLDEN SUNFLOWERS, POPPIES & KYROS / REBECCA COTTAGE
  // =========================================================================
  const sunStemGeo = trackGeo(new THREE.CylinderGeometry(0.08 * S, 0.1 * S, 1.3 * S, 5));
  sunStemGeo.translate(0, 0.65 * S, 0);
  const sunHeadGeo = trackGeo(new THREE.CylinderGeometry(0.52 * S, 0.44 * S, 0.18 * S, 8));
  const sunflowerMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xca8a04,
      emissiveIntensity: 0.25,
      roughness: 0.58,
    })
  );

  const sunflowerCount = 380;
  const stemInstanced = new THREE.InstancedMesh(
    sunStemGeo,
    brightLeafMat,
    sunflowerCount
  );
  const headInstanced = new THREE.InstancedMesh(
    sunHeadGeo,
    sunflowerMat,
    sunflowerCount
  );
  let sunIdx = 0;

  for (let i = 0; i < 620 && sunIdx < sunflowerCount; i++) {
    const n1 = valueNoise2D(i * 0.53 + 1.4, i * 0.37 - 2.1);
    const n2 = valueNoise2D(i * 0.79 - 3.6, i * 0.63 + 4.8);
    const lx = FLOWER_HILL_CENTER.x + (n1 - 0.5) * 38.0;
    const lz = FLOWER_HILL_CENTER.z + (n2 - 0.5) * 34.0;

    if (Math.hypot(lx - FLOWER_HILL_CENTER.x, lz - FLOWER_HILL_CENTER.z) > 20.5)
      continue;
    if (
      Math.hypot(
        lx - DRESSROSA_LANDMARKS.flowerHillOverlook.x,
        lz - DRESSROSA_LANDMARKS.flowerHillOverlook.z
      ) < 3.4
    )
      continue;
    if (sampleDressrosaZone(lx, lz) !== 'flower-hill') continue;

    const gy = sampleDressrosaHeight(lx, lz);
    const spStem = toDressrosaSphereLocal(lx, gy - 0.05, lz, globeRadius);
    _localNormal.set(spStem.x, globeRadius + spStem.y, spStem.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, n1 * Math.PI * 2);

    const sc = 0.9 + n2 * 0.52;
    _dummy.position.set(spStem.x, spStem.y, spStem.z);
    _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    _dummy.scale.setScalar(sc);
    _dummy.updateMatrix();
    stemInstanced.setMatrixAt(sunIdx, _dummy.matrix);

    const spHead = toDressrosaSphereLocal(lx, gy + 1.25 * sc, lz, globeRadius);
    _dummy.position.set(spHead.x, spHead.y, spHead.z);
    _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    _dummy.rotateX(0.45);
    _dummy.scale.setScalar(sc);
    _dummy.updateMatrix();
    headInstanced.setMatrixAt(sunIdx, _dummy.matrix);

    // 78% bright golden sunflowers + 22% scarlet/orange Dressrosa poppies
    if (i % 5 === 0) {
      _tmpColor.setRGB(0.92, 0.24 + n1 * 0.14, 0.16);
    } else {
      _tmpColor.setRGB(0.99, 0.8 + n1 * 0.16, 0.12 + n2 * 0.08);
    }
    headInstanced.setColorAt(sunIdx, _tmpColor);
    sunIdx++;
  }
  stemInstanced.count = sunIdx;
  headInstanced.count = sunIdx;
  stemInstanced.instanceMatrix.needsUpdate = true;
  headInstanced.instanceMatrix.needsUpdate = true;
  if (headInstanced.instanceColor) headInstanced.instanceColor.needsUpdate = true;
  stemInstanced.computeBoundingSphere();
  headInstanced.computeBoundingSphere();
  group.add(stemInstanced);
  group.add(headInstanced);

  // Kyros & Rebecca's Cozy Cottage overlooking the Sunflower Field
  const cotX = -46.0;
  const cotZ = -21.0;
  const cotY = sampleDressrosaHeight(cotX, cotZ);
  const cottage = new THREE.Group();
  placeOnDressrosaSphere(cottage, cotX, cotY - 0.3, cotZ, globeRadius, 0.45);
  const cotBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.4 * S, 3.0 * S, 3.8 * S)),
    whiteStuccoMat
  );
  cotBody.position.y = 1.5 * S;
  cottage.add(cotBody);
  const cotRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(3.4 * S, 2.2 * S, 4)),
    woodMat
  );
  cotRoof.rotation.y = Math.PI / 4;
  cotRoof.position.y = 4.0 * S;
  cottage.add(cotRoof);
  group.add(cottage);

  // =========================================================================
  // 7. MONUMENTAL IRON BRIDGE, ROUGH STRAIT WAVES & FIGHTING FISH
  // =========================================================================
  const bdx = DRESSROSA_BRIDGE_END.x - DRESSROSA_BRIDGE_START.x;
  const bdz = DRESSROSA_BRIDGE_END.z - DRESSROSA_BRIDGE_START.z;
  const bridgeLen = Math.hypot(bdx, bdz);
  const bridgeYaw = Math.atan2(bdx, bdz);
  const bridgeMidX = (DRESSROSA_BRIDGE_START.x + DRESSROSA_BRIDGE_END.x) * 0.5;
  const bridgeMidZ = (DRESSROSA_BRIDGE_START.z + DRESSROSA_BRIDGE_END.z) * 0.5;

  const bridgeGroup = new THREE.Group();
  placeOnDressrosaSphere(
    bridgeGroup,
    bridgeMidX,
    DRESSROSA_BRIDGE_DECK_Y,
    bridgeMidZ,
    globeRadius,
    bridgeYaw
  );

  // Roadway slab & raised iron guardrails
  const deckMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.0 * S, 0.65 * S, (bridgeLen + 3.0) * S)),
    darkIronMat
  );
  deckMesh.position.y = -0.32 * S;
  bridgeGroup.add(deckMesh);

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.28 * S, 1.05 * S, (bridgeLen + 2.0) * S)),
      darkIronMat
    );
    rail.position.set(side * 1.9 * S, 0.5 * S, 0);
    bridgeGroup.add(rail);
  }

  // 8 masonry/iron piers plunging into the Fighting Fish strait + viaduct arch ribs + deck lamps + foam rings
  const pierGeo = trackGeo(
    new THREE.BoxGeometry(3.6 * S, (DRESSROSA_BRIDGE_DECK_Y + 3.5) * S, 2.2 * S)
  );
  const archSpanGeo = trackGeo(
    new THREE.TorusGeometry(2.6 * S, 0.45 * S, 6, 12, Math.PI)
  );
  const foamRingGeo = trackGeo(new THREE.RingGeometry(2.2 * S, 3.8 * S, 12));
  const numPiers = 8;
  for (let i = 0; i < numPiers; i++) {
    const pz = (-0.44 + (i / (numPiers - 1)) * 0.88) * bridgeLen * S;
    const pier = new THREE.Mesh(pierGeo, sandstoneMat);
    pier.position.set(0, -((DRESSROSA_BRIDGE_DECK_Y + 3.5) * 0.5 + 0.4) * S, pz);
    bridgeGroup.add(pier);

    // Bridge deck iron lantern posts
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.08 * S, 0.1 * S, 2.2 * S, 5)),
        darkIronMat
      );
      post.position.set(side * 1.9 * S, 1.5 * S, pz);
      bridgeGroup.add(post);
      const bulb = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.22 * S, 6, 6)),
        warmLanternMat
      );
      bulb.position.set(side * 1.9 * S, 2.65 * S, pz);
      bridgeGroup.add(bulb);
    }

    // Sea foam collar around strait piers
    if (i >= 1 && i <= numPiers - 2) {
      const collar = new THREE.Mesh(foamRingGeo, foamMat);
      collar.rotation.x = -Math.PI / 2;
      collar.position.set(0, (-DRESSROSA_BRIDGE_DECK_Y + 0.15) * S, pz);
      bridgeGroup.add(collar);
    }

    if (i < numPiers - 1) {
      const nextPz =
        (-0.44 + ((i + 1) / (numPiers - 1)) * 0.88) * bridgeLen * S;
      const arch = new THREE.Mesh(archSpanGeo, darkIronMat);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(0, -3.4 * S, (pz + nextPz) * 0.5);
      bridgeGroup.add(arch);
    }
  }
  group.add(bridgeGroup);

  // Animated Fighting Fish (horned armored bull-fish) cruising around the Iron Bridge Strait & Colosseum moat
  const fishMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.42,
      metalness: 0.22,
    })
  );
  const hornMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.4 })
  );
  const fightingFishHandles: Array<{
    group: THREE.Group;
    cx: number;
    cz: number;
    rx: number;
    rz: number;
    phase: number;
    speed: number;
  }> = [];

  const fishOrbits: readonly [number, number, number, number, number][] = [
    [16.0, -64.0, 7.0, 5.5, 0.0],
    [40.0, -72.0, 8.0, 6.0, 1.3],
    [22.0, -78.0, 6.5, 5.0, 2.6],
    [39.0, -56.0, 7.5, 5.0, 3.8],
    [12.0, -52.0, 6.0, 4.5, 4.9],
    [36.0, 14.0, 9.2, 9.2, 0.7], // Fighting Fish inside Corrida Colosseum moat!
    [36.0, 14.0, 9.6, 9.6, 3.9],
  ];
  for (let i = 0; i < fishOrbits.length; i++) {
    const [cx, cz, rx, rz, phase] = fishOrbits[i];
    const fish = new THREE.Group();
    const fBody = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.95 * S, 8, 6)),
      fishMat
    );
    fBody.scale.set(0.75, 0.8, 1.9);
    fish.add(fBody);
    const fFin = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.45 * S, 1.2 * S, 4)),
      terracottaMat
    );
    fFin.position.set(0, 0.85 * S, -0.2 * S);
    fish.add(fFin);
    const fTail = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.55 * S, 1.1 * S, 3)),
      terracottaMat
    );
    fTail.rotation.x = Math.PI / 2;
    fTail.position.set(0, 0, -2.0 * S);
    fish.add(fTail);
    for (const hSide of [-1, 1]) {
      const horn = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.14 * S, 0.85 * S, 5)),
        hornMat
      );
      horn.rotation.x = Math.PI * 0.35;
      horn.position.set(hSide * 0.32 * S, 0.55 * S, 1.15 * S);
      fish.add(horn);
    }
    group.add(fish);
    fightingFishHandles.push({
      group: fish,
      cx,
      cz,
      rx,
      rz,
      phase,
      speed: i >= 5 ? 0.55 : 0.32 + (i % 3) * 0.08,
    });
  }

  // =========================================================================
  // 8. GREEN BIT COLOSSAL FOREST, INTERTWINED ROOTS & SECRET TONTATTA VILLAGE
  // =========================================================================
  for (const tSpec of DRESSROSA_GIANT_TREES) {
    const ty = sampleDressrosaHeight(tSpec.x, tSpec.z);
    const treeGroup = new THREE.Group();
    placeOnDressrosaSphere(
      treeGroup,
      tSpec.x,
      ty - 0.35,
      tSpec.z,
      globeRadius,
      tSpec.yaw
    );

    // Colossal gnarled trunk
    const trunk = new THREE.Mesh(
      trackGeo(
        new THREE.CylinderGeometry(
          tSpec.trunkRadius * 0.68 * S,
          tSpec.trunkRadius * 1.15 * S,
          tSpec.height * S,
          10
        )
      ),
      barkMat
    );
    trunk.position.y = tSpec.height * 0.5 * S;
    treeGroup.add(trunk);

    // 4 organic tapering splayed buttress roots framing the mossy forest floor
    for (let r = 0; r < 4; r++) {
      const ra = (r / 4) * Math.PI * 2 + 0.35;
      const root = new THREE.Mesh(
        trackGeo(
          new THREE.CylinderGeometry(
            tSpec.trunkRadius * 0.24 * S,
            tSpec.trunkRadius * 0.62 * S,
            tSpec.trunkRadius * 3.2 * S,
            7
          )
        ),
        barkMat
      );
      root.position.set(
        Math.cos(ra) * tSpec.trunkRadius * 1.45 * S,
        0.95 * S,
        Math.sin(ra) * tSpec.trunkRadius * 1.45 * S
      );
      root.rotation.y = -ra + Math.PI / 2;
      root.rotation.x = 0.88;
      treeGroup.add(root);
    }

    // Broad layered emerald canopy domes
    const crownOffsets: readonly [number, number, number, number][] = [
      [0, tSpec.height * 0.96, 0, 1.0],
      [
        -tSpec.canopyRadius * 0.42,
        tSpec.height * 0.84,
        tSpec.canopyRadius * 0.25,
        0.72,
      ],
      [
        tSpec.canopyRadius * 0.44,
        tSpec.height * 0.86,
        -tSpec.canopyRadius * 0.22,
        0.74,
      ],
    ];
    for (let c = 0; c < crownOffsets.length; c++) {
      const [cx, cy, cz, cScale] = crownOffsets[c];
      const crown = new THREE.Mesh(
        trackGeo(
          new THREE.DodecahedronGeometry(tSpec.canopyRadius * cScale * S, 1)
        ),
        c === 0 ? foliageMat : brightLeafMat
      );
      crown.scale.set(1.15, 0.58, 1.15);
      crown.position.set(cx * S, cy * S, cz * S);
      treeGroup.add(crown);
    }

    group.add(treeGroup);
  }

  // Intertwined Giant Arching Roots spanning across the Tontatta Forest Clearing!
  const rootArchPaths: readonly [[number, number], [number, number], number][] = [
    [[24.5, -112.5], [37.0, -129.0], 8.2],
    [[46.5, -116.0], [26.0, -124.0], 7.4],
    [[20.0, -102.0], [43.0, -108.5], 6.6],
  ];
  for (const [[x0, z0], [x1, z1], apexOffset] of rootArchPaths) {
    const y0 = sampleDressrosaHeight(x0, z0);
    const y1 = sampleDressrosaHeight(x1, z1);
    const midX = (x0 + x1) * 0.5;
    const midZ = (z0 + z1) * 0.5;
    const midY = Math.max(y0, y1) + apexOffset;
    const p0 = toDressrosaSphereLocal(x0, y0, z0, globeRadius);
    const p1 = toDressrosaSphereLocal(midX, midY, midZ, globeRadius);
    const p2 = toDressrosaSphereLocal(x1, y1, z1, globeRadius);
    const rootCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(p0.x, p0.y, p0.z),
      new THREE.Vector3(p1.x, p1.y, p1.z),
      new THREE.Vector3(p2.x, p2.y, p2.z),
    ]);
    const archRoot = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(rootCurve, 18, 0.58 * S, 7, false)),
      barkMat
    );
    group.add(archRoot);
  }

  // Giant Forest Mushrooms & Oversized Tropical Blooms + Ferns towering beside Tontatta Village
  const giantPlantSpots: readonly [number, number, 'mushroom' | 'flower'][] = [
    [25.0, -113.5, 'mushroom'],
    [40.5, -111.0, 'flower'],
    [27.5, -116.5, 'flower'],
    [43.5, -117.5, 'mushroom'],
    [31.5, -123.0, 'flower'],
    [39.5, -124.0, 'mushroom'],
    [23.0, -106.0, 'flower'],
    [46.0, -107.0, 'mushroom'],
  ];
  const mushroomCapMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.6 })
  );
  const giantPetalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0x9d174d,
      emissiveIntensity: 0.18,
      roughness: 0.55,
    })
  );
  const giantPollenMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xca8a04,
      emissiveIntensity: 0.3,
      roughness: 0.5,
    })
  );

  for (let i = 0; i < giantPlantSpots.length; i++) {
    const [gx, gz, kind] = giantPlantSpots[i];
    const gy = sampleDressrosaHeight(gx, gz);
    const plant = new THREE.Group();
    placeOnDressrosaSphere(plant, gx, gy - 0.1, gz, globeRadius, i * 0.8);
    if (kind === 'mushroom') {
      const stem = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.42 * S, 0.65 * S, 3.6 * S, 8)),
        whiteStuccoMat
      );
      stem.position.y = 1.8 * S;
      plant.add(stem);
      const cap = new THREE.Mesh(
        trackGeo(
          new THREE.SphereGeometry(2.1 * S, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52)
        ),
        mushroomCapMat
      );
      cap.position.y = 3.4 * S;
      plant.add(cap);
    } else {
      const stalk = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.2 * S, 0.28 * S, 4.4 * S, 7)),
        brightLeafMat
      );
      stalk.position.y = 2.2 * S;
      plant.add(stalk);
      const bloom = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(1.7 * S, 0.55 * S, 1.1 * S, 8)),
        giantPetalMat
      );
      bloom.position.y = 4.5 * S;
      plant.add(bloom);
      const pollen = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.65 * S, 8, 8)),
        giantPollenMat
      );
      pollen.position.y = 4.95 * S;
      plant.add(pollen);
    }
    group.add(plant);
  }

  // Secret Miniature Tontatta Kingdom Huts & Delicate Plank Bridges nestled among the giant roots
  const acornRoofMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.82 })
  );
  for (const hut of DRESSROSA_TONTATTA_HUTS) {
    const hy = sampleDressrosaHeight(hut.x, hut.z);
    const hg = new THREE.Group();
    placeOnDressrosaSphere(hg, hut.x, hy - 0.08, hut.z, globeRadius, hut.yaw);

    const sc = hut.scale * S;
    const hBody = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.72 * sc, 0.82 * sc, 1.05 * sc, 8)),
      whiteStuccoMat
    );
    hBody.position.y = 0.52 * sc;
    hg.add(hBody);

    const roofMat =
      hut.roofTone === 'leaf'
        ? brightLeafMat
        : hut.roofTone === 'acorn'
          ? acornRoofMat
          : giantPetalMat;
    const hRoof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.12 * sc, 1.15 * sc, 8)),
      roofMat
    );
    hRoof.position.y = 1.55 * sc;
    hg.add(hRoof);

    const glowWin = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.32 * sc, 0.42 * sc, 0.2 * sc)),
      warmLanternMat
    );
    glowWin.position.set(0, 0.52 * sc, 0.74 * sc);
    hg.add(glowWin);

    group.add(hg);
  }

  // Delicate Tontatta Miniature Wooden Footbridge spanning the sunlit clearing center
  const tBridgeY = sampleDressrosaHeight(35.5, -116.5);
  const tontattaBridge = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.6 * S, 0.18 * S, 1.1 * S)),
    woodMat
  );
  placeOnDressrosaSphere(tontattaBridge, 35.5, tBridgeY + 0.35, -116.5, globeRadius, 0.25);
  group.add(tontattaBridge);

  // =========================================================================
  // 9. ZERO-GC RUNTIME ANIMATION LOOP (Waterfalls, Fighting Fish & Factory Gears)
  // =========================================================================
  let elapsedTime = 0;

  const update = (dt: number) => {
    elapsedTime += dt;

    // Gentle waterfall sea-splash pulse
    for (let i = 0; i < waterfallPlumes.length; i++) {
      const s = 1 + 0.08 * Math.sin(elapsedTime * 3.8 + i * 1.4);
      waterfallPlumes[i].scale.set(
        s,
        0.94 + 0.1 * Math.cos(elapsedTime * 4.5 + i),
        s
      );
    }

    // Subterranean SMILE Factory brass gearwheels rotation
    for (let i = 0; i < factoryGears.length; i++) {
      factoryGears[i].rotation.z += dt * (i % 2 === 0 ? 1.15 : -1.4);
    }

    // Fighting Fish circling the Iron Bridge Strait & Corrida Colosseum moat
    for (let i = 0; i < fightingFishHandles.length; i++) {
      const f = fightingFishHandles[i];
      const theta = elapsedTime * f.speed + f.phase;
      const fx = f.cx + Math.cos(theta) * f.rx;
      const fz = f.cz + Math.sin(theta) * f.rz;
      const isMoatFish = i >= 5;
      const fy =
        (isMoatFish ? CORRIDA_COURTYARD_Y + 1.15 : 0.15) +
        0.16 * Math.sin(elapsedTime * 2.6 + f.phase);
      const heading = Math.atan2(
        -Math.sin(theta) * f.rx,
        Math.cos(theta) * f.rz
      );
      placeOnDressrosaSphere(f.group, fx, fy, fz, globeRadius, heading);
    }
  };

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update,
  };
}
