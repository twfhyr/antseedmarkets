import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { Loader2, AlertCircle } from 'lucide-react';
import { fetchRewards, fetchStakingOverview } from '../api';
import { useI18n } from '../i18n/index.jsx';
import {
  formatWeiAnts,
  parseAntsToWei,
  readStakeBounds,
  readWalletAnts,
  restakeUnclaimedStakerRewards,
  stakeUnclaimedAgentReward,
  stakeUnclaimedBuyerReward,
  stakeWalletAnts,
} from '../lib/stakeAnts';

const DAY = 86_400;
const LOCK_PRESETS = [
  { label: '1w', days: 7 },
  { label: '1m', days: 30 },
  { label: '6m', days: 182 },
  { label: '1y', days: 365 },
  { label: 'max', days: 'max' },
];

function num(value, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function usd(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function openEpochs(rows) {
  return (rows || []).filter((row) => !row.claimed && Number(row.amount) > 0).sort((a, b) => b.epoch - a.epoch);
}

function rewardAmount(row) {
  return String(row?.amount ?? '0');
}

function sourceKey(source) {
  if (!source) return '';
  if (source.kind === 'wallet') return 'wallet';
  if (source.kind === 'staker') return `staker-${source.positionId}`;
  return `${source.kind}-${source.epoch}`;
}

function buildStakeSources({ isConnected, wallet, rewards, buyerRows, providerRows, stakerRows, canStakeBuyer, canStakeProvider, canStakeStaker, pools, t }) {
  const sources = [];
  sources.push({
    id: 'wallet',
    kind: 'wallet',
    label: t('stake.deskSourceWallet'),
    amountAnts: wallet.balance != null ? formatWeiAnts(wallet.balance, 6) : '',
    displayAmount: wallet.balance != null ? formatWeiAnts(wallet.balance, 4) : '—',
    available: Boolean(isConnected && wallet.canTransfer !== false),
    hint: wallet.canTransfer === false ? t('stake.deskTransfersOff') : t('stake.deskSourceWalletHint'),
  });
  for (const row of buyerRows) {
    sources.push({
      id: `buyer-${row.epoch}`,
      kind: 'buyer',
      label: t('stake.deskRewardsBuyer'),
      epoch: row.epoch,
      amountAnts: rewardAmount(row),
      displayAmount: num(row.amount, 4),
      available: Boolean(canStakeBuyer),
      hint: rewards?.buyerUsage?.claimable ? t('stake.deskSourceBuyerHint') : t('stake.deskRewardsOperator'),
    });
  }
  for (const row of providerRows) {
    sources.push({
      id: `provider-${row.epoch}`,
      kind: 'provider',
      label: t('stake.deskRewardsProvider'),
      epoch: row.epoch,
      amountAnts: rewardAmount(row),
      displayAmount: num(row.amount, 4),
      available: Boolean(canStakeProvider),
      agentId: rewards?.agentId,
      hint: rewards?.agentId ? t('stake.deskRewardOwnPool', { id: String(rewards.agentId) }) : t('stake.needsAgent'),
    });
  }
  for (const row of stakerRows) {
    const pool = pools.find((item) => String(item.agentId) === String(row.agentId));
    sources.push({
      id: `staker-${row.id}`,
      kind: 'staker',
      label: t('stake.deskRewardsStaker'),
      positionId: row.id,
      agentId: row.agentId,
      amountAnts: rewardAmount(row),
      displayAmount: num(row.amount, 4),
      available: Boolean(canStakeStaker),
      hint: t('stake.deskSourceStakerHint', { id: String(row.id), pool: pool?.name || t('stake.agent', { id: row.agentId }) }),
    });
  }
  return sources;
}

export default function StakingDesk() {
  const { t } = useI18n();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [sourceId, setSourceId] = useState(null);
  const [stakePanelOpen, setStakePanelOpen] = useState(false);
  const [stakeTargetId, setStakeTargetId] = useState(null);
  const [amount, setAmount] = useState('');
  const [epochs, setEpochs] = useState(104);
  const [bounds, setBounds] = useState({ min: 1, max: 104 });
  const [wallet, setWallet] = useState({ balance: null, canTransfer: null });
  const [status, setStatus] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [rewardsLoading, setRewardsLoading] = useState(false);

  const load = useCallback(async (wait = false) => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchStakingOverview(wait);
      setOverview(data);
    } catch {
      setOverview(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRewards = useCallback(async (addr, bust = false) => {
    if (!addr) {
      setRewards(null);
      return;
    }
    setRewardsLoading(true);
    try {
      setRewards(await fetchRewards(addr, bust));
    } catch {
      setRewards(null);
    } finally {
      setRewardsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const poolsAddress = overview?.contracts?.sellerPools;
    if (!poolsAddress || !publicClient) return undefined;
    let live = true;
    readStakeBounds({ publicClient, poolsAddress }).then((row) => {
      if (live) setBounds(row);
    });
    return () => { live = false; };
  }, [overview?.contracts?.sellerPools, publicClient]);

  useEffect(() => {
    const antsToken = overview?.contracts?.antsToken;
    if (!isConnected || !address || !antsToken || !publicClient) {
      setWallet({ balance: null, canTransfer: null });
      return undefined;
    }
    let live = true;
    readWalletAnts({ publicClient, antsToken, account: address }).then((row) => {
      if (live) setWallet(row);
    });
    return () => { live = false; };
  }, [isConnected, address, overview?.contracts?.antsToken, publicClient]);

  useEffect(() => {
    if (!isConnected || !address) {
      setRewards(null);
      return undefined;
    }
    loadRewards(address);
    return undefined;
  }, [isConnected, address, loadRewards]);

  useEffect(() => {
    setEpochs(bounds.max);
  }, [bounds.min, bounds.max]);

  const pools = overview?.pools || [];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return pools;
    return pools.filter((p) => (
      String(p.agentId) === needle
      || (p.name || '').toLowerCase().includes(needle)
    ));
  }, [pools, query]);

  useEffect(() => {
    if (!selectedId && overview?.pools?.[0]) setSelectedId(String(overview.pools[0].agentId));
  }, [selectedId, overview?.pools]);

  const selected = pools.find((p) => String(p.agentId) === String(selectedId)) || null;
  const epochDuration = Number(overview?.epochDuration) || DAY;
  const epochsForDays = (days) => Math.max(bounds.min, Math.min(bounds.max, Math.round((days * DAY) / epochDuration)));
  const lockDays = Math.round((epochs * epochDuration) / DAY);

  const amountWei = parseAntsToWei(amount);
  const busy = status?.phase === 'staking' || status?.phase === 'approving';
  const buyerRows = openEpochs(rewards?.buyerUsage?.epochs);
  const providerRows = openEpochs(rewards?.sellerUsage?.epochs);
  const stakerRows = (rewards?.staker?.positions || []).filter((row) => Number(row.amount) > 0);
  const canStakeBuyer = !!(isConnected && rewards?.buyerUsage?.claimable);
  const canStakeProvider = !!(isConnected && rewards?.sellerUsage?.claimable && rewards?.agentId);
  const canStakeStaker = !!(isConnected && rewards?.contracts?.sellerPoolsRewards);
  const hasRewardRows = buyerRows.length > 0 || providerRows.length > 0 || stakerRows.length > 0;
  const stakeSources = useMemo(() => buildStakeSources({
    isConnected,
    wallet,
    rewards,
    buyerRows,
    providerRows,
    stakerRows,
    canStakeBuyer,
    canStakeProvider,
    canStakeStaker,
    pools,
    t,
  }), [isConnected, wallet, rewards, buyerRows, providerRows, stakerRows, canStakeBuyer, canStakeProvider, canStakeStaker, pools, t]);
  const stakeTarget = stakeTargetId != null ? pools.find((p) => String(p.agentId) === String(stakeTargetId)) || null : null;
  const visibleStakeSources = useMemo(() => (
    stakeTargetId == null
      ? stakeSources
      : stakeSources.filter((source) => source.agentId == null || String(source.agentId) === String(stakeTargetId))
  ), [stakeSources, stakeTargetId]);
  const selectedSource = visibleStakeSources.find((source) => source.id === sourceId)
    || visibleStakeSources.find((source) => source.available && source.kind !== 'wallet')
    || visibleStakeSources.find((source) => source.available)
    || visibleStakeSources[0]
    || null;
  const sourceNeedsEditableAmount = selectedSource?.kind === 'wallet';
  const canChooseProvider = stakeTargetId == null && !selectedSource?.agentId;
  const effectiveSelected = selectedSource?.agentId ? pools.find((p) => String(p.agentId) === String(selectedSource.agentId)) || null : stakeTarget || selected;
  const selectedPoolId = selectedSource?.agentId ? String(selectedSource.agentId) : selectedId;

  useEffect(() => {
    if (selectedSource?.agentId && String(selectedId) !== String(selectedSource.agentId)) {
      setSelectedId(String(selectedSource.agentId));
    }
  }, [selectedSource?.agentId, selectedId]);

  const onChooseSource = (source) => {
    setSourceId(source.id);
    setStatus(null);
    if (source.agentId) setSelectedId(String(source.agentId));
    else if (stakeTargetId != null) setSelectedId(String(stakeTargetId));
    setAmount(source.kind === 'wallet' ? '' : source.amountAnts || '');
  };

  const openStakePanel = (pool = null, preferRewards = false) => {
    const targetId = pool ? String(pool.agentId) : null;
    setStakePanelOpen(true);
    setStakeTargetId(targetId);
    setSourceId(preferRewards ? null : null);
    setAmount('');
    setStatus(null);
    if (targetId) setSelectedId(targetId);
  };

  const closeStakePanel = () => {
    if (busy) return;
    setStakePanelOpen(false);
    setStakeTargetId(null);
    setStatus(null);
  };

  const refreshAfterStake = () => {
    load(true);
    if (address) loadRewards(address, true);
    if (publicClient && overview?.contracts?.antsToken && address) {
      readWalletAnts({ publicClient, antsToken: overview.contracts.antsToken, account: address }).then(setWallet);
    }
  };

  const onStakeSelectedSource = async (event) => {
    event.preventDefault();
    if (!selectedSource || !walletClient || !address || !overview?.contracts?.sellerPools || !overview?.contracts?.antsToken) return;
    const key = sourceKey(selectedSource);
    if (!selectedSource.available) {
      setStatus({ phase: 'error', key, message: selectedSource.hint || t('stake.deskFailed') });
      return;
    }
    if (!effectiveSelected) {
      setStatus({ phase: 'error', key, message: t('stake.deskPickPool') });
      return;
    }
    if (sourceNeedsEditableAmount && (!amountWei || amountWei <= 0n)) {
      setStatus({ phase: 'error', key, message: t('stake.deskAmount') });
      return;
    }
    if (selectedSource.kind === 'wallet') {
      if (wallet.canTransfer === false) {
        setStatus({ phase: 'error', key, message: t('stake.deskTransfersOff') });
        return;
      }
      if (wallet.balance != null && amountWei > wallet.balance) {
        setStatus({ phase: 'error', key, message: t('stake.deskExceeds') });
        return;
      }
    }
    setStatus({ phase: 'staking', key, message: t('stake.deskConfirm') });
    try {
      let result;
      if (selectedSource.kind === 'wallet') {
        result = await stakeWalletAnts({
          walletClient,
          account: address,
          antsToken: overview.contracts.antsToken,
          poolsAddress: overview.contracts.sellerPools,
          agentId: effectiveSelected.agentId,
          amountWei,
          epochs,
        });
      } else if (selectedSource.kind === 'buyer') {
        result = await stakeUnclaimedBuyerReward({
          walletClient,
          account: address,
          usageRewards: rewards.contracts.usageRewards,
          buyer: address,
          epoch: selectedSource.epoch,
          agentId: effectiveSelected.agentId,
          epochs,
        });
      } else if (selectedSource.kind === 'provider') {
        result = await stakeUnclaimedAgentReward({
          walletClient,
          account: address,
          usageRewards: rewards.contracts.usageRewards,
          agentId: selectedSource.agentId,
          epoch: selectedSource.epoch,
          epochs,
        });
      } else {
        result = await restakeUnclaimedStakerRewards({
          walletClient,
          account: address,
          sellerPoolsRewards: rewards.contracts.sellerPoolsRewards,
          positionIds: [selectedSource.positionId],
          epochs,
        });
      }
      setStatus({ phase: 'done', key, message: t('stake.deskDone'), hash: result.hash });
      setAmount('');
      refreshAfterStake();
    } catch (err) {
      setStatus({ phase: 'error', key, message: err.shortMessage || err.message || t('stake.deskFailed') });
    }
  };

  return (
    <div className="wrap staking-desk">
      <header className="staking-desk__intro">
        <p className="v2-eyebrow"><span className="v2-dot" />{t('stake.deskEyebrow')}</p>
        <h2>{t('stake.deskTitle')}</h2>
        <p>{t('stake.deskBlurb')}</p>
      </header>

      <div className="staking-ticker" role="list" aria-label={t('stake.deskNetwork')}>
        <div role="listitem"><span>{t('stake.deskTotalStaked')}</span><strong>{num(overview?.network?.totalActiveStakeAnts, 2)} <small>ANTS</small></strong></div>
        <div role="listitem"><span>{t('stake.deskPower')}</span><strong>{num(overview?.network?.totalPowerWeight, 2)}</strong></div>
        <div role="listitem"><span>{t('stake.deskBudget')}</span><strong>{num(overview?.network?.stakerBudgetAnts, 2)} <small>ANTS</small></strong></div>
        <div role="listitem"><span>{t('stake.deskVolume')}</span><strong>{usd(overview?.network?.lastEpochVolumeUsdc)} <small>USDC</small></strong></div>
        <div role="listitem"><span>{t('stake.deskPools')}</span><strong>{overview ? pools.length : '—'}</strong></div>
        <div role="listitem"><span>{t('stake.currentEpoch')}</span><strong>{overview?.currentEpoch ?? '—'}</strong></div>
      </div>

      {loading && !overview && (
        <div className="staking-desk__status">
          <Loader2 size={16} className="spin" />
          <span>{t('stake.deskLoading')}</span>
        </div>
      )}
      {error && !overview && (
        <div className="staking-desk__status staking-desk__status--error">
          <AlertCircle size={16} />
          <span>{t('stake.deskError')}</span>
        </div>
      )}

      {overview && (
        <>
          {stakePanelOpen && (
            <form className="staking-form" onSubmit={onStakeSelectedSource}>
              <div className="staking-form__header">
                <div>
                  <h3>{stakeTarget ? t('stake.deskStakeInto', { pool: stakeTarget.name || t('stake.agent', { id: stakeTarget.agentId }) }) : t('stake.deskRewards')}</h3>
                  <p className="staking-form__hint">{t('stake.deskFormHint')}</p>
                </div>
                <button type="button" className="staking-form__close" onClick={closeStakePanel} disabled={busy} aria-label={t('stake.deskClose')}>×</button>
              </div>
              {!isConnected && <p className="staking-form__hint">{t('stake.deskNeedWallet')}</p>}
              {isConnected && wallet.canTransfer === false && (
                <p className="staking-form__hint">{t('stake.deskTransfersOff')}</p>
              )}
              {isConnected && rewardsLoading && !rewards && (
                <div className="staking-desk__status">
                  <Loader2 size={16} className="spin" />
                  <span>{t('stake.deskRewardsLoading')}</span>
                </div>
              )}
              {isConnected && rewards && !hasRewardRows && (
                <p className="staking-form__hint">{t('stake.deskRewardsEmpty')}</p>
              )}

              <div className="staking-flow">
                <label>
                  <span>{t('stake.deskSource')}</span>
                  <select
                    value={selectedSource?.id || ''}
                    onChange={(e) => {
                      const next = visibleStakeSources.find((source) => source.id === e.target.value);
                      if (next) onChooseSource(next);
                    }}
                    disabled={busy || visibleStakeSources.length === 0}
                  >
                    {visibleStakeSources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.label} {source.displayAmount} ANTS
                      </option>
                    ))}
                  </select>
                </label>

                {canChooseProvider ? (
                  <label>
                    <span>{t('stake.deskPool')}</span>
                    <select
                      value={selectedPoolId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      disabled={busy}
                    >
                      <option value="">{t('stake.deskPoolPlaceholder')}</option>
                      {pools.map((pool) => (
                        <option key={pool.agentId} value={String(pool.agentId)}>
                          {pool.name || t('stake.agent', { id: pool.agentId })} #{pool.agentId}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="staking-flow__locked">
                    <span>{t('stake.deskPool')}</span>
                    <strong>{effectiveSelected?.name || t('stake.agent', { id: selectedSource?.agentId || stakeTargetId })}</strong>
                    <small>{t('stake.deskLockedPool')}</small>
                  </div>
                )}

                <label>
                  <span>{t('stake.deskAmountLabel')}</span>
                  {sourceNeedsEditableAmount ? (
                    <>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.0"
                        disabled={busy || !isConnected}
                      />
                      {wallet.balance != null && (
                        <button
                          type="button"
                          className="staking-form__max"
                          onClick={() => setAmount(formatWeiAnts(wallet.balance, 6))}
                          disabled={busy}
                        >
                          {t('stake.deskMaxBalance', { amount: formatWeiAnts(wallet.balance, 4) })}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="staking-flow__amount">
                      <strong>{selectedSource?.displayAmount || '—'} ANTS</strong>
                      <small>{t('stake.deskRewardAmountFixed')}</small>
                    </div>
                  )}
                </label>

                <label>
                  <span>{t('stake.lockInput')}</span>
                  <input
                    type="range"
                    min={bounds.min}
                    max={bounds.max}
                    value={epochs}
                    onChange={(e) => setEpochs(Number(e.target.value))}
                    disabled={busy}
                  />
                  <em className="staking-form__readout">{t('stake.deskLockReadout', { days: String(lockDays), epochs: String(epochs) })}</em>
                </label>
              </div>
              <div className="staking-form__presets">
                {LOCK_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setEpochs(preset.days === 'max' ? bounds.max : epochsForDays(preset.days))}
                    disabled={busy}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                className="v2-position-button v2-position-button--buy"
                disabled={busy || !isConnected || !selectedSource || !selectedSource.available || (selectedSource.kind === 'wallet' && wallet.canTransfer === false)}
              >
                {busy ? <Loader2 size={14} className="spin" /> : null}
                {busy ? t('stake.deskConfirm') : t(selectedSource?.kind === 'wallet' ? 'stake.deskSubmit' : 'stake.deskStakeReward')}
              </button>
              {status?.message && (
                <p className={`staking-form__status${status.phase === 'error' ? ' is-error' : ''}`}>
                  {status.message}
                  {status.hash ? (
                    <>
                      {' '}
                      <a href={`https://basescan.org/tx/${status.hash}`} target="_blank" rel="noopener noreferrer">tx</a>
                    </>
                  ) : null}
                </p>
              )}
            </form>
          )}

          <section className="staking-pools">
            <div className="staking-pools__bar">
              <h3>{t('stake.deskPoolsTitle')}</h3>
              <div className="staking-pools__actions">
                <button
                  type="button"
                  className="lants-nft__listbtn design-action--primary"
                  onClick={() => openStakePanel(null, true)}
                >
                  {t('stake.deskStakeRewards')}
                </button>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('stake.deskSearch')}
                  aria-label={t('stake.deskSearch')}
                />
              </div>
            </div>
            <div className="staking-pools__table-wrap">
              <table className="staking-pools__table">
                <thead>
                  <tr>
                    <th>{t('stake.deskPool')}</th>
                    <th>{t('stake.deskColStake')}</th>
                    <th>{t('stake.deskColVolume')}</th>
                    <th>{t('stake.deskColPositions')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={5}>{t('stake.deskNone')}</td></tr>
                  )}
                  {filtered.map((pool) => (
                    <tr
                      key={pool.agentId}
                      className={String(pool.agentId) === String(selectedId) ? 'is-selected' : ''}
                    >
                      <td>
                        <strong>{pool.name || t('stake.agent', { id: pool.agentId })}</strong>
                        <div className="staking-pools__meta">
                          #{pool.agentId}
                          {pool.models != null ? `, ${t('stake.deskModels', { n: String(pool.models) })}` : ''}
                        </div>
                      </td>
                      <td>{num(pool.activeStakeAnts, 2)}</td>
                      <td>{usd(pool.lastEpochVolumeUsdc)}</td>
                      <td>{pool.openPositions ?? '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="lants-nft__listbtn design-action--primary"
                          onClick={() => openStakePanel(pool)}
                        >
                          {t('stake.deskSubmit')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
