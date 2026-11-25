import React from 'react';
import { Coins, Sparkles, TrendingUp, X, Zap } from 'lucide-react';
import { BUILDING_SPECS } from '../data/presets';
import { PlacedEntity } from '../types/archiverse';

interface CreditsModalProps {
  credits: number;
  taxRate: number;
  projectedIncome: number;
  entities: PlacedEntity[];
  autoEarn: boolean;
  onToggleAutoEarn: () => void;
  onChangeTaxRate: (rate: number) => void;
  onGrantCredits: (amount: number, reason: string) => void;
  onCollectCycle: () => void;
  onClose: () => void;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({
  credits,
  taxRate,
  projectedIncome,
  entities,
  autoEarn,
  onToggleAutoEarn,
  onChangeTaxRate,
  onGrantCredits,
  onCollectCycle,
  onClose,
}) => {
  const incomeBreakdown = (
    [
      'commercial',
      'mall',
      'food_street',
      'farm',
      'milk_shop',
      'zoo',
      'pyramid',
      'industrial',
      'residential',
      'portal_nexus',
      'transit_hub',
      'park',
      'tree_garden',
      'power_hub',
    ] as const
  ).map((type) => {
      const matching = entities.filter((e) => e.type === type);
      const spec = BUILDING_SPECS[type];
      const base = matching.reduce(
        (sum, ent) => sum + spec.creditsPerEpoch * (1 + (ent.level - 1) * 0.45),
        0,
      );
      const taxed = Math.round(base * (taxRate / 12));
      return {
        type,
        label: spec.label,
        count: matching.length,
        color: spec.color,
        income: taxed,
      };
    },
  );

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/75 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0c1220] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Coins className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-semibold text-white">
                City Treasury & Credits Boost
              </h2>
              <p className="text-xs text-slate-400">
                Grow your budget through taxes, automatic cycles, or instant treasury grants
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto arch-scroll">
          {/* Balance & Collect Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Current Credits</div>
              <div className="text-2xl font-mono-num font-bold text-amber-300 mt-1">
                {credits.toLocaleString()} cr
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Cycle Net:{' '}
                <span className={projectedIncome >= 0 ? 'text-emerald-300 font-semibold' : 'text-rose-400'}>
                  {projectedIncome >= 0 ? `+${projectedIncome}` : projectedIncome} cr / cycle
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200">Auto-Earn Every 6s</span>
                <button
                  type="button"
                  onClick={onToggleAutoEarn}
                  className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                    autoEarn
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {autoEarn ? 'ON' : 'OFF'}
                </button>
              </div>
              <button
                type="button"
                onClick={onCollectCycle}
                className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Collect Cycle Income Now ({projectedIncome >= 0 ? `+${projectedIncome}` : projectedIncome} cr)</span>
              </button>
            </div>
          </div>

          {/* Instant Credit Boosters */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Instant Treasury Boosts (Increase Credits)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => onGrantCredits(500, 'Trade Corridor Stimulus')}
                className="p-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-amber-300 font-mono-num font-bold text-sm">
                  <Zap className="w-4 h-4" />
                  <span>+500 Credits</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">Trade Stimulus</div>
              </button>

              <button
                type="button"
                onClick={() => onGrantCredits(1500, 'Multiverse Innovation Grant')}
                className="p-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/50 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-sky-300 font-mono-num font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>+1,500 Credits</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">Innovation Grant</div>
              </button>

              <button
                type="button"
                onClick={() => onGrantCredits(5000, 'Mega-City Sandbox Budget')}
                className="p-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/50 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-purple-300 font-mono-num font-bold text-sm">
                  <Coins className="w-4 h-4" />
                  <span>+5,000 Credits</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">Sandbox Mega-Budget</div>
              </button>
            </div>
          </div>

          {/* Tax Rate Control */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Municipal Tax Rate</span>
              <span className="font-mono-num text-amber-300 font-semibold">{taxRate}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={25}
              value={taxRate}
              onChange={(e) => onChangeTaxRate(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Higher taxes increase Credits earned per cycle from Commerce, Industry & Housing (above 12% slightly lowers Happiness).
            </p>
          </div>

          {/* Income Breakdown */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Income Breakdown by Zone
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {incomeBreakdown.map((item) => (
                <div
                  key={item.type}
                  className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <span className="text-slate-300 truncate">
                    {item.label.split(' ')[0]} ({item.count})
                  </span>
                  <span
                    className={`font-mono-num font-semibold ${
                      item.income >= 0 ? 'text-emerald-300' : 'text-rose-400'
                    }`}
                  >
                    {item.income >= 0 ? `+${item.income}` : item.income}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
