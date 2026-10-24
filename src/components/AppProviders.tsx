'use client';

import { AppProvider } from '../context/AppContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}
