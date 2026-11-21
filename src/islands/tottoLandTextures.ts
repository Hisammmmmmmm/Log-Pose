import * as THREE from 'three';
import { valueNoise2D } from '../utils/globeMath';
import {
  TOTTO_LAND_WORLD_SIZE,
  WHOLE_CAKE_CHATEAU_CENTER,
  sampleTottoLandZone,
  tottoLandArchipelagoSignedDist,
  TOTTO_LAND_ISLAND_BY_ID,
} from '../utils/tottoLandTerrain';

/**
 * Generates the high-resolution surface color texture for all 35 islands,
 * including Whole Cake's lime meadows, pink sprinkle sugar paths, juice &
 * chocolate rivers, plus per-island theme palettes (chocolate, cheese, berries, ice, etc.).
 */
export function createTottoLandTerrainTexture(size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(size, size);
    const data = img.data;
    const half = TOTTO_LAND_WORLD_SIZE * 0.5;

    for (let py = 0; py < size; py++) {
      const lz = (py / (size - 1)) * TOTTO_LAND_WORLD_SIZE - half;
      for (let px = 0; px < size; px++) {
        const lx = (px / (size - 1)) * TOTTO_LAND_WORLD_SIZE - half;
        const idx = (py * size + px) * 4;
        const { sd, islandId, kind } = tottoLandArchipelagoSignedDist(lx, lz);

        if (kind === 'harbor' || kind === 'sea' || sd > 2.4) {
          if (sd > 0 && sd <= 2.4 && kind !== 'harbor') {
            // Frothy white cream-surf shore collar around each island
            const n = valueNoise2D(lx * 0.45, lz * 0.45);
            const surfT = Math.max(0, Math.min(1, (2.4 - sd) / 2.4));
            data[idx] = Math.round(145 + surfT * 108);
            data[idx + 1] = Math.round(220 + surfT * 34);
            data[idx + 2] = Math.round(244 + surfT * 11);
            data[idx + 3] = Math.round(surfT * (n > 0.3 ? 215 : 140));
          } else {
            data[idx] = 28;
            data[idx + 1] = 128;
            data[idx + 2] = 196;
            data[idx + 3] = 0;
          }
          continue;
        }

        const n1 = valueNoise2D(lx * 0.14 + 3.1, lz * 0.14 - 2.4);
        const n2 = valueNoise2D(lx * 0.48 - 1.3, lz * 0.48 + 5.7);

        let r = 132;
        let g = 212;
        let b = 92;
        const a = 255;

        if (kind === 'moat') {
          r = 46;
          g = 192;
          b = 228;
        } else if (kind === 'juice-river') {
          // Bright orange-juice river in Sweet City (wale_cake5_5c209af3.JPG)
          r = 245;
          g = 152 + Math.round(n2 * 22);
          b = 24;
        } else if (kind === 'pastry-islet') {
          r = 242;
          g = 192;
          b = 126;
        } else if (kind === 'peripheral') {
          const isl = TOTTO_LAND_ISLAND_BY_ID[islandId];
          const rimT = Math.max(0, Math.min(1, -sd / 2.6));
          if (isl?.theme === 'cacao') {
            // Dark chocolate cliffs + lime cocoa meadows + 3 cocoa peaks + Chocolat Town
            const dx = lx - isl.x;
            const dz = lz - isl.z;
            const isPeak =
              Math.hypot(dx + 11.5, dz + 4.5) < 7.2 ||
              Math.hypot(dx + 7.0, dz - 2.5) < 7.8 ||
              Math.hypot(dx + 12.5, dz - 5.5) < 6.4;
            if (rimT < 0.72) {
              r = 92;
              g = 50;
              b = 34;
            } else if (isPeak) {
              r = 122 + n1 * 28;
              g = 68 + n1 * 18;
              b = 58 + n1 * 16;
            } else if (Math.hypot(dx - 7.5, dz) < 10.5) {
              r = 148 + n2 * 24;
              g = 88 + n2 * 18;
              b = 76 + n2 * 16;
            } else {
              r = 112 + n1 * 38;
              g = 198 + n1 * 30;
              b = 88 + n2 * 26;
            }
          } else if (isl?.theme === 'cheese') {
            // Melting golden cheddar cliff rim + lush grass terrace
            if (rimT < 0.8) {
              r = 250;
              g = 198 + n2 * 22;
              b = 46;
            } else {
              r = 124 + n1 * 36;
              g = 194 + n1 * 28;
              b = 78 + n2 * 22;
            }
          } else if (isl?.theme === 'ice') {
            r = rimT < 0.7 ? 176 : 226 + n2 * 24;
            g = rimT < 0.7 ? 228 : 244 + n2 * 10;
            b = 252;
          } else if (isl?.theme === 'jam' || isl?.theme === 'fruits') {
            r = rimT < 0.68 ? 228 : 138 + n1 * 32;
            g = rimT < 0.68 ? 64 : 206 + n1 * 26;
            b = rimT < 0.68 ? 104 : 96 + n2 * 26;
          } else if (isl?.theme === 'funwari' || isl?.theme === 'cutlery') {
            r = rimT < 0.68 ? 246 : 242 - n1 * 18;
            g = rimT < 0.68 ? 202 : 220 - n1 * 16;
            b = rimT < 0.68 ? 220 : 236 - n2 * 14;
          } else if (isl?.theme === 'milk') {
            r = 246 - n1 * 12;
            g = 248 - n1 * 10;
            b = 252;
          } else {
            // Biscuit crust / frosting shores with pastel candy turf
            if (rimT < 0.68) {
              r = 228;
              g = 176;
              b = 112;
            } else {
              r = 148 + n1 * 48;
              g = 206 + n1 * 30;
              b = 118 + n2 * 36;
            }
          }
        } else {
          // Whole Cake Island zones
          const zone = sampleTottoLandZone(lx, lz);
          const rimT = Math.max(0, Math.min(1, -sd / 2.2));
          if (rimT < 0.58) {
            // Crisp white whipped-cream / chocolate-wafer island shore (wale_cake_75fc46e8.JPG)
            r = 248;
            g = 242;
            b = 236;
          } else if (zone === 'seducing-woods') {
            // Deep mystical emerald forest floor + winding cream sugar paths
            const ringPath = Math.abs(
              Math.hypot((lx + 46) / 22, (lz - 2) / 24) - 0.66
            );
            const crossPath = Math.abs(lz - (2 + Math.sin(lx * 0.14) * 9));
            if (ringPath < 0.095 || (crossPath < 2.2 && lx > -64 && lx < -12)) {
              r = 242;
              g = 230;
              b = 196;
            } else {
              r = 56 + n1 * 42;
              g = 138 + n1 * 46;
              b = 62 + n2 * 28;
            }
          } else if (zone === 'caramel-peaks') {
            // Northern dark-chocolate & caramel ground + flowing Chocolate River
            const dRiver = Math.abs(lx - (-6 + Math.sin(lz * 0.15) * 4.5));
            if (dRiver < 2.6 && lz > -42 && lz < -18) {
              r = 96;
              g = 46;
              b = 24;
            } else {
              r = 148 + n1 * 38;
              g = 186 + n1 * 28;
              b = 76 + n2 * 24;
            }
          } else if (zone === 'chateau') {
            // Royal white/rose cream plateau terrace around Chateau
            const dCh = Math.hypot(
              lx - WHOLE_CAKE_CHATEAU_CENTER.x,
              lz - WHOLE_CAKE_CHATEAU_CENTER.z
            );
            r = dCh < 15.5 ? 250 : 244;
            g = dCh < 15.5 ? 236 : 212;
            b = dCh < 15.5 ? 242 : 226;
          } else {
            // Sweet City & Parfait Cape: vivid lime frosting meadows + pink sprinkle paths
            const isStreet =
              Math.abs(lx - 18.0) < 3.4 ||
              Math.abs(lz - 38.0) < 2.6 ||
              Math.abs(lz - 21.5) < 2.4;
            if (isStreet) {
              r = 246;
              g = 212;
              b = 224;
              // Colored candy sprinkles
              if (n2 > 0.72) {
                r = n1 > 0.5 ? 244 : 56;
                g = n1 > 0.5 ? 63 : 189;
                b = n1 > 0.5 ? 94 : 248;
              }
            } else {
              r = 114 + n1 * 48;
              g = 208 + n1 * 34;
              b = 74 + n2 * 28;
            }
          }
        }

        data[idx] = Math.max(0, Math.min(255, Math.round(r)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        data[idx + 3] = a;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Polka-dot frosting cake cylinder texture (pink or apricot wings of Whole Cake Chateau). */
export function createPolkaDotCakeTexture(
  bgHex: string,
  dotHex: string,
  frostingHex = '#fff8fb'
): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, w, h);

    // Polka dots grid
    ctx.fillStyle = dotHex;
    const cols = 12;
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = ((c + (r % 2 === 0 ? 0.25 : 0.75)) / cols) * w;
        const cy = 44 + (r / rows) * (h - 54);
        ctx.beginPath();
        ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Dripping white whipped-cream frosting scallops along top rim
    ctx.fillStyle = frostingHex;
    ctx.fillRect(0, 0, w, 32);
    for (let x = 0; x <= w; x += 32) {
      const dripLen = 22 + ((x * 13) % 28);
      ctx.beginPath();
      ctx.arc(x + 16, 32, 16, 0, Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(x + 10, 26, 12, dripLen, 6);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/** Vertical candy/royal stripes texture (purple-white Chateau dome, pink-white tiers, candles). */
export function createVerticalStripeTexture(
  colorA: string,
  colorB: string,
  stripes = 12,
  frostingBand = false
): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const sw = w / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
      ctx.fillRect(i * sw, 0, sw + 1, h);
    }
    if (frostingBand) {
      ctx.fillStyle = '#fff9fc';
      ctx.fillRect(0, 0, w, 34);
      for (let x = 0; x <= w; x += 32) {
        ctx.beginPath();
        ctx.arc(x + 16, 34, 16, 0, Math.PI);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/** Diagonal candy-cane stripes for Big Mom's giant candles & entrance pillars. */
export function createDiagonalCandyTexture(
  colorA = '#ffffff',
  colorB = '#f43f5e'
): THREE.CanvasTexture {
  const s = 256;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = colorA;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = colorB;
    for (let k = -s; k < s * 2; k += 64) {
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k + 32, 0);
      ctx.lineTo(k + 32 + s, s);
      ctx.lineTo(k + s, s);
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/** Crispy waffle grid texture for ice-cream cone turrets & wafers. */
export function createWaffleConeTexture(): THREE.CanvasTexture {
  const s = 256;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#d99b4e';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#9a5b1d';
    ctx.lineWidth = 4;
    for (let k = -s; k < s * 2; k += 28) {
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k + s, s);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(k + s, 0);
      ctx.lineTo(k, s);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/** Pierced golden Swiss cheese texture with optional "Cheese" hand-lettered sign. */
export function createSwissCheeseTexture(withLabel = false): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fde047');
    grad.addColorStop(1, '#eab308');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const holes = [
      [88, 96, 40],
      [212, 74, 24],
      [386, 112, 46],
      [148, 224, 34],
      [420, 260, 38],
      [96, 384, 32],
      [286, 402, 44],
      [410, 420, 22],
    ];
    for (const [hx, hy, hr] of holes) {
      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(hx + 4, hy + 5, hr * 0.78, 0, Math.PI * 2);
      ctx.fill();
    }

    if (withLabel) {
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 88px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Cheese', w * 0.5, h * 0.52);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Smiling Burger Homie front face texture (reference cheese_island_10a5c363.webp). */
export function createBurgerHomieFaceTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Sesame bun golden tone
    ctx.fillStyle = '#d97706';
    ctx.fillRect(0, 0, w, h);

    // Lettuce & melting cheddar bottom band
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, 178, w, 24);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 200, w, 56);

    // Big white cartoon Homie eyes + grin centered on front face (u ~ 0.5)
    const cx = w * 0.5;
    for (const ex of [cx - 46, cx + 46]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, 84, 24, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(ex, 86, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wide toothy grin
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, 142, 74, 28, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.stroke();
    for (let tx = cx - 50; tx <= cx + 50; tx += 25) {
      ctx.beginPath();
      ctx.moveTo(tx, 142);
      ctx.lineTo(tx, 168);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Fluted cupcake wrapper texture for Funwari Island & pastry sea islets. */
export function createCupcakeWrapperTexture(
  baseHex = '#fde68a',
  ribHex = '#d97706'
): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);
    const flutes = 24;
    const fw = w / flutes;
    for (let i = 0; i < flutes; i++) {
      ctx.fillStyle = i % 2 === 0 ? ribHex : 'rgba(255,255,255,0.22)';
      ctx.fillRect(i * fw, 0, fw * 0.42, h);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/** Cinnamon roll spiral end-cap texture for Funwari Island giant rolls. */
export function createCinnamonSpiralTexture(): THREE.CanvasTexture {
  const s = 256;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 14;
    ctx.beginPath();
    const cx = s * 0.5;
    const cy = s * 0.5;
    for (let a = 0; a < Math.PI * 7.2; a += 0.12) {
      const r = (a / (Math.PI * 7.2)) * (s * 0.44);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
