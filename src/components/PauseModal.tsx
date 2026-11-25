import React from 'react';
import { Globe2, Home, Play, Save } from 'lucide-react';

interface PauseModalProps {
  worldName: string;
  saveStatus: string | null;
  onResume: () => void;
  onSaveNow: () => void;
  onOpenWorlds: () => void;
  onReturnToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  worldName,
  saveStatus,
  onResume,
  onSaveNow,
  onOpenWorlds,
  onReturnToTitle,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0c1220] border border-slate-700/80 rounded-xl p-6 shadow-2xl space-y-5">
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-amber-400 font-semibold">
            Simulation Paused
          </div>
          <h2 className="font-display text-2xl font-bold text-white mt-1">{worldName}</h2>
          {saveStatus && <p className="text-xs text-emerald-400 mt-1">{saveStatus}</p>}
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Resume City Builder</span>
          </button>

          <button
            type="button"
            onClick={onSaveNow}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-medium cursor-pointer"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>Save Multiverse State</span>
          </button>

          <button
            type="button"
            onClick={onOpenWorlds}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-medium cursor-pointer"
          >
            <Globe2 className="w-4 h-4 text-sky-400" />
            <span>Switch / Generate World</span>
          </button>

          <button
            type="button"
            onClick={onReturnToTitle}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Title Screen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
