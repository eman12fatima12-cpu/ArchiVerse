import React from 'react';
import {
  Activity,
  Award,
  BrainCircuit,
  Building2,
  Coins,
  Cpu,
  Droplets,
  GitBranch,
  GitCompare,
  Globe2,
  Leaf,
  Milk,
  Play,
  Plus,
  Route,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users,
  Wheat,
  X,
  Zap,
} from 'lucide-react';
import {
  BUILDING_LIST,
  ERA_THEMES,
  getBuildingDisplay,
  LEVEL_THRESHOLDS,
  LEVEL_TITLES,
} from '../data/presets';
import { TimelineNode, WorldRecord } from '../types/archiverse';
import { CityGoalItem } from './GoalsModal';

interface UserDashboardModalProps {
  world: WorldRecord;
  timeline: TimelineNode;
  playerLevel: number;
  playerXp: number;
  projectedIncome: number;
  autoEarn: boolean;
  goals: CityGoalItem[];
  builtCount: number;
  upgradedCount: number;
  onToggleAutoEarn: () => void;
  onChangeTaxRate: (taxRate: number) => void;
  onCollectCycle: () => void;
  onGrantCredits: (amount: number, reason: string) => void;
  onOpenTrade: () => void;
  onOpenGoals: () => void;
  onOpenWorlds: () => void;
  onOpenTimelines: () => void;
  onOpenAiAdvisor: () => void;
  onOpenDsaMl: () => void;
  onOpenCompare: () => void;
  onClose: () => void;
}

