import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Global rate limiter - applies to all requests
 * 100 requests per 15 minutes per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.nodeEnv === 'development' ? 1000 : 100,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

/**
 * Strict rate limiter for auth endpoints
 * 10 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.nodeEnv === 'development' ? 100 : 10,
  message: {
    status: 'fail',
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}, endpoint: ${req.originalUrl}`);
    res.status(429).json(options.message);
  },
});

/**
 * Rate limiter for payment endpoints
 * 5 requests per minute per IP
 */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.nodeEnv === 'development' ? 50 : 5,
  message: {
    status: 'fail',
    message: 'Too many payment requests, please wait before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Payment rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

/**
 * Rate limiter for notification endpoints
 * 10 requests per minute per IP
 */
export const notificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.nodeEnv === 'development' ? 100 : 10,
  message: {
    status: 'fail',
    message: 'Too many notification requests, please wait.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for API calls endpoints (for mobile app users)
 * 60 requests per minute per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.nodeEnv === 'development' ? 500 : 60,
  message: {
    status: 'fail',
    message: 'Too many requests, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * HTTP Parameter Pollution protection
 * Prevents duplicate query parameters attack
 */
export const hppProtection = hpp({
  whitelist: [
    // Allow certain query params to be arrays
    'commodity',
    'status',
    'type',
  ],
});

/**
 * MongoDB query injection prevention
 * Removes $ and . from request body, query, and params
 */
export const mongoSanitization = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`Attempted NoSQL injection blocked: ${key} from IP: ${req.ip}`);
  },
});

/**
 * XSS sanitization middleware
 * Recursively sanitizes strings in request body
 */
export const xssSanitizer = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

/**
 * Recursively sanitize an object's string values
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }
  return sanitized;
};

/**
 * Sanitize a string value
 * @param {any} value - Value to sanitize
 * @returns {any} Sanitized value
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Remove or escape potentially dangerous characters
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#96;');
};

/**
 * Security headers middleware using Helmet configuration
 */
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding resources
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
};

export default {
  globalLimiter,
  authLimiter,
  paymentLimiter,
  notificationLimiter,
  apiLimiter,
  hppProtection,
  mongoSanitization,
  xssSanitizer,
  helmetConfig,
};
