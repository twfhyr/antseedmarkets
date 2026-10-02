import React, { useEffect, useMemo, useRef } from 'react';
import { useAccount } from 'wagmi';
import { createAntsApi } from '../lib/ants/api';
import { invalidateAll, usePageData } from '../lib/ants/data';
import { formatLocalTime } from '../lib/ants/format';
import { MY_ANTSEED_TABS, myAntseedHref, useMyAntseedPageRouter } from '../hooks/useTabRouter';
import { ActionsProvider } from './my-antseed/ActionButton';
import { AntsAppProvider } from './my-antseed/app-context';
import { AddressesPage, NetworkPage } from './my-antseed/Network';
import { ProviderPage } from './my-antseed/Provider';
import { RewardsPage } from './my-antseed/Rewards';
import { StakePage } from './my-antseed/Stake';
import { ErrorBox } from './my-antseed/ui';

const OVERVIEW_POLL_MS = 60_000;

export default function MyAntseed() {
  const { address, isConnected } = useAccount();
  const api = useMemo(() => createAntsApi(isConnected ? address : undefined), [isConnected, address]);
  const addrKey = isConnected && address ? address.toLowerCase() : 'anon';
  const config = usePageData(`ants:config:${addrKey}`, api.config, Number.POSITIVE_INFINITY);
  const overviewState = usePageData(`ants:overview:${addrKey}`, api.overview);
  const prevAddr = useRef(addrKey);
  useEffect(() => {
    if (prevAddr.current === addrKey) return;
    prevAddr.current = addrKey;
    invalidateAll();
  }, [addrKey]);
  const [page, setPage] = useMyAntseedPageRouter();

  const refreshOverview = overviewState.refresh;
  useEffect(() => {
    const timer = window.setInterval(refreshOverview, OVERVIEW_POLL_MS);
    return () => window.clearInterval(timer);
  }, [refreshOverview]);

  const value = useMemo(() => ({
    api,
    config: {
      address: address || null,
      chainId: config.data?.chainId || 'base-mainnet',
      evmChainId: config.data?.evmChainId || 8453,
      readOnly: !isConnected,
    },
    overview: overviewState.data,
    overviewState,
  }), [api, address, isConnected, config.data, overviewState]);

  if (config.error && !config.data) {
    return (
      <div className="my-antseed">
        <ErrorBox error={config.error} onRetry={config.refresh} title="Could not load My Antseed" />
      </div>
    );
  }

  return (
    <AntsAppProvider value={value}>
      <ActionsProvider>
        <div className="my-antseed">
          <header className="ma-head">
            <div>
              <p className="ma-kicker">MY ANTSEED</p>
              <h1>Your stake.<em> Your account.</em></h1>
              <p className="ma-lede">
                {isConnected
                  ? 'Stake ANTS, restake rewards, and manage positions from this browser. Same protocol views as the official ants dashboard.'
                  : 'Network and pool data load without a wallet. Connect to stake, claim, and restake.'}
              </p>
            </div>
            <nav className="ma-tabs" aria-label="My Antseed">
              {MY_ANTSEED_TABS.map((tab) => (
                <a
                  key={tab.id}
                  href={myAntseedHref(tab.id)}
                  className={tab.id === page ? 'is-active' : undefined}
                  aria-current={tab.id === page ? 'page' : undefined}
                  onClick={(e) => { e.preventDefault(); setPage(tab.id); }}
                >
                  {tab.label}
                </a>
              ))}
            </nav>
          </header>
          <div className="ma-main">
            {page === 'rewards' ? <RewardsPage />
              : page === 'provider' ? <ProviderPage />
                : page === 'network' ? <NetworkPage />
                  : page === 'addresses' ? <AddressesPage />
                    : <StakePage setPage={setPage} />}
          </div>
          <footer className="ma-foot">
            <a href={myAntseedHref('network')} className={page === 'network' ? 'is-active' : undefined} onClick={(e) => { e.preventDefault(); setPage('network'); }}>Network</a>
            <a href={myAntseedHref('addresses')} className={page === 'addresses' ? 'is-active' : undefined} onClick={(e) => { e.preventDefault(); setPage('addresses'); }}>Addresses</a>
            <span className="ma-foot__updated mono">
              {overviewState.updatedAt ? `updated ${formatLocalTime(overviewState.updatedAt)}` : overviewState.loading ? 'loading…' : ''}
            </span>
          </footer>
        </div>
      </ActionsProvider>
    </AntsAppProvider>
  );
}
