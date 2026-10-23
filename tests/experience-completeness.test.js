/*
 * tests/experience-completeness.test.js — Property 2: Experience entry render
 * completeness
 *
 * Validates: Requirements 3.2
 *
 * Property 2 (universal): For ANY Experience_Entry, the rendered output of
 * renderExperienceEntry contains the entry's title, employer, dates, location,
 * and EVERY achievement string in that entry.
 *
 * Because renderExperienceEntry routes every text value through escapeHtml
 * before interpolating it into the markup string, this test asserts
 * completeness against the ESCAPED form of each field/achievement — i.e. the
 * rendered output must contain escapeHtml(field). Inputs deliberately include
 * values with HTML-significant characters (&, <, >, ", ') to confirm
 * completeness still holds through escaping (an unescaped assertion would
 * spuriously fail on, say, a title containing `<`).
 *
 * Self-contained Node script — only built-ins (`assert`, `path`). It uses the
 * REAL guarded-CommonJS exports `renderExperienceEntry` and `escapeHtml` from
 * js/main.js via require() (both are pure and DOM-free, so no stubbing is
 * needed). js/main.js is never modified.
 *
 * Fails loudly on any violation: prints which field/achievement was missing and
 * calls process.exit(1). On success it prints a summary and exits 0.
 *
 * Run with:  node tests/experience-completeness.test.js
 */

'use strict';

const assert = require('assert');
const path = require('path');

// ---------------------------------------------------------------------------
// Load the real pure helpers (guarded CommonJS exports). Both are DOM-free.
// ---------------------------------------------------------------------------

const mainPath = path.resolve(__dirname, '..', 'js', 'main.js');
const main = require(mainPath);
assert.ok(
  main && typeof main.renderExperienceEntry === 'function',
  'Failed to load renderExperienceEntry from js/main.js'
);
assert.ok(
  main && typeof main.escapeHtml === 'function',
  'Failed to load escapeHtml from js/main.js'
);
const renderExperienceEntry = main.renderExperienceEntry;
const escapeHtml = main.escapeHtml;

// ---------------------------------------------------------------------------
// Tiny random generators for synthetic experience entries. Values intentionally
// mix plain text with HTML-significant characters so completeness is exercised
// through the escaping path.
// ---------------------------------------------------------------------------

function randInt(minInclusive, maxInclusive) {
  return minInclusive + Math.floor(Math.random() * (maxInclusive - minInclusive + 1));
}

// A pool of characters that includes all five HTML-significant characters plus
// ordinary word/punctuation/whitespace so generated strings are realistic and
// stress the escaping behavior.
var CHAR_POOL = (
  'abcdefghijklmnopqrstuvwxyz'
  + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  + '0123456789'
  + ' .,-_/()'
  + '&<>"\''        // the five HTML-significant characters
  + '&<>"\''        // weighted again so they appear often
).split('');

// Build a random string of length 1..maxLen from CHAR_POOL. A non-empty string
// guarantees the escaped substring assertion is meaningful (empty strings would
// trivially "appear" everywhere).
function randString(maxLen) {
  var len = randInt(1, maxLen);
  var out = '';
  for (var i = 0; i < len; i++) {
    out += CHAR_POOL[randInt(0, CHAR_POOL.length - 1)];
  }
  return out;
}

// Build a synthetic experience entry with random field values and a random
// achievements array of 0..6 items (the property must hold even for an empty
// achievements array — there is simply nothing extra to find).
function makeSyntheticEntry() {
  var achievementCount = randInt(0, 6);
  var achievements = [];
  for (var a = 0; a < achievementCount; a++) {
    achievements.push(randString(60));
  }
  return {
    title: randString(40),
    employer: randString(40),
    dates: randString(30),
    location: randString(30),
    achievements: achievements
  };
}

// ---------------------------------------------------------------------------
// Property loop — render completeness (>= 100 iterations).
// ---------------------------------------------------------------------------

function run() {
  var ITERATIONS = 200; // >= 100 required by the property

  for (var i = 0; i < ITERATIONS; i++) {
    var entry = makeSyntheticEntry();
    var rendered = renderExperienceEntry(entry);

    // (1) Each scalar field must appear in the rendered output in its escaped
    // form (renderExperienceEntry escapes every value before interpolation).
    var scalarFields = ['title', 'employer', 'dates', 'location'];
    for (var f = 0; f < scalarFields.length; f++) {
      var fieldName = scalarFields[f];
      var expected = escapeHtml(entry[fieldName]);
      if (rendered.indexOf(expected) === -1) {
        console.error(
          'FAIL (Property 2 — render completeness, iteration ' + i + '): the '
            + 'rendered output is missing the ' + fieldName + ' field.\n'
            + '  raw ' + fieldName + '      : ' + JSON.stringify(entry[fieldName]) + '\n'
            + '  escaped (expected): ' + JSON.stringify(expected) + '\n'
            + '  rendered output   : ' + JSON.stringify(rendered)
        );
        process.exit(1);
      }
    }

    // (2) Every achievement string must appear in the rendered output in its
    // escaped form, for all 0..6 achievements.
    for (var k = 0; k < entry.achievements.length; k++) {
      var expectedAchievement = escapeHtml(entry.achievements[k]);
      if (rendered.indexOf(expectedAchievement) === -1) {
        console.error(
          'FAIL (Property 2 — render completeness, iteration ' + i + '): the '
            + 'rendered output is missing achievement index ' + k + ' of '
            + entry.achievements.length + '.\n'
            + '  raw achievement   : ' + JSON.stringify(entry.achievements[k]) + '\n'
            + '  escaped (expected): ' + JSON.stringify(expectedAchievement) + '\n'
            + '  rendered output   : ' + JSON.stringify(rendered)
        );
        process.exit(1);
      }
    }
  }

  console.log(
    'PASS (Property 2 — experience entry render completeness): ' + ITERATIONS
      + ' randomized iterations. For every synthetic entry (fields and 0..6 '
      + 'achievements, including HTML-significant characters), the rendered '
      + 'output contains the escaped title, employer, dates, location, and '
      + 'every achievement string.'
  );
  process.exit(0);
}

run();
