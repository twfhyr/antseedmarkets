import React from 'react';
import StakeANTS from './components/StakeANTS';
import Portfolio from './components/Portfolio';
import Header from './components/Header';
import { useI18n } from './i18n/index.jsx';
import { useTabRouter, tabHref } from './hooks/useTabRouter';
import { useBuildFreshness } from './hooks/useBuildFreshness';

// antseedmarkets.com: a standalone, product-only site for trading lANTS
// (locked ANTS position NFTs) -- split out of antseed-zh's monorepo
// 2026-09-24 so this domain's identity, preview, and codebase are its own
// rather than a build variant of the company dashboard. See README.md.
// Only two sections exist here, ever -- no nav-gating flag needed the way
// antseed-zh.com's build variant used IS_MARKET_VARIANT.
function App() {
  const { t } = useI18n();
  // Auto-reloads this tab when a newer build is live (checked on tab
  // refocus + a 5min fallback) -- see src/hooks/useBuildFreshness.js.
  useBuildFreshness();
  // URL-driven instead of plain useState: gives both sections a shareable,
  // bookmarkable link and makes browser back/forward switch between them.
  const [activeTab, setActiveTab] = useTabRouter();

  return (
    <div className="dashboard">
      <Header />
      <main className="container" style={{ paddingTop: '1.5rem' }}>
        <div className="tabs">
          <a
            href={tabHref('stake')}
            className={`tab ${activeTab === 'stake' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('stake'); }}
          >
            {t('nav.stake')}
          </a>
          <a
            href={tabHref('portfolio')}
            className={`tab ${activeTab === 'portfolio' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('portfolio'); }}
          >
            {t('nav.portfolio')}
          </a>
        </div>

        {activeTab === 'stake' && <StakeANTS />}
        {activeTab === 'portfolio' && <Portfolio />}
      </main>
    </div>
  );
}

export default App;
