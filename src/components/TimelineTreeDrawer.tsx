import React, { useState } from 'react';
import { GitBranch, GitCommitHorizontal, History, Plus, X } from 'lucide-react';
import { ERA_THEMES } from '../data/presets';
import { TimelineNode, WorldEra, WorldRecord } from '../types/archiverse';

interface TimelineTreeDrawerProps {
  world: WorldRecord;
  activeTimeline: TimelineNode;
  onClose: () => void;
  onSwitchTimeline: (timelineId: string) => void;
  onBranchTimeline: (config: {
    name: string;
    decisionTitle: string;
    era: WorldEra;
  }) => void;
}

export const TimelineTreeDrawer: React.FC<TimelineTreeDrawerProps> = ({
  world,
  activeTimeline,
  onClose,
  onSwitchTimeline,
  onBranchTimeline,
}) => {
  const [branchName, setBranchName] = useState('Alternative Reality');
  const [decisionTitle, setDecisionTitle] = useState('Transit-First Urban Reform');
  const [branchEra, setBranchEra] = useState<WorldEra>(activeTimeline.era);

  const renderTreeBranch = (nodeId: string, depth = 0): React.ReactNode => {
    const node = world.timelines[nodeId];
    if (!node) return null;
    const isActive = node.id === activeTimeline.id;
    const theme = ERA_THEMES[node.era];

    return (
      <div key={node.id} className="space-y-2">
        <div
          style={{ marginLeft: `${depth * 20}px` }}
          className={`p-3 rounded-lg border transition-colors ${
            isActive
              ? 'bg-slate-900 border-sky-400'
              : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <GitCommitHorizontal className="w-4 h-4 shrink-0" style={{ color: theme.accentHex }} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white truncate">{node.name}</span>
                  {isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  Decision: {node.decisionTitle}
                </div>
              </div>
            </div>

            {!isActive && (
              <button
                type="button"
                onClick={() => onSwitchTimeline(node.id)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-xs font-medium text-sky-300 transition-colors cursor-pointer shrink-0"
              >
                Jump Here
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mt-2 text-[11px] font-mono-num text-slate-400">
            <span>Epoch {node.metrics.epoch}</span>
            <span className="text-sky-300">Pop {node.metrics.population}</span>
            <span className="text-emerald-300">Eco {node.metrics.ecoIndex}</span>
            <span className="text-amber-300">{node.resources.credits} cr</span>
            <span>{node.metrics.totalBuildings} blds</span>
          </div>
        </div>

        {node.childrenIds.map((cid) => renderTreeBranch(cid, depth + 1))}
      </div>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !decisionTitle.trim()) return;
    onBranchTimeline({
      name: branchName.trim(),
      decisionTitle: decisionTitle.trim(),
      era: branchEra,
    });
    setBranchName(`Branch ${Object.keys(world.timelines).length + 1}`);
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/75 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[88vh] bg-[#0c1220] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <GitBranch className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Parallel Timeline Tree — {world.name}
              </h2>
              <p className="text-xs text-slate-400">
                General Tree (`CustomTree`) branching alternative urban realities from any epoch
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

        <div className="flex-1 overflow-y-auto arch-scroll p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: General Tree Hierarchy & Decision Log */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                Timeline Hierarchy ({Object.keys(world.timelines).length} Nodes)
              </div>
              <div className="space-y-2">{renderTreeBranch(world.rootTimelineId)}</div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span>Singly Linked List — Active Timeline Decisions</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto arch-scroll pr-1">
                {activeTimeline.decisions
                  .slice()
                  .reverse()
                  .map((dec) => (
                    <div
                      key={dec.id}
                      className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{dec.action}</span>
                        <span className="font-mono-num text-[10px] text-slate-400">
                          Epoch {dec.epoch}
                        </span>
                      </div>
                      <p className="text-slate-400 mt-0.5">{dec.detail}</p>
                      <div className="text-[11px] text-emerald-400 mt-0.5">{dec.impactSummary}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Right: Branch New Timeline */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3.5 h-fit"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Plus className="w-4 h-4 text-sky-400" />
              <span>Branch From "{activeTimeline.name}"</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Forks all buildings, roads, and resources at Epoch {activeTimeline.metrics.epoch} into an independent parallel timeline so you can test an alternative policy.
            </p>

            <div>
              <label className="block text-xs text-slate-400 mb-1">New Timeline Name</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Divergence Decision</label>
              <input
                type="text"
                value={decisionTitle}
                onChange={(e) => setDecisionTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Reality Aesthetic</label>
              <select
                value={branchEra}
                onChange={(e) => setBranchEra(e.target.value as WorldEra)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-400"
              >
                {(Object.keys(ERA_THEMES) as WorldEra[]).map((k) => (
                  <option key={k} value={k}>
                    {ERA_THEMES[k].name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
            >
              Fork Parallel Timeline
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
