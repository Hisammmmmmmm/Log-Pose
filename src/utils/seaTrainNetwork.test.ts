import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSeaTrainRouteSegments,
  getEniesLobbyPierAnchor,
  getWater7TerminalAnchors,
  sampleSeaTrainTrains,
  sampleSphericalSpline,
} from './seaTrainNetwork';
import {
  PUCCI_CAMERA_PRESETS,
  SAN_FALDO_CAMERA_PRESETS,
  SHIFT_CAMERA_PRESETS,
  SHIFT_SEA_LEVEL_Y,
  STATION_ISLAND_SEA_LEVEL_Y,
  ST_POPLAR_CAMERA_PRESETS,
  buildPucciHouses,
  buildSanFaldoHouses,
  buildStPoplarHouses,
  pucciRoadSignedDist,
  samplePucciHeight,
  samplePucciWalkSurfaceHeight,
  sampleSanFaldoHeight,
  sampleSanFaldoWalkSurfaceHeight,
  sampleShiftHeight,
  sampleShiftWalkSurfaceHeight,
  sampleStPoplarHeight,
  sampleStPoplarWalkSurfaceHeight,
  sanFaldoRoadSignedDist,
  stPoplarRoadSignedDist,
} from './seaTrainStationsTerrain';

test('Sea Train route segments physically connect Water 7 Blue Station & Viaduct to Shift, Pucci, San Faldo, St. Poplar, and Enies Lobby', () => {
  const routes = buildSeaTrainRouteSegments(10);
  assert.ok(routes.length >= 4);

  const w7 = getWater7TerminalAnchors(10);
  const el = getEniesLobbyPierAnchor(10);

  const trunk = routes.find((r) => r.id === 'water7-to-shift');
  assert.ok(trunk, 'Missing water7-to-shift rail route');
  const distStart = Math.hypot(
    trunk.waypoints[0].x - w7.blueStationStart.x,
    trunk.waypoints[0].y - w7.blueStationStart.y,
    trunk.waypoints[0].z - w7.blueStationStart.z
  );
  assert.ok(distStart < 0.005, `Water 7 Blue Station rail must start at terminal anchor`);

  const judicial = routes.find((r) => r.id === 'water7-judicial-enies-lobby');
  assert.ok(judicial, 'Missing water7-judicial-enies-lobby rail route');
  const lastPt = judicial.waypoints[judicial.waypoints.length - 1];
  const distEl = Math.hypot(
    lastPt.x - el.pierDockPoint.x,
    lastPt.y - el.pierDockPoint.y,
    lastPt.z - el.pierDockPoint.z
  );
  assert.ok(distEl < 0.005, 'Judicial line must terminate cleanly at Enies Lobby pier dock');

  const sampled = sampleSphericalSpline(judicial.waypoints, 8, 10.00055);
  for (const pt of sampled) {
    assert.ok(Math.abs(Math.hypot(pt.x, pt.y, pt.z) - 10.00055) < 1e-4);
  }
});

test('Animated Puffing Tom trains travel continuously on ocean tracks at GLOBE_RADIUS + trackLift', () => {
  const t0 = sampleSeaTrainTrains(0, 10, 0.00055);
  const t1 = sampleSeaTrainTrains(2.5, 10, 0.00055);
  assert.equal(t0.length, 2);

  const r0 = Math.hypot(t0[0].position.x, t0[0].position.y, t0[0].position.z);
  assert.ok(Math.abs(r0 - 10.00055) < 1e-4);

  const moved = Math.hypot(
    t1[0].position.x - t0[0].position.x,
    t1[0].position.y - t0[0].position.y,
    t1[0].position.z - t0[0].position.z
  );
  assert.ok(moved > 0.02, `Expected Puffing Tom to advance smoothly along rails, moved ${moved}`);
});

test('Shift Station has twin elevated concrete platforms flanking an open sea track corridor and overpass footbridge', () => {
  const leftPlatH = sampleShiftHeight(-8.0, 4.0);
  const rightPlatH = sampleShiftHeight(8.0, 4.0);
  const channelH = sampleShiftHeight(0.0, 4.0);
  const bridgeTopH = sampleShiftWalkSurfaceHeight(0.0, 0.0);

  assert.ok(leftPlatH > SHIFT_SEA_LEVEL_Y + 0.8);
  assert.ok(rightPlatH > SHIFT_SEA_LEVEL_Y + 0.8);
  assert.ok(channelH < 0, `Expected central rail channel submerged, got ${channelH}`);
  assert.ok(bridgeTopH > 7.0, `Expected overpass footbridge arch high over tracks, got ${bridgeTopH}`);

  for (const p of SHIFT_CAMERA_PRESETS) {
    if (!p.isStreetView) continue;
    const g = sampleShiftWalkSurfaceHeight(p.position[0], p.position[2]);
    assert.ok(p.position[1] >= g + 1.2);
  }
});

test('Pucci Island, San Faldo, and St. Poplar maintain dry town relief, clear roads, and valid street-view presets', () => {
  const stations = [
    {
      name: 'Pucci',
      sampleH: samplePucciHeight,
      sampleWalk: samplePucciWalkSurfaceHeight,
      houses: buildPucciHouses(),
      roadSd: pucciRoadSignedDist,
      presets: PUCCI_CAMERA_PRESETS,
    },
    {
      name: 'San Faldo',
      sampleH: sampleSanFaldoHeight,
      sampleWalk: sampleSanFaldoWalkSurfaceHeight,
      houses: buildSanFaldoHouses(),
      roadSd: sanFaldoRoadSignedDist,
      presets: SAN_FALDO_CAMERA_PRESETS,
    },
    {
      name: 'St. Poplar',
      sampleH: sampleStPoplarHeight,
      sampleWalk: sampleStPoplarWalkSurfaceHeight,
      houses: buildStPoplarHouses(),
      roadSd: stPoplarRoadSignedDist,
      presets: ST_POPLAR_CAMERA_PRESETS,
    },
  ];

  for (const s of stations) {
    assert.ok(s.sampleH(0, 0) > STATION_ISLAND_SEA_LEVEL_Y + 1.5, `${s.name} center must be dry land`);
    assert.ok(s.houses.length >= 6, `${s.name} expected >=6 houses`);
    for (const h of s.houses) {
      assert.ok(h.y > STATION_ISLAND_SEA_LEVEL_Y, `${s.name} house ${h.id} must sit above water`);
      assert.ok(s.roadSd(h.x, h.z) > -0.3, `${s.name} house ${h.id} must clear main street`);
    }
    for (const p of s.presets) {
      if (!p.isStreetView) continue;
      const g = s.sampleWalk(p.position[0], p.position[2]);
      assert.ok(p.position[1] >= g + 1.2, `${s.name} preset ${p.id} must clear ground ${g}`);
    }
  }
});
