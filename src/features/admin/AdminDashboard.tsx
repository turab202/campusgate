import React, { useState } from 'react';
import { Shield, Download, Search, ArrowDownLeft, ArrowUpRight, MapPin, Clock, Check, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { campusStore } from '../../services/storage';
import { Device } from '../../types';
import { QRPassModal } from '../../components/QRPassModal';

export const AdminDashboard: React.FC = () => {
  const { t, language, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DEVICES' | 'GATES' | 'REQUESTS' | 'AUDIT'>('OVERVIEW');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('ALL');
  const [selectedDeviceForQr, setSelectedDeviceForQr] = useState<Device | null>(null);
  const [selectedGateForShift, setSelectedGateForShift] = useState('gate-1');
  const [selectedOfficerForShift, setSelectedOfficerForShift] = useState('off-1');
  const [selectedShiftTime, setSelectedShiftTime] = useState('08:00 — 16:00');

  const devices = campusStore.getDevices();
  const movements = campusStore.getMovements();
  const gates = campusStore.getGates();
  const officers = campusStore.getOfficers();
  const shifts = campusStore.getShifts();
  const incidents = campusStore.getIncidents();
  const auditLogs = campusStore.getAuditLogs();
  const requests = campusStore.getRequests();

  const totalEnrolled = devices.length;
  const currentlyOutside = devices.filter((d) => d.status === 'OUTSIDE_CAMPUS').length;
  const currentlyInside = devices.filter((d) => d.status === 'INSIDE_CAMPUS').length;
  const currentlyLost = devices.filter((d) => d.status === 'LOST').length;
  const totalCheckInsToday = gates.reduce((acc, g) => acc + g.todayStats.checkIns, 0);
  const totalCheckOutsToday = gates.reduce((acc, g) => acc + g.todayStats.checkOuts, 0);
  const totalIncidentsOpen = incidents.filter((i) => i.status === 'OPEN').length;

  const filteredDevices = devices.filter((d) => {
    if (deviceStatusFilter !== 'ALL' && d.status !== deviceStatusFilter) return false;
    if (deviceSearch) {
      const q = deviceSearch.toLowerCase();
      return (
        d.assetId.toLowerCase().includes(q) ||
        d.serialNumber.toLowerCase().includes(q) ||
        d.ownerName.toLowerCase().includes(q) ||
        d.ownerStudentId.toLowerCase().includes(q) ||
        d.brand.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAssignShift = (e: React.FormEvent) => {
    e.preventDefault();
    campusStore.assignOfficerShift(selectedOfficerForShift, selectedGateForShift, selectedShiftTime);
    showToast('Shift assignment updated.', 'success');
  };

  const handleResolveLost = (devId: string) => {
    const res = campusStore.resolveLostDevice(devId, 'Security Administrator');
    showToast(res.message, 'success');
  };

  const handleApproveRequest = (reqId: string) => {
    campusStore.updateRequestStatus(reqId, 'APPROVED', 'Security Command Office');
    showToast('Exit request approved.', 'success');
  };

  const handleRejectRequest = (reqId: string) => {
    campusStore.updateRequestStatus(reqId, 'REJECTED', 'Security Command Office', 'Insufficient verification.');
    showToast('Exit request rejected.', 'warning');
  };

  const statusBadge = (status: string) => {
    if (status === 'INSIDE_CAMPUS') return 'bg-emerald-50 text-[var(--cg-success)] border-emerald-200';
    if (status === 'LOST') return 'bg-red-50 text-[var(--cg-danger)] border-red-200';
    return 'bg-sky-50 text-[var(--cg-info)] border-sky-200';
  };

  const tabs = [
    { id: 'OVERVIEW' as const, label: 'Gate Telemetry' },
    { id: 'DEVICES' as const, label: 'Device Registry' },
    { id: 'GATES' as const, label: t('navGates') },
    { id: 'REQUESTS' as const, label: 'Exit Requests' },
    { id: 'AUDIT' as const, label: 'Audit Logs' },
  ];

  return (
    <div className="space-y-6">
      {/* Admin header */}
      <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-primary)] p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-white">{t('adminDashboardTitle')}</h1>
                <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">SYSTEM LEVEL</span>
              </div>
              <p className="mt-0.5 text-xs text-white/60">Centralized telemetry across all university gates</p>
            </div>
          </div>
          <button
            onClick={() => showToast('Report export queued.', 'info')}
            className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            {t('exportPdf')}
          </button>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/20 pt-5 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: t('totalEnrolledDevices'), value: totalEnrolled, sub: 'Unique Asset IDs', color: 'text-white' },
            { label: 'Inside Campus', value: currentlyInside, sub: 'On university grounds', color: 'text-green-300' },
            { label: t('currentlyOutside'), value: currentlyOutside, sub: 'Exited via gate', color: 'text-sky-300' },
            { label: "Today's Check-Ins", value: totalCheckInsToday, sub: 'All gates', color: 'text-green-300' },
            { label: "Today's Check-Outs", value: totalCheckOutsToday, sub: 'All gates', color: 'text-white' },
            { label: 'Active Alerts', value: totalIncidentsOpen + currentlyLost, sub: `${currentlyLost} Lost, ${totalIncidentsOpen} Open`, color: 'text-red-300' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="rounded-xl border border-white/20 bg-white/10 p-3">
              <span className="block text-[11px] font-semibold text-white/70">{label}</span>
              <span className={`block font-mono text-2xl font-semibold mt-0.5 ${color}`}>{value}</span>
              <span className="block text-[10px] text-white/50">{sub}</span>
            </div>
          ))}
        </div>

        {/* Tab nav */}
        <div className="mt-5 flex items-center gap-1 overflow-x-auto border-t border-white/20 pt-4">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === id ? 'bg-white text-[var(--cg-primary)]' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--cg-text)]">{t('liveGateMonitoring')}</h2>
            <span className="text-xs text-[var(--cg-text-muted)] font-mono">3 Stations Online</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {gates.map((g) => (
              <div key={g.id} className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-semibold text-[var(--cg-primary)] bg-[var(--cg-surface-muted)] px-2 py-0.5 rounded border border-[var(--cg-border)]">
                      {g.code}
                    </span>
                    <h3 className="mt-1 font-semibold text-base text-[var(--cg-text)]">
                      {language === 'am' ? g.nameAmharic : g.name}
                    </h3>
                    <p className="text-[11px] text-[var(--cg-text-muted)] leading-tight mt-0.5">{g.locationDescription}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-[var(--cg-success)] border border-emerald-200">
                    ACTIVE
                  </span>
                </div>

                <div className="rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase text-[var(--cg-text-muted)]">On-Duty Officer</span>
                    <span className="font-mono font-semibold text-[var(--cg-primary)]">{g.currentAssignedOfficer?.officerBadge}</span>
                  </div>
                  <div className="mt-0.5 font-semibold text-[var(--cg-text)]">{g.currentAssignedOfficer?.officerName}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--cg-text-muted)]">
                    <Clock className="h-3 w-3" />
                    Shift: {g.currentAssignedOfficer?.shift}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  {[
                    { label: 'Entries', value: g.todayStats.checkIns, cls: 'bg-emerald-50 text-[var(--cg-success)] border-emerald-200' },
                    { label: 'Exits', value: g.todayStats.checkOuts, cls: 'bg-sky-50 text-[var(--cg-info)] border-sky-200' },
                    { label: 'Visitors', value: g.todayStats.visitors, cls: 'bg-amber-50 text-[var(--cg-warning)] border-amber-200' },
                    { label: 'Incidents', value: g.todayStats.incidents, cls: 'bg-red-50 text-[var(--cg-danger)] border-red-200' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className={`rounded-lg border p-2 ${cls}`}>
                      <span className="block text-[10px] font-semibold uppercase">{label}</span>
                      <span className="block font-mono text-base font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Recent activity feed */}
          <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5">
            <div className="flex items-center justify-between border-b border-[var(--cg-border)] pb-4">
              <h3 className="font-semibold text-[var(--cg-text)]">Recent Gate Activity Feed</h3>
              <span className="text-xs text-[var(--cg-primary)] font-semibold">Live Updates</span>
            </div>
            <div className="mt-2 divide-y divide-[var(--cg-border)]">
              {movements.slice(0, 5).map((mov) => {
                const isIn = mov.type === 'CHECK_IN';
                return (
                  <div key={mov.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isIn ? 'bg-emerald-50 text-[var(--cg-success)]' : 'bg-sky-50 text-[var(--cg-info)]'}`}>
                        {isIn ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--cg-text)]">
                          {mov.ownerName} · {mov.deviceModel} ({mov.deviceAssetId})
                        </div>
                        <div className="text-[11px] text-[var(--cg-text-muted)]">
                          {isIn ? 'Entered through' : 'Exited through'} {mov.gateName} · {mov.officerName} ({mov.officerBadge})
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-[var(--cg-text-muted)]">{mov.timestamp}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DEVICES TAB */}
      {activeTab === 'DEVICES' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--cg-text)]">{t('allDevicesRegistry')}</h2>
              <p className="mt-0.5 text-xs text-[var(--cg-text-muted)]">Every device enrolled once with unique serial and permanent QR asset pass.</p>
            </div>
            <select
              value={deviceStatusFilter}
              onChange={(e) => setDeviceStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-xs text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]"
            >
              <option value="ALL">All Statuses</option>
              <option value="INSIDE_CAMPUS">Inside Campus</option>
              <option value="OUTSIDE_CAMPUS">Outside Campus</option>
              <option value="LOST">Reported Lost</option>
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-[var(--cg-text-muted)]" />
            <input
              type="text"
              value={deviceSearch}
              onChange={(e) => setDeviceSearch(e.target.value)}
              placeholder={t('searchAllDevices')}
              className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] pl-10 pr-4 text-xs text-[var(--cg-text)] focus:border-[var(--cg-primary)] focus:outline-none"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--cg-border)] bg-[var(--cg-surface-muted)]">
                  <tr>
                    {['Asset ID', 'Device & Model', 'Serial Number', 'Owner & Student ID', 'Status', 'Last Activity', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cg-border)]">
                  {filteredDevices.map((dev) => (
                    <tr key={dev.id} className="hover:bg-[var(--cg-surface-muted)] transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-[var(--cg-primary)]">{dev.assetId}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--cg-text)]">{dev.brand} {dev.model}</div>
                        <div className="text-[11px] text-[var(--cg-text-muted)]">{dev.deviceType}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--cg-text)]">{dev.serialNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--cg-text)]">{dev.ownerName}</div>
                        <div className="font-mono text-[11px] text-[var(--cg-primary)]">{dev.ownerStudentId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusBadge(dev.status)}`}>
                          {dev.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[var(--cg-text-muted)]">
                        {dev.lastMovement ? (
                          <div>
                            <span>{dev.lastMovement.type} at {dev.lastMovement.gateName}</span>
                            <span className="block font-mono text-[var(--cg-text-muted)]">{dev.lastMovement.timestamp}</span>
                          </div>
                        ) : 'Enrolled'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => setSelectedDeviceForQr(dev)}
                          className="rounded border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--cg-text)] hover:bg-[var(--cg-border)] transition-colors"
                        >
                          QR Pass
                        </button>
                        {dev.status === 'LOST' && (
                          <button
                            onClick={() => handleResolveLost(dev.id)}
                            className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-[var(--cg-success)] hover:bg-emerald-100 transition-colors"
                          >
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
        <div className="space-y-5">
          <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--cg-text)]">Station Shift Assignment</h2>
              <p className="mt-0.5 text-xs text-[var(--cg-text-muted)] max-w-2xl leading-relaxed">
                Officers rotate dynamically through scheduled assignments across all gates while accessing the same centralized database.
              </p>
            </div>
            <form onSubmit={handleAssignShift} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              {[
                {
                  label: 'Gate Station',
                  el: (
                    <select value={selectedGateForShift} onChange={(e) => setSelectedGateForShift(e.target.value)}
                      className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-xs text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]">
                      {gates.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  )
                },
                {
                  label: 'Assigned Officer',
                  el: (
                    <select value={selectedOfficerForShift} onChange={(e) => setSelectedOfficerForShift(e.target.value)}
                      className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-xs text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]">
                      {officers.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.officerBadgeId})</option>)}
                    </select>
                  )
                },
                {
                  label: 'Duty Shift',
                  el: (
                    <select value={selectedShiftTime} onChange={(e) => setSelectedShiftTime(e.target.value)}
                      className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-xs text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]">
                      <option value="08:00 — 16:00">Morning (08:00 — 16:00)</option>
                      <option value="16:00 — 00:00">Evening (16:00 — 00:00)</option>
                      <option value="00:00 — 08:00">Night (00:00 — 08:00)</option>
                    </select>
                  )
                },
              ].map(({ label, el }) => (
                <div key={label} className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">{label}</label>
                  {el}
                </div>
              ))}
              <div className="flex items-end">
                <button type="submit"
                  className="h-10 w-full rounded-lg bg-[var(--cg-primary)] text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors">
                  Update Assignment
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 space-y-3">
            <h3 className="font-semibold text-sm text-[var(--cg-text)]">Current Station Assignments</h3>
            <div className="divide-y divide-[var(--cg-border)]">
              {shifts.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--cg-success)]" />
                    <div>
                      <span className="block font-semibold text-sm text-[var(--cg-text)]">{s.gateName}</span>
                      <span className="block text-[11px] text-[var(--cg-text-muted)]">{s.shiftName} ({s.timeRange})</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-semibold text-[var(--cg-text)]">{s.assignedOfficerName}</span>
                    <span className="block font-mono text-[11px] text-[var(--cg-primary)]">{s.assignedOfficerBadge}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REQUESTS TAB */}
      {activeTab === 'REQUESTS' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5">
            <h2 className="text-lg font-semibold text-[var(--cg-text)]">Temporary Device Exit Authorizations</h2>
            <p className="mt-0.5 text-xs text-[var(--cg-text-muted)]">Security approvals for university lab hardware and exhibition devices.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {requests.map((req) => {
              const isPending = req.status === 'PENDING';
              return (
                <div key={req.id} className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--cg-border)] pb-2">
                    <span className="font-mono text-xs font-semibold text-[var(--cg-primary)]">{req.requestNumber}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      req.status === 'APPROVED' ? 'bg-emerald-50 text-[var(--cg-success)]'
                      : isPending ? 'bg-amber-50 text-[var(--cg-warning)]'
                      : 'bg-red-50 text-[var(--cg-danger)]'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--cg-text)]">{req.deviceDescription}</h3>
                    <p className="mt-1 text-xs text-[var(--cg-text-muted)]">
                      Applicant: <strong className="text-[var(--cg-text)]">{req.applicantName}</strong> ({req.applicantId} · {req.department})
                    </p>
                    <p className="text-xs text-[var(--cg-text-muted)]">Destination: <strong className="text-[var(--cg-text)]">{req.destination}</strong></p>
                    <p className="mt-1 text-xs italic text-[var(--cg-text-muted)]">&ldquo;{req.reason}&rdquo;</p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-2.5 text-xs">
                    <span className="text-[var(--cg-text-muted)]">Expected Return:</span>
                    <span className="font-semibold text-[var(--cg-text)]">{req.expectedReturnDate}</span>
                  </div>
                  {isPending && (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleRejectRequest(req.id)}
                        className="flex items-center gap-1 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--cg-danger)] hover:bg-red-50 transition-colors">
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                      <button onClick={() => handleApproveRequest(req.id)}
                        className="flex items-center gap-1 rounded-lg bg-[var(--cg-primary)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors">
                        <Check className="h-3.5 w-3.5" /> Approve
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
          <div className="flex items-center justify-between rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--cg-text)]">{t('auditTrail')}</h2>
              <p className="mt-0.5 text-xs text-[var(--cg-text-muted)]">Immutable audit event generated on every security operation.</p>
            </div>
            <button
              onClick={() => showToast('Audit trail exported as CSV.', 'info')}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 py-2 text-xs font-semibold text-[var(--cg-text)] hover:bg-[var(--cg-border)] transition-colors"
            >
              {t('exportCsv')}
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--cg-border)] bg-[var(--cg-surface-muted)]">
                  <tr>
                    {[t('timestamp'), t('actor'), t('action'), t('resource'), 'Gate', 'Details', t('result')].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cg-border)]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--cg-surface-muted)] transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--cg-text-muted)] whitespace-nowrap">{log.timestamp}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--cg-text)]">{log.actorBadgeOrEmail}</div>
                        <div className="text-[10px] font-semibold text-[var(--cg-primary)]">{log.actorRole}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-[11px] text-[var(--cg-text)] whitespace-nowrap">{log.action}</td>
                      <td className="px-4 py-3 text-[var(--cg-text-muted)]">{log.resourceId}</td>
                      <td className="px-4 py-3 text-[var(--cg-text-muted)] whitespace-nowrap">{log.gateName}</td>
                      <td className="px-4 py-3 text-[var(--cg-text-muted)] max-w-xs truncate">{log.details}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          log.result === 'SUCCESS' ? 'bg-emerald-50 text-[var(--cg-success)]'
                          : log.result === 'WARNING' ? 'bg-amber-50 text-[var(--cg-warning)]'
                          : 'bg-red-50 text-[var(--cg-danger)]'
                        }`}>
                          {log.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <QRPassModal device={selectedDeviceForQr} isOpen={!!selectedDeviceForQr} onClose={() => setSelectedDeviceForQr(null)} />
    </div>
  );
};
