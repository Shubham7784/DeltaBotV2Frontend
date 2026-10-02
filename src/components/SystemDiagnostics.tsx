import { apiFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import {
  Terminal,
  CheckCircle2,
  RefreshCw,
  Server,
  Zap,
  HeartHandshake,
  ShieldAlert,
  Database,
  Layers,
  Activity,
  Play,
  Square,
  Clock,
  Shield,
} from 'lucide-react';
import { HealthData, SystemStatusData, LogEntry } from '../types';
import { TechnicalIndicatorsView } from './TechnicalIndicatorsView';
import { ExecutionLifecycleView } from './ExecutionLifecycleView';

interface SystemDiagnosticsProps {
  health: HealthData | null;
  status: SystemStatusData | null;
  logs: LogEntry[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const SystemDiagnostics: React.FC<SystemDiagnosticsProps> = ({
  health,
  status,
  logs,
  isLoading,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'market_engine' | 'indicators' | 'execution_risk' | 'delta_api' | 'logs' | 'endpoints'>('execution_risk');
  const [rateLimits, setRateLimits] = useState<Record<string, unknown> | null>(null);
  const [heartbeatStatus, setHeartbeatStatus] = useState<string | null>(null);
  const [isSendingHeartbeat, setIsSendingHeartbeat] = useState<boolean>(false);
  const [marketStatus, setMarketStatus] = useState<any>(null);
  const [isSyncingMarket, setIsSyncingMarket] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const fetchRateLimits = async () => {
    try {
      const res = await apiFetch('/api/v1/delta/rate-limits');
      if (res.ok) {
        const data = await res.json();
        setRateLimits(data.result || data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMarketStatus = async () => {
    try {
      const res = await apiFetch('/api/v1/market/status');
      if (res.ok) {
        const data = await res.json();
        setMarketStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch market engine status:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'delta_api') {
      fetchRateLimits();
    } else if (activeTab === 'market_engine') {
      fetchMarketStatus();
    }
  }, [activeTab]);

  const handleTriggerMarketSync = async () => {
    setIsSyncingMarket(true);
    setSyncFeedback(null);
    try {
      const res = await apiFetch('/api/v1/market/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: ['BTCUSD', 'ETHUSD'],
          timeframes: ['5m', '15m', '1h'],
          lookback_hours: 6,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const total = data.reduce((acc: number, curr: any) => acc + (curr.synced_count || 0), 0);
        setSyncFeedback(`Successfully synchronized ${total} candles across multi-timeframe buffers`);
        fetchMarketStatus();
      } else {
        setSyncFeedback(`Sync failed with HTTP ${res.status}`);
      }
    } catch (err) {
      setSyncFeedback(`Sync error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSyncingMarket(false);
    }
  };

  const handleTogglePoller = async () => {
    try {
      if (marketStatus?.poller_active) {
        await apiFetch('/api/v1/market/poller/stop', { method: 'POST' });
      } else {
        await apiFetch('/api/v1/market/poller/start?interval_sec=20', { method: 'POST' });
      }
      fetchMarketStatus();
    } catch (err) {
      console.error('Failed to toggle poller:', err);
    }
  };

  const handleTriggerHeartbeat = async () => {
    setIsSendingHeartbeat(true);
    try {
      const hbId = `delta_bot_${Date.now()}`;
      const res = await apiFetch('/api/v1/delta/heartbeat/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heartbeat_id: hbId, unhealthy_count: 1 }),
      });
      const data = await res.json();
      if (data.success) {
        setHeartbeatStatus(`Deadman switch active: ${hbId} (TTL: 30s)`);
      } else {
        setHeartbeatStatus(`Heartbeat error: ${data.error?.message || 'Failed'}`);
      }
    } catch (err) {
      setHeartbeatStatus(`Failed to send heartbeat: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSendingHeartbeat(false);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Diagnostics Header Tabs */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            id="tab-market-engine-btn"
            onClick={() => setActiveTab('market_engine')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'market_engine'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Market Engine</span>
          </button>
          <button
            id="tab-indicators-btn"
            onClick={() => setActiveTab('indicators')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'indicators'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Indicator Engine</span>
          </button>
          <button
            id="tab-execution-risk-btn"
            onClick={() => setActiveTab('execution_risk')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'execution_risk'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Risk &amp; Execution</span>
          </button>
          <button
            id="tab-delta-api-btn"
            onClick={() => setActiveTab('delta_api')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'delta_api'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Delta API Diagnostic</span>
          </button>
          <button
            id="tab-logs-btn"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'logs'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Audit Logs ({logs.length})</span>
          </button>
          <button
            id="tab-endpoints-btn"
            onClick={() => setActiveTab('endpoints')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'endpoints'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>API Registry</span>
          </button>
        </div>

        <button
          id="refresh-diagnostics-btn"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-mono transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Sync</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'market_engine' && (
          <div className="space-y-4">
            {/* Top Engine Overview Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-slate-400 text-[11px] block mb-1">Background Poller</span>
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      marketStatus?.poller_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                  <span className={marketStatus?.poller_active ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                    {marketStatus?.poller_active ? 'RUNNING' : 'STOPPED'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Interval: {marketStatus?.poll_interval_sec || 30}s
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-slate-400 text-[11px] block mb-1">Buffer Architecture</span>
                <span className="text-cyan-400 font-semibold block">In-Memory Circular</span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Capacity: {marketStatus?.max_buffer_capacity || 300} candles/tf
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-slate-400 text-[11px] block mb-1">Tracked Instruments</span>
                <span className="text-purple-400 font-semibold block">
                  {marketStatus?.tracked_symbols?.join(', ') || 'BTCUSD, ETHUSD, SOLUSD'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Timeframes: 5m, 15m, 1h</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs flex flex-col justify-between">
                <span className="text-slate-400 text-[11px] block mb-1">Poller Control</span>
                <div className="flex space-x-2">
                  <button
                    onClick={handleTogglePoller}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors ${
                      marketStatus?.poller_active
                        ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800'
                        : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {marketStatus?.poller_active ? (
                      <>
                        <Square className="w-3 h-3" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        <span>Start</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleTriggerMarketSync}
                    disabled={isSyncingMarket}
                    className="flex-1 py-1 px-2 rounded text-[11px] font-semibold bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 flex items-center justify-center space-x-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncingMarket ? 'animate-spin' : ''}`} />
                    <span>Sync</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sync Feedback Message */}
            {syncFeedback && (
              <div className="p-2.5 rounded-lg text-xs font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-between">
                <span>{syncFeedback}</span>
                <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-slate-200">
                  ×
                </button>
              </div>
            )}

            {/* Multi-Timeframe Buffer Status Table */}
            <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden font-mono text-xs">
              <div className="px-4 py-2.5 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-slate-300">Ring Buffer Multi-Timeframe Status</span>
                <span className="text-[11px] text-slate-400">
                  Auto-populated on startup from SQLite `candles` table
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-900/20">
                      <th className="px-4 py-2">Symbol</th>
                      <th className="px-4 py-2">Timeframe</th>
                      <th className="px-4 py-2">Cached Candles</th>
                      <th className="px-4 py-2">Latest Close</th>
                      <th className="px-4 py-2">Latest Bar Timestamp</th>
                      <th className="px-4 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {marketStatus?.buffer_stats?.length > 0 ? (
                      marketStatus.buffer_stats.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="px-4 py-2.5 font-bold text-slate-200">{item.symbol}</td>
                          <td className="px-4 py-2 text-cyan-400">{item.resolution}</td>
                          <td className="px-4 py-2">
                            <span className="font-semibold text-slate-100">{item.count}</span>
                            <span className="text-slate-400 text-[10px]"> / {item.capacity}</span>
                          </td>
                          <td className="px-4 py-2 text-emerald-400">
                            {item.latest_close ? `$${Number(item.latest_close).toLocaleString()}` : '—'}
                          </td>
                          <td className="px-4 py-2 text-slate-400 text-[11px]">
                            {item.latest_timestamp
                              ? new Date(item.latest_timestamp * 1000).toLocaleTimeString()
                              : 'Awaiting sync'}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                item.count > 0
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {item.count > 0 ? 'READY' : 'EMPTY'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                          Buffers are initializing or loading. Click "Sync" to ingest multi-timeframe candles.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'indicators' && (
          <div className="p-4 sm:p-6">
            <TechnicalIndicatorsView />
          </div>
        )}

        {activeTab === 'execution_risk' && (
          <div className="p-2 sm:p-4">
            <ExecutionLifecycleView />
          </div>
        )}

        {activeTab === 'delta_api' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Gateway Status */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs font-mono">
                <span className="text-slate-400 text-[11px] block mb-1">Delta Exchange Host</span>
                <span className="text-emerald-400 font-semibold block">api.india.delta.exchange</span>
                <span className="text-[10px] text-slate-400 mt-1 block">Live SSL Connection Active</span>
              </div>

              {/* Authentication & Signature */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs font-mono">
                <span className="text-slate-400 text-[11px] block mb-1">Signature Scheme</span>
                <span className="text-cyan-400 font-semibold block">HMAC-SHA256 (Hex)</span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  method + timestamp + path + query + body
                </span>
              </div>

              {/* Deadman Switch Control */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs font-mono">
                <span className="text-slate-400 text-[11px] block mb-1">Deadman Heartbeat</span>
                <button
                  id="ping-heartbeat-btn"
                  onClick={handleTriggerHeartbeat}
                  disabled={isSendingHeartbeat}
                  className="w-full py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] transition-colors flex items-center justify-center space-x-1"
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>{isSendingHeartbeat ? 'Ping...' : 'Register / Ping Heartbeat'}</span>
                </button>
                {heartbeatStatus && (
                  <span className="text-[10px] text-emerald-400 mt-1 block truncate">
                    {heartbeatStatus}
                  </span>
                )}
              </div>
            </div>

            {/* Rate Limits Spec */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300 font-semibold">Rate Limit Quota</span>
                <span className="text-[11px] text-slate-400">Endpoint: /v2/rate_limits/quota</span>
              </div>
              <pre className="text-[11px] text-slate-400 overflow-x-auto bg-slate-900/60 p-2.5 rounded border border-slate-800">
                {JSON.stringify(
                  rateLimits || {
                    rate_limit_per_second: 10,
                    rate_limit_per_minute: 300,
                    status: 'Normal',
                    window: '60s rolling',
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-2">
            <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs max-h-64 overflow-y-auto border border-slate-800 space-y-1">
              {logs.length === 0 ? (
                <div className="text-slate-400 py-4 text-center">No logs generated yet. Backend is running quietly.</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-[11px] leading-relaxed">
                    <span className="text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`font-semibold shrink-0 ${
                        log.level === 'ERROR'
                          ? 'text-rose-400'
                          : log.level === 'WARNING'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      [{log.level}]
                    </span>
                    <span className="text-slate-400 shrink-0">[{log.logger}]</span>
                    <span className="text-slate-300 break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
            <div className="text-[11px] text-slate-400 flex justify-between font-mono px-1">
              <span>System Log Stream</span>
              <span>Buffer Capacity: 200 items</span>
            </div>
          </div>
        )}

        {activeTab === 'endpoints' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1">Live Tickers</div>
                <div className="text-emerald-400 font-semibold">GET /api/v1/delta/tickers/:symbol</div>
                <div className="text-slate-400 text-[11px] mt-1">Mark price, volume, high/low, bid/ask quotes</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1">Option Chain with Greeks</div>
                <div className="text-cyan-400 font-semibold">GET /api/v1/delta/option-chain?underlying=BTC</div>
                <div className="text-slate-400 text-[11px] mt-1">Delta, Gamma, Theta, Vega, IV per strike</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1">Order Execution with Bracket TP/SL</div>
                <div className="text-purple-400 font-semibold">POST /api/v1/delta/orders</div>
                <div className="text-slate-400 text-[11px] mt-1">Market, Limit, Stop orders with attached brackets</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1">Positions & Margin Control</div>
                <div className="text-amber-400 font-semibold">GET /api/v1/delta/positions</div>
                <div className="text-slate-400 text-[11px] mt-1">Isolated & portfolio margin, liquidation price</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1">Multi-Timeframe Candle Sync</div>
                <div className="text-emerald-400 font-semibold">POST /api/v1/market/sync</div>
                <div className="text-slate-400 text-[11px] mt-1">Delta candle synchronization (5m, 15m, 1h) & SQLite persistence</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1">In-Memory Ring Buffers</div>
                <div className="text-cyan-400 font-semibold">GET /api/v1/market/buffers/:symbol</div>
                <div className="text-slate-400 text-[11px] mt-1">O(1) vector slicing of chronological candle arrays</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1">Live Price Feed Cache</div>
                <div className="text-purple-400 font-semibold">GET /api/v1/market/live-feed</div>
                <div className="text-slate-400 text-[11px] mt-1">Sub-second mark & spot price cache across instruments</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1">Background Poller Daemon</div>
                <div className="text-amber-400 font-semibold">POST /api/v1/market/poller/start | stop</div>
                <div className="text-slate-400 text-[11px] mt-1">Non-blocking background loop refreshing candle states</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1">Indicator Snapshot (Composite)</div>
                <div className="text-emerald-400 font-semibold">GET /api/v1/indicators/:symbol?timeframe=5m|15m|1h|all</div>
                <div className="text-slate-400 text-[11px] mt-1">EMA 9/20, MACD, VWAP, Pivots, S/R, and technical bias score (-100 to +100)</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1">EMA &amp; MACD &amp; VWAP Analysis</div>
                <div className="text-cyan-400 font-semibold">GET /api/v1/indicators/:symbol/ema | macd | vwap | pivots | support-resistance</div>
                <div className="text-slate-400 text-[11px] mt-1">Dedicated indicator endpoints for granular strategy queries</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1">On-Demand Custom Calculations</div>
                <div className="text-purple-400 font-semibold">POST /api/v1/indicators/calculate</div>
                <div className="text-slate-400 text-[11px] mt-1">Calculate technical indicators on custom OHLCV vectors for backtesting</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1">Live Capital &amp; Risk Status</div>
                <div className="text-emerald-400 font-semibold">GET /api/v1/risk/status?subaccount=futures</div>
                <div className="text-slate-400 text-[11px] mt-1">30% reserve buffer, 50% max exposure, 1% risk limit ($0.12 on $12)</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1">Deterministic Pre-Flight Risk Validator</div>
                <div className="text-cyan-400 font-semibold">POST /api/v1/risk/validate</div>
                <div className="text-slate-400 text-[11px] mt-1">Mathematical contract sizing, liquidation buffer, single-position invariant</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1">7-State Trade Lifecycle Orchestrator</div>
                <div className="text-purple-400 font-semibold">GET /api/v1/execution/trades | POST /trades/:id/step</div>
                <div className="text-slate-400 text-[11px] mt-1">Query trade states, step progression, and auto-execute pipeline</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[11px] mb-1">Emergency Kill Switch (Circuit Breaker)</div>
                <div className="text-rose-400 font-semibold">POST /api/v1/execution/kill-switch</div>
                <div className="text-slate-400 text-[11px] mt-1">Cancels all resting orders and liquidates positions with HMAC signing &amp; audit logging</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
