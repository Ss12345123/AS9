/**
 * Twelve Data API Integration Service
 * Provides real-time market prices and historical data
 * Official API: https://twelvedata.com
 */

import config from '../config';

const TWELVE_DATA_API_KEY = config.twelveDataApiKey;
const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';

interface MarketPrice {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
  previous_close: number;
  timestamp: string;
  market_status: string;
}

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  trend: 'up' | 'down' | 'neutral';
  marketStatus: 'open' | 'closed' | 'pre-market';
  lastUpdated: string;
  source: 'TWELVEDATA';
}

interface TechnicalIndicator {
  symbol: string;
  timeframe: string;
  indicator: string;
  values: any[];
  timestamp: string;
}

// Cache for API responses
let priceCache: Map<string, { data: MarketPrice; timestamp: number }> = new Map();
const CACHE_DURATION = 15000; // 15 seconds

/**
 * Get live market price for a symbol
 */
export async function getLivePrice(symbol: string): Promise<MarketData> {
  try {
    // Check cache first
    const cached = priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return formatPriceData(cached.data);
    }

    if (!TWELVE_DATA_API_KEY) {
      throw new Error('TWELVE_DATA_API_KEY is not configured');
    }

    const response = await fetch(
      `${TWELVE_DATA_BASE_URL}/quote?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const data: any = await response.json();

    if (data.status === 'error') {
      throw new Error(`${data.code}: ${data.message}`);
    }

    // Cache the response
    priceCache.set(symbol, { data, timestamp: Date.now() });

    return formatPriceData(data);
  } catch (error: any) {
    console.error('[Twelve Data] Price fetch error:', error.message);
    throw error;
  }
}

/**
 * Get multiple prices in one request
 */
export async function getMultiplePrices(symbols: string[]): Promise<MarketData[]> {
  try {
    const symbolString = symbols.join(',');

    if (!TWELVE_DATA_API_KEY) {
      throw new Error('TWELVE_DATA_API_KEY is not configured');
    }

    const response = await fetch(
      `${TWELVE_DATA_BASE_URL}/quote?symbol=${symbolString}&apikey=${TWELVE_DATA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const data: any = await response.json();

    if (data.status === 'error') {
      throw new Error(`${data.code}: ${data.message}`);
    }

    // Cache all responses
    const results: MarketData[] = [];
    for (const symbol of symbols) {
      if (data[symbol]) {
        priceCache.set(symbol, { data: data[symbol], timestamp: Date.now() });
        results.push(formatPriceData(data[symbol]));
      }
    }

    return results;
  } catch (error: any) {
    console.error('[Twelve Data] Multiple prices fetch error:', error.message);
    throw error;
  }
}

/**
 * Get quote data with extended information
 */
export async function getQuote(symbol: string): Promise<any> {
  try {
    if (!TWELVE_DATA_API_KEY) {
      throw new Error('TWELVE_DATA_API_KEY is not configured');
    }

    const response = await fetch(
      `${TWELVE_DATA_BASE_URL}/quote?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const data: any = await response.json();

    if (data.status === 'error') {
      throw new Error(`${data.code}: ${data.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('[Twelve Data] Quote fetch error:', error.message);
    throw error;
  }
}

/**
 * Get OHLC (Open, High, Low, Close) candle data
 */
export async function getCandles(
  symbol: string,
  timeframe: string = '1h',
  limit: number = 100
): Promise<any[]> {
  try {
    if (!TWELVE_DATA_API_KEY) {
      throw new Error('TWELVE_DATA_API_KEY is not configured');
    }

    const response = await fetch(
      `${TWELVE_DATA_BASE_URL}/time_series?symbol=${symbol}&interval=${timeframe}&apikey=${TWELVE_DATA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const data: any = await response.json();

    if (data.status === 'error') {
      throw new Error(`${data.code}: ${data.message}`);
    }

    return data.values || [];
  } catch (error: any) {
    console.error('[Twelve Data] Candles fetch error:', error.message);
    throw error;
  }
}

/**
 * Get technical indicator values
 */
export async function getTechnicalIndicator(
  symbol: string,
  indicator: string,
  timeframe: string = '1h'
): Promise<TechnicalIndicator> {
  try {
    if (!TWELVE_DATA_API_KEY) {
      throw new Error('TWELVE_DATA_API_KEY is not configured');
    }

    // Map common indicator names to Twelve Data parameters
    const indicatorMap: Record<string, string> = {
      RSI: 'rsi',
      MACD: 'macd',
      EMA: 'ema',
      SMA: 'sma',
      BBands: 'bbands',
      ATR: 'atr',
      ADX: 'adx',
      STOCH: 'stoch',
    };

    const apiIndicator = indicatorMap[indicator] || indicator.toLowerCase();

    const response = await fetch(
      `${TWELVE_DATA_BASE_URL}/${apiIndicator}?symbol=${symbol}&interval=${timeframe}&apikey=${TWELVE_DATA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const data: any = await response.json();

    if (data.status === 'error') {
      throw new Error(`${data.code}: ${data.message}`);
    }

    return {
      symbol,
      timeframe,
      indicator,
      values: data.values || [],
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[Twelve Data] Indicator fetch error:', error.message);
    throw error;
  }
}

/**
 * Get earnings data
 */
export async function getEarnings(symbol: string): Promise<any> {
  try {
    if (!TWELVE_DATA_API_KEY) {
      throw new Error('TWELVE_DATA_API_KEY is not configured');
    }

    const response = await fetch(
      `${TWELVE_DATA_BASE_URL}/earnings?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const data: any = await response.json();

    if (data.status === 'error') {
      throw new Error(`${data.code}: ${data.message}`);
    }

    return data;
  } catch (error: any) {
    console.error('[Twelve Data] Earnings fetch error:', error.message);
    throw error;
  }
}

/**
 * Get economic calendar events
 */
export async function getEconomicCalendar(
  countryCode?: string,
  impact?: 'high' | 'medium' | 'low'
): Promise<any[]> {
  try {
    if (!TWELVE_DATA_API_KEY) {
      throw new Error('TWELVE_DATA_API_KEY is not configured');
    }

    let url = `${TWELVE_DATA_BASE_URL}/calendar?apikey=${TWELVE_DATA_API_KEY}`;
    if (countryCode) url += `&country=${countryCode}`;
    if (impact) url += `&impact=${impact}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const data: any = await response.json();

    if (data.status === 'error') {
      throw new Error(`${data.code}: ${data.message}`);
    }

    return data.data || [];
  } catch (error: any) {
    console.error('[Twelve Data] Economic calendar fetch error:', error.message);
    throw error;
  }
}

/**
 * Format raw Twelve Data response to standardized format
 */
function formatPriceData(data: any): MarketData {
  const price = parseFloat(data.price || data.close || '0');
  const previousClose = parseFloat(data.previous_close || data.open || '0') || price;
  const change24h = data.change !== undefined ? parseFloat(data.change) : (price - previousClose);
  const changePercent24h = data.percent_change !== undefined ? parseFloat(data.percent_change) : (previousClose !== 0 ? ((change24h / previousClose) * 100) : 0);

  return {
    symbol: data.symbol || '',
    price,
    change24h: isNaN(change24h) ? 0 : parseFloat(change24h.toFixed(2)),
    changePercent24h: isNaN(changePercent24h) ? 0 : parseFloat(changePercent24h.toFixed(2)),
    high: parseFloat(data.high || price),
    low: parseFloat(data.low || price),
    open: parseFloat(data.open || price),
    volume: parseInt(data.volume || '0') || 0,
    trend: change24h > 0 ? 'up' : change24h < 0 ? 'down' : 'neutral',
    marketStatus: (data.is_market_open === true || data.market_status === 'open') ? 'open' : 'closed',
    lastUpdated: new Date().toISOString(),
    source: 'TWELVEDATA',
  };
}

/**
 * Clear price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
  console.log('[Twelve Data] Price cache cleared');
}

/**
 * Get cache info
 */
export function getCacheInfo(): { size: number; symbols: string[] } {
  return {
    size: priceCache.size,
    symbols: Array.from(priceCache.keys()),
  };
}

export default {
  getLivePrice,
  getMultiplePrices,
  getQuote,
  getCandles,
  getTechnicalIndicator,
  getEarnings,
  getEconomicCalendar,
  clearPriceCache,
  getCacheInfo,
};