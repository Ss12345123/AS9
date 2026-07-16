import React, { useCallback, useEffect, useState } from 'react';
import {
  Shield, CheckCircle2, AlertCircle, RefreshCw, Wallet,
  TrendingUp, TrendingDown, DollarSign, X, Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';

interface CapitalConnectionProps {
  onPlaySound: (type: 'success' | 'warning' | 'alert') => void;
  onConnectionChange?: (connected: boolean) => void;
}

interface CapitalAccount {
  accountId: string;
  accountName: string;
  brokerName: string;
  accountType: string;
  currency: string;
  balance: number;
  deposit: number;
  available: number;
  profitLoss: number;
  preferred: boolean;
  isLive: boolean;
}

interface CapitalPosition {
  dealId: string;
  epic: string;
  instrumentName?: string;
  direction: 'BUY' | 'SELL';
  size: number;
  openLevel: number;
  currentLevel?: number;
  profitLoss?: number;
  currency?: string;
}

export default function CapitalConnection({ onPlaySound, onConnectionChange }: CapitalConnectionProps) {
  const [status, setStatus] = useState<{ configured: boolean; connected: boolean } | null>(null);
  const [account, setAccount] = useState<CapitalAccount | null>(null);
  const [positions, setPositions] = useState<CapitalPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Form states for linking Capital.com credentials
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isDemoAccount, setIsDemoAccount] = useState(true);
  const [isLinking, setIsLinking] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const load = useCallback(async () => {
    setErrorMsg(null);
    try {
      const headers = getHeaders();
      const statusRes = await fetch('/api/capital/status', { headers });
      if (!statusRes.ok) {
        if (statusRes.status === 401) {
          throw new Error('Unauthorized session. Please re-authenticate terminal.');
        }
        throw new Error('Connection status request failed');
      }
      const statusData = await statusRes.json();
      setStatus(statusData);
      const isConnected = !!(statusData.configured && statusData.connected);
      if (onConnectionChange) {
        onConnectionChange(isConnected);
      }

      if (!statusData.configured) {
        setAccount(null);
        setPositions([]);
        return;
      }

      if (statusData.connected) {
        const portfolioRes = await fetch('/api/capital/portfolio', { headers });
        if (!portfolioRes.ok) {
          const err = await portfolioRes.json().catch(() => ({}));
          throw new Error(err.error || `Portfolio request failed (status ${portfolioRes.status})`);
        }
        const data = await portfolioRes.json();
        setAccount(data.account || null);
        setPositions(Array.isArray(data.positions) ? data.positions : []);
      } else {
        setAccount(null);
        setPositions([]);
        if (statusData.error) {
          setErrorMsg(`Capital.com connection failed: ${statusData.error}`);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to reach Capital.com gateway.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    load();
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    setErrorMsg(null);
    try {
      const headers = getHeaders();
      const statusRes = await fetch('/api/capital/status?force=true', { headers });
      if (!statusRes.ok) {
        if (statusRes.status === 401) {
          throw new Error('Unauthorized session. Please re-authenticate terminal.');
        }
        throw new Error('Reconnection request failed');
      }
      const statusData = await statusRes.json();
      setStatus(statusData);
      const isConnected = !!(statusData.configured && statusData.connected);
      if (onConnectionChange) {
        onConnectionChange(isConnected);
      }

      if (statusData.connected) {
        onPlaySound('success');
        // Instantly refresh portfolio
        const portfolioRes = await fetch('/api/capital/portfolio', { headers });
        if (!portfolioRes.ok) {
          const err = await portfolioRes.json().catch(() => ({}));
          throw new Error(err.error || `Portfolio request failed (status ${portfolioRes.status})`);
        }
        const data = await portfolioRes.json();
        setAccount(data.account || null);
        setPositions(Array.isArray(data.positions) ? data.positions : []);
      } else {
        onPlaySound('alert');
        if (statusData.error) {
          setErrorMsg(`Reconnection failed: ${statusData.error}`);
        } else {
          setErrorMsg('Reconnection failed: Unknown broker error.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to reconnect to Capital.com.');
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password || !apiKey) {
      setErrorMsg('Please complete all credential fields');
      return;
    }
    setIsLinking(true);
    setErrorMsg(null);
    try {
      const headers = getHeaders();
      const res = await fetch('/api/capital/connect', {
        method: 'POST',
        headers,
        body: JSON.stringify({ identifier, password, apiKey, isDemo: isDemoAccount })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate and link account');
      }
      onPlaySound('success');
      // Reset form fields
      setIdentifier('');
      setPassword('');
      setApiKey('');
      await load();
    } catch (err: any) {
      onPlaySound('alert');
      setErrorMsg(err.message || 'Error occurred during connection request.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to unlink your Capital.com account from this secure node?')) {
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const headers = getHeaders();
      const res = await fetch('/api/capital/disconnect', {
        method: 'POST',
        headers
      });
      if (!res.ok) {
        throw new Error('Failed to disconnect account');
      }
      onPlaySound('warning');
      setStatus({ configured: false, connected: false });
      if (onConnectionChange) {
        onConnectionChange(false);
      }
      setAccount(null);
      setPositions([]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unlink request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async (dealId: string) => {
    setClosingId(dealId);
    try {
      const headers = getHeaders();
      const res = await fetch(`/api/capital/position/${dealId}`, { method: 'DELETE', headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || `status ${res.status}`);
      }
      onPlaySound('success');
      await load();
    } catch (err: any) {
      onPlaySound('alert');
      setErrorMsg(`Failed to close position: ${err.message}`);
    } finally {
      setClosingId(null);
    }
  };

  const connected = status?.configured && status?.connected;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#D1A12C]" />
            Capital.com Broker
          </h1>
          <p className="text-xs text-neutral-400">Live brokerage account, balance and open positions.</p>
        </div>
        <div className="flex gap-2">
          {status?.configured && (
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-bold text-amber-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
              Reconnect
            </button>
          )}
          {connected && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-850 text-xs font-semibold text-neutral-300 hover:text-white disabled:opacity-50 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Connection status */}
      <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${
        connected
          ? 'bg-emerald-950/10 border-emerald-500/30'
          : 'bg-rose-950/10 border-rose-500/30'
      }`}>
        <div className="flex items-center gap-4">
          {connected ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-8 w-8 text-rose-400 shrink-0" />
          )}
          <div>
            <p className="text-sm font-bold text-white">
              {connected ? 'Connected to Capital.com' : 'Disconnected from Broker'}
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isLoading
                ? 'Checking connection…'
                : connected
                ? `${account?.isLive ? 'LIVE' : 'DEMO'} account · ${account?.brokerName || 'Capital.com'}`
                : errorMsg || 'Please connect your Capital.com account credentials below.'}
            </p>
          </div>
        </div>
        {status?.configured && (
          <button
            onClick={handleDisconnect}
            className="px-3.5 py-1.5 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-semibold border border-rose-500/15 transition-all"
          >
            Unlink Account
          </button>
        )}
      </div>

      {/* Connection Form when not configured */}
      {!status?.configured && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-neutral-950 border border-neutral-900 rounded-2xl space-y-4 shadow-xl"
        >
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Connect Capital.com Trading Credentials</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Your credentials are encrypted using an AES-256 layer and never shared outside the terminal context.
            </p>
          </div>

          <form onSubmit={handleConnect} className="space-y-4">
            <div className="bg-neutral-900 border border-neutral-850 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-white">Trading Environment</span>
                <span className="block text-[10px] text-neutral-500">Choose between Demo (Practice) and Live (Real Money) APIs</span>
              </div>
              <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-850">
                <button
                  type="button"
                  onClick={() => setIsDemoAccount(true)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                    isDemoAccount
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  DEMO
                </button>
                <button
                  type="button"
                  onClick={() => setIsDemoAccount(false)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                    !isDemoAccount
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  LIVE
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Identifier / Email</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. user@domain.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-850 rounded-xl py-2 px-3.5 text-xs text-white placeholder-neutral-700 font-sans focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Capital.com API Key</label>
                <input
                  type="password"
                  required
                  placeholder="Copy from settings..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-850 rounded-xl py-2 px-3.5 text-xs text-white placeholder-neutral-700 font-mono focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-850 rounded-xl py-2 px-3.5 text-xs text-white placeholder-neutral-700 focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLinking}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLinking ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Connecting Live Protocols...</span>
                </>
              ) : (
                <span>Establish Secure Link</span>
              )}
            </button>
          </form>
        </motion.div>
      )}

      {/* Account summary */}
      {account && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-900">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
              <Wallet className="h-3.5 w-3.5" /> Balance
            </div>
            <p className="text-xl font-bold text-white font-mono">
              {(account.balance ?? 0).toLocaleString(undefined, { style: 'currency', currency: account.currency || 'USD' })}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-900">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
              <DollarSign className="h-3.5 w-3.5" /> Available
            </div>
            <p className="text-xl font-bold text-white font-mono">
              {(account.available ?? 0).toLocaleString(undefined, { style: 'currency', currency: account.currency || 'USD' })}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-900">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
              <TrendingUp className="h-3.5 w-3.5" /> Open P/L
            </div>
            <p className={`text-xl font-bold font-mono ${account.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {account.profitLoss >= 0 ? '+' : ''}{account.profitLoss.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Open positions */}
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Open Positions</h2>
        {positions.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-neutral-900 rounded-2xl">
            <p className="text-sm text-neutral-400">No open positions</p>
            <p className="text-[11px] text-neutral-600 mt-1">Positions opened on Capital.com appear here in real time.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {positions.map((p) => {
              const pl = p.profitLoss ?? 0;
              return (
                <motion.div
                  key={p.dealId}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 rounded-2xl bg-neutral-950/60 border border-neutral-900"
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      p.direction === 'BUY'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {p.direction === 'BUY' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {p.direction}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">{p.instrumentName || p.epic}</p>
                      <p className="text-[11px] text-neutral-500 font-mono">
                        {p.size} @ {p.openLevel}
                        {p.currentLevel != null && ` → ${p.currentLevel}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-bold font-mono ${pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pl >= 0 ? '+' : ''}{pl.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleClose(p.dealId)}
                      disabled={closingId === p.dealId}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      {closingId === p.dealId ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                      Close
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
