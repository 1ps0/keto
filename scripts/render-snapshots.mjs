// Renders static snapshots of the Start Here module to PNG so its layout can be looked at
// without opening a browser window. No headless browser is installed on this machine, so this
// pre-renders each plan state with the page's own HTML builders, strips the scripts, and hands
// the result to macOS Quick Look (qlmanage), which draws HTML off-screen.
//
// Usage: node scripts/render-snapshots.mjs [output-dir]   (default: .claude/scratch/render)
// Limits: Quick Look uses a fixed desktop-width viewport, so the mobile layout is not covered,
// and form fields show their unset state because nothing runs to fill them.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadPlanCore, loadPlanView, readIndexHtml } from '../tests/helpers/load-core.mjs';

const core = loadPlanCore();
const view = loadPlanView();
const outputDir = resolve(process.argv[2] || '.claude/scratch/render');

const plan = (overrides = {}) => ({
  path: 'both',
  pace: 'gentle',
  startDate: '2026-11-16',
  startCarbs: 250,
  targetCarbs: 50,
  targetFastHours: 16,
  lastMeal: '20:00',
  holds: [],
  ...overrides,
});
const roughDay = (date) => ({ date, energy: 2, clarity: 5, appetite: 5, cravings: 9, symptoms: [] });

const PLAN_TOOLS = ['#start .module-content > .warning-box', '#start .module-content > .calculator'];
const PLAN_OUTPUT = ['#planToday', '#planSchedule'];
const DEPTH_AREA = ['#start .depth-controls', '#start .depth-content'];

// Each snapshot: which plan state to draw, what to hide so the part under test is in frame.
const SNAPSHOTS = [
  { name: 'start-empty', hide: DEPTH_AREA },
  { name: 'start-before', plan: plan(), today: '2026-11-13', hide: [...PLAN_TOOLS, ...DEPTH_AREA] },
  {
    name: 'start-active',
    plan: plan(),
    today: '2026-11-24',
    nowMinutes: 13 * 60,
    entries: [roughDay('2026-11-23')],
    hide: [...PLAN_TOOLS, ...DEPTH_AREA],
  },
  {
    name: 'start-active-dark',
    plan: plan(),
    today: '2026-11-24',
    nowMinutes: 22 * 60,
    entries: [roughDay('2026-11-23')],
    dark: true,
    hide: [...PLAN_TOOLS, ...DEPTH_AREA],
  },
  {
    name: 'start-repeat-rule-hit',
    plan: core.holdWeek(plan({ path: 'carbs' }), 1),
    today: '2026-11-26',
    entries: [roughDay('2026-11-23'), roughDay('2026-11-24'), roughDay('2026-11-25')],
    hide: [...PLAN_TOOLS, ...DEPTH_AREA],
  },
  { name: 'start-landed', plan: plan({ pace: 'standard' }), today: '2026-12-25', hide: [...PLAN_TOOLS, ...DEPTH_AREA] },
  { name: 'start-form', hide: ['#planToday', '#start .module-content > .warning-box', ...DEPTH_AREA] },
  { name: 'start-depth-basic', depth: 'basic', hide: [...PLAN_TOOLS, ...PLAN_OUTPUT] },
  { name: 'start-depth-detailed', depth: 'detailed', hide: [...PLAN_TOOLS, ...PLAN_OUTPUT] },
  { name: 'start-depth-technical', depth: 'technical', hide: [...PLAN_TOOLS, ...PLAN_OUTPUT] },
  { name: 'start-depth-basic-dark', depth: 'basic', dark: true, hide: [...PLAN_TOOLS, ...PLAN_OUTPUT] },
  { name: 'symptom-tracker', module: 'calculator', hide: ['#calculator .module-content > :not(#symptomTracker)'] },
];

function replaceOnce(html, search, replacement) {
  if (!html.includes(search)) throw new Error(`snapshot anchor not found in index.html: ${search}`);
  return html.replace(search, () => replacement);
}

function buildSnapshot(source, snapshot) {
  const shownModule = snapshot.module || 'start';
  const today = snapshot.today || '2026-11-16';
  const model = snapshot.plan
    ? core.todayModel(snapshot.plan, today, snapshot.nowMinutes ?? 12 * 60, snapshot.entries || [])
    : null;
  const css = `
    * { animation: none !important; transition: none !important; }
    body { zoom: 0.8; }
    .module:not(#${shownModule}) { display: none; }
    ${(snapshot.hide || []).join(', ') || '.snapshot-nothing'} { display: none !important; }
  `;

  let html = source.replace(/<script[\s\S]*?<\/script>/g, '');
  html = replaceOnce(html, '</style>', `${css}</style>`);
  html = replaceOnce(html, '<div id="planToday"></div>', `<div id="planToday">${view.todayHtml(model)}</div>`);
  html = replaceOnce(
    html,
    '<div id="planSchedule"></div>',
    `<div id="planSchedule">${snapshot.plan ? view.scheduleHtml(snapshot.plan, today) : ''}</div>`,
  );
  if (snapshot.depth && snapshot.depth !== 'basic') {
    html = replaceOnce(html, `class="depth-btn active" onclick="setDepth('start', 'basic')"`, 'class="depth-btn"');
    html = replaceOnce(html, `class="depth-btn" onclick="setDepth('start', '${snapshot.depth}')"`, 'class="depth-btn active"');
    html = replaceOnce(html, 'class="depth-content active" id="start-basic"', 'class="depth-content" id="start-basic"');
    html = replaceOnce(
      html,
      `class="depth-content" id="start-${snapshot.depth}"`,
      `class="depth-content active" id="start-${snapshot.depth}"`,
    );
  }
  if (snapshot.dark) html = replaceOnce(html, '<body>', '<body class="dark">');
  return html;
}

mkdirSync(outputDir, { recursive: true });
const source = readIndexHtml();
const files = SNAPSHOTS.map((snapshot) => {
  const file = join(outputDir, `${snapshot.name}.html`);
  writeFileSync(file, buildSnapshot(source, snapshot));
  return file;
});

execFileSync('qlmanage', ['-t', '-s', '1600', '-o', outputDir, ...files], { stdio: 'ignore' });
console.log(`[render-snapshots] wrote ${files.length} snapshots to ${outputDir}`);
files.forEach((file) => console.log(`[render-snapshots] ${file}.png`));
