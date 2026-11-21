import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONOMI_BUILDINGS,
  CONOMI_CAMERA_PRESETS,
  CONOMI_COURTYARD_Y,
  CONOMI_GOSA_Y,
  CONOMI_TREES,
  CONOMI_VILLAGE_Y,
  conomiRoadSignedDist,
  isInArlongCourtyard,
  sampleArlongPoolMask,
  sampleConomiHeight,
  sampleConomiWalkSurfaceHeight,
  toConomiSphereLocal,
} from './conomiTerrain';

test('Conomi terrain rises accurately from surrounding ocean -> Arlong/Cocoyashi/Gosa terraces -> central mountain peaks', () => {
  const oceanH = sampleConomiHeight(130, 0);
  const arlongBayH = sampleConomiHeight(-108, -20);
  const courtyardH = sampleConomiHeight(-68, -20);
  const poolH = sampleConomiHeight(-80, -20);
  const cocoyashiH = sampleConomiHeight(-4, 46);
  const gosaH = sampleConomiHeight(75.5, -13);
  const eastPeakH = sampleConomiHeight(10, -17);

  assert.ok(oceanH < -1.0, `Open ocean should be submerged (< -1.0), got ${oceanH}`);
  assert.ok(arlongBayH < -0.5, `Arlong western bay should be navigable water, got ${arlongBayH}`);
  assert.ok(
    Math.abs(courtyardH - CONOMI_COURTYARD_Y) < 0.25,
    `Arlong courtyard height should match ${CONOMI_COURTYARD_Y}, got ${courtyardH}`
  );
  assert.ok(poolH < courtyardH - 1.5, `Arlong central pool should be recessed below courtyard, got ${poolH}`);
  assert.ok(
    Math.abs(cocoyashiH - CONOMI_VILLAGE_Y) < 0.25,
    `Cocoyashi terrace height should match ${CONOMI_VILLAGE_Y}, got ${cocoyashiH}`
  );
  assert.ok(
    Math.abs(gosaH - CONOMI_GOSA_Y) < 0.35,
    `Gosa terrace height should match ${CONOMI_GOSA_Y}, got ${gosaH}`
  );
  assert.ok(eastPeakH > 15.0, `Central-east highland peak should exceed 15, got ${eastPeakH}`);
});

test('Cocoyashi Village, Bell-mere Cottage, Tangerine Grove, and Gosa Ruins stay off roads and pools', () => {
  const cocoyashiCount = CONOMI_BUILDINGS.filter((b) => b.district === 'cocoyashi').length;
  const gosaCount = CONOMI_BUILDINGS.filter((b) => b.district === 'gosa-ruin' || b.district === 'gosa-shed').length;
  const tangerineCount = CONOMI_TREES.filter((t) => t.kind === 'tangerine').length;

  assert.ok(cocoyashiCount >= 12, `Expected >= 12 Cocoyashi houses, got ${cocoyashiCount}`);
  assert.ok(gosaCount >= 8, `Expected >= 8 Gosa ruins/sheds, got ${gosaCount}`);
  assert.equal(tangerineCount, 12, `Expected 4x3 = 12 Bell-mere tangerine trees, got ${tangerineCount}`);

  for (const b of CONOMI_BUILDINGS) {
    assert.ok(
      conomiRoadSignedDist(b.x, b.z) >= 0.4,
      `Building ${b.id} at (${b.x}, ${b.z}) overlaps walkable street`
    );
    assert.equal(
      isInArlongCourtyard(b.x, b.z),
      false,
      `Building ${b.id} overlaps Arlong Park courtyard`
    );
  }

  for (const t of CONOMI_TREES) {
    assert.ok(
      conomiRoadSignedDist(t.x, t.z) >= 0.35,
      `Tree ${t.id} at (${t.x}, ${t.z}) blocks a walkable road`
    );
    assert.ok(
      sampleArlongPoolMask(t.x, t.z) <= 0.2,
      `Tree ${t.id} overlaps an Arlong Park swimming pool`
    );
  }
});

test('All Conomi human-scale street presets sit safely above walkable ground', () => {
  assert.equal(CONOMI_CAMERA_PRESETS.length, 6);
  for (const preset of CONOMI_CAMERA_PRESETS) {
    const [px, py, pz] = preset.position;
    const groundY = sampleConomiWalkSurfaceHeight(px, pz);
    if (preset.isStreetView) {
      const clearance = py - groundY;
      assert.ok(
        clearance >= 1.4 && clearance <= 3.5,
        `Street preset ${preset.id} clearance=${clearance.toFixed(2)} should be human eye level`
      );
    } else {
      assert.ok(py > groundY + 40, `Overview preset should sit high above island`);
    }
  }
});

test('Spherical local projection preserves elevation cleanly', () => {
  const base = toConomiSphereLocal(0, 0, 0, 10);
  const top = toConomiSphereLocal(0, 20, 0, 10);
  assert.ok(top.y > base.y, 'Higher terrain elevation projects radially outward');
});
