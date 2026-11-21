import test from 'node:test';
import assert from 'node:assert/strict';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import {
  WANO_ANGULAR_MASK_RADIUS,
  WANO_CAMERA_PRESETS,
  WANO_CANAL_WATER_Y,
  WANO_LANDMARKS,
  WANO_ONIGASHIMA_CENTER,
  WANO_PLATEAU_Y,
  WANO_RIM_Y,
  WANO_SUB_LOCATIONS,
  angularDistanceToWano,
  sampleWanoHeight,
  sampleWanoWalkSurfaceHeight,
  sampleWanoZone,
  toWanoSphereLocal,
  wanoCliffSignedDist,
} from './wanoTerrain';

test('Wano Kuni terrain geometry & navigation invariants', async (t) => {
  await t.test('keeps Wano angular mask clear of neighboring non-Wano charted islands', () => {
    const externalNeighbors = ONE_PIECE_LOCATIONS.filter(
      (loc) => !(loc.id in WANO_SUB_LOCATIONS)
    );
    for (const loc of externalNeighbors) {
      const ang = angularDistanceToWano(loc.u, loc.v);
      assert.ok(
        ang > WANO_ANGULAR_MASK_RADIUS + 0.08,
        `Non-Wano island ${loc.id} is too close to Wano (${ang.toFixed(4)} rad)`
      );
    }
  });

  await t.test('elevates outer mountain rim, inland sea, 6 provinces, Mt. Fuji, and Onigashima atop Wano mountain', () => {
    const capitalH = sampleWanoHeight(
      WANO_LANDMARKS.flowerCapital.x,
      WANO_LANDMARKS.flowerCapital.z
    );
    const fujiPeakH = sampleWanoHeight(
      WANO_LANDMARKS.mountFuji.x,
      WANO_LANDMARKS.mountFuji.z
    );
    const oniPeakH = sampleWanoHeight(
      WANO_ONIGASHIMA_CENTER.x,
      WANO_ONIGASHIMA_CENTER.z - 1.5
    );
    const westRimH = sampleWanoHeight(-84, -2);
    const farSeaH = sampleWanoHeight(
      WANO_LANDMARKS.sunnySpawnSea.x,
      WANO_LANDMARKS.sunnySpawnSea.z
    );

    assert.ok(
      capitalH >= WANO_PLATEAU_Y - 1.5,
      `Flower Capital must sit atop elevated plateau (~26m), got ${capitalH}`
    );
    assert.ok(
      fujiPeakH > 72,
      `Mt. Fuji of Wano summit must tower high (>72m), got ${fujiPeakH}`
    );
    assert.ok(
      oniPeakH > WANO_CANAL_WATER_Y + 2.0,
      `Onigashima must sit atop the elevated mountain inland bay (>${WANO_CANAL_WATER_Y + 2}), got ${oniPeakH}`
    );
    assert.ok(
      westRimH >= WANO_RIM_Y - 1.0,
      `Outer jagged mountain rim must enclose the inland sea (>=${WANO_RIM_Y - 1}), got ${westRimH}`
    );
    assert.ok(farSeaH <= 0, `Spawn ocean must be at sea level, got ${farSeaH}`);
    assert.ok(
      wanoCliffSignedDist(
        WANO_LANDMARKS.sunnySpawnSea.x,
        WANO_LANDMARKS.sunnySpawnSea.z
      ) > 15,
      'Sunny spawn position must remain comfortably outside cliff collision'
    );
  });

  await t.test('surrounds all 6 provinces and Onigashima with an elevated mountaintop inland sea moat and water straits', () => {
    // Moat points between each outer island and the enclosing mountain cliff rim
    const moatSamples: [number, number, string][] = [
      [-74, -10, 'west moat outside Kuri'],
      [0, -45, 'north moat behind Mt. Fuji'],
      [70, -18, 'east moat outside Ringo'],
      [70, 10, 'east moat outside Hakumai'],
      [-45, 36, 'SW southern bay between Kuri and rim'],
      [42, 34, 'SE southern bay between Hakumai and rim'],
      [0, 48, 'bay channel between Onigashima and waterfall lip'],
    ];
    for (const [mx, mz, label] of moatSamples) {
      assert.equal(sampleWanoZone(mx, mz), 'inland-sea', `Expected inland-sea at ${label}`);
      const bedH = sampleWanoHeight(mx, mz);
      assert.ok(
        bedH > 17.0 && bedH < WANO_CANAL_WATER_Y,
        `Inland sea bed at ${label} should sit high above ocean yet below water level (${bedH})`
      );
    }

    // Straits separating neighboring islands atop the mountain
    const straitSamples: [number, number, string][] = [
      [-39, -15, 'Kuri-Kibi/Udon strait'],
      [-24, -12, 'Kibi-Udon strait'],
      [18.5, -20, 'FlowerCapital-Ringo strait'],
      [38, -5.5, 'Ringo-Hakumai strait'],
      [0, 17, 'North bay separating Udon/Hakumai from Onigashima'],
    ];
    for (const [sx, sz, label] of straitSamples) {
      assert.equal(sampleWanoZone(sx, sz), 'inland-sea', `Expected water strait at ${label}`);
    }
  });

  await t.test('classifies all 6 Wano regions, Mt. Fuji, Sakura canal, inland sea, cliffs, and Onigashima', () => {
    assert.equal(sampleWanoZone(1.5, -8.0), 'river-canal');
    assert.equal(sampleWanoZone(5.0, -12.0), 'flower-capital');
    assert.equal(sampleWanoZone(1.5, -26.5), 'mount-fuji');
    assert.equal(sampleWanoZone(-54.5, -9.0), 'kuri');
    assert.equal(sampleWanoZone(-23.5, 2.0), 'udon');
    assert.equal(sampleWanoZone(-25.0, -26.5), 'kibi');
    assert.equal(sampleWanoZone(42.0, -21.0), 'ringo');
    assert.equal(sampleWanoZone(37.0, 7.0), 'hakumai');
    assert.equal(sampleWanoZone(0, 33.5), 'onigashima');
    assert.equal(sampleWanoZone(-84, -2), 'sea-cliff');
    assert.equal(
      sampleWanoZone(
        WANO_LANDMARKS.sunnySpawnSea.x,
        WANO_LANDMARKS.sunnySpawnSea.z
      ),
      'sea'
    );
  });

  await t.test('keeps all street-view camera presets cleanly above walkable terrain', () => {
    for (const preset of WANO_CAMERA_PRESETS) {
      const sp = toWanoSphereLocal(
        preset.position[0],
        preset.position[1],
        preset.position[2],
        10
      );
      assert.ok(sp.y > 0, `Preset ${preset.id} must sit above ocean sphere`);
      if (preset.isStreetView) {
        const ground = sampleWanoWalkSurfaceHeight(
          preset.position[0],
          preset.position[2]
        );
        assert.ok(
          preset.position[1] > ground + 2.0,
          `Street preset ${preset.id} (${preset.position[1]}) must stay above ground (${ground})`
        );
      }
    }
  });
});
