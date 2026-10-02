/**
 * Delta Bot V2 - Shared Frontend Types
 */

export type TradingDomain = 'futures' | 'options' | 'trend_ai' | 'portfolio';

export interface HealthData {
  status: string;
  app_name: string;
  version: string;
  timestamp: string;
  phase: string;
}

export interface DomainInfo {
  name: string;
  active: boolean;
  credentials_configured: boolean;
  max_active_positions_per_instrument?: number;
  default_leverage?: number;
  default_tp_pct?: number;
  default_sl_pct?: number;
  subaccount_isolated?: boolean;
  status?: string;
}

export interface CapitalProfile {
  initial_wallet_inr: number;
  initial_wallet_usd: number;
  max_exposure_pct: number;
  safety_reserve_pct: number;
}

export interface SystemStatusData {
  status: string;
  environment: string;
  paper_trading: boolean;
  bot_active: boolean;
  domains: {
    futures: DomainInfo;
    options: DomainInfo;
  };
  instruments: string[];
  timeframes: string[];
  capital_profile: CapitalProfile;
  timestamp: string;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  logger: string;
  message: string;
  module: string;
  line: number;
}

export interface EMAResult {
  ema_fast: number | null;
  ema_slow: number | null;
  fast_period: number;
  slow_period: number;
  trend: string;
  price_position: string;
  spread_pct: number;
  fast_slope: number;
  slow_slope: number;
}

export interface MACDResult {
  macd_line: number | null;
  signal_line: number | null;
  histogram: number | null;
  fast_period: number;
  slow_period: number;
  signal_period: number;
  crossover: string;
  zero_line_position: string;
  momentum_state: string;
}

export interface VWAPResult {
  vwap: number | null;
  upper_band_1: number | null;
  upper_band_2: number | null;
  lower_band_1: number | null;
  lower_band_2: number | null;
  std_dev: number;
  distance_pct: number;
  bias: string;
}

export interface PivotLevels {
  pivot: number;
  r1: number;
  s1: number;
  r2: number;
  s2: number;
  r3: number;
  s3: number;
  r4?: number;
  s4?: number;
}

export interface PivotPointsResult {
  standard: PivotLevels;
  fibonacci: PivotLevels;
  camarilla: PivotLevels;
  nearest_support: number | null;
  nearest_resistance: number | null;
  support_distance_pct: number | null;
  resistance_distance_pct: number | null;
}

export interface SRZone {
  price: number;
  level_type: string;
  touches: number;
  strength: number;
}

export interface SupportResistanceResult {
  nearest_support: number | null;
  nearest_resistance: number | null;
  support_distance_pct: number | null;
  resistance_distance_pct: number | null;
  zones: SRZone[];
  proximity_status: string;
}

export interface IndicatorSnapshot {
  symbol: string;
  timeframe: string;
  timestamp: number;
  current_price: number;
  candle_count: number;
  ema: EMAResult;
  macd: MACDResult;
  vwap: VWAPResult;
  pivots: PivotPointsResult;
  support_resistance: SupportResistanceResult;
  technical_score: number;
  technical_bias: string;
  summary_reasons: string[];
}

export interface AccountCapitalStatus {
  currency: string;
  total_equity: number;
  available_margin: number;
  blocked_margin: number;
  reserve_buffer_pct: number;
  reserve_buffer_amount: number;
  usable_trading_capital: number;
  current_exposure_pct: number;
  max_exposure_pct: number;
  max_risk_per_trade_pct: number;
  max_risk_per_trade_amount: number;
  daily_drawdown_pct: number;
  daily_drawdown_limit_pct: number;
  circuit_breaker_active: boolean;
}

export interface RiskValidationResult {
  is_approved: boolean;
  rejection_reasons: string[];
  risk_warnings: string[];
  calculated_size: number;
  required_margin: number;
  dollar_risk: number;
  dollar_risk_pct: number;
  risk_reward_ratio: number;
  single_position_passed: boolean;
  reserve_buffer_passed: boolean;
  max_exposure_passed: boolean;
  liquidation_buffer_passed: boolean;
  circuit_breaker_passed: boolean;
  estimated_liquidation_price?: number;
  liquidation_buffer_pct?: number;
  llm_guardrail_confirmed: boolean;
  details?: Record<string, unknown>;
}

export interface TradeLifecycleItem {
  id: number;
  symbol: string;
  direction: string;
  subaccount: string;
  state: string;
  entry_price: number | null;
  exit_price: number | null;
  stop_loss_price: number;
  take_profit_price: number;
  initial_stop_loss?: number;
  trailing_stop_loss?: number;
  tp1_price?: number;
  tp1_hit?: boolean;
  tp2_price?: number;
  tp2_hit?: boolean;
  breakeven_ratchet_active?: boolean;
  peak_favorable_price?: number;
  current_r_multiple?: number;
  unrealized_pnl?: number;
  candles_held?: number;
  max_holding_candles?: number;
  staleness_warning?: boolean;
  suggested_size: number;
  remaining_size?: number;
  leverage: number;
  is_paper: boolean;
  llm_approved: boolean | null;
  risk_approved: boolean | null;
  risk_notes: string | null;
  realized_pnl: number | null;
  exit_reason: string | null;
  created_at: string;
  updated_at?: string;
}

