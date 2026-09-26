import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, Language } from '../i18n/translations';
import { Gate, GateOfficer, Student, UserRole } from '../types';
import { campusStore } from '../services/storage';

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentUser: { id: string; name: string; email: string; role: UserRole; identifier: string } | null;
  isAuthenticated: boolean;
  login: (identifier: string, password?: string, intendedRole?: UserRole) => boolean;
  registerStudent: (data: { name: string; studentId: string; department: string; email: string; phone?: string; password?: string }) => { success: boolean; message: string };
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial preferences
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('cg_auth_logged_in') === 'true';
  });

  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: UserRole; identifier: string } | null>(() => {
    const saved = localStorage.getItem('cg_current_user');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const [role, setRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem('cg_role') as UserRole) || 'OFFICER';
  });

  const [language, setLanguageState] = useState<Language>(() => {
    // Gate officer defaults to Amharic as required by Section 27
    const stored = localStorage.getItem('cg_lang') as Language;
    if (stored) return stored;
    return role === 'OFFICER' ? 'am' : 'en';
  });

  const [currentGateId, setCurrentGateIdState] = useState<string>(() => {
    return localStorage.getItem('cg_gateId') || 'gate-1';
  });

  const [activeOfficerId, setActiveOfficerIdState] = useState<string>('off-1');
  const [currentStudentId, setCurrentStudentIdState] = useState<string>('stud-1');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('gate_scan');
  const [activeDemoAction, setActiveDemoAction] = useState<string | null>(null);

  // Sync listener to force re-renders when storage changes
  const [, setStoreTick] = useState(0);
  useEffect(() => {
    return campusStore.subscribe(() => setStoreTick((t) => t + 1));
  }, []);

  const gates = campusStore.getGates();
  const currentGate = gates.find((g) => g.id === currentGateId) || gates[0];

  const officers = campusStore.getOfficers();
  const activeOfficer = officers.find((o) => o.id === activeOfficerId) || officers[0];

  const students = campusStore.getStudents();
  const currentStudent = students.find((s) => s.id === currentStudentId) || students[0];

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('cg_role', newRole);
    if (newRole === 'OFFICER') {
      setActiveTab('gate_scan');
      // If switching to officer, prompt asked for Amharic default
      if (!localStorage.getItem('cg_lang_manually_set')) {
        setLanguageState('am');
      }
    } else if (newRole === 'STUDENT') {
      setActiveTab('student_devices');
    } else if (newRole === 'ADMIN') {
      setActiveTab('admin_dashboard');
    }
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('cg_lang', lang);
    localStorage.setItem('cg_lang_manually_set', 'true');
  };

  const setCurrentGateId = (gateId: string) => {
    setCurrentGateIdState(gateId);
    localStorage.setItem('cg_gateId', gateId);
  };

  const showToast = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const resetAllData = () => {
    campusStore.resetAll();
    showToast('Demo data reset to baseline Ethiopian university registry values.', 'info');
  };

  const triggerDemoStep = (stepNumber: number) => {
    setActiveDemoAction(`DEMO_${stepNumber}`);
    if (stepNumber === 1) {
      // Demo 1: Gate Officer enrolls a new laptop at Gate 1
      setRole('OFFICER');
      setCurrentGateId('gate-1');
      setActiveTab('gate_enroll');
      showToast('DEMO 1: Ready to enroll new personal device for student at Gate 1.', 'info');
    } else if (stepNumber === 2) {
      // Demo 2: Check Out laptop PF123456 at Gate 1
      setRole('OFFICER');
      setCurrentGateId('gate-1');
      setActiveTab('gate_scan');
      showToast('DEMO 2: Searching Lenovo ThinkPad (PF123456) for CHECK OUT at Gate 1.', 'info');
    } else if (stepNumber === 3) {
      // Demo 3: Cross-Gate Return - switch to Gate 3 and scan same device for Check In!
      setRole('OFFICER');
      setCurrentGateId('gate-3');
      setActiveTab('gate_scan');
      showToast('DEMO 3: Switched officer post to Gate 3! Ready to verify cross-gate check-in.', 'warning');
    } else if (stepNumber === 4) {
      // Demo 4: Scan Lost Device (Dell XPS 13, Serial 8J2M144K90)
      setRole('OFFICER');
      setCurrentGateId('gate-2');
      setActiveTab('gate_scan');
      showToast('DEMO 4: Scanning reported LOST device (8J2M144K90) to trigger security warning.', 'warning');
    } else if (stepNumber === 5) {
      // Demo 5: Visitor Flow
      setRole('OFFICER');
      setActiveTab('gate_visitors');
      showToast('DEMO 5: Verifying digital visitor pass VP-2026-8812 at Gate.', 'info');
    } else if (stepNumber === 6) {
      // Demo 6: Admin Dashboard
      setRole('ADMIN');
      setActiveTab('admin_dashboard');
      showToast('DEMO 6: Opened Central Security Command & Audit Trail.', 'info');
    }
  };

  const login = (identifier: string, password?: string, intendedRole?: UserRole): boolean => {
    const cleanId = identifier.trim().toUpperCase();

    // Check if matching an officer
    const officerMatch = officers.find(
      (o) => o.officerBadgeId.toUpperCase() === cleanId || o.email.toUpperCase() === cleanId || o.name.toUpperCase().includes(cleanId)
    );

    // Check if matching a student
    const studentMatch = students.find(
      (s) => s.studentId.toUpperCase() === cleanId || s.email.toUpperCase() === cleanId || s.name.toUpperCase().includes(cleanId)
    );

    if (intendedRole === 'OFFICER' || officerMatch) {
      const off = officerMatch || officers[0];
      const user = {
        id: off.id,
        name: off.name,
        email: off.email,
        role: 'OFFICER' as UserRole,
        identifier: off.officerBadgeId
      };
      setCurrentUser(user);
      setActiveOfficerIdState(off.id);
      setCurrentGateIdState(off.assignedGateId || 'gate-1');
      setIsAuthenticated(true);
      setRole('OFFICER');
      localStorage.setItem('cg_auth_logged_in', 'true');
      localStorage.setItem('cg_current_user', JSON.stringify(user));
      showToast(`Welcome back, Officer ${off.name} (${off.officerBadgeId})`, 'success');
      return true;
    }

    if (intendedRole === 'STUDENT' || studentMatch) {
      const stud = studentMatch || students[0];
      const user = {
        id: stud.id,
        name: stud.name,
        email: stud.email,
        role: 'STUDENT' as UserRole,
        identifier: stud.studentId
      };
      setCurrentUser(user);
      setCurrentStudentIdState(stud.id);
      setIsAuthenticated(true);
      setRole('STUDENT');
      localStorage.setItem('cg_auth_logged_in', 'true');
      localStorage.setItem('cg_current_user', JSON.stringify(user));
      showToast(`Welcome, ${stud.name} (${stud.studentId})`, 'success');
      return true;
    }

    if (intendedRole === 'ADMIN' || cleanId.includes('ADMIN') || cleanId.includes('SECURITY')) {
      const user = {
        id: 'admin-1',
        name: 'Chief Security Administrator',
        email: 'admin@astu.security.et',
        role: 'ADMIN' as UserRole,
        identifier: 'ADMIN-HQ'
      };
      setCurrentUser(user);
      setIsAuthenticated(true);
      setRole('ADMIN');
      localStorage.setItem('cg_auth_logged_in', 'true');
      localStorage.setItem('cg_current_user', JSON.stringify(user));
      showToast('Logged in as Security Administrator', 'success');
      return true;
    }

    // Fallback: Default to student or officer depending on intendedRole
    const fallbackRole: UserRole = intendedRole || 'STUDENT';
    const fallbackUser = {
      id: `usr-${Date.now()}`,
      name: identifier,
      email: `${identifier.toLowerCase()}@astu.edu.et`,
      role: fallbackRole,
      identifier: identifier
    };
    setCurrentUser(fallbackUser);
    setIsAuthenticated(true);
    setRole(fallbackRole);
    localStorage.setItem('cg_auth_logged_in', 'true');
    localStorage.setItem('cg_current_user', JSON.stringify(fallbackUser));
    showToast(`Signed in as ${identifier}`, 'success');
    return true;
  };

  const registerStudent = (data: {
    name: string;
    studentId: string;
    department: string;
    email: string;
    phone?: string;
    password?: string;
  }): { success: boolean; message: string } => {
    const cleanId = data.studentId.trim().toUpperCase();
    const existing = students.find((s) => s.studentId.toUpperCase() === cleanId);
    if (existing) {
      return { success: false, message: `Student ID ${cleanId} already exists in registry.` };
    }

    const newStudent: Student = {
      id: `stud-${Date.now()}`,
      name: data.name.trim(),
      email: data.email.trim(),
      studentId: cleanId,
      department: data.department,
      batchYear: 2024,
      role: 'STUDENT',
      status: 'ACTIVE',
      phone: data.phone || '+251 91 000 0000',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
    };

    // Add to students list in memory
    students.unshift(newStudent);
    setCurrentStudentIdState(newStudent.id);

    const user = {
      id: newStudent.id,
      name: newStudent.name,
      email: newStudent.email,
      role: 'STUDENT' as UserRole,
      identifier: newStudent.studentId
    };
    setCurrentUser(user);
    setIsAuthenticated(true);
    setRole('STUDENT');
    localStorage.setItem('cg_auth_logged_in', 'true');
    localStorage.setItem('cg_current_user', JSON.stringify(user));

    showToast(`Account created for ${newStudent.name}! You are now logged in.`, 'success');
    return { success: true, message: 'Account created successfully.' };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('cg_auth_logged_in');
    localStorage.removeItem('cg_current_user');
    showToast('Signed out of CampusGate', 'info');
  };

  // Translation function
  const t = (key: keyof typeof translations.en, params?: Record<string, string>): string => {
    const dict = translations[language] || translations.en;
    let text = dict[key] || translations.en[key] || String(key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      });
    }
    return text;
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        currentUser,
        isAuthenticated,
        login,
        registerStudent,
        logout,
        language,
        setLanguage,
        t,
        currentGateId,
        setCurrentGateId,
        currentGate,
        activeOfficer,
        setActiveOfficerId: setActiveOfficerIdState,
        currentStudent,
        setCurrentStudentId: setCurrentStudentIdState,
        isOffline,
        setIsOffline,
        toast,
        showToast,
        resetAllData,
        activeTab,
        setActiveTab,
        activeDemoAction,
        triggerDemoStep
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
