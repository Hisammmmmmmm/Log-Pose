import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARY_GEOISE_ALTITUDE,
  MARY_GEOISE_CAMERA_PRESETS,
  MARY_GEOISE_GLOBE_SCALE,
  MARY_GEOISE_LANDMARKS,
  MARY_GEOISE_RED_PORT_SEA_Y,
  MARY_GEOISE_UNDERGROUND_FLOOR_Y,
  buildMaryGeoiseButterflies,
  buildMaryGeoiseMansions,
  buildMaryGeoiseRoomFlowers,
  sampleMaryGeoiseCameraFloorHeight,
  sampleMaryGeoiseHeight,
  sampleMaryGeoiseWalkSurfaceHeight,
  toMaryGeoiseSphereLocal,
} from './maryGeoiseTerrain';

test('Mary Geoise sits atop the Red Line plateau (~10,000m) and plunges to Red Port on East sea cliffs', () => {
  const castleGround = sampleMaryGeoiseHeight(
    MARY_GEOISE_LANDMARKS.pangaeaCastle.x,
    MARY_GEOISE_LANDMARKS.pangaeaCastle.z
  );
  assert.equal(castleGround, 0);

  assert.ok(
    MARY_GEOISE_LANDMARKS.redPortUpperGate.x > 0 &&
      MARY_GEOISE_LANDMARKS.redPortLowerDock.x >
        MARY_GEOISE_LANDMARKS.redPortUpperGate.x,
    'Red Port upper gate and lower dock must sit on the East seaward side of Red Line'
  );

  // True planetary sea level corresponds to exact radial height GLOBE_RADIUS (y = -ALTITUDE / SCALE = -400m)
  const spDockSea = toMaryGeoiseSphereLocal(
    MARY_GEOISE_LANDMARKS.redPortLowerDock.x,
    MARY_GEOISE_RED_PORT_SEA_Y,
    MARY_GEOISE_LANDMARKS.redPortLowerDock.z,
    10
  );
  const rDock = Math.hypot(
    spDockSea.x,
    10 + MARY_GEOISE_ALTITUDE + spDockSea.y,
    spDockSea.z
  );
  assert.ok(
    Math.abs(rDock - 10) < 1e-6,
    `Red Port sea level must align exactly with GLOBE_RADIUS (10.0), got ${rDock}`
  );

  const redPortSea = sampleMaryGeoiseHeight(
    MARY_GEOISE_LANDMARKS.redPortLowerDock.x,
    MARY_GEOISE_LANDMARKS.redPortLowerDock.z
  );
  assert.ok(
    redPortSea <= MARY_GEOISE_RED_PORT_SEA_Y + 0.5,
    `Expected Red Port seabed <= ${MARY_GEOISE_RED_PORT_SEA_Y + 0.5}, got ${redPortSea}`
  );

  // Underground slave quarters camera floor clamp stays underground when camHeightM < -2
  const ugFloor = sampleMaryGeoiseCameraFloorHeight(0, 68, -10.8);
  assert.equal(ugFloor, MARY_GEOISE_UNDERGROUND_FLOOR_Y);

  // East sea camera floor stays at sea/dock level rather than snapping back up to summit plateau
  const eastSeaFloor = sampleMaryGeoiseCameraFloorHeight(220, -4, -180);
  assert.ok(
    eastSeaFloor <= MARY_GEOISE_RED_PORT_SEA_Y + 4.0,
    `East sea camera floor must drop to ocean level, got ${eastSeaFloor}`
  );

  // Surface camera floor clamp stays at 0m when above ground
  const surfFloor = sampleMaryGeoiseCameraFloorHeight(0, 68, 1.75);
  assert.equal(surfFloor, 0);
});

test('toMaryGeoiseSphereLocal projects heights radially from Red Line summit altitude', () => {
  const p0 = toMaryGeoiseSphereLocal(0, 0, 0, 10);
  const pSpire = toMaryGeoiseSphereLocal(0, 70, 0, 10);
  assert.ok(Math.abs(p0.y) < 1e-6);
  const expectedDy = 70 * MARY_GEOISE_GLOBE_SCALE;
  assert.ok(Math.abs(pSpire.y - expectedDy) < 1e-4);
  assert.ok(MARY_GEOISE_ALTITUDE > 0.7);
});

test('Celestial Dragon mansions stay inside perimeter walls and clear of Castle & Socializing Square', () => {
  const mansions = buildMaryGeoiseMansions();
  assert.ok(mansions.length >= 20, `Expected >= 20 noble mansions, got ${mansions.length}`);
  for (const m of mansions) {
    assert.ok(Math.abs(m.x) < 92 && Math.abs(m.z) < 98, `Mansion ${m.id} outside walls`);
    assert.ok(Math.abs(m.x) > 22, `Mansion ${m.id} encroaches on Grand Promenade`);
    const distSocial = Math.hypot(
      m.x - MARY_GEOISE_LANDMARKS.socializingSquare.x,
      m.z - MARY_GEOISE_LANDMARKS.socializingSquare.z
    );
    assert.ok(distSocial > 24, `Mansion ${m.id} overlaps Socializing Square`);
  }

  const flowers = buildMaryGeoiseRoomFlowers();
  const butterflies = buildMaryGeoiseButterflies();
  assert.ok(flowers.length >= 80);
  assert.ok(butterflies.length >= 20);
});

test('All 8 Mary Geoise camera presets align cleanly with their surface, interior, underground, and East Red Port levels', () => {
  assert.equal(MARY_GEOISE_CAMERA_PRESETS.length, 8);
  const surfaceIds = new Set(['pangaea-castle', 'celestial-city', 'socializing-square']);
  for (const preset of MARY_GEOISE_CAMERA_PRESETS) {
    if (surfaceIds.has(preset.id)) {
      const ground = sampleMaryGeoiseWalkSurfaceHeight(
        preset.position[0],
        preset.position[2]
      );
      assert.ok(
        ground >= -0.05 && ground <= 1.5,
        `Surface preset ${preset.id} ground=${ground}`
      );
      const clearance = preset.position[1] - ground;
      assert.ok(
        clearance >= 1.4 && clearance <= 2.2,
        `Surface preset ${preset.id} eye height=${clearance}`
      );
    }
  }
  const ug = MARY_GEOISE_CAMERA_PRESETS.find((p) => p.id === 'slave-quarters')!;
  assert.ok(ug.position[1] < -5, 'Slave quarters camera must be underground');
  const port = MARY_GEOISE_CAMERA_PRESETS.find((p) => p.id === 'red-port')!;
  assert.ok(
    port.position[0] > 200 && port.target[0] > 100 && port.target[1] < -100,
    'Red Port camera must view from the East sea looking at the 400m cliff elevator & harbor'
  );
});
