import multer from 'multer';
import type { RequestHandler } from 'express';

import env from '../env';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.R2_MAX_IMAGE_BYTES, files: 1, fields: 3, parts: 4, fieldSize: 2048 },
});

const teamImageUpload: RequestHandler = (req, res, next) => {
  upload.single('image')(req, res, (error: unknown) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        status: 'error',
        message: 'Team image exceeds upload limit',
        result: { maxBytes: env.R2_MAX_IMAGE_BYTES },
      });
    }

    return res
      .status(400)
      .json({ status: 'error', message: 'Invalid team image upload', result: {} });
  });
};

export default teamImageUpload;
