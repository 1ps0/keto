// Behaviour of the day-level helpers: the eating-window clock, the rough-week rule that
// decides when to repeat a week, and validation of a plan read back from storage or an import.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPlanCore } from './helpers/load-core.mjs';

const core = loadPlanCore();

const at = (clock) => {
  const [hours, minutes] = clock.split(':').map(Number);
  return hours * 60 + minutes;
};

const entry = (date, overrides = {}) => ({
  date, energy: 6, clarity: 6, appetite: 5, cravings: 4, symptoms: [], ...overrides,
});

const storedPlan = (overrides = {}) => ({
  path: 'carbs',
  pace: 'gentle',
  startDate: '2026-11-16',
  startCarbs: 250,
  targetCarbs: 50,
  targetFastHours: 16,
  lastMeal: '20:00',
  holds: [],
  ...overrides,
});

test('the eating window closes at the last-meal time and opens (24 minus fast) hours before it', () => {
  assert.deepEqual(core.eatingWindow('20:00', 12), { open: '08:00', close: '20:00', eatHours: 12 });
  assert.deepEqual(core.eatingWindow('20:00', 16), { open: '12:00', close: '20:00', eatHours: 8 });
  assert.deepEqual(core.eatingWindow('18:30', 14), { open: '08:30', close: '18:30', eatHours: 10 });
});

test('a late last meal gives a window that opens the previous afternoon', () => {
  assert.deepEqual(core.eatingWindow('02:00', 14), { open: '16:00', close: '02:00', eatHours: 10 });
});

test('the clock reports eating or fasting and the minutes until it switches', () => {
  // 16 h fast, last meal 20:00 -> window 12:00-20:00
  assert.deepEqual(core.windowStatus(at('12:00'), '20:00', 16), { state: 'eating', minutesLeft: 480 });
  assert.deepEqual(core.windowStatus(at('13:00'), '20:00', 16), { state: 'eating', minutesLeft: 420 });
  assert.deepEqual(core.windowStatus(at('20:00'), '20:00', 16), { state: 'fasting', minutesLeft: 960 });
  assert.deepEqual(core.windowStatus(at('23:30'), '20:00', 16), { state: 'fasting', minutesLeft: 750 });
  assert.deepEqual(core.windowStatus(at('08:00'), '20:00', 16), { state: 'fasting', minutesLeft: 240 });
});

test('the clock stays correct when the eating window crosses midnight', () => {
  // 14 h fast, last meal 02:00 -> window 16:00-02:00
  assert.deepEqual(core.windowStatus(at('17:00'), '02:00', 14), { state: 'eating', minutesLeft: 540 });
  assert.deepEqual(core.windowStatus(at('01:00'), '02:00', 14), { state: 'eating', minutesLeft: 60 });
  assert.deepEqual(core.windowStatus(at('03:00'), '02:00', 14), { state: 'fasting', minutesLeft: 780 });
});

test('durations read as hours and minutes', () => {
  assert.equal(core.formatDuration(420), '7 h');
  assert.equal(core.formatDuration(192), '3 h 12 m');
  assert.equal(core.formatDuration(45), '45 m');
  assert.equal(core.formatDuration(0), '0 m');
});

test('a day is rough when energy is 3 or lower, cravings are 8 or higher, or three symptoms are logged', () => {
  assert.equal(core.isRoughDay(entry('2026-11-16', { energy: 3 })), true);
  assert.equal(core.isRoughDay(entry('2026-11-16', { energy: 4 })), false);
  assert.equal(core.isRoughDay(entry('2026-11-16', { cravings: 8 })), true);
  assert.equal(core.isRoughDay(entry('2026-11-16', { cravings: 7 })), false);
  assert.equal(core.isRoughDay(entry('2026-11-16', { symptoms: ['headache', 'fatigue', 'cramps'] })), true);
  assert.equal(core.isRoughDay(entry('2026-11-16', { symptoms: ['headache', 'fatigue'] })), false);
});

test('log entries saved before the cravings slider existed are still readable', () => {
  const legacy = { date: '2026-11-16', energy: 5, clarity: 5, appetite: 5, symptoms: [] };
  assert.equal(core.isRoughDay(legacy), false);
  assert.equal(core.isRoughDay({ ...legacy, energy: 2 }), true);
});

