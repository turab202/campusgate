import React, { useState, useEffect, useCallback } from 'react';
import { Search, LogOut, LogIn, Loader2, RefreshCw, Check, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  listVisitsApi, approveVisitApi, rejectVisitApi, checkInVisitApi, checkOutVisitApi,
  VisitRead, BackendVisitStatus
} from '../../services/visitService';
import { ApiError } from '../../services/api';

export const VisitorManager: React.FC = () => {
  const { t, language, showToast, role, currentGate } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [filterStatus, setFilterStatus] = useState<BackendVisitStatus | 'ALL'>('ALL');

  const [visits, setVisits] = useState<VisitRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyVisitId, setBusyVisitId] = useState<string | null>(null);
  const isAdmin = role === 'ADMIN';

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
          v.host_user_id.toLowerCase().includes(q) ||
          v.host.full_name.toLowerCase().includes(q) ||
          v.host.email.toLowerCase().includes(q) ||
          v.visitor.full_name.toLowerCase().includes(q) ||
          v.visitor.identification_number.toLowerCase().includes(q) ||
          (v.qr_code_value ?? '').toLowerCase().includes(q)
        );
      })
    : visits;

  const handleReview = async (id: string, approve: boolean) => {
    setBusyVisitId(id);
    try {
      if (approve) await approveVisitApi(id);
      else await rejectVisitApi(id);
      showToast(`Visitor request ${approve ? 'approved' : 'rejected'}.`, 'success');
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to review visitor request.', 'error');
    } finally {
      setBusyVisitId(null);
    }
  };

  const handleCheckIn = async (id: string, qrCodeValue: string) => {
    setBusyVisitId(id);
    try {
      await checkInVisitApi(id, qrCodeValue);
      setQrCodeInput('');
      showToast('Visitor checked in successfully.', 'success');
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Check-in failed.', 'error');
    } finally {
      setBusyVisitId(null);
    }
  };

  const handleCheckOut = async (id: string) => {
    setBusyVisitId(id);
    try {
      await checkOutVisitApi(id);
      showToast('Visitor checked out successfully.', 'success');
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Check-out failed.', 'error');
    } finally {
      setBusyVisitId(null);
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
          <span className="text-xs text-[var(--cg-text-muted)]">
            {isAdmin
              ? 'Review student and staff requests.'
              : currentGate.id ? `Active gate: ${currentGate.name}` : 'An active gate assignment is required.'}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CHECKED_IN', 'CHECKED_OUT', 'EXPIRED'] as const).map((s) => (
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
          placeholder="Search by visitor, host, identification, visit ID, or pass code…"
          className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] pl-10 pr-4 text-xs text-[var(--cg-text)] focus:border-[var(--cg-primary)] focus:outline-none"
        />
      </div>

      {!isAdmin && (
        <label className="block space-y-1.5 text-xs font-semibold text-[var(--cg-text-muted)]">
          Scan approved visitor pass QR code
          <input
            type="text"
            value={qrCodeInput}
            onChange={(event) => setQrCodeInput(event.target.value.trim())}
            placeholder="Scan or enter the visitor pass code"
            autoComplete="off"
            className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 font-mono text-sm text-[var(--cg-text)] focus:border-[var(--cg-primary)] focus:outline-none"
          />
        </label>
      )}

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
                    <span className="block text-[10px] font-semibold uppercase text-[var(--cg-text-muted)]">Visitor identity</span>
                    <span className="font-semibold text-[var(--cg-text)]">{vis.visitor.full_name}</span>
                    <span className="block font-mono text-[var(--cg-text-muted)]">
                      {vis.visitor.identification_type.replace(/_/g, ' ')} · {vis.visitor.identification_number}
                    </span>
                  </div>
                  <div className="rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-2">
                    <span className="block text-[10px] font-semibold uppercase text-[var(--cg-text-muted)]">Purpose</span>
                    <span className="text-[var(--cg-text)]">{vis.visitor.purpose || 'Not specified'}</span>
                  </div>
                  <div className="rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-2">
                    <span className="block text-[10px] font-semibold uppercase text-[var(--cg-text-muted)]">Host</span>
                    <span className="font-semibold text-[var(--cg-text)]">{vis.host.full_name}</span>
                    <span className="block text-[var(--cg-text-muted)]">{vis.host.email}</span>
                  </div>
                  <div className="flex justify-between text-[var(--cg-text-muted)]">
                    <span>Expected:</span>
                    <span className="text-right font-semibold text-[var(--cg-text)]">
                      {new Date(vis.expected_start_at).toLocaleString()} – {new Date(vis.expected_end_at).toLocaleTimeString()}
                    </span>
                  </div>
                  {vis.qr_code_value && (
                    <div className="rounded-lg border border-[var(--cg-success-border)] bg-[var(--cg-success-bg)] p-2">
                      <span className="block text-[10px] font-semibold uppercase text-[var(--cg-success)]">Approved pass</span>
                      <span className="font-mono font-semibold text-[var(--cg-text)]">{vis.qr_code_value}</span>
                    </div>
                  )}
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
                {isAdmin && vis.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleReview(vis.id, true)} disabled={busyVisitId === vis.id}
                      className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--cg-success)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60">
                      <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                      <span>Approve</span>
                    </button>
                    <button onClick={() => handleReview(vis.id, false)} disabled={busyVisitId === vis.id}
                      className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--cg-danger)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60">
                      <X aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
                {!isAdmin && vis.status === 'APPROVED' && (
                  <button onClick={() => handleCheckIn(vis.id, qrCodeInput)} disabled={!currentGate.id || busyVisitId === vis.id || qrCodeInput !== vis.qr_code_value}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--cg-success)] py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60">
                    <LogIn className="h-3.5 w-3.5" />
                    {qrCodeInput === vis.qr_code_value ? t('checkInVisitor') : 'Scan this visitor’s QR to check in'}
                  </button>
                )}
                {!isAdmin && vis.status === 'CHECKED_IN' && (
                  <button onClick={() => handleCheckOut(vis.id)} disabled={!currentGate.id || busyVisitId === vis.id}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--cg-primary)] py-2 text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors disabled:opacity-60">
                    <LogOut className="h-3.5 w-3.5" /> {t('checkOutVisitor')}
                  </button>
                )}
                {busyVisitId === vis.id && <p className="mt-2 text-center text-xs text-[var(--cg-text-muted)]">Updating…</p>}
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

    </div>
  );
};
