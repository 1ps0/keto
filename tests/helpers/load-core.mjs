// Loads the DOM-free script blocks out of index.html so they can be tested without a browser.
// The app ships as one HTML file; plan logic and plan HTML builders each live in their own block.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const indexPath = fileURLToPath(new URL('../../index.html', import.meta.url));

export function readIndexHtml() {
  return readFileSync(indexPath, 'utf8');
}

export function scriptBlock(html, id) {
  const match = html.match(new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`));
  if (!match) {
    throw new Error(`index.html has no <script id="${id}"> block`);
  }
  return match[1];
}

export function loadPlanCore() {
  return new Function(`${scriptBlock(readIndexHtml(), 'plan-core')}\nreturn PlanCore;`)();
}

export function loadPlanView() {
  const html = readIndexHtml();
  return new Function(`${scriptBlock(html, 'plan-core')}\n${scriptBlock(html, 'plan-view')}\nreturn PlanView;`)();
}
