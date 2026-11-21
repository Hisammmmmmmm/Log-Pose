import * as THREE from 'three';
import { valueNoise2D } from '../utils/globeMath';
import {
  RM_CANALS,
  RM_GLOBE_SCALE,
  RM_LOCAL_EXTENT,
  RM_MOUNTAIN_BASE_RADIUS,
  RM_OUTER_CURRENT_RADIUS,
  RM_SUMMIT_RADIUS,
  RM_SUMMIT_WATER_Y,
  getCanalHalfWidthAtRadius,
  sampleReverseMountainAt,
  sampleReverseMountainClimbY,
  toReverseMountainSphereLocal,
} from '../utils/reverseMountainTerrain';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = RM_GLOBE_SCALE;
const _dummy = new THREE.Object3D();
const _up = new THREE.Vector3(0, 1, 0);
const _norm = new THREE.Vector3();

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
  const k = clamp(t, 0, 1);
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}

export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance {
  const { globeRadius, trackGeo, trackMat } = ctx;
  const group = new THREE.Group();
  group.name = 'island-reverse-mountain';

  // 1. Sculpted Crimson Mountain & Carved 5-Canal Canyon Terrain (232 x 232 curved shell)
  const segs = 232;
  const vertsPerRow = segs + 1;
  const vertCount = vertsPerRow * vertsPerRow;
  const positions = new Float32Array(vertCount * 3);
  const colors = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);

  const deepRock: [number, number, number] = [0.105, 0.020, 0.017];
  const crimsonRock: [number, number, number] = [0.215, 0.042, 0.030];
  const sunlitOchre: [number, number, number] = [0.335, 0.085, 0.046];
  const summitMist: [number, number, number] = [0.420, 0.140, 0.082];
  const wetCanyon: [number, number, number] = [0.055, 0.022, 0.022];

  for (let iz = 0; iz <= segs; iz++) {
    const fz = iz / segs;
    const lz = (fz - 0.5) * RM_LOCAL_EXTENT * 2;
    for (let ix = 0; ix <= segs; ix++) {
      const fx = ix / segs;
      const lx = (fx - 0.5) * RM_LOCAL_EXTENT * 2;
      const idx = iz * vertsPerRow + ix;

      const s = sampleReverseMountainAt(lx, lz);
      const r = Math.hypot(lx, lz);

      // Skirt outer border cleanly down below sea level outside Red Line corridor
      let rockY = s.rockY;
      const edgeFade = Math.max(
        smoothstep(RM_LOCAL_EXTENT - 24, RM_LOCAL_EXTENT, Math.abs(lx)),
        smoothstep(RM_LOCAL_EXTENT - 24, RM_LOCAL_EXTENT, Math.abs(lz))
      );
      if (edgeFade > 0) {
        // Keep N/S Red Line spine blending smoothly into planetary Red Line height (~40)
        const isRedLineSpine = Math.abs(lx) < 105 && Math.abs(lz) > 105;
        const borderTarget = isRedLineSpine ? 34 : -4.5;
        rockY = rockY * (1 - edgeFade) + borderTarget * edgeFade;
      }

      const sp = toReverseMountainSphereLocal(lx, rockY, lz, globeRadius);
      positions[idx * 3] = sp.x;
      positions[idx * 3 + 1] = sp.y;
      positions[idx * 3 + 2] = sp.z;

      uvs[idx * 2] = fx;
      uvs[idx * 2 + 1] = fz;

      // Geological color strata (terracotta red strata + damp wet gorge walls + sunlit spires)
      const strata = 0.5 + 0.5 * Math.sin(rockY * 0.42 + valueNoise2D(lx * 0.1, lz * 0.1) * 2.5);
      let rgb = mixRgb(deepRock, crimsonRock, strata * 0.75 + 0.15);

      const ridgeHighlight = smoothstep(32, 74, rockY);
      rgb = mixRgb(rgb, sunlitOchre, ridgeHighlight * 0.65);

      const peakCrown = smoothstep(64, 84, rockY);
      rgb = mixRgb(rgb, summitMist, peakCrown * 0.45);

      // Darken wet rock walls immediately flanking the 5 climbing canals
      const nearWaterWall =
        r < RM_MOUNTAIN_BASE_RADIUS + 8 &&
        rockY <= s.waterY + 4.5 &&
        s.distToCenterline < s.halfWidth + 5.5;
      if (nearWaterWall) {
        rgb = mixRgb(rgb, wetCanyon, 0.72);
      }

      colors[idx * 3] = rgb[0];
      colors[idx * 3 + 1] = rgb[1];
      colors[idx * 3 + 2] = rgb[2];
    }
  }

  const indices: number[] = [];
  for (let iz = 0; iz < segs; iz++) {
    for (let ix = 0; ix < segs; ix++) {
      const a = iz * vertsPerRow + ix;
      const b = a + 1;
      const c = (iz + 1) * vertsPerRow + ix;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const terrainGeo = trackGeo(new THREE.BufferGeometry());
  terrainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  terrainGeo.setIndex(indices);
  terrainGeo.computeVertexNormals();

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.04,
      flatShading: false,
    })
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  group.add(terrainMesh);

  // 2. Animated Rising Marine Current Ribbons (4 ascending canals + 1 Grand Line descent)
  const sharedWaterUniforms = {
    uTime: { value: 0 },
  };

  const canalCurrentMat = trackMat(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: sharedWaterUniforms.uTime,
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        varying float vSlope;
        attribute float aSlope;
        void main() {
          vUv = uv;
          vSlope = aSlope;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vSlope;

        void main() {
          // vUv.y goes 0 (start of canal) -> 1 (end of canal):
          // For entry canals: 0 = ocean mouth -> 1 = summit (scrolls UPWARD!)
          // For exit chute: 0 = summit -> 1 = Grand Line (scrolls DOWNWARD!)
          float flowPhase = vUv.y * 34.0 - uTime * 4.4;
          float lateral = abs(vUv.x - 0.5) * 2.0; // 0 center, 1 canyon wall

          // Multi-layered V-shaped directional chevron currents & central turbulent wakes
          float chevron = sin(flowPhase - lateral * 4.6);
          float streakA = smoothstep(0.30, 0.92, chevron) * (1.0 - smoothstep(0.72, 1.0, lateral) * 0.45);
          float streakB = smoothstep(0.52, 0.96, sin(vUv.y * 68.0 - uTime * 7.2 + sin(vUv.x * 22.0) * 1.1));
          float centerRush = smoothstep(0.58, 0.98, sin(vUv.y * 92.0 - uTime * 9.0 + vUv.x * 14.0)) * (1.0 - smoothstep(0.0, 0.45, lateral));

          // Canyon-wall whitewater spray foam
          float edgeFoam = smoothstep(0.54, 0.94, lateral);
          float slopeBoost = clamp(vSlope * 1.4, 0.0, 1.0);

          vec3 deepCurrent = vec3(0.05, 0.44, 0.64);
          vec3 brightCurrent = vec3(0.18, 0.78, 0.92);
          vec3 foamColor = vec3(0.90, 0.98, 1.0);

          vec3 col = mix(deepCurrent, brightCurrent, 0.45 + 0.4 * slopeBoost);
          float foamMask = clamp(streakA * 0.44 + streakB * 0.30 + centerRush * 0.34 + edgeFoam * 0.78, 0.0, 1.0);
          col = mix(col, foamColor, foamMask);

          float alpha = mix(0.86, 0.97, clamp(edgeFoam + streakA * 0.4, 0.0, 1.0));
          // Feather ends smoothly into ocean sea surface
          float endFade = smoothstep(0.0, 0.05, vUv.y) * (1.0 - smoothstep(0.95, 1.0, vUv.y) * 0.25);
          gl_FragColor = vec4(col, alpha * endFade);
        }
      `,
    })
  );

  for (const canal of RM_CANALS) {
    const startVec = new THREE.Vector2(canal.startX, canal.startZ);
    const endVec = new THREE.Vector2(canal.endX, canal.endZ);
    // Extend slightly farther into the Four Blues / Paradise for clear visual approach currents
    const dir2 = endVec.clone().sub(startVec).normalize();
    const fullStart = canal.isDescent
      ? startVec.clone().addScaledVector(dir2, 7.5)
      : startVec.clone().addScaledVector(dir2, -(RM_OUTER_CURRENT_RADIUS - 205));
    const fullEnd = canal.isDescent
      ? endVec.clone().addScaledVector(dir2, 16)
      : endVec.clone().addScaledVector(dir2, -7.5);

    const steps = 96;
    const cPositions = new Float32Array((steps + 1) * 2 * 3);
    const cUvs = new Float32Array((steps + 1) * 2 * 2);
    const cSlopes = new Float32Array((steps + 1) * 2);
    const cIndices: number[] = [];

    const perpX = -dir2.y;
    const perpZ = dir2.x;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = fullStart.x + (fullEnd.x - fullStart.x) * t;
      const cz = fullStart.y + (fullEnd.y - fullStart.y) * t;
      const r = Math.hypot(cx, cz);
      const waterY = sampleReverseMountainClimbY(r, canal.isDescent) - 0.08;
      const waterYNext = sampleReverseMountainClimbY(Math.max(0, r - 2), canal.isDescent) - 0.08;
      const slopeVal = Math.abs(waterYNext - waterY) * 0.65;
      const hw = getCanalHalfWidthAtRadius(r) * 1.18;

      const leftSp = toReverseMountainSphereLocal(
        cx - perpX * hw,
        waterY,
        cz - perpZ * hw,
        globeRadius
      );
      const rightSp = toReverseMountainSphereLocal(
        cx + perpX * hw,
        waterY,
        cz + perpZ * hw,
        globeRadius
      );

      const base = i * 2;
      cPositions[base * 3] = leftSp.x;
      cPositions[base * 3 + 1] = leftSp.y;
      cPositions[base * 3 + 2] = leftSp.z;
      cPositions[(base + 1) * 3] = rightSp.x;
      cPositions[(base + 1) * 3 + 1] = rightSp.y;
      cPositions[(base + 1) * 3 + 2] = rightSp.z;

      cUvs[base * 2] = 0;
      cUvs[base * 2 + 1] = t;
      cUvs[(base + 1) * 2] = 1;
      cUvs[(base + 1) * 2 + 1] = t;

      cSlopes[base] = slopeVal;
      cSlopes[base + 1] = slopeVal;

      if (i < steps) {
        const a = base;
        const b = base + 1;
        const c = base + 2;
        const d = base + 3;
        cIndices.push(a, c, b, b, c, d);
      }
    }

    const canalGeo = trackGeo(new THREE.BufferGeometry());
    canalGeo.setAttribute('position', new THREE.BufferAttribute(cPositions, 3));
    canalGeo.setAttribute('uv', new THREE.BufferAttribute(cUvs, 2));
    canalGeo.setAttribute('aSlope', new THREE.BufferAttribute(cSlopes, 1));
    canalGeo.setIndex(cIndices);
    canalGeo.computeVertexNormals();

    const canalMesh = new THREE.Mesh(canalGeo, canalCurrentMat);
    canalMesh.renderOrder = 2;
    group.add(canalMesh);
  }

  // 3. Summit Swirling Whirlpool Basin (y = RM_SUMMIT_WATER_Y)
  const summitRings = 16;
  const summitSegs = 40;
  const summitR = RM_SUMMIT_RADIUS + 2.2;
  const sPositions: number[] = [];
  const sUvs: number[] = [];
  const sIndices: number[] = [];

  for (let ir = 0; ir <= summitRings; ir++) {
    const fr = ir / summitRings;
    const rad = fr * summitR;
    for (let ia = 0; ia <= summitSegs; ia++) {
      const ang = (ia / summitSegs) * Math.PI * 2;
      const lx = Math.cos(ang) * rad;
      const lz = Math.sin(ang) * rad;
      const sp = toReverseMountainSphereLocal(
        lx,
        RM_SUMMIT_WATER_Y - 0.04,
        lz,
        globeRadius
      );
      sPositions.push(sp.x, sp.y, sp.z);
      sUvs.push(0.5 + (lx / summitR) * 0.5, 0.5 + (lz / summitR) * 0.5);
    }
  }
  for (let ir = 0; ir < summitRings; ir++) {
    for (let ia = 0; ia < summitSegs; ia++) {
      const a = ir * (summitSegs + 1) + ia;
      const b = a + 1;
      const c = (ir + 1) * (summitSegs + 1) + ia;
      const d = c + 1;
      sIndices.push(a, c, b, b, c, d);
    }
  }

  const summitGeo = trackGeo(new THREE.BufferGeometry());
  summitGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPositions, 3));
  summitGeo.setAttribute('uv', new THREE.Float32BufferAttribute(sUvs, 2));
  summitGeo.setIndex(sIndices);
  summitGeo.computeVertexNormals();

  const summitVortexMat = trackMat(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: sharedWaterUniforms.uTime,
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float r = length(p);
          float ang = atan(p.y, p.x);
          float swirl = sin(ang * 4.0 + r * 14.0 - uTime * 3.8);
          float ring = sin(r * 22.0 - uTime * 4.2);
          float foam = smoothstep(0.35, 0.95, swirl * 0.65 + ring * 0.35);

          vec3 baseBlue = vec3(0.08, 0.58, 0.78);
          vec3 foamWhite = vec3(0.90, 0.98, 1.0);
          vec3 col = mix(baseBlue, foamWhite, foam * 0.75 + smoothstep(0.75, 1.0, r) * 0.35);
          float alpha = 0.90 * (1.0 - smoothstep(0.92, 1.0, r));
          gl_FragColor = vec4(col, alpha);
        }
      `,
    })
  );
  const summitMesh = new THREE.Mesh(summitGeo, summitVortexMat);
  summitMesh.renderOrder = 3;
  group.add(summitMesh);

  // (4. Water-current chevron & turbulent streaks are rendered cleanly inside canalCurrentMat shader)

  // 5. Iconic Crimson Stone Portal Buttresses along the 4 Mountain Mouths & Exit Gate
  const pillarGeo = trackGeo(new THREE.CylinderGeometry(1.6 * S, 2.8 * S, 18 * S, 7));
  const pillarMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x621b14,
      roughness: 0.92,
      metalness: 0.04,
    })
  );
  const pillarCoords: { x: number; z: number; y: number; hScale: number }[] = [];

  for (const canal of RM_CANALS) {
    const dx = canal.endX - canal.startX;
    const dz = canal.endZ - canal.startZ;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len;
    const uz = dz / len;
    const px = -uz;
    const pz = ux;

    const portalRadii = canal.isDescent ? [112] : [126, 78];
    for (const pr of portalRadii) {
      const cx = (canal.isDescent ? ux : -ux) * pr;
      const cz = (canal.isDescent ? uz : -uz) * pr;
      const wy = sampleReverseMountainClimbY(pr, canal.isDescent);
      const offset = getCanalHalfWidthAtRadius(pr) + 4.4;
      pillarCoords.push(
        { x: cx + px * offset, z: cz + pz * offset, y: wy + 7, hScale: 1.0 },
        { x: cx - px * offset, z: cz - pz * offset, y: wy + 7, hScale: 1.0 }
      );
    }
  }

  const pillarInstanced = new THREE.InstancedMesh(
    pillarGeo,
    pillarMat,
    pillarCoords.length
  );
  pillarCoords.forEach((p, idx) => {
    const sp = toReverseMountainSphereLocal(p.x, p.y, p.z, globeRadius);
    _dummy.position.set(sp.x, sp.y, sp.z);
    _norm.set(sp.x, sp.y + globeRadius, sp.z).normalize();
    _dummy.quaternion.setFromUnitVectors(_up, _norm);
    _dummy.scale.set(1, p.hScale, 1);
    _dummy.updateMatrix();
    pillarInstanced.setMatrixAt(idx, _dummy.matrix);
  });
  pillarInstanced.instanceMatrix.needsUpdate = true;
  group.add(pillarInstanced);

  // 6. Grand Line Eastern Splash Foam Ring at Paradise Exit (x = 124, z = 0)
  const splashGeo = trackGeo(new THREE.RingGeometry(4.5 * S, 9.8 * S, 24));
  const splashMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xcffafe,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const splashMesh = new THREE.Mesh(splashGeo, splashMat);
  const splashPos = toReverseMountainSphereLocal(124, 0.6, 0, globeRadius);
  splashMesh.position.set(splashPos.x, splashPos.y, splashPos.z);
  splashMesh.rotation.x = -Math.PI / 2;
  group.add(splashMesh);

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      sharedWaterUniforms.uTime.value = elapsed;
      const pulse = 0.92 + Math.sin(elapsed * 3.5) * 0.1;
      splashMesh.scale.setScalar(pulse);
    },
  };
}
