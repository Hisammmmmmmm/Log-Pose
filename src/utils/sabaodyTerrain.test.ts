import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SABAODY_BRIDGES,
  SABAODY_CAMERA_PRESETS,
  SABAODY_GROVE_CLUSTERS,
  SABAODY_LANDMARKS,
  buildSabaodyBubbles,
  buildSabaodyMangroves,
  sampleSabaodyHeight,
  sampleSabaodyWalkSurfaceHeight,
  toSabaodySphereLocal,
} from './sabaodyTerrain';

test('Sabaody Archipelago contains exactly 79 numbered Yarukiman mangroves across Groves 1..79 grounded on dry grove islets', () => {
  const mangroves = buildSabaodyMangroves();
  assert.equal(
    mangroves.length,
    79,
    `Expected exactly 79 Yarukiman mangroves, got ${mangroves.length}`
  );

  const numbers = new Set(mangroves.map((m) => m.groveNumber));
  for (let n = 1; n <= 79; n++) {
    assert.ok(numbers.has(n), `Missing Yarukiman mangrove #${n}`);
  }

  for (const m of mangroves) {
    const groundH = sampleSabaodyHeight(m.x, m.z);
    assert.ok(
      groundH > 1.0,
      `Mangrove #${m.groveNumber} at (${m.x}, ${m.z}) must sit on dry mangrove islet, got y=${groundH}`
    );
    assert.ok(m.trunkHeight >= 35, `Mangrove #${m.groveNumber} must soar tall`);
  }
});

test('Sabaody grove clusters, lagoons, suspension bridges, and navigable sea channels match layout', () => {
  // All 6 zone clusters must have dry ground at their centers
  for (const cluster of SABAODY_GROVE_CLUSTERS) {
    const h = sampleSabaodyHeight(cluster.x, cluster.z);
    assert.ok(
      h > 2.5,
      `Cluster ${cluster.id} center must be dry elevated ground, got ${h}`
    );
  }

  // All key landmarks sit on dry ground
  const dryLandmarks = [
    SABAODY_LANDMARKS.ferrisWheel,
    SABAODY_LANDMARKS.parkPlaza,
    SABAODY_LANDMARKS.coatingYard,
    SABAODY_LANDMARKS.businessPlaza,
    SABAODY_LANDMARKS.auctionHouse,
    SABAODY_LANDMARKS.shakkysBar,
    SABAODY_LANDMARKS.marineFortress,
  ];
  for (const lm of dryLandmarks) {
    const h = sampleSabaodyHeight(lm.x, lm.z);
    assert.ok(h > 2.5, `Landmark at (${lm.x}, ${lm.z}) must sit on dry ground, got ${h}`);
  }

  // Outer southern harbor approach remains open navigable ocean for Thousand Sunny
  const outerApproach = sampleSabaodyHeight(-34.0, 92.0);
  assert.ok(
    outerApproach < -1.5,
    `Expected navigable Paradise sea outside Sabaody port, got ${outerApproach}`
  );

  // Suspension bridges provide elevated walkable span across lagoon channels
  for (const b of SABAODY_BRIDGES) {
    const mx = (b.ax + b.bx) * 0.5;
    const mz = (b.az + b.bz) * 0.5;
    const walkH = sampleSabaodyWalkSurfaceHeight(mx, mz);
    assert.ok(
      walkH >= b.deckY,
      `Bridge ${b.id} midpoint walkable height should be >= ${b.deckY}, got ${walkH}`
    );
  }
});

test('Sabaody floating soap bubbles cover the archipelago and street-view presets sit at ~1.75m', () => {
  const bubbles = buildSabaodyBubbles();
  assert.ok(bubbles.length >= 90, `Expected rich resin bubble cloud, got ${bubbles.length}`);
  for (const b of bubbles) {
    assert.ok(b.radius >= 0.8 && b.y > 4.0);
  }

  for (const preset of SABAODY_CAMERA_PRESETS) {
    if (!preset.isStreetView) continue;
    const ground = sampleSabaodyWalkSurfaceHeight(
      preset.position[0],
      preset.position[2]
    );
    const clearance = preset.position[1] - ground;
    assert.ok(
      ground >= 2.0,
      `Street preset ${preset.id} must stand on dry ground/pier, got ground=${ground}`
    );
    assert.ok(
      clearance >= 1.4 && clearance <= 2.1,
      `Street preset ${preset.id} must sit at ~1.75m eye height, got ${clearance}`
    );
  }
});

test('toSabaodySphereLocal projects local heights radially onto planet globe shell', () => {
  const base = toSabaodySphereLocal(0, 0, 0, 10);
  const canopy = toSabaodySphereLocal(0, 65, 0, 10);
  assert.ok(Math.abs(base.y) < 1e-6);
  assert.ok(canopy.y > 0.09, `Expected soaring Yarukiman canopy projection, got ${canopy.y}`);
});
