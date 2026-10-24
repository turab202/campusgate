import React, { useState, useEffect, useCallback } from 'react';
import {
  QrCode, AlertTriangle,
  ArrowUpRight, ArrowDownLeft, MapPin,
  Package, Clock, TrendingUp, Shield, ClipboardCheck,
  Loader2, GraduationCap
} from 'lucide-react';
import { Device } from '../../types';
import { useApp } from '../../context/AppContext';
import { EmptyState } from '../../components/ui/EmptyState';
import { QRPassModal } from '../../components/QRPassModal';
import { listDevicesApi, reportLostApi, DeviceRead } from '../../services/deviceService';
import { getDeviceMovementsApi, DeviceMovementRead } from '../../services/movementService';
import { ApiError } from '../../services/api';
import { BelongingsClearance } from './BelongingsClearance';
import { StudentAccountSettings } from './StudentAccountSettings';

/** Map backend DeviceRead to the frontend Device shape used by QRPassModal. */
function toFrontendDevice(d: DeviceRead): Device {
  return {
    id: d.id,
    assetId: d.asset_id,
    serialNumber: d.serial_number,
    brand: d.brand ?? '',
    model: d.model ?? '',
    deviceType: d.device_type as Device['deviceType'],
    ownerId: d.owner_id,
    ownerName: d.owner_name,
    ownerStudentId: d.owner_campus_id ?? '',
    ownerDepartment: '',
    status: d.status as Device['status'],
    enrollmentDate: d.registered_at,
    enrolledByOfficerBadge: '',
    enrolledAtGateId: '',
    qrPayload: d.qr_code_value,
  };
}

