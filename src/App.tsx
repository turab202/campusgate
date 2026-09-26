import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { OfficerMain } from './features/officer/OfficerMain';
import { StudentView } from './features/student/StudentView';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { DemoGuideBanner } from './components/DemoGuideBanner';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

const AppContent: React.FC = () => {
  const { role, toast, language, t, isAuthenticated } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-purple-100 selection:text-purple-900">
      {/* Login & Registration Portal Modal */}
      <AuthModal />

      {/* Toast Notification Alert Banner */}
      {toast && (
        <div
          className={`fixed top-16 right-4 z-50 p-4 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center space-x-2.5 animate-in fade-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-700'
              : toast.type === 'warning'
              ? 'bg-amber-950 text-amber-100 border-amber-700'
              : toast.type === 'error'
              ? 'bg-rose-950 text-rose-100 border-rose-700'
              : 'bg-purple-950 text-purple-100 border-purple-700'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
          {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-purple-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Top Navigation */}
      <Navbar />

      {/* Primary Application Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isAuthenticated ? (
          <>
            {role === 'OFFICER' && <OfficerMain />}
            {role === 'STUDENT' && <StudentView />}
            {role === 'ADMIN' && <AdminDashboard />}
          </>
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-purple-100 text-purple-900 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-purple-800" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">
              {language === 'am' ? 'እባክዎ መጀመሪያ ይግቡ' : 'Authentication Required'}
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {language === 'am'
                ? 'የካምፓስ በር ቁጥጥር እና የመሳሪያዎች ዳሽቦርድ ለመጠቀም መለያዎን ያስገቡ።'
                : 'Sign in to access your designated role portal (Gate Officer, Student, or Security Administrator).'}
            </p>
          </div>
        )}
      </main>

      {/* Bottom Evaluation Assistant Drawer */}
      <DemoGuideBanner />

      {/* Enterprise Security Platform Footer */}
      <footer className="bg-purple-950 text-purple-300 text-xs border-t border-purple-900/80 py-6 px-4 no-print mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-center sm:text-left">
            <span className="font-extrabold text-white text-sm">CampusGate</span>
            <span>•</span>
            <span className="text-[11px] text-purple-300">
              {language === 'am'
                ? 'የኢንሳ የደህንነት ምህንድስና የምረቃ ፕሮጀክት'
                : 'INSA Security Engineering Graduation Project'}
            </span>
          </div>

          <div className="text-[11px] text-purple-400 text-center sm:text-right space-y-0.5">
            <div>Centralized Access & Personal Device Verification System</div>
            <div className="font-mono text-purple-500">
              Architecture: Central Server • Node/Express • PostgreSQL Ready
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
