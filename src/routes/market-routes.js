import { Router } from 'express';
import marketController from '../controllers/market-controller.js';

const router = Router();

// All market routes are public (no authentication required)

/**
 * GET /api/market/prices
 * Get all market prices
 * Query: ?refresh=true to force refresh from API
 */
router.get('/prices', marketController.getMarketPrices);

/**
 * GET /api/market/prices/:commodity
 * Get price for a specific commodity
 * Params: commodity (gold, silver, nifty, copper)
 */
router.get('/prices/:commodity', marketController.getCommodityPrice);

/**
 * GET /api/market/summary
 * Get market summary with sentiment analysis
 */
router.get('/summary', marketController.getMarketSummary);

export default router;
