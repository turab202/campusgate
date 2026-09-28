import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Plus, X } from 'lucide-react';
import { SecurityIncident } from '../../types';
import { useApp } from '../../context/AppContext';
import { campusStore } from '../../services/storage';

export const IncidentManager: React.FC = () => {
  const { t, language, currentGate, activeOfficer, showToast } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [type, setType] = useState<SecurityIncident['type']>('DEVICE_MISMATCH');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [studentId, setStudentId] = useState('');

  const incidents = campusStore.getIncidents();
  const filtered = incidents.filter((i) => filterStatus === 'ALL' || i.status === filterStatus);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    campusStore.createIncident({
      type, title, description,
      gateId: currentGate.id, gateName: currentGate.name,
      officerBadge: activeOfficer.officerBadgeId,
      deviceSerial: deviceSerial || undefined,
      studentId: studentId || undefined,
      severity: 'HIGH'
    });
    showToast('Incident logged into central security registry', 'warning');
    setShowCreateModal(false);
    setTitle(''); setDescription('');
  };

  const handleUpdateStatus = (id: string, status: SecurityIncident['status']) => {
    campusStore.updateIncidentStatus(id, status, 'Updated by security operator');
    showToast(`Incident status updated to ${status}`, 'info');
  };

  const statusColors: Record<string, string> = {
    OPEN: 'bg-red-50 text-[var(--cg-danger)] border-red-200',
    UNDER_REVIEW: 'bg-amber-50 text-[var(--cg-warning)] border-amber-200',
    RESOLVED: 'bg-emerald-50 text-[var(--cg-success)] border-emerald-200',
    DISMISSED: 'bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)] border-[var(--cg-border)]',
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
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-[var(--cg-danger)] px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          {t('createIncident')}
        </button>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap items-center gap-2">
        {['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED'].map((s) => (
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

      {/* Incidents list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--cg-border)] bg-[var(--cg-surface)] p-8 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-[var(--cg-text-muted)] mb-2" />
            <p className="text-sm font-medium text-[var(--cg-text)]">No incidents for this filter</p>
          </div>
        ) : (
          filtered.map((inc) => (
            <div key={inc.id} className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cg-border)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--cg-text)]">
                    {inc.incidentNumber}
                  </span>
                  <span className="rounded bg-[var(--cg-surface-muted)] px-2 py-0.5 text-xs font-medium text-[var(--cg-text-muted)]">
                    {inc.type.replace(/_/g, ' ')}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                    inc.severity === 'HIGH' || inc.severity === 'CRITICAL'
                      ? 'bg-red-50 text-[var(--cg-danger)]'
                      : 'bg-amber-50 text-[var(--cg-warning)]'
                  }`}>
                    {inc.severity}
                  </span>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusColors[inc.status] || ''}`}>
                  {inc.status.replace('_', ' ')}
                </span>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-[var(--cg-text)]">{inc.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--cg-text-muted)]">{inc.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3 text-[11px] sm:grid-cols-4">
                {[
                  { label: 'Gate', value: inc.gateName },
                  { label: 'Officer', value: inc.officerBadge, mono: true },
                  { label: 'Device / Serial', value: inc.deviceSerial || 'N/A', mono: true },
                  { label: 'Logged', value: inc.timestamp },
                ].map(({ label, value, mono }) => (
                  <div key={label}>
                    <span className="block text-[10px] font-semibold uppercase text-[var(--cg-text-muted)]">{label}</span>
                    <span className={`text-[var(--cg-text)] ${mono ? 'font-mono' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-[var(--cg-border)] pt-2">
                <span className="text-[11px] text-[var(--cg-text-muted)]">
                  {inc.resolutionNotes || 'Open for investigation'}
                </span>
                <div className="flex items-center gap-1.5">
                  {inc.status === 'OPEN' && (
                    <button
                      onClick={() => handleUpdateStatus(inc.id, 'UNDER_REVIEW')}
                      className="rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                    >
                      Mark Under Review
                    </button>
                  )}
                  {inc.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateStatus(inc.id, 'RESOLVED')}
                      className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-[var(--cg-success)] hover:bg-emerald-100 transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
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
                <select value={type} onChange={(e) => setType(e.target.value as SecurityIncident['type'])}
                  className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]">
                  <option value="DEVICE_MISMATCH">Device Owner Mismatch</option>
                  <option value="UNKNOWN_DEVICE">Unknown / Unenrolled Device</option>
                  <option value="LOST_DEVICE">Lost Device Interception</option>
                  <option value="UNAUTHORIZED_EXIT">Unauthorized Exit</option>
                  <option value="IDENTITY_MISMATCH">Identity Mismatch</option>
                  <option value="QR_PROBLEM">QR Code Damage / Tamper</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block font-semibold text-[var(--cg-text)]">Incident Title *</label>
                <input required value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Serial mismatch during check-out"
                  className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-semibold text-[var(--cg-text)]">Device Serial</label>
                  <input value={deviceSerial} onChange={(e) => setDeviceSerial(e.target.value)} placeholder="e.g. PF123456"
                    className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 font-mono text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-semibold text-[var(--cg-text)]">Student ID</label>
                  <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. ASTU-2024-01234"
                    className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 font-mono text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
                </div>
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
                <button type="submit"
                  className="rounded-lg bg-[var(--cg-danger)] px-5 py-2.5 font-semibold text-white hover:opacity-90 transition-opacity">
                  Submit Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
