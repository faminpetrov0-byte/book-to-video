import { describe, it, expect } from 'vitest';
import { AppError, NotFoundError, ValidationError, AIServiceError } from '../utils/errors';

describe('AppError', () => {
  it('should create an error with status code', () => {
    const err = new AppError('test error', 400);
    expect(err.message).toBe('test error');
    expect(err.statusCode).toBe(400);
    expect(err.isOperational).toBe(true);
    expect(err instanceof Error).toBe(true);
  });
});

describe('NotFoundError', () => {
  it('should format message with resource and id', () => {
    const err = new NotFoundError('Project', '123');
    expect(err.message).toBe('Project with id 123 not found');
    expect(err.statusCode).toBe(404);
  });

  it('should work without id', () => {
    const err = new NotFoundError('Project');
    expect(err.message).toBe('Project not found');
  });
});

describe('ValidationError', () => {
  it('should have 400 status code', () => {
    const err = new ValidationError('invalid input');
    expect(err.statusCode).toBe(400);
  });
});

describe('AIServiceError', () => {
  it('should include service name', () => {
    const err = new AIServiceError('HuggingFace', 'rate limit');
    expect(err.message).toContain('HuggingFace');
    expect(err.message).toContain('rate limit');
    expect(err.statusCode).toBe(502);
  });
});
