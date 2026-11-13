// Behaviour of the "today" model: everything the Today card needs for a given date and time,
// plus the rule for keeping repeated weeks when the plan settings are edited.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPlanCore } from './helpers/load-core.mjs';

const core = loadPlanCore();
const NOON = 12 * 60;

const plan = (overrides = {}) => ({
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

const entry = (date, overrides = {}) => ({
  date, energy: 6, clarity: 6, appetite: 5, cravings: 4, symptoms: [], ...overrides,
});

test('before the start date the model is a countdown that previews week 1', () => {
  const model = core.todayModel(plan(), '2026-11-13', NOON, []);
  assert.equal(model.phase, 'before');
  assert.equal(model.daysUntilStart, 3);
  assert.equal(model.startDate, '2026-11-16');
  assert.equal(model.totalWeeks, 6);
  assert.equal(model.week.carbCeiling, 215);
  assert.equal(model.week.foci[0].id, 'liquid-sugar');
});

test('mid-plan the model carries this week, the next step and the date it starts', () => {
  const model = core.todayModel(plan(), '2026-11-24', NOON, []);
  assert.equal(model.phase, 'active');
  assert.equal(model.weekNumber, 2);
  assert.equal(model.totalWeeks, 6);
  assert.equal(model.dayNumber, 9);
  assert.equal(model.daysToNextStep, 6);
  assert.equal(model.week.carbCeiling, 185);
  assert.equal(model.nextWeek.carbCeiling, 150);
  assert.equal(model.nextStepDate, '2026-11-30');
  assert.equal(model.eatingWindow, null, 'the carbs-only path has no eating window');
});

test('in the final week there is no next step, only the landing date', () => {
  const model = core.todayModel(plan(), '2026-12-22', NOON, []);
  assert.equal(model.weekNumber, 6);
  assert.equal(model.nextWeek, null);
  assert.equal(model.nextStepDate, '2026-12-28');
});

test('paths with a fasting window report its hours and whether it is open right now', () => {
  const model = core.todayModel(plan({ path: 'both' }), '2026-11-24', 13 * 60, []);
  assert.deepEqual(model.eatingWindow, {
    open: '08:00', close: '20:00', eatHours: 12, fastHours: 12, state: 'eating', minutesLeft: 420,
  });
});

test("this week's log counts only this week's entries and knows whether today is logged", () => {
  const entries = [
    entry('2026-11-20'),
    entry('2026-11-23', { energy: 2 }),
    entry('2026-11-24'),
  ];
  const model = core.todayModel(plan(), '2026-11-24', NOON, entries);
  assert.deepEqual(model.log, { logged: 2, rough: 1, shouldRepeat: false });
  assert.equal(model.loggedToday, true);
  assert.equal(core.todayModel(plan(), '2026-11-25', NOON, entries).loggedToday, false);
});

test('a repeated week is flagged and can be undone while it is the current week', () => {
  const held = core.holdWeek(plan(), 1);
  const model = core.todayModel(held, '2026-11-30', NOON, []);
  assert.equal(model.weekNumber, 3);
  assert.equal(model.totalWeeks, 7);
  assert.equal(model.week.repeat, 1);
  assert.equal(model.week.carbCeiling, 185);
  assert.equal(model.canUndoHold, true);
});

test('after the last week the model holds the final targets', () => {
  const model = core.todayModel(plan({ path: 'both', pace: 'standard' }), '2026-12-25', NOON, []);
  assert.equal(model.phase, 'landed');
  assert.equal(model.totalWeeks, 5);
  assert.equal(model.daysSinceLanding, 5);
  assert.equal(model.week.carbCeiling, 50);
  assert.equal(model.week.fastHours, 16);
  assert.equal(model.eatingWindow.open, '12:00');
});

test('editing settings keeps repeated weeks only when the list of steps is unchanged', () => {
  const previous = plan({ path: 'both', holds: [1] });
  const sameSteps = plan({ path: 'both', lastMeal: '19:00', startDate: '2026-11-23' });
  const fasterPace = plan({ path: 'both', pace: 'standard' });

  assert.deepEqual(core.carryHolds(previous, sameSteps).holds, [1]);
  assert.equal(core.carryHolds(previous, sameSteps).lastMeal, '19:00');
  assert.deepEqual(core.carryHolds(previous, fasterPace).holds, []);
  assert.deepEqual(core.carryHolds(null, sameSteps), sameSteps);
});
