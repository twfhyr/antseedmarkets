import assert from 'node:assert/strict';
import en from '../src/i18n/en.js';

assert.equal(en['stake.buyOnSite'], 'buy');
assert.equal(en['stake.makeOffer'], 'offer');
assert.equal(en['stake.listOnSite'], 'list');
assert.equal(en['stake.acceptOffer'], 'accept');
assert.equal(en['stake.cancelListing'], 'cancel listing');
assert.equal(en['stake.cancelOffer'], 'cancel my offer');
assert.equal(en['stake.viewDetails'], 'details');
assert.equal(en['stake.floorPerAnt'], 'Floor price');
assert.equal(en['stake.historyError'], 'Could not load activity. Showing an empty state instead.');
assert.equal(en['stake.historyLoading'], 'Loading activity…');
assert.equal(en['stake.blurb'], '');
assert.equal(en['stake.marketBlurb'], '');
assert.equal(en['stake.marketTitle'], '');
assert.equal(en['stake.statsBlurb'], 'Floor price, implied MC, implied FDV, listed count, and collection size.');
assert.equal(en['portfolio.searchPlaceholder'], '0x… enter a Base address');
assert.equal(en['stake.placeholder'], '0x… enter a Base address');
assert.equal(en['portfolio.buyerSection'], 'Buyer activity');
assert.equal(en['portfolio.sellerSection'], 'Provider activity');
assert.equal(en['stake.filterSeller'], 'Provider');
assert.equal(en['stake.filterAnySeller'], 'Any provider');
assert.equal(en['stake.tradeSeller'], 'Provider');
assert.equal(en['stake.filterStats'], 'Stats');
assert.equal(en['stake.statsTitle'], 'Market stats');
assert.equal(en['stake.viewChart'], 'Chart');
assert.equal(en['stake.sortId'], 'ID');
assert.equal(en['table.firstSeen'], 'First seen');
assert.equal(en['table.lastSeen'], 'Last seen');

for (const [key, value] of Object.entries(en)) {
  assert.equal(value.includes('Buy here'), false, `${key} still says "Buy here"`);
  assert.equal(value.includes('trade history'), false, `${key} still says "trade history"`);
  assert.equal(value.includes('...'), false, `${key} should use the ellipsis character`);
  assert.equal(/seller/i.test(value), false, `${key} should say provider, not seller`);
}
