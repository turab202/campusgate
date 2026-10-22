'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { translations, Language } from '../i18n/translations';
import { Gate, GateOfficer, Student, UserRole } from '../types';
import { campusStore } from '../services/storage';
import { AuthUser, BackendRole, loginApi, logoutApi, meApi, meToAuthUser } from '../services/authService';
import { ApiError, SESSION_EXPIRED_EVENT } from '../services/api';
import { GateAssignmentRead, getCurrentAssignmentApi, listGatesApi } from '../services/gateService';
import { listMovementsApi } from '../services/movementService';

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
  isGateContextLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  syncAuthUser: (user: AuthUser) => void;
  logout: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en, params?: Record<string, string>) => string;
  currentGate: Gate;
  activeOfficer: GateOfficer;
  currentStudent: Student;
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
  todayStats: { checkIns: null, checkOuts: null, visitors: null, incidents: null },
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
  const sessionExpiryHandled = useRef(false);

  // ── Language ─────────────────────────────────────────────────────────────
  const [language, setLanguageState] = useState<Language>(
    () => (ls('cg_lang') as Language) ?? 'en',
  );

  // ── Operational context from the backend ──────────────────────────────────
  const [currentGateId, setCurrentGateIdState] = useState('');
  const [activeAssignment, setActiveAssignment] = useState<GateAssignmentRead | null>(null);
  const [liveGates, setLiveGates] = useState<Gate[]>([]);
  const [isGateContextLoading, setIsGateContextLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    let isRefreshing = false;

    if (!authUser) {
      setLiveGates([]);
      setActiveAssignment(null);
      setCurrentGateIdState('');
      setIsGateContextLoading(false);
      return () => { isCurrent = false; };
    }

    if (authUser.role !== 'ADMIN' && authUser.role !== 'GATE_OFFICER') {
      setLiveGates([]);
      setActiveAssignment(null);
      setCurrentGateIdState('');
      setIsGateContextLoading(false);
      return () => { isCurrent = false; };
    }

    const loadOperationalContext = async (showLoading: boolean) => {
      if (isRefreshing) return;
      isRefreshing = true;
      if (showLoading) setIsGateContextLoading(true);
      try {
        const gates = await listGatesApi();
        if (!isCurrent) return;
        const mapped: Gate[] = gates.map((gate) => ({
          id: gate.id,
          code: gate.code,
          name: gate.name,
          nameAmharic: gate.name,
          locationDescription: gate.location ?? '',
          status: gate.is_active ? 'ACTIVE' : 'CLOSED',
          todayStats: { checkIns: null, checkOuts: null, visitors: null, incidents: null },
        }));

        if (authUser.role === 'GATE_OFFICER') {
          const assignment = await getCurrentAssignmentApi();
          if (!isCurrent) return;
          const assignedGate = mapped.find((gate) => gate.id === assignment.gate_id);
          if (!assignedGate) throw new Error('Assigned gate is unavailable.');
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          const movements = await listMovementsApi({
            gate_id: assignment.gate_id,
            from_date: startOfDay,
          });
          if (!isCurrent) return;
          const liveGate = {
            ...assignedGate,
            todayStats: {
              ...assignedGate.todayStats,
              checkIns: movements.filter((movement) => movement.movement_type === 'CHECK_IN').length,
              checkOuts: movements.filter((movement) => movement.movement_type === 'CHECK_OUT').length,
            },
          };
          setActiveAssignment(assignment);
          setLiveGates([liveGate]);
          setCurrentGateIdState(liveGate.id);
          return;
        }

        setActiveAssignment(null);
        setLiveGates(mapped);
        setCurrentGateIdState(mapped[0]?.id ?? '');
      } catch {
        if (isCurrent) {
          if (showLoading) {
            setLiveGates([]);
            setActiveAssignment(null);
            setCurrentGateIdState('');
          }
        }
      } finally {
        isRefreshing = false;
        if (isCurrent && showLoading) setIsGateContextLoading(false);
      }
    };

    void loadOperationalContext(true);
    const refresh = () => {
      if (document.visibilityState === 'visible') void loadOperationalContext(false);
    };
    const intervalId = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => {
      isCurrent = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
    };
  }, [authUser]);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [isOffline, setIsOffline] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('gate_scan');
  const [activeDemoAction, setActiveDemoAction] = useState<string | null>(null);

  const currentGate = liveGates.find((gate) => gate.id === currentGateId) ?? emptyGate();
  const shiftTime = (value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const activeOfficer: GateOfficer = authUser?.role === 'GATE_OFFICER'
    ? {
        ...emptyOfficer(),
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.name)}&size=128`,
        phone: authUser.phone ?? '',
        officerBadgeId: authUser.campus_id ?? 'N/A',
        assignedGateId: activeAssignment?.gate_id ?? '',
        currentShift: activeAssignment
          ? `${shiftTime(activeAssignment.start_time)} – ${activeAssignment.end_time ? shiftTime(activeAssignment.end_time) : 'Open-ended'}`
          : 'No active assignment',
        stationStatus: activeAssignment ? 'ON_DUTY' : 'OFF_DUTY',
      }
    : emptyOfficer();
  const currentStudent = toCurrentStudent(authUser, emptyStudent());

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

  useEffect(() => {
    if (!authUser) return;

    const handleSessionExpired = () => {
      if (sessionExpiryHandled.current) return;
      sessionExpiryHandled.current = true;
      setAuthUser(null);
      setAuthError('Your session expired. Please sign in again.');
      void logoutApi().catch(() => undefined);
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [authUser]);

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
    lsRemove('cg_token');

    meApi()
      .then((me) => {
        const user = meToAuthUser(me);
        setAuthUser(user);
        applyRoleSideEffects(toFrontendRole(user.role));
      })
      .catch(() => setAuthUser(null))
      .finally(() => setIsAuthLoading(false));
  }, [applyRoleSideEffects]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    try {
      await loginApi(email, password);
      const me = await meApi();
      const user = meToAuthUser(me);
      sessionExpiryHandled.current = false;
      setAuthUser(user);
      applyRoleSideEffects(toFrontendRole(user.role));
      showToast(`Welcome, ${user.name}`, 'success');
      return true;
    } catch (err) {
      await logoutApi().catch(() => undefined);
      const message = err instanceof ApiError ? err.message : 'Login failed. Please try again.';
      setAuthError(message);
      showToast(message, 'error');
      return false;
    }
  };

  const syncAuthUser = (user: AuthUser) => setAuthUser(user);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    setAuthUser(null);
    lsRemove('cg_lang_manually_set');
    void logoutApi().catch(() => undefined);
    showToast('Signed out of CampusGate', 'info');
  };

  // ── Language ──────────────────────────────────────────────────────────────
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    lsSet('cg_lang', lang);
    lsSet('cg_lang_manually_set', 'true');
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
    else if (stepNumber === 3) { setActiveTab('gate_scan'); showToast('DEMO 3: Checking the assigned gate.', 'warning'); }
    else if (stepNumber === 4) { setActiveTab('gate_scan'); showToast('DEMO 4: Scanning a LOST device.', 'warning'); }
    else if (stepNumber === 5) { setActiveTab('gate_visitors'); showToast('DEMO 5: Verifying visitor pass.', 'info'); }
    else if (stepNumber === 6) { setActiveTab('admin_dashboard'); showToast('DEMO 6: Opened Security Command.', 'info'); }
  };

  return (
    <AppContext.Provider value={{
      role, currentUser, authUser, isAuthenticated, isAuthLoading, isGateContextLoading, authError,
      login, syncAuthUser, logout,
      language, setLanguage, t,
      currentGate, activeOfficer, currentStudent,
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
