import * as THREE from 'three';
import {
  AMAZON_LILY_ARENA_CENTER,
  AMAZON_LILY_CRATER_RIM_RADIUS,
  AMAZON_LILY_CRATER_RIM_Y,
  AMAZON_LILY_GLOBE_SCALE,
  AMAZON_LILY_GORGON_TOWER,
  AMAZON_LILY_PALACE_CENTER,
  AMAZON_LILY_PORT_CHANNEL,
  AMAZON_LILY_WORLD_SIZE,
  amazonLilyBeachCoveFactor,
  amazonLilyCoastSignedDist,
  amazonLilyPathSignedDist,
  amazonLilyPortWaterSignedDist,
  amazonLilyRiverSignedDist,
  buildAmazonLilyFauna,
  buildAmazonLilyHouses,
  buildAmazonLilyMushrooms,
  buildAmazonLilyTrees,
  sampleAmazonLilyHeight,
  toAmazonLilySphereLocal,
} from '../utils/amazonLilyTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = AMAZON_LILY_GLOBE_SCALE;
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

function placeOnAmazonLilySphere(
  obj: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  globeRadius: number,
  yaw = 0
): void {
  const pos = toAmazonLilySphereLocal(x, y, z, globeRadius);
  obj.position.set(pos.x, pos.y, pos.z);
  _localNormal.set(pos.x, globeRadius + pos.y, pos.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

/**
 * Generates an offscreen brush-painted mask for the iconic "九蛇" (Kuja) calligraphy
 * carved onto the south flank of the central truncated-cone mountain (image_422abdc3.png).
 */
function createKujaKanjiStamp(): HTMLCanvasElement {
  const w = 256;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Left character: 九 (Nine)
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(64, 18);
  ctx.quadraticCurveTo(62, 68, 28, 108);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(26, 48);
  ctx.lineTo(88, 42);
  ctx.quadraticCurveTo(86, 86, 86, 98);
  ctx.quadraticCurveTo(88, 108, 104, 108);
  ctx.lineTo(116, 106);
  ctx.lineTo(116, 93);
  ctx.stroke();

  // Right character: 蛇 (Snake) — left radical 虫 + right 它
  ctx.lineWidth = 9;
  // 虫 outer frame
  ctx.strokeRect(136, 44, 34, 28);
  // 虫 central vertical + base bar + dot
  ctx.beginPath();
  ctx.moveTo(153, 20);
  ctx.lineTo(153, 98);
  ctx.moveTo(132, 103);
  ctx.lineTo(174, 92);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(174, 96, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // 它 right side: top dot + roof eaves + curved hook
  ctx.beginPath();
  ctx.moveTo(205, 16);
  ctx.lineTo(205, 29);
  ctx.moveTo(182, 34);
  ctx.lineTo(180, 48);
  ctx.moveTo(182, 34);
  ctx.lineTo(230, 32);
  ctx.lineTo(226, 46);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(194, 52);
  ctx.lineTo(194, 96);
  ctx.quadraticCurveTo(195, 108, 214, 108);
  ctx.lineTo(232, 106);
  ctx.lineTo(232, 92);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(228, 56);
  ctx.quadraticCurveTo(212, 70, 196, 78);
  ctx.stroke();

  return c;
}

function createAmazonLilyTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = AMAZON_LILY_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * AMAZON_LILY_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * AMAZON_LILY_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const coastSd = amazonLilyCoastSignedDist(x, z);
      const portSd = amazonLilyPortWaterSignedDist(x, z);
      const rivSd = amazonLilyRiverSignedDist(x, z);
      const pathSd = amazonLilyPathSignedDist(x, z);
      const beachFactor = amazonLilyBeachCoveFactor(x, z);

      const h = sampleAmazonLilyHeight(x, z);
      const hx = sampleAmazonLilyHeight(x + 1.1, z);
      const hz = sampleAmazonLilyHeight(x, z + 1.1);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 2.2, 0, 1);

      const r = Math.hypot(x, z);
      const grain = (valueNoise2D(x * 0.65, z * 0.65) - 0.5) * 14;

      let rgb: [number, number, number] = [20, 104, 152];
      let alpha = 1;

      if (coastSd > 2.2 && portSd > 2.2) {
        // Hand off smoothly to globe ocean water outside shoreline surf
        const surfT = 1 - smoothstep(2.2, 5.2, Math.min(coastSd, portSd));
        rgb = mixRgb([18, 92, 146], [190, 236, 248], surfT * 0.4);
        alpha = surfT;
      } else if (portSd < 0.8 || (rivSd < 0.65 && h < 0.4)) {
        // Turquoise lagoon / river / underground port channel water bed
        const deepT = smoothstep(-2.4, 0.2, h);
        rgb = mixRgb([12, 82, 134], [38, 174, 206], deepT);
      } else if (h < 1.9 && beachFactor > 0.22 && coastSd > -9.5) {
        // Narrow coastal sandy beaches tucked into coves
        rgb = [226, 206, 162];
      } else if (r < AMAZON_LILY_CRATER_RIM_RADIUS) {
        // Inside Crater Bowl
        const arenaR = Math.hypot(
          x - AMAZON_LILY_ARENA_CENTER.x,
          z - AMAZON_LILY_ARENA_CENTER.z
        );
        if (arenaR < AMAZON_LILY_ARENA_CENTER.standOuterRadius + 0.5) {
          if (arenaR < AMAZON_LILY_ARENA_CENTER.innerRadius) {
            // Combat Arena carved stone floor
            const ringCheck = Math.abs(arenaR - 3.0) < 0.25 ? -18 : 0;
            rgb = [222 + ringCheck, 212 + ringCheck, 192 + ringCheck];
          } else if (arenaR < AMAZON_LILY_ARENA_CENTER.pitOuterRadius) {
            // Dark sunken spike moat
            rgb = [76, 56, 40];
          } else {
            // Stone amphitheater tiers
            rgb = [196, 186, 168];
          }
        } else if (slope > 0.34 || h > 11.5) {
          // Steep warm ochre sandstone crater interior walls (image_a9ec93d6.png)
          const strata = Math.sin(h * 1.4) * 10;
          const n = valueNoise2D(x * 0.22, z * 0.22);
          rgb = mixRgb([196, 138, 86], [228, 174, 114], n);
          rgb = [rgb[0] + strata, rgb[1] + strata * 0.8, rgb[2] + strata * 0.5];
          if (
            Math.hypot(x - AMAZON_LILY_PALACE_CENTER.x, z - AMAZON_LILY_PALACE_CENTER.z) < 8.5
          ) {
            rgb = mixRgb(rgb, [232, 224, 208], 0.72);
          }
        } else {
          // Sheltered valley bottom: lush garden patches, cobbled village streets & market stone
          const grassN = valueNoise2D(x * 0.16 + 2.4, z * 0.16 - 1.8);
          rgb = mixRgb([86, 152, 72], [186, 168, 138], smoothstep(0.35, 0.72, grassN));
          if (pathSd < 0.8) {
            const pT = 1 - smoothstep(-0.3, 0.8, pathSd);
            rgb = mixRgb(rgb, [218, 202, 174], pT * 0.85);
          }
        }
      } else {
        // Exterior Coastal Cliffs, Jungle Belt & Central Mountain Cone (image_422abdc3.png)
        if (r < 57.0 && h > 13.5) {
          // Central mountain exterior: warm ochre rock grading into pale grey limestone near snake summit
          const summitStoneT = smoothstep(24.0, 40.0, h);
          const cragN = valueNoise2D(x * 0.22 + 5.1, z * 0.22 - 2.3);
          const ochreRock = mixRgb([178, 112, 72], [214, 148, 98], cragN);
          const paleLimestone = mixRgb([172, 176, 180], [212, 214, 216], cragN);
          rgb = mixRgb(ochreRock, paleLimestone, summitStoneT);
        } else if (slope > 0.36 || coastSd > -4.2) {
          // Steep ochre/terracotta coastal cliffs & rocky spires
          const cragN = valueNoise2D(x * 0.25 + 1.1, z * 0.25 + 3.9);
          rgb = mixRgb([172, 106, 68], [216, 146, 96], cragN);
        } else {
          // Dense wild tropical jungle floor
          const jN = valueNoise2D(x * 0.14 + 6.2, z * 0.14 - 4.1);
          rgb = mixRgb([36, 108, 44], [64, 144, 58], jN);
          if (pathSd < 0.8) {
            const pT = 1 - smoothstep(-0.3, 0.8, pathSd);
            rgb = mixRgb(rgb, [162, 128, 88], pT * 0.82);
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

  // Stamp giant "九蛇" (Kuja) calligraphy directly onto the south flank of the central cone
  // Coordinates: x = [-14..+14], z = [+40..+52] (world -> texture pixel transform)
  const kanjiStamp = createKujaKanjiStamp();
  const stampCanvas = document.createElement('canvas');
  stampCanvas.width = kanjiStamp.width;
  stampCanvas.height = kanjiStamp.height;
  const sCtx = stampCanvas.getContext('2d');
  if (sCtx) {
    sCtx.drawImage(kanjiStamp, 0, 0);
    sCtx.globalCompositeOperation = 'source-in';
    sCtx.fillStyle = 'rgba(132, 42, 26, 0.86)';
    sCtx.fillRect(0, 0, stampCanvas.width, stampCanvas.height);

    const xMinPx = ((half - 13.5) / AMAZON_LILY_WORLD_SIZE) * size;
    const xMaxPx = ((half + 13.5) / AMAZON_LILY_WORLD_SIZE) * size;
    const zMinPx = ((half + 40.5) / AMAZON_LILY_WORLD_SIZE) * size;
    const zMaxPx = ((half + 52.5) / AMAZON_LILY_WORLD_SIZE) * size;
    ctx.drawImage(
      stampCanvas,
      xMinPx,
      zMinPx,
      xMaxPx - xMinPx,
      zMaxPx - zMinPx
    );
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createKujaDoorCrestTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Weathered crimson-copper steel door panels with heavy rivets
    ctx.fillStyle = '#9c3624';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#5c1f14';
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, 488, 488);
    ctx.beginPath();
    ctx.moveTo(256, 12);
    ctx.lineTo(256, 500);
    ctx.stroke();

    // Rivet rows
    ctx.fillStyle = '#3b150e';
    for (let y = 32; y < 500; y += 44) {
      for (const rx of [28, 238, 274, 484]) {
        ctx.beginPath();
        ctx.arc(rx, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Kuja 9-snake sunburst emblem centered on the sliding steel gate (image_94a12ca6.png)
    ctx.fillStyle = '#181416';
    ctx.strokeStyle = '#181416';
    ctx.beginPath();
    ctx.arc(256, 256, 92, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 - Math.PI * 0.5;
      const sx = 256 + Math.cos(a) * 86;
      const sy = 256 + Math.sin(a) * 86;
      const cx = 256 + Math.cos(a + 0.25) * 140;
      const cy = 256 + Math.sin(a + 0.25) * 140;
      const ex = 256 + Math.cos(a) * 184;
      const ey = 256 + Math.sin(a) * 184;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cx, cy, ex, ey);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, ey, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#d49a3a';
    ctx.beginPath();
    ctx.arc(256, 256, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#181416';
    ctx.beginPath();
    ctx.arc(256, 256, 24, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createKujaSailTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f2e8d4';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#8b2434';
    ctx.fillRect(0, 0, 256, 28);
    ctx.fillRect(0, 228, 256, 28);

    // Kuja Pirates emblem (black circle with red snakes + white skull)
    ctx.fillStyle = '#181418';
    ctx.beginPath();
    ctx.arc(128, 128, 56, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#a82230';
    ctx.lineWidth = 8;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(128 + Math.cos(a) * 50, 128 + Math.sin(a) * 50);
      ctx.lineTo(128 + Math.cos(a + 0.18) * 86, 128 + Math.sin(a + 0.18) * 86);
      ctx.stroke();
    }
    ctx.fillStyle = '#f6efe4';
    ctx.beginPath();
    ctx.arc(128, 122, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(116, 138, 24, 14);
    ctx.fillStyle = '#181418';
    ctx.beginPath();
    ctx.arc(119, 122, 5, 0, Math.PI * 2);
    ctx.arc(137, 122, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a single carved stone snake head (sculpted brow, wide jaw & curved fangs) for the summit crown.
 */
function buildCarvedSnakeHead(
  trackGeo: IslandMeshContext['trackGeo'],
  stoneMat: THREE.Material,
  darkMouthMat: THREE.Material,
  fangMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();

  // Curved rock neck emerging seamlessly from mountain slope
  const neck = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.55 * S, 2.55 * S, 7.6 * S, 9)),
    stoneMat
  );
  neck.position.set(0, 3.3 * S, -0.9 * S);
  neck.rotation.x = 0.3;

  // Flared cobra hood & brow crest
  const hood = new THREE.Mesh(
    trackGeo(new THREE.DodecahedronGeometry(2.3 * S, 0)),
    stoneMat
  );
  hood.position.set(0, 6.7 * S, 0.1 * S);
  hood.scale.set(1.22, 0.95, 0.92);

  // Tapered upper skull / snout
  const upperSnout = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.05 * S, 1.78 * S, 4.3 * S, 7)),
    stoneMat
  );
  upperSnout.rotation.x = Math.PI * 0.5 - 0.22;
  upperSnout.scale.set(1.25, 1.0, 0.65);
  upperSnout.position.set(0, 7.55 * S, 2.0 * S);

  // Tapered lower jaw wide open
  const lowerJaw = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.85 * S, 1.48 * S, 3.8 * S, 7)),
    stoneMat
  );
  lowerJaw.rotation.x = Math.PI * 0.5 + 0.36;
  lowerJaw.scale.set(1.15, 1.0, 0.5);
  lowerJaw.position.set(0, 5.15 * S, 1.85 * S);

  // Dark mouth recess
  const mouthCavity = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.75 * S, 1.25 * S, 2.9 * S, 7)),
    darkMouthMat
  );
  mouthCavity.rotation.x = Math.PI * 0.5;
  mouthCavity.position.set(0, 6.35 * S, 1.65 * S);

  // Carved glowing stone eyes under brow
  for (const ex of [-1.25, 1.25]) {
    const eye = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.32 * S, 6, 5)),
      darkMouthMat
    );
    eye.position.set(ex * S, 7.6 * S, 1.7 * S);
    g.add(eye);
  }

  // Twin curved upper & lower fangs
  const fangGeo = trackGeo(new THREE.ConeGeometry(0.22 * S, 1.1 * S, 6));
  for (const fx of [-0.68, 0.68]) {
    const uFang = new THREE.Mesh(fangGeo, fangMat);
    uFang.position.set(fx * S, 6.55 * S, 3.35 * S);
    uFang.rotation.x = Math.PI - 0.12;
    const lFang = new THREE.Mesh(fangGeo, fangMat);
    lFang.position.set(fx * 0.85 * S, 5.35 * S, 3.05 * S);
    lFang.scale.setScalar(0.72);
    lFang.rotation.x = 0.25;
    g.add(uFang, lFang);
  }

  g.add(neck, hood, upperSnout, lowerJaw, mouthCavity);
  return g;
}

