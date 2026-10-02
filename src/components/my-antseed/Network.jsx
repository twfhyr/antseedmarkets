import React, { useState } from 'react';
import { epochStartAt, formatAnts, formatDuration, formatEpochLength, formatInt, formatShare, formatUtc } from '../../lib/ants/format';
import { usePageData } from '../../lib/ants/data';
import { useAntsApp } from './app-context';
import { AddressLink, Details, EpochCell, ErrorBox, Facts, Panel, Pill, Select, Skeleton, StatTile, Table, Tiles, useNow } from './ui';
import { VerificationRegistry } from './Provider';

export function NetworkPage() {
  const { api, overview, overviewState } = useAntsApp();
  const verification = usePageData('verification:own', () => api.verification(), 5 * 60_000);
  const now = useNow(1000);
  const data = overview;
  return (
    <>
      <h1 className="ma-page-title">Network</h1>
      {overviewState.error && !data ? <ErrorBox error={overviewState.error} onRetry={overviewState.refresh} /> : null}
      {!data && overviewState.loading ? <Skeleton rows={4} /> : null}
      {data ? <EpochSection data={data} fetchedAt={overviewState.updatedAt} now={now} /> : null}
      <EmissionsSection />
      <UsageSection />
      <Panel className="ma-panel-collapsible">
        <Details summary="Verification registry">
          {verification.error && !verification.data ? <ErrorBox error={verification.error} onRetry={verification.refresh} /> : null}
          {!verification.data && verification.loading ? <Skeleton rows={3} /> : null}
          {verification.data ? <VerificationRegistry data={verification.data} /> : null}
        </Details>
      </Panel>
    </>
  );
}

function EpochSection({ data, fetchedAt, now }) {
  const { epoch, network } = data;
  const boundaryAt = fetchedAt !== null ? fetchedAt + epoch.secondsToBoundary * 1000 : epoch.nextBoundaryAt * 1000;
  const secondsLeft = Math.max(0, Math.floor((boundaryAt - now) / 1000));
  return (
    <>
      <Tiles>
        <StatTile label="Current epoch" value={epoch.current} sub={formatUtc(epochStartAt(epoch.current, epoch.genesis, epoch.epochDuration))} />
        <StatTile label="Next boundary in" value={formatDuration(secondsLeft)} />
        <StatTile label="Effective epoch" value={epoch.effective ?? '—'} sub={epoch.effective !== null ? formatUtc(epochStartAt(epoch.effective, epoch.genesis, epoch.epochDuration)) : 'not deployed'} />
      </Tiles>
      <Panel title="Network">
        {network ? (
          <Facts items={[
            ['Total active stake', `${formatAnts(network.totalActiveStake)} ANTS`],
            ['Epoch emission', `${formatAnts(network.epochEmission)} ANTS`],
            ['Budgets this epoch', `staker ${formatAnts(network.stakerBudget)}, buyer ${formatAnts(network.usageBuyerBudget)}, provider ${formatAnts(network.usageSellerBudget)} ANTS`],
            ['ANTS supply', `${formatAnts(network.antsTotalSupply, 0)} of ${formatAnts(network.antsMaxSupply, 0)} ANTS`],
          ]} />
        ) : (
          <span className="ma-muted">Network figures are not available before the recognized-usage stack is deployed.</span>
        )}
        <Details summary="Details" className="mt">
          <Facts items={[
            ['Epoch length', formatDuration(epoch.epochDuration)],
            ['Genesis', formatUtc(epoch.genesis)],
            ['Total power weight', network ? formatAnts(network.totalPowerWeight) : '—'],
          ]} />
        </Details>
      </Panel>
    </>
  );
}

function EmissionsSection() {
  const { api } = useAntsApp();
  const page = usePageData('emissions', api.emissions, 5 * 60_000);
  const data = page.data;
  return (
    <>
      {page.error && !data ? <ErrorBox error={page.error} onRetry={page.refresh} /> : null}
      {page.error && data ? <div className="ma-status">Refresh failed: {page.error}</div> : null}
      {!data && page.loading ? <Skeleton rows={5} /> : null}
      {data ? <EmissionsBody data={data} /> : null}
    </>
  );
}

function EmissionsBody({ data }) {
  const rate = data.currentRate;
  const perEpoch = (() => {
    try { return (BigInt(rate) * BigInt(data.epochDuration)).toString(); } catch { return null; }
  })();
  const denominator = data.shareDenominator;
  const minterColumns = [
    { key: 'name', label: 'Bucket', render: (m) => m.name },
    { key: 'share', label: 'Share', align: 'right', mono: true, render: (m) => formatShare(m.shareBps, denominator) },
    { key: 'budget', label: 'This-epoch budget', align: 'right', mono: true, render: (m) => formatAnts(m.epochBudget) },
    { key: 'editable', label: 'Editable', render: (m) => (m.editable ? <Pill tone="accent">yes</Pill> : <Pill tone="muted">fixed</Pill>) },
  ];
  return (
    <Panel title="Emissions">
      <Facts items={[
        ['Current rate', `${formatAnts(data.currentRate, 6)} ANTS / s${perEpoch ? ` (≈ ${formatAnts(perEpoch)} ANTS / epoch)` : ''}`],
        ['Initial emission', `${formatAnts(data.initialEmission)} ANTS / epoch`],
        ['Halving interval', `${formatInt(data.halvingInterval)} epochs`],
        [`Cumulative through epoch ${data.currentEpoch}`, `${formatAnts(data.cumulativeThroughCurrent, 0)} ANTS`],
      ]} />
      <div className="ma-section-label mt">Minters</div>
      <Table columns={minterColumns} rows={data.minters} rowKey={(m) => m.id} empty="No minters registered on the emissions gate." />
      <Details summary="Details">
        <Facts items={[
          ['Genesis', formatUtc(data.genesis)],
          ['Epoch length', `${formatEpochLength(data.epochDuration)} (${formatInt(data.epochDuration)} s)`],
          ['Share denominator', formatInt(data.shareDenominator)],
          ['Emissions reserve', data.emissionsReserve ? <AddressLink value={data.emissionsReserve} short={false} /> : '—'],
          ['Legacy escrow', data.legacyEscrow ? <AddressLink value={data.legacyEscrow} short={false} /> : '—'],
        ]} />
        {data.legacy ? (
          <>
            <div className="ma-section-label mt">Legacy V2 emissions</div>
            <Facts items={[
              ['Contract', <AddressLink value={data.legacy.contract} short={false} />],
              ['Split', `provider ${data.legacy.sellerPct}%, buyer ${data.legacy.buyerPct}%, reserve ${data.legacy.reservePct}%, team ${data.legacy.teamPct}%`],
              ['Legacy epoch', formatInt(data.legacy.currentEpoch)],
            ]} />
          </>
        ) : null}
        <div className="ma-hint mt">Shares are fractions of the epoch emission (denominator {formatInt(denominator)}). Editable buckets can be re-weighted by their controller.</div>
      </Details>
    </Panel>
  );
}

