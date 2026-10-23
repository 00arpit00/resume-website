/*
 * tests/theme-involution.test.js — Property 7: Theme toggle is an involution
 *
 * Validates: Requirements 8.4
 *
 * Property 7 (Theme toggle is an involution): For any starting theme in
 * {dark, light}, invoking the toggle once yields the opposite theme, and
 * invoking it twice returns the active theme to the original starting theme.
 *
 * This is a self-contained Node script (no external deps — only `assert`,
 * `fs`, `path`). It exercises the REAL `ThemeManager.toggle`/`apply` logic from
 * ../js/main.js. Because `ThemeManager` is declared with `const` at the top of
 * main.js and is NOT part of the file's guarded CommonJS export, we cannot
 * simply `require()` it. Instead we:
 *
 *   1. Build minimal in-memory stubs for the browser globals that
 *      ThemeManager.toggle/apply touch: `document` (with a documentElement that
 *      supports get/setAttribute and a getElementById that returns null so the
 *      toggle-button branch is skipped) and `localStorage` (an in-memory stub).
 *      A `window.matchMedia` stub is included for completeness even though the
 *      involution path does not use it.
 *   2. Read js/main.js as text and append `;module.exports.ThemeManager = ...`
 *      to the SOURCE STRING ONLY (never written to disk) so we can retrieve the
 *      real object after evaluation.
 *   3. Evaluate that source with `new Function(...)`, injecting the stubs as
 *      `document`, `window`, `localStorage` so the file runs under Node exactly
 *      as it would in a browser, and capture `module.exports`.
 *
 * Run with:  node tests/theme-involution.test.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// 1. Minimal browser-global stubs
// ---------------------------------------------------------------------------

// A stub <html> element exposing just the attribute API ThemeManager uses.
function makeDocumentStub() {
  const attrs = Object.create(null);
  const documentElement = {
    getAttribute: function (name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    setAttribute: function (name, value) {
      attrs[name] = String(value);
    },
    // RevealController.init() calls classList.add('js-enabled'); harmless no-op.
    classList: { add: function () {} }
  };
  return {
    documentElement: documentElement,
    // Returning null makes ThemeManager.apply/init skip the toggle-button
    // branch, so we test the pure data-theme + return-value involution logic.
    getElementById: function () { return null; },
    // RevealController.init() calls querySelectorAll; return an empty list.
    querySelectorAll: function () { return []; }
  };
}

// In-memory localStorage stub (enough for getItem/setItem).
function makeLocalStorageStub() {
  const store = Object.create(null);
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem: function (key, value) {
      store[key] = String(value);
    },
    removeItem: function (key) {
      delete store[key];
    }
  };
}

// window stub — matchMedia is not exercised by the involution path, but
// RevealController.shouldAnimate() references window.matchMedia and
// 'IntersectionObserver' in window, so provide safe values.
function makeWindowStub() {
  return {
    matchMedia: function () { return { matches: false }; }
    // No IntersectionObserver → RevealController falls back to revealAll([]).
  };
}

// ---------------------------------------------------------------------------
// 2. Load the real ThemeManager from js/main.js without modifying the file
// ---------------------------------------------------------------------------

function loadThemeManager(documentStub, windowStub, localStorageStub) {
  const mainPath = path.resolve(__dirname, '..', 'js', 'main.js');
  const src = fs.readFileSync(mainPath, 'utf8')
    // Expose the const-declared ThemeManager via the module.exports object.
    // Appended to the source string in memory ONLY — js/main.js is untouched.
    + '\n;module.exports.ThemeManager = ThemeManager;';

  const moduleObj = { exports: {} };

  // Evaluate main.js with the browser globals injected as parameters. This runs
  // the file exactly as a browser classic script would (the `typeof document`
  // guard sees our stub and runs init(), which is why the stubs above cover the
  // few methods init/apply/RevealController touch).
  const factory = new Function(
    'module',
    'exports',
    'document',
    'window',
    'localStorage',
    src
  );
  factory(moduleObj, moduleObj.exports, documentStub, windowStub, localStorageStub);

  const ThemeManager = moduleObj.exports.ThemeManager;
  assert.ok(
    ThemeManager && typeof ThemeManager.toggle === 'function',
    'Failed to load a real ThemeManager with a toggle() function from js/main.js'
  );
  return ThemeManager;
}

// ---------------------------------------------------------------------------
// 3. Property-based test: toggle is an involution
// ---------------------------------------------------------------------------

function opposite(theme) {
  return theme === 'dark' ? 'light' : 'dark';
}

function run() {
  const documentStub = makeDocumentStub();
  const windowStub = makeWindowStub();
  const localStorageStub = makeLocalStorageStub();

  const ThemeManager = loadThemeManager(documentStub, windowStub, localStorageStub);

  const THEMES = ['dark', 'light'];
  const ITERATIONS = 200; // >= 100 required by the property

  for (let i = 0; i < ITERATIONS; i++) {
    // Pick a random starting theme from {dark, light}.
    const start = THEMES[Math.floor(Math.random() * THEMES.length)];

    // Establish the starting state on the stubbed <html data-theme>.
    documentStub.documentElement.setAttribute('data-theme', start);

    // One toggle must yield the opposite theme...
    const once = ThemeManager.toggle(start);
    if (once !== opposite(start)) {
      console.error(
        'FAIL (Property 7, iteration ' + i + '): one toggle of "' + start
          + '" yielded "' + once + '", expected "' + opposite(start) + '".'
      );
      process.exit(1);
    }
    // ...and apply() must have written that theme to data-theme.
    const appliedOnce = documentStub.documentElement.getAttribute('data-theme');
    if (appliedOnce !== once) {
      console.error(
        'FAIL (Property 7, iteration ' + i + '): after one toggle data-theme is "'
          + appliedOnce + '", expected applied value "' + once + '".'
      );
      process.exit(1);
    }

    // A second toggle must return to the original starting theme (involution).
    const twice = ThemeManager.toggle(once);
    if (twice !== start) {
      console.error(
        'FAIL (Property 7, iteration ' + i + '): two toggles of "' + start
          + '" yielded "' + twice + '", expected the original "' + start + '".'
      );
      process.exit(1);
    }
    const appliedTwice = documentStub.documentElement.getAttribute('data-theme');
    if (appliedTwice !== start) {
      console.error(
        'FAIL (Property 7, iteration ' + i + '): after two toggles data-theme is "'
          + appliedTwice + '", expected the original "' + start + '".'
      );
      process.exit(1);
    }
  }

  console.log(
    'PASS (Property 7 — theme toggle is an involution): '
      + ITERATIONS + ' randomized iterations over {dark, light}. '
      + 'One toggle yields the opposite theme; two toggles return to the start.'
  );
  process.exit(0);
}

run();
