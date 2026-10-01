import React, { useState } from 'react';
import {
  Laptop, QrCode, AlertTriangle, Plus,
  ArrowUpRight, ArrowDownLeft, MapPin, X,
  Package, Clock, FileText, TrendingUp, Shield,
  ChevronRight, GraduationCap
} from 'lucide-react';
import { Device } from '../../types';
import { useApp } from '../../context/AppContext';
import { campusStore } from '../../services/storage';
import { QRPassModal } from '../../components/QRPassModal';
import { reportLostApi } from '../../services/deviceService';
import { ApiError } from '../../services/api';

export const StudentView: React.FC = () => {
  const { t, language, currentStudent, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'DEVICES' | 'HISTORY' | 'REQUESTS'>('DEVICES');
  const [selectedDeviceForQr, setSelectedDeviceForQr] = useState<Device | null>(null);
  const [deviceToReportLost, setDeviceToReportLost] = useState<Device | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [reqDeviceDesc, setReqDeviceDesc] = useState('');
  const [reqDestination, setReqDestination] = useState('INSA Cyber Center, Addis Ababa');
  const [reqReason, setReqReason] = useState('Research Project Exhibition & Capstone Defense');
  const [reqReturnDate, setReqReturnDate] = useState('2026-09-30');

  const devices = campusStore.getDevices().filter(
    (d) => d.ownerStudentId === currentStudent.studentId || d.ownerId === currentStudent.id
  );
  const movements = campusStore.getMovements().filter(
    (m) => m.ownerStudentId === currentStudent.studentId
  );
  const requests = campusStore.getRequests().filter(
    (r) => r.applicantId === currentStudent.studentId
  );

  const insideCount = devices.filter((d) => d.status === 'INSIDE_CAMPUS').length;
  const outsideCount = devices.filter((d) => d.status === 'OUTSIDE_CAMPUS').length;
  const lostCount = devices.filter((d) => d.status === 'LOST').length;

  const handleConfirmLost = async () => {
    if (!deviceToReportLost) return;
    try {
      await reportLostApi(
        deviceToReportLost.id,
        'Device reported as lost by owner via student portal.',
      );
      // Also update local mock store so the UI reflects the change immediately
      campusStore.reportLostDevice(deviceToReportLost.id, currentStudent.name);
      setDeviceToReportLost(null);
      showToast('Device status updated to LOST across all gate terminals.', 'warning');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to report device as lost.';
      setDeviceToReportLost(null);
      showToast(message, 'error');
    }
  };

  const handleCreateExitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDeviceDesc.trim()) return;
    campusStore.createExitRequest({
      deviceDescription: reqDeviceDesc,
      applicantName: currentStudent.name,
      applicantId: currentStudent.studentId,
      department: currentStudent.department,
      destination: reqDestination,
      reason: reqReason,
      expectedReturnDate: reqReturnDate
    });
    showToast('Temporary device exit request submitted to Security Office', 'success');
    setShowExitModal(false);
    setReqDeviceDesc('');
  };

  const statusStyle = (status: string) => {
    if (status === 'INSIDE_CAMPUS') return { badge: 'bg-[var(--cg-success-bg)] text-[var(--cg-success)] border-[var(--cg-success-border)]', dot: 'bg-[var(--cg-success)]' };
    if (status === 'LOST') return { badge: 'bg-[var(--cg-danger-bg)] text-[var(--cg-danger)] border-[var(--cg-danger-border)]', dot: 'bg-[var(--cg-danger)]' };
    return { badge: 'bg-[var(--cg-info-bg)] text-[var(--cg-info)] border-[var(--cg-info-border)]', dot: 'bg-[var(--cg-info)]' };
  };

  const navItems = [
    { id: 'DEVICES' as const, label: t('navMyDevices'), icon: Package, count: devices.length, desc: 'Enrolled devices' },
    { id: 'HISTORY' as const, label: t('navHistory'), icon: Clock, count: movements.length, desc: 'Movement timeline' },
    { id: 'REQUESTS' as const, label: t('navRequests'), icon: FileText, count: requests.length, desc: 'Exit authorizations' },
  ];

  return (
    <div className="flex h-[calc(100vh-56px)]">

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-[var(--cg-border)] bg-[var(--cg-surface)] overflow-y-auto">

        {/* Profile */}
        <div className="relative">
          <div className="h-20 w-full" style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #2D5282 100%)' }} />
          <div className="px-5 pb-5">
            <div className="-mt-9 mb-3">
              <img
                src={currentStudent.avatarUrl}
                alt={currentStudent.name}
                className="h-16 w-16 rounded-2xl border-4 border-[var(--cg-surface)] object-cover shadow-[var(--cg-shadow-sm)]"
              />
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
        <nav className="flex-1 border-t border-[var(--cg-border)] px-3 py-3 space-y-1">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)] mb-2">Navigation</p>
          {navItems.map(({ id, label, icon: Icon, count, desc }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
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
      <div className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-[var(--cg-border)] bg-[var(--cg-surface)] md:hidden">
        {navItems.map(({ id, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
              activeTab === id ? 'text-[var(--cg-primary)]' : 'text-[var(--cg-text-muted)]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute right-3 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--cg-primary)] text-[9px] font-bold text-white">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
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
          {activeTab === 'REQUESTS' && (
            <button
              onClick={() => setShowExitModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--cg-primary)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Submit Request
            </button>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* DEVICES TAB */}
          {activeTab === 'DEVICES' && (
            <div className="space-y-4">
              {devices.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--cg-border)] bg-[var(--cg-surface)] py-16 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--cg-surface-muted)]">
                    <Laptop className="h-7 w-7 text-[var(--cg-text-subtle)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--cg-text)]">No devices enrolled yet</p>
                  <p className="mt-1 max-w-xs text-xs text-[var(--cg-text-muted)]">{t('noRegisteredDevices')}</p>
                </div>
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
                            {dev.lastMovement && (
                              <div className="flex items-center justify-between border-t border-[var(--cg-border)] pt-2">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--cg-text-muted)]">Last Gate</span>
                                <span className="text-[var(--cg-text-muted)]">{dev.lastMovement.type === 'CHECK_IN' ? '↓ Entry' : '↑ Exit'} · {dev.lastMovement.gateName}</span>
                              </div>
                            )}
                          </div>
                          {dev.notes && <p className="text-[11px] italic text-[var(--cg-text-muted)]">{dev.notes}</p>}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-[var(--cg-border)] pt-3">
                          <button onClick={() => setSelectedDeviceForQr(dev)}
                            className="flex items-center gap-1.5 rounded-xl bg-[var(--cg-primary)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors">
                            <QrCode className="h-3.5 w-3.5" />{t('viewQr')}
                          </button>
                          {dev.status !== 'LOST' ? (
                            <button onClick={() => setDeviceToReportLost(dev)}
                              className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-[var(--cg-danger)] hover:bg-[var(--cg-danger-bg)] transition-colors">
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
                  {language === 'am' ? 'የመሳሪያዎችዎ ሙሉ የፍተሻ ታሪክ' : 'Complete timeline of verified check-ins and check-outs across all campus gates.'}
                </p>
              </div>
              {movements.length === 0 ? (
                <div className="py-10 text-center text-sm text-[var(--cg-text-muted)]">No movement history yet.</div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--cg-border)]">
                  {movements.map((mov) => {
                    const isIn = mov.type === 'CHECK_IN';
                    return (
                      <div key={mov.id} className="relative">
                        <div className={`absolute -left-6 top-3 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--cg-surface)] shadow-[var(--cg-shadow-xs)] ${isIn ? 'bg-[var(--cg-success)]' : 'bg-[var(--cg-info)]'}`} />
                        <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-4 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isIn ? 'bg-[var(--cg-success-bg)] text-[var(--cg-success)] border-[var(--cg-success-border)]' : 'bg-[var(--cg-info-bg)] text-[var(--cg-info)] border-[var(--cg-info-border)]'}`}>
                              {isIn ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                              {isIn ? 'CHECK-IN · ENTRY' : 'CHECK-OUT · EXIT'}
                            </span>
                            <span className="font-mono text-[11px] text-[var(--cg-text-muted)]">{mov.timestamp}</span>
                          </div>
                          <div className="font-semibold text-sm text-[var(--cg-text)]">{mov.deviceModel} <span className="font-mono text-xs text-[var(--cg-primary)]">({mov.deviceAssetId})</span></div>
                          <div className="flex items-center justify-between text-xs text-[var(--cg-text-muted)] flex-wrap gap-1">
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /><strong className="text-[var(--cg-text)]">{mov.gateName}</strong></span>
                            <span>Officer: {mov.officerName} ({mov.officerBadge})</span>
                          </div>
                          {mov.crossGateNote && (
                            <div className="rounded-lg border border-[var(--cg-warning-border)] bg-[var(--cg-warning-bg)] p-2 text-[11px] font-medium text-[var(--cg-warning)]">{mov.crossGateNote}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* REQUESTS TAB */}
          {activeTab === 'REQUESTS' && (
            <div className="space-y-4">
              {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--cg-border)] bg-[var(--cg-surface)] py-16 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--cg-surface-muted)]">
                    <FileText className="h-7 w-7 text-[var(--cg-text-subtle)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--cg-text)]">No exit requests yet</p>
                  <p className="mt-1 text-xs text-[var(--cg-text-muted)]">For university-owned lab equipment requiring off-campus authorization.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {requests.map((req) => (
                    <div key={req.id} className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[var(--cg-primary)]">{req.requestNumber}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${req.status === 'APPROVED' ? 'bg-[var(--cg-success-bg)] text-[var(--cg-success)] border-[var(--cg-success-border)]' : req.status === 'PENDING' ? 'bg-[var(--cg-warning-bg)] text-[var(--cg-warning)] border-[var(--cg-warning-border)]' : 'bg-[var(--cg-danger-bg)] text-[var(--cg-danger)] border-[var(--cg-danger-border)]'}`}>
                          {req.status}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-[var(--cg-text)]">{req.deviceDescription}</h3>
                        <p className="mt-1 text-xs text-[var(--cg-text-muted)]">Destination: <strong className="text-[var(--cg-text)]">{req.destination}</strong></p>
                        <p className="text-xs text-[var(--cg-text-muted)]">{req.reason}</p>
                      </div>
                      <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-2.5 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[var(--cg-text-muted)]">Expected Return:</span>
                          <span className="font-semibold text-[var(--cg-text)]">{req.expectedReturnDate}</span>
                        </div>
                        {req.reviewedBy && (
                          <div className="flex justify-between border-t border-[var(--cg-border)] pt-1">
                            <span className="text-[var(--cg-text-muted)]">Approved By:</span>
                            <span className="font-semibold text-[var(--cg-success)]">{req.reviewedBy}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Confirm lost modal */}
      {deviceToReportLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-modal)] p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--cg-danger-bg)]">
              <AlertTriangle className="h-6 w-6 text-[var(--cg-danger)]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--cg-text)]">{t('confirmReportLostTitle')}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--cg-text-muted)]">{t('confirmReportLostDesc')}</p>
              <div className="mt-3 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3 font-mono text-xs text-[var(--cg-text)]">
                {deviceToReportLost.brand} {deviceToReportLost.model} · S/N: {deviceToReportLost.serialNumber}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeviceToReportLost(null)} className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] transition-colors">{t('cancel')}</button>
              <button onClick={handleConfirmLost} className="rounded-xl bg-[var(--cg-danger)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity">{t('confirmReportLostAction')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Exit request modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-modal)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--cg-border)] px-5 py-4" style={{ background: 'linear-gradient(135deg, #1E3A5F, #2D5282)' }}>
              <h3 className="font-bold text-white">Submit Temporary Exit Authorization</h3>
              <button onClick={() => setShowExitModal(false)} aria-label="Close" className="text-white/70 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreateExitRequest} className="p-5 space-y-4 text-xs">
              {[
                { label: 'Equipment / Device Name & Model *', value: reqDeviceDesc, onChange: setReqDeviceDesc, placeholder: 'e.g. Epson EB-2250U 3LCD Projector', required: true },
                { label: 'Destination *', value: reqDestination, onChange: setReqDestination, placeholder: '', required: true },
              ].map(({ label, value, onChange, placeholder, required }) => (
                <div key={label} className="space-y-1.5">
                  <label className="block font-semibold text-[var(--cg-text)]">{label}</label>
                  <input required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                    className="h-10 w-full rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)] transition-colors" />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="block font-semibold text-[var(--cg-text)]">Academic / Research Justification *</label>
                <textarea required rows={2} value={reqReason} onChange={(e) => setReqReason(e.target.value)}
                  className="w-full rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 py-2 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)] transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="block font-semibold text-[var(--cg-text)]">Expected Return Date *</label>
                <input required type="date" value={reqReturnDate} onChange={(e) => setReqReturnDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)] transition-colors" />
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-[var(--cg-border)] pt-3">
                <button type="button" onClick={() => setShowExitModal(false)} className="rounded-xl px-4 py-2 text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] transition-colors">{t('cancel')}</button>
                <button type="submit" className="rounded-xl bg-[var(--cg-primary)] px-5 py-2.5 font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors">Submit to Security HQ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <QRPassModal device={selectedDeviceForQr} isOpen={!!selectedDeviceForQr} onClose={() => setSelectedDeviceForQr(null)} />
    </div>
  );
};
