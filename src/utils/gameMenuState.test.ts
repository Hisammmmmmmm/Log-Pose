import test from 'node:test';
import assert from 'node:assert/strict';
import { ONE_PIECE_LOCATIONS } from '../data/onePieceLocations';
import {
  DEFAULT_GAME_SETTINGS,
  LUFFY_START_ISLAND_ID,
  countJournalRegions,
  filterJournalIslands,
  formatSoundVolume,
  resolveDocumentBodyState,
  resolveLuffyStartIsland,
  shouldAutoStartFromSearch,
} from './gameMenuState';

test('resolveLuffyStartIsland returns Foosha Village on Dawn Island', () => {
  const start = resolveLuffyStartIsland(ONE_PIECE_LOCATIONS);
  assert.ok(start, 'Expected a valid Luffy start island');
  assert.equal(start.id, LUFFY_START_ISLAND_ID);
  assert.equal(start.region, 'East Blue');
});

test('shouldAutoStartFromSearch handles autostart query flags cleanly', () => {
  assert.equal(shouldAutoStartFromSearch('?autostart=1'), true);
  assert.equal(shouldAutoStartFromSearch('?foo=bar&autostart=true'), true);
  assert.equal(shouldAutoStartFromSearch('?autostart=0'), false);
  assert.equal(shouldAutoStartFromSearch(''), false);
});

test('resolveDocumentBodyState maps screen modes and modals to loading, title, playing, or paused', () => {
  assert.equal(resolveDocumentBodyState('loading', null), 'loading');
  assert.equal(resolveDocumentBodyState('title', null), 'title');
  assert.equal(resolveDocumentBodyState('title', 'journal'), 'paused');
  assert.equal(resolveDocumentBodyState('title', 'settings'), 'paused');
  assert.equal(resolveDocumentBodyState('atlas', null), 'playing');
  assert.equal(resolveDocumentBodyState('voyage', null), 'playing');
  assert.equal(resolveDocumentBodyState('quit', null), 'paused');
});

test('filterJournalIslands filters by search term and sea region', () => {
  const fooshaHits = filterJournalIslands(ONE_PIECE_LOCATIONS, 'foosha', 'All');
  assert.ok(fooshaHits.some((i) => i.id === 'foosha-village'));

  const eastBlueHits = filterJournalIslands(ONE_PIECE_LOCATIONS, '', 'East Blue');
  assert.ok(eastBlueHits.length > 0);
  assert.ok(eastBlueHits.every((i) => i.region === 'East Blue'));

  const counts = countJournalRegions(ONE_PIECE_LOCATIONS);
  assert.equal(counts.All, ONE_PIECE_LOCATIONS.length);
  assert.equal(counts['East Blue'], eastBlueHits.length);
  assert.equal(DEFAULT_GAME_SETTINGS.sunnyCameraMode, 'navigator');
  assert.equal(DEFAULT_GAME_SETTINGS.cloudCover, 0.8);
  assert.equal(DEFAULT_GAME_SETTINGS.musicEnabled, true);
  assert.equal(DEFAULT_GAME_SETTINGS.soundVolume, 0.75);
  assert.equal(formatSoundVolume(0.75), '75%');
  assert.equal(formatSoundVolume(0), '0%');
});
