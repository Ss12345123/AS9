/**
 * Capital.com trading API routes.
 *
 * These endpoints back the terminal's trading features using the user's
 * connected Capital.com account, stored securely in the local database.
 * They are protected by verifyAuth JWT middleware.
 */
import express from 'express';
import * as capitalcom from '../lib/capitalcom';
import * as db from '../lib/database';
import { verifyToken } from '../lib/security';

const router = express.Router();

function verifyAuth(req: any, res: any, next: Function) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^[Bb]earer\s+/, '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.id;
    req.userEmail = payload.email;
    next();
  } catch (error: any) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function handleError(res: express.Response, error: any) {
  const message = error?.message || 'Capital.com request failed';
  const notConfigured = /not configured/i.test(message) || /credentials not found/i.test(message);
  return res.status(notConfigured ? 503 : 502).json({ error: message, configured: !notConfigured });
}

/**
 * Maps standard lot sizes used in the frontend to Capital.com contract sizes.
 * For EURUSD, 1 lot = 100,000 contract units. Minimum lot size is 0.01 (1,000 units).
 * For XAUUSD, 1 lot = 1 ounce. Minimum contract size is 0.10.
 * For index / crypto assets, handles similar minimums.
 */
function convertLotToBrokerSize(epic: string, lotSize: number, contractSize?: number): number {
  if (contractSize) {
    return lotSize * contractSize;
  }
  const normalizedEpic = (epic || '').toUpperCase();
  
  if (normalizedEpic.includes('EURUSD')) {
    // 1 standard lot = 100,000 contract units in Forex CFDs
    return lotSize * 100000;
  }
  
  if (normalizedEpic.includes('GOLD') || normalizedEpic.includes('XAUUSD')) {
    // Fallback contract size of Gold (100 ounces)
    return lotSize * 100;
  }
  
  if (normalizedEpic.includes('US100') || normalizedEpic.includes('NAS100')) {
    return lotSize;
  }
  
  if (normalizedEpic.includes('ETHUSD')) {
    return lotSize;
  }
  
  if (normalizedEpic.includes('BTCUSD')) {
    return lotSize;
  }
  
  return lotSize;
}

function parseDecimalPlaces(numStr: string): number {
  const match = numStr.match(/\.(\d+)/);
  return match ? match[1].length : 2;
}

/** Link user's Capital.com broker account securely */
router.post('/api/capital/connect', verifyAuth, async (req: any, res) => {
  const { identifier, password, apiKey, isDemo } = req.body || {};
  if (!identifier || !password || !apiKey) {
    return res.status(400).json({ error: 'identifier, password, and apiKey are required' });
  }

  const isDemoAccount = typeof isDemo === 'boolean' ? isDemo : true;

  try {
    // Validate credentials by attempting active authentication
    const creds = { identifier, password, apiKey, isDemo: isDemoAccount };
    await capitalcom.authenticateCapitalCom(true, creds);

    // Persist securely encrypted
    db.storeCapitalComCredentials(req.userId, identifier, password, apiKey, isDemoAccount);
    return res.json({ success: true, message: 'Capital.com connected successfully' });
  } catch (err: any) {
    console.error('[Capital.com Connect Error]', err.message);
    return res.status(400).json({ error: err.message || 'Failed to authenticate credentials with Capital.com' });
  }
});

/** Unlink user's Capital.com broker account */
router.post('/api/capital/disconnect', verifyAuth, async (req: any, res) => {
  try {
    const creds = db.getCapitalComCredentials(req.userId);
    if (creds) {
      capitalcom.disconnectCapitalCom({ identifier: creds.identifier });
    }
    db.deleteCapitalComCredentials(req.userId);
    return res.json({ success: true, message: 'Capital.com disconnected successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to disconnect Capital.com credentials' });
  }
});

/** Whether the user's Capital.com credentials are present + reachable. */
router.get('/api/capital/status', verifyAuth, async (req: any, res) => {
  const force = req.query.force === 'true';
  const creds = db.getCapitalComCredentials(req.userId);
  if (!creds || !capitalcom.isConfigured(creds)) {
    return res.json({ configured: false, connected: false });
  }
  try {
    if (force) {
      await capitalcom.authenticateCapitalCom(true, creds);
    }
    await capitalcom.getConnectedAccounts(creds);
    return res.json({ configured: true, connected: true });
  } catch (error: any) {
    return res.json({ configured: true, connected: false, error: error.message });
  }
});

