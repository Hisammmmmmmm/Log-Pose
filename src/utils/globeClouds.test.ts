import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_WEATHER_SPECS,
  GLOBE_CLOUD_ALTITUDE_MAX,
  GLOBE_CLOUD_ALTITUDE_MIN,
  MAX_SHADOW_CLOUD_UNIFORMS,
  computeLocalNavigationSunDir,
  computeStormLightningIntensity,
  computeTotalCloudSurfaceArea,
  generateGlobeClouds,
  sampleCloudShadowAtPoint,
  sampleCloudWeatherUnderPoint,
  stepGlobeClouds,
  type ActiveCloudTransform,
  type CloudShadowParamVec4,
  type CloudShadowVec4,
  type CloudWeatherType,
} from './globeClouds';
import { SKYPIEA_ALTITUDE } from './skypieaTerrain';
import { equirectangularToSphere } from './globeMath';
import { DAWN_GLOBE_CENTER } from './dawnTerrain';

test('all globe clouds cover ~5x more surface area, include all 5 weather types, and stay below Skypiea', () => {
  const clouds = generateGlobeClouds();
  assert.ok(clouds.length >= 400, `Expected expanded cloud count >= 400, got ${clouds.length}`);

  // Original baseline ~216 clouds had ~74 sq-units total disk area; 5x target >= 370
  const totalArea = computeTotalCloudSurfaceArea(clouds);
  assert.ok(
    totalArea >= 370,
    `Expected >= 5x surface area (>= 370), got ${totalArea.toFixed(1)}`
  );

  const typeCounts: Record<CloudWeatherType, number> = {
    cumulus: 0,
    gray: 0,
    rain: 0,
    storm: 0,
    snow: 0,
  };
  const lowCoverTypes = new Set<CloudWeatherType>();

  for (const c of clouds) {
    typeCounts[c.weatherType]++;
    if (c.coverThreshold <= 0.16) {
      lowCoverTypes.add(c.weatherType);
    }
    assert.ok(c.altitude >= GLOBE_CLOUD_ALTITUDE_MIN);
    assert.ok(c.altitude <= GLOBE_CLOUD_ALTITUDE_MAX);
    let maxYOffset = 0;
    for (const p of c.puffs) {
      maxYOffset = Math.max(maxYOffset, (p.oy + p.sy * 0.5) * c.heightScale);
    }
    const cloudCrestAlt = c.altitude + maxYOffset;
    assert.ok(
      cloudCrestAlt < SKYPIEA_ALTITUDE - 0.03,
      `Cloud #${c.id} crest (${cloudCrestAlt}) must stay strictly below Skypiea (${SKYPIEA_ALTITUDE})`
    );
    assert.ok(c.puffs.length >= 5, 'Each cloud should be multi-puff sculpted');
  }

  for (const t of ['cumulus', 'gray', 'rain', 'storm', 'snow'] as const) {
    assert.ok(typeCounts[t] >= 25, `Expected plenty of ${t} clouds, got ${typeCounts[t]}`);
    assert.ok(lowCoverTypes.has(t), `Expected ${t} clouds present even at default 20% cloud cover`);
  }
});

