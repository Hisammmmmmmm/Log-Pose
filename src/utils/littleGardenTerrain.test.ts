import test from 'node:test';
import assert from 'node:assert/strict';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import {
  LITTLE_GARDEN_ANGULAR_MASK_RADIUS,
  LITTLE_GARDEN_CAMERA_PRESETS,
  LITTLE_GARDEN_FOLIAGE,
  LITTLE_GARDEN_GLOBE_CENTER,
  LITTLE_GARDEN_LAKE,
  LITTLE_GARDEN_LAKE_WATER_Y,
  LITTLE_GARDEN_LANDMARKS,
  LITTLE_GARDEN_SKELETONS,
  LITTLE_GARDEN_VOLCANOES,
  littleGardenLakeEllipseDist,
  littleGardenPathSignedDist,
  littleGardenSkeletonFootprintDist,
  sampleLittleGardenHeight,
  sampleLittleGardenWalkSurfaceHeight,
  toLittleGardenSphereLocal,
} from './littleGardenTerrain';

test('Little Garden center matches onePieceLocations entry and avoids neighbor overlap', () => {
  const entry = ONE_PIECE_LOCATIONS.find((i) => i.id === 'little-garden');
  assert.ok(entry, 'little-garden entry exists in ONE_PIECE_LOCATIONS');
  assert.equal(entry.u, LITTLE_GARDEN_GLOBE_CENTER.u);
  assert.equal(entry.v, LITTLE_GARDEN_GLOBE_CENTER.v);

  const kyuka = ONE_PIECE_LOCATIONS.find((i) => i.id === 'kyuka-island');
  assert.ok(kyuka);
  const dPhi = (kyuka.u - entry.u) * Math.PI * 2;
  const dTheta = (kyuka.v - entry.v) * Math.PI;
  const angSep = Math.hypot(dPhi, dTheta);
  assert.ok(
    LITTLE_GARDEN_ANGULAR_MASK_RADIUS + 0.015 < angSep,
    `Mask + blend must stay smaller than separation to Kyuka (${angSep.toFixed(4)})`
  );
});

test('Lake basin sits submerged beneath water level while central rock spire mound rises', () => {
  const shoreBed = sampleLittleGardenHeight(LITTLE_GARDEN_LAKE.cx + 5.0, LITTLE_GARDEN_LAKE.cz + 1.2);
  assert.ok(
    shoreBed < LITTLE_GARDEN_LAKE_WATER_Y,
    `Expected submerged lake bed < ${LITTLE_GARDEN_LAKE_WATER_Y}, got ${shoreBed}`
  );
  const spireBase = sampleLittleGardenHeight(LITTLE_GARDEN_LAKE.spireX, LITTLE_GARDEN_LAKE.spireZ);
  assert.ok(spireBase > LITTLE_GARDEN_LAKE_WATER_Y, 'Central lake spire base rises above lake water');
});

test('Winding path network connects landmarks cleanly and stays clear of foliage', () => {
  // Check central avenue point between skeletons, lakeside point, and Mr. 3 trail entry
  const canyonPath = littleGardenPathSignedDist(-5.0, -2.0);
  const lakePath = littleGardenPathSignedDist(11.5, -30.5);
  const mr3Path = littleGardenPathSignedDist(-4.0, 29.2);
  assert.ok(canyonPath < 0, 'Central canyon path should be inside trail network');
  assert.ok(lakePath < 0, 'Lakeside promenade should be inside trail network');
  assert.ok(mr3Path < 0, 'Path to Mr. 3 clearing should reach clearing entrance');

  for (const item of LITTLE_GARDEN_FOLIAGE) {
    assert.ok(
      littleGardenPathSignedDist(item.x, item.z) >= 0.45,
      `Foliage ${item.id} intrudes onto walkable trail`
    );
    assert.ok(
      littleGardenLakeEllipseDist(item.x, item.z) >= 1.1,
      `Foliage ${item.id} inside lake`
    );
    for (const skel of LITTLE_GARDEN_SKELETONS) {
      assert.ok(
        littleGardenSkeletonFootprintDist(item.x, item.z, skel).normalized >= 0.95,
        `Foliage ${item.id} intersects ${skel.id}`
      );
    }
  }
});

test('Both skeletons, volcanoes, and Mr. 3 Wax House clearing have valid land relief', () => {
  assert.equal(LITTLE_GARDEN_SKELETONS.length, 2);
  assert.ok(LITTLE_GARDEN_VOLCANOES.length >= 6);

  const mr3 = LITTLE_GARDEN_LANDMARKS.mr3WaxHouse;
  const hMr3 = sampleLittleGardenHeight(mr3.x, mr3.z);
  assert.ok(Math.abs(hMr3 - mr3.y) < 0.25, `Mr. 3 ground should match clearing height, got ${hMr3}`);

  // Sea perimeter plunges cleanly underwater
  assert.ok(sampleLittleGardenHeight(95, 0) < -3.5);
  assert.ok(sampleLittleGardenHeight(0, 82) < -3.5);
});

test('Human-scale camera presets stand cleanly at ~1.75m above walkable ground & project onto R=10 sphere', () => {
  const streetPresets = LITTLE_GARDEN_CAMERA_PRESETS.filter((p) => p.isStreetView);
  assert.ok(streetPresets.length >= 3);

  for (const p of streetPresets) {
    const [x, y, z] = p.position;
    const walkH = sampleLittleGardenWalkSurfaceHeight(x, z);
    const clearance = y - walkH;
    assert.ok(
      clearance >= 1.65 && clearance <= 1.85,
      `Preset ${p.id} eye clearance should be ~1.75m, got ${clearance.toFixed(2)}`
    );
  }

  const sphereOrigin = toLittleGardenSphereLocal(0, 0, 0, 10);
  assert.ok(Math.abs(sphereOrigin.x) < 1e-6);
  assert.ok(Math.abs(sphereOrigin.z) < 1e-6);
});
