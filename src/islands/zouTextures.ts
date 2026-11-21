import * as THREE from 'three';
import { valueNoise2D } from '../utils/globeMath';
import {
  ZOU_WORLD_SIZE,
  isPointInsideRavagedSector,
  sampleZouZone,
  zouPlateauNormRadius,
} from '../utils/zouTerrain';

export function createZuneshaSkinTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      const v = y / size;
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const idx = (y * size + x) * 4;
        const macro = valueNoise2D(u * 6.0 + 1.3, v * 6.0 - 2.7);
        const wrinkleH = Math.sin(v * Math.PI * 18.0 + macro * 4.4) * 0.5 + 0.5;
        const wrinkleCross = valueNoise2D(u * 26.0 - 3.1, v * 22.0 + 5.2);
        const grain = valueNoise2D(u * 56.0, v * 56.0);

        const crease =
          Math.pow(wrinkleH, 1.35) * 0.28 + wrinkleCross * 0.42 + grain * 0.3;
        let r = 82 + crease * 32;
        let g = 88 + crease * 33;
        let b = 96 + crease * 35;

        // Subtle muted olive-moss clinging sparingly in ancient skin crevices
        const mossNoise = valueNoise2D(u * 8.5 + 9.2, v * 8.5 + 4.4);
        const mossMask = Math.max(0, Math.min(0.48, (mossNoise - 0.62) * 2.4));
        if (mossMask > 0.01) {
          r = r * (1 - mossMask) + (74 + grain * 22) * mossMask;
          g = g * (1 - mossMask) + (104 + grain * 24) * mossMask;
          b = b * (1 - mossMask) + (64 + grain * 18) * mossMask;
        }

        d[idx] = Math.max(0, Math.min(255, Math.round(r)));
        d[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        d[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

export function createZuneshaSkinBumpTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      const v = y / size;
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const idx = (y * size + x) * 4;
        const macro = valueNoise2D(u * 9.0 + 3.1, v * 9.0 + 1.7);
        const fold = Math.sin(v * Math.PI * 26.0 + macro * 5.2) * 0.5 + 0.5;
        const crackle = valueNoise2D(u * 42.0, v * 28.0);
        const val = Math.round((fold * 0.65 + crackle * 0.35) * 255);
        d[idx] = val;
        d[idx + 1] = val;
        d[idx + 2] = val;
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

export function createZouPlateauTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(size, size);
    const d = img.data;
    const half = ZOU_WORLD_SIZE * 0.5;

    for (let py = 0; py < size; py++) {
      const lz = (py / (size - 1)) * ZOU_WORLD_SIZE - half;
      for (let px = 0; px < size; px++) {
        const lx = (px / (size - 1)) * ZOU_WORLD_SIZE - half;
        const idx = (py * size + px) * 4;
        const nr = zouPlateauNormRadius(lx, lz);
        if (nr > 1.02) {
          d[idx] = 45;
          d[idx + 1] = 75;
          d[idx + 2] = 48;
          d[idx + 3] = 0;
          continue;
        }

        const n1 = valueNoise2D(lx * 0.16 + 4.1, lz * 0.16 - 2.3);
        const n2 = valueNoise2D(lx * 0.45 - 6.7, lz * 0.45 + 3.2);
        const zone = sampleZouZone(lx, lz);

        let r = 46 + n1 * 28;
        let g = 114 + n1 * 42;
        let b = 48 + n2 * 20;

        if (zone === 'monolith-rim') {
          const wallMix = Math.max(0, Math.min(1, (nr - 0.90) * 9.0));
          r = r * (1 - wallMix) + (98 + n2 * 20) * wallMix;
          g = g * (1 - wallMix) + (104 + n1 * 18) * wallMix;
          b = b * (1 - wallMix) + (96 + n2 * 16) * wallMix;
          if (nr > 0.985) {
            const skinMix = Math.min(1, (nr - 0.985) * 28.0);
            r = r * (1 - skinMix) + 88 * skinMix;
            g = g * (1 - skinMix) + 93 * skinMix;
            b = b * (1 - skinMix) + 100 * skinMix;
          }
        } else if (zone === 'citadel' || zone === 'mokomo-city') {
          // Terraced sandstone cobbles & plaza ground
          r = 186 + n1 * 26 - n2 * 14;
          g = 166 + n1 * 22 - n2 * 12;
          b = 126 + n1 * 16 - n2 * 10;

          // Subtle radial aqueduct water channels radiating from Citadel
          const angle = Math.atan2(lz + 2.0, lx);
          const dist = Math.hypot(lx, lz + 2.0);
          const channelAngles = [0.68, 1.28, 1.92, 2.52];
          for (let k = 0; k < channelAngles.length; k++) {
            if (dist > 6 && dist < 24 && Math.abs(angle - channelAngles[k]) < 0.08) {
              r = 44 + n2 * 18;
              g = 188 + n1 * 28;
              b = 214 + n1 * 24;
            }
          }
        } else if (zone === 'ravaged-district' || isPointInsideRavagedSector(lx, lz)) {
          // Scorched stone ash + lingering purple Koro chemical stains
          const toxic = Math.max(0, n2 - 0.35) * 1.4;
          r = 92 + n1 * 24 + toxic * 52;
          g = 80 + n1 * 18 - toxic * 18;
          b = 86 + n1 * 20 + toxic * 78;
        }

        d[idx] = Math.max(0, Math.min(255, Math.round(r)));
        d[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        d[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function createMokomoStoneTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#c5aa6c';
    ctx.fillRect(0, 0, size, size);

    const rows = 14;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const cols = 7 + (r % 2);
      const colW = size / cols;
      const offset = (r % 2) * (colW * 0.45);
      for (let c = -1; c <= cols; c++) {
        const x = c * colW + offset;
        const n = valueNoise2D(c * 1.9 + r * 0.7, r * 2.3);
        const shade = Math.round(166 + n * 48);
        const green = Math.round(142 + n * 38);
        const blue = Math.round(92 + n * 24);
        ctx.fillStyle = `rgb(${shade}, ${green}, ${blue})`;
        ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);
      }
      ctx.fillStyle = 'rgba(72, 58, 34, 0.42)';
      ctx.fillRect(0, y, size, 2);
    }

    // Ancient green moss patches creeping down from top
    for (let i = 0; i < 42; i++) {
      const mx = ((i * 79) % 100) * 0.01 * size;
      const my = ((i * 43) % 72) * 0.01 * size;
      const rad = 18 + (i % 5) * 11;
      const grad = ctx.createRadialGradient(mx, my, 2, mx, my, rad);
      grad.addColorStop(0, 'rgba(68, 128, 52, 0.58)');
      grad.addColorStop(1, 'rgba(68, 128, 52, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(mx - rad, my - rad, rad * 2, rad * 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createMokomoHouseFacadeTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#d4c3a3';
    ctx.fillRect(0, 0, size, size);

    // Subtle stone blocks
    for (let y = 0; y < size; y += 24) {
      ctx.fillStyle = 'rgba(105, 88, 62, 0.16)';
      ctx.fillRect(0, y, size, 2);
    }

    // Dark recessed rectangular doorways & upper window slits
    ctx.fillStyle = '#25211d';
    ctx.fillRect(36, 146, 36, 84);
    ctx.fillRect(108, 152, 34, 78);
    ctx.fillRect(184, 150, 32, 80);

    ctx.fillRect(32, 46, 28, 34);
    ctx.fillRect(86, 46, 28, 34);
    ctx.fillRect(142, 46, 28, 34);
    ctx.fillRect(196, 46, 28, 34);

    // Sandstone lintel bands
    ctx.fillStyle = '#e6d9be';
    ctx.fillRect(0, 0, size, 18);
    ctx.fillRect(0, 114, size, 10);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function createWhaleBarkTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      const v = y / size;
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const idx = (y * size + x) * 4;
        const streak = valueNoise2D(u * 26.0, v * 5.5);
        const fine = valueNoise2D(u * 68.0, v * 18.0);
        const rib = Math.sin(u * Math.PI * 16.0 + streak * 3.2) * 0.5 + 0.5;
        const mix = rib * 0.45 + streak * 0.4 + fine * 0.15;

        let r = 172 + mix * 54;
        let g = 190 + mix * 50;
        let b = 180 + mix * 46;

        // Subtle emerald moss near root bottom
        const baseMoss = Math.max(0, 1.0 - v * 2.4) * Math.max(0, streak - 0.38) * 1.8;
        if (baseMoss > 0.01) {
          const m = Math.min(0.82, baseMoss);
          r = r * (1 - m) + 56 * m;
          g = g * (1 - m) + 132 * m;
          b = b * (1 - m) + 64 * m;
        }

        d[idx] = Math.max(0, Math.min(255, Math.round(r)));
        d[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        d[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createAqueductWaterTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, size, 0);
    grad.addColorStop(0, '#1aa9c9');
    grad.addColorStop(0.5, '#4ae6fa');
    grad.addColorStop(1, '#1aa9c9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 48; i++) {
      const x = ((i * 53) % 92 + 4) * 0.01 * size;
      const y = ((i * 71) % 100) * 0.01 * size;
      const h = 24 + (i % 5) * 18;
      ctx.fillStyle = 'rgba(232, 252, 255, 0.55)';
      ctx.fillRect(x, y, 4 + (i % 3) * 2, h);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createRainbowArcTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0.0, 'rgba(255, 65, 65, 0.0)');
    grad.addColorStop(0.14, 'rgba(255, 78, 70, 0.72)');
    grad.addColorStop(0.28, 'rgba(255, 168, 48, 0.78)');
    grad.addColorStop(0.42, 'rgba(255, 236, 72, 0.78)');
    grad.addColorStop(0.56, 'rgba(84, 230, 128, 0.76)');
    grad.addColorStop(0.70, 'rgba(66, 198, 255, 0.76)');
    grad.addColorStop(0.84, 'rgba(130, 118, 255, 0.7)');
    grad.addColorStop(1.0, 'rgba(180, 96, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function createSoftMistTexture(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size * 0.5,
      size * 0.5,
      2,
      size * 0.5,
      size * 0.5,
      size * 0.5
    );
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.88)');
    grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.44)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
