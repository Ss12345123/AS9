import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import * as db from '../lib/database';
import { generateToken, verifyToken, hashPassword } from '../lib/security';
import { sendPasswordResetEmail } from '../lib/emailService';
import config from '../config';

const router = express.Router();

function getRedirectUri(req: any): string {
  const host = req.get('host') || '';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? req.protocol : 'https';
  return `${protocol}://${host}/api/auth/google/callback`;
}

function verifyAuth(req: any, res: any, next: Function) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^[Bb]earer\s+/, '');
  if (!token) {
    console.warn('[Auth Middleware Warning] Unauthorized request: Missing authorization token header');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.id;
    req.userEmail = payload.email;
    next();
  } catch (error: any) {
    console.error(`[Auth Middleware Error] Invalid authorization token verification: ${error.message}`);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

router.get('/api/auth/session', async (req: any, res: any) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^[Bb]earer\s+/, '');
  if (!token) {
    console.warn('[Session Verification Warning] Missing auth token header.');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const payload = verifyToken(token);
    const user = db.getUserById(payload.id);
    if (!user) {
      console.warn(`[Session Verification Failure] User ID ${payload.id} in token payload was not found.`);
      return res.status(401).json({ error: 'User not found' });
    }

    // Verify session in data/sessions.json
    const session = db.getSessionByToken(token);
    if (!session) {
      console.warn(`[Session Verification Failure] Active session not found or expired for User: ${user.email}`);
      return res.status(401).json({ error: 'Session expired or invalidated' });
    }

    console.log(`[Session Verification Success] Restored session for User: ${user.email}`);
    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName || 'Alexander Mercer',
        isAdmin: user.isAdmin,
      }
    });
  } catch (error: any) {
    console.error(`[Session Verification Error] Verification failed: ${error.message}`);
    return res.status(401).json({ error: 'Session verification failed' });
  }
});

router.post('/api/auth/refresh', async (req: any, res: any) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    console.warn('[Session Refresh Warning] Missing refreshToken body parameter.');
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    const payload = verifyToken(refreshToken);
    if (payload.type !== 'refresh') {
      console.warn('[Session Refresh Failure] Provided token is not of type "refresh".');
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const user = db.getUserById(payload.id);
    if (!user) {
      console.warn(`[Session Refresh Failure] User ID ${payload.id} in refresh token payload not found.`);
      return res.status(401).json({ error: 'User not found' });
    }

    const token = generateToken({ id: user.id, email: user.email }, config.jwtSecret, '30d');
    const newRefreshToken = generateToken({ id: user.id, type: 'refresh' }, config.jwtSecret, '30d');

    // Update session record in database
    const USERS_FILE = path.join(process.cwd(), 'data', 'sessions.json');
    let sessions: any[] = [];
    try {
      if (fs.existsSync(USERS_FILE)) {
        sessions = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      }
    } catch (e) {
      console.error('Failed to read sessions for update:', e);
    }

    const sessionIndex = sessions.findIndex((s: any) => s.refreshToken === refreshToken && new Date(s.expiresAt) > new Date());
    if (sessionIndex !== -1) {
      sessions[sessionIndex].token = token;
      sessions[sessionIndex].refreshToken = newRefreshToken;
      sessions[sessionIndex].expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(sessions, null, 2));
      } catch (e) {
        console.error('Failed to write updated session:', e);
      }
    } else {
      db.createSession(user.id, token, newRefreshToken, req.ip || '', req.get('user-agent') || '');
    }

    console.log(`[Session Refresh Success] Re-issued access and refresh tokens for User: ${user.email}`);
    return res.json({
      success: true,
      token,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName || 'Alexander Mercer',
        isAdmin: user.isAdmin,
      }
    });
  } catch (err: any) {
    console.error(`[Session Refresh Error] Token refresh operation failed: ${err.message}`);
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

router.post('/api/auth/register', async (req: any, res: any) => {
  try {
    const { email, username, password, confirmPassword } = req.body;
    console.log(`[Auth Register Attempt] Email: ${email || 'Empty'} | Username: ${username || 'Empty'}`);

    if (!email || !username || !password || !confirmPassword) {
      console.warn('[Auth Register Warning] Missing required fields for registration');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password !== confirmPassword) {
      console.warn('[Auth Register Warning] Passwords do not match');
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 8) {
      console.warn('[Auth Register Warning] Password length is less than 8 characters');
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = db.createUser(email, username, password);
    const token = generateToken({ id: user.id, email: user.email });
    
    console.log(`[Auth Register Success] User registered successfully: ${user.email} (ID: ${user.id})`);
    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      token,
    });
  } catch (error: any) {
    console.error('Registration error:', error.message);
    return res.status(400).json({ error: error.message });
  }
});

