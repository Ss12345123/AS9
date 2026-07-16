import { useState, useEffect } from 'react';
import { 
  Play, TrendingUp, Cpu, CheckCircle2, ChevronRight, AlertTriangle, 
  ArrowRight, RefreshCw, BarChart3, Terminal, RotateCcw, Shield, 
  Sliders, Activity, Sparkles, DollarSign, Percent, Clock, Trash2, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ScalpingMode, ScalpingSettings, ScalpingGlobalState, 
  ScalpingTradeSignal, ScalpingPosition, ScalpingBacktestResult 
} from '../types/scalping';

interface ScalpingModuleProps {
  profile: {
    balance: number;
    fullName: string;
    avatarUrl: string;
    email: string;
  };
  activeSignals: any[];
  onPlaceBrokerOrder: (
    symbol: string, 
    type: 'BUY' | 'SELL', 
    lotSize: number, 
    stopLevel?: number, 
    profitLevel?: number
  ) => Promise<{ success: boolean; error?: string }>;
  capitalConnected: boolean;
  onPlaySound: (type: 'success' | 'warning' | 'alert') => void;
  syncCapitalPortfolio: () => Promise<void>;
  addNotification: (type: 'signal' | 'news' | 'tp_sl' | 'ai', title: string, message: string) => void;
}

const MODES: { id: ScalpingMode; name: string; description: string }[] = [
  { id: 'ULTRA_SCALPING', name: 'Ultra Scalping', description: 'Hyper-fast execution on M1 timeframe. Perfect for gold spread capture.' },
  { id: 'FAST_SCALPING', name: 'Fast Scalping', description: 'M5 timeframe structure. High frequency sweeps with tight stop protections.' },
  { id: 'INTRADAY', name: 'Intraday Scalp', description: 'M15 timeframe structures. High quality setups targeting daily range levels.' },
  { id: 'SWING', name: 'Swing Position', description: 'H1 timeframe key blocks. Target liquidity sweeps with higher reward ratios.' },
  { id: 'POSITION', name: 'Position Trade', description: 'H4/D1 trend alignment. Capture structural long-term swing moves.' },
];

