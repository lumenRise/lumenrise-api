import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import TestnetActivity from '../../src/models/TestnetActivity';
import requestDomainRead from '../../src/services/messaging/requestDomainRead';

vi.mock('../../src/models/TestnetActivity', (): object => ({ default: { updateOne: vi.fn() } }));

vi.mock('../../src/services/messaging/requestDomainRead', (): object => ({ default: vi.fn() }));

beforeEach((): void => {
  vi.resetModules();

  vi.clearAllMocks();

  vi.useFakeTimers();

  vi.setSystemTime(new Date('2026-11-08T10:00:00Z'));

  vi.mocked(TestnetActivity.updateOne).mockResolvedValue({} as never);

  vi.mocked(requestDomainRead).mockResolvedValue({ status: 'accepted' });
});

afterEach((): void => {
  vi.useRealTimers();
});

it('persists each full 30-minute extension while coalescing wake messages independently per chain', async (): Promise<void> => {
  const { default: recordTestnetActivity } =
    await import('../../src/services/launch/recordTestnetActivity');
  const now = Date.now();

  await recordTestnetActivity('base', now);
  await recordTestnetActivity('base', now + 1000);
  await recordTestnetActivity('stellar', now + 2000);

  expect(TestnetActivity.updateOne).toHaveBeenCalledTimes(3);

  expect(TestnetActivity.updateOne).toHaveBeenNthCalledWith(
    2,
    { _id: 'base' },
    {
      $max: { activeUntil: new Date(now + 1000 + 30 * 60_000) },
      $setOnInsert: { network: 'testnet' },
    },
    { upsert: true },
  );

  expect(requestDomainRead).toHaveBeenCalledTimes(2);

  expect(requestDomainRead).toHaveBeenCalledWith('launch', 'testnet.activity', {
    chain: 'stellar',
    network: 'testnet',
  });

  vi.setSystemTime(now + 5000);

  await recordTestnetActivity('base', Date.now());

  expect(requestDomainRead).toHaveBeenCalledTimes(3);
});

it('persists activity before publication and allows a retry after a broker failure', async (): Promise<void> => {
  const { default: recordTestnetActivity } =
    await import('../../src/services/launch/recordTestnetActivity');

  vi.mocked(requestDomainRead).mockImplementationOnce(async (): Promise<never> => {
    expect(TestnetActivity.updateOne).toHaveBeenCalledOnce();

    throw new Error('Broker unavailable');
  });

  await expect(recordTestnetActivity('base', Date.now())).rejects.toThrow('Broker unavailable');

  await recordTestnetActivity('base', Date.now());

  expect(requestDomainRead).toHaveBeenCalledTimes(2);

  expect(TestnetActivity.updateOne).toHaveBeenCalledTimes(2);
});

it('does not publish a wake message when activity could not be persisted', async (): Promise<void> => {
  const { default: recordTestnetActivity } =
    await import('../../src/services/launch/recordTestnetActivity');

  vi.mocked(TestnetActivity.updateOne).mockRejectedValueOnce(new Error('Database unavailable'));

  await expect(recordTestnetActivity('base', Date.now())).rejects.toThrow('Database unavailable');

  expect(requestDomainRead).not.toHaveBeenCalled();
});
