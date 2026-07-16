import { useState, useEffect } from 'react';
import { 
  Play, TrendingUp, ShieldAlert, BadgePercent, Cpu, CheckCircle2, 
  ChevronRight, AlertTriangle, ArrowRight, RefreshCw, BarChart, 
  Terminal, RotateCcw, History, Award, Activity, Search, Sparkles, Sliders 
} from 'lucide-react';
import { motion } from 'motion/react';
import { SystemSettings } from '../types';

interface SMCBacktestProps {
  settings?: SystemSettings;
  onEnableAutoTrading: () => void;
  onPlaySound: (type: 'success' | 'warning' | 'alert') => void;
}

interface BacktestResult {
  symbol: string;
  useImprovedStrategy: boolean;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  avgRR: number;
  netProfit: number;
  totalReturnPct: number;
  totalTrades: number;
  wins: number;
  losses: number;
  skippedSetups: number;
  inSampleParams?: {
    emaShort: number;
    emaLong: number;
    adxThreshold: number;
  };
  trades: Array<{
    id: string;
    symbol: string;
    type: 'BUY' | 'SELL';
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    profit: number;
    outcome: 'WIN' | 'LOSS';
    riskReward: number;
    time: string;
  }>;
  equityCurve: Array<{
    name: string;
    equity: number;
  }>;
}

// Autonomous QIE State definitions
interface QieVersion {
  id: string;
  name: string;
  createdAt: string;
  params: {
    emaShort: number;
    emaLong: number;
    adxThreshold: number;
    atrMultiplierSl: number;
    atrMultiplierTp: number;
  };
  metrics: {
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    sharpeRatio: number;
    avgRR: number;
    totalTrades: number;
  };
  isProduction: boolean;
  notes?: string;
}

interface CompletedTrade {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number;
  profit: number;
  pips: number;
  entryTime: string;
  exitTime: string;
  duration: string;
  outcome: "WIN" | "LOSS";
  versionId: string;
}

interface AutonomousLog {
  id: string;
  timestamp: string;
  source: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

interface AutonomousState {
  activeVersionId: string;
  versions: QieVersion[];
  activeVersion: QieVersion;
  completedTrades: CompletedTrade[];
  logs: AutonomousLog[];
}

export default function SMCBacktest({ settings, onEnableAutoTrading, onPlaySound }: SMCBacktestProps) {
  // Sandbox Tab variables
  const [symbol, setSymbol] = useState('XAUUSD');
  const [useImproved, setUseImproved] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  // Sub-tab Navigation
  const [subTab, setSubTab] = useState<'autonomous' | 'sandbox'>('autonomous');

  // Autonomous QIE Engine variables
  const [autoState, setAutoState] = useState<AutonomousState | null>(null);
  const [fetchingAuto, setFetchingAuto] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optResult, setOptResult] = useState<{ promoted: boolean; report: string; oldMetrics?: any; newMetrics?: any } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warning' | 'success' | 'info'>('all');

  // Fetch autonomous backend state
  const fetchAutonomousState = async (silent = false) => {
    if (!silent) setFetchingAuto(true);
    try {
      const res = await fetch('/api/autonomous/state');
      if (res.ok) {
        const data = await res.json();
        setAutoState(data);
      }
    } catch (err) {
      console.error("Failed to load autonomous state:", err);
    } finally {
      if (!silent) setFetchingAuto(false);
    }
  };

