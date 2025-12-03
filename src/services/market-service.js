import env from '../config/env.js';
import logger from '../utils/logger.js';

// In-memory cache for market prices
const priceCache = {
  data: null,
  lastUpdated: null,
  ttl: (env.market?.cacheTtl || 60) * 1000, // Convert seconds to milliseconds
};

// Commodity symbols mapping for API
const COMMODITY_SYMBOLS = {
  gold: 'GOLD',
  silver: 'SILVER',
  nifty: 'NIFTY50',
  copper: 'COPPER',
};

// Fallback mock prices for development/testing
const MOCK_PRICES = {
  gold: { price: 62500.00, change: 150.00, changePercent: 0.24 },
  silver: { price: 74200.00, change: -320.00, changePercent: -0.43 },
  nifty: { price: 24580.50, change: 125.75, changePercent: 0.51 },
  copper: { price: 745.80, change: 8.20, changePercent: 1.11 },
};

/**
 * Fetch live prices from Connect Market API
 * @returns {Promise<Object>} Market prices
 */
const fetchLivePrices = async () => {
  const apiKey = env.market?.apiKey;
  const apiUrl = env.market?.apiUrl;
  
  if (!apiKey || !apiUrl) {
    logger.warn('Market API not configured, using mock prices');
    return generateMockPrices();
  }

  try {
    // Connect Market API endpoint
    // Note: Replace with actual API endpoint and parameters based on the API documentation
    const baseUrl = apiUrl;
    
    const commodities = Object.keys(COMMODITY_SYMBOLS);
    const prices = {};
    
    // Fetch prices for each commodity
    for (const commodity of commodities) {
      try {
        const symbol = COMMODITY_SYMBOLS[commodity];
        const response = await fetch(`${baseUrl}/quote/${symbol}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          logger.warn(`Failed to fetch ${commodity} price: ${response.status}`);
          prices[commodity] = MOCK_PRICES[commodity];
          continue;
        }
        
        const data = await response.json();
        
        prices[commodity] = {
          price: data.lastPrice || data.ltp || MOCK_PRICES[commodity].price,
          change: data.change || data.netChange || 0,
          changePercent: data.changePercent || data.percentChange || 0,
          high: data.high || data.dayHigh,
          low: data.low || data.dayLow,
          open: data.open || data.openPrice,
          previousClose: data.previousClose || data.prevClose,
          volume: data.volume,
          timestamp: data.timestamp || new Date().toISOString(),
        };
      } catch (error) {
        logger.warn(`Error fetching ${commodity}: ${error.message}`);
        prices[commodity] = MOCK_PRICES[commodity];
      }
    }
    
    return prices;
  } catch (error) {
    logger.error(`Market API error: ${error.message}`);
    return generateMockPrices();
  }
};

/**
 * Generate mock prices with slight variations for testing
 * @returns {Object} Mock prices
 */
const generateMockPrices = () => {
  const now = new Date().toISOString();
  const prices = {};
  
  for (const [commodity, basePrice] of Object.entries(MOCK_PRICES)) {
    // Add slight random variation (-0.5% to +0.5%)
    const variation = (Math.random() - 0.5) * 0.01;
    const price = basePrice.price * (1 + variation);
    const change = price - basePrice.price + basePrice.change;
    const changePercent = ((change / basePrice.price) * 100);
    
    prices[commodity] = {
      price: parseFloat(price.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      high: parseFloat((price * 1.01).toFixed(2)),
      low: parseFloat((price * 0.99).toFixed(2)),
      open: parseFloat((basePrice.price * 0.998).toFixed(2)),
      previousClose: parseFloat(basePrice.price.toFixed(2)),
      timestamp: now,
    };
  }
  
  return prices;
};

/**
 * Get market prices with caching
 * @param {boolean} forceRefresh - Force refresh from API
 * @returns {Promise<Object>} Market prices
 */
export const getMarketPrices = async (forceRefresh = false) => {
  const now = Date.now();
  
  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && priceCache.data && priceCache.lastUpdated) {
    const age = now - priceCache.lastUpdated;
    if (age < priceCache.ttl) {
      return {
        ...priceCache.data,
        cached: true,
        cacheAge: Math.round(age / 1000),
      };
    }
  }
  
  // Fetch fresh prices
  const prices = await fetchLivePrices();
  
  // Update cache
  priceCache.data = {
    prices,
    updatedAt: new Date().toISOString(),
  };
  priceCache.lastUpdated = now;
  
  return {
    ...priceCache.data,
    cached: false,
    cacheAge: 0,
  };
};

/**
 * Get price for a specific commodity
 * @param {string} commodity - Commodity name
 * @returns {Promise<Object>} Commodity price
 */
export const getCommodityPrice = async (commodity) => {
  const data = await getMarketPrices();
  
  const normalizedCommodity = commodity.toLowerCase();
  
  if (!data.prices[normalizedCommodity]) {
    return null;
  }
  
  return {
    commodity: normalizedCommodity,
    ...data.prices[normalizedCommodity],
    updatedAt: data.updatedAt,
  };
};

/**
 * Get market summary (all commodities)
 * @returns {Promise<Object>} Market summary
 */
export const getMarketSummary = async () => {
  const data = await getMarketPrices();
  
  const summary = {
    commodities: Object.entries(data.prices).map(([name, price]) => ({
      name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      symbol: COMMODITY_SYMBOLS[name],
      ...price,
    })),
    updatedAt: data.updatedAt,
    cached: data.cached,
  };
  
  // Calculate market sentiment
  const gainers = summary.commodities.filter(c => c.change > 0).length;
  const losers = summary.commodities.filter(c => c.change < 0).length;
  
  summary.sentiment = {
    gainers,
    losers,
    unchanged: summary.commodities.length - gainers - losers,
    overallTrend: gainers > losers ? 'bullish' : gainers < losers ? 'bearish' : 'neutral',
  };
  
  return summary;
};

/**
 * Clear price cache
 */
export const clearCache = () => {
  priceCache.data = null;
  priceCache.lastUpdated = null;
  logger.info('Market price cache cleared');
};

/**
 * Set cache TTL
 * @param {number} ttlMs - TTL in milliseconds
 */
export const setCacheTTL = (ttlMs) => {
  priceCache.ttl = ttlMs;
  logger.info(`Market price cache TTL set to ${ttlMs}ms`);
};

export default {
  getMarketPrices,
  getCommodityPrice,
  getMarketSummary,
  clearCache,
  setCacheTTL,
};
