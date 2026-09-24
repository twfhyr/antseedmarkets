import { useCallback, useEffect, useState } from 'react';

// Tabs <-> URL path segments. Only two tabs exist in this repo -- the
// lANTS marketplace and a wallet's Portfolio -- see README.md for why this
// is a separate, product-only repo from antseed-zh. 'stake' (labelled
// "lANTS" in the UI, key kept from antseed-zh's history) maps to the bare
// base path, so the root URL (antseedmarkets.com/) lands directly on the
// marketplace by default.
const TAB_PATHS = { stake: '', portfolio: 'portfolio' };
const PATH_TABS = Object.fromEntries(
  Object.entries(TAB_PATHS).filter(([, p]) => p).map(([tab, p]) => [p, tab])
);
// 'lants' is also accepted (not just the default ''), so a direct link to
// antseedmarkets.com/lants works the same as the bare root. 'iants' is a
// legacy alias from a few hours on 2026-09-21 when antseed-zh briefly
// called this tab "IANTS" before reverting to "lANTS" -- kept so any old
// links out there still resolve instead of 404ing.
PATH_TABS.lants = 'stake';
PATH_TABS.iants = 'stake';
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
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setActiveTab = useCallback((tab) => {
    if (!VALID_TABS.has(tab)) return;
    setActiveTabState(tab);
    const url = urlForTab(tab);
    if (window.location.pathname !== url) {
      window.history.pushState(null, '', url);
    }
  }, []);

  return [activeTab, setActiveTab];
}

// ─── lANTS tab's own market sub-tab (/lants/sales, /lants/all, /lants/mine,
// /lants/history) ───────────────────────────────────────────────────────
// A second path segment under 'lants' only, so a filtered view of the
// lANTS market is itself a shareable/bookmarkable link. Ported verbatim
// from antseed-zh's useTabRouter.js (same reasoning, same sub-tab names).
const MARKET_TAB_PATHS = { listed: 'sales', all: 'all', mine: 'mine', history: 'history' };
const MARKET_PATH_TABS = Object.fromEntries(
  Object.entries(MARKET_TAB_PATHS).map(([tab, p]) => [p, tab])
);
const MARKET_DEFAULT_TAB = 'listed';

function marketTabFromLocation() {
  const path = window.location.pathname;
  const rel = path.startsWith(BASE) ? path.slice(BASE.length) : path.replace(/^\//, '');
  const [first, second] = rel.split('/');
  if (first !== 'lants' && first !== 'iants' && first !== '') return null;
  return MARKET_PATH_TABS[second] || null;
}

export function marketTabHref(tab) {
  const segment = MARKET_TAB_PATHS[tab] || MARKET_TAB_PATHS[MARKET_DEFAULT_TAB];
  return `${BASE}lants/${segment}`;
}

/**
 * Drives the lANTS market's tab (For sale / All NFTs / Mine / History)
 * from the URL's second path segment. Only meaningful while the lANTS tab
 * itself is mounted -- StakeANTS.jsx only exists in the tree when
 * activeTab === 'stake', so every call here is implicitly scoped to that.
 */
export function useMarketTabRouter() {
  const [marketTab, setMarketTabState] = useState(() => marketTabFromLocation() || MARKET_DEFAULT_TAB);

  useEffect(() => {
    const onPopState = () => setMarketTabState(marketTabFromLocation() || MARKET_DEFAULT_TAB);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
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
