/**
 * Admin Dashboard Routes
 * Owner-only administrative panel for system management
 */

import express, { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import * as db from '../lib/database';
import { verifyToken } from '../lib/security';
import config from '../config';

const router = express.Router();

// Middleware to verify admin JWT token
function verifyAdminAuth(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = verifyToken(token);
    const user = db.getUserById(payload.id);
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    (req as any).userId = payload.id;
    (req as any).user = user;
    next();
  } catch (error: any) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ========================================
// USER MANAGEMENT
// ========================================

router.get('/api/admin/users', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string;

    // Read users from database
    const allUsers = db.readJSONPublic<any>('data/users.json', []);
    
    let filtered = allUsers;
    if (search) {
      filtered = allUsers.filter(u => 
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = filtered.length;
    const users = filtered
      .slice((page - 1) * pageSize, page * pageSize)
      .map(u => ({
        id: u.id,
        email: u.email,
        username: u.username,
        isAdmin: u.isAdmin,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
      }));

    db.createAuditLog((req as any).userId, 'VIEW_USERS', 'USER', 'ALL', {
      status: 'SUCCESS',
      newValue: { page, pageSize, total },
    });

    return res.json({
      success: true,
      users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/api/admin/users/:userId', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const credentials = db.getCapitalComCredentials(userId);
    const sessions = db.readJSONPublic<any>('data/sessions.json', [])
      .filter(s => s.userId === userId);

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
      hasCapitalComConnection: !!credentials,
      activeSessions: sessions.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

router.patch('/api/admin/users/:userId', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { email, isVerified, isAdmin } = req.body;

    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldValue = { email: user.email, isVerified: user.isVerified, isAdmin: user.isAdmin };

    if (email && email !== user.email) {
      user.email = email;
    }
    if (isVerified !== undefined) {
      user.isVerified = isVerified;
    }
    if (isAdmin !== undefined) {
      user.isAdmin = isAdmin;
    }

    user.updatedAt = new Date();

    db.writeJSONPublic('data/users.json', db.readJSONPublic<any>('data/users.json', [])
      .map(u => u.id === userId ? user : u));

    db.createAuditLog((req as any).userId, 'UPDATE_USER', 'USER', userId, {
      status: 'SUCCESS',
      oldValue,
      newValue: { email: user.email, isVerified: user.isVerified, isAdmin: user.isAdmin },
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

router.post('/api/admin/users/:userId/reset-password', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.passwordHash = crypto.pbkdf2Sync(newPassword, 'salt', 100000, 64, 'sha256').toString('hex');
    user.updatedAt = new Date();

    db.writeJSONPublic('data/users.json', db.readJSONPublic<any>('data/users.json', [])
      .map(u => u.id === userId ? user : u));

    db.createAuditLog((req as any).userId, 'RESET_PASSWORD', 'USER', userId, {
      status: 'SUCCESS',
    });

    return res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.post('/api/admin/users/:userId/suspend', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add suspended flag
    const users = db.readJSONPublic<any>('data/users.json', []);
    const updatedUser = users.find(u => u.id === userId);
    if (updatedUser) {
      updatedUser.isSuspended = true;
      updatedUser.suspendedAt = new Date();
      db.writeJSONPublic('data/users.json', users);
    }

    db.createAuditLog((req as any).userId, 'SUSPEND_USER', 'USER', userId, {
      status: 'SUCCESS',
    });

    return res.json({
      success: true,
      message: 'User suspended',
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to suspend user' });
  }
});

router.post('/api/admin/users/:userId/activate', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const users = db.readJSONPublic<any>('data/users.json', []);
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isSuspended = false;
    delete user.suspendedAt;
    db.writeJSONPublic('data/users.json', users);

    db.createAuditLog((req as any).userId, 'ACTIVATE_USER', 'USER', userId, {
      status: 'SUCCESS',
    });

    return res.json({
      success: true,
      message: 'User activated',
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to activate user' });
  }
});

// ========================================
// SYSTEM STATUS & MONITORING
// ========================================

router.get('/api/admin/system/status', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    const users = db.readJSONPublic<any>('data/users.json', []);
    const sessions = db.readJSONPublic<any>('data/sessions.json', []);
    const trades = db.readJSONPublic<any>('data/trades.json', []);
    const positions = db.readJSONPublic<any>('data/positions.json', []);

    return res.json({
      success: true,
      system: {
        uptime: Math.floor(uptime),
        environment: config.nodeEnv,
        memory: {
          heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
        },
      },
      platform: {
        totalUsers: users.length,
        activeSessions: sessions.filter(s => s.expiresAt > new Date()).length,
        totalTrades: trades.length,
        openPositions: positions.filter(p => !p.isClosed).length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch system status' });
  }
});

router.get('/api/admin/system/logs', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as string;

    const logs = db.getAuditLogs(undefined, limit);
    
    let filtered = logs;
    if (level) {
      filtered = logs.filter(l => l.status === level);
    }

    return res.json({
      success: true,
      logs: filtered,
      count: filtered.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

router.get('/api/admin/system/api-status', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      apis: {
        capitalcom: {
          name: 'Capital.com API',
          status: config.capitalComApiKey ? 'configured' : 'not_configured',
          lastTest: 'N/A',
        },
        twelvedata: {
          name: 'Twelve Data API',
          status: config.twelveDataApiKey ? 'configured' : 'not_configured',
          lastTest: 'N/A',
        },
        gemini: {
          name: 'Gemini AI API',
          status: config.geminiApiKey ? 'configured' : 'not_configured',
          lastTest: 'N/A',
        },
        email: {
          name: 'Resend API Email',
          status: config.resendApiKey ? 'configured' : 'sandbox_mode',
          lastTest: 'N/A',
        },
        telegram: {
          name: 'Telegram Bot',
          status: config.telegramBotToken ? 'configured' : 'not_configured',
          lastTest: 'N/A',
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch API status' });
  }
});

// ========================================
// PLATFORM SETTINGS
// ========================================

router.get('/api/admin/settings', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      settings: {
        platform: {
          name: 'Gold AI Trading Platform',
          version: '1.0.0',
          environment: config.nodeEnv,
          maintenanceMode: false,
        },
        features: {
          capitalcomIntegration: true,
          twelvedataIntegration: true,
          aiAnalysis: true,
          emailNotifications: !!config.resendApiKey,
          telegramNotifications: !!config.telegramBotToken,
          paperTrading: false,
          liveTrading: true,
        },
        security: {
          twoFactorAuth: false,
          passwordExpiry: 90,
          sessionTimeout: 3600000,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.patch('/api/admin/settings', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    // This would update global settings in a real implementation
    db.createAuditLog((req as any).userId, 'UPDATE_SETTINGS', 'SETTINGS', 'GLOBAL', {
      status: 'SUCCESS',
      newValue: req.body,
    });

    return res.json({
      success: true,
      message: 'Settings updated',
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ========================================
// CAPITAL.COM CONNECTION MONITORING
// ========================================

router.get('/api/admin/capital-com/connections', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    const credentials = db.readJSONPublic<any>('data/credentials.json', []);

    const connections = credentials.map(c => ({
      userId: c.userId,
      identifier: c.identifier,
      createdAt: c.createdAt,
      lastUsed: c.lastUsed,
    }));

    return res.json({
      success: true,
      connections,
      count: connections.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

// Read/write JSON helpers (should be in database module)
function readJSON<T>(filePath: string, defaultValue: T[] = []): T[] {
  const fullPath = path.join(process.cwd(), filePath);
  try {
    if (fs.existsSync(fullPath)) {
      return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

function writeJSON<T>(filePath: string, data: T[]): void {
  const fullPath = path.join(process.cwd(), filePath);
  try {
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
  }
}

export default router;
