'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { CheckCircle2, Clock3, Plus, QrCode, RefreshCw, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ApiError } from '../../services/api';
import {
  ClearancePassState,
  cancelBelongingsClearanceApi,
  createBelongingsClearanceApi,
  listStudentClearancesApi,
} from '../../services/belongingsClearanceService';
import type { BelongingsClearance as ClearanceRequest } from '../../services/belongingsClearanceService';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

type ItemDraft = { key: number; item_name: string; quantity: number };

const commonItems = ['Clothes', 'T-shirts', 'Trousers', 'Shoes'];

function localDateTimeMinimum(): string {
  const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function passLabel(state: ClearancePassState): string {
  return state.replace(/_/g, ' ');
}

export function BelongingsClearance() {
  const { currentStudent, showToast } = useApp();
  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dormitory, setDormitory] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [exitAt, setExitAt] = useState('');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([{ key: 1, item_name: '', quantity: 1 }]);
  const [nextItemKey, setNextItemKey] = useState(2);
  const [qrRequest, setQrRequest] = useState<ClearanceRequest | null>(null);
  const [qrImage, setQrImage] = useState('');
  const submissionKey = useRef<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await listStudentClearancesApi());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load belongings clearances.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRequests(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRequests]);

  useEffect(() => {
    let isCurrent = true;
    if (qrRequest?.pass_token) {
      QRCode.toDataURL(qrRequest.pass_token, {
        width: 280,
        margin: 2,
        color: { dark: '#0F172A', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      }).then((dataUrl) => {
        if (isCurrent) setQrImage(dataUrl);
      }).catch(() => {
        if (isCurrent) setError('Unable to generate the clearance QR code. Refresh and try again.');
      });
    }
    return () => { isCurrent = false; };
  }, [qrRequest]);

  const updateItem = (key: number, field: 'item_name' | 'quantity', value: string) => {
    setItems((current) => current.map((item) => {
      if (item.key !== key) return item;
      return field === 'item_name'
        ? { ...item, item_name: value }
        : { ...item, quantity: Number(value) };
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedItems = items.map(({ item_name, quantity }) => ({
      item_name: item_name.trim(),
      quantity,
    }));
    if (normalizedItems.some((item) => !item.item_name || !Number.isInteger(item.quantity) || item.quantity < 1)) {
      setError('Enter an item name and a positive whole-number quantity for every row.');
      return;
    }
    const uniqueNames = new Set(normalizedItems.map((item) => item.item_name.toLocaleLowerCase()));
    if (uniqueNames.size !== normalizedItems.length) {
      setError('Use one row per unique item name.');
      return;
    }
    const exitDate = new Date(exitAt);
    if (!exitAt || Number.isNaN(exitDate.getTime()) || exitDate <= new Date()) {
      setError('Choose an intended exit date and time in the future.');
      return;
    }

    setSubmitting(true);
    setError(null);
    submissionKey.current ??= crypto.randomUUID();
    try {
      const created = await createBelongingsClearanceApi({
        submission_key: submissionKey.current,
        dormitory: dormitory.trim(),
        room_number: roomNumber.trim() || null,
        intended_exit_at: exitDate.toISOString(),
        remarks: remarks.trim() || null,
        items: normalizedItems,
      });
      setRequests((current) => [created, ...current]);
      setDormitory('');
      setRoomNumber('');
      setExitAt('');
      setRemarks('');
      setItems([{ key: nextItemKey, item_name: '', quantity: 1 }]);
      setNextItemKey((key) => key + 1);
      submissionKey.current = null;
      showToast(`Clearance request ${created.reference} submitted.`, 'success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit the clearance request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (request: ClearanceRequest) => {
    if (!window.confirm(`Cancel request ${request.reference}?`)) return;
    try {
      const updated = await cancelBelongingsClearanceApi(request.id, 'Cancelled by student.');
      setRequests((current) => current.map((item) => item.id === updated.id ? updated : item));
      showToast(`Request ${updated.reference} cancelled.`, 'info');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to cancel the request.', 'error');
    }
  };

  const statusClass = (state: string) => {
    if (state === 'APPROVED' || state === 'ACTIVE') return 'border-[var(--cg-success-border)] bg-[var(--cg-success-bg)] text-[var(--cg-success)]';
    if (state === 'REJECTED' || state === 'REVOKED' || state === 'EXPIRED') return 'border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] text-[var(--cg-danger)]';
    return 'border-[var(--cg-border)] bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)]';
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)] sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-bold text-[var(--cg-text)]">Request belongings exit clearance</h2>
          <p className="mt-1 text-sm text-[var(--cg-text-muted)]">
            This is an exit-only declaration. Your identity is taken from your signed-in account.
          </p>
        </div>

        <div className="mb-5 grid gap-3 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-4 text-sm sm:grid-cols-3">
          <div><span className="block text-xs text-[var(--cg-text-muted)]">Student</span><strong>{currentStudent.name}</strong></div>
          <div><span className="block text-xs text-[var(--cg-text-muted)]">Student ID</span><strong className="font-mono">{currentStudent.studentId}</strong></div>
          <div><span className="block text-xs text-[var(--cg-text-muted)]">Department</span><strong>{currentStudent.department}</strong></div>
        </div>

        {error && <div role="alert" className="mb-4 rounded-xl border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-3 text-sm text-[var(--cg-danger)]">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-semibold text-[var(--cg-text)]">
              Dormitory or residence *
              <input required maxLength={255} value={dormitory} onChange={(event) => setDormitory(event.target.value)}
                className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--cg-primary)]" />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-[var(--cg-text)]">
              Room number <span className="font-normal text-[var(--cg-text-muted)]">(optional)</span>
              <input maxLength={50} value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)}
                className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--cg-primary)]" />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-[var(--cg-text)] sm:col-span-2">
              Intended exit date and approximate time *
              <input required type="datetime-local" min={localDateTimeMinimum()} value={exitAt} onChange={(event) => setExitAt(event.target.value)}
                className="h-11 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--cg-primary)] sm:max-w-md" />
            </label>
          </div>

          <fieldset className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <legend className="text-xs font-semibold text-[var(--cg-text)]">Belongings to declare *</legend>
              <Button type="button" variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />}
                disabled={items.length >= 100}
                onClick={() => {
                  setItems((current) => [...current, { key: nextItemKey, item_name: '', quantity: 1 }]);
                  setNextItemKey((key) => key + 1);
                }}>
                Add item
              </Button>
            </div>
            <datalist id="common-belongings">
              {commonItems.map((name) => <option key={name} value={name} />)}
              <option value="Other" />
            </datalist>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={item.key} className="grid grid-cols-[1fr_6rem_auto] items-end gap-2">
                  <label className="space-y-1 text-[11px] font-medium text-[var(--cg-text-muted)]">
                    Item {index + 1}
                    <input required list="common-belongings" maxLength={100} value={item.item_name}
                      onChange={(event) => updateItem(item.key, 'item_name', event.target.value)}
                      placeholder="e.g. Shoes"
                      className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm text-[var(--cg-text)] outline-none focus:border-[var(--cg-primary)]" />
                  </label>
                  <label className="space-y-1 text-[11px] font-medium text-[var(--cg-text-muted)]">
                    Quantity
                    <input required type="number" min={1} max={9999} step={1} value={item.quantity}
                      onChange={(event) => updateItem(item.key, 'quantity', event.target.value)}
                      className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm text-[var(--cg-text)] outline-none focus:border-[var(--cg-primary)]" />
                  </label>
                  <button type="button" aria-label={`Remove item ${index + 1}`} disabled={items.length === 1}
                    onClick={() => setItems((current) => current.filter((row) => row.key !== item.key))}
                    className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--cg-border)] text-[var(--cg-text-muted)] hover:bg-[var(--cg-danger-bg)] hover:text-[var(--cg-danger)] disabled:cursor-not-allowed disabled:opacity-40">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </fieldset>

          <label className="block space-y-1.5 text-xs font-semibold text-[var(--cg-text)]">
            Remarks <span className="font-normal text-[var(--cg-text-muted)]">(optional)</span>
            <textarea maxLength={2000} rows={3} value={remarks} onChange={(event) => setRemarks(event.target.value)}
              className="w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 py-2 text-sm font-normal outline-none focus:border-[var(--cg-primary)]" />
          </label>
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting} icon={submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}>
              {submitting ? 'Submitting request…' : 'Submit clearance request'}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--cg-text)]">My clearance requests</h2>
            <p className="text-sm text-[var(--cg-text-muted)]">Review decisions, validity and completed exits.</p>
          </div>
          <button type="button" onClick={() => void loadRequests()} disabled={loading} aria-label="Refresh clearance requests"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--cg-border)] text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)] disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {loading ? (
          <p role="status" className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 text-sm text-[var(--cg-text-muted)]">Loading your requests…</p>
        ) : requests.length === 0 ? (
          <EmptyState title="No clearance requests yet" description="Submit an exit clearance request when you need to leave with declared belongings." />
        ) : (
          requests.map((request) => (
            <article key={request.id} className="space-y-4 rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-4 shadow-[var(--cg-shadow-sm)] sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold text-[var(--cg-primary)]">{request.reference}</p>
                  <p className="mt-1 text-xs text-[var(--cg-text-muted)]">
                    Intended exit {new Date(request.intended_exit_at).toLocaleString()} · {request.dormitory}{request.room_number ? `, Room ${request.room_number}` : ''}
                  </p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass(request.status)}`}>{request.status}</span>
              </div>
              <ul className="grid gap-1 text-sm text-[var(--cg-text)] sm:grid-cols-2">
                {request.items.map((item) => <li key={item.id}>{item.item_name} <span className="text-[var(--cg-text-muted)]">× {item.quantity}</span></li>)}
              </ul>
              {request.status === 'REJECTED' && request.decision_reason && (
                <p className="rounded-lg border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-3 text-sm text-[var(--cg-danger)]">
                  Rejection reason: {request.decision_reason}
                </p>
              )}
              {request.status === 'APPROVED' && (
                <div className="rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--cg-text)]">Approved by {request.proctor_name ?? 'Proctor'}</p>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass(request.pass_state)}`}>
                      Pass {passLabel(request.pass_state)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--cg-text-muted)]">
                    Approved {request.decided_at ? new Date(request.decided_at).toLocaleString() : '—'}
                    {request.pass_expires_at ? ` · Expires ${new Date(request.pass_expires_at).toLocaleString()}` : ''}
                    {request.pass_used_at ? ` · Used ${new Date(request.pass_used_at).toLocaleString()}` : ''}
                  </p>
                  {request.pass_revocation_reason && <p className="mt-2 text-sm text-[var(--cg-danger)]">Revoked: {request.pass_revocation_reason}</p>}
                  {request.pass_token && request.pass_state !== 'REVOKED' && request.pass_state !== 'EXPIRED' && (
                    <button type="button" onClick={() => { setQrImage(''); setQrRequest(request); setError(null); }}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--cg-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--cg-primary-hover)]">
                      <QrCode className="h-4 w-4" /> Show digital pass
                    </button>
                  )}
                  {request.pass_state === 'ACTIVE' && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--cg-success)]"><Clock3 className="h-3.5 w-3.5" />Present this pass to a Gate Officer before the expiry time.</p>
                  )}
                </div>
              )}
              {request.status === 'PENDING' && (
                <button type="button" onClick={() => void handleCancel(request)}
                  className="rounded-lg border border-[var(--cg-border)] px-3 py-2 text-xs font-semibold text-[var(--cg-text-muted)] hover:border-[var(--cg-danger-border)] hover:text-[var(--cg-danger)]">
                  Cancel pending request
                </button>
              )}
            </article>
          ))
        )}
        {error && requests.length > 0 && <p role="alert" className="text-sm text-[var(--cg-danger)]">{error}</p>}
      </section>

      {qrRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="clearance-pass-title" className="w-full max-w-md rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-card)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="clearance-pass-title" className="text-base font-bold text-[var(--cg-text)]">Belongings exit pass</h2>
                <p className="mt-1 font-mono text-xs text-[var(--cg-primary)]">{qrRequest.reference}</p>
              </div>
              <button type="button" aria-label="Close pass" onClick={() => setQrRequest(null)} className="rounded-lg px-2 py-1 text-sm text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)]">Close</button>
            </div>
            <div className="mt-4 flex justify-center rounded-xl border border-[var(--cg-border)] bg-white p-3">
              {qrImage ? <Image src={qrImage} alt={`Secure QR code for clearance ${qrRequest.reference}`} width={256} height={256} unoptimized className="h-64 w-64" /> : <p role="status" className="py-24 text-sm text-[var(--cg-text-muted)]">Generating secure QR pass…</p>}
            </div>
            <p className="mt-3 text-center text-xs text-[var(--cg-text-muted)]">
              Valid until {qrRequest.pass_expires_at ? new Date(qrRequest.pass_expires_at).toLocaleString() : '—'}.
              The Gate Officer will verify this pass online.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
