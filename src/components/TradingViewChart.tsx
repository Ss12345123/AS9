import { useEffect, useRef, useState } from 'react';
import { Eye, Settings, ShieldAlert, MonitorPlay } from 'lucide-react';
import { motion } from 'motion/react';

interface TradingViewChartProps {
  symbol?: string;
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

export default function TradingViewChart({
  symbol,
  selectedSymbol,
  onSymbolChange,
}: TradingViewChartProps) {
  
  const [timeframe, setTimeframe] = useState<string>("1H");
  const activeSymbol = symbol || selectedSymbol;
  const containerRef = useRef<HTMLDivElement>(null);
  
  const symbols = ["XAUUSD", "BTCUSD", "ETHUSD", "EURUSD", "NAS100"];
  const timeframes = ["1M", "5M", "15M", "1H", "4H", "1D"];

  // Map our display symbol to standard TradingView ticker
  const symbolMap: Record<string, string> = {
    XAUUSD: "FX:XAUUSD",
    BTCUSD: "COINBASE:BTCUSD",
    ETHUSD: "COINBASE:ETHUSD",
    EURUSD: "FX:EURUSD",
    NAS100: "OANDA:NAS100USD",
  };

  // Map our timeframe to TradingView interval value
  const intervalMap: Record<string, string> = {
    "1M": "1",
    "5M": "5",
    "15M": "15",
    "1H": "60",
    "4H": "240",
    "1D": "D",
  };

  useEffect(() => {
    // Dynamically load TradingView Widget Library script
    const scriptId = 'tradingview-widget-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    // Generate a unique ID for each widget mount
    const currentContainerId = `tv-chart-${Math.random().toString(36).substring(2, 9)}`;

    // Create the widget element dynamically
    const chartContainer = document.createElement('div');
    chartContainer.id = currentContainerId;
    chartContainer.className = 'w-full h-full rounded-xl';

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(chartContainer);
    }

    const initWidget = () => {
      if (typeof window !== 'undefined' && (window as any).TradingView && document.getElementById(currentContainerId)) {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: symbolMap[activeSymbol] || "FX:XAUUSD",
          interval: intervalMap[timeframe] || "60",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#09090b",
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          container_id: currentContainerId,
          studies: [
            "RSI@tv-basicstudies",
            "MASimple@tv-basicstudies",
            "MACD@tv-basicstudies"
          ],
          colors: {
            palette: {
              background: "#09090b",
              gridLines: "#1c1b1f"
            }
          }
        });
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://s3.tradingview.com/tv.js';
      script.type = 'text/javascript';
      script.async = true;
      script.onload = initWidget;
      document.head.appendChild(script);
    } else {
      if ((window as any).TradingView) {
        initWidget();
      } else {
        script.addEventListener('load', initWidget);
      }
    }

    return () => {
      if (script) {
        script.removeEventListener('load', initWidget);
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [activeSymbol, timeframe]);

  return (
    <div className="space-y-4">
      {/* Selector bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-neutral-950/60 border border-neutral-900 rounded-2xl">
        {/* Asset Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 mr-2">Asset</span>
          {symbols.map((sym) => (
            <button
              key={sym}
              onClick={() => onSymbolChange(sym)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                selectedSymbol === sym
                  ? 'bg-amber-500/10 border border-amber-500/40 text-[#D1A12C] shadow-[0_0_12px_rgba(218,165,32,0.1)]'
                  : 'bg-neutral-900 border border-neutral-850 text-neutral-400 hover:text-white'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        {/* Timeframe Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 mr-2">Timeframe</span>
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all ${
                timeframe === tf
                  ? 'bg-amber-500 text-black shadow-[0_4px_12px_rgba(218,165,32,0.15)]'
                  : 'bg-neutral-900 border border-neutral-850 text-neutral-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div className="relative overflow-hidden rounded-2xl bg-neutral-950 border border-neutral-900 p-1 shadow-inner h-[500px]">
        {/* TradingView Element */}
        <div ref={containerRef} className="w-full h-full rounded-xl"></div>
        
        {/* Institutional branding badge inside chart corner */}
        <div className="absolute bottom-4 left-4 bg-[#09090b]/90 border border-neutral-850 px-3 py-1.5 rounded-xl flex items-center gap-1.5 pointer-events-none select-none z-10">
          <MonitorPlay className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[10px] font-mono tracking-widest text-neutral-400">GOLD_AI_LIVE_CHART</span>
        </div>
      </div>
    </div>
  );
}
