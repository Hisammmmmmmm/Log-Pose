import * as THREE from 'three';
import {
  BARATIE_FIN_DECK_Y,
  BARATIE_GLOBE_SCALE,
  BARATIE_MAIN_DECK_Y,
  BARATIE_QUARTER_DECK_Y,
  BARATIE_SPHERE_SEA_OFFSET,
  BARATIE_TIER2_DECK_Y,
  BARATIE_TIER3_DECK_Y,
  baratieMainHullHalfWidth,
} from '../utils/baratieTerrain';
import type { IslandMeshContext, IslandMeshInstance } from './types';

const S = BARATIE_GLOBE_SCALE;

function createWoodDeckTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#c89b62';
  ctx.fillRect(0, 0, 512, 512);

  const plankH = 32;
  for (let row = 0; row < 512 / plankH; row++) {
    const y = row * plankH;
    const toneShift = ((row * 37) % 19) - 9;
    ctx.fillStyle = `rgb(${202 + toneShift}, ${156 + Math.round(toneShift * 0.8)}, ${98 + Math.round(toneShift * 0.6)})`;
    ctx.fillRect(0, y + 1, 512, plankH - 2);

    // Subtle wood grain lines
    ctx.fillStyle = 'rgba(92, 56, 24, 0.10)';
    for (let g = 0; g < 4; g++) {
      ctx.fillRect(0, y + 5 + g * 6, 512, 1);
    }

    // Plank horizontal seam
    ctx.fillStyle = '#5c3c1e';
    ctx.fillRect(0, y, 512, 2);

    // Staggered butt joints
    const offset = (row % 3) * 168 + 40;
    for (let x = offset; x < 512; x += 256) {
      ctx.fillRect(x % 512, y, 2, plankH);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createRedHullPlankTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#c44b37';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 32) {
    const shift = ((y * 13) % 15) - 7;
    ctx.fillStyle = `rgb(${196 + shift}, ${75 + Math.round(shift * 0.5)}, ${55 + Math.round(shift * 0.4)})`;
    ctx.fillRect(0, y + 2, 256, 28);
    ctx.fillStyle = 'rgba(58, 18, 12, 0.35)';
    ctx.fillRect(0, y, 256, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

function createMintWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#7fcf9f';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 24) {
    const shift = ((y * 11) % 9) - 4;
    ctx.fillStyle = `rgb(${124 + shift}, ${207 + shift}, ${159 + shift})`;
    ctx.fillRect(0, y + 1, 256, 22);
    ctx.fillStyle = 'rgba(32, 92, 62, 0.14)';
    ctx.fillRect(0, y, 256, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

function createTerracottaRoofTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#d36f5a';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 22) {
    ctx.fillStyle = 'rgba(72, 24, 16, 0.22)';
    ctx.fillRect(0, y, 256, 2);
    for (let x = (y % 44 === 0 ? 0 : 16); x < 256; x += 32) {
      ctx.fillStyle = 'rgba(72, 24, 16, 0.11)';
      ctx.fillRect(x, y, 2, 22);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createBaratieSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 128);

  // Top & bottom dark-wood cornice borders
  ctx.fillStyle = '#472c18';
  ctx.fillRect(0, 0, 512, 12);
  ctx.fillRect(0, 116, 512, 12);

  // Subtle decorative inner rule
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 18, 492, 92);

  // Crisp BARATIE lettering
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 68px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('B A R A T I E', 256, 66);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRestaurantGableTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Mint green planked background
  ctx.fillStyle = '#7fcf9f';
  ctx.fillRect(0, 0, 512, 256);

  for (let y = 0; y < 256; y += 22) {
    ctx.fillStyle = 'rgba(30, 86, 58, 0.13)';
    ctx.fillRect(0, y, 512, 2);
  }

  // White scalloped roof-eave valance along top edge (matching Image 1)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 18);
  const scallops = 11;
  const r = 512 / (scallops * 2);
  for (let i = 0; i < scallops; i++) {
    ctx.beginPath();
    ctx.arc(r + i * r * 2, 18, r * 0.92, 0, Math.PI);
    ctx.fill();
  }
  ctx.strokeStyle = '#472c18';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 18);
  for (let i = 0; i < scallops; i++) {
    ctx.arc(r + i * r * 2, 18, r * 0.92, Math.PI, 0, true);
  }
  ctx.stroke();

  // Crisp RESTAURANT title across upper gable
  ctx.fillStyle = '#1b3529';
  ctx.font = 'bold 50px "Trebuchet MS", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RESTAURANT', 256, 86);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStripedSailTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const stripes = 14;
  const w = 512 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#f3b21c' : '#fcf9ee';
    ctx.fillRect(i * w, 0, Math.ceil(w) + 1, 256);
  }

  // Subtle stitched horizontal canvas seams
  ctx.fillStyle = 'rgba(92, 64, 24, 0.14)';
  for (let y = 48; y < 256; y += 52) {
    ctx.fillRect(0, y, 512, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBaratieFlagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#c82825';
  ctx.fillRect(0, 0, 256, 128);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 248, 120);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 74px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('B', 96, 66);

  // Small crossed fork/knife crest silhouette next to B
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(156, 36);
  ctx.lineTo(206, 92);
  ctx.moveTo(206, 36);
  ctx.lineTo(156, 92);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWindowLatticeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createLinearGradient(0, 0, 0, 160);
  grad.addColorStop(0, '#7eb4db');
  grad.addColorStop(1, '#39658a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 160);

  // Crisp diagonal diamond criss-cross muntins (Image 1)
  ctx.strokeStyle = '#1e2c3a';
  ctx.lineWidth = 5;
  for (let offset = -160; offset <= 288; offset += 32) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + 160, 160);
    ctx.moveTo(offset + 160, 0);
    ctx.lineTo(offset, 160);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStadiumShape(halfLen: number, halfWidth: number): THREE.Shape {
  const straight = Math.max(0.2, halfLen - halfWidth);
  const shape = new THREE.Shape();
  shape.moveTo(-straight, -halfWidth);
  shape.lineTo(straight, -halfWidth);
  shape.absarc(straight, 0, halfWidth, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(-straight, halfWidth);
  shape.absarc(-straight, 0, halfWidth, Math.PI / 2, (Math.PI * 3) / 2, false);
  return shape;
}

function createBattleFinShape(sideSign: 1 | -1): THREE.Shape {
  const shape = new THREE.Shape();
  const zInner = 7.45 * sideSign;
  const cx = 0.4;
  const rx = 14.6;
  const steps = 32;

  if (sideSign > 0) {
    shape.moveTo(-14.2, zInner);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = -14.2 + t * 29.2;
      const nx = Math.max(-0.999, Math.min(0.999, (x - cx) / rx));
      const zOut = 7.6 + 11.9 * Math.sqrt(Math.max(0, 1 - nx * nx));
      shape.lineTo(x, zOut);
    }
    shape.lineTo(15.0, zInner);
    shape.closePath();
  } else {
    shape.moveTo(15.0, zInner);
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const x = -14.2 + t * 29.2;
      const nx = Math.max(-0.999, Math.min(0.999, (x - cx) / rx));
      const zOut = -(7.6 + 11.9 * Math.sqrt(Math.max(0, 1 - nx * nx)));
      shape.lineTo(x, zOut);
    }
    shape.lineTo(-14.2, zInner);
    shape.closePath();
  }
  return shape;
}

