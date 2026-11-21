import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ALL_GAME_AUDIO_TRACKS,
  DEFAULT_MUSIC_ENABLED,
  DEFAULT_SOUND_VOLUME,
  GAME_AUDIO_TRACKS,
  UI_AND_SFX_TRACK_IDS,
  clampAudioVolume,
  computeEffectiveMusicGain,
  computeEffectiveSfxGain,
  computePlaybackSlice,
  computeSeaAmbienceMix,
  parseStoredAudioSettings,
  resolveMusicTrackForContext,
  type AudioWorldContext,
} from './gameAudio';

const BASE_WORLD_CTX: AudioWorldContext = {
  appMode: 'voyage',
  sailingActive: true,
  skyZone: 'blue-sea',
  selectedIslandId: null,
  seaRoughness: 0,
  rainIntensity: 0,
  snowIntensity: 0,
  speedKnots: 18,
  cameraSurfaceMix: 1,
  weatherType: null,
};

test('every declared game sound points to a valid non-empty placeholder MP3 file on disk', () => {
  assert.equal(ALL_GAME_AUDIO_TRACKS.length, 27);
  const seenUrls = new Set<string>();
  for (const spec of ALL_GAME_AUDIO_TRACKS) {
    assert.ok(spec.url.startsWith('/assets/audio/'), `Bad url: ${spec.url}`);
    assert.ok(spec.url.endsWith('.mp3'), `Expected .mp3 url: ${spec.url}`);
    assert.ok(
      spec.publicPath.startsWith('public/assets/audio/'),
      `Bad publicPath: ${spec.publicPath}`
    );
    assert.equal(`/${spec.publicPath.replace(/^public\//, '')}`, spec.url);
    assert.ok(!seenUrls.has(spec.url), `Duplicate url: ${spec.url}`);
    seenUrls.add(spec.url);

    const absPath = path.resolve(process.cwd(), spec.publicPath);
    assert.ok(fs.existsSync(absPath), `Missing MP3 asset on disk: ${absPath}`);
    const stat = fs.statSync(absPath);
    assert.ok(
      stat.size > 1000,
      `MP3 file looks unexpectedly tiny (${stat.size} bytes): ${absPath}`
    );
  }
  assert.equal(GAME_AUDIO_TRACKS['ambient-sea-calm'].loop, true);
  assert.equal(GAME_AUDIO_TRACKS['sfx-coup-de-burst'].loop, false);
});

test('volume and music mute helpers clamp and mute music independently of SFX', () => {
  assert.equal(clampAudioVolume(-0.4), 0);
  assert.equal(clampAudioVolume(1.8), 1);
  assert.equal(clampAudioVolume(Number.NaN), DEFAULT_SOUND_VOLUME);

  assert.equal(computeEffectiveMusicGain(0.8, false, 0.4), 0);
  assert.ok(Math.abs(computeEffectiveMusicGain(0.5, true, 0.4) - 0.2) < 1e-6);
  assert.ok(Math.abs(computeEffectiveSfxGain(0.5, 0.6, 1) - 0.3) < 1e-6);
  assert.equal(computeEffectiveSfxGain(0, 0.6, 1), 0);
});

test('resolveMusicTrackForContext selects the right theme for title, atlas, voyage, storm, skypiea, and fishman', () => {
  assert.equal(
    resolveMusicTrackForContext({ ...BASE_WORLD_CTX, appMode: 'loading' }),
    null
  );
  assert.equal(
    resolveMusicTrackForContext({ ...BASE_WORLD_CTX, appMode: 'title', sailingActive: false }),
    'music-title'
  );
  assert.equal(
    resolveMusicTrackForContext({ ...BASE_WORLD_CTX, appMode: 'atlas', sailingActive: false }),
    'music-atlas'
  );
  assert.equal(
    resolveMusicTrackForContext({ ...BASE_WORLD_CTX, appMode: 'voyage', sailingActive: true }),
    'music-voyage-calm'
  );
  assert.equal(
    resolveMusicTrackForContext({
      ...BASE_WORLD_CTX,
      appMode: 'voyage',
      sailingActive: true,
      weatherType: 'storm',
      seaRoughness: 0.9,
    }),
    'music-voyage-storm'
  );
  assert.equal(
    resolveMusicTrackForContext({
      ...BASE_WORLD_CTX,
      skyZone: 'skypiea',
      weatherType: 'storm',
    }),
    'music-skypiea'
  );
  assert.equal(
    resolveMusicTrackForContext({
      ...BASE_WORLD_CTX,
      skyZone: 'fish-man-island',
    }),
    'music-fishman'
  );
});

