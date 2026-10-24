'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw, Search, X } from 'lucide-react';
import { ApiError } from '../../services/api';
import {
  BelongingsClearance,
  ClearanceStatus,
  decideBelongingsClearanceApi,
  listProctorClearancesApi,
} from '../../services/belongingsClearanceService';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export function ProctorPortal() {
  const { authUser, showToast } = useApp();
  const [requests, setRequests] = useState<BelongingsClearance[]>([]);
  const [selected, setSelected] = useState<BelongingsClearance | null>(null);
  const [view, setView] = useState<'PENDING' | 'PROCESSED' | 'HISTORY'>('PENDING');
  const [status, setStatus] = useState<ClearanceStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await listProctorClearancesApi({
        search: search.trim() || undefined,
        status: view === 'PENDING'
          ? 'PENDING'
          : view === 'PROCESSED' || status === 'ALL'
            ? undefined
            : status,
        on_date: date || undefined,
      });
      const visibleResults = view === 'PROCESSED'
        ? results.filter((request) =>
            (request.status === 'APPROVED' || request.status === 'REJECTED')
            && (status === 'ALL' || request.status === status))
        : results;
      setRequests(visibleResults);
      setSelected((current) => current ? visibleResults.find((request) => request.id === current.id) ?? null : null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load clearance requests.');
    } finally {
      setLoading(false);
    }
  }, [date, search, status, view]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRequests(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRequests]);

  const decide = async (decision: 'approve' | 'reject') => {
    if (!selected) return;
    if (decision === 'reject' && reason.trim().length < 3) {
      setError('Enter a meaningful reason before rejecting this request.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await decideBelongingsClearanceApi(selected.id, decision, reason.trim());
      setSelected(updated);
      showToast(
        decision === 'approve'
          ? `Clearance ${updated.reference} approved.`
          : `Clearance ${updated.reference} rejected.`,
        decision === 'approve' ? 'success' : 'info',
      );
      setReason('');
      await loadRequests();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to save the decision.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingDecision = selected?.status === 'PENDING';

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cg-primary)]">Proctor Portal</p>
        <h1 className="mt-1 text-xl font-bold text-[var(--cg-text)]">Belongings exit clearances</h1>
        <p className="mt-1 text-sm text-[var(--cg-text-muted)]">
          Review requests in {authUser?.role === 'PROCTOR' ? 'your department' : 'your assigned responsibility area'}.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.4fr)]">
        <section className="space-y-3 rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-4 shadow-[var(--cg-shadow-sm)]">
          <nav aria-label="Proctor clearance views" className="grid grid-cols-3 gap-1 rounded-lg bg-[var(--cg-surface-muted)] p-1">
            {[
              { id: 'PENDING' as const, label: 'Pending' },
              { id: 'PROCESSED' as const, label: 'Processed' },
              { id: 'HISTORY' as const, label: 'History' },
            ].map((item) => (
              <button key={item.id} type="button" onClick={() => setView(item.id)} aria-current={view === item.id ? 'page' : undefined}
                className={`rounded-md px-2 py-2 text-[10px] font-semibold transition-colors ${view === item.id ? 'bg-[var(--cg-primary)] text-white' : 'text-[var(--cg-text-muted)] hover:text-[var(--cg-text)]'}`}>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <label className="relative">
              <span className="sr-only">Search requests</span>
              <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--cg-text-muted)]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Student ID, name or reference"
                className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] pl-9 pr-3 text-sm outline-none focus:border-[var(--cg-primary)]" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select value={status} onChange={(event) => setStatus(event.target.value as ClearanceStatus | 'ALL')} aria-label="Filter by status"
                className="h-10 min-w-0 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-2 text-sm text-[var(--cg-text)]">
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Filter by intended exit date"
                className="h-10 min-w-0 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-2 text-sm text-[var(--cg-text)]" />
            </div>
          </div>
          <button type="button" onClick={() => void loadRequests()} disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--cg-border)] px-3 py-2 text-xs font-semibold text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh requests
          </button>
          {error && <p role="alert" className="rounded-lg border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-3 text-xs text-[var(--cg-danger)]">{error}</p>}
          {loading ? (
            <p role="status" className="py-8 text-center text-sm text-[var(--cg-text-muted)]">Loading requests…</p>
          ) : requests.length === 0 ? (
            <EmptyState title="No matching requests" description="Try a different status, date or search." />
          ) : (
            <div className="max-h-[38rem] space-y-2 overflow-y-auto">
              {requests.map((request) => (
                <button type="button" key={request.id} onClick={() => { setSelected(request); setReason(''); setError(null); }}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${selected?.id === request.id ? 'border-[var(--cg-primary)] bg-[var(--cg-primary-light)]' : 'border-[var(--cg-border)] hover:bg-[var(--cg-surface-muted)]'}`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-[var(--cg-text)]">{request.student_name}</span>
                    <span className="rounded-full border border-[var(--cg-border)] px-2 py-0.5 text-[9px] font-semibold text-[var(--cg-text-muted)]">{request.status}</span>
                  </span>
                  <span className="mt-1 block font-mono text-[11px] text-[var(--cg-primary)]">{request.reference}</span>
                  <span className="mt-1 block text-[11px] text-[var(--cg-text-muted)]">
                    {request.student_campus_id ?? 'No student ID'} · {new Date(request.intended_exit_at).toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="min-h-80 rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)] sm:p-6">
          {!selected ? (
            <EmptyState title="Select a request" description="Student identity and declared belongings will appear here." />
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold text-[var(--cg-primary)]">{selected.reference}</p>
                  <h2 className="mt-1 text-lg font-bold text-[var(--cg-text)]">{selected.student_name}</h2>
                </div>
                <span className="rounded-full border border-[var(--cg-border)] px-3 py-1 text-xs font-semibold text-[var(--cg-text-muted)]">{selected.status}</span>
              </div>
              <dl className="grid gap-3 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-[var(--cg-text-muted)]">Student ID</dt><dd className="font-mono font-semibold">{selected.student_campus_id ?? 'Not set'}</dd></div>
                <div><dt className="text-xs text-[var(--cg-text-muted)]">Department</dt><dd className="font-semibold">{selected.student_department ?? 'Not set'}</dd></div>
                <div><dt className="text-xs text-[var(--cg-text-muted)]">Residence</dt><dd className="font-semibold">{selected.dormitory}{selected.room_number ? ` · Room ${selected.room_number}` : ''}</dd></div>
                <div><dt className="text-xs text-[var(--cg-text-muted)]">Intended exit</dt><dd className="font-semibold">{new Date(selected.intended_exit_at).toLocaleString()}</dd></div>
              </dl>
              <div>
                <h3 className="text-sm font-bold text-[var(--cg-text)]">Declared belongings</h3>
                <ul className="mt-2 divide-y divide-[var(--cg-border)] rounded-xl border border-[var(--cg-border)] px-4">
                  {selected.items.map((item) => <li key={item.id} className="flex justify-between py-2.5 text-sm"><span>{item.item_name}</span><span className="font-mono text-[var(--cg-text-muted)]">× {item.quantity}</span></li>)}
                </ul>
              </div>
              {selected.remarks && <p className="rounded-lg bg-[var(--cg-surface-muted)] p-3 text-sm text-[var(--cg-text-muted)]">Student remarks: {selected.remarks}</p>}
              {!pendingDecision && (
                <div className="rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3 text-sm text-[var(--cg-text-muted)]">
                  Decision by {selected.proctor_name ?? 'Proctor'} · {selected.decided_at ? new Date(selected.decided_at).toLocaleString() : '—'}
                  {selected.decision_reason && <p className="mt-1">Reason: {selected.decision_reason}</p>}
                </div>
              )}
              {pendingDecision && (
                <div className="space-y-3 border-t border-[var(--cg-border)] pt-4">
                  <label className="block space-y-1.5 text-xs font-semibold text-[var(--cg-text)]">
                    Rejection reason <span className="font-normal text-[var(--cg-text-muted)]">(required to reject)</span>
                    <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} rows={3}
                      className="w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 py-2 text-sm font-normal outline-none focus:border-[var(--cg-primary)]" />
                  </label>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="secondary" disabled={submitting} icon={<X className="h-4 w-4" />} onClick={() => void decide('reject')}>Reject request</Button>
                    <Button type="button" disabled={submitting} icon={<Check className="h-4 w-4" />} onClick={() => void decide('approve')}>Approve and issue pass</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
