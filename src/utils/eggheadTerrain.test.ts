import test from 'node:test';
import assert from 'node:assert/strict';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import { equirectangularToSphere } from './globeMath';
import {
  EGGHEAD_ANGULAR_MASK_RADIUS,
  EGGHEAD_CAMERA_PRESETS,
  EGGHEAD_CLOUD_DECK_Y,
  EGGHEAD_EMET_CENTER,
  EGGHEAD_FABRIOPHASE_Y,
  EGGHEAD_GLOBE_CENTER,
  EGGHEAD_LANDMARKS,
  EGGHEAD_SUB_LOCATIONS,
  eggheadCliffSignedDist,
  sampleEggheadCloudHeight,
  sampleEggheadLowerHeight,
  sampleEggheadWalkSurfaceHeight,
  sampleEggheadZone,
} from './eggheadTerrain';

test('Egghead angular mask has generous sea clearance from all neighboring charted islands', () => {
  const ec = equirectangularToSphere(
    EGGHEAD_GLOBE_CENTER.u,
    EGGHEAD_GLOBE_CENTER.v,
    1
  );

  for (const loc of ONE_PIECE_LOCATIONS) {
    if (loc.id in EGGHEAD_SUB_LOCATIONS) continue;
    const p = equirectangularToSphere(loc.u, loc.v, 1);
    const dot = Math.max(-1, Math.min(1, ec.x * p.x + ec.y * p.y + ec.z * p.z));
    const angDist = Math.acos(dot);
    assert.ok(
      angDist > EGGHEAD_ANGULAR_MASK_RADIUS + 0.04,
      `Expected ${loc.id} to clear Egghead mask (${EGGHEAD_ANGULAR_MASK_RADIUS}), got angDist=${angDist.toFixed(4)}`
    );
  }
});

test('Egghead lower island cliffs, Fabriophase terrace, Emet hollow, and Sunny sea spawn work cleanly', () => {
  const fabY = sampleEggheadLowerHeight(
    EGGHEAD_LANDMARKS.fabriophasePlaza.x,
    EGGHEAD_LANDMARKS.fabriophasePlaza.z
  );
  assert.ok(
    Math.abs(fabY - EGGHEAD_FABRIOPHASE_Y) < 1.5,
    `Expected Fabriophase plaza near ${EGGHEAD_FABRIOPHASE_Y}m, got ${fabY.toFixed(2)}`
  );

  const emetY = sampleEggheadLowerHeight(EGGHEAD_EMET_CENTER.x, EGGHEAD_EMET_CENTER.z);
  assert.ok(
    emetY > 10.5 && emetY < 16.5,
    `Expected Emet mossy hollow around 11.5-15m, got ${emetY.toFixed(2)}`
  );

  assert.ok(
    eggheadCliffSignedDist(0, 0) < -20,
    'Core of Egghead island must register solid cliff interior'
  );
  assert.ok(
    eggheadCliffSignedDist(
      EGGHEAD_LANDMARKS.sunnySpawnSea.x,
      EGGHEAD_LANDMARKS.sunnySpawnSea.z
    ) > 15,
    'Sunny Egghead sea spawn must have wide navigable water clearance'
  );
  assert.equal(
    sampleEggheadLowerHeight(
      EGGHEAD_LANDMARKS.sunnySpawnSea.x,
      EGGHEAD_LANDMARKS.sunnySpawnSea.z
    ),
    0
  );
});

test('Egghead dual-tier vertical cloud plateau separates Labophase and Fabriophase walk surfaces cleanly', () => {
  const cloudCenterY = sampleEggheadCloudHeight(0, -2);
  assert.ok(
    cloudCenterY > EGGHEAD_CLOUD_DECK_Y + 0.5 && cloudCenterY < EGGHEAD_CLOUD_DECK_Y + 4.5,
    `Expected Labophase cloud deck slightly above ${EGGHEAD_CLOUD_DECK_Y}m, got ${cloudCenterY.toFixed(2)}`
  );

  assert.equal(sampleEggheadCloudHeight(95, 95), 0);

  const lowCamWalk = sampleEggheadWalkSurfaceHeight(-4, 14, 16);
  const highCamWalk = sampleEggheadWalkSurfaceHeight(-4, 14, 72);
  assert.ok(lowCamWalk < 20, `Low camera must walk Fabriophase (${lowCamWalk.toFixed(2)}m)`);
  assert.ok(
    highCamWalk > 62,
    `Elevated camera must walk Labophase Island Cloud (${highCamWalk.toFixed(2)}m)`
  );
});

test('Egghead zones classify sea, harbor, Emet scrapyard, Fabriophase, Labophase, and Punk Records accurately', () => {
  assert.equal(sampleEggheadZone(0, 0, EGGHEAD_FABRIOPHASE_Y), 'fabriophase');
  assert.equal(
    sampleEggheadZone(EGGHEAD_EMET_CENTER.x, EGGHEAD_EMET_CENTER.z, EGGHEAD_FABRIOPHASE_Y),
    'emet-scrapyard'
  );
  assert.equal(sampleEggheadZone(18, 34, 2.5), 'harbor');
  assert.equal(sampleEggheadZone(18, 45, 0), 'sea');
  assert.equal(sampleEggheadZone(80, 80, 0), 'sea');
  assert.equal(sampleEggheadZone(0, -2, 76), 'punk-records');
  assert.equal(sampleEggheadZone(24, 14, 70), 'labophase');
});

test('All Egghead camera presets remain cleanly above their respective ground or cloud surfaces', () => {
  assert.equal(EGGHEAD_CAMERA_PRESETS.length, 7);
  for (const preset of EGGHEAD_CAMERA_PRESETS) {
    const [px, py, pz] = preset.position;
    const floor = sampleEggheadWalkSurfaceHeight(px, pz, py);
    assert.ok(
      py > floor + 1.8,
      `Preset ${preset.id} camera y=${py} too close to floor=${floor.toFixed(2)}`
    );
  }
});
