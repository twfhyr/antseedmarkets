import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import en from '../src/i18n/en.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const router = read('src/hooks/useTabRouter.js');
const header = read('src/components/Header.jsx');
const app = read('src/App.jsx');
const discovery = read('src/components/Discovery.jsx');
const providers = read('src/components/Providers.jsx');
const nav = read('src/lib/nav.js');

assert.match(router, /discovery: 'discovery'/, 'Discovery is a real URL tab');
assert.match(nav, /tab: 'discovery', hidden: true/, 'Discovery is temporarily hidden from primary nav');
assert.match(header, /visiblePrimaryNav\(\)/, 'Header reads the shared visible-tab list');
assert.match(app, /activeTab === 'discovery' && <Discovery/, 'Discovery page renders from /discovery');
assert.match(discovery, /discovery\.voteBuyer/, 'Buyers get a distinct vote');
assert.match(discovery, /discovery\.voteStaker/, 'Stakers get a distinct vote');
assert.match(discovery, /submit \$\{agentId\}/, 'Owner pitch is signed per agentId');
assert.match(providers, /fetchDiscoveryFeatured/, 'Providers directory reads Discovery highlights');
assert.match(providers, /is-featured/, 'Highlighted providers get a featured class');
assert.equal(en['nav.discovery'], 'Discovery');
assert.equal(en['discovery.featured'], 'Highlighted');
assert.equal(/seller/i.test(en['discovery.blurb']), false);
assert.equal(en['discovery.blurb'].includes('...'), false);
