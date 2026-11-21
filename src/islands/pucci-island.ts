import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  STATION_ISLAND_GLOBE_SCALE,
  STATION_ISLAND_SEA_LEVEL_Y,
  STATION_ISLAND_WORLD_SIZE,
  buildPucciHouses,
  pucciRoadSignedDist,
  samplePucciHeight,
  toStationIslandSphereLocal,
} from '../utils/seaTrainStationsTerrain';
import { valueNoise2D } from '../utils/globeMath';
import { buildVerdigrisStationArchGroup } from './sea-train-network';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = STATION_ISLAND_GLOBE_SCALE;
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

function placeOnSphere(
  obj: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  globeRadius: number,
  yaw = 0
): void {
  const pos = toStationIslandSphereLocal(x, y, z, globeRadius);
  obj.position.set(pos.x, pos.y, pos.z);
  _localNormal.set(pos.x, globeRadius + pos.y, pos.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

function createPucciTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = STATION_ISLAND_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * STATION_ISLAND_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * STATION_ISLAND_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;
      const h = samplePucciHeight(x, z);
      const grain = (valueNoise2D(x * 1.4, z * 1.4) - 0.5) * 12;

      if (h < STATION_ISLAND_SEA_LEVEL_Y - 0.35) {
        data[idx + 3] = 0;
        continue;
      }

      let rgb: [number, number, number] = [106, 158, 72];
      if (h < STATION_ISLAND_SEA_LEVEL_Y + 0.65) {
        rgb = [232, 214, 168];
      } else {
        const patch = valueNoise2D(x * 0.16, z * 0.16);
        rgb = [96 + patch * 28, 148 + patch * 24, 62 + patch * 16];
      }

      const roadD = pucciRoadSignedDist(x, z);
      if (roadD < 0.45 && h > STATION_ISLAND_SEA_LEVEL_Y + 0.3) {
        rgb = [212, 198, 174];
      }
      if (Math.abs(x) < 19.2 && z > 18.0 && z < 24.8) {
        rgb = [228, 222, 210];
      }

      const alpha = smoothstep(
        STATION_ISLAND_SEA_LEVEL_Y - 0.35,
        STATION_ISLAND_SEA_LEVEL_Y + 0.1,
        h
      );
      data[idx] = clamp(Math.round(rgb[0] + grain), 0, 255);
      data[idx + 1] = clamp(Math.round(rgb[1] + grain), 0, 255);
      data[idx + 2] = clamp(Math.round(rgb[2] + grain), 0, 255);
      data[idx + 3] = clamp(Math.round(alpha * 255), 0, 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createIslandMesh(ctx: IslandMeshContext): IslandMeshInstance {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const group = new THREE.Group();
  group.name = 'island-pucci';
  const registerTex = <T extends THREE.Texture>(t: T): T => (trackTex ? trackTex(t) : t);

  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(STATION_ISLAND_WORLD_SIZE, STATION_ISLAND_WORLD_SIZE, 112, 112)
  );
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const ly = samplePucciHeight(lx, lz);
    const sp = toStationIslandSphereLocal(lx, ly, lz, globeRadius);
    posAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: registerTex(createPucciTexture(512)),
      roughness: 0.84,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
    })
  );
  group.add(new THREE.Mesh(terrainGeo, terrainMat));

  // Stone Waterfront Embarkation Pier (South z = +21.5) & PUCCI STATION Arch Gantry
  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.72 })
  );
  const pier = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(38.0 * S, 3.2 * S, 5.2 * S)),
    stoneMat
  );
  placeOnSphere(pier, 0, 1.3, 21.0, globeRadius, 0);
  group.add(pier);

  const gantry = buildVerdigrisStationArchGroup(
    'PUCCI STATION',
    S,
    trackGeo,
    trackMat,
    trackTex
  );
  placeOnSphere(gantry, 0, 2.6, 22.8, globeRadius, 0);
  group.add(gantry);

  // Mediterranean Gourmet Townhouses & Striped Trattoria Awnings
  const houses = buildPucciHouses();
  const wallMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 }));
  const roofMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72 }));
  const wallGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const roofGeo = trackGeo(new THREE.ConeGeometry(0.76, 0.55, 4));
  roofGeo.rotateY(Math.PI * 0.25);

  const wallInst = new THREE.InstancedMesh(wallGeo, wallMat, houses.length);
  const roofInst = new THREE.InstancedMesh(roofGeo, roofMat, houses.length);
  const trimMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3b2c24, roughness: 0.78 }));
  const trimInst = new THREE.InstancedMesh(wallGeo, trimMat, houses.length * 3);
  const dummy = new THREE.Object3D();
  const c = new THREE.Color();

  houses.forEach((h, i) => {
    placeOnSphere(dummy, h.x, h.y + h.height * 0.5 - 0.3, h.z, globeRadius, h.yaw);
    dummy.scale.set(h.width * S, h.height * S, h.depth * S);
    dummy.updateMatrix();
    wallInst.setMatrixAt(i, dummy.matrix);
    wallInst.setColorAt(i, c.setHex(h.wallColor));

    placeOnSphere(dummy, h.x, h.y + h.height + 0.35, h.z, globeRadius, h.yaw);
    dummy.scale.set(h.width * 1.12 * S, h.height * 0.55 * S, h.depth * 1.12 * S);
    dummy.updateMatrix();
    roofInst.setMatrixAt(i, dummy.matrix);
    roofInst.setColorAt(i, c.setHex(h.roofColor));

    const sinY = Math.sin(h.yaw);
    const cosY = Math.cos(h.yaw);
    const fOff = h.depth * 0.5 + 0.04;
    placeOnSphere(dummy, h.x + sinY * fOff, h.y + 0.75, h.z + cosY * fOff, globeRadius, h.yaw);
    dummy.scale.set(0.85 * S, 1.45 * S, 0.14 * S);
    dummy.updateMatrix();
    trimInst.setMatrixAt(i * 3, dummy.matrix);

    for (const [k, sx] of [-0.28, 0.28].entries()) {
      placeOnSphere(
        dummy,
        h.x + sinY * fOff + cosY * (h.width * sx),
        h.y + h.height * 0.62,
        h.z + cosY * fOff - sinY * (h.width * sx),
        globeRadius,
        h.yaw
      );
      dummy.scale.set(0.62 * S, 0.72 * S, 0.14 * S);
      dummy.updateMatrix();
      trimInst.setMatrixAt(i * 3 + 1 + k, dummy.matrix);
    }

    if (h.hasAwning) {
      const awn = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(h.width * 0.9 * S, 0.25 * S, 1.4 * S)),
        trackMat(new THREE.MeshStandardMaterial({ color: h.awningColor ?? 0xd93838, roughness: 0.7 }))
      );
      placeOnSphere(awn, h.x + sinY * (h.depth * 0.56), h.y + 1.8, h.z + cosY * (h.depth * 0.56), globeRadius, h.yaw);
      awn.rotateX(0.3);
      group.add(awn);
    }
  });
  wallInst.instanceMatrix.needsUpdate = true;
  roofInst.instanceMatrix.needsUpdate = true;
  trimInst.instanceMatrix.needsUpdate = true;
  if (wallInst.instanceColor) wallInst.instanceColor.needsUpdate = true;
  if (roofInst.instanceColor) roofInst.instanceColor.needsUpdate = true;
  group.add(wallInst, roofInst, trimInst);

  // Mediterranean Cypress & Olive Trees on Upper Hillside
  const trunkParts: THREE.BufferGeometry[] = [];
  const leafParts: THREE.BufferGeometry[] = [];
  const cSpots: Array<[number, number]> = [
    [-20, -2], [-18, -12], [-14, -20], [0, -24], [14, -18], [20, -6], [19, 8], [-22, 10],
  ];
  for (const [tx, tz] of cSpots) {
    const ty = samplePucciHeight(tx, tz);
    if (ty < STATION_ISLAND_SEA_LEVEL_Y + 0.8) continue;
    const sp = toStationIslandSphereLocal(tx, ty + 1.2, tz, globeRadius);
    const tGeo = new THREE.CylinderGeometry(0.25 * S, 0.35 * S, 2.6 * S, 6);
    tGeo.translate(sp.x, sp.y, sp.z);
    trunkParts.push(tGeo);

    const lGeo = new THREE.ConeGeometry(1.1 * S, 4.8 * S, 7);
    const spTop = toStationIslandSphereLocal(tx, ty + 4.4, tz, globeRadius);
    lGeo.translate(spTop.x, spTop.y, spTop.z);
    leafParts.push(lGeo);
  }
  if (trunkParts.length > 0) {
    const mergedT = trackGeo(mergeGeometries(trunkParts.map((p) => (p.index ? p.toNonIndexed() : p)), false));
    const mergedL = trackGeo(mergeGeometries(leafParts.map((p) => (p.index ? p.toNonIndexed() : p)), false));
    trunkParts.forEach((p) => p.dispose());
    leafParts.forEach((p) => p.dispose());
    group.add(
      new THREE.Mesh(mergedT, trackMat(new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.9 }))),
      new THREE.Mesh(mergedL, trackMat(new THREE.MeshStandardMaterial({ color: 0x3b6e3c, roughness: 0.82 })))
    );
  }

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
  };
}
