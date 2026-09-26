import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
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
      {/* Icon-Driven Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Select language"
        className={`inline-flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-xs focus:outline-hidden focus:ring-2 focus:ring-purple-400 ${
          isOpen
            ? 'bg-purple-900 border-purple-400 text-white shadow-purple-900/30'
            : 'bg-purple-900/70 hover:bg-purple-800/90 border-purple-700/80 text-purple-200 hover:text-white'
        }`}
        title={language === 'am' ? 'ቋንቋ ቀይር (አማርኛ)' : 'Change Language (English)'}
      >
        <div className="w-5 h-5 rounded-lg bg-purple-700/70 border border-purple-500/50 flex items-center justify-center text-purple-200 shrink-0">
          <Globe className="w-3.5 h-3.5 text-purple-200 animate-pulse" />
        </div>
        <span className="font-bold tracking-wider uppercase text-[11px] text-white">
          {language === 'am' ? 'አማ' : 'EN'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-purple-300 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Advanced Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-gradient-to-b from-purple-950 via-purple-900 to-indigo-950 border border-purple-700/90 shadow-2xl shadow-purple-950/80 p-2 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl ring-1 ring-black/40"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-purple-800/70 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-purple-300" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-200">
                Language / ቋንቋ
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-800/80 border border-purple-600/50 text-purple-200 font-medium">
              Bilingual
            </span>
          </div>

          {/* Options */}
          <div className="py-1.5 space-y-1">
            {/* English Option */}
            <button
              type="button"
              role="menuitem"
              onClick={() => selectLanguage('en')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                language === 'en'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50 border border-purple-400/40'
                  : 'text-purple-200 hover:bg-purple-800/60 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border ${
                    language === 'en'
                      ? 'bg-white text-purple-900 border-white shadow-xs'
                      : 'bg-purple-950/70 text-purple-300 border-purple-700/80 group-hover:border-purple-500'
                  }`}
                >
                  EN
                </div>
                <div>
                  <p className="text-sm font-bold leading-none text-white">English</p>
                  <p
                    className={`text-[10px] mt-1 font-medium ${
                      language === 'en' ? 'text-purple-100' : 'text-purple-300/80'
                    }`}
                  >
                    Campus Security Operations
                  </p>
                </div>
              </div>
              {language === 'en' && (
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>

            {/* Amharic Option */}
            <button
              type="button"
              role="menuitem"
              onClick={() => selectLanguage('am')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                language === 'am'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50 border border-purple-400/40'
                  : 'text-purple-200 hover:bg-purple-800/60 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border ${
                    language === 'am'
                      ? 'bg-white text-purple-900 border-white shadow-xs'
                      : 'bg-purple-950/70 text-purple-300 border-purple-700/80 group-hover:border-purple-500'
                  }`}
                >
                  አማ
                </div>
                <div>
                  <p className="text-sm font-bold leading-none text-white">አማርኛ (Amharic)</p>
                  <p
                    className={`text-[10px] mt-1 font-medium ${
                      language === 'am' ? 'text-purple-100' : 'text-purple-300/80'
                    }`}
                  >
                    የስራ ቋንቋ • ኦፊሰር ኦፕሬሽንስ
                  </p>
                </div>
              </div>
              {language === 'am' && (
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>
          </div>

          {/* Micro Footer Note */}
          <div className="px-3 py-2 mt-1 border-t border-purple-800/60 flex items-center justify-between text-[10px] text-purple-300/80 bg-purple-950/40 rounded-xl">
            <span className="flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Real-Time Sync</span>
            </span>
            <span>ASTU Gate System</span>
          </div>
        </div>
      )}
    </div>
  );
};
