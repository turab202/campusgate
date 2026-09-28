import React, { useState } from 'react';
import {
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
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('cg_dismiss_demo_guide') === 'true';
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cg_dismiss_demo_guide', 'true');
    }
  };

  if (isDismissed) {
    return null;
  }

  const steps = [
    {
      num: 1,
      title: 'Enroll Device Once',
      desc: 'Officer records a device, creates a unique asset ID, and links it to the owner.',
      gate: 'Gate 1',
      icon: Laptop
    },
    {
      num: 2,
      title: 'Check Out',
      desc: 'A registered device is marked as outside campus when the owner leaves the site.',
      gate: 'Gate 1',
      icon: CheckCircle2
    },
    {
      num: 3,
      title: 'Cross-Gate Return',
      desc: 'A device checked out through one gate can be verified seamlessly when returned at any gate.',
      gate: 'Gate 3',
      icon: MapPin,
      highlight: true
    },
    {
      num: 4,
      title: 'Lost Device Warning',
      desc: 'A reported lost asset triggers a visible security warning at gate verification.',
      gate: 'Any Gate',
      icon: ShieldAlert
    },
    {
      num: 5,
      title: 'Visitor Pass Review',
      desc: 'Visitor access records are reviewed and validated against the gate registry.',
      gate: 'Gate 1',
      icon: Users
    },
    {
      num: 6,
      title: 'Operations Overview',
      desc: 'Oversight dashboards capture incidents, audits, and gate activity in one place.',
      gate: 'Command HQ',
      icon: BarChart3
    }
  ];

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm sm:max-w-md no-print">
      {isExpanded ? (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-xs tracking-wide uppercase">Operations Brief</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={handleDismiss}
                title="Remove guide permanently"
                className="text-slate-300 hover:text-white p-1 text-[11px] flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Dismiss</span>
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                title="Minimize"
                className="text-slate-300 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
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
                  className={`pt-2 cursor-pointer p-2.5 rounded-lg transition-colors ${
                    st.highlight ? 'bg-amber-50 border border-amber-200 hover:bg-amber-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                        {st.num}
                      </span>
                      <span className="font-semibold text-slate-900">{st.title}</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                      {st.gate}
                    </span>
                  </div>
                  <div className="mt-2 flex items-start gap-2 pl-7">
                    <Icon className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-slate-600 leading-normal">{st.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Campus operational flow</span>
            <button onClick={handleDismiss} className="text-slate-500 hover:text-slate-700 font-medium underline cursor-pointer">
              Don’t show again
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center bg-slate-900 rounded-xl shadow-lg border border-slate-700 p-1 pl-3 text-white space-x-2">
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center space-x-2 py-1 text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            <span>Operations brief</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={handleDismiss}
            title="Permanently remove guide"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
