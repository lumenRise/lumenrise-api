import multer from 'multer';
import type { RequestHandler } from 'express';

import env from '../env';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.R2_MAX_TOKEN_IMAGE_BYTES, files: 1, fields: 2, parts: 3 },
});

const tokenImageUpload: RequestHandler = (req, res, next) => {
  upload.single('image')(req, res, (error: unknown) => {
    if (!error) {
      return next();
    }
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ status: 'error', message: 'Token image exceeds upload limit', result: { maxBytes: env.R2_MAX_TOKEN_IMAGE_BYTES } });
    }
    return res.status(400).json({ status: 'error', message: 'Invalid token image upload', result: {} });
  });
};

export default tokenImageUpload;
