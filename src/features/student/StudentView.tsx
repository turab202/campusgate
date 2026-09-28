import React, { useState } from 'react';
import {
  Laptop, QrCode, AlertTriangle, Plus,
  ArrowUpRight, ArrowDownLeft, MapPin, X, CheckCircle2
} from 'lucide-react';
import { Device } from '../../types';
import { useApp } from '../../context/AppContext';
import { campusStore } from '../../services/storage';
import { QRPassModal } from '../../components/QRPassModal';

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

  const handleConfirmLost = () => {
    if (!deviceToReportLost) return;
    const res = campusStore.reportLostDevice(deviceToReportLost.id, currentStudent.name);
    setDeviceToReportLost(null);
    showToast(res.message, 'warning');
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
    if (status === 'INSIDE_CAMPUS') return 'bg-emerald-50 text-[var(--cg-success)] border-emerald-200';
    if (status === 'LOST') return 'bg-red-50 text-[var(--cg-danger)] border-red-200';
    return 'bg-sky-50 text-[var(--cg-info)] border-sky-200';
  };

  const tabs = [
    { id: 'DEVICES' as const, label: `${t('navMyDevices')} (${devices.length})` },
    { id: 'HISTORY' as const, label: `${t('navHistory')} (${movements.length})` },
    { id: 'REQUESTS' as const, label: `${t('navRequests')} (${requests.length})` },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Profile card */}
      <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-primary)] p-6 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <img
              src={currentStudent.avatarUrl}
              alt={currentStudent.name}
              className="h-20 w-20 rounded-2xl border-2 border-white/30 object-cover"
            />
            <div>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-2xl font-semibold text-white">{currentStudent.name}</h1>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                  {currentStudent.status}
                </span>
              </div>
              <p className="mt-0.5 font-mono text-xs text-white/70">
                {currentStudent.studentId} · {currentStudent.department}
              </p>
              <p className="mt-1 text-[11px] text-white/60">
                {language === 'am'
                  ? 'የተመዘገቡ መሳሪያዎችዎን ሁኔታ ይመልከቱ'
                  : 'Centralized Personal Electronic Devices Registry · Verified Student Account'}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-white/60">Enrolled Devices</span>
            <span className="font-mono text-2xl font-semibold text-white">{devices.length}</span>
          </div>
        </div>

        {/* Tab nav */}
        <div className="mt-5 flex items-center gap-1 overflow-x-auto border-t border-white/20 pt-4">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                activeTab === id
                  ? 'bg-white text-[var(--cg-primary)]'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* DEVICES TAB */}
      {activeTab === 'DEVICES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--cg-text)]">{t('myEnrolledDevices')}</h2>
            <span className="text-xs text-[var(--cg-text-muted)]">
              {language === 'am' ? 'አንዴ ተመዝግቦ በሁሉም በሮች ይሰራል' : 'Enrolled once · Valid at all university gates'}
            </span>
          </div>

          {devices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--cg-border)] bg-[var(--cg-surface)] p-8 text-center">
              <Laptop className="mx-auto h-10 w-10 text-[var(--cg-text-muted)] mb-3" />
              <p className="text-sm font-medium text-[var(--cg-text)]">No devices enrolled yet</p>
              <p className="mt-1 text-xs text-[var(--cg-text-muted)] max-w-sm mx-auto">{t('noRegisteredDevices')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {devices.map((dev) => (
                <div key={dev.id} className="flex flex-col justify-between rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between border-b border-[var(--cg-border)] pb-3">
                      <span className="font-mono text-xs font-semibold text-[var(--cg-primary)]">{dev.assetId}</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle(dev.status)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${dev.status === 'INSIDE_CAMPUS' ? 'bg-[var(--cg-success)]' : dev.status === 'LOST' ? 'bg-[var(--cg-danger)]' : 'bg-[var(--cg-info)]'}`} />
                        {dev.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div>
                        <h3 className="font-semibold text-base text-[var(--cg-text)]">{dev.brand} {dev.model}</h3>
                        <span className="text-xs text-[var(--cg-text-muted)]">{dev.deviceType}</span>
                      </div>
                      <div className="rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase text-[var(--cg-text-muted)]">Serial Number</span>
                          <span className="font-mono font-semibold text-[var(--cg-text)]">{dev.serialNumber}</span>
                        </div>
                        {dev.lastMovement && (
                          <div className="flex items-center justify-between border-t border-[var(--cg-border)] pt-1">
                            <span className="text-[10px] font-semibold uppercase text-[var(--cg-text-muted)]">Last Gate Activity</span>
                            <span className="text-[var(--cg-text-muted)]">
                              {dev.lastMovement.type === 'CHECK_IN' ? 'Entry' : 'Exit'} at {dev.lastMovement.gateName}
                            </span>
                          </div>
                        )}
                      </div>
                      {dev.notes && (
                        <p className="text-[11px] italic text-[var(--cg-text-muted)]">Note: {dev.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-[var(--cg-border)] pt-3">
                    <button
                      onClick={() => setSelectedDeviceForQr(dev)}
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--cg-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      {t('viewQr')}
                    </button>
                    {dev.status !== 'LOST' ? (
                      <button
                        onClick={() => setDeviceToReportLost(dev)}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--cg-danger)] hover:bg-red-50 transition-colors"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t('reportLostBtn')}
                      </button>
                    ) : (
                      <span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-[var(--cg-danger)]">
                        Lost Flag Active
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'HISTORY' && (
        <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-6 space-y-5">
          <div className="border-b border-[var(--cg-border)] pb-4">
            <h2 className="text-lg font-semibold text-[var(--cg-text)]">{t('navHistory')}</h2>
            <p className="mt-0.5 text-xs text-[var(--cg-text-muted)]">
              {language === 'am'
                ? 'የመሳሪያዎችዎ ሙሉ የፍተሻ ታሪክ'
                : 'Historical timeline of verified check-ins and check-outs across campus gates.'}
            </p>
          </div>

          {movements.length === 0 ? (
            <div className="py-8 text-center text-[var(--cg-text-muted)] text-sm">No movement history yet.</div>
          ) : (
            <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--cg-border)]">
              {movements.map((mov) => {
                const isIn = mov.type === 'CHECK_IN';
                return (
                  <div key={mov.id} className="relative">
                    <div className={`absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--cg-surface)] ${isIn ? 'bg-[var(--cg-success)]' : 'bg-[var(--cg-info)]'}`} />
                    <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isIn ? 'bg-emerald-50 text-[var(--cg-success)] border border-emerald-200' : 'bg-sky-50 text-[var(--cg-info)] border border-sky-200'}`}>
                          {isIn ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                          {isIn ? 'CHECK-IN (ENTRY)' : 'CHECK-OUT (EXIT)'}
                        </span>
                        <span className="font-mono text-xs text-[var(--cg-text-muted)]">{mov.timestamp}</span>
                      </div>
                      <div className="font-semibold text-sm text-[var(--cg-text)]">
                        {mov.deviceModel} ({mov.deviceAssetId})
                      </div>
                      <div className="flex items-center justify-between text-xs text-[var(--cg-text-muted)]">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          Station: <strong className="text-[var(--cg-text)]">{mov.gateName}</strong>
                        </span>
                        <span>Officer: {mov.officerName} ({mov.officerBadge})</span>
                      </div>
                      {mov.crossGateNote && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] font-medium text-amber-900">
                          {mov.crossGateNote}
                        </div>
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
          <div className="flex items-center justify-between rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--cg-text)]">{t('navRequests')}</h2>
              <p className="mt-0.5 text-xs text-[var(--cg-text-muted)]">
                For university-owned lab equipment, projectors, or special hardware requiring off-campus authorization.
              </p>
            </div>
            <button
              onClick={() => setShowExitModal(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--cg-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors"
            >
              <Plus className="h-4 w-4" /> Submit Request
            </button>
          </div>

          {requests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--cg-border)] bg-[var(--cg-surface)] p-8 text-center text-sm text-[var(--cg-text-muted)]">
              No exit requests submitted yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {requests.map((req) => (
                <div key={req.id} className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--cg-border)] pb-2">
                    <span className="font-mono text-xs font-semibold text-[var(--cg-primary)]">{req.requestNumber}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      req.status === 'APPROVED' ? 'bg-emerald-50 text-[var(--cg-success)]'
                      : req.status === 'PENDING' ? 'bg-amber-50 text-[var(--cg-warning)]'
                      : 'bg-red-50 text-[var(--cg-danger)]'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--cg-text)]">{req.deviceDescription}</h3>
                    <p className="mt-1 text-xs text-[var(--cg-text-muted)]">Destination: <strong className="text-[var(--cg-text)]">{req.destination}</strong></p>
                    <p className="text-xs text-[var(--cg-text-muted)]">Reason: {req.reason}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--cg-text-muted)]">Expected Return:</span>
                      <span className="font-semibold text-[var(--cg-text)]">{req.expectedReturnDate}</span>
                    </div>
                    {req.reviewedBy && (
                      <div className="flex justify-between border-t border-[var(--cg-border)] pt-1 mt-1">
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

      {/* Confirm lost modal */}
      {deviceToReportLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-card)] p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
              <AlertTriangle className="h-6 w-6 text-[var(--cg-danger)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--cg-text)]">{t('confirmReportLostTitle')}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--cg-text-muted)]">{t('confirmReportLostDesc')}</p>
              <div className="mt-3 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3 font-mono text-xs text-[var(--cg-text)]">
                {deviceToReportLost.brand} {deviceToReportLost.model} · S/N: {deviceToReportLost.serialNumber}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeviceToReportLost(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] transition-colors">
                {t('cancel')}
              </button>
              <button onClick={handleConfirmLost}
                className="rounded-lg bg-[var(--cg-danger)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                {t('confirmReportLostAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit request modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-card)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--cg-border)] bg-[var(--cg-primary)] px-5 py-4">
              <h3 className="font-semibold text-white">Submit Temporary Exit Authorization</h3>
              <button onClick={() => setShowExitModal(false)} aria-label="Close" className="text-white/70 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateExitRequest} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-semibold text-[var(--cg-text)]">Equipment / Device Name & Model *</label>
                <input required value={reqDeviceDesc} onChange={(e) => setReqDeviceDesc(e.target.value)}
                  placeholder="e.g. Epson EB-2250U 3LCD Projector"
                  className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="block font-semibold text-[var(--cg-text)]">Destination *</label>
                <input required value={reqDestination} onChange={(e) => setReqDestination(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="block font-semibold text-[var(--cg-text)]">Academic / Research Justification *</label>
                <textarea required rows={2} value={reqReason} onChange={(e) => setReqReason(e.target.value)}
                  className="w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 py-2 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="block font-semibold text-[var(--cg-text)]">Expected Return Date *</label>
                <input required type="date" value={reqReturnDate} onChange={(e) => setReqReturnDate(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]" />
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-[var(--cg-border)] pt-3">
                <button type="button" onClick={() => setShowExitModal(false)}
                  className="rounded-lg px-4 py-2 text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] transition-colors">
                  {t('cancel')}
                </button>
                <button type="submit"
                  className="rounded-lg bg-[var(--cg-primary)] px-5 py-2.5 font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors">
                  Submit to Security HQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <QRPassModal device={selectedDeviceForQr} isOpen={!!selectedDeviceForQr} onClose={() => setSelectedDeviceForQr(null)} />
    </div>
  );
};
