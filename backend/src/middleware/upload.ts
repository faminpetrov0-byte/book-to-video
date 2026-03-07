import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import fs from 'fs';

// Ensure upload directory exists
if (!fs.existsSync(config.upload.dir)) {
  fs.mkdirSync(config.upload.dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const allAllowed = [...config.upload.allowedTextFormats, ...config.upload.allowedAudioFormats];

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allAllowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file format: .${ext}. Allowed: ${allAllowed.join(', ')}`));
  }
}

export const uploadFile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxSizeMB * 1024 * 1024,
  },
}).single('file');
