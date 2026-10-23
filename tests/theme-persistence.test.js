/*
 * theme-persistence.test.js — Property 8: Theme persistence round-trip
 *
 * Validates: Requirements 8.5
 *
 * Property: For any sequence of theme toggles, after each toggle the value
 * stored in localStorage under the Theme_Preference key ('theme-preference')
 * equals the theme currently applied via `data-theme` on
 * document.documentElement.
 *
 * This is a standalone, no-build property test runnable with:
 *     node tests/theme-persistence.test.js
 *
 * It uses only Node built-ins. The real ThemeManager from js/main.js is loaded
 * by reading the file source and compiling it with an appended CommonJS export
 * (`module.exports.ThemeManager = ThemeManager;`) added to the in-memory source
 * string only — the on-disk file is never modified. Before compiling, global
 * stubs for `document`, `localStorage`, and `window` are installed so the real
 * ThemeManager references them: `toggle` writes to the stub localStorage and
 * calls `apply`, which writes `data-theme` on the stub documentElement.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

const MAIN_JS_PATH = path.resolve(__dirname, '..', 'js', 'main.js');
const STORAGE_KEY = 'theme-preference';
const ITERATIONS = 100;
const MAX_TOGGLES_PER_ITERATION = 10;

/* ---------------------------------------------------------------------------
 * In-memory stubs for the browser globals ThemeManager touches.
 * --------------------------------------------------------------------------- */

// documentElement backed by a plain attribute bag so get/setAttribute round-trip.
function makeDocumentElement() {
  const attrs = Object.create(null);
  return {
    _attrs: attrs,
    getAttribute: function (name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    setAttribute: function (name, value) {
      attrs[name] = String(value);
    },
    classList: {
      // ThemeManager does not use classList, but RevealController might if the
      // module touches it at load time; provide a harmless no-op.
      add: function () {},
      remove: function () {},
      contains: function () { return false; }
    }
  };
}

// In-memory localStorage backed by a Map.
function makeLocalStorage() {
  const map = new Map();
  return {
    getItem: function (key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem: function (key, value) {
      map.set(String(key), String(value));
    },
    removeItem: function (key) {
      map.delete(key);
    },
    clear: function () {
      map.clear();
    }
  };
}

function installGlobals() {
  const documentElement = makeDocumentElement();

  const documentStub = {
    documentElement: documentElement,
    // No #theme-toggle button in this headless test → ThemeManager.apply and
    // init both guard on a null button and skip the a11y/listener wiring.
    getElementById: function () { return null; }
  };

  const localStorageStub = makeLocalStorage();

  const windowStub = {
    matchMedia: function () { return { matches: false }; },
    localStorage: localStorageStub
  };

  global.document = documentStub;
  global.window = windowStub;
  global.localStorage = localStorageStub;

  return { documentStub, windowStub, localStorageStub, documentElement };
}

/* ---------------------------------------------------------------------------
 * Load the real ThemeManager from js/main.js.
 *
 * main.js declares ThemeManager with a top-level `const` and only exports the
 * pure helpers, so we append an export line to the in-memory source and compile
 * it as a CommonJS module. Globals are installed first so the compiled code
 * closes over our stubs (main.js reads `document`/`window`/`localStorage` as
 * globals). The `typeof document !== 'undefined'` guard at the bottom of
 * main.js will call ThemeManager.init()/RevealController.init(); both guard on
 * the (null) #theme-toggle and the stub querySelectorAll, so this is harmless.
 * --------------------------------------------------------------------------- */
function loadThemeManager() {
  const src = fs.readFileSync(MAIN_JS_PATH, 'utf8');
  // RevealController.init() calls document.querySelectorAll + possibly
  // IntersectionObserver. Provide safe stubs so load-time init does not throw.
  global.document.querySelectorAll = function () { return []; };

  const m = new Module('main-under-test', null);
  m.filename = MAIN_JS_PATH;
  m.paths = Module._nodeModulePaths(path.dirname(MAIN_JS_PATH));
  m._compile(
    src + '\n;module.exports = (module.exports || {}); module.exports.ThemeManager = ThemeManager;\n',
    MAIN_JS_PATH
  );

  const ThemeManager = m.exports && m.exports.ThemeManager;
  if (!ThemeManager || typeof ThemeManager.toggle !== 'function') {
    throw new Error('Failed to load the real ThemeManager from js/main.js');
  }
  return ThemeManager;
}

/* ---------------------------------------------------------------------------
 * Deterministic-but-varied PRNG (so a failure is reproducible via the seed).
 * --------------------------------------------------------------------------- */
function makeRng(seed) {
  let state = seed >>> 0;
  return function next() {
    // xorshift32
    state ^= state << 13; state >>>= 0;
    state ^= state >> 17; state >>>= 0;
    state ^= state << 5;  state >>>= 0;
    return state / 0xffffffff;
  };
}

function randInt(rng, minInclusive, maxInclusive) {
  return minInclusive + Math.floor(rng() * (maxInclusive - minInclusive + 1));
}

/* ---------------------------------------------------------------------------
 * The property.
 * --------------------------------------------------------------------------- */
function run() {
  const env = installGlobals();
  const ThemeManager = loadThemeManager();

  const docEl = global.document.documentElement;
  const storage = global.localStorage;
  const seedBase = 0x9e3779b9;

  for (let i = 0; i < ITERATIONS; i++) {
    const rng = makeRng((seedBase + i * 2654435761) >>> 0);

    // Start from an applied theme with localStorage initially consistent.
    const startTheme = rng() < 0.5 ? 'dark' : 'light';
    docEl.setAttribute('data-theme', startTheme);
    storage.setItem(ThemeManager.STORAGE_KEY, startTheme);

    const toggleCount = randInt(rng, 1, MAX_TOGGLES_PER_ITERATION);

    for (let t = 0; t < toggleCount; t++) {
      // Drive the toggle using whatever theme is currently applied, mirroring
      // the real click handler which reads data-theme each time.
      const current = docEl.getAttribute('data-theme');
      ThemeManager.toggle(current);

      const applied = docEl.getAttribute('data-theme');
      const stored = storage.getItem(ThemeManager.STORAGE_KEY);

      if (stored !== applied) {
        console.error('FAIL: Property 8 (Theme persistence round-trip) violated.');
        console.error('  Validates: Requirements 8.5');
        console.error('  Iteration:        ' + i);
        console.error('  Start theme:      ' + startTheme);
        console.error('  Toggle index:     ' + t + ' of ' + toggleCount);
        console.error('  Applied data-theme: ' + JSON.stringify(applied));
        console.error('  Stored preference:  ' + JSON.stringify(stored));
        console.error('  Expected stored === applied, but they differ.');
        process.exit(1);
      }
    }
  }

  console.log(
    'PASS: Property 8 (Theme persistence round-trip) — '
      + ITERATIONS + ' iterations, up to ' + MAX_TOGGLES_PER_ITERATION
      + ' toggles each. localStorage[\'' + ThemeManager.STORAGE_KEY
      + '\'] matched data-theme after every toggle. (Validates: Requirements 8.5)'
  );
  process.exit(0);
}

run();
