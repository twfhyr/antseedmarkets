import React, { createContext, useCallback, useContext, useMemo } from 'react';
import en from './en.js';

// antseedmarkets is English-only by design (2026-09-24 site-owner decision,
// same day this repo was split out of antseed-zh) -- no language switcher,
// no second dictionary. Kept as a lookup function (rather than inlining
// every string) purely so StakeANTS.jsx/Portfolio.jsx's existing t(key)
// call sites -- ported from antseed-zh unchanged -- didn't need touching.
const I18nContext = createContext({ lang: 'en', t: (k) => k });

export function I18nProvider({ children }) {
  const t = useCallback((key, vars) => {
    let str = en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, v);
      }
    }
    return str;
  }, []);

  const value = useMemo(() => ({ lang: 'en', t }), [t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
