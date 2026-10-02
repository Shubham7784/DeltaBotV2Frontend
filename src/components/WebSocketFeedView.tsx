import { apiFetch, apiWebSocketUrl } from '../lib/api';
import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Activity,
  Layers,
  RefreshCw,
  Zap,
  Radio,
  Clock,
  ArrowDownUp,
  Server,
} from 'lucide-react';
import { WebSocketFeedStats, OrderBookSnapshot } from '../types';

interface WebSocketFeedViewProps {
  activeSymbol: string;
  onSelectSymbol?: (symbol: string) => void;
}

export const WebSocketFeedView: React.FC<WebSocketFeedViewProps> = ({
  activeSymbol,
  onSelectSymbol,
}) => {
  const [stats, setStats] = useState<WebSocketFeedStats | null>(null);
  const [orderbook, setOrderbook] = useState<OrderBookSnapshot | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, any>>({});
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [clientWsConnected, setClientWsConnected] = useState(false);
  const [lastMsgTime, setLastMsgTime] = useState<number>(Date.now());

  // Direct client WebSocket to backend
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;

    const connectClientWs = () => {
      try {
        ws = new WebSocket(apiWebSocketUrl('/api/v1/ws'));

        ws.onopen = () => {
          setClientWsConnected(true);
        };

        ws.onmessage = (event) => {
          setLastMsgTime(Date.now());
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'welcome') {
              if (msg.ws_status) setStats(msg.ws_status);
              if (msg.live_prices) setLivePrices(msg.live_prices);
            } else if (msg.type === 'ws_status') {
              setStats(msg.data);
            } else if (msg.type === 'price_update') {
              setLivePrices((prev) => ({
                ...prev,
                [msg.symbol]: msg.data,
              }));
            } else if (msg.type === 'orderbook_update' && msg.symbol === activeSymbol) {
              setOrderbook(msg.data);
            }
          } catch (err) {}
        };

        ws.onclose = () => {
          setClientWsConnected(false);
          reconnectTimer = setTimeout(connectClientWs, 3000);
        };

        ws.onerror = () => {
          setClientWsConnected(false);
        };
      } catch (e) {
        setClientWsConnected(false);
      }
    };

    connectClientWs();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [activeSymbol]);

  // Periodic HTTP fallback status poll
  const fetchFeedStats = async () => {
    try {
      const res = await apiFetch('/api/v1/ws/status');
      if (res.ok) {
        const json = await res.json();
        setStats(json);
      }

      const obRes = await apiFetch(`/api/v1/ws/orderbook/${encodeURIComponent(activeSymbol)}`);
      if (obRes.ok) {
        const obJson = await obRes.json();
        setOrderbook(obJson);
      }

      const priceRes = await apiFetch('/api/v1/market/prices');
      if (priceRes.ok) {
        const pJson = await priceRes.json();
        setLivePrices(pJson);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchFeedStats();
    const timer = setInterval(fetchFeedStats, 4000);
    return () => clearInterval(timer);
  }, [activeSymbol]);

  const handleReconnect = async () => {
    setIsActionLoading(true);
    try {
      const res = await apiFetch('/api/v1/ws/connect', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsActionLoading(true);
    try {
      const res = await apiFetch('/api/v1/ws/disconnect', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
    } finally {
      setIsActionLoading(false);
    }
  };

  const isConnected = stats?.status === 'connected';
  const bestBid = orderbook?.bids?.[0]?.[0] || 0;
  const bestAsk = orderbook?.asks?.[0]?.[0] || 0;
  const spread = bestAsk && bestBid ? bestAsk - bestBid : 0;
  const spreadPct = bestBid ? (spread / bestBid) * 100 : 0;

  // Max bid/ask size for visual depth bars
  const maxBidSize = Math.max(...(orderbook?.bids?.map((b) => b[1]) || [1]), 1);
  const maxAskSize = Math.max(...(orderbook?.asks?.map((a) => a[1]) || [1]), 1);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur space-y-6">
      {/* Header with Title & Live Pulse */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-semibold text-slate-100">
                Phase 9: Real-Time WebSocket Feed Engine
              </h2>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono uppercase font-bold tracking-wider ${
                  isConnected
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    isConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'
                  }`}
                />
                {stats?.status || 'INITIALIZING'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Live streaming mark prices, L2 orderbook depth, & candle updates via Delta Public WS
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReconnect}
            disabled={isActionLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            title="Force reconnect WebSocket socket to Delta Exchange"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isActionLoading ? 'animate-spin' : ''}`} />
            <span>Reconnect Feed</span>
          </button>
          <button
            onClick={handleDisconnect}
            disabled={isActionLoading || !isConnected}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
            title="Pause WebSocket live streaming"
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>Disconnect</span>
          </button>
        </div>
      </div>

      {/* Metrics Row: Throughput, Latency, Channels, Client Stream */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-mono">WS Ingestion Rate</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold font-mono text-cyan-300">
            {stats?.messages_per_sec ?? 0}{' '}
            <span className="text-xs font-normal text-slate-400">msg/sec</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            Total: {(stats?.messages_received || 0).toLocaleString()} pkts
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-mono">Heartbeat Latency</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-amber-300">
            {stats?.latency_ms ?? 0} <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            Ping interval: 25s ping/pong
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-mono">Client Broadcast</span>
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-300">
            {clientWsConnected ? 'Active' : 'Standby'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            {stats?.connected_clients ?? 1} browser socket(s)
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-mono">Gateway Uptime</span>
            <Clock className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-bold font-mono text-purple-300">
            {stats ? `${Math.floor(stats.uptime_seconds / 60)}m ${stats.uptime_seconds % 60}s` : '0s'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1 truncate" title={stats?.endpoint}>
            {stats?.endpoint.replace('wss://', '') || 'public-socket'}
          </div>
        </div>
      </div>

      {/* Subscribed Channels Tags */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <span className="text-slate-400 font-mono text-[11px]">Subscribed WS Channels:</span>
        {(stats?.subscribed_channels || ['v2/ticker', 'candlestick_5m', 'candlestick_15m', 'l2_orderbook']).map(
          (chan) => (
            <span
              key={chan}
              className="px-2 py-0.5 bg-slate-800 text-cyan-300 border border-slate-700 rounded text-[11px] font-mono"
            >
              {chan}
            </span>
          )
        )}
      </div>

      {/* Real-time Instruments Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {['BTCUSD', 'ETHUSD', 'SOLUSD'].map((sym) => {
          const p = livePrices[sym] || {};
          const isSelected = activeSymbol === sym;
          const price = p.mark_price ? `$${Number(p.mark_price).toLocaleString()}` : 'Syncing...';

          return (
            <div
              key={sym}
              onClick={() => onSelectSymbol && onSelectSymbol(sym)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-slate-800/90 border-cyan-500/60 shadow-lg shadow-cyan-950/40'
                  : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold font-mono text-slate-200 text-sm">{sym}</span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                  Live WS
                </span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-100 mt-1">{price}</div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-800/50">
                <span>Vol 24h: {p.volume_24h ? p.volume_24h.toFixed(1) : '--'}</span>
                <span>Fund: {p.funding_rate ? `${(p.funding_rate * 100).toFixed(4)}%` : '0.00%'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* L2 Orderbook Depth Visualizer */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-200">
              Live L2 Orderbook Depth — {activeSymbol}
            </h3>
          </div>
          <div className="flex items-center space-x-4 text-xs font-mono text-slate-400 mt-1 sm:mt-0">
            <div>
              Spread:{' '}
              <span className="text-amber-300 font-semibold">
                ${spread.toFixed(2)} ({spreadPct.toFixed(3)}%)
              </span>
            </div>
            <div>
              Mid Price:{' '}
              <span className="text-slate-200 font-semibold">
                ${(orderbook?.mid_price || bestBid || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Dual Column Bids and Asks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bids (Buy Side) */}
          <div className="space-y-1">
            <div className="grid grid-cols-3 text-[11px] font-mono text-slate-400 pb-1 border-b border-slate-800/60 font-semibold">
              <span className="text-emerald-400">Bid Price ($)</span>
              <span className="text-right">Size (Contracts)</span>
              <span className="text-right">Total ($)</span>
            </div>
            {orderbook?.bids && orderbook.bids.length > 0 ? (
              orderbook.bids.slice(0, 8).map(([p, s], idx) => {
                const depthPct = Math.min(100, Math.round((s / maxBidSize) * 100));
                return (
                  <div
                    key={idx}
                    className="relative grid grid-cols-3 text-xs font-mono py-1 px-1.5 rounded overflow-hidden hover:bg-slate-800/40"
                  >
                    {/* Depth Bar Background */}
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 pointer-events-none transition-all"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="text-emerald-400 font-semibold relative z-10">
                      ${p.toLocaleString()}
                    </span>
                    <span className="text-right text-slate-300 relative z-10">{s}</span>
                    <span className="text-right text-slate-400 relative z-10">
                      ${(p * s).toLocaleString()}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-xs font-mono text-slate-400 py-4 text-center">
                Awaiting live bid stream...
              </div>
            )}
          </div>

          {/* Asks (Sell Side) */}
          <div className="space-y-1">
            <div className="grid grid-cols-3 text-[11px] font-mono text-slate-400 pb-1 border-b border-slate-800/60 font-semibold">
              <span className="text-rose-400">Ask Price ($)</span>
              <span className="text-right">Size (Contracts)</span>
              <span className="text-right">Total ($)</span>
            </div>
            {orderbook?.asks && orderbook.asks.length > 0 ? (
              orderbook.asks.slice(0, 8).map(([p, s], idx) => {
                const depthPct = Math.min(100, Math.round((s / maxAskSize) * 100));
                return (
                  <div
                    key={idx}
                    className="relative grid grid-cols-3 text-xs font-mono py-1 px-1.5 rounded overflow-hidden hover:bg-slate-800/40"
                  >
                    {/* Depth Bar Background */}
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-rose-500/10 pointer-events-none transition-all"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="text-rose-400 font-semibold relative z-10">
                      ${p.toLocaleString()}
                    </span>
                    <span className="text-right text-slate-300 relative z-10">{s}</span>
                    <span className="text-right text-slate-400 relative z-10">
                      ${(p * s).toLocaleString()}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-xs font-mono text-slate-400 py-4 text-center">
                Awaiting live ask stream...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
