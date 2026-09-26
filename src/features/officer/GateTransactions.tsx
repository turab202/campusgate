import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Search,
  MapPin,
  Clock,
  Shield,
  Laptop
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { campusStore } from '../../services/storage';

export const GateTransactions: React.FC = () => {
  const { t, language, currentGate } = useApp();
  const [filterType, setFilterType] = useState<'ALL' | 'CHECK_IN' | 'CHECK_OUT'>('ALL');
  const [filterGate, setFilterGate] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const movements = campusStore.getMovements();
  const gates = campusStore.getGates();

  const filteredMovements = movements.filter((m) => {
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-purple-100 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            {t('navTransactions')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'am'
              ? 'በሁሉም የዩኒቨርሲቲው በሮች የተከናወኑ የቀጥታ የመግቢያ እና መውጫ እንቅስቃሴዎች'
              : 'Unified centralized log of all cross-gate computer and electronic device movements.'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
          >
            <option value="ALL">All Actions (In & Out)</option>
            <option value="CHECK_IN">Check-Ins (Entering)</option>
            <option value="CHECK_OUT">Check-Outs (Exiting)</option>
          </select>

          <select
            value={filterGate}
            onChange={(e) => setFilterGate(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
          >
            <option value="ALL">All Gates (Unified)</option>
            {gates.map((g) => (
              <option key={g.id} value={g.id}>
                {language === 'am' ? g.nameAmharic : g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by serial number, asset ID, student name, or model..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-600 shadow-xs"
        />
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Movement Action</th>
                <th className="px-4 py-3">Device & Serial</th>
                <th className="px-4 py-3">Student / Owner</th>
                <th className="px-4 py-3">Gate Station</th>
                <th className="px-4 py-3">Officer</th>
                <th className="px-4 py-3">Cross-Gate Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No transactions matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => {
                  const isIn = mov.type === 'CHECK_IN';
                  return (
                    <tr key={mov.id} className="hover:bg-purple-50/40 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {mov.timestamp}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isIn
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          }`}
                        >
                          {isIn ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                          )}
                          {isIn ? t('checkIns') : t('checkOuts')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 text-purple-700" />
                          <span>{mov.deviceModel}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {mov.deviceAssetId} • S/N: {mov.deviceSerial}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{mov.ownerName}</div>
                        <div className="text-[11px] font-mono text-purple-900">{mov.ownerStudentId}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-purple-700" />
                          <span>{language === 'am' && mov.gateNameAmharic ? mov.gateNameAmharic : mov.gateName}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {mov.officerBadge}
                      </td>
                      <td className="px-4 py-3.5">
                        {mov.crossGateNote ? (
                          <span className="inline-block bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-medium">
                            {mov.crossGateNote}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
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
