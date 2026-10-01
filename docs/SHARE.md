# Share lANTS and providers

Shipped on antseedmarkets.com (frontend only). No API or antseed-zh change.

## Why

Listings already had stable detail URLs (`/lants/{id}` and `/providers/{agentId}`), but the only way to share them was to open the page and copy the address bar. Share now lives on the card and on the detail header, so a listing can be sent in one click.

## What the user sees

A Share control on:

- lANTS cards (grid), table rows, NFT cards, and the lANTS detail header
- Provider cards (icon on the cover) and the provider detail toolbar
- Discovery pitch cards (shares the provider detail page, not a separate Discovery URL)

The menu is the usual sheet:

| Target | What it does |
| --- | --- |
| X | Opens `x.com/intent/tweet` with a short title and the detail URL |
| Telegram | Opens `t.me/share/url` with the same URL and title |
| Discord | Copies `title` plus the URL. Discord has no web share intent, so the user pastes into Discord |
| Copy link | Copies only the detail URL |

Example payloads:

- lANTS: `https://antseedmarkets.com/lants/140` with title `lANTS #140 on antseedmarkets`
- Provider: `https://antseedmarkets.com/providers/44896` with title `{name} on antseedmarkets`

Clicking Share does not open the card. The menu stays on screen on desktop and mobile (it flips above the button when there is no room below).

## What we did not do

- No new routes. Share always points at the existing detail page.
- No backend, indexer, or tracking. The browser builds an absolute URL from `window.location.origin`.
- No native OS share sheet. X and Telegram are links; Discord and Copy link use the clipboard.

## Code

- `src/components/ShareMenu.jsx` and `src/share.css`: the menu, portal (so card `overflow: hidden` cannot clip it), and viewport placement
- Wired in `StakeANTS.jsx` (lANTS), `Providers.jsx` (directory cards and detail), `Discovery.jsx` (pitch cards)
- Provider cards are a `div` plus an inner link so the share chip is not nested inside `<a>`
- Copy in `src/i18n/en.js` under `share.*`
- Guard tests in `scripts/shareUx.test.mjs`

Try it live: [antseedmarkets.com/lants/all](https://antseedmarkets.com/lants/all) and [antseedmarkets.com/providers](https://antseedmarkets.com/providers).
