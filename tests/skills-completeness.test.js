/*
 * tests/skills-completeness.test.js — Property 3: Skills render completeness
 *
 * Validates: Requirements 4.2, 4.3
 *
 * Property 3: For any skills category and any skill within that category's
 * data, the rendered Skills Section SHALL display that skill under its category
 * heading.
 *
 * This test models the "rendered Skills Section" the way production renders it:
 * for each category, a heading `<h3>` + escapeHtml(category) + `</h3>` followed
 * immediately by renderList(items) (the `<li>…</li>` markup, order preserved).
 * The whole section is the per-category concatenation of those two pieces, in
 * category order. It then asserts, over >= 100 randomized iterations:
 *
 *   (1) Completeness of headings: escapeHtml(category) appears in the output
 *       for every category.
 *   (2) Completeness of skills: '<li>' + escapeHtml(item) + '</li>' appears in
 *       the output for every skill item (each skill is present as a list item).
 *   (3) Ordering (under its heading): every skill of a category appears AFTER
 *       that category's heading in the output — the skill's `<li>` index is
 *       strictly greater than the index of its category heading.
 *
 * Generated categories/skills deliberately include HTML-significant characters
 * (&, <, >, ", ') to confirm escaping is consistent between the way we locate
 * headings/skills and the way the real `renderList`/`escapeHtml` emit them.
 *
 * Self-contained Node script — only built-ins (`assert`, `path`). Uses the REAL
 * guarded-CommonJS exports `renderList` and `escapeHtml` from js/main.js via
 * require(); the file on disk is never modified.
 *
 * Run with:  node tests/skills-completeness.test.js
 */

'use strict';

const assert = require('assert');
const path = require('path');

// ---------------------------------------------------------------------------
// Load the real pure helpers (guarded CommonJS export).
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

// ---------------------------------------------------------------------------
// Tiny random generators for synthetic skills categories.
// ---------------------------------------------------------------------------

function randInt(minInclusive, maxInclusive) {
  return minInclusive + Math.floor(Math.random() * (maxInclusive - minInclusive + 1));
}

// A pool of characters that includes all five HTML-significant characters so
// generated names/items frequently exercise escaping. Plain alphanumerics and
// spaces round out realistic skill-like strings.
const CHAR_POOL = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ()+#.&<>"\'';

function randString(minLen, maxLen) {
  const len = randInt(minLen, maxLen);
  let out = '';
  for (let i = 0; i < len; i++) {
    out += CHAR_POOL.charAt(randInt(0, CHAR_POOL.length - 1));
  }
  return out;
}

// Build a category object with a unique token woven into the name and each
// item so matches can be located unambiguously, plus random content that may
// contain HTML-significant characters.
function makeCategory(token) {
  const itemCount = randInt(1, 10);
  const items = [];
  for (let i = 0; i < itemCount; i++) {
    // Token + per-item index guarantees uniqueness across categories/items so
    // index-based ordering checks cannot be confused by collisions. The random
    // tail adds HTML-significant characters.
    items.push('Skill_' + token + '_' + i + '_' + randString(0, 6));
  }
  return {
    token: token,
    category: 'Category_' + token + '_' + randString(0, 6),
    items: items
  };
}

// Generate a random set of 1..3 categories with distinct tokens.
function makeSkills() {
  const n = randInt(1, 3);
  const categories = [];
  for (let i = 0; i < n; i++) {
    const token = 'C' + String(i).padStart(2, '0') + 'r' + randInt(100000, 999999).toString(36);
    categories.push(makeCategory(token));
  }
  return categories;
}

// ---------------------------------------------------------------------------
// Render the Skills Section the way production composes it: per category, a
// heading followed immediately by the item list, concatenated in order.
// ---------------------------------------------------------------------------

function renderSkillsSection(categories) {
  return categories
    .map(function (cat) {
      return '<h3>' + escapeHtml(cat.category) + '</h3>' + renderList(cat.items);
    })
    .join('');
}

// ---------------------------------------------------------------------------
// Property 3 — skills render completeness + under-heading ordering.
// ---------------------------------------------------------------------------

function run() {
  const ITERATIONS = 200; // >= 100 required by the property

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const categories = makeSkills();
    const output = renderSkillsSection(categories);

    for (let c = 0; c < categories.length; c++) {
      const cat = categories[c];
      const headingMarkup = '<h3>' + escapeHtml(cat.category) + '</h3>';
      const headingIndex = output.indexOf(headingMarkup);

      // (1) Completeness of headings — escapeHtml(category) is present (as the
      // heading markup) in the output.
      if (headingIndex === -1) {
        console.error(
          'FAIL (Property 3, iteration ' + iter + '): category heading for "'
            + cat.category + '" is missing from the rendered skills output.'
        );
        process.exit(1);
      }

      for (let s = 0; s < cat.items.length; s++) {
        const item = cat.items[s];
        const liMarkup = '<li>' + escapeHtml(item) + '</li>';
        const liIndex = output.indexOf(liMarkup);

        // (2) Completeness of skills — the skill is present as a list item.
        if (liIndex === -1) {
          console.error(
            'FAIL (Property 3, iteration ' + iter + '): skill "' + item
              + '" (category "' + cat.category + '") is missing from the '
              + 'rendered skills output — expected list item ' + liMarkup + '.'
          );
          process.exit(1);
        }

        // (3) Ordering — the skill appears AFTER its category heading.
        if (!(liIndex > headingIndex)) {
          console.error(
            'FAIL (Property 3, iteration ' + iter + '): skill "' + item
              + '" appears at index ' + liIndex + ', not after its category '
              + 'heading "' + cat.category + '" (heading index ' + headingIndex
              + ') — skill is not displayed under its category heading.'
          );
          process.exit(1);
        }
      }
    }
  }

  console.log(
    'PASS (Property 3 — skills render completeness): ' + ITERATIONS
      + ' randomized iterations over sets of 1..3 categories (1..10 skills each, '
      + 'including HTML-significant characters). Every category heading and '
      + 'every skill list item is present, and each skill appears under its '
      + 'category heading.'
  );
  process.exit(0);
}

run();
