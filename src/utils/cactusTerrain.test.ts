import test from 'node:test';
import assert from 'node:assert/strict';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import { equirectangularToSphere } from './globeMath';
import {
  LITTLE_GARDEN_ANGULAR_MASK_RADIUS,
  LITTLE_GARDEN_GLOBE_CENTER,
} from './littleGardenTerrain';
import {
  TWIN_CAPE_ANGULAR_MASK_RADIUS,
  TWIN_CAPE_GLOBE_CENTER,
} from './twinCapeTerrain';
import {
  CACTUS_ANGULAR_MASK_RADIUS,
  CACTUS_BUILDINGS,
  CACTUS_CAMERA_PRESETS,
  CACTUS_CROSSES,
  CACTUS_GIANTS,
  CACTUS_GLOBE_CENTER,
  CACTUS_GLOBE_SCALE,
  CACTUS_ROCKS,
  cactusBayCenterX,
  cactusBaySignedDist,
  cactusRoadSignedDist,
  sampleCactusCoastMask,
  sampleCactusHeight,
  sampleCactusWalkSurfaceHeight,
  toCactusSphereLocal,
} from './cactusTerrain';

test('Cactus Island globe center matches onePieceLocations and stays well clear of neighbors', () => {
  const loc = ONE_PIECE_LOCATIONS.find((l) => l.id === 'cactus-island');
  assert.ok(loc, 'cactus-island must exist in ONE_PIECE_LOCATIONS');
  assert.equal(loc.u, CACTUS_GLOBE_CENTER.u);
  assert.equal(loc.v, CACTUS_GLOBE_CENTER.v);

  const pCactus = equirectangularToSphere(CACTUS_GLOBE_CENTER.u, CACTUS_GLOBE_CENTER.v, 1);
  const pTwin = equirectangularToSphere(TWIN_CAPE_GLOBE_CENTER.u, TWIN_CAPE_GLOBE_CENTER.v, 1);
  const pLittle = equirectangularToSphere(
    LITTLE_GARDEN_GLOBE_CENTER.u,
    LITTLE_GARDEN_GLOBE_CENTER.v,
    1
  );
  const kyuka = ONE_PIECE_LOCATIONS.find((l) => l.id === 'kyuka-island')!;
  const pKyuka = equirectangularToSphere(kyuka.u, kyuka.v, 1);

  const angleBetween = (a: typeof pCactus, b: typeof pCactus) =>
    Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z)));

  assert.ok(
    angleBetween(pCactus, pTwin) >
      CACTUS_ANGULAR_MASK_RADIUS + TWIN_CAPE_ANGULAR_MASK_RADIUS + 0.025,
    'must not overlap Twin Cape'
  );
  assert.ok(
    angleBetween(pCactus, pLittle) >
      CACTUS_ANGULAR_MASK_RADIUS + LITTLE_GARDEN_ANGULAR_MASK_RADIUS + 0.025,
    'must not overlap Little Garden'
  );
  assert.ok(
    angleBetween(pCactus, pKyuka) > CACTUS_ANGULAR_MASK_RADIUS + 0.04,
    'must not overlap Kyuka Island'
  );
});

test('horseshoe bay is navigable open water while outer cliffs and village shores are dry land', () => {
  // Bay centerline from south approach into inner harbor must stay submerged
  for (let z = -12; z <= 74; z += 6) {
    const cx = cactusBayCenterX(z);
    assert.ok(
      cactusBaySignedDist(cx, z) < -3.0,
      `bay centerline at z=${z} must be inside bay water`
    );
    assert.ok(
      sampleCactusHeight(cx, z) < -1.0,
      `bay centerline at z=${z} must be submerged water`
    );
  }

  // Twin village shores and northern plateau must be solid elevated ground
  assert.ok(sampleCactusHeight(-20.0, 12.0) > 2.0, 'west village shore must be dry land');
  assert.ok(sampleCactusHeight(21.0, 14.0) > 2.0, 'east village shore must be dry land');
  assert.ok(sampleCactusHeight(-2.0, -34.0) > 4.0, 'northern bay-head ridge must be elevated');
  assert.ok(sampleCactusHeight(-62.0, -8.0) > 6.5, 'west outer cliffs must rise steeply');
  assert.ok(sampleCactusCoastMask(0, -104) < 0.05, 'outer ocean north of island must be 0');
});

