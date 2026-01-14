import Joi from 'joi';

export const createPlanSchema = Joi.object({
  name: Joi.string().required().trim().messages({
    'string.empty': 'Plan name is required',
    'any.required': 'Plan name is required',
  }),
  tier: Joi.string().valid('Regular', 'Premium', 'International').required().messages({
    'any.only': 'Tier must be one of Regular, Premium, or International',
    'any.required': 'Plan tier is required',
  }),
  durationDays: Joi.number().integer().min(1).required().messages({
    'number.base': 'Duration must be a number',
    'number.min': 'Duration must be at least 1 day',
    'any.required': 'Duration in days is required',
  }),
  durationLabel: Joi.string().required().trim().messages({
    'string.empty': 'Duration label is required',
    'any.required': 'Duration label is required',
  }),
  price: Joi.number().min(0).required().messages({
    'number.base': 'Price must be a number',
    'number.min': 'Price cannot be negative',
    'any.required': 'Plan price is required',
  }),
  currency: Joi.string().valid('INR', 'USD').default('INR'),
  maxTargetsVisible: Joi.number().integer().min(1).required().messages({
    'number.base': 'Targets visible must be a number',
    'number.min': 'At least 1 target must be visible',
    'any.required': 'Number of targets visible is required',
  }),
  reminderHours: Joi.number().integer().min(0).required().messages({
    'number.base': 'Reminder hours must be a number',
    'any.required': 'Reminder hours is required',
  }),
  isActive: Joi.boolean().default(true),
});

export const updatePlanSchema = Joi.object({
  name: Joi.string().trim(),
  tier: Joi.string().valid('Regular', 'Premium', 'International'),
  durationDays: Joi.number().integer().min(1),
  durationLabel: Joi.string().trim(),
  price: Joi.number().min(0),
  currency: Joi.string().valid('INR', 'USD'),
  maxTargetsVisible: Joi.number().integer().min(1),
  reminderHours: Joi.number().integer().min(0),
  isActive: Joi.boolean(),
}).min(1); // At least one field should be provided for update
