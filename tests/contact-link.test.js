/*
 * tests/contact-link.test.js — Property 6: Contact link construction
 *
 * Validates: Requirements 7.2, 7.3
 *
 * Property 6 (universal): For ANY email value the rendered contact link href
 * equals `"mailto:" + value`, and for ANY phone value the rendered contact link
 * href equals `"tel:" + value`.
 *
 * Self-contained Node script — only built-ins (`assert`, `path`). It uses the
 * REAL guarded-CommonJS export `buildContactHref` from js/main.js via require()
 * (the helper is pure and DOM-free, so no stubbing is needed). js/main.js is
 * never modified.
 *
 * The property loop runs >= 100 randomized iterations: each iteration generates
 * a random email-like value (random local parts and domains) and a random
 * phone-like value (random digits, +, -, spaces) and asserts the two href
 * equalities. In addition, explicit example cases pin the real resume values
 * and an optional 'url' pass-through case confirms non-email/phone kinds return
 * the value unchanged.
 *
 * Fails loudly on any violation: prints the kind/value/expected/actual and
 * calls process.exit(1). On success it prints a summary and exits 0.
 *
 * Run with:  node tests/contact-link.test.js
 */

'use strict';

const assert = require('assert');
const path = require('path');

// ---------------------------------------------------------------------------
// Load the real pure helper (guarded CommonJS export). It is DOM-free.
// ---------------------------------------------------------------------------

const mainPath = path.resolve(__dirname, '..', 'js', 'main.js');
const main = require(mainPath);
assert.ok(
  main && typeof main.buildContactHref === 'function',
  'Failed to load buildContactHref from js/main.js'
);
const buildContactHref = main.buildContactHref;

// ---------------------------------------------------------------------------
// Tiny random generators for synthetic email-like and phone-like values.
// ---------------------------------------------------------------------------

function randInt(minInclusive, maxInclusive) {
  return minInclusive + Math.floor(Math.random() * (maxInclusive - minInclusive + 1));
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

// Characters allowed in the local part of a generated email address. Kept to a
// realistic alphanumeric + common-symbol pool so values look like real emails.
var EMAIL_LOCAL_POOL = (
  'abcdefghijklmnopqrstuvwxyz'
  + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  + '0123456789'
  + '._+-'
).split('');

// A small pool of top-level domains to vary the generated domain.
var TLDS = ['com', 'net', 'org', 'io', 'dev', 'co.uk', 'in'];

// Characters that make up a label within a domain name.
var DOMAIN_LABEL_POOL = (
  'abcdefghijklmnopqrstuvwxyz'
  + '0123456789'
  + '-'
).split('');

// Build a random string of length 1..maxLen from a character pool.
function randFromPool(pool, maxLen) {
  var len = randInt(1, maxLen);
  var out = '';
  for (var i = 0; i < len; i++) {
    out += pool[randInt(0, pool.length - 1)];
  }
  return out;
}

// Generate a random email-like value: <local>@<label>.<tld>.
function makeEmail() {
  var local = randFromPool(EMAIL_LOCAL_POOL, 12);
  var domain = randFromPool(DOMAIN_LABEL_POOL, 10);
  var tld = pick(TLDS);
  return local + '@' + domain + '.' + tld;
}

// Generate a random phone-like value built from digits, '+', '-' and spaces.
// It may optionally start with a '+' (international prefix) and interleaves
// digit groups with separators so it resembles a real formatted phone number.
function makePhone() {
  var out = '';
  if (randInt(0, 1) === 1) {
    out += '+';
  }
  var groups = randInt(1, 4);
  for (var g = 0; g < groups; g++) {
    var digits = randInt(1, 4);
    for (var d = 0; d < digits; d++) {
      out += String(randInt(0, 9));
    }
    // Add a separator between groups (not after the last group).
    if (g < groups - 1) {
      out += pick(['-', ' ']);
    }
  }
  return out;
}

// Assert buildContactHref(kind, value) equals the expected href; on mismatch,
// print a detailed message and exit(1).
function assertHref(kind, value, expected, context) {
  var actual = buildContactHref(kind, value);
  if (actual !== expected) {
    console.error(
      'FAIL (Property 6 — contact link construction' + context + '):\n'
        + '  kind    : ' + JSON.stringify(kind) + '\n'
        + '  value   : ' + JSON.stringify(value) + '\n'
        + '  expected: ' + JSON.stringify(expected) + '\n'
        + '  actual  : ' + JSON.stringify(actual)
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Property loop + explicit example cases.
// ---------------------------------------------------------------------------

function run() {
  var ITERATIONS = 200; // >= 100 required by the property

  // (1) Universal property over randomized email/phone values.
  for (var i = 0; i < ITERATIONS; i++) {
    var email = makeEmail();
    assertHref('email', email, 'mailto:' + email, ', randomized email iteration ' + i);

    var phone = makePhone();
    assertHref('phone', phone, 'tel:' + phone, ', randomized phone iteration ' + i);
  }

  // (2) Explicit example cases for the real resume values (Req 7.2, 7.3).
  assertHref(
    'email',
    'arpitagarwal1308@gmail.com',
    'mailto:arpitagarwal1308@gmail.com',
    ', resume email example'
  );
  assertHref(
    'phone',
    '+91-8299619940',
    'tel:+91-8299619940',
    ', resume phone example'
  );

  // (3) Optional 'url' pass-through: a non-email/phone kind returns the value
  // unchanged (an https URL href is already fully formed).
  var sampleUrl = 'https://www.linkedin.com/in/00arpit00';
  assertHref('url', sampleUrl, sampleUrl, ', url pass-through example');

  console.log(
    'PASS (Property 6 — contact link construction): ' + ITERATIONS
      + ' randomized iterations plus explicit resume examples. For every '
      + 'generated email value buildContactHref("email", v) === "mailto:" + v, '
      + 'for every generated phone value buildContactHref("phone", v) === '
      + '"tel:" + v, and the url kind is returned unchanged.'
  );
  process.exit(0);
}

run();
