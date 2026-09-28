import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LanguageSelector } from './LanguageSelector';

export const AuthModal: React.FC = () => {
  const { isAuthenticated, login, language, t } = useApp();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!identifier.trim() || !password.trim()) {
      setErrorMsg(t('invalidCredentials'));
      return;
    }

    const success = login(identifier.trim(), password.trim());
    if (!success) {
      setErrorMsg(t('invalidCredentials'));
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-8">
        <header className="border-b border-slate-200 bg-slate-50 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 text-white flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold tracking-tight text-slate-900">{t('brandName')}</div>
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                  {language === 'am' ? 'የካምፓሱ ተያያዥ እና የተጠቃሚ ደህንነት' : 'University Access & Security Management'}
                </div>
              </div>
            </div>
            <LanguageSelector />
          </div>
        </header>

        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('signInTitle')}</h1>
            <p className="mt-1 text-sm text-slate-600">{t('signInSubtitle')}</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label htmlFor="campusgate-identifier" className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1.5">
                {t('emailOrId')}
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input
                  id="campusgate-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={language === 'am' ? 'የተማሪ መለያ / ኢሜል' : 'University ID or email'}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 bg-slate-50 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="campusgate-password" className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {t('password')}
                </label>
                <button type="button" className="text-[11px] font-medium text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline">
                  {t('forgotPassword')}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input
                  id="campusgate-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 bg-slate-50 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span>{t('rememberMe')}</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-semibold transition-colors hover:bg-slate-800"
            >
              <span>{t('signInButton')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 leading-relaxed">
            {language === 'am'
              ? 'የሚፈለገው እንደ ተቀባይ ተጠቃሚ ነው። እውቂያ ለማስገባት በስክር የተፈቀደ መረጃ ብቻ ይቀበላል።'
              : 'Authorized users only. Access is granted to verified university staff, students, and security personnel.'}
          </div>
        </div>
      </div>
    </div>
  );
};
