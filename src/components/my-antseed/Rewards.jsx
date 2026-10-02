import React, { useEffect, useMemo, useState } from 'react';
import { cmpBig, formatAnts, isZero, sumBig, toBigInt } from '../../lib/ants/format';
import { usePageData } from '../../lib/ants/data';
import { useAntsApp, useAntsConfig } from './app-context';
import { ActionButton } from './ActionButton';
import { AddressLink, ErrorBox, Field, LockSlider, Select, Skeleton } from './ui';
import { poolLabel, sortPools } from './pools';

export function RewardsPage() {
  const { api } = useAntsApp();
  const page = usePageData('rewards', api.rewards, 5 * 60_000);
  const data = page.data;
  return (
    <>
      {page.error && !data ? <ErrorBox error={page.error} onRetry={page.refresh} /> : null}
      {page.error && data ? <div className="ma-status">Refresh failed: {page.error}</div> : null}
      {!data && page.loading ? (
        <>
          <div className="ma-muted small mb">Loading rewards…</div>
          <Skeleton rows={6} />
        </>
      ) : null}
      {data ? <RewardsBody data={data} /> : null}
    </>
  );
}

function split(data) {
  const buyerRestakable = data.buyerUsage.claimable && !isZero(data.buyerUsage.total);
  const restakable = sumBig([data.staker.total, data.sellerUsage.claimable ? data.sellerUsage.total : '0', buyerRestakable ? data.buyerUsage.total : '0']);
  const legacy = sumBig([data.legacy.seller, data.legacy.buyerClaimable ? data.legacy.buyer : '0']);
  const locked = data.locked.policy ? data.locked.claimable : '0';
  const claimOnly = sumBig([legacy, locked]);
  return { restakable, claimOnly, legacy, buyerRestakable };
}

function RewardsBody({ data }) {
  const { api } = useAntsApp();
  const { restakable, claimOnly, legacy, buyerRestakable } = split(data);
  const config = usePageData('positions:current', api.positions);
  const maxEpochs = config.data?.config?.maxStakeEpochs ?? null;
  const nothing = isZero(data.total);
  const canRestake = !isZero(restakable);

  return (
    <>
      <section className="ma-hero">
        <div className="ma-tile__label">Claimable</div>
        <div className="ma-hero__value">
          {formatAnts(data.total, 4)}
          <span className="ma-unit">ANTS</span>
        </div>
        {!nothing && !isZero(claimOnly) ? (
          <div className="ma-hero__sub">
            Restakable <span className="mono">{formatAnts(restakable, 4)}</span>, claim-only <span className="mono">{formatAnts(claimOnly, 4)}</span>
          </div>
        ) : null}
        {nothing ? (
          <div className="ma-hero__sub ma-muted">Nothing to claim yet. Rewards accrue at each epoch boundary.</div>
        ) : (
          <div className="ma-hero__actions">
            {canRestake ? <CompoundButton data={data} maxEpochs={maxEpochs} /> : null}
            <ClaimButton bucket="all" amount={data.total} label="Claim" primary={!canRestake} />
          </div>
        )}
      </section>

      {nothing ? null : (
        <section className="ma-buckets">
          <BucketRow
            visible={!isZero(data.staker.total)}
            name="Staker pool"
            note={`${data.staker.positions.length} position${data.staker.positions.length === 1 ? '' : 's'}`}
            amount={data.staker.total}
            actions={<><RestakeButton kind="staker" data={data} maxEpochs={maxEpochs} /><ClaimButton bucket="staker" amount={data.staker.total} /></>}
          />
          <BucketRow
            visible={!isZero(data.sellerUsage.total)}
            name="Provider usage"
            note={<>agent <span className="mono">{data.sellerUsage.agentId || '—'}</span>{data.sellerUsage.claimable ? null : ', not claimable from this wallet'}</>}
            amount={data.sellerUsage.total}
            actions={
              <>
                <RestakeButton kind="seller" data={data} maxEpochs={maxEpochs} />
                <ClaimButton bucket="seller" amount={data.sellerUsage.total} disabled={!data.sellerUsage.claimable} reason="Provider usage rewards are not claimable from this wallet." />
              </>
            }
          />
          <BucketRow
            visible={!isZero(data.buyerUsage.total)}
            name="Buyer usage"
            note={<BuyerNote data={data} />}
            amount={data.buyerUsage.total}
            actions={
              <>
                {buyerRestakable ? <RestakeButton kind="buyer" data={data} maxEpochs={maxEpochs} /> : null}
                <ClaimButton bucket="buyer" amount={data.buyerUsage.total} disabled={!data.buyerUsage.claimable} reason="Buyer usage rewards are claimed by the operator, not this wallet." />
              </>
            }
          />
          <BucketRow
            visible={!isZero(data.legacy.seller) || !isZero(data.legacy.buyer)}
            name="Legacy V2"
            note={
              <>
                provider <span className="mono">{formatAnts(data.legacy.seller, 4)}</span>, buyer <span className="mono">{formatAnts(data.legacy.buyer, 4)}</span>
                {data.legacy.buyerClaimable ? null : ' (buyer share claimed by operator)'}, claim only
              </>
            }
            amount={legacy}
            actions={<ClaimButton bucket="legacy" amount={legacy} />}
          />
          <BucketRow
            visible={!isZero(data.locked.claimable) || !isZero(data.locked.locked)}
            name="Locked pool"
            note={
              <>
                <span className="mono">{formatAnts(data.locked.locked, 4)}</span> locked
                {data.locked.policy ? ', claim only' : ', unlock policy (M002) not installed'}
              </>
            }
            amount={data.locked.claimable}
            actions={<ClaimButton bucket="locked" amount={data.locked.claimable} disabled={!data.locked.policy} reason="M002 (unlock policy) is not installed." />}
          />
        </section>
      )}
    </>
  );
}