test('contains >= 15 well-spaced village buildings including Baroque Works Tavern on dry ground', () => {
  assert.ok(
    CACTUS_BUILDINGS.length >= 15,
    `expected at least 15 buildings, got ${CACTUS_BUILDINGS.length}`
  );
  const tavern = CACTUS_BUILDINGS.find((b) => b.id === 'baroque-tavern');
  assert.ok(tavern, 'Baroque Works Tavern must exist');
  assert.equal(tavern.kind, 'tavern');

  const cupolaHall = CACTUS_BUILDINGS.find((b) => b.id === 'w-cupola-hall');
  assert.ok(cupolaHall, 'Cupola landmark building must exist');

  for (const b of CACTUS_BUILDINGS) {
    const h = sampleCactusHeight(b.x, b.z);
    assert.ok(h > 1.9, `building ${b.id} must stand on solid village land (h=${h})`);
    assert.ok(
      cactusBaySignedDist(b.x, b.z) > 1.2,
      `building ${b.id} must stay out of bay water`
    );
    assert.ok(
      cactusRoadSignedDist(b.x, b.z) > 0.15,
      `building ${b.id} must not block road centerline`
    );
    for (const g of CACTUS_GIANTS) {
      const dist = Math.hypot(b.x - g.x, b.z - g.z);
      assert.ok(
        dist > g.domeRx + 1.5,
        `building ${b.id} must stay clear of giant cactus ${g.id}`
      );
    }
  }

  for (let i = 0; i < CACTUS_BUILDINGS.length; i++) {
    for (let j = i + 1; j < CACTUS_BUILDINGS.length; j++) {
      const a = CACTUS_BUILDINGS[i];
      const b = CACTUS_BUILDINGS[j];
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      assert.ok(
        d >= 5.2,
        `buildings ${a.id} and ${b.id} are too close (${d.toFixed(2)}m)`
      );
    }
  }
});

test('all 6 giant cacti are half-buried in the ground and all wooden crosses sit ON cacti above ground', () => {
  assert.equal(CACTUS_GIANTS.length, 6, 'Whisky Peak must have 6 giant cacti');
  for (const g of CACTUS_GIANTS) {
    assert.ok(
      g.centerY < g.groundY,
      `cactus ${g.id} centerY (${g.centerY}) must be below local ground (${g.groundY}) so it is half-buried`
    );
    assert.ok(
      g.centerY - g.domeRy < g.groundY - 8.0,
      `cactus ${g.id} lower half must sink deep below ground`
    );
    assert.ok(
      g.centerY + g.domeRy > g.groundY + 7.5,
      `cactus ${g.id} upper dome must tower high above ground`
    );
    assert.ok(g.lobes.length >= 4, `cactus ${g.id} must have stacked arm lobes`);
  }

  assert.ok(
    CACTUS_CROSSES.length >= 250,
    `expected >= 250 wooden grave crosses across cacti, got ${CACTUS_CROSSES.length}`
  );

  for (const cross of CACTUS_CROSSES) {
    const coast = sampleCactusCoastMask(cross.x, cross.z);
    const groundY = sampleCactusHeight(cross.x, cross.z);
    assert.ok(
      coast >= 0.52 && groundY >= 2.2,
      `cross ${cross.id} must sit over dry island plateau (coast=${coast.toFixed(2)}, groundY=${groundY.toFixed(2)})`
    );
    assert.ok(
      cross.y > groundY + 0.95,
      `cross ${cross.id} at y=${cross.y.toFixed(2)} must sit strictly above ground (${groundY.toFixed(2)})`
    );
    assert.ok(
      cross.ny > 0.55,
      `cross ${cross.id} normal ny=${cross.ny.toFixed(2)} must point upward/outward, never below cactus`
    );
  }
});

test('rock props and human-scale camera presets stay clear and grounded at 1.75m', () => {
  assert.ok(CACTUS_ROCKS.length >= 25, 'expected desert rock props');
  for (const p of CACTUS_CAMERA_PRESETS) {
    if (!p.isStreetView) continue;
    const [px, py, pz] = p.position;
    const rawGround = sampleCactusHeight(px, pz);
    assert.ok(
      rawGround >= 2.15,
      `street preset ${p.id} must stand on elevated dry terrace ground (h=${rawGround.toFixed(2)})`
    );
    const ground = sampleCactusWalkSurfaceHeight(px, pz);
    assert.ok(
      Math.abs(py - (ground + 1.75)) < 0.08,
      `street preset ${p.id} must stand at 1.75m human eye height`
    );
    for (const b of CACTUS_BUILDINGS) {
      assert.ok(
        Math.hypot(px - b.x, pz - b.z) > Math.max(b.width, b.depth) * 0.5 + 1.2,
        `street preset ${p.id} must not spawn inside building ${b.id}`
      );
    }
    for (const g of CACTUS_GIANTS) {
      assert.ok(
        Math.hypot(px - g.x, pz - g.z) > g.domeRx + 0.8,
        `street preset ${p.id} must not spawn inside giant cactus ${g.id}`
      );
    }
  }

  const sp = toCactusSphereLocal(0, 1.15, 0, 10);
  assert.ok(Math.abs(sp.y) < CACTUS_GLOBE_SCALE * 0.1);
});
