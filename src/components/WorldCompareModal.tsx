import React, { useMemo, useState } from 'react';
import { GitCompare, Sparkles, X } from 'lucide-react';
import { BUILDING_SPECS, ERA_THEMES } from '../data/presets';
import { generateMLPredictions } from '../ml/predictor';
import { BuildingType, TimelineNode, WorldRecord } from '../types/archiverse';

interface WorldCompareModalProps {
  worlds: WorldRecord[];
  onClose: () => void;
}

interface TimelineOption {
  key: string;
  world: WorldRecord;
  timeline: TimelineNode;
  label: string;
}

export const WorldCompareModal: React.FC<WorldCompareModalProps> = ({ worlds, onClose }) => {
  const options: TimelineOption[] = useMemo(() => {
    const out: TimelineOption[] = [];
    for (const w of worlds) {
      for (const tl of Object.values(w.timelines)) {
        out.push({
          key: `${w.id}::${tl.id}`,
          world: w,
          timeline: tl,
          label: `${w.name} — ${tl.name}`,
        });
      }
    }
    return out;
  }, [worlds]);

  const [selectedKeys, setSelectedKeys] = useState<string[]>(() =>
    options.slice(0, 2).map((o) => o.key),
  );
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedItems = useMemo(
    () =>
      selectedKeys
        .map((k) => options.find((o) => o.key === k))
        .filter((x): x is TimelineOption => Boolean(x)),
    [selectedKeys, options],
  );

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) {
        return prev.length > 2 ? prev.filter((k) => k !== key) : prev;
      }
      if (prev.length >= 3) return [prev[1], prev[2], key];
      return [...prev, key];
    });
  };

  const handleAiCompare = async () => {
    if (selectedItems.length < 2) return;
    setLoadingAi(true);
    setErrorMsg(null);
    try {
      const worldsSummary = selectedItems.map((item) => {
        const ml = generateMLPredictions(item.world, item.timeline, worlds);
        const lastFc = ml.forecast[ml.forecast.length - 1];
        return {
          name: item.label,
          era: item.timeline.era,
          decision: item.timeline.decisionTitle,
          metrics: item.timeline.metrics,
          resources: item.timeline.resources,
          mlEpoch8Forecast: lastFc,
        };
      });

      const res = await fetch('/api/ai/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worldsSummary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Comparison failed.');
      setAiSummary(data.summary);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'AI comparison error');
    } finally {
      setLoadingAi(false);
    }
  };

  const trackedZones: BuildingType[] = [
    'residential',
    'farm',
    'milk_shop',
    'commercial',
    'mall',
    'food_street',
    'zoo',
    'pyramid',
    'industrial',
    'park',
    'tree_garden',
    'power_hub',
    'transit_hub',
    'road',
  ];

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/75 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[88vh] bg-[#0c1220] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <GitCompare className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Parallel Reality Comparison Studio
              </h2>
              <p className="text-xs text-slate-400">
                Select 2–3 parallel worlds or branched timelines to compare infrastructure, connectivity & ML trajectories
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

        <div className="flex-1 overflow-y-auto arch-scroll p-5 space-y-5">
          {/* Selector Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {options.map((opt) => {
              const active = selectedKeys.includes(opt.key);
              const theme = ERA_THEMES[opt.timeline.era];
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => toggleSelect(opt.key)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-800 border-emerald-400 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: theme.accentHex }}
                  />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Comparison Cards */}
          <div
            className={`grid gap-4 ${
              selectedItems.length === 3 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
            }`}
          >
            {selectedItems.map((item) => {
              const tl = item.timeline;
              const theme = ERA_THEMES[tl.era];
              const ml = generateMLPredictions(item.world, tl, worlds);
              const lastFc = ml.forecast[ml.forecast.length - 1];
              const netMw = tl.resources.energyProduced - tl.resources.energyConsumed;
              const totalCount = Math.max(1, tl.entities.length);

              return (
                <div
                  key={item.key}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{item.label}</h3>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {theme.name} · {tl.decisionTitle}
                      </div>
                    </div>
                    <span className="text-xs font-mono-num px-2 py-1 rounded bg-slate-950 border border-slate-800 text-amber-300">
                      {tl.metrics.prosperityScore}/100
                    </span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono-num">
                    <div className="p-2 rounded bg-slate-950/70">
                      <span className="text-[10px] text-slate-400 block">Population</span>
                      <span className="text-sky-300 font-semibold">{tl.metrics.population}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/70">
                      <span className="text-[10px] text-slate-400 block">Credits</span>
                      <span className="text-amber-300 font-semibold">{tl.resources.credits}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/70">
                      <span className="text-[10px] text-slate-400 block">Net Power</span>
                      <span className={netMw >= 0 ? 'text-yellow-300 font-semibold' : 'text-rose-400 font-semibold'}>
                        {netMw >= 0 ? `+${netMw}` : netMw} MW
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/70">
                      <span className="text-[10px] text-slate-400 block">Eco Index</span>
                      <span className="text-emerald-300 font-semibold">{tl.metrics.ecoIndex}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/70">
                      <span className="text-[10px] text-slate-400 block">BFS Grid</span>
                      <span className="text-slate-200 font-semibold">{tl.metrics.connectivityPct}%</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/70">
                      <span className="text-[10px] text-slate-400 block">Happiness</span>
                      <span className="text-indigo-300 font-semibold">{tl.metrics.happiness}%</span>
                    </div>
                  </div>

                  {/* Infrastructure Distribution */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      Infrastructure Mix
                    </div>
                    {trackedZones.map((zt) => {
                      const cnt = tl.entities.filter((e) => e.type === zt).length;
                      const pct = Math.round((cnt / totalCount) * 100);
                      const spec = BUILDING_SPECS[zt];
                      return (
                        <div key={zt} className="flex items-center gap-2 text-[11px]">
                          <span className="w-16 text-slate-400 truncate">{spec.shortLabel}</span>
                          <div className="flex-1 h-2 rounded-full bg-slate-950 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: spec.color }}
                            />
                          </div>
                          <span className="w-6 text-right font-mono-num text-slate-300">{cnt}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* ML Horizon Preview */}
                  <div className="pt-2.5 border-t border-slate-800 text-[11px] font-mono-num text-slate-300">
                    <span className="text-slate-500 block font-sans mb-0.5">
                      ML Horizon (Epoch {lastFc.epochOffset}):
                    </span>
                    Pop <strong className="text-sky-300">{lastFc.predictedPopulation}</strong> · Eco{' '}
                    <strong className="text-emerald-300">{lastFc.predictedEcoIndex}</strong> · Power{' '}
                    <strong className="text-yellow-300">{lastFc.predictedEnergyDemand} MW</strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Comparison Action & Output */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Gemini AI Parallel Reality Divergence Analysis
                </h3>
                <p className="text-xs text-slate-400">
                  Synthesizes decision trade-offs across selected worlds
                </p>
              </div>
              <button
                type="button"
                onClick={handleAiCompare}
                disabled={loadingAi || selectedItems.length < 2}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{loadingAi ? 'Comparing Realities...' : 'Generate AI Comparison'}</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                {errorMsg}
              </div>
            )}

            {aiSummary && (
              <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                {aiSummary}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
