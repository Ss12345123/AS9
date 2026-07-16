import { ActiveSignalInstance, TradeHistoryItem } from '../types';
import { Play, TrendingUp, CircleAlert, CheckCircle2, XCircle, ShieldCheck, Activity, Terminal, Trash2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface SignalListProps {
  activeSignals: ActiveSignalInstance[];
  history: TradeHistoryItem[];
  onSelectSymbol: (symbol: string) => void;
  highImpactWarning: string | null;
  autoLogs?: any[];
  onClearAutoLogs?: () => void;
  onTriggerScan?: () => void;
  isScanning?: boolean;
}

export default function SignalList({
  activeSignals,
  history,
  onSelectSymbol,
  highImpactWarning,
  autoLogs = [],
  onClearAutoLogs,
  onTriggerScan,
  isScanning = false
}: SignalListProps) {
  return (
    <div className="space-y-8">

      {/* Automated SMC Strategy Execution Terminal */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight uppercase tracking-wider flex items-center gap-2">
              <Terminal className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
              <span>Automated SMC Strategy Terminal</span>
            </h2>
            <p className="text-xs text-neutral-500">Real-time quantitative trade decisions and security checks.</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onTriggerScan && (
              <button
                onClick={onTriggerScan}
                disabled={isScanning}
                className="text-[10px] uppercase font-bold tracking-wider text-black bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 font-mono transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-md disabled:shadow-none"
              >
                <RefreshCw className={`h-3 w-3 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning...' : 'Force Diagnostic Scan & Test'}</span>
              </button>
            )}
            {onClearAutoLogs && (
              <button
                onClick={onClearAutoLogs}
                className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 hover:text-neutral-300 font-mono transition-all flex items-center gap-1 bg-neutral-900 hover:bg-neutral-850 px-3 py-1.5 rounded-lg border border-neutral-850"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-900 bg-black/80 font-mono text-[11px] overflow-hidden shadow-inner">
          <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-950 border-b border-neutral-900">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              <span className="text-neutral-500 text-[10px] ml-1">SMC_AUTO_ENGINE_V1.4 // SYSTEM LOGS</span>
            </div>
            <span className="text-neutral-600 text-[9px]">UTC STANDBY</span>
          </div>
          
          <div className="p-4 space-y-1.5 max-h-64 overflow-y-auto min-h-[140px] divide-y divide-neutral-900/40">
            {(!autoLogs || autoLogs.length === 0) ? (
              <div className="text-neutral-600 text-center py-8 text-xs select-none">
                // System idle. Enable "Automated SMC Trading" in settings to start scanner.
              </div>
            ) : (
              autoLogs.map((log) => {
                const colorMap = {
                  success: 'text-emerald-400',
                  warning: 'text-amber-500 font-bold',
                  error: 'text-red-400 font-bold',
                  info: 'text-neutral-400'
                };
                const timeStr = new Date(log.timestamp).toLocaleTimeString();
                return (
                  <div key={log.id} className="pt-1.5 first:pt-0 flex items-start gap-2.5">
                    <span className="text-neutral-600 text-[10px] shrink-0 font-mono">[{timeStr}]</span>
                    {log.symbol && (
                      <span className="text-[#D1A12C] font-extrabold shrink-0">[{log.symbol}]</span>
                    )}
                    <span className={`leading-relaxed ${colorMap[log.type || 'info']}`}>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      
      {/* Active Quant Signals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-amber-500" />
              <span>Active Quantitative Signals</span>
            </h2>
            <p className="text-xs text-neutral-500">Live trading systems currently monitored by SMC structural parameters.</p>
          </div>
          <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-neutral-900 border border-neutral-850 text-neutral-400">
            {activeSignals.length} Active Positions
          </span>
        </div>

        {highImpactWarning && (
          <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400">
            <CircleAlert className="h-4 w-4 shrink-0" />
            <span>New signal generations are locked due to incoming High Impact macroeconomic news.</span>
          </div>
        )}

        {activeSignals.length === 0 ? (
          <div className="rounded-2xl bg-neutral-950/40 border border-neutral-900/60 p-12 text-center text-neutral-500 text-xs">
            No active trades running. System is currently scanning for Fair Value Gap mitigation...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSignals.map((sig) => (
              <div 
                key={sig.id}
                className="p-5 rounded-2xl bg-gradient-to-br from-[#0c0c0d] to-black border border-neutral-900 hover:border-amber-500/20 transition-all space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onSelectSymbol(sig.symbol)}
                      className="px-2.5 py-1 text-xs font-mono font-extrabold text-[#D1A12C] bg-amber-500/10 border border-amber-500/30 rounded-lg"
                    >
                      {sig.symbol}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${sig.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {sig.type}
                        </span>
                        <span className="text-[10px] text-neutral-500">Time: {new Date(sig.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono uppercase ${
                    sig.status.startsWith('tp') 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : sig.status === 'sl_hit'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-amber-500/10 text-[#D1A12C] border border-amber-500/20'
                  }`}>
                    {sig.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Levels Grid */}
                <div className="grid grid-cols-3 gap-3 font-mono text-[11px] p-3 bg-neutral-900/30 rounded-xl border border-neutral-900">
                  <div>
                    <span className="text-neutral-500 block text-[9px] uppercase">Entry</span>
                    <span className="text-neutral-200 block font-semibold mt-0.5">${sig.entryPrice.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px] uppercase">Current</span>
                    <span className="text-neutral-200 block font-semibold mt-0.5">${sig.currentPrice.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px] uppercase">Net Return</span>
                    <span className={`block font-bold mt-0.5 ${sig.profitPips >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {sig.profitPips >= 0 ? '+' : ''}{sig.profitPips} pips
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1 text-neutral-400">
                    <div className="flex justify-between">
                      <span>SL:</span>
                      <span className="text-rose-400 font-mono font-medium">${sig.stopLoss.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TP1:</span>
                      <span className="text-emerald-400 font-mono font-medium">${sig.tp1.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-neutral-400">
                    <div className="flex justify-between">
                      <span>TP2:</span>
                      <span className="text-emerald-400 font-mono font-medium">${sig.tp2.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TP3:</span>
                      <span className="text-emerald-400 font-mono font-medium">${sig.tp3.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-900/60 flex justify-between items-center text-[10px]">
                  <span className="text-neutral-500 font-mono">System Code: {sig.id.toUpperCase()}</span>
                  <button 
                    onClick={() => onSelectSymbol(sig.symbol)}
                    className="text-amber-500 hover:underline hover:text-amber-400 font-semibold"
                  >
                    Load SMC Chart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trade Archive History */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="h-4.5 w-4.5 text-[#D1A12C]" />
          <span>Executed Trade History Log</span>
        </h2>

        {history.length === 0 ? (
          <div className="rounded-2xl bg-neutral-950/40 border border-neutral-900/60 p-12 text-center text-neutral-500 text-xs">
            No past executed transactions recorded.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-neutral-900 bg-neutral-950/50">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-900 text-neutral-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-4 px-5">Symbol</th>
                  <th className="py-4 px-5">Verdict</th>
                  <th className="py-4 px-5">Entry Time</th>
                  <th className="py-4 px-5">Exit Time</th>
                  <th className="py-4 px-5">Duration</th>
                  <th className="py-4 px-5 text-right">Net Profit</th>
                  <th className="py-4 px-5 text-center">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 font-sans text-xs">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-900/20 transition-all text-neutral-300">
                    <td className="py-4 px-5 font-mono font-bold text-white">{item.symbol}</td>
                    <td className="py-4 px-5 font-mono">
                      <span className={`font-bold ${item.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.type}
                      </span>
                      <p className="text-[10px] text-neutral-500 mt-0.5">@ ${item.entryPrice.toLocaleString()}</p>
                    </td>
                    <td className="py-4 px-5 text-neutral-400">{new Date(item.entryTime).toLocaleTimeString()}</td>
                    <td className="py-4 px-5 text-neutral-400">{new Date(item.exitTime).toLocaleTimeString()}</td>
                    <td className="py-4 px-5 font-mono text-neutral-400">{item.duration}</td>
                    <td className="py-4 px-5 text-right font-mono">
                      <p className={`font-bold ${item.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.profit >= 0 ? '+' : ''}${item.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[10px] text-neutral-500 block">{item.pips > 0 ? '+' : ''}{item.pips} pips</span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.outcome === 'WIN' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {item.outcome === 'WIN' ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                        ) : (
                          <XCircle className="h-3 w-3 shrink-0 text-rose-400" />
                        )}
                        <span>{item.outcome}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
