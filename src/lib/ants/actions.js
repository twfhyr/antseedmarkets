import { parseUnits, toBigInt, isZero, describeError } from './format.js';
import {
  restakeUnclaimedStakerRewards,
  stakeUnclaimedAgentReward,
  stakeUnclaimedBuyerReward,
  stakeWalletAnts,
} from '../stakeAnts.js';
import { mergePositions, movePosition, splitPosition } from '../listLants.js';

const POOLS_WRITE_ABI = [
  { name: 'extendLock', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'positionId', type: 'uint256' }, { name: 'additionalEpochs', type: 'uint256' }], outputs: [] },
  { name: 'enableMaxLock', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'positionId', type: 'uint256' }], outputs: [] },
  { name: 'disableMaxLock', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'positionId', type: 'uint256' }], outputs: [] },
  { name: 'withdrawStakes', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'positionIds', type: 'uint256[]' }], outputs: [] },
  { name: 'moveStakes', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'positionIds', type: 'uint256[]' }, { name: 'toAgentId', type: 'uint256' }], outputs: [] },
  { name: 'stakerPositionIds', type: 'function', stateMutability: 'view', inputs: [{ name: 'staker', type: 'address' }, { name: 'offset', type: 'uint256' }, { name: 'limit', type: 'uint256' }], outputs: [{ type: 'uint256[]' }] },
  { name: 'stakerPositionCount', type: 'function', stateMutability: 'view', inputs: [{ name: 'staker', type: 'address' }], outputs: [{ type: 'uint256' }] },
];

const REWARDS_WRITE_ABI = [
  { name: 'poolRewardIndexNextEpoch', type: 'function', stateMutability: 'view', inputs: [{ name: 'agentId', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'initialIndexEpoch', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'indexPoolRewards', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'agentId', type: 'uint256' }, { name: 'maxEpochs', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'claimStakerRewardsBatch', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'positionIds', type: 'uint256[]' }, { name: 'recipient', type: 'address' }], outputs: [] },
];

const USAGE_ACCOUNTING_ABI = [
  { name: 'claimSellerEmissions', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'epochs', type: 'uint256[]' }], outputs: [] },
];

const USAGE_REWARDS_CLAIM_ABI = [
  { name: 'claimBuyerReward', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'buyer', type: 'address' }, { name: 'epoch', type: 'uint256' }], outputs: [] },
];

const LEGACY_EMISSIONS_ABI = [
  { name: 'claimSellerEmissions', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'epochs', type: 'uint256[]' }], outputs: [] },
  { name: 'claimBuyerEmissions', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'buyer', type: 'address' }, { name: 'epochs', type: 'uint256[]' }], outputs: [] },
];

const LOCKED_POOL_ABI = [
  { name: 'claim', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'recipient', type: 'address' }], outputs: [] },
];

const SELLER_REGISTRY_ABI = [
  { name: 'registerSeller', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'agentId', type: 'uint256' }], outputs: [] },
];

