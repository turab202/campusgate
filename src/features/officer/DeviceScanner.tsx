import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  QrCode,
  Search,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  User,
  Hash,
  Laptop,
  ArrowRight,
  ShieldAlert,
  Flame,
  CameraOff
} from 'lucide-react';
import { Device, Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { campusStore } from '../../services/storage';
import { DeviceVerificationModal } from './DeviceVerificationModal';

interface DeviceScannerProps {
  onNavigateToEnroll: (serial?: string) => void;
}

export const DeviceScanner: React.FC<DeviceScannerProps> = ({ onNavigateToEnroll }) => {
  const { t, language, currentGate, activeOfficer, isOffline, showToast, activeDemoAction } = useApp();

  const [activeTab, setActiveTab] = useState<'CAMERA' | 'SERIAL' | 'STUDENT'>('CAMERA');
  const [serialQuery, setSerialQuery] = useState('');
  const [studentIdQuery, setStudentIdQuery] = useState('');

  // Scanner states
  const [isScanning, setIsScanning] = useState(true);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'GRANTED' | 'PROMPT' | 'DENIED'>('GRANTED');

  // Verification modal state
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUnknownDevice, setIsUnknownDevice] = useState(false);
  const [searchedTerm, setSearchedTerm] = useState('');
  const [isOwnerMismatch, setIsOwnerMismatch] = useState(false);
  const [presentedStudent, setPresentedStudent] = useState<Student | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize camera attempt
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (activeTab === 'CAMERA' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
          setCameraPermission('GRANTED');
        })
        .catch(() => {
          // Camera not available in preview environment - graceful fallback to optical simulator
          setCameraPermission('PROMPT');
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeTab]);

  // Handle Scan result
  const triggerScanResult = (identifier: string, isMismatch = false, customStudentId?: string) => {
    if (isOffline) {
      showToast(
        language === 'am'
          ? 'ማስጠንቀቂያ: ኔትወርክ ተቋርጧል (ከመስመር ውጭ ሞድ)። የቀጥታ ማረጋገጫ ውስን ነው።'
          : 'Warning: Running in LIMITED CONNECTION mode. Live central database sync is restricted.',
        'warning'
      );
    }

    setIsScanning(false);
    setScanSuccess(true);
    setSearchedTerm(identifier);

    setTimeout(() => {
      setScanSuccess(false);
      setIsScanning(true);

      // Search device by asset ID or serial
      const dev =
        campusStore.getDeviceByAssetId(identifier) ||
        campusStore.getDeviceBySerial(identifier) ||
        campusStore.searchDevice(identifier);

      if (dev) {
        setIsUnknownDevice(false);
        setSelectedDevice(dev);

        if (isMismatch) {
          setIsOwnerMismatch(true);
          const stud = campusStore.getStudents().find((s) => s.studentId === customStudentId) || campusStore.getStudents()[3];
          setPresentedStudent(stud);
        } else {
          setIsOwnerMismatch(false);
          setPresentedStudent(null);
        }

        setIsModalOpen(true);
      } else {
        // Unknown device
        setSelectedDevice(null);
        setIsUnknownDevice(true);
        setIsOwnerMismatch(false);
        setIsModalOpen(true);
      }
    }, 500);
  };

  const handleManualSerialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialQuery.trim()) return;
    triggerScanResult(serialQuery.trim());
  };

  const handleManualStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdQuery.trim()) return;
    const devices = campusStore.getDevices();
    const cleanStudentId = studentIdQuery.trim().toUpperCase();
    const dev = devices.find((d) => d.ownerStudentId.toUpperCase() === cleanStudentId);
    if (dev) {
      triggerScanResult(dev.assetId);
    } else {
      triggerScanResult(cleanStudentId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Station Info Card */}
      <div className="bg-purple-950 text-white rounded-2xl p-5 border border-purple-900 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                {language === 'am' ? 'የቀጥታ ፍተሻ ኬላ' : 'Active Gate Inspection Terminal'}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-white mt-1">
              {language === 'am' ? currentGate.nameAmharic : currentGate.name}
            </h2>
            <p className="text-xs text-purple-200 mt-0.5">
              {currentGate.locationDescription}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-purple-900/90 border border-purple-700 rounded-xl px-4 py-2 text-right">
              <span className="text-[10px] text-purple-300 uppercase font-bold block">
                {t('currentShift')}
              </span>
              <span className="text-xs font-bold text-white">08:00 — 16:00</span>
            </div>
            <div className="bg-purple-900/90 border border-purple-700 rounded-xl px-4 py-2 text-right">
              <span className="text-[10px] text-purple-300 uppercase font-bold block">
                {t('assignedOfficer')}
              </span>
              <span className="text-xs font-bold text-amber-300 font-mono">
                {activeOfficer.officerBadgeId} ({activeOfficer.name.split(' ')[0]})
              </span>
            </div>
          </div>
        </div>

        {/* Today's Gate Stat Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-purple-900/80 text-xs">
          <div className="bg-purple-900/50 p-2.5 rounded-xl border border-purple-800/80 flex items-center justify-between">
            <span className="text-purple-300">{t('checkIns')}</span>
            <span className="font-extrabold text-lg text-emerald-400 font-mono">
              {currentGate.todayStats.checkIns}
            </span>
          </div>
          <div className="bg-purple-900/50 p-2.5 rounded-xl border border-purple-800/80 flex items-center justify-between">
            <span className="text-purple-300">{t('checkOuts')}</span>
            <span className="font-extrabold text-lg text-purple-200 font-mono">
              {currentGate.todayStats.checkOuts}
            </span>
          </div>
          <div className="bg-purple-900/50 p-2.5 rounded-xl border border-purple-800/80 flex items-center justify-between">
            <span className="text-purple-300">{t('activeVisitors')}</span>
            <span className="font-extrabold text-lg text-amber-300 font-mono">
              {currentGate.todayStats.visitors}
            </span>
          </div>
          <div className="bg-purple-900/50 p-2.5 rounded-xl border border-purple-800/80 flex items-center justify-between">
            <span className="text-purple-300">{t('openIncidents')}</span>
            <span className="font-extrabold text-lg text-rose-400 font-mono">
              {currentGate.todayStats.incidents}
            </span>
          </div>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="bg-white rounded-2xl shadow-xl border border-purple-100 p-6 space-y-6">
        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('CAMERA')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 border-b-2 transition-all ${
              activeTab === 'CAMERA'
                ? 'border-purple-900 text-purple-950 bg-purple-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4 text-purple-800" />
            <span>{t('scanDevice')}</span>
          </button>
          <button
            onClick={() => setActiveTab('SERIAL')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 border-b-2 transition-all ${
              activeTab === 'SERIAL'
                ? 'border-purple-900 text-purple-950 bg-purple-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Hash className="w-4 h-4 text-purple-800" />
            <span>{t('orEnterSerial')}</span>
          </button>
          <button
            onClick={() => setActiveTab('STUDENT')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 border-b-2 transition-all ${
              activeTab === 'STUDENT'
                ? 'border-purple-900 text-purple-950 bg-purple-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4 text-purple-800" />
            <span>{t('orSearchStudent')}</span>
          </button>
        </div>

        {/* TAB 1: Camera Scanner Frame */}
        {activeTab === 'CAMERA' && (
          <div className="space-y-4">
            <div className="relative mx-auto w-full max-w-md h-80 bg-slate-950 rounded-2xl overflow-hidden border-4 border-purple-900/60 shadow-2xl flex items-center justify-center">
              {/* Actual Video or Optical Simulation Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />

              {/* Optical Scanning Overlays */}
              <div className="absolute inset-0 bg-radial from-transparent via-purple-950/40 to-slate-950/80 pointer-events-none" />

              {/* Laser Scanning Line */}
              {isScanning && (
                <div className="absolute inset-x-8 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_12px_#c084fc] animate-pulse pointer-events-none -translate-y-8" />
              )}

              {/* QR Optical Reticle */}
              <div className="relative z-10 w-56 h-56 border-2 border-purple-400/80 rounded-2xl flex flex-col justify-between p-3 pointer-events-none shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-sm" />
                  <div className="w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-sm" />
                </div>

                <div className="text-center">
                  <span className="bg-purple-950/80 text-purple-200 text-[10px] font-mono px-2 py-0.5 rounded border border-purple-500/50">
                    SCANNER READY • {currentGate.code}
                  </span>
                </div>

                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-sm" />
                  <div className="w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-sm" />
                </div>
              </div>

              {/* Scan Success Indicator Flash */}
              {scanSuccess && (
                <div className="absolute inset-0 bg-emerald-500/40 flex items-center justify-center z-20 animate-in fade-in">
                  <div className="bg-white text-emerald-950 p-4 rounded-2xl shadow-2xl flex items-center space-x-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <span className="font-extrabold text-sm">QR Code Decoded!</span>
                  </div>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-slate-500">
              {t('pointCameraAtQr')}
            </p>
          </div>
        )}

        {/* TAB 2: Search by Serial */}
        {activeTab === 'SERIAL' && (
          <form onSubmit={handleManualSerialSubmit} className="max-w-md mx-auto space-y-4 py-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('serialNumber')}
              </label>
              <input
                type="text"
                value={serialQuery}
                onChange={(e) => setSerialQuery(e.target.value.toUpperCase())}
                placeholder={t('enterSerialPlaceholder')}
                className="w-full px-4 py-3 bg-purple-50/50 border-2 border-purple-200 rounded-xl text-base font-mono font-bold text-purple-950 focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-purple-900 text-white font-bold text-sm hover:bg-purple-800 transition-colors shadow-md flex items-center justify-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>{t('searchButton')}</span>
            </button>
          </form>
        )}

        {/* TAB 3: Search by Student ID */}
        {activeTab === 'STUDENT' && (
          <form onSubmit={handleManualStudentSubmit} className="max-w-md mx-auto space-y-4 py-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('studentId')}
              </label>
              <input
                type="text"
                value={studentIdQuery}
                onChange={(e) => setStudentIdQuery(e.target.value.toUpperCase())}
                placeholder={t('enterStudentPlaceholder')}
                className="w-full px-4 py-3 bg-purple-50/50 border-2 border-purple-200 rounded-xl text-base font-mono font-bold text-purple-950 focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-purple-900 text-white font-bold text-sm hover:bg-purple-800 transition-colors shadow-md flex items-center justify-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>{language === 'am' ? 'የተማሪውን መሳሪያዎች ፈልግ' : 'Search Student Devices'}</span>
            </button>
          </form>
        )}

        {/* FAST DEMO TEST ACTIONS (Essential for instant verification of all lifecycle states) */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Instant Test Scenarios (1-Click Simulators):</span>
            </span>
            <span className="text-[10px] text-slate-400">Simulates direct barcode & QR scanner input</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {/* Scenario 1: Standard registered laptop */}
            <button
              onClick={() => triggerScanResult('PF123456')}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-purple-600 hover:bg-purple-50/50 text-left text-xs transition-all flex items-center space-x-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-900 flex items-center justify-center shrink-0">
                <Laptop className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-800 block truncate group-hover:text-purple-950">
                  Lenovo ThinkPad T14
                </span>
                <span className="text-[10px] font-mono text-slate-500">PF123456 (Zahra M.)</span>
              </div>
            </button>

            {/* Scenario 2: Outside laptop (Cross-Gate Return Test) */}
            <button
              onClick={() => triggerScanResult('C02K901XYZ')}
              className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:border-indigo-600 text-left text-xs transition-all flex items-center space-x-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-900 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-indigo-700" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-indigo-950 block truncate">
                  MacBook Pro (Check In)
                </span>
                <span className="text-[10px] text-indigo-700 block">Exited Gate 1 → Returns here</span>
              </div>
            </button>

            {/* Scenario 3: Lost Device Warning */}
            <button
              onClick={() => triggerScanResult('8J2M144K90')}
              className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/40 hover:border-rose-600 text-left text-xs transition-all flex items-center space-x-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-900 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-rose-950 block truncate">
                  Dell XPS 13 (LOST FLAG)
                </span>
                <span className="text-[10px] text-rose-700 block">Reported Lost on Registry</span>
              </div>
            </button>

            {/* Scenario 4: Unknown Device -> Enroll Trigger */}
            <button
              onClick={() => triggerScanResult('NEW-ASUS-9988X')}
              className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:border-amber-600 text-left text-xs transition-all flex items-center space-x-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-amber-950 block truncate">
                  Unknown Serial Number
                </span>
                <span className="text-[10px] text-amber-700 block">Tests "Enroll Device" flow</span>
              </div>
            </button>

            {/* Scenario 5: Owner Mismatch */}
            <button
              onClick={() => triggerScanResult('5CD9280J9X', true, 'ASTU-2024-01234')}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-purple-600 text-left text-xs transition-all flex items-center space-x-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-purple-800" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-800 block truncate">
                  Owner Mismatch Test
                </span>
                <span className="text-[10px] text-slate-500 block">Bearer ≠ Registered Owner</span>
              </div>
            </button>

            {/* Scenario 6: Enrolled Projector */}
            <button
              onClick={() => triggerScanResult('EP-88210-LAB')}
              className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/30 hover:border-purple-600 text-left text-xs transition-all flex items-center space-x-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-900 flex items-center justify-center shrink-0">
                <QrCode className="w-4 h-4 text-purple-800" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-purple-950 block truncate">
                  Epson Lab Projector
                </span>
                <span className="text-[10px] text-purple-700 block">University Equipment Exit</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Verification Modal for Scan Results */}
      <DeviceVerificationModal
        device={selectedDevice}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onEnrollNew={(serial) => {
          setIsModalOpen(false);
          onNavigateToEnroll(serial);
        }}
        isUnknown={isUnknownDevice}
        searchedTerm={searchedTerm}
        isOwnerMismatch={isOwnerMismatch}
        presentedStudent={presentedStudent}
      />
    </div>
  );
};
