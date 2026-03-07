import { describe, it, expect } from 'vitest';
import { extractText } from '../services/textExtractor';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('extractText', () => {
  it('should extract text from a .txt file', async () => {
    const tmpFile = path.join(os.tmpdir(), 'test-extract.txt');
    const content = 'Hello, this is a test book.\n\nChapter 1: The Beginning\n\nOnce upon a time...';
    fs.writeFileSync(tmpFile, content);

    const result = await extractText(tmpFile, 'txt');
    expect(result).toBe(content);

    fs.unlinkSync(tmpFile);
  });

  it('should throw for unsupported formats', async () => {
    await expect(extractText('/tmp/test.xyz', 'xyz')).rejects.toThrow('Unsupported text format');
  });
});
