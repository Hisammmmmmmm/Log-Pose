import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatIslandLoadingLabel,
  isSelectedIslandLoading,
  resolveParentStreamedIslandId,
} from './islandLoading';

test('resolveParentStreamedIslandId maps sub-locations to their parent 3D island bundle', () => {
  assert.equal(resolveParentStreamedIslandId('yotsuba-island'), 'shells-town');
  assert.equal(resolveParentStreamedIslandId('orange-town'), 'organ-island');
  assert.equal(resolveParentStreamedIslandId('foosha-village'), 'dawn-island');
  assert.equal(resolveParentStreamedIslandId('arlong-park'), 'conomi-islands');
  assert.equal(resolveParentStreamedIslandId('rainbase'), 'alabasta');
  assert.equal(resolveParentStreamedIslandId('shells-town'), 'shells-town');
});

test('isSelectedIslandLoading detects both direct and parent island loading states', () => {
  const active = [{ id: 'shells-town', name: 'Shells Town' }];
  assert.equal(isSelectedIslandLoading('shells-town', active), true);
  assert.equal(isSelectedIslandLoading('yotsuba-island', active), true);
  assert.equal(isSelectedIslandLoading('alabasta', active), false);
  assert.equal(isSelectedIslandLoading(null, active), false);
  assert.equal(isSelectedIslandLoading('shells-town', []), false);
});

test('formatIslandLoadingLabel formats single and multi-island loading messages cleanly', () => {
  assert.equal(formatIslandLoadingLabel([]), '');
  assert.equal(
    formatIslandLoadingLabel([{ id: 'shells-town', name: 'Shells Town' }]),
    'Chargement de Shells Town…'
  );
  assert.equal(
    formatIslandLoadingLabel([
      { id: 'shells-town', name: 'Shells Town' },
      { id: 'goat-island', name: 'Goat Island' },
    ]),
    'Chargement de Shells Town (+1)…'
  );
});
