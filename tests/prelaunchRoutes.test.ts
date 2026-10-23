import express from 'express';
import request from 'supertest';
import { Keypair } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Launch from '../src/models/Launch';
import LaunchName from '../src/models/LaunchName';
import TokenImage from '../src/models/TokenImage';
import launchRoutes from '../src/routes/launches';
import StellarAccount from '../src/models/StellarAccount';
import resolveNetwork from '../src/middleware/resolveNetwork';
import uploadTokenImage from '../src/services/tokenImage/uploadTokenImage';
import processTokenImage from '../src/services/tokenImage/processTokenImage';
import deleteAvatarOrQueue from '../src/services/avatar/deleteAvatarOrQueue';

vi.mock('../src/env', () => ({ default: {
  STELLAR_AUTH_NETWORK: 'testnet', R2_MAX_IMAGE_BYTES: 1048576,
} }));
vi.mock('../src/logger', () => ({ default: { error: vi.fn() } }));
vi.mock('../src/middleware/requireSession', () => ({ default: (req, _res, next) => {
  req.auth = { identityId: '507f1f77bcf86cd799439011' };
  next();
} }));
vi.mock('../src/storage/isR2Configured', () => ({ default: () => true }));
vi.mock('../src/models/TokenImage', () => ({ default: { create: vi.fn(), updateOne: vi.fn() } }));
vi.mock('../src/models/Launch', () => ({ default: { exists: vi.fn() } }));
vi.mock('../src/models/LaunchName', () => ({ default: { findOneAndUpdate: vi.fn(), updateOne: vi.fn() } }));
vi.mock('../src/services/avatar/deleteAvatarOrQueue', () => ({ default: vi.fn() }));
vi.mock('../src/models/StellarAccount', () => ({ default: { exists: vi.fn() } }));
vi.mock('../src/services/tokenImage/processTokenImage', () => ({ default: vi.fn().mockResolvedValue(Buffer.from('image')) }));
vi.mock('../src/services/tokenImage/uploadTokenImage', () => ({ default: vi.fn() }));

const app = express();

app.use(resolveNetwork);
const owner = Keypair.random().publicKey();

app.use('/v1/launches', launchRoutes);

describe('prelaunch upload', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(processTokenImage).mockResolvedValue(Buffer.from('image'));
    vi.mocked(Launch.exists).mockResolvedValue(null);
    vi.mocked(LaunchName.findOneAndUpdate).mockResolvedValue({} as never);
    vi.mocked(StellarAccount.exists).mockResolvedValue({ _id: 'account' } as never);
    vi.mocked(TokenImage.create).mockResolvedValue({ _id: 'image1' } as never);
    vi.mocked(uploadTokenImage).mockResolvedValue({
      publicUrl: 'https://images.example/logo.png', objectKey: 'logo.png',
    } as never);
  });

  it('accepts the image and both optional links as multipart fields', async () => {
    const result = await request(app).post('/v1/launches/prelaunch')
      .field('description', '  Server project description  ').field('name', 'Blue Man').field('network', 'testnet').field('ownerAddress', owner)
      .field('website', ' https://project.example ')
      .field('xAccount', 'https://x.com/project')
      .attach('image', Buffer.from('image'), 'logo.png');

    expect(result.status).toBe(201);
    expect(result.body.result.description).toBe('Server project description');
    expect(TokenImage.create).toHaveBeenCalledWith(expect.objectContaining({
      ownerAddress: owner,
      slug: 'blue-man',
      projectName: 'Blue Man',
      description: 'Server project description',
      website: 'https://project.example',
      xAccount: 'https://x.com/project',
    }));
  });

  it.each([{}, { website: '', xAccount: '   ' }])('accepts missing or blank links: %j', async (links) => {
    let upload = request(app).post('/v1/launches/prelaunch')
      .field('description', '  Server project description  ').field('name', 'Blue Man').field('network', 'testnet').field('ownerAddress', owner);

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
      .field('description', '  Server project description  ').field('name', 'Blue Man').field('network', 'testnet').field('ownerAddress', owner)
      .field(field, value).attach('image', Buffer.from('image'), 'logo.png');

    expect(result.status).toBe(400);
    expect(uploadTokenImage).not.toHaveBeenCalled();
    expect(TokenImage.create).not.toHaveBeenCalled();
  });

  it.each(['blue man', 'blue-man', 'Blue   Man'])('rejects an already indexed name: %s', async (name) => {
    vi.mocked(Launch.exists).mockResolvedValue({ _id: 'launch' } as never);

    const result = await request(app).post('/v1/launches/prelaunch')
      .field('description', '  Server project description  ').field('name', name).field('ownerAddress', owner)
      .attach('image', Buffer.from('image'), 'logo.png');

    expect(result.status).toBe(409);
    expect(Launch.exists).toHaveBeenCalledWith({ network: 'testnet', slug: 'blue-man' });
    expect(uploadTokenImage).not.toHaveBeenCalled();
  });

  it('returns 409 and removes the upload when another request wins the name reservation', async () => {
    vi.mocked(LaunchName.findOneAndUpdate).mockRejectedValue({ code: 11000 });

    const result = await request(app).post('/v1/launches/prelaunch')
      .field('description', '  Server project description  ').field('name', 'blue-man').field('ownerAddress', owner)
      .attach('image', Buffer.from('image'), 'logo.png');

    expect(result.status).toBe(409);
    expect(deleteAvatarOrQueue).toHaveBeenCalledWith('logo.png');
    expect(TokenImage.updateOne).toHaveBeenCalledWith(
      { _id: 'image1' },
      { $set: { status: 'expired', expiredAt: expect.any(Date) } },
    );
  });

  it.each([undefined, '', '   ', 'a'.repeat(10_001)])('rejects missing, blank or oversized descriptions', async (description: string | undefined): Promise<void> => {
    let upload = request(app).post('/v1/launches/prelaunch')
      .field('name', 'Blue Man').field('ownerAddress', owner);

    if (description !== undefined) {
      upload = upload.field('description', description);
    }

    const result = await upload.attach('image', Buffer.from('image'), 'logo.png');

    expect(result.status).toBe(400);
    expect(uploadTokenImage).not.toHaveBeenCalled();
    expect(TokenImage.create).not.toHaveBeenCalled();
  });

  it.each(['a'.repeat(10_000), 'テ'.repeat(10_000)])('accepts a description at the character limit', async (description: string): Promise<void> => {
    const result = await request(app).post('/v1/launches/prelaunch')
      .field('name', 'Blue Man').field('ownerAddress', owner)
      .field('description', description)
      .attach('image', Buffer.from('image'), 'logo.png');

    expect(result.status).toBe(201);
    expect(TokenImage.create).toHaveBeenCalledWith(expect.objectContaining({ description }));
  });

  it('requires a project name', async () => {
    const result = await request(app).post('/v1/launches/prelaunch')
      .field('description', 'Server project description')
      .field('ownerAddress', owner).attach('image', Buffer.from('image'), 'logo.png');

    expect(result.status).toBe(400);
    expect(uploadTokenImage).not.toHaveBeenCalled();
  });

});
