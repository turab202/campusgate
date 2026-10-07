import React, { useEffect, useState } from 'react';
import { ShieldCheck, Bell, MapPin, LogOut, GraduationCap, UserCheck, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { listGatesApi } from '../services/gateService';
import { listIncidentsApi } from '../services/incidentService';
import { LanguageSelector } from './LanguageSelector';

const ROLE_CONFIG = {
  STUDENT: { label: 'Student', icon: GraduationCap, color: 'text-[var(--cg-info)]', bg: 'bg-[var(--cg-info-bg)] border-[var(--cg-info-border)]' },
  OFFICER: { label: 'Gate Officer', icon: UserCheck, color: 'text-[var(--cg-success)]', bg: 'bg-[var(--cg-success-bg)] border-[var(--cg-success-border)]' },
  ADMIN: { label: 'Administrator', icon: ShieldCheck, color: 'text-[var(--cg-primary)]', bg: 'bg-[var(--cg-primary-light)] border-[var(--cg-border)]' },
};

export const Navbar: React.FC = () => {
  const { role, currentUser, logout, language, t, currentGateId, setCurrentGateId } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [gates, setGates] = useState<{ id: string; name: string; nameAmharic: string }[]>([]);
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    const loadLiveMeta = async () => {
      if (!currentUser) {
        setGates([]);
        setOpenCount(0);
        return;
      }

      try {
        const [gateResults, incidentResults] = await Promise.all([
          listGatesApi(),
          listIncidentsApi({ status: 'OPEN' }),
        ]);

        const mappedGates = gateResults.map((gate) => ({
          id: gate.id,
          name: gate.name,
          nameAmharic: gate.name,
        }));

        setGates(mappedGates);
        setOpenCount(incidentResults.length);
      } catch {
        setGates([]);
        setOpenCount(0);
      }
    };

    loadLiveMeta();
  }, [currentUser]);

  const roleConf = ROLE_CONFIG[role] ?? ROLE_CONFIG.STUDENT;
  const RoleIcon = roleConf.icon;

  const initials = currentUser?.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-xs)]">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--cg-primary)] text-white shadow-[var(--cg-shadow-xs)]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-[var(--cg-text)]">CampusGate</span>
          <span className="hidden sm:block text-[var(--cg-border)]">·</span>
          <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${roleConf.bg} ${roleConf.color}`}>
            <RoleIcon className="h-3 w-3" />
            {roleConf.label}
          </span>
        </div>

        {/* Gate selector for officers */}
        {role === 'OFFICER' && currentUser && (
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 py-1.5 text-xs">
            <MapPin className="h-3.5 w-3.5 text-[var(--cg-text-muted)] shrink-0" />
            <span className="text-[var(--cg-text-muted)] font-medium">{t('currentGate')}:</span>
            <select
              value={currentGateId}
              onChange={(e) => setCurrentGateId(e.target.value)}
              className="bg-transparent text-[var(--cg-text)] font-semibold text-xs focus:outline-none cursor-pointer"
              aria-label="Select gate"
            >
              {gates.map((g) => (
                <option key={g.id} value={g.id}>{language === 'am' ? g.nameAmharic : g.name}</option>
              ))}
            </select>
            <ChevronDown className="h-3 w-3 text-[var(--cg-text-muted)]" />
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
                <span className="absolute right-1 top-1 flex h-2 w-2 items-center justify-center rounded-full bg-[var(--cg-danger)]">
                  <span className="h-2 w-2 animate-ping rounded-full bg-[var(--cg-danger)] opacity-75 absolute" />
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-card)] z-50"
                onMouseLeave={() => setShowNotifications(false)}
              >
                <div className="flex items-center justify-between border-b border-[var(--cg-border)] px-4 py-2.5">
                  <span className="text-xs font-semibold text-[var(--cg-text)]">{t('navNotifications')}</span>
                  {openCount > 0 && (
                    <span className="rounded-full bg-[var(--cg-danger-bg)] border border-[var(--cg-danger-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--cg-danger)]">
                      {openCount} active
                    </span>
                  )}
                </div>
                <div className="p-2 space-y-1.5 text-xs">
                  {openCount > 0 ? (
                    <div className="rounded-lg border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-3">
                      <span className="block font-semibold text-[var(--cg-danger)] text-[11px]">Lost Device Alert</span>
                      <span className="block text-[var(--cg-text-muted)] text-[10px] mt-0.5">Dell XPS 13 reported lost — requires review.</span>
                    </div>
                  ) : (
                    <p className="px-2 py-3 text-center text-[var(--cg-text-muted)]">No active alerts</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User pill */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-[var(--cg-border)]">
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--cg-primary)] text-white text-[11px] font-bold">
                  {initials}
                </div>
                <span className="text-xs font-semibold text-[var(--cg-text)] max-w-[110px] truncate">{currentUser.name}</span>
              </div>
              <button
                onClick={logout}
                title={t('signOut')}
                aria-label={t('signOut')}
                className="rounded-lg border border-transparent p-1.5 text-[var(--cg-text-muted)] transition-colors hover:border-[var(--cg-border)] hover:bg-[var(--cg-danger-bg)] hover:text-[var(--cg-danger)]"
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
