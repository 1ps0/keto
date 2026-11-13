// Boots the page's real scripts against a minimal fake DOM, so the wiring between form,
// state, storage and rendered HTML can be tested with plain node (no browser is installed here).
// Only ids that exist in index.html resolve, so a mistyped id fails the same way it would in a browser.
import { readIndexHtml, scriptBlock } from './load-core.mjs';

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.value = '';
    this.checked = false;
    this.innerHTML = '';
    this.textContent = '';
    this.style = {};
    this.found = {};
    this.scrolledIntoView = 0;
    const classes = new Set();
    this.classList = {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      toggle: (name) => (classes.has(name) ? classes.delete(name) : classes.add(name)),
      contains: (name) => classes.has(name),
    };
  }
  querySelector(selector) { return this.found[selector] || null; }
  querySelectorAll() { return []; }
  insertAdjacentHTML(position, html) { this.innerHTML += html; }
  scrollIntoView() { this.scrolledIntoView += 1; }
  contains() { return false; }
  appendChild() {}
  removeChild() {}
  remove() {}
  click() {}
  addEventListener() {}
}

export class FakeStorage {
  constructor(initial = {}) { this.items = new Map(Object.entries(initial)); }
  getItem(key) { return this.items.has(key) ? this.items.get(key) : null; }
  setItem(key, value) { this.items.set(key, String(value)); }
  removeItem(key) { this.items.delete(key); }
}

const SCOPE_ACCESS = `
return {
  get: (name) => eval(name),
  set: (name, value) => { eval(name + ' = value'); },
};`;

export function bootApp({ storage = new FakeStorage(), now = new Date(2026, 10, 16, 12, 0) } = {}) {
  const html = readIndexHtml();
  const elements = new Map(
    [...html.matchAll(/\bid="([^"$]+)"/g)].map((match) => [match[1], new FakeElement(match[1])]),
  );
  const statusGrid = new FakeElement();
  if (elements.has('dataStatus')) elements.get('dataStatus').found['.status-grid'] = statusGrid;

  const listeners = {};
  const app = {
    storage,
    now,
    statusGrid,
    confirmAnswer: true,
    confirms: [],
    alerts: [],
    downloads: [],
    lastUrl: '',
  };

  const document = {
    body: new FakeElement('body'),
    documentElement: { scrollHeight: 2000 },
    getElementById: (id) => elements.get(id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => new FakeElement(),
    addEventListener: (type, listener) => { (listeners[type] ||= []).push(listener); },
  };
  const window = {
    location: { search: '', pathname: '/index.html' },
    history: { replaceState: (state, title, url) => { app.lastUrl = url; } },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    pageYOffset: 0,
    innerHeight: 800,
  };
  class FakeBlob {
    constructor(parts) { this.text = parts.join(''); }
  }
  class FakeFileReader {
    readAsText(file) { this.onload({ target: { result: file.text } }); }
  }
  const fakes = {
    document,
    window,
    localStorage: storage,
    sessionStorage: new FakeStorage(),
    confirm: (message) => { app.confirms.push(message); return app.confirmAnswer; },
    alert: (message) => { app.alerts.push(message); },
    setInterval: () => 0,
    setTimeout: () => 0,
    Blob: FakeBlob,
    URL: { createObjectURL: (blob) => { app.downloads.push(blob.text); return 'blob:fake'; } },
    FileReader: FakeFileReader,
  };

  const source = ['plan-core', 'plan-view', 'app'].map((id) => scriptBlock(html, id)).join('\n');
  const scope = new Function(...Object.keys(fakes), source + SCOPE_ACCESS)(...Object.values(fakes));

  scope.set('planNow', () => app.now);
  (listeners.DOMContentLoaded || []).forEach((listener) => listener());

  app.el = (id) => {
    const element = elements.get(id);
    if (!element) throw new Error(`index.html has no element with id "${id}"`);
    return element;
  };
  app.call = (name, ...args) => scope.get(name)(...args);
  app.state = () => scope.get('appState');
  app.savedState = () => JSON.parse(storage.getItem('ketoAppState'));
  app.fill = (values) => {
    for (const [id, value] of Object.entries(values)) app.el(id).value = value;
  };
  return app;
}
