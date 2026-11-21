import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FULL_DAY_CYCLE_SECONDS,
  advanceSolarHour,
  equirectangularToSphere,
  classifyMapPixel,
  computeTerrainAlbedo,
  computeSunPosition,
  computeDaylightFactor,
  filterIslands,
  formatCloudCover,
  formatHour,
  formatLatLon,
  ridgedFbm2D,
  shortestSolarHourDelta,
} from './globeMath';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import { ISLAND_MESH_BUILDERS } from '../islands';

test('equirectangularToSphere maps poles and prime/reverse meridian accurately', () => {
  const R = 10;

  const northPole = equirectangularToSphere(0.5, 0, R);
  assert.ok(Math.abs(northPole.x) < 1e-6);
  assert.ok(Math.abs(northPole.y - R) < 1e-6);
  assert.ok(Math.abs(northPole.z) < 1e-6);

  const southPole = equirectangularToSphere(0.5, 1, R);
  assert.ok(Math.abs(southPole.x) < 1e-6);
  assert.ok(Math.abs(southPole.y + R) < 1e-6);
  assert.ok(Math.abs(southPole.z) < 1e-6);

  // u = 0.5, v = 0.5 is Reverse Mountain at (+R, 0, 0)
  const reverseMountain = equirectangularToSphere(0.5, 0.5, R);
  assert.ok(Math.abs(reverseMountain.x - R) < 1e-6);
  assert.ok(Math.abs(reverseMountain.y) < 1e-6);
  assert.ok(Math.abs(reverseMountain.z) < 1e-6);

  // Arbitrary point preserves radius R
  const p = equirectangularToSphere(0.33, 0.49, R);
  const dist = Math.hypot(p.x, p.y, p.z);
  assert.ok(Math.abs(dist - R) < 1e-6);
});

test('classifyMapPixel distinguishes Red Line, green islands, desert, and ocean', () => {
  const redLine = classifyMapPixel(148, 42, 42);
  assert.equal(redLine.terrain, 'redline');
  assert.ok(redLine.height >= 0.8);
  assert.equal(redLine.oceanMask, 0);

  const island = classifyMapPixel(110, 145, 58);
  assert.equal(island.terrain, 'land');
  assert.ok(island.height > 0.3);
  assert.equal(island.oceanMask, 0);

  const alabasta = classifyMapPixel(198, 165, 85);
  assert.equal(alabasta.terrain, 'desert');
  assert.equal(alabasta.oceanMask, 0);

  const ocean = classifyMapPixel(45, 92, 118);
  assert.equal(ocean.terrain, 'ocean');
  assert.equal(ocean.height, 0);
  assert.equal(ocean.oceanMask, 1);

  const calmBelt = classifyMapPixel(115, 175, 195);
  assert.equal(calmBelt.terrain, 'calmbelt');
  assert.equal(calmBelt.oceanMask, 1);
});

test('computeTerrainAlbedo produces clean biome-specific colors without map text', () => {
  const redCol = computeTerrainAlbedo({
    height: 0.78,
    slope: 0.2,
    redWeight: 0.9,
    desertWeight: 0,
    snowWeight: 0,
    detailNoise: 0.5,
  });
  assert.ok(redCol[0] > redCol[1] + 40);

  const desertCol = computeTerrainAlbedo({
    height: 0.38,
    slope: 0.1,
    redWeight: 0,
    desertWeight: 0.9,
    snowWeight: 0,
    detailNoise: 0.6,
  });
  assert.ok(desertCol[0] > 170 && desertCol[1] > 120 && desertCol[2] < 120);

  const greenCol = computeTerrainAlbedo({
    height: 0.35,
    slope: 0.05,
    redWeight: 0,
    desertWeight: 0,
    snowWeight: 0,
    detailNoise: 0.5,
  });
  assert.ok(greenCol[1] > greenCol[0] && greenCol[1] > greenCol[2]);

  const snowCol = computeTerrainAlbedo({
    height: 0.65,
    slope: 0.05,
    redWeight: 0,
    desertWeight: 0,
    snowWeight: 0.9,
    detailNoise: 0.5,
  });
  assert.ok(snowCol[0] > 200 && snowCol[1] > 200 && snowCol[2] > 210);
});

