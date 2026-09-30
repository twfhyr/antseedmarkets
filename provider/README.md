# Antseed Directory

An interactive design prototype for **Antseed Directory**, a provider directory and customisable homepage service **part of Antseed Markets**. Independently operated, not an official Antseed website.

**This is a local prototype, not a publicly operational directory.** All six starter providers are fictional examples. No ownership, privacy, model or availability claim has been verified. There are no wallet connections, transactions, live discovery calls, user accounts or backend services.

## Run

No installation or build step is needed:

```sh
python3 -m http.server 8082
```

Open **http://localhost:8082**.

- `#directory`: searchable/filterable directory, Grid/List display and shortlist.
- `#provider/northstar-ai`: example provider page (other cards have their own routes).
- `#studio`: profile, service and style editor with live preview.
- `#provider/your-studio`: your locally published profile, after using the studio.
- `#about`: concept and prototype boundaries.
- `#partners`: sponsorship formats, AntBeacon's example campaign across all four proposed options, a labelled placement mockup and a downloadable campaign brief. No enquiry is submitted, booking made or payment taken.

## Try the studio

1. Click **Create your page**.
2. Change the provider name, headline, introduction, story, tags or optional website.
3. In **Services**, add, edit, reorder or remove services; add model/capability descriptions.
4. In **Style**, choose a colour palette, select cover artwork or upload a logo.
5. Use Wide/Narrow preview controls to inspect the layout.
6. **Save draft** persists the draft without changing the published profile.
7. **Publish locally** creates/updates one additional directory listing in this browser.

The visual theme preference is stored under `antseed-directory-theme`; `classical` is the default and `hardcore` is the deliberately dark, neon, terminal-like alternative.

Drafts, the locally published profile and shortlist are stored in `localStorage` under `antseed-directory-v1`. Different browsers, hostnames and ports have separate storage. Clearing browser storage removes this content. Keep independent copies of anything important.

**Copy link does not publish local content to the internet.** Another device will not see your locally created profile without a future server-backed publishing system.

## Content handling

- Text is escaped, not evaluated as HTML.
- Website links are limited to HTTP/HTTPS and reject embedded username/password credentials.
- Logo picker accepts PNG/JPEG/WebP up to 2 MB; no SVG, custom scripts or arbitrary embeds.
- Palette and pattern values are allowlisted.
- Storage failures are reported instead of claiming successful persistence.

These are prototype protections, not a production security review. A public service needs server-side validation, robust upload processing, authorisation, rate limiting and moderation.

## Files

- `index.html`: document shell, navigation mount points and accessible information dialog.
- `style.css`: editorial visual system, provider palettes, generated cover motifs and responsive layouts.
- `partners.css`: parent-brand links and sponsorship page styles.
- `hardcore.css`: the Classical/Hardcore theme switcher and deliberately extreme technical visual treatment.
- `SPONSORSHIP.md`: proposed commercial model and disclosure rules.
- `app.js`: sample profiles, hash routing, filtering, shortlist, studio and local persistence.
- `scripts/check.cjs`: dependency-free helper checks.
- `AGENTS.md` / `SKILL.md`: project context and maintenance workflow.

Google Fonts provides DM Sans and Libre Caslon Display, with local font fallbacks. Artwork and interface icons are inline SVG/CSS; there are no stock image dependencies.

## Checks

If Node is available:

```sh
node --check app.js
node scripts/check.cjs
```

Browser testing during development covered search/no-results, shortlist, Grid/List, example profiles, informational dialogs, saving/reloading drafts, style changes, service creation and local publication/reload. Directory, provider, studio and about layouts were checked from 320px to 1440px with no page-level horizontal overflow or uncaught page errors in those checks.

## What comes next

After approving the experience:

1. Database-backed profiles, drafts and versioned publication.
2. Server-verified wallet login with a domain-bound, expiring, single-use challenge and appropriate smart-wallet support.
3. Verification of authority over the provider/agent identity, including ownership changes and editorial delegation.
4. Reliable signed metadata collection and clearly sourced/fresh network facts. Treat endpoint discovery as untrusted input; protect server-side fetches from SSRF.
5. Upload storage/re-encoding, moderation/reporting, access controls and abuse limits.
6. Hosting, backups, observability and a small provider pilot.

Do not import marketplace financial permissions, signed orders or production database access into this publishing prototype. No deployment or GitHub repository has been configured for this project.
