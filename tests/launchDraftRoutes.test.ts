import { Types } from 'mongoose';
import { Keypair } from '@stellar/stellar-sdk';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LaunchDraft from '../src/models/LaunchDraft';
import StellarAccount from '../src/models/StellarAccount';
import getLaunchDraftRoute from '../src/routes/launches/getDraft';
import postLaunchDraftRoute from '../src/routes/launches/postDraft';

vi.mock('../src/models/LaunchDraft', () => ({ default: { create: vi.fn(), findOne: vi.fn(), findOneAndUpdate: vi.fn() } }));
vi.mock('../src/models/StellarAccount', () => ({ default: { exists: vi.fn() } }));

const identityId = new Types.ObjectId();
const draftId = new Types.ObjectId();
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

});
