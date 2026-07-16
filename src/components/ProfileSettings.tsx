import React, { useEffect, useRef, useState } from 'react';
import { User, Settings, ShieldCheck, Mail, Sliders, Volume2, VolumeX, Shield, CreditCard, Key, Bell, Server, Check, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile, SystemSettings, TradeHistoryItem } from '../types';
import EmailNotificationCenter from './EmailNotificationCenter';

interface ProfileSettingsProps {
  profile: UserProfile;
  settings: SystemSettings;
  onUpdateProfile: (updatedProfile: Partial<UserProfile>) => void;
  onUpdateSettings: (updatedSettings: Partial<SystemSettings>) => void;
  onLogout: () => void;
  onPlaySound?: (type: 'success' | 'warning' | 'alert') => void;
  onAddNotification?: (type: 'signal' | 'news' | 'tp_sl' | 'ai', title: string, message: string) => void;
  onNavigateToStatus?: () => void;
  history?: TradeHistoryItem[];
}

export default function ProfileSettings({
  profile,
  settings,
  onUpdateProfile,
  onUpdateSettings,
  onLogout,
  onPlaySound = () => {},
  onAddNotification = () => {},
  onNavigateToStatus,
  history,
}: ProfileSettingsProps) {
  
  const [activeSubTab, setActiveSubTab] = useState<'terminal' | 'email'>('terminal');
  const [fullName, setFullName] = useState(profile?.fullName || '');

  const [username, setUsername] = useState(profile?.username || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [isSaved, setIsSaved] = useState(false);

  const [tradingVolume, setTradingVolume] = useState(settings.tradingVolume);
  const [riskTolerance, setRiskTolerance] = useState(settings.riskTolerance);
  const [enableAudioAlerts, setEnableAudioAlerts] = useState(settings.enableAudioAlerts);
  const [enablePush, setEnablePush] = useState(settings.enablePushNotifications);
  const [keyOverride, setKeyOverride] = useState(settings.apiKeyOverride || '');
  const [enableAutoTrading, setEnableAutoTrading] = useState(settings.enableAutoTrading ?? false);
  const [emergencyStop, setEmergencyStop] = useState(settings.emergencyStop ?? false);
  const [maxOpenPositions, setMaxOpenPositions] = useState(settings.maxOpenPositions ?? 3);
  const [maxLotSize, setMaxLotSize] = useState(settings.maxLotSize ?? 2.0);
  const [riskPercentage, setRiskPercentage] = useState(settings.riskPercentage ?? 1.5);

  // Trade Protection States
  const [enableBreakEven, setEnableBreakEven] = useState(settings.enableBreakEven ?? true);
  const [breakEvenTrigger, setBreakEvenTrigger] = useState(settings.breakEvenTrigger ?? 70);
  const [enableTrailingStop, setEnableTrailingStop] = useState(settings.enableTrailingStop ?? false);
  const [trailingStopDistance, setTrailingStopDistance] = useState(settings.trailingStopDistance ?? 50);
  const [enablePartialTP, setEnablePartialTP] = useState(settings.enablePartialTP ?? false);
  const [partialClosePercentage, setPartialClosePercentage] = useState(settings.partialClosePercentage ?? 50);
  const [partialTPTrigger, setPartialTPTrigger] = useState(settings.partialTPTrigger ?? 100);

  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Push a settings change up immediately and flash an auto-save indicator.
  const autoSaveSettings = (patch: Partial<SystemSettings>) => {
    onUpdateSettings(patch);
    setAutoSaveState('saving');
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setAutoSaveState('saved'), 400);
  };

  useEffect(() => {
    setTradingVolume(settings.tradingVolume);
    setRiskTolerance(settings.riskTolerance);
    setEnableAudioAlerts(settings.enableAudioAlerts);
    setEnablePush(settings.enablePushNotifications);
    setKeyOverride(settings.apiKeyOverride || '');
    setEnableAutoTrading(settings.enableAutoTrading ?? false);
    setEmergencyStop(settings.emergencyStop ?? false);
    setMaxOpenPositions(settings.maxOpenPositions ?? 3);
    setMaxLotSize(settings.maxLotSize ?? 2.0);
    setRiskPercentage(settings.riskPercentage ?? 1.5);
    
    // Trade Protections
    setEnableBreakEven(settings.enableBreakEven ?? true);
    setBreakEvenTrigger(settings.breakEvenTrigger ?? 70);
    setEnableTrailingStop(settings.enableTrailingStop ?? false);
    setTrailingStopDistance(settings.trailingStopDistance ?? 50);
    setEnablePartialTP(settings.enablePartialTP ?? false);
    setPartialClosePercentage(settings.partialClosePercentage ?? 50);
    setPartialTPTrigger(settings.partialTPTrigger ?? 100);
  }, [settings]);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
      if (keyDebounce.current) clearTimeout(keyDebounce.current);
    };
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({ fullName, username, email });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Upper header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Security & Preferences</h1>
        <p className="text-xs text-neutral-400">Manage institutional profile metrics, trade execution sizes, and live API endpoints.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar & Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-6 text-center space-y-4">
            
            {/* Avatar block */}
            <div className="relative inline-block mx-auto">
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-[#12110D] to-black border border-amber-500/30 p-2 flex items-center justify-center shadow-[0_0_20px_rgba(218,165,32,0.1)]">
                <img 
                  referrerPolicy="no-referrer"
                  src={profile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile?.username || 'default'}`} 
                  alt="Avatar" 
                  className="h-full w-full rounded-xl object-contain bg-black/40"
                />
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 border border-black h-4 w-4 rounded-full" title="Node Online"></span>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">{profile?.fullName || 'Trader'}</h3>
              <p className="text-xs text-amber-500/90 font-mono mt-0.5">@{profile?.username || 'trader'}</p>
            </div>

            {/* Quick account details */}
            <div className="space-y-2.5 font-mono text-[11px] text-left border-t border-neutral-900/60 pt-4">
              <div className="flex justify-between">
                <span className="text-neutral-500">Security Clearance</span>
                <span className="text-neutral-200 font-bold uppercase">LEVEL_3_TRADER</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Execution Leverage</span>
                <span className="text-[#D1A12C] font-bold">1:500 SECURE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Assigned Broker Node</span>
                <span className="text-neutral-200">GOLD_BROKER_MAIN_01</span>
              </div>
            </div>

            {onNavigateToStatus && (
              <button
                onClick={onNavigateToStatus}
                className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/30 text-amber-500 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wider font-mono cursor-pointer"
              >
                <Server className="h-3.5 w-3.5" />
                <span>System Status & Admin</span>
              </button>
            )}

            <button
              onClick={onLogout}
              className="w-full bg-neutral-900/40 hover:bg-red-950/20 border border-neutral-850 hover:border-red-900/40 text-neutral-400 hover:text-red-400 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all"
            >
              Terminate Session (Logout)
            </button>
          </div>
        </div>

        {/* Right Columns: Profile Form & Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Notification banner */}
          {isSaved && (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-xs text-emerald-400">
              Terminal settings synchronized successfully with the secure backend.
            </div>
          )}

          {/* Sub-tab Switcher */}
          <div className="flex border-b border-neutral-900 pb-1.5 gap-2">
            <button
              onClick={() => setActiveSubTab('terminal')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider font-mono border-b-2 transition-all ${
                activeSubTab === 'terminal'
                  ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              } rounded-t-xl`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Terminal Setup</span>
            </button>
            <button
              onClick={() => setActiveSubTab('email')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider font-mono border-b-2 transition-all ${
                activeSubTab === 'email'
                  ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              } rounded-t-xl`}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email Notification Center</span>
            </button>
          </div>

          {activeSubTab === 'terminal' ? (
            <div className="space-y-6">
              {/* Profile Form */}
          <div className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-amber-500" />
              <span>Identity Profile</span>
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-2 px-3 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-2 px-3 text-xs text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Registered Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-2 px-3 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs py-2 px-4 rounded-xl transition-all"
                >
                  Save Profile Change
                </button>
              </div>
            </form>
          </div>

          {/* Trading Preferences Settings */}
          <div className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="h-4.5 w-4.5 text-amber-500" />
              <span>Execution Parameters</span>
            </h3>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Default Volume size (Predefined and limited) */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-amber-500 uppercase tracking-wider mb-2">
                    Default Lot Size (Volume) • حجم اللوت المحدد
                  </label>
                  <p className="text-[10px] text-neutral-500 mb-3 leading-relaxed">
                    Choose one of the secure institutional predefined lot sizes. Free-text arbitrary lots are disabled for safety.
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { value: 0.01, label: '0.01 Micro', desc: 'SMC Conservative' },
                      { value: 0.10, label: '0.10 Mini', desc: 'Balanced Leverage' },
                      { value: 0.50, label: '0.50 Mid', desc: 'Professional' },
                      { value: 1.00, label: '1.00 Standard', desc: 'Standard Contract' },
                      { value: 2.00, label: '2.00 Double', desc: 'High Exposure' },
                      { value: 5.00, label: '5.00 VIP', desc: 'Institutional' },
                      { value: 10.00, label: '10.00 Max', desc: 'Maximum Risk' }
                    ].map((preset) => {
                      const isSelected = tradingVolume === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => {
                            setTradingVolume(preset.value);
                            autoSaveSettings({ tradingVolume: preset.value });
                          }}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_15px_rgba(218,165,32,0.15)]'
                              : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700 text-neutral-400'
                          }`}
                        >
                          <span className="text-xs font-bold font-mono">{preset.label}</span>
                          <span className="text-[9px] text-neutral-500 mt-1">{preset.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Risk profile selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Risk Tolerance Model</label>
                  <select
                    value={riskTolerance}
                    onChange={(e: any) => {
                      setRiskTolerance(e.target.value);
                      autoSaveSettings({ riskTolerance: e.target.value });
                    }}
                    className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-2 px-3 text-xs text-white"
                  >
                    <option value="low">Low Risk (Conservative)</option>
                    <option value="medium">Medium Risk (Balanced)</option>
                    <option value="high">High Risk (Aggressive)</option>
                  </select>
                </div>

                {/* Twelve Data Key browser override */}
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-amber-500" />
                      <span>Twelve Data Key Override (Client Side)</span>
                    </label>
                    <span className="text-[9px] text-neutral-600 uppercase">Optional Override</span>
                  </div>
                  <input
                    type="password"
                    placeholder="Enter twelve data key here to override .env parameter"
                    value={keyOverride}
                    onChange={(e) => {
                      const val = e.target.value;
                      setKeyOverride(val);
                      if (keyDebounce.current) clearTimeout(keyDebounce.current);
                      keyDebounce.current = setTimeout(() => autoSaveSettings({ apiKeyOverride: val || undefined }), 600);
                    }}
                    className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-700 font-mono"
                  />
                </div>

                {/* Checkbox triggers */}
                <div className="md:col-span-2 flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableAudioAlerts}
                      onChange={(e) => {
                        setEnableAudioAlerts(e.target.checked);
                        autoSaveSettings({ enableAudioAlerts: e.target.checked });
                      }}
                      className="rounded border-neutral-800 bg-neutral-900/60 text-amber-500 focus:ring-amber-500/30"
                    />
                    <div>
                      <span className="text-xs text-neutral-200 block font-medium">Trigger Sound Alerts</span>
                      <span className="text-[10px] text-neutral-500">Audio feedback on TP/SL hits and incoming announcements</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enablePush}
                      onChange={(e) => {
                        setEnablePush(e.target.checked);
                        autoSaveSettings({ enablePushNotifications: e.target.checked });
                      }}
                      className="rounded border-neutral-800 bg-neutral-900/60 text-amber-500 focus:ring-amber-500/30"
                    />
                    <div>
                      <span className="text-xs text-neutral-200 block font-medium">Trigger In-App Toasts</span>
                      <span className="text-[10px] text-neutral-500">Push real-time popup toasts for system alerts</span>
                    </div>
                  </label>
                </div>

              </div>

              <div className="flex justify-end items-center pt-2">
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-500">
                  {autoSaveState === 'saving' ? (
                    <><Loader2 className="h-3 w-3 animate-spin text-amber-500" /> Saving…</>
                  ) : autoSaveState === 'saved' ? (
                    <><Check className="h-3 w-3 text-emerald-400" /> All changes saved automatically</>
                  ) : (
                    <>Changes save automatically</>
                  )}
                </span>
              </div>
            </form>
          </div>

          {/* Automated Trading Engine & Risk Controls */}
          <div className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="h-4.5 w-4.5 text-amber-500" />
              <span>Automated SMC Engine & Risk Guard</span>
            </h3>
            
            <p className="text-[11px] text-neutral-500 leading-relaxed font-sans">
              Configure the quantitative automated trading engine. Once enabled, the engine continuously scans live markets, detects Smart Money Concept signals, applies risk filters, and places direct orders automatically.
            </p>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Emergency Stop Switch */}
                <div className="md:col-span-2 p-4 bg-red-950/10 border border-red-500/20 rounded-xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emergencyStop}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEmergencyStop(val);
                        autoSaveSettings({ emergencyStop: val });
                      }}
                      className="rounded border-red-800 bg-neutral-900/60 text-red-500 focus:ring-red-500/30 h-5 w-5"
                    />
                    <div>
                      <span className="text-xs text-red-400 font-extrabold uppercase tracking-wide block">EMERGENCY MASTER STOP SWITCH</span>
                      <span className="text-[10px] text-neutral-400">Instantly halt all automated trading scanning and disable trade executions.</span>
                    </div>
                  </label>
                </div>

                {/* Enable Automated Trading */}
                <div className="md:col-span-2 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableAutoTrading}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEnableAutoTrading(val);
                        autoSaveSettings({ enableAutoTrading: val });
                      }}
                      className="rounded border-neutral-800 bg-neutral-900/60 text-amber-500 focus:ring-amber-500/30 h-5 w-5"
                    />
                    <div>
                      <span className="text-xs text-amber-500 font-bold uppercase tracking-wider block">ENABLE FULLY AUTOMATED SMC TRADING</span>
                      <span className="text-[10px] text-neutral-400 font-sans">Enable the background loop to continuously scan live markets and place trades without manual confirmation.</span>
                    </div>
                  </label>
                </div>

                {/* Risk per trade */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Risk Percentage Per Trade</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={riskPercentage}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 1.5;
                        setRiskPercentage(val);
                        autoSaveSettings({ riskPercentage: val });
                      }}
                      className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-2 px-3 pr-8 text-xs text-white font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-bold">%</span>
                  </div>
                  <span className="text-[9px] text-neutral-500 mt-1 block">Account balance % risked per trade based on SL distance.</span>
                </div>

                {/* Max Open Positions */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Max Open Positions</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxOpenPositions}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 3;
                      setMaxOpenPositions(val);
                      autoSaveSettings({ maxOpenPositions: val });
                    }}
                    className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-2 px-3 text-xs text-white font-mono"
                  />
                  <span className="text-[9px] text-neutral-500 mt-1 block">Upper limit on simultaneous active trades on the broker.</span>
                </div>

                {/* Max Lot Size */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Maximum Lot Size Limit (Max Lot Guard)</label>
                  <select
                    value={maxLotSize}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 2.0;
                      setMaxLotSize(val);
                      autoSaveSettings({ maxLotSize: val });
                    }}
                    className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-2 px-3 text-xs text-white font-mono"
                  >
                    <option value="0.1">0.10 Lots (Conservative Guard)</option>
                    <option value="0.5">0.50 Lots (Medium Risk Guard)</option>
                    <option value="1.0">1.00 Lots (Standard Guard)</option>
                    <option value="2.0">2.00 Lots (Balanced Professional)</option>
                    <option value="5.0">5.00 Lots (Institutional Exposure)</option>
                    <option value="10.0">10.00 Lots (Maximum VIP Limit)</option>
                  </select>
                  <span className="text-[9px] text-neutral-500 mt-1 block">Hard safety limit. Lot size calculated by risk model will be capped at this value.</span>
                </div>

              </div>
            </form>
          </div>

          {/* Trade Protection Settings Section */}
          <div id="trade-protection-settings" className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-amber-500" />
              <span>Trade Protection Settings</span>
            </h3>
            
            <p className="text-[11px] text-neutral-500 leading-relaxed font-sans">
              Configure risk mitigation rules for active positions. Once configured, protection settings run autonomously inside the trade monitoring loop.
            </p>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Break Even System */}
                <div className="md:col-span-2 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableBreakEven}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEnableBreakEven(val);
                        autoSaveSettings({ enableBreakEven: val });
                      }}
                      className="rounded border-neutral-800 bg-neutral-900/60 text-amber-500 focus:ring-amber-500/30 h-5 w-5"
                    />
                    <div>
                      <span className="text-xs text-amber-500 font-bold uppercase tracking-wider block">Enable Break Even (تحريك الوقف للدخول)</span>
                      <span className="text-[10px] text-neutral-400 font-sans">Automatically move Stop Loss to the Entry Price once a trade is in sufficient profit.</span>
                    </div>
                  </label>

                  {enableBreakEven && (
                    <div className="pt-2 pl-8 border-t border-neutral-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                          Break Even Trigger (Points)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={breakEvenTrigger}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 70;
                            setBreakEvenTrigger(val);
                            autoSaveSettings({ breakEvenTrigger: val });
                          }}
                          className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-1.5 px-3 text-xs text-white font-mono"
                        />
                        <span className="text-[9px] text-neutral-500 mt-1 block">Default: 70 points (e.g., $7.00 for GOLD).</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Trailing Stop System */}
                <div className="md:col-span-2 p-4 bg-neutral-900/20 border border-neutral-800/60 rounded-xl space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableTrailingStop}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEnableTrailingStop(val);
                        autoSaveSettings({ enableTrailingStop: val });
                      }}
                      className="rounded border-neutral-800 bg-neutral-900/60 text-amber-500 focus:ring-amber-500/30 h-5 w-5"
                    />
                    <div>
                      <span className="text-xs text-neutral-200 font-bold uppercase tracking-wider block">Enable Trailing Stop (الوقف المتحرك)</span>
                      <span className="text-[10px] text-neutral-500 font-sans">Secure trailing profits dynamically behind the price movement.</span>
                    </div>
                  </label>

                  {enableTrailingStop && (
                    <div className="pt-2 pl-8 border-t border-neutral-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                          Trailing Distance (Points)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="1000"
                          value={trailingStopDistance}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 50;
                            setTrailingStopDistance(val);
                            autoSaveSettings({ trailingStopDistance: val });
                          }}
                          className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-1.5 px-3 text-xs text-white font-mono"
                        />
                        <span className="text-[9px] text-neutral-500 mt-1 block">Distance behind current market price (Default: 50).</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Partial Take Profit System */}
                <div className="md:col-span-2 p-4 bg-neutral-900/20 border border-neutral-800/60 rounded-xl space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enablePartialTP}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEnablePartialTP(val);
                        autoSaveSettings({ enablePartialTP: val });
                      }}
                      className="rounded border-neutral-800 bg-neutral-900/60 text-amber-500 focus:ring-amber-500/30 h-5 w-5"
                    />
                    <div>
                      <span className="text-xs text-neutral-200 font-bold uppercase tracking-wider block">Enable Partial Take Profit (جني الأرباح الجزئي)</span>
                      <span className="text-[10px] text-neutral-500 font-sans">Secure a portion of the trade's size when a target profit level is hit.</span>
                    </div>
                  </label>

                  {enablePartialTP && (
                    <div className="pt-2 pl-8 border-t border-neutral-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                          Partial Close Percentage (%)
                        </label>
                        <input
                          type="number"
                          min="10"
                          max="90"
                          value={partialClosePercentage}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 50;
                            setPartialClosePercentage(val);
                            autoSaveSettings({ partialClosePercentage: val });
                          }}
                          className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-1.5 px-3 text-xs text-white font-mono"
                        />
                        <span className="text-[9px] text-neutral-500 mt-1 block">Percentage of trade size to close (Default: 50%).</span>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                          Partial Trigger (Points)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="2000"
                          value={partialTPTrigger}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 100;
                            setPartialTPTrigger(val);
                            autoSaveSettings({ partialTPTrigger: val });
                          }}
                          className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-1.5 px-3 text-xs text-white font-mono"
                        />
                        <span className="text-[9px] text-neutral-500 mt-1 block">Trigger distance in points (Default: 100).</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </form>
          </div>
          </div>
          ) : (
            <EmailNotificationCenter onPlaySound={onPlaySound} onAddNotification={onAddNotification} />
          )}

        </div>

      </div>

    </div>
  );
}
