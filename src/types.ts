export interface MarketPrice {
  symbol: string;
  price: number;
  change24h: number;
  trend: 'up' | 'down' | 'neutral';
  spread: number;
  marketStatus: 'open' | 'closed';
  lastUpdated: string;
}

export interface SmartMoneySignal {
  symbol: string;
  type: 'BUY' | 'SELL';
  timeframe: string;
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  liquidityTarget: number;
  riskReward: number;
  strength: number; // /100
  confidence: number; // %
  htfStatus: 'BULLISH' | 'BEARISH' | 'CONSOLIDATION';
  smtStatus: 'CONFIRMED' | 'DIVERGENT' | 'NONE';
  trendShift: 'CONFIRMED' | 'PENDING';
  cisdConfirmation: 'CONFIRMED' | 'NONE';
  
  // AI reasoning
  marketBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  trend: string;
  liquidityDirection: string;
  entryReason: string;
  exitReason: string;
  expectedMove: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceScore: number;

  // Smart Money Tools status
  buySideLiquidity: 'SWEPT' | 'INTACT';
  sellSideLiquidity: 'SWEPT' | 'INTACT';
  equalHighs: 'DETECTED' | 'NONE';
  equalLows: 'DETECTED' | 'NONE';
  fvg: 'MITIGATED' | 'UNMITIGATED' | 'NONE';
  orderBlocks: 'BULLISH_OB' | 'BEARISH_OB' | 'NONE';
  bos: 'CONFIRMED' | 'NONE';
  choch: 'CONFIRMED' | 'NONE';
}

export interface EconomicEvent {
  id: string;
  country: string; // e.g. "US", "EU", "GB", "JP"
  institution: string; // e.g. "Federal Reserve"
  centralBank: string; // e.g. "Federal Reserve"
  speakerName?: string; // e.g. "Jerome Powell"
  eventName: string; // e.g. "FOMC Statement & Press Conference"
  eventTime: string; // ISO timestamp
  impact: 'low' | 'medium' | 'high';
  shortDescription: string;
}

export interface ActiveSignalInstance {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  currentPrice: number;
  profitPips: number;
  status: 'active' | 'tp1_hit' | 'tp2_hit' | 'tp3_hit' | 'sl_hit';
  timestamp: string;
  volume?: number;
}

export interface TradeHistoryItem {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  profit: number; // USD
  pips: number;
  entryTime: string;
  exitTime: string;
  duration: string;
  outcome: 'WIN' | 'LOSS';
}

export interface NotificationItem {
  id: string;
  type: 'signal' | 'news' | 'tp_sl' | 'ai';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  impact?: 'low' | 'medium' | 'high';
}

export interface UserProfile {
  email: string;
  fullName: string;
  username: string;
  avatarUrl: string;
  balance: number;
  winRate: number;
  dailyProfit: number;
  weeklyProfit: number;
  monthlyProfit: number;
}

export interface SystemSettings {
  riskTolerance: 'low' | 'medium' | 'high';
  enableAudioAlerts: boolean;
  enablePushNotifications: boolean;
  tradingVolume: number; // lots
  preferredLanguage: string;
  apiKeyOverride?: string;
  enableAutoTrading: boolean;
  emergencyStop: boolean;
  maxOpenPositions: number;
  maxLotSize: number;
  riskPercentage: number;
  enableBreakEven?: boolean;
  breakEvenTrigger?: number;
  enableTrailingStop?: boolean;
  trailingStopDistance?: number;
  enablePartialTP?: boolean;
  partialClosePercentage?: number;
  partialTPTrigger?: number;
}

export interface EmailNotificationSettings {
  email: string;
  isVerified: boolean;
  isEnabled: boolean;
  options: {
    tradeEntrySignal: boolean;
    takeProfitHit: boolean;
    stopLossHit: boolean;
    newAiTradingOpportunity: boolean;
    highImpactNews: boolean;
    federalReserveSpeeches: boolean;
    centralBankSpeeches: boolean;
    cpi: boolean;
    ppi: boolean;
    nfp: boolean;
    fomc: boolean;
    interestRateDecisions: boolean;
    marketVolatilityAlerts: boolean;
    liquiditySweepDetected: boolean;
    htfTrendChange: boolean;
    smtConfirmation: boolean;
    cisdConfirmation: boolean;
    tradingSessionOpen: boolean;
    dailyMarketSummary: boolean;
    weeklyPerformanceReport: boolean;
  };
}


