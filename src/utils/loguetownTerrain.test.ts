import assert from 'node:assert/strict';
import test from 'node:test';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import { filterIslands } from './globeMath';
import { MUGIWARA_ROUTE_IDS } from './mugiwaraRoute';
import {
  LOGUETOWN_BUILDINGS,
  LOGUETOWN_CAMERA_PRESETS,
  LOGUETOWN_GLOBE_SCALE,
  LOGUETOWN_LANDMARKS,
  LOGUETOWN_PIERS,
  LOGUETOWN_QUAY_Y,
  LOGUETOWN_SHRINE_Y,
  LOGUETOWN_TOWN_Y,
  LOGUETOWN_TREES,
  isOnLoguetownPlaza,
  isOnLoguetownQuayOrPier,
  loguetownRoadSignedDist,
  sampleLoguetownHeight,
  sampleLoguetownWalkSurfaceHeight,
  toLoguetownSphereLocal,
} from './loguetownTerrain';

test('Loguetown terrain heights rise monotonically from sea -> quay -> town -> shrine -> northern cliff plateau', () => {
  const seaH = sampleLoguetownHeight(-40, 82);
  const southPierH = sampleLoguetownHeight(3.4, 72.0);
  const southQuayH = sampleLoguetownHeight(0, 56.0);
  const plazaH = sampleLoguetownHeight(0, 0);
  const courtyardH = sampleLoguetownHeight(0, -22.2);
  const shrineH = sampleLoguetownHeight(
    LOGUETOWN_LANDMARKS.neShrine.x,
    LOGUETOWN_LANDMARKS.neShrine.z
  );
  const cliffPlateauH = sampleLoguetownHeight(0, -56);

  assert.ok(seaH < -0.5, `Expected open harbor sea < -0.5, got ${seaH}`);
  assert.ok(
    Math.abs(southPierH - LOGUETOWN_QUAY_Y) < 0.25,
    `Expected south pier height ~${LOGUETOWN_QUAY_Y}, got ${southPierH}`
  );
  assert.ok(
    Math.abs(southQuayH - LOGUETOWN_QUAY_Y) < 0.25,
    `Expected south quay height ~${LOGUETOWN_QUAY_Y}, got ${southQuayH}`
  );
  assert.ok(
    Math.abs(plazaH - LOGUETOWN_TOWN_Y) < 0.25,
    `Expected Place de l'Échafaud height ~${LOGUETOWN_TOWN_Y}, got ${plazaH}`
  );
  assert.ok(
    courtyardH >= plazaH,
    `Expected Town Hall courtyard >= plaza (${courtyardH} >= ${plazaH})`
  );
  assert.ok(
    shrineH > plazaH + 4 && shrineH <= LOGUETOWN_SHRINE_Y + 1.5,
    `Expected NE shrine hilltop well above town, got ${shrineH}`
  );
  assert.ok(
    cliffPlateauH > 15.0,
    `Expected northern cliff plateau > 15, got ${cliffPlateauH}`
  );
});

test('Place de l\'Échafaud, roads, and quays are walkable and unobstructed by houses or trees', () => {
  assert.ok(LOGUETOWN_BUILDINGS.length >= 45, `Expected >= 45 buildings, got ${LOGUETOWN_BUILDINGS.length}`);
  assert.ok(LOGUETOWN_TREES.length >= 40, `Expected >= 40 trees, got ${LOGUETOWN_TREES.length}`);
  assert.equal(LOGUETOWN_PIERS.length, 6, 'Expected 6 harbor piers matching map');

  assert.ok(isOnLoguetownPlaza(LOGUETOWN_LANDMARKS.scaffold.x, LOGUETOWN_LANDMARKS.scaffold.z));
  assert.ok(isOnLoguetownQuayOrPier(3.4, 72.0));
  assert.ok(isOnLoguetownQuayOrPier(-62.5, 23.2));

  for (const b of LOGUETOWN_BUILDINGS) {
    assert.ok(
      !isOnLoguetownPlaza(b.x, b.z),
      `Building ${b.id} overlaps Place de l'Échafaud at (${b.x}, ${b.z})`
    );
    assert.ok(
      loguetownRoadSignedDist(b.x, b.z) >= 0.85,
      `Building ${b.id} intrudes onto street SDF at (${b.x}, ${b.z})`
    );
  }

  for (const t of LOGUETOWN_TREES) {
    assert.ok(
      !isOnLoguetownPlaza(t.x, t.z),
      `Tree ${t.id} overlaps Place de l'Échafaud at (${t.x}, ${t.z})`
    );
    assert.ok(
      loguetownRoadSignedDist(t.x, t.z) >= 0.55,
      `Tree ${t.id} blocks street at (${t.x}, ${t.z})`
    );
  }
});

test('All Loguetown human-scale camera presets clear the ground clamp and keep street eye elevation', () => {
  const minWorldFloorOffset = 0.003;
  const minLocalClearance = minWorldFloorOffset / LOGUETOWN_GLOBE_SCALE;

  for (const preset of LOGUETOWN_CAMERA_PRESETS) {
    const [cx, cy, cz] = preset.position;
    const groundY = sampleLoguetownWalkSurfaceHeight(cx, cz);
    const clearance = cy - groundY;
    assert.ok(
      clearance > minLocalClearance,
      `Preset ${preset.id} camera height ${cy} must exceed ground ${groundY} + ${minLocalClearance.toFixed(2)}`
    );
    if (preset.isStreetView) {
      assert.ok(
        clearance <= 4.0,
        `Street preset ${preset.id} should stay at human scale (<= 4.0 units above ground), got ${clearance}`
      );
    }
  }
});

test('Spherical local projection preserves upward elevation above globe radius', () => {
  const p = toLoguetownSphereLocal(0, LOGUETOWN_TOWN_Y, 0, 10);
  assert.ok(Math.abs(p.x) < 1e-6);
  assert.ok(Math.abs(p.z) < 1e-6);
  assert.ok(Math.abs(p.y - LOGUETOWN_TOWN_Y * LOGUETOWN_GLOBE_SCALE) < 1e-6);
});

test('Polestar Islands and Loguetown share one single Polestar Islands globe point with Loguetown preset inside', () => {
  const separateLoguetown = ONE_PIECE_LOCATIONS.find((l) => l.id === 'loguetown');
  assert.equal(separateLoguetown, undefined, 'Separate Loguetown globe pin must be merged into polestar-islands');

  const polestar = ONE_PIECE_LOCATIONS.find((l) => l.id === 'polestar-islands');
  assert.ok(polestar, 'Unified Polestar Islands location must exist');
  assert.equal(polestar.name, 'Polestar Islands');

  const loguetownSearchHits = filterIslands(ONE_PIECE_LOCATIONS, 'loguetown');
  assert.ok(
    loguetownSearchHits.some((l) => l.id === 'polestar-islands'),
    'Searching "loguetown" must find Polestar Islands'
  );

  assert.equal(MUGIWARA_ROUTE_IDS[0], 'polestar-islands');
  assert.equal(LOGUETOWN_CAMERA_PRESETS[0].label, 'Loguetown');
  assert.ok(LOGUETOWN_CAMERA_PRESETS.filter((p) => p.isStreetView).length >= 5);
});