export const UserDashboardModal: React.FC<UserDashboardModalProps> = ({
  world,
  timeline,
  playerLevel,
  playerXp,
  projectedIncome,
  autoEarn,
  goals,
  builtCount,
  upgradedCount,
  onToggleAutoEarn,
  onChangeTaxRate,
  onCollectCycle,
  onGrantCredits,
  onOpenTrade,
  onOpenGoals,
  onOpenWorlds,
  onOpenTimelines,
  onOpenAiAdvisor,
  onOpenDsaMl,
  onOpenCompare,
  onClose,
}) => {
  const eraTheme = ERA_THEMES[timeline.era];
  const levelIdx = Math.min(playerLevel - 1, LEVEL_TITLES.length - 1);
  const levelTitle = LEVEL_TITLES[levelIdx] || 'Master Architect';
  const currThresh = LEVEL_THRESHOLDS[levelIdx] ?? 0;
  const nextThresh = LEVEL_THRESHOLDS[levelIdx + 1] ?? currThresh + 500;
  const xpPct =
    playerLevel >= LEVEL_THRESHOLDS.length
      ? 100
      : Math.min(100, Math.round(((playerXp - currThresh) / Math.max(1, nextThresh - currThresh)) * 100));

  const completedGoals = goals.filter((g) => g.done).length;
  const netEnergy = timeline.resources.energyProduced - timeline.resources.energyConsumed;

  const countsByType = timeline.entities.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  const farmCount = countsByType.farm || 0;
  const milkShopCount = countsByType.milk_shop || 0;
  const roadCount = countsByType.road || 0;
  const structureCount = timeline.entities.length - roadCount;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/75">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-[#0b1220] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold font-mono-num">
              Lv.{playerLevel}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Architect User Dashboard</h2>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: `${eraTheme.accentHex}22`,
                    color: eraTheme.accentHex,
                    border: `1px solid ${eraTheme.accentHex}55`,
                  }}
                >
                  {eraTheme.name}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {levelTitle} · Active World: <span className="text-slate-200 font-medium">{world.name}</span> · Cycle{' '}
                <span className="font-mono-num text-sky-300">{timeline.metrics.epoch}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-5 space-y-5">
          {/* Top Row: Progression + Treasury Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Level & Career Progress */}
            <div className="lg:col-span-7 rounded-xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Career Rank & Achievements
                  </span>
                </div>
                <span className="text-xs font-mono-num text-amber-300">
                  {playerXp} / {nextThresh} XP
                </span>
              </div>

              <div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                  <span>{xpPct}% to Level {Math.min(playerLevel + 1, LEVEL_THRESHOLDS.length)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenGoals();
                    }}
                    className="text-amber-300 hover:text-amber-200 font-medium cursor-pointer"
                  >
                    Goals Completed: {completedGoals}/{goals.length} →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-1">
                <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 p-2">
                  <div className="text-[10px] text-slate-400">Structures</div>
                  <div className="text-sm font-bold font-mono-num text-white">{structureCount}</div>
                </div>
                <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 p-2">
                  <div className="text-[10px] text-slate-400">Roads</div>
                  <div className="text-sm font-bold font-mono-num text-sky-300">{roadCount}</div>
                </div>
                <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 p-2">
                  <div className="text-[10px] text-slate-400">Built Total</div>
                  <div className="text-sm font-bold font-mono-num text-emerald-300">{builtCount}</div>
                </div>
                <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 p-2">
                  <div className="text-[10px] text-slate-400">Upgrades</div>
                  <div className="text-sm font-bold font-mono-num text-purple-300">{upgradedCount}</div>
                </div>
              </div>
            </div>

            {/* Treasury & Income */}
            <div className="lg:col-span-5 rounded-xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    City Treasury & Taxes
                  </span>
                </div>
                <span
                  className={`text-xs font-mono-num font-semibold ${
                    projectedIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {projectedIncome >= 0 ? `+${projectedIncome}` : projectedIncome} cr / cycle
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold font-mono-num text-amber-300">
                  {timeline.resources.credits.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Cr</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onGrantCredits(500, 'Dashboard Treasury Grant')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>500 Cr</span>
                  </button>
                  <button
                    type="button"
                    onClick={onCollectCycle}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Collect</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Tax Rate</span>
                    <span className="font-mono-num text-slate-200">{world.parameters.taxRate}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={25}
                    value={world.parameters.taxRate}
                    onChange={(e) => onChangeTaxRate(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  onClick={onToggleAutoEarn}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer shrink-0 ${
                    autoEarn
                      ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Auto-Earn: {autoEarn ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* City Telemetry KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Population</span>
              </div>
              <div className="text-lg font-bold font-mono-num text-white mt-1">
                {timeline.metrics.population.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Happiness</span>
              </div>
              <div className="text-lg font-bold font-mono-num text-amber-300 mt-1">
                {timeline.metrics.happiness}%
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                <span>Eco Index</span>
              </div>
              <div className="text-lg font-bold font-mono-num text-emerald-300 mt-1">
                {timeline.metrics.ecoIndex}/100
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Route className="w-3.5 h-3.5 text-indigo-400" />
                <span>Road Link</span>
              </div>
              <div className="text-lg font-bold font-mono-num text-indigo-300 mt-1">
                {timeline.metrics.connectivityPct}%
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span>Net Power</span>
              </div>
              <div
                className={`text-lg font-bold font-mono-num mt-1 ${
                  netEnergy >= 0 ? 'text-yellow-300' : 'text-rose-400'
                }`}
              >
                {netEnergy >= 0 ? `+${netEnergy}` : netEnergy} MW
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                <span>Water Supply</span>
              </div>
              <div className="text-lg font-bold font-mono-num text-cyan-300 mt-1">
                {timeline.resources.waterSupply}%
              </div>
            </div>
          </div>

          {/* Dairy, Crops & Trade Inventory Strip */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-5">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Dairy & Farm Economy
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  <span className="font-mono-num text-lime-300 font-semibold">{farmCount}</span> Farms ·{' '}
                  <span className="font-mono-num text-sky-300 font-semibold">{milkShopCount}</span> Milk Shops ·{' '}
                  <span className="font-mono-num text-amber-300 font-semibold">
                    {timeline.resources.tradeCompletedCount ?? 0}
                  </span>{' '}
                  Trades Completed
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <Milk className="w-4 h-4 text-sky-300" />
                  <div>
                    <div className="text-[10px] text-slate-400">Milk Stock</div>
                    <div className="text-xs font-bold font-mono-num text-white">
                      {timeline.resources.milkStock ?? 0} L
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <Wheat className="w-4 h-4 text-amber-300" />
                  <div>
                    <div className="text-[10px] text-slate-400">Wheat & Crops</div>
                    <div className="text-xs font-bold font-mono-num text-white">
                      {timeline.resources.cropsStock ?? 0} T
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  <Activity className="w-4 h-4 text-rose-300" />
                  <div>
                    <div className="text-[10px] text-slate-400">Materials</div>
                    <div className="text-xs font-bold font-mono-num text-white">
                      {timeline.resources.materials} U
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTrade();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Open Trade Market</span>
            </button>
          </div>

          {/* District Asset Inventory */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  District Assets & Building Registry
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Unlock higher tiers by completing Missions
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {BUILDING_LIST.map((spec) => {
                const disp = getBuildingDisplay(spec.type, timeline.era);
                const count = countsByType[spec.type] || 0;
                const unlocked = playerLevel >= spec.unlockLevel;
                return (
                  <div
                    key={spec.type}
                    className={`rounded-lg border p-2.5 flex items-center justify-between ${
                      unlocked
                        ? 'bg-slate-950/75 border-slate-800'
                        : 'bg-slate-950/40 border-slate-800/50 opacity-60'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: spec.color }}
                        />
                        <span className="text-xs font-medium text-slate-200 truncate">
                          {disp.shortLabel}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono-num">
                        {unlocked ? `${spec.cost} cr` : `Unlocks Lv.${spec.unlockLevel}`}
                      </div>
                    </div>
                    <span className="text-sm font-bold font-mono-num text-white shrink-0">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Command Center Shortcuts */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenGoals();
              }}
              className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-amber-200 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Goals & Unlocks</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenWorlds();
              }}
              className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-sky-200 cursor-pointer"
            >
              <Globe2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span>World Switcher</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTimelines();
              }}
              className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-cyan-200 cursor-pointer"
            >
              <GitBranch className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Timelines</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAiAdvisor();
              }}
              className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-purple-200 cursor-pointer"
            >
              <BrainCircuit className="w-4 h-4 text-purple-400 shrink-0" />
              <span>AI Advisor</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDsaMl();
              }}
              className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-emerald-200 cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>DSA & ML Lab</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCompare();
              }}
              className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 cursor-pointer"
            >
              <GitCompare className="w-4 h-4 text-slate-300 shrink-0" />
              <span>Compare Eras</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
