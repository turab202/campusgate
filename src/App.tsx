'use client';

import React from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { OfficerMain } from './features/officer/OfficerMain';
import { StudentView } from './features/student/StudentView';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

const AppContent: React.FC = () => {
  const { role, toast } = useApp();

  return (
    <div className="min-h-screen bg-[var(--cg-background)] text-[var(--cg-text)] flex flex-col">
      {toast && (
        <div
          role="alert"
          aria-live="polite"
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-[var(--cg-shadow-card)] max-w-sm ${
            toast.type === 'success'
              ? 'bg-[var(--cg-success)] text-white border-[var(--cg-success)]'
              : toast.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : toast.type === 'error'
              ? 'bg-[var(--cg-danger)] text-white border-[var(--cg-danger)]'
              : 'bg-[var(--cg-surface)] text-[var(--cg-text)] border-[var(--cg-border)]'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle className="h-4 w-4 shrink-0" />}
          {toast.type === 'error' && <XCircle className="h-4 w-4 shrink-0" />}
          {toast.type === 'info' && <Info className="h-4 w-4 shrink-0 text-[var(--cg-info)]" />}
          <span>{toast.message}</span>
        </div>
      )}

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {role === 'OFFICER' && <OfficerMain />}
        {role === 'STUDENT' && <StudentView />}
        {role === 'ADMIN' && <AdminDashboard />}
      </main>

      <footer className="border-t border-[var(--cg-border)] bg-[var(--cg-surface)] py-5 px-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-[var(--cg-text)]">CampusGate</span>
            <span className="text-[var(--cg-border)]">•</span>
            <span className="text-xs text-[var(--cg-text-muted)]">University Access & Security Operations</span>
          </div>
          <div className="text-xs text-[var(--cg-text-muted)]">
            Access management · asset control · gate operations
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
