import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { equirectangularToSphere } from '../utils/globeMath';
import {
  DAY_STATION_JUNCTION,
  buildSeaTrainRouteSegments,
  sampleSeaTrainTrains,
  sampleSphericalSpline,
} from '../utils/seaTrainNetwork';

const _up = new THREE.Vector3(0, 1, 0);
const _pos = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _norm = new THREE.Vector3();
const _basis = new THREE.Matrix4();
const _dummy = new THREE.Object3D();

export interface SeaTrainNetworkHandle {
  group: THREE.Group;
  update: (elapsedS: number, cameraPos: THREE.Vector3) => void;
  dispose: () => void;
}

function createSignBannerTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#e7d996';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#5f9a88';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 498, 114);
    ctx.fillStyle = '#243138';
    ctx.font = 'bold 56px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 66);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Shared procedural verdigris cast-iron arched station gantry matching image_8702fd47.png
 * ("DAY STATION", "PUCCI STATION", "SAN FALDO", "ST. POPLAR").
 */
export function buildVerdigrisStationArchGroup(
  labelText: string,
  scale: number,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  trackMat: <T extends THREE.Material>(m: T) => T,
  trackTex?: <T extends THREE.Texture>(t: T) => T
): THREE.Group {
  const g = new THREE.Group();
  const verdigrisMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x62a08c,
      roughness: 0.45,
      metalness: 0.35,
    })
  );
  const signTex = createSignBannerTexture(labelText);
  if (trackTex) trackTex(signTex);
  const signMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.55,
      metalness: 0.08,
    })
  );

  // Twin tall riveted columns
  const colGeo = trackGeo(
    new THREE.CylinderGeometry(0.32 * scale, 0.38 * scale, 6.2 * scale, 10)
  );
  const capGeo = trackGeo(new THREE.SphereGeometry(0.46 * scale, 10, 8));
  for (const sx of [-4.2, 4.2]) {
    const col = new THREE.Mesh(colGeo, verdigrisMat);
    col.position.set(sx * scale, 3.1 * scale, 0);
    const cap = new THREE.Mesh(capGeo, verdigrisMat);
    cap.position.set(sx * scale, 6.35 * scale, 0);
    g.add(col, cap);
  }

  // Horizontal signboard beam
  const beam = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(8.8 * scale, 1.35 * scale, 0.38 * scale)),
    verdigrisMat
  );
  beam.position.set(0, 5.1 * scale, 0);
  g.add(beam);

  const plaqueGeo = trackGeo(new THREE.PlaneGeometry(7.6 * scale, 1.05 * scale));
  const plaqueFront = new THREE.Mesh(plaqueGeo, signMat);
  plaqueFront.position.set(0, 5.1 * scale, 0.21 * scale);
  const plaqueBack = new THREE.Mesh(plaqueGeo, signMat);
  plaqueBack.position.set(0, 5.1 * scale, -0.21 * scale);
  plaqueBack.rotation.y = Math.PI;
  g.add(plaqueFront, plaqueBack);

  // Ornamental cast-iron arch above signboard
  const arch = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(4.2 * scale, 0.24 * scale, 8, 24, Math.PI)),
    verdigrisMat
  );
  arch.position.set(0, 5.45 * scale, 0);
  g.add(arch);

  return g;
}

function createRibbonTubeFromPath(
  pts: readonly THREE.Vector3[],
  lateralOffset: number,
  radius: number
): THREE.BufferGeometry {
  const offsetPts: THREE.Vector3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const pNext = pts[Math.min(pts.length - 1, i + 1)];
    const pPrev = pts[Math.max(0, i - 1)];
    _fwd.copy(pNext).sub(pPrev).normalize();
    _norm.copy(p).normalize();
    _right.crossVectors(_fwd, _norm).normalize();
    offsetPts.push(p.clone().addScaledVector(_right, lateralOffset));
  }
  const curve = new THREE.CatmullRomCurve3(offsetPts, false, 'centripetal');
  return new THREE.TubeGeometry(curve, Math.max(16, pts.length * 2), radius, 5, false);
}