const SYMBOLS = ['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'NAS100'];

export default function ScalpingModule({
  profile,
  activeSignals,
  onPlaceBrokerOrder,
  capitalConnected,
  onPlaySound,
  syncCapitalPortfolio,
  addNotification
}: ScalpingModuleProps) {
  // Tabs: settings, live, backtest
  const [activeTab, setActiveTab] = useState<'live' | 'settings' | 'backtest'>('live');
  const [selectedSymbol, setSelectedSymbol] = useState('XAUUSD');
  const [selectedMode, setSelectedMode] = useState<ScalpingMode>('ULTRA_SCALPING');
  
  // Settings & State from Backend
  const [globalState, setGlobalState] = useState<ScalpingGlobalState>({
    currentMode: 'ULTRA_SCALPING',
    isEngineActive: true,
    dailyLossLimit: 500,
    dailyProfitTarget: 1000,
    maxOpenPositions: 3,
    maxRiskPerTrade: 1.5,
    maxAccountExposure: 5.0,
    consecutiveLossesLimit: 4,
    tradingPauseDurationHours: 12,
    todayProfitLoss: 0,
    todayDrawdown: 0,
    consecutiveLosses: 0,
    isTradingPaused: false,
    pauseEndTime: null,
    recoveryModeActive: false,
  });

  const [modeConfigs, setModeConfigs] = useState<Record<ScalpingMode, ScalpingSettings>>({
    ULTRA_SCALPING: { timeframe: '1M', maxSpread: 1.5, maxSimultaneousPositions: 5, riskPercentage: 2.0, lotSize: 0.5, maxDrawdown: 3.0, takeProfit: 10, stopLoss: 15, trailingStop: true, trailingStopDistance: 5, breakEven: true, breakEvenTrigger: 4, partialTP: true, partialClosePercentage: 50, partialTPTrigger: 6, sessions: { london: true, newyork: true, asia: false }, newsFilter: true, lotType: 'FIXED', maxSlippage: 1.0, maxAveragingOrders: 3, averagingDistance: 10, averagingMultiplier: 1.5, averagingLotType: 'FIXED', disableAveragingOnReversal: true },
    FAST_SCALPING: { timeframe: '5M', maxSpread: 2.0, maxSimultaneousPositions: 3, riskPercentage: 1.5, lotSize: 0.25, maxDrawdown: 4.0, takeProfit: 20, stopLoss: 25, trailingStop: true, trailingStopDistance: 10, breakEven: true, breakEvenTrigger: 8, partialTP: true, partialClosePercentage: 50, partialTPTrigger: 12, sessions: { london: true, newyork: true, asia: true }, newsFilter: true, lotType: 'FIXED', maxSlippage: 1.5, maxAveragingOrders: 2, averagingDistance: 15, averagingMultiplier: 1.5, averagingLotType: 'FIXED', disableAveragingOnReversal: true },
    INTRADAY: { timeframe: '15M', maxSpread: 2.5, maxSimultaneousPositions: 2, riskPercentage: 1.0, lotSize: 0.15, maxDrawdown: 5.0, takeProfit: 50, stopLoss: 40, trailingStop: false, trailingStopDistance: 15, breakEven: true, breakEvenTrigger: 15, partialTP: true, partialClosePercentage: 40, partialTPTrigger: 25, sessions: { london: true, newyork: true, asia: false }, newsFilter: true, lotType: 'DYNAMIC', maxSlippage: 2.0, maxAveragingOrders: 2, averagingDistance: 25, averagingMultiplier: 1.2, averagingLotType: 'DYNAMIC', disableAveragingOnReversal: true },
    SWING: { timeframe: '1H', maxSpread: 3.5, maxSimultaneousPositions: 2, riskPercentage: 1.0, lotSize: 0.1, maxDrawdown: 8.0, takeProfit: 150, stopLoss: 80, trailingStop: false, trailingStopDistance: 30, breakEven: true, breakEvenTrigger: 40, partialTP: false, partialClosePercentage: 50, partialTPTrigger: 75, sessions: { london: true, newyork: true, asia: true }, newsFilter: false, lotType: 'DYNAMIC', maxSlippage: 3.0, maxAveragingOrders: 1, averagingDistance: 50, averagingMultiplier: 1.0, averagingLotType: 'DYNAMIC', disableAveragingOnReversal: true },
    POSITION: { timeframe: '4H', maxSpread: 5.0, maxSimultaneousPositions: 1, riskPercentage: 0.5, lotSize: 0.05, maxDrawdown: 10.0, takeProfit: 400, stopLoss: 150, trailingStop: false, trailingStopDistance: 50, breakEven: false, breakEvenTrigger: 100, partialTP: false, partialClosePercentage: 50, partialTPTrigger: 200, sessions: { london: true, newyork: true, asia: true }, newsFilter: false, lotType: 'DYNAMIC', maxSlippage: 5.0, maxAveragingOrders: 1, averagingDistance: 100, averagingMultiplier: 1.0, averagingLotType: 'DYNAMIC', disableAveragingOnReversal: true }
  });

  // Current Signal state (AI Entry Scan)
  const [currentSignal, setCurrentSignal] = useState<ScalpingTradeSignal | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Position Scaling & Early Exit Analysis
  const [scalingCheckResult, setScalingCheckResult] = useState<Record<string, { allowed: boolean; reason: string }>>({});
  const [earlyExitResult, setEarlyExitResult] = useState<Record<string, { closeEarly: boolean; reversalProbability: number; exitReason: string }>>({});
  const [isEvaluatingScaling, setIsEvaluatingScaling] = useState<string | null>(null);
  const [isEvaluatingExit, setIsEvaluatingExit] = useState<string | null>(null);

  // Backtest result state
  const [backtestPeriod, setBacktestPeriod] = useState<number>(3);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestResult, setBacktestResult] = useState<ScalpingBacktestResult | null>(null);

  // Load Settings from Server on Mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/scalping/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.state) setGlobalState(data.state);
          if (data.configs) setModeConfigs(data.configs);
        }
      } catch (err) {
        console.error("Failed to load scalping configurations:", err);
      }
    };
    loadSettings();
  }, []);

  // Save Settings to Server
  const handleSaveSettings = async (updatedState?: Partial<ScalpingGlobalState>, updatedConfigs?: Partial<Record<ScalpingMode, ScalpingSettings>>) => {
    try {
      const nextState = updatedState ? { ...globalState, ...updatedState } : globalState;
      const nextConfigs = updatedConfigs ? { ...modeConfigs, ...updatedConfigs } : modeConfigs;
      
      const res = await fetch('/api/scalping/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: nextState, configs: nextConfigs })
      });
      if (res.ok) {
        const data = await res.json();
        setGlobalState(data.state);
        setModeConfigs(data.configs);
        onPlaySound('success');
        addNotification('ai', 'Scalping Architecture Updated', 'System parameters compiled and locked successfully.');
      }
    } catch (err) {
      console.error("Failed to persist scalping settings:", err);
    }
  };

  // Run AI Entry Scanner
  const runAISignalAnalysis = async () => {
    setIsScanning(true);
    setScanError(null);
    onPlaySound('success');
    try {
      const res = await fetch('/api/scalping/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          mode: selectedMode,
          currentPrice: undefined // Let backend lookup or fallback
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentSignal(data);
        onPlaySound('success');
      } else {
        throw new Error("Analysis node returned invalid headers.");
      }
    } catch (err: any) {
      setScanError(err.message || "Failed to establish AI stream context.");
      onPlaySound('warning');
    } finally {
      setIsScanning(false);
    }
  };

  // Place Trade from AI Signal
  const handleResetDailyMetrics = async () => {
    try {
      const res = await fetch('/api/scalping/reset-daily-metrics', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setGlobalState(data.state);
        onPlaySound('success');
        addNotification('ai', 'Risk Monitor Reset', 'Daily drawdown and consecutive losses have been reset. Engine resumed.');
      }
    } catch (err) {
      console.error("Failed to reset daily metrics:", err);
    }
  };

  const handleExecuteAISignal = async () => {
    if (!currentSignal) return;
    if (!capitalConnected) {
      addNotification('tp_sl', 'Broker Disconnected', 'Please link your Capital.com account under the Broker tab before executing live trades.');
      onPlaySound('warning');
      return;
    }

    const { symbol, type, entryPrice, stopLoss, takeProfit } = currentSignal;
    const activeConfig = modeConfigs[selectedMode];
    
    // Support DYNAMIC lot sizing
    let lotToPlace = activeConfig.lotSize;
    if (activeConfig.lotType === 'DYNAMIC') {
      const balance = profile.balance || 100000;
      const riskAmount = balance * (activeConfig.riskPercentage / 100);
      const pipValueApprox = symbol === 'EURUSD' ? 10 : (symbol === 'XAUUSD' ? 100 : 1);
      const denominator = activeConfig.stopLoss * pipValueApprox;
      lotToPlace = parseFloat((riskAmount / denominator).toFixed(2));
      if (lotToPlace < 0.01) lotToPlace = 0.01;
      if (lotToPlace > 5.0) lotToPlace = 5.0; // protective ceiling
    }
    
    addNotification('ai', 'Dispatching AI Order', `Submitting ${type} ${lotToPlace} lots of ${symbol} with protective stop (Lot Sizing: ${activeConfig.lotType})...`);
    const result = await onPlaceBrokerOrder(symbol, type, lotToPlace, stopLoss, takeProfit);
    
    if (result.success) {
      onPlaySound('success');
      setCurrentSignal(null);
    } else {
      onPlaySound('warning');
    }
  };

  // Evaluate Intelligent Averaging (Position Scaling)
  const evaluatePositionAveraging = async (posId: string, symbol: string, direction: 'BUY' | 'SELL', openLevel: number, currentLevel: number, count: number) => {
    setIsEvaluatingScaling(posId);
    try {
      const res = await fetch('/api/scalping/averaging-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          direction,
          entryPrice: openLevel,
          currentPrice: currentLevel,
          currentLevelCount: count,
          mode: globalState.currentMode
        })
      });
      if (res.ok) {
        const data = await res.json();
        setScalingCheckResult(prev => ({ ...prev, [posId]: data }));
        onPlaySound('success');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluatingScaling(null);
    }
  };

  // Trigger Averaging Scaled Order
  const executeAveragingOrder = async (posId: string, symbol: string, direction: 'BUY' | 'SELL', currentLevel: number) => {
    const activeConfig = modeConfigs[globalState.currentMode];
    const checkRes = scalingCheckResult[posId] as any;
    // Use high-fidelity server-evaluated lot size, fall back to reduced flat lot size
    const scalingLotSize = checkRes?.suggestedLot || parseFloat((activeConfig.lotSize * 0.75).toFixed(2));
    
    addNotification('ai', 'Scaling Position', `Adding averaged level for ${symbol}: ${direction} ${scalingLotSize} lots at $${currentLevel}...`);
    
    const result = await onPlaceBrokerOrder(symbol, direction, scalingLotSize);
    if (result.success) {
      onPlaySound('success');
      setScalingCheckResult(prev => {
        const updated = { ...prev };
        delete updated[posId];
        return updated;
      });
      syncCapitalPortfolio();
    } else {
      onPlaySound('warning');
    }
  };

  // Evaluate AI Early Exit
  const evaluateEarlyExit = async (posId: string, symbol: string, direction: 'BUY' | 'SELL', openLevel: number, currentLevel: number, profitLoss: number) => {
    setIsEvaluatingExit(posId);
    try {
      const res = await fetch('/api/scalping/exit-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          direction,
          entryPrice: openLevel,
          currentPrice: currentLevel,
          profitLoss,
          mode: globalState.currentMode
        })
      });
      if (res.ok) {
        const data = await res.json();
        setEarlyExitResult(prev => ({ ...prev, [posId]: data }));
        onPlaySound('success');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluatingExit(null);
    }
  };

  // Execute AI Early Exit Close
  const executeEarlyExitClose = async (posId: string, symbol: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/capital/position/${posId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        onPlaySound('success');
        addNotification('tp_sl', 'Early Exit Complete', `Secured position ${symbol} early based on AI structural exhaustion analysis.`);
        setEarlyExitResult(prev => {
          const updated = { ...prev };
          delete updated[posId];
          return updated;
        });
        syncCapitalPortfolio();
      } else {
        throw new Error();
      }
    } catch {
      addNotification('tp_sl', 'Exit Request Rejected', `Failed to execute immediate close on position ${symbol}.`);
      onPlaySound('warning');
    }
  };

  // Execute Backtest
  const runBacktestSimulation = async () => {
    setIsBacktesting(true);
    setBacktestResult(null);
    onPlaySound('success');
    try {
      const res = await fetch('/api/scalping/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          mode: selectedMode,
          periodMonths: backtestPeriod
        })
      });
      if (res.ok) {
        const data = await res.json();
        setBacktestResult(data);
        onPlaySound('success');
      }
    } catch (err) {
      console.error(err);
      onPlaySound('warning');
    } finally {
      setIsBacktesting(false);
    }
  };

  // Helper colors
  const getOutcomeColor = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return num >= 0 ? 'text-emerald-500' : 'text-rose-500';
  };

  return (
    <div className="space-y-6 relative z-10">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-900 pb-5">
        <div>
          <div className="flex items-center gap-2 text-amber-500 font-mono text-xs uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>Advanced Quantum Matrix Block</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase tracking-wider mt-1">
            Scalping Trading Module
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Institutional high-frequency order book analysis, intelligent position scaling, and automated risk managers.
          </p>
        </div>

        {/* Master Active Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSaveSettings({ isEngineActive: !globalState.isEngineActive })}
            className={`flex items-center gap-2 border px-4 py-2 rounded-2xl text-xs font-mono tracking-widest transition-all ${
              globalState.isEngineActive
                ? 'bg-amber-500/10 border-amber-500/35 text-amber-500 font-bold shadow-[0_0_15px_rgba(218,165,32,0.15)]'
                : 'bg-neutral-950 border-neutral-900 text-neutral-500'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${globalState.isEngineActive ? 'bg-amber-500 animate-ping' : 'bg-neutral-850'}`} />
            <span>{globalState.isEngineActive ? "SCALPING ACTIVE" : "SCALPING OFFLINE"}</span>
          </button>
        </div>
      </div>

      {/* Mode Quick Switcher Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        {MODES.map((m) => {
          const isSelected = selectedMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                setSelectedMode(m.id);
                onPlaySound('success');
                if (currentSignal) setCurrentSignal(null);
              }}
              className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-24 ${
                isSelected 
                  ? 'bg-gradient-to-br from-[#12110D] to-black border-amber-500/40 text-white shadow-xl' 
                  : 'bg-neutral-950/50 border-neutral-900 text-neutral-400 hover:border-neutral-850 hover:bg-neutral-950'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-mono uppercase tracking-wider ${isSelected ? 'text-amber-500 font-bold' : 'text-neutral-500'}`}>
                  {m.name}
                </span>
                <Cpu className={`h-3.5 w-3.5 ${isSelected ? 'text-amber-500' : 'text-neutral-600'}`} />
              </div>
              <p className="text-[9px] line-clamp-2 leading-relaxed text-neutral-500 mt-1">
                {m.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex border-b border-neutral-900 pb-px gap-1">
        {[
          { id: 'live', label: 'AI Entry Scanner & Monitor', icon: Activity },
          { id: 'settings', label: 'Settings & Hard Limits', icon: Sliders },
          { id: 'backtest', label: 'Historical Backtesting', icon: BarChart3 },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id as any);
              onPlaySound('success');
            }}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold tracking-wider border-b-2 transition-all relative ${
              activeTab === t.id
                ? 'border-amber-500 text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <t.icon className="h-4 w-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content dispatch area */}
      <div className="min-h-[400px]">
        
        {/* TAB 1: LIVE SCANNER */}
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LHS: SCALPING SCANNER controls & AI response */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-neutral-950/80 border border-neutral-900 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="h-4 w-4 text-amber-500" />
                    AI Institutional Scanner
                  </h2>
                  <span className="text-[10px] text-neutral-500 font-mono">TIMEFRAME: {modeConfigs[selectedMode].timeframe}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                    {SYMBOLS.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSelectedSymbol(s);
                          onPlaySound('success');
                          if (currentSignal) setCurrentSignal(null);
                        }}
                        className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${
                          selectedSymbol === s 
                            ? 'bg-amber-500 text-black font-bold' 
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={runAISignalAnalysis}
                    disabled={isScanning}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-xs py-2 px-5 rounded-xl disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>{isScanning ? "Scanning Market..." : "Analyze Market"}</span>
                  </button>
                </div>

                {scanError && (
                  <div className="p-4 bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs rounded-xl flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>{scanError}</p>
                  </div>
                )}

                {/* AI Analysis response screen */}
                <AnimatePresence mode="wait">
                  {currentSignal ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6 pt-2"
                    >
                      {/* Confidence Scores Gauge & Decision */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-neutral-900 p-5 rounded-2xl bg-neutral-900/10">
                        {/* Overall meter */}
                        <div className="flex flex-col items-center justify-center text-center p-3 border-r border-neutral-900/50 md:border-r">
                          <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono">Overall Confidence</span>
                          <div className="text-4xl font-extrabold text-amber-500 font-mono mt-2">
                            {currentSignal.confidence.overall}%
                          </div>
                          <span className="text-[9px] text-neutral-500 font-mono mt-1">RECOMMENDATION</span>
                          <span className={`text-xs font-bold mt-0.5 px-3 py-0.5 rounded-full ${
                            currentSignal.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {currentSignal.type} @ ${currentSignal.entryPrice}
                          </span>
                        </div>

                        {/* Detailed Confidence Grid */}
                        <div className="md:col-span-2 grid grid-cols-2 gap-3.5 pl-0 md:pl-4">
                          {[
                            { label: 'Entry Confidence', val: currentSignal.confidence.entry },
                            { label: 'Exit Confidence', val: currentSignal.confidence.exit },
                            { label: 'Risk Protection Score', val: currentSignal.confidence.risk, invert: true },
                            { label: 'Trend Strength', val: currentSignal.confidence.trendStrength },
                            { label: 'Volatility Level', val: currentSignal.confidence.volatility },
                          ].map((c) => (
                            <div key={c.label}>
                              <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                                <span>{c.label}</span>
                                <span className="font-bold text-white">{c.val}%</span>
                              </div>
                              <div className="h-1.5 bg-neutral-900 rounded-full mt-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${c.invert ? 'bg-rose-500' : 'bg-amber-500'}`} 
                                  style={{ width: `${c.val}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 16 Item Matrix display */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">SMC Quantum Matrix Checks (16 Items Analyzed)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                          {[
                            { label: "Trend Mode", value: currentSignal.analysis.trend, status: "good" },
                            { label: "Market Structure", value: currentSignal.analysis.marketStructure, status: "good" },
                            { label: "Liquidity Status", value: currentSignal.analysis.liquidity, status: "good" },
                            { label: "BOS Confirmation", value: currentSignal.analysis.bos, status: "good" },
                            { label: "CHOCH Confirmation", value: currentSignal.analysis.choch, status: "good" },
                            { label: "FVG Mitigation", value: currentSignal.analysis.fvg, status: "good" },
                            { label: "ATR (Vol)", value: currentSignal.analysis.atr.toFixed(4), status: "info" },
                            { label: "RSI Momentum", value: currentSignal.analysis.rsi, status: "info" },
                            { label: "MACD State", value: currentSignal.analysis.macd, status: "info" },
                            { label: "EMA Location", value: currentSignal.analysis.ema, status: "info" },
                            { label: "VWAP Convergence", value: currentSignal.analysis.vwap, status: "info" },
                            { label: "Key Level", value: currentSignal.analysis.supportResistance, status: "text" },
                            { label: "Block Zone", value: currentSignal.analysis.supplyDemand, status: "text" },
                            { label: "Volume Profile", value: currentSignal.analysis.volume, status: "good" },
                            { label: "SMC Block Finder", value: currentSignal.analysis.orderBlocks, status: "text" },
                            { label: "Risk Exposure", value: `${modeConfigs[selectedMode].riskPercentage}%`, status: "info" },
                          ].map((item, idx) => (
                            <div key={idx} className="bg-neutral-900/60 border border-neutral-900 p-2.5 rounded-xl space-y-1">
                              <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-medium block">{item.label}</span>
                              <span className="text-[10px] font-mono text-white truncate block" title={String(item.value)}>
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Protection stops detail */}
                      <div className="grid grid-cols-2 gap-4 border border-neutral-900 p-4 rounded-xl bg-neutral-900/20 font-mono text-xs">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Protective Stop Loss</span>
                          <span className="text-rose-400 font-extrabold text-sm">${currentSignal.stopLoss}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold block mb-1">Take Profit Target</span>
                          <span className="text-emerald-400 font-extrabold text-sm">${currentSignal.takeProfit}</span>
                        </div>
                      </div>

                      {/* Reasoning and Execution button */}
                      <div className="space-y-4">
                        <div className="p-4 bg-[#12110D] border border-amber-500/20 text-neutral-300 text-xs rounded-xl leading-relaxed">
                          <span className="font-bold text-amber-500 uppercase tracking-widest text-[9px] block mb-1.5">AI Trade Execution Narrative</span>
                          <p className="italic">"{currentSignal.analysis.reasoning}"</p>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => setCurrentSignal(null)}
                            className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer"
                          >
                            Dismiss Setup
                          </button>
                          
                          <button
                            onClick={handleExecuteAISignal}
                            className="flex-grow flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs py-2.5 px-6 rounded-xl transition-all cursor-pointer uppercase tracking-wider shadow-lg shadow-amber-500/10"
                          >
                            <Zap className="h-4 w-4" />
                            <span>Authorize & Submit Direct Broker Order</span>
                          </button>
                        </div>
                      </div>

                    </motion.div>
                  ) : (
                    !isScanning && (
                      <div className="text-center py-12 text-neutral-500 text-xs">
                        <Terminal className="h-8 w-8 text-neutral-700 mx-auto mb-3.5" />
                        <p>Matrix Node standby. Choose an asset and click **Analyze Market** to generate a trade setup.</p>
                      </div>
                    )
                  )}
                </AnimatePresence>
              </div>

            </div>

            {/* RHS: ACTIVE POSITIONS & MULTI-STATE MONITOR */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Floating state display */}
              <div className="bg-gradient-to-br from-[#12110D] to-black border border-amber-500/25 rounded-3xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-amber-500" />
                  Scalping Risk Sentinel
                </h3>

                <div className="grid grid-cols-2 gap-3.5 font-mono text-xs">
                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900">
                    <span className="text-[8px] text-neutral-500 uppercase block mb-1">Today's P/L</span>
                    <span className={`font-bold text-sm ${getOutcomeColor(globalState.todayProfitLoss)}`}>
                      ${globalState.todayProfitLoss >= 0 ? '+' : ''}{globalState.todayProfitLoss.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900">
                    <span className="text-[8px] text-neutral-500 uppercase block mb-1">Current Drawdown</span>
                    <span className="font-bold text-rose-400 text-sm">{globalState.todayDrawdown.toFixed(2)}%</span>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900">
                    <span className="text-[8px] text-neutral-500 uppercase block mb-1">Consecutive Losses</span>
                    <span className="font-bold text-white text-sm">{globalState.consecutiveLosses} / {globalState.consecutiveLossesLimit}</span>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900">
                    <span className="text-[8px] text-neutral-500 uppercase block mb-1">Recovery State</span>
                    <span className={`font-bold text-[10px] uppercase block ${globalState.recoveryModeActive ? 'text-amber-500' : 'text-neutral-500'}`}>
                      {globalState.recoveryModeActive ? "RECOVERY ON" : "STANDARD MODE"}
                    </span>
                  </div>
                </div>

                {globalState.isTradingPaused && (
                  <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl text-rose-400 text-[10px] space-y-2">
                    <div>
                      <span className="font-bold uppercase tracking-wider block">⚠️ Hard Risk Limits Paused</span>
                      <p>Trading is paused until {globalState.pauseEndTime ? new Date(globalState.pauseEndTime).toLocaleTimeString() : 'specified time'}.</p>
                    </div>
                    <button
                      onClick={handleResetDailyMetrics}
                      className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[9px] uppercase tracking-wider py-1.5 px-3 rounded-lg transition-all cursor-pointer text-center"
                    >
                      Reset Metrics & Resume Engine
                    </button>
                  </div>
                )}
              </div>

              {/* ACTIVE POSITIONS PORTFOLIO */}
              <div className="bg-neutral-950/80 border border-neutral-900 rounded-3xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Active Scalping Positions ({activeSignals.length})
                </h3>

                <div className="space-y-3">
                  {activeSignals.length > 0 ? (
                    activeSignals.map((pos) => {
                      const scalCheck = scalingCheckResult[pos.id];
                      const exitCheck = earlyExitResult[pos.id];

                      return (
                        <div key={pos.id} className="bg-neutral-900/40 border border-neutral-900 p-4 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{pos.symbol}</span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              pos.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                            }`}>
                              {pos.type} {pos.volume || 0.1} Lots
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-neutral-400">
                            <span>Entry Price: ${pos.entryPrice}</span>
                            <span className="text-right">Current Price: ${pos.currentPrice}</span>
                            <span className={`${getOutcomeColor(pos.profitPips)} font-bold`}>
                              PnL: {pos.profitPips >= 0 ? '+' : ''}{pos.profitPips} pips
                            </span>
                            <span className="text-right text-neutral-500">Stop Loss: ${pos.stopLoss}</span>
                          </div>

                          {/* Dynamic controls for intelligent averaging & early exit checks */}
                          <div className="flex gap-2 pt-1 border-t border-neutral-900/60">
                            <button
                              onClick={() => evaluatePositionAveraging(pos.id, pos.symbol, pos.type, pos.entryPrice, pos.currentPrice, pos.averagingLevels || 0)}
                              disabled={isEvaluatingScaling === pos.id}
                              className="text-[9px] bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white font-mono px-2.5 py-1.5 rounded-lg border border-neutral-800 transition-all cursor-pointer flex-1"
                            >
                              {isEvaluatingScaling === pos.id ? "Averaging Check..." : "Scale-In Check"}
                            </button>

                            <button
                              onClick={() => evaluateEarlyExit(pos.id, pos.symbol, pos.type, pos.entryPrice, pos.currentPrice, pos.profitPips)}
                              disabled={isEvaluatingExit === pos.id}
                              className="text-[9px] bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white font-mono px-2.5 py-1.5 rounded-lg border border-neutral-800 transition-all cursor-pointer flex-1"
                            >
                              {isEvaluatingExit === pos.id ? "Early Exit Check..." : "Early Exit Check"}
                            </button>
                          </div>

                          {/* Scaling Averaging Check Response Display */}
                          {scalCheck && (
                            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2 text-[10px] font-mono leading-relaxed">
                              <div className="flex justify-between font-bold">
                                <span className="text-neutral-400">Averaging Check Status:</span>
                                <span className={scalCheck.allowed ? "text-emerald-500" : "text-rose-500"}>
                                  {scalCheck.allowed ? "APPROVED" : "BLOCKED"}
                                </span>
                              </div>
                              <p className="text-neutral-400 leading-normal">{scalCheck.reason}</p>
                              {scalCheck.allowed && (
                                <button
                                  onClick={() => executeAveragingOrder(pos.id, pos.symbol, pos.type, pos.currentPrice)}
                                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-1 px-2 rounded mt-1 transition-all"
                                >
                                  Trigger Scaled Level {pos.averagingLevels ? pos.averagingLevels + 1 : 1} Order
                                </button>
                              )}
                            </div>
                          )}

                          {/* Early Exit Check Response Display */}
                          {exitCheck && (
                            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2 text-[10px] font-mono leading-relaxed">
                              <div className="flex justify-between font-bold">
                                <span className="text-neutral-400">AI Reversal Risk Check:</span>
                                <span className="text-amber-500">{exitCheck.reversalProbability}% Prob</span>
                              </div>
                              <p className="text-neutral-400 leading-normal">{exitCheck.exitReason}</p>
                              {exitCheck.closeEarly && (
                                <button
                                  onClick={() => executeEarlyExitClose(pos.id, pos.symbol)}
                                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-1 px-2 rounded mt-1 transition-all"
                                >
                                  Execute AI Early Take-Profit / Close
                                </button>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-neutral-600 text-xs font-mono">
                      No active scalping positions currently monitored on Capital.com.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* LHS: CHOSEN MODE INDEPENDENT PARAMETERS */}
            <div className="md:col-span-2 bg-neutral-950/80 border border-neutral-900 rounded-3xl p-6 space-y-6">
              <div className="border-b border-neutral-900 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-amber-500" />
                  Mode Parameters • {MODES.find(m => m.id === selectedMode)?.name}
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">Define independent parameters that apply exclusively inside this mode.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">Timeframe Matrix</label>
                  <select
                    value={modeConfigs[selectedMode].timeframe}
                    onChange={(e) => {
                      const updated = { ...modeConfigs };
                      updated[selectedMode].timeframe = e.target.value;
                      setModeConfigs(updated);
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2 px-3 text-white focus:outline-none focus:border-amber-500/50"
                  >
                    {['1M', '5M', '15M', '1H', '4H', '1D'].map((tf) => (
                      <option key={tf} value={tf}>{tf}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">Lot Sizing Control</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={modeConfigs[selectedMode].lotSize}
                    onChange={(e) => {
                      const updated = { ...modeConfigs };
                      updated[selectedMode].lotSize = parseFloat(e.target.value) || 0.1;
                      setModeConfigs(updated);
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2 px-3 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">Maximum Spread Capture (pips)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={modeConfigs[selectedMode].maxSpread}
                    onChange={(e) => {
                      const updated = { ...modeConfigs };
                      updated[selectedMode].maxSpread = parseFloat(e.target.value) || 1.5;
                      setModeConfigs(updated);
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2 px-3 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">Risk Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={modeConfigs[selectedMode].riskPercentage}
                    onChange={(e) => {
                      const updated = { ...modeConfigs };
                      updated[selectedMode].riskPercentage = parseFloat(e.target.value) || 1.5;
                      setModeConfigs(updated);
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2 px-3 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">Take Profit Target (Pips)</label>
                  <input
                    type="number"
                    value={modeConfigs[selectedMode].takeProfit}
                    onChange={(e) => {
                      const updated = { ...modeConfigs };
                      updated[selectedMode].takeProfit = parseInt(e.target.value) || 10;
                      setModeConfigs(updated);
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2 px-3 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">Stop Loss Target (Pips)</label>
                  <input
                    type="number"
                    value={modeConfigs[selectedMode].stopLoss}
                    onChange={(e) => {
                      const updated = { ...modeConfigs };
                      updated[selectedMode].stopLoss = parseInt(e.target.value) || 15;
                      setModeConfigs(updated);
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2 px-3 text-white font-mono"
                  />
                </div>
              </div>

              {/* Advanced Risk & Position Scaling (Averaging / Scale-In) */}
              <div className="border-t border-neutral-900 pt-5">
                <h4 className="text-[11px] font-extrabold text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Intelligent Position Scaling & Scale-In (Averaging)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">Primary Lot Type</label>
                    <select
                      value={modeConfigs[selectedMode].lotType}
                      onChange={(e) => {
                        const updated = { ...modeConfigs };
                        updated[selectedMode].lotType = e.target.value as 'FIXED' | 'DYNAMIC';
                        setModeConfigs(updated);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2 px-3 text-white focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="FIXED">FIXED LOT (Flat Position Size)</option>
                      <option value="DYNAMIC">DYNAMIC RISK (Risk % Calculation)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">Maximum Allowed Slippage (Pips)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={modeConfigs[selectedMode].maxSlippage}
                      onChange={(e) => {
                        const updated = { ...modeConfigs };
                        updated[selectedMode].maxSlippage = parseFloat(e.target.value) || 1.0;
                        setModeConfigs(updated);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2 px-3 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">Maximum Averaging Orders (Scale-In)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={modeConfigs[selectedMode].maxAveragingOrders}
                      onChange={(e) => {
                        const updated = { ...modeConfigs };
                        updated[selectedMode].maxAveragingOrders = parseInt(e.target.value) || 0;
                        setModeConfigs(updated);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2 px-3 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">Min Distance Between Entries (Pips)</label>
                    <input
                      type="number"
                      min="1"
                      value={modeConfigs[selectedMode].averagingDistance}
                      onChange={(e) => {
                        const updated = { ...modeConfigs };
                        updated[selectedMode].averagingDistance = parseInt(e.target.value) || 10;
                        setModeConfigs(updated);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2 px-3 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">Averaging Lot Size Multiplier</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      value={modeConfigs[selectedMode].averagingMultiplier}
                      onChange={(e) => {
                        const updated = { ...modeConfigs };
                        updated[selectedMode].averagingMultiplier = parseFloat(e.target.value) || 1.0;
                        setModeConfigs(updated);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2 px-3 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">Averaging Lot Sizing Type</label>
                    <select
                      value={modeConfigs[selectedMode].averagingLotType}
                      onChange={(e) => {
                        const updated = { ...modeConfigs };
                        updated[selectedMode].averagingLotType = e.target.value as 'FIXED' | 'DYNAMIC';
                        setModeConfigs(updated);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2 px-3 text-white focus:outline-none focus:border-amber-500/50"
                    >
                      <option value="FIXED">FIXED (Multiply Flat Lot)</option>
                      <option value="DYNAMIC">DYNAMIC (Multiply Risk Sizing)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="flex items-center gap-2.5 p-3 bg-neutral-900/30 rounded-xl border border-neutral-900 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modeConfigs[selectedMode].disableAveragingOnReversal}
                      onChange={(e) => {
                        const updated = { ...modeConfigs };
                        updated[selectedMode].disableAveragingOnReversal = e.target.checked;
                        setModeConfigs(updated);
                      }}
                      className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold text-white block">Disable Scale-In on SMC Trend Reversal</span>
                      <span className="text-[9px] text-neutral-500">Automatically block martingale scaling if market structure shift is verified against us</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Advanced protections checks toggles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-neutral-900 pt-5 text-xs text-neutral-400">
                <label className="flex items-center gap-2.5 p-3.5 bg-neutral-900/30 rounded-xl border border-neutral-900 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modeConfigs[selectedMode].trailingStop}
                    onChange={(e) => {
                      const updated = { ...modeConfigs };
                      updated[selectedMode].trailingStop = e.target.checked;
                      setModeConfigs(updated);
                    }}
                    className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-white block">Auto Trailing Stop</span>
                    <span className="text-[9px] text-neutral-500">Lock profit inside dynamic moves</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3.5 bg-neutral-900/30 rounded-xl border border-neutral-900 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modeConfigs[selectedMode].breakEven}
                    onChange={(e) => {
                      const updated = { ...modeConfigs };
                      updated[selectedMode].breakEven = e.target.checked;
                      setModeConfigs(updated);
                    }}
                    className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-white block">Auto Break Even</span>
                    <span className="text-[9px] text-neutral-500">Move protective stop to entry</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3.5 bg-neutral-900/30 rounded-xl border border-neutral-900 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modeConfigs[selectedMode].newsFilter}
                    onChange={(e) => {
                      const updated = { ...modeConfigs };
                      updated[selectedMode].newsFilter = e.target.checked;
                      setModeConfigs(updated);
                    }}
                    className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-white block">High-Impact News Filter</span>
                    <span className="text-[9px] text-neutral-500">Halt scanner during macro releases</span>
                  </div>
                </label>
              </div>

              {/* Sessions settings */}
              <div className="space-y-3.5 border-t border-neutral-900 pt-5">
                <span className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Trading Session Restrictions</span>
                <div className="grid grid-cols-3 gap-3">
                  {['london', 'newyork', 'asia'].map((sess) => {
                    const isSessEnabled = modeConfigs[selectedMode].sessions[sess as keyof typeof modeConfigs[typeof selectedMode]['sessions']];
                    return (
                      <button
                        key={sess}
                        onClick={() => {
                          const updated = { ...modeConfigs };
                          const currentSessObj = updated[selectedMode].sessions;
                          (currentSessObj as any)[sess] = !isSessEnabled;
                          setModeConfigs(updated);
                          onPlaySound('success');
                        }}
                        className={`py-2 px-4 rounded-xl border text-xs font-mono font-bold uppercase transition-all ${
                          isSessEnabled
                            ? 'bg-amber-500/10 border-amber-500/25 text-amber-500 shadow-sm'
                            : 'bg-neutral-900/50 border-neutral-900 text-neutral-500'
                        }`}
                      >
                        {sess} Session
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save settings action button */}
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => handleSaveSettings(undefined, modeConfigs)}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs py-2.5 px-6 rounded-xl transition-all uppercase tracking-wider cursor-pointer"
                >
                  Persist Mode Parameters
                </button>
              </div>
            </div>

            {/* RHS: HARD SYSTEM LIMITS */}
            <div className="bg-neutral-950/80 border border-neutral-900 rounded-3xl p-6 space-y-6">
              <div className="border-b border-neutral-900 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-amber-500" />
                  Hard Risk Limits
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">Strict system boundaries that cannot be breached by the automated engine.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">Daily Loss Limit (USD)</label>
                  <input
                    type="number"
                    value={globalState.dailyLossLimit}
                    onChange={(e) => setGlobalState(s => ({ ...s, dailyLossLimit: parseInt(e.target.value) || 500 }))}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2.5 px-3.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">Daily Profit Target (USD)</label>
                  <input
                    type="number"
                    value={globalState.dailyProfitTarget}
                    onChange={(e) => setGlobalState(s => ({ ...s, dailyProfitTarget: parseInt(e.target.value) || 1000 }))}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2.5 px-3.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">Max Consecutive Losses</label>
                  <input
                    type="number"
                    value={globalState.consecutiveLossesLimit}
                    onChange={(e) => setGlobalState(s => ({ ...s, consecutiveLossesLimit: parseInt(e.target.value) || 4 }))}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2.5 px-3.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1.5">Pause After Limit Hit (Hrs)</label>
                  <input
                    type="number"
                    value={globalState.tradingPauseDurationHours}
                    onChange={(e) => setGlobalState(s => ({ ...s, tradingPauseDurationHours: parseInt(e.target.value) || 12 }))}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-2.5 px-3.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => handleSaveSettings(globalState)}
                  className="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 hover:text-white font-bold text-xs py-2.5 rounded-xl transition-all uppercase tracking-wider cursor-pointer text-center"
                >
                  Save Global Hard Limits
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: BACKTESTING */}
        {activeTab === 'backtest' && (
          <div className="space-y-6">
            
            {/* Backtest configuration block */}
            <div className="bg-neutral-950/80 border border-neutral-900 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-amber-500" />
                  Historical Simulation Sandbox
                </h3>
                <span className="text-[10px] text-neutral-500 font-mono">BACKTEST ENGINE: v2.4</span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 font-semibold uppercase">Simulation Period:</span>
                  <select
                    value={backtestPeriod}
                    onChange={(e) => setBacktestPeriod(parseInt(e.target.value))}
                    className="bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-1.5 px-3 text-white focus:outline-none"
                  >
                    {[1, 3, 6, 12].map((m) => (
                      <option key={m} value={m}>{m} Month{m > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 font-semibold uppercase">Asset:</span>
                  <select
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 text-xs rounded-xl py-1.5 px-3 text-white focus:outline-none font-mono"
                  >
                    {SYMBOLS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={runBacktestSimulation}
                  disabled={isBacktesting}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs py-2 px-6 rounded-xl disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-black" />
                  <span>{isBacktesting ? "Simulating Strategy..." : "Run Historical Backtest"}</span>
                </button>
              </div>
            </div>

            {/* Backtest Result Grid */}
            <AnimatePresence mode="wait">
              {backtestResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
                    {[
                      { label: "Win Rate", value: `${backtestResult.winRate}%`, icon: Percent },
                      { label: "Profit Factor", value: backtestResult.profitFactor, icon: Activity },
                      { label: "Max Drawdown", value: `${backtestResult.maxDrawdown}%`, icon: AlertTriangle },
                      { label: "Average Risk-Reward", value: `1:${backtestResult.averageRR}`, icon: Sliders },
                      { label: "Total Trades", value: backtestResult.totalTrades, icon: Cpu },
                      { label: "Net Profit / Yield", value: `$${backtestResult.netProfit.toLocaleString()}`, icon: DollarSign, isProfit: true },
                    ].map((card, idx) => (
                      <div key={idx} className="bg-neutral-950 border border-neutral-900 p-4 rounded-2xl flex flex-col justify-between h-24">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold">{card.label}</span>
                          <card.icon className="h-3.5 w-3.5 text-neutral-600" />
                        </div>
                        <span className={`text-sm font-extrabold font-mono mt-1 ${
                          card.isProfit ? getOutcomeColor(backtestResult.netProfit) : 'text-white'
                        }`}>
                          {card.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Equity Curve SVG Plot & Monthly Performance Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Equity curve plotter */}
                    <div className="lg:col-span-2 bg-neutral-950 border border-neutral-900 p-6 rounded-3xl space-y-4">
                      <span className="block text-xs font-bold text-white uppercase tracking-wider">Equity Growth Curve</span>
                      
                      {/* Interactive responsive SVG Plotting */}
                      <div className="h-64 relative">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200">
                          <defs>
                            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(218,165,32,0.15)" />
                              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                            </linearGradient>
                          </defs>

                          {/* Horizontal Gridlines */}
                          {[0, 50, 100, 150, 200].map((y) => (
                            <line
                              key={y}
                              x1="0"
                              y1={y}
                              x2="500"
                              y2={y}
                              stroke="#121214"
                              strokeWidth="1"
                            />
                          ))}

                          {/* Compute SVG Path Coordinates */}
                          {(() => {
                            const dataLength = backtestResult.equityCurve.length;
                            if (dataLength < 2) return null;

                            const balances = backtestResult.equityCurve.map(e => e.balance);
                            const minBal = Math.min(...balances) * 0.99;
                            const maxBal = Math.max(...balances) * 1.01;
                            const balRange = maxBal - minBal;

                            const coords = backtestResult.equityCurve.map((e, idx) => {
                              const x = (idx / (dataLength - 1)) * 500;
                              const y = 200 - ((e.balance - minBal) / balRange) * 160 - 20; // leaves 20px padding
                              return { x, y };
                            });

                            const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
                            const areaPath = `${linePath} L 500 200 L 0 200 Z`;

                            return (
                              <>
                                <path d={areaPath} fill="url(#curveGradient)" />
                                <path d={linePath} fill="none" stroke="#D1A12C" strokeWidth="2" strokeLinecap="round" />
                                
                                {/* Coordinates labels */}
                                <text x="5" y="25" fill="#555" fontSize="8" fontFamily="monospace">
                                  MAX: ${maxBal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </text>
                                <text x="5" y="195" fill="#555" fontSize="8" fontFamily="monospace">
                                  MIN: ${minBal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </text>
                              </>
                            );
                          })()}
                        </svg>
                      </div>
                    </div>

                    {/* Monthly Performance breakdown bar chart */}
                    <div className="bg-neutral-950 border border-neutral-900 p-6 rounded-3xl space-y-4">
                      <span className="block text-xs font-bold text-white uppercase tracking-wider">Monthly Profit Share</span>
                      <div className="space-y-4 pt-2">
                        {backtestResult.monthlyPerformance.map((item, idx) => {
                          const percentageWidth = Math.min(100, (item.profit / 15000) * 100);
                          return (
                            <div key={idx} className="space-y-1 font-mono text-xs">
                              <div className="flex justify-between text-neutral-400">
                                <span>{item.month}</span>
                                <span className="font-bold text-emerald-500">+${item.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                              </div>
                              <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full" 
                                  style={{ width: `${Math.max(10, percentageWidth)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Trade history logs table */}
                  <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-6 space-y-4">
                    <span className="block text-xs font-bold text-white uppercase tracking-wider">Simulation Trade Ledger</span>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-neutral-900 text-neutral-500 font-mono">
                            <th className="pb-3 uppercase tracking-wider font-semibold">Time</th>
                            <th className="pb-3 uppercase tracking-wider font-semibold">Direction</th>
                            <th className="pb-3 uppercase tracking-wider font-semibold">Entry / Exit</th>
                            <th className="pb-3 uppercase tracking-wider font-semibold">Profit (USD)</th>
                            <th className="pb-3 uppercase tracking-wider font-semibold">Pips</th>
                            <th className="pb-3 uppercase tracking-wider font-semibold text-right">AI Trade Narrative Decision</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900/40">
                          {backtestResult.trades.slice(0, 15).map((trade, idx) => (
                            <tr key={idx} className="hover:bg-neutral-900/20">
                              <td className="py-3 text-neutral-400 font-mono">{new Date(trade.entryTime).toLocaleDateString()}</td>
                              <td className="py-3">
                                <span className={`font-mono font-bold ${
                                  trade.type === 'BUY' ? 'text-emerald-500' : 'text-rose-500'
                                }`}>
                                  {trade.type}
                                </span>
                              </td>
                              <td className="py-3 text-neutral-300 font-mono">${trade.entryPrice} ➔ ${trade.exitPrice}</td>
                              <td className={`py-3 font-mono font-bold ${getOutcomeColor(trade.profit)}`}>
                                {trade.profit >= 0 ? '+' : ''}${trade.profit.toLocaleString()}
                              </td>
                              <td className={`py-3 font-mono ${getOutcomeColor(trade.pips)}`}>
                                {trade.pips >= 0 ? '+' : ''}{trade.pips}
                              </td>
                              <td className="py-3 text-neutral-400 italic text-right leading-relaxed max-w-sm truncate" title={trade.aiDecision}>
                                "{trade.aiDecision}"
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}

      </div>

    </div>
  );
}
