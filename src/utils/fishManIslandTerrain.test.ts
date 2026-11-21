import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FISH_MAN_CAMERA_PRESETS,
  FISH_MAN_DEPTH,
  FISH_MAN_GLOBE_CENTER,
  FISH_MAN_GLOBE_SCALE,
  FISH_MAN_LANDMARKS,
  FISH_MAN_MAIN_BUBBLE_RADIUS,
  FISH_MAN_RYUGU_BUBBLE_CENTER,
  FISH_MAN_RYUGU_BUBBLE_RADIUS,
  SUBSEA_PLUNGE_GLOBE_COORDS,
  buildFishManBubbleVillas,
  buildFishManBuildings,
  buildFishManCorals,
  buildFishManSeaKings,
  buildFishManShipwrecks,
  buildFishManWaterArches,
  isNavigableFishManWater,
  sampleFishManCameraFloorHeight,
  sampleFishManHeight,
  sampleFishManWalkSurfaceHeight,
  toFishManSphereLocal,
} from './fishManIslandTerrain';
import { MARY_GEOISE_ALTITUDE, MARY_GEOISE_GLOBE_CENTER } from './maryGeoiseTerrain';
import { SABAODY_GLOBE_CENTER } from './sabaodyTerrain';

test('Fish-Man Island lies directly beneath Mary Geoise at symmetric -10,000m depth and plunge vortex sits beside Sabaody', () => {
  assert.equal(FISH_MAN_GLOBE_CENTER.u, MARY_GEOISE_GLOBE_CENTER.u);
  assert.equal(FISH_MAN_GLOBE_CENTER.v, MARY_GEOISE_GLOBE_CENTER.v);
  assert.equal(FISH_MAN_DEPTH, MARY_GEOISE_ALTITUDE);
  assert.ok(
    SUBSEA_PLUNGE_GLOBE_COORDS.u > SABAODY_GLOBE_CENTER.u &&
      SUBSEA_PLUNGE_GLOBE_COORDS.u < SABAODY_GLOBE_CENTER.u + 0.01,
    'Plunge vortex must sit right beside Sabaody on the Paradise side'
  );
  assert.ok(
    Math.abs(SUBSEA_PLUNGE_GLOBE_COORDS.v - SABAODY_GLOBE_CENTER.v) < 0.01
  );
});

test('Spherical local projection keeps cavern floor and Ryugu Palace below ocean surface (r < 10)', () => {
  const floor = toFishManSphereLocal(0, 0, 0, 10);
  const floorR = Math.hypot(floor.x, floor.y + (10 - FISH_MAN_DEPTH), floor.z);
  assert.ok(Math.abs(floorR - (10 - FISH_MAN_DEPTH)) < 1e-4);

  const palace = toFishManSphereLocal(
    FISH_MAN_LANDMARKS.ryuguPalace.x,
    FISH_MAN_RYUGU_BUBBLE_CENTER.y + FISH_MAN_RYUGU_BUBBLE_RADIUS,
    FISH_MAN_LANDMARKS.ryuguPalace.z,
    10
  );
  const palaceTopR = Math.hypot(palace.x, palace.y + (10 - FISH_MAN_DEPTH), palace.z);
  assert.ok(
    palaceTopR < 9.65,
    `Expected upper Ryugu bubble crown well below ocean sphere (r < 9.65), got ${palaceTopR}`
  );
});

test('Navigable Coral Lagoon connects Water-Lock Gate to Mermaid Cove and Fish Bus Stop while hills stay solid', () => {
  assert.equal(
    isNavigableFishManWater(
      FISH_MAN_LANDMARKS.mainEntranceGate.x,
      FISH_MAN_LANDMARKS.mainEntranceGate.z
    ),
    true
  );
  assert.equal(
    isNavigableFishManWater(
      FISH_MAN_LANDMARKS.coralLagoonEntry.x,
      FISH_MAN_LANDMARKS.coralLagoonEntry.z
    ),
    true
  );
  assert.ok(
    sampleFishManHeight(
      FISH_MAN_LANDMARKS.coralLagoonEntry.x,
      FISH_MAN_LANDMARKS.coralLagoonEntry.z
    ) < -1.0
  );

  // Coral Hills, Gyoncorde Plaza & Crimin Boutique sit above water
  assert.ok(
    sampleFishManHeight(FISH_MAN_LANDMARKS.coralHills.x, FISH_MAN_LANDMARKS.coralHills.z) > 5.0
  );
  assert.ok(
    sampleFishManHeight(
      FISH_MAN_LANDMARKS.gyoncordePlaza.x,
      FISH_MAN_LANDMARKS.gyoncordePlaza.z
    ) > 5.5
  );
  assert.ok(sampleFishManHeight(130, 80) < -8.0, 'Outer abyssal seabed must drop deep');
});

test('Ryugu coral staircase and Ryugu floor clamp work cleanly inside cavern', () => {
  const stairMid = sampleFishManWalkSurfaceHeight(0, -16);
  assert.ok(stairMid > 40, `Expected rising coral staircase at z=-16, got ${stairMid}`);

  const upperDeck = sampleFishManCameraFloorHeight(
    FISH_MAN_LANDMARKS.ryuguPalace.x,
    FISH_MAN_LANDMARKS.ryuguPalace.z,
    120
  );
  assert.ok(upperDeck >= 110);

  const lowerCoralFloor = sampleFishManCameraFloorHeight(0, 12, 18);
  assert.ok(lowerCoralFloor < 20, 'Coral City floor must not snap up to Ryugu deck');
});

test('Procedural Fish-Man Island assets and camera presets are valid and inside cavern bounds', () => {
  const buildings = buildFishManBuildings();
  assert.ok(buildings.length >= 20);
  assert.ok(buildings.some((b) => b.id === 'crimin-boutique' && b.spotted));
  assert.ok(buildings.some((b) => b.id === 'candy-factory'));

  const corals = buildFishManCorals();
  assert.ok(corals.length >= 60);
  assert.ok(corals.some((c) => c.emissive && c.kind === 'glow-coral'));

  assert.ok(buildFishManBubbleVillas().length >= 4);
  assert.ok(buildFishManWaterArches().length >= 5);
  assert.ok(buildFishManShipwrecks().length >= 3);
  assert.ok(buildFishManSeaKings().length >= 3);
  assert.ok(FISH_MAN_MAIN_BUBBLE_RADIUS >= 80);

  assert.equal(FISH_MAN_CAMERA_PRESETS.length, 8);
  for (const preset of FISH_MAN_CAMERA_PRESETS) {
    const [px, py, pz] = preset.position;
    assert.ok(py >= -15 && py <= 180, `Preset ${preset.id} height ${py} must fit inside cavern`);
    assert.ok(Math.hypot(px, pz) <= 220, `Preset ${preset.id} radius out of bounds`);
    assert.ok(FISH_MAN_GLOBE_SCALE > 0);
  }
});
