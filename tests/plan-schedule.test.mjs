// Behaviour of the week-by-week transition schedule: carb step-down, fasting ladder,
// the staggered "both" path, repeating a rough week, and locating today inside the plan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPlanCore } from './helpers/load-core.mjs';

const core = loadPlanCore();

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

const ceilings = (schedule) => schedule.map((week) => week.carbCeiling);
const fasts = (schedule) => schedule.map((week) => week.fastHours);
const focusIds = (schedule) => schedule.flatMap((week) => week.foci.map((focus) => focus.id));

test('gentle carb path steps down evenly over six weeks and lands exactly on the target', () => {
  const schedule = core.buildSchedule(plan());
  assert.deepEqual(ceilings(schedule), [215, 185, 150, 115, 85, 50]);
  assert.ok(schedule.every((week) => week.kind === 'carbs' && week.fastHours === null));
});

test('standard carb path reaches the same target in three weeks', () => {
  const schedule = core.buildSchedule(plan({ pace: 'standard' }));
  assert.deepEqual(ceilings(schedule), [185, 115, 50]);
});

test('gentle pace gives one behaviour change per week; standard pace doubles them up; both cover all six in order', () => {
  const gentle = core.buildSchedule(plan());
  const standard = core.buildSchedule(plan({ pace: 'standard' }));
  const allIds = core.CARB_FOCI.map((focus) => focus.id);

  assert.equal(allIds.length, 6);
  assert.deepEqual(gentle.map((week) => week.foci.length), [1, 1, 1, 1, 1, 1]);
  assert.deepEqual(standard.map((week) => week.foci.length), [2, 2, 2]);
  assert.deepEqual(focusIds(gentle), allIds);
  assert.deepEqual(focusIds(standard), allIds);
});

test('a small carb gap uses fewer weeks instead of padding the plan with tiny steps', () => {
  const schedule = core.buildSchedule(plan({ startCarbs: 80, targetCarbs: 50 }));
  assert.deepEqual(ceilings(schedule), [70, 60, 50]);
  assert.deepEqual(focusIds(schedule), core.CARB_FOCI.map((focus) => focus.id));
});

test('someone already at or under the carb target gets a single holding week, never a step up', () => {
  const schedule = core.buildSchedule(plan({ startCarbs: 40, targetCarbs: 50 }));
  assert.deepEqual(ceilings(schedule), [50]);
});

test('fasting ladder starts at a 12 h overnight fast and climbs 1 h per week (gentle) or 2 h per week (standard)', () => {
  assert.deepEqual(fasts(core.buildSchedule(plan({ path: 'fasting' }))), [12, 13, 14, 15, 16]);
  assert.deepEqual(fasts(core.buildSchedule(plan({ path: 'fasting', pace: 'standard' }))), [12, 14, 16]);
  assert.deepEqual(fasts(core.buildSchedule(plan({ path: 'fasting', targetFastHours: 14 }))), [12, 13, 14]);
});

test('fasting-only path sets no carb ceiling', () => {
  const schedule = core.buildSchedule(plan({ path: 'fasting' }));
  assert.ok(schedule.every((week) => week.kind === 'fasting' && week.carbCeiling === null));
});

test('"both" path finishes the carb step-down on a 12 h overnight baseline before lengthening the fast', () => {
  const schedule = core.buildSchedule(plan({ path: 'both' }));
  assert.deepEqual(schedule.map((week) => week.kind), [
    'carbs', 'carbs', 'carbs', 'carbs', 'carbs', 'carbs',
    'fasting', 'fasting', 'fasting', 'fasting',
  ]);
  assert.deepEqual(ceilings(schedule), [215, 185, 150, 115, 85, 50, 50, 50, 50, 50]);
  assert.deepEqual(fasts(schedule), [12, 12, 12, 12, 12, 12, 13, 14, 15, 16]);
});

test('"both" path never changes the carb ceiling and the fasting length in the same week', () => {
  for (const pace of ['gentle', 'standard']) {
    const schedule = core.buildSchedule(plan({ path: 'both', pace }));
    for (let i = 1; i < schedule.length; i++) {
      const carbsChanged = schedule[i].carbCeiling !== schedule[i - 1].carbCeiling;
      const fastChanged = schedule[i].fastHours !== schedule[i - 1].fastHours;
      assert.ok(!(carbsChanged && fastChanged), `week ${i + 1} (${pace}) changes two things at once`);
    }
  }
});

