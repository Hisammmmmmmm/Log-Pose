import * as THREE from 'three';
import {
  SHIFT_GLOBE_SCALE,
  SHIFT_SEA_LEVEL_Y,
  SHIFT_WORLD_SIZE,
  sampleShiftHeight,
  toShiftSphereLocal,
} from '../utils/seaTrainStationsTerrain';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = SHIFT_GLOBE_SCALE;
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

function placeOnShiftSphere(
  obj: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  globeRadius: number,
  yaw = 0
): void {
  const pos = toShiftSphereLocal(x, y, z, globeRadius);
  obj.position.set(pos.x, pos.y, pos.z);
  _localNormal.set(pos.x, globeRadius + pos.y, pos.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

function createLatticeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 128);
    ctx.strokeStyle = '#6db38b';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 120);
    ctx.lineWidth = 5;
    for (let x = -128; x < 384; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 128, 128);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, 128);
      ctx.lineTo(x + 128, 0);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(4, 1);
  return tex;
}

function createShiftTerrainTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = SHIFT_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * SHIFT_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * SHIFT_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;
      const h = sampleShiftHeight(x, z);
      const grain = (valueNoise2D(x * 1.4, z * 1.4) - 0.5) * 10;

      if (h < SHIFT_SEA_LEVEL_Y - 0.15) {
        data[idx] = 28;
        data[idx + 1] = 128;
        data[idx + 2] = 175;
        data[idx + 3] = 0;
      } else {
        const edgeBand =
          Math.abs(Math.abs(x) - 5.0) < 0.45 ||
          Math.abs(Math.abs(x) - 13.4) < 0.45 ||
          Math.abs(Math.abs(z) - 17.2) < 0.45;
        const rBase = edgeBand ? 210 : 240;
        const gBase = edgeBand ? 214 : 238;
        const bBase = edgeBand ? 218 : 232;
        data[idx] = clamp(Math.round(rBase + grain), 0, 255);
        data[idx + 1] = clamp(Math.round(gBase + grain), 0, 255);
        data[idx + 2] = clamp(Math.round(bBase + grain), 0, 255);
        data[idx + 3] = Math.round(smoothstep(SHIFT_SEA_LEVEL_Y - 0.15, SHIFT_SEA_LEVEL_Y + 0.35, h) * 255);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Shift Station — Faithful 3D model matching image_583c01fa.png:
 * Twin concrete platforms straddling the central buoy-marked Sea Train tracks,
 * pale-green diamond-lattice arched footbridge with twin staircases, tall white
 * lighthouse on right pier, Kokoro's blue stationmaster cottage, green bushes,
 * lampposts, and moored wooden boat.
 */
export function createIslandMesh(ctx: IslandMeshContext): IslandMeshInstance {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const group = new THREE.Group();
  group.name = 'island-shift-station';
  const registerTex = <T extends THREE.Texture>(t: T): T => (trackTex ? trackTex(t) : t);

  // 1. Platform Slabs Mesh
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(SHIFT_WORLD_SIZE, SHIFT_WORLD_SIZE, 96, 96)
  );
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const ly = sampleShiftHeight(lx, lz);
    const sp = toShiftSphereLocal(lx, ly, lz, globeRadius);
    posAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const tTex = registerTex(createShiftTerrainTexture(512));
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tTex,
      roughness: 0.72,
      metalness: 0.06,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
    })
  );
  group.add(new THREE.Mesh(terrainGeo, terrainMat));

  // Crisp 3D Concrete Platform Slabs extending securely beneath sea level
  const concreteMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf1efe8, roughness: 0.68 })
  );
  const curbMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xcbd3dc, roughness: 0.72 })
  );
  const paleGreenMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6cb48b,
      roughness: 0.45,
      metalness: 0.22,
    })
  );
  const darkGreenMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b7a52, roughness: 0.85 })
  );
  const skyBlueWallMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x9ec8df, roughness: 0.72 })
  );
  const redRoofMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb6433a, roughness: 0.65 })
  );
  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7b4c28, roughness: 0.82 })
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x26313a, roughness: 0.5, metalness: 0.5 })
  );
  const lampGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfff3b8,
      emissive: 0xffd56a,
      emissiveIntensity: 1.2,
    })
  );

  for (const px of [-9.2, 9.2]) {
    const slab = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(8.4 * S, 3.2 * S, 35.0 * S)),
      concreteMat
    );
    placeOnShiftSphere(slab, px, 1.0, 0, globeRadius, 0);
    const rim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(8.7 * S, 0.36 * S, 35.4 * S)),
      curbMat
    );
    placeOnShiftSphere(rim, px, 2.48, 0, globeRadius, 0);
    group.add(slab, rim);
  }

  // 2. Arched Lattice Pedestrian Bridge & Twin Staircases crossing central water channel (image_583c01fa)
  const bridgeGroup = new THREE.Group();
  placeOnShiftSphere(bridgeGroup, 0, 2.45, 0, globeRadius, 0);

  const archSpanSegs = 16;
  const archSpanW = 13.0;
  const latticeTex = registerTex(createLatticeTexture());
  const latticeMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: latticeTex,
      transparent: true,
      alphaTest: 0.25,
      side: THREE.DoubleSide,
      roughness: 0.5,
    })
  );

  for (let i = 0; i < archSpanSegs; i++) {
    const t0 = i / archSpanSegs - 0.5;
    const t1 = (i + 1) / archSpanSegs - 0.5;
    const tm = (t0 + t1) * 0.5;
    const x0 = t0 * archSpanW;
    const x1 = t1 * archSpanW;
    const y0 = 3.8 + (1 - 4 * t0 * t0) * 2.5;
    const y1 = 3.8 + (1 - 4 * t1 * t1) * 2.5;
    const segLen = Math.hypot(x1 - x0, y1 - y0) + 0.08;
    const angle = Math.atan2(y1 - y0, x1 - x0);

    const deckSeg = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(segLen * S, 0.26 * S, 2.4 * S)),
      paleGreenMat
    );
    deckSeg.position.set(tm * archSpanW * S, ((y0 + y1) * 0.5) * S, 0);
    deckSeg.rotation.z = angle;
    bridgeGroup.add(deckSeg);

    for (const fz of [-1.18, 1.18]) {
      const rail = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(segLen * S, 1.35 * S)),
        latticeMat
      );
      rail.position.set(
        tm * archSpanW * S,
        ((y0 + y1) * 0.5 + 0.72) * S,
        fz * S
      );
      rail.rotation.z = angle;
      bridgeGroup.add(rail);
    }
  }

  // Twin Staircases descending onto Left (-X) & Right (+X) Platforms
  for (const side of [-1, 1]) {
    const towerPost = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.45 * S, 5.2 * S, 2.6 * S)),
      paleGreenMat
    );
    towerPost.position.set(side * 6.5 * S, 2.6 * S, 0);
    bridgeGroup.add(towerPost);

    // Angled stair ramp from (6.5, 3.8, 0) down to (6.5, 0, +7.2)
    const stairRamp = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.2 * S, 0.36 * S, 8.2 * S)),
      paleGreenMat
    );
    stairRamp.position.set(side * 6.5 * S, 1.9 * S, 3.6 * S);
    stairRamp.rotation.x = Math.atan2(3.8, 7.2);
    bridgeGroup.add(stairRamp);
  }
  group.add(bridgeGroup);

  // 3. Tall White Cylindrical Lighthouse on Right Front Corner (image_583c01fa)
  {
    const lh = new THREE.Group();
    placeOnShiftSphere(lh, 10.6, 2.5, 11.4, globeRadius, 0);

    const shaft = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.15 * S, 1.75 * S, 14.5 * S, 16)),
      concreteMat
    );
    shaft.position.y = 7.25 * S;
    const gallery = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.65 * S, 1.25 * S, 0.7 * S, 16)),
      curbMat
    );
    gallery.position.y = 14.6 * S;
    const lanternGlass = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.95 * S, 0.95 * S, 1.5 * S, 12)),
      lampGlowMat
    );
    lanternGlass.position.y = 15.7 * S;
    const dome = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(1.15 * S, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)),
      curbMat
    );
    dome.position.y = 16.4 * S;
    lh.add(shaft, gallery, lanternGlass, dome);
    group.add(lh);
  }

  // 4. Kokoro & Chimney's Blue Stationmaster Cottage + Chimney + Bushes + Boat (image_583c01fa)
  {
    const cot = new THREE.Group();
    placeOnShiftSphere(cot, 9.2, 2.5, -3.5, globeRadius, 0);

    const walls = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.6 * S, 2.8 * S, 8.6 * S)),
      skyBlueWallMat
    );
    walls.position.y = 1.4 * S;
    const roof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(4.8 * S, 2.2 * S, 4)),
      redRoofMat
    );
    roof.rotation.y = Math.PI * 0.25;
    roof.scale.set(0.95, 1.0, 1.42);
    roof.position.y = 3.8 * S;
    const chimney = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.75 * S, 2.1 * S, 0.75 * S)),
      concreteMat
    );
    chimney.position.set(1.4 * S, 4.4 * S, -2.0 * S);
    cot.add(walls, roof, chimney);

    // Front hedge bushes & dark window panes facing the tracks
    const winGeo = trackGeo(new THREE.BoxGeometry(0.12 * S, 0.85 * S, 0.72 * S));
    for (const wz of [-2.8, -0.9, 1.0, 2.8]) {
      const win = new THREE.Mesh(winGeo, darkIronMat);
      win.position.set(-2.82 * S, 1.5 * S, wz * S);
      cot.add(win);
    }
    const bushGeo = trackGeo(new THREE.SphereGeometry(0.85 * S, 8, 6));
    for (const bz of [-2.4, 0.4, 2.8]) {
      const bush = new THREE.Mesh(bushGeo, darkGreenMat);
      bush.scale.set(1.2, 0.85, 1.4);
      bush.position.set(-3.3 * S, 0.65 * S, bz * S);
      cot.add(bush);
    }
    group.add(cot);
  }

  // Left platform trimmed garden planter + 4 streetlamps
  const planter = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.0 * S, 0.85 * S, 7.5 * S)),
    darkGreenMat
  );
  placeOnShiftSphere(planter, -8.8, 2.9, -4.5, globeRadius, 0);
  group.add(planter);

  const postGeo = trackGeo(new THREE.CylinderGeometry(0.11 * S, 0.14 * S, 2.8 * S, 6));
  const globeLampGeo = trackGeo(new THREE.SphereGeometry(0.28 * S, 8, 6));
  for (const [lx, lz] of [
    [-5.6, 8.6],
    [-5.6, -3.5],
    [5.6, 8.6],
    [5.6, -3.5],
  ]) {
    const lp = new THREE.Group();
    placeOnShiftSphere(lp, lx, 2.5, lz, globeRadius, 0);
    const pole = new THREE.Mesh(postGeo, darkIronMat);
    pole.position.y = 1.4 * S;
    const head = new THREE.Mesh(globeLampGeo, lampGlowMat);
    head.position.y = 2.9 * S;
    lp.add(pole, head);
    group.add(lp);
  }

  // Moored Fishing Boat tucked behind right platform
  const boatGroup = new THREE.Group();
  placeOnShiftSphere(boatGroup, 14.2, SHIFT_SEA_LEVEL_Y + 0.1, -10.5, globeRadius, 0.2);
  const hull = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.8 * S, 0.8 * S, 5.2 * S)),
    woodMat
  );
  const mast = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.1 * S, 0.12 * S, 3.6 * S, 6)),
    woodMat
  );
  mast.position.y = 1.8 * S;
  boatGroup.add(hull, mast);
  group.add(boatGroup);

  const baseBoatY = boatGroup.position.y;

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      boatGroup.position.y = baseBoatY + Math.sin(elapsed * 2.0) * 0.06 * S;
    },
  };
}
