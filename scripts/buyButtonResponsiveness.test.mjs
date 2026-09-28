import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const stake = read('src/components/StakeANTS.jsx');
const listLants = read('src/lib/listLants.js');
const css = read('src/index.css');

assert.match(listLants, /export function prewarmListingFulfillment\(/, 'Listing fulfillment deps/orders should be prewarmable before click');
assert.match(listLants, /const loadFulfillmentDeps = \(\) =>/, 'Seaport and ethers should share one preloadable dependency promise');
assert.match(listLants, /const getCachedLantsOrder = \(tokenId\) =>/, 'Stored orders should be cached from prewarm through click');
assert.match(listLants, /await loadFulfillmentDeps\(\)/, 'fulfillListing should reuse preloaded dependencies instead of importing on click');
assert.match(listLants, /await getCachedLantsOrder\(tokenId\)/, 'fulfillListing should reuse the preloaded order instead of fetching on click');

assert.match(stake, /prewarmListingFulfillment/, 'StakeANTS should import the buy prewarm helper');
assert.match(stake, /const prewarmBuy = useCallback\(\(position\) =>/, 'Buy buttons should have a shared prewarm handler');
assert.match(stake, /prewarmListingFulfillment\(buyableIds\)/, 'Visible buyable listings should prewarm while the market page is shown');
assert.match(stake, /onPrewarmBuy:\s*\(\) => prewarmBuy\(p\)/, 'Card props should pass the shared buy prewarm handler');
assert.match(stake, /onPointerEnter=\{\(\) => (?:props\.)?onPrewarmBuy\?\.\(\)\}/, 'Buy buttons should prewarm on hover before click');
assert.match(stake, /onFocus=\{\(\) => (?:props\.)?onPrewarmBuy\?\.\(\)\}/, 'Buy buttons should prewarm for keyboard/touch focus before click');

for (const selector of [
  '.lants-nft__listbtn',
  '.lants-nft__offer-row button',
  '.lants-view-toggle button',
  '.lants-pager button',
  '.v2-position-button',
]) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '\\s+');
  const rule = new RegExp(`${escaped}\\s*\\{[\\s\\S]*?min-height:\\s*44px;`, 's');
  assert.match(css, rule, `${selector} should have a 44px minimum hit target`);
}

assert.match(css, /touch-action:\s*manipulation;/, 'Action buttons should avoid delayed mobile click handling');