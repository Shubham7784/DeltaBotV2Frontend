import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Clock,
  Sliders,
  CheckSquare,
  AlertCircle,
  Coins,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Send,
  XCircle,
  Activity,
  Layers,
  Play,
} from 'lucide-react';
import { SystemStatusData, IndicatorSnapshot, TradeLifecycleItem } from '../types';

interface FuturesDomainViewProps {
  status: SystemStatusData | null;
}

interface TickerData {
  symbol: string;
  mark_price: string;
  close: number;
  high: number;
  low: number;
  volume: number;
  mark_change_24h: string;
  quotes?: {
    best_bid?: string;
    best_ask?: string;
    bid_size?: string;
    ask_size?: string;
  };
}

interface PositionData {
  product_id: number;
  product_symbol: string;
  size: number;
  entry_price: string;
  margin: string;
  liquidation_price: string;
  unrealized_pnl: string;
  margin_mode: string;
}

interface OrderData {
  id: number;
  size: number;
  side: string;
  order_type: string;
  limit_price?: string;
  state: string;
  product_symbol: string;
  bracket_order?: boolean;
  bracket_take_profit_price?: string;
  bracket_stop_loss_price?: string;
}

interface OrderbookData {
  symbol: string;
  buy: Array<{ price: string; size: number; depth: string }>;
  sell: Array<{ price: string; size: number; depth: string }>;
}

