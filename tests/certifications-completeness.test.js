/*
 * tests/certifications-completeness.test.js — Property 4: Certifications render
 * completeness
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 *
 * Property 4: For any certification in the certifications data, the rendered
 * Certifications Section SHALL display that certification.
 *
 * The Certifications Section renders its list of certification strings through
 * the pure `renderList` helper, which maps each item to `<li>escaped</li>` in
 * input order (1:1, no omission). This test guards that completeness in two
 * ways:
 *   (A) Property (universal, >= 100 iterations): for a randomly generated
 *       certifications array (1..8 arbitrary strings — some seeded with
 *       HTML-significant characters like & < > and the en-dash "–" to mirror
 *       the real cert "AWS Certified Solutions Architect – Associate"),
 *       rendering via renderList produces output in which EVERY certification
 *       appears as its own escaped <li> block, and the number of <li> blocks
 *       equals the input length (1:1, no omission or duplication).
 *   (B) Example (actual data): the five REAL mandated certification strings are
 *       each present (escaped) in renderList output.
 *
 * Self-contained Node script using only built-ins (`assert`, `path`). The real
 * guarded-CommonJS exports `renderList` and `escapeHtml` from js/main.js are
 * loaded via require(); js/main.js is never modified.
 *
 * Run with:  node tests/certifications-completeness.test.js
 */

'use strict';

const assert = require('assert');
const path = require('path');

// ---------------------------------------------------------------------------
// Load the real helpers (guarded CommonJS export) from js/main.js.
// ---------------------------------------------------------------------------

const mainPath = path.resolve(__dirname, '..', 'js', 'main.js');
const main = require(mainPath);

assert.ok(
  main && typeof main.renderList === 'function',
  'Failed to load renderList from js/main.js'
);
assert.ok(
  main && typeof main.escapeHtml === 'function',
  'Failed to load escapeHtml from js/main.js'
);

const renderList = main.renderList;
const escapeHtml = main.escapeHtml;

// The five REAL mandated certification strings (Req 6.1–6.5). Mirrored from the
// design/requirements for the explicit example case.
const REAL_CERTIFICATIONS = [
  'AWS Certified DevOps Professional',
  'AWS Certified Solutions Architect – Associate',
  'AWS Certified SysOps Administrator Associate',
  'AWS Certified AI Practitioner',
  'HashiCorp Certified: Terraform Associate (004)'
];

// ---------------------------------------------------------------------------
// Tiny random generator for synthetic certification strings.
// ---------------------------------------------------------------------------

function randInt(minInclusive, maxInclusive) {
  return minInclusive + Math.floor(Math.random() * (maxInclusive - minInclusive + 1));
}

// A pool of characters that includes HTML-significant characters (& < > " ')
// and the en-dash "–", so generated certs exercise the escaping path the same
// way the real "Solutions Architect – Associate" cert does.
const CHAR_POOL = (
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '
  + '&<>"\'' + '\u2013' + ':()-'
);

// Build one random certification string of 1..40 characters. We force the
// inclusion of at least one HTML-significant / en-dash character on a fraction
// of entries so escaping is routinely exercised across iterations.
function makeSyntheticCert(forceSpecial) {
  const len = randInt(1, 40);
  let s = '';
  for (let i = 0; i < len; i++) {
    s += CHAR_POOL.charAt(randInt(0, CHAR_POOL.length - 1));
  }
  if (forceSpecial) {
    const specials = ['&', '<', '>', '"', '\'', '\u2013'];
    s += specials[randInt(0, specials.length - 1)];
  }
  return s;
}

// Generate a random certifications array of 1..8 entries.
function makeSyntheticCertList() {
  const n = randInt(1, 8);
  const certs = [];
  for (let i = 0; i < n; i++) {
    // Force a special character on roughly half the entries.
    certs.push(makeSyntheticCert(randInt(0, 1) === 0));
  }
  return certs;
}

// ---------------------------------------------------------------------------
// Count non-overlapping occurrences of `needle` within `haystack`.
// ---------------------------------------------------------------------------

