/*
 * tests/experience-order.test.js — Property 1: Experience render order and
 * chronological invariant
 *
 * Validates: Requirements 3.1
 *
 * Property 1 has two halves:
 *   (A) Render order (universal): For ANY list of experience entries, rendering
 *       the timeline (mapping each entry through renderExperienceEntry and
 *       joining) produces rendered entries in exactly the same order as the
 *       input list — 1:1, no reordering, no omission, no duplication.
 *   (B) Chronological invariant (actual data): For the resume's real ordered
 *       experience data, every entry's `start` date is >= the start date of the
 *       entry that follows it (most-recent-first). Concretely there are exactly
 *       3 entries with starts '2025-12', '2019-07', '2018-06' in that order.
 *
 * Self-contained Node script — only built-ins (`assert`, `fs`, `path`). Part A
 * uses the REAL guarded-CommonJS export `renderExperienceEntry` via require().
 * Part B needs `RESUME`, which main.js declares with `const` but does NOT
 * export. Mirroring tests/theme-involution.test.js, we read main.js as text,
 * append `;module.exports.RESUME = RESUME;` to the SOURCE STRING ONLY (the file
 * on disk is never modified), evaluate it with `new Function(...)` injecting
 * browser-global stubs, and capture the real RESUME so Part B guards actual
 * resume data. If that source-compile path fails for any reason, Part B falls
 * back to the requirements-mirrored expected ordering fixture.
 *
 * Run with:  node tests/experience-order.test.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// The requirements-mirrored expected ordering of the real resume data
// (most-recent-first). Used to assert Part B and as the fallback fixture.
const EXPECTED_STARTS = ['2025-12', '2019-07', '2018-06'];

// ---------------------------------------------------------------------------
// Load the real render helper (guarded CommonJS export) for Part A.
// ---------------------------------------------------------------------------

const mainPath = path.resolve(__dirname, '..', 'js', 'main.js');
const main = require(mainPath);
assert.ok(
  main && typeof main.renderExperienceEntry === 'function',
  'Failed to load renderExperienceEntry from js/main.js'
);
const renderExperienceEntry = main.renderExperienceEntry;

// ---------------------------------------------------------------------------
// Browser-global stubs so main.js can be source-compiled under Node to recover
// the non-exported RESUME object (same approach as theme-involution.test.js).
// ---------------------------------------------------------------------------

function makeDocumentStub() {
  const attrs = Object.create(null);
  const documentElement = {
    getAttribute: function (name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    setAttribute: function (name, value) { attrs[name] = String(value); },
    classList: { add: function () {} }
  };
  return {
    documentElement: documentElement,
    getElementById: function () { return null; },
    querySelectorAll: function () { return []; }
  };
}

function makeWindowStub() {
  return { matchMedia: function () { return { matches: false }; } };
}

function makeLocalStorageStub() {
  const store = Object.create(null);
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem: function (key, value) { store[key] = String(value); },
    removeItem: function (key) { delete store[key]; }
  };
}

// Returns the real RESUME object from js/main.js, or null if the source-compile
// path fails (so the caller can fall back to the mirrored fixture).
function loadRealResume() {
  try {
    const src = fs.readFileSync(mainPath, 'utf8')
      // Appended to the in-memory source string ONLY — js/main.js is untouched.
      + '\n;module.exports.RESUME = RESUME;';
    const moduleObj = { exports: {} };
    const factory = new Function(
      'module', 'exports', 'document', 'window', 'localStorage', src
    );
    factory(
      moduleObj, moduleObj.exports,
      makeDocumentStub(), makeWindowStub(), makeLocalStorageStub()
    );
    const resume = moduleObj.exports.RESUME;
    if (resume && Array.isArray(resume.experience)) {
      return resume;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tiny deterministic-enough random generator for synthetic experience entries.
// ---------------------------------------------------------------------------

function randInt(minInclusive, maxInclusive) {
  return minInclusive + Math.floor(Math.random() * (maxInclusive - minInclusive + 1));
}

// Build a synthetic experience entry whose fields carry a per-entry unique
// token so the ordering check can locate each rendered entry unambiguously in
// the combined output (no substring collisions between entries).
function makeSyntheticEntry(token) {
  const achievementCount = randInt(1, 4);
  const achievements = [];
  for (let a = 0; a < achievementCount; a++) {
    achievements.push('Achievement ' + token + '_' + a + ' did a measurable thing');
  }
  return {
    token: token,
    title: 'Title_' + token,
    employer: 'Employer_' + token,
    dates: 'Dates_' + token,
    location: 'Location_' + token,
    achievements: achievements
  };
}

// Generate a random list of N (1..8) synthetic entries with distinct tokens.
function makeSyntheticList() {
  const n = randInt(1, 8);
  const entries = [];
  for (let i = 0; i < n; i++) {
    // Token combines the iteration-unique index with a random suffix so tokens
    // are unique within the list and unlikely to appear as substrings of one
    // another (zero-padded index + random base36 tail).
    const token = 'E' + String(i).padStart(2, '0') + 'r' + randInt(100000, 999999).toString(36);
    entries.push(makeSyntheticEntry(token));
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Part A — render order property (>= 100 iterations)
// ---------------------------------------------------------------------------

function runPartA() {
  const ITERATIONS = 200; // >= 100 required by the property
  // A rendered entry block is one <article class="timeline-entry"> ... from
  // renderExperienceEntry; count occurrences to assert 1:1 (no omission/dupe).
  const BLOCK_MARKER = '<article class="timeline-entry">';

  for (let i = 0; i < ITERATIONS; i++) {
    const input = makeSyntheticList();

    // Build the timeline exactly as production would: map through the real
    // render helper and join.
    const combined = input.map(renderExperienceEntry).join('');

    // (1) 1:1 block count — number of rendered entry blocks equals input length.
    let blockCount = 0;
    let scan = combined.indexOf(BLOCK_MARKER);
    while (scan !== -1) {
      blockCount++;
      scan = combined.indexOf(BLOCK_MARKER, scan + BLOCK_MARKER.length);
    }
    if (blockCount !== input.length) {
      console.error(
        'FAIL (Property 1 / Part A, iteration ' + i + '): rendered '
          + blockCount + ' entry blocks for an input of ' + input.length
          + ' — expected a 1:1 mapping (no omission or duplication).'
      );
      process.exit(1);
    }

    // (2) Order preservation — the index of each entry's unique title token in
    // the combined output must be strictly increasing in input order.
    let previousIndex = -1;
    for (let j = 0; j < input.length; j++) {
      const marker = 'Title_' + input[j].token;
      const at = combined.indexOf(marker);
      if (at === -1) {
        console.error(
          'FAIL (Property 1 / Part A, iteration ' + i + '): entry ' + j
            + ' marker "' + marker + '" was omitted from the rendered output.'
        );
        process.exit(1);
      }
      if (at <= previousIndex) {
        console.error(
          'FAIL (Property 1 / Part A, iteration ' + i + '): entry ' + j
            + ' ("' + marker + '") appears at index ' + at
            + ', not strictly after the previous entry (index ' + previousIndex
            + ') — render order does not match input order.'
        );
        process.exit(1);
      }
      previousIndex = at;
    }
  }

  console.log(
    'PASS (Property 1 / Part A — render order): ' + ITERATIONS
      + ' randomized iterations over lists of 1..8 synthetic entries. '
      + 'Rendered entries are 1:1 with the input and in the same order.'
  );
}

// ---------------------------------------------------------------------------
// Part B — chronological invariant of the real resume data.
// ---------------------------------------------------------------------------

function runPartB() {
  const resume = loadRealResume();

  let starts;
  let source;
  if (resume && Array.isArray(resume.experience) && resume.experience.length > 0) {
    starts = resume.experience.map(function (e) { return e.start; });
    source = 'real RESUME.experience (source-compiled from js/main.js)';
  } else {
    starts = EXPECTED_STARTS.slice();
    source = 'requirements-mirrored fallback fixture';
  }

  // (1) Adjacent-pair invariant: start[i] >= start[i+1] (string compare on the
  // ISO 'YYYY-MM' form is a correct chronological comparison). Most-recent-first
  // means each entry's start is >= the one that follows it.
  for (let i = 0; i < starts.length - 1; i++) {
    if (!(starts[i] >= starts[i + 1])) {
      console.error(
        'FAIL (Property 1 / Part B — chronological invariant, ' + source + '): '
          + 'entry ' + i + ' start "' + starts[i] + '" is earlier than entry '
          + (i + 1) + ' start "' + starts[i + 1] + '" — data is not '
          + 'most-recent-first.'
      );
      process.exit(1);
    }
  }

  // (2) Exactly 3 entries with the mandated starts in the mandated order.
  if (starts.length !== EXPECTED_STARTS.length) {
    console.error(
      'FAIL (Property 1 / Part B, ' + source + '): expected exactly '
        + EXPECTED_STARTS.length + ' experience entries, found ' + starts.length
        + ' (starts: ' + JSON.stringify(starts) + ').'
    );
    process.exit(1);
  }
  for (let i = 0; i < EXPECTED_STARTS.length; i++) {
    if (starts[i] !== EXPECTED_STARTS[i]) {
      console.error(
        'FAIL (Property 1 / Part B, ' + source + '): entry ' + i + ' start is "'
          + starts[i] + '", expected "' + EXPECTED_STARTS[i] + '". '
          + 'Full starts: ' + JSON.stringify(starts) + '.'
      );
      process.exit(1);
    }
  }

  console.log(
    'PASS (Property 1 / Part B — chronological invariant): ' + source
      + ' has exactly ' + starts.length + ' entries ordered most-recent-first '
      + JSON.stringify(starts) + '.'
  );
}

// ---------------------------------------------------------------------------

function run() {
  runPartA();
  runPartB();
  console.log('PASS (Property 1 — experience render order and chronological invariant).');
  process.exit(0);
}

run();
