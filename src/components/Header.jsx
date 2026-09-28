import React from 'react';
import { Github } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { tabHref } from '../hooks/useTabRouter';

function AntLogo() {
  return (
    <svg viewBox="0 0 40 46" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 14L10 5M23 14l7-9M15 23L4 17M25 23l11-6M15 28H3M25 28h12M16 32L7 43M24 32l9 11" />
        <ellipse cx="20" cy="17" rx="5" ry="6" fill="currentColor" />
        <ellipse cx="20" cy="27" rx="4" ry="5" fill="currentColor" />
        <ellipse cx="20" cy="37" rx="6" ry="7" fill="currentColor" />
      </g>
    </svg>
  );
}

function HeaderNavLink({ tab, activeTab, setActiveTab, children }) {
  return (
    <a
      href={tabHref(tab)}
      className={activeTab === tab ? 'active' : ''}
      onClick={(e) => { e.preventDefault(); setActiveTab(tab); }}
    >
      {children}
    </a>
  );
}

// English-only, plain strings -- no useI18n() here, this component isn't
// shared with antseed-zh any more (see src/i18n/index.jsx's comment for
// why the lookup layer still exists elsewhere in this repo).
function Header({ activeTab = 'stake', setActiveTab = () => {}, uiStyle = 'classical', setUiStyle = () => {} }) {
  const nextStyle = uiStyle === 'v2' ? 'classical' : 'v2';
  return (
    <header className="app-header">
      <div className="app-header__brand">
        {uiStyle === 'v2' ? (
          <span className="app-header__logo-v2"><AntLogo /></span>
        ) : (
          <img
            className="app-header__logo-img"
            src={`${import.meta.env.BASE_URL}antseedmarkets-icon.svg`}
            alt="antseedmarkets"
            width={28}
            height={28}
          />
        )}
        <div>
          <span className="app-header__title">
            {uiStyle === 'v2' ? <>antseed<span>markets</span><b>®</b></> : 'antseedmarkets'}
          </span>
          <div className="app-header__tagline">
            The marketplace built by ants for ants
          </div>
        </div>
      </div>

      {uiStyle === 'v2' && (
        <nav className="app-header__nav" aria-label="Primary navigation">
          <HeaderNavLink tab="stake" activeTab={activeTab} setActiveTab={setActiveTab}>Marketplace</HeaderNavLink>
          <HeaderNavLink tab="portfolio" activeTab={activeTab} setActiveTab={setActiveTab}>Portfolio</HeaderNavLink>
          <HeaderNavLink tab="rewards" activeTab={activeTab} setActiveTab={setActiveTab}>Rewards</HeaderNavLink>
        </nav>
      )}

      <div className="app-header__actions">
        <button
          type="button"
          className="style-toggle"
          onClick={() => setUiStyle(nextStyle)}
          aria-label={`Switch to ${nextStyle === 'classical' ? 'classical' : 'v2'} style`}
        >
          {nextStyle === 'classical' ? 'Classical style' : 'V2 style'}
        </button>
        <a
          href="https://t.me/antseed"
          target="_blank"
          rel="noopener noreferrer"
          className="deposit-btn"
          title="AntSeed on Telegram"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
        </a>
        <a
          href="https://github.com/twfhyr/antseedmarkets"
          target="_blank"
          rel="noopener noreferrer"
          className="deposit-btn"
          title="View source on GitHub"
        >
          <Github size={16} />
        </a>
        <ConnectButton showBalance={false} chainStatus="none" accountStatus="address" />
      </div>
    </header>
  );
}

export default Header;
