// ========================================
// USER & AUTHENTICATION TYPES
// ========================================

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  isAdmin: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress: string;
  userAgent: string;
}

// ========================================
// CAPITAL.COM INTEGRATION TYPES
// ========================================

export interface CapitalComCredentials {
  id: string;
  userId: string;
  identifier: string; // username
  password: string; // encrypted
  apiKey: string; // encrypted
  isEncrypted: boolean;
  encryptionVersion: number;
  createdAt: Date;
  updatedAt: Date;
  lastUsed: Date | null;
}

export interface CapitalComAccount {
  id: string;
  userId: string;
  accountId: string;
  brokerName: string;
  accountType: 'LIVE' | 'DEMO';
  currency: string;
  isLive: boolean;
  connectedAt: Date;
  disconnectedAt: Date | null;
  isActive: boolean;
}

export interface AccountSnapshot {
  id: string;
  accountId: string;
  userId: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  usedMargin: number;
  marginLevel: number;
  openPositionsCount: number;
  pendingOrdersCount: number;
  totalProfit: number;
  totalLoss: number;
  timestamp: Date;
}

export interface Position {
  id: string;
  accountId: string;
  userId: string;
  positionId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  openTime: Date;
  closeTime: Date | null;
  isClosed: boolean;
  commission: number;
  notes?: string;
}

export interface Order {
  id: string;
  accountId: string;
  userId: string;
  orderId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'STOP';
  status: 'PENDING' | 'ACCEPTED' | 'EXECUTED' | 'CANCELLED' | 'REJECTED';
  volume: number;
  openPrice: number;
  limitPrice?: number;
  stopPrice?: number;
  createTime: Date;
  executeTime?: Date;
  notes?: string;
}

// ========================================
// MARKET DATA TYPES
// ========================================

export interface MarketPrice {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
  trend: 'up' | 'down' | 'neutral';
  marketStatus: 'open' | 'closed' | 'pre-market' | 'after-hours';
  lastUpdated: Date;
  source: 'TWELVEDATA' | 'FALLBACK';
}

export interface PriceCache {
  id: string;
  symbol: string;
  price: number;
  change24h: number;
  cachedAt: Date;
  expiresAt: Date;
}

// ========================================
// TRADING & ANALYSIS TYPES
// ========================================

export interface AIAnalysis {
  id: string;
  userId: string;
  symbol: string;
  timeframe: string;
  analysisType: 'SMC' | 'ICT' | 'INSTITUTIONAL';
  
  // HTF Analysis
  htfStatus: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  htfTrendConfirmation: boolean;
  
  // SMT (Smart Money Tactics)
  smtStatus: 'CONFIRMED' | 'PENDING' | 'INVALID';
  liquiditySweeps: string[];
  orderBlocks: string[];
  fairValueGaps: string[];
  
  // Trend Shift (TS)
  trendShift: 'CONFIRMED' | 'PENDING';
  breakOfStructure: boolean;
  changeOfCharacter: boolean;
  
  // CISD (Confirmation In Supply/Demand)
  cisdConfirmation: 'CONFIRMED' | 'PENDING' | 'NONE';
  supplyZones: number[];
  demandZones: number[];
  
  // Entry Setup
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  liquidityTarget: number;
  riskReward: number;
  
  // Analysis Details
  marketBias: string;
  trend: string;
  liquidityDirection: string;
  entryReason: string;
  exitReason: string;
  expectedMove: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceScore: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  isValid: boolean;
}

export interface TradingSignal {
  id: string;
  userId: string;
  analysisId: string;
  symbol: string;
  signalType: 'BUY' | 'SELL' | 'HOLD';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  confidenceScore: number;
  status: 'ACTIVE' | 'CLOSED' | 'EXPIRED';
  createdAt: Date;
  closedAt?: Date;
}

export interface Trade {
  id: string;
  userId: string;
  accountId: string;
  signalId?: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  entryTime: Date;
  exitPrice?: number;
  exitTime?: Date;
  stopLoss: number;
  takeProfit: number;
  volume: number;
  pnl?: number;
  pnlPercent?: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// JOURNAL & ANALYTICS TYPES
// ========================================

export interface JournalEntry {
  id: string;
  userId: string;
  tradeId?: string;
  title: string;
  content: string;
  mood?: 'EXCELLENT' | 'GOOD' | 'NEUTRAL' | 'BAD' | 'TERRIBLE';
  lessonsLearned?: string[];
  improvements?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyPerformance {
  id: string;
  userId: string;
  date: Date;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  successfulPips: number;
  lostPips: number;
  largestWin: number;
  largestLoss: number;
  averageRiskReward: number;
  summary?: string;
  createdAt: Date;
}

// ========================================
// NOTIFICATION TYPES
// ========================================

export interface NotificationSettings {
  id: string;
  userId: string;
  
  // Email Settings
  emailAddress: string;
  emailVerified: boolean;
  emailEnabled: boolean;
  
  // Email Alert Types
  emailAlerts: {
    tradeEntry: boolean;
    takeProfitHit: boolean;
    stopLossHit: boolean;
    aiSignals: boolean;
    marketAlerts: boolean;
    dailyReport: boolean;
    weeklyReport: boolean;
  };
  
  // Telegram Settings
  telegramChatId?: string;
  telegramEnabled: boolean;
  
  // Push Notifications
  pushEnabled: boolean;
  
  // Do Not Disturb
  dndEnabled: boolean;
  dndStart?: string; // HH:mm
  dndEnd?: string;   // HH:mm
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'EMAIL' | 'TELEGRAM' | 'PUSH';
  category: 'TRADE' | 'ALERT' | 'REPORT' | 'SYSTEM';
  title: string;
  message: string;
  data?: Record<string, any>;
  sent: boolean;
  sentAt?: Date;
  error?: string;
  createdAt: Date;
}

// ========================================
// AUDIT & LOGGING TYPES
// ========================================

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILURE';
  error?: string;
  createdAt: Date;
}

export interface SystemLog {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  service: string;
  message: string;
  data?: Record<string, any>;
  stackTrace?: string;
  createdAt: Date;
}

// ========================================
// API RESPONSE TYPES
// ========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  requestId: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId: string;
}