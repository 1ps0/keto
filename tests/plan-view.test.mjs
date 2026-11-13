// Behaviour of the HTML builders for the Today card and the schedule table.
// These are pure string functions, so what the reader sees can be checked without a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPlanCore, loadPlanView } from './helpers/load-core.mjs';

const core = loadPlanCore();
const view = loadPlanView();
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

const roughEntry = (date) => ({ date, energy: 2, clarity: 5, appetite: 5, cravings: 5, symptoms: [] });

const card = (planValue, today, entries = [], nowMinutes = NOON) =>
  view.todayHtml(core.todayModel(planValue, today, nowMinutes, entries));

const count = (html, pattern) => (html.match(pattern) || []).length;

test('dates read as weekday, month and day', () => {
  assert.equal(view.formatDay('2026-11-16'), 'Mon Nov 16');
  assert.equal(view.formatDay('2027-01-04'), 'Mon Jan 4');
});

test('with no plan the card asks for setup and offers no plan actions', () => {
  const html = view.todayHtml(null);
  assert.match(html, /No plan yet/);
  assert.doesNotMatch(html, /repeatPlanWeek|undoPlanRepeat/);
});

test('the active card leads with the week position and the one change, then the targets', () => {
  const html = card(plan(), '2026-11-24');
  assert.match(html, /Week 2 of 6/);
  assert.match(html, /Day 9/);
  assert.match(html, /Protein-first breakfast/);
  assert.match(html, /185 g/);
  assert.ok(html.indexOf('Protein-first breakfast') < html.indexOf('185 g'), 'the action comes before the numbers');
});

test('the card always offers Repeat, and offers Undo only when a repeat can be undone', () => {
  const fresh = card(plan(), '2026-11-24');
  const held = card(core.holdWeek(plan(), 1), '2026-11-24');
  assert.match(fresh, /repeatPlanWeek\(\)/);
  assert.doesNotMatch(fresh, /undoPlanRepeat\(\)/);
  assert.match(held, /repeatPlanWeek\(\)/);
  assert.match(held, /undoPlanRepeat\(\)/);
});

test('the repeat rule is always stated, and is called out once three rough days are logged', () => {
  const calm = card(plan(), '2026-11-27', [roughEntry('2026-11-23'), roughEntry('2026-11-24')]);
  const rough = card(plan(), '2026-11-27', [roughEntry('2026-11-23'), roughEntry('2026-11-24'), roughEntry('2026-11-25')]);
  assert.match(calm, /class="plan-rule"/);
  assert.doesNotMatch(calm, /plan-rule-hit/);
  assert.match(rough, /plan-rule-hit/);
  assert.match(rough, /3 rough days/);
});

test("the card shows this week's log count and a way to log today", () => {
  const html = card(plan(), '2026-11-24', [roughEntry('2026-11-23')]);
  assert.match(html, /1 of 7 days logged/);
  assert.match(html, /1 rough day\b/);
  assert.match(html, /goToSymptomLog\(\)/);
});

test('the eating-window line appears only on paths that fast, with the live open or closed state', () => {
  const carbsOnly = card(plan(), '2026-11-24');
  const open = card(plan({ path: 'both' }), '2026-11-24', [], 13 * 60);
  const closed = card(plan({ path: 'both' }), '2026-11-24', [], 22 * 60);
  assert.doesNotMatch(carbsOnly, /Eating window/);
  assert.match(open, /08:00[^<]*20:00/);
  assert.match(open, /closes in 7 h/);
  assert.match(closed, /opens in 10 h/);
});

test('the card names the next step and its date; in the final week it names the landing', () => {
  const midPlan = card(plan(), '2026-11-24');
  const finalWeek = card(plan(), '2026-12-22');
  assert.match(midPlan, /Mon Nov 30/);
  assert.match(midPlan, /150 g/);
  assert.match(midPlan, /Swap the snack foods/);
  assert.match(finalWeek, /Mon Dec 28/);
  assert.match(finalWeek, /landing/i);
});

test('a repeated week says so on the card', () => {
  const html = card(core.holdWeek(plan(), 1), '2026-11-30');
  assert.match(html, /Week 3 of 7/);
  assert.match(html, /Repeat week/);
});

test('the countdown card shows the start day, days to go, and what week 1 will be', () => {
  const html = card(plan(), '2026-11-13');
  assert.match(html, /Mon Nov 16/);
  assert.match(html, /in 3 days/);
  assert.match(html, /Stop drinking sugar/);
  assert.doesNotMatch(html, /repeatPlanWeek/);
});

test('the landed card says to hold and shows the final targets', () => {
  const html = card(plan({ path: 'both', pace: 'standard' }), '2026-12-25');
  assert.match(html, /Landed/);
  assert.match(html, /50 g/);
  assert.match(html, /12:00[^<]*20:00/);
  assert.doesNotMatch(html, /repeatPlanWeek/);
});

test('the schedule lists every week plus a landing row and marks the current week', () => {
  const html = view.scheduleHtml(plan(), '2026-11-24');
  assert.equal(count(html, /<tr/g), 1 + 6 + 1, 'header + six weeks + landing');
  assert.equal(count(html, /class="current"/g), 1);
  assert.equal(count(html, /class="done"/g), 1, 'week 1 is behind us');
  assert.match(html, /Mon Dec 28/);
});

test('a repeated week is labelled in the schedule', () => {
  const html = view.scheduleHtml(core.holdWeek(plan(), 1), '2026-11-24');
  assert.equal(count(html, /<tr/g), 1 + 7 + 1);
  assert.equal(count(html, /\(repeat\)/g), 1);
});

test('a fasting-only schedule has no carb column and a carbs-only schedule has no fasting column', () => {
  const fastingOnly = view.scheduleHtml(plan({ path: 'fasting' }), '2026-11-24');
  const carbsOnly = view.scheduleHtml(plan(), '2026-11-24');
  const both = view.scheduleHtml(plan({ path: 'both' }), '2026-11-24');
  assert.doesNotMatch(fastingOnly, /Carb ceiling/);
  assert.match(fastingOnly, /<th>Fast<\/th>/);
  assert.match(carbsOnly, /Carb ceiling/);
  assert.doesNotMatch(carbsOnly, /<th>Fast<\/th>/);
  assert.match(both, /Carb ceiling/);
  assert.match(both, /<th>Fast<\/th>/);
});
