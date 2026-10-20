import express from 'express';
import request from 'supertest';
import type { RequestHandler } from 'express';
import { describe, expect, it, vi } from 'vitest';

import avatarUpload from '../src/middleware/avatarUpload';
import teamImageUpload from '../src/middleware/teamImageUpload';
import tokenImageUpload from '../src/middleware/tokenImageUpload';
import registrationUpload from '../src/middleware/registrationUpload';

vi.mock('../src/env', () => ({ default: { R2_MAX_IMAGE_BYTES: 1024 } }));

const app = express();

const uploads = [
  ['/avatar', 'avatar', avatarUpload],
  ['/registration', 'avatar', registrationUpload],
  ['/token', 'image', tokenImageUpload],
  ['/team', 'image', teamImageUpload],
] as const;

const completeUpload: RequestHandler = (req, res) => {
  res.status(200).json({ bytes: req.file?.size });
};

for (const [path, , middleware] of uploads) {
  app.post(path, middleware, completeUpload);
}

describe('shared image upload size limit', () => {
  it.each(uploads)('accepts an image below the shared limit on %s', async (path, field) => {
    const response = await request(app).post(path).attach(field, Buffer.alloc(1023), 'image.png');

    expect(response.status).toBe(200);
    expect(response.body.bytes).toBe(1023);
  });

  it.each(uploads)('rejects an image above the shared limit on %s', async (path, field) => {
    const response = await request(app).post(path).attach(field, Buffer.alloc(1025), 'image.png');

    expect(response.status).toBe(413);
    expect(response.body.result).toEqual({ maxBytes: 1024 });
  });
});
