import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Identity from '../src/models/Identity';
import StellarAccount from '../src/models/StellarAccount';
import ExternalAccount from '../src/models/ExternalAccount';
import LaunchTeamMember from '../src/models/LaunchTeamMember';
import type { LaunchRecord } from '../src/types/launch/model';
import getPublicLaunchTeam from '../src/services/launch/getPublicLaunchTeam';

vi.mock('../src/models/Identity', () => ({ default: { find: vi.fn() } }));

vi.mock('../src/models/StellarAccount', () => ({ default: { findOne: vi.fn() } }));

vi.mock('../src/models/ExternalAccount', () => ({ default: { find: vi.fn() } }));

vi.mock('../src/models/LaunchTeamMember', () => ({ default: { find: vi.fn() } }));

const ownerId = new Types.ObjectId();
const userId = new Types.ObjectId();
const externalId = new Types.ObjectId();
const launch = { network: 'public', contractId: 'contract', owner: 'wallet' } as LaunchRecord;
const memberLean = vi.fn();
const ownerLean = vi.fn();
const usersLean = vi.fn();
const accountsLean = vi.fn();

describe('public launch team', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    memberLean.mockResolvedValue([]);

    ownerLean.mockResolvedValue({ identity: ownerId });

    usersLean.mockResolvedValue([{ _id: ownerId, name: 'Creator', avatarUrl: 'creator.png' }]);

    accountsLean.mockResolvedValue([{ identity: ownerId, profileUrl: 'https://x.com/creator' }]);

    vi.mocked(LaunchTeamMember.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: memberLean }),
    } as never);

    vi.mocked(StellarAccount.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: ownerLean }),
    } as never);

    vi.mocked(Identity.find).mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: usersLean }),
    } as never);

    vi.mocked(ExternalAccount.find).mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: accountsLean }),
    } as never);
  });

  it('returns the creator profile as owner even without a saved team', async () => {
    const result = await getPublicLaunchTeam(launch);

    expect(result).toEqual([
      {
        memberId: null,
        kind: 'owner',
        identityId: ownerId.toString(),
        address: 'wallet',
        name: 'Creator',
        avatarUrl: 'creator.png',
        xAccount: 'https://x.com/creator',
        role: 'owner',
        status: 'active',
      },
    ]);

    expect(LaunchTeamMember.find).toHaveBeenCalledWith({
      chain: 'stellar',
      network: 'public',
      contractId: 'contract',
    });

    expect(StellarAccount.findOne).toHaveBeenCalledWith({
      address: 'wallet',
      disconnectedAt: null,
    });

    expect(Identity.find).toHaveBeenCalledWith({
      _id: { $in: [ownerId] },
      status: 'active',
      deletedAt: null,
      'externalUserIds.0': { $exists: true },
    });
  });

  it.each(['missing wallet', 'unavailable profile'])(
    'keeps the owner address with %s',
    async (scenario) => {
      if (scenario === 'missing wallet') {
        ownerLean.mockResolvedValue(null);
      }

      usersLean.mockResolvedValue([]);

      const result = await getPublicLaunchTeam(launch);

      expect(result).toEqual([
        {
          memberId: null,
          kind: 'owner',
          identityId: null,
          address: 'wallet',
          name: null,
          avatarUrl: null,
          xAccount: null,
          role: 'owner',
          status: 'active',
        },
      ]);

      expect(ExternalAccount.find).not.toHaveBeenCalled();
    },
  );

  it('includes registered and external members and deduplicates the creator', async () => {
    memberLean.mockResolvedValue([
      { _id: new Types.ObjectId(), kind: 'registered', identity: ownerId, role: 'Developer' },
      { _id: userId, kind: 'registered', identity: userId, role: 'Designer', status: 'active' },
      {
        _id: externalId,
        kind: 'external',
        identity: null,
        name: 'External',
        avatarUrl: 'external.png',
        xAccount: 'https://x.com/external',
        role: 'Advisor',
        status: 'active',
      },
      {
        _id: new Types.ObjectId(),
        kind: 'registered',
        identity: new Types.ObjectId(),
        role: 'Inactive',
      },
    ]);

    usersLean.mockResolvedValue([
      { _id: ownerId, name: 'Creator' },
      { _id: userId, name: 'Designer', avatarUrl: 'designer.png' },
    ]);

    const result = await getPublicLaunchTeam(launch);

    expect(result).toHaveLength(3);

    expect(result[0]).toMatchObject({
      role: 'owner',
      status: 'active',
      identityId: ownerId.toString(),
    });

    expect(result[1]).toEqual({
      memberId: userId.toString(),
      kind: 'registered',
      identityId: userId.toString(),
      address: null,
      name: 'Designer',
      avatarUrl: 'designer.png',
      xAccount: null,
      role: 'Designer',
      status: 'active',
    });

    expect(result[2]).toEqual({
      memberId: externalId.toString(),
      kind: 'external',
      identityId: null,
      address: null,
      name: 'External',
      avatarUrl: 'external.png',
      xAccount: 'https://x.com/external',
      role: 'Advisor',
      status: 'active',
    });
  });

  it('propagates storage failures instead of returning an incomplete team', async () => {
    memberLean.mockRejectedValue(new Error('Database unavailable'));

    await expect(getPublicLaunchTeam(launch)).rejects.toThrow('Database unavailable');
  });

  it('hides pending, canceled and legacy registered members until accepted', async () => {
    memberLean.mockResolvedValue([
      { _id: userId, kind: 'registered', identity: userId, status: 'pending', role: 'Designer' },
      { _id: userId, kind: 'registered', identity: userId, status: 'canceled', role: 'Designer' },
      { _id: userId, kind: 'registered', identity: userId, role: 'Designer' },
    ]);

    usersLean.mockResolvedValue([
      { _id: ownerId, name: 'Creator' },
      { _id: userId, name: 'Designer' },
    ]);

    const result = await getPublicLaunchTeam(launch);

    expect(result).toHaveLength(1);

    expect(result[0]).toMatchObject({ kind: 'owner', status: 'active' });
  });
});
