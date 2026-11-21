import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PUNK_HAZARD_CAMERA_PRESETS,
  PUNK_HAZARD_FENCE_ARC,
  PUNK_HAZARD_ICE_PEAKS,
  PUNK_HAZARD_LANDMARKS,
  PUNK_HAZARD_RUINS,
  PUNK_HAZARD_VOLCANOES,
  punkHazardLandSignedDist,
  punkHazardStraitCenterZ,
  samplePunkHazardHeight,
  samplePunkHazardLavaIntensity,
  samplePunkHazardWalkSurfaceHeight,
  samplePunkHazardZone,
  toPunkHazardSphereLocal,
} from './punkHazardTerrain';

test('Punk Hazard cleanly splits Ice Half (North) and Burning Half (South) across the central Demarcation Strait', () => {
  // North half is icy & cold
  assert.equal(samplePunkHazardZone(-40, -45), 'ice');
  assert.equal(samplePunkHazardZone(-12, -34), 'lab');

  // Central strait is deep water channel separating the two climates
  const centerStraitZ = punkHazardStraitCenterZ(0);
  const straitH = samplePunkHazardHeight(0, centerStraitZ);
  assert.equal(samplePunkHazardZone(0, centerStraitZ), 'strait');
  assert.ok(
    straitH < -1.0,
    `Central demarcation strait should be navigable water (< -1.0), got ${straitH}`
  );

  // South half is volcanic burning lands
  assert.equal(samplePunkHazardZone(-8, 42), 'burning');

  // Outer perimeter sea around Sunny spawn is clear navigable ocean
  const spawnH = samplePunkHazardHeight(
    PUNK_HAZARD_LANDMARKS.sunnySpawnWest.x,
    PUNK_HAZARD_LANDMARKS.sunnySpawnWest.z
  );
  assert.equal(
    punkHazardLandSignedDist(
      PUNK_HAZARD_LANDMARKS.sunnySpawnWest.x,
      PUNK_HAZARD_LANDMARKS.sunnySpawnWest.z
    ).half,
    'sea'
  );
  assert.ok(spawnH < -1.5, `Expected navigable sea at Sunny spawn, got ${spawnH}`);
});

test('Punk Hazard landmarks, volcanoes, ice peaks, melted ruins, and fence anchor on solid terrain', () => {
  for (const peak of PUNK_HAZARD_ICE_PEAKS) {
    const h = samplePunkHazardHeight(peak.x, peak.z);
    assert.ok(h >= 16, `Ice peak ${peak.id} should tower tall, got ${h}`);
  }

  for (const volcano of PUNK_HAZARD_VOLCANOES) {
    const rimH = samplePunkHazardHeight(volcano.x + volcano.craterRadius * 1.15, volcano.z);
    assert.ok(rimH >= 12, `Volcano ${volcano.id} rim should tower tall, got ${rimH}`);
  }

  for (const ruin of PUNK_HAZARD_RUINS) {
    const h = samplePunkHazardHeight(ruin.x, ruin.z);
    assert.ok(h > 1.0, `Melted ruin ${ruin.id} must rest on dry Burning Lands ground, got ${h}`);
  }

  for (const pt of PUNK_HAZARD_FENCE_ARC) {
    const h = samplePunkHazardHeight(pt.x, pt.z);
    assert.ok(h > 0.5, `Fence post (${pt.x}, ${pt.z}) must sit on coastal land, got ${h}`);
  }

  // Molten lava rivers exist in Burning Lands and are strictly absent on Ice Half
  assert.ok(samplePunkHazardLavaIntensity(18.5, 43.0) > 0.5);
  assert.equal(samplePunkHazardLavaIntensity(-12.0, -34.0), 0);
});

test('Punk Hazard street-view camera presets stand on dry ground at ~1.75m human eye height', () => {
  assert.ok(PUNK_HAZARD_CAMERA_PRESETS.length >= 6);
  for (const preset of PUNK_HAZARD_CAMERA_PRESETS) {
    if (!preset.isStreetView) continue;
    const ground = samplePunkHazardWalkSurfaceHeight(
      preset.position[0],
      preset.position[2]
    );
    const clearance = preset.position[1] - ground;
    assert.ok(
      ground >= 2.0,
      `Street preset ${preset.id} must stand on dry ground, got ${ground}`
    );
    assert.ok(
      clearance >= 1.5 && clearance <= 2.0,
      `Street preset ${preset.id} must sit at ~1.75m eye height, got ${clearance}`
    );
  }
});

test('toPunkHazardSphereLocal maps heights radially onto the globe curvature', () => {
  const base = toPunkHazardSphereLocal(0, 0, 0, 10);
  const summit = toPunkHazardSphereLocal(0, 42, 0, 10);
  assert.ok(Math.abs(base.y) < 1e-6);
  assert.ok(summit.y > 0.06, `Expected projected summit altitude > 0.06, got ${summit.y}`);
});
