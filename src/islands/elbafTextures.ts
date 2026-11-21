import * as THREE from 'three';
import {
  ELBAF_TRUNK_CENTER,
  ELBAF_WORLD_SIZE,
  elbafCliffSignedDist,
  elbafSunWorldNormRadius,
  sampleElbafUnderworldHeight,
  sampleElbafZone,
} from '../utils/elbafTerrain';
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

export function createElbafUnderworldTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let py = 0; py < size; py++) {
    const lz = (py / (size - 1) - 0.5) * ELBAF_WORLD_SIZE;
    for (let px = 0; px < size; px++) {
      const lx = (px / (size - 1) - 0.5) * ELBAF_WORLD_SIZE;
      const idx = (py * size + px) * 4;

      const cliffDist = elbafCliffSignedDist(lx, lz);
      if (cliffDist > 2.6) {
        d[idx] = 24;
        d[idx + 1] = 74;
        d[idx + 2] = 120;
        d[idx + 3] = 0;
        continue;
      }

      if (cliffDist > -0.4) {
        const n = valueNoise2D(lx * 0.4, lz * 0.4);
        const foam = Math.max(0, 1 - Math.abs(cliffDist - 0.5) / 2.1);
        d[idx] = 228;
        d[idx + 1] = 246;
        d[idx + 2] = 255;
        d[idx + 3] = Math.round(Math.min(245, foam * (160 + n * 85)));
        continue;
      }

      const h = sampleElbafUnderworldHeight(lx, lz);
      const zone = sampleElbafZone(lx, lz, h);
      const n1 = valueNoise2D(lx * 0.11 + 2.1, lz * 0.11 - 3.4);
      const n2 = valueNoise2D(lx * 0.36 - 1.8, lz * 0.36 + 5.2);
      const grain = (n1 - 0.5) * 18 + (n2 - 0.5) * 10;

      let r = 64;
      let g = 76;
      let b = 82;

      if (zone === 'fjord-harbor') {
        const plank = Math.abs(((lx % 2.4) + 2.4) % 2.4 - 1.2) < 0.14;
        r = (plank ? 92 : 114) + grain * 0.4;
        g = (plank ? 74 : 96) + grain * 0.4;
        b = (plank ? 58 : 82) + grain * 0.4;
      } else if (zone === 'adam-trunk') {
        r = 104 + grain * 0.7;
        g = 76 + grain * 0.5;
        b = 50 + grain * 0.4;
      } else if (cliffDist > -6.5) {
        // Dark rugged Nordic basalt & granite sea cliffs
        const strata = Math.sin(h * 1.1 + n1 * 2.5) * 12;
        r = 78 + strata + grain * 0.6;
        g = 86 + strata + grain * 0.6;
        b = 98 + strata + grain * 0.6;
      } else if (h > 17.5 + n1 * 4.0) {
        // Crisp snow-blanketed Underworld peaks
        const snowMix = Math.min(1, (h - 16.5) / 8.0);
        r = 110 * (1 - snowMix) + 228 * snowMix + grain * 0.3;
        g = 124 * (1 - snowMix) + 236 * snowMix + grain * 0.3;
        b = 142 * (1 - snowMix) + 246 * snowMix + grain * 0.3;
      } else {
        // Deep pine-needle & frost floor of Underworld
        const frost = n2 > 0.54 ? 0.38 : 0;
        r = 46 + frost * 145 + grain * 0.5;
        g = 74 + frost * 135 + grain * 0.6;
        b = 64 + frost * 155 + grain * 0.5;
      }

      d[idx] = Math.max(0, Math.min(255, Math.round(r)));
      d[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      d[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      d[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  return configureColorTex(canvas);
}

export function createElbafSunWorldTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base transparent canvas clipped to scalloped Sun World canopy
  ctx.clearRect(0, 0, size, size);

  const scale = size / 140; // maps lx,lz in [-70..70] cleanly
  const toPx = (x: number) => size * 0.5 + x * scale;
  const toPy = (z: number) => size * 0.5 + z * scale;

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i <= 180; i++) {
    const a = (i / 180) * Math.PI * 2;
    let r = 56;
    for (let step = 0; step < 8; step++) {
      const nr = elbafSunWorldNormRadius(Math.cos(a) * r, Math.sin(a) * r);
      r /= Math.max(0.4, nr);
    }
    const px = toPx(Math.cos(a) * r);
    const py = toPy(Math.sin(a) * r);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.clip();

  // Lush mossy emerald meadow gradient with warm amber sunlight around Adam trunk
  const grad = ctx.createRadialGradient(
    toPx(ELBAF_TRUNK_CENTER.x),
    toPy(ELBAF_TRUNK_CENTER.z),
    10 * scale,
    toPx(0),
    toPy(0),
    62 * scale
  );
  grad.addColorStop(0, '#c69a47');
  grad.addColorStop(0.28, '#66b848');
  grad.addColorStop(0.75, '#41963c');
  grad.addColorStop(1, '#26682f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Mottled sunlit foliage & mossy meadow texture patches
  for (let i = 0; i < 650; i++) {
    const x = ((Math.sin(i * 19.3) * 0.5 + 0.5) - 0.5) * 120;
    const z = ((Math.cos(i * 31.7) * 0.5 + 0.5) - 0.5) * 112;
    const rad = (2.2 + (i % 5) * 0.9) * scale;
    ctx.fillStyle =
      i % 3 === 0
        ? 'rgba(134, 212, 72, 0.16)'
        : i % 3 === 1
          ? 'rgba(34, 96, 44, 0.16)'
          : 'rgba(218, 178, 86, 0.11)';
    ctx.beginPath();
    ctx.arc(toPx(x), toPy(z), rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Canonical Giant Wooden Branch Road Loop (elbaf_76b189ed.webp)
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const drawBranch = (pts: [number, number][], w: number) => {
    ctx.strokeStyle = '#4c3220';
    ctx.lineWidth = w * scale;
    ctx.beginPath();
    pts.forEach(([x, z], idx) => {
      if (idx === 0) ctx.moveTo(toPx(x), toPy(z));
      else ctx.lineTo(toPx(x), toPy(z));
    });
    ctx.stroke();

    ctx.strokeStyle = '#734f34';
    ctx.lineWidth = w * 0.62 * scale;
    ctx.stroke();
  };

  // Outer branch ring linking Aurust -> Huntsmen -> Brew -> Haugen -> Fishermen -> Craftsmen -> Walrus -> West
  drawBranch(
    [
      [-42, -4],
      [-32, -28],
      [-10, -38],
      [18, -36],
      [38, -22],
      [42, 6],
      [30, 26],
      [-8, 34],
      [-28, 22],
      [-36, 8],
      [-42, -4],
    ],
    5.8
  );
  // Radial spokes from central Adam trunk
  drawBranch([[0, -2], [-34, 10]], 5.2);
  drawBranch([[0, -2], [-26, -30]], 4.6);
  drawBranch([[0, -2], [8, -36]], 4.6);
  drawBranch([[0, -2], [38, 4]], 4.6);
  drawBranch([[0, -2], [26, 24]], 5.0);
  drawBranch([[0, -2], [-12, 28]], 4.8);

  // Warrior's Spring & Turquoise River cutting SW off the Sun World edge
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4.6 * scale;
  ctx.beginPath();
  ctx.moveTo(toPx(-22), toPy(8));
  ctx.quadraticCurveTo(toPx(-24), toPy(26), toPx(-28), toPy(54));
  ctx.stroke();
  ctx.strokeStyle = '#bae6fd';
  ctx.lineWidth = 1.8 * scale;
  ctx.stroke();

  // Stone village plazas at West Village, Chieftain Hall, Brew Village & Owl Library
  const plazas: [number, number, number][] = [
    [-32, 12, 8.5],
    [-42, -4, 7.5],
    [-12, 14, 7.2],
    [-12, 28, 6.0],
    [4, -36, 6.2],
    [32, 22, 6.5],
  ];
  for (const [px, pz, pr] of plazas) {
    ctx.fillStyle = '#a89f91';
    ctx.beginPath();
    ctx.arc(toPx(px), toPy(pz), pr * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 0.8 * scale;
    ctx.stroke();
  }

  ctx.restore();
  return configureColorTex(canvas);
}

export function createElbafAdamBarkTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#5a3a22');
  grad.addColorStop(0.42, '#9a6834');
  grad.addColorStop(0.55, '#c78c44');
  grad.addColorStop(0.85, '#6a4428');
  grad.addColorStop(1, '#3e2918');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Deep vertical bark furrows and mossy streaks
  for (let i = 0; i < 110; i++) {
    const x = ((Math.sin(i * 17.3) * 0.5 + 0.5)) * size;
    const w = 2 + (i % 6) * 2.2;
    ctx.fillStyle = i % 5 === 0 ? 'rgba(42, 24, 14, 0.55)' : 'rgba(218, 162, 84, 0.24)';
    ctx.fillRect(x, 0, w, size);
    if (i % 7 === 0) {
      ctx.fillStyle = 'rgba(74, 124, 52, 0.28)';
      ctx.fillRect(x + 2, size * 0.25, w * 0.9, size * 0.55);
    }
  }

  return configureColorTex(canvas, 3, 2);
}

export function createElbafCanopyTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#a3e635');
  grad.addColorStop(0.4, '#4ade80');
  grad.addColorStop(0.75, '#15803d');
  grad.addColorStop(1, '#14532d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 420; i++) {
    const x = (Math.sin(i * 23.1) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 41.7) * 0.5 + 0.5) * size;
    const r = 6 + (i % 9) * 2.5;
    ctx.fillStyle =
      i % 3 === 0
        ? 'rgba(190, 242, 100, 0.28)'
        : i % 3 === 1
          ? 'rgba(22, 101, 52, 0.34)'
          : 'rgba(74, 222, 128, 0.24)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return configureColorTex(canvas, 2, 2);
}

export function createElbafVikingWoodTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8b5a34';
  ctx.fillRect(0, 0, size, size);

  // Horizontal heavy Nordic timber logs + vertical corner beams
  const planks = 10;
  const ph = size / planks;
  for (let i = 0; i < planks; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#9c673d' : '#85532f';
    ctx.fillRect(0, i * ph + 2, size, ph - 4);
    ctx.fillStyle = '#4a2c16';
    ctx.fillRect(0, i * ph, size, 3);
  }
  // Decorative golden rune trim band near top
  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, size * 0.12, size, 12);
  ctx.fillStyle = '#fbbf24';
  for (let x = 14; x < size; x += 28) {
    ctx.fillRect(x, size * 0.12 + 3, 12, 6);
  }

  return configureColorTex(canvas, 1, 1);
}

export function createElbafShingleRoofTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#993b2a';
  ctx.fillRect(0, 0, size, size);

  const rows = 14;
  const cols = 12;
  const rh = size / rows;
  const cw = size / cols;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const shade = ((r * 7 + c * 13) % 5) * 7;
      ctx.fillStyle = `rgb(${152 + shade}, ${58 + shade * 0.5}, ${40 + shade * 0.3})`;
      ctx.fillRect(c * cw + off + 2, r * rh + 2, cw - 4, rh - 4);
      ctx.fillStyle = 'rgba(52, 18, 12, 0.45)';
      ctx.fillRect(c * cw + off, (r + 1) * rh - 3, cw, 3);
    }
  }

  return configureColorTex(canvas, 2, 2);
}