router.post('/api/auth/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    console.log(`[Auth Login Attempt] Email: ${email || 'Empty'}`);

    if (!email || !password) {
      console.warn('[Auth Login Warning] Email and password required');
      return res.status(400).json({ error: 'Email and password required' });
    }

    let user = db.getUserByEmail(email);
    if (!user && email === 'demo@goldai.com' && password === 'goldai123') {
      try {
        console.log('[Auth Login Seeding] Auto-seeding Mercer demo user account demo@goldai.com');
        user = db.createUser('demo@goldai.com', 'alex_mercer_institutional', 'goldai123');
        const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
        const users = db.readJSONPublic<any>(USERS_FILE);
        const u = users.find((item: any) => item.id === user.id);
        if (u) {
          u.fullName = 'Alexander Mercer';
          db.writeJSONPublic(USERS_FILE, users);
        }
        user.fullName = 'Alexander Mercer';
      } catch (createErr: any) {
        console.error('Failed to auto-seed demo user:', createErr.message);
      }
    }

    const verifiedUser = db.verifyUserPassword(email, password);
    if (!verifiedUser) {
      console.warn(`[Auth Login Failure] Invalid password credentials entered for user: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    db.updateUserLastLogin(verifiedUser.id);
    
    const token = generateToken({ id: verifiedUser.id, email: verifiedUser.email });
    const refreshToken = generateToken({ id: verifiedUser.id, type: 'refresh' }, config.jwtSecret, config.refreshTokenExpiry);
    
    db.createSession(verifiedUser.id, token, refreshToken, req.ip || '', req.get('user-agent') || '');
    
    console.log(`[Auth Login Success] User ${verifiedUser.email} authenticated successfully. ID: ${verifiedUser.id}`);
    return res.json({
      success: true,
      user: {
        id: verifiedUser.id,
        email: verifiedUser.email,
        username: verifiedUser.username,
        fullName: verifiedUser.fullName || 'Alexander Mercer',
        isAdmin: verifiedUser.isAdmin,
      },
      token,
      refreshToken,
    });
  } catch (error: any) {
    console.error('Login error:', error.message);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/api/auth/logout', verifyAuth, async (req: any, res: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    console.log(`[Auth Logout Attempt] User ID: ${req.userId}`);
    if (token) {
      db.invalidateSession(token);
    }
    
    console.log(`[Auth Logout Success] User ID ${req.userId} logged out successfully.`);
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('[Auth Logout Error] Logout operation failed:', error.message);
    return res.status(500).json({ error: 'Logout failed' });
  }
});

/** Google OAuth URL generator */
router.get('/api/auth/google/url', (req: any, res: any) => {
  const clientId = config.googleClientId;
  const redirectUri = getRedirectUri(req);

  if (!clientId) {
    // Return a sandbox consent URL if variables are not configured yet
    return res.json({
      url: `/api/auth/google/sandbox?redirect_uri=${encodeURIComponent(redirectUri)}`,
      sandbox: true
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    prompt: 'consent',
  });

  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

/** Google OAuth Sandbox consent mockup screen */
router.get('/api/auth/google/sandbox', (req: any, res: any) => {
  const redirectUri = req.query.redirect_uri || '';
  res.send(`
    <html>
      <head>
        <title>Sign in with Google - Sandbox</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-neutral-900 text-neutral-200 flex flex-col items-center justify-center min-h-screen p-6 font-sans">
        <div class="bg-neutral-950 border border-neutral-800 p-8 rounded-3xl max-w-sm w-full text-center space-y-6 shadow-2xl relative">
          <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D1A12C] to-transparent"></div>
          <div class="flex justify-center">
            <svg class="h-10 w-10" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.68 14.93 1 12 1 7.33 1 3.38 3.68 1.46 7.6l3.8 2.94c.93-2.8 3.53-4.5 6.74-4.5z"/>
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.45h6.46c-.28 1.47-1.11 2.72-2.36 3.56l3.65 2.83c2.14-1.97 3.38-4.87 3.38-8.5z"/>
              <path fill="#FBBC05" d="M5.26 14.34c-.24-.72-.38-1.49-.38-2.34s.14-1.62.38-2.34L1.46 6.72C.53 8.58 0 10.68 0 12.92s.53 4.34 1.46 6.2l3.8-2.94-.01-1.84z"/>
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.65-2.83c-1.01.68-2.31 1.09-3.95 1.09-3.21 0-5.81-1.7-6.74-4.5L1.82 16.8C3.74 20.72 7.69 23 12 23z"/>
            </svg>
          </div>
          <div>
            <h2 class="text-base font-bold text-white tracking-tight uppercase">Google Account Sandbox</h2>
            <p class="text-[11px] text-neutral-400 mt-1">Select an account to authorize the terminal instantly</p>
          </div>
          <div class="space-y-2">
            <button onclick="selectAccount('saudddd1p@gmail.com', 'Gold AI Trader')" class="w-full flex items-center gap-3 p-3 bg-neutral-905 hover:bg-neutral-900 rounded-2xl border border-neutral-800 transition-all text-left">
              <div class="h-8 w-8 rounded-full bg-amber-500/10 text-[#D1A12C] flex items-center justify-center font-bold text-xs border border-amber-500/10">G</div>
              <div>
                <p class="text-xs font-semibold text-white">Gold AI Trader</p>
                <p class="text-[10px] text-neutral-500">saudddd1p@gmail.com</p>
              </div>
            </button>
            <button onclick="selectAccount('demo@goldai.com', 'Alexander Mercer')" class="w-full flex items-center gap-3 p-3 bg-neutral-905 hover:bg-neutral-900 rounded-2xl border border-neutral-800 transition-all text-left">
              <div class="h-8 w-8 rounded-full bg-amber-500/10 text-[#D1A12C] flex items-center justify-center font-bold text-xs border border-amber-500/10">A</div>
              <div>
                <p class="text-xs font-semibold text-white">Alexander Mercer</p>
                <p class="text-[10px] text-neutral-500 font-mono">demo@goldai.com</p>
              </div>
            </button>
          </div>
          <div class="text-[10px] text-neutral-500 leading-relaxed border-t border-neutral-900 pt-4">
            To switch to production Google OAuth, configure <code class="text-amber-500 font-mono">GOOGLE_CLIENT_ID</code> and <code class="text-amber-500 font-mono">GOOGLE_CLIENT_SECRET</code> in the terminal's environment.
          </div>
        </div>
        <script>
          function selectAccount(email, name) {
            const redirectUri = "${redirectUri}";
            window.location.href = redirectUri + "?code=sandbox_code_" + encodeURIComponent(email) + "_" + encodeURIComponent(name);
          }
        </script>
      </body>
    </html>
  `);
});

/** Google OAuth callback processor */
router.get('/api/auth/google/callback', async (req: any, res: any) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Authorization code is missing from callback');
    }

    let email = '';
    let username = '';
    let fullName = '';

    if (String(code).startsWith('sandbox_code_')) {
      const parts = String(code).split('_');
      email = decodeURIComponent(parts[2]);
      fullName = decodeURIComponent(parts[3]);
      username = email.split('@')[0];
    } else {
      const clientId = config.googleClientId;
      const clientSecret = config.googleClientSecret;
      const redirectUri = getRedirectUri(req);

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenRes.ok) {
        throw new Error(`Google token exchange failed: ${await tokenRes.text()}`);
      }

      const tokenData: any = await tokenRes.json();
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      if (!userRes.ok) {
        throw new Error('Google user profile fetch failed');
      }

      const userData: any = await userRes.json();
      email = userData.email;
      fullName = userData.name || userData.given_name || 'Google User';
      username = email.split('@')[0];
    }

    let user = db.getUserByEmail(email);
    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      user = db.createUser(email, username, randomPassword);
      
      const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
      const users = db.readJSONPublic<any>(USERS_FILE);
      const u = users.find((item: any) => item.id === user.id);
      if (u) {
        u.fullName = fullName;
        db.writeJSONPublic(USERS_FILE, users);
      }
      user.fullName = fullName;
    } else {
      fullName = user.fullName || fullName;
    }

    const token = generateToken({ id: user.id, email: user.email });
    const refreshToken = generateToken({ id: user.id, type: 'refresh' }, config.jwtSecret, config.refreshTokenExpiry);
    
    db.createSession(user.id, token, refreshToken, req.ip || '', req.get('user-agent') || '');

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_SUCCESS',
                token: '${token}',
                refreshToken: '${refreshToken}',
                user: ${JSON.stringify({
                  id: user.id,
                  email: user.email,
                  username: user.username,
                  fullName: fullName,
                  avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`,
                  balance: user.balance || 100000.00,
                  winRate: user.winRate || 75.0,
                  dailyProfit: user.dailyProfit || 0.00,
                  weeklyProfit: user.weeklyProfit || 0.00,
                  monthlyProfit: user.monthlyProfit || 0.00,
                })}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. You may close this window manually if it doesn't close automatically.</p>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error('Google OAuth callback error:', err.message);
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
});

