import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WATER7_BRIDGES,
  WATER7_CAMERA_PRESETS,
  WATER7_CANAL_ANGLES,
  WATER7_FOUNTAIN_DRUM_RADIUS,
  WATER7_GLOBE_SCALE,
  WATER7_RING_AVENUES,
  WATER7_SEAWALL_RADIUS,
  WATER7_STAIR_ANGLES,
  WATER7_VIADUCT,
  buildWater7Cranes,
  buildWater7Houses,
  sampleWater7Height,
  sampleWater7WalkSurfaceHeight,
  toWater7SphereLocal,
  water7CanalSignedDist,
  water7RoadSignedDist,
} from './water7Terrain';

test('Water 7 rises in three concentric city tiers toward the central fountain drum', () => {
  const seaY = sampleWater7Height(96, 0);
  const promY = sampleWater7Height(Math.cos(1.57) * 70, Math.sin(1.57) * 70);
  const tier1Y = sampleWater7Height(Math.cos(1.57) * 57, Math.sin(1.57) * 57);
  const tier2Y = sampleWater7Height(Math.cos(1.57) * 42, Math.sin(1.57) * 42);
  const tier3Y = sampleWater7Height(Math.cos(1.57) * 27, Math.sin(1.57) * 27);
  const drumY = sampleWater7Height(0, 0);

  assert.ok(seaY < 0, `Outer sea floor (${seaY}) should be below water level`);
  assert.ok(promY > 2.0 && promY < 3.4, `Promenade (${promY}) should sit above sea wall`);
  assert.ok(tier1Y > promY + 2.0, `Tier 1 (${tier1Y}) must rise above promenade (${promY})`);
  assert.ok(tier2Y > tier1Y + 3.5, `Tier 2 (${tier2Y}) must rise above Tier 1 (${tier1Y})`);
  assert.ok(tier3Y > tier2Y + 3.5, `Tier 3 (${tier3Y}) must rise above Tier 2 (${tier2Y})`);
  assert.ok(drumY > tier3Y + 5.0, `Central fountain drum (${drumY}) must tower above Tier 3`);
});

test('Radial turquoise canals carve troughs and stair ramps connect tiers smoothly', () => {
  for (const ca of WATER7_CANAL_ANGLES) {
    const midR = 48;
    const cx = Math.cos(ca) * midR;
    const cz = Math.sin(ca) * midR;
    assert.ok(
      water7CanalSignedDist(cx, cz) < -1.5,
      `Canal angle ${ca} should be inside canal channel`
    );
    assert.ok(
      sampleWater7Height(cx, cz) < sampleWater7Height(Math.cos(ca + 0.15) * midR, Math.sin(ca + 0.15) * midR) - 0.5,
      `Canal at angle ${ca} should be carved below surrounding terrace`
    );
  }

  // Stair ramp mid-way across Tier 1 -> Tier 2 drop (r=49.8) should be walkable & sloped
  const sa = WATER7_STAIR_ANGLES[0];
  const rLow = sampleWater7Height(Math.cos(sa) * 54, Math.sin(sa) * 54);
  const rMid = sampleWater7Height(Math.cos(sa) * 49.8, Math.sin(sa) * 49.8);
  const rHigh = sampleWater7Height(Math.cos(sa) * 45, Math.sin(sa) * 45);
  assert.ok(
    rMid > rLow + 0.5 && rMid < rHigh - 0.5,
    `Stair ramp (${rLow.toFixed(2)} -> ${rMid.toFixed(2)} -> ${rHigh.toFixed(2)}) must slope continuously`
  );
});

test('Water 7 houses and shipyard cranes stay strictly clear of canals, streets, and drum', () => {
  const houses = buildWater7Houses();
  const cranes = buildWater7Cranes();

  assert.ok(houses.length >= 80, `Expected dense Venetian city (>=80 houses), got ${houses.length}`);
  assert.equal(cranes.length, 6);

  for (const h of houses) {
    const r = Math.hypot(h.x, h.z);
    assert.ok(
      r > WATER7_FOUNTAIN_DRUM_RADIUS + 1.5 && r < WATER7_SEAWALL_RADIUS - 3,
      `House ${h.id} at r=${r.toFixed(1)} out of city tier bounds`
    );
    assert.ok(
      water7CanalSignedDist(h.x, h.z) > 1.8,
      `House ${h.id} encroaches on a radial canal`
    );
    assert.ok(
      water7RoadSignedDist(h.x, h.z) > 0.6,
      `House ${h.id} blocks a concentric avenue or stairway`
    );
  }
});

test('Walkable surface height spans all 24 canal bridges and SE Sea Train viaduct', () => {
  assert.equal(WATER7_BRIDGES.length, WATER7_RING_AVENUES.length * WATER7_CANAL_ANGLES.length);

  for (const b of WATER7_BRIDGES) {
    const bedY = sampleWater7Height(b.x, b.z);
    const walkY = sampleWater7WalkSurfaceHeight(b.x, b.z);
    assert.ok(
      walkY > bedY + 0.5,
      `Bridge ${b.id} walkY (${walkY.toFixed(2)}) should elevate walker above canal bed (${bedY.toFixed(2)})`
    );
  }

  const vx = Math.cos(WATER7_VIADUCT.angle) * 88;
  const vz = Math.sin(WATER7_VIADUCT.angle) * 88;
  assert.ok(
    sampleWater7WalkSurfaceHeight(vx, vz) > 1.2,
    'SE Sea Train viaduct deck must remain above sea level'
  );
});

test('All Water 7 camera presets sit safely above walkable surfaces', () => {
  for (const preset of WATER7_CAMERA_PRESETS) {
    const [px, py, pz] = preset.position;
    const ground = sampleWater7WalkSurfaceHeight(px, pz);
    assert.ok(
      py > ground + 1.2,
      `Preset ${preset.id} camera y=${py} clips too close to ground=${ground.toFixed(2)}`
    );
  }
});

test('toWater7SphereLocal wraps planar coordinates accurately onto globe shell', () => {
  const globeR = 10;
  const center = toWater7SphereLocal(0, 10, 0, globeR);
  const edge = toWater7SphereLocal(70, 10, 0, globeR);
  const rCenter = Math.hypot(center.x, globeR + center.y, center.z);
  const rEdge = Math.hypot(edge.x, globeR + edge.y, edge.z);

  assert.ok(Math.abs(rCenter - (globeR + 10 * WATER7_GLOBE_SCALE)) < 1e-4);
  assert.ok(Math.abs(rEdge - (globeR + 10 * WATER7_GLOBE_SCALE)) < 1e-4);
  assert.ok(edge.y < center.y, 'Sphere curvature must curve outer rim downward');
});
