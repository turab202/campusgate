'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import App from '@/src/App';
import { useApp } from '@/src/context/AppContext';

export default function Page() {
  const router = useRouter();
  const { isAuthenticated } = useApp();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return <App />;
}