/**
 * Builds an ornate multi-tier Chinese/Kuja palace pagoda structure (Kuja Palace / Gorgon Tower)
 * matching image_94a12ca6.png and image_a9ec93d6.png.
 */
function buildKujaPagodaComplex(
  trackGeo: IslandMeshContext['trackGeo'],
  materials: {
    plasterMat: THREE.Material;
    redLacquerMat: THREE.Material;
    slateRoofMat: THREE.Material;
    redRoofMat: THREE.Material;
    goldMat: THREE.Material;
    darkVoidMat: THREE.Material;
  },
  scale = 1
): THREE.Group {
  const g = new THREE.Group();
  const U = S * scale;

  // White stone foundation podium + arched loopholes
  const podium = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(11.6 * U, 2.8 * U, 6.8 * U)),
    materials.plasterMat
  );
  podium.position.y = 1.4 * U;
  g.add(podium);

  // Twin circular red windows on the lower wings (image_a9ec93d6.png)
  for (const sx of [-4.2, 4.2]) {
    const winRing = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.72 * U, 0.72 * U, 0.25 * U, 14)),
      materials.redLacquerMat
    );
    winRing.rotation.x = Math.PI * 0.5;
    winRing.position.set(sx * U, 1.55 * U, 3.45 * U);
    const winHole = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.48 * U, 0.48 * U, 0.3 * U, 12)),
      materials.darkVoidMat
    );
    winHole.rotation.x = Math.PI * 0.5;
    winHole.position.set(sx * U, 1.55 * U, 3.47 * U);
    g.add(winRing, winHole);
  }

  // Red lacquered balcony railing spanning podium top
  const balconyRail = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(11.8 * U, 0.45 * U, 7.0 * U)),
    materials.redLacquerMat
  );
  balconyRail.position.y = 3.0 * U;
  g.add(balconyRail);

  // Twin open lateral pavilions with red columns & curved slate/gold roofs
  for (const sx of [-4.1, 4.1]) {
    const wingCore = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.9 * U, 2.7 * U, 4.4 * U)),
      materials.plasterMat
    );
    wingCore.position.set(sx * U, 4.35 * U, 0);
    const wingDoor = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.3 * U, 1.8 * U, 4.55 * U)),
      materials.darkVoidMat
    );
    wingDoor.position.set(sx * U, 4.1 * U, 0);
    const wingRoof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(2.85 * U, 1.35 * U, 4)),
      materials.redRoofMat
    );
    wingRoof.position.set(sx * U, 6.25 * U, 0);
    wingRoof.rotation.y = Math.PI * 0.25;
    const wingRidge = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.2 * U, 0.24 * U, 0.32 * U)),
      materials.goldMat
    );
    wingRidge.position.set(sx * U, 6.85 * U, 0);
    g.add(wingCore, wingDoor, wingRoof, wingRidge);
  }

  // Central multi-tiered imperial pagoda tower
  const midBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.2 * U, 4.6 * U, 5.2 * U)),
    materials.plasterMat
  );
  midBody.position.y = 5.1 * U;
  const midPortal = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.2 * U, 3.0 * U, 5.38 * U)),
    materials.darkVoidMat
  );
  midPortal.position.y = 4.6 * U;
  const midTrim = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.5 * U, 0.38 * U, 5.45 * U)),
    materials.redLacquerMat
  );
  midTrim.position.y = 7.45 * U;

  const midRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(4.6 * U, 1.55 * U, 4)),
    materials.slateRoofMat
  );
  midRoof.position.y = 8.3 * U;
  midRoof.rotation.y = Math.PI * 0.25;

  const upperBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.6 * U, 2.5 * U, 3.6 * U)),
    materials.plasterMat
  );
  upperBody.position.y = 9.7 * U;
  const upperBand = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.75 * U, 0.45 * U, 3.75 * U)),
    materials.redLacquerMat
  );
  upperBand.position.y = 10.75 * U;

  const topRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(3.55 * U, 1.85 * U, 4)),
    materials.redRoofMat
  );
  topRoof.position.y = 11.8 * U;
  topRoof.rotation.y = Math.PI * 0.25;

  const finial = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.14 * U, 0.28 * U, 1.15 * U, 6)),
    materials.goldMat
  );
  finial.position.y = 13.0 * U;

  g.add(
    midBody,
    midPortal,
    midTrim,
    midRoof,
    upperBody,
    upperBand,
    topRoof,
    finial
  );
  return g;
}

