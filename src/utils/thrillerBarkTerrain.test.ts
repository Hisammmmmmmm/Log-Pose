import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THRILLER_BARK_CAMERA_PRESETS,
  THRILLER_BARK_CASTLE_CENTER,
  THRILLER_BARK_CHAIN_ANCHORS,
  THRILLER_BARK_CHAPEL_CENTER,
  THRILLER_BARK_MANSION_CENTER,
  THRILLER_BARK_PERONA_CENTER,
  THRILLER_BARK_SIDE_MAST_POSITIONS,
  buildThrillerBarkCreatures,
  buildThrillerBarkGraves,
  buildThrillerBarkLanterns,
  buildThrillerBarkPumpkins,
  buildThrillerBarkTrees,
  sampleThrillerBarkHeight,
  sampleThrillerBarkWalkSurfaceHeight,
  thrillerBarkOuterHullSignedDist,
  thrillerBarkPathSignedDist,
  toThrillerBarkSphereLocal,
} from './thrillerBarkTerrain';

test('Thriller Bark outer ship hull, demonic mouth sea-gate, flooded inner lagoon, and ramparted island match layout', () => {
  const outerOcean = sampleThrillerBarkHeight(-126, 0);
  assert.ok(outerOcean < -1.5, `Expected Florian Triangle sea outside ship hull, got ${outerOcean}`);

  const mouthWater = sampleThrillerBarkHeight(0, 95);
  assert.ok(mouthWater < -1.0, `Expected navigable water inside giant demonic mouth sea-gate, got ${mouthWater}`);

  const starboardHull = sampleThrillerBarkHeight(94, 0);
  assert.ok(starboardHull > 7.0, `Expected elevated pirate-ship outer hull timber deck, got ${starboardHull}`);

  const innerLagoon = sampleThrillerBarkHeight(74, 0);
  assert.ok(innerLagoon < -1.5, `Expected flooded lagoon moat between ship hull and island ramparts, got ${innerLagoon}`);

  const forestFloor = sampleThrillerBarkHeight(32, 24);
  assert.ok(forestFloor > 4.5 && forestFloor < 11.0, `Expected haunted forest elevation 5..10m, got ${forestFloor}`);
});

test('Thriller Bark inner stagnant moat, drawbridge, Hogback Mansion, Moria Castle, Perona mound, and Chapel terrace align cleanly', () => {
  const innerMoat = sampleThrillerBarkHeight(21.0, 0);
  assert.ok(innerMoat < -1.0, `Expected deep stagnant moat around central castle compound, got ${innerMoat}`);

  const drawbridgeWalk = sampleThrillerBarkWalkSurfaceHeight(0, 21.5);
  assert.ok(drawbridgeWalk > 7.0, `Expected walkable drawbridge deck spanning inner moat, got ${drawbridgeWalk}`);

  const pierWalk = sampleThrillerBarkWalkSurfaceHeight(0, 72.0);
  assert.ok(pierWalk > 1.8, `Expected walkable timber causeway inside inner lagoon, got ${pierWalk}`);

  const mansionH = sampleThrillerBarkHeight(
    THRILLER_BARK_MANSION_CENTER.x,
    THRILLER_BARK_MANSION_CENTER.z
  );
  assert.ok(
    Math.abs(mansionH - THRILLER_BARK_MANSION_CENTER.y) < 1.2,
    `Expected Hogback Mansion terrace at ${THRILLER_BARK_MANSION_CENTER.y}, got ${mansionH}`
  );

  const castleH = sampleThrillerBarkHeight(
    THRILLER_BARK_CASTLE_CENTER.x,
    THRILLER_BARK_CASTLE_CENTER.z
  );
  assert.ok(
    Math.abs(castleH - THRILLER_BARK_CASTLE_CENTER.y) < 1.2,
    `Expected Moria Castle plinth near ${THRILLER_BARK_CASTLE_CENTER.y}, got ${castleH}`
  );

  const peronaH = sampleThrillerBarkHeight(
    THRILLER_BARK_PERONA_CENTER.x,
    THRILLER_BARK_PERONA_CENTER.z
  );
  assert.ok(
    Math.abs(peronaH - THRILLER_BARK_PERONA_CENTER.y) < 1.5,
    `Expected Perona tower terrace near ${THRILLER_BARK_PERONA_CENTER.y}, got ${peronaH}`
  );

  const chapelH = sampleThrillerBarkHeight(
    THRILLER_BARK_CHAPEL_CENTER.x,
    THRILLER_BARK_CHAPEL_CENTER.z
  );
  assert.ok(
    Math.abs(chapelH - THRILLER_BARK_CHAPEL_CENTER.y) < 1.6,
    `Expected Wedding Chapel upper terrace near ${THRILLER_BARK_CHAPEL_CENTER.y}, got ${chapelH}`
  );
});

