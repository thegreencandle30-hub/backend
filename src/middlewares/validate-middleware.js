import AppError from '../utils/app-error.js';
import logger from '../utils/logger.js';

/**
 * Validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
      convert: true, // Convert types where possible
    });
    
    if (error) {
      // Format validation errors
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, ''),
        type: detail.type,
      }));
      
      // Log validation errors in development
      logger.debug(`Validation error on ${req.method} ${req.originalUrl}:`, {
        source,
        errors,
      });
      
      // Create user-friendly error message
      const errorMessage = errors.map(e => e.message).join('. ');
      
      const validationError = new AppError(errorMessage, 400);
      validationError.errors = errors;
      validationError.isValidationError = true;
      
      return next(validationError);
    }
    
    // Replace request data with validated/sanitized values
    req[source] = value;
    next();
  };
};

/**
 * Validate multiple sources at once
 * @param {Object} schemas - Object with source keys and schema values
 * @returns {Function} Express middleware
 */
export const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const allErrors = [];
    
    for (const [source, schema] of Object.entries(schemas)) {
      const { error, value } = schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });
      
      if (error) {
        const errors = error.details.map((detail) => ({
          field: `${source}.${detail.path.join('.')}`,
          message: detail.message.replace(/['"]/g, ''),
          type: detail.type,
        }));
        allErrors.push(...errors);
      } else {
        req[source] = value;
      }
    }
    
    if (allErrors.length > 0) {
      const errorMessage = allErrors.map(e => e.message).join('. ');
      const validationError = new AppError(errorMessage, 400);
      validationError.errors = allErrors;
      validationError.isValidationError = true;
      return next(validationError);
    }
    
    next();
  };
};

/**
 * Validate request params (shorthand)
 */
export const validateParams = (schema) => validate(schema, 'params');

/**
 * Validate request query (shorthand)
 */
export const validateQuery = (schema) => validate(schema, 'query');

/**
 * Validate request body (shorthand)
 */
export const validateBody = (schema) => validate(schema, 'body');

export default validate;
