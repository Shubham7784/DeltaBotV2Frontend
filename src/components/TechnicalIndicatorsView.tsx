import { apiFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Compass,
  Layers,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sliders,
  BarChart2,
} from 'lucide-react';
import { IndicatorSnapshot } from '../types';

interface TechnicalIndicatorsViewProps {
  initialSymbol?: string;
}

export const TechnicalIndicatorsView: React.FC<TechnicalIndicatorsViewProps> = ({
  initialSymbol = 'BTCUSD',
}) => {
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [timeframe, setTimeframe] = useState<string>('5m');
  const [snapshot, setSnapshot] = useState<IndicatorSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pivotModel, setPivotModel] = useState<'standard' | 'fibonacci' | 'camarilla'>('standard');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const symbols = ['BTCUSD', 'ETHUSD', 'SOLUSD'];
  const timeframes = ['5m', '15m', '1h'];

  const fetchIndicators = async (targetSymbol = symbol, targetTimeframe = timeframe) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/indicators/${targetSymbol}?timeframe=${targetTimeframe}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: 'Failed to fetch indicators' }));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSnapshot(data);
    } catch (err: any) {
      setError(err.message || 'Error loading indicator snapshot');
      setSnapshot(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIndicators(symbol, timeframe);
  }, [symbol, timeframe]);

  const handleSyncCandles = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await apiFetch('/api/v1/market/sync', { method: 'POST' });
      const data = await res.json();
      setSyncMessage(`Synced ${data.synced_candles} candles across instruments.`);
      await fetchIndicators(symbol, timeframe);
    } catch (err: any) {
      setSyncMessage(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 45) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 15) return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20';
    if (score <= -45) return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (score <= -15) return 'text-rose-300 bg-rose-500/10 border-rose-500/20';
    return 'text-slate-300 bg-slate-800/60 border-slate-700';
  };

  const getTrendBadge = (trend: string) => {
    if (trend.includes('BULLISH')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <TrendingUp className="w-3 h-3" />
          <span>{trend}</span>
        </span>
      );
    }
    if (trend.includes('BEARISH')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <TrendingDown className="w-3 h-3" />
          <span>{trend}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300">
        <Activity className="w-3 h-3" />
        <span>{trend}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Control Strip: Symbol & Timeframe Selectors + Sync Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
        <div className="flex flex-wrap items-center gap-4">
          {/* Symbol Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-400">Symbol:</span>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              {symbols.map((sym) => (
                <button
                  key={sym}
                  id={`ind-sym-${sym}`}
                  onClick={() => setSymbol(sym)}
                  className={`px-3 py-1 text-xs font-mono rounded-md font-semibold transition-all ${
                    symbol === sym
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-400">Timeframe:</span>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  id={`ind-tf-${tf}`}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 text-xs font-mono rounded-md font-semibold transition-all ${
                    timeframe === tf
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            id="sync-candles-btn"
            onClick={handleSyncCandles}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
            title="Fetch recent candles from Delta Exchange into SQLite"
          >
            <Zap className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Market Candles'}</span>
          </button>

          <button
            id="refresh-indicators-btn"
            onClick={() => fetchIndicators()}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <div className="font-semibold">Indicator Calculation Notice</div>
            <div className="mt-0.5 text-rose-400/90">{error}</div>
            <div className="mt-2 text-[11px] text-slate-400">
              Tip: Click &quot;Sync Market Candles&quot; above to populate the local cache with historical Delta Exchange candlesticks.
            </div>
          </div>
        </div>
      )}

      {snapshot && (
        <div className="space-y-6">
          {/* Top Banner: Composite Technical Score & Bias */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-3">
                  <span className="text-xl font-bold font-mono text-slate-100">{snapshot.symbol}</span>
                  <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-800 text-slate-400">
                    {snapshot.timeframe}
                  </span>
                  <span className="text-sm font-mono text-slate-400">
                    Current: ${snapshot.current_price.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    ({snapshot.candle_count} bars processed)
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Engineered for strict 7-state trade filtering &amp; multi-timeframe decision alignment.
                </div>
              </div>

              {/* Technical Score Badge */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Technical Score</div>
                  <div className="text-2xl font-black font-mono tracking-tight text-slate-100">
                    {snapshot.technical_score > 0 ? `+${snapshot.technical_score}` : snapshot.technical_score}
                    <span className="text-xs font-normal text-slate-400"> / 100</span>
                  </div>
                </div>

                <div className={`px-4 py-2 rounded-xl border text-sm font-bold tracking-wide uppercase ${getScoreColor(snapshot.technical_score)}`}>
                  {snapshot.technical_bias.replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Score Meter Visualizer */}
            <div className="mt-4">
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Strong Bearish (-100)</span>
                <span>Neutral (0)</span>
                <span>Strong Bullish (+100)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-slate-500 to-emerald-500 transition-all duration-500"
                  style={{
                    width: `${Math.max(5, Math.min(95, ((snapshot.technical_score + 100) / 200) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Summary Reasons Checklist */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Technical Validation Signals</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {snapshot.summary_reasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className="text-xs font-mono text-slate-300 bg-slate-950/60 border border-slate-800/80 px-3 py-1.5 rounded-lg flex items-center space-x-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Core Indicators 2x2 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. EMA 9 & EMA 20 */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-semibold text-slate-200">EMA 9 / EMA 20 Momentum</h4>
                </div>
                {getTrendBadge(snapshot.ema.trend)}
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-1">Fast EMA (9)</div>
                  <div className="text-lg font-bold text-emerald-400">
                    ${snapshot.ema.ema_fast?.toLocaleString() ?? '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Slope: {snapshot.ema.fast_slope > 0 ? `+${snapshot.ema.fast_slope}%` : `${snapshot.ema.fast_slope}%`}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-1">Slow EMA (20)</div>
                  <div className="text-lg font-bold text-cyan-400">
                    ${snapshot.ema.ema_slow?.toLocaleString() ?? '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Slope: {snapshot.ema.slow_slope > 0 ? `+${snapshot.ema.slow_slope}%` : `${snapshot.ema.slow_slope}%`}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs font-mono text-slate-400">
                <span>Spread: {snapshot.ema.spread_pct > 0 ? `+${snapshot.ema.spread_pct}%` : `${snapshot.ema.spread_pct}%`}</span>
                <span>Position: <span className="text-slate-200 font-semibold">{snapshot.ema.price_position}</span></span>
              </div>
            </div>

            {/* 2. MACD (12, 26, 9) */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center space-x-2">
                  <BarChart2 className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-semibold text-slate-200">MACD (12, 26, 9) Convergence</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {snapshot.macd.momentum_state}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono text-center">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-1">MACD Line</div>
                  <div className="text-base font-bold text-slate-100">
                    {snapshot.macd.macd_line?.toFixed(2) ?? '—'}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-1">Signal Line</div>
                  <div className="text-base font-bold text-amber-400">
                    {snapshot.macd.signal_line?.toFixed(2) ?? '—'}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-1">Histogram</div>
                  <div
                    className={`text-base font-bold ${
                      (snapshot.macd.histogram ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {(snapshot.macd.histogram ?? 0) > 0 ? `+${snapshot.macd.histogram?.toFixed(2)}` : snapshot.macd.histogram?.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs font-mono text-slate-400">
                <span>Crossover: <span className="text-slate-200">{snapshot.macd.crossover}</span></span>
                <span>Zero Line: <span className="text-slate-200">{snapshot.macd.zero_line_position}</span></span>
              </div>
            </div>

            {/* 3. VWAP & StdDev Bands */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <h4 className="text-sm font-semibold text-slate-200">VWAP &amp; Deviation Bands</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono bg-purple-500/10 border border-purple-500/30 text-purple-300">
                  {snapshot.vwap.bias}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 mb-3 font-mono flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">Session VWAP</div>
                  <div className="text-xl font-bold text-purple-300">
                    ${snapshot.vwap.vwap?.toLocaleString() ?? '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400">Distance from Price</div>
                  <div
                    className={`text-sm font-bold ${
                      snapshot.vwap.distance_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {snapshot.vwap.distance_pct >= 0 ? `+${snapshot.vwap.distance_pct}%` : `${snapshot.vwap.distance_pct}%`}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-950/60 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">+2σ Upper Band:</span>
                  <span className="text-rose-300">${snapshot.vwap.upper_band_2?.toLocaleString()}</span>
                </div>
                <div className="p-2 bg-slate-950/60 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">+1σ Upper Band:</span>
                  <span className="text-amber-300">${snapshot.vwap.upper_band_1?.toLocaleString()}</span>
                </div>
                <div className="p-2 bg-slate-950/60 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">-1σ Lower Band:</span>
                  <span className="text-cyan-300">${snapshot.vwap.lower_band_1?.toLocaleString()}</span>
                </div>
                <div className="p-2 bg-slate-950/60 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">-2σ Lower Band:</span>
                  <span className="text-emerald-300">${snapshot.vwap.lower_band_2?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 4. Support & Resistance Swing Structure */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-semibold text-slate-200">Support &amp; Resistance Zones</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  {snapshot.support_resistance.proximity_status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono mb-3">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-1">Nearest Support</div>
                  <div className="text-base font-bold text-emerald-400">
                    ${snapshot.support_resistance.nearest_support?.toLocaleString() ?? '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    -{snapshot.support_resistance.support_distance_pct}% from price
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-1">Nearest Resistance</div>
                  <div className="text-base font-bold text-rose-400">
                    ${snapshot.support_resistance.nearest_resistance?.toLocaleString() ?? '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    +{snapshot.support_resistance.resistance_distance_pct}% from price
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {snapshot.support_resistance.zones.slice(0, 4).map((zone, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center px-2.5 py-1 rounded bg-slate-950 text-xs font-mono border border-slate-800"
                  >
                    <span
                      className={zone.level_type === 'SUPPORT' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}
                    >
                      {zone.level_type}
                    </span>
                    <span className="text-slate-200">${zone.price.toLocaleString()}</span>
                    <span className="text-slate-500 text-[11px]">{zone.touches} touches (str: {zone.strength})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full Width Pivot Points Matrix */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-semibold text-slate-200">Intraday Pivot Points Matrix</h4>
              </div>

              {/* Pivot Model Switcher */}
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                {(['standard', 'fibonacci', 'camarilla'] as const).map((m) => (
                  <button
                    key={m}
                    id={`pivot-btn-${m}`}
                    onClick={() => setPivotModel(m)}
                    className={`px-3 py-1 text-xs font-mono rounded-md font-semibold capitalize transition-all ${
                      pivotModel === m
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Pivot Table */}
            {snapshot.pivots && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="pb-2">Level Type</th>
                      <th className="pb-2">R3 / R4</th>
                      <th className="pb-2">R2</th>
                      <th className="pb-2">R1</th>
                      <th className="pb-2 text-cyan-400">Pivot (P)</th>
                      <th className="pb-2">S1</th>
                      <th className="pb-2">S2</th>
                      <th className="pb-2">S3 / S4</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(() => {
                      const lvl = snapshot.pivots[pivotModel];
                      if (!lvl) return null;
                      return (
                        <tr className="text-slate-200">
                          <td className="py-2.5 font-semibold text-slate-400 capitalize">{pivotModel}</td>
                          <td className="py-2.5 text-rose-300 font-bold">${lvl.r3?.toLocaleString()}</td>
                          <td className="py-2.5 text-rose-400 font-medium">${lvl.r2?.toLocaleString()}</td>
                          <td className="py-2.5 text-amber-300">${lvl.r1?.toLocaleString()}</td>
                          <td className="py-2.5 text-cyan-400 font-bold">${lvl.pivot?.toLocaleString()}</td>
                          <td className="py-2.5 text-cyan-300">${lvl.s1?.toLocaleString()}</td>
                          <td className="py-2.5 text-emerald-400 font-medium">${lvl.s2?.toLocaleString()}</td>
                          <td className="py-2.5 text-emerald-300 font-bold">${lvl.s3?.toLocaleString()}</td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
