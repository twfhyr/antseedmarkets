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

assert.match(stake, /const isBuyBlockingPage = buyState\?\.phase === 'buying'/, 'Buying state should derive a page-wide blocking flag');
assert.match(stake, /<BuyPreparationLock\s+active=\{isBuyBlockingPage\}/, 'StakeANTS should render a page-wide lock while buy is preparing');
assert.match(stake, /function BuyPreparationLock\(\{ active, message, t \}\)/, 'Buy preparation lock component should exist');
assert.match(stake, /className="buy-prep-lock"[\s\S]*role="status"[\s\S]*aria-live="assertive"/, 'Buy preparation lock should announce the blocking progress state');
assert.match(stake, /className="buy-prep-lock__spinner spin"/, 'Buy preparation lock should show a spinner');
assert.match(stake, /t\('stake\.buyPreparingWallet'\)/, 'Lock should use dedicated preparing-wallet copy');

assert.match(i18n, /"stake\.buyPreparingWallet": "Preparing wallet confirmation…"/, 'Preparing-wallet copy should exist');
const lockCss = css.match(/\.buy-prep-lock\s*\{(?<body>[\s\S]*?)\}/)?.groups.body || '';
assert.match(lockCss, /position: fixed;/, 'Buy preparation lock should cover the page');
assert.match(lockCss, /pointer-events: auto;/, 'Buy preparation lock should capture interactions');
assert.match(lockCss, /z-index: 1250;/, 'Buy preparation lock should sit above the page');
assert.match(css, /\.buy-prep-lock__card\s*\{[\s\S]*min-width: min\(320px, 100%\);/, 'Buy preparation lock should have a readable centered card');