test('repeating a week inserts a copy right after it and pushes every later week back', () => {
  const base = plan();
  const held = core.holdWeek(base, 1);
  const schedule = core.buildSchedule(held);

  assert.deepEqual(base.holds, [], 'holdWeek must not mutate the plan it was given');
  assert.deepEqual(ceilings(schedule), [215, 185, 185, 150, 115, 85, 50]);
  assert.deepEqual(schedule.map((week) => week.repeat), [0, 0, 1, 0, 0, 0, 0]);
  assert.deepEqual(schedule.map((week) => week.step), [0, 1, 1, 2, 3, 4, 5]);
});

test('repeating the repeat keeps holding the same step', () => {
  const twice = core.holdWeek(core.holdWeek(plan(), 1), 2);
  assert.deepEqual(ceilings(core.buildSchedule(twice)), [215, 185, 185, 185, 150, 115, 85, 50]);
});

test('undo removes the latest repeat, and is only offered while still on the repeated step', () => {
  const held = core.holdWeek(plan(), 1);
  assert.equal(core.canUndoHold(held, 1), true, 'on the week that was repeated');
  assert.equal(core.canUndoHold(held, 2), true, 'on the repeat itself');
  assert.equal(core.canUndoHold(held, 3), false, 'after moving on, undo would skip a step');
  assert.equal(core.canUndoHold(plan(), 0), false, 'nothing to undo');
  assert.deepEqual(ceilings(core.buildSchedule(core.undoHold(held))), [215, 185, 150, 115, 85, 50]);
});

test('week start dates advance seven calendar days at a time', () => {
  assert.equal(core.weekStartDate('2026-11-16', 0), '2026-11-16');
  assert.equal(core.weekStartDate('2026-11-16', 1), '2026-11-23');
  assert.equal(core.weekStartDate('2026-11-16', 7), '2027-01-04');
});

test('before the start date, today is located as a countdown', () => {
  assert.deepEqual(core.locateDay('2026-11-16', 6, '2026-11-13'), { phase: 'before', daysUntilStart: 3 });
});

test('during the plan, today is located by week, day, and days until the next step', () => {
  assert.deepEqual(core.locateDay('2026-11-16', 6, '2026-11-16'), {
    phase: 'active', dayNumber: 1, weekIndex: 0, dayInWeek: 1, daysToNextStep: 7, totalWeeks: 6,
  });
  assert.deepEqual(core.locateDay('2026-11-16', 6, '2026-11-22'), {
    phase: 'active', dayNumber: 7, weekIndex: 0, dayInWeek: 7, daysToNextStep: 1, totalWeeks: 6,
  });
  assert.deepEqual(core.locateDay('2026-11-16', 6, '2026-11-23'), {
    phase: 'active', dayNumber: 8, weekIndex: 1, dayInWeek: 1, daysToNextStep: 7, totalWeeks: 6,
  });
});

test('after the final week, the plan reports the landing phase instead of running off the end', () => {
  const lastDay = core.locateDay('2026-11-16', 6, '2026-12-27');
  const dayAfter = core.locateDay('2026-11-16', 6, '2026-12-28');
  assert.equal(lastDay.phase, 'active');
  assert.equal(lastDay.weekIndex, 5);
  assert.deepEqual(dayAfter, { phase: 'landed', dayNumber: 43, daysSinceLanding: 1, totalWeeks: 6 });
});

test('day counting is calendar-based, so daylight-saving changes do not shift the week', () => {
  // US clocks fall back on 2026-11-01 and spring forward on 2026-03-08.
  assert.equal(core.locateDay('2026-10-26', 6, '2026-11-02').weekIndex, 1);
  assert.equal(core.locateDay('2026-10-26', 6, '2026-11-02').dayInWeek, 1);
  assert.equal(core.locateDay('2026-03-02', 6, '2026-03-09').weekIndex, 1);
  assert.equal(core.locateDay('2026-03-02', 6, '2026-03-09').dayInWeek, 1);
});

test('the local calendar date is used for "today", not the UTC date', () => {
  const lateEvening = new Date(2026, 10, 13, 23, 30);
  const earlyMorning = new Date(2026, 10, 13, 0, 15);
  assert.equal(core.localDateString(lateEvening), '2026-11-13');
  assert.equal(core.localDateString(earlyMorning), '2026-11-13');
});