test('Thriller Bark graves, dead trees, pumpkins, lanterns, and creatures remain grounded and clear of roads', () => {
  const graves = buildThrillerBarkGraves();
  const trees = buildThrillerBarkTrees();
  const pumpkins = buildThrillerBarkPumpkins();
  const creatures = buildThrillerBarkCreatures();
  const lanterns = buildThrillerBarkLanterns();

  assert.ok(graves.length >= 12, `Expected cemetery graves, got ${graves.length}`);
  assert.ok(trees.length >= 80, `Expected dead forest & wonder plants, got ${trees.length}`);
  assert.ok(pumpkins.length >= 6, `Expected giant pumpkins, got ${pumpkins.length}`);
  assert.ok(creatures.length >= 6, `Expected zombies & Kumacy, got ${creatures.length}`);
  assert.ok(lanterns.length >= 8, `Expected flickering lanterns, got ${lanterns.length}`);

  for (const g of graves) {
    assert.ok(g.y > 4.0, `Grave ${g.id} must be on dry cemetery ground`);
    assert.ok(
      thrillerBarkPathSignedDist(g.x, g.z) > 1.0,
      `Grave ${g.id} should stay clear of trails`
    );
  }
  for (const t of trees) {
    assert.ok(t.y > 3.5, `Tree ${t.id} must be grounded on land`);
    assert.ok(
      thrillerBarkOuterHullSignedDist(t.x, t.z) > 2.0,
      `Tree ${t.id} stays inside island perimeter`
    );
  }
});

test('All Thriller Bark human-scale street presets sit at ~1.75m above walkable surface', () => {
  for (const preset of THRILLER_BARK_CAMERA_PRESETS) {
    if (!preset.isStreetView) continue;
    const ground = sampleThrillerBarkWalkSurfaceHeight(
      preset.position[0],
      preset.position[2]
    );
    const clearance = preset.position[1] - ground;
    assert.ok(
      ground > 2.0,
      `Preset ${preset.id} must sit on dry walkable structure/terrain, got ground=${ground}`
    );
    assert.ok(
      clearance >= 1.4 && clearance <= 2.1,
      `Preset ${preset.id} must sit at ~1.75m above ground, got ${clearance}`
    );
  }
});

test('toThrillerBarkSphereLocal projects Thriller Bark heights radially onto planet shell', () => {
  const base = toThrillerBarkSphereLocal(0, 0, 0, 10);
  const mast = toThrillerBarkSphereLocal(0, 80, -4, 10);
  assert.ok(Math.abs(base.y) < 1e-6);
  assert.ok(mast.y > 0.1, `Expected soaring central mast elevation, got ${mast.y}`);
});

test('Thriller Bark side masts and diagonal anchor chains land squarely on outer ship hull deck', () => {
  for (const m of THRILLER_BARK_SIDE_MAST_POSITIONS) {
    const hullSd = thrillerBarkOuterHullSignedDist(m.x, m.z);
    const deckH = sampleThrillerBarkHeight(m.x, m.z);
    assert.ok(
      hullSd < 0,
      `Side mast ${m.id} must sit inside outer ship hull band, got hullSd=${hullSd}`
    );
    assert.ok(
      deckH > 7.0,
      `Side mast ${m.id} must rest on elevated wooden hull deck, got y=${deckH}`
    );
  }
  for (const [i, a] of THRILLER_BARK_CHAIN_ANCHORS.entries()) {
    const hullSd = thrillerBarkOuterHullSignedDist(a.x, a.z);
    const deckH = sampleThrillerBarkHeight(a.x, a.z);
    assert.ok(
      hullSd < 0.5,
      `Anchor chain ${i} must attach to outer ship hull deck, got hullSd=${hullSd}`
    );
    assert.ok(
      deckH > 7.0,
      `Anchor chain ${i} must terminate on hull deck, got y=${deckH}`
    );
  }
});
