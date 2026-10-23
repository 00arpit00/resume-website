/*
 * main.js — Interactive Resume Website
 *
 * Single classic (non-module) script loaded with `defer`. Starter file for the
 * scaffold task. The following are authored in later tasks:
 *   - RESUME data object          (task 5.1)
 *   - ThemeManager                (task 5.2)
 *   - RevealController            (task 6.1)
 *   - pure render/helper functions (task 7)
 *   - initialization wiring        (task 8.1)
 */
/* ============================================================================
 * Section 1 — Resume data model (task 5.1)
 *
 * `RESUME` is the single structured source of truth mirrored from index.html.
 * Pure render/helper functions and property tests (added in later tasks)
 * exercise this object. Experience entries are most-recent-first; `start`
 * (ISO `YYYY-MM`) exists to express/verify the chronological ordering
 * invariant. Field values are mandated exactly by the requirements/design.
 * ============================================================================
 */
const RESUME = {
  profile: {
    name: 'Arpit Agarwal',
    title: 'DevOps Engineer and Cloud Consultant',
    summary: 'DevOps Engineer and Cloud Consultant with 8+ years of experience '
      + 'architecting AWS cloud-native solutions, specializing in enterprise '
      + 'modernization, infrastructure automation, and Kubernetes.'
  },
  experience: [
    {
      title: 'Delivery Consultant – DevOps',
      employer: 'AWS Professional Services',
      dates: 'Dec 2025 - Present',
      start: '2025-12',
      location: 'India',
      achievements: [
        'Delivered enterprise cloud engagements for Fortune 500 clients, '
          + 'including application modernization, data center migrations to AWS, '
          + 'and large-scale Java platform upgrades (Java 8 to Java 17/21/25 LTS) '
          + 'across 74+ applications using AWS Transform (ATX) CLI and Amazon Kiro.',
        'Contributed to a large-scale Application Modernization Platform (AMP) '
          + 'engagement, implementing trunk-based development workflows, '
          + 'GitHub Actions CI/CD pipelines, and reusable shared modules for '
          + 'deployment orchestration.',
        'Authored AWS Prescriptive Guidance (APG) article on AI-powered '
          + 'autonomous modernization factory and published companion '
          + 'open-source IaC reference implementation on aws-samples (GitHub).',
        'Mentored junior consultants in the ProServe DevOps & AI-Assisted '
          + 'Engineering AoD program; co-delivered tech sessions on serverless '
          + 'architecture.',
        'Served as SME for the AWS Certified AI Business Strategist (AIB-C01) '
          + 'certification exam, receiving recognition from AWS Certification '
          + 'leadership.'
      ]
    },
    {
      title: 'Cloud Support Engineer 2 – Deployment',
      employer: 'Amazon Web Services',
      dates: 'Jul 2019 - Dec 2025',
      start: '2019-07',
      location: 'India',
      achievements: [
        'Optimized Kubernetes worker node provisioning with Karpenter '
          + 'consolidation, PDBs, and pod affinities, reducing over-provisioning '
          + 'cost by 30%.',
        'Designed and maintained CI/CD pipelines for seamless automation, '
          + 'reducing deployment errors and achieving <1s P99 latency for '
          + 'application availability.',
        'Acted as Elastic Beanstalk SME and led incident management and root '
          + 'cause analysis (RCA), collaborating with development teams to '
          + 'implement preventive measures that reduced global service '
          + 'escalations by 6%, deflecting ~1,200 customer cases per quarter.',
        'Served as Point of Contact for GenAI services (Amazon Q Developer, '
          + 'Amazon CodeGuru) to handle new customer onboarding.',
        'Conducted 50+ hiring interviews for DevOps and Networking roles; '
          + 'mentored 5+ engineers to become subject matter experts in core '
          + 'AWS services.'
      ]
    },
    {
      title: 'Software Engineer',
      employer: 'QA InfoTech',
      dates: 'Jun 2018 - Jul 2019',
      start: '2018-06',
      location: 'India',
      achievements: [
        'Executed comprehensive performance testing across 34 enterprise '
          + 'applications using JMeter to validate stringent SLAs and '
          + 'performance KPIs.',
        'Built Python-based automated report generation and customer-facing '
          + 'display dashboards to deliver real-time testing analytics.',
        'Reduced manual testing and reporting effort by 80% through '
          + 'streamlined Jenkins and Python workflow automation.'
      ]
    }
  ],
  skills: [
    {
      category: 'DevOps, IaC & Scripting',
      items: [
        'Terraform',
        'CloudFormation',
        'CDK',
        'GitHub Actions',
        'Jenkins',
        'Shell Scripting',
        'Git',
        'AWS Transform (ATX)',
        'CodeGuru'
      ]
    },
    {
      category: 'Cloud & Containers',
      items: [
        'AWS (EC2, EKS, S3, Lambda, RDS, VPC, Elastic Beanstalk)',
        'Docker',
        'Kubernetes',
        'Karpenter'
      ]
    }
  ],
  projects: [
    {
      name: 'sample-autonomous-modernization-factory',
      description: 'Open-source reference implementation for autonomous '
        + 'modernization factory workflows under aws-samples.',
      url: 'https://github.com/aws-samples/sample-autonomous-modernization-factory'
    }
  ],
  certifications: [
    'AWS Certified DevOps Professional',
    'AWS Certified Solutions Architect – Associate',
    'AWS Certified SysOps Administrator Associate',
    'AWS Certified AI Practitioner',
    'HashiCorp Certified: Terraform Associate (004)'
  ],
  contact: {
    location: 'Gurugram, Haryana, India',
    email: 'arpitagarwal1308@gmail.com',
    phone: '+91-8299619940',
    linkedin: 'https://www.linkedin.com/in/00arpit00'
  }
};