function BucketRow({ visible, name, note, amount, actions }) {
  if (!visible) return null;
  return (
    <div className="ma-bucket">
      <div className="ma-bucket__main">
        <div className="ma-bucket__name">{name}</div>
        {note ? <div className="ma-bucket__note">{note}</div> : null}
      </div>
      <div className="ma-bucket__amount mono">{formatAnts(amount, 4)} <span className="ma-unit">ANTS</span></div>
      <div className="ma-bucket__actions">{actions}</div>
    </div>
  );
}

function BuyerNote({ data }) {
  const { address } = useAntsConfig();
  const b = data.buyerUsage;
  const foreignRecipient = b.recipient && address && b.recipient.toLowerCase() !== address.toLowerCase();
  if (!b.claimable) {
    return (
      <>
        belongs to the operator{b.operator ? <> <AddressLink value={b.operator} /></> : null}
        {foreignRecipient && b.recipient ? <> , recipient <AddressLink value={b.recipient} /></> : null}
      </>
    );
  }
  return (
    <>
      this wallet is the operator
      {foreignRecipient && b.recipient ? <> , recipient <AddressLink value={b.recipient} /></> : null}
    </>
  );
}

function ClaimButton({ bucket, amount, label, disabled, reason, primary }) {
  const body = { buckets: bucket === 'all' ? [] : [bucket] };
  const empty = isZero(amount);
  return (
    <ActionButton
      label={label ?? 'Claim'}
      size={bucket === 'all' ? undefined : 'sm'}
      variant={primary ? 'primary' : 'default'}
      title={bucket === 'all' ? 'Claim all rewards' : `Claim ${bucket} rewards`}
      path="/api/rewards/claim"
      body={body}
      disabled={disabled || empty}
      disabledReason={reason ?? (empty ? 'Nothing to claim.' : undefined)}
      summary={[
        ['Buckets', bucket === 'all' ? 'all claimable buckets' : bucket === 'seller' ? 'provider' : bucket],
        ['Amount', <span className="mono">{formatAnts(amount, 4)} ANTS</span>],
      ]}
    />
  );
}

function useLock(maxEpochs) {
  const [epochs, setEpochs] = useState(maxEpochs ?? 1);
  useEffect(() => { if (maxEpochs !== null) setEpochs(maxEpochs); }, [maxEpochs]);
  return { epochs, setEpochs, slider: <LockSlider value={epochs} max={maxEpochs ?? 1} onChange={setEpochs} disabled={maxEpochs === null} /> };
}

function defaultTarget(pools, providerAgentId) {
  const stakeable = pools.filter((p) => p.stakeable);
  const best = stakeable.reduce((acc, p) => (toBigInt(p.yourPower) && (!acc || cmpBig(p.yourPower, acc.yourPower) > 0) ? p : acc), null);
  if (best) return String(best.agentId);
  if (providerAgentId && stakeable.some((p) => p.agentId === providerAgentId)) return String(providerAgentId);
  return '';
}

