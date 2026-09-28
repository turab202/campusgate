import React, { useState } from 'react';
import { Camera, PlusCircle, Clock, Users, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DeviceScanner } from './DeviceScanner';
import { DeviceEnrollment } from './DeviceEnrollment';
import { GateTransactions } from './GateTransactions';
import { VisitorManager } from './VisitorManager';
import { IncidentManager } from './IncidentManager';

export const OfficerMain: React.FC = () => {
  const { t, activeTab, setActiveTab } = useApp();
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
    <div className="space-y-6">
      {/* Tab navigation */}
      <nav
        className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-1.5"
        aria-label="Officer navigation"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              if (id === 'gate_enroll') setPrefilledSerial('');
              setActiveTab(id);
            }}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === id
                ? 'bg-[var(--cg-primary)] text-white shadow-sm'
                : 'text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] hover:text-[var(--cg-text)]'
            }`}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {activeTab === 'gate_scan' && (
        <DeviceScanner onNavigateToEnroll={handleStartEnrollment} />
      )}
      {activeTab === 'gate_enroll' && (
        <DeviceEnrollment
          initialSerial={prefilledSerial}
          onFinished={() => setActiveTab('gate_scan')}
        />
      )}
      {activeTab === 'gate_transactions' && <GateTransactions />}
      {activeTab === 'gate_visitors' && <VisitorManager />}
      {activeTab === 'gate_incidents' && <IncidentManager />}
    </div>
  );
};
