import test from 'node:test';
import assert from 'node:assert/strict';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import { equirectangularToSphere } from './globeMath';
import {
  DRUM_ANGULAR_MASK_RADIUS,
  DRUM_BUILDINGS,
  DRUM_CAMERA_PRESETS,
  DRUM_GLOBE_CENTER,
  DRUM_GLOBE_SCALE,
  DRUM_ICE_FLOES,
  DRUM_LAKE_ICE_Y,
  DRUM_ROPEWAY_SPANS,
  DRUM_TOWERS,
  DRUM_TREES,
  drumFrozenLakeSignedDist,
  drumHarborSignedDist,
  drumRoadSignedDist,
  sampleDrumCoastMask,
  sampleDrumHeight,
  sampleDrumWalkSurfaceHeight,
  toDrumSphereLocal,
} from './drumTerrain';

test('Drum Island globe center matches onePieceLocations and stays clear of neighbors', () => {
  const loc = ONE_PIECE_LOCATIONS.find((l) => l.id === 'drum-island');
  assert.ok(loc, 'drum-island must exist in ONE_PIECE_LOCATIONS');
  assert.equal(loc.u, DRUM_GLOBE_CENTER.u);
  assert.equal(loc.v, DRUM_GLOBE_CENTER.v);

  const pDrum = equirectangularToSphere(
    DRUM_GLOBE_CENTER.u,
    DRUM_GLOBE_CENTER.v,
    1
  );
  for (const neighborId of [
    'nanimonai-island',
    'kyuka-island',
    'little-garden',
    'renaisse',
    'cactus-island',
  ]) {
    const n = ONE_PIECE_LOCATIONS.find((l) => l.id === neighborId)!;
    const pN = equirectangularToSphere(n.u, n.v, 1);
    const ang = Math.acos(
      Math.max(-1, Math.min(1, pDrum.x * pN.x + pDrum.y * pN.y + pDrum.z * pN.z))
    );
    assert.ok(
      ang > DRUM_ANGULAR_MASK_RADIUS + 0.04,
      `Drum Island must stay clear of ${neighborId} (ang=${ang.toFixed(4)})`
    );
  }
});

test('6 Drum Rockies stand cleanly spaced with tallest central tower supporting Drum Castle', () => {
  assert.equal(DRUM_TOWERS.length, 6, 'Drum Island must have exactly 6 Drum Rockies');
  const castleTower = DRUM_TOWERS.find((t) => t.hasCastle);
  assert.ok(castleTower, 'One Drum Rockie must host Drum Castle');
  assert.equal(castleTower.id, 'rockie-castle');

  for (const t of DRUM_TOWERS) {
    assert.ok(
      sampleDrumCoastMask(t.x, t.z) > 0.65,
      `tower ${t.id} must sit solidly inside island`
    );
    if (t.id !== castleTower.id) {
      assert.ok(
        castleTower.height > t.height + 10,
        `central castle tower (${castleTower.height}m) must tower above ${t.id} (${t.height}m)`
      );
    }
  }

  for (let i = 0; i < DRUM_TOWERS.length; i++) {
    for (let j = i + 1; j < DRUM_TOWERS.length; j++) {
      const a = DRUM_TOWERS[i];
      const b = DRUM_TOWERS[j];
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      assert.ok(
        d > a.baseRadius + b.baseRadius + 1.0,
        `towers ${a.id} and ${b.id} overlap (${d.toFixed(2)}m)`
      );
    }
  }
});

test('harbor inlet is navigable water while Great Frozen Lake sits flat north of Cocoa Weed', () => {
  for (let z = 62; z <= 98; z += 6) {
    assert.ok(
      drumHarborSignedDist(-2.0, z) < -2.5,
      `harbor channel at z=${z} must be navigable water`
    );
    assert.ok(
      sampleDrumHeight(-2.0, z) < -1.0,
      `harbor channel at z=${z} must be submerged`
    );
  }

  // Great Frozen Lake center (31, 7) must be flat ice north of Cocoa Weed (z ~ 27..40)
  assert.ok(drumFrozenLakeSignedDist(31.0, 7.0) < -8.0);
  const lakeH = sampleDrumHeight(31.0, 7.0);
  assert.ok(
    Math.abs(lakeH - DRUM_LAKE_ICE_Y) < 0.08,
    `Frozen lake center must sit at flat ice height (got ${lakeH})`
  );

  const cocoaBuildings = DRUM_BUILDINGS.filter((b) => b.district === 'cocoa-weed');
  assert.ok(cocoaBuildings.length >= 4, 'Cocoa Weed must have cottages');
  const maxCocoaZ = Math.min(...cocoaBuildings.map((b) => b.z));
  assert.ok(
    7.0 < maxCocoaZ - 12.0,
    'Great Frozen Lake must lie strictly north of Cocoa Weed'
  );
});