/** Consolidated snapshot: preferred account + open positions + pending orders. */
router.get('/api/capital/portfolio', verifyAuth, async (req: any, res) => {
  const creds = db.getCapitalComCredentials(req.userId);
  if (!creds || !capitalcom.isConfigured(creds)) {
    return res.status(503).json({ error: 'Capital.com credentials not found for this user', configured: false });
  }

  try {
    const [accounts, positions, orders] = await Promise.all([
      capitalcom.getConnectedAccounts(creds),
      capitalcom.getOpenPositions(creds),
      capitalcom.getPendingOrders(creds).catch(() => []),
    ]);
    const account = accounts.find((a) => a.preferred) || accounts[0] || null;
    res.json({ account, accounts, positions, orders });
  } catch (error: any) {
    handleError(res, error);
  }
});

router.get('/api/capital/accounts', verifyAuth, async (req: any, res) => {
  const creds = db.getCapitalComCredentials(req.userId);
  if (!creds || !capitalcom.isConfigured(creds)) {
    return res.status(503).json({ error: 'Capital.com credentials not found for this user', configured: false });
  }
  try {
    res.json({ accounts: await capitalcom.getConnectedAccounts(creds) });
  } catch (error: any) {
    handleError(res, error);
  }
});

router.get('/api/capital/positions', verifyAuth, async (req: any, res) => {
  const creds = db.getCapitalComCredentials(req.userId);
  if (!creds || !capitalcom.isConfigured(creds)) {
    return res.status(503).json({ error: 'Capital.com credentials not found for this user', configured: false });
  }
  try {
    res.json({ positions: await capitalcom.getOpenPositions(creds) });
  } catch (error: any) {
    handleError(res, error);
  }
});

router.get('/api/capital/orders', verifyAuth, async (req: any, res) => {
  const creds = db.getCapitalComCredentials(req.userId);
  if (!creds || !capitalcom.isConfigured(creds)) {
    return res.status(503).json({ error: 'Capital.com credentials not found for this user', configured: false });
  }
  try {
    res.json({ orders: await capitalcom.getPendingOrders(creds) });
  } catch (error: any) {
    handleError(res, error);
  }
});

router.get('/api/capital/price/:epic', verifyAuth, async (req: any, res) => {
  const creds = db.getCapitalComCredentials(req.userId);
  if (!creds || !capitalcom.isConfigured(creds)) {
    return res.status(503).json({ error: 'Capital.com credentials not found for this user', configured: false });
  }
  try {
    res.json({ price: await capitalcom.getLivePrice(req.params.epic, creds) });
  } catch (error: any) {
    handleError(res, error);
  }
});

router.get('/api/capital/instrument/:epic', verifyAuth, async (req: any, res) => {
  const creds = db.getCapitalComCredentials(req.userId);
  if (!creds || !capitalcom.isConfigured(creds)) {
    return res.status(503).json({ error: 'Capital.com credentials not found for this user', configured: false });
  }
  try {
    const details = await capitalcom.getMarketDetails(req.params.epic, creds);
    res.json(details);
  } catch (error: any) {
    handleError(res, error);
  }
});

router.get('/api/capital/markets', verifyAuth, async (req: any, res) => {
  const creds = db.getCapitalComCredentials(req.userId);
  if (!creds || !capitalcom.isConfigured(creds)) {
    return res.status(503).json({ error: 'Capital.com credentials not found for this user', configured: false });
  }
  try {
    const search = String(req.query.search || req.query.searchTerm || '');
    if (!search) return res.status(400).json({ error: 'search term required' });
    res.json({ markets: await capitalcom.searchMarkets(search, creds) });
  } catch (error: any) {
    handleError(res, error);
  }
});

router.get('/api/capital/history/:epic', verifyAuth, async (req: any, res) => {
  const creds = db.getCapitalComCredentials(req.userId);
  if (!creds || !capitalcom.isConfigured(creds)) {
    return res.status(503).json({ error: 'Capital.com credentials not found for this user', configured: false });
  }
  try {
    const resolution = String(req.query.resolution || 'MINUTE');
    const max = Number(req.query.max || 100);
    res.json({ prices: await capitalcom.getHistoricalPrices(req.params.epic, resolution, max, creds) });
  } catch (error: any) {
    handleError(res, error);
  }
});

