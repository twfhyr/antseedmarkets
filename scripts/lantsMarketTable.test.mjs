import assert from 'node:assert/strict';
import {
  buildLantsMarketTableRow,
  lantsMarketStateLabel,
  LANTS_MARKET_TABLE_COLUMNS,
  LANTS_MARKET_CARD_FIELDS,
  LANTS_MARKET_DETAIL_FIELDS,
  LANTS_MARKET_TABS,
  LANTS_ACTIVITY_VIEW_MODES,
  LANTS_MARKET_STATS_FIELDS,
  isMarketTableRowActivationKey,
  shouldShowMarketBuyAction,
  shouldShowMarketOfferAction,
} from '../src/lib/lantsMarketTable.js';

assert.deepEqual(LANTS_MARKET_TABLE_COLUMNS, ['id', 'ants', 'start', 'end', 'price', 'value', 'action']);
assert.deepEqual(LANTS_MARKET_CARD_FIELDS, LANTS_MARKET_TABLE_COLUMNS);
assert.deepEqual(LANTS_MARKET_DETAIL_FIELDS, [
  'id', 'ants', 'start', 'end', 'price', 'value',
  'owner', 'duration', 'provider', 'state', 'mc', 'fdv',
]);
assert.deepEqual(LANTS_MARKET_TABS, ['listed', 'all', 'stats', 'history']);
assert.deepEqual(LANTS_ACTIVITY_VIEW_MODES, ['chart', 'table']);
assert.deepEqual(LANTS_MARKET_STATS_FIELDS, ['floor', 'mc', 'fdv', 'listed', 'collection']);
assert.equal(isMarketTableRowActivationKey('Enter'), true);
assert.equal(isMarketTableRowActivationKey(' '), true);
assert.equal(isMarketTableRowActivationKey('Spacebar'), true);
assert.equal(isMarketTableRowActivationKey('Escape'), false);

const listedPosition = {
  id: 98,
  owner: '0xb711fad49ef1bd7f60dab5828aca5c45bb036f74',
  agentId: 52894,
  sellerName: 'Apex Ant',
  amount: 10,
  stakeStartEpoch: 25,
  stakeEndEpoch: 129,
  startDate: '2026-10-01T09:54:21.000Z',
  endDate: '2028-09-28T09:54:21.000Z',
  lockDays: 728,
  listed: true,
  listing: {
    usd: 29.9,
    perAntUsd: 2.99,
    mcUsd: 354761238.22,
    fdvUsd: 3109600000,
  },
};

assert.equal(lantsMarketStateLabel({ stakeStartEpoch: 25, stakeEndEpoch: 129 }, 24), 'Pending');
assert.equal(lantsMarketStateLabel({ stakeStartEpoch: 24, stakeEndEpoch: 129 }, 24), 'Active');

const row = buildLantsMarketTableRow(listedPosition, { currentEpoch: 24 });
assert.deepEqual(row, {
  nftId: 98,
  owner: '0xb711fad49ef1bd7f60dab5828aca5c45bb036f74',
  lockedAmount: 10,
  startDate: '2026-10-01T09:54:21.000Z',
  endDate: '2028-09-28T09:54:21.000Z',
  durationDays: 728,
  provider: 'Apex Ant',
  state: 'Pending',
  pricePerAnt: 2.99,
  value: 29.9,
  mc: 354761238.22,
  fdv: 3109600000,
});

const unlistedActive = buildLantsMarketTableRow({
  id: 27,
  owner: '0x3d4cccfaa3b25997f4ab33f838558521259eef1b',
  agentId: 52894,
  amount: 100.5,
  stakeStartEpoch: 24,
  stakeEndEpoch: 128,
  lockDays: 728,
  listed: false,
  listing: null,
}, { currentEpoch: 24, sellers: [{ agentId: 52894, name: 'Apex Ant' }] });

assert.equal(unlistedActive.provider, 'Apex Ant');
assert.equal(unlistedActive.state, 'Active');
assert.equal(unlistedActive.pricePerAnt, null);
assert.equal(unlistedActive.value, null);

assert.equal(shouldShowMarketBuyAction({
  position: { owner: listedPosition.owner, listed: true, fulfillableHere: true, amount: 10 },
  connected: true,
  address: '0x0000000000000000000000000000000000000001',
}), true);
assert.equal(shouldShowMarketBuyAction({
  position: { owner: listedPosition.owner, listed: true, fulfillableHere: true, amount: 10 },
  connected: false,
  address: '',
}), true);
assert.equal(shouldShowMarketBuyAction({
  position: { owner: listedPosition.owner, listed: true, fulfillableHere: true, amount: 10 },
  connected: true,
  address: listedPosition.owner,
}), false);
assert.equal(shouldShowMarketOfferAction({
  position: { owner: listedPosition.owner, amount: 10 },
  marketTab: 'listed',
  connected: false,
  address: '',
}), true);
