import React, { useState, useEffect } from 'react';
import { 
  Mail, Shield, Check, AlertCircle, RefreshCw, Send, Sparkles, 
  Settings, Bell, CheckSquare, Eye, X, BookOpen, ExternalLink, Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmailNotificationSettings } from '../types';

interface EmailNotificationCenterProps {
  onPlaySound: (type: 'success' | 'warning' | 'alert') => void;
  onAddNotification: (type: 'signal' | 'news' | 'tp_sl' | 'ai', title: string, message: string) => void;
}

const NOTIFICATION_OPTIONS = [
  { key: 'tradeEntrySignal', label: 'Trade Entry Signal', category: 'Trading Signals', desc: 'Alerts when a new institutional trade contract is executed' },
  { key: 'takeProfitHit', label: 'Take Profit Hit', category: 'Trading Signals', desc: 'Dispatches instantly when take profit targets (TP1, TP2, TP3) are mitigated' },
  { key: 'stopLossHit', label: 'Stop Loss Hit', category: 'Trading Signals', desc: 'Notifies when stop loss invalidation thresholds are hit' },
  { key: 'newAiTradingOpportunity', label: 'New AI Trading Opportunity', category: 'Trading Signals', desc: 'SMC analysis flagged high-probability setups' },
  
  { key: 'highImpactNews', label: 'High Impact News Alerts', category: 'Macroeconomics', desc: 'Alerts 15 mins before high-impact economic folder releases' },
  { key: 'federalReserveSpeeches', label: 'Federal Reserve Speeches', category: 'Macroeconomics', desc: 'Monitors FOMC governors and Fed chair live remarks' },
  { key: 'centralBankSpeeches', label: 'Central Bank Speeches', category: 'Macroeconomics', desc: 'Speeches from ECB, BoE, and BoJ policymakers' },
  { key: 'cpi', label: 'CPI (Inflation Data)', category: 'Macroeconomics', desc: 'Consumer Price Index reports tracking inflation rate metrics' },
  { key: 'ppi', label: 'PPI Data Releases', category: 'Macroeconomics', desc: 'Producer Price Index wholesale price trends' },
  { key: 'nfp', label: 'NFP (Non-Farm Payrolls)', category: 'Macroeconomics', desc: 'US employment statistics released on the first Friday of each month' },
  { key: 'fomc', label: 'FOMC Decisions', category: 'Macroeconomics', desc: 'Federal Open Market Committee policy state changes' },
  { key: 'interestRateDecisions', label: 'Interest Rate Decisions', category: 'Macroeconomics', desc: 'Global central bank benchmark lending rates' },

  { key: 'marketVolatilityAlerts', label: 'Market Volatility Alerts', category: 'SMC Volatility & Structure', desc: 'Sudden spike in historical average true range' },
  { key: 'liquiditySweepDetected', label: 'Liquidity Sweep Detected', category: 'SMC Volatility & Structure', desc: 'Mitigation of high-timeframe swing highs/lows' },
  { key: 'htfTrendChange', label: 'HTF Trend Change (BOS)', category: 'SMC Volatility & Structure', desc: 'Break of Structure (BOS) or Change of Character (CHoCH) on 4H/Daily' },
  { key: 'smtConfirmation', label: 'SMT Confirmation', category: 'SMC Volatility & Structure', desc: 'Smart Money Technique divergence between correlated assets' },
  { key: 'cisdConfirmation', label: 'CISD Confirmation', category: 'SMC Volatility & Structure', desc: 'Change In State of Delivery (CISD) bullish/bearish orders' },
  { key: 'tradingSessionOpen', label: 'Trading Session Open', category: 'SMC Volatility & Structure', desc: 'London Open (07:00 UTC) & New York Open (12:00 UTC) alerts' },

  { key: 'dailyMarketSummary', label: 'Daily Market Summary', category: 'Institutional Reports', desc: 'Comprehensive daily wrap of SMC levels, volume, and open interest' },
  { key: 'weeklyPerformanceReport', label: 'Weekly Performance Report', category: 'Institutional Reports', desc: 'Consolidated report card of your AI metrics, wins, losses, and edge' }
];

