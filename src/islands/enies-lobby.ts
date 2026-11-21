import * as THREE from 'three';
import {
  ENIES_ABYSS_FLOOR_Y,
  ENIES_ABYSS_RADIUS,
  ENIES_FRONT_GATE_Y,
  ENIES_GLOBE_SCALE,
  ENIES_GRILLAGE_RADIUS,
  ENIES_MAIN_PLATEAU_Y,
  ENIES_WORLD_SIZE,
  buildEniesTownHouses,
  eniesCliffSignedDist,
  eniesMainPlazaSignedDist,
  sampleEniesHeight,
  toEniesSphereLocal,
} from '../utils/eniesLobbyTerrain';
import { getEniesLobbyOrientYawRad } from '../utils/taraiCurrentNetwork';
import { valueNoise2D } from '../utils/globeMath';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = ENIES_GLOBE_SCALE;
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

function placeOnEniesSphere(
  obj: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  globeRadius: number,
  yaw = 0
): void {
  const pos = toEniesSphereLocal(x, y, z, globeRadius);
  obj.position.set(pos.x, pos.y, pos.z);
  _localNormal.set(pos.x, globeRadius + pos.y, pos.z).normalize();
  _tiltQuat.setFromUnitVectors(_up, _localNormal);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  obj.quaternion.copy(_tiltQuat).multiply(_yawQuat);
}

function createEniesTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const half = ENIES_WORLD_SIZE * 0.5;

  for (let py = 0; py < size; py++) {
    const z = (py / (size - 1)) * ENIES_WORLD_SIZE - half;
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * ENIES_WORLD_SIZE - half;
      const idx = (py * size + px) * 4;

      const r = Math.hypot(x, z);
      const h = sampleEniesHeight(x, z);
      const hx = sampleEniesHeight(x + 0.9, z);
      const hz = sampleEniesHeight(x, z + 0.9);
      const slope = clamp(Math.hypot(hx - h, hz - h) / 2.4, 0, 1);
      const cliffSd = eniesCliffSignedDist(x, z);
      const grain = (valueNoise2D(x * 1.3, z * 1.3) - 0.5) * 12;

      let rgb: [number, number, number] = [20, 62, 118];
      let alpha = 1;

      if (r > ENIES_ABYSS_RADIUS + 4.5 && cliffSd > 1.5) {
        // Outer ocean smoothly hands off cleanly to globe ocean mesh outside waterfall foam rim
        alpha = 0;
      } else if (r >= ENIES_ABYSS_RADIUS - 1.5 && r <= ENIES_ABYSS_RADIUS + 4.5 && cliffSd > 1.2) {
        // Foaming waterfall lip ring circling the entire abyss (image_ad1ab35a.png)
        const rimT = 1 - smoothstep(0.0, 4.2, Math.abs(r - ENIES_ABYSS_RADIUS));
        rgb = mixRgb([36, 136, 188], [228, 248, 255], rimT);
        alpha = r > ENIES_ABYSS_RADIUS ? 1 - smoothstep(ENIES_ABYSS_RADIUS + 0.8, ENIES_ABYSS_RADIUS + 4.5, r) : 1;
      } else if (h < -6.0) {
        // Deep dark bottomless ocean abyss pit
        const depthT = smoothstep(-28, -8, h);
        rgb = mixRgb([12, 36, 78], [28, 86, 146], depthT);
      } else if (cliffSd <= 1.2) {
        // Island cliff pedestals: ochre/brown craggy cliff underside + vibrant emerald grass overhang + stone plaza
        const grassTop = cliffSd < -0.45 && slope < 0.30;
        if (Math.abs(x) < 8.4 && z > 66.8 && z < 77.2) {
          // Checkered turquoise/slate Sea Train Pier (enies_lobby_e28058f3.JPG)
          const check = ((Math.floor(x * 0.65) + Math.floor(z * 0.65)) & 1) === 0;
          rgb = check ? [96, 184, 198] : [132, 136, 172];
        } else if (!grassTop) {
          // Craggy earth/limestone cliff rock (image_ad1ab35a.png)
          const crag = valueNoise2D(x * 0.42, z * 0.42);
          rgb = mixRgb([118, 96, 68], [156, 134, 96], crag);
        } else {
          // Lush green grass cap + warm limestone central plaza
          const grassPatch = valueNoise2D(x * 0.18 + 3.1, z * 0.18 + 1.2);
          rgb = mixRgb([86, 174, 64], [116, 198, 78], grassPatch);

          const plazaD = eniesMainPlazaSignedDist(x, z);
          if (plazaD < 0.8) {
            const pT = 1 - smoothstep(-0.4, 0.8, plazaD);
            const tile = ((Math.floor(x * 0.8) + Math.floor(z * 0.8)) & 1) === 0 ? 5 : -5;
            rgb = mixRgb(rgb, [232 + tile, 224 + tile, 206 + tile], pT * 0.92);
          } else if (Math.hypot(x, z - 2.5) < 24.5 && z < 23 && z > -20) {
            // Warm sand/stone courthouse town courtyard ground under terracotta blocks
            rgb = mixRgb(rgb, [218, 204, 178], 0.72);
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
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createEniesBannerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ddd6c2';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#b88924';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 118);
    ctx.fillStyle = '#141c24';
    ctx.font = 'bold 62px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ENIES LOBBY', 256, 66);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWorldGovFlagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, 250, 154);

    // Canonical World Government 5-circle cross emblem
    ctx.strokeStyle = '#1a2838';
    ctx.fillStyle = '#1a2838';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(86, 80);
    ctx.lineTo(170, 80);
    ctx.moveTo(128, 38);
    ctx.lineTo(128, 122);
    ctx.stroke();

    for (const [cx, cy] of [
      [128, 80],
      [86, 80],
      [170, 80],
      [128, 38],
      [128, 122],
    ]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8f9fa';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a2838';
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWaterfallCurtainTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, 'rgba(230, 250, 255, 0.96)');
    grad.addColorStop(0.14, 'rgba(92, 206, 240, 0.88)');
    grad.addColorStop(0.75, 'rgba(42, 148, 212, 0.78)');
    grad.addColorStop(1.0, 'rgba(210, 246, 255, 0.94)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
    for (let x = 0; x < 512; x += 14) {
      const w = 3 + ((x * 7) % 5);
      ctx.fillRect(x, 0, w, 256);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  return tex;
}

/**
 * Enies Lobby — Faithful 3D Judicial / Never-Night Island matching
 * enies_lobby_e28058f3.JPG and image_ad1ab35a.png:
 * Outer Grillage fence, checkered Sea Train pier, Porte Principale gate islet,
 * grassy causeway framed by clouds, 360-degree waterfall abyss dropping to -28m,
 * Porte de l'Île Principale, terracotta courthouse district town, Palais de la Justice,
 * gold-and-emerald Tour Judiciaire ("ENIES LOBBY"), Pont de l'Hésitation, and Gates of Justice.
 */
export function createIslandMesh(ctx: IslandMeshContext): IslandMeshInstance {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const group = new THREE.Group();
  group.name = 'island-enies-lobby';
  const registerTex = <T extends THREE.Texture>(t: T): T => (trackTex ? trackTex(t) : t);

  // 1. Sculpted Cliff Pedestal & Deep Chasm Terrain Mesh (200 x 200)
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(ENIES_WORLD_SIZE, ENIES_WORLD_SIZE, 200, 200)
  );
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const ly = sampleEniesHeight(lx, lz);
    const sp = toEniesSphereLocal(lx, ly, lz, globeRadius);
    posAttr.setXYZ(i, sp.x, sp.y, sp.z);
  }
  posAttr.needsUpdate = true;
  terrainGeo.computeVertexNormals();

  const tTex = registerTex(createEniesTerrainTexture(1024));
  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tTex,
      roughness: 0.78,
      metalness: 0.04,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  group.add(terrainMesh);

  // Shared Neoclassical Enies Lobby Materials (image_ad1ab35a.png palette, ACES-balanced limestone)
  const whiteMarbleMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xbcc4ce, roughness: 0.85 })
  );
  const emeraldPanelMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x266c40, roughness: 0.72 })
  );
  const goldTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc99628,
      roughness: 0.42,
      metalness: 0.45,
    })
  );
  const archVoidMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x26384a, roughness: 0.85 })
  );
  const slateGateMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x627488, roughness: 0.72, metalness: 0.25 })
  );
  const ironFenceMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x2e3b46, roughness: 0.45, metalness: 0.65 })
  );
  const greenFoliageMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x4ca848, roughness: 0.85 })
  );
  const cloudMistMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xeef2fb,
      emissive: 0xa2b6d9,
      emissiveIntensity: 0.22,
      roughness: 0.92,
      transparent: true,
      opacity: 0.82,
    })
  );

  const flagTex = registerTex(createWorldGovFlagTexture());
  const flagMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: flagTex,
      roughness: 0.6,
      side: THREE.DoubleSide,
    })
  );

  const addFlag = (parent: THREE.Group, lx: number, ly: number, lz: number, h = 4.2) => {
    const pole = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.12 * S, 0.14 * S, h * S, 6)),
      goldTrimMat
    );
    pole.position.set(lx * S, (ly + h * 0.5) * S, lz * S);
    const cloth = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(2.8 * S, 1.8 * S)),
      flagMat
    );
    cloth.position.set((lx + 1.4) * S, (ly + h - 0.9) * S, lz * S);
    parent.add(pole, cloth);
  };

  // 2. 360-Degree Vertical Waterfall Curtain plunging into the Abyss (r = 68m)
  const wfTex = registerTex(createWaterfallCurtainTexture());
  const wfCurtainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: wfTex,
      emissive: 0x3ba8dc,
      emissiveIntensity: 0.28,
      roughness: 0.2,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    })
  );

  const curtainGeo = trackGeo(
    new THREE.CylinderGeometry(
      ENIES_ABYSS_RADIUS * S,
      (ENIES_ABYSS_RADIUS - 1.2) * S,
      Math.abs(ENIES_ABYSS_FLOOR_Y) * S,
      56,
      1,
      true
    )
  );
  const curtainMesh = new THREE.Mesh(curtainGeo, wfCurtainMat);
  placeOnEniesSphere(
    curtainMesh,
    0,
    ENIES_ABYSS_FLOOR_Y * 0.5 + 0.15,
    0,
    globeRadius,
    0
  );
  group.add(curtainMesh);

  // Dark deep-blue abyssal water disc at floor (-26.5m)
  const abyssDiscMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x0b254a, roughness: 0.35 })
  );
  const abyssDisc = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(ENIES_ABYSS_RADIUS * S, 48)),
    abyssDiscMat
  );
  placeOnEniesSphere(abyssDisc, 0, ENIES_ABYSS_FLOOR_Y + 0.8, 0, globeRadius, 0);
  abyssDisc.rotateX(-Math.PI * 0.5);
  group.add(abyssDisc);

  // Swirling White Mist Clouds around Central Causeway & Chasm Walls (enies_lobby_e28058f3.JPG)
  const cloudGeo = trackGeo(new THREE.IcosahedronGeometry(2.8 * S, 1));
  const mistBanks: Array<[number, number, number, number]> = [
    [-8.5, -1.5, 45, 1.2],
    [-13.5, -1.8, 41, 1.4],
    [-10.0, -2.2, 36, 1.3],
    [8.5, -1.5, 45, 1.2],
    [13.5, -1.8, 41, 1.4],
    [10.0, -2.2, 36, 1.3],
    [-28, -5.0, 22, 1.8],
    [28, -5.0, 22, 1.8],
    [-22, -6.5, -28, 1.7],
    [22, -6.5, -28, 1.7],
  ];
  for (const [cx, cy, cz, sc] of mistBanks) {
    const cloud = new THREE.Mesh(cloudGeo, cloudMistMat);
    placeOnEniesSphere(cloud, cx, cy, cz, globeRadius, cx * 0.2);
    cloud.scale.set(sc * 1.45, sc * 0.65, sc * 1.25);
    group.add(cloud);
  }

  // 3. Outer "Grillage" Circular Iron Perimeter Fence (r = 84m) + Open Sea Gate (enies_lobby_e28058f3.JPG)
  {
    const fencePosts = 52;
    const postGeo = trackGeo(new THREE.CylinderGeometry(0.18 * S, 0.22 * S, 6.2 * S, 5));
    const railGeo = trackGeo(new THREE.BoxGeometry(10.2 * S, 0.22 * S, 0.2 * S));
    const postInst = new THREE.InstancedMesh(postGeo, ironFenceMat, fencePosts);
    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let i = 0; i < fencePosts; i++) {
      const ang = (i / fencePosts) * Math.PI * 2;
      const fx = Math.cos(ang) * ENIES_GRILLAGE_RADIUS;
      const fz = Math.sin(ang) * ENIES_GRILLAGE_RADIUS;
      // Leave Southern Sea Train / Ship Entry Gate clear (x in [-11, +11], z > 75)
      if (fz > 75 && Math.abs(fx) < 11) continue;

      placeOnEniesSphere(dummy, fx, 2.2, fz, globeRadius, -ang + Math.PI * 0.5);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      postInst.setMatrixAt(idx++, dummy.matrix);

      // Horizontal cable fence bar linking adjacent stanchions
      const bar = new THREE.Mesh(railGeo, ironFenceMat);
      placeOnEniesSphere(bar, fx, 4.4, fz, globeRadius, -ang + Math.PI * 0.5);
      group.add(bar);
    }
    postInst.count = idx;
    postInst.instanceMatrix.needsUpdate = true;
    group.add(postInst);

    // Twin Sea-Gate Pylons flanking Ferry Pier entrance
    for (const gx of [-10.5, 10.5]) {
      const pylon = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.6 * S, 8.2 * S, 1.6 * S)),
        ironFenceMat
      );
      placeOnEniesSphere(pylon, gx, 3.8, 83.2, globeRadius, 0);
      group.add(pylon);
    }
  }

  // 4. Neoclassical Fortress Gate Complex Builder (White + Emerald + Gold + Flags)
  const buildGateComplex = (
    name: string,
    centerZ: number,
    baseY: number,
    width: number,
    height: number
  ) => {
    const g = new THREE.Group();
    g.name = name;
    placeOnEniesSphere(g, 0, baseY, centerZ, globeRadius, 0);

    // Twin flanking castle bodies framing central open arch portal
    const wingW = width * 0.34;
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(wingW * S, height * S, 5.2 * S)),
        whiteMarbleMat
      );
      wing.position.set(sx * (width * 0.5 - wingW * 0.5) * S, (height * 0.5) * S, 0);
      const emPanel = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(wingW * 0.72 * S, height * 0.55 * S, 5.45 * S)),
        emeraldPanelMat
      );
      emPanel.position.set(wing.position.x, (height * 0.52) * S, 0);
      const turret = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(3.2 * S, (height + 3.4) * S, 4.2 * S)),
        whiteMarbleMat
      );
      turret.position.set(sx * (width * 0.5 - 1.2) * S, ((height + 3.4) * 0.5) * S, 0);
      g.add(wing, emPanel, turret);
      addFlag(g, sx * (width * 0.5 - 1.2), height + 3.4, 0, 3.6);
    }

    // Upper Crown Lintel spanning over Central Arch Tunnel
    const lintel = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(width * S, (height * 0.38) * S, 5.4 * S)),
      whiteMarbleMat
    );
    lintel.position.set(0, (height * 0.85) * S, 0);
    const goldBand = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry((width * 0.42) * S, (height * 0.24) * S, 5.65 * S)),
      goldTrimMat
    );
    goldBand.position.set(0, (height * 0.85) * S, 0);
    const emCenter = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry((width * 0.38) * S, (height * 0.2) * S, 5.75 * S)),
      emeraldPanelMat
    );
    emCenter.position.set(0, (height * 0.85) * S, 0);
    g.add(lintel, goldBand, emCenter);
    addFlag(g, 0, height * 1.04, 0, 4.2);

    group.add(g);
  };

  // Porte Principale (Front Gate Island z = +57.5)
  buildGateComplex('porte-principale', 57.5, ENIES_FRONT_GATE_Y, 22.0, 9.2);

  // Causeway Lush Green Foliage Border (Allée Centrale z = +32..+50)
  const hedgeGeo = trackGeo(new THREE.SphereGeometry(1.1 * S, 8, 6));
  for (let hz = 32; hz <= 50; hz += 3.6) {
    const hy = sampleEniesHeight(3.8, hz);
    for (const sx of [-3.9, 3.9]) {
      const shrub = new THREE.Mesh(hedgeGeo, greenFoliageMat);
      placeOnEniesSphere(shrub, sx, hy + 0.7, hz, globeRadius, 0);
      group.add(shrub);
    }
  }

  // Porte de l'Île Principale (Main Island Inner Gate z = +24.8)
  buildGateComplex('porte-ile-principale', 24.8, ENIES_MAIN_PLATEAU_Y, 24.0, 10.6);

  // 5. Courthouse District Terracotta Mediterranean Town Houses (instanced)
  const houses = buildEniesTownHouses();
  const wallMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 }));
  const roofMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72 }));
  const wallGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const roofGeo = trackGeo(new THREE.BoxGeometry(1, 0.28, 1));

  const wallInst = new THREE.InstancedMesh(wallGeo, wallMat, houses.length);
  const roofInst = new THREE.InstancedMesh(roofGeo, roofMat, houses.length);
  const dummy = new THREE.Object3D();
  const c = new THREE.Color();

  houses.forEach((h, i) => {
    placeOnEniesSphere(dummy, h.x, h.y + h.height * 0.5 - 0.3, h.z, globeRadius, h.yaw);
    dummy.scale.set(h.width * S, h.height * S, h.depth * S);
    dummy.updateMatrix();
    wallInst.setMatrixAt(i, dummy.matrix);
    wallInst.setColorAt(i, c.setHex(h.wallColor));

    placeOnEniesSphere(dummy, h.x, h.y + h.height - 0.15, h.z, globeRadius, h.yaw);
    dummy.scale.set(h.width * 1.06 * S, h.height * 0.45 * S, h.depth * 1.06 * S);
    dummy.updateMatrix();
    roofInst.setMatrixAt(i, dummy.matrix);
    roofInst.setColorAt(i, c.setHex(h.roofColor));
  });
  wallInst.instanceMatrix.needsUpdate = true;
  roofInst.instanceMatrix.needsUpdate = true;
  if (wallInst.instanceColor) wallInst.instanceColor.needsUpdate = true;
  if (roofInst.instanceColor) roofInst.instanceColor.needsUpdate = true;
  group.add(wallInst, roofInst);

  // 6. Palais de la Justice (Courthouse Palace at z = -13.5, leaving clear promenade to Tour Judiciaire)
  buildGateComplex('palais-de-la-justice', -13.5, ENIES_MAIN_PLATEAU_Y, 26.0, 11.4);

  // 7. Towering Tour Judiciaire (Tower of Law at z = -45.5, matching image_ad1ab35a.png!)
  {
    const tower = new THREE.Group();
    tower.name = 'tour-judiciaire';
    placeOnEniesSphere(tower, 0, ENIES_MAIN_PLATEAU_Y, -45.5, globeRadius, 0);

    // Lower Emerald/Gold Courtyard Citadel Tier (y = 0..6.2)
    const baseBlock = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(17.6 * S, 6.2 * S, 12.6 * S)),
      whiteMarbleMat
    );
    baseBlock.position.y = 3.1 * S;
    const baseGold = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(12.6 * S, 5.0 * S, 12.8 * S)),
      goldTrimMat
    );
    baseGold.position.y = 3.1 * S;
    const baseEmerald = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(11.8 * S, 4.4 * S, 12.95 * S)),
      emeraldPanelMat
    );
    baseEmerald.position.y = 3.1 * S;
    const basePortal = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.0 * S, 3.8 * S, 13.15 * S)),
      archVoidMat
    );
    basePortal.position.y = 1.9 * S;
    tower.add(baseBlock, baseGold, baseEmerald, basePortal);

    // Middle Monumental White/Emerald/Gold Tier with pilasters (y = 6.2..12.0)
    const midBlock = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(15.0 * S, 5.8 * S, 11.0 * S)),
      whiteMarbleMat
    );
    midBlock.position.y = 9.1 * S;
    const midGold = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(11.6 * S, 4.4 * S, 11.25 * S)),
      goldTrimMat
    );
    midGold.position.y = 9.1 * S;
    const midEmerald = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(10.8 * S, 3.9 * S, 11.4 * S)),
      emeraldPanelMat
    );
    midEmerald.position.y = 9.1 * S;
    tower.add(midBlock, midGold, midEmerald);
    for (const px of [-2.4, 2.4]) {
      const pilaster = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.55 * S, 4.6 * S, 11.55 * S)),
        goldTrimMat
      );
      pilaster.position.set(px * S, 9.1 * S, 0);
      tower.add(pilaster);
    }
    addFlag(tower, 0, 11.9, 5.85, 3.2);

    // Upper Crown Tower Tier + Arched Colonnade + "ENIES LOBBY" Banner (y = 12.0..17.6)
    const topBlock = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(13.2 * S, 5.6 * S, 9.6 * S)),
      whiteMarbleMat
    );
    topBlock.position.y = 14.8 * S;
    const topCornice = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(13.8 * S, 0.55 * S, 10.1 * S)),
      emeraldPanelMat
    );
    topCornice.position.y = 12.1 * S;
    tower.add(topBlock, topCornice);

    // Dark recessed arched colonnade gallery under the ENIES LOBBY banner (image_ad1ab35a.png)
    const galleryArchGeo = trackGeo(new THREE.BoxGeometry(0.95 * S, 1.65 * S, 9.85 * S));
    for (const ax of [-4.2, -2.1, 0, 2.1, 4.2]) {
      const arch = new THREE.Mesh(galleryArchGeo, archVoidMat);
      arch.position.set(ax * S, 13.6 * S, 0);
      tower.add(arch);
    }

    const bannerTex = registerTex(createEniesBannerTexture());
    const bannerMat = trackMat(
      new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.82 })
    );
    const banner = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(11.8 * S, 2.4 * S)),
      bannerMat
    );
    banner.position.set(0, 16.0 * S, 4.92 * S);
    const bannerBack = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(11.8 * S, 2.4 * S)),
      bannerMat
    );
    bannerBack.position.set(0, 16.0 * S, -4.92 * S);
    bannerBack.rotation.y = Math.PI;
    tower.add(banner, bannerBack);

    // Flanking Corner Turrets
    for (const sx of [-7.6, 7.6]) {
      const cTurret = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(1.3 * S, 1.5 * S, 12.2 * S, 10)),
        whiteMarbleMat
      );
      cTurret.position.set(sx * S, 9.2 * S, 4.4 * S);
      const cap = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(1.55 * S, 2.0 * S, 10)),
        emeraldPanelMat
      );
      cap.position.set(sx * S, 16.2 * S, 4.4 * S);
      tower.add(cTurret, cap);
    }

    addFlag(tower, 0, 17.6, 0, 4.4);
    group.add(tower);
  }

  // 8. Bridge of Hesitation Railings (z = -58..-94) connecting into the monumental Gate of Justice (tarai-current-network)
  {
    for (const rx of [-3.1, 3.1]) {
      const parapet = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.45 * S, 1.35 * S, 36.0 * S)),
        whiteMarbleMat
      );
      placeOnEniesSphere(parapet, rx, 14.1, -76.0, globeRadius, 0);
      group.add(parapet);
    }
  }

  // 9. Eternal Daylight ("Never-Night Island") subtle local sunlight fill
  const neverNightGlow = new THREE.PointLight(0xfff6dc, 0.08, 0.75, 1.5);
  placeOnEniesSphere(neverNightGlow, 0, 48, 0, globeRadius, 0);
  group.add(neverNightGlow);

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    orientYawRad: getEniesLobbyOrientYawRad(),
    update: (elapsed: number) => {
      wfTex.offset.y = -elapsed * 0.45;
      wfCurtainMat.opacity = 0.84 + Math.sin(elapsed * 3.1) * 0.05;
    },
  };
}
