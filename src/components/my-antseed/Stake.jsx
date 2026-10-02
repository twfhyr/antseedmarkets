import React, { useEffect, useMemo, useState } from 'react';
import { epochStartAt, formatAnts, formatBps, formatDuration, formatInt, formatUtc, isPositiveDecimal, parseUnits } from '../../lib/ants/format';
import { usePageData } from '../../lib/ants/data';
import { myAntseedHref } from '../../hooks/useTabRouter';
import { useAntsApp } from './app-context';
import { ActionButton } from './ActionButton';
import { Alert, Button, ErrorBox, Field, Input, LockSlider, Panel, Select, Skeleton, StatTile, Tiles, useNow } from './ui';
import { PoolDrawer, PoolsTable, poolLabel, poolStatus, sortPools } from './pools';
import { PositionsCard } from './positions';

export function StakePage({ setPage }) {
  const { api, overview, overviewState, config } = useAntsApp();
  const positions = usePageData('positions:current', api.positions);
  const rewards = usePageData('rewards', api.rewards, 5 * 60_000);
  const pools = usePageData('pools', api.pools, 5 * 60_000);
  const now = useNow(1000);
  const data = overview;
  const [stakeTarget, setStakeTarget] = useState(undefined);
  const [openPoolId, setOpenPoolId] = useState(null);
  const sortedPools = useMemo(() => sortPools(pools.data?.pools ?? []), [pools.data]);
  const openPool = openPoolId !== null ? (sortedPools.find((p) => p.agentId === openPoolId) ?? null) : null;
  const stakeInto = (pool) => { setOpenPoolId(null); setStakeTarget(pool.agentId); };

  return (
    <>
      {overviewState.error && !data ? <ErrorBox error={overviewState.error} onRetry={overviewState.refresh} /> : null}
      {overviewState.error && data ? <div className="ma-status">Refresh failed: {overviewState.error}</div> : null}
      {!data && overviewState.loading ? <Skeleton rows={4} /> : null}
      {data ? <PhaseBanner data={data} now={now} /> : null}
      {data && data.notices?.length > 0 ? (
        <Alert tone="info">
          <ul className="ma-notices">{data.notices.map((notice, i) => <li key={i}>{notice}</li>)}</ul>
        </Alert>
      ) : null}

      <Tiles>
        <StatTile
          label="ANTS balance"
          value={data ? formatAnts(data.wallet.ants, 4) : '…'}
          unit="ANTS"
          loading={!data}
          sub={data && !config.readOnly ? (data.wallet.transfersEnabled ? 'transfers enabled' : data.wallet.whitelisted ? 'transfers off, whitelisted' : 'transfers off') : undefined}
        />
        <StatTile
          label="Your active stake"
          value={data ? formatAnts(data.wallet.totalActiveStake) : '…'}
          unit="ANTS"
          loading={!data}
          sub={data ? `${formatInt(data.wallet.positionCount)} position${data.wallet.positionCount === 1 ? '' : 's'}` : undefined}
        />
        <StatTile
          label="Your power"
          value={pools.data ? formatAnts(pools.data.yourTotalPower) : pools.error ? '—' : '…'}
          loading={pools.loading && !pools.data}
          sub={pools.data ? `${formatBps(pools.data.yourNetworkShareBps)} of all pools` : pools.error ? <span className="danger">{pools.error}</span> : 'scanning pools…'}
        />
        <StatTile
          label="Claimable rewards"
          value={rewards.data ? formatAnts(rewards.data.total) : rewards.error ? '—' : '…'}
          unit="ANTS"
          loading={rewards.loading && !rewards.data}
          sub={
            rewards.error ? (
              <span className="danger">{rewards.error} <button className="ma-link" onClick={rewards.refresh} type="button">retry</button></span>
            ) : rewards.data ? (
              <a href={myAntseedHref('rewards')} onClick={(e) => { e.preventDefault(); setPage('rewards'); }}>Restake or claim →</a>
            ) : 'loading…'
          }
        />
      </Tiles>

      <Panel
        title="Pools"
        className="ma-pools-card"
        actions={
          <Button variant="primary" size="sm" onClick={() => setStakeTarget((cur) => (cur === undefined ? null : undefined))} disabled={!pools.data}>
            {stakeTarget === undefined ? 'Stake ANTS' : 'Close'}
          </Button>
        }
      >
        {pools.error && !pools.data ? <ErrorBox error={pools.error} onRetry={pools.refresh} /> : null}
        {pools.error && pools.data ? <div className="ma-status">Refresh failed: {pools.error}</div> : null}
        {stakeTarget !== undefined && pools.data ? (
          <Panel tone="accent" className="ma-panel-inset" title="Stake ANTS">
            {positions.error && !positions.data ? <ErrorBox error={positions.error} onRetry={positions.refresh} /> : null}
            <StakeForm
              key={stakeTarget ?? 'any'}
              config={positions.data?.config ?? null}
              pools={sortedPools.filter((p) => p.stakeable)}
              balance={data?.wallet.ants}
              defaultAgentId={stakeTarget}
              onStarted={() => setStakeTarget(undefined)}
              onClose={() => setStakeTarget(undefined)}
            />
          </Panel>
        ) : null}
        {!pools.data && pools.loading ? <div className="ma-muted small mb">Loading pool statistics from the explorer…</div> : null}
        {pools.data?.source === 'chain' ? (
          <div className="ma-status">
            Pool statistics are unavailable{pools.data.sourceError ? ` (${pools.data.sourceError})` : ' (no explorer configured)'}; only pools you stake in are listed, read live from the chain.
          </div>
        ) : null}
        <PoolsTable pools={sortedPools} loading={pools.loading && !pools.data} onOpen={(p) => setOpenPoolId(p.agentId)} onStake={stakeInto} />
        <div className="ma-hint">Sorted by reward per 1k power (last epoch), then by power. Click a row for the provider profile and volume history.</div>
      </Panel>

      <PositionsCard pools={sortedPools} />
      {openPool && pools.data ? <PoolDrawer pool={openPool} view={pools.data} onClose={() => setOpenPoolId(null)} onStake={stakeInto} /> : null}
    </>
  );
}

