import React, { useState } from 'react';
import {
  ShieldCheck,
  Bell,
  MapPin,
  LogOut,
  GraduationCap,
  UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { campusStore } from '../services/storage';
import { LanguageSelector } from './LanguageSelector';

export const Navbar: React.FC = () => {
  const {
    role,
    currentUser,
    logout,
    language,
    t,
    currentGateId,
    setCurrentGateId
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);

  const gates = campusStore.getGates();
  const incidents = campusStore.getIncidents();
  const openCount = incidents.filter((i) => i.status === 'OPEN').length;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-soft)] select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--cg-primary)] text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="font-semibold text-base tracking-tight text-[var(--cg-text)]">
            CampusGate
          </span>
        </div>

        {/* Gate selector for officers */}
        {role === 'OFFICER' && currentUser && (
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-2.5 py-1.5 text-xs">
            <MapPin className="h-3.5 w-3.5 text-[var(--cg-text-muted)] shrink-0" />
            <span className="text-[var(--cg-text-muted)] font-medium text-[11px]">{t('currentGate')}:</span>
            <select
              value={currentGateId}
              onChange={(e) => setCurrentGateId(e.target.value)}
              className="bg-transparent text-[var(--cg-text)] font-semibold text-xs focus:outline-none cursor-pointer"
              aria-label="Select gate"
            >
              {gates.map((g) => (
                <option key={g.id} value={g.id}>
                  {language === 'am' ? g.nameAmharic : g.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <LanguageSelector />

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-lg border border-transparent p-1.5 text-[var(--cg-text-muted)] transition-colors hover:border-[var(--cg-border)] hover:bg-[var(--cg-surface-muted)] hover:text-[var(--cg-text)]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {openCount > 0 && (
                <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-[var(--cg-danger)]" />
              )}
            </button>

            {showNotifications && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-card)] z-50"
                onMouseLeave={() => setShowNotifications(false)}
              >
                <div className="flex items-center justify-between border-b border-[var(--cg-border)] px-3 py-2">
                  <span className="text-xs font-semibold text-[var(--cg-text)]">{t('navNotifications')}</span>
                  <span className="rounded bg-[var(--cg-surface-muted)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--cg-text-muted)]">
                    {openCount} active
                  </span>
                </div>
                <div className="p-2 space-y-1.5 text-xs">
                  {openCount > 0 ? (
                    <div className="rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-2.5">
                      <span className="block font-semibold text-[var(--cg-danger)] text-[11px]">Lost Device Alert</span>
                      <span className="block text-[var(--cg-text-muted)] text-[10px] mt-0.5">
                        Dell XPS 13 reported lost — requires review.
                      </span>
                    </div>
                  ) : (
                    <p className="px-2 py-3 text-center text-[var(--cg-text-muted)]">No active alerts</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User info + logout */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-[var(--cg-border)]">
              <div className="hidden sm:flex items-center gap-1.5 text-xs">
                {role === 'OFFICER' && <UserCheck className="h-3.5 w-3.5 text-[var(--cg-text-muted)]" />}
                {role === 'STUDENT' && <GraduationCap className="h-3.5 w-3.5 text-[var(--cg-text-muted)]" />}
                {role === 'ADMIN' && <ShieldCheck className="h-3.5 w-3.5 text-[var(--cg-text-muted)]" />}
                <span className="font-semibold text-[var(--cg-text)] truncate max-w-[120px]">
                  {currentUser.name}
                </span>
              </div>

              <button
                onClick={logout}
                title={t('signOut')}
                aria-label={t('signOut')}
                className="rounded-lg border border-transparent p-1.5 text-[var(--cg-text-muted)] transition-colors hover:border-[var(--cg-border)] hover:bg-[var(--cg-surface-muted)] hover:text-[var(--cg-text)]"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
