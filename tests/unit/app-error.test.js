/**
 * Unit tests for AppError utility
 */

import AppError from '../../src/utils/app-error.js';

describe('AppError', () => {
  describe('constructor', () => {
    it('should create an error with message and status code', () => {
      const error = new AppError('Test error', 400);
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
    });
    
    it('should set status to "error" for 5xx status codes', () => {
      const error = new AppError('Server error', 500);
      
      expect(error.status).toBe('error');
    });
    
    it('should set status to "fail" for 4xx status codes', () => {
      const error = new AppError('Client error', 404);
      
      expect(error.status).toBe('fail');
    });
    
    it('should capture stack trace', () => {
      const error = new AppError('Test error', 400);
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
    
    it('should be an instance of Error', () => {
      const error = new AppError('Test error', 400);
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });
  
  describe('operational errors', () => {
    it('should mark errors as operational by default', () => {
      const error = new AppError('Operational error', 400);
      
      expect(error.isOperational).toBe(true);
    });
    
    it('should allow non-operational errors', () => {
      const error = new AppError('Programming error', 500);
      error.isOperational = false;
      
      expect(error.isOperational).toBe(false);
    });
  });
});
