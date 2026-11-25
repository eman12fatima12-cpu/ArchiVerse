import React, { useState } from 'react';
import {
  ArrowUpCircle,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Coins,
  Cpu,
  GitBranch,
  GitCompare,
  Globe2,
  HelpCircle,
  LayoutDashboard,
  Lock,
  Menu,
  Moon,
  MousePointer,
  Pause,
  Plane,
  Play,
  Plus,
  RotateCw,
  Route,
  ShoppingBag,
  Sun,
  Sunset,
  TrainFront,
  Trash2,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ERA_THEMES, ERA_THEME_VARIANTS, BUILDING_LIST, BUILDING_SPECS, getBuildingDisplay, LEVEL_THRESHOLDS, LEVEL_TITLES } from '../data/presets';
import { PWAInstallButton } from '../hooks/usePWA';
import {
  BuildingType,
  CameraPreset,
  LightingMode,
  PlacedEntity,
  TimelineNode,
  ToolMode,
  WorldEra,
  WorldRecord,
} from '../types/archiverse';
import { CityGoalItem } from './GoalsModal';

interface GameHUDProps {
  world: WorldRecord;
  timeline: TimelineNode;
  toolMode: ToolMode;
  placementRotation: number;
  hoveredCoord: { gx: number; gz: number } | null;
  selectedEntity: PlacedEntity | null;
  routeStatus: string | null;
  canUndo: boolean;
  muted: boolean;
  dockCollapsed: boolean;
  cameraPreset: CameraPreset;
  statusBanner: string | null;
  projectedIncome: number;
  autoEarn: boolean;
  playerLevel: number;
  playerXp: number;
  goals: CityGoalItem[];
  onOpenGoals: () => void;
  onSelectTool: (mode: ToolMode) => void;
  onRotatePlacement: () => void;
  onUndo: () => void;
  onAdvanceEpoch: () => void;
  onToggleAutoEarn: () => void;
  onQuickBoostCredits: () => void;
  onOpenCredits: () => void;
  onOpenGuide: () => void;
  onUpgradeEntity: (entityId: string) => void;
  onDeleteEntity: (entityId: string) => void;
  onToggleMute: () => void;
  onToggleDock: () => void;
  onCameraPreset: (preset: CameraPreset) => void;
  onChangeEra: (era: WorldEra) => void;
  onChangeThemeVariant: (variantId: string) => void;
  showTrains: boolean;
  showFlyingCars: boolean;
  onToggleTrains: () => void;
  onToggleFlyingCars: () => void;
  onOpenWorlds: () => void;
  onSwitchToEra: (era: 'prime_classical' | 'neo_cyber') => void;
  lightingMode: LightingMode;
  onChangeLightingMode: (mode: LightingMode) => void;
  onOpenTrade: () => void;
  onOpenDashboard: () => void;
  onOpenTimelines: () => void;
  onOpenDsaMl: () => void;
  onOpenAiAdvisor: () => void;
  onOpenCompare: () => void;
  onOpenPause: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  world,
  timeline,
  toolMode,
  placementRotation,
  hoveredCoord,
  selectedEntity,
  routeStatus,
  canUndo,
  muted,
  dockCollapsed,
  cameraPreset,
  statusBanner,
  projectedIncome,
  autoEarn,
  playerLevel,
  playerXp,
  goals,
  onOpenGoals,
  onSelectTool,
  onRotatePlacement,
  onUndo,
  onAdvanceEpoch,
  onToggleAutoEarn,
  onQuickBoostCredits,
  onOpenCredits,
  onOpenGuide,
  onUpgradeEntity,
  onDeleteEntity,
  onToggleMute,
  onToggleDock,
  onCameraPreset,
  onChangeThemeVariant,
  showTrains,
  showFlyingCars,
  onToggleTrains,
  onToggleFlyingCars,
  onOpenWorlds,
  onSwitchToEra,
  lightingMode,
  onChangeLightingMode,
  onOpenTrade,
  onOpenDashboard,
  onOpenTimelines,
  onOpenDsaMl,
  onOpenAiAdvisor,
  onOpenCompare,
  onOpenPause,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [buildTab, setBuildTab] = useState<'all' | 'city' | 'farm_trade' | 'landmarks'>('all');

