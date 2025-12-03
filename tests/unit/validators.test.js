/**
 * Unit tests for validation schemas
 */

import Joi from 'joi';
import {
  createCallSchema,
  updateCallSchema,
  callListQuerySchema,
} from '../../src/validators/call-validator.js';
import {
  verifyTokenSchema,
  adminLoginSchema,
  updateFcmTokenSchema,
} from '../../src/validators/auth-validator.js';
import {
  initiatePaymentSchema,
} from '../../src/validators/subscription-validator.js';

describe('Call Validators', () => {
  describe('createCallSchema', () => {
    const validCall = {
      commodity: 'gold',
      type: 'buy',
      entryPrice: 62000,
      target: 62500,
      stopLoss: 61500,
      date: new Date().toISOString(),
    };
    
    it('should validate a valid call', () => {
      const { error } = createCallSchema.validate(validCall);
      expect(error).toBeUndefined();
    });
    
    it('should reject invalid commodity', () => {
      const { error } = createCallSchema.validate({
        ...validCall,
        commodity: 'bitcoin',
      });
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('gold, silver, nifty, copper');
    });
    
    it('should reject invalid type', () => {
      const { error } = createCallSchema.validate({
        ...validCall,
        type: 'hold',
      });
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('buy or sell');
    });
    
    it('should reject negative entry price', () => {
      const { error } = createCallSchema.validate({
        ...validCall,
        entryPrice: -100,
      });
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('positive');
    });
    
    it('should require all mandatory fields', () => {
      const { error } = createCallSchema.validate({});
      expect(error).toBeDefined();
      expect(error.details.length).toBeGreaterThanOrEqual(5);
    });
    
    it('should set default status to active', () => {
      const { value } = createCallSchema.validate(validCall);
      expect(value.status).toBe('active');
    });
  });
  
  describe('updateCallSchema', () => {
    it('should allow partial updates', () => {
      const { error } = updateCallSchema.validate({
        status: 'hit_target',
      });
      expect(error).toBeUndefined();
    });
    
    it('should reject empty updates', () => {
      const { error } = updateCallSchema.validate({});
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('At least one field');
    });
    
    it('should validate status enum', () => {
      const { error } = updateCallSchema.validate({
        status: 'invalid_status',
      });
      expect(error).toBeDefined();
    });
  });
  
  describe('callListQuerySchema', () => {
    it('should provide default pagination values', () => {
      const { value } = callListQuerySchema.validate({});
      expect(value.page).toBe(1);
      expect(value.limit).toBe(10);
      expect(value.sortBy).toBe('date');
      expect(value.sortOrder).toBe('desc');
    });
    
    it('should validate filter options', () => {
      const { error } = callListQuerySchema.validate({
        commodity: 'gold',
        status: 'active',
        type: 'buy',
      });
      expect(error).toBeUndefined();
    });
    
    it('should reject invalid limit', () => {
      const { error } = callListQuerySchema.validate({
        limit: 500,
      });
      expect(error).toBeDefined();
    });
  });
});

describe('Auth Validators', () => {
  describe('verifyTokenSchema', () => {
    it('should require idToken', () => {
      const { error } = verifyTokenSchema.validate({});
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('required');
    });
    
    it('should accept valid token', () => {
      const { error } = verifyTokenSchema.validate({
        idToken: 'valid.firebase.token',
      });
      expect(error).toBeUndefined();
    });
  });
  
  describe('adminLoginSchema', () => {
    it('should validate correct credentials', () => {
      const { error } = adminLoginSchema.validate({
        email: 'admin@example.com',
        password: 'password123',
      });
      expect(error).toBeUndefined();
    });
    
    it('should reject invalid email', () => {
      const { error } = adminLoginSchema.validate({
        email: 'invalid-email',
        password: 'password123',
      });
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('email');
    });
    
    it('should reject short password', () => {
      const { error } = adminLoginSchema.validate({
        email: 'admin@example.com',
        password: '123',
      });
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('6 characters');
    });
  });
  
  describe('updateFcmTokenSchema', () => {
    it('should require fcmToken', () => {
      const { error } = updateFcmTokenSchema.validate({});
      expect(error).toBeDefined();
    });
    
    it('should accept valid token', () => {
      const { error } = updateFcmTokenSchema.validate({
        fcmToken: 'valid-fcm-token-string',
      });
      expect(error).toBeUndefined();
    });
  });
});

describe('Subscription Validators', () => {
  describe('initiatePaymentSchema', () => {
    it('should accept daily plan', () => {
      const { error } = initiatePaymentSchema.validate({
        plan: 'daily',
      });
      expect(error).toBeUndefined();
    });
    
    it('should accept weekly plan', () => {
      const { error } = initiatePaymentSchema.validate({
        plan: 'weekly',
      });
      expect(error).toBeUndefined();
    });
    
    it('should reject invalid plan', () => {
      const { error } = initiatePaymentSchema.validate({
        plan: 'monthly',
      });
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('daily or weekly');
    });
    
    it('should require plan', () => {
      const { error } = initiatePaymentSchema.validate({});
      expect(error).toBeDefined();
    });
  });
});
