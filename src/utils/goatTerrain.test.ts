import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GOAT_BUILDINGS,
  GOAT_CAMERA_PRESETS,
  GOAT_HIDEOUT_Y,
  GOAT_NORTH_MESA_Y,
  GOAT_PIER_Y,
  GOAT_SW_MESA_Y,
  GOAT_TREES,
  goatRoadSignedDist,
  sampleGoatHeight,
  sampleGoatWalkSurfaceHeight,
  toGoatSphereLocal,
} from './goatTerrain';

test('Goat Island terrain matches reference map: ocean cove, hideout yard, wooden pier, valley trail, and twin cliff mesas', () => {
  assert.ok(sampleGoatHeight(58, 2) < -0.5, 'East cove harbor water is submerged');
  assert.ok(sampleGoatHeight(-85, -75) < -1.0, 'Outer ocean is submerged');

  const yardH = sampleGoatHeight(28, 1);
  assert.ok(
    Math.abs(yardH - GOAT_HIDEOUT_Y) < 0.35,
    `Expected hideout courtyard near ${GOAT_HIDEOUT_Y}m, got ${yardH}`
  );

  assert.equal(
    sampleGoatWalkSurfaceHeight(42.6, 2.0),
    GOAT_PIER_Y,
    'Eastern wooden quay surface matches GOAT_PIER_Y'
  );

  const northMesaH = sampleGoatHeight(1.5, -41.0);
  const swMesaH = sampleGoatHeight(-28.0, 31.0);
  assert.ok(
    northMesaH > GOAT_NORTH_MESA_Y - 1.0,
    `Northern mesa peak should rise near ${GOAT_NORTH_MESA_Y}m, got ${northMesaH}`
  );
  assert.ok(
    swMesaH > GOAT_SW_MESA_Y - 1.0,
    `Southwestern mesa peak should rise near ${GOAT_SW_MESA_Y}m, got ${swMesaH}`
  );
});

test('Goat Island buildings and trees avoid walkable paths, hideout yard, and ocean water', () => {
  for (const b of GOAT_BUILDINGS) {
    assert.ok(
      b.y >= 1.5,
      `Building ${b.id} must sit on dry land (got y=${b.y})`
    );
    const d = goatRoadSignedDist(b.x, b.z);
    assert.ok(
      d >= 0.2,
      `Building ${b.id} at (${b.x}, ${b.z}) overlaps road/courtyard path (d=${d.toFixed(2)})`
    );
  }

  for (const t of GOAT_TREES) {
    assert.ok(t.y >= 1.2, `Tree ${t.id} sits in water (y=${t.y})`);
    assert.ok(
      goatRoadSignedDist(t.x, t.z) >= 0.7,
      `Tree ${t.id} encroaches on road (${t.x}, ${t.z})`
    );
  }
});

test('All Goat Island human-scale camera presets sit on open walkable terrain/paths at eye level', () => {
  for (const preset of GOAT_CAMERA_PRESETS) {
    if (!preset.isStreetView) continue;
    const [cx, cy, cz] = preset.position;
    const groundY = sampleGoatWalkSurfaceHeight(cx, cz);
    const clearance = cy - groundY;
    assert.ok(
      clearance >= 1.4 && clearance <= 3.0,
      `Preset ${preset.id} eye height clearance ${clearance.toFixed(2)}m out of [1.4, 3.0]`
    );
    assert.ok(
      goatRoadSignedDist(cx, cz) <= 0.6,
      `Preset ${preset.id} camera at (${cx}, ${cz}) should sit on or beside an open walkable path`
    );
  }
});

test('Spherical local projection lifts positive altitudes radially outward', () => {
  const low = toGoatSphereLocal(0, 0, 0, 10);
  const high = toGoatSphereLocal(0, 15, 0, 10);
  assert.ok(high.y > low.y);
});
