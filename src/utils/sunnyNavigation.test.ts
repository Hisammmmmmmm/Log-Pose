import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COUP_DE_BURST_COOLDOWN_SEC,
  COUP_DE_BURST_DURATION_SEC,
  SUNNY_COLLISION_RADIUS,
  SUNNY_WORLD_LENGTH,
  canTriggerSunnyBoost,
  computeSunnyNavigatorCamera,
  computeTitleScreenSunnyAndCamera,
  createDefaultSunnyCollisionEnv,
  createInitialSunnyBoostState,
  createSafeSunnySpawn,
  isUVInCalmBelt,
  isUVInReverseMountainCanal,
  isWorldPointLandCollision,
  resurfaceToNewWorld,
  stepSunnyBoostState,
  stepSunnySailing,
  triggerSunnyBoost,
  worldPosToEquirectangular,
  worldToSkypieaLocal,
  type SunnyState,
} from './sunnyNavigation';
import {
  MUGIWARA_ROUTE_IDS,
  advanceMugiwaraRouteOnTelemetry,
  computeLogPoseGuidance,
  getMugiwaraRouteIslands,
  isShipInGrandLineWaters,
  resolveInitialMugiwaraRouteIndex,
  shouldAdvanceMugiwaraWaypoint,
} from './mugiwaraRoute';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import { equirectangularToSphere } from './globeMath';
import { MARINEFORD_GLOBE_SCALE } from './marinefordTerrain';
import { DRESSROSA_GLOBE_SCALE } from './dressrosaTerrain';
import {
  ANGEL_BEACH_CENTER,
  SKYPIEA_ALTITUDE,
  SKYPIEA_SEA_EXIT_RADIUS,
} from './skypieaTerrain';
import {
  FISH_MAN_DEPTH,
  FISH_MAN_NEW_WORLD_EXIT_COORDS,
  SUBSEA_PLUNGE_GLOBE_COORDS,
} from './fishManIslandTerrain';
import { PUNK_HAZARD_GLOBE_SCALE } from './punkHazardTerrain';
import {
  TOTTO_LAND_GLOBE_SCALE,
  TOTTO_LAND_ISLAND_BY_ID,
} from './tottoLandTerrain';
import { ZOU_GLOBE_SCALE, ZUNESHA_LEGS } from './zouTerrain';
import { WANO_GLOBE_SCALE, WANO_ONIGASHIMA_CENTER } from './wanoTerrain';
import { computeSunnyWakeMetrics } from './sunnyModel';

test('Thousand Sunny scale is at least 3x smaller than original 0.024 world length', () => {
  assert.ok(
    SUNNY_WORLD_LENGTH <= 0.008,
    `Expected SUNNY_WORLD_LENGTH <= 0.008 (3x smaller than 0.024), got ${SUNNY_WORLD_LENGTH}`
  );
  assert.ok(
    SUNNY_COLLISION_RADIUS <= 0.004,
    `Expected SUNNY_COLLISION_RADIUS <= 0.004, got ${SUNNY_COLLISION_RADIUS}`
  );
});

test('Sunny sails smoothly across open ocean while staying locked to globe surface', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  let state = createSafeSunnySpawn(null, env, ONE_PIECE_LOCATIONS);
  const startPos = { ...state.position };

  for (let i = 0; i < 20; i++) {
    state = stepSunnySailing(
      state,
      { throttle: 1, steer: 0, boost: false },
      0.04,
      env,
      ONE_PIECE_LOCATIONS
    );
  }

  const radius = Math.hypot(state.position.x, state.position.y, state.position.z);
  assert.ok(Math.abs(radius - 10) < 1e-5, 'Ship must stay on ocean surface radius');
  const traveled = Math.hypot(
    state.position.x - startPos.x,
    state.position.y - startPos.y,
    state.position.z - startPos.z
  );
  assert.ok(traveled > 0.04, `Expected forward sailing distance, got ${traveled}`);
  assert.equal(state.collided, false);
  assert.equal(state.calmBeltBlocked, false);
});

test('Steering updates Sunny heading cleanly inside spherical tangent plane', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  let state = createSafeSunnySpawn(null, env, ONE_PIECE_LOCATIONS);
  const initialHeading = { ...state.heading };

  for (let i = 0; i < 20; i++) {
    state = stepSunnySailing(
      state,
      { throttle: 1, steer: 1, boost: false },
      0.04,
      env,
      ONE_PIECE_LOCATIONS
    );
  }

  const dotHeading =
    state.heading.x * initialHeading.x +
    state.heading.y * initialHeading.y +
    state.heading.z * initialHeading.z;
  assert.ok(dotHeading < 0.7, 'Ship should rotate significantly when steering');
  const upLen = Math.hypot(state.position.x, state.position.y, state.position.z);
  const tangentDot =
    (state.heading.x * state.position.x +
      state.heading.y * state.position.y +
      state.heading.z * state.position.z) /
    upLen;
  assert.ok(Math.abs(tangentDot) < 1e-4, 'Heading must stay tangent to sphere');
});

test('Calm Belt blocks direct crossing between East Blue and Paradise outside Reverse Mountain', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  // Start in East Blue well east of Reverse Mountain (u=0.70, v=0.412) heading straight South into North Calm Belt
  const pos = equirectangularToSphere(0.7, 0.412, 10);
  const southTarget = equirectangularToSphere(0.7, 0.45, 10);
  const upLen = Math.hypot(pos.x, pos.y, pos.z);
  const up = { x: pos.x / upLen, y: pos.y / upLen, z: pos.z / upLen };
  const raw = {
    x: southTarget.x - pos.x,
    y: southTarget.y - pos.y,
    z: southTarget.z - pos.z,
  };
  const d = raw.x * up.x + raw.y * up.y + raw.z * up.z;
  const tan = { x: raw.x - up.x * d, y: raw.y - up.y * d, z: raw.z - up.z * d };
  const tLen = Math.hypot(tan.x, tan.y, tan.z);

  let state: SunnyState = {
    position: pos,
    heading: { x: tan.x / tLen, y: tan.y / tLen, z: tan.z / tLen },
    elevation: 0,
    pitchAngle: 0,
    speed: 0,
    turnVelocity: 0,
    bankAngle: 0,
    collided: false,
    calmBeltBlocked: false,
    inReverseMountainCanal: false,
    reverseMountainPhase: null,
    skyZone: 'blue-sea',
    balloonDeploy: 0,
    knockUpStreamProgress: 0,
    nearestIsland: null,
    nearestDistance: 0,
  };

  let blockedAtLeastOnce = false;
  for (let i = 0; i < 60; i++) {
    state = stepSunnySailing(
      state,
      { throttle: 1, steer: 0, boost: true },
      0.05,
      env,
      ONE_PIECE_LOCATIONS
    );
    if (state.calmBeltBlocked) blockedAtLeastOnce = true;
  }

  const endUV = worldPosToEquirectangular(state.position);
  assert.equal(blockedAtLeastOnce, true, 'Calm Belt should stop Sunny advancing across it');
  assert.ok(
    endUV.v < 0.422,
    `Ship must stay on East Blue side of Calm Belt, got v=${endUV.v}`
  );
});

test('Reverse Mountain canal allows crossing Red Line from Four Blues into Grand Line', () => {
  // Simulate Red Line barrier everywhere near u=0.5 unless carved by canal
  const env = createDefaultSunnyCollisionEnv(10, (u, v) =>
    Math.abs(u - 0.5) < 0.045 && Math.abs(v - 0.5) < 0.2 ? 0.85 : 0
  );

  // Entry in East Blue canal, summit, and Paradise exit are all navigable and unblocked by Calm Belt
  assert.equal(isUVInReverseMountainCanal(0.542, 0.415, env), true);
  assert.equal(isUVInCalmBelt(0.542, 0.415, env), false);
  assert.equal(
    isWorldPointLandCollision(equirectangularToSphere(0.500, 0.500, 10), env),
    false
  );
  assert.equal(
    isWorldPointLandCollision(equirectangularToSphere(0.532, 0.500, 10), env),
    false
  );

  // Adjacent Red Line cliff beside the canal still collides
  assert.equal(
    isWorldPointLandCollision(equirectangularToSphere(0.49, 0.45, 10), env),
    true
  );
});

