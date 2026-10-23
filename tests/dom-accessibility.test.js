/*
 * tests/dom-accessibility.test.js — Accessibility (Properties 10 & 11) plus
 * mandated-content example/edge checks against the shipped index.html.
 *
 * Validates: Requirements 9.1, 9.4 (Properties 10, 11), plus example/edge
 * coverage for 2.1, 2.2, 5.3, 6.1-6.5, 7.4, 8.7.
 *
 * This test parses index.html AS TEXT — no DOM library, no external deps, only
 * Node built-ins (fs, path, assert). It reads the file with fs and uses
 * regex/string checks. index.html is never modified.
 *
 * ---------------------------------------------------------------------------
 * Property 10 (Interactive controls are keyboard-reachable, Req 9.1):
 *   - The theme toggle is a native <button> with id="theme-toggle".
 *   - The toggle is not aria-hidden="true" and has no tabindex="-1".
 *   - Every hyperlink in the document is an <a> element carrying an href.
 *   - None of the interactive controls (the toggle and the <a> links) have
 *     tabindex="-1" or aria-hidden="true".
 *
 * Property 11 (Non-text controls have accessible names, Req 9.4):
 *   - The theme toggle has a non-empty accessible name: either a non-empty
 *     aria-label value, or non-empty text content.
 *   - Any <img> element has a non-empty alt attribute. The site is text-first
 *     and may contain no <img> at all; the zero-image case is treated as a
 *     pass (vacuously true).
 *
 * Mandated-content example/edge checks:
 *   - Name "Arpit Agarwal"                               (Req 2.1)
 *   - Title "DevOps Engineer and Cloud Consultant"       (Req 2.2)
 *   - The five exact certification strings, with the en-dash allowed as either
 *     the literal "–" (U+2013) or the "&ndash;" entity                (Req 6.1-6.5)
 *   - Project GitHub URL
 *     https://github.com/aws-samples/sample-autonomous-modernization-factory (Req 5.3)
 *   - LinkedIn URL https://www.linkedin.com/in/00arpit00             (Req 7.4)
 *   - <html ... data-theme="dark"> present (no-stored-preference dark default
 *     edge)                                                           (Req 8.7)
 *   - All six section ids present: hero, experience, skills, projects,
 *     certifications, contact.
 *
 * Fails loudly with specific messages + process.exit(1); prints success and
 * exits 0 otherwise.
 *
 * Run with:  node tests/dom-accessibility.test.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Load index.html as text.
// ---------------------------------------------------------------------------

const INDEX_PATH = path.resolve(__dirname, '..', 'index.html');

let html;
try {
  html = fs.readFileSync(INDEX_PATH, 'utf8');
} catch (err) {
  console.error('FAIL: could not read index.html at ' + INDEX_PATH + ': ' + err.message);
  process.exit(1);
}

// Collected failures — we accumulate so a single run reports everything wrong,
// then exit(1) at the end if any were found.
const failures = [];
function fail(msg) {
  failures.push(msg);
}

// ---------------------------------------------------------------------------
// Tiny tag-attribute helpers (text-based, no DOM).
// ---------------------------------------------------------------------------

// Extract the attribute text (everything between the tag name and the closing
// ">") for the FIRST tag of `tagName` matching an optional predicate on that
// attribute text. Returns the attribute string, or null if not found.
function findOpenTags(tagName) {
  // Matches <tagName ...attrs...> (not self-closing-aware beyond ">"). Captures
  // the attribute block. Case-insensitive on the tag name.
  const re = new RegExp('<' + tagName + '(\\s[^>]*?)?\\s*/?>', 'gi');
  const tags = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    tags.push({ full: m[0], attrs: m[1] || '' });
  }
  return tags;
}

// Read the value of a given attribute from an attribute string. Supports
// double- or single-quoted values. Returns the string value, or null if the
// attribute is absent. Returns '' for an explicitly empty value.
function getAttr(attrs, attrName) {
  const re = new RegExp('(?:^|\\s)' + attrName + '\\s*=\\s*"([^"]*)"', 'i');
  let m = re.exec(attrs);
  if (m) {
    return m[1];
  }
  const reSingle = new RegExp("(?:^|\\s)" + attrName + "\\s*=\\s*'([^']*)'", 'i');
  m = reSingle.exec(attrs);
  if (m) {
    return m[1];
  }
  // Attribute present with no value (boolean attribute)?
  const reBare = new RegExp('(?:^|\\s)' + attrName + '(?=\\s|$)', 'i');
  if (reBare.test(attrs)) {
    return ''; // present but valueless
  }
  return null; // absent
}

