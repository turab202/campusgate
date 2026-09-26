import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Filter,
  FileText
} from 'lucide-react';
import { SecurityIncident } from '../../types';
import { useApp } from '../../context/AppContext';
import { campusStore } from '../../services/storage';

export const IncidentManager: React.FC = () => {
  const { t, language, currentGate, activeOfficer, role, showToast } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Incident Form
  const [type, setType] = useState<SecurityIncident['type']>('DEVICE_MISMATCH');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [studentId, setStudentId] = useState('');
  const [severity, setSeverity] = useState<SecurityIncident['severity']>('HIGH');

  const incidents = campusStore.getIncidents();

  const filteredIncidents = incidents.filter((inc) => {
    if (filterStatus !== 'ALL' && inc.status !== filterStatus) return false;
    return true;
  });

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    campusStore.createIncident({
      type,
      title,
      description,
      gateId: currentGate.id,
      gateName: currentGate.name,
      officerBadge: activeOfficer.officerBadgeId,
      deviceSerial: deviceSerial || undefined,
      studentId: studentId || undefined,
      severity
    });

    showToast('Incident logged into central security registry', 'warning');
    setShowCreateModal(false);
    setTitle('');
    setDescription('');
  };

  const handleUpdateStatus = (id: string, newStatus: SecurityIncident['status']) => {
    campusStore.updateIncidentStatus(id, newStatus, 'Status updated by security operator');
    showToast(`Incident status updated to ${newStatus}`, 'info');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-purple-100 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            {t('navIncidents')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'am'
              ? 'በዩኒቨርሲቲው በሮች የተመዘገቡ የደህንነት ስጋቶች፣ አለመጣጣሞች እና የጠፉ መሳሪያዎች ሪፖርት'
              : 'Security incidents, flag alerts, serial discrepancies, and unauthorized gate crossing records.'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-800 text-white font-bold text-xs hover:bg-rose-700 transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>{t('createIncident')}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-slate-500 font-bold uppercase text-[10px]">Filter Status:</span>
        {['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === st
                ? 'bg-purple-900 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Incidents List */}
      <div className="space-y-3">
        {filteredIncidents.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No incidents recorded for this status filter.
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const isOpen = inc.status === 'OPEN';
            const isReview = inc.status === 'UNDER_REVIEW';
            const isResolved = inc.status === 'RESOLVED';

            return (
              <div
                key={inc.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-purple-200 transition-all space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-rose-900 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {inc.incidentNumber}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {inc.type.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        inc.severity === 'HIGH' || inc.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {inc.severity} SEVERITY
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      isOpen
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : isReview
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {inc.status.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900">{inc.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {inc.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-600">
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Gate:</span>
                    <span>{inc.gateName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Reporting Officer:</span>
                    <span className="font-mono">{inc.officerBadge}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Device / Serial:</span>
                    <span className="font-mono">{inc.deviceSerial || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Logged:</span>
                    <span>{inc.timestamp}</span>
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-400">
                    {inc.resolutionNotes || 'Open for investigation'}
                  </span>

                  <div className="flex items-center space-x-1.5">
                    {isOpen && (
                      <button
                        onClick={() => handleUpdateStatus(inc.id, 'UNDER_REVIEW')}
                        className="px-2.5 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 font-semibold"
                      >
                        Mark Under Review
                      </button>
                    )}
                    {!isResolved && (
                      <button
                        onClick={() => handleUpdateStatus(inc.id, 'RESOLVED')}
                        className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 font-semibold"
                      >
                        Resolve & Close
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-purple-200 overflow-hidden animate-in fade-in">
            <div className="bg-rose-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base">{t('createIncident')}</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-rose-200 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateIncident} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Incident Category</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="DEVICE_MISMATCH">Device Owner Mismatch</option>
                  <option value="UNKNOWN_DEVICE">Unknown / Unenrolled Device Attempt</option>
                  <option value="LOST_DEVICE">Lost Device Interception</option>
                  <option value="UNAUTHORIZED_EXIT">Unauthorized Exit</option>
                  <option value="IDENTITY_MISMATCH">Student / Bearer Identity Mismatch</option>
                  <option value="QR_PROBLEM">QR Code Damage / Tamper</option>
                  <option value="OTHER">Other Security Discrepancy</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Incident Subject / Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Serial mismatch discovered during student check-out"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Device Serial (If Applicable)</label>
                  <input
                    type="text"
                    value={deviceSerial}
                    onChange={(e) => setDeviceSerial(e.target.value)}
                    placeholder="e.g. PF123456"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Student ID (If Identified)</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. ASTU-2024-01234"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Detailed Officer Description</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe student statements, officer observations, and immediate actions..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-800 text-white font-bold hover:bg-rose-700 shadow-md"
                >
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
