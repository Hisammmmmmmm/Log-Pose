import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAWN_BUILDINGS,
  DAWN_CAMERA_PRESETS,
  DAWN_DADAN_Y,
  DAWN_FOOSHA_Y,
  DAWN_GOA_CENTER_Y,
  DAWN_GOA_EDGE_Y,
  DAWN_GOA_HIGH_Y,
  DAWN_GRAY_Y,
  DAWN_LANDMARKS,
  DAWN_PIER_Y,
  DAWN_TREES,
  DAWN_WINDMILL_Y,
  dawnRoadSignedDist,
  isInGoaKingdom,
  isInGrayTerminal,
  isNearGoaWall,
  sampleDawnHeight,
  sampleDawnWalkSurfaceHeight,
  sampleFooshaBayBeachMask,
  toDawnSphereLocal,
} from './dawnTerrain';

test('Dawn Island terrain covers ocean, Foosha crescent beach, Windmill bluff, Gray Terminal, Goa tiered plateaus, and Mt. Colubo peaks', () => {
  const oceanH = sampleDawnHeight(130, -50);
  const redForceWaterH = sampleDawnHeight(DAWN_LANDMARKS.redForce.x, DAWN_LANDMARKS.redForce.z);
  const fooshaBeachH = sampleDawnHeight(80.5, -12.0);
  const fooshaPierWalkH = sampleDawnWalkSurfaceHeight(80.5, -12.0);
  const fooshaH = sampleDawnHeight(60.5, -10.0);
  const windmillH = sampleDawnHeight(DAWN_LANDMARKS.fooshaWindmill.x, DAWN_LANDMARKS.fooshaWindmill.z);
  const grayH = sampleDawnHeight(-18, -12);
  const goaEdgeH = sampleDawnHeight(-37, -14);
  const goaCenterH = sampleDawnHeight(-56, -14);
  const goaHighH = sampleDawnHeight(-80, -14);
  const goaHighStairsWalkH = sampleDawnWalkSurfaceHeight(-69.0, -14.0);
  const dadanH = sampleDawnHeight(DAWN_LANDMARKS.dadanHut.x, DAWN_LANDMARKS.dadanHut.z);
  const coluboPeakH = sampleDawnHeight(9, 34);

  assert.ok(oceanH < -1.0, `Open ocean should be submerged (< -1.0), got ${oceanH}`);
  assert.ok(redForceWaterH < -0.5, `Red Force anchorage in Foosha Bay should be water, got ${redForceWaterH}`);
  assert.ok(fooshaBeachH > 0.2 && fooshaBeachH < 2.6, `Foosha beach should slope above water, got ${fooshaBeachH}`);
  assert.ok(Math.abs(fooshaPierWalkH - DAWN_PIER_Y) < 0.2, `Foosha pier walk height should sit at ${DAWN_PIER_Y}, got ${fooshaPierWalkH}`);
  assert.ok(fooshaH > DAWN_FOOSHA_Y - 0.6 && fooshaH < DAWN_FOOSHA_Y + 0.6, `Foosha crossroads should sit near ${DAWN_FOOSHA_Y}, got ${fooshaH}`);
  assert.ok(windmillH > DAWN_WINDMILL_Y - 0.9, `Foosha Windmill bluff should sit elevated around ${DAWN_WINDMILL_Y}, got ${windmillH}`);
  assert.ok(grayH > DAWN_GRAY_Y - 0.9 && grayH < DAWN_GRAY_Y + 0.9, `Gray Terminal should sit near ${DAWN_GRAY_Y}, got ${grayH}`);
  assert.ok(Math.abs(goaEdgeH - DAWN_GOA_EDGE_Y) < 0.35, `Goa Edge Town should sit near ${DAWN_GOA_EDGE_Y}, got ${goaEdgeH}`);
  assert.ok(Math.abs(goaCenterH - DAWN_GOA_CENTER_Y) < 0.35, `Goa Center Town should sit near ${DAWN_GOA_CENTER_Y}, got ${goaCenterH}`);
  assert.ok(Math.abs(goaHighH - DAWN_GOA_HIGH_Y) < 0.35, `Goa High Town should sit near ${DAWN_GOA_HIGH_Y}, got ${goaHighH}`);
  assert.ok(
    goaEdgeH < goaCenterH && goaCenterH < goaHighH,
    `Goa tiers must climb Edge (${goaEdgeH}) < Center (${goaCenterH}) < High (${goaHighH})`
  );
  assert.ok(
    goaHighStairsWalkH > DAWN_GOA_CENTER_Y && goaHighStairsWalkH < DAWN_GOA_HIGH_Y,
    `Goa High Town staircase midpoint should rise smoothly between Center and High Town, got ${goaHighStairsWalkH}`
  );
  assert.ok(Math.abs(dadanH - DAWN_DADAN_Y) < 0.8, `Dadan clearing should sit near ${DAWN_DADAN_Y}, got ${dadanH}`);
  assert.ok(coluboPeakH > 20.0, `Mt. Colubo main peak should exceed 20, got ${coluboPeakH}`);
});

