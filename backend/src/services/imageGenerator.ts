import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { contentHash } from '../utils/hash';
import logger from '../utils/logger';
import { AIServiceError } from '../utils/errors';
import prisma from '../db';

interface GenerateImageResult {
  filePath: string;
  contentHashValue: string;
  cached: boolean;
}

/**
 * Generate an image from a text prompt using Hugging Face Stable Diffusion.
 * Results are cached by content hash to avoid duplicate API calls.
 */
export async function generateImage(
  sceneId: string,
  prompt: string,
  options: { width?: number; height?: number; negativePrompt?: string } = {}
): Promise<GenerateImageResult> {
  const { width = 1280, height = 720, negativePrompt = 'blurry, low quality, distorted, text, watermark' } = options;

  const hashParams = { prompt, width, height, negativePrompt, model: config.ai.huggingface.imageModel };
  const hash = contentHash(hashParams);

  // Check cache
  const cached = await prisma.generatedMedia.findFirst({
    where: { contentHash: hash, mediaType: 'image', status: 'completed' },
  });

  if (cached && fs.existsSync(cached.filePath)) {
    logger.info('Image cache hit', { hash, sceneId });
    return { filePath: cached.filePath, contentHashValue: hash, cached: true };
  }

  logger.info('Generating image via Hugging Face', { sceneId, prompt: prompt.slice(0, 80) });

  if (!config.ai.huggingface.apiKey) {
    // Generate a placeholder image via canvas-free method
    return generatePlaceholder(sceneId, prompt, hash, width, height);
  }

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${config.ai.huggingface.imageModel}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.ai.huggingface.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            width,
            height,
            negative_prompt: negativePrompt,
            num_inference_steps: 30,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new AIServiceError('HuggingFace', `${response.status}: ${errorText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const outputDir = path.join(config.output.dir, 'images');
    fs.mkdirSync(outputDir, { recursive: true });

    const filePath = path.join(outputDir, `${hash}.png`);
    fs.writeFileSync(filePath, imageBuffer);

    // Save to database
    await prisma.generatedMedia.create({
      data: {
        sceneId,
        mediaType: 'image',
        filePath,
        contentHash: hash,
        promptUsed: prompt,
        modelUsed: config.ai.huggingface.imageModel,
        status: 'completed',
        selected: true,
      },
    });

    logger.info('Image generated successfully', { hash, filePath });
    return { filePath, contentHashValue: hash, cached: false };

  } catch (err) {
    if (err instanceof AIServiceError) throw err;
    throw new AIServiceError('HuggingFace', (err as Error).message);
  }
}

/**
 * Generate a simple placeholder SVG image when no API key is configured.
 */
async function generatePlaceholder(
  sceneId: string,
  prompt: string,
  hash: string,
  width: number,
  height: number
): Promise<GenerateImageResult> {
  logger.info('Generating placeholder image (no API key)', { sceneId });

  const outputDir = path.join(config.output.dir, 'images');
  fs.mkdirSync(outputDir, { recursive: true });

  // Create a colored SVG placeholder with the prompt text
  const colors = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#2c3e50', '#1b2838'];
  const bg = colors[Math.floor(Math.random() * colors.length)];
  const shortPrompt = prompt.slice(0, 120).replace(/[<>&"']/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#000;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="50%" y="45%" fill="#ffffff" font-family="Arial,sans-serif" font-size="24" text-anchor="middle" opacity="0.9">🎬 Scene Image</text>
  <text x="50%" y="55%" fill="#cccccc" font-family="Arial,sans-serif" font-size="16" text-anchor="middle" opacity="0.7">${shortPrompt}</text>
  <text x="50%" y="90%" fill="#666666" font-family="Arial,sans-serif" font-size="12" text-anchor="middle">Configure HUGGINGFACE_API_KEY for AI generation</text>
</svg>`;

  const filePath = path.join(outputDir, `${hash}.svg`);
  fs.writeFileSync(filePath, svg);

  await prisma.generatedMedia.create({
    data: {
      sceneId,
      mediaType: 'image',
      filePath,
      contentHash: hash,
      promptUsed: prompt,
      modelUsed: 'placeholder',
      status: 'completed',
      selected: true,
    },
  });

  return { filePath, contentHashValue: hash, cached: false };
}
