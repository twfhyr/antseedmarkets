import React, { useEffect, useMemo, useState } from 'react';
import { cmpBig, formatAnts, formatBps, formatInt, formatUsdcCompact, shortAddress, toBigInt } from '../../lib/ants/format';
import { AddressLink, Button, Facts, Input, Pill, Table } from './ui';

export function poolName(pool) {
  if (pool.profile?.name) return pool.profile.name;
  if (pool.seller) return shortAddress(pool.seller);
  return `Agent ${pool.agentId}`;
}

export function poolLabel(pool) {
  return `${poolName(pool)} / agent ${pool.agentId}`;
}

export function poolStatus(pool) {
  if (!pool.stakeable) return { label: 'not stakeable', tone: 'muted', title: 'No provider binding the pool contract accepts; a stake would revert.' };
  if (pool.hasPool) return { label: 'has power', tone: 'accent', title: 'Pool has power this epoch; staking earns rewards from your first active epoch.' };
  return { label: 'no power yet', tone: 'amber', title: 'Registered provider, but the pool has no power this epoch; stakes are accepted now and take effect at the next epoch.' };
}

export const POOL_ROW_CAP = 20;

export function sortPools(pools) {
  return [...pools].sort((a, b) => {
    if (a.stakeable !== b.stakeable) return a.stakeable ? -1 : 1;
    const ra = a.lastEpochRewardPer1kPower;
    const rb = b.lastEpochRewardPer1kPower;
    if (ra !== null && rb !== null) {
      const c = cmpBig(rb, ra);
      if (c !== 0) return c;
    } else if (ra !== null) return -1;
    else if (rb !== null) return 1;
    const byPower = cmpBig(b.weight, a.weight);
    if (byPower !== 0) return byPower;
    return cmpBig(b.volumes[0]?.usdc ?? '0', a.volumes[0]?.usdc ?? '0');
  });
}

function matchesFilter(pool, needle) {
  if (!needle) return true;
  const q = needle.toLowerCase();
  return String(pool.agentId) === needle || (pool.profile?.name ?? '').toLowerCase().includes(q) || (pool.seller ?? '').toLowerCase().includes(q);
}

