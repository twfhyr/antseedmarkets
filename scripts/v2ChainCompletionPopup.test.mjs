import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const stake = read('src/components/StakeANTS.jsx');
const css = read('src/index.css');
const i18n = read('src/i18n/en.js');

assert.match(stake, /const \[chainCompletion, setChainCompletion\] = useState\(null\)/, 'StakeANTS should keep a dedicated chain-completion popup state');
assert.match(stake, /const showChainCompletion = useCallback\(\(payload\) => \{[\s\S]*if \(!isV2\) return;/, 'Completion popup should only open in V2');
assert.match(stake, /<V2ChainCompletionPopup\s+completion=\{chainCompletion\}/, 'V2 should render the chain-completion popup');
assert.match(stake, /function V2ChainCompletionPopup\(/, 'V2 popup component should exist');
assert.match(stake, /aria-label=\{t\('stake\.txCompleteTitle'\)\}/, 'Popup should be accessible as a transaction completion dialog');

const completionCalls = [...stake.matchAll(/showChainCompletion\(\{\s*type: '([^']+)'/g)].map((m) => m[1]);
for (const type of ['buy', 'list', 'cancelListing', 'split', 'merge', 'move', 'offer', 'acceptOffer', 'cancelOffer']) {
  assert.ok(completionCalls.includes(type), `Completed ${type} chain interactions should show the V2 popup`);
}
assert.ok(completionCalls.length >= 9, 'Every completed chain interaction should have a popup trigger');

assert.match(stake, /setBuyState\(\{ id: position\.id, phase: 'refreshing', message: t\('stake\.refreshingAfterTx'\) \}\)/, 'Buy should surface background-refresh feedback after chain completion');
assert.match(stake, /fetchLantsMarket\(\{ \.\.\.marketQuery, wait: '1', ensureIds: String\(position\.id\) \}\)/, 'Buy should still force a post-purchase market refresh');

assert.match(i18n, /"stake\.txCongrats": "Congratulations"/, 'Popup title copy should be present');
assert.match(i18n, /鲜花/, 'Popup copy should include flowers as requested');
assert.match(i18n, /蚂蚁/, 'Popup copy should include ants as requested');
assert.match(i18n, /"stake\.refreshingAfterTx": "Refreshing the list in the background…"/, 'Refresh feedback copy should be present');

assert.match(css, /\.v2-chain-popup\s*\{\s*display: none;/s, 'Popup base should be hidden outside V2');
assert.match(css, /\.dashboard\[data-ui-style="v2"\] \.v2-chain-popup\s*\{[\s\S]*position: fixed;/, 'Popup styling should be scoped to V2');
assert.match(css, /\.v2-chain-popup__ants/s, 'Popup should include ant styling');
assert.match(css, /\.v2-chain-popup__flowers/s, 'Popup should include flower styling');