  const CITY_TYPES: BuildingType[] = ['road', 'residential', 'commercial', 'industrial', 'power_hub', 'transit_hub'];
  const FARM_TRADE_TYPES: BuildingType[] = ['farm', 'milk_shop', 'food_street', 'mall'];
  const LANDMARK_TYPES: BuildingType[] = ['tree_garden', 'park', 'zoo', 'pyramid', 'portal_nexus'];

  const visibleBuildings = BUILDING_LIST.filter((b) => {
    if (buildTab === 'city') return CITY_TYPES.includes(b.type);
    if (buildTab === 'farm_trade') return FARM_TRADE_TYPES.includes(b.type);
    if (buildTab === 'landmarks') return LANDMARK_TYPES.includes(b.type);
    return true;
  });

  const eraTheme = ERA_THEMES[timeline.era];
  const netEnergy = timeline.resources.energyProduced - timeline.resources.energyConsumed;
  const completedGoals = goals.filter((g) => g.done).length;
  const levelIdx = Math.min(playerLevel - 1, LEVEL_TITLES.length - 1);
  const currThresh = LEVEL_THRESHOLDS[levelIdx] ?? 0;
  const nextThresh = LEVEL_THRESHOLDS[levelIdx + 1] ?? currThresh + 500;
  const xpPct =
    playerLevel >= LEVEL_THRESHOLDS.length
      ? 100
      : Math.min(100, Math.round(((playerXp - currThresh) / Math.max(1, nextThresh - currThresh)) * 100));
  const nextActiveGoal = goals.find((g) => !g.done) || null;
  const isOldEra = timeline.era === 'prime_classical';
  const isNewEra = timeline.era === 'neo_cyber';

  const toolInstruction = (() => {
    if (toolMode === 'select') {
      return 'Click any building to inspect, upgrade, or remove it.';
    }
    if (toolMode === 'route') {
      return 'Click 2 roads or buildings to trace the shortest path between them.';
    }
    if (toolMode === 'demolish') {
      return 'Click any placed road or building to demolish it (50% credit refund).';
    }
    const spec = BUILDING_SPECS[toolMode as BuildingType];
    const disp = getBuildingDisplay(toolMode as BuildingType, timeline.era);
    const incomeText =
      spec.creditsPerEpoch > 0
        ? `+${spec.creditsPerEpoch} cr/cycle`
        : spec.creditsPerEpoch < 0
          ? `${spec.creditsPerEpoch} cr upkeep`
          : 'Connects city';
    return `Click an empty tile to build ${disp.label} (${spec.cost} cr · ${incomeText}) · R to rotate`;
  })();

