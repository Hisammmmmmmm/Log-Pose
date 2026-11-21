import test from 'node:test';
import assert from 'node:assert/strict';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import {
  computeIslandMistFactor,
  computeIslandMistSpec,
  computeIslandMistTint,
  shouldIncludeIslandInMist,
} from './islandMist';

test('shouldIncludeIslandInMist excludes sky, redline, underwater, and stacked sub-locations', () => {
  const byId = new Map(ONE_PIECE_LOCATIONS.map((loc) => [loc.id, loc]));

  assert.equal(shouldIncludeIslandInMist(byId.get('skypiea')!), false);
  assert.equal(shouldIncludeIslandInMist(byId.get('reverse-mountain')!), false);
  assert.equal(shouldIncludeIslandInMist(byId.get('mary-geoise')!), false);
  assert.equal(shouldIncludeIslandInMist(byId.get('fish-man-island')!), false);
  assert.equal(shouldIncludeIslandInMist(byId.get('foosha-village')!), false);
  assert.equal(shouldIncludeIslandInMist(byId.get('flower-capital')!), false);
  assert.equal(shouldIncludeIslandInMist(byId.get('onigashima')!), false);

  assert.equal(shouldIncludeIslandInMist(byId.get('dawn-island')!), true);
  assert.equal(shouldIncludeIslandInMist(byId.get('alabasta')!), true);
  assert.equal(shouldIncludeIslandInMist(byId.get('wano')!), true);
  assert.equal(shouldIncludeIslandInMist(byId.get('elbaf')!), true);
  assert.equal(shouldIncludeIslandInMist(byId.get('egghead-island')!), true);
  assert.equal(shouldIncludeIslandInMist(byId.get('whole-cake-island')!), true);
  assert.equal(shouldIncludeIslandInMist(byId.get('cacao-island')!), true);
});

test('computeIslandMistSpec scales custom mega-islands larger than minor islands and preserves invariants', () => {
  const byId = new Map(ONE_PIECE_LOCATIONS.map((loc) => [loc.id, loc]));
  const wanoSpec = computeIslandMistSpec(byId.get('wano')!);
  const dawnSpec = computeIslandMistSpec(byId.get('dawn-island')!);
  const shellsSpec = computeIslandMistSpec(byId.get('shells-town')!);

  assert.ok(wanoSpec.mistRadius > dawnSpec.mistRadius);
  assert.ok(dawnSpec.mistRadius > shellsSpec.mistRadius);

  for (const spec of [wanoSpec, dawnSpec, shellsSpec]) {
    assert.ok(spec.mistRadius > spec.coastRadius);
    assert.ok(spec.innerClearDist > spec.coastRadius);
    assert.ok(spec.outerFadeDist > spec.innerClearDist);
    assert.ok(spec.mistHeight > 0);
  }
});

test('computeIslandMistFactor returns 0 outside navigation mode and fades monotonically to 0 on approach', () => {
  const byId = new Map(ONE_PIECE_LOCATIONS.map((loc) => [loc.id, loc]));
  const dawnSpec = computeIslandMistSpec(byId.get('dawn-island')!);

  // Disabled outside navigation mode
  assert.equal(
    computeIslandMistFactor({
      distToShip: 1.5,
      innerClearDist: dawnSpec.innerClearDist,
      outerFadeDist: dawnSpec.outerFadeDist,
      navMix: 0,
    }),
    0
  );

  // Completely faded out at or inside harbor approach distance
  assert.equal(
    computeIslandMistFactor({
      distToShip: 0.228, // Dawn Island spawn radius
      innerClearDist: dawnSpec.innerClearDist,
      outerFadeDist: dawnSpec.outerFadeDist,
      navMix: 1,
    }),
    0
  );

  // Monotonically rises from innerClearDist to outerFadeDist
  const midDist = (dawnSpec.innerClearDist + dawnSpec.outerFadeDist) * 0.5;
  const nearVal = computeIslandMistFactor({
    distToShip: dawnSpec.innerClearDist + 0.05,
    innerClearDist: dawnSpec.innerClearDist,
    outerFadeDist: dawnSpec.outerFadeDist,
    navMix: 1,
  });
  const midVal = computeIslandMistFactor({
    distToShip: midDist,
    innerClearDist: dawnSpec.innerClearDist,
    outerFadeDist: dawnSpec.outerFadeDist,
    navMix: 1,
  });
  const farVal = computeIslandMistFactor({
    distToShip: dawnSpec.outerFadeDist + 0.2,
    innerClearDist: dawnSpec.innerClearDist,
    outerFadeDist: dawnSpec.outerFadeDist,
    navMix: 1,
  });

  assert.ok(nearVal > 0 && nearVal < midVal, `expected 0 < ${nearVal} < ${midVal}`);
  assert.ok(midVal > 0.4 && midVal < 0.6, `expected midpoint near 0.5, got ${midVal}`);
  assert.equal(farVal, 1);

  // Attenuates to 0 when diving subsea or flying high in Skypiea
  assert.equal(
    computeIslandMistFactor({
      distToShip: 1.4,
      innerClearDist: dawnSpec.innerClearDist,
      outerFadeDist: dawnSpec.outerFadeDist,
      navMix: 1,
      hideForSubseaMix: 1,
    }),
    0
  );
  assert.equal(
    computeIslandMistFactor({
      distToShip: 1.4,
      innerClearDist: dawnSpec.innerClearDist,
      outerFadeDist: dawnSpec.outerFadeDist,
      navMix: 1,
      altitudeFadeMix: 1,
    }),
    0
  );
});

test('computeIslandMistTint adjusts cleanly between day, twilight, and night', () => {
  const day = computeIslandMistTint(1, false);
  const twilight = computeIslandMistTint(0.35, true);
  const night = computeIslandMistTint(0, false);

  assert.ok(day.b > 0.9 && day.r > 0.8);
  assert.ok(twilight.r > twilight.b, 'twilight mist should lean warm amber-lavender');
  assert.ok(night.b > night.r && night.r < 0.4, 'night mist should darken into cool slate');
});
