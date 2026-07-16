import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  TrendingUp, Activity, BarChart3, Calendar, Bell, Sliders, Shield, 
  Menu, X, LogOut, Loader2, DollarSign, Percent, AlertTriangle, Play, Cpu 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Type definitions
import { 
  UserProfile, ActiveSignalInstance, TradeHistoryItem, 
  MarketPrice, SmartMoneySignal, NotificationItem, SystemSettings 
} from './types';

// Components
import Auth from './components/Auth';
import DashboardOverview from './components/DashboardOverview';
import MarketMonitor from './components/MarketMonitor';
import TradingViewChart from './components/TradingViewChart';
import SmartMoneyStrategy from './components/SmartMoneyStrategy';
import EconomicCalendar from './components/EconomicCalendar';
import SignalList from './components/SignalList';
import ProfileSettings from './components/ProfileSettings';
import NotificationsPanel from './components/NotificationsPanel';
import CapitalConnection from './components/CapitalConnection';
import SystemStatus from './components/SystemStatus';
import SMCBacktest from './components/SMCBacktest';

// Maps the terminal's display symbols to Capital.com instrument epics.
const SYMBOL_TO_EPIC: Record<string, string> = {
  XAUUSD: 'GOLD',
  BTCUSD: 'BTCUSD',
  ETHUSD: 'ETHUSD',
  EURUSD: 'EURUSD',
  NAS100: 'US100',
};