test('Marineford Harbor Mouth is navigable while crescent seawall blocks and slides Sunny', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);

  const harborMouthPoint = {
    x: env.marineford.origin.x + env.marineford.south.x * (66 * MARINEFORD_GLOBE_SCALE),
    y: env.marineford.origin.y + env.marineford.south.y * (66 * MARINEFORD_GLOBE_SCALE),
    z: env.marineford.origin.z + env.marineford.south.z * (66 * MARINEFORD_GLOBE_SCALE),
  };
  const lenM = Math.hypot(harborMouthPoint.x, harborMouthPoint.y, harborMouthPoint.z);
  harborMouthPoint.x = (harborMouthPoint.x / lenM) * 10;
  harborMouthPoint.y = (harborMouthPoint.y / lenM) * 10;
  harborMouthPoint.z = (harborMouthPoint.z / lenM) * 10;
  assert.equal(isWorldPointLandCollision(harborMouthPoint, env), false);

  const seawallPoint = {
    x:
      env.marineford.origin.x +
      env.marineford.east.x * (-46 * MARINEFORD_GLOBE_SCALE) +
      env.marineford.south.x * (20 * MARINEFORD_GLOBE_SCALE),
    y:
      env.marineford.origin.y +
      env.marineford.east.y * (-46 * MARINEFORD_GLOBE_SCALE) +
      env.marineford.south.y * (20 * MARINEFORD_GLOBE_SCALE),
    z:
      env.marineford.origin.z +
      env.marineford.east.z * (-46 * MARINEFORD_GLOBE_SCALE) +
      env.marineford.south.z * (20 * MARINEFORD_GLOBE_SCALE),
  };
  const lenW = Math.hypot(seawallPoint.x, seawallPoint.y, seawallPoint.z);
  seawallPoint.x = (seawallPoint.x / lenW) * 10;
  seawallPoint.y = (seawallPoint.y / lenW) * 10;
  seawallPoint.z = (seawallPoint.z / lenW) * 10;
  assert.equal(isWorldPointLandCollision(seawallPoint, env), true);

  const mfIsland = ONE_PIECE_LOCATIONS.find((l) => l.id === 'marineford')!;
  let state = createSafeSunnySpawn(mfIsland, env, ONE_PIECE_LOCATIONS);
  state = {
    ...state,
    heading: {
      x: -env.marineford.east.x * 0.45 - env.marineford.south.x * 0.89,
      y: -env.marineford.east.y * 0.45 - env.marineford.south.y * 0.89,
      z: -env.marineford.east.z * 0.45 - env.marineford.south.z * 0.89,
    },
  };
  let sawCollision = false;
  for (let i = 0; i < 65; i++) {
    state = stepSunnySailing(
      state,
      { throttle: 1, steer: 0, boost: false },
      0.04,
      env,
      ONE_PIECE_LOCATIONS
    );
    if (state.collided) sawCollision = true;
  }
  assert.equal(sawCollision, true, 'Ship should collide against Marineford seawall');
  assert.equal(
    isWorldPointLandCollision(state.position, env),
    false,
    'Ship center must never penetrate inside solid island land'
  );
});

test('Mouse orbit rotates navigator camera smoothly around Sunny above ocean surface and frames horizon', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  const state = createSafeSunnySpawn(null, env, ONE_PIECE_LOCATIONS);

  const defaultCam = computeSunnyNavigatorCamera(state, 'navigator', 10);
  const shipLen = Math.hypot(state.position.x, state.position.y, state.position.z);
  const up = {
    x: state.position.x / shipLen,
    y: state.position.y / shipLen,
    z: state.position.z / shipLen,
  };
  const camRel = {
    x: defaultCam.position.x - state.position.x,
    y: defaultCam.position.y - state.position.y,
    z: defaultCam.position.z - state.position.z,
  };
  const tgtRel = {
    x: defaultCam.target.x - state.position.x,
    y: defaultCam.target.y - state.position.y,
    z: defaultCam.target.z - state.position.z,
  };
  const camFwdDot =
    camRel.x * state.heading.x + camRel.y * state.heading.y + camRel.z * state.heading.z;
  const tgtFwdDot =
    tgtRel.x * state.heading.x + tgtRel.y * state.heading.y + tgtRel.z * state.heading.z;
  assert.ok(camFwdDot < -SUNNY_WORLD_LENGTH * 7.0, 'Navigator camera must sit well behind stern');
  assert.ok(tgtFwdDot > SUNNY_WORLD_LENGTH * 5.0, 'Navigator camera must look far ahead toward horizon');

  // Check camera height clears Sunny mast top slightly so horizon ahead is unobstructed
  const camHeightAboveWater = Math.hypot(
    defaultCam.position.x,
    defaultCam.position.y,
    defaultCam.position.z
  ) - 10;
  assert.ok(
    camHeightAboveWater > SUNNY_WORLD_LENGTH * 1.4 &&
      camHeightAboveWater < SUNNY_WORLD_LENGTH * 2.1,
    `Expected camera slightly above mast height for clear horizon over Sunny, got ${camHeightAboveWater}`
  );

  // Check gentle downward gaze (3..8.5 deg) so sea, Sunny, and horizon ahead are framed without aiming too high
  const viewVec = {
    x: defaultCam.target.x - defaultCam.position.x,
    y: defaultCam.target.y - defaultCam.position.y,
    z: defaultCam.target.z - defaultCam.position.z,
  };
  const viewDist = Math.hypot(viewVec.x, viewVec.y, viewVec.z);
  const viewUpDot = viewVec.x * up.x + viewVec.y * up.y + viewVec.z * up.z;
  const downAngleDeg = (Math.asin(-viewUpDot / viewDist) * 180) / Math.PI;
  assert.ok(
    downAngleDeg >= 3 && downAngleDeg <= 8.5,
    `Expected gentle downward horizon gaze (3..8.5 deg), got ${downAngleDeg.toFixed(2)}`
  );

  // Upward mouse pitch tilts view cleanly skyward without clipping below sea level
  const skyTiltCam = computeSunnyNavigatorCamera(state, 'navigator', 10, {
    yaw: 0,
    pitch: -0.42,
    distanceScale: 1,
  });
  const skyCamR = Math.hypot(
    skyTiltCam.position.x,
    skyTiltCam.position.y,
    skyTiltCam.position.z
  );
  assert.ok(skyCamR >= 10 + SUNNY_WORLD_LENGTH * 0.23, 'Upward tilt must stay above waves');
  const skyViewVec = {
    x: skyTiltCam.target.x - skyTiltCam.position.x,
    y: skyTiltCam.target.y - skyTiltCam.position.y,
    z: skyTiltCam.target.z - skyTiltCam.position.z,
  };
  const skyViewUpDot = skyViewVec.x * up.x + skyViewVec.y * up.y + skyViewVec.z * up.z;
  assert.ok(skyViewUpDot > 0, 'Negative pitch drag should tilt camera gaze upward toward sky/peaks');

  const orbitedCam = computeSunnyNavigatorCamera(state, 'navigator', 10, {
    yaw: Math.PI * 0.65,
    pitch: 0.25,
    distanceScale: 1.5,
  });

  const delta = Math.hypot(
    orbitedCam.position.x - defaultCam.position.x,
    orbitedCam.position.y - defaultCam.position.y,
    orbitedCam.position.z - defaultCam.position.z
  );
  assert.ok(delta > SUNNY_WORLD_LENGTH * 1.5, 'Mouse orbit should swing camera around boat');
  const orbitedR = Math.hypot(
    orbitedCam.position.x,
    orbitedCam.position.y,
    orbitedCam.position.z
  );
  assert.ok(orbitedR > 10, 'Orbited camera must remain above ocean surface');

  // At 180° yaw, camera must be ahead of bow looking back across Sunny
  const frontCam = computeSunnyNavigatorCamera(state, 'navigator', 10, {
    yaw: Math.PI,
    pitch: 0,
    distanceScale: 1,
  });
  const frontFwdDot =
    (frontCam.position.x - state.position.x) * state.heading.x +
    (frontCam.position.y - state.position.y) * state.heading.y +
    (frontCam.position.z - state.position.z) * state.heading.z;
  assert.ok(frontFwdDot > SUNNY_WORLD_LENGTH * 5.0, '180° mouse orbit should swing in front of bow');

  for (const mode of ['navigator', 'deck', 'overhead'] as const) {
    const cam = computeSunnyNavigatorCamera(state, mode, 10);
    const camR = Math.hypot(cam.position.x, cam.position.y, cam.position.z);
    assert.ok(camR > 10 + SUNNY_WORLD_LENGTH * 0.2, `Camera ${mode} above water`);
  }
});

