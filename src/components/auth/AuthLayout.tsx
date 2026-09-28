import * as React from 'react';
import { ShieldCheck } from 'lucide-react';
import { LanguageSelector } from '@/src/components/LanguageSelector';
import { dictionary, Locale } from '@/src/i18n/dictionary';

interface AuthLayoutProps {
  locale: Locale;
  children: React.ReactNode;
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export function AuthLayout({ locale, children, title, subtitle, footer, rightPanel }: AuthLayoutProps) {
  const copy = dictionary[locale];

  return (
    <div className="min-h-screen bg-[var(--cg-background)] text-[var(--cg-text)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        {/* Left branding panel — hidden on mobile, sticky on desktop */}
        <div className="hidden w-[46%] flex-col justify-center border-r border-[var(--cg-border)] bg-[var(--cg-surface)] px-8 py-8 xl:px-12 2xl:px-16 lg:flex lg:sticky lg:top-0 lg:h-screen">
          <div className="mx-auto w-full max-w-[560px]">
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--cg-primary)] text-white shadow-[var(--cg-shadow-soft)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--cg-text)]">{copy.appName}</div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">
                  {copy.appSubtitle}
                </div>
              </div>
            </div>

            {rightPanel ?? (
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center rounded-full border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">
                    Campus security platform
                  </div>
                  <h2 className="max-w-md text-4xl font-semibold tracking-[-0.05em] text-[var(--cg-text)]">
                    One secure access platform for campus operations.
                  </h2>
                </div>

                <p className="max-w-lg text-base leading-7 text-[var(--cg-text-muted)]">
                  Students, staff, gate officers, and administrators share a unified identity and access experience designed for university operations.
                </p>

                <div className="grid gap-4 pt-2">
                  <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">Student / Staff</div>
                    <div className="mt-2 text-lg font-semibold text-[var(--cg-text)]">Personal portal access</div>
                  </div>
                  <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">Gate Officer</div>
                    <div className="mt-2 text-lg font-semibold text-[var(--cg-text)]">Entry and inspection workflows</div>
                  </div>
                  <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">Administrator</div>
                    <div className="mt-2 text-lg font-semibold text-[var(--cg-text)]">Operational oversight and governance</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right form panel — scrollable */}
        <div className="flex w-full flex-1 items-start justify-center px-4 py-8 sm:px-6 lg:px-8 xl:px-10 lg:items-center lg:py-12">
          <div className="w-full max-w-[520px]">
            {/* Mobile header */}
            <div className="mb-6 flex items-center justify-between gap-4 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cg-primary)] text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-[var(--cg-text)]">{copy.appName}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">
                    {copy.appSubtitle}
                  </div>
                </div>
              </div>
              <LanguageSelector />
            </div>

            <div className="rounded-[26px] border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-card)] sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--cg-text)]">{title}</h1>
                  <p className="text-sm leading-6 text-[var(--cg-text-muted)]">{subtitle}</p>
                </div>
                <div className="hidden lg:block">
                  <LanguageSelector />
                </div>
              </div>

              {children}

              {footer ? <div className="mt-6">{footer}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
