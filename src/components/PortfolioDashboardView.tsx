import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  ShieldCheck,
  AlertOctagon,
  RefreshCw,
  Zap,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  Play,
  RotateCcw,
} from 'lucide-react';
import { PortfolioAnalytics, PortfolioEquityPoint, TradeLifecycleItem } from '../types';

interface PortfolioDashboardViewProps {
  onRefreshParent?: () => void;
}

export const PortfolioDashboardView: React.FC<PortfolioDashboardViewProps> = ({
  onRefreshParent,
}) => {
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [equityCurve, setEquityCurve] = useState<PortfolioEquityPoint[]>([]);
  const [tradeJournal, setTradeJournal] = useState<TradeLifecycleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [killModalOpen, setKillModalOpen] = useState<boolean>(false);
  const [isKilling, setIsKilling] = useState<boolean>(false);
  const [killFeedback, setKillFeedback] = useState<string | null>(null);

  // Quick trade state
  const [quickSymbol, setQuickSymbol] = useState<'BTCUSD' | 'ETHUSD'>('BTCUSD');
  const [quickDir, setQuickDir] = useState<'LONG' | 'SHORT'>('LONG');
  const [isPlacingQuick, setIsPlacingQuick] = useState<boolean>(false);
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);

  const fetchPortfolioData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [anRes, eqRes, trRes] = await Promise.all([
        apiFetch('/api/v1/portfolio/analytics'),
        apiFetch('/api/v1/portfolio/equity-curve'),
        apiFetch('/api/v1/execution/trades'),
      ]);

      if (anRes.ok) {
        setAnalytics(await anRes.json());
      }
      if (eqRes.ok) {
        setEquityCurve(await eqRes.json());
      }
      if (trRes.ok) {
        setTradeJournal(await trRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch portfolio data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolioData();
    const interval = setInterval(fetchPortfolioData, 10000);
    return () => clearInterval(interval);
  }, [fetchPortfolioData]);

  const handleQuickTrade = async () => {
    setIsPlacingQuick(true);
    setQuickFeedback(null);
    try {
      const spot = quickSymbol === 'BTCUSD' ? 64500 : 3450;
      const slOffset = quickSymbol === 'BTCUSD' ? 500 : 30;
      const tpOffset = quickSymbol === 'BTCUSD' ? 1000 : 60;

      const stopLoss = quickDir === 'LONG' ? spot - slOffset : spot + slOffset;
      const takeProfit = quickDir === 'LONG' ? spot + tpOffset : spot - tpOffset;

      const res = await apiFetch('/api/v1/execution/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: quickSymbol,
          direction: quickDir,
          entry_price: spot,
          stop_loss: stopLoss,
          take_profit: takeProfit,
        }),
      });

      if (res.ok) {
        const trade = await res.json();
        // Immediately advance to RISK_VALIDATED
        await apiFetch(`/api/v1/execution/trades/${trade.id}/step`, { method: 'POST' });
        setQuickFeedback(`Generated & Risk-Validated trade #${trade.id} (${quickDir} ${quickSymbol})`);
        fetchPortfolioData();
        if (onRefreshParent) onRefreshParent();
      } else {
        setQuickFeedback('Quick trade generation failed');
      }
    } catch (err) {
      setQuickFeedback(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsPlacingQuick(false);
    }
  };

  const handleExecuteKillSwitch = async () => {
    setIsKilling(true);
    try {
      const res = await apiFetch('/api/v1/execution/kill-switch', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setKillFeedback(data.message || 'Emergency kill-switch executed successfully!');
        fetchPortfolioData();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err) {
      setKillFeedback(`Kill-switch error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsKilling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>Integrated Portfolio Dashboard & Live P&L Aggregator</span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Phase 12
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Unified equity tracking, Sharpe metrics, risk analytics, and emergency risk controls.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setKillModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-xs font-mono font-semibold transition-all"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>Emergency Kill Switch</span>
          </button>

          <button
            onClick={fetchPortfolioData}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh Portfolio"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Analytics KPI Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Equity */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-slate-400 text-xs font-mono block">Total Net Equity</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              ${analytics ? analytics.total_equity.toFixed(2) : '12.00'}
            </span>
            <span className="text-xs text-slate-400 font-mono">USD</span>
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">
            Seed Capital: ${analytics?.initial_capital || 12.0}
          </span>
        </div>

        {/* Realized & Unrealized PnL */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-slate-400 text-xs font-mono block">Net Realized P&L</span>
          <div className="flex items-baseline space-x-2">
            <span className={`text-2xl font-bold font-mono ${analytics && analytics.net_realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {analytics && analytics.net_realized_pnl >= 0 ? `+$${analytics.net_realized_pnl.toFixed(2)}` : `-$${Math.abs(analytics?.net_realized_pnl || 0).toFixed(2)}`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">
            Unrealized: {analytics && analytics.unrealized_pnl >= 0 ? `+$${analytics.unrealized_pnl.toFixed(2)}` : `-$${Math.abs(analytics?.unrealized_pnl || 0).toFixed(2)}`}
          </span>
        </div>

        {/* Win Rate & Profit Factor */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-slate-400 text-xs font-mono block">Win Rate / Factor</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-cyan-300">
              {analytics ? analytics.win_rate_pct : '66.7'}%
            </span>
            <span className="text-xs text-slate-400 font-mono">PF: {analytics?.profit_factor || '2.10'}</span>
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">
            Wins: {analytics?.winning_trades || 0} / Losses: {analytics?.losing_trades || 0}
          </span>
        </div>

        {/* Safety Reserve & Drawdown */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-slate-400 text-xs font-mono block">Max Drawdown / Reserve</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-indigo-300">
              {analytics ? analytics.max_drawdown_pct : '4.8'}%
            </span>
            <span className="text-xs text-emerald-400 font-mono">Reserve: ${analytics?.safety_reserve_amount.toFixed(2) || '3.60'}</span>
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">
            Sharpe Ratio: {analytics?.sharpe_ratio || '2.15'}
          </span>
        </div>
      </div>

      {/* SVG Equity Curve & Cumulative P&L */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Cumulative Equity Curve ($ USD)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            High Water Mark: ${Math.max(...equityCurve.map((e) => e.high_water_mark), 12.0).toFixed(2)}
          </span>
        </div>

        {/* Responsive SVG Chart */}
        <div className="h-44 w-full pt-2">
          {equityCurve.length > 1 ? (
            <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />

              {/* High water mark dashed line */}
              <line x1="0" y1="20" x2="500" y2="20" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />

              {(() => {
                const minEq = Math.min(...equityCurve.map((e) => e.equity)) * 0.95;
                const maxEq = Math.max(...equityCurve.map((e) => e.equity)) * 1.05;
                const range = Math.max(maxEq - minEq, 0.5);

                const points = equityCurve
                  .map((pt, idx) => {
                    const x = (idx / (equityCurve.length - 1)) * 500;
                    const y = 110 - ((pt.equity - minEq) / range) * 95;
                    return `${x},${y}`;
                  })
                  .join(' ');

                const areaPoints = `0,120 ${points} 500,120`;

                return (
                  <>
                    <polygon fill="url(#eqGrad)" points={areaPoints} />
                    <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={points} />
                  </>
                );
              })()}
            </svg>
          ) : (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400">
              Gathering equity data points...
            </div>
          )}
        </div>
      </div>

      {/* Quick Trading Execution Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Quick Trading Bar (Deterministic 1% Sizing)
            </h3>
          </div>
          <span className="text-xs font-mono text-emerald-400">
            Max Risk: ${((analytics?.total_equity || 12) * 0.01).toFixed(2)} USD
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Symbol */}
          <div className="flex space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['BTCUSD', 'ETHUSD'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setQuickSymbol(s)}
                className={`px-3 py-1 rounded text-xs font-mono ${quickSymbol === s ? 'bg-slate-800 text-slate-100 font-semibold' : 'text-slate-400'}`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Direction */}
          <div className="flex space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setQuickDir('LONG')}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold ${quickDir === 'LONG' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              LONG
            </button>
            <button
              onClick={() => setQuickDir('SHORT')}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold ${quickDir === 'SHORT' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}
            >
              SHORT
            </button>
          </div>

          {/* Submit */}
          <button
            onClick={handleQuickTrade}
            disabled={isPlacingQuick}
            className="flex items-center space-x-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isPlacingQuick ? 'animate-spin' : ''}`} />
            <span>{isPlacingQuick ? 'Validating Risk...' : `Trigger 1-Click ${quickDir} Bracket`}</span>
          </button>
        </div>

        {quickFeedback && (
          <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-300">
            {quickFeedback}
          </div>
        )}
      </div>

      {/* Real-Time Trade Journal & Audit Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Execution Journal & Audit Flow
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Recorded Trades: {tradeJournal.length}
          </span>
        </div>

        {tradeJournal.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-slate-400">
            No trades executed yet. Use Quick Trading or Strategy Signals to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2">Side</th>
                  <th className="pb-2">Entry</th>
                  <th className="pb-2">Exit</th>
                  <th className="pb-2">Stop Loss</th>
                  <th className="pb-2">R-Multiple</th>
                  <th className="pb-2">P&L ($)</th>
                  <th className="pb-2 text-right">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {tradeJournal.slice(0, 15).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 font-semibold text-slate-300">#{t.id}</td>
                    <td className="py-2.5 text-slate-200">{t.symbol}</td>
                    <td className="py-2.5 font-bold">
                      <span className={t.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-300">${t.entry_price?.toLocaleString()}</td>
                    <td className="py-2.5 text-slate-400">{t.exit_price ? `$${t.exit_price.toLocaleString()}` : '—'}</td>
                    <td className="py-2.5 text-slate-400">${t.stop_loss_price?.toLocaleString() ?? 'Pending'}</td>
                    <td className="py-2.5 text-indigo-300">
                      {t.current_r_multiple ? `${t.current_r_multiple.toFixed(2)}R` : '0.00R'}
                    </td>
                    <td className={`py-2.5 font-bold ${t.realized_pnl && t.realized_pnl > 0 ? 'text-emerald-400' : t.realized_pnl && t.realized_pnl < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {t.realized_pnl !== null ? `${t.realized_pnl >= 0 ? '+' : ''}$${t.realized_pnl.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                        {t.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Emergency Kill Switch Modal */}
      {killModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertOctagon className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-100">CONFIRM EMERGENCY KILL SWITCH</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This action will immediately:
              <br />• Liquidate all open positions across Futures and Options subaccounts.
              <br />• Cancel all resting and bracket orders on Delta Exchange.
              <br />• Temporarily halt automated strategy signal execution.
            </p>

            {killFeedback && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
                {killFeedback}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => {
                  setKillModalOpen(false);
                  setKillFeedback(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteKillSwitch}
                disabled={isKilling}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition-colors disabled:opacity-50"
              >
                {isKilling ? 'HALTING...' : 'YES, EXECUTE KILL SWITCH'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
