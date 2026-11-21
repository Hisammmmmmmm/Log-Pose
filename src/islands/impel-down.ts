import * as THREE from 'three';
import {
  IMPEL_BRIDGE_DECK_Y,
  IMPEL_COURTYARD_Y,
  IMPEL_DOWN_ABYSS_RADIUS,
  IMPEL_DOWN_GLOBE_SCALE,
  IMPEL_DOWN_WORLD_SIZE,
  IMPEL_INNER_DRUM_RADIUS,
  IMPEL_OUTER_WALL_RADIUS,
  IMPEL_SEA_KINGS,
  IMPEL_SUBMARINE_LEVELS,
  buildImpelForestTrees,
  buildImpelMarineShips,
  sampleImpelSeabedHeight,
  toImpelSphereLocal,
} from '../utils/impelDownTerrain';
import { getImpelDownOrientYawRad } from '../utils/taraiCurrentNetwork';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = IMPEL_DOWN_GLOBE_SCALE;
const _up = new THREE.Vector3(0, 1, 0);
const _localNorm = new THREE.Vector3();
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

function placeOnImpelSphere(
  obj: THREE.Object3D,
  lx: number,
  ly: number,
  lz: number,
  globeRadius: number,
  yaw = 0
): void {
  const sp = toImpelSphereLocal(lx, ly, lz, globeRadius);
  obj.position.set(sp.x, sp.y, sp.z);
  _localNorm.set(sp.x, globeRadius + sp.y, sp.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNorm);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

function createSeabedTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = IMPEL_DOWN_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * IMPEL_DOWN_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * IMPEL_DOWN_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;
      const r = Math.hypot(x, z);

      const n = valueNoise2D(x * 0.22 + 2.3, z * 0.22 + 5.9);
      const ridge = valueNoise2D(x * 0.58, z * 0.58);
      let rgb = mixRgb([12, 22, 38], [26, 44, 68], n * 0.7 + ridge * 0.3);

      // Subtle glowing lava-bed / cold abyssal floor reflection near tower base
      if (r < 34) {
        const coreGlow = 1 - smoothstep(20, 34, r);
        rgb = mixRgb(rgb, [44, 34, 68], coreGlow * 0.55);
      }

      // Clean circular cutout at Calm Belt underwater basin rim
      const alpha = r < IMPEL_DOWN_ABYSS_RADIUS - 0.5 ? 255 : 0;

      data[idx] = clamp(Math.round(rgb[0]), 0, 255);
      data[idx + 1] = clamp(Math.round(rgb[1]), 0, 255);
      data[idx + 2] = clamp(Math.round(rgb[2]), 0, 255);
      data[idx + 3] = alpha;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFortressStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#a5b0bc';
    ctx.fillRect(0, 0, 512, 256);

    // Ashlar limestone blocks & vertical weathering streaks matching image_8651b966.png
    ctx.strokeStyle = 'rgba(54, 66, 82, 0.36)';
    ctx.lineWidth = 2;
    for (let y = 0; y < 256; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
      const offset = ((y / 24) % 2) * 24;
      for (let x = offset; x < 512; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 24);
        ctx.stroke();
      }
    }

    // Narrow defensive casemate slits
    ctx.fillStyle = '#26303d';
    for (let x = 24; x < 512; x += 32) {
      ctx.fillRect(x - 2, 76, 4, 18);
      ctx.fillRect(x - 2, 152, 4, 16);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  return tex;
}

function createMarineSailTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#eef2f6';
    ctx.fillRect(0, 0, 128, 128);
    // Iconic Marine blue twin chevrons / "海軍" crest stripe
    ctx.fillStyle = '#215596';
    ctx.fillRect(0, 20, 128, 16);
    ctx.beginPath();
    ctx.moveTo(22, 62);
    ctx.quadraticCurveTo(64, 92, 106, 62);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#1e4e8c';
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCalmBeltWaterTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = IMPEL_DOWN_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * IMPEL_DOWN_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * IMPEL_DOWN_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;
      const r = Math.hypot(x, z);

      const wave =
        valueNoise2D(x * 0.16 + 1.1, z * 0.16 + 3.7) * 0.65 +
        valueNoise2D(x * 0.35, z * 0.35) * 0.35;

      // Calm Belt steel-indigo water matching outer globe ocean, subtly translucent over the pit so Levels 1–6 shine visibly below
      let rgb = mixRgb([28, 55, 96], [52, 84, 128], wave);
      let alpha = 0;

      if (r <= IMPEL_DOWN_ABYSS_RADIUS + 2.5) {
        // Leave inner courtyard completely transparent so forest is visible, keep moat & outer abyss water present
        if (r > IMPEL_INNER_DRUM_RADIUS + 0.5) {
          const rimFoam =
            1 - smoothstep(0.0, 2.5, Math.abs(r - (IMPEL_OUTER_WALL_RADIUS + 3.0)));
          const innerFoam =
            1 - smoothstep(0.0, 2.2, Math.abs(r - (IMPEL_INNER_DRUM_RADIUS + 1.8)));
          const foam = Math.max(rimFoam, innerFoam);
          rgb = mixRgb(rgb, [164, 198, 226], foam * 0.45);
          // Smoothly blend to opaque outer sea color near IMPEL_DOWN_ABYSS_RADIUS so no hard ring seam appears
          const edgeSeal = smoothstep(
            IMPEL_DOWN_ABYSS_RADIUS - 12.0,
            IMPEL_DOWN_ABYSS_RADIUS - 1.5,
            r
          );
          const outerFade = 1 - smoothstep(IMPEL_DOWN_ABYSS_RADIUS - 0.5, IMPEL_DOWN_ABYSS_RADIUS + 2.5, r);
          const baseAlpha = r < IMPEL_OUTER_WALL_RADIUS ? 158 : 138;
          alpha = Math.round((baseAlpha * (1 - edgeSeal) + 245 * edgeSeal) * outerFade);
        }
      }

      data[idx] = clamp(Math.round(rgb[0]), 0, 255);
      data[idx + 1] = clamp(Math.round(rgb[1]), 0, 255);
      data[idx + 2] = clamp(Math.round(rgb[2]), 0, 255);
      data[idx + 3] = alpha;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Impel Down — Faithful 3D model combining aerial visual architecture (image_8651b966.png)
 * and colossal submerged structure:
 * - Concentric pale-grey crenellated outer & taller inner cylindrical fortress rings + flooded moat
 * - Twin-towered arched main entrance gatehouse with iron portcullis & golden World Gov crest
 * - Lush inner courtyard forest & 3-tower Gateway checkpoint citadel
 * - Grand stone Tarai Current transit bridge & Marine ship transit port (+Z toward Gate of Justice)
 * - Encircling Marine battleship fleet (~14 warships) in brooding Calm Belt waters
 * - Colossal 6-level submerged prison tower beneath translucent Calm Belt ocean pit, animated funicular shaft, & circling Sea Kings.
 */
