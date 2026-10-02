import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
} from 'lucide-react';
import { TrendConfluenceResult, MarketRegimeAnalysis } from '../types';

interface MultiTimeframeTrendViewProps {
  initialSymbol?: string;
}

export const MultiTimeframeTrendView: React.FC<MultiTimeframeTrendViewProps> = ({
  initialSymbol = 'BTCUSD',
}) => {
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [confluence, setConfluence] = useState<TrendConfluenceResult | null>(null);
  const [advisory, setAdvisory] = useState<MarketRegimeAnalysis | null>(null);
  const [isLoadingConfluence, setIsLoadingConfluence] = useState<boolean>(false);
  const [isLoadingAdvisory, setIsLoadingAdvisory] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchConfluence = useCallback(async (sym: string) => {
    setIsLoadingConfluence(true);
    try {
      const res = await apiFetch(`/api/v1/trend/confluence/${sym}`);
      if (res.ok) {
        const data = await res.json();
        setConfluence(data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to fetch confluence:', err);
    } finally {
      setIsLoadingConfluence(false);
    }
  }, []);

  const fetchAdvisory = useCallback(async (sym: string) => {
    setIsLoadingAdvisory(true);
    try {
      const res = await apiFetch(`/api/v1/llm/advisory/${sym}`);
      if (res.ok) {
        const data = await res.json();
        setAdvisory(data);
      }
    } catch (err) {
      console.error('Failed to fetch LLM advisory:', err);
    } finally {
      setIsLoadingAdvisory(false);
    }
  }, []);

  useEffect(() => {
    fetchConfluence(symbol);
    fetchAdvisory(symbol);
    const interval = setInterval(() => {
      fetchConfluence(symbol);
    }, 15000);
    return () => clearInterval(interval);
  }, [symbol, fetchConfluence, fetchAdvisory]);

  const getTrendBadge = (trend: string) => {
    if (trend === 'BULLISH') {
      return (
        <span className="flex items-center space-x-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px] font-mono">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>BULLISH</span>
        </span>
      );
    }
    if (trend === 'BEARISH') {
      return (
        <span className="flex items-center space-x-1 text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded text-[11px] font-mono">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>BEARISH</span>
        </span>
      );
    }
    return (
      <span className="text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[11px] font-mono">
        NEUTRAL
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Symbol Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>Multi-Timeframe Trend & LLM Advisory Engine</span>
              <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                Phase 8
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Triple-screen confluence analysis (1h Macro + 15m Structural + 5m Tactical) with Gemini AI market regime synthesis.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {['BTCUSD', 'ETHUSD'].map((s) => (
              <button
                key={s}
                onClick={() => setSymbol(s)}
                className={`px-3 py-1 rounded text-xs font-mono font-medium transition-all ${
                  symbol === s
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              fetchConfluence(symbol);
              fetchAdvisory(symbol);
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh Analysis"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingConfluence || isLoadingAdvisory ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Triple-Timeframe Matrix Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Macro 1h */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-semibold text-slate-200">1H Macro Timeframe</span>
            </div>
            {confluence ? getTrendBadge(confluence.macro_1h.trend) : null}
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Technical Score:</span>
              <span className={`font-semibold ${confluence?.macro_1h.score && confluence.macro_1h.score > 0 ? 'text-emerald-400' : confluence?.macro_1h.score && confluence.macro_1h.score < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {confluence?.macro_1h.score || 0} / 100
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>EMA Trend:</span>
              <span className="text-slate-200">{confluence?.macro_1h.ema_status || 'UP'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>MACD Momentum:</span>
              <span className="text-slate-200">{confluence?.macro_1h.macd_status || 'BULLISH'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>VWAP Bias:</span>
              <span className="text-slate-200">{confluence?.macro_1h.vwap_status || 'ABOVE'}</span>
            </div>
          </div>
        </div>

        {/* Structural 15m */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-200">15M Structural Timeframe</span>
            </div>
            {confluence ? getTrendBadge(confluence.structural_15m.trend) : null}
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Technical Score:</span>
              <span className={`font-semibold ${confluence?.structural_15m.score && confluence.structural_15m.score > 0 ? 'text-emerald-400' : confluence?.structural_15m.score && confluence.structural_15m.score < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {confluence?.structural_15m.score || 0} / 100
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>EMA Trend:</span>
              <span className="text-slate-200">{confluence?.structural_15m.ema_status || 'UP'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>MACD Momentum:</span>
              <span className="text-slate-200">{confluence?.structural_15m.macd_status || 'BULLISH'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>VWAP Bias:</span>
              <span className="text-slate-200">{confluence?.structural_15m.vwap_status || 'ABOVE'}</span>
            </div>
          </div>
        </div>

        {/* Tactical 5m */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-slate-200">5M Tactical Timeframe</span>
            </div>
            {confluence ? getTrendBadge(confluence.tactical_5m.trend) : null}
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Technical Score:</span>
              <span className={`font-semibold ${confluence?.tactical_5m.score && confluence.tactical_5m.score > 0 ? 'text-emerald-400' : confluence?.tactical_5m.score && confluence.tactical_5m.score < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {confluence?.tactical_5m.score || 0} / 100
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>EMA Trend:</span>
              <span className="text-slate-200">{confluence?.tactical_5m.ema_status || 'UP'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>MACD Momentum:</span>
              <span className="text-slate-200">{confluence?.tactical_5m.macd_status || 'BULLISH'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>VWAP Bias:</span>
              <span className="text-slate-200">{confluence?.tactical_5m.vwap_status || 'ABOVE'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confluence Alignment & Action Gauge */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Multi-Timeframe Trend Alignment & Confluence Score
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Confluence requires directional agreement across at least 2 of 3 timeframes before trade signals are prioritized.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Confluence State</span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                confluence?.confluence_state.includes('BULLISH')
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                  : confluence?.confluence_state.includes('BEARISH')
                  ? 'text-rose-400 bg-rose-500/10 border border-rose-500/30'
                  : 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
              }`}>
                {confluence?.confluence_state || 'NEUTRAL'}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Recommended Action</span>
              <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded">
                {confluence?.recommended_action || 'WAIT'}
              </span>
            </div>
          </div>
        </div>

        {/* Alignment Gauge Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>Directional Alignment:</span>
            <span className="text-slate-200 font-semibold">{confluence?.alignment_pct || 66.7}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 ${
                confluence?.confluence_state.includes('BULLISH')
                  ? 'bg-emerald-500'
                  : confluence?.confluence_state.includes('BEARISH')
                  ? 'bg-rose-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${confluence?.alignment_pct || 66.7}%` }}
            />
          </div>
        </div>
      </div>

      {/* Gemini AI Advisory Panel */}
      <div className="bg-slate-900/80 border border-indigo-500/30 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <span>Gemini AI Quantitative Market Regime Advisory</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  gemini-2.5-flash
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Synthetic macro regime classification, volatility assessment, and strategy suitability.
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchAdvisory(symbol)}
            disabled={isLoadingAdvisory}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isLoadingAdvisory ? 'animate-spin' : ''}`} />
            <span>{isLoadingAdvisory ? 'Analyzing...' : 'Run Gemini Audit'}</span>
          </button>
        </div>

        {advisory && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Regime Card */}
            <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-2 font-mono">
              <span className="text-slate-400 text-[11px] block">Market Regime:</span>
              <span className="text-sm font-bold text-cyan-300 block">{advisory.regime}</span>
              <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-900">
                <span>Confidence:</span>
                <span className="text-slate-200 font-semibold">{advisory.confidence}%</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Suggested Setup:</span>
                <span className="text-indigo-400 font-semibold">{advisory.suggested_strategy}</span>
              </div>
            </div>

            {/* Rationale & Action */}
            <div className="md:col-span-2 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-2">
              <span className="text-slate-400 text-[11px] font-mono block">Quantitative Advisory Rationale:</span>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {advisory.advisory_recommendation}
              </p>
              {advisory.key_risks && advisory.key_risks.length > 0 && (
                <div className="pt-2 border-t border-slate-900">
                  <span className="text-[11px] font-mono text-amber-400 block mb-1">Identified Macro Risks:</span>
                  <div className="flex flex-wrap gap-2">
                    {advisory.key_risks.map((risk, i) => (
                      <span key={i} className="text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                        ⚠️ {risk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deterministic Safety Invariant Banner */}
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-3 flex items-start space-x-3 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-semibold text-emerald-300 font-mono text-[11px]">
              STRICT DETERMINISTIC RISK INVARIANT:
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Gemini LLM recommendations are strictly advisory and non-authoritative. The execution engine enforces deterministic risk checks: maximum 1% wallet risk, 30% untouchable cash reserve, and mandatory bracket stops. The LLM cannot override, bypass, or loosen any risk constraint.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
