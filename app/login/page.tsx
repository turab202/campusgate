'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { AuthLayout } from '@/src/components/auth/AuthLayout';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { PasswordInput } from '@/src/components/ui/PasswordInput';
import { Alert } from '@/src/components/ui/Alert';
import { FormField } from '@/src/components/ui/FormField';
import { dictionary, Locale } from '@/src/i18n/dictionary';
import { useApp } from '@/src/context/AppContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, language, isAuthenticated, isAuthLoading, authError } = useApp();
  const [locale, setLocale] = useState<Locale>(language === 'am' ? 'am' : 'en');

  useEffect(() => { setLocale(language === 'am' ? 'am' : 'en'); }, [language]);
  useEffect(() => { if (isAuthenticated) router.replace('/'); }, [isAuthenticated, router]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const t = dictionary[locale];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setSubmitting(true);
    const ok = await login(email.trim(), password.trim());
    setSubmitting(false);
    if (ok) router.push('/');
  };

  if (isAuthLoading) return null;
  if (isAuthenticated) return null;

  return (
    <AuthLayout
      locale={locale}
      title={t.signInTitle}
      subtitle={t.signInSubtitle}
      footer={
        <div className="flex flex-col gap-2 border-t border-[var(--cg-border)] pt-4 text-sm text-[var(--cg-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>{t.noAccount}</span>
          <Link href="/register" className="font-semibold text-[var(--cg-primary)] hover:text-[var(--cg-primary-hover)] transition-colors">
            {t.registerStudent}
          </Link>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {authError ? <Alert variant="danger">{authError}</Alert> : null}

        <FormField label={locale === 'am' ? 'ኢሜይል' : 'Email address'}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={locale === 'am' ? 'ስምዎ@astu.edu.et' : 'yourname@astu.edu.et'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </FormField>

        <FormField label={t.password}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
        </FormField>

        <Button
          type="submit"
          fullWidth
          size="lg"
          icon={<ArrowRight className="h-4 w-4" />}
          disabled={submitting}
        >
          {submitting
            ? (locale === 'am' ? 'በመግባት ላይ…' : 'Signing in…')
            : t.signIn}
        </Button>
      </form>
    </AuthLayout>
  );
}