function createBillowingSailGeo(
  width: number,
  height: number,
  bellyDepth: number
): THREE.BufferGeometry {
  const segX = 16;
  const segY = 12;
  const geo = new THREE.PlaneGeometry(width, height, segX, segY);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const ly = pos.getY(i);
    const nx = lx / (width * 0.5);
    const ny = ly / (height * 0.5);
    const curve =
      Math.cos(nx * Math.PI * 0.45) *
      Math.cos(ny * Math.PI * 0.48) *
      bellyDepth;
    // Slight billow forward (-X in mast local) & curve
    pos.setZ(i, curve);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance | null {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const regTex = <T extends THREE.Texture>(t: T): T =>
    trackTex ? trackTex(t) : t;

  const group = new THREE.Group();
  group.name = 'island-baratie';

  // Unified ship container anchored at Baratie ocean level (BARATIE_SPHERE_SEA_OFFSET)
  const shipRoot = new THREE.Group();
  shipRoot.position.set(0, BARATIE_SPHERE_SEA_OFFSET * S, 0);
  shipRoot.scale.setScalar(S);
  group.add(shipRoot);

  // Procedural CanvasTextures
  const woodDeckTex = regTex(createWoodDeckTexture());
  const redHullTex = regTex(createRedHullPlankTexture());
  const mintWallTex = regTex(createMintWallTexture());
  const roofTex = regTex(createTerracottaRoofTexture());
  const baratieSignTex = regTex(createBaratieSignTexture());
  const restaurantGableTex = regTex(createRestaurantGableTexture());
  const stripedSailTex = regTex(createStripedSailTexture());
  const flagTex = regTex(createBaratieFlagTexture());
  const windowLatticeTex = regTex(createWindowLatticeTexture());

  // Calibrated PBR Materials (distinct roughness/metalness contrast between adjacent parts)
  const woodDeckMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: woodDeckTex,
      roughness: 0.78,
      metalness: 0.04,
    })
  );
  const redHullMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: redHullTex,
      roughness: 0.68,
      metalness: 0.06,
    })
  );
  const darkTimberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4b2f1a,
      roughness: 0.84,
      metalness: 0.04,
    })
  );
  const warmTimberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x875429,
      roughness: 0.78,
      metalness: 0.04,
    })
  );
  const mintWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: mintWallTex,
      roughness: 0.66,
      metalness: 0.03,
    })
  );
  const mintFlutedMastMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7dcf9e,
      roughness: 0.62,
      metalness: 0.06,
    })
  );
  const roofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: roofTex,
      roughness: 0.74,
      metalness: 0.04,
    })
  );
  const slateCapMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd0d6de,
      roughness: 0.68,
      metalness: 0.08,
    })
  );
  const whiteTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.56,
      metalness: 0.04,
    })
  );
  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe3b43b,
      roughness: 0.28,
      metalness: 0.72,
    })
  );
  const ropeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd1b179,
      roughness: 0.92,
      metalness: 0.0,
    })
  );
  const fishWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf5f7fa,
      roughness: 0.44,
      metalness: 0.04,
    })
  );
  const fishOrangeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe98a24,
      roughness: 0.46,
      metalness: 0.05,
    })
  );
  const darkMouthMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x151a24,
      roughness: 0.92,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );
  const ironMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x222731,
      roughness: 0.36,
      metalness: 0.78,
    })
  );
  const crimsonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc92c27,
      roughness: 0.56,
      metalness: 0.06,
    })
  );
  const windowGlassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: windowLatticeTex,
      roughness: 0.22,
      metalness: 0.14,
    })
  );
  const baratieSignMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: baratieSignTex,
      roughness: 0.58,
      metalness: 0.04,
    })
  );
  const restaurantGableMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: restaurantGableTex,
      roughness: 0.64,
      metalness: 0.03,
    })
  );
  const sailMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: stripedSailTex,
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );
  const flagMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: flagTex,
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );
  const lanternGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfff3c4,
      emissive: 0xffa732,
      emissiveIntensity: 1.4,
      roughness: 0.3,
    })
  );
  const wakeFoamMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xeef8ff,
      roughness: 0.35,
      metalness: 0.02,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const smokeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
    })
  );

  // Shared primitives
  const unitBox = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const unitCyl = trackGeo(new THREE.CylinderGeometry(1, 1, 1, 16));
  const unitSphere = trackGeo(new THREE.SphereGeometry(1, 16, 12));

  // Helper to build a crisp 3D arched lattice window
  const createArchedWindow = (
    w = 1.25,
    h = 1.8,
    frameMat: THREE.Material = whiteTrimMat
  ): THREE.Group => {
    const win = new THREE.Group();
    const rectH = h - w * 0.5;
    // Recessed glass pane (rect + top semicircle)
    const glassRect = new THREE.Mesh(unitBox, windowGlassMat);
    glassRect.scale.set(w * 0.82, rectH, 0.14);
    glassRect.position.y = rectH * 0.5;
    const glassArch = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(w * 0.41, w * 0.41, 0.14, 14, 1, false, 0, Math.PI)),
      windowGlassMat
    );
    glassArch.rotation.x = Math.PI * 0.5;
    glassArch.rotation.y = Math.PI * 0.5;
    glassArch.position.y = rectH;

    // 3D outer frame arch + pillars + sill
    const sill = new THREE.Mesh(unitBox, frameMat);
    sill.scale.set(w * 1.15, 0.18, 0.32);
    sill.position.y = 0.04;
    for (const sx of [-w * 0.46, w * 0.46]) {
      const jamb = new THREE.Mesh(unitBox, frameMat);
      jamb.scale.set(0.16, rectH, 0.24);
      jamb.position.set(sx, rectH * 0.5, 0.03);
      win.add(jamb);
    }
    const archRim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(w * 0.46, 0.09, 8, 16, Math.PI)),
      frameMat
    );
    archRim.position.set(0, rectH, 0.04);

    win.add(glassRect, glassArch, sill, archRim);
    return win;
  };

  // Helper to build a dark-wood X-cross railing segment between (x0, z0) and (x1, z1)
  const addXCrossRailingPath = (
    parent: THREE.Group,
    pts: readonly [number, number][],
    yBase: number,
    height = 0.96,
    closed = true
  ) => {
    const railGroup = new THREE.Group();
    const count = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < count; i++) {
      const [x0, z0] = pts[i];
      const [x1, z1] = pts[(i + 1) % pts.length];
      const dx = x1 - x0;
      const dz = z1 - z0;
      const segLen = Math.hypot(dx, dz);
      if (segLen < 0.15) continue;
      const yaw = -Math.atan2(dz, dx);
      const midX = (x0 + x1) * 0.5;
      const midZ = (z0 + z1) * 0.5;

      // Top & bottom horizontal rails
      const topRail = new THREE.Mesh(unitBox, darkTimberMat);
      topRail.scale.set(segLen + 0.06, 0.11, 0.12);
      topRail.position.set(midX, yBase + height, midZ);
      topRail.rotation.y = yaw;

      const botRail = new THREE.Mesh(unitBox, darkTimberMat);
      botRail.scale.set(segLen + 0.06, 0.1, 0.12);
      botRail.position.set(midX, yBase + 0.1, midZ);
      botRail.rotation.y = yaw;

      // Vertical post at start vertex
      const post = new THREE.Mesh(unitBox, darkTimberMat);
      post.scale.set(0.14, height + 0.12, 0.14);
      post.position.set(x0, yBase + height * 0.5 + 0.04, z0);
      railGroup.add(topRail, botRail, post);

      // Subdivide long spans into ~1.55m X-cross bays
      const bays = Math.max(1, Math.round(segLen / 1.55));
      const bayLen = segLen / bays;
      const diagLen = Math.hypot(bayLen * 0.92, height - 0.18);
      const diagAngle = Math.atan2(height - 0.18, bayLen * 0.92);

      for (let b = 0; b < bays; b++) {
        const bt = (b + 0.5) / bays;
        const bx = x0 + dx * bt;
        const bz = z0 + dz * bt;
        const bayHolder = new THREE.Group();
        bayHolder.position.set(bx, yBase + height * 0.5 + 0.05, bz);
        bayHolder.rotation.y = yaw;

        const d1 = new THREE.Mesh(unitBox, darkTimberMat);
        d1.scale.set(diagLen, 0.075, 0.07);
        d1.rotation.z = diagAngle;

        const d2 = new THREE.Mesh(unitBox, darkTimberMat);
        d2.scale.set(diagLen, 0.075, 0.07);
        d2.rotation.z = -diagAngle;

        bayHolder.add(d1, d2);
        railGroup.add(bayHolder);

        if (b > 0) {
          const midPost = new THREE.Mesh(unitBox, darkTimberMat);
          midPost.scale.set(0.11, height + 0.06, 0.11);
          const pt = b / bays;
          midPost.position.set(x0 + dx * pt, yBase + height * 0.5 + 0.02, z0 + dz * pt);
          railGroup.add(midPost);
        }
      }
    }
    if (!closed && pts.length > 0) {
      const [lx, lz] = pts[pts.length - 1];
      const endPost = new THREE.Mesh(unitBox, darkTimberMat);
      endPost.scale.set(0.14, height + 0.12, 0.14);
      endPost.position.set(lx, yBase + height * 0.5 + 0.04, lz);
      railGroup.add(endPost);
    }
    parent.add(railGroup);
  };

  const applyPlanarDeckUVs = (geo: THREE.BufferGeometry, tileMeters = 7.5) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    if (!pos || !uv) return;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / tileMeters, pos.getZ(i) / tileMeters);
    }
    uv.needsUpdate = true;
  };

  // =========================================================================
  // 1. MAIN SHIP HULL & SUBMERGED KEEL + WATERLINE FOAM COLLAR
  // =========================================================================
  const hullShape = new THREE.Shape();
  const hullSamples = 36;
  hullShape.moveTo(-14.8, 0);
  for (let i = 1; i <= hullSamples; i++) {
    const x = -14.8 + (i / hullSamples) * 30.8;
    const hw = baratieMainHullHalfWidth(x);
    hullShape.lineTo(x, hw);
  }
  for (let i = hullSamples - 1; i >= 0; i--) {
    const x = -14.8 + (i / hullSamples) * 30.8;
    const hw = baratieMainHullHalfWidth(x);
    hullShape.lineTo(x, -hw);
  }
  hullShape.closePath();

  const hullGeo = trackGeo(
    new THREE.ExtrudeGeometry(hullShape, {
      depth: 3.05,
      bevelEnabled: true,
      bevelThickness: 0.22,
      bevelSize: 0.2,
      bevelSegments: 2,
    })
  );
  hullGeo.rotateX(Math.PI * 0.5);
  hullGeo.translate(0, BARATIE_MAIN_DECK_Y - 0.14, 0);
  const hullMesh = new THREE.Mesh(hullGeo, redHullMat);
  shipRoot.add(hullMesh);

  // Main wooden promenade deck surface (clearly proud above hull top)
  const mainDeckGeo = trackGeo(
    new THREE.ExtrudeGeometry(hullShape, {
      depth: 0.14,
      bevelEnabled: false,
    })
  );
  mainDeckGeo.rotateX(Math.PI * 0.5);
  mainDeckGeo.translate(0, BARATIE_MAIN_DECK_Y + 0.12, 0);
  mainDeckGeo.scale(0.975, 1, 0.965);
  applyPlanarDeckUVs(mainDeckGeo, 8.0);
  const mainDeckMesh = new THREE.Mesh(mainDeckGeo, woodDeckMat);
  shipRoot.add(mainDeckMesh);

  // Main deck perimeter X-cross railings (leaving gap at main entrance x in [-0.2, 3.4], z > 6.5)
  const sampleHullArc = (
    xStart: number,
    xEnd: number,
    zSign: 1 | -1,
    steps = 12
  ): [number, number][] => {
    const out: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const x = xStart + (i / steps) * (xEnd - xStart);
      out.push([x, zSign * Math.max(1.2, baratieMainHullHalfWidth(x) - 0.3)]);
    }
    return out;
  };
  // Port side continuous railing + Starboard split around entrance gangway
  addXCrossRailingPath(
    shipRoot,
    [
      ...sampleHullArc(-13.8, 14.5, -1, 14),
      ...sampleHullArc(14.5, 3.6, 1, 7),
    ],
    BARATIE_MAIN_DECK_Y,
    0.94,
    false
  );
  addXCrossRailingPath(
    shipRoot,
    sampleHullArc(-0.3, -13.8, 1, 8),
    BARATIE_MAIN_DECK_Y,
    0.94,
    false
  );

  // Tight, delicate hull-hugging sea-foam waterline trim (no wide floating rings)
  const wakeRings: THREE.Mesh[] = [];
  const bowFoamGeo = trackGeo(new THREE.RingGeometry(4.3, 5.05, 28));
  bowFoamGeo.rotateX(-Math.PI / 2);
  bowFoamGeo.scale(1.45, 1, 1.08);
  const bowFoam = new THREE.Mesh(bowFoamGeo, wakeFoamMat);
  bowFoam.position.set(-18.2, 0.05, 0);
  shipRoot.add(bowFoam);
  wakeRings.push(bowFoam);

  // =========================================================================
  // 2. DEPLOYED CURVED WOODEN BATTLE FINS (STARBOARD +Z & PORT -Z)
  // =========================================================================
  for (const sideSign of [1, -1] as const) {
    const finShape = createBattleFinShape(sideSign);

    // Outer red hull rim & submerged pontoon base (top sits BELOW fin wood deck)
    const finHullGeo = trackGeo(
      new THREE.ExtrudeGeometry(finShape, {
        depth: 2.25,
        bevelEnabled: true,
        bevelThickness: 0.14,
        bevelSize: 0.22,
        bevelSegments: 2,
      })
    );
    finHullGeo.rotateX(Math.PI * 0.5);
    finHullGeo.translate(0, BARATIE_FIN_DECK_Y - 0.12, 0);
    const finHull = new THREE.Mesh(finHullGeo, redHullMat);
    shipRoot.add(finHull);

    // Warm honey-tan wood-planked battle fin deck surface (proud above red pontoon base)
    const finDeckGeo = trackGeo(
      new THREE.ExtrudeGeometry(finShape, {
        depth: 0.24,
        bevelEnabled: false,
      })
    );
    finDeckGeo.rotateX(Math.PI * 0.5);
    finDeckGeo.translate(0, BARATIE_FIN_DECK_Y + 0.18, 0);
    applyPlanarDeckUVs(finDeckGeo, 8.5);
    const finDeck = new THREE.Mesh(finDeckGeo, woodDeckMat);
    shipRoot.add(finDeck);

    // Raised terracotta-red outer gunwale rim hugging the curved edge of each battle fin
    const rimPts: THREE.Vector3[] = [];
    const rimSteps = 28;
    for (let i = 0; i <= rimSteps; i++) {
      const t = i / rimSteps;
      const rx = -14.2 + t * 29.2;
      const nx = Math.max(-0.999, Math.min(0.999, (rx - 0.4) / 14.6));
      const rz = sideSign * (7.6 + 11.9 * Math.sqrt(Math.max(0, 1 - nx * nx)));
      rimPts.push(new THREE.Vector3(rx, BARATIE_FIN_DECK_Y + 0.24, rz));
    }
    const rimCurve = new THREE.CatmullRomCurve3(rimPts);
    const finRimGeo = trackGeo(
      new THREE.TubeGeometry(rimCurve, 32, 0.2, 8, false)
    );
    shipRoot.add(new THREE.Mesh(finRimGeo, redHullMat));

    // Compact hinged red-and-gold cheek/gill wing door behind the fish collar (Image 2!)
    const gillDoor = new THREE.Group();
    const gdBody = new THREE.Mesh(unitBox, crimsonMat);
    gdBody.scale.set(2.2, 1.85, 0.34);
    const gdRim = new THREE.Mesh(unitBox, goldMat);
    gdRim.scale.set(2.4, 0.26, 0.42);
    gdRim.position.y = 0.98;
    const gdKnob = new THREE.Mesh(unitSphere, goldMat);
    gdKnob.scale.setScalar(0.18);
    gdKnob.position.set(0.65, -0.1, sideSign * 0.21);
    gillDoor.add(gdBody, gdRim, gdKnob);
    gillDoor.position.set(-14.3, 1.48, sideSign * 6.0);
    gillDoor.rotation.y = sideSign * 0.28;
    shipRoot.add(gillDoor);
  }

  // Painted white rectangular welcome mat & wooden gangway steps on Starboard fin (Image 1 & 2)
  const matBorder = new THREE.Mesh(unitBox, whiteTrimMat);
  matBorder.scale.set(4.0, 0.05, 3.1);
  matBorder.position.set(1.6, BARATIE_FIN_DECK_Y + 0.22, 9.8);
  const matInner = new THREE.Mesh(unitBox, woodDeckMat);
  matInner.scale.set(3.45, 0.06, 2.55);
  matInner.position.set(1.6, BARATIE_FIN_DECK_Y + 0.225, 9.8);
  shipRoot.add(matBorder, matInner);

  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(unitBox, warmTimberMat);
    step.scale.set(3.2, 0.22, 0.65);
    step.position.set(1.6, BARATIE_FIN_DECK_Y + 0.16 + s * 0.16, 8.3 - s * 0.48);
    shipRoot.add(step);
  }

  // =========================================================================
  // 3. GIANT SABAGASHIRA-1 FISH HEAD BOW (x = -13.6 to -26.8)
  // =========================================================================
  const fishGroup = new THREE.Group();
  shipRoot.add(fishGroup);

  // Wooden plank bow bulkhead + coiled ropes (Image 1)
  const bowBulkhead = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(4.45, 4.75, 2.6, 20)),
    warmTimberMat
  );
  bowBulkhead.rotation.z = Math.PI * 0.5;
  bowBulkhead.scale.set(0.88, 1, 1.05);
  bowBulkhead.position.set(-13.4, 2.35, 0);
  fishGroup.add(bowBulkhead);

  for (const rz of [-4.5, 4.5]) {
    const brassRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.32, 0.07, 8, 14)),
      goldMat
    );
    brassRing.position.set(-13.6, 2.35, rz);
    const ropeHang = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 1.6, 8)),
      ropeMat
    );
    ropeHang.position.set(-13.6, 1.55, rz);
    fishGroup.add(brassRing, ropeHang);
  }

  // 3 stacked golden-ochre ribbed neck collar bands (Image 1 & 2)
  for (let c = 0; c < 3; c++) {
    const collar = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(4.25 - c * 0.08, 0.42, 12, 28)),
      goldMat
    );
    collar.rotation.y = Math.PI * 0.5;
    collar.scale.set(0.95, 1.08, 1);
    collar.position.set(-14.5 - c * 0.52, 2.65, 0);
    fishGroup.add(collar);
  }

  // Truly hollow Sabagashira-1 white cranium shell (open mouth pole faces forward -X!)
  const headOuterGeo = trackGeo(
    new THREE.SphereGeometry(1, 28, 20, 0, Math.PI * 2, 0.66, Math.PI - 0.66)
  );
  const headOuter = new THREE.Mesh(headOuterGeo, fishWhiteMat);
  headOuter.position.set(-18.3, 3.0, 0);
  headOuter.rotation.z = Math.PI * 0.5 - 0.14;
  headOuter.scale.set(4.15, 5.35, 4.25);
  fishGroup.add(headOuter);

  // Dark inner mouth lining shell + deep throat bulkhead (gives real depth inside the open mouth!)
  const headInnerMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x121721,
      roughness: 0.94,
      metalness: 0.02,
      side: THREE.BackSide,
    })
  );
  const headInner = new THREE.Mesh(headOuterGeo, headInnerMat);
  headInner.position.set(-18.3, 3.0, 0);
  headInner.rotation.z = Math.PI * 0.5 - 0.14;
  headInner.scale.set(3.85, 5.15, 3.95);
  fishGroup.add(headInner);

  const throatBack = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(3.55, 22)),
    darkMouthMat
  );
  throatBack.rotation.y = -Math.PI * 0.5;
  throatBack.position.set(-18.2, 2.8, 0);
  fishGroup.add(throatBack);

  // Iconic wide-open Orange Upper Lip Arch & Protruding Lower Lip (Image 1 & 2)
  const upperLipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-21.35, 1.62, -2.95),
    new THREE.Vector3(-22.15, 3.85, -3.12),
    new THREE.Vector3(-22.55, 5.7, -1.92),
    new THREE.Vector3(-22.8, 6.42, 0),
    new THREE.Vector3(-22.55, 5.7, 1.92),
    new THREE.Vector3(-22.15, 3.85, 3.12),
    new THREE.Vector3(-21.35, 1.62, 2.95),
  ]);
  const upperLipGeo = trackGeo(
    new THREE.TubeGeometry(upperLipCurve, 32, 0.62, 12, false)
  );
  const upperLip = new THREE.Mesh(upperLipGeo, fishOrangeMat);
  fishGroup.add(upperLip);

  // Protruding curved orange lower lip/tongue-lip meeting upper lip at both jaw corners
  const lowerLipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-21.35, 1.62, -2.95),
    new THREE.Vector3(-24.45, 0.98, -2.35),
    new THREE.Vector3(-26.55, 1.38, 0),
    new THREE.Vector3(-24.45, 0.98, 2.35),
    new THREE.Vector3(-21.35, 1.62, 2.95),
  ]);
  const lowerLipGeo = trackGeo(
    new THREE.TubeGeometry(lowerLipCurve, 28, 0.56, 12, false)
  );
  const lowerLip = new THREE.Mesh(lowerLipGeo, fishOrangeMat);
  fishGroup.add(lowerLip);

  for (const sideSign of [1, -1] as const) {
    const cornerCap = new THREE.Mesh(unitSphere, fishOrangeMat);
    cornerCap.scale.set(0.64, 0.64, 0.64);
    cornerCap.position.set(-21.35, 1.62, sideSign * 2.95);
    fishGroup.add(cornerCap);
  }

  const lowerFloorLip = new THREE.Mesh(unitSphere, darkMouthMat);
  lowerFloorLip.scale.set(3.2, 0.36, 2.7);
  lowerFloorLip.position.set(-22.25, 1.24, 0);
  fishGroup.add(lowerFloorLip);

  // 3 Naval Cannons clearly visible inside the dark open fish mouth (Image 2!)
  const cannonOffsets: readonly [number, number, number][] = [
    [-21.2, 2.85, -1.3],
    [-21.2, 2.85, 1.3],
    [-21.9, 1.9, 0],
  ];
  for (const [cx, cy, cz] of cannonOffsets) {
    const cannon = new THREE.Group();
    const barrel = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.36, 0.48, 3.6, 14)),
      ironMat
    );
    barrel.rotation.z = Math.PI * 0.5;
    const muzzleRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.4, 0.09, 8, 16)),
      goldMat
    );
    muzzleRing.rotation.y = Math.PI * 0.5;
    muzzleRing.position.x = -1.75;
    const carriage = new THREE.Mesh(unitBox, warmTimberMat);
    carriage.scale.set(1.9, 0.56, 0.82);
    carriage.position.set(0.45, -0.38, 0);
    cannon.add(barrel, muzzleRing, carriage);
    cannon.position.set(cx, cy, cz);
    cannon.rotation.z = -0.06;
    fishGroup.add(cannon);
  }

  // Expressive round black-and-white fish eyes cleanly proud on both cheeks (Image 1 & 2)
  for (const sideSign of [1, -1] as const) {
    const eyeGroup = new THREE.Group();
    const rim = new THREE.Mesh(unitCyl, darkMouthMat);
    rim.scale.set(0.95, 0.16, 0.95);
    const sclera = new THREE.Mesh(unitCyl, fishWhiteMat);
    sclera.scale.set(0.78, 0.22, 0.78);
    const pupil = new THREE.Mesh(unitCyl, darkMouthMat);
    pupil.scale.set(0.42, 0.28, 0.42);
    eyeGroup.add(rim, sclera, pupil);
    eyeGroup.position.set(-18.6, 4.25, sideSign * 4.18);
    eyeGroup.rotation.x = sideSign * (Math.PI * 0.5 - 0.34);
    eyeGroup.rotation.z = -0.14;
    fishGroup.add(eyeGroup);
  }

  // =========================================================================
  // 4. TIER 1: GROUND DINING HALL, GOLDEN ARCH ENTRANCE & LATTICE WINDOWS
  // =========================================================================
  const tier1Shape = createStadiumShape(11.6, 6.65);
  const tier1Geo = trackGeo(
    new THREE.ExtrudeGeometry(tier1Shape, {
      depth: 3.72,
      bevelEnabled: false,
      curveSegments: 24,
    })
  );
  tier1Geo.rotateX(Math.PI * 0.5);
  tier1Geo.translate(0, BARATIE_TIER2_DECK_Y - 0.05, 0);
  const tier1Walls = new THREE.Mesh(tier1Geo, mintWallMat);
  shipRoot.add(tier1Walls);

  // Dark timber plinth & cornice trim separating Tier 1 and Tier 2
  const tier1PlinthGeo = trackGeo(
    new THREE.ExtrudeGeometry(createStadiumShape(11.72, 6.75), {
      depth: 0.28,
      bevelEnabled: false,
      curveSegments: 24,
    })
  );
  tier1PlinthGeo.rotateX(Math.PI * 0.5);
  tier1PlinthGeo.translate(0, BARATIE_MAIN_DECK_Y + 0.3, 0);
  shipRoot.add(new THREE.Mesh(tier1PlinthGeo, darkTimberMat));

  // Tier 1 Arched Windows (Starboard & Port)
  const tier1WinXStarboard = [-7.8, -4.6, -1.6, 5.2, 8.2];
  for (const wx of tier1WinXStarboard) {
    const win = createArchedWindow(1.22, 1.75);
    win.position.set(wx, BARATIE_MAIN_DECK_Y + 1.15, 6.66);
    shipRoot.add(win);
  }
  const tier1WinXPort = [-7.8, -4.6, -1.4, 1.8, 5.0, 8.2];
  for (const wx of tier1WinXPort) {
    const win = createArchedWindow(1.22, 1.75);
    win.position.set(wx, BARATIE_MAIN_DECK_Y + 1.15, -6.66);
    win.rotation.y = Math.PI;
    shipRoot.add(win);
  }

  // Round brass porthole beside main entrance (Image 1!)
  const porthole = new THREE.Group();
  const phRim = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.44, 0.09, 8, 18)),
    whiteTrimMat
  );
  const phGlass = new THREE.Mesh(unitCyl, windowGlassMat);
  phGlass.rotation.x = Math.PI * 0.5;
  phGlass.scale.set(0.38, 0.14, 0.38);
  porthole.add(phRim, phGlass);
  porthole.position.set(-0.15, BARATIE_MAIN_DECK_Y + 1.82, 6.7);
  shipRoot.add(porthole);

  // Golden Arched Main Entrance Portal on Starboard (x = 1.6, z = 6.68, Image 1 & 2!)
  const entrance = new THREE.Group();
  entrance.position.set(1.6, BARATIE_MAIN_DECK_Y, 6.68);
  const doorBacking = new THREE.Mesh(unitBox, darkTimberMat);
  doorBacking.scale.set(2.55, 2.75, 0.32);
  doorBacking.position.set(0, 1.38, -0.04);
  const doorLeft = new THREE.Mesh(unitBox, warmTimberMat);
  doorLeft.scale.set(1.06, 2.45, 0.14);
  doorLeft.position.set(-0.56, 1.24, 0.1);
  const doorRight = new THREE.Mesh(unitBox, warmTimberMat);
  doorRight.scale.set(1.06, 2.45, 0.14);
  doorRight.position.set(0.56, 1.24, 0.1);
  const doorTrimTop = new THREE.Mesh(unitBox, goldMat);
  doorTrimTop.scale.set(2.45, 0.18, 0.26);
  doorTrimTop.position.set(0, 2.52, 0.12);

  // Prominent protruding Golden Semicircular Arch Portal (Image 1 & 2)
  for (const ax of [-1.42, 1.42]) {
    const pillar = new THREE.Mesh(unitBox, goldMat);
    pillar.scale.set(0.32, 2.55, 0.72);
    pillar.position.set(ax, 1.28, 0.35);
    const lantern = new THREE.Mesh(unitBox, lanternGlowMat);
    lantern.scale.set(0.24, 0.34, 0.24);
    lantern.position.set(ax * 1.15, 2.15, 0.72);
    entrance.add(pillar, lantern);
  }
  const archPortal = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(1.42, 0.22, 10, 24, Math.PI)),
    goldMat
  );
  archPortal.position.set(0, 2.52, 0.42);
  archPortal.scale.set(1, 1.15, 1.45);
  entrance.add(doorBacking, doorLeft, doorRight, doorTrimTop, archPortal);
  shipRoot.add(entrance);

  // Lower bow utility door on starboard flank (Image 1 left)
  const utilityDoor = new THREE.Mesh(unitBox, warmTimberMat);
  utilityDoor.scale.set(1.45, 2.05, 0.22);
  utilityDoor.position.set(-10.1, BARATIE_MAIN_DECK_Y + 1.02, 4.95);
  utilityDoor.rotation.y = -0.58;
  shipRoot.add(utilityDoor);

  // =========================================================================
  // 5. TIER 2: PROMENADE BALCONY, BARATIE WHITE FASCIA & LIFE BUOYS
  // =========================================================================
  const tier2DeckShape = createStadiumShape(11.8, 6.85);
  const tier2DeckGeo = trackGeo(
    new THREE.ExtrudeGeometry(tier2DeckShape, {
      depth: 0.24,
      bevelEnabled: false,
      curveSegments: 24,
    })
  );
  tier2DeckGeo.rotateX(Math.PI * 0.5);
  tier2DeckGeo.translate(0, BARATIE_TIER2_DECK_Y, 0);
  shipRoot.add(new THREE.Mesh(tier2DeckGeo, woodDeckMat));

  // Tier 2 dark-wood X-cross balcony railing all around perimeter
  const buildStadiumRailingPts = (
    halfLen: number,
    halfW: number,
    arcSegs = 8
  ): [number, number][] => {
    const straight = Math.max(0.2, halfLen - halfW);
    const pts: [number, number][] = [];
    for (let i = 0; i <= arcSegs; i++) {
      const a = -Math.PI / 2 + (i / arcSegs) * Math.PI;
      pts.push([straight + Math.cos(a) * halfW, Math.sin(a) * halfW]);
    }
    for (let i = 0; i <= arcSegs; i++) {
      const a = Math.PI / 2 + (i / arcSegs) * Math.PI;
      pts.push([-straight + Math.cos(a) * halfW, Math.sin(a) * halfW]);
    }
    return pts;
  };
  addXCrossRailingPath(
    shipRoot,
    buildStadiumRailingPts(11.55, 6.62, 8),
    BARATIE_TIER2_DECK_Y,
    0.94,
    true
  );

  // Tier 2 inset cabin (mint green lower walls + crisp white BARATIE upper fascia)
  const tier2WallShape = createStadiumShape(9.8, 5.1);
  const tier2MintGeo = trackGeo(
    new THREE.ExtrudeGeometry(tier2WallShape, {
      depth: 2.25,
      bevelEnabled: false,
      curveSegments: 24,
    })
  );
  tier2MintGeo.rotateX(Math.PI * 0.5);
  tier2MintGeo.translate(0, BARATIE_TIER2_DECK_Y + 2.25, 0);
  shipRoot.add(new THREE.Mesh(tier2MintGeo, mintWallMat));

  // Crisp White Upper Fascia Band (Image 1 & 2!)
  const tier2WhiteGeo = trackGeo(
    new THREE.ExtrudeGeometry(createStadiumShape(9.92, 5.2), {
      depth: 1.5,
      bevelEnabled: false,
      curveSegments: 24,
    })
  );
  tier2WhiteGeo.rotateX(Math.PI * 0.5);
  tier2WhiteGeo.translate(0, BARATIE_TIER3_DECK_Y, 0);
  shipRoot.add(new THREE.Mesh(tier2WhiteGeo, whiteTrimMat));

  // Crisp "BARATIE" signboards + 3D red-and-white Life Buoys on both broadsides!
  for (const sideSign of [1, -1] as const) {
    const signBoard = new THREE.Mesh(unitBox, baratieSignMat);
    signBoard.scale.set(7.6, 1.32, 0.14);
    signBoard.position.set(0, BARATIE_TIER2_DECK_Y + 2.98, sideSign * 5.21);
    if (sideSign < 0) signBoard.rotation.y = Math.PI;
    shipRoot.add(signBoard);

    for (const bx of [-3.95, 3.95]) {
      const buoy = new THREE.Group();
      const ring = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.46, 0.14, 10, 20)),
        whiteTrimMat
      );
      buoy.add(ring);
      // 4 red quadrant bands on the life preserver (Image 1!)
      for (let q = 0; q < 4; q++) {
        const arc = new THREE.Mesh(
          trackGeo(
            new THREE.TorusGeometry(0.46, 0.155, 8, 8, Math.PI * 0.24)
          ),
          crimsonMat
        );
        arc.rotation.z = q * (Math.PI * 0.5) + Math.PI * 0.13;
        buoy.add(arc);
      }
      buoy.position.set(bx, BARATIE_TIER2_DECK_Y + 2.98, sideSign * 5.32);
      shipRoot.add(buoy);
    }

    // Tier 2 Arched Windows
    for (const wx of [-5.8, -2.9, 2.9, 5.8]) {
      const win = createArchedWindow(1.1, 1.55);
      win.position.set(wx, BARATIE_TIER2_DECK_Y + 0.42, sideSign * 5.11);
      if (sideSign < 0) win.rotation.y = Math.PI;
      shipRoot.add(win);
    }
    // Center balcony door on Tier 2
    const t2Door = new THREE.Mesh(unitBox, warmTimberMat);
    t2Door.scale.set(1.25, 1.75, 0.16);
    t2Door.position.set(0, BARATIE_TIER2_DECK_Y + 0.88, sideSign * 5.11);
    const t2Arch = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.62, 0.1, 8, 14, Math.PI)),
      whiteTrimMat
    );
    t2Arch.position.set(0, BARATIE_TIER2_DECK_Y + 1.65, sideSign * 5.14);
    shipRoot.add(t2Door, t2Arch);
  }

  // Wooden supply barrels along Tier 2 balcony (Image 2!)
  const barrelSpots: readonly [number, number][] = [
    [-4.6, 5.85],
    [-3.7, 5.85],
    [4.4, 5.85],
    [5.2, 5.85],
    [-4.2, -5.85],
    [4.5, -5.85],
  ];
  for (const [bx, bz] of barrelSpots) {
    const barrel = new THREE.Group();
    const bBody = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.38, 0.42, 0.96, 12)),
      warmTimberMat
    );
    bBody.position.y = 0.48;
    const bHoop1 = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.43, 0.43, 0.08, 12)),
      ironMat
    );
    bHoop1.position.y = 0.22;
    const bHoop2 = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.43, 0.43, 0.08, 12)),
      ironMat
    );
    bHoop2.position.y = 0.74;
    barrel.add(bBody, bHoop1, bHoop2);
    barrel.position.set(bx, BARATIE_TIER2_DECK_Y, bz);
    shipRoot.add(barrel);
  }

  // =========================================================================
  // 6. TIER 3: UPPER PENTHOUSE ("RESTAURANT"), SCALLOPED EAVES & SLOPED ROOF
  // =========================================================================
  const tier3DeckGeo = trackGeo(
    new THREE.ExtrudeGeometry(createStadiumShape(9.96, 5.24), {
      depth: 0.22,
      bevelEnabled: false,
      curveSegments: 24,
    })
  );
  tier3DeckGeo.rotateX(Math.PI * 0.5);
  tier3DeckGeo.translate(0, BARATIE_TIER3_DECK_Y, 0);
  shipRoot.add(new THREE.Mesh(tier3DeckGeo, woodDeckMat));

  addXCrossRailingPath(
    shipRoot,
    buildStadiumRailingPts(9.75, 5.05, 8),
    BARATIE_TIER3_DECK_Y,
    0.88,
    true
  );

  // Sloped Trapezoidal Penthouse Body (base: 14.6 x 7.2, top: 7.4 x 4.4, height: 4.95)
  const pBaseX = 7.3;
  const pTopX = 3.7;
  const pBaseZ = 3.6;
  const pTopZ = 2.2;
  const pH = 4.95;

  const makeQuadGeo = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number]
  ): THREE.BufferGeometry => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array([
      ...p0,
      ...p1,
      ...p2,
      ...p0,
      ...p2,
      ...p3,
    ]);
    const uvs = new Float32Array([
      0, 0,
      1, 0,
      1, 1,
      0, 0,
      1, 1,
      0, 1,
    ]);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    g.computeVertexNormals();
    return trackGeo(g);
  };

  const penthouse = new THREE.Group();
  penthouse.position.y = BARATIE_TIER3_DECK_Y;
  shipRoot.add(penthouse);

  // Starboard (+Z) & Port (-Z) mint-green RESTAURANT gable walls
  const frontGable = new THREE.Mesh(
    makeQuadGeo(
      [-pBaseX, 0, pBaseZ],
      [pBaseX, 0, pBaseZ],
      [pTopX, pH, pTopZ],
      [-pTopX, pH, pTopZ]
    ),
    restaurantGableMat
  );
  const backGable = new THREE.Mesh(
    makeQuadGeo(
      [pBaseX, 0, -pBaseZ],
      [-pBaseX, 0, -pBaseZ],
      [-pTopX, pH, -pTopZ],
      [pTopX, pH, -pTopZ]
    ),
    restaurantGableMat
  );
  // Bow (-X) & Stern (+X) sloped terracotta-red shingled roof slopes
  const bowRoofSlope = new THREE.Mesh(
    makeQuadGeo(
      [-pBaseX, 0, -pBaseZ],
      [-pBaseX, 0, pBaseZ],
      [-pTopX, pH, pTopZ],
      [-pTopX, pH, -pTopZ]
    ),
    roofMat
  );
  const sternRoofSlope = new THREE.Mesh(
    makeQuadGeo(
      [pBaseX, 0, pBaseZ],
      [pBaseX, 0, -pBaseZ],
      [pTopX, pH, -pTopZ],
      [pTopX, pH, pTopZ]
    ),
    roofMat
  );
  penthouse.add(frontGable, backGable, bowRoofSlope, sternRoofSlope);

  // Flat light-grey slate roof crown cap (Image 2!)
  const roofCap = new THREE.Mesh(unitBox, slateCapMat);
  roofCap.scale.set(pTopX * 2 + 0.5, 0.34, pTopZ * 2 + 0.5);
  roofCap.position.set(0, pH + 0.14, 0);
  const roofTrim = new THREE.Mesh(unitBox, darkTimberMat);
  roofTrim.scale.set(pTopX * 2 + 0.65, 0.14, pTopZ * 2 + 0.65);
  roofTrim.position.set(0, pH - 0.02, 0);
  penthouse.add(roofCap, roofTrim);

  // Tier 3 windows & central arched balcony door on both front & back gable faces
  const slopeTilt = Math.atan2(pBaseZ - pTopZ, pH);
  for (const sideSign of [1, -1] as const) {
    const faceItems = new THREE.Group();
    faceItems.position.set(0, 0, sideSign * pBaseZ);
    faceItems.rotation.x = -sideSign * slopeTilt;
    if (sideSign < 0) faceItems.rotation.y = Math.PI;

    for (const wx of [-2.45, 2.45]) {
      const win = createArchedWindow(1.05, 1.45);
      win.position.set(wx, 0.42, 0.06);
      faceItems.add(win);
    }
    const penthouseDoor = new THREE.Mesh(unitBox, warmTimberMat);
    penthouseDoor.scale.set(1.2, 1.75, 0.16);
    penthouseDoor.position.set(0, 0.88, 0.06);
    const doorArch = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.6, 0.1, 8, 14, Math.PI)),
      whiteTrimMat
    );
    doorArch.position.set(0, 1.65, 0.08);
    faceItems.add(penthouseDoor, doorArch);
    penthouse.add(faceItems);
  }

  // Round dormer eyebrow windows on the Bow (-X) terracotta roof slope (Image 1 & 2!)
  const roofPitch = Math.atan2(pH, pBaseX - pTopX);
  for (const dz of [-1.25, 1.25]) {
    const dormer = new THREE.Group();
    const dHood = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.48, 0.48, 0.72, 12)),
      roofMat
    );
    dHood.rotation.z = Math.PI * 0.5;
    const dGlass = new THREE.Mesh(unitCyl, windowGlassMat);
    dGlass.rotation.z = Math.PI * 0.5;
    dGlass.scale.set(0.36, 0.08, 0.36);
    dGlass.position.x = -0.37;
    dormer.add(dHood, dGlass);
    dormer.position.set(-(pBaseX + pTopX) * 0.5, pH * 0.5, dz);
    dormer.rotation.z = roofPitch - Math.PI * 0.5;
    penthouse.add(dormer);
  }

  // Galley Chimney on top roof + animated cooking smoke puffs (Image 1 & 2!)
  const chimney = new THREE.Group();
  chimney.position.set(2.4, pH + 0.3, 0);
  const chimBase = new THREE.Mesh(unitBox, mintFlutedMastMat);
  chimBase.scale.set(1.35, 1.45, 1.2);
  chimBase.position.y = 0.72;
  const chimCap = new THREE.Mesh(unitBox, warmTimberMat);
  chimCap.scale.set(1.6, 0.28, 1.45);
  chimCap.position.y = 1.52;
  chimney.add(chimBase, chimCap);
  penthouse.add(chimney);

  const smokePuffs: { mesh: THREE.Mesh; phase: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(unitSphere, smokeMat);
    puff.position.set(2.4, pH + 2.1, 0);
    penthouse.add(puff);
    smokePuffs.push({ mesh: puff, phase: i / 5 });
  }

  // =========================================================================
  // 7. STERN QUARTERDECK & GIANT RED-AND-GOLD TAIL FIN (x = +11.5 to +24.8)
  // =========================================================================
  const qDeck = new THREE.Mesh(unitBox, woodDeckMat);
  qDeck.scale.set(5.8, 0.28, 9.2);
  qDeck.position.set(14.3, BARATIE_QUARTER_DECK_Y - 0.14, 0);
  const qSubWall = new THREE.Mesh(unitBox, mintWallMat);
  qSubWall.scale.set(5.4, 3.7, 8.6);
  qSubWall.position.set(14.1, BARATIE_MAIN_DECK_Y + 1.85, 0);
  shipRoot.add(qDeck, qSubWall);

  // White stern quarterdeck railing (Image 2!)
  const qRailPts: [number, number][] = [
    [11.6, 4.45],
    [17.0, 4.45],
    [17.0, -4.45],
    [11.6, -4.45],
  ];
  for (let i = 0; i < qRailPts.length - 1; i++) {
    const [x0, z0] = qRailPts[i];
    const [x1, z1] = qRailPts[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const bar = new THREE.Mesh(unitBox, whiteTrimMat);
    bar.scale.set(len, 0.14, 0.14);
    bar.position.set((x0 + x1) * 0.5, BARATIE_QUARTER_DECK_Y + 0.9, (z0 + z1) * 0.5);
    bar.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    const wallLow = new THREE.Mesh(unitBox, whiteTrimMat);
    wallLow.scale.set(len, 0.42, 0.12);
    wallLow.position.set((x0 + x1) * 0.5, BARATIE_QUARTER_DECK_Y + 0.21, (z0 + z1) * 0.5);
    wallLow.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    shipRoot.add(bar, wallLow);
  }

  // Giant Red-and-Gold Fish Tail Fin (Image 1 & 2!)
  const tailShape = new THREE.Shape();
  tailShape.moveTo(16.8, -1.2);
  tailShape.lineTo(18.6, 1.2);
  tailShape.bezierCurveTo(20.8, 3.2, 23.2, 6.8, 24.4, 10.6);
  tailShape.bezierCurveTo(22.4, 11.4, 19.6, 10.6, 18.0, 7.6);
  tailShape.lineTo(17.2, 5.0);
  tailShape.lineTo(16.8, 4.8);
  tailShape.closePath();

  const tailFinCore = new THREE.Mesh(
    trackGeo(
      new THREE.ExtrudeGeometry(tailShape, {
        depth: 0.72,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.08,
        bevelSegments: 2,
      })
    ),
    crimsonMat
  );
  tailFinCore.position.z = -0.36;
  shipRoot.add(tailFinCore);

  // Thick Golden Tail Fin Rim Frame
  const tailRimPoints = [
    new THREE.Vector3(17.1, 4.9, 0),
    new THREE.Vector3(18.1, 7.8, 0),
    new THREE.Vector3(20.2, 10.2, 0),
    new THREE.Vector3(24.2, 10.65, 0),
    new THREE.Vector3(23.1, 6.8, 0),
    new THREE.Vector3(20.6, 3.2, 0),
    new THREE.Vector3(18.4, 0.8, 0),
  ];
  const tailRimCurve = new THREE.CatmullRomCurve3(tailRimPoints);
  const tailRimMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(tailRimCurve, 28, 0.42, 10, false)),
    goldMat
  );
  shipRoot.add(tailRimMesh);

  // =========================================================================
  // 8. TWO FLUTED MASTS, 3 YELLOW-WHITE STRIPED SAILS, RIGGING & BUNTING
  // =========================================================================
  const flags: THREE.Mesh[] = [];

  const buildMast = (
    x: number,
    baseY: number,
    height: number,
    sailSpecs: { y: number; width: number; height: number; belly: number }[]
  ) => {
    const mast = new THREE.Group();
    mast.position.set(x, baseY, 0);

    // Lower mint-green fluted column + golden collar rings (Image 1!)
    const lowerH = height * 0.56;
    const lowerMast = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.46, 0.58, lowerH, 12)),
      mintFlutedMastMat
    );
    lowerMast.position.y = lowerH * 0.5;
    mast.add(lowerMast);

    for (const cy of [0.6, lowerH * 0.48, lowerH * 0.96]) {
      const collar = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.62, 0.62, 0.34, 14)),
        goldMat
      );
      collar.position.y = cy;
      mast.add(collar);
    }

    // Upper wooden topmast
    const upperH = height * 0.48;
    const upperMast = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.24, 0.4, upperH, 10)),
      warmTimberMat
    );
    upperMast.position.y = lowerH + upperH * 0.5 - 0.3;
    mast.add(upperMast);

    // Crow's nest
    const nest = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.95, 0.72, 0.75, 12)),
      warmTimberMat
    );
    nest.position.y = lowerH + 0.1;
    mast.add(nest);

    // Sails & Yards
    for (const sp of sailSpecs) {
      const yard = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.16, 0.16, sp.width * 1.12, 8)),
        warmTimberMat
      );
      yard.rotation.x = Math.PI * 0.5;
      yard.rotation.z = 0.08;
      yard.position.set(0, sp.y + sp.height * 0.5, 0);
      mast.add(yard);

      const sailGeo = trackGeo(
        createBillowingSailGeo(sp.width, sp.height, sp.belly)
      );
      const sail = new THREE.Mesh(sailGeo, sailMat);
      // Orient sail face diagonally toward Bow-Starboard (-X, +Z) matching Image 2!
      sail.rotation.y = -Math.PI * 0.42;
      sail.position.set(-0.2, sp.y, 0);
      mast.add(sail);
    }

    // Fluttering Red "B" Triangular Flag at masthead (Image 2!)
    const flagGeo = trackGeo(new THREE.PlaneGeometry(3.4, 1.55, 6, 2));
    flagGeo.translate(1.7, 0, 0);
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0, height - 0.75, 0);
    flag.rotation.y = -0.35;
    mast.add(flag);
    flags.push(flag);

    shipRoot.add(mast);
  };

  // Fore Mast (2 billowing yellow-white striped sails as in Image 2!)
  buildMast(-10.8, BARATIE_MAIN_DECK_Y, 22.0, [
    { y: 12.2, width: 10.6, height: 4.8, belly: 1.55 },
    { y: 17.6, width: 8.6, height: 4.1, belly: 1.35 },
  ]);

  // Aft Mast (1 billowing yellow-white striped sail as in Image 2!)
  buildMast(11.4, BARATIE_MAIN_DECK_Y, 21.0, [
    { y: 16.0, width: 9.8, height: 4.6, belly: 1.45 },
  ]);

  // Rigging shrouds & forestays
  const riggingLines: readonly [[number, number, number], [number, number, number]][] = [
    // Fore mast shrouds
    [[-10.8, 19.5, 0], [-11.5, 1.5, 6.8]],
    [[-10.8, 19.5, 0], [-9.2, 1.5, 7.2]],
    [[-10.8, 19.5, 0], [-11.5, 1.5, -6.8]],
    [[-10.8, 19.5, 0], [-9.2, 1.5, -7.2]],
    [[-10.8, 21.5, 0], [-15.2, 4.8, 0]],
    // Aft mast shrouds
    [[11.4, 18.8, 0], [11.8, 1.5, 6.8]],
    [[11.4, 18.8, 0], [9.6, 1.5, 7.2]],
    [[11.4, 18.8, 0], [11.8, 1.5, -6.8]],
    [[11.4, 18.8, 0], [9.6, 1.5, -7.2]],
    // Span stay between masts
    [[-10.8, 21.2, 0], [11.4, 20.2, 0]],
  ];

  for (const [a, b] of riggingLines) {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const cable = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.055, 0.055, len, 5)),
      darkTimberMat
    );
    cable.position.copy(va).add(vb).multiplyScalar(0.5);
    cable.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      vb.clone().sub(va).normalize()
    );
    shipRoot.add(cable);
  }

  // Festive Signal Pennants strung along the overhead stay between Fore & Aft Masts (Image 1 & 2!)
  const pennantColors = [crimsonMat, whiteTrimMat, goldMat];
  const pennantCount = 12;
  const pennantGeo = trackGeo(new THREE.ConeGeometry(0.32, 0.68, 3));
  pennantGeo.rotateX(Math.PI);
  for (let i = 0; i < pennantCount; i++) {
    const t = (i + 0.5) / pennantCount;
    const px = -10.8 + t * 22.2;
    const sag = Math.sin(t * Math.PI) * 1.15;
    const py = 21.2 - t * 1.0 - sag;
    const pen = new THREE.Mesh(
      pennantGeo,
      pennantColors[i % pennantColors.length]
    );
    pen.position.set(px, py - 0.32, 0);
    shipRoot.add(pen);
  }

  const baseShipPos = shipRoot.position.clone();

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      // Gentle ocean swell bobbing & roll
      const bob = Math.sin(elapsed * 1.15) * 0.09;
      shipRoot.position.y = baseShipPos.y + bob * S;
      shipRoot.rotation.x = Math.sin(elapsed * 0.85) * 0.008;
      shipRoot.rotation.z = Math.cos(elapsed * 0.72) * 0.005;

      // Subtle bow waterline foam pulse
      for (let i = 0; i < wakeRings.length; i++) {
        const w = 1 + Math.sin(elapsed * 1.4 + i) * 0.025;
        wakeRings[i].scale.set(1.45 * w, 1, 1.08 * w);
      }

      // Fluttering masthead pennants
      for (let i = 0; i < flags.length; i++) {
        flags[i].rotation.y = -0.35 + Math.sin(elapsed * 3.1 + i * 1.2) * 0.16;
      }

      // Rising white galley chimney smoke puffs (Image 2!)
      for (const puff of smokePuffs) {
        const t = (elapsed * 0.24 + puff.phase) % 1;
        puff.mesh.position.set(
          2.4 + t * 1.8 + Math.sin(elapsed * 1.5 + puff.phase * 6) * 0.25,
          pH + 1.9 + t * 4.4,
          Math.cos(elapsed * 1.2 + puff.phase * 4) * 0.2
        );
        const sc = 0.35 + t * 0.85;
        puff.mesh.scale.setScalar(sc);
      }
    },
  };
}
