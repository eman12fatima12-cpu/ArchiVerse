import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { synthAudio } from './audio/synth';
import { GameHUD } from './components/GameHUD';
import type { CityGoalItem } from './components/GoalsModal';
import { TitleScreen } from './components/TitleScreen';
import type { TradeContract } from './components/TradeMarketModal';
import { OfflineIndicator } from './hooks/usePWA';

const AiAdvisorDrawer = lazy(() =>
  import('./components/AiAdvisorDrawer').then((m) => ({ default: m.AiAdvisorDrawer })),
);
const CreditsModal = lazy(() =>
  import('./components/CreditsModal').then((m) => ({ default: m.CreditsModal })),
);
const DsaMlLabModal = lazy(() =>
  import('./components/DsaMlLabModal').then((m) => ({ default: m.DsaMlLabModal })),
);
const GoalsModal = lazy(() =>
  import('./components/GoalsModal').then((m) => ({ default: m.GoalsModal })),
);
const PauseModal = lazy(() =>
  import('./components/PauseModal').then((m) => ({ default: m.PauseModal })),
);
const QuickGuideModal = lazy(() =>
  import('./components/QuickGuideModal').then((m) => ({ default: m.QuickGuideModal })),
);
const TimelineTreeDrawer = lazy(() =>
  import('./components/TimelineTreeDrawer').then((m) => ({ default: m.TimelineTreeDrawer })),
);
const TradeMarketModal = lazy(() =>
  import('./components/TradeMarketModal').then((m) => ({ default: m.TradeMarketModal })),
);
const UserDashboardModal = lazy(() =>
  import('./components/UserDashboardModal').then((m) => ({ default: m.UserDashboardModal })),
);
const WorldCompareModal = lazy(() =>
  import('./components/WorldCompareModal').then((m) => ({ default: m.WorldCompareModal })),
);
const WorldManagerModal = lazy(() =>
  import('./components/WorldManagerModal').then((m) => ({ default: m.WorldManagerModal })),
);
import {
  BUILDING_LIST,
  BUILDING_SPECS,
  computeLevelFromXp,
  coordKey,
  createSeededWorlds,
  getBuildingDisplay,
} from './data/presets';
import {
  buildDSAWorldContext,
  computeProjectedEpochCredits,
  computeRouteBetweenTiles,
  evaluateCityState,
  UndoOperation,
} from './dsa/engine';
import { CustomStack } from './dsa/structures';
import { generateMLPredictions } from './ml/predictor';
import { CityViewportController } from './three/CityViewport';
import {
  AIRecommendation,
  BuildingType,
  CameraPreset,
  CityResources,
  LightingMode,
  PlacedEntity,
  PlayerProgression,
  TimelineNode,
  ToolMode,
  WorldEra,
  WorldParameters,
  WorldRecord,
} from './types/archiverse';

const STORAGE_KEY = 'archiverse_ai_worlds_v10';
const PROGRESS_KEY = 'archiverse_ai_progress_v10';
const STATS_KEY = 'archiverse_ai_stats_v10';

function withPreservedStocks(
  evaluated: CityResources,
  prev: CityResources,
  overrides?: { milkDelta?: number; cropsDelta?: number; materialsDelta?: number },
): CityResources {
  return {
    ...evaluated,
    materials: Math.max(0, (prev.materials ?? evaluated.materials) + (overrides?.materialsDelta ?? 0)),
    milkStock: Math.max(0, (prev.milkStock ?? 0) + (overrides?.milkDelta ?? 0)),
    cropsStock: Math.max(0, (prev.cropsStock ?? 0) + (overrides?.cropsDelta ?? 0)),
    tradeCompletedCount: prev.tradeCompletedCount ?? 0,
  };
}

interface ActionStats {
  builtCount: number;
  earnedCount: number;
  upgradedCount: number;
  branchedCount: number;
  visitedEras: WorldEra[];
}

function loadInitialWorlds(): WorldRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore corrupted local storage
  }
  return createSeededWorlds();
}

function loadInitialProgression(): PlayerProgression {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.xp === 'number' && Array.isArray(parsed?.completedGoalIds)) {
        return {
          xp: parsed.xp,
          level: computeLevelFromXp(parsed.xp),
          completedGoalIds: parsed.completedGoalIds,
        };
      }
    }
  } catch {
    // ignore
  }
  return { xp: 0, level: 1, completedGoalIds: [] };
}

function loadInitialStats(): ActionStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.builtCount === 'number') return parsed;
    }
  } catch {
    // ignore
  }
  return {
    builtCount: 0,
    earnedCount: 0,
    upgradedCount: 0,
    branchedCount: 0,
    visitedEras: ['prime_classical'],
  };
}

type ActiveModal =
  | 'none'
  | 'worlds'
  | 'timelines'
  | 'dsaml'
  | 'ai'
  | 'compare'
  | 'pause'
  | 'credits'
  | 'guide'
  | 'goals'
  | 'trade'
  | 'dashboard';

