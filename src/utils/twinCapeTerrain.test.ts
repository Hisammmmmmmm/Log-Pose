import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TWIN_CAPE_APRON_Y,
  TWIN_CAPE_CAMERA_PRESETS,
  TWIN_CAPE_CROCUS_HOUSE,
  TWIN_CAPE_GLOBE_CENTER,
  TWIN_CAPE_LABOON,
  TWIN_CAPE_LEFT_LIGHTHOUSE,
  TWIN_CAPE_PROMONTORY_Y,
  TWIN_CAPE_RIGHT_LIGHTHOUSE,
  isTwinCapeSeaObstacle,
  sampleTwinCapeWalkSurfaceHeight,
  toTwinCapeSphereLocal,
} from './twinCapeTerrain';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';

test('twin-cape location sits directly at Reverse Mountain Grand Line entry', () => {
  const twinCape = ONE_PIECE_LOCATIONS.find((l) => l.id === 'twin-cape');
  assert.ok(twinCape, 'twin-cape location must exist');
  assert.equal(twinCape.v, 0.5);
  assert.ok(
    Math.abs(twinCape.u - TWIN_CAPE_GLOBE_CENTER.u) < 0.002,
    `Expected twin-cape u near ${TWIN_CAPE_GLOBE_CENTER.u}, got ${twinCape.u}`
  );
});

test('twin cape lighthouses, crocus house, and laboon leave Grand Line canal mouth navigable', () => {
  // Center Grand Line exit channel (|z| <= 50) must remain open sea
  for (const lx of [-30, 0, 30, 60]) {
    assert.equal(
      isTwinCapeSeaObstacle(lx, 0),
      false,
      `Grand Line exit channel center at lx=${lx} must be navigable`
    );
  }

  // Both lighthouses stand on opposite flanking cape extremities
  assert.equal(
    TWIN_CAPE_LEFT_LIGHTHOUSE.z,
    -TWIN_CAPE_RIGHT_LIGHTHOUSE.z,
    'Left and Right lighthouses must flank the mountain mouth symmetrically'
  );
  assert.ok(
    TWIN_CAPE_CROCUS_HOUSE.x < TWIN_CAPE_LEFT_LIGHTHOUSE.x,
    'Crocus house must sit behind the left lighthouse toward the mountain cliff'
  );

  // Aprons sit slightly proud of promontory terrace and Laboon acts as sea obstacle
  assert.equal(
    sampleTwinCapeWalkSurfaceHeight(
      TWIN_CAPE_LEFT_LIGHTHOUSE.x,
      TWIN_CAPE_LEFT_LIGHTHOUSE.z
    ),
    TWIN_CAPE_APRON_Y
  );
  assert.equal(sampleTwinCapeWalkSurfaceHeight(0, 145), TWIN_CAPE_PROMONTORY_Y);
  assert.equal(isTwinCapeSeaObstacle(TWIN_CAPE_LABOON.x, TWIN_CAPE_LABOON.z), true);
});

test('twin cape human-scale presets place camera at 1.75m above aprons and sea-skiff height at Laboon', () => {
  const leftPreset = TWIN_CAPE_CAMERA_PRESETS.find((p) => p.id === 'left-lighthouse')!;
  const housePreset = TWIN_CAPE_CAMERA_PRESETS.find((p) => p.id === 'crocus-house')!;
  const rightPreset = TWIN_CAPE_CAMERA_PRESETS.find((p) => p.id === 'right-lighthouse')!;
  const laboonPreset = TWIN_CAPE_CAMERA_PRESETS.find((p) => p.id === 'laboon')!;

  for (const p of [leftPreset, housePreset, rightPreset]) {
    assert.ok(p, 'Promontory human preset must exist');
    assert.ok(
      p.position[1] >= TWIN_CAPE_APRON_Y + 1.5 && p.position[1] <= TWIN_CAPE_APRON_Y + 2.2,
      `Expected ~1.75m human eye height above cape apron (${TWIN_CAPE_APRON_Y}), got ${p.position[1]}`
    );
  }

  assert.ok(
    laboonPreset.position[1] > 2.5 && laboonPreset.position[1] < 6.0,
    `Expected ship-bow sea eye level for Laboon preset, got ${laboonPreset.position[1]}`
  );

  const sp = toTwinCapeSphereLocal(0, TWIN_CAPE_PROMONTORY_Y, 0, 10);
  assert.ok(Math.abs(sp.y - TWIN_CAPE_PROMONTORY_Y * 0.002) < 1e-5);
});
