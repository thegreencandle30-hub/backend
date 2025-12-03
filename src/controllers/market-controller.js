import marketService from '../services/market-service.js';
import { catchAsync } from '../utils/helpers.js';
import AppError from '../utils/app-error.js';

/**
 * Get all market prices
 * GET /api/market/prices
 */
export const getMarketPrices = catchAsync(async (req, res) => {
  const { refresh } = req.query;
  const forceRefresh = refresh === 'true';
  
  const data = await marketService.getMarketPrices(forceRefresh);
  
  res.status(200).json({
    status: 'success',
    data,
  });
});

/**
 * Get price for a specific commodity
 * GET /api/market/prices/:commodity
 */
export const getCommodityPrice = catchAsync(async (req, res) => {
  const { commodity } = req.params;
  
  const validCommodities = ['gold', 'silver', 'nifty', 'copper'];
  const normalizedCommodity = commodity.toLowerCase();
  
  if (!validCommodities.includes(normalizedCommodity)) {
    throw new AppError(
      `Invalid commodity. Must be one of: ${validCommodities.join(', ')}`,
      400
    );
  }
  
  const price = await marketService.getCommodityPrice(normalizedCommodity);
  
  if (!price) {
    throw new AppError('Price data not available', 503);
  }
  
  res.status(200).json({
    status: 'success',
    data: price,
  });
});

/**
 * Get market summary
 * GET /api/market/summary
 */
export const getMarketSummary = catchAsync(async (req, res) => {
  const summary = await marketService.getMarketSummary();
  
  res.status(200).json({
    status: 'success',
    data: summary,
  });
});

export default {
  getMarketPrices,
  getCommodityPrice,
  getMarketSummary,
};
