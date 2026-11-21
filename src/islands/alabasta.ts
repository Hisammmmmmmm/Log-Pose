import * as THREE from 'three';
import {
  ALABASTA_GLOBE_SCALE,
  ALABASTA_WORLD_SIZE,
  ALUBARNA_CENTER,
  ALUBARNA_PLATEAU_Y,
  ALUBARNA_WALL_RADIUS,
  ERUMALU_CENTER,
  KATOREA_CENTER,
  NANOHANA_CENTER,
  RAINBASE_CENTER,
  SPIDERS_CAFE_CENTER,
  YUBA_CENTER,
  alabastaCoastSignedDist,
  buildAlabastaPalms,
  buildAlubarnaBuildings,
  buildRegionalTownBuildings,
  sampleAlabastaHeight,
  sampleAlubarnaRamp,
  sandoraRiverSignedDist,
  toAlabastaSphereLocal,
  type AlabastaBuildingSpec,
} from '../utils/alabastaTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = ALABASTA_GLOBE_SCALE;
const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);
const _localNormal = new THREE.Vector3();
const _tiltQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();
const _pitchQuat = new THREE.Quaternion();
const _xAxis = new THREE.Vector3(1, 0, 0);
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

function createAlabastaTerrainTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = ALABASTA_WORLD_SIZE * 0.5;

  const roadAngles: number[] = [];
  for (let k = 0; k < 8; k++) roadAngles.push(k * (Math.PI / 4));
  roadAngles.push(2.66);

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * ALABASTA_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * ALABASTA_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const coastD = alabastaCoastSignedDist(x, z);
      const riverD = sandoraRiverSignedDist(x, z);
      const h = sampleAlabastaHeight(x, z);

      const hx = sampleAlabastaHeight(x + 1.4, z);
      const hz = sampleAlabastaHeight(x, z + 1.4);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 2.4, 0, 1);

      const fineGrain = (valueNoise2D(x * 1.15, z * 1.15) - 0.5) * 16;
      const duneStreak =
        Math.sin(x * 0.24 + z * 0.14 + valueNoise2D(x * 0.07, z * 0.07) * 3.0) * 7;

      let rgb: [number, number, number] = [219, 174, 108];

      if (coastD >= -2.5 || riverD < 1.2) {
        rgb = [226, 205, 160];
      } else {
        rgb = [222 + duneStreak, 176 + duneStreak * 0.8, 112 + duneStreak * 0.5];

        const swMask = smoothstep(-58, -118, x) * smoothstep(42, 105, z);
        if (swMask > 0.01) {
          rgb = mixRgb(rgb, [186, 114, 74], swMask * 0.78);
        }

        if (x > 2 && x < 74 && z > -134 && z < -78 && riverD > 0.8 && coastD < -2) {
          const marsh = 1 - smoothstep(1.5, 6.5, riverD);
          rgb = mixRgb(rgb, [112, 144, 70], marsh * 0.82);
        }

        const eruD = Math.hypot((x - ERUMALU_CENTER.x + 8) * 0.78, z - ERUMALU_CENTER.z - 4);
        if (eruD < 26) {
          const oasis = 1 - smoothstep(10, 26, eruD);
          rgb = mixRgb(rgb, [116, 147, 66], oasis * 0.7);
        }

        const rainD = Math.hypot((x - RAINBASE_CENTER.x + 3) * 0.82, z - RAINBASE_CENTER.z);
        if (rainD < 24) {
          const oasis = 1 - smoothstep(11, 24, rainD);
          rgb = mixRgb(rgb, [104, 142, 62], oasis * 0.76);
        }

        if (slope > 0.28) {
          const rockT = smoothstep(0.28, 0.72, slope);
          const strata = Math.sin(h * 2.4 + valueNoise2D(x * 0.2, z * 0.2) * 2) * 12;
          rgb = mixRgb(rgb, [142 + strata, 102 + strata * 0.7, 68 + strata * 0.5], rockT);
        }
      }

      // Alubarna plateau stone & radial/concentric streets
      const aluDx = x - ALUBARNA_CENTER.x;
      const aluDz = z - ALUBARNA_CENTER.z;
      const aluR = Math.hypot(aluDx, aluDz);
      if (aluR <= ALUBARNA_WALL_RADIUS + 0.5) {
        const aluAng = Math.atan2(aluDz, aluDx);
        const tile = ((Math.floor(x * 1.4) + Math.floor(z * 1.4)) & 1) === 0 ? 4 : -4;
        const stone: [number, number, number] = [210 + tile, 184 + tile, 140 + tile];

        let isRoad = aluR < 13.8;
        if (!isRoad) {
          if (Math.abs(aluR - 23.0) < 1.55 || Math.abs(aluR - 30.2) < 1.35) {
            isRoad = true;
          } else {
            for (const sa of roadAngles) {
              let diff = Math.abs(aluAng - sa);
              if (diff > Math.PI) diff = Math.PI * 2 - diff;
              if (diff * aluR < 1.9) {
                isRoad = true;
                break;
              }
            }
          }
        }
        if (isRoad) {
          const curbEdge =
            Math.abs(aluR - 23.0) > 1.2 && Math.abs(aluR - 30.2) > 1.0 && aluR > 13.8
              ? -12
              : 0;
          rgb = [164 + tile + curbEdge, 134 + tile + curbEdge, 92 + tile + curbEdge];
        } else {
          rgb = stone;
        }
      }

      // Twin monumental ramps
      const ramp = sampleAlubarnaRamp(x, z);
      if (ramp.weight > 0.42) {
        const stepBands = Math.sin((x + z) * 2.8) * 6;
        rgb = mixRgb(rgb, [186 + stepBands, 160 + stepBands, 118 + stepBands], 0.92);
      }

      // Nanohana harbor stone street
      if (
        Math.abs(x - NANOHANA_CENTER.x) < 14 &&
        z > NANOHANA_CENTER.z - 12 &&
        z < NANOHANA_CENTER.z + 6 &&
        coastD < -0.5
      ) {
        const onStreet =
          Math.abs(x - NANOHANA_CENTER.x) < 1.9 || Math.abs(z - NANOHANA_CENTER.z - 1) < 1.8;
        rgb = mixRgb(rgb, onStreet ? [174, 150, 112] : [206, 184, 146], 0.72);
      }

      // Katorea citadel courtyard & cross streets
      if (Math.hypot(x - KATOREA_CENTER.x, z - KATOREA_CENTER.z) < 17) {
        const onRoad =
          Math.abs(x - KATOREA_CENTER.x) < 1.9 || Math.abs(z - KATOREA_CENTER.z) < 1.9;
        rgb = mixRgb(rgb, onRoad ? [166, 136, 96] : [196, 166, 122], 0.7);
      }

      // Yuba street strip
      if (Math.abs(x - YUBA_CENTER.x) < 2.1 && Math.abs(z - YUBA_CENTER.z) < 13) {
        rgb = mixRgb(rgb, [175, 144, 102], 0.68);
      }

      // Erumalu plaza pavers
      if (Math.abs(x - ERUMALU_CENTER.x) < 11 && Math.abs(z - ERUMALU_CENTER.z) < 11) {
        const gridLine =
          Math.abs((x - ERUMALU_CENTER.x) % 4.5) < 0.7 ||
          Math.abs((z - ERUMALU_CENTER.z) % 4.5) < 0.7;
        rgb = mixRgb(rgb, gridLine ? [162, 138, 100] : [188, 162, 118], 0.65);
      }

      data[idx] = clamp(Math.round(rgb[0] + fineGrain), 0, 255);
      data[idx + 1] = clamp(Math.round(rgb[1] + fineGrain * 0.85), 0, 255);
      data[idx + 2] = clamp(Math.round(rgb[2] + fineGrain * 0.7), 0, 255);
      data[idx + 3] = 255;
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
 * Generates RGBA reef & Sandora river water overlay texture so shallow coral lagoons
 * and the Sandora River blend seamlessly into the globe's animated ocean sphere.
 */
function createAlabastaLagoonTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = ALABASTA_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * ALABASTA_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * ALABASTA_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const coastD = alabastaCoastSignedDist(x, z);
      const riverD = sandoraRiverSignedDist(x, z);
      const radialFade = 1 - smoothstep(155, 178, Math.hypot(x, z));

      let rgb: [number, number, number] = [24, 156, 176];
      let alpha = 0;

      if (coastD < 1.5 && riverD < 1.8) {
        const centerT = clamp(-riverD / 5.5, 0, 1);
        rgb = mixRgb([76, 198, 198], [26, 120, 144], centerT);
        alpha = (1 - smoothstep(-0.6, 1.8, riverD)) * 0.94 * radialFade;
      } else if (coastD > -1.2) {
        const reefWidth = z > 35 || x > 55 ? 28 : 16;
        const shallowT = 1 - smoothstep(0, reefWidth, Math.max(0, coastD));
        const coral = valueNoise2D(x * 0.14 + 3.7, z * 0.14 + 9.2);
        rgb = mixRgb([18, 118, 152], [68, 218, 214], clamp(shallowT + (coral - 0.5) * 0.18, 0, 1));
        alpha = shallowT * 0.82 * radialFade;
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

function createPalmCrownGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const frondCount = 9;
  for (let i = 0; i < frondCount; i++) {
    const yaw = (i / frondCount) * Math.PI * 2 + (i % 2) * 0.18;
    const pitchDrop = i % 2 === 0 ? 0.25 : 0.48;
    const length = 1.45 + (i % 3) * 0.16;
    const width = 0.28;

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const baseIdx = positions.length / 3;

    const segs = 4;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const r = t * length;
      const yOff = Math.sin(t * Math.PI * 0.72) * 0.32 - t * t * pitchDrop;
      const halfW = width * Math.sin(clamp(t, 0.08, 0.95) * Math.PI);

      const cx = cosY * r;
      const cz = sinY * r;
      const lx = -sinY * halfW;
      const lz = cosY * halfW;

      positions.push(cx - lx, yOff, cz - lz);
      positions.push(cx + lx, yOff, cz + lz);
      normals.push(0, 1, 0, 0, 1, 0);
    }

    for (let s = 0; s < segs; s++) {
      const a = baseIdx + s * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createOnionDomeGeometry(radius: number, height: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bulge = Math.sin(t * Math.PI * 0.88) * (1 + 0.16 * Math.sin(t * Math.PI * 2));
    const r = Math.max(0.0005, radius * bulge * (1 - Math.pow(t, 3.2) * 0.85));
    const y = t * height;
    pts.push(new THREE.Vector2(r, y));
  }
  pts.push(new THREE.Vector2(0.0008, height * 1.18));
  return new THREE.LatheGeometry(pts, 18);
}

/**
 * Computes spherical-tangent placement matrix for instanced objects so every house,
 * door, window, awning, lantern, and palm sits flush and plumb on the curved globe.
 */
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
  const pos = toAlabastaSphereLocal(x, y, z, globeRadius);
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

/**
 * Places a Three.js Object3D flush and plumb on the curved spherical terrain of Alabasta.
 */
function placeOnAlabastaSphere(
  obj: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  globeRadius: number,
  yaw = 0
): void {
  const pos = toAlabastaSphereLocal(x, y, z, globeRadius);
  obj.position.set(pos.x, pos.y, pos.z);
  _localNormal.set(pos.x, globeRadius + pos.y, pos.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

function buildRiverDhowMesh(
  woodMat: THREE.Material,
  sailMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const ship = new THREE.Group();

  const hull = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.15 * S, 0.55 * S, 3.1 * S)),
    woodMat
  );
  hull.position.y = 0.25 * S;
  ship.add(hull);

  const prow = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.62 * S, 1.1 * S, 4)),
    woodMat
  );
  prow.rotation.x = Math.PI / 2;
  prow.rotation.y = Math.PI / 4;
  prow.position.set(0, 0.32 * S, 2.05 * S);
  ship.add(prow);

  const cabin = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.85 * S, 0.45 * S, 0.9 * S)),
    woodMat
  );
  cabin.position.set(0, 0.72 * S, -0.8 * S);
  ship.add(cabin);

  const mast = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.05 * S, 0.07 * S, 2.6 * S, 6)),
    woodMat
  );
  mast.position.set(0, 1.75 * S, 0.15 * S);
  ship.add(mast);

  const sail = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(1.5 * S, 1.85 * S)),
    sailMat
  );
  sail.position.set(0.08 * S, 1.95 * S, 0.22 * S);
  sail.rotation.y = 0.28;
  ship.add(sail);

  return ship;
}