function countOccurrences(haystack, needle) {
  if (needle.length === 0) {
    return 0;
  }
  let count = 0;
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    count++;
    at = haystack.indexOf(needle, at + needle.length);
  }
  return count;
}

// ---------------------------------------------------------------------------
// Part A — completeness property (>= 100 iterations)
// ---------------------------------------------------------------------------

function runPartA() {
  const ITERATIONS = 200; // >= 100 required by the property
  const LI_MARKER = '<li>';

  for (let i = 0; i < ITERATIONS; i++) {
    const input = makeSyntheticCertList();
    const output = renderList(input);

    // (1) 1:1 block count — number of <li> blocks equals the input length
    // (no omission, no duplication). renderList emits exactly one "<li>" per
    // item; the item text itself never contains a literal "<li>" because
    // escapeHtml turns "<" into "&lt;".
    const liCount = countOccurrences(output, LI_MARKER);
    if (liCount !== input.length) {
      console.error(
        'FAIL (Property 4 / Part A, iteration ' + i + '): rendered ' + liCount
          + ' <li> blocks for an input of ' + input.length + ' certifications '
          + '— expected a 1:1 mapping (no omission or duplication). '
          + 'Input: ' + JSON.stringify(input)
      );
      process.exit(1);
    }

    // (2) Completeness — every certification appears as its own escaped <li>
    // block in the output.
    for (let j = 0; j < input.length; j++) {
      const expectedBlock = '<li>' + escapeHtml(input[j]) + '</li>';
      if (output.indexOf(expectedBlock) === -1) {
        console.error(
          'FAIL (Property 4 / Part A, iteration ' + i + '): certification '
            + j + ' (' + JSON.stringify(input[j]) + ') was not displayed as '
            + 'its escaped <li> block in the rendered output. '
            + 'Expected block: ' + JSON.stringify(expectedBlock) + '. '
            + 'Output: ' + JSON.stringify(output)
        );
        process.exit(1);
      }
    }
  }

  console.log(
    'PASS (Property 4 / Part A — certifications render completeness): '
      + ITERATIONS + ' randomized iterations over lists of 1..8 arbitrary '
      + 'certification strings (including HTML-significant & en-dash chars). '
      + 'Every certification is displayed and <li> blocks are 1:1 with the input.'
  );
}

// ---------------------------------------------------------------------------
// Part B — explicit example with the five REAL mandated certification strings.
// ---------------------------------------------------------------------------

function runPartB() {
  const output = renderList(REAL_CERTIFICATIONS);

  // (1) 1:1 block count for the real data.
  const liCount = countOccurrences(output, '<li>');
  if (liCount !== REAL_CERTIFICATIONS.length) {
    console.error(
      'FAIL (Property 4 / Part B — real certifications): rendered ' + liCount
        + ' <li> blocks for ' + REAL_CERTIFICATIONS.length + ' mandated '
        + 'certifications — expected a 1:1 mapping.'
    );
    process.exit(1);
  }

  // (2) Each real certification appears (escaped) in the rendered output.
  for (let i = 0; i < REAL_CERTIFICATIONS.length; i++) {
    const cert = REAL_CERTIFICATIONS[i];
    const expectedBlock = '<li>' + escapeHtml(cert) + '</li>';
    if (output.indexOf(expectedBlock) === -1) {
      console.error(
        'FAIL (Property 4 / Part B — real certifications): mandated '
          + 'certification ' + JSON.stringify(cert) + ' was not displayed '
          + '(escaped) in the rendered output. '
          + 'Expected block: ' + JSON.stringify(expectedBlock) + '.'
      );
      process.exit(1);
    }
  }

  console.log(
    'PASS (Property 4 / Part B — real certifications): all '
      + REAL_CERTIFICATIONS.length + ' mandated certification strings are '
      + 'displayed (escaped) in renderList output.'
  );
}

// ---------------------------------------------------------------------------

function run() {
  runPartA();
  runPartB();
  console.log('PASS (Property 4 — certifications render completeness).');
  process.exit(0);
}

run();
