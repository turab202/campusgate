import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Download, Search, ArrowDownLeft, ArrowUpRight,
  Activity, Database, GitBranch, ScrollText,
  TrendingUp, AlertTriangle, Users, Zap, Loader2, RefreshCw, Plus, UserRoundCog
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EmptyState } from '../../components/ui/EmptyState';
import { listDevicesApi, recoverDeviceApi, DeviceRead } from '../../services/deviceService';
import { listMovementsApi, DeviceMovementRead } from '../../services/movementService';
import { listGatesApi, createGateApi, listAssignmentsApi, createAssignmentApi, GateRead, GateAssignmentRead } from '../../services/gateService';
import { listAuditLogsApi, AuditLogRead } from '../../services/auditLogService';
import { listIncidentsApi, IncidentRead } from '../../services/incidentService';
import { listVisitsApi, VisitRead } from '../../services/visitService';
import { searchUsersApi, UserSearchResult } from '../../services/userService';
import { ApiError } from '../../services/api';
import { VisitorManager } from '../officer/VisitorManager';
import { IncidentManager } from '../officer/IncidentManager';
import { Button } from '../../components/ui/Button';
import { AdminUserManagement } from './AdminUserManagement';

export const AdminDashboard: React.FC = () => {
  const { t, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DEVICES' | 'GATES' | 'USERS' | 'VISITORS' | 'INCIDENTS' | 'AUDIT'>('OVERVIEW');
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
  const [apiIncidents, setApiIncidents] = useState<IncidentRead[]>([]);
  const [apiVisits, setApiVisits] = useState<VisitRead[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [gatesLoading, setGatesLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [gatesError, setGatesError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadDevices = useCallback(async () => {
    setDevicesLoading(true);
    setDashboardError(null);
    try {
      const [devs, movs, incidents, visits] = await Promise.all([
        listDevicesApi(),
        listMovementsApi(),
        listIncidentsApi(),
        listVisitsApi(),
      ]);
      setApiDevices(devs);
      setApiMovements(movs);
      setApiIncidents(incidents);
      setApiVisits(visits);
    } catch (err) {
      setDashboardError(err instanceof ApiError ? err.message : 'Failed to load dashboard data.');
    }
    finally { setDevicesLoading(false); }
  }, []);

  const loadGates = useCallback(async () => {
    setGatesLoading(true);
    setGatesError(null);
    try {
      const [gates, assignments] = await Promise.all([listGatesApi(), listAssignmentsApi()]);
      setApiGates(gates);
      setApiAssignments(assignments);
    } catch (err) {
      setGatesError(err instanceof ApiError ? err.message : 'Failed to load gates and assignments.');
    }
    finally { setGatesLoading(false); }
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const logs = await listAuditLogsApi();
      setApiAuditLogs(logs);
    } catch (err) {
      setAuditError(err instanceof ApiError ? err.message : 'Failed to load audit logs.');
    }
    finally { setAuditLoading(false); }
  }, []);

  useEffect(() => { loadDevices(); }, [loadDevices]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void loadDevices();
    };
    const intervalId = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
    };
  }, [loadDevices]);
  useEffect(() => { if (activeTab === 'GATES' || activeTab === 'OVERVIEW') loadGates(); }, [activeTab, loadGates]);
  useEffect(() => { if (activeTab === 'AUDIT') loadAudit(); }, [activeTab, loadAudit]);

  const handleOfficerSearch = async (q: string) => {
    setOfficerSearch(q);
    setAssignOfficerId('');
    if (q.length < 2) { setOfficerResults([]); return; }
    try {
      const results = await searchUsersApi(q);
      setOfficerResults(results.filter((u) => u.role === 'GATE_OFFICER'));
    } catch { setOfficerResults([]); }
  };

  const totalEnrolled = apiDevices.length;
  const currentlyInside = apiDevices.filter((d) => d.status === 'INSIDE_CAMPUS').length;
  const currentlyOutside = apiDevices.filter((d) => d.status === 'OUTSIDE_CAMPUS').length;
  const currentlyLost = apiDevices.filter((d) => d.status === 'LOST' || d.status === 'REPORTED_LOST').length;
  const totalCheckInsToday = apiMovements.filter((m) => m.movement_type === 'CHECK_IN').length;
  const totalCheckOutsToday = apiMovements.filter((m) => m.movement_type === 'CHECK_OUT').length;
  const totalIncidentsOpen = apiIncidents.filter((i) => i.status === 'OPEN').length;
  const pendingVisits = apiVisits.filter((visit) => visit.status === 'PENDING').length;

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
    if (assignEnd && new Date(assignEnd) <= new Date(assignStart)) {
      setFormError('End time must be later than the start time.');
      return;
    }
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
    { id: 'USERS' as const, label: 'User Management', icon: UserRoundCog },
    { id: 'VISITORS' as const, label: 'Visitor Requests', icon: Users },
    { id: 'INCIDENTS' as const, label: t('navIncidents'), icon: AlertTriangle },
    { id: 'AUDIT' as const, label: 'Audit Logs', icon: ScrollText },
  ];

  const statCards = [
    { label: t('totalEnrolledDevices'), value: totalEnrolled, sub: 'Unique Asset IDs', color: 'text-[var(--cg-text)]', icon: Database, iconBg: 'bg-[var(--cg-primary-light)] text-[var(--cg-primary)]' },
    { label: 'Inside Campus', value: currentlyInside, sub: 'On university grounds', color: 'text-[var(--cg-success)]', icon: TrendingUp, iconBg: 'bg-[var(--cg-success-bg)] text-[var(--cg-success)]' },
    { label: t('currentlyOutside'), value: currentlyOutside, sub: 'Exited via gate', color: 'text-[var(--cg-info)]', icon: ArrowUpRight, iconBg: 'bg-[var(--cg-info-bg)] text-[var(--cg-info)]' },
    { label: "Today's Check-Ins", value: totalCheckInsToday, sub: 'All gates combined', color: 'text-[var(--cg-success)]', icon: Zap, iconBg: 'bg-[var(--cg-success-bg)] text-[var(--cg-success)]' },
    { label: "Today's Check-Outs", value: totalCheckOutsToday, sub: 'All gates combined', color: 'text-[var(--cg-info)]', icon: Users, iconBg: 'bg-[var(--cg-info-bg)] text-[var(--cg-info)]' },
    { label: 'Active Alerts', value: totalIncidentsOpen + currentlyLost, sub: `${currentlyLost} Lost · ${totalIncidentsOpen} Open`, color: 'text-[var(--cg-danger)]', icon: AlertTriangle, iconBg: 'bg-[var(--cg-danger-bg)] text-[var(--cg-danger)]' },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 xl:flex-row">
        <aside className="w-full shrink-0 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-3.5 shadow-[var(--cg-shadow-sm)] xl:w-72">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cg-primary)]/10 text-[var(--cg-primary)]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">System</p>
              <p className="text-sm font-bold text-[var(--cg-text)]">{t('adminDashboardTitle')}</p>
            </div>
          </div>

          <nav aria-label="Administrator sections" className="mt-4 flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible">
            {tabs.map(({ id, label, icon: Icon }) => {
              const count = id === 'VISITORS' ? pendingVisits : id === 'INCIDENTS' ? totalIncidentsOpen : 0;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  aria-current={activeTab === id ? 'page' : undefined}
                  className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cg-primary)] xl:w-full ${
                    activeTab === id ? 'bg-[var(--cg-primary)] text-white shadow-[var(--cg-shadow-xs)]' : 'bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)] hover:text-[var(--cg-text)]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                  {count > 0 && (
                    <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === id ? 'bg-white/20 text-white' : 'bg-[var(--cg-danger-bg)] text-[var(--cg-danger)]'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-4 hidden rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3 xl:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">Quick status</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--cg-text-muted)]">Inside</span>
                <span className="font-mono font-bold text-[var(--cg-success)]">{currentlyInside}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--cg-text-muted)]">Outside</span>
                <span className="font-mono font-bold text-[var(--cg-info)]">{currentlyOutside}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--cg-text-muted)]">Alerts</span>
                <span className="font-mono font-bold text-[var(--cg-danger)]">{currentlyLost}</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 space-y-5">
          <header className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] px-4 py-3 shadow-[var(--cg-shadow-sm)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">Campus operations</p>
                <h1 className="mt-1 text-lg font-bold text-[var(--cg-text)]">{t('adminDashboardTitle')}</h1>
              </div>
              <Button
                onClick={() => showToast('Report export queued.', 'info')}
                variant="secondary"
                size="sm"
                icon={<Download className="h-3.5 w-3.5" />}
                className="w-fit max-w-full"
              >
                {t('exportPdf')}
              </Button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {statCards.map(({ label, value, sub, color, icon: Icon, iconBg }) => (
                <div key={label} className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-2.5">
                  <div className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className={`font-mono text-lg font-bold ${color}`}>{value}</div>
                  <div className="mt-0.5 text-[9px] font-semibold text-[var(--cg-text-muted)]">{label}</div>
                  <div className="text-[9px] text-[var(--cg-text-subtle)]">{sub}</div>
                </div>
              ))}
            </div>
          </header>

          {/* OVERVIEW TAB */}
          {activeTab === 'OVERVIEW' && (
        <div className="space-y-5">
          {dashboardError && (
            <div className="rounded-xl border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-4 text-sm text-[var(--cg-danger)]">
              {dashboardError}
              <button onClick={loadDevices} className="ml-3 underline text-xs">Retry</button>
            </div>
          )}
          {gatesError && (
            <div className="rounded-xl border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-4 text-sm text-[var(--cg-danger)]">
              {gatesError}
              <button onClick={loadGates} className="ml-3 underline text-xs">Retry</button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--cg-text)]">{t('liveGateMonitoring')}</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cg-success-border)] bg-[var(--cg-success-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--cg-success)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--cg-success)] animate-pulse" />
              {apiGates.filter((gate) => gate.is_active).length} Stations Online
            </span>
          </div>

          {gatesLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--cg-primary)]" /></div>
          ) : gatesError ? null : apiGates.length === 0 ? (
            <EmptyState title="No gates registered" />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {apiGates.map((gate) => (
                <div key={gate.id} className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-[var(--cg-primary)] bg-[var(--cg-primary-light)] px-2 py-0.5 rounded-md border border-[var(--cg-border)]">{gate.code}</span>
                      <h3 className="mt-2 font-bold text-base text-[var(--cg-text)]">{gate.name}</h3>
                      <p className="text-[11px] text-[var(--cg-text-muted)] leading-tight mt-0.5">{gate.location ?? 'No location'}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${gate.is_active ? 'bg-[var(--cg-success-bg)] text-[var(--cg-success)] border-[var(--cg-success-border)]' : 'bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)] border-[var(--cg-border)]'}`}>
                      {gate.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

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
              {apiMovements.length === 0 && !devicesLoading && !dashboardError && (
                <div className="p-4"><EmptyState title="No recent activity" /></div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)]">
              <h3 className="mb-3 text-sm font-bold text-[var(--cg-text)]">Recent Incidents</h3>
              {dashboardError ? null : apiIncidents.length === 0 ? <EmptyState title="No incidents found" /> : (
                <div className="divide-y divide-[var(--cg-border)]">
                  {apiIncidents.slice(0, 3).map((incident) => (
                    <div key={incident.id} className="py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs text-[var(--cg-text-muted)]">{incident.id.slice(0, 8)}…</span>
                        <span className="text-[10px] font-semibold text-[var(--cg-text-muted)]">{incident.status}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[var(--cg-text)]">{incident.incident_type.replace(/_/g, ' ')}</p>
                      <p className="mt-0.5 text-xs text-[var(--cg-text-muted)]">{incident.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)]">
              <h3 className="mb-3 text-sm font-bold text-[var(--cg-text)]">Recent Visits</h3>
              {dashboardError ? null : apiVisits.length === 0 ? <EmptyState title="No visits found" /> : (
                <div className="divide-y divide-[var(--cg-border)]">
                  {apiVisits.slice(0, 3).map((visit) => (
                    <div key={visit.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <span className="block font-mono text-xs text-[var(--cg-text-muted)]">{visit.id.slice(0, 8)}…</span>
                        <span className="mt-1 block text-[11px] text-[var(--cg-text-muted)]">Host ID: {visit.host_user_id.slice(0, 8)}…</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-semibold text-[var(--cg-text-muted)]">{visit.status}</span>
                        <span className="block text-[11px] text-[var(--cg-text-muted)]">{new Date(visit.expected_start_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* DEVICES TAB */}
      {activeTab === 'DEVICES' && (
        <div className="space-y-4">
          {dashboardError && (
            <div className="rounded-xl border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-4 text-sm text-[var(--cg-danger)]">
              {dashboardError}
              <button onClick={loadDevices} className="ml-3 underline text-xs">Retry</button>
            </div>
          )}
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
                  ) : dashboardError ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--cg-danger)]">Unable to show devices until the request succeeds.</td></tr>
                  ) : filteredDevices.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8"><EmptyState title="No devices found" /></td></tr>
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
            <div role="alert" className="rounded-xl border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-4 text-sm text-[var(--cg-danger)]">{formError}</div>
          )}

          {/* Create Gate */}
          <div className="space-y-5 rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)] sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cg-primary-light)] text-[var(--cg-primary)]">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--cg-text)]">Create a gate</h2>
                <p className="mt-1 text-sm text-[var(--cg-text-muted)]">Add a campus entrance to the gate registry.</p>
              </div>
            </div>
            <form onSubmit={handleCreateGate} className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="new-gate-name" className="block text-xs font-semibold text-[var(--cg-text)]">Gate name <span className="text-[var(--cg-danger)]">*</span></label>
                <input id="new-gate-name" required maxLength={255} value={newGateName} onChange={(e) => setNewGateName(e.target.value)} placeholder="e.g. North Gate"
                  className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3.5 text-sm text-[var(--cg-text)] outline-none transition focus:border-[var(--cg-primary)] focus:ring-2 focus:ring-[var(--cg-primary)]/10" />
              </div>
              <div className="space-y-2">
                <label htmlFor="new-gate-code" className="block text-xs font-semibold text-[var(--cg-text)]">Gate code <span className="text-[var(--cg-danger)]">*</span></label>
                <input id="new-gate-code" required maxLength={50} value={newGateCode} onChange={(e) => setNewGateCode(e.target.value.toUpperCase())} placeholder="e.g. NORTH-01"
                  className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3.5 font-mono text-sm text-[var(--cg-text)] outline-none transition focus:border-[var(--cg-primary)] focus:ring-2 focus:ring-[var(--cg-primary)]/10" />
              </div>
              <div className="space-y-2">
                <label htmlFor="new-gate-location" className="block text-xs font-semibold text-[var(--cg-text)]">Location <span className="font-normal text-[var(--cg-text-muted)]">(optional)</span></label>
                <input id="new-gate-location" maxLength={255} value={newGateLocation} onChange={(e) => setNewGateLocation(e.target.value)} placeholder="e.g. East Campus"
                  className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3.5 text-sm text-[var(--cg-text)] outline-none transition focus:border-[var(--cg-primary)] focus:ring-2 focus:ring-[var(--cg-primary)]/10" />
              </div>
              <div className="sm:col-span-2 xl:col-span-3 flex justify-end">
                <Button
                  type="submit"
                  disabled={submitting}
                  icon={<Plus className="h-4 w-4" />}
                  className="w-full sm:w-auto sm:min-w-40"
                >
                  {submitting ? 'Creating gate…' : 'Create gate'}
                </Button>
              </div>
            </form>
          </div>

          {/* Gates list */}
          <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[var(--cg-text)]">Registered Gates</h3>
              <button type="button" onClick={loadGates} disabled={gatesLoading} aria-label="Refresh gates" title="Refresh gates"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] text-[var(--cg-text-muted)] transition-colors hover:bg-[var(--cg-surface-muted)] hover:text-[var(--cg-text)] disabled:opacity-60">
                <RefreshCw className={`h-3.5 w-3.5 ${gatesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {gatesLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--cg-primary)]" /></div>
            ) : gatesError ? (
              <div className="text-sm text-[var(--cg-danger)]">{gatesError}<button onClick={loadGates} className="ml-3 underline text-xs">Retry</button></div>
            ) : apiGates.length === 0 ? (
              <EmptyState title="No gates registered yet" />
            ) : (
              <div className="divide-y divide-[var(--cg-border)]">
                {apiGates.map((g) => (
                  <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cg-primary-light)]">
                        <span className="h-2 w-2 rounded-full bg-[var(--cg-success)]" />
                      </div>
                      <div className="min-w-0">
                        <span className="block font-semibold text-sm text-[var(--cg-text)]">{g.name}</span>
                        <span className="block truncate text-xs text-[var(--cg-text-muted)]">{g.location ?? 'No location'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-semibold text-[var(--cg-primary)]">{g.code}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${g.is_active ? 'border-[var(--cg-success-border)] bg-[var(--cg-success-bg)] text-[var(--cg-success)]' : 'border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] text-[var(--cg-danger)]'}`}>
                        {g.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Assignment */}
          <div className="space-y-5 rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)] sm:p-6">
            <div>
              <h2 className="text-base font-bold text-[var(--cg-text)]">Assign an officer to a gate</h2>
              <p className="mt-1 max-w-2xl text-sm text-[var(--cg-text-muted)]">Set the gate and the time window covered by this shift.</p>
            </div>
            <form onSubmit={handleCreateAssignment} className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <div className="relative space-y-2">
                <label htmlFor="assignment-officer-search" className="block text-xs font-semibold text-[var(--cg-text)]">Gate officer <span className="text-[var(--cg-danger)]">*</span></label>
                <input id="assignment-officer-search" required value={officerSearch} onChange={(e) => handleOfficerSearch(e.target.value)} placeholder="Search by officer name or email"
                  className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3.5 text-sm text-[var(--cg-text)] outline-none transition focus:border-[var(--cg-primary)] focus:ring-2 focus:ring-[var(--cg-primary)]/10" />
                {officerResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-card)]">
                    {officerResults.map((o) => (
                      <button key={o.id} type="button"
                        onClick={() => { setAssignOfficerId(o.id); setOfficerSearch(o.full_name); setOfficerResults([]); }}
                        className="flex w-full flex-col items-start gap-0.5 border-b border-[var(--cg-border)] px-3.5 py-2.5 text-left transition-colors last:border-0 hover:bg-[var(--cg-surface-muted)]">
                        <span className="text-sm font-semibold text-[var(--cg-text)]">{o.full_name}</span>
                        <span className="text-xs text-[var(--cg-text-muted)]">{o.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="assignment-gate" className="block text-xs font-semibold text-[var(--cg-text)]">Gate <span className="text-[var(--cg-danger)]">*</span></label>
                <select id="assignment-gate" required value={assignGateId} onChange={(e) => setAssignGateId(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3.5 text-sm text-[var(--cg-text)] outline-none transition focus:border-[var(--cg-primary)] focus:ring-2 focus:ring-[var(--cg-primary)]/10">
                  <option value="">Select gate…</option>
                  {apiGates.filter((g) => g.is_active).map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="assignment-start" className="block text-xs font-semibold text-[var(--cg-text)]">Start time <span className="text-[var(--cg-danger)]">*</span></label>
                <input id="assignment-start" required type="datetime-local" value={assignStart} onChange={(e) => setAssignStart(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3.5 text-sm text-[var(--cg-text)] outline-none transition focus:border-[var(--cg-primary)] focus:ring-2 focus:ring-[var(--cg-primary)]/10" />
              </div>
              <div className="space-y-2">
                <label htmlFor="assignment-end" className="block text-xs font-semibold text-[var(--cg-text)]">End time <span className="font-normal text-[var(--cg-text-muted)]">(optional)</span></label>
                <input id="assignment-end" type="datetime-local" min={assignStart || undefined} value={assignEnd} onChange={(e) => setAssignEnd(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3.5 text-sm text-[var(--cg-text)] outline-none transition focus:border-[var(--cg-primary)] focus:ring-2 focus:ring-[var(--cg-primary)]/10" />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={submitting || !assignOfficerId || !assignGateId || !assignStart} className="w-full sm:w-auto sm:min-w-44">
                  {submitting ? 'Assigning officer…' : 'Assign officer'}
                </Button>
              </div>
            </form>
          </div>

          {/* Assignments list */}
          <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)]">
            <h3 className="mb-3 text-sm font-bold text-[var(--cg-text)]">Current Assignments</h3>
            {gatesError ? (
              <div className="text-sm text-[var(--cg-danger)]">{gatesError}<button onClick={loadGates} className="ml-3 underline text-xs">Retry</button></div>
            ) : apiAssignments.length === 0 ? (
              <EmptyState title="No assignments yet" />
            ) : (
              <div className="divide-y divide-[var(--cg-border)]">
                {apiAssignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-3.5">
                    <div>
                      <span className="block font-mono text-xs font-semibold text-[var(--cg-primary)]">{a.officer_id.slice(0, 8)}…</span>
                      <span className="block text-[11px] text-[var(--cg-text-muted)]">
                        Gate: {apiGates.find((gate) => gate.id === a.gate_id)?.name ?? a.gate_id} · {new Date(a.start_time).toLocaleString()}
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

      {/* AUDIT TAB */}
      {activeTab === 'VISITORS' && <VisitorManager />}
      {activeTab === 'INCIDENTS' && <IncidentManager />}
      {activeTab === 'USERS' && <AdminUserManagement />}

      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)]">
            <div>
              <h2 className="text-sm font-bold text-[var(--cg-text)]">{t('auditTrail')}</h2>
              <p className="mt-0.5 text-xs text-[var(--cg-text-muted)]">Immutable audit event generated on every security operation.</p>
            </div>
            <Button
              onClick={loadAudit}
              disabled={auditLoading}
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`h-3.5 w-3.5 ${auditLoading ? 'animate-spin' : ''}`} />}
              className="min-w-28"
            >
              Refresh
            </Button>
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
                  ) : auditError ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--cg-danger)]">{auditError}<button onClick={loadAudit} className="ml-3 underline text-xs">Retry</button></td></tr>
                  ) : apiAuditLogs.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8"><EmptyState title="No audit logs found" /></td></tr>
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
      </div>
    </div>
  );
};