test('Mugiwara Log Pose tracks canonical One Piece route and points accurately to next island', () => {
  const route = getMugiwaraRouteIslands(ONE_PIECE_LOCATIONS);
  assert.equal(route.length, MUGIWARA_ROUTE_IDS.length);
  assert.equal(route[1].id, 'reverse-mountain');
  assert.equal(route[2].id, 'twin-cape');
  assert.equal(route[route.length - 1].id, 'laugh-tale');

  // Default voyage from East Blue targets Reverse Mountain first
  assert.equal(
    route[resolveInitialMugiwaraRouteIndex(null, route)].id,
    'reverse-mountain'
  );

  // Starting from Alabasta locks Log Pose to Jaya
  const alabasta = ONE_PIECE_LOCATIONS.find((l) => l.id === 'alabasta')!;
  assert.equal(
    route[resolveInitialMugiwaraRouteIndex(alabasta, route)].id,
    'jaya'
  );

  // Guidance bearing points dead ahead (0 rad) when ship heading faces Reverse Mountain
  const rm = route[1];
  const shipPos = equirectangularToSphere(0.546, 0.402, 10);
  const rmPos = equirectangularToSphere(rm.u, rm.v, 10);
  const upLen = Math.hypot(shipPos.x, shipPos.y, shipPos.z);
  const up = { x: shipPos.x / upLen, y: shipPos.y / upLen, z: shipPos.z / upLen };
  const raw = { x: rmPos.x - shipPos.x, y: rmPos.y - shipPos.y, z: rmPos.z - shipPos.z };
  const d = raw.x * up.x + raw.y * up.y + raw.z * up.z;
  const tan = { x: raw.x - up.x * d, y: raw.y - up.y * d, z: raw.z - up.z * d };
  const tLen = Math.hypot(tan.x, tan.y, tan.z);
  const fwd = { x: tan.x / tLen, y: tan.y / tLen, z: tan.z / tLen };

  const guidance = computeLogPoseGuidance(shipPos, fwd, rm, 10);
  assert.ok(
    Math.abs(guidance.relativeAngleRad) < 0.05,
    `Expected Log Pose needle dead ahead (~0 rad), got ${guidance.relativeAngleRad}`
  );
  assert.equal(shouldAdvanceMugiwaraWaypoint(rmPos, rm, 10), true);
  assert.equal(shouldAdvanceMugiwaraWaypoint(shipPos, rm, 10), false);

  // Climbing Reverse Mountain from East Blue stays out of Grand Line until eastern exit
  assert.equal(isShipInGrandLineWaters(0.546, 0.408), false);
  assert.equal(isShipInGrandLineWaters(0.500, 0.500), false);
  // Crossing Twin Cape gate (u >= 0.535, v = 0.500) enters Grand Line and jumps past Twin Cape -> Cactus Island
  assert.equal(isShipInGrandLineWaters(0.5385, 0.500), true);
  const enterFromRm = advanceMugiwaraRouteOnTelemetry({
    shipPos: equirectangularToSphere(0.5385, 0.500, 10),
    u: 0.5385,
    v: 0.500,
    currentIndex: 1,
    routeIslands: route,
    globeRadius: 10,
  });
  assert.equal(enterFromRm.enteredGrandLine, true);
  assert.equal(route[enterFromRm.nextIndex].id, 'cactus-island');
});

test('Sunny climbs Reverse Mountain ascending current, turns at summit whirlpool, and descends into Grand Line', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  const rmIsland = ONE_PIECE_LOCATIONS.find((l) => l.id === 'reverse-mountain')!;
  let state = createSafeSunnySpawn(rmIsland, env, ONE_PIECE_LOCATIONS);

  assert.equal(state.inReverseMountainCanal, true);
  assert.equal(state.reverseMountainPhase, 'climbing');
  assert.ok(state.pitchAngle > 0.1, `Expected upward pitch while climbing, got ${state.pitchAngle}`);

  let maxElevation = state.elevation;
  let maxPitch = state.pitchAngle;
  let minPitch = state.pitchAngle;
  let sawSummit = false;
  let sawDescending = false;

  for (let i = 0; i < 650; i++) {
    state = stepSunnySailing(
      state,
      { throttle: 1, steer: 0, boost: false },
      0.05,
      env,
      ONE_PIECE_LOCATIONS
    );
    maxElevation = Math.max(maxElevation, state.elevation);
    maxPitch = Math.max(maxPitch, state.pitchAngle);
    minPitch = Math.min(minPitch, state.pitchAngle);
    if (state.reverseMountainPhase === 'summit') sawSummit = true;
    if (state.reverseMountainPhase === 'descending') sawDescending = true;
  }

  const endUV = worldPosToEquirectangular(state.position);
  assert.ok(
    maxElevation > 1.05,
    `Expected Sunny to climb near summit height (~1.16), got maxElevation=${maxElevation}`
  );
  assert.ok(maxPitch > 0.18, `Expected positive upward climb pitch, got ${maxPitch}`);
  assert.equal(sawSummit, true, 'Sunny must pass through the summit whirlpool phase');
  assert.equal(sawDescending, true, 'Sunny must enter the Grand Line descending chute');
  assert.ok(minPitch < -0.18, `Expected negative downward descent pitch, got ${minPitch}`);
  assert.ok(
    endUV.u > 0.525 && Math.abs(endUV.v - 0.5) < 0.015,
    `Expected Sunny to emerge east into Grand Line (Paradise), got u=${endUV.u}, v=${endUV.v}`
  );
  assert.ok(
    state.elevation < 0.25,
    `Expected elevation to descend back toward Grand Line sea level, got ${state.elevation}`
  );
});