export default function EmailNotificationCenter({ onPlaySound, onAddNotification }: EmailNotificationCenterProps) {
  const [settings, setSettings] = useState<EmailNotificationSettings | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  // Verification states
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Simulated sandbox inbox states
  const [simulatedEmails, setSimulatedEmails] = useState<any[]>([]);
  const [isLoadingSimulated, setIsLoadingSimulated] = useState(false);
  const [selectedSimulatedEmail, setSelectedSimulatedEmail] = useState<any | null>(null);

  // Fetch email configuration on load
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/email/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setEmailInput(data.email);
      }
    } catch (err) {
      console.error('Error fetching email settings:', err);
    }
  };

  // Fetch simulated emails list
  const fetchSimulatedEmails = async () => {
    setIsLoadingSimulated(true);
    try {
      const res = await fetch('/api/email/simulated');
      if (res.ok) {
        const data = await res.json();
        setSimulatedEmails(data);
      }
    } catch (err) {
      console.error('Error fetching simulated emails:', err);
    } finally {
      setIsLoadingSimulated(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchSimulatedEmails();
    // Poll simulated emails every 10 seconds for instant delivery in sandbox
    const timer = setInterval(fetchSimulatedEmails, 10000);
    return () => clearInterval(timer);
  }, []);

  // Save changes
  const handleSaveSettings = async (updatedFields: Partial<EmailNotificationSettings>) => {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/email/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, ...updatedFields })
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        onPlaySound('success');
        setSuccessMsg('Email notification preferences saved successfully.');
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to update preferences.');
      }
    } catch (err) {
      setErrorMsg('Network error while saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle specific alert configuration
  const handleToggleOption = (key: string) => {
    if (!settings) return;
    const updatedOptions = {
      ...settings.options,
      [key]: !((settings.options as any)[key])
    };
    setSettings({
      ...settings,
      options: updatedOptions as any
    });
    // Auto-save state change instantly
    handleSaveSettings({ options: updatedOptions as any });
  };

  // Link new email & trigger verification code
  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setIsSendingCode(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/email/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() })
      });
      if (res.ok) {
        setShowCodeInput(true);
        onPlaySound('success');
        setSuccessMsg(`Authorization key sent to ${emailInput}. Copy it from the Simulated Logs below.`);
        fetchSimulatedEmails();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to initiate verification.');
      }
    } catch (err) {
      setErrorMsg('Connection failed while requesting authorization code.');
    } finally {
      setIsSendingCode(false);
    }
  };

  // Submit 6-digit code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) return;

    setIsVerifying(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/email/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim(), code: verificationCode.trim() })
      });
      if (res.ok) {
        onPlaySound('success');
        setSuccessMsg('Secure email address verified and activated.');
        setShowCodeInput(false);
        setVerificationCode('');
        await fetchSettings();
        await fetchSimulatedEmails();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Invalid or expired code.');
        onPlaySound('alert');
      }
    } catch (err) {
      setErrorMsg('Verification failed due to a server connection error.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Send test email
  const handleSendTestEmail = async () => {
    setIsTesting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/email/test', { method: 'POST' });
      if (res.ok) {
        onPlaySound('success');
        onAddNotification('ai', 'Test Email Dispatched', `A cryptographic test email is sent to ${settings?.email}`);
        setSuccessMsg('Test email dispatched! Review the Simulated logs below to view its design layout.');
        fetchSimulatedEmails();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to transmit test email.');
      }
    } catch (err) {
      setErrorMsg('Resend test dispatch error.');
    } finally {
      setIsTesting(false);
    }
  };

  if (!settings) {
    return (
      <div className="p-12 text-center text-neutral-400">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-3" />
        <p className="text-sm">Retrieving email terminal telemetry...</p>
      </div>
    );
  }

  // Group notifications by category
  const categories = Array.from(new Set(NOTIFICATION_OPTIONS.map(o => o.category)));

  return (
    <div className="space-y-6">
      
      {/* EMAIL TELEMETRY CARD */}
      <div className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-6 space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-900 pb-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-[#D1A12C] rounded-xl">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Secure Email Credentials</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Route macro alerts and SMC signals directly to your personal mailbox.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-neutral-500 uppercase">System Status:</span>
            {settings.isEnabled ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold uppercase animate-pulse">ACTIVE</span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 font-bold uppercase">STANDBY</span>
            )}
          </div>
        </div>

        {/* MESSAGES */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-950/30 border border-rose-900/30 rounded-xl text-xs text-rose-400 flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 bg-emerald-950/30 border border-emerald-900/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2.5">
            <Check className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LINK/VERIFY FORM */}
          <div className="space-y-4">
            <form onSubmit={handleRequestVerification} className="space-y-3">
              <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Recipient Email Address • البريد الإلكتروني
              </label>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    required
                    placeholder="Enter email to connect..."
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    disabled={showCodeInput}
                    className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-white placeholder-neutral-600 font-mono"
                  />
                  {settings.isVerified && emailInput.trim().toLowerCase() === settings.email.toLowerCase() && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400" title="Email Verified">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={isSendingCode || showCodeInput}
                  className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-850 hover:border-amber-500/30 text-neutral-300 hover:text-white font-semibold text-xs px-4 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                >
                  {isSendingCode ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  <span>{settings.isVerified && emailInput.toLowerCase() === settings.email.toLowerCase() ? 'Change' : 'Link Address'}</span>
                </button>
              </div>
            </form>

            {/* VERIFICATION CODE BLOCK */}
            <AnimatePresence>
              {showCodeInput && (
                <motion.form 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  onSubmit={handleVerifyCode} 
                  className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-3"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-amber-500" />
                      <span>Security Ingress Verification</span>
                    </h4>
                    <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed">
                      Copy the 6-digit key sent to <b>{emailInput}</b> from the Simulated Logs panel below.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="6-Digit Code..."
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-amber-500/50 rounded-xl py-2 px-3 text-xs text-center font-mono tracking-widest text-white"
                    />
                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-5 rounded-xl transition-all cursor-pointer disabled:opacity-40"
                    >
                      {isVerifying ? 'Authorizing...' : 'Authorize'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCodeInput(false)}
                      className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-900 rounded-xl transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* STATUS SUMMARY */}
            <div className="flex items-center gap-3 p-3 bg-neutral-900/20 border border-neutral-900/60 rounded-xl font-mono text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500">Security Clearance:</span>
                {settings.isVerified ? (
                  <span className="text-emerald-400 font-bold uppercase flex items-center gap-0.5">
                    <Check className="h-3 w-3" /> VERIFIED
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold uppercase flex items-center gap-0.5">
                    <AlertCircle className="h-3 w-3 animate-pulse" /> UNVERIFIED
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* GLOBAL ENABLE SWITCH & TEST BUTTON */}
          <div className="flex flex-col justify-between p-5 bg-neutral-900/20 border border-neutral-900 rounded-2xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">Enable Email Dispatch</span>
                <p className="text-[10px] text-neutral-500 leading-normal">
                  Toggle to globally suspend or activate secure outbound email transmission. Requires verified address.
                </p>
              </div>

              {/* IOS-style toggle switch */}
              <button
                onClick={() => {
                  if (!settings.isVerified) {
                    setErrorMsg("Verify your email address first before enabling global notification dispatch.");
                    onPlaySound('alert');
                    return;
                  }
                  handleSaveSettings({ isEnabled: !settings.isEnabled });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.isEnabled ? 'bg-emerald-500' : 'bg-neutral-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="border-t border-neutral-900 pt-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] text-neutral-500 font-mono">TEST PROTOCOL UNIT</span>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isTesting}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-900 text-black disabled:text-neutral-500 border border-transparent disabled:border-neutral-850 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {isTesting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                <span>Send Test Email</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* DETAILED NOTIFICATION SELECTIONS */}
      <div className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-6 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="h-4.5 w-4.5 text-amber-500" />
            <span>Granular Notification Matrices</span>
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">Toggle exactly which institutional events trigger a real-time secure email broadcast.</p>
        </div>

        <div className="space-y-8">
          {categories.map((category) => {
            const options = NOTIFICATION_OPTIONS.filter(o => o.category === category);
            return (
              <div key={category} className="space-y-3.5">
                <h4 className="text-[11px] font-bold text-amber-500/80 font-mono uppercase tracking-widest border-b border-neutral-900 pb-1.5">
                  {category}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {options.map((option) => {
                    const isChecked = (settings.options as any)[option.key] ?? false;
                    return (
                      <div 
                        key={option.key}
                        onClick={() => handleToggleOption(option.key)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 select-none ${
                          isChecked 
                            ? 'bg-neutral-900/40 border-amber-500/20 hover:border-amber-500/40 text-neutral-200' 
                            : 'bg-neutral-950 border-neutral-900/60 hover:border-neutral-800 text-neutral-500'
                        }`}
                      >
                        <div className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center shrink-0 border transition-all ${
                          isChecked 
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400' 
                            : 'border-neutral-800 bg-neutral-900/20'
                        }`}>
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>

                        <div className="space-y-1">
                          <span className={`text-xs font-bold block ${isChecked ? 'text-white' : 'text-neutral-400'}`}>
                            {option.label}
                          </span>
                          <p className="text-[10px] text-neutral-500 leading-normal">
                            {option.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SIMULATED SANDBOX INBOX LOGS */}
      <div className="rounded-2xl bg-neutral-950/60 border border-neutral-900 p-6 space-y-4">
        
        <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
          <div className="flex items-start gap-2.5">
            <BookOpen className="h-4.5 w-4.5 text-amber-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Simulated Outbox & Verification Logs</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Preview the actual HTML layout of dispatched emails securely logged on the backend.</p>
            </div>
          </div>

          <button
            onClick={fetchSimulatedEmails}
            disabled={isLoadingSimulated}
            className="p-1.5 hover:bg-neutral-900 text-neutral-400 hover:text-white rounded-lg border border-neutral-900 hover:border-neutral-800 transition-all cursor-pointer"
            title="Refresh email logs"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingSimulated ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          {simulatedEmails.length === 0 ? (
            <div className="py-12 text-center text-neutral-600 border border-dashed border-neutral-900 rounded-xl font-mono text-[11px]">
              <Mail className="h-6 w-6 text-neutral-800 mx-auto mb-2" />
              <span>Simulated outbound mailbox currently empty. Initiate link or send test email.</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {simulatedEmails.map((email) => (
                <div 
                  key={email.id}
                  onClick={() => setSelectedSimulatedEmail(email)}
                  className="flex items-center justify-between p-3.5 bg-neutral-950/80 border border-neutral-900 hover:border-amber-500/25 rounded-xl cursor-pointer hover:bg-neutral-900/30 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-900 border border-neutral-850 text-amber-500 rounded-lg">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">{email.subject}</span>
                      <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                        Recipient: <span className="text-neutral-400">{email.recipient}</span> • {new Date(email.sentAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <button className="flex items-center gap-1 text-[10px] font-bold font-mono text-amber-500 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/30 px-2.5 py-1.5 rounded-lg transition-all">
                    <Eye className="h-3 w-3" />
                    <span>View Layout</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FULL-SCREEN SECURE PREVIEW MODAL */}
      <AnimatePresence>
        {selectedSimulatedEmail && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 transition-opacity" 
              onClick={() => setSelectedSimulatedEmail(null)}
            />
            {/* Modal Box */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-2xl h-[85vh] bg-neutral-950 border border-neutral-900 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden">
              <div className="p-4 bg-neutral-950 border-b border-neutral-900 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Secure Email Visualizer</h3>
                  <p className="text-[10px] text-neutral-500 font-mono mt-0.5">Subject: {selectedSimulatedEmail.subject}</p>
                </div>
                <button 
                  onClick={() => setSelectedSimulatedEmail(null)}
                  className="p-1.5 hover:bg-neutral-900 rounded-lg text-neutral-500 hover:text-white transition-colors"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* HTML viewer inside safe Sandbox iframe */}
              <div className="flex-1 bg-[#050506] p-4 overflow-hidden">
                <iframe
                  title="Secure Email Preview"
                  sandbox="allow-same-origin"
                  srcDoc={selectedSimulatedEmail.html}
                  className="w-full h-full border-0 rounded-2xl bg-[#050506]"
                />
              </div>

              <div className="p-3 bg-neutral-950 border-t border-neutral-900 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                <span>RECIPIENT: {selectedSimulatedEmail.recipient}</span>
                <span>DISPATCH: SECURE_RESEND_API</span>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
