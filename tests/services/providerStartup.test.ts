import { Networks, rpc } from '@stellar/stellar-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import getNetworkConfig from '../../src/services/network/getNetworkConfig';
import verifyNetworkProviders from '../../src/services/network/verifyNetworkProviders';

vi.mock('../../src/services/network/getNetworkConfig', () => ({ default: vi.fn() }));

beforeEach((): void => {
  vi.mocked(getNetworkConfig).mockReturnValue({
    network: 'public',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    networkPassphrase: Networks.PUBLIC,
    factoryContractId: '',
    homeDomain: '',
    tomlPath: '',
  });
});

afterEach((): void => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('provider startup checks', () => {
  it('accepts a different reported network while checking connectivity', async (): Promise<void> => {
    const fetchProvider = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      network_passphrase: Networks.TESTNET,
    })));
    const getNetwork = vi.spyOn(rpc.Server.prototype, 'getNetwork').mockResolvedValue({
      passphrase: Networks.TESTNET,
      protocolVersion: '23',
    });

    vi.stubGlobal('fetch', fetchProvider);

    await expect(verifyNetworkProviders('public')).resolves.toBeUndefined();

    expect(fetchProvider).toHaveBeenCalledWith('https://horizon-testnet.stellar.org', expect.any(Object));
    expect(getNetwork).toHaveBeenCalledOnce();
  });

  it('still rejects unsuccessful Horizon responses', async (): Promise<void> => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(verifyNetworkProviders('public')).rejects.toThrow('Unable to verify public Horizon');
  });

  it('still propagates RPC connectivity failures', async (): Promise<void> => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
    vi.spyOn(rpc.Server.prototype, 'getNetwork').mockRejectedValue(new Error('RPC unavailable'));

    await expect(verifyNetworkProviders('public')).rejects.toThrow('RPC unavailable');
  });
});
