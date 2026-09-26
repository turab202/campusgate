import React, { useState } from 'react';
import {
  Shield,
  Lock,
  User,
  ArrowRight,
  UserPlus,
  KeyRound,
  CheckCircle2,
  Building,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { campusStore } from '../services/storage';

import { LanguageSelector } from './LanguageSelector';

export const AuthModal: React.FC = () => {
  const {
    isAuthenticated,
    login,
    registerStudent,
    language,
    setLanguage,
    t,
    showToast
  } = useApp();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [selectedRole, setSelectedRole] = useState<UserRole>('OFFICER');
  const [identifier, setIdentifier] = useState('GO-023');
  const [password, setPassword] = useState('gate1234');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Register form state (for students)
  const [regFullName, setRegFullName] = useState('');
  const [regStudentId, setRegStudentId] = useState('ASTU-2024-');
  const [regDepartment, setRegDepartment] = useState('Software Engineering');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('+251 9');
  const [regPassword, setRegPassword] = useState('');

  // Switch role preset credentials in login
  const handleSelectRole = (r: UserRole) => {
    setSelectedRole(r);
    setErrorMsg(null);
    if (r === 'OFFICER') {
      setIdentifier('GO-023');
      setPassword('gate1234');
    } else if (r === 'STUDENT') {
      setIdentifier('ASTU-2024-01234');
      setPassword('student1234');
    } else if (r === 'ADMIN') {
      setIdentifier('admin@astu.security.et');
      setPassword('admin1234');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg(t('invalidCredentials'));
      return;
    }

    const success = login(identifier.trim(), password.trim(), selectedRole);
    if (!success) {
      setErrorMsg(t('invalidCredentials'));
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regFullName.trim() || !regStudentId.trim() || !regPassword.trim()) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    const res = registerStudent({
      name: regFullName.trim(),
      studentId: regStudentId.trim().toUpperCase(),
      department: regDepartment,
      email: regEmail.trim() || `${regStudentId.toLowerCase()}@astu.edu.et`,
      phone: regPhone.trim(),
      password: regPassword.trim()
    });

    if (!res.success) {
      setErrorMsg(res.message);
    }
  };

  // If already authenticated, do not show
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-purple-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
        
        {/* Header Header Banner */}
        <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white p-6 sm:p-8 relative">
          {/* Advanced Language Selector in Header */}
          <div className="absolute top-5 right-5">
            <LanguageSelector />
          </div>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-800/90 border border-purple-400/40 flex items-center justify-center text-purple-200 shadow-inner">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight text-white block">
                {t('brandName')}
              </span>
              <span className="text-[11px] text-purple-200 font-medium">
                {t('subBrand')}
              </span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mt-4">
            {mode === 'LOGIN' ? t('signInTitle') : t('registerTitle')}
          </h2>
          <p className="text-xs text-purple-200 mt-1 max-w-md">
            {mode === 'LOGIN' ? t('signInSubtitle') : t('registerSubtitle')}
          </p>

          {/* Mode Switch Pills */}
          <div className="flex bg-purple-900/80 p-1 rounded-xl border border-purple-700 mt-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === 'LOGIN' ? 'bg-white text-purple-950 font-bold shadow-xs' : 'text-purple-200 hover:text-white'
              }`}
            >
              {language === 'am' ? 'ግባ (Sign In)' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === 'REGISTER' ? 'bg-white text-purple-950 font-bold shadow-xs' : 'text-purple-200 hover:text-white'
              }`}
            >
              {language === 'am' ? 'አዲስ መለያ ፍጠር (Register)' : 'New Student Account'}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {mode === 'LOGIN' ? (
            /* =================== LOGIN FORM =================== */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Role Select Bar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {t('selectAccountRole')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { role: 'OFFICER' as UserRole, label: t('asOfficer'), id: 'GO-023' },
                    { role: 'STUDENT' as UserRole, label: t('asStudent'), id: 'ASTU-2024-01234' },
                    { role: 'ADMIN' as UserRole, label: t('asAdmin'), id: 'Admin HQ' }
                  ].map((item) => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => handleSelectRole(item.role)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        selectedRole === item.role
                          ? 'bg-purple-50 border-purple-600 text-purple-950 font-bold ring-2 ring-purple-600/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="block text-xs truncate">{item.label}</span>
                      <span className="block text-[10px] text-purple-800 font-mono mt-0.5 truncate font-medium">
                        {item.id}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ID or Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('emailOrId')}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. GO-023, ASTU-2024-01234, or admin@astu.edu.et"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-purple-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    {t('password')}
                  </label>
                  <button
                    type="button"
                    onClick={() => showToast('Demo password is prepopulated for evaluation.', 'info')}
                    className="text-[11px] text-purple-800 hover:underline font-semibold"
                  >
                    {t('forgotPassword')}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-purple-900 focus:ring-purple-600"
                  />
                  <span>{t('rememberMe')}</span>
                </label>
                <span className="text-[11px] text-slate-400">INSA Gate Clearance</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-purple-950 hover:bg-purple-900 text-white rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-2 mt-4 active:scale-[0.99]"
              >
                <span>{t('signInButton')}</span>
                <ArrowRight className="w-4 h-4 text-purple-300" />
              </button>
            </form>
          ) : (
            /* =================== REGISTER FORM =================== */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('fullName')} *</label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Yonas Tadesse"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('studentId')} *</label>
                  <input
                    type="text"
                    required
                    value={regStudentId}
                    onChange={(e) => setRegStudentId(e.target.value.toUpperCase())}
                    placeholder="ASTU-2024-XXXXX"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('phone')}</label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+251 91 123 4567"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('department')}</label>
                <select
                  value={regDepartment}
                  onChange={(e) => setRegDepartment(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600"
                >
                  <option value="Software Engineering">Software Engineering</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Electrical & Computer Engineering">Electrical & Computer Engineering</option>
                  <option value="Information Systems">Information Systems</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Architecture & Planning">Architecture & Planning</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('password')} *</label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create a secure password"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-950 hover:bg-purple-900 text-white rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-2 mt-4"
              >
                <span>{t('registerButton')}</span>
                <ArrowRight className="w-4 h-4 text-purple-300" />
              </button>
            </form>
          )}

          {/* Quick Demo Fast-Track Access */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {t('quickDemoLogin')}
              </span>
              <span className="text-[10px] text-purple-700 font-semibold">1-Click Direct Demo</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => login('GO-023', 'gate1234', 'OFFICER')}
                className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-950 text-center font-semibold border border-purple-200 transition-colors"
              >
                Officer (Gate 1)
              </button>
              <button
                type="button"
                onClick={() => login('ASTU-2024-01234', 'student1234', 'STUDENT')}
                className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-950 text-center font-semibold border border-purple-200 transition-colors"
              >
                Student (Zahra M.)
              </button>
              <button
                type="button"
                onClick={() => login('admin@astu.security.et', 'admin1234', 'ADMIN')}
                className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-950 text-center font-semibold border border-purple-200 transition-colors"
              >
                Admin (HQ)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
