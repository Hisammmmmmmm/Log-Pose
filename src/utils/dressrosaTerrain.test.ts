import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CORRIDA_CENTER,
  DRESSROSA_CAMERA_PRESETS,
  DRESSROSA_GIANT_TREES,
  DRESSROSA_HOUSES,
  DRESSROSA_LANDMARKS,
  DRESSROSA_TONTATTA_HUTS,
  DRESSROSA_WATERFALLS,
  ROYAL_PLATEAU_Y,
  dressrosaArchipelagoSignedDist,
  sampleDressrosaHeight,
  sampleDressrosaWalkSurfaceHeight,
  sampleDressrosaZone,
  toDressrosaSphereLocal,
} from './dressrosaTerrain';

test('Dressrosa archipelago separates Dressrosa, navigable strait/harbor, and Green Bit cleanly', () => {
  assert.equal(sampleDressrosaZone(-13, 42), 'acacia');
  assert.equal(sampleDressrosaZone(CORRIDA_CENTER.x, CORRIDA_CENTER.z), 'colosseum');
  assert.equal(sampleDressrosaZone(-4, -18), 'palace');
  assert.equal(sampleDressrosaZone(-42, -18), 'flower-hill');
  assert.equal(sampleDressrosaZone(36, -114), 'green-bit');

  // Royal Plateau rises starkly above Acacia city
  const palaceH = sampleDressrosaHeight(-4, -18);
  const acaciaH = sampleDressrosaHeight(-13, 42);
  assert.ok(palaceH >= ROYAL_PLATEAU_Y - 1.0, `Royal Plateau should tower >= 26m, got ${palaceH}`);
  assert.ok(acaciaH >= 5.0 && acaciaH <= 8.5, `Acacia plaza should sit ~6m, got ${acaciaH}`);

  // Strait between Dressrosa and Green Bit under the Iron Bridge is deep navigable water
  const straitY = sampleDressrosaHeight(29, -68);
  assert.equal(dressrosaArchipelagoSignedDist(29, -68).island, 'sea');
  assert.ok(straitY < -1.0, `Strait under Iron Bridge should be ocean (< -1.0), got ${straitY}`);

  // Southern Acacia harbor mouth and Sunny spawn points are navigable deep ocean
  assert.ok(
    sampleDressrosaHeight(DRESSROSA_LANDMARKS.sunnySpawnHarbor.x, DRESSROSA_LANDMARKS.sunnySpawnHarbor.z) < -1.5
  );
  assert.ok(
    sampleDressrosaHeight(DRESSROSA_LANDMARKS.sunnySpawnGreenBit.x, DRESSROSA_LANDMARKS.sunnySpawnGreenBit.z) < -1.5
  );
});

test('Dressrosa houses, waterfalls, Green Bit giant trees, and Tontatta huts sit on solid terrain', () => {
  for (const house of DRESSROSA_HOUSES) {
    const h = sampleDressrosaHeight(house.x, house.z);
    assert.ok(h > 3.5, `House ${house.id} at (${house.x}, ${house.z}) must stand on solid ground, got ${h}`);
  }

  for (const wf of DRESSROSA_WATERFALLS) {
    const { island } = dressrosaArchipelagoSignedDist(wf.x, wf.z);
    assert.ok(island !== 'sea', `Waterfall ${wf.id} should anchor on coastal cliff/harbor lip`);
  }

  for (const tree of DRESSROSA_GIANT_TREES) {
    assert.equal(sampleDressrosaZone(tree.x, tree.z), 'green-bit');
    const h = sampleDressrosaHeight(tree.x, tree.z);
    assert.ok(h >= 4.0, `Giant tree ${tree.id} must rest on solid Green Bit ground, got ${h}`);
  }

  for (const hut of DRESSROSA_TONTATTA_HUTS) {
    assert.equal(sampleDressrosaZone(hut.x, hut.z), 'green-bit');
    const h = sampleDressrosaHeight(hut.x, hut.z);
    assert.ok(h >= 6.0, `Tontatta hut ${hut.id} must rest in Green Bit clearing, got ${h}`);
  }
});

test('Dressrosa & Green Bit street-view presets stand at ~1.75m above walkable ground, Colosseum stand, or Iron Bridge', () => {
  assert.ok(DRESSROSA_CAMERA_PRESETS.length >= 7);
  assert.ok(
    DRESSROSA_CAMERA_PRESETS.some((p) => p.id === 'underground-factory'),
    'Expected underground-factory camera preset for subterranean industrial galleries'
  );
  for (const preset of DRESSROSA_CAMERA_PRESETS) {
    if (!preset.isStreetView) continue;
    const ground = sampleDressrosaWalkSurfaceHeight(
      preset.position[0],
      preset.position[2]
    );
    const clearance = preset.position[1] - ground;
    assert.ok(ground >= 5.5, `Street preset ${preset.id} must stand on elevated ground/bridge/stand, got ${ground}`);
    assert.ok(
      clearance >= 1.5 && clearance <= 2.0,
      `Street preset ${preset.id} must sit at ~1.75m human eye height, got ${clearance}`
    );
  }
});

test('toDressrosaSphereLocal projects archipelago relief onto spherical tangent shell', () => {
  const base = toDressrosaSphereLocal(0, 0, 0, 10);
  const summit = toDressrosaSphereLocal(-4, ROYAL_PLATEAU_Y, -18, 10);
  assert.ok(Math.abs(base.y) < 1e-6);
  assert.ok(summit.y > 0.04, `Projected Royal Plateau should stand cleanly above sea level, got ${summit.y}`);
});
