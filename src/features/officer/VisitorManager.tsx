import React, { useState } from 'react';
import { Plus, Search, LogOut, LogIn, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { campusStore } from '../../services/storage';

export const VisitorManager: React.FC = () => {
  const { t, language, currentGate, activeOfficer, showToast } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('+251 9');
  const [idNumber, setIdNumber] = useState('ETH-ID-');
  const [purpose, setPurpose] = useState('Academic Defense Guest');
  const [hostStudentOrStaff, setHostStudentOrStaff] = useState('Dr. Girma Hailu');
  const [hostDepartment, setHostDepartment] = useState('Electrical Engineering');

  const visitors = campusStore.getVisitors();
  const filtered = visitors.filter(
    (v) =>
      v.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.passNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.hostStudentOrStaff.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) return;
    campusStore.createVisitorPass({
      visitorName, visitorPhone, idNumber, purpose,
      hostStudentOrStaff, hostDepartment,
      expectedArrival: 'Today, 09:00 AM',
      expectedDeparture: 'Today, 05:00 PM'
    });
    showToast(`Visitor pass created for ${visitorName}`, 'success');
    setShowAddModal(false);
    setVisitorName('');
  };

  const handleCheckIn = (id: string) => {
    const res = campusStore.checkInVisitor(id, currentGate.id, activeOfficer.officerBadgeId);
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const handleCheckOut = (id: string) => {
    const res = campusStore.checkOutVisitor(id, currentGate.id, activeOfficer.officerBadgeId);
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const statusStyle: Record<string, string> = {
    INSIDE: 'bg-emerald-50 text-[var(--cg-success)] border-emerald-200',
    EXPECTED: 'bg-amber-50 text-[var(--cg-warning)] border-amber-200',
    CHECKED_OUT: 'bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)] border-[var(--cg-border)]',
    EXPIRED: 'bg-red-50 text-[var(--cg-danger)] border-red-200',
    DENIED: 'bg-red-50 text-[var(--cg-danger)] border-red-200',
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--cg-text)]">{t('visitorPasses')}</h2>
          <p className="mt-0.5 text-xs text-[var(--cg-text-muted)]">
            {language === 'am'
              ? 'የውጭ እንግዶች የካምፓስ መግቢያ እና መውጫ ፍተሻ'
              : 'Authorized guest verification, digital QR gate pass credentials, and access control.'}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-[var(--cg-primary)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('newVisitorRequest')}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-[var(--cg-text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by visitor name, pass ID, or host…"
          className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] pl-10 pr-4 text-xs text-[var(--cg-text)] focus:border-[var(--cg-primary)] focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((vis) => (
          <div key={vis.id} className="flex flex-col justify-between rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--cg-border)] pb-3">
                <span className="font-mono text-xs font-semibold text-[var(--cg-primary)]">{vis.passNumber}</span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusStyle[vis.status] ?? 'bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)] border-[var(--cg-border)]'}`}>
                  {vis.status}
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                <h3 className="font-semibold text-base text-[var(--cg-text)]">{vis.visitorName}</h3>
                <p className="text-xs text-[var(--cg-text-muted)]">
                  Phone: <span className="font-mono text-[var(--cg-text)]">{vis.visitorPhone}</span>
                </p>
                <p className="text-xs text-[var(--cg-text-muted)]">
                  ID: <span className="font-mono text-[var(--cg-text)]">{vis.idNumber}</span>
                </p>
                <div className="rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-2 text-xs">
                  <span className="block text-[10px] font-semibold uppercase text-[var(--cg-text-muted)]">Purpose</span>
                  <span className="text-[var(--cg-text)]">{vis.purpose}</span>
                </div>
                <p className="text-xs text-[var(--cg-text-muted)]">
                  Host: <strong className="text-[var(--cg-text)]">{vis.hostStudentOrStaff}</strong>
                </p>
              </div>
            </div>
            <div className="mt-4 border-t border-[var(--cg-border)] pt-3">
              {vis.status === 'EXPECTED' && (
                <button onClick={() => handleCheckIn(vis.id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--cg-success)] py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity">
                  <LogIn className="h-3.5 w-3.5" /> {t('checkInVisitor')}
                </button>
              )}
              {vis.status === 'INSIDE' && (
                <button onClick={() => handleCheckOut(vis.id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--cg-primary)] py-2 text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors">
                  <LogOut className="h-3.5 w-3.5" /> {t('checkOutVisitor')}
                </button>
              )}
              {vis.status === 'CHECKED_OUT' && (
                <div className="rounded-lg bg-[var(--cg-surface-muted)] py-1.5 text-center text-xs text-[var(--cg-text-muted)]">
                  Departed {vis.checkOutTime ? `(${vis.checkOutTime})` : ''}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-card)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--cg-border)] bg-[var(--cg-primary)] px-5 py-4">
              <h3 className="font-semibold text-white">{t('newVisitorRequest')}</h3>
              <button onClick={() => setShowAddModal(false)} aria-label="Close" className="text-white/70 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePass} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-semibold text-[var(--cg-text)]">{t('visitorName')} *</label>
                <input required value={visitorName} onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="e.g. Dr. Dawit Mengesha"
                  className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-[var(--cg-text)]">{t('visitorPhone')}</label>
                  <input value={visitorPhone} onChange={(e) => setVisitorPhone(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 font-mono text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-semibold text-[var(--cg-text)]">{t('nationalId')}</label>
                  <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 font-mono text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block font-semibold text-[var(--cg-text)]">{t('purpose')}</label>
                <input value={purpose} onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Senior Project External Evaluation"
                  className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-[var(--cg-text)]">{t('hostPerson')}</label>
                  <input value={hostStudentOrStaff} onChange={(e) => setHostStudentOrStaff(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-semibold text-[var(--cg-text)]">Host Department</label>
                  <input value={hostDepartment} onChange={(e) => setHostDepartment(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-[var(--cg-border)] pt-3">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="rounded-lg px-4 py-2 text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] transition-colors">
                  {t('cancel')}
                </button>
                <button type="submit"
                  className="rounded-lg bg-[var(--cg-primary)] px-5 py-2.5 font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors">
                  Generate Pass & QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