/**
 * Builds the Kuja Pirates' ship (Perfume Yuda) & the twin giant Yuda sea serpents
 * inside the fortified underground sea cave port.
 */
function buildPerfumeYudaFleet(
  trackGeo: IslandMeshContext['trackGeo'],
  materials: {
    hullRedMat: THREE.Material;
    goldMat: THREE.Material;
    deckWoodMat: THREE.Material;
    sailMat: THREE.Material;
    serpentBodyMat: THREE.Material;
    serpentBellyMat: THREE.Material;
    serpentCrestMat: THREE.Material;
  }
): { fleetGroup: THREE.Group; serpents: THREE.Group[] } {
  const fleet = new THREE.Group();
  const serpents: THREE.Group[] = [];

  // Ship hull (oriented along +X/+Z axis before placement yaw)
  const hull = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.4 * S, 1.55 * S, 9.6 * S)),
    materials.hullRedMat
  );
  hull.position.y = 0.5 * S;
  const keelGold = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.6 * S, 0.35 * S, 9.8 * S)),
    materials.goldMat
  );
  keelGold.position.y = 1.18 * S;
  const deck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.15 * S, 0.2 * S, 9.2 * S)),
    materials.deckWoodMat
  );
  deck.position.y = 1.32 * S;
  const prow = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(1.65 * S, 3.1 * S, 6)),
    materials.hullRedMat
  );
  prow.rotation.x = Math.PI * 0.5;
  prow.position.set(0, 0.85 * S, 6.1 * S);

  // Aft imperial Kuja cabin with curved pagoda roof
  const sternCabin = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.85 * S, 1.75 * S, 2.7 * S)),
    materials.hullRedMat
  );
  sternCabin.position.set(0, 2.2 * S, -3.1 * S);
  const sternRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(2.55 * S, 1.25 * S, 4)),
    materials.goldMat
  );
  sternRoof.position.set(0, 3.65 * S, -3.1 * S);
  sternRoof.rotation.y = Math.PI * 0.25;

  // Main mast + square Kuja Pirates sail
  const mast = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.18 * S, 0.24 * S, 7.4 * S, 8)),
    materials.deckWoodMat
  );
  mast.position.set(0, 5.0 * S, 0.4 * S);
  const yard = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.11 * S, 0.11 * S, 4.6 * S, 6)),
    materials.deckWoodMat
  );
  yard.rotation.z = Math.PI * 0.5;
  yard.position.set(0, 7.6 * S, 0.4 * S);
  const sail = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(4.2 * S, 3.8 * S)),
    materials.sailMat
  );
  sail.position.set(0, 5.5 * S, 0.55 * S);

  fleet.add(hull, keelGold, deck, prow, sternCabin, sternRoof, mast, yard, sail);

  // Twin Giant Yuda Sea Serpents pulling ahead of the ship (x = ±1.6m, z = +6.5..+14.5m)
  for (const sx of [-1.55, 1.55]) {
    const serpent = new THREE.Group();
    serpent.position.set(sx * S, 0.1 * S, 9.6 * S);

    // Undulating serpentine curve body
    const bodyPts = [
      new THREE.Vector3(0, -0.3 * S, -3.2 * S),
      new THREE.Vector3(sx * 0.35 * S, 0.55 * S, -1.5 * S),
      new THREE.Vector3(-sx * 0.25 * S, 0.05 * S, 0.4 * S),
      new THREE.Vector3(0, 1.45 * S, 2.2 * S),
      new THREE.Vector3(0, 2.85 * S, 3.3 * S),
    ];
    const bodyCurve = new THREE.CatmullRomCurve3(bodyPts, false, 'centripetal');
    const bodyMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(bodyCurve, 18, 0.52 * S, 8, false)),
      materials.serpentBodyMat
    );
    const bellyStrip = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(bodyCurve, 14, 0.34 * S, 6, false)),
      materials.serpentBellyMat
    );
    bellyStrip.position.y = -0.14 * S;

    const head = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.15 * S, 0.92 * S, 1.75 * S)),
      materials.serpentBodyMat
    );
    head.position.set(0, 3.05 * S, 3.85 * S);

    const crest = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.55 * S, 1.45 * S, 5)),
      materials.serpentCrestMat
    );
    crest.position.set(0, 3.75 * S, 3.3 * S);
    crest.rotation.x = -0.55;

    // Golden harness beam linking Yuda to Perfume Yuda prow
    const harness = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.06 * S, 0.06 * S, 3.6 * S, 5)),
      materials.goldMat
    );
    harness.rotation.x = Math.PI * 0.5;
    harness.position.set(-sx * 0.35 * S, 0.75 * S, -2.1 * S);

    serpent.add(bodyMesh, bellyStrip, head, crest, harness);
    serpents.push(serpent);
    fleet.add(serpent);
  }

  return { fleetGroup: fleet, serpents };
}

