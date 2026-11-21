import * as THREE from 'three';
import { SUNNY_WORLD_LENGTH, type SunnySkyZone } from './sunnyNavigation';

export interface SunnyShipUpdateOptions {
  balloonDeploy?: number;
  skyZone?: SunnySkyZone;
  coated?: boolean;
  wavePitch?: number;
  waveRoll?: number;
  waveCrest?: number;
  seaRoughness?: number;
  boostActive?: boolean;
}

export interface SunnyWakeMetrics {
  visible: boolean;
  speedNorm: number;
  wakeIntensity: number;
  bowIntensity: number;
  trailLengthScale: number;
  trailWidthScale: number;
  flowRate: number;
  boostIntensity: number;
}

export function computeSunnyWakeMetrics(params: {
  speed: number;
  boostActive?: boolean;
  waveCrest?: number;
  skyZone?: SunnySkyZone;
}): SunnyWakeMetrics {
  const skyZone = params.skyZone ?? 'blue-sea';
  if (
    skyZone === 'balloon-glide' ||
    skyZone === 'knock-up-stream' ||
    skyZone === 'subsea-dive'
  ) {
    return {
      visible: false,
      speedNorm: 0,
      wakeIntensity: 0,
      bowIntensity: 0,
      trailLengthScale: 0.7,
      trailWidthScale: 0.8,
      flowRate: 0,
      boostIntensity: 0,
    };
  }
  const absSpeed = Math.abs(params.speed);
  const speedNorm = Math.max(0, Math.min(1, absSpeed / 0.11));
  const boostIntensity = params.boostActive
    ? 1
    : Math.max(0, Math.min(1, (absSpeed - 0.12) / 0.16));
  const crest = Math.max(0, Math.min(1, params.waveCrest ?? 0.5));
  const wakeIntensity = Math.min(
    1,
    speedNorm * 0.9 + boostIntensity * 0.35 + crest * 0.08
  );
  const bowIntensity = Math.min(
    1,
    0.08 + speedNorm * 0.88 + boostIntensity * 0.32
  );
  return {
    visible: true,
    speedNorm,
    wakeIntensity,
    bowIntensity,
    trailLengthScale: 0.72 + speedNorm * 0.65 + boostIntensity * 0.48,
    trailWidthScale: 0.84 + speedNorm * 0.32 + boostIntensity * 0.25,
    flowRate: 0.35 + speedNorm * 4.8 + boostIntensity * 3.6,
    boostIntensity,
  };
}

export interface SunnyShipHandle {
  group: THREE.Group;
  hullPivot: THREE.Group;
  octopusGroup: THREE.Group;
  coatingBubble: THREE.Mesh;
  wakeMesh: THREE.Mesh;
  bowWaterMesh: THREE.Mesh;
  flags: THREE.Mesh[];
  paddles: THREE.Mesh[];
  update: (
    elapsed: number,
    speed: number,
    bankAngle: number,
    options?: SunnyShipUpdateOptions
  ) => void;
  dispose: () => void;
}

function createWoodPlankTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#d39a56';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 22) {
    ctx.fillStyle = y % 44 === 0 ? '#c98e49' : '#da9f5a';
    ctx.fillRect(0, y, 256, 20);
    ctx.fillStyle = '#6f451d';
    ctx.fillRect(0, y + 20, 256, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function createMainSailTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Off-white cream canvas sail
  ctx.fillStyle = '#f8f5ec';
  ctx.fillRect(0, 0, 512, 512);

  // Vertical stitched canvas seams & subtle fold shading
  for (let x = 32; x < 512; x += 48) {
    ctx.strokeStyle = 'rgba(130, 118, 98, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  // Straw Hat Pirate Jolly Roger centered
  const cx = 256;
  const cy = 248;

  // Crossbones
  ctx.save();
  ctx.translate(cx, cy + 12);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1b1d24';
  ctx.lineWidth = 7;
  for (const ang of [-0.62, 0.62]) {
    ctx.save();
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.roundRect(-165, -14, 330, 28, 12);
    ctx.fill();
    ctx.stroke();
    // Bone knobs
    for (const bx of [-162, 162]) {
      for (const by of [-14, 14]) {
        ctx.beginPath();
        ctx.arc(bx, by, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.restore();

  // Skull jaw & cranium
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1b1d24';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.roundRect(cx - 52, cy + 28, 104, 68, 22);
  ctx.fill();
  ctx.stroke();

  // Teeth grid
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(cx - 48, cy + 62);
  ctx.lineTo(cx + 48, cy + 62);
  ctx.moveTo(cx - 24, cy + 36);
  ctx.lineTo(cx - 24, cy + 88);
  ctx.moveTo(cx, cy + 36);
  ctx.lineTo(cx, cy + 88);
  ctx.moveTo(cx + 24, cy + 36);
  ctx.lineTo(cx + 24, cy + 88);
  ctx.stroke();

  // Cranium dome
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 12, 92, 74, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Eye sockets & nose
  ctx.fillStyle = '#14171f';
  ctx.beginPath();
  ctx.arc(cx - 38, cy - 2, 24, 0, Math.PI * 2);
  ctx.arc(cx + 38, cy - 2, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + 24, 11, 0, Math.PI * 2);
  ctx.fill();

  // Luffy's iconic Straw Hat
  ctx.fillStyle = '#f5c342';
  ctx.strokeStyle = '#1b1d24';
  ctx.lineWidth = 7;
  // Crown
  ctx.beginPath();
  ctx.arc(cx, cy - 62, 68, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Red ribbon
  ctx.fillStyle = '#d4312c';
  ctx.fillRect(cx - 67, cy - 77, 134, 16);
  ctx.strokeRect(cx - 67, cy - 77, 134, 16);
  // Hat brim
  ctx.fillStyle = '#f5c342';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 60, 128, 16, -0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createStripedAftSailTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const stripeW = 32;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#c9322c' : '#252830';
    ctx.fillRect(i * stripeW, 0, stripeW, 256);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(i * stripeW, 0, 2, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createMedallionOneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#252830';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#e7c17c';
  ctx.strokeStyle = '#1a1d24';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(128, 128, 86, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Bold red "1"
  ctx.fillStyle = '#c9332b';
  ctx.strokeStyle = '#1a1d24';
  ctx.lineWidth = 6;
  ctx.font = 'bold 132px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1', 128, 134);
  ctx.strokeText('1', 128, 134);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createLionFaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fae46b';
  ctx.fillRect(0, 0, 256, 256);

  // Cute round black eyes with white ring
  for (const ex of [82, 174]) {
    ctx.fillStyle = '#151820';
    ctx.beginPath();
    ctx.arc(ex, 98, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(ex, 98, 25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - 6, 91, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tan snout oval
  ctx.fillStyle = '#dfbe7c';
  ctx.strokeStyle = '#1b1d24';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(128, 152, 54, 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Nose & cute smile
  ctx.fillStyle = '#a87d43';
  ctx.beginPath();
  ctx.moveTo(116, 130);
  ctx.lineTo(140, 130);
  ctx.lineTo(128, 146);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1b1d24';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(128, 146);
  ctx.lineTo(128, 166);
  ctx.moveTo(100, 160);
  ctx.quadraticCurveTo(128, 182, 156, 160);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createDomeStripeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const stripes = 12;
  const w = 256 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#d8382c' : '#f4cc3c';
    ctx.fillRect(i * w, 0, w, 128);
    ctx.fillStyle = '#1b1d24';
    ctx.fillRect(i * w, 0, 2, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createShroudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 256);
  ctx.strokeStyle = '#1b1d24';
  ctx.lineWidth = 4;
  for (let x = 18; x <= 110; x += 23) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 14; y < 256; y += 20) {
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.lineTo(114, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createJollyFlagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#14171f';
  ctx.fillRect(0, 0, 128, 96);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(32, 22);
  ctx.lineTo(96, 74);
  ctx.moveTo(96, 22);
  ctx.lineTo(32, 74);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(64, 48, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5c342';
  ctx.beginPath();
  ctx.ellipse(64, 33, 25, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d4312c';
  ctx.fillRect(51, 28, 26, 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createOctopusBalloonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#ffa3a3');
  grad.addColorStop(0.55, '#f26f73');
  grad.addColorStop(1, '#d94e56');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Playful anime octopus spots
  const spots: Array<[number, number, number, string]> = [
    [36, 52, 16, 'rgba(255, 214, 214, 0.55)'],
    [98, 38, 12, 'rgba(196, 48, 62, 0.45)'],
    [164, 64, 18, 'rgba(255, 214, 214, 0.55)'],
    [222, 46, 14, 'rgba(196, 48, 62, 0.45)'],
    [62, 118, 15, 'rgba(196, 48, 62, 0.4)'],
    [136, 108, 20, 'rgba(255, 218, 218, 0.5)'],
    [206, 124, 14, 'rgba(196, 48, 62, 0.45)'],
    [28, 168, 13, 'rgba(255, 214, 214, 0.45)'],
    [184, 174, 16, 'rgba(255, 214, 214, 0.45)'],
  ];
  for (const [sx, sy, sr, col] of spots) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Creates a wind-billowed square sail BufferGeometry with curved belly toward +Z.
 */
function createBillowingSailGeometry(
  width: number,
  height: number,
  bellyDepth: number
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 14, 10);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const nx = x / (width * 0.5);
    const ny = y / (height * 0.5);
    const arch = Math.max(0, 1 - nx * nx * 0.55) * Math.cos(ny * Math.PI * 0.48);
    pos.setZ(i, arch * bellyDepth);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the Thousand Sunny (Sunny Go) as a faithful 30+ part composite 3D model
 * scaled to `SUNNY_WORLD_LENGTH` with bow along +Z and up along +Y.
 */
export function createThousandSunnyModel(): SunnyShipHandle {
  const disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[]; textures: THREE.Texture[] } = {
    geometries: [],
    materials: [],
    textures: [],
  };
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.materials.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    disposables.textures.push(t);
    return t;
  };

  const woodTex = trackTex(createWoodPlankTexture());
  const mainSailTex = trackTex(createMainSailTexture());
  const aftStripeTex = trackTex(createStripedAftSailTexture());
  const medallionTex = trackTex(createMedallionOneTexture());
  const lionFaceTex = trackTex(createLionFaceTexture());
  const domeStripeTex = trackTex(createDomeStripeTexture());
  const shroudTex = trackTex(createShroudTexture());
  const flagTex = trackTex(createJollyFlagTexture());

  const matWood = trackMat(
    new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.72,
      metalness: 0.04,
    })
  );
  const matMast = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8b5a36,
      roughness: 0.78,
      metalness: 0.05,
    })
  );
  const matCharcoal = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x222630,
      roughness: 0.62,
      metalness: 0.25,
    })
  );
  const matWhite = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4f6f9,
      roughness: 0.42,
      metalness: 0.06,
    })
  );
  const matRed = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc9322c,
      roughness: 0.46,
      metalness: 0.08,
    })
  );
  const matGold = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf3cc3b,
      roughness: 0.3,
      metalness: 0.45,
    })
  );
  const matOrange = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xea7c2c,
      roughness: 0.48,
      metalness: 0.05,
    })
  );
  const matGrass = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x56a83a,
      roughness: 0.92,
      metalness: 0.0,
    })
  );
  const matCreamCabin = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf2e7cd,
      roughness: 0.7,
      metalness: 0.02,
    })
  );
  const matWindow = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8fd6f2,
      roughness: 0.18,
      metalness: 0.35,
    })
  );
  const matMainSail = trackMat(
    new THREE.MeshStandardMaterial({
      map: mainSailTex,
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );
  const matWhiteSail = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8f5ec,
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );
  const matAftStripedSail = trackMat(
    new THREE.MeshStandardMaterial({
      map: aftStripeTex,
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );
  const matMedallion = trackMat(
    new THREE.MeshStandardMaterial({
      map: medallionTex,
      roughness: 0.38,
      metalness: 0.25,
    })
  );
  const matLionFace = trackMat(
    new THREE.MeshStandardMaterial({
      map: lionFaceTex,
      roughness: 0.48,
      metalness: 0.04,
    })
  );
  const matDome = trackMat(
    new THREE.MeshStandardMaterial({
      map: domeStripeTex,
      roughness: 0.42,
      metalness: 0.1,
    })
  );
  const matShroud = trackMat(
    new THREE.MeshStandardMaterial({
      map: shroudTex,
      transparent: true,
      alphaTest: 0.35,
      roughness: 0.9,
      side: THREE.DoubleSide,
    })
  );
  const matFlag = trackMat(
    new THREE.MeshStandardMaterial({
      map: flagTex,
      roughness: 0.8,
      side: THREE.DoubleSide,
    })
  );

  const root = new THREE.Group();
  root.scale.setScalar(SUNNY_WORLD_LENGTH);
  const hullPivot = new THREE.Group();
  root.add(hullPivot);

  // 1. Sculpted plump wooden caravel hull (round caravel belly + dark keel band)
  const hullGeo = trackGeo(new THREE.SphereGeometry(0.27, 24, 18));
  hullGeo.scale(0.86, 0.72, 1.56);
  const hullPos = hullGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < hullPos.count; i++) {
    let x = hullPos.getX(i);
    let y = hullPos.getY(i);
    const z = hullPos.getZ(i);
    // Flatten deck above y > 0.085
    if (y > 0.085) {
      y = 0.085 + (y - 0.085) * 0.14;
    }
    // Taper bow/stern subtly into caravel beam
    const zT = Math.min(1, Math.abs(z) / 0.42);
    x *= 1 - zT * 0.16;
    hullPos.setXYZ(i, x, y + 0.06, z);
  }
  hullGeo.computeVertexNormals();
  const hullMesh = new THREE.Mesh(hullGeo, matWood);
  hullPivot.add(hullMesh);

  // Dark keel & belly ribs
  const keelBandGeo = trackGeo(new THREE.TorusGeometry(0.22, 0.022, 8, 26, Math.PI * 1.15));
  const keelCenter = new THREE.Mesh(keelBandGeo, matCharcoal);
  keelCenter.rotation.set(Math.PI, Math.PI * 0.5, 0);
  keelCenter.position.set(0, 0.09, 0.0);
  keelCenter.scale.set(1.85, 0.9, 1.0);
  hullPivot.add(keelCenter);

  const keelCross = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.22, 0.022, 8, 22, Math.PI * 1.02)),
    matCharcoal
  );
  keelCross.rotation.set(0, 0, Math.PI);
  keelCross.position.set(0, 0.09, -0.02);
  keelCross.scale.set(1.02, 0.94, 1.0);
  hullPivot.add(keelCross);

  // 2. Crimson Bulwarks & White Curved Gunwale Rails (Port & Starboard)
  for (const side of [-1, 1] as const) {
    const bulwarkGeo = trackGeo(
      new THREE.CylinderGeometry(0.215, 0.215, 0.14, 16, 1, true, -0.8, 1.6)
    );
    const bulwark = new THREE.Mesh(bulwarkGeo, matRed);
    bulwark.rotation.set(Math.PI * 0.5, 0, side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5);
    bulwark.position.set(side * 0.03, 0.17, 0.0);
    bulwark.scale.set(1.6, 1.0, 0.85);
    hullPivot.add(bulwark);

    // Side wing bulwark walls
    const wingWall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.032, 0.115, 0.66)),
      matRed
    );
    wingWall.position.set(side * 0.205, 0.18, -0.02);
    wingWall.rotation.y = side * -0.06;
    hullPivot.add(wingWall);

    const gunwaleTop = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.044, 0.026, 0.68)),
      matWhite
    );
    gunwaleTop.position.set(side * 0.205, 0.242, -0.02);
    gunwaleTop.rotation.y = side * -0.06;
    hullPivot.add(gunwaleTop);

    // Signature "1" Medallion on center flank
    const medRing = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.088, 0.088, 0.032, 20)),
      matCharcoal
    );
    medRing.rotation.z = Math.PI * 0.5;
    medRing.position.set(side * 0.222, 0.135, -0.01);
    hullPivot.add(medRing);

    const medFace = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(0.072, 20)),
      matMedallion
    );
    medFace.rotation.y = side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
    medFace.position.set(side * 0.241, 0.135, -0.01);
    hullPivot.add(medFace);

    // White-rimmed round portholes fore & aft of "1"
    for (const pz of [0.16, 0.24, -0.17, -0.25]) {
      const portRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.022, 0.007, 6, 14)),
        matWhite
      );
      portRing.rotation.y = Math.PI * 0.5;
      portRing.position.set(side * 0.222, 0.17, pz);
      hullPivot.add(portRing);

      const portGlass = new THREE.Mesh(
        trackGeo(new THREE.CircleGeometry(0.018, 12)),
        matWindow
      );
      portGlass.rotation.y = side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      portGlass.position.set(side * 0.224, 0.17, pz);
      hullPivot.add(portGlass);
    }
  }

  // 3. Green Grass Lawn Deck + Cream Deckhouse Cabin + Stairs
  const lawnMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.18, 0.18, 0.024, 18)),
    matGrass
  );
  lawnMesh.scale.set(0.95, 1, 1.75);
  lawnMesh.position.set(0, 0.156, 0.0);
  hullPivot.add(lawnMesh);

  // Cream aft quarterdeck & cabin
  const aftCabin = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.32, 0.11, 0.24)),
    matCreamCabin
  );
  aftCabin.position.set(0, 0.21, -0.22);
  hullPivot.add(aftCabin);

  const aftDeckRoof = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.34, 0.022, 0.26)),
    matRed
  );
  aftDeckRoof.position.set(0, 0.272, -0.22);
  hullPivot.add(aftDeckRoof);

  // Cabin arched timber door & steps
  const cabinDoor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.055, 0.072, 0.015)),
    matMast
  );
  cabinDoor.position.set(0, 0.20, -0.098);
  hullPivot.add(cabinDoor);

  const foreDeck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.30, 0.06, 0.18)),
    matCreamCabin
  );
  foreDeck.position.set(0, 0.19, 0.24);
  hullPivot.add(foreDeck);

  // 4. Stern Soldier Dock Paddle Wheels & Rudder
  const paddles: THREE.Mesh[] = [];
  for (const side of [-1, 1] as const) {
    const paddleDrum = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.072, 0.072, 0.055, 12)),
      matMast
    );
    paddleDrum.rotation.z = Math.PI * 0.5;
    paddleDrum.position.set(side * 0.185, 0.095, -0.34);
    hullPivot.add(paddleDrum);
    paddles.push(paddleDrum);
  }
  const rudder = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.025, 0.09, 0.085)),
    matCharcoal
  );
  rudder.position.set(0, 0.055, -0.43);
  hullPivot.add(rudder);

  // 5. Iconic Lion Prow & Gaon Cannon Figurehead (+Z bow)
  const prowGroup = new THREE.Group();
  prowGroup.position.set(0, 0.24, 0.35);
  hullPivot.add(prowGroup);

  // Rounded crimson bow bulkhead & white rim
  const bowSphere = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.18, 18, 14)),
    matRed
  );
  bowSphere.scale.set(1.06, 1.0, 0.72);
  prowGroup.add(bowSphere);

  const bowWhiteTrim = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.178, 0.016, 8, 22)),
    matWhite
  );
  bowWhiteTrim.position.set(0, 0, 0.02);
  prowGroup.add(bowWhiteTrim);

  // Golden rivet collar around dark Gaon Cannon muzzle
  const cannonCollar = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.115, 0.022, 8, 22)),
    matGold
  );
  cannonCollar.position.set(0, 0.02, 0.085);
  prowGroup.add(cannonCollar);

  const cannonMuzzle = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.088, 0.088, 0.06, 16)),
    matCharcoal
  );
  cannonMuzzle.rotation.x = Math.PI * 0.5;
  cannonMuzzle.position.set(0, 0.02, 0.075);
  prowGroup.add(cannonMuzzle);

  // Crossed White Cartoon Bones ("X") behind lion head
  for (const ang of [-0.72, 0.72]) {
    const boneGroup = new THREE.Group();
    boneGroup.position.set(0, 0.03, 0.098);
    boneGroup.rotation.z = ang;
    const shaft = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.36, 8)),
      matWhite
    );
    boneGroup.add(shaft);
    for (const endY of [-0.18, 0.18]) {
      for (const endX of [-0.014, 0.014]) {
        const knob = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.02, 8, 8)),
          matWhite
        );
        knob.position.set(endX, endY, 0);
        boneGroup.add(knob);
      }
    }
    prowGroup.add(boneGroup);
  }

  // Cheerful Round Yellow Lion Face
  const lionHead = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.086, 16, 14)),
    matGold
  );
  lionHead.scale.set(1.0, 1.0, 0.78);
  lionHead.position.set(0, 0.03, 0.135);
  prowGroup.add(lionHead);

  const lionFaceDisc = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.076, 18)),
    matLionFace
  );
  lionFaceDisc.position.set(0, 0.03, 0.203);
  prowGroup.add(lionFaceDisc);

  // 8 Curved Orange Flame Mane Petals radiating around Lion Head
  const petalShape = new THREE.Shape();
  petalShape.moveTo(-0.028, 0);
  petalShape.quadraticCurveTo(-0.036, 0.065, 0.015, 0.118);
  petalShape.quadraticCurveTo(0.040, 0.056, 0.028, 0);
  petalShape.closePath();
  const petalGeo = trackGeo(
    new THREE.ExtrudeGeometry(petalShape, {
      depth: 0.028,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.005,
      bevelSegments: 2,
    })
  );
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeo, matOrange);
    petal.position.set(
      Math.cos(a) * 0.082,
      0.03 + Math.sin(a) * 0.082,
      0.122
    );
    petal.rotation.z = a - Math.PI * 0.5;
    prowGroup.add(petal);
  }

  // Flanking Golden Lion Paws on upper bow corners + lower paw buttons
  for (const side of [-1, 1] as const) {
    const paw = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.038, 10, 10)),
      matGold
    );
    paw.scale.set(1.0, 1.15, 0.85);
    paw.position.set(side * 0.135, 0.115, 0.045);
    prowGroup.add(paw);

    const lowerPaw = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.028, 10, 10)),
      matGold
    );
    lowerPaw.position.set(side * 0.125, -0.055, 0.085);
    prowGroup.add(lowerPaw);
  }

  // 6. Main Mast, Billowing Straw Hat Sail, Shrouds & Domed Crow's Nest
  const mainMast = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.026, 0.034, 0.72, 12)),
    matMast
  );
  mainMast.position.set(0, 0.51, 0.02);
  hullPivot.add(mainMast);

  // Main upper & lower yardarms
  const mainYardTop = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.016, 0.014, 0.68, 10)),
    matMast
  );
  mainYardTop.rotation.z = Math.PI * 0.5;
  mainYardTop.position.set(0, 0.74, 0.04);
  hullPivot.add(mainYardTop);

  const mainYardBot = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.013, 0.013, 0.62, 10)),
    matMast
  );
  mainYardBot.rotation.z = Math.PI * 0.5;
  mainYardBot.position.set(0, 0.34, 0.04);
  hullPivot.add(mainYardBot);

  // Huge billowing Straw Hat Jolly Roger Main Sail
  const mainSailGeo = trackGeo(createBillowingSailGeometry(0.62, 0.41, 0.12));
  const mainSail = new THREE.Mesh(mainSailGeo, matMainSail);
  mainSail.position.set(0, 0.54, 0.045);
  hullPivot.add(mainSail);

  // Rope Shrouds on Port & Starboard
  for (const side of [-1, 1] as const) {
    const shroud = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.11, 0.52)),
      matShroud
    );
    shroud.position.set(side * 0.135, 0.44, 0.0);
    shroud.rotation.y = Math.PI * 0.5;
    shroud.rotation.x = side * 0.24;
    hullPivot.add(shroud);
  }

  // Crow's Nest / Observatory Tower atop Main Mast
  const crowsNest = new THREE.Group();
  crowsNest.position.set(0, 0.86, 0.02);
  hullPivot.add(crowsNest);

  crowsNest.add(
    new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.068, 0.042, 0.036, 14)),
      matWhite
    )
  );
  const crowGallery = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.056, 0.056, 0.052, 14)),
    matWhite
  );
  crowGallery.position.y = 0.042;
  crowsNest.add(crowGallery);

  const crowWinBand = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.058, 0.058, 0.022, 14)),
    matWindow
  );
  crowWinBand.position.y = 0.044;
  crowsNest.add(crowWinBand);

  const crowDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.058, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52)),
    matDome
  );
  crowDome.position.y = 0.066;
  crowsNest.add(crowDome);

  const topPole = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.005, 0.006, 0.09, 6)),
    matMast
  );
  topPole.position.y = 0.155;
  crowsNest.add(topPole);

  const topFlag = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.09, 0.062)),
    matFlag
  );
  topFlag.position.set(0, 0.17, -0.045);
  topFlag.rotation.y = Math.PI * 0.5;
  crowsNest.add(topFlag);

  // 7. Aft Mizzen Mast (White upper sail + Red/Black striped lower sail)
  const aftMast = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.02, 0.026, 0.58, 10)),
    matMast
  );
  aftMast.position.set(0, 0.52, -0.22);
  hullPivot.add(aftMast);

  const aftYardTop = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.44, 8)),
    matMast
  );
  aftYardTop.rotation.z = Math.PI * 0.5;
  aftYardTop.position.set(0, 0.72, -0.20);
  hullPivot.add(aftYardTop);

  const aftYardMid = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.011, 0.011, 0.42, 8)),
    matMast
  );
  aftYardMid.rotation.z = Math.PI * 0.5;
  aftYardMid.position.set(0, 0.52, -0.20);
  hullPivot.add(aftYardMid);

  const aftUpperSail = new THREE.Mesh(
    trackGeo(createBillowingSailGeometry(0.40, 0.19, 0.075)),
    matWhiteSail
  );
  aftUpperSail.position.set(0, 0.62, -0.195);
  hullPivot.add(aftUpperSail);

  const aftLowerSail = new THREE.Mesh(
    trackGeo(createBillowingSailGeometry(0.38, 0.21, 0.075)),
    matAftStripedSail
  );
  aftLowerSail.position.set(0, 0.41, -0.195);
  hullPivot.add(aftLowerSail);

  const aftFlag = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.075, 0.052)),
    matFlag
  );
  aftFlag.position.set(0, 0.80, -0.26);
  aftFlag.rotation.y = Math.PI * 0.5;
  hullPivot.add(aftFlag);

  // 8. Stern Lighthouse / Telescope Dome Turret (Starboard Aft)
  const sternTurret = new THREE.Group();
  sternTurret.position.set(-0.115, 0.28, -0.31);
  hullPivot.add(sternTurret);

  const turretCol = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.044, 0.048, 0.14, 12)),
    matWhite
  );
  turretCol.position.y = 0.06;
  sternTurret.add(turretCol);

  const turretWin = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.046, 0.046, 0.032, 12)),
    matWindow
  );
  turretWin.position.y = 0.115;
  sternTurret.add(turretWin);

  const turretDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.048, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52)),
    matDome
  );
  turretDome.position.y = 0.132;
  sternTurret.add(turretDome);

  // 9. Dynamic Sea-Foam Wake Trail & Bow-Displaced Water Shaders at Waterline
  const wakeUniforms = {
    uTime: { value: 0 },
    uFlowPhase: { value: 0 },
    uSpeedNorm: { value: 0 },
    uWakeIntensity: { value: 0 },
    uBowIntensity: { value: 0 },
    uBoostIntensity: { value: 0 },
    uSkyZoneMix: { value: 0 },
  };

  // Subdivided trailing wake ribbon behind the stern (+Z is bow, -Z is stern; after rotateX(-PI/2), uv.y=0 is +Z/stern-start and uv.y=1 is -Z/aft-tail)
  const wakeGeo = trackGeo(new THREE.PlaneGeometry(1.56, 2.85, 12, 24));
  wakeGeo.rotateX(-Math.PI * 0.5);
  const matWake = trackMat(
    new THREE.ShaderMaterial({
      uniforms: wakeUniforms,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      side: THREE.DoubleSide,
      vertexShader: `
        uniform float uTime;
        uniform float uFlowPhase;
        uniform float uSpeedNorm;
        uniform float uBoostIntensity;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          vec3 pos = position;
          // Subtle 3D froth undulation streaming aft (uv.y = 0 at stern -> 1 at tail)
          float aft = uv.y;
          float ripple = sin(aft * 16.0 - uFlowPhase * 3.8) * cos(uv.x * 12.0 + uTime * 2.4);
          float armBell = exp(-pow(abs(uv.x - 0.5) - (0.09 + aft * 0.25), 2.0) * 65.0);
          pos.y += (0.012 * armBell + 0.008 * ripple) * (0.2 + uSpeedNorm + uBoostIntensity * 0.5) * (1.0 - aft * 0.6);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uFlowPhase;
        uniform float uSpeedNorm;
        uniform float uWakeIntensity;
        uniform float uBoostIntensity;
        uniform float uSkyZoneMix;
        varying vec2 vUv;

        float hash21(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 34.5);
          return fract(p.x * p.y);
        }

        float noise2D(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        float fbmFoam(vec2 p) {
          float v = 0.0;
          float a = 0.55;
          for (int i = 0; i < 3; i++) {
            v += a * noise2D(p);
            p = p * 2.13 + vec2(9.2, 5.7);
            a *= 0.48;
          }
          return v;
        }

        void main() {
          if (uWakeIntensity <= 0.01) discard;
          float aft = vUv.y; // 0 = right behind stern, 1 = far aft tail
          float xSigned = (vUv.x - 0.5) * 2.0;
          float xAbs = abs(xSigned);

          // Fade in cleanly right under stern and taper smoothly to 0 at tail & outer edges
          float headFade = smoothstep(0.0, 0.07, aft);
          float tailFade = 1.0 - smoothstep(0.45, 0.99, aft);
          float sideFade = 1.0 - smoothstep(0.68, 0.99, xAbs);

          // Flowing noise scrolled aft (+uv.y) along the wake
          vec2 flowUv = vec2(xSigned * 4.2, aft * 6.8 - uFlowPhase * 1.85);
          float f1 = fbmFoam(flowUv);
          float f2 = fbmFoam(vec2(xSigned * 7.5 + sin(aft * 9.0 - uFlowPhase) * 0.25, aft * 11.0 - uFlowPhase * 2.4));
          float bubbles = smoothstep(0.32, 0.82, f1 * 0.62 + f2 * 0.38);

          // Twin Kelvin V-wake arms widening behind stern
          float armCenter = 0.14 + aft * (0.48 + uBoostIntensity * 0.12);
          float armWidth = mix(0.085, 0.19, aft);
          float kelvinArm = exp(-pow((xAbs - armCenter) / armWidth, 2.0));
          float armScallop = 0.55 + 0.45 * sin(aft * 26.0 - uFlowPhase * 3.4 + f1 * 3.5);

          // Central paddle-wheel & rudder turbulent whitewater wash
          float centerSpread = mix(0.18, 0.36, aft);
          float centerWash = exp(-pow(xAbs / centerSpread, 2.0)) * (1.0 - smoothstep(0.15, 0.88, aft));
          float paddleChurn = 0.52 + 0.48 * sin(aft * 32.0 - uFlowPhase * 4.5 + xAbs * 5.0);

          float foamMask =
            kelvinArm * (0.48 + 0.72 * bubbles) * armScallop +
            centerWash * (0.42 + 0.78 * bubbles) * paddleChurn * (0.55 + 0.65 * uSpeedNorm + uBoostIntensity * 0.55);

          // Subtle bright turquoise displaced water glow around the V-wake
          float waterSwirl = (kelvinArm * 0.55 + centerWash * 0.45) * (0.35 + 0.45 * f1);

          float alpha = clamp((foamMask * 0.88 + waterSwirl * 0.28) * headFade * tailFade * sideFade * (0.28 + uWakeIntensity * 0.78), 0.0, 0.92);
          if (alpha <= 0.008) discard;

          vec3 waterCol = mix(vec3(0.45, 0.86, 0.98), vec3(0.56, 0.95, 1.0), uBoostIntensity);
          vec3 cloudFoamCol = mix(vec3(0.88, 0.97, 1.0), vec3(1.0, 0.99, 0.97), uSkyZoneMix);
          vec3 foamCol = mix(waterCol, cloudFoamCol, clamp(foamMask * 1.15, 0.0, 1.0));

          gl_FragColor = vec4(foamCol, alpha);
        }
      `,
    })
  );
  const wakeMesh = new THREE.Mesh(wakeGeo, matWake);
  wakeMesh.position.set(0, 0.047, -1.68);
  wakeMesh.renderOrder = 4;
  root.add(wakeMesh);

  // Bow-wave & displaced hull-side rushing water collar wrapping Sunny's waterline
  const bowWaterGeo = trackGeo(new THREE.PlaneGeometry(1.42, 1.62, 16, 18));
  bowWaterGeo.rotateX(-Math.PI * 0.5);
  const matBowWater = trackMat(
    new THREE.ShaderMaterial({
      uniforms: wakeUniforms,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      side: THREE.DoubleSide,
      vertexShader: `
        uniform float uTime;
        uniform float uFlowPhase;
        uniform float uSpeedNorm;
        uniform float uBoostIntensity;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          vec3 pos = position;
          // uv.y = 0 at bow (+Z), uv.y = 1 at stern (-Z)
          float foreToAft = uv.y;
          float xSigned = (uv.x - 0.5) * 2.0;
          float xAbs = abs(xSigned);
          float bowDist = max(0.0, foreToAft - 0.14);
          float bowCurveX = 0.06 + bowDist * 0.72;
          float onBowWave = exp(-pow((xAbs - bowCurveX) / 0.16, 2.0)) * smoothstep(0.08, 0.2, foreToAft) * (1.0 - smoothstep(0.55, 0.96, foreToAft));
          float swell = sin(foreToAft * 18.0 - uFlowPhase * 3.5 + xAbs * 6.0) * 0.5 + 0.5;
          pos.y += onBowWave * (0.012 + 0.024 * swell) * (0.25 + uSpeedNorm + uBoostIntensity * 0.65);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uFlowPhase;
        uniform float uSpeedNorm;
        uniform float uBowIntensity;
        uniform float uBoostIntensity;
        uniform float uSkyZoneMix;
        varying vec2 vUv;

        float hash21(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 34.5);
          return fract(p.x * p.y);
        }

        float noise2D(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        void main() {
          if (uBowIntensity <= 0.01) discard;
          float foreToAft = vUv.y; // 0 = bow tip, 1 = behind stern
          float xSigned = (vUv.x - 0.5) * 2.0;
          float xAbs = abs(xSigned);

          // Elliptical hull footprint mask so water hugs the hull rim cleanly
          float hullZ = (foreToAft - 0.48) / 0.34;
          float hullX = xAbs / 0.33;
          float hullR = sqrt(hullX * hullX + hullZ * hullZ);
          float hullRim = exp(-pow((hullR - 1.04) / 0.24, 2.0)) * smoothstep(0.62, 0.92, hullR);

          // Bow V-crest parting off the prow and sweeping around port/starboard flanks
          float bowDist = max(0.0, foreToAft - 0.14);
          float bowArcX = 0.04 + sqrt(bowDist) * 0.72;
          float bowWave = exp(-pow((xAbs - bowArcX) / mix(0.10, 0.17, bowDist), 2.0))
            * smoothstep(0.06, 0.17, foreToAft)
            * (1.0 - smoothstep(0.58, 0.97, foreToAft));

          // Secondary outward-moving chevron ripples streaming bow -> stern along flanks
          float chevronCoord = foreToAft * 15.0 - xAbs * 9.5 - uFlowPhase * 3.1;
          float flowRipples = pow(0.5 + 0.5 * sin(chevronCoord), 2.2)
            * smoothstep(0.12, 0.32, foreToAft)
            * (1.0 - smoothstep(0.68, 0.98, foreToAft))
            * exp(-pow((hullR - 1.38) / 0.55, 2.0))
            * smoothstep(0.75, 1.0, hullR);

          float n = noise2D(vec2(xSigned * 8.0, foreToAft * 12.0 - uFlowPhase * 2.3));
          float n2 = noise2D(vec2(xSigned * 14.0, foreToAft * 18.0 - uFlowPhase * 3.1));
          float sprayNoise = smoothstep(0.28, 0.84, n * 0.6 + n2 * 0.4);

          float bowSpray = bowWave * (0.55 + 0.65 * sprayNoise);
          float collarFoam = hullRim * (0.35 + 0.65 * sprayNoise) * (0.28 + uSpeedNorm * 0.72);
          float movingWater = flowRipples * (0.45 + 0.55 * n) * (0.15 + uSpeedNorm * 0.85);

          float outerFade = (1.0 - smoothstep(0.72, 0.99, xAbs))
            * smoothstep(0.02, 0.12, foreToAft)
            * (1.0 - smoothstep(0.78, 0.99, foreToAft));

          float total = (bowSpray * 0.95 + collarFoam * 0.78 + movingWater * 0.72) * outerFade * uBowIntensity;
          float alpha = clamp(total, 0.0, 0.86);
          if (alpha <= 0.008) discard;

          vec3 rippleWaterCol = mix(vec3(0.42, 0.84, 0.98), vec3(0.62, 0.96, 1.0), uBoostIntensity);
          vec3 crestFoamCol = mix(vec3(0.91, 0.98, 1.0), vec3(1.0, 0.99, 0.97), uSkyZoneMix);
          vec3 col = mix(rippleWaterCol, crestFoamCol, clamp((bowSpray + collarFoam) * 1.15, 0.0, 1.0));

          gl_FragColor = vec4(col, alpha);
        }
      `,
    })
  );
  const bowWaterMesh = new THREE.Mesh(bowWaterGeo, matBowWater);
  bowWaterMesh.position.set(0, 0.049, 0.02);
  bowWaterMesh.renderOrder = 4;
  root.add(bowWaterMesh);

  // 10. Giant Balloon Octopus (Poulpe-Montgolfière) for gliding down from Skypiea
  const octopusTex = trackTex(createOctopusBalloonTexture());
  const matOctoBody = trackMat(
    new THREE.MeshStandardMaterial({
      map: octopusTex,
      roughness: 0.52,
      metalness: 0.04,
    })
  );
  const matOctoTentacle = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xed6a70,
      roughness: 0.58,
      metalness: 0.03,
    })
  );
  const matOctoBelly = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffc6c6,
      roughness: 0.62,
      metalness: 0.02,
    })
  );
  const matOctoPupil = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x151822,
      roughness: 0.25,
    })
  );
  const matRope = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd9b37c,
      roughness: 0.88,
    })
  );

  const octopusGroup = new THREE.Group();
  octopusGroup.position.set(0, 1.56, -0.02);
  octopusGroup.visible = false;
  hullPivot.add(octopusGroup);

  // Giant inflated balloon mantle
  const octoMantle = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.56, 22, 16)),
    matOctoBody
  );
  octoMantle.scale.set(1.06, 0.94, 1.06);
  octoMantle.position.set(0, 0.08, 0);
  octopusGroup.add(octoMantle);

  // Subtle puffed crown crest
  const octoCrown = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.22, 14, 10)),
    matOctoBody
  );
  octoCrown.scale.set(1.15, 0.68, 1.15);
  octoCrown.position.set(0, 0.54, -0.03);
  octopusGroup.add(octoCrown);

  // Lower head/collar where eyes, mouth & tentacles attach
  const octoHead = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.27, 16, 12)),
    matOctoTentacle
  );
  octoHead.scale.set(1.05, 0.85, 1.05);
  octoHead.position.set(0, -0.44, 0.02);
  octopusGroup.add(octoHead);

  // Iconic pursed anime "O" siphon mouth facing forward (+Z)
  const octoMouthLip = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.068, 0.024, 10, 18)),
    matOctoBelly
  );
  octoMouthLip.position.set(0, -0.45, 0.29);
  octopusGroup.add(octoMouthLip);

  const octoMouthHole = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.052, 14)),
    matOctoPupil
  );
  octoMouthHole.position.set(0, -0.45, 0.292);
  octopusGroup.add(octoMouthHole);

  // Two cute anime eyes
  const octoEyeWhiteGeo = trackGeo(new THREE.SphereGeometry(0.082, 12, 10));
  const octoPupilGeo = trackGeo(new THREE.SphereGeometry(0.046, 10, 10));
  const octoGlintGeo = trackGeo(new THREE.SphereGeometry(0.018, 8, 8));
  for (const side of [-1, 1] as const) {
    const eyeWhite = new THREE.Mesh(octoEyeWhiteGeo, matWhite);
    eyeWhite.scale.set(0.95, 1.1, 0.65);
    eyeWhite.position.set(side * 0.145, -0.32, 0.245);
    eyeWhite.rotation.y = side * 0.26;
    octopusGroup.add(eyeWhite);

    const pupil = new THREE.Mesh(octoPupilGeo, matOctoPupil);
    pupil.scale.set(0.9, 1.05, 0.6);
    pupil.position.set(side * 0.155, -0.32, 0.285);
    octopusGroup.add(pupil);

    const glint = new THREE.Mesh(octoGlintGeo, matWhite);
    glint.position.set(side * 0.135, -0.295, 0.312);
    octopusGroup.add(glint);
  }

  // 8 Curved Tentacles hugging Sunny's yardarms, masts & rails
  const tentacleTips: THREE.Vector3[] = [
    new THREE.Vector3(0.32, -0.82, 0.08),
    new THREE.Vector3(-0.32, -0.82, 0.08),
    new THREE.Vector3(0.24, -1.16, 0.24),
    new THREE.Vector3(-0.24, -1.16, 0.24),
    new THREE.Vector3(0.26, -1.04, -0.22),
    new THREE.Vector3(-0.26, -1.04, -0.22),
    new THREE.Vector3(0.09, -0.78, 0.14),
    new THREE.Vector3(-0.09, -0.86, -0.24),
  ];
  tentacleTips.forEach((tip, idx) => {
    const angle = Math.atan2(tip.x, tip.z);
    const rootPt = new THREE.Vector3(
      Math.sin(angle) * 0.18,
      -0.52,
      Math.cos(angle) * 0.18
    );
    const midOut = new THREE.Vector3(
      tip.x * 1.18,
      -0.68 - (idx % 2) * 0.08,
      tip.z * 1.18
    );
    const curve = new THREE.CatmullRomCurve3([rootPt, midOut, tip]);
    const tentGeo = trackGeo(new THREE.TubeGeometry(curve, 16, 0.036, 7, false));
    octopusGroup.add(new THREE.Mesh(tentGeo, matOctoTentacle));

    const tipBulb = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.034, 8, 8)),
      matOctoBelly
    );
    tipBulb.position.copy(tip);
    octopusGroup.add(tipBulb);
  });

  // 4 Taut Lashing Lines from collar down to Sunny's deck/yardarms
  const ropeTargets: THREE.Vector3[] = [
    new THREE.Vector3(0.21, -1.32, 0.20),
    new THREE.Vector3(-0.21, -1.32, 0.20),
    new THREE.Vector3(0.20, -1.28, -0.24),
    new THREE.Vector3(-0.20, -1.28, -0.24),
  ];
  for (const target of ropeTargets) {
    const start = new THREE.Vector3(
      Math.sign(target.x) * 0.14,
      -0.48,
      Math.sign(target.z) * 0.12
    );
    const curve = new THREE.LineCurve3(start, target);
    const ropeGeo = trackGeo(new THREE.TubeGeometry(curve, 2, 0.008, 5, false));
    octopusGroup.add(new THREE.Mesh(ropeGeo, matRope));
  }

  // Translucent Yarukiman Mangrove Resin Coating Bubble enveloping Thousand Sunny
  const coatingMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xa5f3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.24,
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const coatingBubble = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.92, 24, 18)),
    coatingMat
  );
  coatingBubble.position.set(0, 0.44, 0.04);
  coatingBubble.scale.set(0.92, 0.88, 1.15);
  coatingBubble.visible = false;
  hullPivot.add(coatingBubble);

  const flags = [topFlag, aftFlag];
  let lastUpdateElapsed = 0;
  let flowPhase = 0;

  return {
    group: root,
    hullPivot,
    octopusGroup,
    coatingBubble,
    wakeMesh,
    bowWaterMesh,
    flags,
    paddles,
    update: (
      elapsed: number,
      speed: number,
      bankAngle: number,
      options?: SunnyShipUpdateOptions
    ) => {
      const absSpeed = Math.abs(speed);
      const deploy = Math.max(0, Math.min(1, options?.balloonDeploy ?? 0));
      const skyZone = options?.skyZone ?? 'blue-sea';
      const isCoated = Boolean(options?.coated);
      const inAir =
        skyZone === 'balloon-glide' || skyZone === 'knock-up-stream';
      const inSubsea =
        skyZone === 'subsea-dive' || skyZone === 'fish-man-island';

      const wavePitch = options?.wavePitch ?? 0;
      const waveRoll = options?.waveRoll ?? 0;
      const waveCrest = options?.waveCrest ?? 0.5;
      const seaRoughness = Math.max(0, Math.min(1, options?.seaRoughness ?? 0.2));

      const idleScale = 0.2 + seaRoughness * 2.4;
      const bob = inAir
        ? Math.sin(elapsed * 2.1) * 0.018
        : Math.sin(elapsed * (2.2 + seaRoughness * 1.1)) *
          (0.0018 * idleScale + absSpeed * 0.018);
      const stormPitch =
        Math.sin(elapsed * 2.1 + 0.8) * 0.011 * idleScale +
        Math.sin(elapsed * 3.6 - 0.4) * 0.018 * seaRoughness;
      const stormRoll =
        Math.cos(elapsed * 1.9) * 0.008 * idleScale +
        Math.cos(elapsed * 3.1 + 1.1) * 0.024 * seaRoughness;
      const pitch = inAir
        ? Math.sin(elapsed * 1.7) * 0.045
        : -wavePitch * (0.9 + seaRoughness * 0.35) + stormPitch - absSpeed * 0.16;

      hullPivot.position.y = bob;
      hullPivot.rotation.x = pitch;
      hullPivot.rotation.z =
        bankAngle + waveRoll * (0.9 + seaRoughness * 0.35) + stormRoll;

      coatingBubble.visible = isCoated;
      if (isCoated) {
        const pulse = 1 + Math.sin(elapsed * 3.1) * 0.018;
        coatingBubble.scale.set(0.92 * pulse, 0.88 * (2 - pulse), 1.15 * pulse);
        coatingMat.opacity = inSubsea ? 0.34 : 0.26;
      }

      for (const paddle of paddles) {
        paddle.rotation.x += speed * 0.9;
      }
      const flagFreq = 6.5 + seaRoughness * 8.5;
      const flagAmp = 0.12 + seaRoughness * 0.26;
      for (let i = 0; i < flags.length; i++) {
        flags[i].rotation.z = Math.sin(elapsed * flagFreq + i * 1.4) * flagAmp;
      }

      if (deploy > 0.01) {
        octopusGroup.visible = true;
        // Overshoot ease-out pop inflation + rhythmic float pulse
        const t = deploy;
        const c1 = 1.70158;
        const c3 = c1 + 1;
        const popScale =
          1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        const pulse = 1 + Math.sin(elapsed * 3.8) * 0.032 * t;
        octopusGroup.scale.set(
          Math.max(0.05, popScale * pulse),
          Math.max(0.05, popScale * (2 - pulse)),
          Math.max(0.05, popScale * pulse)
        );
        octopusGroup.position.y = 1.05 + t * 0.51;
        octopusGroup.rotation.z =
          -bankAngle * 0.45 + Math.sin(elapsed * 1.65) * 0.06;
        octopusGroup.rotation.x = Math.cos(elapsed * 1.35) * 0.045;
      } else {
        octopusGroup.visible = false;
      }

      const dt = Math.max(0, Math.min(0.1, elapsed - lastUpdateElapsed));
      lastUpdateElapsed = elapsed;
      const wakeMetrics = computeSunnyWakeMetrics({
        speed,
        boostActive: options?.boostActive,
        waveCrest,
        skyZone,
      });

      if (!wakeMetrics.visible) {
        wakeMesh.visible = false;
        bowWaterMesh.visible = false;
      } else {
        flowPhase += dt * wakeMetrics.flowRate;
        wakeUniforms.uTime.value = elapsed;
        wakeUniforms.uFlowPhase.value = flowPhase;
        wakeUniforms.uSpeedNorm.value = wakeMetrics.speedNorm;
        wakeUniforms.uWakeIntensity.value = wakeMetrics.wakeIntensity;
        wakeUniforms.uBowIntensity.value = wakeMetrics.bowIntensity;
        wakeUniforms.uBoostIntensity.value = wakeMetrics.boostIntensity;
        wakeUniforms.uSkyZoneMix.value = skyZone === 'skypiea' ? 1 : 0;

        wakeMesh.visible = true;
        wakeMesh.scale.set(
          wakeMetrics.trailWidthScale,
          1,
          wakeMetrics.trailLengthScale
        );
        wakeMesh.position.z = -0.26 - 1.425 * wakeMetrics.trailLengthScale;

        bowWaterMesh.visible = true;
        bowWaterMesh.scale.set(
          0.95 + wakeMetrics.speedNorm * 0.16 + wakeMetrics.boostIntensity * 0.12,
          1,
          0.96 + wakeMetrics.speedNorm * 0.14
        );
      }
    },
    dispose: () => {
      disposables.geometries.forEach((g) => g.dispose());
      disposables.materials.forEach((m) => m.dispose());
      disposables.textures.forEach((t) => t.dispose());
    },
  };
}