export function createElbafCastleStoneTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8b949e';
  ctx.fillRect(0, 0, size, size);

  const rows = 12;
  const cols = 8;
  const rh = size / rows;
  const cw = size / cols;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const v = ((r * 11 + c * 17) % 7) * 5;
      ctx.fillStyle = `rgb(${132 + v}, ${142 + v}, ${152 + v})`;
      ctx.fillRect(c * cw + off + 2, r * rh + 2, cw - 4, rh - 4);
    }
  }
  // Arched castle lancet windows
  ctx.fillStyle = '#1e293b';
  for (let i = 1; i < 4; i++) {
    const wx = (i / 4) * size;
    ctx.fillRect(wx - 8, size * 0.35, 16, 44);
    ctx.beginPath();
    ctx.arc(wx, size * 0.35, 8, Math.PI, 0);
    ctx.fill();
  }

  return configureColorTex(canvas, 2, 2);
}

export function createElbafSwordSteelTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0, '#94a3b8');
  grad.addColorStop(0.45, '#cbd5e1');
  grad.addColorStop(0.5, '#64748b');
  grad.addColorStop(0.55, '#e2e8f0');
  grad.addColorStop(1, '#788496');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Ancient weathered Norse notches & lichen patches
  for (let i = 0; i < 45; i++) {
    ctx.fillStyle = i % 3 === 0 ? 'rgba(71, 85, 105, 0.38)' : 'rgba(101, 134, 72, 0.25)';
    ctx.fillRect(
      ((i * 43) % (size - 30)),
      ((i * 67) % (size - 20)),
      18 + (i % 4) * 6,
      8 + (i % 3) * 4
    );
  }
  return configureColorTex(canvas, 1, 2);
}