/**
 * Alabasta Kingdom — Full open-world 3D desert island integrated directly onto the globe,
 * featuring true Sandora River + 3-island northern delta, coral reefs, elevated Alubarna mesa
 * with twin ramps, walls, Royal Palace, Rainbase pyramid & giant skull, Nanohana port & ships,
 * Katorea fortress, Erumalu ruins, Yuba, Spider's Cafe, date palms, and walkable human-scale streets.
 */
export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance {
  const { globeRadius, materials, trackGeo, trackMat, trackTex } = ctx;
  const group = new THREE.Group();
  group.name = 'island-alabasta';

  const registerTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;

  // 1. Curved Spherical Displaced Terrain Mesh (360×360 scaled to globe)
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(ALABASTA_WORLD_SIZE, ALABASTA_WORLD_SIZE, 144, 144)
  );
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const ly = sampleAlabastaHeight(lx, lz);
    const projected = toAlabastaSphereLocal(lx, ly, lz, globeRadius);
    posAttr.setXYZ(i, projected.x, projected.y, projected.z);
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainTex = registerTex(createAlabastaTerrainTexture(512));
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.9,
      metalness: 0.02,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  group.add(terrainMesh);

  // 2. Curved Spherical Lagoon & Sandora River Water Sheet
  const lagoonGeo = trackGeo(
    new THREE.PlaneGeometry(ALABASTA_WORLD_SIZE, ALABASTA_WORLD_SIZE, 72, 72)
  );
  lagoonGeo.rotateX(-Math.PI / 2);
  const lAttr = lagoonGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < lAttr.count; i++) {
    const lx = lAttr.getX(i);
    const lz = lAttr.getZ(i);
    const projected = toAlabastaSphereLocal(lx, 0.14, lz, globeRadius);
    lAttr.setXYZ(i, projected.x, projected.y, projected.z);
  }
  lAttr.needsUpdate = true;
  lagoonGeo.computeVertexNormals();

  const lagoonTex = registerTex(createAlabastaLagoonTexture(512));
  const lagoonMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: lagoonTex,
      roughness: 0.14,
      metalness: 0.18,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const lagoonMesh = new THREE.Mesh(lagoonGeo, lagoonMat);
  group.add(lagoonMesh);

  // 3. Shared Architectural Materials
  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd2b88b,
      roughness: 0.85,
      metalness: 0.03,
    })
  );
  const darkStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x9b7c56,
      roughness: 0.9,
      metalness: 0.04,
    })
  );
  const glassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x52c7dc,
      roughness: 0.14,
      metalness: 0.15,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
    })
  );
  const oasisWaterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2aa8b8,
      roughness: 0.12,
      metalness: 0.22,
    })
  );
  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x724927,
      roughness: 0.84,
    })
  );
  const sailMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4ebd9,
      roughness: 0.72,
      side: THREE.DoubleSide,
    })
  );

  // 4. Instanced City Houses & Micro Street Details (Doors, Windows, Awnings, Lanterns)
  const allBuildings: AlabastaBuildingSpec[] = [
    ...buildAlubarnaBuildings(),
    ...buildRegionalTownBuildings(),
  ];

  const unitBoxGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const houseMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdab67d,
      roughness: 0.88,
      metalness: 0.02,
    })
  );
  const parapetGeo = trackGeo(new THREE.BoxGeometry(1.06, 0.24, 1.06));
  const parapetMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb18957,
      roughness: 0.9,
    })
  );
  const doorGeo = trackGeo(new THREE.BoxGeometry(0.36, 0.56, 0.12));
  const doorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2e1d12,
      roughness: 0.92,
    })
  );
  const winGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.28, 0.08));
  const awningGeo = trackGeo(new THREE.BoxGeometry(0.84, 0.09, 0.52));
  const awningMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
    })
  );
  const lanternGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.09, 1.4, 6));
  const lanternMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x745839,
      roughness: 0.65,
      emissive: 0xffb347,
      emissiveIntensity: 0.22,
    })
  );

  const houseInst = new THREE.InstancedMesh(unitBoxGeo, houseMat, allBuildings.length);
  const parapetInst = new THREE.InstancedMesh(parapetGeo, parapetMat, allBuildings.length);

  // Detail LOD Group (toggles cleanly when camera is within 3.2 units of Alabasta)
  const detailGroup = new THREE.Group();
  const doorInst = new THREE.InstancedMesh(doorGeo, doorMat, allBuildings.length);
  const winInst = new THREE.InstancedMesh(winGeo, doorMat, allBuildings.length * 2);

  const awningBuildings = allBuildings.filter((b) => b.hasAwning);
  const awningInst = new THREE.InstancedMesh(
    awningGeo,
    awningMat,
    Math.max(1, awningBuildings.length)
  );
  const towerBuildings = allBuildings.filter((b) => b.hasRoofTower);
  const towerInst = new THREE.InstancedMesh(
    unitBoxGeo,
    houseMat,
    Math.max(1, towerBuildings.length)
  );

  for (let i = 0; i < allBuildings.length; i++) {
    const b = allBuildings[i];
    houseInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        b.x,
        b.y + b.height * 0.5 - 0.1,
        b.z,
        b.yaw,
        0,
        b.width,
        b.height,
        b.depth,
        globeRadius
      )
    );
    _tmpColor.setRGB(
      clamp(0.92 * b.tint, 0.5, 1),
      clamp(0.82 * b.tint, 0.45, 0.96),
      clamp(0.64 * b.tint, 0.35, 0.85)
    );
    houseInst.setColorAt(i, _tmpColor);

    parapetInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        b.x,
        b.y + b.height + 0.02,
        b.z,
        b.yaw,
        0,
        b.width,
        b.isRuined ? 0.4 : 1.0,
        b.depth,
        globeRadius
      )
    );

    const sinY = Math.sin(b.yaw);
    const cosY = Math.cos(b.yaw);
    const frontOffset = b.depth * 0.5 + 0.02;
    doorInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        b.x + sinY * frontOffset,
        b.y + 0.55,
        b.z + cosY * frontOffset,
        b.yaw,
        0,
        1.35,
        1.85,
        1.0,
        globeRadius
      )
    );

    const winH = b.y + Math.min(b.height * 0.72, 1.85);
    for (const sideIdx of [0, 1]) {
      const sx = (sideIdx === 0 ? -1 : 1) * b.width * 0.27;
      winInst.setMatrixAt(
        i * 2 + sideIdx,
        setSphereInstMatrix(
          b.x + sinY * frontOffset + cosY * sx,
          winH,
          b.z + cosY * frontOffset - sinY * sx,
          b.yaw,
          0,
          1,
          1,
          1,
          globeRadius
        )
      );
    }
  }

  for (let i = 0; i < awningBuildings.length; i++) {
    const b = awningBuildings[i];
    const sinY = Math.sin(b.yaw);
    const cosY = Math.cos(b.yaw);
    const frontOffset = b.depth * 0.5 + 0.34;
    awningInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        b.x + sinY * frontOffset,
        b.y + Math.min(1.65, b.height * 0.72),
        b.z + cosY * frontOffset,
        b.yaw,
        0.28,
        b.width * 0.85,
        1,
        1.3,
        globeRadius
      )
    );
    if (b.awningHue === 'terracotta') _tmpColor.setHex(0xc25536);
    else if (b.awningHue === 'indigo') _tmpColor.setHex(0x325d8a);
    else _tmpColor.setHex(0xd6a03a);
    awningInst.setColorAt(i, _tmpColor);
  }

  for (let i = 0; i < towerBuildings.length; i++) {
    const b = towerBuildings[i];
    towerInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        b.x,
        b.y + b.height + 0.55,
        b.z,
        b.yaw,
        0,
        b.width * 0.45,
        0.95,
        b.depth * 0.45,
        globeRadius
      )
    );
  }

  const lanternPositions: Array<[number, number, number]> = [];
  for (let k = 0; k < 8; k++) {
    const ang = k * (Math.PI / 4);
    for (const r of [14.6, 20.8, 27.6]) {
      lanternPositions.push([
        ALUBARNA_CENTER.x + Math.cos(ang + 0.09) * r,
        ALUBARNA_PLATEAU_Y,
        ALUBARNA_CENTER.z + Math.sin(ang + 0.09) * r,
      ]);
    }
  }
  for (let pz = -8; pz <= 4; pz += 3.5) {
    const lx = NANOHANA_CENTER.x + 2.3;
    const lz = NANOHANA_CENTER.z + pz;
    lanternPositions.push([lx, sampleAlabastaHeight(lx, lz), lz]);
  }
  const lanternInst = new THREE.InstancedMesh(
    lanternGeo,
    lanternMat,
    lanternPositions.length
  );
  lanternPositions.forEach(([lx, ly, lz], i) => {
    lanternInst.setMatrixAt(
      i,
      setSphereInstMatrix(lx, ly + 0.7, lz, 0, 0, 1, 1, 1, globeRadius)
    );
  });

  [houseInst, parapetInst].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.computeBoundingSphere();
    group.add(inst);
  });

  [doorInst, winInst, awningInst, towerInst, lanternInst].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
    detailGroup.add(inst);
  });
  group.add(detailGroup);

  // 5. Instanced Date Palm Groves
  const palms = buildAlabastaPalms();
  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.19, 1, 7));
  const trunkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7b5632, roughness: 0.92 })
  );
  const crownGeo = trackGeo(createPalmCrownGeometry());
  const crownMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b7a2c,
      roughness: 0.72,
      side: THREE.DoubleSide,
    })
  );

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, palms.length);
  const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, palms.length);

  palms.forEach((p, i) => {
    const leanX = Math.cos(p.yaw) * p.lean * p.height * 0.5;
    const leanZ = Math.sin(p.yaw) * p.lean * p.height * 0.5;

    trunkInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        p.x + leanX * 0.5,
        p.y + p.height * 0.48,
        p.z + leanZ * 0.5,
        p.yaw,
        p.lean * 0.8,
        1,
        p.height,
        1,
        globeRadius
      )
    );
    const crownScale = 0.85 + p.height * 0.12;
    crownInst.setMatrixAt(
      i,
      setSphereInstMatrix(
        p.x + leanX,
        p.y + p.height - 0.12,
        p.z + leanZ,
        p.yaw,
        0,
        crownScale,
        crownScale,
        crownScale,
        globeRadius
      )
    );
    _tmpColor.setHSL(0.28 + (i % 5) * 0.012, 0.52, 0.31 + (i % 4) * 0.025);
    crownInst.setColorAt(i, _tmpColor);
  });
  [trunkInst, crownInst].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
    group.add(inst);
  });

  // 6. Hero Composite Architectural Landmarks
  // A. ALUBARNA OCTAGONAL CITADEL, MERLONS, GATEHOUSES, RAMPS, CLOCK TOWER & ROYAL PALACE
  const alubarnaGroup = new THREE.Group();
  placeOnAlabastaSphere(
    alubarnaGroup,
    ALUBARNA_CENTER.x,
    ALUBARNA_PLATEAU_Y,
    ALUBARNA_CENTER.z,
    globeRadius
  );

  const wallSegments = 24;
  const wallSegLen = ((Math.PI * 2 * ALUBARNA_WALL_RADIUS) / wallSegments + 0.55) * S;
  const wallSegGeo = trackGeo(new THREE.BoxGeometry(wallSegLen, 3.8 * S, 1.65 * S));
  const merlonGeo = trackGeo(new THREE.BoxGeometry(0.95 * S, 0.72 * S, 0.72 * S));
  const bastionGeo = trackGeo(new THREE.CylinderGeometry(1.55 * S, 1.75 * S, 5.1 * S, 8));

  for (let s = 0; s < wallSegments; s++) {
    const aMid = ((s + 0.5) / wallSegments) * Math.PI * 2;
    let dSouth = Math.abs(aMid - Math.PI / 2);
    if (dSouth > Math.PI) dSouth = Math.PI * 2 - dSouth;
    let dWest = Math.abs(aMid - 2.66);
    if (dWest > Math.PI) dWest = Math.PI * 2 - dWest;
    if (dSouth < 0.18 || dWest < 0.18) continue;

    const wall = new THREE.Mesh(wallSegGeo, stoneMat);
    wall.position.set(
      Math.cos(aMid) * ALUBARNA_WALL_RADIUS * S,
      1.85 * S,
      Math.sin(aMid) * ALUBARNA_WALL_RADIUS * S
    );
    wall.rotation.y = -aMid + Math.PI / 2;
    alubarnaGroup.add(wall);

    for (const mOff of [-0.28, 0, 0.28]) {
      const mAng = aMid + mOff * ((Math.PI * 2) / wallSegments);
      const merlon = new THREE.Mesh(merlonGeo, darkStoneMat);
      merlon.position.set(
        Math.cos(mAng) * ALUBARNA_WALL_RADIUS * S,
        3.95 * S,
        Math.sin(mAng) * ALUBARNA_WALL_RADIUS * S
      );
      merlon.rotation.y = -mAng + Math.PI / 2;
      alubarnaGroup.add(merlon);
    }

    if (s % 3 === 0) {
      const bastion = new THREE.Mesh(bastionGeo, darkStoneMat);
      bastion.position.set(
        Math.cos(aMid) * ALUBARNA_WALL_RADIUS * S,
        2.5 * S,
        Math.sin(aMid) * ALUBARNA_WALL_RADIUS * S
      );
      alubarnaGroup.add(bastion);
    }
  }

  const gateTowerGeo = trackGeo(new THREE.CylinderGeometry(1.4 * S, 1.65 * S, 6.2 * S, 8));
  const rampLen = 21.5;
  const rampWallGeo = trackGeo(new THREE.BoxGeometry(0.95 * S, 2.1 * S, rampLen * S));
  for (const gateAng of [Math.PI / 2, 2.66]) {
    for (const side of [-3.1, 3.1]) {
      const perpX = -Math.sin(gateAng) * side;
      const perpZ = Math.cos(gateAng) * side;
      const tower = new THREE.Mesh(gateTowerGeo, darkStoneMat);
      tower.position.set(
        (Math.cos(gateAng) * ALUBARNA_WALL_RADIUS + perpX) * S,
        3.0 * S,
        (Math.sin(gateAng) * ALUBARNA_WALL_RADIUS + perpZ) * S
      );
      alubarnaGroup.add(tower);

      const rMid = 41.2;
      const slopePitch = Math.atan2(ALUBARNA_PLATEAU_Y - 3.2, rampLen);
      const wallParapet = new THREE.Mesh(rampWallGeo, stoneMat);
      wallParapet.position.set(
        (Math.cos(gateAng) * rMid + perpX * 0.92) * S,
        ((3.2 - ALUBARNA_PLATEAU_Y) * 0.5 + 0.35) * S,
        (Math.sin(gateAng) * rMid + perpZ * 0.92) * S
      );
      wallParapet.rotation.order = 'YXZ';
      wallParapet.rotation.y = -gateAng + Math.PI / 2;
      wallParapet.rotation.x = slopePitch;
      alubarnaGroup.add(wallParapet);
    }
  }

  // Royal Palace Plinth, Grand Stairs, Colonnade, Keep & 5 Golden Domes
  const palaceBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(9.6 * S, 10.6 * S, 2.4 * S, 8)),
    stoneMat
  );
  palaceBase.position.y = 1.15 * S;
  alubarnaGroup.add(palaceBase);

  const palaceUpper = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(6.8 * S, 7.6 * S, 4.4 * S, 8)),
    stoneMat
  );
  palaceUpper.position.y = 4.4 * S;
  alubarnaGroup.add(palaceUpper);

  for (let st = 0; st < 5; st++) {
    const stair = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry((5.6 - st * 0.4) * S, 0.48 * S, (4.6 - st * 0.7) * S)),
      darkStoneMat
    );
    stair.position.set(0, (0.25 + st * 0.45) * S, (10.6 - st * 0.55) * S);
    alubarnaGroup.add(stair);
  }

  const colGeo = trackGeo(new THREE.CylinderGeometry(0.28 * S, 0.34 * S, 3.6 * S, 8));
  for (let c = 0; c < 12; c++) {
    const a = (c / 12) * Math.PI * 2;
    const col = new THREE.Mesh(colGeo, darkStoneMat);
    col.position.set(Math.cos(a) * 8.4 * S, 4.0 * S, Math.sin(a) * 8.4 * S);
    alubarnaGroup.add(col);
  }

  const centralDome = new THREE.Mesh(
    trackGeo(createOnionDomeGeometry(3.4 * S, 5.8 * S)),
    materials.golden
  );
  centralDome.position.y = 6.55 * S;
  alubarnaGroup.add(centralDome);

  const sideDomeGeo = trackGeo(createOnionDomeGeometry(1.65 * S, 3.1 * S));
  const subTowerGeo = trackGeo(new THREE.CylinderGeometry(1.5 * S, 1.7 * S, 3.6 * S, 8));
  for (let d = 0; d < 4; d++) {
    const a = d * (Math.PI / 2) + Math.PI / 4;
    const subTower = new THREE.Mesh(subTowerGeo, stoneMat);
    subTower.position.set(Math.cos(a) * 6.0 * S, 4.6 * S, Math.sin(a) * 6.0 * S);
    alubarnaGroup.add(subTower);

    const sDome = new THREE.Mesh(sideDomeGeo, materials.golden);
    sDome.position.set(Math.cos(a) * 6.0 * S, 6.35 * S, Math.sin(a) * 6.0 * S);
    alubarnaGroup.add(sDome);
  }

  // Clock Tower
  const clockShaft = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.25 * S, 1.65 * S, 8.8 * S, 8)),
    stoneMat
  );
  clockShaft.position.set(-15.8 * S, 4.4 * S, 5.0 * S);
  alubarnaGroup.add(clockShaft);

  const clockDome = new THREE.Mesh(
    trackGeo(createOnionDomeGeometry(1.3 * S, 2.5 * S)),
    materials.golden
  );
  clockDome.position.set(-15.8 * S, 8.75 * S, 5.0 * S);
  alubarnaGroup.add(clockDome);
  group.add(alubarnaGroup);

  // B. RAINBASE: RAIN DINNERS PYRAMID, OASIS POOL & GIANT SKULL ROCK
  const rainbaseGroup = new THREE.Group();
  placeOnAlabastaSphere(
    rainbaseGroup,
    RAINBASE_CENTER.x - 4,
    2.6,
    RAINBASE_CENTER.z,
    globeRadius
  );

  const rbPool = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(12.2 * S, 28)),
    oasisWaterMat
  );
  rbPool.rotation.x = -Math.PI / 2;
  rbPool.position.y = 0.08 * S;
  rainbaseGroup.add(rbPool);

  const pyramidBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(13.6 * S, 1.4 * S, 13.6 * S)),
    stoneMat
  );
  pyramidBase.position.y = 0.5 * S;
  rainbaseGroup.add(pyramidBase);

  const rainDinnersPyramid = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(8.8 * S, 11.4 * S, 4)),
    glassMat
  );
  rainDinnersPyramid.rotation.y = Math.PI / 4;
  rainDinnersPyramid.position.y = 6.8 * S;
  rainbaseGroup.add(rainDinnersPyramid);

  const pyramidApex = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(2.1 * S, 2.75 * S, 4)),
    materials.golden
  );
  pyramidApex.rotation.y = Math.PI / 4;
  pyramidApex.position.y = 11.25 * S;
  rainbaseGroup.add(pyramidApex);
  group.add(rainbaseGroup);

  // Giant Crocodile Skull Rock
  const skullGroup = new THREE.Group();
  const skullY = sampleAlabastaHeight(RAINBASE_CENTER.x + 22, RAINBASE_CENTER.z + 1) + 4.8;
  placeOnAlabastaSphere(
    skullGroup,
    RAINBASE_CENTER.x + 22,
    skullY,
    RAINBASE_CENTER.z + 1,
    globeRadius,
    -0.18
  );

  const cranium = new THREE.Mesh(
    trackGeo(new THREE.DodecahedronGeometry(6.8 * S, 1)),
    stoneMat
  );
  cranium.scale.set(1.02, 0.95, 1.12);
  skullGroup.add(cranium);

  const snout = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.6 * S, 3.8 * S, 4.6 * S)),
    stoneMat
  );
  snout.position.set(0, -3.2 * S, 4.4 * S);
  skullGroup.add(snout);

  const jaw = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.8 * S, 2.2 * S, 3.8 * S)),
    darkStoneMat
  );
  jaw.position.set(0, -5.8 * S, 4.1 * S);
  skullGroup.add(jaw);

  const darkCavernMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.95 })
  );
  const eyeSocketGeo = trackGeo(new THREE.SphereGeometry(1.45 * S, 10, 10));
  for (const side of [-2.1, 2.1]) {
    const eyeSocket = new THREE.Mesh(eyeSocketGeo, darkCavernMat);
    eyeSocket.position.set(side * S, 0.25 * S, 5.4 * S);
    eyeSocket.scale.set(1.0, 0.85, 0.7);
    skullGroup.add(eyeSocket);
  }
  const nasalHollow = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(1.1 * S, 2.1 * S, 5)),
    darkCavernMat
  );
  nasalHollow.position.set(0, -1.8 * S, 6.75 * S);
  nasalHollow.rotation.x = 0.2;
  skullGroup.add(nasalHollow);

  const toothGeo = trackGeo(new THREE.ConeGeometry(0.45 * S, 1.3 * S, 5));
  for (let t = -2; t <= 2; t++) {
    const tooth = new THREE.Mesh(toothGeo, stoneMat);
    tooth.position.set(t * 1.1 * S, -5.0 * S, 6.1 * S);
    tooth.rotation.x = Math.PI;
    skullGroup.add(tooth);
  }
  group.add(skullGroup);

  const westCrag = new THREE.Mesh(
    trackGeo(new THREE.DodecahedronGeometry(3.8 * S, 1)),
    darkStoneMat
  );
  placeOnAlabastaSphere(
    westCrag,
    RAINBASE_CENTER.x - 19,
    sampleAlabastaHeight(RAINBASE_CENTER.x - 19, RAINBASE_CENTER.z + 3) + 2.2,
    RAINBASE_CENTER.z + 3,
    globeRadius
  );
  westCrag.scale.set(1.1, 0.9, 1.2);
  group.add(westCrag);

  // C. NANOHANA PORT JETTIES & MOORED SAILBOATS
  const pierGeo = trackGeo(new THREE.BoxGeometry(2.6 * S, 1.35 * S, 11.5 * S));
  const pierTipGeo = trackGeo(new THREE.BoxGeometry(4.4 * S, 1.35 * S, 2.2 * S));
  const leftPier = new THREE.Mesh(pierGeo, stoneMat);
  placeOnAlabastaSphere(leftPier, NANOHANA_CENTER.x - 7.4, 0.65, NANOHANA_CENTER.z + 11.5, globeRadius);
  group.add(leftPier);

  const rightPier = new THREE.Mesh(pierGeo, stoneMat);
  placeOnAlabastaSphere(rightPier, NANOHANA_CENTER.x + 7.4, 0.65, NANOHANA_CENTER.z + 11.5, globeRadius);
  group.add(rightPier);

  const tipLeft = new THREE.Mesh(pierTipGeo, stoneMat);
  placeOnAlabastaSphere(tipLeft, NANOHANA_CENTER.x - 5.2, 0.65, NANOHANA_CENTER.z + 16.4, globeRadius);
  group.add(tipLeft);

  const tipRight = new THREE.Mesh(pierTipGeo, stoneMat);
  placeOnAlabastaSphere(tipRight, NANOHANA_CENTER.x + 5.2, 0.65, NANOHANA_CENTER.z + 16.4, globeRadius);
  group.add(tipRight);

  const shipNodes: Array<{ mesh: THREE.Group; baseY: number }> = [];
  const shipCoords: Array<[number, number, number]> = [
    [NANOHANA_CENTER.x - 1.5, NANOHANA_CENTER.z + 13.5, 0.3],
    [NANOHANA_CENTER.x + 2.6, NANOHANA_CENTER.z + 19.2, -0.5],
    [4, 34, 0.15],
    [11, -34, -0.2],
  ];
  shipCoords.forEach(([sx, sz, syaw]) => {
    const ship = buildRiverDhowMesh(woodMat, sailMat, trackGeo);
    placeOnAlabastaSphere(ship, sx, 0.15, sz, globeRadius, syaw);
    shipNodes.push({ mesh: ship, baseY: ship.position.y });
    group.add(ship);
  });

  // D. KATOREA PENTAGONAL FORTIFIED CITADEL
  const kRadius = 18.2;
  const kBaseY = sampleAlabastaHeight(KATOREA_CENTER.x, KATOREA_CENTER.z);
  const kTowerGeo = trackGeo(new THREE.CylinderGeometry(1.35 * S, 1.55 * S, 4.3 * S, 8));
  for (let s = 0; s < 5; s++) {
    const a0 = (s / 5) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((s + 1) / 5) * Math.PI * 2 - Math.PI / 2;
    const x0 = KATOREA_CENTER.x + Math.cos(a0) * kRadius;
    const z0 = KATOREA_CENTER.z + Math.sin(a0) * kRadius;
    const x1 = KATOREA_CENTER.x + Math.cos(a1) * kRadius;
    const z1 = KATOREA_CENTER.z + Math.sin(a1) * kRadius;
    const wallLen = Math.hypot(x1 - x0, z1 - z0);
    const wall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(wallLen * S, 3.1 * S, 1.25 * S)),
      darkStoneMat
    );
    placeOnAlabastaSphere(
      wall,
      (x0 + x1) * 0.5,
      kBaseY + 1.45,
      (z0 + z1) * 0.5,
      globeRadius,
      -Math.atan2(z1 - z0, x1 - x0)
    );
    group.add(wall);

    const tower = new THREE.Mesh(kTowerGeo, stoneMat);
    placeOnAlabastaSphere(tower, x0, kBaseY + 2.1, z0, globeRadius);
    group.add(tower);
  }

  // E. SPIDER'S CAFE, ERUMALU COLONNADE & YUBA WELL
  const cafeY = sampleAlabastaHeight(SPIDERS_CAFE_CENTER.x, SPIDERS_CAFE_CENTER.z);
  const cafeGroup = new THREE.Group();
  placeOnAlabastaSphere(
    cafeGroup,
    SPIDERS_CAFE_CENTER.x,
    cafeY,
    SPIDERS_CAFE_CENTER.z,
    globeRadius
  );
  const cafeBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.6 * S, 2.8 * S, 4.2 * S)),
    stoneMat
  );
  cafeBody.position.y = 1.35 * S;
  cafeGroup.add(cafeBody);

  const cafeAwningMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb7412e, roughness: 0.78 })
  );
  const cafeAwning = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.8 * S, 0.16 * S, 1.8 * S)),
    cafeAwningMat
  );
  cafeAwning.position.set(0, 1.85 * S, 2.8 * S);
  cafeAwning.rotation.x = 0.22;
  cafeGroup.add(cafeAwning);

  const cafeSign = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.8 * S, 0.9 * S, 0.35 * S)),
    darkStoneMat
  );
  cafeSign.position.set(0, 3.15 * S, 1.9 * S);
  cafeGroup.add(cafeSign);
  group.add(cafeGroup);

  const eruY = sampleAlabastaHeight(ERUMALU_CENTER.x, ERUMALU_CENTER.z);
  for (let c = 0; c < 8; c++) {
    const a = (c / 8) * Math.PI * 2;
    const pillar = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.32 * S, 0.36 * S, (1.6 + (c % 3) * 0.7) * S, 7)),
      darkStoneMat
    );
    placeOnAlabastaSphere(
      pillar,
      ERUMALU_CENTER.x + Math.cos(a) * 5.2,
      eruY + 0.9,
      ERUMALU_CENTER.z + Math.sin(a) * 5.2,
      globeRadius
    );
    group.add(pillar);
  }

  const yubaY = sampleAlabastaHeight(YUBA_CENTER.x, YUBA_CENTER.z);
  const yubaWell = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.15 * S, 1.35 * S, 0.85 * S, 10)),
    darkStoneMat
  );
  placeOnAlabastaSphere(yubaWell, YUBA_CENTER.x, yubaY + 0.4, YUBA_CENTER.z, globeRadius);
  group.add(yubaWell);

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number, distToCamera = 20) => {
      detailGroup.visible = distToCamera < 3.4;
      if (distToCamera < 3.4) {
        for (let i = 0; i < shipNodes.length; i++) {
          shipNodes[i].mesh.position.y =
            shipNodes[i].baseY + Math.sin(elapsed * 2.1 + i * 1.4) * 0.06 * S;
        }
      }
    },
  };
}
