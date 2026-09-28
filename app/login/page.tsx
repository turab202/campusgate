'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/src/components/auth/AuthLayout';
import { Button } from '@/src/components/ui/Button';
import { Checkbox } from '@/src/components/ui/Checkbox';
import { Input } from '@/src/components/ui/Input';
import { PasswordInput } from '@/src/components/ui/PasswordInput';
import { Alert } from '@/src/components/ui/Alert';
import { FormField } from '@/src/components/ui/FormField';
import { dictionary, Locale } from '@/src/i18n/dictionary';
import { useApp } from '@/src/context/AppContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, language, isAuthenticated } = useApp();
  const [locale, setLocale] = useState<Locale>(language === 'am' ? 'am' : 'en');

  useEffect(() => {
    setLocale(language === 'am' ? 'am' : 'en');
  }, [language]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = dictionary[locale];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!identifier.trim() || !password.trim()) {
      setError(locale === 'am' ? 'እባክዎ የዩኒቨርሲቲ መለያ እና የይለፍ ቃል ያስገቡ።' : 'Please enter your university ID and password.');
      return;
    }

    const success = login(identifier.trim(), password.trim());
    if (!success) {
      setError(locale === 'am' ? 'ልክ ያልሆነ መለያ ወይም የይለፍ ቃል' : 'Invalid university ID or password.');
      return;
    }

    router.push('/');
  };

  if (isAuthenticated) return null;

  return (
    <AuthLayout
      locale={locale}
      title={t.signInTitle}
      subtitle={t.signInSubtitle}
      footer={
        <div className="flex flex-col gap-2 border-t border-[var(--cg-border)] pt-5 text-sm text-[var(--cg-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>{t.noAccount}</span>
          <Link href="/register" className="font-semibold text-[var(--cg-primary)] transition-colors hover:text-[var(--cg-primary-hover)]">
            {t.registerStudent}
          </Link>
        </div>
      }
      rightPanel={
        <div className="max-w-md space-y-6">
          <div className="inline-flex items-center rounded-full border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">
            Secure campus access
          </div>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--cg-text)]">
            One secure experience for students, officers, and administrators.
          </h2>
          <p className="text-base leading-7 text-[var(--cg-text-muted)]">
            CampusGate consolidates university identity, gate access, and operational oversight into a single, trusted platform.
          </p>
          <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--cg-primary)] text-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">Authorized access</div>
                <div className="text-lg font-semibold text-[var(--cg-text)]">Verified university identities only</div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {error ? <Alert variant="danger">{error}</Alert> : null}

        <FormField label={t.universityIdOrEmail}>
          <Input
            id="university-id"
            type="text"
            autoComplete="username"
            placeholder={locale === 'am' ? 'የዩኒቨርሲቲ መለያ / ኢሜይል' : 'University ID or email'}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
        </FormField>

        <FormField label={t.password}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </FormField>

        <div className="flex items-center justify-between gap-4">
          <Checkbox
            label={t.rememberMe}
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          <button
            type="button"
            className="text-sm font-medium text-[var(--cg-primary)] transition-colors hover:text-[var(--cg-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cg-primary)]/20 focus-visible:ring-offset-2 rounded"
          >
            {t.forgotPassword}
          </button>
        </div>

        <Button type="submit" fullWidth size="lg" icon={<ArrowRight className="h-4 w-4" />}>
          {t.signIn}
        </Button>

        <div className="rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 py-3 text-xs leading-6 text-[var(--cg-text-muted)]">
          {t.authorizedNotice}
        </div>
      </form>
    </AuthLayout>
  );
}
