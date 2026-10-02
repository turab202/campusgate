import React, { useState } from 'react';
import {
  Search, CheckCircle2, Laptop, QrCode,
  ArrowRight, ArrowLeft, User, AlertCircle, RotateCcw
} from 'lucide-react';
import { Device, DeviceType } from '../../types';
import { useApp } from '../../context/AppContext';
import { QRPassModal } from '../../components/QRPassModal';
import { enrollDeviceApi, toBackendDeviceType } from '../../services/deviceService';
import { ApiError } from '../../services/api';
import { searchUsersApi, UserSearchResult } from '../../services/userService';

interface DeviceEnrollmentProps {
  initialSerial?: string;
  onFinished?: () => void;
}

export const DeviceEnrollment: React.FC<DeviceEnrollmentProps> = ({ initialSerial = '', onFinished }) => {
  const { t, language, currentGate, activeOfficer, showToast, authUser } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [deviceType, setDeviceType] = useState<DeviceType>('Laptop');
  const [brand, setBrand] = useState('Lenovo');
  const [model, setModel] = useState('ThinkPad E14 Gen 4');
  const [serialNumber, setSerialNumber] = useState(initialSerial || '');
  const [notes, setNotes] = useState('');
  const [enrolledDevice, setEnrolledDevice] = useState<Device | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const results = await searchUsersApi(q.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (u: UserSearchResult) => {
    setSelectedUser(u);
    setErrorMessage(null);
    setStep(2);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProceedToReview = () => {
    if (!serialNumber.trim()) {
      setErrorMessage(language === 'am' ? 'እባክዎ የሲሪያል ቁጥር ያስገቡ' : 'Serial number is required');
      return;
    }
    setErrorMessage(null);
    setStep(4);
  };

  const handleConfirmEnrollment = async () => {
    if (!selectedUser || !authUser) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await enrollDeviceApi({
        serial_number: serialNumber.trim().toUpperCase(),
        device_type: toBackendDeviceType(deviceType),
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        owner_id: selectedUser.id,
      });

      const frontendDevice: Device = {
        id: result.id,
        assetId: result.asset_id,
        serialNumber: result.serial_number,
        brand: result.brand ?? brand,
        model: result.model ?? model,
        deviceType,
        ownerId: result.owner_id,
        ownerName: selectedUser.full_name,
        ownerStudentId: selectedUser.campus_id ?? selectedUser.email,
        ownerDepartment: '',
        status: result.status as Device['status'],
        enrollmentDate: result.registered_at,
        enrolledByOfficerBadge: activeOfficer.officerBadgeId,
        enrolledAtGateId: currentGate.id,
        qrPayload: result.qr_code_value,
        notes: notes || undefined,
      };

      setEnrolledDevice(frontendDevice);
      setStep(5);
      showToast(`Device ${result.asset_id} enrolled successfully!`, 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Enrollment failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1); setSelectedUser(null); setSerialNumber('');
    setEnrolledDevice(null); setErrorMessage(null); setSearchQuery('');
    setSearchResults([]);
  };

  const stepLabels = [
    t('step1StudentSearch'), t('step2VerifyStudent'),
    t('step3DeviceInfo'), t('step4Review'), t('step5Success')
  ];

  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-card)] overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--cg-border)] bg-[var(--cg-primary)] px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-white">
              <Laptop className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t('enrollmentTitle')}</h2>
              <p className="text-xs text-white/70 mt-0.5 max-w-xl">{t('enrollmentSubtitle')}</p>
            </div>
          </div>
          <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-mono text-white/80">
            Station: {currentGate.name}
          </span>
        </div>

        {/* Progress stepper */}
        <div className="mt-5 grid grid-cols-5 gap-2 border-t border-white/20 pt-4">
          {stepLabels.map((label, i) => {
            const num = i + 1;
            return (
              <div
                key={num}
                className={`flex items-center gap-1.5 border-b-2 pb-1 text-xs transition-colors ${
                  step === num ? 'border-white text-white font-semibold'
                  : step > num ? 'border-green-400 text-green-300'
                  : 'border-white/20 text-white/40'
                }`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  step === num ? 'bg-white text-[var(--cg-primary)]'
                  : step > num ? 'bg-green-400 text-white'
                  : 'bg-white/20 text-white/60'
                }`}>
                  {step > num ? '✓' : num}
                </span>
                <span className="hidden sm:inline truncate">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-8">
        {errorMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-[var(--cg-danger)] bg-red-50 p-4">
            <AlertCircle className="h-4 w-4 text-[var(--cg-danger)] shrink-0 mt-0.5" />
            <div className="text-xs text-red-900">
              <span className="block font-semibold">Validation Error</span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Step 1: Search student/staff */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-[var(--cg-text)] mb-1">
                {language === 'am' ? 'ተማሪ ወይም ሰራተኛ ይፈልጉ' : 'Search Student or Staff Registry'}
              </h3>
              <p className="text-xs text-[var(--cg-text-muted)]">
                {language === 'am' ? 'የተማሪውን መታወቂያ ወይም ስም ያስገቡ' : 'Search by campus ID, name, or email (min 2 characters).'}
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--cg-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t('enterStudentPlaceholder') + ' or name…'}
                className="h-12 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] pl-10 pr-4 text-sm text-[var(--cg-text)] focus:border-[var(--cg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cg-primary)]/10"
              />
              {isSearching && (
                <span className="absolute right-3.5 top-3.5 text-xs text-[var(--cg-text-muted)]">Searching…</span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto md:grid-cols-2">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className="flex items-center gap-3 rounded-xl border border-[var(--cg-border)] p-3.5 text-left transition-colors hover:border-[var(--cg-primary)] hover:bg-[var(--cg-surface-muted)]"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--cg-surface-muted)] border border-[var(--cg-border)]">
                    <User className="h-6 w-6 text-[var(--cg-text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-[var(--cg-text)] truncate">{u.full_name}</span>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-[var(--cg-success)]">{u.role}</span>
                    </div>
                    <span className="block font-mono text-xs text-[var(--cg-primary)]">{u.campus_id ?? '—'}</span>
                    <span className="block text-[11px] text-[var(--cg-text-muted)] truncate">{u.email}</span>
                  </div>
                </button>
              ))}
              {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                <p className="col-span-2 py-4 text-center text-xs text-[var(--cg-text-muted)]">No users found for &ldquo;{searchQuery}&rdquo;</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Verify user */}
        {step === 2 && selectedUser && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-[var(--cg-text)] mb-1">{t('step2VerifyStudent')}</h3>
              <p className="text-xs text-[var(--cg-text-muted)]">
                {language === 'am' ? 'ተማሪው ከያዘው መታወቂያ ጋር ያረጋግጡ' : 'Verify the physical ID card matches the registry record.'}
              </p>
            </div>
            <div className="flex flex-col items-center gap-5 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-5 md:flex-row md:items-start">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--cg-border)] bg-[var(--cg-surface)]">
                <User className="h-12 w-12 text-[var(--cg-text-muted)]" />
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <h4 className="font-semibold text-lg text-[var(--cg-text)]">{selectedUser.full_name}</h4>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[var(--cg-success)]">{selectedUser.role}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  {[
                    { label: 'Campus ID', value: selectedUser.campus_id ?? '—', mono: true },
                    { label: 'Role', value: selectedUser.role },
                    { label: 'Email', value: selectedUser.email, mono: true },
                  ].map(({ label, value, mono }) => (
                    <div key={label}>
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">{label}</span>
                      <span className={`block font-semibold text-[var(--cg-text)] ${mono ? 'font-mono' : ''}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-[var(--cg-success)]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t('studentVerificationConfirmed')}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--cg-border)] pt-4">
              <button onClick={() => setStep(1)} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] transition-colors">
                <ArrowLeft className="h-4 w-4" /> {language === 'am' ? 'ተማሪ ቀይር' : 'Change User'}
              </button>
              <button onClick={() => setStep(3)} className="flex items-center gap-2 rounded-lg bg-[var(--cg-primary)] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors">
                {language === 'am' ? 'ወደ መሳሪያ መረጃ' : 'Proceed to Device Info'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Device info */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-[var(--cg-text)] mb-1">{t('step3DeviceInfo')}</h3>
              <p className="text-xs text-[var(--cg-text-muted)]">
                {language === 'am' ? 'የሲሪያል ቁጥሩን ትክክለኛ ሆኖ ያስገቡ' : 'Enter the serial number exactly as printed on the device chassis or BIOS.'}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { label: t('deviceType'), type: 'select' as const },
                { label: t('brand'), value: brand, setter: setBrand, placeholder: 'e.g. Lenovo, Apple, Dell' },
                { label: t('modelName'), value: model, setter: setModel, placeholder: 'e.g. ThinkPad T14 Gen 3' },
                { label: `${t('serialNumber')} *`, value: serialNumber, setter: setSerialNumber, placeholder: 'e.g. PF123456', mono: true, required: true },
              ].map((field) => (
                <div key={field.label}>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)] mb-1.5">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      value={deviceType}
                      onChange={(e) => setDeviceType(e.target.value as DeviceType)}
                      className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm text-[var(--cg-text)] focus:border-[var(--cg-primary)] focus:outline-none"
                    >
                      {['Laptop','Tablet','Phone','Camera','Monitor','Projector','Lab Equipment','Other'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => field.setter?.(field.mono ? e.target.value.toUpperCase() : e.target.value)}
                      placeholder={field.placeholder}
                      className={`h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm text-[var(--cg-text)] focus:border-[var(--cg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cg-primary)]/10 ${field.mono ? 'font-mono' : ''}`}
                    />
                  )}
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)] mb-1.5">{t('deviceColorNotes')}</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Space Gray, university sticker on back"
                  className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm text-[var(--cg-text)] focus:border-[var(--cg-primary)] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--cg-border)] pt-4">
              <button onClick={() => setStep(2)} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] transition-colors">
                <ArrowLeft className="h-4 w-4" /> {language === 'am' ? 'ወደ ኋላ' : 'Back'}
              </button>
              <button onClick={handleProceedToReview} className="flex items-center gap-2 rounded-lg bg-[var(--cg-primary)] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors">
                {language === 'am' ? 'ወደ ማጠቃለያ' : 'Review Summary'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && selectedUser && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-[var(--cg-text)] mb-1">{t('step4Review')}</h3>
              <p className="text-xs text-[var(--cg-text-muted)]">
                {language === 'am' ? 'ሁሉም መረጃዎች ትክክለኛ መሆናቸውን ያረጋግጡ' : 'Verify all records before creating the permanent asset pass.'}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--cg-border)] pb-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-[var(--cg-primary)]" />
                  <div>
                    <span className="block font-semibold text-sm text-[var(--cg-text)]">{selectedUser.full_name}</span>
                    <span className="block font-mono text-xs text-[var(--cg-primary)]">{selectedUser.campus_id ?? selectedUser.email}</span>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-[var(--cg-success)]">{selectedUser.role}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                {[
                  { label: t('deviceType'), value: deviceType },
                  { label: `${t('brand')} & ${t('modelName')}`, value: `${brand} ${model}` },
                  { label: t('serialNumber'), value: serialNumber, mono: true },
                  { label: 'Enrollment Gate', value: currentGate.name },
                ].map(({ label, value, mono }) => (
                  <div key={label}>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">{label}</span>
                    <span className={`block font-semibold text-[var(--cg-text)] ${mono ? 'font-mono' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-[var(--cg-border)] pt-2 text-xs">
                <span className="text-[var(--cg-text-muted)]">Officer: <strong className="text-[var(--cg-text)]">{activeOfficer.name} ({activeOfficer.officerBadgeId})</strong></span>
                <span className="font-semibold text-[var(--cg-success)]">Initial Status: INSIDE CAMPUS</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--cg-border)] pt-4">
              <button onClick={() => setStep(3)} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] transition-colors">
                <ArrowLeft className="h-4 w-4" /> {language === 'am' ? 'አስተካክል' : 'Edit'}
              </button>
              <button onClick={handleConfirmEnrollment} disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-[var(--cg-primary)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors shadow-sm disabled:opacity-60">
                {isSubmitting ? 'Enrolling…' : t('generateAssetId')} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && enrolledDevice && (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-9 w-9 text-[var(--cg-success)]" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[var(--cg-text)]">{t('step5Success')}</h3>
              <p className="mt-1 text-xs text-[var(--cg-text-muted)] max-w-md mx-auto">{t('enrollmentSuccessMsg')}</p>
            </div>
            <div className="mx-auto max-w-sm rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-4">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)] mb-1">Generated Asset ID</span>
              <span className="inline-block rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-4 py-1.5 font-mono text-xl font-semibold text-[var(--cg-primary)]">
                {enrolledDevice.assetId}
              </span>
              <p className="mt-2 text-xs text-[var(--cg-text-muted)]">
                Assigned to: <strong className="text-[var(--cg-text)]">{selectedUser?.full_name ?? enrolledDevice.ownerName}</strong>
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => setShowQrModal(true)} className="flex items-center gap-2 rounded-lg bg-[var(--cg-primary)] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors">
                <QrCode className="h-4 w-4" /> {t('viewQr')}
              </button>
              <button onClick={resetForm} className="flex items-center gap-1.5 rounded-lg border border-[var(--cg-border)] px-4 py-2.5 text-xs font-medium text-[var(--cg-text)] hover:bg-[var(--cg-surface-muted)] transition-colors">
                <RotateCcw className="h-4 w-4" /> Enroll Another
              </button>
              {onFinished && (
                <button onClick={onFinished} className="rounded-lg border border-[var(--cg-border)] px-4 py-2.5 text-xs font-medium text-[var(--cg-text)] hover:bg-[var(--cg-surface-muted)] transition-colors">
                  Return to Scanner
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <QRPassModal device={enrolledDevice} isOpen={showQrModal} onClose={() => setShowQrModal(false)} />
    </div>
  );
};
