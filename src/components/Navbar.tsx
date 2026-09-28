import React, { useState } from 'react';
import {
  Shield,
  Bell,
  MapPin,
  LogOut,
  GraduationCap,
  ShieldCheck,
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

  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  const gates = campusStore.getGates();
  const incidents = campusStore.getIncidents();
  const openIncidentsCount = incidents.filter((i) => i.status === 'OPEN').length;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm text-slate-900 border-b border-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.04)] select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-white">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900">
            {t('brandName')}
          </span>
        </div>

        {role === 'OFFICER' && currentUser && (
          <div className="hidden sm:flex items-center bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 space-x-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-600 font-medium text-[11px]">{t('currentGate')}:</span>
            <select
              value={currentGateId}
              onChange={(e) => setCurrentGateId(e.target.value)}
              className="bg-transparent text-slate-900 font-semibold text-xs focus:outline-none cursor-pointer"
            >
              {gates.map((g) => (
                <option key={g.id} value={g.id} className="bg-white text-slate-900">
                  {language === 'am' ? g.nameAmharic : g.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <LanguageSelector />

          <div className="relative">
            <button
              onClick={() => setShowNotificationMenu(!showNotificationMenu)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative border border-transparent hover:border-slate-200 cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {openIncidentsCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-rose-500 rounded-full" />
              )}
            </button>

            {showNotificationMenu && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white text-slate-800 rounded-xl shadow-lg border border-slate-200 p-3 z-50"
                onMouseLeave={() => setShowNotificationMenu(false)}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-bold text-slate-700">
                  <span>{t('navNotifications')}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                    {openIncidentsCount} Active
                  </span>
                </div>
                <div className="py-2 space-y-1.5 text-xs">
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="font-bold text-rose-700 block text-[11px]">Lost Device Alert</span>
                    <span className="text-slate-600 text-[10px] block">
                      Dell XPS 13 reported lost and requires review.
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="font-bold text-slate-800 block text-[11px]">Exit Pass Validated</span>
                    <span className="text-slate-600 text-[10px] block">
                      Access record approved for the current check-out window.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {currentUser && (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="hidden sm:flex items-center space-x-1.5 text-xs">
                {role === 'OFFICER' && <UserCheck className="w-3.5 h-3.5 text-slate-500" />}
                {role === 'STUDENT' && <GraduationCap className="w-3.5 h-3.5 text-slate-500" />}
                {role === 'ADMIN' && <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />}
                <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                  {currentUser.name}
                </span>
              </div>

              <button
                onClick={logout}
                title={t('signOut')}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
