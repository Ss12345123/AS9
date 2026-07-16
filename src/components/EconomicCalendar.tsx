import { useEffect, useState } from 'react';
import { Calendar, AlertCircle, Clock, Volume2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EconomicEvent } from '../types';

interface EconomicCalendarProps {
  onFilterStatusChange: (isBlocked: boolean, warningText: string | null) => void;
}

export default function EconomicCalendar({ onFilterStatusChange }: EconomicCalendarProps) {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [now, setNow] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);

  // Load real macro economic events from the backend calendar provider.
  useEffect(() => {
    let cancelled = false;
    const loadEvents = async () => {
      try {
        const res = await fetch('/api/economic-calendar');
        const data = await res.json();
        if (cancelled) return;
        const list: EconomicEvent[] = Array.isArray(data.events) ? data.events : [];
        setEvents(list);
        setUnavailableMessage(data.available === false ? (data.message || 'Economic calendar data is unavailable.') : null);
      } catch {
        if (!cancelled) setUnavailableMessage('Unable to reach the economic calendar service.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadEvents();
    // Refresh periodically so newly-scheduled events appear.
    const poll = setInterval(loadEvents, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  // Set up ticker to update countdown timers every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate and trigger news filter blockage
  useEffect(() => {
    if (events.length === 0) return;

    let isAnyBlocked = false;
    let blockWarning: string | null = null;

    events.forEach(evt => {
      if (evt.impact === 'high') {
        const evtTime = new Date(evt.eventTime);
        const diffMs = evtTime.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / (60 * 1000));

        // Block is active if event is starting within next 30 minutes, or currently active (up to 45 mins after starting)
        if (diffMinutes <= 30 && diffMinutes >= -45) {
          isAnyBlocked = true;
          if (diffMinutes >= 0) {
            blockWarning = `${evt.speakerName} (${evt.institution}) will speak in ${diffMinutes} minutes. AI trade signals are locked to prevent excessive volatility slippage.`;
          } else {
            blockWarning = `${evt.speakerName} (${evt.institution}) is currently speaking. AI trade signals are locked to protect trading collateral.`;
          }
        }
      }
    });

    onFilterStatusChange(isAnyBlocked, blockWarning);
  }, [events, now, onFilterStatusChange]);

  const getCountdownString = (eventTimeStr: string) => {
    const eventTime = new Date(eventTimeStr);
    const diffMs = eventTime.getTime() - now.getTime();
    
    if (diffMs < 0) {
      const diffMins = Math.floor(Math.abs(diffMs) / (60 * 1000));
      if (diffMins < 45) {
        return "ACTIVE";
      }
      return "COMPLETED";
    }

    const hours = Math.floor(diffMs / (3600 * 1000));
    const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    const secs = Math.floor((diffMs % (60 * 1000)) / 1000);

    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  };

  const getImpactBadge = (impact: 'low' | 'medium' | 'high') => {
    if (impact === 'high') {
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-500/10 text-rose-400 border border-rose-500/25">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping"></span>
          🔴 High Impact
        </span>
      );
    } else if (impact === 'medium') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500/10 text-[#D1A12C] border border-amber-500/20">
          🟡 Medium Impact
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        🟢 Low Impact
      </span>
    );
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      US: "🇺🇸",
      EU: "🇪🇺",
      GB: "🇬🇧",
      JP: "🇯🇵",
      CH: "🇨🇭",
      AU: "🇦🇺",
      CA: "🇨🇦"
    };
    return flags[country] || "🌐";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-[#D1A12C]" />
            <span>Institutional Economic Calendar</span>
          </h2>
          <p className="text-xs text-neutral-500">Monitoring high impact announcements affecting global asset liquidity pools.</p>
        </div>
      </div>

      {(isLoading || events.length === 0) && (
        <div className="py-12 text-center border border-dashed border-neutral-900 rounded-2xl">
          {isLoading ? (
            <p className="text-xs text-neutral-500 font-mono uppercase tracking-widest">Loading economic calendar…</p>
          ) : (
            <div className="space-y-2">
              <Calendar className="h-6 w-6 text-neutral-700 mx-auto" />
              <p className="text-sm text-neutral-400 font-semibold">No upcoming economic events</p>
              <p className="text-[11px] text-neutral-600 max-w-sm mx-auto leading-relaxed">
                {unavailableMessage || 'There are no scheduled high-impact events at this time.'}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {events.map((evt) => {
          const evtTime = new Date(evt.eventTime);
          const diffMs = evtTime.getTime() - now.getTime();
          const isSoon = diffMs > 0 && diffMs <= 30 * 60 * 1000;
          const isActive = diffMs <= 0 && Math.abs(diffMs) < 45 * 60 * 1000;

          return (
            <div 
              key={evt.id} 
              className={`p-5 rounded-2xl border transition-all ${
                isActive 
                  ? 'bg-rose-950/10 border-rose-500/35 shadow-lg shadow-rose-500/5' 
                  : isSoon 
                  ? 'bg-amber-950/10 border-amber-500/30 shadow-md' 
                  : 'bg-neutral-950/60 border-neutral-900 hover:border-neutral-850'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Meta details */}
                <div className="flex items-start gap-3">
                  <span className="text-3xl shrink-0 select-none mt-1">{getCountryFlag(evt.country)}</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-neutral-400">{evt.institution}</span>
                      {getImpactBadge(evt.impact)}
                    </div>
                    <h3 className="text-sm font-bold text-white mt-1 uppercase tracking-wide">
                      {evt.eventName}
                    </h3>
                    {evt.speakerName && (
                      <p className="text-xs text-amber-500 font-semibold mt-0.5">Speaker: {evt.speakerName}</p>
                    )}
                  </div>
                </div>

                {/* Clock countdown */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center p-3 bg-neutral-900/40 border border-neutral-900 rounded-xl shrink-0 w-full md:w-36 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-neutral-500" />
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Countdown</span>
                  </div>
                  <span className={`text-sm font-bold mt-1 ${
                    isActive ? 'text-red-500 animate-pulse font-extrabold' : isSoon ? 'text-amber-500 animate-pulse' : 'text-neutral-200'
                  }`}>
                    {getCountdownString(evt.eventTime)}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="mt-4 pt-3 border-t border-neutral-900/60 text-xs text-neutral-400 leading-relaxed flex items-start gap-2">
                <p>{evt.shortDescription}</p>
              </div>

              {/* Special warning if blocked */}
              {evt.impact === 'high' && (isActive || isSoon) && (
                <div className="mt-3 p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl flex items-center gap-2 text-[11px] text-rose-400">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>AI trade signal calculation is paused during this window to preserve trading account leverage.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