// True if an attribute string removes the element from the tab order per the
// property definition: tabindex="-1" OR aria-hidden="true".
function isRemovedFromTabOrder(attrs) {
  const tabindex = getAttr(attrs, 'tabindex');
  if (tabindex !== null && tabindex.trim() === '-1') {
    return 'tabindex="-1"';
  }
  const ariaHidden = getAttr(attrs, 'aria-hidden');
  if (ariaHidden !== null && ariaHidden.trim().toLowerCase() === 'true') {
    return 'aria-hidden="true"';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Locate the theme-toggle <button> and capture its inner text content.
// ---------------------------------------------------------------------------

// Match the full <button ...id="theme-toggle"...> ... </button> element so we
// can inspect both its attributes and its text content.
const toggleRe = /<button\b([^>]*\bid\s*=\s*["']theme-toggle["'][^>]*)>([\s\S]*?)<\/button>/i;
const toggleMatch = toggleRe.exec(html);

let toggleAttrs = null;
let toggleInner = '';
if (!toggleMatch) {
  fail('Property 10/11: no <button id="theme-toggle"> element found in index.html. '
    + 'The theme toggle must be a native <button> for keyboard operability.');
} else {
  toggleAttrs = toggleMatch[1] || '';
  toggleInner = toggleMatch[2] || '';
}

// ---------------------------------------------------------------------------
// Property 10 — the theme toggle is a native <button>, in the tab order.
// ---------------------------------------------------------------------------

if (toggleMatch) {
  const removed = isRemovedFromTabOrder(toggleAttrs);
  if (removed) {
    fail('Property 10 (Req 9.1): the theme toggle is removed from the tab order by '
      + removed + '. The toggle must remain keyboard-reachable.');
  }
}

// ---------------------------------------------------------------------------
// Property 10 — every hyperlink is an <a> with an href, and no interactive
// control (toggle or <a>) is removed from the tab order.
//
// We find every <a ...> opening tag. Each must have a non-null href. (The
// design authors all links as <a href="...">; a bare <a> with no href would
// not be keyboard-focusable and would violate the property.)
// ---------------------------------------------------------------------------

const anchorTags = findOpenTags('a');
if (anchorTags.length === 0) {
  // The site has Projects/Contact links authored as <a href>, so zero anchors
  // would be a real regression, not a vacuous pass.
  fail('Property 10 (Req 9.1): no <a> hyperlinks found in index.html, but the '
    + 'Projects and Contact sections are required to contain links (GitHub, '
    + 'email, phone, LinkedIn).');
}

for (let i = 0; i < anchorTags.length; i++) {
  const a = anchorTags[i];
  const href = getAttr(a.attrs, 'href');
  if (href === null) {
    fail('Property 10 (Req 9.1): found an <a> element with no href attribute: '
      + a.full + '. Hyperlinks must be <a> elements with an href to be '
      + 'natively focusable.');
  }
  const removed = isRemovedFromTabOrder(a.attrs);
  if (removed) {
    fail('Property 10 (Req 9.1): hyperlink ' + a.full + ' is removed from the '
      + 'tab order by ' + removed + '. Links must stay keyboard-reachable.');
  }
}

// ---------------------------------------------------------------------------
// Property 11 — the theme toggle has a non-empty accessible name.
// Accessible name = non-empty aria-label value OR non-empty visible text.
// ---------------------------------------------------------------------------

if (toggleMatch) {
  const ariaLabel = getAttr(toggleAttrs, 'aria-label');
  const ariaLabelNonEmpty = typeof ariaLabel === 'string' && ariaLabel.trim().length > 0;

  // Strip HTML comments and tags from the inner content, then collapse space,
  // to approximate the visible text content.
  const textContent = toggleInner
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const textNonEmpty = textContent.length > 0;

  if (!ariaLabelNonEmpty && !textNonEmpty) {
    fail('Property 11 (Req 9.4): the theme toggle has no accessible name. It '
      + 'needs a non-empty aria-label or non-empty text content. '
      + 'aria-label=' + JSON.stringify(ariaLabel) + ', text content='
      + JSON.stringify(textContent) + '.');
  }
}

// ---------------------------------------------------------------------------
// Property 11 — every <img> has a non-empty alt. Zero images → pass.
// ---------------------------------------------------------------------------

const imgTags = findOpenTags('img');
for (let i = 0; i < imgTags.length; i++) {
  const img = imgTags[i];
  const alt = getAttr(img.attrs, 'alt');
  if (alt === null || alt.trim().length === 0) {
    fail('Property 11 (Req 9.4): <img> element ' + img.full + ' is missing a '
      + 'non-empty alt attribute (alt=' + JSON.stringify(alt) + ').');
  }
}

// ---------------------------------------------------------------------------
// Mandated-content example/edge checks.
// ---------------------------------------------------------------------------

function mustContain(needle, label, reqTag) {
  if (html.indexOf(needle) === -1) {
    fail(reqTag + ': expected index.html to contain ' + label + ' '
      + JSON.stringify(needle) + ', but it was not found.');
  }
}

// Name (Req 2.1) and title (Req 2.2).
mustContain('Arpit Agarwal', 'the name', 'Req 2.1');
mustContain('DevOps Engineer and Cloud Consultant', 'the title', 'Req 2.2');

// Five exact certification strings (Req 6.1-6.5). The en-dash in the Solutions
// Architect cert may appear as the literal "–" (U+2013) or the "&ndash;"
// entity — accept either form.
const SIMPLE_CERTS = [
  'AWS Certified DevOps Professional',
  'AWS Certified SysOps Administrator Associate',
  'AWS Certified AI Practitioner',
  'HashiCorp Certified: Terraform Associate (004)'
];
for (let i = 0; i < SIMPLE_CERTS.length; i++) {
  mustContain(SIMPLE_CERTS[i], 'the certification', 'Req 6.1-6.5');
}

// En-dash cert: either literal en-dash or the &ndash; entity is acceptable.
const certLiteral = 'AWS Certified Solutions Architect \u2013 Associate';
const certEntity = 'AWS Certified Solutions Architect &ndash; Associate';
if (html.indexOf(certLiteral) === -1 && html.indexOf(certEntity) === -1) {
  fail('Req 6.1-6.5: expected the certification "AWS Certified Solutions '
    + 'Architect – Associate" with the en-dash as either the literal "\u2013" '
    + 'character or the "&ndash;" entity, but neither form was found.');
}

// Project GitHub URL (Req 5.3) and LinkedIn URL (Req 7.4).
mustContain(
  'https://github.com/aws-samples/sample-autonomous-modernization-factory',
  'the project GitHub URL',
  'Req 5.3'
);
mustContain(
  'https://www.linkedin.com/in/00arpit00',
  'the LinkedIn URL',
  'Req 7.4'
);

// No-stored-preference dark default edge (Req 8.7): <html ... data-theme="dark">.
// Match the opening <html> tag and confirm it carries data-theme="dark"
// (attribute order-independent).
const htmlTagMatch = /<html\b([^>]*)>/i.exec(html);
if (!htmlTagMatch) {
  fail('Req 8.7: no <html> opening tag found in index.html.');
} else {
  const htmlAttrs = htmlTagMatch[1] || '';
  const dataTheme = getAttr(htmlAttrs, 'data-theme');
  if (dataTheme === null || dataTheme.trim().toLowerCase() !== 'dark') {
    fail('Req 8.7: the <html> element must declare data-theme="dark" so the '
      + 'dark theme is the no-stored-preference default. Found data-theme='
      + JSON.stringify(dataTheme) + ' in ' + htmlTagMatch[0] + '.');
  }
}

// All six section ids present.
const SECTION_IDS = ['hero', 'experience', 'skills', 'projects', 'certifications', 'contact'];
for (let i = 0; i < SECTION_IDS.length; i++) {
  const id = SECTION_IDS[i];
  const re = new RegExp('<section\\b[^>]*\\bid\\s*=\\s*["\']' + id + '["\']', 'i');
  if (!re.test(html)) {
    fail('Mandated structure: missing <section id="' + id + '"> in index.html. '
      + 'All six section landmarks (hero, experience, skills, projects, '
      + 'certifications, contact) must be present.');
  }
}

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error('FAIL (dom-accessibility.test.js): ' + failures.length
    + ' assertion failure(s):');
  for (let i = 0; i < failures.length; i++) {
    console.error('  ' + (i + 1) + ') ' + failures[i]);
  }
  process.exit(1);
}

console.log(
  'PASS (dom-accessibility.test.js — Properties 10 & 11 + mandated content):\n'
  + '  Property 10 (Req 9.1): theme toggle is a native <button id="theme-toggle"> '
  + 'in the tab order; all ' + anchorTags.length + ' hyperlink(s) are <a href> '
  + 'and none are removed from the tab order (no tabindex="-1" / aria-hidden).\n'
  + '  Property 11 (Req 9.4): the toggle has a non-empty accessible name; '
  + imgTags.length + ' <img> element(s) checked for non-empty alt.\n'
  + '  Mandated content: name, title, all five certification strings, project '
  + 'GitHub URL, LinkedIn URL, <html data-theme="dark"> default, and all six '
  + 'section ids (hero, experience, skills, projects, certifications, contact) '
  + 'are present.'
);
process.exit(0);
