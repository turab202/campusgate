import React, { useState } from 'react';
import {
  Laptop,
  QrCode,
  Clock,
  AlertTriangle,
  Send,
  Plus,
  ArrowRight,
  Shield,
  FileText,
  User,
  CheckCircle2,
  Calendar,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { Device, ExitRequest } from '../../types';
import { useApp } from '../../context/AppContext';
import { campusStore } from '../../services/storage';
import { QRPassModal } from '../../components/QRPassModal';

export const StudentView: React.FC = () => {
  const { t, language, currentStudent, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'DEVICES' | 'HISTORY' | 'REQUESTS' | 'PROFILE'>('DEVICES');

  // Selected device for QR Modal
  const [selectedDeviceForQr, setSelectedDeviceForQr] = useState<Device | null>(null);

  // Lost Report Confirmation Dialog
  const [deviceToReportLost, setDeviceToReportLost] = useState<Device | null>(null);

  // Exit Request Modal
  const [showExitModal, setShowExitModal] = useState(false);
  const [reqDeviceDesc, setReqDeviceDesc] = useState('');
  const [reqDestination, setReqDestination] = useState('INSA Cyber Center, Addis Ababa');
  const [reqReason, setReqReason] = useState('Research Project Exhibition & Capstone Defense');
  const [reqReturnDate, setReqReturnDate] = useState('2026-09-30');

  const devices = campusStore.getDevices().filter((d) => d.ownerStudentId === currentStudent.studentId || d.ownerId === currentStudent.id);
  const movements = campusStore.getMovements().filter((m) => m.ownerStudentId === currentStudent.studentId);
  const requests = campusStore.getRequests().filter((r) => r.applicantId === currentStudent.studentId);

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Student Profile Summary Card */}
      <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-purple-900">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
            <img
              src={currentStudent.avatarUrl}
              alt={currentStudent.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-400 shadow-md"
            />
            <div>
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <h1 className="text-2xl font-extrabold text-white">
                  {currentStudent.name}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-400 text-emerald-950">
                  {currentStudent.status}
                </span>
              </div>
              <p className="text-xs font-mono text-purple-200 mt-0.5">
                {currentStudent.studentId} • {currentStudent.department}
              </p>
              <p className="text-[11px] text-purple-300 mt-1">
                {language === 'am'
                  ? 'የተመዘገቡ መሳሪያዎችዎን ሁኔታ ይመልከቱ፣ QR ኮድ ያውርዱ እና እንቅስቃሴዎን ይከታተሉ።'
                  : 'Centralized Personal Electronic Devices Registry • Verified Student Account'}
              </p>
            </div>
          </div>

          <div className="bg-purple-900/80 p-3 rounded-xl border border-purple-700 text-center sm:text-right text-xs">
            <span className="text-purple-300 block text-[10px] uppercase font-bold">Enrolled Hardware:</span>
            <span className="text-lg font-mono font-extrabold text-amber-300">{devices.length} Devices</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 mt-6 pt-4 border-t border-purple-800/80 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('DEVICES')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'DEVICES'
                ? 'bg-white text-purple-950 shadow-md font-bold'
                : 'text-purple-200 hover:text-white hover:bg-purple-800/50'
            }`}
          >
            {t('navMyDevices')} ({devices.length})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'HISTORY'
                ? 'bg-white text-purple-950 shadow-md font-bold'
                : 'text-purple-200 hover:text-white hover:bg-purple-800/50'
            }`}
          >
            {t('navHistory')} ({movements.length})
          </button>
          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'REQUESTS'
                ? 'bg-white text-purple-950 shadow-md font-bold'
                : 'text-purple-200 hover:text-white hover:bg-purple-800/50'
            }`}
          >
            {t('navRequests')} ({requests.length})
          </button>
        </div>
      </div>

      {/* TAB 1: MY DEVICES */}
      {activeTab === 'DEVICES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900">
              {t('myEnrolledDevices')}
            </h2>
            <span className="text-xs text-slate-500">
              {language === 'am' ? 'አንድ ጊዜ የተመዘገበ መሳሪያ በሁሉም በሮች ይሰራል' : 'Rule: Enrolled once • Valid at all university gates'}
            </span>
          </div>

          {devices.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
              <Laptop className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {t('noRegisteredDevices')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {devices.map((dev) => {
                const isInside = dev.status === 'INSIDE_CAMPUS';
                const isLost = dev.status === 'LOST';

                return (
                  <div
                    key={dev.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Top ID & Status Badge */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="font-mono text-xs font-bold text-purple-950 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                          {dev.assetId}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${
                            isInside
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isLost
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full mr-1.5 ${
                              isInside ? 'bg-emerald-500' : isLost ? 'bg-rose-500' : 'bg-indigo-500'
                            }`}
                          />
                          {dev.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Device Specs */}
                      <div className="mt-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-extrabold text-base text-slate-900">
                              {dev.brand} {dev.model}
                            </h3>
                            <span className="text-xs text-slate-500 font-medium">
                              {dev.deviceType}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-bold uppercase text-[10px]">Serial Number:</span>
                            <span className="font-mono font-bold text-slate-900">{dev.serialNumber}</span>
                          </div>
                          {dev.lastMovement && (
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                              <span className="text-slate-400 font-bold uppercase text-[10px]">Last Gate Activity:</span>
                              <span className="text-slate-700 font-medium">
                                {dev.lastMovement.type === 'CHECK_IN' ? 'Entry' : 'Exit'} at {dev.lastMovement.gateName} ({dev.lastMovement.timestamp})
                              </span>
                            </div>
                          )}
                        </div>

                        {dev.notes && (
                          <p className="text-[11px] text-slate-500 italic">
                            Note: {dev.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => setSelectedDeviceForQr(dev)}
                        className="inline-flex items-center space-x-1.5 px-3 py-2 bg-purple-900 text-white rounded-xl font-bold text-xs hover:bg-purple-800 transition-colors shadow-xs"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{t('viewQr')}</span>
                      </button>

                      {!isLost ? (
                        <button
                          onClick={() => setDeviceToReportLost(dev)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg font-semibold transition-colors"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{t('reportLostBtn')}</span>
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded">
                          Lost Flag Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MOVEMENT HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {t('navHistory')}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'am' ? 'የመሳሪያዎችዎ በሮች ያሳለፉት ሙሉ የፍተሻ ታሪክ' : 'Historical timeline of verified check-ins and check-outs across campus gates.'}
              </p>
            </div>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {movements.map((mov) => {
              const isIn = mov.type === 'CHECK_IN';
              return (
                <div key={mov.id} className="relative group">
                  <div
                    className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                      isIn ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                  />
                  <div className="bg-slate-50 hover:bg-purple-50/50 p-4 rounded-xl border border-slate-200 transition-all space-y-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          isIn ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {isIn ? 'CHECK-IN (ENTRY)' : 'CHECK-OUT (EXIT)'}
                      </span>
                      <span className="text-xs font-mono text-slate-500">{mov.timestamp}</span>
                    </div>

                    <div className="font-bold text-sm text-slate-900">
                      {mov.deviceModel} ({mov.deviceAssetId})
                    </div>

                    <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-purple-700" />
                        <span>Station: <strong>{mov.gateName}</strong></span>
                      </span>
                      <span>Inspected by: {mov.officerName} ({mov.officerBadge})</span>
                    </div>

                    {mov.crossGateNote && (
                      <div className="mt-2 text-[11px] bg-amber-50 text-amber-900 border border-amber-300 p-2 rounded-lg font-medium">
                        {mov.crossGateNote}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: EXIT REQUESTS */}
      {activeTab === 'REQUESTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-purple-100 shadow-sm">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {t('navRequests')}
              </h2>
              <p className="text-xs text-slate-500">
                For university-owned lab equipment, projectors, or special hardware requiring off-campus authorization.
              </p>
            </div>
            <button
              onClick={() => setShowExitModal(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-900 text-white rounded-xl text-xs font-bold hover:bg-purple-800 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Request</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-mono text-xs font-bold text-purple-950 bg-purple-50 px-2 py-0.5 rounded">
                    {req.requestNumber}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      req.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">{req.deviceDescription}</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Destination: <strong>{req.destination}</strong>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Reason: {req.reason}
                  </p>
                </div>

                <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Expected Return:</span>
                    <span className="font-bold">{req.expectedReturnDate}</span>
                  </div>
                  {req.reviewedBy && (
                    <div className="flex justify-between text-[11px] text-emerald-800 pt-1 border-t border-slate-200">
                      <span>Approved By:</span>
                      <span className="font-semibold">{req.reviewedBy}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONFIRM LOST MODAL */}
      {deviceToReportLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-300 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                {t('confirmReportLostTitle')}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {t('confirmReportLostDesc')}
              </p>
              <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs font-mono text-rose-950">
                {deviceToReportLost.brand} {deviceToReportLost.model} • S/N: {deviceToReportLost.serialNumber}
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeviceToReportLost(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmLost}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-sm"
              >
                {t('confirmReportLostAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT EXIT REQUEST MODAL */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-purple-200 overflow-hidden">
            <div className="bg-purple-950 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base">Submit Temporary Exit Authorization</h3>
              <button onClick={() => setShowExitModal(false)} className="text-purple-300 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateExitRequest} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Equipment / Device Name & Model</label>
                <input
                  type="text"
                  required
                  value={reqDeviceDesc}
                  onChange={(e) => setReqDeviceDesc(e.target.value)}
                  placeholder="e.g. Epson EB-2250U 3LCD Projector or Lab Oscilloscope"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Destination</label>
                <input
                  type="text"
                  required
                  value={reqDestination}
                  onChange={(e) => setReqDestination(e.target.value)}
                  placeholder="e.g. INSA Headquarters, Addis Ababa"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Academic / Research Justification</label>
                <textarea
                  required
                  rows={2}
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Expected Return Date</label>
                <input
                  type="date"
                  required
                  value={reqReturnDate}
                  onChange={(e) => setReqReturnDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-900 text-white font-bold rounded-xl hover:bg-purple-800 shadow-md"
                >
                  Submit to Security HQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      <QRPassModal
        device={selectedDeviceForQr}
        isOpen={!!selectedDeviceForQr}
        onClose={() => setSelectedDeviceForQr(null)}
      />
    </div>
  );
};
