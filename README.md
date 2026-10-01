# antseedmarkets

The lANTS marketplace: trade, offer, split, merge and move locked ANTS
(lANTS) position NFTs on the AntSeed network. **The marketplace built by
ants for ants.**

## Why this is its own repo

Through 2026-09-24 this lived inside `antseed-zh`'s monorepo as a
`BUILD_TARGET=market` Vite variant of the same React tree used for
antseed-zh.com's full company dashboard -- same components, same nav-gating
flag (`IS_MARKET_VARIANT`), just a different subset of tabs shown. That
meant antseedmarkets.com's browser tab title, social-share preview, and
codebase were all indistinguishable from antseed-zh.com's except by careful
inspection.

This repo is the fix: a standalone frontend for antseedmarkets.com --
[`StakeANTS.jsx`](src/components/StakeANTS.jsx) (the lANTS marketplace),
[`Portfolio.jsx`](src/components/Portfolio.jsx), Rewards, and
[`Providers.jsx`](src/components/Providers.jsx) (live directory: catalog,
homepages, comments, chat). English-only copy (no i18n language switcher,
no `zh.js` -- see `src/i18n/index.jsx`).

The Providers tab visual system comes from Ellis's Antseed Directory
prototype in [`provider/`](provider/README.md). Live listings are the DHT
catalog (`GET /api/sellers`), not the fictional sample profiles in that
folder.

lANTS and provider cards (and their detail pages) have a Share menu that
builds the existing detail URL so users do not copy the address bar.
Targets are X, Telegram, Discord (copy to paste), and Copy link. See
[`docs/SHARE.md`](docs/SHARE.md).

Everything else that lives in antseed-zh (Overview, Buyers, Sellers,
Stakers, Services, Tokenomics, $ANTS Info, Rewards, Chat, Town Board,
About) stays there. Nothing here is a fork of that repo -- it's a fresh,
much smaller codebase that happens to reuse a few files verbatim
(`StakeANTS.jsx`, `Portfolio.jsx`, `listLants.js`, the i18n string table)
because that's the actual marketplace logic and there was no reason to
rewrite working, already-shipped code.

## Architecture: frontend-only, shares antseed-zh's backend

This repo has **no backend of its own**. `src/api.js` calls relative
`/api/...` paths, same as antseed-zh's frontend always has. In production,
nginx serves this repo's static `dist/` build for everything else and
proxies `/api/` to `127.0.0.1:3001` -- the same Express process that
already serves antseed-zh.com and already has every route the marketplace
needs (`/api/lants-market`, `/api/lants/*`, `/api/history/buyer/:address`,
`/api/history/seller/:address`, `/api/sellers`), backed by the same
Ponder indexer for ground-truth lANTS ownership/trade history. See
`/etc/nginx/sites-available/antseedmarkets-com` on the production host.

Duplicating that backend (chain reads, indexer proxying, Seaport order
storage) into this repo would mean maintaining two copies of the same
logic for zero benefit -- the data is identical either way, only the
frontend's identity needed to be independent.

## Data sources

Same as antseed-zh's own lANTS marketplace: the backend's `/api/lants-*`
routes merge self-reported trades with the Ponder indexer's ground-truth
Base-mainnet ownership/trade history (see antseed-zh's
`backend/lants-trades.js` / `backend/lants-indexer.js`). Never fabricated
-- see antseed-zh's `AGENTS.md` for the "never fabricate a number" rule
this inherits by construction (all real data comes from that shared
backend).

## Developing

```
npm install
npm run dev      # vite dev server on :5174
```

There's no local backend to run alongside it -- point `/api/*` at a real
antseed-zh backend (e.g. via a dev proxy, or just test against the
production API) if you need live data locally.

```
npm run build     # writes dist/, deploys on this host the moment nginx serves it (static files, no restart needed)
```

## Deploy (production host)

Static build served directly by nginx (no Node process for this repo):

1. `npm run build` (writes `dist/`).
2. nginx (`antseedmarkets-com` site) serves `dist/` for everything except
   `/api/`, which it proxies to the antseed-zh backend on `:3001`.
3. No restart needed for a frontend-only change -- nginx reads `dist/`
   straight off disk on every request, same as antseed-zh's Express
   `express.static` did before the split.
