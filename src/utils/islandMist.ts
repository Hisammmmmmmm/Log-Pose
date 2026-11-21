import * as THREE from 'three';
import { equirectangularToSphere, type IslandLocation, type Vec3 } from './globeMath';
import { TOTTO_LAND_ISLAND_BY_ID } from './tottoLandTerrain';

export interface IslandMistSpec {
  coastRadius: number;
  mistRadius: number;
  mistHeight: number;
  innerClearDist: number;
  outerFadeDist: number;
  densityScale: number;
}

export interface IslandMistFactorParams {
  distToShip: number;
  innerClearDist: number;
  outerFadeDist: number;
  maxHorizonDist?: number;
  navMix: number;
  hideForSubseaMix?: number;
  altitudeFadeMix?: number;
}

export interface IslandMistSourceRecord {
  island: IslandLocation;
  basePos: THREE.Vector3;
}

export interface IslandMistSystemUpdateParams {
  elapsed: number;
  sunnyPos: Vec3 | THREE.Vector3 | null;
  cameraPos: THREE.Vector3;
  sunDir: THREE.Vector3;
  sailingActive: boolean;
  daylight: number;
  isTwilight: boolean;
  hideForSubseaMix?: number;
  sunnyElevation?: number;
}

export interface IslandMistTelemetrySnapshot {
  nearestIslandMistFactor: number;
  activeMistIslandCount: number;
}

export interface IslandMistSystemHandle {
  mesh: THREE.InstancedMesh;
  syncAnchorPositions: () => void;
  update: (params: IslandMistSystemUpdateParams) => IslandMistTelemetrySnapshot;
  dispose: () => void;
}

/**
 * Stacked sub-locations lying inside the same compact island coastline as a primary
 * custom 3D island. Excluded from spawning duplicate overlapping mist rings.
 */
const STACKED_SUB_LOCATION_IDS = new Set<string>([
  'foosha-village',
  'goa-kingdom',
  'arlong-park',
  'cocoyashi-village',
  'gosa-village',
  'syrup-village',
  'honey-town',
  'black-cat-beach',
  'orange-town',
  'acacia',
  'corrida-colosseum',
  'royal-palace-dressrosa',
  'flower-hill',
  'flower-capital',
  'kuri',
  'kibi',
  'udon',
  'ringo',
  'hakumai',
  'onigashima',
  'mock-town',
  'labophase',
  'fabriophase',
  'aurust-castle',
  'underworld-elbaf',
  'heaven-world-elbaf',
]);