const POSITION_INIT_ABI = [
  { name: 'initPosition', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
];

async function signerFor(walletClient, account) {
  const { BrowserProvider } = await import('ethers');
  const network = { chainId: walletClient.chain.id, name: walletClient.chain.name };
  const provider = new BrowserProvider(walletClient.transport, network);
  return { provider, signer: await provider.getSigner(account) };
}

async function send(tx) {
  const receipt = await tx.wait();
  return receipt?.hash || tx.hash;
}

function requireAddress(addresses, key, label) {
  const value = addresses?.[key];
  if (!value) throw new Error(`${label || key} is not configured on this chain.`);
  return value;
}

function epochAmounts(rows) {
  return (rows || []).filter((row) => !isZero(row.amount)).map((row) => Number(row.epoch)).filter((n) => Number.isSafeInteger(n) && n >= 0);
}

async function indexStakerRewards({ signer, rewardsAddress, agentIds, currentEpoch, onStep }) {
  if (!rewardsAddress || !agentIds.length) return;
  const { Contract } = await import('ethers');
  const rewards = new Contract(rewardsAddress, REWARDS_WRITE_ABI, signer);
  const target = Number(currentEpoch) || 0;
  for (const agentId of [...new Set(agentIds.filter((id) => Number(id) > 0))]) {
    let cursor = Number(await rewards.poolRewardIndexNextEpoch(agentId)) || Number(await rewards.initialIndexEpoch());
    while (cursor < target) {
      onStep?.(`Indexing pool ${agentId} rewards`);
      const tx = await rewards.indexPoolRewards(agentId, Math.min(16, target - cursor));
      await send(tx);
      const next = Number(await rewards.poolRewardIndexNextEpoch(agentId));
      if (next <= cursor) throw new Error('Reward indexing made no progress. Retry later.');
      cursor = next;
    }
  }
}

async function positionIdsFor(account, poolsAddress, signer) {
  const { Contract } = await import('ethers');
  const pools = new Contract(poolsAddress, POOLS_WRITE_ABI, signer);
  const count = Number(await pools.stakerPositionCount(account));
  const ids = [];
  for (let offset = 0; offset < count; offset += 64) {
    const batch = await pools.stakerPositionIds(account, offset, 64);
    ids.push(...batch.map((id) => Number(id)));
  }
  return ids;
}

async function claimBuckets({ signer, account, addresses, api, buckets, onStep }) {
  const rewards = await api.rewards();
  const want = buckets?.length ? buckets : ['staker', 'seller', 'buyer', 'legacy', 'locked'];
  const hashes = [];
  const { Contract } = await import('ethers');

  if (want.includes('staker') && !isZero(rewards.staker?.total)) {
    const ids = (rewards.staker.positions || []).filter((row) => !isZero(row.amount)).map((row) => Number(row.id));
    if (ids.length) {
      await indexStakerRewards({
        signer,
        rewardsAddress: addresses.sellerPoolsRewards,
        agentIds: (rewards.staker.positions || []).map((row) => Number(row.agentId)),
        currentEpoch: rewards.currentEpoch,
        onStep,
      });
      const contract = new Contract(requireAddress(addresses, 'sellerPoolsRewards', 'Staker rewards'), REWARDS_WRITE_ABI, signer);
      for (let offset = 0; offset < ids.length; offset += 32) {
        const batch = ids.slice(offset, offset + 32);
        onStep?.(`Claiming staker rewards for ${batch.length} position(s)`);
        hashes.push(await send(await contract.claimStakerRewardsBatch(batch, account)));
      }
    }
  }

  if (want.includes('seller') && rewards.sellerUsage?.claimable && !isZero(rewards.sellerUsage?.total)) {
    const epochs = epochAmounts(rewards.sellerUsage.epochs);
    if (epochs.length) {
      onStep?.('Claiming provider usage rewards');
      const contract = new Contract(requireAddress(addresses, 'usageAccounting', 'Usage accounting'), USAGE_ACCOUNTING_ABI, signer);
      hashes.push(await send(await contract.claimSellerEmissions(epochs)));
    }
  }

  if (want.includes('buyer') && rewards.buyerUsage?.claimable && !isZero(rewards.buyerUsage?.total)) {
    const epochs = epochAmounts(rewards.buyerUsage.epochs);
    const contract = new Contract(requireAddress(addresses, 'usageRewards', 'Usage rewards'), USAGE_REWARDS_CLAIM_ABI, signer);
    for (const epoch of epochs) {
      onStep?.(`Claiming buyer usage reward for epoch ${epoch}`);
      hashes.push(await send(await contract.claimBuyerReward(account, epoch)));
    }
  }

  if (want.includes('legacy') && (!isZero(rewards.legacy?.seller) || (rewards.legacy?.buyerClaimable && !isZero(rewards.legacy?.buyer)))) {
    const contractAddr = rewards.legacy?.contract || addresses.legacyEmissions;
    if (!contractAddr) throw new Error('Legacy emissions contract is not configured.');
    const contract = new Contract(contractAddr, LEGACY_EMISSIONS_ABI, signer);
    const overview = await api.overview();
    const current = Number(overview?.epoch?.current) || 0;
    const start = Number(rewards.firstRewardedEpoch) || 0;
    const epochs = [];
    for (let epoch = Math.max(0, start - 8); epoch <= current; epoch += 1) epochs.push(epoch);
    if (!isZero(rewards.legacy.seller) && epochs.length) {
      onStep?.('Claiming legacy provider emissions');
      hashes.push(await send(await contract.claimSellerEmissions(epochs)));
    }
    if (rewards.legacy.buyerClaimable && !isZero(rewards.legacy.buyer) && epochs.length) {
      onStep?.('Claiming legacy buyer emissions');
      hashes.push(await send(await contract.claimBuyerEmissions(account, epochs)));
    }
  }

  if (want.includes('locked') && !isZero(rewards.locked?.claimable) && rewards.locked?.policy) {
    const pool = rewards.locked.pool;
    if (!pool) throw new Error('Locked rewards pool is not configured.');
    onStep?.('Releasing locked rewards');
    const contract = new Contract(pool, LOCKED_POOL_ABI, signer);
    hashes.push(await send(await contract.claim(account)));
  }

  if (hashes.length === 0) throw new Error('Nothing to claim.');
  return { hash: hashes[hashes.length - 1], hashes };
}

async function restakeStaker({ walletClient, account, addresses, api, epochs, onStep }) {
  const rewards = await api.rewards();
  const ids = (rewards.staker?.positions || []).filter((row) => !isZero(row.amount)).map((row) => Number(row.id));
  if (ids.length === 0) throw new Error('No staker rewards to restake.');
  const { signer } = await signerFor(walletClient, account);
  await indexStakerRewards({
    signer,
    rewardsAddress: addresses.sellerPoolsRewards,
    agentIds: (rewards.staker.positions || []).map((row) => Number(row.agentId)),
    currentEpoch: rewards.currentEpoch,
    onStep,
  });
  onStep?.('Restaking staker rewards');
  return restakeUnclaimedStakerRewards({
    walletClient,
    account,
    sellerPoolsRewards: requireAddress(addresses, 'sellerPoolsRewards', 'Staker rewards'),
    positionIds: ids,
    epochs,
  });
}

async function stakeUsage({ walletClient, account, addresses, api, side, epochs, stakeAgentId, onStep }) {
  const rewards = await api.rewards();
  const usageRewards = requireAddress(addresses, 'usageRewards', 'Usage rewards');
  const hashes = [];
  if (side === 'seller') {
    if (!rewards.sellerUsage?.claimable) throw new Error('Provider usage rewards are not claimable from this wallet.');
    const agentId = rewards.sellerUsage.agentId;
    if (!agentId) throw new Error('This wallet has no provider agent.');
    for (const epoch of epochAmounts(rewards.sellerUsage.epochs)) {
      onStep?.(`Staking provider usage reward for epoch ${epoch}`);
      const result = await stakeUnclaimedAgentReward({
        walletClient, account, usageRewards, agentId, epoch, epochs,
      });
      hashes.push(result.hash);
    }
  } else {
    if (!rewards.buyerUsage?.claimable) throw new Error('Buyer usage rewards are claimed by the operator, not this wallet.');
    if (!stakeAgentId) throw new Error('Choose a pool to stake into.');
    for (const epoch of epochAmounts(rewards.buyerUsage.epochs)) {
      onStep?.(`Staking buyer usage reward for epoch ${epoch}`);
      const result = await stakeUnclaimedBuyerReward({
        walletClient, account, usageRewards, buyer: account, epoch, agentId: stakeAgentId, epochs,
      });
      hashes.push(result.hash);
    }
  }
  if (hashes.length === 0) throw new Error('No unclaimed usage rewards to stake.');
  return { hash: hashes[hashes.length - 1], hashes };
}

async function compoundRewards({ walletClient, account, addresses, api, epochs, targetAgentId, onStep }) {
  const hashes = [];
  const { signer } = await signerFor(walletClient, account);
  const poolsAddress = requireAddress(addresses, 'sellerPools', 'Pools');
  const before = new Set(await positionIdsFor(account, poolsAddress, signer));
  try {
    const restaked = await restakeStaker({ walletClient, account, addresses, api, epochs, onStep });
    hashes.push(...(restaked.hashes || [restaked.hash]));
  } catch (error) {
    if (!/No staker rewards|not indexed/.test(describeError(error))) throw error;
    onStep?.('No staker rewards to restake');
  }
  try {
    const seller = await stakeUsage({ walletClient, account, addresses, api, side: 'seller', epochs, onStep });
    hashes.push(...(seller.hashes || [seller.hash]));
  } catch (error) {
    if (!/No unclaimed usage rewards|no provider agent|not claimable/.test(describeError(error))) throw error;
  }
  try {
    const buyer = await stakeUsage({
      walletClient, account, addresses, api, side: 'buyer', epochs, stakeAgentId: targetAgentId, onStep,
    });
    hashes.push(...(buyer.hashes || [buyer.hash]));
  } catch (error) {
    if (!/No unclaimed usage rewards|operator|Choose a pool/.test(describeError(error))) throw error;
  }
  if (hashes.length === 0) throw new Error('Nothing to restake.');
  if (targetAgentId) {
    const after = await positionIdsFor(account, poolsAddress, signer);
    const created = after.filter((id) => !before.has(id));
    if (created.length) {
      onStep?.(`Moving ${created.length} new position(s)`);
      const { Contract } = await import('ethers');
      const pools = new Contract(poolsAddress, POOLS_WRITE_ABI, signer);
      hashes.push(await send(await pools.moveStakes(created, targetAgentId)));
    }
  }
  return { hash: hashes[hashes.length - 1], hashes };
}

export async function runAntsAction({ path, body, walletClient, account, addresses, api, onStep }) {
  if (!walletClient || !account) throw new Error('Connect a wallet to sign.');
  const { signer } = await signerFor(walletClient, account);
  const { Contract } = await import('ethers');

  switch (path) {
    case '/api/positions/stake': {
      const amountWei = parseUnits(body.amount, 18);
      if (!amountWei) throw new Error('Amount must be a positive decimal number of ANTS.');
      onStep?.('Approving and staking ANTS');
      return stakeWalletAnts({
        walletClient,
        account,
        antsToken: requireAddress(addresses, 'antsToken', 'ANTS token'),
        poolsAddress: requireAddress(addresses, 'sellerPools', 'Pools'),
        agentId: Number(body.agentId),
        amountWei,
        epochs: Number(body.epochs),
      });
    }
    case '/api/positions/move': {
      const ids = (body.positionIds || []).map(Number);
      const toAgentId = Number(body.toAgentId);
      if (ids.length === 0) throw new Error('Select at least one position.');
      onStep?.('Moving positions');
      if (ids.length === 1) {
        return movePosition({
          walletClient, account,
          poolsAddress: requireAddress(addresses, 'sellerPools', 'Pools'),
          positionId: ids[0],
          toAgentId,
        });
      }
      const pools = new Contract(requireAddress(addresses, 'sellerPools', 'Pools'), POOLS_WRITE_ABI, signer);
      return { hash: await send(await pools.moveStakes(ids, toAgentId)) };
    }
    case '/api/positions/split': {
      onStep?.('Splitting position');
      return splitPosition({
        walletClient, account,
        poolsAddress: requireAddress(addresses, 'sellerPools', 'Pools'),
        positionId: Number(body.positionId),
        splitAmountAnts: String(body.amount),
      });
    }
    case '/api/positions/merge': {
      onStep?.('Merging positions');
      return mergePositions({
        walletClient, account,
        poolsAddress: requireAddress(addresses, 'sellerPools', 'Pools'),
        positionIds: (body.positionIds || []).map(Number),
      });
    }
    case '/api/positions/extend': {
      onStep?.('Extending lock');
      const pools = new Contract(requireAddress(addresses, 'sellerPools', 'Pools'), POOLS_WRITE_ABI, signer);
      return { hash: await send(await pools.extendLock(Number(body.positionId), Number(body.epochs))) };
    }
    case '/api/positions/max-lock': {
      onStep?.(body.enable ? 'Enabling max lock' : 'Disabling max lock');
      const pools = new Contract(requireAddress(addresses, 'sellerPools', 'Pools'), POOLS_WRITE_ABI, signer);
      const tx = body.enable
        ? await pools.enableMaxLock(Number(body.positionId))
        : await pools.disableMaxLock(Number(body.positionId));
      return { hash: await send(tx) };
    }
    case '/api/positions/withdraw': {
      onStep?.('Withdrawing positions');
      const pools = new Contract(requireAddress(addresses, 'sellerPools', 'Pools'), POOLS_WRITE_ABI, signer);
      return { hash: await send(await pools.withdrawStakes((body.positionIds || []).map(Number))) };
    }
    case '/api/rewards/claim':
      return claimBuckets({ signer, account, addresses, api, buckets: body.buckets, onStep });
    case '/api/rewards/restake':
      return restakeStaker({ walletClient, account, addresses, api, epochs: Number(body.epochs), onStep });
    case '/api/rewards/stake-usage':
      return stakeUsage({
        walletClient, account, addresses, api,
        side: body.side, epochs: Number(body.epochs), stakeAgentId: body.stakeAgentId, onStep,
      });
    case '/api/rewards/compound':
      return compoundRewards({
        walletClient, account, addresses, api,
        epochs: Number(body.epochs), targetAgentId: body.targetAgentId, onStep,
      });
    case '/api/seller/register': {
      const agentId = Number(body.agentId);
      if (!Number.isSafeInteger(agentId) || agentId <= 0) throw new Error('Agent id must be a positive integer.');
      onStep?.('Registering provider binding');
      const registry = new Contract(requireAddress(addresses, 'sellerRegistry', 'Provider registry'), SELLER_REGISTRY_ABI, signer);
      return { hash: await send(await registry.registerSeller(agentId)) };
    }
    case '/api/seller/claim-starter': {
      onStep?.('Claiming starter grant');
      const init = new Contract(requireAddress(addresses, 'positionInit', 'Starter grant'), POSITION_INIT_ABI, signer);
      return { hash: await send(await init.initPosition()) };
    }
    default:
      throw new Error(`Unknown action ${path}`);
  }
}

export function actionTitle(path) {
  const titles = {
    '/api/positions/stake': 'Stake',
    '/api/positions/move': 'Move stake',
    '/api/positions/split': 'Split position',
    '/api/positions/merge': 'Merge positions',
    '/api/positions/extend': 'Extend lock',
    '/api/positions/max-lock': 'Max lock',
    '/api/positions/withdraw': 'Withdraw',
    '/api/rewards/claim': 'Claim rewards',
    '/api/rewards/restake': 'Restake rewards',
    '/api/rewards/stake-usage': 'Stake usage rewards',
    '/api/rewards/compound': 'Restake rewards',
    '/api/seller/register': 'Register provider',
    '/api/seller/claim-starter': 'Claim starter',
  };
  return titles[path] || 'Transaction';
}

export { toBigInt };