  const upgradeCost = selectedEntity ? Math.round(selectedEntity.cost * 0.8 * selectedEntity.level) : 0;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2 sm:p-3">
      {/* SINGLE COMPACT TOP BAR */}
      <div className="flex flex-col items-start gap-1.5 sm:gap-2">
        <div className="w-full flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
          {/* Top-Left: World & 1-Click Old Era / New Era Switch */}
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 bg-slate-950/90 border border-slate-700/75 rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-lg">
            <button
              type="button"
              onClick={onOpenPause}
              title="Pause / Save (Esc)"
              className="p-1.5 sm:p-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onOpenWorlds}
              className="text-left px-1 hover:opacity-90 cursor-pointer"
              title="Open all worlds"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: eraTheme.accentHex }}
                />
                <span className="text-[11px] sm:text-xs font-semibold text-white max-w-[92px] sm:max-w-[140px] truncate">
                  {world.name}
                </span>
              </div>
            </button>

            <div className="h-5 w-px bg-slate-800" />

            {/* Dead-simple 2-button Era Toggle */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-md border border-slate-800">
              <button
                type="button"
                onClick={() => onSwitchToEra('prime_classical')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                  isOldEra
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Old Era
              </button>
              <button
                type="button"
                onClick={() => onSwitchToEra('neo_cyber')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                  isNewEra
                    ? 'bg-sky-400 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                New Era
              </button>
            </div>
          </div>

          {/* Top-Center: Essential Credits & Citizens */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 bg-slate-950/90 border border-slate-700/75 rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-lg">
            <button
              type="button"
              onClick={onOpenCredits}
              title="Open Treasury & Tax Settings"
              className="flex items-center gap-1 sm:gap-1.5 hover:opacity-90 cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] sm:text-xs font-mono-num font-bold text-amber-300">
                {timeline.resources.credits.toLocaleString()}
              </span>
            </button>

            <button
              type="button"
              onClick={onQuickBoostCredits}
              title="Add +500 Credits immediately"
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono-num font-bold text-[10px] sm:text-[11px] transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>500</span>
            </button>

            <button
              type="button"
              onClick={onAdvanceEpoch}
              title="Collect cycle income now (Space)"
              className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] sm:text-[11px] font-semibold cursor-pointer font-mono-num"
            >
              <Play className="w-3 h-3" />
              <span>{projectedIncome >= 0 ? `+${projectedIncome}` : projectedIncome}</span>
            </button>

            <div className="h-4 w-px bg-slate-800 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-2.5 text-[11px] font-mono-num">
              <span className="text-sky-300">
                <span className="text-slate-400">Pop </span>
                {timeline.metrics.population}
              </span>
              <span className={netEnergy >= 0 ? 'text-yellow-300' : 'text-rose-400'}>
                {netEnergy >= 0 ? `+${netEnergy}` : netEnergy} MW
              </span>
            </div>
          </div>

          {/* Top-Right: Dashboard + Trade Market + Timelines + AI + Guide + Tools */}
          <div className="pointer-events-auto relative flex items-center gap-1 sm:gap-1.5 bg-slate-950/90 border border-slate-700/75 rounded-lg p-1 shadow-lg">
            <button
              type="button"
              onClick={onOpenDashboard}
              title="Open User & City Dashboard"
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/70 text-[11px] font-semibold text-sky-200 cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-sky-300" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>

            <button
              type="button"
              onClick={onOpenTrade}
              title="Sell Milk, Crops & Materials or ship Trade Contracts for Credits & XP"
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/70 text-[11px] font-semibold text-amber-200 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
              <span>Trade</span>
              <span className="hidden xl:inline font-mono-num text-[10px] text-amber-100">
                ({timeline.resources.milkStock ?? 0}M · {timeline.resources.cropsStock ?? 0}C)
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenTimelines}
              title="Branch Parallel Timelines"
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-[11px] text-sky-300 cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Timelines</span>
            </button>

            <button
              type="button"
              onClick={onOpenAiAdvisor}
              title="Ask Gemini AI City Advisor"
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-[11px] text-purple-300 cursor-pointer"
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">AI Advisor</span>
            </button>

            <button
              type="button"
              onClick={onOpenGuide}
              title="How to Play"
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-sky-300 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              title="More Tools (DSA & ML, Compare, Worlds, Sound)"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] cursor-pointer ${
                menuOpen
                  ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700/70 text-slate-200'
              }`}
            >
              <Menu className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tools</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-[#0c1220] border border-slate-700 rounded-xl shadow-2xl p-1.5 space-y-1 z-30">
                <button
                  type="button"
                  onClick={() => {
                    onOpenWorlds();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200 cursor-pointer text-left"
                >
                  <Globe2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>All Worlds & Generator</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenCompare();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200 cursor-pointer text-left"
                >
                  <GitCompare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Compare Parallel Worlds</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenDsaMl();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200 cursor-pointer text-left"
                >
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span>DSA & ML Analytics Lab</span>
                </button>
                <div className="h-px bg-slate-800 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    onToggleAutoEarn();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200 cursor-pointer"
                >
                  <span>Auto-Earn Income</span>
                  <span className={autoEarn ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                    {autoEarn ? 'ON' : 'OFF'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenGoals();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200 cursor-pointer"
                >
                  <span>Goals & Level Unlocks</span>
                  <span className="text-amber-300 font-mono-num">
                    {completedGoals}/{goals.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200 cursor-pointer"
                >
                  <span>Sound Effects</span>
                  {muted ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                  )}
                </button>
                <div className="pt-1 flex justify-center">
                  <PWAInstallButton compact />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Game Level, XP Bar & Clickable Mission + Unlocks Strip */}
        <button
          type="button"
          onClick={onOpenGoals}
          title="Open all Goals, Rewards & Building Unlocks"
          className="pointer-events-auto bg-slate-950/90 hover:bg-slate-900/95 border border-slate-700/80 hover:border-amber-400/70 rounded-lg px-2.5 py-1.5 shadow-md flex items-center gap-2.5 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono-num font-bold text-[10px]">
              Lv.{playerLevel}
            </span>
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-100">
              <span>Goals ({completedGoals}/{goals.length})</span>
              {nextActiveGoal && (
                <span className="hidden sm:inline text-[10px] text-amber-300 truncate max-w-[290px]">
                  · Mission: {nextActiveGoal.description} (+{nextActiveGoal.creditsReward} cr)
                </span>
              )}
            </div>
            <div className="w-36 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
        </button>
      </div>

      {/* Bottom Area: Floating Status Card + Sleek Single Build Dock */}
      <div className="flex flex-col items-center gap-1.5">
        {(statusBanner || routeStatus || selectedEntity || hoveredCoord) && !dockCollapsed && (
          <div className="self-start pointer-events-auto max-w-xs bg-slate-950/92 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 shadow-lg space-y-1">
            {statusBanner && <div className="text-amber-300 font-medium">{statusBanner}</div>}
            {routeStatus && <div className="text-sky-300 font-mono-num">{routeStatus}</div>}

            {selectedEntity && (
              <div className="space-y-1.5">
                <div>
                  <div className="font-semibold text-white">
                    {selectedEntity.name}{' '}
                    <span className="text-amber-300 font-mono-num">Lv.{selectedEntity.level}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {getBuildingDisplay(selectedEntity.type, timeline.era).label} · Tile ({selectedEntity.gx},{selectedEntity.gz})
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedEntity.type !== 'road' && selectedEntity.level < 3 && (
                    <button
                      type="button"
                      onClick={() => onUpgradeEntity(selectedEntity.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-[11px] cursor-pointer"
                    >
                      <ArrowUpCircle className="w-3 h-3" />
                      <span>Upgrade ({upgradeCost} cr)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteEntity(selectedEntity.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-200 text-[11px] cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            )}

            {!selectedEntity && !routeStatus && hoveredCoord && (
              <span className="font-mono-num text-[11px] text-slate-400">
                Tile ({hoveredCoord.gx}, {hoveredCoord.gz})
              </span>
            )}
          </div>
        )}

        {/* Collapsible Slim Build Bar */}
        <div className="flex flex-col items-center w-full">
          <button
            type="button"
            onClick={onToggleDock}
            className="pointer-events-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-t-md bg-slate-950/90 border border-b-0 border-slate-700/80 text-[10px] font-medium text-slate-400 hover:text-white cursor-pointer"
          >
            {dockCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>{dockCollapsed ? 'Show Build Bar (H)' : 'Hide (H)'}</span>
          </button>

          {!dockCollapsed && (
            <div className="pointer-events-auto w-full max-w-[1160px] bg-slate-950/92 border border-slate-700/80 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-2xl flex flex-col gap-1.5">
              {/* Header row: Category Filter Tabs + Helper Instruction */}
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/80 overflow-x-auto arch-scroll">
                <div className="flex items-center gap-1 shrink-0">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'city', label: 'City & Civic' },
                      { id: 'farm_trade', label: 'Farm & Trade' },
                      { id: 'landmarks', label: 'Parks & Landmarks' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBuildTab(tab.id)}
                      className={`shrink-0 px-2 py-1 sm:py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                        buildTab === tab.id
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <span className="hidden md:inline text-[10px] text-sky-200 truncate max-w-[420px]">
                  {toolInstruction}
                </span>
              </div>

              {/* Single Clean Touch-Swipeable Tool & Building Strip */}
              <div className="flex items-center gap-1 overflow-x-auto arch-scroll pb-0.5">
                <button
                  type="button"
                  onClick={() => onSelectTool('select')}
                  className={`shrink-0 min-h-[32px] inline-flex items-center gap-1 px-2.5 sm:px-2 py-1 rounded text-[11px] font-medium border cursor-pointer ${
                    toolMode === 'select'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <MousePointer className="w-3 h-3" />
                  <span>Inspect</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectTool('route')}
                  title="Find shortest path between 2 tiles"
                  className={`shrink-0 min-h-[32px] inline-flex items-center gap-1 px-2.5 sm:px-2 py-1 rounded text-[11px] font-medium border cursor-pointer ${
                    toolMode === 'route'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <Route className="w-3 h-3" />
                  <span>Path</span>
                </button>

                <div className="h-4 w-px bg-slate-800 mx-0.5 shrink-0" />

                {visibleBuildings.map((spec) => {
                  const active = toolMode === spec.type;
                  const unlocked = playerLevel >= spec.unlockLevel;
                  const canAfford = timeline.resources.credits >= spec.cost;
                  const disp = getBuildingDisplay(spec.type, timeline.era);
                  return (
                    <button
                      key={spec.type}
                      type="button"
                      onClick={() => onSelectTool(spec.type)}
                      title={
                        unlocked
                          ? `${disp.label} (${spec.cost} cr) — ${disp.description}`
                          : `Unlocks at Game Level ${spec.unlockLevel} — Complete Goals to level up!`
                      }
                      className={`shrink-0 min-h-[32px] inline-flex items-center gap-1 px-2.5 sm:px-2 py-1 rounded text-[11px] font-medium border cursor-pointer ${
                        !unlocked
                          ? 'bg-slate-950/90 border-slate-800/80 text-slate-500 opacity-70 hover:border-amber-500/40'
                          : active
                            ? 'bg-amber-500/20 border-amber-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                      } ${unlocked && !canAfford ? 'opacity-55' : ''}`}
                    >
                      {unlocked ? (
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: spec.color }}
                        />
                      ) : (
                        <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                      )}
                      <span>{disp.shortLabel}</span>
                      {unlocked ? (
                        <span className="text-[10px] font-mono-num text-amber-300">{spec.cost}</span>
                      ) : (
                        <span className="text-[9px] font-mono-num text-amber-400">Lv.{spec.unlockLevel}</span>
                      )}
                    </button>
                  );
                })}

                <div className="h-4 w-px bg-slate-800 mx-0.5 shrink-0" />

                <button
                  type="button"
                  onClick={() => onSelectTool('demolish')}
                  title="Clear structure on tile"
                  className={`shrink-0 min-h-[32px] inline-flex items-center gap-1 px-2.5 sm:px-2 py-1 rounded text-[11px] font-medium border cursor-pointer ${
                    toolMode === 'demolish'
                      ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>

              {/* Compact Single-Row Swipeable Environment, Theme & Camera Controls Strip */}
              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80 text-[10px] text-slate-300 overflow-x-auto arch-scroll">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded border border-slate-800">
                    <button
                      type="button"
                      onClick={() => onChangeLightingMode('day')}
                      title="Bright Sunny Light Mode"
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer ${
                        lightingMode === 'day'
                          ? 'bg-amber-400 text-slate-950 font-semibold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <Sun className="w-2.5 h-2.5" />
                      <span>Day</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeLightingMode('sunset')}
                      title="Warm Golden Dusk"
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer ${
                        lightingMode === 'sunset'
                          ? 'bg-orange-400 text-slate-950 font-semibold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <Sunset className="w-2.5 h-2.5" />
                      <span>Dusk</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeLightingMode('night')}
                      title="Illuminated Night Sky"
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer ${
                        lightingMode === 'night'
                          ? 'bg-indigo-500 text-white font-semibold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <Moon className="w-2.5 h-2.5" />
                      <span>Night</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto">
                    {(ERA_THEME_VARIANTS[timeline.era] || []).map((variant, idx) => {
                      const active = timeline.themeVariant
                        ? timeline.themeVariant === variant.id
                        : idx === 0;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => onChangeThemeVariant(variant.id)}
                          className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer ${
                            active
                              ? 'bg-slate-800 border-amber-400/80 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: variant.swatchHex }}
                          />
                          <span>{variant.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onToggleFlyingCars}
                    title="Toggle Aerial Flying Cars ON / OFF"
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer ${
                      showFlyingCars
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Plane className="w-3 h-3" />
                    <span>Sky Cars</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleTrains}
                    title="Toggle Steam / Maglev Perimeter Train ON / OFF"
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer ${
                      showTrains
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <TrainFront className="w-3 h-3" />
                    <span>Trains</span>
                  </button>

                  <span className="text-slate-700">|</span>

                  <button
                    type="button"
                    onClick={onUndo}
                    disabled={!canUndo}
                    title="Undo (Ctrl+Z)"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700/70 text-slate-200 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Undo2 className="w-3 h-3" />
                    <span>Undo</span>
                  </button>
                  <button
                    type="button"
                    onClick={onRotatePlacement}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-slate-300 cursor-pointer font-mono-num"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>{placementRotation * 90}°</span>
                  </button>
                  {(['isometric', 'street', 'topdown'] as CameraPreset[]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onCameraPreset(preset)}
                      className={`px-1.5 py-0.5 rounded capitalize border cursor-pointer ${
                        cameraPreset === preset
                          ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {preset === 'isometric' ? 'Iso' : preset === 'topdown' ? 'Top' : 'Street'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
