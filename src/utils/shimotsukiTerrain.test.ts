import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHIMOTSUKI_BUILDINGS,
  SHIMOTSUKI_CAMERA_PRESETS,
  SHIMOTSUKI_CEMETERY_Y,
  SHIMOTSUKI_DOJO_Y,
  SHIMOTSUKI_FIELD_PLOTS,
  SHIMOTSUKI_LANDMARKS,
  SHIMOTSUKI_PEAK_Y,
  SHIMOTSUKI_QUAY_Y,
  SHIMOTSUKI_RIVER_POINTS,
  SHIMOTSUKI_SPHERE_SEA_OFFSET,
  SHIMOTSUKI_TREES,
  SHIMOTSUKI_VILLAGE_Y,
  sampleShimotsukiFieldMask,
  sampleShimotsukiHeight,
  sampleShimotsukiRiverDistance,
  sampleShimotsukiWalkSurfaceHeight,
  shimotsukiRoadSignedDist,
  toShimotsukiSphereLocal,
} from './shimotsukiTerrain';

test('shimotsuki heightmap sinks seabed deeply outside coast and shapes bay/ridges accurately', () => {
  assert.ok(
    sampleShimotsukiHeight(120, 120) < -4.5,
    'Outside seabed should plunge below -4.5m to prevent ocean sphere edge gaps'
  );
  assert.ok(
    sampleShimotsukiHeight(13.5, -24.5) < -1.5,
    'Northern harbor bay should submerge below -1.5m beneath piers and fishing boats'
  );

  const quayH = sampleShimotsukiWalkSurfaceHeight(
    SHIMOTSUKI_LANDMARKS.harborQuay.x,
    SHIMOTSUKI_LANDMARKS.harborQuay.z
  );
  assert.ok(
    Math.abs(quayH - (SHIMOTSUKI_QUAY_Y + 0.14)) < 0.3,
    `Expected harbor quay near ${SHIMOTSUKI_QUAY_Y}m, got ${quayH}`
  );

  const dojoH = sampleShimotsukiHeight(
    SHIMOTSUKI_LANDMARKS.isshinDojo.x,
    SHIMOTSUKI_LANDMARKS.isshinDojo.z
  );
  assert.ok(
    Math.abs(dojoH - SHIMOTSUKI_DOJO_Y) < 0.25,
    `Expected Isshin Dojo terrace near ${SHIMOTSUKI_DOJO_Y}m, got ${dojoH}`
  );

  const cemH = sampleShimotsukiHeight(
    SHIMOTSUKI_LANDMARKS.cemeteryCenter.x,
    SHIMOTSUKI_LANDMARKS.cemeteryCenter.z
  );
  assert.ok(
    Math.abs(cemH - SHIMOTSUKI_CEMETERY_Y) < 0.25,
    `Expected cemetery pad near ${SHIMOTSUKI_CEMETERY_Y}m, got ${cemH}`
  );

  const bridgeH = sampleShimotsukiWalkSurfaceHeight(
    SHIMOTSUKI_LANDMARKS.riverBridge.x,
    SHIMOTSUKI_LANDMARKS.riverBridge.z
  );
  assert.ok(
    bridgeH > SHIMOTSUKI_VILLAGE_Y + 0.5,
    `Expected wooden bridge deck to arch above village valley, got ${bridgeH}`
  );

  const ridgeH = sampleShimotsukiHeight(35.5, 11.0);
  assert.ok(
    ridgeH > SHIMOTSUKI_VILLAGE_Y + 7.5 && ridgeH <= SHIMOTSUKI_PEAK_Y + 0.5,
    `Expected crescent hill ridge height well above village, got ${ridgeH}`
  );
});

