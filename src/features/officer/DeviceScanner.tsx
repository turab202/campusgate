import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, QrCode, Search, AlertTriangle, CheckCircle2,
  User, Hash, Laptop, ShieldAlert, Loader2
} from 'lucide-react';
import { Device } from '../../types';
import { useApp } from '../../context/AppContext';
import { listDevicesApi, DeviceRead } from '../../services/deviceService';
import { ApiError } from '../../services/api';
import { DeviceVerificationModal } from './DeviceVerificationModal';

interface DeviceScannerProps {
  onNavigateToEnroll: (serial?: string) => void;
}

/** Map a backend DeviceRead to the frontend Device shape expected by DeviceVerificationModal. */
function toFrontendDevice(d: DeviceRead): Device {
  return {
    id: d.id,
    assetId: d.asset_id,
    serialNumber: d.serial_number,
    brand: d.brand ?? '',
    model: d.model ?? '',
    deviceType: d.device_type as Device['deviceType'],
    ownerId: d.owner_id,
    ownerName: '',          // not returned by list endpoint — shown as blank
    ownerStudentId: '',     // not returned by list endpoint
    ownerDepartment: '',
    status: d.status as Device['status'],
    enrollmentDate: d.registered_at,
    enrolledByOfficerBadge: '',
    enrolledAtGateId: '',
    qrPayload: d.qr_code_value,
  };
}

