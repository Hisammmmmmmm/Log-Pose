import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GECKO_BLACK_CAT_BEACH_Y,
  GECKO_BUILDINGS,
  GECKO_CAMERA_PRESETS,
  GECKO_HONEY_Y,
  GECKO_MANSION_Y,
  GECKO_TREES,
  geckoRoadSignedDist,
  isInHoneyPlaza,
  isInKayaEstate,
  sampleBlackCatBeachMask,
  sampleGeckoHeight,
  sampleGeckoWalkSurfaceHeight,
  toGeckoSphereLocal,
} from './geckoTerrain';

test('Gecko Islands terrain matches ocean, cove beach, Syrup hills, Kaya terrace, Honey Town plateau, and central peaks', () => {
  const oceanH = sampleGeckoHeight(130, -50);
  const blackCatWaterH = sampleGeckoHeight(10, 56);
  const blackCatSandH = sampleGeckoHeight(8.5, 40.5);
  const syrupH = sampleGeckoHeight(-74, 24);
  const kayaH = sampleGeckoHeight(-47, 22);
  const honeyH = sampleGeckoHeight(60, -24);
  const bridgeWalkH = sampleGeckoWalkSurfaceHeight(41.5, -24);
  const centralPeakH = sampleGeckoHeight(16, -5);
  const eseIsletH = sampleGeckoHeight(107, 15);

  assert.ok(oceanH < -1.0, `Open ocean should be submerged (< -1.0), got ${oceanH}`);
  assert.ok(blackCatWaterH < -0.5, `Bezan Black anchorage should be navigable water, got ${blackCatWaterH}`);
  assert.ok(
    blackCatSandH > 0.6 && blackCatSandH <= GECKO_BLACK_CAT_BEACH_Y + 0.6,
    `Black Cat cove sand should sit around beach elevation, got ${blackCatSandH}`
  );
  assert.ok(syrupH > 2.4 && syrupH < 4.5, `Syrup Village should sit on gentle green hills, got ${syrupH}`);
  assert.ok(
    Math.abs(kayaH - GECKO_MANSION_Y) < 0.25,
    `Kaya Mansion terrace should match ${GECKO_MANSION_Y}, got ${kayaH}`
  );
  assert.ok(
    Math.abs(honeyH - GECKO_HONEY_Y) < 0.25,
    `Honey Town plateau should match ${GECKO_HONEY_Y}, got ${honeyH}`
  );
  assert.ok(
    Math.abs(bridgeWalkH - GECKO_HONEY_Y) < 0.2,
    `Honey Town West Bridge deck should stay flush at ${GECKO_HONEY_Y}, got ${bridgeWalkH}`
  );
  assert.ok(centralPeakH > 15.0, `Central highland peak should exceed 15, got ${centralPeakH}`);
  assert.ok(eseIsletH > 4.0, `ESE satellite islet peak should rise above ocean, got ${eseIsletH}`);
});

test('Syrup cottages, Honey Town houses, Black Cat shacks, and forest trees stay off roads and Kaya estate', () => {
  const syrupCount = GECKO_BUILDINGS.filter((b) => b.district === 'syrup').length;
  const honeyCount = GECKO_BUILDINGS.filter((b) => b.district === 'honey').length;
  const blackCatCount = GECKO_BUILDINGS.filter((b) => b.district === 'black-cat').length;

  assert.ok(syrupCount >= 12, `Expected >= 12 Syrup cottages, got ${syrupCount}`);
  assert.ok(honeyCount >= 14, `Expected >= 14 Honey Town buildings, got ${honeyCount}`);
  assert.equal(blackCatCount, 2, `Expected 2 Black Cat cove shacks, got ${blackCatCount}`);

  for (const b of GECKO_BUILDINGS) {
    assert.ok(
      geckoRoadSignedDist(b.x, b.z) >= 0.35,
      `Building ${b.id} at (${b.x}, ${b.z}) overlaps walkable street`
    );
    assert.equal(
      isInKayaEstate(b.x, b.z),
      false,
      `Building ${b.id} overlaps Kaya estate`
    );
  }

  for (const t of GECKO_TREES) {
    if (t.id === 'kaya-oak-tree' || t.id === 'kaya-cypress-tree') continue;
    assert.ok(
      geckoRoadSignedDist(t.x, t.z) >= 0.35,
      `Tree ${t.id} at (${t.x}, ${t.z}) blocks a walkable road`
    );
    assert.equal(
      isInHoneyPlaza(t.x, t.z),
      false,
      `Tree ${t.id} spawns inside Honey Town plaza`
    );
    assert.ok(
      sampleBlackCatBeachMask(t.x, t.z) <= 0.26,
      `Tree ${t.id} spawns on Black Cat sandy cove`
    );
  }
});

test('All Gecko human-scale camera presets sit cleanly above walkable surfaces', () => {
  assert.equal(GECKO_CAMERA_PRESETS.length, 6);
  for (const preset of GECKO_CAMERA_PRESETS) {
    const [px, py, pz] = preset.position;
    const groundY = sampleGeckoWalkSurfaceHeight(px, pz);
    if (preset.isStreetView) {
      const clearance = py - groundY;
      assert.ok(
        clearance >= 1.4 && clearance <= 3.5,
        `Street preset ${preset.id} clearance=${clearance.toFixed(2)} should be human eye level`
      );
    } else {
      assert.ok(py > groundY + 40, `Overview preset should sit high above island`);
    }
  }
});

test('Spherical local projection maps upward altitude radially outward', () => {
  const base = toGeckoSphereLocal(0, 0, 0, 10);
  const top = toGeckoSphereLocal(0, 20, 0, 10);
  assert.ok(top.y > base.y, 'Higher terrain elevation projects radially outward');
});
