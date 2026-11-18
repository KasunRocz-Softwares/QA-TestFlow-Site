# QA TestFlow — website

Product site for **QA TestFlow**, a dependency-aware QA test management platform by KasunRocz Softwares.

**Live:** https://kasunrocz-softwares.github.io/QA-TestFlow-Site/

The app's source code is private; this repository holds only the public website.

## Editing

Plain static files, no build step:

- `index.html` — the page
- `styles.css` — styles, in the [KasunRocz Softwares](https://kasunrocz-softwares.github.io/) visual family (green accent)
- `app.js` — the live-run mock, the interactive dependency map, the tally ring and the release sign-off animation
- `kr-hero.js` — the 3D dependency-graph planet behind the hero (Three.js from jsDelivr; the page works without it)
- `icon.svg`, `og.png` — tab icon and link-preview image
- `setup/docker-compose.yml`, `setup/env.example` — the self-host files shown and offered for download in the Setup section.
  They are copies of `deploy/` in the private QA-Tool repo; update both together.

Preview locally with `python -m http.server` in this folder. GitHub Pages publishes `main` on every push.
