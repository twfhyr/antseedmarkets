import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const app = read('src/App.jsx');
const header = read('src/components/Header.jsx');
const stake = read('src/components/StakeANTS.jsx');
const css = read('src/index.css');

assert.match(app, /return window\.localStorage\.getItem\(STYLE_STORAGE_KEY\) === 'classical' \? 'classical' : 'v2'/, 'V2 should be the default UI style');
assert.match(app, /data-ui-style=\{uiStyle\}/, 'App should expose the selected UI style as a data attribute');
assert.match(app, /document\.documentElement\.dataset\.uiStyle = uiStyle/, 'App should expose the selected UI style on html for body-level theming');
assert.match(app, /<StakeANTS uiStyle=\{uiStyle\} \/>/, 'StakeANTS should receive the selected style');

assert.match(header, /nextStyle = uiStyle === 'v2' \? 'classical' : 'v2'/, 'Header toggle should switch between v2 and classical');
assert.match(header, /Classical style/, 'Header should offer a visible classical-style toggle when V2 is active');
assert.match(header, /V2 style/, 'Header should offer a visible V2-style toggle when classical is active');
assert.match(header, /HeaderNavLink tab="stake"/, 'V2 header should include marketplace navigation');

assert.match(stake, /function AntseedV2Hero/, 'V2 hero component should be present');
assert.match(stake, /function AntseedV2Metrics/, 'V2 metrics strip should be present');
assert.match(stake, /function LantsV2Card/, 'V2 market card component should be present');
assert.match(stake, /function AntseedV2How/, 'V2 context section should match the uploaded page structure');
assert.match(stake, /isV2 \? \(\s*<LantsV2Card/s, 'V2 should render the uploaded-style market card while classical keeps existing cards');

assert.match(css, /html\[data-ui-style="v2"\] body/, 'V2 should style the page background from the uploaded design');
assert.match(css, /\.dashboard\[data-ui-style="v2"\] \.app-tabs\s*\{\s*display: none;/s, 'V2 should use header navigation instead of the classical tab row');
assert.match(css, /\.dashboard\[data-ui-style="v2"\] \.v2-hero/s, 'V2 hero styles should be scoped to V2');
assert.match(css, /\.dashboard\[data-ui-style="v2"\] \.v2-card/s, 'V2 card styles should be scoped to V2');
assert.match(css, /#f7f5ed/, 'V2 should use the uploaded warm paper background');
assert.match(css, /#c94428/, 'V2 should use the uploaded terracotta accent color');

const svgPath = path.join(root, 'public/antseed-v2-art.svg');
assert.ok(fs.existsSync(svgPath), 'Uploaded hero SVG should be extracted into public assets');
assert.match(fs.readFileSync(svgPath, 'utf8'), /viewBox="0 0 620 440"/, 'Extracted hero SVG should match the uploaded art viewport');
