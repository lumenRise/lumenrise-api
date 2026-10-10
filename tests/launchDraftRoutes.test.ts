import { Types } from 'mongoose';
import { Keypair } from '@stellar/stellar-sdk';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TokenImage from '../src/models/TokenImage';
import LaunchDraft from '../src/models/LaunchDraft';
import StellarAccount from '../src/models/StellarAccount';
import getLaunchDraftRoute from '../src/routes/launches/getDraft';
import postLaunchDraftRoute from '../src/routes/launches/postDraft';
import postDraftSubmissionRoute from '../src/routes/launches/postDraftSubmission';

vi.mock('../src/models/TokenImage', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../src/models/LaunchDraft', () => ({ default: { create: vi.fn(), findOne: vi.fn(), findOneAndUpdate: vi.fn() } }));
vi.mock('../src/models/StellarAccount', () => ({ default: { exists: vi.fn() } }));

const identityId = new Types.ObjectId();
const draftId = new Types.ObjectId();
const imageId = new Types.ObjectId();
const ownerAddress = Keypair.random().publicKey();
const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), setHeader: vi.fn() });

describe('private bonding drafts', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('requires a connected owner wallet before creating a draft', async () => {
    vi.mocked(StellarAccount.exists).mockResolvedValue(null);
    const res = response();
    await postLaunchDraftRoute(
      { auth: { identityId }, body: { network: 'testnet', ownerAddress, data: { name: 'Launch' } } } as unknown as Request,
      res as unknown as Response, vi.fn(),
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(LaunchDraft.create).not.toHaveBeenCalled();
  });

  it('scopes draft lookup to the authenticated identity', async () => {
    vi.mocked(LaunchDraft.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as never);
    const res = response();
    await getLaunchDraftRoute(
      { auth: { identityId }, params: { draftId: draftId.toString() } } as unknown as Request,
      res as unknown as Response, vi.fn(),
    );
    expect(LaunchDraft.findOne).toHaveBeenCalledWith({ _id: draftId.toString(), ownerIdentityId: identityId });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rejects submitted parameters that do not use the owned image', async () => {
    vi.mocked(LaunchDraft.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue({
      _id: draftId, ownerIdentityId: identityId, network: 'testnet', ownerAddress, status: 'editing',
    }) } as never);
    vi.mocked(StellarAccount.exists).mockResolvedValue({ _id: new Types.ObjectId() } as never);
    vi.mocked(TokenImage.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue({
      _id: imageId, publicUrl: 'https://images.example/token.png',
    }) } as never);
    const res = response();
    await postDraftSubmissionRoute(
      { auth: { identityId }, params: { draftId: draftId.toString() }, body: {
        imageId: imageId.toString(), transactionHash: 'a'.repeat(64), params: { owner: ownerAddress },
      } } as unknown as Request,
      res as unknown as Response, vi.fn(),
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(LaunchDraft.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
