import { useCallback, useEffect, useState } from 'react';

// Tabs <-> URL path segments. Three tabs exist in this repo -- the lANTS
// marketplace, a wallet's Portfolio, and Rewards (added 2026-09-24) -- see
// README.md for why this is a separate, product-only repo from antseed-zh.
// 'stake' (key kept from antseed-zh's history) maps to the bare base path,
// so the root URL (antseedmarkets.com/) lands on the Stake desk by default.
const TAB_PATHS = { stake: '', market: 'lants', portfolio: 'portfolio', rewards: 'rewards', providers: 'providers', discovery: 'discovery', leaderboard: 'leaderboard', profile: 'profile' };
const PATH_TABS = Object.fromEntries(
  Object.entries(TAB_PATHS).filter(([, p]) => p).map(([tab, p]) => [p, tab])
);
// 'lants' is also accepted (not just the default ''), so a direct link to
// antseedmarkets.com/lants works the same as the bare root. 'iants' is a
// legacy alias from a few hours on 2026-09-21 when antseed-zh briefly
// called this tab "IANTS" before reverting to "lANTS" -- kept so any old
// links out there still resolve instead of 404ing.
PATH_TABS.iants = 'market';
const DEFAULT_TAB = 'stake';
const VALID_TABS = new Set(Object.keys(TAB_PATHS));

const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

