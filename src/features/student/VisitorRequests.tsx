import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Plus, QrCode, RefreshCw, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ApiError } from '../../services/api';
import {
  BackendIdentificationType,
  createVisitApi,
  listVisitsApi,
  VisitRead,
} from '../../services/visitService';
import { EmptyState } from '../../components/ui/EmptyState';

function toLocalDateTime(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export const VisitorRequests: React.FC = () => {
  const { authUser, showToast } = useApp();
  const userId = authUser?.id;
  const [visits, setVisits] = useState<VisitRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPass, setSelectedPass] = useState<VisitRead | null>(null);
  const [qrResult, setQrResult] = useState<{ value: string; image: string | null; error: string | null } | null>(null);
  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [identificationType, setIdentificationType] = useState<BackendIdentificationType>('NATIONAL_ID');
  const [identificationNumber, setIdentificationNumber] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expectedStart, setExpectedStart] = useState(() => toLocalDateTime(new Date(Date.now() + 60 * 60_000)));
  const [expectedEnd, setExpectedEnd] = useState(() => toLocalDateTime(new Date(Date.now() + 3 * 60 * 60_000)));

  const loadVisits = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setLoadError(null);
    try {
      setVisits(await listVisitsApi({ host_user_id: userId }));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load visitor requests.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void loadVisits(); }, [loadVisits]);

  useEffect(() => {
    let current = true;
    const qrCodeValue = selectedPass?.qr_code_value;
    if (qrCodeValue) {
      QRCode.toDataURL(qrCodeValue, {
        width: 280,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#0F172A', light: '#ffffff' },
      }).then((image) => {
        if (current) setQrResult({ value: qrCodeValue, image, error: null });
      }).catch(() => {
        if (current) setQrResult({ value: qrCodeValue, image: null, error: 'Unable to generate the visitor QR pass.' });
      });
    }
    return () => { current = false; };
  }, [selectedPass]);

  const resetForm = () => {
    setVisitorName('');
    setPhone('');
    setIdentificationType('NATIONAL_ID');
    setIdentificationNumber('');
    setPurpose('');
    setExpectedStart(toLocalDateTime(new Date(Date.now() + 60 * 60_000)));
    setExpectedEnd(toLocalDateTime(new Date(Date.now() + 3 * 60 * 60_000)));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      showToast('Your session has expired. Please sign in again.', 'error');
      return;
    }
    if (new Date(expectedEnd) <= new Date(expectedStart)) {
      showToast('Expected departure must be after expected arrival.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await createVisitApi({
        visitor: {
          full_name: visitorName.trim(),
          phone: phone.trim() || undefined,
          identification_type: identificationType,
          identification_number: identificationNumber.trim(),
          purpose: purpose.trim() || undefined,
        },
        host_user_id: userId,
        expected_start_at: new Date(expectedStart).toISOString(),
        expected_end_at: new Date(expectedEnd).toISOString(),
      });
      showToast('Visitor request submitted for administrator review.', 'success');
      setShowForm(false);
      resetForm();
      await loadVisits();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to submit visitor request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const statusClasses: Record<VisitRead['status'], string> = {
    PENDING: 'border-sky-200 bg-sky-50 text-sky-800',
    APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    REJECTED: 'border-rose-200 bg-rose-50 text-rose-800',
    CHECKED_IN: 'border-amber-200 bg-amber-50 text-amber-800',
    CHECKED_OUT: 'border-slate-200 bg-slate-50 text-slate-700',
    EXPIRED: 'border-rose-200 bg-rose-50 text-rose-800',
    CANCELLED: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--cg-text)]">Visitor requests</h2>
          <p className="mt-1 text-sm text-[var(--cg-text-muted)]">Request a visitor pass and track its approval and campus entry status.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadVisits()} disabled={loading}
            className="rounded-lg border border-[var(--cg-border)] px-3 py-2 text-[var(--cg-text-muted)] disabled:opacity-60" aria-label="Refresh visitor requests">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--cg-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--cg-primary-hover)]">
            <Plus className="h-4 w-4" /> Request pass
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="rounded-xl border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-4 text-sm text-[var(--cg-danger)]">
          {loadError}
          <button type="button" onClick={() => void loadVisits()} className="ml-3 underline">Retry</button>
        </div>
      )}
      {loading ? (
        <p role="status" className="py-10 text-center text-sm text-[var(--cg-text-muted)]">Loading visitor requests…</p>
      ) : loadError ? null : visits.length === 0 ? (
        <EmptyState title="No visitor requests yet" description="Your submitted requests and approved passes will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visits.map((visit) => (
            <article key={visit.id} className="space-y-3 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--cg-text)]">{visit.visitor.full_name}</h3>
                  <p className="mt-1 text-xs text-[var(--cg-text-muted)]">{visit.visitor.purpose || 'No purpose provided'}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClasses[visit.status]}`}>
                  {visit.status.replace(/_/g, ' ')}
                </span>
              </div>
              <dl className="space-y-2 rounded-lg bg-[var(--cg-surface-muted)] p-3 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--cg-text-muted)]">Identification</dt>
                  <dd className="text-right font-mono text-[var(--cg-text)]">{visit.visitor.identification_type.replace(/_/g, ' ')} · {visit.visitor.identification_number}</dd>
                </div>
                {visit.visitor.phone && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--cg-text-muted)]">Phone</dt>
                    <dd className="text-[var(--cg-text)]">{visit.visitor.phone}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--cg-text-muted)]">Arrival</dt>
                  <dd className="text-right text-[var(--cg-text)]">{new Date(visit.expected_start_at).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--cg-text-muted)]">Departure</dt>
                  <dd className="text-right text-[var(--cg-text)]">{new Date(visit.expected_end_at).toLocaleString()}</dd>
                </div>
              </dl>
              {visit.status === 'APPROVED' && visit.qr_code_value && (
                <button type="button" onClick={() => setSelectedPass(visit)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--cg-primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--cg-primary-hover)]">
                  <QrCode className="h-4 w-4" /> Show visitor pass
                </button>
              )}
              {visit.status === 'PENDING' && <p className="text-xs text-[var(--cg-text-muted)]">Waiting for administrator review.</p>}
              {visit.status === 'REJECTED' && <p className="text-xs text-[var(--cg-danger)]">This request was not approved.</p>}
              {(visit.checked_in_at || visit.checked_out_at) && (
                <p className="text-xs text-[var(--cg-text-muted)]">
                  {visit.checked_in_at ? `Checked in ${new Date(visit.checked_in_at).toLocaleString()}` : ''}
                  {visit.checked_out_at ? ` · Checked out ${new Date(visit.checked_out_at).toLocaleString()}` : ''}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="visitor-request-title" className="my-auto w-full max-w-xl rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-card)]">
            <div className="flex items-center justify-between border-b border-[var(--cg-border)] px-5 py-4">
              <h2 id="visitor-request-title" className="font-semibold text-[var(--cg-text)]">Request a visitor pass</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Close" className="rounded p-1 text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)]"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <label className="block space-y-1 text-xs font-semibold text-[var(--cg-text-muted)]">
                Visitor full name *
                <input required maxLength={255} value={visitorName} onChange={(event) => setVisitorName(event.target.value)}
                  className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm text-[var(--cg-text)]" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-xs font-semibold text-[var(--cg-text-muted)]">
                  Identification type *
                  <select value={identificationType} onChange={(event) => setIdentificationType(event.target.value as BackendIdentificationType)}
                    className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm text-[var(--cg-text)]">
                    <option value="NATIONAL_ID">National ID</option><option value="PASSPORT">Passport</option>
                    <option value="DRIVER_LICENSE">Driver license</option><option value="OTHER">Other</option>
                  </select>
                </label>
                <label className="block space-y-1 text-xs font-semibold text-[var(--cg-text-muted)]">
                  Identification number *
                  <input required maxLength={100} value={identificationNumber} onChange={(event) => setIdentificationNumber(event.target.value)}
                    className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm text-[var(--cg-text)]" />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-xs font-semibold text-[var(--cg-text-muted)]">
                  Phone
                  <input type="tel" maxLength={50} value={phone} onChange={(event) => setPhone(event.target.value)}
                    className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm text-[var(--cg-text)]" />
                </label>
                <label className="block space-y-1 text-xs font-semibold text-[var(--cg-text-muted)]">
                  Purpose
                  <input maxLength={500} value={purpose} onChange={(event) => setPurpose(event.target.value)}
                    className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm text-[var(--cg-text)]" />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-xs font-semibold text-[var(--cg-text-muted)]">
                  Expected arrival *
                  <input required type="datetime-local" value={expectedStart} onChange={(event) => setExpectedStart(event.target.value)}
                    className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm text-[var(--cg-text)]" />
                </label>
                <label className="block space-y-1 text-xs font-semibold text-[var(--cg-text-muted)]">
                  Expected departure *
                  <input required type="datetime-local" min={expectedStart} value={expectedEnd} onChange={(event) => setExpectedEnd(event.target.value)}
                    className="h-10 w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm text-[var(--cg-text)]" />
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-[var(--cg-border)] pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm text-[var(--cg-text-muted)]">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-[var(--cg-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {submitting ? 'Submitting…' : 'Submit request'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="visitor-pass-title" className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="visitor-pass-title" className="font-semibold text-slate-900">Approved visitor pass</h2>
              <button type="button" onClick={() => setSelectedPass(null)} aria-label="Close visitor pass"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm font-semibold text-slate-900">{selectedPass.visitor.full_name}</p>
            <p className="mb-3 text-xs text-slate-600">{new Date(selectedPass.expected_start_at).toLocaleString()}</p>
            {qrResult?.value === selectedPass.qr_code_value && qrResult.image
              ? <img src={qrResult.image} alt="Visitor pass QR code" className="mx-auto h-56 w-56" />
              : null}
            {qrResult?.value === selectedPass.qr_code_value && qrResult.error
              ? <p role="alert" className="text-sm text-rose-700">{qrResult.error}</p>
              : null}
            {qrResult?.value !== selectedPass.qr_code_value
              ? <p role="status" className="text-sm text-slate-600">Generating QR pass…</p>
              : null}
            <p className="mt-3 font-mono text-xs text-slate-700">{selectedPass.qr_code_value}</p>
            <p className="mt-2 text-xs text-slate-500">Show this pass and your identification to the gate officer.</p>
          </section>
        </div>
      )}
    </div>
  );
};
