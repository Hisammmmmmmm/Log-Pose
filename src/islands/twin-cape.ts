import * as THREE from 'three';
import {
  TWIN_CAPE_APRON_Y,
  TWIN_CAPE_CROCUS_HOUSE,
  TWIN_CAPE_GLOBE_SCALE,
  TWIN_CAPE_LABOON,
  TWIN_CAPE_LEFT_LIGHTHOUSE,
  TWIN_CAPE_PROMONTORY_Y,
  TWIN_CAPE_RIGHT_LIGHTHOUSE,
  toTwinCapeSphereLocal,
} from '../utils/twinCapeTerrain';
import type { IslandMeshContext, IslandMeshInstance } from './types';

function createLighthouseStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Off-white sun-bleached coastal stucco & pale limestone base
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#f3f2eb');
  grad.addColorStop(0.55, '#e6e5dd');
  grad.addColorStop(1, '#d3d4cc');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Staggered subtle weathered stone patches matching anime lighthouse shading
  let seed = 17;
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let cluster = 0; cluster < 34; cluster++) {
    const cx = nextRand() * 480;
    const cy = nextRand() * 480;
    const rows = 2 + Math.floor(nextRand() * 2);
    const cols = 3 + Math.floor(nextRand() * 3);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (nextRand() < 0.35) continue;
        const bx = cx + c * 14 + (r % 2) * 7;
        const by = cy + r * 8;
        ctx.fillStyle =
          nextRand() > 0.5 ? 'rgba(176, 179, 170, 0.55)' : 'rgba(156, 160, 152, 0.50)';
        ctx.fillRect(bx, by, 12, 6);
        ctx.strokeStyle = 'rgba(92, 96, 90, 0.22)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, 12, 6);
      }
    }
  }

  // Subtle vertical sea-spray weathering streaks
  for (let i = 0; i < 60; i++) {
    const x = nextRand() * 512;
    const y = nextRand() * 512;
    const h = 24 + nextRand() * 70;
    ctx.fillStyle = 'rgba(130, 136, 130, 0.08)';
    ctx.fillRect(x, y, 2 + nextRand() * 4, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createVerdigrisRoofTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#5ea190');
  grad.addColorStop(0.5, '#498476');
  grad.addColorStop(1, '#336258');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Copper standing seams
  ctx.strokeStyle = 'rgba(24, 48, 43, 0.48)';
  ctx.lineWidth = 3;
  for (let x = 0; x < 256; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createCottageBrickTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#c4a16f';
  ctx.fillRect(0, 0, 256, 256);

  for (let row = 0; row < 24; row++) {
    const y = row * 11;
    const offset = (row % 2) * 14;
    ctx.fillStyle = 'rgba(110, 82, 46, 0.35)';
    ctx.fillRect(0, y, 256, 1.5);
    for (let x = -offset; x < 256; x += 28) {
      const shade = ((row * 7 + x) % 3) * 10 - 10;
      ctx.fillStyle = `rgb(${188 + shade}, ${152 + shade}, ${102 + shade})`;
      ctx.fillRect(x + 1.5, y + 1.5, 25, 8.5);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createCrimsonCliffTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Match Reverse Mountain's deep terracotta-crimson strata
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#853129');
  grad.addColorStop(0.5, '#66201b');
  grad.addColorStop(1, '#471513');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle horizontal geological strata lines
  for (let y = 0; y < 256; y += 18) {
    ctx.fillStyle =
      (y / 18) % 2 === 0
        ? 'rgba(158, 72, 58, 0.14)'
        : 'rgba(38, 10, 10, 0.18)';
    ctx.fillRect(0, y, 256, 8);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createLaboonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Deep slate-teal whale skin gradient (top lighter slate-blue, flanks deeper navy)
  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, '#366178');
  bg.addColorStop(0.48, '#284c60');
  bg.addColorStop(0.75, '#193345');
  bg.addColorStop(1, '#11222f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle dark shadowed arch on Laboon's lower brow/muzzle (centered around u = 0.5 -> px = 512)
  const muzzleShade = ctx.createRadialGradient(512, 330, 35, 512, 320, 210);
  muzzleShade.addColorStop(0, 'rgba(11, 24, 34, 0.84)');
  muzzleShade.addColorStop(0.72, 'rgba(13, 28, 39, 0.52)');
  muzzleShade.addColorStop(1, 'rgba(13, 28, 39, 0.0)');
  ctx.fillStyle = muzzleShade;
  ctx.fillRect(260, 150, 504, 350);

  // Jagged battle/ramming scars around Laboon's forehead & brow (Image 2)
  const drawScar = (
    pts: readonly [number, number][],
    branchPts?: readonly [number, number][]
  ) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#292423';
    ctx.lineWidth = 11;
    ctx.beginPath();
    pts.forEach(([x, y], idx) => (idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();

    ctx.strokeStyle = '#8b8077';
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    pts.forEach(([x, y], idx) => (idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();

    if (branchPts) {
      ctx.strokeStyle = '#292423';
      ctx.lineWidth = 8.5;
      ctx.beginPath();
      branchPts.forEach(([x, y], idx) =>
        idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      );
      ctx.stroke();
      ctx.strokeStyle = '#8b8077';
      ctx.lineWidth = 4.8;
      ctx.beginPath();
      branchPts.forEach(([x, y], idx) =>
        idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      );
      ctx.stroke();
    }
  };

  drawScar(
    [
      [415, 175],
      [442, 222],
      [428, 260],
    ],
    [
      [405, 208],
      [458, 234],
    ]
  );
  drawScar(
    [
      [584, 172],
      [556, 218],
      [578, 258],
    ],
    [
      [540, 206],
      [598, 228],
    ]
  );
  drawScar(
    [
      [484, 198],
      [508, 240],
      [494, 276],
    ],
    [
      [472, 232],
      [524, 246],
    ]
  );
  drawScar([
    [354, 186],
    [374, 232],
    [362, 268],
  ]);
  drawScar([
    [652, 184],
    [630, 228],
    [644, 264],
  ]);

  // Luffy's iconic hand-painted White Straw Hat Jolly Roger centered on Laboon's forehead (px=512, py=152)
  ctx.save();
  ctx.translate(512, 152);
  ctx.scale(0.86, 0.86);

  // Crossed bones behind skull
  const drawBone = (angle: number) => {
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-86, -8, 172, 16, 6);
    ctx.fill();
    ctx.stroke();
    for (const sx of [-84, 84]) {
      for (const sy of [-8, 8]) {
        ctx.beginPath();
        ctx.arc(sx, sy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  drawBone(0.46);
  drawBone(-0.46);

  // White hand-drawn skull dome & jaw
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.ellipse(0, -10, 48, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Grinning crosshatched jaw (Luffy's sketchy style!)
  ctx.beginPath();
  ctx.roundRect(-34, 14, 68, 36, 16);
  ctx.fill();
  ctx.stroke();

  // Crosshatched teeth lines
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-26, 32);
  ctx.lineTo(26, 32);
  for (let tx = -18; tx <= 18; tx += 12) {
    ctx.moveTo(tx, 19);
    ctx.lineTo(tx, 46);
  }
  ctx.stroke();

  // Eye sockets & tiny nose triangle
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(-18, -8, 10, 12, 0.1, 0, Math.PI * 2);
  ctx.ellipse(18, -8, 10, 12, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(-5, 11);
  ctx.lineTo(5, 11);
  ctx.closePath();
  ctx.fill();

  // Yellow Straw Hat crown & brim tilted cheerfully on top of skull
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, -34, 34, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-34, -40, 68, 7);
  ctx.strokeRect(-34, -40, 68, 7);
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.ellipse(0, -33, 56, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createIslandMesh(
  ctx: IslandMeshContext
): IslandMeshInstance {
  const { globeRadius, trackGeo, trackMat, trackTex } = ctx;
  const maxAniso = 4;
  const registerTex = <T extends THREE.Texture>(t: T): T => {
    t.anisotropy = maxAniso;
    return trackTex ? trackTex(t) : t;
  };

  const group = new THREE.Group();
  group.name = 'island-twin-cape';

  // Keep spherical curvature anchored at Twin Cape's exact center while preserving local readability
  const twinRoot = new THREE.Group();
  const centerSp = toTwinCapeSphereLocal(0, 0, 0, globeRadius);
  twinRoot.position.set(centerSp.x, centerSp.y, centerSp.z);
  group.add(twinRoot);

  // Textures
  const lighthouseStoneTex = registerTex(createLighthouseStoneTexture());
  const verdigrisTex = registerTex(createVerdigrisRoofTexture());
  const cottageBrickTex = registerTex(createCottageBrickTexture());
  const crimsonCliffTex = registerTex(createCrimsonCliffTexture());
  const laboonTex = registerTex(createLaboonTexture());

  // Materials (varied roughness & metalness across adjacent parts per Three.js skill)
  const crimsonCliffMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: crimsonCliffTex,
      roughness: 0.92,
      metalness: 0.03,
    })
  );
  const apronStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd8dad3,
      roughness: 0.88,
      metalness: 0.04,
    })
  );
  const lighthouseWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: lighthouseStoneTex,
      roughness: 0.86,
      metalness: 0.03,
    })
  );
  const verdigrisCupolaMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: verdigrisTex,
      roughness: 0.56,
      metalness: 0.22,
    })
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e252c,
      roughness: 0.42,
      metalness: 0.72,
    })
  );
  const lanternGlassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      roughness: 0.14,
      metalness: 0.12,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
  );
  const beaconGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe0f7ff,
      emissive: 0x6fd8ff,
      emissiveIntensity: 1.55,
      roughness: 0.2,
    })
  );
  const cottagePlasterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xefede4,
      roughness: 0.88,
      metalness: 0.02,
    })
  );
  const cottageBrickMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: cottageBrickTex,
      roughness: 0.87,
      metalness: 0.03,
    })
  );
  const darkWoodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c3820,
      roughness: 0.76,
      metalness: 0.04,
    })
  );
  const chimneyStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x9fa6aa,
      roughness: 0.85,
      metalness: 0.06,
    })
  );
  const laboonSkinMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: laboonTex,
      roughness: 0.78,
      metalness: 0.03,
    })
  );
  const laboonDarkBellyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x162938,
      roughness: 0.66,
      metalness: 0.05,
    })
  );
  const mouthGulletMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3a1c20,
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );
  const pinkTongueMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd98f9d,
      roughness: 0.45,
      metalness: 0.04,
    })
  );
  const ivoryToothMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfaf7ef,
      roughness: 0.28,
      metalness: 0.04,
    })
  );
  const foamMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6f7ff,
      roughness: 0.35,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    })
  );
  const smokeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.94,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
  );

  // Shared unit geometries
  const unitBox = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const unitCyl = trackGeo(new THREE.CylinderGeometry(1, 1, 1, 18));
  const unitSphere = trackGeo(new THREE.SphereGeometry(1, 16, 12));

  // Sphere-drop correction helper (local Twin Cape units) so peripheral elements match curved globe radius
  const sphereDropY = (lx: number, lz: number) => {
    const sx = lx * TWIN_CAPE_GLOBE_SCALE;
    const sz = lz * TWIN_CAPE_GLOBE_SCALE;
    return (
      (Math.sqrt(Math.max(0.1, globeRadius * globeRadius - sx * sx - sz * sz)) -
        globeRadius) /
      TWIN_CAPE_GLOBE_SCALE
    );
  };

  // Scale helper: wraps flat-space parts at TWIN_CAPE_GLOBE_SCALE
  const worldScaleRoot = new THREE.Group();
  worldScaleRoot.scale.setScalar(TWIN_CAPE_GLOBE_SCALE);
  twinRoot.add(worldScaleRoot);

  // =========================================================================
  // 1. TWO FLANKING CRIMSON CAPE PROMONTORIES AT REVERSE MOUNTAIN MOUTH
  // =========================================================================
  const buildCapePromontory = (sideSign: 1 | -1) => {
    const capeGroup = new THREE.Group();
    const cz = sideSign * 115;
    const dropY = sphereDropY(-6, cz);
    capeGroup.position.y = dropY;

    // Sculpted crimson headland buttress embedded seamlessly beneath Reverse Mountain's 55-unit shelf
    const cliffButtress = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(28, 44, 68, 16)),
      crimsonCliffMat
    );
    cliffButtress.scale.set(1.25, 1, 1.12);
    cliffButtress.position.set(-12, 18.5, cz);
    capeGroup.add(cliffButtress);

    // Coastal reef boulders & sea foam along the lower sea-edge of the headland
    const rockOffsets: readonly [number, number, number, number][] = [
      [22, 2.5, cz - sideSign * 26, 7.2],
      [16, 4.0, cz + sideSign * 26, 6.0],
      [28, 2.0, cz, 5.2],
    ];
    for (const [rx, ry, rz, rs] of rockOffsets) {
      const boulder = new THREE.Mesh(
        trackGeo(new THREE.DodecahedronGeometry(rs, 1)),
        crimsonCliffMat
      );
      boulder.scale.set(1.25, 0.72, 1.05);
      boulder.position.set(rx, ry, rz);
      capeGroup.add(boulder);
    }

    // Thick weathered-limestone foundation apron terrace sitting solidly on cape shelf (top = 56.2)
    const apron = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(21.5, 27.5, 9.6, 28)),
      apronStoneMat
    );
    apron.position.set(-6, TWIN_CAPE_APRON_Y - 4.8, cz);
    capeGroup.add(apron);

    worldScaleRoot.add(capeGroup);
  };

  buildCapePromontory(1); // Left / South Cape (+Z)
  buildCapePromontory(-1); // Right / North Cape (-Z)

  // =========================================================================
  // 2. CONCAVE-FLARED TWIN LIGHTHOUSES (IMAGE 1: twin_cap_202e7a54.jpg)
  // =========================================================================
  const beaconSpinners: THREE.Object3D[] = [];

  // Concave-flared masonry shaft Lathe profile (y=0 -> y=36.5 relative to apron)
  const shaftProfile: THREE.Vector2[] = [];
  const shaftSteps = 18;
  for (let i = 0; i <= shaftSteps; i++) {
    const t = i / shaftSteps;
    const y = t * 36.5;
    // Iconic graceful concave trumpet flare from wide stone base (11.8) to narrow neck (5.4)
    const r =
      5.4 +
      6.4 * Math.pow(1 - t, 2.2) +
      (t > 0.88 ? ((t - 0.88) / 0.12) * 0.9 : 0);
    shaftProfile.push(new THREE.Vector2(r, y));
  }
  const lighthouseShaftGeo = trackGeo(new THREE.LatheGeometry(shaftProfile, 30));

  // Concave-flared oxidized green copper roof cupola Lathe profile
  const roofProfile: THREE.Vector2[] = [
    new THREE.Vector2(6.4, 0),
    new THREE.Vector2(5.7, 1.8),
    new THREE.Vector2(4.4, 4.2),
    new THREE.Vector2(2.6, 6.7),
    new THREE.Vector2(1.0, 9.0),
    new THREE.Vector2(0.18, 10.6),
  ];
  const cupolaGeo = trackGeo(new THREE.LatheGeometry(roofProfile, 26));

  const buildLighthouse = (cx: number, cz: number, faceYaw: number) => {
    const lh = new THREE.Group();
    lh.position.set(cx, TWIN_CAPE_APRON_Y + sphereDropY(cx, cz), cz);
    lh.rotation.y = faceYaw;

    // Tapered concave masonry body
    const shaft = new THREE.Mesh(lighthouseShaftGeo, lighthouseWallMat);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    lh.add(shaft);

    // Tall narrow lower front entrance slit & flush dark recessed windows (Image 1)
    const lowerSlit = new THREE.Mesh(unitBox, darkIronMat);
    lowerSlit.scale.set(0.6, 7.2, 0.88);
    lowerSlit.position.set(8.25, 4.2, 0);
    lowerSlit.rotation.z = 0.34;
    lh.add(lowerSlit);

    const smallWins: readonly [number, number, number][] = [
      [14.2, 0.28, 1.2],
      [19.8, -0.45, 1.15],
      [25.6, 0.40, 1.1],
      [30.5, -0.22, 1.05],
    ];
    for (const [wy, ang, sz] of smallWins) {
      const t = wy / 36.5;
      const rad = 5.4 + 6.4 * Math.pow(1 - t, 2.2) - 0.28;
      const win = new THREE.Mesh(unitBox, darkIronMat);
      win.scale.set(0.65, sz, sz * 1.15);
      win.position.set(Math.cos(ang) * rad, wy, Math.sin(ang) * rad);
      win.rotation.y = -ang;
      win.rotation.z = 0.16 * (1 - t);
      lh.add(win);
    }

    // Projecting stone gallery balcony & dark iron balustrade (y = 36.5..38.2)
    const gallerySlab = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(7.35, 6.2, 1.6, 28)),
      apronStoneMat
    );
    gallerySlab.position.y = 37.2;
    lh.add(gallerySlab);

    const railRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(7.05, 0.22, 8, 28)),
      darkIronMat
    );
    railRing.rotation.x = Math.PI * 0.5;
    railRing.position.y = 40.1;
    lh.add(railRing);

    const stanchions = 16;
    for (let i = 0; i < stanchions; i++) {
      const a = (i / stanchions) * Math.PI * 2;
      const post = new THREE.Mesh(unitBox, darkIronMat);
      post.scale.set(0.24, 2.2, 0.24);
      post.position.set(Math.cos(a) * 7.05, 39.0, Math.sin(a) * 7.05);
      lh.add(post);
    }

    // Glazed lantern room + dark iron mullions + glowing cylindrical Fresnel beacon core
    const glassDrum = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(5.15, 5.15, 9.2, 22)),
      lanternGlassMat
    );
    glassDrum.position.y = 42.6;
    glassDrum.renderOrder = 4;
    lh.add(glassDrum);

    const beaconHolder = new THREE.Group();
    beaconHolder.position.y = 42.8;
    const beaconCore = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.15, 2.35, 6.2, 16)),
      beaconGlowMat
    );
    const beaconCap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.55, 2.55, 0.85, 16)),
      darkIronMat
    );
    beaconCap.position.y = 3.2;
    beaconHolder.add(beaconCore, beaconCap);
    lh.add(beaconHolder);
    beaconSpinners.push(beaconHolder);

    for (const ry of [40.8, 44.0, 47.0]) {
      const ring = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(5.26, 0.16, 8, 24)),
        darkIronMat
      );
      ring.rotation.x = Math.PI * 0.5;
      ring.position.y = ry;
      lh.add(ring);
    }
    for (let m = 0; m < 10; m++) {
      const a = (m / 10) * Math.PI * 2;
      const mullion = new THREE.Mesh(unitBox, darkIronMat);
      mullion.scale.set(0.22, 9.2, 0.22);
      mullion.position.set(Math.cos(a) * 5.26, 42.6, Math.sin(a) * 5.26);
      lh.add(mullion);
    }

    // Verdigris green flared dome cupola & weathervane arrow finial (Image 1)
    const roof = new THREE.Mesh(cupolaGeo, verdigrisCupolaMat);
    roof.position.y = 47.0;
    lh.add(roof);

    const mast = new THREE.Mesh(unitCyl, darkIronMat);
    mast.scale.set(0.24, 4.8, 0.24);
    mast.position.y = 59.4;
    const crossBar = new THREE.Mesh(unitBox, darkIronMat);
    crossBar.scale.set(4.2, 0.26, 0.26);
    crossBar.position.y = 60.5;
    const vaneTip = new THREE.Mesh(unitBox, darkIronMat);
    vaneTip.scale.set(1.2, 0.9, 0.18);
    vaneTip.position.set(-1.7, 60.5, 0);
    lh.add(mast, crossBar, vaneTip);

    worldScaleRoot.add(lh);
  };

  buildLighthouse(TWIN_CAPE_LEFT_LIGHTHOUSE.x, TWIN_CAPE_LEFT_LIGHTHOUSE.z, 0.35);
  buildLighthouse(TWIN_CAPE_RIGHT_LIGHTHOUSE.x, TWIN_CAPE_RIGHT_LIGHTHOUSE.z, -0.35);

  // =========================================================================
  // 3. CROCUS'S HOUSE BEHIND THE LEFT LIGHTHOUSE (IMAGE 1 BOTTOM-RIGHT)
  // =========================================================================
  const houseGroup = new THREE.Group();
  const houseX = -21;
  const houseZ = 121;
  houseGroup.position.set(
    houseX,
    TWIN_CAPE_APRON_Y + sphereDropY(houseX, houseZ),
    houseZ
  );
  // Orient so tan-brick left flank peeks next to lighthouse and whitewashed entrance faces East-South
  houseGroup.rotation.y = 0.62;

  // Stone plinth foundation + external stairs leading down right beside lighthouse apron (Image 1)
  const housePlinth = new THREE.Mesh(unitBox, apronStoneMat);
  housePlinth.scale.set(17.5, 4.8, 13.5);
  housePlinth.position.y = -0.8;
  houseGroup.add(housePlinth);

  for (let s = 0; s < 5; s++) {
    const step = new THREE.Mesh(unitBox, apronStoneMat);
    step.scale.set(4.0, 0.48, 1.35);
    step.position.set(-4.2, -0.4 + s * 0.44, 7.6 + (4 - s) * 0.95);
    houseGroup.add(step);
  }

  // Tan brick side & rear walls + whitewashed front facade (Image 1)
  const brickCore = new THREE.Mesh(unitBox, cottageBrickMat);
  brickCore.scale.set(15.6, 10.2, 11.4);
  brickCore.position.y = 6.6;
  houseGroup.add(brickCore);

  const frontPlaster = new THREE.Mesh(unitBox, cottagePlasterMat);
  frontPlaster.scale.set(15.2, 10.0, 0.65);
  frontPlaster.position.set(0.25, 6.6, 5.55);
  houseGroup.add(frontPlaster);

  // Stone parapet cornice cap around cottage roof
  const parapet = new THREE.Mesh(unitBox, chimneyStoneMat);
  parapet.scale.set(16.6, 1.15, 12.2);
  parapet.position.y = 12.1;
  houseGroup.add(parapet);

  // Arched wooden front door + stone architrave + flanking arched multipane windows
  const doorFrame = new THREE.Mesh(unitBox, chimneyStoneMat);
  doorFrame.scale.set(3.1, 4.9, 0.5);
  doorFrame.position.set(0.2, 4.1, 5.82);
  const doorLeaf = new THREE.Mesh(unitBox, darkWoodMat);
  doorLeaf.scale.set(2.4, 4.4, 0.55);
  doorLeaf.position.set(0.2, 3.85, 5.9);
  const doorArch = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.2, 1.2, 0.55, 14)),
    darkWoodMat
  );
  doorArch.rotation.x = Math.PI * 0.5;
  doorArch.position.set(0.2, 6.05, 5.9);
  houseGroup.add(doorFrame, doorLeaf, doorArch);

  for (const wx of [-4.2, 4.6]) {
    const winFrame = new THREE.Mesh(unitBox, darkIronMat);
    winFrame.scale.set(2.2, 2.7, 0.45);
    winFrame.position.set(wx, 5.4, 5.85);
    const winGlass = new THREE.Mesh(unitBox, lanternGlassMat);
    winGlass.scale.set(1.75, 2.25, 0.5);
    winGlass.position.set(wx, 5.4, 5.88);
    houseGroup.add(winFrame, winGlass);
  }

  // Two prominent circular grey stone chimneys rising side-by-side from cottage roof (Image 1)
  const smokePuffs: { mesh: THREE.Mesh; baseY: number; phase: number }[] = [];
  for (const chx of [-3.6, 3.2]) {
    const chimneyDrum = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.05, 2.2, 5.4, 18)),
      chimneyStoneMat
    );
    chimneyDrum.position.set(chx, 15.2, 0.2);
    const chimneyLip = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.3, 2.3, 0.7, 18)),
      chimneyStoneMat
    );
    chimneyLip.position.set(chx, 17.9, 0.2);
    const chimneyFlue = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(1.6, 14)),
      darkIronMat
    );
    chimneyFlue.rotation.x = -Math.PI * 0.5;
    chimneyFlue.position.set(chx, 18.28, 0.2);
    houseGroup.add(chimneyDrum, chimneyLip, chimneyFlue);

    if (chx < 0) {
      for (let p = 0; p < 3; p++) {
        const puff = new THREE.Mesh(unitSphere, smokeMat);
        puff.scale.setScalar(0.52 + p * 0.16);
        puff.position.set(chx, 19.6 + p * 1.9, 0.2);
        houseGroup.add(puff);
        smokePuffs.push({ mesh: puff, baseY: 19.6 + p * 1.9, phase: p * 1.4 });
      }
    }
  }

  worldScaleRoot.add(houseGroup);

  // =========================================================================
  // 4. COLOSSAL LABOON NEXT TO LEFT CAPE (IMAGE 2: image_0d675392.png)
  // =========================================================================
  const laboonBaseY = sphereDropY(TWIN_CAPE_LABOON.x, TWIN_CAPE_LABOON.z);
  const laboonGroup = new THREE.Group();
  laboonGroup.position.set(TWIN_CAPE_LABOON.x, laboonBaseY, TWIN_CAPE_LABOON.z);
  // Face slightly East-Northeast so scarred Jolly-Roger brow & open jaw greet approaching cameras
  laboonGroup.rotation.y = -0.44;

  // Sculpted Island Whale head dome & body shell with clean upper-jaw lip arch
  const whaleBodyGeo = trackGeo(new THREE.SphereGeometry(1, 44, 32));
  const wPos = whaleBodyGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < wPos.count; i++) {
    let x = wPos.getX(i);
    let y = wPos.getY(i);
    let z = wPos.getZ(i);

    // Carve a deep wide-grin mouth cavity below the arched upper lip (Image 2)
    let mouthIndent = 0;
    if (x > 0.22 && y > -0.08 && y < 0.30 && Math.abs(z) < 0.84) {
      const yArch = 0.27 - 0.18 * Math.pow(Math.abs(z) / 0.84, 1.7);
      if (y < yArch) {
        const yFactor = Math.min(1, (yArch - y) / 0.06);
        const zFactor = Math.max(0, 1 - Math.pow(Math.abs(z) / 0.84, 1.8));
        mouthIndent = 0.58 * yFactor * zFactor;
      }
    }

    if (x > 0) {
      x = x * 32 * (1 - mouthIndent);
      y = y > 0 ? y * 56 : y * 14;
      z *= 28;
    } else {
      x *= 46;
      const taper = Math.max(0.25, 1 + x / 64);
      y = y > 0 ? y * (52 * Math.pow(taper, 0.72)) : y * 14;
      z *= 28 * Math.pow(taper, 0.65);
    }
    wPos.setXYZ(i, x, y, z);
  }
  wPos.needsUpdate = true;
  whaleBodyGeo.computeVertexNormals();

  const whaleBody = new THREE.Mesh(whaleBodyGeo, laboonSkinMat);
  whaleBody.position.y = 1.0;
  laboonGroup.add(whaleBody);

  // Solid dark red-brown inner gullet dome seated behind the tongue and teeth
  const innerGullet = new THREE.Mesh(unitSphere, mouthGulletMat);
  innerGullet.scale.set(22.2, 11.4, 21.6);
  innerGullet.position.set(2.8, 9.2, 0);
  laboonGroup.add(innerGullet);

  // Curved dark-slate lower jaw rim resting right at sea level
  const lowerJaw = new THREE.Mesh(unitSphere, laboonDarkBellyMat);
  lowerJaw.scale.set(24.8, 3.4, 22.8);
  lowerJaw.position.set(5.4, 2.0, 0);
  laboonGroup.add(lowerJaw);

  // Curved warm pink tongue arching visibly inside the open mouth (Image 2)
  const tongue = new THREE.Mesh(unitSphere, pinkTongueMat);
  tongue.scale.set(14.2, 2.9, 16.8);
  tongue.position.set(13.6, 5.1, 0);
  laboonGroup.add(tongue);

  // Upper & lower rows of conical ivory teeth anchored cleanly along the dark jaw rims (Image 2)
  const toothGeo = trackGeo(new THREE.ConeGeometry(1.18, 3.4, 7));
  const toothCount = 15;
  for (let i = 0; i < toothCount; i++) {
    const t = (i / (toothCount - 1) - 0.5) * 2; // -1 .. +1
    const ang = t * Math.PI * 0.36;
    const tx = Math.cos(ang) * 29.6;
    const tz = Math.sin(ang) * 24.4;

    // Upper teeth hanging visibly from the dark arched brow rim
    const upperRootY = 14.4 - t * t * 6.0;
    const upperTooth = new THREE.Mesh(toothGeo, ivoryToothMat);
    upperTooth.rotation.x = Math.PI;
    upperTooth.position.set(tx, upperRootY, tz);
    laboonGroup.add(upperTooth);

    // Lower teeth rising along the waterline lower jaw curve
    const lowerRootY = 4.5 - t * t * 0.8;
    const lowerTooth = new THREE.Mesh(toothGeo, ivoryToothMat);
    lowerTooth.scale.set(0.84, 0.78, 0.84);
    lowerTooth.position.set(tx * 0.96, lowerRootY, tz * 0.95);
    laboonGroup.add(lowerTooth);
  }

  // Expressive oval white eyes with vertical black pupils embedded flush on Laboon's side cheeks (Image 2)
  for (const sideSign of [1, -1] as const) {
    const eyeGroup = new THREE.Group();
    const sclera = new THREE.Mesh(unitSphere, ivoryToothMat);
    sclera.scale.set(1.4, 2.3, 0.36);
    const pupil = new THREE.Mesh(unitSphere, darkIronMat);
    pupil.scale.set(0.52, 1.32, 0.44);
    pupil.position.z = 0.06;
    eyeGroup.add(sclera, pupil);
    // Exact ellipsoid surface point on (32, 56, 28) at x=14.0, y=8.2 (y_local=7.2)
    const ex = 14.0;
    const ey = 8.2;
    const ez = sideSign * 24.92;
    eyeGroup.position.set(ex, ey, ez);
    eyeGroup.lookAt(
      new THREE.Vector3(
        ex + ex / (32 * 32) * 800,
        ey + (ey - 1.0) / (56 * 56) * 800,
        ez + ez / (28 * 28) * 800
      )
    );
    laboonGroup.add(eyeGroup);
  }

  // Grounded pectoral whale flippers & trailing tail flukes dipping cleanly into the ocean
  for (const sideSign of [1, -1] as const) {
    const flipper = new THREE.Mesh(unitSphere, laboonDarkBellyMat);
    flipper.scale.set(10, 2.0, 15);
    flipper.position.set(-14, -0.35, sideSign * 27);
    flipper.rotation.y = sideSign * 0.45;
    flipper.rotation.x = -sideSign * 0.16;
    laboonGroup.add(flipper);
  }

  const tailFluke = new THREE.Mesh(unitSphere, laboonDarkBellyMat);
  tailFluke.scale.set(12, 1.6, 21);
  tailFluke.position.set(-48, -0.4, 0);
  laboonGroup.add(tailFluke);

  // Waterline ocean foam collar hugging sea surface
  const laboonFoam = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(27, 34, 36)),
    foamMat
  );
  laboonFoam.rotation.x = -Math.PI * 0.5;
  laboonFoam.scale.set(1.38, 1.0, 1.0);
  laboonFoam.position.set(-7, 0.05, 0);
  laboonGroup.add(laboonFoam);

  worldScaleRoot.add(laboonGroup);

  return {
    group,
    radius: globeRadius,
    orientMode: 'cardinal',
    update: (elapsed: number) => {
      // Gentle whale breathing & ocean bobbing for Laboon
      laboonGroup.position.y = laboonBaseY + Math.sin(elapsed * 0.85) * 0.65;
      laboonGroup.rotation.z = Math.sin(elapsed * 0.62) * 0.016;
      laboonFoam.scale.set(
        1.38 + Math.sin(elapsed * 1.4) * 0.04,
        1.0 + Math.sin(elapsed * 1.4) * 0.03,
        1.0
      );

      // Slow rotating lighthouse Fresnel glow & rising cottage chimney smoke
      for (let i = 0; i < beaconSpinners.length; i++) {
        beaconSpinners[i].rotation.y = elapsed * 1.25 + i * Math.PI;
      }
      for (const puff of smokePuffs) {
        const cycle = (elapsed * 0.48 + puff.phase) % 1;
        puff.mesh.position.y = puff.baseY + cycle * 6.5;
        puff.mesh.position.x = -3.6 + Math.sin(elapsed * 1.4 + puff.phase) * 0.9;
        puff.mesh.scale.setScalar(1.2 + cycle * 1.4);
      }
    },
  };
}
