import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LONG_RING_BOXING_ARENA,
  LONG_RING_CAMERA_PRESETS,
  LONG_RING_FOXY_PIER,
  LONG_RING_FOXY_SHIP,
  LONG_RING_ISLAND_LOBES,
  LONG_RING_PROPS,
  LONG_RING_RING_RADIUS,
  LONG_RING_SEA_LEVEL_Y,
  LONG_RING_TONJIT_HOUSE,
  LONG_RING_TREES,
  sampleLongRingHeight,
  sampleLongRingWalkSurfaceHeight,
} from './longRingTerrain';

test('Long Ring Long Land has exactly 10 distinct dry islands arranged in a circle at high tide', () => {
  assert.equal(LONG_RING_ISLAND_LOBES.length, 10);

  for (let i = 0; i < 10; i++) {
    const lobe = LONG_RING_ISLAND_LOBES[i];
    const r = Math.hypot(lobe.cx, lobe.cz);
    assert.ok(
      Math.abs(r - LONG_RING_RING_RADIUS) < 0.25,
      `Lobe ${lobe.id} radial distance ${r} must lie on ring radius ${LONG_RING_RING_RADIUS}`
    );

    const peakH = sampleLongRingHeight(lobe.cx, lobe.cz);
    assert.ok(
      peakH > LONG_RING_SEA_LEVEL_Y + 1.2,
      `Lobe ${lobe.id} interior height ${peakH} must be well above sea level ${LONG_RING_SEA_LEVEL_Y}`
    );

    // Midpoint between lobe i and lobe (i+1)%10 must be submerged strait at high tide
    // while resting on the shallow submerged ring isthmus (warmer than deep central lagoon)
    const next = LONG_RING_ISLAND_LOBES[(i + 1) % 10];
    const midAngle = Math.atan2(
      Math.sin(lobe.angle) + Math.sin(next.angle),
      Math.cos(lobe.angle) + Math.cos(next.angle)
    );
    const midX = Math.cos(midAngle) * LONG_RING_RING_RADIUS;
    const midZ = Math.sin(midAngle) * LONG_RING_RING_RADIUS;
    const midH = sampleLongRingHeight(midX, midZ);
    const lagoonCenterH = sampleLongRingHeight(0, 0);

    assert.ok(
      midH < LONG_RING_SEA_LEVEL_Y - 0.5,
      `Channel between lobes ${i} & ${(i + 1) % 10} at (${midX.toFixed(1)}, ${midZ.toFixed(1)}) has h=${midH.toFixed(2)}, must be submerged at high tide`
    );
    assert.ok(
      midH > lagoonCenterH + 2.5,
      `Submerged connecting ring saddle (${midH.toFixed(2)}) must sit significantly shallower than deep central lagoon (${lagoonCenterH.toFixed(2)})`
    );
  }
});

test("Tonjit's Stilt House, Boxing Arena, and Sexy Foxy mooring are properly sited and separated", () => {
  const tonjitGround = sampleLongRingHeight(
    LONG_RING_TONJIT_HOUSE.x,
    LONG_RING_TONJIT_HOUSE.z
  );
  assert.ok(
    tonjitGround > LONG_RING_SEA_LEVEL_Y + 1.5,
    `Tonjit stilt house ground ${tonjitGround} must be dry meadowland`
  );

  const arenaGround = sampleLongRingHeight(
    LONG_RING_BOXING_ARENA.x,
    LONG_RING_BOXING_ARENA.z
  );
  assert.ok(
    arenaGround > LONG_RING_SEA_LEVEL_Y + 1.2,
    `Boxing arena ground ${arenaGround} must be dry plain on neighboring island`
  );

  // Neighboring island separation check
  const tonjitToArena = Math.hypot(
    LONG_RING_TONJIT_HOUSE.x - LONG_RING_BOXING_ARENA.x,
    LONG_RING_TONJIT_HOUSE.z - LONG_RING_BOXING_ARENA.z
  );
  assert.ok(tonjitToArena > 28 && tonjitToArena < 52);

  // Sexy Foxy moored in deep lagoon sea water off the jetty end
  const shipSeaH = sampleLongRingHeight(
    LONG_RING_FOXY_SHIP.x,
    LONG_RING_FOXY_SHIP.z
  );
  assert.ok(
    shipSeaH < LONG_RING_SEA_LEVEL_Y - 2.0,
    `Sexy Foxy mooring sea bed ${shipSeaH} must be deep water well off beaches`
  );

  const pierWalkY = sampleLongRingWalkSurfaceHeight(
    LONG_RING_FOXY_PIER.endX,
    LONG_RING_FOXY_PIER.endZ
  );
  assert.ok(pierWalkY >= LONG_RING_FOXY_PIER.deckY - 0.05);
});

test('Tall stretched trees avoid clearings and paths, and camera presets sit cleanly above ground', () => {
  assert.ok(LONG_RING_TREES.length >= 90);
  const cypressCount = LONG_RING_TREES.filter((t) => t.kind === 'cypress-tall').length;
  assert.ok(cypressCount >= 50, 'Should feature abundant ultra-tall cypress trees');

  for (const t of LONG_RING_TREES) {
    assert.ok(
      Math.hypot(t.x - LONG_RING_BOXING_ARENA.x, t.z - LONG_RING_BOXING_ARENA.z) >= 10.5,
      `Tree ${t.id} should not block the Boxing Arena clearing`
    );
    assert.ok(
      Math.hypot(t.x - LONG_RING_TONJIT_HOUSE.x, t.z - LONG_RING_TONJIT_HOUSE.z) >= 5.5,
      `Tree ${t.id} should not clip Tonjit stilt cabin`
    );
  }

  // Shelly prop present on ground
  const shelly = LONG_RING_PROPS.find((p) => p.kind === 'shelly-dog');
  assert.ok(shelly && shelly.y > LONG_RING_SEA_LEVEL_Y);

  // Every human-scale street preset sits cleanly above local walkable height
  assert.equal(LONG_RING_CAMERA_PRESETS.length, 5);
  for (const preset of LONG_RING_CAMERA_PRESETS) {
    if (!preset.isStreetView) continue;
    const walkY = sampleLongRingWalkSurfaceHeight(
      preset.position[0],
      preset.position[2]
    );
    assert.ok(
      preset.position[1] >= walkY + 1.5 && preset.position[1] <= walkY + 2.1,
      `Human-scale preset ${preset.id} height ${preset.position[1]} should be ~1.75m above walk surface ${walkY}`
    );
  }
});
