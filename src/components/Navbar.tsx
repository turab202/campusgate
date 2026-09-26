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
    <header className="sticky top-0 z-40 bg-purple-950/95 backdrop-blur-md text-white border-b border-purple-800/80 shadow-sm select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        
        {/* Brand: Minimal & Clean */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-purple-800 border border-purple-500/50 flex items-center justify-center text-white shadow-xs">
            <Shield className="w-4 h-4 text-purple-200" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white">
            {t('brandName')}
          </span>
        </div>

        {/* Center: Inline Gate Selector (Officer Only, minimal pill) */}
        {role === 'OFFICER' && currentUser && (
          <div className="hidden sm:flex items-center bg-purple-900/60 border border-purple-700/60 rounded-lg px-2.5 py-1 space-x-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="text-purple-300 font-medium text-[11px]">{t('currentGate')}:</span>
            <select
              value={currentGateId}
              onChange={(e) => setCurrentGateId(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-hidden cursor-pointer"
            >
              {gates.map((g) => (
                <option key={g.id} value={g.id} className="bg-purple-950 text-white">
                  {language === 'am' ? g.nameAmharic : g.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Right: Actions, Language, and User */}
        <div className="flex items-center space-x-2">
          {/* Compact Language Selector */}
          <LanguageSelector />

          {/* Compact Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationMenu(!showNotificationMenu)}
              className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-purple-900 transition-colors relative border border-transparent hover:border-purple-700 cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {openIncidentsCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              )}
            </button>

            {showNotificationMenu && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white text-slate-800 rounded-xl shadow-xl border border-purple-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setShowNotificationMenu(false)}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-bold text-purple-950">
                  <span>{t('navNotifications')}</span>
                  <span className="text-[10px] bg-purple-100 text-purple-900 px-1.5 py-0.2 rounded font-mono">
                    {openIncidentsCount} Active
                  </span>
                </div>
                <div className="py-2 space-y-1.5 text-xs">
                  <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg">
                    <span className="font-bold text-rose-900 block text-[11px]">Lost Device Alert</span>
                    <span className="text-slate-600 text-[10px] block">
                      Dell XPS 13 (8J2M144K90) reported lost.
                    </span>
                  </div>
                  <div className="p-2 bg-purple-50 border border-purple-100 rounded-lg">
                    <span className="font-bold text-purple-950 block text-[11px]">Exit Pass Validated</span>
                    <span className="text-slate-600 text-[10px] block">
                      Projector EB-2250U approved for leave.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill & Sign Out */}
          {currentUser && (
            <div className="flex items-center space-x-2 pl-2 border-l border-purple-800/80">
              <div className="hidden sm:flex items-center space-x-1.5 text-xs">
                {role === 'OFFICER' && <UserCheck className="w-3.5 h-3.5 text-amber-300" />}
                {role === 'STUDENT' && <GraduationCap className="w-3.5 h-3.5 text-emerald-300" />}
                {role === 'ADMIN' && <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />}
                <span className="font-semibold text-white truncate max-w-[120px]">
                  {currentUser.name}
                </span>
              </div>

              <button
                onClick={logout}
                title={t('signOut')}
                className="p-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-rose-900/80 transition-colors border border-transparent hover:border-rose-700/80 cursor-pointer"
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
