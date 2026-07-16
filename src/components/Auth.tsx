import React, { useState, useEffect } from 'react';
import { Shield, Lock, Mail, User, AlertCircle, CheckCircle, ArrowRight, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface AuthProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Listen for success message from popup (after Google callback completes)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('run.app')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { token, refreshToken, user } = event.data;
        if (token && user) {
          localStorage.setItem('token', token);
          if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
          }
          localStorage.setItem('user', JSON.stringify(user));
          onLoginSuccess(user);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLoginSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!email || !password) {
          setError('Please fill in all fields.');
          setIsLoading(false);
          return;
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Login failed');
        }

        localStorage.setItem('token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        localStorage.setItem('user', JSON.stringify(data.user));

        onLoginSuccess({
          email: data.user.email,
          fullName: data.user.fullName || data.user.username,
          username: data.user.username,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${data.user.username}`,
          balance: data.user.balance || 100000.00,
          winRate: data.user.winRate || 78.4,
          dailyProfit: data.user.dailyProfit || 0.00,
          weeklyProfit: data.user.weeklyProfit || 0.00,
          monthlyProfit: data.user.monthlyProfit || 0.00,
        });
      } else if (mode === 'register') {
        if (!email || !password || !fullName || !username) {
          setError('Please fill in all fields.');
          setIsLoading(false);
          return;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, username, password, confirmPassword: password, fullName }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        localStorage.setItem('token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        localStorage.setItem('user', JSON.stringify(data.user));

        setSuccess('Registration successful! Accessing terminal...');
        setTimeout(() => {
          onLoginSuccess({
            email: data.user.email,
            fullName: fullName,
            username: data.user.username,
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${data.user.username}`,
            balance: 100000.00,
            winRate: 75.0,
            dailyProfit: 0.00,
            weeklyProfit: 0.00,
            monthlyProfit: 0.00,
          });
        }, 1500);
      } else if (mode === 'forgot') {
        if (!email) {
          setError('Please enter your registered email address.');
          setIsLoading(false);
          return;
        }
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to dispatch password reset link.');
        }
        setSuccess(data.message || 'Password reset link has been dispatched to your secure terminal.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/google/url');
      if (!response.ok) {
        throw new Error('Failed to retrieve Google authentication URL');
      }
      const { url } = await response.json();
      
      const width = 500;
      const height = 650;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;

      const authWindow = window.open(
        url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        setError('Popup blocked. Please allow popups for this site to sign in with Google.');
      }
    } catch (err: any) {
      setError(err.message || 'Google Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@goldai.com', password: 'goldai123' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Demo login failed');
      }
      localStorage.setItem('token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(data.user));

      onLoginSuccess({
        email: data.user.email,
        fullName: data.user.fullName || 'Alexander Mercer',
        username: data.user.username,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${data.user.username}`,
        balance: 125480.00,
        winRate: 82.3,
        dailyProfit: 2840.50,
        weeklyProfit: 11450.00,
        monthlyProfit: 45900.00,
      });
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="auth_container" className="min-h-screen bg-[#060606] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(218,165,32,0.12),rgba(0,0,0,0))] flex flex-col items-center justify-center p-4">
      
      {/* Background design elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-neutral-900 to-black border border-amber-500/30 shadow-[0_0_20px_rgba(218,165,32,0.15)] mb-4">
            <TrendingUp className="h-8 w-8 text-[#D1A12C]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1 font-sans">
            GOLD <span className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">AI PLATFORM</span>
          </h1>
          <p className="text-xs text-neutral-400 tracking-widest uppercase">Institutional SMC Quantitative Intelligence</p>
        </div>

        {/* Auth Glass Card */}
        <div id="auth_card" className="relative overflow-hidden rounded-3xl bg-neutral-950/70 border border-neutral-800/80 backdrop-blur-xl p-8 shadow-2xl shadow-amber-500/5">
          {/* Subtle gold top border border line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D1A12C] to-transparent"></div>

          <h2 className="text-xl font-semibold text-white mb-6">
            {mode === 'login' && 'System Authentication'}
            {mode === 'register' && 'Institutional Registration'}
            {mode === 'forgot' && 'Secure Terminal Recovery'}
          </h2>

          <AnimatePresence mode="wait">
            <motion.form 
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit} 
              className="space-y-4"
            >
              {error && (
                <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-xl flex items-start gap-2.5 text-xs text-emerald-400">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Alexander Mercer"
                        className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Username</label>
                    <div className="relative">
                      <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="alex_mercer"
                        className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-600 transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Secure Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="demo@goldai.com"
                    className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-600 transition-colors"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-[11px] text-amber-500/80 hover:text-amber-400 transition-colors"
                      >
                        Forgot Terminal Code?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-600 transition-colors"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-300 transform active:scale-[0.98] mt-4 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(218,165,32,0.15)] hover:shadow-[0_4px_25px_rgba(218,165,32,0.25)] disabled:opacity-55 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {mode === 'login' && 'Enter Secure Terminal'}
                    {mode === 'register' && 'Register Account'}
                    {mode === 'forgot' && 'Request Reset Link'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </motion.form>
          </AnimatePresence>

          <div className="mt-6 pt-6 border-t border-neutral-900 flex flex-col gap-3 text-center text-xs">
            {mode === 'login' ? (
              <p className="text-neutral-500">
                New to the platform?{' '}
                <button
                  onClick={() => setMode('register')}
                  className="text-amber-500 hover:underline hover:text-amber-400 font-medium transition-colors"
                >
                  Create Terminal Access
                </button>
              </p>
            ) : (
              <p className="text-neutral-500">
                Already have terminal access?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-amber-500 hover:underline hover:text-amber-400 font-medium transition-colors"
                >
                  Authenticate Instead
                </button>
              </p>
            )}

            {mode === 'login' && (
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-neutral-900/60"></div>
                <span className="flex-shrink mx-4 text-[10px] text-neutral-600 uppercase tracking-widest">or integrate accounts</span>
                <div className="flex-grow border-t border-neutral-900/60"></div>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full bg-white hover:bg-neutral-100 text-neutral-900 font-bold py-2.5 px-4 rounded-xl text-xs transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.68 14.93 1 12 1 7.33 1 3.38 3.68 1.46 7.6l3.8 2.94c.93-2.8 3.53-4.5 6.74-4.5z"/>
                    <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.45h6.46c-.28 1.47-1.11 2.72-2.36 3.56l3.65 2.83c2.14-1.97 3.38-4.87 3.38-8.5z"/>
                    <path fill="#FBBC05" d="M5.26 14.34c-.24-.72-.38-1.49-.38-2.34s.14-1.62.38-2.34L1.46 6.72C.53 8.58 0 10.68 0 12.92s.53 4.34 1.46 6.2l3.8-2.94-.01-1.84z"/>
                    <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.65-2.83c-1.01.68-2.31 1.09-3.95 1.09-3.21 0-5.81-1.7-6.74-4.5L1.82 16.8C3.74 20.72 7.69 23 12 23z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="w-full bg-neutral-900/50 hover:bg-neutral-900 border border-amber-500/20 hover:border-amber-500/55 text-amber-500 hover:text-amber-400 font-medium py-2.5 px-4 rounded-xl text-xs transition-all duration-300"
                >
                  Launch Instant Demo (Alexander Mercer)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Security watermark footer */}
        <div className="text-center mt-6 text-[10px] text-neutral-600 tracking-wider">
          GOLD AI PLATFORM IS A LICENSED SMC ALGORITHMIC TERMINAL.<br />
          SECURE CONNECTION VIA TLS 1.3 CLIENT LAYER.
        </div>
      </div>
    </div>
  );
}
