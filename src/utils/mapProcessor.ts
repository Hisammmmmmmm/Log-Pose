import * as THREE from 'three';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import {
  classifyMapPixel,
  computeTerrainAlbedo,
  ridgedFbm2D,
  valueNoise2D,
} from './globeMath';

export interface TerrainScatterPoint {
  u: number;
  v: number;
  height: number;
  scale: number;
  tint: number;
}

export interface ProcessedGlobeMaps {
  /** Clean procedural 3D terrain albedo (zero 2D map text/borders). */
  terrainAlbedoTexture: THREE.CanvasTexture;
  /** Clean ocean bathymetry, Calm Belt, shallow coastal reefs, and surf foam. */
  oceanColorTexture: THREE.CanvasTexture;
  /** Tangent-space normal map for fine rocky ridges and canyon strata. */
  terrainNormalTexture: THREE.CanvasTexture;
  /** Glowing night-side city & harbor lights. */
  nightLightsTexture: THREE.CanvasTexture;
  /** Normalized elevation grid [0..1] for CPU vertex displacement. */
  heightGrid: Float32Array;
  /** Normalized coastal/canal water mask [0..1] for ocean shader. */
  calmBeltGrid: Float32Array;
  gridWidth: number;
  gridHeight: number;
  /** Pre-sampled locations for 3D instanced mountain crags & forests. */
  rockCrags: TerrainScatterPoint[];
  forestClusters: TerrainScatterPoint[];
  sampleHeightAt: (u: number, v: number) => number;
  sampleCalmBeltAt: (u: number, v: number) => number;
  sampleCanalAt: (u: number, v: number) => number;
  dispose: () => void;
}

/**
 * Generates seamless tileable isotropic ocean wave normal map on an offscreen canvas.
 */
