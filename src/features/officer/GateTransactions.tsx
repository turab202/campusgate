import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Search, MapPin, Laptop } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { campusStore } from '../../services/storage';

export const GateTransactions: React.FC = () => {
  const { t, language } = useApp();
  const [filterType, setFilterType] = useState<'ALL' | 'CHECK_IN' | 'CHECK_OUT'>('ALL');
  const [filterGate, setFilterGate] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const movements = campusStore.getMovements();
  const gates = campusStore.getGates();

  const filtered = movements.filter((m) => {
    if (filterType !== 'ALL' && m.type !== filterType) return false;
    if (filterGate !== 'ALL' && m.gateId !== filterGate) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.deviceAssetId.toLowerCase().includes(q) ||
        m.deviceSerial.toLowerCase().includes(q) ||
        m.ownerName.toLowerCase().includes(q) ||
        m.ownerStudentId.toLowerCase().includes(q) ||
        m.deviceModel.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--cg-text)]">{t('navTransactions')}</h2>
          <p className="mt-0.5 text-xs text-[var(--cg-text-muted)]">
            {language === 'am'
              ? 'በሁሉም የዩኒቨርሲቲው በሮች የተከናወኑ እንቅስቃሴዎች'
              : 'Unified log of all cross-gate device movements.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="h-9 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]"
          >
            <option value="ALL">All Actions</option>
            <option value="CHECK_IN">Check-Ins</option>
            <option value="CHECK_OUT">Check-Outs</option>
          </select>
          <select
            value={filterGate}
            onChange={(e) => setFilterGate(e.target.value)}
            className="h-9 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text)] focus:outline-none focus:border-[var(--cg-primary)]"
          >
            <option value="ALL">All Gates</option>
            {gates.map((g) => (
              <option key={g.id} value={g.id}>{language === 'am' ? g.nameAmharic : g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-[var(--cg-text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by serial, asset ID, student name or model…"
          className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] pl-10 pr-4 text-xs text-[var(--cg-text)] focus:border-[var(--cg-primary)] focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--cg-surface-muted)] border-b border-[var(--cg-border)]">
              <tr>
                {['Timestamp', 'Action', 'Device & Serial', 'Student / Owner', 'Gate', 'Officer', 'Cross-Gate Notes'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cg-border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--cg-text-muted)]">
                    No transactions match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((mov) => {
                  const isIn = mov.type === 'CHECK_IN';
                  return (
                    <tr key={mov.id} className="hover:bg-[var(--cg-surface-muted)] transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--cg-text-muted)] whitespace-nowrap">{mov.timestamp}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          isIn ? 'bg-emerald-50 text-[var(--cg-success)] border border-emerald-200'
                               : 'bg-sky-50 text-[var(--cg-info)] border border-sky-200'
                        }`}>
                          {isIn ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                          {isIn ? t('checkIns') : t('checkOuts')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-semibold text-[var(--cg-text)]">
                          <Laptop className="h-3.5 w-3.5 text-[var(--cg-primary)] shrink-0" />
                          {mov.deviceModel}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-[var(--cg-text-muted)]">
                          {mov.deviceAssetId} · S/N: {mov.deviceSerial}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--cg-text)]">{mov.ownerName}</div>
                        <div className="font-mono text-[11px] text-[var(--cg-primary)]">{mov.ownerStudentId}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1 font-medium text-[var(--cg-text)]">
                          <MapPin className="h-3 w-3 text-[var(--cg-text-muted)]" />
                          {language === 'am' && mov.gateNameAmharic ? mov.gateNameAmharic : mov.gateName}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--cg-text-muted)] whitespace-nowrap">{mov.officerBadge}</td>
                      <td className="px-4 py-3">
                        {mov.crossGateNote ? (
                          <span className="inline-block rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                            {mov.crossGateNote}
                          </span>
                        ) : (
                          <span className="text-[var(--cg-text-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
