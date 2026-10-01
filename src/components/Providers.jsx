import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { Loader2, AlertCircle, Star, Search, LayoutGrid, List } from 'lucide-react';
import {
  fetchSellers,
  fetchProviderBuyerCounts,
  fetchProviderAccess,
  fetchProviderComments,
  fetchProviderAnnouncements,
  fetchProviderChat,
  postProviderComment,
  postProviderAnnouncement,
  postProviderChat,
  fetchDiscoveryFeatured,
} from '../api';
import { useI18n } from '../i18n/index.jsx';
import { useProviderDetailRouter, providerHref, PROVIDER_TABS, tabHref } from '../hooks/useTabRouter';
import AuthorMark from './AuthorMark';
import ShareMenu from './ShareMenu';
import '../directory.css';

const COLORS = ['forest', 'sage', 'clay', 'sand', 'blue', 'olive'];
const PATTERNS = ['orbit', 'lines', 'steps'];
const ROLE_LABEL = {
  owner: 'providers.roleOwner',
  buyer: 'providers.roleBuyer',
  staker: 'providers.roleStaker',
};

function lookFor(agentId) {
  const n = Number(agentId) || 0;
  return { color: COLORS[n % COLORS.length], pattern: PATTERNS[n % PATTERNS.length] };
}

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

function fmtTime(ms) {
  if (!ms) return '—';
  return new Date(Number(ms)).toLocaleString();
}

function isOnline(seller) {
  return String(seller?.status || '').toLowerCase() === 'online';
}

function initial(name) {
  const n = String(name || '').trim();
  return n ? n.slice(0, 1).toUpperCase() : 'P';
}

function statsFor(seller, counts) {
  if (!counts || seller?.agentId == null) return null;
  return counts[String(seller.agentId)] || null;
}

async function signProviderAction(walletClient, account, action, agentId) {
  const message = `antseedmarkets provider ${action}: ${agentId} @ ${Date.now()}`;
  const signature = await walletClient.signMessage({ account, message });
  return { message, signature };
}

function sortProviders(sellers, counts, sort) {
  const list = [...sellers];
  if (sort === 'name') {
    return list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }
  if (sort === 'rating') {
    return list.sort((a, b) => {
      const ra = statsFor(a, counts)?.ratingAvg;
      const rb = statsFor(b, counts)?.ratingAvg;
      const aMissing = ra == null;
      const bMissing = rb == null;
      if (aMissing !== bMissing) return aMissing - bMissing;
      return (rb || 0) - (ra || 0);
    });
  }
  return list.sort((a, b) => {
    const ca = statsFor(a, counts)?.buyers;
    const cb = statsFor(b, counts)?.buyers;
    const aMissing = ca == null;
    const bMissing = cb == null;
    if (aMissing !== bMissing) return aMissing - bMissing;
    if (ca !== cb) return (cb || 0) - (ca || 0);
    return (Number(b.totalRequests) || 0) - (Number(a.totalRequests) || 0);
  });
}

