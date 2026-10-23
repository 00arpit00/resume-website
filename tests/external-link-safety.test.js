/*
 * tests/external-link-safety.test.js — Property 5: External links open safely
 * in a new tab
 *
 * Validates: Requirements 5.4, 7.5
 *
 * Property 5 (universal): For ANY rendered hyperlink whose target is an
 * external (http/https) URL, the link SHALL have target="_blank" and a rel
 * attribute containing noopener. Internal targets (mailto:, tel:, relative
 * hrefs) SHALL receive no such attributes.
 *
 * This test exercises the REAL guarded-CommonJS exports `isExternal` and
 * `externalLinkAttrs` from js/main.js via require() (both are pure and
 * DOM-free, so no stubbing is needed). js/main.js is never modified.
 *
 * For each generated href we compute attrs = externalLinkAttrs(href) and
 * assert:
 *   - If isExternal(href) is true  → attrs.target === '_blank' AND
 *     typeof attrs.rel === 'string' AND attrs.rel contains 'noopener'.
 *   - If isExternal(href) is false → attrs is an empty object
 *     (Object.keys(attrs).length === 0, no target/rel).
 * We also assert that isExternal classifies hrefs correctly against the
 * authoritative regex /^https?:\/\//i (external) versus mailto:/tel:/relative
 * (internal).
 *
 * Self-contained Node script — only built-ins (`assert`, `path`). Fails loudly
 * on any violation: prints the offending href and calls process.exit(1). On
 * success it prints a summary and exits 0.
 *
 * Run with:  node tests/external-link-safety.test.js
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
  main && typeof main.isExternal === 'function',
  'Failed to load isExternal from js/main.js'
);
assert.ok(
  main && typeof main.externalLinkAttrs === 'function',
  'Failed to load externalLinkAttrs from js/main.js'
);
const isExternal = main.isExternal;
const externalLinkAttrs = main.externalLinkAttrs;

// ---------------------------------------------------------------------------
// Random generators. We build a mix of hrefs: external ones (http:// and
// https:// with random hosts/paths and random scheme casing like HTTP/HTTPS)
// and non-external ones (mailto:, tel:, and relative hrefs). Each generator
// returns { href, external } so the property loop knows the ground truth
// independently of the implementation under test; we additionally cross-check
// isExternal against the authoritative regex below.
// ---------------------------------------------------------------------------

// The authoritative classifier the design mandates for isExternal (Req 5.4).
// We use it as an independent oracle so a bug in isExternal cannot mask itself.
const EXTERNAL_RE = /^https?:\/\//i;

function randInt(minInclusive, maxInclusive) {
  return minInclusive + Math.floor(Math.random() * (maxInclusive - minInclusive + 1));
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

const WORD_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-'.split('');

function randWord(minLen, maxLen) {
  var len = randInt(minLen, maxLen);
  var out = '';
  for (var i = 0; i < len; i++) {
    out += pick(WORD_CHARS);
  }
  return out;
}

function randHost() {
  var tlds = ['com', 'dev', 'io', 'org', 'net', 'co.uk', 'amazon.com'];
  var labelCount = randInt(1, 3);
  var labels = [];
  for (var i = 0; i < labelCount; i++) {
    labels.push(randWord(1, 8));
  }
  return labels.join('.') + '.' + pick(tlds);
}

function randPath() {
  var segCount = randInt(0, 4);
  var segs = [];
  for (var i = 0; i < segCount; i++) {
    segs.push(randWord(1, 10));
  }
  return segs.length ? '/' + segs.join('/') : '';
}

// Randomize the case of the scheme so we exercise the case-insensitive match
// (HTTP, HttPs, etc.). Returns e.g. 'http', 'HTTP', 'HtTp', 'https', 'HTTPS'.
function randCasedScheme(base /* 'http' | 'https' */) {
  var out = '';
  for (var i = 0; i < base.length; i++) {
    var ch = base.charAt(i);
    out += Math.random() < 0.5 ? ch.toUpperCase() : ch.toLowerCase();
  }
  return out;
}

// External href: http(s) with random host/path and random scheme casing.
function makeExternalHref() {
  var scheme = randCasedScheme(Math.random() < 0.5 ? 'http' : 'https');
  return scheme + '://' + randHost() + randPath();
}

// Non-external href: mailto:, tel:, or a relative/local reference. None of
// these begin with http(s):// so they must be classified internal.
function makeInternalHref() {
  var kind = randInt(0, 6);
  switch (kind) {
    case 0:
      return 'mailto:' + randWord(3, 10) + '@' + randHost();
    case 1:
      return 'tel:+' + randInt(1, 99) + '-' + randInt(1000000000, 1999999999);
    case 2:
      return '#' + randWord(3, 12);                 // in-page anchor
    case 3:
      return '/' + randWord(3, 12) + randPath();    // root-relative
    case 4:
      return randWord(3, 12) + '.html';             // relative page
    case 5:
      return 'css/' + randWord(3, 10) + '.css';     // relative asset
    default:
      return randWord(3, 12) + randPath();          // bare relative path
  }
}

// Produce one { href, external } sample, roughly half external / half not.
function makeSample() {
  if (Math.random() < 0.5) {
    return { href: makeExternalHref(), external: true };
  }
  return { href: makeInternalHref(), external: false };
}

