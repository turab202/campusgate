'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import App from '@/src/App';
import { useApp } from '@/src/context/AppContext';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isAuthLoading } = useApp();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cg-background)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--cg-border)] border-t-[var(--cg-primary)]" />
          <span className="text-sm text-[var(--cg-text-muted)]">Loading your workspace…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <App />;
}