export function createIslandMesh(ctx: IslandMeshContext): IslandMeshInstance {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const group = new THREE.Group();
  group.name = 'island-impel-down';
  const registerTex = <T extends THREE.Texture>(t: T): T => (trackTex ? trackTex(t) : t);

  // Materials
  const stoneTex = registerTex(createFortressStoneTexture());
  const stoneWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: stoneTex,
      color: 0xc2cbd6,
      roughness: 0.78,
      metalness: 0.06,
      side: THREE.DoubleSide,
    })
  );
  const parapetMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb6c0cc,
      roughness: 0.8,
      metalness: 0.05,
    })
  );
  const slateRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x465568,
      roughness: 0.65,
      metalness: 0.2,
    })
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x262e38,
      roughness: 0.45,
      metalness: 0.68,
    })
  );
  const goldCrestMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdca834,
      emissive: 0x6b4b08,
      emissiveIntensity: 0.25,
      roughness: 0.34,
      metalness: 0.72,
    })
  );
  const courtyardGrassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x386a3a,
      roughness: 0.88,
    })
  );
  const foliageMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2f6c36,
      roughness: 0.86,
      flatShading: true,
    })
  );
  const trunkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4a3525,
      roughness: 0.9,
    })
  );
  const bridgePaveMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x9aa4b2,
      roughness: 0.84,
    })
  );

  // 1. Submarine Abyssal Calm Belt Seabed Mesh (carves -62m basin inside r < 68m)
  const seabedGeo = trackGeo(
    new THREE.PlaneGeometry(IMPEL_DOWN_WORLD_SIZE, IMPEL_DOWN_WORLD_SIZE, 128, 128)
  );
  seabedGeo.rotateX(-Math.PI / 2);
  const sbPos = seabedGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sbPos.count; i++) {
    const lx = sbPos.getX(i);
    const lz = sbPos.getZ(i);
    const ly = sampleImpelSeabedHeight(lx, lz);
    const sp = toImpelSphereLocal(lx, ly, lz, globeRadius);
    sbPos.setXYZ(i, sp.x, sp.y, sp.z);
  }
  sbPos.needsUpdate = true;
  seabedGeo.computeVertexNormals();
  const seabedMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: registerTex(createSeabedTexture(512)),
      roughness: 0.92,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
    })
  );
  const seabedMesh = new THREE.Mesh(seabedGeo, seabedMat);
  seabedMesh.receiveShadow = true;
  group.add(seabedMesh);

  const createAnnularCapGeo = (
    rInner: number,
    rOuter: number,
    startTheta: number,
    arcSpan: number,
    segments: number
  ): THREE.BufferGeometry => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const theta = startTheta + t * arcSpan;
      const sx = Math.sin(theta);
      const cz = Math.cos(theta);
      positions.push(sx * rInner * S, 0, cz * rInner * S);
      normals.push(0, 1, 0);
      uvs.push(t * 4, 0);
      positions.push(sx * rOuter * S, 0, cz * rOuter * S);
      normals.push(0, 1, 0);
      uvs.push(t * 4, 1);
      if (i < segments) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = (i + 1) * 2;
        const d = (i + 1) * 2 + 1;
        indices.push(a, b, d, a, d, c);
      }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return trackGeo(geo);
  };

  // 2. Concentric Surface Stone Fortress Rings (matching image_8651b966.png)
  // 2A. Outer Crenellated Fortress Wall Ring (r = 39.0..44.4m, top y = 13.5m) with front +Z portal gap
  {
    const outerArcSpan = Math.PI * 2 - 0.24; // Leave ~10m clear front portal centered at +Z (theta = 0)
    const wallOuterFace = new THREE.Mesh(
      trackGeo(
        new THREE.CylinderGeometry(
          44.0 * S,
          44.6 * S,
          14.5 * S,
          48,
          1,
          true,
          0.12,
          outerArcSpan
        )
      ),
      stoneWallMat
    );
    placeOnImpelSphere(wallOuterFace, 0, 6.2, 0, globeRadius, 0);
    group.add(wallOuterFace);

    const wallInnerFace = new THREE.Mesh(
      trackGeo(
        new THREE.CylinderGeometry(
          39.0 * S,
          39.0 * S,
          14.5 * S,
          44,
          1,
          true,
          0.12,
          outerArcSpan
        )
      ),
      stoneWallMat
    );
    placeOnImpelSphere(wallInnerFace, 0, 6.2, 0, globeRadius, 0);
    group.add(wallInnerFace);

    const outerParapetCap = new THREE.Mesh(
      createAnnularCapGeo(38.9, 44.1, 0.12, outerArcSpan, 48),
      parapetMat
    );
    placeOnImpelSphere(outerParapetCap, 0, 13.45, 0, globeRadius, 0);
    group.add(outerParapetCap);

    // Instanced Merlons / Battlements capping Outer Wall & Inner Drum Wall
    const merlonGeo = trackGeo(new THREE.BoxGeometry(2.1 * S, 1.5 * S, 1.2 * S));
    const outerMerlonCount = 46;
    const outerMerlons = new THREE.InstancedMesh(merlonGeo, parapetMat, outerMerlonCount);
    let mIdx = 0;
    for (let i = 0; i < outerMerlonCount; i++) {
      const ang = (i / outerMerlonCount) * Math.PI * 2;
      const mx = Math.sin(ang) * 43.2;
      const mz = Math.cos(ang) * 43.2;
      if (mz > 36 && Math.abs(mx) < 6.5) continue;
      const sp = toImpelSphereLocal(mx, 14.0, mz, globeRadius);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _localNorm.set(sp.x, globeRadius + sp.y, sp.z).normalize();
      _tiltQuat.setFromUnitVectors(_up, _localNorm);
      _yawQuat.setFromAxisAngle(_yAxis, ang);
      _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      outerMerlons.setMatrixAt(mIdx++, _dummy.matrix);
    }
    outerMerlons.count = mIdx;
    outerMerlons.instanceMatrix.needsUpdate = true;
    group.add(outerMerlons);
  }

  // 2B. Tall Inner Cylindrical Citadel Drum (r = 22.2..26.2m, y = 24.0m) + Open Green Courtyard
  {
    const innerOuterFace = new THREE.Mesh(
      trackGeo(
        new THREE.CylinderGeometry(
          25.8 * S,
          26.4 * S,
          26.0 * S,
          44,
          1,
          true
        )
      ),
      stoneWallMat
    );
    placeOnImpelSphere(innerOuterFace, 0, 11.2, 0, globeRadius, 0);
    group.add(innerOuterFace);

    const innerWallBackFace = new THREE.Mesh(
      trackGeo(
        new THREE.CylinderGeometry(
          22.2 * S,
          22.2 * S,
          11.2 * S,
          40,
          1,
          true
        )
      ),
      stoneWallMat
    );
    placeOnImpelSphere(innerWallBackFace, 0, 18.8, 0, globeRadius, 0);
    group.add(innerWallBackFace);

    const innerParapetCap = new THREE.Mesh(
      createAnnularCapGeo(22.1, 25.9, 0, Math.PI * 2, 44),
      parapetMat
    );
    placeOnImpelSphere(innerParapetCap, 0, 24.2, 0, globeRadius, 0);
    group.add(innerParapetCap);

    // Mid-height architectural ledge belt around the tall inner cylinder (image_8651b966.png)
    const midBelt = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(26.1 * S, 0.72 * S, 8, 44)),
      parapetMat
    );
    placeOnImpelSphere(midBelt, 0, 14.2, 0, globeRadius, 0);
    midBelt.rotateX(Math.PI * 0.5);
    group.add(midBelt);

    const topRim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(25.2 * S, 1.05 * S, 8, 44)),
      parapetMat
    );
    placeOnImpelSphere(topRim, 0, 24.0, 0, globeRadius, 0);
    topRim.rotateX(Math.PI * 0.5);
    group.add(topRim);

    // Inner Courtyard lush green turf plate at y = 14.5m (recessed cleanly inside the tall 24m parapet)
    const courtyardDisc = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(22.4 * S, 22.4 * S, 1.2 * S, 36)),
      courtyardGrassMat
    );
    placeOnImpelSphere(courtyardDisc, 0, IMPEL_COURTYARD_Y - 0.3, 0, globeRadius, 0);
    group.add(courtyardDisc);

    // Crenellations atop Inner Cylindrical Drum (y = 24.8m)
    const innerMerlonsGeo = trackGeo(new THREE.BoxGeometry(1.9 * S, 1.6 * S, 1.1 * S));
    const innerMerlons = new THREE.InstancedMesh(innerMerlonsGeo, parapetMat, 36);
    for (let i = 0; i < 36; i++) {
      const ang = (i / 36) * Math.PI * 2;
      const mx = Math.sin(ang) * 25.0;
      const mz = Math.cos(ang) * 25.0;
      const sp = toImpelSphereLocal(mx, 25.2, mz, globeRadius);
      _dummy.position.set(sp.x, sp.y, sp.z);
      _localNorm.set(sp.x, globeRadius + sp.y, sp.z).normalize();
      _tiltQuat.setFromUnitVectors(_up, _localNorm);
      _yawQuat.setFromAxisAngle(_yAxis, ang);
      _dummy.quaternion.copy(_tiltQuat).multiply(_yawQuat);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      innerMerlons.setMatrixAt(i, _dummy.matrix);
    }
    innerMerlons.instanceMatrix.needsUpdate = true;
    group.add(innerMerlons);
  }

  // 3. Central Courtyard Lush Green Forest + 3-Tower Gateway Citadel & Funicular Headhouse
  {
    const trees = buildImpelForestTrees();
    const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.24 * S, 0.35 * S, 1.6 * S, 5));
    const crownGeo = trackGeo(new THREE.DodecahedronGeometry(1.75 * S, 0));
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    const crownInst = new THREE.InstancedMesh(crownGeo, foliageMat, trees.length);

    trees.forEach((tr, i) => {
      const spT = toImpelSphereLocal(tr.x, tr.y + 0.8 * tr.scale, tr.z, globeRadius);
      _dummy.position.set(spT.x, spT.y, spT.z);
      _localNorm.set(spT.x, globeRadius + spT.y, spT.z).normalize();
      _tiltQuat.setFromUnitVectors(_up, _localNorm);
      _dummy.quaternion.copy(_tiltQuat);
      _dummy.scale.setScalar(tr.scale);
      _dummy.updateMatrix();
      trunkInst.setMatrixAt(i, _dummy.matrix);

      const spC = toImpelSphereLocal(tr.x, tr.y + 2.3 * tr.scale, tr.z, globeRadius);
      _dummy.position.set(spC.x, spC.y, spC.z);
      _dummy.scale.set(tr.scale * 1.18, tr.scale * 0.92, tr.scale * 1.18);
      _dummy.updateMatrix();
      crownInst.setMatrixAt(i, _dummy.matrix);
    });
    trunkInst.instanceMatrix.needsUpdate = true;
    crownInst.instanceMatrix.needsUpdate = true;
    group.add(trunkInst, crownInst);

    // 3-Tower Central Gateway Control Citadel (matching center citadel in image_8651b966.png!)
    const gwGroup = new THREE.Group();
    gwGroup.name = 'impel-gateway-citadel';
    placeOnImpelSphere(gwGroup, 0, IMPEL_COURTYARD_Y, 0, globeRadius, 0);

    const gwKeep = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(11.0 * S, 9.2 * S, 9.2 * S)),
      stoneWallMat
    );
    gwKeep.position.y = 4.6 * S;
    gwGroup.add(gwKeep);

    // Dark gateway entrance arch facing +Z
    const gwArch = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.4 * S, 4.6 * S, 0.8 * S)),
      darkIronMat
    );
    gwArch.position.set(0, 2.3 * S, 4.65 * S);
    gwGroup.add(gwArch);

    // Three Watchtowers matching image_8651b966.png (chunky limestone turrets with banded cornices & slate spires)
    const towerSpecs: Array<[number, number, number, number]> = [
      [0, -1.2, 23.0, 3.15],     // Tallest center Gateway tower
      [-5.5, 1.5, 18.2, 2.45],   // West flanking spire
      [5.5, 1.5, 18.2, 2.45],    // East flanking spire
    ];
    for (const [tx, tz, th, tr] of towerSpecs) {
      const shaft = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(tr * S, tr * 1.12 * S, th * S, 10)),
        stoneWallMat
      );
      shaft.position.set(tx * S, (th * 0.5) * S, tz * S);
      const midBand = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(tr * 1.16 * S, tr * 1.16 * S, 1.1 * S, 10)),
        parapetMat
      );
      midBand.position.set(tx * S, (th * 0.58) * S, tz * S);
      const collar = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(tr * 1.24 * S, tr * 1.08 * S, 2.2 * S, 10)),
        parapetMat
      );
      collar.position.set(tx * S, (th - 0.5) * S, tz * S);
      const turretRoof = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(tr * 1.32 * S, 3.6 * S, 10)),
        slateRoofMat
      );
      turretRoof.position.set(tx * S, (th + 2.2) * S, tz * S);
      gwGroup.add(shaft, midBand, collar, turretRoof);
    }
    group.add(gwGroup);

    // Armored Funicular Winch Headhouse tucked onto the East wall flank (above the submarine shaft)
    const winchHouse = new THREE.Group();
    placeOnImpelSphere(winchHouse, 24.0, IMPEL_COURTYARD_Y + 2.0, -10.0, globeRadius, -0.38);
    const winchBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.2 * S, 5.2 * S, 4.6 * S)),
      darkIronMat
    );
    const winchRoof = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.8 * S, 1.2 * S, 5.2 * S)),
      parapetMat
    );
    winchRoof.position.y = 2.9 * S;
    winchHouse.add(winchBody, winchRoof);
    group.add(winchHouse);
  }

  // 4. Twin-Towered Main Entrance Gatehouse (+Z Outer Ring) + Inner Drum Sea-Portal + Tarai Current Stone Transit Bridge & Port
  {
    // Outer Twin-Towered Gatehouse (z = +42m) matching image_8651b966.png foreground entrance
    const gatehouse = new THREE.Group();
    placeOnImpelSphere(gatehouse, 0, IMPEL_BRIDGE_DECK_Y, 42.0, globeRadius, 0);

    for (const sx of [-5.8, 5.8]) {
      const tower = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(5.6 * S, 19.5 * S, 6.0 * S)),
        stoneWallMat
      );
      tower.position.set(sx * S, 9.75 * S, 0);
      const crown = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(6.3 * S, 1.4 * S, 6.7 * S)),
        parapetMat
      );
      crown.position.set(sx * S, 19.8 * S, 0);
      const roof = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(4.6 * S, 5.2 * S, 4)),
        slateRoofMat
      );
      roof.position.set(sx * S, 22.8 * S, 0);
      roof.rotation.y = Math.PI * 0.25;
      gatehouse.add(tower, crown, roof);
    }

    // Central Gatehouse Arch Lintel + Golden World Gov Emblem Crest + Iron Portcullis Bars
    const archLintel = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(9.6 * S, 5.8 * S, 4.8 * S)),
      stoneWallMat
    );
    archLintel.position.set(0, 12.6 * S, 0);
    const goldCrest = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.1 * S, 2.1 * S, 0.9 * S, 16)),
      goldCrestMat
    );
    goldCrest.rotation.x = Math.PI * 0.5;
    goldCrest.position.set(0, 12.6 * S, 2.55 * S);
    gatehouse.add(archLintel, goldCrest);

    // Recessed Iron Portcullis Grille
    for (let bx = -2.4; bx <= 2.4; bx += 1.2) {
      const bar = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.16 * S, 0.16 * S, 8.6 * S, 5)),
        darkIronMat
      );
      bar.position.set(bx * S, 5.6 * S, 1.8 * S);
      gatehouse.add(bar);
    }
    group.add(gatehouse);

    // Inner Arched Moat Gatehouse at base of Tall Inner Drum (z = +26m)
    const innerPortal = new THREE.Group();
    placeOnImpelSphere(innerPortal, 0, IMPEL_BRIDGE_DECK_Y, 26.2, globeRadius, 0);
    const innerArchWall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(10.5 * S, 11.2 * S, 3.8 * S)),
      stoneWallMat
    );
    innerArchWall.position.y = 5.6 * S;
    const innerArchVoid = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.6 * S, 6.2 * S, 4.1 * S)),
      darkIronMat
    );
    innerArchVoid.position.y = 3.1 * S;
    innerPortal.add(innerArchWall, innerArchVoid);
    group.add(innerPortal);

    // Grand Tarai Current Stone Transit Bridge (z = +26..+98m) & Marine Ship Transit Port Quay
    const bridgeCauseway = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(10.2 * S, 4.2 * S, 48.0 * S)),
      bridgePaveMat
    );
    placeOnImpelSphere(
      bridgeCauseway,
      0,
      IMPEL_BRIDGE_DECK_Y - 2.1,
      50.0,
      globeRadius,
      0
    );
    group.add(bridgeCauseway);

    // Stone Viaduct Piers anchored down through Calm Belt waters
    for (const pz of [34, 52, 66, 82, 94]) {
      const pier = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(9.2 * S, 24.0 * S, 3.6 * S)),
        stoneWallMat
      );
      placeOnImpelSphere(pier, 0, -11.5, pz, globeRadius, 0);
      group.add(pier);
    }

    // Bridge Parapets & Lantern Posts along Tarai Current Stone Bridge
    for (const sx of [-4.8, 4.8]) {
      const parapet = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.65 * S, 1.3 * S, 44.0 * S)),
        parapetMat
      );
      placeOnImpelSphere(parapet, sx, IMPEL_BRIDGE_DECK_Y + 0.6, 52.0, globeRadius, 0);
      group.add(parapet);
    }

    // Rectangular Marine Ship Transit Port Pier Head (z = 74..98m, width 25m)
    const portQuay = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(25.0 * S, 4.5 * S, 25.0 * S)),
      bridgePaveMat
    );
    placeOnImpelSphere(portQuay, 0, IMPEL_BRIDGE_DECK_Y - 2.25, 85.5, globeRadius, 0);
    group.add(portQuay);

    // Bollards & Port Watch Lanterns + Moored Marine Transit Cutters
    for (const bx of [-10.5, -5.2, 5.2, 10.5]) {
      for (const bz of [76, 86, 95]) {
        const bollard = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.28 * S, 0.36 * S, 0.95 * S, 8)),
          darkIronMat
        );
        placeOnImpelSphere(bollard, bx, IMPEL_BRIDGE_DECK_Y + 0.45, bz, globeRadius, 0);
        group.add(bollard);
      }
    }
  }

  // 5. Encircling Marine Battleships Fleet (14 warships matching image_8651b966.png)
  const marineShips: Array<{ mesh: THREE.Group; baseY: number; phase: number }> = [];
  {
    const ships = buildImpelMarineShips();
    const sailTex = registerTex(createMarineSailTexture());
    const hullMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 0.8 })
    );
    const deckMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x9c8262, roughness: 0.85 })
    );
    const cabinMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xd9d2c2, roughness: 0.72 })
    );
    const sailMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: sailTex,
        roughness: 0.62,
        side: THREE.DoubleSide,
      })
    );

    const buildShip = (scale: number): THREE.Group => {
      const ship = new THREE.Group();
      const sc = scale * S;
      const hull = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(3.8 * sc, 2.2 * sc, 10.8 * sc)),
        hullMat
      );
      hull.position.y = 0.8 * sc;
      const deck = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(3.4 * sc, 0.3 * sc, 9.8 * sc)),
        deckMat
      );
      deck.position.y = 1.95 * sc;
      const cabin = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(3.0 * sc, 1.8 * sc, 2.8 * sc)),
        cabinMat
      );
      cabin.position.set(0, 2.8 * sc, -3.2 * sc);
      ship.add(hull, deck, cabin);

      for (const [mz, mh, sw, sh] of [
        [2.6, 8.2, 3.6, 2.6],
        [-0.2, 9.8, 4.4, 3.2],
        [-3.0, 7.6, 3.2, 2.3],
      ]) {
        const mast = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.14 * sc, 0.2 * sc, mh * sc, 6)),
          hullMat
        );
        mast.position.set(0, (1.8 + mh * 0.5) * sc, mz * sc);
        const sail = new THREE.Mesh(
          trackGeo(new THREE.PlaneGeometry(sw * sc, sh * sc)),
          sailMat
        );
        sail.position.set(0, (2.4 + mh * 0.55) * sc, (mz + 0.18) * sc);
        ship.add(mast, sail);
      }
      return ship;
    };

    ships.forEach((s, idx) => {
      const mesh = buildShip(s.scale);
      placeOnImpelSphere(mesh, s.x, 0.15, s.z, globeRadius, s.yaw);
      group.add(mesh);
      marineShips.push({ mesh, baseY: mesh.position.y, phase: idx * 0.9 });
    });

    // Plus 2 docked Marine supply ships alongside the Tarai Stone Transit Port
    for (const [dx, dz, dyaw] of [
      [-16.5, 86, 0.04],
      [16.5, 86, -0.04],
    ]) {
      const docked = buildShip(1.05);
      placeOnImpelSphere(docked, dx, 0.15, dz, globeRadius, dyaw);
      group.add(docked);
      marineShips.push({ mesh: docked, baseY: docked.position.y, phase: dx });
    }
  }

  // 6. Colossal Submerged 6-Level Impel Down Prison Tower (y = -3.5m down to -58.5m)
  {
    const subTower = new THREE.Group();
    subTower.name = 'impel-submarine-levels';

    for (const lvl of IMPEL_SUBMARINE_LEVELS) {
      const height = Math.abs(lvl.yTop - lvl.yBottom);
      const midY = (lvl.yTop + lvl.yBottom) * 0.5;
      const lvlMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: lvl.wallColor,
          emissive: lvl.emissiveColor,
          emissiveIntensity: lvl.emissiveIntensity,
          roughness: 0.72,
          metalness: 0.18,
        })
      );
      const accentMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: lvl.accentColor,
          emissive: lvl.emissiveColor,
          emissiveIntensity: lvl.emissiveIntensity * 1.45,
          roughness: 0.45,
          metalness: 0.35,
        })
      );

      // Core prison level drum
      const drum = new THREE.Mesh(
        trackGeo(
          new THREE.CylinderGeometry(
            lvl.radius * S,
            (lvl.radius + 0.4) * S,
            height * S,
            16
          )
        ),
        lvlMat
      );
      placeOnImpelSphere(drum, 0, midY, 0, globeRadius, 0);
      subTower.add(drum);

      // Stepped Exterior Level Ring Gallery Band / Prison Window Cells
      const ringCollar = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry((lvl.radius + 0.5) * S, 0.75 * S, 6, 20)),
        accentMat
      );
      placeOnImpelSphere(ringCollar, 0, lvl.yTop - 0.6, 0, globeRadius, 0);
      ringCollar.rotateX(Math.PI * 0.5);
      subTower.add(ringCollar);

      // Level-specific iconic silhouettes:
      if (lvl.level === 1) {
        // Level 1 Crimson Hell: spiky red needle forest ringing the exterior gallery terrace
        const spikeGeo = trackGeo(new THREE.ConeGeometry(0.42 * S, 3.8 * S, 5));
        for (let k = 0; k < 14; k++) {
          const ang = (k / 14) * Math.PI * 2;
          const spk = new THREE.Mesh(spikeGeo, accentMat);
          placeOnImpelSphere(
            spk,
            Math.sin(ang) * (lvl.radius + 1.2),
            midY + 0.6,
            Math.cos(ang) * (lvl.radius + 1.2),
            globeRadius,
            ang
          );
          subTower.add(spk);
        }
      } else if (lvl.level === 4) {
        // Level 4 Blazing Hell: glowing molten lava ring & boiling blood furnace gallery
        const lavaRing = new THREE.Mesh(
          trackGeo(new THREE.TorusGeometry((lvl.radius + 1.1) * S, 1.15 * S, 8, 24)),
          accentMat
        );
        placeOnImpelSphere(lavaRing, 0, midY, 0, globeRadius, 0);
        lavaRing.rotateX(Math.PI * 0.5);
        subTower.add(lavaRing);
      } else if (lvl.level === 5) {
        // Level 5 Freezing Hell: protruding crystalline ice shards
        const shardGeo = trackGeo(new THREE.OctahedronGeometry(1.5 * S, 0));
        for (let k = 0; k < 10; k++) {
          const ang = (k / 10) * Math.PI * 2 + 0.2;
          const ice = new THREE.Mesh(shardGeo, accentMat);
          placeOnImpelSphere(
            ice,
            Math.sin(ang) * (lvl.radius + 1.4),
            midY,
            Math.cos(ang) * (lvl.radius + 1.4),
            globeRadius,
            ang
          );
          subTower.add(ice);
        }
      } else if (lvl.level === 6) {
        // Level 6 Eternal Hell: massive iron anchor chains anchoring base to Calm Belt trench seabed
        for (let k = 0; k < 6; k++) {
          const ang = (k / 6) * Math.PI * 2;
          const chain = new THREE.Mesh(
            trackGeo(new THREE.BoxGeometry(1.2 * S, 10.5 * S, 1.2 * S)),
            darkIronMat
          );
          placeOnImpelSphere(
            chain,
            Math.sin(ang) * (lvl.radius + 4.5),
            -55.5,
            Math.cos(ang) * (lvl.radius + 4.5),
            globeRadius,
            ang
          );
          chain.rotateZ(0.48);
          subTower.add(chain);
        }
      }
    }
    group.add(subTower);
  }

  // 7. Funicular Shaft & Animated Elevator Gondola connecting Surface Winch House (y=+14.5) down tower flank to Level 6 (y=-52.5)
  const funicularTop = toImpelSphereLocal(24.5, 14.5, -10.0, globeRadius);
  const funicularBottom = toImpelSphereLocal(27.2, -52.5, -11.5, globeRadius);
  const funicularCarGroup = new THREE.Group();
  {
    const topVec = new THREE.Vector3(funicularTop.x, funicularTop.y, funicularTop.z);
    const botVec = new THREE.Vector3(funicularBottom.x, funicularBottom.y, funicularBottom.z);
    const dir = botVec.clone().sub(topVec);
    const len = dir.length();
    const mid = topVec.clone().add(botVec).multiplyScalar(0.5);

    const railMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        emissive: 0x334155,
        emissiveIntensity: 0.4,
        roughness: 0.35,
        metalness: 0.78,
      })
    );
    const shaftAxis = dir.clone().normalize();
    const railSide = new THREE.Vector3().crossVectors(shaftAxis, _up).normalize();

    for (const side of [-1.1 * S, 1.1 * S]) {
      const cable = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.28 * S, 0.28 * S, len, 6)),
        railMat
      );
      cable.position.copy(mid).addScaledVector(railSide, side);
      cable.quaternion.setFromUnitVectors(_up, shaftAxis);
      group.add(cable);
    }

    // Glowing shaft guide rings strictly underwater (y < -6m, f >= 0.34) so none float above the moat
    const ringMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.85,
        roughness: 0.25,
      })
    );
    for (let f = 0.34; f <= 0.92; f += 0.19) {
      const guideRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(2.1 * S, 0.26 * S, 6, 12)),
        ringMat
      );
      guideRing.position.copy(topVec).lerp(botVec, f);
      guideRing.quaternion.setFromUnitVectors(_up, shaftAxis.clone().negate());
      guideRing.rotateX(Math.PI * 0.5);
      group.add(guideRing);
    }

    // Armored Brass & Crimson Funicular Gondola Car
    const carBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.2 * S, 4.4 * S, 3.2 * S)),
      goldCrestMat
    );
    const carRoof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(2.6 * S, 1.6 * S, 4)),
      darkIronMat
    );
    carRoof.position.y = 2.9 * S;
    carRoof.rotation.y = Math.PI * 0.25;
    const carGlow = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.35 * S, 1.4 * S, 3.35 * S)),
      ringMat
    );
    carGlow.position.y = 0.4 * S;
    funicularCarGroup.add(carBody, carRoof, carGlow);
    funicularCarGroup.position.copy(mid);
    group.add(funicularCarGroup);
  }

  // 8. Colossal Patrol Sea Kings ("Rois des Mers") swimming in Calm Belt Depths
  interface SeaKingRuntime {
    spec: (typeof IMPEL_SEA_KINGS)[number];
    segments: THREE.Mesh[];
  }
  const seaKings: SeaKingRuntime[] = [];
  {
    const eyeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfacc15,
        emissiveIntensity: 1.2,
      })
    );
    for (const sk of IMPEL_SEA_KINGS) {
      const bodyMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: sk.bodyColor,
          roughness: 0.52,
          metalness: 0.12,
        })
      );
      const bellyMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: sk.bellyColor,
          roughness: 0.65,
        })
      );
      const segs: THREE.Mesh[] = [];
      const sc = sk.lengthScale * S;

      // Head segment with snout & glowing eyes
      const head = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(2.6 * sc, 6.2 * sc, 7)),
        bodyMat
      );
      head.rotation.x = Math.PI * 0.5;
      for (const ex of [-1.4 * sc, 1.4 * sc]) {
        const eye = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.48 * sc, 6, 6)),
          eyeMat
        );
        eye.position.set(ex, 0.8 * sc, 0.9 * sc);
        head.add(eye);
      }
      group.add(head);
      segs.push(head);

      // 5 Serpentine Body Segments
      for (let sIdx = 1; sIdx <= 5; sIdx++) {
        const radius = (2.3 - sIdx * 0.32) * sc;
        const seg = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(radius, 8, 6)),
          sIdx % 2 === 1 ? bodyMat : bellyMat
        );
        seg.scale.set(0.95, 0.95, 1.45);
        group.add(seg);
        segs.push(seg);
      }
      seaKings.push({ spec: sk, segments: segs });
    }
  }

  // 9. Semi-Transparent Dark Calm Belt Sea Surface Collar over the Abyssal Pit (y = 0)
  {
    const waterGeo = trackGeo(
      new THREE.PlaneGeometry(IMPEL_DOWN_WORLD_SIZE, IMPEL_DOWN_WORLD_SIZE, 96, 96)
    );
    waterGeo.rotateX(-Math.PI / 2);
    const wAttr = waterGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < wAttr.count; i++) {
      const lx = wAttr.getX(i);
      const lz = wAttr.getZ(i);
      const sp = toImpelSphereLocal(lx, 0.05, lz, globeRadius);
      wAttr.setXYZ(i, sp.x, sp.y, sp.z);
    }
    wAttr.needsUpdate = true;
    waterGeo.computeVertexNormals();

    const waterMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: registerTex(createCalmBeltWaterTexture(512)),
        roughness: 0.24,
        metalness: 0.14,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    const calmSeaMesh = new THREE.Mesh(waterGeo, waterMat);
    group.add(calmSeaMesh);
  }

  const orientYawRad = getImpelDownOrientYawRad();

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    orientYawRad,
    update: (elapsed: number, distToCamera = 20) => {
      // Gentle battleship bobbing
      if (distToCamera < 4.5) {
        for (const ms of marineShips) {
          ms.mesh.position.y =
            ms.baseY + Math.sin(elapsed * 1.65 + ms.phase) * 0.07 * S;
        }
      }

      // Funicular gondola glides smoothly underwater between Surface Winch House & Level 6
      const funicularCycle = 0.5 - 0.5 * Math.cos(elapsed * 0.36);
      const spCar = toImpelSphereLocal(
        24.5 + (27.2 - 24.5) * funicularCycle,
        -6.0 + (-52.5 - -6.0) * funicularCycle,
        -10.0 + (-11.5 - -10.0) * funicularCycle,
        globeRadius
      );
      funicularCarGroup.position.set(spCar.x, spCar.y, spCar.z);
      _localNorm.set(spCar.x, globeRadius + spCar.y, spCar.z).normalize();
      funicularCarGroup.quaternion.setFromUnitVectors(_up, _localNorm);

      // Circling Sea Kings undulating gracefully around the submerged tower
      for (const skRuntime of seaKings) {
        const { orbitRadius, depthY, speed, phaseOffset } = skRuntime.spec;
        for (let sIdx = 0; sIdx < skRuntime.segments.length; sIdx++) {
          const lag = sIdx * 0.14 * Math.sign(speed);
          const ang = elapsed * speed + phaseOffset - lag;
          const waveRadial = Math.sin(elapsed * 2.4 - sIdx * 0.9) * 1.4;
          const rCur = orbitRadius + waveRadial;
          const x = Math.sin(ang) * rCur;
          const z = Math.cos(ang) * rCur;
          const y = depthY + Math.sin(elapsed * 1.5 - sIdx * 0.5) * 1.1;
          const segMesh = skRuntime.segments[sIdx];
          const sp = toImpelSphereLocal(x, y, z, globeRadius);
          segMesh.position.set(sp.x, sp.y, sp.z);
          _localNorm.set(sp.x, globeRadius + sp.y, sp.z).normalize();
          _tiltQuat.setFromUnitVectors(_up, _localNorm);
          const tangentYaw =
            speed >= 0 ? ang + Math.PI * 0.5 : ang - Math.PI * 0.5;
          _yawQuat.setFromAxisAngle(_yAxis, tangentYaw);
          segMesh.quaternion.copy(_tiltQuat).multiply(_yawQuat);
        }
      }
    },
  };
}
