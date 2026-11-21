import * as THREE from 'three';
import {
  EGGHEAD_WORLD_SIZE,
  eggheadCliffSignedDist,
  sampleEggheadLowerHeight,
  sampleEggheadZone,
} from '../utils/eggheadTerrain';
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

export function createEggheadTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let py = 0; py < size; py++) {
    const lz = (py / (size - 1) - 0.5) * EGGHEAD_WORLD_SIZE;
    for (let px = 0; px < size; px++) {
      const lx = (px / (size - 1) - 0.5) * EGGHEAD_WORLD_SIZE;
      const idx = (py * size + px) * 4;

      const cliffDist = eggheadCliffSignedDist(lx, lz);
      if (cliffDist > 2.4) {
        d[idx] = 28;
        d[idx + 1] = 84;
        d[idx + 2] = 132;
        d[idx + 3] = 0;
        continue;
      }

      if (cliffDist > -0.35) {
        const n = valueNoise2D(lx * 0.45, lz * 0.45);
        const foam = Math.max(0, 1 - Math.abs(cliffDist - 0.45) / 1.9);
        const alpha = Math.round(Math.min(245, foam * (165 + n * 85)));
        d[idx] = 228;
        d[idx + 1] = 247;
        d[idx + 2] = 255;
        d[idx + 3] = alpha;
        continue;
      }

      const h = sampleEggheadLowerHeight(lx, lz);
      const zone = sampleEggheadZone(lx, lz, h);
      const n1 = valueNoise2D(lx * 0.14 + 2.7, lz * 0.14 - 4.2);
      const n2 = valueNoise2D(lx * 0.42 - 1.5, lz * 0.42 + 6.1);
      const grain = (n1 - 0.5) * 20 + (n2 - 0.5) * 12;

      let r = 82;
      let g = 148;
      let b = 74;

      if (cliffDist > -5.5 && zone !== 'harbor') {
        // Rugged coastal limestone & ochre cliffs
        const strata = Math.sin(h * 1.45 + n1 * 2.2) * 14;
        r = 126 + strata + grain * 0.7;
        g = 104 + strata * 0.8 + grain * 0.6;
        b = 82 + strata * 0.6 + grain * 0.5;
      } else if (zone === 'harbor') {
        // High-tech futuristic port deck & crisp sea-wall stone/slate
        const grid =
          Math.abs(((lx % 4) + 4) % 4 - 2) < 0.12 ||
          Math.abs(((lz % 4) + 4) % 4 - 2) < 0.12;
        if (grid) {
          r = 88;
          g = 210;
          b = 232;
        } else {
          r = 166 + grain * 0.3;
          g = 180 + grain * 0.3;
          b = 196 + grain * 0.3;
        }
      } else if (zone === 'emet-scrapyard') {
        // Lush mossy forest hollow with rusted scrap earth
        const mossPatch = valueNoise2D(lx * 0.28 - 3.4, lz * 0.28 + 2.1);
        if (mossPatch > 0.48) {
          r = 76 + grain * 0.7;
          g = 138 + grain * 0.8;
          b = 62 + grain * 0.5;
        } else {
          r = 118 + grain * 0.6;
          g = 98 + grain * 0.5;
          b = 78 + grain * 0.4;
        }
      } else if (zone === 'fabriophase') {
        // Mint-cyan futuristic paved boulevard + pastel glowing circuit grid
        const gx = Math.abs(((lx % 6) + 6) % 6 - 3) < 0.2;
        const gz = Math.abs(((lz % 6) + 6) % 6 - 3) < 0.2;
        const avenue = Math.abs(lx + 1.5) < 4.2 || Math.abs(lz - 12.0) < 3.6;
        if (gx || gz) {
          r = 98;
          g = 232;
          b = 238;
        } else if (avenue) {
          r = 196 + grain * 0.25;
          g = 224 + grain * 0.25;
          b = 232 + grain * 0.25;
        } else {
          r = 92 + grain * 0.45;
          g = 178 + grain * 0.45;
          b = 148 + grain * 0.45;
        }
      } else {
        // Lush emerald tropical cliff plateau & palm canopy floor
        r = 56 + grain * 0.7;
        g = 154 + grain * 0.85;
        b = 68 + grain * 0.5;
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

export function createEggheadCliffTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#7c6652';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 6) {
    const shade = 104 + Math.sin(y * 0.08) * 18;
    ctx.fillStyle = `rgb(${shade + 18}, ${shade}, ${Math.max(40, shade - 18)})`;
    ctx.fillRect(0, y, size, 4);
  }
  for (let i = 0; i < 420; i++) {
    const x = (Math.sin(i * 71.3) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 43.9) * 0.5 + 0.5) * size;
    const w = 10 + (i % 24);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(60, 48, 38, 0.25)' : 'rgba(176, 152, 126, 0.22)';
    ctx.fillRect(x, y, w, 3);
  }
  return configureColorTex(canvas, 3, 2);
}

