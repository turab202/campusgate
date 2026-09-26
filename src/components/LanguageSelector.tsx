import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Language } from '../i18n/translations';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages: {
    code: Language;
    name: string;
    nativeName: string;
    subtext: string;
    badge: string;
  }[] = [
    {
      code: 'am',
      name: 'Amharic',
      nativeName: 'አማርኛ',
      subtext: 'የስራ ቋንቋ • Officer Operations',
      badge: 'አማ'
    },
    {
      code: 'en',
      name: 'English',
      nativeName: 'English (US)',
      subtext: 'Campus Standard • Bilingual',
      badge: 'EN'
    }
  ];

  const currentLangObj = languages.find((l) => l.code === language) || languages[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Advanced Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm ${
          isOpen
            ? 'bg-purple-800 text-white border-purple-400 ring-2 ring-purple-400/30'
            : 'bg-purple-900/90 text-purple-100 border-purple-700/80 hover:bg-purple-800 hover:text-white hover:border-purple-500'
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="w-5 h-5 rounded-lg bg-purple-950/70 border border-purple-700/60 flex items-center justify-center text-purple-300 group-hover:text-purple-100 transition-colors">
          <Globe className="w-3.5 h-3.5 text-purple-300 group-hover:text-purple-100 transition-transform duration-300 group-hover:rotate-45" />
        </div>
        
        <span className="font-medium tracking-wide">
          {language === 'am' ? 'አማርኛ' : 'English'}
        </span>

        <span className="text-[10px] font-mono uppercase bg-purple-950/80 px-1.5 py-0.5 rounded text-purple-300 border border-purple-800/80">
          {currentLangObj.badge}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-purple-300 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : 'group-hover:translate-y-0.5'
          }`}
        />
      </button>

      {/* Advanced Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl bg-white p-2 shadow-2xl border border-purple-200 ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {language === 'am' ? 'ቋንቋ ይምረጡ' : 'Select Language'}
            </span>
            <span className="text-xs font-semibold text-slate-700">
              CampusGate Bilingual System
            </span>
          </div>

          <div className="space-y-1">
            {languages.map((item) => {
              const isSelected = language === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setLanguage(item.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-purple-50 text-purple-950 font-bold border border-purple-200 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-purple-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono transition-colors ${
                        isSelected
                          ? 'bg-purple-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                    <div>
                      <span className="block text-xs font-bold leading-tight">
                        {item.nativeName}
                      </span>
                      <span className="block text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                        {item.subtext}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-purple-900 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 px-3 py-1">
            <p className="text-[10px] text-slate-400 leading-snug">
              {language === 'am'
                ? 'የበር ጠባቂ መኮንኖች በነባሪነት በአማርኛ ቋንቋ እንዲጠቀሙ ተዘጋጅቷል።'
                : 'Gate Officers are initialized in Amharic-first mode per security protocols.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
