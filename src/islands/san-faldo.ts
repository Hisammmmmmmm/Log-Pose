import * as THREE from 'three';
import {
  STATION_ISLAND_GLOBE_SCALE,
  STATION_ISLAND_SEA_LEVEL_Y,
  STATION_ISLAND_WORLD_SIZE,
  buildSanFaldoHouses,
  sampleSanFaldoHeight,
  sanFaldoRoadSignedDist,
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

function createSanFaldoTexture(size = 512): THREE.CanvasTexture {
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
      const h = sampleSanFaldoHeight(x, z);
      const grain = (valueNoise2D(x * 1.4, z * 1.4) - 0.5) * 10;

      if (h < STATION_ISLAND_SEA_LEVEL_Y - 0.35) {
        data[idx + 3] = 0;
        continue;
      }

      let rgb: [number, number, number] = [110, 174, 88];
      if (h < STATION_ISLAND_SEA_LEVEL_Y + 0.65) {
        rgb = [235, 218, 172];
      }

      const roadD = sanFaldoRoadSignedDist(x, z);
      if (roadD < 0.4 && h > STATION_ISLAND_SEA_LEVEL_Y + 0.3) {
        const checker = ((Math.floor(x * 0.8) + Math.floor(z * 0.8)) & 1) === 0;
        rgb = checker ? [232, 224, 210] : [206, 192, 178];
      }
      if (Math.abs(x) < 19.5 && z < -18.0 && z > -24.8) {
        rgb = [228, 222, 212];
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
  group.name = 'island-san-faldo';
  const registerTex = <T extends THREE.Texture>(t: T): T => (trackTex ? trackTex(t) : t);

  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(STATION_ISLAND_WORLD_SIZE, STATION_ISLAND_WORLD_SIZE, 112, 112)
  );
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const ly = sampleSanFaldoHeight(lx, lz);
    const sp = toStationIslandSphereLocal(lx, ly, lz, globeRadius);
    posAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: registerTex(createSanFaldoTexture(512)),
      roughness: 0.82,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
    })
  );
  group.add(new THREE.Mesh(terrainGeo, terrainMat));

  // North Waterfront Quay Pier & SAN FALDO Gantry
  const stoneMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xebe3d5, roughness: 0.72 }));
  const pier = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(39.0 * S, 3.2 * S, 5.2 * S)),
    stoneMat
  );
  placeOnSphere(pier, 0, 1.3, -21.0, globeRadius, 0);
  group.add(pier);

  const gantry = buildVerdigrisStationArchGroup(
    'SAN FALDO',
    S,
    trackGeo,
    trackMat,
    trackTex
  );
  placeOnSphere(gantry, 0, 2.6, -22.8, globeRadius, Math.PI);
  group.add(gantry);

  // Festive Pastel Carnival Houses + Venetian Clock Spire
  const houses = buildSanFaldoHouses();
  const wallMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
  const roofMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 }));
  const wallGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const roofGeo = trackGeo(new THREE.ConeGeometry(0.75, 0.58, 4));
  roofGeo.rotateY(Math.PI * 0.25);

  const wallInst = new THREE.InstancedMesh(wallGeo, wallMat, houses.length);
  const roofInst = new THREE.InstancedMesh(roofGeo, roofMat, houses.length);
  const trimMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x323b4c, roughness: 0.75 }));
  const trimInst = new THREE.InstancedMesh(wallGeo, trimMat, houses.length * 3);
  const dummy = new THREE.Object3D();
  const c = new THREE.Color();

  houses.forEach((h, i) => {
    placeOnSphere(dummy, h.x, h.y + h.height * 0.5 - 0.3, h.z, globeRadius, h.yaw);
    dummy.scale.set(h.width * S, h.height * S, h.depth * S);
    dummy.updateMatrix();
    wallInst.setMatrixAt(i, dummy.matrix);
    wallInst.setColorAt(i, c.setHex(h.wallColor));

    placeOnSphere(dummy, h.x, h.y + h.height + 0.4, h.z, globeRadius, h.yaw);
    dummy.scale.set(h.width * 1.12 * S, h.height * 0.5 * S, h.depth * 1.12 * S);
    dummy.updateMatrix();
    roofInst.setMatrixAt(i, dummy.matrix);
    roofInst.setColorAt(i, c.setHex(h.roofColor));

    const sinY = Math.sin(h.yaw);
    const cosY = Math.cos(h.yaw);
    const fOff = -(h.depth * 0.5 + 0.04);
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
  });
  wallInst.instanceMatrix.needsUpdate = true;
  roofInst.instanceMatrix.needsUpdate = true;
  trimInst.instanceMatrix.needsUpdate = true;
  if (wallInst.instanceColor) wallInst.instanceColor.needsUpdate = true;
  if (roofInst.instanceColor) roofInst.instanceColor.needsUpdate = true;
  group.add(wallInst, roofInst, trimInst);

  // Carnival Striped Chapiteau Pavilion on Eastern Terrace (x=14, z=16)
  const tentY = sampleSanFaldoHeight(15, 16);
  const tentBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(4.2 * S, 4.4 * S, 3.0 * S, 12)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xfff1d6, roughness: 0.72 }))
  );
  placeOnSphere(tentBase, 15, tentY + 1.4, 16, globeRadius, 0);
  const tentRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(4.8 * S, 4.2 * S, 12)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.58 }))
  );
  placeOnSphere(tentRoof, 15, tentY + 4.8, 16, globeRadius, 0);
  group.add(tentBase, tentRoof);

  // Overhead Carnival Pennant Garlands spanning main boulevard
  const pennantColors = [0xf43f5e, 0xf59e0b, 0x3b82f6, 0x10b981];
  for (let row = 0; row < 3; row++) {
    const gz = -8 + row * 7;
    const gy = sampleSanFaldoHeight(0, gz) + 5.2;
    for (let f = -3; f <= 3; f++) {
      const flag = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.45 * S, 0.9 * S, 3)),
        trackMat(
          new THREE.MeshStandardMaterial({
            color: pennantColors[(row + f + 10) % pennantColors.length],
            roughness: 0.6,
          })
        )
      );
      placeOnSphere(flag, f * 1.4, gy, gz, globeRadius, 0);
      flag.rotateX(Math.PI);
      group.add(flag);
    }
  }

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
  };
}
