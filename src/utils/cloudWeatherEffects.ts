import * as THREE from 'three';

export interface CloudWeatherEffectsHandle {
  group: THREE.Group;
  update: (params: {
    elapsed: number;
    anchorWorldPos: THREE.Vector3;
    rainIntensity: number;
    snowIntensity: number;
    lightning: number;
    stormFactor: number;
  }) => void;
  dispose: () => void;
}

function createSnowflakeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.45, 'rgba(232, 245, 255, 0.85)');
  grad.addColorStop(1, 'rgba(210, 235, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const _up = new THREE.Vector3(0, 1, 0);
const _norm = new THREE.Vector3();
const _quat = new THREE.Quaternion();

/**
 * Renders lightweight, zero-GC local 3D rain streaks and drifting snowflakes
 * around the ship or zoomed-in camera when beneath rain, storm, or snow clouds.
 */
export function createCloudWeatherEffects(): CloudWeatherEffectsHandle {
  const group = new THREE.Group();
  group.visible = false;

  // 1. Rain streaks (LineSegments in local tangent space: X/Z spread, Y altitude)
  const RAIN_COUNT = 190;
  const rainSeeds = new Float32Array(RAIN_COUNT * 4); // x, z, phase, speedMul
  for (let i = 0; i < RAIN_COUNT; i++) {
    const a = (i * 2.3999632) % (Math.PI * 2);
    const rad = 0.015 + Math.sqrt((i + 0.5) / RAIN_COUNT) * 0.24;
    rainSeeds[i * 4] = Math.cos(a) * rad;
    rainSeeds[i * 4 + 1] = Math.sin(a) * rad;
    rainSeeds[i * 4 + 2] = (i * 0.6180339) % 1;
    rainSeeds[i * 4 + 3] = 0.85 + ((i * 17) % 10) * 0.03;
  }

  const rainPositions = new Float32Array(RAIN_COUNT * 6);
  const rainGeo = new THREE.BufferGeometry();
  const rainAttr = new THREE.BufferAttribute(rainPositions, 3);
  rainAttr.setUsage(THREE.DynamicDrawUsage);
  rainGeo.setAttribute('position', rainAttr);

  const rainMat = new THREE.LineBasicMaterial({
    color: 0xb8d9f5,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  rainLines.frustumCulled = false;
  group.add(rainLines);

  // 2. Snowflakes (Points with soft radial sprite)
  const SNOW_COUNT = 170;
  const snowSeeds = new Float32Array(SNOW_COUNT * 4);
  for (let i = 0; i < SNOW_COUNT; i++) {
    const a = (i * 2.3999632 + 1.1) % (Math.PI * 2);
    const rad = 0.012 + Math.sqrt((i + 0.5) / SNOW_COUNT) * 0.25;
    snowSeeds[i * 4] = Math.cos(a) * rad;
    snowSeeds[i * 4 + 1] = Math.sin(a) * rad;
    snowSeeds[i * 4 + 2] = (i * 0.7548776) % 1;
    snowSeeds[i * 4 + 3] = 0.75 + ((i * 13) % 10) * 0.04;
  }

  const snowPositions = new Float32Array(SNOW_COUNT * 3);
  const snowGeo = new THREE.BufferGeometry();
  const snowAttr = new THREE.BufferAttribute(snowPositions, 3);
  snowAttr.setUsage(THREE.DynamicDrawUsage);
  snowGeo.setAttribute('position', snowAttr);

  const snowTex = createSnowflakeTexture();
  const snowMat = new THREE.PointsMaterial({
    map: snowTex,
    color: 0xf4faff,
    size: 0.0085,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const snowPoints = new THREE.Points(snowGeo, snowMat);
  snowPoints.frustumCulled = false;
  group.add(snowPoints);

  const update: CloudWeatherEffectsHandle['update'] = ({
    elapsed,
    anchorWorldPos,
    rainIntensity,
    snowIntensity,
    lightning,
    stormFactor,
  }) => {
    const showRain = rainIntensity > 0.04;
    const showSnow = snowIntensity > 0.04;
    if (!showRain && !showSnow) {
      group.visible = false;
      return;
    }

    group.visible = true;
    group.position.copy(anchorWorldPos);
    _norm.copy(anchorWorldPos).normalize();
    _quat.setFromUnitVectors(_up, _norm);
    group.quaternion.copy(_quat);

    rainLines.visible = showRain;
    if (showRain) {
      const heightSpan = 0.28;
      const fallSpeed = 0.55 + stormFactor * 0.4;
      const windTiltX = 0.006 + stormFactor * 0.013;
      const streakLen = 0.018 + stormFactor * 0.014;
      const activeCount = Math.max(
        24,
        Math.floor(RAIN_COUNT * Math.min(1, 0.35 + rainIntensity * 0.65))
      );
      rainGeo.setDrawRange(0, activeCount * 2);

      for (let i = 0; i < activeCount; i++) {
        const bx = rainSeeds[i * 4];
        const bz = rainSeeds[i * 4 + 1];
        const phase = rainSeeds[i * 4 + 2];
        const spd = rainSeeds[i * 4 + 3];
        const progress = (elapsed * fallSpeed * spd + phase) % 1;
        const yTop = (1 - progress) * heightSpan - 0.01;
        const driftX = bx + progress * windTiltX * 4.0;
        const idx = i * 6;
        rainPositions[idx] = driftX;
        rainPositions[idx + 1] = yTop;
        rainPositions[idx + 2] = bz;
        rainPositions[idx + 3] = driftX + windTiltX;
        rainPositions[idx + 4] = yTop - streakLen;
        rainPositions[idx + 5] = bz + windTiltX * 0.25;
      }
      rainAttr.needsUpdate = true;
      rainMat.opacity = Math.min(0.76, rainIntensity * (0.45 + stormFactor * 0.28));
      if (lightning > 0.05) {
        rainMat.color.setRGB(
          0.78 + lightning * 0.22,
          0.86 + lightning * 0.14,
          1.0
        );
      } else {
        rainMat.color.setHex(0xb8d9f5);
      }
    }

    snowPoints.visible = showSnow;
    if (showSnow) {
      const heightSpan = 0.26;
      const fallSpeed = 0.14;
      const activeCount = Math.max(
        24,
        Math.floor(SNOW_COUNT * Math.min(1, 0.35 + snowIntensity * 0.65))
      );
      snowGeo.setDrawRange(0, activeCount);

      for (let i = 0; i < activeCount; i++) {
        const bx = snowSeeds[i * 4];
        const bz = snowSeeds[i * 4 + 1];
        const phase = snowSeeds[i * 4 + 2];
        const spd = snowSeeds[i * 4 + 3];
        const progress = (elapsed * fallSpeed * spd + phase) % 1;
        const swayX = Math.sin(elapsed * 1.9 + phase * 18) * 0.014;
        const swayZ = Math.cos(elapsed * 1.6 + phase * 14) * 0.014;
        const idx = i * 3;
        snowPositions[idx] = bx + swayX;
        snowPositions[idx + 1] = (1 - progress) * heightSpan - 0.01;
        snowPositions[idx + 2] = bz + swayZ;
      }
      snowAttr.needsUpdate = true;
      snowMat.opacity = Math.min(0.92, snowIntensity * 0.85);
    }
  };

  return {
    group,
    update,
    dispose: () => {
      rainGeo.dispose();
      rainMat.dispose();
      snowGeo.dispose();
      snowMat.dispose();
      snowTex.dispose();
    },
  };
}
