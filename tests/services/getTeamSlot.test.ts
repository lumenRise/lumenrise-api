import { beforeEach, describe, expect, it, vi } from 'vitest';

import getTeamSlot from '../../src/services/launch/getTeamSlot';
import LaunchTeamMember from '../../src/models/LaunchTeamMember';

vi.mock('../../src/models/LaunchTeamMember', () => ({ default: { find: vi.fn() } }));

const identity = { network: 'testnet', contractId: 'contract' } as const;

describe('team capacity slots', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it.each([
    { members: [], expected: 1 },
    { members: [{ slot: 1 }, { slot: 3 }], expected: 2 },
    { members: [{ slot: 1 }, { slot: 2 }, { slot: 3 }, { slot: 4 }, { slot: 5 }], expected: null },
    { members: [{}], expected: null },
  ])('allocates only free migrated slots: %j', async ({ members, expected }) => {
    vi.mocked(LaunchTeamMember.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue(members),
    } as never);

    await expect(getTeamSlot(identity)).resolves.toBe(expected);

    expect(LaunchTeamMember.find).toHaveBeenCalledWith({
      ...identity,
      status: { $ne: 'canceled' },
    });
  });
});