router.post('/api/capital/order', verifyAuth, async (req: any, res) => {
  const creds = db.getCapitalComCredentials(req.userId);
  if (!creds || !capitalcom.isConfigured(creds)) {
    return res.status(503).json({ error: 'Capital.com credentials not found for this user', configured: false });
  }
  try {
    const { epic, direction, size, stopLevel, profitLevel } = req.body || {};
    if (!epic || !direction || !size) {
      return res.status(400).json({ error: 'epic, direction and size are required' });
    }

    // Dynamic market/instrument details lookup for verification & sizing
    let contractSize = 1;
    try {
      const details = await capitalcom.getMarketDetails(epic, creds);
      if (details?.instrument?.lotSize) {
        contractSize = details.instrument.lotSize;
      } else {
        const normalizedEpic = epic.toUpperCase();
        if (normalizedEpic.includes('EURUSD') || normalizedEpic.includes('GBPUSD') || normalizedEpic.includes('AUDUSD')) {
          contractSize = 100000;
        } else if (normalizedEpic.includes('GOLD') || normalizedEpic.includes('XAUUSD')) {
          contractSize = 100;
        }
      }
    } catch (e) {
      console.error('Failed to fetch live contract specifications from Capital.com, using fallbacks:', e);
      const normalizedEpic = epic.toUpperCase();
      if (normalizedEpic.includes('EURUSD') || normalizedEpic.includes('GBPUSD') || normalizedEpic.includes('AUDUSD')) {
        contractSize = 100000;
      } else if (normalizedEpic.includes('GOLD') || normalizedEpic.includes('XAUUSD')) {
        contractSize = 100;
      }
    }

    const brokerSize = convertLotToBrokerSize(epic, Number(size), contractSize);

    let currentStopLevel = stopLevel ? Number(stopLevel) : undefined;
    let currentProfitLevel = profitLevel ? Number(profitLevel) : undefined;
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      try {
        const result = await capitalcom.placeMarketOrder(epic, direction, brokerSize, currentStopLevel, currentProfitLevel, creds);
        return res.json({ success: true, result });
      } catch (error: any) {
        lastError = error;
        const errMsg = error.message || String(error);
        let adjusted = false;

        const tpMatch = errMsg.match(/error\.invalid\.takeprofit\.(minvalue|maxvalue):\s*([\d.]+)/i);
        if (tpMatch && currentProfitLevel != null) {
          const constraint = tpMatch[1].toLowerCase();
          const numStr = tpMatch[2];
          const val = parseFloat(numStr);
          if (!isNaN(val)) {
            const decimals = parseDecimalPlaces(numStr);
            const tick = Math.pow(10, -decimals);
            if (constraint === 'minvalue') {
              currentProfitLevel = parseFloat((val + tick).toFixed(decimals));
            } else {
              currentProfitLevel = parseFloat((val - tick).toFixed(decimals));
            }
            adjusted = true;
          }
        }

        const slMatch = errMsg.match(/error\.invalid\.stoploss\.(minvalue|maxvalue):\s*([\d.]+)/i);
        if (slMatch && currentStopLevel != null) {
          const constraint = slMatch[1].toLowerCase();
          const numStr = slMatch[2];
          const val = parseFloat(numStr);
          if (!isNaN(val)) {
            const decimals = parseDecimalPlaces(numStr);
            const tick = Math.pow(10, -decimals);
            if (constraint === 'minvalue') {
              currentStopLevel = parseFloat((val + tick).toFixed(decimals));
            } else {
              currentStopLevel = parseFloat((val - tick).toFixed(decimals));
            }
            adjusted = true;
          }
        }

        if (!adjusted) {
          throw error;
        }

        attempts++;
      }
    }

    throw lastError;
  } catch (error: any) {
    handleError(res, error);
  }
});

