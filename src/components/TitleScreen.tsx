import React, { useEffect } from 'react';
import { ArrowRight, Globe2, Layers, Sparkles } from 'lucide-react';
import { ERA_THEMES } from '../data/presets';
import { PWAInstallButton } from '../hooks/usePWA';
import { WorldRecord } from '../types/archiverse';

interface TitleScreenProps {
  worlds: WorldRecord[];
  activeWorldId: string;
  onSelectWorld: (id: string) => void;
  onEnterSimulation: () => void;
  onOpenWorldGenerator: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  worlds,
  activeWorldId,
  onSelectWorld,
  onEnterSimulation,
  onOpenWorldGenerator,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
        e.preventDefault();
        onEnterSimulation();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onEnterSimulation]);

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto arch-scroll flex flex-col justify-between gap-5 p-4 sm:p-6 md:p-10">
      {/* Subtle calm gradient scrim for legibility without blocking the live 3D city */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 22% 38%, rgba(8,11,18,0.84) 0%, rgba(8,11,18,0.45) 48%, rgba(8,11,18,0.14) 100%)',
        }}
      />

      {/* Top header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-950/85 border border-slate-700/60 text-[11px] sm:text-xs tracking-wider uppercase text-slate-300">
          <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">3D Parallel-World Simulation</span>
        </div>
        <div className="flex items-center gap-2">
          <PWAInstallButton compact />
          <button
            type="button"
            onClick={onOpenWorldGenerator}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-950/85 hover:bg-slate-900 border border-slate-700/70 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            <Globe2 className="w-3.5 h-3.5 text-sky-400" />
            <span>World Generator</span>
          </button>
        </div>
      </div>

      {/* Main Title Lockup */}
      <div className="relative z-10 max-w-xl my-auto">
        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          <svg
            className="w-11 h-11 sm:w-14 sm:h-14 shrink-0"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="ArchiVerse AI Emblem"
          >
            <circle cx="32" cy="32" r="28" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" />
            <circle cx="32" cy="32" r="20" stroke="#38bdf8" strokeWidth="2" />
            <path d="M32 8L37 27L56 32L37 37L32 56L27 37L8 32L27 27L32 8Z" fill="#0f172a" stroke="#f8fafc" strokeWidth="1.5" />
            <circle cx="32" cy="32" r="5" fill="#38bdf8" />
          </svg>
          <div>
            <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold tracking-wide text-white leading-none">
              ARCHIVERSE <span className="text-amber-400">AI</span>
            </h1>
            <p className="text-[10px] sm:text-xs md:text-sm tracking-[0.18em] sm:tracking-[0.22em] uppercase text-sky-300 mt-1 font-medium">
              Parallel Timeline City Builder
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm md:text-base text-slate-200 leading-relaxed mb-3 sm:mb-4 max-w-lg">
          Build thriving 3D worlds in <strong>Old Era</strong> &amp; <strong>New Era</strong>! Raise Cows, Sheep, Goats &amp; Horses, deliver Milk to Shops, run Camel Caravans &amp; Trade Markets, unlock Zoos, Parks, Food Streets &amp; Pyramids.
        </p>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4 sm:mb-5 max-w-lg text-[10px] sm:text-[11px]">
          <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950/85 border border-slate-700/70">
            <div className="font-semibold text-amber-300">1. Build</div>
            <div className="text-slate-300 mt-0.5 hidden sm:block">Place Farms, Milk Shops, Trees &amp; Roads</div>
          </div>
          <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950/85 border border-slate-700/70">
            <div className="font-semibold text-emerald-300">2. Trade</div>
            <div className="text-slate-300 mt-0.5 hidden sm:block">Ship Milk &amp; Crops in Trade Market</div>
          </div>
          <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950/85 border border-slate-700/70">
            <div className="font-semibold text-sky-300">3. Level Up</div>
            <div className="text-slate-300 mt-0.5 hidden sm:block">Unlock Zoos, Pyramids &amp; Castles</div>
          </div>
        </div>

        {/* Active World Selector Cards */}
        <div className="mb-4 sm:mb-6">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-2 font-medium">
            Select Starting Reality
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {worlds.slice(0, 3).map((w) => {
              const active = w.id === activeWorldId;
              const era = ERA_THEMES[w.era];
              const tl = w.timelines[w.activeTimelineId];
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onSelectWorld(w.id)}
                  className={`text-left p-2.5 sm:p-3 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900/95 border-amber-400/90 text-white'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-600 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-semibold truncate">{w.name}</span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: era.accentHex }}
                    />
                  </div>
                  <div className="text-[11px] font-medium truncate" style={{ color: era.accentHex }}>
                    {era.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{era.tagline}</div>
                  <div className="text-[11px] font-mono-num text-sky-300 mt-1">
                    Pop {tl?.metrics.population ?? 0} · {Object.keys(w.timelines).length} branch
                    {Object.keys(w.timelines).length > 1 ? 'es' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onEnterSimulation}
            className="inline-flex items-center gap-2.5 px-5 py-3 sm:px-6 sm:py-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-semibold text-sm tracking-wide transition cursor-pointer shadow-lg"
          >
            <span>Enter 3D Simulation</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenWorldGenerator}
            className="inline-flex items-center gap-2 px-4 py-3 sm:py-3.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Create Parallel World</span>
          </button>
        </div>
      </div>

      {/* Control-hint line */}
      <div className="relative z-10 flex items-center justify-between text-[11px] sm:text-xs text-slate-400 font-mono-num">
        <span className="hidden sm:inline">
          Click Place · R Rotate · Drag Orbit · Scroll Zoom · Space Advance Epoch · H Zen HUD · Esc Pause
        </span>
        <span className="sm:hidden">
          Tap Place · Drag Rotate · Pinch Zoom · Smooth Offline Ready
        </span>
        <span className="hidden md:inline text-slate-500">Enter / Space to Start</span>
      </div>
    </div>
  );
};
