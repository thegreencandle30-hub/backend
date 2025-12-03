import Joi from 'joi';

// Initiate payment schema
export const initiatePaymentSchema = Joi.object({
  plan: Joi.string()
    .valid('daily', 'weekly')
    .required()
    .messages({
      'any.only': 'Plan must be either daily or weekly',
      'any.required': 'Plan is required',
    }),
});

// Payment callback schema (PhonePe webhook)
export const paymentCallbackSchema = Joi.object({
  response: Joi.string().required(),
}).unknown(true); // Allow additional fields from PhonePe

// Check status schema
export const checkStatusSchema = Joi.object({
  transactionId: Joi.string().required().messages({
    'any.required': 'Transaction ID is required',
  }),
});
