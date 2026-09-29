import React, { createContext, useContext, useLayoutEffect, useState, useEffect } from 'react';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';

const KEY = 'antseedmarkets.theme';
const ThemeContext = createContext(null);
function initialTheme() {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'terminal' || stored === 'editorial') return stored;
    return localStorage.getItem('antseedmarkets.uiStyle') === 'classical' ? 'terminal' : 'editorial';
  } catch { return 'editorial'; }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);
  useLayoutEffect(() => {
    document.documentElement.dataset.uiStyle = 'v2';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(KEY, theme); } catch { /* Storage may be disabled. */ }
  }, [theme]);
  useEffect(() => {
    const sync = (event) => {
      if (event.key === KEY) setTheme(event.newValue === 'terminal' ? 'terminal' : 'editorial');
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const walletTheme = theme === 'terminal'
    ? darkTheme({ accentColor: '#63e8d0', accentColorForeground: '#071611', borderRadius: 'small', fontStack: 'system' })
    : lightTheme({ accentColor: '#c94428', accentColorForeground: '#ffffff', borderRadius: 'small', fontStack: 'system' });
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <RainbowKitProvider locale="en-US" theme={walletTheme}>{children}</RainbowKitProvider>
    </ThemeContext.Provider>
  );
}
export function useTheme() { return useContext(ThemeContext); }
