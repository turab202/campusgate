import React, { useState } from 'react';
import {
  Camera,
  PlusCircle,
  Clock,
  Users,
  ShieldAlert,
  Search,
  Laptop
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DeviceScanner } from './DeviceScanner';
import { DeviceEnrollment } from './DeviceEnrollment';
import { GateTransactions } from './GateTransactions';
import { VisitorManager } from './VisitorManager';
import { IncidentManager } from './IncidentManager';

export const OfficerMain: React.FC = () => {
  const { t, language, activeTab, setActiveTab } = useApp();
  const [prefilledSerialForEnroll, setPrefilledSerialForEnroll] = useState<string>('');

  const handleStartEnrollment = (serial?: string) => {
    if (serial) setPrefilledSerialForEnroll(serial);
    setActiveTab('gate_enroll');
  };

  return (
    <div className="space-y-6">
      {/* Officer Primary Navigation Tabs (Big touch targets for tablet / mobile) */}
      <div className="bg-white p-2 rounded-2xl border border-purple-100 shadow-sm flex items-center space-x-1.5 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('gate_scan')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all shrink-0 ${
            activeTab === 'gate_scan'
              ? 'bg-purple-900 text-white shadow-md'
              : 'text-slate-600 hover:text-purple-950 hover:bg-purple-50'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>{t('navScanDevice')}</span>
        </button>

        <button
          onClick={() => {
            setPrefilledSerialForEnroll('');
            setActiveTab('gate_enroll');
          }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all shrink-0 ${
            activeTab === 'gate_enroll'
              ? 'bg-purple-900 text-white shadow-md'
              : 'text-slate-600 hover:text-purple-950 hover:bg-purple-50'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('navEnrollDevice')}</span>
        </button>

        <button
          onClick={() => setActiveTab('gate_transactions')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all shrink-0 ${
            activeTab === 'gate_transactions'
              ? 'bg-purple-900 text-white shadow-md'
              : 'text-slate-600 hover:text-purple-950 hover:bg-purple-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('navTransactions')}</span>
        </button>

        <button
          onClick={() => setActiveTab('gate_visitors')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all shrink-0 ${
            activeTab === 'gate_visitors'
              ? 'bg-purple-900 text-white shadow-md'
              : 'text-slate-600 hover:text-purple-950 hover:bg-purple-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('navVisitors')}</span>
        </button>

        <button
          onClick={() => setActiveTab('gate_incidents')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all shrink-0 ${
            activeTab === 'gate_incidents'
              ? 'bg-purple-900 text-white shadow-md'
              : 'text-slate-600 hover:text-purple-950 hover:bg-purple-50'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{t('navIncidents')}</span>
        </button>
      </div>

      {/* Main View Display */}
      {activeTab === 'gate_scan' && (
        <DeviceScanner onNavigateToEnroll={handleStartEnrollment} />
      )}

      {activeTab === 'gate_enroll' && (
        <DeviceEnrollment
          initialSerial={prefilledSerialForEnroll}
          onFinished={() => setActiveTab('gate_scan')}
        />
      )}

      {activeTab === 'gate_transactions' && <GateTransactions />}

      {activeTab === 'gate_visitors' && <VisitorManager />}

      {activeTab === 'gate_incidents' && <IncidentManager />}
    </div>
  );
};