function CompoundButton({ data, maxEpochs }) {
  const { api } = useAntsApp();
  const { epochs, slider } = useLock(maxEpochs);
  const pools = usePageData('pools', api.pools, 5 * 60_000);
  const poolList = useMemo(() => sortPools((pools.data?.pools ?? []).filter((p) => p.stakeable)), [pools.data]);
  const [target, setTarget] = useState('');
  useEffect(() => {
    if (!target && poolList.length > 0) setTarget(defaultTarget(poolList, data.sellerUsage.agentId));
  }, [target, poolList, data.sellerUsage.agentId]);
  const targetPool = poolList.find((p) => String(p.agentId) === target) ?? null;
  const body = { epochs, ...(target ? { targetAgentId: Number(target) } : {}) };
  const { restakable, buyerRestakable } = split(data);
  const parts = [];
  if (!isZero(data.staker.total)) parts.push(`staker ${formatAnts(data.staker.total, 4)}`);
  if (data.sellerUsage.claimable && !isZero(data.sellerUsage.total)) parts.push(`provider usage ${formatAnts(data.sellerUsage.total, 4)}`);
  if (buyerRestakable) parts.push(`buyer usage ${formatAnts(data.buyerUsage.total, 4)}`);

  return (
    <ActionButton
      label="Restake"
      variant="primary"
      title="Restake rewards"
      path="/api/rewards/compound"
      body={body}
      validate={() => (maxEpochs === null ? 'Pool configuration is still loading.' : null)}
      confirmDisabled={pools.data !== null && (poolList.length === 0 || !target)}
      summary={[
        ['Amount', <span className="mono">{formatAnts(restakable, 4)} ANTS</span>],
        ['Buckets', parts.join(', ') || '—'],
        ['Pool', <span className="mono">{targetPool ? poolLabel(targetPool) : pools.data ? '—' : 'loading…'}</span>],
        ['Lock', <span className="mono">{epochs} epochs</span>],
      ]}
    >
      <div className="ma-stack mt">
        {pools.data && poolList.length === 0 ? <div className="ma-status">No stakeable pools yet. Providers must bind in the registry first.</div> : null}
        <Field label="Pool" width="lg" hint={pools.loading && !pools.data ? 'scanning pools on chain…' : pools.error && !pools.data ? <span className="danger">{pools.error}</span> : undefined}>
          <Select value={target} onChange={(e) => setTarget(e.target.value)} disabled={poolList.length === 0}>
            {poolList.length === 0 ? <option value="">{pools.data ? 'No stakeable pools' : 'Loading pools…'}</option> : null}
            {poolList.map((p) => <option key={p.agentId} value={p.agentId}>{poolLabel(p)}</option>)}
          </Select>
        </Field>
        {slider}
        <p className="ma-hint">Restaked in place with the bonus, then moved to the chosen pool (effective next epoch). Legacy and locked-pool rewards can only be claimed.</p>
      </div>
    </ActionButton>
  );
}

function RestakeButton({ kind, data, maxEpochs }) {
  const { api } = useAntsApp();
  const { epochs, slider } = useLock(maxEpochs);
  const pools = usePageData(kind === 'buyer' ? 'pools' : null, api.pools, 5 * 60_000);
  const [stakeAgent, setStakeAgent] = useState(() => (data.sellerUsage.agentId ? String(data.sellerUsage.agentId) : ''));
  const poolList = pools.data?.pools ?? [];
  useEffect(() => { if (!stakeAgent && poolList[0]) setStakeAgent(String(poolList[0].agentId)); }, [stakeAgent, poolList]);
  const amount = kind === 'staker' ? data.staker.total : kind === 'seller' ? data.sellerUsage.total : data.buyerUsage.total;
  const claimable = kind === 'staker' ? true : kind === 'seller' ? data.sellerUsage.claimable : data.buyerUsage.claimable;
  const path = kind === 'staker' ? '/api/rewards/restake' : '/api/rewards/stake-usage';
  const body = kind === 'staker' ? { epochs } : { side: kind, epochs, ...(kind === 'buyer' && stakeAgent ? { stakeAgentId: Number(stakeAgent) } : {}) };
  const target = kind === 'staker' ? 'same pools' : kind === 'seller' ? `agent ${data.sellerUsage.agentId || '—'} (own pool)` : stakeAgent ? `agent ${stakeAgent}` : '—';

  return (
    <ActionButton
      label="Restake"
      size="sm"
      title={kind === 'staker' ? 'Restake staker rewards' : `Stake ${kind === 'seller' ? 'provider' : kind} usage rewards`}
      path={path}
      body={body}
      disabled={isZero(amount) || !claimable}
      disabledReason={!claimable ? `${kind === 'seller' ? 'Provider' : kind} usage rewards are not claimable from this wallet.` : 'Nothing to restake.'}
      validate={() => (maxEpochs === null ? 'Pool configuration is still loading.' : kind === 'buyer' && !stakeAgent ? 'Choose a pool to stake into.' : null)}
      summary={[
        ['Amount', <span className="mono">{formatAnts(amount, 4)} ANTS</span>],
        ['Into', <span className="mono">{target}</span>],
        ['Lock', <span className="mono">{epochs} epochs</span>],
      ]}
    >
      <div className="ma-stack mt">
        {slider}
        {kind === 'buyer' ? (
          <Field label="Pool" width="lg" hint={pools.loading && !pools.data ? 'loading pools…' : undefined}>
            <Select value={stakeAgent} onChange={(e) => setStakeAgent(e.target.value)}>
              {poolList.map((p) => <option key={p.agentId} value={p.agentId}>{poolLabel(p)}</option>)}
            </Select>
          </Field>
        ) : null}
      </div>
    </ActionButton>
  );
}