test('Sailing from Jaya enters the Knock Up Stream elevator, crests in Angel Bay facing Angel Beach, and deploys Giant Octopus Balloon at Skypiea rim', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  const jaya = ONE_PIECE_LOCATIONS.find((l) => l.id === 'jaya')!;
  const skypiea = ONE_PIECE_LOCATIONS.find((l) => l.id === 'skypiea')!;

  // 1. Spawn at Jaya in open Blue Sea facing the Knock Up Stream a short sail away
  let state = createSafeSunnySpawn(jaya, env, ONE_PIECE_LOCATIONS);
  assert.equal(state.skyZone, 'blue-sea');
  assert.equal(state.collided, false);
  assert.equal(state.elevation, 0);

  const distStartToKUS = Math.hypot(
    state.position.x - env.knockUpStreamCenter.x,
    state.position.y - env.knockUpStreamCenter.y,
    state.position.z - env.knockUpStreamCenter.z
  );
  assert.ok(
    distStartToKUS > 0.08 && distStartToKUS < 0.45,
    `Expected Jaya spawn a short sail from Knock Up Stream, got ${distStartToKUS}`
  );

  // Under Skypiea on the Blue Sea must NOT prematurely trigger Skypiea Log Pose arrival
  assert.equal(
    shouldAdvanceMugiwaraWaypoint(env.knockUpStreamCenter, skypiea, 10, 0.24, 0),
    false,
    'Skypiea Log Pose must not unlock at Blue Sea altitude'
  );

  // 2. Sail forward into Knock Up Stream -> ride vertical water elevator up
  let enteredKUS = false;
  let reachedSkypiea = false;
  let maxKUSProgress = 0;

  for (let i = 0; i < 240; i++) {
    state = stepSunnySailing(
      state,
      { throttle: 1, steer: 0, boost: false },
      0.05,
      env,
      ONE_PIECE_LOCATIONS
    );
    if (state.skyZone === 'knock-up-stream') {
      enteredKUS = true;
      maxKUSProgress = Math.max(maxKUSProgress, state.knockUpStreamProgress);
    }
    if (state.skyZone === 'skypiea') {
      reachedSkypiea = true;
      break;
    }
  }

  assert.equal(enteredKUS, true, 'Sailing from Jaya must enter the Knock Up Stream water column');
  assert.ok(maxKUSProgress > 0.5, `Expected vertical elevator progression, got ${maxKUSProgress}`);
  assert.equal(reachedSkypiea, true, 'Knock Up Stream elevator must deliver Sunny onto Skypiea');
  assert.ok(
    Math.abs(state.elevation - SKYPIEA_ALTITUDE) < 1e-4,
    `Expected Sunny elevation at SKYPIEA_ALTITUDE (${SKYPIEA_ALTITUDE}), got ${state.elevation}`
  );

  // Check Sunny landed in Angel Bay looking toward Angel Beach
  const arrivalLocal = worldToSkypieaLocal(state.position, env.skypiea, 10);
  assert.ok(
    arrivalLocal.lx > -10 && arrivalLocal.lx < 35 && arrivalLocal.lz > 60 && arrivalLocal.lz < 95,
    `Expected arrival in Angel Bay facing Angel Beach, got (${arrivalLocal.lx.toFixed(1)}, ${arrivalLocal.lz.toFixed(1)})`
  );
  assert.ok(
    ANGEL_BEACH_CENTER.x > arrivalLocal.lx,
    'Arrival point is in open bay west of Angel Beach'
  );

  // At Skypiea altitude, Log Pose unlocks Skypiea waypoint
  assert.equal(
    shouldAdvanceMugiwaraWaypoint(state.position, skypiea, 10, 0.24, state.elevation),
    true,
    'Skypiea Log Pose should advance once Sunny ascends to Skypiea'
  );

  // 3. Steer south out through Angel Bay's mouth to Skypiea's outer rim -> deploy Octopus Balloon
  const southWorld = {
    x: state.position.x + env.skypiea.south.x * 0.2,
    y: state.position.y + env.skypiea.south.y * 0.2,
    z: state.position.z + env.skypiea.south.z * 0.2,
  };
  const upVec = {
    x: state.position.x / 10,
    y: state.position.y / 10,
    z: state.position.z / 10,
  };
  const rawS = {
    x: southWorld.x - state.position.x,
    y: southWorld.y - state.position.y,
    z: southWorld.z - state.position.z,
  };
  const dS = rawS.x * upVec.x + rawS.y * upVec.y + rawS.z * upVec.z;
  const tanS = { x: rawS.x - upVec.x * dS, y: rawS.y - upVec.y * dS, z: rawS.z - upVec.z * dS };
  const tanSLen = Math.hypot(tanS.x, tanS.y, tanS.z);
  state = {
    ...state,
    heading: { x: tanS.x / tanSLen, y: tanS.y / tanSLen, z: tanS.z / tanSLen },
  };

  let enteredBalloonGlide = false;
  let maxBalloonDeploy = 0;
  let rimLocalR = 0;
  let returnedToBlueSea = false;

  for (let i = 0; i < 320; i++) {
    state = stepSunnySailing(
      state,
      { throttle: 1, steer: 0, boost: false },
      0.05,
      env,
      ONE_PIECE_LOCATIONS
    );
    if (state.skyZone === 'balloon-glide') {
      if (!enteredBalloonGlide) {
        const loc = worldToSkypieaLocal(state.position, env.skypiea, 10);
        rimLocalR = Math.hypot(loc.lx, loc.lz);
      }
      enteredBalloonGlide = true;
      maxBalloonDeploy = Math.max(maxBalloonDeploy, state.balloonDeploy);
    } else if (enteredBalloonGlide && state.skyZone === 'blue-sea') {
      returnedToBlueSea = true;
      break;
    }
  }

  assert.equal(enteredBalloonGlide, true, 'Sailing to Skypiea perimeter must deploy Giant Octopus Balloon');
  assert.ok(
    rimLocalR >= SKYPIEA_SEA_EXIT_RADIUS - 2,
    `Expected Octopus Balloon trigger near Skypiea rim (${SKYPIEA_SEA_EXIT_RADIUS}), got ${rimLocalR}`
  );
  assert.ok(maxBalloonDeploy > 0.9, `Expected full Octopus Balloon inflation (~1), got ${maxBalloonDeploy}`);
  assert.equal(returnedToBlueSea, true, 'Octopus Balloon glide must smoothly touch down onto the Blue Sea');
  assert.equal(state.elevation, 0);
  assert.equal(state.balloonDeploy, 0);
});

test('Sunny spawns safely in Long Ring lagoon, sails through inter-island straits, and collides on islands', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  const longRingIsland = ONE_PIECE_LOCATIONS.find((l) => l.id === 'long-ring-long-land')!;
  const state = createSafeSunnySpawn(longRingIsland, env, ONE_PIECE_LOCATIONS);
  assert.equal(state.collided, false);

  // Center of circular lagoon is navigable open water
  assert.equal(isWorldPointLandCollision(env.longRing.origin, env), false);

  // Midpoint strait between Lobe 0 and Lobe 1 is navigable over submerged ring ridge
  const straitWorld = {
    x: env.longRing.origin.x + env.longRing.east.x * (7.8 * 0.002) + env.longRing.south.x * (63.5 * 0.002),
    y: env.longRing.origin.y + env.longRing.east.y * (7.8 * 0.002) + env.longRing.south.y * (63.5 * 0.002),
    z: env.longRing.origin.z + env.longRing.east.z * (7.8 * 0.002) + env.longRing.south.z * (63.5 * 0.002),
  };
  const straitLen = Math.hypot(straitWorld.x, straitWorld.y, straitWorld.z);
  assert.equal(
    isWorldPointLandCollision(
      {
        x: (straitWorld.x / straitLen) * 10,
        y: (straitWorld.y / straitLen) * 10,
        z: (straitWorld.z / straitLen) * 10,
      },
      env
    ),
    false
  );
});

test('Sunny spawns safely outside Enies Lobby sea gate & Shift Station without entering the abyss', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);

  const enies = ONE_PIECE_LOCATIONS.find((l) => l.id === 'enies-lobby')!;
  let eniesState = createSafeSunnySpawn(enies, env, ONE_PIECE_LOCATIONS);
  assert.equal(eniesState.collided, false);
  assert.equal(isWorldPointLandCollision(eniesState.position, env), false);
  // Center of Enies Lobby inside the abyss must block Sunny
  assert.equal(isWorldPointLandCollision(env.eniesLobby.origin, env), true);

  let hitRim = false;
  for (let i = 0; i < 65; i++) {
    eniesState = stepSunnySailing(
      eniesState,
      { throttle: 1, steer: 0, boost: false },
      0.04,
      env,
      ONE_PIECE_LOCATIONS
    );
    if (eniesState.collided) hitRim = true;
  }
  assert.equal(hitRim, true, 'Enies Lobby pier/abyss rim must block Sunny');
  assert.equal(
    isWorldPointLandCollision(eniesState.position, env),
    false,
    'Sunny must never penetrate inside Enies Lobby abyss'
  );

  for (const id of ['shift-station', 'pucci-island', 'san-faldo', 'st-poplar']) {
    const loc = ONE_PIECE_LOCATIONS.find((l) => l.id === id)!;
    const st = createSafeSunnySpawn(loc, env, ONE_PIECE_LOCATIONS);
    assert.equal(st.collided, false, `${id} spawn must be clear of collision`);
    assert.equal(
      isWorldPointLandCollision(st.position, env),
      false,
      `${id} spawn must sit in navigable ocean`
    );
  }
});

test('Amazon Lily mountain terrain blocks Sunny while SE port approach spawns in navigable water', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  const amazonLily = ONE_PIECE_LOCATIONS.find((l) => l.id === 'amazon-lily')!;
  const st = createSafeSunnySpawn(amazonLily, env, ONE_PIECE_LOCATIONS);
  assert.equal(st.collided, false, 'Amazon Lily spawn must be clear of collision');
  assert.equal(
    isWorldPointLandCollision(st.position, env),
    false,
    'Amazon Lily spawn must sit in navigable water outside port mouth'
  );
  assert.equal(
    isWorldPointLandCollision(env.amazonLily.origin, env),
    true,
    'Amazon Lily crater island core must register as solid terrain'
  );
});

test('Thriller Bark outer hull and island block Sunny while South Mouth Gate approach spawns in navigable water', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  const thrillerBark = ONE_PIECE_LOCATIONS.find((l) => l.id === 'thriller-bark')!;
  const st = createSafeSunnySpawn(thrillerBark, env, ONE_PIECE_LOCATIONS);
  assert.equal(st.collided, false, 'Thriller Bark spawn must be clear of collision');
  assert.equal(
    isWorldPointLandCollision(st.position, env),
    false,
    'Thriller Bark spawn must sit in navigable ocean outside South Mouth Gate'
  );
  assert.equal(
    isWorldPointLandCollision(env.thrillerBark.origin, env),
    true,
    'Thriller Bark central castle island must register as solid land'
  );
});

