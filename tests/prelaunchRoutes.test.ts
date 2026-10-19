import express from 'express';
import request from 'supertest';
import { Keypair } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TokenImage from '../src/models/TokenImage';
import launchRoutes from '../src/routes/launches';
import StellarAccount from '../src/models/StellarAccount';
import resolveNetwork from '../src/middleware/resolveNetwork';
import uploadTokenImage from '../src/services/tokenImage/uploadTokenImage';

vi.mock('../src/env', () => ({ default: {
  STELLAR_AUTH_NETWORK: 'testnet', R2_MAX_TOKEN_IMAGE_BYTES: 1048576,
} }));
vi.mock('../src/logger', () => ({ default: { error: vi.fn() } }));
vi.mock('../src/middleware/requireSession', () => ({ default: (req, _res, next) => {
  req.auth = { identityId: '507f1f77bcf86cd799439011' };
  next();
} }));
vi.mock('../src/storage/isR2Configured', () => ({ default: () => true }));
vi.mock('../src/models/TokenImage', () => ({ default: { create: vi.fn() } }));
vi.mock('../src/models/StellarAccount', () => ({ default: { exists: vi.fn() } }));
vi.mock('../src/services/tokenImage/processTokenImage', () => ({ default: vi.fn().mockResolvedValue(Buffer.from('image')) }));
vi.mock('../src/services/tokenImage/uploadTokenImage', () => ({ default: vi.fn() }));

const app = express();

app.use(resolveNetwork);
const owner = Keypair.random().publicKey();

app.use('/v1/launches', launchRoutes);

describe('prelaunch upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(StellarAccount.exists).mockResolvedValue({ _id: 'account' } as never);
    vi.mocked(TokenImage.create).mockResolvedValue({ _id: 'image1' } as never);
    vi.mocked(uploadTokenImage).mockResolvedValue({
      publicUrl: 'https://images.example/logo.png', objectKey: 'logo.png',
    } as never);
  });

  it('accepts the image and both optional links as multipart fields', async () => {
    const result = await request(app).post('/v1/launches/prelaunch')
      .field('network', 'testnet').field('ownerAddress', owner)
      .field('website', ' https://project.example ')
      .field('xAccount', 'https://x.com/project')
      .attach('image', Buffer.from('image'), 'logo.png');

    expect(result.status).toBe(201);
    expect(TokenImage.create).toHaveBeenCalledWith(expect.objectContaining({
      ownerAddress: owner,
      website: 'https://project.example',
      xAccount: 'https://x.com/project',
    }));
  });

  it.each([{}, { website: '', xAccount: '   ' }])('accepts missing or blank links: %j', async (links) => {
    let upload = request(app).post('/v1/launches/prelaunch')
      .field('network', 'testnet').field('ownerAddress', owner);

    for (const [key, value] of Object.entries(links)) {
      upload = upload.field(key, value);
    }

    const result = await upload.attach('image', Buffer.from('image'), 'logo.png');

    expect(result.status).toBe(201);
    expect(TokenImage.create).toHaveBeenCalledWith(expect.objectContaining({
      website: undefined, xAccount: undefined,
    }));
  });

  it.each([
    ['website', 'javascript:alert(1)'],
    ['xAccount', 'not-a-url'],
    ['website', 'https://user:pass@project.example'],
    ['website', 'https://project.example/' + 'a'.repeat(2048)],
  ])('rejects invalid %s before storing an image', async (field, value) => {
    const result = await request(app).post('/v1/launches/prelaunch')
      .field('network', 'testnet').field('ownerAddress', owner)
      .field(field, value).attach('image', Buffer.from('image'), 'logo.png');

    expect(result.status).toBe(400);
    expect(uploadTokenImage).not.toHaveBeenCalled();
    expect(TokenImage.create).not.toHaveBeenCalled();
  });
});
