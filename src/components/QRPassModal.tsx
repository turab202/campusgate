import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Shield, Printer, Download, X, Laptop, CheckCircle2, Building2 } from 'lucide-react';
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
        color: {
          dark: '#3b0764', // Deep purple
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [device, isOpen]);

  if (!isOpen || !device) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${device.assetId}-QR-Pass.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-purple-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white p-5 flex items-center justify-between no-print">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-800/80 border border-purple-400/30 flex items-center justify-center text-purple-200">
              <Shield className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight tracking-wide text-white">
                {language === 'am' ? 'የመሳሪያ ዲጂታል QR መለያ' : 'CampusGate Device Identity'}
              </h3>
              <p className="text-xs text-purple-200 font-mono">
                {device.assetId} • {t('systemTitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-purple-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Pass Body */}
        <div className="p-6 printable-area bg-white text-slate-800">
          {/* Institutional Badge Header */}
          <div className="border-b border-purple-200 pb-4 mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-purple-800" />
              <div>
                <span className="font-extrabold text-sm tracking-wider uppercase text-purple-950">
                  CampusGate Access Registry
                </span>
                <span className="block text-[11px] text-slate-500">
                  {language === 'am' ? 'የተረጋገጠ የግል ኤሌክትሮኒክስ መለያ' : 'Authorized University Personal Device Pass'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                VERIFIED
              </span>
            </div>
          </div>

          {/* QR Code Centerpiece */}
          <div className="flex flex-col items-center justify-center p-4 bg-purple-50/60 rounded-xl border border-purple-100 mb-5">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for ${device.assetId}`}
                className="w-48 h-48 rounded-lg shadow-sm border border-purple-200 bg-white p-2"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-white rounded-lg border border-slate-200 text-slate-400 text-xs font-mono">
                Generating QR...
              </div>
            )}
            
            <div className="mt-3 text-center">
              <span className="text-xs uppercase tracking-widest text-slate-500 font-semibold block">
                {language === 'am' ? 'የመሳሪያ መለያ ቁጥር' : 'Permanent Asset Identifier'}
              </span>
              <span className="text-lg font-mono font-bold text-purple-950 bg-white px-3 py-1 rounded border border-purple-200 inline-block mt-1">
                {device.assetId}
              </span>
            </div>
          </div>

          {/* Device Details Spec Sheet */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block uppercase font-medium text-[10px]">
                {t('deviceModel')}
              </span>
              <span className="font-semibold text-slate-900 flex items-center gap-1 mt-0.5">
                <Laptop className="w-3.5 h-3.5 text-purple-700" />
                {device.brand} {device.model}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-medium text-[10px]">
                {t('serialNumber')}
              </span>
              <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                {device.serialNumber}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-medium text-[10px]">
                {t('registeredOwner')}
              </span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {device.ownerName}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-medium text-[10px]">
                {t('studentId')}
              </span>
              <span className="font-mono font-semibold text-purple-900 mt-0.5 block">
                {device.ownerStudentId}
              </span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500">
              <span>{t('currentStatus')}:</span>
              <span className="font-bold text-purple-900">{device.status.replace('_', ' ')}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-4 text-center leading-relaxed">
            {language === 'am'
              ? 'ይህ QR ኮድ መሳሪያው በሁሉም የካምፓስ በሮች ሲወጣና ሲገባ በፍጥነት እንዲረጋገጥ ያገለግላል።'
              : 'Scan this code at any campus security gate during departure and return. Valid across all university gates.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-purple-900 transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4 text-purple-700" />
              <span>{t('printQr')}</span>
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-purple-900 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4 text-purple-700" />
              <span>{t('downloadQr')}</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-purple-900 text-white hover:bg-purple-800 transition-colors shadow-xs"
          >
            {t('done')}
          </button>
        </div>
      </div>
    </div>
  );
};
