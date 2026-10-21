import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LaunchTeamMember from '../../src/models/LaunchTeamMember';
import launchTeamInvitations from '../../src/migrations/20261022LaunchTeamInvitations';

vi.mock('../../src/models/LaunchTeamMember', () => ({
  default: { aggregate: vi.fn(), find: vi.fn(), updateOne: vi.fn(), createIndexes: vi.fn() },
}));

const identity = { network: 'testnet', contractId: 'contract' };
const registeredId = new Types.ObjectId();
const externalId = new Types.ObjectId();
const membersLean = vi.fn();

describe('launch team invitation migration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(LaunchTeamMember.aggregate).mockResolvedValue([{ _id: identity }]);
    vi.mocked(LaunchTeamMember.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: membersLean }),
    } as never);
  });

  it('requires consent from legacy registered members and activates external members', async () => {
    membersLean.mockResolvedValue([
      { _id: registeredId, kind: 'registered' },
      { _id: externalId, kind: 'external' },
    ]);

    await launchTeamInvitations.up();

    expect(LaunchTeamMember.updateOne).toHaveBeenCalledWith(
      { _id: registeredId },
      { $set: { slot: 1, status: 'pending' } },
    );
    expect(LaunchTeamMember.updateOne).toHaveBeenCalledWith(
      { _id: externalId },
      { $set: { slot: 2, status: 'active' } },
    );
    expect(LaunchTeamMember.createIndexes).toHaveBeenCalledTimes(1);
  });

  it('preserves migrated status and slots when retrying a partial migration', async () => {
    membersLean.mockResolvedValue([
      { _id: registeredId, kind: 'registered', status: 'active', slot: 2 },
      { _id: externalId, kind: 'external' },
    ]);

    await launchTeamInvitations.up();

    expect(LaunchTeamMember.updateOne).toHaveBeenCalledWith(
      { _id: registeredId },
      { $set: { slot: 2, status: 'active' } },
    );
    expect(LaunchTeamMember.updateOne).toHaveBeenCalledWith(
      { _id: externalId },
      { $set: { slot: 1, status: 'active' } },
    );
  });

  it('releases slots for canceled invitations', async () => {
    membersLean.mockResolvedValue([{ _id: registeredId, status: 'canceled', slot: 1 }]);

    await launchTeamInvitations.up();

    expect(LaunchTeamMember.updateOne).toHaveBeenCalledWith(
      { _id: registeredId },
      { $unset: { slot: 1 } },
    );
  });

  it('clears canceled slots before assigning the same slot to a legacy member', async () => {
    membersLean.mockResolvedValue([
      { _id: externalId, kind: 'external' },
      { _id: registeredId, status: 'canceled', slot: 1 },
    ]);

    await launchTeamInvitations.up();

    expect(LaunchTeamMember.updateOne).toHaveBeenNthCalledWith(
      1,
      { _id: registeredId },
      { $unset: { slot: 1 } },
    );
    expect(LaunchTeamMember.updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: externalId },
      { $set: { slot: 1, status: 'active' } },
    );
  });
});