router.post('/api/capital/working-order', verifyAuth, async (req: any, res) => {
  const creds = db.getCapitalComCredentials(req.userId);
  if (!creds || !capitalcom.isConfigured(creds)) {
    return res.status(503).json({ error: 'Capital.com credentials not found for this user', configured: false });
  }
  try {
    const { epic, direction, size, level, type, stopLevel, profitLevel } = req.body || {};
    if (!epic || !direction || !size || !level) {
      return res.status(400).json({ error: 'epic, direction, size and level are required' });
    }

    // Dynamic market/instrument details lookup for verification & sizing
    let contractSize = 1;
    try {
      const details = await capitalcom.getMarketDetails(epic, creds);
      if (details?.instrument?.lotSize) {
        contractSize = details.instrument.lotSize;
      } else {
        const normalizedEpic = epic.toUpperCase();
        if (normalizedEpic.includes('EURUSD') || normalizedEpic.includes('GBPUSD') || normalizedEpic.includes('AUDUSD')) {
          contractSize = 100000;
        } else if (normalizedEpic.includes('GOLD') || normalizedEpic.includes('XAUUSD')) {
          contractSize = 100;
        }
      }
    } catch (e) {
      console.error('Failed to fetch live contract specifications from Capital.com, using fallbacks:', e);
      const normalizedEpic = epic.toUpperCase();
      if (normalizedEpic.includes('EURUSD') || normalizedEpic.includes('GBPUSD') || normalizedEpic.includes('AUDUSD')) {
        contractSize = 100000;
      } else if (normalizedEpic.includes('GOLD') || normalizedEpic.includes('XAUUSD')) {
        contractSize = 100;
      }
    }

    const brokerSize = convertLotToBrokerSize(epic, Number(size), contractSize);

    let currentStopLevel = stopLevel ? Number(stopLevel) : undefined;
    let currentProfitLevel = profitLevel ? Number(profitLevel) : undefined;
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      try {
        const result = await capitalcom.placeWorkingOrder(
          epic,
          direction,
          brokerSize,
          Number(level),
          type,
          currentStopLevel,
          currentProfitLevel,
          creds
        );
        return res.json({ success: true, result });
      } catch (error: any) {
        lastError = error;
        const errMsg = error.message || String(error);
        let adjusted = false;

        const tpMatch = errMsg.match(/error\.invalid\.takeprofit\.(minvalue|maxvalue):\s*([\d.]+)/i);
        if (tpMatch && currentProfitLevel != null) {
          const constraint = tpMatch[1].toLowerCase();
          const numStr = tpMatch[2];
          const val = parseFloat(numStr);
          if (!isNaN(val)) {
            const decimals = parseDecimalPlaces(numStr);
            const tick = Math.pow(10, -decimals);
            if (constraint === 'minvalue') {
              currentProfitLevel = parseFloat((val + tick).toFixed(decimals));
            } else {
              currentProfitLevel = parseFloat((val - tick).toFixed(decimals));
            }
            adjusted = true;
          }
        }

        const slMatch = errMsg.match(/error\.invalid\.stoploss\.(minvalue|maxvalue):\s*([\d.]+)/i);
        if (slMatch && currentStopLevel != null) {
          const constraint = slMatch[1].toLowerCase();
          const numStr = slMatch[2];
          const val = parseFloat(numStr);
          if (!isNaN(val)) {
            const decimals = parseDecimalPlaces(numStr);
            const tick = Math.pow(10, -decimals);
            if (constraint === 'minvalue') {
              currentStopLevel = parseFloat((val + tick).toFixed(decimals));
            } else {
              currentStopLevel = parseFloat((val - tick).toFixed(decimals));
            }
            adjusted = true;
          }
        }

        if (!adjusted) {
          throw error;
        }

        attempts++;
      }
    }

    throw lastError;
  } catch (error: any) {
    handleError(res, error);
  }
});

router.delete('/api/capital/position/:dealId', verifyAuth, async (req: any, res) => {
  const creds = db.getCapitalComCredentials(req.userId);
  if (!creds || !capitalcom.isConfigured(creds)) {
    return res.status(503).json({ error: 'Capital.com credentials not found for this user', configured: false });
  }
  try {
    res.json({ success: true, result: await capitalcom.closePosition(req.params.dealId, creds) });
  } catch (error: any) {
    handleError(res, error);
  }
});

router.delete('/api/capital/order/:dealId', verifyAuth, async (req: any, res) => {
  const creds = db.getCapitalComCredentials(req.userId);
  if (!creds || !capitalcom.isConfigured(creds)) {
    return res.status(503).json({ error: 'Capital.com credentials not found for this user', configured: false });
  }
  try {
    res.json({ success: true, result: await capitalcom.cancelOrder(req.params.dealId, creds) });
  } catch (error: any) {
    handleError(res, error);
  }
});

export default router;