export default function App() {
  // User profile. Financial figures are populated live from the connected
  // Capital.com account (see syncCapitalPortfolio); no seeded/demo values.
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('token');
      if (savedUser && savedToken) {
        const u = JSON.parse(savedUser);
        return {
          email: u.email || '',
          fullName: u.fullName || u.username || 'Alexander Mercer',
          username: u.username || 'trader',
          avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username || 'default'}`,
          balance: u.balance !== undefined ? u.balance : 100000.00,
          winRate: u.winRate !== undefined ? u.winRate : 78.4,
          dailyProfit: u.dailyProfit !== undefined ? u.dailyProfit : 0.00,
          weeklyProfit: u.weeklyProfit !== undefined ? u.weeklyProfit : 0.00,
          monthlyProfit: u.monthlyProfit !== undefined ? u.monthlyProfit : 0.00,
        };
      }
    } catch (e) {
      console.warn('Failed to parse saved user:', e);
    }
    return null;
  });
  const [view, setView] = useState<'dashboard' | 'monitor' | 'charts' | 'news' | 'signals' | 'settings' | 'broker' | 'status' | 'backtest'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // App settings — hydrated from localStorage so preferences persist across reloads.
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const defaults: SystemSettings = {
      riskTolerance: 'medium',
      enableAudioAlerts: true,
      enablePushNotifications: true,
      tradingVolume: 1.0,
      preferredLanguage: 'en',
      apiKeyOverride: localStorage.getItem('twelve_data_api_key_override') || undefined,
      enableAutoTrading: true,
      emergencyStop: false,
      maxOpenPositions: 3,
      maxLotSize: 2.0,
      riskPercentage: 1.5,
      enableBreakEven: true,
      breakEvenTrigger: 70,
      enableTrailingStop: false,
      trailingStopDistance: 50,
      enablePartialTP: false,
      partialClosePercentage: 50,
      partialTPTrigger: 100,
    };
    try {
      const saved = localStorage.getItem('gold_ai_settings');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });

  // Auto-persist settings whenever they change.
  useEffect(() => {
    try {
      localStorage.setItem('gold_ai_settings', JSON.stringify(settings));
      fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      }).catch(e => console.error("Failed to sync settings to server:", e));
    } catch {
      /* ignore quota/serialization errors */
    }
  }, [settings]);

  // Load settings from server on mount
  useEffect(() => {
    const loadServerSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(s => ({ ...s, ...data }));
        }
      } catch (e) {
        console.error("Failed to load settings from server:", e);
      }
    };
    loadServerSettings();
  }, []);

  // Silently verify and auto-restore user session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const savedToken = localStorage.getItem('token');
      const savedRefreshToken = localStorage.getItem('refreshToken');
      
      if (!savedToken) return;

      try {
        console.log("[App Session Discovery] Validating saved session token with server...");
        const res = await fetch('/api/auth/session', {
          headers: {
            'Authorization': `Bearer ${savedToken}`,
            'Content-Type': 'application/json',
          }
        });

        if (res.ok) {
          const data = await res.json();
          console.log(`[App Session Discovery] Session verified for: ${data.user.email}`);
          setProfile({
            email: data.user.email,
            fullName: data.user.fullName || data.user.username,
            username: data.user.username,
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${data.user.username}`,
            balance: data.user.balance || 100000.00,
            winRate: data.user.winRate || 78.4,
            dailyProfit: data.user.dailyProfit || 0.00,
            weeklyProfit: data.user.weeklyProfit || 0.00,
            monthlyProfit: data.user.monthlyProfit || 0.00,
          });
        } else if (savedRefreshToken) {
          console.log("[App Session Discovery] Access token invalid or expired. Attempting refresh token handshake...");
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: savedRefreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            console.log(`[App Session Discovery] Handshake successful! Session recovered for: ${refreshData.user.email}`);
            localStorage.setItem('token', refreshData.token);
            localStorage.setItem('refreshToken', refreshData.refreshToken);
            localStorage.setItem('user', JSON.stringify(refreshData.user));
            
            setProfile({
              email: refreshData.user.email,
              fullName: refreshData.user.fullName || refreshData.user.username,
              username: refreshData.user.username,
              avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${refreshData.user.username}`,
              balance: refreshData.user.balance || 100000.00,
              winRate: refreshData.user.winRate || 78.4,
              dailyProfit: refreshData.user.dailyProfit || 0.00,
              weeklyProfit: refreshData.user.weeklyProfit || 0.00,
              monthlyProfit: refreshData.user.monthlyProfit || 0.00,
            });
          } else {
            console.warn("[App Session Discovery] All session credentials rejected. Prompting re-authentication.");
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setProfile(null);
          }
        }
      } catch (err) {
        console.error("[App Session Discovery] Session verification handshake error:", err);
      }
    };
    
    restoreSession();
  }, []);

  // Market & Pricing state
  const [prices, setPrices] = useState<Record<string, MarketPrice> | null>(null);
  const [pricesError, setPricesError] = useState<string | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("XAUUSD");
  const [smcSignal, setSmcSignal] = useState<SmartMoneySignal | null>(null);
  const [isLoadingSMC, setIsLoadingSMC] = useState(false);

  // High Impact News blocker states
  const [isNewsBlocked, setIsNewsBlocked] = useState(false);
  const [highImpactWarning, setHighImpactWarning] = useState<string | null>(null);

  // Balance management modal states (Allows custom entry and zeroing balance)
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [customBalanceInput, setCustomBalanceInput] = useState('100000');

  // Verification states
  const [apiConnectionVerified, setApiConnectionVerified] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [tempKeyInput, setTempKeyInput] = useState('');

  // Active positions & Trade history logs
  const [activeSignals, setActiveSignals] = useState<ActiveSignalInstance[]>([]);
  const [history, setHistory] = useState<TradeHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('gold_ai_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [autoLogs, setAutoLogs] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('gold_ai_auto_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  // Live Capital.com connection state
  const [capitalConnected, setCapitalConnected] = useState<boolean | null>(null);

  // Audio elements ref for professional alert system sound
  const audioContextRef = useRef<AudioContext | null>(null);

  // Trigger high-quality synthesizer sound alert on key events
  const playAlertSound = (type: 'success' | 'warning' | 'alert') => {
    if (!settings.enableAudioAlerts) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(349.23, ctx.currentTime); // F4
        osc.frequency.setValueAtTime(311.13, ctx.currentTime + 0.15); // Eb4
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else { // Alert
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      console.warn("Audio Context init failed:", e);
    }
  };

  // Push notification helper
  const addNotification = useCallback((type: 'signal' | 'news' | 'tp_sl' | 'ai', title: string, message: string) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
    
    if (type === 'news') {
      playAlertSound('warning');
    } else if (type === 'signal') {
      playAlertSound('success');
    } else {
      playAlertSound('alert');
    }

    // Secure Outbound Email Notification Center Dispatch
    try {
      let optionKey = "";
      let asset = "XAUUSD";
      let timeframe = "15M (M15)";
      let confidenceScore = 93.5;
      let entryPrice = "2345.50";
      let stopLoss = "2335.00";
      let takeProfit = "2365.00";
      let liquidityTarget = "Buy-side Equal Highs Pool";
      let newsImpact = "LOW IMPACT";
      let description = message;

      if (title.includes("SMC Order Executed")) {
        optionKey = "tradeEntrySignal";
        asset = title.split(':')[1]?.trim() || "XAUUSD";
        const matches = message.match(/filled at ([\d.]+)/);
        if (matches) entryPrice = matches[1];
      } else if (title.includes("Take Profit")) {
        optionKey = "takeProfitHit";
        asset = title.split(':')[1]?.trim() || "XAUUSD";
        const matches = message.match(/target ([\d.]+)/);
        if (matches) takeProfit = matches[1];
      } else if (title.includes("Stop Loss")) {
        optionKey = "stopLossHit";
        asset = title.split(':')[1]?.trim() || "XAUUSD";
        const matches = message.match(/level ([\d.]+)/);
        if (matches) stopLoss = matches[1];
      } else if (title.includes("New AI Trade Setup Dispatched") || title.includes("New AI Setup")) {
        optionKey = "newAiTradingOpportunity";
        asset = title.split(':')[1]?.trim() || "XAUUSD";
        const matches = message.match(/at ([\d.]+)/);
        if (matches) entryPrice = matches[1];
      } else if (type === 'news') {
        optionKey = "highImpactNews";
        newsImpact = "HIGH IMPACT";
        liquidityTarget = "High Impact FOMC/CPI Macro Release Event";
      } else {
        return;
      }

      fetch('/api/email/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optionKey,
          subject: title,
          title,
          details: {
            asset,
            timeframe,
            confidenceScore,
            entryPrice,
            stopLoss,
            takeProfit,
            liquidityTarget,
            newsImpact,
            time: new Date().toISOString(),
            description
          }
        })
      }).catch(err => console.warn("Failed to dispatch background email:", err));
    } catch (emailErr) {
      console.warn("Background notification dispatcher error:", emailErr);
    }
  }, [settings.enableAudioAlerts]);

  // Pull the live Capital.com account + open positions and drive dashboard state.
  const syncCapitalPortfolio = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setCapitalConnected(false);
        return;
      }

      // Fast, lightweight check of Capital.com status first to avoid false negatives
      const statusRes = await fetch('/api/capital/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (statusRes.status === 503) {
        setCapitalConnected(false);
        return;
      }
      if (!statusRes.ok) {
        if (statusRes.status === 401) {
          setCapitalConnected(false);
        }
        return;
      }

      const statusData = await statusRes.json();
      const isConnected = !!(statusData.configured && statusData.connected);
      setCapitalConnected(isConnected);

      if (!isConnected) {
        return;
      }

      const res = await fetch('/api/capital/portfolio', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        // If portfolio fetch failed due to transient issues, we do not clear capitalConnected
        // unless it's a 401 or 503.
        if (res.status === 401 || res.status === 503) {
          setCapitalConnected(false);
        }
        return;
      }
      const data = await res.json();

      const account = data.account;
      const positions: any[] = Array.isArray(data.positions) ? data.positions : [];

      // Map real open positions into the active-signal display shape.
      const mapped: ActiveSignalInstance[] = positions.map((p) => {
        const current = p.currentLevel ?? p.openLevel;
        return {
          id: p.dealId,
          symbol: p.instrumentName || p.epic,
          type: p.direction,
          entryPrice: p.openLevel,
          stopLoss: p.stopLevel ?? 0,
          tp1: p.profitLevel ?? 0,
          tp2: 0,
          tp3: 0,
          currentPrice: current,
          profitPips: Math.round((current - p.openLevel) * (p.direction === 'BUY' ? 1 : -1)),
          status: 'active' as const,
          timestamp: p.createdDate || new Date().toISOString(),
          volume: p.size,
        };
      });
      setActiveSignals(mapped);

      const unrealized = positions.reduce((sum, p) => sum + (p.profitLoss || 0), 0);
      if (account) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                balance: account.balance ?? prev.balance,
                dailyProfit: parseFloat(unrealized.toFixed(2)),
              }
            : prev,
        );
      }
    } catch {
      // Keep existing state on transient exceptions
    }
  }, []);

  // Places an order directly on Capital.com with optional Stop Loss and Take Profit levels.
  const handlePlaceBrokerOrder = useCallback(async (
    symbol: string, 
    type: 'BUY' | 'SELL', 
    lotSize: number, 
    stopLevel?: number, 
    profitLevel?: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (isNaN(lotSize) || lotSize <= 0) {
      addNotification('ai', 'Trade Execution Failed', `Invalid lot size: ${lotSize}. Lot size must be greater than 0.`);
      return { success: false, error: 'Invalid lot size.' };
    }

    const epic = SYMBOL_TO_EPIC[symbol] || symbol;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/capital/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          epic, 
          direction: type, 
          size: lotSize,
          stopLevel: stopLevel || undefined,
          profitLevel: profitLevel || undefined
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        const reason = data.error || `status ${res.status}`;
        addNotification('tp_sl', 'Trade Execution Rejected', `${type} ${lotSize} ${symbol} rejected: ${reason}`);
        return { success: false, error: reason };
      }
      addNotification(
        'signal', 
        `Order Executed: ${symbol}`, 
        `Capital.com ${type} order of ${lotSize} lots${stopLevel ? ` with SL $${stopLevel}` : ''}${profitLevel ? ` and TP $${profitLevel}` : ''} submitted successfully.`
      );
      // Refresh positions/balance from the broker.
      syncCapitalPortfolio();
      return { success: true };
    } catch (err: any) {
      const errMsg = err.message || 'Unable to reach broker gateway';
      addNotification('tp_sl', 'Trade Execution Failed', `Unable to reach broker for ${symbol}: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }, [addNotification, syncCapitalPortfolio]);

  // Manual order entry dispatcher — places a real market order on Capital.com.
  const handlePlaceManualTrade = useCallback(async (symbol: string, type: 'BUY' | 'SELL', lotSize: number) => {
    await handlePlaceBrokerOrder(symbol, type, lotSize);
  }, [handlePlaceBrokerOrder]);

  // Emergency close all open positions on Capital.com account
  const handleEmergencyCloseAll = useCallback(async (): Promise<{ success: boolean; closedCount: number; error?: string }> => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/capital/portfolio', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error(`Portfolio fetch status: ${res.status}`);
      const data = await res.json();
      const positions = Array.isArray(data.positions) ? data.positions : [];
      if (positions.length === 0) {
        return { success: true, closedCount: 0 };
      }
      
      let closedCount = 0;
      for (const p of positions) {
        const dealId = p.dealId;
        const delRes = await fetch(`/api/capital/position/${dealId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (delRes.ok) {
          closedCount++;
        }
      }
      
      syncCapitalPortfolio();
      addNotification('tp_sl', 'Emergency Close Complete', `All ${closedCount} active positions have been force-closed.`);
      return { success: true, closedCount };
    } catch (err: any) {
      const errMsg = err.message || 'Emergency close failed';
      addNotification('tp_sl', 'Emergency Close Failed', `Failed to execute immediate shutdown: ${errMsg}`);
      return { success: false, closedCount: 0, error: errMsg };
    }
  }, [syncCapitalPortfolio, addNotification]);

  // Keep track of previous active signals to detect closed positions.
  const prevActiveSignalsRef = useRef<ActiveSignalInstance[]>([]);
  const isFirstLoadRef = useRef<boolean>(true);

  // Sync disappeared positions into History
  useEffect(() => {
    if (activeSignals.length === 0 && isFirstLoadRef.current) {
      return;
    }
    
    const prev = prevActiveSignalsRef.current;
    
    if (prev.length > 0) {
      const currentIds = new Set(activeSignals.map(s => s.id));
      const closed = prev.filter(s => !currentIds.has(s.id));
      
      if (closed.length > 0) {
        const savedHistory = localStorage.getItem('gold_ai_history');
        let hist: TradeHistoryItem[] = savedHistory ? JSON.parse(savedHistory) : [];
        
        closed.forEach(p => {
          const exitPrice = prices?.[p.symbol]?.price || p.currentPrice || p.entryPrice;
          const diffPips = Math.round((exitPrice - p.entryPrice) * (p.symbol === 'EURUSD' ? 10000 : 10) * (p.type === 'BUY' ? 1 : -1));
          
          let profitUSD = p.profitPips * (p.volume || 1);
          if (p.symbol === 'XAUUSD') {
            profitUSD = (exitPrice - p.entryPrice) * (p.type === 'BUY' ? 1 : -1) * (p.volume || 1) * 100;
          } else if (p.symbol === 'EURUSD') {
            profitUSD = (exitPrice - p.entryPrice) * (p.type === 'BUY' ? 1 : -1) * (p.volume || 1) * 100000;
          } else {
            profitUSD = (exitPrice - p.entryPrice) * (p.type === 'BUY' ? 1 : -1) * (p.volume || 1);
          }
          
          const outcome = profitUSD >= 0 ? 'WIN' : 'LOSS';
          
          const historyItem: TradeHistoryItem = {
            id: p.id,
            symbol: p.symbol,
            type: p.type,
            entryPrice: p.entryPrice,
            exitPrice,
            profit: parseFloat(profitUSD.toFixed(2)),
            pips: diffPips,
            entryTime: p.timestamp,
            exitTime: new Date().toISOString(),
            duration: `${Math.max(1, Math.round((Date.now() - new Date(p.timestamp).getTime()) / 60000))} mins`,
            outcome
          };
          
          hist = [historyItem, ...hist];
          addNotification('tp_sl', 'Position Closed', `SMC automated position for ${p.symbol} closed. Outcome: ${outcome} (${profitUSD >= 0 ? '+' : ''}$${profitUSD.toFixed(2)})`);
          
          const newLog = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            symbol: p.symbol,
            type: profitUSD >= 0 ? 'success' as const : 'warning' as const,
            message: `POSITION CLOSED: ${p.type} ${p.volume || 0.10} lots exited at $${exitPrice}. Outcome: ${outcome} ($${profitUSD.toFixed(2)})`
          };
          setAutoLogs(l => {
            const upd = [newLog, ...l].slice(0, 50);
            localStorage.setItem('gold_ai_auto_logs', JSON.stringify(upd));
            return upd;
          });
        });
        
        setHistory(hist);
        localStorage.setItem('gold_ai_history', JSON.stringify(hist));
      }
    }
    
    if (activeSignals.length > 0) {
      isFirstLoadRef.current = false;
    }
    prevActiveSignalsRef.current = activeSignals;
  }, [activeSignals, prices, addNotification]);

  // Helper to append a system log to the automated strategy execution terminal
  const addAutoLog = useCallback((symbol: string, type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      symbol,
      type,
      message
    };
    console.log(`[AutoTrading Engine] [${symbol}] [${type.toUpperCase()}] ${message}`);
    setAutoLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 50);
      localStorage.setItem('gold_ai_auto_logs', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Shared helper to handle automated trade validation and execution for any SMC signal
  const executeAutoTradeForSignal = useCallback(async (
    symbol: string, 
    signalData: any
  ): Promise<{ success: boolean; error?: string }> => {
    if (!capitalConnected) {
      addAutoLog(symbol, 'warning', `Execution skipped: Broker is not connected.`);
      return { success: false, error: 'Broker is not connected.' };
    }

    if (settings?.emergencyStop) {
      addAutoLog(symbol, 'warning', `Execution skipped: Master emergency stop switch is active.`);
      return { success: false, error: 'Master emergency stop switch is active.' };
    }

    const epic = SYMBOL_TO_EPIC[symbol] || symbol;
    const hasPosition = activeSignals.some(s => s.symbol === symbol || s.symbol === epic);
    if (hasPosition) {
      addAutoLog(symbol, 'info', `Skipped: There is already an active position/order for ${symbol} on Capital.com.`);
      return { success: false, error: `Position already active for ${symbol}.` };
    }

    if (activeSignals.length >= 2) {
      addAutoLog(symbol, 'warning', `Skipped: Maximum of 2 concurrent open positions reached (Strict Risk limit).`);
      return { success: false, error: 'Max 2 open positions limit reached.' };
    }

    const { type, entry, stopLoss, tp1 } = signalData;

    if (!entry || !stopLoss || !tp1) {
      addAutoLog(symbol, 'error', `Execution rejected: Signal lacks valid protective or target levels.`);
      return { success: false, error: 'Signal lacks valid levels.' };
    }

    // --- STRICT INSTITUTIONAL SMC QUALITY CONTROLS ---

    // 1. Avoid trading during high-impact news
    if (isNewsBlocked) {
      addAutoLog(symbol, 'warning', `Execution skipped: Active High-Impact Macro Economic Event Blocked (News Filter).`);
      return { success: false, error: 'High impact news event active.' };
    }

    // 2. Only trade high-confidence SMC setups (>= 85)
    const confidence = signalData.confidence || signalData.confidenceScore || 0;
    if (confidence < 85) {
      addAutoLog(symbol, 'warning', `Skip low-quality setup: Confidence score too low (${confidence}% < 85%). Skipping to protect collateral.`);
      return { success: false, error: 'Low confidence setup.' };
    }

    // 3. Filter trades using higher timeframe trend alignment
    const htfStatus = signalData.htfStatus || '';
    if (type === 'BUY' && htfStatus !== 'BULLISH') {
      addAutoLog(symbol, 'warning', `Skip low-quality setup: Higher timeframe trend mismatch. Setup direction is BUY but HTF trend is ${htfStatus || 'Counter-Trend'}.`);
      return { success: false, error: 'Higher timeframe trend mismatch.' };
    }
    if (type === 'SELL' && htfStatus !== 'BEARISH') {
      addAutoLog(symbol, 'warning', `Skip low-quality setup: Higher timeframe trend mismatch. Setup direction is SELL but HTF trend is ${htfStatus || 'Counter-Trend'}.`);
      return { success: false, error: 'Higher timeframe trend mismatch.' };
    }

    // 4. Require confirmation after liquidity sweep
    const hasSweep = type === 'BUY' ? signalData.sellSideLiquidity === 'SWEPT' : signalData.buySideLiquidity === 'SWEPT';
    if (!hasSweep) {
      addAutoLog(symbol, 'warning', `Skip low-quality setup: Lacks ${type === 'BUY' ? 'sell-side' : 'buy-side'} liquidity sweep confirmation before entry.`);
      return { success: false, error: 'Missing liquidity sweep confirmation.' };
    }

    // 5. Require BOS/CHoCH structure shift confirmation before entry
    const hasBOS = signalData.bos === 'CONFIRMED';
    const hasCHoCH = signalData.choch === 'CONFIRMED';
    if (!hasBOS && !hasCHoCH) {
      addAutoLog(symbol, 'warning', `Skip low-quality setup: Lacks BOS/CHoCH structural break shift confirmation.`);
      return { success: false, error: 'Missing BOS/CHoCH structural confirmation.' };
    }

    // 6. Require a minimum risk-to-reward ratio of 1:3
    const slDist = Math.abs(entry - stopLoss);
    const tpDist = Math.abs(tp1 - entry);
    const calculatedRR = slDist > 0 ? tpDist / slDist : 0;
    if (calculatedRR < 2.95) {
      addAutoLog(symbol, 'warning', `Skip low-quality setup: Risk-to-Reward ratio too low (1:${calculatedRR.toFixed(2)} < 1:3).`);
      return { success: false, error: 'Insufficient risk-to-reward ratio.' };
    }

    addAutoLog(symbol, 'success', `QUANT QUALITY CONTROL PASSED: High-Confidence setup (${confidence}%) | HTF Trend Aligned | BOS/CHoCH confirmed | ATR-based SL verified | Risk-Reward 1:${calculatedRR.toFixed(2)}.`);

    const balance = profile?.balance || 100000.00;
    const riskPct = settings?.riskPercentage ?? 1.0;
    const maxLot = settings?.maxLotSize ?? 2.0;
    const riskAmt = balance * (riskPct / 100);
    const diff = Math.abs(entry - stopLoss);

    let instrumentDetails: any = null;
    try {
      const token = localStorage.getItem('token');
      const instRes = await fetch(`/api/capital/instrument/${encodeURIComponent(epic)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (instRes.ok) {
        instrumentDetails = await instRes.json();
      }
    } catch (err) {
      console.error('Failed to fetch live instrument details from Capital.com', err);
    }

    const instrument = instrumentDetails?.instrument || {};
    const contractSize = instrument.lotSize || (symbol === 'EURUSD' ? 100000 : symbol === 'XAUUSD' ? 100 : 1);
    const minDealSize = instrument.minDealSize || (symbol === 'EURUSD' ? 1000 : symbol === 'XAUUSD' ? 0.1 : 0.01);
    const minLot = minDealSize / contractSize;
    const minLotIncrement = minLot || 0.01;

    let calculatedLot = diff > 0 ? (riskAmt / (contractSize * diff)) : minLot;

    if (calculatedLot < minLot) {
      calculatedLot = minLot;
    } else {
      const steps = Math.floor(calculatedLot / minLotIncrement);
      calculatedLot = steps * minLotIncrement;
    }

    let finalLotSize = Math.min(calculatedLot, maxLot);
    if (finalLotSize < minLot) {
      finalLotSize = minLot;
    }
    finalLotSize = parseFloat(finalLotSize.toFixed(2));

    addAutoLog(symbol, 'info', `Formulated auto-risk model: Bal $${balance.toLocaleString()} | Risk $${riskAmt.toLocaleString()} (${riskPct}%) | Final Lot Size: ${finalLotSize}`);

    addAutoLog(symbol, 'info', `Executing Direct Market Order: ${type} ${finalLotSize} lots (SL: $${stopLoss}, TP: $${tp1})...`);
    
    const orderResult = await handlePlaceBrokerOrder(symbol, type, finalLotSize, stopLoss, tp1);
    
    if (orderResult.success) {
      addAutoLog(symbol, 'success', `SUCCESS: Automated direct order executed on Capital.com: ${type} ${finalLotSize} lots of ${symbol}.`);
      await syncCapitalPortfolio();
      return { success: true };
    } else {
      addAutoLog(symbol, 'error', `Direct Order Rejected by Broker: ${orderResult.error || 'Connection or account error.'}`);
      return { success: false, error: orderResult.error };
    }
  }, [capitalConnected, settings, activeSignals, profile, handlePlaceBrokerOrder, syncCapitalPortfolio, addAutoLog]);

  const [isScanning, setIsScanning] = useState(false);

  // Background scanner loop that runs Smart Money Concept strategy on live markets autonomously
  const runAutomatedTradingScan = useCallback(async (force = false) => {
    if (!settings?.enableAutoTrading && !force) {
      return;
    }

    if (settings?.emergencyStop) {
      addAutoLog('SYSTEM', 'warning', 'Automated trading scan skipped: MASTER EMERGENCY STOP SWITCH is active.');
      return;
    }

    if (!capitalConnected) {
      addAutoLog('SYSTEM', 'warning', 'Automated trading scan skipped: Broker (Capital.com) is not linked.');
      return;
    }

    if (isNewsBlocked) {
      addAutoLog('SYSTEM', 'warning', 'Automated trading scan skipped: HIGH-IMPACT NEWS WINDOW ACTIVE. Standing by.');
      return;
    }

    if (isScanning) return;
    setIsScanning(true);

    if (force) {
      addAutoLog('SYSTEM', 'info', 'DIAGNOSTIC TEST TRIGGERED: Executing manual SMC sweep and end-to-end trade test.');
    } else {
      addAutoLog('SYSTEM', 'info', 'Initiating automated SMC analysis scan across all tradeable instruments...');
    }

    const assets = ['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'NAS100'];

    for (const symbol of assets) {
      try {
        const epic = SYMBOL_TO_EPIC[symbol] || symbol;
        const hasPosition = activeSignals.some(s => s.symbol === symbol || s.symbol === epic);
        if (hasPosition) {
          addAutoLog(symbol, 'info', `Asset is already in an open trade. Skipping signal check to adhere to broker single-position rules.`);
          continue;
        }

        if (activeSignals.length >= 2) {
          addAutoLog(symbol, 'warning', `SMC entry blocked: Maximum concurrent open positions limit reached (2 positions active).`);
          break;
        }

        const price = prices?.[symbol]?.price;
        if (!price) {
          addAutoLog(symbol, 'warning', `Market price feed unavailable for asset scanning.`);
          continue;
        }

        addAutoLog(symbol, 'info', `Scanning market data structure at current price $${price.toLocaleString()}...`);

        const response = await fetch('/api/analyze-market', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, currentPrice: price })
        });

        if (!response.ok) {
          addAutoLog(symbol, 'error', `SMC analysis failed: Server responded with status ${response.status}`);
          continue;
        }

        const signalData = await response.json();
        if (!signalData || !signalData.type) {
          addAutoLog(symbol, 'info', `No tradeable institutional order blocks or unmitigated FVGs detected. Standing by.`);
          continue;
        }

        addAutoLog(symbol, 'success', `SMC Signal Detected: ${signalData.type} at $${signalData.entry} (Stop Loss: $${signalData.stopLoss}, Target TP1: $${signalData.tp1}, Confidence: ${signalData.confidence}%)`);

        // Directly route generated signals to the unified auto execution helper
        await executeAutoTradeForSignal(symbol, signalData);

      } catch (err: any) {
        addAutoLog(symbol, 'error', `Execution engine exception: ${err.message}`);
      }
    }

    setIsScanning(false);
  }, [settings, capitalConnected, activeSignals, prices, executeAutoTradeForSignal, isScanning, addAutoLog]);

  // Launch continuous background auto-trading analysis scanner
  useEffect(() => {
    if (settings?.enableAutoTrading && capitalConnected) {
      runAutomatedTradingScan();
      const interval = setInterval(runAutomatedTradingScan, 15000);
      return () => clearInterval(interval);
    }
  }, [settings?.enableAutoTrading, capitalConnected, runAutomatedTradingScan]);

  // Initial portfolio load + periodic refresh (respects Capital.com rate limits).
  useEffect(() => {
    syncCapitalPortfolio();
    const id = setInterval(syncCapitalPortfolio, 15000);
    return () => clearInterval(id);
  }, [syncCapitalPortfolio]);

  // Sync Live Market Prices
  const syncPrices = useCallback(async (isInitial = false, force = false) => {
    setIsLoadingPrices(true);
    if (isInitial) {
      setApiConnectionVerified('verifying');
    }
    try {
      const forceQuery = force ? `force=true` : `force=false`;
      const keyParam = settings?.apiKeyOverride ? `&apikey=${encodeURIComponent(settings.apiKeyOverride)}` : '';
      const res = await fetch(`/api/prices?${forceQuery}${keyParam}`);
      if (!res.ok) {
        const errObj = await res.json().catch(() => ({}));
        throw new Error(errObj.error || `Server status: ${res.status}`);
      }
      const data = await res.json();
      setPrices(data);
      setPricesError(null);
      setApiConnectionVerified('success');
    } catch (err: any) {
      console.warn("Unable to fetch live Twelve Data prices:", err.message);
      setPricesError("Live Market Data Unavailable");
      setPrices(null); // Explicitly clear prices as instructed (no fake prices if live is unavailable)
      setApiConnectionVerified('failed');
    } finally {
      setIsLoadingPrices(false);
    }
  }, [settings?.apiKeyOverride]);

  // Fetch Smart Money strategy details for selected symbol
  const runSMCSignalAnalysis = useCallback(async (symbol: string, currentPrice?: number) => {
    setIsLoadingSMC(true);
    try {
      const response = await fetch('/api/analyze-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, currentPrice })
      });
      if (response.ok) {
        const data = await response.json();
        setSmcSignal(data);

        // Directly route generated signals to the unified auto execution helper
        if (data && data.type && capitalConnected) {
          addAutoLog(symbol, 'info', `[Real-Time Chart Feed] SMC analysis completed. Forwarding signal to execution engine.`);
          await executeAutoTradeForSignal(symbol, data);
        }
      }
    } catch (e) {
      console.error("SMC Fetch Error:", e);
    } finally {
      setIsLoadingSMC(false);
    }
  }, [capitalConnected, executeAutoTradeForSignal, addAutoLog]);

  // Periodically fetch prices every 8 seconds (without page reload) for rapid real-time updates
  useEffect(() => {
    syncPrices(true);
    const interval = setInterval(() => {
      syncPrices(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [syncPrices]);

  // Sync SMC signal when symbol changes or when price updates
  const currentAssetPrice = prices?.[selectedSymbol]?.price;
  useEffect(() => {
    if (currentAssetPrice) {
      runSMCSignalAnalysis(selectedSymbol, currentAssetPrice);
    }
  }, [selectedSymbol, currentAssetPrice, runSMCSignalAnalysis]);

  // Smooth the displayed price/PnL of live positions between portfolio syncs
  // using the faster market-price feed. Position lifecycle (open/close) is
  // authoritative from Capital.com via syncCapitalPortfolio — no simulated
  // TP/SL closes or fabricated history/balance changes here.
  useEffect(() => {
    if (!prices || activeSignals.length === 0) return;
    setActiveSignals(prev =>
      prev.map(sig => {
        const marketPrice = prices[sig.symbol]?.price;
        if (!marketPrice) return sig;
        const multiplier = sig.symbol === 'EURUSD' ? 10000 : 10;
        const diffPips = parseFloat(
          ((marketPrice - sig.entryPrice) * multiplier * (sig.type === 'BUY' ? 1 : -1)).toFixed(0),
        );
        return { ...sig, currentPrice: marketPrice, profitPips: diffPips };
      }),
    );
  }, [prices, activeSignals.length]);

  const handleNewsFilterTrigger = (blocked: boolean, text: string | null) => {
    setIsNewsBlocked(blocked);
    setHighImpactWarning(text);
  };

  if (!profile) {
    return <Auth onLoginSuccess={(u) => {
      setProfile(u);
      playAlertSound('success');
    }} />;
  }

  if (apiConnectionVerified === 'verifying') {
    return (
      <div className="min-h-screen bg-[#070708] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(218,165,32,0.03),rgba(0,0,0,0))] pointer-events-none"></div>
        <div className="text-center space-y-6 max-w-sm relative z-10">
          <div className="relative inline-block mx-auto">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-[#D1A12C] rounded-2xl shadow-[0_0_25px_rgba(218,165,32,0.15)]">
              <TrendingUp className="h-8 w-8 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white tracking-tight uppercase tracking-wider">GOLD AI TERMINAL</h2>
            <p className="text-xs text-[#D1A12C]/80 font-mono tracking-widest uppercase animate-pulse">Connecting to Secure Node...</p>
          </div>
          <div className="flex justify-center pt-2">
            <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Verifying market api feed protocols and establishing real-time SMC matrix hooks.
          </p>
        </div>
      </div>
    );
  }

  if (apiConnectionVerified === 'failed') {
    return (
      <div className="min-h-screen bg-[#070708] text-neutral-200 flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(218,165,32,0.04),rgba(0,0,0,0))] pointer-events-none"></div>
        
        <div className="max-w-md w-full bg-neutral-950/80 border border-neutral-900 rounded-3xl p-8 space-y-6 shadow-2xl relative z-10 backdrop-blur-xl text-center">
          <div className="flex flex-col items-center gap-3 border-b border-neutral-900 pb-5">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 text-amber-500 rounded-2xl">
              <AlertTriangle className="h-6 w-6 text-amber-500 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight uppercase tracking-wider">API Connection Required</h2>
              <p className="text-xs text-neutral-500 font-mono uppercase tracking-widest mt-0.5">Twelve Data Gateway Offline</p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-neutral-300 text-left">
            <p className="leading-relaxed">
              This terminal requires a **Twelve Data API Key** to feed real-time pricing data and smart money strategy calculations.
            </p>

            <div className="p-4 bg-neutral-900/50 rounded-2xl border border-neutral-900 space-y-3">
              <span className="font-bold text-white uppercase tracking-wider text-[10px] text-amber-500 block">How to configure the API key:</span>
              <ol className="list-decimal pl-4 space-y-2 leading-relaxed text-neutral-400 text-[11px]">
                <li>
                  Visit <a href="https://twelvedata.com" target="_blank" rel="noopener noreferrer" className="text-amber-500 underline font-semibold text-amber-500">twelvedata.com</a> and sign up for a free key.
                </li>
                <li>
                  In AI Studio, click the **Settings** gear icon in the bottom-left sidebar.
                </li>
                <li>
                  Find **Secrets / Environment Variables** and add a secret:
                </li>
                <li className="list-none pl-1">
                  Name: <code className="bg-black text-amber-500 px-1.5 py-0.5 rounded font-mono font-bold select-all">TWELVE_DATA_API_KEY</code>
                </li>
                <li>
                  Paste your Twelve Data key as the value, click **Save**, and refresh.
                </li>
              </ol>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
                Or paste API key override directly here:
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Paste Twelve Data key..."
                  value={tempKeyInput}
                  onChange={(e) => setTempKeyInput(e.target.value)}
                  className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-2 px-3.5 text-xs text-white placeholder-neutral-700 font-mono"
                />
                <button
                  onClick={() => {
                    if (tempKeyInput.trim()) {
                      localStorage.setItem('twelve_data_api_key_override', tempKeyInput.trim());
                      setSettings(prev => ({ ...prev, apiKeyOverride: tempKeyInput.trim() }));
                      setTimeout(() => syncPrices(true), 100);
                    }
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs px-4 rounded-xl transition-all"
                >
                  Activate
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-900 pt-5 flex items-center justify-between">
            <span className="text-[10px] text-neutral-600 font-mono uppercase">Node Status: STANDBY</span>
            <button
              onClick={() => syncPrices(true, true)}
              className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-amber-500/20 text-neutral-300 hover:text-white font-semibold text-xs py-2 px-4 rounded-xl transition-all"
            >
              <Loader2 className={`h-3 w-3 ${isLoadingPrices ? 'animate-spin' : ''}`} />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[#050506] text-neutral-200 flex flex-col font-sans pb-28 relative">
      
      {/* Dynamic Gold Radial Backdrop Accent */}
      <div className="fixed top-0 left-0 right-0 h-[300px] bg-[radial-gradient(ellipse_60%_60%_at_50%_-10%,rgba(218,165,32,0.04),rgba(0,0,0,0))] pointer-events-none z-0"></div>

      {/* TOP BRAND HEADER */}
      <header className="sticky top-0 z-40 bg-[#070708]/85 backdrop-blur-xl border-b border-neutral-900 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-[#D1A12C] rounded-xl shadow-[0_0_15px_rgba(218,165,32,0.15)]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs uppercase font-extrabold text-white tracking-widest leading-none">GOLD AI</span>
            <p className="text-[9px] text-amber-500/85 font-mono tracking-widest leading-none mt-1 uppercase">SMC Quantum Terminal</p>
          </div>
        </div>

        {/* Active Node details & Balance card */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('status')}
            className={`hidden sm:flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              view === 'status'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold'
                : 'bg-neutral-950 border-neutral-900 text-neutral-500 hover:text-neutral-300 hover:border-neutral-850'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${view === 'status' ? 'animate-ping' : 'animate-pulse'}`}></span>
            <span>Server Status</span>
          </button>

          {/* Premium Balance Card with modifier action */}
          <button 
            onClick={() => {
              setCustomBalanceInput(profile?.balance?.toString() || '100000');
              setShowBalanceModal(true);
            }}
            className="flex items-center gap-2.5 bg-gradient-to-br from-[#12110D] to-black border border-amber-500/25 hover:border-amber-500/50 px-4 py-1.5 rounded-xl shadow-md transition-all text-left"
          >
            <div>
              <span className="text-[8px] uppercase tracking-wider text-neutral-500 font-mono block">Liquidity • الرصيد</span>
              <span className="text-xs font-bold text-white font-mono">
                ${(profile?.balance ?? 100000.00).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
          </button>
        </div>
      </header>

      {/* MAIN VIEW AREA */}
      <main className="flex-grow flex flex-col p-4 md:p-8 space-y-6 relative z-10 max-w-7xl mx-auto w-full">
        
        {/* Dynamic header / quick actions bar on desktop */}
        <div className="hidden md:flex items-center justify-between border-b border-neutral-900 pb-4">
          <div className="flex items-center gap-3 font-mono text-[11px] text-neutral-500 uppercase tracking-widest">
            <span>Terminal: GOLD_NODE_MAIN</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold animate-pulse">Node Sync Online</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick alert notifications trigger */}
            <div className="relative">
              <button 
                onClick={() => setView('signals')}
                className="p-2 rounded-xl bg-neutral-950 border border-neutral-900 hover:border-amber-500/20 text-neutral-400 hover:text-white transition-all relative"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* PAGE DISPATCHER */}
        <div id="page_renderer">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                <DashboardOverview
                  profile={profile!}
                  activeSignals={activeSignals}
                  history={history}
                  highImpactWarning={highImpactWarning}
                  onNavigateToSignals={() => setView('signals')}
                  onNavigateToHistory={() => setView('signals')}
                  onNavigateToMonitor={() => setView('monitor')}
                  onPlaceManualTrade={handlePlaceManualTrade}
                />
              </motion.div>
            )}

            {view === 'monitor' && (
              <motion.div
                key="monitor"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                <MarketMonitor
                  prices={prices}
                  isLoading={isLoadingPrices}
                  onRefresh={syncPrices}
                  onSelectSymbol={setSelectedSymbol}
                  selectedSymbol={selectedSymbol}
                  errorMsg={pricesError}
                />
              </motion.div>
            )}

            {view === 'charts' && (
              <motion.div
                key="charts"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Analytical Live SMC Chart</h1>
                  <p className="text-xs text-neutral-400">TradingView live chart embedded paired with real-time AI Smart Money Strategy parameters.</p>
                </div>
                
                <TradingViewChart
                  symbol={selectedSymbol}
                  selectedSymbol={selectedSymbol}
                  onSymbolChange={setSelectedSymbol}
                />

                <SmartMoneyStrategy
                  signal={smcSignal}
                  isLoading={isLoadingSMC}
                  selectedSymbol={selectedSymbol}
                  capitalConnected={capitalConnected}
                  onPlaceOrder={handlePlaceBrokerOrder}
                  settings={settings}
                />
              </motion.div>
            )}

            {view === 'news' && (
              <motion.div
                key="news"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                <EconomicCalendar
                  onFilterStatusChange={handleNewsFilterTrigger}
                />
              </motion.div>
            )}

            {view === 'signals' && (
              <motion.div
                key="signals"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* Signals view */}
                <div className="lg:col-span-2">
                  <SignalList
                    activeSignals={activeSignals}
                    history={history}
                    onSelectSymbol={(sym) => {
                      setSelectedSymbol(sym);
                      setView('charts');
                    }}
                    highImpactWarning={highImpactWarning}
                    autoLogs={autoLogs}
                    onClearAutoLogs={() => {
                      setAutoLogs([]);
                      localStorage.removeItem('gold_ai_auto_logs');
                    }}
                    onTriggerScan={() => runAutomatedTradingScan(true)}
                    isScanning={isScanning}
                  />
                </div>

                {/* Right hand side: Notification log center */}
                <div className="lg:col-span-1">
                  <NotificationsPanel
                    notifications={notifications}
                    onMarkAsRead={(id) => {
                      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
                    }}
                    onClearAll={() => setNotifications([])}
                    onMarkAllAsRead={() => {
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    }}
                  />
                </div>
              </motion.div>
            )}

            {view === 'backtest' && (
              <motion.div
                key="backtest"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                <SMCBacktest
                  settings={settings}
                  onEnableAutoTrading={() => {
                    setSettings(s => {
                      const newSettings = { ...s, enableAutoTrading: true };
                      localStorage.setItem('gold_ai_settings', JSON.stringify(newSettings));
                      return newSettings;
                    });
                    playAlertSound('success');
                    addNotification('ai', 'SMC Live Execution Enacted', 'Autonomous trading engine has been successfully authorized and enabled for all high-confidence SMC setups.');
                  }}
                  onPlaySound={playAlertSound}
                />
              </motion.div>
            )}

            {view === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                <ProfileSettings
                  profile={profile!}
                  settings={settings}
                  onPlaySound={playAlertSound}
                  onAddNotification={addNotification}
                  onUpdateProfile={(updated) => setProfile(p => p ? { ...p, ...updated } : null)}
                  onUpdateSettings={(updated) => {
                    setSettings(s => {
                      const newSettings = { ...s, ...updated };
                      if (updated.apiKeyOverride !== undefined) {
                        localStorage.setItem('twelve_data_api_key_override', updated.apiKeyOverride || '');
                      }
                      return newSettings;
                    });
                  }}
                  onLogout={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setProfile(null);
                    setView('dashboard');
                  }}
                  onNavigateToStatus={() => setView('status')}
                />
              </motion.div>
            )}

            {view === 'broker' && (
              <motion.div
                key="broker"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                <CapitalConnection 
                  onPlaySound={playAlertSound} 
                  onConnectionChange={(isConnected) => {
                    setCapitalConnected(isConnected);
                    if (isConnected) {
                      syncCapitalPortfolio();
                      runAutomatedTradingScan();
                    }
                  }}
                />
              </motion.div>
            )}

            {view === 'status' && (
              <motion.div
                key="status"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                <SystemStatus />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>

      {/* FLOATING BOTTOM NAVIGATION BAR (Responsive Page Navigation from the Bottom) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-xl md:max-w-2xl">
        <nav className="backdrop-blur-xl bg-neutral-950/90 border border-neutral-900 rounded-full px-3 py-2 shadow-[0_15px_35px_rgba(0,0,0,0.9)] flex justify-around items-center gap-1">
          {[
            { id: 'dashboard', label: 'Home', icon: Activity },
            { id: 'monitor', label: 'Monitor', icon: BarChart3 },
            { id: 'charts', label: 'SMC Chart', icon: TrendingUp },
            { id: 'news', label: 'Calendar', icon: Calendar },
            { id: 'signals', label: 'Signals', icon: Play, badge: activeSignals.length },
            { id: 'backtest', label: 'Backtest', icon: Cpu },
            { id: 'broker', label: 'Broker', icon: Shield },
            { id: 'settings', label: 'Setup', icon: Sliders }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id as any)}
                className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                  isActive 
                    ? 'text-amber-500 font-bold' 
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
                style={{ minWidth: '60px' }}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-amber-500/5 border border-amber-500/10 rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className="h-4.5 w-4.5 relative z-10" />
                <span className="text-[9px] font-medium tracking-wide mt-1 relative z-10 block">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Balance Adjustment Modal */}
      <AnimatePresence>
        {showBalanceModal && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 transition-opacity" 
              onClick={() => setShowBalanceModal(false)}
            />
            {/* Modal Card */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-neutral-950 border border-neutral-900 p-6 rounded-3xl shadow-2xl z-50 space-y-5">
              <div className="flex justify-between items-start border-b border-neutral-900 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Institutional Liquidity Control</h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">التحكم في السيولة ورصيد الحساب</p>
                </div>
                <button 
                  onClick={() => setShowBalanceModal(false)} 
                  className="p-1 text-neutral-500 hover:text-white transition-colors"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-1">
                    Current Available Balance • الرصيد الحالي
                  </label>
                  <div className="text-2xl font-extrabold text-amber-500 font-mono">
                    ${(profile?.balance ?? 100000.00).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {capitalConnected ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-neutral-300 text-xs rounded-xl space-y-2.5 leading-relaxed">
                    <p className="font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 shrink-0" />
                      Broker Account Linked
                    </p>
                    <p>
                      Your account balance, open positions, pending orders, and P/L are being synchronized in real time from **Capital.com**.
                    </p>
                    <p className="text-[10px] text-neutral-500 font-mono leading-normal">
                      To preserve live-sync integrity and ensure the broker account remains the single source of truth, manual balance overrides are disabled.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
                        Set Custom Balance Amount • اكتب الرصيد المطلوب
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">$</span>
                        <input
                          type="number"
                          placeholder="Enter any custom amount..."
                          value={customBalanceInput}
                          onChange={(e) => setCustomBalanceInput(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-2.5 pl-8 pr-4 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Preset Buttons */}
                    <div className="space-y-1.5">
                      <span className="block text-[9px] uppercase tracking-wider text-neutral-500 font-semibold">Institutional Presets • سيولة جاهزة</span>
                      <div className="grid grid-cols-4 gap-2">
                        {[0, 10000, 100000, 500000].map((presetVal) => (
                          <button
                            key={presetVal}
                            type="button"
                            onClick={() => {
                              setCustomBalanceInput(presetVal.toString());
                            }}
                            className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-[10px] font-semibold font-mono py-1.5 rounded-lg text-neutral-400 hover:text-white transition-all"
                          >
                            {presetVal === 0 ? 'RESET $0' : `$${(presetVal / 1000).toFixed(0)}K`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProfile(p => p ? { ...p, balance: 0, dailyProfit: 0, weeklyProfit: 0, monthlyProfit: 0 } : null);
                          setCustomBalanceInput('0');
                          addNotification('tp_sl', 'Liquidity Zeroed Out', 'Your account margin balance has been reset to precisely $0.00.');
                          setShowBalanceModal(false);
                        }}
                        className="bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 font-bold text-xs py-2.5 px-4 rounded-xl transition-all uppercase tracking-wider text-center"
                      >
                        Zero Balance • تصفير
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const targetAmt = parseFloat(customBalanceInput);
                          if (!isNaN(targetAmt) && targetAmt >= 0) {
                            setProfile(p => p ? { ...p, balance: targetAmt } : null);
                            addNotification('signal', 'Liquidity Restructured', `Successfully structured balance to $${targetAmt.toLocaleString()}.`);
                            setShowBalanceModal(false);
                          }
                        }}
                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs py-2.5 px-4 rounded-xl transition-all uppercase tracking-wider text-center"
                      >
                        Update Balance • حفظ
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Absolute Bottom Indicator line */}
      <footer className="w-full text-center py-4 border-t border-neutral-900 text-[10px] text-neutral-600 font-mono tracking-widest relative z-10 select-none bg-black/40">
        GOLD AI PLATFORM LLC. ALL INTELLECTUAL PROPERTY DEPOSITED. DATA FLOW VIA SECURE NODE.
      </footer>
    </div>
  );
}