function SeedMark() {
  return (
    <svg viewBox="0 0 34 38" aria-hidden="true">
      <path d="M17 34C2 27 2 10 17 3c15 7 15 24 0 31Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M17 3v31M7 12l10 8 10-8M6 20l11 8 11-8" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function CoverMotif({ pattern }) {
  return (
    <div className={`dir-gen is-${pattern}`} aria-hidden="true">
      <i /><i /><i /><i /><i /><i />
    </div>
  );
}

function Stars({ value, onChange, size = 16 }) {
  const rating = value == null ? -1 : Number(value);
  return (
    <div className="provider-stars" role={onChange ? 'radiogroup' : 'img'} aria-label="rating">
      {onChange && (
        <button
          type="button"
          role="radio"
          aria-checked={rating === 0}
          aria-label="0"
          className={`provider-stars__zero${rating === 0 ? ' is-active' : ''}`}
          onClick={() => onChange(0)}
        >
          0
        </button>
      )}
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = rating >= n;
        const icon = (
          <Star
            size={size}
            className={filled ? 'is-filled' : ''}
            fill={filled ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        );
        if (!onChange) return <React.Fragment key={n}>{icon}</React.Fragment>;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n}`}
            className="provider-stars__btn"
            onClick={() => onChange(n)}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}

function RolePills({ roles, t }) {
  const list = Array.isArray(roles) ? roles : [];
  if (!list.length) return null;
  return (
    <span className="provider-roles">
      {list.map((role) => (
        <span key={role} className={`provider-feed__role is-${role}`}>
          {t(ROLE_LABEL[role] || role)}
        </span>
      ))}
    </span>
  );
}

function ProviderCard({ seller, stats, t, onOpen, featured }) {
  const agentId = seller.agentId != null ? String(seller.agentId) : null;
  const look = lookFor(agentId);
  const inner = (
    <>
      <div className="dir-art-block">
        <CoverMotif pattern={look.pattern} />
        <span className="dir-art-label">{isOnline(seller) ? t('providers.online') : t('providers.offline')}</span>
        {featured ? <span className="dir-featured">{t('providers.highlighted')}</span> : null}
        <div className="dir-logo"><span>{initial(seller.name)}</span></div>
      </div>
      <div className="dir-card-body">
        <h3>{seller.name || '—'}</h3>
        <div className="dir-card-facts">
          <div>{t('providers.buyers')}<strong>{num(stats?.buyers)}</strong></div>
          <div>
            {t('providers.rating')}
            <strong>
              {stats?.ratingCount ? Number(stats.ratingAvg).toFixed(1) : '—'}
            </strong>
          </div>
          <div>{t('providers.models')}<strong>{num(seller.models)}</strong></div>
          <div>{t('providers.earned')}<strong>{usd(seller.totalEarned)}</strong></div>
        </div>
      </div>
      <div className="dir-card-footer">
        <span>{agentId ? `AGENT / #${agentId}` : t('providers.noAgent')}</span>
        <span>{agentId ? t('providers.meet') : ''}</span>
      </div>
    </>
  );
  if (!agentId) {
    return <div className={`dir-card dir-${look.color} is-disabled`} title={t('providers.noAgent')}>{inner}</div>;
  }
  return (
    <div
      className={`dir-card dir-${look.color}${featured ? ' is-featured' : ''}`}
      title={featured ? t('providers.highlightedHint') : undefined}
    >
      <a
        className="dir-card__link"
        href={providerHref(agentId)}
        onClick={(e) => { e.preventDefault(); onOpen(agentId); }}
      >
        {inner}
      </a>
      <ShareMenu
        iconOnly
        className="dir-card__share"
        path={providerHref(agentId)}
        title={t('share.providerTitle', { name: seller.name || t('stake.agent', { id: agentId }) })}
      />
    </div>
  );
}

function FeedList({ items, empty, t, showRating }) {
  if (!items) {
    return <div className="empty-state">{t('common.loading')}</div>;
  }
  if (items.length === 0) {
    return <div className="empty-state">{empty}</div>;
  }
  return (
    <ol className="provider-feed">
      {items.map((item) => (
        <li key={item.id}>
          <div className="provider-feed__meta">
            <AuthorMark address={item.author} profile={item.profile} />
            <RolePills roles={item.roles} t={t} />
            {showRating && item.rating != null && <Stars value={item.rating} size={12} />}
            <time dateTime={new Date(item.createdAt).toISOString()}>{fmtTime(item.createdAt)}</time>
          </div>
          {item.body ? <p>{item.body}</p> : null}
        </li>
      ))}
    </ol>
  );
}

function Compose({
  placeholder, submitLabel, postingLabel, disabled, disabledHint, posting, error, onSubmit, maxLength,
  rating, onRating, t,
}) {
  const [text, setText] = useState('');
  const needsRating = Boolean(onRating);
  const canSend = !disabled && !posting && text.trim() && (!needsRating || rating != null);
  return (
    <form
      className="provider-compose"
      onSubmit={(e) => {
        e.preventDefault();
        const body = text.trim();
        if (!canSend) return;
        onSubmit(body).then((ok) => { if (ok) setText(''); });
      }}
    >
      {onRating && (
        <div className="provider-compose__rating">
          <span>{t('providers.rating')}</span>
          <Stars value={rating} onChange={onRating} size={20} />
          <span>{rating == null ? t('providers.ratingNeed') : `${rating} / 5`}</span>
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        disabled={disabled || posting}
        rows={3}
        maxLength={maxLength}
      />
      <div className="provider-compose__row">
        {disabledHint && <p>{disabledHint}</p>}
        {error && <p className="provider-compose__error">{error}</p>}
        <button type="submit" className="v2-primary" disabled={!canSend}>
          {posting ? postingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

function ProviderDetail({ agentId, seller, stats, loadingList, tab, setTab, t, onBack }) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [access, setAccess] = useState(null);
  const [accessError, setAccessError] = useState(null);
  const [announcements, setAnnouncements] = useState(null);
  const [comments, setComments] = useState(null);
  const [chat, setChat] = useState(null);
  const [posting, setPosting] = useState(null);
  const [postError, setPostError] = useState({});
  const [rating, setRating] = useState(null);
  const chatEndRef = useRef(null);
  const chatIds = useRef(new Set());
  const lastChatId = useRef(0);
  const look = lookFor(agentId);

  const loadAccess = useCallback(async () => {
    try {
      setAccessError(null);
      const data = await fetchProviderAccess(agentId, address);
      setAccess(data);
    } catch (e) {
      setAccessError(e.message || 'Could not check access.');
      setAccess(null);
    }
  }, [agentId, address]);

  const loadFeeds = useCallback(async () => {
    const [a, c, h] = await Promise.allSettled([
      fetchProviderAnnouncements(agentId),
      fetchProviderComments(agentId),
      fetchProviderChat(agentId),
    ]);
    if (a.status === 'fulfilled') setAnnouncements(a.value.items || []);
    else setAnnouncements([]);
    if (c.status === 'fulfilled') setComments(c.value.items || []);
    else setComments([]);
    if (h.status === 'fulfilled') {
      const items = h.value.items || [];
      chatIds.current = new Set(items.map((m) => m.id));
      lastChatId.current = items.length ? items[items.length - 1].id : 0;
      setChat(items);
    } else {
      setChat([]);
    }
  }, [agentId]);

  useEffect(() => {
    loadAccess();
    loadFeeds();
  }, [loadAccess, loadFeeds]);

  useEffect(() => {
    const tick = async () => {
      try {
        const data = await fetchProviderChat(agentId, lastChatId.current || undefined);
        const incoming = (data.items || []).filter((m) => !chatIds.current.has(m.id));
        if (!incoming.length) return;
        incoming.forEach((m) => chatIds.current.add(m.id));
        lastChatId.current = incoming[incoming.length - 1].id;
        setChat((prev) => [...(prev || []), ...incoming]);
      } catch {
        /* keep the last good transcript */
      }
    };
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, [agentId]);

  useEffect(() => {
    if (tab === 'chat') chatEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [chat, tab]);

  const signAndPost = useCallback(async (kind, body, send) => {
    if (!walletClient || !address) return false;
    setPosting(kind);
    setPostError((e) => ({ ...e, [kind]: null }));
    try {
      const action = kind === 'announce' ? 'announce' : kind;
      const signed = await signProviderAction(walletClient, address, action, agentId);
      const row = await send({ address, body, ...signed });
      if (kind === 'comment') {
        setComments((prev) => [row, ...(prev || [])]);
        loadAccess();
      }
      if (kind === 'announce') setAnnouncements((prev) => [row, ...(prev || [])]);
      if (kind === 'chat') {
        if (!chatIds.current.has(row.id)) {
          chatIds.current.add(row.id);
          lastChatId.current = row.id;
          setChat((prev) => [...(prev || []), row]);
        }
      }
      return true;
    } catch (e) {
      setPostError((err) => ({ ...err, [kind]: e.message || 'Request failed' }));
      return false;
    } finally {
      setPosting(null);
    }
  }, [walletClient, address, agentId, loadAccess]);

  const canComment = Boolean(access?.isBuyer || access?.isStaker);
  const canAnnounce = Boolean(access?.isOwner);
  const canChat = Boolean(access?.roles?.length);
  const buyerCount = access?.buyerCount != null ? access.buyerCount : stats?.buyers;
  const ratingAvg = access?.ratingAvg != null ? access.ratingAvg : stats?.ratingAvg;
  const ratingCount = access?.ratingCount != null ? access.ratingCount : stats?.ratingCount;

  if (!seller) {
    return (
      <div className="directory-page wrap">
        <button type="button" className="dir-back" onClick={onBack}>{t('providers.back')}</button>
        <div className="empty-state">{loadingList ? t('providers.loading') : t('providers.notFound')}</div>
      </div>
    );
  }

  return (
    <div className="directory-page wrap">
      <div className="dir-toolbar">
        <button type="button" className="dir-back" onClick={onBack}>{t('providers.back')}</button>
        <ShareMenu
          path={providerHref(agentId)}
          title={t('share.providerTitle', { name: seller.name || t('stake.agent', { id: agentId }) })}
        />
      </div>

      <article className={`dir-profile dir-${look.color}`}>
        <div className="dir-cover">
          <CoverMotif pattern={look.pattern} />
          <span className="dir-cover-number">AGENT / #{agentId}</span>
          <span className="dir-cover-caption">{t('providers.coverCaption')}</span>
        </div>
        <header className="dir-intro">
          <div className="dir-identity">
            <div className="dir-logo"><span>{initial(seller.name)}</span></div>
            <div>
              <p className="v2-eyebrow"><span className="v2-dot" />{isOnline(seller) ? t('providers.online') : t('providers.offline')}</p>
              <h1>{seller.name || '—'}</h1>
              <p className="dir-meta">AGENT / #{agentId}</p>
              {ratingCount ? (
                <div className="provider-detail__rating">
                  <Stars value={Math.round(ratingAvg)} size={18} />
                  <span>{Number(ratingAvg).toFixed(1)} ({num(ratingCount)})</span>
                </div>
              ) : (
                <div className="provider-detail__rating"><span>—</span></div>
              )}
            </div>
          </div>
        </header>

        {accessError && (
          <div className="provider-banner" role="alert" style={{ margin: '16px 40px 0' }}>
            <AlertCircle size={14} />
            <span>{accessError}</span>
          </div>
        )}

        <div className="dir-columns">
          <div>
            <nav className="os-tabs provider-subtabs" aria-label="Provider sections">
              {PROVIDER_TABS.map((id) => (
                <a
                  key={id}
                  href={providerHref(agentId, id)}
                  className={`os-tab${tab === id ? ' is-active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setTab(id); }}
                >
                  {id === 'announcement' ? t('providers.tabAnnouncement') : id === 'comments' ? t('providers.tabComments') : t('providers.tabChat')}
                </a>
              ))}
            </nav>

            {tab === 'announcement' && (
              <section>
                <p className="v2-eyebrow">{t('providers.storyEyebrow')}</p>
                <FeedList items={announcements} empty={t('providers.announceEmpty')} t={t} />
                {canAnnounce ? (
                  <Compose
                    placeholder={t('providers.announcePlaceholder')}
                    submitLabel={t('providers.announcePost')}
                    postingLabel={t('providers.posting')}
                    posting={posting === 'announce'}
                    error={postError.announce}
                    maxLength={4000}
                    t={t}
                    onSubmit={(body) => signAndPost('announce', body, (payload) => postProviderAnnouncement(agentId, payload))}
                  />
                ) : (
                  <p className="provider-hint">{isConnected ? t('providers.announceHint') : t('providers.announceNeedWallet')}</p>
                )}
              </section>
            )}

            {tab === 'comments' && (
              <section>
                <p className="provider-hint">
                  <a href={tabHref('leaderboard')}>{t('providers.contestHint')}</a>
                </p>
                <FeedList items={comments} empty={t('providers.commentsEmpty')} t={t} showRating />
                {canComment ? (
                  <>
                    {access?.identity && (
                      <p className="provider-hint">{t('providers.shownAs', { addr: access.profile?.nickname || short(access.identity) })}</p>
                    )}
                    <Compose
                      placeholder={t('providers.commentPlaceholder')}
                      submitLabel={t('providers.commentPost')}
                      postingLabel={t('providers.posting')}
                      posting={posting === 'comment'}
                      error={postError.comment}
                      maxLength={2000}
                      rating={rating}
                      onRating={setRating}
                      t={t}
                      onSubmit={(body) => signAndPost('comment', body, (payload) => postProviderComment(agentId, { ...payload, rating }))}
                    />
                  </>
                ) : (
                  <p className="provider-hint">{isConnected ? t('providers.commentNeedAccess') : t('providers.commentHint')}</p>
                )}
              </section>
            )}

            {tab === 'chat' && (
              <section className="provider-chat-card">
                <p className="provider-hint">{t('providers.chatHint')}</p>
                <div className="provider-chat">
                  <FeedList items={chat} empty={t('providers.chatEmpty')} t={t} />
                  <div ref={chatEndRef} />
                </div>
                {canChat ? (
                  <>
                    {access?.identity && (
                      <p className="provider-hint">{t('providers.shownAs', { addr: access.profile?.nickname || short(access.identity) })}</p>
                    )}
                    <Compose
                      placeholder={t('providers.chatPlaceholder')}
                      submitLabel={t('providers.chatSend')}
                      postingLabel={t('providers.posting')}
                      posting={posting === 'chat'}
                      error={postError.chat}
                      maxLength={500}
                      t={t}
                      onSubmit={(body) => signAndPost('chat', body, (payload) => postProviderChat(agentId, payload))}
                    />
                  </>
                ) : (
                  <p className="provider-hint">{isConnected ? t('providers.chatNeedAccess') : t('providers.signedOut')}</p>
                )}
              </section>
            )}
          </div>

          <aside className="dir-facts">
            <p className="v2-eyebrow">{t('providers.factsEyebrow')}</p>
            <h3>{t('providers.factsTitle')}</h3>
            <div className="dir-fact"><span>{t('providers.buyers')}</span><strong>{num(buyerCount)}</strong></div>
            <div className="dir-fact"><span>{t('providers.rating')}</span><strong>{ratingCount ? `${Number(ratingAvg).toFixed(1)} (${num(ratingCount)})` : '—'}</strong></div>
            <div className="dir-fact"><span>{t('providers.models')}</span><strong>{num(seller.models)}</strong></div>
            <div className="dir-fact"><span>{t('providers.earned')}</span><strong>{usd(seller.totalEarned)}</strong></div>
            <div className="dir-fact"><span>{t('providers.requests')}</span><strong>{num(seller.totalRequests)}</strong></div>
            <p className="dir-facts-note">{t('providers.factsNote')}</p>
          </aside>
        </div>
      </article>
    </div>
  );
}

export default function Providers() {
  const { t } = useI18n();
  const [agentId, providerTab, openProvider, setProviderTab, closeProvider] = useProviderDetailRouter();
  const [sellers, setSellers] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('buyers');
  const [view, setView] = useState('grid');
  const [featuredIds, setFeaturedIds] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.allSettled([fetchSellers(), fetchProviderBuyerCounts(), fetchDiscoveryFeatured()])
      .then(([s, c, f]) => {
        if (cancelled) return;
        if (s.status !== 'fulfilled') {
          setError(true);
          setSellers([]);
        } else {
          setSellers(s.value || []);
        }
        if (c.status === 'fulfilled') setCounts(c.value.items || {});
        else setCounts(null);
        if (f.status === 'fulfilled') {
          setFeaturedIds(new Set((f.value.agentIds || []).map((id) => String(id))));
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const ranked = useMemo(() => {
    const list = sortProviders(sellers, counts, sort);
    if (!featuredIds.size) return list;
    const featured = [];
    const rest = [];
    for (const s of list) {
      if (s.agentId != null && featuredIds.has(String(s.agentId))) featured.push(s);
      else rest.push(s);
    }
    return [...featured, ...rest];
  }, [sellers, counts, sort, featuredIds]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ranked;
    return ranked.filter((s) => {
      const name = String(s.name || '').toLowerCase();
      const id = s.agentId != null ? String(s.agentId) : '';
      return name.includes(q) || id.includes(q);
    });
  }, [ranked, query]);
  const selected = agentId
    ? ranked.find((s) => String(s.agentId) === String(agentId)) || sellers.find((s) => String(s.agentId) === String(agentId))
    : null;

  if (agentId) {
    return (
      <ProviderDetail
        agentId={agentId}
        seller={selected}
        stats={counts ? counts[String(agentId)] : null}
        loadingList={loading}
        tab={providerTab}
        setTab={setProviderTab}
        t={t}
        onBack={closeProvider}
      />
    );
  }

  return (
    <div className="directory-page wrap">
      <section className="dir-hero">
        <div>
          <p className="v2-eyebrow"><span className="v2-dot" />{t('providers.heroEyebrow')}</p>
          <h1>{t('providers.heroTitle')}<br /><em>{t('providers.heroEm')}</em></h1>
          <p className="dir-lead">{t('providers.blurb')}</p>
        </div>
        <div className="dir-art" aria-hidden="true">
          <div className="dir-ring is-one" />
          <div className="dir-ring is-two" />
          <div className="dir-ring is-three" />
          <div className="dir-core"><SeedMark /></div>
          <span className="dir-orbit-label is-top">{t('providers.orbitTop')}</span>
          <span className="dir-orbit-label is-bottom">{t('providers.orbitBottom')}</span>
          <div className="dir-float is-one">{t('providers.nodeBuilders')}</div>
          <div className="dir-float is-two">{t('providers.nodeExplorers')}</div>
          <div className="dir-float is-three">{t('providers.nodeThinkers')}</div>
          <span className="dir-dot is-one" />
          <span className="dir-dot is-two" />
          <p className="dir-art-note">{t('providers.artNote')}</p>
        </div>
      </section>

      <section className="dir-browse">
        <div className="dir-browse-top">
          <div>
            <p className="v2-eyebrow">{t('providers.browseEyebrow')}</p>
            <h2>{t('providers.browseTitle')} <em>{t('providers.browseEm')}</em></h2>
          </div>
          <span className="dir-count">{loading ? t('providers.loading') : t('providers.resultCount', { n: String(visible.length) })}</span>
        </div>
        <div className="dir-toolbar">
          <label className="dir-search">
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('providers.search')}
              aria-label={t('providers.search')}
            />
          </label>
          <div className="dir-toolbar-controls">
            <label className="dir-sort">
              {t('providers.sort')}
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t('providers.sort')}>
                <option value="buyers">{t('providers.sortBuyers')}</option>
                <option value="rating">{t('providers.sortRating')}</option>
                <option value="name">{t('providers.sortName')}</option>
              </select>
            </label>
            <div className="dir-views" role="group" aria-label={t('providers.view')}>
              <button type="button" aria-pressed={view === 'grid'} aria-label={t('providers.viewGrid')} onClick={() => setView('grid')}>
                <LayoutGrid size={14} />
              </button>
              <button type="button" aria-pressed={view === 'list'} aria-label={t('providers.viewList')} onClick={() => setView('list')}>
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {error && !loading && (
          <div className="dir-empty"><AlertCircle size={18} /> {t('providers.error')}</div>
        )}
        {loading && (
          <div className="dir-empty"><Loader2 size={28} className="spin" /> {t('providers.loading')}</div>
        )}
        {!loading && !error && visible.length === 0 && (
          <div className="dir-empty">{query ? t('providers.noMatches') : t('providers.empty')}</div>
        )}
        {!loading && visible.length > 0 && (
          <div className={`dir-grid${view === 'list' ? ' is-list' : ''}`}>
            {visible.map((seller) => (
              <ProviderCard
                key={seller.id}
                seller={seller}
                stats={statsFor(seller, counts)}
                t={t}
                onOpen={openProvider}
                featured={seller.agentId != null && featuredIds.has(String(seller.agentId))}
              />
            ))}
          </div>
        )}
        <p className="dir-note">{t('providers.disclaimer')}</p>
      </section>

      <section className="dir-join">
        <div>
          <p className="v2-eyebrow">{t('providers.joinEyebrow')}</p>
          <h2>{t('providers.joinTitle')}<br /><em>{t('providers.joinEm')}</em></h2>
        </div>
        <p>{t('providers.joinBody')}</p>
      </section>
    </div>
  );
}
