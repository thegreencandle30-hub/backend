/**
 * Unit tests for helper utilities
 */

import { 
  catchAsync, 
  parsePagination, 
  formatPaginationResponse,
  generateTransactionId,
} from '../../src/utils/helpers.js';

describe('Helpers', () => {
  describe('catchAsync', () => {
    it('should catch async errors and pass to next', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const next = jest.fn();
      const req = {};
      const res = {};
      
      const wrappedFn = catchAsync(asyncFn);
      await wrappedFn(req, res, next);
      
      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
    
    it('should not call next on successful execution', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const next = jest.fn();
      const req = {};
      const res = {};
      
      const wrappedFn = catchAsync(asyncFn);
      await wrappedFn(req, res, next);
      
      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('parsePagination', () => {
    it('should return default values when no query provided', () => {
      const result = parsePagination({});
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(0);
    });
    
    it('should parse page and limit from query', () => {
      const result = parsePagination({ page: '2', limit: '20' });
      
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(20);
    });
    
    it('should enforce maximum limit', () => {
      const result = parsePagination({ page: '1', limit: '500' });
      
      expect(result.limit).toBe(100);
    });
    
    it('should enforce minimum values', () => {
      const result = parsePagination({ page: '0', limit: '-5' });
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
    });
    
    it('should calculate correct skip value', () => {
      const result = parsePagination({ page: '3', limit: '15' });
      
      expect(result.skip).toBe(30); // (3-1) * 15
    });
  });
  
  describe('formatPaginationResponse', () => {
    it('should format pagination response correctly', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = formatPaginationResponse(data, 50, 2, 10);
      
      expect(result.data).toEqual(data);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(5);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(true);
    });
    
    it('should handle first page correctly', () => {
      const result = formatPaginationResponse([], 50, 1, 10);
      
      expect(result.pagination.hasPrevPage).toBe(false);
      expect(result.pagination.hasNextPage).toBe(true);
    });
    
    it('should handle last page correctly', () => {
      const result = formatPaginationResponse([], 50, 5, 10);
      
      expect(result.pagination.hasPrevPage).toBe(true);
      expect(result.pagination.hasNextPage).toBe(false);
    });
    
    it('should handle single page correctly', () => {
      const result = formatPaginationResponse([], 5, 1, 10);
      
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasPrevPage).toBe(false);
      expect(result.pagination.hasNextPage).toBe(false);
    });
    
    it('should handle empty results', () => {
      const result = formatPaginationResponse([], 0, 1, 10);
      
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });
  
  describe('generateTransactionId', () => {
    it('should generate a unique transaction ID', () => {
      const id1 = generateTransactionId();
      const id2 = generateTransactionId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });
    
    it('should start with VLQ prefix', () => {
      const id = generateTransactionId();
      
      expect(id.startsWith('VLQ')).toBe(true);
    });
    
    it('should have consistent length', () => {
      const ids = Array.from({ length: 10 }, () => generateTransactionId());
      const lengths = ids.map(id => id.length);
      
      // All IDs should have the same length
      expect(new Set(lengths).size).toBe(1);
    });
  });
});
