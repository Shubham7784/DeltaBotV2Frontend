import React from 'react';
import { TrendingUp, Layers, Compass, DollarSign, Key } from 'lucide-react';
import { TradingDomain, SystemStatusData } from '../types';

interface DomainSwitcherProps {
  currentDomain: TradingDomain;
  onChangeDomain: (domain: TradingDomain) => void;
  status: SystemStatusData | null;
}

export const DomainSwitcher: React.FC<DomainSwitcherProps> = ({
  currentDomain,
  onChangeDomain,
  status,
}) => {
  const futuresConfigured = status?.domains.futures.credentials_configured ?? false;
  const optionsConfigured = status?.domains.options.credentials_configured ?? false;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 flex flex-col md:flex-row items-center justify-between gap-2 shadow-sm">
      <div className="grid grid-cols-2 md:flex md:flex-wrap items-stretch gap-1.5 w-full md:w-auto">
        {/* Futures Tab */}
        <button
          id="domain-futures-tab-btn"
          onClick={() => onChangeDomain('futures')}
          className={`min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-2.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
            currentDomain === 'futures'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
            <span className="truncate sm:hidden">Futures</span>
            <span className="hidden sm:inline">Futures Trading</span>
          <span
            className={`hidden sm:inline-flex text-[10px] px-1.5 py-0.2 rounded-full border ${
              futuresConfigured
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {futuresConfigured ? 'Subaccount OK' : 'Subaccount Pending'}
          </span>
        </button>

        {/* Multi-Timeframe & AI Advisor Tab */}
        <button
          id="domain-trend-tab-btn"
          onClick={() => onChangeDomain('trend_ai')}
          className={`min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-2.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
            currentDomain === 'trend_ai'
              ? 'bg-slate-800 text-indigo-400 border border-indigo-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="truncate sm:hidden">Multi-TF & AI</span>
          <span className="hidden sm:inline">Multi-TF & AI Advisor</span>
          <span className="hidden sm:inline-flex text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            Phase 8
          </span>
        </button>

        {/* Options Tab */}
        <button
          id="domain-options-tab-btn"
          onClick={() => onChangeDomain('options')}
          className={`min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-2.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
            currentDomain === 'options'
              ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="truncate sm:hidden">Options</span>
          <span className="hidden sm:inline">Options Spreads</span>
          <span
            className={`hidden sm:inline-flex text-[10px] px-1.5 py-0.2 rounded-full border ${
              optionsConfigured
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            Phase 11
          </span>
        </button>

        {/* Portfolio & PnL Tab */}
        <button
          id="domain-portfolio-tab-btn"
          onClick={() => onChangeDomain('portfolio')}
          className={`min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-2.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
            currentDomain === 'portfolio'
              ? 'bg-slate-800 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span className="truncate sm:hidden">Portfolio</span>
          <span className="hidden sm:inline">Portfolio & P&amp;L</span>
          <span className="hidden sm:inline-flex text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
            Phase 12
          </span>
        </button>
      </div>

      <div className="flex min-w-0 items-center text-[10px] sm:text-xs text-slate-400 px-2 sm:px-3 py-1 font-mono md:shrink-0">
        <Key className="w-3 h-3 mr-1.5 text-slate-400" />
        <span className="hidden md:inline text-slate-400 mr-1">Isolation:</span>
        <span className="truncate">Dual Delta Subaccounts Enabled</span>
      </div>
    </div>
  );
};
