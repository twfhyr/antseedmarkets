# Directory — project handover

## Identity and current status

This is Ellis's **Antseed Directory**, explicitly **part of Antseed Markets**, created in the user-provided `Directory/` folder. Use that capitalisation in the visible wordmark. Header ribbon and footer link to `https://antseedmarkets.com/`; this does not imply official Antseed affiliation. Original path: `/Users/ellis/.antseed/projects/Directory/`.

The concept is a space where independent providers promote themselves through customisable homepages. It should help visitors understand the people, approach and services behind a provider—not merely show another table of models or staking positions.

**Current stage: interactive local prototype.** It does not yet have a backend, verified ownership, live provider discovery or public publishing. Never call it a production-ready directory or imply the sample providers are real. The user has previously requested real-app integration for another project, so be particularly clear about which phase this project is in.

Read `README.md` and `SKILL.md` before continuing.

## Design direction

Family resemblance to Antseed Markets' Editorial theme, but a separate identity:

- Warm cream paper, dark forest-green type, muted sage accents.
- DM Sans for interface text; Libre Caslon Display for editorial headings.
- Seed/leaf line mark and an original orbital network illustration.
- Restrained geometric cover art in Forest, Sage, Clay, Sand, Blue and Olive palettes.
- Welcoming, human-centred copy: “Find your kind of intelligence.”
- Individual provider identities within a consistent directory framework.

No Terminal theme was requested or implemented here. Do not automatically import the trading app's entire interface.

## Implemented

- Seven explicitly illustrative provider profiles, led by AntBeacon as the selected example seller/advertiser.
- Search across names, descriptions, categories, tags and model labels.
- Category filters, alphabetical/directory ordering, Grid/List view, no-results state.
- Persistent local shortlist.
- Dedicated provider pages with biography, services, capabilities, ownership/availability disclosures and next-step information.
- Studio with Profile, Services and Style sections.
- Live Wide/Narrow preview, six palettes, three cover patterns, optional logo upload.
- Service creation, editing, reordering and removal.
- Separate local draft saving and local publication; publishing creates one additional local directory profile.
- Informational dialogs explain unimplemented network connection/reporting rather than pretending those actions occurred.
- Classical/Hardcore theme switcher. Hardcore intentionally uses the stereotypical dark terminal/neon AI aesthetic while retaining readable content and the same trust boundaries.
- AntBeacon example campaign shown across all four sponsorship formats; no payment, booking or external AntBeacon URL is connected.
- Responsive layouts, keyboard focus, skip link and live-region feedback.

## Files and routes

Static HTML/CSS/JavaScript; no package installation or build needed.

- `index.html`, `style.css`, `partners.css`, `app.js`.
- `SPONSORSHIP.md`: commercial format proposals, disclosure boundaries and launch sequence.
- `scripts/check.cjs`: dependency-free helper regression checks.
- `README.md`: run instructions, prototype boundaries and production roadmap.
- Preview: **http://localhost:8082** (reuse if still serving this folder).
- Routes use hashes: `#directory`, `#about`, `#studio`, `#provider/<id>`.
- Local custom profile ID is `your-studio`; its slug is not yet editable.
- Storage key: `antseed-directory-v1`. Browser storage is origin-specific; it is not a database or portable account.

## Product and trust boundaries

Ellis is an Antseed ecosystem participant and friend of a founder, not an official spokesperson. This directory is an independent concept.

Keep three kinds of content distinct:
1. Provider-written marketing claims.
2. Independently sourced network facts, once a real integration exists.
3. Illustrative prototype data, used now and labelled as such.

Do not add fake online badges, verified ownership, ratings, prices, performance figures, privacy guarantees, staking yield or testimonials. Sample provider names are fictional and capabilities are illustrative.

The future page-claiming flow should verify the actual provider/agent authority server-side. An NFT/operator approval or wallet connection alone is not proof of editorial ownership. Ownership transfer/revocation and delegated editors need explicit policies.

No arbitrary scripts, executable HTML or wallet widgets in provider content. Wallet authentication must not request spending permissions. A public metadata fetcher must validate signed metadata and be protected from SSRF; discovery endpoints are untrusted inputs.

## Sponsorship direction

Ellis wants to sell marketing space within the directory. The `#partners` page presents four proposed formats: Featured provider, Category partner, Directory/founding partner, and Sponsored guide. The navigation calls this **For partners**. Directory and footer calls to action lead there.

A sponsored placement mockup is labelled as such. No paid inventory is actually being served, no prices or audience figures have been invented, and payment/booking is not connected. A brief form downloads a text file locally; it does not submit or store the entered information.

Keep sponsorship distinct from ordinary ranking, verified identity, model availability and endorsement. Never sell a verification badge or disguise paid results. Preserve the ordinary directory experience. See `SPONSORSHIP.md` before adding commercial functionality.

## Latest QA

Browser checks covered search/filtering, shortlist, Grid/List, profiles, dialogs, draft persistence/reload, style changes, adding services and local publication/reload. Layouts checked at 1440, 1024, 768, 390 and 320 pixels without page-level horizontal overflow in those checks. No uncaught page errors were observed. Partnership-page navigation, its four formats, local brief download and responsive layouts down to 320px were also browser-tested.

Run `node --check app.js` and `node scripts/check.cjs` when Node is available. For visible changes, reopen the browser preview and inspect affected screens. Do not equate passing prototype tests with production authentication or upload security.

## Related projects

- `../antseedmarkets-design/`: standalone trading-site design prototype and research notes.
- `../antseedmarkets-v2/`: real React trading app, connected to a live backend and Base mainnet. Do not casually copy its transaction flows here.
- `../we-sell-it/`: Ellis's separate personal website.

This folder has no configured Git remote or production deployment. Do not assume a push to another project's repository publishes it.

## Communication and handover

Ellis prefers implementation and an immediate preview over lengthy proposals. Be clear and practical, especially about hosting and Git. Keep the project notes updated as stages are completed; never leave a later agent guessing whether the directory is local or publicly operational.
