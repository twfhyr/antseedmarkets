---
name: antseed-provider-directory
description: Build and maintain Ellis's independent provider directory, customisable provider homepages and studio; distinguish the current local prototype from future verified publishing infrastructure.
---

# Skill: Antseed Directory

## Start

Read `AGENTS.md` and `README.md`. The approved brand is **Antseed Directory**, **part of Antseed Markets**, with parent-site links; not official Antseed branding. For commercial features, also read `SPONSORSHIP.md`. Locate the folder containing this file instead of assuming the original absolute path still applies. Verify whether the user wants a visual/editor change or the next backend phase.

## Local workflow

1. Read `app.js` and relevant CSS before changes. The app uses hash routing and escaped template rendering.
2. Preserve the six illustrative profiles and clear demo labels until a real data integration exists.
3. Keep profile edits in `draft`; saved draft and published local profile are distinct. Bookmark changes must not inadvertently save unsaved profile edits.
4. Avoid replacing active editor fields on every keystroke; update the preview without stealing focus.
5. Use `e()` for user text in HTML and `safeURL()` for website links. Keep palette/pattern allowlists and restricted image formats. Do not render arbitrary user HTML.
6. Check all relevant routes and mobile widths after visible changes.
7. Update handover files when functionality or stage changes.

## Preview

Use an existing correct server on 8082, or use the environment's persistent server tool from this folder:

```sh
python3 -m http.server 8082
```

Then open `http://localhost:8082` in the preview. Use `/#studio` to inspect editing and `/#provider/northstar-ai` for an example public-style page.

This does not publish on the public internet. Browser storage and local URLs are not a public account or shareable hosted page.

## Checks

```sh
node --check app.js
node scripts/check.cjs
```

On the original Mac, Node is available in `/Users/ellis/.local/bin` if it is missing from PATH.

Manual/browser checklist:
- Search, categories, alphabetical sort and empty results.
- Shortlist add/remove and reload persistence.
- Grid/List switching.
- Example provider page and information dialogs.
- Change name/headline/story, switch editor tabs, verify live preview.
- Add/reorder/remove services.
- Change palette and cover motif; test logo upload rejection and valid image display.
- Save draft, reload, and confirm it remains separate from the published version.
- Publish locally; find the new directory entry and reopen it after reload.
- Ensure website links accept HTTP/HTTPS only, with no embedded credentials.
- Inspect narrow layouts and keyboard focus.
- Check `#partners`, sponsorship labels, parent-site links and the local-only brief download.
- Do not claim sponsorship enquiries, bookings or payments were submitted: those systems are not connected.

Use a disposable browser context for automated tests so sample test edits do not overwrite Ellis's local draft.

## Next phase: actual publishing

Do not label a browser-only demo as a working multi-user service. A real beta requires an explicit architecture and deployment decision:

- Server-side wallet challenge verification, replay prevention and sessions.
- Verified agent/provider authority and an ownership-transfer policy.
- Database, drafts, publishing history and access controls.
- Image processing/storage, moderation, reporting and abuse protection.
- Trusted and fresh network data with untrusted-endpoint/SSRF protections.
- Hosting, backups and monitoring.

Prefer a separated publishing service rather than coupling directory permissions to the marketplace's trading backend. No new financial contracts or asset approvals should be needed for profile editing.

## Finish

Report what is working, what is local-only, what was tested and where files are saved. Only claim GitHub upload or public deployment after the relevant action succeeds. Never request or store wallet secrets or access tokens in project files.
