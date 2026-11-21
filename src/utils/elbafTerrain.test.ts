import test from 'node:test';
import assert from 'node:assert/strict';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import {
  ELBAF_ANGULAR_MASK_RADIUS,
  ELBAF_CAMERA_PRESETS,
  ELBAF_GLOBE_CENTER,
  ELBAF_HEAVEN_Y,
  ELBAF_LANDMARKS,
  ELBAF_SUNWORLD_Y,
  ELBAF_UNDERWORLD_Y,
  elbafCliffSignedDist,
  sampleElbafHeavenHeight,
  sampleElbafSunWorldHeight,
  sampleElbafUnderworldHeight,
  sampleElbafWalkSurfaceHeight,
  sampleElbafZone,
} from './elbafTerrain';

function sphericalAngle(u1: number, v1: number, u2: number, v2: number): number {
  const phi1 = u1 * Math.PI * 2;
  const th1 = v1 * Math.PI;
  const phi2 = u2 * Math.PI * 2;
  const th2 = v2 * Math.PI;
  const x1 = Math.sin(th1) * Math.cos(phi1);
  const y1 = Math.cos(th1);
  const z1 = Math.sin(th1) * Math.sin(phi1);
  const x2 = Math.sin(th2) * Math.cos(phi2);
  const y2 = Math.cos(th2);
  const z2 = Math.sin(th2) * Math.sin(phi2);
  const dot = Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2));
  return Math.acos(dot);
}

test('Elbaf angular mask keeps clear ocean margin from neighboring New World islands', () => {
  for (const loc of ONE_PIECE_LOCATIONS) {
    if (loc.id === 'elbaf') continue;
    const ang = sphericalAngle(
      ELBAF_GLOBE_CENTER.u,
      ELBAF_GLOBE_CENTER.v,
      loc.u,
      loc.v
    );
    assert.ok(
      ang > ELBAF_ANGULAR_MASK_RADIUS * 1.45,
      `Expected ${loc.id} to sit well outside Elbaf mask (${ang.toFixed(4)} rad)`
    );
  }
});

test('Elbaf Underworld cliffs, fjord cove, snowy mountain rim, and Sunny sea spawn behave accurately', () => {
  assert.ok(
    elbafCliffSignedDist(ELBAF_LANDMARKS.sunnySpawnSea.x, ELBAF_LANDMARKS.sunnySpawnSea.z) > 10,
    'Sunny sea spawn must be in open ocean well outside Elbaf cliffs'
  );
  assert.equal(
    sampleElbafUnderworldHeight(ELBAF_LANDMARKS.sunnySpawnSea.x, ELBAF_LANDMARKS.sunnySpawnSea.z),
    0
  );

  // Mountain rim rises significantly above base Underworld floor
  const rimH = sampleElbafUnderworldHeight(-44, 18);
  assert.ok(rimH > ELBAF_UNDERWORLD_Y + 4.0, `Underworld mountain rim height ${rimH} should exceed ${ELBAF_UNDERWORLD_Y + 4}`);

  // Fjord harbor quay vs open harbor basin
  assert.equal(sampleElbafZone(16, 48, 2.5), 'fjord-harbor');
  assert.ok(elbafCliffSignedDist(16, 62) > 0, 'Fjord basin mouth should be navigable water');
  assert.ok(elbafCliffSignedDist(4, 61.5) < 0, 'West breakwater pier must collide');
  assert.ok(elbafCliffSignedDist(28, 60.5) < 0, 'East breakwater pier must collide');
});

test('Elbaf 3-tier vertical strata cleanly separate Underworld, Sun World, and Heaven World', () => {
  const underH = sampleElbafWalkSurfaceHeight(-28, 12, 22);
  const sunH = sampleElbafWalkSurfaceHeight(-28, 12, 74);
  const heavenH = sampleElbafWalkSurfaceHeight(-12, 6, 134);

  assert.ok(underH >= ELBAF_UNDERWORLD_Y - 1 && underH < 36, `Underworld height ${underH}`);
  assert.ok(sunH >= ELBAF_SUNWORLD_Y && sunH < 84, `Sun World height ${sunH}`);
  assert.ok(heavenH >= ELBAF_HEAVEN_Y, `Heaven World height ${heavenH}`);

  // Aurust Castle & Chieftain Hall outcrops rise above Sun World terrace
  assert.ok(sampleElbafSunWorldHeight(-42, -4) > ELBAF_SUNWORLD_Y + 6.0);
  assert.ok(sampleElbafSunWorldHeight(-12, 14) > ELBAF_SUNWORLD_Y + 6.0);
  assert.ok(sampleElbafHeavenHeight(0, -2) > ELBAF_HEAVEN_Y + 4.0);
});

test('Elbaf zones classify Adam trunk, Aurust Castle, Sun World villages, Underworld snow/forest, and Heaven World', () => {
  assert.equal(sampleElbafZone(0, -2, 70), 'adam-trunk');
  assert.equal(sampleElbafZone(-42, -4, 74), 'aurust-castle');
  assert.equal(sampleElbafZone(-32, 12, 68), 'sunworld-village');
  assert.equal(sampleElbafZone(-44, 18, 20), 'underworld-snow');
  assert.equal(sampleElbafZone(-20, 12, 14), 'underworld-forest');
  assert.equal(sampleElbafZone(12, -8, 130), 'heaven-world');
  assert.equal(sampleElbafZone(95, 95, 20), 'sea');
});

test('All Elbaf camera presets remain cleanly above their target tier walk surface', () => {
  for (const preset of ELBAF_CAMERA_PRESETS) {
    const [px, py, pz] = preset.position;
    const floor = sampleElbafWalkSurfaceHeight(px, pz, py);
    assert.ok(
      py > floor + 1.5,
      `Preset ${preset.id} height (${py}) must clear surface (${floor.toFixed(2)})`
    );
  }
});
