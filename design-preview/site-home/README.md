# Approved homepage design — local integration handover

Status: design/reference package, NOT a production deployment. Source copied from
`AntseedHome/`. This folder is outside Vite's public directory and is not shipped
by the Markets build. Its port 5176 links are local-preview links only.

Approved navigation on every page beside Antseed Markets logo:
My Antseed · Providers · Marketplace. Staking stays inside My Antseed.
Next is accessible only from the homepage; its page has the same three links.
The illustration's seed and label positions were approved by Ellis.

## Changes included in this branch

- Actual Markets Header.jsx now shows the three approved navigation items.
- Homepage, styles, illustration interactions and Next page are preserved here.
- My Antseed header link uses VITE_MY_ANTSEED_URL, falling back to /my-antseed/.
  For the current local preview set VITE_MY_ANTSEED_URL=http://127.0.0.1:3120/my-antseed/.

## Required before deployment

1. Integrate homepage as root route; move existing Stake desk under account area
   without rewriting its financial handlers. Marketplace currently uses /lants,
   Providers uses /providers; preserve existing deep links.
2. Replace all prototype localhost destinations with deployed routes.
3. Deploy upstream apps/ants as a separately built shared-source application,
   not an iframe and not a copied maintained fork. Pin the upstream revision,
   review/test upgrades before deploying. Current reference: 0797ef7.
4. Implement hosted authentication and per-user session isolation. Existing ANTS
   service keeps account/signer context per server instance: do not expose that
   shared mutable context to multiple website users. Do not remove its token gate.
5. Verify wallet control via a signed challenge with nonce/expiry/domain binding;
   verify the selected account's operator relationship and action-specific rights.
   Wallet connection alone is not authentication, and operator rights are not
   universal seller/position ownership rights. Define account selection/discovery.
6. Payments is a separate upstream app; apps/ants does NOT complete USDC payment
   integration. Inventory and integrate those functions separately.
7. Test wrong-wallet/account, revoked operator, expired session, multiple concurrent
   users and clean-browser entry without AI VPN. Keep provider role checks intact.
8. Keep provider comments/chat accessible but not promoted as homepage features.

No session tokens, identities, node_modules or upstream build artifacts belong in
this handover. The local generated ANTS header wrapper is not a production
integration. Do not deploy the navigation change until /my-antseed/ works.
