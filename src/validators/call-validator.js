import Joi from 'joi';

// Create call schema
export const createCallSchema = Joi.object({
  commodity: Joi.string()
    .valid('gold', 'silver', 'nifty', 'copper')
    .required()
    .messages({
      'any.only': 'Commodity must be one of: gold, silver, nifty, copper',
      'any.required': 'Commodity is required',
    }),
  type: Joi.string()
    .valid('buy', 'sell')
    .required()
    .messages({
      'any.only': 'Type must be either buy or sell',
      'any.required': 'Type is required',
    }),
  entryPrice: Joi.number()
    .positive()
    .required()
    .messages({
      'number.positive': 'Entry price must be a positive number',
      'any.required': 'Entry price is required',
    }),
  target: Joi.number()
    .positive()
    .required()
    .messages({
      'number.positive': 'Target must be a positive number',
      'any.required': 'Target is required',
    }),
  stopLoss: Joi.number()
    .positive()
    .required()
    .messages({
      'number.positive': 'Stop loss must be a positive number',
      'any.required': 'Stop loss is required',
    }),
  date: Joi.date()
    .required()
    .messages({
      'date.base': 'Invalid date format',
      'any.required': 'Date is required',
    }),
  status: Joi.string()
    .valid('active', 'hit_target', 'hit_stoploss', 'expired')
    .default('active'),
});

// Update call schema
export const updateCallSchema = Joi.object({
  commodity: Joi.string()
    .valid('gold', 'silver', 'nifty', 'copper')
    .messages({
      'any.only': 'Commodity must be one of: gold, silver, nifty, copper',
    }),
  type: Joi.string()
    .valid('buy', 'sell')
    .messages({
      'any.only': 'Type must be either buy or sell',
    }),
  entryPrice: Joi.number()
    .positive()
    .messages({
      'number.positive': 'Entry price must be a positive number',
    }),
  target: Joi.number()
    .positive()
    .messages({
      'number.positive': 'Target must be a positive number',
    }),
  stopLoss: Joi.number()
    .positive()
    .messages({
      'number.positive': 'Stop loss must be a positive number',
    }),
  date: Joi.date()
    .messages({
      'date.base': 'Invalid date format',
    }),
  status: Joi.string()
    .valid('active', 'hit_target', 'hit_stoploss', 'expired')
    .messages({
      'any.only': 'Status must be one of: active, hit_target, hit_stoploss, expired',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// Call list query schema
export const callListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  commodity: Joi.string().valid('gold', 'silver', 'nifty', 'copper'),
  status: Joi.string().valid('active', 'hit_target', 'hit_stoploss', 'expired'),
  type: Joi.string().valid('buy', 'sell'),
  startDate: Joi.date(),
  endDate: Joi.date(),
  sortBy: Joi.string().valid('date', 'createdAt', 'commodity', 'status').default('date'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});
