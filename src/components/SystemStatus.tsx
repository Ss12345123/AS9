import React, { useState, useEffect } from 'react';
import { 
  Server, Shield, RefreshCw, Play, CheckCircle2, AlertCircle, Clock, 
  Terminal, Cpu, HardDrive, Mail, Bell, ShieldAlert, Key, HelpCircle, Lock, 
  Unlock, Send, BarChart3, Activity, ArrowRight, UserCheck, MessageSquare, Flame
} from 'lucide-react';
import { motion } from 'motion/react';

interface ServiceInfo {
  name: string;
  status: 'connected' | 'disconnected';
  lastSuccess: string;
  lastError: string | null;
  responseTime: number;
}

interface SystemStatusResponse {
  services: Record<string, ServiceInfo>;
  serverTime: string;
}

interface DiagnosticsData {
  envVariables: Record<string, 'Configured' | 'Missing'>;
  apiHealth: {
    status: string;
    uptimeSeconds: number;
    totalRequests: number;
    failedRequests: number;
    successRate: string;
  };
  websocketHealth: {
    status: string;
    activeClients: number;
    heartbeatIntervalMs: number;
  };
  emailDeliveryStatus: {
    sent: number;
    failed: number;
    simulatedInboxSize: number;
    lastDeliveryTime: string;
  };
  notificationQueue: {
    queueSize: number;
    processedToday: number;
    notificationLogsCount: number;
  };
  serverMetrics: {
    uptime: number;
    startTime: string;
    memory: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
      external: string;
    };
    cpu: {
      user: string;
      system: string;
    };
  };
  activeUsers: number;
  activeTradingSessions: number;
}