function PhaseBanner({ data, now }) {
  const { phase, epoch } = data;
  if (phase === 'legacy') {
    return (
      <Alert tone="info" title="Legacy protocol">
        The recognized-usage stack (M001) is not deployed on this chain. Pool staking, usage rewards and emissions views are unavailable.
      </Alert>
    );
  }
  if (phase === 'deployed' && epoch.effective !== null) {
    const activatesAt = epochStartAt(epoch.effective, epoch.genesis, epoch.epochDuration);
    const secondsLeft = Math.max(0, Math.floor(activatesAt - now / 1000));
    return (
      <Alert tone="warning" title="Deployed, not active yet">
        Recognized usage activates at epoch <span className="mono">{epoch.effective}</span> ({formatUtc(activatesAt)}), in <span className="mono">{formatDuration(secondsLeft)}</span>. Positions staked now become active from the effective epoch.
      </Alert>
    );
  }
  return (
    <Alert tone="success" title="Active">
      Recognized usage has been live since epoch <span className="mono">{epoch.effective ?? '—'}</span>. Rewards accrue per epoch and can be claimed after each boundary.
    </Alert>
  );
}

function StakeForm({ config, pools, balance, defaultAgentId, onStarted, onClose }) {
  const [agentId, setAgentId] = useState(() => String(defaultAgentId ?? pools[0]?.agentId ?? ''));
  const [amount, setAmount] = useState('');
  const maxEpochs = config?.maxStakeEpochs ?? 1;
  const minEpochs = Math.max(1, config?.minStakeEpochs ?? 1);
  const [epochs, setEpochs] = useState(maxEpochs);

  useEffect(() => { if (config) setEpochs(config.maxStakeEpochs); }, [config]);
  useEffect(() => { if (defaultAgentId) setAgentId(String(defaultAgentId)); }, [defaultAgentId]);
  useEffect(() => { if (!agentId && pools[0]) setAgentId(String(pools[0].agentId)); }, [agentId, pools]);

  const pool = pools.find((p) => String(p.agentId) === agentId) ?? null;
  const fillMax = () => { if (balance !== undefined) setAmount(formatAnts(balance, 18).replace(/,/g, '')); };
  const validate = () => {
    if (!pool) return 'Choose a pool.';
    if (!isPositiveDecimal(amount)) return 'Amount must be a positive decimal number of ANTS.';
    const units = parseUnits(amount, 18);
    if (balance !== undefined && units !== null) {
      let available = 0n;
      try { available = BigInt(balance); } catch { available = 0n; }
      if (units > available) return `Amount exceeds wallet balance (${formatAnts(balance, 4)} ANTS).`;
    }
    if (!config) return 'Pool configuration is still loading.';
    if (epochs < minEpochs || epochs > maxEpochs) return `Lock must be between ${minEpochs} and ${maxEpochs} epochs.`;
    return null;
  };
  const body = { agentId: Number(agentId), amount: amount.trim(), epochs };
  const noPools = pools.length === 0;

  return (
    <div className="ma-stake-form">
      {noPools ? <div className="ma-status">No stakeable pools yet. Providers must bind in the registry first.</div> : null}
      <div className="ma-form-row">
        <Field label="Pool" width="lg">
          <Select value={agentId} onChange={(e) => setAgentId(e.target.value)} disabled={noPools}>
            {noPools ? <option value="">No stakeable pools</option> : null}
            {pools.map((p) => (
              <option key={p.agentId} value={p.agentId}>{`${poolLabel(p)} / ${poolStatus(p).label}`}</option>
            ))}
          </Select>
        </Field>
        <Input
          label="Amount (ANTS)"
          hint={balance !== undefined ? <>Balance <span className="mono">{formatAnts(balance, 4)}</span>, <button type="button" className="ma-link" onClick={fillMax}>Max</button></> : undefined}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          disabled={noPools}
        />
        <LockSlider value={epochs} min={minEpochs} max={maxEpochs} onChange={setEpochs} disabled={!config || noPools} />
      </div>
      {pool && pool.stakeable && !pool.hasPool ? (
        <div className="ma-status">This pool has no power this epoch. Your stake is accepted now and takes effect at the next epoch.</div>
      ) : null}
      <div className="ma-row mt">
        <ActionButton
          label="Stake"
          variant="primary"
          title="Stake ANTS"
          path="/api/positions/stake"
          body={body}
          validate={validate}
          disabled={noPools}
          disabledReason="No stakeable pools yet."
          onStarted={onStarted}
          summary={[
            ['Pool', <span className="mono">{pool ? poolLabel(pool) : '—'}</span>],
            ['Amount', <span className="mono">{amount || '—'} ANTS</span>],
            ['Lock', <span className="mono">{epochs} epochs</span>],
            ['Activates', config ? `after ${config.stakeActivationDelay} epoch(s)` : '—'],
            ['Early exit slash', config ? `${formatBps(config.minEarlyExitSlashBps)} – ${formatBps(config.maxSlashBps)}` : '—'],
          ]}
        >
          <p className="ma-hint mt">Approves ANTS for the pool contract if needed, then stakes. The position becomes active from the next epoch.</p>
        </ActionButton>
        {onClose ? <button type="button" className="ma-link" onClick={onClose}>cancel</button> : null}
      </div>
    </div>
  );
}