test('shimotsuki buildings stay clear of river, harbor water, cemetery, and cultivated fields', () => {
  const ids = new Set(SHIMOTSUKI_BUILDINGS.map((b) => b.id));
  assert.ok(ids.has('isshin-dojo'));
  assert.ok(ids.has('sh-u-compound'));
  assert.ok(ids.has('sh-harbor-1'));
  assert.ok(SHIMOTSUKI_BUILDINGS.length >= 14);

  for (const b of SHIMOTSUKI_BUILDINGS) {
    assert.ok(b.y > 1.3, `${b.id} must stand cleanly on dry terrain (got ${b.y})`);
    const river = sampleShimotsukiRiverDistance(b.x, b.z);
    assert.ok(
      river.dist > river.halfWidth + 0.4,
      `${b.id} overlaps river channel`
    );
    const field = sampleShimotsukiFieldMask(b.x, b.z);
    assert.ok(!field.inField, `${b.id} overlaps agricultural field plot`);
    assert.ok(
      shimotsukiRoadSignedDist(b.x, b.z) > -0.8,
      `${b.id} center overlaps walkable dirt trail`
    );
  }
});

test('shimotsuki trees exclude roads, fields, cemetery, buildings, river, and overlook bench', () => {
  assert.ok(SHIMOTSUKI_TREES.length >= 90);
  for (const t of SHIMOTSUKI_TREES) {
    assert.ok(t.y >= 1.3, `${t.id} should sit above water`);
    assert.ok(shimotsukiRoadSignedDist(t.x, t.z) >= 1.1, `${t.id} on road`);
    const field = sampleShimotsukiFieldMask(t.x, t.z);
    assert.ok(field.edgeDist >= 1.2, `${t.id} inside agricultural plot`);
    const river = sampleShimotsukiRiverDistance(t.x, t.z);
    assert.ok(river.dist >= river.halfWidth + 1.3, `${t.id} inside river`);
    const pineDist = Math.hypot(
      t.x - SHIMOTSUKI_LANDMARKS.pineOverlook.x,
      t.z - SHIMOTSUKI_LANDMARKS.pineOverlook.z
    );
    assert.ok(pineDist >= 5.5, `${t.id} blocks pine overlook bench`);
  }
  assert.ok(SHIMOTSUKI_FIELD_PLOTS.length >= 7);
});

test('shimotsuki street-view presets spawn cleanly at human eye-height on dry ground', () => {
  const street = SHIMOTSUKI_CAMERA_PRESETS.filter((p) => p.isStreetView);
  assert.ok(street.length >= 4);
  for (const p of street) {
    const groundY = sampleShimotsukiWalkSurfaceHeight(p.position[0], p.position[2]);
    assert.ok(groundY > 1.5, `${p.id} spawns too low (${groundY}m)`);
    assert.ok(
      Math.abs(p.position[1] - (groundY + 1.85)) < 0.05,
      `${p.id} camera height mismatch`
    );
  }
});

test('toShimotsukiSphereLocal lowers island waterline to ocean facet and connects river to bay', () => {
  const seaLevel = toShimotsukiSphereLocal(0, 0, 0, 10);
  assert.ok(
    SHIMOTSUKI_SPHERE_SEA_OFFSET < -1.0 && seaLevel.y < 0,
    `Expected sea waterline lowered onto ocean sphere facet, got y=${seaLevel.y}`
  );

  const villageP = toShimotsukiSphereLocal(0, SHIMOTSUKI_VILLAGE_Y, 0, 10);
  assert.ok(villageP.y > 0 && villageP.x === 0 && villageP.z === 0);

  // River must remain continuously carved below sea level from mid-stream into the northern bay
  const tailPts = SHIMOTSUKI_RIVER_POINTS.slice(2);
  for (const [rx, rz] of tailPts) {
    assert.ok(
      sampleShimotsukiHeight(rx, rz) < -1.5,
      `River channel blocked above -1.5m at (${rx}, ${rz})`
    );
  }
  assert.ok(
    sampleShimotsukiHeight(8.6, -23.0) < -2.0,
    'Estuary mouth must stay deeply submerged into open harbor bay'
  );

  for (const boat of [
    SHIMOTSUKI_LANDMARKS.fishingBoatWest,
    SHIMOTSUKI_LANDMARKS.fishingBoatEast,
  ]) {
    assert.ok(
      sampleShimotsukiHeight(boat.x, boat.z) < -2.0,
      `Moored fishing boat at (${boat.x}, ${boat.z}) must sit over deep harbor water`
    );
    assert.ok(boat.y <= 0, `Fishing boat waterline (${boat.y}) must sit flush in sea`);
  }
});
