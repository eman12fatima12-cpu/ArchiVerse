import React, { useState } from 'react';
import { Copy, Globe2, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { ERA_THEMES } from '../data/presets';
import { rankWorldsWithMergeSort } from '../dsa/engine';
import { WorldEra, WorldParameters, WorldRecord } from '../types/archiverse';

interface WorldManagerModalProps {
  worlds: WorldRecord[];
  activeWorldId: string;
  onClose: () => void;
  onSelectWorld: (worldId: string) => void;
  onCreateWorld: (config: {
    name: string;
    description: string;
    era: WorldEra;
    parameters: WorldParameters;
  }) => void;
  onDuplicateWorld: (worldId: string) => void;
  onDeleteWorld: (worldId: string) => void;
}

export const WorldManagerModal: React.FC<WorldManagerModalProps> = ({
  worlds,
  activeWorldId,
  onClose,
  onSelectWorld,
  onCreateWorld,
  onDuplicateWorld,
  onDeleteWorld,
}) => {
  const [name, setName] = useState('Nova Meridian');
  const [era, setEra] = useState<WorldEra>('eco_arcology');
  const [taxRate, setTaxRate] = useState(12);
  const [ecoPolicy, setEcoPolicy] = useState<WorldParameters['ecoPolicy']>('balanced');
  const [startingCredits, setStartingCredits] = useState(2500);
  const [description, setDescription] = useState(
    'A newly seeded parallel city testing balanced green transit and modular zoning.',
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const rankedWorlds = rankWorldsWithMergeSort(worlds);

  const handleGenerateDescription = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worldName: name || 'Untitled World',
          era,
          parameters: { taxRate, ecoPolicy, startingCredits, gridSize: 16 },
          decisionTitle: 'Founding Parallel Charter',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate description');
      if (data.description) setDescription(data.description);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI description error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateWorld({
      name: name.trim(),
      description: description.trim(),
      era,
      parameters: {
        gridSize: 16,
        taxRate,
        ecoPolicy,
        startingCredits,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/75 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[88vh] bg-[#0c1220] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Globe2 className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Parallel World Generator & Multiverse Registry
              </h2>
              <p className="text-xs text-slate-400">
                Ranked dynamically via Divide-and-Conquer Merge Sort on Prosperity Score
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

        <div className="flex-1 overflow-y-auto arch-scroll p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left: Ranked Worlds Library */}
          <div className="md:col-span-7 space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Saved Parallel Worlds ({rankedWorlds.length})
            </div>

            {rankedWorlds.map((w, idx) => {
              const tl = w.timelines[w.activeTimelineId];
              const theme = ERA_THEMES[w.era];
              const isActive = w.id === activeWorldId;
              return (
                <div
                  key={w.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    isActive
                      ? 'bg-slate-900/95 border-amber-400/80'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono-num px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          #{idx + 1}
                        </span>
                        <h3 className="text-sm font-semibold text-white">{w.name}</h3>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: `${theme.accentHex}22`,
                            color: theme.accentHex,
                          }}
                        >
                          {theme.name}
                        </span>
                        {isActive && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{w.description}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectWorld(w.id);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold cursor-pointer"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicateWorld(w.id)}
                        title="Clone into Parallel World"
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {worlds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteWorld(w.id)}
                          title="Delete World"
                          className="p-1.5 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono-num">
                    <div>
                      <span className="text-slate-500 block">Prosperity</span>
                      <span className="text-amber-300 font-semibold">{tl?.metrics.prosperityScore ?? 0}/100</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Pop</span>
                      <span className="text-sky-300">{tl?.metrics.population ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Eco</span>
                      <span className="text-emerald-300">{tl?.metrics.ecoIndex ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">BFS Grid</span>
                      <span className="text-slate-200">{tl?.metrics.connectivityPct ?? 0}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Timelines</span>
                      <span className="text-purple-300">{Object.keys(w.timelines).length}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Create New Parallel World Form */}
          <form
            onSubmit={handleCreate}
            className="md:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5 h-fit"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Generate New Parallel World</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEra('prime_classical');
                  setName('Old Era: New Albion');
                  setEcoPolicy('balanced');
                  setStartingCredits(2500);
                  setDescription(
                    'Historic cobblestone and sandstone city powered by brass clockworks, wind mills, and steam rail guildhalls.',
                  );
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  era === 'prime_classical'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                Old Era Preset
              </button>
              <button
                type="button"
                onClick={() => {
                  setEra('neo_cyber');
                  setName('New Era: Quantum Prime');
                  setEcoPolicy('balanced');
                  setStartingCredits(3400);
                  setDescription(
                    'Advanced-tech metropolis powered by Quantum Fusion Reactors, Maglev Sky-Terminals, and Holo-Biodomes.',
                  );
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  era === 'neo_cyber'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                New Era (Adv Tech)
              </button>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">World Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Architectural Era & Atmosphere</label>
              <select
                value={era}
                onChange={(e) => setEra(e.target.value as WorldEra)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-400"
              >
                {(Object.keys(ERA_THEMES) as WorldEra[]).map((k) => (
                  <option key={k} value={k}>
                    {ERA_THEMES[k].name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tax Rate ({taxRate}%)</label>
                <input
                  type="range"
                  min={5}
                  max={25}
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Starting Credits</label>
                <input
                  type="number"
                  min={1000}
                  max={10000}
                  step={100}
                  value={startingCredits}
                  onChange={(e) => setStartingCredits(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono-num text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Urban Policy Mandate</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['balanced', 'green_mandate', 'deregulated'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setEcoPolicy(p)}
                    className={`py-1.5 px-2 rounded text-[11px] font-medium border cursor-pointer capitalize ${
                      ecoPolicy === p
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {p.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">World Description</label>
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-1 text-[11px] text-purple-300 hover:text-purple-200 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{aiLoading ? 'Generating...' : 'AI Draft'}</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-400"
              />
              {aiError && <p className="text-[11px] text-rose-400 mt-1">{aiError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
            >
              Launch Parallel World
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
