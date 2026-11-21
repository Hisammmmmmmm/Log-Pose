import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHELLS_BASE_Y,
  SHELLS_BUILDINGS,
  SHELLS_CAMERA_PRESETS,
  SHELLS_PIER_Y,
  SHELLS_TOWN_Y,
  SHELLS_TREES,
  sampleShellsHeight,
  sampleShellsWalkSurfaceHeight,
  shellsRoadSignedDist,
  toShellsSphereLocal,
} from './shellsTownTerrain';

test('Shells Town terrain separates ocean, pier, lower town, ascending ramp, and G-153 plateau', () => {
  const oceanH = sampleShellsHeight(0, 76);
  assert.ok(oceanH < -0.9, `Expected ocean outside coast < -0.9m, got ${oceanH}`);

  const pierH = sampleShellsWalkSurfaceHeight(-10.0, 66.5);
  assert.equal(pierH, SHELLS_PIER_Y, 'Harbor pier surface matches SHELLS_PIER_Y');

  const townH = sampleShellsHeight(-10.0, 44.0);
  assert.ok(
    Math.abs(townH - SHELLS_TOWN_Y) < 0.45,
    `Expected Shells Town avenue near ${SHELLS_TOWN_Y}m, got ${townH}`
  );

  const rampMidH = sampleShellsHeight(-10.0, 21.8);
  assert.ok(
    rampMidH > SHELLS_TOWN_Y + 1.5 && rampMidH < SHELLS_BASE_Y - 1.5,
    `Expected smooth mid-ramp between town and fortress, got ${rampMidH}`
  );

  const baseH = sampleShellsHeight(-6.0, 2.0);
  assert.ok(
    Math.abs(baseH - SHELLS_BASE_Y) < 0.25,
    `Expected flat G-153 courtyard at ${SHELLS_BASE_Y}m, got ${baseH}`
  );
});

test('Shells Town buildings and trees never block streets or courtyard paths', () => {
  assert.ok(SHELLS_BUILDINGS.length >= 24, 'Expected full set of G-153 and town buildings');
  for (const b of SHELLS_BUILDINGS) {
    assert.ok(
      b.y >= 1.5,
      `Building ${b.id} placed at invalid elevation y=${b.y}`
    );
    const d = shellsRoadSignedDist(b.x, b.z);
    assert.ok(
      d >= -0.2,
      `Building ${b.id} center (${b.x}, ${b.z}) overlaps walkable road (d=${d})`
    );
  }

  assert.ok(SHELLS_TREES.length >= 80, 'Expected rich coastal & cliff greenery');
  for (const t of SHELLS_TREES) {
    assert.ok(
      shellsRoadSignedDist(t.x, t.z) >= 0.7,
      `Tree ${t.id} encroaches on road/courtyard`
    );
  }
});

test('Human street-level camera presets sit strictly at eye level on walkable streets & pier', () => {
  const streetPresets = SHELLS_CAMERA_PRESETS.filter((p) => p.isStreetView);
  assert.ok(streetPresets.length >= 4, 'Expected at least 4 street-level views');

  for (const preset of streetPresets) {
    const [cx, cy, cz] = preset.position;
    const groundY = sampleShellsWalkSurfaceHeight(cx, cz);
    const eyeHeight = cy - groundY;
    assert.ok(
      eyeHeight >= 1.4 && eyeHeight <= 3.0,
      `Preset ${preset.id} eye height ${eyeHeight.toFixed(2)}m out of human [1.4, 3.0] range`
    );
    assert.ok(
      shellsRoadSignedDist(cx, cz) <= 0.6,
      `Preset ${preset.id} camera (${cx}, ${cz}) is not standing on a walkable street/yard/pier`
    );
  }
});

test('toShellsSphereLocal lifts positive elevations radially above globeRadius', () => {
  const p0 = toShellsSphereLocal(0, 0, 0, 10);
  const pHigh = toShellsSphereLocal(0, SHELLS_BASE_Y, 0, 10);
  assert.ok(pHigh.y > p0.y, 'Higher terrain must lift above globe surface');
});

test('Shells Town has deep seabed, smooth southern sandy beach without perimeter wall, and sculpted northern peaks', () => {
  assert.ok(sampleShellsHeight(0, 82) < -3.8, 'Far offshore seabed must sit deeply submerged (< -3.8m)');

  // Verify south coast east & west of pier drops gently from town (~2.6m) through beach (~0..1.5m) into sea (< 0)
  // rather than jumping up to a 6.2m perimeter cliff wall!
  const southShoreProfile = [55, 58, 61, 64, 67].map((z) => sampleShellsHeight(10, z));
  assert.ok(
    southShoreProfile.every((h) => h < 3.2),
    `Southern town shore must never hit a 6.2m cliff rim, got ${southShoreProfile.map((v) => v.toFixed(2)).join(', ')}`
  );
  assert.ok(
    southShoreProfile.some((h) => h >= -0.4 && h <= 1.6),
    `Southern shore must transition smoothly through sandy beach elevations, got ${southShoreProfile.map((v) => v.toFixed(2)).join(', ')}`
  );

  // Verify sculpted Yotsuba limestone peaks rise prominently behind G-153 (> 20m)
  const northPeakH = sampleShellsHeight(-8, -45);
  assert.ok(northPeakH > 20.0, `Expected northern Yotsuba limestone peak > 20m, got ${northPeakH}`);
});