test('the week summary counts each logged calendar day once and ignores days outside the week', () => {
  const entries = [
    entry('2026-11-15'),
    entry('2026-11-16'),
    entry('2026-11-16'),
    entry('2026-11-18'),
    entry('2026-11-22'),
    entry('2026-11-23'),
  ];
  assert.deepEqual(core.summarizeWeek(entries, '2026-11-16'), { logged: 3, rough: 0, shouldRepeat: false });
});

test('a day logged twice is rough if either entry was rough, and still counts once', () => {
  const entries = [entry('2026-11-17'), entry('2026-11-17', { energy: 2 })];
  assert.deepEqual(core.summarizeWeek(entries, '2026-11-16'), { logged: 1, rough: 1, shouldRepeat: false });
});

test('three rough days in a week trigger the repeat-this-week rule; two do not', () => {
  const twoRough = [
    entry('2026-11-16', { energy: 2 }),
    entry('2026-11-17', { cravings: 9 }),
    entry('2026-11-18'),
  ];
  const threeRough = [...twoRough, entry('2026-11-19', { energy: 1 })];
  assert.equal(core.summarizeWeek(twoRough, '2026-11-16').shouldRepeat, false);
  assert.deepEqual(core.summarizeWeek(threeRough, '2026-11-16'), { logged: 4, rough: 3, shouldRepeat: true });
});

test('a well-formed stored plan loads unchanged', () => {
  const plan = storedPlan({ path: 'both', pace: 'standard', holds: [1] });
  assert.deepEqual(core.normalizePlan(plan), plan);
});

test('unusable plans are rejected whole rather than half-loaded', () => {
  assert.equal(core.normalizePlan(null), null);
  assert.equal(core.normalizePlan('carbs'), null);
  assert.equal(core.normalizePlan({}), null);
  assert.equal(core.normalizePlan(storedPlan({ path: 'carnivore' })), null);
  assert.equal(core.normalizePlan(storedPlan({ startDate: 'next monday' })), null);
  assert.equal(core.normalizePlan(storedPlan({ startDate: '2026-02-31' })), null);
});

test('out-of-range numbers are clamped to the supported bounds', () => {
  assert.equal(core.normalizePlan(storedPlan({ startCarbs: 5000 })).startCarbs, 600);
  assert.equal(core.normalizePlan(storedPlan({ startCarbs: 3 })).startCarbs, 20);
  assert.equal(core.normalizePlan(storedPlan({ targetCarbs: 5 })).targetCarbs, 20);
  assert.equal(core.normalizePlan(storedPlan({ targetFastHours: 20 })).targetFastHours, 16);
  assert.equal(core.normalizePlan(storedPlan({ targetFastHours: 8 })).targetFastHours, 12);
});

test('missing or non-numeric settings fall back to the defaults', () => {
  const plan = core.normalizePlan({ path: 'both', startDate: '2026-11-16', startCarbs: 'lots', pace: 'toString', lastMeal: '25:00' });
  assert.deepEqual(plan, {
    path: 'both',
    pace: core.DEFAULT_PLAN.pace,
    startDate: '2026-11-16',
    startCarbs: core.DEFAULT_PLAN.startCarbs,
    targetCarbs: core.DEFAULT_PLAN.targetCarbs,
    targetFastHours: core.DEFAULT_PLAN.targetFastHours,
    lastMeal: core.DEFAULT_PLAN.lastMeal,
    holds: [],
  });
  assert.equal(core.DEFAULT_PLAN.pace, 'gentle', 'a difficult transition is the assumed case');
});

test('repeats that point past the end of the plan, or are not whole numbers, are dropped', () => {
  const plan = core.normalizePlan(storedPlan({ holds: [1, 9, -1, 2.5, '3', 1] }));
  assert.deepEqual(plan.holds, [1, 1]);
});

test('the number of repeated weeks is capped so a corrupt import cannot build an endless plan', () => {
  const plan = core.normalizePlan(storedPlan({ holds: Array(500).fill(0) }));
  assert.equal(plan.holds.length, core.LIMITS.maxHolds);
  assert.ok(core.LIMITS.maxHolds <= 52);
});
