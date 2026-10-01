import React from 'react';
import StakeANTS from './components/StakeANTS';
import StakingDesk from './components/StakingDesk';
import Portfolio from './components/Portfolio';
import Rewards from './components/Rewards';
import Providers from './components/Providers';
import Discovery from './components/Discovery';
import Leaderboard from './components/Leaderboard';
import Profile from './components/Profile';
import Header from './components/Header';
import { useI18n } from './i18n/index.jsx';
import { useTabRouter, tabHref } from './hooks/useTabRouter';
import { useBuildFreshness } from './hooks/useBuildFreshness';
import { visiblePrimaryNav } from './lib/nav';

import { useTheme } from './theme.jsx';

function AntseedV2Announcement() {
  return (
    <div className="v2-announcement">
      A different kind of market. Built by ants, for ants.
      <span>lANTS marketplace · Base network</span>
    </div>
  );
}

// antseedmarkets.com: a standalone, product-only site for trading lANTS
// (locked ANTS position NFTs) -- split out of antseed-zh's monorepo
// 2026-09-24 so this domain's identity, preview, and codebase are its own
// rather than a build variant of the company dashboard. See README.md.
// Primary tabs come from visiblePrimaryNav() (Stake, then Marketplace).
// Hidden routes still render so /providers and the rest keep working.
function App() {
  const { t } = useI18n();
  const primaryNav = visiblePrimaryNav();
  // Auto-reloads this tab when a newer build is live (checked on tab
  // refocus + a 5min fallback) -- see src/hooks/useBuildFreshness.js.
  useBuildFreshness();
  // URL-driven instead of plain useState: gives both sections a shareable,
  // bookmarkable link and makes browser back/forward switch between them.
  const [activeTab, setActiveTab] = useTabRouter();
  // Keep the existing v2 components and handlers mounted when switching themes.
  const uiStyle = 'v2';
  const { theme, setTheme } = useTheme();

  return (
    <div className="dashboard" data-ui-style={uiStyle} data-theme={theme}>
      {uiStyle === 'v2' && <AntseedV2Announcement />}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        uiStyle={uiStyle}
        theme={theme}
        setTheme={setTheme}
      />
      <main className="container app-main" style={{ paddingTop: '1.5rem' }}>
        <div className="tabs app-tabs">
          {primaryNav.map(({ tab }) => (
            <a
              key={tab}
              href={tabHref(tab)}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); setActiveTab(tab); }}
            >
              {t(`nav.${tab}`)}
            </a>
          ))}
        </div>

        {activeTab === 'stake' && <StakingDesk />}
        {activeTab === 'market' && <StakeANTS uiStyle={uiStyle} />}
        {activeTab === 'providers' && <Providers />}
        {activeTab === 'discovery' && <Discovery />}
        {activeTab === 'leaderboard' && <Leaderboard />}
        {activeTab === 'portfolio' && <Portfolio />}
        {activeTab === 'rewards' && <Rewards />}
        {activeTab === 'profile' && <Profile />}
      </main>
      <footer className="design-footer wrap">
        <a href={tabHref('stake')} onClick={(e) => { e.preventDefault(); setActiveTab('stake'); }}>antseed<span>markets</span></a>
        <p>Built by ants, for ants.</p>
        <span>LOCKED POSITIONS. OPEN POSSIBILITIES.</span>
      </footer>
    </div>
  );
}

export default App;
