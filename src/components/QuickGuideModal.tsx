import React from 'react';
import { BrainCircuit, Coins, GitBranch, Hammer, HelpCircle, X } from 'lucide-react';

interface QuickGuideModalProps {
  onClose: () => void;
}

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({ onClose }) => {
  const steps = [
    {
      icon: <Hammer className="w-5 h-5 text-amber-400" />,
      title: '1. Build City, Farms & Greenery',
      text: 'Place Housing, Roads, Farms (with Cows & Goats), Milk Shops, Parks & Trees on any green tile. Use Light / Dusk / Night & Theme buttons at the bottom bar to customize your sky!',
    },
    {
      icon: <Coins className="w-5 h-5 text-emerald-400" />,
      title: '2. Milk Supply Chain & Trade Market',
      text: 'Farms produce Fresh Milk & Golden Crops every cycle while Milkmen deliver to Milk Shops for bonus Credits. Open "Trade" in the top bar to sell goods or ship Trade Contracts for big Credits & XP!',
    },
    {
      icon: <GitBranch className="w-5 h-5 text-sky-400" />,
      title: '3. Complete Goals & Unlock Monuments',
      text: 'Follow your active Mission under the top-left Trophy bar! Finishing Goals levels you up to unlock Wildlife Zoos, Food Streets, Malls/Bazaars, Grand Pyramids & Castles.',
    },
    {
      icon: <BrainCircuit className="w-5 h-5 text-purple-400" />,
      title: '4. Old Era vs New Era & AI Advisor',
      text: 'Switch anytime between Old Era (Pyramids, Camels, Carriages, Castles) and New Era (Flying Cars, Maglev Trains, Glass Pyramids). Ask AI Advisor or inspect DSA Graphs anytime!',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0c1220] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-semibold text-white">How to Play ArchiVerse AI</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {steps.map((s) => (
            <div
              key={s.title}
              className="p-4 rounded-xl bg-slate-900/75 border border-slate-800 space-y-2"
            >
              <div className="flex items-center gap-2">
                {s.icon}
                <h3 className="text-xs font-semibold text-white">{s.title}</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-950/50">
          <span className="text-[11px] font-mono-num text-slate-400">
            Shortcuts: 1-8 Tools · R Rotate · Space Collect · Ctrl+Z Undo · H Hide Bar
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs cursor-pointer"
          >
            Got It, Let&apos;s Build!
          </button>
        </div>
      </div>
    </div>
  );
};