export function createEggheadCloudHoloBandTexture(
  width = 1024,
  height = 128
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(56, 148, 255, 0.22)';
  ctx.fillRect(0, height * 0.26, width, height * 0.48);

  // Double horizontal telemetry rails
  ctx.fillStyle = '#5eead4';
  ctx.fillRect(0, height * 0.28, width, 6);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(0, height * 0.48, width, 4);
  ctx.fillStyle = '#60a5fa';
  ctx.fillRect(0, height * 0.68, width, 6);

  // Diagonal tech chevrons & =066= / =100= decals around circumference
  const marks = ['=066=', '=100=', '=066=', '=100='];
  for (let i = 0; i < 4; i++) {
    const cx = width * (i / 4 + 0.125);
    ctx.clearRect(cx - 88, height * 0.15, 176, height * 0.7);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - 88, height * 0.36, 22, 7);
    ctx.fillRect(cx - 88, height * 0.56, 22, 7);
    ctx.fillRect(cx + 66, height * 0.36, 22, 7);
    ctx.fillRect(cx + 66, height * 0.56, 22, 7);

    ctx.font = 'bold 46px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.fillText(marks[i], cx, height * 0.51);
    ctx.shadowBlur = 0;

    // Slanted accent stripes midway between numerals
    const sx = (cx + width * 0.125) % width;
    ctx.fillStyle = '#93c5fd';
    for (let s = -2; s <= 2; s++) {
      ctx.beginPath();
      ctx.moveTo(sx + s * 14 - 4, height * 0.68);
      ctx.lineTo(sx + s * 14 + 4, height * 0.3);
      ctx.lineTo(sx + s * 14 + 11, height * 0.3);
      ctx.lineTo(sx + s * 14 + 3, height * 0.68);
      ctx.closePath();
      ctx.fill();
    }
  }

  return configureColorTex(canvas, 1, 1);
}

export function createEggheadPunkRecordsHoloTexture(
  width = 1024,
  height = 256
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, 'rgba(34, 18, 66, 0.92)');
  grad.addColorStop(0.55, 'rgba(138, 62, 166, 0.88)');
  grad.addColorStop(1, 'rgba(72, 178, 232, 0.85)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Perspective sci-fi telemetry grid
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.38)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.font = '900 78px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#f0abfc';
  ctx.shadowBlur = 18;
  ctx.fillText('PUNK RECORDS', width * 0.5, height * 0.56);
  ctx.shadowBlur = 0;

  return configureColorTex(canvas);
}

export function createEggheadPunkTowerTexture(
  width = 512,
  height = 256
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#c084fc');
  grad.addColorStop(0.5, '#7e22ce');
  grad.addColorStop(1, '#4c1d95');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(233, 213, 255, 0.45)';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 24, width, height - 48);

  // Repeat PUNK signage around the purple dome cylinder
  ctx.font = '900 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f5d0fe';
  ctx.shadowColor = '#e879f9';
  ctx.shadowBlur = 12;
  ctx.fillText('PUNK', width * 0.25, height * 0.55);
  ctx.fillText('PUNK', width * 0.75, height * 0.55);
  ctx.shadowBlur = 0;

  return configureColorTex(canvas);
}

export function createEggheadCandyStripeTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#dc2626';
  const step = 32;
  for (let i = -size; i < size * 2; i += step * 2) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + step, 0);
    ctx.lineTo(i + step + size, size);
    ctx.lineTo(i + size, size);
    ctx.closePath();
    ctx.fill();
  }
  return configureColorTex(canvas, 1, 2);
}

export function createEggheadVegaDiskTexture(
  width = 512,
  height = 256
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    16,
    width * 0.5,
    height * 0.5,
    width * 0.48
  );
  grad.addColorStop(0, '#a5f3fc');
  grad.addColorStop(0.65, '#06b6d4');
  grad.addColorStop(1, '#0e7490');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Starburst rays
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 3;
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.5, height * 0.5);
    ctx.lineTo(
      width * 0.5 + Math.cos(ang) * width * 0.48,
      height * 0.5 + Math.sin(ang) * height * 0.48
    );
    ctx.stroke();
  }

  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.ellipse(width * 0.5, height * 0.5, width * 0.44, height * 0.41, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = '900 108px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#0f172a';
  ctx.strokeText('VEGA', width * 0.5, height * 0.52);
  ctx.fillStyle = '#fef08a';
  ctx.fillText('VEGA', width * 0.5, height * 0.52);

  return configureColorTex(canvas);
}

