import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ORGAN_BUILDINGS,
  ORGAN_CAMERA_PRESETS,
  ORGAN_EAST_CLEARING_Y,
  ORGAN_LANDMARKS,
  ORGAN_PEAK_Y,
  ORGAN_QUAY_Y,
  ORGAN_TOWN_Y,
  ORGAN_TREES,
  organRoadSignedDist,
  sampleOrganHeight,
  sampleOrganRiverDistance,
  sampleOrganWalkSurfaceHeight,
  toOrganSphereLocal,
} from './organTerrain';

test('Organ Island terrain elevation distinguishes deep seabed, river, harbor quay, town, and northern ridges', () => {
  const seaH = sampleOrganHeight(-98, -88);
  assert.ok(seaH < -4.5, `Expected deep seabed well below ocean chord sag outside Organ Island, got ${seaH}`);

  const riverCenterH = sampleOrganHeight(28.5, 22.0);
  assert.ok(riverCenterH < -1.5, `Expected deeply submerged river bed at (28.5, 22), got ${riverCenterH}`);

  const quayH = sampleOrganWalkSurfaceHeight(
    ORGAN_LANDMARKS.harborQuay.x,
    ORGAN_LANDMARKS.harborQuay.z
  );
  assert.ok(
    Math.abs(quayH - (ORGAN_QUAY_Y + 0.12)) < 0.35,
    `Expected harbor quay near ${ORGAN_QUAY_Y}m, got ${quayH}`
  );

  const townH = sampleOrganHeight(
    ORGAN_LANDMARKS.whaleFountain.x,
    ORGAN_LANDMARKS.whaleFountain.z
  );
  assert.ok(
    Math.abs(townH - ORGAN_TOWN_Y) < 0.25,
    `Expected Orange Town fountain plaza at ${ORGAN_TOWN_Y}m, got ${townH}`
  );

  const ridgeH = sampleOrganHeight(-20.0, -32.0);
  assert.ok(
    ridgeH > ORGAN_TOWN_Y + 9.0 && ridgeH <= ORGAN_PEAK_Y + 0.5,
    `Expected tall northern mountain ridge, got ${ridgeH}`
  );

  const bridgeDeckH = sampleOrganWalkSurfaceHeight(
    ORGAN_LANDMARKS.eastBridge.x,
    ORGAN_LANDMARKS.eastBridge.z
  );
  assert.ok(
    bridgeDeckH > ORGAN_EAST_CLEARING_Y + 0.5,
    `Expected arched bridge deck above river, got ${bridgeDeckH}`
  );
});

test('Organ Island buildings include town corner hall, PET FOOD, church, and exclude old east house', () => {
  const ids = new Set(ORGAN_BUILDINGS.map((b) => b.id));
  assert.ok(ids.has('town-corner-hall'));
  assert.ok(ids.has('pet-food-shop'));
  assert.ok(ids.has('town-church'));
  assert.ok(!ids.has('drunker-pub'));
  assert.ok(!ids.has('east-clearing-pavilion'));
  assert.ok(ORGAN_BUILDINGS.length >= 23, 'Expected full Orange Town architectural grid');

  for (const b of ORGAN_BUILDINGS) {
    assert.ok(
      organRoadSignedDist(b.x, b.z) > -0.1,
      `Building ${b.id} center (${b.x}, ${b.z}) overlaps cobbled street`
    );
    const river = sampleOrganRiverDistance(b.x, b.z);
    assert.ok(
      river.dist > river.halfWidth + 1.0,
      `Building ${b.id} overlaps Organ river channel`
    );
  }
});

test('Organ Island trees avoid cobbled roads, river channel, buildings, and Buggy Grand Chapiteau', () => {
  assert.ok(ORGAN_TREES.length >= 90, 'Expected dense woodland groves across Organ Island');
  for (const t of ORGAN_TREES) {
    assert.ok(t.y >= 1.1, `Tree ${t.id} spawned in water at y=${t.y}`);
    assert.ok(
      organRoadSignedDist(t.x, t.z) >= 1.0,
      `Tree ${t.id} encroaches on cobbled street`
    );
    const river = sampleOrganRiverDistance(t.x, t.z);
    assert.ok(
      river.dist >= river.halfWidth + 1.3,
      `Tree ${t.id} spawned inside river channel`
    );
    const distToChapiteau = Math.hypot(
      t.x - ORGAN_LANDMARKS.buggyChapiteau.x,
      t.z - ORGAN_LANDMARKS.buggyChapiteau.z
    );
    assert.ok(
      distToChapiteau >= 8.5,
      `Tree ${t.id} overlaps Buggy Grand Chapiteau clearing (dist=${distToChapiteau.toFixed(2)})`
    );
  }
});

test('Organ Island human street-level camera presets sit cleanly on walkable ground', () => {
  const streetPresets = ORGAN_CAMERA_PRESETS.filter((p) => p.isStreetView);
  assert.equal(streetPresets.length, 4);

  for (const preset of streetPresets) {
    const [px, py, pz] = preset.position;
    const groundY = sampleOrganWalkSurfaceHeight(px, pz);
    const eyeHeight = py - groundY;
    assert.ok(
      eyeHeight >= 1.4 && eyeHeight <= 2.4,
      `Preset ${preset.id} eye height=${eyeHeight.toFixed(2)}m out of human range`
    );
    assert.ok(
      organRoadSignedDist(px, pz) <= 0.65,
      `Preset ${preset.id} spawns outside walkable road/plaza (${organRoadSignedDist(px, pz).toFixed(2)})`
    );
  }
});

test('toOrganSphereLocal curves Organ coordinates onto the planetary globe shell', () => {
  const pOrigin = toOrganSphereLocal(0, 0, 0, 10);
  assert.ok(Math.abs(pOrigin.y) < 1e-6);

  const pHigh = toOrganSphereLocal(0, ORGAN_TOWN_Y, 0, 10);
  assert.ok(pHigh.y > 0);
});
