/*
 * theme-init.test.js — Property 9 (standalone, no-build, Node built-ins only)
 *
 * Property 9: Theme initialization applies stored preference or dark default
 *   Validates Requirements 8.6, 8.7
 *
 *   For any stored localStorage value, initializing the Theme_Manager applies
 *   that value as the active theme when it is a valid theme ('dark' or 'light'),
 *   and applies the Dark_Theme when the stored value is absent or invalid.
 *
 * Run with:  node tests/theme-init.test.js
 *
 * Technique: load the REAL ThemeManager from js/main.js (not a reimplementation)
 * by reading the source with fs.readFileSync and compiling it inside a fresh
 * Node Module via module._compile, with document / localStorage / window stubs
 * injected as locals so the compiled code references the stubs. A single export
 * line is appended to the SOURCE STRING only (js/main.js on disk is untouched)
 * so we can retrieve the ThemeManager object.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');
const vm = require('vm');

const MAIN_JS = path.resolve(__dirname, '..', 'js', 'main.js');
const ITERATIONS = 200; // >= 100 required

/* ---------------------------------------------------------------------------
 * Stub factory. Rebuilt per iteration so each init() sees fresh global state.
 * ------------------------------------------------------------------------- */

// In-memory localStorage stub. `absent === true` makes getItem() return null
// for every key (simulating "no stored preference / key not set").
function makeLocalStorage(storedValue, absent) {
  const store = Object.create(null);
  if (!absent) {
    store['theme-preference'] = storedValue;
  }
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

// Minimal document stub: documentElement with get/setAttribute backed by a
// plain object, a classList no-op (RevealController.init touches it), and
// getElementById that always returns null so the toggle wiring is skipped.
function makeDocument() {
  const attrs = Object.create(null);
  const documentElement = {
    _attrs: attrs,
    getAttribute: function (name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    setAttribute: function (name, value) {
      attrs[name] = String(value);
    },
    classList: {
      add: function () {},
      remove: function () {},
      contains: function () { return false; }
    }
  };
  return {
    documentElement: documentElement,
    getElementById: function () { return null; },
    querySelectorAll: function () { return []; }
  };
}

// window stub with matchMedia returning { matches: false } (reduced motion off).
function makeWindow() {
  return {
    matchMedia: function () { return { matches: false }; }
  };
}

/* ---------------------------------------------------------------------------
 * Load the real ThemeManager with the stubs in lexical scope.
 *
 * module._compile wraps the source in a function receiving (exports, require,
 * module, __filename, __dirname). To expose our stubs as the globals the source
 * references (document, localStorage, window), we compile a thin wrapper whose
 * parameters are those names, then invoke it with our stub instances.
 * ------------------------------------------------------------------------- */

const RAW_SOURCE = fs.readFileSync(MAIN_JS, 'utf8')
  // Append to the source STRING only — never written back to disk.
  + '\n;module.exports.ThemeManager = ThemeManager;';

function loadThemeManager(stubs) {
  // Build a fresh module and compile a wrapper that shadows the three globals
  // with our stub parameters, so the real code inside references the stubs.
  const m = new Module(MAIN_JS, null);
  m.filename = MAIN_JS;
  m.paths = Module._nodeModulePaths(path.dirname(MAIN_JS));

  const wrapped =
    '(function (document, localStorage, window) {' +
    RAW_SOURCE +
    '\n})(__stub_document, __stub_localStorage, __stub_window);';

  // Expose the stubs to the wrapper via globals scoped to this compile. We set
  // them on globalThis just before compile and delete them right after so they
  // do not leak between iterations.
  globalThis.__stub_document = stubs.document;
  globalThis.__stub_localStorage = stubs.localStorage;
  globalThis.__stub_window = stubs.window;
  try {
    m._compile(wrapped, MAIN_JS);
  } finally {
    delete globalThis.__stub_document;
    delete globalThis.__stub_localStorage;
    delete globalThis.__stub_window;
  }
  return m.exports.ThemeManager;
}

/* ---------------------------------------------------------------------------
 * Verify the compile+inject technique actually binds the real code to the
 * stubs before running the property loop. If this fails, the test setup is
 * broken (not the implementation) and we should abort loudly.
 * ------------------------------------------------------------------------- */

(function sanityCheck() {
  const stubs = { document: makeDocument(), localStorage: makeLocalStorage(null, true), window: makeWindow() };
  const TM = loadThemeManager(stubs);
  if (!TM || typeof TM.init !== 'function' || typeof TM.resolveInitial !== 'function') {
    console.error('FAIL: could not load the real ThemeManager from js/main.js');
    process.exit(1);
  }
  // Suppress unused var lint-style concerns; vm import kept for parity/debugging.
  void vm;
})();

/* ---------------------------------------------------------------------------
 * Input generation: a mix of valid themes, the absent case, and invalid tokens.
 * Returns { value, absent } describing the localStorage state to set up.
 * ------------------------------------------------------------------------- */

const VALID_THEMES = ['dark', 'light'];
const INVALID_TOKENS = ['', 'blue', 'DARK', 'Light', 'system', 'auto', 'red', ' dark', 'dark ', 'light!', '0', 'null', 'undefined', 'LIGHT'];

function randInt(n) {
  return Math.floor(Math.random() * n);
}

function generateInput() {
  const bucket = randInt(3);
  if (bucket === 0) {
    // valid theme
    return { value: VALID_THEMES[randInt(VALID_THEMES.length)], absent: false };
  }
  if (bucket === 1) {
    // absent (null — key not set)
    return { value: null, absent: true };
  }
  // invalid string (or a random token)
  if (randInt(2) === 0) {
    return { value: INVALID_TOKENS[randInt(INVALID_TOKENS.length)], absent: false };
  }
  // random junk token
  const junk = Math.random().toString(36).slice(2, 2 + randInt(8));
  return { value: junk, absent: false };
}

function expectedTheme(input) {
  if (!input.absent && (input.value === 'dark' || input.value === 'light')) {
    return input.value;
  }
  return 'dark';
}

/* ---------------------------------------------------------------------------
 * Run one case: reset stubs to the generated state, init(), read data-theme.
 * ------------------------------------------------------------------------- */

function runCase(input) {
  const document = makeDocument();
  const localStorage = makeLocalStorage(input.value, input.absent);
  const window = makeWindow();

  const TM = loadThemeManager({ document: document, localStorage: localStorage, window: window });
  TM.init();

  const applied = document.documentElement.getAttribute('data-theme');
  const expected = expectedTheme(input);

  if (applied !== expected) {
    const shown = input.absent ? 'ABSENT(null)' : JSON.stringify(input.value);
    console.error('FAIL: Property 9 violated.');
    console.error('  stored value : ' + shown);
    console.error('  expected     : ' + expected);
    console.error('  applied      : ' + JSON.stringify(applied));
    process.exit(1);
  }
}

/* ---------------------------------------------------------------------------
 * Main: explicit edge cases + randomized property loop (>= 100 iterations).
 * ------------------------------------------------------------------------- */

function main() {
  // Explicit edge cases required by the task.
  runCase({ value: null, absent: true });   // absent → dark
  runCase({ value: '', absent: false });     // empty string → dark
  runCase({ value: 'dark', absent: false }); // valid dark
  runCase({ value: 'light', absent: false });// valid light

  // Randomized property loop.
  for (let i = 0; i < ITERATIONS; i++) {
    runCase(generateInput());
  }

  console.log('PASS: Property 9 (theme initialization applies stored preference or dark default)');
  console.log('  iterations: ' + (ITERATIONS + 4) + ' (incl. explicit edge cases: null, "", dark, light)');
  process.exit(0);
}

main();