export interface DynamicBracketRules {
  breakeven_trigger_r: number;
  tp1_trigger_r: number;
  tp1_close_ratio: number;
  tp2_trigger_r: number;
  trailing_trail_pct: number;
  max_holding_candles: number;
  staleness_exit_enabled: boolean;
}

export interface RatchetEvent {
  trade_id: number;
  symbol: string;
  event_type: 'BREAKEVEN_LOCKED' | 'TP1_HIT' | 'TRAILING_STOP_ADVANCED' | 'STALENESS_WARNING' | 'TP2_HIT' | 'STOP_HIT';
  message: string;
  price: number;
  new_stop_price?: number;
  r_multiple: number;
  timestamp: string;
}

export interface KillSwitchResult {
  success: boolean;
  message: string;
  cancelled_orders_count: number;
  closed_positions_count: number;
  affected_trades: number[];
}

export interface WebSocketFeedStats {
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  endpoint: string;
  subscribed_channels: string[];
  messages_received: number;
  messages_per_sec: number;
  last_heartbeat: string | null;
  uptime_seconds: number;
  connected_clients: number;
  latency_ms: number;
  reconnect_count: number;
}

export interface OrderBookSnapshot {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
  spread: number;
  mid_price: number;
}

// Phase 8: Multi-Timeframe Trend & LLM Advisory
export interface TimeframeTrend {
  timeframe: string;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number;
  ema_status: string;
  macd_status: string;
  vwap_status: string;
}

export interface TrendConfluenceResult {
  symbol: string;
  macro_1h: TimeframeTrend;
  structural_15m: TimeframeTrend;
  tactical_5m: TimeframeTrend;
  confluence_state: 'FULL_BULLISH' | 'FULL_BEARISH' | 'PARTIAL_BULLISH' | 'PARTIAL_BEARISH' | 'CONFLICTED' | 'NEUTRAL';
  confluence_score: number;
  recommended_action: 'STRONG_BUY' | 'BUY' | 'WAIT' | 'SELL' | 'STRONG_SELL';
  alignment_pct: number;
  timestamp: string;
}

export interface MarketRegimeAnalysis {
  symbol: string;
  regime: 'TRENDING_BULLISH' | 'TRENDING_BEARISH' | 'RANGE_BOUND' | 'HIGH_VOLATILITY_EXPANSION' | 'COMPRESSION';
  confidence: number;
  advisory_recommendation: string;
  recommended_action: 'LONG' | 'SHORT' | 'HOLD' | 'REDUCE_RISK';
  key_risks: string[];
  suggested_strategy: string;
  is_ai_generated: boolean;
  analyzed_at: string;
}

// Phase 11: Options Domain Engine
export type OptionSpreadType =
  | 'BULL_CALL_DEBIT'
  | 'BEAR_PUT_DEBIT'
  | 'BULL_PUT_CREDIT'
  | 'BEAR_CALL_CREDIT'
  | 'IRON_CONDOR'
  | 'LONG_STRADDLE';

export interface OptionLeg {
  symbol: string;
  strike: number;
  type: 'CALL' | 'PUT';
  action: 'BUY' | 'SELL';
  price: number;
  delta: number;
  contracts: number;
}

export interface SpreadSimulationResult {
  spread_type: OptionSpreadType;
  underlying: string;
  spot_price: number;
  legs: OptionLeg[];
  net_premium: number;
  max_profit: number;
  max_loss: number;
  risk_reward_ratio: number;
  breakeven_prices: number[];
  net_greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
  is_defined_risk: boolean;
  subaccount_margin_required: number;
  margin_approved: boolean;
  notes: string;
  payoff_points: { price: number; pnl: number }[];
}

export interface OptionsPosition {
  id: number;
  spread_type: OptionSpreadType;
  underlying: string;
  legs: OptionLeg[];
  entry_spot: number;
  net_premium: number;
  max_profit: number;
  max_loss: number;
  breakeven: number[];
  current_pnl: number;
  status: 'OPEN' | 'CLOSED' | 'EXPIRED';
  opened_at: string;
}

// Phase 12: Integrated Portfolio Dashboard & Live P&L Aggregator
export interface PortfolioEquityPoint {
  timestamp: string;
  equity: number;
  realized_pnl: number;
  drawdown_pct: number;
  high_water_mark: number;
}

export interface PortfolioAnalytics {
  initial_capital: number;
  total_equity: number;
  net_realized_pnl: number;
  unrealized_pnl: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_pct: number;
  profit_factor: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  average_r_multiple: number;
  safety_reserve_amount: number;
  available_margin: number;
  last_updated: string;
}
