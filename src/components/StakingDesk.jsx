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

  const onStake = async (event) => {
    event.preventDefault();
    if (!walletClient || !address || !overview?.contracts?.sellerPools || !overview?.contracts?.antsToken) return;
    if (!selected) {
      setStatus({ phase: 'error', message: t('stake.deskPickPool') });
      return;
    }
    if (!amountWei || amountWei <= 0n) {
      setStatus({ phase: 'error', message: t('stake.deskAmount') });
      return;
    }
    if (wallet.canTransfer === false) {
      setStatus({ phase: 'error', message: t('stake.deskTransfersOff') });
      return;
    }
    if (wallet.balance != null && amountWei > wallet.balance) {
      setStatus({ phase: 'error', message: t('stake.deskExceeds') });
      return;
    }
    setStatus({ phase: 'staking', message: t('stake.deskConfirm') });
    try {
      const result = await stakeWalletAnts({
        walletClient,
        account: address,
        antsToken: overview.contracts.antsToken,
        poolsAddress: overview.contracts.sellerPools,
        agentId: selected.agentId,
        amountWei,
        epochs,
      });
      setStatus({ phase: 'done', message: t('stake.deskDone'), hash: result.hash });
      setAmount('');
      readWalletAnts({ publicClient, antsToken: overview.contracts.antsToken, account: address }).then(setWallet);
      load(true);
    } catch (err) {
      setStatus({ phase: 'error', message: err.shortMessage || err.message || t('stake.deskFailed') });
    }
  };

  const onStakeReward = async (side, epoch) => {
    if (!walletClient || !address || !rewards?.contracts?.usageRewards) return;
    const key = `${side}-${epoch}`;
    if (side === 'buyer') {
      if (!selected) {
        setStatus({ phase: 'error', key, message: t('stake.deskPickPool') });
        return;
      }
      setStatus({ phase: 'staking', key, message: t('stake.stakingBuyer', { epoch, agent: selected.agentId, lock: epochs }) });
      try {
        const result = await stakeUnclaimedBuyerReward({
          walletClient,
          account: address,
          usageRewards: rewards.contracts.usageRewards,
          buyer: address,
          epoch,
          agentId: selected.agentId,
          epochs,
        });
        setStatus({ phase: 'done', key, message: t('stake.stakedBuyer', { epoch, agent: selected.agentId, lock: epochs }), hash: result.hash });
        loadRewards(address, true);
        load(true);
      } catch (err) {
        setStatus({ phase: 'error', key, message: err.shortMessage || err.message || t('stake.deskFailed') });
      }
      return;
    }
    if (!rewards.agentId) {
      setStatus({ phase: 'error', key, message: t('stake.needsAgent') });
      return;
    }
    setStatus({ phase: 'staking', key, message: t('stake.stakingSeller', { epoch, lock: epochs }) });
    try {
      const result = await stakeUnclaimedAgentReward({
        walletClient,
        account: address,
        usageRewards: rewards.contracts.usageRewards,
        agentId: rewards.agentId,
        epoch,
        epochs,
      });
      setStatus({ phase: 'done', key, message: t('stake.stakedSeller', { epoch, lock: epochs }), hash: result.hash });
      loadRewards(address, true);
      load(true);
    } catch (err) {
      setStatus({ phase: 'error', key, message: err.shortMessage || err.message || t('stake.deskFailed') });
    }
  };

  const onStakeStaker = async (positionId) => {
    if (!walletClient || !address || !rewards?.contracts?.sellerPoolsRewards) return;
    const key = `staker-${positionId}`;
    setStatus({ phase: 'staking', key, message: t('stake.stakingStaker', { id: String(positionId), lock: epochs }) });
    try {
      const result = await restakeUnclaimedStakerRewards({
        walletClient,
        account: address,
        sellerPoolsRewards: rewards.contracts.sellerPoolsRewards,
        positionIds: [positionId],
        epochs,
      });
      setStatus({ phase: 'done', key, message: t('stake.stakedStaker', { id: String(positionId), lock: epochs }), hash: result.hash });
      loadRewards(address, true);
      load(true);
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
          <form className="staking-form" onSubmit={onStake}>
            <h3>{t('stake.deskFormTitle')}</h3>
            {!isConnected && <p className="staking-form__hint">{t('stake.deskNeedWallet')}</p>}
            {isConnected && wallet.canTransfer === false && (
              <p className="staking-form__hint">{t('stake.deskTransfersOff')}</p>
            )}
            <div className="staking-form__fields">
              <label>
                <span>{t('stake.deskPool')}</span>
                <select
                  value={selectedId}
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
              <label>
                <span>{t('stake.deskAmountLabel')}</span>
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
              disabled={busy || !isConnected || wallet.canTransfer === false}
            >
              {busy && !status?.key ? <Loader2 size={14} className="spin" /> : null}
              {busy && !status?.key ? t('stake.deskConfirm') : t('stake.deskSubmit')}
            </button>
            {status?.message && !status?.key && (
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

          <section className="staking-rewards" aria-label={t('stake.deskRewards')}>
            <div className="staking-pools__bar">
              <h3>{t('stake.deskRewards')}</h3>
            </div>
            <p className="staking-form__hint">{t('stake.deskRewardsBlurb')}</p>
            {!isConnected && <p className="staking-form__hint">{t('stake.deskRewardsNeedWallet')}</p>}
            {isConnected && rewardsLoading && !rewards && (
              <div className="staking-desk__status">
                <Loader2 size={16} className="spin" />
                <span>{t('stake.deskRewardsLoading')}</span>
              </div>
            )}
            {isConnected && rewards && !hasRewardRows && (
              <p className="staking-form__hint">{t('stake.deskRewardsEmpty')}</p>
            )}
            {isConnected && rewards && hasRewardRows && (
              <div className="staking-rewards__tables">
                {stakerRows.length > 0 && (
                  <StakerRewardTable
                    title={t('stake.deskRewardsStaker')}
                    rows={stakerRows}
                    pools={pools}
                    canStake={canStakeStaker}
                    note={t('stake.deskRewardsStakerNote')}
                    status={status}
                    onStake={onStakeStaker}
                    t={t}
                  />
                )}
                {buyerRows.length > 0 && (
                  <RewardEpochTable
                    title={t('stake.deskRewardsBuyer')}
                    rows={buyerRows}
                    side="buyer"
                    canStake={canStakeBuyer}
                    note={!rewards.buyerUsage?.claimable ? t('stake.deskRewardsOperator') : null}
                    status={status}
                    onStake={(epoch) => onStakeReward('buyer', epoch)}
                    t={t}
                  />
                )}
                {providerRows.length > 0 && (
                  <RewardEpochTable
                    title={t('stake.deskRewardsProvider')}
                    rows={providerRows}
                    side="provider"
                    canStake={canStakeProvider}
                    note={rewards.agentId ? t('stake.deskRewardOwnPool', { id: String(rewards.agentId) }) : t('stake.needsAgent')}
                    status={status}
                    onStake={(epoch) => onStakeReward('provider', epoch)}
                    t={t}
                  />
                )}
              </div>
            )}
            {status?.key && status?.message && (
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
          </section>

          <section className="staking-pools">
            <div className="staking-pools__bar">
              <h3>{t('stake.deskPoolsTitle')}</h3>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('stake.deskSearch')}
                aria-label={t('stake.deskSearch')}
              />
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
                          onClick={() => setSelectedId(String(pool.agentId))}
                        >
                          {t('stake.deskSelect')}
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

function StakerRewardTable({ title, rows, pools, canStake, note, status, onStake, t }) {
  const busy = status?.phase === 'staking' || status?.phase === 'approving';
  return (
    <div className="staking-rewards__block">
      <h4>{title}</h4>
      {note && <p className="staking-form__hint">{note}</p>}
      <table className="staking-pools__table">
        <thead>
          <tr>
            <th>{t('stake.deskPool')}</th>
            <th>ANTS</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const thisBusy = busy && status?.key === `staker-${row.id}`;
            const pool = pools.find((p) => String(p.agentId) === String(row.agentId));
            return (
              <tr key={row.id}>
                <td>
                  <strong>{pool?.name || t('stake.agent', { id: row.agentId })}</strong>
                  <div className="staking-pools__meta">{t('stake.deskRewardsPosition', { id: String(row.id) })}</div>
                </td>
                <td>{num(row.amount, 4)}</td>
                <td>
                  {canStake ? (
                    <button
                      type="button"
                      className="lants-nft__listbtn design-action--primary"
                      disabled={busy}
                      onClick={() => onStake(row.id)}
                    >
                      {thisBusy ? <Loader2 size={12} className="spin" /> : null}
                      {t('stake.deskStakeReward')}
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RewardEpochTable({ title, rows, side, canStake, note, status, onStake, t }) {
  const busy = status?.phase === 'staking' || status?.phase === 'approving';
  return (
    <div className="staking-rewards__block">
      <h4>{title}</h4>
      {note && <p className="staking-form__hint">{note}</p>}
      <table className="staking-pools__table">
        <thead>
          <tr>
            <th>{t('stake.deskRewardsEpochCol')}</th>
            <th>ANTS</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const thisBusy = busy && status?.key === `${side}-${row.epoch}`;
            return (
              <tr key={row.epoch}>
                <td>{t('stake.deskRewardsEpoch', { epoch: String(row.epoch) })}</td>
                <td>{num(row.amount, 4)}</td>
                <td>
                  {canStake ? (
                    <button
                      type="button"
                      className="lants-nft__listbtn design-action--primary"
                      disabled={busy}
                      onClick={() => onStake(row.epoch)}
                    >
                      {thisBusy ? <Loader2 size={12} className="spin" /> : null}
                      {t('stake.deskStakeReward')}
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
