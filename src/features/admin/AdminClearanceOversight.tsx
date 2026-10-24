'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { ApiError } from '../../services/api';
import {
  BelongingsClearance,
  ClearanceStatus,
  listAdminClearancesApi,
} from '../../services/belongingsClearanceService';
import { EmptyState } from '../../components/ui/EmptyState';

export function AdminClearanceOversight() {
  const [records, setRecords] = useState<BelongingsClearance[]>([]);
  const [status, setStatus] = useState<ClearanceStatus | ''>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecords(await listAdminClearancesApi({
        search: search.trim() || undefined,
        status: status || undefined,
      }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load clearance records.');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--cg-text)]">Belongings clearance oversight</h2>
          <p className="mt-1 text-sm text-[var(--cg-text-muted)]">Administrative read-only view of requests and recorded exits.</p>
        </div>
        <button type="button" onClick={() => void loadRecords()} disabled={loading} aria-label="Refresh clearance records"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--cg-border)] text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
        <label className="relative">
          <span className="sr-only">Search clearance records</span>
          <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--cg-text-muted)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Student ID, name or reference"
            className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] pl-9 pr-3 text-sm outline-none focus:border-[var(--cg-primary)]" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value as ClearanceStatus | '')} aria-label="Filter clearance status"
          className="h-10 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm">
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
      {error && <p role="alert" className="rounded-lg border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-3 text-sm text-[var(--cg-danger)]">{error}</p>}
      {loading ? (
        <p role="status" className="py-8 text-center text-sm text-[var(--cg-text-muted)]">Loading clearance records…</p>
      ) : records.length === 0 ? (
        <EmptyState title="No clearance records found" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--cg-border)]">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)]">
              <tr>{['Reference', 'Student', 'Residence', 'Exit time', 'Status', 'Pass', 'Gate exit'].map((label) => <th key={label} className="px-3 py-2.5 font-semibold">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[var(--cg-border)]">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-3 py-3 font-mono font-semibold text-[var(--cg-primary)]">{record.reference}</td>
                  <td className="px-3 py-3">
                    <span className="block font-semibold text-[var(--cg-text)]">{record.student_name}</span>
                    <span className="font-mono text-[var(--cg-text-muted)]">{record.student_campus_id ?? 'No ID'}</span>
                  </td>
                  <td className="px-3 py-3 text-[var(--cg-text-muted)]">{record.dormitory}{record.room_number ? ` · ${record.room_number}` : ''}</td>
                  <td className="px-3 py-3 text-[var(--cg-text-muted)]">{new Date(record.intended_exit_at).toLocaleString()}</td>
                  <td className="px-3 py-3 font-semibold">{record.status}</td>
                  <td className="px-3 py-3">{record.pass_state}</td>
                  <td className="px-3 py-3 text-[var(--cg-text-muted)]">{record.exit_recorded_at ? new Date(record.exit_recorded_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
