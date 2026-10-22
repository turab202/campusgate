import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Loader2, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  listIncidentsApi, createIncidentApi, patchIncidentApi,
  IncidentRead, BackendIncidentType, BackendIncidentStatus
} from '../../services/incidentService';
import { ApiError } from '../../services/api';
import { listDevicesApi, DeviceRead } from '../../services/deviceService';

export const IncidentManager: React.FC = () => {
  const { t, language, showToast, role, currentGate } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [incidentType, setIncidentType] = useState<BackendIncidentType>('OWNER_MISMATCH');
  const [description, setDescription] = useState('');

  const [incidents, setIncidents] = useState<IncidentRead[]>([]);
  const [devices, setDevices] = useState<DeviceRead[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyIncidentId, setBusyIncidentId] = useState<string | null>(null);
  const isAdmin = role === 'ADMIN';

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

  useEffect(() => {
    listDevicesApi()
      .then(setDevices)
      .catch((err: unknown) => {
        setDevicesError(err instanceof ApiError ? err.message : 'Failed to load devices for incident linking.');
      });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      await createIncidentApi({
        incident_type: incidentType,
        description: description.trim(),
        ...(selectedDeviceId ? { device_id: selectedDeviceId } : {}),
        ...(role === 'OFFICER' && currentGate.id ? { gate_id: currentGate.id } : {}),
      });
      showToast('Incident logged into central security registry', 'warning');
      setShowCreateModal(false);
      setDescription('');
      setSelectedDeviceId('');
      load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create incident.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: BackendIncidentStatus) => {
    setBusyIncidentId(id);
    try {
      await patchIncidentApi(id, { status });
      showToast(`Incident status updated to ${status}`, 'info');
      load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update incident.';
      showToast(message, 'error');
    } finally {
      setBusyIncidentId(null);
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
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-[var(--cg-text)]">{t('navIncidents')}</h2>
            <p className="mt-0.5 text-xs text-[var(--cg-text-muted)]">
              {language === 'am'
                ? 'የደህንነት ስጋቶች እና አለመጣጣሞች ሪፖርት'
                : 'Security incidents, flag alerts, and unauthorized gate crossing records.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
            <button
              onClick={load}
              disabled={loading}
              aria-label="Refresh incidents"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] text-[var(--cg-text-muted)] transition-colors hover:bg-[var(--cg-surface-muted)] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={role === 'OFFICER' && !currentGate.id}
              className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[var(--cg-danger)] px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>{t('createIncident')}</span>
            </button>
          </div>
        </div>
        {role === 'OFFICER' && currentGate.id && (
          <p className="border-t border-[var(--cg-border)] pt-3 text-xs leading-relaxed text-[var(--cg-text-muted)]">
            Reports created here are recorded at {currentGate.name}. Incident status is managed by administrators.
          </p>
        )}
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
        ) : error ? null : incidents.length === 0 ? (
          <EmptyState title="No incidents for this filter" />
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

              <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3 text-[11px] sm:grid-cols-4">
                {[
                  { label: 'Reported By', value: inc.reported_by.slice(0, 8) + '…', mono: true },
                  { label: 'Device', value: inc.device_id ? inc.device_id.slice(0, 8) + '…' : 'N/A', mono: true },
                  { label: 'Gate', value: inc.gate_id ? inc.gate_id.slice(0, 8) + '…' : 'N/A', mono: true },
                  { label: 'Logged', value: new Date(inc.created_at).toLocaleString() },
                ].map(({ label, value, mono }) => (
                  <div key={label}>
                    <span className="block text-[10px] font-semibold uppercase text-[var(--cg-text-muted)]">{label}</span>
                    <span className={`text-[var(--cg-text)] ${mono ? 'font-mono' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-1.5 border-t border-[var(--cg-border)] pt-2">
                {isAdmin && inc.status === 'OPEN' && (
                  <button
                    onClick={() => handleUpdateStatus(inc.id, 'INVESTIGATING')}
                    disabled={busyIncidentId === inc.id}
                    className="rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                  >
                    Mark Investigating
                  </button>
                )}
                {isAdmin && inc.status === 'INVESTIGATING' && (
                  <button
                    onClick={() => handleUpdateStatus(inc.id, 'RESOLVED')}
                    disabled={busyIncidentId === inc.id}
                    className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-[var(--cg-success)] hover:bg-emerald-100 transition-colors"
                  >
                    Resolve
                  </button>
                )}
                {isAdmin && inc.status === 'RESOLVED' && (
                  <button
                    onClick={() => handleUpdateStatus(inc.id, 'CLOSED')}
                    disabled={busyIncidentId === inc.id}
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="create-incident-title" className="my-auto max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-card)] sm:max-h-[calc(100dvh-2rem)]">
            <div className="flex items-center justify-between border-b border-[var(--cg-border)] bg-[var(--cg-danger)] px-5 py-4">
              <h3 id="create-incident-title" className="font-semibold text-white">{t('createIncident')}</h3>
              <button onClick={() => setShowCreateModal(false)} aria-label="Close" className="text-white/70 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 p-4 text-xs sm:p-5">
              {devicesError && (
                <p role="alert" className="text-xs text-[var(--cg-danger)]">
                  {devicesError} Incidents can still be submitted without linking a device.
                </p>
              )}
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
                <label className="block font-semibold text-[var(--cg-text)]">Related device (optional)</label>
                <select value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)]">
                  <option value="">No device linked</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.asset_id} · {device.serial_number}
                    </option>
                  ))}
                </select>
              </div>
              {role === 'OFFICER' && (
                <p className="text-xs text-[var(--cg-text-muted)]">
                  Gate: {currentGate.id ? currentGate.name : 'No active assignment'}
                </p>
              )}
              <div className="space-y-1.5">
                <label className="block font-semibold text-[var(--cg-text)]">Description *</label>
                <textarea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Officer observations and immediate actions…"
                  className="w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 py-2 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-[var(--cg-border)] pt-3 sm:flex-row sm:items-center sm:justify-end">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="min-h-11 rounded-lg px-4 py-2 text-[var(--cg-text-muted)] transition-colors hover:bg-[var(--cg-surface-muted)]">
                  {t('cancel')}
                </button>
                <button type="submit" disabled={submitting}
                  className="min-h-11 rounded-lg bg-[var(--cg-danger)] px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
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
