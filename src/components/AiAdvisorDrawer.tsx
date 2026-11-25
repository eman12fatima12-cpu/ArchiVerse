import React, { useState } from 'react';
import { BrainCircuit, Send, Sparkles, X } from 'lucide-react';
import { DSAWorldContext } from '../dsa/engine';
import {
  AIRecommendation,
  BuildingType,
  MLPredictionReport,
  TimelineNode,
  WorldRecord,
} from '../types/archiverse';

interface AiAdvisorDrawerProps {
  world: WorldRecord;
  timeline: TimelineNode;
  dsaContext: DSAWorldContext;
  mlReport: MLPredictionReport;
  onSaveRecommendations: (recs: AIRecommendation[]) => void;
  onClose: () => void;
}

export const AiAdvisorDrawer: React.FC<AiAdvisorDrawerProps> = ({
  world,
  timeline,
  dsaContext,
  mlReport,
  onSaveRecommendations,
  onClose,
}) => {
  const [overview, setOverview] = useState<string | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<Array<{ q: string; a: string }>>([]);
  const [loadingAsk, setLoadingAsk] = useState(false);

  const buildingCounts = timeline.entities.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  const handleRunAudit = async () => {
    setLoadingAudit(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/advise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worldName: world.name,
          era: timeline.era,
          metrics: timeline.metrics,
          resources: timeline.resources,
          dsa: dsaContext.snapshot,
          buildingCounts,
          mlSummary: mlReport.patternSummary,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI Advisor request failed.');

      if (data.overview) setOverview(data.overview);
      const recs: AIRecommendation[] = (data.recommendations || []).map(
        (r: Partial<AIRecommendation>, idx: number) => ({
          id: `rec_${Date.now()}_${idx}`,
          title: r.title || 'Urban Strategy',
          category: (r.category as AIRecommendation['category']) || 'strategy',
          priority: (r.priority as AIRecommendation['priority']) || 'medium',
          summary: r.summary || '',
          suggestedAction: r.suggestedAction || '',
          createdAt: Date.now(),
        }),
      );
      onSaveRecommendations(recs);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach AI Advisor.');
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setLoadingAsk(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          context: {
            worldName: world.name,
            timeline: timeline.name,
            era: timeline.era,
            metrics: timeline.metrics,
            resources: timeline.resources,
            buildingCounts,
            isolatedCoords: dsaContext.snapshot.isolatedCoords,
            mlSummary: mlReport.patternSummary,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI Q&A failed.');
      setQaHistory((prev) => [{ q, a: data.answer }, ...prev]);
      setQuestion('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'AI question failed.');
    } finally {
      setLoadingAsk(false);
    }
  };

  const priorityBadge = (p: AIRecommendation['priority']) => {
    if (p === 'high') return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    if (p === 'medium') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  };

  const zonesSummary: Array<{ type: BuildingType; label: string }> = [
    { type: 'residential', label: 'Housing' },
    { type: 'farm', label: 'Farms' },
    { type: 'milk_shop', label: 'Milk Shops' },
    { type: 'commercial', label: 'Commerce' },
    { type: 'mall', label: 'Mall/Bazaar' },
    { type: 'food_street', label: 'Food St.' },
    { type: 'zoo', label: 'Zoo' },
    { type: 'pyramid', label: 'Pyramid' },
    { type: 'industrial', label: 'Industry' },
    { type: 'park', label: 'Parks' },
    { type: 'tree_garden', label: 'Trees' },
    { type: 'power_hub', label: 'Power' },
    { type: 'road', label: 'Roads' },
  ];

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/75 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[88vh] bg-[#0c1220] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <BrainCircuit className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Gemini AI City Advisor — {world.name}
              </h2>
              <p className="text-xs text-slate-400">
                Server-side Generative AI evaluating live road graphs, zoning balance & ML trends
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
          {/* Quick Context Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/75 border border-slate-800">
            <div className="flex flex-wrap gap-3 text-xs font-mono-num">
              {zonesSummary.map((z) => (
                <span key={z.type} className="text-slate-300">
                  {z.label}: <strong className="text-white">{buildingCounts[z.type] || 0}</strong>
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={handleRunAudit}
              disabled={loadingAudit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loadingAudit ? 'Analyzing City...' : 'Run AI Infrastructure Audit'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          {overview && (
            <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-slate-200 leading-relaxed">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1">
                Executive Diagnosis
              </div>
              {overview}
            </div>
          )}

          {/* Recommendations List */}
          {world.recommendations.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Strategic Recommendations
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {world.recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400">
                          {rec.category}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-semibold ${priorityBadge(
                            rec.priority,
                          )}`}
                        >
                          {rec.priority}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-white mb-1">{rec.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{rec.summary}</p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-sky-300">
                      Action: {rec.suggestedAction}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Natural Language Q&A */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Ask Urban Planning Advisor
            </div>
            <form onSubmit={handleAsk} className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. How can I raise Eco Index above 85 without hurting tax revenue?"
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-400"
              />
              <button
                type="submit"
                disabled={loadingAsk || !question.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loadingAsk ? 'Thinking...' : 'Ask'}</span>
              </button>
            </form>

            {qaHistory.length > 0 && (
              <div className="space-y-2.5">
                {qaHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs"
                  >
                    <div className="font-semibold text-sky-300">Q: {item.q}</div>
                    <div className="text-slate-200 leading-relaxed">{item.a}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
