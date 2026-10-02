import React, { useState, useEffect, useCallback } from 'react';
import { ArrowDownLeft, ArrowUpRight, Search, MapPin, Laptop, Loader2, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { listMovementsApi, DeviceMovementRead } from '../../services/movementService';
import { ApiError } from '../../services/api';

export const GateTransactions: React.FC = () => {
  const { t, language } = useApp();
  const [filterType, setFilterType] = useState<'ALL' | 'CHECK_IN' | 'CHECK_OUT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [movements, setMovements] = useState<DeviceMovementRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await listMovementsApi(
        filterType !== 'ALL' ? { movement_type: filterType } : {}
      );
      setMovements(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { load(); }, [load]);

  const filtered = searchQuery
    ? movements.filter((m) => {
        const q = searchQuery.toLowerCase();
        return (
          m.device_id.toLowerCase().includes(q) ||
          m.gate_id.toLowerCase().includes(q) ||
          m.officer_id.toLowerCase().includes(q) ||
          m.movement_type.toLowerCase().includes(q)
        );
      })
    : movements;

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
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 h-9 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-[var(--cg-text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by device ID, gate ID, officer ID…"
          className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] pl-10 pr-4 text-xs text-[var(--cg-text)] focus:border-[var(--cg-primary)] focus:outline-none"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-4 text-sm text-[var(--cg-danger)]">
          {error}
          <button onClick={load} className="ml-3 underline text-xs">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--cg-surface-muted)] border-b border-[var(--cg-border)]">
              <tr>
                {['Timestamp', 'Action', 'Device ID', 'Gate ID', 'Officer ID', 'Notes'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cg-border)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-[var(--cg-primary)]" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--cg-text-muted)]">
                    No transactions match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((mov) => {
                  const isIn = mov.movement_type === 'CHECK_IN';
                  const ts = new Date(mov.occurred_at).toLocaleString();
                  return (
                    <tr key={mov.id} className="hover:bg-[var(--cg-surface-muted)] transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--cg-text-muted)] whitespace-nowrap">{ts}</td>
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
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--cg-text)]">
                          <Laptop className="h-3.5 w-3.5 text-[var(--cg-primary)] shrink-0" />
                          {mov.device_id.slice(0, 8)}…
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1 font-mono text-[11px] text-[var(--cg-text)]">
                          <MapPin className="h-3 w-3 text-[var(--cg-text-muted)]" />
                          {mov.gate_id.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--cg-text-muted)] whitespace-nowrap">
                        {mov.officer_id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 text-[var(--cg-text-muted)] max-w-[160px] truncate">
                        {mov.notes ?? '—'}
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
