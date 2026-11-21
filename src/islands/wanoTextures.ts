import * as THREE from 'three';
import {
  WANO_CANAL_WATER_Y,
  WANO_PLATEAU_Y,
  WANO_WORLD_SIZE,
  sampleWanoHeight,
  sampleWanoZone,
  wanoInnerIslandDist,
  wanoPlateauNormRadius,
  wanoRiverDistance,
} from '../utils/wanoTerrain';
import { valueNoise2D } from '../utils/globeMath';

function configureColorTex(
  canvas: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = repeatX > 1 || repeatY > 1 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.wrapT = repeatX > 1 || repeatY > 1 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Top-down Ukiyo-e illustrated terrain map of Wano Kuni's outer fluted mountain rim,
 * elevated deep-blue inland sea, 6 distinct island climates, and Onigashima in the southern bay.
 */
export function createWanoTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let py = 0; py < size; py++) {
    const lz = (py / (size - 1) - 0.5) * WANO_WORLD_SIZE;
    for (let px = 0; px < size; px++) {
      const lx = (px / (size - 1) - 0.5) * WANO_WORLD_SIZE;
      const idx = (py * size + px) * 4;

      const nr = wanoPlateauNormRadius(lx, lz);
      if (nr > 1.11) {
        d[idx] = 28;
        d[idx + 1] = 68;
        d[idx + 2] = 106;
        d[idx + 3] = 0;
        continue;
      }

      const n1 = valueNoise2D(lx * 0.14 + 3.1, lz * 0.14 - 4.7);
      const n2 = valueNoise2D(lx * 0.42 - 1.9, lz * 0.42 + 6.3);
      const grain = (n1 - 0.5) * 24 + (n2 - 0.5) * 14;

      let r = 100;
      let g = 140;
      let b = 80;

      const isWaterfallSpill = Math.abs(lx) < 11.5 && lz > 40.0;
      const { minDist, island } = wanoInnerIslandDist(lx, lz);

      if (nr >= 0.855) {
        if (isWaterfallSpill) {
          // Great Curtain Waterfall spillway pouring down the southern cleft
          const streak = Math.sin(lx * 2.4 + n2 * 2.0) * 26;
          r = 46 + streak;
          g = 128 + streak;
          b = 198 + streak * 0.6;
        } else {
          // Towering fluted brown-ochre mountain rim & outer sea cliffs
          const flute = Math.sin(Math.atan2(lz + 2, lx) * 42.0) * 18;
          r = 124 + flute + grain * 0.65;
          g = 94 + flute * 0.8 + grain * 0.5;
          b = 54 + flute * 0.5 + grain * 0.35;
        }
      } else if (minDist > 0.65) {
        // Elevated mountaintop deep-blue inland sea surrounding all islands and outer rim
        const swirl =
          Math.sin(Math.hypot(lx, lz - 33.5) * 0.85) * 10 +
          (n1 - 0.5) * 16;
        const surfNearOni =
          lz > 33.5 && lz < 55.0 && Math.abs(lx) < 18.0
            ? Math.max(0, Math.sin(lz * 1.9) * 26)
            : 0;
        r = 18 + swirl * 0.4 + surfNearOni;
        g = 62 + swirl * 0.8 + surfNearOni * 1.1;
        b = 132 + swirl + surfNearOni * 1.2;
      } else if (minDist > -0.85 && island !== 'onigashima') {
        // Crisp warm tan-gold shoreline beaches/embankments separating every island from the blue water
        r = 212 + grain * 0.4;
        g = 186 + grain * 0.35;
        b = 124 + grain * 0.25;
      } else {
        const zone = sampleWanoZone(lx, lz);
        const h = sampleWanoHeight(lx, lz);
        const rDist = wanoRiverDistance(lx, lz);

        if (zone === 'onigashima' || island === 'onigashima') {
          const ash = n1 * 24;
          r = minDist > -0.9 ? 142 : 64 + ash;
          g = minDist > -0.9 ? 148 : 48 + ash * 0.75;
          b = minDist > -0.9 ? 168 : 92 + ash * 1.15;
        } else if (zone === 'mount-fuji') {
          if (h > 64.0 + n1 * 4.5) {
            r = 244 + grain * 0.2;
            g = 248 + grain * 0.2;
            b = 254;
          } else {
            r = 74 + grain * 0.5;
            g = 82 + grain * 0.5;
            b = 100 + grain * 0.5;
          }
        } else if (zone === 'flower-capital') {
          const roadGrid =
            Math.abs(Math.sin(lx * 0.75)) < 0.14 || Math.abs(Math.sin(lz * 0.75)) < 0.14;
          r = (roadGrid ? 198 : 166) + grain * 0.38;
          g = (roadGrid ? 174 : 158) + grain * 0.32;
          b = (roadGrid ? 168 : 148) + grain * 0.38;
          if (n2 > 0.65) {
            r += 34;
            g -= 8;
            b += 16;
          }
        } else if (zone === 'kuri') {
          const dBeach = Math.hypot(lx + 62.5, lz + 10.0);
          if (dBeach < 6.2) {
            r = 228 + grain * 0.35;
            g = 204 + grain * 0.35;
            b = 138 + grain * 0.25;
          } else {
            r = 76 + grain * 0.55;
            g = 152 + grain * 0.85;
            b = 62 + grain * 0.45;
          }
        } else if (zone === 'udon') {
          const dMine = Math.hypot(lx + 23.5, lz - 2.0);
          if (dMine < 6.5) {
            r = 128 + grain * 0.45;
            g = 112 + grain * 0.42;
            b = 94 + grain * 0.4;
          } else {
            r = 204 + grain * 0.55;
            g = 172 + grain * 0.5;
            b = 114 + grain * 0.42;
          }
        } else if (zone === 'kibi') {
          r = 178 + grain * 0.55;
          g = 160 + grain * 0.5;
          b = 110 + grain * 0.4;
        } else if (zone === 'ringo') {
          const iceDrift = Math.max(0, 1 - Math.max(0, h - WANO_PLATEAU_Y) / 12.0);
          r = 226 + iceDrift * 18 + grain * 0.22;
          g = 235 + iceDrift * 14 + grain * 0.2;
          b = 250 + grain * 0.1;
        } else if (zone === 'hakumai') {
          r = n1 > 0.44 ? 214 + grain * 0.5 : 156 + grain * 0.55;
          g = n1 > 0.44 ? 148 + grain * 0.45 : 162 + grain * 0.55;
          b = n1 > 0.44 ? 54 + grain * 0.35 : 82 + grain * 0.38;
        } else {
          r = h < WANO_CANAL_WATER_Y + 0.4 ? 30 : 168;
          g = h < WANO_CANAL_WATER_Y + 0.4 ? 86 : 148;
          b = h < WANO_CANAL_WATER_Y + 0.4 ? 156 : 112;
        }

        // Sakura Canal water bed inside Flower Capital
        if (
          island === 'flower-capital' &&
          zone !== 'mount-fuji' &&
          Math.hypot(lx - 1.5, lz + 13.5) > 5.0 &&
          rDist < 0.75
        ) {
          r = rDist < -0.1 ? 26 : 184;
          g = rDist < -0.1 ? 84 : 162;
          b = rDist < -0.1 ? 158 : 122;
        }
      }

      d[idx] = Math.max(0, Math.min(255, r));
      d[idx + 1] = Math.max(0, Math.min(255, g));
      d[idx + 2] = Math.max(0, Math.min(255, b));
      d[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return configureColorTex(canvas, 1, 1);
}

/**
 * Vertical Ukiyo-e woodblock cliff rock striations for Wano's sea fortress walls.
 */
export function createWanoCliffTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#8d6c40');
  grad.addColorStop(0.5, '#73532d');
  grad.addColorStop(1, '#4c351c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Vertical Ukiyo-e fluted crag strokes
  for (let i = 0; i < 160; i++) {
    const x = (i / 160) * size + Math.sin(i * 3.1) * 4;
    const w = 1.5 + (i % 4) * 1.4;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(34, 22, 10, 0.42)' : 'rgba(176, 138, 84, 0.24)';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + w, 0);
    ctx.lineTo(x + w * 0.7 + Math.sin(i) * 6, size);
    ctx.lineTo(x - w * 0.3 + Math.sin(i) * 6, size);
    ctx.closePath();
    ctx.fill();
  }

  // Moss patches near cliff summit
  for (let i = 0; i < 45; i++) {
    const mx = ((i * 73) % size);
    const my = ((i * 19) % Math.floor(size * 0.22));
    ctx.fillStyle = 'rgba(72, 128, 54, 0.35)';
    ctx.beginPath();
    ctx.ellipse(mx, my, 12 + (i % 10), 6 + (i % 5), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  return configureColorTex(canvas, 6, 1);
}

/**
 * Traditional Edo plaster + dark timber lattice castle & machiya facade.
 */
export function createEdoFacadeTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f3efe6';
  ctx.fillRect(0, 0, size, size);

  // Timber columns & horizontal beams
  ctx.fillStyle = '#332419';
  ctx.fillRect(0, 0, size, 16);
  ctx.fillRect(0, size - 18, size, 18);
  ctx.fillRect(0, size * 0.48, size, 12);
  for (let col = 0; col <= 4; col++) {
    const cx = col * (size / 4) - 5;
    ctx.fillRect(cx, 0, 10, size);
  }

  // Shoji / koshi lattice windows
  for (let row = 0; row < 2; row++) {
    const wy = row === 0 ? 34 : size * 0.58;
    const wh = 48;
    for (let col = 0; col < 3; col++) {
      const wx = 24 + col * 72;
      ctx.fillStyle = '#d4b882';
      ctx.fillRect(wx, wy, 48, wh);
      ctx.strokeStyle = '#3c2a1d';
      ctx.lineWidth = 2;
      ctx.strokeRect(wx, wy, 48, wh);
      for (let g = 1; g < 4; g++) {
        ctx.beginPath();
        ctx.moveTo(wx + (g * 48) / 4, wy);
        ctx.lineTo(wx + (g * 48) / 4, wy + wh);
        ctx.stroke();
      }
    }
  }

  return configureColorTex(canvas, 2, 1);
}

/**
 * Kuri golden straw-thatch roof weighted down with bamboo poles & river stones (Image 9).
 */
export function createThatchStoneRoofTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#d9b85c';
  ctx.fillRect(0, 0, size, size);

  // Vertical straw reeds
  for (let x = 0; x < size; x += 3) {
    ctx.fillStyle = x % 6 === 0 ? '#c29d42' : '#ebd07a';
    ctx.fillRect(x, 0, 2, size);
  }

  // Horizontal wooden battens + river weighting stones
  for (let row = 1; row <= 4; row++) {
    const ry = (row / 5) * size;
    ctx.fillStyle = '#6f5132';
    ctx.fillRect(0, ry - 3, size, 6);
    for (let s = 0; s < 5; s++) {
      const sx = 24 + s * 50 + (row % 2) * 14;
      ctx.fillStyle = '#9aa0a6';
      ctx.beginPath();
      ctx.ellipse(sx, ry - 8, 12, 8, (s % 3) * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#555b62';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  return configureColorTex(canvas, 1, 1);
}

/**
 * Mottled cherry-blossom sakura canopy texture (Image 3 & 6).
 */
export function createSakuraBlossomTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8a8cc';
  ctx.fillRect(0, 0, size, size);

  const colors = ['#ffd9eb', '#f58ebc', '#ffedf6', '#e672a7'];
  for (let i = 0; i < 190; i++) {
    const x = ((i * 67) % size);
    const y = ((i * 113) % size);
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.arc(x, y, 8 + (i % 9), 0, Math.PI * 2);
    ctx.fill();
  }

  return configureColorTex(canvas, 1, 1);
}

/**
 * Scrolling stylized Ukiyo-e waterfall streaks with curled foam crests (Image 1 & 3).
 */
export function createWanoWaterfallTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0, '#2a6e9e');
  grad.addColorStop(0.5, '#55b4dc');
  grad.addColorStop(1, '#2a6e9e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 55; i++) {
    const x = (i / 55) * size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(232, 250, 255, 0.72)' : 'rgba(130, 224, 248, 0.45)';
    ctx.fillRect(x, 0, 2 + (i % 3), size);
  }

  return configureColorTex(canvas, 2, 2);
}

/**
 * Hokusai Ukiyo-e deep indigo sea + crisp white surf foam crest (Image 1).
 */
export function createHokusaiWaveTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);
  const grad = ctx.createLinearGradient(0, size, 0, 0);
  grad.addColorStop(0, '#133d6e');
  grad.addColorStop(0.55, '#2b70ab');
  grad.addColorStop(0.82, '#86cbe8');
  grad.addColorStop(1, '#ffffff');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, size);
  for (let x = 0; x <= size; x += 16) {
    const crest = size * 0.22 + Math.sin((x / size) * Math.PI * 4) * 26;
    ctx.lineTo(x, crest);
  }
  ctx.lineTo(size, size);
  ctx.closePath();
  ctx.fill();

  // White curled foam fingers along crest
  ctx.fillStyle = '#ffffff';
  for (let x = 8; x < size; x += 28) {
    ctx.beginPath();
    ctx.arc(x, size * 0.22 + Math.sin((x / size) * Math.PI * 4) * 26, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  return configureColorTex(canvas, 1, 1);
}

/**
 * Crisp Ukiyo-e scalloped cloud ribbon texture (Image 3 & 4).
 */
export function createUkiyoCloudTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = Math.floor(size * 0.5);
  const ctx = canvas.getContext('2d')!;
  const h = canvas.height;

  ctx.clearRect(0, 0, size, h);
  ctx.fillStyle = 'rgba(248, 251, 255, 0.92)';
  ctx.beginPath();
  ctx.roundRect(18, h * 0.36, size - 36, h * 0.34, h * 0.17);
  ctx.fill();

  for (let i = 0; i < 6; i++) {
    const cx = 42 + i * 34;
    const cy = h * 0.44 + (i % 2 === 0 ? -8 : 4);
    ctx.beginPath();
    ctx.arc(cx, cy, 18 + (i % 3) * 6, 0, Math.PI * 2);
    ctx.fill();
  }

  return configureColorTex(canvas, 1, 1);
}

/**
 * Soft radial mist/smoke alpha texture for Udon smokestacks & Onigashima purple fog.
 */
export function createWanoSmokeTexture(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.08,
    size * 0.5,
    size * 0.5,
    size * 0.5
  );
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.52)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  return configureColorTex(canvas, 1, 1);
}