/* ============================================================================
 * Section 2 — ThemeManager (task 5.2)
 *
 * Applies the active theme, handles the toggle, and reads/writes the
 * Theme_Preference. Themes switch via a single `data-theme` attribute write on
 * the root element; the toggle is a native <button> so it is keyboard-operable
 * for free. localStorage access is wrapped in try/catch so the site degrades
 * gracefully (e.g. private mode / blocked storage) and falls back to the dark
 * default without persisting.
 *   - resolveInitial: stored value if valid, else 'dark'   (Req 8.6, 8.7)
 *   - apply:          set data-theme + toggle a11y name/state (Req 8.4, 9.4)
 *   - toggle:         flip, persist, apply, return next     (Req 8.4, 8.5)
 *   - init:           read storage, apply, wire click        (Req 8.3, 8.6, 8.7)
 * ============================================================================
 */
const ThemeManager = {
  STORAGE_KEY: 'theme-preference',
  VALID: ['dark', 'light'],

  // Returns the stored theme if it is a valid theme, otherwise the 'dark'
  // default. (Req 8.6, 8.7)
  resolveInitial: function (storageValue) {
    return this.VALID.indexOf(storageValue) !== -1 ? storageValue : 'dark';
  },

  // Apply a theme: set <html data-theme> and reconcile the toggle button's
  // accessible name (aria-label) and aria-pressed with the new state. Guards
  // against a missing toggle button. (Req 8.4, 9.4)
  apply: function (theme) {
    document.documentElement.setAttribute('data-theme', theme);

    var button = document.getElementById('theme-toggle');
    if (!button) {
      return;
    }

    if (theme === 'dark') {
      // Dark is active → the button offers a switch to light.
      button.setAttribute('aria-label', 'Switch to light theme');
      button.setAttribute('aria-pressed', 'false');
    } else {
      // Light is active → the button offers a switch to dark.
      button.setAttribute('aria-label', 'Switch to dark theme');
      button.setAttribute('aria-pressed', 'true');
    }
  },

  // Flip between the two themes, persist the new value (best-effort), apply it,
  // and return the new theme. Persisting on every switch satisfies Req 8.5;
  // flipping makes two toggles an involution (Req 8.4).
  toggle: function (currentTheme) {
    var next = currentTheme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(this.STORAGE_KEY, next);
    } catch (e) {
      /* ignore: storage may be unavailable (private mode / blocked) */
    }
    this.apply(next);
    return next;
  },

  // Read the stored preference (treating any failure as no preference), apply
  // the resolved initial theme, and wire the toggle's click handler so it flips
  // using whatever theme is currently applied. Guards against a missing button.
  // (Req 8.3, 8.6, 8.7)
  init: function () {
    var stored = null;
    try {
      stored = localStorage.getItem(this.STORAGE_KEY);
    } catch (e) {
      stored = null;
    }

    var initial = this.resolveInitial(stored);
    this.apply(initial);

    var self = this;
    var button = document.getElementById('theme-toggle');
    if (!button) {
      return;
    }

    button.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      self.toggle(current);
    });
  }
};

