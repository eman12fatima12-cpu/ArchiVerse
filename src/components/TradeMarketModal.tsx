import React from 'react';
import { ArrowRight, Coins, Milk, Package, ShoppingBag, Sparkles, Wheat, X } from 'lucide-react';
import { CityResources, PlacedEntity, WorldEra } from '../types/archiverse';

export interface TradeContract {
  id: string;
  title: string;
  partner: string;
  milkNeeded: number;
  cropsNeeded: number;
  materialsNeeded: number;
  creditsReward: number;
  xpReward: number;
}

export const TRADE_CONTRACTS: TradeContract[] = [
  {
    id: 'contract_dairy',
    title: 'Morning Milk & Cheese Caravan',
    partner: 'Oasis Dairy Guild',
    milkNeeded: 10,
    cropsNeeded: 5,
    materialsNeeded: 0,
    creditsReward: 340,
    xpReward: 75,
  },
  {
    id: 'contract_bazaar',
    title: 'Grand Bazaar Harvest Cargo',
    partner: 'Parallel Silk Merchants',
    milkNeeded: 12,
    cropsNeeded: 18,
    materialsNeeded: 12,
    creditsReward: 620,
    xpReward: 130,
  },
  {
    id: 'contract_royal',
    title: 'Royal Citadel Export Fleet',
    partner: 'Inter-Era Harbor Authority',
    milkNeeded: 22,
    cropsNeeded: 28,
    materialsNeeded: 25,
    creditsReward: 1150,
    xpReward: 240,
  },
];

interface TradeMarketModalProps {
  era: WorldEra;
  resources: CityResources;
  entities: PlacedEntity[];
  onSellResource: (good: 'milk' | 'crops' | 'materials', amount: number) => void;
  onFulfillContract: (contract: TradeContract) => void;
  onClose: () => void;
}

