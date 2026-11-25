import React from 'react';
import { Award, CheckCircle2, Coins, Lock, Sparkles, Trophy, Unlock, X } from 'lucide-react';
import { BUILDING_LIST, getBuildingDisplay, LEVEL_THRESHOLDS, LEVEL_TITLES } from '../data/presets';
import { WorldEra } from '../types/archiverse';

export interface CityGoalItem {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  done: boolean;
  creditsReward: number;
  xpReward: number;
}

interface GoalsModalProps {
  era: WorldEra;
  xp: number;
  level: number;
  goals: CityGoalItem[];
  onClose: () => void;
}

export const GoalsModal: React.FC<GoalsModalProps> = ({
  era,
  xp,
  level,
  goals,
  onClose,
}) => {
  const levelIdx = Math.min(level - 1, LEVEL_TITLES.length - 1);
  const currentThreshold = LEVEL_THRESHOLDS[levelIdx] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[levelIdx + 1] ?? currentThreshold + 500;
  const span = Math.max(1, nextThreshold - currentThreshold);
  const pct = level >= LEVEL_THRESHOLDS.length ? 100 : Math.min(100, Math.round(((xp - currentThreshold) / span) * 100));
  const completedCount = goals.filter((g) => g.done).length;

  const unlockTiers = [1, 2, 3, 4].map((lvl) => ({
    lvl,
    unlocked: level >= lvl,
    buildings: BUILDING_LIST.filter((b) => b.unlockLevel === lvl).map((b) => getBuildingDisplay(b.type, era).shortLabel),
  }));

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/75 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[88vh] bg-[#0c1220] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                City Goals, Game Level & Building Unlocks
              </h2>
              <p className="text-xs text-slate-400">
                Complete goals to earn bonus Credits, level up your city rank & unlock new buildings!
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

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Player Level & XP Progress Banner */}
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-mono-num font-bold text-xs">
                  LEVEL {level}
                </span>
                <span className="text-sm font-semibold text-white">
                  {LEVEL_TITLES[levelIdx]}
                </span>
                <span className="text-xs font-mono-num text-sky-300">
                  ({xp} XP)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-num">
                <span>Goals Completed: {completedCount}/{goals.length}</span>
                <span>
                  {level >= LEVEL_THRESHOLDS.length
                    ? 'Max Unlock Tier Reached!'
                    : `${Math.max(0, nextThreshold - xp)} XP to Level ${level + 1}`}
                </span>
              </div>
            </div>
          </div>

          {/* Unlock Roadmap */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-sky-400" />
              <span>Building Unlocks by Game Level</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {unlockTiers.map((tier) => (
                <div
                  key={tier.lvl}
                  className={`rounded-lg border p-2.5 text-xs ${
                    tier.unlocked
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-100'
                      : 'bg-slate-900/70 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono-num font-bold">Level {tier.lvl}</span>
                    {tier.unlocked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-semibold">
                        <Unlock className="w-3 h-3" /> Unlocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 font-semibold">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] leading-snug">
                    {tier.buildings.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rich Multi-Goal Grid */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Active & Completed City Goals ({completedCount}/{goals.length})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {goals.map((g) => {
                const progressPct = Math.min(100, Math.round((Math.min(g.current, g.target) / Math.max(1, g.target)) * 100));
                return (
                  <div
                    key={g.id}
                    className={`rounded-xl border p-3.5 flex flex-col justify-between gap-2.5 ${
                      g.done
                        ? 'bg-emerald-950/25 border-emerald-500/40'
                        : 'bg-slate-900/80 border-slate-700/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            g.done ? 'text-emerald-400' : 'text-slate-600'
                          }`}
                        />
                        <div>
                          <div className={`text-xs font-semibold ${g.done ? 'text-emerald-200' : 'text-white'}`}>
                            {g.title}
                          </div>
                          <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                            {g.description}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono-num font-semibold ${
                          g.done
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {Math.min(g.current, g.target)}/{g.target}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            g.done ? 'bg-emerald-400' : 'bg-sky-400'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono-num">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                            <Coins className="w-3 h-3" /> +{g.creditsReward} cr
                          </span>
                          <span className="text-sky-300 font-semibold">+{g.xpReward} XP</span>
                        </div>
                        <span className={g.done ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                          {g.done ? 'Reward Claimed ✓' : 'In Progress'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
