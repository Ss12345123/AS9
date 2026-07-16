export type ScalpingMode = 'ULTRA_SCALPING' | 'FAST_SCALPING' | 'INTRADAY' | 'SWING' | 'POSITION';

export interface ScalpingSettings {
  timeframe: string;
  maxSpread: number; // in pips/points
  maxSimultaneousPositions: number;
  riskPercentage: number;
  lotSize: number;
  maxDrawdown: number; // in percentage of account balance
  takeProfit: number; // in pips/points
  stopLoss: number; // in pips/points
  trailingStop: boolean;
  trailingStopDistance: number; // in pips/points
  breakEven: boolean;
  breakEvenTrigger: number; // in pips/points
  partialTP: boolean;
  partialClosePercentage: number;
  partialTPTrigger: number; // in pips/points
  sessions: {
    london: boolean;
    newyork: boolean;
    asia: boolean;
  };
  newsFilter: boolean;
  // Advanced Settings
  lotType: 'FIXED' | 'DYNAMIC';
  maxSlippage: number; // in pips
  maxAveragingOrders: number;
  averagingDistance: number; // in pips
  averagingMultiplier: number;
  averagingLotType: 'FIXED' | 'DYNAMIC';
  disableAveragingOnReversal: boolean;
}

export interface ScalpingModeConfig {
  mode: ScalpingMode;
  name: string;
  description: string;
  settings: ScalpingSettings;
}

export interface AIConfidenceMetrics {
  entry: number; // 0-100
  exit: number; // 0-100
  risk: number; // 0-100
  trendStrength: number; // 0-100
  volatility: number; // 0-100
  overall: number; // 0-100
}

export interface AIAnalysisDetails {
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  marketStructure: 'BULLISH_HH_HL' | 'BEARISH_LH_LL' | 'RANGING';
  liquidity: 'SWEPT_BUY_SIDE' | 'SWEPT_SELL_SIDE' | 'BUILDING_POOLS';
  supportResistance: string; // e.g., "S: $2340, R: $2375"
  supplyDemand: string; // e.g., "Demand Zone: $2335-$2342"
  volume: 'HIGH_ACCUMULATION' | 'LOW_PARTICIPATION' | 'SELLING_CLIMAX';
  atr: number;
  rsi: number;
  macd: 'BULLISH_CROSSOVER' | 'BEARISH_CROSSOVER' | 'DIVERGENT';
  ema: 'EMA_20_ABOVE_200' | 'EMA_20_BELOW_200' | 'COMPRESSED';
  vwap: 'PRICED_ABOVE_VWAP' | 'PRICED_BELOW_VWAP' | 'CONVERGING';
  orderBlocks: string; // e.g., "Bullish OB at $2345"
  fvg: 'UNMITIGATED_BULLISH' | 'UNMITIGATED_BEARISH' | 'FULLY_MITIGATED';
  bos: 'CONFIRMED' | 'NONE';
  choch: 'CONFIRMED' | 'NONE';
  reasoning: string;
}

export interface ScalpingTradeSignal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  mode: ScalpingMode;
  timestamp: string;
  confidence: AIConfidenceMetrics;
  analysis: AIAnalysisDetails;
}

export interface ScalpingPosition {
  dealId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  openLevel: number;
  currentLevel: number;
  size: number;
  stopLevel: number;
  profitLevel: number;
  profitLoss: number;
  createdDate: string;
  mode: ScalpingMode;
  confidence: number;
  averagingLevels: number; // how many levels have been added
  isRecoveryActive: boolean;
  status: 'ACTIVE' | 'PARTIAL_CLOSED' | 'CLOSED';
  lastAveragingTime?: string;
  aiReasoning?: string;
}

export interface ScalpingGlobalState {
  currentMode: ScalpingMode;
  isEngineActive: boolean;
  dailyLossLimit: number; // Hard USD amount
  dailyProfitTarget: number; // Hard USD amount
  maxOpenPositions: number;
  maxRiskPerTrade: number; // %
  maxAccountExposure: number; // %
  consecutiveLossesLimit: number;
  tradingPauseDurationHours: number;
  
  // Realtime Status tracking
  todayProfitLoss: number;
  todayDrawdown: number;
  consecutiveLosses: number;
  isTradingPaused: boolean;
  pauseEndTime: string | null;
  recoveryModeActive: boolean;
}

export interface ScalpingBacktestResult {
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  averageRR: number;
  totalTrades: number;
  wins: number;
  losses: number;
  netProfit: number;
  monthlyPerformance: { month: string; profit: number }[];
  trades: {
    id: string;
    symbol: string;
    type: 'BUY' | 'SELL';
    entryPrice: number;
    exitPrice: number;
    profit: number;
    pips: number;
    entryTime: string;
    exitTime: string;
    outcome: 'WIN' | 'LOSS';
    mode: ScalpingMode;
    averagingCount: number;
    aiDecision: string;
  }[];
  equityCurve: { time: string; balance: number }[];
}