test('computeSunPosition orbits opposite sides between noon and midnight', () => {
  const noon = computeSunPosition(12, 50);
  const midnight = computeSunPosition(0, 50);

  assert.ok(noon.x > 0);
  assert.ok(midnight.x < 0);
  assert.ok(Math.abs(noon.x + midnight.x) < 1e-6);
  assert.ok(computeDaylightFactor(12) > 0.99);
  assert.ok(computeDaylightFactor(0) < 0.01);
});

test('formatHour, formatLatLon, and formatCloudCover produce valid readouts', () => {
  assert.equal(formatHour(0), '00:00');
  assert.equal(formatHour(13.5), '13:30');
  assert.equal(formatHour(24), '00:00');
  assert.equal(formatLatLon(0.5, 0.5), '0.0°N · 0.0°E');
  assert.equal(formatCloudCover(0), '0%');
  assert.equal(formatCloudCover(0.25), '25%');
  assert.equal(formatCloudCover(1.4), '100%');
});

test('ridgedFbm2D stays bounded in [0..1]', () => {
  for (let i = 0; i < 20; i++) {
    const val = ridgedFbm2D(i * 1.37, i * 0.91, 4);
    assert.ok(val >= 0 && val <= 1);
  }
});

test('filterIslands filters by name, arc, and region', () => {
  const wano = filterIslands(ONE_PIECE_LOCATIONS, 'wano');
  assert.ok(wano.some((l) => l.id === 'wano'));

  const newWorld = filterIslands(ONE_PIECE_LOCATIONS, '', 'New World');
  assert.ok(newWorld.length >= 6);
  assert.ok(newWorld.every((l) => l.region === 'New World'));

  const empty = filterIslands(ONE_PIECE_LOCATIONS, 'nonexistent-island-xyz');
  assert.equal(empty.length, 0);
});

test('every charted island has unique coords and a dedicated separate mesh builder module', () => {
  assert.ok(ONE_PIECE_LOCATIONS.length >= 180);

  const seenIds = new Set<string>();
  for (const island of ONE_PIECE_LOCATIONS) {
    assert.ok(!seenIds.has(island.id), `Duplicate island id: ${island.id}`);
    seenIds.add(island.id);
    assert.ok(island.u >= 0 && island.u <= 1, `Invalid u for ${island.id}`);
    assert.ok(island.v >= 0 && island.v <= 1, `Invalid v for ${island.id}`);
    assert.equal(
      typeof ISLAND_MESH_BUILDERS[island.id],
      'function',
      `Missing island mesh builder for ${island.id}`
    );
  }
  assert.equal(
    Object.keys(ISLAND_MESH_BUILDERS).length,
    ONE_PIECE_LOCATIONS.length
  );
});

test('advanceSolarHour completes a full 24h day in 10 minutes (600s) and wraps cleanly', () => {
  assert.equal(FULL_DAY_CYCLE_SECONDS, 600);
  // 1 minute (60s) = 2.4 in-game hours
  assert.ok(Math.abs(advanceSolarHour(12, 60) - 14.4) < 1e-9);
  // 5 minutes (300s) = 12 in-game hours
  assert.ok(Math.abs(advanceSolarHour(13.5, 300) - 1.5) < 1e-9);
  // 10 minutes (600s) wraps back to the exact starting hour
  assert.ok(Math.abs(advanceSolarHour(13.5, 600) - 13.5) < 1e-9);
  // 25 seconds = 0.1 in-game hours (6 minutes)
  assert.ok(Math.abs(advanceSolarHour(0, 25) - 1.0) < 1e-9);

  assert.ok(Math.abs(shortestSolarHourDelta(23.5, 0.5) - 1.0) < 1e-9);
  assert.ok(Math.abs(shortestSolarHourDelta(0.5, 23.5) + 1.0) < 1e-9);
});
