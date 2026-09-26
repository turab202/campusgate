import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Laptop,
  MapPin,
  Shield,
  ShieldAlert,
  User,
  X,
  FileWarning
} from 'lucide-react';
import { Device, Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { campusStore } from '../../services/storage';

interface DeviceVerificationModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onEnrollNew?: (serial?: string) => void;
  isUnknown?: boolean;
  searchedTerm?: string;
  isOwnerMismatch?: boolean;
  presentedStudent?: Student | null;
}

export const DeviceVerificationModal: React.FC<DeviceVerificationModalProps> = ({
  device,
  isOpen,
  onClose,
  onEnrollNew,
  isUnknown = false,
  searchedTerm = '',
  isOwnerMismatch = false,
  presentedStudent = null
}) => {
  const { t, language, currentGate, activeOfficer, showToast } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentReason, setIncidentReason] = useState('DEVICE_MISMATCH');
  const [incidentNotes, setIncidentNotes] = useState('');

  if (!isOpen) return null;

  // Unknown Device State
  if (isUnknown || !device) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
          <div className="bg-amber-600 text-white p-5 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <AlertTriangle className="w-6 h-6 text-amber-100" />
              <h3 className="font-bold text-lg">{t('deviceNotFound')}</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-amber-700 text-amber-200 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mb-5">
              <p className="text-sm font-semibold text-amber-950 mb-1">
                {searchedTerm ? `Searched: "${searchedTerm}"` : 'Unknown Asset / Barcode'}
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                {t('deviceNotFoundDesc')}
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  onClose();
                  if (onEnrollNew) onEnrollNew(searchedTerm);
                }}
                className="w-full py-3 px-4 rounded-xl bg-purple-900 text-white font-bold text-sm hover:bg-purple-800 transition-colors shadow-md flex items-center justify-center space-x-2"
              >
                <span>{t('enrollDeviceNow')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Cross-gate calculation
  const lastExitGateName = device.lastMovement?.gateName || 'Gate 1';
  const isCrossGateReturn =
    device.status === 'OUTSIDE_CAMPUS' &&
    device.lastMovement?.gateId &&
    device.lastMovement.gateId !== currentGate.id;

  const isLost = device.status === 'LOST';
  const isInside = device.status === 'INSIDE_CAMPUS';
  const isOutside = device.status === 'OUTSIDE_CAMPUS';

  const handleCheckOut = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const res = campusStore.checkOutDevice({
        deviceId: device.id,
        gateId: currentGate.id,
        officerBadge: activeOfficer.officerBadgeId,
        officerName: activeOfficer.name,
        verifiedMethod: 'QR_SCAN'
      });
      setIsProcessing(false);
      if (res.success) {
        showToast(
          language === 'am'
            ? `መሳሪያው (${device.assetId}) በ ${currentGate.nameAmharic} በኩል ከግቢ ወጥቷል።`
            : `Device ${device.assetId} successfully checked out via ${currentGate.name}.`,
          'success'
        );
        onClose();
      } else {
        showToast(res.message, 'error');
      }
    }, 400);
  };

  const handleCheckIn = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const res = campusStore.checkInDevice({
        deviceId: device.id,
        gateId: currentGate.id,
        officerBadge: activeOfficer.officerBadgeId,
        officerName: activeOfficer.name,
        verifiedMethod: 'QR_SCAN'
      });
      setIsProcessing(false);
      if (res.success) {
        showToast(
          language === 'am'
            ? `መሳሪያው (${device.assetId}) ወደ ግቢ ገብቷል። የቀድሞ መውጫ: ${lastExitGateName}`
            : `Device ${device.assetId} checked in at ${currentGate.name}. (Prior exit: ${lastExitGateName})`,
          'success'
        );
        onClose();
      } else {
        showToast(res.message, 'error');
      }
    }, 400);
  };

  const handleLogIncident = () => {
    campusStore.createIncident({
      type: incidentReason as any,
      title: `Gate Security Incident: ${device.brand} ${device.model} (${device.assetId})`,
      description: incidentNotes || `Suspicious transaction or flag encountered at ${currentGate.name}.`,
      gateId: currentGate.id,
      gateName: currentGate.name,
      officerBadge: activeOfficer.officerBadgeId,
      deviceAssetId: device.assetId,
      deviceSerial: device.serialNumber,
      studentId: device.ownerStudentId,
      studentName: device.ownerName,
      severity: 'HIGH'
    });
    showToast('Incident logged into central security registry. Admin alerted.', 'warning');
    setShowIncidentForm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-purple-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
        
        {/* Dynamic Header according to status */}
        <div
          className={`p-5 text-white flex items-center justify-between ${
            isLost
              ? 'bg-rose-900 border-b border-rose-800'
              : isOwnerMismatch
              ? 'bg-amber-700 border-b border-amber-800'
              : 'bg-purple-950 border-b border-purple-900'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isLost ? 'bg-rose-800 text-rose-100' : 'bg-purple-800 text-purple-100'
              }`}
            >
              {isLost ? <ShieldAlert className="w-6 h-6 text-rose-200" /> : <Shield className="w-6 h-6 text-purple-300" />}
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-tight">
                {isLost
                  ? t('lostDeviceAlert')
                  : isOwnerMismatch
                  ? t('ownerMismatchAlert')
                  : t('deviceFound')}
              </h3>
              <p className="text-xs text-purple-200 font-mono">
                {device.assetId} • {device.brand} {device.model}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* CASE 1: LOST DEVICE WARNING BANNER */}
          {isLost && (
            <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-xl text-rose-950 space-y-2 animate-pulse">
              <div className="flex items-center space-x-2 font-bold text-sm text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{t('lostDeviceAlert')}</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed font-medium">
                {t('lostDeviceAlertDesc')}
              </p>
              <div className="text-xs bg-rose-100/80 p-2.5 rounded-lg border border-rose-300 font-mono text-rose-900">
                <div>Reported: {device.lostReportDetails?.reportedAt || 'Recent'}</div>
                <div>Reported By: {device.ownerName} ({device.ownerStudentId})</div>
                <div>Last Known Gate: {device.lostReportDetails?.lastKnownGate || 'Unknown'}</div>
              </div>
            </div>
          )}

          {/* CASE 2: OWNER MISMATCH WARNING */}
          {isOwnerMismatch && (
            <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl text-amber-950 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-sm text-amber-900">
                <FileWarning className="w-5 h-5 text-amber-700 shrink-0" />
                <span>{t('ownerMismatchAlert')}</span>
              </div>
              <p className="text-xs text-amber-800">
                {t('ownerMismatchDesc')}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs bg-amber-100/70 p-2.5 rounded-lg border border-amber-300">
                <div>
                  <span className="text-amber-800 block text-[10px] uppercase font-bold">Student Presenting:</span>
                  <span className="font-semibold text-amber-950">
                    {presentedStudent ? presentedStudent.name : 'Unknown Bearer'}
                  </span>
                </div>
                <div>
                  <span className="text-amber-800 block text-[10px] uppercase font-bold">Registered Legal Owner:</span>
                  <span className="font-semibold text-amber-950">{device.ownerName}</span>
                </div>
              </div>
            </div>
          )}

          {/* CROSS-GATE HIGHLIGHT NOTIFICATION (Crucial INSA requirement) */}
          {isCrossGateReturn && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-300 rounded-xl text-indigo-950 flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-bold text-indigo-900 block mb-0.5">
                  {language === 'am' ? 'የተለያየ በር ቅብብሎሽ (Cross-Gate Return)' : 'Cross-Gate Return Movement'}
                </span>
                <span>
                  {t('crossGateReturnNote', {
                    prevGate: lastExitGateName,
                    time: device.lastMovement?.timestamp || 'recently',
                    currGate: currentGate.name
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Physical Device Specification Sheet */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
              <div>
                <span className="text-slate-500 block uppercase font-medium text-[10px]">{t('registeredOwner')}</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-700" />
                  {device.ownerName}
                </span>
                <span className="text-[11px] font-mono text-purple-900 block">{device.ownerStudentId}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-medium text-[10px]">{t('deviceModel')}</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-purple-700" />
                  {device.brand} {device.model}
                </span>
                <span className="text-[11px] text-slate-600 block">{device.deviceType}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 block uppercase font-medium text-[10px]">{t('serialNumber')}</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300 inline-block mt-0.5">
                  {device.serialNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-medium text-[10px]">{t('assetId')}</span>
                <span className="font-mono font-bold text-purple-950 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block mt-0.5">
                  {device.assetId}
                </span>
              </div>
            </div>

            {/* Current Status Badge */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">{t('currentStatus')}</span>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold mt-0.5 ${
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
                  {device.status.replace('_', ' ')}
                </span>
              </div>

              {/* Station Context */}
              <div className="text-right">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">
                  {language === 'am' ? 'የፍተሻ ኬላ / ኦፊሰር' : 'Inspection Station'}
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  {currentGate.name} ({activeOfficer.officerBadgeId})
                </span>
              </div>
            </div>

            {device.lastMovement && (
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('lastMovement')}: {device.lastMovement.type} at {device.lastMovement.gateName}</span>
                </span>
                <span className="font-mono">{device.lastMovement.timestamp}</span>
              </div>
            )}
          </div>

          {/* Security Incident Drawer (when needed) */}
          {showIncidentForm ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
              <div className="font-bold text-xs text-rose-950 flex items-center justify-between">
                <span>{t('createIncident')}</span>
                <button
                  onClick={() => setShowIncidentForm(false)}
                  className="text-xs text-rose-700 hover:underline"
                >
                  {t('cancel')}
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <label className="block text-slate-700 font-medium">Incident Category:</label>
                <select
                  value={incidentReason}
                  onChange={(e) => setIncidentReason(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                >
                  <option value="LOST_DEVICE">Device Reported Lost Flagged</option>
                  <option value="DEVICE_MISMATCH">Owner or Serial Mismatch</option>
                  <option value="UNAUTHORIZED_EXIT">Unauthorized Exit Attempt</option>
                  <option value="UNKNOWN_DEVICE">Tampered Serial Sticker</option>
                </select>
                <label className="block text-slate-700 font-medium">Officer Notes / Observations:</label>
                <textarea
                  value={incidentNotes}
                  onChange={(e) => setIncidentNotes(e.target.value)}
                  placeholder="Record student statement, ID discrepancies, or supervisor instructions..."
                  rows={2}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-purple-600"
                />
                <button
                  onClick={handleLogIncident}
                  className="w-full py-2 bg-rose-800 text-white rounded-lg font-bold text-xs hover:bg-rose-700 transition-colors"
                >
                  Submit Incident to Central Security Registry
                </button>
              </div>
            </div>
          ) : null}

          {/* Action Buttons based on Rules */}
          <div className="pt-2 space-y-2.5">
            {isLost ? (
              <div className="space-y-2">
                <button
                  onClick={() => setShowIncidentForm(true)}
                  className="w-full py-3.5 px-4 rounded-xl bg-rose-800 hover:bg-rose-700 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg transition-colors"
                >
                  <AlertTriangle className="w-5 h-5 text-rose-200" />
                  <span>{t('createIncident')}</span>
                </button>
                <p className="text-center text-[11px] text-slate-500">
                  {language === 'am'
                    ? 'መሳሪያው የጠፋ በመሆኑ ማስተላለፍ አይፈቀድም። ኦፊሰሩ የደህንነት ሃላፊውን ማሳወቅ አለበት።'
                    : 'Rule 10: Device is marked LOST. Clearance from Security Administration is mandatory before release.'}
                </p>
              </div>
            ) : isInside ? (
              /* Device is INSIDE -> Ready for CHECK OUT */
              <div className="space-y-2">
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center justify-between">
                  <span>{t('readyForCheckOut')}</span>
                  <span className="font-bold">{currentGate.name}</span>
                </div>
                <button
                  onClick={handleCheckOut}
                  disabled={isProcessing}
                  className="w-full py-3.5 px-4 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-extrabold text-sm flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span>Recording Check-Out...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>{t('verifyAndCheckOut')}</span>
                    </>
                  )}
                </button>
              </div>
            ) : isOutside ? (
              /* Device is OUTSIDE -> Ready for CHECK IN */
              <div className="space-y-2">
                <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-200 text-xs text-indigo-900 font-medium flex items-center justify-between">
                  <span>{t('readyForCheckIn')}</span>
                  <span className="font-bold">{currentGate.name}</span>
                </div>
                <button
                  onClick={handleCheckIn}
                  disabled={isProcessing}
                  className="w-full py-3.5 px-4 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-extrabold text-sm flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span>Verifying and Checking In...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>{t('verifyAndCheckIn')}</span>
                    </>
                  )}
                </button>
              </div>
            ) : null}

            {/* Incident Trigger option for Officer */}
            {!isLost && !showIncidentForm && (
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setShowIncidentForm(true)}
                  className="text-xs text-rose-700 hover:text-rose-900 font-semibold hover:underline flex items-center gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{t('createIncident')}</span>
                </button>
                <button
                  onClick={onClose}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium px-3 py-1 rounded hover:bg-slate-100"
                >
                  {t('close')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
