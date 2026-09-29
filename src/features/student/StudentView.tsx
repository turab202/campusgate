import React, { useState } from 'react';
import {
  Laptop, QrCode, AlertTriangle, Plus,
  ArrowUpRight, ArrowDownLeft, MapPin, X,
  Package, Clock, FileText, TrendingUp, Shield,
  ChevronRight, GraduationCap
} from 'lucide-react';
import { Device } from '../../types';
import { useApp } from '../../context/AppContext';
import { campusStore } from '../../services/storage';
import { QRPassModal } from '../../components/QRPassModal';

export const StudentView: React.FC = () => {
  const { t, language, currentStudent, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'DEVICES' | 'HISTORY' | 'REQUESTS'>('DEVICES');
  const [selectedDeviceForQr, setSelectedDeviceForQr] = useState<Device | null>(null);
  const [deviceToReportLost, setDeviceToReportLost] = useState<Device | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [reqDeviceDesc, setReqDeviceDesc] = useState('');
  const [reqDestination, setReqDestination] = useState('INSA Cyber Center, Addis Ababa');
  const [reqReason, setReqReason] = useState('Research Project Exhibition & Capstone Defense');
  const [reqReturnDate, setReqReturnDate] = useState('2026-09-30');

  const devices = campusStore.getDevices().filter(
    (d) => d.ownerStudentId === currentStudent.studentId || d.ownerId === currentStudent.id
  );
  const movements = campusStore.getMovements().filter(
    (m) => m.ownerStudentId === currentStudent.studentId
  );
  const requests = campusStore.getRequests().filter(
    (r) => r.applicantId === currentStudent.studentId
  );

  const insideCount = devices.filter((d) => d.status === 'INSIDE_CAMPUS').length;
  const outsideCount = devices.filter((d) => d.status === 'OUTSIDE_CAMPUS').length;
  const lostCount = devices.filter((d) => d.status === 'LOST').length;

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

  const statusStyle = (status: string) => {
    if (status === 'INSIDE_CAMPUS') return { badge: 'bg-[var(--cg-success-bg)] text-[var(--cg-success)] border-[var(--cg-success-border)]', dot: 'bg-[var(--cg-success)]' };
    if (status === 'LOST') return { badge: 'bg-[var(--cg-danger-bg)] text-[var(--cg-danger)] border-[var(--cg-danger-border)]', dot: 'bg-[var(--cg-danger)]' };
    return { badge: 'bg-[var(--cg-info-bg)] text-[var(--cg-info)] border-[var(--cg-info-border)]', dot: 'bg-[var(--cg-info)]' };
  };

  const navItems = [
    { id: 'DEVICES' as const, label: t('navMyDevices'), icon: Package, count: devices.length, desc: 'Enrolled devices' },
    { id: 'HISTORY' as const, label: t('navHistory'), icon: Clock, count: movements.length, desc: 'Movement timeline' },
    { id: 'REQUESTS' as const, label: t('navRequests'), icon: FileText, count: requests.length, desc: 'Exit authorizations' },
  ];

  return (
    <div className="flex h-[calc(100vh-56px)]">

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-[var(--cg-border)] bg-[var(--cg-surface)] overflow-y-auto">

        {/* Profile */}
        <div className="relative">
          <div className="h-20 w-full" style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #2D5282 100%)' }} />
          <div className="px-5 pb-5">
            <div className="-mt-9 mb-3">
              <img
                src={currentStudent.avatarUrl}
                alt={currentStudent.name}
                className="h-16 w-16 rounded-2xl border-4 border-[var(--cg-surface)] object-cover shadow-[var(--cg-shadow-sm)]"
              />
            </div>
            <h2 className="text-sm font-bold text-[var(--cg-text)]">{currentStudent.name}</h2>
            <p className="font-mono text-[11px] font-semibold text-[var(--cg-primary)]">{currentStudent.studentId}</p>
            <p className="text-[11px] text-[var(--cg-text-muted)] mt-0.5">{currentStudent.department}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--cg-success-border)] bg-[var(--cg-success-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--cg-success)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--cg-success)]" />
              {currentStudent.status}
            </div>
          </div>
        </div>

        {/* Device stats */}
        <div className="border-t border-[var(--cg-border)] px-4 py-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)] mb-2">Device Summary</p>
          {[
            { label: 'Inside Campus', value: insideCount, color: 'text-[var(--cg-success)]', bg: 'bg-[var(--cg-success-bg)]', icon: TrendingUp },
            { label: 'Outside Campus', value: outsideCount, color: 'text-[var(--cg-info)]', bg: 'bg-[var(--cg-info-bg)]', icon: ArrowUpRight },
            { label: 'Reported Lost', value: lostCount, color: 'text-[var(--cg-danger)]', bg: 'bg-[var(--cg-danger-bg)]', icon: AlertTriangle },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="flex items-center justify-between rounded-xl border border-[var(--cg-border)] px-3 py-2">
              <div className="flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-3 w-3 ${color}`} />
                </div>
                <span className="text-[11px] text-[var(--cg-text-muted)]">{label}</span>
              </div>
              <span className={`font-mono text-sm font-bold ${color}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Nav */}
        <nav className="flex-1 border-t border-[var(--cg-border)] px-3 py-3 space-y-1">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)] mb-2">Navigation</p>
          {navItems.map(({ id, label, icon: Icon, count, desc }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? 'bg-[var(--cg-primary)] text-white shadow-[var(--cg-shadow-xs)]'
                    : 'text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] hover:text-[var(--cg-text)]'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-[var(--cg-text-subtle)] group-hover:text-[var(--cg-text)]'}`} />
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-semibold ${isActive ? 'text-white' : ''}`}>{label}</div>
                  <div className={`text-[10px] ${isActive ? 'text-white/60' : 'text-[var(--cg-text-subtle)]'}`}>{desc}</div>
                </div>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Security notice */}
        <div className="border-t border-[var(--cg-border)] px-4 py-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield className="h-3.5 w-3.5 text-[var(--cg-primary)]" />
            <span className="text-[11px] font-semibold text-[var(--cg-text)]">Security Notice</span>
          </div>
          <p className="text-[10px] leading-4 text-[var(--cg-text-muted)]">
            {language === 'am'
              ? 'አንዴ ተመዝግቦ በሁሉም በሮች ይሰራል።'
              : 'Enrolled once, valid at all university gates. Show QR pass to gate officer.'}
          </p>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-[var(--cg-border)] bg-[var(--cg-surface)] md:hidden">
        {navItems.map(({ id, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
              activeTab === id ? 'text-[var(--cg-primary)]' : 'text-[var(--cg-text-muted)]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute right-3 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--cg-primary)] text-[9px] font-bold text-white">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Content header */}
        <div className="flex items-center justify-between border-b border-[var(--cg-border)] bg-[var(--cg-surface)] px-6 py-3.5">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-4 w-4 text-[var(--cg-primary)]" />
            <div>
              <h1 className="text-sm font-bold text-[var(--cg-text)]">
                {navItems.find((n) => n.id === activeTab)?.label}
              </h1>
              <p className="text-[11px] text-[var(--cg-text-muted)]">
                {navItems.find((n) => n.id === activeTab)?.desc}
              </p>
            </div>
          </div>
          {activeTab === 'REQUESTS' && (
            <button
              onClick={() => setShowExitModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--cg-primary)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Submit Request
            </button>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