/* ============================================================================
 * Section 3 — RevealController (task 6.1)
 *
 * Animates Experience entries into view on scroll, with robust fallbacks.
 *
 * The "hidden" start-state is gated behind a `js-enabled` class that this
 * controller adds to <html>. With JS disabled the class is never added, so the
 * CSS hidden rule never applies and every entry renders fully revealed
 * (Req 3.8). When IntersectionObserver is unavailable or the Visitor requests
 * reduced motion, `shouldAnimate()` is false and `revealAll` marks every entry
 * revealed immediately with no transition (Req 9.3). Otherwise each entry is
 * observed and revealed-then-unobserved as it enters the viewport so the
 * animation runs exactly once (Req 3.6).
 * ============================================================================
 */
const RevealController = {
  // Decide whether animated reveal should run at all. True only when
  // IntersectionObserver is supported AND reduced motion is not requested.
  // matchMedia is guarded defensively since very old environments may lack it.
  // (Req 3.6, 9.3)
  shouldAnimate: function () {
    var reduced = false;
    if (typeof window.matchMedia === 'function') {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return ('IntersectionObserver' in window) && !reduced;
  },

  // Mark a single entry revealed. Adding a class twice is a no-op, so this is
  // idempotent and safe to call from repeated intersection callbacks. (Req 3.6)
  reveal: function (el) {
    el.classList.add('is-revealed');
  },

  // Reveal every entry immediately — the fallback path for no-IO / reduced
  // motion. Uses Array.prototype.forEach.call so a live NodeList works on older
  // browsers. (Req 9.3)
  revealAll: function (entries) {
    var self = this;
    Array.prototype.forEach.call(entries, function (el) {
      self.reveal(el);
    });
  },

  // Observe each entry so it reveals-then-unobserves on first intersection,
  // ensuring the animation runs exactly once per entry. (Req 3.6)
  observe: function (entries, observer) {
    var self = this;
    Array.prototype.forEach.call(entries, function (el) {
      observer.observe(el);
    });
    return observer;
  },

  // Enable the hidden start-state (via the `js-enabled` class), select the
  // Experience entries, and either reveal them all immediately (fallback) or
  // wire up an IntersectionObserver that reveals and unobserves each entry as
  // it scrolls into view. (Req 3.6, 3.8, 9.3)
  init: function () {
    // Only now that JS is running do we enable the hidden CSS start-state, so
    // entries are fully visible when JS is disabled. (Req 3.8)
    document.documentElement.classList.add('js-enabled');

    var entries = document.querySelectorAll('.timeline-entry');

    if (!this.shouldAnimate()) {
      this.revealAll(entries);
      return;
    }

    var self = this;
    var observer = new IntersectionObserver(function (observed, obs) {
      Array.prototype.forEach.call(observed, function (entry) {
        if (entry.isIntersecting) {
          self.reveal(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

    this.observe(entries, observer);
  }
};
/* ============================================================================
 * Section 4 — Pure render/helper functions (task 7)
 *
 * Side-effect-free helpers used by render helpers (task 7.2) and exercised by
 * property tests (tasks 7.7, 7.8). They take plain inputs and return plain
 * values with no DOM access, so they are trivially testable by a Node-based
 * harness while the file still runs as a plain browser classic script.
 * ----------------------------------------------------------------------------
 * Contact / link helpers (task 7.1)
 * ============================================================================
 */

// Build a contact hyperlink href from a kind and a raw value.
//   - kind 'email' → `mailto:` + value   (Req 7.2)
//   - kind 'phone' → `tel:` + value       (Req 7.3)
//   - kind 'url'   → value as-is (already an https/url href)
// Any other kind falls through to returning the value unchanged so callers get
// a predictable, non-throwing result.
function buildContactHref(kind, value) {
  if (kind === 'email') {
    return 'mailto:' + value;
  }
  if (kind === 'phone') {
    return 'tel:' + value;
  }
  return value;
}

// True when the href is an absolute http(s) URL, i.e. points off-site. (Req 5.4)
function isExternal(href) {
  return /^https?:\/\//i.test(href);
}

// Attributes to apply to a hyperlink so external links open safely in a new
// tab; returns an empty object for internal links. (Req 5.4, 7.5)
function externalLinkAttrs(href) {
  return isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

/* ----------------------------------------------------------------------------
 * Render helpers (task 7.2)
 *
 * String-producing, DOM-free helpers that turn resume data into HTML markup
 * strings. They are the primary units exercised by the render property tests
 * (ordering/completeness). All text values are routed through `escapeHtml`
 * before interpolation so they can be safely embedded in markup.
 * ----------------------------------------------------------------------------
 */

// Escape the five HTML-significant characters so an arbitrary string value can
// be safely interpolated into a markup string. `&` is replaced first so the
// `&` introduced by the other entities is not double-escaped. The input is
// coerced to a string so non-string values produce predictable output rather
// than throwing.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Render a list of items as `<li>…</li>` markup, one element per item, in the
// exact input order (1:1, no reordering or omission). Each item's text is
// escaped. Used for skills and certifications lists and for an experience
// entry's achievements. (Req 4.2, 4.3, 6.1)
function renderList(items) {
  return items
    .map(function (item) {
      return '<li>' + escapeHtml(item) + '</li>';
    })
    .join('');
}

// Render a single Experience_Entry as an HTML string containing all five
// fields — title, employer, dates, location — and every achievement string as
// `<li>` items inside a `<ul>` (order preserved via `renderList`). The caller
// is responsible for preserving the most-recent-first order across entries
// (Req 3.1); this helper guarantees per-entry completeness. (Req 3.2)
function renderExperienceEntry(entry) {
  return '<article class="timeline-entry">'
    + '<h3 class="entry-title">' + escapeHtml(entry.title) + '</h3>'
    + '<p class="entry-employer">' + escapeHtml(entry.employer) + '</p>'
    + '<p class="entry-dates">' + escapeHtml(entry.dates) + '</p>'
    + '<p class="entry-location">' + escapeHtml(entry.location) + '</p>'
    + '<ul class="entry-achievements">' + renderList(entry.achievements) + '</ul>'
    + '</article>';
}

/* ============================================================================
 * Section 5 — CommonJS export (dev/test only)
 *
 * Guarded so the file still runs as a plain browser classic script where
 * `module` is undefined. A Node-based test harness can require() this file to
 * exercise the pure helpers. Exports accumulate into a single object so later
 * tasks can add more helpers (render helpers, etc.) without clobbering these.
 * ============================================================================
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Object.assign(module.exports || {}, {
    buildContactHref: buildContactHref,
    isExternal: isExternal,
    externalLinkAttrs: externalLinkAttrs,
    escapeHtml: escapeHtml,
    renderExperienceEntry: renderExperienceEntry,
    renderList: renderList
  });
}

/* ============================================================================
 * Section 6 — Initialization wiring (task 8.1)
 *
 * The script is loaded with `defer`, so the DOM is already parsed by the time
 * this runs in a browser. Activate the stored/default theme first, then the
 * reveal behavior:
 *   1. ThemeManager.init()      → sets <html data-theme> + wires the toggle
 *                                 (Req 8.6 apply stored preference; 8.7 dark default)
 *   2. RevealController.init()  → adds `js-enabled` + sets up scroll-reveal
 *                                 (Req 3.6 reveal on intersect; 3.8 JS-gated start-state)
 * Order matters: the theme attribute must be applied before reveal wiring.
 *
 * The `typeof document !== 'undefined'` guard keeps this inert under Node, so a
 * test harness can require() this file to exercise the pure helpers without the
 * init touching a non-existent DOM. (The CommonJS export above remains the only
 * side effect under Node.)
 * ============================================================================
 */
if (typeof document !== 'undefined') {
  ThemeManager.init();
  RevealController.init();
}
