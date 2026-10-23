# Arpit Agarwal — Personal Website

The personal site of Arpit Agarwal, DevOps Engineer and Cloud Consultant at AWS Professional Services. It tells the story of my career, from QA automation to AWS deployment support to enterprise cloud modernization, styled as a CI/CD pipeline.

Built with plain HTML, CSS, and vanilla JavaScript. No framework, no bundler, no build step.

## Features

- **Career as a pipeline**: the hero shows my roles as pipeline stages (Test → Deploy → Deliver → Next) that light up in sequence.
- **Story-first sections**: About, Impact, Journey, Toolbox, Open source & writing, Certifications, Now, and Contact.
- **Animated impact metrics**: counters for numbers from my work (74+ apps modernized, 30% cost cut, ~1,200 cases deflected per quarter, and more).
- **Journey timeline**: each role is a "chapter" with a short summary and an expandable build log of achievements.
- **Motion**: a typing role rotator, scroll-reveal, a data packet flowing along the timeline, and a scroll-driven deploy progress bar.
- **Dark and light themes**: dark by default. The toggle remembers your choice in `localStorage`.
- **Accessible**: semantic landmarks, a skip link, native keyboard-operable controls, visible focus rings, and screen-reader text for animated content.
- **Reduced motion**: all animation is turned off when `prefers-reduced-motion` is set.
- **Progressive enhancement**: all content is in the HTML, so the site still reads fully with JavaScript disabled.

## Project structure

```
.
├── index.html                              # All content and section markup
├── css/
│   └── styles.css                          # Theme tokens, layout, pipeline styling, animations
├── js/
│   ├── main.js                             # Resume data, theme manager, timeline reveal, pure helpers
│   └── animations.js                       # Rotator, counters, pipeline sequencing, progress bar, nav highlight
├── Latest_Arpit_Agarwal_Resume_Oct2026.pdf # Résumé download linked from the hero
├── tests/                                  # Dev-only test suite (Node built-ins only)
│   ├── run-all.js                          # Runs every *.test.js in its own process
│   └── *.test.js
└── package.json                            # Dev-only: `npm test` script
```

Only `index.html`, `css/`, `js/`, and the PDF are needed to host the site. `tests/` and `package.json` are for development only.

## Running locally

No install required. Either:

- Open `index.html` directly in a browser, or
- Serve the folder with any static server, for example:

  ```bash
  python3 -m http.server 8000
  # then visit http://localhost:8000
  ```

## Testing

Tests use only Node.js built-ins, with no dependencies to install.

```bash
npm test
# or
node tests/run-all.js
```

The suite covers:

- Property-based tests (100+ randomized iterations each) for theme toggling, persistence, and initialization; timeline ordering and render completeness; skills and certifications rendering; external-link safety; and contact link construction
- Unit tests for the scroll-reveal controller
- Accessibility and content checks on `index.html`: keyboard-reachable controls, accessible names, the dark default, required sections, and exact certification and link values

## Deployment

All asset paths are relative, so the site works on any static host.

**GitHub Pages**

1. Push this folder to a GitHub repository.
2. Go to **Settings → Pages** and set the source to the `main` branch, root folder.
3. The site is published at `https://<username>.github.io/<repo>/`.

Netlify, Vercel, Amazon S3 + CloudFront, and AWS Amplify Hosting also work. Upload the folder as-is.

## Customizing

- **Content**: edit `index.html` directly. If you change résumé facts (roles, dates, skills, certifications, contact details), also update the `RESUME` object in `js/main.js` so the tests stay in sync.
- **Colors**: theme tokens are CSS custom properties at the top of `css/styles.css`, under `[data-theme="dark"]` and `[data-theme="light"]`.
- **Rotating roles**: edit the `data-words` attribute on `.hero-rotator` in `index.html`, separating roles with `|`.
- **Metrics**: each counter reads `data-count`, plus optional `data-prefix` and `data-suffix`, from its `.stat-num` element.

## Contact

- Email: [arpitagarwal1308@gmail.com](mailto:arpitagarwal1308@gmail.com)
- LinkedIn: [linkedin.com/in/00arpit00](https://www.linkedin.com/in/00arpit00)
- Open source: [aws-samples/sample-autonomous-modernization-factory](https://github.com/aws-samples/sample-autonomous-modernization-factory)
