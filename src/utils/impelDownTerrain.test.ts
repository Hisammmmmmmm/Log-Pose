import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IMPEL_COURTYARD_Y,
  IMPEL_DOWN_ABYSS_RADIUS,
  IMPEL_DOWN_CAMERA_PRESETS,
  IMPEL_DOWN_SEABED_Y,
  IMPEL_SEA_KINGS,
  IMPEL_SUBMARINE_LEVELS,
  buildImpelForestTrees,
  buildImpelMarineShips,
  sampleImpelCameraFloorHeight,
  sampleImpelHeight,
  sampleImpelSeabedHeight,
  sampleImpelWalkSurfaceHeight,
  toImpelSphereLocal,
} from './impelDownTerrain';

test('Impel Down has concentric double-ring fortress, flooded moat, stone Tarai bridge, and 14 Marine ships', () => {
  const courtyardH = sampleImpelHeight(0, 0);
  const innerWallH = sampleImpelHeight(-24.0, 0);
  const moatH = sampleImpelHeight(-32.5, 0);
  const outerWallH = sampleImpelHeight(-41.5, 0);
  const bridgeH = sampleImpelHeight(0, 62);
  const transitPortH = sampleImpelHeight(0, 86);

  assert.equal(courtyardH, IMPEL_COURTYARD_Y);
  assert.ok(innerWallH > outerWallH, 'Inner cylindrical drum must stand taller than outer ring wall');
  assert.ok(moatH < -1.0, `Expected flooded sea moat between rings, got ${moatH}`);
  assert.ok(bridgeH > 2.0 && transitPortH > 2.0, 'Stone transit bridge & port must sit cleanly above sea');

  const ships = buildImpelMarineShips();
  assert.ok(ships.length >= 12, `Expected encircling fleet of >=12 Marine ships, got ${ships.length}`);
  for (const s of ships) {
    assert.ok(!(s.z > 42 && Math.abs(s.x) < 16), 'Marine ships must not block the stone bridge corridor');
  }

  const trees = buildImpelForestTrees();
  assert.ok(trees.length >= 30, 'Inner courtyard must contain dense forest canopy');
});

test('Impel Down descends 6 subterranean levels into Calm Belt seabed with Sea Kings and valid camera presets', () => {
  assert.equal(IMPEL_SUBMARINE_LEVELS.length, 6);
  assert.equal(IMPEL_SUBMARINE_LEVELS[0].level, 1);
  assert.equal(IMPEL_SUBMARINE_LEVELS[5].level, 6);
  assert.ok(IMPEL_SUBMARINE_LEVELS[5].yBottom < -50);

  const deepFloor = sampleImpelSeabedHeight(36, 0);
  assert.ok(deepFloor < -25 && deepFloor >= IMPEL_DOWN_SEABED_Y - 5);
  assert.equal(sampleImpelSeabedHeight(IMPEL_DOWN_ABYSS_RADIUS + 5, 0), 0);

  assert.ok(IMPEL_SEA_KINGS.length >= 4);

  for (const p of IMPEL_DOWN_CAMERA_PRESETS) {
    if (p.isStreetView) {
      const g = sampleImpelWalkSurfaceHeight(p.position[0], p.position[2]);
      assert.ok(p.position[1] >= g + 1.2, `Preset ${p.id} must clear ground ${g}`);
    }
    if (p.id === 'underwater-levels') {
      const floor = sampleImpelCameraFloorHeight(p.position[0], p.position[2], p.position[1]);
      assert.ok(p.position[1] > floor + 3, 'Underwater preset must stay above deep seabed');
    }
  }

  const low = toImpelSphereLocal(0, -30, 0, 10);
  const high = toImpelSphereLocal(0, 15, 0, 10);
  assert.ok(high.y > low.y);
});