/**
 * Amazon Lily — Île des Femmes / Empire Kuja (Calm Belt)
 * Fidèle à image_422abdc3.png, image_94a12ca6.png et image_a9ec93d6.png :
 * - Montagne centrale en cône tronqué gravée « 九蛇 », 9 têtes de serpents & double arche en cœur
 * - Mur crénelé autour du cratère, village en amphithéâtre sur pilotis, rivière sinueuse
 * - Palais Kuja sur les hauteurs, Arène de combat avec fosse à pieux & Tour des Sœurs Gorgones
 * - Grotte marine / Port souterrain fermé par porte coulissante métallique Kuja + Perfume Yuda & Yuda
 * - Jungle tropicale dense, champignons géants/parasites & faune massive (sangliers, panthères, serpents)
 */
export function createIslandMesh(ctx: IslandMeshContext): IslandMeshInstance {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const group = new THREE.Group();
  group.name = 'island-amazon-lily';
  const registerTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;

  // 1. Sculpted Truncated-Cone Mountain, Crater & Coastal Cliffs Mesh (220 x 220)
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(
      AMAZON_LILY_WORLD_SIZE,
      AMAZON_LILY_WORLD_SIZE,
      220,
      220
    )
  );
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const ly = sampleAmazonLilyHeight(lx, lz);
    const sp = toAmazonLilySphereLocal(lx, ly, lz, globeRadius);
    posAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainTex = registerTex(createAmazonLilyTerrainTexture(1024));
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.86,
      metalness: 0.04,
      alphaTest: 0.3,
      side: THREE.DoubleSide,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.castShadow = true;
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Shared Palette Materials (varied roughness/metalness per Three.js directives)
  const summitStoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xbac0c6, roughness: 0.88 })
  );
  const cliffOchreMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb8764a, roughness: 0.9 })
  );
  const darkMouthMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1c2026, roughness: 0.92 })
  );
  const fangMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xebe6d8, roughness: 0.6 })
  );
  const plasterMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe2dcd0, roughness: 0.82 })
  );
  const redLacquerMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb02e26, roughness: 0.55 })
  );
  const slateRoofMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c6e86, roughness: 0.68 })
  );
  const redRoofMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xc23c2c, roughness: 0.65 })
  );
  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd4a438,
      roughness: 0.35,
      metalness: 0.65,
    })
  );
  const darkVoidMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x351c1a, roughness: 0.78 })
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3a424c,
      roughness: 0.48,
      metalness: 0.68,
    })
  );
  const woodStakeMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6c4a2e, roughness: 0.88 })
  );
  const canopyGreenMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86 })
  );
  const trunkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5a3e28, roughness: 0.92 })
  );

  // 2. Crater Rim Crenellated Battlement Wall encircling the entire summit lip
  {
    const wallCount = 72;
    const wallSegGeo = trackGeo(new THREE.BoxGeometry(3.5 * S, 2.8 * S, 1.35 * S));
    const merlonGeo = trackGeo(new THREE.BoxGeometry(1.1 * S, 1.1 * S, 1.45 * S));
    const wallInst = new THREE.InstancedMesh(wallSegGeo, summitStoneMat, wallCount);
    const merlonInst = new THREE.InstancedMesh(merlonGeo, summitStoneMat, wallCount * 2);
    const dummy = new THREE.Object3D();
    let wIdx = 0;
    let mIdx = 0;

    for (let i = 0; i < wallCount; i++) {
      const ang = (i / wallCount) * Math.PI * 2;
      // Leave small break around central north snake monolith (ang ~ -PI/2)
      const diffN = Math.atan2(Math.sin(ang + Math.PI * 0.5), Math.cos(ang + Math.PI * 0.5));
      if (Math.abs(diffN) < 0.24) continue;

      const wx = Math.cos(ang) * AMAZON_LILY_CRATER_RIM_RADIUS;
      const wz = Math.sin(ang) * AMAZON_LILY_CRATER_RIM_RADIUS;
      const wy = sampleAmazonLilyHeight(wx, wz);

      placeOnAmazonLilySphere(dummy, wx, wy + 1.1, wz, globeRadius, -ang + Math.PI * 0.5);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      wallInst.setMatrixAt(wIdx++, dummy.matrix);

      for (const offset of [-0.95, 0.95]) {
        const mx = wx - Math.sin(ang) * offset;
        const mz = wz + Math.cos(ang) * offset;
        placeOnAmazonLilySphere(dummy, mx, wy + 2.85, mz, globeRadius, -ang + Math.PI * 0.5);
        dummy.updateMatrix();
        merlonInst.setMatrixAt(mIdx++, dummy.matrix);
      }
    }
    wallInst.count = wIdx;
    merlonInst.count = mIdx;
    wallInst.instanceMatrix.needsUpdate = true;
    merlonInst.instanceMatrix.needsUpdate = true;
    wallInst.computeBoundingSphere();
    merlonInst.computeBoundingSphere();
    group.add(wallInst, merlonInst);
  }

  // 3. Monumental Snake Summit Crown: Central Pillar, Double Heart Rock Arches & 9 Carved Serpent Heads
  {
    const crownGroup = new THREE.Group();
    placeOnAmazonLilySphere(crownGroup, 0, 0, 0, globeRadius, 0);

    // Central soaring rocky spire + jagged summit peak rising above the double heart arches (image_422abdc3.png)
    const centralSpire = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(3.0 * S, 5.2 * S, 36.0 * S, 9)),
      summitStoneMat
    );
    centralSpire.position.set(0, 56.5 * S, -37.5 * S);
    const spirePeak = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(3.15 * S, 11.5 * S, 8)),
      summitStoneMat
    );
    spirePeak.position.set(0, 79.5 * S, -37.5 * S);
    const peakPineMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x266a32, roughness: 0.85 })
    );
    const peakPine = new THREE.Mesh(
      trackGeo(new THREE.DodecahedronGeometry(2.1 * S, 0)),
      peakPineMat
    );
    peakPine.scale.set(1.4, 0.65, 1.1);
    peakPine.position.set(0, 84.8 * S, -37.5 * S);
    crownGroup.add(centralSpire, spirePeak, peakPine);

    // Double Heart-Shaped Stone Arches swooping from central spire down to E/W flanks
    for (const side of [-1, 1]) {
      const archCurve = new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(side * 1.4 * S, 70.5 * S, -37.0 * S),
          new THREE.Vector3(side * 13.5 * S, 75.5 * S, -34.0 * S),
          new THREE.Vector3(side * 24.5 * S, 67.5 * S, -29.0 * S),
          new THREE.Vector3(side * 28.5 * S, 54.0 * S, -24.0 * S),
          new THREE.Vector3(side * 28.0 * S, 41.5 * S, -23.0 * S),
        ],
        false,
        'centripetal'
      );
      const archGeo = trackGeo(new THREE.TubeGeometry(archCurve, 28, 3.25 * S, 9, false));
      const archMesh = new THREE.Mesh(archGeo, summitStoneMat);
      archMesh.castShadow = true;
      crownGroup.add(archMesh);

      // Hanging stalactites & crowning cliff pines on the upper arch curves (image_422abdc3.png / image_94a12ca6.png)
      for (const [stX, stY, stZ, stH] of [
        [side * 10.5, 71.2, -34.6, 5.2],
        [side * 17.5, 68.4, -31.4, 4.4],
      ]) {
        const stal = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(1.0 * S, stH * S, 6)),
          summitStoneMat
        );
        stal.position.set(stX * S, stY * S, stZ * S);
        stal.rotation.x = Math.PI;
        crownGroup.add(stal);
      }
      for (const [px, py, pz] of [
        [side * 11.5, 78.8, -34.5],
        [side * 21.5, 72.5, -30.5],
      ]) {
        const mossPad = new THREE.Mesh(
          trackGeo(new THREE.DodecahedronGeometry(2.0 * S, 0)),
          peakPineMat
        );
        mossPad.scale.set(1.6, 0.55, 1.15);
        mossPad.position.set(px * S, py * S, pz * S);
        crownGroup.add(mossPad);
      }
    }

    // 9 Giant Carved Serpent Heads fanning across the northern crown facing South (image_422abdc3.png)
    const serpentPlacements: Array<[number, number, number, number, number]> = [
      [0.0, 51.0, -34.8, 0.0, 1.25],
      [-7.5, 46.5, -35.8, 0.18, 1.08],
      [7.5, 46.5, -35.8, -0.18, 1.08],
      [-15.5, 44.5, -32.8, 0.36, 1.0],
      [15.5, 44.5, -32.8, -0.36, 1.0],
      [-23.5, 42.5, -27.5, 0.55, 1.04],
      [23.5, 42.5, -27.5, -0.55, 1.04],
      [-29.5, 40.5, -20.5, 0.78, 0.94],
      [29.5, 40.5, -20.5, -0.78, 0.94],
    ];
    for (const [sx, sy, sz, yaw, sc] of serpentPlacements) {
      const head = buildCarvedSnakeHead(trackGeo, summitStoneMat, darkMouthMat, fangMat);
      head.position.set(sx * S, sy * S, sz * S);
      head.rotation.y = yaw;
      head.scale.setScalar(sc);
      crownGroup.add(head);
    }

    group.add(crownGroup);
  }

  // 4. Central Combat Arena, Spike Moat, Arena Bridges & Gorgon Sisters Observation Pavilion
  {
    const arenaGroup = new THREE.Group();
    placeOnAmazonLilySphere(
      arenaGroup,
      AMAZON_LILY_ARENA_CENTER.x,
      0,
      AMAZON_LILY_ARENA_CENTER.z,
      globeRadius,
      0
    );

    // Carved circular combat platform rim trim
    const ringBorder = new THREE.Mesh(
      trackGeo(
        new THREE.TorusGeometry(
          AMAZON_LILY_ARENA_CENTER.innerRadius * S,
          0.32 * S,
          8,
          36
        )
      ),
      plasterMat
    );
    ringBorder.rotation.x = Math.PI * 0.5;
    ringBorder.position.y = (AMAZON_LILY_ARENA_CENTER.floorY + 0.1) * S;
    arenaGroup.add(ringBorder);

    // Dense ring of sharpened wooden/iron stakes inside the spike moat!
    const stakeCount = 54;
    const stakeGeo = trackGeo(new THREE.ConeGeometry(0.16 * S, 1.75 * S, 5));
    const stakeInst = new THREE.InstancedMesh(stakeGeo, woodStakeMat, stakeCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < stakeCount; i++) {
      const a = (i / stakeCount) * Math.PI * 2;
      const rad = 6.1 + (i % 2) * 0.95;
      dummy.position.set(
        Math.cos(a) * rad * S,
        (AMAZON_LILY_ARENA_CENTER.pitY + 0.85) * S,
        Math.sin(a) * rad * S
      );
      dummy.rotation.set(
        Math.sin(a) * 0.14,
        a,
        -Math.cos(a) * 0.14
      );
      dummy.scale.setScalar(0.9 + (i % 3) * 0.15);
      dummy.updateMatrix();
      stakeInst.setMatrixAt(i, dummy.matrix);
    }
    stakeInst.instanceMatrix.needsUpdate = true;
    stakeInst.computeBoundingSphere();
    arenaGroup.add(stakeInst);

    // N/S stone access walkways bridging over the spike moat into the arena
    for (const bz of [-6.5, 6.5]) {
      const bridge = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(2.6 * S, 0.45 * S, 3.4 * S)),
        plasterMat
      );
      bridge.position.set(0, (AMAZON_LILY_ARENA_CENTER.floorY - 0.1) * S, bz * S);
      arenaGroup.add(bridge);
    }
    group.add(arenaGroup);

    // Gorgon Sisters Observation Pavilion overlooking the North edge of the Arena (image_a9ec93d6.png)
    const gorgonTower = buildKujaPagodaComplex(
      trackGeo,
      {
        plasterMat,
        redLacquerMat,
        slateRoofMat,
        redRoofMat,
        goldMat,
        darkVoidMat,
      },
      1.05
    );
    placeOnAmazonLilySphere(
      gorgonTower,
      AMAZON_LILY_GORGON_TOWER.x,
      AMAZON_LILY_GORGON_TOWER.y - 0.2,
      AMAZON_LILY_GORGON_TOWER.z,
      globeRadius,
      0
    );
    group.add(gorgonTower);
  }

  // 5. Kuja Palace on the High NW Crater Terrace + Ceremonial Staircase (image_94a12ca6.png)
  {
    const palace = buildKujaPagodaComplex(
      trackGeo,
      {
        plasterMat,
        redLacquerMat,
        slateRoofMat,
        redRoofMat,
        goldMat,
        darkVoidMat,
      },
      1.25
    );
    placeOnAmazonLilySphere(
      palace,
      AMAZON_LILY_PALACE_CENTER.x,
      AMAZON_LILY_PALACE_CENTER.y - 0.2,
      AMAZON_LILY_PALACE_CENTER.z,
      globeRadius,
      0.62
    );
    group.add(palace);

    // Terrace retaining wall & grand steps deeply anchored into crater mountain wall
    const terraceWall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(17.5 * S, 12.0 * S, 14.0 * S)),
      plasterMat
    );
    placeOnAmazonLilySphere(
      terraceWall,
      AMAZON_LILY_PALACE_CENTER.x,
      AMAZON_LILY_PALACE_CENTER.y - 6.0,
      AMAZON_LILY_PALACE_CENTER.z,
      globeRadius,
      0.62
    );
    group.add(terraceWall);
  }

  // 6. Kuja Tribe Village & Cliff-Mounted Amphitheater Houses on Stilts (image_a9ec93d6.png)
  {
    const houses = buildAmazonLilyHouses();
    const houseWallGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
    const houseRoofGeo = trackGeo(new THREE.ConeGeometry(0.76, 0.55, 4));
    houseRoofGeo.rotateY(Math.PI * 0.25);
    const stiltGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.13, 1, 5));

    const wallMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 })
    );
    const roofMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.66 })
    );

    const wallInst = new THREE.InstancedMesh(houseWallGeo, wallMat, houses.length);
    const roofInst = new THREE.InstancedMesh(houseRoofGeo, roofMat, houses.length);
    const stiltHouses = houses.filter((h) => h.isCliffStilt);
    const stiltInst = new THREE.InstancedMesh(
      stiltGeo,
      plasterMat,
      Math.max(1, stiltHouses.length * 4)
    );
    const railInst = new THREE.InstancedMesh(
      houseWallGeo,
      redLacquerMat,
      Math.max(1, stiltHouses.length)
    );

    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    let sIdx = 0;
    let rIdx = 0;

    houses.forEach((h, i) => {
      const baseLift = h.isCliffStilt ? h.stiltHeight * 0.45 : 0;
      const bodyY = h.y + baseLift + h.height * 0.5 - 0.15;
      placeOnAmazonLilySphere(dummy, h.x, bodyY, h.z, globeRadius, h.yaw);
      dummy.scale.set(h.width * S, h.height * S, h.depth * S);
      dummy.updateMatrix();
      wallInst.setMatrixAt(i, dummy.matrix);
      wallInst.setColorAt(i, col.setHex(h.wallColor));

      placeOnAmazonLilySphere(
        dummy,
        h.x,
        bodyY + h.height * 0.5 + 0.55,
        h.z,
        globeRadius,
        h.yaw
      );
      dummy.scale.set(h.width * 1.25 * S, 1.5 * S, h.depth * 1.25 * S);
      dummy.updateMatrix();
      roofInst.setMatrixAt(i, dummy.matrix);
      roofInst.setColorAt(i, col.setHex(h.roofColor));

      if (h.isCliffStilt) {
        // Red veranda gallery trim
        placeOnAmazonLilySphere(
          dummy,
          h.x,
          bodyY - h.height * 0.42,
          h.z,
          globeRadius,
          h.yaw
        );
        dummy.scale.set(h.width * 1.12 * S, 0.34 * S, h.depth * 1.12 * S);
        dummy.updateMatrix();
        railInst.setMatrixAt(rIdx++, dummy.matrix);

        // Four white stilts penetrating deeply into steep ochre crater rock face (no dangling pillars)
        const cosY = Math.cos(h.yaw);
        const sinY = Math.sin(h.yaw);
        for (const [ox, oz] of [
          [-h.width * 0.42, -h.depth * 0.36],
          [h.width * 0.42, -h.depth * 0.36],
          [-h.width * 0.42, h.depth * 0.36],
          [h.width * 0.42, h.depth * 0.36],
        ]) {
          const sx = h.x + ox * cosY + oz * sinY;
          const sz = h.z - ox * sinY + oz * cosY;
          const pillarH = h.stiltHeight + 10.5;
          placeOnAmazonLilySphere(
            dummy,
            sx,
            h.y + baseLift - pillarH * 0.5 + 0.3,
            sz,
            globeRadius,
            0
          );
          dummy.scale.set(S, pillarH * S, S);
          dummy.updateMatrix();
          stiltInst.setMatrixAt(sIdx++, dummy.matrix);
        }
      }
    });

    wallInst.instanceMatrix.needsUpdate = true;
    roofInst.instanceMatrix.needsUpdate = true;
    if (wallInst.instanceColor) wallInst.instanceColor.needsUpdate = true;
    if (roofInst.instanceColor) roofInst.instanceColor.needsUpdate = true;
    stiltInst.count = sIdx;
    railInst.count = rIdx;
    stiltInst.instanceMatrix.needsUpdate = true;
    railInst.instanceMatrix.needsUpdate = true;
    wallInst.computeBoundingSphere();
    roofInst.computeBoundingSphere();
    stiltInst.computeBoundingSphere();
    railInst.computeBoundingSphere();
    group.add(wallInst, roofInst, stiltInst, railInst);

    // Market Stalls & River Bridges inside crater floor
    const awningColors = [0xd64036, 0xe8a82e, 0x843cb2];
    const marketSpots: [number, number, number][] = [
      [-8.8, 12.2, 0.4],
      [-6.5, 14.2, -0.2],
      [6.2, 8.8, 0.9],
      [8.5, 5.2, -0.5],
      [5.8, -8.5, 0.2],
    ];
    marketSpots.forEach(([mx, mz, myaw], i) => {
      const my = sampleAmazonLilyHeight(mx, mz);
      const stall = new THREE.Group();
      placeOnAmazonLilySphere(stall, mx, my, mz, globeRadius, myaw);
      const canopy = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(2.2 * S, 0.16 * S, 1.5 * S)),
        trackMat(new THREE.MeshStandardMaterial({ color: awningColors[i % 3], roughness: 0.78 }))
      );
      canopy.position.y = 1.65 * S;
      const counter = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.9 * S, 0.75 * S, 0.85 * S)),
        woodStakeMat
      );
      counter.position.y = 0.38 * S;
      stall.add(canopy, counter);
      group.add(stall);
    });

    // Two arched timber/red-lacquer bridges spanning the crater river
    for (const [bx, bz, byaw] of [
      [-2.5, 21.0, 0.25],
      [11.5, 14.8, -0.58],
    ]) {
      const br = new THREE.Group();
      placeOnAmazonLilySphere(br, bx, 3.65, bz, globeRadius, byaw);
      const deck = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(2.4 * S, 0.35 * S, 7.2 * S)),
        woodStakeMat
      );
      br.add(deck);
      for (const rx of [-1.05, 1.05]) {
        const rail = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.18 * S, 0.72 * S, 7.2 * S)),
          redLacquerMat
        );
        rail.position.set(rx * S, 0.45 * S, 0);
        br.add(rail);
      }
      group.add(br);
    }
  }

  // 7. Inner Crater River & Fortified Underground Port Basin Water Surface + Cave Roof + Sliding Gate + Perfume Yuda
  const portDoorPanels: { left: THREE.Mesh; right: THREE.Mesh }[] = [];
  let yudaSerpents: THREE.Group[] = [];
  let fleetRoot: THREE.Group | null = null;
  const glowCaps: THREE.MeshStandardMaterial[] = [];

  {
    // Turquoise water plane covering the crater river & underground port basin (y = 0.08m)
    const waterGeo = trackGeo(new THREE.PlaneGeometry(118 * S, 78 * S, 24, 18));
    waterGeo.rotateX(-Math.PI * 0.5);
    const waterMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x16a2c4,
        emissive: 0x063448,
        emissiveIntensity: 0.22,
        roughness: 0.18,
        metalness: 0.12,
        transparent: true,
        opacity: 0.86,
      })
    );
    const basinWater = new THREE.Mesh(waterGeo, waterMat);
    placeOnAmazonLilySphere(basinWater, 32.0, 0.08, 16.0, globeRadius, 0);
    group.add(basinWater);

    // Fortified Stone Port Quay bordering the wide inner sea-cave basin (x = 13.0, z = 15.5)
    const quayDeck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(10.5 * S, 2.2 * S, 7.2 * S)),
      plasterMat
    );
    placeOnAmazonLilySphere(quayDeck, 13.0, 1.9, 15.5, globeRadius, -0.42);
    group.add(quayDeck);

    // Wide Rocky Sea-Cave Vault Arch enclosing the underground channel cleanly around gateFrame (no sky leak)
    const vaultGroup = new THREE.Group();
    placeOnAmazonLilySphere(
      vaultGroup,
      AMAZON_LILY_PORT_CHANNEL.portalMid.x,
      0,
      AMAZON_LILY_PORT_CHANNEL.portalMid.z,
      globeRadius,
      AMAZON_LILY_PORT_CHANNEL.doorYaw
    );
    const caveRoof = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(14.5 * S, 16.5 * S, 28.0 * S, 14, 1, true, 0, Math.PI)),
      cliffOchreMat
    );
    caveRoof.rotation.z = Math.PI * 0.5;
    caveRoof.rotation.y = Math.PI * 0.5;
    caveRoof.position.y = 12.2 * S;
    caveRoof.scale.set(1.0, 1.32, 1.15);
    const caveCap = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(26.0 * S, 13.0 * S, 26.0 * S)),
      cliffOchreMat
    );
    caveCap.position.y = 25.0 * S;
    // Left & right inner rock walls flanking the sea-cave mouth cleanly outside the water channel
    for (const wallX of [-13.5, 13.5]) {
      const rockWall = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(7.5 * S, 24.0 * S, 26.0 * S)),
        cliffOchreMat
      );
      rockWall.position.set(wallX * S, 10.5 * S, 0);
      vaultGroup.add(rockWall);
    }
    vaultGroup.add(caveRoof, caveCap);
    group.add(vaultGroup);

    // Massive Red-Copper Sliding Metal Gate with Kuja Sun Crest (image_94a12ca6.png)
    const gateFrame = new THREE.Group();
    placeOnAmazonLilySphere(
      gateFrame,
      AMAZON_LILY_PORT_CHANNEL.doorCenter.x,
      0,
      AMAZON_LILY_PORT_CHANNEL.doorCenter.z,
      globeRadius,
      AMAZON_LILY_PORT_CHANNEL.doorYaw
    );

    const overheadBeam = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(22.0 * S, 2.4 * S, 2.8 * S)),
      darkIronMat
    );
    overheadBeam.position.set(0, 15.8 * S, 0);
    const rockLintel = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(24.0 * S, 11.0 * S, 5.0 * S)),
      cliffOchreMat
    );
    rockLintel.position.set(0, 21.5 * S, 0);
    gateFrame.add(overheadBeam, rockLintel);

    for (const px of [-9.2, 9.2]) {
      const pillar = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(3.0 * S, 18.5 * S, 3.0 * S)),
        darkIronMat
      );
      pillar.position.set(px * S, 8.0 * S, 0);
      gateFrame.add(pillar);
    }

    const doorTex = registerTex(createKujaDoorCrestTexture());
    const doorMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: doorTex,
        roughness: 0.42,
        metalness: 0.58,
      })
    );
    const leftDoor = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(7.8 * S, 14.6 * S, 1.1 * S)),
      doorMat
    );
    leftDoor.position.set(-4.2 * S, 7.2 * S, 0);
    const rightDoor = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(7.8 * S, 14.6 * S, 1.1 * S)),
      doorMat
    );
    rightDoor.position.set(4.2 * S, 7.2 * S, 0);
    gateFrame.add(leftDoor, rightDoor);
    portDoorPanels.push({ left: leftDoor, right: rightDoor });
    group.add(gateFrame);

    // Kuja Pirates Flagship "Perfume Yuda" + Twin Giant Yuda Sea Serpents in the Underground Basin!
    const sailTex = registerTex(createKujaSailTexture());
    const fleet = buildPerfumeYudaFleet(trackGeo, {
      hullRedMat: redLacquerMat,
      goldMat,
      deckWoodMat: woodStakeMat,
      sailMat: trackMat(
        new THREE.MeshStandardMaterial({
          map: sailTex,
          roughness: 0.72,
          side: THREE.DoubleSide,
        })
      ),
      serpentBodyMat: trackMat(
        new THREE.MeshStandardMaterial({ color: 0x268a78, roughness: 0.45 })
      ),
      serpentBellyMat: trackMat(
        new THREE.MeshStandardMaterial({ color: 0xe6c86a, roughness: 0.55 })
      ),
      serpentCrestMat: trackMat(
        new THREE.MeshStandardMaterial({ color: 0xc42c2e, roughness: 0.5 })
      ),
    });
    placeOnAmazonLilySphere(fleet.fleetGroup, 26.0, 0.05, 10.0, globeRadius, 1.12);
    group.add(fleet.fleetGroup);
    fleetRoot = fleet.fleetGroup;
    yudaSerpents = fleet.serpents;
  }

  // 8. Dense Wild Jungle Trees, Cliff Pines & Giant Exotic Mushrooms (Instanced & Grouped)
  {
    const trees = buildAmazonLilyTrees();
    const canopyTrees = trees.filter((t) => t.kind === 'jungle-canopy');
    const palmTrees = trees.filter((t) => t.kind === 'palm');
    const pineTrees = trees.filter((t) => t.kind === 'cliff-pine');

    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    if (canopyTrees.length > 0) {
      const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.24 * S, 0.42 * S, 3.6 * S, 6));
      const crownGeo = trackGeo(new THREE.DodecahedronGeometry(2.15 * S, 1));
      const tInst = new THREE.InstancedMesh(trunkGeo, trunkMat, canopyTrees.length);
      const cInst = new THREE.InstancedMesh(crownGeo, canopyGreenMat, canopyTrees.length);

      canopyTrees.forEach((t, i) => {
        placeOnAmazonLilySphere(dummy, t.x, t.y + 1.7 * t.scale, t.z, globeRadius, t.yaw);
        dummy.scale.setScalar(t.scale);
        dummy.updateMatrix();
        tInst.setMatrixAt(i, dummy.matrix);

        placeOnAmazonLilySphere(dummy, t.x, t.y + 3.8 * t.scale, t.z, globeRadius, t.yaw);
        dummy.scale.set(t.scale * 1.2, t.scale * 0.85, t.scale * 1.15);
        dummy.updateMatrix();
        cInst.setMatrixAt(i, dummy.matrix);
        cInst.setColorAt(i, col.setRGB(0.14 * t.tint, 0.44 * t.tint, 0.16 * t.tint));
      });
      tInst.instanceMatrix.needsUpdate = true;
      cInst.instanceMatrix.needsUpdate = true;
      if (cInst.instanceColor) cInst.instanceColor.needsUpdate = true;
      tInst.computeBoundingSphere();
      cInst.computeBoundingSphere();
      group.add(tInst, cInst);
    }

    if (palmTrees.length > 0) {
      const palmTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.16 * S, 0.28 * S, 4.6 * S, 6));
      const palmLeafGeo = trackGeo(new THREE.ConeGeometry(2.1 * S, 1.1 * S, 6));
      const ptInst = new THREE.InstancedMesh(palmTrunkGeo, trunkMat, palmTrees.length);
      const plInst = new THREE.InstancedMesh(palmLeafGeo, canopyGreenMat, palmTrees.length);

      palmTrees.forEach((t, i) => {
        placeOnAmazonLilySphere(dummy, t.x, t.y + 2.2 * t.scale, t.z, globeRadius, t.yaw);
        dummy.scale.setScalar(t.scale);
        dummy.updateMatrix();
        ptInst.setMatrixAt(i, dummy.matrix);

        placeOnAmazonLilySphere(dummy, t.x, t.y + 4.4 * t.scale, t.z, globeRadius, t.yaw);
        dummy.scale.set(t.scale * 1.15, t.scale * 0.7, t.scale * 1.15);
        dummy.updateMatrix();
        plInst.setMatrixAt(i, dummy.matrix);
        plInst.setColorAt(i, col.setRGB(0.2 * t.tint, 0.56 * t.tint, 0.2 * t.tint));
      });
      ptInst.instanceMatrix.needsUpdate = true;
      plInst.instanceMatrix.needsUpdate = true;
      if (plInst.instanceColor) plInst.instanceColor.needsUpdate = true;
      ptInst.computeBoundingSphere();
      plInst.computeBoundingSphere();
      group.add(ptInst, plInst);
    }

    if (pineTrees.length > 0) {
      const pineTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.14 * S, 0.24 * S, 2.9 * S, 5));
      const pinePadGeo = trackGeo(new THREE.DodecahedronGeometry(1.45 * S, 0));
      const ntInst = new THREE.InstancedMesh(pineTrunkGeo, trunkMat, pineTrees.length);
      const npInst = new THREE.InstancedMesh(pinePadGeo, canopyGreenMat, pineTrees.length);

      pineTrees.forEach((t, i) => {
        placeOnAmazonLilySphere(dummy, t.x, t.y + 0.65 * t.scale, t.z, globeRadius, t.yaw);
        dummy.scale.setScalar(t.scale);
        dummy.updateMatrix();
        ntInst.setMatrixAt(i, dummy.matrix);

        placeOnAmazonLilySphere(dummy, t.x, t.y + 2.2 * t.scale, t.z, globeRadius, t.yaw);
        dummy.scale.set(t.scale * 1.45, t.scale * 0.52, t.scale * 1.1);
        dummy.updateMatrix();
        npInst.setMatrixAt(i, dummy.matrix);
        npInst.setColorAt(i, col.setRGB(0.16, 0.48, 0.2));
      });
      ntInst.instanceMatrix.needsUpdate = true;
      npInst.instanceMatrix.needsUpdate = true;
      if (npInst.instanceColor) npInst.instanceColor.needsUpdate = true;
      ntInst.computeBoundingSphere();
      npInst.computeBoundingSphere();
      group.add(ntInst, npInst);
    }

    // Exotic Jungle Mushrooms & Bioluminescent Parasite Mushrooms
    const stemMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xf2e8d4, roughness: 0.78 })
    );
    for (const m of buildAmazonLilyMushrooms()) {
      const mg = new THREE.Group();
      placeOnAmazonLilySphere(mg, m.x, m.y, m.z, globeRadius, m.yaw);
      const stem = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.28 * S * m.scale, 0.42 * S * m.scale, 1.55 * S * m.scale, 7)),
        stemMat
      );
      stem.position.y = 0.75 * S * m.scale;
      const capMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: m.capColor,
          emissive: m.kind === 'parasite-glow' ? m.capColor : 0x000000,
          emissiveIntensity: m.kind === 'parasite-glow' ? 0.35 : 0,
          roughness: 0.45,
        })
      );
      if (m.kind === 'parasite-glow') glowCaps.push(capMat);
      const cap = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(1.1 * S * m.scale, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)),
        capMat
      );
      cap.position.y = 1.45 * S * m.scale;
      const spot = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.22 * S * m.scale, 6, 5)),
        stemMat
      );
      spot.position.set(0.35 * S * m.scale, 2.05 * S * m.scale, 0.35 * S * m.scale);
      mg.add(stem, cap, spot);
      group.add(mg);
    }
  }

  // 9. Wild Hostile Jungle Fauna (Giant Boars, Black Panthers & Giant Jungle Serpents)
  {
    const boarHideMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x4c3022, roughness: 0.88 })
    );
    const boarManeMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x261710, roughness: 0.92 })
    );
    const pantherCoatMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x1e2028, roughness: 0.65 })
    );
    const snakeJungleMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x2e8e44, roughness: 0.48 })
    );
    const eyeGoldMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffc838,
        emissive: 0x805000,
        emissiveIntensity: 0.45,
        roughness: 0.3,
      })
    );

    for (const f of buildAmazonLilyFauna()) {
      const fg = new THREE.Group();
      placeOnAmazonLilySphere(fg, f.x, f.y, f.z, globeRadius, f.yaw);
      const sc = f.scale * S;

      if (f.kind === 'giant-boar') {
        const torso = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(1.15 * sc, 10, 8)),
          boarHideMat
        );
        torso.scale.set(0.85, 0.82, 1.32);
        torso.position.y = 1.25 * sc;
        const mane = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.45 * sc, 0.6 * sc, 1.75 * sc)),
          boarManeMat
        );
        mane.position.set(0, 1.9 * sc, 0.08 * sc);
        const snout = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.36 * sc, 0.46 * sc, 0.78 * sc, 8)),
          boarHideMat
        );
        snout.rotation.x = Math.PI * 0.5;
        snout.position.set(0, 1.12 * sc, 1.52 * sc);
        // Four grounded sturdy boar legs & hooves resting at local ground y = 0
        for (const [lx, lz] of [
          [-0.48, 0.72],
          [0.48, 0.72],
          [-0.48, -0.72],
          [0.48, -0.72],
        ]) {
          const leg = new THREE.Mesh(
            trackGeo(new THREE.CylinderGeometry(0.18 * sc, 0.14 * sc, 0.95 * sc, 6)),
            boarHideMat
          );
          leg.position.set(lx * sc, 0.48 * sc, lz * sc);
          fg.add(leg);
        }
        // Twin rounded ears & curved tusks
        for (const ex of [-0.55, 0.55]) {
          const ear = new THREE.Mesh(
            trackGeo(new THREE.BoxGeometry(0.24 * sc, 0.42 * sc, 0.16 * sc)),
            boarManeMat
          );
          ear.position.set(ex * sc, 1.78 * sc, 1.05 * sc);
          fg.add(ear);
        }
        for (const tx of [-0.36, 0.36]) {
          const tusk = new THREE.Mesh(
            trackGeo(new THREE.ConeGeometry(0.11 * sc, 0.8 * sc, 6)),
            fangMat
          );
          tusk.position.set(tx * sc, 1.2 * sc, 1.76 * sc);
          tusk.rotation.x = 0.52;
          fg.add(tusk);
        }
        fg.add(torso, mane, snout);
      } else if (f.kind === 'panther') {
        const body = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.68 * sc, 0.65 * sc, 1.95 * sc)),
          pantherCoatMat
        );
        body.position.y = 0.82 * sc;
        const head = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.54 * sc, 0.52 * sc, 0.65 * sc)),
          pantherCoatMat
        );
        head.position.set(0, 1.15 * sc, 1.15 * sc);
        for (const ex of [-0.14, 0.14]) {
          const eye = new THREE.Mesh(
            trackGeo(new THREE.SphereGeometry(0.06 * sc, 5, 5)),
            eyeGoldMat
          );
          eye.position.set(ex * sc, 1.24 * sc, 1.48 * sc);
          fg.add(eye);
        }
        const tail = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.06 * sc, 0.09 * sc, 1.35 * sc, 5)),
          pantherCoatMat
        );
        tail.position.set(0, 0.95 * sc, -1.45 * sc);
        tail.rotation.x = -0.95;
        fg.add(body, head, tail);
      } else {
        const sCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.7 * sc, 0.25 * sc, -1.4 * sc),
          new THREE.Vector3(0.75 * sc, 0.25 * sc, -0.3 * sc),
          new THREE.Vector3(-0.3 * sc, 0.55 * sc, 0.7 * sc),
          new THREE.Vector3(0, 1.85 * sc, 1.3 * sc),
        ]);
        const sMesh = new THREE.Mesh(
          trackGeo(new THREE.TubeGeometry(sCurve, 16, 0.26 * sc, 7, false)),
          snakeJungleMat
        );
        const tailTip = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(0.26 * sc, 0.75 * sc, 7)),
          snakeJungleMat
        );
        tailTip.position.set(-0.92 * sc, 0.24 * sc, -1.65 * sc);
        tailTip.rotation.set(-Math.PI * 0.5, 0, -0.55);
        const sHead = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(0.42 * sc, 0.92 * sc, 7)),
          snakeJungleMat
        );
        sHead.rotation.x = Math.PI * 0.48;
        sHead.scale.set(1.15, 1.0, 0.78);
        sHead.position.set(0, 1.9 * sc, 1.56 * sc);
        for (const ex of [-0.18, 0.18]) {
          const eye = new THREE.Mesh(
            trackGeo(new THREE.SphereGeometry(0.065 * sc, 5, 5)),
            eyeGoldMat
          );
          eye.position.set(ex * sc, 2.02 * sc, 1.48 * sc);
          fg.add(eye);
        }
        fg.add(sMesh, tailTip, sHead);
      }

      group.add(fg);
    }
  }

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      // Subtle sliding animation on the massive sea-cave steel gate (stays mostly closed/partially cracked)
      const slideFrac = 0.08 + 0.14 * (0.5 - 0.5 * Math.cos(elapsed * 0.45));
      for (const gate of portDoorPanels) {
        gate.left.position.x = (-4.2 - slideFrac * 5.2) * S;
        gate.right.position.x = (4.2 + slideFrac * 5.2) * S;
      }

      // Gentle breathing bob of Perfume Yuda and twin Yuda sea serpents inside sheltered cave basin
      if (fleetRoot) {
        fleetRoot.rotation.z = Math.sin(elapsed * 1.1) * 0.012;
      }
      yudaSerpents.forEach((serp, idx) => {
        serp.position.y = (0.1 + Math.sin(elapsed * 2.1 + idx * 1.4) * 0.14) * S;
      });

      // Soft bioluminescent pulse on jungle parasite mushrooms
      glowCaps.forEach((mat, idx) => {
        mat.emissiveIntensity = 0.28 + 0.14 * Math.sin(elapsed * 2.4 + idx);
      });
    },
  };
}
