/**
 * Capital.com API Integration Service
 * Implements the official Capital.com REST API.
 * Docs: https://open-api.capital.com/
 *
 * Authentication model:
 *   - Every request carries the `X-CAP-API-KEY` header.
 *   - A session is created via POST /api/v1/session which returns the
 *     `CST` and `X-SECURITY-TOKEN` headers. Those two tokens authenticate
 *     all subsequent requests and expire after ~10 minutes of inactivity.
 */

import config from '../config';

const DEMO_BASE_URL = 'https://demo-api-capital.backend-capital.com';
const LIVE_BASE_URL = 'https://api-capital.backend-capital.com';

export function isDemo(creds?: { isDemo?: boolean }): boolean {
  if (creds && typeof creds.isDemo === 'boolean') {
    return creds.isDemo;
  }
  // Default to the demo environment unless explicitly opted into live trading.
  return config.capitalComDemo;
}

export function getBaseUrl(creds?: { isDemo?: boolean }): string {
  const isDemoMode = isDemo(creds);
  if (isDemoMode) {
    // Demo Mode is selected: Never fall back to Live endpoint.
    return DEMO_BASE_URL;
  }
  
  let url = config.capitalComApiUrl;
  if (url) {
    if (url.includes('demo-api-capital.backend-capital.com')) {
      url = url.replace('demo-api-capital.backend-capital.com', 'api-capital.backend-capital.com');
    }
  } else {
    url = LIVE_BASE_URL;
  }
  
  // Strip all trailing slashes to prevent double slashes when joining paths
  return url.replace(/\/+$/, '');
}

function getApiKey(): string {
  return config.capitalComApiKey;
}

export interface CapitalComSession {
  cst: string;
  securityToken: string;
  createdAt: number;
  expiresAt: number;
}

export interface CapitalComAccount {
  accountId: string;
  accountName: string;
  brokerName: string;
  accountType: 'LIVE' | 'DEMO' | string;
  currency: string;
  balance: number;
  deposit: number;
  available: number;
  profitLoss: number;
  preferred: boolean;
  isLive: boolean;
}

export interface CapitalComPosition {
  dealId: string;
  epic: string;
  instrumentName: string;
  direction: 'BUY' | 'SELL';
  size: number;
  openLevel: number;
  currentLevel: number;
  profitLoss: number;
  currency: string;
  stopLevel?: number;
  profitLevel?: number;
  createdDate: string;
}

export interface CapitalComOrder {
  dealId: string;
  epic: string;
  instrumentName: string;
  direction: 'BUY' | 'SELL';
  orderType: 'LIMIT' | 'STOP';
  orderLevel: number;
  orderSize: number;
  createdDate: string;
}

export interface CapitalComPrice {
  epic: string;
  bid: number;
  offer: number;
  high: number;
  low: number;
  netChange: number;
  percentageChange: number;
  timestamp: string;
  marketStatus: string;
}

// Session token lifetime; Capital.com invalidates after ~10 minutes idle.
const SESSION_TTL_MS = 9 * 60 * 1000;

let currentSession: CapitalComSession | null = null;
const userSessions = new Map<string, CapitalComSession>();
const activeAuthPromises = new Map<string, Promise<CapitalComSession>>();

/** Whether the necessary environment credentials are configured. */
export function isConfigured(creds?: { identifier: string; apiKey: string; password?: string }): boolean {
  if (creds) {
    return Boolean(creds.identifier && creds.apiKey && creds.password);
  }
  return Boolean(
    getApiKey() && config.capitalComIdentifier && config.capitalComPassword,
  );
}