export default function App() {
  const [worlds, setWorlds] = useState<WorldRecord[]>(loadInitialWorlds);
  const [activeWorldId, setActiveWorldId] = useState<string>(() => loadInitialWorlds()[0].id);
  const [screenMode, setScreenMode] = useState<'title' | 'playing'>('title');
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');

  const [toolMode, setToolMode] = useState<ToolMode>('residential');
  const [placementRotation, setPlacementRotation] = useState<number>(0);
  const [hoveredCoord, setHoveredCoord] = useState<{ gx: number; gz: number } | null>(null);
  const [selectedCoord, setSelectedCoord] = useState<{ gx: number; gz: number } | null>(null);

  const [routeStart, setRouteStart] = useState<{ gx: number; gz: number } | null>(null);
  const [routePathKeys, setRoutePathKeys] = useState<string[]>([]);
  const [routeStatus, setRouteStatus] = useState<string | null>(null);

  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric');
  const [cameraPresetVersion, setCameraPresetVersion] = useState<number>(0);
  const [lightingMode, setLightingMode] = useState<LightingMode>('day');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [autoEarn, setAutoEarn] = useState<boolean>(true);
  const [showTrains, setShowTrains] = useState<boolean>(true);
  const [showFlyingCars, setShowFlyingCars] = useState<boolean>(
    () => loadInitialWorlds()[0]?.era === 'neo_cyber',
  );
  const [progression, setProgression] = useState<PlayerProgression>(loadInitialProgression);
  const [actionStats, setActionStats] = useState<ActionStats>(loadInitialStats);

  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const undoStackRef = useRef<CustomStack<UndoOperation>>(new CustomStack<UndoOperation>());
  const [undoVersion, setUndoVersion] = useState(0);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<CityViewportController | null>(null);

  const activeWorld = useMemo(
    () => worlds.find((w) => w.id === activeWorldId) || worlds[0],
    [worlds, activeWorldId],
  );

  const activeTimeline: TimelineNode = useMemo(() => {
    return (
      activeWorld.timelines[activeWorld.activeTimelineId] ||
      activeWorld.timelines[activeWorld.rootTimelineId] ||
      Object.values(activeWorld.timelines)[0]
    );
  }, [activeWorld]);

  const dsaContext = useMemo(() => {
    void undoVersion;
    return buildDSAWorldContext(activeWorld, activeTimeline, undoStackRef.current);
  }, [activeWorld, activeTimeline, undoVersion]);

  const mlReport = useMemo(
    () => generateMLPredictions(activeWorld, activeTimeline, worlds),
    [activeWorld, activeTimeline, worlds],
  );

  const projectedIncome = useMemo(
    () => computeProjectedEpochCredits(activeTimeline.entities, activeWorld.parameters.taxRate),
    [activeTimeline.entities, activeWorld.parameters.taxRate],
  );

  const selectedEntity = useMemo(() => {
    if (!selectedCoord) return null;
    return dsaContext.hashTable.get(coordKey(selectedCoord.gx, selectedCoord.gz)) || null;
  }, [selectedCoord, dsaContext]);

  const showNotice = useCallback((msg: string) => {
    setStatusBanner(msg);
  }, []);

  useEffect(() => {
    if (!statusBanner) return;
    const t = window.setTimeout(() => setStatusBanner(null), 3200);
    return () => clearTimeout(t);
  }, [statusBanner]);

  // Hydrate from server persistence on first load with 3.5s low-internet timeout
  useEffect(() => {
    let mounted = true;
    const ctrl = new AbortController();
    const abortTimer = window.setTimeout(() => ctrl.abort(), 3500);
    fetch('/api/worlds', { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data?.worlds || !Array.isArray(data.worlds) || data.worlds.length === 0) {
          return;
        }
        setWorlds(data.worlds);
        setActiveWorldId((prev) =>
          data.worlds.some((w: WorldRecord) => w.id === prev) ? prev : data.worlds[0].id,
        );
      })
      .catch(() => {
        // localStorage already loaded
      })
      .finally(() => {
        clearTimeout(abortTimer);
      });
    return () => {
      mounted = false;
      ctrl.abort();
      clearTimeout(abortTimer);
    };
  }, []);

  const persistWorlds = useCallback((nextWorlds: WorldRecord[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextWorlds));
    } catch {
      // ignore storage quota errors
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }
    fetch('/api/worlds', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 10, worlds: nextWorlds }),
    }).catch(() => {
      // offline fallback handled by localStorage
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progression));
    } catch {
      // ignore
    }
  }, [progression]);

  useEffect(() => {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(actionStats));
    } catch {
      // ignore
    }
  }, [actionStats]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      persistWorlds(worlds);
    }, 2000);
    return () => clearTimeout(timer);
  }, [worlds, persistWorlds]);

  const handleTileClickRef = useRef<(gx: number, gz: number) => void>(() => {});

  const updateActiveTimeline = useCallback(
    (updater: (tl: TimelineNode, world: WorldRecord) => TimelineNode) => {
      setWorlds((prev) =>
        prev.map((w) => {
          if (w.id !== activeWorld.id) return w;
          const tl = w.timelines[w.activeTimelineId];
          if (!tl) return w;
          const updatedTl = updater(tl, w);
          return {
            ...w,
            updatedAt: Date.now(),
            timelines: {
              ...w.timelines,
              [tl.id]: updatedTl,
            },
          };
        }),
      );
    },
    [activeWorld.id],
  );

  const awardPlayerXp = useCallback((xpGain: number) => {
    if (xpGain <= 0) return;
    setProgression((prev) => {
      const nextXp = prev.xp + xpGain;
      const nextLvl = computeLevelFromXp(nextXp);
      return {
        ...prev,
        xp: nextXp,
        level: nextLvl,
      };
    });
  }, []);

  const handleDeleteEntityById = useCallback(
    (entityId: string) => {
      const existing = activeTimeline.entities.find((e) => e.id === entityId);
      if (!existing) return;

      undoStackRef.current.push({
        label: `Remove ${existing.name}`,
        entities: activeTimeline.entities,
        resources: activeTimeline.resources,
      });
      setUndoVersion((v) => v + 1);

      const refund = Math.round(existing.cost * 0.5);
      const nextEntities = activeTimeline.entities.filter((e) => e.id !== existing.id);
      const evalState = evaluateCityState(
        nextEntities,
        activeWorld.parameters,
        activeTimeline.resources.credits + refund,
        activeTimeline.metrics.epoch,
      );

      updateActiveTimeline((tl) => ({
        ...tl,
        entities: nextEntities,
        resources: withPreservedStocks(evalState.resources, tl.resources),
        metrics: evalState.metrics,
        decisions: [
          ...tl.decisions,
          {
            id: `dec_${Date.now()}`,
            timestamp: Date.now(),
            epoch: tl.metrics.epoch,
            action: `Clear ${existing.name}`,
            detail: `Removed structure at (${existing.gx},${existing.gz}), refunded ${refund} cr.`,
            impactSummary: `${evalState.metrics.connectivityPct}% Grid Connectivity`,
          },
        ],
      }));
      synthAudio.playDemolish();
      setSelectedCoord(null);
      showNotice(`Removed ${existing.name} (+${refund} cr refunded)`);
    },
    [activeTimeline, activeWorld.parameters, updateActiveTimeline, showNotice],
  );

  const handleUpgradeEntity = useCallback(
    (entityId: string) => {
      const existing = activeTimeline.entities.find((e) => e.id === entityId);
      if (!existing || existing.type === 'road' || existing.level >= 3) return;
      const upgradeCost = Math.round(existing.cost * 0.8 * existing.level);
      if (activeTimeline.resources.credits < upgradeCost) {
        showNotice(`Need ${upgradeCost} cr to upgrade. Click +500 Cr or Collect Income!`);
        synthAudio.playError();
        return;
      }

      undoStackRef.current.push({
        label: `Upgrade ${existing.name}`,
        entities: activeTimeline.entities,
        resources: activeTimeline.resources,
      });
      setUndoVersion((v) => v + 1);

      const nextLevel = existing.level + 1;
      const nextEntities = activeTimeline.entities.map((e) =>
        e.id === entityId ? { ...e, level: nextLevel } : e,
      );
      const evalState = evaluateCityState(
        nextEntities,
        activeWorld.parameters,
        activeTimeline.resources.credits - upgradeCost,
        activeTimeline.metrics.epoch,
      );

      updateActiveTimeline((tl) => ({
        ...tl,
        entities: nextEntities,
        resources: withPreservedStocks(evalState.resources, tl.resources),
        metrics: evalState.metrics,
        decisions: [
          ...tl.decisions,
          {
            id: `dec_${Date.now()}`,
            timestamp: Date.now(),
            epoch: tl.metrics.epoch,
            action: `Upgrade ${existing.name}`,
            detail: `Expanded to Level ${nextLevel} (+45% output).`,
            impactSummary: `Pop ${evalState.metrics.population} · +Income`,
          },
        ],
      }));
      synthAudio.playBranch();
      setActionStats((s) => ({ ...s, upgradedCount: s.upgradedCount + 1 }));
      awardPlayerXp(45);
      showNotice(`Upgraded ${existing.name} to Level ${nextLevel} (+45 XP)!`);
    },
    [activeTimeline, activeWorld.parameters, updateActiveTimeline, showNotice, awardPlayerXp],
  );

  handleTileClickRef.current = (gx: number, gz: number) => {
    const existing = dsaContext.hashTable.get(coordKey(gx, gz));

    if (toolMode === 'select') {
      setSelectedCoord({ gx, gz });
      setRoutePathKeys([]);
      setRouteStatus(null);
      return;
    }

    if (toolMode === 'route') {
      if (!existing) {
        synthAudio.playError();
        showNotice(`Tile (${gx},${gz}) is empty — click a road or building to find path.`);
        return;
      }
      if (!routeStart) {
        setRouteStart({ gx, gz });
        setSelectedCoord({ gx, gz });
        setRoutePathKeys([]);
        setRouteStatus(`Start set at (${gx},${gz}). Now click destination road or building!`);
        synthAudio.playRoute();
        return;
      }
      const res = computeRouteBetweenTiles(activeTimeline.entities, routeStart, { gx, gz });
      if (res.found) {
        setRoutePathKeys(res.path);
        setRouteStatus(
          `Shortest Path (${routeStart.gx},${routeStart.gz}) → (${gx},${gz}): ${res.path.length - 1} tiles`,
        );
        synthAudio.playRoute();
      } else {
        setRoutePathKeys([]);
        setRouteStatus(
          `No road connection between (${routeStart.gx},${routeStart.gz}) and (${gx},${gz}). Place Roads to link them!`,
        );
        synthAudio.playError();
      }
      setRouteStart(null);
      return;
    }

    if (toolMode === 'demolish') {
      if (!existing) {
        showNotice(`Tile (${gx},${gz}) is already empty.`);
        return;
      }
      handleDeleteEntityById(existing.id);
      return;
    }

    // Building placement mode
    const buildType = toolMode as BuildingType;
    const spec = BUILDING_SPECS[buildType];
    if (progression.level < spec.unlockLevel) {
      showNotice(`Locked! Reach Game Level ${spec.unlockLevel} via Goals to unlock ${spec.shortLabel}.`);
      synthAudio.playError();
      return;
    }
    if (existing) {
      setSelectedCoord({ gx, gz });
      showNotice(`Selected ${existing.name} (Lv.${existing.level}) — Upgrade or pick an empty tile!`);
      return;
    }
    if (activeTimeline.resources.credits < spec.cost) {
      showNotice(`Need ${spec.cost} cr for ${spec.label}. Click "+500" in top bar to add credits!`);
      synthAudio.playError();
      return;
    }

    const disp = getBuildingDisplay(buildType, activeTimeline.era);
    undoStackRef.current.push({
      label: `Place ${disp.shortLabel}`,
      entities: activeTimeline.entities,
      resources: activeTimeline.resources,
    });
    setUndoVersion((v) => v + 1);

    const newEntity: PlacedEntity = {
      id: `ent_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      type: buildType,
      gx,
      gz,
      rotation: placementRotation,
      level: 1,
      name: `${disp.shortLabel} (${gx},${gz})`,
      createdAt: Date.now(),
      cost: spec.cost,
    };

    const nextEntities = [...activeTimeline.entities, newEntity];
    const evalState = evaluateCityState(
      nextEntities,
      activeWorld.parameters,
      activeTimeline.resources.credits - spec.cost,
      activeTimeline.metrics.epoch,
    );

    updateActiveTimeline((tl) => ({
      ...tl,
      entities: nextEntities,
      resources: withPreservedStocks(evalState.resources, tl.resources, {
        milkDelta: buildType === 'farm' ? 6 : 0,
        cropsDelta: buildType === 'farm' ? 8 : 0,
        materialsDelta: buildType === 'industrial' ? 35 : 0,
      }),
      metrics: evalState.metrics,
      decisions: [
        ...tl.decisions,
        {
          id: `dec_${Date.now()}`,
          timestamp: Date.now(),
          epoch: tl.metrics.epoch,
          action: `Build ${disp.label}`,
          detail: `Placed at (${gx},${gz}) for ${spec.cost} cr.`,
          impactSummary: `Pop ${evalState.metrics.population} · Link ${evalState.metrics.connectivityPct}%`,
        },
      ],
    }));

    synthAudio.playBuild(buildType);
    setSelectedCoord({ gx, gz });
    setActionStats((s) => ({ ...s, builtCount: s.builtCount + 1 }));
    awardPlayerXp(25);
  };

  // Mount Three.js Viewport ONCE
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const controller = new CityViewportController(mountEl, {
      entities: activeTimeline.entities,
      era: activeTimeline.era,
      themeVariant: activeTimeline.themeVariant,
      lightingMode,
      toolMode,
      placementRotation,
      selectedCoord,
      routePathKeys,
      isolatedCoords: dsaContext.snapshot.isolatedCoords,
      cameraPreset,
      cameraPresetVersion,
      titleMode: screenMode === 'title',
      showTrains,
      showFlyingCars,
      onTileClick: (gx, gz) => handleTileClickRef.current(gx, gz),
      onTileHover: (coord) => setHoveredCoord(coord),
    });

    viewportRef.current = controller;
    return () => {
      controller.dispose();
      viewportRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    viewportRef.current?.updateProps({
      entities: activeTimeline.entities,
      era: activeTimeline.era,
      themeVariant: activeTimeline.themeVariant,
      lightingMode,
      toolMode,
      placementRotation,
      selectedCoord,
      routePathKeys,
      isolatedCoords: dsaContext.snapshot.isolatedCoords,
      cameraPreset,
      cameraPresetVersion,
      titleMode: screenMode === 'title',
      showTrains,
      showFlyingCars,
      onTileClick: (gx, gz) => handleTileClickRef.current(gx, gz),
      onTileHover: (coord) => setHoveredCoord(coord),
    });
  }, [
    activeTimeline.entities,
    activeTimeline.era,
    activeTimeline.themeVariant,
    lightingMode,
    toolMode,
    placementRotation,
    selectedCoord,
    routePathKeys,
    dsaContext.snapshot.isolatedCoords,
    cameraPreset,
    cameraPresetVersion,
    screenMode,
    showTrains,
    showFlyingCars,
  ]);

  const handleUndo = useCallback(() => {
    const op = undoStackRef.current.pop();
    if (!op) return;
    setUndoVersion((v) => v + 1);
    const evalState = evaluateCityState(
      op.entities,
      activeWorld.parameters,
      op.resources.credits,
      activeTimeline.metrics.epoch,
    );
    updateActiveTimeline((tl) => ({
      ...tl,
      entities: op.entities,
      resources: {
        ...evalState.resources,
        materials: op.resources.materials,
        milkStock: op.resources.milkStock ?? tl.resources.milkStock ?? 0,
        cropsStock: op.resources.cropsStock ?? tl.resources.cropsStock ?? 0,
        tradeCompletedCount: tl.resources.tradeCompletedCount ?? 0,
      },
      metrics: evalState.metrics,
    }));
    synthAudio.playUndo();
    showNotice(`Undid: ${op.label}`);
  }, [activeWorld.parameters, activeTimeline.metrics.epoch, updateActiveTimeline, showNotice]);

  const handleAdvanceEpoch = useCallback(
    (silent = false) => {
      const nextEpoch = activeTimeline.metrics.epoch + 1;
      const netCreditIncome = computeProjectedEpochCredits(
        activeTimeline.entities,
        activeWorld.parameters.taxRate,
      );

      const farmMilkGain = activeTimeline.entities
        .filter((e) => e.type === 'farm')
        .reduce((acc, f) => acc + 4 * f.level, 0);
      const farmCropsGain = activeTimeline.entities
        .filter((e) => e.type === 'farm')
        .reduce((acc, f) => acc + 5 * f.level, 0);
      const forgeMatGain = activeTimeline.entities
        .filter((e) => e.type === 'industrial')
        .reduce((acc, f) => acc + 6 * f.level, 0);

      const evalState = evaluateCityState(
        activeTimeline.entities,
        activeWorld.parameters,
        Math.max(0, activeTimeline.resources.credits + netCreditIncome),
        nextEpoch,
      );

      const snap = {
        epoch: nextEpoch,
        population: evalState.metrics.population,
        credits: evalState.resources.credits,
        energyNet: evalState.resources.energyProduced - evalState.resources.energyConsumed,
        ecoIndex: evalState.metrics.ecoIndex,
        connectivityPct: evalState.metrics.connectivityPct,
        happiness: evalState.metrics.happiness,
        buildingCount: evalState.metrics.totalBuildings,
      };

      updateActiveTimeline((tl) => ({
        ...tl,
        resources: withPreservedStocks(evalState.resources, tl.resources, {
          milkDelta: farmMilkGain,
          cropsDelta: farmCropsGain,
          materialsDelta: forgeMatGain,
        }),
        metrics: evalState.metrics,
        snapshots: [...tl.snapshots, snap],
      }));

      if (!silent) {
        synthAudio.playRoute();
        setActionStats((s) => ({ ...s, earnedCount: s.earnedCount + 1 }));
        const farmSuffix = farmMilkGain > 0 ? ` · +${farmMilkGain} Milk · +${farmCropsGain} Crops` : '';
        showNotice(
          `Cycle ${nextEpoch}: ${netCreditIncome >= 0 ? '+' : ''}${netCreditIncome} cr${farmSuffix}`,
        );
      }
    },
    [activeTimeline, activeWorld.parameters, updateActiveTimeline, showNotice],
  );

  // Passive Auto-Earn loop every 6 seconds while actively playing
  useEffect(() => {
    if (!autoEarn || screenMode !== 'playing' || activeModal !== 'none') return;
    const id = window.setInterval(() => {
      handleAdvanceEpoch(true);
    }, 6000);
    return () => clearInterval(id);
  }, [autoEarn, screenMode, activeModal, handleAdvanceEpoch]);

  const handleGrantCredits = useCallback(
    (amount: number, reason: string) => {
      updateActiveTimeline((tl) => ({
        ...tl,
        resources: {
          ...tl.resources,
          credits: tl.resources.credits + amount,
        },
        decisions: [
          ...tl.decisions,
          {
            id: `dec_cr_${Date.now()}`,
            timestamp: Date.now(),
            epoch: tl.metrics.epoch,
            action: `Treasury Boost (+${amount} cr)`,
            detail: reason,
            impactSummary: `+${amount} Credits added`,
          },
        ],
      }));
      synthAudio.playBranch();
      setActionStats((s) => ({ ...s, earnedCount: s.earnedCount + 1 }));
      showNotice(`+${amount.toLocaleString()} Credits added (${reason})`);
    },
    [updateActiveTimeline, showNotice],
  );

  const handleSellResource = useCallback(
    (good: 'milk' | 'crops' | 'materials', amount: number) => {
      if (amount <= 0) return;
      const res = activeTimeline.resources;
      const available =
        good === 'milk' ? (res.milkStock ?? 0) : good === 'crops' ? (res.cropsStock ?? 0) : res.materials;
      const qty = Math.min(amount, available);
      if (qty <= 0) return;
      const unitPrice = good === 'milk' ? 18 : good === 'crops' ? 12 : 10;
      const earned = qty * unitPrice;

      updateActiveTimeline((tl) => ({
        ...tl,
        resources: {
          ...tl.resources,
          credits: tl.resources.credits + earned,
          milkStock: good === 'milk' ? Math.max(0, (tl.resources.milkStock ?? 0) - qty) : (tl.resources.milkStock ?? 0),
          cropsStock: good === 'crops' ? Math.max(0, (tl.resources.cropsStock ?? 0) - qty) : (tl.resources.cropsStock ?? 0),
          materials: good === 'materials' ? Math.max(0, tl.resources.materials - qty) : tl.resources.materials,
          tradeCompletedCount: (tl.resources.tradeCompletedCount ?? 0) + 1,
        },
      }));
      synthAudio.playRoute();
      awardPlayerXp(15);
      showNotice(`Sold ${qty} ${good} for +${earned} Credits (+15 XP)!`);
    },
    [activeTimeline.resources, updateActiveTimeline, awardPlayerXp, showNotice],
  );

  const handleFulfillTradeContract = useCallback(
    (contract: TradeContract) => {
      const res = activeTimeline.resources;
      if (
        (res.milkStock ?? 0) < contract.milkNeeded ||
        (res.cropsStock ?? 0) < contract.cropsNeeded ||
        res.materials < contract.materialsNeeded
      ) {
        synthAudio.playError();
        showNotice('Not enough Milk, Crops, or Materials for this contract yet.');
        return;
      }

      updateActiveTimeline((tl) => ({
        ...tl,
        resources: {
          ...tl.resources,
          credits: tl.resources.credits + contract.creditsReward,
          milkStock: Math.max(0, (tl.resources.milkStock ?? 0) - contract.milkNeeded),
          cropsStock: Math.max(0, (tl.resources.cropsStock ?? 0) - contract.cropsNeeded),
          materials: Math.max(0, tl.resources.materials - contract.materialsNeeded),
          tradeCompletedCount: (tl.resources.tradeCompletedCount ?? 0) + 1,
        },
        decisions: [
          ...tl.decisions,
          {
            id: `dec_tr_${Date.now()}`,
            timestamp: Date.now(),
            epoch: tl.metrics.epoch,
            action: `Trade: ${contract.title}`,
            detail: `Shipped to ${contract.partner} (+${contract.creditsReward} cr, +${contract.xpReward} XP).`,
            impactSummary: `+${contract.creditsReward} Credits`,
          },
        ],
      }));
      synthAudio.playBranch();
      awardPlayerXp(contract.xpReward);
      showNotice(`Shipped ${contract.title}: +${contract.creditsReward} cr · +${contract.xpReward} XP!`);
    },
    [activeTimeline.resources, updateActiveTimeline, awardPlayerXp, showNotice],
  );

  const handleChangeTaxRate = useCallback(
    (taxRate: number) => {
      setWorlds((prev) =>
        prev.map((w) => {
          if (w.id !== activeWorld.id) return w;
          const nextParams = { ...w.parameters, taxRate };
          const tl = w.timelines[w.activeTimelineId];
          const evalState = evaluateCityState(
            tl.entities,
            nextParams,
            tl.resources.credits,
            tl.metrics.epoch,
          );
          return {
            ...w,
            parameters: nextParams,
            timelines: {
              ...w.timelines,
              [tl.id]: {
                ...tl,
                resources: withPreservedStocks(evalState.resources, tl.resources),
                metrics: evalState.metrics,
              },
            },
          };
        }),
      );
    },
    [activeWorld.id],
  );

  // Global keyboard shortcuts (1-8 tools, R rotate, H hide bar, Space collect, Ctrl+Z undo, Esc pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        if (activeModal !== 'none') {
          setActiveModal('none');
        } else if (screenMode === 'playing') {
          setActiveModal('pause');
        }
        return;
      }

      if (screenMode !== 'playing' || activeModal !== 'none') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (e.key === '0' && BUILDING_LIST[9]) {
        const spec = BUILDING_LIST[9];
        if (progression.level >= spec.unlockLevel) {
          setToolMode(spec.type);
        } else {
          showNotice(`Unlock ${spec.shortLabel} at Game Level ${spec.unlockLevel} via Goals!`);
        }
        return;
      }
      const num = Number(e.key);
      if (num >= 1 && num <= Math.min(9, BUILDING_LIST.length)) {
        const spec = BUILDING_LIST[num - 1];
        if (progression.level >= spec.unlockLevel) {
          setToolMode(spec.type);
        } else {
          showNotice(`Unlock ${spec.shortLabel} at Game Level ${spec.unlockLevel} via Goals!`);
        }
        return;
      }
      if (e.key.toLowerCase() === 'r') {
        setPlacementRotation((r) => (r + 1) % 4);
      } else if (e.key.toLowerCase() === 'h') {
        setDockCollapsed((c) => !c);
      } else if (e.key === ' ') {
        e.preventDefault();
        handleAdvanceEpoch(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screenMode, activeModal, handleUndo, handleAdvanceEpoch, progression.level, showNotice]);

  const handleSelectWorld = (worldId: string) => {
    const targetWorld = worlds.find((w) => w.id === worldId);
    setActiveWorldId(worldId);
    if (targetWorld) {
      const tl = targetWorld.timelines[targetWorld.activeTimelineId];
      const nextEra = tl?.era || targetWorld.era;
      setShowFlyingCars(nextEra === 'neo_cyber');
      setActionStats((s) =>
        s.visitedEras.includes(nextEra)
          ? s
          : { ...s, visitedEras: [...s.visitedEras, nextEra] },
      );
    }
    undoStackRef.current.clear();
    setUndoVersion((v) => v + 1);
    setSelectedCoord(null);
    setRouteStart(null);
    setRoutePathKeys([]);
    setRouteStatus(null);
  };

  const handleCreateWorld = (cfg: {
    name: string;
    description: string;
    era: WorldEra;
    parameters: WorldParameters;
  }) => {
    const newId = `world_${Date.now()}`;
    const rootTlId = `tl_${Date.now()}`;
    const starterEntities: PlacedEntity[] = [
      {
        id: `ent_init_1`,
        type: 'road',
        gx: 7,
        gz: 7,
        rotation: 0,
        level: 1,
        name: 'Central Avenue (7,7)',
        createdAt: Date.now(),
        cost: 20,
      },
      {
        id: `ent_init_2`,
        type: 'road',
        gx: 8,
        gz: 7,
        rotation: 0,
        level: 1,
        name: 'Central Avenue (8,7)',
        createdAt: Date.now(),
        cost: 20,
      },
      {
        id: `ent_init_3`,
        type: 'portal_nexus',
        gx: 7,
        gz: 8,
        rotation: 0,
        level: 1,
        name: 'Origin Rift Spire',
        createdAt: Date.now(),
        cost: 380,
      },
      {
        id: `ent_init_4`,
        type: 'power_hub',
        gx: 8,
        gz: 8,
        rotation: 0,
        level: 1,
        name: 'Founding Power Hub',
        createdAt: Date.now(),
        cost: 210,
      },
    ];

    const evalState = evaluateCityState(
      starterEntities,
      cfg.parameters,
      cfg.parameters.startingCredits,
      1,
    );

    const newWorld: WorldRecord = {
      id: newId,
      name: cfg.name,
      description: cfg.description,
      era: cfg.era,
      seed: Math.floor(Math.random() * 9000) + 1000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      parameters: cfg.parameters,
      rootTimelineId: rootTlId,
      activeTimelineId: rootTlId,
      timelines: {
        [rootTlId]: {
          id: rootTlId,
          parentId: null,
          name: 'Prime Reality',
          decisionTitle: 'Founding Parallel Charter',
          era: cfg.era,
          createdAt: Date.now(),
          entities: starterEntities,
          resources: evalState.resources,
          metrics: evalState.metrics,
          decisions: [
            {
              id: `dec_init_${Date.now()}`,
              timestamp: Date.now(),
              epoch: 1,
              action: 'Initialize Parallel World',
              detail: `Seeded ${cfg.name} with Origin Rift Spire & Founding Power Hub.`,
              impactSummary: `${evalState.resources.credits} cr Treasury`,
            },
          ],
          snapshots: [
            {
              epoch: 1,
              population: evalState.metrics.population,
              credits: evalState.resources.credits,
              energyNet: evalState.resources.energyProduced - evalState.resources.energyConsumed,
              ecoIndex: evalState.metrics.ecoIndex,
              connectivityPct: evalState.metrics.connectivityPct,
              happiness: evalState.metrics.happiness,
              buildingCount: evalState.metrics.totalBuildings,
            },
          ],
          childrenIds: [],
        },
      },
      recommendations: [],
    };

    setWorlds((prev) => [newWorld, ...prev]);
    handleSelectWorld(newId);
    setScreenMode('playing');
    synthAudio.playBranch();
  };

  const handleDuplicateWorld = (sourceId: string) => {
    const src = worlds.find((w) => w.id === sourceId);
    if (!src) return;
    const copyId = `world_copy_${Date.now()}`;
    const cloned: WorldRecord = JSON.parse(JSON.stringify(src));
    cloned.id = copyId;
    cloned.name = `${src.name} (Parallel II)`;
    cloned.createdAt = Date.now();
    cloned.updatedAt = Date.now();
    setWorlds((prev) => [cloned, ...prev]);
    synthAudio.playBranch();
    showNotice(`Cloned ${src.name} into parallel reality.`);
  };

  const handleDeleteWorld = (targetId: string) => {
    if (worlds.length <= 1) return;
    setWorlds((prev) => {
      const next = prev.filter((w) => w.id !== targetId);
      if (activeWorldId === targetId && next[0]) {
        setActiveWorldId(next[0].id);
      }
      return next;
    });
  };

  const handleSwitchTimeline = (timelineId: string) => {
    setWorlds((prev) =>
      prev.map((w) => (w.id === activeWorld.id ? { ...w, activeTimelineId: timelineId } : w)),
    );
    undoStackRef.current.clear();
    setUndoVersion((v) => v + 1);
    setRoutePathKeys([]);
    setRouteStatus(null);
    synthAudio.playRoute();
  };

  const handleBranchTimeline = (cfg: {
    name: string;
    decisionTitle: string;
    era: WorldEra;
  }) => {
    const branchId = `tl_${Date.now()}`;
    const clonedEntities: PlacedEntity[] = JSON.parse(JSON.stringify(activeTimeline.entities));
    const clonedResources = { ...activeTimeline.resources };
    const clonedMetrics = { ...activeTimeline.metrics };
    const clonedSnapshots = activeTimeline.snapshots.map((s) => ({ ...s }));
    const clonedDecisions = [
      ...activeTimeline.decisions,
      {
        id: `dec_br_${Date.now()}`,
        timestamp: Date.now(),
        epoch: activeTimeline.metrics.epoch,
        action: `Branch Timeline: ${cfg.name}`,
        detail: cfg.decisionTitle,
        impactSummary: `Diverged from ${activeTimeline.name}`,
      },
    ];

    const newNode: TimelineNode = {
      id: branchId,
      parentId: activeTimeline.id,
      name: cfg.name,
      decisionTitle: cfg.decisionTitle,
      era: cfg.era,
      createdAt: Date.now(),
      entities: clonedEntities,
      resources: clonedResources,
      metrics: clonedMetrics,
      decisions: clonedDecisions,
      snapshots: clonedSnapshots,
      childrenIds: [],
    };

    setWorlds((prev) =>
      prev.map((w) => {
        if (w.id !== activeWorld.id) return w;
        const parent = w.timelines[activeTimeline.id];
        return {
          ...w,
          era: cfg.era,
          activeTimelineId: branchId,
          updatedAt: Date.now(),
          timelines: {
            ...w.timelines,
            [activeTimeline.id]: {
              ...parent,
              childrenIds: [...parent.childrenIds, branchId],
            },
            [branchId]: newNode,
          },
        };
      }),
    );

    undoStackRef.current.clear();
    setUndoVersion((v) => v + 1);
    synthAudio.playBranch();
    setActionStats((s) => ({ ...s, branchedCount: s.branchedCount + 1 }));
    showNotice(`Branched timeline "${cfg.name}" from Cycle ${activeTimeline.metrics.epoch}`);
  };

  const handleChangeEra = (era: WorldEra) => {
    updateActiveTimeline((tl) => ({ ...tl, era }));
    setWorlds((prev) =>
      prev.map((w) => (w.id === activeWorld.id ? { ...w, era } : w)),
    );
    setShowFlyingCars(era === 'neo_cyber');
    setActionStats((s) =>
      s.visitedEras.includes(era) ? s : { ...s, visitedEras: [...s.visitedEras, era] },
    );
  };

  const handleCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    setCameraPresetVersion((v) => v + 1);
    viewportRef.current?.applyCameraPreset(preset);
  };

  const handleToggleMute = () => {
    setMuted((m) => {
      const next = !m;
      synthAudio.setMuted(next);
      return next;
    });
  };

  const handleSaveRecommendations = (recs: AIRecommendation[]) => {
    setWorlds((prev) =>
      prev.map((w) =>
        w.id === activeWorld.id ? { ...w, recommendations: recs, updatedAt: Date.now() } : w,
      ),
    );
  };

  const goalsList: CityGoalItem[] = useMemo(() => {
    const parkCount = activeTimeline.entities.filter((e) => e.type === 'park').length;
    const farmCount = activeTimeline.entities.filter((e) => e.type === 'farm').length;
    const milkShopCount = activeTimeline.entities.filter((e) => e.type === 'milk_shop').length;
    const treeCount = activeTimeline.entities.filter((e) => e.type === 'tree_garden').length;
    const zooCount = activeTimeline.entities.filter((e) => e.type === 'zoo').length;
    const pyramidCount = activeTimeline.entities.filter((e) => e.type === 'pyramid').length;
    const foodStreetCount = activeTimeline.entities.filter((e) => e.type === 'food_street').length;
    const mallCount = activeTimeline.entities.filter((e) => e.type === 'mall').length;
    const tradesDone = activeTimeline.resources.tradeCompletedCount ?? 0;
    const netEnergy = activeTimeline.resources.energyProduced - activeTimeline.resources.energyConsumed;
    const hasTwoEras =
      actionStats.visitedEras.includes('prime_classical') &&
      actionStats.visitedEras.includes('neo_cyber');
    const visitedBothCount =
      (actionStats.visitedEras.includes('prime_classical') ? 1 : 0) +
      (actionStats.visitedEras.includes('neo_cyber') ? 1 : 0);

    const defs: Array<Omit<CityGoalItem, 'done'>> = [
      {
        id: 'goal_build_1',
        title: "Architect's First Mark",
        description: 'Place any new Farm, Milk Shop, Housing, Trees or Road.',
        current: actionStats.builtCount,
        target: 1,
        creditsReward: 250,
        xpReward: 90,
      },
      {
        id: 'goal_dairy_chain',
        title: 'Fresh Dairy Supply Chain',
        description: 'Have at least 2 Farms (Cows & Goats) and 1 Milk Shop active.',
        current: (farmCount >= 2 ? 1 : 0) + (milkShopCount >= 1 ? 1 : 0),
        target: 2,
        creditsReward: 320,
        xpReward: 110,
      },
      {
        id: 'goal_trade_1',
        title: 'First Caravan Trade',
        description: 'Open Trade Market and sell Milk/Crops or ship a Contract.',
        current: tradesDone,
        target: 1,
        creditsReward: 350,
        xpReward: 120,
      },
      {
        id: 'goal_trees_3',
        title: 'Green Trees & Oasis',
        description: 'Plant 3 Trees & Plants groves to beautify your world.',
        current: treeCount,
        target: 3,
        creditsReward: 260,
        xpReward: 100,
      },
      {
        id: 'goal_zoo_1',
        title: 'Wildlife Safari Sanctuary',
        description: 'Open a Wildlife Zoo Sanctuary (Elephants, Giraffes, Lions & Zebras).',
        current: zooCount,
        target: 1,
        creditsReward: 480,
        xpReward: 160,
      },
      {
        id: 'goal_food_2',
        title: 'Food Street Festival',
        description: 'Reach Level 2 and open a 2nd bustling Food Street.',
        current: foodStreetCount,
        target: 2,
        creditsReward: 450,
        xpReward: 150,
      },
      {
        id: 'goal_parks_4',
        title: 'Swings & Parks Lover',
        description: 'Expand greenery to 4 Parks with moving playground swings.',
        current: parkCount,
        target: 4,
        creditsReward: 350,
        xpReward: 120,
      },
      {
        id: 'goal_upgrade_1',
        title: 'Master Upgrader',
        description: 'Inspect any building and upgrade it to Level 2 or higher.',
        current: actionStats.upgradedCount,
        target: 1,
        creditsReward: 400,
        xpReward: 150,
      },
      {
        id: 'goal_pyramid_1',
        title: 'Monumental Pyramid',
        description: 'Reach Level 3 and build a Grand Golden or Solar Pyramid.',
        current: pyramidCount,
        target: 1,
        creditsReward: 700,
        xpReward: 220,
      },
      {
        id: 'goal_mall_2',
        title: 'Shopping & Bazaar District',
        description: 'Reach Level 3 and build a 2nd Mall or Old Era Bazaar.',
        current: mallCount,
        target: 2,
        creditsReward: 600,
        xpReward: 200,
      },
      {
        id: 'goal_power_55',
        title: 'Clean Energy Surplus',
        description: 'Maintain +55 MW or more net power surplus.',
        current: Math.max(0, netEnergy),
        target: 55,
        creditsReward: 450,
        xpReward: 140,
      },
      {
        id: 'goal_two_eras',
        title: 'Old & New Era Traveler',
        description: 'Explore and develop both Old Era & New Era cities.',
        current: hasTwoEras ? 2 : visitedBothCount,
        target: 2,
        creditsReward: 550,
        xpReward: 180,
      },
      {
        id: 'goal_build_10',
        title: 'Grand Metropolis Builder',
        description: 'Place 10 new structures across your simulation.',
        current: actionStats.builtCount,
        target: 10,
        creditsReward: 1000,
        xpReward: 350,
      },
    ];

    return defs.map((d) => ({
      ...d,
      done: progression.completedGoalIds.includes(d.id) || d.current >= d.target,
    }));
  }, [activeTimeline, actionStats, progression.completedGoalIds]);

  // Auto-claim Credits, XP & Level-Up Building Unlocks whenever goals complete
  useEffect(() => {
    if (screenMode !== 'playing') return;
    const newlyCompleted = goalsList.filter(
      (g) => g.done && !progression.completedGoalIds.includes(g.id),
    );
    if (newlyCompleted.length === 0) return;

    const totalCr = newlyCompleted.reduce((acc, g) => acc + g.creditsReward, 0);
    const totalXp = newlyCompleted.reduce((acc, g) => acc + g.xpReward, 0);
    const prevLevel = progression.level;
    const nextXp = progression.xp + totalXp;
    const nextLevel = computeLevelFromXp(nextXp);

    setProgression((prev) => ({
      xp: prev.xp + totalXp,
      level: computeLevelFromXp(prev.xp + totalXp),
      completedGoalIds: [
        ...prev.completedGoalIds,
        ...newlyCompleted.map((g) => g.id),
      ],
    }));

    updateActiveTimeline((tl) => ({
      ...tl,
      resources: {
        ...tl.resources,
        credits: tl.resources.credits + totalCr,
      },
    }));

    synthAudio.playBranch();
    if (nextLevel > prevLevel) {
      const unlocked = BUILDING_LIST.filter(
        (b) => b.unlockLevel > prevLevel && b.unlockLevel <= nextLevel,
      )
        .map((b) => getBuildingDisplay(b.type, activeTimeline.era).shortLabel)
        .join(', ');
      showNotice(
        unlocked
          ? `LEVEL UP! Game Level ${nextLevel} — Unlocked: ${unlocked} (+${totalCr} cr)`
          : `LEVEL UP! Reached Game Level ${nextLevel} (+${totalCr} cr)`,
      );
    } else {
      const label =
        newlyCompleted.length === 1
          ? newlyCompleted[0].title
          : `${newlyCompleted.length} Goals`;
      showNotice(`Goal Complete: ${label} (+${totalCr} cr · +${totalXp} XP)`);
    }
  }, [
    screenMode,
    goalsList,
    progression.completedGoalIds,
    progression.level,
    progression.xp,
    activeTimeline.era,
    updateActiveTimeline,
    showNotice,
  ]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#080b12]">
      {/* Isolated Three.js Canvas Mount */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />
      <OfflineIndicator />

      {/* Title Screen */}
      {screenMode === 'title' && (
        <TitleScreen
          worlds={worlds}
          activeWorldId={activeWorld.id}
          onSelectWorld={handleSelectWorld}
          onEnterSimulation={() => setScreenMode('playing')}
          onOpenWorldGenerator={() => setActiveModal('worlds')}
        />
      )}

      {/* Playing HUD */}
      {screenMode === 'playing' && (
        <GameHUD
          world={activeWorld}
          timeline={activeTimeline}
          toolMode={toolMode}
          placementRotation={placementRotation}
          hoveredCoord={hoveredCoord}
          selectedEntity={selectedEntity}
          routeStatus={routeStatus}
          canUndo={!undoStackRef.current.isEmpty()}
          muted={muted}
          dockCollapsed={dockCollapsed}
          cameraPreset={cameraPreset}
          statusBanner={statusBanner}
          projectedIncome={projectedIncome}
          autoEarn={autoEarn}
          playerLevel={progression.level}
          playerXp={progression.xp}
          goals={goalsList}
          onOpenGoals={() => setActiveModal('goals')}
          onSelectTool={(mode) => {
            if (mode !== 'select' && mode !== 'route' && mode !== 'demolish') {
              const spec = BUILDING_SPECS[mode as BuildingType];
              if (spec && progression.level < spec.unlockLevel) {
                const disp = getBuildingDisplay(spec.type, activeTimeline.era);
                showNotice(
                  `Reach Game Level ${spec.unlockLevel} by completing Goals to unlock ${disp.label}!`,
                );
                synthAudio.playError();
                return;
              }
            }
            setToolMode(mode);
            if (mode !== 'route') setRouteStart(null);
          }}
          onRotatePlacement={() => setPlacementRotation((r) => (r + 1) % 4)}
          onUndo={handleUndo}
          onAdvanceEpoch={() => handleAdvanceEpoch(false)}
          onToggleAutoEarn={() => setAutoEarn((a) => !a)}
          onQuickBoostCredits={() => handleGrantCredits(500, 'Quick Municipal Grant')}
          onOpenCredits={() => setActiveModal('credits')}
          onOpenGuide={() => setActiveModal('guide')}
          onUpgradeEntity={handleUpgradeEntity}
          onDeleteEntity={handleDeleteEntityById}
          onToggleMute={handleToggleMute}
          onToggleDock={() => setDockCollapsed((c) => !c)}
          onCameraPreset={handleCameraPreset}
          onChangeEra={handleChangeEra}
          onChangeThemeVariant={(variantId) =>
            updateActiveTimeline((tl) => ({ ...tl, themeVariant: variantId }))
          }
          showTrains={showTrains}
          showFlyingCars={showFlyingCars}
          onToggleTrains={() =>
            setShowTrains((prev) => {
              const next = !prev;
              showNotice(next ? 'Perimeter Train Activated' : 'Perimeter Train Paused');
              return next;
            })
          }
          onToggleFlyingCars={() =>
            setShowFlyingCars((prev) => {
              const next = !prev;
              showNotice(next ? 'Flying Cars Launched into Sky Lanes' : 'Flying Cars Docked');
              return next;
            })
          }
          onOpenWorlds={() => setActiveModal('worlds')}
          onSwitchToEra={(targetEra) => {
            const match = worlds.find((w) => w.era === targetEra);
            if (match && match.id !== activeWorld.id) {
              handleSelectWorld(match.id);
              showNotice(`Entered ${match.name}`);
            } else {
              handleChangeEra(targetEra);
            }
          }}
          lightingMode={lightingMode}
          onChangeLightingMode={(mode) => {
            setLightingMode(mode);
            showNotice(
              mode === 'day'
                ? 'Sky Lighting: Bright Sunlight'
                : mode === 'sunset'
                  ? 'Sky Lighting: Golden Dusk'
                  : 'Sky Lighting: Illuminated Night',
            );
          }}
          onOpenTrade={() => setActiveModal('trade')}
          onOpenDashboard={() => setActiveModal('dashboard')}
          onOpenTimelines={() => setActiveModal('timelines')}
          onOpenDsaMl={() => setActiveModal('dsaml')}
          onOpenAiAdvisor={() => setActiveModal('ai')}
          onOpenCompare={() => setActiveModal('compare')}
          onOpenPause={() => {
            setSaveStatus(null);
            setActiveModal('pause');
          }}
        />
      )}

      {/* Modals & Drawers (Lazy-loaded for fast startup on slow mobile connections) */}
      <Suspense fallback={null}>
        {activeModal === 'dashboard' && (
          <UserDashboardModal
            world={activeWorld}
            timeline={activeTimeline}
            playerLevel={progression.level}
            playerXp={progression.xp}
            projectedIncome={projectedIncome}
            autoEarn={autoEarn}
            goals={goalsList}
            builtCount={actionStats.builtCount}
            upgradedCount={actionStats.upgradedCount}
            onToggleAutoEarn={() => setAutoEarn((a) => !a)}
            onChangeTaxRate={handleChangeTaxRate}
            onCollectCycle={() => handleAdvanceEpoch(false)}
            onGrantCredits={handleGrantCredits}
            onOpenTrade={() => setActiveModal('trade')}
            onOpenGoals={() => setActiveModal('goals')}
            onOpenWorlds={() => setActiveModal('worlds')}
            onOpenTimelines={() => setActiveModal('timelines')}
            onOpenAiAdvisor={() => setActiveModal('ai')}
            onOpenDsaMl={() => setActiveModal('dsaml')}
            onOpenCompare={() => setActiveModal('compare')}
            onClose={() => setActiveModal('none')}
          />
        )}

        {activeModal === 'trade' && (
          <TradeMarketModal
            era={activeTimeline.era}
            resources={activeTimeline.resources}
            entities={activeTimeline.entities}
            onSellResource={handleSellResource}
            onFulfillContract={handleFulfillTradeContract}
            onClose={() => setActiveModal('none')}
          />
        )}

        {activeModal === 'credits' && (
          <CreditsModal
            credits={activeTimeline.resources.credits}
            taxRate={activeWorld.parameters.taxRate}
            projectedIncome={projectedIncome}
            entities={activeTimeline.entities}
            autoEarn={autoEarn}
            onToggleAutoEarn={() => setAutoEarn((a) => !a)}
            onChangeTaxRate={handleChangeTaxRate}
            onGrantCredits={handleGrantCredits}
            onCollectCycle={() => handleAdvanceEpoch(false)}
            onClose={() => setActiveModal('none')}
          />
        )}

        {activeModal === 'guide' && <QuickGuideModal onClose={() => setActiveModal('none')} />}

        {activeModal === 'goals' && (
          <GoalsModal
            era={activeTimeline.era}
            xp={progression.xp}
            level={progression.level}
            goals={goalsList}
            onClose={() => setActiveModal('none')}
          />
        )}

        {activeModal === 'worlds' && (
          <WorldManagerModal
            worlds={worlds}
            activeWorldId={activeWorld.id}
            onClose={() => setActiveModal('none')}
            onSelectWorld={(id) => {
              handleSelectWorld(id);
              setScreenMode('playing');
            }}
            onCreateWorld={handleCreateWorld}
            onDuplicateWorld={handleDuplicateWorld}
            onDeleteWorld={handleDeleteWorld}
          />
        )}

        {activeModal === 'timelines' && (
          <TimelineTreeDrawer
            world={activeWorld}
            activeTimeline={activeTimeline}
            onClose={() => setActiveModal('none')}
            onSwitchTimeline={handleSwitchTimeline}
            onBranchTimeline={handleBranchTimeline}
          />
        )}

        {activeModal === 'dsaml' && (
          <DsaMlLabModal
            timeline={activeTimeline}
            dsaContext={dsaContext}
            mlReport={mlReport}
            onClose={() => setActiveModal('none')}
          />
        )}

        {activeModal === 'ai' && (
          <AiAdvisorDrawer
            world={activeWorld}
            timeline={activeTimeline}
            dsaContext={dsaContext}
            mlReport={mlReport}
            onSaveRecommendations={handleSaveRecommendations}
            onClose={() => setActiveModal('none')}
          />
        )}

        {activeModal === 'compare' && (
          <WorldCompareModal worlds={worlds} onClose={() => setActiveModal('none')} />
        )}

        {activeModal === 'pause' && (
          <PauseModal
            worldName={activeWorld.name}
            saveStatus={saveStatus}
            onResume={() => setActiveModal('none')}
            onSaveNow={() => {
              persistWorlds(worlds);
              setSaveStatus('Saved all worlds & timelines to persistent storage.');
            }}
            onOpenWorlds={() => setActiveModal('worlds')}
            onReturnToTitle={() => {
              setActiveModal('none');
              setScreenMode('title');
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
