import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARINEFORD_BAY_CENTER,
  MARINEFORD_CAMERA_PRESETS,
  MARINEFORD_GLOBE_SCALE,
  buildMarinefordCannons,
  buildMarinefordHouses,
  buildMarinefordShips,
  buildMarinefordTents,
  buildMarinefordTrees,
  buildMarinefordWatchtowers,
  marinefordBaySignedDist,
  marinefordRoadSignedDist,
  marinefordWallSignedDist,
  sampleMarinefordHeight,
  sampleMarinefordWalkSurfaceHeight,
  toMarinefordSphereLocal,
} from './marinefordTerrain';

test('Marineford carves crescent Oris Bay below sea level and rises to northern mountains', () => {
  const bayWaterY = sampleMarinefordHeight(MARINEFORD_BAY_CENTER.x, MARINEFORD_BAY_CENTER.z);
  const plazaY = sampleMarinefordHeight(0, -16);
  const keepTerraceY = sampleMarinefordHeight(0, -38);
  const mountainPeakY = sampleMarinefordHeight(0, -82);

  assert.ok(bayWaterY < -1.0, `Oris Bay center (${bayWaterY}) must sit below sea level`);
  assert.ok(plazaY > 2.2 && plazaY < 3.4, `Oris Plaza (${plazaY}) should sit flat around 2.75`);
  assert.ok(keepTerraceY > plazaY + 1.5, `HQ Keep terrace (${keepTerraceY}) must step above Oris Plaza`);
  assert.ok(mountainPeakY > 24, `Northern mountain range (${mountainPeakY}) must rise dramatically behind HQ`);
});

test('Execution platform twin stairs and central pier support smooth walkable heights', () => {
  const pierY = sampleMarinefordWalkSurfaceHeight(0, 8);
  assert.ok(pierY > 2.0, `Central wharf pier (${pierY}) must elevate walker above bay water`);

  const stairFoot = sampleMarinefordWalkSurfaceHeight(0, -6.5);
  const stairMid = sampleMarinefordWalkSurfaceHeight(0, -9.8);
  const scaffoldTop = sampleMarinefordWalkSurfaceHeight(0, -15.5);

  assert.ok(
    stairMid > stairFoot + 0.5 && stairMid < scaffoldTop - 0.5,
    `Execution stairs (${stairFoot.toFixed(2)} -> ${stairMid.toFixed(2)} -> ${scaffoldTop.toFixed(2)}) must climb smoothly`
  );
});

test('Marine town houses avoid Oris Bay, ramparts, roads, and stay grounded', () => {
  const houses = buildMarinefordHouses();
  const towers = buildMarinefordWatchtowers();
  const cannons = buildMarinefordCannons();
  const trees = buildMarinefordTrees();
  const tents = buildMarinefordTents();

  assert.ok(houses.length >= 60, `Expected dense Marineford town (>=60 houses), got ${houses.length}`);
  assert.equal(towers.length, 8);
  assert.ok(cannons.length >= 12);
  assert.ok(trees.length >= 60);
  assert.equal(tents.length, 8);

  for (const h of houses) {
    assert.ok(marinefordBaySignedDist(h.x, h.z) > 4.0, `House ${h.id} encroaches on Oris Bay`);
    assert.ok(marinefordWallSignedDist(h.x, h.z) > 3.2, `House ${h.id} overlaps crescent rampart`);
    assert.ok(marinefordRoadSignedDist(h.x, h.z) > 1.0, `House ${h.id} blocks a road or plaza`);
    assert.ok(h.y >= 1.8 && h.y <= 12.0, `House ${h.id} ground height ${h.y} out of bounds`);
  }
});

test('Marine warships are anchored inside Oris Bay or Harbor Mouth water', () => {
  const ships = buildMarinefordShips();
  assert.ok(ships.length >= 5);
  for (const s of ships) {
    const bayD = marinefordBaySignedDist(s.x, s.z);
    assert.ok(bayD < -2.0, `Ship ${s.id} at (${s.x}, ${s.z}) is not safely inside water (bayD=${bayD.toFixed(2)})`);
  }
});

test('All Marineford camera presets sit safely above walkable surfaces', () => {
  for (const preset of MARINEFORD_CAMERA_PRESETS) {
    const [px, py, pz] = preset.position;
    const ground = sampleMarinefordWalkSurfaceHeight(px, pz);
    assert.ok(
      py > ground + 1.2,
      `Preset ${preset.id} camera y=${py} too close to walkable surface=${ground.toFixed(2)}`
    );
  }
});

test('toMarinefordSphereLocal curves flat coordinates smoothly onto globe shell', () => {
  const globeR = 10;
  const center = toMarinefordSphereLocal(0, 12, 0, globeR);
  const edge = toMarinefordSphereLocal(90, 12, 0, globeR);
  const rCenter = Math.hypot(center.x, globeR + center.y, center.z);
  const rEdge = Math.hypot(edge.x, globeR + edge.y, edge.z);

  assert.ok(Math.abs(rCenter - (globeR + 12 * MARINEFORD_GLOBE_SCALE)) < 1e-4);
  assert.ok(Math.abs(rEdge - (globeR + 12 * MARINEFORD_GLOBE_SCALE)) < 1e-4);
  assert.ok(edge.y < center.y);
});
