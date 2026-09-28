'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, GraduationCap, UserCheck, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/src/components/auth/AuthLayout';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { PasswordInput } from '@/src/components/ui/PasswordInput';
import { Alert } from '@/src/components/ui/Alert';
import { FormField } from '@/src/components/ui/FormField';
import { dictionary, Locale } from '@/src/i18n/dictionary';
import { useApp } from '@/src/context/AppContext';

const QUICK_LOGINS = [
  { role: 'Student', icon: GraduationCap, id: 'ASTU-2024-01234', pw: 'demo', color: 'text-[var(--cg-info)]', bg: 'bg-[var(--cg-info-bg)] border-[var(--cg-info-border)]' },
  { role: 'Officer', icon: UserCheck, id: 'GO-023', pw: 'demo', color: 'text-[var(--cg-success)]', bg: 'bg-[var(--cg-success-bg)] border-[var(--cg-success-border)]' },
  { role: 'Admin', icon: ShieldCheck, id: 'ADMIN', pw: 'demo', color: 'text-[var(--cg-primary)]', bg: 'bg-[var(--cg-primary-light)] border-[var(--cg-border)]' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, language, isAuthenticated } = useApp();
  const [locale, setLocale] = useState<Locale>(language === 'am' ? 'am' : 'en');

  useEffect(() => { setLocale(language === 'am' ? 'am' : 'en'); }, [language]);
  useEffect(() => { if (isAuthenticated) router.replace('/'); }, [isAuthenticated, router]);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const t = dictionary[locale];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password.trim()) {
      setError(locale === 'am' ? 'እባክዎ የዩኒቨርሲቲ መለያ እና የይለፍ ቃል ያስገቡ።' : 'Please enter your university ID and password.');
      return;
    }
    const ok = login(identifier.trim(), password.trim());
    if (!ok) {
      setError(locale === 'am' ? 'ልክ ያልሆነ መለያ ወይም የይለፍ ቃል' : 'Invalid university ID or password.');
      return;
    }
    router.push('/');
  };

  const handleQuickLogin = (id: string, pw: string) => {
    setIdentifier(id);
    setPassword(pw);
    setError(null);
    const ok = login(id, pw);
    if (ok) router.push('/');
  };

  if (isAuthenticated) return null;

  return (
    <AuthLayout locale={locale} title={t.signInTitle} subtitle={t.signInSubtitle}
      footer={
        <div className="flex flex-col gap-2 border-t border-[var(--cg-border)] pt-4 text-sm text-[var(--cg-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>{t.noAccount}</span>
          <Link href="/register" className="font-semibold text-[var(--cg-primary)] hover:text-[var(--cg-primary-hover)] transition-colors">
            {t.registerStudent}
          </Link>
        </div>
      }
    >
      {/* Quick access pills */}
      <div className="mb-5">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">Quick access</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_LOGINS.map(({ role, icon: Icon, id, pw, color, bg }) => (
            <button
              key={role}
              type="button"
              onClick={() => handleQuickLogin(id, pw)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center transition-all hover:shadow-[var(--cg-shadow-sm)] active:scale-[0.98] ${bg}`}
            >
              <Icon className={`h-4 w-4 ${color}`} />
              <span className={`text-[11px] font-semibold ${color}`}>{role}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--cg-border)]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-subtle)]">or sign in manually</span>
        <div className="h-px flex-1 bg-[var(--cg-border)]" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {error ? <Alert variant="danger">{error}</Alert> : null}

        <FormField label={t.universityIdOrEmail}>
          <Input
            id="university-id"
            type="text"
            autoComplete="username"
            placeholder={locale === 'am' ? 'የዩኒቨርሲቲ መለያ / ኢሜይል' : 'University ID or email'}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </FormField>

        <FormField label={t.password}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

        <div className="flex items-center justify-end">
          <button type="button" className="text-xs font-semibold text-[var(--cg-primary)] hover:text-[var(--cg-primary-hover)] transition-colors">
            {t.forgotPassword}
          </button>
        </div>

        <Button type="submit" fullWidth size="lg" icon={<ArrowRight className="h-4 w-4" />}>
          {t.signIn}
        </Button>
      </form>
    </AuthLayout>
  );
}