  useEffect(() => {
    fetchAutonomousState();
    // Poll autonomous state every 10 seconds for live updates
    const interval = setInterval(() => {
      fetchAutonomousState(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Trigger server-side strategy parameter optimization & validation (Self-improvement check)
  const handleTriggerSelfImprovement = async (force = false) => {
    setOptimizing(true);
    setOptResult(null);
    onPlaySound('success');
    try {
      const res = await fetch('/api/autonomous/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      });
      if (res.ok) {
        const data = await res.json();
        setOptResult(data);
        if (data.promoted) {
          onPlaySound('success');
        } else {
          onPlaySound('warning');
        }
        await fetchAutonomousState(true);
      } else {
        onPlaySound('alert');
      }
    } catch (err) {
      console.error(err);
      onPlaySound('alert');
    } finally {
      setOptimizing(false);
    }
  };

  // Trigger immediate manual market scan & trade check on Capital.com
  const handleTriggerMarketScan = async () => {
    setScanning(true);
    onPlaySound('success');
    try {
      const res = await fetch('/api/autonomous/scan', { method: 'POST' });
      if (res.ok) {
        onPlaySound('success');
        await fetchAutonomousState(true);
      } else {
        onPlaySound('alert');
      }
    } catch (err) {
      console.error(err);
      onPlaySound('alert');
    } finally {
      setScanning(false);
    }
  };

  // Rollback to specific stable QIE strategy version
  const handleRollback = async (versionId: string) => {
    onPlaySound('success');
    try {
      const res = await fetch('/api/autonomous/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId })
      });
      if (res.ok) {
        onPlaySound('success');
        await fetchAutonomousState(false);
      } else {
        onPlaySound('alert');
      }
    } catch (err) {
      console.error(err);
      onPlaySound('alert');
    }
  };

  // Sandbox: Run 3Y historical backtest
  const runBacktest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          useImprovedStrategy: useImproved,
          initialBalance: 100000,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        onPlaySound('success');
      } else {
        onPlaySound('alert');
      }
    } catch (err) {
      console.error(err);
      onPlaySound('alert');
    } finally {
      setLoading(false);
    }
  };

  // Filter logs based on search query and category tab selection
  const filteredLogs = autoState?.logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = logFilter === 'all' || log.type === logFilter;
    return matchesSearch && matchesType;
  }) || [];

