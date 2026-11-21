import * as THREE from 'three';
import { SKYPIEA_ALTITUDE } from './skypieaTerrain';

export interface KnockUpStreamHandle {
  group: THREE.Group;
  update: (elapsed: number) => void;
  dispose: () => void;
}

function createVortexPoolTexture(): THREE.CanvasTexture {
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
        Math.sin(ang * 5 - r * 18) * 0.5 +
        Math.sin(ang * 9 - r * 28 + 1.2) * 0.35 +
        Math.cos(r * 22) * 0.15;
      const band = Math.max(0, Math.min(1, 0.52 + spiral * 0.48));
      const outerFade = 1 - Math.max(0, (r - 0.58) / 0.42);
      const innerBoost = 1 - Math.max(0, (r - 0.38) / 0.62) * 0.3;

      const red = Math.round(52 + band * 185);
      const green = Math.round(178 + band * 74);
      const blue = Math.round(230 + band * 25);
      const alpha = Math.max(0, Math.min(1, outerFade * innerBoost * (0.45 + band * 0.52)));

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

function createVerticalJetTexture(foamFocused: boolean): THREE.CanvasTexture {
  const width = 512;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  if (foamFocused) {
    ctx.clearRect(0, 0, width, height);
  } else {
    const baseGrad = ctx.createLinearGradient(0, 0, width, 0);
    baseGrad.addColorStop(0, 'rgba(38, 178, 235, 0.72)');
    baseGrad.addColorStop(0.5, 'rgba(116, 226, 255, 0.86)');
    baseGrad.addColorStop(1, 'rgba(38, 178, 235, 0.72)');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // Upward rushing feathered vertical water filaments & churning foam ribbons
  for (let i = 0; i < 84; i++) {
    const x = (i * 97) % width;
    const y = (i * 193) % height;
    const streakW = foamFocused ? 3 + (i % 4) * 2 : 5 + (i % 5) * 2;
    const streakH = 120 + (i % 7) * 44;
    const g = ctx.createLinearGradient(x, y, x, y + streakH);
    const peakAlpha = foamFocused ? 0.62 : 0.48;
    g.addColorStop(0, 'rgba(235, 250, 255, 0)');
    g.addColorStop(0.35, `rgba(235, 252, 255, ${peakAlpha})`);
    g.addColorStop(0.65, `rgba(186, 240, 255, ${peakAlpha * 0.8})`);
    g.addColorStop(1, 'rgba(235, 250, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, streakW, streakH);
    if (y + streakH > height) {
      ctx.fillRect(x, y - height, streakW, streakH);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 5);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds the towering vertical Knock Up Stream water column connecting the Blue Sea
 * off Jaya directly up into Skypiea's Angel Bay in front of Angel Beach.
 */
export function createKnockUpStreamModel(): KnockUpStreamHandle {
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
  group.name = 'knock-up-stream';

  const columnHeight = SKYPIEA_ALTITUDE + 0.015;
  const coreTex = trackTex(createVerticalJetTexture(false));
  const sprayTex = trackTex(createVerticalJetTexture(true));
  const poolTex = trackTex(createVortexPoolTexture());

  // 1. Swirling Sea-Surface Eruption Vortex Pool
  const baseVortexGeo = trackGeo(new THREE.CircleGeometry(0.105, 36));
  baseVortexGeo.rotateX(-Math.PI / 2);
  const baseVortexMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: poolTex,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      side: THREE.DoubleSide,
    })
  );
  const baseVortex = new THREE.Mesh(baseVortexGeo, baseVortexMat);
  baseVortex.position.y = 0.004;
  group.add(baseVortex);

  // 2. Sculpted Vertical Core Water Column (translucent outer jet + bright inner spine)
  const coreGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.030, columnHeight, 24, 24, true));
  const cPos = coreGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cPos.count; i++) {
    const x = cPos.getX(i);
    const y = cPos.getY(i);
    const z = cPos.getZ(i);
    const t = (y + columnHeight * 0.5) / columnHeight;
    const profile =
      1.0 +
      0.62 * Math.exp(-t * 8.5) +
      0.42 * Math.exp(-(1 - t) * 9.5) -
      0.16 * Math.sin(t * Math.PI);
    cPos.setXYZ(i, x * profile, y, z * profile);
  }
  coreGeo.computeVertexNormals();

  const coreMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: coreTex,
      color: 0x5be3ff,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.62,
      roughness: 0.2,
      metalness: 0.06,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      side: THREE.FrontSide,
    })
  );
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.position.y = columnHeight * 0.5;
  group.add(coreMesh);

  // Inner luminous water-pressure spine
  const spineGeo = trackGeo(new THREE.CylinderGeometry(0.012, 0.015, columnHeight, 16, 12, true));
  const spineMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: coreTex,
      color: 0xb8f3ff,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.FrontSide,
    })
  );
  const spineMesh = new THREE.Mesh(spineGeo, spineMat);
  spineMesh.position.y = columnHeight * 0.5;
  group.add(spineMesh);

  // 3. Outer Translucent Sea-Spray & Foam Sheath
  const sheathGeo = trackGeo(
    new THREE.CylinderGeometry(0.035, 0.042, columnHeight, 24, 20, true)
  );
  const sPos = sheathGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sPos.count; i++) {
    const x = sPos.getX(i);
    const y = sPos.getY(i);
    const z = sPos.getZ(i);
    const t = (y + columnHeight * 0.5) / columnHeight;
    const profile =
      1.0 +
      0.72 * Math.exp(-t * 8.0) +
      0.48 * Math.exp(-(1 - t) * 8.0) -
      0.12 * Math.sin(t * Math.PI);
    sPos.setXYZ(i, x * profile, y, z * profile);
  }
  sheathGeo.computeVertexNormals();

  const sheathMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: sprayTex,
      color: 0xecfeff,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      side: THREE.FrontSide,
    })
  );
  const sheathMesh = new THREE.Mesh(sheathGeo, sheathMat);
  sheathMesh.position.y = columnHeight * 0.5;
  group.add(sheathMesh);

  // 4. Three Spiraling Helical Water Ribbons coiling upward along the column
  const helixGroup = new THREE.Group();
  const helixMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xe6fbff,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    })
  );
  for (let h = 0; h < 3; h++) {
    const pts: THREE.Vector3[] = [];
    const baseAngle = (h / 3) * Math.PI * 2;
    const segs = 36;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const angle = baseAngle + t * Math.PI * 6.5;
      const r =
        0.034 +
        0.024 * Math.exp(-t * 7.0) +
        0.018 * Math.exp(-(1 - t) * 7.0);
      pts.push(
        new THREE.Vector3(
          Math.cos(angle) * r,
          0.008 + t * (columnHeight - 0.012),
          Math.sin(angle) * r
        )
      );
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = trackGeo(new THREE.TubeGeometry(curve, 36, 0.0040, 6, false));
    helixGroup.add(new THREE.Mesh(tubeGeo, helixMat));
  }
  group.add(helixGroup);

  // 5. Foaming Eruption Collar Rings at Blue Sea base and Angel Bay Crest
  const foamRingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4fcff,
      emissive: 0x7dd3fc,
      emissiveIntensity: 0.32,
      roughness: 0.5,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    })
  );
  const baseRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.052, 0.0088, 10, 28)),
    foamRingMat
  );
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.012;
  group.add(baseRing);

  const crestVortex = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.068, 32)),
    baseVortexMat
  );
  crestVortex.rotation.x = -Math.PI / 2;
  crestVortex.position.y = SKYPIEA_ALTITUDE + 0.004;
  group.add(crestVortex);

  const crestRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.044, 0.0075, 10, 28)),
    foamRingMat
  );
  crestRing.rotation.x = Math.PI / 2;
  crestRing.position.y = SKYPIEA_ALTITUDE + 0.008;
  group.add(crestRing);

  return {
    group,
    update: (elapsed: number) => {
      coreTex.offset.y = -(elapsed * 2.15) % 1;
      sprayTex.offset.y = -(elapsed * 3.05) % 1;
      coreTex.offset.x = (elapsed * 0.28) % 1;
      sprayTex.offset.x = -(elapsed * 0.36) % 1;

      baseVortex.rotation.y = elapsed * 1.65;
      crestVortex.rotation.y = -elapsed * 1.9;
      sheathMesh.rotation.y = elapsed * 0.95;
      helixGroup.rotation.y = elapsed * 1.85;

      const pulse = 1 + Math.sin(elapsed * 4.5) * 0.07;
      baseRing.scale.set(pulse, pulse, 1);
      crestRing.scale.set(2 - pulse * 0.94, 2 - pulse * 0.94, 1);
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
