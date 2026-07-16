import { useState, useEffect } from 'react';
import { Eye, ShieldAlert, BadgePercent, Cpu, Workflow, BarChart3, TrendingUp, HelpCircle, Shield, Zap, Loader2, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { SmartMoneySignal, SystemSettings } from '../types';

interface SmartMoneyStrategyProps {
  signal: SmartMoneySignal | null;
  isLoading: boolean;
  selectedSymbol: string;
  capitalConnected: boolean | null;
  onPlaceOrder?: (symbol: string, type: 'BUY' | 'SELL', lotSize: number, stopLevel?: number, profitLevel?: number) => Promise<{ success: boolean; error?: string }>;
  settings?: SystemSettings;
}

export default function SmartMoneyStrategy({
  signal,
  isLoading,
  selectedSymbol,
  capitalConnected,
  onPlaceOrder,
  settings,
}: SmartMoneyStrategyProps) {

  const [orderLot, setOrderLot] = useState<number>(0.10);
  const [selectedTp, setSelectedTp] = useState<string>('tp1');
  const [profitLevel, setProfitLevel] = useState<number>(0);
  const [includeSltp, setIncludeSltp] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [execMessage, setExecMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (signal) {
      setSelectedTp('tp1');
      setProfitLevel(signal.tp1);
      setExecMessage(null);
    }
  }, [signal]);

  const handleApproveAndSend = async () => {
    if (!onPlaceOrder || !signal) return;
    setIsExecuting(true);
    setExecMessage(null);
    try {
      const stopVal = includeSltp ? signal.stopLoss : undefined;
      const profitVal = includeSltp ? profitLevel : undefined;
      const res = await onPlaceOrder(selectedSymbol, signal.type, orderLot, stopVal, profitVal);
      if (res.success) {
        setExecMessage({
          type: 'success',
          text: `Institutional signal successfully authorized! Sent to Capital.com.`
        });
      } else {
        setExecMessage({
          type: 'error',
          text: res.error || 'Execution request failed. Check broker logs.'
        });
      }
    } catch (err: any) {
      setExecMessage({
        type: 'error',
        text: err.message || 'Transmission failed.'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[400px]">
        <div className="relative">
          <div className="h-12 w-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <Cpu className="h-5 w-5 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Compiling SMC Algorithms</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm">
            Scanning HTF structures, detecting Fair Value Gaps, and confirming Change of Character on {selectedSymbol}...
          </p>
        </div>
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-12 text-center text-neutral-500 text-xs flex flex-col items-center justify-center space-y-2 min-h-[400px]">
        <ShieldAlert className="h-8 w-8 text-neutral-700" />
        <p>Analytical matrix not loaded. Sync live market prices first.</p>
      </div>
    );
  }

  const steps = [
    { label: "HTF Structure", status: signal.htfStatus, desc: "High Timeframe direction alignment" },
    { label: "SMT Divergence", status: signal.smtStatus, desc: "Smart Money Technique correlation" },
    { label: "Trend Shift (BOS)", status: signal.trendShift, desc: "Break of Structure confirmation" },
    { label: "CISD Mitigation", status: signal.cisdConfirmation, desc: "Closed-In-Shadow-Delivery validation" },
    { label: "Refined Entry", value: `$${signal.entry.toLocaleString()}`, desc: "Refining entry within discount/premium array" },
    { label: "Liquidity Target", value: `$${signal.liquidityTarget.toLocaleString()}`, desc: "High probability draw on liquidity target" }
  ];

  return (
    <div className="space-y-6">
      
      {/* Sequence Roadmap Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Workflow className="h-4.5 w-4.5 text-amber-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Sequence Roadmap (HTF → SMT → TS → CISD → Entry → Target)</h2>
        </div>
        
        {/* Sequence Steps Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-900 hover:border-amber-500/10 transition-all flex flex-col justify-between h-24"
            >
              <div>
                <span className="text-[9px] font-mono font-bold text-neutral-600 block">STEP 0{idx + 1}</span>
                <span className="text-[11px] font-semibold text-neutral-300 mt-1 block leading-tight">{step.label}</span>
              </div>
              <div className="mt-2 text-right">
                {step.status ? (
                  <span className={`text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded-md ${
                    step.status === 'BULLISH' || step.status === 'CONFIRMED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {step.status}
                  </span>
                ) : (
                  <span className="text-xs font-mono font-bold text-amber-500">{step.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Signal parameters, levels and stats */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Quantitative Levels</h3>
          
          <div className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-5 space-y-5">
            {/* Entry / Buy Sell Badge */}
            <div className="flex items-center justify-between border-b border-neutral-900/60 pb-4">
              <div>
                <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block">System Verdict</span>
                <span className={`text-lg font-bold font-sans mt-0.5 block ${signal.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {signal.type === 'BUY' ? 'BULLISH RECOIL (BUY)' : 'BEARISH MITIGATION (SELL)'}
                </span>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wider ${
                signal.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
              }`}>
                {signal.type}
              </span>
            </div>

            {/* Price Levels List */}
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-neutral-900/40">
                <span className="text-neutral-500">Entry Reference</span>
                <span className="text-white font-bold">${signal.entry.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-neutral-900/40">
                <span className="text-rose-500 font-semibold">Stop Loss (Invalidation)</span>
                <span className="text-rose-400 font-bold">${signal.stopLoss.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-neutral-900/40">
                <span className="text-emerald-400 font-semibold">Take Profit 1 (Mitigation)</span>
                <span className="text-emerald-400 font-bold">${signal.tp1.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-neutral-900/40">
                <span className="text-emerald-400 font-semibold">Take Profit 2 (Internal High)</span>
                <span className="text-emerald-400 font-bold">${signal.tp2.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-neutral-900/40">
                <span className="text-[#D1A12C] font-semibold">Take Profit 3 (Ext Liquidity)</span>
                <span className="text-[#D1A12C] font-bold">${signal.tp3.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-neutral-500">External Liquidity Target</span>
                <span className="text-neutral-300 font-bold">${signal.liquidityTarget.toLocaleString()}</span>
              </div>
            </div>

            {/* RR, Strength, and Confidence Score Indicators */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-900">
              <div className="p-3 bg-neutral-900/30 rounded-xl">
                <span className="text-[9px] text-neutral-500 uppercase tracking-widest block">Risk / Reward</span>
                <span className="text-sm font-bold text-[#D1A12C] font-mono mt-1 block">{signal.riskReward} R</span>
              </div>
              <div className="p-3 bg-neutral-900/30 rounded-xl">
                <span className="text-[9px] text-neutral-500 uppercase tracking-widest block">Signal Strength</span>
                <span className="text-sm font-bold text-white font-mono mt-1 block">{signal.strength}/100</span>
              </div>
              <div className="p-3 bg-neutral-900/30 rounded-xl col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-neutral-500 uppercase tracking-widest block">AI Confidence Level</span>
                  <span className="text-xs font-semibold text-neutral-300 mt-0.5 block">Quantitative Confirmation</span>
                </div>
                <span className="text-lg font-bold text-emerald-400 font-mono">{signal.confidence}%</span>
              </div>
            </div>
          </div>

          {/* SMC Order Authorization & Approval Desk */}
          <div className="rounded-2xl bg-gradient-to-br from-[#12110D] via-neutral-950 to-black border border-amber-500/20 p-5 space-y-4 shadow-xl shadow-amber-500/5">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-amber-500">SMC Signal Authorization</h4>
                <p className="text-[10px] text-neutral-500 mt-0.5">اعتماد صفقة SMC وإرسالها للوسيط</p>
              </div>
              <Shield className={`h-4.5 w-4.5 ${capitalConnected ? 'text-emerald-400' : 'text-neutral-600'}`} />
            </div>

            {!capitalConnected ? (
              <div className="space-y-3">
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  To execute this SMC Trading Signal directly, please connect your Capital.com brokerage account in the **Broker** tab.
                </p>
                <div className="p-3 bg-neutral-900/50 rounded-xl border border-neutral-850 text-center">
                  <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest block mb-1">Execution Status</span>
                  <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">STANDBY · PAPER TRADING DISABLED</span>
                </div>
              </div>
            ) : settings?.emergencyStop ? (
              <div className="space-y-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-red-400 font-extrabold text-[11px] uppercase tracking-wider">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>EMERGENCY STOP ACTIVE</span>
                </div>
                <p className="text-[10px] text-neutral-400 leading-normal">
                  All trade execution (automated and manual) has been locked down by risk controllers. Emergency master safety switch is active.
                </p>
              </div>
            ) : settings?.enableAutoTrading ? (
              <div className="space-y-3">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-[10px] uppercase tracking-wider">
                    <Zap className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                    <span>AUTOMATED SMC ENGINE ONLINE</span>
                  </div>
                  <p className="text-[10px] text-neutral-300 leading-relaxed">
                    SMC signals for **{selectedSymbol}** are analyzed and executed autonomously.
                  </p>
                  <div className="grid grid-cols-3 gap-1 pt-1 border-t border-neutral-900 font-mono text-[9px] text-neutral-500">
                    <div>
                      <span className="block text-neutral-600 text-[8px] uppercase">Max Positions</span>
                      <span className="font-bold text-neutral-300">{settings.maxOpenPositions}</span>
                    </div>
                    <div>
                      <span className="block text-neutral-600 text-[8px] uppercase">Max Lot Size</span>
                      <span className="font-bold text-neutral-300">{settings.maxLotSize}</span>
                    </div>
                    <div>
                      <span className="block text-neutral-600 text-[8px] uppercase">Risk Per Trade</span>
                      <span className="font-bold text-neutral-300">{settings.riskPercentage}%</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-neutral-900/30 border border-neutral-900/60 rounded-xl flex items-center justify-between text-[10px]">
                  <span className="text-neutral-500 font-medium">Auto-Execution Active</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    MONITORING MARKET
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Target setup parameters */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-neutral-900/30 border border-neutral-900/60 p-2.5 rounded-xl">
                  <div>
                    <span className="text-neutral-500 uppercase block text-[8px]">Action</span>
                    <span className={`font-bold uppercase ${signal.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {signal.type} {selectedSymbol}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 uppercase block text-[8px]">Risk Reward</span>
                    <span className="text-amber-500 font-bold block">{signal.riskReward} R</span>
                  </div>
                </div>

                {/* Lot Size Selection */}
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">predefined Lot Size • اللوت</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0.01, 0.10, 0.50, 1.00, 2.00, 5.00, 10.00].map((lot) => {
                      const isSelected = orderLot === lot;
                      return (
                        <button
                          key={lot}
                          type="button"
                          onClick={() => setOrderLot(lot)}
                          className={`py-1 px-0.5 text-[9px] font-mono font-bold rounded-md border text-center transition-all ${
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

                {/* Take Profit Target Level Selection */}
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Take Profit Target • جني الأرباح</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'tp1', label: 'TP1', val: signal.tp1 },
                      { id: 'tp2', label: 'TP2', val: signal.tp2 },
                      { id: 'tp3', label: 'TP3', val: signal.tp3 },
                    ].map((tp) => {
                      const isSelected = selectedTp === tp.id;
                      return (
                        <button
                          key={tp.id}
                          type="button"
                          onClick={() => {
                            setSelectedTp(tp.id);
                            setProfitLevel(tp.val);
                          }}
                          className={`py-1 px-1 rounded-md border text-center transition-all flex flex-col justify-between h-10 ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                              : 'bg-neutral-900/60 border-neutral-850 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <span className="text-[8px] font-bold uppercase block">{tp.label}</span>
                          <span className="text-[9px] font-mono font-semibold block">${tp.val.toLocaleString()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Auto SL/TP Option Toggle */}
                <div className="flex items-center justify-between text-[10px] bg-neutral-900/40 p-2 rounded-xl border border-neutral-900">
                  <span className="text-neutral-400">Include SL & TP in Order</span>
                  <div className="flex bg-neutral-950 p-0.5 rounded border border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setIncludeSltp(true)}
                      className={`px-2 py-1 text-[8px] font-bold rounded transition-all ${
                        includeSltp ? 'bg-amber-500 text-black font-extrabold' : 'text-neutral-500 hover:text-white'
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncludeSltp(false)}
                      className={`px-2 py-1 text-[8px] font-bold rounded transition-all ${
                        !includeSltp ? 'bg-amber-500 text-black font-extrabold' : 'text-neutral-500 hover:text-white'
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>

                {/* Status or Error notice */}
                {execMessage && (
                  <div className={`p-2.5 rounded-xl text-[10px] text-center font-mono ${
                    execMessage.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                  }`}>
                    {execMessage.text}
                  </div>
                )}

                {/* Approve and Execute Order Button */}
                <button
                  type="button"
                  disabled={isExecuting}
                  onClick={handleApproveAndSend}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Transmitting Order...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5" />
                      <span>Approve & Execute Order • تنفيذ الصفقة</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center/Right Col: AI Analysis & SMC Tools */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Analysis section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5 text-amber-500" />
              <span>AI Core Semantic Analysis</span>
            </h3>
            
            <div className="rounded-2xl bg-gradient-to-br from-[#0c0c0d] to-black border border-neutral-900 p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-neutral-900/60 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 block">High Timeframe Bias</span>
                  <p className="text-sm font-semibold text-white mt-1">{signal.marketBias} Bias</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 block">Liquidity Draw Direction</span>
                  <p className="text-sm font-semibold text-[#D1A12C] mt-1">{signal.liquidityDirection}</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs leading-relaxed">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-neutral-500 block">Strategic Trend Assessment</span>
                  <p className="text-neutral-300 mt-1">{signal.trend}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-neutral-500 block">Core Liquidity Entry Justification</span>
                  <p className="text-neutral-300 mt-1">{signal.entryReason}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-neutral-500 block">Risk invalidation & Target Rationalization</span>
                  <p className="text-neutral-300 mt-1">{signal.exitReason}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-neutral-500 block">Expected Market Behavioral Velocity</span>
                  <p className="text-neutral-300 mt-1">{signal.expectedMove}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-900/60 text-xs">
                <span className="text-neutral-500 font-mono">Structural Risk Grade</span>
                <span className={`font-mono font-bold uppercase ${
                  signal.riskLevel === 'LOW' ? 'text-emerald-400' : signal.riskLevel === 'MEDIUM' ? 'text-amber-500' : 'text-rose-500'
                }`}>
                  {signal.riskLevel} RISK
                </span>
              </div>
            </div>
          </div>

          {/* Smart Money Tools status panel */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <BarChart3 className="h-4.5 w-4.5 text-amber-500" />
              <span>SMC Structural Matrix Elements</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Buy Side Liquidity", val: signal.buySideLiquidity },
                { label: "Sell Side Liquidity", val: signal.sellSideLiquidity },
                { label: "Equal Highs (EQH)", val: signal.equalHighs },
                { label: "Equal Lows (EQL)", val: signal.equalLows },
                { label: "Fair Value Gap (FVG)", val: signal.fvg },
                { label: "Order Blocks (OB)", val: signal.orderBlocks },
                { label: "Break of Structure", val: signal.bos },
                { label: "Change of Character", val: signal.choch }
              ].map((tool, idx) => (
                <div key={idx} className="p-3 bg-neutral-950/45 border border-neutral-900 rounded-xl flex flex-col justify-between h-20 text-xs">
                  <span className="text-neutral-500 font-medium leading-tight">{tool.label}</span>
                  <span className={`font-mono font-bold tracking-wider text-[10px] mt-2 block uppercase ${
                    tool.val === 'SWEPT' || tool.val === 'CONFIRMED' || tool.val === 'BULLISH_OB' || tool.val === 'DETECTED' || tool.val === 'UNMITIGATED'
                      ? 'text-emerald-400'
                      : tool.val === 'BEARISH_OB' || tool.val === 'MITIGATED'
                      ? 'text-amber-500'
                      : 'text-neutral-600'
                  }`}>
                    {tool.val.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
