'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { AlertTriangle, Camera, CheckCircle2, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { ApiError } from '../../services/api';
import {
  BelongingsClearance,
  ClearanceLookup,
  GateClearanceLookup,
  lookupGateClearanceApi,
  recordBelongingsExitApi,
  reportBelongingsDiscrepancyApi,
} from '../../services/belongingsClearanceService';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';

function asLookup(value: string): ClearanceLookup {
  const normalized = value.trim();
  return normalized.startsWith('CGC1.')
    ? { token: normalized }
    : { reference: normalized.toUpperCase() };
}

export function BelongingsClearanceScanner() {
  const { currentGate, showToast } = useApp();
  const [query, setQuery] = useState('');
  const [lookup, setLookup] = useState<ClearanceLookup | null>(null);
  const [result, setResult] = useState<GateClearanceLookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [discrepancyReason, setDiscrepancyReason] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const validate = useCallback(async (value: string) => {
    if (!value.trim()) {
      setError('Enter a clearance reference or scan the digital pass.');
      return;
    }
    const searchValue = asLookup(value);
    setLoading(true);
    setError(null);
    setResult(null);
    setLookup(searchValue);
    setIdentityVerified(false);
    setDiscrepancyReason('');
    try {
      setResult(await lookupGateClearanceApi(searchValue));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to validate this clearance pass.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cameraEnabled || !videoRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      let active = true;
      Promise.resolve().then(() => {
        if (!active) return;
        setCameraError('Camera access is not available in this browser. Use the manual reference lookup instead.');
        setCameraEnabled(false);
      });
      return () => { active = false; };
    }

    let active = true;
    let controls: { stop: () => void } | undefined;
    let hasDecoded = false;
    const reader = new BrowserQRCodeReader();
    const video = videoRef.current;
    reader.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' } }, audio: false },
      video,
      (decoded, _scanError, activeControls) => {
        controls = activeControls;
        if (!active || hasDecoded || !decoded) return;
        hasDecoded = true;
        activeControls.stop();
        setCameraEnabled(false);
        const raw = decoded.getText();
        setQuery(raw);
        void validate(raw);
      },
    ).then((activeControls) => {
      controls = activeControls;
      if (!active) activeControls.stop();
    }).catch((scanError: unknown) => {
      if (!active) return;
      const name = scanError instanceof DOMException ? scanError.name : '';
      setCameraError(name === 'NotAllowedError'
        ? 'Camera permission is blocked. Allow access in browser settings or use manual lookup.'
        : name === 'NotFoundError'
          ? 'No camera was found on this device. Use manual lookup.'
          : 'Unable to start the camera. Use manual lookup instead.');
      setCameraEnabled(false);
    });

    return () => {
      active = false;
      controls?.stop();
    };
  }, [cameraEnabled, cameraAttempt, validate]);

  const refresh = async () => {
    if (!lookup) return;
    const value = lookup.token ?? lookup.reference ?? '';
    await validate(value);
  };

  const recordExit = async () => {
    if (!lookup || !identityVerified) return;
    setLoading(true);
    setError(null);
    try {
      await recordBelongingsExitApi(lookup);
      showToast('Student exit recorded. This clearance pass has been used.', 'success');
      await refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to record this exit.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const flagDiscrepancy = async () => {
    if (!lookup || discrepancyReason.trim().length < 3) {
      setError('Describe the discrepancy before refusing the clearance.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await reportBelongingsDiscrepancyApi(lookup, discrepancyReason.trim());
      showToast('Clearance revoked and discrepancy recorded as an incident.', 'warning');
      setDiscrepancyReason('');
      await refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to record the discrepancy.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearance: BelongingsClearance | undefined = result?.clearance;

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cg-primary)]">Belongings clearance</p>
        <h1 className="mt-1 text-xl font-bold text-[var(--cg-text)]">Verify an exit pass</h1>
        <p className="mt-1 text-sm text-[var(--cg-text-muted)]">Assigned gate: {currentGate.name}. Device verification remains separate.</p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-5 shadow-[var(--cg-shadow-sm)] lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-[var(--cg-border)] bg-slate-950">
            <video ref={videoRef} autoPlay playsInline muted className="h-64 w-full object-cover" />
            {!cameraEnabled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 p-5 text-center text-sm text-white">
                <Camera className="h-7 w-7" />
                <span>Use your camera to scan a belongings clearance QR code.</span>
                <Button type="button" variant="secondary" size="sm" onClick={() => { setCameraError(null); setCameraEnabled(true); setCameraAttempt((value) => value + 1); }}>
                  Start camera
                </Button>
              </div>
            )}
          </div>
          {cameraError && <p role="alert" className="text-xs text-[var(--cg-danger)]">{cameraError}</p>}
        </div>

        <div className="flex flex-col justify-center gap-3">
          <form onSubmit={(event) => { event.preventDefault(); void validate(query); }} className="space-y-2">
            <label htmlFor="clearance-lookup" className="text-xs font-semibold text-[var(--cg-text)]">Manual request or pass reference</label>
            <div className="flex gap-2">
              <input id="clearance-lookup" value={query} onChange={(event) => setQuery(event.target.value)}
                placeholder="BEX-… or scan token"
                className="h-11 min-w-0 flex-1 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 text-sm font-mono outline-none focus:border-[var(--cg-primary)]" />
              <Button type="submit" disabled={loading} icon={<Search className="h-4 w-4" />}>Verify</Button>
            </div>
          </form>
          {error && <p role="alert" className="rounded-lg border border-[var(--cg-danger-border)] bg-[var(--cg-danger-bg)] p-3 text-sm text-[var(--cg-danger)]">{error}</p>}
        </div>
      </section>

      {result && clearance && (
        <section className={`space-y-4 rounded-2xl border p-5 shadow-[var(--cg-shadow-sm)] ${result.is_valid ? 'border-[var(--cg-success-border)] bg-[var(--cg-surface)]' : 'border-[var(--cg-danger-border)] bg-[var(--cg-surface)]'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {result.is_valid ? <ShieldCheck className="mt-0.5 h-5 w-5 text-[var(--cg-success)]" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-[var(--cg-danger)]" />}
              <div>
                <h2 className="text-lg font-bold text-[var(--cg-text)]">{result.is_valid ? 'Valid clearance pass' : 'Clearance is not valid'}</h2>
                <p className={`mt-1 text-sm ${result.is_valid ? 'text-[var(--cg-success)]' : 'text-[var(--cg-danger)]'}`}>{result.validation_message}</p>
              </div>
            </div>
            <button type="button" onClick={() => void refresh()} disabled={loading} aria-label="Refresh pass status" className="rounded-lg border border-[var(--cg-border)] p-2 text-[var(--cg-text-muted)] hover:bg-[var(--cg-surface-muted)]">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <dl className="space-y-2 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-4 text-sm">
              <div><dt className="text-xs text-[var(--cg-text-muted)]">Student</dt><dd className="font-semibold">{clearance.student_name}</dd></div>
              <div><dt className="text-xs text-[var(--cg-text-muted)]">Student ID</dt><dd className="font-mono font-semibold">{clearance.student_campus_id ?? 'Not set'}</dd></div>
              <div><dt className="text-xs text-[var(--cg-text-muted)]">Request</dt><dd className="font-mono font-semibold text-[var(--cg-primary)]">{clearance.reference}</dd></div>
              <div><dt className="text-xs text-[var(--cg-text-muted)]">Residence / room</dt><dd>{clearance.dormitory}{clearance.room_number ? ` · ${clearance.room_number}` : ''}</dd></div>
              <div><dt className="text-xs text-[var(--cg-text-muted)]">Approving proctor</dt><dd>{clearance.proctor_name ?? '—'}</dd></div>
              <div><dt className="text-xs text-[var(--cg-text-muted)]">Approved</dt><dd>{clearance.decided_at ? new Date(clearance.decided_at).toLocaleString() : '—'}</dd></div>
              <div><dt className="text-xs text-[var(--cg-text-muted)]">Expires</dt><dd>{clearance.pass_expires_at ? new Date(clearance.pass_expires_at).toLocaleString() : '—'}</dd></div>
              {clearance.pass_used_at && <div><dt className="text-xs text-[var(--cg-text-muted)]">Used</dt><dd>{new Date(clearance.pass_used_at).toLocaleString()}</dd></div>}
              {clearance.pass_revocation_reason && <div><dt className="text-xs text-[var(--cg-text-muted)]">Revocation reason</dt><dd className="text-[var(--cg-danger)]">{clearance.pass_revocation_reason}</dd></div>}
            </dl>
            <div className="rounded-xl border border-[var(--cg-border)] p-4">
              <h3 className="text-sm font-bold text-[var(--cg-text)]">Approved belongings</h3>
              <ul className="mt-2 divide-y divide-[var(--cg-border)]">
                {clearance.items.map((item) => <li key={item.id} className="flex justify-between py-2 text-sm"><span>{item.item_name}</span><span className="font-mono text-[var(--cg-text-muted)]">× {item.quantity}</span></li>)}
              </ul>
              {clearance.remarks && <p className="mt-3 border-t border-[var(--cg-border)] pt-3 text-xs text-[var(--cg-text-muted)]">Remarks: {clearance.remarks}</p>}
            </div>
          </div>

          {result.is_valid && (
            <div className="space-y-4 border-t border-[var(--cg-border)] pt-4">
              <label className="flex items-start gap-2 text-sm text-[var(--cg-text)]">
                <input type="checkbox" checked={identityVerified} onChange={(event) => setIdentityVerified(event.target.checked)} className="mt-0.5 accent-[var(--cg-primary)]" />
                I verified the student&apos;s identity and compared the belongings with this approved declaration.
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <label className="flex-1 space-y-1.5 text-xs font-semibold text-[var(--cg-text)]">
                  Record discrepancy / refuse exit
                  <textarea value={discrepancyReason} onChange={(event) => setDiscrepancyReason(event.target.value)} maxLength={2000} rows={2}
                    placeholder="Enter a reason only if the declaration does not match."
                    className="w-full rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 py-2 text-sm font-normal outline-none focus:border-[var(--cg-primary)]" />
                </label>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="secondary" disabled={loading || discrepancyReason.trim().length < 3} icon={<AlertTriangle className="h-4 w-4" />} onClick={() => void flagDiscrepancy()}>
                    Refuse and flag
                  </Button>
                  <Button type="button" disabled={loading || !identityVerified} icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => void recordExit()}>
                    Record student exit
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
