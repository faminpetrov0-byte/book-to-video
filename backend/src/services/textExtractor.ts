import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

/**
 * Extract text from various file formats.
 * Each extractor is loaded dynamically to handle missing optional deps gracefully.
 */
export async function extractText(filePath: string, format: string): Promise<string> {
  logger.info(`Extracting text from ${format} file`, { filePath });

  switch (format.toLowerCase()) {
    case 'txt':
      return extractTxt(filePath);
    case 'pdf':
      return extractPdf(filePath);
    case 'docx':
      return extractDocx(filePath);
    case 'epub':
      return extractEpub(filePath);
    default:
      throw new Error(`Unsupported text format: ${format}`);
  }
}

async function extractTxt(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, 'utf-8');
}

async function extractPdf(filePath: string): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractDocx(filePath: string): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function extractEpub(filePath: string): Promise<string> {
  try {
    const EPub = (await import('epub2')).default;
    const epub = await EPub.createAsync(filePath);

    const chapters: string[] = [];
    const flow = epub.flow || [];

    for (const chapter of flow) {
      if (chapter.id) {
        try {
          const text = await epub.getChapterAsync(chapter.id);
          // Strip HTML tags
          const clean = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          if (clean) chapters.push(clean);
        } catch {
          // Skip unreadable chapters
        }
      }
    }

    return chapters.join('\n\n');
  } catch (err) {
    logger.error('EPUB extraction failed', { error: (err as Error).message });
    throw new Error('Failed to extract text from EPUB');
  }
}

/**
 * For audio files, return placeholder — actual transcription would use Whisper API
 */
export async function extractTextFromAudio(filePath: string): Promise<string> {
  logger.info('Audio transcription requested', { filePath });

  // In a real implementation, this would call Whisper API
  // For MVP, we return a placeholder instructing the user to provide text
  return `[Audio file uploaded: ${path.basename(filePath)}]\n\nAudio transcription via Whisper API is available with an API key.\nFor MVP, please also upload a text version or manually add scenes.`;
}