export function createElbafSailTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const stripes = 6;
  const sw = size / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#dc2626' : '#fef3c7';
    ctx.fillRect(i * sw, 0, sw, size);
  }
  return configureColorTex(canvas);
}

export function createElbafRainbowTexture(w = 512, h = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, 'rgba(239, 68, 68, 0.0)');
  grad.addColorStop(0.1, 'rgba(239, 68, 68, 0.85)');
  grad.addColorStop(0.26, 'rgba(249, 115, 22, 0.88)');
  grad.addColorStop(0.42, 'rgba(250, 204, 21, 0.90)');
  grad.addColorStop(0.58, 'rgba(34, 197, 94, 0.88)');
  grad.addColorStop(0.74, 'rgba(56, 189, 248, 0.86)');
  grad.addColorStop(0.9, 'rgba(139, 92, 246, 0.82)');
  grad.addColorStop(1.0, 'rgba(139, 92, 246, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  return configureColorTex(canvas);
}

export function createElbafWaterfallTexture(w = 256, h = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(125, 211, 252, 0.15)');
  grad.addColorStop(0.2, 'rgba(56, 189, 248, 0.82)');
  grad.addColorStop(0.5, 'rgba(224, 242, 254, 0.94)');
  grad.addColorStop(0.8, 'rgba(56, 189, 248, 0.82)');
  grad.addColorStop(1, 'rgba(125, 211, 252, 0.15)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 42; i++) {
    const x = (i / 42) * w;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(14,165,233,0.35)';
    ctx.fillRect(x, 0, 3 + (i % 3) * 2, h);
  }
  return configureColorTex(canvas, 1, 2);
}

export function createElbafMistTexture(w = 256, h = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, w, h);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, 'rgba(224, 242, 254, 0.0)');
  grad.addColorStop(0.28, 'rgba(224, 242, 254, 0.24)');
  grad.addColorStop(0.5, 'rgba(241, 245, 249, 0.42)');
  grad.addColorStop(0.72, 'rgba(224, 242, 254, 0.24)');
  grad.addColorStop(1.0, 'rgba(224, 242, 254, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 36; i++) {
    const cx = (i / 36) * w;
    const cy = h * (0.34 + ((i * 19) % 10) * 0.032);
    const rx = 20 + (i % 5) * 6;
    const ry = 10 + (i % 3) * 5;
    const rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, rx);
    rg.addColorStop(0, 'rgba(255, 255, 255, 0.26)');
    rg.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return configureColorTex(canvas, 3, 1);
}
