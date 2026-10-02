import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  AlertTriangle,
  Zap,
  Play,
  ArrowRight,
  RefreshCw,
  XCircle,
  TrendingUp,
  TrendingDown,
  Lock,
  Flame,
  CheckCircle2,
  Crosshair,
  Percent,
  Sliders,
} from 'lucide-react';
import {
  AccountCapitalStatus,
  RiskValidationResult,
  TradeLifecycleItem,
  KillSwitchResult,
} from '../types';

export const ExecutionLifecycleView: React.FC = () => {
  // State: Risk & Capital status
  const [riskStatus, setRiskStatus] = useState<AccountCapitalStatus | null>(null);
  const [trades, setTrades] = useState<TradeLifecycleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Kill Switch
  const [isConfirmingKill, setIsConfirmingKill] = useState<boolean>(false);
  const [isKilling, setIsKilling] = useState<boolean>(false);

  // Trigger Scanner
  const [isScanningTriggers, setIsScanningTriggers] = useState<boolean>(false);

  // Stepping & Executing
  const [activeActionTradeId, setActiveActionTradeId] = useState<number | null>(null);

  // Pre-flight Risk Validation Form
  const [valSymbol, setValSymbol] = useState<string>('BTCUSD');
  const [valDirection, setValDirection] = useState<'long' | 'short'>('long');
  const [valEntryPrice, setValEntryPrice] = useState<number>(65000);
  const [valStopLoss, setValStopLoss] = useState<number>(64675);
  const [valTakeProfit, setValTakeProfit] = useState<number>(66300);
  const [valLeverage, setValLeverage] = useState<number>(50);
  const [valCapital, setValCapital] = useState<number>(12);
  const [validationResult, setValidationResult] = useState<RiskValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Fetch live risk status and active trades
  const fetchData = useCallback(async () => {
    try {
      const [statusRes, tradesRes] = await Promise.all([
        apiFetch('/api/v1/risk/status?subaccount=futures'),
        apiFetch('/api/v1/execution/trades?limit=15'),
      ]);

      if (statusRes.ok) {
        const data = await statusRes.json();
        setRiskStatus(data);
      }
      if (tradesRes.ok) {
        const data = await tradesRes.json();
        setTrades(data);
      }
    } catch (err) {
      console.error('Failed to load risk and execution data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Advance single lifecycle step
  const handleStepTrade = async (tradeId: number) => {
    setActiveActionTradeId(tradeId);
    setActionFeedback(null);
    try {
      const res = await apiFetch(`/api/v1/execution/trades/${tradeId}/step`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback(`Trade #${tradeId}: ${data.message}`);
        await fetchData();
      } else {
        setActionFeedback(`Error: ${data.detail || 'Step advance failed'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Step advance failed';
      setActionFeedback(`Error: ${msg}`);
    } finally {
      setActiveActionTradeId(null);
    }
  };

  // Auto-execute through all states to POSITION_OPEN
  const handleAutoExecuteTrade = async (tradeId: number) => {
    setActiveActionTradeId(tradeId);
    setActionFeedback(null);
    try {
      const res = await apiFetch(`/api/v1/execution/trades/${tradeId}/auto-execute`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback(`Trade #${tradeId} Auto-Execution: ${data.message}`);
        await fetchData();
      } else {
        setActionFeedback(`Error: ${data.detail || 'Auto-execute failed'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Auto-execute failed';
      setActionFeedback(`Error: ${msg}`);
    } finally {
      setActiveActionTradeId(null);
    }
  };

  // Close / Exit trade
  const handleCloseTrade = async (tradeId: number) => {
    setActiveActionTradeId(tradeId);
    setActionFeedback(null);
    try {
      const res = await apiFetch(`/api/v1/execution/trades/${tradeId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exit_reason: 'MANUAL_DASHBOARD_CLOSE' }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback(`Trade #${tradeId} Exited: ${data.message}`);
        await fetchData();
      } else {
        setActionFeedback(`Error: ${data.detail || 'Close failed'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Close failed';
      setActionFeedback(`Error: ${msg}`);
    } finally {
      setActiveActionTradeId(null);
    }
  };

  // Scan open positions triggers
  const handleScanTriggers = async () => {
    setIsScanningTriggers(true);
    setActionFeedback(null);
    try {
      const res = await apiFetch('/api/v1/execution/scan-triggers', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback(
          `Trigger scan complete: Evaluated ${data.open_positions_evaluated} positions. ${data.triggered_exits.length} exits triggered.`
        );
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanningTriggers(false);
    }
  };

  // Execute Emergency Kill Switch
  const handleExecuteKillSwitch = async () => {
    setIsKilling(true);
    setActionFeedback(null);
    try {
      const res = await apiFetch('/api/v1/execution/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'DASHBOARD_CIRCUIT_BREAKER_KILL' }),
      });
      const data: KillSwitchResult = await res.json();
      if (res.ok) {
        setActionFeedback(`KILL SWITCH ACTIVATED: ${data.message}`);
        setIsConfirmingKill(false);
        await fetchData();
      } else {
        setActionFeedback('Kill switch request failed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kill switch failed';
      setActionFeedback(`Error: ${msg}`);
    } finally {
      setIsKilling(false);
    }
  };

  // Validate candidate trade in pre-flight
  const handleValidatePreflight = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await apiFetch('/api/v1/risk/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: valSymbol,
          direction: valDirection,
          entry_price: Number(valEntryPrice),
          stop_loss_price: Number(valStopLoss),
          take_profit_price: Number(valTakeProfit),
          leverage: Number(valLeverage),
          subaccount: 'futures',
          override_capital: Number(valCapital) || 12.0,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setValidationResult(data);
      }
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const getLifecycleBadgeClass = (state: string) => {
    switch (state) {
      case 'SIGNAL_GENERATED':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'VALIDATING':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      case 'LLM_CONFIRMED':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'RISK_VALIDATED':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      case 'ORDER_SUBMITTED':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case 'POSITION_OPEN':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20';
      case 'EXITED':
        return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
      case 'REJECTED_RISK':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/40';
      case 'REJECTED_LLM':
        return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'CANCELLED':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between transition-all ${
            actionFeedback.includes('Error') || actionFeedback.includes('REJECTED')
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
          }`}
        >
          <span>{actionFeedback}</span>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-200"
          >
            ×
          </button>
        </div>
      )}

      {/* Top Header & Emergency Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Phase 7: Execution & Deterministic Risk Engine
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-medium">
                  Active
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Guaranteed 7-state trade progression, 30% reserve buffer, 1% risk limit & HMAC signed execution.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-200 flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={handleScanTriggers}
            disabled={isScanningTriggers}
            className="px-3 py-1.5 rounded-lg bg-indigo-900/40 hover:bg-indigo-800/50 border border-indigo-700/50 text-xs font-mono text-indigo-200 flex items-center space-x-1.5 transition-colors"
          >
            <Crosshair className={`w-3.5 h-3.5 ${isScanningTriggers ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Scan Triggers</span>
          </button>

          {/* Emergency Kill Switch */}
          {!isConfirmingKill ? (
            <button
              onClick={() => setIsConfirmingKill(true)}
              className="px-3.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-600/50 text-xs font-mono text-rose-300 flex items-center space-x-1.5 transition-all shadow-sm shadow-rose-950/50"
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>KILL SWITCH</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2 bg-rose-950 border border-rose-500 rounded-lg p-1">
              <span className="text-[11px] font-mono text-rose-200 px-2">Liquidate all?</span>
              <button
                onClick={handleExecuteKillSwitch}
                disabled={isKilling}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition-all"
              >
                {isKilling ? 'Liquidating...' : 'CONFIRM'}
              </button>
              <button
                onClick={() => setIsConfirmingKill(false)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account Capital & Safety Invariants Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Equity */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
            <span>Total Equity</span>
            <span className="text-[10px] text-slate-500 font-mono">USD</span>
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-white">
            ${riskStatus ? riskStatus.total_equity.toFixed(2) : '12.00'}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500 font-mono">Micro Baseline (~₹1,000)</div>
        </div>

        {/* 30% Safety Reserve */}
        <div className="bg-slate-900/60 border border-amber-900/30 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-amber-400/90 flex items-center justify-between">
            <span>30% Reserve Buffer</span>
            <Lock className="w-3 h-3 text-amber-400" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-amber-300">
            ${riskStatus ? riskStatus.reserve_buffer_amount.toFixed(2) : '3.60'}
          </div>
          <div className="mt-0.5 text-[10px] text-amber-400/70 font-mono">Untouchable Safety Fund</div>
        </div>

        {/* Usable Trading Capital */}
        <div className="bg-slate-900/60 border border-emerald-900/30 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-emerald-400/90 flex items-center justify-between">
            <span>Usable Capital</span>
            <Percent className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-emerald-300">
            ${riskStatus ? riskStatus.usable_trading_capital.toFixed(2) : '8.40'}
          </div>
          <div className="mt-0.5 text-[10px] text-emerald-400/70 font-mono">Max 70% Deployable</div>
        </div>

        {/* 1% Max Risk Rule */}
        <div className="bg-slate-900/60 border border-blue-900/30 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-blue-400/90 flex items-center justify-between">
            <span>1% Risk Limit</span>
            <Shield className="w-3 h-3 text-blue-400" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-blue-300">
            ${riskStatus ? riskStatus.max_risk_per_trade_amount.toFixed(2) : '0.12'}
          </div>
          <div className="mt-0.5 text-[10px] text-blue-400/70 font-mono">Per-Trade Cap</div>
        </div>

        {/* Portfolio Exposure */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
            <span>Active Exposure</span>
            <span className="text-[10px] text-slate-500 font-mono">Max 50%</span>
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-white">
            {riskStatus ? riskStatus.current_exposure_pct.toFixed(1) : '0.0'}%
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500 font-mono">
            Margin: ${riskStatus ? riskStatus.blocked_margin.toFixed(2) : '0.00'}
          </div>
        </div>

        {/* Circuit Breaker Status */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
            <span>Daily Drawdown</span>
            <AlertTriangle className="w-3 h-3 text-slate-400" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-white flex items-center gap-1.5">
            <span>{riskStatus ? riskStatus.daily_drawdown_pct.toFixed(1) : '0.0'}%</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">
              {riskStatus?.circuit_breaker_active ? 'HALTED' : 'OK'}
            </span>
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500 font-mono">Circuit limit: 5.0%</div>
        </div>
      </div>

      {/* 7-State Lifecycle Flow Diagram */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>7-State Trade Lifecycle Flow</span>
          <span className="text-[11px] text-slate-500 font-mono font-normal">Deterministic State Machine</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { num: 1, label: 'SIGNAL_GENERATED', sub: 'Technical Strategy Trigger', col: 'text-amber-300 border-amber-500/30 bg-amber-500/5' },
            { num: 2, label: 'VALIDATING', sub: 'TF Alignment & Filters', col: 'text-blue-300 border-blue-500/30 bg-blue-500/5' },
            { num: 3, label: 'LLM_CONFIRMED', sub: 'Advisory Regime Check', col: 'text-purple-300 border-purple-500/30 bg-purple-500/5' },
            { num: 4, label: 'RISK_VALIDATED', sub: '1% Risk & Invariant Gate', col: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/5' },
            { num: 5, label: 'ORDER_SUBMITTED', sub: 'HMAC Order + Brackets', col: 'text-indigo-300 border-indigo-500/30 bg-indigo-500/5' },
            { num: 6, label: 'POSITION_OPEN', sub: 'Exchange Fill & Trailing', col: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' },
            { num: 7, label: 'EXITED', sub: 'Bracket / Manual Close', col: 'text-slate-300 border-slate-600/40 bg-slate-800/40' },
          ].map((s) => (
            <div
              key={s.num}
              className={`p-2.5 rounded-xl border flex flex-col justify-between ${s.col}`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>Step {s.num}</span>
              </div>
              <div className="text-[11px] font-mono font-bold leading-tight">{s.label}</div>
              <div className="text-[10px] text-slate-400 mt-1">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Split: Active Lifecycle Decisions & Pre-Flight Risk Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active & Historic Lifecycle Trades */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Active Trade Decisions & Lifecycle Tracking
                <span className="text-xs text-slate-500 font-mono font-normal">({trades.length})</span>
              </h3>
              <p className="text-xs text-slate-400">
                Step-by-step sequential advancing or complete pipeline auto-execution.
              </p>
            </div>
          </div>

          {trades.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-500 font-mono text-xs">
              <Zap className="w-8 h-8 text-slate-700 mb-2" />
              <span>No trade decisions recorded yet.</span>
              <span className="text-[11px] text-slate-600 mt-1">
                Strategy signals or test executions will appear here.
              </span>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1">
              {trades.map((t) => (
                <div
                  key={t.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-white">#{t.id}</span>
                      <span className="text-xs font-mono font-semibold text-slate-200">{t.symbol}</span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          t.direction.toLowerCase() === 'long'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {t.direction.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{t.leverage}x Lev</span>
                      {t.is_paper && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          PAPER
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${getLifecycleBadgeClass(
                          t.state
                        )}`}
                      >
                        {t.state}
                      </span>
                    </div>
                  </div>

                  {/* Pricing & Levels Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-slate-300 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80 mb-2.5">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Entry Price:</span>
                      <span>${t.entry_price ? t.entry_price.toLocaleString() : 'Pending'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Stop Loss:</span>
                      <span className="text-rose-400">${t.stop_loss_price?.toLocaleString() ?? 'Pending'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Take Profit:</span>
                      <span className="text-emerald-400">${t.take_profit_price?.toLocaleString() ?? 'Pending'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Size & PnL:</span>
                      <span>
                        {t.suggested_size} contracts
                        {t.realized_pnl !== null && (
                          <span
                            className={`ml-1 font-bold ${
                              t.realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            (${t.realized_pnl >= 0 ? '+' : ''}
                            {t.realized_pnl.toFixed(2)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Risk Notes / Rejection Reason if any */}
                  {t.risk_notes && (
                    <div className="text-[11px] font-mono text-slate-400 mb-2.5 bg-slate-800/40 px-2.5 py-1 rounded">
                      <span className="text-slate-500">Audit: </span>
                      {t.risk_notes}
                    </div>
                  )}

                  {/* Actions Bar if trade is active */}
                  {!['EXITED', 'REJECTED_RISK', 'REJECTED_LLM', 'CANCELLED'].includes(t.state) && (
                    <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-800/60">
                      <button
                        onClick={() => handleStepTrade(t.id)}
                        disabled={activeActionTradeId === t.id}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-200 border border-slate-700 flex items-center space-x-1 transition-colors"
                      >
                        {activeActionTradeId === t.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <ArrowRight className="w-3 h-3 text-cyan-400" />
                        )}
                        <span>Advance Step</span>
                      </button>

                      {t.state !== 'POSITION_OPEN' && (
                        <button
                          onClick={() => handleAutoExecuteTrade(t.id)}
                          disabled={activeActionTradeId === t.id}
                          className="px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-[11px] font-mono text-emerald-300 border border-emerald-600/40 flex items-center space-x-1 transition-colors"
                        >
                          <Play className="w-3 h-3 text-emerald-400" />
                          <span>Auto-Execute Pipeline</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleCloseTrade(t.id)}
                        disabled={activeActionTradeId === t.id}
                        className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/80 text-[11px] font-mono text-rose-300 border border-rose-600/40 flex items-center space-x-1 transition-colors"
                      >
                        <XCircle className="w-3 h-3 text-rose-400" />
                        <span>Close / Exit</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Interactive Pre-Flight Risk Validator */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Pre-Flight Risk Gate</span>
              </h3>
              <p className="text-xs text-slate-400">
                Test sizing & mathematical limits against all 6 safety invariants.
              </p>
            </div>
          </div>

          <form onSubmit={handleValidatePreflight} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-slate-400">Symbol</label>
                <input
                  type="text"
                  value={valSymbol}
                  onChange={(e) => setValSymbol(e.target.value.toUpperCase())}
                  className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400">Direction</label>
                <select
                  value={valDirection}
                  onChange={(e) => setValDirection(e.target.value as 'long' | 'short')}
                  className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="long">LONG</option>
                  <option value="short">SHORT</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-mono text-slate-400">Entry Price</label>
                <input
                  type="number"
                  step="any"
                  value={valEntryPrice}
                  onChange={(e) => setValEntryPrice(parseFloat(e.target.value) || 0)}
                  className="w-full mt-0.5 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400">Stop Loss</label>
                <input
                  type="number"
                  step="any"
                  value={valStopLoss}
                  onChange={(e) => setValStopLoss(parseFloat(e.target.value) || 0)}
                  className="w-full mt-0.5 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-rose-300 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400">Take Profit</label>
                <input
                  type="number"
                  step="any"
                  value={valTakeProfit}
                  onChange={(e) => setValTakeProfit(parseFloat(e.target.value) || 0)}
                  className="w-full mt-0.5 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-slate-400">Leverage (x)</label>
                <input
                  type="number"
                  value={valLeverage}
                  onChange={(e) => setValLeverage(parseInt(e.target.value, 10) || 50)}
                  className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400">Capital ($ USD)</label>
                <input
                  type="number"
                  step="any"
                  value={valCapital}
                  onChange={(e) => setValCapital(parseFloat(e.target.value) || 12)}
                  className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isValidating}
              className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating Invariants...</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Validate Candidate Trade</span>
                </>
              )}
            </button>
          </form>

          {/* Validation Output */}
          {validationResult && (
            <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Gate Status:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    validationResult.is_approved
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {validationResult.is_approved ? 'APPROVED' : 'REJECTED'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Sizing (1% rule):</span>
                  <span className="text-white font-bold">{validationResult.calculated_size} contracts</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Margin Required:</span>
                  <span className="text-white">${validationResult.required_margin.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Dollar Risk:</span>
                  <span className="text-amber-400">
                    ${validationResult.dollar_risk.toFixed(2)} ({validationResult.dollar_risk_pct.toFixed(1)}%)
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Risk:Reward:</span>
                  <span className="text-emerald-400">{validationResult.risk_reward_ratio}:1</span>
                </div>
              </div>

              {validationResult.estimated_liquidation_price && (
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-900 flex justify-between">
                  <span>Est. Liquidation Price:</span>
                  <span className="text-rose-400">${validationResult.estimated_liquidation_price.toFixed(2)}</span>
                </div>
              )}

              {/* Invariants Checklist */}
              <div className="pt-2 border-t border-slate-900 space-y-1 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Single-Position Invariant:</span>
                  <span className={validationResult.single_position_passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {validationResult.single_position_passed ? '✓ PASSED' : '✗ FAILED'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">30% Reserve Buffer:</span>
                  <span className={validationResult.reserve_buffer_passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {validationResult.reserve_buffer_passed ? '✓ PASSED' : '✗ FAILED'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">50% Max Exposure:</span>
                  <span className={validationResult.max_exposure_passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {validationResult.max_exposure_passed ? '✓ PASSED' : '✗ FAILED'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Liquidation Safety:</span>
                  <span className={validationResult.liquidation_buffer_passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {validationResult.liquidation_buffer_passed ? '✓ PASSED' : '✗ FAILED'}
                  </span>
                </div>
              </div>

              {validationResult.rejection_reasons.length > 0 && (
                <div className="p-2 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[10px] space-y-1">
                  {validationResult.rejection_reasons.map((r, i) => (
                    <div key={i}>• {r}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
