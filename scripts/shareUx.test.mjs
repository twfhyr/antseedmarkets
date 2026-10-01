import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import en from '../src/i18n/en.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const share = read('src/components/ShareMenu.jsx');
const stake = read('src/components/StakeANTS.jsx');
const providers = read('src/components/Providers.jsx');
const discovery = read('src/components/Discovery.jsx');

assert.match(share, /x\.com\/intent\/tweet/, 'X share uses the tweet intent');
assert.match(share, /t\.me\/share\/url/, 'Telegram share uses t.me/share');
assert.match(share, /target="_blank"/, 'X and Telegram open in a new tab');
assert.match(share, /share\.discord/, 'Discord is a share target');
assert.match(share, /share\.copy/, 'Copy link is a share target');
assert.match(share, /navigator\.clipboard\.writeText/, 'Copy writes the detail URL');
assert.match(share, /createPortal/, 'Share menu is portaled so card overflow cannot clip it');
assert.match(share, /placeMenu/, 'Share menu is placed inside the viewport');

assert.match(stake, /lantsDetailHref\(p\.id\)/, 'lANTS cards share the detail path');
assert.match(stake, /ShareMenu[\s\S]*lantsDetailHref\(tokenId\)/, 'lANTS detail header can share its permalink');
assert.match(providers, /className="dir-card__share"/, 'Provider cards have a share control outside the card link');
assert.match(providers, /ShareMenu[\s\S]*providerHref\(agentId\)/, 'Provider detail shares /providers/:agentId');
assert.match(discovery, /ShareMenu[\s\S]*providerHref\(item\.agentId\)/, 'Discovery pitches share the provider detail URL');

assert.equal(en['share.label'], 'Share');
assert.equal(en['share.copy'], 'Copy link');
assert.equal(en['share.discord'], 'Discord');
assert.equal(en['share.telegram'], 'Telegram');
assert.equal(en['share.x'], 'X');
assert.equal(en['share.lantsTitle'], 'lANTS #{id} on antseedmarkets');
assert.equal(/seller/i.test(en['share.providerTitle']), false);
assert.equal(en['share.copiedDiscord'].includes('...'), false);
