import { createContext, useContext } from 'react';

const AntsAppContext = createContext(null);

export function AntsAppProvider({ value, children }) {
  return <AntsAppContext.Provider value={value}>{children}</AntsAppContext.Provider>;
}

export function useAntsApp() {
  const value = useContext(AntsAppContext);
  if (!value) throw new Error('My Antseed is not mounted');
  return value;
}

export function useAntsConfig() {
  return useAntsApp().config;
}

export function useEpochInfo() {
  return useAntsApp().overview?.epoch ?? null;
}
