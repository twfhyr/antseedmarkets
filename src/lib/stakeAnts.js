const ANTS_TOKEN_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'transfersEnabled', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
  { name: 'transferWhitelist', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
];

const SELLER_POOLS_STAKE_ABI = [
  {
    name: 'stake', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'stakeEpochs', type: 'uint256' },
    ],
    outputs: [{ name: 'positionId', type: 'uint256' }],
  },
  { name: 'minStakeEpochs', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'MAX_STAKE_EPOCHS', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
];

export function parseAntsToWei(text) {
  const raw = String(text || '').trim().replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  const [whole, frac = ''] = raw.split('.');
  if (frac.length > 18) return null;
  const fracPadded = `${frac}${'0'.repeat(18)}`.slice(0, 18);
  try {
    return BigInt(whole) * 10n ** 18n + BigInt(fracPadded);
  } catch {
    return null;
  }
}

export function formatWeiAnts(wei, digits = 4) {
  if (wei == null) return '—';
  let value;
  try {
    value = typeof wei === 'bigint' ? wei : BigInt(wei);
  } catch {
    return '—';
  }
  const neg = value < 0n;
  const abs = neg ? -value : value;
  const whole = abs / 10n ** 18n;
  const frac = abs % 10n ** 18n;
  const fracStr = frac.toString().padStart(18, '0').slice(0, digits).replace(/0+$/, '');
  const body = fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
  return neg ? `-${body}` : body;
}

async function signerFor(walletClient, account) {
  const { BrowserProvider } = await import('ethers');
  const network = { chainId: walletClient.chain.id, name: walletClient.chain.name };
  const provider = new BrowserProvider(walletClient.transport, network);
  return { provider, signer: await provider.getSigner(account) };
}

export async function readWalletAnts({ publicClient, antsToken, account }) {
  if (!publicClient || !antsToken || !account) {
    return { balance: null, canTransfer: null, transfersEnabled: null, whitelisted: null };
  }
  try {
    const [balance, transfersEnabled, whitelisted] = await Promise.all([
      publicClient.readContract({ address: antsToken, abi: ANTS_TOKEN_ABI, functionName: 'balanceOf', args: [account] }),
      publicClient.readContract({ address: antsToken, abi: ANTS_TOKEN_ABI, functionName: 'transfersEnabled' }),
      publicClient.readContract({ address: antsToken, abi: ANTS_TOKEN_ABI, functionName: 'transferWhitelist', args: [account] }),
    ]);
    return {
      balance,
      transfersEnabled: Boolean(transfersEnabled),
      whitelisted: Boolean(whitelisted),
      canTransfer: Boolean(transfersEnabled) || Boolean(whitelisted),
    };
  } catch {
    return { balance: null, canTransfer: null, transfersEnabled: null, whitelisted: null };
  }
}

export async function readStakeBounds({ publicClient, poolsAddress }) {
  if (!publicClient || !poolsAddress) return { min: 1, max: 104 };
  try {
    const [min, max] = await Promise.all([
      publicClient.readContract({ address: poolsAddress, abi: SELLER_POOLS_STAKE_ABI, functionName: 'minStakeEpochs' }),
      publicClient.readContract({ address: poolsAddress, abi: SELLER_POOLS_STAKE_ABI, functionName: 'MAX_STAKE_EPOCHS' }),
    ]);
    return { min: Number(min) || 1, max: Number(max) || 104 };
  } catch {
    return { min: 1, max: 104 };
  }
}

const USAGE_REWARDS_STAKE_ABI = [
  {
    name: 'stakeBuyerReward', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'buyer', type: 'address' },
      { name: 'epoch', type: 'uint256' },
      { name: 'stakeAgentId', type: 'uint256' },
      { name: 'stakeEpochs', type: 'uint256' },
    ],
    outputs: [{ name: 'newPositionId', type: 'uint256' }],
  },
  {
    name: 'stakeAgentReward', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'epoch', type: 'uint256' },
      { name: 'stakeEpochs', type: 'uint256' },
    ],
    outputs: [{ name: 'newPositionId', type: 'uint256' }],
  },
];

export async function stakeUnclaimedBuyerReward({
  walletClient, account, usageRewards, buyer, epoch, agentId, epochs,
}) {
  const { Contract } = await import('ethers');
  const { signer } = await signerFor(walletClient, account);
  const rewards = new Contract(usageRewards, USAGE_REWARDS_STAKE_ABI, signer);
  const tx = await rewards.stakeBuyerReward(buyer, epoch, agentId, epochs);
  const receipt = await tx.wait();
  return { hash: receipt?.hash || tx.hash };
}

export async function stakeUnclaimedAgentReward({
  walletClient, account, usageRewards, agentId, epoch, epochs,
}) {
  const { Contract } = await import('ethers');
  const { signer } = await signerFor(walletClient, account);
  const rewards = new Contract(usageRewards, USAGE_REWARDS_STAKE_ABI, signer);
  const tx = await rewards.stakeAgentReward(agentId, epoch, epochs);
  const receipt = await tx.wait();
  return { hash: receipt?.hash || tx.hash };
}

const STAKER_REWARDS_ABI = [
  {
    name: 'restakeStakerRewardsBatch', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'positionIds', type: 'uint256[]' },
      { name: 'stakeEpochs', type: 'uint256' },
    ],
    outputs: [{ name: 'newPositionIds', type: 'uint256[]' }],
  },
];

export async function restakeUnclaimedStakerRewards({
  walletClient, account, sellerPoolsRewards, positionIds, epochs,
}) {
  const ids = (positionIds || []).map((id) => Number(id)).filter((id) => Number.isSafeInteger(id) && id > 0);
  if (ids.length === 0) throw new Error('No staker positions to restake.');
  const { Contract } = await import('ethers');
  const { signer } = await signerFor(walletClient, account);
  const rewards = new Contract(sellerPoolsRewards, STAKER_REWARDS_ABI, signer);
  const tx = await rewards.restakeStakerRewardsBatch(ids, epochs);
  const receipt = await tx.wait();
  return { hash: receipt?.hash || tx.hash };
}

export async function stakeWalletAnts({
  walletClient, account, antsToken, poolsAddress, agentId, amountWei, epochs,
}) {
  const { Contract, MaxUint256 } = await import('ethers');
  const { signer } = await signerFor(walletClient, account);
  const token = new Contract(antsToken, ANTS_TOKEN_ABI, signer);
  const pools = new Contract(poolsAddress, SELLER_POOLS_STAKE_ABI, signer);
  const allowance = await token.allowance(account, poolsAddress);
  const hashes = [];
  if (allowance < amountWei) {
    const approveTx = await token.approve(poolsAddress, MaxUint256);
    const approveReceipt = await approveTx.wait();
    hashes.push(approveReceipt?.hash || approveTx.hash);
  }
  const tx = await pools.stake(agentId, amountWei, epochs);
  const receipt = await tx.wait();
  hashes.push(receipt?.hash || tx.hash);
  return { hash: hashes[hashes.length - 1], hashes };
}
