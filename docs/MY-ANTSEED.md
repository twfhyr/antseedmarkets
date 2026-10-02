# My Antseed

Hosted version of the official `antseed ants` dashboard, so people do not have to run the CLI locally.

- Frontend: antseedmarkets `/my-antseed` (this repo, `ellis/site-navigation`).
- Reads: antseed-zh `GET /api/ants/*`, same `{ ok, data }` envelope and service functions as `apps/ants`.
- Writes: signed in the browser with the connected wallet. There is no CLI session token, no `#token=` hash, and no Bearer auth.
- Copy: same fields as official. The official Seller tab is labelled Provider here. `/my-antseed/seller` redirects to `/my-antseed/provider`.
- Disconnected users can still read network, pools, emissions, and usage. Wallet tiles stay at zero until Connect wallet.

Inner routes: `/my-antseed`, `/my-antseed/rewards`, `/my-antseed/provider`, `/my-antseed/network`, `/my-antseed/addresses`.