const CUSTOM_COAST_RADII: Readonly<Record<string, number>> = {
  alabasta: 0.38,
  wano: 0.42,
  zou: 0.31,
  'whole-cake-island': 0.28,
  dressrosa: 0.23,
  'green-bit': 0.13,
  'dawn-island': 0.19,
  'conomi-islands': 0.18,
  'gecko-islands': 0.18,
  'organ-island': 0.15,
  'organ-islands': 0.15,
  'shimotsuki-village': 0.14,
  'goat-island': 0.14,
  'shells-town': 0.13,
  loguetown: 0.16,
  baratie: 0.08,
  'twin-cape': 0.15,
  'little-garden': 0.14,
  'cactus-island': 0.14,
  'drum-island': 0.17,
  jaya: 0.18,
  'long-ring-long-land': 0.16,
  'water-7': 0.19,
  'shift-station': 0.08,
  'pucci-island': 0.10,
  'san-faldo': 0.10,
  'st-poplar': 0.10,
  'enies-lobby': 0.15,
  'impel-down': 0.15,
  'amazon-lily': 0.16,
  'thriller-bark': 0.18,
  sabaody: 0.16,
  'punk-hazard': 0.17,
  'egghead-island': 0.18,
  elbaf: 0.20,
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const span = edge1 - edge0;
  if (Math.abs(span) < 1e-6) return x >= edge1 ? 1 : 0;
  const t = clamp((x - edge0) / span, 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Determines whether a charted location should have a localized sea-level mist ring.
 * Excludes sky islands, Red Line summits, underwater Fish-Man Island, and overlapping
 * inner sub-locations on single-landmass custom islands.
 */
export function shouldIncludeIslandInMist(island: IslandLocation): boolean {
  if (island.elevationTier === 'sky' || island.elevationTier === 'redline') {
    return false;
  }
  if (
    island.id === 'fish-man-island' ||
    island.id === 'reverse-mountain' ||
    island.id === 'mary-geoise'
  ) {
    return false;
  }
  if (STACKED_SUB_LOCATION_IDS.has(island.id)) {
    return false;
  }
  return true;
}

/**
 * Computes calibrated mist envelope dimensions and fade distances for an island
 * so coastal fog frames the shoreline cleanly without obscuring harbor spawns.
 */
export function computeIslandMistSpec(island: IslandLocation): IslandMistSpec {
  const tottoPeriph = TOTTO_LAND_ISLAND_BY_ID[island.id];
  let coastRadius = CUSTOM_COAST_RADII[island.id];

  if (coastRadius === undefined) {
    if (tottoPeriph) {
      coastRadius = clamp(Math.max(tottoPeriph.rx, tottoPeriph.rz) * 0.0036, 0.08, 0.2);
    } else if (island.notability === 'Legend' || island.notability === 'Major Power') {
      coastRadius = 0.15;
    } else if (island.notability === 'Grand Line' || island.region === 'New World') {
      coastRadius = 0.13;
    } else {
      coastRadius = 0.115;
    }
  }

  const mistRadius = coastRadius * 1.48 + 0.055;
  const mistHeight = clamp(mistRadius * 0.72, 0.15, 0.38);
  const innerClearDist = coastRadius + 0.085;
  const outerFadeDist = innerClearDist + clamp(coastRadius * 0.8 + 0.26, 0.32, 0.54);

  const densityScale =
    island.id === 'thriller-bark'
      ? 0.7
      : tottoPeriph
        ? 0.72
        : 0.74;

  return {
    coastRadius,
    mistRadius,
    mistHeight,
    innerClearDist,
    outerFadeDist,
    densityScale,
  };
}

/**
 * Computes [0..1] mist opacity factor for an island relative to Thousand Sunny.
 * Returns 0 outside navigation mode, 0 when close to or inside the island harbor,
 * rising smoothly to ~1 as distance grows into open horizon waters, and gently
 * fading out beyond planetary horizon distance.
 */
export function computeIslandMistFactor(params: IslandMistFactorParams): number {
  const {
    distToShip,
    innerClearDist,
    outerFadeDist,
    maxHorizonDist = 6.2,
    navMix,
    hideForSubseaMix = 0,
    altitudeFadeMix = 0,
  } = params;

  const activeNav = clamp(navMix, 0, 1);
  if (activeNav <= 0.001) return 0;

  const subseaMask = 1 - clamp(hideForSubseaMix, 0, 1);
  const altMask = 1 - clamp(altitudeFadeMix, 0, 1);
  if (subseaMask <= 0.001 || altMask <= 0.001) return 0;

  const approachFade = smoothstep(innerClearDist, outerFadeDist, distToShip);
  const farHorizonFade =
    1 - smoothstep(maxHorizonDist - 0.85, maxHorizonDist + 0.45, distToShip);

  return clamp(approachFade * farHorizonFade * activeNav * subseaMask * altMask, 0, 1);
}

/**
 * Computes atmospheric mist RGB tint matching time-of-day (daylight, twilight, night).
 */
export function computeIslandMistTint(
  daylight: number,
  isTwilight: boolean,
  outRgb: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 }
): { r: number; g: number; b: number } {
  const d = clamp(daylight, 0, 1);
  if (isTwilight) {
    // Warm amber-lavender coastal haze
    outRgb.r = 0.86;
    outRgb.g = 0.74;
    outRgb.b = 0.78;
    return outRgb;
  }
  // Smooth blend between moonlit slate night mist and luminous sea-mist white/cyan
  outRgb.r = 0.28 + d * 0.60;
  outRgb.g = 0.39 + d * 0.54;
  outRgb.b = 0.56 + d * 0.42;
  return outRgb;
}

const MAX_ACTIVE_MIST_ISLANDS = 24;
const LAYERS_PER_ISLAND = 14; // 4 stacked canopy/sea blankets + 10 core/perimeter billowing fog walls
const MAX_MIST_INSTANCES = MAX_ACTIVE_MIST_ISLANDS * LAYERS_PER_ISLAND;
const MAX_HORIZON_DIST = 6.2;

interface IslandMistEntry {
  island: IslandLocation;
  spec: IslandMistSpec;
  anchorPos: THREE.Vector3;
  normal: THREE.Vector3;
  east: THREE.Vector3;
  south: THREE.Vector3;
  seed: number;
  markerRef: IslandMistSourceRecord | null;
  cachedDist: number;
}

const _toCam = new THREE.Vector3();
const _right = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _layerPos = new THREE.Vector3();
const _basis = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _tiltQuat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _sunnyVec = new THREE.Vector3();
const _tintScratch = { r: 0.88, g: 0.93, b: 0.98 };
const _refNorth = new THREE.Vector3(0, 1, 0);
const _refAlt = new THREE.Vector3(1, 0, 0);

function hashStringSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function buildEntryBasis(entry: IslandMistEntry, posVec: THREE.Vector3, globeRadius: number): void {
  entry.anchorPos.copy(posVec).normalize().multiplyScalar(globeRadius);
  entry.normal.copy(entry.anchorPos).normalize();
  const ref = Math.abs(entry.normal.y) > 0.92 ? _refAlt : _refNorth;
  entry.east.crossVectors(ref, entry.normal).normalize();
  entry.south.crossVectors(entry.normal, entry.east).normalize();
}

/**
 * Single-draw-call InstancedMesh sea mist system surrounding charted islands
 * in navigation mode. Fog shrouds distant island coastlines and smoothly parts
 * and dissolves as Thousand Sunny approaches an island.
 */
export function createIslandMistSystem(options: {
  locations: readonly IslandLocation[];
  markerRecords?: readonly IslandMistSourceRecord[];
  globeRadius: number;
  isSoftwareGl?: boolean;
}): IslandMistSystemHandle {
  const { locations, markerRecords, globeRadius } = options;

  const markerById = new Map<string, IslandMistSourceRecord>();
  if (markerRecords) {
    for (const rec of markerRecords) {
      markerById.set(rec.island.id, rec);
    }
  }

  const entries: IslandMistEntry[] = [];
  for (const island of locations) {
    if (!shouldIncludeIslandInMist(island)) continue;
    const spec = computeIslandMistSpec(island);
    const markerRef = markerById.get(island.id) ?? null;
    const p = equirectangularToSphere(island.u, island.v, globeRadius);
    const anchorPos = new THREE.Vector3(p.x, p.y, p.z);
    const entry: IslandMistEntry = {
      island,
      spec,
      anchorPos,
      normal: new THREE.Vector3(),
      east: new THREE.Vector3(),
      south: new THREE.Vector3(),
      seed: hashStringSeed(island.id),
      markerRef,
      cachedDist: 999,
    };
    buildEntryBasis(
      entry,
      markerRef ? markerRef.basePos : anchorPos,
      globeRadius
    );
    entries.push(entry);
  }

  const syncAnchorPositions = () => {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.markerRef) {
        buildEntryBasis(entry, entry.markerRef.basePos, globeRadius);
      }
    }
  };

  const quadGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
  // vec4: x = mistFactor [0..1], y = seed [0..1], z = layerKind (0=flat ring, 1=upright bank), w = layerIndexNorm
  const paramArray = new Float32Array(MAX_MIST_INSTANCES * 4);
  const paramAttr = new THREE.InstancedBufferAttribute(paramArray, 4);
  paramAttr.setUsage(THREE.DynamicDrawUsage);
  quadGeo.setAttribute('aMistParam', paramAttr);

  const uniforms = {
    uTime: { value: 0 },
    uGlobeRadius: { value: globeRadius },
    uMistColor: { value: new THREE.Color(0xdceeff) },
    uSunHighlightColor: { value: new THREE.Color(0xfff7eb) },
    uSunDir: { value: new THREE.Vector3(0.4, 0.85, 0.35).normalize() },
    uDaylight: { value: 1.0 },
  };

  const mistMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    vertexShader: `
      attribute vec4 aMistParam;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec4 vMistParam;

      void main() {
        vUv = uv;
        vMistParam = aMistParam;
        vec4 wp = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        wp = modelMatrix * wp;
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uGlobeRadius;
      uniform vec3 uMistColor;
      uniform vec3 uSunHighlightColor;
      uniform vec3 uSunDir;
      uniform float uDaylight;

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec4 vMistParam;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise2D(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      float fbmMist(vec2 p) {
        float v = 0.0;
        float amp = 0.54;
        for (int i = 0; i < 3; i++) {
          v += amp * noise2D(p);
          p = p * 2.07 + vec2(17.3, 9.2);
          amp *= 0.5;
        }
        return v;
      }

      void main() {
        float mistFactor = vMistParam.x;
        if (mistFactor <= 0.005) discard;

        float seed = vMistParam.y;
        float layerKind = vMistParam.z;
        float layerVar = vMistParam.w;

        vec2 c = vUv - 0.5;
        float rDist = length(c) * 2.0;
        if (layerKind < 0.5 && rDist >= 1.0) discard;

        // Animated drifting FBM fog wisps
        float windSpeed = mix(0.045, 0.075, layerVar);
        vec2 drift = vec2(uTime * windSpeed + seed * 19.7, -uTime * windSpeed * 0.42 + layerVar * 11.3);
        vec2 noiseCoord = c * mix(3.4, 4.6, layerKind) + drift;
        float n = fbmMist(noiseCoord);
        float n2 = fbmMist(noiseCoord * 1.65 - drift * 0.7 + vec2(4.1, 7.9));
        float wisp = smoothstep(0.28, 0.88, n * 0.62 + n2 * 0.38);

        float shapeAlpha = 0.0;
        if (layerKind < 0.5) {
          // Soft multi-tiered sea mist canopy blanketing coastline without blinding glare
          float outerFalloff = 1.0 - smoothstep(0.42, 0.99, rDist);
          float coreDensity = mix(0.55, 0.94, wisp);
          shapeAlpha = outerFalloff * coreDensity;
        } else {
          // Atmospheric sea-fog curtains rooted at sea level
          float radialSide = 1.0 - smoothstep(0.32, 0.98, abs(c.x) * 2.0);
          float bottomSoft = smoothstep(0.0, 0.1, vUv.y);
          float topSoft = 1.0 - smoothstep(0.45, 0.99, vUv.y);
          float radialHeight = length(vWorldPos) - uGlobeRadius;
          float seaSurfaceClip = smoothstep(-0.005, 0.012, radialHeight);
          shapeAlpha = radialSide * bottomSoft * topSoft * seaSurfaceClip * mix(0.58, 0.95, wisp);
        }

        float finalAlpha = clamp(shapeAlpha * mistFactor * 0.74, 0.0, 0.78);
        if (finalAlpha <= 0.004) discard;

        vec3 radialUp = normalize(vWorldPos);
        float sunFace = smoothstep(-0.25, 0.85, dot(radialUp, normalize(uSunDir)));
        vec3 deepMistCol = uMistColor * mix(0.74, 0.92, vUv.y);
        vec3 col = mix(deepMistCol, uSunHighlightColor, sunFace * 0.22 * uDaylight);
        // Subtle sunlit upper fog crest
        col = mix(col, uSunHighlightColor, smoothstep(0.35, 0.95, vUv.y) * layerKind * 0.16 * uDaylight);

        gl_FragColor = vec4(col, finalAlpha);
      }
    `,
  });

  const mesh = new THREE.InstancedMesh(quadGeo, mistMat, MAX_MIST_INSTANCES);
  mesh.name = 'island-navigation-mist';
  mesh.frustumCulled = false;
  mesh.renderOrder = 12;
  mesh.count = 0;
  mesh.visible = false;

  const activeEntries: IslandMistEntry[] = [];
  let navMixSmooth = 0;
  let prevTime = 0;

  const update: IslandMistSystemHandle['update'] = ({
    elapsed,
    sunnyPos,
    cameraPos,
    sunDir,
    sailingActive,
    daylight,
    isTwilight,
    hideForSubseaMix = 0,
    sunnyElevation = 0,
  }) => {
    const dt = Math.max(0.001, Math.min(0.1, elapsed - prevTime));
    prevTime = elapsed;

    const targetNav = sailingActive ? 1 : 0;
    navMixSmooth += (targetNav - navMixSmooth) * Math.min(1, dt * (sailingActive ? 6.5 : 10.0));

    if (navMixSmooth < 0.008 || !sunnyPos) {
      mesh.count = 0;
      mesh.visible = false;
      return { nearestIslandMistFactor: 0, activeMistIslandCount: 0 };
    }

    _sunnyVec.set(sunnyPos.x, sunnyPos.y, sunnyPos.z);
    const altitudeFadeMix = smoothstep(0.45, 1.15, Math.max(0, sunnyElevation));

    uniforms.uTime.value = elapsed;
    uniforms.uSunDir.value.copy(sunDir).normalize();
    uniforms.uDaylight.value = daylight;
    const tint = computeIslandMistTint(daylight, isTwilight, _tintScratch);
    uniforms.uMistColor.value.setRGB(tint.r, tint.g, tint.b);
    if (isTwilight) {
      uniforms.uSunHighlightColor.value.setRGB(1.0, 0.84, 0.74);
    } else {
      uniforms.uSunHighlightColor.value.setRGB(
        0.52 + daylight * 0.48,
        0.62 + daylight * 0.36,
        0.78 + daylight * 0.20
      );
    }

    activeEntries.length = 0;
    let nearestIslandDist = Infinity;
    let nearestIslandMistFactor = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const dist = entry.anchorPos.distanceTo(_sunnyVec);
      if (dist < nearestIslandDist) {
        nearestIslandDist = dist;
        nearestIslandMistFactor = computeIslandMistFactor({
          distToShip: dist,
          innerClearDist: entry.spec.innerClearDist,
          outerFadeDist: entry.spec.outerFadeDist,
          maxHorizonDist: MAX_HORIZON_DIST,
          navMix: navMixSmooth,
          hideForSubseaMix,
          altitudeFadeMix,
        });
      }
      if (dist > MAX_HORIZON_DIST) continue;
      entry.cachedDist = dist;

      // Keep top MAX_ACTIVE_MIST_ISLANDS nearest islands (insertion order)
      if (activeEntries.length < MAX_ACTIVE_MIST_ISLANDS) {
        activeEntries.push(entry);
      } else {
        let farthestIdx = 0;
        let farthestDist = activeEntries[0].cachedDist;
        for (let k = 1; k < activeEntries.length; k++) {
          if (activeEntries[k].cachedDist > farthestDist) {
            farthestDist = activeEntries[k].cachedDist;
            farthestIdx = k;
          }
        }
        if (dist < farthestDist) {
          activeEntries[farthestIdx] = entry;
        }
      }
    }

    let instanceCursor = 0;
    let visibleIslandCount = 0;

    for (let i = 0; i < activeEntries.length; i++) {
      const entry = activeEntries[i];
      const factor =
        computeIslandMistFactor({
          distToShip: entry.cachedDist,
          innerClearDist: entry.spec.innerClearDist,
          outerFadeDist: entry.spec.outerFadeDist,
          maxHorizonDist: MAX_HORIZON_DIST,
          navMix: navMixSmooth,
          hideForSubseaMix,
          altitudeFadeMix,
        }) * entry.spec.densityScale;

      if (factor <= 0.008) continue;
      visibleIslandCount++;

      // Direction from island toward camera in local tangent space for upright mist banks
      _toCam.subVectors(cameraPos, entry.anchorPos);
      const radialProj = _toCam.dot(entry.normal);
      _forward.copy(_toCam).addScaledVector(entry.normal, -radialProj);
      if (_forward.lengthSq() < 1e-6) {
        _forward.copy(entry.south);
      } else {
        _forward.normalize();
      }
      _right.crossVectors(entry.normal, _forward).normalize();

      // Mist parts outward and dissolves smoothly as Sunny approaches
      const partSpread = 1 + (1 - factor) * 0.28;
      const baseR = entry.spec.mistRadius * partSpread;
      const bankH = entry.spec.mistHeight;

      // 4 stacked horizontal fog blankets covering sea shore through island peaks
      const blanketAlts = [0.012, 0.044, 0.086, 0.138];
      const blanketDiamScale = [2.25, 2.0, 1.72, 1.42];
      const blanketOpacities = [0.62, 0.56, 0.48, 0.38];
      for (let h = 0; h < 4; h++) {
        const alt = blanketAlts[h];
        const spin = elapsed * (h % 2 === 0 ? 0.024 : -0.018) + entry.seed * Math.PI * 2 + h * 0.9;
        const diameter = baseR * blanketDiamScale[h];

        _layerPos.copy(entry.anchorPos).addScaledVector(entry.normal, alt);
        // Basis with quad XY lying flat in east/south plane, normal = entry.normal
        _basis.makeBasis(entry.east, entry.south, entry.normal);
        _quat.setFromRotationMatrix(_basis);
        // Rotate around local Z (which maps to entry.normal)
        _tiltQuat.setFromAxisAngle(entry.normal, spin);
        _quat.premultiply(_tiltQuat);
        _scale.set(diameter, diameter, 1);
        _basis.compose(_layerPos, _quat, _scale);
        mesh.setMatrixAt(instanceCursor, _basis);

        const idx4 = instanceCursor * 4;
        paramArray[idx4] = Math.min(1, factor * blanketOpacities[h]);
        paramArray[idx4 + 1] = (entry.seed + h * 0.23) % 1;
        paramArray[idx4 + 2] = 0;
        paramArray[idx4 + 3] = h / 3;
        instanceCursor++;
      }

      // 10 overlapping upright sea-fog curtains (2 central shrouds + 8 perimeter banks)
      for (let b = 0; b < 10; b++) {
        const isCoreShroud = b < 2;
        const azimuth = isCoreShroud
          ? b * 1.57 + entry.seed * 6.283
          : ((b - 2) / 8) * Math.PI * 2 + entry.seed * 6.283 + Math.sin(elapsed * 0.14 + b) * 0.06;
        const radialOffset = isCoreShroud
          ? baseR * 0.06
          : baseR * (0.28 + (b % 2) * 0.2);
        const sideSin = Math.sin(azimuth);
        const fwdCos = Math.cos(azimuth);
        const bankWidth = isCoreShroud
          ? baseR * 1.75
          : baseR * (1.28 + (b % 2) * 0.28);
        const bankHeight = isCoreShroud
          ? bankH * 1.05
          : bankH * (0.86 + (b % 3) * 0.14);

        _layerPos
          .copy(entry.anchorPos)
          .addScaledVector(_right, sideSin * radialOffset)
          .addScaledVector(_forward, fwdCos * radialOffset)
          .addScaledVector(entry.normal, bankHeight * 0.34);

        // Upright quad: X = _right, Y = entry.normal, Z = _forward, tilted back slightly for overhead visibility
        _basis.makeBasis(_right, entry.normal, _forward);
        _quat.setFromRotationMatrix(_basis);
        _tiltQuat.setFromAxisAngle(_right, isCoreShroud ? -0.1 : -0.16);
        _quat.premultiply(_tiltQuat);
        _scale.set(bankWidth, bankHeight, 1);
        _basis.compose(_layerPos, _quat, _scale);
        mesh.setMatrixAt(instanceCursor, _basis);

        const idx4 = instanceCursor * 4;
        paramArray[idx4] = Math.min(1, factor * (isCoreShroud ? 0.66 : 0.54));
        paramArray[idx4 + 1] = (entry.seed + b * 0.173) % 1;
        paramArray[idx4 + 2] = 1;
        paramArray[idx4 + 3] = b / 9;
        instanceCursor++;
      }
    }

    mesh.count = instanceCursor;
    mesh.visible = instanceCursor > 0;
    if (instanceCursor > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      paramAttr.needsUpdate = true;
    }

    return {
      nearestIslandMistFactor,
      activeMistIslandCount: visibleIslandCount,
    };
  };

  return {
    mesh,
    syncAnchorPositions,
    update,
    dispose: () => {
      quadGeo.dispose();
      mistMat.dispose();
    },
  };
}