export const DeviceScanner: React.FC<DeviceScannerProps> = ({ onNavigateToEnroll }) => {
  const { t, language, currentGate, activeOfficer, isOffline, showToast } = useApp();

  const [scanTab, setScanTab] = useState<'CAMERA' | 'SERIAL' | 'STUDENT'>('CAMERA');
  const [serialQuery, setSerialQuery] = useState('');
  const [studentIdQuery, setStudentIdQuery] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUnknownDevice, setIsUnknownDevice] = useState(false);
  const [searchedTerm, setSearchedTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (scanTab === 'CAMERA' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(() => {/* camera unavailable — graceful fallback */});
    }
    return () => { if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, [scanTab]);

  const searchDevice = async (query: string) => {
    if (!query.trim()) return;

    if (isOffline) {
      showToast(
        language === 'am'
          ? 'ማስጠንቀቂያ: ኔትወርክ ተቋርጧል። የቀጥታ ማረጋገጫ ውስን ነው።'
          : 'Warning: Running in LIMITED CONNECTION mode. Live sync is restricted.',
        'warning'
      );
    }

    setIsScanning(false);
    setScanSuccess(true);
    setSearchedTerm(query.trim());
    setSearchError(null);
    setIsSearching(true);

    setTimeout(() => setScanSuccess(false), 600);

    try {
      // Try serial first, then asset_id
      let results = await listDevicesApi({ serial: query.trim() });
      if (results.length === 0) {
        results = await listDevicesApi({ asset_id: query.trim() });
      }

      if (results.length > 0) {
        setIsUnknownDevice(false);
        setSelectedDevice(toFrontendDevice(results[0]));
      } else {
        setSelectedDevice(null);
        setIsUnknownDevice(true);
      }
      setIsModalOpen(true);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Search failed. Please try again.';
      setSearchError(message);
      showToast(message, 'error');
    } finally {
      setIsSearching(false);
      setIsScanning(true);
    }
  };

  const handleSerialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialQuery.trim()) return;
    searchDevice(serialQuery.trim().toUpperCase());
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdQuery.trim()) return;
    // Student ID search: use the user search to find devices by owner
    // The backend /devices supports owner_id (UUID), not campus_id directly.
    // We search by serial/asset_id as a fallback — show "not found" if no match.
    searchDevice(studentIdQuery.trim().toUpperCase());
  };

  const scanTabs = [
    { id: 'CAMERA' as const, label: t('scanDevice'), icon: Camera },
    { id: 'SERIAL' as const, label: t('orEnterSerial'), icon: Hash },
    { id: 'STUDENT' as const, label: t('orSearchStudent'), icon: User },
  ];

  return (
    <div className="space-y-5">
      {/* Gate info card */}
      <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-primary)] p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
                {language === 'am' ? 'የቀጥታ ፍተሻ ኬላ' : 'Active Gate Inspection Terminal'}
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-white">
              {language === 'am' ? currentGate.nameAmharic : currentGate.name}
            </h2>
            <p className="text-xs text-white/60 mt-0.5">{currentGate.locationDescription}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-right">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-white/60">{t('currentShift')}</span>
              <span className="text-xs font-semibold text-white">08:00 — 16:00</span>
            </div>
            <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-right">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-white/60">{t('assignedOfficer')}</span>
              <span className="text-xs font-semibold text-white font-mono">
                {activeOfficer.officerBadgeId}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-white/20 pt-4">
          {[
            { label: t('checkIns'), value: currentGate.todayStats.checkIns, color: 'text-green-300' },
            { label: t('checkOuts'), value: currentGate.todayStats.checkOuts, color: 'text-white' },
            { label: t('activeVisitors'), value: currentGate.todayStats.visitors, color: 'text-amber-300' },
            { label: t('openIncidents'), value: currentGate.todayStats.incidents, color: 'text-red-300' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between rounded-lg border border-white/20 bg-white/10 px-3 py-2">
              <span className="text-xs text-white/70">{label}</span>
              <span className={`font-mono text-lg font-semibold ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scanner panel */}
      <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-soft)] p-5 space-y-5">
        {/* Mode tabs */}
        <div className="flex border-b border-[var(--cg-border)]">
          {scanTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setScanTab(id)}
              className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors ${
                scanTab === id
                  ? 'border-[var(--cg-primary)] text-[var(--cg-primary)] bg-[var(--cg-surface-muted)]'
                  : 'border-transparent text-[var(--cg-text-muted)] hover:text-[var(--cg-text)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Camera tab */}
        {scanTab === 'CAMERA' && (
          <div className="space-y-4">
            <div className="relative mx-auto h-72 w-full max-w-md overflow-hidden rounded-xl border-2 border-[var(--cg-primary)] bg-slate-950 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 h-full w-full object-cover opacity-60"
              />
              {isScanning && (
                <div className="absolute inset-x-8 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-[var(--cg-primary)] to-transparent animate-pulse pointer-events-none -translate-y-8" />
              )}
              <div className="relative z-10 h-52 w-52 border-2 border-white/40 rounded-xl flex flex-col justify-between p-3 pointer-events-none">
                <div className="flex justify-between">
                  <div className="h-5 w-5 border-t-4 border-l-4 border-white rounded-tl-sm" />
                  <div className="h-5 w-5 border-t-4 border-r-4 border-white rounded-tr-sm" />
                </div>
                <div className="text-center">
                  <span className="rounded border border-white/30 bg-black/60 px-2 py-0.5 text-[10px] font-mono text-white/80">
                    SCANNER READY · {currentGate.code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <div className="h-5 w-5 border-b-4 border-l-4 border-white rounded-bl-sm" />
                  <div className="h-5 w-5 border-b-4 border-r-4 border-white rounded-br-sm" />
                </div>
              </div>
              {scanSuccess && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-500/30 z-20">
                  <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-lg">
                    <CheckCircle2 className="h-5 w-5 text-[var(--cg-success)]" />
                    <span className="font-semibold text-sm text-[var(--cg-text)]">QR Decoded</span>
                  </div>
                </div>
              )}
            </div>
            <p className="text-center text-xs text-[var(--cg-text-muted)]">{t('pointCameraAtQr')}</p>
          </div>
        )}

        {/* Serial tab */}
        {scanTab === 'SERIAL' && (
          <form onSubmit={handleSerialSubmit} className="mx-auto max-w-md space-y-4 py-4">
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">
                {t('serialNumber')} / Asset ID
              </label>
              <input
                type="text"
                value={serialQuery}
                onChange={(e) => setSerialQuery(e.target.value.toUpperCase())}
                placeholder={t('enterSerialPlaceholder')}
                className="h-12 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3.5 font-mono text-sm font-semibold text-[var(--cg-text)] focus:border-[var(--cg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cg-primary)]/10"
              />
            </div>
            {searchError && (
              <p className="text-xs text-[var(--cg-danger)]">{searchError}</p>
            )}
            <button
              type="submit"
              disabled={isSearching}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--cg-primary)] py-3 text-sm font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors disabled:opacity-60"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {isSearching ? 'Searching…' : t('searchButton')}
            </button>
          </form>
        )}

        {/* Student ID tab */}
        {scanTab === 'STUDENT' && (
          <form onSubmit={handleStudentSubmit} className="mx-auto max-w-md space-y-4 py-4">
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">
                {t('studentId')}
              </label>
              <input
                type="text"
                value={studentIdQuery}
                onChange={(e) => setStudentIdQuery(e.target.value.toUpperCase())}
                placeholder={t('enterStudentPlaceholder')}
                className="h-12 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3.5 font-mono text-sm font-semibold text-[var(--cg-text)] focus:border-[var(--cg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cg-primary)]/10"
              />
            </div>
            {searchError && (
              <p className="text-xs text-[var(--cg-danger)]">{searchError}</p>
            )}
            <button
              type="submit"
              disabled={isSearching}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--cg-primary)] py-3 text-sm font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors disabled:opacity-60"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {isSearching ? 'Searching…' : language === 'am' ? 'የተማሪውን መሳሪያዎች ፈልግ' : 'Search Student Devices'}
            </button>
          </form>
        )}

        {/* Quick test scenarios — serial numbers from real seeded data */}
        <div className="border-t border-[var(--cg-border)] pt-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">
            Quick Search Examples
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { serial: 'PF123456', label: 'Lenovo ThinkPad T14', sub: 'Search by serial', color: 'border-[var(--cg-border)]', icon: Laptop },
              { serial: 'C02K901XYZ', label: 'MacBook Pro', sub: 'Search by serial', color: 'border-[var(--cg-info)]', icon: CheckCircle2 },
              { serial: '8J2M144K90', label: 'Dell XPS 13', sub: 'Search by serial', color: 'border-[var(--cg-danger)]', icon: ShieldAlert },
              { serial: 'NEW-DEVICE-001', label: 'Unknown Device', sub: 'Triggers enroll flow', color: 'border-[var(--cg-warning)]', icon: AlertTriangle },
              { serial: '5CD9280J9X', label: 'HP EliteBook 840', sub: 'Search by serial', color: 'border-[var(--cg-border)]', icon: User },
              { serial: 'EP-88210-LAB', label: 'Epson Projector', sub: 'University equipment', color: 'border-[var(--cg-border)]', icon: QrCode },
            ].map(({ serial, label, sub, color, icon: Icon }) => (
              <button
                key={serial}
                onClick={() => searchDevice(serial)}
                disabled={isSearching}
                className={`flex items-center gap-2.5 rounded-lg border ${color} bg-[var(--cg-surface)] p-2.5 text-left text-xs transition-colors hover:bg-[var(--cg-surface-muted)] disabled:opacity-50`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--cg-surface-muted)]">
                  <Icon className="h-4 w-4 text-[var(--cg-text-muted)]" />
                </div>
                <div className="min-w-0">
                  <span className="block font-semibold text-[var(--cg-text)] truncate">{label}</span>
                  <span className="block text-[10px] text-[var(--cg-text-muted)] truncate">{sub}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <DeviceVerificationModal
        device={selectedDevice}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onEnrollNew={(serial) => { setIsModalOpen(false); onNavigateToEnroll(serial); }}
        isUnknown={isUnknownDevice}
        searchedTerm={searchedTerm}
        isOwnerMismatch={false}
        presentedStudent={null}
      />
    </div>
  );
};
