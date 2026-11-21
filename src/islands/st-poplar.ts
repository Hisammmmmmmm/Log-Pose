import * as THREE from 'three';
import {
  STATION_ISLAND_GLOBE_SCALE,
  STATION_ISLAND_SEA_LEVEL_Y,
  STATION_ISLAND_WORLD_SIZE,
  buildStPoplarHouses,
  sampleStPoplarHeight,
  stPoplarRoadSignedDist,
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

function createStPoplarTexture(size = 512): THREE.CanvasTexture {
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
      const h = sampleStPoplarHeight(x, z);
      const grain = (valueNoise2D(x * 1.4, z * 1.4) - 0.5) * 10;

      if (h < STATION_ISLAND_SEA_LEVEL_Y - 0.35) {
        data[idx + 3] = 0;
        continue;
      }

      let rgb: [number, number, number] = [108, 178, 86];
      if (h < STATION_ISLAND_SEA_LEVEL_Y + 0.65) {
        rgb = [234, 218, 170];
      } else {
        const flowerField = valueNoise2D(x * 0.28 + 4.1, z * 0.28 + 2.3);
        if (flowerField > 0.68) {
          rgb = [232, 118, 148]; // Tulip & spring blossom patch
        } else if (flowerField > 0.58) {
          rgb = [242, 206, 78];
        } else {
          rgb = [98 + flowerField * 30, 176, 82];
        }
      }

      const roadD = stPoplarRoadSignedDist(x, z);
      if (roadD < 0.4 && h > STATION_ISLAND_SEA_LEVEL_Y + 0.3) {
        rgb = [216, 204, 182];
      }
      if (Math.abs(x) < 19.2 && z < -18.0 && z > -24.8) {
        rgb = [232, 226, 214];
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
  group.name = 'island-st-poplar';
  const registerTex = <T extends THREE.Texture>(t: T): T => (trackTex ? trackTex(t) : t);

  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(STATION_ISLAND_WORLD_SIZE, STATION_ISLAND_WORLD_SIZE, 112, 112)
  );
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const ly = sampleStPoplarHeight(lx, lz);
    const sp = toStationIslandSphereLocal(lx, ly, lz, globeRadius);
    posAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: registerTex(createStPoplarTexture(512)),
      roughness: 0.85,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
    })
  );
  group.add(new THREE.Mesh(terrainGeo, terrainMat));

  // North Waterfront Quay Pier & ST. POPLAR Gantry
  const stoneMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xece6d8, roughness: 0.72 }));
  const pier = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(38.0 * S, 3.2 * S, 5.2 * S)),
    stoneMat
  );
  placeOnSphere(pier, 0, 1.3, -21.0, globeRadius, 0);
  group.add(pier);

  const gantry = buildVerdigrisStationArchGroup(
    'ST. POPLAR',
    S,
    trackGeo,
    trackMat,
    trackTex
  );
  placeOnSphere(gantry, 0, 2.6, -22.8, globeRadius, Math.PI);
  group.add(gantry);

  // Flower Cottages + Hilltop Spring Windmill
  const houses = buildStPoplarHouses();
  const wallMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 }));
  const roofMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }));
  const wallGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const roofGeo = trackGeo(new THREE.ConeGeometry(0.75, 0.56, 4));
  roofGeo.rotateY(Math.PI * 0.25);

  const wallInst = new THREE.InstancedMesh(wallGeo, wallMat, houses.length);
  const roofInst = new THREE.InstancedMesh(roofGeo, roofMat, houses.length);
  const trimMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3b352c, roughness: 0.78 }));
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
    dummy.scale.set(h.width * 1.12 * S, h.height * 0.52 * S, h.depth * 1.12 * S);
    dummy.updateMatrix();
    roofInst.setMatrixAt(i, dummy.matrix);
    roofInst.setColorAt(i, c.setHex(h.roofColor));

    const sinY = Math.sin(h.yaw);
    const cosY = Math.cos(h.yaw);
    const fOff = -(h.depth * 0.5 + 0.04);
    placeOnSphere(dummy, h.x + sinY * fOff, h.y + 0.7, h.z + cosY * fOff, globeRadius, h.yaw);
    dummy.scale.set(0.8 * S, 1.35 * S, 0.14 * S);
    dummy.updateMatrix();
    trimInst.setMatrixAt(i * 3, dummy.matrix);

    for (const [k, sx] of [-0.28, 0.28].entries()) {
      placeOnSphere(
        dummy,
        h.x + sinY * fOff + cosY * (h.width * sx),
        h.y + h.height * 0.6,
        h.z + cosY * fOff - sinY * (h.width * sx),
        globeRadius,
        h.yaw
      );
      dummy.scale.set(0.58 * S, 0.66 * S, 0.14 * S);
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

  // Rotating Windmill Sails on Hilltop Windmill (stpoplar-h-6 at [12, 13])
  const wmH = houses[houses.length - 1];
  const sailPivot = new THREE.Group();
  placeOnSphere(sailPivot, wmH.x - 1.8, wmH.y + wmH.height * 0.8, wmH.z - 2.2, globeRadius, wmH.yaw);
  const sailMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfef4dc, roughness: 0.75 }));
  const bladeGeo = trackGeo(new THREE.BoxGeometry(0.85 * S, 4.2 * S, 0.14 * S));
  for (let b = 0; b < 4; b++) {
    const blade = new THREE.Mesh(bladeGeo, sailMat);
    const ang = (b * Math.PI) / 2;
    blade.position.set(Math.cos(ang) * 2.2 * S, Math.sin(ang) * 2.2 * S, 0);
    blade.rotation.z = ang + Math.PI * 0.5;
    sailPivot.add(blade);
  }
  group.add(sailPivot);

  // Blooming Sakura Cherry Blossom & Spring Blossom Trees
  const blossomSpots: Array<[number, number]> = [
    [-16, -6], [-18, 4], [-12, 14], [2, 14], [18, 4], [20, -6], [10, 2], [-4, -14],
  ];
  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.24 * S, 0.34 * S, 2.2 * S, 6));
  const crownGeo = trackGeo(new THREE.DodecahedronGeometry(2.0 * S, 1));
  const trunkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x6c4b30, roughness: 0.9 }));
  const sakuraMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf7a8c4, roughness: 0.8 }));

  blossomSpots.forEach(([tx, tz], idx) => {
    const ty = sampleStPoplarHeight(tx, tz);
    if (ty < STATION_ISLAND_SEA_LEVEL_Y + 0.8) return;
    const tMesh = new THREE.Mesh(trunkGeo, trunkMat);
    placeOnSphere(tMesh, tx, ty + 1.0, tz, globeRadius, 0);
    const cMesh = new THREE.Mesh(crownGeo, sakuraMat);
    placeOnSphere(cMesh, tx, ty + 2.8, tz, globeRadius, idx * 0.8);
    group.add(tMesh, cMesh);
  });

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      sailPivot.rotation.z = elapsed * 0.85;
    },
  };
}
