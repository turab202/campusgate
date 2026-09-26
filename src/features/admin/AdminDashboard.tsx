import React, { useState } from 'react';
import {
  Shield,
  Layers,
  MapPin,
  Laptop,
  Users,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Search,
  Filter,
  Download,
  Calendar,
  Sparkles,
  BarChart3,
  FileCheck2,
  CheckCircle2,
  RotateCcw,
  Check,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { campusStore } from '../../services/storage';
import { Device, Gate, GateShift, SecurityIncident, ExitRequest } from '../../types';
import { QRPassModal } from '../../components/QRPassModal';

export const AdminDashboard: React.FC = () => {
  const { t, language, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DEVICES' | 'GATES' | 'AUDIT' | 'ANALYTICS' | 'REQUESTS'>('OVERVIEW');

  // Device Registry State
  const [deviceSearch, setDeviceSearch] = useState('');
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('ALL');
  const [selectedDeviceForQr, setSelectedDeviceForQr] = useState<Device | null>(null);

  // Shift assignment state
  const [selectedGateForShift, setSelectedGateForShift] = useState<string>('gate-1');
  const [selectedOfficerForShift, setSelectedOfficerForShift] = useState<string>('off-1');
  const [selectedShiftTime, setSelectedShiftTime] = useState<string>('08:00 — 16:00');

  const devices = campusStore.getDevices();
  const movements = campusStore.getMovements();
  const gates = campusStore.getGates();
  const officers = campusStore.getOfficers();
  const shifts = campusStore.getShifts();
  const incidents = campusStore.getIncidents();
  const auditLogs = campusStore.getAuditLogs();
  const requests = campusStore.getRequests();

  // Metrics
  const totalEnrolled = devices.length;
  const currentlyOutside = devices.filter((d) => d.status === 'OUTSIDE_CAMPUS').length;
  const currentlyInside = devices.filter((d) => d.status === 'INSIDE_CAMPUS').length;
  const currentlyLost = devices.filter((d) => d.status === 'LOST').length;

  const totalCheckInsToday = gates.reduce((acc, g) => acc + g.todayStats.checkIns, 0);
  const totalCheckOutsToday = gates.reduce((acc, g) => acc + g.todayStats.checkOuts, 0);
  const totalVisitorsToday = gates.reduce((acc, g) => acc + g.todayStats.visitors, 0);
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
    showToast('Shift and gate station assignment updated.', 'success');
  };

  const handleResolveLost = (devId: string) => {
    const res = campusStore.resolveLostDevice(devId, 'Col. Kassahun (Chief of Security)');
    showToast(res.message, 'success');
  };

  const handleApproveRequest = (reqId: string) => {
    campusStore.updateRequestStatus(reqId, 'APPROVED', 'Security Command Office');
    showToast('Exit request approved for off-campus academic use.', 'success');
  };

  const handleRejectRequest = (reqId: string) => {
    campusStore.updateRequestStatus(reqId, 'REJECTED', 'Security Command Office', 'Insufficient supporting verification.');
    showToast('Exit request rejected.', 'warning');
  };

  return (
    <div className="space-y-6">
      {/* Admin Executive Header */}
      <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white p-6 rounded-2xl border border-purple-900 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-800/90 border border-purple-400/40 flex items-center justify-center text-purple-200 shadow-inner">
              <Shield className="w-7 h-7 text-purple-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-extrabold text-white">
                  {t('adminDashboardTitle')}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-purple-950">
                  SYSTEM LEVEL
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-0.5">
                Centralized telemetry across all university gates • Real-time cross-gate movement verification
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => showToast('Report export queued (PDF / CSV format).', 'info')}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-purple-800 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold border border-purple-600 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('exportPdf')}</span>
            </button>
          </div>
        </div>

        {/* Executive Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-purple-900/80">
          <div className="bg-purple-900/50 p-3 rounded-xl border border-purple-800/80">
            <span className="text-[11px] text-purple-300 font-semibold block">{t('totalEnrolledDevices')}</span>
            <span className="text-2xl font-extrabold text-white font-mono mt-0.5 block">{totalEnrolled}</span>
            <span className="text-[10px] text-purple-400">Unique Asset IDs</span>
          </div>

          <div className="bg-purple-900/50 p-3 rounded-xl border border-purple-800/80">
            <span className="text-[11px] text-purple-300 font-semibold block">Inside Campus</span>
            <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-0.5 block">{currentlyInside}</span>
            <span className="text-[10px] text-emerald-400/80">On university grounds</span>
          </div>

          <div className="bg-purple-900/50 p-3 rounded-xl border border-purple-800/80">
            <span className="text-[11px] text-purple-300 font-semibold block">{t('currentlyOutside')}</span>
            <span className="text-2xl font-extrabold text-indigo-300 font-mono mt-0.5 block">{currentlyOutside}</span>
            <span className="text-[10px] text-indigo-300/80">Exited via gate</span>
          </div>

          <div className="bg-purple-900/50 p-3 rounded-xl border border-purple-800/80">
            <span className="text-[11px] text-purple-300 font-semibold block">Today's Check-Ins</span>
            <span className="text-2xl font-extrabold text-emerald-300 font-mono mt-0.5 block">{totalCheckInsToday}</span>
            <span className="text-[10px] text-purple-300">All 3 gates</span>
          </div>

          <div className="bg-purple-900/50 p-3 rounded-xl border border-purple-800/80">
            <span className="text-[11px] text-purple-300 font-semibold block">Today's Check-Outs</span>
            <span className="text-2xl font-extrabold text-purple-200 font-mono mt-0.5 block">{totalCheckOutsToday}</span>
            <span className="text-[10px] text-purple-300">All 3 gates</span>
          </div>

          <div className="bg-purple-900/50 p-3 rounded-xl border border-purple-800/80">
            <span className="text-[11px] text-rose-300 font-semibold block">Active Alerts</span>
            <span className="text-2xl font-extrabold text-rose-400 font-mono mt-0.5 block">{totalIncidentsOpen + currentlyLost}</span>
            <span className="text-[10px] text-rose-300 font-semibold">{currentlyLost} Lost, {totalIncidentsOpen} Open</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-1 mt-6 pt-4 border-t border-purple-800/80 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'OVERVIEW'
                ? 'bg-white text-purple-950 shadow-md font-bold'
                : 'text-purple-200 hover:text-white hover:bg-purple-800/50'
            }`}
          >
            Gate Stations Telemetry
          </button>
          <button
            onClick={() => setActiveTab('DEVICES')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'DEVICES'
                ? 'bg-white text-purple-950 shadow-md font-bold'
                : 'text-purple-200 hover:text-white hover:bg-purple-800/50'
            }`}
          >
            {t('allDevicesRegistry')} ({devices.length})
          </button>
          <button
            onClick={() => setActiveTab('GATES')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'GATES'
                ? 'bg-white text-purple-950 shadow-md font-bold'
                : 'text-purple-200 hover:text-white hover:bg-purple-800/50'
            }`}
          >
            {t('navGates')}
          </button>
          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'REQUESTS'
                ? 'bg-white text-purple-950 shadow-md font-bold'
                : 'text-purple-200 hover:text-white hover:bg-purple-800/50'
            }`}
          >
            Exit Requests ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'AUDIT'
                ? 'bg-white text-purple-950 shadow-md font-bold'
                : 'text-purple-200 hover:text-white hover:bg-purple-800/50'
            }`}
          >
            {t('auditTrail')} ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('ANALYTICS')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'ANALYTICS'
                ? 'bg-white text-purple-950 shadow-md font-bold'
                : 'text-purple-200 hover:text-white hover:bg-purple-800/50'
            }`}
          >
            {t('navAnalytics')}
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & GATE TELEMETRY */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900">
              {t('liveGateMonitoring')}
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              3 Stations Online • 100% Central Sync Rate
            </span>
          </div>

          {/* Gate Station Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gates.map((g) => (
              <div
                key={g.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-purple-300 transition-all space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {g.code}
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900 mt-1">
                      {language === 'am' ? g.nameAmharic : g.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      {g.locationDescription}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    ACTIVE
                  </span>
                </div>

                {/* Assigned Officer on Shift */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">On-Duty Officer:</span>
                    <span className="font-mono font-bold text-purple-950">
                      {g.currentAssignedOfficer?.officerBadge}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {g.currentAssignedOfficer?.officerName}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Shift: {g.currentAssignedOfficer?.shift}</span>
                  </div>
                </div>

                {/* Gate Activity Counters */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                    <span className="text-[10px] text-emerald-800 font-semibold uppercase block">Entries</span>
                    <span className="font-extrabold text-emerald-950 font-mono text-base">{g.todayStats.checkIns}</span>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 p-2 rounded-lg">
                    <span className="text-[10px] text-indigo-800 font-semibold uppercase block">Exits</span>
                    <span className="font-extrabold text-indigo-950 font-mono text-base">{g.todayStats.checkOuts}</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg">
                    <span className="text-[10px] text-amber-800 font-semibold uppercase block">Visitors</span>
                    <span className="font-extrabold text-amber-950 font-mono text-base">{g.todayStats.visitors}</span>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 p-2 rounded-lg">
                    <span className="text-[10px] text-rose-800 font-semibold uppercase block">Incidents</span>
                    <span className="font-extrabold text-rose-950 font-mono text-base">{g.todayStats.incidents}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Live Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">
                Recent Central Gate Activity Feed
              </h3>
              <span className="text-xs text-purple-900 font-semibold">Live Updates</span>
            </div>

            <div className="divide-y divide-slate-100 mt-2 text-xs">
              {movements.slice(0, 5).map((mov) => {
                const isIn = mov.type === 'CHECK_IN';
                return (
                  <div key={mov.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isIn ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {isIn ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">
                          {mov.ownerName} • {mov.deviceModel} ({mov.deviceAssetId})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {isIn ? 'Entered through' : 'Exited through'} {mov.gateName} • Inspected by {mov.officerName} ({mov.officerBadge})
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-slate-400 text-[11px]">{mov.timestamp}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CENTRAL DEVICE REGISTRY */}
      {activeTab === 'DEVICES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-purple-100 shadow-sm">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {t('allDevicesRegistry')}
              </h2>
              <p className="text-xs text-slate-500">
                Rule 1 & Rule 9 enforced: Every device is enrolled once with unique serial and permanent QR asset pass.
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-2 text-xs">
              <select
                value={deviceStatusFilter}
                onChange={(e) => setDeviceStatusFilter(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="INSIDE_CAMPUS">Inside Campus</option>
                <option value="OUTSIDE_CAMPUS">Outside Campus</option>
                <option value="LOST">Reported Lost</option>
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={deviceSearch}
              onChange={(e) => setDeviceSearch(e.target.value)}
              placeholder={t('searchAllDevices')}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-600 shadow-xs"
            />
          </div>

          {/* Device Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Asset ID</th>
                    <th className="px-4 py-3">Device & Model</th>
                    <th className="px-4 py-3">Serial Number</th>
                    <th className="px-4 py-3">Owner & Student ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Gate Activity</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredDevices.map((dev) => {
                    const isInside = dev.status === 'INSIDE_CAMPUS';
                    const isLost = dev.status === 'LOST';

                    return (
                      <tr key={dev.id} className="hover:bg-purple-50/40 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-purple-950">
                          {dev.assetId}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{dev.brand} {dev.model}</div>
                          <div className="text-[11px] text-slate-500">{dev.deviceType}</div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-900">
                          {dev.serialNumber}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{dev.ownerName}</div>
                          <div className="text-[11px] font-mono text-purple-900">{dev.ownerStudentId}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              isInside
                                ? 'bg-emerald-100 text-emerald-800'
                                : isLost
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {dev.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[11px] text-slate-600">
                          {dev.lastMovement ? (
                            <div>
                              <span>{dev.lastMovement.type} at {dev.lastMovement.gateName}</span>
                              <span className="block text-slate-400 font-mono">{dev.lastMovement.timestamp}</span>
                            </div>
                          ) : (
                            <span>Enrolled</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-2">
                          <button
                            onClick={() => setSelectedDeviceForQr(dev)}
                            className="px-2.5 py-1 bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100 rounded text-xs font-semibold"
                          >
                            QR Pass
                          </button>
                          {isLost && (
                            <button
                              onClick={() => handleResolveLost(dev.id)}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100 rounded text-xs font-bold"
                            >
                              Clear Lost Flag
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GATES & SHIFT MANAGEMENT */}
      {activeTab === 'GATES' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              Station Shift Assignment (Explains Single Unified Officer Application)
            </h2>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              In CampusGate, there are no separate gate supervisor accounts. There is ONE Gate Officer role.
              Officers rotate dynamically through scheduled assignments across Gate 1, Gate 2, and Gate 3 while accessing the exact same centralized database.
            </p>

            <form onSubmit={handleAssignShift} className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Gate Station:</label>
                <select
                  value={selectedGateForShift}
                  onChange={(e) => setSelectedGateForShift(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  {gates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Security Officer:</label>
                <select
                  value={selectedOfficerForShift}
                  onChange={(e) => setSelectedOfficerForShift(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.officerBadgeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Duty Shift:</label>
                <select
                  value={selectedShiftTime}
                  onChange={(e) => setSelectedShiftTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="08:00 — 16:00">Morning (08:00 — 16:00)</option>
                  <option value="16:00 — 00:00">Evening (16:00 — 00:00)</option>
                  <option value="00:00 — 08:00">Night (00:00 — 08:00)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-purple-900 text-white font-bold rounded-xl hover:bg-purple-800 shadow-md transition-colors"
                >
                  Update Station Duty
                </button>
              </div>
            </form>
          </div>

          {/* Current Shifts Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900">Current Station Assignments</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {shifts.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <div>
                      <span className="font-bold text-slate-900">{s.gateName}</span>
                      <span className="text-[11px] text-slate-500 block">{s.shiftName} ({s.timeRange})</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-purple-950">{s.assignedOfficerName}</span>
                    <span className="font-mono text-[11px] text-purple-700 block">{s.assignedOfficerBadge}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXIT REQUESTS APPROVAL */}
      {activeTab === 'REQUESTS' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Temporary Device Exit Authorizations</h2>
              <p className="text-xs text-slate-500">Security approvals for university lab hardware and exhibition devices.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map((req) => {
              const isPending = req.status === 'PENDING';
              return (
                <div key={req.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-mono text-xs font-bold text-purple-950 bg-purple-50 px-2 py-0.5 rounded">
                      {req.requestNumber}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : isPending ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">{req.deviceDescription}</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Applicant: <strong>{req.applicantName}</strong> ({req.applicantId} • {req.department})
                    </p>
                    <p className="text-xs text-slate-600">
                      Destination: <strong>{req.destination}</strong>
                    </p>
                    <p className="text-xs text-slate-500 italic mt-1">
                      "{req.reason}"
                    </p>
                  </div>

                  <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between text-slate-600">
                    <span>Expected Return Date:</span>
                    <span className="font-bold text-slate-900">{req.expectedReturnDate}</span>
                  </div>

                  {isPending && (
                    <div className="pt-2 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-rose-800 text-xs font-semibold flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleApproveRequest(req.id)}
                        className="px-4 py-1.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Approve Authorization</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {t('auditTrail')}
              </h2>
              <p className="text-xs text-slate-500">
                Rule 12: Immutable audit event generated on every device check-in, check-out, enrollment, and security alert.
              </p>
            </div>
            <button
              onClick={() => showToast('Audit trail exported as CSV.', 'info')}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>{t('exportCsv')}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">{t('timestamp')}</th>
                    <th className="px-4 py-3">{t('actor')}</th>
                    <th className="px-4 py-3">{t('action')}</th>
                    <th className="px-4 py-3">{t('resource')}</th>
                    <th className="px-4 py-3">Gate Station</th>
                    <th className="px-4 py-3">Audit Details</th>
                    <th className="px-4 py-3">{t('result')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-purple-50/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900">{log.actorBadgeOrEmail}</span>
                        <span className="text-[10px] block text-purple-800 font-semibold">{log.actorRole}</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-purple-950 text-[11px]">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {log.resourceId}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {log.gateName}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                        {log.details}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.result === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
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

      {/* TAB 6: ANALYTICS & TRENDS */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900">
              Campus Access Analytics & Peak Gate Traffic
            </h2>
            <p className="text-xs text-slate-500">
              Empirical data on student personal device movement patterns, cross-gate flow efficiency, and peak hours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cross Gate Ratio */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-base text-slate-900">
                Cross-Gate Return Ratio
              </h3>
              <p className="text-xs text-slate-600">
                Percentage of electronic devices that exit campus through one gate (e.g. Gate 1) and return through a different gate (e.g. Gate 3).
              </p>
              <div className="flex items-center space-x-4 pt-2">
                <div className="w-24 h-24 rounded-full border-8 border-purple-900 border-t-amber-400 flex items-center justify-center font-extrabold text-lg text-purple-950 font-mono">
                  68%
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-purple-900 rounded-sm" />
                    <span className="font-semibold text-slate-800">Cross-Gate Return (Multi-Gate)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-amber-400 rounded-sm" />
                    <span className="font-semibold text-slate-800">Same-Gate Return</span>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Confirms necessity of centralized digital system over handwritten notebooks.
                  </p>
                </div>
              </div>
            </div>

            {/* Peak Hours Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-base text-slate-900">
                Peak Traffic Hours (Gate Entry & Exit)
              </h3>
              <div className="space-y-3 text-xs pt-1">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>07:30 — 09:30 AM (Morning Rush / Lab Entry)</span>
                    <span className="font-mono text-purple-900 font-bold">42% of traffic</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-900 rounded-full" style={{ width: '42%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>12:00 — 14:00 PM (Midday Cross-Campus Move)</span>
                    <span className="font-mono text-purple-900 font-bold">26% of traffic</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-700 rounded-full" style={{ width: '26%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>16:30 — 18:30 PM (Evening Exit Rush)</span>
                    <span className="font-mono text-purple-900 font-bold">32% of traffic</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-800 rounded-full" style={{ width: '32%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal for Admin */}
      <QRPassModal
        device={selectedDeviceForQr}
        isOpen={!!selectedDeviceForQr}
        onClose={() => setSelectedDeviceForQr(null)}
      />
    </div>
  );
};
