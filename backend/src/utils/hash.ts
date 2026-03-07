import crypto from 'crypto';

/**
 * Create a deterministic hash from generation parameters.
 * Used for caching generated media to avoid duplicate AI calls.
 */
export function contentHash(params: Record<string, unknown>): string {
  const sorted = JSON.stringify(params, Object.keys(params).sort());
  return crypto.createHash('sha256').update(sorted).digest('hex').slice(0, 16);
}

/**
 * Hash a file by its content.
 */
export function fileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
}
