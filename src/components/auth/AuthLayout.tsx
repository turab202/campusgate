import * as React from 'react';
import { ShieldCheck, Lock, Zap, Users } from 'lucide-react';
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

const features = [
  { icon: Lock, label: 'Secure Access', desc: 'Role-based identity for every user' },
  { icon: Zap, label: 'Real-time Tracking', desc: 'Live device movement across all gates' },
  { icon: Users, label: 'Cross-Gate Sync', desc: 'One database shared by every station' },
];

export function AuthLayout({ locale, children, title, subtitle, footer, rightPanel }: AuthLayoutProps) {
  const copy = dictionary[locale];

  return (
    <div className="min-h-screen bg-[var(--cg-background)] text-[var(--cg-text)]">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col lg:flex-row">

        {/* ── Left branding panel ── */}
        <div
          className="hidden lg:flex lg:w-[44%] lg:flex-none flex-col justify-between lg:sticky lg:top-0 lg:h-screen overflow-x-hidden overflow-y-auto"
          style={{ background: 'linear-gradient(145deg, #0F2340 0%, #1E3A5F 45%, #2D5282 100%)' }}
        >
          {/* Decorative circles */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #60A5FA, transparent)' }} />
            <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #93C5FD, transparent)' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #BFDBFE, transparent)' }} />
          </div>

          <div className="relative z-10 flex flex-col h-full px-10 py-10 xl:px-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/20">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight text-white">{copy.appName}</div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">{copy.appSubtitle}</div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex flex-1 flex-col justify-start pt-14">
              {rightPanel ?? (
                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      University Security Platform
                    </div>
                    <h2 className="text-4xl font-bold tracking-[-0.04em] text-white leading-[1.15]">
                      One platform.<br />Every gate.<br />All devices.
                    </h2>
                    <p className="text-base leading-7 text-white/60 max-w-sm">
                      CampusGate replaces fragmented manual records with a centralized, auditable, and secure digital system.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {features.map(({ icon: Icon, label, desc }) => (
                      <div key={label} className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                          <Icon className="h-4 w-4 text-white/80" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{label}</div>
                          <div className="text-[11px] text-white/50">{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom badge */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-white/60">3 gates online · CampusGate</span>
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex w-full flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-10 xl:px-16">
          {/* Mobile header */}
          <div className="mb-6 flex w-full max-w-[480px] items-center justify-between lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cg-primary)] text-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-base font-bold text-[var(--cg-text)]">{copy.appName}</div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">{copy.appSubtitle}</div>
              </div>
            </div>
            <LanguageSelector />
          </div>

          <div className="w-full max-w-[480px]">
            {/* Card */}
            <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-6 shadow-[var(--cg-shadow-card)] sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-[-0.04em] text-[var(--cg-text)]">{title}</h1>
                  <p className="mt-1 text-sm leading-5 text-[var(--cg-text-muted)]">{subtitle}</p>
                </div>
                <div className="hidden lg:block shrink-0">
                  <LanguageSelector />
                </div>
              </div>

              {children}

              {footer ? <div className="mt-5">{footer}</div> : null}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
