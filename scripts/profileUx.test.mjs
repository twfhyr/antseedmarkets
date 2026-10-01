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
const profile = read('src/components/Profile.jsx');
const gate = read('src/components/NicknameGate.jsx');

assert.match(router, /profile: 'profile'/, 'Profile is a real URL tab, not only in-memory state');
assert.match(header, /profile\.menuProfile/, 'Wallet menu offers a jump to Profile');
assert.match(header, /setActiveTab\('profile'\)/, 'Wallet menu navigates to /profile');
assert.doesNotMatch(header, /HeaderNavLink tab="profile"/, 'Profile stays out of primary nav');
assert.doesNotMatch(app, /<NicknameGate \/>/, 'Connecting a wallet does not require a nickname');
assert.match(app, /activeTab === 'profile' && <Profile/, 'Profile page renders from the /profile tab');
assert.match(gate, /profile\.gateTitle/, 'First-connect gate asks for a nickname');
assert.match(gate, /disconnect\(\)/, 'Gate still lets the wallet disconnect');
assert.match(profile, /profile\.usedComment/, 'Profile lists used providers with a comment action');
assert.match(profile, /providerHref\(item\.agentId, 'comments'\)/, 'Used-provider comment links open that provider comments tab');
assert.match(profile, /avatarDataUrl/, 'Profile can upload an avatar');
assert.match(profile, /profile\.bio/, 'Profile can edit a bio');
assert.match(profile, /nicknameLocked/, 'Owner nickname is locked to the catalog name');
assert.match(profile, /readOnly=\{nicknameLocked\}/, 'Owner cannot edit the reserved nickname');
assert.match(gate, /row\?\.exists !== true && !row\?\.reserved/, 'Owner wallets skip the nickname gate');
assert.equal(en['profile.nicknameTaken'], 'That nickname is taken');
assert.equal(en['profile.nicknameReserved'], 'That name is reserved for a provider');
assert.equal(en['profile.gateTitle'], 'Choose a nickname');
assert.equal(/seller/i.test(en['profile.usedEmpty']), false);
