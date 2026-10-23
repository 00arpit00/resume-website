/*
 * tests/reveal-controller.test.js — Unit tests for RevealController (task 6.2)
 *
 * Verifies the reveal behavior of RevealController in js/main.js:
 *   1. reveal(el) is idempotent — one or many calls leave the element with the
 *      'is-revealed' class exactly once.                       (Req 3.6)
 *   2. revealAll(entries) marks every entry revealed.          (Req 3.8, 9.3)
 *   3. shouldAnimate() returns true only when IntersectionObserver exists AND
 *      reduced motion is not requested; false otherwise.       (Req 3.6, 9.3)
 *
 * RevealController is declared with a top-level `const` in js/main.js and is
 * NOT exported. To exercise the real implementation without modifying the
 * source, this harness reads js/main.js, appends an export line to the SOURCE
 * STRING ONLY, and compiles it in a fresh vm context with `window`/`document`
 * stubs injected as context globals. No source file is touched on disk.
 *
 * Runnable with: node tests/reveal-controller.test.js
 */

'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

// ---------------------------------------------------------------------------
// Fake DOM primitives
// ---------------------------------------------------------------------------

// A minimal classList stand-in whose `add` dedupes via a Set — exactly the
// semantics the real DOM classList guarantees and that make reveal() idempotent.
function makeClassList() {
  return {
    _set: new Set(),
    add: function (c) { this._set.add(c); },
    contains: function (c) { return this._set.has(c); }
  };
}

// A fake element: only the `classList` the controller touches.
function makeEl() {
  return { classList: makeClassList() };
}

// ---------------------------------------------------------------------------
// Load the real RevealController from js/main.js via vm, with stubs in scope.
// ---------------------------------------------------------------------------

function loadRevealController(windowStub) {
  var mainPath = path.join(__dirname, '..', 'js', 'main.js');
  var source = fs.readFileSync(mainPath, 'utf8');

  // Append (to the source STRING only) an export so we can retrieve the
  // top-level `const RevealController`. The existing CommonJS block in main.js
  // only exports the pure helpers, so this line adds RevealController onto the
  // same module.exports object.
  source += '\n;module.exports.RevealController = RevealController;\n';

  // `document` stub. main.js runs its init block when `document` is defined
  // (ThemeManager.init() then RevealController.init()). init() is NOT the focus
  // of these tests, but it must run without throwing, so the stub covers the
  // handful of members those paths touch: documentElement (setAttribute +
  // classList), getElementById (toggle button is absent → both inits bail
  // early after guards), and querySelectorAll (no entries).
  var documentStub = {
    documentElement: {
      classList: makeClassList(),
      setAttribute: function () {},
      getAttribute: function () { return null; }
    },
    getElementById: function () { return null; },
    querySelectorAll: function () { return []; }
  };

  var moduleStub = { exports: {} };

  var sandbox = {
    window: windowStub,
    document: documentStub,
    module: moduleStub,
    // Node globals the source's Object.assign / Array calls rely on.
    Object: Object,
    Array: Array
  };

  // In a browser, IntersectionObserver is a global as well as a `window`
  // member. RevealController.init() checks `'IntersectionObserver' in window`
  // but constructs it via the bare global, so mirror the window stub's value
  // onto the sandbox global to match browser semantics when present.
  if (windowStub.IntersectionObserver) {
    sandbox.IntersectionObserver = windowStub.IntersectionObserver;
  }

  vm.runInNewContext(source, sandbox, { filename: mainPath });
  return moduleStub.exports.RevealController;
}

// Build a window stub for a given (IntersectionObserver present?, reduced?) pair.
function makeWindow(hasIO, reduced) {
  var win = {
    matchMedia: function () {
      return { matches: reduced };
    }
  };
  if (hasIO) {
    // Presence is all shouldAnimate() checks via `'IntersectionObserver' in window`.
    win.IntersectionObserver = function () {};
  }
  return win;
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

function fail(message) {
  console.error('FAIL: ' + message);
  process.exit(1);
}

function run() {
  // --- Test 1: reveal(el) is idempotent -----------------------------------
  // Load with a benign window; reveal does not depend on window state.
  var RC1 = loadRevealController(makeWindow(true, false));
  assert.ok(RC1 && typeof RC1.reveal === 'function',
    'RevealController.reveal should be a function');

  var el = makeEl();
  RC1.reveal(el);
  RC1.reveal(el);
  RC1.reveal(el);
  if (!el.classList.contains('is-revealed')) {
    fail('reveal(el) should add the "is-revealed" class');
  }
  if (el.classList._set.size !== 1) {
    fail('reveal(el) called repeatedly should leave exactly one class, got '
      + el.classList._set.size);
  }

  // --- Test 2: revealAll(entries) marks every entry revealed ---------------
  assert.ok(typeof RC1.revealAll === 'function',
    'RevealController.revealAll should be a function');

  var els = [makeEl(), makeEl(), makeEl()];
  RC1.revealAll(els);
  els.forEach(function (e, i) {
    if (!e.classList.contains('is-revealed')) {
      fail('revealAll should reveal entry at index ' + i);
    }
    if (e.classList._set.size !== 1) {
      fail('revealAll entry at index ' + i + ' should have exactly one class');
    }
  });

  // --- Test 3: shouldAnimate() matrix --------------------------------------
  // Each case needs the controller loaded against the matching window stub,
  // because shouldAnimate reads the bound `window` from compile scope.
  var cases = [
    { hasIO: true, reduced: false, expected: true },   // IO present, motion ok  → animate
    { hasIO: true, reduced: true, expected: false },   // IO present, reduced    → no animate
    { hasIO: false, reduced: false, expected: false },  // no IO, motion ok       → no animate
    { hasIO: false, reduced: true, expected: false }    // no IO, reduced         → no animate
  ];

  cases.forEach(function (c) {
    var win = makeWindow(c.hasIO, c.reduced);
    var RC = loadRevealController(win);
    assert.ok(typeof RC.shouldAnimate === 'function',
      'RevealController.shouldAnimate should be a function');
    var got = RC.shouldAnimate();
    if (got !== c.expected) {
      fail('shouldAnimate() with IntersectionObserver=' + c.hasIO
        + ', reducedMotion=' + c.reduced
        + ' should be ' + c.expected + ' but got ' + got);
    }
  });

  console.log('PASS: RevealController reveal behavior');
  console.log('  - reveal(el) is idempotent (exactly one "is-revealed")');
  console.log('  - revealAll(entries) reveals all 3 entries');
  console.log('  - shouldAnimate() matrix over (IntersectionObserver, reduced-motion)');
  process.exit(0);
}

run();
