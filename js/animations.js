/*
 * animations.js — CI/CD pipeline motion layer (progressive enhancement)
 *
 * Classic (non-module) script loaded with `defer`, after main.js.
 *   1. Scroll "deploy progress" bar
 *   2. Active section highlighting in the nav
 *   3. Staggered scroll-reveal for [data-reveal] blocks
 *   4. Count-up animation for impact metrics
 *   5. Typing role rotator in the hero
 *   6. Career pipeline stages lighting up in sequence
 *
 * Safety:
 *   - Inert under Node require() (no document).
 *   - Content is only hidden/dimmed under `.anim-ready`, which this script adds
 *     itself. If the script never runs, CSS keeps everything visible.
 *   - Reduced motion or no IntersectionObserver: no `.anim-ready`, no rotator,
 *     no counters; everything shows its final state. The progress bar and nav
 *     highlight still work since they reflect position, not decoration.
 *   - Counters and the rotator keep the final text in the DOM. The rotator is
 *     aria-hidden with a screen-reader-only sentence alongside it.
 */
(function () {
  'use strict';

  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  var REDUCED = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HAS_IO = 'IntersectionObserver' in window;
  var ANIMATE = HAS_IO && !REDUCED;

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  // 1. Scroll progress ----------------------------------------------------
  function initProgress() {
    var bar = document.querySelector('.scroll-progress');
    if (!bar) { return; }
    var ticking = false;
    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.setProperty('--progress', p.toFixed(4));
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // 2. Active nav link ------------------------------------------------------
  function initNav() {
    if (!HAS_IO) { return; }
    var links = {};
    each(document.querySelectorAll('.nav-links a[href^="#"]'), function (a) {
      links[a.getAttribute('href').slice(1)] = a;
    });
    var io = new IntersectionObserver(function (entries) {
      each(entries, function (entry) {
        var link = links[entry.target.id];
        if (!link || !entry.isIntersecting) { return; }
        each(document.querySelectorAll('.nav-links a.is-active'), function (a) {
          a.classList.remove('is-active');
          a.removeAttribute('aria-current');
        });
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'location');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    each(document.querySelectorAll('main > section[id]'), function (s) { io.observe(s); });
  }

  // 3. Staggered reveal -----------------------------------------------------
  function initReveal() {
    var nodes = document.querySelectorAll('[data-reveal]');
    // Stagger siblings that share a parent so groups "deploy" in sequence.
    each(nodes, function (el) {
      var siblings = el.parentNode ? el.parentNode.querySelectorAll(':scope > [data-reveal]') : [el];
      var idx = Array.prototype.indexOf.call(siblings, el);
      el.style.setProperty('--reveal-delay', (Math.max(0, idx) % 8) * 80 + 'ms');
    });
    var io = new IntersectionObserver(function (entries, obs) {
      each(entries, function (entry) {
        if (!entry.isIntersecting) { return; }
        entry.target.classList.add('is-revealed');
        var num = entry.target.querySelector('.stat-num[data-count]');
        if (num) { countUp(num); }
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    each(nodes, function (el) { io.observe(el); });
  }

  // 4. Counters -------------------------------------------------------------
  function formatNumber(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) { return; }
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var finalText = prefix + formatNumber(target) + suffix;
    var duration = 1400;
    var start = null;
    function frame(ts) {
      if (start === null) { start = ts; }
      var t = Math.min(1, (ts - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      el.textContent = prefix + formatNumber(Math.round(target * eased)) + suffix;
      if (t < 1) { window.requestAnimationFrame(frame); } else { el.textContent = finalText; }
    }
    window.requestAnimationFrame(frame);
  }

  // 5. Role rotator ---------------------------------------------------------
  function initRotator() {
    var el = document.querySelector('.hero-rotator[data-words]');
    if (!el) { return; }
    var words = el.getAttribute('data-words').split('|');
    if (words.length < 2) { return; }
    var w = 0;
    var i = words[0].length;
    var deleting = true;
    var HOLD = 1800, TYPE = 65, DELETE = 35;

    function step() {
      var word = words[w];
      if (deleting) {
        i -= 1;
        el.textContent = word.slice(0, i);
        if (i <= 0) {
          deleting = false;
          w = (w + 1) % words.length;
          window.setTimeout(step, 250);
          return;
        }
        window.setTimeout(step, DELETE);
      } else {
        word = words[w];
        i += 1;
        el.textContent = word.slice(0, i);
        if (i >= word.length) {
          deleting = true;
          window.setTimeout(step, HOLD);
          return;
        }
        window.setTimeout(step, TYPE);
      }
    }
    window.setTimeout(step, HOLD);
  }

  // 6. Career pipeline sequencing -------------------------------------------
  function initCareerPipeline() {
    var pipeline = document.querySelector('.career-pipeline');
    if (!pipeline) { return; }
    pipeline.classList.add('cp-animate');
    var stages = pipeline.querySelectorAll('.cp-stage');
    var io = new IntersectionObserver(function (entries, obs) {
      each(entries, function (entry) {
        if (!entry.isIntersecting) { return; }
        each(stages, function (stage, idx) {
          window.setTimeout(function () { stage.classList.add('is-lit'); }, 300 + idx * 450);
        });
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.3 });
    io.observe(pipeline);
  }

  function init() {
    initProgress();
    initNav();
    if (!ANIMATE) { return; } // final states already present in the markup
    document.documentElement.classList.add('anim-ready');
    initReveal();
    initRotator();
    initCareerPipeline();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