test('progressive cloud types cast stronger shadows and stir the sea underneath', () => {
  const p = { x: 0, y: 10, z: 0 };
  const sunDir = { x: 0, y: 1, z: 0 };

  const order: CloudWeatherType[] = ['cumulus', 'gray', 'snow', 'rain', 'storm'];
  const litValues: number[] = [];
  const roughValues: number[] = [];
  const speedValues: number[] = [];

  for (const wt of order) {
    const spec = CLOUD_WEATHER_SPECS[wt];
    const shadowClouds: CloudShadowVec4[] = [{ x: 0, y: 10.3, z: 0, w: 0.45 }];
    const shadowParams: CloudShadowParamVec4[] = [
      {
        x: spec.shadowStrength,
        y: spec.seaRoughness,
        z: spec.code,
        w: wt === 'storm' ? 0.85 : 0,
      },
    ];
    litValues.push(
      sampleCloudShadowAtPoint(p, sunDir, shadowClouds, 1, 0.56, shadowParams)
    );
    const weather = sampleCloudWeatherUnderPoint(p, shadowClouds, shadowParams, 1, 10);
    roughValues.push(weather.seaRoughness);
    speedValues.push(weather.speedFactor);
  }

  for (let i = 1; i < order.length; i++) {
    assert.ok(
      litValues[i] < litValues[i - 1],
      `Expected ${order[i]} shadow (${litValues[i]}) darker than ${order[i - 1]} (${litValues[i - 1]})`
    );
    assert.ok(
      roughValues[i] > roughValues[i - 1],
      `Expected ${order[i]} sea roughness (${roughValues[i]}) > ${order[i - 1]} (${roughValues[i - 1]})`
    );
    assert.ok(
      speedValues[i] < speedValues[i - 1],
      `Expected ${order[i]} ship speed factor (${speedValues[i]}) < ${order[i - 1]} (${speedValues[i - 1]})`
    );
  }

  // Clear sky with no cloud overhead produces calm sea & full ship speed
  const clearWeather = sampleCloudWeatherUnderPoint(
    { x: 0, y: -10, z: 0 },
    [{ x: 0, y: 10.3, z: 0, w: 0.45 }],
    [{ x: 0.93, y: 1.0, z: 4, w: 1 }],
    1,
    10
  );
  assert.equal(clearWeather.seaRoughness, 0);
  assert.equal(clearWeather.speedFactor, 1);
  assert.equal(clearWeather.weatherType, null);

  // Storm lightning pulses periodically
  let maxFlash = 0;
  for (let t = 0; t < 10; t += 0.04) {
    maxFlash = Math.max(maxFlash, computeStormLightningIntensity(5, t));
  }
  assert.ok(maxFlash > 0.7, `Expected storm lightning flash pulse > 0.7, got ${maxFlash}`);
});

test('stepGlobeClouds drifts clouds over time and projects moving shadows onto ocean/islands', () => {
  const clouds = generateGlobeClouds();
  const dawnUnit = equirectangularToSphere(
    DAWN_GLOBE_CENTER.u,
    DAWN_GLOBE_CENTER.v,
    1
  );
  const dawnPos = {
    x: dawnUnit.x * 10,
    y: dawnUnit.y * 10,
    z: dawnUnit.z * 10,
  };
  const sunDir = computeLocalNavigationSunDir(dawnUnit, 13.5);
  assert.ok(
    dawnUnit.x * sunDir.x + dawnUnit.y * sunDir.y + dawnUnit.z * sunDir.z > 0.7,
    'Daytime navigation sun should illuminate overhead sky'
  );

  const transforms: ActiveCloudTransform[] = [];
  const shadowVec4s: CloudShadowVec4[] = Array.from(
    { length: MAX_SHADOW_CLOUD_UNIFORMS },
    () => ({ x: 0, y: 0, z: 0, w: 0 })
  );
  const shadowParams: CloudShadowParamVec4[] = Array.from(
    { length: MAX_SHADOW_CLOUD_UNIFORMS },
    () => ({ x: 0, y: 0, z: 0, w: 0 })
  );

  const count0 = stepGlobeClouds(
    clouds,
    0,
    0.55,
    10,
    dawnPos,
    sunDir,
    transforms,
    shadowVec4s,
    undefined,
    shadowParams
  );
  assert.ok(count0 > 0 && count0 <= MAX_SHADOW_CLOUD_UNIFORMS);

  const firstShadow = { ...shadowVec4s[0] };
  assert.ok(firstShadow.w > 0.04, 'Packed shadow cloud must have non-zero radius');

  const pointUnderCloud = {
    x: firstShadow.x - sunDir.x * 0.25,
    y: firstShadow.y - sunDir.y * 0.25,
    z: firstShadow.z - sunDir.z * 0.25,
  };
  const shadowedLight = sampleCloudShadowAtPoint(
    pointUnderCloud,
    sunDir,
    shadowVec4s,
    count0
  );
  assert.ok(
    shadowedLight < 0.7,
    `Expected clear cloud shadow beneath cloud, got ${shadowedLight}`
  );

  const clearPoint = {
    x: -dawnPos.x,
    y: -dawnPos.y,
    z: -dawnPos.z,
  };
  const clearLight = sampleCloudShadowAtPoint(
    clearPoint,
    sunDir,
    shadowVec4s,
    count0
  );
  assert.equal(clearLight, 1);

  stepGlobeClouds(
    clouds,
    15,
    0.55,
    10,
    dawnPos,
    sunDir,
    transforms,
    shadowVec4s,
    undefined,
    shadowParams
  );
  const movedDist = Math.hypot(
    shadowVec4s[0].x - firstShadow.x,
    shadowVec4s[0].y - firstShadow.y,
    shadowVec4s[0].z - firstShadow.z
  );
  assert.ok(movedDist > 0.01, 'Clouds and their shadows must drift over time');
});