test('computeSeaAmbienceMix transitions smoothly from calm sea to storm surf, rain, snow wind, and subsea silence', () => {
  const calm = computeSeaAmbienceMix(BASE_WORLD_CTX);
  assert.ok(calm.calmSeaGain > 0.7);
  assert.equal(calm.roughSeaGain, 0);
  assert.equal(calm.rainGain, 0);
  assert.equal(calm.windSnowGain, 0);

  const storm = computeSeaAmbienceMix({
    ...BASE_WORLD_CTX,
    seaRoughness: 0.95,
    rainIntensity: 0.9,
    weatherType: 'storm',
  });
  assert.ok(storm.roughSeaGain > 0.85);
  assert.ok(storm.calmSeaGain < calm.calmSeaGain);
  assert.ok(storm.rainGain > 0.7);

  const snowy = computeSeaAmbienceMix({
    ...BASE_WORLD_CTX,
    seaRoughness: 0.4,
    snowIntensity: 0.85,
    weatherType: 'snow',
  });
  assert.ok(snowy.windSnowGain > 0.65);

  const subsea = computeSeaAmbienceMix({
    ...BASE_WORLD_CTX,
    skyZone: 'fish-man-island',
    seaRoughness: 1,
    rainIntensity: 1,
  });
  assert.equal(subsea.roughSeaGain, 0);
  assert.equal(subsea.rainGain, 0);
  assert.equal(subsea.windSnowGain, 0);
});

test('parseStoredAudioSettings safely restores valid settings and falls back on corrupt payloads', () => {
  assert.deepEqual(parseStoredAudioSettings(null), {
    musicEnabled: DEFAULT_MUSIC_ENABLED,
    soundVolume: DEFAULT_SOUND_VOLUME,
  });
  assert.deepEqual(parseStoredAudioSettings('{broken json'), {
    musicEnabled: DEFAULT_MUSIC_ENABLED,
    soundVolume: DEFAULT_SOUND_VOLUME,
  });
  assert.deepEqual(
    parseStoredAudioSettings(JSON.stringify({ musicEnabled: false, soundVolume: 0.42 })),
    { musicEnabled: false, soundVolume: 0.42 }
  );
  assert.deepEqual(
    parseStoredAudioSettings(JSON.stringify({ musicEnabled: true, soundVolume: 5 })),
    { musicEnabled: true, soundVolume: 1 }
  );
});

test('computePlaybackSlice trims leading silence and respects maxPlaySec without exceeding MP3 duration', () => {
  assert.deepEqual(computePlaybackSlice(GAME_AUDIO_TRACKS['ui-menu-click'], 0.8), {
    offsetSec: 0.075,
    playDurationSec: 0.45,
  });

  assert.deepEqual(computePlaybackSlice(GAME_AUDIO_TRACKS['sfx-octopus-balloon'], 1.15), {
    offsetSec: 0.095,
  });

  assert.deepEqual(computePlaybackSlice(GAME_AUDIO_TRACKS['sfx-hull-collision'], 2.4), {
    offsetSec: 0,
    playDurationSec: 1.25,
  });

  // Never seek past end of a shorter custom file
  const shortSlice = computePlaybackSlice(GAME_AUDIO_TRACKS['ui-menu-click'], 0.06);
  assert.ok(shortSlice.offsetSec < 0.06);

  // Supports boosted SFX baseGains above 1.0 for quiet MP3 files
  const boosted = computeEffectiveSfxGain(0.8, 1.35, 1.0);
  assert.ok(boosted > 1.0 && boosted <= 1.25);

  // Every UI and SFX track declared in GAME_AUDIO_TRACKS is registered in UI_AND_SFX_TRACK_IDS
  const expectedUiAndSfx = ALL_GAME_AUDIO_TRACKS.filter(
    (t) => t.category === 'ui' || t.category === 'sfx'
  )
    .map((t) => t.id)
    .sort();
  assert.deepEqual([...UI_AND_SFX_TRACK_IDS].sort(), expectedUiAndSfx);
});

