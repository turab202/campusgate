import React, { useState } from 'react';
import {
  Users,
  QrCode,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  MapPin,
  ArrowRight,
  LogOut,
  LogIn,
  UserCheck
} from 'lucide-react';
import { VisitorPass } from '../../types';
import { useApp } from '../../context/AppContext';
import { campusStore } from '../../services/storage';

export const VisitorManager: React.FC = () => {
  const { t, language, currentGate, activeOfficer, showToast } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New Pass Form State
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('+251 9');
  const [idNumber, setIdNumber] = useState('ETH-ID-');
  const [purpose, setPurpose] = useState('Academic Defense Guest');
  const [hostStudentOrStaff, setHostStudentOrStaff] = useState('Dr. Girma Hailu');
  const [hostDepartment, setHostDepartment] = useState('Electrical Engineering');

  const visitors = campusStore.getVisitors();

  const filteredVisitors = visitors.filter(
    (v) =>
      v.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.passNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.hostStudentOrStaff.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) return;

    campusStore.createVisitorPass({
      visitorName,
      visitorPhone,
      idNumber,
      purpose,
      hostStudentOrStaff,
      hostDepartment,
      expectedArrival: 'Today, 09:00 AM',
      expectedDeparture: 'Today, 05:00 PM'
    });

    showToast(`Visitor pass created for ${visitorName}`, 'success');
    setShowAddModal(false);
    setVisitorName('');
  };

  const handleCheckIn = (passId: string) => {
    const res = campusStore.checkInVisitor(passId, currentGate.id, activeOfficer.officerBadgeId);
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const handleCheckOut = (passId: string) => {
    const res = campusStore.checkOutVisitor(passId, currentGate.id, activeOfficer.officerBadgeId);
    showToast(res.message, res.success ? 'success' : 'error');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-purple-100 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            {t('visitorPasses')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'am'
              ? 'የውጭ እንግዶች የካምፓስ መግቢያ እና መውጫ ፍተሻ መቆጣጠሪያ'
              : 'Authorized guest verification, digital QR gate pass credentials, and access control.'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-900 text-white font-bold text-xs hover:bg-purple-800 transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>{t('newVisitorRequest')}</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by visitor name, pass ID (e.g. VP-2026-8812), or host department..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-600 shadow-xs"
        />
      </div>

      {/* Visitor Passes Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVisitors.map((vis) => {
          const isInside = vis.status === 'INSIDE';
          const isExpected = vis.status === 'EXPECTED';
          const isCheckedOut = vis.status === 'CHECKED_OUT';

          return (
            <div
              key={vis.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="font-mono text-xs font-bold text-purple-950 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {vis.passNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isInside
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isExpected
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {vis.status}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  <h3 className="font-extrabold text-base text-slate-900">{vis.visitorName}</h3>
                  <div className="text-xs text-slate-500 font-medium">
                    Phone: <span className="font-mono text-slate-800">{vis.visitorPhone}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    National ID: <span className="font-mono text-slate-800">{vis.idNumber}</span>
                  </div>
                  <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200 mt-2">
                    <span className="font-semibold block text-[10px] uppercase text-slate-400">Purpose of Visit:</span>
                    <span>{vis.purpose}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Host: <strong className="text-purple-950">{vis.hostStudentOrStaff}</strong> ({vis.hostDepartment})
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                {isExpected && (
                  <button
                    onClick={() => handleCheckIn(vis.id)}
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{t('checkInVisitor')}</span>
                  </button>
                )}

                {isInside && (
                  <button
                    onClick={() => handleCheckOut(vis.id)}
                    className="w-full py-2 bg-purple-900 hover:bg-purple-800 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('checkOutVisitor')}</span>
                  </button>
                )}

                {isCheckedOut && (
                  <div className="w-full py-1.5 text-center text-xs font-semibold text-slate-400 bg-slate-50 rounded-lg">
                    Departed ({vis.checkOutTime || 'Completed'})
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for Creating New Visitor Pass */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-purple-200 overflow-hidden animate-in fade-in">
            <div className="bg-purple-950 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base">{t('newVisitorRequest')}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-purple-300 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreatePass} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('visitorName')}</label>
                <input
                  type="text"
                  required
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="e.g. Dr. Dawit Mengesha"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('visitorPhone')}</label>
                  <input
                    type="text"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('nationalId')}</label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('purpose')}</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Senior Project External Evaluation"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('hostPerson')}</label>
                  <input
                    type="text"
                    value={hostStudentOrStaff}
                    onChange={(e) => setHostStudentOrStaff(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Host Department</label>
                  <input
                    type="text"
                    value={hostDepartment}
                    onChange={(e) => setHostDepartment(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-900 text-white font-bold hover:bg-purple-800 shadow-md"
                >
                  Generate Digital Pass & QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
