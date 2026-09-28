import React, { useState } from 'react';
import {
  AlertTriangle, ArrowRight, CheckCircle2, Clock,
  Laptop, MapPin, ShieldAlert, User, X, FileWarning
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
  device, isOpen, onClose, onEnrollNew,
  isUnknown = false, searchedTerm = '',
  isOwnerMismatch = false, presentedStudent = null
}) => {
  const { t, language, currentGate, activeOfficer, showToast } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentReason, setIncidentReason] = useState('DEVICE_MISMATCH');
  const [incidentNotes, setIncidentNotes] = useState('');

  if (!isOpen) return null;

  // Unknown device state
  if (isUnknown || !device) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
        <div className="w-full max-w-md rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-card)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--cg-border)] bg-amber-50 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 text-[var(--cg-warning)]" />
              <h3 className="font-semibold text-[var(--cg-text)]">{t('deviceNotFound')}</h3>
            </div>
            <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)]">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              {searchedTerm && (
                <p className="text-sm font-semibold text-amber-900 mb-1">Searched: &quot;{searchedTerm}&quot;</p>
              )}
              <p className="text-xs text-amber-800 leading-relaxed">{t('deviceNotFoundDesc')}</p>
            </div>
            <button
              onClick={() => { onClose(); if (onEnrollNew) onEnrollNew(searchedTerm); }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--cg-primary)] py-3 text-sm font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors"
            >
              {t('enrollDeviceNow')}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-[var(--cg-border)] py-2.5 text-sm font-medium text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLost = device.status === 'LOST';
  const isInside = device.status === 'INSIDE_CAMPUS';
  const isOutside = device.status === 'OUTSIDE_CAMPUS';
  const lastExitGateName = device.lastMovement?.gateName || 'Gate 1';
  const isCrossGateReturn =
    isOutside &&
    device.lastMovement?.gateId &&
    device.lastMovement.gateId !== currentGate.id;

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
        showToast(`Device ${device.assetId} checked out via ${currentGate.name}.`, 'success');
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
        showToast(res.message, 'success');
        onClose();
      } else {
        showToast(res.message, 'error');
      }
    }, 400);
  };

  const handleLogIncident = () => {
    campusStore.createIncident({
      type: incidentReason as Parameters<typeof campusStore.createIncident>[0]['type'],
      title: `Gate Security Incident: ${device.brand} ${device.model} (${device.assetId})`,
      description: incidentNotes || `Suspicious transaction at ${currentGate.name}.`,
      gateId: currentGate.id,
      gateName: currentGate.name,
      officerBadge: activeOfficer.officerBadgeId,
      deviceAssetId: device.assetId,
      deviceSerial: device.serialNumber,
      studentId: device.ownerStudentId,
      studentName: device.ownerName,
      severity: 'HIGH'
    });
    showToast('Incident logged into central security registry.', 'warning');
    setShowIncidentForm(false);
    onClose();
  };

  const headerBg = isLost
    ? 'bg-[var(--cg-danger)]'
    : isOwnerMismatch
    ? 'bg-[var(--cg-warning)]'
    : 'bg-[var(--cg-primary)]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-xl rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-card)] overflow-hidden">

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 text-white ${headerBg}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              {isLost ? <ShieldAlert className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">
                {isLost ? t('lostDeviceAlert') : isOwnerMismatch ? t('ownerMismatchAlert') : t('deviceFound')}
              </h3>
              <p className="text-[11px] text-white/70 font-mono">{device.assetId} · {device.brand} {device.model}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-white/70 hover:bg-white/15 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Lost device warning */}
          {isLost && (
            <div className="rounded-lg border-2 border-[var(--cg-danger)] bg-red-50 p-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-[var(--cg-danger)]">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                {t('lostDeviceAlert')}
              </div>
              <p className="text-xs text-red-800 leading-relaxed">{t('lostDeviceAlertDesc')}</p>
              <div className="rounded-lg border border-red-200 bg-red-100 p-2.5 text-xs font-mono text-red-900 space-y-0.5">
                <div>Reported: {device.lostReportDetails?.reportedAt || 'Recent'}</div>
                <div>By: {device.ownerName} ({device.ownerStudentId})</div>
                <div>Last known gate: {device.lostReportDetails?.lastKnownGate || 'Unknown'}</div>
              </div>
            </div>
          )}

          {/* Owner mismatch warning */}
          {isOwnerMismatch && (
            <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-amber-900">
                <FileWarning className="h-5 w-5 shrink-0" />
                {t('ownerMismatchAlert')}
              </div>
              <p className="text-xs text-amber-800">{t('ownerMismatchDesc')}</p>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-amber-200 bg-amber-100 p-2.5 text-xs">
                <div>
                  <span className="block text-[10px] font-semibold uppercase text-amber-700">Presenting Student</span>
                  <span className="font-semibold text-amber-950">{presentedStudent?.name || 'Unknown'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase text-amber-700">Registered Owner</span>
                  <span className="font-semibold text-amber-950">{device.ownerName}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cross-gate note */}
          {isCrossGateReturn && (
            <div className="flex items-start gap-3 rounded-lg border border-[var(--cg-info)] bg-sky-50 p-3.5">
              <MapPin className="h-4 w-4 text-[var(--cg-info)] shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-sky-900">
                <span className="block font-semibold mb-0.5">
                  {language === 'am' ? 'የተለያየ በር ቅብብሎሽ' : 'Cross-Gate Return Movement'}
                </span>
                {t('crossGateReturnNote', {
                  prevGate: lastExitGateName,
                  time: device.lastMovement?.timestamp || 'recently',
                  currGate: currentGate.name
                })}
              </div>
            </div>
          )}

          {/* Device spec sheet */}
          <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-4 text-xs space-y-3">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[var(--cg-border)]">
              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">{t('registeredOwner')}</span>
                <span className="mt-0.5 flex items-center gap-1.5 font-semibold text-sm text-[var(--cg-text)]">
                  <User className="h-3.5 w-3.5 text-[var(--cg-primary)]" />
                  {device.ownerName}
                </span>
                <span className="block font-mono text-[11px] text-[var(--cg-primary)]">{device.ownerStudentId}</span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">{t('deviceModel')}</span>
                <span className="mt-0.5 flex items-center gap-1.5 font-semibold text-sm text-[var(--cg-text)]">
                  <Laptop className="h-3.5 w-3.5 text-[var(--cg-primary)]" />
                  {device.brand} {device.model}
                </span>
                <span className="block text-[11px] text-[var(--cg-text-muted)]">{device.deviceType}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">{t('serialNumber')}</span>
                <span className="mt-0.5 inline-block rounded border border-[var(--cg-border)] bg-[var(--cg-surface)] px-2 py-0.5 font-mono font-semibold text-[var(--cg-text)]">
                  {device.serialNumber}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">{t('assetId')}</span>
                <span className="mt-0.5 inline-block rounded border border-[var(--cg-border)] bg-[var(--cg-surface)] px-2 py-0.5 font-mono font-semibold text-[var(--cg-primary)]">
                  {device.assetId}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--cg-border)] pt-2">
              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">{t('currentStatus')}</span>
                <span className={`mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  isInside ? 'bg-emerald-50 text-[var(--cg-success)] border border-emerald-200'
                  : isLost ? 'bg-red-50 text-[var(--cg-danger)] border border-red-200'
                  : 'bg-sky-50 text-[var(--cg-info)] border border-sky-200'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isInside ? 'bg-[var(--cg-success)]' : isLost ? 'bg-[var(--cg-danger)]' : 'bg-[var(--cg-info)]'}`} />
                  {device.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">Inspection Station</span>
                <span className="text-xs font-semibold text-[var(--cg-text)]">{currentGate.name} ({activeOfficer.officerBadgeId})</span>
              </div>
            </div>

            {device.lastMovement && (
              <div className="flex items-center justify-between rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] p-2.5 text-[11px] text-[var(--cg-text-muted)]">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {t('lastMovement')}: {device.lastMovement.type} at {device.lastMovement.gateName}
                </span>
                <span className="font-mono">{device.lastMovement.timestamp}</span>
              </div>
            )}
          </div>

          {/* Incident form */}
          {showIncidentForm && (
            <div className="rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--cg-text)]">{t('createIncident')}</span>
                <button onClick={() => setShowIncidentForm(false)} className="text-xs text-[var(--cg-text-muted)] hover:text-[var(--cg-text)]">{t('cancel')}</button>
              </div>
              <select
                value={incidentReason}
                onChange={(e) => setIncidentReason(e.target.value)}
                className="w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 py-2 text-xs text-[var(--cg-text)]"
              >
                <option value="LOST_DEVICE">Device Reported Lost</option>
                <option value="DEVICE_MISMATCH">Owner / Serial Mismatch</option>
                <option value="UNAUTHORIZED_EXIT">Unauthorized Exit Attempt</option>
                <option value="UNKNOWN_DEVICE">Tampered Serial</option>
              </select>
              <textarea
                value={incidentNotes}
                onChange={(e) => setIncidentNotes(e.target.value)}
                placeholder="Officer observations and notes..."
                rows={2}
                className="w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 py-2 text-xs text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]"
              />
              <button
                onClick={handleLogIncident}
                className="w-full rounded-lg bg-[var(--cg-danger)] py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Submit Incident to Security Registry
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2.5">
            {isLost ? (
              <div className="space-y-2">
                <button
                  onClick={() => setShowIncidentForm(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--cg-danger)] py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {t('createIncident')}
                </button>
                <p className="text-center text-[11px] text-[var(--cg-text-muted)]">
                  {language === 'am'
                    ? 'መሳሪያው የጠፋ ነው። ያለ ፈቃድ ማስተላለፍ አይፈቀድም።'
                    : 'Device is LOST. Clearance from Security Administration required before release.'}
                </p>
              </div>
            ) : isInside ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 py-2 text-xs">
                  <span className="font-medium text-[var(--cg-text)]">{t('readyForCheckOut')}</span>
                  <span className="font-semibold text-[var(--cg-text)]">{currentGate.name}</span>
                </div>
                <button
                  onClick={handleCheckOut}
                  disabled={isProcessing}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--cg-primary)] py-3.5 text-sm font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isProcessing ? 'Recording…' : t('verifyAndCheckOut')}
                </button>
              </div>
            ) : isOutside ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 py-2 text-xs">
                  <span className="font-medium text-[var(--cg-text)]">{t('readyForCheckIn')}</span>
                  <span className="font-semibold text-[var(--cg-text)]">{currentGate.name}</span>
                </div>
                <button
                  onClick={handleCheckIn}
                  disabled={isProcessing}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--cg-primary)] py-3.5 text-sm font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isProcessing ? 'Verifying…' : t('verifyAndCheckIn')}
                </button>
              </div>
            ) : null}

            {!isLost && !showIncidentForm && (
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setShowIncidentForm(true)}
                  className="flex items-center gap-1 text-xs font-medium text-[var(--cg-danger)] hover:underline"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('createIncident')}
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] transition-colors"
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