test('Dawn Island buildings and trees avoid walkable paths, Goa walls, and beaches', () => {
  const fooshaCount = DAWN_BUILDINGS.filter((b) => b.district === 'foosha').length;
  const goaCount = DAWN_BUILDINGS.filter((b) => b.district.startsWith('goa-')).length;
  const grayCount = DAWN_BUILDINGS.filter((b) => b.district === 'gray-terminal').length;

  assert.ok(fooshaCount >= 10, `Expected >= 10 Foosha cottages, got ${fooshaCount}`);
  assert.ok(goaCount >= 18, `Expected >= 18 Goa buildings across tiers, got ${goaCount}`);
  assert.ok(grayCount >= 5, `Expected >= 5 Gray Terminal shacks, got ${grayCount}`);

  for (const b of DAWN_BUILDINGS) {
    assert.ok(
      dawnRoadSignedDist(b.x, b.z) >= 0.35,
      `Building ${b.id} at (${b.x}, ${b.z}) overlaps walkable road (d=${dawnRoadSignedDist(b.x, b.z).toFixed(2)})`
    );
    assert.equal(
      isNearGoaWall(b.x, b.z, 0.5),
      false,
      `Building ${b.id} at (${b.x}, ${b.z}) overlaps Goa wall`
    );
  }

  for (const t of DAWN_TREES) {
    if (t.id.startsWith('goa-park-')) continue;
    assert.ok(
      dawnRoadSignedDist(t.x, t.z) >= 0.35,
      `Tree ${t.id} at (${t.x}, ${t.z}) blocks a walkable path`
    );
    assert.equal(isInGoaKingdom(t.x, t.z), false, `Wild tree ${t.id} inside Goa walls`);
    assert.equal(isInGrayTerminal(t.x, t.z), false, `Wild tree ${t.id} inside Gray Terminal`);
    assert.ok(sampleFooshaBayBeachMask(t.x, t.z) <= 0.4, `Tree ${t.id} on Foosha sandy beach`);
  }
});

test('All Dawn Island human-scale camera presets sit on open paths at eye level above walkable terrain', () => {
  assert.equal(DAWN_CAMERA_PRESETS.length, 6);
  for (const preset of DAWN_CAMERA_PRESETS) {
    const [px, py, pz] = preset.position;
    const groundY = sampleDawnWalkSurfaceHeight(px, pz);
    if (preset.isStreetView) {
      const clearance = py - groundY;
      assert.ok(
        clearance >= 1.4 && clearance <= 3.5,
        `Street preset ${preset.id} clearance=${clearance.toFixed(2)} should be human eye level`
      );
      assert.ok(
        dawnRoadSignedDist(px, pz) < 0.8,
        `Street preset ${preset.id} should stand cleanly on or beside a walkable path (d=${dawnRoadSignedDist(px, pz).toFixed(2)})`
      );
    } else {
      assert.ok(py > groundY + 40, `Overview preset should sit high above Dawn Island`);
    }
  }
});

test('Spherical local projection maps upward altitude radially outward', () => {
  const base = toDawnSphereLocal(0, 0, 0, 10);
  const top = toDawnSphereLocal(0, 24, 0, 10);
  assert.ok(top.y > base.y, 'Higher terrain elevation projects radially outward');
});

test('Dawn Island provides deep seabed, gentle sandy shoreline transition, and sculpted northern/southern mountain peaks', () => {
  assert.ok(sampleDawnHeight(130, -50) < -3.8, 'Far offshore seabed must sit deeply submerged (< -3.8m)');

  // Check sandy shoreline transition around multiple coasts (Foosha bay, SE coast, north coast)
  const seBeachProfile = [92, 88, 84, 80, 76].map((x) => sampleDawnHeight(x, 12));
  assert.ok(
    seBeachProfile.some((h) => h >= -0.4 && h <= 1.6),
    `SE shore should include a gradual sandy beach crossing sea level, got ${seBeachProfile.map((v) => v.toFixed(2)).join(', ')}`
  );

  // North cordillera behind Foosha / Midway Forest should rise into sculpted ridge (> 10m)
  const northRidgeH = sampleDawnHeight(24, -30);
  assert.ok(northRidgeH > 10.0, `Expected northern cordillera mountain ridge > 10m, got ${northRidgeH}`);

  // Mt. Colubo peak height stays grand & well above Dadan's clearing
  assert.ok(sampleDawnHeight(9, 34.5) > 22.0, 'Mt. Colubo main peak must exceed 22m');
});