export function createOceanNormalTexture(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;

  const hashGrid = (
    ix: number,
    iy: number,
    period: number,
    seed: number
  ): number => {
    const wx = ((ix % period) + period) % period;
    const wy = ((iy % period) + period) % period;
    const n =
      Math.sin(wx * 127.1 + wy * 311.7 + seed * 74.7) * 43758.5453123;
    return n - Math.floor(n);
  };

  const tileNoise = (
    u: number,
    v: number,
    freq: number,
    seed: number
  ): number => {
    const x = u * freq;
    const y = v * freq;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);

    const a = hashGrid(ix, iy, freq, seed);
    const b = hashGrid(ix + 1, iy, freq, seed);
    const c = hashGrid(ix, iy + 1, freq, seed);
    const d = hashGrid(ix + 1, iy + 1, freq, seed);

    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };

  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      heights[y * size + x] =
        tileNoise(u, v, 8, 1.1) * 0.45 +
        tileNoise(u, v, 16, 2.3) * 0.28 +
        tileNoise(u, v, 32, 4.7) * 0.16 +
        tileNoise(u, v, 64, 8.9) * 0.08;
    }
  }

  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;

      const hL = heights[y * size + xm];
      const hR = heights[y * size + xp];
      const hD = heights[yp * size + x];
      const hU = heights[ym * size + x];

      const dx = (hL - hR) * 2.2;
      const dy = (hD - hU) * 2.2;
      const dz = 1.0;
      const len = Math.hypot(dx, dy, dz);

      const idx = (y * size + x) * 4;
      data[idx] = Math.round(((dx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round(((dz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 18);
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a seamless equirectangular cloud layer texture on an offscreen canvas.
 */
export function createCloudLayerTexture(
  width = 512,
  height = 256
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(width, height);
  const data = img.data;

  for (let y = 0; y < height; y++) {
    const v = y / height;
    const equatorialBand = Math.exp(-Math.pow((v - 0.5) / 0.16, 2)) * 0.25;
    const polarBand = Math.pow(Math.abs(v - 0.5) * 2, 2.2) * 0.2;

    for (let x = 0; x < width; x++) {
      const u = x / width;
      const angle = u * Math.PI * 2;
      const nx = Math.cos(angle) * 2.4 + 4.0;
      const nz = Math.sin(angle) * 2.4 + 4.0;
      const ny = v * 6.5;

      const n1 = valueNoise2D(nx * 1.4 + ny * 0.35, nz * 1.4 - ny * 0.25);
      const n2 =
        valueNoise2D(nx * 3.1 - ny * 0.8, nz * 3.1 + ny * 0.6) * 0.5;
      const n3 = valueNoise2D(nx * 6.8 + ny * 1.5, nz * 6.8) * 0.25;
      const swirl = Math.sin(u * Math.PI * 6 + n1 * 4.5) * 0.08;

      const raw = (n1 + n2 + n3) / 1.75 + equatorialBand + polarBand + swirl;
      const alpha = Math.max(0, Math.min(1, (raw - 0.36) * 2.85));

      const idx = (y * width + x) * 4;
      data[idx] = 244;
      data[idx + 1] = 249;
      data[idx + 2] = 255;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Extracts clean, text-free 3D planetary geography from the reference map blueprint:
 * - Erases 2D map typography ("RED LINE", "CALM BELT", island text labels) via morphological filtering
 * - Synthesizes pure 3D terrain albedo (rock strata, forest canopies, desert dunes, glacial peaks)
 * - Synthesizes ocean depth bathymetry, Calm Belt bands, shallow coastal reefs, and surf foam
 * - Outputs a heightGrid for real 3D mesh displacement + instanced mountain/forest scatter points
 */
const yieldToMain = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

function processWorldMapCore(
  image: HTMLImageElement,
  gridWidth: number,
  gridHeight: number
) {
  const total = gridWidth * gridHeight;

  const workCanvas = document.createElement('canvas');
  workCanvas.width = gridWidth;
  workCanvas.height = gridHeight;
  const workCtx = workCanvas.getContext('2d')!;
  workCtx.drawImage(image, 0, 0, gridWidth, gridHeight);
  const srcPixels = workCtx.getImageData(0, 0, gridWidth, gridHeight).data;

  const redRaw = new Float32Array(total);
  const landRaw = new Float32Array(total);
  const desertRaw = new Float32Array(total);
  const snowRaw = new Float32Array(total);
  const calmRaw = new Float32Array(total);
  const canalMask = new Float32Array(total);

  for (let y = 0; y < gridHeight; y++) {
    const v = y / gridHeight;
    const row = y * gridWidth;
    for (let x = 0; x < gridWidth; x++) {
      const u = x / gridWidth;
      const idx = row + x;
      const p = idx * 4;
      const r = srcPixels[p];
      const g = srcPixels[p + 1];
      const b = srcPixels[p + 2];

      const c = classifyMapPixel(r, g, b);
      // Red Line only exists along the central meridian (0.39..0.61) and anti-meridian (<0.055 or >0.945).
      // Red pixels on islands like Wano or Alabasta must remain island landmass, not Red Line!
      const inRedLineCorridor =
        (u >= 0.39 && u <= 0.61) || u <= 0.055 || u >= 0.945;

      // Skypiea floats in the sky above Jaya (both rendered as full 3D models); keep open Blue Sea clear around
      // Jaya, the Knock Up Stream eruption basin, and beneath Skypiea's old/new footprints.
      const inJayaSkypieaSeaSanctuary =
        (u >= 0.684 && u <= 0.716 && v >= 0.482 && v <= 0.520) ||
        (u >= 0.660 && u <= 0.686 && v >= 0.494 && v <= 0.533);

      if (inJayaSkypieaSeaSanctuary && c.terrain !== 'calmbelt') {
        // Leave pure Blue Sea beneath Skypiea, around Knock Up Stream, and outside Jaya's 3D island mask
      } else if (c.terrain === 'redline') {
        if (inRedLineCorridor) {
          redRaw[idx] = 1;
        } else {
          landRaw[idx] = 1;
        }
      } else if (c.terrain === 'desert') {
        desertRaw[idx] = 1;
        landRaw[idx] = 1;
      } else if (c.terrain === 'land') {
        landRaw[idx] = 1;
      } else if (c.terrain === 'snow') {
        snowRaw[idx] = 1;
      } else if (c.terrain === 'calmbelt') {
        calmRaw[idx] = 1;
      }
    }
  }

  // Identify Reverse Mountain's 4 canals ONLY where cyan water sits immediately next to Red Line rock
  for (let y = 0; y < gridHeight; y++) {
    const v = y / gridHeight;
    if (Math.abs(v - 0.5) > 0.14) continue;
    const row = y * gridWidth;
    for (let x = 0; x < gridWidth; x++) {
      const u = x / gridWidth;
      if (Math.abs(u - 0.5) > 0.08) continue;
      const idx = row + x;
      if (calmRaw[idx] < 0.5) continue;

      let redNearby = false;
      for (let dy = -6; dy <= 6 && !redNearby; dy += 2) {
        const ny = Math.max(0, Math.min(gridHeight - 1, y + dy));
        const nRow = ny * gridWidth;
        for (let dx = -6; dx <= 6; dx += 2) {
          const nx = (x + dx + gridWidth) % gridWidth;
          if (redRaw[nRow + nx] > 0.5) {
            redNearby = true;
            break;
          }
        }
      }
      if (redNearby) {
        canalMask[idx] = 1;
        calmRaw[idx] = 0;
      }
    }
  }

  // Helper: 3x3 neighbor count
  const countNeighbors = (src: Float32Array, x: number, y: number): number => {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = Math.max(0, Math.min(gridHeight - 1, y + dy));
      const nRow = ny * gridWidth;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = (x + dx + gridWidth) % gridWidth;
        if (src[nRow + nx] > 0.5) count++;
      }
    }
    return count;
  };

  // Clean snow mask aggressively so thin 1-2px ocean text ("CALM BELT", "North Blue") is erased
  // while real snow islands (Drum, Whiteland, Loadstar) remain solid
  let snowClean = new Float32Array(snowRaw);
  for (let pass = 0; pass < 2; pass++) {
    const next = new Float32Array(total);
    for (let y = 0; y < gridHeight; y++) {
      const row = y * gridWidth;
      for (let x = 0; x < gridWidth; x++) {
        const idx = row + x;
        if (snowClean[idx] < 0.5) continue;
        const n = countNeighbors(snowClean, x, y);
        const nearLand = countNeighbors(landRaw, x, y) >= 1;
        if (n >= 5 || (nearLand && n >= 2)) {
          next[idx] = 1;
        }
      }
    }
    snowClean = next;
  }

  // Re-dilate surviving solid snow islands once so their full coastline area is restored
  const snowRestored = new Float32Array(snowClean);
  for (let y = 1; y < gridHeight - 1; y++) {
    const row = y * gridWidth;
    for (let x = 0; x < gridWidth; x++) {
      const idx = row + x;
      if (snowClean[idx] > 0.5 || countNeighbors(snowClean, x, y) >= 2) {
        snowRestored[idx] = 1;
      }
    }
  }

  // Keep the coastline mask binary so the CPU collision edge is the same edge the terrain reveals.
  const landClean = new Float32Array(total);
  for (let y = 1; y < gridHeight - 1; y++) {
    const row = y * gridWidth;
    for (let x = 0; x < gridWidth; x++) {
      const idx = row + x;
      const isLandOrSnow = landRaw[idx] > 0.5 || snowRestored[idx] > 0.5;
      if (
        isLandOrSnow &&
        countNeighbors(landRaw, x, y) + countNeighbors(snowRestored, x, y) >= 2
      ) {
        landClean[idx] = 1;
      }
    }
  }

  // One-pixel closing removes JPEG pinholes without moving the visible Red Line coast by several pixels.
  let redClosed = new Float32Array(redRaw);
  for (let pass = 0; pass < 1; pass++) {
    const next = new Float32Array(total);
    for (let y = 0; y < gridHeight; y++) {
      const row = y * gridWidth;
      for (let x = 0; x < gridWidth; x++) {
        const idx = row + x;
        if (canalMask[idx] > 0.5) {
          next[idx] = 0;
          continue;
        }
        if (redClosed[idx] > 0.5 || countNeighbors(redClosed, x, y) >= 1) {
          next[idx] = 1;
        }
      }
    }
    redClosed = next;
  }

  // Separable Gaussian blur helper (isotropic circular kernel, horizontal wrap-around)
  const gaussianBlur = (src: Float32Array, radius: number): Float32Array => {
    const sigma = Math.max(0.8, radius * 0.55);
    const weights: number[] = [];
    let weightSum = 0;
    for (let d = -radius; d <= radius; d++) {
      const w = Math.exp(-(d * d) / (2 * sigma * sigma));
      weights.push(w);
      weightSum += w;
    }
    for (let i = 0; i < weights.length; i++) weights[i] /= weightSum;

    const temp = new Float32Array(total);
    const out = new Float32Array(total);
    for (let y = 0; y < gridHeight; y++) {
      const row = y * gridWidth;
      for (let x = 0; x < gridWidth; x++) {
        let sum = 0;
        for (let k = 0; k < weights.length; k++) {
          const dx = k - radius;
          sum += src[row + ((x + dx + gridWidth) % gridWidth)] * weights[k];
        }
        temp[row + x] = sum;
      }
    }
    for (let y = 0; y < gridHeight; y++) {
      const row = y * gridWidth;
      for (let x = 0; x < gridWidth; x++) {
        let sum = 0;
        for (let k = 0; k < weights.length; k++) {
          const dy = k - radius;
          const ny = Math.max(0, Math.min(gridHeight - 1, y + dy));
          sum += temp[ny * gridWidth + x] * weights[k];
        }
        out[row + x] = sum;
      }
    }
    return out;
  };

  const smoothRed = gaussianBlur(redClosed, 1);
  const smoothDesert = gaussianBlur(desertRaw, 1);
  const smoothSnow = gaussianBlur(snowRestored, 1);
  const smoothCalm = gaussianBlur(calmRaw, 3);
  const smoothCanal = gaussianBlur(canalMask, 1);

  // Coastal proximity halo (blurred union of land + redline for turquoise shallow reefs)
  const allLand = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    allLand[i] = Math.max(redClosed[i], landClean[i]);
  }
  const coastalHalo = gaussianBlur(allLand, 5);

  // Compute final 3D elevation heightGrid [0..1]
  const heightGrid = new Float32Array(total);
  for (let y = 0; y < gridHeight; y++) {
    const v = y / gridHeight;
    const row = y * gridWidth;
    for (let x = 0; x < gridWidth; x++) {
      const u = x / gridWidth;
      const idx = row + x;

      // Height uses the closed binary coastline, not its blurred presentation weights.
      // This prevents sub-threshold tails in the ocean from becoming invisible hull walls.
      const rW = redClosed[idx] > 0.5 && canalMask[idx] < 0.5 ? 1 : 0;
      const lW = landClean[idx];
      if (rW === 0 && lW === 0) {
        heightGrid[idx] = 0;
        continue;
      }
      const cW = canalMask[idx];

      // Multi-octave ridged multifractal mountain peaks
      const ridgeMajor = ridgedFbm2D(u * 44, v * 22, 4);
      const ridgeFine = ridgedFbm2D(u * 110 + 5.2, v * 55 + 2.7, 3);
      const coastNoise = (valueNoise2D(u * 175, v * 88) - 0.5) * 0.16;

      // Red Line towers (0.58 .. 1.0), carved down cleanly along Reverse Mountain canals
      const redElev =
        rW * (0.64 + ridgeMajor * 0.24 + ridgeFine * 0.12) * (1 - cW * 0.92);

      // Organic island rise: smooth S-curve + coastline perturbation avoids blocky mesas
      const lPerturbed = Math.max(0, Math.min(1, lW + (lW > 0.05 ? coastNoise : 0)));
      const islandCore = lPerturbed * lPerturbed * (3 - 2 * lPerturbed);
      const islandElev =
        islandCore * (0.28 + ridgeMajor * 0.30 + ridgeFine * 0.15);

      heightGrid[idx] = Math.max(0, Math.min(1, Math.max(redElev, islandElev)));
    }
  }

  return {
    heightGrid,
    smoothRed,
    smoothDesert,
    smoothSnow,
    smoothCalm,
    smoothCanal,
    coastalHalo,
  };
}

function finalizeWorldMapTextures(
  gridWidth: number,
  gridHeight: number,
  maxAnisotropy: number,
  core: ReturnType<typeof processWorldMapCore>
): ProcessedGlobeMaps {
  const {
    heightGrid,
    smoothRed,
    smoothDesert,
    smoothSnow,
    smoothCalm,
    smoothCanal,
    coastalHalo,
  } = core;

  // 1. Procedural 3D Terrain Albedo (1024 x 512, skips submerged ocean pixels for 6x speedup)
  const albedoW = gridWidth;
  const albedoH = gridHeight;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = albedoW;
  albedoCanvas.height = albedoH;
  const albedoCtx = albedoCanvas.getContext('2d')!;
  const albedoImg = albedoCtx.createImageData(albedoW, albedoH);

  const sampleGridBilinear = (
    grid: Float32Array,
    u: number,
    v: number
  ): number => {
    const gx = ((u % 1) + 1) % 1 * (gridWidth - 1);
    const gy = Math.max(0, Math.min(1, v)) * (gridHeight - 1);
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = (x0 + 1) % gridWidth;
    const y1 = Math.min(gridHeight - 1, y0 + 1);
    const fx = gx - x0;
    const fy = gy - y0;
    const a = grid[y0 * gridWidth + x0];
    const b = grid[y0 * gridWidth + x1];
    const c = grid[y1 * gridWidth + x0];
    const d = grid[y1 * gridWidth + x1];
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  };

  for (let y = 0; y < albedoH; y++) {
    const v = y / albedoH;
    const rowOffset = y * albedoW;
    for (let x = 0; x < albedoW; x++) {
      const idx = rowOffset + x;
      const p = idx * 4;
      const h = heightGrid[idx];
      const redW = smoothRed[idx];
      const desW = smoothDesert[idx];
      const snowW = smoothSnow[idx];

      if (h < 0.015 && redW < 0.01 && desW < 0.01 && snowW < 0.01) {
        albedoImg.data[p] = 24;
        albedoImg.data[p + 1] = 74;
        albedoImg.data[p + 2] = 68;
        albedoImg.data[p + 3] = 255;
        continue;
      }

      const u = x / albedoW;
      const xp = (x + 1) % gridWidth;
      const yd = Math.min(gridHeight - 1, y + 1);
      const hR = heightGrid[rowOffset + xp];
      const hD = heightGrid[yd * gridWidth + x];
      const slope = Math.min(1, Math.hypot(h - hR, h - hD) * 7.5);

      const detailNoise =
        valueNoise2D(u * 260, v * 130) * 0.6 +
        ridgedFbm2D(u * 380, v * 190, 2) * 0.4;

      const [cr, cg, cb] = computeTerrainAlbedo({
        height: h,
        slope,
        redWeight: redW,
        desertWeight: desW,
        snowWeight: snowW,
        detailNoise,
      });

      albedoImg.data[p] = cr;
      albedoImg.data[p + 1] = cg;
      albedoImg.data[p + 2] = cb;
      albedoImg.data[p + 3] = 255;
    }
  }
  albedoCtx.putImageData(albedoImg, 0, 0);

  const terrainAlbedoTexture = new THREE.CanvasTexture(albedoCanvas);
  terrainAlbedoTexture.colorSpace = THREE.SRGBColorSpace;
  terrainAlbedoTexture.wrapS = THREE.RepeatWrapping;
  terrainAlbedoTexture.wrapT = THREE.ClampToEdgeWrapping;
  terrainAlbedoTexture.anisotropy = maxAnisotropy;
  terrainAlbedoTexture.needsUpdate = true;

  // 2. Clean 3D Ocean Bathymetry, Calm Belt, Shallow Coastal Reefs & Surf Foam (1024 x 512)
  const oceanCanvas = document.createElement('canvas');
  oceanCanvas.width = gridWidth;
  oceanCanvas.height = gridHeight;
  const oceanCtx = oceanCanvas.getContext('2d')!;
  const oceanImg = oceanCtx.createImageData(gridWidth, gridHeight);

  for (let y = 0; y < gridHeight; y++) {
    const v = y / gridHeight;
    const row = y * gridWidth;
    for (let x = 0; x < gridWidth; x++) {
      const u = x / gridWidth;
      const idx = row + x;
      const p = idx * 4;

      const calm = smoothCalm[idx];
      const coast = coastalHalo[idx];
      const canal = smoothCanal[idx];
      const depthNoise = valueNoise2D(u * 32, v * 16) * 0.12;

      // Base deep ocean navy-sapphire
      let r = 12 + depthNoise * 28;
      let g = 58 + depthNoise * 42;
      let b = 104 + depthNoise * 44;

      // Calm Belt distinct jade-cerulean sea band
      if (calm > 0.05) {
        const ct = Math.min(1, calm * 1.15);
        r = r * (1 - ct) + 34 * ct;
        g = g * (1 - ct) + 128 * ct;
        b = b * (1 - ct) + 152 * ct;
      }

      // Coastal tropical turquoise reef shelf around every island
      if (coast > 0.04) {
        const st = Math.min(1, coast * 1.45);
        r = r * (1 - st) + 38 * st;
        g = g * (1 - st) + 168 * st;
        b = b * (1 - st) + 186 * st;
      }

      // Reverse Mountain glowing rushing canals
      if (canal > 0.08) {
        const kt = Math.min(1, canal * 1.3);
        r = r * (1 - kt) + 76 * kt;
        g = g * (1 - kt) + 206 * kt;
        b = b * (1 - kt) + 228 * kt;
      }

      // Subtle crisp sea-foam ring right where land meets water
      const shoreFoam =
        coast > 0.34 && coast < 0.62
          ? Math.sin(((coast - 0.34) / 0.28) * Math.PI) * 0.45
          : 0;
      r = r * (1 - shoreFoam) + 220 * shoreFoam;
      g = g * (1 - shoreFoam) + 245 * shoreFoam;
      b = b * (1 - shoreFoam) + 252 * shoreFoam;

      oceanImg.data[p] = Math.round(Math.max(0, Math.min(255, r)));
      oceanImg.data[p + 1] = Math.round(Math.max(0, Math.min(255, g)));
      oceanImg.data[p + 2] = Math.round(Math.max(0, Math.min(255, b)));
      oceanImg.data[p + 3] = 255;
    }
  }
  oceanCtx.putImageData(oceanImg, 0, 0);

  const oceanColorTexture = new THREE.CanvasTexture(oceanCanvas);
  oceanColorTexture.colorSpace = THREE.SRGBColorSpace;
  oceanColorTexture.wrapS = THREE.RepeatWrapping;
  oceanColorTexture.wrapT = THREE.ClampToEdgeWrapping;
  oceanColorTexture.anisotropy = maxAnisotropy;
  oceanColorTexture.needsUpdate = true;

  // 3. Terrain tangent-space normal map from heightGrid gradients
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = gridWidth;
  normalCanvas.height = gridHeight;
  const normalCtx = normalCanvas.getContext('2d')!;
  const normalImg = normalCtx.createImageData(gridWidth, gridHeight);
  const strength = 5.4;

  for (let y = 0; y < gridHeight; y++) {
    const ym = Math.max(0, y - 1);
    const yp = Math.min(gridHeight - 1, y + 1);
    const row = y * gridWidth;
    for (let x = 0; x < gridWidth; x++) {
      const xm = (x - 1 + gridWidth) % gridWidth;
      const xp = (x + 1) % gridWidth;

      const hL = heightGrid[row + xm];
      const hR = heightGrid[row + xp];
      const hD = heightGrid[yp * gridWidth + x];
      const hU = heightGrid[ym * gridWidth + x];

      const dx = (hL - hR) * strength;
      const dy = (hD - hU) * strength;
      const dz = 1.0;
      const len = Math.hypot(dx, dy, dz);

      const p = (row + x) * 4;
      normalImg.data[p] = Math.round(((dx / len) * 0.5 + 0.5) * 255);
      normalImg.data[p + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      normalImg.data[p + 2] = Math.round(((dz / len) * 0.5 + 0.5) * 255);
      normalImg.data[p + 3] = 255;
    }
  }
  normalCtx.putImageData(normalImg, 0, 0);

  const terrainNormalTexture = new THREE.CanvasTexture(normalCanvas);
  terrainNormalTexture.wrapS = THREE.RepeatWrapping;
  terrainNormalTexture.wrapT = THREE.ClampToEdgeWrapping;
  terrainNormalTexture.colorSpace = THREE.NoColorSpace;
  terrainNormalTexture.needsUpdate = true;

  // 4. Night-side glowing island & capital city lights
  const nightCanvas = document.createElement('canvas');
  nightCanvas.width = gridWidth;
  nightCanvas.height = gridHeight;
  const nightCtx = nightCanvas.getContext('2d')!;
  nightCtx.fillStyle = '#000000';
  nightCtx.fillRect(0, 0, gridWidth, gridHeight);

  for (const loc of ONE_PIECE_LOCATIONS) {
    const cx = loc.u * gridWidth;
    const cy = loc.v * gridHeight;
    const radius =
      loc.notability === 'Major Power'
        ? 9
        : loc.notability === 'Legend'
          ? 7
          : 4.5;

    const grad = nightCtx.createRadialGradient(cx, cy, 0.5, cx, cy, radius);
    grad.addColorStop(0, 'rgba(255, 224, 140, 0.95)');
    grad.addColorStop(0.35, 'rgba(255, 178, 70, 0.55)');
    grad.addColorStop(1, 'rgba(255, 130, 30, 0)');
    nightCtx.fillStyle = grad;
    nightCtx.beginPath();
    nightCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    nightCtx.fill();
  }

  const nightLightsTexture = new THREE.CanvasTexture(nightCanvas);
  nightLightsTexture.wrapS = THREE.RepeatWrapping;
  nightLightsTexture.wrapT = THREE.ClampToEdgeWrapping;
  nightLightsTexture.colorSpace = THREE.SRGBColorSpace;
  nightLightsTexture.needsUpdate = true;

  // 5. Sample 3D instanced mountain crags & forest clusters directly from terrain masks
  const rockCrags: TerrainScatterPoint[] = [];
  const forestClusters: TerrainScatterPoint[] = [];

  for (let gy = 20; gy < gridHeight - 20; gy += 9) {
    const v = gy / gridHeight;
    for (let gx = 4; gx < gridWidth - 4; gx += 10) {
      const u = gx / gridWidth;
      const idx = gy * gridWidth + gx;
      const h = heightGrid[idx];
      if (h < 0.22) continue;

      const jitter = valueNoise2D(u * 93.7, v * 47.3);
      const su = u + (jitter - 0.5) * 0.005;
      const sv = v + (valueNoise2D(u * 41.2, v * 89.1) - 0.5) * 0.005;

      if (smoothRed[idx] > 0.55 && h > 0.58 && rockCrags.length < 520) {
        if (jitter > 0.35) {
          rockCrags.push({
            u: su,
            v: sv,
            height: h,
            scale: 0.75 + jitter * 0.85,
            tint: 0.78 + jitter * 0.22,
          });
        }
      } else if (
        smoothRed[idx] < 0.2 &&
        smoothDesert[idx] < 0.35 &&
        smoothSnow[idx] < 0.35 &&
        h > 0.24 &&
        h < 0.52 &&
        forestClusters.length < 520
      ) {
        if (jitter > 0.38) {
          forestClusters.push({
            u: su,
            v: sv,
            height: h,
            scale: 0.7 + jitter * 0.75,
            tint: 0.75 + jitter * 0.25,
          });
        }
      }
    }
  }

  const sampleHeightAt = (u: number, v: number): number =>
    sampleGridBilinear(heightGrid, u, v);
  const sampleCalmBeltAt = (u: number, v: number): number =>
    sampleGridBilinear(smoothCalm, u, v);
  const sampleCanalAt = (u: number, v: number): number =>
    sampleGridBilinear(smoothCanal, u, v);

  return {
    terrainAlbedoTexture,
    oceanColorTexture,
    terrainNormalTexture,
    nightLightsTexture,
    heightGrid,
    calmBeltGrid: smoothCalm,
    gridWidth,
    gridHeight,
    rockCrags,
    forestClusters,
    sampleHeightAt,
    sampleCalmBeltAt,
    sampleCanalAt,
    dispose: () => {
      terrainAlbedoTexture.dispose();
      oceanColorTexture.dispose();
      terrainNormalTexture.dispose();
      nightLightsTexture.dispose();
    },
  };
}

export function processWorldMapImage(
  image: HTMLImageElement,
  maxAnisotropy: number
): ProcessedGlobeMaps {
  const gridWidth = 1024;
  const gridHeight = 512;
  const core = processWorldMapCore(image, gridWidth, gridHeight);
  return finalizeWorldMapTextures(gridWidth, gridHeight, maxAnisotropy, core);
}

/**
 * Progressive async map processor that yields between stages so initial
 * WebGL rendering & UI remain responsive during startup.
 */
export async function processWorldMapImageProgressive(
  image: HTMLImageElement,
  maxAnisotropy: number,
  isCancelled: () => boolean = () => false
): Promise<ProcessedGlobeMaps | null> {
  const gridWidth = 1024;
  const gridHeight = 512;
  await yieldToMain();
  if (isCancelled()) return null;
  const core = processWorldMapCore(image, gridWidth, gridHeight);
  await yieldToMain();
  if (isCancelled()) return null;
  return finalizeWorldMapTextures(gridWidth, gridHeight, maxAnisotropy, core);
}
