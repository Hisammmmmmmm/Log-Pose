import test from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOM_3D_ISLAND_IDS } from '../islands/lazyRegistry';
import {
  PRIORITY_ISLAND_PRELOAD_ORDER,
  buildOrderedPreloadIds,
  computeStartupPreloadProgress,
  startCooperativePreloadQueue,
} from './backgroundPreloader';

test('buildOrderedPreloadIds prioritizes Dawn Island and early East Blue before Paradise', () => {
  const ordered = buildOrderedPreloadIds([
    'marineford',
    'water-7',
    'dawn-island',
    'custom-extra',
    'alabasta',
    'shells-town',
  ]);

  assert.equal(ordered[0], 'dawn-island');
  assert.ok(
    ordered.indexOf('shells-town') < ordered.indexOf('alabasta'),
    'East Blue islands should precede Paradise islands'
  );
  assert.ok(
    ordered.indexOf('alabasta') < ordered.indexOf('water-7'),
    'Earlier Grand Line stops should precede later stops'
  );
  assert.equal(ordered[ordered.length - 1], 'custom-extra');
});

test('PRIORITY_ISLAND_PRELOAD_ORDER covers all custom 3D islands', () => {
  const prioritySet = new Set(PRIORITY_ISLAND_PRELOAD_ORDER);
  for (const id of CUSTOM_3D_ISLAND_IDS) {
    assert.ok(prioritySet.has(id), `Expected ${id} in PRIORITY_ISLAND_PRELOAD_ORDER`);
  }
});

test('computeStartupPreloadProgress smoothly advances across map, fonts, islands, and ready phases', () => {
  const mapStart = computeStartupPreloadProgress({
    mapFraction: 0.25,
    fontsReady: false,
    completedIslands: 0,
    totalIslands: 32,
    phase: 'map',
  });
  const islandsStart = computeStartupPreloadProgress({
    mapFraction: 1,
    fontsReady: true,
    completedIslands: 0,
    totalIslands: 32,
    phase: 'islands',
  });
  const islandsHalf = computeStartupPreloadProgress({
    mapFraction: 1,
    fontsReady: true,
    completedIslands: 16,
    totalIslands: 32,
    phase: 'islands',
  });
  const ready = computeStartupPreloadProgress({
    mapFraction: 1,
    fontsReady: true,
    completedIslands: 32,
    totalIslands: 32,
    phase: 'ready',
  });

  assert.ok(mapStart > 0 && mapStart < islandsStart);
  assert.ok(islandsHalf > islandsStart && islandsHalf < 0.99);
  assert.equal(ready, 1);
});

test('startCooperativePreloadQueue runs tasks one-by-one and continues past individual errors', async () => {
  const loaded: string[] = [];
  const scheduledDelays: number[] = [];

  const queue = startCooperativePreloadQueue({
    islandIds: ['dawn-island', 'broken-island', 'shells-town'],
    initialDelayMs: 500,
    stepDelayMs: 120,
    loadTask: async (id) => {
      if (id === 'broken-island') {
        throw new Error('simulated chunk error');
      }
      loaded.push(id);
    },
    scheduleStep: (fn, delayMs) => {
      scheduledDelays.push(delayMs);
      const t = setTimeout(fn, 1);
      return () => clearTimeout(t);
    },
  });

  const result = await queue.done;
  assert.deepEqual(loaded, ['dawn-island', 'shells-town']);
  assert.equal(result.completed, 3);
  assert.equal(result.total, 3);
  assert.deepEqual(scheduledDelays, [500, 120, 120]);
});

test('startCooperativePreloadQueue cancels cleanly before finishing remaining tasks', async () => {
  const loaded: string[] = [];
  let queueHandle: ReturnType<typeof startCooperativePreloadQueue> | null = null;

  queueHandle = startCooperativePreloadQueue({
    islandIds: ['dawn-island', 'goat-island', 'shells-town'],
    initialDelayMs: 10,
    stepDelayMs: 10,
    loadTask: async (id) => {
      loaded.push(id);
      if (id === 'dawn-island') {
        queueHandle?.cancel();
      }
    },
    scheduleStep: (fn) => {
      const t = setTimeout(fn, 1);
      return () => clearTimeout(t);
    },
  });

  const result = await queueHandle.done;
  assert.deepEqual(loaded, ['dawn-island']);
  assert.equal(result.completed, 0);
});