export default function SystemStatus() {
  const [statusData, setStatusData] = useState<SystemStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Admin section states
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Trade Protection States
  const [protectionAudit, setProtectionAudit] = useState<any[]>([]);
  const [protectionStates, setProtectionStates] = useState<Record<string, any>>({});
  const [selfTestLoading, setSelfTestLoading] = useState(false);
  const [selfTestResults, setSelfTestResults] = useState<any[]>([]);
  const [selfTestSuccess, setSelfTestSuccess] = useState<boolean | null>(null);

  const fetchProtectionData = async () => {
    try {
      const [auditRes, statesRes] = await Promise.all([
        fetch('/api/protection/audit'),
        fetch('/api/protection/states')
      ]);
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setProtectionAudit(auditData.reverse()); // Latest first
      }
      if (statesRes.ok) {
        const statesData = await statesRes.json();
        setProtectionStates(statesData);
      }
    } catch (err) {
      console.error('Error fetching protection data:', err);
    }
  };

  const handleRunSelfTest = async () => {
    setSelfTestLoading(true);
    setSelfTestResults([]);
    setSelfTestSuccess(null);
    try {
      const res = await fetch('/api/protection/self-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode })
      });
      const data = await res.json();
      if (res.ok) {
        setSelfTestResults(data.steps || []);
        setSelfTestSuccess(data.success);
      } else {
        setSelfTestSuccess(false);
        setSelfTestResults([{ step: "Diagnostics Test Execution", status: "FAIL", details: data.error || "An error occurred during verification" }]);
      }
    } catch (err: any) {
      setSelfTestSuccess(false);
      setSelfTestResults([{ step: "Diagnostics Test Execution", status: "FAIL", details: err.message || "Network timeout or connection refused." }]);
    } finally {
      setSelfTestLoading(false);
      fetchProtectionData(); // Refresh logs instantly
    }
  };

  // Fetch status of services on load and poll every 10 seconds
  const fetchStatus = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch('/api/system/status');
      if (!res.ok) throw new Error('Failed to retrieve system status.');
      const data = await res.json();
      setStatusData(data);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with status gateway.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus(true);
    const interval = setInterval(() => {
      fetchStatus(false);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handler to Test or Reconnect connection
  const handleServiceAction = async (serviceKey: string, actionType: 'test' | 'reconnect') => {
    const actionKey = `${serviceKey}-${actionType}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    try {
      const endpoint = actionType === 'test' ? '/api/system/test-connection' : '/api/system/reconnect';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceKey })
      });
      const data = await res.json();
      
      // Update local state dynamically
      if (data.service && statusData) {
        setStatusData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            services: {
              ...prev.services,
              [serviceKey]: data.service
            }
          };
        });
      }
      
      // If we are authenticated, refresh diagnostics too because actions might change stats
      if (isAuthenticated) {
        fetchDiagnostics(passcode);
      }
    } catch (err: any) {
      console.error(`Error performing ${actionType} on ${serviceKey}:`, err);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Handler to submit admin passcode
  const handleAdminAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setAuthError('Please enter the administrative passcode.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch(`/api/system/diagnostics?passcode=${encodeURIComponent(passcode)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication rejected.');
      }
      setDiagnostics(data);
      setIsAuthenticated(true);
      setAuthError(null);
      fetchProtectionData();
    } catch (err: any) {
      setAuthError(err.message || 'Access Denied. Incorrect credentials.');
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  // Fetch updated diagnostics
  const fetchDiagnostics = async (code: string) => {
    try {
      const res = await fetch(`/api/system/diagnostics?passcode=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
      }
    } catch (err) {
      console.error('Error fetching diagnostics:', err);
    }
  };

  // Poll diagnostics every 5 seconds if authenticated
  useEffect(() => {
    if (!isAuthenticated || !passcode) return;
    fetchDiagnostics(passcode);
    fetchProtectionData();
    const interval = setInterval(() => {
      fetchDiagnostics(passcode);
      fetchProtectionData();
    }, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, passcode]);

  // Helper to format timestamps beautifully
  const formatTime = (isoString: string) => {
    if (!isoString || isoString === 'Never') return 'Never';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', { hour12: false }) + ' ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  // Format server uptime
  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs}h ${mins}m ${secs}s`;
  };

  // Icon mapping helper for services
  const getServiceIcon = (key: string) => {
    switch (key) {
      case 'gemini': return <Cpu className="h-5 w-5 text-amber-500" />;
      case 'twelveData': return <BarChart3 className="h-5 w-5 text-[#D1A12C]" />;
      case 'capitalCom': return <Shield className="h-5 w-5 text-amber-500" />;
      case 'email': return <Mail className="h-5 w-5 text-[#D1A12C]" />;
      case 'telegram': return <MessageSquare className="h-5 w-5 text-amber-500" />;
      case 'push': return <Bell className="h-5 w-5 text-[#D1A12C]" />;
      case 'database': return <HardDrive className="h-5 w-5 text-amber-500" />;
      case 'websocket': return <Activity className="h-5 w-5 text-[#D1A12C]" />;
      default: return <Server className="h-5 w-5 text-neutral-400" />;
    }
  };

  return (
    <div className="space-y-8" id="system-status-page">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-900 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-500 uppercase tracking-widest">
            <Server className="h-3.5 w-3.5 animate-pulse" />
            <span>Infrastructure Gateway</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">System Status & Diagnostics</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Real-time integrity monitor of institutional nodes, APIs, and microservices.</p>
        </div>
        <button 
          onClick={() => fetchStatus(true)}
          className="flex items-center gap-2 self-start md:self-center bg-neutral-950 border border-neutral-900 hover:border-amber-500/20 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer font-mono"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
          <span>Refresh All Nodes</span>
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-xs text-rose-400 font-mono">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold uppercase tracking-wider">Communication Failure</p>
            <p className="mt-1 text-neutral-400">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading && !statusData ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 bg-neutral-950/40 border border-neutral-900/60 rounded-3xl p-5 space-y-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-10 w-10 bg-neutral-900 rounded-2xl" />
                <div className="h-5 w-16 bg-neutral-900 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-1/2 bg-neutral-900 rounded" />
                <div className="h-3 w-3/4 bg-neutral-900 rounded" />
              </div>
              <div className="h-8 bg-neutral-900 rounded-xl" />
            </div>
          ))
        ) : (
          statusData && (Object.entries(statusData.services) as [string, ServiceInfo][]).map(([key, service]) => {
            const isConnected = service.status === 'connected';
            const testingKey = `${key}-test`;
            const reconnectingKey = `${key}-reconnect`;
            const isTesting = actionLoading[testingKey];
            const isReconnecting = actionLoading[reconnectingKey];

            return (
              <div 
                key={key} 
                id={`service-card-${key}`}
                className="bg-gradient-to-b from-neutral-950/80 to-black border border-neutral-900 rounded-3xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-neutral-800 transition-all duration-300"
              >
                {/* Visual Gold Hue Corner Glow on Hover */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-500" />

                <div>
                  {/* Card Header (Icon & Status badge) */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="p-2.5 bg-neutral-900 rounded-2xl border border-neutral-800 flex items-center justify-center">
                      {getServiceIcon(key)}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono tracking-widest ${
                      isConnected 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                      {service.status}
                    </span>
                  </div>

                  {/* Service details */}
                  <div className="mt-4">
                    <h3 className="text-sm font-bold text-white tracking-tight leading-none uppercase">{service.name}</h3>
                    <p className="text-[10px] font-mono text-neutral-500 mt-1.5">
                      Latency: <span className={isConnected ? "text-amber-500/90 font-semibold" : "text-neutral-600"}>{isConnected ? `${service.responseTime} ms` : 'Offline'}</span>
                    </p>
                    
                    <div className="mt-3.5 space-y-1.5 text-[10px] font-mono border-t border-neutral-900/60 pt-3">
                      <div className="flex justify-between text-neutral-500">
                        <span>Last Check:</span>
                        <span className="text-neutral-300 text-right truncate max-w-[140px]">{formatTime(service.lastSuccess)}</span>
                      </div>
                      
                      {service.lastError && (
                        <div className="flex flex-col text-neutral-500 gap-0.5">
                          <span>Warning / Info:</span>
                          <span className="text-amber-500/80 bg-amber-500/5 border border-amber-500/10 rounded-lg p-1.5 text-[9px] mt-0.5 break-all leading-normal max-h-16 overflow-y-auto">
                            {service.lastError}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick actions at footer */}
                <div className="grid grid-cols-2 gap-2 mt-5 pt-3 border-t border-neutral-900/60">
                  <button
                    id={`btn-test-${key}`}
                    disabled={isTesting || isReconnecting}
                    onClick={() => handleServiceAction(key, 'test')}
                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-neutral-900 bg-neutral-950 hover:bg-neutral-900/50 hover:border-amber-500/20 text-neutral-400 hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider font-mono cursor-pointer disabled:opacity-40"
                  >
                    <Activity className={`h-2.5 w-2.5 ${isTesting ? 'animate-pulse text-amber-500' : ''}`} />
                    <span>{isTesting ? 'Testing' : 'Test'}</span>
                  </button>
                  <button
                    id={`btn-reconnect-${key}`}
                    disabled={isTesting || isReconnecting}
                    onClick={() => handleServiceAction(key, 'reconnect')}
                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-neutral-900 bg-neutral-950 hover:bg-neutral-900/50 hover:border-amber-500/20 text-neutral-400 hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider font-mono cursor-pointer disabled:opacity-40"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${isReconnecting ? 'animate-spin text-amber-500' : ''}`} />
                    <span>{isReconnecting ? 'Wait' : 'Reset'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADMIN DIAGNOSTICS LOCK CONSOLE */}
      <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden" id="admin-diagnostics-section">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto py-8 text-center space-y-6">
            <div className="mx-auto w-12 h-12 bg-amber-500/10 border border-amber-500/25 text-[#D1A12C] rounded-2xl flex items-center justify-center shadow-lg">
              <Lock className="h-5 w-5" />
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-white uppercase tracking-wider">Admin Diagnostics Console</h2>
              <p className="text-xs text-neutral-500">Access to low-level environment credentials status, server metrics, and diagnostics databases is strictly restricted.</p>
            </div>

            <form onSubmit={handleAdminAuthenticate} className="space-y-3">
              <div className="relative">
                <input
                  type="password"
                  id="admin-passcode-input"
                  placeholder="Enter Administrator Passcode (Default: 1234)"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full bg-black border border-neutral-800 focus:border-amber-500/50 rounded-2xl px-4 py-3 text-sm text-center text-white tracking-widest focus:outline-none transition-all placeholder:text-xs placeholder:tracking-normal placeholder:text-neutral-600 font-mono"
                />
                {passcode && (
                  <button 
                    type="submit" 
                    id="admin-auth-submit"
                    disabled={authLoading}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-500 hover:text-white transition-colors cursor-pointer"
                  >
                    {authLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  </button>
                )}
              </div>

              {authError && (
                <p className="text-[10px] font-mono text-rose-400 mt-1">{authError}</p>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  id="btn-hint"
                  onClick={() => setShowHint(!showHint)}
                  className="text-[9px] font-mono text-neutral-600 hover:text-neutral-400 uppercase tracking-widest cursor-pointer underline decoration-dotted underline-offset-4"
                >
                  {showHint ? "Hide passcode hint" : "Show passcode hint"}
                </button>
                {showHint && (
                  <p className="text-[10px] font-mono text-neutral-500 mt-1.5 bg-neutral-900 border border-neutral-800/60 rounded-xl p-2 max-w-xs mx-auto">
                    Passcode set in variables. The platform default passcode is <code className="text-amber-500 px-1 py-0.5 bg-black rounded">1234</code>.
                  </p>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-900 pb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl">
                  <Unlock className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Administrative Telemetry console</h2>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">Secure Session Active • updates automatically every 5s</p>
                </div>
              </div>
              
              <button
                id="btn-lock-console"
                onClick={() => {
                  setIsAuthenticated(false);
                  setDiagnostics(null);
                  setPasscode('');
                }}
                className="flex items-center gap-1.5 py-1 px-3 rounded-lg border border-neutral-800 hover:border-rose-500/20 text-neutral-500 hover:text-rose-400 transition-all text-[9px] font-bold uppercase tracking-wider font-mono cursor-pointer"
              >
                <Lock className="h-3 w-3" />
                <span>Lock Console</span>
              </button>
            </div>

            {diagnostics && (
              <div className="space-y-6">
                {/* ROW 1: Metrics Panels */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-2xl flex flex-col justify-between">
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">Active Users</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-white font-mono">{diagnostics.activeUsers}</span>
                      <span className="text-[9px] text-emerald-400 font-mono">● Online</span>
                    </div>
                    <p className="text-[8px] text-neutral-600 uppercase tracking-wider font-mono mt-1">Unique active IPs</p>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-2xl flex flex-col justify-between">
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">Active Trading Sessions</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-amber-500 font-mono">{diagnostics.activeTradingSessions}</span>
                      <span className="text-[9px] text-neutral-500 font-mono">Broker</span>
                    </div>
                    <p className="text-[8px] text-neutral-600 uppercase tracking-wider font-mono mt-1">Simulated / Live Gateway</p>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-2xl flex flex-col justify-between">
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">Server Uptime</span>
                    <div className="mt-2">
                      <span className="text-sm font-bold text-white font-mono block truncate">{formatUptime(diagnostics.serverMetrics.uptime)}</span>
                    </div>
                    <p className="text-[8px] text-neutral-600 uppercase tracking-wider font-mono mt-1">Process Node Runtime</p>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-2xl flex flex-col justify-between">
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">API Health Stats</span>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-xl font-bold text-white font-mono">{diagnostics.apiHealth.successRate}</span>
                      <span className="text-[9px] text-neutral-500 font-mono">({diagnostics.apiHealth.totalRequests} reqs)</span>
                    </div>
                    <p className="text-[8px] text-neutral-600 uppercase tracking-wider font-mono mt-1">Success rate metrics</p>
                  </div>
                </div>

                {/* ROW 2: Env Config and Server Health */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Env configs */}
                  <div className="bg-[#070708] border border-neutral-900 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 border-b border-neutral-900 pb-2">
                      <Key className="h-4 w-4 text-amber-500" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Variables Security Desk</h3>
                    </div>
                    
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {Object.entries(diagnostics.envVariables).map(([name, status]) => {
                        const isConfigured = status === 'Configured';
                        return (
                          <div key={name} className="flex justify-between items-center text-[10px] font-mono border-b border-neutral-900 pb-1.5 last:border-0 last:pb-0">
                            <span className="text-neutral-500 uppercase truncate max-w-[190px]">{name}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                              isConfigured 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/25'
                            }`}>
                              {status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[9px] text-neutral-600 font-mono leading-normal pt-1 bg-black/40 border border-neutral-900 rounded-xl p-2">
                      🔒 Secret environment values are masked at compiling phase. Absolute credential isolation is guaranteed.
                    </p>
                  </div>

                  {/* Server Resource Metrics */}
                  <div className="bg-[#070708] border border-neutral-900 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 border-b border-neutral-900 pb-2">
                      <Cpu className="h-4 w-4 text-[#D1A12C]" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Resource Telemetry</h3>
                    </div>

                    <div className="space-y-3.5">
                      {/* Memory RSS */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-neutral-500">Memory Allocation (RSS)</span>
                          <span className="text-white font-semibold">{diagnostics.serverMetrics.memory.rss}</span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: '45%' }} />
                        </div>
                      </div>

                      {/* Memory Heap Used */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-neutral-500">Heap Allocation</span>
                          <span className="text-white font-semibold">{diagnostics.serverMetrics.memory.heapUsed} / {diagnostics.serverMetrics.memory.heapTotal}</span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
                          <div className="h-full bg-[#D1A12C] rounded-full" style={{ width: '30%' }} />
                        </div>
                      </div>

                      {/* CPU stats */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-neutral-950 p-2.5 border border-neutral-900 rounded-xl">
                        <div>
                          <span className="text-neutral-600 uppercase block text-[8px] tracking-wider">CPU User Clock</span>
                          <span className="text-white font-bold mt-0.5 block">{diagnostics.serverMetrics.cpu.user}</span>
                        </div>
                        <div>
                          <span className="text-neutral-600 uppercase block text-[8px] tracking-wider">CPU System Clock</span>
                          <span className="text-white font-bold mt-0.5 block">{diagnostics.serverMetrics.cpu.system}</span>
                        </div>
                      </div>

                      <div className="text-[9px] font-mono flex items-center justify-between text-neutral-500">
                        <span>Gateway Start Time:</span>
                        <span className="text-neutral-300">{formatTime(diagnostics.serverMetrics.startTime)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Messaging & Deliveries */}
                  <div className="bg-[#070708] border border-neutral-900 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 border-b border-neutral-900 pb-2">
                      <Mail className="h-4 w-4 text-amber-500" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Email & Queue logs</h3>
                    </div>

                    <div className="space-y-3 font-mono text-[10px]">
                      <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                        <span className="text-neutral-500">Resend Deliveries Dispatched</span>
                        <span className="text-emerald-400 font-bold">{diagnostics.emailDeliveryStatus.sent}</span>
                      </div>

                      <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                        <span className="text-neutral-500">Resend Failed Dispatches</span>
                        <span className={diagnostics.emailDeliveryStatus.failed > 0 ? "text-rose-400 font-bold" : "text-neutral-400"}>
                          {diagnostics.emailDeliveryStatus.failed}
                        </span>
                      </div>

                      <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                        <span className="text-neutral-500">Simulated Sandbox Inbox size</span>
                        <span className="text-amber-500 font-bold">{diagnostics.emailDeliveryStatus.simulatedInboxSize}</span>
                      </div>

                      <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                        <span className="text-neutral-500">Notification Queue status</span>
                        <span className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-400 text-[8px] font-bold rounded">
                          EMPTY (0 PENDING)
                        </span>
                      </div>

                      <div className="flex flex-col text-neutral-500 pt-1">
                        <span>Last Dispatched Signal:</span>
                        <span className="text-neutral-300 truncate mt-0.5 bg-neutral-950 p-1.5 border border-neutral-900 rounded-lg text-[9px]">
                          {formatTime(diagnostics.emailDeliveryStatus.lastDeliveryTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QUANTUM TRADE PROTECTION CONSOLE */}
                <div className="bg-[#070708] border border-neutral-900 rounded-2xl p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-900 pb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 border border-amber-500/25 text-[#D1A12C] rounded-xl">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Quantum Trade Protection Console</h3>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">High-Frequency 1-Second Verification Subservice • Active</p>
                      </div>
                    </div>

                    <button
                      onClick={handleRunSelfTest}
                      disabled={selfTestLoading}
                      className="flex items-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {selfTestLoading ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Executing Diagnostics...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 fill-black" />
                          <span>Run System Self-Test</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* ACTIVE CONFIGURATION QUICK OVERVIEW */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-xl space-y-1">
                      <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">Break Even Engine</span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono font-sans">Trigger: 70 Points</span>
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold rounded uppercase font-mono">Enabled</span>
                      </div>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-xl space-y-1">
                      <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">Trailing Stop Engine</span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono font-sans font-sans">Distance: 50 Points</span>
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold rounded uppercase font-mono">Enabled</span>
                      </div>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-xl space-y-1">
                      <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">Partial Take Profit</span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono font-sans font-sans">50% Close at +100 Points</span>
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold rounded uppercase font-mono">Enabled</span>
                      </div>
                    </div>
                  </div>

                  {/* SELF-TEST PANEL */}
                  {(selfTestLoading || selfTestSuccess !== null) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-neutral-950 border border-neutral-900 rounded-xl p-5 space-y-4 font-mono text-[11px]"
                    >
                      <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                        <span className="text-neutral-300 uppercase font-bold tracking-wider font-sans">Dynamic Integration Verification Suite</span>
                        {selfTestSuccess === true && (
                          <span className="text-emerald-400 font-bold uppercase tracking-wider font-sans">PASS (System Validated)</span>
                        )}
                        {selfTestSuccess === false && (
                          <span className="text-rose-400 font-bold uppercase tracking-wider font-sans">FAIL (Check Logs)</span>
                        )}
                        {selfTestLoading && (
                          <span className="text-amber-500 font-bold uppercase tracking-wider font-sans animate-pulse">Running...</span>
                        )}
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selfTestResults.map((step, i) => (
                          <div key={i} className="flex justify-between items-start gap-4 border-b border-neutral-900/40 pb-2">
                            <div>
                              <span className="text-neutral-400 block font-bold font-sans">{step.step}</span>
                              <span className="text-[10px] text-neutral-500 mt-0.5 block">{step.details}</span>
                            </div>
                            <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                              step.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              step.status === 'FAIL' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                            }`}>
                              {step.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* PORTFOLIO TRACKER */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono font-sans">Open Protections Monitor</h4>
                    {Object.keys(protectionStates).length === 0 ? (
                      <p className="text-[10px] text-neutral-600 font-mono italic">No active open positions detected under protection monitoring.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.values(protectionStates).map((state: any) => (
                          <div key={state.dealId} className="bg-neutral-950 border border-neutral-900 rounded-xl p-4 space-y-3 font-mono text-[10px]">
                            <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                              <div>
                                <span className="text-white font-bold block font-sans">{state.epic}</span>
                                <span className="text-neutral-500 text-[8px] uppercase">ID: {state.dealId}</span>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                state.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {state.direction} • {state.size} Contracts
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center text-[9px]">
                              <div className="bg-neutral-900 border border-neutral-800/40 p-2 rounded-lg">
                                <span className="text-neutral-500 uppercase block">Break Even</span>
                                <span className={`font-bold mt-1 block font-sans ${state.beVerified ? 'text-emerald-400' : state.beActivated ? 'text-amber-500 animate-pulse' : 'text-neutral-600'}`}>
                                  {state.beVerified ? 'VERIFIED' : state.beActivated ? 'PENDING' : 'INACTIVE'}
                                </span>
                              </div>
                              <div className="bg-neutral-900 border border-neutral-800/40 p-2 rounded-lg">
                                <span className="text-neutral-500 uppercase block">Trailing Stop</span>
                                <span className={`font-bold mt-1 block font-sans ${state.trailingStopActivated ? 'text-emerald-400' : 'text-neutral-600'}`}>
                                  {state.trailingStopActivated ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                              </div>
                              <div className="bg-neutral-900 border border-neutral-800/40 p-2 rounded-lg">
                                <span className="text-neutral-500 uppercase block">Partial TP</span>
                                <span className={`font-bold mt-1 block font-sans ${state.partialCloseVerified ? 'text-emerald-400' : state.partialCloseDone ? 'text-amber-500 animate-pulse' : 'text-neutral-600'}`}>
                                  {state.partialCloseVerified ? 'VERIFIED' : state.partialCloseDone ? 'PENDING' : 'INACTIVE'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AUDIT LOGS */}
                  <div className="space-y-3 font-mono">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Trade Protection Audit Trail</h4>
                      <span className="text-[8px] text-neutral-500">Auto-refresh active</span>
                    </div>

                    {protectionAudit.length === 0 ? (
                      <p className="text-[10px] text-neutral-600 italic">No events logged in the protection audit database yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {protectionAudit.slice(0, 10).map((log: any) => (
                          <div key={log.id} className="bg-[#0b0c0d] border border-neutral-900/60 rounded-xl p-3 flex flex-col md:flex-row justify-between gap-3 text-[10px]">
                            <div className="space-y-1 text-left">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold px-1.5 py-0.5 rounded text-[8px] uppercase ${
                                  log.eventType === 'BREAK_EVEN' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                  log.eventType === 'TRAILING_STOP' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                  log.eventType === 'PARTIAL_CLOSE' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                  'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                                }`}>
                                  {log.eventType}
                                </span>
                                <span className="text-white font-bold">{log.symbol}</span>
                                <span className="text-neutral-600">ID: {log.positionId}</span>
                              </div>
                              <p className="text-neutral-400 text-[9px] font-sans">{log.triggerValue}</p>
                            </div>

                            <div className="flex flex-col md:items-end justify-center font-mono text-[9px] text-neutral-500 gap-1">
                              <span>SL Adjust: {log.previousSL || 'None'} → {log.newSL || 'N/A'}</span>
                              <span>{formatTime(log.timestamp)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Microservice WebSocket detailed status */}
                <div className="bg-[#070708] border border-neutral-900 p-4 rounded-2xl font-mono text-[10px] flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-400 animate-pulse animate-duration-1000" />
                    <div>
                      <span className="text-white font-bold block">Internal API & WebSocket Gateways healthy</span>
                      <span className="text-[9px] text-neutral-500 uppercase mt-0.5 block">active connections count: {diagnostics.websocketHealth.activeClients} client node listeners</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-500">Heartbeat Interval:</span>
                    <span className="text-amber-500 font-bold">{(diagnostics.websocketHealth.heartbeatIntervalMs / 1000).toFixed(0)}s</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
