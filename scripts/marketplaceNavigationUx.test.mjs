import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const stake = read('src/components/StakeANTS.jsx');
const css = read('src/index.css');
const designCss = read('src/design.css');

assert.match(stake, /const marketTabsRef = useRef\(null\)/, 'StakeANTS should keep a ref for the marketplace subtabs');
assert.match(stake, /marketTabsRef\.current\?\.scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/, 'Explore should smooth-scroll to the marketplace subtabs');
assert.match(stake, /<div className="lants-subtabs" ref=\{marketTabsRef\}>/, 'Marketplace subtabs should be the explore scroll target');
assert.match(stake, /<AntseedV2Hero market=\{market\} onExplore=\{scrollToMarketTabs\}/, 'V2 hero explore action should scroll to the marketplace tabs');

const v2Card = stake.match(/function LantsV2Card[\s\S]*?function LantsStatsPanel/)?.[0] || '';
assert.match(v2Card, /<article[\s\S]*className="v2-card"[\s\S]*onClick=\{open\}/, 'The whole V2 marketplace card should open the detail view');
assert.doesNotMatch(v2Card, /t\('stake\.viewDetails'\)/, 'V2 marketplace cards should not show a redundant details button');
assert.match(v2Card, /onClick=\{\(e\) => \{ e\.stopPropagation\(\); onBuy\?\.\(\); \}\}/, 'Buy action should not also trigger card navigation');
assert.match(v2Card, /onClick=\{\(e\) => \{ e\.stopPropagation\(\); onOpenOffer\?\.\(p\); \}\}/, 'Offer action should not also trigger card navigation');

assert.match(designCss, /\.dashboard\[data-ui-style="v2"\] \.app-header\s*\{[\s\S]*position: sticky;[\s\S]*top: 0;[\s\S]*z-index: 1200;/, 'V2 design header should keep the live sticky/floating navigation instead of downgrading it to relative positioning');
assert.doesNotMatch(designCss, /\.dashboard\[data-ui-style="v2"\] \.app-header\s*\{[\s\S]*position: relative;/, 'Design integration must not override the sticky header from the live app');
assert.match(css, /\.lants-subtabs\s*\{[\s\S]*scroll-margin-top: 128px;/, 'Marketplace subtabs need scroll offset for the sticky header');
