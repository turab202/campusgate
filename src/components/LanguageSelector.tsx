import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectLanguage = (code: 'en' | 'am') => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Select language"
        className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cg-primary)]/20 ${
          isOpen
            ? 'border-[var(--cg-primary)] bg-[var(--cg-primary)] text-white'
            : 'border-[var(--cg-border)] bg-[var(--cg-surface)] text-[var(--cg-text)] hover:border-[var(--cg-primary)]/30 hover:bg-[var(--cg-surface-muted)]'
        }`}
        title={language === 'am' ? 'ቋንቋ ቀይር (አማርኛ)' : 'Change Language (English)'}
      >
        <div className={`flex h-5 w-5 items-center justify-center rounded-md border shrink-0 ${isOpen ? 'border-white/30 bg-white/10 text-white' : 'border-[var(--cg-border)] bg-[var(--cg-surface-muted)] text-[var(--cg-text-muted)]'}`}>
          <Globe className="h-3.5 w-3.5" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
          {language === 'am' ? 'አማ' : 'EN'}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-card)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--cg-border)] px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-[var(--cg-text-muted)]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--cg-text)]">
                Language / ቋንቋ
              </span>
            </div>
            <span className="rounded-full bg-[var(--cg-surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--cg-text-muted)]">
              EN / አማ
            </span>
          </div>

          <div className="py-1.5 space-y-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => selectLanguage('en')}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${
                language === 'en'
                  ? 'bg-[var(--cg-primary)] text-white'
                  : 'text-[var(--cg-text)] hover:bg-[var(--cg-surface-muted)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs font-bold ${language === 'en' ? 'border-white/30 bg-white/10 text-white' : 'border-[var(--cg-border)] bg-[var(--cg-surface-muted)] text-[var(--cg-text)]'}`}>
                  EN
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">English</p>
                  <p className={`mt-1 text-[10px] ${language === 'en' ? 'text-white/80' : 'text-[var(--cg-text-muted)]'}`}>
                    Campus operations
                  </p>
                </div>
              </div>
              {language === 'en' && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-white shrink-0">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </div>
              )}
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => selectLanguage('am')}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${
                language === 'am'
                  ? 'bg-[var(--cg-primary)] text-white'
                  : 'text-[var(--cg-text)] hover:bg-[var(--cg-surface-muted)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs font-bold ${language === 'am' ? 'border-white/30 bg-white/10 text-white' : 'border-[var(--cg-border)] bg-[var(--cg-surface-muted)] text-[var(--cg-text)]'}`}>
                  አማ
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">አማርኛ</p>
                  <p className={`mt-1 text-[10px] ${language === 'am' ? 'text-white/80' : 'text-[var(--cg-text-muted)]'}`}>
                    የተጠቃሚ ቋንቋ
                  </p>
                </div>
              </div>
              {language === 'am' && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-white shrink-0">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </div>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
