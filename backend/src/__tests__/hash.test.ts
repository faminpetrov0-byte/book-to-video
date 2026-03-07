import { describe, it, expect } from 'vitest';
import { contentHash, fileHash } from '../utils/hash';

describe('contentHash', () => {
  it('should produce a deterministic hash for the same input', () => {
    const params = { prompt: 'a cat on a roof', width: 1280, height: 720 };
    const hash1 = contentHash(params);
    const hash2 = contentHash(params);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(16);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = contentHash({ prompt: 'hello' });
    const hash2 = contentHash({ prompt: 'world' });
    expect(hash1).not.toBe(hash2);
  });

  it('should be order-independent for object keys', () => {
    const hash1 = contentHash({ a: 1, b: 2 });
    const hash2 = contentHash({ b: 2, a: 1 });
    expect(hash1).toBe(hash2);
  });
});

describe('fileHash', () => {
  it('should hash a buffer deterministically', () => {
    const buf = Buffer.from('test content');
    const hash1 = fileHash(buf);
    const hash2 = fileHash(buf);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(16);
  });

  it('should produce different hashes for different buffers', () => {
    const hash1 = fileHash(Buffer.from('abc'));
    const hash2 = fileHash(Buffer.from('def'));
    expect(hash1).not.toBe(hash2);
  });
});