export const TradeMarketModal: React.FC<TradeMarketModalProps> = ({
  era,
  resources,
  entities,
  onSellResource,
  onFulfillContract,
  onClose,
}) => {
  const milkStock = resources.milkStock ?? 0;
  const cropsStock = resources.cropsStock ?? 0;
  const materialsStock = resources.materials ?? 0;
  const tradesDone = resources.tradeCompletedCount ?? 0;

  const farmCount = entities.filter((e) => e.type === 'farm').length;
  const milkShopCount = entities.filter((e) => e.type === 'milk_shop').length;
  const milkPerCycle = entities
    .filter((e) => e.type === 'farm')
    .reduce((acc, f) => acc + 4 * f.level, 0);
  const cropsPerCycle = entities
    .filter((e) => e.type === 'farm')
    .reduce((acc, f) => acc + 5 * f.level, 0);

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/75 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[88vh] bg-[#0c1220] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-semibold text-white">
                {era === 'prime_classical'
                  ? 'Camel Caravan & Dairy Trade Market'
                  : 'Cargo Exchange & Bio-Dairy Market'}
              </h2>
              <p className="text-xs text-slate-400">
                Raise Cows & Goats on Farms → Milkmen supply Milk Shops → Trade goods for Credits & XP
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
          {/* Supply Chain Overview */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-200">
              <span className="px-2 py-1 rounded bg-lime-500/15 border border-lime-500/40 text-lime-300 font-semibold">
                Farms: {farmCount} ({milkPerCycle} Milk / {cropsPerCycle} Crops per cycle)
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="px-2 py-1 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 font-semibold">
                Milk Shops: {milkShopCount} {farmCount > 0 && milkShopCount > 0 ? '(+Bonus Active!)' : ''}
              </span>
            </div>
            <div className="font-mono-num text-amber-300 font-semibold">
              Trades Completed: {tradesDone} · Treasury: {resources.credits.toLocaleString()} cr
            </div>
          </div>

          {farmCount === 0 && (
            <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-400/50 text-xs text-amber-200">
              Tip: Place a <strong>Farm</strong> from the bottom build bar to raise Cows & Goats and produce Fresh Milk & Crops every cycle!
            </div>
          )}

          {/* Direct Commodity Market */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Instant Market Exchange (Sell Stockpile Anytime)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Fresh Milk */}
              <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-300 font-semibold text-xs">
                    <Milk className="w-4 h-4" />
                    <span>Fresh Milk</span>
                  </div>
                  <span className="text-sm font-mono-num font-bold text-white">{milkStock}</span>
                </div>
                <div className="text-[11px] text-slate-400">Market price: 18 cr / unit</div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={milkStock < 5}
                    onClick={() => onSellResource('milk', 5)}
                    className="flex-1 py-1.5 rounded bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-semibold text-[11px] cursor-pointer disabled:cursor-not-allowed"
                  >
                    Sell 5 (+90 cr)
                  </button>
                  <button
                    type="button"
                    disabled={milkStock < 1}
                    onClick={() => onSellResource('milk', milkStock)}
                    className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-[11px] cursor-pointer disabled:cursor-not-allowed"
                  >
                    All
                  </button>
                </div>
              </div>

              {/* Golden Crops */}
              <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                    <Wheat className="w-4 h-4" />
                    <span>Golden Crops</span>
                  </div>
                  <span className="text-sm font-mono-num font-bold text-white">{cropsStock}</span>
                </div>
                <div className="text-[11px] text-slate-400">Market price: 12 cr / unit</div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={cropsStock < 5}
                    onClick={() => onSellResource('crops', 5)}
                    className="flex-1 py-1.5 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-[11px] cursor-pointer disabled:cursor-not-allowed"
                  >
                    Sell 5 (+60 cr)
                  </button>
                  <button
                    type="button"
                    disabled={cropsStock < 1}
                    onClick={() => onSellResource('crops', cropsStock)}
                    className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-[11px] cursor-pointer disabled:cursor-not-allowed"
                  >
                    All
                  </button>
                </div>
              </div>

              {/* Materials */}
              <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs">
                    <Package className="w-4 h-4" />
                    <span>Materials</span>
                  </div>
                  <span className="text-sm font-mono-num font-bold text-white">{materialsStock}</span>
                </div>
                <div className="text-[11px] text-slate-400">Market price: 10 cr / unit</div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={materialsStock < 5}
                    onClick={() => onSellResource('materials', 5)}
                    className="flex-1 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-semibold text-[11px] cursor-pointer disabled:cursor-not-allowed"
                  >
                    Sell 5 (+50 cr)
                  </button>
                  <button
                    type="button"
                    disabled={materialsStock < 1}
                    onClick={() => onSellResource('materials', materialsStock)}
                    className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-[11px] cursor-pointer disabled:cursor-not-allowed"
                  >
                    All
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* High-Value Trade Contracts */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              High-Reward Trade Contracts (Bonus Credits & XP)
            </div>
            <div className="space-y-2.5">
              {TRADE_CONTRACTS.map((c) => {
                const canFulfill =
                  milkStock >= c.milkNeeded &&
                  cropsStock >= c.cropsNeeded &&
                  materialsStock >= c.materialsNeeded;
                return (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-white">{c.title}</div>
                      <div className="text-[11px] text-slate-400">Buyer: {c.partner}</div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-num pt-0.5">
                        {c.milkNeeded > 0 && (
                          <span className={milkStock >= c.milkNeeded ? 'text-sky-300' : 'text-rose-400'}>
                            Milk {Math.min(milkStock, c.milkNeeded)}/{c.milkNeeded}
                          </span>
                        )}
                        {c.cropsNeeded > 0 && (
                          <span className={cropsStock >= c.cropsNeeded ? 'text-amber-300' : 'text-rose-400'}>
                            Crops {Math.min(cropsStock, c.cropsNeeded)}/{c.cropsNeeded}
                          </span>
                        )}
                        {c.materialsNeeded > 0 && (
                          <span className={materialsStock >= c.materialsNeeded ? 'text-emerald-300' : 'text-rose-400'}>
                            Materials {Math.min(materialsStock, c.materialsNeeded)}/{c.materialsNeeded}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono-num">
                        <div className="text-xs font-bold text-amber-300 flex items-center justify-end gap-1">
                          <Coins className="w-3.5 h-3.5" />
                          <span>+{c.creditsReward} cr</span>
                        </div>
                        <div className="text-[11px] text-emerald-300 flex items-center justify-end gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>+{c.xpReward} XP</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!canFulfill}
                        onClick={() => onFulfillContract(c)}
                        className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-xs cursor-pointer disabled:cursor-not-allowed transition-colors"
                      >
                        {canFulfill ? 'Ship Order' : 'Need Goods'}
                      </button>
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
