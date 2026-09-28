import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Search, Loader2, Wallet, ExternalLink, AlertCircle } from 'lucide-react';
import { fetchBuyerActivity, fetchSellerActivity, fetchLantsMarket } from '../api';
import { isProviderActivationStake } from '../lib/listLants';
import { useI18n } from '../i18n/index.jsx';
import { marketTabHref } from '../hooks/useTabRouter';
import PageIntro from './PageIntro';

function short(addr) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function usd(v) {
  if (v == null) return '—';
  return `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function num(v) {
  if (v == null) return '—';
  return Number(v).toLocaleString();
}

function fmtDate(unixSeconds) {
  if (!unixSeconds) return '—';
  return new Date(Number(unixSeconds) * 1000).toISOString().split('T')[0];
}

function formatAnts(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function Row({ label, value }) {
  return (
    <div className="design-data-row">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="design-section-card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

/**
 * Buyer-side activity for one address -- same Antscan-synced data
 * (buyers_onchain table) as the Buyers tab's own detail modal
 * (BuyersList.jsx's BuyerActivityModal), just self-scoped here instead of
 * a click-through. Never fabricated: a field Antscan hasn't populated
 * shows as "—", and no indexed activity at all shows the empty message.
 */
function BuyerSection({ address, t }) {
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    fetchBuyerActivity(address)
      .then((row) => { if (!cancelled) setData(row); })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [address]);

  return (
    <SectionCard title={t('portfolio.buyerSection')}>
      {loading ? (
        <div className="empty-state">{t('common.loading')}</div>
      ) : notFound ? (
        <div className="empty-state">{t('portfolio.noBuyerActivity')}</div>
      ) : (
        <>
          <Row label={t('table.spentUsdc')} value={usd(data.spent_usdc != null ? Number(data.spent_usdc) / 1e6 : null)} />
          <Row label={t('table.deposited')} value={usd(data.deposited_usdc != null ? Number(data.deposited_usdc) / 1e6 : null)} />
          <Row label={t('buyerActivity.withdrawnUsdc')} value={usd(data.withdrawn_usdc != null ? Number(data.withdrawn_usdc) / 1e6 : null)} />
          <Row label={t('table.requests')} value={num(data.request_count)} />
          <Row label={t('buyerActivity.inputTokens')} value={num(data.input_tokens)} />
          <Row label={t('buyerActivity.outputTokens')} value={num(data.output_tokens)} />
          <Row label={t('buyerActivity.channels')} value={num(data.channel_count)} />
          <Row label={t('buyerActivity.uniqueSellers')} value={num(data.unique_sellers)} />
          <Row label={t('table.firstSeen')} value={fmtDate(data.first_seen_at)} />
          <Row label={t('table.lastSeen')} value={fmtDate(data.last_seen_at)} />
        </>
      )}
    </SectionCard>
  );
}

/** Seller-side mirror of BuyerSection -- sellers_onchain table via the new
 *  /api/history/seller/:address route (added alongside this tab). */
function SellerSection({ address, t }) {
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    fetchSellerActivity(address)
      .then((row) => { if (!cancelled) setData(row); })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [address]);

  return (
    <SectionCard title={t('portfolio.sellerSection')}>
      {loading ? (
        <div className="empty-state">{t('common.loading')}</div>
      ) : notFound ? (
        <div className="empty-state">{t('portfolio.noSellerActivity')}</div>
      ) : (
        <>
          {data.agent_id != null && <Row label={t('portfolio.agentId')} value={`#${data.agent_id}`} />}
          <Row label={t('portfolio.earnedUsdc')} value={usd(data.earned_usdc != null ? Number(data.earned_usdc) / 1e6 : null)} />
          <Row label={t('portfolio.stakedUsdc')} value={usd(data.stake_usdc != null ? Number(data.stake_usdc) / 1e6 : null)} />
          <Row label={t('table.requests')} value={num(data.request_count)} />
          <Row label={t('buyerActivity.inputTokens')} value={num(data.input_tokens)} />
          <Row label={t('buyerActivity.outputTokens')} value={num(data.output_tokens)} />
          <Row label={t('portfolio.uniqueBuyers')} value={num(data.unique_buyers)} />
          <Row label={t('buyerActivity.channels')} value={num(data.channel_count)} />
          <Row label={t('table.firstSeen')} value={fmtDate(data.first_seen_at)} />
          <Row label={t('table.lastSeen')} value={fmtDate(data.last_seen_at)} />
        </>
      )}
    </SectionCard>
  );
}

/** lANTS holdings -- same positions the lANTS tab's Mine sub-tab lists
 *  (fetchLantsMarket({owner})), shown here as a read-only summary. Actual
 *  management (list/split/merge/move) stays on the lANTS tab; this links
 *  there rather than duplicating that UI. */
