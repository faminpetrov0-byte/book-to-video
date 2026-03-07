import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import prisma from '../db';
import { config } from '../config';
import logger from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';

/**
 * POST /api/render/:projectId - Render final video with optional vertical format
 */
router.post(
  '/render/:projectId',
  [
    body('resolution').optional().isIn(['720p', '1080p', '4k', 'vertical_9:16_720', 'vertical_9:16_1080']),
    body('format').optional().isIn(['mp4', 'webm']),
    body('quality').optional().isIn(['low', 'medium', 'high', 'ultra']),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
      }

      const projectId = req.params.projectId;
      const resolution = req.body.resolution || '1080p';
      const format = req.body.format || 'mp4';
      const quality = req.body.quality || 'high';

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          scenes: {
            orderBy: { orderIndex: 'asc' },
            include: {
              generatedMedia: {
                where: { mediaType: { in: ['image', 'video'] }, status: 'completed' },
              },
            },
          },
          videos: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (!project) throw new NotFoundError('Project', projectId);

      // Check if we have media to render
      const scenesWithMedia = project.scenes.filter(
        (s) => s.generatedMedia && s.generatedMedia.length > 0
      );

      if (scenesWithMedia.length === 0) {
        throw new ValidationError('No generated media to render. Generate images/videos first.');
      }

      // Create output directory
      const outputDir = path.join(config.output.dir, 'final');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const timestamp = Date.now();
      const isVertical = resolution.includes('vertical');
      const aspectRatio = isVertical ? '9:16' : '16:9';
      
      // Resolution dimensions
      const dimensions: Record<string, { width: number; height: number }> = {
        '720p': { width: 1280, height: 720 },
        '1080p': { width: 1920, height: 1080 },
        '4k': { width: 3840, height: 2160 },
        'vertical_9:16_720': { width: 720, height: 1280 },
        'vertical_9:16_1080': { width: 1080, height: 1920 },
      };

      const { width, height } = dimensions[resolution] || dimensions['1080p'];

      // Quality settings
      const qualitySettings: Record<string, { crf: number; preset: string }> = {
        low: { crf: 28, preset: 'veryfast' },
        medium: { crf: 23, preset: 'medium' },
        high: { crf: 18, preset: 'slow' },
        ultra: { crf: 15, preset: 'veryslow' },
      };

      const { crf, preset } = qualitySettings[quality] || qualitySettings.high;

      // Build input file list for concat
      const inputListPath = path.join(config.output.dir, `concat_${timestamp}.txt`);
      const inputFiles: string[] = [];

      for (const scene of project.scenes) {
        const media = scene.generatedMedia?.[0];
        if (!media) continue;

        let mediaPath = media.filePath;
        if (!fs.existsSync(mediaPath)) {
          // Try alternative path
          const altPath = path.join(config.output.dir, path.basename(mediaPath));
          if (fs.existsSync(altPath)) {
            mediaPath = altPath;
          } else {
            logger.warn('Media file not found, skipping', { path: mediaPath });
            continue;
          }
        }

        // Calculate duration - use scene duration or detect from media
        const duration = scene.duration || 5;

        // Scale and pad to target resolution
        const scaledPath = path.join(config.output.dir, `scaled_${path.basename(mediaPath)}`);
        
        try {
          if (isVertical) {
            // Scale to fit width, pad to vertical
            execSync(
              `ffmpeg -i "${mediaPath}" -vf "scale=${width}:-1:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1" -t ${duration} -c:a copy "${scaledPath}" -y`,
              { timeout: 60 }
            );
          } else {
            // Scale to fit height, pad to horizontal
            execSync(
              `ffmpeg -i "${mediaPath}" -vf "scale=-1:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1" -t ${duration} -c:a copy "${scaledPath}" -y`,
              { timeout: 60 }
            );
          }
          inputFiles.push(scaledPath);
        } catch (err) {
          logger.warn('Failed to scale media, using original', { error: (err as Error).message });
          // Use original as fallback
          inputFiles.push(mediaPath);
        }
      }

      if (inputFiles.length === 0) {
        throw new ValidationError('No valid media files to render');
      }

      // Write concat list
      const concatList = inputFiles.map((f) => `file '${f}'`).join('\n');
      fs.writeFileSync(inputListPath, concatList);

      // Output file
      const outputPath = path.join(
        outputDir,
        `${project.title.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.${format}`
      );

      // Concatenate videos
      const ffmpegCmd = `ffmpeg -f concat -safe 0 -i "${inputListPath}" -c copy "${outputPath}" -y`;
      execSync(ffmpegCmd, { timeout: 300 });

      // Get output file stats
      const stats = fs.statSync(outputPath);

      // Add Hollywood color grading
      const gradedPath = outputPath.replace(`.${format}`, `_graded.${format}`);
      try {
        execSync(
          // Color grading + film grain + vignette
          `ffmpeg -i "${outputPath}" -vf "eq=saturation=0.95:contrast=1.05:brightness=0.02, vignette=angle=0.5, noise=alls=20:allf=t" -c:a copy "${gradedPath}" -y`,
          { timeout: 120 }
        );
        
        // Replace with graded version
        fs.unlinkSync(outputPath);
        fs.renameSync(gradedPath, outputPath);
      } catch (err) {
        logger.warn('Color grading failed, using original', { error: (err as Error).message });
      }

      // Save video record
      const video = await prisma.video.create({
        data: {
          projectId,
          filePath: outputPath,
          format,
          resolution: `${width}x${height}`,
          duration: project.scenes.reduce((sum, s) => sum + s.duration, 0),
          fileSize: stats.size,
          status: 'completed',
        },
      });

      // Cleanup temp files
      try {
        fs.unlinkSync(inputListPath);
        inputFiles.forEach((f) => {
          if (f.includes('scaled_') && fs.existsSync(f)) {
            fs.unlinkSync(f);
          }
        });
      } catch { /* ignore cleanup errors */ }

      logger.info('Video rendered', {
        projectId,
        outputPath,
        resolution: `${width}x${height}`,
        duration: video.duration,
        size: stats.size,
      });

      res.json({
        video,
        downloadUrl: `/output/final/${path.basename(outputPath)}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
