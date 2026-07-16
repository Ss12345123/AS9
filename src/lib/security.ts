import crypto from 'crypto';
import config from '../config';

const ENCRYPTION_KEY = config.encryptionKey;
const ENCRYPTION_IV = config.encryptionIv;

/**
 * Encrypt sensitive data (API keys, passwords, etc.)
 * Uses AES-256-CBC encryption
 */
export function encryptData(plaintext: string): string {
  try {
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const iv = Buffer.from(ENCRYPTION_IV.padEnd(16, '0').substring(0, 16));
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt encrypted data
 */
export function decryptData(encrypted: string): string {
  try {
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const iv = Buffer.from(ENCRYPTION_IV.padEnd(16, '0').substring(0, 16));
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash password using bcrypt-like approach
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password
 */
export function verifyPassword(password: string, hash: string): boolean {
  try {
    const [salt, storedHash] = hash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
    return verifyHash === storedHash;
  } catch (error) {
    return false;
  }
}

/**
 * Generate secure JWT token
 */
export function generateToken(payload: any, secret: string = config.jwtSecret, expiresIn: string = '30d'): string {
  // Simple JWT implementation
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  
  const now = Math.floor(Date.now() / 1000);
  let duration = 30 * 24 * 60 * 60; // default 30 days
  
  if (typeof expiresIn === 'number') {
    duration = expiresIn;
  } else if (typeof expiresIn === 'string') {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (match) {
      const amount = parseInt(match[1], 10);
      const unit = match[2];
      switch (unit) {
        case 's': duration = amount; break;
        case 'm': duration = amount * 60; break;
        case 'h': duration = amount * 3600; break;
        case 'd': duration = amount * 24 * 3600; break;
      }
    }
  }
  
  const expiration = now + duration;
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: expiration })).toString('base64');
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${header}.${body}.${signature}`;
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string, secret: string = config.jwtSecret): any {
  try {
    if (!token) {
      throw new Error('Token is empty');
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token format invalid');
    }
    const [header, body, signature] = parts;
    if (!header || !body || !signature) {
      throw new Error('Token segments missing');
    }
    
    const newSignature = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${body}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    if (signature !== newSignature) {
      throw new Error('Invalid signature');
    }
    
    const payload = JSON.parse(Buffer.from(body, 'base64').toString('utf8'));
    
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }
    
    return payload;
  } catch (error: any) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Generate secure random token
 */
export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string, showChars: number = 4): string {
  if (data.length <= showChars) return '*'.repeat(data.length);
  return data.substring(0, showChars) + '*'.repeat(data.length - showChars);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate secure 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}