test('Sabaody Archipelago spawns Sunny safely south of Coating Port while grove islets collide', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  const sabaody = ONE_PIECE_LOCATIONS.find((l) => l.id === 'sabaody')!;
  const st = createSafeSunnySpawn(sabaody, env, ONE_PIECE_LOCATIONS);
  assert.equal(st.collided, false, 'Sabaody spawn must be clear of collision');
  assert.equal(
    isWorldPointLandCollision(st.position, env),
    false,
    'Sabaody spawn must sit in navigable ocean south of Groves 40-49 piers'
  );
  // Park grove island core (Groves 30-39) must register as solid terrain
  const parkPoint = {
    x: env.sabaody.origin.x + env.sabaody.east.x * (34 * 0.0017) + env.sabaody.south.x * (37.5 * 0.0017),
    y: env.sabaody.origin.y + env.sabaody.east.y * (34 * 0.0017) + env.sabaody.south.y * (37.5 * 0.0017),
    z: env.sabaody.origin.z + env.sabaody.east.z * (34 * 0.0017) + env.sabaody.south.z * (37.5 * 0.0017),
  };
  const lenP = Math.hypot(parkPoint.x, parkPoint.y, parkPoint.z);
  assert.equal(
    isWorldPointLandCollision(
      { x: (parkPoint.x / lenP) * 10, y: (parkPoint.y / lenP) * 10, z: (parkPoint.z / lenP) * 10 },
      env
    ),
    true,
    'Sabaody Park grove islet must register as solid land'
  );
});

test('Mary Geoise spawns Sunny safely in East sea right off Red Port Harbor while Red Port pier & Red Line ridge collide', () => {
  const env = createDefaultSunnyCollisionEnv(10, (u, v) =>
    (u < 0.022 || u > 0.978) && Math.abs(v - 0.5) < 0.3 ? 0.85 : 0
  );
  const maryGeoise = ONE_PIECE_LOCATIONS.find((l) => l.id === 'mary-geoise')!;
  const st = createSafeSunnySpawn(maryGeoise, env, ONE_PIECE_LOCATIONS);
  assert.equal(st.collided, false, 'Mary Geoise Red Port spawn must stay clear of Red Port piers');
  assert.equal(
    isWorldPointLandCollision(st.position, env),
    false,
    'Mary Geoise spawn must sit in navigable East ocean right off Red Port Harbor'
  );
  // Heading should point West toward Red Port / Red Line
  const spawnEastProj =
    st.heading.x * env.maryGeoise.east.x +
    st.heading.y * env.maryGeoise.east.y +
    st.heading.z * env.maryGeoise.east.z;
  assert.ok(spawnEastProj < -0.5, `Sunny should face West toward Red Port, got eastProj=${spawnEastProj}`);
  assert.equal(
    isWorldPointLandCollision(env.maryGeoise.origin, env),
    true,
    'Mary Geoise Red Line plateau must register as solid land'
  );
});

test('Sabaody auto-coats Sunny, uncoated plunge is blocked at vortex, coated vortex entry auto-plunges to Fish-Man Island, and New World exit removes coating', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);

  // 1. Spawning at Sabaody starts south of the Coating Quay uncoated; sailing into Sabaody auto-applies Yarukiman coating
  const sabaody = ONE_PIECE_LOCATIONS.find((l) => l.id === 'sabaody')!;
  let sabaodySpawn = createSafeSunnySpawn(sabaody, env, ONE_PIECE_LOCATIONS);
  assert.equal(sabaodySpawn.coated, false, 'Spawning south of Sabaody piers starts uncoated');
  // Standing still at spawn must NOT prematurely coat
  const idleSpawn = stepSunnySailing(
    sabaodySpawn,
    { throttle: 0, steer: 0, boost: false },
    0.05,
    env,
    ONE_PIECE_LOCATIONS
  );
  assert.equal(idleSpawn.coated, false, 'Sunny must sail into Sabaody harbor to get coated');

  for (let i = 0; i < 20; i++) {
    sabaodySpawn = stepSunnySailing(
      sabaodySpawn,
      { throttle: 1, steer: 0, boost: false },
      0.05,
      env,
      ONE_PIECE_LOCATIONS
    );
  }
  assert.equal(sabaodySpawn.coated, true, 'Sailing into Sabaody Groves 40-49 Coating Quay must auto-apply Yarukiman coating');

  // 2. Uncoated Sunny sailing into Subsea Plunge Vortex is deflected with coatingRequiredBlocked = true
  const plungePos = equirectangularToSphere(
    SUBSEA_PLUNGE_GLOBE_COORDS.u,
    SUBSEA_PLUNGE_GLOBE_COORDS.v,
    env.globeRadius
  );
  const up = {
    x: plungePos.x / env.globeRadius,
    y: plungePos.y / env.globeRadius,
    z: plungePos.z / env.globeRadius,
  };
  const uncoatedAtVortex: SunnyState = {
    ...sabaodySpawn,
    coated: false,
    position: plungePos,
    heading: {
      x: env.fishManIsland.east.x - up.x * (env.fishManIsland.east.x * up.x + env.fishManIsland.east.y * up.y + env.fishManIsland.east.z * up.z),
      y: env.fishManIsland.east.y - up.y * (env.fishManIsland.east.x * up.x + env.fishManIsland.east.y * up.y + env.fishManIsland.east.z * up.z),
      z: env.fishManIsland.east.z - up.z * (env.fishManIsland.east.x * up.x + env.fishManIsland.east.y * up.y + env.fishManIsland.east.z * up.z),
    },
    speed: 0.12,
  };
  const blockedStep = stepSunnySailing(
    uncoatedAtVortex,
    { throttle: 1, steer: 0, boost: false },
    0.05,
    env,
    ONE_PIECE_LOCATIONS
  );
  assert.equal(blockedStep.coatingRequiredBlocked, true, 'Uncoated ship at Subsea Plunge Vortex must be blocked');
  assert.equal(blockedStep.skyZone, 'blue-sea', 'Uncoated ship must stay on the Blue Sea surface');

  // 3. Coated Sunny entering the Plunge Vortex automatically triggers subsea-dive and reaches fish-man-island at -FISH_MAN_DEPTH
  let diveState = stepSunnySailing(
    {
      ...uncoatedAtVortex,
      coated: true,
    },
    { throttle: 1, steer: 0, boost: false },
    0.05,
    env,
    ONE_PIECE_LOCATIONS
  );
  assert.equal(diveState.skyZone, 'subsea-dive', 'Entering Plunge Vortex while coated must automatically trigger subsea-dive');

  let enteredLagoon = false;
  for (let i = 0; i < 120; i++) {
    diveState = stepSunnySailing(
      diveState,
      { throttle: 1, steer: 0, boost: false },
      0.05,
      env,
      ONE_PIECE_LOCATIONS
    );
    if (diveState.skyZone === 'fish-man-island') {
      enteredLagoon = true;
      break;
    }
  }
  assert.equal(enteredLagoon, true, 'Coated Subsea Plunge must deliver Sunny into Fish-Man Island Coral Lagoon');
  assert.ok(
    Math.abs(diveState.elevation - -FISH_MAN_DEPTH) < 0.05,
    `Expected Coral Lagoon elevation near -${FISH_MAN_DEPTH}, got ${diveState.elevation}`
  );

  // 4. Safe spawn directly inside Fish-Man Island places Sunny in navigable Coral Lagoon
  const fishManIsland = ONE_PIECE_LOCATIONS.find((l) => l.id === 'fish-man-island')!;
  const lagoonSpawn = createSafeSunnySpawn(fishManIsland, env, ONE_PIECE_LOCATIONS);
  assert.equal(lagoonSpawn.skyZone, 'fish-man-island');
  assert.equal(lagoonSpawn.coated, true);
  assert.equal(lagoonSpawn.collided, false);
  assert.ok(Math.abs(lagoonSpawn.elevation - -FISH_MAN_DEPTH) < 0.05);

  // 5. Resurfacing exits into the New World sea east of Red Line AND strips the Yarukiman coating
  const resurfaced = resurfaceToNewWorld(lagoonSpawn, env, ONE_PIECE_LOCATIONS);
  assert.equal(resurfaced.skyZone, 'blue-sea');
  assert.equal(resurfaced.elevation, 0);
  assert.equal(resurfaced.coated, false, 'Coating must disappear upon exiting to the New World');
  const resUV = worldPosToEquirectangular(resurfaced.position);
  assert.ok(
    Math.abs(resUV.u - FISH_MAN_NEW_WORLD_EXIT_COORDS.u) < 0.02,
    `Expected New World exit near u=${FISH_MAN_NEW_WORLD_EXIT_COORDS.u}, got ${resUV.u}`
  );

  // 6. Sailing south out of the Water-Lock Gate must also resurface to New World with coated === false
  let southExitState: SunnyState = {
    ...lagoonSpawn,
    heading: { ...env.fishManIsland.south },
  };
  let exitedViaGate = false;
  for (let i = 0; i < 80; i++) {
    southExitState = stepSunnySailing(
      southExitState,
      { throttle: 1, steer: 0, boost: true },
      0.05,
      env,
      ONE_PIECE_LOCATIONS
    );
    if (southExitState.skyZone === 'blue-sea') {
      exitedViaGate = true;
      break;
    }
  }
  assert.equal(exitedViaGate, true, 'Sailing south out of Main Entrance Water-Lock must reach the New World');
  assert.equal(southExitState.coated, false, 'Sailing out to the New World must also remove Yarukiman coating');
});

