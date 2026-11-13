// Behaviour of the page wiring: the plan form, the Today card, repeat/undo, persistence,
// export/import, and the symptom log that feeds the rough-week rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bootApp, FakeStorage } from './helpers/fake-app.mjs';

const MONDAY_NOON = new Date(2026, 10, 16, 12, 0);
const WEEK_2_TUESDAY_1PM = new Date(2026, 10, 24, 13, 0);

const BOTH_PATHS_FORM = {
  planPath: 'both',
  planPace: 'gentle',
  planStartDate: '2026-11-16',
  planStartCarbs: '250',
  planTargetCarbs: '50',
  planTargetFast: '16',
  planLastMeal: '20:00',
};

const BOTH_PATHS_PLAN = {
  path: 'both',
  pace: 'gentle',
  startDate: '2026-11-16',
  startCarbs: 250,
  targetCarbs: 50,
  targetFastHours: 16,
  lastMeal: '20:00',
  holds: [],
};

function appWithPlan(options = {}) {
  const app = bootApp({ now: MONDAY_NOON, ...options });
  app.fill(BOTH_PATHS_FORM);
  app.call('savePlanFromForm');
  return app;
}

function logSymptoms(app, values, checked = []) {
  app.fill({ energyLevel: '6', clarityLevel: '6', appetiteLevel: '5', cravingsLevel: '4', ...values });
  checked.forEach((id) => { app.el(id).checked = true; });
  app.call('addSymptomEntry');
}

test('with nothing saved, the Today card asks for setup and the form shows the gentle defaults starting today', () => {
  const app = bootApp({ now: MONDAY_NOON });
  assert.match(app.el('planToday').innerHTML, /No plan yet/);
  assert.equal(app.el('planSchedule').innerHTML, '');
  assert.equal(app.el('planPath').value, 'carbs');
  assert.equal(app.el('planPace').value, 'gentle');
  assert.equal(app.el('planStartDate').value, '2026-11-16');
  assert.equal(String(app.el('planStartCarbs').value), '250');
  assert.equal(String(app.el('planTargetCarbs').value), '50');
});

test('the form only shows the fields that matter for the chosen path', () => {
  const app = bootApp({ now: MONDAY_NOON });
  assert.equal(app.el('planFastFields').style.display, 'none', 'carbs path hides the fasting fields');
  assert.notEqual(app.el('planCarbFields').style.display, 'none');

  app.fill({ planPath: 'fasting' });
  app.call('updatePlanFormVisibility');
  assert.equal(app.el('planCarbFields').style.display, 'none');
  assert.notEqual(app.el('planFastFields').style.display, 'none');

  app.fill({ planPath: 'both' });
  app.call('updatePlanFormVisibility');
  assert.notEqual(app.el('planCarbFields').style.display, 'none');
  assert.notEqual(app.el('planFastFields').style.display, 'none');
});

test('building a plan from the form stores it, shows week 1 and the schedule, and survives a reload', () => {
  const app = appWithPlan();
  assert.deepEqual(app.state().transitionPlan, BOTH_PATHS_PLAN);
  assert.match(app.el('planToday').innerHTML, /Week 1 of 10/);
  assert.match(app.el('planSchedule').innerHTML, /Your schedule/);
  assert.match(app.el('planMessage').textContent, /10 weeks/);

  const reloaded = bootApp({ storage: app.storage, now: MONDAY_NOON });
  assert.deepEqual(reloaded.state().transitionPlan, BOTH_PATHS_PLAN);
  assert.match(reloaded.el('planToday').innerHTML, /Week 1 of 10/);
  assert.equal(reloaded.el('planPath').value, 'both');
  assert.equal(reloaded.el('planLastMeal').value, '20:00');
});

test('the plan stays out of the shareable URL', () => {
  const app = appWithPlan();
  assert.ok(app.lastUrl.includes('bookmarks='), 'the URL is being written at all');
  assert.doesNotMatch(decodeURIComponent(app.lastUrl), /transitionPlan|startCarbs|lastMeal/);
});

test('a form without a start date builds nothing and says why', () => {
  const app = bootApp({ now: MONDAY_NOON });
  app.fill({ ...BOTH_PATHS_FORM, planStartDate: '' });
  app.call('savePlanFromForm');
  assert.equal(app.state().transitionPlan, null);
  assert.match(app.el('planMessage').textContent, /start date/i);
});

test('out-of-range form values are clamped and the form shows what was actually saved', () => {
  const app = bootApp({ now: MONDAY_NOON });
  app.fill({ ...BOTH_PATHS_FORM, planTargetCarbs: '5' });
  app.call('savePlanFromForm');
  assert.equal(app.state().transitionPlan.targetCarbs, 20);
  assert.equal(String(app.el('planTargetCarbs').value), '20');
});

