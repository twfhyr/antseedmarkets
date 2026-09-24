import React from 'react';
import { Github } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// English-only, plain strings -- no useI18n() here, this component isn't
// shared with antseed-zh any more (see src/i18n/index.jsx's comment for
// why the lookup layer still exists elsewhere in this repo).
function Header() {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <img
          className="app-header__logo-img"
          src={`${import.meta.env.BASE_URL}antseedmarkets-icon.svg`}
          alt="antseedmarkets"
          width={28}
          height={28}
        />
        <div>
          <span className="app-header__title">antseedmarkets</span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.2 }}>
            The marketplace built by ants for ants
          </div>
        </div>
      </div>

      <div className="app-header__actions">
        <a
          href="https://github.com/twfhyr/antseedmarkets"
          target="_blank"
          rel="noopener noreferrer"
          className="deposit-btn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', textDecoration: 'none' }}
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
