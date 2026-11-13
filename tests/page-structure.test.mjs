// Static checks on index.html: the Start Here module is wired into navigation the same way
// as every other module, handlers and ids resolve, and the single-file privacy rules still hold.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readIndexHtml, scriptBlock } from './helpers/load-core.mjs';

const html = readIndexHtml();
const moduleIds = [...html.matchAll(/<div class="module" id="([a-z]+)">/g)].map((match) => match[1]);

test('Start Here is the first module on the page', () => {
  assert.equal(moduleIds[0], 'start');
  assert.deepEqual(moduleIds, ['start', 'overview', 'science', 'safety', 'implementation', 'calculator', 'evidence']);
});

test('every depth button has a matching depth panel, in every module', () => {
  const depthButtons = [...html.matchAll(/setDepth\('([a-z]+)', '([a-z]+)'\)/g)];
  const startDepths = depthButtons.filter(([, module]) => module === 'start').map(([, , depth]) => depth);
  assert.deepEqual(startDepths, ['basic', 'detailed', 'technical']);
  for (const [, module, depth] of depthButtons) {
    assert.ok(html.includes(`id="${module}-${depth}"`), `no panel for ${module}/${depth}`);
  }
});

test('every module can be reached from the sidebar, bookmarked by name, and has a default depth', () => {
  const app = scriptBlock(html, 'app');
  const bookmarkNames = app.match(/const moduleNames = \{([\s\S]*?)\};/)[1];
  const depthModules = app.match(/function initializeDepths\(\) \{[\s\S]*?const modules = \[([^\]]*)\]/)[1];
  for (const id of moduleIds) {
    assert.ok(html.includes(`scrollToModule('${id}')`), `${id} is missing from the sidebar`);
    assert.match(bookmarkNames, new RegExp(`\\b${id}:`), `${id} has no bookmark name`);
    assert.ok(html.includes(`toggleBookmark('${id}')`), `${id} has no bookmark button`);
    if (id !== 'calculator') {
      assert.ok(depthModules.includes(`'${id}'`), `${id} has no default depth`);
    }
  }
});

test('every inline handler calls a function the page defines', () => {
  const handlers = new Set(
    [...html.matchAll(/\bon(?:click|change|input)="([A-Za-z_]+)\(/g)].map((match) => match[1]),
  );
  assert.ok(handlers.has('savePlanFromForm'), 'the plan form is wired to a handler');
  for (const name of handlers) {
    assert.match(html, new RegExp(`function ${name}\\(`), `${name}() is called from markup but never defined`);
  }
});

test('every element id the scripts look up exists in the page', () => {
  const lookedUp = new Set([...html.matchAll(/getElementById\('([^']+)'\)/g)].map((match) => match[1]));
  assert.ok(lookedUp.has('planPath') && lookedUp.has('symptomTracker'), 'the lookup scan finds the plan form and tracker ids');
  for (const id of lookedUp) {
    assert.ok(html.includes(`id="${id}"`), `getElementById('${id}') has no matching element`);
  }
});

test('the plan logic and view blocks never touch the DOM or storage', () => {
  for (const id of ['plan-core', 'plan-view']) {
    assert.doesNotMatch(
      scriptBlock(html, id),
      /\bdocument\.|\bwindow\.|\blocalStorage\b|\bsessionStorage\b|\bnew Date\(\)/,
      `${id} must stay pure so it can be tested and reused`,
    );
  }
});

test('the page still loads nothing from the network', () => {
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=|<img[^>]+src=|@import|url\(\s*['"]?https?:/);
  assert.doesNotMatch(html, /\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/);
});