export function createEggheadVegaPunkRingTexture(
  width = 1024,
  height = 128
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(14, 165, 233, 0.25)';
  ctx.fillRect(0, 18, width, height - 36);

  ctx.font = '900 66px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fef08a';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 10;
  ctx.fillText('VEGA PUNK', width * 0.25, height * 0.52);
  ctx.fillText('VEGA PUNK', width * 0.75, height * 0.52);
  ctx.shadowBlur = 0;

  return configureColorTex(canvas);
}

export function createEggheadControllerTexture(
  width = 512,
  height = 256
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#a855f7';
  ctx.fillRect(0, 0, width, height);

  // Inner light lavender face
  ctx.fillStyle = '#e9d5ff';
  ctx.fillRect(26, 26, width - 52, height - 52);

  // Pink center console strip
  ctx.fillStyle = '#ec4899';
  ctx.fillRect(width * 0.36, 44, width * 0.28, height - 88);

  // White cross D-pad on left
  const dx = width * 0.2;
  const dy = height * 0.5;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(dx - 14, dy - 42, 28, 84);
  ctx.fillRect(dx - 42, dy - 14, 84, 28);

  // Four pastel action buttons on right
  const bx = width * 0.8;
  const by = height * 0.5;
  const btns: [number, number, string][] = [
    [0, -28, '#fef08a'],
    [28, 0, '#ef4444'],
    [0, 28, '#22d3ee'],
    [-28, 0, '#4ade80'],
  ];
  for (const [ox, oy, col] of btns) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(bx + ox, by + oy, 13, 0, Math.PI * 2);
    ctx.fill();
  }

  return configureColorTex(canvas);
}

export function createEggheadLabFacadeTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, size, size);

  // Clean futuristic horizontal window bands + vertical trim seams
  for (let row = 0; row < 4; row++) {
    const y = row * (size / 4);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, y, size, 10);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(16, y + 26, size - 32, 54);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(22, y + 32, size - 44, 14);
  }
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 4;
  for (let col = 0; col <= size; col += 128) {
    ctx.beginPath();
    ctx.moveTo(col, 0);
    ctx.lineTo(col, size);
    ctx.stroke();
  }

  return configureColorTex(canvas, 2, 1);
}

export function createEggheadBrokenEggTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#93e5fb');
  grad.addColorStop(0.45, '#e9b8dc');
  grad.addColorStop(1, '#d896cf');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle futuristic panel lines around the shell
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.34)';
  ctx.lineWidth = 3;
  for (let i = 1; i < 6; i++) {
    const y = (i / 6) * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  return configureColorTex(canvas);
}

export function createEggheadFrontierShieldTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(125, 211, 252, 0.65)';
  ctx.lineWidth = 3;
  const step = 48;
  for (let y = 0; y < size + step; y += step) {
    for (let x = 0; x < size + step; x += step) {
      const cx = x + ((y / step) % 2 === 0 ? 0 : step * 0.5);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
        const px = cx + Math.cos(a) * (step * 0.52);
        const py = y + Math.sin(a) * (step * 0.52);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  return configureColorTex(canvas, 3, 2);
}

export function createEggheadEmetArmorTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#9aa5b1');
  grad.addColorStop(0.5, '#7e8894');
  grad.addColorStop(1, '#64707d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle brushed armor seam lines and rivets
  ctx.strokeStyle = 'rgba(42, 50, 60, 0.45)';
  ctx.lineWidth = 4;
  for (let x = 64; x < size; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  // Distinct weathered orange collar band
  ctx.fillStyle = '#c86b3a';
  ctx.fillRect(0, 22, size, 28);

  // Gentle rust drips and soft olive-moss weathering along top edges
  for (let i = 0; i < 65; i++) {
    const x = (Math.sin(i * 37.1) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 19.7) * 0.5 + 0.5) * size;
    if (i % 3 === 0) {
      ctx.fillStyle = 'rgba(138, 74, 42, 0.28)';
      ctx.fillRect(x, y, 6 + (i % 10), 28 + (i % 34));
    } else if (y < size * 0.35 || i % 5 === 0) {
      ctx.fillStyle = 'rgba(104, 152, 68, 0.42)';
      ctx.beginPath();
      ctx.ellipse(x, y, 14 + (i % 18), 8 + (i % 12), 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return configureColorTex(canvas);
}
