import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import {
  ZOU_ANGULAR_MASK_RADIUS,
  ZOU_BACK_DECK_Y,
  ZOU_CAMERA_PRESETS,
  ZOU_GLOBE_CENTER,
  ZOU_GLOBE_SCALE,
  ZOU_LANDMARKS,
  ZOU_MONOLITHS,
  ZUNESHA_LEGS,
  angularDistanceToZou,
  isPointInsideRavagedSector,
  sampleZouHeight,
  sampleZouWalkSurfaceHeight,
  sampleZouZone,
  toZouSphereLocal,
  zouPlateauSignedDist,
  zouSeaLegSignedDist,
} from './zouTerrain';

describe('Zou & Zunesha terrain geometry', () => {
  it('keeps Zou angular mask clear of neighboring charted islands', () => {
    const others = ONE_PIECE_LOCATIONS.filter((loc) => loc.id !== 'zou');
    for (const loc of others) {
      const ang = angularDistanceToZou(loc.u, loc.v);
      assert.ok(
        ang > ZOU_ANGULAR_MASK_RADIUS * 1.4,
        `Expected ${loc.id} (${ang.toFixed(4)} rad) to stay clear of Zou mask (${ZOU_ANGULAR_MASK_RADIUS} rad)`
      );
    }
  });

  it('suspends the Mokomo plateau high atop Zunesha above sea level', () => {
    const sea = sampleZouHeight(ZOU_LANDMARKS.sunnySpawnSea.x, ZOU_LANDMARKS.sunnySpawnSea.z);
    assert.equal(sea, 0);
    assert.ok(zouSeaLegSignedDist(ZOU_LANDMARKS.sunnySpawnSea.x, ZOU_LANDMARKS.sunnySpawnSea.z) > 10);

    const plazaY = sampleZouHeight(ZOU_LANDMARKS.mokomoPlaza.x, ZOU_LANDMARKS.mokomoPlaza.z);
    const citadelY = sampleZouWalkSurfaceHeight(ZOU_LANDMARKS.citadel.x, ZOU_LANDMARKS.citadel.z);
    const whaleHillY = sampleZouHeight(ZOU_LANDMARKS.whaleTree.x, ZOU_LANDMARKS.whaleTree.z);

    assert.ok(plazaY >= ZOU_BACK_DECK_Y, `Mokomo plaza (${plazaY}) should sit on Zunesha back`);
    assert.ok(citadelY > plazaY, `Citadel (${citadelY}) should rise above Mokomo plaza (${plazaY})`);
    assert.ok(whaleHillY > plazaY + 8, `Whale Tree hill (${whaleHillY}) should crown the island`);
  });

  it('classifies zones cleanly across Citadel, Mokomo city, Whale Forest, Ravaged sector, and 4 Zunesha legs', () => {
    assert.equal(sampleZouZone(0, -2), 'citadel');
    assert.equal(sampleZouZone(0, 14), 'mokomo-city');
    assert.equal(sampleZouZone(0, -20), 'whale-forest');
    assert.equal(sampleZouZone(ZOU_LANDMARKS.ravagedQuarter.x, ZOU_LANDMARKS.ravagedQuarter.z), 'ravaged-district');
    assert.ok(isPointInsideRavagedSector(ZOU_LANDMARKS.ravagedQuarter.x, ZOU_LANDMARKS.ravagedQuarter.z));

    assert.equal(ZUNESHA_LEGS.length, 4);
    for (const leg of ZUNESHA_LEGS) {
      assert.ok(zouSeaLegSignedDist(leg.x, leg.z) < 0, `Leg ${leg.id} must register ocean collision`);
      assert.ok(zouPlateauSignedDist(leg.x, leg.z) <= 8);
    }
    assert.ok(ZOU_MONOLITHS.length >= 6);
  });

  it('maps street-view camera presets cleanly above walkable terrain and computes spherical elevation', () => {
    for (const preset of ZOU_CAMERA_PRESETS) {
      const [px, py, pz] = preset.position;
      if (preset.isStreetView) {
        const floor = sampleZouWalkSurfaceHeight(px, pz);
        assert.ok(
          py >= floor + 1.2,
          `Street-view preset ${preset.id} y=${py} must stay above floor=${floor}`
        );
      }
      const sp = toZouSphereLocal(px, py, pz, 10.0);
      const radial = Math.hypot(sp.x, 10.0 + sp.y, sp.z);
      assert.ok(
        Math.abs(radial - (10.0 + py * ZOU_GLOBE_SCALE)) < 1e-4,
        `toZouSphereLocal must preserve radial altitude for ${preset.id}`
      );
    }

    assert.equal(ZOU_GLOBE_CENTER.u, 0.258);
    assert.equal(ZOU_GLOBE_CENTER.v, 0.558);
  });
});
