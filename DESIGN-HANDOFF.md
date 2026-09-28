# Editorial / Terminal — working React integration

This is the existing `twfhyr/antseedmarkets` React application with the design integrated into its live components. It is **not** the standalone HTML prototype.

Baseline: upstream `v2` commit `c9719b03b1e78f7644ec26f396a1cd1738b6c525`.

## What changed

- Shared, labelled **Theme** control: Editorial / Terminal.
- Theme preference persists in `antseedmarkets.theme`; the earlier `classical` preference migrates to Terminal and `v2` to Editorial.
- Theme changes do not remount page components or clear open forms. Storage-disabled browsers fall back safely to Editorial.
- RainbowKit wallet selector follows the theme, retaining the real wallet connection component.
- Live marketplace uses the existing v2 cards, metrics, filters, table/history/detail views and illustration, with both visual treatments.
- Portfolio gets the editorial introduction, public-address lookup, two-column buyer/provider panels and styled holdings, all backed by existing requests.
- Rewards gets the matching introduction, lookup, real summary cards and epoch tables. Existing claim warnings and claim/stake handlers are retained.
- Responsive layout and keyboard focus styling; full wallet addresses wrap on narrow screens.

## Functional boundaries

`src/api.js`, `src/lib/`, routing hooks and `src/wagmi-config.js` are unchanged from the baseline. Marketplace card buttons now use a dedicated price row, primary “Buy position” and secondary “Make offer” actions, with accessible busy labels. Keyboard activation on the parent card is scoped to the card itself so it does not intercept Enter/Space on its action buttons. Existing buy/offer handlers and hover/focus prewarming are retained. Portfolio and Rewards changes are presentation/labels only; their fetch, validation, eligibility, transaction and error-handling code has not been replaced with prototype code. No illustrative balances or fake actions have been introduced into the application.

`design-preview/` is the earlier, separate mockup for reference. It is outside `public/` and is not included in the Vite app. It can be omitted from the handover without affecting the app.

## Run

Use the project's supported Node/npm environment (build and existing scripts were checked here with Node 26.9.0).

```sh
npm ci
npm run dev
```

Vite runs on port 5174 by default; use `npm run dev -- --port 5175` if it is occupied. The existing dev proxy forwards `/api` to `https://antseedmarkets.com`. This is real data: signing wallet actions can affect real assets. Do not treat this as a sandbox.

```sh
node --test scripts/*.test.mjs
npm run build
```

Production still requires the existing `/api` reverse proxy and SPA fallback described in README.md. This repository does not contain the backend. Do not deploy by simply replacing backend files or copying the prototype over the live app.

## Validation completed locally

- Production build passed.
- All 10 existing script-based regression tests passed (theme assertions updated to the new Editorial/Terminal contract).
- Automated Chrome checks: navigation, theme persistence across navigation/reload, retaining search text during a theme change, invalid-address feedback, and opening the real RainbowKit wallet selector.
- All three routes checked at desktop/tablet/mobile widths in both themes without page-level horizontal overflow or uncaught page errors.
- Read-only live checks: marketplace returned listings; a public address returned actual holdings; Rewards returned an epoch/rewards summary from the backend.
- Browser-only test fixtures additionally checked populated buyer/provider panels and reward tables in both themes down to 320px width. These fixtures are not part of the app.

## Still required before production sign-off

The owner must test connected-wallet flows (including rejected signatures, wrong network, pending/error states, and completed transactions) in an appropriate controlled environment. No transaction was signed or submitted during this work. Preserving handlers and passing UI tests does not constitute a financial/security audit.

The existing dependency lockfile was left unchanged. `npm ci` reported **24 dependency vulnerabilities (23 moderate, 1 high)** plus upstream deprecation/peer warnings. The production build also reports existing large-chunk and dependency annotation warnings. Review dependencies separately; no automatic force upgrades were applied to the wallet stack.

Existing RPC/WalletConnect configuration was retained. Verify the owner's production credentials, allowed origins and endpoints before deployment.

## Files to port into a newer checkout

If upstream has moved on, review/merge only these files instead of overwriting the entire repository:

- `src/App.jsx`
- `src/main.jsx`
- `src/theme.jsx` (new)
- `src/design.css` (new)
- `src/components/Header.jsx`
- `src/components/PageIntro.jsx` (new)
- `src/components/StakeANTS.jsx`
- `src/components/Portfolio.jsx`
- `src/components/Rewards.jsx`
- `scripts/uiStyleToggle.test.mjs`

No runtime dependency or lockfile changes are needed for this design integration.
