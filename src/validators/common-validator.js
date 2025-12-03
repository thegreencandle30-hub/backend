import Joi from 'joi';

/**
 * Common validation patterns and schemas
 */

// MongoDB ObjectId pattern
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

// Phone number pattern (Indian format)
const PHONE_PATTERN = /^[6-9]\d{9}$/;

// Strong password pattern (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

/**
 * MongoDB ObjectId validation
 */
export const objectId = () => 
  Joi.string()
    .pattern(OBJECT_ID_PATTERN)
    .messages({
      'string.pattern.base': 'Invalid ID format. Must be a valid MongoDB ObjectId.',
    });

/**
 * Indian phone number validation
 */
export const phoneNumber = () =>
  Joi.string()
    .pattern(PHONE_PATTERN)
    .messages({
      'string.pattern.base': 'Invalid phone number. Must be a valid 10-digit Indian mobile number.',
    });

/**
 * Email validation
 */
export const email = () =>
  Joi.string()
    .email()
    .lowercase()
    .trim()
    .max(255)
    .messages({
      'string.email': 'Invalid email address.',
      'string.max': 'Email cannot exceed 255 characters.',
    });

/**
 * Strong password validation
 */
export const strongPassword = () =>
  Joi.string()
    .min(8)
    .max(128)
    .pattern(STRONG_PASSWORD_PATTERN)
    .messages({
      'string.min': 'Password must be at least 8 characters.',
      'string.max': 'Password cannot exceed 128 characters.',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
    });

/**
 * Simple password (for admin - less strict)
 */
export const simplePassword = () =>
  Joi.string()
    .min(6)
    .max(128)
    .messages({
      'string.min': 'Password must be at least 6 characters.',
      'string.max': 'Password cannot exceed 128 characters.',
    });

/**
 * Positive number validation
 */
export const positiveNumber = () =>
  Joi.number()
    .positive()
    .messages({
      'number.positive': 'Value must be a positive number.',
    });

/**
 * Price validation (for commodity prices)
 */
export const price = () =>
  Joi.number()
    .positive()
    .precision(2)
    .max(10000000) // 1 crore max
    .messages({
      'number.positive': 'Price must be a positive number.',
      'number.max': 'Price cannot exceed 1,00,00,000.',
    });

/**
 * Pagination page number
 */
export const page = () =>
  Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page must be at least 1.',
    });

/**
 * Pagination limit
 */
export const limit = () =>
  Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1.',
      'number.max': 'Limit cannot exceed 100.',
    });

/**
 * Safe string (trimmed, no special chars that could be used for injection)
 */
export const safeString = (maxLength = 255) =>
  Joi.string()
    .trim()
    .max(maxLength)
    .pattern(/^[a-zA-Z0-9\s\-_.,!?@#$%&*()+=:;'"]+$/)
    .messages({
      'string.max': `Text cannot exceed ${maxLength} characters.`,
      'string.pattern.base': 'Text contains invalid characters.',
    });

/**
 * Date validation (accepts ISO string or Date object)
 */
export const dateField = () =>
  Joi.date()
    .iso()
    .messages({
      'date.base': 'Invalid date format.',
      'date.format': 'Date must be in ISO 8601 format.',
    });

/**
 * Future date validation
 */
export const futureDate = () =>
  Joi.date()
    .iso()
    .min('now')
    .messages({
      'date.min': 'Date must be in the future.',
    });

/**
 * Past date validation
 */
export const pastDate = () =>
  Joi.date()
    .iso()
    .max('now')
    .messages({
      'date.max': 'Date must be in the past.',
    });

/**
 * Boolean field with strict validation
 */
export const booleanField = () =>
  Joi.boolean()
    .strict()
    .messages({
      'boolean.base': 'Value must be a boolean (true/false).',
    });

/**
 * Enum validation helper
 */
export const enumField = (allowedValues, fieldName = 'Value') =>
  Joi.string()
    .valid(...allowedValues)
    .messages({
      'any.only': `${fieldName} must be one of: ${allowedValues.join(', ')}.`,
    });

/**
 * Array of ObjectIds
 */
export const objectIdArray = () =>
  Joi.array()
    .items(objectId())
    .min(1)
    .max(100)
    .messages({
      'array.min': 'At least one ID is required.',
      'array.max': 'Cannot process more than 100 items at once.',
    });

/**
 * Sanitize and validate search query
 */
export const searchQuery = () =>
  Joi.string()
    .trim()
    .max(100)
    .allow('')
    .replace(/[<>{}[\]\\]/g, '') // Remove potentially dangerous chars
    .messages({
      'string.max': 'Search query cannot exceed 100 characters.',
    });

/**
 * Standard pagination schema
 */
export const paginationSchema = Joi.object({
  page: page(),
  limit: limit(),
  sortBy: Joi.string().trim().max(50),
  sortOrder: enumField(['asc', 'desc'], 'Sort order').default('desc'),
  search: searchQuery(),
});

/**
 * ID parameter schema
 */
export const idParamSchema = Joi.object({
  id: objectId().required().messages({
    'any.required': 'ID is required.',
  }),
});

/**
 * Validate request and strip unknown fields
 */
export const validationOptions = {
  abortEarly: false, // Return all errors, not just the first
  stripUnknown: true, // Remove unknown fields
  convert: true, // Convert types where possible
};

export default {
  objectId,
  phoneNumber,
  email,
  strongPassword,
  simplePassword,
  positiveNumber,
  price,
  page,
  limit,
  safeString,
  dateField,
  futureDate,
  pastDate,
  booleanField,
  enumField,
  objectIdArray,
  searchQuery,
  paginationSchema,
  idParamSchema,
  validationOptions,
};
