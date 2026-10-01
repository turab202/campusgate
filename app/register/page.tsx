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

// ---------------------------------------------------------------------------
// NOTE: POST /api/v1/users (student self-registration) is a missing backend
// endpoint identified in the integration audit. This form is preserved for
// UI continuity but submission is disabled until the endpoint is implemented.
// ---------------------------------------------------------------------------

export default function RegisterPage() {
  const router = useRouter();
  const { language } = useApp();
  const [locale, setLocale] = useState<Locale>(language === 'am' ? 'am' : 'en');

  useEffect(() => { setLocale(language === 'am' ? 'am' : 'en'); }, [language]);

  const [form, setForm] = useState({
    name: '', studentId: '', department: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const t = dictionary[locale];

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = locale === 'am' ? 'ሙሉ ስም ያስፈልጋል' : 'Full name is required';
    if (!form.studentId.trim()) e.studentId = locale === 'am' ? 'የዩኒቨርሲቲ መለያ ያስፈልጋል' : 'University ID is required';
    if (!form.department.trim()) e.department = locale === 'am' ? 'ክፍል ያስፈልጋል' : 'Department is required';
    if (!form.email.trim()) e.email = locale === 'am' ? 'ኢሜይል ያስፈልጋል' : 'Email is required';
    if (!form.password) e.password = locale === 'am' ? 'የይለፍ ቃል ያስፈልጋል' : 'Password is required';
    if (form.password && form.password.length < 6) e.password = locale === 'am' ? 'ቢያንስ 6 ቁምፊ' : 'At least 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = locale === 'am' ? 'የይለፍ ቃሎቹ አይዛመዱም' : 'Passwords do not match';
    return e;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    // Backend gap: POST /api/v1/users is not yet implemented.
    // Account creation requires an administrator to create users directly.
    // This will be connected once the endpoint is available.
  };

  const field = (key: keyof typeof form, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  return (
    <AuthLayout
      locale={locale}
      title={t.registerTitle}
      subtitle={t.registerSubtitle}
      footer={
        <div className="flex items-center justify-between gap-3 border-t border-[var(--cg-border)] pt-4 text-sm text-[var(--cg-text-muted)]">
          <span>{t.haveAccount}</span>
          <Link href="/login" className="font-semibold text-[var(--cg-primary)] hover:text-[var(--cg-primary-hover)] transition-colors">
            {t.loginInstead}
          </Link>
        </div>
      }
    >
      <Alert variant="warning">
        {locale === 'am'
          ? 'የተማሪ ምዝገባ በቅርቡ ይገኛል። አስተዳዳሪ ሂሳብ ለመፍጠር ያግኙ።'
          : 'Student self-registration is not yet available. Please contact an administrator to create your account.'}
      </Alert>

      <form className="mt-4 space-y-3 opacity-60 pointer-events-none" onSubmit={handleSubmit} noValidate aria-disabled>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t.fullName} error={errors.name}>
            <Input id="full-name" type="text" autoComplete="name"
              placeholder={locale === 'am' ? 'ሙሉ ስምዎን ያስገቡ' : 'Your full name'}
              value={form.name} onChange={(e) => field('name', e.target.value)} disabled />
          </FormField>
          <FormField label={locale === 'am' ? 'የዩኒቨርሲቲ መለያ' : 'University ID'} error={errors.studentId}>
            <Input id="student-id" type="text" autoComplete="off" placeholder="ASTU-2024-01234"
              value={form.studentId} onChange={(e) => field('studentId', e.target.value)} disabled />
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t.department} error={errors.department}>
            <Input id="department" type="text"
              placeholder={locale === 'am' ? 'ለምሳሌ: ሶፍትዌር ምህንድስና' : 'e.g. Software Engineering'}
              value={form.department} onChange={(e) => field('department', e.target.value)} disabled />
          </FormField>
          <FormField label={t.phone}>
            <Input id="phone" type="tel" autoComplete="tel" placeholder="+251 91 000 0000"
              value={form.phone} onChange={(e) => field('phone', e.target.value)} disabled />
          </FormField>
        </div>

        <FormField label={locale === 'am' ? 'የዩኒቨርሲቲ ኢሜይል' : 'University Email'} error={errors.email}>
          <Input id="email" type="email" autoComplete="email"
            placeholder={locale === 'am' ? 'ስምዎ@astu.edu.et' : 'yourname@astu.edu.et'}
            value={form.email} onChange={(e) => field('email', e.target.value)} disabled />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t.password} error={errors.password}>
            <PasswordInput id="password" autoComplete="new-password" placeholder="••••••••"
              value={form.password} onChange={(e) => field('password', e.target.value)} disabled />
          </FormField>
          <FormField label={locale === 'am' ? 'የይለፍ ቃል አረጋግጥ' : 'Confirm Password'} error={errors.confirmPassword}>
            <PasswordInput id="confirm-password" autoComplete="new-password" placeholder="••••••••"
              value={form.confirmPassword} onChange={(e) => field('confirmPassword', e.target.value)} disabled />
          </FormField>
        </div>

        <Button type="submit" fullWidth size="lg" icon={<ArrowRight className="h-4 w-4" />} disabled>
          {t.createAccount}
        </Button>
      </form>
    </AuthLayout>
  );
}
