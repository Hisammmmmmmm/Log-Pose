import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AMAZON_LILY_ARENA_CENTER,
  AMAZON_LILY_CAMERA_PRESETS,
  AMAZON_LILY_CRATER_FLOOR_Y,
  AMAZON_LILY_CRATER_RIM_RADIUS,
  AMAZON_LILY_CRATER_RIM_Y,
  AMAZON_LILY_PALACE_CENTER,
  AMAZON_LILY_PORT_CHANNEL,
  amazonLilyPortWaterSignedDist,
  amazonLilyRiverSignedDist,
  buildAmazonLilyFauna,
  buildAmazonLilyHouses,
  buildAmazonLilyMushrooms,
  buildAmazonLilyTrees,
  sampleAmazonLilyHeight,
  sampleAmazonLilyWalkSurfaceHeight,
  toAmazonLilySphereLocal,
} from './amazonLilyTerrain';

test('Amazon Lily outer ocean, coastal cliffs, jungle belt, crater rim, and hollow crater match topography', () => {
  const outerOcean = sampleAmazonLilyHeight(-112, -108);
  assert.ok(outerOcean < -1.5, `Expected deep ocean outside coast, got ${outerOcean}`);

  const jungleSW = sampleAmazonLilyHeight(-64, 52);
  assert.ok(
    jungleSW > 5.0 && jungleSW < 22.0,
    `Expected jungle elevation between 5m and 22m, got ${jungleSW}`
  );

  const rimSouth = sampleAmazonLilyHeight(0, AMAZON_LILY_CRATER_RIM_RADIUS);
  const rimWest = sampleAmazonLilyHeight(-AMAZON_LILY_CRATER_RIM_RADIUS, 0);
  assert.ok(
    rimSouth > AMAZON_LILY_CRATER_RIM_Y - 5 && rimWest > AMAZON_LILY_CRATER_RIM_Y - 5,
    `Expected high truncated-cone crater rim around 42m, got S=${rimSouth}, W=${rimWest}`
  );

  const craterFloor = sampleAmazonLilyHeight(-12, 6);
  assert.ok(
    craterFloor >= AMAZON_LILY_CRATER_FLOOR_Y - 0.8 && craterFloor < 10.5,
    `Expected sheltered crater basin bottom near 3.4m, got ${craterFloor}`
  );
});

test('Combat arena, spike moat, Gorgon terrace, Kuja Palace terrace, and underground sea-cave channel carve cleanly', () => {
  const arenaFloor = sampleAmazonLilyHeight(
    AMAZON_LILY_ARENA_CENTER.x,
    AMAZON_LILY_ARENA_CENTER.z
  );
  assert.ok(
    Math.abs(arenaFloor - AMAZON_LILY_ARENA_CENTER.floorY) < 0.35,
    `Expected flat arena floor at ${AMAZON_LILY_ARENA_CENTER.floorY}, got ${arenaFloor}`
  );

  const moatPoint = sampleAmazonLilyHeight(
    AMAZON_LILY_ARENA_CENTER.x + 6.5,
    AMAZON_LILY_ARENA_CENTER.z
  );
  assert.ok(
    moatPoint < AMAZON_LILY_ARENA_CENTER.floorY - 1.2,
    `Expected spike moat lower than arena floor, got ${moatPoint}`
  );

  const palaceTerrace = sampleAmazonLilyHeight(
    AMAZON_LILY_PALACE_CENTER.x,
    AMAZON_LILY_PALACE_CENTER.z
  );
  assert.ok(
    Math.abs(palaceTerrace - AMAZON_LILY_PALACE_CENTER.y) < 3.0,
    `Expected elevated Kuja Palace terrace near ${AMAZON_LILY_PALACE_CENTER.y}, got ${palaceTerrace}`
  );

  const innerBasin = sampleAmazonLilyHeight(
    AMAZON_LILY_PORT_CHANNEL.basinCenter.x,
    AMAZON_LILY_PORT_CHANNEL.basinCenter.z
  );
  const portalWater = sampleAmazonLilyHeight(
    AMAZON_LILY_PORT_CHANNEL.portalMid.x,
    AMAZON_LILY_PORT_CHANNEL.portalMid.z
  );
  assert.ok(
    innerBasin < -0.5 && portalWater < -0.5,
    `Expected submerged sea-cave port channel below sea level, got basin=${innerBasin}, portal=${portalWater}`
  );
});

test('Kuja village houses, cliff stilt dwellings, jungle trees, mushrooms, and fauna stay grounded and clear of water', () => {
  const houses = buildAmazonLilyHouses();
  const cliffHouses = houses.filter((h) => h.isCliffStilt);
  const valleyHouses = houses.filter((h) => !h.isCliffStilt);
  assert.ok(cliffHouses.length >= 10, `Expected cliff stilt houses, got ${cliffHouses.length}`);
  assert.ok(valleyHouses.length >= 8, `Expected valley houses, got ${valleyHouses.length}`);

  for (const house of houses) {
    assert.ok(house.y > 2.0, `House ${house.id} should sit above flood/water level`);
    assert.ok(
      amazonLilyRiverSignedDist(house.x, house.z) > 0.2,
      `House ${house.id} should stay clear of river`
    );
    assert.ok(
      amazonLilyPortWaterSignedDist(house.x, house.z) > 0.5,
      `House ${house.id} should stay clear of port basin`
    );
  }

  const trees = buildAmazonLilyTrees();
  const mushrooms = buildAmazonLilyMushrooms();
  const fauna = buildAmazonLilyFauna();
  assert.ok(trees.length >= 100, `Expected dense jungle + cliff pines, got ${trees.length}`);
  assert.ok(mushrooms.length >= 10, `Expected exotic mushrooms, got ${mushrooms.length}`);
  assert.ok(fauna.length >= 5, `Expected giant boars/panthers/snakes, got ${fauna.length}`);

  for (const f of fauna) {
    assert.ok(f.y > 4.0, `Fauna ${f.id} must be grounded in dry jungle`);
  }
});

test('All Amazon Lily street-view camera presets sit cleanly at 1.75m above walkable ground', () => {
  for (const preset of AMAZON_LILY_CAMERA_PRESETS) {
    if (!preset.isStreetView) continue;
    const ground = sampleAmazonLilyWalkSurfaceHeight(
      preset.position[0],
      preset.position[2]
    );
    const clearance = preset.position[1] - ground;
    assert.ok(
      ground > 2.2,
      `Street preset ${preset.id} must be on dry walkable terrain, got ground=${ground}`
    );
    assert.ok(
      clearance >= 1.5 && clearance <= 2.1,
      `Street preset ${preset.id} must sit at ~1.75m above ground, got ${clearance}`
    );
  }
});

test('toAmazonLilySphereLocal lifts positive elevations radially above globeRadius', () => {
  const atSea = toAmazonLilySphereLocal(0, 0, 0, 10);
  const atRim = toAmazonLilySphereLocal(0, 42, 37.5, 10);
  assert.ok(Math.abs(atSea.y) < 1e-6);
  assert.ok(atRim.y > 0.04, `Expected elevated crater rim above globe surface, got ${atRim.y}`);
});
