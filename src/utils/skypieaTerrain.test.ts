import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ANGEL_BAY_CENTER,
  ANGEL_BEACH_CENTER,
  GIANT_JACK_CENTER,
  JUNGLE_BUTTE_CENTER,
  SHANDORA_PYRAMID_CENTER,
  SHANDORA_RUINS_NW,
  SKYPIEA_ALTITUDE,
  SKYPIEA_BRIDGES,
  SKYPIEA_CAMERA_PRESETS,
  SKYPIEA_GLOBE_CENTER,
  SKYPIEA_GLOBE_SCALE,
  KNOCK_UP_STREAM_SKY_LOCAL,
  UPPER_YARD_CENTER,
  UPPER_YARD_PLATEAU_Y,
  buildSkypieaHouses,
  buildSkypieaTrees,
  getKnockUpStreamGlobeCoords,
  sampleSkypieaHeight,
  sampleSkypieaWalkSurfaceHeight,
  sampleUpperYardRamp,
  skypieaCoastSignedDist,
  skypieaRiverSignedDist,
  skypieaRoadSignedDist,
  toSkypieaSphereLocal,
} from './skypieaTerrain';
import { JAYA_GLOBE_CENTER } from './jayaTerrain';
import { equirectangularToSphere } from './globeMath';

test('Angel Bay and meandering jungle rivers carve below sea level while landmasses rise cleanly', () => {
  assert.ok(
    skypieaCoastSignedDist(ANGEL_BAY_CENTER.x, ANGEL_BAY_CENTER.z) > 10,
    'Angel Bay center is open sky-water'
  );
  assert.ok(
    sampleSkypieaHeight(ANGEL_BAY_CENTER.x, ANGEL_BAY_CENTER.z) < -1.0,
    'Angel Bay floor sits below water level'
  );
  assert.ok(
    skypieaCoastSignedDist(0, 0) < -40,
    'Center of Skypiea jungle is deep inland'
  );
  assert.ok(
    skypieaRiverSignedDist(21, 14) < 0,
    'River fork lies inside water channel'
  );
  assert.ok(
    sampleSkypieaHeight(ANGEL_BEACH_CENTER.x, ANGEL_BEACH_CENTER.z) > 0.5,
    'Angel Beach sand sits above bay water'
  );
});

test('Upper Yard cliff plateau, Giant Jack mound, Jungle Butte, and Shandora terraces match reference reliefs', () => {
  const uyCenter = sampleSkypieaHeight(UPPER_YARD_CENTER.x, UPPER_YARD_CENTER.z);
  assert.ok(
    Math.abs(uyCenter - UPPER_YARD_PLATEAU_Y) < 0.2,
    `Expected Upper Yard plateau at ${UPPER_YARD_PLATEAU_Y}, got ${uyCenter}`
  );

  // Ascent path climbs monotonically toward Upper Yard
  const rFoot = sampleUpperYardRamp(72, 20);
  const rMid = sampleUpperYardRamp(90, 2);
  const rTop = sampleUpperYardRamp(100, -12);
  assert.ok(rTop.height > rMid.height && rMid.height > rFoot.height);

  assert.ok(sampleSkypieaHeight(JUNGLE_BUTTE_CENTER.x, JUNGLE_BUTTE_CENTER.z) > 17);
  assert.ok(sampleSkypieaHeight(GIANT_JACK_CENTER.x, GIANT_JACK_CENTER.z) > 9.5);
  assert.ok(sampleSkypieaHeight(SHANDORA_PYRAMID_CENTER.x, SHANDORA_PYRAMID_CENTER.z) > 6.0);
  assert.ok(sampleSkypieaHeight(SHANDORA_RUINS_NW.x, SHANDORA_RUINS_NW.z) > 9.5);
});

test('Angel Beach houses, Shandia huts, and jungle trees are grounded and keep roads clear', () => {
  const houses = buildSkypieaHouses();
  assert.ok(houses.length >= 18, `Expected >= 18 houses, got ${houses.length}`);

  for (const h of houses) {
    assert.ok(Number.isFinite(h.y) && h.y >= 0.7, `House ${h.id} submerged: y=${h.y}`);
    const rd = skypieaRoadSignedDist(h.x, h.z);
    assert.ok(rd > -0.8, `House ${h.id} blocks road (roadSignedDist=${rd})`);
  }

  const trees = buildSkypieaTrees();
  assert.ok(trees.length >= 160, `Expected dense jungle canopy, got ${trees.length}`);
  for (const t of trees) {
    assert.ok(Number.isFinite(t.y) && t.y >= 0.5, `Tree submerged at (${t.x},${t.z})`);
    if (t.kind === 'jungle') {
      assert.ok(
        skypieaRoadSignedDist(t.x, t.z) >= 2.3,
        `Jungle tree blocked road at (${t.x},${t.z})`
      );
      assert.ok(
        skypieaRiverSignedDist(t.x, t.z) >= 2.2,
        `Jungle tree spawned in river at (${t.x},${t.z})`
      );
    }
  }

  // Bridges span over river channels
  for (const b of SKYPIEA_BRIDGES) {
    assert.ok(
      skypieaRiverSignedDist(b.x, b.z) < 1.5,
      `Bridge at (${b.x},${b.z}) is not spanning a river`
    );
  }
});

