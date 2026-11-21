import * as THREE from 'three';
import { FISH_MAN_DEPTH } from './fishManIslandTerrain';

export interface SubseaPlungeHandle {
  group: THREE.Group;
  update: (elapsed: number) => void;
  dispose: () => void;
}

function createAbyssalVortexTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size * 0.5;
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let py = 0; py < size; py++) {
    const dy = (py - half) / half;
    for (let px = 0; px < size; px++) {
      const dx = (px - half) / half;
      const r = Math.hypot(dx, dy);
      const idx = (py * size + px) * 4;
      if (r >= 1) {
        data[idx + 3] = 0;
        continue;
      }
      const ang = Math.atan2(dy, dx);
      const spiral =
        Math.sin(ang * 6 + r * 20) * 0.5 +
        Math.sin(ang * 10 + r * 30 + 1.1) * 0.35 +
        Math.cos(r * 18) * 0.15;
      const band = Math.max(0, Math.min(1, 0.55 + spiral * 0.45));
      const outerFade = 1 - Math.max(0, (r - 0.58) / 0.42);
      const centerAbyss = Math.min(1, r / 0.22);

      const red = Math.round((32 + band * 145) * centerAbyss + 14);
      const green = Math.round((135 + band * 115) * centerAbyss + 42);
      const blue = Math.round((215 + band * 40) * centerAbyss + 40);
      const alpha = Math.max(0, Math.min(1, outerFade * (0.62 + band * 0.38)));

      data[idx] = red;
      data[idx + 1] = green;
      data[idx + 2] = blue;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createDownCurrentTexture(): THREE.CanvasTexture {
  const width = 256;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, 'rgba(14, 116, 144, 0.45)');
  grad.addColorStop(0.5, 'rgba(103, 232, 249, 0.85)');
  grad.addColorStop(1, 'rgba(14, 116, 144, 0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 72; i++) {
    const x = (i * 53) % width;
    const y = (i * 119) % height;
    const w = 3 + (i % 4) * 2;
    const h = 75 + (i % 6) * 26;
    const sGrad = ctx.createLinearGradient(x, y, x, y + h);
    sGrad.addColorStop(0, 'rgba(224, 247, 255, 0)');
    sGrad.addColorStop(0.45, 'rgba(224, 252, 255, 0.82)');
    sGrad.addColorStop(1, 'rgba(224, 247, 255, 0)');
    ctx.fillStyle = sGrad;
    ctx.fillRect(x, y, w, h);
    if (y + h > height) {
      ctx.fillRect(x, y - height, w, h);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 4);
  tex.needsUpdate = true;
  return tex;
}

interface FloatingBubbleOrb {
  mesh: THREE.Mesh;
  baseAngle: number;
  baseRadius: number;
  phase: number;
  speed: number;
}

/**
 * Builds the unmistakable glowing Subsea Plunge Vortex ("Point de plongée · Courants Périlleux")
 * right beside Sabaody Archipelago so navigators can spot it immediately from Sabaody harbor
 * and plunge -10,000 m automatically toward Fish-Man Island once coated in Yarukiman resin.
 */
export function createSubseaPlungeModel(): SubseaPlungeHandle {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };

  const group = new THREE.Group();
  group.name = 'subsea-plunge-vortex';

  const vortexTex = trackTex(createAbyssalVortexTexture());
  const currentTex = trackTex(createDownCurrentTexture());

  // 1. Wide Swirling Sea-Surface Abyssal Maelstrom Disc
  const vortexGeo = trackGeo(new THREE.CircleGeometry(0.105, 40));
  vortexGeo.rotateX(-Math.PI / 2);
  const vortexMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: vortexTex,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      side: THREE.DoubleSide,
    })
  );
  const vortexDisc = new THREE.Mesh(vortexGeo, vortexMat);
  vortexDisc.position.y = 0.005;
  group.add(vortexDisc);

  // 2. Dual Pulsing Luminous Beacon Rings on the Sea Surface
  const outerBeaconMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.95,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
  );
  const outerBeaconRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.064, 0.0065, 12, 36)),
    outerBeaconMat
  );
  outerBeaconRing.rotation.x = Math.PI / 2;
  outerBeaconRing.position.y = 0.011;
  group.add(outerBeaconRing);

  const innerBeaconMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe0f7ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.05,
      roughness: 0.18,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    })
  );
  const innerBeaconRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.04, 0.0048, 10, 32)),
    innerBeaconMat
  );
  innerBeaconRing.rotation.x = Math.PI / 2;
  innerBeaconRing.position.y = 0.016;
  group.add(innerBeaconRing);

  // 3. Above-Water Luminous Sea-Spray & Abyssal Vortex Aura Column (clearly visible from Sabaody at deck level)
  const aboveColumnH = 0.25;
  const aboveColumnGeo = trackGeo(
    new THREE.CylinderGeometry(0.068, 0.028, aboveColumnH, 24, 10, true)
  );
  const aboveColumnMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: currentTex,
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const aboveColumnMesh = new THREE.Mesh(aboveColumnGeo, aboveColumnMat);
  aboveColumnMesh.position.y = aboveColumnH * 0.5;
  group.add(aboveColumnMesh);

  // 4. Downward Plunge Current Funnel extending beneath the ocean toward Fish-Man depth
  const shaftH = FISH_MAN_DEPTH * 0.72;
  const funnelGeo = trackGeo(
    new THREE.CylinderGeometry(0.042, 0.018, shaftH, 20, 14, true)
  );
  const funnelMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: currentTex,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const funnelMesh = new THREE.Mesh(funnelGeo, funnelMat);
  funnelMesh.position.y = -shaftH * 0.5;
  group.add(funnelMesh);

  // 5. Three Helical Current Ribbons spanning from above the surface down into the abyss
  const helixGroup = new THREE.Group();
  const helixMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xbaf2ff,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
    })
  );
  for (let h = 0; h < 3; h++) {
    const pts: THREE.Vector3[] = [];
    const baseAngle = (h / 3) * Math.PI * 2;
    for (let s = 0; s <= 36; s++) {
      const t = s / 36;
      const y = 0.16 - t * (shaftH + 0.16);
      const angle = baseAngle - t * Math.PI * 6.0;
      const r =
        y >= 0
          ? 0.028 + (y / 0.16) * 0.036
          : 0.044 * (1 - (-y / shaftH) * 0.58);
      pts.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    helixGroup.add(
      new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(curve, 36, 0.0036, 6, false)),
        helixMat
      )
    );
  }
  group.add(helixGroup);

  // 6. Rising & Spiraling Luminous Bubble Orbs above the Maelstrom Mouth
  const orbGeo = trackGeo(new THREE.SphereGeometry(0.0068, 10, 10));
  const orbMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xcffafe,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.9,
      roughness: 0.12,
      transparent: true,
      opacity: 0.88,
    })
  );
  const orbs: FloatingBubbleOrb[] = [];
  for (let i = 0; i < 16; i++) {
    const mesh = new THREE.Mesh(orbGeo, orbMat);
    const scale = 0.65 + (i % 4) * 0.28;
    mesh.scale.setScalar(scale);
    group.add(mesh);
    orbs.push({
      mesh,
      baseAngle: (i / 16) * Math.PI * 2,
      baseRadius: 0.026 + (i % 5) * 0.009,
      phase: (i / 16) * 1.0,
      speed: 0.28 + (i % 3) * 0.08,
    });
  }

  // 7. Floating Rotating Diamond Sea-Portal Beacon at Top of Column
  const beaconCrownGroup = new THREE.Group();
  beaconCrownGroup.position.y = 0.30;
  const gemMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.15,
      roughness: 0.15,
      metalness: 0.25,
    })
  );
  const gemMesh = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.022, 0)),
    gemMat
  );
  gemMesh.scale.set(0.85, 1.45, 0.85);
  beaconCrownGroup.add(gemMesh);

  const haloMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
    })
  );
  const haloRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.036, 0.0032, 8, 28)),
    haloMat
  );
  beaconCrownGroup.add(haloRing);
  group.add(beaconCrownGroup);

  return {
    group,
    update: (elapsed: number) => {
      currentTex.offset.y = (elapsed * 1.85) % 1;
      vortexDisc.rotation.y = -elapsed * 1.35;
      aboveColumnMesh.rotation.y = -elapsed * 1.1;
      helixGroup.rotation.y = -elapsed * 1.65;

      const pulseOuter = 1 + Math.sin(elapsed * 3.6) * 0.1;
      outerBeaconRing.scale.set(pulseOuter, pulseOuter, 1);
      const pulseInner = 1 + Math.cos(elapsed * 4.4) * 0.12;
      innerBeaconRing.scale.set(pulseInner, pulseInner, 1);

      beaconCrownGroup.position.y = 0.29 + Math.sin(elapsed * 2.4) * 0.022;
      gemMesh.rotation.y = elapsed * 1.8;
      haloRing.rotation.x = Math.PI * 0.25 + Math.sin(elapsed * 1.5) * 0.2;
      haloRing.rotation.y = elapsed * 2.1;

      for (const orb of orbs) {
        const cycle = (orb.phase + elapsed * orb.speed) % 1;
        const y = 0.015 + cycle * 0.27;
        const r = orb.baseRadius * (0.7 + cycle * 0.9);
        const ang = orb.baseAngle - elapsed * 2.1 + cycle * Math.PI * 1.5;
        orb.mesh.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
      }
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
