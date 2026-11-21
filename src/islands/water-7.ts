import * as THREE from 'three';
import {
  WATER7_BRIDGES,
  WATER7_CANAL_ANGLES,
  WATER7_DOCK_SPECS,
  WATER7_FOUNTAIN_BASE_Y,
  WATER7_FOUNTAIN_DRUM_RADIUS,
  WATER7_GALLEY_STATION,
  WATER7_GLOBE_SCALE,
  WATER7_SEAWALL_RADIUS,
  WATER7_STAIR_ANGLES,
  WATER7_VIADUCT,
  WATER7_WORLD_SIZE,
  buildWater7Cranes,
  buildWater7Houses,
  sampleWater7CanalWaterHeight,
  sampleWater7Height,
  toWater7SphereLocal,
  water7CanalSignedDist,
  water7RoadSignedDist,
} from '../utils/water7Terrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = WATER7_GLOBE_SCALE;
const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);
const _localNormal = new THREE.Vector3();
const _tiltQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();
const _xAxis = new THREE.Vector3(1, 0, 0);
const _yAxis = new THREE.Vector3(0, 1, 0);
const _pitchQuat = new THREE.Quaternion();

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

function createWater7TerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = WATER7_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * WATER7_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * WATER7_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const r = Math.hypot(x, z);
      const h = sampleWater7Height(x, z);
      const hx = sampleWater7Height(x + 0.9, z);
      const hz = sampleWater7Height(x, z + 0.9);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 1.8, 0, 1);

      const fineGrain = (valueNoise2D(x * 1.6, z * 1.6) - 0.5) * 10;
      const tile =
        ((Math.floor(x * 1.1) + Math.floor(z * 1.1)) & 1) === 0 ? 4 : -4;

      // Base warm limestone terrace plaza
      let rgb: [number, number, number] = [232 + tile, 226 + tile, 214 + tile];

      // Cobblestone concentric ring avenues & stairways with paver joints & curb trim
      const roadD = water7RoadSignedDist(x, z);
      if (roadD < 0.45 && r < WATER7_SEAWALL_RADIUS) {
        const roadT = 1 - smoothstep(-0.2, 0.4, roadD);
        const paverU = Math.sin(r * 6.5);
        const paverV = Math.sin(Math.atan2(z, x) * r * 3.2);
        const cobble = (paverU * paverV) * 7;
        const isCurb = roadD > -0.25 && roadD < 0.28;
        const roadRgb: [number, number, number] = isCurb
          ? [236, 234, 228]
          : [186 + cobble, 192 + cobble, 204 + cobble];
        rgb = mixRgb(rgb, roadRgb, roadT * 0.88);
      }

      // Stepped white marble retaining walls with subtle azure mortar shadow
      if (slope > 0.25) {
        const wallT = smoothstep(0.25, 0.68, slope);
        const masonryBand = Math.sin(h * 3.0) * 8;
        rgb = mixRgb(
          rgb,
          [214 + masonryBand, 218 + masonryBand, 224 + masonryBand],
          wallT * 0.92
        );
      }

      // Subtle cobalt-blue rim trim right along the outer seawall edge
      if (r > WATER7_SEAWALL_RADIUS - 1.4 && r < WATER7_SEAWALL_RADIUS + 1.2) {
        const rimT =
          1 - smoothstep(0.2, 1.3, Math.abs(r - WATER7_SEAWALL_RADIUS));
        rgb = mixRgb(rgb, [46, 108, 196], rimT * 0.55);
      }

      // Canal bed stone lining
      const canalD = water7CanalSignedDist(x, z);
      if (canalD < 0.5) {
        const bedT = 1 - smoothstep(-0.3, 0.5, canalD);
        rgb = mixRgb(rgb, [82, 168, 186], bedT * 0.78);
      }

      // Crisp circular alpha cutoff right outside seawall bastions
      const outerMask = 1 - smoothstep(WATER7_SEAWALL_RADIUS + 2.5, WATER7_SEAWALL_RADIUS + 6.5, r);

      data[idx] = clamp(Math.round(rgb[0] + fineGrain), 0, 255);
      data[idx + 1] = clamp(Math.round(rgb[1] + fineGrain), 0, 255);
      data[idx + 2] = clamp(Math.round(rgb[2] + fineGrain), 0, 255);
      data[idx + 3] = clamp(Math.round(outerMask * 255), 0, 255);
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createWater7LagoonTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = WATER7_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * WATER7_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * WATER7_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;
      const r = Math.hypot(x, z);

      let alpha = 0;
      let rgb: [number, number, number] = [44, 152, 184];
      if (r >= 70 && r <= 116) {
        const reefNoise =
          valueNoise2D(x * 0.11 + 1.3, z * 0.11 + 4.7) * 0.65 +
          valueNoise2D(x * 0.28, z * 0.28) * 0.35;
        const innerFade = smoothstep(70, 76, r);
        const outerFade = 1 - smoothstep(86, 115, r);
        const foam =
          1 - smoothstep(0.0, 3.2, Math.abs(r - WATER7_SEAWALL_RADIUS - 2.2));
        rgb = mixRgb([68, 198, 214], [24, 114, 162], smoothstep(76, 108, r));
        rgb = mixRgb(rgb, [198, 244, 250], foam * 0.65 + reefNoise * 0.14);
        alpha = innerFade * outerFade * 0.88;
      }

      data[idx] = Math.round(rgb[0]);
      data[idx + 1] = Math.round(rgb[1]);
      data[idx + 2] = Math.round(rgb[2]);
      data[idx + 3] = Math.round(clamp(alpha, 0, 1) * 255);
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createTileableStoneBump(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n =
        valueNoise2D((x / size) * 24, (y / size) * 24) * 0.65 +
        valueNoise2D((x / size) * 64, (y / size) * 64) * 0.35;
      const v = clamp(Math.round(n * 255), 0, 255);
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

function createDockNumeralTexture(numeral: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f2f0eb';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#1e50b5';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 116, 116);
    ctx.fillStyle = '#1e56c2';
    ctx.font = 'bold 88px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(numeral, 64, 68);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createGableRoofGeometry(): THREE.BufferGeometry {
  // Triangular prism roof (width 1 along X, depth 1 along Z, height 0.55 along Y, ridge along X)
  const hw = 0.54;
  const hd = 0.54;
  const h = 0.54;
  const vertices = new Float32Array([
    // Front slope (+Z)
    -hw, 0, hd,  hw, 0, hd,  hw, h, 0,
    -hw, 0, hd,  hw, h, 0,  -hw, h, 0,
    // Back slope (-Z)
     hw, 0, -hd, -hw, 0, -hd, -hw, h, 0,
     hw, 0, -hd, -hw, h, 0,   hw, h, 0,
    // Left gable (-X)
    -hw, 0, -hd, -hw, 0, hd, -hw, h, 0,
    // Right gable (+X)
     hw, 0, hd,   hw, 0, -hd, hw, h, 0,
    // Bottom cap
    -hw, 0, -hd, hw, 0, -hd, hw, 0, hd,
    -hw, 0, -hd, hw, 0, hd, -hw, 0, hd,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.computeVertexNormals();
  return geo;
}

function setSphereInstMatrix(
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch: number,
  sx: number,
  sy: number,
  sz: number,
  globeRadius: number
): THREE.Matrix4 {
  const pos = toWater7SphereLocal(x, y, z, globeRadius);
  _localNormal.set(pos.x, globeRadius + pos.y, pos.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
  if (pitch !== 0) {
    _pitchQuat.setFromAxisAngle(_xAxis, pitch);
    _dummy.quaternion.multiply(_pitchQuat);
  }
  _dummy.position.set(pos.x, pos.y, pos.z);
  _dummy.scale.set(sx * S, sy * S, sz * S);
  _dummy.updateMatrix();
  return _dummy.matrix;
}

function placeOnWater7Sphere(
  obj: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  globeRadius: number,
  yaw = 0
): void {
  const pos = toWater7SphereLocal(x, y, z, globeRadius);
  obj.position.set(pos.x, pos.y, pos.z);
  _localNormal.set(pos.x, globeRadius + pos.y, pos.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

/**
 * Water Seven — Faithful 3D model matching water_seven_84e9eef9.jpg:
 * concentric limestone terraces, terracotta-roofed Venetian houses,
 * cobblestone ring avenues & stairways, 6 elevated radial turquoise canals,
 * 24 arched pedestrian bridges, Dock 1/2/3 bastions, blue-roofed Galley-La
 * classical station, SE Sea Train viaduct, shipyard cranes, and the towering
 * 3-tier cobalt-rimmed Central Fountain Spire.
 */
export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const group = new THREE.Group();
  group.name = 'island-water-7';

  const registerTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;

  // 1. Curved Spherical Tiered Terrain & Limestone Masonry Mesh (192 x 192)
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(WATER7_WORLD_SIZE, WATER7_WORLD_SIZE, 192, 192)
  );
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const ly = sampleWater7Height(lx, lz);
    const projected = toWater7SphereLocal(lx, ly, lz, globeRadius);
    posAttr.setXYZ(i, projected.x, projected.y, projected.z);
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainTex = registerTex(createWater7TerrainTexture(1024));
  const bumpTex = registerTex(createTileableStoneBump(256));
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      bumpMap: bumpTex,
      bumpScale: 0.003,
      roughness: 0.78,
      metalness: 0.04,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  group.add(terrainMesh);

  // 2. Shallow Turquoise Coral Lagoon & Reef Skirt around Water Seven
  const lagoonGeo = trackGeo(
    new THREE.PlaneGeometry(WATER7_WORLD_SIZE, WATER7_WORLD_SIZE, 72, 72)
  );
  lagoonGeo.rotateX(-Math.PI / 2);
  const lAttr = lagoonGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < lAttr.count; i++) {
    const lx = lAttr.getX(i);
    const lz = lAttr.getZ(i);
    const projected = toWater7SphereLocal(lx, 0.1, lz, globeRadius);
    lAttr.setXYZ(i, projected.x, projected.y, projected.z);
  }
  lAttr.needsUpdate = true;
  lagoonGeo.computeVertexNormals();

  const lagoonTex = registerTex(createWater7LagoonTexture(1024));
  const lagoonMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: lagoonTex,
      roughness: 0.16,
      metalness: 0.16,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  group.add(new THREE.Mesh(lagoonGeo, lagoonMat));

  // Shared Architectural & Maritime Materials
  const whiteStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4f1ea,
      roughness: 0.68,
      metalness: 0.04,
    })
  );
  const paleTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdce0e8,
      roughness: 0.74,
      metalness: 0.05,
    })
  );
  const cobaltBlueMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1d52b8,
      roughness: 0.36,
      metalness: 0.14,
    })
  );
  const royalRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2068d8,
      roughness: 0.42,
      metalness: 0.12,
    })
  );
  const canalWaterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x45d6e6,
      emissive: 0x1889a8,
      emissiveIntensity: 0.28,
      roughness: 0.14,
      metalness: 0.12,
      transparent: true,
      opacity: 0.88,
    })
  );
  const waterfallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x74ecff,
      emissive: 0x25a4c8,
      emissiveIntensity: 0.35,
      roughness: 0.18,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    })
  );
  const timberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc4954e,
      roughness: 0.82,
      metalness: 0.05,
    })
  );
  const darkWoodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c3c20,
      roughness: 0.88,
    })
  );

  // 3. Outer Defensive Seawall, Blue Mosaic Trim, Canal Sea Gates & Dock 1/2/3 Bastions
  const seawallSegments = 60;
  const wallSegGeo = trackGeo(new THREE.BoxGeometry(8.2 * S, 4.2 * S, 1.8 * S));
  const rimSegGeo = trackGeo(new THREE.BoxGeometry(8.3 * S, 0.72 * S, 1.95 * S));

  for (let i = 0; i < seawallSegments; i++) {
    const ang = (i / seawallSegments) * Math.PI * 2;
    const isNearCanal = WATER7_CANAL_ANGLES.some((ca) => {
      let d = Math.abs(ang - ca);
      if (d > Math.PI) d = Math.PI * 2 - d;
      return d < 0.068;
    });
    if (isNearCanal) continue;

    const wx = Math.cos(ang) * WATER7_SEAWALL_RADIUS;
    const wz = Math.sin(ang) * WATER7_SEAWALL_RADIUS;
    const yaw = -ang + Math.PI * 0.5;

    const wall = new THREE.Mesh(wallSegGeo, whiteStoneMat);
    placeOnWater7Sphere(wall, wx, 1.5, wz, globeRadius, yaw);
    const rim = new THREE.Mesh(rimSegGeo, cobaltBlueMat);
    placeOnWater7Sphere(rim, wx, 3.8, wz, globeRadius, yaw);
    group.add(wall, rim);
  }

  // Dock 1, 2, 3 Bastions + Grand Sea Stairs + Blue Numeral Plaques
  const bastionGeo = trackGeo(new THREE.BoxGeometry(7.2 * S, 6.2 * S, 5.2 * S));
  const dockPlaqueGeo = trackGeo(new THREE.PlaneGeometry(3.4 * S, 3.4 * S));
  WATER7_DOCK_SPECS.forEach((dock) => {
    const bx = Math.cos(dock.angle) * dock.r;
    const bz = Math.sin(dock.angle) * dock.r;
    const yaw = -dock.angle + Math.PI * 0.5;

    const bGroup = new THREE.Group();
    placeOnWater7Sphere(bGroup, bx, 0.75, bz, globeRadius, yaw);

    const pillar = new THREE.Mesh(bastionGeo, whiteStoneMat);
    bGroup.add(pillar);

    const blueCap = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(7.45 * S, 0.65 * S, 5.45 * S)),
      cobaltBlueMat
    );
    blueCap.position.y = 3.2 * S;
    bGroup.add(blueCap);

    // Grand stepped stone stairs descending cleanly into the sea beside each Dock bastion
    for (let st = 0; st < 5; st++) {
      const stair = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(3.8 * S, 1.1 * S, (4.6 - st * 0.72) * S)),
        paleTrimMat
      );
      stair.position.set(5.2 * S, (-0.75 + st * 0.65) * S, (0.8 - st * 0.35) * S);
      bGroup.add(stair);
    }

    // Blue Numeral Signboard ("1", "2", "3") facing outward toward harbor
    const numTex = registerTex(createDockNumeralTexture(dock.dockNum));
    const plaqueMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: numTex,
        roughness: 0.55,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    const plaque = new THREE.Mesh(dockPlaqueGeo, plaqueMat);
    plaque.position.set(0, 1.2 * S, 2.66 * S);
    bGroup.add(plaque);

    group.add(bGroup);
  });

  // 4. Grand Blue Station Sea Train Terminal + 4-Track Green-Roofed Yard (image_3aba9074 + image_2b1d7bc6)
  {
    const gx = Math.cos(WATER7_GALLEY_STATION.angle) * WATER7_GALLEY_STATION.r;
    const gz = Math.sin(WATER7_GALLEY_STATION.angle) * WATER7_GALLEY_STATION.r;
    const gyaw = -WATER7_GALLEY_STATION.angle + Math.PI * 0.5;
    const gGroup = new THREE.Group();
    placeOnWater7Sphere(gGroup, gx, 2.6, gz, globeRadius, gyaw);

    // Sculpted Pale Limestone City Backdrop Wall behind Blue Station with arched colonnade bays (image_3aba9074)
    const cityWall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(20.0 * S, 16.5 * S, 3.0 * S)),
      whiteStoneMat
    );
    cityWall.position.set(0, 8.2 * S, -3.2 * S);
    gGroup.add(cityWall);

    const wallCorniceGeo = trackGeo(new THREE.BoxGeometry(20.4 * S, 0.75 * S, 3.3 * S));
    for (const cy of [10.6, 15.8]) {
      const cornice = new THREE.Mesh(wallCorniceGeo, paleTrimMat);
      cornice.position.set(0, cy * S, -3.2 * S);
      gGroup.add(cornice);
    }
    const wallMosaicBand = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(20.3 * S, 0.45 * S, 3.35 * S)),
      cobaltBlueMat
    );
    wallMosaicBand.position.set(0, 15.1 * S, -3.2 * S);
    gGroup.add(wallMosaicBand);

    const wallWindowGeo = trackGeo(new THREE.BoxGeometry(1.1 * S, 2.8 * S, 0.3 * S));
    for (const wx of [-7.8, -5.6, 5.6, 7.8]) {
      for (const wy of [8.6, 12.8]) {
        const win = new THREE.Mesh(wallWindowGeo, darkWoodMat);
        win.position.set(wx * S, wy * S, -1.65 * S);
        gGroup.add(win);
      }
    }

    // Stone Quay Foundation extending cleanly below sea level
    const quayFoundation = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(24.0 * S, 5.6 * S, 10.6 * S)),
      paleTrimMat
    );
    quayFoundation.position.set(0, -1.3 * S, 0.2 * S);
    gGroup.add(quayFoundation);

    // Flanking Classical Colonnade Wings (blue slate roofs + row of dark arch bays)
    const wingGeo = trackGeo(new THREE.BoxGeometry(6.8 * S, 4.4 * S, 5.6 * S));
    const wingRoofGeo = trackGeo(new THREE.BoxGeometry(7.2 * S, 0.9 * S, 6.2 * S));
    const wingArchGeo = trackGeo(new THREE.BoxGeometry(0.95 * S, 2.2 * S, 0.25 * S));
    for (const wx of [-8.0, 8.0]) {
      const wing = new THREE.Mesh(wingGeo, whiteStoneMat);
      wing.position.set(wx * S, 3.6 * S, -0.4 * S);
      const wRoof = new THREE.Mesh(wingRoofGeo, royalRoofMat);
      wRoof.position.set(wx * S, 6.1 * S, -0.4 * S);
      gGroup.add(wing, wRoof);
      for (const ax of [-2.1, -0.7, 0.7, 2.1]) {
        const arch = new THREE.Mesh(wingArchGeo, darkWoodMat);
        arch.position.set((wx + ax) * S, 2.75 * S, 2.45 * S);
        gGroup.add(arch);
      }
    }

    // Twin Vertical Waterfall Spillways flanking Blue Station (image_3aba9074)
    for (const sx of [-12.2, 12.2]) {
      const sluiceFrame = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.0 * S, 9.6 * S, 3.2 * S)),
        paleTrimMat
      );
      sluiceFrame.position.set((sx > 0 ? sx - 0.9 : sx + 0.9) * S, 5.4 * S, -1.0 * S);
      const spillway = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(2.6 * S, 9.4 * S, 1.2 * S)),
        waterfallMat
      );
      spillway.position.set(sx * S, 4.8 * S, -0.8 * S);
      gGroup.add(sluiceFrame, spillway);
    }

    // Central Grand Classical Portico + "BLUE STATION" Banner + Ringed Turquoise Dome
    const mainBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(9.6 * S, 6.0 * S, 7.6 * S)),
      whiteStoneMat
    );
    mainBody.position.y = 4.4 * S;
    gGroup.add(mainBody);

    const colGeo = trackGeo(new THREE.CylinderGeometry(0.28 * S, 0.32 * S, 5.4 * S, 10));
    for (let c = -2.5; c <= 2.5; c += 1) {
      const col = new THREE.Mesh(colGeo, whiteStoneMat);
      col.position.set(c * 1.48 * S, 4.2 * S, 4.0 * S);
      gGroup.add(col);
    }

    const portalOpening = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.8 * S, 4.6 * S, 0.5 * S)),
      darkWoodMat
    );
    portalOpening.position.set(0, 3.4 * S, 3.85 * S);
    gGroup.add(portalOpening);

    const architrave = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(10.0 * S, 0.7 * S, 8.8 * S)),
      whiteStoneMat
    );
    architrave.position.set(0, 7.2 * S, 0.3 * S);
    gGroup.add(architrave);

    // Canvas-textured Pediment Sign "BLUE STATION"
    const bsCanvas = document.createElement('canvas');
    bsCanvas.width = 512;
    bsCanvas.height = 128;
    const bctx = bsCanvas.getContext('2d');
    if (bctx) {
      bctx.fillStyle = '#f2efe6';
      bctx.fillRect(0, 0, 512, 128);
      bctx.strokeStyle = '#d4a842';
      bctx.lineWidth = 10;
      bctx.strokeRect(6, 6, 500, 116);
      bctx.fillStyle = '#334e68';
      bctx.font = 'bold 54px Georgia, serif';
      bctx.textAlign = 'center';
      bctx.textBaseline = 'middle';
      bctx.fillText('BLUE STATION', 256, 66);
    }
    const bsTex = registerTex(new THREE.CanvasTexture(bsCanvas));
    bsTex.colorSpace = THREE.SRGBColorSpace;
    const bsSignMat = trackMat(new THREE.MeshStandardMaterial({ map: bsTex, roughness: 0.5 }));
    const bsSign = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(7.8 * S, 1.8 * S)),
      bsSignMat
    );
    bsSign.position.set(0, 7.8 * S, 4.78 * S);
    gGroup.add(bsSign);

    const gableGeo = trackGeo(createGableRoofGeometry());
    const gableRoof = new THREE.Mesh(gableGeo, royalRoofMat);
    gableRoof.rotation.y = Math.PI * 0.5;
    gableRoof.position.set(0, 7.55 * S, 0.1 * S);
    gableRoof.scale.set(8.4 * S, 5.2 * S, 10.0 * S);
    const tympanum = new THREE.Mesh(gableGeo, whiteStoneMat);
    tympanum.rotation.y = Math.PI * 0.5;
    tympanum.position.set(0, 7.52 * S, 4.35 * S);
    tympanum.scale.set(1.2 * S, 4.6 * S, 8.6 * S);
    gGroup.add(gableRoof, tympanum);

    // Giant Horizontally-Ringed Turquoise/Sky-Blue Dome & White Finial Spire (image_3aba9074)
    const domeLower = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(4.4 * S, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x4ca6d8, roughness: 0.35 }))
    );
    domeLower.position.set(0, 9.8 * S, -0.4 * S);
    const domeBand = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(3.85 * S, 0.35 * S, 8, 22)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x89d4f2, roughness: 0.32 }))
    );
    domeBand.rotation.x = Math.PI * 0.5;
    domeBand.position.set(0, 11.4 * S, -0.4 * S);
    const domeSpire = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.45 * S, 3.2 * S, 10)),
      whiteStoneMat
    );
    domeSpire.position.set(0, 15.2 * S, -0.4 * S);
    gGroup.add(domeLower, domeBand, domeSpire);

    group.add(gGroup);

    // 4B. 4 Parallel Green-Gabled Sea Train Terminal Pier Sheds + Containers extending seaward (image_2b1d7bc6)
    const shedMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x3ba88f, roughness: 0.42, metalness: 0.14 })
    );
    const containerMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x9e3b33, roughness: 0.65 })
    );
    const yardRailMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x6f96b8, roughness: 0.35, metalness: 0.6 })
    );

    const yardLen = 28.5;
    const yardMidR = 75.0 + yardLen * 0.5;
    const yardX = Math.cos(WATER7_GALLEY_STATION.angle) * yardMidR;
    const yardZ = Math.sin(WATER7_GALLEY_STATION.angle) * yardMidR;
    const yardGroup = new THREE.Group();
    placeOnWater7Sphere(yardGroup, yardX, 0.6, yardZ, globeRadius, gyaw);

    // 4 Parallel Concrete Piers & Green Ridged Platform Canopies
    for (const px of [-6.6, -2.2, 2.2, 6.6]) {
      const pierSlab = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.95 * S, 1.3 * S, yardLen * S)),
        whiteStoneMat
      );
      pierSlab.position.set(px * S, 0.2 * S, 0);
      const canopy = new THREE.Mesh(gableGeo, shedMat);
      canopy.position.set(px * S, 1.9 * S, -1.0 * S);
      canopy.scale.set(2.15 * S, 1.35 * S, (yardLen - 2.5) * S);
      yardGroup.add(pierSlab, canopy);

      // Red Freight Containers parked cleanly on pier decks
      for (const cz of [-7.5, 4.2]) {
        if (Math.abs(px) > 4.0 || cz < 0) {
          const box = new THREE.Mesh(
            trackGeo(new THREE.BoxGeometry(1.1 * S, 0.9 * S, 2.8 * S)),
            containerMat
          );
          box.position.set(px * S, 1.3 * S, cz * S);
          yardGroup.add(box);
        }
      }
    }

    // 3 Submerged Harbor Sea Train Tracks exiting toward Shift Station
    for (const tx of [-4.4, 0.0, 4.4]) {
      for (const rOff of [-0.45, 0.45]) {
        const rail = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.14 * S, 0.14 * S, (yardLen + 4.0) * S)),
          yardRailMat
        );
        rail.position.set((tx + rOff) * S, -0.35 * S, 1.5 * S);
        yardGroup.add(rail);
      }
    }

    // Stationary docked green/crimson Sea Train car in central track bay
    const dockedTrainBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.35 * S, 1.45 * S, 8.5 * S)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x1b4d38, roughness: 0.46 }))
    );
    dockedTrainBody.position.set(0, 0.85 * S, -2.0 * S);
    const dockedTrainRoof = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.48 * S, 0.25 * S, 8.7 * S)),
      containerMat
    );
    dockedTrainRoof.position.set(0, 1.68 * S, -2.0 * S);
    yardGroup.add(dockedTrainBody, dockedTrainRoof);

    group.add(yardGroup);
  }

  // 5. SE Arched Sea Train Viaduct Ramp curving out into the Lagoon + Orange Beacon Turret (image_2b1d7bc6)
  {
    const vGroup = new THREE.Group();
    const midR = (WATER7_VIADUCT.rStart + WATER7_VIADUCT.rEnd) * 0.5;
    const vx = Math.cos(WATER7_VIADUCT.angle) * midR;
    const vz = Math.sin(WATER7_VIADUCT.angle) * midR;
    const vy = (WATER7_VIADUCT.startY + WATER7_VIADUCT.endY) * 0.5;
    const vLen = WATER7_VIADUCT.rEnd - WATER7_VIADUCT.rStart;
    const vYaw = -WATER7_VIADUCT.angle;

    placeOnWater7Sphere(vGroup, vx, vy, vz, globeRadius, vYaw);
    const slopeAngle = Math.atan2(
      WATER7_VIADUCT.startY - WATER7_VIADUCT.endY,
      vLen
    );

    const deck = new THREE.Mesh(
      trackGeo(
        new THREE.BoxGeometry(
          vLen * S,
          0.7 * S,
          WATER7_VIADUCT.halfWidth * 2 * S
        )
      ),
      whiteStoneMat
    );
    deck.rotation.z = -slopeAngle;
    vGroup.add(deck);

    for (const side of [-WATER7_VIADUCT.halfWidth * 0.92, WATER7_VIADUCT.halfWidth * 0.92]) {
      const curb = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(vLen * S, 0.55 * S, 0.45 * S)),
        cobaltBlueMat
      );
      curb.position.set(0, 0.45 * S, side * S);
      curb.rotation.z = -slopeAngle;
      vGroup.add(curb);
    }

    // 7 Arched Viaduct Support Piers standing in the turquoise water
    const pierGeo = trackGeo(new THREE.BoxGeometry(1.5 * S, 4.6 * S, 4.2 * S));
    for (let p = 0; p < 7; p++) {
      const t = (p + 0.5) / 7 - 0.5;
      const px = t * vLen;
      const py = -slopeAngle * px - 2.1;
      const pier = new THREE.Mesh(pierGeo, paleTrimMat);
      pier.position.set(px * S, py * S, 0);
      vGroup.add(pier);
    }

    // Orange-Roofed Viaduct Beacon Lighthouse Turret at outer gate (image_2b1d7bc6)
    const turretBase = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.15 * S, 1.35 * S, 5.2 * S, 12)),
      whiteStoneMat
    );
    turretBase.position.set((vLen * 0.5 - 0.8) * S, -slopeAngle * (vLen * 0.5 - 0.8) * S + 1.8 * S, 0);
    const turretRoof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.4 * S, 2.0 * S, 12)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xd96b38, roughness: 0.55 }))
    );
    turretRoof.position.set(
      turretBase.position.x,
      turretBase.position.y + 3.5 * S,
      0
    );
    vGroup.add(turretBase, turretRoof);
    group.add(vGroup);
  }

  // 6. 6 Radial Elevated Turquoise Aqueduct Canals + Sea-Gate Portals + Waterfalls
  const gatePostGeo = trackGeo(new THREE.BoxGeometry(1.5 * S, 6.2 * S, 2.2 * S));
  const gateLintelGeo = trackGeo(new THREE.BoxGeometry(7.2 * S, 1.5 * S, 2.4 * S));
  const canalWallSegGeo = trackGeo(new THREE.BoxGeometry(5.6 * S, 1.8 * S, 0.65 * S));

  WATER7_CANAL_ANGLES.forEach((ca) => {
    const yaw = -ca;

    // Stepped cascading turquoise canal water ribbon from Drum to Sea Gate
    const steps = 14;
    const r0 = WATER7_FOUNTAIN_DRUM_RADIUS - 0.5;
    const r1 = WATER7_SEAWALL_RADIUS + 4.5;
    const dr = (r1 - r0) / steps;

    for (let s = 0; s < steps; s++) {
      const ra = r0 + s * dr;
      const rb = ra + dr;
      const rMid = (ra + rb) * 0.5;
      const ya = sampleWater7CanalWaterHeight(ra);
      const yb = sampleWater7CanalWaterHeight(rb);
      const yMid = (ya + yb) * 0.5;
      const segLen = Math.hypot(dr, ya - yb) + 0.4;
      const slope = Math.atan2(ya - yb, dr);

      const cx = Math.cos(ca) * rMid;
      const cz = Math.sin(ca) * rMid;

      const cMesh = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(segLen * S, 0.45 * S, 3.9 * S)),
        canalWaterMat
      );
      placeOnWater7Sphere(cMesh, cx, yMid, cz, globeRadius, yaw);
      cMesh.rotateZ(-slope);
      group.add(cMesh);

      // Flanking stone aqueduct parapet walls
      if (s < steps - 1) {
        for (const side of [-2.2, 2.2]) {
          const sx = cx - Math.sin(ca) * side;
          const sz = cz + Math.cos(ca) * side;
          const wall = new THREE.Mesh(canalWallSegGeo, whiteStoneMat);
          placeOnWater7Sphere(wall, sx, yMid + 0.3, sz, globeRadius, yaw);
          wall.rotateZ(-slope);
          group.add(wall);
        }
      }
    }

    // Arched Sea-Gate Portal & Waterfall Spillway at the outer seawall
    const gx = Math.cos(ca) * WATER7_SEAWALL_RADIUS;
    const gz = Math.sin(ca) * WATER7_SEAWALL_RADIUS;
    const gateGroup = new THREE.Group();
    placeOnWater7Sphere(gateGroup, gx, 2.6, gz, globeRadius, yaw + Math.PI * 0.5);

    const postL = new THREE.Mesh(gatePostGeo, whiteStoneMat);
    postL.position.set(-2.9 * S, 0.4 * S, 0);
    const postR = new THREE.Mesh(gatePostGeo, whiteStoneMat);
    postR.position.set(2.9 * S, 0.4 * S, 0);
    const lintel = new THREE.Mesh(gateLintelGeo, cobaltBlueMat);
    lintel.position.set(0, 3.6 * S, 0);
    const spill = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.6 * S, 3.4 * S, 0.9 * S)),
      waterfallMat
    );
    spill.position.set(0, -1.4 * S, 1.5 * S);
    gateGroup.add(postL, postR, lintel, spill);
    group.add(gateGroup);
  });

  // 7. 24 Arched White-Stone Pedestrian Bridges Crossing Radial Canals
  const bridgeArchGeo = trackGeo(new THREE.BoxGeometry(1, 0.46, 1));
  const bridgeRailGeo = trackGeo(new THREE.BoxGeometry(1, 0.55, 0.14));
  WATER7_BRIDGES.forEach((b) => {
    const bGroup = new THREE.Group();
    placeOnWater7Sphere(bGroup, b.x, b.y, b.z, globeRadius, b.yaw);

    const deck = new THREE.Mesh(bridgeArchGeo, whiteStoneMat);
    deck.scale.set(b.length * S, 1 * S, b.width * S);
    bGroup.add(deck);

    for (const side of [-b.width * 0.44, b.width * 0.44]) {
      const rail = new THREE.Mesh(bridgeRailGeo, paleTrimMat);
      rail.scale.set(b.length * S, 1 * S, 1 * S);
      rail.position.set(0, 0.42 * S, side * S);
      const blueTop = new THREE.Mesh(bridgeRailGeo, cobaltBlueMat);
      blueTop.scale.set(b.length * S, 0.35 * S, 1.15 * S);
      blueTop.position.set(0, 0.72 * S, side * S);
      bGroup.add(rail, blueTop);
    }
    group.add(bGroup);
  });

  // 8. Multi-Part Instanced Venetian Stone Houses with Terracotta Roofs
  const houses = buildWater7Houses();
  const unitBoxGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const gableGeo = trackGeo(createGableRoofGeometry());

  const wallMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.76 })
  );
  const roofMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.64 })
  );
  const roofRidgeMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xa63919, roughness: 0.72 })
  );
  const darkPortalMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.88 })
  );
  const shutterMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x26384d, roughness: 0.75 })
  );
  const winMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c6878,
      emissive: 0xffd584,
      emissiveIntensity: 0.28,
      roughness: 0.38,
    })
  );

  const plinthInst = new THREE.InstancedMesh(
    unitBoxGeo,
    paleTrimMat,
    houses.length
  );
  const wallInst = new THREE.InstancedMesh(unitBoxGeo, wallMat, houses.length);
  const eaveInst = new THREE.InstancedMesh(
    unitBoxGeo,
    whiteStoneMat,
    houses.length
  );
  const roofInst = new THREE.InstancedMesh(gableGeo, roofMat, houses.length);
  const ridgeInst = new THREE.InstancedMesh(
    unitBoxGeo,
    roofRidgeMat,
    houses.length
  );
  const doorInst = new THREE.InstancedMesh(
    unitBoxGeo,
    darkPortalMat,
    houses.length
  );

  const detailGroup = new THREE.Group();
  const winFrameInst = new THREE.InstancedMesh(
    unitBoxGeo,
    shutterMat,
    houses.length * 4
  );
  const winInst = new THREE.InstancedMesh(
    unitBoxGeo,
    winMat,
    houses.length * 4
  );
  const balconyInst = new THREE.InstancedMesh(
    unitBoxGeo,
    paleTrimMat,
    houses.length
  );
  const chimneyInst = new THREE.InstancedMesh(
    unitBoxGeo,
    whiteStoneMat,
    houses.length
  );

  houses.forEach((h, i) => {
    plinthInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x,
        h.y + 0.15,
        h.z,
        h.yaw,
        0,
        h.width * 1.06,
        0.7,
        h.depth * 1.06,
        globeRadius
      )
    );
    wallInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x,
        h.y + h.height * 0.5 + 0.25,
        h.z,
        h.yaw,
        0,
        h.width,
        h.height,
        h.depth,
        globeRadius
      )
    );
    _tmpColor.setHex(h.wallColor);
    wallInst.setColorAt(i, _tmpColor);

    eaveInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x,
        h.y + h.height + 0.26,
        h.z,
        h.yaw,
        0,
        h.width * 1.08,
        0.24,
        h.depth * 1.08,
        globeRadius
      )
    );

    roofInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x,
        h.y + h.height + 0.34,
        h.z,
        h.yaw,
        0,
        h.width,
        h.height * 0.85,
        h.depth,
        globeRadius
      )
    );
    _tmpColor.setHex(h.roofColor);
    roofInst.setColorAt(i, _tmpColor);

    ridgeInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x,
        h.y + h.height + 0.34 + h.height * 0.85 * 0.54,
        h.z,
        h.yaw,
        0,
        h.width * 1.06,
        0.18,
        0.24,
        globeRadius
      )
    );

    const sinY = Math.sin(h.yaw);
    const cosY = Math.cos(h.yaw);
    const frontOff = h.depth * 0.5 + 0.03;
    const paneOff = h.depth * 0.5 + 0.06;

    // Ground-floor dark arched entrance
    doorInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x + sinY * frontOff,
        h.y + 0.92,
        h.z + cosY * frontOff,
        h.yaw,
        0,
        0.74,
        1.25,
        0.14,
        globeRadius
      )
    );

    // 2x2 front facade windows with dark shutter frames & lit inner panes
    let wSlot = 0;
    for (const rowY of [0.35, 0.72]) {
      for (const colX of [-0.28, 0.28]) {
        const fx = h.x + sinY * frontOff + cosY * (h.width * colX);
        const fz = h.z + cosY * frontOff - sinY * (h.width * colX);
        const wx = h.x + sinY * paneOff + cosY * (h.width * colX);
        const wz = h.z + cosY * paneOff - sinY * (h.width * colX);
        const slotIdx = i * 4 + wSlot++;
        winFrameInst.setMatrixAt(
          slotIdx,
          setSphereInstMatrix(
            fx,
            h.y + h.height * rowY + 0.3,
            fz,
            h.yaw,
            0,
            0.58,
            0.66,
            0.09,
            globeRadius
          )
        );
        winInst.setMatrixAt(
          slotIdx,
          setSphereInstMatrix(
            wx,
            h.y + h.height * rowY + 0.3,
            wz,
            h.yaw,
            0,
            0.38,
            0.48,
            0.09,
            globeRadius
          )
        );
      }
    }

    // Balcony & Chimney
    balconyInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x + sinY * (h.depth * 0.5 + 0.28),
        h.y + h.height * 0.55 + 0.2,
        h.z + cosY * (h.depth * 0.5 + 0.28),
        h.yaw,
        0,
        h.hasBalcony ? h.width * 0.55 : 0.01,
        0.25,
        h.hasBalcony ? 0.55 : 0.01,
        globeRadius
      )
    );
    chimneyInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        h.x + cosY * (h.width * 0.28),
        h.y + h.height + 1.35,
        h.z - sinY * (h.width * 0.28),
        h.yaw,
        0,
        0.42,
        1.1,
        0.42,
        globeRadius
      )
    );
  });

  [plinthInst, wallInst, eaveInst, roofInst, ridgeInst, doorInst].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.computeBoundingSphere();
    group.add(inst);
  });

  [winFrameInst, winInst, balconyInst, chimneyInst].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    detailGroup.add(inst);
  });
  group.add(detailGroup);

  // 9. 6 Timber Shipyard Gantry Cranes around the Waterfront Docks
  const cranes = buildWater7Cranes();
  const cPostGeo = trackGeo(new THREE.BoxGeometry(0.42 * S, 6.4 * S, 0.42 * S));
  const cBeamGeo = trackGeo(new THREE.BoxGeometry(5.6 * S, 0.42 * S, 0.42 * S));
  const cBoomGeo = trackGeo(new THREE.BoxGeometry(0.34 * S, 0.34 * S, 6.2 * S));
  const cRopeGeo = trackGeo(new THREE.CylinderGeometry(0.06 * S, 0.06 * S, 3.2 * S, 5));

  cranes.forEach((cr) => {
    const cGroup = new THREE.Group();
    placeOnWater7Sphere(cGroup, cr.x, cr.y, cr.z, globeRadius, cr.yaw);
    cGroup.scale.setScalar(cr.scale);

    for (const sx of [-2.1, 2.1]) {
      const post = new THREE.Mesh(cPostGeo, timberMat);
      post.position.set(sx * S, 3.2 * S, 0);
      cGroup.add(post);
    }
    const topBeam = new THREE.Mesh(cBeamGeo, timberMat);
    topBeam.position.set(0, 6.2 * S, 0);
    const jib = new THREE.Mesh(cBoomGeo, timberMat);
    jib.position.set(0, 6.7 * S, 2.2 * S);
    jib.rotation.x = -0.35;
    const rope = new THREE.Mesh(cRopeGeo, darkWoodMat);
    rope.position.set(0, 5.4 * S, 4.4 * S);
    cGroup.add(topBeam, jib, rope);
    group.add(cGroup);
  });

  // 10. Monumental 3-Tier Central Fountain Spire (City Center)
  const fGroup = new THREE.Group();
  placeOnWater7Sphere(fGroup, 0, 14.8, 0, globeRadius);

  // Base Cylindrical Colonnade Drum (y_world = 14.8 .. 22.8 -> local y = 0..8)
  const drumCore = new THREE.Mesh(
    trackGeo(
      new THREE.CylinderGeometry(
        WATER7_FOUNTAIN_DRUM_RADIUS * 0.92 * S,
        WATER7_FOUNTAIN_DRUM_RADIUS * S,
        8.2 * S,
        36
      )
    ),
    whiteStoneMat
  );
  drumCore.position.y = 4.1 * S;
  fGroup.add(drumCore);

  // 32 Fluted White Colonnade Pillars around the Drum
  const fColGeo = trackGeo(new THREE.CylinderGeometry(0.42 * S, 0.48 * S, 7.6 * S, 8));
  for (let p = 0; p < 32; p++) {
    const pa = (p / 32) * Math.PI * 2;
    const isCanalMouth = WATER7_CANAL_ANGLES.some((ca) => {
      let d = Math.abs(pa - ca);
      if (d > Math.PI) d = Math.PI * 2 - d;
      return d < 0.12;
    });
    if (isCanalMouth) continue;
    const col = new THREE.Mesh(fColGeo, paleTrimMat);
    col.position.set(
      Math.cos(pa) * (WATER7_FOUNTAIN_DRUM_RADIUS - 0.15) * S,
      4.0 * S,
      Math.sin(pa) * (WATER7_FOUNTAIN_DRUM_RADIUS - 0.15) * S
    );
    fGroup.add(col);
  }

  // Helper to construct crisp sculpted cobalt-blue mosaic & white coping stone basin parapets
  // (replaces glossy torus rings with crisp multi-part architectural masonry)
  const addFountainParapetRing = (
    radius: number,
    height: number,
    yBase: number,
    segments: number,
    pilasterCount: number
  ) => {
    const outerMosaic = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(radius * S, radius * 0.96 * S, height * S, segments, 1, true)),
      cobaltBlueMat
    );
    outerMosaic.position.y = (yBase + height * 0.5) * S;

    const coping = new THREE.Mesh(
      trackGeo(
        new THREE.CylinderGeometry(
          (radius + 0.25) * S,
          (radius + 0.25) * S,
          height * 0.28 * S,
          segments,
          1,
          true
        )
      ),
      whiteStoneMat
    );
    coping.position.y = (yBase + height * 0.88) * S;

    const topAnnulus = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry((radius - 0.9) * S, (radius + 0.25) * S, segments)),
      whiteStoneMat
    );
    topAnnulus.rotation.x = -Math.PI * 0.5;
    topAnnulus.position.y = (yBase + height * 1.02) * S;

    fGroup.add(outerMosaic, coping, topAnnulus);

    const pilasterGeo = trackGeo(new THREE.BoxGeometry(0.45 * S, height * 1.05 * S, 0.55 * S));
    for (let k = 0; k < pilasterCount; k++) {
      const a = (k / pilasterCount) * Math.PI * 2;
      const pil = new THREE.Mesh(pilasterGeo, royalRoofMat);
      pil.position.set(
        Math.cos(a) * radius * S,
        (yBase + height * 0.52) * S,
        Math.sin(a) * radius * S
      );
      pil.rotation.y = -a;
      fGroup.add(pil);
    }
  };

  // Cobalt-Blue & White Coping Stone Lower Basin Parapet + Water Pool
  addFountainParapetRing(WATER7_FOUNTAIN_DRUM_RADIUS + 0.2, 2.2, 7.6, 40, 24);

  const lowerPoolWater = new THREE.Mesh(
    trackGeo(
      new THREE.CylinderGeometry(
        (WATER7_FOUNTAIN_DRUM_RADIUS - 0.5) * S,
        (WATER7_FOUNTAIN_DRUM_RADIUS - 0.5) * S,
        0.8 * S,
        36
      )
    ),
    canalWaterMat
  );
  lowerPoolWater.position.y = 8.45 * S;
  fGroup.add(lowerPoolWater);

  // White Foam Splash Ring on Lower Pool around Middle Waterfall Curtain
  const lowerSplashRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(10.6 * S, 12.6 * S, 32)),
    paleTrimMat
  );
  lowerSplashRing.rotation.x = -Math.PI * 0.5;
  lowerSplashRing.position.y = 8.88 * S;
  fGroup.add(lowerSplashRing);

  // Central Tapered Pedestal Column + Ornate Capital Collar + Middle Basin (r = 11.4)
  const midPedestal = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(3.2 * S, 5.4 * S, 10.5 * S, 20)),
    whiteStoneMat
  );
  midPedestal.position.y = 13.2 * S;
  const midCollar = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(5.6 * S, 3.6 * S, 1.4 * S, 20)),
    cobaltBlueMat
  );
  midCollar.position.y = 17.6 * S;
  fGroup.add(midPedestal, midCollar);

  const midBasinStone = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(11.5 * S, 9.2 * S, 1.6 * S, 32)),
    whiteStoneMat
  );
  midBasinStone.position.y = 18.2 * S;
  fGroup.add(midBasinStone);
  addFountainParapetRing(11.65, 1.45, 18.7, 32, 16);

  const midBasinWater = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(10.9 * S, 10.9 * S, 0.5 * S, 28)),
    canalWaterMat
  );
  midBasinWater.position.y = 19.3 * S;
  fGroup.add(midBasinWater);

  // Mid-to-Lower Cascading Waterfall Curtain + 16 Ribbed Vertical Water Streams
  const midWaterfallCurtain = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(11.4 * S, 11.9 * S, 10.2 * S, 28, 1, true)),
    waterfallMat
  );
  midWaterfallCurtain.position.y = 13.8 * S;
  fGroup.add(midWaterfallCurtain);

  const midStreamGeo = trackGeo(new THREE.BoxGeometry(0.9 * S, 10.4 * S, 0.45 * S));
  for (let w = 0; w < 16; w++) {
    const wa = (w / 16) * Math.PI * 2;
    const stream = new THREE.Mesh(midStreamGeo, canalWaterMat);
    stream.position.set(
      Math.cos(wa) * 11.8 * S,
      13.8 * S,
      Math.sin(wa) * 11.8 * S
    );
    stream.rotation.y = -wa + Math.PI * 0.5;
    fGroup.add(stream);
  }

  // Upper Pedestal + Upper Basin (r = 6.9)
  const topPedestal = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.1 * S, 3.3 * S, 7.6 * S, 16)),
    whiteStoneMat
  );
  topPedestal.position.y = 22.9 * S;
  const topCollar = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(3.8 * S, 2.3 * S, 1.1 * S, 16)),
    cobaltBlueMat
  );
  topCollar.position.y = 26.0 * S;
  fGroup.add(topPedestal, topCollar);

  const topBasinStone = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(6.9 * S, 5.4 * S, 1.3 * S, 24)),
    whiteStoneMat
  );
  topBasinStone.position.y = 26.6 * S;
  fGroup.add(topBasinStone);
  addFountainParapetRing(7.0, 1.2, 27.0, 24, 12);

  const topBasinWater = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(6.4 * S, 6.4 * S, 0.45 * S, 24)),
    canalWaterMat
  );
  topBasinWater.position.y = 27.45 * S;
  const topWaterfallCurtain = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(6.8 * S, 7.2 * S, 8.2 * S, 24, 1, true)),
    waterfallMat
  );
  topWaterfallCurtain.position.y = 23.2 * S;
  fGroup.add(topBasinWater, topWaterfallCurtain);

  const topStreamGeo = trackGeo(new THREE.BoxGeometry(0.65 * S, 8.3 * S, 0.35 * S));
  for (let w = 0; w < 12; w++) {
    const wa = (w / 12) * Math.PI * 2;
    const stream = new THREE.Mesh(topStreamGeo, canalWaterMat);
    stream.position.set(
      Math.cos(wa) * 7.1 * S,
      23.2 * S,
      Math.sin(wa) * 7.1 * S
    );
    stream.rotation.y = -wa + Math.PI * 0.5;
    fGroup.add(stream);
  }

  // Sculpted Multi-Jet Crystalline Top Water Plume Spire
  const plumeTier1 = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.4 * S, 2.7 * S, 5.4 * S, 14)),
    waterfallMat
  );
  plumeTier1.position.y = 30.2 * S;
  const plumeTier2 = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.75 * S, 1.65 * S, 5.6 * S, 12)),
    canalWaterMat
  );
  plumeTier2.position.y = 33.8 * S;
  const plumeNeedle = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.85 * S, 4.8 * S, 10)),
    waterfallMat
  );
  plumeNeedle.position.y = 37.8 * S;
  fGroup.add(plumeTier1, plumeTier2, plumeNeedle);

  group.add(fGroup);

  // 11. Moored Yagara / Harbor Boats bobbing near the Dock Bastions
  const boatNodes: Array<{ mesh: THREE.Group; baseY: number }> = [];
  const boatSpots: Array<[number, number, number]> = [
    [Math.cos(2.08) * 82.0, Math.sin(2.08) * 82.0, 0.5],
    [Math.cos(1.62) * 82.5, Math.sin(1.62) * 82.5, -0.3],
    [Math.cos(1.06) * 82.0, Math.sin(1.06) * 82.0, 0.9],
  ];
  boatSpots.forEach(([bx, bz, byaw]) => {
    const b = new THREE.Group();
    const hull = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.1 * S, 0.55 * S, 3.2 * S)),
      darkWoodMat
    );
    hull.position.y = 0.25 * S;
    const canopy = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.95 * S, 0.65 * S, 1.4 * S)),
      royalRoofMat
    );
    canopy.position.set(0, 0.65 * S, -0.2 * S);
    b.add(hull, canopy);
    placeOnWater7Sphere(b, bx, 0.14, bz, globeRadius, byaw);
    boatNodes.push({ mesh: b, baseY: b.position.y });
    group.add(b);
  });

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number, distToCamera = 20) => {
      detailGroup.visible = distToCamera < 3.2;
      if (distToCamera < 3.2) {
        for (let i = 0; i < boatNodes.length; i++) {
          boatNodes[i].mesh.position.y =
            boatNodes[i].baseY + Math.sin(elapsed * 2.1 + i * 1.4) * 0.05 * S;
        }
      }
      // Subtle shimmering ripple opacity on fountain waterfalls
      waterfallMat.opacity = 0.68 + Math.sin(elapsed * 3.2) * 0.06;
    },
  };
}
