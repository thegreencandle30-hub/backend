import Joi from 'joi';

export const sendNotificationSchema = Joi.object({
  title: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'Title is required',
    'string.max': 'Title must be less than 100 characters',
  }),
  body: Joi.string().min(1).max(500).required().messages({
    'string.empty': 'Body is required',
    'string.max': 'Body must be less than 500 characters',
  }),
  targetAudience: Joi.string().valid('all', 'subscribers').default('subscribers').messages({
    'any.only': 'Target audience must be either "all" or "subscribers"',
  }),
  data: Joi.object().optional(),
});

export const sendToUserSchema = Joi.object({
  title: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'Title is required',
    'string.max': 'Title must be less than 100 characters',
  }),
  body: Joi.string().min(1).max(500).required().messages({
    'string.empty': 'Body is required',
    'string.max': 'Body must be less than 500 characters',
  }),
  data: Joi.object().optional(),
});

export const testNotificationSchema = Joi.object({
  fcmToken: Joi.string().required().messages({
    'string.empty': 'FCM token is required',
  }),
});

export default {
  sendNotificationSchema,
  sendToUserSchema,
  testNotificationSchema,
};
