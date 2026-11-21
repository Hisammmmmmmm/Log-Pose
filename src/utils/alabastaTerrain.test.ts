import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALABASTA_CAMERA_PRESETS,
  ALABASTA_GLOBE_SCALE,
  ALUBARNA_CENTER,
  ALUBARNA_PLATEAU_Y,
  ALUBARNA_WALL_RADIUS,
  ERUMALU_CENTER,
  KATOREA_CENTER,
  NANOHANA_CENTER,
  RAINBASE_CENTER,
  alabastaCoastSignedDist,
  buildAlubarnaBuildings,
  buildAlabastaPalms,
  buildRegionalTownBuildings,
  sampleAlabastaHeight,
  sampleAlubarnaRamp,
  sandoraRiverSignedDist,
  toAlabastaSphereLocal,
} from './alabastaTerrain';

test('Sandora River carves underwater channel down the middle of Alabasta', () => {
  assert.ok(alabastaCoastSignedDist(8, 10) < -40, 'center of island is deep inland');
  assert.ok(sandoraRiverSignedDist(10, 10) < 0, 'mid-island river coordinate lies in channel');
  const riverBedY = sampleAlabastaHeight(10, 10);
  assert.ok(riverBedY < 0, `expected submerged river bed (< 0), got ${riverBedY}`);

  // Offshore ocean check
  const seaY = sampleAlabastaHeight(175, 175);
  assert.ok(seaY < -2, `expected deep ocean offshore, got ${seaY}`);
});

test('Alubarna sits atop an elevated mesa with twin continuous sloped ramps', () => {
  const centerY = sampleAlabastaHeight(ALUBARNA_CENTER.x, ALUBARNA_CENTER.z);
  assert.ok(
    Math.abs(centerY - ALUBARNA_PLATEAU_Y) < 0.05,
    `expected Alubarna plateau at ${ALUBARNA_PLATEAU_Y}, got ${centerY}`
  );

  // Check southern ramp slopes monotonically from plateau down to desert floor
  const topRamp = sampleAlubarnaRamp(ALUBARNA_CENTER.x, ALUBARNA_CENTER.z + 31);
  const midRamp = sampleAlubarnaRamp(ALUBARNA_CENTER.x, ALUBARNA_CENTER.z + 41);
  const footRamp = sampleAlubarnaRamp(ALUBARNA_CENTER.x, ALUBARNA_CENTER.z + 52);
  assert.ok(topRamp.weight > 0.9);
  assert.ok(midRamp.weight > 0.9);
  assert.ok(topRamp.height > midRamp.height && midRamp.height > footRamp.height);
});

test('Alubarna houses keep the Royal Palace plaza and cardinal streets strictly clear', () => {
  const houses = buildAlubarnaBuildings();
  assert.ok(houses.length >= 85, `expected rich Alubarna house count, got ${houses.length}`);

  for (const h of houses) {
    const r = Math.hypot(h.x - ALUBARNA_CENTER.x, h.z - ALUBARNA_CENTER.z);
    assert.ok(r > 14.0, `house overlapped Royal Palace esplanade at r=${r}`);
    assert.ok(r < ALUBARNA_WALL_RADIUS - 1.5, `house outside Alubarna walls at r=${r}`);
    // Check South main gate street (x ≈ ALUBARNA_CENTER.x, z > ALUBARNA_CENTER.z) is clear
    if (h.z > ALUBARNA_CENTER.z) {
      assert.ok(
        Math.abs(h.x - ALUBARNA_CENTER.x) > 1.8,
        `house blocked Alubarna southern avenue at dx=${Math.abs(h.x - ALUBARNA_CENTER.x)}`
      );
    }
  }
});

test('Regional towns and palm groves stay grounded above sea level', () => {
  const regional = buildRegionalTownBuildings();
  assert.ok(regional.length >= 60);

  for (const b of regional) {
    assert.ok(Number.isFinite(b.y) && b.y >= 0.4, `submerged or NaN building at (${b.x},${b.z}) y=${b.y}`);
  }

  const palms = buildAlabastaPalms();
  assert.ok(palms.length >= 100);
  for (const p of palms) {
    assert.ok(Number.isFinite(p.y) && p.y >= 0.5, `submerged palm at (${p.x},${p.z}) y=${p.y}`);
  }

  // Verify towns sit on solid land
  assert.ok(sampleAlabastaHeight(NANOHANA_CENTER.x, NANOHANA_CENTER.z) > 1.0);
  assert.ok(sampleAlabastaHeight(RAINBASE_CENTER.x, RAINBASE_CENTER.z) > 2.0);
  assert.ok(sampleAlabastaHeight(KATOREA_CENTER.x, KATOREA_CENTER.z) > 3.5);
  assert.ok(sampleAlabastaHeight(ERUMALU_CENTER.x, ERUMALU_CENTER.z) > 1.0);
});

test('All Alabasta camera presets have safe ground clearance', () => {
  for (const preset of ALABASTA_CAMERA_PRESETS) {
    const [px, py, pz] = preset.position;
    const ground = sampleAlabastaHeight(px, pz);
    assert.ok(
      py > ground + 0.8,
      `preset ${preset.id} camera y=${py} is too close/below ground=${ground}`
    );
  }
});

test('toAlabastaSphereLocal wraps coordinates onto the spherical globe surface', () => {
  const globeRadius = 10;
  const shorePt = toAlabastaSphereLocal(140, 0, -120, globeRadius);
  const shoreDistFromPlanetCenter = Math.hypot(
    shorePt.x,
    globeRadius + shorePt.y,
    shorePt.z
  );
  assert.ok(
    Math.abs(shoreDistFromPlanetCenter - globeRadius) < 1e-6,
    `expected sea-level point at exact globe radius ${globeRadius}, got ${shoreDistFromPlanetCenter}`
  );
  assert.ok(
    shorePt.y < 0,
    `expected curved spherical dropoff away from island origin, got y=${shorePt.y}`
  );

  const mesaPt = toAlabastaSphereLocal(
    ALUBARNA_CENTER.x,
    ALUBARNA_PLATEAU_Y,
    ALUBARNA_CENTER.z,
    globeRadius
  );
  const mesaDistFromPlanetCenter = Math.hypot(
    mesaPt.x,
    globeRadius + mesaPt.y,
    mesaPt.z
  );
  const expectedMesaR = globeRadius + ALUBARNA_PLATEAU_Y * ALABASTA_GLOBE_SCALE;
  assert.ok(
    Math.abs(mesaDistFromPlanetCenter - expectedMesaR) < 1e-6,
    `expected mesa radius ${expectedMesaR}, got ${mesaDistFromPlanetCenter}`
  );
});
