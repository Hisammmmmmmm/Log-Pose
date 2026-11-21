import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BARATIE_CAMERA_PRESETS,
  BARATIE_FIN_DECK_Y,
  BARATIE_GLOBE_SCALE,
  BARATIE_LANDMARKS,
  BARATIE_MAIN_DECK_Y,
  BARATIE_QUARTER_DECK_Y,
  BARATIE_SPHERE_SEA_OFFSET,
  BARATIE_TIER2_DECK_Y,
  baratieMainHullHalfWidth,
  isLocalPointInBaratieHull,
  isOnBaratieBattleFin,
  sampleBaratieWalkSurfaceHeight,
  toBaratieSphereLocal,
} from './baratieTerrain';

test('baratie hull and deployed battle fins form symmetric, grounded footprints', () => {
  assert.ok(baratieMainHullHalfWidth(0) > 7.5);
  assert.equal(baratieMainHullHalfWidth(-20), 0);
  assert.equal(baratieMainHullHalfWidth(20), 0);

  // Starboard and port battle fins mirror cleanly
  assert.equal(isOnBaratieBattleFin(0, 14), true);
  assert.equal(isOnBaratieBattleFin(0, -14), true);
  assert.equal(isOnBaratieBattleFin(0, 22), false);
  assert.equal(isOnBaratieBattleFin(0, 4), false);

  // Fish bow & stern tail inside ship collision footprint, open sea outside
  assert.equal(isLocalPointInBaratieHull(-22, 0), true);
  assert.equal(isLocalPointInBaratieHull(21, 0), true);
  assert.equal(isLocalPointInBaratieHull(0, 15), true);
  assert.equal(isLocalPointInBaratieHull(0, -15), true);
  assert.equal(isLocalPointInBaratieHull(-32, 0), false);
  assert.equal(isLocalPointInBaratieHull(0, 25), false);
});

test('sampleBaratieWalkSurfaceHeight returns exact deck tiers and 0 in open sea', () => {
  assert.equal(sampleBaratieWalkSurfaceHeight(2, 14), BARATIE_FIN_DECK_Y);
  assert.equal(sampleBaratieWalkSurfaceHeight(2, -14), BARATIE_FIN_DECK_Y);
  assert.equal(sampleBaratieWalkSurfaceHeight(0, 7.2), BARATIE_MAIN_DECK_Y);
  assert.equal(sampleBaratieWalkSurfaceHeight(0, 5.8), BARATIE_TIER2_DECK_Y);
  assert.equal(sampleBaratieWalkSurfaceHeight(14.5, 0), BARATIE_QUARTER_DECK_Y);
  assert.equal(sampleBaratieWalkSurfaceHeight(40, 40), 0);
});

test('baratie human-scale street presets spawn cleanly at 1.75m eye height above walkable decks', () => {
  const streetPresets = BARATIE_CAMERA_PRESETS.filter((p) => p.isStreetView);
  assert.equal(streetPresets.length, 4);

  for (const preset of streetPresets) {
    const [px, py, pz] = preset.position;
    const deckY = sampleBaratieWalkSurfaceHeight(px, pz);
    if (preset.id === 'fish-bow') {
      assert.ok(
        py >= 1.65 && py <= 2.6,
        `${preset.id} sea-approach eye height should be human boat level, got ${py}`
      );
    } else {
      assert.ok(
        deckY >= BARATIE_FIN_DECK_Y,
        `${preset.id} must stand on a valid Baratie deck/fin, got deckY=${deckY}`
      );
      const eyeHeight = py - deckY;
      assert.ok(
        eyeHeight >= 1.65 && eyeHeight <= 1.9,
        `${preset.id} eye height should be ~1.75m, got ${eyeHeight}`
      );
    }
    const [tx, ty, tz] = preset.target;
    const dist = Math.hypot(tx - px, ty - py, tz - pz);
    assert.ok(dist >= 4.0 && dist <= 30.0, `${preset.id} target distance out of range: ${dist}`);
  }

  // Entrance preset looks directly toward main entrance & signage
  const entrance = BARATIE_CAMERA_PRESETS.find((p) => p.id === 'entrance-fin')!;
  assert.ok(entrance.position[2] > BARATIE_LANDMARKS.mainEntrance.z);
  assert.ok(entrance.target[2] < entrance.position[2]);
});

test('toBaratieSphereLocal applies ocean chord offset and spherical curvature cleanly', () => {
  const originWater = toBaratieSphereLocal(0, 0, 0, 10);
  assert.ok(
    Math.abs(originWater.y - BARATIE_SPHERE_SEA_OFFSET * BARATIE_GLOBE_SCALE) < 1e-6
  );

  const far = toBaratieSphereLocal(20, 0, 15, 10);
  assert.ok(far.y < originWater.y, 'outer coordinates curve downward with sphere');
});
