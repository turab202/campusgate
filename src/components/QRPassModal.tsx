import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck, Printer, Download, X, Laptop, CheckCircle2 } from 'lucide-react';
import { Device } from '../types';
import { useApp } from '../context/AppContext';

interface QRPassModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QRPassModal: React.FC<QRPassModalProps> = ({ device, isOpen, onClose }) => {
  const { t, language } = useApp();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (device && isOpen) {
      QRCode.toDataURL(device.assetId, {
        width: 320,
        margin: 2,
        color: { dark: '#0F172A', light: '#ffffff' },
        errorCorrectionLevel: 'H'
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [device, isOpen]);

  if (!isOpen || !device) return null;

  const handlePrint = () => window.print();

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${device.assetId}-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-2 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-pass-title"
        className="relative my-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-card)] sm:max-h-[calc(100dvh-2rem)]"
      >

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cg-border)] bg-[var(--cg-primary)] px-5 py-4 no-print">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 id="device-pass-title" className="font-semibold text-base text-white">
                {language === 'am' ? 'የመሳሪያ QR መለያ' : 'Device Identity Pass'}
              </h3>
              <p className="text-[11px] text-white/70 font-mono">{device.assetId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Printable body */}
        <div className="min-h-0 overflow-y-auto p-4 printable-area sm:p-6">
          {/* Institution header */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cg-border)] pb-4">
            <div className="min-w-0">
              <span className="block font-semibold text-sm text-[var(--cg-text)]">CampusGate Access Registry</span>
              <span className="block text-[11px] text-[var(--cg-text-muted)]">
                {language === 'am' ? 'የተረጋገጠ የግል ኤሌክትሮኒክስ መለያ' : 'Authorized University Personal Device Pass'}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--cg-success)]">
              <CheckCircle2 className="h-3 w-3" />
              VERIFIED
            </span>
          </div>

          {/* QR code */}
          <div className="mb-5 flex flex-col items-center rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3 sm:p-5">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for ${device.assetId}`}
                className="h-36 w-36 rounded-lg border border-[var(--cg-border)] bg-white p-2 sm:h-44 sm:w-44"
              />
            ) : (
              <div className="flex h-36 w-36 items-center justify-center rounded-lg border border-[var(--cg-border)] bg-white text-xs text-[var(--cg-text-muted)] sm:h-44 sm:w-44">
                Generating…
              </div>
            )}
            <div className="mt-3 text-center">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">
                {language === 'am' ? 'የመሳሪያ መለያ ቁጥር' : 'Permanent Asset Identifier'}
              </span>
              <span className="mt-1 inline-block max-w-full break-all rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-3 py-1 font-mono text-base font-semibold text-[var(--cg-text)] sm:text-lg">
                {device.assetId}
              </span>
            </div>
          </div>

          {/* Device details */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-3 text-xs sm:grid-cols-2 sm:p-4">
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">{t('deviceModel')}</span>
              <span className="mt-0.5 flex min-w-0 items-center gap-1 break-words font-semibold text-[var(--cg-text)]">
                <Laptop className="h-3.5 w-3.5 text-[var(--cg-primary)]" />
                {device.brand} {device.model}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">{t('serialNumber')}</span>
              <span className="mt-0.5 block break-all font-mono font-semibold text-[var(--cg-text)]">{device.serialNumber}</span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">{t('registeredOwner')}</span>
              <span className="mt-0.5 block break-words font-semibold text-[var(--cg-text)]">{device.ownerName}</span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">{t('studentId')}</span>
              <span className="mt-0.5 block break-all font-mono font-semibold text-[var(--cg-primary)]">{device.ownerStudentId}</span>
            </div>
            <div className="col-span-full flex flex-wrap items-center justify-between gap-2 border-t border-[var(--cg-border)] pt-2 text-[11px]">
              <span className="text-[var(--cg-text-muted)]">{t('currentStatus')}:</span>
              <span className="font-semibold text-[var(--cg-text)]">{device.status.replace(/_/g, ' ')}</span>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-[var(--cg-text-muted)]">
            {language === 'am'
              ? 'ይህ QR ኮድ መሳሪያው በሁሉም የካምፓስ በሮች ሲወጣና ሲገባ ለማረጋገጥ ያገለግላል።'
              : 'Scan at any campus gate during departure and return. Valid across all university gates.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--cg-border)] bg-[var(--cg-surface-muted)] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] no-print sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-2 py-2 text-xs font-semibold text-[var(--cg-text)] transition-colors hover:bg-[var(--cg-surface-muted)] sm:px-3"
            >
              <Printer className="h-3.5 w-3.5" />
              {t('printQr')}
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[var(--cg-border)] bg-[var(--cg-surface)] px-2 py-2 text-xs font-semibold text-[var(--cg-text)] transition-colors hover:bg-[var(--cg-surface-muted)] sm:px-3"
            >
              <Download className="h-3.5 w-3.5" />
              {t('downloadQr')}
            </button>
          </div>
          <button
            onClick={onClose}
            className="min-h-11 rounded-lg bg-[var(--cg-primary)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--cg-primary-hover)]"
          >
            {t('done')}
          </button>
        </div>
      </div>
    </div>
  );
};