test('the Today card follows the calendar and the clock', () => {
  const app = appWithPlan();
  app.now = WEEK_2_TUESDAY_1PM;
  app.call('renderPlan');
  const card = app.el('planToday').innerHTML;
  assert.match(card, /Week 2 of 10/);
  assert.match(card, /Day 9/);
  assert.match(card, /closes in 7 h/);
});

test('the minute-by-minute refresh leaves the card alone when nothing changed, so focus is not lost', () => {
  const app = appWithPlan();
  app.now = WEEK_2_TUESDAY_1PM;
  app.call('renderPlan');

  app.el('planToday').innerHTML = 'untouched';
  app.call('renderPlan');
  assert.equal(app.el('planToday').innerHTML, 'untouched', 'same minute: no rewrite');

  app.now = new Date(2026, 10, 24, 13, 1);
  app.call('renderPlan');
  assert.match(app.el('planToday').innerHTML, /closes in 6 h 59 m/, 'next minute: the clock updates');
});

test('Repeat this week adds a week and persists it; Undo takes it back', () => {
  const app = appWithPlan();
  app.now = WEEK_2_TUESDAY_1PM;

  app.call('repeatPlanWeek');
  assert.deepEqual(app.state().transitionPlan.holds, [1]);
  assert.deepEqual(app.savedState().transitionPlan.holds, [1]);
  assert.match(app.el('planToday').innerHTML, /Week 2 of 11/);
  assert.match(app.el('planToday').innerHTML, /undoPlanRepeat\(\)/);
  assert.match(app.el('planSchedule').innerHTML, /\(repeat\)/);

  app.call('undoPlanRepeat');
  assert.deepEqual(app.state().transitionPlan.holds, []);
  assert.deepEqual(app.savedState().transitionPlan.holds, []);
  assert.match(app.el('planToday').innerHTML, /Week 2 of 10/);
});

test('Repeat does nothing before the plan has started', () => {
  const app = appWithPlan();
  app.now = new Date(2026, 10, 13, 12, 0);
  app.call('repeatPlanWeek');
  assert.deepEqual(app.state().transitionPlan.holds, []);
});

test('saving the form again keeps repeated weeks when only the meal time changes, and drops them when the pace changes', () => {
  const app = appWithPlan();
  app.now = WEEK_2_TUESDAY_1PM;
  app.call('repeatPlanWeek');

  app.fill({ planLastMeal: '19:00' });
  app.call('savePlanFromForm');
  assert.deepEqual(app.state().transitionPlan.holds, [1]);
  assert.equal(app.state().transitionPlan.lastMeal, '19:00');

  app.fill({ planPace: 'standard' });
  app.call('savePlanFromForm');
  assert.deepEqual(app.state().transitionPlan.holds, []);
});

test('clearing the plan asks first: declining keeps it, accepting removes it', () => {
  const app = appWithPlan();

  app.confirmAnswer = false;
  app.call('clearPlan');
  assert.equal(app.confirms.length, 1);
  assert.deepEqual(app.state().transitionPlan, BOTH_PATHS_PLAN);

  app.confirmAnswer = true;
  app.call('clearPlan');
  assert.equal(app.state().transitionPlan, null);
  assert.equal(app.savedState().transitionPlan, null);
  assert.match(app.el('planToday').innerHTML, /No plan yet/);
  assert.equal(app.el('planSchedule').innerHTML, '');
});

test('a full export includes the plan, and importing it into a fresh browser restores the plan and the log', () => {
  const source = appWithPlan();
  logSymptoms(source, { symptomDate: '2026-11-16' });
  source.call('exportTrackingData');
  assert.equal(source.downloads.length, 1);
  assert.deepEqual(JSON.parse(source.downloads[0]).transitionPlan, BOTH_PATHS_PLAN);

  const target = bootApp({ now: MONDAY_NOON });
  target.call('importTrackingData', { target: { files: [{ text: source.downloads[0] }], value: 'backup.json' } });
  assert.deepEqual(target.state().transitionPlan, BOTH_PATHS_PLAN);
  assert.equal(target.state().symptomEntries.length, 1);
  assert.match(target.el('planToday').innerHTML, /Week 1 of 10/);
  assert.match(target.el('planToday').innerHTML, /1 of 7 days logged/);
  assert.equal(target.el('planPath').value, 'both');
});