async function parseError(response: Response, creds?: { isDemo?: boolean }): Promise<string> {
  const status = response.status;
  const urlPattern = response.url ? response.url.split('?')[0] : 'Unknown URL';
  const isDemoMode = isDemo(creds) ? 'DEMO' : 'LIVE';
  
  try {
    const rawText = await response.text();
    console.error(`[Capital.com API Request Error Log]
------------------------------
Base URL: ${getBaseUrl(creds)}
API URL: ${urlPattern}
Environment Mode: ${isDemoMode}
Response Status Code: ${status} ${response.statusText || ''}
Exact API Response: ${rawText}
------------------------------`);
    
    try {
      const body = JSON.parse(rawText);
      const errorCode = body.errorCode || body.error || '';
      const errorMessage = body.errorMessage || body.message || '';
      
      let humanExplanation = '';
      if (errorCode === 'error.null.client.token') {
        humanExplanation = ' (The API key is invalid or unauthorized for this environment. Please verify that your API key matches your selected Demo/Live mode, and that you do not have extra spaces.)';
      } else if (errorCode === 'validation-error' || status === 400) {
        humanExplanation = ' (Please check that your identifier/email is formatted correctly and is the email associated with your Capital.com account.)';
      } else if (status === 401 || errorCode === 'invalid-credentials') {
        humanExplanation = ' (The credentials provided are invalid. Ensure your password and API key are exactly correct and correspond to your active environment.)';
      } else if (status === 403) {
        humanExplanation = ' (Access Forbidden. Your IP address might be restricted or your API key does not have the necessary permissions.)';
      }
      
      const parsedMsg = [errorCode, errorMessage].filter(Boolean).join(': ');
      return parsedMsg ? `${parsedMsg}${humanExplanation}` : `HTTP ${status}: ${rawText}${humanExplanation}`;
    } catch {
      return `HTTP ${status}: ${rawText}`;
    }
  } catch (err: any) {
    console.error(`[Capital.com API Error Detail Parsing Failed] Code: ${status}, Parse Error: ${err.message}`);
    return `HTTP ${status} (Failed to parse detailed error response: ${err.message})`;
  }
}

/**
 * Authenticate and cache a session. Reuses an existing, non-expired session.
 */
export async function authenticateCapitalCom(
  force = false,
  creds?: { identifier: string; password?: string; apiKey: string; isDemo?: boolean }
): Promise<CapitalComSession> {
  const rawIdentifier = creds ? creds.identifier : config.capitalComIdentifier;
  const rawPassword = creds ? creds.password : config.capitalComPassword;
  const rawApiKey = creds ? creds.apiKey : getApiKey();

  const identifier = rawIdentifier?.trim() || '';
  const password = rawPassword?.trim() || '';
  const apiKey = rawApiKey?.trim() || '';

  const isDemoMode = isDemo(creds) ? 'DEMO' : 'LIVE';
  const targetUrl = `${getBaseUrl(creds)}/api/v1/session`;

  if (!apiKey || !identifier || !password) {
    const missing = [];
    if (!apiKey) missing.push('API Key');
    if (!identifier) missing.push('Identifier/Email');
    if (!password) missing.push('Password');
    
    const errStr = `Capital.com credentials not configured: Missing ${missing.join(', ')}`;
    console.error(`[Capital.com Auth Failure] ${errStr}`);
    throw new Error(errStr);
  }

  const sessionKey = identifier;

  // Check cache first if not forced
  if (!force) {
    const cached = userSessions.get(sessionKey);
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`[Capital.com Auth] Reusing non-expired cached session for ${identifier}`);
      return cached;
    }
  }

  // Prevent parallel authentication requests for the same session/account to avoid 429s
  let activePromise = activeAuthPromises.get(sessionKey);
  if (activePromise) {
    console.log(`[Capital.com Auth] Sharing in-flight authentication request for ${identifier}`);
    return activePromise;
  }

  const authPromise = (async () => {
    try {
      console.log(`[Capital.com Auth Attempt] Initiating authentication...
- Target URL: ${targetUrl}
- Mode: ${isDemoMode}
- Identifier/Email: ${identifier || 'Not configured'}`);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CAP-API-KEY': apiKey,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        },
        body: JSON.stringify({ identifier, password }),
      });

      if (!response.ok) {
        const errorMsg = await parseError(response, creds);
        console.error(`[Capital.com Auth Failure] URL: ${targetUrl} | Status: ${response.status} | Details: ${errorMsg}`);
        throw new Error(`Capital.com authentication failed: ${errorMsg}`);
      }

      const cst = response.headers.get('CST') || '';
      const securityToken = response.headers.get('X-SECURITY-TOKEN') || '';

      if (!cst || !securityToken) {
        console.error(`[Capital.com Auth Failure] Status: 200 OK but missing session headers. CST present: ${!!cst}, X-SECURITY-TOKEN present: ${!!securityToken}`);
        throw new Error('Capital.com authentication did not return session tokens (CST/X-SECURITY-TOKEN)');
      }

      const now = Date.now();
      const session = { cst, securityToken, createdAt: now, expiresAt: now + SESSION_TTL_MS };
      userSessions.set(sessionKey, session);
      if (!creds) {
        currentSession = session;
      }
      console.log(`[Capital.com Auth Success] Successfully authenticated session for ${identifier}`);
      return session;
    } catch (err: any) {
      console.error(`[Capital.com Auth Exception Stack Trace]
------------------------------
Error Message: ${err.message}
Stack Trace: ${err.stack || 'No stack trace available'}
------------------------------`);
      if (err.message && err.message.includes('Capital.com authentication failed')) {
        throw err;
      }
      console.error(`[Capital.com Network/System Error] Connection to ${targetUrl} failed: ${err.message}`);
      throw new Error(`Capital.com connection failed: ${err.message}`);
    } finally {
      activeAuthPromises.delete(sessionKey);
    }
  })();

  activeAuthPromises.set(sessionKey, authPromise);
  return authPromise;
}

