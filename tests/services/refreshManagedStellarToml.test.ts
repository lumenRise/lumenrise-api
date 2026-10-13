import { beforeEach, describe, expect, it, vi } from 'vitest';

import log from '../../src/logger';
import syncManagedStellarToml from '../../src/services/stellar/syncManagedStellarToml';
import refreshManagedStellarToml from '../../src/services/stellar/refreshManagedStellarToml';

vi.mock('../../src/logger', () => ({ default: { error: vi.fn() } }));
vi.mock('../../src/services/stellar/syncManagedStellarToml', () => ({ default: vi.fn() }));

describe('managed stellar.toml refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(syncManagedStellarToml).mockResolvedValue();
  });

  it('prevents overlapping refresh cycles', async () => {
    let finish: (() => void) | undefined;
    vi.mocked(syncManagedStellarToml).mockImplementationOnce(() => new Promise<void>((resolve) => {
      finish = resolve;
    }));
    const first = refreshManagedStellarToml();
    await refreshManagedStellarToml();
    expect(syncManagedStellarToml).toHaveBeenCalledTimes(1);
    finish?.();
    await first;
    await refreshManagedStellarToml();
    expect(syncManagedStellarToml).toHaveBeenCalledTimes(2);
  });

  it('logs failed cycles and allows the next cycle to retry', async () => {
    const error = new Error('Permission denied');
    vi.mocked(syncManagedStellarToml).mockRejectedValueOnce(error);
    await refreshManagedStellarToml();
    expect(log.error).toHaveBeenCalledWith({ error }, 'Managed stellar.toml sync cycle failed');

    await refreshManagedStellarToml();
    expect(syncManagedStellarToml).toHaveBeenCalledTimes(2);
  });
});