test('importing a file with a corrupt plan still imports the log and leaves no plan', () => {
  const app = appWithPlan();
  const file = JSON.stringify({
    ketoneReadings: [],
    symptomEntries: [{ date: '2026-11-16', energy: 5, clarity: 5, appetite: 5, symptoms: [], timestamp: 1 }],
    transitionPlan: { path: 'carnivore', startDate: 'soon' },
  });
  app.call('importTrackingData', { target: { files: [{ text: file }], value: 'backup.json' } });
  assert.equal(app.state().symptomEntries.length, 1);
  assert.equal(app.state().transitionPlan, null);
  assert.match(app.el('planToday').innerHTML, /No plan yet/);
});

test('importing an older export that has no plan keeps the current plan', () => {
  const app = appWithPlan();
  const file = JSON.stringify({ ketoneReadings: [], symptomEntries: [], version: '1.0' });
  app.call('importTrackingData', { target: { files: [{ text: file }], value: 'old.json' } });
  assert.deepEqual(app.state().transitionPlan, BOTH_PATHS_PLAN);
});

test('a symptom entry records cravings and the added symptoms, and updates the Today card log line', () => {
  const app = appWithPlan();
  app.now = new Date(2026, 10, 17, 12, 0);
  logSymptoms(app, { symptomDate: '2026-11-17', energyLevel: '2', cravingsLevel: '9' }, ['cramps', 'dizziness']);

  const [entry] = app.state().symptomEntries;
  assert.equal(entry.cravings, 9);
  assert.deepEqual(entry.symptoms, ['cramps', 'dizziness']);
  assert.match(app.el('symptomHistory').innerHTML, /Cravings: 9\/10/);
  assert.match(app.el('planToday').innerHTML, /1 of 7 days logged/);
  assert.match(app.el('planToday').innerHTML, /1 rough day\b/);
  assert.match(app.el('planToday').innerHTML, /Today is logged/);
});

test('clearing the symptom log updates the Today card', () => {
  const app = appWithPlan();
  logSymptoms(app, { symptomDate: '2026-11-16' });
  assert.match(app.el('planToday').innerHTML, /1 of 7 days logged/);
  app.call('clearSymptomData');
  assert.match(app.el('planToday').innerHTML, /0 of 7 days logged/);
});

test('state saved by the previous version loads cleanly: no plan, and old entries without cravings still list', () => {
  const legacy = {
    bookmarks: [],
    currentDepth: {},
    userProfile: {},
    ketoneReadings: [],
    symptomEntries: [{ date: '2026-11-10', energy: 5, clarity: 5, appetite: 5, symptoms: ['headache'], timestamp: 1 }],
    calculatorProfiles: [],
  };
  const app = bootApp({ storage: new FakeStorage({ ketoAppState: JSON.stringify(legacy) }), now: MONDAY_NOON });
  assert.equal(app.state().transitionPlan, null);
  assert.match(app.el('planToday').innerHTML, /No plan yet/);
  assert.match(app.el('symptomHistory').innerHTML, /2026-11-10/);
  assert.doesNotMatch(app.el('symptomHistory').innerHTML, /Cravings|undefined/);
});

test('tracker dates default to the local calendar day, late in the evening and just after midnight', () => {
  const lateEvening = bootApp({ now: new Date(2026, 10, 16, 23, 30) });
  const afterMidnight = bootApp({ now: new Date(2026, 10, 16, 0, 15) });
  assert.equal(lateEvening.el('symptomDate').value, '2026-11-16');
  assert.equal(lateEvening.el('ketoneDate').value, '2026-11-16');
  assert.equal(afterMidnight.el('symptomDate').value, '2026-11-16');
});

test('Log today jumps to the symptom tracker with today selected', () => {
  const app = appWithPlan();
  app.now = WEEK_2_TUESDAY_1PM;
  app.fill({ symptomDate: '2026-11-01' });
  app.call('goToSymptomLog');
  assert.equal(app.el('symptomTracker').scrolledIntoView, 1);
  assert.equal(app.el('symptomDate').value, '2026-11-24');
});

test('the data status panel counts the plan weeks', () => {
  const app = appWithPlan();
  assert.match(app.statusGrid.innerHTML, /<strong>10<\/strong>\s*<span>Plan Weeks<\/span>/);
  app.call('clearPlan');
  assert.match(app.statusGrid.innerHTML, /<strong>0<\/strong>\s*<span>Plan Weeks<\/span>/);
});

test('reloading saved data from storage brings the plan back with it', () => {
  const app = appWithPlan();
  app.call('saveTrackingData');
  app.state().transitionPlan = null;
  app.call('loadTrackingData');
  assert.deepEqual(app.state().transitionPlan, BOTH_PATHS_PLAN);
  assert.match(app.el('planToday').innerHTML, /Week 1 of 10/);
});
