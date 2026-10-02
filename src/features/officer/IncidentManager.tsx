import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Plus, X, Loader2, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  listIncidentsApi, createIncidentApi, patchIncidentApi,
  IncidentRead, BackendIncidentType, BackendIncidentStatus
} from '../../services/incidentService';
import { ApiError } from '../../services/api';

export const IncidentManager: React.FC = () => {
  const { t, language, showToast } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [incidentType, setIncidentType] = useState<BackendIncidentType>('OWNER_MISMATCH');
  const [description, setDescription] = useState('');

  const [incidents, setIncidents] = useState<IncidentRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await listIncidentsApi(
        filterStatus !== 'ALL' ? { status: filterStatus as BackendIncidentStatus } : {}
      );
      setIncidents(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load incidents.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      await createIncidentApi({ incident_type: incidentType, description });
      showToast('Incident logged into central security registry', 'warning');
      setShowCreateModal(false);
      setDescription('');
      load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create incident.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: BackendIncidentStatus) => {
    try {
      await patchIncidentApi(id, { status });
      showToast(`Incident status updated to ${status}`, 'info');
      load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update incident.';
      showToast(message, 'error');
    }
  };

  const statusColors: Record<string, string> = {
    OPEN: 'bg-red-50 text-[var(--cg-danger)] border-red-200',
    INVESTIGATING: 'bg-amber-50 text-[var(--cg-warning)] border-amber-200',
    RESOLVED: 'bg-emerald-50 text-[var(--cg-success)] border-emerald-200',
    CLOSED: 'bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)] border-[var(--cg-border)]',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--cg-text)]">{t('navIncidents')}</h2>
          <p className="mt-0.5 text-xs text-[var(--cg-text-muted)]">
            {language === 'am'
              ? 'የደህንነት ስጋቶች እና አለመጣጣሞች ሪፖርት'
              : 'Security incidents, flag alerts, and unauthorized gate crossing records.'}
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
            onClick={() => setShowCreateModal(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-[var(--cg-danger)] px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            {t('createIncident')}
          </button>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap items-center gap-2">
        {['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'].map((s) => (
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

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-4 text-sm text-[var(--cg-danger)]">
          {error}
          <button onClick={load} className="ml-3 underline text-xs">Retry</button>
        </div>
      )}

      {/* Incidents list */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--cg-primary)]" />
          </div>
        ) : incidents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--cg-border)] bg-[var(--cg-surface)] p-8 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-[var(--cg-text-muted)] mb-2" />
            <p className="text-sm font-medium text-[var(--cg-text)]">No incidents for this filter</p>
          </div>
        ) : (
          incidents.map((inc) => (
            <div key={inc.id} className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cg-border)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--cg-text)]">
                    {inc.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="rounded bg-[var(--cg-surface-muted)] px-2 py-0.5 text-xs font-medium text-[var(--cg-text-muted)]">
                    {inc.incident_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusColors[inc.status] || ''}`}>
                  {inc.status.replace('_', ' ')}
                </span>
              </div>

              <div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--cg-text-muted)]">{inc.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3 text-[11px] sm:grid-cols-3">
                {[
                  { label: 'Reported By', value: inc.reported_by.slice(0, 8) + '…', mono: true },
                  { label: 'Device', value: inc.device_id ? inc.device_id.slice(0, 8) + '…' : 'N/A', mono: true },
                  { label: 'Logged', value: new Date(inc.created_at).toLocaleString() },
                ].map(({ label, value, mono }) => (
                  <div key={label}>
                    <span className="block text-[10px] font-semibold uppercase text-[var(--cg-text-muted)]">{label}</span>
                    <span className={`text-[var(--cg-text)] ${mono ? 'font-mono' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-1.5 border-t border-[var(--cg-border)] pt-2">
                {inc.status === 'OPEN' && (
                  <button
                    onClick={() => handleUpdateStatus(inc.id, 'INVESTIGATING')}
                    className="rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                  >
                    Mark Investigating
                  </button>
                )}
                {inc.status === 'INVESTIGATING' && (
                  <button
                    onClick={() => handleUpdateStatus(inc.id, 'RESOLVED')}
                    className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-[var(--cg-success)] hover:bg-emerald-100 transition-colors"
                  >
                    Resolve
                  </button>
                )}
                {inc.status === 'RESOLVED' && (
                  <button
                    onClick={() => handleUpdateStatus(inc.id, 'CLOSED')}
                    className="rounded border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--cg-text-muted)] hover:bg-[var(--cg-border)] transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-card)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--cg-border)] bg-[var(--cg-danger)] px-5 py-4">
              <h3 className="font-semibold text-white">{t('createIncident')}</h3>
              <button onClick={() => setShowCreateModal(false)} aria-label="Close" className="text-white/70 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-semibold text-[var(--cg-text)]">Incident Category</label>
                <select value={incidentType} onChange={(e) => setIncidentType(e.target.value as BackendIncidentType)}
                  className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]">
                  <option value="OWNER_MISMATCH">Device Owner Mismatch</option>
                  <option value="LOST_DEVICE">Lost Device Interception</option>
                  <option value="UNAUTHORIZED_EXIT">Unauthorized Exit</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block font-semibold text-[var(--cg-text)]">Description *</label>
                <textarea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Officer observations and immediate actions…"
                  className="w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 py-2 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-[var(--cg-border)] pt-3">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="rounded-lg px-4 py-2 text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] transition-colors">
                  {t('cancel')}
                </button>
                <button type="submit" disabled={submitting}
                  className="rounded-lg bg-[var(--cg-danger)] px-5 py-2.5 font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60">
                  {submitting ? 'Submitting…' : 'Submit Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
