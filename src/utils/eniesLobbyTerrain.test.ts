import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ENIES_ABYSS_FLOOR_Y,
  ENIES_ABYSS_RADIUS,
  ENIES_CAMERA_PRESETS,
  ENIES_FRONT_GATE_Y,
  ENIES_MAIN_PLATEAU_Y,
  buildEniesTownHouses,
  eniesMainPlazaSignedDist,
  sampleEniesHeight,
  sampleEniesWalkSurfaceHeight,
  toEniesSphereLocal,
} from './eniesLobbyTerrain';

test('Enies Lobby abyss drops deep below sea level around the central cliff pedestal', () => {
  // Deep inside waterfall chasm ring (between outer rim r=68 and central plateau r=30)
  const abyssWest = sampleEniesHeight(-46, 8);
  const abyssEast = sampleEniesHeight(48, -12);
  const abyssNorthGap = sampleEniesHeight(-18, -42);

  assert.ok(abyssWest < -18, `Expected chasm west < -18, got ${abyssWest}`);
  assert.ok(abyssEast < -18, `Expected chasm east < -18, got ${abyssEast}`);
  assert.ok(abyssNorthGap < -18, `Expected chasm north < -18, got ${abyssNorthGap}`);
  assert.ok(abyssWest >= ENIES_ABYSS_FLOOR_Y - 1.5);

  // Outer ocean outside waterfall rim stays around sea level (y ~ 0)
  const outerSea = sampleEniesHeight(ENIES_ABYSS_RADIUS + 12, 10);
  assert.ok(outerSea > -1.0 && outerSea < 0.5, `Expected sea rim near 0, got ${outerSea}`);
});

test('Enies Lobby concentric gates, causeway, main plateau, Tour Judiciaire & Bridge of Hesitation maintain walkability', () => {
  const pierH = sampleEniesHeight(0, 72);
  const frontGateH = sampleEniesHeight(0, 58);
  const causewayMidH = sampleEniesHeight(0, 39);
  const mainPlazaH = sampleEniesHeight(0, 2);
  const drawbridgeH = sampleEniesHeight(0, -28);
  const towerIsleH = sampleEniesHeight(0, -45.5);
  const bridgeHesitationH = sampleEniesHeight(0, -76);

  assert.ok(pierH > 1.2 && pierH < 2.5, `Pier elevation expected ~1.8, got ${pierH}`);
  assert.ok(Math.abs(frontGateH - ENIES_FRONT_GATE_Y) < 0.8);
  assert.ok(causewayMidH > ENIES_FRONT_GATE_Y && causewayMidH < ENIES_MAIN_PLATEAU_Y);
  assert.ok(Math.abs(mainPlazaH - ENIES_MAIN_PLATEAU_Y) < 0.6);
  assert.ok(Math.abs(drawbridgeH - ENIES_MAIN_PLATEAU_Y) < 0.8);
  assert.ok(Math.abs(towerIsleH - ENIES_MAIN_PLATEAU_Y) < 0.8);
  assert.ok(bridgeHesitationH > 12.5 && bridgeHesitationH < 14.5);
});

test('Enies Lobby terracotta houses stay outside the central ceremonial avenue', () => {
  const houses = buildEniesTownHouses();
  assert.ok(houses.length >= 16, `Expected >=16 town buildings, got ${houses.length}`);
  for (const h of houses) {
    assert.ok(
      eniesMainPlazaSignedDist(h.x, h.z) > 0.4,
      `House ${h.id} at (${h.x},${h.z}) overlaps central plaza`
    );
    assert.ok(h.y > 12.0, `House ${h.id} must sit on elevated main island plateau`);
  }
});

test('All Enies Lobby human-scale camera presets stay above ground surface and spherical projection lifts y', () => {
  for (const preset of ENIES_CAMERA_PRESETS) {
    if (!preset.isStreetView) continue;
    const g = sampleEniesWalkSurfaceHeight(preset.position[0], preset.position[2]);
    assert.ok(
      preset.position[1] >= g + 1.2,
      `Preset ${preset.id} eye Y (${preset.position[1]}) must clear ground (${g})`
    );
  }
  const low = toEniesSphereLocal(0, 0, 0, 10);
  const high = toEniesSphereLocal(0, 20, 0, 10);
  assert.ok(high.y > low.y);
});
