import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, LogOut, LogIn, X, Loader2, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  listVisitsApi, createVisitApi, checkInVisitApi, checkOutVisitApi,
  VisitRead, BackendVisitStatus, BackendIdentificationType
} from '../../services/visitService';
import { ApiError } from '../../services/api';

export const VisitorManager: React.FC = () => {
  const { t, language, showToast } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<BackendVisitStatus | 'ALL'>('ALL');

  // Form state
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('+251 9');
  const [idType, setIdType] = useState<BackendIdentificationType>('NATIONAL_ID');
  const [idNumber, setIdNumber] = useState('ETH-ID-');
  const [purpose, setPurpose] = useState('Academic Defense Guest');
  const [hostUserId, setHostUserId] = useState('');
  const [expectedStart, setExpectedStart] = useState('');
  const [expectedEnd, setExpectedEnd] = useState('');

  const [visits, setVisits] = useState<VisitRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await listVisitsApi(
        filterStatus !== 'ALL' ? { status: filterStatus } : {}
      );
      setVisits(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load visits.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const filtered = searchQuery
    ? visits.filter((v) => {
        const q = searchQuery.toLowerCase();
        return (
          v.id.toLowerCase().includes(q) ||
          v.visitor_id.toLowerCase().includes(q) ||
          v.host_user_id.toLowerCase().includes(q)
        );
      })
    : visits;

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !hostUserId.trim() || !expectedStart || !expectedEnd) return;
    setSubmitting(true);
    try {
      await createVisitApi({
        visitor: {
          full_name: visitorName,
          phone: visitorPhone || undefined,
          identification_type: idType,
          identification_number: idNumber,
          purpose,
        },
        host_user_id: hostUserId,
        expected_start_at: new Date(expectedStart).toISOString(),
        expected_end_at: new Date(expectedEnd).toISOString(),
      });
      showToast(`Visitor pass created for ${visitorName}`, 'success');
      setShowAddModal(false);
      setVisitorName('');
      load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create visitor pass.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = async (id: string) => {
    try {
      await checkInVisitApi(id);
      showToast('Visitor checked in successfully.', 'success');
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Check-in failed.', 'error');
    }
  };

  const handleCheckOut = async (id: string) => {
    try {
      await checkOutVisitApi(id);
      showToast('Visitor checked out successfully.', 'success');
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Check-out failed.', 'error');
    }
  };

  const statusStyle: Record<string, string> = {
    CHECKED_IN: 'bg-emerald-50 text-[var(--cg-success)] border-emerald-200',
    APPROVED: 'bg-amber-50 text-[var(--cg-warning)] border-amber-200',
    PENDING: 'bg-sky-50 text-[var(--cg-info)] border-sky-200',
    CHECKED_OUT: 'bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)] border-[var(--cg-border)]',
    EXPIRED: 'bg-red-50 text-[var(--cg-danger)] border-red-200',
    REJECTED: 'bg-red-50 text-[var(--cg-danger)] border-red-200',
    CANCELLED: 'bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)] border-[var(--cg-border)]',
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
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 h-9 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-[var(--cg-primary)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('newVisitorRequest')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(['ALL', 'PENDING', 'APPROVED', 'CHECKED_IN', 'CHECKED_OUT'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filterStatus === s
                ? 'bg-[var(--cg-primary)] text-white'
                : 'border border-[var(--cg-border)] bg-[var(--cg-surface)] text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)]'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-[var(--cg-text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by visit ID, visitor ID, or host ID…"
          className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] pl-10 pr-4 text-xs text-[var(--cg-text)] focus:border-[var(--cg-primary)] focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-4 text-sm text-[var(--cg-danger)]">
          {error}
          <button onClick={load} className="ml-3 underline text-xs">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--cg-primary)]" />
        </div>
      ) : error ? null : filtered.length === 0 ? (
        <EmptyState title="No visits found" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((vis) => (
            <div key={vis.id} className="flex flex-col justify-between rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--cg-border)] pb-3">
                  <span className="font-mono text-xs font-semibold text-[var(--cg-primary)]">{vis.id.slice(0, 8).toUpperCase()}</span>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusStyle[vis.status] ?? 'bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)] border-[var(--cg-border)]'}`}>
                    {vis.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-2">
                    <span className="block text-[10px] font-semibold uppercase text-[var(--cg-text-muted)]">Visitor ID</span>
                    <span className="font-mono text-[var(--cg-text)]">{vis.visitor_id.slice(0, 8)}…</span>
                  </div>
                  <div className="rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-2">
                    <span className="block text-[10px] font-semibold uppercase text-[var(--cg-text-muted)]">Host User ID</span>
                    <span className="font-mono text-[var(--cg-text)]">{vis.host_user_id.slice(0, 8)}…</span>
                  </div>
                  <div className="flex justify-between text-[var(--cg-text-muted)]">
                    <span>Expected:</span>
                    <span className="font-semibold text-[var(--cg-text)]">{new Date(vis.expected_start_at).toLocaleDateString()}</span>
                  </div>
                  {vis.checked_in_at && (
                    <div className="flex justify-between text-[var(--cg-text-muted)]">
                      <span>Checked in:</span>
                      <span className="font-semibold text-[var(--cg-success)]">{new Date(vis.checked_in_at).toLocaleTimeString()}</span>
                    </div>
                  )}
                  {vis.checked_out_at && (
                    <div className="flex justify-between text-[var(--cg-text-muted)]">
                      <span>Checked out:</span>
                      <span className="font-semibold text-[var(--cg-text-muted)]">{new Date(vis.checked_out_at).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 border-t border-[var(--cg-border)] pt-3">
                {vis.status === 'APPROVED' && (
                  <button onClick={() => handleCheckIn(vis.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--cg-success)] py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity">
                    <LogIn className="h-3.5 w-3.5" /> {t('checkInVisitor')}
                  </button>
                )}
                {vis.status === 'CHECKED_IN' && (
                  <button onClick={() => handleCheckOut(vis.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--cg-primary)] py-2 text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors">
                    <LogOut className="h-3.5 w-3.5" /> {t('checkOutVisitor')}
                  </button>
                )}
                {vis.status === 'CHECKED_OUT' && (
                  <div className="rounded-lg bg-[var(--cg-surface-muted)] py-1.5 text-center text-xs text-[var(--cg-text-muted)]">
                    Departed
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
                  <label className="block font-semibold text-[var(--cg-text)]">ID Type</label>
                  <select value={idType} onChange={(e) => setIdType(e.target.value as BackendIdentificationType)}
                    className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]">
                    <option value="NATIONAL_ID">National ID</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVER_LICENSE">Driver License</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block font-semibold text-[var(--cg-text)]">{t('nationalId')} *</label>
                <input required value={idNumber} onChange={(e) => setIdNumber(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 font-mono text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="block font-semibold text-[var(--cg-text)]">{t('purpose')}</label>
                <input value={purpose} onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Senior Project External Evaluation"
                  className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="block font-semibold text-[var(--cg-text)]">Host User ID (UUID) *</label>
                <input required value={hostUserId} onChange={(e) => setHostUserId(e.target.value)}
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 font-mono text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-[var(--cg-text)]">Expected Start *</label>
                  <input required type="datetime-local" value={expectedStart} onChange={(e) => setExpectedStart(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-semibold text-[var(--cg-text)]">Expected End *</label>
                  <input required type="datetime-local" value={expectedEnd} onChange={(e) => setExpectedEnd(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-[var(--cg-border)] pt-3">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="rounded-lg px-4 py-2 text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] transition-colors">
                  {t('cancel')}
                </button>
                <button type="submit" disabled={submitting}
                  className="rounded-lg bg-[var(--cg-primary)] px-5 py-2.5 font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors disabled:opacity-60">
                  {submitting ? 'Creating…' : 'Create Visit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