/** Forgot Password Dispatcher */
router.post('/api/auth/forgot-password', async (req: any, res: any) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  try {
    const user = db.getUserByEmail(email);
    if (!user) {
      // Return success to prevent email fishing/enumeration, but log it internally
      console.log(`[Forgot Password] Requested for non-existent email: ${email}`);
      return res.json({
        success: true,
        message: 'If the email is registered in our database, password reset instructions have been dispatched.'
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const resetFile = path.join(process.cwd(), 'data', 'resets.json');
    let resets: any[] = [];
    
    if (fs.existsSync(resetFile)) {
      try {
        resets = JSON.parse(fs.readFileSync(resetFile, 'utf-8'));
      } catch (e) {
        console.error('Failed to parse resets.json:', e);
      }
    }

    // Filter out expired resets or old resets for this user
    resets = resets.filter((r: any) => r.email !== email && new Date(r.expiresAt) > new Date());
    
    resets.push({
      email: email.toLowerCase(),
      token,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 mins
    });

    if (!fs.existsSync(path.dirname(resetFile))) {
      fs.mkdirSync(path.dirname(resetFile), { recursive: true });
    }
    fs.writeFileSync(resetFile, JSON.stringify(resets, null, 2), 'utf-8');

    // Send real email via Resend
    await sendPasswordResetEmail(email, token);

    console.log(`[Forgot Password] Dispatched password reset link to user: ${email}`);
    return res.json({
      success: true,
      message: 'If the email is registered in our database, password reset instructions have been dispatched.'
    });
  } catch (error: any) {
    console.error('[Forgot Password Error]', error.message);
    return res.status(500).json({ error: 'Failed to process forgot password request.' });
  }
});

/** Reset Password Handler */
router.post('/api/auth/reset-password', async (req: any, res: any) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  try {
    const resetFile = path.join(process.cwd(), 'data', 'resets.json');
    if (!fs.existsSync(resetFile)) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    let resets: any[] = [];
    try {
      resets = JSON.parse(fs.readFileSync(resetFile, 'utf-8'));
    } catch (e) {
      console.error('Failed to parse resets:', e);
    }

    const resetIndex = resets.findIndex((r: any) => r.token === token && new Date(r.expiresAt) > new Date());
    if (resetIndex === -1) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const { email } = resets[resetIndex];
    const passwordHash = hashPassword(password);
    
    const updated = db.updateUserPassword(email, passwordHash);
    if (!updated) {
      return res.status(400).json({ error: 'User associated with this reset token could not be found.' });
    }

    // Clean up reset record
    resets.splice(resetIndex, 1);
    fs.writeFileSync(resetFile, JSON.stringify(resets, null, 2), 'utf-8');

    console.log(`[Reset Password Success] Password successfully reset for user: ${email}`);
    return res.json({ success: true, message: 'Password has been successfully updated.' });
  } catch (error: any) {
    console.error('[Reset Password Error]', error.message);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

/** Server-rendered Reset Password Web Interface */
router.get('/reset-password', (req: any, res: any) => {
  const token = req.query.token;
  if (!token) {
    return res.status(400).send(`
      <html>
        <head>
          <title>Invalid Request - Gold AI</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-neutral-950 text-neutral-200 flex items-center justify-center min-h-screen p-6 font-sans">
          <div class="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h1 class="text-xl font-bold text-red-500">Invalid Link</h1>
            <p class="text-xs text-neutral-400">The password reset link is invalid, incomplete, or missing a secure token payload.</p>
            <a href="/" class="block w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2.5 rounded-xl text-xs transition-colors">Return to Terminal</a>
          </div>
        </body>
      </html>
    `);
  }

  res.send(`
    <html>
      <head>
        <title>Reset Terminal Code - Gold AI</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;850&display=swap');
          body {
            font-family: 'Inter', sans-serif;
          }
        </style>
      </head>
      <body class="bg-[#050506] text-neutral-200 flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
        <!-- Golden ambient glow background -->
        <div class="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none"></div>
        <div class="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-amber-500/3 blur-[120px] pointer-events-none"></div>

        <div class="bg-neutral-950 border border-neutral-900 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl relative">
          <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D1A12C] to-transparent"></div>
          
          <div class="text-center space-y-2">
            <h1 class="text-[#D1A12C] text-lg font-black tracking-widest uppercase">GOLD AI TRADER</h1>
            <h2 class="text-base font-bold text-white tracking-tight uppercase">Reset Secure Terminal Code</h2>
            <p class="text-[11px] text-neutral-500">Authorized cryptographically via Resend email validation.</p>
          </div>

          <form id="resetForm" class="space-y-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-neutral-400 uppercase tracking-wider">New Password</label>
              <input type="password" id="password" required minlength="8" placeholder="••••••••••••" class="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-xl py-2.5 px-4 text-sm text-white placeholder-neutral-600 transition-colors" />
            </div>

            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-neutral-400 uppercase tracking-wider">Confirm New Password</label>
              <input type="password" id="confirmPassword" required minlength="8" placeholder="••••••••••••" class="w-full bg-neutral-900/60 border border-neutral-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 rounded-xl py-2.5 px-4 text-sm text-white placeholder-neutral-600 transition-colors" />
            </div>

            <div id="errorBox" class="hidden p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl"></div>
            <div id="successBox" class="hidden p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl"></div>

            <button type="submit" id="submitBtn" class="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-300 transform active:scale-[0.98] mt-4 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(218,165,32,0.15)] hover:shadow-[0_4px_25px_rgba(218,165,32,0.25)]">
              Update Password
            </button>
          </form>

          <div class="text-[10px] text-neutral-600 leading-relaxed border-t border-neutral-900 pt-4 text-center">
            GOLD AI SECURE DISPATCH COMPLIANT. TLS 1.3 CLIENT LAYER.
          </div>
        </div>

        <script>
          const form = document.getElementById('resetForm');
          const submitBtn = document.getElementById('submitBtn');
          const errorBox = document.getElementById('errorBox');
          const successBox = document.getElementById('successBox');

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorBox.classList.add('hidden');
            successBox.classList.add('hidden');

            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
              errorBox.textContent = 'Passwords do not match.';
              errorBox.classList.remove('hidden');
              return;
            }

            if (password.length < 8) {
              errorBox.textContent = 'Password must be at least 8 characters long.';
              errorBox.classList.remove('hidden');
              return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';

            try {
              const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: "${token}", password })
              });

              const data = await response.json();
              if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password.');
              }

              successBox.textContent = 'Password reset successfully! Redirecting you to terminal...';
              successBox.classList.remove('hidden');
              form.reset();

              setTimeout(() => {
                window.location.href = '/';
              }, 3000);
            } catch (err) {
              errorBox.textContent = err.message;
              errorBox.classList.remove('hidden');
              submitBtn.disabled = false;
              submitBtn.textContent = 'Update Password';
            }
          });
        </script>
      </body>
    </html>
  `);
});

export default router;