import test from 'node:test';
import assert from 'node:assert/strict';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import { equirectangularToSphere } from './globeMath';
import {
  TOTTO_LAND_ANGULAR_MASK_RADIUS,
  TOTTO_LAND_CAMERA_PRESETS,
  TOTTO_LAND_GLOBE_CENTER,
  TOTTO_LAND_ISLAND_BY_ID,
  TOTTO_LAND_LANDMARKS,
  TOTTO_LAND_PERIPHERAL_ISLANDS,
  TOTTO_LAND_SUB_LOCATIONS,
  WHOLE_CAKE_CHATEAU_BASE_Y,
  tottoLandArchipelagoSignedDist,
  sampleTottoLandHeight,
  sampleTottoLandWalkSurfaceHeight,
  sampleTottoLandZone,
  toTottoLandSphereLocal,
} from './tottoLandTerrain';

function normUnit(u: number, v: number): [number, number, number] {
  const p = equirectangularToSphere(u, v, 1);
  return [p.x, p.y, p.z];
}

test('Totto Land registry includes Whole Cake Island + all 34 peripheral islands inside mask without neighbor overlap', () => {
  assert.equal(
    TOTTO_LAND_PERIPHERAL_ISLANDS.length,
    34,
    'Totto Land must have 34 peripheral islands around Whole Cake Island (35 total)'
  );
  assert.equal(Object.keys(TOTTO_LAND_SUB_LOCATIONS).length, 35);

  const centerN = normUnit(TOTTO_LAND_GLOBE_CENTER.u, TOTTO_LAND_GLOBE_CENTER.v);
  for (const isl of TOTTO_LAND_PERIPHERAL_ISLANDS) {
    const loc = ONE_PIECE_LOCATIONS.find((l) => l.id === isl.id);
    assert.ok(loc, `Expected ${isl.id} in ONE_PIECE_LOCATIONS`);
    const n = normUnit(loc.u, loc.v);
    const dot = Math.max(-1, Math.min(1, centerN[0] * n[0] + centerN[1] * n[1] + centerN[2] * n[2]));
    const ang = Math.acos(dot);
    assert.ok(
      ang < TOTTO_LAND_ANGULAR_MASK_RADIUS - 0.015,
      `Peripheral island ${isl.id} angular distance ${ang.toFixed(4)} must fit cleanly inside mask`
    );

    const distWci = Math.hypot(isl.x, isl.z);
    assert.ok(
      distWci >= 120,
      `Peripheral island ${isl.id} must clear central Whole Cake Island (dist=${distWci.toFixed(1)})`
    );
  }

  // Verify neighboring non-Totto-Land islands remain safely outside mask
  for (const outsideId of ['broc-coli-island', 'yukiryu-island']) {
    const loc = ONE_PIECE_LOCATIONS.find((l) => l.id === outsideId)!;
    const n = normUnit(loc.u, loc.v);
    const dot = Math.max(-1, Math.min(1, centerN[0] * n[0] + centerN[1] * n[1] + centerN[2] * n[2]));
    const ang = Math.acos(dot);
    assert.ok(
      ang > TOTTO_LAND_ANGULAR_MASK_RADIUS + 0.02,
      `${outsideId} must stay outside Totto Land terrain mask (${ang.toFixed(4)})`
    );
  }
});

test('Totto Land peripheral islands do not overlap each other and sit on solid terrain', () => {
  for (let i = 0; i < TOTTO_LAND_PERIPHERAL_ISLANDS.length; i++) {
    const a = TOTTO_LAND_PERIPHERAL_ISLANDS[i];
    const h = sampleTottoLandHeight(a.x, a.z);
    assert.ok(h >= 4.0, `${a.id} center height should be >= 4m, got ${h}`);
    assert.equal(sampleTottoLandZone(a.x, a.z), 'peripheral');

    for (let j = i + 1; j < TOTTO_LAND_PERIPHERAL_ISLANDS.length; j++) {
      const b = TOTTO_LAND_PERIPHERAL_ISLANDS[j];
      const centerDist = Math.hypot(a.x - b.x, a.z - b.z);
      const minGap = Math.max(a.rx, a.rz) + Math.max(b.rx, b.rz) + 4.0;
      assert.ok(
        centerDist >= minGap,
        `Islands ${a.id} and ${b.id} overlap (${centerDist.toFixed(1)} < ${minGap.toFixed(1)})`
      );
    }
  }
});

test('Whole Cake Island zones, Chateau plateau, Sweet City, Seducing Woods, Cacao, and Sunny spawns resolve accurately', () => {
  assert.equal(sampleTottoLandZone(22, -14), 'chateau');
  assert.equal(sampleTottoLandZone(16, 37), 'sweet-city');
  assert.equal(sampleTottoLandZone(-46, 2), 'seducing-woods');

  const chateauY = sampleTottoLandHeight(22, -14);
  assert.ok(
    chateauY >= WHOLE_CAKE_CHATEAU_BASE_Y - 0.5,
    `Whole Cake Chateau terrace must sit >= 10.7m, got ${chateauY}`
  );

  // Cacao Island three pyramid peaks rise well above town level
  const cacao = TOTTO_LAND_ISLAND_BY_ID['cacao-island'];
  const peakH = sampleTottoLandHeight(cacao.x - 7.0, cacao.z + 2.5);
  assert.ok(peakH >= 17.0, `Cacao chocolate peak should tower >= 17m, got ${peakH}`);

  // Harbor & Sunny spawns sit in navigable water (< -1.0m)
  for (const sp of [
    TOTTO_LAND_LANDMARKS.sunnySpawnHarbor,
    TOTTO_LAND_LANDMARKS.sunnySpawnCacao,
    TOTTO_LAND_LANDMARKS.sunnySpawnCheese,
  ]) {
    const { kind } = tottoLandArchipelagoSignedDist(sp.x, sp.z);
    assert.ok(kind === 'sea' || kind === 'harbor', `Sunny spawn (${sp.x}, ${sp.z}) must be water, got ${kind}`);
    assert.ok(sampleTottoLandHeight(sp.x, sp.z) < -1.0);
  }
});

test('Totto Land street-view presets stand at ~1.75m above walkable ground', () => {
  assert.ok(TOTTO_LAND_CAMERA_PRESETS.length >= 7);
  for (const preset of TOTTO_LAND_CAMERA_PRESETS) {
    if (!preset.isStreetView) continue;
    const ground = sampleTottoLandWalkSurfaceHeight(
      preset.position[0],
      preset.position[2]
    );
    const clearance = preset.position[1] - ground;
    assert.ok(ground >= 4.0, `Street preset ${preset.id} must rest on dry terrain, got ${ground}`);
    assert.ok(
      clearance >= 1.5 && clearance <= 2.0,
      `Street preset ${preset.id} must sit ~1.75m above walkable surface, got ${clearance}`
    );
  }
});

test('toTottoLandSphereLocal maps Totto Land relief onto spherical shell', () => {
  const origin = toTottoLandSphereLocal(0, 0, 0, 10);
  const summit = toTottoLandSphereLocal(22, 48, -14, 10);
  assert.ok(Math.abs(origin.y) < 1e-6);
  assert.ok(summit.y > 0.14);
});
