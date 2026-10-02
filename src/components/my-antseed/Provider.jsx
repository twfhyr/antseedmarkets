import React, { useState } from 'react';
import { formatAnts, formatBps, formatInt, formatUsdc, isPositiveInt } from '../../lib/ants/format';
import { usePageData } from '../../lib/ants/data';
import { useAntsApp } from './app-context';
import { ActionButton } from './ActionButton';
import { AddressLink, Details, EpochCell, ErrorBox, Facts, Input, Panel, Pill, Skeleton, StatTile, Tiles } from './ui';

export function ProviderPage() {
  const { api } = useAntsApp();
  const page = usePageData('seller', api.seller);
  const verification = usePageData('verification:own', () => api.verification(), 5 * 60_000);
  const data = page.data;
  return (
    <>
      {page.error && !data ? <ErrorBox error={page.error} onRetry={page.refresh} /> : null}
      {page.error && data ? <div className="ma-status">Refresh failed: {page.error}</div> : null}
      {!data && page.loading ? <Skeleton rows={6} /> : null}
      {data ? <ProviderBody data={data} /> : null}

      <Panel title="Wash-trading status">
        {verification.error && !verification.data ? <ErrorBox error={verification.error} onRetry={verification.refresh} /> : null}
        {verification.data ? <OwnProviderStatus data={verification.data} /> : verification.loading ? <Skeleton rows={2} /> : null}
      </Panel>
    </>
  );
}

function YesNo({ value }) {
  if (value === null) return <span className="ma-muted">n/a</span>;
  return value ? <Pill tone="accent">yes</Pill> : <Pill tone="muted">no</Pill>;
}

function ProviderBody({ data }) {
  const starter = data.starter;
  return (
    <>
      <Tiles>
        <StatTile label="Agent id" value={data.agentId || '—'} sub={data.identityRegistered ? 'identity registered' : 'no ERC-8004 identity'} />
        <StatTile label="Eligible" value={data.eligible ? 'yes' : 'no'} sub={data.registryBound ? 'bound in provider registry' : 'not bound'} />
        <StatTile label="Pool active stake" value={formatAnts(data.poolActiveStake)} unit="ANTS" sub={data.minPoolStake !== null ? `min ${formatAnts(data.minPoolStake)} ANTS` : undefined} />
      </Tiles>

      <Panel title="Identity and registry">
        <Facts items={[
          ['ERC-8004 identity', <YesNo value={data.identityRegistered} />],
          ['Provider registry binding', <YesNo value={data.registryBound} />],
          ['Legacy stake', `${formatAnts(data.legacyStake, 4)} ANTS`],
          ['Legacy eligibility path', <YesNo value={data.legacyEligibilityEnabled} />],
        ]} />
        <div className="mt"><RegisterAction data={data} /></div>
      </Panel>

      <Panel
        title="Starter grant"
        actions={starter ? (
          starter.claimable ? <Pill tone="accent">claimable</Pill>
            : starter.expired ? <Pill tone="muted">expired</Pill>
              : starter.initialized ? <Pill tone="amber">initialized</Pill>
                : <Pill tone="muted">not initialized</Pill>
        ) : null}
      >
        {starter ? (
          <>
            <Facts items={[
              ['Remaining', `${formatAnts(starter.remaining, 4)} ANTS`],
              ['Grant amount', `${formatAnts(starter.amount, 4)} ANTS`],
              ['Claim window ends', <EpochCell epoch={starter.endEpoch} />],
              ['Legacy eligible', <YesNo value={starter.legacyEligible} />],
            ]} />
            <div className="mt">
              <ActionButton
                label="Claim starter"
                variant="primary"
                title="Claim starter grant"
                path="/api/seller/claim-starter"
                body={{}}
                disabled={!starter.claimable}
                disabledReason={starter.expired ? 'The starter grant window has expired.' : 'The starter grant is not claimable for this wallet.'}
                summary={[
                  ['Wallet', <span className="mono">{data.address}</span>],
                  ['Amount', <span className="mono">{formatAnts(starter.remaining, 4)} ANTS</span>],
                  ['Contract', <span className="mono">{starter.contract ?? '—'}</span>],
                ]}
              />
            </div>
            <Details summary="Details" className="mt">
              <Facts items={[
                ['Contract', starter.contract ? <AddressLink value={starter.contract} short={false} /> : '—'],
                ['Initialized', <YesNo value={starter.initialized} />],
                ['Expired', <YesNo value={starter.expired} />],
              ]} />
            </Details>
          </>
        ) : (
          <span className="ma-muted">No starter grant contract on this chain.</span>
        )}
      </Panel>
    </>
  );
}