function UsageSection() {
  const { api, overview } = useAntsApp();
  const [epochs, setEpochs] = useState(8);
  const [weighted, setWeighted] = useState(false);
  const page = usePageData(`usage:${epochs}`, () => api.usage(epochs));
  const data = page.data;
  const columns = [
    { key: 'epoch', label: 'Epoch', render: (r) => <EpochCell epoch={r.epoch} /> },
    { key: 'buyer', label: 'Your buyer pts', align: 'right', mono: true, render: (r) => formatInt(r.buyerPoints) },
    ...(weighted ? [{ key: 'wbuyer', label: 'Weighted', align: 'right', mono: true, render: (r) => formatInt(r.weightedBuyerPoints) }] : []),
    { key: 'seller', label: 'Your provider pts', align: 'right', mono: true, render: (r) => formatInt(r.sellerPoints) },
    { key: 'nbuyer', label: 'Network buyer', align: 'right', mono: true, render: (r) => formatInt(r.totalBuyerPoints) },
    { key: 'nseller', label: 'Network provider', align: 'right', mono: true, render: (r) => formatInt(r.totalSellerPoints) },
    { key: 'pool', label: 'Pool pts', align: 'right', mono: true, render: (r) => formatInt(r.totalPoolPoints) },
    ...(weighted ? [{ key: 'wpool', label: 'Weighted pool pts', align: 'right', mono: true, render: (r) => formatInt(r.totalWeightedPoolPoints) }] : []),
  ];
  const startEpoch = data?.firstRewardedEpoch ?? overview?.epoch.effective ?? null;
  const emptyText = startEpoch !== null && (data ? data.currentEpoch < startEpoch : true)
    ? `Usage accounting starts at epoch ${startEpoch}.`
    : 'No usage has been recorded for this wallet in the selected epochs.';

  return (
    <Panel
      title="Usage"
      actions={
        <>
          <label className="ma-check small">
            <input type="checkbox" checked={weighted} onChange={(e) => setWeighted(e.target.checked)} />
            weighted columns
          </label>
          <label className="ma-row small">
            <span className="ma-muted">epochs</span>
            <Select value={epochs} onChange={(e) => setEpochs(Number(e.target.value))} style={{ width: 72, minHeight: 30, padding: '4px 8px' }}>
              {[4, 8, 12, 26, 52].map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </label>
        </>
      }
    >
      {page.error && !data ? <ErrorBox error={page.error} onRetry={page.refresh} /> : null}
      {page.error && data ? <div className="ma-status">Refresh failed: {page.error}</div> : null}
      <Facts items={[
        ['Your buyer points', data ? formatInt(data.totals.buyerPoints) : '…'],
        ['Network buyer points', data ? formatInt(data.totals.networkBuyerPoints) : '…'],
        ['Network provider points', data ? formatInt(data.totals.networkSellerPoints) : '…'],
        ['First rewarded epoch', data ? (data.firstRewardedEpoch ?? '—') : '…'],
      ]} />
      <div className="mt">
        <Table columns={columns} rows={data?.epochs ?? []} rowKey={(r) => r.epoch} loading={page.loading && !data} empty={emptyText} />
      </div>
    </Panel>
  );
}

export function AddressesPage() {
  const { config, overview, overviewState } = useAntsApp();
  const data = overview;
  const rows = Object.entries(data?.addresses ?? {})
    .map(([name, address]) => ({ name, address }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <h1 className="ma-page-title">Addresses</h1>
      {overviewState.error && !data ? <ErrorBox error={overviewState.error} onRetry={overviewState.refresh} /> : null}
      <Panel title="Environment">
        <Facts items={[
          ['Chain', <span>{config.chainId}</span>],
          ['EVM chain id', config.evmChainId],
          ['RPC URL', data ? <span className="break">{data.rpcUrl}</span> : '…'],
          ['Wallet', config.address ? <AddressLink value={config.address} short={false} copy /> : 'not connected'],
          ['Mode', config.address ? 'signing in the browser' : 'read-only until a wallet connects'],
        ]} />
      </Panel>
      <Panel title="Protocol contracts">
        <Table
          columns={[
            { key: 'name', label: 'Contract', render: (r) => r.name },
            { key: 'address', label: 'Address', render: (r) => <AddressLink value={r.address} short={false} copy /> },
          ]}
          rows={rows}
          rowKey={(r) => r.name}
          loading={overviewState.loading && !data}
          empty="No contract addresses are configured for this chain."
        />
      </Panel>
    </>
  );
}