export function PoolsTable({ pools, loading, onOpen, onStake }) {
  const [filter, setFilter] = useState('');
  const [showAll, setShowAll] = useState(false);
  const needle = filter.trim();
  const filtered = useMemo(() => pools.filter((p) => matchesFilter(p, needle)), [pools, needle]);
  const capped = !showAll && filtered.length > POOL_ROW_CAP;
  const visible = capped ? filtered.slice(0, POOL_ROW_CAP) : filtered;
  const columns = [
    {
      key: 'pool',
      label: 'Pool',
      render: (p) => (
        <span className="ma-cell-stack">
          <span>{poolName(p)}</span>
          <span className="ma-cell-sub mono">
            agent {p.agentId}
            {p.profile?.name && p.seller ? ` / ${shortAddress(p.seller)}` : ''}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      title: 'Whether staking into this pool is live now',
      render: (p) => {
        const s = poolStatus(p);
        return <Pill tone={s.tone} title={s.title}>{s.label}</Pill>;
      },
    },
    {
      key: 'power',
      label: 'Power',
      align: 'right',
      mono: true,
      render: (p) => (
        <span className="ma-cell-stack">
          <span>{formatAnts(p.weight)}</span>
          <span className="ma-cell-sub">{formatBps(p.powerShareBps)} of network</span>
        </span>
      ),
    },
    {
      key: 'volume',
      label: 'Volume',
      align: 'right',
      mono: true,
      render: (p) => {
        const [current, last] = p.volumes || [];
        return (
          <span className="ma-cell-stack">
            <span>{current ? formatUsdcCompact(current.usdc) : <span className="dim">—</span>}</span>
            <span className="ma-cell-sub">{last ? `last ${formatUsdcCompact(last.usdc)}` : '—'}</span>
          </span>
        );
      },
    },
    {
      key: 'reward',
      label: 'Reward / 1k power',
      align: 'right',
      mono: true,
      render: (p) => {
        const last = p.lastEpochRewardPer1kPower;
        const proj = p.projectedRewardPer1kPower;
        return (
          <span className="ma-cell-stack">
            <span>{last !== null ? <>{formatAnts(last, 4)}{p.lastEpochEmissionSettled ? null : <span className="dim"> est.</span>}</> : <span className="dim">—</span>}</span>
            {proj !== null ? <span className="ma-cell-sub">proj. {formatAnts(proj, 4)}</span> : null}
          </span>
        );
      },
    },
    {
      key: 'yours',
      label: 'Your power',
      align: 'right',
      mono: true,
      render: (p) => toBigInt(p.yourPower) ? (
        <span className="ma-cell-stack">
          <span>{formatAnts(p.yourPower)}</span>
          <span className="ma-cell-sub">{formatBps(p.yourPoolShareBps)} of pool</span>
        </span>
      ) : <span className="dim">—</span>,
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      className: 'col-actions',
      render: (p) => p.stakeable ? (
        <span onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={() => onStake(p)}>Stake</Button>
        </span>
      ) : null,
    },
  ];

  return (
    <>
      {pools.length > 5 ? (
        <div className="ma-pools-toolbar">
          <Input label="" width="md" placeholder="Filter by name or agent id" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter pools" />
          <span className="ma-muted small">
            {formatInt(filtered.length)} of {formatInt(pools.length)} providers, {formatInt(pools.filter((p) => p.stakeable).length)} stakeable, {formatInt(pools.filter((p) => p.stakeable && p.hasPool).length)} with power
          </span>
        </div>
      ) : null}
      <Table
        columns={columns}
        rows={visible}
        rowKey={(p) => p.agentId}
        loading={loading}
        onRowClick={onOpen}
        rowClass={(p) => (!p.stakeable ? 'row-muted' : undefined)}
        empty={needle ? `No provider matches "${needle}".` : 'No pools have been staked yet.'}
      />
      {filtered.length > POOL_ROW_CAP ? (
        <div className="ma-pools-more">
          <span className="ma-muted small">Showing {formatInt(visible.length)} of {formatInt(filtered.length)}</span>
          <button type="button" className="ma-link" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show fewer' : 'Show all'}</button>
        </div>
      ) : null}
    </>
  );
}

export function PoolDrawer({ pool, view, onClose, onStake }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const profile = pool.profile;
  const explorerUrl = view.explorer && pool.seller ? `${view.explorer.replace(/\/$/, '')}/sellers/${pool.seller}` : null;
  const status = poolStatus(pool);

  return (
    <>
      <div className="ma-drawer-backdrop" onClick={onClose} />
      <aside className="ma-drawer" role="dialog" aria-modal="true" aria-label={`Pool ${poolName(pool)}`}>
        <header className="ma-drawer__head">
          <div>
            <h2>{poolName(pool)}</h2>
            <div className="ma-muted small">
              agent <span className="mono">{pool.agentId}</span>
              {pool.seller ? <> / <AddressLink value={pool.seller} copy /></> : ' / no provider bound'}
              {explorerUrl ? <> / <a href={explorerUrl} target="_blank" rel="noreferrer">explorer</a></> : null}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </header>
        <div className="ma-drawer__body">
          <div className="ma-row">
            <Pill tone={status.tone} title={status.title}>{pool.stakeable ? `stakeable, ${status.label}` : status.label}</Pill>
            {pool.stakeable ? <Button variant="primary" size="sm" onClick={() => onStake(pool)}>Stake into this pool</Button> : null}
          </div>
          {pool.stakeable && !pool.hasPool ? (
            <div className="ma-status">This pool has no power this epoch. Stakes are accepted now and take effect at the next epoch.</div>
          ) : null}
          <h3 className="ma-section-label">Pool</h3>
          <Facts items={[
            ['Power', `${formatAnts(pool.weight)} (${formatBps(pool.powerShareBps)} of network)`],
            ['Active stake', `${formatAnts(pool.activeStake, 4)} ANTS`],
            ['Security share', formatBps(pool.securityShareBps)],
            ['Reward / 1k power (last)', pool.lastEpochRewardPer1kPower !== null ? `${formatAnts(pool.lastEpochRewardPer1kPower, 4)} ANTS${pool.lastEpochEmissionSettled ? '' : ' (estimated until settled)'}` : '—'],
            ['Reward / 1k power (proj.)', pool.projectedRewardPer1kPower !== null ? `${formatAnts(pool.projectedRewardPer1kPower, 4)} ANTS` : '—'],
            ['Usage points (this / last)', `${formatInt(pool.usagePoints)} / ${formatInt(pool.lastEpochUsagePoints)}`],
            ['Last epoch emission', pool.lastEpochEmission !== null ? `${formatAnts(pool.lastEpochEmission, 4)} ANTS` : '—'],
          ]} />
          {profile ? (
            <>
              <h3 className="ma-section-label">Provider</h3>
              <Facts items={[
                ['Name', profile.name || '—'],
                ['Models served', profile.modelsServed ?? '—'],
                ['Unique buyers', profile.uniqueBuyers ?? '—'],
                ['Lifetime volume', profile.lifetimeVolumeUsdc != null ? formatUsdcCompact(profile.lifetimeVolumeUsdc) : '—'],
              ]} />
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}