test('all settlements (Bighorn round houses, Robelle dense wooden town, Hiluluk clinic, Ropeway Terminus) are valid and non-overlapping', () => {
  const bighorn = DRUM_BUILDINGS.filter((b) => b.district === 'bighorn');
  const robelle = DRUM_BUILDINGS.filter((b) => b.district === 'robelle');
  const hiluluk = DRUM_BUILDINGS.find((b) => b.id === 'hiluluk-clinic');
  const station = DRUM_BUILDINGS.find((b) => b.id === 'ropeway-lake-station');

  assert.ok(bighorn.length >= 10, `expected >= 10 round Bighorn houses, got ${bighorn.length}`);
  assert.ok(
    bighorn.every((b) => b.kind === 'bighorn-round' && b.z >= 33),
    'all Bighorn houses must be round and at harbor entry south'
  );

  assert.ok(robelle.length >= 8, `expected >= 8 dense wooden Robelle buildings, got ${robelle.length}`);
  assert.ok(
    robelle.every((b) => b.kind === 'robelle-wood'),
    'Robelle buildings must use tight wooden typology'
  );

  assert.ok(hiluluk, "Dr. Hiluluk's clinic must exist");
  const distHilulukToBighorn = Math.min(
    ...bighorn.map((b) => Math.hypot(hiluluk.x - b.x, hiluluk.z - b.z))
  );
  assert.ok(
    distHilulukToBighorn >= 24.0,
    `Hiluluk's cabin must be isolated outside Bighorn (dist=${distHilulukToBighorn.toFixed(1)}m)`
  );

  assert.ok(station, 'Ropeway lower terminus station must exist');
  assert.ok(
    station.z < 0 && drumFrozenLakeSignedDist(station.x, station.z) > 1.5,
    'Ropeway terminus must sit on north shore of Great Frozen Lake north of Cocoa Weed'
  );

  for (const b of DRUM_BUILDINGS) {
    const h = sampleDrumHeight(b.x, b.z);
    assert.ok(h > 2.0, `building ${b.id} must stand on solid dry ground (h=${h})`);
    assert.ok(
      drumHarborSignedDist(b.x, b.z) > 1.2,
      `building ${b.id} must stay out of harbor water`
    );
    assert.ok(
      drumFrozenLakeSignedDist(b.x, b.z) > 1.0,
      `building ${b.id} must stay on shore outside lake ice`
    );
    assert.ok(
      drumRoadSignedDist(b.x, b.z) > 0.15,
      `building ${b.id} must not block road centerline`
    );
    for (const t of DRUM_TOWERS) {
      const d = Math.hypot(b.x - t.x, b.z - t.z);
      assert.ok(
        d > t.baseRadius + b.radius,
        `building ${b.id} overlaps drum rockie ${t.id} (d=${d.toFixed(1)}m)`
      );
    }
  }

  for (let i = 0; i < DRUM_BUILDINGS.length; i++) {
    for (let j = i + 1; j < DRUM_BUILDINGS.length; j++) {
      const a = DRUM_BUILDINGS[i];
      const b = DRUM_BUILDINGS[j];
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      const minClear =
        a.district === 'robelle' && b.district === 'robelle' ? 4.0 : 4.8;
      assert.ok(
        d >= minClear,
        `buildings ${a.id} and ${b.id} are too close (${d.toFixed(2)}m < ${minClear}m)`
      );
    }
  }
});

test('snowy forests, ice floes, ropeway spans, and 1.75m street camera presets are valid', () => {
  assert.ok(DRUM_TREES.length >= 90, `expected dense snowy forests, got ${DRUM_TREES.length}`);
  assert.ok(DRUM_ICE_FLOES.length >= 12, 'expected sea-ice floes around Drum Island');
  assert.equal(DRUM_ROPEWAY_SPANS.length, 3, 'expected 3 ropeway spans from Castle Peak');

  const hillTrees = DRUM_TREES.filter(
    (t) =>
      Math.hypot(t.x - DRUM_BUILDINGS.find((b) => b.id === 'hiluluk-clinic')!.x, t.z - DRUM_BUILDINGS.find((b) => b.id === 'hiluluk-clinic')!.z) < 16
  );
  assert.ok(hillTrees.length >= 4, "snowy pine forest must frame Dr. Hiluluk's clinic");

  for (const p of DRUM_CAMERA_PRESETS) {
    if (!p.isStreetView) continue;
    const [px, py, pz] = p.position;
    const ground = sampleDrumWalkSurfaceHeight(px, pz);
    assert.ok(
      ground >= 1.9,
      `street preset ${p.id} must stand on solid snow/ice/summit ground (ground=${ground.toFixed(2)})`
    );
    assert.ok(
      Math.abs(py - (ground + 1.75)) < 0.08,
      `street preset ${p.id} must stand at 1.75m human eye height`
    );
    for (const b of DRUM_BUILDINGS) {
      assert.ok(
        Math.hypot(px - b.x, pz - b.z) > b.radius + 1.1,
        `street preset ${p.id} must not spawn inside building ${b.id}`
      );
    }
  }

  const sp = toDrumSphereLocal(0, 1.15, 0, 10);
  assert.ok(Math.abs(sp.y) < DRUM_GLOBE_SCALE * 0.1);
});
