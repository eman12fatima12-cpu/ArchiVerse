import React, { useMemo, useState } from 'react';
import { Activity, Cpu, Search, TrendingUp, X } from 'lucide-react';
import { binarySearch, bubbleSort, dfsExploration, linearSearch } from '../dsa/algorithms';
import { DSAWorldContext } from '../dsa/engine';
import { MLPredictionReport, PlacedEntity, TimelineNode } from '../types/archiverse';

interface DsaMlLabModalProps {
  timeline: TimelineNode;
  dsaContext: DSAWorldContext;
  mlReport: MLPredictionReport;
  onClose: () => void;
}

export const DsaMlLabModal: React.FC<DsaMlLabModalProps> = ({
  timeline,
  dsaContext,
  mlReport,
  onClose,
}) => {
  const [tab, setTab] = useState<'dsa' | 'ml'>('dsa');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchAlgo, setSearchAlgo] = useState<'binary' | 'linear'>('binary');

  const { snapshot, graph, priorityHeap, taskQueue } = dsaContext;

  const dfsOrder = useMemo(() => {
    const nodes = graph.getNodes();
    if (nodes.length === 0) return [];
    return dfsExploration(graph, nodes[0]).slice(0, 12);
  }, [graph]);

  const sortedByName = useMemo(() => {
    return bubbleSort(
      timeline.entities.filter((e) => e.type !== 'road'),
      (a, b) => a.name.localeCompare(b.name),
    );
  }, [timeline.entities]);

  const searchResult: PlacedEntity | undefined = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return undefined;
    if (searchAlgo === 'binary') {
      const idx = binarySearch(sortedByName, q, (e) => e.name);
      return idx >= 0 ? sortedByName[idx] : undefined;
    }
    return linearSearch(timeline.entities, (e) =>
      e.name.toLowerCase().includes(q.toLowerCase()),
    );
  }, [searchQuery, searchAlgo, sortedByName, timeline.entities]);

  const heapItems = priorityHeap.toArray().slice(0, 4);
  const queueItems = taskQueue.toArray().slice(0, 4);

  const maxForecastPop = Math.max(
    1,
    ...mlReport.forecast.map((f) => f.predictedPopulation),
  );

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/75 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[88vh] bg-[#0c1220] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Custom DSA Telemetry & ML Prediction Lab
              </h2>
              <p className="text-xs text-slate-400">
                Live execution metrics from manual Data Structures, Graph Algorithms & Multivariate Regression
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-900 border border-slate-700 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTab('dsa')}
                className={`px-3 py-1 rounded-md font-medium cursor-pointer ${
                  tab === 'dsa' ? 'bg-amber-500 text-slate-950' : 'text-slate-300'
                }`}
              >
                DSA Engine
              </button>
              <button
                type="button"
                onClick={() => setTab('ml')}
                className={`px-3 py-1 rounded-md font-medium cursor-pointer ${
                  tab === 'ml' ? 'bg-sky-500 text-slate-950' : 'text-slate-300'
                }`}
              >
                ML Predictions
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto arch-scroll p-5">
          {tab === 'dsa' ? (
            <div className="space-y-5">
              {/* Top Grid of Live Structures */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono-num">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase">Graph (Adj List)</div>
                  <div className="text-lg font-semibold text-sky-300 mt-1">
                    {snapshot.graphNodes}V · {snapshot.graphEdges}E
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    BFS Components: {snapshot.connectedComponents} · Isolated: {snapshot.isolatedCoords.length}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase">AVL & BST Index</div>
                  <div className="text-lg font-semibold text-emerald-300 mt-1">
                    H={snapshot.avlHeight} · {snapshot.avlNodeCount} Nodes
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Rotations: {dsaContext.avl.rotationCount} · Balance: {snapshot.avlBalanceFactor}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase">Hash Table (Chaining)</div>
                  <div className="text-lg font-semibold text-amber-300 mt-1">
                    α = {snapshot.hashLoadFactor}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Buckets: {snapshot.hashBucketCount} · Collisions: {snapshot.hashCollisions}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase">Stack / Queue / List</div>
                  <div className="text-lg font-semibold text-purple-300 mt-1">
                    S:{snapshot.stackDepth} · Q:{snapshot.queueLength} · L:{snapshot.linkedListLength}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Tree Depth: {snapshot.timelineTreeDepth} ({snapshot.timelineBranchCount} branches)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* QuickSort Building Rankings + Binary/Linear Search */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        QuickSort — Top Strategic Buildings
                      </h3>
                      <span className="text-[10px] font-mono-num text-amber-400">O(n log n)</span>
                    </div>
                    <div className="space-y-2">
                      {snapshot.topRankedBuildings.map((b, idx) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between px-3 py-2 rounded bg-slate-950/70 border border-slate-800/80 text-xs"
                        >
                          <span className="text-slate-200">
                            <span className="font-mono-num text-slate-500 mr-2">#{idx + 1}</span>
                            {b.name}
                          </span>
                          <span className="font-mono-num text-amber-300 font-semibold">
                            Score {b.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Binary Search & Linear Search Lookup */}
                  <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-sky-400" />
                        <span>Building Record Lookup</span>
                      </h3>
                      <div className="inline-flex rounded bg-slate-950 border border-slate-800 p-0.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setSearchAlgo('binary')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            searchAlgo === 'binary' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          Binary Search (BubbleSorted)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSearchAlgo('linear')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            searchAlgo === 'linear' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          Linear Search
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        searchAlgo === 'binary'
                          ? `Exact name e.g. ${sortedByName[0]?.name ?? 'Chrono Rift Spire'}`
                          : 'Partial name e.g. Spire, Tower, Park...'
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-400"
                    />
                    {searchQuery.trim() && (
                      <div className="text-xs font-mono-num p-2.5 rounded bg-slate-950 border border-slate-800">
                        {searchResult ? (
                          <span className="text-emerald-300">
                            Found: {searchResult.name} at ({searchResult.gx}, {searchResult.gz}) · Cost {searchResult.cost}
                          </span>
                        ) : (
                          <span className="text-slate-400">No matching building record found.</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Min-Heap Priority Alerts, Task Queue & DFS Trace */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
                      Min-Heap Priority Alerts & Queue Tasks
                    </h3>
                    <div className="space-y-2">
                      {heapItems.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2.5 px-3 py-2 rounded bg-slate-950/70 border border-slate-800/80 text-xs"
                        >
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono-num text-[10px]">
                            P{h.priority}
                          </span>
                          <span className="text-slate-200">{h.value}</span>
                        </div>
                      ))}
                      {queueItems.length > 0 && (
                        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono-num">
                          Queue FIFO: {queueItems.join(' → ')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                      DFS Network Exploration Trace (First 12 Tiles)
                    </h3>
                    <div className="flex flex-wrap gap-1.5 font-mono-num text-[11px]">
                      {dfsOrder.map((coord, i) => (
                        <span
                          key={coord}
                          className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sky-300"
                        >
                          {i > 0 ? '→ ' : ''}({coord})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* ML Validation Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono-num">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase">Validation R² Score</div>
                  <div className="text-xl font-semibold text-emerald-300 mt-1">
                    {mlReport.validation.r2Score}
                  </div>
                  <div className="text-[11px] text-slate-400">Holdout 20% split</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase">MAE (Population)</div>
                  <div className="text-xl font-semibold text-sky-300 mt-1">
                    ±{mlReport.validation.maePopulation}
                  </div>
                  <div className="text-[11px] text-slate-400">Citizens error margin</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase">RMSE (Credits)</div>
                  <div className="text-xl font-semibold text-amber-300 mt-1">
                    ±{mlReport.validation.rmseCredits}
                  </div>
                  <div className="text-[11px] text-slate-400">Treasury deviation</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase">Training Samples</div>
                  <div className="text-xl font-semibold text-purple-300 mt-1">
                    {mlReport.validation.sampleCount}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {mlReport.validation.dominantDriver}
                  </div>
                </div>
              </div>

              {/* Pattern Summary */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Multivariate Regression Forecast (Simulation Estimates)
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {mlReport.patternSummary}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Note: Predictions are statistical estimates derived from historical simulation data, not real-world forecasts.
                  </p>
                </div>
              </div>

              {/* Forecast Bar Visualization + Table */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>8-Epoch Forward Projection</span>
                </div>

                <div className="grid grid-cols-8 gap-2 items-end h-32 mb-4 pt-2 border-b border-slate-800 pb-2">
                  {mlReport.forecast.map((pt) => {
                    const pct = Math.max(12, Math.round((pt.predictedPopulation / maxForecastPop) * 100));
                    return (
                      <div key={pt.epochOffset} className="flex flex-col items-center gap-1 h-full justify-end">
                        <span className="text-[10px] font-mono-num text-sky-300">
                          {pt.predictedPopulation}
                        </span>
                        <div
                          className="w-full max-w-[36px] rounded-t bg-sky-500/80"
                          style={{ height: `${pct}%` }}
                        />
                        <span className="text-[10px] font-mono-num text-slate-400">
                          E{pt.epochOffset}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono-num">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="py-1.5">Epoch</th>
                        <th className="py-1.5">Est. Population</th>
                        <th className="py-1.5">Est. Credits</th>
                        <th className="py-1.5">Energy Demand</th>
                        <th className="py-1.5">Eco Index</th>
                        <th className="py-1.5">Happiness</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mlReport.forecast.map((pt) => (
                        <tr key={pt.epochOffset} className="border-b border-slate-800/50 text-slate-200">
                          <td className="py-1.5 text-slate-400">Epoch {pt.epochOffset}</td>
                          <td className="py-1.5 text-sky-300">{pt.predictedPopulation.toLocaleString()}</td>
                          <td className="py-1.5 text-amber-300">{pt.predictedCredits.toLocaleString()}</td>
                          <td className="py-1.5 text-yellow-300">{pt.predictedEnergyDemand} MW</td>
                          <td className="py-1.5 text-emerald-300">{pt.predictedEcoIndex}/100</td>
                          <td className="py-1.5 text-indigo-300">{pt.predictedHappiness}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
