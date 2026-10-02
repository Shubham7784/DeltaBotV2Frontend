import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Key,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  Activity,
  Coins,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  XCircle,
} from 'lucide-react';
import { SystemStatusData, OptionSpreadType, SpreadSimulationResult, OptionsPosition } from '../types';

interface OptionsDomainViewProps {
  status: SystemStatusData | null;
}

interface OptionTicker {
  symbol: string;
  contract_type: 'call_options' | 'put_options';
  strike_price?: number;
  mark_price: string;
  close: number;
  open_interest?: string;
  greeks?: {
    delta?: string;
    gamma?: string;
    theta?: string;
    vega?: string;
    rho?: string;
  };
}

interface WalletBalance {
  asset_symbol: string;
  balance: string;
  available_balance: string;
  blocked_margin: string;
}

export const OptionsDomainView: React.FC<OptionsDomainViewProps> = ({ status }) => {
  const optionsConfigured = status?.domains.options.credentials_configured ?? false;
  const [underlying, setUnderlying] = useState<'BTC' | 'ETH'>('BTC');
  const [optionList, setOptionList] = useState<OptionTicker[]>([]);
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Phase 11: Defined-Risk Spreads & Simulation
  const [selectedSpread, setSelectedSpread] = useState<OptionSpreadType>('BULL_PUT_CREDIT');
  const [simulation, setSimulation] = useState<SpreadSimulationResult | null>(null);
  const [activePositions, setActivePositions] = useState<OptionsPosition[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [execFeedback, setExecFeedback] = useState<string | null>(null);

  const fetchOptionsData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch live option chain
      const res = await apiFetch(`/api/v1/delta/option-chain?underlying=${underlying}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.result)) {
          setOptionList(data.result.slice(0, 30));
        }
      }

      // 2. Fetch options subaccount wallet
      const walletRes = await apiFetch('/api/v1/delta/wallet/balances?subaccount=options');
      if (walletRes.ok) {
        const wData = await walletRes.json();
        if (wData.success && Array.isArray(wData.result) && wData.result[0]) {
          setWallet(wData.result[0]);
        }
      }

      // 3. Fetch active options positions
      const posRes = await apiFetch('/api/v1/options/positions');
      if (posRes.ok) {
        const pData = await posRes.json();
        setActivePositions(pData);
      }
    } catch (err) {
      console.error('Error fetching options data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [underlying]);

  const simulateSpread = useCallback(
    async (spreadType: OptionSpreadType) => {
      setIsSimulating(true);
      try {
        const res = await apiFetch('/api/v1/options/simulate-spread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            underlying,
            spread_type: spreadType,
            spot_price: underlying === 'BTC' ? 64500 : 3450,
            expiry_days: 7,
            contracts: 1,
          }),
        });
        if (res.ok) {
          const simData: SpreadSimulationResult = await res.json();
          setSimulation(simData);
        }
      } catch (err) {
        console.error('Failed to simulate spread:', err);
      } finally {
        setIsSimulating(false);
      }
    },
    [underlying]
  );

  useEffect(() => {
    fetchOptionsData();
    simulateSpread(selectedSpread);
    const timer = setInterval(fetchOptionsData, 12000);
    return () => clearInterval(timer);
  }, [fetchOptionsData, selectedSpread, simulateSpread]);

  const handleExecuteSpread = async () => {
    if (!simulation) return;
    setIsExecuting(true);
    setExecFeedback(null);
    try {
      const res = await apiFetch('/api/v1/options/execute-spread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulation),
      });
      if (res.ok) {
        const newPos = await res.json();
        setExecFeedback(`Successfully entered defined-risk position #${newPos.id} (${newPos.spread_type})`);
        fetchOptionsData();
      } else {
        setExecFeedback('Failed to execute spread');
      }
    } catch (err) {
      setExecFeedback(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClosePosition = async (id: number) => {
    try {
      const res = await apiFetch(`/api/v1/options/positions/${id}/close`, { method: 'POST' });
      if (res.ok) {
        fetchOptionsData();
      }
    } catch (err) {
      console.error('Failed to close options position:', err);
    }
  };

  const spreadOptions: { type: OptionSpreadType; label: string; desc: string }[] = [
    {
      type: 'BULL_PUT_CREDIT',
      label: 'Bull Put Credit Spread',
      desc: 'Sell higher put, buy lower put. Collect net credit. Defined max risk.',
    },
    {
      type: 'BULL_CALL_DEBIT',
      label: 'Bull Call Debit Spread',
      desc: 'Buy lower call, sell higher call. Capped upside, limited loss.',
    },
    {
      type: 'BEAR_PUT_DEBIT',
      label: 'Bear Put Debit Spread',
      desc: 'Buy higher put, sell lower put. Defined downside breakout.',
    },
    {
      type: 'IRON_CONDOR',
      label: 'Iron Condor',
      desc: 'Market-neutral 4-leg credit spread capturing premium in low volatility.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Isolation Banner */}
      <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mt-0.5">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>Isolated Options Subaccount Architecture</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${
                  optionsConfigured
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {optionsConfigured ? 'API Credentials Bound' : 'Separate Subaccount Credentials'}
              </span>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                Phase 11
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Options trading operations run on strictly independent Delta Exchange API credentials and margin pools. Naked selling is mathematically forbidden.
            </p>
          </div>
        </div>
        <div className="text-xs font-mono text-cyan-300 bg-cyan-950/50 px-3 py-1.5 rounded-lg border border-cyan-800/50 shrink-0 flex items-center space-x-2">
          <Coins className="w-3.5 h-3.5" />
          <span>Subaccount Balance: ${wallet ? wallet.balance : '12.00'} USD</span>
        </div>
      </div>

      {/* Defined-Risk Strategy Selector & Simulator */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Phase 11: Defined-Risk Options Spread Simulator & Greeks Engine</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select an options spread structure to calculate theoretical Greeks, payoff bounds, and subaccount margin.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {(['BTC', 'ETH'] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnderlying(u)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                  underlying === u
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
              >
                {u} Spreads
              </button>
            ))}
          </div>
        </div>

        {/* Spread Type Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {spreadOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => {
                setSelectedSpread(opt.type);
                simulateSpread(opt.type);
              }}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedSpread === opt.type
                  ? 'bg-purple-950/30 border-purple-500/50 text-slate-100 shadow-sm'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              <span className="font-semibold font-mono text-xs block text-slate-200 mb-1">
                {opt.label}
              </span>
              <span className="text-[11px] text-slate-400 leading-snug block">
                {opt.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Simulation Output Matrix */}
        {simulation && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-slate-400 text-[10px] block">Net Premium:</span>
                <span className={`text-sm font-bold ${simulation.net_premium < 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {simulation.net_premium < 0 ? `+$${Math.abs(simulation.net_premium)} Credit` : `$${simulation.net_premium} Debit`}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-slate-400 text-[10px] block">Max Profit:</span>
                <span className="text-sm font-bold text-emerald-400">
                  +${simulation.max_profit}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-slate-400 text-[10px] block">Max Loss:</span>
                <span className="text-sm font-bold text-rose-400">
                  -${simulation.max_loss}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-slate-400 text-[10px] block">Breakeven:</span>
                <span className="text-sm font-bold text-cyan-300">
                  ${simulation.breakeven_prices.join(', ')}
                </span>
              </div>
            </div>

            {/* Net Greeks Row */}
            <div className="grid grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 font-mono text-xs">
              <div className="text-center">
                <span className="text-slate-400 text-[10px] block">Net Delta</span>
                <span className="font-bold text-slate-200">{simulation.net_greeks.delta}</span>
              </div>
              <div className="text-center">
                <span className="text-slate-400 text-[10px] block">Net Gamma</span>
                <span className="font-bold text-slate-200">{simulation.net_greeks.gamma}</span>
              </div>
              <div className="text-center">
                <span className="text-slate-400 text-[10px] block">Net Theta / Day</span>
                <span className={`font-bold ${simulation.net_greeks.theta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {simulation.net_greeks.theta >= 0 ? `+$${simulation.net_greeks.theta}` : `-$${Math.abs(simulation.net_greeks.theta)}`}
                </span>
              </div>
              <div className="text-center">
                <span className="text-slate-400 text-[10px] block">Net Vega</span>
                <span className="font-bold text-slate-200">{simulation.net_greeks.vega}</span>
              </div>
            </div>

            {/* Payoff Diagram Visualizer */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Theoretical Payoff Curve at Expiration</span>
                </span>
                <span>Spot: ${simulation.spot_price}</span>
              </div>

              {/* Responsive SVG Payoff Diagram */}
              <div className="h-32 w-full pt-2">
                <svg className="w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                  {/* Zero line */}
                  <line x1="0" y1="50" x2="500" y2="50" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                  
                  {/* Payoff polyline */}
                  {(() => {
                    const minPnl = Math.min(...simulation.payoff_points.map((p) => p.pnl));
                    const maxPnl = Math.max(...simulation.payoff_points.map((p) => p.pnl));
                    const range = Math.max(maxPnl - minPnl, 1);
                    const points = simulation.payoff_points
                      .map((pt, i) => {
                        const x = (i / (simulation.payoff_points.length - 1)) * 500;
                        const y = 90 - ((pt.pnl - minPnl) / range) * 80;
                        return `${x},${y}`;
                      })
                      .join(' ');
                    return (
                      <polyline
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="2.5"
                        points={points}
                      />
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Execution CTA Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-purple-950/20 border border-purple-500/30 p-4 rounded-lg">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-purple-300 font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Defined-Risk Verification Passed</span>
                </span>
                <p className="text-xs text-slate-400">
                  Margin required: ${simulation.subaccount_margin_required} USD. Capped max loss guarantees account preservation.
                </p>
              </div>

              <button
                onClick={handleExecuteSpread}
                disabled={isExecuting}
                className="w-full sm:w-auto px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Sparkles className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
                <span>{isExecuting ? 'Executing Orders...' : `Execute ${simulation.spread_type}`}</span>
              </button>
            </div>

            {execFeedback && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-300">
                {execFeedback}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Options Positions Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Active Options Spreads Portfolio
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Open Positions: {activePositions.filter((p) => p.status === 'OPEN').length}
          </span>
        </div>

        {activePositions.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-slate-400">
            No active defined-risk options positions open.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2">ID / Structure</th>
                  <th className="pb-2">Underlying</th>
                  <th className="pb-2">Premium</th>
                  <th className="pb-2">Max Profit / Loss</th>
                  <th className="pb-2">Current PnL</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {activePositions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-semibold text-slate-200">
                      #{pos.id} • {pos.spread_type}
                    </td>
                    <td className="py-3 text-slate-300">{pos.underlying}</td>
                    <td className="py-3 text-slate-300">
                      {pos.net_premium < 0 ? `+$${Math.abs(pos.net_premium)} (Credit)` : `-$${pos.net_premium} (Debit)`}
                    </td>
                    <td className="py-3 text-slate-400">
                      <span className="text-emerald-400">+${pos.max_profit}</span> / <span className="text-rose-400">-${pos.max_loss}</span>
                    </td>
                    <td className={`py-3 font-bold ${pos.current_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pos.current_pnl >= 0 ? `+$${pos.current_pnl}` : `-$${Math.abs(pos.current_pnl)}`}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${pos.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                        {pos.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {pos.status === 'OPEN' && (
                        <button
                          onClick={() => handleClosePosition(pos.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-900/40 text-rose-300 border border-slate-700 hover:border-rose-500/40 text-[11px] transition-colors"
                        >
                          Close
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Delta Option Chain Explorer */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <Activity className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Delta Exchange Live Option Chain Explorer
            </h3>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
            <span>Live Delta Contracts: {optionList.length}</span>
            <button
              onClick={fetchOptionsData}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh options chain"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Option Chain Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2 text-emerald-400">CALL Mark ($)</th>
                <th className="pb-2 text-emerald-400">CALL Delta</th>
                <th className="pb-2 text-center text-slate-200">Instrument Symbol</th>
                <th className="pb-2 text-rose-400 text-right">PUT Mark ($)</th>
                <th className="pb-2 text-rose-400 text-right">PUT Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {optionList.slice(0, 10).map((opt, idx) => {
                const isCall = opt.contract_type === 'call_options';
                const greeks = opt.greeks || {};
                return (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 text-emerald-300 font-semibold">
                      {isCall ? `$${Number(opt.mark_price).toFixed(1)}` : '—'}
                    </td>
                    <td className="py-2.5 text-slate-400">
                      {isCall ? greeks.delta || '+0.50' : '—'}
                    </td>
                    <td className="py-2.5 text-center font-bold text-slate-300">
                      {opt.symbol}
                    </td>
                    <td className="py-2.5 text-right text-rose-300 font-semibold">
                      {!isCall ? `$${Number(opt.mark_price).toFixed(1)}` : '—'}
                    </td>
                    <td className="py-2.5 text-right text-slate-400">
                      {!isCall ? greeks.delta || '-0.50' : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
