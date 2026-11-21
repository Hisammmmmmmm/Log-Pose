import test from 'node:test';
import assert from 'node:assert/strict';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import {
  JAYA_ANGULAR_MASK_RADIUS,
  JAYA_BUILDINGS,
  JAYA_CAMERA_PRESETS,
  JAYA_GLOBE_CENTER,
  JAYA_GLOBE_SCALE,
  JAYA_LANDMARKS,
  JAYA_PROPS,
  JAYA_SHIPS,
  JAYA_TREES,
  jayaMouthBaySignedDist,
  jayaTropicalLagoonSignedDist,
  sampleJayaCoastMask,
  sampleJayaHeight,
  sampleJayaWalkSurfaceHeight,
  toJayaSphereLocal,
} from './jayaTerrain';

function greatCircleRad(u1: number, v1: number, u2: number, v2: number): number {
  const lon1 = u1 * Math.PI * 2;
  const lat1 = Math.PI * 0.5 - v1 * Math.PI;
  const lon2 = u2 * Math.PI * 2;
  const lat2 = Math.PI * 0.5 - v2 * Math.PI;
  const cosD =
    Math.sin(lat1) * Math.sin(lat2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2);
  return Math.acos(Math.max(-1, Math.min(1, cosD)));
}

test('Jaya globe footprint matches ONE_PIECE_LOCATIONS and clears neighbor islands', () => {
  const jaya = ONE_PIECE_LOCATIONS.find((l) => l.id === 'jaya');
  const mockTown = ONE_PIECE_LOCATIONS.find((l) => l.id === 'mock-town');
  assert.ok(jaya, 'jaya must exist in ONE_PIECE_LOCATIONS');
  assert.ok(mockTown, 'mock-town must exist in ONE_PIECE_LOCATIONS');
  assert.equal(jaya.u, JAYA_GLOBE_CENTER.u);
  assert.equal(jaya.v, JAYA_GLOBE_CENTER.v);

  for (const neighborId of ['foolshout-island', 'ukkari-island', 'long-ring-long-land']) {
    const nb = ONE_PIECE_LOCATIONS.find((l) => l.id === neighborId);
    assert.ok(nb, `expected ${neighborId}`);
    const ang = greatCircleRad(
      JAYA_GLOBE_CENTER.u,
      JAYA_GLOBE_CENTER.v,
      nb.u,
      nb.v
    );
    assert.ok(
      ang > JAYA_ANGULAR_MASK_RADIUS + 0.04,
      `Jaya mask overlaps neighbor ${neighborId}: ang=${ang.toFixed(4)}`
    );
  }
});

test('Broken-skull Jaya geography: navigable Mouth Bay, southern isthmus bridge & offshore islets', () => {
  // Center Mouth Bay must be deep water so Thousand Sunny can sail straight in
  for (const [bx, bz] of [
    [-2, -70],
    [-2, -35],
    [-2, 0],
    [-4, 42],
  ]) {
    assert.ok(
      jayaMouthBaySignedDist(bx, bz) < -3,
      `Mouth Bay center (${bx}, ${bz}) must be open water`
    );
    assert.ok(
      sampleJayaHeight(bx, bz) < -1.5,
      `Mouth Bay (${bx}, ${bz}) height must be submerged: ${sampleJayaHeight(bx, bz)}`
    );
  }

  // Southern isthmus bridge & both West (Mock Town) and East (South Grave) landmasses must be dry land
  for (const [lx, lz] of [
    [-35.5, -26.0], // Mock Town
    [-65.0, -10.0], // Western rocky ridge
    [0.0, 66.0],    // Southern isthmus bridge
    [40.0, 20.0],   // South Grave jungle
    [52.0, -48.0],  // Cricket's peninsula
    [61.0, -71.0],  // NE offshore islet
    [22.0, 81.0],   // South offshore islet
  ]) {
    assert.ok(
      sampleJayaCoastMask(lx, lz) > 0.6,
      `Land point (${lx}, ${lz}) must be dry land`
    );
    assert.ok(
      sampleJayaHeight(lx, lz) > 1.5,
      `Land point (${lx}, ${lz}) elevation must be above sea: ${sampleJayaHeight(lx, lz)}`
    );
  }
});

