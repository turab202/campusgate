import React, { useState } from 'react';
import { Camera, PlusCircle, Clock, Users, ShieldAlert, MapPin, Activity } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DeviceScanner } from './DeviceScanner';
import { DeviceEnrollment } from './DeviceEnrollment';
import { GateTransactions } from './GateTransactions';
import { VisitorManager } from './VisitorManager';
import { IncidentManager } from './IncidentManager';

export const OfficerMain: React.FC = () => {
  const { t, activeTab, setActiveTab, activeOfficer, currentGate, language } = useApp();
  const [prefilledSerial, setPrefilledSerial] = useState<string>('');

  const handleStartEnrollment = (serial?: string) => {
    if (serial) setPrefilledSerial(serial);
    setActiveTab('gate_enroll');
  };

  const tabs = [
    { id: 'gate_scan', label: t('navScanDevice'), icon: Camera },
    { id: 'gate_enroll', label: t('navEnrollDevice'), icon: PlusCircle },
    { id: 'gate_transactions', label: t('navTransactions'), icon: Clock },
    { id: 'gate_visitors', label: t('navVisitors'), icon: Users },
    { id: 'gate_incidents', label: t('navIncidents'), icon: ShieldAlert },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 xl:flex-row">
        <aside className="w-full shrink-0 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-3.5 shadow-[var(--cg-shadow-sm)] xl:w-72">
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cg-primary)]/10 text-[var(--cg-primary)]">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">Active gate</p>
              <p className="truncate text-sm font-bold text-[var(--cg-text)]">
                {language === 'am' ? currentGate.nameAmharic : currentGate.name}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { if (id === 'gate_enroll') setPrefilledSerial(''); setActiveTab(id); }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all ${
                  activeTab === id
                    ? 'bg-[var(--cg-primary)] text-white shadow-[var(--cg-shadow-xs)]'
                    : 'bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)] hover:text-[var(--cg-text)]'
                }`}
                aria-current={activeTab === id ? 'page' : undefined}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 border-t border-[var(--cg-border)] pt-4">
            <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">Officer</p>
              <p className="mt-1 text-sm font-bold text-[var(--cg-text)]">{activeOfficer.name}</p>
              <p className="font-mono text-[11px] text-[var(--cg-text-muted)]">{activeOfficer.officerBadgeId}</p>
            </div>
            <div className="mt-3 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">Shift</p>
              <p className="mt-1 text-sm font-bold text-[var(--cg-text)]">{activeOfficer.currentShift}</p>
              <p className={`text-[11px] font-semibold ${activeOfficer.stationStatus === 'ON_DUTY' ? 'text-[var(--cg-success)]' : 'text-[var(--cg-text-muted)]'}`}>
                {activeOfficer.stationStatus.replace('_', ' ')}
              </p>
            </div>
          </div>
        </aside>

        <div className="flex-1 space-y-5">
          <header className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] px-4 py-3 shadow-[var(--cg-shadow-sm)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">Gate operations</p>
                <h1 className="mt-1 text-lg font-bold text-[var(--cg-text)]">
                  {language === 'am' ? currentGate.nameAmharic : currentGate.name}
                </h1>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--cg-success-border)] bg-[var(--cg-success-bg)] px-2.5 py-1 text-[10px] font-bold text-[var(--cg-success)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--cg-success)] animate-pulse" />
                Active
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Entries', value: currentGate.todayStats.checkIns, tone: 'text-[var(--cg-success)]' },
                { label: 'Exits', value: currentGate.todayStats.checkOuts, tone: 'text-[var(--cg-info)]' },
                { label: 'Visitors', value: currentGate.todayStats.visitors, tone: 'text-[var(--cg-warning)]' },
                { label: 'Incidents', value: currentGate.todayStats.incidents, tone: 'text-[var(--cg-danger)]' },
              ].map(({ label, value, tone }) => (
                <div key={label} className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 py-2 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--cg-text-muted)]">{label}</p>
                  <p className={`mt-1 font-mono text-xl font-bold ${tone}`}>{value}</p>
                </div>
              ))}
            </div>
          </header>

          <div>
            {activeTab === 'gate_scan' && <DeviceScanner onNavigateToEnroll={handleStartEnrollment} />}
            {activeTab === 'gate_enroll' && <DeviceEnrollment initialSerial={prefilledSerial} onFinished={() => setActiveTab('gate_scan')} />}
            {activeTab === 'gate_transactions' && <GateTransactions />}
            {activeTab === 'gate_visitors' && <VisitorManager />}
            {activeTab === 'gate_incidents' && <IncidentManager />}
          </div>
        </div>
      </div>
    </div>
  );
};