function tabFromLocation() {
  const path = window.location.pathname;
  const rel = path.startsWith(BASE) ? path.slice(BASE.length) : path.replace(/^\//, '');
  const segment = rel.split('/')[0] || '';
  const tab = PATH_TABS[segment];
  return tab && VALID_TABS.has(tab) ? tab : DEFAULT_TAB;
}

function urlForTab(tab) {
  const segment = TAB_PATHS[tab] ?? '';
  return `${BASE}${segment}`;
}

// Exported so nav links can render real `href`s (right-click "copy link",
// middle-click to open in a new tab, hover preview in the status bar all
// need an actual URL, not just an onClick handler).
export const tabHref = urlForTab;

/**
 * Drives the active tab from the URL path instead of purely in-memory
 * state, so both sections have a shareable, bookmarkable, reload-safe
 * link: antseedmarkets.com/ (lANTS) and antseedmarkets.com/portfolio.
 * Falls back to 'stake' for any unknown path (nginx serves index.html for
 * these -- see the deploy notes in README.md -- so a fresh load of an
 * unrecognized deep link still renders the app instead of a 404).
 */
export function useTabRouter() {
  const [activeTab, setActiveTabState] = useState(tabFromLocation);

  useEffect(() => {
    const onPopState = () => setActiveTabState(tabFromLocation());
    window.addEventListener('popstate', onPopState);
    window.addEventListener('antseed:navigate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('antseed:navigate', onPopState);
    };
  }, []);

  const setActiveTab = useCallback((tab) => {
    if (!VALID_TABS.has(tab)) return;
    setActiveTabState(tab);
    const url = urlForTab(tab);
    if (window.location.pathname !== url) {
      window.history.pushState(null, '', url);
      window.dispatchEvent(new Event('antseed:navigate'));
    }
  }, []);

  return [activeTab, setActiveTab];
}

// ─── lANTS tab's own market sub-tab (/lants/sales, /lants/offered, /lants/all,
// /lants/mine, /lants/stats, /lants/history) ────────────────────────────
// A second path segment under 'lants' only, so a filtered view of the
// lANTS market is itself a shareable/bookmarkable link. Ported verbatim
// from antseed-zh's useTabRouter.js (same reasoning, same sub-tab names).
const MARKET_TAB_PATHS = { listed: 'sales', offered: 'offered', all: 'all', mine: 'mine', stats: 'stats', history: 'history' };
const MARKET_PATH_TABS = Object.fromEntries(
  Object.entries(MARKET_TAB_PATHS).map(([tab, p]) => [p, tab])
);
const MARKET_DEFAULT_TAB = 'listed';

function detailIdFromSegments(first, second, third) {
  if (first !== 'lants' && first !== 'iants') return null;
  const raw = second === 'nft' || second === 'item' ? third : second;
  if (!/^\d+$/.test(raw || '')) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

function lantsDetailIdFromLocation() {
  const path = window.location.pathname;
  const rel = path.startsWith(BASE) ? path.slice(BASE.length) : path.replace(/^\//, '');
  const [first, second, third] = rel.split('/');
  return detailIdFromSegments(first, second, third);
}

function marketTabFromLocation() {
  const path = window.location.pathname;
  const rel = path.startsWith(BASE) ? path.slice(BASE.length) : path.replace(/^\//, '');
  const [first, second] = rel.split('/');
  if (first !== 'lants' && first !== 'iants') return null;
  if (detailIdFromSegments(first, second, rel.split('/')[2]) != null) return 'all';
  return MARKET_PATH_TABS[second] || null;
}

export function marketTabHref(tab) {
  const segment = MARKET_TAB_PATHS[tab] || MARKET_TAB_PATHS[MARKET_DEFAULT_TAB];
  return `${BASE}lants/${segment}`;
}

export function lantsDetailHref(tokenId) {
  return `${BASE}lants/${encodeURIComponent(String(tokenId))}`;
}

/**
 * Drives the visible lANTS market tabs from the URL's second path segment.
 * Only meaningful while the Marketplace tab
 * itself is mounted -- StakeANTS.jsx only exists in the tree when
 * activeTab === 'market', so every call here is implicitly scoped to that.
 */
export function useMarketTabRouter() {
  const [marketTab, setMarketTabState] = useState(() => marketTabFromLocation() || MARKET_DEFAULT_TAB);

  useEffect(() => {
    const onPopState = () => setMarketTabState(marketTabFromLocation() || MARKET_DEFAULT_TAB);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('antseed:navigate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('antseed:navigate', onPopState);
    };
  }, []);

  const setMarketTab = useCallback((tab) => {
    if (!MARKET_TAB_PATHS[tab]) return;
    setMarketTabState(tab);
    const url = marketTabHref(tab);
    if (window.location.pathname !== url) {
      window.history.pushState(null, '', url);
    }
  }, []);

  return [marketTab, setMarketTab];
}

export function useLantsDetailRouter() {
  const [detailId, setDetailId] = useState(lantsDetailIdFromLocation);

  useEffect(() => {
    const onPopState = () => setDetailId(lantsDetailIdFromLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openDetail = useCallback((tokenId) => {
    const id = Number(tokenId);
    if (!Number.isSafeInteger(id)) return;
    setDetailId(id);
    const url = lantsDetailHref(id);
    if (window.location.pathname !== url) {
      window.history.pushState(null, '', url);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailId(null);
    const url = marketTabHref('all');
    if (window.location.pathname !== url) {
      window.history.pushState(null, '', url);
    }
  }, []);

  const clearDetail = useCallback(() => {
    setDetailId(null);
  }, []);

  return [detailId, openDetail, closeDetail, clearDetail];
}

// ─── Providers tab detail (/providers/:agentId[/announcement|comments|chat]) ───
const PROVIDER_AGENT_RE = /^\d+$/;
export const PROVIDER_TABS = ['comments', 'announcement', 'chat'];
const PROVIDER_DEFAULT_TAB = 'comments';

function providerLocation() {
  const path = window.location.pathname;
  const rel = path.startsWith(BASE) ? path.slice(BASE.length) : path.replace(/^\//, '');
  const [first, second, third] = rel.split('/');
  if (first !== 'providers') return { agentId: null, tab: PROVIDER_DEFAULT_TAB };
  const id = decodeURIComponent(second || '');
  if (!PROVIDER_AGENT_RE.test(id)) return { agentId: null, tab: PROVIDER_DEFAULT_TAB };
  const tab = PROVIDER_TABS.includes(third) ? third : PROVIDER_DEFAULT_TAB;
  return { agentId: id, tab };
}

export function providersHref() {
  return `${BASE}providers`;
}

export function providerHref(agentId, tab) {
  if (agentId == null || agentId === '') return providersHref();
  const base = `${BASE}providers/${encodeURIComponent(String(agentId))}`;
  if (!tab || tab === PROVIDER_DEFAULT_TAB) return base;
  return `${base}/${encodeURIComponent(tab)}`;
}

export function useProviderDetailRouter() {
  const initial = providerLocation();
  const [agentId, setAgentId] = useState(initial.agentId);
  const [providerTab, setProviderTabState] = useState(initial.tab);

  useEffect(() => {
    const sync = () => {
      const loc = providerLocation();
      setAgentId(loc.agentId);
      setProviderTabState(loc.tab);
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('antseed:navigate', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('antseed:navigate', sync);
    };
  }, []);

  const openProvider = useCallback((id, tab = PROVIDER_DEFAULT_TAB) => {
    if (!PROVIDER_AGENT_RE.test(String(id || ''))) return;
    const nextTab = PROVIDER_TABS.includes(tab) ? tab : PROVIDER_DEFAULT_TAB;
    setAgentId(String(id));
    setProviderTabState(nextTab);
    const url = providerHref(id, nextTab);
    if (window.location.pathname !== url) {
      window.history.pushState(null, '', url);
    }
  }, []);

  const setProviderTab = useCallback((tab) => {
    if (!PROVIDER_TABS.includes(tab) || !agentId) return;
    setProviderTabState(tab);
    const url = providerHref(agentId, tab);
    if (window.location.pathname !== url) {
      window.history.pushState(null, '', url);
    }
  }, [agentId]);

  const closeProvider = useCallback(() => {
    setAgentId(null);
    setProviderTabState(PROVIDER_DEFAULT_TAB);
    const url = providersHref();
    if (window.location.pathname !== url) {
      window.history.pushState(null, '', url);
      window.dispatchEvent(new Event('antseed:navigate'));
    }
  }, []);

  return [agentId, providerTab, openProvider, setProviderTab, closeProvider];
}