function RegisterAction({ data }) {
  const [agentId, setAgentId] = useState(data.agentId > 0 ? String(data.agentId) : '');
  const body = agentId.trim() ? { agentId: Number(agentId) } : {};
  return (
    <div className="ma-form-row">
      <Input label="Agent id" hint="Required. Bind this wallet to an existing ERC-8004 identity." width="md" inputMode="numeric" value={agentId} onChange={(e) => setAgentId(e.target.value)} />
      <ActionButton
        label={data.registryBound ? 'Re-register binding' : 'Register binding'}
        variant="primary"
        title="Register provider binding"
        path="/api/seller/register"
        body={body}
        validate={() => (agentId.trim() && !isPositiveInt(agentId) ? 'Agent id must be a positive integer.' : (!agentId.trim() ? 'Agent id is required.' : null))}
        summary={[
          ['Wallet', <span className="mono">{data.address}</span>],
          ['Agent id', <span className="mono">{agentId.trim() || '—'}</span>],
          ['Currently bound', data.registryBound ? 'yes' : 'no'],
        ]}
      >
        <p className="ma-hint mt">Binds this wallet to the agent id in the provider registry.</p>
      </ActionButton>
    </div>
  );
}

function OwnProviderStatus({ data }) {
  const s = data.seller;
  if (!s) return <div className="ma-muted small">No verification record for this wallet.</div>;
  return (
    <div className="ma-stack">
      <div className="ma-row">
        {s.isProvenWashTrader ? <Pill tone="danger">flagged wash trader</Pill> : <Pill tone="accent">not flagged</Pill>}
        <span className="ma-muted small">proven share <span className={`mono ${s.isProvenWashTrader ? 'danger' : ''}`}>{formatBps(s.provenWashShareBps)}</span></span>
      </div>
      <Facts items={[
        ['Proven wash volume', `${formatUsdc(s.provenWashVolume)} USDC`],
        ['Total provider volume', `${formatUsdc(s.totalSellerVolume)} USDC`],
      ]} />
    </div>
  );
}

export function VerificationRegistry({ data }) {
  const registry = data.registry;
  return (
    <div className="ma-stack">
      {registry ? (
        <>
          <Facts items={[
            ['Registry', <AddressLink value={registry.address} />],
            ['Enforced', data.enforced ? <Pill tone="accent">enforced</Pill> : <Pill tone="muted">not enforced</Pill>],
            ['Flag threshold', `${formatBps(registry.thresholdBps)} of provider volume`],
            ['Period blocks', `${formatInt(registry.periodStartBlock)} – ${formatInt(registry.periodEndBlock)}`],
          ]} />
          <Details summary="Details">
            <Facts items={[
              ['Verifier', <AddressLink value={registry.verifier} short={false} />],
              ['Verifier hash', <span className="break mono small">{registry.verifierHash}</span>],
              ['Blockhash store', <AddressLink value={registry.blockhashStore} short={false} />],
            ]} />
            <div className="ma-hint mt">Enforced means the active points policy pins the registry, so flagged providers earn no usage points.</div>
          </Details>
        </>
      ) : (
        <span className="ma-muted">No wash-trading registry is deployed on this chain.</span>
      )}
    </div>
  );
}