export const StudentView: React.FC = () => {
  const { t, language, currentStudent, authUser, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'DEVICES' | 'HISTORY' | 'CLEARANCE' | 'ACCOUNT'>('DEVICES');
  const [selectedDeviceForQr, setSelectedDeviceForQr] = useState<Device | null>(null);
  const [deviceToReportLost, setDeviceToReportLost] = useState<Device | null>(null);

  // Real API state
  const [apiDevices, setApiDevices] = useState<DeviceRead[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState<string | null>(null);

  const [selectedDeviceForHistory, setSelectedDeviceForHistory] = useState<string | null>(null);
  const [apiMovements, setApiMovements] = useState<DeviceMovementRead[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    if (!authUser) return;
    setDevicesLoading(true);
    setDevicesError(null);
    try {
      const results = await listDevicesApi({ owner_id: authUser.id });
      setApiDevices(results);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load devices.';
      setDevicesError(message);
    } finally {
      setDevicesLoading(false);
    }
  }, [authUser]);

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

  const loadMovements = useCallback(async (deviceId: string) => {
    setMovementsLoading(true);
    setMovementsError(null);
    try {
      const results = await getDeviceMovementsApi(deviceId);
      setApiMovements(results);
    } catch (err) {
      setApiMovements([]);
      setMovementsError(err instanceof ApiError ? err.message : 'Failed to load movement history.');
    } finally {
      setMovementsLoading(false);
    }
  }, []);

  const handleSelectDeviceForHistory = (deviceId: string) => {
    setSelectedDeviceForHistory(deviceId);
    loadMovements(deviceId);
    setActiveTab('HISTORY');
  };

  const devices = apiDevices.map(toFrontendDevice);
  const insideCount = apiDevices.filter((d) => d.status === 'INSIDE_CAMPUS').length;
  const outsideCount = apiDevices.filter((d) => d.status === 'OUTSIDE_CAMPUS').length;
  const lostCount = apiDevices.filter((d) => d.status === 'LOST' || d.status === 'REPORTED_LOST').length;

  const handleConfirmLost = async () => {
    if (!deviceToReportLost) return;
    try {
      await reportLostApi(
        deviceToReportLost.id,
        'Device reported as lost by owner via student portal.',
      );
      setDeviceToReportLost(null);
      showToast('Device status updated to LOST across all gate terminals.', 'warning');
      loadDevices();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to report device as lost.';
      setDeviceToReportLost(null);
      showToast(message, 'error');
    }
  };

  const statusStyle = (status: string) => {
    if (status === 'INSIDE_CAMPUS') return { badge: 'bg-[var(--cg-success-bg)] text-[var(--cg-success)] border-[var(--cg-success-border)]', dot: 'bg-[var(--cg-success)]' };
    if (status === 'LOST' || status === 'REPORTED_LOST') return { badge: 'bg-[var(--cg-danger-bg)] text-[var(--cg-danger)] border-[var(--cg-danger-border)]', dot: 'bg-[var(--cg-danger)]' };
    return { badge: 'bg-[var(--cg-info-bg)] text-[var(--cg-info)] border-[var(--cg-info-border)]', dot: 'bg-[var(--cg-info)]' };
  };

  const navItems = [
    { id: 'DEVICES' as const, label: t('navMyDevices'), icon: Package, count: devices.length, desc: 'Enrolled devices' },
    { id: 'HISTORY' as const, label: t('navHistory'), icon: Clock, count: apiMovements.length, desc: 'Movement timeline' },
    ...(authUser?.role === 'STUDENT'
      ? [{ id: 'CLEARANCE' as const, label: 'Belongings Exit Clearance', icon: ClipboardCheck, count: 0, desc: 'Exit permits and declared belongings' }]
      : []),
    { id: 'ACCOUNT' as const, label: 'Account', icon: Shield, count: 0, desc: 'Email and password' },
  ];

  return (
    <div className="flex">

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-[var(--cg-border)] bg-[var(--cg-surface)] overflow-y-auto">

        {/* Profile */}
        <div className="relative">
          <div className="h-20 w-full" style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #2D5282 100%)' }} />
          <div className="px-5 pb-5">
            <div className="-mt-9 mb-3">
              <div
                aria-hidden="true"
                className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-[var(--cg-surface)] bg-[var(--cg-primary)] text-lg font-bold text-white shadow-[var(--cg-shadow-sm)]"
              >
                {currentStudent.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
              </div>
            </div>
            <h2 className="text-sm font-bold text-[var(--cg-text)]">{currentStudent.name}</h2>
            <p className="font-mono text-[11px] font-semibold text-[var(--cg-primary)]">{currentStudent.studentId}</p>
            <p className="text-[11px] text-[var(--cg-text-muted)] mt-0.5">{currentStudent.department}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--cg-success-border)] bg-[var(--cg-success-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--cg-success)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--cg-success)]" />
              {currentStudent.status}
            </div>
          </div>
        </div>

        {/* Device stats */}
        <div className="border-t border-[var(--cg-border)] px-4 py-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)] mb-2">Device Summary</p>
          {[
            { label: 'Inside Campus', value: insideCount, color: 'text-[var(--cg-success)]', bg: 'bg-[var(--cg-success-bg)]', icon: TrendingUp },
            { label: 'Outside Campus', value: outsideCount, color: 'text-[var(--cg-info)]', bg: 'bg-[var(--cg-info-bg)]', icon: ArrowUpRight },
            { label: 'Reported Lost', value: lostCount, color: 'text-[var(--cg-danger)]', bg: 'bg-[var(--cg-danger-bg)]', icon: AlertTriangle },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="flex items-center justify-between rounded-xl border border-[var(--cg-border)] px-3 py-2">
              <div className="flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-3 w-3 ${color}`} />
                </div>
                <span className="text-[11px] text-[var(--cg-text-muted)]">{label}</span>
              </div>
              <span className={`font-mono text-sm font-bold ${color}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Nav */}
        <nav aria-label="Student sections" className="flex-1 border-t border-[var(--cg-border)] px-3 py-3 space-y-1">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)] mb-2">Navigation</p>
          {navItems.map(({ id, label, icon: Icon, count, desc }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? 'bg-[var(--cg-primary)] text-white shadow-[var(--cg-shadow-xs)]'
                    : 'text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] hover:text-[var(--cg-text)]'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-[var(--cg-text-subtle)] group-hover:text-[var(--cg-text)]'}`} />
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-semibold ${isActive ? 'text-white' : ''}`}>{label}</div>
                  <div className={`text-[10px] ${isActive ? 'text-white/60' : 'text-[var(--cg-text-subtle)]'}`}>{desc}</div>
                </div>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Security notice */}
        <div className="border-t border-[var(--cg-border)] px-4 py-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield className="h-3.5 w-3.5 text-[var(--cg-primary)]" />
            <span className="text-[11px] font-semibold text-[var(--cg-text)]">Security Notice</span>
          </div>
          <p className="text-[10px] leading-4 text-[var(--cg-text-muted)]">
            {language === 'am'
              ? 'አንዴ ተመዝግቦ በሁሉም በሮች ይሰራል።'
              : 'Enrolled once, valid at all university gates. Show QR pass to gate officer.'}
          </p>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav aria-label="Student sections" className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-[var(--cg-border)] bg-[var(--cg-surface)] pb-[env(safe-area-inset-bottom)] shadow-[var(--cg-shadow-card)] md:hidden">
        {navItems.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            aria-label={label}
            aria-current={activeTab === id ? 'page' : undefined}
            className={`relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--cg-primary)] ${
              activeTab === id ? 'text-[var(--cg-primary)]' : 'text-[var(--cg-text-muted)]'
            }`}
          >
            <Icon aria-hidden="true" className="h-5 w-5" />
            <span className="max-w-full truncate whitespace-nowrap text-[9px]">{label}</span>
            {count > 0 && (
              <span className="absolute left-1/2 top-1 flex h-4 min-w-4 translate-x-3 items-center justify-center rounded-full bg-[var(--cg-primary)] px-1 text-[9px] font-bold text-white">{count}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Content area ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Content header */}
        <div className="flex items-center justify-between border-b border-[var(--cg-border)] bg-[var(--cg-surface)] px-6 py-3.5">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-4 w-4 text-[var(--cg-primary)]" />
            <div>
              <h1 className="text-sm font-bold text-[var(--cg-text)]">
                {navItems.find((n) => n.id === activeTab)?.label}
              </h1>
              <p className="text-[11px] text-[var(--cg-text-muted)]">
                {navItems.find((n) => n.id === activeTab)?.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 p-4 pb-24 sm:p-6 sm:pb-24 md:pb-6">

          {/* DEVICES TAB */}
          {activeTab === 'DEVICES' && (
            <div className="space-y-4">
              {devicesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--cg-primary)]" />
                </div>
              ) : devicesError ? (
                <div className="rounded-xl border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-4 text-sm text-[var(--cg-danger)]">
                  {devicesError}
                  <button onClick={loadDevices} className="ml-3 underline text-xs">Retry</button>
                </div>
              ) : devices.length === 0 ? (
                <EmptyState title="No devices enrolled yet" description={t('noRegisteredDevices')} />
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {devices.map((dev) => {
                    const st = statusStyle(dev.status);
                    return (
                      <div key={dev.id} className="flex flex-col justify-between rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)] transition-shadow hover:shadow-[var(--cg-shadow-card)]">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="font-mono text-[11px] font-bold text-[var(--cg-primary)] bg-[var(--cg-primary-light)] px-2 py-0.5 rounded-md">{dev.assetId}</span>
                              <h3 className="mt-2 text-base font-bold text-[var(--cg-text)]">{dev.brand} {dev.model}</h3>
                              <span className="text-xs text-[var(--cg-text-muted)]">{dev.deviceType}</span>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${st.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                              {dev.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--cg-text-muted)]">Serial</span>
                              <span className="font-mono font-semibold text-[var(--cg-text)]">{dev.serialNumber}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--cg-border)] pt-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button onClick={() => setSelectedDeviceForQr(dev)}
                              className="flex items-center gap-1.5 rounded-xl bg-[var(--cg-primary)] px-2.5 py-2 text-[11px] font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors sm:px-3.5 sm:text-xs">
                              <QrCode className="h-3.5 w-3.5" />{t('viewQr')}
                            </button>
                            <button onClick={() => handleSelectDeviceForHistory(dev.id)}
                              className="flex items-center gap-1.5 rounded-xl border border-[var(--cg-border)] px-2.5 py-2 text-[11px] font-medium text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] transition-colors sm:px-3 sm:text-xs">
                              <Clock className="h-3.5 w-3.5" /> History
                            </button>
                          </div>
                          {dev.status !== 'LOST' && dev.status !== 'REPORTED_LOST' ? (
                            <button onClick={() => setDeviceToReportLost(dev)}
                              className="flex items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium text-[var(--cg-danger)] hover:bg-[var(--cg-danger-bg)] transition-colors sm:px-3 sm:text-xs">
                              <AlertTriangle className="h-3.5 w-3.5" />{t('reportLostBtn')}
                            </button>
                          ) : (
                            <span className="rounded-xl bg-[var(--cg-danger-bg)] border border-[var(--cg-danger-border)] px-2.5 py-1 text-xs font-semibold text-[var(--cg-danger)]">Lost Flag Active</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'HISTORY' && (
            <div className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)]">
              <div className="mb-5 border-b border-[var(--cg-border)] pb-4">
                <p className="text-xs text-[var(--cg-text-muted)]">
                  {selectedDeviceForHistory
                    ? (language === 'am' ? 'የተመረጠው መሳሪያ የፍተሻ ታሪክ' : 'Movement history for selected device.')
                    : (language === 'am' ? 'መሳሪያ ይምረጡ' : 'Select a device from the Devices tab to view its movement history.')}
                </p>
              </div>
              {movementsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--cg-primary)]" />
                </div>
              ) : movementsError ? (
                <div className="rounded-xl border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-4 text-sm text-[var(--cg-danger)]">
                  {movementsError}
                  {selectedDeviceForHistory && <button onClick={() => loadMovements(selectedDeviceForHistory)} className="ml-3 underline text-xs">Retry</button>}
                </div>
              ) : !selectedDeviceForHistory ? (
                <div className="py-10 text-center text-sm text-[var(--cg-text-muted)]">
                  No device selected. Use the History button on a device card.
                </div>
              ) : apiMovements.length === 0 ? (
                <EmptyState title="No movement history yet" />
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--cg-border)]">
                  {apiMovements.map((mov) => {
                    const isIn = mov.movement_type === 'CHECK_IN';
                    const ts = new Date(mov.occurred_at).toLocaleString();
                    return (
                      <div key={mov.id} className="relative">
                        <div className={`absolute -left-6 top-3 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--cg-surface)] shadow-[var(--cg-shadow-xs)] ${isIn ? 'bg-[var(--cg-success)]' : 'bg-[var(--cg-info)]'}`} />
                        <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-4 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isIn ? 'bg-[var(--cg-success-bg)] text-[var(--cg-success)] border-[var(--cg-success-border)]' : 'bg-[var(--cg-info-bg)] text-[var(--cg-info)] border-[var(--cg-info-border)]'}`}>
                              {isIn ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                              {isIn ? 'CHECK-IN · ENTRY' : 'CHECK-OUT · EXIT'}
                            </span>
                            <span className="font-mono text-[11px] text-[var(--cg-text-muted)]">{ts}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-[var(--cg-text-muted)]">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="font-mono text-[10px] text-[var(--cg-text-muted)]">Gate ID: {mov.gate_id.slice(0, 8)}…</span>
                          </div>
                          {mov.notes && (
                            <div className="rounded-lg border border-[var(--cg-warning-border)] bg-[var(--cg-warning-bg)] p-2 text-[11px] font-medium text-[var(--cg-warning)]">{mov.notes}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {authUser?.role === 'STUDENT' && activeTab === 'CLEARANCE' && <BelongingsClearance />}
          {activeTab === 'ACCOUNT' && <StudentAccountSettings />}

        </div>
      </div>

      {/* Confirm lost modal */}
      {deviceToReportLost && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 backdrop-blur-sm sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-lost-title" className="my-auto w-full max-w-md space-y-4 rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-4 shadow-[var(--cg-shadow-modal)] sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--cg-danger-bg)]">
              <AlertTriangle className="h-6 w-6 text-[var(--cg-danger)]" />
            </div>
            <div>
              <h3 id="confirm-lost-title" className="text-lg font-bold text-[var(--cg-text)]">{t('confirmReportLostTitle')}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--cg-text-muted)]">{t('confirmReportLostDesc')}</p>
              <div className="mt-3 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3 font-mono text-xs text-[var(--cg-text)]">
                {deviceToReportLost.brand} {deviceToReportLost.model} · S/N: {deviceToReportLost.serialNumber}
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => setDeviceToReportLost(null)} className="min-h-11 rounded-xl px-4 py-2 text-sm font-medium text-[var(--cg-text-muted)] transition-colors hover:bg-[var(--cg-surface-muted)]">{t('cancel')}</button>
              <button onClick={handleConfirmLost} className="min-h-11 rounded-xl bg-[var(--cg-danger)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">{t('confirmReportLostAction')}</button>
            </div>
          </div>
        </div>
      )}

      <QRPassModal device={selectedDeviceForQr} isOpen={!!selectedDeviceForQr} onClose={() => setSelectedDeviceForQr(null)} />
    </div>
  );
};