function LantsSection({ address, t }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchLantsMarket({ owner: address, pageSize: 100 })
      .then((data) => { if (!cancelled) setItems(data?.items || []); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [address]);

  const total = items.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <SectionCard title={t('portfolio.lantsSection')}>
      {loading ? (
        <div className="empty-state">{t('common.loading')}</div>
      ) : error ? (
        <div className="empty-state">{t('portfolio.noLants')}</div>
      ) : items.length === 0 ? (
        <div className="empty-state">{t('portfolio.noLants')}</div>
      ) : (
        <>
          <Row label={t('portfolio.totalLants')} value={`${formatAnts(total)} ANTS`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
            {items.map((p) => (
              <div
                key={p.id}
                className="design-holding"
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.625rem 0.75rem', background: 'var(--bg-primary)', borderRadius: '8px',
                  fontSize: '0.8125rem',
                }}
              >
                <div>
                  <span className="mono">{formatAnts(p.amount)} ANTS</span>
                  {isProviderActivationStake(p.amount) && (
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>· activation stake</span>
                  )}
                  {p.sellerName && <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>· {p.sellerName}</span>}
                </div>
                <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span>
                    {p.daysRemaining != null && p.daysRemaining > 0
                      ? t('portfolio.daysRemaining', { days: p.daysRemaining })
                      : t('portfolio.expired')}
                  </span>
                  {p.listed && <span style={{ color: 'var(--accent)' }}>{t('portfolio.listed')}</span>}
                </div>
              </div>
            ))}
          </div>
          <a
            href={marketTabHref('mine')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '1rem', color: 'var(--info)', textDecoration: 'none', fontSize: '0.8125rem' }}
          >
            {t('portfolio.manageLink')}
          </a>
        </>
      )}
    </SectionCard>
  );
}

/**
 * Portfolio: one wallet's activity as a buyer + seller, plus its lANTS
 * holdings, all in one place. Defaults to the connected wallet; anyone not
 * connected can search any address instead (same pattern as
 * ClaimANTS.jsx's "Look Up Any Address"), so this stays useful without a
 * wallet too.
 */
function Portfolio() {
  const { t } = useI18n();
  const { address, isConnected } = useAccount();
  const [searchInput, setSearchInput] = useState('');
  const [searchAddress, setSearchAddress] = useState(null);
  const [searchError, setSearchError] = useState(null);

  const displayAddress = isConnected ? address : searchAddress;

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    const v = searchInput.trim();
    setSearchError(null);
    if (!/^0x[a-fA-F0-9]{40}$/.test(v)) {
      setSearchError(t('portfolio.searchPlaceholder'));
      return;
    }
    setSearchAddress(v);
  }, [searchInput, t]);

  return (
    <div className="design-page design-portfolio wrap">
      <PageIntro page="portfolio" description={t('portfolio.blurb')} />

      {!isConnected && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="design-lookup">
            <div><label htmlFor="portfolio-address">Look up any address</label><p>Explore a public wallet without connecting your own.</p></div>
            <form onSubmit={handleSearch}>
              <input
                id="portfolio-address"
                aria-describedby={searchError ? 'portfolio-search-error' : undefined}
                aria-invalid={!!searchError}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('portfolio.searchPlaceholder')}
                style={{
                  flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text-primary)',
                  fontFamily: 'monospace', fontSize: '0.875rem', outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                  background: 'var(--accent)', color: 'white', fontWeight: 600,
                  cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap',
                }}
              >
                <Search size={14} />
                {t('portfolio.searchButton')}
              </button>
            </form>
            {searchError && (
              <div id="portfolio-search-error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', color: 'var(--danger)', fontSize: '0.875rem' }}>
                <AlertCircle size={14} />
                <span>{searchError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!displayAddress ? (
        <div className="design-disconnected">
          <Wallet size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>{t('portfolio.connectPrompt')}</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t('portfolio.viewing')}:</span>
            <a
              href={`https://basescan.org/address/${displayAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--info)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'monospace' }}
            >
              {short(displayAddress)}
              <ExternalLink size={12} />
            </a>
            {!isConnected && <span style={{ color: 'var(--text-secondary)' }}>{t('portfolio.readOnly')}</span>}
          </div>
          <div className="design-activity-grid">
            <BuyerSection address={displayAddress} t={t} />
            <SellerSection address={displayAddress} t={t} />
          </div>
          <div className="design-holdings"><LantsSection address={displayAddress} t={t} /></div>
        </>
      )}
    </div>
  );
}

export default Portfolio;