test('All Skypiea human-scale camera presets stay above local ground and clear of terrain', () => {
  for (const preset of SKYPIEA_CAMERA_PRESETS) {
    const [px, py, pz] = preset.position;
    const ground = sampleSkypieaHeight(px, pz);
    assert.ok(
      py > ground + 0.7,
      `Preset ${preset.id} y=${py} clips below ground=${ground}`
    );
  }
});

test('toSkypieaSphereLocal wraps island onto elevated sky sphere radius', () => {
  const globeRadius = 10;
  const centerPt = toSkypieaSphereLocal(0, 0, 0, globeRadius);
  assert.equal(centerPt.x, 0);
  assert.equal(centerPt.y, 0);
  assert.equal(centerPt.z, 0);

  const mesaPt = toSkypieaSphereLocal(
    UPPER_YARD_CENTER.x,
    UPPER_YARD_PLATEAU_Y,
    UPPER_YARD_CENTER.z,
    globeRadius
  );
  const distFromCenter = Math.hypot(
    mesaPt.x,
    globeRadius + SKYPIEA_ALTITUDE + mesaPt.y,
    mesaPt.z
  );
  const expectedR =
    globeRadius + SKYPIEA_ALTITUDE + UPPER_YARD_PLATEAU_Y * SKYPIEA_GLOBE_SCALE;
  assert.ok(Math.abs(distFromCenter - expectedR) < 1e-6);
});

test('Walkable surface elevation supports Angel Beach pier and jungle river bridges', () => {
  // Mid-pier over Angel Bay water
  assert.ok(sampleSkypieaHeight(37, 75) < 0, 'Water under pier is below sea level');
  assert.ok(
    sampleSkypieaWalkSurfaceHeight(37, 75) > 1.0,
    'Pier deck supports walking above bay water'
  );
  // Circular pier end-platform
  assert.ok(sampleSkypieaWalkSurfaceHeight(24, 80) > 1.0);

  // River bridges
  for (const b of SKYPIEA_BRIDGES) {
    assert.ok(
      sampleSkypieaWalkSurfaceHeight(b.x, b.z) > 3.5,
      `Bridge at (${b.x},${b.z}) walk height is elevated above river`
    );
  }
});

test('Skypiea hovers vertically closer to Jaya for skull silhouette and aligns Knock Up Stream with Angel Bay', () => {
  assert.ok(
    SKYPIEA_ALTITUDE <= 0.78 && SKYPIEA_ALTITUDE >= 0.45,
    `Expected tighter Skypiea altitude for Jaya skull pairing, got ${SKYPIEA_ALTITUDE}`
  );
  const jayaCenter = equirectangularToSphere(JAYA_GLOBE_CENTER.u, JAYA_GLOBE_CENTER.v, 10);
  const skySeaCenter = equirectangularToSphere(SKYPIEA_GLOBE_CENTER.u, SKYPIEA_GLOBE_CENTER.v, 10);
  const lateralSep = Math.hypot(
    skySeaCenter.x - jayaCenter.x,
    skySeaCenter.y - jayaCenter.y,
    skySeaCenter.z - jayaCenter.z
  );
  assert.ok(
    lateralSep > 0.3 && lateralSep < 0.75,
    `Expected Jaya + Skypiea tight lateral skull pairing, got ${lateralSep}`
  );

  // Knock Up Stream coordinates lie in deep open Angel Bay west of Angel Beach
  assert.ok(
    sampleSkypieaHeight(KNOCK_UP_STREAM_SKY_LOCAL.x, KNOCK_UP_STREAM_SKY_LOCAL.z) < -1.0,
    'Knock Up Stream crests in navigable deep Angel Bay water'
  );
  const kusUV = getKnockUpStreamGlobeCoords(10);
  assert.ok(kusUV.u > JAYA_GLOBE_CENTER.u && Math.abs(kusUV.v - JAYA_GLOBE_CENTER.v) < 0.02);
});