export const FuturesDomainView: React.FC<FuturesDomainViewProps> = ({ status }) => {
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(['BTC', 'ETH', 'GOLD']);
  const [activeSymbol, setActiveSymbol] = useState<string>('BTCUSD');
  const [leverage, setLeverage] = useState<number>(status?.domains.futures.default_leverage ?? 50);
  const [tpPct, setTpPct] = useState<number>(status?.domains.futures.default_tp_pct ?? 4.0);
  const [slPct, setSlPct] = useState<number>(status?.domains.futures.default_sl_pct ?? 1.0);

  // Live Market State from Delta API
  const [tickers, setTickers] = useState<Record<string, TickerData>>({});
  const [orderbook, setOrderbook] = useState<OrderbookData | null>(null);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [indicatorSnapshot, setIndicatorSnapshot] = useState<IndicatorSnapshot | null>(null);
  const [recentTrades, setRecentTrades] = useState<TradeLifecycleItem[]>([]);
  const [activeActionTradeId, setActiveActionTradeId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Order Placement Form
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market_order' | 'limit_order'>('market_order');
  const [orderSize, setOrderSize] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderFeedback, setOrderFeedback] = useState<string | null>(null);

  const availableInstruments = status?.instruments || ['BTC', 'ETH', 'GOLD'];
  const timeframes = status?.timeframes || ['5m', '15m', '1h'];

  const toggleInstrument = (symbol: string) => {
    if (selectedInstruments.includes(symbol)) {
      if (selectedInstruments.length > 1) {
        setSelectedInstruments(selectedInstruments.filter((s) => s !== symbol));
      }
    } else {
      setSelectedInstruments([...selectedInstruments, symbol]);
    }
  };

  // Fetch live market data, positions, and active orders from Delta Exchange
  const fetchMarketData = useCallback(async () => {
    try {
      // 1. Fetch Ticker for active symbol
      const tickerRes = await apiFetch(`/api/v1/delta/tickers/${activeSymbol}`);
      if (tickerRes.ok) {
        const tickerJson = await tickerRes.json();
        if (tickerJson.success && tickerJson.result) {
          setTickers((prev) => ({ ...prev, [activeSymbol]: tickerJson.result }));
          if (!limitPrice) {
            setLimitPrice(tickerJson.result.mark_price || String(tickerJson.result.close));
          }
        }
      }

      // 2. Fetch Orderbook depth for active symbol
      const obRes = await apiFetch(`/api/v1/delta/orderbook/${activeSymbol}?depth=5`);
      if (obRes.ok) {
        const obJson = await obRes.json();
        if (obJson.success && obJson.result) {
          setOrderbook(obJson.result);
        }
      }

      // 3. Fetch Positions for Futures domain
      const posRes = await apiFetch('/api/v1/delta/positions?subaccount=futures');
      if (posRes.ok) {
        const posJson = await posRes.json();
        if (posJson.success && Array.isArray(posJson.result)) {
          setPositions(posJson.result);
        }
      }

      // 4. Fetch Active Orders
      const ordersRes = await apiFetch('/api/v1/delta/orders?subaccount=futures&states=open,pending');
      if (ordersRes.ok) {
        const ordersJson = await ordersRes.json();
        if (ordersJson.success && Array.isArray(ordersJson.result)) {
          setOrders(ordersJson.result);
        }
      }

      // 5. Fetch Indicator Snapshot for Active Symbol (Phase 5 Indicator Engine)
      try {
        const indRes = await apiFetch(`/api/v1/indicators/${activeSymbol}?timeframe=5m`);
        if (indRes.ok) {
          const indJson = await indRes.json();
          setIndicatorSnapshot(indJson);
        }
      } catch {
        // Silently skip if indicators are initializing
      }

      // 6. Fetch Active Lifecycle Decisions (Phase 7 Execution Engine)
      try {
        const tradesRes = await apiFetch('/api/v1/execution/trades?limit=6');
        if (tradesRes.ok) {
          const tradesJson = await tradesRes.json();
          setRecentTrades(tradesJson);
        }
      } catch {
        // Silently skip if execution engine is initializing
      }
    } catch (err) {
      console.error('Error fetching Delta market data:', err);
    }
  }, [activeSymbol, limitPrice]);

  const handleStepTrade = async (tradeId: number) => {
    setActiveActionTradeId(tradeId);
    try {
      const res = await apiFetch(`/api/v1/execution/trades/${tradeId}/step`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setOrderFeedback(`Trade #${tradeId}: ${data.message}`);
        await fetchMarketData();
      } else {
        setOrderFeedback(`Trade #${tradeId} step error: ${data.detail || 'Failed'}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Step failed';
      setOrderFeedback(`Error: ${msg}`);
    } finally {
      setActiveActionTradeId(null);
    }
  };

  const handleAutoExecuteTrade = async (tradeId: number) => {
    setActiveActionTradeId(tradeId);
    try {
      const res = await apiFetch(`/api/v1/execution/trades/${tradeId}/auto-execute`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setOrderFeedback(`Trade #${tradeId} Auto-Execution: ${data.message}`);
        await fetchMarketData();
      } else {
        setOrderFeedback(`Trade #${tradeId} auto-execute error: ${data.detail || 'Failed'}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Auto-execution failed';
      setOrderFeedback(`Error: ${msg}`);
    } finally {
      setActiveActionTradeId(null);
    }
  };

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 3500);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // Handle Order Submission with calculated Bracket TP/SL
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOrder(true);
    setOrderFeedback(null);

    try {
      const currentPrice = Number(tickers[activeSymbol]?.mark_price || limitPrice || 67000);
      let calculatedTp = '';
      let calculatedSl = '';

      if (orderSide === 'buy') {
        calculatedTp = (currentPrice * (1 + tpPct / 100)).toFixed(1);
        calculatedSl = (currentPrice * (1 - slPct / 100)).toFixed(1);
      } else {
        calculatedTp = (currentPrice * (1 - tpPct / 100)).toFixed(1);
        calculatedSl = (currentPrice * (1 + slPct / 100)).toFixed(1);
      }

      const payload = {
        subaccount: 'futures',
        product_symbol: activeSymbol,
        size: orderSize,
        side: orderSide,
        order_type: orderType,
        limit_price: orderType === 'limit_order' ? limitPrice : undefined,
        bracket_take_profit_price: calculatedTp,
        bracket_stop_loss_price: calculatedSl,
      };

      const res = await apiFetch('/api/v1/delta/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setOrderFeedback(`Order placed successfully! Order ID: ${data.result.id} (TP: $${calculatedTp}, SL: $${calculatedSl})`);
        fetchMarketData();
      } else {
        setOrderFeedback(`Order failed: ${data.error?.message || 'Check credentials / limits'}`);
      }
    } catch (err) {
      setOrderFeedback(`Submission error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleCloseAllPositions = async () => {
    try {
      const res = await apiFetch('/api/v1/delta/positions/close-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subaccount: 'futures' }),
      });
      if (res.ok) {
        fetchMarketData();
      }
    } catch (err) {
      console.error('Failed to close positions:', err);
    }
  };

  const handleCancelAllOrders = async () => {
    try {
      const res = await apiFetch('/api/v1/delta/orders/all', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subaccount: 'futures' }),
      });
      if (res.ok) {
        fetchMarketData();
      }
    } catch (err) {
      console.error('Failed to cancel orders:', err);
    }
  };

  const currentTicker = tickers[activeSymbol];
  const isPositiveChange = Number(currentTicker?.mark_change_24h || 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Top Banner: Rules & Capital Constraints */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Capital Box */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Target Capital Baseline</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-slate-100">₹1,000</span>
              <span className="text-xs font-mono text-slate-400">(~$12.00 USD)</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Micro-wallet sizing: 30% safety reserve buffer enforced.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Max Exposure: 50%</span>
            <span>Safety Reserve: 30%</span>
          </div>
        </div>

        {/* Position Rule Box */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Futures Position Policy</span>
            <Shield className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-200">
              Multiple Active Positions Per Instrument
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Multiple trade decisions and positions may be active for the same instrument.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center space-x-2 text-[11px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
            <span>Single-Position Limit Disabled</span>
          </div>
        </div>

        {/* Timeframe Engine */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Concurrent Timeframes</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-center space-x-2">
            {timeframes.map((tf) => (
              <div
                key={tf}
                className="flex-1 text-center py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 font-mono text-xs font-bold text-slate-200"
              >
                {tf}
                <div className="text-[9px] font-normal text-slate-400">
                  {tf === '5m' ? 'Scalp' : tf === '15m' ? 'Intraday' : 'Context'}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Completed candles only • Centralized data layer
          </div>
        </div>
      </div>

      {/* Live Delta Exchange Market Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Live Delta Exchange Market Feed
            </span>
            <div className="flex space-x-1.5">
              {['BTCUSD', 'ETHUSD'].map((sym) => (
                <button
                  key={sym}
                  id={`select-symbol-${sym}`}
                  onClick={() => {
                    setActiveSymbol(sym);
                    setLimitPrice('');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                    activeSymbol === sym
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            {currentTicker ? (
              <>
                <div className="flex items-baseline space-x-2">
                  <span className="text-slate-400">Mark:</span>
                  <span className="text-base font-bold text-slate-100">
                    ${Number(currentTicker.mark_price || currentTicker.close).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded border text-[11px] ${
                    isPositiveChange
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {isPositiveChange ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{currentTicker.mark_change_24h}% (24h)</span>
                </div>
                <div className="hidden sm:flex items-center space-x-2 text-slate-400 text-[11px]">
                  <span>Bid: ${currentTicker.quotes?.best_bid || '—'}</span>
                  <span>/</span>
                  <span>Ask: ${currentTicker.quotes?.best_ask || '—'}</span>
                </div>
              </>
            ) : (
              <span className="text-slate-500 flex items-center space-x-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Connecting to Delta Exchange...</span>
              </span>
            )}

            <button
              id="refresh-market-btn"
              onClick={() => {
                setIsRefreshing(true);
                fetchMarketData().finally(() => setIsRefreshing(false));
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh live Delta data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* L2 Orderbook Depth Mini-Strip */}
        {orderbook && (
          <div className="mt-3 pt-2 grid grid-cols-2 gap-4 text-[11px] font-mono">
            <div>
              <span className="text-emerald-400 font-semibold mb-1 block">Bids (Buy Depth)</span>
              <div className="space-y-0.5">
                {orderbook.buy?.slice(0, 3).map((b, i) => (
                  <div key={i} className="flex justify-between text-slate-300">
                    <span className="text-emerald-300">${b.price}</span>
                    <span className="text-slate-400">{b.size} contracts</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="text-rose-400 font-semibold mb-1 block">Asks (Sell Depth)</span>
              <div className="space-y-0.5">
                {orderbook.sell?.slice(0, 3).map((a, i) => (
                  <div key={i} className="flex justify-between text-slate-300">
                    <span className="text-rose-300">${a.price}</span>
                    <span className="text-slate-400">{a.size} contracts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Live Technical Indicators Bar (Phase 5 Indicator Engine) */}
        {indicatorSnapshot && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-3">
              {/* Technical Score Badge */}
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-sans">Bias:</span>
                <span
                  className={`font-bold ${
                    indicatorSnapshot.technical_score >= 15
                      ? 'text-emerald-400'
                      : indicatorSnapshot.technical_score <= -15
                      ? 'text-rose-400'
                      : 'text-slate-300'
                  }`}
                >
                  {indicatorSnapshot.technical_bias.replace('_', ' ')} (
                  {indicatorSnapshot.technical_score > 0
                    ? `+${indicatorSnapshot.technical_score}`
                    : indicatorSnapshot.technical_score}
                  )
                </span>
              </div>

              {/* EMA 9 / 20 */}
              <div className="flex items-center space-x-1 text-slate-300">
                <span className="text-slate-500">EMA(9/20):</span>
                <span className="text-emerald-400">${indicatorSnapshot.ema.ema_fast?.toLocaleString() ?? '—'}</span>
                <span className="text-slate-500">/</span>
                <span className="text-cyan-400">${indicatorSnapshot.ema.ema_slow?.toLocaleString() ?? '—'}</span>
                <span className="text-slate-400 text-[11px]">({indicatorSnapshot.ema.trend})</span>
              </div>

              {/* VWAP */}
              <div className="flex items-center space-x-1 text-slate-300">
                <span className="text-slate-500">VWAP:</span>
                <span className="text-purple-300">${indicatorSnapshot.vwap.vwap?.toLocaleString() ?? '—'}</span>
                <span
                  className={`text-[11px] ${
                    indicatorSnapshot.vwap.distance_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ({indicatorSnapshot.vwap.distance_pct >= 0 ? `+${indicatorSnapshot.vwap.distance_pct}%` : `${indicatorSnapshot.vwap.distance_pct}%`})
                </span>
              </div>

              {/* MACD */}
              <div className="flex items-center space-x-1 text-slate-300">
                <span className="text-slate-500">MACD:</span>
                <span
                  className={`font-semibold ${
                    (indicatorSnapshot.macd.histogram ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {(indicatorSnapshot.macd.histogram ?? 0) > 0 ? `+${indicatorSnapshot.macd.histogram?.toFixed(2)}` : indicatorSnapshot.macd.histogram?.toFixed(2)}
                </span>
              </div>
            </div>

            {/* S/R Proximity */}
            {indicatorSnapshot.support_resistance && (
              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <span>
                  S: <span className="text-emerald-400 font-semibold">${indicatorSnapshot.support_resistance.nearest_support?.toLocaleString() ?? '—'}</span>
                </span>
                <span>
                  R: <span className="text-rose-400 font-semibold">${indicatorSnapshot.support_resistance.nearest_resistance?.toLocaleString() ?? '—'}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: Parameters & Interactive Execution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Configuration Panel */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Futures Trading Parameters (Frontend Configurable)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Real-time Constraints</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Instrument Selection */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Active Perpetual Instruments
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableInstruments.map((sym) => {
                    const isChecked = selectedInstruments.includes(sym);
                    return (
                      <button
                        key={sym}
                        id={`instrument-select-${sym}`}
                        onClick={() => toggleInstrument(sym)}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                          isChecked
                            ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <CheckSquare className={`w-3.5 h-3.5 ${isChecked ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span>{sym}-PERP</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Leverage Slider & Value */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-300">Default Leverage</label>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    {leverage}x
                  </span>
                </div>
                <input
                  id="futures-leverage-slider"
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>1x</span>
                  <span>Default: 50x</span>
                  <span>100x</span>
                </div>
              </div>

              {/* TP & SL Deterministic Targets */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Take Profit & Stop Loss (Deterministic)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-400">TP (Price Move %)</span>
                    <div className="mt-1 relative">
                      <input
                        id="futures-tp-input"
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="50"
                        value={tpPct}
                        onChange={(e) => setTpPct(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-slate-400 font-mono">%</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">SL (Price Move %)</span>
                    <div className="mt-1 relative">
                      <input
                        id="futures-sl-input"
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        value={slPct}
                        onChange={(e) => setSlPct(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-rose-500"
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-slate-400 font-mono">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Positions & Orders Tables */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Open Positions ({positions.length})
                </h4>
              </div>
              {positions.length > 0 && (
                <button
                  id="close-all-positions-btn"
                  onClick={handleCloseAllPositions}
                  className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 text-[11px] font-mono transition-colors"
                >
                  Emergency Close All
                </button>
              )}
            </div>

            {positions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 font-mono">
                No active open positions.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="pb-2">Symbol</th>
                      <th className="pb-2">Size</th>
                      <th className="pb-2">Entry Price</th>
                      <th className="pb-2">Margin</th>
                      <th className="pb-2">Liquidation</th>
                      <th className="pb-2">PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {positions.map((pos, idx) => (
                      <tr key={idx} className="text-slate-200">
                        <td className="py-2.5 font-bold text-emerald-400">{pos.product_symbol}</td>
                        <td className="py-2.5">{pos.size > 0 ? `+${pos.size}` : pos.size}</td>
                        <td className="py-2.5">${pos.entry_price}</td>
                        <td className="py-2.5">${pos.margin}</td>
                        <td className="py-2.5 text-rose-400">${pos.liquidation_price}</td>
                        <td className="py-2.5 text-slate-300">{pos.unrealized_pnl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Delta Order Execution */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Delta Order Execution (Live / Paper)
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                {activeSymbol}
              </span>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-4">
              {/* Side Selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="order-side-buy"
                  onClick={() => setOrderSide('buy')}
                  className={`py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                    orderSide === 'buy'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  BUY / LONG
                </button>
                <button
                  type="button"
                  id="order-side-sell"
                  onClick={() => setOrderSide('sell')}
                  className={`py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                    orderSide === 'sell'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  SELL / SHORT
                </button>
              </div>

              {/* Order Type */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="order-type-market"
                  onClick={() => setOrderType('market_order')}
                  className={`py-1.5 rounded text-xs font-mono transition-colors ${
                    orderType === 'market_order'
                      ? 'bg-slate-700 text-slate-100 border border-slate-600'
                      : 'bg-slate-800/60 text-slate-400 border border-slate-800'
                  }`}
                >
                  Market Order
                </button>
                <button
                  type="button"
                  id="order-type-limit"
                  onClick={() => setOrderType('limit_order')}
                  className={`py-1.5 rounded text-xs font-mono transition-colors ${
                    orderType === 'limit_order'
                      ? 'bg-slate-700 text-slate-100 border border-slate-600'
                      : 'bg-slate-800/60 text-slate-400 border border-slate-800'
                  }`}
                >
                  Limit Order
                </button>
              </div>

              {/* Size Input */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Order Size (Contracts)</span>
                  <span className="text-[11px] text-slate-400 font-mono">1 contract = 0.001 BTC</span>
                </div>
                <input
                  id="order-size-input"
                  type="number"
                  min="1"
                  max="1000"
                  value={orderSize}
                  onChange={(e) => setOrderSize(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Limit Price Input if Limit Order */}
              {orderType === 'limit_order' && (
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Limit Price (USD)</label>
                  <input
                    id="limit-price-input"
                    type="text"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 67500.00"
                    required
                  />
                </div>
              )}

              {/* Bracket Summary Preview */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Attached Bracket TP (+{tpPct}%):</span>
                  <span className="text-emerald-400">
                    $
                    {(
                      Number(tickers[activeSymbol]?.mark_price || limitPrice || 67000) *
                      (orderSide === 'buy' ? 1 + tpPct / 100 : 1 - tpPct / 100)
                    ).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Attached Bracket SL (-{slPct}%):</span>
                  <span className="text-rose-400">
                    $
                    {(
                      Number(tickers[activeSymbol]?.mark_price || limitPrice || 67000) *
                      (orderSide === 'buy' ? 1 - slPct / 100 : 1 + slPct / 100)
                    ).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Isolated Margin (~{leverage}x):</span>
                  <span className="text-slate-200">~$2.40 USD</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="submit-order-btn"
                disabled={isSubmittingOrder}
                className={`w-full py-2.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center space-x-2 ${
                  orderSide === 'buy'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-rose-500 hover:bg-rose-400 text-white shadow-md shadow-rose-500/20'
                } ${isSubmittingOrder ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isSubmittingOrder ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing with HMAC-SHA256...</span>
                  </>
                ) : (
                  <>
                    <span>
                      EXECUTE {orderSide.toUpperCase()} {orderSize} {activeSymbol}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {/* Order Feedback Alert */}
              {orderFeedback && (
                <div
                  className={`p-2.5 rounded-lg text-[11px] font-mono border ${
                    orderFeedback.includes('successfully')
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {orderFeedback}
                </div>
              )}
            </form>
          </div>

          {/* Resting Orders Box */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Resting Orders ({orders.length})
              </span>
              {orders.length > 0 && (
                <button
                  onClick={handleCancelAllOrders}
                  className="text-[10px] font-mono text-rose-400 hover:underline"
                >
                  Cancel All
                </button>
              )}
            </div>
            {orders.length === 0 ? (
              <div className="text-[11px] text-slate-500 font-mono py-2">No resting limit orders</div>
            ) : (
              <div className="space-y-1.5">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="p-2 rounded bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <span className={o.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}>
                        {o.side.toUpperCase()}
                      </span>{' '}
                      <span>
                        {o.size} {o.product_symbol} @ ${o.limit_price || 'MKT'}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                      {o.state}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trade Lifecycle Protocol & Live Decisions */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-medium text-slate-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Strict 7-State Trade Lifecycle Protocol (Phase 7 Orchestrator)</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            100% Deterministic Risk Invariant
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
            1. SIGNAL_GENERATED
          </span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
            2. VALIDATING
          </span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
            3. LLM_CONFIRMED
          </span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
            4. RISK_VALIDATED
          </span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
            5. ORDER_SUBMITTED
          </span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-emerald-400">
            6. POSITION_OPEN
          </span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
            7. EXITED
          </span>
        </div>

        {/* Live Decisions Quick Table */}
        {recentTrades.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Recent Trade Decisions &amp; Progression ({recentTrades.length})
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {recentTrades.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">#{t.id}</span>
                      <span className="text-slate-300">{t.symbol}</span>
                      <span
                        className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                          t.direction.toLowerCase() === 'long'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {t.direction.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      SL: ${t.stop_loss_price} • TP: ${t.take_profit_price} • {t.suggested_size} ct
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {t.state}
                    </span>

                    {!['EXITED', 'REJECTED_RISK', 'CANCELLED'].includes(t.state) && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleStepTrade(t.id)}
                          disabled={activeActionTradeId === t.id}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[10px] border border-slate-700 transition-colors"
                          title="Advance 1 step"
                        >
                          Step
                        </button>
                        {t.state !== 'POSITION_OPEN' && (
                          <button
                            onClick={() => handleAutoExecuteTrade(t.id)}
                            disabled={activeActionTradeId === t.id}
                            className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-[10px] border border-emerald-700/50 flex items-center space-x-0.5 transition-colors"
                            title="Auto execute to position open"
                          >
                            <Play className="w-2.5 h-2.5" />
                            <span>Auto</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