async function authedFetch(
  pathname: string, 
  init: { method?: string; body?: any } = {},
  creds?: { identifier: string; password?: string; apiKey: string; isDemo?: boolean }
): Promise<any> {
  const session = await authenticateCapitalCom(false, creds);
  const apiKey = creds ? creds.apiKey : getApiKey();
  const baseUrl = getBaseUrl(creds);
  const fullUrl = pathname.startsWith('/') ? `${baseUrl}${pathname}` : `${baseUrl}/${pathname}`;

  const response = await fetch(fullUrl, {
    method: init.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-CAP-API-KEY': apiKey,
      CST: session.cst,
      'X-SECURITY-TOKEN': session.securityToken,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  // Session may have expired mid-flight; re-authenticate once and retry.
  if (response.status === 401) {
    const fresh = await authenticateCapitalCom(true, creds);
    const retry = await fetch(fullUrl, {
      method: init.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CAP-API-KEY': apiKey,
        CST: fresh.cst,
        'X-SECURITY-TOKEN': fresh.securityToken,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    if (!retry.ok) throw new Error(await parseError(retry, creds));
    return retry.json();
  }

  if (!response.ok) throw new Error(await parseError(response, creds));
  return response.json();
}

function mapAccount(acc: any, creds?: { isDemo?: boolean }): CapitalComAccount {
  const balance = acc.balance || {};
  return {
    accountId: acc.accountId,
    accountName: acc.accountName || acc.accountId,
    brokerName: 'Capital.com',
    accountType: acc.accountType || (isDemo(creds) ? 'DEMO' : 'LIVE'),
    currency: acc.currency,
    balance: balance.balance ?? 0,
    deposit: balance.deposit ?? 0,
    available: balance.available ?? 0,
    profitLoss: balance.profitLoss ?? 0,
    preferred: Boolean(acc.preferred),
    isLive: (acc.accountType || '').toUpperCase() !== 'DEMO' && !isDemo(creds),
  };
}

/** List all trading accounts for the authenticated user. */
export async function getConnectedAccounts(creds?: { identifier: string; password?: string; apiKey: string; isDemo?: boolean }): Promise<CapitalComAccount[]> {
  const data = await authedFetch('/api/v1/accounts', {}, creds);
  return (data.accounts || []).map((acc) => mapAccount(acc, creds));
}

/** Fetch a single account by id (falls back to filtering the account list). */
export async function getAccountDetails(accountId: string, creds?: { identifier: string; password?: string; apiKey: string }): Promise<CapitalComAccount | null> {
  const accounts = await getConnectedAccounts(creds);
  return accounts.find((a) => a.accountId === accountId) || null;
}

function mapPosition(entry: any): CapitalComPosition {
  const p = entry.position || {};
  const m = entry.market || {};
  const currentLevel = p.direction === 'BUY' ? m.bid : m.offer;

  // Dynamic lot size mapping: Map contract units back to standard lot sizes
  let contractSize = m.lotSize;
  if (!contractSize) {
    const epic = (m.epic || '').toUpperCase();
    if (epic.includes('EURUSD') || epic.includes('GBPUSD') || epic.includes('AUDUSD') || epic.includes('USDJPY')) {
      contractSize = 100000;
    } else if (epic.includes('GOLD') || epic.includes('XAUUSD')) {
      contractSize = 100;
    } else {
      contractSize = 1;
    }
  }

  const lotSizeValue = p.size / contractSize;

  return {
    dealId: p.dealId,
    epic: m.epic,
    instrumentName: m.instrumentName || m.epic,
    direction: p.direction,
    size: Number(lotSizeValue.toFixed(2)),
    openLevel: p.level,
    currentLevel: currentLevel ?? p.level,
    profitLoss: p.upl ?? 0,
    currency: p.currency,
    stopLevel: p.stopLevel,
    profitLevel: p.profitLevel,
    createdDate: p.createdDate || p.createdDateUTC || '',
  };
}

/** Get all open positions (Capital.com positions are account-scoped via session). */
export async function getOpenPositions(creds?: { identifier: string; password?: string; apiKey: string }): Promise<CapitalComPosition[]> {
  const data = await authedFetch('/api/v1/positions', {}, creds);
  return (data.positions || []).map(mapPosition);
}

function mapOrder(entry: any): CapitalComOrder {
  const o = entry.workingOrderData || entry.workingOrder || {};
  const m = entry.marketData || entry.market || {};
  return {
    dealId: o.dealId,
    epic: m.epic || o.epic,
    instrumentName: m.instrumentName || m.epic || o.epic,
    direction: o.direction,
    orderType: o.orderType || o.type,
    orderLevel: o.orderLevel ?? o.level,
    orderSize: o.orderSize ?? o.size,
    createdDate: o.createdDate || o.createdDateUTC || '',
  };
}

/** Get all pending working orders. */
export async function getPendingOrders(creds?: { identifier: string; password?: string; apiKey: string }): Promise<CapitalComOrder[]> {
  const data = await authedFetch('/api/v1/workingorders', {}, creds);
  return (data.workingOrders || []).map(mapOrder);
}

/** Get a market snapshot for a single epic (instrument code). */
export async function getLivePrice(epic: string, creds?: { identifier: string; password?: string; apiKey: string }): Promise<CapitalComPrice> {
  const data = await authedFetch(`/api/v1/markets/${encodeURIComponent(epic)}`, {}, creds);
  const snap = data.snapshot || {};
  return {
    epic,
    bid: snap.bid,
    offer: snap.offer,
    high: snap.high,
    low: snap.low,
    netChange: snap.netChange,
    percentageChange: snap.percentageChange,
    timestamp: snap.updateTime || new Date().toISOString(),
    marketStatus: snap.marketStatus,
  };
}

export async function getMarketDetails(
  epic: string,
  creds?: { identifier: string; password?: string; apiKey: string }
): Promise<any> {
  const data = await authedFetch(`/api/v1/markets/${encodeURIComponent(epic)}`, {}, creds);
  return {
    instrument: data.instrument || {},
    snapshot: data.snapshot || {},
  };
}

/** Fetch live snapshots for multiple epics in a single request. */
export async function getMarketPrices(epics: string[], creds?: { identifier: string; password?: string; apiKey: string }): Promise<Record<string, CapitalComPrice>> {
  const data = await authedFetch(`/api/v1/markets?epics=${epics.map(encodeURIComponent).join(',')}`, {}, creds);
  const out: Record<string, CapitalComPrice> = {};
  for (const md of data.marketDetails || []) {
    const epic = md.instrument?.epic;
    const s = md.snapshot || {};
    if (!epic || s.bid == null || s.offer == null) continue;
    out[epic] = {
      epic,
      bid: s.bid,
      offer: s.offer,
      high: s.high ?? s.bid,
      low: s.low ?? s.bid,
      netChange: s.netChange ?? 0,
      percentageChange: s.percentageChange ?? 0,
      timestamp: s.updateTime || new Date().toISOString(),
      marketStatus: s.marketStatus || 'UNKNOWN',
    };
  }
  return out;
}

/** Search available markets by term (e.g. "GOLD", "XAU"). */
export async function searchMarkets(searchTerm: string, creds?: { identifier: string; password?: string; apiKey: string }): Promise<any[]> {
  const data = await authedFetch(`/api/v1/markets?searchTerm=${encodeURIComponent(searchTerm)}`, {}, creds);
  return data.markets || [];
}

/** Confirm the outcome of a deal by its reference. Has built-in polling retry to handle processing delay. */
export async function getDealConfirmation(dealReference: string, creds?: { identifier: string; password?: string; apiKey: string }): Promise<any> {
  const maxAttempts = 6;
  const delayMs = 1000;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await authedFetch(`/api/v1/confirms/${encodeURIComponent(dealReference)}`, {}, creds);
      return data;
    } catch (err: any) {
      lastError = err;
      const msg = err.message || String(err);
      if (msg.includes('not-found') || msg.includes('dealReference') || msg.includes('404')) {
        console.log(`[Capital.com] Deal confirmation ${dealReference} not ready yet (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs}ms...`);
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
      }
      throw err;
    }
  }
  throw lastError || new Error(`Failed to confirm deal reference ${dealReference} after ${maxAttempts} attempts`);
}

/**
 * Open a market position. Returns the deal confirmation.
 */
export async function placeMarketOrder(
  epic: string,
  direction: 'BUY' | 'SELL',
  size: number,
  stopLevel?: number,
  profitLevel?: number,
  creds?: { identifier: string; password?: string; apiKey: string }
): Promise<any> {
  const body: any = { epic, direction, size };
  if (stopLevel) body.stopLevel = stopLevel;
  if (profitLevel) body.profitLevel = profitLevel;

  const data = await authedFetch('/api/v1/positions', { method: 'POST', body }, creds);
  if (data.dealReference) {
    try {
      return await getDealConfirmation(data.dealReference, creds);
    } catch {
      return data;
    }
  }
  return data;
}

/**
 * Create a pending working order (LIMIT or STOP).
 */
export async function placeWorkingOrder(
  epic: string,
  direction: 'BUY' | 'SELL',
  size: number,
  level: number,
  type: 'LIMIT' | 'STOP' = 'LIMIT',
  stopLevel?: number,
  profitLevel?: number,
  creds?: { identifier: string; password?: string; apiKey: string }
): Promise<any> {
  const body: any = { epic, direction, size, level, type };
  if (stopLevel) body.stopLevel = stopLevel;
  if (profitLevel) body.profitLevel = profitLevel;
  return authedFetch('/api/v1/workingorders', { method: 'POST', body }, creds);
}

/** Close an open position by its deal id. */
export async function closePosition(dealId: string, creds?: { identifier: string; password?: string; apiKey: string }): Promise<any> {
  const data = await authedFetch(`/api/v1/positions/${encodeURIComponent(dealId)}`, {
    method: 'DELETE',
  }, creds);
  if (data.dealReference) {
    try {
      return await getDealConfirmation(data.dealReference, creds);
    } catch {
      return data;
    }
  }
  return data;
}

/** Partially close an open position by its deal id. */
export async function partialClosePosition(
  dealId: string,
  size: number,
  creds?: { identifier: string; password?: string; apiKey: string }
): Promise<any> {
  const data = await authedFetch(`/api/v1/positions/${encodeURIComponent(dealId)}`, {
    method: 'DELETE',
    body: { size }
  }, creds);
  if (data.dealReference) {
    try {
      return await getDealConfirmation(data.dealReference, creds);
    } catch {
      return data;
    }
  }
  return data;
}

/** Update an open position's stop loss and/or take profit. */
export async function updatePositionLimitSLTP(
  dealId: string,
  stopLevel: number | null,
  profitLevel: number | null,
  creds?: { identifier: string; password?: string; apiKey: string }
): Promise<any> {
  const body: any = {};
  if (stopLevel !== null) body.stopLevel = stopLevel;
  if (profitLevel !== null) body.profitLevel = profitLevel;
  
  const data = await authedFetch(`/api/v1/positions/${encodeURIComponent(dealId)}`, {
    method: 'PUT',
    body
  }, creds);
  
  if (data.dealReference) {
    try {
      return await getDealConfirmation(data.dealReference, creds);
    } catch {
      return data;
    }
  }
  return data;
}

/** Cancel a pending working order by its deal id. */
export async function cancelOrder(dealId: string, creds?: { identifier: string; password?: string; apiKey: string }): Promise<any> {
  return authedFetch(`/api/v1/workingorders/${encodeURIComponent(dealId)}`, { method: 'DELETE' }, creds);
}

/** Fetch historical candles for an instrument. */
export async function getHistoricalPrices(
  epic: string,
  resolution: string = 'MINUTE',
  max: number = 100,
  creds?: { identifier: string; password?: string; apiKey: string }
): Promise<any[]> {
  const data = await authedFetch(
    `/api/v1/prices/${encodeURIComponent(epic)}?resolution=${encodeURIComponent(resolution)}&max=${max}`,
    {},
    creds
  );
  return data.prices || [];
}

/** Drop the cached session (used on disconnect). */
export function disconnectCapitalCom(creds?: { identifier: string }): void {
  if (creds) {
    userSessions.delete(creds.identifier);
  } else {
    currentSession = null;
  }
  console.log('[Capital.com] Session disconnected');
}

export default {
  isConfigured,
  authenticateCapitalCom,
  getConnectedAccounts,
  getAccountDetails,
  getOpenPositions,
  getPendingOrders,
  getLivePrice,
  getMarketDetails,
  getMarketPrices,
  searchMarkets,
  getDealConfirmation,
  placeMarketOrder,
  placeWorkingOrder,
  closePosition,
  partialClosePosition,
  updatePositionLimitSLTP,
  cancelOrder,
  getHistoricalPrices,
  disconnectCapitalCom,
};
