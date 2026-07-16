import { useState } from 'react';
import { DollarSign, Percent, TrendingUp, Briefcase, Activity, AlertCircle, Layers, Check, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile, ActiveSignalInstance, TradeHistoryItem } from '../types';

interface DashboardOverviewProps {
  profile: UserProfile;
  activeSignals: ActiveSignalInstance[];
  history: TradeHistoryItem[];
  highImpactWarning: string | null;
  onNavigateToSignals: () => void;
  onNavigateToHistory: () => void;
  onNavigateToMonitor: () => void;
  onPlaceManualTrade?: (symbol: string, type: 'BUY' | 'SELL', lotSize: number) => void;
}

export default function DashboardOverview({
  profile,
  activeSignals,
  history,
  highImpactWarning,
  onNavigateToSignals,
  onNavigateToHistory,
  onNavigateToMonitor,
  onPlaceManualTrade,
}: DashboardOverviewProps) {
  
  const [manualSymbol, setManualSymbol] = useState('XAUUSD');
  const [manualType, setManualType] = useState<'BUY' | 'SELL'>('BUY');
  const [manualLot, setManualLot] = useState(0.10);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);
  
  // Create a safe profile object to protect against undefined/null or missing properties
  const safeProfile = {
    fullName: profile?.fullName || 'Alexander Mercer',
    balance: profile?.balance !== undefined ? profile.balance : 100000.00,
    winRate: profile?.winRate !== undefined ? profile.winRate : 78.4,
    dailyProfit: profile?.dailyProfit !== undefined ? profile.dailyProfit : 0.00,
    weeklyProfit: profile?.weeklyProfit !== undefined ? profile.weeklyProfit : 0.00,
    monthlyProfit: profile?.monthlyProfit !== undefined ? profile.monthlyProfit : 0.00,
  };

  // Calculate average confidence and average signal strength of active signals
  const activeCount = activeSignals.length;
  
  return (
    <div className="space-y-6">
      
      {/* High impact news banner */}
      {highImpactWarning && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-950/50 border border-red-500/30 rounded-2xl flex items-center gap-4 shadow-[0_0_15px_rgba(239,68,68,0.1)] relative overflow-hidden"
        >
          <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-red-500 animate-pulse"></div>
          <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-red-400 font-semibold mb-0.5">High Impact News Warning</div>
            <p className="text-sm text-neutral-200">{highImpactWarning}</p>
          </div>
          <div className="text-xs text-red-400/80 shrink-0 select-none bg-red-500/10 px-2.5 py-1 rounded-full font-semibold border border-red-500/20">
            SIGNALS LOCKED
          </div>
        </motion.div>
      )}

      {/* Hero Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Institutional Terminal</h1>
          <p className="text-xs text-neutral-400">Welcome back, <span className="text-[#D1A12C] font-semibold">{safeProfile.fullName}</span> • Secure Node Connected</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-mono uppercase text-neutral-500 tracking-wider">Node: LIVE_AI_QUANT_MAINNET</span>
        </div>
      </div>

      {/* Grid of Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Main Balance Card (Gold Accent) */}
        <div className="relative overflow-hidden md:col-span-2 rounded-2xl bg-gradient-to-br from-[#12110D] via-neutral-950 to-black border border-amber-500/20 p-6 flex flex-col justify-between h-44 shadow-lg shadow-amber-500/5">
          {/* Subtle overlay lines */}
          <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500/80 mb-1">Available Liquidity</p>
              <h3 className="text-3xl font-bold text-white tracking-tight font-sans">
                ${safeProfile.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-[#D1A12C] rounded-xl">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-neutral-900/80 pt-4 mt-2">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-neutral-500">Margin Account</span>
              <p className="text-xs font-mono font-medium text-neutral-300">GOLD_AI_M1_SECURE</p>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-wider text-neutral-500">Win Rate</span>
              <p className="text-xs font-mono font-bold text-amber-500 flex items-center gap-1 justify-end">
                <Percent className="h-3 w-3" /> {safeProfile.winRate}%
              </p>
            </div>
          </div>
        </div>

        {/* Daily Profit */}
        <div className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-6 flex flex-col justify-between h-44">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-1">Daily Profit</p>
              <h3 className={`text-2xl font-bold tracking-tight font-sans ${safeProfile.dailyProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {safeProfile.dailyProfit >= 0 ? '+' : ''}${safeProfile.dailyProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className={`p-2 rounded-xl border ${safeProfile.dailyProfit >= 0 ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' : 'bg-rose-500/5 border-rose-500/10 text-rose-400'}`}>
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="w-full bg-neutral-900 h-1 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: '74%' }}></div>
            </div>
            <span className="text-[9px] text-neutral-500 mt-2 block uppercase tracking-wider">74% of Daily Cap</span>
          </div>
        </div>

        {/* Monthly Profit */}
        <div className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-6 flex flex-col justify-between h-44">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-1">Monthly Profit</p>
              <h3 className={`text-2xl font-bold tracking-tight font-sans ${safeProfile.monthlyProfit >= 0 ? 'text-[#D1A12C]' : 'text-rose-400'}`}>
                {safeProfile.monthlyProfit >= 0 ? '+' : ''}${safeProfile.monthlyProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2 bg-neutral-900/60 border border-neutral-800 text-amber-500 rounded-xl">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
              <span>Weekly Profit</span>
              <span className="font-semibold text-emerald-400">${safeProfile.weeklyProfit.toLocaleString('en-US')}</span>
            </div>
            <div className="border-t border-neutral-900/60 pt-1 text-[9px] text-neutral-500 uppercase tracking-wider">
              Cycle Ends in 21 Days
            </div>
          </div>
        </div>

      </div>

      {/* Grid: Signals / Active Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: SMC Order Execution Desk and Performance highlights */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* SMC Institutional Order Ticket */}
          <div className="rounded-2xl bg-[#0c0c0d] border border-neutral-900 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-amber-500">Order Execution Desk</h4>
                <p className="text-[10px] text-neutral-500 mt-0.5">لوحة تنفيذ صفقات SMC</p>
              </div>
              <Zap className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
            </div>

            {executionMessage && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-[11px] text-emerald-400 text-center font-mono"
              >
                {executionMessage}
              </motion.div>
            )}

            <div className="space-y-3.5">
              {/* Asset Selection */}
              <div>
                <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Symbol • الأداة المالية</label>
                <select
                  value={manualSymbol}
                  onChange={(e) => setManualSymbol(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-2 px-3 text-xs text-white font-mono"
                >
                  <option value="XAUUSD">GOLD (XAUUSD)</option>
                  <option value="BTCUSD">BITCOIN (BTCUSD)</option>
                  <option value="ETHUSD">ETHEREUM (ETHUSD)</option>
                  <option value="EURUSD">EURO / US DOLLAR (EURUSD)</option>
                  <option value="NAS100">NASDAQ 100 (NAS100)</option>
                </select>
              </div>

              {/* BUY / SELL Switch */}
              <div>
                <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Direction • الاتجاه</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualType('BUY')}
                    className={`py-2 px-4 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                      manualType === 'BUY'
                        ? 'bg-emerald-500/10 border border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    <span>BUY / شراء</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualType('SELL')}
                    className={`py-2 px-4 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                      manualType === 'SELL'
                        ? 'bg-rose-500/10 border border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
                    <span>SELL / بيع</span>
                  </button>
                </div>
              </div>

              {/* Predefined Lot selection (Strictly defined and limited!) */}
              <div>
                <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Predefined Lot Size • حجم اللوت المحدد</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0.01, 0.10, 0.50, 1.00, 2.00, 5.00, 10.00].map((lot) => {
                    const isSelected = manualLot === lot;
                    return (
                      <button
                        key={lot}
                        type="button"
                        onClick={() => setManualLot(lot)}
                        className={`py-1.5 px-1 text-[10px] font-mono font-bold rounded-lg border text-center transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                            : 'bg-neutral-900/60 border-neutral-850 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        {lot.toFixed(2)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Execute Order */}
              <button
                type="button"
                onClick={() => {
                  if (onPlaceManualTrade) {
                    onPlaceManualTrade(manualSymbol, manualType, manualLot);
                    setExecutionMessage(`Instant ${manualType} of ${manualLot} Lot executed successfully on ${manualSymbol}!`);
                    setTimeout(() => setExecutionMessage(null), 3000);
                  }
                }}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg text-black ${
                  manualType === 'BUY'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400'
                    : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400'
                }`}
              >
                Execute SMC {manualType} Order • تنفيذ الصفقة
              </button>
            </div>
          </div>

          {/* Key performance highlights */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0c0c0d] to-black border border-neutral-900 p-5 space-y-4">
            <h4 className="text-xs uppercase tracking-widest font-bold text-neutral-400">Trading Performance</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-neutral-900/40 border border-neutral-900 rounded-xl">
                <span className="text-[9px] text-neutral-500 uppercase tracking-widest block">Average Win</span>
                <span className="text-sm font-semibold font-mono text-emerald-400 mt-1 block">+$842.00</span>
              </div>
              <div className="p-3 bg-neutral-900/40 border border-neutral-900 rounded-xl">
                <span className="text-[9px] text-neutral-500 uppercase tracking-widest block">Average Loss</span>
                <span className="text-sm font-semibold font-mono text-rose-400 mt-1 block">-$312.00</span>
              </div>
            </div>
            <div className="p-3 bg-neutral-900/20 border border-neutral-900 rounded-xl flex items-center justify-between text-[11px]">
              <span className="text-neutral-400">Profit Factor</span>
              <span className="font-mono font-bold text-amber-500">2.69</span>
            </div>
          </div>

        </div>

        {/* Right column: Active signals overview and Recent trade logs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Signals Summary Panel */}
          <div className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider">Active Quantitative Signals</h3>
              <button 
                onClick={onNavigateToSignals}
                className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
              >
                Manage ({activeSignals.length})
              </button>
            </div>

            {activeSignals.length === 0 ? (
              <div className="py-8 text-center text-neutral-500 text-xs">
                No active signals are running. Signals auto-generate based on SMC strategies.
              </div>
            ) : (
              <div className="space-y-3">
                {activeSignals.map((sig) => (
                  <div key={sig.id} className="p-3.5 bg-neutral-900/40 border border-neutral-900 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-amber-500/10 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="px-2.5 py-1 text-xs font-mono font-bold text-[#D1A12C] bg-amber-500/5 border border-amber-500/20 rounded-lg">
                        {sig.symbol}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${sig.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {sig.type}
                          </span>
                          <span className="text-[10px] text-neutral-500">Entry: ${sig.entryPrice.toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-mono mt-0.5">SL: ${sig.stopLoss.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:text-right gap-6">
                      <div>
                        <span className="text-[9px] text-neutral-500 uppercase tracking-widest block">Status</span>
                        <span className="text-xs font-semibold text-neutral-300 uppercase">{sig.status.replace('_', ' ')}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-neutral-500 uppercase tracking-widest block">Net Return</span>
                        <span className={`text-xs font-mono font-bold ${sig.profitPips >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {sig.profitPips >= 0 ? '+' : ''}{sig.profitPips} pips
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Trades Logs */}
          <div className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider">Recent Executed Trades</h3>
              <button 
                onClick={onNavigateToHistory}
                className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
              >
                Full History
              </button>
            </div>

            {history.length === 0 ? (
              <div className="py-8 text-center text-neutral-500 text-xs">
                No archived trade records.
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.slice(0, 3).map((item) => (
                  <div key={item.id} className="p-3 bg-neutral-900/30 border border-neutral-900 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`h-2 w-2 rounded-full ${item.outcome === 'WIN' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-neutral-200">{item.symbol}</span>
                          <span className={`text-[10px] font-bold ${item.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.type}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-500">{item.duration} Duration</span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <p className={`font-bold ${item.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.profit >= 0 ? '+' : ''}${item.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[10px] text-neutral-500">{item.pips > 0 ? '+' : ''}{item.pips} pips</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