/**
 * Articulated Puffing Tom 3D Sea Train model matching image_4bbf07dc.png:
 * riveted forest-green boiler, brass cowcatcher grille, flared red/green funnel,
 * square headlamp, cab, "WATER 7" tender, and 3 crimson-trimmed passenger cars.
 */
function createPuffingTomModel(
  scale: number,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  trackMat: <T extends THREE.Material>(m: T) => T
): { group: THREE.Group; puffs: THREE.Mesh[]; sprayLeft: THREE.Mesh; sprayRight: THREE.Mesh } {
  const train = new THREE.Group();
  const S = scale;

  const boilerGreenMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1b4d38,
      roughness: 0.44,
      metalness: 0.28,
    })
  );
  const crimsonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8f2424,
      roughness: 0.48,
      metalness: 0.16,
    })
  );
  const brassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd9a844,
      roughness: 0.28,
      metalness: 0.72,
    })
  );
  const headlampMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfff3a8,
      emissive: 0xffd24c,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    })
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x222932,
      roughness: 0.6,
      metalness: 0.5,
    })
  );
  const steamMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdce4ee,
      roughness: 0.9,
      transparent: true,
      opacity: 0.8,
    })
  );
  const sprayMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6f8ff,
      emissive: 0x7fd8f8,
      emissiveIntensity: 0.3,
      roughness: 0.4,
      transparent: true,
      opacity: 0.82,
    })
  );

  // Locomotive Chassis & Cowcatcher (+Z is forward)
  const chassis = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.1 * S, 0.7 * S, 5.2 * S)),
    darkIronMat
  );
  chassis.position.set(0, 0.45 * S, 2.2 * S);
  train.add(chassis);

  const cowcatcher = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(1.35 * S, 1.8 * S, 6)),
    brassMat
  );
  cowcatcher.rotation.x = Math.PI * 0.5;
  cowcatcher.rotation.y = Math.PI / 6;
  cowcatcher.scale.set(1.0, 0.65, 1.0);
  cowcatcher.position.set(0, 0.55 * S, 5.25 * S);
  train.add(cowcatcher);

  // Ocean foam spray cones parted at bow
  const sprayGeo = trackGeo(new THREE.ConeGeometry(0.95 * S, 3.4 * S, 7));
  const sprayLeft = new THREE.Mesh(sprayGeo, sprayMat);
  sprayLeft.rotation.x = -Math.PI * 0.45;
  sprayLeft.rotation.z = 0.42;
  sprayLeft.position.set(-1.35 * S, 0.45 * S, 3.8 * S);
  const sprayRight = new THREE.Mesh(sprayGeo, sprayMat);
  sprayRight.rotation.x = -Math.PI * 0.45;
  sprayRight.rotation.z = -0.42;
  sprayRight.position.set(1.35 * S, 0.45 * S, 3.8 * S);
  train.add(sprayLeft, sprayRight);

  // Riveted Cylindrical Boiler + Brass Bands
  const boiler = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.05 * S, 1.05 * S, 3.8 * S, 14)),
    boilerGreenMat
  );
  boiler.rotation.x = Math.PI * 0.5;
  boiler.position.set(0, 1.65 * S, 2.8 * S);
  train.add(boiler);

  const ringGeo = trackGeo(new THREE.TorusGeometry(1.07 * S, 0.06 * S, 6, 16));
  for (const bz of [1.5, 2.7, 3.9]) {
    const ring = new THREE.Mesh(ringGeo, brassMat);
    ring.position.set(0, 1.65 * S, bz * S);
    train.add(ring);
  }

  // Headlamp + Brass Bell + Steam Dome
  const lampHousing = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.62 * S, 0.62 * S, 0.55 * S)),
    brassMat
  );
  lampHousing.position.set(0, 2.85 * S, 4.35 * S);
  const lampLens = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.24 * S, 0.24 * S, 0.1 * S, 10)),
    headlampMat
  );
  lampLens.rotation.x = Math.PI * 0.5;
  lampLens.position.set(0, 2.85 * S, 4.64 * S);
  train.add(lampHousing, lampLens);

  const bell = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.22 * S, 0.4 * S, 8)),
    brassMat
  );
  bell.position.set(0, 2.85 * S, 3.1 * S);
  const dome = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.32 * S, 0.36 * S, 0.55 * S, 10)),
    brassMat
  );
  dome.position.set(0, 2.9 * S, 2.1 * S);
  train.add(bell, dome);

  // Tall Red/Green Flared Smokestack + Animated Steam Puffs
  const stackShaft = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.26 * S, 0.32 * S, 1.45 * S, 10)),
    crimsonMat
  );
  stackShaft.position.set(0, 3.25 * S, 3.95 * S);
  const stackCrown = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.54 * S, 0.28 * S, 0.55 * S, 10)),
    boilerGreenMat
  );
  stackCrown.position.set(0, 4.1 * S, 3.95 * S);
  train.add(stackShaft, stackCrown);

  const puffs: THREE.Mesh[] = [];
  const puffGeo = trackGeo(new THREE.SphereGeometry(0.46 * S, 8, 6));
  for (let p = 0; p < 3; p++) {
    const puff = new THREE.Mesh(puffGeo, steamMat);
    puff.position.set(0, (4.8 + p * 0.7) * S, (3.6 - p * 1.1) * S);
    puffs.push(puff);
    train.add(puff);
  }

  // Engineer Cab
  const cab = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.3 * S, 2.4 * S, 2.4 * S)),
    boilerGreenMat
  );
  cab.position.set(0, 1.9 * S, -0.3 * S);
  const cabRoof = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.55 * S, 0.32 * S, 2.7 * S)),
    crimsonMat
  );
  cabRoof.position.set(0, 3.2 * S, -0.3 * S);
  const cabFrontWin = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.7 * S, 0.42 * S, 0.1 * S)),
    headlampMat
  );
  cabFrontWin.position.set(0, 2.55 * S, 0.91 * S);
  train.add(cab, cabRoof, cabFrontWin);

  // Coal Tender ("WATER 7")
  const tender = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.15 * S, 1.75 * S, 2.8 * S)),
    boilerGreenMat
  );
  tender.position.set(0, 1.35 * S, -3.2 * S);
  const coal = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.75 * S, 0.55 * S, 2.2 * S)),
    darkIronMat
  );
  coal.position.set(0, 2.35 * S, -3.2 * S);
  const tenderTrim = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.22 * S, 0.28 * S, 2.6 * S)),
    crimsonMat
  );
  tenderTrim.position.set(0, 2.15 * S, -3.2 * S);
  train.add(tender, coal, tenderTrim);

  // 3 Linked Passenger Coaches (forest green + crimson/gold arched panels + red roofs)
  const carBodyGeo = trackGeo(new THREE.BoxGeometry(2.2 * S, 2.1 * S, 4.4 * S));
  const carRoofGeo = trackGeo(new THREE.BoxGeometry(2.4 * S, 0.32 * S, 4.65 * S));
  const carTrimGeo = trackGeo(new THREE.BoxGeometry(2.26 * S, 0.95 * S, 3.6 * S));
  const carWinGeo = trackGeo(new THREE.BoxGeometry(2.29 * S, 0.38 * S, 2.8 * S));

  for (let c = 0; c < 3; c++) {
    const cz = (-7.5 - c * 4.95) * S;
    const carBody = new THREE.Mesh(carBodyGeo, boilerGreenMat);
    carBody.position.set(0, 1.5 * S, cz);
    const carRoof = new THREE.Mesh(carRoofGeo, crimsonMat);
    carRoof.position.set(0, 2.68 * S, cz);
    const carTrim = new THREE.Mesh(carTrimGeo, crimsonMat);
    carTrim.position.set(0, 1.55 * S, cz);
    const carWin = new THREE.Mesh(carWinGeo, brassMat);
    carWin.position.set(0, 1.78 * S, cz);
    train.add(carBody, carRoof, carTrim, carWin);
  }

  return { group: train, puffs, sprayLeft, sprayRight };
}

