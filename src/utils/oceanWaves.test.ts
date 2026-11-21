import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OCEAN_SEA_LEVEL_OFFSET,
  getEffectiveOceanRadius,
  sampleOceanWaveSurface,
} from './oceanWaves';

test('getEffectiveOceanRadius raises sea level slightly above base globe radius', () => {
  const baseR = 10;
  const effectiveR = getEffectiveOceanRadius(baseR);
  assert.ok(OCEAN_SEA_LEVEL_OFFSET > 0.0002);
  assert.ok(OCEAN_SEA_LEVEL_OFFSET < 0.002);
  assert.equal(effectiveR, baseR + OCEAN_SEA_LEVEL_OFFSET);
});

test('sampleOceanWaveSurface oscillates over time and produces realistic wave slopes', () => {
  const unitPos = { x: 0.65, y: 0.45, z: -0.61 };
  const len = Math.hypot(unitPos.x, unitPos.y, unitPos.z);
  const n = { x: unitPos.x / len, y: unitPos.y / len, z: unitPos.z / len };
  const heading = { x: -n.z, y: 0, z: n.x };
  const hLen = Math.hypot(heading.x, heading.y, heading.z);
  const fwd = { x: heading.x / hLen, y: heading.y / hLen, z: heading.z / hLen };
  const right = {
    x: fwd.y * n.z - fwd.z * n.y,
    y: fwd.z * n.x - fwd.x * n.z,
    z: fwd.x * n.y - fwd.y * n.x,
  };

  let minH = Infinity;
  let maxH = -Infinity;
  let maxAbsPitch = 0;
  let maxAbsRoll = 0;
  for (let t = 0; t <= 6; t += 0.25) {
    const sample = sampleOceanWaveSurface(n, t, 0.25, 0, fwd, right);
    minH = Math.min(minH, sample.waveHeight);
    maxH = Math.max(maxH, sample.waveHeight);
    maxAbsPitch = Math.max(maxAbsPitch, Math.abs(sample.pitchSlope));
    maxAbsRoll = Math.max(maxAbsRoll, Math.abs(sample.rollSlope));
    assert.ok(sample.crestFactor >= 0 && sample.crestFactor <= 1);
  }

  assert.ok(maxH - minH > 0.00025, 'Expected visible wave amplitude oscillation');
  assert.ok(maxAbsPitch > 0.015 && maxAbsPitch <= 0.095);
  assert.ok(maxAbsRoll > 0.01 && maxAbsRoll <= 0.075);
});

test('Calm Belt dampens ocean waves dramatically and higher cloud cover amplifies swells', () => {
  const n = { x: 0, y: 0.35, z: 0.9367 };
  const clearSea = sampleOceanWaveSurface(n, 1.2, 0.1, 0);
  const stormySea = sampleOceanWaveSurface(n, 1.2, 0.9, 0);
  const calmBeltSea = sampleOceanWaveSurface(n, 1.2, 0.9, 1);

  assert.ok(
    Math.abs(stormySea.waveHeight) > Math.abs(clearSea.waveHeight),
    'Cloudy/stormy weather should amplify sea swell height'
  );
  assert.ok(
    Math.abs(calmBeltSea.waveHeight) < Math.abs(stormySea.waveHeight) * 0.2,
    'Calm Belt should strongly dampen ocean waves'
  );
});

test('sea is very calm with no cloud overhead and escalates sharply beneath heavier cloud types', () => {
  const n = { x: 0.42, y: 0.51, z: -0.75 };
  const h = { x: -n.z, y: 0, z: n.x };
  const hL = Math.hypot(h.x, h.y, h.z);
  const fwd = { x: h.x / hL, y: h.y / hL, z: h.z / hL };
  const right = {
    x: fwd.y * n.z - fwd.z * n.y,
    y: fwd.z * n.x - fwd.x * n.z,
    z: fwd.x * n.y - fwd.y * n.x,
  };

  const peakStats = (roughness: number) => {
    let maxH = 0;
    let maxPitch = 0;
    let maxRoll = 0;
    for (let t = 0; t <= 4; t += 0.2) {
      const s = sampleOceanWaveSurface(n, t, 0.2, 0, fwd, right, roughness);
      maxH = Math.max(maxH, Math.abs(s.waveHeight));
      maxPitch = Math.max(maxPitch, Math.abs(s.pitchSlope));
      maxRoll = Math.max(maxRoll, Math.abs(s.rollSlope));
    }
    return { maxH, maxPitch, maxRoll };
  };

  const clear = peakStats(0);
  const gray = peakStats(0.52);
  const rain = peakStats(0.8);
  const storm = peakStats(1.0);

  assert.ok(clear.maxPitch < 0.015, `Clear sea should be very calm, got maxPitch=${clear.maxPitch}`);
  assert.ok(gray.maxH > clear.maxH * 6);
  assert.ok(rain.maxH > gray.maxH * 1.4);
  assert.ok(storm.maxH > rain.maxH * 1.2);
  assert.ok(storm.maxPitch > clear.maxPitch * 10);
  assert.ok(storm.maxRoll > clear.maxRoll * 10);
});