test('Mock Town, Tropical Hotel lagoon, Jungle Hideout & Cricket House placement and non-overlap', () => {
  const pub = JAYA_BUILDINGS.find((b) => b.id === 'mt-pub-main');
  const gecker = JAYA_BUILDINGS.find((b) => b.id === 'mt-gecker');
  const watchtower = JAYA_BUILDINGS.find((b) => b.id === 'mt-watchtower-wood');
  const roundTower = JAYA_BUILDINGS.find((b) => b.id === 'mt-port-tower-round');
  const hotel = JAYA_BUILDINGS.find((b) => b.id === 'tropical-hotel');
  const cricket = JAYA_BUILDINGS.find((b) => b.id === 'cricket-castle-house');

  assert.ok(pub && gecker && watchtower && roundTower && hotel && cricket);
  assert.ok(JAYA_BUILDINGS.length >= 20, `expected >= 20 buildings, got ${JAYA_BUILDINGS.length}`);
  assert.ok(JAYA_SHIPS.length >= 6, 'expected 5 pirate ships at Mock Town + Saruyama ships');

  // Tropical Hotel must sit over its shallow turquoise lagoon cove
  assert.ok(
    jayaTropicalLagoonSignedDist(hotel.x, hotel.z) < 0,
    'Tropical Hotel should stand over the turquoise lagoon cove'
  );

  // Cricket's house must be on the eastern side of Mouth Bay, opposite Mock Town
  assert.ok(cricket.x > 40 && pub.x < -25);

  // Dry ground checks for non-stilt buildings
  for (const b of JAYA_BUILDINGS) {
    if (b.kind === 'tropical-hotel') continue;
    const h = sampleJayaHeight(b.x, b.z);
    assert.ok(h > 1.8, `building ${b.id} must sit on dry ground, got y=${h}`);
    assert.ok(
      Math.abs(b.y - (h - 0.12)) < 0.05,
      `building ${b.id} pivot must hug ground`
    );
  }

  // Pairwise horizontal non-overlap between buildings
  for (let i = 0; i < JAYA_BUILDINGS.length; i++) {
    for (let j = i + 1; j < JAYA_BUILDINGS.length; j++) {
      const a = JAYA_BUILDINGS[i];
      const b = JAYA_BUILDINGS[j];
      const dist = Math.hypot(a.x - b.x, a.z - b.z);
      const minSep = Math.max(a.width, a.depth) * 0.44 + Math.max(b.width, b.depth) * 0.44;
      assert.ok(
        dist >= minSep,
        `Buildings ${a.id} and ${b.id} overlap (${dist.toFixed(2)}m < ${minSep.toFixed(2)}m)`
      );
    }
  }
});

test('Dense tropical jungle, wildlife South Birds, and 1.75m human camera presets', () => {
  assert.ok(JAYA_TREES.length >= 160, `expected dense tropical jungle, got ${JAYA_TREES.length}`);
  const birds = JAYA_PROPS.filter((p) => p.kind === 'south-bird');
  assert.ok(birds.length >= 3, 'expected South Bird wildlife in jungle');

  const streetPresets = JAYA_CAMERA_PRESETS.filter((p) => p.isStreetView);
  assert.equal(streetPresets.length, 5, 'expected 5 human eye-level exploration presets');

  for (const p of streetPresets) {
    const surface = sampleJayaWalkSurfaceHeight(p.position[0], p.position[2]);
    const eyeH = p.position[1] - surface;
    assert.ok(
      Math.abs(eyeH - 1.75) < 0.06,
      `preset ${p.id} must sit at 1.75m eye level, got ${eyeH.toFixed(2)}m`
    );

    // Ensure camera does not spawn inside any building solid
    for (const b of JAYA_BUILDINGS) {
      const d = Math.hypot(p.position[0] - b.x, p.position[2] - b.z);
      assert.ok(
        d > Math.max(b.width, b.depth) * 0.48,
        `preset ${p.id} inside building ${b.id}`
      );
    }
  }

  const sp = toJayaSphereLocal(0, 1.15, 0, 10);
  assert.ok(Math.abs(sp.y) < JAYA_GLOBE_SCALE * 0.1);
  assert.ok(JAYA_LANDMARKS.cricketHouse.id === 'cricket-castle-house');
});
