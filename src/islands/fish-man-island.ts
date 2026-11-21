import * as THREE from 'three';
import { valueNoise2D } from '../utils/globeMath';
import {
  FISH_MAN_DEPTH,
  FISH_MAN_GLOBE_SCALE,
  FISH_MAN_LANDMARKS,
  FISH_MAN_MAIN_BUBBLE_CENTER,
  FISH_MAN_MAIN_BUBBLE_RADIUS,
  FISH_MAN_RYUGU_BUBBLE_CENTER,
  FISH_MAN_RYUGU_BUBBLE_RADIUS,
  FISH_MAN_SEA_FOREST_DOME_CENTER,
  FISH_MAN_SEA_FOREST_DOME_RADIUS,
  buildFishManBubbleVillas,
  buildFishManBuildings,
  buildFishManCorals,
  buildFishManSeaKings,
  buildFishManShipwrecks,
  buildFishManWaterArches,
  isNavigableFishManWater,
  sampleFishManHeight,
  toFishManSphereLocal,
} from '../utils/fishManIslandTerrain';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = FISH_MAN_GLOBE_SCALE;
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

function placeOnFishManSphere(
  obj: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  globeRadius: number,
  yaw = 0
): void {
  const pos = toFishManSphereLocal(x, y, z, globeRadius);
  obj.position.set(pos.x, pos.y, pos.z);
  const baseR = globeRadius - FISH_MAN_DEPTH;
  _localNormal.set(pos.x, baseR + pos.y, pos.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

function createFishManTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const w = 360;
  const d = 320;
  const xMin = -w * 0.5;
  const zMin = -d * 0.5;

  const deepRock: [number, number, number] = [10, 40, 66];
  const deepSand: [number, number, number] = [18, 72, 104];
  const lagoonBed: [number, number, number] = [20, 134, 164];
  const coralSand: [number, number, number] = [208, 192, 158];
  const coralPinkTerrace: [number, number, number] = [204, 126, 154];
  const coralMintTerrace: [number, number, number] = [102, 178, 166];
  const gyoncordeStone: [number, number, number] = [174, 186, 202];
  const seaForestGlow: [number, number, number] = [14, 86, 114];
  const abyssIron: [number, number, number] = [24, 30, 44];

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * d + zMin;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * w + xMin;
      const idx = (py * size + px) * 4;

      const r = Math.hypot(x, z);
      const n1 = valueNoise2D(x * 0.11 + 2.3, z * 0.11 - 4.1);
      const n2 = valueNoise2D(x * 0.34 - 5.2, z * 0.34 + 1.8);

      let rgb: [number, number, number] = mixRgb(deepRock, deepSand, n1 * 0.8 + n2 * 0.2);

      // Sea Forest NE glade
      const dForest = Math.hypot(
        (x - FISH_MAN_LANDMARKS.seaForest.x) / 36,
        (z - FISH_MAN_LANDMARKS.seaForest.z) / 34
      );
      if (dForest < 1.15) {
        const sf = 1 - smoothstep(0.6, 1.15, dForest);
        rgb = mixRgb(rgb, seaForestGlow, sf * 0.88);
      }

      // Fish-Man District dark rusted shelf
      const dDistrict = Math.hypot(
        (x - FISH_MAN_LANDMARKS.fishManDistrict.x) / 28,
        (z - FISH_MAN_LANDMARKS.fishManDistrict.z) / 26
      );
      if (dDistrict < 1.1) {
        const df = 1 - smoothstep(0.5, 1.1, dDistrict);
        rgb = mixRgb(rgb, abyssIron, df * 0.85);
      }

      // Inside Main Protective Bubble
      if (r < 90) {
        const inBubble = 1 - smoothstep(74, 90, r);
        let cityCol = mixRgb(coralPinkTerrace, coralMintTerrace, n1);

        // Coral Hills golden terrace center
        const dHills = Math.hypot(x / 36, (z - 8) / 24);
        if (dHills < 1.1) {
          cityCol = mixRgb(cityCol, coralSand, (1 - smoothstep(0.3, 1.1, dHills)) * 0.72);
        }

        // Mermaid Cove golden beach
        const dMermaid = Math.hypot((x + 43) / 18, (z - 22) / 15);
        if (dMermaid < 1.2) {
          cityCol = mixRgb(cityCol, [246, 232, 186], (1 - smoothstep(0.35, 1.2, dMermaid)) * 0.92);
        }

        // Gyoncorde Plaza stone pavement
        const dPlaza = Math.hypot((x + 12) / 20, (z + 38) / 18);
        if (dPlaza < 1.1) {
          const tile = ((Math.floor((x + 12) * 0.5) + Math.floor((z + 38) * 0.5)) & 1) === 0 ? 1 : 0.88;
          cityCol = mixRgb(
            cityCol,
            [gyoncordeStone[0] * tile, gyoncordeStone[1] * tile, gyoncordeStone[2] * tile],
            (1 - smoothstep(0.65, 1.1, dPlaza)) * 0.92
          );
        }

        if (isNavigableFishManWater(x, z)) {
          cityCol = mixRgb(lagoonBed, [56, 206, 230], n2 * 0.55);
        }

        rgb = mixRgb(rgb, cityCol, inBubble);
      }

      const grain = (n2 - 0.5) * 14;
      data[idx] = clamp(Math.round(rgb[0] + grain), 0, 255);
      data[idx + 1] = clamp(Math.round(rgb[1] + grain), 0, 255);
      data[idx + 2] = clamp(Math.round(rgb[2] + grain), 0, 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createCriminSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f5b938';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 504, 120);

  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 74px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Cri ★ min', 256, 66);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createRyuguCrestTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  ctx.fillStyle = '#fef3c7';
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(128, 128, 112, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#b45309';
  ctx.font = 'bold 132px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('竜', 128, 134);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createPoneglyphTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#132f42';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 236, 236);

  ctx.fillStyle = '#67e8f9';
  for (let row = 28; row < 230; row += 22) {
    for (let col = 26; col < 230; col += 18) {
      const h = 8 + ((row * 7 + col * 13) % 8);
      const w = 7 + ((row * 3 + col * 5) % 6);
      ctx.fillRect(col, row, w, 3);
      if ((row + col) % 3 === 0) ctx.fillRect(col + 2, row, 3, h);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createSpottedConchTexture(baseHex: string, spotHex = '#292524'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = spotHex;
  const spots = [
    [42, 42, 16], [122, 34, 20], [208, 52, 15],
    [76, 106, 21], [170, 114, 18], [28, 162, 14],
    [118, 178, 19], [218, 168, 22], [64, 226, 16], [166, 232, 18],
  ];
  for (const [cx, cy, r] of spots) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function createIslandMesh(ctx: IslandMeshContext): IslandMeshInstance {
  const { globeRadius } = ctx;

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => ctx.trackGeo(g);
  const trackMat = <T extends THREE.Material>(m: T): T => ctx.trackMat(m);
  const trackTex = <T extends THREE.Texture>(t: T): T =>
    ctx.trackTex ? ctx.trackTex(t) : t;

  const group = new THREE.Group();
  group.name = 'fish-man-island-grotto';

  // ---------------------------------------------------------------------------
  // 1. CURVED ABYSSAL SEABED + CORAL CITY TERRAIN MESH
  // ---------------------------------------------------------------------------
  const segX = 112;
  const segZ = 98;
  const terrainW = 360;
  const terrainD = 320;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(terrainW * S, terrainD * S, segX, segZ)
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i) / S;
    const lz = posAttr.getZ(i) / S;
    const h = sampleFishManHeight(lx, lz);
    const sp = toFishManSphereLocal(lx, h, lz, globeRadius);
    posAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  terrainGeo.computeVertexNormals();

  const terrainTex = trackTex(createFishManTerrainTexture(768));
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.85,
      metalness: 0.04,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Interior Coral Lagoon Water Sheet at y = 0 inside the main bubble
  const lagoonGeo = trackGeo(new THREE.CircleGeometry(78 * S, 48));
  lagoonGeo.rotateX(-Math.PI / 2);
  const lPos = lagoonGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < lPos.count; i++) {
    const lx = lPos.getX(i) / S;
    const lz = lPos.getZ(i) / S;
    const sp = toFishManSphereLocal(lx, 0.0, lz, globeRadius);
    lPos.setXYZ(i, sp.x, sp.y, sp.z);
  }
  lagoonGeo.computeVertexNormals();
  const lagoonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0891b2,
      emissiveIntensity: 0.24,
      roughness: 0.16,
      metalness: 0.14,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    })
  );
  const lagoonMesh = new THREE.Mesh(lagoonGeo, lagoonMat);
  group.add(lagoonMesh);

  // ---------------------------------------------------------------------------
  // 2. RED LINE UNDERSEA CAVERN DOME CEILING + SUNLIGHT TREE EVE ROOTS & GOD-RAYS
  // ---------------------------------------------------------------------------
  const cavernDomeGeo = trackGeo(
    new THREE.SphereGeometry(285 * S, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.54)
  );
  const cavernDomeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0b3954,
      emissive: 0x052438,
      emissiveIntensity: 0.45,
      roughness: 0.94,
      side: THREE.BackSide,
    })
  );
  const cavernDome = new THREE.Mesh(cavernDomeGeo, cavernDomeMat);
  cavernDome.position.y = -20 * S;
  group.add(cavernDome);

  // Cavern Illumination (max 2 localized lights per games_3d budget)
  const eveSunLight = new THREE.PointLight(0x9be7ff, 1.15, 520 * S, 1.15);
  placeOnFishManSphere(eveSunLight, 0, 158, -14, globeRadius);
  group.add(eveSunLight);

  const seaForestLight = new THREE.PointLight(0x2dd4bf, 0.95, 160 * S, 1.4);
  placeOnFishManSphere(
    seaForestLight,
    FISH_MAN_LANDMARKS.seaForest.x,
    18,
    FISH_MAN_LANDMARKS.seaForest.z,
    globeRadius
  );
  group.add(seaForestLight);

  // Colossal Sunlight Tree Eve Roots descending from cavern ceiling behind & around the island
  const eveRootMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c4738,
      emissive: 0x164e63,
      emissiveIntensity: 0.34,
      roughness: 0.88,
    })
  );
  const eveGlowVeinMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    })
  );
  const eveConfigs = [
    { x: 24, z: -56, rTop: 15, rBot: 10, h: 245 },
    { x: -22, z: -68, rTop: 13, rBot: 9, h: 245 },
    { x: 54, z: -38, rTop: 10, rBot: 7, h: 240 },
    { x: -56, z: -52, rTop: 11, rBot: 7.5, h: 240 },
    { x: 8, z: -86, rTop: 18, rBot: 12, h: 248 },
  ];
  for (const er of eveConfigs) {
    const rootGroup = new THREE.Group();
    const trunk = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(er.rTop * S, er.rBot * S, er.h * S, 12, 4)),
      eveRootMat
    );
    trunk.position.y = (er.h * 0.5 - 22) * S;
    rootGroup.add(trunk);

    const glowStrip = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(er.rTop * 1.03 * S, er.rBot * 1.03 * S, er.h * S, 10, 1, true)),
      eveGlowVeinMat
    );
    glowStrip.position.y = (er.h * 0.5 - 22) * S;
    rootGroup.add(glowStrip);

    placeOnFishManSphere(rootGroup, er.x, 0, er.z, globeRadius, er.x * 0.05);
    group.add(rootGroup);
  }

  // Translucent Sunlight God-Ray Shafts pouring down through ocean water onto the Double Bubble
  const godRayMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const godRayTargets: [number, number, number][] = [
    [0, -20, 32],
    [-28, 12, 24],
    [32, -8, 26],
    [88, -46, 28],
    [0, 62, 22],
  ];
  for (const [gx, gz, gr] of godRayTargets) {
    const ray = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(gr * S, 220 * S, 16, 1, true)),
      godRayMat
    );
    placeOnFishManSphere(ray, gx, 112, gz, globeRadius);
    ray.rotateZ(0.14);
    ray.rotateX(0.08);
    group.add(ray);
  }

  // ---------------------------------------------------------------------------
  // 3. DOUBLE-LAYERED PROTECTIVE BUBBLES + RYUGU PALACE BUBBLE + SEA FOREST DOME
  // ---------------------------------------------------------------------------
  const outerBubbleMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.18,
      roughness: 0.12,
      metalness: 0.05,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const innerBubbleMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.12,
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: 0.10,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const bubbleRimMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    })
  );

  // Main Double Bubble
  const mainBubbleGroup = new THREE.Group();
  const mainOuterMesh = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(FISH_MAN_MAIN_BUBBLE_RADIUS * S, 40, 28)),
    outerBubbleMat
  );
  mainBubbleGroup.add(mainOuterMesh);
  const mainInnerMesh = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry((FISH_MAN_MAIN_BUBBLE_RADIUS - 3.6) * S, 36, 24)),
    innerBubbleMat
  );
  mainBubbleGroup.add(mainInnerMesh);

  // Crisp double-thickness rim rings (signature cutaway ring silhouette in image_45abb980.png)
  const rimEq = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(FISH_MAN_MAIN_BUBBLE_RADIUS * S, 0.9 * S, 8, 64)),
    bubbleRimMat
  );
  mainBubbleGroup.add(rimEq);
  const rimEq2 = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry((FISH_MAN_MAIN_BUBBLE_RADIUS - 3.5) * S, 0.7 * S, 8, 64)),
    bubbleRimMat
  );
  mainBubbleGroup.add(rimEq2);

  placeOnFishManSphere(
    mainBubbleGroup,
    FISH_MAN_MAIN_BUBBLE_CENTER.x,
    FISH_MAN_MAIN_BUBBLE_CENTER.y,
    FISH_MAN_MAIN_BUBBLE_CENTER.z,
    globeRadius
  );
  group.add(mainBubbleGroup);

  // Cylindrical Collar Membrane Neck linking Main Dome to Ryugu Palace Dome
  const collarGroup = new THREE.Group();
  const collarTube = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(8.5 * S, 11 * S, 14 * S, 20, 1, true)),
    outerBubbleMat
  );
  collarGroup.add(collarTube);
  const collarRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(9.6 * S, 1.1 * S, 8, 28)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.2,
        roughness: 0.45,
      })
    )
  );
  collarRing.rotation.x = Math.PI / 2;
  collarGroup.add(collarRing);
  placeOnFishManSphere(collarGroup, 0, 106, -20, globeRadius);
  group.add(collarGroup);

  // Upper Ryugu Palace Double Bubble
  const ryuguBubbleGroup = new THREE.Group();
  ryuguBubbleGroup.add(
    new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(FISH_MAN_RYUGU_BUBBLE_RADIUS * S, 32, 22)),
      outerBubbleMat
    )
  );
  ryuguBubbleGroup.add(
    new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry((FISH_MAN_RYUGU_BUBBLE_RADIUS - 2.1) * S, 28, 18)),
      innerBubbleMat
    )
  );
  ryuguBubbleGroup.add(
    new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(FISH_MAN_RYUGU_BUBBLE_RADIUS * S, 0.65 * S, 8, 48)),
      bubbleRimMat
    )
  );
  placeOnFishManSphere(
    ryuguBubbleGroup,
    FISH_MAN_RYUGU_BUBBLE_CENTER.x,
    FISH_MAN_RYUGU_BUBBLE_CENTER.y,
    FISH_MAN_RYUGU_BUBBLE_CENTER.z,
    globeRadius
  );
  group.add(ryuguBubbleGroup);

  // Sea Forest Translucent Dome
  const forestDomeGroup = new THREE.Group();
  forestDomeGroup.add(
    new THREE.Mesh(
      trackGeo(
        new THREE.SphereGeometry(
          FISH_MAN_SEA_FOREST_DOME_RADIUS * S,
          28,
          16,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.54
        )
      ),
      trackMat(
        new THREE.MeshPhysicalMaterial({
          color: 0x5eead4,
          emissive: 0x0d9488,
          emissiveIntensity: 0.16,
          roughness: 0.18,
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      )
    )
  );
  placeOnFishManSphere(
    forestDomeGroup,
    FISH_MAN_SEA_FOREST_DOME_CENTER.x,
    -6,
    FISH_MAN_SEA_FOREST_DOME_CENTER.z,
    globeRadius
  );
  group.add(forestDomeGroup);

  // ---------------------------------------------------------------------------
  // 4. MAIN ENTRANCE WATER-LOCK IRIS GATE (image_45abb980.png)
  // ---------------------------------------------------------------------------
  const gateGroup = new THREE.Group();
  const gateMetalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc2b280,
      roughness: 0.55,
      metalness: 0.25,
    })
  );
  const gateFrameMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.42,
      metalness: 0.38,
    })
  );
  const gateWaterMembraneMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  // Heavy cylindrical airlock housing ring
  const gateCasing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(11.5 * S, 11.5 * S, 9.0 * S, 24, 1, true)),
    gateMetalMat
  );
  gateCasing.rotation.x = Math.PI / 2;
  gateGroup.add(gateCasing);

  const gateFrontRim = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(11.4 * S, 1.5 * S, 10, 28)),
    gateFrameMat
  );
  gateFrontRim.position.z = 4.5 * S;
  gateGroup.add(gateFrontRim);

  const gateBackRim = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(11.4 * S, 1.4 * S, 10, 28)),
    gateFrameMat
  );
  gateBackRim.position.z = -4.5 * S;
  gateGroup.add(gateBackRim);

  const gateWaterSeal = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(10.0 * S, 24)),
    gateWaterMembraneMat
  );
  gateGroup.add(gateWaterSeal);

  // Flanking Coral-Stone Guard Bastions beside Main Entrance
  for (const side of [-1, 1] as const) {
    const bastion = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.2 * S, 13.5 * S, 8.2 * S)),
      gateMetalMat
    );
    bastion.position.set(side * 14.5 * S, -1.5 * S, 0);
    gateGroup.add(bastion);
  }
  placeOnFishManSphere(
    gateGroup,
    FISH_MAN_LANDMARKS.mainEntranceGate.x,
    7.5,
    FISH_MAN_LANDMARKS.mainEntranceGate.z,
    globeRadius
  );
  group.add(gateGroup);

  // ---------------------------------------------------------------------------
  // 5. RYUGU PALACE, GOLDEN COILED SEA DRAGON & HARD-SHELL TOWER (image_c141bb44.png)
  // ---------------------------------------------------------------------------
  // Grand Coral Staircase climbing from Coral Hills into the Ryugu Bubble
  const stairGroup = new THREE.Group();
  const stairCoralMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.72 })
  );
  const stairStepMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.78 })
  );
  const numSteps = 22;
  for (let s = 0; s < numSteps; s++) {
    const t = s / (numSteps - 1);
    const step = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry((10.5 - t * 2.5) * S, 4.8 * S, 2.2 * S)),
      stairStepMat
    );
    const sy = 10.0 + t * 101.0;
    const sz = -6.0 - t * 12.0;
    const sp = toFishManSphereLocal(0, sy, sz, globeRadius);
    step.position.set(sp.x, sp.y, sp.z);
    stairGroup.add(step);
  }
  // Giant Pink & Gold Clamshells flanking Ryugu Palace entrance stairs
  for (const side of [-1, 1] as const) {
    const clam = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(4.4 * S, 7.2 * S, 10)),
      stairCoralMat
    );
    placeOnFishManSphere(clam, side * 6.8, 113.5, -9.5, globeRadius, side * -0.45);
    clam.rotateZ(side * -0.35);
    stairGroup.add(clam);
  }
  group.add(stairGroup);

  // Main Ryugu Palace Complex inside Upper Bubble
  const palaceGroup = new THREE.Group();
  const palaceWallMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.56 })
  );
  const palaceTealMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.36, metalness: 0.14 })
  );
  const palaceGoldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0x92400e,
      emissiveIntensity: 0.25,
      roughness: 0.26,
      metalness: 0.65,
    })
  );
  const palaceCrimsonMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.44 })
  );
  const palaceCanalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      roughness: 0.15,
      transparent: true,
      opacity: 0.85,
    })
  );

  // Coral Terrace Platform & Interconnected Indoor Swim-Pools
  const palaceTerrace = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(23 * S, 20 * S, 3.2 * S, 24)),
    palaceWallMat
  );
  palaceTerrace.position.y = -1.6 * S;
  palaceGroup.add(palaceTerrace);

  const swimPoolRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(12.5 * S, 18.5 * S, 28)),
    palaceCanalMat
  );
  swimPoolRing.rotation.x = -Math.PI / 2;
  swimPoolRing.position.y = 0.08 * S;
  palaceGroup.add(swimPoolRing);

  // Main Palace Hall + Arched Portal
  const mainHall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(17.5 * S, 7.2 * S, 12.5 * S)),
    palaceWallMat
  );
  mainHall.position.y = 3.6 * S;
  palaceGroup.add(mainHall);

  const goldenDoor = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.4 * S, 2.4 * S, 0.8 * S, 16)),
    palaceGoldMat
  );
  goldenDoor.rotation.x = Math.PI / 2;
  goldenDoor.position.set(0, 3.0 * S, 6.35 * S);
  palaceGroup.add(goldenDoor);

  // Circular 竜 Ryugu Crest above Main Arch
  const crestTex = trackTex(createRyuguCrestTexture());
  const crestMesh = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(2.1 * S, 24)),
    trackMat(new THREE.MeshBasicMaterial({ map: crestTex, side: THREE.DoubleSide }))
  );
  crestMesh.position.set(0, 8.8 * S, 6.5 * S);
  palaceGroup.add(crestMesh);

  // 3 Sweeping Tiered Turquoise-and-Gold Pagoda Roofs
  const pagodaTiers = [
    { y: 7.4, rBot: 13.8, rTop: 7.4, h: 3.4 },
    { y: 11.4, rBot: 9.6, rTop: 5.2, h: 2.9 },
    { y: 14.9, rBot: 6.4, rTop: 2.4, h: 2.8 },
  ];
  for (const tier of pagodaTiers) {
    const roof = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(tier.rTop * S, tier.rBot * S, tier.h * S, 12)),
      palaceTealMat
    );
    roof.position.y = tier.y * S;
    palaceGroup.add(roof);

    const goldEave = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(tier.rBot * 0.96 * S, 0.36 * S, 6, 16)),
      palaceGoldMat
    );
    goldEave.rotation.x = Math.PI / 2;
    goldEave.position.y = (tier.y - tier.h * 0.45) * S;
    palaceGroup.add(goldEave);
  }

  // Crimson Peak Spire
  const centralSpire = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(2.8 * S, 6.4 * S, 10)),
    palaceCrimsonMat
  );
  centralSpire.position.y = 19.2 * S;
  palaceGroup.add(centralSpire);

  // Flanking Elevated Arched Colonnade Wings & Side Turrets
  for (const side of [-1, 1] as const) {
    const wingBridge = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(10.5 * S, 2.2 * S, 3.6 * S)),
      palaceWallMat
    );
    wingBridge.position.set(side * 12.0 * S, 9.6 * S, -1.0 * S);
    wingBridge.rotation.z = side * 0.22;
    palaceGroup.add(wingBridge);

    const sideTower = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(3.2 * S, 3.8 * S, 13.5 * S, 12)),
      palaceWallMat
    );
    sideTower.position.set(side * 17.0 * S, 6.75 * S, -2.5 * S);
    palaceGroup.add(sideTower);

    const sideRoof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(4.6 * S, 4.6 * S, 10)),
      palaceCrimsonMat
    );
    sideRoof.position.set(side * 17.0 * S, 15.6 * S, -2.5 * S);
    palaceGroup.add(sideRoof);
  }

  // Coiled Golden Sea Dragon wrapping majestically around Ryugu Palace Spire
  const dragonPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    const ang = -Math.PI * 0.85 + t * Math.PI * 2.1;
    const rad = (13.5 - t * 5.2 + Math.sin(t * Math.PI * 3) * 1.4) * S;
    const dy = (7.5 + t * 14.5 + Math.cos(t * Math.PI * 2) * 1.6) * S;
    dragonPts.push(new THREE.Vector3(Math.cos(ang) * rad, dy, Math.sin(ang) * rad));
  }
  const dragonCurve = new THREE.CatmullRomCurve3(dragonPts);
  const dragonBody = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(dragonCurve, 36, 1.35 * S, 10, false)),
    palaceGoldMat
  );
  palaceGroup.add(dragonBody);

  // Roaring Golden Dragon Head with Snout, Mane Crest, Horns & Whiskers at spire crown
  const dragonHeadPos = dragonPts[dragonPts.length - 1];
  const dragonHeadGroup = new THREE.Group();
  dragonHeadGroup.position.copy(dragonHeadPos);
  const dragonJaw = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.6 * S, 1.8 * S, 4.4 * S)),
    palaceGoldMat
  );
  dragonHeadGroup.add(dragonJaw);
  const dragonSnout = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(1.7 * S, 3.6 * S, 8)),
    palaceGoldMat
  );
  dragonSnout.rotation.x = Math.PI * 0.5;
  dragonSnout.position.z = 2.8 * S;
  dragonHeadGroup.add(dragonSnout);
  for (const side of [-1, 1] as const) {
    const horn = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.45 * S, 3.4 * S, 6)),
      palaceCrimsonMat
    );
    horn.position.set(side * 1.1 * S, 1.8 * S, -0.6 * S);
    horn.rotation.x = -0.45;
    horn.rotation.z = side * -0.25;
    dragonHeadGroup.add(horn);
  }
  dragonHeadGroup.rotation.y = 0.35;
  palaceGroup.add(dragonHeadGroup);

  // Giant Flanking Pink Clamshells beside Ryugu Palace Golden Door (image_c141bb44.png)
  for (const side of [-1, 1] as const) {
    const clamShell = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(3.8 * S, 6.2 * S, 10)),
      stairCoralMat
    );
    clamShell.position.set(side * 8.2 * S, 2.4 * S, 7.6 * S);
    clamShell.rotation.z = side * -0.42;
    clamShell.rotation.x = 0.18;
    palaceGroup.add(clamShell);
  }

  // Princess Shirahoshi's Pink Hard-Shell Tower (West terrace)
  const hardShellMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.48 })
  );
  const shellTower = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(3.4 * S, 4.6 * S, 9.2 * S, 14)),
    hardShellMat
  );
  shellTower.position.set(-14.0 * S, 4.6 * S, 7.5 * S);
  palaceGroup.add(shellTower);
  const shellDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(4.0 * S, 14, 10)),
    hardShellMat
  );
  shellDome.scale.set(1.0, 0.78, 1.0);
  shellDome.position.set(-14.0 * S, 9.8 * S, 7.5 * S);
  palaceGroup.add(shellDome);

  placeOnFishManSphere(
    palaceGroup,
    FISH_MAN_LANDMARKS.ryuguPalace.x,
    FISH_MAN_LANDMARKS.ryuguPalace.y,
    FISH_MAN_LANDMARKS.ryuguPalace.z,
    globeRadius
  );
  group.add(palaceGroup);

  // ---------------------------------------------------------------------------
  // 6. CORAL CITY, CRI★MIN BOUTIQUE, MERMAID COVE, WATERWHEEL TOWN & CANDY FACTORY
  // ---------------------------------------------------------------------------
  const criminTex = trackTex(createCriminSignTexture());
  const spottedOrangeTex = trackTex(createSpottedConchTexture('#e35d34', '#292524'));
  const spottedPinkTex = trackTex(createSpottedConchTexture('#ec4899', '#fef08a'));
  const cityMatCache = new Map<number, THREE.MeshStandardMaterial>();
  const getCityMat = (hex: number): THREE.MeshStandardMaterial => {
    let m = cityMatCache.get(hex);
    if (!m) {
      m = trackMat(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.65 }));
      cityMatCache.set(hex, m);
    }
    return m;
  };
  const spottedOrangeMat = trackMat(
    new THREE.MeshStandardMaterial({ map: spottedOrangeTex, roughness: 0.56 })
  );
  const spottedPinkMat = trackMat(
    new THREE.MeshStandardMaterial({ map: spottedPinkTex, roughness: 0.54 })
  );
  const goldAwningMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.5 })
  );

  const waterwheelSpinners: THREE.Mesh[] = [];
  const waterwheelWoodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 })
  );

  const buildings = buildFishManBuildings();
  for (const b of buildings) {
    const bGroup = new THREE.Group();
    const wMat = getCityMat(b.wallColorHex);
    const rMat = b.spotted
      ? b.id === 'candy-factory'
        ? spottedPinkMat
        : spottedOrangeMat
      : getCityMat(b.roofColorHex);

    // Tiered coral body
    const baseBody = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry((b.width * 0.48) * S, (b.width * 0.56) * S, b.height * 0.58 * S, 10)),
      wMat
    );
    baseBody.position.y = b.height * 0.29 * S;
    bGroup.add(baseBody);

    if (b.tierCount >= 2) {
      const upperTier = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry((b.width * 0.34) * S, (b.width * 0.42) * S, b.height * 0.32 * S, 10)),
        wMat
      );
      upperTier.position.y = b.height * 0.68 * S;
      bGroup.add(upperTier);
    }

    // Signature roof
    if (b.roofKind === 'conch') {
      const brim = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry((b.width * 0.44) * S, 0.75 * S, 8, 18)),
        goldAwningMat
      );
      brim.rotation.x = Math.PI / 2;
      brim.position.y = b.height * 0.78 * S;
      bGroup.add(brim);

      const spiral = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry((b.width * 0.38) * S, b.height * 0.52 * S, 10)),
        rMat
      );
      spiral.position.y = b.height * 1.02 * S;
      spiral.rotation.z = 0.14;
      bGroup.add(spiral);
    } else if (b.roofKind === 'factory') {
      const dome = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry((b.width * 0.46) * S, 14, 10)),
        rMat
      );
      dome.position.y = b.height * 0.76 * S;
      bGroup.add(dome);
      for (const sx of [-2.4, 2.4]) {
        const stack = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.75 * S, 0.9 * S, 5.4 * S, 8)),
          goldAwningMat
        );
        stack.position.set(sx * S, b.height * 0.98 * S, 0);
        bGroup.add(stack);
      }
    } else {
      const cap = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry((b.width * 0.50) * S, 12, 8)),
        rMat
      );
      cap.scale.set(1.0, 0.62, 1.0);
      cap.position.y = b.height * 0.78 * S;
      bGroup.add(cap);
    }

    // Iconic Cri★min illuminated banner mounted cleanly over the front door below the roof brim
    if (b.id === 'crimin-boutique') {
      const signFrame = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(7.6 * S, 2.35 * S, 0.45 * S)),
        waterwheelWoodMat
      );
      signFrame.position.set(0, b.height * 0.56 * S, (b.width * 0.55) * S);
      bGroup.add(signFrame);

      const sign = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(7.2 * S, 2.0 * S)),
        trackMat(new THREE.MeshBasicMaterial({ map: criminTex, side: THREE.DoubleSide }))
      );
      sign.position.set(0, b.height * 0.56 * S, (b.width * 0.55 + 0.25) * S);
      bGroup.add(sign);
    }

    // Spinning wooden waterwheels on Waterwheel Town cottages
    if (b.x < -30 && b.z < 5) {
      const wheel = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(2.1 * S, 0.35 * S, 6, 12)),
        waterwheelWoodMat
      );
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set((b.width * 0.56) * S, 2.1 * S, 0);
      bGroup.add(wheel);
      waterwheelSpinners.push(wheel);
    }

    placeOnFishManSphere(bGroup, b.x, b.y, b.z, globeRadius, b.yaw);
    group.add(bGroup);
  }

  // Mermaid Café Clamshell Dome + Cascading Waterfalls at Mermaid Cove (SW)
  const cafeGroup = new THREE.Group();
  const cafeMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.42 })
  );
  const pearlMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfde047,
      emissiveIntensity: 0.18,
      roughness: 0.2,
    })
  );
  const shellBase = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(6.8 * S, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5)),
    cafeMat
  );
  shellBase.scale.set(1.25, 0.85, 1.0);
  cafeGroup.add(shellBase);
  const cafePearl = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(1.6 * S, 12, 10)),
    pearlMat
  );
  cafePearl.position.set(0, 4.2 * S, 2.8 * S);
  cafeGroup.add(cafePearl);
  placeOnFishManSphere(
    cafeGroup,
    FISH_MAN_LANDMARKS.mermaidCafe.x,
    FISH_MAN_LANDMARKS.mermaidCafe.y,
    FISH_MAN_LANDMARKS.mermaidCafe.z,
    globeRadius,
    0.7
  );
  group.add(cafeGroup);

  // Crystal Waterfalls pouring into Mermaid Cove
  const fallMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    })
  );
  for (const fx of [-53, -44]) {
    const fall = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.4 * S, 2.2 * S, 14 * S, 10)),
      fallMat
    );
    placeOnFishManSphere(fall, fx, 6.5, 31, globeRadius);
    fall.rotateX(0.28);
    group.add(fall);
  }

  // Gyoncorde Plaza Memorial Monument (North Square)
  const monument = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.6 * S, 3.2 * S, 7.5 * S, 10)),
    getCityMat(0x94a3b8)
  );
  placeOnFishManSphere(
    monument,
    FISH_MAN_LANDMARKS.gyoncordePlaza.x,
    FISH_MAN_LANDMARKS.gyoncordePlaza.y + 3.6,
    FISH_MAN_LANDMARKS.gyoncordePlaza.z,
    globeRadius
  );
  group.add(monument);

  // ---------------------------------------------------------------------------
  // 7. INSTANCED CORAL FORMATIONS + WATER-ROADS + ANIMATED FISH-TAXIS + BUBBLE VILLAS
  // ---------------------------------------------------------------------------
  const corals = buildFishManCorals();
  const coralStemGeo = trackGeo(new THREE.CylinderGeometry(0.65 * S, 1.05 * S, 6.8 * S, 8));
  const coralCapGeo = trackGeo(new THREE.CylinderGeometry(3.2 * S, 1.4 * S, 1.6 * S, 10));
  const coralMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62 })
  );
  const glowCoralMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.62,
      roughness: 0.35,
    })
  );

  const regularCorals = corals.filter((c) => !c.emissive);
  const glowCorals = corals.filter((c) => c.emissive);

  if (regularCorals.length > 0) {
    const stemInst = new THREE.InstancedMesh(coralStemGeo, coralMat, regularCorals.length);
    const capInst = new THREE.InstancedMesh(coralCapGeo, coralMat, regularCorals.length);
    regularCorals.forEach((c, idx) => {
      const basePos = toFishManSphereLocal(c.x, c.y + 3.0 * c.scale, c.z, globeRadius);
      _dummy.position.set(basePos.x, basePos.y, basePos.z);
      _dummy.scale.setScalar(c.scale);
      _dummy.rotation.set(0, idx * 0.9, 0);
      _dummy.updateMatrix();
      stemInst.setMatrixAt(idx, _dummy.matrix);
      _tmpColor.setHex(c.colorHex);
      stemInst.setColorAt(idx, _tmpColor);

      const capPos = toFishManSphereLocal(c.x, c.y + 6.4 * c.scale, c.z, globeRadius);
      _dummy.position.set(capPos.x, capPos.y, capPos.z);
      _dummy.scale.set(c.scale * (c.kind === 'mushroom-pillar' ? 1.25 : 0.72), c.scale, c.scale * 1.1);
      _dummy.updateMatrix();
      capInst.setMatrixAt(idx, _dummy.matrix);
      capInst.setColorAt(idx, _tmpColor);
    });
    stemInst.instanceMatrix.needsUpdate = true;
    capInst.instanceMatrix.needsUpdate = true;
    if (stemInst.instanceColor) stemInst.instanceColor.needsUpdate = true;
    if (capInst.instanceColor) capInst.instanceColor.needsUpdate = true;
    group.add(stemInst, capInst);
  }

  if (glowCorals.length > 0) {
    const glowInst = new THREE.InstancedMesh(coralCapGeo, glowCoralMat, glowCorals.length);
    const glowStemInst = new THREE.InstancedMesh(coralStemGeo, glowCoralMat, glowCorals.length);
    glowCorals.forEach((c, idx) => {
      const stemPos = toFishManSphereLocal(c.x, c.y + 3.2 * c.scale, c.z, globeRadius);
      _dummy.position.set(stemPos.x, stemPos.y, stemPos.z);
      _dummy.scale.setScalar(c.scale);
      _dummy.rotation.set(0, idx * 1.1, 0);
      _dummy.updateMatrix();
      glowStemInst.setMatrixAt(idx, _dummy.matrix);
      _tmpColor.setHex(c.colorHex);
      glowStemInst.setColorAt(idx, _tmpColor);

      const capPos = toFishManSphereLocal(c.x, c.y + 6.8 * c.scale, c.z, globeRadius);
      _dummy.position.set(capPos.x, capPos.y, capPos.z);
      _dummy.scale.set(c.scale * 1.2, c.scale * 0.95, c.scale * 1.2);
      _dummy.updateMatrix();
      glowInst.setMatrixAt(idx, _dummy.matrix);
      glowInst.setColorAt(idx, _tmpColor);
    });
    glowInst.instanceMatrix.needsUpdate = true;
    glowStemInst.instanceMatrix.needsUpdate = true;
    if (glowInst.instanceColor) glowInst.instanceColor.needsUpdate = true;
    if (glowStemInst.instanceColor) glowStemInst.instanceColor.needsUpdate = true;
    group.add(glowStemInst, glowInst);
  }

  // Translucent Glowing Water-Road Arches
  const waterArchMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      roughness: 0.14,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
    })
  );
  for (const arch of buildFishManWaterArches()) {
    const pts = arch.points.map(([ax, ay, az]) => {
      const sp = toFishManSphereLocal(ax, ay, az, globeRadius);
      return new THREE.Vector3(sp.x, sp.y, sp.z);
    });
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = trackGeo(new THREE.TubeGeometry(curve, 26, arch.radius * S, 10, false));
    group.add(new THREE.Mesh(tubeGeo, waterArchMat));
  }

  // Floating Bubble Coral Villas overhead (image_97089472.png)
  const bubbleVillas: { grp: THREE.Group; baseX: number; baseY: number; baseZ: number; phase: number; amp: number }[] = [];
  for (const v of buildFishManBubbleVillas()) {
    const vg = new THREE.Group();
    vg.add(
      new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(v.bubbleRadius * S, 18, 14)),
        outerBubbleMat
      )
    );
    const miniIsland = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry((v.bubbleRadius * 0.62) * S, (v.bubbleRadius * 0.25) * S, 1.8 * S, 10)),
      getCityMat(0x5eead4)
    );
    miniIsland.position.y = -0.8 * S;
    vg.add(miniIsland);
    const miniHouse = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.6 * S, 2.8 * S, 8)),
      getCityMat(0xf472b6)
    );
    miniHouse.position.y = 1.2 * S;
    vg.add(miniHouse);
    placeOnFishManSphere(vg, v.x, v.y, v.z, globeRadius);
    group.add(vg);
    bubbleVillas.push({ grp: vg, baseX: v.x, baseY: v.y, baseZ: v.z, phase: v.phase, amp: v.bobAmp });
  }

  // Animated Striped Fish-Taxis towing Twin Bubble Pods (image_caf105b6.png)
  const fishTaxiMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x2dd4bf, roughness: 0.45 })
  );
  const capBlueMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.5 })
  );
  const fishTaxis: { grp: THREE.Group; cx: number; cz: number; rad: number; speed: number; phase: number }[] = [];
  const taxiRoutes = [
    { cx: 0, cz: 32, rad: 18, speed: 0.26, phase: 0.0 },
    { cx: -6, cz: 10, rad: 16, speed: -0.22, phase: 2.1 },
    { cx: 18, cz: 26, rad: 14, speed: 0.28, phase: 4.0 },
  ];
  for (const tr of taxiRoutes) {
    const fg = new THREE.Group();
    const fishBody = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(1.45 * S, 12, 10)),
      fishTaxiMat
    );
    fishBody.scale.set(0.8, 0.85, 1.55);
    fg.add(fishBody);
    const fishCap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.6 * S, 0.72 * S, 0.55 * S, 10)),
      capBlueMat
    );
    fishCap.position.set(0, 1.15 * S, 0.65 * S);
    fg.add(fishCap);
    for (const py of [2.1, 3.8]) {
      const pod = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(1.1 * S, 12, 10)),
        outerBubbleMat
      );
      pod.position.set(0, py * S, -0.4 * S);
      fg.add(pod);
    }
    placeOnFishManSphere(fg, tr.cx + tr.rad, 2.2, tr.cz, globeRadius);
    group.add(fg);
    fishTaxis.push({ grp: fg, ...tr });
  }

  // ---------------------------------------------------------------------------
  // 8. SEA FOREST: SHIPWRECKS, PONEGLYPH & QUEEN OTOHIME'S TOMB
  // ---------------------------------------------------------------------------
  const wreckWoodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b2f26, roughness: 0.9 })
  );
  for (const sw of buildFishManShipwrecks()) {
    const sg = new THREE.Group();
    const hull = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.4 * sw.scale * S, 3.4 * sw.scale * S, 13.5 * sw.scale * S)),
      wreckWoodMat
    );
    sg.add(hull);
    const mast = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.35 * S, 0.5 * S, 11.5 * sw.scale * S, 8)),
      wreckWoodMat
    );
    mast.position.y = 5.5 * sw.scale * S;
    mast.rotation.z = 0.25;
    sg.add(mast);
    placeOnFishManSphere(sg, sw.x, sw.y + 1.4, sw.z, globeRadius, sw.yaw);
    sg.rotateX(sw.pitch);
    sg.rotateZ(sw.roll);
    group.add(sg);
  }

  // Ancient Poneglyph Monolith
  const poneglyphTex = trackTex(createPoneglyphTexture());
  const poneglyphMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.6 * S, 5.2 * S, 4.6 * S)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: poneglyphTex,
        emissive: 0x0891b2,
        emissiveIntensity: 0.45,
        roughness: 0.4,
      })
    )
  );
  placeOnFishManSphere(
    poneglyphMesh,
    FISH_MAN_LANDMARKS.poneglyph.x,
    FISH_MAN_LANDMARKS.poneglyph.y + 2.6,
    FISH_MAN_LANDMARKS.poneglyph.z,
    globeRadius,
    0.4
  );
  group.add(poneglyphMesh);

  // Queen Otohime's Coral Memorial Tomb
  const tombGroup = new THREE.Group();
  const tombMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfce7f3, roughness: 0.55 })
  );
  tombGroup.add(
    new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(3.8 * S, 4.4 * S, 1.4 * S, 14)),
      tombMat
    )
  );
  const stele = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.9 * S, 4.8 * S, 1.1 * S)),
    tombMat
  );
  stele.position.y = 2.8 * S;
  tombGroup.add(stele);
  placeOnFishManSphere(
    tombGroup,
    FISH_MAN_LANDMARKS.otohimeTomb.x,
    FISH_MAN_LANDMARKS.otohimeTomb.y + 0.7,
    FISH_MAN_LANDMARKS.otohimeTomb.z,
    globeRadius,
    -0.5
  );
  group.add(tombGroup);

  // ---------------------------------------------------------------------------
  // 9. ABYSSAL OUTER FISH-MAN DISTRICT, COLOSSAL ARK NOAH & GIANT SEA KINGS
  // ---------------------------------------------------------------------------
  // Fish-Man District Rusted Industrial Wrecks
  const ironRustMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85, metalness: 0.42 })
  );
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const fx = FISH_MAN_LANDMARKS.fishManDistrict.x + Math.cos(ang) * 12;
    const fz = FISH_MAN_LANDMARKS.fishManDistrict.z + Math.sin(ang) * 10;
    const shack = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(6.2 * S, 5.2 * S, 7.8 * S)),
      ironRustMat
    );
    placeOnFishManSphere(shack, fx, -9.5, fz, globeRadius, ang * 0.7);
    group.add(shack);
  }

  // Colossal Ark Noah (massive timber ark encircled by heavy iron chains)
  const noahGroup = new THREE.Group();
  const noahTimberMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.86 })
  );
  const noahChainMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.72 })
  );

  // Titanic curved Noah hull (~94 meters long!)
  const noahHull = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(16 * S, 12 * S, 88 * S, 14)),
    noahTimberMat
  );
  noahHull.rotation.x = Math.PI / 2;
  noahHull.scale.set(1.15, 1.0, 0.78);
  noahGroup.add(noahHull);

  // Layered Ark Deckhouses & Prow Arch
  for (const [dy, w, h, len] of [
    [13, 18, 8, 52],
    [20, 13, 7, 36],
  ] as const) {
    const deck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(w * S, h * S, len * S)),
      noahTimberMat
    );
    deck.position.y = dy * S;
    noahGroup.add(deck);
  }

  const prow = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(13.5 * S, 24 * S, 10)),
    noahTimberMat
  );
  prow.rotation.x = Math.PI / 2;
  prow.position.z = 52 * S;
  noahGroup.add(prow);

  // Timber hull rib bands & Heavy hanging iron chain loops around Ark Noah
  const noahRibMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b2313, roughness: 0.9 })
  );
  for (const cz of [-36, -24, -12, 0, 12, 24, 36]) {
    const rib = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(15.2 * S, 0.65 * S, 6, 16)),
      noahRibMat
    );
    rib.scale.set(1.16, 0.8, 1.0);
    rib.position.z = cz * S;
    noahGroup.add(rib);
  }
  for (const cz of [-28, -10, 10, 28]) {
    const chainLoop = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(19 * S, 0.85 * S, 6, 20)),
      noahChainMat
    );
    chainLoop.position.z = cz * S;
    noahGroup.add(chainLoop);
  }

  placeOnFishManSphere(
    noahGroup,
    FISH_MAN_LANDMARKS.arkNoah.x,
    FISH_MAN_LANDMARKS.arkNoah.y,
    FISH_MAN_LANDMARKS.arkNoah.z,
    globeRadius,
    0.42
  );
  group.add(noahGroup);

  // Giant Striped Sea Kings patrolling around the bubble in oceanic gloom
  const seaKingStripedMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.62 })
  );
  const seaKingCoralCrestMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.55 })
  );
  const seaKings: { grp: THREE.Group; orbitRadius: number; baseY: number; angle: number; speed: number }[] = [];

  for (const sk of buildFishManSeaKings()) {
    const skg = new THREE.Group();
    const body = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(4.2 * sk.scale * S, 26 * sk.scale * S, 6, 12)),
      seaKingStripedMat
    );
    body.rotation.x = Math.PI / 2;
    skg.add(body);
    const tail = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(5.2 * sk.scale * S, 11 * sk.scale * S, 8)),
      seaKingStripedMat
    );
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = -18 * sk.scale * S;
    skg.add(tail);
    if (sk.kind === 'oarfish') {
      const crest = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.4 * S, 6.2 * sk.scale * S, 12 * sk.scale * S)),
        seaKingCoralCrestMat
      );
      crest.position.set(0, 4.5 * sk.scale * S, 6 * sk.scale * S);
      skg.add(crest);
    }
    const sx = Math.cos(sk.angle) * sk.orbitRadius;
    const sz = Math.sin(sk.angle) * sk.orbitRadius;
    placeOnFishManSphere(skg, sx, sk.baseY, sz, globeRadius, -sk.angle);
    group.add(skg);
    seaKings.push({
      grp: skg,
      orbitRadius: sk.orbitRadius,
      baseY: sk.baseY,
      angle: sk.angle,
      speed: sk.speed,
    });
  }

  return {
    group,
    radius: globeRadius - FISH_MAN_DEPTH,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      for (let i = 0; i < waterwheelSpinners.length; i++) {
        waterwheelSpinners[i].rotation.x = elapsed * 1.45 + i;
      }

      for (const bv of bubbleVillas) {
        const yOff = Math.sin(elapsed * 0.9 + bv.phase) * bv.amp;
        placeOnFishManSphere(
          bv.grp,
          bv.baseX,
          bv.baseY + yOff,
          bv.baseZ,
          globeRadius,
          elapsed * 0.12 + bv.phase
        );
      }

      for (const ft of fishTaxis) {
        const ang = elapsed * ft.speed + ft.phase;
        const fx = ft.cx + Math.cos(ang) * ft.rad;
        const fz = ft.cz + Math.sin(ang) * ft.rad;
        const fy = 1.6 + Math.sin(elapsed * 2.2 + ft.phase) * 0.35;
        placeOnFishManSphere(
          ft.grp,
          fx,
          fy,
          fz,
          globeRadius,
          -ang + (ft.speed >= 0 ? 0 : Math.PI)
        );
      }

      for (const sk of seaKings) {
        const ang = sk.angle + elapsed * sk.speed;
        const sx = Math.cos(ang) * sk.orbitRadius;
        const sz = Math.sin(ang) * sk.orbitRadius;
        const sy = sk.baseY + Math.sin(elapsed * 0.65 + sk.angle) * 4.2;
        placeOnFishManSphere(
          sk.grp,
          sx,
          sy,
          sz,
          globeRadius,
          -ang + (sk.speed >= 0 ? 0 : Math.PI)
        );
      }

      noahGroup.position.y += Math.sin(elapsed * 0.7) * 0.00018;
    },
  };
}
