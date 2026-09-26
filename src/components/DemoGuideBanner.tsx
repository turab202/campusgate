import React, { useState } from 'react';
import {
  Sparkles,
  ChevronRight,
  CheckCircle2,
  MapPin,
  Laptop,
  ShieldAlert,
  Users,
  BarChart3,
  X,
  EyeOff
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const DemoGuideBanner: React.FC = () => {
  const { triggerDemoStep } = useApp();
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return localStorage.getItem('cg_dismiss_demo_guide') === 'true';
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('cg_dismiss_demo_guide', 'true');
  };

  // If dismissed by user, do not render anything on screen
  if (isDismissed) {
    return null;
  }

  const steps = [
    {
      num: 1,
      title: 'DEMO 1: Enroll Device Once',
      desc: 'Officer at Gate 1 enrolls student laptop, generates unique Asset ID & QR code.',
      gate: 'Gate 1',
      icon: Laptop
    },
    {
      num: 2,
      title: 'DEMO 2: Check Out at Gate 1',
      desc: 'Student leaves campus. Officer verifies laptop and clicks CHECK OUT.',
      gate: 'Gate 1',
      icon: CheckCircle2
    },
    {
      num: 3,
      title: 'DEMO 3: Cross-Gate Return (Gate 3)',
      desc: 'Student returns via Gate 3! Officer scans laptop: system detects prior exit from Gate 1. No new enrollment needed!',
      gate: 'Gate 3',
      icon: MapPin,
      highlight: true
    },
    {
      num: 4,
      title: 'DEMO 4: Lost Device Warning',
      desc: 'Scan Dell XPS 13 (8J2M144K90). High-security warning blocks check-in/out.',
      gate: 'Any Gate',
      icon: ShieldAlert
    },
    {
      num: 5,
      title: 'DEMO 5: Visitor Digital Pass',
      desc: 'Inspect and verify digital visitor pass VP-2026-8812 at gate.',
      gate: 'Gate 1',
      icon: Users
    },
    {
      num: 6,
      title: 'DEMO 6: Admin Audit & Analytics',
      desc: 'View real-time telemetry across all 3 gates and immutable audit trail.',
      gate: 'Command HQ',
      icon: BarChart3
    }
  ];

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm sm:max-w-md no-print">
      {isExpanded ? (
        <div className="bg-white rounded-2xl shadow-2xl border border-purple-300 overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="font-bold text-xs tracking-wide">
                Evaluation Scenarios
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={handleDismiss}
                title="Remove guide permanently"
                className="text-purple-300 hover:text-rose-300 p-1 text-[11px] flex items-center space-x-1 px-2 py-0.5 rounded bg-purple-900/60 hover:bg-rose-950 transition-colors"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Dismiss</span>
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                title="Minimize"
                className="text-purple-300 hover:text-white p-1 rounded hover:bg-purple-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-3 max-h-80 overflow-y-auto space-y-2 text-xs divide-y divide-slate-100">
            {steps.map((st) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.num}
                  onClick={() => triggerDemoStep(st.num)}
                  className={`pt-2 cursor-pointer p-2.5 rounded-xl transition-all ${
                    st.highlight
                      ? 'bg-amber-50/80 border border-amber-300 hover:bg-amber-100'
                      : 'hover:bg-purple-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-purple-900 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                        {st.num}
                      </span>
                      <span className="font-bold text-slate-900">{st.title}</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded">
                      {st.gate}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-normal pl-7">
                    {st.desc}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Graduation Defense Fast-Track</span>
            <button
              onClick={handleDismiss}
              className="text-slate-500 hover:text-rose-600 font-medium underline cursor-pointer"
            >
              Don't show this again
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center bg-purple-950/95 backdrop-blur-md rounded-2xl shadow-xl border border-purple-700/80 p-1 pl-3 text-white space-x-2">
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center space-x-2 py-1 text-xs font-semibold text-purple-200 hover:text-white transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>Evaluation Scenarios</span>
            <ChevronRight className="w-3.5 h-3.5 text-purple-300" />
          </button>
          
          <button
            onClick={handleDismiss}
            title="Permanently remove guide"
            className="p-1 rounded-lg text-purple-400 hover:text-rose-300 hover:bg-purple-900 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
