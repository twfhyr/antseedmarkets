# Antseed Markets — design-only prototype

A standalone visual reference for the lANTS, Portfolio and Rewards pages, with two switchable themes:

- **Editorial:** warm cream, serif headings, illustrated marketplace.
- **Terminal:** dark navy, mint/cyan accents, compact spacing and monospaced figures.

This folder deliberately does not replace or modify the React app, API integration, wallet connections or transaction code in the parent repository.

## Preview locally

From this folder run:

```sh
python3 -m http.server 8081
```

Open http://localhost:8081/. No Node dependencies or build step are required. Google Fonts is used with local font fallbacks.

Pages:
- `index.html` — lANTS marketplace
- `portfolio.html` — buyer/provider activity and holdings
- `rewards.html` — usage rewards and preview claim/stake dialogs

Use the **Editorial / Terminal** buttons in the header. The preference is saved in localStorage and shared across all three pages. A direct URL such as `index.html?theme=terminal` selects a theme on arrival.

Portfolio and Rewards include **Example view / Disconnected view** controls to inspect both layouts.

## Important: illustrative data only

All positions, balances, activity, epochs and reward amounts are sample data for design review, not real offers or account information. Address searches do not query the network. Wallet buttons do not connect wallets. Claim and staking controls only demonstrate dialogs and never create, sign or submit transactions.

This is not a production-ready trading application or a complete recreation of every component in the live app. Port the visual treatment into the existing components while preserving real data sources, validation, restrictions, accessibility and transaction safeguards. Do not copy the mock data into production or substitute these preview scripts for application logic.

## Files

- `style.css` — original editorial marketplace styles
- `pages.css` — Portfolio and Rewards layouts
- `theme.css` — shared theme switch styles and Terminal overrides
- `theme.js` — early theme application, accessible toggle and persistence
- `app.js` — illustrative marketplace interactions
- `pages.js` — illustrative Portfolio/Rewards content and interactions

The preview intentionally sits outside `public/` so it is not automatically included in the existing production build.