test('Foosha Village spawn & Start Screen framing place Sunny safely off Dawn Island facing Foosha Bay', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  const foosha = ONE_PIECE_LOCATIONS.find((l) => l.id === 'foosha-village')!;
  const fooshaSpawn = createSafeSunnySpawn(foosha, env, ONE_PIECE_LOCATIONS);

  assert.equal(fooshaSpawn.collided, false);
  assert.equal(fooshaSpawn.calmBeltBlocked, false);
  assert.equal(
    isWorldPointLandCollision(fooshaSpawn.position, env),
    false,
    'Foosha Village spawn must be in clear ocean off Foosha Crescent Bay'
  );

  // Heading points westward toward Dawn Island / Foosha Harbor
  const westProj =
    fooshaSpawn.heading.x * env.dawn.east.x +
    fooshaSpawn.heading.y * env.dawn.east.y +
    fooshaSpawn.heading.z * env.dawn.east.z;
  assert.ok(westProj < -0.5, `Expected Sunny heading westward toward Dawn Island, got ${westProj}`);

  const framing = computeTitleScreenSunnyAndCamera(env, 1.2);
  assert.equal(
    isWorldPointLandCollision(framing.sunnyState.position, env),
    false,
    'Start screen Sunny must rest in navigable bay water'
  );
  const camR = Math.hypot(
    framing.cameraPosition.x,
    framing.cameraPosition.y,
    framing.cameraPosition.z
  );
  assert.ok(
    camR > env.globeRadius + SUNNY_WORLD_LENGTH * 0.5,
    'Start screen camera must sit clearly above ocean for a plunging view'
  );
});

test('Sunny struggles to advance and pitches/rolls stronger under thunderstorm clouds than calm clear sea', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  const spawn = createSafeSunnySpawn(null, env, ONE_PIECE_LOCATIONS);
  // Head eastward into open East Blue away from Dawn Island coast
  const startState: SunnyState = {
    ...spawn,
    heading: { ...env.dawn.east },
  };

  let calmState = { ...startState };
  let stormState = { ...startState };
  let maxCalmRoll = 0;
  let maxStormRoll = 0;
  let maxCalmPitch = 0;
  let maxStormPitch = 0;

  for (let i = 0; i < 45; i++) {
    const elapsed = i * 0.05;
    calmState = stepSunnySailing(
      calmState,
      { throttle: 1, steer: 0, boost: false },
      0.05,
      env,
      ONE_PIECE_LOCATIONS,
      { seaRoughness: 0, speedFactor: 1, elapsed }
    );
    stormState = stepSunnySailing(
      stormState,
      { throttle: 1, steer: 0, boost: false },
      0.05,
      env,
      ONE_PIECE_LOCATIONS,
      { seaRoughness: 1, speedFactor: 0.45, elapsed }
    );
    maxCalmRoll = Math.max(maxCalmRoll, Math.abs(calmState.bankAngle));
    maxStormRoll = Math.max(maxStormRoll, Math.abs(stormState.bankAngle));
    maxCalmPitch = Math.max(maxCalmPitch, Math.abs(calmState.pitchAngle));
    maxStormPitch = Math.max(maxStormPitch, Math.abs(stormState.pitchAngle));
  }

  const calmDist = Math.hypot(
    calmState.position.x - startState.position.x,
    calmState.position.y - startState.position.y,
    calmState.position.z - startState.position.z
  );
  const stormDist = Math.hypot(
    stormState.position.x - startState.position.x,
    stormState.position.y - startState.position.y,
    stormState.position.z - startState.position.z
  );

  assert.ok(
    stormDist < calmDist * 0.55,
    `Expected Sunny to struggle forward under storm clouds (storm=${stormDist.toFixed(4)} vs calm=${calmDist.toFixed(4)})`
  );
  assert.ok(maxStormRoll > maxCalmRoll + 0.02, 'Expected stronger rolling under storm clouds');
  assert.ok(maxStormPitch > maxCalmPitch + 0.02, 'Expected stronger pitching under storm clouds');
});

test('Punk Hazard spawns Sunny off western strait mouth facing east while Ice Half and Burning Half collide', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  const phIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === 'punk-hazard');
  assert.ok(phIsland, 'Expected punk-hazard island metadata');

  const spawn = createSafeSunnySpawn(phIsland, env, ONE_PIECE_LOCATIONS);
  assert.equal(isWorldPointLandCollision(spawn.position, env), false);
  assert.equal(spawn.collided, false);

  const phToWorld = (lx: number, lz: number) => {
    const raw = {
      x:
        env.punkHazard.origin.x +
        env.punkHazard.east.x * lx * PUNK_HAZARD_GLOBE_SCALE +
        env.punkHazard.south.x * lz * PUNK_HAZARD_GLOBE_SCALE,
      y:
        env.punkHazard.origin.y +
        env.punkHazard.east.y * lx * PUNK_HAZARD_GLOBE_SCALE +
        env.punkHazard.south.y * lz * PUNK_HAZARD_GLOBE_SCALE,
      z:
        env.punkHazard.origin.z +
        env.punkHazard.east.z * lx * PUNK_HAZARD_GLOBE_SCALE +
        env.punkHazard.south.z * lz * PUNK_HAZARD_GLOBE_SCALE,
    };
    const len = Math.hypot(raw.x, raw.y, raw.z);
    return {
      x: (raw.x / len) * env.globeRadius,
      y: (raw.y / len) * env.globeRadius,
      z: (raw.z / len) * env.globeRadius,
    };
  };

  assert.equal(
    isWorldPointLandCollision(phToWorld(-12, -34), env),
    true,
    'Caesar Lab Ice Half must block Sunny'
  );
  assert.equal(
    isWorldPointLandCollision(phToWorld(18.5, 43.0), env),
    true,
    'Burning Lands volcano must block Sunny'
  );
  assert.equal(
    isWorldPointLandCollision(phToWorld(-2, 2), env),
    false,
    'Central demarcation lake must remain navigable water'
  );
});

