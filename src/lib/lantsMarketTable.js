export const LANTS_MARKET_TABLE_COLUMNS = ['id', 'ants', 'start', 'end', 'price', 'value', 'action'];
export const LANTS_MARKET_CARD_FIELDS = LANTS_MARKET_TABLE_COLUMNS;
export const LANTS_MARKET_DETAIL_FIELDS = [
  'id', 'ants', 'start', 'end', 'price', 'value',
  'owner', 'duration', 'provider', 'state', 'mc', 'fdv',
];
export const LANTS_MARKET_TABS = ['listed', 'all', 'stats', 'history'];
export const LANTS_ACTIVITY_VIEW_MODES = ['chart', 'table'];
export const LANTS_MARKET_STATS_FIELDS = ['floor', 'mc', 'fdv', 'listed', 'collection'];

export function isMarketTableRowActivationKey(key) {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}

export function lantsMarketStateLabel(position, currentEpoch) {
  if (!position) return '—';
  if (position.withdrawn) return 'Withdrawn';
  if (position.closedAtEpoch) return 'Closed';
  if (currentEpoch == null || position.stakeStartEpoch == null || position.stakeEndEpoch == null) return '—';
  if (currentEpoch < position.stakeStartEpoch) return 'Pending';
  if (currentEpoch < position.stakeEndEpoch) return 'Active';
  return 'Matured';
}

export function providerNameForPosition(position, sellers = []) {
  if (!position) return '—';
  if (position.sellerName) return position.sellerName;
  const seller = sellers.find((s) => String(s.agentId) === String(position.agentId));
  if (seller?.name) return seller.name;
  return position.agentId != null ? `Agent #${position.agentId}` : '—';
}

function isSameAddress(a, b) {
  return !!(a && b && String(a).toLowerCase() === String(b).toLowerCase());
}

function isProviderActivationAmount(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return false;
  return Math.abs(Number(amount) - 1) < 1e-6;
}

export function shouldShowMarketBuyAction({ position, connected, address } = {}) {
  if (!position?.listed || !position?.fulfillableHere) return false;
  if (isProviderActivationAmount(position.amount)) return false;
  if (position.owner && isSameAddress(address, position.owner)) return false;
  return true;
}

export function shouldShowMarketOfferAction({ position, marketTab, address } = {}) {
  if (marketTab === 'mine') return false;
  if (isProviderActivationAmount(position?.amount)) return false;
  if (position?.owner && isSameAddress(address, position.owner)) return false;
  return true;
}

export function buildLantsMarketTableRow(position, { currentEpoch, sellers = [] } = {}) {
  const listing = position?.listing || null;
  const amount = Number(position?.amount);
  const pricePerAnt = listing?.perAntUsd ?? null;
  const totalValue = listing?.usd ?? (pricePerAnt != null && Number.isFinite(amount) ? pricePerAnt * amount : null);

  return {
    nftId: position?.id ?? null,
    owner: position?.owner || '',
    lockedAmount: Number.isFinite(amount) ? amount : null,
    startDate: position?.startDate || null,
    endDate: position?.endDate || null,
    durationDays: position?.lockDays ?? null,
    provider: providerNameForPosition(position, sellers),
    state: lantsMarketStateLabel(position, currentEpoch),
    pricePerAnt,
    value: totalValue,
    mc: listing?.mcUsd ?? null,
    fdv: listing?.fdvUsd ?? null,
  };
}
