import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const app = read('src/App.jsx');
const siteHome = read('src/components/SiteHome.jsx');
const api = read('src/lib/ants/api.js');
const actions = read('src/lib/ants/actions.js');
const router = read('src/hooks/useTabRouter.js');
const shell = read('src/components/MyAntseed.jsx');
const backendRoutes = fs.readFileSync(path.resolve(root, '../antseed-zh/backend/ants/routes.js'), 'utf8');
const backendServer = fs.readFileSync(path.resolve(root, '../antseed-zh/backend/server.js'), 'utf8');

assert.match(app, /activeTab === 'stake' && <MyAntseed/, 'App mounts My Antseed on the account route');
assert.doesNotMatch(app, /<StakingDesk/, 'Simplified stake desk is no longer the account surface');
assert.doesNotMatch(siteHome, /ants\.dashboard\.token/, 'Homepage does not capture a local ants token');
assert.doesNotMatch(api, /Authorization/, 'Public ants API client has no bearer token');
assert.doesNotMatch(api, /TOKEN_KEY|AuthGate/, 'Official session gate is not ported');
assert.match(api, /\/api\/ants/, 'Reads go through the hosted ants prefix');
assert.match(actions, /runAntsAction/, 'Writes are wallet-signed, not /api/jobs');
assert.doesNotMatch(actions, /\/api\/jobs/, 'No CLI job runner on the public web app');
assert.match(router, /stake: 'my-antseed'/);
assert.match(router, /useMyAntseedPageRouter/);
assert.match(router, /my-antseed\/\$\{page\}/);
assert.match(shell, /MY_ANTSEED_TABS/);
assert.match(shell, /RewardsPage/);
assert.match(shell, /ProviderPage/);
assert.match(read('src/components/my-antseed/Rewards.jsx'), /config\?\.maxStakeEpochs/, 'Rewards page tolerates a missing pool config');
assert.match(read('src/components/my-antseed/ui.jsx'), /useEpochInfo/, 'Epoch dates come from overview genesis, not a missing prop');
assert.match(backendRoutes, /hostedRewards/, 'Rewards come from the hosted SQLite/Antscan path');
assert.match(backendRoutes, /hostedPools/, 'Pools come from Antscan, not per-request RPC');
assert.match(backendRoutes, /hostedOverview/, 'Overview comes from chain_metrics and Antscan');
assert.doesNotMatch(backendRoutes, /poolsView\(/, 'GET /pools must not call the official RPC poolsView');
assert.doesNotMatch(backendRoutes, /function ctxFor|new RotatingJsonRpcProvider/, 'Hosted GETs do not build a per-request RPC context');
assert.match(backendRoutes, /export function antsRouter/);
assert.match(backendRoutes, /No session/);
assert.doesNotMatch(backendRoutes, /Bearer|Authorization/, 'Hosted ants API does not require a session token');
assert.match(backendServer, /app\.use\('\/api\/ants', antsRouter\(\)\)/);

const hosted = fs.readFileSync(path.resolve(root, '../antseed-zh/backend/ants/hosted.js'), 'utf8');
assert.match(hosted, /ants_completed_epoch_rewards/, 'Completed-epoch claimable amounts are persisted');
assert.match(hosted, /seedCompletedFromHistory/, 'Hourly epoch poller amounts seed the hosted rewards table');
assert.match(hosted, /fillWalletSnapshot/, 'On connect, missing completed epochs are filled once');
assert.match(read('src/components/my-antseed/Rewards.jsx'), /Loading rewards/, 'Rewards loading copy does not mention public RPC');

const uiFiles = [
  'src/components/MyAntseed.jsx',
  'src/components/my-antseed/Stake.jsx',
  'src/components/my-antseed/Rewards.jsx',
  'src/components/my-antseed/Provider.jsx',
  'src/components/my-antseed/Network.jsx',
];
for (const file of uiFiles) {
  const text = read(file);
  assert.doesNotMatch(text, />Seller</, `${file} should label the tab Provider`);
  assert.doesNotMatch(text, /'Seller usage'|"Seller usage"/, `${file} should say Provider usage`);
}
