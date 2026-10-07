'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { translations, Language } from '../i18n/translations';
import { Gate, GateOfficer, Student, UserRole } from '../types';
import { campusStore } from '../services/storage';
import { AuthUser, BackendRole, loginApi, meApi, meToAuthUser } from '../services/authService';
import { ApiError, clearToken, getToken, setToken } from '../services/api';
import { listGatesApi } from '../services/gateService';

// ---------------------------------------------------------------------------
// Backend role → frontend UserRole
// ---------------------------------------------------------------------------

function toFrontendRole(r: BackendRole): UserRole {
  if (r === 'GATE_OFFICER') return 'OFFICER';
  if (r === 'ADMIN') return 'ADMIN';
  return 'STUDENT'; // STUDENT + STAFF share the student-facing portal
}

function toCurrentStudent(authUser: AuthUser | null, fallback: Student): Student {
  if (!authUser || (authUser.role !== 'STUDENT' && authUser.role !== 'STAFF')) return fallback;

  const campusId = authUser.campus_id ?? authUser.email.split('@')[0] ?? 'STUDENT';
  return {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    role: 'STUDENT',
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.name)}&background=1E3A5F&color=fff&size=128`,
    phone: authUser.phone ?? '',
    studentId: campusId,
    department: 'Campus Access',
    batchYear: new Date().getFullYear(),
    status: authUser.is_active ? 'ACTIVE' : 'SUSPENDED',
  };
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface AppContextType {
  role: UserRole;
  currentUser: { id: string; name: string; email: string; role: UserRole; identifier: string } | null;
  authUser: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en, params?: Record<string, string>) => string;
  currentGateId: string;
  setCurrentGateId: (gateId: string) => void;
  currentGate: Gate;
  activeOfficer: GateOfficer;
  setActiveOfficerId: (officerId: string) => void;
  currentStudent: Student;
  setCurrentStudentId: (studentId: string) => void;
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  toast: { message: string; type: 'success' | 'warning' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  resetAllData: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeDemoAction: string | null;
  triggerDemoStep: (stepNumber: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const emptyGate = (): Gate => ({
  id: '',
  code: 'N/A',
  name: 'No gate assigned',
  nameAmharic: 'የተመደበ በር የለም',
  locationDescription: '',
  status: 'ACTIVE',
  todayStats: { checkIns: 0, checkOuts: 0, visitors: 0, incidents: 0 },
});

const emptyOfficer = (): GateOfficer => ({
  id: '',
  name: 'No officer assigned',
  email: '',
  role: 'OFFICER',
  avatarUrl: '',
  phone: '',
  officerBadgeId: 'N/A',
  assignedGateId: '',
  currentShift: 'OFFLINE',
  stationStatus: 'OFF_DUTY',
});

const emptyStudent = (): Student => ({
  id: '',
  name: 'No user',
  email: '',
  role: 'STUDENT',
  avatarUrl: '',
  phone: '',
  studentId: 'N/A',
  department: 'Not assigned',
  batchYear: new Date().getFullYear(),
  status: 'ACTIVE',
});

// ---------------------------------------------------------------------------
// localStorage helpers (SSR-safe)
// ---------------------------------------------------------------------------

function ls(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, v: string) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, v); } catch { /* ignore */ }
}
function lsRemove(key: string) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(key); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── Real auth state ──────────────────────────────────────────────────────
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // ── Language ─────────────────────────────────────────────────────────────
  const [language, setLanguageState] = useState<Language>(
    () => (ls('cg_lang') as Language) ?? 'en',
  );

  // ── Gate / officer / student (mock-backed for non-integrated workflows) ──
  const [currentGateId, setCurrentGateIdState] = useState<string>(
    () => ls('cg_gateId') ?? 'gate-1',
  );
  const [activeOfficerId, setActiveOfficerIdState] = useState<string>('off-1');
  const [currentStudentId, setCurrentStudentIdState] = useState<string>('stud-1');
  const [liveGates, setLiveGates] = useState<Gate[]>([]);

  useEffect(() => {
    if (authUser && (authUser.role === 'STUDENT' || authUser.role === 'STAFF')) {
      setCurrentStudentIdState(authUser.id);
    }
  }, [authUser]);

  useEffect(() => {
    if (!authUser) {
      setLiveGates([]);
      return;
    }

    if (authUser.role === 'ADMIN' || authUser.role === 'GATE_OFFICER') {
      listGatesApi()
        .then((gates) => {
          const mapped: Gate[] = gates.map((gate) => ({
            id: gate.id,
            code: gate.code,
            name: gate.name,
            nameAmharic: gate.name,
            locationDescription: gate.location ?? '',
            status: 'ACTIVE',
            todayStats: { checkIns: 0, checkOuts: 0, visitors: 0, incidents: 0 },
          }));
          setLiveGates(mapped);
          if (mapped.length > 0 && !mapped.some((g) => g.id === currentGateId)) {
            setCurrentGateIdState(mapped[0].id);
          }
        })
        .catch(() => setLiveGates([]));
    } else {
      setLiveGates([]);
    }
  }, [authUser, currentGateId]);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [isOffline, setIsOffline] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('gate_scan');
  const [activeDemoAction, setActiveDemoAction] = useState<string | null>(null);

  // Sync mock store re-renders
  const [, setStoreTick] = useState(0);
  useEffect(() => campusStore.subscribe(() => setStoreTick((t) => t + 1)), []);

  // Derived mock entities
  const gates = liveGates.length > 0 ? liveGates : campusStore.getGates();
  const currentGate = gates.find((g) => g.id === currentGateId) ?? emptyGate();
  const officers = campusStore.getOfficers();
  const activeOfficer = officers.find((o) => o.id === activeOfficerId) ?? emptyOfficer();
  const students = campusStore.getStudents();
  const fallbackStudent = students.find((s) => s.id === currentStudentId) ?? emptyStudent();
  const currentStudent = toCurrentStudent(authUser, fallbackStudent);

  // Derived auth values
  const role: UserRole = authUser ? toFrontendRole(authUser.role) : 'STUDENT';
  const currentUser = authUser
    ? { id: authUser.id, name: authUser.name, email: authUser.email, role, identifier: authUser.campus_id ?? authUser.email }
    : null;
  const isAuthenticated = authUser !== null;

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // ── Role side-effects ─────────────────────────────────────────────────────
  const applyRoleSideEffects = useCallback((r: UserRole) => {
    if (r === 'OFFICER') {
      setActiveTab('gate_scan');
      if (!ls('cg_lang_manually_set')) setLanguageState('am');
    } else if (r === 'STUDENT') {
      setActiveTab('student_devices');
    } else if (r === 'ADMIN') {
      setActiveTab('admin_dashboard');
    }
  }, []);

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) { setIsAuthLoading(false); return; }

    meApi()
      .then((me) => {
        const user = meToAuthUser(me);
        setAuthUser(user);
        applyRoleSideEffects(toFrontendRole(user.role));
      })
      .catch(() => clearToken())
      .finally(() => setIsAuthLoading(false));
  }, [applyRoleSideEffects]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    try {
      const tokenResp = await loginApi(email, password);
      setToken(tokenResp.access_token);
      const me = await meApi();
      const user = meToAuthUser(me);
      setAuthUser(user);
      applyRoleSideEffects(toFrontendRole(user.role));
      showToast(`Welcome, ${user.name}`, 'success');
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed. Please try again.';
      setAuthError(message);
      showToast(message, 'error');
      return false;
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    clearToken();
    setAuthUser(null);
    lsRemove('cg_lang_manually_set');
    showToast('Signed out of CampusGate', 'info');
  };

  // ── Language ──────────────────────────────────────────────────────────────
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    lsSet('cg_lang', lang);
    lsSet('cg_lang_manually_set', 'true');
  };

  const setCurrentGateId = (gateId: string) => {
    setCurrentGateIdState(gateId);
    lsSet('cg_gateId', gateId);
  };

  const resetAllData = () => {
    campusStore.resetAll();
    showToast('Demo data reset to baseline.', 'info');
  };

  // ── Translation ───────────────────────────────────────────────────────────
  const t = (key: keyof typeof translations.en, params?: Record<string, string>): string => {
    const dict = translations[language] ?? translations.en;
    let text = dict[key] ?? translations.en[key] ?? String(key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      });
    }
    return text;
  };

  // ── Demo steps ────────────────────────────────────────────────────────────
  const triggerDemoStep = (stepNumber: number) => {
    setActiveDemoAction(`DEMO_${stepNumber}`);
    if (stepNumber === 1) { setActiveTab('gate_enroll'); showToast('DEMO 1: Ready to enroll new device.', 'info'); }
    else if (stepNumber === 2) { setActiveTab('gate_scan'); showToast('DEMO 2: Searching device for CHECK OUT.', 'info'); }
    else if (stepNumber === 3) { setCurrentGateId('gate-3'); setActiveTab('gate_scan'); showToast('DEMO 3: Switched to Gate 3.', 'warning'); }
    else if (stepNumber === 4) { setCurrentGateId('gate-2'); setActiveTab('gate_scan'); showToast('DEMO 4: Scanning LOST device.', 'warning'); }
    else if (stepNumber === 5) { setActiveTab('gate_visitors'); showToast('DEMO 5: Verifying visitor pass.', 'info'); }
    else if (stepNumber === 6) { setActiveTab('admin_dashboard'); showToast('DEMO 6: Opened Security Command.', 'info'); }
  };

  return (
    <AppContext.Provider value={{
      role, currentUser, authUser, isAuthenticated, isAuthLoading, authError,
      login, logout,
      language, setLanguage, t,
      currentGateId, setCurrentGateId, currentGate,
      activeOfficer, setActiveOfficerId: setActiveOfficerIdState,
      currentStudent, setCurrentStudentId: setCurrentStudentIdState,
      isOffline, setIsOffline,
      toast, showToast,
      resetAllData,
      activeTab, setActiveTab,
      activeDemoAction, triggerDemoStep,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
