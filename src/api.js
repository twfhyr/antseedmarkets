// antseedmarkets is a standalone static frontend -- it has no backend of
// its own. These calls go through nginx's same-origin proxy of /api/ to
// antseed-zh's existing backend (127.0.0.1:3001, see backend/server.js in
// that repo), which already has every route the lANTS marketplace and
// Portfolio need (indexer-backed lANTS ownership/trades, buyer/seller
// history). No CORS, no duplicated chain-reading logic.
const API_BASE = '/api';

async function get(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function post(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export async function fetchSellers() {
  return get('/sellers');
}

/**
 * lANTS NFT market, paginated/filtered/sorted server-side. `params` may
 * include: page, pageSize, sort ('id'|'amount'|'lockDays'|'daysRemaining'|
 * 'price'|'offer'), dir ('asc'|'desc'), owner, agentId, minAmount, maxAmount,
 * minLockDays, maxLockDays, listed ('1' for listed-only), offered ('1' for
 * tokens with at least one open offer), wait ('1' to
 * force a synchronous refresh instead of stale-while-revalidate).
 */
export async function fetchLantsMarket(params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') qs.set(k, v);
  }
  const q = qs.toString();
  return get(`/lants-market${q ? `?${q}` : ''}`);
}

export async function postLantsListing(body) {
  return post('/lants/list', body);
}

/** The stored signed Seaport order for a listed lANTS token, for direct on-chain fulfillment. */
export async function fetchLantsOrder(tokenId) {
  return get(`/lants/order/${tokenId}`);
}

export async function cancelLantsListing({ tokenId, message, signature }) {
  return post('/lants/cancel', { tokenId, message, signature });
}

export async function postLantsOffer(body) {
  return post('/lants/offer', body);
}

/** All active (not cancelled/accepted) offers on one token. */
export async function fetchLantsOffers(tokenId) {
  return get(`/lants/offers/${tokenId}`);
}

/** One offer's stored signed order, for the owner to fulfill directly. */
export async function fetchLantsOffer(offerId) {
  return get(`/lants/offer/${offerId}`);
}

export async function cancelLantsOffer({ offerId, message, signature }) {
  return post('/lants/offer/cancel', { offerId, message, signature });
}

/** Records that an offer was accepted -- call this after the on-chain
 *  fulfillOrder() tx confirms, not before. `seller` is the accepting
 *  (current owner's) wallet, recorded into the trade history. `txHash`
 *  is optional but should be the accept tx's hash when available, so the
 *  Activity tab's record of this trade carries a real on-chain reference. */
export async function acceptLantsOffer(offerId, seller, txHash) {
  return post('/lants/offer/accept', { offerId, seller, txHash });
}

/** Records a completed listing purchase for the Activity tab -- call after
 *  the buyer's fulfillOrder() tx confirms. */
export async function postLantsTrade(body) {
  return post('/lants/trade', body);
}

/** Paginated trade history (listing buys + accepted offers), newest first. */
export async function fetchLantsTrades(params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') qs.set(k, v);
  }
  const q = qs.toString();
  return get(`/lants/trades${q ? `?${q}` : ''}`);
}

/** One wallet's full activity as a buyer (spend, deposits/withdrawals,
 *  requests, input/output tokens, channel count, unique sellers,
 *  first/last seen) -- feeds Portfolio.jsx's "As a Buyer" section. */
export async function fetchBuyerActivity(address) {
  return get(`/history/buyer/${encodeURIComponent(address)}`);
}

/** Same shape, seller side -- feeds Portfolio.jsx's "As a Seller" section. */
export async function fetchSellerActivity(address) {
  return get(`/history/seller/${encodeURIComponent(address)}`);
}

/** Unclaimed recognized-usage $ANTS rewards for one address, both as a
 *  buyer and (if it's a registered seller agent) as a seller -- feeds
 *  Rewards.jsx. Cached server-side ~90s; pass bustCache to force a fresh
 *  on-chain read (used right after a claim/stake tx confirms). Resolves to
 *  `{ currentEpoch, effectiveEpoch, agentId, buyerUsage: {total, claimable,
 *  recipient, epochs}, sellerUsage: {total, claimable, epochs},
 *  contracts: {usageRewards, usageAccounting, sellerPools, ...} }`. */
export async function fetchRewards(address, bustCache = false) {
  const bust = bustCache ? '&bust=1' : '';
  return get(`/rewards?address=${address}${bust}`);
}

export async function fetchSeller(id) {
  return get(`/sellers/${encodeURIComponent(id)}`);
}

/** Per-agentId stats: { buyers, ratingAvg, ratingCount }. Buyers come from
 *  Antscan buyerSellerPair, not sellers.uniqueBuyers. */
export async function fetchProviderBuyerCounts() {
  return get('/providers/buyer-counts');
}

/** Comment contest ranking. Scores come from stored comments, not estimates. */
export async function fetchCommentLeaderboard() {
  return get('/providers/comment-leaderboard');
}

export async function fetchProviderAccess(agentId, address) {
  const q = address ? `?address=${encodeURIComponent(address)}` : '';
  return get(`/providers/${encodeURIComponent(agentId)}/access${q}`);
}

export async function fetchProviderComments(agentId) {
  return get(`/providers/${encodeURIComponent(agentId)}/comments`);
}

export async function fetchProviderAnnouncements(agentId) {
  return get(`/providers/${encodeURIComponent(agentId)}/announcements`);
}

export async function fetchProviderChat(agentId, after) {
  const q = after ? `?after=${encodeURIComponent(after)}` : '';
  return get(`/providers/${encodeURIComponent(agentId)}/chat${q}`);
}

export async function postProviderComment(agentId, body) {
  return post(`/providers/${encodeURIComponent(agentId)}/comments`, body);
}

export async function postProviderAnnouncement(agentId, body) {
  return post(`/providers/${encodeURIComponent(agentId)}/announcements`, body);
}

export async function postProviderChat(agentId, body) {
  return post(`/providers/${encodeURIComponent(agentId)}/chat`, body);
}

export async function fetchProfile(address) {
  return get(`/profiles/${encodeURIComponent(address)}`);
}

export async function fetchProfiles(addresses) {
  const list = [...new Set((addresses || []).filter(Boolean).map((a) => String(a).toLowerCase()))];
  if (list.length === 0) return { items: {} };
  return get(`/profiles?addresses=${encodeURIComponent(list.join(','))}`);
}

export async function checkNickname(name, address) {
  const qs = new URLSearchParams({ name });
  if (address) qs.set('address', address);
  return get(`/profiles/check-nickname?${qs}`);
}

export async function saveProfile(body) {
  return post('/profiles', body);
}

export async function fetchUsedProviders(address) {
  return get(`/profiles/${encodeURIComponent(address)}/providers`);
}
