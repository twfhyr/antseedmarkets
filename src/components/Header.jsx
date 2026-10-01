import React, { useEffect, useRef, useState } from 'react';
import { Github } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { fetchProfile } from '../api';
import { tabHref } from '../hooks/useTabRouter';
import { useI18n } from '../i18n/index.jsx';
import { visiblePrimaryNav } from '../lib/nav';

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
      aria-current={activeTab === tab ? 'page' : undefined}
      onClick={(e) => { e.preventDefault(); setActiveTab(tab); }}
    >
      {children}
    </a>
  );
}

function WalletMenu({ setActiveTab }) {
  const { t } = useI18n();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <ConnectButton.Custom>
      {({ account, mounted, openAccountModal, openConnectModal }) => {
        const connected = mounted && account;
        const address = account?.address;
        return (
          <WalletMenuInner
            connected={connected}
            address={address}
            displayName={account?.displayName}
            open={open}
            setOpen={setOpen}
            profile={profile}
            setProfile={setProfile}
            rootRef={rootRef}
            openConnectModal={openConnectModal}
            openAccountModal={openAccountModal}
            disconnect={disconnect}
            setActiveTab={setActiveTab}
            t={t}
          />
        );
      }}
    </ConnectButton.Custom>
  );
}

function WalletMenuInner({
  connected, address, displayName, open, setOpen, profile, setProfile, rootRef,
  openConnectModal, openAccountModal, disconnect, setActiveTab, t,
}) {
  useEffect(() => {
    let live = true;
    if (!connected || !address) {
      setProfile(null);
      return undefined;
    }
    const load = () => {
      fetchProfile(address)
        .then((row) => {
          if (!live) return;
          setProfile(row?.exists || row?.reserved ? row : null);
        })
        .catch(() => {
          if (!live) return;
          setProfile(null);
        });
    };
    load();
    window.addEventListener('antseed:profile', load);
    return () => {
      live = false;
      window.removeEventListener('antseed:profile', load);
    };
  }, [connected, address, setProfile]);

  if (!connected) {
    return (
      <button type="button" className="wallet-chip" onClick={openConnectModal}>
        {t('providers.connectWallet')}
      </button>
    );
  }

  const label = profile?.nickname || displayName || address.slice(0, 6);
  return (
    <div className="wallet-menu" ref={rootRef}>
      <button
        type="button"
        className="wallet-chip"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" width={18} height={18} /> : null}
        <span>{label}</span>
      </button>
      {open && (
        <div className="wallet-menu__list" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setActiveTab('profile');
            }}
          >
            {t('profile.menuProfile')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              openAccountModal();
            }}
          >
            {t('profile.menuWallet')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              disconnect();
            }}
          >
            {t('profile.menuDisconnect')}
          </button>
        </div>
      )}
    </div>
  );
}

function Header({ activeTab = 'stake', setActiveTab = () => {}, uiStyle = 'v2', theme = 'editorial', setTheme = () => {} }) {
  const { t } = useI18n();
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
            {uiStyle === 'v2' ? <>antseed<span>markets</span></> : 'antseedmarkets'}
          </span>
          <div className="app-header__tagline">
            The marketplace built by ants for ants
          </div>
        </div>
      </div>

      {uiStyle === 'v2' && (
        <nav className="app-header__nav" aria-label="Primary navigation">
          {visiblePrimaryNav().map(({ tab }) => (
            <HeaderNavLink key={tab} tab={tab} activeTab={activeTab} setActiveTab={setActiveTab}>
              {t(`nav.${tab}`)}
            </HeaderNavLink>
          ))}
        </nav>
      )}

      <div className="app-header__actions">
        <div className="design-theme-switch" role="group" aria-label="Theme">
          <span>Theme</span>
          <div>
            <button type="button" aria-pressed={theme === 'editorial'} onClick={() => setTheme('editorial')}>Editorial</button>
            <button type="button" aria-pressed={theme === 'terminal'} onClick={() => setTheme('terminal')}>Terminal</button>
          </div>
        </div>
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
        <WalletMenu setActiveTab={setActiveTab} />
      </div>
    </header>
  );
}

export default Header;