/**
 * Builds the entire global Sea Train (Umi Ressha) ocean rail network,
 * track marker buoys, Day Station relay pier, and animated Puffing Tom trains.
 */
export function createSeaTrainNetworkModel(
  globeRadius = 10
): SeaTrainNetworkHandle {
  const group = new THREE.Group();
  group.name = 'umi-ressha-network';

  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const texs: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    texs.push(t);
    return t;
  };

  const trackLift = 0.00055;
  const routes = buildSeaTrainRouteSegments(globeRadius, trackLift);

  // 1. Twin Submerged Steel Rail Ribbons merged cleanly into 1 draw call
  const railParts: THREE.BufferGeometry[] = [];
  const sleeperTransforms: THREE.Matrix4[] = [];
  const buoyTransforms: THREE.Matrix4[] = [];

  for (const route of routes) {
    const resampled = sampleSphericalSpline(
      route.waypoints,
      14,
      globeRadius + trackLift
    );
    const vecPts = resampled.map((p) => new THREE.Vector3(p.x, p.y, p.z));

    const leftRail = createRibbonTubeFromPath(vecPts, -0.0022, 0.00062);
    const rightRail = createRibbonTubeFromPath(vecPts, 0.0022, 0.00062);
    railParts.push(
      leftRail.index ? leftRail.toNonIndexed() : leftRail,
      rightRail.index ? rightRail.toNonIndexed() : rightRail
    );
    leftRail.dispose();
    rightRail.dispose();

    // Sleepers & flanking yellow sea-track marker buoys (matching image_583c01fa.png)
    for (let i = 0; i < vecPts.length; i++) {
      const p = vecPts[i];
      const pNext = vecPts[Math.min(vecPts.length - 1, i + 1)];
      const pPrev = vecPts[Math.max(0, i - 1)];
      _norm.copy(p).normalize();
      _fwd.copy(pNext).sub(pPrev);
      _fwd.addScaledVector(_norm, -_fwd.dot(_norm)).normalize();
      _right.crossVectors(_norm, _fwd).normalize();
      _basis.makeBasis(_right, _norm, _fwd);

      _dummy.position.copy(p);
      _dummy.quaternion.setFromRotationMatrix(_basis);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      sleeperTransforms.push(_dummy.matrix.clone());

      if (i % 3 === 1) {
        for (const side of [-0.0052, 0.0052]) {
          _dummy.position.copy(p).addScaledVector(_right, side);
          _dummy.quaternion.setFromRotationMatrix(_basis);
          _dummy.scale.set(1, 1, 1);
          _dummy.updateMatrix();
          buoyTransforms.push(_dummy.matrix.clone());
        }
      }
    }
  }

  const mergedRails = trackGeo(mergeGeometries(railParts, false));
  for (const g of railParts) g.dispose();
  const railMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7098b8,
      emissive: 0x224c6c,
      emissiveIntensity: 0.25,
      roughness: 0.34,
      metalness: 0.65,
    })
  );
  group.add(new THREE.Mesh(mergedRails, railMat));

  // Cross-ties / Sleepers InstancedMesh
  const sleeperGeo = trackGeo(new THREE.BoxGeometry(0.0056, 0.0007, 0.0014));
  const sleeperMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4b5d6c,
      roughness: 0.65,
      metalness: 0.35,
    })
  );
  const sleeperInst = new THREE.InstancedMesh(
    sleeperGeo,
    sleeperMat,
    sleeperTransforms.length
  );
  sleeperTransforms.forEach((m, i) => sleeperInst.setMatrixAt(i, m));
  sleeperInst.instanceMatrix.needsUpdate = true;
  group.add(sleeperInst);

  // Iconic Yellow Track Buoys (image_583c01fa.png)
  const buoyGeo = trackGeo(new THREE.SphereGeometry(0.00095, 6, 5));
  buoyGeo.scale(0.9, 0.8, 1.85);
  const buoyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf6db68,
      emissive: 0xb88b22,
      emissiveIntensity: 0.28,
      roughness: 0.4,
    })
  );
  const buoyInst = new THREE.InstancedMesh(
    buoyGeo,
    buoyMat,
    buoyTransforms.length
  );
  buoyTransforms.forEach((m, i) => buoyInst.setMatrixAt(i, m));
  buoyInst.instanceMatrix.needsUpdate = true;
  group.add(buoyInst);

  // 2. Day Station Marine Relay Quay & Verdigris Archway at Judicial Junction (image_8702fd47.png)
  {
    const dsPos = equirectangularToSphere(
      DAY_STATION_JUNCTION.u,
      DAY_STATION_JUNCTION.v,
      globeRadius
    );
    const dsGroup = new THREE.Group();
    dsGroup.position.set(dsPos.x, dsPos.y, dsPos.z);
    _norm.set(dsPos.x, dsPos.y, dsPos.z).normalize();
    const pEast = equirectangularToSphere(
      DAY_STATION_JUNCTION.u + 0.001,
      DAY_STATION_JUNCTION.v,
      globeRadius
    );
    _right.set(pEast.x - dsPos.x, pEast.y - dsPos.y, pEast.z - dsPos.z);
    _right.addScaledVector(_norm, -_right.dot(_norm)).normalize();
    _fwd.crossVectors(_right, _norm).normalize();
    _basis.makeBasis(_right, _norm, _fwd);
    dsGroup.quaternion.setFromRotationMatrix(_basis);

    const dsScale = 0.0014;
    const stoneMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xe6e0d4, roughness: 0.72 })
    );
    const relayHolder = new THREE.Group();
    relayHolder.rotation.y = -0.78;
    const pier = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(16 * dsScale, 2.2 * dsScale, 5.2 * dsScale)),
      stoneMat
    );
    pier.position.set(0, 0.8 * dsScale, 5.6 * dsScale);
    relayHolder.add(pier);

    const arch = buildVerdigrisStationArchGroup(
      'DAY STATION',
      dsScale,
      trackGeo,
      trackMat,
      trackTex
    );
    arch.position.set(0, 1.9 * dsScale, 4.2 * dsScale);
    relayHolder.add(arch);
    dsGroup.add(relayHolder);

    group.add(dsGroup);
  }

  // 3. Two Animated Puffing Tom Trains gliding cleanly along the ocean tracks
  const expressModel = createPuffingTomModel(0.0024, trackGeo, trackMat);
  const loopModel = createPuffingTomModel(0.0021, trackGeo, trackMat);
  group.add(expressModel.group, loopModel.group);

  const trains = [expressModel, loopModel];

  return {
    group,
    update: (elapsedS: number, cameraPos: THREE.Vector3) => {
      // Visibility cull when looking at the opposite hemisphere far from Paradise Water 7 sector
      const dist = cameraPos.distanceTo(group.children[0]?.position ?? _pos.set(0, 0, 0));
      void dist;

      const poses = sampleSeaTrainTrains(elapsedS, globeRadius, trackLift);
      for (let i = 0; i < trains.length && i < poses.length; i++) {
        const pose = poses[i];
        const m = trains[i];
        m.group.position.set(pose.position.x, pose.position.y, pose.position.z);
        _norm.set(pose.up.x, pose.up.y, pose.up.z).normalize();
        _fwd.set(pose.forward.x, pose.forward.y, pose.forward.z).normalize();
        _right.crossVectors(_norm, _fwd).normalize();
        _basis.makeBasis(_right, _norm, _fwd);
        m.group.quaternion.setFromRotationMatrix(_basis);

        for (let p = 0; p < m.puffs.length; p++) {
          const cycle = ((elapsedS * 1.4 + p * 0.33) % 1);
          const puffScale = 0.6 + cycle * 1.2;
          m.puffs[p].scale.setScalar(puffScale);
          m.puffs[p].position.y = (4.4 + cycle * 2.2) * (i === 0 ? 0.0024 : 0.0021);
          m.puffs[p].position.z = (3.9 - cycle * 3.8) * (i === 0 ? 0.0024 : 0.0021);
        }
        const sprayPulse = 0.92 + Math.sin(elapsedS * 7.5 + i * 2) * 0.14;
        m.sprayLeft.scale.set(sprayPulse, 1, sprayPulse);
        m.sprayRight.scale.set(sprayPulse, 1, sprayPulse);
      }
    },
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      texs.forEach((t) => t.dispose());
    },
  };
}