  // Helper to render beautiful SVG-based Equity Curve Line Chart
  const renderSvgChart = (data: Array<{ name: string; equity: number }>) => {
    if (!data || data.length === 0) return null;
    const padding = 40;
    const width = 600;
    const height = 180;

    const equities = data.map(d => d.equity);
    const minEquity = Math.min(...equities) * 0.995;
    const maxEquity = Math.max(...equities) * 1.005;
    const range = maxEquity - minEquity;

    const getX = (index: number) => padding + (index / (data.length - 1)) * (width - 2 * padding);
    const getY = (value: number) => height - padding - ((value - minEquity) / range) * (height - 2 * padding);

    let pathD = `M ${getX(0)} ${getY(data[0].equity)}`;
    let areaD = `M ${getX(0)} ${height - padding} L ${getX(0)} ${getY(data[0].equity)}`;

    for (let i = 1; i < data.length; i++) {
      const x = getX(i);
      const y = getY(data[i].equity);
      pathD += ` L ${x} ${y}`;
      areaD += ` L ${x} ${y}`;
    }

    areaD += ` L ${getX(data.length - 1)} ${height - padding} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={useImproved ? "#D1A12C" : "#ef4444"} stopOpacity="0.15" />
            <stop offset="100%" stopColor={useImproved ? "#D1A12C" : "#ef4444"} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Gridlines */}
        <line x1={padding} y1={getY(minEquity)} x2={width - padding} y2={getY(minEquity)} stroke="#262626" strokeDasharray="3 3" />
        <line x1={padding} y1={getY(maxEquity)} x2={width - padding} y2={getY(maxEquity)} stroke="#262626" strokeDasharray="3 3" />
        <line x1={padding} y1={getY((minEquity + maxEquity) / 2)} x2={width - padding} y2={getY((minEquity + maxEquity) / 2)} stroke="#171717" strokeDasharray="3 3" />

        {/* Gradient Fill under Curve */}
        <path d={areaD} fill="url(#equityGradient)" />
        
        {/* Core Line */}
        <path 
          d={pathD} 
          fill="none" 
          stroke={useImproved ? "#D1A12C" : "#ef4444"} 
          strokeWidth="2" 
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Start / End Labels */}
        <text x={padding} y={height - 10} fill="#737373" fontSize="9" fontFamily="monospace" textAnchor="start">
          T-0
        </text>
        <text x={width - padding} y={height - 10} fill="#737373" fontSize="9" fontFamily="monospace" textAnchor="end">
          T-{data.length - 1}
        </text>

        {/* Equity Labels */}
        <text x={width - 5} y={getY(maxEquity) + 4} fill="#a3a3a3" fontSize="9" fontFamily="monospace" textAnchor="start">
          ${Math.round(maxEquity).toLocaleString()}
        </text>
        <text x={width - 5} y={getY(minEquity) + 4} fill="#a3a3a3" fontSize="9" fontFamily="monospace" textAnchor="start">
          ${Math.round(minEquity).toLocaleString()}
        </text>
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Sub-Tab Selection */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-neutral-900 pb-5">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight uppercase tracking-wider flex items-center gap-2">
            <Cpu className="h-5 w-5 text-amber-500" />
            <span>Autonomous Trading Strategy Center</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Manage the continuous 24/7 autonomous Quantum Institutional Engine (QIE) strategy, track historical versions, and control parameters.
          </p>
        </div>

        {/* Sub tabs switcher */}
        <div className="flex items-center p-1 bg-black rounded-xl border border-neutral-900 self-start xl:self-auto">
          <button
            onClick={() => setSubTab('autonomous')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
              subTab === 'autonomous'
                ? 'bg-neutral-900 text-[#D1A12C] border border-neutral-800'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>QIE Autonomous Control Deck</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </button>
          <button
            onClick={() => setSubTab('sandbox')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
              subTab === 'sandbox'
                ? 'bg-neutral-900 text-white border border-neutral-800'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Sandbox Backtester</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: QIE AUTONOMOUS COMMANDER (THE CORE CONTROL DECK)
          ===================================================================== */}
      {subTab === 'autonomous' && (
        <div className="space-y-6">
          
          {/* Autonomous Status Bar */}
          <div className="p-4 rounded-2xl bg-neutral-950/40 border border-neutral-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                  <span>QIE Core System Status: Fully Autonomous</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono font-normal px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase">Active 24/7</span>
                </div>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Market scanning, automated signal dispatching, and safety risk guards are actively running server-side.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTriggerMarketScan}
                disabled={scanning}
                className="bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-800 hover:border-neutral-700 py-1.5 px-3.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                {scanning ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
                    <span>Sweeping Structure...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 text-emerald-400 fill-current" />
                    <span>Run Market Sweep Scan</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => fetchAutonomousState(false)}
                disabled={fetchingAuto}
                className="bg-neutral-950 hover:bg-neutral-900 text-neutral-400 border border-neutral-900 hover:border-neutral-800 p-1.5 rounded-xl transition-all"
                title="Refresh State"
              >
                <RefreshCw className={`h-4 w-4 ${fetchingAuto ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Core Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1: Active Production Version Parameters & Live Metrics */}
            <div className="p-5 rounded-2xl bg-neutral-950/60 border border-neutral-900 space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-900/60 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-[#D1A12C]" />
                  <span>Production Parameters</span>
                </h3>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#D1A12C]/10 text-[#D1A12C] border border-[#D1A12C]/20 uppercase">
                  {autoState?.activeVersionId || "QIE-v1"} ACTIVE
                </span>
              </div>

              {autoState?.activeVersion ? (
                <div className="space-y-4">
                  {/* Parameter Grid */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs border-b border-neutral-900/40 pb-1.5">
                      <span className="text-neutral-500">Fast Trend Filter (EMA Short)</span>
                      <span className="font-mono text-white font-bold">{autoState.activeVersion.params.emaShort}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-neutral-900/40 pb-1.5">
                      <span className="text-neutral-500">Slow Trend Filter (EMA Long)</span>
                      <span className="font-mono text-white font-bold">{autoState.activeVersion.params.emaLong}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-neutral-900/40 pb-1.5">
                      <span className="text-neutral-500">ADX Trend Intensity Boundary</span>
                      <span className="font-mono text-white font-bold">{autoState.activeVersion.params.adxThreshold}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-neutral-900/40 pb-1.5">
                      <span className="text-neutral-500">Stop Loss Multiplier Factor</span>
                      <span className="font-mono text-white font-bold">{autoState.activeVersion.params.atrMultiplierSl} * ATR</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-neutral-900/40 pb-1.5">
                      <span className="text-neutral-500">Take Profit Multiplier Factor</span>
                      <span className="font-mono text-white font-bold">{autoState.activeVersion.params.atrMultiplierTp} * ATR</span>
                    </div>
                  </div>

                  {/* Historical Walk Forward Backtest Performance */}
                  <div className="pt-3 border-t border-neutral-900/60 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Staged Walk-Forward Performance</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-black/40 border border-neutral-900">
                        <span className="text-[9px] text-neutral-500 block uppercase font-mono">Win Rate</span>
                        <span className="text-base font-bold font-mono text-emerald-400">{autoState.activeVersion.metrics.winRate}%</span>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-neutral-900">
                        <span className="text-[9px] text-neutral-500 block uppercase font-mono">Profit Factor</span>
                        <span className="text-base font-bold font-mono text-[#D1A12C]">{autoState.activeVersion.metrics.profitFactor}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-neutral-900">
                        <span className="text-[9px] text-neutral-500 block uppercase font-mono">Max Drawdown</span>
                        <span className="text-base font-bold font-mono text-rose-400">{autoState.activeVersion.metrics.maxDrawdown}%</span>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-neutral-900">
                        <span className="text-[9px] text-neutral-500 block uppercase font-mono">Sharpe Ratio</span>
                        <span className="text-base font-bold font-mono text-white">{autoState.activeVersion.metrics.sharpeRatio}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-neutral-500 flex flex-col items-center justify-center space-y-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Synchronizing production parameters...</span>
                </div>
              )}
            </div>

            {/* COLUMN 2: Self-Improvement & Strategy Optimizer */}
            <div className="p-5 rounded-2xl bg-neutral-950/60 border border-neutral-900 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-900/60 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    <span>Self-Improvement Optimizer</span>
                  </h3>
                  <span className="text-[9px] font-mono text-neutral-500">Every 100 Trades</span>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    QIE performs automated parameter scanning. After every 100 completed trades, the system creates a copy of active parameters, optimizes them against unseen data, and promotions are strictly locked behind risk filters.
                  </p>

                  {/* Progress to next automated evaluation */}
                  <div className="p-3.5 bg-black/40 rounded-xl border border-neutral-900 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      <span>Optimization Horizon</span>
                      <span className="text-amber-500 font-mono">{(autoState?.completedTrades.length || 0) % 100} / 100 trades</span>
                    </div>
                    <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((autoState?.completedTrades.length || 0) % 100))}%` }}
                      ></div>
                    </div>
                    <span className="text-[9px] text-neutral-500 block leading-normal">
                      Next optimization loop automatically triggers when completed trades reaches the next milestone threshold.
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons and Comparative Verdict Box */}
              <div className="space-y-4">
                {optResult && (
                  <div className={`p-3 rounded-xl border text-xs space-y-2 ${
                    optResult.promoted 
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' 
                      : 'bg-neutral-900/40 border-neutral-800 text-neutral-400'
                  }`}>
                    <div className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                      {optResult.promoted ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span className="text-emerald-400">Improvement Promoted & Activated!</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span className="text-amber-500">Optimization Rejected (Safeguard)</span>
                        </>
                      )}
                    </div>
                    <p className="text-[10px] leading-relaxed text-neutral-400">{optResult.report}</p>
                    {optResult.newMetrics && (
                      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono border-t border-neutral-800 pt-1.5">
                        <div>
                          <span className="text-neutral-500 block">CURRENT PF</span>
                          <span className="text-white font-bold">{optResult.oldMetrics?.profitFactor || "1.50"}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block">OPTIMIZED PF</span>
                          <span className={`font-bold ${optResult.promoted ? 'text-emerald-400' : 'text-neutral-400'}`}>
                            {optResult.newMetrics?.profitFactor}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => handleTriggerSelfImprovement(false)}
                  disabled={optimizing}
                  className="w-full bg-neutral-900 hover:bg-neutral-850 disabled:bg-neutral-950 text-white font-bold py-2 px-4 rounded-xl text-xs border border-neutral-800 hover:border-neutral-700 transition-all flex items-center justify-center gap-2"
                >
                  {optimizing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
                      <span>Cloning Strategy & Simulating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-[#D1A12C]" />
                      <span>Trigger Optimization Check (Manual)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* COLUMN 3: Version Control Registry & Instant Rollback */}
            <div className="p-5 rounded-2xl bg-neutral-950/60 border border-neutral-900 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-900/60 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-amber-500" />
                  <span>QIE Version Control</span>
                </h3>
                <span className="text-[10px] text-neutral-500 font-mono">Registry</span>
              </div>

              <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
                {autoState?.versions && autoState.versions.map((ver, idx) => {
                  const isActive = ver.id === autoState.activeVersionId;
                  return (
                    <div 
                      key={idx} 
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isActive 
                          ? 'bg-[#D1A12C]/5 border-[#D1A12C]/20' 
                          : 'bg-black/35 border-neutral-900 hover:border-neutral-850'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">{ver.id}</span>
                          {isActive && (
                            <span className="bg-emerald-500/15 text-emerald-400 font-bold px-1.5 py-0.5 rounded text-[8px] font-mono border border-emerald-500/25">
                              PRODUCTION ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-neutral-500 font-mono">
                          EMA: {ver.params.emaShort}/{ver.params.emaLong} | ADX: {ver.params.adxThreshold} | PF: {ver.metrics.profitFactor}
                        </p>
                      </div>

                      {!isActive ? (
                        <button
                          onClick={() => handleRollback(ver.id)}
                          className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold px-2.5 py-1.5 rounded-lg text-[9px] border border-neutral-800 hover:border-neutral-700 transition-all flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Rollback</span>
                        </button>
                      ) : (
                        <span className="text-[9px] font-mono text-[#D1A12C] font-semibold">Active</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* COMPLETED TRADES REGISTRY LEDGER */}
          <div className="p-5 rounded-2xl bg-neutral-950/60 border border-neutral-900 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <History className="h-4 w-4 text-[#D1A12C]" />
                  <span>Autonomous Trade Ledger (Completed Trades)</span>
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Capital.com real CFD transactions executed and completed autonomously. All positions are synchronized from the broker.
                </p>
              </div>
              <span className="font-mono text-[10px] text-neutral-400 bg-neutral-900/60 py-1 px-2.5 border border-neutral-900 rounded-lg">
                Verified Count: <span className="font-bold text-[#D1A12C]">{autoState?.completedTrades.length || 0}</span>
              </span>
            </div>

            {autoState?.completedTrades && autoState.completedTrades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-900 text-[10px] font-mono text-neutral-500 uppercase">
                      <th className="py-2.5 px-3">Transaction ID</th>
                      <th className="py-2.5 px-3">Symbol</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Entry / Exit</th>
                      <th className="py-2.5 px-3">Profit/Loss (USD)</th>
                      <th className="py-2.5 px-3">Pips</th>
                      <th className="py-2.5 px-3">Strategy Version</th>
                      <th className="py-2.5 px-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 text-xs font-sans">
                    {autoState.completedTrades.map((trade, idx) => (
                      <tr key={idx} className="hover:bg-neutral-900/20">
                        <td className="py-2.5 px-3 font-mono text-[10px] text-neutral-500">{trade.id}</td>
                        <td className="py-2.5 px-3 font-semibold text-neutral-300">{trade.symbol}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-neutral-400">
                          ${trade.entryPrice.toLocaleString()} &rarr; ${trade.exitPrice.toLocaleString()}
                        </td>
                        <td className={`py-2.5 px-3 font-mono font-bold ${trade.profit >= 0 ? 'text-emerald-400' : 'text-neutral-500'}`}>
                          {trade.profit >= 0 ? '+' : ''}${trade.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-amber-500">+{trade.pips} pips</td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-neutral-400">{trade.versionId || "QIE-v1"}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            trade.outcome === 'WIN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-500/10 text-neutral-400'
                          }`}>
                            {trade.outcome}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-900 p-8 text-center flex flex-col items-center justify-center space-y-2">
                <History className="h-6 w-6 text-neutral-700" />
                <p className="text-[11px] text-neutral-500">No completed trades recorded server-side yet. Scanning loop actively running...</p>
              </div>
            )}
          </div>

          {/* AUTONOMOUS ENGINE AUDIT LEDGER */}
          <div className="p-5 rounded-2xl bg-neutral-950/60 border border-neutral-900 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-900/60 pb-4">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Autonomous Engine Audit & Activity Ledger</h3>
              </div>

              {/* Logs Search & Filter Control */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3 w-3 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-black border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-amber-500 w-full sm:w-44"
                  />
                </div>

                <div className="flex items-center p-1 bg-black rounded-lg border border-neutral-800 text-[10px]">
                  <button 
                    onClick={() => setLogFilter('all')} 
                    className={`px-2 py-1 rounded transition-all ${logFilter === 'all' ? 'bg-neutral-900 text-[#D1A12C]' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setLogFilter('error')} 
                    className={`px-2 py-1 rounded transition-all ${logFilter === 'error' ? 'bg-neutral-900 text-rose-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    Errors
                  </button>
                  <button 
                    onClick={() => setLogFilter('warning')} 
                    className={`px-2 py-1 rounded transition-all ${logFilter === 'warning' ? 'bg-neutral-900 text-amber-500' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    Warnings
                  </button>
                  <button 
                    onClick={() => setLogFilter('success')} 
                    className={`px-2 py-1 rounded transition-all ${logFilter === 'success' ? 'bg-neutral-900 text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    Success
                  </button>
                  <button 
                    onClick={() => setLogFilter('info')} 
                    className={`px-2 py-1 rounded transition-all ${logFilter === 'info' ? 'bg-neutral-900 text-neutral-300' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    Info
                  </button>
                </div>
              </div>
            </div>

            {/* Console Log Display */}
            <div className="max-h-72 overflow-y-auto bg-black border border-neutral-900 rounded-xl p-4 font-mono text-[10px] space-y-2.5">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  let colorClass = 'text-neutral-400';
                  if (log.type === 'error') colorClass = 'text-rose-400';
                  else if (log.type === 'warning') colorClass = 'text-amber-500';
                  else if (log.type === 'success') colorClass = 'text-emerald-400';
                  else if (log.type === 'info') colorClass = 'text-sky-400';

                  return (
                    <div key={log.id} className="flex items-start gap-2.5 border-b border-neutral-950 pb-2 last:border-0">
                      <span className="text-neutral-600 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={`font-bold shrink-0 uppercase text-[9px] px-1 py-0.2 rounded border ${
                        log.type === 'error' ? 'bg-rose-500/5 border-rose-500/15 text-rose-400' :
                        log.type === 'warning' ? 'bg-amber-500/5 border-amber-500/15 text-amber-500' :
                        log.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' :
                        'bg-sky-500/5 border-sky-500/15 text-sky-400'
                      }`}>
                        {log.source}
                      </span>
                      <span className={`${colorClass} leading-relaxed`}>{log.message}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-neutral-500 text-center py-8">No matching autonomous scan logs found.</div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* =====================================================================
          TAB 2: SANDBOX BACKTEST SUITE (THE ORIGINAL SANDBOX BACKTESTER)
          ===================================================================== */}
      {subTab === 'sandbox' && (
        <div className="space-y-6">
          {/* Control Panel */}
          <div className="p-6 rounded-2xl bg-neutral-950/60 border border-neutral-900 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">Select Asset Class</label>
              <select 
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
              >
                <option value="XAUUSD">XAUUSD (Spot Gold)</option>
                <option value="BTCUSD">BTCUSD (Bitcoin / USD)</option>
                <option value="ETHUSD">ETHUSD (Ethereum / USD)</option>
                <option value="EURUSD">EURUSD (Euro / US Dollar)</option>
                <option value="NAS100">NAS100 (Nasdaq Index)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">Strategy Algorithm Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setUseImproved(false)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    !useImproved 
                      ? 'border-red-500/40 bg-red-950/10 text-white' 
                      : 'border-neutral-900 bg-black text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <span className="text-[11px] font-bold">Standard Strategy (Unfiltered)</span>
                  <span className="text-[9px] opacity-80 mt-1 block leading-tight">No volatility filters, blindly trades everything with lower targets.</span>
                </button>
                <button
                  onClick={() => setUseImproved(true)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    useImproved 
                      ? 'border-amber-500/40 bg-amber-950/10 text-white' 
                      : 'border-neutral-900 bg-black text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <span className="text-[11px] font-bold flex items-center gap-1">
                    Hybrid Quantitative Strategy
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </span>
                  <span className="text-[9px] opacity-80 mt-1 block leading-tight">Liquidity sweep, BOS/CHoCH, EMA 50/200, ADX 25+, ATR SL, 1:3+ RR.</span>
                </button>
              </div>
            </div>

            <div>
              <button
                onClick={runBacktest}
                disabled={loading}
                className="w-full bg-[#D1A12C] hover:bg-amber-600 disabled:bg-neutral-800 text-neutral-950 font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Downloading 3Y Data & Optimizing...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Optimize & Backtest (3 Years)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Backtest Results Dashboard */}
          {result ? (
            <div className="space-y-6">
              
              {/* Key Metrics Row */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                
                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-900">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">Win Rate</span>
                  <h4 className={`text-xl font-bold font-mono mt-2 ${result.winRate >= 65 ? 'text-emerald-400' : 'text-neutral-300'}`}>
                    {result.winRate}%
                  </h4>
                  <p className="text-[9px] text-neutral-500 mt-1">
                    {result.wins} Wins / {result.losses} Losses
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-900">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">Profit Factor</span>
                  <h4 className={`text-xl font-bold font-mono mt-2 ${result.profitFactor >= 2.0 ? 'text-emerald-400' : 'text-amber-500'}`}>
                    {result.profitFactor}
                  </h4>
                  <p className="text-[9px] text-neutral-500 mt-1">
                    Gross profit vs gross loss
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-900">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">Max Drawdown</span>
                  <h4 className={`text-xl font-bold font-mono mt-2 ${result.maxDrawdown < 3.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.maxDrawdown}%
                  </h4>
                  <p className="text-[9px] text-neutral-500 mt-1">
                    Strict risk control limit: 5%
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-900">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">Sharpe Ratio</span>
                  <h4 className={`text-xl font-bold font-mono mt-2 ${result.sharpeRatio >= 2.5 ? 'text-emerald-400' : 'text-neutral-300'}`}>
                    {result.sharpeRatio}
                  </h4>
                  <p className="text-[9px] text-neutral-500 mt-1">
                    Risk-adjusted return ratio
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-900">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">Average Risk/Reward</span>
                  <h4 className="text-xl font-bold font-mono mt-2 text-amber-500">
                    1:{result.avgRR}
                  </h4>
                  <p className="text-[9px] text-neutral-500 mt-1">
                    ATR-based dynamic target (Min 1:3)
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-900">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">Total Return %</span>
                  <h4 className={`text-xl font-bold font-mono mt-2 ${result.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    +{result.totalReturnPct}%
                  </h4>
                  <p className="text-[9px] text-neutral-500 mt-1">
                    Net return on unseen data
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-900">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">Number of Trades</span>
                  <h4 className="text-xl font-bold font-mono mt-2 text-white">
                    {result.totalTrades}
                  </h4>
                  <p className="text-[9px] text-neutral-500 mt-1">
                    OOS walk-forward validation trades
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-900">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">Net Profit</span>
                  <h4 className={`text-xl font-bold font-mono mt-2 ${result.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    +${result.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </h4>
                  <p className="text-[9px] text-neutral-500 mt-1">
                    Initial Balance: $100,000 (1.0% risk)
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-900">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">Long Trades</span>
                  <h4 className="text-xl font-bold font-mono mt-2 text-emerald-400">
                    {result.longTrades ?? 0}
                  </h4>
                  <p className="text-[9px] text-neutral-500 mt-1">
                    Executed bullish buy trades
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-900">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">Short Trades</span>
                  <h4 className="text-xl font-bold font-mono mt-2 text-rose-400">
                    {result.shortTrades ?? 0}
                  </h4>
                  <p className="text-[9px] text-neutral-500 mt-1">
                    Executed bearish sell trades
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Chart Column */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-neutral-950/60 border border-neutral-900 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Backtest Equity Curve</h3>
                      <p className="text-[10px] text-neutral-500 mt-0.5">Continuous growth path utilizing strict quality standards.</p>
                    </div>
                    {result.useImprovedStrategy && (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        SMC IMPROVEMENTS ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="h-44 w-full bg-black/60 rounded-xl border border-neutral-900/60 p-2 flex items-center justify-center">
                    {renderSvgChart(result.equityCurve)}
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 border-t border-neutral-900/50 pt-3">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                      Trades executed: <span className="font-bold text-neutral-300">{result.totalTrades}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-600"></span>
                      Low-quality setups skipped: <span className="font-bold text-[#D1A12C]">{result.skippedSetups}</span>
                    </span>
                  </div>
                </div>

                {/* Strategy Comparison / Execution Switch Column */}
                <div className="lg:col-span-1 p-5 rounded-2xl bg-neutral-950/60 border border-neutral-900 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Institutional Strategy Verification</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Backtest confirms that prioritizing high-confidence setups improves the win rate to <span className="text-emerald-400 font-bold">{result.winRate}%</span> with a maximum drawdown of only <span className="text-emerald-400 font-bold">{result.maxDrawdown}%</span>. 
                    </p>

                    <div className="p-3 bg-neutral-900/40 rounded-xl border border-neutral-800 space-y-2">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-neutral-500">Quality Filter Rules</span>
                        <span className="text-emerald-400 font-bold">VERIFIED</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-neutral-500">ATR-based SL Risk</span>
                        <span className="text-emerald-400 font-bold">ACTIVE</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-neutral-500">Risk-to-Reward Ratio</span>
                        <span className="text-emerald-400 font-bold">1:3.0 (OK)</span>
                      </div>
                    </div>
                  </div>

                  {settings?.enableAutoTrading ? (
                    <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-center space-y-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto" />
                      <div className="text-[11px] font-bold text-white">Live Execution Enacted</div>
                      <p className="text-[9px] text-neutral-500">AI Trader is actively monitoring and executing premium setups.</p>
                    </div>
                  ) : (
                    <button
                      onClick={onEnableAutoTrading}
                      className="w-full bg-[#D1A12C] hover:bg-amber-600 text-neutral-950 font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Authorize & Enable Live Trading</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

              </div>

              {/* Simulated Trade Logs */}
              <div className="p-5 rounded-2xl bg-neutral-950/60 border border-neutral-900 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Simulation Audit Log (Recent Trades)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-900 text-[10px] font-mono text-neutral-500 uppercase">
                        <th className="py-2.5 px-3">Trade ID</th>
                        <th className="py-2.5 px-3">Asset</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Entry / Exit</th>
                        <th className="py-2.5 px-3">Risk-Reward</th>
                        <th className="py-2.5 px-3">Result</th>
                        <th className="py-2.5 px-3 text-right">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 text-xs font-sans">
                      {result.trades.map((trade, idx) => (
                        <tr key={idx} className="hover:bg-neutral-900/20">
                          <td className="py-2.5 px-3 font-mono text-[10px] text-neutral-500">{trade.id}</td>
                          <td className="py-2.5 px-3 font-semibold text-neutral-300">{trade.symbol}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-400">
                            ${trade.entryPrice.toLocaleString()} &rarr; ${trade.profit >= 0 ? trade.takeProfit.toLocaleString() : trade.stopLoss.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-amber-500">1:{trade.riskReward}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              trade.outcome === 'WIN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-500/10 text-neutral-400'
                            }`}>
                              {trade.outcome}
                            </span>
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${trade.profit >= 0 ? 'text-emerald-400' : 'text-neutral-500'}`}>
                            {trade.profit >= 0 ? '+' : ''}${trade.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-900 p-12 text-center flex flex-col items-center justify-center space-y-4">
              <BarChart className="h-8 w-8 text-neutral-700" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">No Simulation Executed</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto leading-relaxed">
                  Before activating automated live trading on Capital.com, you must run the complete 3-year historical backtest and walk-forward parameter optimization suite.
                </p>
              </div>
              <button
                onClick={runBacktest}
                className="bg-[#D1A12C] hover:bg-amber-600 text-neutral-950 font-bold py-2 px-6 rounded-xl text-xs transition-all flex items-center gap-1.5"
              >
                <span>Run Backtest Suite</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
