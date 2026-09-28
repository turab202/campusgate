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

export default function RegisterPage() {
  const router = useRouter();
  const { registerStudent, language } = useApp();
  const [locale, setLocale] = useState<Locale>(language === 'am' ? 'am' : 'en');

  useEffect(() => {
    setLocale(language === 'am' ? 'am' : 'en');
  }, [language]);

  const [form, setForm] = useState({
    name: '',
    studentId: '',
    department: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const t = dictionary[locale];

  const validate = () => {
    const newErrors: Partial<typeof form> = {};
    if (!form.name.trim()) newErrors.name = locale === 'am' ? 'ሙሉ ስም ያስፈልጋል' : 'Full name is required';
    if (!form.studentId.trim()) newErrors.studentId = locale === 'am' ? 'የዩኒቨርሲቲ መለያ ያስፈልጋል' : 'University ID is required';
    if (!form.department.trim()) newErrors.department = locale === 'am' ? 'ክፍል ያስፈልጋል' : 'Department is required';
    if (!form.email.trim()) newErrors.email = locale === 'am' ? 'ኢሜይል ያስፈልጋል' : 'Email is required';
    if (!form.password) newErrors.password = locale === 'am' ? 'የይለፍ ቃል ያስፈልጋል' : 'Password is required';
    if (form.password && form.password.length < 6) newErrors.password = locale === 'am' ? 'የይለፍ ቃሉ ቢያንስ 6 ቁምፊ መሆን አለበት' : 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = locale === 'am' ? 'የይለፍ ቃሎቹ አይዛመዱም' : 'Passwords do not match';
    return newErrors;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSuccess(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    const result = registerStudent({
      name: form.name,
      studentId: form.studentId,
      department: form.department,
      email: form.email,
      phone: form.phone,
      password: form.password
    });

    if (!result.success) {
      setSubmitError(result.message);
      return;
    }

    setSuccess(result.message);
    setTimeout(() => router.push('/'), 1200);
  };

  const field = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <AuthLayout
      locale={locale}
      title={t.registerTitle}
      subtitle={t.registerSubtitle}
      footer={
        <div className="flex items-center justify-between gap-3 border-t border-[var(--cg-border)] pt-5 text-sm text-[var(--cg-text-muted)]">
          <span>{t.haveAccount}</span>
          <Link href="/login" className="font-semibold text-[var(--cg-primary)] transition-colors hover:text-[var(--cg-primary-hover)]">
            {t.loginInstead}
          </Link>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {submitError ? <Alert variant="danger">{submitError}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.fullName} error={errors.name}>
            <Input
              id="full-name"
              type="text"
              autoComplete="name"
              placeholder={locale === 'am' ? 'ሙሉ ስምዎን ያስገቡ' : 'Your full name'}
              value={form.name}
              onChange={(e) => field('name', e.target.value)}
              aria-invalid={!!errors.name}
            />
          </FormField>

          <FormField label={locale === 'am' ? 'የዩኒቨርሲቲ መለያ' : 'University ID'} error={errors.studentId}>
            <Input
              id="student-id"
              type="text"
              autoComplete="off"
              placeholder="ASTU-2024-01234"
              value={form.studentId}
              onChange={(e) => field('studentId', e.target.value)}
              aria-invalid={!!errors.studentId}
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.department} error={errors.department}>
            <Input
              id="department"
              type="text"
              placeholder={locale === 'am' ? 'ለምሳሌ: ሶፍትዌር ምህንድስና' : 'e.g. Software Engineering'}
              value={form.department}
              onChange={(e) => field('department', e.target.value)}
              aria-invalid={!!errors.department}
            />
          </FormField>

          <FormField label={t.phone}>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+251 91 000 0000"
              value={form.phone}
              onChange={(e) => field('phone', e.target.value)}
            />
          </FormField>
        </div>

        <FormField label={locale === 'am' ? 'የዩኒቨርሲቲ ኢሜይል' : 'University Email'} error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={locale === 'am' ? 'ስምዎ@astu.edu.et' : 'yourname@astu.edu.et'}
            value={form.email}
            onChange={(e) => field('email', e.target.value)}
            aria-invalid={!!errors.email}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.password} error={errors.password}>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => field('password', e.target.value)}
              aria-invalid={!!errors.password}
            />
          </FormField>

          <FormField label={locale === 'am' ? 'የይለፍ ቃል አረጋግጥ' : 'Confirm Password'} error={errors.confirmPassword}>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => field('confirmPassword', e.target.value)}
              aria-invalid={!!errors.confirmPassword}
            />
          </FormField>
        </div>

        <div className="rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 py-3 text-xs leading-6 text-[var(--cg-text-muted)]">
          {t.formHelp}
        </div>

        <Button type="submit" fullWidth size="lg" icon={<ArrowRight className="h-4 w-4" />}>
          {t.createAccount}
        </Button>
      </form>
    </AuthLayout>
  );
}
