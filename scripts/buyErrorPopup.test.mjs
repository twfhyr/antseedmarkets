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

assert.match(stake, /const \[buyErrorPopup, setBuyErrorPopup\] = useState\(null\)/, 'Buy failures should use dedicated popup state');
assert.match(stake, /const showBuyErrorPopup = useCallback\(\(position, message\) => \{/s, 'Buy failures should open through a shared helper');
assert.match(stake, /setBuyErrorPopup\(\{[\s\S]*itemId: position\?\.id,[\s\S]*message,[\s\S]*shownAt: Date\.now\(\),[\s\S]*\}\)/, 'Popup should carry item id and original error message');
assert.match(stake, /const message = t\('stake\.buyNeedWallet'\);[\s\S]*showBuyErrorPopup\(position, message\)/, 'Missing wallet buy failures should use the popup');
assert.match(stake, /showBuyErrorPopup\(position, message\)/, 'Thrown buy failures should use the popup');
assert.match(stake, /<BuyErrorPopup\s+error=\{buyErrorPopup\}/, 'StakeANTS should render the buy error popup');
assert.match(stake, /function BuyErrorPopup\(/, 'Buy error popup component should exist');
assert.match(stake, /role="dialog"[\s\S]*aria-modal="true"[\s\S]*aria-label=\{t\('stake\.buyErrorTitle'\)\}/, 'Buy error popup should be an accessible modal dialog');
assert.match(stake, /className="buy-error-popup__message"/, 'Original wallet error should be shown inside the popup body');

assert.doesNotMatch(stake, /className=\{buyState\.phase === 'error' \? 'v2-position-button__message v2-position-button__message--error' : 'v2-position-button__message'\}/, 'V2 cards should not render buy error text next to the button');
assert.doesNotMatch(stake, /className=\{props\.buyState\.phase === 'error' \? 'lants-market-table__error' : 'lants-market-table__muted'\}/, 'Market table should not render buy error text next to the button');
assert.doesNotMatch(stake, /color: buyState\.phase === 'error' \? 'var\(--danger\)' : 'var\(--text-secondary\)'/, 'Classical cards should not render buy error text next to the button');

assert.match(i18n, /"stake\.buyErrorTitle": "Purchase failed"/, 'Buy error popup title copy should exist');
assert.match(i18n, /"stake\.buyErrorBody": "The wallet rejected the purchase or could not fund it\. Your assets were not moved\."/, 'Buy error popup body copy should exist');
assert.match(i18n, /"stake\.buyErrorClose": "Got it"/, 'Buy error popup close copy should exist');

assert.match(css, /\.buy-error-popup\s*\{[\s\S]*position: fixed;[\s\S]*z-index: 1300;/, 'Buy error popup overlay should be fixed above the page');
assert.match(css, /\.buy-error-popup__message\s*\{[\s\S]*white-space: pre-wrap;/, 'Buy error message should preserve wallet text');
assert.match(css, /\.buy-error-popup__done\s*\{[\s\S]*min-height: 44px;/, 'Buy error popup close button should keep touch-friendly sizing');