test('Dressrosa & Green Bit spawn Sunny safely in navigable ocean while cliffs/islands collide and strait remains open', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  const dressrosaIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === 'dressrosa');
  const greenBitIsland = ONE_PIECE_LOCATIONS.find((i) => i.id === 'green-bit');
  assert.ok(dressrosaIsland, 'Expected dressrosa metadata');
  assert.ok(greenBitIsland, 'Expected green-bit metadata');

  const drsSpawn = createSafeSunnySpawn(dressrosaIsland, env, ONE_PIECE_LOCATIONS);
  assert.equal(isWorldPointLandCollision(drsSpawn.position, env), false);
  assert.equal(drsSpawn.collided, false);

  const gbSpawn = createSafeSunnySpawn(greenBitIsland, env, ONE_PIECE_LOCATIONS);
  assert.equal(isWorldPointLandCollision(gbSpawn.position, env), false);
  assert.equal(gbSpawn.collided, false);

  const drsToWorld = (lx: number, lz: number) => {
    const raw = {
      x:
        env.dressrosa.origin.x +
        env.dressrosa.east.x * lx * DRESSROSA_GLOBE_SCALE +
        env.dressrosa.south.x * lz * DRESSROSA_GLOBE_SCALE,
      y:
        env.dressrosa.origin.y +
        env.dressrosa.east.y * lx * DRESSROSA_GLOBE_SCALE +
        env.dressrosa.south.y * lz * DRESSROSA_GLOBE_SCALE,
      z:
        env.dressrosa.origin.z +
        env.dressrosa.east.z * lx * DRESSROSA_GLOBE_SCALE +
        env.dressrosa.south.z * lz * DRESSROSA_GLOBE_SCALE,
    };
    const len = Math.hypot(raw.x, raw.y, raw.z);
    return {
      x: (raw.x / len) * env.globeRadius,
      y: (raw.y / len) * env.globeRadius,
      z: (raw.z / len) * env.globeRadius,
    };
  };

  assert.equal(
    isWorldPointLandCollision(drsToWorld(-13, 42), env),
    true,
    'Acacia plaza land must block Sunny'
  );
  assert.equal(
    isWorldPointLandCollision(drsToWorld(36, -114), env),
    true,
    'Green Bit jungle island must block Sunny'
  );
  assert.equal(
    isWorldPointLandCollision(drsToWorld(29, -68), env),
    false,
    'Strait beneath Iron Bridge must remain navigable sea water'
  );
  assert.equal(
    isWorldPointLandCollision(drsToWorld(-10, 74), env),
    false,
    'Southern Acacia harbor channel must remain navigable water'
  );
});

test('Totto Land spawns Sunny safely off Whole Cake Harbor, Cacao & Cheese while islands collide and concentric sea stays navigable', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  const wci = ONE_PIECE_LOCATIONS.find((i) => i.id === 'whole-cake-island')!;
  const cacao = ONE_PIECE_LOCATIONS.find((i) => i.id === 'cacao-island')!;
  const cheese = ONE_PIECE_LOCATIONS.find((i) => i.id === 'cheese-island')!;

  const wciSpawn = createSafeSunnySpawn(wci, env, ONE_PIECE_LOCATIONS);
  assert.equal(wciSpawn.collided, false);
  assert.equal(isWorldPointLandCollision(wciSpawn.position, env), false);

  const cacaoSpawn = createSafeSunnySpawn(cacao, env, ONE_PIECE_LOCATIONS);
  assert.equal(cacaoSpawn.collided, false);
  assert.equal(isWorldPointLandCollision(cacaoSpawn.position, env), false);

  const cheeseSpawn = createSafeSunnySpawn(cheese, env, ONE_PIECE_LOCATIONS);
  assert.equal(cheeseSpawn.collided, false);
  assert.equal(isWorldPointLandCollision(cheeseSpawn.position, env), false);

  const tlToWorld = (lx: number, lz: number) => {
    const raw = {
      x:
        env.tottoLand.origin.x +
        env.tottoLand.east.x * lx * TOTTO_LAND_GLOBE_SCALE +
        env.tottoLand.south.x * lz * TOTTO_LAND_GLOBE_SCALE,
      y:
        env.tottoLand.origin.y +
        env.tottoLand.east.y * lx * TOTTO_LAND_GLOBE_SCALE +
        env.tottoLand.south.y * lz * TOTTO_LAND_GLOBE_SCALE,
      z:
        env.tottoLand.origin.z +
        env.tottoLand.east.z * lx * TOTTO_LAND_GLOBE_SCALE +
        env.tottoLand.south.z * lz * TOTTO_LAND_GLOBE_SCALE,
    };
    const len = Math.hypot(raw.x, raw.y, raw.z);
    return {
      x: (raw.x / len) * env.globeRadius,
      y: (raw.y / len) * env.globeRadius,
      z: (raw.z / len) * env.globeRadius,
    };
  };

  assert.equal(
    isWorldPointLandCollision(tlToWorld(22, -14), env),
    true,
    'Whole Cake Chateau plateau must block Sunny'
  );
  assert.equal(
    isWorldPointLandCollision(
      tlToWorld(
        TOTTO_LAND_ISLAND_BY_ID['cacao-island'].x,
        TOTTO_LAND_ISLAND_BY_ID['cacao-island'].z
      ),
      env
    ),
    true,
    'Cacao Island core must block Sunny'
  );
  assert.equal(
    isWorldPointLandCollision(tlToWorld(18, 60), env),
    false,
    'Sweet City crescent harbor channel must remain navigable water'
  );
});

test('Zou spawns Sunny safely at sea facing Zunesha while Zunesha giant legs block Sunny at sea level', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  const zou = ONE_PIECE_LOCATIONS.find((i) => i.id === 'zou')!;
  const zouSpawn = createSafeSunnySpawn(zou, env, ONE_PIECE_LOCATIONS);
  assert.equal(zouSpawn.collided, false);
  assert.equal(isWorldPointLandCollision(zouSpawn.position, env), false);

  const leg = ZUNESHA_LEGS[0];
  const rawLeg = {
    x:
      env.zou.origin.x +
      env.zou.east.x * leg.x * ZOU_GLOBE_SCALE +
      env.zou.south.x * leg.z * ZOU_GLOBE_SCALE,
    y:
      env.zou.origin.y +
      env.zou.east.y * leg.x * ZOU_GLOBE_SCALE +
      env.zou.south.y * leg.z * ZOU_GLOBE_SCALE,
    z:
      env.zou.origin.z +
      env.zou.east.z * leg.x * ZOU_GLOBE_SCALE +
      env.zou.south.z * leg.z * ZOU_GLOBE_SCALE,
  };
  const len = Math.hypot(rawLeg.x, rawLeg.y, rawLeg.z);
  const legSeaPoint = {
    x: (rawLeg.x / len) * env.globeRadius,
    y: (rawLeg.y / len) * env.globeRadius,
    z: (rawLeg.z / len) * env.globeRadius,
  };
  assert.equal(
    isWorldPointLandCollision(legSeaPoint, env),
    true,
    'Zunesha sea-standing leg must register hull collision'
  );
});

test('Wano Kuni spawns Sunny safely off coast while sheer cliffs and Onigashima block Sunny', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  const wano = ONE_PIECE_LOCATIONS.find((i) => i.id === 'wano')!;
  const wanoSpawn = createSafeSunnySpawn(wano, env, ONE_PIECE_LOCATIONS);
  assert.equal(wanoSpawn.collided, false);
  assert.equal(isWorldPointLandCollision(wanoSpawn.position, env), false);

  const wanoToWorld = (lx: number, lz: number) => {
    const raw = {
      x:
        env.wano.origin.x +
        env.wano.east.x * lx * WANO_GLOBE_SCALE +
        env.wano.south.x * lz * WANO_GLOBE_SCALE,
      y:
        env.wano.origin.y +
        env.wano.east.y * lx * WANO_GLOBE_SCALE +
        env.wano.south.y * lz * WANO_GLOBE_SCALE,
      z:
        env.wano.origin.z +
        env.wano.east.z * lx * WANO_GLOBE_SCALE +
        env.wano.south.z * lz * WANO_GLOBE_SCALE,
    };
    const len = Math.hypot(raw.x, raw.y, raw.z);
    return {
      x: (raw.x / len) * env.globeRadius,
      y: (raw.y / len) * env.globeRadius,
      z: (raw.z / len) * env.globeRadius,
    };
  };

  assert.equal(
    isWorldPointLandCollision(wanoToWorld(0, 0), env),
    true,
    'Main Wano fortress cliffs must block Sunny'
  );
  assert.equal(
    isWorldPointLandCollision(
      wanoToWorld(WANO_ONIGASHIMA_CENTER.x, WANO_ONIGASHIMA_CENTER.z),
      env
    ),
    true,
    'Onigashima skull island must block Sunny'
  );
});

