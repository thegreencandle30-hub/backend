import Joi from 'joi';

// Register and subscribe schema
export const registerSchema = Joi.object({
  fullName: Joi.string().required().messages({
    'string.empty': 'Full name is required',
    'any.required': 'Full name is required',
  }),
  mobile: Joi.string().required().pattern(/^[0-9]{10}$/).messages({
    'string.pattern.base': 'Please provide a valid 10-digit mobile number',
    'string.empty': 'Mobile number is required',
    'any.required': 'Mobile number is required',
  }),
  planId: Joi.string().required().messages({
    'any.required': 'Plan ID is required',
  }),
});

// Initiate payment schema
export const initiatePaymentSchema = Joi.object({
  planId: Joi.string().required().messages({
    'any.required': 'Plan ID is required',
  }),
});

// Payment callback schema (PhonePe webhook)
export const paymentCallbackSchema = Joi.object({
  request: Joi.string().required(),
}).unknown(true); // Allow additional fields from PhonePe

// Check status schema
export const checkStatusSchema = Joi.object({
  transactionId: Joi.string().required().messages({
    'any.required': 'Transaction ID is required',
  }),
});
