import * as THREE from 'three';
import { valueNoise2D } from '../utils/globeMath';
import {
  SABAODY_BRIDGES,
  SABAODY_GLOBE_SCALE,
  SABAODY_GROVE_CLUSTERS,
  SABAODY_LANDMARKS,
  SABAODY_WORLD_SIZE,
  buildSabaodyBubbles,
  buildSabaodyMangroves,
  sampleSabaodyHeight,
  sabaodyClusterSignedDist,
  toSabaodySphereLocal,
} from '../utils/sabaodyTerrain';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = SABAODY_GLOBE_SCALE;
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

function placeOnSabaodySphere(
  obj: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  globeRadius: number,
  yaw = 0
): void {
  const pos = toSabaodySphereLocal(x, y, z, globeRadius);
  obj.position.set(pos.x, pos.y, pos.z);
  _localNormal.set(pos.x, globeRadius + pos.y, pos.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

function createSabaodyTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = SABAODY_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * SABAODY_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * SABAODY_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const { sd, clusterIndex } = sabaodyClusterSignedDist(x, z);
      const grain = (valueNoise2D(x * 0.65, z * 0.65) - 0.5) * 14;
      const n = valueNoise2D(x * 0.14 + 3.1, z * 0.14 - 2.2);

      let rgb: [number, number, number] = [20, 108, 128];
      let alpha = 1;

      if (sd > 2.2) {
        // Turquoise shallow mangrove lagoon fading smoothly into outer Paradise sea
        const shallowT = 1 - smoothstep(2.2, 22.0, sd);
        rgb = mixRgb([12, 74, 118], [32, 148, 152], shallowT);
        alpha = 1 - smoothstep(14.0, 32.0, sd);
      } else if (sd > -1.8) {
        // Muddy mangrove root bank / sandy shoreline
        const edgeT = smoothstep(-1.8, 2.2, sd);
        rgb = mixRgb([138, 132, 92], [44, 142, 134], edgeT);
      } else {
        const clusterId = SABAODY_GROVE_CLUSTERS[clusterIndex].id;
        if (clusterId === 'groves-30-39') {
          // Bright vibrant green lawn matching image_0def3496.png
          rgb = mixRgb([112, 194, 54], [148, 212, 68], n);
          if (Math.hypot(x - SABAODY_LANDMARKS.parkPlaza.x, z - SABAODY_LANDMARKS.parkPlaza.z) < 9.5) {
            rgb = mixRgb(rgb, [202, 206, 178], 0.55);
          }
        } else if (clusterId === 'groves-40-49') {
          // Warm sandy coastal coating yard + mossy turf
          rgb = mixRgb([154, 152, 102], [116, 174, 68], n);
          if (Math.hypot(x - SABAODY_LANDMARKS.coatingYard.x, z - SABAODY_LANDMARKS.coatingYard.z) < 12.0) {
            rgb = mixRgb(rgb, [176, 156, 118], 0.72);
          }
        } else if (clusterId === 'groves-50-59') {
          // Stone-paved business/law plaza + lush green turf
          rgb = mixRgb([108, 182, 64], [142, 198, 76], n);
          if (Math.hypot(x - SABAODY_LANDMARKS.businessPlaza.x, z - SABAODY_LANDMARKS.businessPlaza.z) < 12.5) {
            rgb = mixRgb([178, 182, 172], [204, 198, 184], n);
          }
        } else if (clusterId === 'groves-60-69') {
          // Darker, moody lawless grove turf & cobble
          rgb = mixRgb([68, 116, 52], [96, 138, 62], n);
          if (
            Math.hypot(x - SABAODY_LANDMARKS.auctionHouse.x, z - SABAODY_LANDMARKS.auctionHouse.z) < 11.5 ||
            Math.hypot(x - SABAODY_LANDMARKS.shakkysBar.x, z - SABAODY_LANDMARKS.shakkysBar.z) < 9.5
          ) {
            rgb = mixRgb(rgb, [126, 134, 96], 0.52);
          }
        } else if (clusterId === 'groves-70-79') {
          // Clean Marine limestone compound + manicured turf
          rgb = mixRgb([106, 172, 74], [142, 186, 98], n);
          if (Math.hypot(x - SABAODY_LANDMARKS.marineFortress.x, z - SABAODY_LANDMARKS.marineFortress.z) < 14.5) {
            rgb = mixRgb([196, 204, 212], [218, 224, 232], n);
          }
        } else {
          // Wild central Yarukiman mangrove forest floor
          rgb = mixRgb([84, 158, 56], [122, 186, 68], n);
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
 * Pale sage-green fluted Yarukiman mangrove bark texture (matching image_0def3496, cb04fd36, e7049d92, fe5dea95).
 */
function createYarukimanBarkTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#97b89c';
    ctx.fillRect(0, 0, 256, 512);
    for (let x = 0; x < 256; x += 14) {
      const shade = 136 + ((x * 23) % 36);
      ctx.fillStyle = `rgb(${shade}, ${Math.min(220, shade + 28)}, ${shade + 8})`;
      ctx.fillRect(x, 0, 10, 512);
      ctx.fillStyle = 'rgba(42, 74, 56, 0.32)';
      ctx.fillRect(x + 10, 0, 4, 512);
    }
    // Subtle moss tint near root base
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0.0, 'rgba(66, 108, 62, 0.14)');
    g.addColorStop(0.75, 'rgba(84, 128, 72, 0.06)');
    g.addColorStop(1.0, 'rgba(44, 88, 42, 0.48)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 512);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Diamond-lattice dome band texture matching the iconic Sabaody domes in image_0def3496 & image_cb04fd36.
 */
function createDomeLatticeTexture(
  baseHex: string,
  bandHex: string,
  lineHex: string
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 256);

    // Lower decorative diamond-lattice collar band
    ctx.fillStyle = bandHex;
    ctx.fillRect(0, 148, 256, 64);

    ctx.strokeStyle = lineHex;
    ctx.lineWidth = 3;
    for (let x = -256; x < 512; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 148);
      ctx.lineTo(x + 64, 212);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + 64, 148);
      ctx.lineTo(x, 212);
      ctx.stroke();
    }

    // Dark border lines & arched attic windows
    ctx.fillStyle = '#2d3b4e';
    ctx.fillRect(0, 146, 256, 5);
    ctx.fillRect(0, 210, 256, 5);
    for (let x = 16; x < 256; x += 32) {
      ctx.beginPath();
      ctx.roundRect(x, 108, 12, 24, [6, 6, 0, 0]);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Creates a crisp weathered wood signboard texture (for HUMAN, SHAKKY'S BAR, and Grove # plaques).
 */
function createWoodenSignTexture(
  lines: string[],
  bgHex = '#c5945c',
  textHex = '#2b190d',
  fontPx = 46,
  showPlanks = true,
  borderHex = '#472a14'
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 512, 256);
    if (showPlanks) {
      // Plank lines
      ctx.fillStyle = 'rgba(42, 22, 10, 0.25)';
      ctx.fillRect(0, 82, 512, 4);
      ctx.fillRect(0, 168, 512, 4);
    }
    ctx.strokeStyle = borderHex;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 246);

    ctx.fillStyle = textHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${fontPx}px Georgia, serif`;
    if (lines.length === 1) {
      ctx.fillText(lines[0], 256, 128);
    } else {
      ctx.fillText(lines[0], 256, 90);
      ctx.font = `800 ${Math.round(fontPx * 0.78)}px Georgia, serif`;
      ctx.fillText(lines[1], 256, 168);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Sabaody Archipelago — Faithful 3D reconstruction of the 79 Yarukiman Mangroves,
 * suspended wooden bridges, drifting iridescent resin bubbles, and all 6 numbered grove sectors:
 * - Groves 30–39 (SE): Sabaody Amusement Park (Ferris wheel, geodesic domes, pastel dome hotels & Bon-Chari)
 * - Groves 40–49 (SW): Maritime Quays & Ship Coating Village (ships wrapped in giant resin bubbles)
 * - Groves 50–59 (Center-East): Business & Law Quarter (wood/brick structures clinging to giant trunks)
 * - Groves 60–69 (W/NW): Lawless Zone, Human Auction House (image_e7049d92) & Shakky's Rip-Off Bar (image_fe5dea95)
 * - Groves 70–79 (North): Marine Forward Military Base & road toward Mary Geoise
 */
export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance | null {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const registerTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;
  const group = new THREE.Group();
  group.name = 'sabaody-archipelago-group';

  const terrainTex = registerTex(createSabaodyTerrainTexture(1024));
  const barkTex = registerTex(createYarukimanBarkTexture());
  const domeGreenGoldTex = registerTex(createDomeLatticeTexture('#71b869', '#e3bd48', '#8a5d1c'));
  const domeBlueGoldTex = registerTex(createDomeLatticeTexture('#82a8d8', '#e5c14d', '#7c551a'));
  const domeYellowRedTex = registerTex(createDomeLatticeTexture('#e8c658', '#c85b52', '#5b1f1a'));
  const humanSignTex = registerTex(createWoodenSignTexture(['HUMAN'], '#cc9c64', '#261409', 84));
  const shakkySignTex = registerTex(
    createWoodenSignTexture(["SHAKKY'S", 'RIP-OFF BAR'], '#bc8850', '#2b160a', 58)
  );
  const marineSignTex = registerTex(
    createWoodenSignTexture(['MARINE', 'GROVE 70–79'], '#eef4fb', '#0e2d52', 44, false, '#143c6e')
  );

  // Shared PBR Materials (varied roughness >= 0.25 between matte stone/earth, timber, painted domes & glossy bubbles)
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.88,
      metalness: 0.02,
      transparent: true,
      alphaTest: 0.04,
    })
  );
  const barkMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: barkTex,
      roughness: 0.86,
      metalness: 0.02,
    })
  );
  const canopyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.02,
    })
  );
  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x9b6e44,
      roughness: 0.78,
      metalness: 0.04,
    })
  );
  const darkWoodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c3e26,
      roughness: 0.84,
      metalness: 0.04,
    })
  );
  const ropeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb99666,
      roughness: 0.9,
      metalness: 0.02,
    })
  );
  const creamWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6e0cf,
      roughness: 0.72,
      metalness: 0.04,
    })
  );
  const paleBlueWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc2d8e6,
      roughness: 0.68,
      metalness: 0.05,
    })
  );
  const brickWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xaa5f4a,
      roughness: 0.82,
      metalness: 0.04,
    })
  );
  const turquoiseTowerMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4ca19c,
      roughness: 0.64,
      metalness: 0.08,
    })
  );
  const slateBlueRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2f4d73,
      roughness: 0.56,
      metalness: 0.14,
    })
  );
  const mossyStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb7b8ab,
      roughness: 0.88,
      metalness: 0.03,
    })
  );
  const mossGreenMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x629642,
      roughness: 0.84,
      metalness: 0.02,
    })
  );
  const terracottaMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xa25d3f,
      roughness: 0.76,
      metalness: 0.04,
    })
  );
  const thatchMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd9be63,
      roughness: 0.92,
      metalness: 0.01,
    })
  );
  const crimsonWindowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x69181f,
      roughness: 0.35,
      metalness: 0.1,
    })
  );
  const darkWindowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x223042,
      roughness: 0.25,
      metalness: 0.18,
    })
  );
  const marineWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xeef3f8,
      roughness: 0.62,
      metalness: 0.08,
    })
  );
  const marineBlueMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1d4e89,
      roughness: 0.54,
      metalness: 0.16,
    })
  );
  const goldAccentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2b74a,
      roughness: 0.32,
      metalness: 0.24,
    })
  );
  const domeGreenMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: domeGreenGoldTex,
      roughness: 0.42,
      metalness: 0.12,
    })
  );
  const domeBlueMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: domeBlueGoldTex,
      roughness: 0.42,
      metalness: 0.12,
    })
  );
  const domeYellowMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: domeYellowRedTex,
      roughness: 0.42,
      metalness: 0.12,
    })
  );
  const bubbleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc2f2ff,
      emissive: 0x3b6f8a,
      emissiveIntensity: 0.22,
      roughness: 0.08,
      metalness: 0.15,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    })
  );
  const coatingBubbleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd9f7ff,
      emissive: 0x4ca3c4,
      emissiveIntensity: 0.26,
      roughness: 0.06,
      metalness: 0.18,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    })
  );

  // ---------------------------------------------------------------------------
  // 1. CONTINUOUS SCULPTED MANGROVE ARCHIPELAGO TERRAIN & LAGOON MESH
  // ---------------------------------------------------------------------------
  const segs = 152;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(SABAODY_WORLD_SIZE, SABAODY_WORLD_SIZE, segs, segs)
  );
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const ly = sampleSabaodyHeight(lx, lz);
    const sp = toSabaodySphereLocal(lx, ly, lz, globeRadius);
    posAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // ---------------------------------------------------------------------------
  // 2. ALL 79 YARUKIMAN MANGROVE TREES (Instanced Trunks, Arching Roots & Canopies)
  // ---------------------------------------------------------------------------
  const mangroves = buildSabaodyMangroves();
  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.62, 1.0, 1.0, 12, 1));
  trunkGeo.translate(0, 0.5, 0);
  const trunkInst = new THREE.InstancedMesh(trunkGeo, barkMat, mangroves.length);
  trunkInst.castShadow = true;
  trunkInst.receiveShadow = true;

  // Splayed buttress roots (4 arching roots per mangrove = 316 instanced roots)
  const rootGeo = trackGeo(new THREE.CylinderGeometry(0.28, 0.55, 1.0, 8, 1));
  rootGeo.translate(0, 0.5, 0);
  const rootsPerTree = 4;
  const rootInst = new THREE.InstancedMesh(
    rootGeo,
    barkMat,
    mangroves.length * rootsPerTree
  );

  // Layered organic mangrove canopy puffs (5 puffs per mangrove = 395 instanced puffs)
  const canopyGeo = trackGeo(new THREE.IcosahedronGeometry(1.0, 1));
  const puffsPerTree = 5;
  const canopyInst = new THREE.InstancedMesh(
    canopyGeo,
    canopyMat,
    mangroves.length * puffsPerTree
  );

  let rootIdx = 0;
  let puffIdx = 0;
  for (let i = 0; i < mangroves.length; i++) {
    const m = mangroves[i];
    const sp = toSabaodySphereLocal(m.x, m.y, m.z, globeRadius);
    _localNormal.set(sp.x, globeRadius + sp.y, sp.z).normalize();
    _tiltQuat.setFromUnitVectors(_up, _localNormal);
    _yawQuat.setFromAxisAngle(_yAxis, m.yaw);

    _dummy.position.set(sp.x, sp.y, sp.z);
    _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
    _dummy.scale.set(m.trunkRadius * S, m.trunkHeight * S, m.trunkRadius * S);
    _dummy.updateMatrix();
    trunkInst.setMatrixAt(i, _dummy.matrix);

    // 4 splayed buttress roots gripping the ground
    for (let r = 0; r < rootsPerTree; r++) {
      const rAng = m.yaw + (r / rootsPerTree) * Math.PI * 2 + 0.35;
      const rx = m.x + Math.cos(rAng) * m.trunkRadius * 1.35;
      const rz = m.z + Math.sin(rAng) * m.trunkRadius * 1.35;
      const rsp = toSabaodySphereLocal(rx, m.y - 0.5, rz, globeRadius);
      _dummy.position.set(rsp.x, rsp.y, rsp.z);
      _dummy.quaternion.copy(_tiltQuat);
      _dummy.rotateY(-rAng);
      _dummy.rotateZ(0.55);
      _dummy.scale.set(m.trunkRadius * 0.45 * S, m.trunkRadius * 3.4 * S, m.trunkRadius * 0.45 * S);
      _dummy.updateMatrix();
      rootInst.setMatrixAt(rootIdx++, _dummy.matrix);
    }

    // 5 lush sculpted green foliage canopy crowns at the top of the mangrove
    for (let p = 0; p < puffsPerTree; p++) {
      const pAng = m.yaw + p * 1.57 + 0.3;
      const pOff = p === 0 ? 0 : m.canopyRadius * (p === 4 ? 0.22 : 0.46);
      const px = m.x + Math.cos(pAng) * pOff;
      const pz = m.z + Math.sin(pAng) * pOff;
      const py = m.y + m.trunkHeight * (p === 0 ? 1.02 : p === 4 ? 1.08 : 0.91);
      const psp = toSabaodySphereLocal(px, py, pz, globeRadius);
      const pr = m.canopyRadius * (p === 0 ? 0.95 : p === 4 ? 0.65 : 0.72);

      _dummy.position.set(psp.x, psp.y, psp.z);
      _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
      _dummy.rotateY(p * 0.9);
      _dummy.scale.set(pr * S, pr * (p === 4 ? 0.68 : 0.48) * S, pr * 0.92 * S);
      _dummy.updateMatrix();
      canopyInst.setMatrixAt(puffIdx, _dummy.matrix);

      const shade = 0.82 + ((i * 13 + p * 7) % 34) * 0.01;
      const tintG = p === 4 ? 0.66 : 0.54;
      _tmpColor.setRGB(0.24 * shade, tintG * shade, 0.25 * shade);
      canopyInst.setColorAt(puffIdx, _tmpColor);
      puffIdx++;
    }
  }
  trunkInst.instanceMatrix.needsUpdate = true;
  rootInst.instanceMatrix.needsUpdate = true;
  canopyInst.instanceMatrix.needsUpdate = true;
  if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  rootInst.computeBoundingSphere();
  canopyInst.computeBoundingSphere();
  group.add(trunkInst, rootInst, canopyInst);

  // Sculpted Aerial Mangrove Root Arches bridging overhead between plazas (image_cb04fd36)
  const aerialArchSpecs = [
    { x: 24.5, z: -2.0, radius: 13.5, yaw: 0.45 },
    { x: 35.5, z: 32.0, radius: 15.0, yaw: -0.35 },
    { x: -42.5, z: -18.5, radius: 14.0, yaw: 0.25 },
  ];
  for (const arch of aerialArchSpecs) {
    const archGeo = trackGeo(
      new THREE.TorusGeometry(arch.radius * S, 0.85 * S, 8, 22, Math.PI)
    );
    const archMesh = new THREE.Mesh(archGeo, barkMat);
    const ay = sampleSabaodyHeight(arch.x, arch.z);
    placeOnSabaodySphere(archMesh, arch.x, ay - 0.5, arch.z, globeRadius, arch.yaw);
    group.add(archMesh);
  }

  // Carved Wooden Grove Number Plaques on representative hero mangrove trunks across all zones
  const plaqueNumbers = [13, 33, 42, 52, 64, 74];
  const plaqueGeo = trackGeo(new THREE.BoxGeometry(2.6 * S, 1.3 * S, 0.28 * S));
  for (const num of plaqueNumbers) {
    const m = mangroves.find((mg) => mg.groveNumber === num);
    if (!m) continue;
    const plaqueTex = registerTex(
      createWoodenSignTexture([`GROVE ${num}`], '#c7955a', '#241308', 72)
    );
    const plaqueMat = trackMat(
      new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.75, metalness: 0.04 })
    );
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    placeOnSabaodySphere(
      plaque,
      m.x,
      m.y + 4.4,
      m.z + m.trunkRadius * 0.96,
      globeRadius,
      0
    );
    group.add(plaque);
  }

  // ---------------------------------------------------------------------------
  // 3. SUSPENDED WOODEN BRIDGES & PORT PIERS
  // ---------------------------------------------------------------------------
  const bridgePylonGeo = trackGeo(new THREE.CylinderGeometry(0.26 * S, 0.34 * S, 4.8 * S, 8));
  bridgePylonGeo.translate(0, 2.4 * S, 0);
  const bridgePlankGeo = trackGeo(new THREE.BoxGeometry(1.0, 0.26 * S, 1.0));

  for (const b of SABAODY_BRIDGES) {
    const dx = b.bx - b.ax;
    const dz = b.bz - b.az;
    const spanLen = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);
    const steps = Math.max(6, Math.ceil(spanLen / 2.4));

    // Twin timber suspension pylons at both ends
    for (const endT of [0.04, 0.96]) {
      const ex = b.ax + dx * endT;
      const ez = b.az + dz * endT;
      for (const side of [-1, 1]) {
        const px = ex + Math.cos(yaw) * side * b.width * 0.52;
        const pz = ez - Math.sin(yaw) * side * b.width * 0.52;
        const pylon = new THREE.Mesh(bridgePylonGeo, darkWoodMat);
        placeOnSabaodySphere(pylon, px, b.deckY - 1.2, pz, globeRadius, yaw);
        group.add(pylon);
      }
    }

    // Arched plank segments + catenary handrail cables
    for (let s = 0; s < steps; s++) {
      const t = (s + 0.5) / steps;
      const px = b.ax + dx * t;
      const pz = b.az + dz * t;
      const py = b.deckY + Math.sin(t * Math.PI) * b.archHeight;

      const plank = new THREE.Mesh(bridgePlankGeo, woodMat);
      plank.scale.set(b.width * S, 1, (spanLen / steps) * 1.06 * S);
      placeOnSabaodySphere(plank, px, py, pz, globeRadius, yaw);
      group.add(plank);

      for (const side of [-1, 1]) {
        const rx = px + Math.cos(yaw) * side * b.width * 0.48;
        const rz = pz - Math.sin(yaw) * side * b.width * 0.48;
        const rail = new THREE.Mesh(bridgePlankGeo, ropeMat);
        rail.scale.set(0.16 * S, 0.45, (spanLen / steps) * 1.06 * S);
        placeOnSabaodySphere(rail, rx, py + 1.05, rz, globeRadius, yaw);
        group.add(rail);
      }
    }
  }

  // Coating Port Wooden Quays (Groves 40-49) & Marine Pier (Groves 70-79)
  const pierDeckGeo = trackGeo(new THREE.BoxGeometry(1, 0.45 * S, 1));
  const pierPilingGeo = trackGeo(new THREE.CylinderGeometry(0.24 * S, 0.28 * S, 4.2 * S, 8));
  pierPilingGeo.translate(0, 2.1 * S, 0);
  const harborPiers = [
    { x: -42.0, z: 62.0, w: 4.8, l: 24.0, y: 2.3 },
    { x: -34.0, z: 60.0, w: 5.6, l: 24.0, y: 2.3 },
    { x: -26.0, z: 63.0, w: 5.2, l: 26.0, y: 2.3 },
    { x: -34.0, z: 60.0, w: 24.0, l: 4.8, y: 2.3 },
    { x: 4.0, z: -76.0, w: 5.8, l: 22.0, y: 2.5 },
  ];
  for (const p of harborPiers) {
    const deck = new THREE.Mesh(pierDeckGeo, woodMat);
    deck.scale.set(p.w * S, 1, p.l * S);
    placeOnSabaodySphere(deck, p.x, p.y - 0.15, p.z, globeRadius, 0);
    group.add(deck);

    for (const sx of [-0.42, 0.42]) {
      for (const sz of [-0.38, 0, 0.38]) {
        const pile = new THREE.Mesh(pierPilingGeo, darkWoodMat);
        placeOnSabaodySphere(pile, p.x + sx * p.w, p.y - 2.6, p.z + sz * p.l, globeRadius, 0);
        group.add(pile);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helper: Iconic Sabaody Domed Building (image_0def3496 & image_cb04fd36)
  // ---------------------------------------------------------------------------
  const buildSabaodyDomedBuilding = (
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    wallMat: THREE.Material,
    domeMat: THREE.Material,
    yaw = 0,
    doubleDome = false
  ) => {
    const bGroup = new THREE.Group();
    const groundY = sampleSabaodyHeight(x, z);

    // Main masonry/timber tower body
    const bodyGeo = trackGeo(new THREE.BoxGeometry(w * S, h * S, d * S));
    bodyGeo.translate(0, (h * 0.5) * S, 0);
    const body = new THREE.Mesh(bodyGeo, wallMat);
    body.castShadow = true;
    body.receiveShadow = true;
    bGroup.add(body);

    // Upper stepped stone cornice
    const corniceGeo = trackGeo(new THREE.BoxGeometry(w * 1.08 * S, 0.55 * S, d * 1.08 * S));
    corniceGeo.translate(0, (h + 0.25) * S, 0);
    bGroup.add(new THREE.Mesh(corniceGeo, creamWallMat));

    // Arched windows on front & back facades
    const winGeo = trackGeo(new THREE.BoxGeometry(0.65 * S, 1.35 * S, 0.14 * S));
    const cols = Math.max(2, Math.floor(w / 1.8));
    const rows = Math.max(1, Math.floor(h / 3.2));
    for (let r = 0; r < rows; r++) {
      const wy = (1.6 + r * 2.8) * S;
      for (let c = 0; c < cols; c++) {
        const wx = ((c + 0.5) / cols - 0.5) * w * 0.72 * S;
        const wf = new THREE.Mesh(winGeo, darkWindowMat);
        wf.position.set(wx, wy, (d * 0.5 + 0.03) * S);
        bGroup.add(wf);
        const wb = new THREE.Mesh(winGeo, darkWindowMat);
        wb.position.set(wx, wy, (-d * 0.5 - 0.03) * S);
        bGroup.add(wb);
      }
    }

    // Neck drum + iconic bulbous patterned dome + conical finial
    const domeR = Math.min(w, d) * 0.48;
    const drumGeo = trackGeo(new THREE.CylinderGeometry(domeR * 0.52 * S, domeR * 0.6 * S, 1.3 * S, 12));
    drumGeo.translate(0, (h + 1.1) * S, 0);
    bGroup.add(new THREE.Mesh(drumGeo, creamWallMat));

    const domeGeo = trackGeo(new THREE.SphereGeometry(domeR * S, 16, 12));
    domeGeo.scale(1, 0.92, 1);
    domeGeo.translate(0, (h + 1.7 + domeR * 0.8) * S, 0);
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.castShadow = true;
    bGroup.add(dome);

    let topY = h + 1.7 + domeR * 1.68;
    if (doubleDome) {
      const neck2Geo = trackGeo(new THREE.CylinderGeometry(domeR * 0.34 * S, domeR * 0.42 * S, 1.4 * S, 10));
      neck2Geo.translate(0, (topY + 0.5) * S, 0);
      bGroup.add(new THREE.Mesh(neck2Geo, creamWallMat));

      const dome2Geo = trackGeo(new THREE.SphereGeometry(domeR * 0.72 * S, 14, 10));
      dome2Geo.translate(0, (topY + 1.4 + domeR * 0.52) * S, 0);
      bGroup.add(new THREE.Mesh(dome2Geo, domeYellowMat));
      topY += 1.4 + domeR * 1.15;
    }

    const spireGeo = trackGeo(new THREE.ConeGeometry(domeR * 0.22 * S, 1.45 * S, 8));
    spireGeo.translate(0, (topY + 0.65) * S, 0);
    bGroup.add(new THREE.Mesh(spireGeo, slateBlueRoofMat));

    placeOnSabaodySphere(bGroup, x, groundY - 0.15, z, globeRadius, yaw);
    group.add(bGroup);
  };

  // ---------------------------------------------------------------------------
  // 4. GROVES 30–39 (SE): SABAODY PARK FERRIS WHEEL, GEODESIC DOMES, HOTELS & BON-CHARI
  // ---------------------------------------------------------------------------
  // 4A. Iconic Sabaody Park Ferris Wheel at (47.5, 33.0)
  const ferrisGroup = new THREE.Group();
  const fwGroundY = sampleSabaodyHeight(
    SABAODY_LANDMARKS.ferrisWheel.x,
    SABAODY_LANDMARKS.ferrisWheel.z
  );
  const wheelCenterY = 14.8;
  const wheelRadius = 11.4;

  // Stone base plinth + A-frame support legs terminating cleanly inside the central hub
  const fwBaseGeo = trackGeo(new THREE.BoxGeometry(15.5 * S, 0.9 * S, 7.2 * S));
  fwBaseGeo.translate(0, 0.45 * S, 0);
  ferrisGroup.add(new THREE.Mesh(fwBaseGeo, creamWallMat));

  const legFootX = 6.2;
  const legLen = Math.hypot(legFootX, wheelCenterY - 0.5);
  const legTilt = Math.atan2(legFootX, wheelCenterY - 0.5);
  const legGeo = trackGeo(new THREE.CylinderGeometry(0.28 * S, 0.44 * S, legLen * S, 8));
  for (const sideZ of [-2.1, 2.1]) {
    for (const dir of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, marineWhiteMat);
      leg.position.set(dir * legFootX * 0.5 * S, (0.5 + (wheelCenterY - 0.5) * 0.5) * S, sideZ * S);
      leg.rotation.z = dir * legTilt;
      ferrisGroup.add(leg);
    }
  }
  const axleGeo = trackGeo(new THREE.CylinderGeometry(0.85 * S, 0.85 * S, 5.2 * S, 12));
  axleGeo.rotateX(Math.PI / 2);
  axleGeo.translate(0, wheelCenterY * S, 0);
  ferrisGroup.add(new THREE.Mesh(axleGeo, goldAccentMat));

  // Rotating wheel assembly with inner/outer rims & hanging gondola carriages
  const ferrisWheelSpinner = new THREE.Group();
  ferrisWheelSpinner.position.set(0, wheelCenterY * S, 0);
  const rimGeo = trackGeo(new THREE.TorusGeometry(wheelRadius * S, 0.28 * S, 8, 32));
  const innerRimGeo = trackGeo(new THREE.TorusGeometry(wheelRadius * 0.72 * S, 0.16 * S, 6, 28));
  for (const offsetZ of [-1.2 * S, 1.2 * S]) {
    const rim = new THREE.Mesh(rimGeo, goldAccentMat);
    rim.position.z = offsetZ;
    const innerRim = new THREE.Mesh(innerRimGeo, marineWhiteMat);
    innerRim.position.z = offsetZ;
    ferrisWheelSpinner.add(rim, innerRim);
  }
  const spokeGeo = trackGeo(new THREE.CylinderGeometry(0.1 * S, 0.1 * S, wheelRadius * 2 * S, 6));
  const cabinBoxGeo = trackGeo(new THREE.BoxGeometry(1.55 * S, 1.35 * S, 1.55 * S));
  const cabinRoofGeo = trackGeo(new THREE.ConeGeometry(1.25 * S, 0.8 * S, 4));
  cabinRoofGeo.rotateY(Math.PI / 4);
  const cabinHangerGeo = trackGeo(new THREE.CylinderGeometry(0.08 * S, 0.08 * S, 1.15 * S, 6));
  const cabinColors = [0xe85b6c, 0x52b6e8, 0xf2c94c, 0x6fcf97, 0xbb6bd9, 0xf2994a];
  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.Mesh(spokeGeo, marineWhiteMat);
    spoke.rotation.z = (i / 6) * Math.PI;
    ferrisWheelSpinner.add(spoke);
  }
  const gondolas: THREE.Group[] = [];
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const cabinMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: cabinColors[i % cabinColors.length],
        roughness: 0.35,
        metalness: 0.15,
      })
    );
    const gondola = new THREE.Group();
    gondola.position.set(Math.cos(ang) * wheelRadius * S, Math.sin(ang) * wheelRadius * S, 0);
    const hanger = new THREE.Mesh(cabinHangerGeo, goldAccentMat);
    hanger.position.y = -0.55 * S;
    const cabBody = new THREE.Mesh(cabinBoxGeo, cabinMat);
    cabBody.position.y = -1.55 * S;
    const cabRoof = new THREE.Mesh(cabinRoofGeo, marineWhiteMat);
    cabRoof.position.y = -0.75 * S;
    gondola.add(hanger, cabBody, cabRoof);
    ferrisWheelSpinner.add(gondola);
    gondolas.push(gondola);
  }
  ferrisGroup.add(ferrisWheelSpinner);
  placeOnSabaodySphere(
    ferrisGroup,
    SABAODY_LANDMARKS.ferrisWheel.x,
    fwGroundY - 0.1,
    SABAODY_LANDMARKS.ferrisWheel.z,
    globeRadius,
    -0.55
  );
  group.add(ferrisGroup);

  // 4B. Geodesic Dome Pavilion in Sabaody Park (25.5, 27.5)
  const geoPavilion = new THREE.Group();
  const gpY = sampleSabaodyHeight(
    SABAODY_LANDMARKS.geodesicPavilion.x,
    SABAODY_LANDMARKS.geodesicPavilion.z
  );
  const gpBaseGeo = trackGeo(new THREE.CylinderGeometry(6.8 * S, 7.2 * S, 1.4 * S, 16));
  gpBaseGeo.translate(0, 0.7 * S, 0);
  geoPavilion.add(new THREE.Mesh(gpBaseGeo, creamWallMat));
  const gpDomeGeo = trackGeo(new THREE.IcosahedronGeometry(6.2 * S, 1));
  const gpWireMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6f2ff,
      wireframe: true,
      roughness: 0.3,
      metalness: 0.25,
    })
  );
  const gpGlassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x99e2ff,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  const gpWire = new THREE.Mesh(gpDomeGeo, gpWireMat);
  gpWire.position.y = 1.4 * S;
  const gpGlass = new THREE.Mesh(gpDomeGeo, gpGlassMat);
  gpGlass.position.y = 1.4 * S;
  geoPavilion.add(gpGlass, gpWire);
  placeOnSabaodySphere(
    geoPavilion,
    SABAODY_LANDMARKS.geodesicPavilion.x,
    gpY - 0.1,
    SABAODY_LANDMARKS.geodesicPavilion.z,
    globeRadius,
    0
  );
  group.add(geoPavilion);

  // 4C. Pastel Dome-Topped Hotels, Restaurants & Shops around Sabaody Park (matching image_0def3496.png)
  buildSabaodyDomedBuilding(38.5, 22.0, 5.2, 8.2, 4.8, paleBlueWallMat, domeBlueMat, 0.2, true);
  buildSabaodyDomedBuilding(30.5, 21.5, 4.6, 6.8, 4.4, creamWallMat, domeYellowMat, 0.1, false);
  buildSabaodyDomedBuilding(46.0, 20.5, 4.8, 7.4, 4.6, paleBlueWallMat, domeGreenMat, -0.2, false);
  buildSabaodyDomedBuilding(52.5, 43.0, 5.0, 7.2, 4.6, creamWallMat, domeYellowMat, -0.6, false);
  buildSabaodyDomedBuilding(34.5, 48.0, 4.6, 6.2, 4.2, paleBlueWallMat, domeBlueMat, 0.4, false);
  buildSabaodyDomedBuilding(22.5, 39.5, 4.4, 6.0, 4.0, creamWallMat, domeGreenMat, 0.5, false);

  // Bon-Chari Bubble Scooters parked on the Sabaody Park green lawn (image_0def3496)
  const bonChariCoords: [number, number, number][] = [
    [30.5, 38.5, 0.6],
    [33.0, 40.5, -0.4],
    [36.5, 39.0, 1.1],
  ];
  const bcWheelGeo = trackGeo(new THREE.CylinderGeometry(0.42 * S, 0.42 * S, 0.24 * S, 10));
  bcWheelGeo.rotateZ(Math.PI / 2);
  const bcBubbleGeo = trackGeo(new THREE.SphereGeometry(0.95 * S, 12, 10));
  for (const [bx, bz, byaw] of bonChariCoords) {
    const bc = new THREE.Group();
    const bgy = sampleSabaodyHeight(bx, bz);
    const wheel = new THREE.Mesh(bcWheelGeo, goldAccentMat);
    wheel.position.set(0, 0.45 * S, -0.55 * S);
    const seat = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.55 * S, 0.4 * S, 0.9 * S)),
      darkWoodMat
    );
    seat.position.set(0, 0.72 * S, 0);
    const bub = new THREE.Mesh(bcBubbleGeo, bubbleMat);
    bub.position.set(0, 1.15 * S, 0.2 * S);
    bc.add(wheel, seat, bub);
    placeOnSabaodySphere(bc, bx, bgy, bz, globeRadius, byaw);
    group.add(bc);
  }

  // ---------------------------------------------------------------------------
  // 5. GROVES 40–49 (SW): MARITIME HARBOR & COATING CRAFTSMEN VILLAGE
  // ---------------------------------------------------------------------------
  // Coating Workshop Huts + Resin Vats at (-34.5, 36.5)
  buildSabaodyDomedBuilding(-39.5, 34.5, 5.0, 5.6, 4.4, creamWallMat, domeGreenMat, 0.15, false);
  buildSabaodyDomedBuilding(-28.5, 35.5, 4.6, 5.2, 4.2, paleBlueWallMat, domeYellowMat, -0.25, false);
  buildSabaodyDomedBuilding(-44.0, 43.0, 4.4, 5.0, 4.0, brickWallMat, domeBlueMat, 0.4, false);

  // Resin Coating Vats with Iron Hoops & Glowing Turquoise Resin inside
  const vatGeo = trackGeo(new THREE.CylinderGeometry(1.25 * S, 1.35 * S, 1.5 * S, 14));
  vatGeo.translate(0, 0.75 * S, 0);
  const vatHoopGeo = trackGeo(new THREE.TorusGeometry(1.32 * S, 0.08 * S, 6, 16));
  vatHoopGeo.rotateX(Math.PI / 2);
  const vatResinGeo = trackGeo(new THREE.CylinderGeometry(1.12 * S, 1.12 * S, 0.12 * S, 14));
  vatResinGeo.translate(0, 1.44 * S, 0);
  for (const [vx, vz] of [
    [-37.0, 42.5],
    [-31.0, 42.5],
    [-35.0, 52.0],
  ]) {
    const vy = sampleSabaodyHeight(vx, vz);
    const vatGroup = new THREE.Group();
    vatGroup.add(new THREE.Mesh(vatGeo, woodMat));
    vatGroup.add(new THREE.Mesh(vatResinGeo, bubbleMat));
    for (const hy of [0.35, 1.15]) {
      const hoop = new THREE.Mesh(vatHoopGeo, darkWoodMat);
      hoop.position.y = hy * S;
      vatGroup.add(hoop);
    }
    placeOnSabaodySphere(vatGroup, vx, vy, vz, globeRadius, 0);
    group.add(vatGroup);
  }

  // Sculpted Pirate Caravels & Warships with Tapered Hulls, Quarterdecks, Masts & Coating Bubbles
  const buildCoatedShip = (sx: number, sz: number, yaw: number, coated: boolean, isMarine = false) => {
    const ship = new THREE.Group();
    const hullMat = isMarine ? marineWhiteMat : woodMat;
    const deckMat = darkWoodMat;

    // Tapered central hull + raised aft quarterdeck + sculpted prow + bowsprit
    const mainHullGeo = trackGeo(new THREE.CylinderGeometry(1.45 * S, 1.05 * S, 7.2 * S, 8));
    mainHullGeo.rotateX(Math.PI / 2);
    mainHullGeo.scale(1.15, 0.78, 1.0);
    mainHullGeo.translate(0, 0.72 * S, 0);
    ship.add(new THREE.Mesh(mainHullGeo, hullMat));

    const deckPlankGeo = trackGeo(new THREE.BoxGeometry(2.45 * S, 0.25 * S, 6.4 * S));
    deckPlankGeo.translate(0, 1.32 * S, -0.1 * S);
    ship.add(new THREE.Mesh(deckPlankGeo, deckMat));

    const quarterGeo = trackGeo(new THREE.BoxGeometry(2.55 * S, 1.15 * S, 2.3 * S));
    quarterGeo.translate(0, 1.85 * S, -2.2 * S);
    ship.add(new THREE.Mesh(quarterGeo, hullMat));

    const prowGeo = trackGeo(new THREE.ConeGeometry(1.4 * S, 2.9 * S, 6));
    prowGeo.rotateX(Math.PI / 2);
    prowGeo.scale(0.85, 0.78, 1.0);
    prowGeo.translate(0, 0.92 * S, 4.75 * S);
    ship.add(new THREE.Mesh(prowGeo, deckMat));

    const bowspritGeo = trackGeo(new THREE.CylinderGeometry(0.08 * S, 0.14 * S, 3.2 * S, 6));
    bowspritGeo.rotateX(Math.PI * 0.38);
    bowspritGeo.translate(0, 1.95 * S, 5.8 * S);
    ship.add(new THREE.Mesh(bowspritGeo, deckMat));

    // Twin masts + yardarms + billowing sails
    for (const [mz, mh, sw, sy] of [
      [0.6, 7.4, 3.8, 5.1],
      [-2.0, 5.6, 2.8, 4.1],
    ]) {
      const mastGeo = trackGeo(new THREE.CylinderGeometry(0.14 * S, 0.22 * S, mh * S, 8));
      mastGeo.translate(0, (1.2 + mh * 0.5) * S, mz * S);
      ship.add(new THREE.Mesh(mastGeo, deckMat));

      const yardGeo = trackGeo(new THREE.CylinderGeometry(0.09 * S, 0.09 * S, (sw + 0.6) * S, 6));
      yardGeo.rotateZ(Math.PI / 2);
      yardGeo.translate(0, (sy + 1.45) * S, (mz + 0.18) * S);
      ship.add(new THREE.Mesh(yardGeo, deckMat));

      const sailGeo = trackGeo(new THREE.CylinderGeometry(sw * 0.52 * S, sw * 0.58 * S, 2.9 * S, 8, 1, true, -0.7, 1.4));
      sailGeo.translate(0, sy * S, (mz - 0.45) * S);
      const sailMat = isMarine ? marineBlueMat : marineWhiteMat;
      ship.add(new THREE.Mesh(sailGeo, sailMat));
    }

    if (coated) {
      const coatGeo = trackGeo(new THREE.SphereGeometry(6.0 * S, 20, 14));
      coatGeo.translate(0, 3.2 * S, 0.4 * S);
      ship.add(new THREE.Mesh(coatGeo, coatingBubbleMat));
    }
    placeOnSabaodySphere(ship, sx, 0.0, sz, globeRadius, yaw);
    group.add(ship);
  };
  buildCoatedShip(-38.5, 68.5, 0.25, true);
  buildCoatedShip(-21.5, 66.0, -0.35, true);
  buildCoatedShip(-49.5, 64.0, 0.55, false);

  // ---------------------------------------------------------------------------
  // 6. GROVES 50–59 (CENTER-EAST): BUSINESS & LAW QUARTER (image_cb04fd36)
  // ---------------------------------------------------------------------------
  // Multi-story wood-and-brick / cream stone guild towers with double geodesic domes & turquoise minarets
  buildSabaodyDomedBuilding(25.5, -11.5, 6.2, 10.2, 5.6, creamWallMat, domeGreenMat, 0.0, true);
  buildSabaodyDomedBuilding(34.0, -7.5, 5.2, 8.6, 5.0, brickWallMat, domeYellowMat, -0.4, false);
  buildSabaodyDomedBuilding(18.0, -10.5, 4.8, 7.8, 4.6, paleBlueWallMat, domeGreenMat, 0.35, false);
  buildSabaodyDomedBuilding(33.5, 3.0, 5.0, 7.6, 4.8, creamWallMat, domeBlueMat, -0.2, false);

  // Tall turquoise minaret spires flanking Business/Law plaza (matching image_cb04fd36)
  const buildTurquoiseMinaret = (mx: number, mz: number, height: number) => {
    const minGroup = new THREE.Group();
    const my = sampleSabaodyHeight(mx, mz);
    const shaftGeo = trackGeo(new THREE.CylinderGeometry(0.85 * S, 1.15 * S, height * S, 10));
    shaftGeo.translate(0, height * 0.5 * S, 0);
    minGroup.add(new THREE.Mesh(shaftGeo, turquoiseTowerMat));

    const balconyGeo = trackGeo(new THREE.CylinderGeometry(1.32 * S, 1.12 * S, 1.35 * S, 10));
    balconyGeo.translate(0, height * 0.62 * S, 0);
    minGroup.add(new THREE.Mesh(balconyGeo, turquoiseTowerMat));

    const capGeo = trackGeo(new THREE.ConeGeometry(1.0 * S, 2.8 * S, 10));
    capGeo.translate(0, (height + 1.35) * S, 0);
    minGroup.add(new THREE.Mesh(capGeo, slateBlueRoofMat));

    placeOnSabaodySphere(minGroup, mx, my - 0.15, mz, globeRadius, 0);
    group.add(minGroup);
  };
  buildTurquoiseMinaret(21.0, -14.5, 16.5);
  buildTurquoiseMinaret(30.5, -14.5, 18.0);

  // ---------------------------------------------------------------------------
  // 7. GROVES 60–69 (W/NW): HUMAN AUCTION HOUSE (image_e7049d92) & SHAKKY'S BAR (image_fe5dea95)
  // ---------------------------------------------------------------------------
  // 7A. Human Auction House at (-49.0, -26.5) — Faithful to image_e7049d92.png!
  const auctionGroup = new THREE.Group();
  const ahY = sampleSabaodyHeight(
    SABAODY_LANDMARKS.auctionHouse.x,
    SABAODY_LANDMARKS.auctionHouse.z
  );

  // Main circular turquoise/slate drum body
  const ahBodyGeo = trackGeo(new THREE.CylinderGeometry(6.8 * S, 7.2 * S, 5.2 * S, 18));
  ahBodyGeo.translate(0, 2.6 * S, 0);
  auctionGroup.add(new THREE.Mesh(ahBodyGeo, turquoiseTowerMat));

  // Flanking domed bay alcoves on left & right sides (matching image_e7049d92)
  const alcoveGeo = trackGeo(new THREE.CylinderGeometry(1.45 * S, 1.35 * S, 2.8 * S, 10));
  const alcoveCapGeo = trackGeo(new THREE.SphereGeometry(1.5 * S, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55));
  for (const [ax, az] of [
    [-7.1, 1.2],
    [-6.0, 3.6],
    [7.1, 1.2],
    [6.0, 3.6],
  ]) {
    const alc = new THREE.Mesh(alcoveGeo, turquoiseTowerMat);
    alc.position.set(ax * S, 2.4 * S, az * S);
    const cap = new THREE.Mesh(alcoveCapGeo, terracottaMat);
    cap.position.set(ax * S, 3.8 * S, az * S);
    auctionGroup.add(alc, cap);
  }

  // Mossy terracotta-tiled dome roof
  const ahDomeGeo = trackGeo(new THREE.SphereGeometry(7.1 * S, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52));
  ahDomeGeo.scale(1, 0.72, 1);
  ahDomeGeo.translate(0, 5.0 * S, 0);
  auctionGroup.add(new THREE.Mesh(ahDomeGeo, mossGreenMat));

  // Triangular thatched straw gable dormer crowning the front roof
  const gableGeo = trackGeo(new THREE.ConeGeometry(4.6 * S, 3.2 * S, 4));
  gableGeo.rotateY(Math.PI / 4);
  gableGeo.scale(1.15, 0.85, 0.9);
  gableGeo.translate(0, 8.8 * S, 1.2 * S);
  auctionGroup.add(new THREE.Mesh(gableGeo, thatchMat));

  // White arched portico with sculpted semicircular arches, paired columns, crimson slit windows & double doors
  const porticoGeo = trackGeo(new THREE.BoxGeometry(7.2 * S, 4.6 * S, 2.6 * S));
  porticoGeo.translate(0, 2.3 * S, 6.2 * S);
  auctionGroup.add(new THREE.Mesh(porticoGeo, creamWallMat));

  const porticoCorniceGeo = trackGeo(new THREE.BoxGeometry(7.7 * S, 0.42 * S, 3.0 * S));
  porticoCorniceGeo.translate(0, 4.7 * S, 6.2 * S);
  auctionGroup.add(new THREE.Mesh(porticoCorniceGeo, creamWallMat));

  // Stone entry staircase at base of portico
  const ahStepGeo = trackGeo(new THREE.BoxGeometry(4.2 * S, 0.45 * S, 1.4 * S));
  ahStepGeo.translate(0, 0.22 * S, 7.8 * S);
  auctionGroup.add(new THREE.Mesh(ahStepGeo, mossyStoneMat));

  // Arched recessed bays + slender columns
  const colGeo = trackGeo(new THREE.CylinderGeometry(0.18 * S, 0.22 * S, 4.4 * S, 8));
  for (let cx = -3.1; cx <= 3.15; cx += 1.24) {
    const col = new THREE.Mesh(colGeo, creamWallMat);
    col.position.set(cx * S, 2.2 * S, 7.56 * S);
    auctionGroup.add(col);
  }

  const doorGeo = trackGeo(new THREE.BoxGeometry(2.1 * S, 2.5 * S, 0.25 * S));
  doorGeo.translate(0, 1.25 * S, 7.52 * S);
  auctionGroup.add(new THREE.Mesh(doorGeo, darkWoodMat));

  const slitGeo = trackGeo(new THREE.BoxGeometry(0.45 * S, 1.35 * S, 0.18 * S));
  for (let s = -2; s <= 2; s++) {
    const slit = new THREE.Mesh(slitGeo, crimsonWindowMat);
    slit.position.set(s * 1.24 * S, 3.35 * S, 7.52 * S);
    auctionGroup.add(slit);
  }

  // Bold "HUMAN" wooden plank signboard directly above the portico arch (single front face material)
  const humanSignMat = trackMat(
    new THREE.MeshStandardMaterial({ map: humanSignTex, roughness: 0.72, metalness: 0.04 })
  );
  const humanSign = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.2 * S, 1.75 * S, 0.35 * S)),
    [darkWoodMat, darkWoodMat, darkWoodMat, darkWoodMat, humanSignMat, darkWoodMat]
  );
  humanSign.position.set(0, 5.45 * S, 7.35 * S);
  auctionGroup.add(humanSign);

  placeOnSabaodySphere(
    auctionGroup,
    SABAODY_LANDMARKS.auctionHouse.x,
    ahY - 0.15,
    SABAODY_LANDMARKS.auctionHouse.z,
    globeRadius,
    0
  );
  group.add(auctionGroup);

  // 4 Tall Turquoise Minaret Towers flanking the Human Auction House (image_e7049d92.png)
  buildTurquoiseMinaret(-58.2, -23.0, 21.0);
  buildTurquoiseMinaret(-39.8, -23.0, 21.0);
  buildTurquoiseMinaret(-56.2, -33.5, 19.5);
  buildTurquoiseMinaret(-41.8, -33.5, 19.5);

  // 7B. Shakky's Rip-Off Bar at (-37.0, -15.5) — Faithful to image_fe5dea95.png!
  const shakkyGroup = new THREE.Group();
  const sbY = sampleSabaodyHeight(
    SABAODY_LANDMARKS.shakkysBar.x,
    SABAODY_LANDMARKS.shakkysBar.z
  );

  // Lower circular mossy stone masonry base + cobbled footing skirt
  const sbPlinthGeo = trackGeo(new THREE.CylinderGeometry(5.1 * S, 5.3 * S, 0.55 * S, 18));
  sbPlinthGeo.translate(0, 0.28 * S, 0);
  shakkyGroup.add(new THREE.Mesh(sbPlinthGeo, mossyStoneMat));

  const sbBaseGeo = trackGeo(new THREE.CylinderGeometry(4.6 * S, 4.8 * S, 3.6 * S, 18));
  sbBaseGeo.translate(0, 2.0 * S, 0);
  shakkyGroup.add(new THREE.Mesh(sbBaseGeo, mossyStoneMat));

  // Left timber side annex + chimney
  const sbAnnexGeo = trackGeo(new THREE.BoxGeometry(3.2 * S, 2.8 * S, 3.6 * S));
  sbAnnexGeo.translate(-5.2 * S, 1.4 * S, -0.6 * S);
  shakkyGroup.add(new THREE.Mesh(sbAnnexGeo, creamWallMat));
  const chimneyGeo = trackGeo(new THREE.CylinderGeometry(0.28 * S, 0.34 * S, 2.4 * S, 8));
  chimneyGeo.translate(-5.8 * S, 3.4 * S, -1.0 * S);
  shakkyGroup.add(new THREE.Mesh(chimneyGeo, brickWallMat));

  // Terracotta bottle-shaped door & flanking window surrounds (image_fe5dea95)
  const bottleBodyGeo = trackGeo(new THREE.BoxGeometry(1.75 * S, 2.35 * S, 0.28 * S));
  const bottleNeckGeo = trackGeo(new THREE.BoxGeometry(0.75 * S, 0.9 * S, 0.28 * S));
  const frontDoorFrame = new THREE.Mesh(bottleBodyGeo, terracottaMat);
  frontDoorFrame.position.set(0, 1.35 * S, 4.65 * S);
  const frontDoorNeck = new THREE.Mesh(bottleNeckGeo, terracottaMat);
  frontDoorNeck.position.set(0, 2.85 * S, 4.65 * S);
  const sbDoor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.15 * S, 2.1 * S, 0.32 * S)),
    darkWoodMat
  );
  sbDoor.position.set(0, 1.15 * S, 4.68 * S);
  const sbSteps = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.6 * S, 0.4 * S, 1.2 * S)),
    creamWallMat
  );
  sbSteps.position.set(0, 0.2 * S, 5.1 * S);
  shakkyGroup.add(frontDoorFrame, frontDoorNeck, sbDoor, sbSteps);

  for (const ang of [-0.58, 0.58, -1.15, 1.15]) {
    const wx = Math.sin(ang) * 4.65 * S;
    const wz = Math.cos(ang) * 4.65 * S;
    const wFrame = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.05 * S, 1.25 * S, 0.22 * S)),
      terracottaMat
    );
    wFrame.position.set(wx, 1.65 * S, wz);
    wFrame.rotation.y = ang;
    const wPane = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.65 * S, 0.85 * S, 0.26 * S)),
      darkWindowMat
    );
    wPane.position.set(wx, 1.65 * S, wz);
    wPane.rotation.y = ang;
    shakkyGroup.add(wFrame, wPane);
  }

  // Recessed upper circular clerestory + sloped mossy green collar roof
  const sbTier2Geo = trackGeo(new THREE.CylinderGeometry(3.6 * S, 4.1 * S, 1.65 * S, 16));
  sbTier2Geo.translate(0, 4.62 * S, 0);
  shakkyGroup.add(new THREE.Mesh(sbTier2Geo, creamWallMat));

  const sbSkirtGeo = trackGeo(new THREE.ConeGeometry(4.65 * S, 1.45 * S, 16));
  sbSkirtGeo.translate(0, 5.75 * S, 0);
  shakkyGroup.add(new THREE.Mesh(sbSkirtGeo, mossGreenMat));

  // Giant bulbous bright-green dome with yellow diamond-lattice collar (image_fe5dea95)
  const sbDomeGeo = trackGeo(new THREE.SphereGeometry(4.35 * S, 16, 12));
  sbDomeGeo.scale(1, 0.96, 1);
  sbDomeGeo.translate(0, 8.7 * S, 0);
  shakkyGroup.add(new THREE.Mesh(sbDomeGeo, domeGreenMat));

  const sbCupolaGeo = trackGeo(new THREE.ConeGeometry(0.85 * S, 1.4 * S, 8));
  sbCupolaGeo.translate(0, 13.2 * S, 0);
  shakkyGroup.add(new THREE.Mesh(sbCupolaGeo, turquoiseTowerMat));

  // Giant wooden "SHAKKY'S RIP-OFF BAR" plank signboard anchored cleanly on 2 short posts atop the green sloped skirt
  const shakkySignMat = trackMat(
    new THREE.MeshStandardMaterial({ map: shakkySignTex, roughness: 0.74, metalness: 0.04 })
  );
  const shakkySign = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.4 * S, 2.2 * S, 0.34 * S)),
    [darkWoodMat, darkWoodMat, darkWoodMat, darkWoodMat, shakkySignMat, darkWoodMat]
  );
  shakkySign.position.set(0, 5.75 * S, 4.42 * S);
  shakkyGroup.add(shakkySign);

  const postGeo = trackGeo(new THREE.CylinderGeometry(0.15 * S, 0.17 * S, 1.05 * S, 6));
  for (const px of [-1.75, 1.75]) {
    const post = new THREE.Mesh(postGeo, darkWoodMat);
    post.position.set(px * S, 5.1 * S, 4.28 * S);
    shakkyGroup.add(post);
  }

  placeOnSabaodySphere(
    shakkyGroup,
    SABAODY_LANDMARKS.shakkysBar.x,
    sbY - 0.15,
    SABAODY_LANDMARKS.shakkysBar.z,
    globeRadius,
    0
  );
  group.add(shakkyGroup);

  // ---------------------------------------------------------------------------
  // 8. GROVES 70–79 (NORTH): MARINE FORWARD MILITARY BASE & MARIE JOIE APPROACH
  // ---------------------------------------------------------------------------
  const marineGroup = new THREE.Group();
  const mfY = sampleSabaodyHeight(
    SABAODY_LANDMARKS.marineFortress.x,
    SABAODY_LANDMARKS.marineFortress.z
  );

  // White limestone fortress keep + crenellated seawall + twin Marine watchtowers
  const keepGeo = trackGeo(new THREE.BoxGeometry(11.5 * S, 6.8 * S, 7.6 * S));
  keepGeo.translate(0, 3.4 * S, 0);
  marineGroup.add(new THREE.Mesh(keepGeo, marineWhiteMat));

  const keepRoofGeo = trackGeo(new THREE.BoxGeometry(12.2 * S, 1.1 * S, 8.2 * S));
  keepRoofGeo.translate(0, 7.3 * S, 0);
  marineGroup.add(new THREE.Mesh(keepRoofGeo, marineBlueMat));

  const watchGeo = trackGeo(new THREE.CylinderGeometry(1.7 * S, 1.9 * S, 10.8 * S, 10));
  watchGeo.translate(0, 5.4 * S, 0);
  const watchRoofGeo = trackGeo(new THREE.ConeGeometry(2.15 * S, 2.8 * S, 10));
  watchRoofGeo.translate(0, 12.1 * S, 0);
  for (const wx of [-6.8, 6.8]) {
    const wt = new THREE.Mesh(watchGeo, marineWhiteMat);
    wt.position.set(wx * S, 0, 2.4 * S);
    const wr = new THREE.Mesh(watchRoofGeo, marineBlueMat);
    wr.position.set(wx * S, 0, 2.4 * S);
    marineGroup.add(wt, wr);
  }

  // Marine Signboard & Twin Flagpoles + arched fortress doorway
  const marineDoor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.2 * S, 3.0 * S, 0.28 * S)),
    darkWoodMat
  );
  marineDoor.position.set(0, 1.5 * S, 3.85 * S);
  marineGroup.add(marineDoor);

  const marineSignMat = trackMat(
    new THREE.MeshStandardMaterial({ map: marineSignTex, roughness: 0.65, metalness: 0.08 })
  );
  const mSign = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.6 * S, 2.0 * S, 0.3 * S)),
    [marineBlueMat, marineBlueMat, marineBlueMat, marineBlueMat, marineSignMat, marineBlueMat]
  );
  mSign.position.set(0, 5.2 * S, 3.95 * S);
  marineGroup.add(mSign);

  const flagPoleGeo = trackGeo(new THREE.CylinderGeometry(0.12 * S, 0.14 * S, 6.5 * S, 6));
  flagPoleGeo.translate(0, 10.6 * S, 0);
  const flagGeo = trackGeo(new THREE.BoxGeometry(2.4 * S, 1.4 * S, 0.08 * S));
  flagGeo.translate(1.25 * S, 13.0 * S, 0);
  for (const fx of [-3.8, 3.8]) {
    const fp = new THREE.Mesh(flagPoleGeo, goldAccentMat);
    fp.position.set(fx * S, 0, 0);
    const fl = new THREE.Mesh(flagGeo, marineBlueMat);
    fl.position.set(fx * S, 0, 0);
    marineGroup.add(fp, fl);
  }

  placeOnSabaodySphere(
    marineGroup,
    SABAODY_LANDMARKS.marineFortress.x,
    mfY - 0.15,
    SABAODY_LANDMARKS.marineFortress.z,
    globeRadius,
    0
  );
  group.add(marineGroup);

  // 2 Marine Patrol Warships moored at the North Pier (Groves 70-79)
  buildCoatedShip(-4.5, -80.0, 0.15, false, true);
  buildCoatedShip(12.5, -81.0, -0.15, false, true);

  // ---------------------------------------------------------------------------
  // 9. FLOATING IRIDESCENT YARUKIMAN RESIN BUBBLES (Instanced + Animated!)
  // ---------------------------------------------------------------------------
  const bubbles = buildSabaodyBubbles();
  const bubbleGeo = trackGeo(new THREE.SphereGeometry(1.0, 14, 10));
  const bubbleInst = new THREE.InstancedMesh(bubbleGeo, bubbleMat, bubbles.length);
  bubbleInst.frustumCulled = false;

  const updateBubbles = (elapsed: number) => {
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      const bobY = Math.sin(elapsed * b.riseSpeed + b.phase) * 2.2;
      const driftX = Math.cos(elapsed * 0.35 + b.phase) * b.driftAmp;
      const driftZ = Math.sin(elapsed * 0.3 + b.phase * 1.3) * b.driftAmp;
      const sp = toSabaodySphereLocal(b.x + driftX, b.y + bobY, b.z + driftZ, globeRadius);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _dummy.quaternion.identity();
      _dummy.scale.setScalar(b.radius * S);
      _dummy.updateMatrix();
      bubbleInst.setMatrixAt(i, _dummy.matrix);
    }
    bubbleInst.instanceMatrix.needsUpdate = true;
  };
  updateBubbles(0);
  bubbleInst.computeBoundingSphere();
  group.add(bubbleInst);

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      const rot = elapsed * 0.18;
      ferrisWheelSpinner.rotation.z = rot;
      for (let i = 0; i < gondolas.length; i++) {
        gondolas[i].rotation.z = -rot;
      }
      updateBubbles(elapsed);
    },
  };
}
