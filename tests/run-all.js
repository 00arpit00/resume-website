/*
 * tests/run-all.js — no-build test runner for the interactive resume website.
 *
 * Discovers every `*.test.js` file in this directory and runs each one in its
 * OWN `node` child process (sequentially), so a crash, a global-state leak, or
 * a process.exit() in one test file cannot affect another. Each test file is
 * self-contained and exits non-zero on failure (that is the pass/fail signal).
 *
 * Reports per-file PASS/FAIL plus a final summary. Exits 0 only if every test
 * file passed; exits 1 if any failed (so `npm test` / CI fails loudly).
 *
 * Discovery is by the `.test.js` suffix. run-all.js itself does NOT end in
 * `.test.js`, so the runner never tries to execute itself.
 *
 * Dev-only: this file (and the whole tests/ folder + the root package.json) is
 * NOT part of the deployed static site. The deployed site is just index.html +
 * css/ + js/. Nothing here is required at runtime.
 *
 * Node built-ins only (fs, path, child_process). No external dependencies, no
 * build step.
 *
 * Run with:  node tests/run-all.js   (or `npm test` from the workspace root)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const TESTS_DIR = __dirname;
const SELF = path.basename(__filename); // 'run-all.js' — never a *.test.js file

// ---------------------------------------------------------------------------
// Discover test files: any file in tests/ whose name ends with `.test.js`.
// Sorted for a stable, deterministic run order. The suffix guarantees the
// runner (run-all.js) is excluded.
// ---------------------------------------------------------------------------

function discoverTestFiles() {
  let entries;
  try {
    entries = fs.readdirSync(TESTS_DIR);
  } catch (err) {
    console.error('FATAL: could not read tests directory ' + TESTS_DIR + ': ' + err.message);
    process.exit(1);
  }

  return entries
    .filter(function (name) {
      return name.endsWith('.test.js') && name !== SELF;
    })
    .sort()
    .map(function (name) {
      return path.join(TESTS_DIR, name);
    });
}

// ---------------------------------------------------------------------------
// Run a single test file in its own node child process. Returns true on pass
// (exit code 0), false otherwise. stdout/stderr are inherited so each test's
// own PASS/FAIL narration streams through to the console in real time.
// ---------------------------------------------------------------------------

function runTestFile(filePath) {
  const result = spawnSync(process.execPath, [filePath], {
    cwd: TESTS_DIR,
    stdio: 'inherit'
  });

  if (result.error) {
    console.error('  ERROR launching ' + path.basename(filePath) + ': ' + result.error.message);
    return false;
  }
  // A non-zero exit code OR termination by signal counts as a failure.
  return result.status === 0 && result.signal == null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const files = discoverTestFiles();

  if (files.length === 0) {
    console.error('FATAL: no *.test.js files found in ' + TESTS_DIR);
    process.exit(1);
  }

  console.log('Running ' + files.length + ' test file(s) from tests/ (each in its own node process)\n');

  const passed = [];
  const failed = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = path.basename(file);
    console.log('──────────────────────────────────────────────────────────────');
    console.log('[' + (i + 1) + '/' + files.length + '] RUN  ' + name);
    console.log('──────────────────────────────────────────────────────────────');

    const ok = runTestFile(file);
    if (ok) {
      passed.push(name);
      console.log('[' + (i + 1) + '/' + files.length + '] PASS ' + name + '\n');
    } else {
      failed.push(name);
      console.log('[' + (i + 1) + '/' + files.length + '] FAIL ' + name + '\n');
    }
  }

  // -------------------------------------------------------------------------
  // Final summary
  // -------------------------------------------------------------------------
  console.log('==============================================================');
  console.log('TEST SUMMARY');
  console.log('==============================================================');
  console.log('  Total : ' + files.length);
  console.log('  Passed: ' + passed.length);
  console.log('  Failed: ' + failed.length);

  if (failed.length > 0) {
    console.log('\n  Failed files:');
    for (let i = 0; i < failed.length; i++) {
      console.log('    - ' + failed[i]);
    }
    console.log('\nRESULT: FAIL');
    process.exit(1);
  }

  console.log('\nRESULT: PASS — all test files passed.');
  process.exit(0);
}

main();
