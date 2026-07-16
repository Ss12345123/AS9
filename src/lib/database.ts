/**
 * Database Service Layer
 * Handles all data persistence operations
 */

import fs from 'fs';
import path from 'path';
import { hashPassword, verifyPassword, encryptData, decryptData } from './security';
import config from '../config';

const DB_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

export function verifyDataDirectoryWritable(): boolean {
  ensureDataDir();
  const testFile = path.join(DB_DIR, `_write_test_${Date.now()}.tmp`);
  try {
    fs.writeFileSync(testFile, 'write_test_ok', 'utf-8');
    fs.unlinkSync(testFile);
    console.log("📂 [Storage Verification] The persistent data folder and files are fully writable in Production.");
    return true;
  } catch (error: any) {
    console.error("❌ [Storage Error] FAILED to write to persistent data directory:", error.message);
    return false;
  }
}

function readJSON<T>(filePath: string, defaultValue: T[] = []): T[] {
  ensureDataDir();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

function writeJSON<T>(filePath: string, data: T[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
  }
}

export function createUser(email: string, username: string, password: string, isAdmin: boolean = false): any {
  const USERS_FILE = path.join(DB_DIR, 'users.json');
  const users = readJSON<any>(USERS_FILE);
  
  if (users.find((u: any) => u.email === email || u.username === username)) {
    throw new Error('User already exists');
  }

  const user = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email,
    username,
    passwordHash: hashPassword(password),
    isAdmin,
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: null,
  };

  users.push(user);
  writeJSON(USERS_FILE, users);
  return user;
}

export function getUserByEmail(email: string): any {
  const USERS_FILE = path.join(DB_DIR, 'users.json');
  const users = readJSON<any>(USERS_FILE);
  return users.find((u: any) => u.email === email) || null;
}

export function getUserById(userId: string): any {
  const USERS_FILE = path.join(DB_DIR, 'users.json');
  const users = readJSON<any>(USERS_FILE);
  return users.find((u: any) => u.id === userId) || null;
}

export function verifyUserPassword(email: string, password: string): any {
  const user = getUserByEmail(email);
  if (!user) return null;
  if (verifyPassword(password, user.passwordHash)) {
    return user;
  }
  return null;
}

export function updateUserLastLogin(userId: string): void {
  const USERS_FILE = path.join(DB_DIR, 'users.json');
  const users = readJSON<any>(USERS_FILE);
  const user = users.find((u: any) => u.id === userId);
  if (user) {
    user.lastLogin = new Date();
    user.updatedAt = new Date();
    writeJSON(USERS_FILE, users);
  }
}

export function createSession(userId: string, token: string, refreshToken: string, ipAddress: string, userAgent: string): any {
  const SESSIONS_FILE = path.join(DB_DIR, 'sessions.json');
  const sessions = readJSON<any>(SESSIONS_FILE);
  
  const session = {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    token,
    refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    ipAddress,
    userAgent,
  };

  sessions.push(session);
  writeJSON(SESSIONS_FILE, sessions);
  return session;
}

export function getSessionByToken(token: string): any {
  const SESSIONS_FILE = path.join(DB_DIR, 'sessions.json');
  const sessions = readJSON<any>(SESSIONS_FILE);
  return sessions.find((s: any) => s.token === token && new Date(s.expiresAt) > new Date()) || null;
}

export function invalidateSession(token: string): void {
  const SESSIONS_FILE = path.join(DB_DIR, 'sessions.json');
  const sessions = readJSON<any>(SESSIONS_FILE);
  const filtered = sessions.filter((s: any) => s.token !== token);
  writeJSON(SESSIONS_FILE, filtered);
}

export function storeCapitalComCredentials(userId: string, identifier: string, password: string, apiKey: string, isDemo: boolean = true): any {
  const CREDENTIALS_FILE = path.join(DB_DIR, 'credentials.json');
  const credentials = readJSON<any>(CREDENTIALS_FILE);
  
  const encryptedPassword = encryptData(password);
  const encryptedApiKey = encryptData(apiKey);

  const cred = {
    id: `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    identifier,
    password: encryptedPassword,
    apiKey: encryptedApiKey,
    isDemo,
    isEncrypted: true,
    encryptionVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUsed: null,
  };

  const filtered = credentials.filter((c: any) => c.userId !== userId);
  filtered.push(cred);
  writeJSON(CREDENTIALS_FILE, filtered);
  
  return cred;
}

export function getCapitalComCredentials(userId: string): any {
  const CREDENTIALS_FILE = path.join(DB_DIR, 'credentials.json');
  const credentials = readJSON<any>(CREDENTIALS_FILE);
  const cred = credentials.find((c: any) => c.userId === userId);
  
  if (cred && cred.isEncrypted) {
    return {
      ...cred,
      password: decryptData(cred.password),
      apiKey: decryptData(cred.apiKey),
    };
  } else if (cred) {
    return cred;
  }

  // Fallback to Production environment variables if configured in environment
  if (config.capitalComIdentifier && config.capitalComPassword && config.capitalComApiKey) {
    console.log(`📡 [Credentials Fallback] User ${userId} is falling back to Production Environment variables for Capital.com.`);
    return {
      id: `env_fallback_cred`,
      userId,
      identifier: config.capitalComIdentifier,
      password: config.capitalComPassword,
      apiKey: config.capitalComApiKey,
      isDemo: config.capitalComDemo,
      isEncrypted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  
  return null;
}

export function deleteCapitalComCredentials(userId: string): void {
  const CREDENTIALS_FILE = path.join(DB_DIR, 'credentials.json');
  const credentials = readJSON<any>(CREDENTIALS_FILE);
  const filtered = credentials.filter((c: any) => c.userId !== userId);
  writeJSON(CREDENTIALS_FILE, filtered);
}

export function createAuditLog(userId: string, action: string, resource: string, resourceId: string, data: any): any {
  const AUDIT_LOG_FILE = path.join(DB_DIR, 'audit.json');
  const logs = readJSON<any>(AUDIT_LOG_FILE);

  const log = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    action,
    resource,
    resourceId,
    oldValue: data.oldValue,
    newValue: data.newValue,
    ipAddress: data.ipAddress || '',
    userAgent: data.userAgent || '',
    status: data.status || 'SUCCESS',
    error: data.error,
    createdAt: new Date(),
  };

  logs.push(log);
  writeJSON(AUDIT_LOG_FILE, logs);
  return log;
}

export function getAuditLogs(userId?: string, limit: number = 100): any[] {
  const AUDIT_LOG_FILE = path.join(DB_DIR, 'audit.json');
  const logs = readJSON<any>(AUDIT_LOG_FILE);
  return logs
    .filter((l: any) => !userId || l.userId === userId)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function readJSONPublic<T>(filePath: string, defaultValue: T[] = []): T[] {
  return readJSON(filePath, defaultValue);
}

export function writeJSONPublic<T>(filePath: string, data: T[]): void {
  writeJSON(filePath, data);
}

export function updateUserPassword(email: string, newPasswordHash: string): boolean {
  const USERS_FILE = path.join(DB_DIR, 'users.json');
  const users = readJSON<any>(USERS_FILE);
  const user = users.find((u: any) => u.email === email.toLowerCase());
  if (user) {
    user.passwordHash = newPasswordHash;
    user.updatedAt = new Date();
    writeJSON(USERS_FILE, users);
    return true;
  }
  return false;
}
