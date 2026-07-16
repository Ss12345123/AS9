import { useState } from 'react';
import { Activity, RefreshCw, Key, AlertTriangle, ShieldCheck, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';
import { MarketPrice } from '../types';

interface MarketMonitorProps {
  prices: Record<string, MarketPrice> | null;
  isLoading: boolean;
  onRefresh: () => void;
  onSelectSymbol: (symbol: string) => void;
  selectedSymbol: string;
  errorMsg: string | null;
}

export default function MarketMonitor({
  prices,
  isLoading,
  onRefresh,
  onSelectSymbol,
  selectedSymbol,
  errorMsg
}: MarketMonitorProps) {
  
  const [showKeyInstructions, setShowKeyInstructions] = useState(false);

  const marketDetails: Record<string, { name: string; category: string; description: string }> = {
    XAUUSD: { name: "Gold / US Dollar", category: "Commodities", description: "Spot Gold priced in United States Dollars. The ultimate safe haven asset." },
    BTCUSD: { name: "Bitcoin / US Dollar", category: "Crypto", description: "Bitcoin cryptocurrency priced in USD. Leading digital asset." },
    ETHUSD: { name: "Ethereum / US Dollar", category: "Crypto", description: "Ethereum cryptocurrency priced in USD. Secondary network asset." },
    EURUSD: { name: "Euro / US Dollar", category: "Forex", description: "Euro currency priced in US Dollars. The world's most liquid currency pair." },
    NAS100: { name: "Nasdaq 100 Index", category: "Indices", description: "US Nasdaq 100 stock market index, capturing top technology firms." },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Market Monitor</h1>
          <p className="text-xs text-neutral-400">Live feed tracking institutional pricing, spreads, and structural biases.</p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowKeyInstructions(!showKeyInstructions)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold bg-neutral-900 border border-neutral-800 hover:border-amber-500/20 text-neutral-300 hover:text-white rounded-xl transition-all"
          >
            <Key className="h-3.5 w-3.5 text-amber-500" />
            <span>Twelve Data Guide</span>
          </button>
          
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Live Feed</span>
          </button>
        </div>
      </div>

      {/* Guide to Twelve Data API key */}
      {showKeyInstructions && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-5 bg-neutral-950 border border-amber-500/30 rounded-2xl space-y-4 shadow-xl"
        >
          <div className="flex items-start gap-3">
            <Key className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">How to Activate Twelve Data Live Feed</h3>
              <p className="text-xs text-neutral-400 mt-1">
                This applet uses Twelve Data as the live pricing source. Your Twelve Data API key keeps the price values completely real-time.
              </p>
            </div>
          </div>
          
          <div className="bg-neutral-900/60 p-4 rounded-xl space-y-3 font-sans text-xs text-neutral-300 border border-neutral-900">
            <p className="font-semibold text-white">Follow these simple steps:</p>
            <ol className="list-decimal pl-4 space-y-2">
              <li>
                Visit <a href="https://twelvedata.com" target="_blank" rel="noopener noreferrer" className="text-amber-500 underline font-semibold">Twelve Data</a> and register for a free account to receive an API key.
              </li>
              <li>
                Open the <span className="text-amber-500 font-semibold">Settings</span> panel in the AI Studio sidebar.
              </li>
              <li>
                Go to the <span className="text-amber-500 font-semibold">Secrets / Environment Variables</span> section.
              </li>
              <li>
                Create/edit a secret called <code className="bg-black/55 text-amber-500 px-1.5 py-0.5 rounded font-mono font-bold">TWELVE_DATA_API_KEY</code> and paste your key.
              </li>
              <li>
                Click save and refresh the platform! Live pricing will start ticking automatically.
              </li>
            </ol>
          </div>
        </motion.div>
      )}

      {/* Live Market Data Error / Warning Banner */}
      {errorMsg && (
        <div className="p-4 bg-amber-950/20 border border-amber-500/25 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs uppercase tracking-widest font-bold text-amber-500">Live Market Data Offline</h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                {errorMsg}. Please configure a valid API key or wait a moment for the rate limit to reset.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowKeyInstructions(true)}
            className="text-xs font-semibold text-amber-500 underline hover:text-amber-400 self-start md:self-auto"
          >
            Configure Key Now
          </button>
        </div>
      )}

      {/* Grid: Live Prices Table/Cards & selected details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Market Pricing Grid (2 cols on large screen) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-500" />
            <span>Real-time Feeds</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(marketDetails).map((sym) => {
              const item = prices ? prices[sym] : null;
              const details = marketDetails[sym];
              const isSelected = selectedSymbol === sym;

              return (
                <div
                  key={sym}
                  onClick={() => onSelectSymbol(sym)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-40 ${
                    isSelected 
                      ? 'bg-gradient-to-br from-[#12110D] to-black border-amber-500/40 shadow-lg shadow-amber-500/5' 
                      : 'bg-neutral-950/50 border-neutral-900 hover:border-neutral-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">{details.category}</span>
                      <h3 className="text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
                        {sym}
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>}
                      </h3>
                      <p className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{details.name}</p>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold uppercase ${
                        item?.marketStatus === 'open' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                          : 'bg-neutral-900 text-neutral-500 border border-neutral-850'
                      }`}>
                        {item?.marketStatus || 'OPEN'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between mt-4">
                    <div>
                      <span className="text-[9px] text-neutral-500 uppercase tracking-widest block">Price / Change</span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        {!item && errorMsg ? (
                          <span className="text-xs font-semibold text-rose-400">Live Market Data Unavailable</span>
                        ) : (
                          <>
                            <span className="text-xl font-bold font-mono tracking-tight text-white">
                              {item ? (sym === 'EURUSD' ? item.price.toFixed(5) : item.price.toLocaleString()) : '---'}
                            </span>
                            
                            {item ? (
                              <span className={`text-xs font-mono font-semibold flex items-center ${item.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {item.change24h >= 0 ? <TrendingUp className="h-3 w-3 inline mr-0.5" /> : <TrendingDown className="h-3 w-3 inline mr-0.5" />}
                                {item.change24h >= 0 ? '+' : ''}{item.change24h}%
                              </span>
                            ) : (
                              <span className="text-xs text-neutral-600 font-mono">---</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-neutral-500 uppercase tracking-widest block">Spread / Commissions</span>
                      <span className="text-xs font-semibold text-neutral-300 font-mono mt-0.5 block">
                        {item ? `${item.spread} pips` : errorMsg ? 'Unavailable' : '---'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Asset Details Panel */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Asset Specifications</h2>
          
          <div className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-6 space-y-6">
            <div>
              <span className="text-[10px] font-mono text-amber-500 font-semibold uppercase tracking-widest">Selected Instrument</span>
              <h3 className="text-2xl font-bold text-white tracking-tight mt-1">{selectedSymbol}</h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                {marketDetails[selectedSymbol].description}
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs pt-4 border-t border-neutral-900">
              <div className="flex justify-between items-center py-1 border-b border-neutral-900/40">
                <span className="text-neutral-500">Contract Unit</span>
                <span className="text-neutral-200">
                  {selectedSymbol === 'XAUUSD' && '100 oz'}
                  {selectedSymbol === 'EURUSD' && '100,000 EUR'}
                  {selectedSymbol === 'BTCUSD' && '1 BTC'}
                  {selectedSymbol === 'ETHUSD' && '1 ETH'}
                  {selectedSymbol === 'NAS100' && '1 Index Contract'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-900/40">
                <span className="text-neutral-500">Margin Factor</span>
                <span className="text-neutral-200">1:500 Leverage</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-900/40">
                <span className="text-neutral-500">Trading Status</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> SECURE TRADING
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-500">Volatility Rating</span>
                <span className="text-amber-500 font-semibold">
                  {selectedSymbol === 'XAUUSD' && 'HIGH'}
                  {selectedSymbol === 'BTCUSD' && 'EXTREME'}
                  {selectedSymbol === 'ETHUSD' && 'HIGH'}
                  {selectedSymbol === 'EURUSD' && 'LOW'}
                  {selectedSymbol === 'NAS100' && 'MEDIUM'}
                </span>
              </div>
            </div>

            <button
              onClick={() => onSelectSymbol(selectedSymbol)}
              className="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 text-xs font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all mt-4"
            >
              <span>Load Analytical Chart</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