// ---------------------------------------------------------------------------
// Property loop — external-link safety (>= 100 iterations).
// ---------------------------------------------------------------------------

function run() {
  var ITERATIONS = 200; // >= 100 required by the property

  for (var i = 0; i < ITERATIONS; i++) {
    var sample = makeSample();
    var href = sample.href;
    var expectedExternal = sample.external;

    // (0) Sanity: our generator's intent must agree with the authoritative
    // regex. (Guards against a generator bug producing a mislabeled sample.)
    var oracleExternal = EXTERNAL_RE.test(href);
    if (oracleExternal !== expectedExternal) {
      console.error(
        'FAIL (Property 5 — generator/oracle disagreement, iteration ' + i
          + '): generator labeled external=' + expectedExternal + ' but the '
          + 'authoritative regex says ' + oracleExternal + '.\n'
          + '  href: ' + JSON.stringify(href)
      );
      process.exit(1);
    }

    // (1) isExternal must classify the href exactly as the authoritative regex.
    var classified = isExternal(href);
    if (classified !== oracleExternal) {
      console.error(
        'FAIL (Property 5 — isExternal misclassification, iteration ' + i
          + '): isExternal returned ' + classified + ' but /^https?:\\/\\//i '
          + 'says ' + oracleExternal + '.\n'
          + '  offending href: ' + JSON.stringify(href)
      );
      process.exit(1);
    }

    // (2) externalLinkAttrs must honor the safety contract.
    var attrs = externalLinkAttrs(href);
    if (classified) {
      // External → must open safely in a new tab.
      if (attrs.target !== '_blank') {
        console.error(
          'FAIL (Property 5 — external link missing target="_blank", iteration '
            + i + ').\n'
            + '  offending href: ' + JSON.stringify(href) + '\n'
            + '  attrs         : ' + JSON.stringify(attrs)
        );
        process.exit(1);
      }
      if (typeof attrs.rel !== 'string' || attrs.rel.indexOf('noopener') === -1) {
        console.error(
          'FAIL (Property 5 — external link rel missing "noopener", iteration '
            + i + ').\n'
            + '  offending href: ' + JSON.stringify(href) + '\n'
            + '  attrs         : ' + JSON.stringify(attrs)
        );
        process.exit(1);
      }
    } else {
      // Internal → must receive no link attributes at all (empty object).
      var keys = Object.keys(attrs);
      if (keys.length !== 0) {
        console.error(
          'FAIL (Property 5 — internal link should have no attrs, iteration '
            + i + '): expected an empty object but got ' + keys.length
            + ' key(s).\n'
            + '  offending href: ' + JSON.stringify(href) + '\n'
            + '  attrs         : ' + JSON.stringify(attrs)
        );
        process.exit(1);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Fixed edge cases — pin down scheme-casing and classification boundaries
  // that a purely random run might under-sample.
  // ---------------------------------------------------------------------------

  var externalCases = [
    'http://example.com',
    'https://example.com',
    'HTTP://EXAMPLE.COM',
    'HTTPS://example.com/path',
    'HtTpS://sub.domain.co.uk/a/b',
    'https://github.com/aws-samples/sample-autonomous-modernization-factory',
    'https://www.linkedin.com/in/00arpit00'
  ];
  for (var e = 0; e < externalCases.length; e++) {
    var ext = externalCases[e];
    if (!isExternal(ext)) {
      console.error('FAIL (Property 5 — edge): isExternal should be true for '
        + JSON.stringify(ext));
      process.exit(1);
    }
    var extAttrs = externalLinkAttrs(ext);
    if (extAttrs.target !== '_blank'
      || typeof extAttrs.rel !== 'string'
      || extAttrs.rel.indexOf('noopener') === -1) {
      console.error('FAIL (Property 5 — edge): unsafe attrs for external href '
        + JSON.stringify(ext) + ' → ' + JSON.stringify(extAttrs));
      process.exit(1);
    }
  }

  var internalCases = [
    'mailto:arpitagarwal1308@gmail.com',
    'tel:+91-8299619940',
    '#contact',
    '/page',
    'index.html',
    'css/styles.css',
    'js/main.js',
    'ftp://example.com',           // not http(s) → internal per the contract
    'httpsx://example.com',        // scheme does not match ^https?://
    ' http://example.com'          // leading space → regex is anchored, no match
  ];
  for (var n = 0; n < internalCases.length; n++) {
    var intHref = internalCases[n];
    if (isExternal(intHref)) {
      console.error('FAIL (Property 5 — edge): isExternal should be false for '
        + JSON.stringify(intHref));
      process.exit(1);
    }
    var intAttrs = externalLinkAttrs(intHref);
    if (Object.keys(intAttrs).length !== 0) {
      console.error('FAIL (Property 5 — edge): internal href '
        + JSON.stringify(intHref) + ' should yield empty attrs, got '
        + JSON.stringify(intAttrs));
      process.exit(1);
    }
  }

  console.log(
    'PASS (Property 5 — external links open safely in a new tab): '
      + ITERATIONS + ' randomized iterations plus ' + externalCases.length
      + ' external and ' + internalCases.length + ' internal edge cases. '
      + 'Every external (http/https, any scheme casing) href is classified by '
      + 'isExternal and receives target="_blank" with a rel containing '
      + '"noopener"; every mailto:/tel:/relative href is internal and receives '
      + 'an empty attributes object.'
  );
  process.exit(0);
}

run();
