import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Laptop,
  QrCode,
  Shield,
  ArrowRight,
  ArrowLeft,
  User,
  AlertCircle,
  Sparkles,
  Building,
  RotateCcw
} from 'lucide-react';
import { Device, DeviceType, Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { campusStore } from '../../services/storage';
import { QRPassModal } from '../../components/QRPassModal';

interface DeviceEnrollmentProps {
  initialSerial?: string;
  onFinished?: () => void;
}

export const DeviceEnrollment: React.FC<DeviceEnrollmentProps> = ({ initialSerial = '', onFinished }) => {
  const { t, language, currentGate, activeOfficer, showToast } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Device Form State
  const [deviceType, setDeviceType] = useState<DeviceType>('Laptop');
  const [brand, setBrand] = useState('Lenovo');
  const [model, setModel] = useState('ThinkPad E14 Gen 4');
  const [serialNumber, setSerialNumber] = useState(initialSerial || 'PF882910');
  const [notes, setNotes] = useState('Black chassis, registered at university gate');

  // Completed State
  const [enrolledDevice, setEnrolledDevice] = useState<Device | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const students = campusStore.getStudents();

  // Filter students based on query
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchStudentQuery.toLowerCase())
  );

  const handleSelectStudent = (stud: Student) => {
    setSelectedStudent(stud);
    setErrorMessage(null);
    setStep(2);
  };

  const handleProceedToDeviceInfo = () => {
    setStep(3);
  };

  const handleProceedToReview = () => {
    if (!serialNumber.trim()) {
      setErrorMessage(language === 'am' ? 'እባክዎ የሲሪያል ቁጥር ያስገቡ' : 'Serial number is required');
      return;
    }

    // Check if serial already exists
    const existing = campusStore.getDeviceBySerial(serialNumber.trim());
    if (existing) {
      setErrorMessage(
        language === 'am'
          ? `ይህ የሲሪያል ቁጥር (${serialNumber}) አስቀድሞ በ ${existing.ownerName} ስም ተመዝግቧል። ደንብ 1: አንድ መሳሪያ አንዴ ብቻ ይመዘገባል።`
          : `RULE 1 VIOLATION: Serial ${serialNumber} is already enrolled to ${existing.ownerName} (${existing.assetId}). A device can only be enrolled once.`
      );
      return;
    }

    setErrorMessage(null);
    setStep(4);
  };

  const handleConfirmEnrollment = () => {
    if (!selectedStudent) return;

    const res = campusStore.enrollDevice({
      student: selectedStudent,
      deviceType,
      brand,
      model,
      serialNumber: serialNumber.trim().toUpperCase(),
      notes,
      gateId: currentGate.id,
      officerBadge: activeOfficer.officerBadgeId,
      officerName: activeOfficer.name
    });

    if (res.error) {
      setErrorMessage(res.error);
      return;
    }

    setEnrolledDevice(res.device);
    setStep(5);
    showToast(
      language === 'am'
        ? `መሳሪያው (${res.device.assetId}) በተሳካ ሁኔታ ተመዝግቧል።`
        : `Device ${res.device.assetId} enrolled successfully at ${currentGate.name}!`,
      'success'
    );
  };

  const resetForm = () => {
    setStep(1);
    setSelectedStudent(null);
    setSerialNumber('');
    setEnrolledDevice(null);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden">
      {/* Title Header */}
      <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-purple-800/80 border border-purple-500/30 flex items-center justify-center text-purple-200 shadow-inner">
              <Laptop className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">
                {t('enrollmentTitle')}
              </h2>
              <p className="text-xs text-purple-200 mt-0.5 max-w-xl">
                {t('enrollmentSubtitle')}
              </p>
            </div>
          </div>
          <div className="bg-purple-900/80 px-3.5 py-1.5 rounded-lg border border-purple-700 text-xs font-mono text-purple-200 flex items-center gap-2">
            <Building className="w-4 h-4 text-amber-300" />
            <span>Station: {currentGate.name}</span>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="mt-6 grid grid-cols-5 gap-2 border-t border-purple-800/60 pt-4 text-xs font-medium">
          {[
            { num: 1, label: t('step1StudentSearch') },
            { num: 2, label: t('step2VerifyStudent') },
            { num: 3, label: t('step3DeviceInfo') },
            { num: 4, label: t('step4Review') },
            { num: 5, label: t('step5Success') }
          ].map((st) => (
            <div
              key={st.num}
              className={`flex items-center space-x-2 pb-1 border-b-2 transition-all ${
                step === st.num
                  ? 'border-amber-400 text-white font-bold'
                  : step > st.num
                  ? 'border-emerald-400 text-emerald-300'
                  : 'border-purple-800 text-purple-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === st.num
                    ? 'bg-amber-400 text-purple-950'
                    : step > st.num
                    ? 'bg-emerald-400 text-purple-950'
                    : 'bg-purple-800 text-purple-300'
                }`}
              >
                {step > st.num ? '✓' : st.num}
              </span>
              <span className="truncate hidden sm:inline">{st.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content Container */}
      <div className="p-6 md:p-8">
        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-400 rounded-xl text-rose-950 flex items-start space-x-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold block">Validation Alert:</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* STEP 1: Search & Identify Student */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                {language === 'am' ? 'ተማሪ ወይም ሰራተኛ ይፈልጉ' : 'Search Student or Staff Registry'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'am'
                  ? 'የተማሪውን መታወቂያ ቁጥር ወይም ስም በማስገባት የመረጃ ቋቱን ይፈልጉ።'
                  : 'Search by Student ID (e.g. ASTU-2024-01234), student name, or academic department.'}
              </p>
            </div>

            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
                placeholder={t('enterStudentPlaceholder') + ' or student name...'}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:bg-white"
              />
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Registered University Students:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {filteredStudents.map((stud) => (
                  <div
                    key={stud.id}
                    onClick={() => handleSelectStudent(stud)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-600 hover:bg-purple-50/50 cursor-pointer transition-all flex items-center space-x-3 group"
                  >
                    <img
                      src={stud.avatarUrl}
                      alt={stud.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 group-hover:text-purple-950 truncate">
                          {stud.name}
                        </span>
                        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                          {stud.status}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-purple-900 font-semibold block">
                        {stud.studentId}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate block">
                        {stud.department}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Verify Student Credentials */}
        {step === 2 && selectedStudent && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                {t('step2VerifyStudent')}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'am'
                  ? 'ተማሪው በአካል ከያዘው መታወቂያ ጋር ትክክለኛ መሆኑን ያረጋግጡ።'
                  : 'Verify student physical university ID card matches official registrar records.'}
              </p>
            </div>

            <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-6 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              <img
                src={selectedStudent.avatarUrl}
                alt={selectedStudent.name}
                className="w-24 h-24 rounded-2xl object-cover shadow-md border-2 border-purple-300"
              />
              <div className="space-y-2 flex-1 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h4 className="font-extrabold text-lg text-slate-900">{selectedStudent.name}</h4>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-200 text-purple-900">
                    Batch {selectedStudent.batchYear}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    {selectedStudent.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Student ID</span>
                    <span className="font-mono font-bold text-purple-950 text-sm">{selectedStudent.studentId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Academic Department</span>
                    <span className="font-semibold text-slate-900">{selectedStudent.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">University Email</span>
                    <span className="text-slate-800 font-mono">{selectedStudent.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Phone</span>
                    <span className="text-slate-800 font-mono">{selectedStudent.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center space-x-2 text-xs text-emerald-900 font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{t('studentVerificationConfirmed')}</span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{language === 'am' ? 'ተማሪ ቀይር' : 'Change Student'}</span>
              </button>
              <button
                onClick={handleProceedToDeviceInfo}
                className="inline-flex items-center space-x-2 px-6 py-2.5 bg-purple-900 text-white rounded-xl font-bold text-xs hover:bg-purple-800 transition-colors shadow-md"
              >
                <span>{language === 'am' ? 'ወደ መሳሪያ መረጃ ቀጥል' : 'Proceed to Device Info'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Device Information Form */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                {t('step3DeviceInfo')}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'am'
                  ? 'የመሳሪያውን የሲሪያል ቁጥር እና ዝርዝር መረጃ በትክክል ያስገቡ።'
                  : 'Enter the hardware serial number exactly as printed on the device chassis or BIOS.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('deviceType')}
                </label>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value as DeviceType)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-600"
                >
                  <option value="Laptop">Laptop / Portable Computer</option>
                  <option value="Tablet">Tablet / iPad</option>
                  <option value="Phone">Smart Phone / Mobile</option>
                  <option value="Camera">DSLR / Digital Camera</option>
                  <option value="Monitor">External Display / Monitor</option>
                  <option value="Projector">University / Lab Projector</option>
                  <option value="Lab Equipment">Lab Equipment</option>
                  <option value="Other">Other Electronic Device</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('brand')}
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Lenovo, Apple, Dell, HP, Asus"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('modelName')}
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. ThinkPad T14 Gen 3"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>{t('serialNumber')} *</span>
                  <span className="text-[10px] text-purple-700 font-mono">Hardware Unique Serial</span>
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. PF123456 or 5CD9280J9X"
                  className="w-full p-2.5 bg-purple-50/60 border-2 border-purple-300 rounded-xl text-xs font-mono font-bold text-purple-950 focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('deviceColorNotes')}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Space Gray, university Wi-Fi sticker on back, minor scratch on bezel"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{language === 'am' ? 'ወደ ኋላ' : 'Back'}</span>
              </button>
              <button
                onClick={handleProceedToReview}
                className="inline-flex items-center space-x-2 px-6 py-2.5 bg-purple-900 text-white rounded-xl font-bold text-xs hover:bg-purple-800 transition-colors shadow-md"
              >
                <span>{language === 'am' ? 'ወደ ማጠቃለያ ማረጋገጫ' : 'Review Summary'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Summary & Verification */}
        {step === 4 && selectedStudent && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                {t('step4Review')}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'am'
                  ? 'ሁሉም መረጃዎች ትክክለኛ መሆናቸውን አረጋግጠው ምዝገባውን ይጨርሱ።'
                  : 'Double-check all entered records before permanently creating the university asset pass.'}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-purple-800" />
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">{selectedStudent.name}</span>
                    <span className="text-xs font-mono text-purple-900">{selectedStudent.studentId} • {selectedStudent.department}</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {selectedStudent.status}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('deviceType')}</span>
                  <span className="font-semibold text-slate-900">{deviceType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('brand')} & {t('modelName')}</span>
                  <span className="font-semibold text-slate-900">{brand} {model}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('serialNumber')}</span>
                  <span className="font-mono font-bold text-purple-950 bg-white px-2 py-0.5 rounded border border-slate-300 inline-block">
                    {serialNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Enrollment Gate</span>
                  <span className="font-semibold text-slate-900">{currentGate.name}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>Inspecting Officer: <strong>{activeOfficer.name} ({activeOfficer.officerBadgeId})</strong></span>
                <span className="font-semibold text-emerald-700">Initial Status: INSIDE CAMPUS</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{language === 'am' ? 'አስተካክል' : 'Edit'}</span>
              </button>
              <button
                onClick={handleConfirmEnrollment}
                className="inline-flex items-center space-x-2 px-7 py-3 bg-purple-900 text-white rounded-xl font-extrabold text-sm hover:bg-purple-800 transition-all shadow-lg active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{t('generateAssetId')}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Success & Generated QR Pass */}
        {step === 5 && enrolledDevice && (
          <div className="space-y-6 text-center animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900">
                {t('step5Success')}
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {t('enrollmentSuccessMsg')}
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 max-w-md mx-auto">
              <span className="text-xs uppercase tracking-widest text-slate-500 font-bold block mb-1">
                Generated Permanent Campus Asset ID
              </span>
              <span className="text-2xl font-mono font-extrabold text-purple-950 bg-white px-4 py-1.5 rounded-xl border border-purple-300 inline-block shadow-xs">
                {enrolledDevice.assetId}
              </span>
              <div className="mt-3 text-xs text-slate-600">
                <span>Assigned to: <strong>{enrolledDevice.ownerName}</strong> ({enrolledDevice.ownerStudentId})</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowQrModal(true)}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-900 text-white font-bold text-xs hover:bg-purple-800 transition-colors shadow-md"
              >
                <QrCode className="w-4 h-4" />
                <span>{t('viewQr')}</span>
              </button>

              <button
                onClick={resetForm}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Enroll Another Device</span>
              </button>

              {onFinished && (
                <button
                  onClick={onFinished}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 transition-colors"
                >
                  Return to Gate Scanner
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QR Modal Component */}
      <QRPassModal
        device={enrolledDevice}
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
      />
    </div>
  );
};