test('Egghead spawns Sunny safely off futuristic SE harbor while cliffs and armored piers block Sunny', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  const egghead = ONE_PIECE_LOCATIONS.find((i) => i.id === 'egghead-island')!;
  const eggSpawn = createSafeSunnySpawn(egghead, env, ONE_PIECE_LOCATIONS);
  assert.equal(eggSpawn.collided, false);
  assert.equal(isWorldPointLandCollision(eggSpawn.position, env), false);

  const eggToWorld = (lx: number, lz: number) => {
    const raw = {
      x:
        env.egghead.origin.x +
        env.egghead.east.x * lx * 0.0022 +
        env.egghead.south.x * lz * 0.0022,
      y:
        env.egghead.origin.y +
        env.egghead.east.y * lx * 0.0022 +
        env.egghead.south.y * lz * 0.0022,
      z:
        env.egghead.origin.z +
        env.egghead.east.z * lx * 0.0022 +
        env.egghead.south.z * lz * 0.0022,
    };
    const len = Math.hypot(raw.x, raw.y, raw.z);
    return {
      x: (raw.x / len) * env.globeRadius,
      y: (raw.y / len) * env.globeRadius,
      z: (raw.z / len) * env.globeRadius,
    };
  };

  assert.equal(
    isWorldPointLandCollision(eggToWorld(0, 0), env),
    true,
    'Egghead central island core must block Sunny'
  );
  assert.equal(
    isWorldPointLandCollision(eggToWorld(7.5, 46.5), env),
    true,
    'Egghead armored harbor pier must block Sunny'
  );
  assert.equal(
    isWorldPointLandCollision(eggToWorld(18, 45), env),
    false,
    'Egghead futuristic harbor cove channel must remain navigable'
  );
});

test('Elbaf spawns Sunny safely off Viking fjord harbor while cliffs and dragon piers block Sunny', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  const elbaf = ONE_PIECE_LOCATIONS.find((i) => i.id === 'elbaf')!;
  const elbafSpawn = createSafeSunnySpawn(elbaf, env, ONE_PIECE_LOCATIONS);
  assert.equal(elbafSpawn.collided, false);
  assert.equal(isWorldPointLandCollision(elbafSpawn.position, env), false);

  const elbafToWorld = (lx: number, lz: number) => {
    const raw = {
      x:
        env.elbaf.origin.x +
        env.elbaf.east.x * lx * 0.0021 +
        env.elbaf.south.x * lz * 0.0021,
      y:
        env.elbaf.origin.y +
        env.elbaf.east.y * lx * 0.0021 +
        env.elbaf.south.y * lz * 0.0021,
      z:
        env.elbaf.origin.z +
        env.elbaf.east.z * lx * 0.0021 +
        env.elbaf.south.z * lz * 0.0021,
    };
    const len = Math.hypot(raw.x, raw.y, raw.z);
    return {
      x: (raw.x / len) * env.globeRadius,
      y: (raw.y / len) * env.globeRadius,
      z: (raw.z / len) * env.globeRadius,
    };
  };

  assert.equal(
    isWorldPointLandCollision(elbafToWorld(0, 0), env),
    true,
    'Elbaf central island & Adam root base must block Sunny'
  );
  assert.equal(
    isWorldPointLandCollision(elbafToWorld(4.0, 61.5), env),
    true,
    'Elbaf Viking breakwater pier must block Sunny'
  );
  assert.equal(
    isWorldPointLandCollision(elbafToWorld(16, 62), env),
    false,
    'Elbaf Viking fjord harbor mouth channel must remain navigable'
  );
});

test('Coup de Burst lasts 3 seconds, transitions to a 5-second cooldown, and blocks re-trigger until cooldown completes', () => {
  let boost = createInitialSunnyBoostState();
  assert.equal(canTriggerSunnyBoost(boost), true);

  const firstTrigger = triggerSunnyBoost(boost);
  assert.equal(firstTrigger.triggered, true);
  boost = firstTrigger.next;
  assert.equal(boost.activeRemainingSec, COUP_DE_BURST_DURATION_SEC);
  assert.equal(boost.cooldownRemainingSec, 0);
  assert.equal(canTriggerSunnyBoost(boost), false);

  // Re-trigger while active must fail cleanly
  const whileActive = triggerSunnyBoost(boost);
  assert.equal(whileActive.triggered, false);

  // Step 2.5s -> still 0.5s active
  boost = stepSunnyBoostState(boost, 2.5);
  assert.ok(Math.abs(boost.activeRemainingSec - 0.5) < 1e-6);
  assert.equal(boost.cooldownRemainingSec, 0);

  // Step 1.0s -> 0.5s active finishes, 0.5s overshoot carries into 5s cooldown (4.5s remaining)
  boost = stepSunnyBoostState(boost, 1.0);
  assert.equal(boost.activeRemainingSec, 0);
  assert.ok(Math.abs(boost.cooldownRemainingSec - (COUP_DE_BURST_COOLDOWN_SEC - 0.5)) < 1e-6);
  assert.equal(canTriggerSunnyBoost(boost), false);

  // Re-trigger during cooldown must fail cleanly
  const whileCooldown = triggerSunnyBoost(boost);
  assert.equal(whileCooldown.triggered, false);

  // Step remaining 4.5s -> ready again
  boost = stepSunnyBoostState(boost, 4.5);
  assert.equal(boost.activeRemainingSec, 0);
  assert.equal(boost.cooldownRemainingSec, 0);
  assert.equal(canTriggerSunnyBoost(boost), true);
  assert.equal(triggerSunnyBoost(boost).triggered, true);
});

test('Sunny never sails in reverse and Coup de Burst propels forward without throttle held', () => {
  const env = createDefaultSunnyCollisionEnv(10, () => 0);
  let state = createSafeSunnySpawn(null, env, ONE_PIECE_LOCATIONS);
  const startPos = { ...state.position };

  for (let i = 0; i < 20; i++) {
    state = stepSunnySailing(
      state,
      { throttle: -1, steer: 0, boost: false },
      0.05,
      env,
      ONE_PIECE_LOCATIONS
    );
  }
  assert.equal(state.speed, 0, 'Negative throttle must never accelerate Sunny backwards');
  const distAfterReverseInput = Math.hypot(
    state.position.x - startPos.x,
    state.position.y - startPos.y,
    state.position.z - startPos.z
  );
  assert.ok(distAfterReverseInput < 1e-5, 'Sunny must stay stationary when reverse is pressed');

  let burstState = state;
  for (let i = 0; i < 15; i++) {
    burstState = stepSunnySailing(
      burstState,
      { throttle: 0, steer: 0, boost: true },
      0.05,
      env,
      ONE_PIECE_LOCATIONS
    );
  }
  assert.ok(burstState.speed > 0.15, 'Coup de Burst must propel Sunny forward automatically');
});

test('computeSunnyWakeMetrics hides wakes off water and scales trailing foam & bow water smoothly with speed and Coup de Burst', () => {
  for (const skyZone of ['balloon-glide', 'knock-up-stream', 'subsea-dive'] as const) {
    const hidden = computeSunnyWakeMetrics({ speed: 0.1, skyZone });
    assert.equal(hidden.visible, false, `Wake should be hidden during ${skyZone}`);
    assert.equal(hidden.wakeIntensity, 0);
    assert.equal(hidden.bowIntensity, 0);
    assert.equal(hidden.flowRate, 0);
  }

  const idle = computeSunnyWakeMetrics({ speed: 0, skyZone: 'blue-sea', waveCrest: 0.5 });
  const cruising = computeSunnyWakeMetrics({ speed: 0.085, skyZone: 'blue-sea', waveCrest: 0.5 });
  const bursting = computeSunnyWakeMetrics({
    speed: 0.22,
    boostActive: true,
    skyZone: 'blue-sea',
    waveCrest: 0.5,
  });
  const skypieaCruise = computeSunnyWakeMetrics({ speed: 0.085, skyZone: 'skypiea', waveCrest: 0.5 });

  assert.equal(idle.visible, true);
  assert.equal(skypieaCruise.visible, true);
  assert.ok(idle.bowIntensity > 0 && idle.bowIntensity < cruising.bowIntensity);
  assert.ok(cruising.wakeIntensity > idle.wakeIntensity);
  assert.ok(cruising.trailLengthScale > idle.trailLengthScale);
  assert.ok(cruising.trailWidthScale > idle.trailWidthScale);
  assert.ok(cruising.flowRate > idle.flowRate);

  assert.equal(bursting.boostIntensity, 1);
  assert.ok(bursting.wakeIntensity >= cruising.wakeIntensity);
  assert.ok(bursting.bowIntensity >= cruising.bowIntensity);
  assert.ok(bursting.trailLengthScale > cruising.trailLengthScale);
  assert.ok(bursting.flowRate > cruising.flowRate);
});



