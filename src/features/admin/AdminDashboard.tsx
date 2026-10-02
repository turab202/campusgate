import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Download, Search, ArrowDownLeft, ArrowUpRight,
  Activity, Database, GitBranch, FileCheck, ScrollText,
  TrendingUp, AlertTriangle, Users, Zap, Loader2, RefreshCw, Plus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { campusStore } from '../../services/storage';
import { listDevicesApi, recoverDeviceApi, DeviceRead } from '../../services/deviceService';
import { listMovementsApi, DeviceMovementRead } from '../../services/movementService';
import { listGatesApi, createGateApi, listAssignmentsApi, createAssignmentApi, GateRead, GateAssignmentRead } from '../../services/gateService';
import { listAuditLogsApi, AuditLogRead } from '../../services/auditLogService';
import { searchUsersApi, UserSearchResult } from '../../services/userService';
import { ApiError } from '../../services/api';

export const AdminDashboard: React.FC = () => {
  const { t, language, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DEVICES' | 'GATES' | 'REQUESTS' | 'AUDIT'>('OVERVIEW');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('ALL');
  const [selectedDeviceForQr, setSelectedDeviceForQr] = useState<string | null>(null);

  // Gate assignment form
  const [newGateName, setNewGateName] = useState('');
  const [newGateCode, setNewGateCode] = useState('');
  const [newGateLocation, setNewGateLocation] = useState('');
  const [assignOfficerId, setAssignOfficerId] = useState('');
  const [assignGateId, setAssignGateId] = useState('');
  const [assignStart, setAssignStart] = useState('');
  const [assignEnd, setAssignEnd] = useState('');
  const [officerSearch, setOfficerSearch] = useState('');
  const [officerResults, setOfficerResults] = useState<UserSearchResult[]>([]);

  // Real API state
  const [apiDevices, setApiDevices] = useState<DeviceRead[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [apiMovements, setApiMovements] = useState<DeviceMovementRead[]>([]);
  const [apiGates, setApiGates] = useState<GateRead[]>([]);
  const [apiAssignments, setApiAssignments] = useState<GateAssignmentRead[]>([]);
  const [apiAuditLogs, setApiAuditLogs] = useState<AuditLogRead[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [gatesLoading, setGatesLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadDevices = useCallback(async () => {
    setDevicesLoading(true);
    try {
      const [devs, movs] = await Promise.all([listDevicesApi(), listMovementsApi()]);
      setApiDevices(devs);
      setApiMovements(movs);
    } catch { /* silent */ }
    finally { setDevicesLoading(false); }
  }, []);

  const loadGates = useCallback(async () => {
    setGatesLoading(true);
    try {
      const [gates, assignments] = await Promise.all([listGatesApi(), listAssignmentsApi()]);
      setApiGates(gates);
      setApiAssignments(assignments);
    } catch { /* silent */ }
    finally { setGatesLoading(false); }
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const logs = await listAuditLogsApi();
      setApiAuditLogs(logs);
    } catch { /* silent */ }
    finally { setAuditLoading(false); }
  }, []);

  useEffect(() => { loadDevices(); }, [loadDevices]);
  useEffect(() => { if (activeTab === 'GATES') loadGates(); }, [activeTab, loadGates]);
  useEffect(() => { if (activeTab === 'AUDIT') loadAudit(); }, [activeTab, loadAudit]);

  const handleOfficerSearch = async (q: string) => {
    setOfficerSearch(q);
    if (q.length < 2) { setOfficerResults([]); return; }
    try {
      const results = await searchUsersApi(q);
      setOfficerResults(results.filter((u) => u.role === 'GATE_OFFICER'));
    } catch { setOfficerResults([]); }
  };

  // Keep mock data for OVERVIEW stats and REQUESTS tab (not integrated yet)
  const mockGates = campusStore.getGates();
  const mockMovements = campusStore.getMovements();
  const requests = campusStore.getRequests();

  const totalEnrolled = apiDevices.length;
  const currentlyInside = apiDevices.filter((d) => d.status === 'INSIDE_CAMPUS').length;
  const currentlyOutside = apiDevices.filter((d) => d.status === 'OUTSIDE_CAMPUS').length;
  const currentlyLost = apiDevices.filter((d) => d.status === 'LOST' || d.status === 'REPORTED_LOST').length;
  const totalCheckInsToday = mockGates.reduce((acc, g) => acc + g.todayStats.checkIns, 0);
  const totalCheckOutsToday = mockGates.reduce((acc, g) => acc + g.todayStats.checkOuts, 0);
  const totalIncidentsOpen = 0; // not loaded here

  const filteredDevices = apiDevices.filter((d) => {
    if (deviceStatusFilter !== 'ALL' && d.status !== deviceStatusFilter) return false;
    if (deviceSearch) {
      const q = deviceSearch.toLowerCase();
      return (
        d.asset_id.toLowerCase().includes(q) ||
        d.serial_number.toLowerCase().includes(q) ||
        (d.brand ?? '').toLowerCase().includes(q) ||
        (d.model ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleResolveLost = async (devId: string) => {
    try {
      await recoverDeviceApi(devId, 'INSIDE_CAMPUS', 'Cleared by administrator after verification.');
      showToast('Lost flag cleared. Device restored to INSIDE CAMPUS.', 'success');
      loadDevices();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Recovery failed.';
      showToast(message, 'error');
    }
  };

  const handleApproveRequest = (reqId: string) => {
    campusStore.updateRequestStatus(reqId, 'APPROVED', 'Security Command Office');
    showToast('Exit request approved.', 'success');
  };

  const handleRejectRequest = (reqId: string) => {
    campusStore.updateRequestStatus(reqId, 'REJECTED', 'Security Command Office', 'Insufficient verification.');
    showToast('Exit request rejected.', 'warning');
  };

  const handleCreateGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGateName.trim() || !newGateCode.trim()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await createGateApi({ name: newGateName.trim(), code: newGateCode.trim(), location: newGateLocation.trim() || undefined });
      showToast(`Gate ${newGateCode} created.`, 'success');
      setNewGateName(''); setNewGateCode(''); setNewGateLocation('');
      loadGates();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create gate.');
    } finally { setSubmitting(false); }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignOfficerId || !assignGateId || !assignStart) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await createAssignmentApi({
        officer_id: assignOfficerId,
        gate_id: assignGateId,
        start_time: new Date(assignStart).toISOString(),
        end_time: assignEnd ? new Date(assignEnd).toISOString() : undefined,
      });
      showToast('Shift assignment created.', 'success');
      setAssignOfficerId(''); setAssignGateId(''); setAssignStart(''); setAssignEnd('');
      setOfficerSearch(''); setOfficerResults([]);
      loadGates();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create assignment.');
    } finally { setSubmitting(false); }
  };

  const statusBadge = (status: string) => {
    if (status === 'INSIDE_CAMPUS') return 'bg-[var(--cg-success-bg)] text-[var(--cg-success)] border-[var(--cg-success-border)]';
    if (status === 'LOST' || status === 'REPORTED_LOST') return 'bg-[var(--cg-danger-bg)] text-[var(--cg-danger)] border-[var(--cg-danger-border)]';
    return 'bg-[var(--cg-info-bg)] text-[var(--cg-info)] border-[var(--cg-info-border)]';
  };

  const tabs = [
    { id: 'OVERVIEW' as const, label: 'Gate Telemetry', icon: Activity },
    { id: 'DEVICES' as const, label: 'Device Registry', icon: Database },
    { id: 'GATES' as const, label: t('navGates'), icon: GitBranch },
    { id: 'REQUESTS' as const, label: 'Exit Requests', icon: FileCheck },
    { id: 'AUDIT' as const, label: 'Audit Logs', icon: ScrollText },
  ];

  const statCards = [
    { label: t('totalEnrolledDevices'), value: totalEnrolled, sub: 'Unique Asset IDs', color: 'text-white', icon: Database, iconBg: 'bg-white/15' },
    { label: 'Inside Campus', value: currentlyInside, sub: 'On university grounds', color: 'text-emerald-300', icon: TrendingUp, iconBg: 'bg-emerald-400/15' },
    { label: t('currentlyOutside'), value: currentlyOutside, sub: 'Exited via gate', color: 'text-sky-300', icon: ArrowUpRight, iconBg: 'bg-sky-400/15' },
    { label: "Today's Check-Ins", value: totalCheckInsToday, sub: 'All gates combined', color: 'text-emerald-300', icon: Zap, iconBg: 'bg-emerald-400/15' },
    { label: "Today's Check-Outs", value: totalCheckOutsToday, sub: 'All gates combined', color: 'text-sky-300', icon: Users, iconBg: 'bg-sky-400/15' },
    { label: 'Active Alerts', value: totalIncidentsOpen + currentlyLost, sub: `${currentlyLost} Lost · ${totalIncidentsOpen} Open`, color: 'text-red-300', icon: AlertTriangle, iconBg: 'bg-red-400/15' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Admin header */}
      <div className="overflow-hidden rounded-2xl border border-[var(--cg-border)] shadow-[var(--cg-shadow-sm)]" style={{ background: 'linear-gradient(135deg, #0F2340 0%, #1E3A5F 50%, #2D5282 100%)' }}>
        <div className="px-6 py-5">
          {/* Title row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 border border-white/20">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white">{t('adminDashboardTitle')}</h1>
                  <span className="rounded-full bg-white/15 border border-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white/80">SYSTEM LEVEL</span>
                </div>
                <p className="mt-0.5 text-xs text-white/50">Centralized telemetry across all university gates · Adama Science & Technology University</p>
              </div>
            </div>
            <button
              onClick={() => showToast('Report export queued.', 'info')}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              {t('exportPdf')}
            </button>
          </div>

          {/* Stat cards */}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-5 sm:grid-cols-3 lg:grid-cols-6">
            {statCards.map(({ label, value, sub, color, icon: Icon, iconBg }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div>
                  <span className={`block font-mono text-2xl font-bold ${color}`}>{value}</span>
                  <span className="block text-[10px] font-semibold text-white/60 leading-tight mt-0.5">{label}</span>
                  <span className="block text-[10px] text-white/35">{sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-white/15 bg-white/5 px-4 py-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === id ? 'bg-white text-[var(--cg-primary)] shadow-[var(--cg-shadow-xs)]' : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--cg-text)]">{t('liveGateMonitoring')}</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cg-success-border)] bg-[var(--cg-success-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--cg-success)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--cg-success)] animate-pulse" />
              {mockGates.length} Stations Online
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {mockGates.map((g) => (
              <div key={g.id} className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)] space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-[var(--cg-primary)] bg-[var(--cg-primary-light)] px-2 py-0.5 rounded-md border border-[var(--cg-border)]">{g.code}</span>
                    <h3 className="mt-2 font-bold text-base text-[var(--cg-text)]">{language === 'am' ? g.nameAmharic : g.name}</h3>
                    <p className="text-[11px] text-[var(--cg-text-muted)] leading-tight mt-0.5">{g.locationDescription}</p>
                  </div>
                  <span className="rounded-full bg-[var(--cg-success-bg)] border border-[var(--cg-success-border)] px-2.5 py-1 text-[10px] font-semibold text-[var(--cg-success)]">ACTIVE</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  {[
                    { label: 'Entries', value: g.todayStats.checkIns, cls: 'bg-[var(--cg-success-bg)] text-[var(--cg-success)] border-[var(--cg-success-border)]' },
                    { label: 'Exits', value: g.todayStats.checkOuts, cls: 'bg-[var(--cg-info-bg)] text-[var(--cg-info)] border-[var(--cg-info-border)]' },
                    { label: 'Visitors', value: g.todayStats.visitors, cls: 'bg-[var(--cg-warning-bg)] text-[var(--cg-warning)] border-[var(--cg-warning-border)]' },
                    { label: 'Incidents', value: g.todayStats.incidents, cls: 'bg-[var(--cg-danger-bg)] text-[var(--cg-danger)] border-[var(--cg-danger-border)]' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className={`rounded-xl border p-2.5 ${cls}`}>
                      <span className="block text-[10px] font-semibold uppercase">{label}</span>
                      <span className="block font-mono text-lg font-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Activity feed — real movements */}
          <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-sm)]">
            <div className="flex items-center justify-between border-b border-[var(--cg-border)] px-5 py-4">
              <h3 className="text-sm font-bold text-[var(--cg-text)]">Recent Gate Activity Feed</h3>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--cg-success)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--cg-success)] animate-pulse" />
                Live
              </span>
            </div>
            <div className="divide-y divide-[var(--cg-border)]">
              {apiMovements.slice(0, 5).map((mov) => {
                const isIn = mov.movement_type === 'CHECK_IN';
                const ts = new Date(mov.occurred_at).toLocaleString();
                return (
                  <div key={mov.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isIn ? 'bg-[var(--cg-success-bg)] text-[var(--cg-success)]' : 'bg-[var(--cg-info-bg)] text-[var(--cg-info)]'}`}>
                        {isIn ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[var(--cg-text)] font-mono">{mov.device_id.slice(0, 8)}…</div>
                        <div className="text-[11px] text-[var(--cg-text-muted)]">{isIn ? 'Entered' : 'Exited'} · Gate {mov.gate_id.slice(0, 8)}…</div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-[var(--cg-text-muted)]">{ts}</span>
                  </div>
                );
              })}
              {apiMovements.length === 0 && !devicesLoading && (
                <div className="px-5 py-6 text-center text-xs text-[var(--cg-text-muted)]">No recent activity.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DEVICES TAB */}
      {activeTab === 'DEVICES' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--cg-text)]">{t('allDevicesRegistry')}</h2>
              <p className="mt-0.5 text-xs text-[var(--cg-text-muted)]">Every device enrolled once with unique serial and permanent QR asset pass.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--cg-text-muted)]" />
                <input type="text" value={deviceSearch} onChange={(e) => setDeviceSearch(e.target.value)} placeholder={t('searchAllDevices')}
                  className="h-9 w-56 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] pl-9 pr-3 text-xs text-[var(--cg-text)] focus:border-[var(--cg-primary)] focus:outline-none transition-colors" />
              </div>
              <select value={deviceStatusFilter} onChange={(e) => setDeviceStatusFilter(e.target.value)}
                className="h-9 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 text-xs text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)] transition-colors">
                <option value="ALL">All Statuses</option>
                <option value="INSIDE_CAMPUS">Inside Campus</option>
                <option value="OUTSIDE_CAMPUS">Outside Campus</option>
                <option value="LOST">Reported Lost</option>
              </select>
              <button onClick={loadDevices} disabled={devicesLoading}
                className="flex items-center gap-1.5 h-9 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 text-[var(--cg-text-muted)] hover:bg-[var(--cg-border)] transition-colors disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${devicesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-sm)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--cg-border)] bg-[var(--cg-surface-muted)]">
                  <tr>
                    {['Asset ID', 'Device & Model', 'Serial Number', 'Owner ID', 'Status', 'Enrolled', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cg-text-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cg-border)]">
                  {devicesLoading ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-[var(--cg-primary)]" /></td></tr>
                  ) : filteredDevices.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--cg-text-muted)]">No devices found.</td></tr>
                  ) : filteredDevices.map((dev) => (
                    <tr key={dev.id} className="hover:bg-[var(--cg-surface-muted)] transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[var(--cg-primary)] text-[11px]">{dev.asset_id}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--cg-text)]">{dev.brand} {dev.model}</div>
                        <div className="text-[11px] text-[var(--cg-text-muted)]">{dev.device_type}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--cg-text)]">{dev.serial_number}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--cg-text-muted)]">{dev.owner_id.slice(0, 8)}…</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusBadge(dev.status)}`}>
                          {dev.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[var(--cg-text-muted)]">
                        {new Date(dev.registered_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5">
                        {(dev.status === 'LOST' || dev.status === 'REPORTED_LOST') && (
                          <button onClick={() => handleResolveLost(dev.id)}
                            className="rounded-lg border border-[var(--cg-success-border)] bg-[var(--cg-success-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--cg-success)] hover:opacity-80 transition-opacity">
                            Clear Lost
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* GATES TAB */}
      {activeTab === 'GATES' && (
        <div className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-4 text-sm text-[var(--cg-danger)]">{formError}</div>
          )}

          {/* Create Gate */}
          <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-6 shadow-[var(--cg-shadow-sm)] space-y-4">
            <h2 className="text-sm font-bold text-[var(--cg-text)]">Create New Gate</h2>
            <form onSubmit={handleCreateGate} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cg-text-muted)]">Gate Name *</label>
                <input required value={newGateName} onChange={(e) => setNewGateName(e.target.value)} placeholder="e.g. Gate 4"
                  className="h-10 w-full rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 text-xs text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cg-text-muted)]">Gate Code *</label>
                <input required value={newGateCode} onChange={(e) => setNewGateCode(e.target.value.toUpperCase())} placeholder="e.g. GATE-04"
                  className="h-10 w-full rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 text-xs font-mono text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cg-text-muted)]">Location</label>
                <input value={newGateLocation} onChange={(e) => setNewGateLocation(e.target.value)} placeholder="e.g. East Campus"
                  className="h-10 w-full rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 text-xs text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-1.5 h-10 w-full rounded-xl bg-[var(--cg-primary)] text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors disabled:opacity-60">
                  <Plus className="h-3.5 w-3.5" /> {submitting ? 'Creating…' : 'Create Gate'}
                </button>
              </div>
            </form>
          </div>

          {/* Gates list */}
          <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[var(--cg-text)]">Registered Gates</h3>
              <button onClick={loadGates} disabled={gatesLoading}
                className="flex items-center gap-1 text-xs text-[var(--cg-text-muted)] hover:text-[var(--cg-text)]">
                <RefreshCw className={`h-3.5 w-3.5 ${gatesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {gatesLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--cg-primary)]" /></div>
            ) : apiGates.length === 0 ? (
              <p className="text-center text-xs text-[var(--cg-text-muted)] py-6">No gates registered yet.</p>
            ) : (
              <div className="divide-y divide-[var(--cg-border)]">
                {apiGates.map((g) => (
                  <div key={g.id} className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cg-primary-light)]">
                        <span className="h-2 w-2 rounded-full bg-[var(--cg-success)]" />
                      </div>
                      <div>
                        <span className="block font-semibold text-sm text-[var(--cg-text)]">{g.name}</span>
                        <span className="block text-[11px] text-[var(--cg-text-muted)]">{g.location ?? 'No location'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block font-mono text-xs font-bold text-[var(--cg-primary)]">{g.code}</span>
                      <span className={`block text-[10px] font-semibold ${g.is_active ? 'text-[var(--cg-success)]' : 'text-[var(--cg-danger)]'}`}>
                        {g.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Assignment */}
          <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-6 shadow-[var(--cg-shadow-sm)] space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--cg-text)]">Station Shift Assignment</h2>
              <p className="mt-0.5 text-xs text-[var(--cg-text-muted)] max-w-2xl">Assign a gate officer to a gate for a specific time window.</p>
            </div>
            <form onSubmit={handleCreateAssignment} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cg-text-muted)]">Officer Search</label>
                <input value={officerSearch} onChange={(e) => handleOfficerSearch(e.target.value)} placeholder="Search officer name…"
                  className="h-10 w-full rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 text-xs text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
                {officerResults.length > 0 && (
                  <div className="rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-sm">
                    {officerResults.map((o) => (
                      <button key={o.id} type="button"
                        onClick={() => { setAssignOfficerId(o.id); setOfficerSearch(o.full_name); setOfficerResults([]); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--cg-surface-muted)] text-left">
                        <span className="font-semibold text-[var(--cg-text)]">{o.full_name}</span>
                        <span className="text-[var(--cg-text-muted)]">{o.campus_id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cg-text-muted)]">Gate Station *</label>
                <select required value={assignGateId} onChange={(e) => setAssignGateId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 text-xs text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]">
                  <option value="">Select gate…</option>
                  {apiGates.filter((g) => g.is_active).map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cg-text-muted)]">Start Time *</label>
                <input required type="datetime-local" value={assignStart} onChange={(e) => setAssignStart(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 text-xs text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={submitting || !assignOfficerId}
                  className="h-10 w-full rounded-xl bg-[var(--cg-primary)] text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors disabled:opacity-60">
                  {submitting ? 'Assigning…' : 'Assign Officer'}
                </button>
              </div>
            </form>
          </div>

          {/* Assignments list */}
          <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)]">
            <h3 className="mb-3 text-sm font-bold text-[var(--cg-text)]">Current Assignments</h3>
            {apiAssignments.length === 0 ? (
              <p className="text-center text-xs text-[var(--cg-text-muted)] py-6">No assignments yet.</p>
            ) : (
              <div className="divide-y divide-[var(--cg-border)]">
                {apiAssignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-3.5">
                    <div>
                      <span className="block font-mono text-xs font-semibold text-[var(--cg-primary)]">{a.officer_id.slice(0, 8)}…</span>
                      <span className="block text-[11px] text-[var(--cg-text-muted)]">
                        Gate: {a.gate_id.slice(0, 8)}… · {new Date(a.start_time).toLocaleString()}
                      </span>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${a.is_active ? 'bg-[var(--cg-success-bg)] text-[var(--cg-success)] border-[var(--cg-success-border)]' : 'bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)] border-[var(--cg-border)]'}`}>
                      {a.is_active ? 'ACTIVE' : 'ENDED'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* REQUESTS TAB */}
      {activeTab === 'REQUESTS' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)]">
            <h2 className="text-sm font-bold text-[var(--cg-text)]">Temporary Device Exit Authorizations</h2>
            <p className="mt-0.5 text-xs text-[var(--cg-text-muted)]">Security approvals for university lab hardware and exhibition devices.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {requests.map((req) => {
              const isPending = req.status === 'PENDING';
              return (
                <div key={req.id} className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[var(--cg-primary)]">{req.requestNumber}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${req.status === 'APPROVED' ? 'bg-[var(--cg-success-bg)] text-[var(--cg-success)] border-[var(--cg-success-border)]' : isPending ? 'bg-[var(--cg-warning-bg)] text-[var(--cg-warning)] border-[var(--cg-warning-border)]' : 'bg-[var(--cg-danger-bg)] text-[var(--cg-danger)] border-[var(--cg-danger-border)]'}`}>
                      {req.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--cg-text)]">{req.deviceDescription}</h3>
                    <p className="mt-1 text-xs text-[var(--cg-text-muted)]">Applicant: <strong className="text-[var(--cg-text)]">{req.applicantName}</strong> · {req.applicantId} · {req.department}</p>
                    <p className="text-xs text-[var(--cg-text-muted)]">Destination: <strong className="text-[var(--cg-text)]">{req.destination}</strong></p>
                    <p className="mt-1 text-xs italic text-[var(--cg-text-muted)]">&ldquo;{req.reason}&rdquo;</p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-2.5 text-xs">
                    <span className="text-[var(--cg-text-muted)]">Expected Return:</span>
                    <span className="font-semibold text-[var(--cg-text)]">{req.expectedReturnDate}</span>
                  </div>
                  {isPending && (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleRejectRequest(req.id)}
                        className="flex items-center gap-1 rounded-xl border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--cg-danger)] hover:opacity-80 transition-opacity">
                        Reject
                      </button>
                      <button onClick={() => handleApproveRequest(req.id)}
                        className="flex items-center gap-1 rounded-xl bg-[var(--cg-primary)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors">
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AUDIT TAB */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)]">
            <div>
              <h2 className="text-sm font-bold text-[var(--cg-text)]">{t('auditTrail')}</h2>
              <p className="mt-0.5 text-xs text-[var(--cg-text-muted)]">Immutable audit event generated on every security operation.</p>
            </div>
            <button onClick={loadAudit} disabled={auditLoading}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 py-2 text-xs font-semibold text-[var(--cg-text)] hover:bg-[var(--cg-border)] transition-colors disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-sm)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--cg-border)] bg-[var(--cg-surface-muted)]">
                  <tr>
                    {[t('timestamp'), 'Actor ID', t('action'), 'Entity Type', 'Entity ID', 'Description'].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cg-text-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cg-border)]">
                  {auditLoading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-[var(--cg-primary)]" /></td></tr>
                  ) : apiAuditLogs.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--cg-text-muted)]">No audit logs found.</td></tr>
                  ) : apiAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--cg-surface-muted)] transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--cg-text-muted)] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--cg-text-muted)]">
                        {log.actor_id ? log.actor_id.slice(0, 8) + '…' : 'System'}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-[11px] text-[var(--cg-text)] whitespace-nowrap">{log.action}</td>
                      <td className="px-4 py-3 text-[var(--cg-text-muted)]">{log.entity_type}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--cg-text-muted)] max-w-[120px] truncate">
                        {log.entity_id ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-[var(--cg-text-muted)] max-w-xs truncate">{log.description ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
