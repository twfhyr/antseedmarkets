import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import en from '../src/i18n/en.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const nav = read('src/lib/nav.js');
const app = read('src/App.jsx');
const header = read('src/components/Header.jsx');
const router = read('src/hooks/useTabRouter.js');
const stake = read('src/components/StakeANTS.jsx');
const desk = read('src/components/StakingDesk.jsx');
const stakeLib = read('src/lib/stakeAnts.js');
const api = read('src/api.js');
const css = read('src/index.css');
const backend = fs.readFileSync(path.resolve(root, '../antseed-zh/backend/server.js'), 'utf8');

assert.match(nav, /tab: 'stake', hidden: false/);
assert.match(nav, /tab: 'market', hidden: false/);
for (const tab of ['providers', 'discovery', 'leaderboard', 'portfolio', 'rewards']) {
  assert.match(nav, new RegExp(`tab: '${tab}', hidden: true`), `${tab} stays routed but hidden`);
}
assert.match(header, /visiblePrimaryNav\(\)/);
assert.match(app, /visiblePrimaryNav\(\)/);
assert.doesNotMatch(app, /<NicknameGate \/>/, 'Nickname gate is unmounted');
assert.match(app, /activeTab === 'stake' && <StakingDesk/, 'Stake menu renders the staking desk');
assert.match(app, /activeTab === 'market' && <StakeANTS/, 'Marketplace menu renders lANTS trading');
assert.match(app, /activeTab === 'providers' && <Providers/, 'Hidden /providers still renders');
assert.match(app, /activeTab === 'rewards' && <Rewards/, 'Hidden /rewards still renders');

assert.match(router, /market: 'lants'/);
assert.match(router, /MARKET_DEFAULT_TAB = 'listed'/);
assert.doesNotMatch(stake, /<StakingDesk \/>/);
assert.doesNotMatch(stake, /stake.filterStake/);
assert.match(stake, /<AntseedV2Hero market=\{market\} onExplore=\{scrollToMarketTabs\}/);
assert.match(api, /fetchStakingOverview/);
assert.match(desk, /fetchStakingOverview/);
assert.match(desk, /fetchRewards/);
assert.match(desk, /stakeWalletAnts/);
assert.match(desk, /stakeUnclaimedBuyerReward/);
assert.match(desk, /stakeUnclaimedAgentReward/);
assert.match(desk, /restakeUnclaimedStakerRewards/);
assert.doesNotMatch(desk, / · /, 'Desk copy does not use a middle dot');
assert.match(stakeLib, /pools\.stake\(agentId, amountWei, epochs\)/);
assert.match(stakeLib, /stakeBuyerReward/);
assert.match(stakeLib, /stakeAgentReward/);
assert.match(stakeLib, /restakeStakerRewardsBatch/);
assert.match(backend, /app\.get\('\/api\/staking\/overview'/);
assert.match(css, /\.staking-desk\s*\{/);
assert.match(css, /\.staking-ticker\s*\{/);
assert.match(css, /\.staking-form\s*\{/);
assert.match(css, /position: static/);
assert.doesNotMatch(css, /\.staking-form[\s\S]*position: sticky/);

assert.equal(en['nav.stake'], 'Stake');
assert.equal(en['nav.market'], 'Marketplace');
assert.equal(en['stake.deskTitle'], 'Stake ANTS');
assert.equal(en['stake.deskPool'], 'Pool');
assert.equal(en['stake.deskSubmit'], 'Stake');
assert.equal(en['stake.deskRewards'], 'Unclaimed rewards');
assert.equal(en['stake.deskRewardsStaker'], 'Staker rewards');
assert.equal(en['stake.deskSearch'].includes('...'), false);
assert.equal(/seller/i.test(en['stake.deskBlurb']), false);
assert.equal(/seller/i.test(en['stake.deskEyebrow']), false);
assert.equal(/seller/i.test(en['stake.deskRewardsProvider']), false);
