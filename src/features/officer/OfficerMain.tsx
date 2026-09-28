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
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Command-center header */}
      <div className="overflow-hidden rounded-2xl border border-[var(--cg-border)] shadow-[var(--cg-shadow-sm)]" style={{ background: 'linear-gradient(135deg, #0F2340 0%, #1E3A5F 50%, #2D5282 100%)' }}>
        <div className="px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 border border-white/20">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white">
                    {language === 'am' ? currentGate.nameAmharic : currentGate.name}
                  </h1>
                  <span className="rounded-full bg-emerald-400/20 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-white/60 mt-0.5">{currentGate.locationDescription}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-center">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">Officer</span>
                <span className="block text-sm font-bold text-white">{activeOfficer.name}</span>
                <span className="block font-mono text-[11px] text-white/60">{activeOfficer.officerBadgeId}</span>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-center">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">Shift</span>
                <span className="block text-sm font-bold text-white">{activeOfficer.currentShift}</span>
                <span className={`block text-[11px] font-semibold ${activeOfficer.stationStatus === 'ON_DUTY' ? 'text-emerald-300' : 'text-white/40'}`}>
                  {activeOfficer.stationStatus.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Today's gate stats */}
          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-white/15 pt-4">
            {[
              { label: 'Entries', value: currentGate.todayStats.checkIns, color: 'text-emerald-300' },
              { label: 'Exits', value: currentGate.todayStats.checkOuts, color: 'text-sky-300' },
              { label: 'Visitors', value: currentGate.todayStats.visitors, color: 'text-amber-300' },
              { label: 'Incidents', value: currentGate.todayStats.incidents, color: 'text-red-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
                <span className="block text-[10px] font-semibold text-white/50">{label}</span>
                <span className={`block font-mono text-xl font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tab nav inside header */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-white/15 bg-white/5 px-4 py-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { if (id === 'gate_enroll') setPrefilledSerial(''); setActiveTab(id); }}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === id
                  ? 'bg-white text-[var(--cg-primary)] shadow-[var(--cg-shadow-xs)]'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'gate_scan' && <DeviceScanner onNavigateToEnroll={handleStartEnrollment} />}
        {activeTab === 'gate_enroll' && <DeviceEnrollment initialSerial={prefilledSerial} onFinished={() => setActiveTab('gate_scan')} />}
        {activeTab === 'gate_transactions' && <GateTransactions />}
        {activeTab === 'gate_visitors' && <VisitorManager />}
        {activeTab === 'gate_incidents' && <IncidentManager />}
      </div>
    </div>
  );
};
